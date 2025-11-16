import { Router } from 'express';
import { z } from 'zod';
import { generateReport } from '../services/reportGeneration.js';
import type { ReportType } from '@clippingai/database';

const router = Router();

const generateReportSchema = z.object({
  companyName: z.string().min(1),
  companyDomain: z.string().min(1),
  industry: z.string().optional(),
  competitors: z.array(z.string()).optional(),
  reportType: z.enum(['competitor_landscape', 'market_landscape', 'media_monitoring']),
  dateRange: z.number().min(1).max(30).optional(),
});

/**
 * POST /api/reports/generate
 * Generate a new intelligence report
 */
router.post('/generate', async (req, res) => {
  try {
    const input = generateReportSchema.parse(req.body);

    console.log(`\n📊 Generating ${input.reportType} report for ${input.companyName}...`);

    const report = await generateReport({
      ...input,
      reportType: input.reportType as ReportType,
    });

    res.json({
      success: true,
      data: report,
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

export default router;
