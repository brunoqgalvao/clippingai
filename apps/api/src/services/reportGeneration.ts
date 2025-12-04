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
import { saveImageLocally, saveBase64ImageLocally } from './imageStorage.js';

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
  title: string; // Report headline
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
// DEBUG TRACE - Hidden agent inspection
// ============================================================================

interface AgentTraceStep {
  step: string;
  timestamp: number;
  prompt?: string;
  response?: string;
  data?: any;
}

interface AgentTrace {
  startTime: number;
  endTime?: number;
  input: ReportGenerationInput;
  steps: AgentTraceStep[];
}

// Global trace storage - always populated
let currentTrace: AgentTrace | null = null;

export function getAgentTrace(): AgentTrace | null {
  return currentTrace;
}

export function clearAgentTrace(): void {
  currentTrace = null;
}

function traceStep(step: string, data?: { prompt?: string; response?: string; data?: any }): void {
  if (!currentTrace) return;
  currentTrace.steps.push({
    step,
    timestamp: Date.now(),
    ...data,
  });
}

// ============================================================================
// STEP 1: QUERY PLANNING
// ============================================================================

async function planSearchQueries(input: ReportGenerationInput): Promise<SearchQuery[]> {
  const prompt = buildQueryPlanningPrompt(input);

  traceStep('query_planning_start', { prompt });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = message.content[0].type === 'text' ? message.content[0].text : '';
  const queries = parseQueryPlanningResponse(response);

  traceStep('query_planning_complete', {
    response,
    data: { queriesGenerated: queries.length, queries }
  });

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

  traceStep('search_start', { data: { queryCount: queries.length, dateRange } });

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

  traceStep('search_complete', {
    data: {
      totalResults: allResults.length,
      dateRange: dateRangeText,
      resultsByQuery: queries.map((q, i) => ({
        query: q.query,
        resultCount: resultsArrays[i]?.length || 0
      })),
      results: allResults.map(r => ({ title: r.title, url: r.url, score: r.score }))
    }
  });

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

  traceStep('extraction_start', { prompt, data: { candidateCount: results.length, targetCount } });

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

  traceStep('extraction_complete', {
    response,
    data: {
      selectedIndices,
      selectedArticles: selected.map(s => ({ title: s.title, url: s.url }))
    }
  });

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
// STEP 4: AD-HOC DEEP RESEARCH (Agentic Loop)
// ============================================================================

interface ResearchDecision {
  action: 'search' | 'done';
  reasoning: string;
  queries?: string[];
  confidence?: number; // 0-100, how confident the agent is that it has enough data
}

const MAX_RESEARCH_ITERATIONS = 3;

async function adHocDeepResearch(
  article: SearchResult,
  input: ReportGenerationInput
): Promise<SearchResult[]> {
  const allAdditionalSources: SearchResult[] = [];
  let iteration = 0;

  traceStep('deep_research_start', {
    data: { articleTitle: article.title, maxIterations: MAX_RESEARCH_ITERATIONS }
  });

  while (iteration < MAX_RESEARCH_ITERATIONS) {
    iteration++;

    // Build context of what we have so far
    const sourcesContext = allAdditionalSources.length > 0
      ? `\n\nADDITIONAL SOURCES ALREADY GATHERED (${allAdditionalSources.length}):\n${allAdditionalSources.map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\nPreview: ${s.content.slice(0, 200)}...`).join('\n\n')}`
      : '';

    const prompt = `You are a research agent analyzing an article for a media intelligence report about ${input.companyName} (${input.industry || 'their industry'}).

PRIMARY ARTICLE:
Title: ${article.title}
URL: ${article.url}
Content: ${article.content}
${sourcesContext}

YOUR TASK: Decide if you need MORE information to write a comprehensive, well-sourced analysis.

Consider:
1. Do you have enough context to explain the significance of this news?
2. Are there specific claims, companies, or technologies that need verification?
3. Would additional sources strengthen the analysis or add valuable perspective?
4. Do you have enough data points to make the article useful for ${input.companyName}?

DECIDE:
- If you have ENOUGH information to write a solid article → action: "done"
- If you NEED more data → action: "search" with 1-2 SPECIFIC queries

RULES for queries (if searching):
- Be VERY SPECIFIC - use exact names, products, or events from the article
- Focus on: verification, additional context, competitor info, market data
- DO NOT search for general industry information
- Each query should fill a specific knowledge gap

Return ONLY valid JSON:
{
  "action": "done" or "search",
  "reasoning": "why you made this decision",
  "confidence": 85,
  "queries": ["specific query 1", "specific query 2"]
}`;

    traceStep(`deep_research_iteration_${iteration}_prompt`, {
      prompt,
      data: { iteration, sourcesGatheredSoFar: allAdditionalSources.length }
    });

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const response = message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.log(`  ⚠️ No valid JSON in research decision, stopping`);
        break;
      }

      const decision: ResearchDecision = JSON.parse(jsonMatch[0]);

      traceStep(`deep_research_iteration_${iteration}_decision`, {
        response,
        data: decision
      });

      console.log(`  🤔 Iteration ${iteration}: ${decision.action} (confidence: ${decision.confidence || 'N/A'}%) - ${decision.reasoning.slice(0, 80)}...`);

      // Agent decided it has enough data
      if (decision.action === 'done') {
        console.log(`  ✅ Agent satisfied with ${allAdditionalSources.length} additional sources`);
        break;
      }

      // Agent wants more data - execute searches
      if (decision.queries && decision.queries.length > 0) {
        const client = getTavilyClient();

        for (const query of decision.queries) {
          try {
            traceStep(`deep_research_search`, { data: { query, iteration } });

            const searchResponse = await client.search(query, {
              searchDepth: 'advanced',
              maxResults: 3,
            });

            const results = searchResponse.results.map((r: any) => ({
              title: r.title,
              url: r.url,
              content: r.content,
              publishedDate: r.publishedDate,
              score: r.score,
            }));

            // Dedupe by URL
            const newResults = results.filter(
              (r: SearchResult) => !allAdditionalSources.some(existing => existing.url === r.url)
            );

            traceStep(`deep_research_search_results`, {
              data: {
                query,
                resultsFound: results.length,
                newResults: newResults.length,
                results: newResults.map((r: SearchResult) => ({ title: r.title, url: r.url }))
              }
            });

            allAdditionalSources.push(...newResults);
            console.log(`    🔍 "${query}" → ${newResults.length} new sources`);
          } catch (error) {
            console.error(`    ❌ Error searching "${query}":`, error);
          }
        }
      }

      // High confidence threshold - stop early if agent is confident
      if (decision.confidence && decision.confidence >= 90) {
        console.log(`  ✅ High confidence (${decision.confidence}%), stopping research`);
        break;
      }

    } catch (error) {
      console.error(`  ❌ Error in research iteration ${iteration}:`, error);
      break;
    }
  }

  traceStep('deep_research_complete', {
    data: {
      articleTitle: article.title,
      iterations: iteration,
      totalAdditionalSources: allAdditionalSources.length,
      sources: allAdditionalSources.map(s => ({ title: s.title, url: s.url }))
    }
  });

  console.log(`  📚 Deep research complete: ${allAdditionalSources.length} additional sources after ${iteration} iteration(s)`);
  return allAdditionalSources;
}

// ============================================================================
// STEP 5: ARTICLE SUMMARIZATION
// ============================================================================

async function summarizeArticles(
  articles: SearchResult[],
  input: ReportGenerationInput,
  companyKnowledge?: CompanyKnowledge | null
): Promise<ReportArticle[]> {
  traceStep('summarization_start', { data: { articleCount: articles.length } });

  // PARALLELIZE: Deep research + summarize all articles concurrently
  const summaryPromises = articles.map(async (article) => {
    try {
      // Step 1: Ad-hoc deep research (agent decides when it has enough data)
      const additionalSources = await adHocDeepResearch(article, input);

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

  traceStep('summarization_complete', {
    data: {
      summarizedCount: summaries.length,
      articles: summaries.map(s => ({ title: s.title, sourceCount: s.sources.length }))
    }
  });

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
2. Use citations SPARINGLY - only cite key facts, not every sentence. Place citations at END of paragraphs, not after every clause.
3. DO NOT mention ANY URLs except those provided in the sources list
4. DO NOT invent quotes, statistics, percentages, dates, names, or details not in the sources
5. DO NOT make assumptions or extrapolations beyond what's explicitly stated
6. If the sources don't mention ${input.companyName} directly, analyze the INDUSTRY relevance ONLY based on what's in the sources
7. If you cannot find specific information, acknowledge it or omit it - NEVER fabricate
8. DO NOT add context or background information not found in the provided sources
9. Aim for 3-5 citations per article MAX - cite only the most important facts
10. If uncertain about ANY detail, leave it out rather than guess

**COMPETITIVE INTELLIGENCE - CRITICAL:**
If the article mentions a product, company, or technology with the SAME NAME as ${input.companyName} (or similar):
- This is a MAJOR insight - highlight it prominently in the Context & Analysis section
- Note: "This development is particularly relevant as [competitor] has launched/uses a product with the same name as your company"
- Analyze brand confusion risks, market positioning implications, or differentiation opportunities

**STRUCTURE:**

**1. HEADLINE**
Create a clear headline about what happened (not forced company angle if source doesn't mention them).

**2. EXECUTIVE SUMMARY (2 sentences)**
What happened and why it matters to the industry/space.

**3. MAIN ANALYSIS (300-400 words total)**
Write short, punchy sections:

**What Happened**
2-3 sentences of key facts. Add a single citation at the end of this section [1].

**Industry Implications** (Main section - 2-3 short paragraphs)
- If sources mention ${input.companyName}: explain direct impact
- If sources DON'T mention ${input.companyName}: explain why this industry development matters to companies in this space
- Market trends or competitive dynamics
- Add 1-2 citations at key points only

**Context & Analysis** (1-2 paragraphs)
- Broader industry context
- What this signals about the market
- If a NAMING CONFLICT exists (competitor product/company shares name with ${input.companyName}), call this out explicitly here
- Add citation only for key claims

**CRITICAL REQUIREMENTS:**
- Use 3-5 citations TOTAL per article - place them strategically, not after every clause
- ONLY state facts explicitly found in the provided sources - NO fabrication
- DO NOT include ANY links, URLs, or web addresses except those in the sources list
- Keep paragraphs short (2-4 sentences max)
- If uncertain about ANY detail, omit it - NEVER speculate or make up information
- Professional, grounded tone - write like The Economist, not an academic paper
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
// STEP 5: REPORT SYNTHESIS (Title + TL;DR)
// ============================================================================

interface ReportSynthesis {
  title: string;
  summary: string;
}

async function synthesizeReport(
  articles: ReportArticle[],
  input: ReportGenerationInput
): Promise<ReportSynthesis> {
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

Create a report with this EXACT JSON structure:

{
  "title": "A compelling 5-10 word headline capturing the week's biggest story or theme (no markdown, no quotes)",
  "summary": "The full TL;DR content (see format below)"
}

**Title Guidelines:**
- Capture the single most important theme or development
- Be specific and newsworthy (e.g., "AI Automation Market Heats Up as Competitors Raise $100M+")
- No generic titles like "Weekly Update" or "Key Insights"
- 5-10 words, punchy, executive-level

**Summary Format (for the "summary" field):**
**Key Insights**
• [Time period context and biggest theme]
• [Key development #1]
• [Key development #2]
• [Additional critical insight if relevant]

**Strategic Context**
Write 1-2 concise paragraphs (3-4 sentences each) that:
- Explain what these developments mean for ${input.companyName}
- Highlight opportunities, threats, or actions to consider

**Format Requirements**:
- Bullets must start with •
- Keep paragraphs short and punchy
- Use ONLY specific numbers/facts from the articles above
- Direct, CEO-briefing tone

Return ONLY valid JSON with "title" and "summary" fields.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  let responseText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

  // Strip markdown code blocks if present
  if (responseText.startsWith('```json')) {
    responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (responseText.startsWith('```')) {
    responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(responseText);
    console.log(`✅ Generated report title: "${parsed.title}"`);
    return {
      title: parsed.title || `${input.companyName} Intelligence Report`,
      summary: parsed.summary || '',
    };
  } catch (e) {
    // Fallback: use the response as summary and generate a simple title
    console.log(`⚠️ Could not parse JSON response, using fallback. Error: ${e}`);
    console.log(`Response was: ${responseText.substring(0, 200)}...`);
    return {
      title: `${input.companyName} Weekly Intelligence`,
      summary: responseText,
    };
  }
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
      // Note: gpt-image-1 only returns b64_json, not URLs
      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: conceptualPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium', // 'low', 'medium', or 'high' - medium balances quality and speed
      });

      // gpt-image-1 returns b64_json, not url
      const imageData = response.data[0];
      if (imageData?.b64_json) {
        // Save base64 image locally
        article.imageUrl = await saveBase64ImageLocally(imageData.b64_json, 'article');
        console.log(`  ✅ Generated and saved image for "${article.title}"`);
      } else if (imageData?.url) {
        // Fallback for other models that return URLs
        article.imageUrl = await saveImageLocally(imageData.url, 'article');
        console.log(`  ✅ Generated and saved image for "${article.title}"`);
      } else {
        console.log(`  ⚠️  No image data returned for "${article.title}"`);
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

  // Always initialize trace for debugging
  currentTrace = {
    startTime,
    input,
    steps: [],
  };
  traceStep('report_generation_start', { data: { input } });

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

    // Step 5: Synthesize Title + TL;DR
    console.log('\n✨ Step 5: Synthesizing report title and summary...');
    const synthesis = await synthesizeReport(summarizedArticles, input);

    // Step 6: Generate images
    console.log('\n🎨 Step 6: Generating images...');
    await generateArticleImages(summarizedArticles);

    const generationTime = Date.now() - startTime;
    console.log(`\n✅ Report generated successfully in ${(generationTime / 1000).toFixed(1)}s`);

    const reportContent: GeneratedReportContent = {
      title: synthesis.title,
      summary: synthesis.summary,
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

    // Finalize trace
    if (currentTrace) {
      currentTrace.endTime = Date.now();
      traceStep('report_generation_complete', {
        data: {
          generationTime,
          articleCount: summarizedArticles.length,
          totalSteps: currentTrace.steps.length
        }
      });
    }

    return reportContent;
  } catch (error) {
    // Log error in trace
    if (currentTrace) {
      traceStep('report_generation_error', {
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      currentTrace.endTime = Date.now();
    }
    console.error('❌ Error generating report:', error);
    throw error;
  }
}
