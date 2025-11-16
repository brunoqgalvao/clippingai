import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TavilyClient } from 'tavily';
import type { ReportType } from '@clippingai/database';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

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
  const { companyName, industry, competitors = [], reportType, dateRange = 7 } = input;

  const reportTypeInstructions = {
    competitor_landscape: `Focus on: product launches, pricing changes, strategic moves, funding, partnerships, leadership changes`,
    market_landscape: `Focus on: industry trends, regulatory changes, market shifts, emerging technologies, market opportunities`,
    media_monitoring: `Focus on: news mentions, press releases, social media buzz, industry publications, sentiment`,
  };

  return `You are a research assistant planning search queries for a competitive intelligence report.

Company: ${companyName}
Industry: ${industry || 'Unknown'}
Competitors: ${competitors.length > 0 ? competitors.join(', ') : 'To be discovered'}
Report Type: ${reportType}
Time Range: Last ${dateRange} days

${reportTypeInstructions[reportType]}

Generate 5-7 optimal search queries to find the most relevant, recent information.

Each query should:
- Be specific and targeted
- Focus on recent developments (use temporal keywords when relevant)
- Cover different aspects of the report type
- Be likely to return high-quality results

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

async function executeSearches(queries: SearchQuery[]): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const client = getTavilyClient();

  for (const { query } of queries) {
    try {
      const response = await client.search(query, {
        searchDepth: 'advanced',
        maxResults: 5,
        includeDomains: [], // Can filter to specific domains
        excludeDomains: ['reddit.com', 'youtube.com'], // Avoid forums/videos for now
      });

      const results: SearchResult[] = response.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        publishedDate: r.publishedDate,
        score: r.score,
      }));

      allResults.push(...results);
      console.log(`  🔍 Query "${query}" → ${results.length} results`);
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
    }
  }

  console.log(`✅ Found ${allResults.length} total search results`);
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

  return `You are filtering search results for a ${input.reportType} report about ${input.companyName}.

Review these ${results.length} search results and select the ${targetCount} MOST valuable articles.

Criteria:
- Relevance to ${input.reportType}
- Recency (prefer recent news)
- Quality of source
- Uniqueness (avoid duplicates)
- Actionable insights

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
// STEP 4: ARTICLE SUMMARIZATION
// ============================================================================

async function summarizeArticles(
  articles: SearchResult[],
  input: ReportGenerationInput
): Promise<ReportArticle[]> {
  const summaries: ReportArticle[] = [];

  for (const article of articles) {
    try {
      const summary = await summarizeArticle(article, input);
      summaries.push(summary);
      console.log(`  📝 Summarized: "${summary.title}"`);
    } catch (error) {
      console.error(`Error summarizing article "${article.title}":`, error);
    }
  }

  console.log(`✅ Summarized ${summaries.length} articles`);
  return summaries;
}

async function summarizeArticle(
  article: SearchResult,
  input: ReportGenerationInput
): Promise<ReportArticle> {
  const prompt = `Summarize this article for a ${input.reportType} report about ${input.companyName}.

Title: ${article.title}
URL: ${article.url}
Content: ${article.content}

Create:
1. A concise 2-3 sentence summary (for preview)
2. A detailed 300-500 word analysis (main content)
3. An image description for AI generation

Focus on: actionable insights, strategic implications, key facts.

Return ONLY valid JSON:
{
  "title": "cleaned/improved title",
  "summary": "2-3 sentence summary",
  "content": "300-500 word detailed analysis",
  "imageDescription": "description for image generation",
  "keyPoints": ["point 1", "point 2", "point 3"]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in summarization response');

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    id: `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: parsed.title || article.title,
    summary: parsed.summary || article.content.slice(0, 200),
    content: parsed.content || article.content,
    imageAlt: parsed.imageDescription || parsed.title,
    sources: [article.url],
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

  const prompt = `Create a compelling TL;DR summary for a ${input.reportType} report about ${input.companyName}.

Articles covered:
${articlesText}

Write a 2-3 sentence TL;DR that:
- Highlights the most important insights
- Shows clear patterns or trends
- Is actionable and engaging
- Uses specific numbers/facts when available

Return ONLY the TL;DR text (no JSON, no extra formatting).`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const tldr = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  console.log(`✅ Generated TL;DR`);
  return tldr;
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
    // Step 1: Plan queries
    console.log('\n📋 Step 1: Planning search queries...');
    const queries = await planSearchQueries(input);
    if (queries.length === 0) {
      throw new Error('No queries generated');
    }

    // Step 2: Execute searches
    console.log('\n🔍 Step 2: Executing searches...');
    const searchResults = await executeSearches(queries);
    if (searchResults.length === 0) {
      throw new Error('No search results found');
    }

    // Step 3: Extract best articles
    console.log('\n🎯 Step 3: Extracting and ranking articles...');
    const selectedArticles = await extractAndRankArticles(searchResults, input, 5);
    if (selectedArticles.length === 0) {
      throw new Error('No articles selected');
    }

    // Step 4: Summarize articles
    console.log('\n📝 Step 4: Summarizing articles...');
    const summarizedArticles = await summarizeArticles(selectedArticles, input);

    // Step 5: Synthesize TL;DR
    console.log('\n✨ Step 5: Synthesizing TL;DR...');
    const tldr = await synthesizeReport(summarizedArticles, input);

    // Step 6: Generate images (async, don't block)
    console.log('\n🎨 Step 6: Images will be generated asynchronously...');
    // TODO: Implement image generation in background

    const generationTime = Date.now() - startTime;
    console.log(`\n✅ Report generated successfully in ${(generationTime / 1000).toFixed(1)}s`);

    return {
      summary: tldr,
      articles: summarizedArticles,
      metadata: {
        totalSearches: queries.length,
        articlesFound: searchResults.length,
        articlesSelected: summarizedArticles.length,
        generationTime,
      },
    };
  } catch (error) {
    console.error('❌ Error generating report:', error);
    throw error;
  }
}
