import { Router } from 'express';
import { z } from 'zod';
import {
  detectCompanyFromEmail,
  searchCompanyLogos,
  processManualCompanyInput,
} from '../services/companyDetection.js';

const router = Router();

// Validation schemas
const detectCompanySchema = z.object({
  email: z.string().email('Invalid email format'),
});

const manualCompanySchema = z.object({
  input: z.string().min(5, 'Please provide more information about your company'),
});

const logoSearchSchema = z.object({
  companyName: z.string(),
  domain: z.string(),
});

/**
 * POST /api/onboarding/detect-company
 * Detect company from email address
 */
router.post('/detect-company', async (req, res) => {
  try {
    const { email } = detectCompanySchema.parse(req.body);

    const companyInfo = await detectCompanyFromEmail(email);

    // If we found a logo, also fetch alternatives
    if (companyInfo.domain) {
      const logoOptions = await searchCompanyLogos(companyInfo.name, companyInfo.domain);
      companyInfo.logoOptions = logoOptions.map((url) => ({
        url,
        source: new URL(url).hostname,
      }));
    }

    res.json({
      success: true,
      data: companyInfo,
    });
  } catch (error) {
    console.error('Error detecting company:', error);

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
        code: 'DETECTION_ERROR',
        message: 'Failed to detect company information',
      },
    });
  }
});

/**
 * POST /api/onboarding/manual-company
 * Process manual company input
 */
router.post('/manual-company', async (req, res) => {
  try {
    const { input } = manualCompanySchema.parse(req.body);

    const companyInfo = await processManualCompanyInput(input);

    // Try to fetch logo options
    if (companyInfo.domain) {
      const logoOptions = await searchCompanyLogos(companyInfo.name, companyInfo.domain);
      companyInfo.logoOptions = logoOptions.map((url) => ({
        url,
        source: new URL(url).hostname,
      }));
    }

    res.json({
      success: true,
      data: companyInfo,
    });
  } catch (error) {
    console.error('Error processing manual company:', error);

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
        code: 'PROCESSING_ERROR',
        message: 'Failed to process company information',
      },
    });
  }
});

/**
 * POST /api/onboarding/search-logos
 * Search for alternative company logos
 */
router.post('/search-logos', async (req, res) => {
  try {
    const { companyName, domain } = logoSearchSchema.parse(req.body);

    const logoOptions = await searchCompanyLogos(companyName, domain);

    res.json({
      success: true,
      data: {
        logos: logoOptions.map((url) => ({
          url,
          source: new URL(url).hostname,
        })),
      },
    });
  } catch (error) {
    console.error('Error searching logos:', error);

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
        code: 'SEARCH_ERROR',
        message: 'Failed to search for logos',
      },
    });
  }
});

export default router;
