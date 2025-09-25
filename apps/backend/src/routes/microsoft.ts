/**
 * Microsoft Azure AD Authentication Routes
 * Handles OAuth flow for EchoTrail and Zentric applications
 */

import express, { Request, Response, NextFunction } from 'express';
import { passport, requireMicrosoftConfig } from '../middleware/microsoftAuth';
import { Logger } from '../utils/logger';
import { env } from '../utils/env-validator';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { generateTokens, formatUserResponse } from './auth';

const router = express.Router();
const logger = new Logger('MicrosoftRoutes');

/**
 * GET /auth/microsoft/login
 * Initiate Microsoft OAuth login
 * Query parameters:
 * - app: 'echotrail' | 'zentric' (default: 'echotrail')
 */
router.get('/login', requireMicrosoftConfig, (req: Request, res: Response, next: NextFunction) => {
  const appContext = req.query.app as string || 'echotrail';
  
  // Validate app context
  if (!['echotrail', 'zentric'].includes(appContext)) {
    throw createError('Invalid app context. Must be "echotrail" or "zentric"', 400, 'INVALID_APP_CONTEXT');
  }

  logger.info('Microsoft OAuth login initiated', { appContext, ip: req.ip });

  // Pass app context as state parameter
  passport.authenticate('microsoft', {
    state: appContext,
    prompt: 'select_account', // Always show account selector
  })(req, res, next);
});

/**
 * POST /auth/microsoft/callback
 * Microsoft OAuth callback endpoint
 */
router.post('/callback', requireMicrosoftConfig, asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('microsoft', async (err: any, user: any, info: any) => {
    try {
      if (err) {
        logger.error('Microsoft OAuth authentication error', { 
          error: err.message,
          stack: err.stack 
        });
        
        // Redirect to frontend with error
        const errorRedirectUrl = getErrorRedirectUrl(req, 'authentication_failed');
        return res.redirect(errorRedirectUrl);
      }

      if (!user) {
        logger.warn('Microsoft OAuth authentication failed - no user returned', { info });
        
        const errorRedirectUrl = getErrorRedirectUrl(req, 'authentication_failed');
        return res.redirect(errorRedirectUrl);
      }

      // Generate JWT tokens for the authenticated user
      const tokens = generateTokens(user.id);

      // Store refresh token in database
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      logger.info('Microsoft OAuth authentication successful', {
        userId: user.id,
        email: user.email,
        appContext: user.appContext
      });

      // Determine success redirect URL based on app context
      const successRedirectUrl = getSuccessRedirectUrl(user.appContext, tokens);
      res.redirect(successRedirectUrl);

    } catch (error) {
      logger.error('Error in Microsoft OAuth callback processing', {
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      const errorRedirectUrl = getErrorRedirectUrl(req, 'callback_error');
      res.redirect(errorRedirectUrl);
    }
  })(req, res, next);
}));

/**
 * GET /auth/microsoft/me
 * Get current user info (for Microsoft authenticated users)
 */
router.get('/me', requireMicrosoftConfig, asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError('Authorization header required', 401, 'AUTH_REQUIRED');
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { verify } = await import('jsonwebtoken');
    const decoded = verify(token, env.JWT_SECRET) as any;
    
    if (decoded.type !== 'access') {
      throw createError('Invalid token type', 401, 'INVALID_TOKEN');
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Only return users who have Microsoft authentication
    if (!user.microsoftId) {
      throw createError('User not authenticated via Microsoft', 403, 'INVALID_PROVIDER');
    }

    res.json({
      success: true,
      data: {
        ...formatUserResponse(user),
        provider: 'microsoft',
        appContext: user.appContext,
        microsoftAuthenticated: true,
      },
    });
  } catch (error) {
    const { JsonWebTokenError } = await import('jsonwebtoken');
    if (error instanceof JsonWebTokenError) {
      throw createError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }
    throw error;
  }
}));

/**
 * POST /auth/microsoft/logout
 * Logout Microsoft authenticated user
 */
router.post('/logout', requireMicrosoftConfig, asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken || req.headers.authorization?.replace('Bearer ', '');
  
  if (refreshToken) {
    try {
      const { decode } = await import('jsonwebtoken');
      const decoded = decode(refreshToken) as any;
      
      if (decoded && decoded.userId) {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        // Remove refresh token from database
        await prisma.refreshToken.deleteMany({
          where: {
            userId: decoded.userId,
            token: refreshToken,
          },
        });
        
        logger.info('Microsoft user logged out successfully', { userId: decoded.userId });
      }
    } catch (error) {
      logger.warn('Invalid refresh token during Microsoft logout', { 
        error: (error as Error).message 
      });
    }
  }

  res.json({
    success: true,
    data: { 
      message: 'Logged out successfully from Microsoft authentication',
      provider: 'microsoft'
    },
  });
}));

/**
 * Helper function to determine success redirect URL
 */
function getSuccessRedirectUrl(appContext: string, tokens: any): string {
  const baseUrls = {
    echotrail: env.NODE_ENV === 'production' 
      ? 'https://app.echotrail.com' 
      : 'http://localhost:8081',
    zentric: env.NODE_ENV === 'production' 
      ? 'https://app.zentric.no' 
      : 'http://localhost:3000'
  };

  const baseUrl = baseUrls[appContext as keyof typeof baseUrls] || baseUrls.echotrail;
  
  // Create URL with tokens as query parameters
  const params = new URLSearchParams({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: tokens.expiresIn.toString(),
    provider: 'microsoft'
  });

  return `${baseUrl}/auth/success?${params.toString()}`;
}

/**
 * Helper function to determine error redirect URL
 */
function getErrorRedirectUrl(req: Request, errorType: string): string {
  // Try to determine app context from state or referrer
  const appContext = (req.body.state || req.query.state || 'echotrail') as string;
  
  const baseUrls = {
    echotrail: env.NODE_ENV === 'production' 
      ? 'https://app.echotrail.com' 
      : 'http://localhost:8081',
    zentric: env.NODE_ENV === 'production' 
      ? 'https://app.zentric.no' 
      : 'http://localhost:3000'
  };

  const baseUrl = baseUrls[appContext as keyof typeof baseUrls] || baseUrls.echotrail;
  
  return `${baseUrl}/auth/error?type=${errorType}&provider=microsoft`;
}

export default router;
export { generateTokens, formatUserResponse };