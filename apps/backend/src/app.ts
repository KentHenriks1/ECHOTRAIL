/**
 * EchoTrail Backend Application
 * Express app configuration with middleware and routes
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import compression from 'compression';
import session from 'express-session';
import { PrismaClient } from '@prisma/client';
import { env } from './utils/env-validator';
import { logger } from './utils/logger';
import { passport } from './middleware/microsoftAuth';

// Import routes
import authRoutes from './routes/auth';
import microsoftRoutes from './routes/microsoft';
import userRoutes from './routes/users';
import storyRoutes from './routes/stories';
import trailRoutes from './routes/trails';
import sharedRoutes from './routes/shared';

const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
const corsOptions = {
  origin: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-API-Version',
  ],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000),
    });
  },
});

app.use(limiter);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ 
  limit: `${env.MAX_FILE_SIZE}b`,
  strict: true,
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: `${env.MAX_FILE_SIZE}b`,
}));

// Session middleware (required for Passport)
app.use(session({
  secret: env.JWT_SECRET, // Use JWT secret as session secret
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === 'production', // HTTPS only in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : 
                    res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel]('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  });
  
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    });
  }
});

// API routes
const API_PREFIX = `/api/${env.API_VERSION}`;

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/auth/microsoft`, microsoftRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/stories`, storyRoutes);
app.use(`${API_PREFIX}/trails`, trailRoutes);
app.use(`${API_PREFIX}/shared`, sharedRoutes);

// API documentation endpoint
app.get(`${API_PREFIX}`, (req: Request, res: Response) => {
  res.json({
    name: 'EchoTrail Backend API',
    version: env.API_VERSION,
    description: 'Backend API for EchoTrail application',
    endpoints: {
      health: '/health',
      auth: `${API_PREFIX}/auth`,
      'microsoft-auth': `${API_PREFIX}/auth/microsoft`,
      users: `${API_PREFIX}/users`,
      stories: `${API_PREFIX}/stories`,
      trails: `${API_PREFIX}/trails`,
      shared: `${API_PREFIX}/shared`,
    },
    microsoft: {
      login: `${API_PREFIX}/auth/microsoft/login?app=echotrail|zentric`,
      callback: `${API_PREFIX}/auth/microsoft/callback`,
      me: `${API_PREFIX}/auth/microsoft/me`,
      logout: `${API_PREFIX}/auth/microsoft/logout`,
    },
    documentation: 'https://github.com/echotrail/backend/docs',
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });
  
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });
  
  // Don't expose error details in production
  const isDevelopment = env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Internal server error',
    ...(isDevelopment && { 
      message: error.message,
      stack: error.stack,
    }),
    timestamp: new Date().toISOString(),
  });
});

export default app;