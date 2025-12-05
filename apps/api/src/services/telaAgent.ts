/**
 * Tela Agent API Integration
 *
 * Uses Tela's autonomous agent with web search capabilities
 * to generate comprehensive intelligence reports.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TelaReportInput {
  companyName: string;
  companyDomain: string;
  industry?: string;
  competitors?: string[];
  dateRange?: number;
  geography?: string;
}

export interface TelaArticle {
  title: string;
  summary: string;
  content: string;
  sources: string[];
  relevance: string;
}

export interface TelaResearchNotes {
  searches_performed: string[];
  sources_reviewed: number | string;
  confidence_level: string;
  gaps: string;
}

export interface TelaReportResponse {
  title: string;
  summary: string;
  articles: TelaArticle[];
  research_notes?: TelaResearchNotes;
}

// Tela API response structure (agent-based)
interface TelaAPIResponse {
  id: string;
  promptVersionId: string;
  startedAt: string;
  completedAt: string;
  status: 'completed' | 'failed' | 'running';
  steps: Array<{
    id: string;
    name: string;
    actionId: string;
    input: any;
    output: {
      __reasoning?: string;
      title?: string;
      summary?: string;
      articles?: TelaArticle[];
      research_notes?: TelaResearchNotes;
    } & TelaReportResponse;
  }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const TELA_API_URL = 'https://api.tela.com/v2/chat/completions';
const TELA_CANVAS_ID = '70e2ea14-73d5-4406-a54c-b58f2c6274f6';
const TELA_API_KEY = process.env.TELA_API_KEY || 'f2dfc46a-16a3-4979-8a1f-fe7499733c64';

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export async function generateReportWithTela(input: TelaReportInput): Promise<TelaReportResponse> {
  const startTime = Date.now();

  console.log(`\n🤖 Calling Tela Agent for ${input.companyName}...`);

  const variables = {
    company_name: input.companyName,
    company_domain: input.companyDomain,
    industry: input.industry || '',
    competitors: input.competitors?.join(', ') || '',
    date_range: String(input.dateRange || 7),
    geography: input.geography || 'Global',
  };

  console.log('📋 Variables:', JSON.stringify(variables, null, 2));

  try {
    const response = await fetch(TELA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TELA_API_KEY}`,
      },
      body: JSON.stringify({
        canvas_id: TELA_CANVAS_ID,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Tela API error:', response.status, errorText);
      throw new Error(`Tela API error: ${response.status} - ${errorText}`);
    }

    const data: TelaAPIResponse = await response.json();

    const duration = Date.now() - startTime;
    console.log(`✅ Tela Agent completed in ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Status: ${data.status}`);

    if (data.status !== 'completed') {
      throw new Error(`Tela agent did not complete: ${data.status}`);
    }

    // Find the step with output (usually the first/only step for agent actions)
    const agentStep = data.steps?.find(step => step.output && step.output.title);

    if (agentStep?.output) {
      const output = agentStep.output;

      console.log(`📊 Report: "${output.title}"`);
      console.log(`📰 Articles: ${output.articles?.length || 0}`);

      if (output.research_notes) {
        console.log(`🔍 Searches performed: ${output.research_notes.searches_performed?.length || 0}`);
        console.log(`📚 Sources reviewed: ${output.research_notes.sources_reviewed}`);
        console.log(`🎯 Confidence: ${output.research_notes.confidence_level}`);
      }

      // Return clean output without __reasoning
      return {
        title: output.title,
        summary: output.summary,
        articles: output.articles || [],
        research_notes: output.research_notes,
      };
    }

    // Fallback: check if any step has the data
    for (const step of data.steps || []) {
      if (step.output?.articles && step.output.articles.length > 0) {
        console.log('📝 Found report in step:', step.name);
        return {
          title: step.output.title || 'Intelligence Report',
          summary: step.output.summary || '',
          articles: step.output.articles,
          research_notes: step.output.research_notes,
        };
      }
    }

    console.error('❌ No valid output found in Tela response');
    console.log('Response structure:', JSON.stringify(data, null, 2).slice(0, 1000));
    throw new Error('No valid output from Tela API - no articles found');

  } catch (error) {
    console.error('❌ Error calling Tela Agent:', error);
    throw error;
  }
}

// ============================================================================
// HELPER: Convert Tela response to our internal format
// ============================================================================

export interface ConvertedReport {
  title: string;
  summary: string;
  articles: Array<{
    id: string;
    title: string;
    summary: string;
    content: string;
    sources: string[];
    imageUrl?: string;
    imageAlt?: string;
    publishedAt?: string;
    relevanceScore?: number;
  }>;
  metadata: {
    totalSearches: number;
    articlesFound: number;
    articlesSelected: number;
    generationTime: number;
    researchNotes?: TelaResearchNotes;
  };
}

export function convertTelaResponse(
  telaResponse: TelaReportResponse,
  generationTime: number
): ConvertedReport {
  return {
    title: telaResponse.title,
    summary: telaResponse.summary,
    articles: telaResponse.articles.map((article, index) => ({
      id: `tela-article-${Date.now()}-${index}`,
      title: article.title,
      summary: article.summary,
      content: article.content + (article.relevance ? `\n\n**Why This Matters:** ${article.relevance}` : ''),
      sources: article.sources || [],
      imageAlt: article.title,
    })),
    metadata: {
      totalSearches: telaResponse.research_notes?.searches_performed?.length || 0,
      articlesFound: typeof telaResponse.research_notes?.sources_reviewed === 'number'
        ? telaResponse.research_notes.sources_reviewed
        : parseInt(String(telaResponse.research_notes?.sources_reviewed)) || 0,
      articlesSelected: telaResponse.articles.length,
      generationTime,
      researchNotes: telaResponse.research_notes,
    },
  };
}
