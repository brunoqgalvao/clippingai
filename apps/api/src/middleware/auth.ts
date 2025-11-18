import type { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserById } from '../services/auth.js';

// ============================================================================
// TYPES
// ============================================================================

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        companyName: string | null;
        companyDomain: string | null;
        timezone: string;
        emailVerified: boolean;
        subscriptionTier: string;
        subscriptionStatus: string;
      };
      userId?: string;
    }
  }
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

/**
 * Middleware to require authentication
 * Verifies JWT token and attaches user to request
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authorization token provided',
        },
      });
    }

    // Extract token (format: "Bearer <token>")
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization header format',
        },
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
    }

    // Get user from database
    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
        },
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

/**
 * Optional auth middleware
 * Attaches user if token is valid, but doesn't require it
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      return next();
    }

    // Try to verify token
    try {
      const decoded = verifyToken(token);
      const user = await getUserById(decoded.userId);

      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    } catch (error) {
      // Ignore token errors for optional auth
      console.log('Optional auth: Invalid token, continuing without user');
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
}

/**
 * Middleware to check if user has verified email
 */
export function requireEmailVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification required',
      },
    });
  }

  next();
}

/**
 * Middleware to check subscription tier
 */
export function requireSubscription(tier: 'free' | 'pro' | 'enterprise') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const tierLevels: Record<string, number> = {
      free: 1,
      pro: 2,
      enterprise: 3,
    };

    const userLevel = tierLevels[req.user.subscriptionTier] || 0;
    const requiredLevel = tierLevels[tier] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_SUBSCRIPTION',
          message: `${tier} subscription required`,
        },
      });
    }

    next();
  };
}
