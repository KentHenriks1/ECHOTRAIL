/**
 * Microsoft Azure AD Authentication Middleware
 * Handles OAuth flow for both EchoTrail and Zentric applications
 */

import passport from 'passport';
import { OIDCStrategy, IProfile, VerifyCallback } from 'passport-azure-ad';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';
import { env } from '../utils/env-validator';
import { createError } from './errorHandler';

const prisma = new PrismaClient();
const logger = new Logger('MicrosoftAuth');

/**
 * Microsoft Azure AD Strategy Configuration
 */
const microsoftStrategy = new OIDCStrategy(
  {
    identityMetadata: `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/v2.0/.well-known/openid_configuration`,
    clientID: env.MICROSOFT_CLIENT_ID!,
    clientSecret: env.MICROSOFT_CLIENT_SECRET!,
    responseType: 'code',
    responseMode: 'form_post',
    redirectUrl: env.MICROSOFT_REDIRECT_URI!,
    allowHttpForRedirectUrl: env.NODE_ENV === 'development',
    validateIssuer: false,
    passReqToCallback: true,
    scope: ['profile', 'email', 'openid'],
    loggingLevel: env.NODE_ENV === 'development' ? 'info' : 'error',
  },
  async (
    req: Request,
    iss: string,
    sub: string,
    profile: IProfile,
    accessToken: string,
    refreshToken: string,
    done: VerifyCallback
  ) => {
    try {
      logger.info('Microsoft OAuth callback received', {
        sub: profile.oid,
        email: profile.upn || profile.emails?.[0]?.value,
        name: profile.displayName,
        appContext: req.query.state || 'echotrail', // Default to EchoTrail
      });

      // Extract user information from Microsoft profile
      const microsoftId = profile.oid;
      const email = profile.upn || profile.emails?.[0]?.value;
      const name = profile.displayName || email || 'Microsoft User';
      const appContext = (req.query.state as string) || 'echotrail';

      if (!email || !microsoftId) {
        logger.error('Missing required fields from Microsoft profile', { profile });
        return done(new Error('Missing email or Microsoft ID from profile'), undefined);
      }

      // Check if user already exists with this Microsoft ID
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { microsoftId },
            { email }
          ]
        }
      });

      if (user) {
        // Update existing user with Microsoft ID if not set
        if (!user.microsoftId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { 
              microsoftId,
              lastLoginAt: new Date(),
              appContext,
            }
          });
        } else {
          // Just update last login and app context
          user = await prisma.user.update({
            where: { id: user.id },
            data: { 
              lastLoginAt: new Date(),
              appContext,
            }
          });
        }

        logger.info('Existing user logged in via Microsoft', {
          userId: user.id,
          email: user.email,
          appContext
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            name,
            microsoftId,
            provider: 'MICROSOFT',
            appContext,
            lastLoginAt: new Date(),
            // Set default preferences
            units: 'METRIC',
            language: 'EN',
            mapStyle: 'SATELLITE',
            privacyLevel: 'PUBLIC',
          }
        });

        logger.info('New user created via Microsoft OAuth', {
          userId: user.id,
          email,
          appContext
        });
      }

      return done(null, user);
    } catch (error) {
      logger.error('Error in Microsoft OAuth callback', {
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      return done(error, undefined);
    }
  }
);

// Configure Passport
passport.use('microsoft', microsoftStrategy);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Middleware to ensure Microsoft authentication is configured
 */
export const requireMicrosoftConfig = (req: Request, res: Response, next: NextFunction) => {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET || !env.MICROSOFT_TENANT_ID) {
    throw createError('Microsoft authentication not configured', 503, 'SERVICE_UNAVAILABLE');
  }
  next();
};

/**
 * Middleware to check if user is authenticated via Microsoft
 */
export const requireMicrosoftAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw createError('Microsoft authentication required', 401, 'AUTH_REQUIRED');
  }
  next();
};

/**
 * Middleware to validate app context
 */
export const validateAppContext = (allowedApps: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user?.appContext || !allowedApps.includes(user.appContext)) {
      throw createError(
        `Access denied. This endpoint is only available for: ${allowedApps.join(', ')}`,
        403,
        'APP_CONTEXT_DENIED'
      );
    }
    next();
  };
};

export { passport };
export default microsoftStrategy;