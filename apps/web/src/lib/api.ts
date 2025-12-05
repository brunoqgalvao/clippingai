import type { CompanyDetectionResult, ApiResponse } from '@clippingai/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Token management
let authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('auth_token');
}

function getAuthHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

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
  reportType: 'media_monitoring';
  dateRange?: number;
  userId?: string; // Optional until auth is implemented
  userEmail?: string; // Real user email for anonymous user creation
  saveToDatabase?: boolean;
  isPublic?: boolean;
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
  reportId?: string; // ID in database (if saved)
  publicSlug?: string | null; // Public sharing slug (if public)
  metadata?: {
    totalSearches: number;
    articlesFound: number;
    articlesSelected: number;
    generationTime: number;
  };
}

export interface StoredReport {
  id: string;
  status: 'generating' | 'completed' | 'failed';
  content: {
    summary: string;
    articles: ReportArticle[];
    metadata?: any;
  } | null;
  isPublic: boolean;
  publicSlug: string | null;
  viewCount: number;
  generationStartedAt: string;
  generationCompletedAt: string | null;
  generationDurationMs: number | null;
  createdAt: string;
  errorMessage?: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    companyName: string | null;
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

export async function getReportById(reportId: string): Promise<StoredReport> {
  const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result: ApiResponse<StoredReport> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to retrieve report');
  }

  return result.data;
}

export async function getReportBySlug(slug: string): Promise<StoredReport> {
  const response = await fetch(`${API_URL}/api/reports/public/${slug}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result: ApiResponse<StoredReport> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to retrieve public report');
  }

  return result.data;
}

export async function getReportsByUserId(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<StoredReport[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());

  const url = `${API_URL}/api/reports/user/${userId}${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result: ApiResponse<StoredReport[]> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to retrieve user reports');
  }

  return result.data;
}

export async function updateReportVisibility(
  reportId: string,
  isPublic: boolean
): Promise<{ publicSlug: string | null }> {
  const response = await fetch(`${API_URL}/api/reports/${reportId}/visibility`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isPublic }),
  });

  const result: ApiResponse<{ publicSlug: string | null }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to update report visibility');
  }

  return result.data;
}

// ============================================================================
// AUTH
// ============================================================================

export interface SignupInput {
  email: string;
  password: string;
  name?: string;
  companyName?: string;
  companyDomain?: string;
  timezone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    companyName: string | null;
    companyDomain: string | null;
    subscriptionTier: string;
    emailVerified: boolean;
    timezone: string;
    subscriptionStatus: string;
    createdAt: string;
    updatedAt: string;
  };
  token: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  companyDomain: string | null;
  timezone: string;
  emailVerified: boolean;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
}

export async function checkEmailExists(email: string): Promise<{ exists: boolean; email: string }> {
  const response = await fetch(`${API_URL}/api/auth/check-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const result: ApiResponse<{ exists: boolean; email: string }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to check email');
  }

  return result.data;
}

export async function signup(input: SignupInput): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const result: ApiResponse<AuthResponse> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to create account');
  }

  // Store token
  setAuthToken(result.data.token);

  return result.data;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const result: ApiResponse<AuthResponse> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to login');
  }

  // Store token
  setAuthToken(result.data.token);

  return result.data;
}

export async function logout() {
  clearAuthToken();
}

export async function getCurrentUser(): Promise<User> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<User> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to get user profile');
  }

  return result.data;
}

export async function updateProfile(updates: {
  name?: string;
  companyName?: string;
  companyDomain?: string;
  timezone?: string;
}): Promise<User> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  const result: ApiResponse<User> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to update profile');
  }

  return result.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to change password');
  }
}

// ============================================================================
// JOBS (Background Processing)
// ============================================================================

export interface JobStatus {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  data: any;
  result?: {
    reportId: string;
    publicSlug: string | null;
    generationDurationMs: number;
  };
  failedReason?: string;
  finishedOn?: number;
  processedOn?: number;
}

export async function queueReportGeneration(input: GenerateReportInput): Promise<{ jobId: string }> {
  const response = await fetch(`${API_URL}/api/jobs/queue-report`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const result: ApiResponse<{ jobId: string; status: string; message: string }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to queue report generation');
  }

  return { jobId: result.data.jobId };
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<JobStatus> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to get job status');
  }

  return result.data;
}

export async function cancelJob(jobId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to cancel job');
  }
}

export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  total: number;
}> {
  const response = await fetch(`${API_URL}/api/jobs/stats/queue`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<any> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to get queue stats');
  }

  return result.data;
}

// ============================================================================
// REPORT CONFIGS (Streams)
// ============================================================================

export interface ReportConfig {
  id: string;
  userId: string;
  title: string;
  description: string;
  reportType: 'competitor_landscape' | 'market_landscape' | 'media_monitoring';
  status: 'active' | 'paused' | 'deleted';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  scheduleTime: string;
  scheduleDay: string | null;
  searchParameters: {
    companyName?: string;
    companyDomain?: string;
    industry?: string;
    competitors?: string[];
    keywords?: string[];
    dateRange?: string;
  };
  nextGenerationAt: string | null;
  lastGenerationAt: string | null;
  createdAt: string;
  updatedAt: string;
  recipients?: ReportRecipient[];
  generatedReports?: StoredReport[];
  _count?: {
    generatedReports: number;
  };
}

export interface ReportRecipient {
  id: string;
  reportConfigId: string;
  email: string;
  status: 'active' | 'unsubscribed';
  createdAt: string;
}

export interface CreateReportConfigInput {
  title: string;
  description: string;
  reportType: 'competitor_landscape' | 'market_landscape' | 'media_monitoring';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  scheduleTime: string;
  scheduleDay?: string;
  searchParameters: {
    companyName?: string;
    companyDomain?: string;
    industry?: string;
    competitors?: string[];
    keywords?: string[];
    dateRange?: string;
  };
  recipients?: string[];
}

export async function createReportConfig(input: CreateReportConfigInput): Promise<ReportConfig> {
  const response = await fetch(`${API_URL}/api/report-configs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const result: ApiResponse<ReportConfig> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to create report config');
  }

  return result.data;
}

