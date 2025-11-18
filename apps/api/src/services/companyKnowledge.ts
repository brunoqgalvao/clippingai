import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@clippingai/database';
import type { GeneratedReportContent } from './reportGeneration.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// ============================================================================
// TYPES
// ============================================================================

export interface CompanyKnowledge {
  companyName: string;
  companyDomain: string;
  industry?: string;
  competitors: string[];
  marketPosition?: string;
  keyProducts: string[];
  targetMarket?: string;
  strategicFocus: string[];
  recentNews?: Array<{ date: string; summary: string }>;
  competitiveDynamics?: Record<string, { strength?: string; weakness?: string }>;
}

interface KnowledgeUpdate {
  competitors?: string[];
  marketPosition?: string;
  keyProducts?: string[];
  strategicFocus?: string[];
  recentDevelopments?: Array<{ date: string; summary: string }>;
  competitiveInsights?: Record<string, { strength?: string; weakness?: string }>;
}

// ============================================================================
// GET COMPANY KNOWLEDGE
// ============================================================================

export async function getCompanyKnowledge(userId: string): Promise<CompanyKnowledge | null> {
  const knowledge = await prisma.companyKnowledgeBase.findUnique({
    where: { userId },
  });

  if (!knowledge) return null;

  return {
    companyName: knowledge.companyName,
    companyDomain: knowledge.companyDomain,
    industry: knowledge.industry || undefined,
    competitors: knowledge.competitors,
    marketPosition: knowledge.marketPosition || undefined,
    keyProducts: knowledge.keyProducts,
    targetMarket: knowledge.targetMarket || undefined,
    strategicFocus: knowledge.strategicFocus,
    recentNews: knowledge.recentNews as Array<{ date: string; summary: string }> | undefined,
    competitiveDynamics: knowledge.competitiveDynamics as Record<string, { strength?: string; weakness?: string }> | undefined,
  };
}

// ============================================================================
// INITIALIZE COMPANY KNOWLEDGE
// ============================================================================

export async function initializeCompanyKnowledge(
  userId: string,
  companyName: string,
  companyDomain: string,
  industry?: string,
  competitors?: string[]
): Promise<CompanyKnowledge> {
  const existing = await prisma.companyKnowledgeBase.findUnique({
    where: { userId },
  });

  if (existing) {
    return getCompanyKnowledge(userId) as Promise<CompanyKnowledge>;
  }

  const knowledge = await prisma.companyKnowledgeBase.create({
    data: {
      userId,
      companyName,
      companyDomain,
      industry,
      competitors: competitors || [],
      keyProducts: [],
      strategicFocus: [],
      reportCount: 0,
    },
  });

  return {
    companyName: knowledge.companyName,
    companyDomain: knowledge.companyDomain,
    industry: knowledge.industry || undefined,
    competitors: knowledge.competitors,
    marketPosition: knowledge.marketPosition || undefined,
    keyProducts: knowledge.keyProducts,
    targetMarket: knowledge.targetMarket || undefined,
    strategicFocus: knowledge.strategicFocus,
  };
}

// ============================================================================
// EXTRACT KNOWLEDGE FROM REPORT
// ============================================================================

