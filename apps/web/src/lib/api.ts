import type { CompanyDetectionResult, ApiResponse } from '@clippingai/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function detectCompany(email: string): Promise<CompanyDetectionResult> {
  const response = await fetch(`${API_URL}/api/onboarding/detect-company`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const result: ApiResponse<CompanyDetectionResult> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to detect company');
  }

  return result.data;
}

export async function processManualCompany(input: string): Promise<CompanyDetectionResult> {
  const response = await fetch(`${API_URL}/api/onboarding/manual-company`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  });

  const result: ApiResponse<CompanyDetectionResult> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to process company information');
  }

  return result.data;
}

export interface GenerateReportInput {
  companyName: string;
  companyDomain: string;
  industry?: string;
  competitors?: string[];
  reportType: 'competitor_landscape' | 'market_landscape' | 'media_monitoring';
  dateRange?: number;
}

export interface ReportArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  imageAlt?: string;
  sources: string[];
  publishedAt?: string;
}

export interface GeneratedReport {
  summary: string;
  articles: ReportArticle[];
  metadata?: {
    totalSearches: number;
    articlesFound: number;
    articlesSelected: number;
    generationTime: number;
  };
}

export async function generateReport(input: GenerateReportInput): Promise<GeneratedReport> {
  const response = await fetch(`${API_URL}/api/reports/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const result: ApiResponse<GeneratedReport> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to generate report');
  }

  return result.data;
}
