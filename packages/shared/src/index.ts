import { z } from 'zod';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Onboarding types
export interface CompanyDetectionResult {
  name: string;
  domain: string;
  website: string;
  description?: string;
  industry?: string;
  logo?: string;
  logoVariant?: 'light' | 'dark' | 'unknown';
  logoOptions?: Array<{
    url: string;
    source: string;
  }>;
  competitors?: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface SuggestedReport {
  id: string;
  type: 'media_monitoring';
  title: string;
  description: string;
  estimatedArticles: number;
}

// Report types
export interface ReportArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  imageAlt: string;
  sources: string[];
  publishedAt: string;
}

export interface ReportContent {
  summary: string;
  articles: ReportArticle[];
}

// Validation schemas
export const emailSchema = z.string().email('Invalid email address');

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

export const createReportSchema = z.object({
  description: z.string().min(10, 'Description is too short'),
  reportType: z.enum(['media_monitoring']).default('media_monitoring'),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  scheduleTime: z.string(),
  recipients: z.array(emailSchema).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
