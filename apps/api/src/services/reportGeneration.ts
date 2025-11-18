import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TavilyClient } from 'tavily';
import OpenAI from 'openai';
import type { ReportType } from '@clippingai/database';
import {
  getCompanyKnowledge,
  initializeCompanyKnowledge,
  extractKnowledgeFromReport,
  updateCompanyKnowledge,
  formatKnowledgeForPrompt,
  type CompanyKnowledge,
} from './companyKnowledge.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Lazy-load Tavily client (only initialized when needed)
let tavilyClient: TavilyClient | null = null;
function getTavilyClient(): TavilyClient {
  if (!tavilyClient) {
    if (!process.env.TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY is required for report generation');
    }
    tavilyClient = new TavilyClient(process.env.TAVILY_API_KEY);
  }
  return tavilyClient;
}

// ============================================================================
// TYPES
// ============================================================================

export interface ReportGenerationInput {
  companyName: string;
  companyDomain: string;
  industry?: string;
  competitors?: string[];
  reportType: ReportType;
  dateRange?: number; // days to look back, default 7
  userFeedback?: Record<string, any>; // from previous reports
  userId?: string; // For loading company knowledge
}

export interface ReportArticle {
  id: string;
  title: string;
  summary: string; // 2-3 sentences
  content: string; // 300-500 words
  imageUrl?: string;
  imageAlt?: string;
  sources: string[];
  publishedAt?: string;
  relevanceScore?: number;
}

export interface GeneratedReportContent {
  summary: string; // TL;DR
  articles: ReportArticle[];
  metadata?: {
    totalSearches: number;
    articlesFound: number;
    articlesSelected: number;
    generationTime: number;
  };
}

interface SearchQuery {
  query: string;
  reasoning: string;
}

interface SearchResult {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
  score?: number;
}

// ============================================================================
// STEP 1: QUERY PLANNING
// ============================================================================

async function planSearchQueries(input: ReportGenerationInput): Promise<SearchQuery[]> {
  const prompt = buildQueryPlanningPrompt(input);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = message.content[0].type === 'text' ? message.content[0].text : '';
  const queries = parseQueryPlanningResponse(response);

  console.log(`✅ Planned ${queries.length} search queries`);
  return queries;
}

function buildQueryPlanningPrompt(input: ReportGenerationInput): string {
  const { companyName, industry, competitors = [], dateRange = 7 } = input;

  return `You are a research assistant planning search queries for a media monitoring report.

Company: ${companyName}
Industry: ${industry || 'Unknown'}
Competitors: ${competitors.length > 0 ? competitors.join(', ') : 'To be discovered'}
Time Range: Last ${dateRange} days

Focus on:
- News articles and press mentions about ${companyName}
- Market trends and industry developments in ${industry || 'the sector'}
- Competitor activities and announcements (${competitors.join(', ')})
- Industry analysis and expert commentary
- Technology and innovation news relevant to the company

Generate 5-7 optimal search queries to find the most relevant, recent information.

Each query should:
- Be specific and targeted to media coverage and articles
- Focus on recent developments (last ${dateRange} days)
- Cover different aspects: company news, industry trends, competitor activities
- Be likely to return high-quality news articles and publications

Return ONLY valid JSON in this format:
{
  "queries": [
    {
      "query": "the search query string",
      "reasoning": "why this query is valuable"
    }
  ]
}`;
}

function parseQueryPlanningResponse(response: string): SearchQuery[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.queries || [];
  } catch (error) {
    console.error('Error parsing query planning response:', error);
    return [];
  }
}

// ============================================================================
// STEP 2: WEB SEARCH
// ============================================================================

