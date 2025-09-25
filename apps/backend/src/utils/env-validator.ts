import Joi from 'joi';
import dotenv from 'dotenv';
import { logger } from './logger';

// Load environment variables
dotenv.config();

// Define the schema for environment variables
const envSchema = Joi.object({
  // Server Configuration
  PORT: Joi.number().port().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_VERSION: Joi.string().default('v1'),

  // Database Configuration
  DATABASE_URL: Joi.string().uri().required()
    .messages({
      'any.required': 'DATABASE_URL is required for database connection',
      'string.uri': 'DATABASE_URL must be a valid URI',
    }),

  // Authentication & Security
  JWT_SECRET: Joi.string().min(32).required()
    .messages({
      'any.required': 'JWT_SECRET is required for token signing',
      'string.min': 'JWT_SECRET must be at least 32 characters long',
    }),
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  // External Services (Optional)
  OPENAI_API_KEY: Joi.string().optional(),
  NEON_REST_API_URL: Joi.string().uri().optional(),
  STACK_AUTH_PROJECT_ID: Joi.string().optional(),
  STACK_AUTH_JWKS_URL: Joi.string().uri().optional(),

  // Microsoft Azure AD Configuration
  MICROSOFT_CLIENT_ID: Joi.string().optional(),
  MICROSOFT_CLIENT_SECRET: Joi.string().optional(),
  MICROSOFT_TENANT_ID: Joi.string().optional(),
  MICROSOFT_REDIRECT_URI: Joi.string().uri().optional(),

  // Email Configuration (Optional)
  SMTP_HOST: Joi.string().hostname().allow('').optional(),
  SMTP_PORT: Joi.number().port().allow('').optional(),
  SMTP_USER: Joi.string().email().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  FROM_EMAIL: Joi.string().email().allow('').optional(),
  FROM_NAME: Joi.string().allow('').optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().default(100),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'trace')
    .default('info'),

  // CORS
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),

  // File Upload
  MAX_FILE_SIZE: Joi.number().positive().default(5242880), // 5MB

  // Redis (Optional for caching)
  REDIS_URL: Joi.string().uri().optional(),

}).unknown(true); // Allow unknown environment variables

interface ValidatedEnv {
  PORT: number;
  NODE_ENV: string;
  API_VERSION: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  OPENAI_API_KEY?: string;
  NEON_REST_API_URL?: string;
  STACK_AUTH_PROJECT_ID?: string;
  STACK_AUTH_JWKS_URL?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  MICROSOFT_TENANT_ID?: string;
  MICROSOFT_REDIRECT_URI?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  FROM_EMAIL?: string;
  FROM_NAME?: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  LOG_LEVEL: string;
  ALLOWED_ORIGINS: string;
  MAX_FILE_SIZE: number;
  REDIS_URL?: string;
}

export function validateEnvironment(): ValidatedEnv {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const errorMessages = error.details.map(detail => {
      return `${detail.path.join('.')}: ${detail.message}`;
    });

    logger.error('Environment validation failed:', {
      errors: errorMessages,
      received: Object.keys(process.env).filter(key => 
        key.startsWith('DATABASE_') || 
        key.startsWith('JWT_') || 
        key.startsWith('PORT') ||
        key.startsWith('NODE_ENV')
      ),
    });

    throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
  }

  // Log successful validation
  logger.info('Environment validation successful', {
    nodeEnv: value.NODE_ENV,
    port: value.PORT,
    apiVersion: value.API_VERSION,
    hasDatabase: !!value.DATABASE_URL,
    hasJwtSecret: !!value.JWT_SECRET,
    hasOpenAI: !!value.OPENAI_API_KEY,
    hasEmail: !!(value.SMTP_HOST && value.SMTP_USER),
    hasRedis: !!value.REDIS_URL,
  });

  return value as ValidatedEnv;
}

export function checkRequiredServices(): void {
  const env = validateEnvironment();
  const issues: string[] = [];

  // Check database connection format
  if (!env.DATABASE_URL.includes('postgresql://') && !env.DATABASE_URL.includes('postgres://')) {
    issues.push('DATABASE_URL should be a PostgreSQL connection string');
  }

  // Check JWT secret strength (basic check)
  if (env.JWT_SECRET.length < 64) {
    issues.push('JWT_SECRET should be at least 64 characters for production security');
  }

  // Check production-specific requirements
  if (env.NODE_ENV === 'production') {
    if (!env.OPENAI_API_KEY) {
      issues.push('OPENAI_API_KEY is required in production for story generation');
    }

    if (!env.SMTP_HOST || !env.SMTP_USER) {
      issues.push('Email configuration (SMTP_HOST, SMTP_USER) is required in production');
    }

    if (env.ALLOWED_ORIGINS === 'http://localhost:3000') {
      issues.push('ALLOWED_ORIGINS should be configured for production domains');
    }
  }

  if (issues.length > 0) {
    logger.warn('Service configuration issues detected:', { issues });
    
    if (env.NODE_ENV === 'production') {
      throw new Error(`Production configuration issues:\n${issues.join('\n')}`);
    }
  }
}

export function getConfigSummary(): Record<string, any> {
  const env = validateEnvironment();
  
  return {
    server: {
      port: env.PORT,
      environment: env.NODE_ENV,
      apiVersion: env.API_VERSION,
    },
    database: {
      connected: !!env.DATABASE_URL,
      url: env.DATABASE_URL.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1***$2'), // Mask password
    },
    security: {
      jwtConfigured: !!env.JWT_SECRET,
      jwtExpiry: env.JWT_EXPIRES_IN,
    },
    services: {
      openAI: !!env.OPENAI_API_KEY,
      email: !!(env.SMTP_HOST && env.SMTP_USER),
      redis: !!env.REDIS_URL,
    },
    limits: {
      rateLimitWindow: env.RATE_LIMIT_WINDOW_MS,
      rateLimitMax: env.RATE_LIMIT_MAX_REQUESTS,
      maxFileSize: env.MAX_FILE_SIZE,
    },
    cors: {
      allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(s => s.trim()),
    },
  };
}

// Export validated environment for use throughout the application
export const env = validateEnvironment();