/**
 * EchoTrail Backend Server
 * Production-ready API server with comprehensive middleware
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './utils/env-validator';
import 'express-async-errors';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import trailRoutes from './routes/trails';
import storyRoutes from './routes/stories';
import sharedRoutes from './routes/shared';

const app = express();

/**
 * Security Middleware
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

/**
 * CORS Configuration
 */
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some((allowedOrigin: string) => {
      if (allowedOrigin.includes('*')) {
        // Convert wildcard pattern to regex
        const regex = new RegExp(allowedOrigin.replace(/\\*/g, '.*'));
        return regex.test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    logger.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('CORS: Origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-App-Version',
    'X-Platform'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

/**
 * Rate Limiting
 */
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/';
  },
});

app.use(limiter);

/**
 * General Middleware
 */
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Request Logging
 */
app.use(requestLogger);

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: env.NODE_ENV,
      uptime: process.uptime(),
    },
  });
});

/**
 * Root Endpoint
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'EchoTrail API',
      version: '1.0.0',
      description: 'AI-powered location storytelling API',
      documentation: '/api/v1/docs',
      health: '/health',
    },
  });
});

/**
 * API Routes
 */
const apiRouter = express.Router();

// Mount all route modules
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/trails', trailRoutes);
apiRouter.use('/stories', storyRoutes);
apiRouter.use('/shared', sharedRoutes);

// Mount API router with versioning
app.use(`/${env.API_VERSION}`, apiRouter);

/**
 * 404 Handler
 */
app.use('*', (req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
});

/**
 * Global Error Handler
 */
app.use(errorHandler);

/**
 * Graceful Shutdown Handler
 */
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Start Server
 */
const server = app.listen(env.PORT, () => {
  logger.info(`EchoTrail API Server started`, {
    port: env.PORT,
    environment: env.NODE_ENV,
    version: '1.0.0',
    cors: env.ALLOWED_ORIGINS,
  });
  
  logger.info(`Health check: http://localhost:${env.PORT}/health`);
  logger.info(`API endpoint: http://localhost:${env.PORT}/${env.API_VERSION}`);
});

export default app;