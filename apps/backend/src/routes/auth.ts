/**
 * Authentication Routes
 * Handles login, register, logout, and token refresh
 */

import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { sign, verify, decode, JwtPayload, SignOptions, JsonWebTokenError } from 'jsonwebtoken';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';
import { env } from '../utils/env-validator';
import { createError, asyncHandler } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();
const logger = new Logger('AuthRoutes');

/**
 * Validation Schemas
 */
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

/**
 * JWT Helper Functions
 */
const generateTokens = (userId: string) => {
  const accessToken = (sign as any)(
    { userId, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  const refreshToken = sign(
    { userId, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: '7d' } // 7 days for refresh token
  );

  // Calculate expiry time in seconds
  const decoded = decode(accessToken) as { exp: number } | null;
  const expirationTime = decoded ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;

  return {
    accessToken,
    refreshToken,
    expiresIn: expirationTime,
  };
};

/**
 * Format user response (remove sensitive data)
 */
const formatUserResponse = (user: any) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatar: user.avatar,
  role: user.role.toLowerCase(),
  preferences: {
    units: user.units.toLowerCase(),
    language: user.language.toLowerCase(),
    mapStyle: user.mapStyle,
    privacyLevel: user.privacyLevel.toLowerCase(),
  },
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  logger.info('User registration attempt', { email: req.body.email });

  // Validate request body
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw createError('Validation failed', 400, 'VALIDATION_ERROR', {
      fields: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  const { email, password, name } = value;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw createError('User already exists with this email', 409, 'USER_EXISTS');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password_hash: hashedPassword,
      name,
    },
  });

  // Generate tokens
  const tokens = generateTokens(user.id);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  logger.info('User registered successfully', { userId: user.id, email });

  res.status(201).json({
    success: true,
    data: {
      success: true,
      user: formatUserResponse(user),
      tokens,
    },
  });
}));

/**
 * POST /auth/login
 * Login user
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  logger.info('User login attempt', { email: req.body.email });

  // Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw createError('Validation failed', 400, 'VALIDATION_ERROR', {
      fields: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  const { email, password } = value;

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Verify password
  if (!user.password_hash) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const tokens = generateTokens(user.id);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  logger.info('User logged in successfully', { userId: user.id, email });

  res.json({
    success: true,
    data: {
      success: true,
      user: formatUserResponse(user),
      tokens,
    },
  });
}));

/**
 * POST /auth/logout
 * Logout user (invalidate refresh token)
 */
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken || req.headers.authorization?.replace('Bearer ', '');
  
  if (refreshToken) {
    try {
      // Decode token to get user ID
      const decoded = decode(refreshToken) as any;
      if (decoded && decoded.userId) {
        // Remove refresh token from database
        await prisma.refreshToken.deleteMany({
          where: {
            userId: decoded.userId,
            token: refreshToken,
          },
        });
        
        logger.info('User logged out successfully', { userId: decoded.userId });
      }
    } catch (error) {
      // Token might be invalid, but we still consider logout successful
      logger.warn('Invalid refresh token during logout', { error: (error as Error).message });
    }
  }

  res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
}));

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Token refresh attempt');

  // Validate request body
  const { error, value } = refreshSchema.validate(req.body);
  if (error) {
    throw createError('Validation failed', 400, 'VALIDATION_ERROR', {
      fields: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  const { refreshToken } = value;

  try {
    // Verify refresh token
    const decoded = verify(refreshToken, env.JWT_SECRET) as any;
    
    if (decoded.type !== 'refresh') {
      throw createError('Invalid token type', 401, 'INVALID_TOKEN');
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        userId: decoded.userId,
        token: refreshToken,
        expiresAt: { gte: new Date() },
      },
    });

    if (!storedToken) {
      throw createError('Refresh token not found or expired', 401, 'TOKEN_EXPIRED');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Generate new tokens
    const newTokens = generateTokens(user.id);

    // Remove old refresh token and store new one
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newTokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    logger.info('Token refreshed successfully', { userId: user.id });

    res.json({
      success: true,
      data: {
        success: true,
        user: formatUserResponse(user),
        tokens: newTokens,
      },
    });
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      throw createError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }
    throw error;
  }
}));

/**
 * GET /auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError('Authorization header required', 401, 'AUTH_REQUIRED');
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = verify(token, env.JWT_SECRET) as any;
    
    if (decoded.type !== 'access') {
      throw createError('Invalid token type', 401, 'INVALID_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: formatUserResponse(user),
    });
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      throw createError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }
    throw error;
  }
}));

export { generateTokens, formatUserResponse };
export default router;
