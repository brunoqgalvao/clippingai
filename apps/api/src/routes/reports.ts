import { Router } from 'express';
import { z } from 'zod';
import {
  generateReport,
  getAgentTrace,
} from '../services/reportGeneration.js';
import {
  saveGeneratedReport,
  getReportById,
  getReportBySlug,
  getReportsByUserId,
  updateReportVisibility,
} from '../services/reportStorage.js';
import { sendReportEmail } from '../services/email.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '@clippingai/database';
import type { ReportType } from '@clippingai/database';

const router = Router();

const generateReportSchema = z.object({
  companyName: z.string().min(1),
  companyDomain: z.string().min(1),
  industry: z.string().optional(),
  competitors: z.array(z.string()).optional(),
  reportType: z.enum(['media_monitoring']).optional().default('media_monitoring'),
  dateRange: z.number().min(1).max(30).optional(),
  userId: z.string().optional(), // Optional until auth is implemented
  saveToDatabase: z.boolean().optional().default(true),
  isPublic: z.boolean().optional().default(false),
});

/**
 * POST /api/reports/generate
 * Generate a new media monitoring digest and optionally save to database
 */
router.post('/generate', async (req, res) => {
  const generationStartTime = Date.now();

  try {
    const input = generateReportSchema.parse(req.body);

    console.log(`\n📊 Generating ${input.reportType} report for ${input.companyName}...`);

    const report = await generateReport({
      ...input,
      reportType: input.reportType as ReportType,
    });

    const generationDurationMs = Date.now() - generationStartTime;

    // Save to database if requested (default: true)
    let reportId: string | undefined;
    let publicSlug: string | null = null;

    if (input.saveToDatabase !== false) {
      const saved = await saveGeneratedReport({
        userId: input.userId,
        companyName: input.companyName,
        companyDomain: input.companyDomain,
        reportType: input.reportType as ReportType,
        industry: input.industry,
        competitors: input.competitors,
        content: report,
        generationDurationMs,
        isPublic: input.isPublic,
      });

      reportId = saved.reportId;
      publicSlug = saved.publicSlug;
    }

    res.json({
      success: true,
      data: {
        ...report,
        reportId,
        publicSlug,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'GENERATION_ERROR',
        message: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/reports/:id
 * Retrieve a report by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await getReportById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found',
        },
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error retrieving report:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'RETRIEVAL_ERROR',
        message: 'Failed to retrieve report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/reports/user/:userId
 * Get all reports for a user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const reports = await getReportsByUserId(userId, { limit, offset });

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Error retrieving user reports:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'RETRIEVAL_ERROR',
        message: 'Failed to retrieve user reports',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/reports/public/:slug
 * Retrieve a public report by slug
 */
router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const report = await getReportBySlug(slug);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Public report not found',
        },
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error retrieving public report:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'RETRIEVAL_ERROR',
        message: 'Failed to retrieve public report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * PATCH /api/reports/:id/visibility
 * Update report visibility (public/private)
 */
router.patch('/:id/visibility', async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;

    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'isPublic must be a boolean',
        },
      });
    }

    const result = await updateReportVisibility(id, isPublic);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error updating report visibility:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update report visibility',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * POST /api/reports/send-email
 * Send a report via email to multiple recipients
 */
const sendEmailSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50),
  reportUrl: z.string().url(),
  companyName: z.string().min(1),
  reportTitle: z.string().min(1),
});

router.post('/send-email', async (req, res) => {
  try {
    const input = sendEmailSchema.parse(req.body);

    console.log(`📧 Sending report to ${input.emails.length} recipient(s)...`);

    await sendReportEmail({
      to: input.emails,
      reportUrl: input.reportUrl,
      companyName: input.companyName,
      reportTitle: input.reportTitle,
    });

    res.json({
      success: true,
      data: {
        sent: input.emails.length,
        recipients: input.emails,
      },
    });
  } catch (error) {
    console.error('Error sending report email:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_SEND_ERROR',
        message: 'Failed to send report email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * DELETE /api/reports/:id
 * Delete a report (requires auth)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { id } = req.params;

    // Verify ownership
    const report = await prisma.generatedReport.findFirst({
      where: { id, userId: req.userId },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report not found' },
      });
    }

    // Delete the report
    await prisma.generatedReport.delete({
      where: { id },
    });

    console.log(`✅ Report deleted: ${id}`);

    res.json({
      success: true,
      message: 'Report deleted',
    });
  } catch (error) {
    console.error('Delete report error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// ============================================================================
// HIDDEN DEBUG ENDPOINTS - For development inspection
// Access via: /api/reports/__debug/trace
// ============================================================================

/**
 * GET /api/reports/__debug/trace
 * Get the full agent trace from the last report generation
 * Always available - trace is captured for every report generation
 */
router.get('/__debug/trace', (req, res) => {
  const trace = getAgentTrace();

  if (!trace) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NO_TRACE',
        message: 'No trace available. Generate a report first.',
      },
    });
  }

  // Calculate some stats
  const stats = {
    totalDuration: trace.endTime ? trace.endTime - trace.startTime : null,
    stepCount: trace.steps.length,
    stepsByType: trace.steps.reduce((acc, step) => {
      const baseStep = step.step.replace(/_\d+_.*$/, ''); // Remove iteration numbers
      acc[baseStep] = (acc[baseStep] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  res.json({
    success: true,
    data: {
      stats,
      trace,
    },
  });
});

/**
 * GET /api/reports/__debug/trace/summary
 * Get a concise summary of the trace (without full prompts/responses)
 */
router.get('/__debug/trace/summary', (req, res) => {
  const trace = getAgentTrace();

  if (!trace) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NO_TRACE',
        message: 'No trace available. Generate a report first.',
      },
    });
  }

  // Create a summary without the full prompts/responses
  const summary = {
    input: trace.input,
    startTime: new Date(trace.startTime).toISOString(),
    endTime: trace.endTime ? new Date(trace.endTime).toISOString() : null,
    totalDuration: trace.endTime ? `${((trace.endTime - trace.startTime) / 1000).toFixed(1)}s` : null,
    steps: trace.steps.map(step => ({
      step: step.step,
      timestamp: new Date(step.timestamp).toISOString(),
      relativeTime: `+${((step.timestamp - trace.startTime) / 1000).toFixed(1)}s`,
      data: step.data, // Keep the data, but not prompt/response
    })),
  };

  res.json({
    success: true,
    data: summary,
  });
});

export default router;
