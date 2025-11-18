import { Router } from 'express';
import { z } from 'zod';
import { generateReport } from '../services/reportGeneration.js';
import {
  saveGeneratedReport,
  getReportById,
  getReportBySlug,
  getReportsByUserId,
  updateReportVisibility,
} from '../services/reportStorage.js';
import { sendReportEmail } from '../services/email.js';
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

export default router;
