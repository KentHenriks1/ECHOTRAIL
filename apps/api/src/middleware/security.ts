import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import { config } from '../config/environment';

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.echotrail.app"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
});

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    error: 'Upload limit exceeded, please try again later.',
  },
});

// Input validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Common validation chains
export const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Valid email is required');

export const validatePassword = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be between 8 and 128 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character');

export const validateTrailName = body('name')
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('Trail name must be between 1 and 100 characters')
  .matches(/^[a-zA-Z0-9\s\-_.]+$/)
  .withMessage('Trail name contains invalid characters');

// JWT authentication middleware
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, config.jwtSecret, (err: VerifyErrors | null, user: JwtPayload | string | undefined) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = typeof user === 'object' && user ? user as { id: string; email: string; role: string } : undefined;
    next();
  });
};

// API key authentication middleware
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // In production, validate against database or secure storage
  if (apiKey !== config.apiKey) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};

// CORS configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = config.allowedOrigins;
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Client-Version',
  ],
};

// SQL injection prevention
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Basic SQL injection pattern detection
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /('|(\\')|(;)|(\\;)|(\\'))/,
    /(\b(OR|AND)\b.*=)/i,
  ];

  const checkForSQLInjection = (obj: unknown): boolean => {
    if (typeof obj === 'string') {
      return sqlPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (checkForSQLInjection((obj as Record<string, unknown>)[key])) {
          return true;
        }
      }
    }
    
    return false;
  };

  if (checkForSQLInjection(req.body) || checkForSQLInjection(req.query) || checkForSQLInjection(req.params)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }

  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: userAgent.substring(0, 200), // Truncate long user agents
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(logData));
  });

  next();
};

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Don't leak error details in production
  if (config.nodeEnv === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      stack: err.stack,
    });
  }
};

// Health check endpoint security
export const healthCheckSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Only allow health checks from specific IPs or with API key
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
  const allowedHealthCheckIPs = ['127.0.0.1', '::1', ...config.healthCheckIPs];

  if (allowedHealthCheckIPs.includes(clientIp) || req.headers['x-health-check-key'] === config.healthCheckKey) {
    next();
  } else {
    res.status(403).json({ error: 'Health check access denied' });
  }
};
