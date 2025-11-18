import { Router } from 'express';
import { z } from 'zod';
import {
  signup,
  login,
  getUserById,
  updateUserProfile,
  changePassword,
  verifyEmail,
} from '../services/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  companyName: z.string().optional(),
  companyDomain: z.string().optional(),
  timezone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().optional(),
  companyName: z.string().optional(),
  companyDomain: z.string().optional(),
  timezone: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post('/signup', async (req, res) => {
  try {
    const input = signupSchema.parse(req.body);

    const result = await signup(input);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Signup error:', error);

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

    res.status(400).json({
      success: false,
      error: {
        code: 'SIGNUP_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create account',
      },
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate a user
 */
router.post('/login', async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);

    const result = await login(input);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Login error:', error);

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

    res.status(401).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to login',
      },
    });
  }
});

// ============================================================================
// PROTECTED ROUTES (require authentication)
// ============================================================================

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }

    const user = await getUserById(req.userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_ERROR',
        message: 'Failed to retrieve profile',
      },
    });
  }
});

/**
 * PATCH /api/auth/me
 * Update current user profile
 */
router.patch('/me', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }

    const updates = updateProfileSchema.parse(req.body);

    const user = await updateUserProfile(req.userId, updates);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);

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
        message: 'Failed to update profile',
      },
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }

    const input = changePasswordSchema.parse(req.body);

    await changePassword(req.userId, input.currentPassword, input.newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);

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

    res.status(400).json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to change password',
      },
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Mark user's email as verified
 */
router.post('/verify-email', requireAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }

    await verifyEmail(req.userId);

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Verify email error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: 'Failed to verify email',
      },
    });
  }
});

export default router;