export async function getReportConfigs(): Promise<ReportConfig[]> {
  const response = await fetch(`${API_URL}/api/report-configs`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<ReportConfig[]> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to get report configs');
  }

  return result.data;
}

export async function getReportConfig(id: string): Promise<ReportConfig> {
  const response = await fetch(`${API_URL}/api/report-configs/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<ReportConfig> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to get report config');
  }

  return result.data;
}

export async function updateReportConfig(
  id: string,
  updates: Partial<CreateReportConfigInput>
): Promise<ReportConfig> {
  const response = await fetch(`${API_URL}/api/report-configs/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  const result: ApiResponse<ReportConfig> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to update report config');
  }

  return result.data;
}

export async function deleteReportConfig(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/report-configs/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to delete report config');
  }
}

export async function addReportConfigRecipients(
  id: string,
  emails: string[]
): Promise<ReportRecipient[]> {
  const response = await fetch(`${API_URL}/api/report-configs/${id}/recipients`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ emails }),
  });

  const result: ApiResponse<ReportRecipient[]> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to add recipients');
  }

  return result.data;
}

export async function removeReportConfigRecipient(
  configId: string,
  recipientId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/report-configs/${configId}/recipients/${recipientId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to remove recipient');
  }
}

export async function generateReportForConfig(configId: string): Promise<{ jobId: string; reportId: string }> {
  const response = await fetch(`${API_URL}/api/report-configs/${configId}/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<{ jobId: string; reportId: string; status: string; message: string }> = await response.json();

  if (!result.success || !result.data) {
    // Check for "already generating" error
    if (result.error?.code === 'ALREADY_GENERATING') {
      const error = new Error(result.error.message) as Error & { code: string; reportId?: string };
      error.code = 'ALREADY_GENERATING';
      error.reportId = (result.error as any).reportId;
      throw error;
    }
    throw new Error(result.error?.message || 'Failed to generate report');
  }

  return { jobId: result.data.jobId, reportId: result.data.reportId };
}

export async function deleteReport(reportId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to delete report');
  }
}

// ============================================================================
// DEBUG - Agent Trace (Hidden)
// ============================================================================

export interface AgentTraceStep {
  step: string;
  timestamp: string;
  relativeTime: string;
  prompt?: string;
  response?: string;
  data?: any;
}

export interface AgentTraceSummary {
  input: any;
  startTime: string;
  endTime: string | null;
  totalDuration: string | null;
  steps: AgentTraceStep[];
}

export interface AgentTraceStats {
  totalDuration: number | null;
  stepCount: number;
  stepsByType: Record<string, number>;
}

export interface AgentTraceFull {
  stats: AgentTraceStats;
  trace: {
    startTime: number;
    endTime?: number;
    input: any;
    steps: Array<{
      step: string;
      timestamp: number;
      prompt?: string;
      response?: string;
      data?: any;
    }>;
  };
}

export async function getAgentTraceSummary(): Promise<AgentTraceSummary | null> {
  try {
    const response = await fetch(`${API_URL}/api/reports/__debug/trace/summary`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 404) {
      return null;
    }

    const result: ApiResponse<AgentTraceSummary> = await response.json();

    if (!result.success || !result.data) {
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Failed to fetch agent trace summary:', error);
    return null;
  }
}

export async function getAgentTraceFull(): Promise<AgentTraceFull | null> {
  try {
    const response = await fetch(`${API_URL}/api/reports/__debug/trace`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 404) {
      return null;
    }

    const result: ApiResponse<AgentTraceFull> = await response.json();

    if (!result.success || !result.data) {
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Failed to fetch agent trace:', error);
    return null;
  }
}
