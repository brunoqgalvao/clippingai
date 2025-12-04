import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@clippingai/database';
import { requireAuth } from '../middleware/auth.js';
import type { ReportType, Frequency, ReportStatus } from '@clippingai/database';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  reportType: z.enum(['competitor_landscape', 'market_landscape', 'media_monitoring']),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  scheduleDay: z.string().optional(),
  searchParameters: z.object({
    companyName: z.string().optional(),
    companyDomain: z.string().optional(),
    industry: z.string().optional(),
    competitors: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    dateRange: z.string().optional(),
  }),
  recipients: z.array(z.string().email()).optional(),
});

const updateConfigSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  scheduleDay: z.string().optional(),
  status: z.enum(['active', 'paused', 'deleted']).optional(),
  searchParameters: z.object({
    companyName: z.string().optional(),
    companyDomain: z.string().optional(),
    industry: z.string().optional(),
    competitors: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    dateRange: z.string().optional(),
  }).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/report-configs
 * Create a new report config (stream)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const input = createConfigSchema.parse(req.body);

    // Calculate next generation time
    const now = new Date();
    const [hours, minutes] = input.scheduleTime.split(':').map(Number);
    const nextGeneration = new Date(now);
    nextGeneration.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (nextGeneration <= now) {
      nextGeneration.setDate(nextGeneration.getDate() + 1);
    }

    const config = await prisma.reportConfig.create({
      data: {
        userId: req.userId,
        title: input.title,
        description: input.description,
        reportType: input.reportType as ReportType,
        frequency: input.frequency as Frequency,
        scheduleTime: input.scheduleTime,
        scheduleDay: input.scheduleDay || null,
        searchParameters: input.searchParameters,
        nextGenerationAt: nextGeneration,
      },
      include: {
        recipients: true,
      },
    });

    // Add recipients if provided
    if (input.recipients && input.recipients.length > 0) {
      await prisma.reportRecipient.createMany({
        data: input.recipients.map(email => ({
          reportConfigId: config.id,
          email: email.toLowerCase(),
        })),
      });
    }

    console.log(`✅ Report config created: ${config.id} - "${config.title}"`);

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Create config error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create report config',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/report-configs
 * Get all report configs for current user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const configs = await prisma.reportConfig.findMany({
      where: {
        userId: req.userId,
        status: { not: 'deleted' },
      },
      include: {
        recipients: {
          where: { status: 'active' },
        },
        generatedReports: {
          where: { status: { in: ['completed', 'generating'] } },
          orderBy: { createdAt: 'desc' },
          take: 1, // Get latest report (completed or generating)
        },
        _count: {
          select: {
            generatedReports: {
              where: { status: 'completed' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error('Get configs error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'RETRIEVAL_ERROR',
        message: 'Failed to retrieve report configs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/report-configs/:id
 * Get a specific report config
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { id } = req.params;

    const config = await prisma.reportConfig.findFirst({
      where: {
        id,
        userId: req.userId,
        status: { not: 'deleted' },
      },
      include: {
        recipients: {
          where: { status: 'active' },
        },
        generatedReports: {
          where: { status: 'completed' },
          orderBy: { createdAt: 'desc' },
          take: 5, // Get last 5 reports
        },
        _count: {
          select: {
            generatedReports: {
              where: { status: 'completed' },
            },
          },
        },
      },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report config not found' },
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Get config error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'RETRIEVAL_ERROR',
        message: 'Failed to retrieve report config',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * PATCH /api/report-configs/:id
 * Update a report config
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { id } = req.params;
    const updates = updateConfigSchema.parse(req.body);

    // Verify ownership
    const existing = await prisma.reportConfig.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report config not found' },
      });
    }

    const config = await prisma.reportConfig.update({
      where: { id },
      data: {
        ...updates,
        status: updates.status as ReportStatus | undefined,
        frequency: updates.frequency as Frequency | undefined,
      },
      include: {
        recipients: true,
      },
    });

    console.log(`✅ Report config updated: ${config.id}`);

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Update config error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update report config',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * DELETE /api/report-configs/:id
 * Soft delete a report config
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
    const existing = await prisma.reportConfig.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report config not found' },
      });
    }

    await prisma.reportConfig.update({
      where: { id },
      data: { status: 'deleted' },
    });

    console.log(`✅ Report config deleted: ${id}`);

    res.json({
      success: true,
      message: 'Report config deleted',
    });
  } catch (error) {
    console.error('Delete config error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete report config',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * POST /api/report-configs/:id/recipients
 * Add recipients to a report config
 */
router.post('/:id/recipients', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { id } = req.params;
    const { emails } = z.object({
      emails: z.array(z.string().email()).min(1),
    }).parse(req.body);

    // Verify ownership
    const config = await prisma.reportConfig.findFirst({
      where: { id, userId: req.userId },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report config not found' },
      });
    }

    // Add recipients (ignore duplicates)
    const recipients = await Promise.all(
      emails.map(email =>
        prisma.reportRecipient.upsert({
          where: {
            reportConfigId_email: {
              reportConfigId: id,
              email: email.toLowerCase(),
            },
          },
          create: {
            reportConfigId: id,
            email: email.toLowerCase(),
          },
          update: {
            status: 'active',
            unsubscribedAt: null,
          },
        })
      )
    );

    console.log(`✅ Added ${recipients.length} recipients to config ${id}`);

    res.json({
      success: true,
      data: recipients,
    });
  } catch (error) {
    console.error('Add recipients error:', error);

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
        code: 'ADD_RECIPIENTS_ERROR',
        message: 'Failed to add recipients',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * DELETE /api/report-configs/:id/recipients/:recipientId
 * Remove a recipient from a report config
 */
router.delete('/:id/recipients/:recipientId', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { id, recipientId } = req.params;

    // Verify ownership
    const config = await prisma.reportConfig.findFirst({
      where: { id, userId: req.userId },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report config not found' },
      });
    }

    await prisma.reportRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'unsubscribed',
        unsubscribedAt: new Date(),
      },
    });

    console.log(`✅ Removed recipient ${recipientId} from config ${id}`);

    res.json({
      success: true,
      message: 'Recipient removed',
    });
  } catch (error) {
    console.error('Remove recipient error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'REMOVE_RECIPIENT_ERROR',
        message: 'Failed to remove recipient',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * POST /api/report-configs/:id/generate
 * Manually trigger report generation for a config
 */
router.post('/:id/generate', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { id } = req.params;

    // Verify ownership
    const config = await prisma.reportConfig.findFirst({
      where: { id, userId: req.userId, status: 'active' },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report config not found or inactive' },
      });
    }

    // Check if there's already a report being generated for this config
    const existingGenerating = await prisma.generatedReport.findFirst({
      where: {
        reportConfigId: id,
        status: 'generating',
      },
    });

    if (existingGenerating) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_GENERATING',
          message: 'A report is already being generated for this stream',
          reportId: existingGenerating.id,
        },
      });
    }

    // Create the report record immediately with 'generating' status
    const report = await prisma.generatedReport.create({
      data: {
        reportConfigId: id,
        userId: req.userId,
        status: 'generating',
        generationStartedAt: new Date(),
      },
    });

    // Queue the report generation job
    const { addReportJob } = await import('../services/jobQueue.js');

    const params = config.searchParameters as any;
    const job = await addReportJob({
      companyName: params.companyName || 'Unknown',
      companyDomain: params.companyDomain || '',
      industry: params.industry,
      competitors: params.competitors,
      reportType: config.reportType,
      dateRange: parseInt(params.dateRange) || 7,
      userId: req.userId,
      reportConfigId: config.id,
      generatedReportId: report.id, // Pass the report ID to the job
      isPublic: false,
    });

    console.log(`✅ Queued generation for config ${config.id} - Job ${job.id} - Report ${report.id}`);

    res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        reportId: report.id,
        status: 'generating',
        message: 'Report generation started',
      },
    });
  } catch (error) {
    console.error('Generate report error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'GENERATION_ERROR',
        message: 'Failed to queue report generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export default router;
