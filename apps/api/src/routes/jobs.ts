import { Router } from 'express';
import { z } from 'zod';
import { addReportJob, getJobStatus, cancelJob, getQueueStats } from '../services/jobQueue.js';
import type { ReportType } from '@clippingai/database';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const queueReportSchema = z.object({
  companyName: z.string().min(1),
  companyDomain: z.string().min(1),
  industry: z.string().optional(),
  competitors: z.array(z.string()).optional(),
  reportType: z.enum(['competitor_landscape', 'market_landscape', 'media_monitoring']),
  dateRange: z.number().min(1).max(30).optional(),
  userId: z.string().optional(),
  reportConfigId: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/jobs/queue-report
 * Queue a report generation job (async)
 */
router.post('/queue-report', async (req, res) => {
  try {
    const input = queueReportSchema.parse(req.body);

    const job = await addReportJob({
      ...input,
      reportType: input.reportType as ReportType,
    });

    res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued',
        message: 'Report generation queued',
      },
    });
  } catch (error) {
    console.error('Queue report error:', error);

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
        code: 'QUEUE_ERROR',
        message: 'Failed to queue report generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/jobs/:jobId
 * Get job status
 */
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const status = await getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Job not found',
        },
      });
    }

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Get job status error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * DELETE /api/jobs/:jobId
 * Cancel a job
 */
router.delete('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const cancelled = await cancelJob(jobId);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Job not found or already completed',
        },
      });
    }

    res.json({
      success: true,
      message: 'Job cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel job error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'CANCEL_ERROR',
        message: 'Failed to cancel job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

/**
 * GET /api/jobs/stats/queue
 * Get queue statistics
 */
router.get('/stats/queue', async (req, res) => {
  try {
    const stats = await getQueueStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get queue stats error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to get queue statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export default router;