export async function extractKnowledgeFromReport(
  companyName: string,
  reportContent: GeneratedReportContent,
  existingKnowledge?: CompanyKnowledge
): Promise<KnowledgeUpdate> {
  const articlesText = reportContent.articles
    .map((a) => `${a.title}\n${a.summary}\n${a.content}`)
    .join('\n\n---\n\n');

  const existingContext = existingKnowledge
    ? `
EXISTING KNOWLEDGE:
- Competitors: ${existingKnowledge.competitors.join(', ')}
- Market Position: ${existingKnowledge.marketPosition || 'Unknown'}
- Key Products: ${existingKnowledge.keyProducts.join(', ') || 'Unknown'}
- Strategic Focus: ${existingKnowledge.strategicFocus.join(', ') || 'Unknown'}
`
    : '';

  const prompt = `You are updating the knowledge base for ${companyName} based on a new intelligence report.

${existingContext}

NEW REPORT CONTENT:
${articlesText}

Extract and structure NEW or UPDATED knowledge about ${companyName}:

**CRITICAL RULES:**
1. ONLY extract facts EXPLICITLY stated in the report
2. Focus on NEW information not already in existing knowledge
3. Be concise - extract key facts only
4. If the report doesn't contain information for a category, return null
5. For competitors: only list companies directly mentioned as competitors or in competitive context

Return ONLY valid JSON:
{
  "competitors": ["CompanyA", "CompanyB"] or null,
  "marketPosition": "brief description of market position/ranking" or null,
  "keyProducts": ["Product1", "Product2"] or null,
  "strategicFocus": ["focus area 1", "focus area 2"] or null,
  "recentDevelopments": [
    {"date": "2025-11-15", "summary": "brief summary of development"}
  ] or null,
  "competitiveInsights": {
    "CompetitorA": {"strength": "brief strength", "weakness": "brief weakness"}
  } or null
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('⚠️  No JSON found in knowledge extraction response');
    return {};
  }

  try {
    const extracted = JSON.parse(jsonMatch[0]);
    console.log('✅ Extracted knowledge update:', JSON.stringify(extracted, null, 2));
    return extracted;
  } catch (error) {
    console.error('Error parsing knowledge extraction:', error);
    return {};
  }
}

// ============================================================================
// UPDATE COMPANY KNOWLEDGE
// ============================================================================

export async function updateCompanyKnowledge(
  userId: string,
  updates: KnowledgeUpdate
): Promise<void> {
  const existing = await prisma.companyKnowledgeBase.findUnique({
    where: { userId },
  });

  if (!existing) {
    console.log('⚠️  No knowledge base found for user, skipping update');
    return;
  }

  // Merge updates with existing data
  const updatedData: any = {
    lastUpdated: new Date(),
    reportCount: { increment: 1 },
  };

  if (updates.competitors && updates.competitors.length > 0) {
    // Merge with existing competitors (avoid duplicates)
    const allCompetitors = [...existing.competitors, ...updates.competitors];
    updatedData.competitors = Array.from(new Set(allCompetitors));
  }

  if (updates.marketPosition) {
    updatedData.marketPosition = updates.marketPosition;
  }

  if (updates.keyProducts && updates.keyProducts.length > 0) {
    const allProducts = [...existing.keyProducts, ...updates.keyProducts];
    updatedData.keyProducts = Array.from(new Set(allProducts));
  }

  if (updates.strategicFocus && updates.strategicFocus.length > 0) {
    const allFocus = [...existing.strategicFocus, ...updates.strategicFocus];
    updatedData.strategicFocus = Array.from(new Set(allFocus));
  }

  if (updates.recentDevelopments && updates.recentDevelopments.length > 0) {
    // Keep only last 10 developments
    const existingNews = (existing.recentNews as Array<{ date: string; summary: string }>) || [];
    const allNews = [...updates.recentDevelopments, ...existingNews];
    updatedData.recentNews = allNews.slice(0, 10);
  }

  if (updates.competitiveInsights) {
    const existingDynamics = (existing.competitiveDynamics as Record<string, any>) || {};
    updatedData.competitiveDynamics = {
      ...existingDynamics,
      ...updates.competitiveInsights,
    };
  }

  await prisma.companyKnowledgeBase.update({
    where: { userId },
    data: updatedData,
  });

  console.log('✅ Updated company knowledge base');
}

// ============================================================================
// FORMAT KNOWLEDGE FOR PROMPTS
// ============================================================================

export function formatKnowledgeForPrompt(knowledge: CompanyKnowledge | null): string {
  if (!knowledge) return '';

  const parts: string[] = [];

  if (knowledge.competitors && knowledge.competitors.length > 0) {
    parts.push(`Known competitors: ${knowledge.competitors.join(', ')}`);
  }

  if (knowledge.marketPosition) {
    parts.push(`Market position: ${knowledge.marketPosition}`);
  }

  if (knowledge.keyProducts && knowledge.keyProducts.length > 0) {
    parts.push(`Key products: ${knowledge.keyProducts.join(', ')}`);
  }

  if (knowledge.strategicFocus && knowledge.strategicFocus.length > 0) {
    parts.push(`Strategic focus areas: ${knowledge.strategicFocus.join(', ')}`);
  }

  if (knowledge.recentNews && knowledge.recentNews.length > 0) {
    const recentSummaries = knowledge.recentNews.slice(0, 3).map(n => `${n.date}: ${n.summary}`);
    parts.push(`Recent developments:\n${recentSummaries.join('\n')}`);
  }

  if (parts.length === 0) return '';

  return `\n**BACKGROUND CONTEXT (for inspiration - do not force connections):**\n${parts.join('\n')}\n`;
}