async function executeSearches(queries: SearchQuery[], dateRange = 7): Promise<SearchResult[]> {
  const client = getTavilyClient();

  // Calculate date threshold for filtering
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - dateRange);

  // PARALLELIZE: Execute all searches concurrently
  const searchPromises = queries.map(async ({ query }) => {
    try {
      const searchOptions: any = {
        searchDepth: 'advanced',
        maxResults: 5,
        includeDomains: [], // Can filter to specific domains
        excludeDomains: ['reddit.com', 'youtube.com'], // Avoid forums/videos for now
      };

      // Only add days filter if it's a reasonable range (less than 365 days)
      if (dateRange < 365) {
        searchOptions.days = dateRange;
      }

      const response = await client.search(query, searchOptions);

      const results: SearchResult[] = response.results
        .map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          publishedDate: r.publishedDate,
          score: r.score,
        }))
        // Only filter by date if publishedDate exists and dateRange is specified
        .filter((r: SearchResult) => {
          // If searching all time (365+ days), include everything
          if (dateRange >= 365) return true;

          // If no publishedDate, include it (Tavily already filtered by days parameter)
          if (!r.publishedDate) return true;

          // If publishedDate exists, check if it's within range
          const publishedDate = new Date(r.publishedDate);
          return publishedDate >= dateThreshold;
        });

      const dateRangeText = dateRange >= 365 ? 'all time' : `last ${dateRange} days`;
      console.log(`  🔍 Query "${query}" → ${results.length} results (${dateRangeText})`);
      return results;
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
      return [];
    }
  });

  // Wait for all searches to complete
  const resultsArrays = await Promise.all(searchPromises);
  const allResults = resultsArrays.flat();

  const dateRangeText = dateRange >= 365 ? 'all time' : `last ${dateRange} days`;
  console.log(`✅ Found ${allResults.length} total search results from ${dateRangeText}`);
  return allResults;
}

// ============================================================================
// STEP 3: ARTICLE EXTRACTION & RANKING
// ============================================================================

async function extractAndRankArticles(
  results: SearchResult[],
  input: ReportGenerationInput,
  targetCount = 5
): Promise<SearchResult[]> {
  const prompt = buildExtractionPrompt(results, input, targetCount);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = message.content[0].type === 'text' ? message.content[0].text : '';
  const selectedIndices = parseExtractionResponse(response);

  const selected = selectedIndices
    .map((idx) => results[idx])
    .filter(Boolean)
    .slice(0, targetCount);

  console.log(`✅ Selected ${selected.length} articles from ${results.length} results`);
  return selected;
}

function buildExtractionPrompt(
  results: SearchResult[],
  input: ReportGenerationInput,
  targetCount: number
): string {
  const resultsText = results
    .map(
      (r, i) => `
[${i}] ${r.title}
URL: ${r.url}
Published: ${r.publishedDate || 'Unknown'}
Preview: ${r.content.slice(0, 300)}...
`
    )
    .join('\n---\n');

  return `You are filtering search results for a media monitoring digest about ${input.companyName} in the ${input.industry || 'their'} industry.

Review these ${results.length} search results and select the ${targetCount} MOST valuable articles.

**Selection Criteria:**
- **Relevance**: Direct connection to ${input.companyName}, their industry (${input.industry}), or key competitors
- **Quality**: Credible news sources with substantive content (avoid fluff, listicles, ads)
- **Uniqueness**: Avoid duplicate coverage of the same story
- **Actionability**: Contains concrete information, data, or developments
- **Recency**: Prefer recent news

**IMPORTANT:**
- REJECT articles that are too generic or tangentially related
- REJECT promotional content or press releases without substance
- PREFER articles with specific facts, data, or developments
- PREFER articles about companies/trends directly relevant to ${input.companyName}

Results:
${resultsText}

Return ONLY a JSON array of indices for the ${targetCount} best articles:
{"selected": [0, 3, 5, 8, 12]}`;
}

function parseExtractionResponse(response: string): number[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.selected || [];
  } catch (error) {
    console.error('Error parsing extraction response:', error);
    return [];
  }
}

// ============================================================================
// STEP 4: DEEP RESEARCH PER ARTICLE
// ============================================================================

