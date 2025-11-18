import { prisma } from '@clippingai/database';
import type { ReportType, GeneratedReportStatus } from '@clippingai/database';
import type { GeneratedReportContent } from './reportGeneration.js';
import { randomBytes } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface SaveReportInput {
  userId?: string; // Optional until auth is implemented
  reportConfigId?: string; // Optional - for scheduled reports
  companyName: string;
  companyDomain: string;
  reportType: ReportType;
  industry?: string;
  competitors?: string[];
  content: GeneratedReportContent;
  generationDurationMs: number;
  isPublic?: boolean;
}

export interface ReportWithRelations {
  id: string;
  status: GeneratedReportStatus;
  content: any;
  isPublic: boolean;
  publicSlug: string | null;
  viewCount: number;
  generationStartedAt: Date;
  generationCompletedAt: Date | null;
  generationDurationMs: number | null;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    name: string | null;
    companyName: string | null;
  } | null;
}

// ============================================================================
// SAVE REPORT
// ============================================================================

/**
 * Save a generated report to the database
 * Creates a temporary user if none exists (for MVP)
 */
export async function saveGeneratedReport(
  input: SaveReportInput
): Promise<{ reportId: string; publicSlug: string | null }> {
  const startTime = Date.now();

  console.log(`💾 Saving report to database...`);

  let userId = input.userId;

  // If no userId provided, create or find a temporary anonymous user
  // This allows the MVP to work without authentication
  if (!userId) {
    const anonymousUser = await getOrCreateAnonymousUser(input.companyDomain);
    userId = anonymousUser.id;
  }

  // Generate public slug if report is public
  const publicSlug = input.isPublic ? generatePublicSlug() : null;

  // Create a temporary report config if none exists
  let reportConfigId = input.reportConfigId;
  if (!reportConfigId) {
    const tempConfig = await createTempReportConfig({
      userId,
      companyName: input.companyName,
      companyDomain: input.companyDomain,
      reportType: input.reportType,
      industry: input.industry,
      competitors: input.competitors,
    });
    reportConfigId = tempConfig.id;
  }

  // Save the report
  const report = await prisma.generatedReport.create({
    data: {
      userId,
      reportConfigId,
      status: 'completed',
      content: input.content,
      isPublic: input.isPublic || false,
      publicSlug,
      generationStartedAt: new Date(Date.now() - input.generationDurationMs),
      generationCompletedAt: new Date(),
      generationDurationMs: input.generationDurationMs,
    },
  });

  const saveTime = Date.now() - startTime;
  console.log(`✅ Report saved to database (${saveTime}ms) - ID: ${report.id}`);

  if (publicSlug) {
    console.log(`🔗 Public URL: /r/${publicSlug}`);
  }

  return {
    reportId: report.id,
    publicSlug,
  };
}

// ============================================================================
// RETRIEVE REPORTS
// ============================================================================

/**
 * Get a report by ID
 */
export async function getReportById(reportId: string): Promise<ReportWithRelations | null> {
  console.log(`📖 Fetching report ${reportId} from database...`);

  const report = await prisma.generatedReport.findUnique({
    where: { id: reportId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          companyName: true,
        },
      },
    },
  });

  if (!report) {
    console.log(`❌ Report ${reportId} not found`);
    return null;
  }

  console.log(`✅ Report ${reportId} found`);
  return report;
}

/**
 * Get a report by public slug
 */
export async function getReportBySlug(slug: string): Promise<ReportWithRelations | null> {
  console.log(`📖 Fetching report with slug "${slug}" from database...`);

  const report = await prisma.generatedReport.findUnique({
    where: {
      publicSlug: slug,
      isPublic: true, // Only return if public
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          companyName: true,
        },
      },
    },
  });

  if (!report) {
    console.log(`❌ Public report with slug "${slug}" not found`);
    return null;
  }

  // Increment view count
  await prisma.generatedReport.update({
    where: { id: report.id },
    data: { viewCount: { increment: 1 } },
  });

  console.log(`✅ Public report found and view count incremented`);
  return report;
}

/**
 * Get all reports for a user
 */
export async function getReportsByUserId(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<ReportWithRelations[]> {
  const { limit = 20, offset = 0 } = options;

  console.log(`📖 Fetching reports for user ${userId}...`);

  const reports = await prisma.generatedReport.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          companyName: true,
        },
      },
    },
  });

  console.log(`✅ Found ${reports.length} reports for user ${userId}`);
  return reports;
}

/**
 * Update report to make it public/private
 */
export async function updateReportVisibility(
  reportId: string,
  isPublic: boolean
): Promise<{ publicSlug: string | null }> {
  const publicSlug = isPublic ? generatePublicSlug() : null;

  await prisma.generatedReport.update({
    where: { id: reportId },
    data: {
      isPublic,
      publicSlug: isPublic ? publicSlug : null,
    },
  });

  console.log(`✅ Report ${reportId} visibility updated: ${isPublic ? 'public' : 'private'}`);
  return { publicSlug };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get or create an anonymous user for MVP (until auth is implemented)
 * Uses company domain as unique identifier
 */
async function getOrCreateAnonymousUser(companyDomain: string) {
  const anonymousEmail = `anonymous@${companyDomain}`;

  let user = await prisma.user.findUnique({
    where: { email: anonymousEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: anonymousEmail,
        passwordHash: 'anonymous', // Placeholder until auth is implemented
        companyDomain,
        name: 'Anonymous User',
      },
    });
    console.log(`👤 Created anonymous user: ${anonymousEmail}`);
  }

  return user;
}

/**
 * Create a temporary report config for one-off report generation
 */
async function createTempReportConfig(params: {
  userId: string;
  companyName: string;
  companyDomain: string;
  reportType: ReportType;
  industry?: string;
  competitors?: string[];
}) {
  const config = await prisma.reportConfig.create({
    data: {
      userId: params.userId,
      title: `${params.companyName} - ${params.reportType}`,
      description: `One-time report for ${params.companyName}`,
      reportType: params.reportType,
      frequency: 'weekly', // Default
      scheduleTime: '09:00',
      searchParameters: {
        companyDomain: params.companyDomain,
        industry: params.industry,
        competitors: params.competitors || [],
        dateRange: '7d',
      },
    },
  });

  return config;
}

/**
 * Generate a random public slug for sharing
 * Format: 8 characters, URL-safe
 */
function generatePublicSlug(): string {
  return randomBytes(6)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 8);
}

/**
 * Delete a report (soft delete by updating status)
 */
export async function deleteReport(reportId: string): Promise<void> {
  await prisma.generatedReport.delete({
    where: { id: reportId },
  });

  console.log(`✅ Report ${reportId} deleted`);
}
