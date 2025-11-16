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