async function deepResearchArticle(
  article: SearchResult,
  input: ReportGenerationInput
): Promise<SearchResult[]> {
  // Generate follow-up research queries for this specific article
  const prompt = `You're doing deep research on this news article.

Original Article:
Title: ${article.title}
Content: ${article.content.slice(0, 500)}...

Generate 2-3 HIGHLY SPECIFIC follow-up search queries to verify and expand on facts in this article:
- Background/context on specific companies, people, or technologies MENTIONED in the article
- Recent related developments in the same specific topic
- Technical details or data about the specific topic
- Additional sources covering this EXACT same story

RULES:
- Queries must be directly related to the article's specific topic
- Focus on verifying and expanding the article's claims
- Use specific names, products, or events from the article
- DO NOT create general industry queries

Return ONLY valid JSON:
{
  "queries": ["very specific query 1", "very specific query 2"]
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const response = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    const queries = parsed.queries || [];

    console.log(`  🔎 Deep research: ${queries.length} follow-up queries for "${article.title}"`);

    // Execute follow-up searches
    const client = getTavilyClient();
    const additionalResults: SearchResult[] = [];

    for (const query of queries) {
      try {
        const response = await client.search(query, {
          searchDepth: 'advanced',
          maxResults: 3,
        });

        const results = response.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          publishedDate: r.publishedDate,
          score: r.score,
        }));

        additionalResults.push(...results);
      } catch (error) {
        console.error(`Error in deep research query "${query}":`, error);
      }
    }

    console.log(`  ✅ Found ${additionalResults.length} additional sources`);
    return additionalResults;
  } catch (error) {
    console.error(`Error generating deep research queries:`, error);
    return [];
  }
}

// ============================================================================
// STEP 5: ARTICLE SUMMARIZATION
// ============================================================================

async function summarizeArticles(
  articles: SearchResult[],
  input: ReportGenerationInput,
  companyKnowledge?: CompanyKnowledge | null
): Promise<ReportArticle[]> {
  // PARALLELIZE: Deep research + summarize all articles concurrently
  const summaryPromises = articles.map(async (article) => {
    try {
      // Step 1: Do deep research for this article
      const additionalSources = await deepResearchArticle(article, input);

      // Step 2: Summarize with enriched context and company knowledge
      const summary = await summarizeArticle(article, additionalSources, input, companyKnowledge);
      console.log(`  📝 Summarized: "${summary.title}"`);
      return summary;
    } catch (error) {
      console.error(`Error summarizing article "${article.title}":`, error);
      return null;
    }
  });

  const summaries = (await Promise.all(summaryPromises)).filter((s): s is ReportArticle => s !== null);

  console.log(`✅ Summarized ${summaries.length} articles`);
  return summaries;
}

async function summarizeArticle(
  article: SearchResult,
  additionalSources: SearchResult[],
  input: ReportGenerationInput,
  companyKnowledge?: CompanyKnowledge | null
): Promise<ReportArticle> {
  // Build sources list
  const allSources = [article, ...additionalSources];
  const sourcesText = allSources.map((s, idx) => `[${idx + 1}] ${s.title}\n${s.url}\n${s.content.slice(0, 300)}...`).join('\n\n');

  // Format company knowledge for context
  const knowledgeContext = companyKnowledge ? formatKnowledgeForPrompt(companyKnowledge) : '';

  const prompt = `You are writing a strategic intelligence brief for ${input.companyName} (${input.industry || 'their industry'}).${knowledgeContext}

PRIMARY SOURCE:
[1] ${article.title}
${article.url}
${article.content}

ADDITIONAL RESEARCH:
${additionalSources.map((s, idx) => `[${idx + 2}] ${s.title}\n${s.url}\n${s.content.slice(0, 400)}...`).join('\n\n')}

**CRITICAL GROUNDING RULES - DO NOT VIOLATE:**
1. ONLY use information EXPLICITLY stated in the sources above - DO NOT make up ANY information
2. EVERY fact, claim, or data point MUST cite a source [1], [2], etc.
3. DO NOT mention ANY URLs except those provided in the sources list
4. DO NOT invent quotes, statistics, percentages, dates, names, or details not in the sources
5. DO NOT make assumptions or extrapolations beyond what's explicitly stated
6. If the sources don't mention ${input.companyName} directly, analyze the INDUSTRY relevance ONLY based on what's in the sources
7. If you cannot find specific information, acknowledge it or omit it - NEVER fabricate
8. DO NOT add context or background information not found in the provided sources
9. Every sentence with a factual claim MUST have a citation [1], [2], etc.
10. If uncertain about ANY detail, leave it out rather than guess

**STRUCTURE:**

**1. HEADLINE**
Create a clear headline about what happened (not forced company angle if source doesn't mention them).

**2. EXECUTIVE SUMMARY (2 sentences)**
What happened and why it matters to the industry/space.

**3. MAIN ANALYSIS (300-400 words total)**
Write short, punchy sections:

**What Happened** [cite EVERY fact]
2-3 sentences of key facts. Every sentence must cite [1], [2], etc.

**Industry Implications** (Main section - 2-3 short paragraphs)
- If sources mention ${input.companyName}: explain direct impact [cite sources]
- If sources DON'T mention ${input.companyName}: explain why this industry development matters to companies in this space [cite sources]
- Market trends or competitive dynamics [cite sources]

**Context & Analysis** (1-2 paragraphs)
- Broader industry context [cite sources]
- What this signals about the market [cite sources]

**CRITICAL REQUIREMENTS:**
- EVERY claim must have [1], [2], or [3] citation pointing to the exact source
- ONLY state facts explicitly found in the provided sources - NO fabrication
- DO NOT include ANY links, URLs, or web addresses except those in the sources list
- Keep paragraphs short (2-4 sentences max)
- If uncertain about ANY detail, omit it - NEVER speculate or make up information
- Professional, grounded tone
- Better to have a shorter article with verified facts than a longer one with invented details

**Image Description**: Sophisticated editorial image concept based on the actual news.

Return ONLY valid JSON:
{
  "title": "factual headline based on sources",
  "summary": "2 sentence executive summary - grounded in sources",
  "content": "Full article with [1], [2] citations on every factual claim",
  "imageDescription": "image concept",
  "sources": [${allSources.map(s => `"${s.url}"`).join(', ')}]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in summarization response');

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate that returned sources are only from our provided sources
  const validSourceUrls = allSources.map(s => s.url);
  const returnedSources = parsed.sources || [article.url];
  const filteredSources = returnedSources.filter((url: string) =>
    validSourceUrls.includes(url)
  );

  // If AI tried to include invalid URLs, log warning and use only valid ones
  if (filteredSources.length < returnedSources.length) {
    console.warn(`⚠️  AI attempted to include ${returnedSources.length - filteredSources.length} URLs not in source list. Filtering them out.`);
  }

  return {
    id: `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: parsed.title || article.title,
    summary: parsed.summary || article.content.slice(0, 200),
    content: parsed.content || article.content,
    imageAlt: parsed.imageDescription || parsed.title,
    sources: filteredSources.length > 0 ? filteredSources : [article.url],
    publishedAt: article.publishedDate,
  };
}

// ============================================================================
// STEP 5: REPORT SYNTHESIS (TL;DR)
// ============================================================================

async function synthesizeReport(
  articles: ReportArticle[],
  input: ReportGenerationInput
): Promise<string> {
  const articlesText = articles
    .map((a) => `- ${a.title}: ${a.summary}`)
    .join('\n');

  const dateRange = input.dateRange || 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const prompt = `You are writing an executive summary for ${input.companyName}'s media monitoring digest.

Time Period: ${formatDate(startDate)} - ${formatDate(endDate)} (${dateRange} days)

Articles in this digest:
${articlesText}

**CRITICAL GROUNDING RULES:**
- ONLY synthesize information from the articles listed above
- DO NOT add facts, statistics, or details not present in the article summaries
- DO NOT make up trends, numbers, or insights not supported by the articles
- If you mention specific developments, they must be from the articles above
- Keep synthesis factual and grounded in the provided content

Create a TL;DR with this structure:

**Key Insights (3-5 bullet points)**
Start with the time period, then list the most critical takeaways:
• [Time period context and biggest theme]
• [Key development #1]
• [Key development #2]
• [Additional critical insight if relevant]

**Strategic Context (1-2 short paragraphs)**
Write 1-2 concise paragraphs (3-4 sentences each) that:
- Explain what these developments mean for ${input.companyName}
- Highlight opportunities, threats, or actions to consider
- Provide forward-looking insights

**Format Requirements**:
- Bullets must start with •
- Keep paragraphs short and punchy
- Use ONLY specific numbers/facts from the articles above - DO NOT invent statistics
- Direct, CEO-briefing tone
- DO NOT include information not present in the article summaries
- Better to be concise with verified facts than verbose with speculation

Return ONLY the formatted text (bullets then paragraphs, separated by blank lines).`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const tldr = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  console.log(`✅ Generated TL;DR`);
  return tldr;
}

// ============================================================================
// STEP 6: IMAGE GENERATION
// ============================================================================

async function generateArticleImages(articles: ReportArticle[]): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  Skipping image generation (no OpenAI API key)');
    return;
  }

  console.log('🎨 Generating images for articles...');

  // Generate images in parallel for better performance
  const imagePromises = articles.map(async (article) => {
    try {
      // Extract core concept from image description
      const imageDescription = article.imageAlt || article.title;

      // Create ChatGPT Pulse-style conceptual image prompt
      const conceptualPrompt = `Abstract editorial illustration representing: ${imageDescription}

Style: Geometric, minimalist, conceptual art similar to ChatGPT Pulse or premium editorial publications.

Visual Elements:
- Clean geometric shapes (circles, rectangles, curves, grids)
- Layered composition with depth
- Vibrant color palette: deep teals, warm oranges, mustard yellows, navy blues, coral reds
- Gradient transitions and color blocking
- Subtle textures and patterns (stripes, dots, grids)
- Atmospheric perspective with foreground/background elements

Mood: Modern, sophisticated, tech-forward, optimistic
No text, no logos, no literal representations - purely conceptual and abstract.
Think: editorial magazine cover, tech conference poster, modern art museum.`;

      // Generate image using gpt-image-1
      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: conceptualPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium', // 'low', 'medium', or 'high' - medium balances quality and speed
      });

      if (response.data[0]?.url) {
        article.imageUrl = response.data[0].url;
        console.log(`  ✅ Generated image for "${article.title}"`);
      } else {
        console.log(`  ⚠️  No image URL returned for "${article.title}"`);
      }
    } catch (error) {
      console.error(`  ❌ Error generating image for "${article.title}":`, error instanceof Error ? error.message : 'Unknown error');
      // Continue with other articles even if one fails
    }
  });

  await Promise.all(imagePromises);

  const successCount = articles.filter(a => a.imageUrl).length;
  console.log(`✅ Generated ${successCount}/${articles.length} images`);
}

// ============================================================================
// MAIN REPORT GENERATOR
// ============================================================================

export async function generateReport(
  input: ReportGenerationInput
): Promise<GeneratedReportContent> {
  const startTime = Date.now();
  console.log(`\n🚀 Starting report generation for ${input.companyName}...`);

  try {
    // Step 0: Load company knowledge base (if userId provided)
    let companyKnowledge: CompanyKnowledge | null = null;
    if (input.userId) {
      console.log('\n🧠 Loading company knowledge base...');
      companyKnowledge = await getCompanyKnowledge(input.userId);

      // Initialize if doesn't exist
      if (!companyKnowledge) {
        console.log('📝 Initializing company knowledge base...');
        companyKnowledge = await initializeCompanyKnowledge(
          input.userId,
          input.companyName,
          input.companyDomain,
          input.industry,
          input.competitors
        );
      } else {
        console.log(`✅ Loaded knowledge: ${companyKnowledge.competitors.length} competitors, ${companyKnowledge.keyProducts.length} products tracked`);
      }
    }

    // Step 1: Plan queries
    console.log('\n📋 Step 1: Planning search queries...');
    const queries = await planSearchQueries(input);
    if (queries.length === 0) {
      throw new Error('No queries generated');
    }

    // Step 2: Execute searches
    console.log('\n🔍 Step 2: Executing searches...');
    let searchResults = await executeSearches(queries, input.dateRange || 7);

    // Fallback: If no results with strict date range, try a longer period
    if (searchResults.length === 0) {
      console.log('\n⚠️  No results with 7 day filter. Trying 30 day range...');
      searchResults = await executeSearches(queries, 30);
    }

    // Fallback: If still no results, try without date filter
    if (searchResults.length === 0) {
      console.log('\n⚠️  No results with 30 day filter. Trying broader search...');
      searchResults = await executeSearches(queries, 365); // Try past year
    }

    if (searchResults.length === 0) {
      throw new Error('No search results found even with extended date ranges. Please try a different company or check your search terms.');
    }

    // Step 3: Extract best articles
    console.log('\n🎯 Step 3: Extracting and ranking articles...');
    const selectedArticles = await extractAndRankArticles(searchResults, input, 5);
    if (selectedArticles.length === 0) {
      throw new Error('No articles could be selected from search results');
    }

    // Step 4: Summarize articles (with company knowledge context)
    console.log('\n📝 Step 4: Summarizing articles...');
    const summarizedArticles = await summarizeArticles(selectedArticles, input, companyKnowledge);

    // Step 5: Synthesize TL;DR
    console.log('\n✨ Step 5: Synthesizing TL;DR...');
    const tldr = await synthesizeReport(summarizedArticles, input);

    // Step 6: Generate images
    console.log('\n🎨 Step 6: Generating images...');
    await generateArticleImages(summarizedArticles);

    const generationTime = Date.now() - startTime;
    console.log(`\n✅ Report generated successfully in ${(generationTime / 1000).toFixed(1)}s`);

    const reportContent = {
      summary: tldr,
      articles: summarizedArticles,
      metadata: {
        totalSearches: queries.length,
        articlesFound: searchResults.length,
        articlesSelected: summarizedArticles.length,
        generationTime,
      },
    };

    // Step 7: Update company knowledge base (if userId provided)
    if (input.userId) {
      console.log('\n🧠 Extracting and updating company knowledge...');
      try {
        const knowledgeUpdate = await extractKnowledgeFromReport(
          input.companyName,
          reportContent,
          companyKnowledge
        );
        await updateCompanyKnowledge(input.userId, knowledgeUpdate);
        console.log('✅ Company knowledge updated');
      } catch (error) {
        console.error('⚠️  Error updating company knowledge:', error);
        // Don't fail the report generation if knowledge update fails
      }
    }

    return reportContent;
  } catch (error) {
    console.error('❌ Error generating report:', error);
    throw error;
  }
}
