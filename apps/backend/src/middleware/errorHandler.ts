/**
 * Global Error Handler Middleware
 * Comprehensive error handling for EchoTrail API
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { Prisma } from '@prisma/client';

const logger = new Logger('ErrorHandler');

/**
 * Error types that we can handle specifically
 */
interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * API Error Response Interface
 */
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Handle Prisma errors
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  code: string;
  message: string;
  details?: any;
} => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint failed
      const field = error.meta?.target as string[] | undefined;
      return {
        statusCode: 409,
        code: 'DUPLICATE_ENTRY',
        message: `A record with this ${field?.join(', ') || 'value'} already exists`,
        details: { field, originalError: error.code },
      };

    case 'P2025':
      // Record not found
      return {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'The requested record was not found',
        details: { originalError: error.code },
      };

    case 'P2003':
      // Foreign key constraint failed
      return {
        statusCode: 400,
        code: 'INVALID_REFERENCE',
        message: 'Referenced record does not exist',
        details: { originalError: error.code },
      };

    case 'P2014':
      // Required relation missing
      return {
        statusCode: 400,
        code: 'MISSING_RELATION',
        message: 'Required relationship is missing',
        details: { originalError: error.code },
      };

    default:
      return {
        statusCode: 500,
        code: 'DATABASE_ERROR',
        message: 'An unexpected database error occurred',
        details: { originalError: error.code },
      };
  }
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error: Error): {
  statusCode: number;
  code: string;
  message: string;
} => {
  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired',
    };
  }

  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
    };
  }

  if (error.name === 'NotBeforeError') {
    return {
      statusCode: 401,
      code: 'TOKEN_NOT_ACTIVE',
      message: 'Authentication token is not active yet',
    };
  }

  return {
    statusCode: 401,
    code: 'AUTH_ERROR',
    message: 'Authentication failed',
  };
};

/**
 * Handle validation errors (from Joi or similar)
 */
const handleValidationError = (error: any): {
  statusCode: number;
  code: string;
  message: string;
  details: any;
} => {
  // Joi validation error
  if (error.isJoi) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: {
        fields: error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        })),
      },
    };
  }

  // Generic validation error
  return {
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message: error.message || 'Validation failed',
    details: error.details || {},
  };
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error | CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;
  
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // Handle specific error types
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error);
    statusCode = prismaError.statusCode;
    code = prismaError.code;
    message = prismaError.message;
    details = prismaError.details;
  } else if (error.name === 'ValidationError' || (error as any).isJoi) {
    const validationError = handleValidationError(error);
    statusCode = validationError.statusCode;
    code = validationError.code;
    message = validationError.message;
    details = validationError.details;
  } else if (error.name?.includes('JWT') || error.name?.includes('Token')) {
    const jwtError = handleJWTError(error);
    statusCode = jwtError.statusCode;
    code = jwtError.code;
    message = jwtError.message;
  } else if ((error as CustomError).statusCode) {
    // Custom error with status code
    statusCode = (error as CustomError).statusCode!;
    code = (error as CustomError).code || 'CUSTOM_ERROR';
    message = error.message;
    details = (error as CustomError).details;
  } else {
    // Generic error mapping
    switch (error.name) {
      case 'CastError':
        statusCode = 400;
        code = 'INVALID_ID';
        message = 'Invalid ID format';
        break;
        
      case 'MongoServerError':
        if ((error as any).code === 11000) {
          statusCode = 409;
          code = 'DUPLICATE_ENTRY';
          message = 'Duplicate entry detected';
        }
        break;
        
      case 'MulterError':
        statusCode = 400;
        code = 'FILE_UPLOAD_ERROR';
        message = 'File upload failed';
        details = { originalError: error.message };
        break;
        
      case 'SyntaxError':
        statusCode = 400;
        code = 'INVALID_JSON';
        message = 'Invalid JSON in request body';
        break;
    }
  }

  // Log the error
  const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  const logMessage = `${req.method} ${req.originalUrl} - ${statusCode} ${code}`;
  
  const logMeta = {
    statusCode,
    code,
    message,
    requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...(details && { details }),
    ...(statusCode >= 500 && { stack: error.stack }),
  };

  if (logLevel === 'error') {
    logger.error(logMessage, logMeta, error);
  } else if (logLevel === 'warn') {
    logger.warn(logMessage, logMeta);
  } else {
    logger.info(logMessage, logMeta);
  }

  // Prepare error response
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  };

  // Don't send stack trace in production
  if (process.env.NODE_ENV === 'development' && error.stack) {
    (errorResponse.error as any).stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Create custom error
 */
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): CustomError => {
  const error = new Error(message) as CustomError;
  error.statusCode = statusCode;
  error.code = code || 'CUSTOM_ERROR';
  error.details = details;
  return error;
};

/**
 * Async wrapper to catch promise rejections
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};