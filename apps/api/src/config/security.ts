import crypto from 'crypto';
import { config } from './environment';

export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
  hashing: {
    algorithm: string;
    saltRounds: number;
    keyLength: number;
    iterations: number;
  };
  jwt: {
    algorithm: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  session: {
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: boolean | 'lax' | 'strict' | 'none';
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
}

export const securityConfig: SecurityConfig = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
  },
  hashing: {
    algorithm: 'pbkdf2',
    saltRounds: 12,
    keyLength: 64,
    iterations: 100000,
  },
  jwt: {
    algorithm: 'HS256',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },
  session: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
  },
};

/**
 * Encrypts data using AES-256-GCM
 */
export const encrypt = (text: string, key: string): { encrypted: string; iv: string; tag: string } => {
  const iv = crypto.randomBytes(securityConfig.encryption.ivLength);
  // Use proper key derivation from the key string
  const derivedKey = crypto.scryptSync(key, 'salt', securityConfig.encryption.keyLength);
  const cipher = crypto.createCipheriv(securityConfig.encryption.algorithm, derivedKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = (cipher as import('crypto').CipherGCM).getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
};

/**
 * Decrypts data using AES-256-GCM
 */
export const decrypt = (encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string => {
  const iv = Buffer.from(encryptedData.iv, 'hex');
  // Use proper key derivation from the key string (must match encrypt function)
  const derivedKey = crypto.scryptSync(key, 'salt', securityConfig.encryption.keyLength);
  const decipher = crypto.createDecipheriv(securityConfig.encryption.algorithm, derivedKey, iv);
  (decipher as import('crypto').DecipherGCM).setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Hashes a password using PBKDF2
 */
export const hashPassword = (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString('hex');
    
    crypto.pbkdf2(
      password,
      salt,
      securityConfig.hashing.iterations,
      securityConfig.hashing.keyLength,
      'sha512',
      (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      }
    );
  });
};

/**
 * Verifies a password against its hash
 */
export const verifyPassword = (password: string, hash: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    
    crypto.pbkdf2(
      password,
      salt,
      securityConfig.hashing.iterations,
      securityConfig.hashing.keyLength,
      'sha512',
      (err, derivedKey) => {
        if (err) reject(err);
        resolve(key === derivedKey.toString('hex'));
      }
    );
  });
};

/**
 * Generates a secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generates a cryptographically secure random UUID
 */
export const generateSecureUUID = (): string => {
  return crypto.randomUUID();
};

/**
 * Creates a hash of sensitive data for logging/debugging (one-way)
 */
export const createDataHash = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
};

/**
 * Sanitizes sensitive data for logging
 */
export const sanitizeForLogging = (obj: unknown): unknown => {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'auth',
    'credential',
  ];

  const sanitize = (item: unknown): unknown => {
    if (typeof item === 'string') {
      return item.length > 0 ? `${item.substring(0, 2)}***${item.substring(item.length - 2)}` : '***';
    }
    
    if (Array.isArray(item)) {
      return item.map(sanitize);
    }
    
    if (typeof item === 'object' && item !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(item)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = sanitize(value);
        }
      }
      return sanitized;
    }
    
    return item;
  };

  return sanitize(obj);
};

/**
 * Validates input against common attack patterns
 */
export const validateInput = (input: string): { isValid: boolean; threats: string[] } => {
  const threats: string[] = [];
  
  // SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /('|(\\')|(;)|(\\;))/,
    /(\b(OR|AND)\b.*=)/i,
    /(EXEC|EXECUTE)/i,
  ];
  
  // XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
  ];
  
  // Command injection patterns
  const commandPatterns = [
    /[;&|`$(){}[\]]/,
    /\b(rm|cat|ls|ps|kill|sudo|su)\b/i,
  ];

  sqlPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      threats.push('SQL_INJECTION');
    }
  });

  xssPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      threats.push('XSS');
    }
  });

  commandPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      threats.push('COMMAND_INJECTION');
    }
  });

  return {
    isValid: threats.length === 0,
    threats: [...new Set(threats)],
  };
};

/**
 * Time-safe string comparison to prevent timing attacks
 */
export const timeSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  
  return crypto.timingSafeEqual(bufferA, bufferB);
};

/**
 * Rate limiting key generator
 */
export const generateRateLimitKey = (req: { ip?: string; connection?: { remoteAddress?: string }; get?: (header: string) => string; user?: { id?: string } }): string => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.get?.('User-Agent') || '';
  const userId = req.user?.id || 'anonymous';
  
  // Create a composite key for more precise rate limiting
  return crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}:${userId}`)
    .digest('hex')
    .substring(0, 16);
};

/**
 * Generates CSP nonce for inline scripts
 */
export const generateCSPNonce = (): string => {
  return crypto.randomBytes(16).toString('base64');
};

/**
 * Security headers configuration
 */
export const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'no-referrer',
  'Feature-Policy': "geolocation 'self'; camera 'none'; microphone 'none'",
  'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${generateCSPNonce()}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;`,
});

/**
 * Session configuration
 */
export const getSessionConfig = () => ({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: securityConfig.session,
  name: 'echotrail_session',
});

/**
 * Audit log entry creation
 */
export const createAuditLog = (
  action: string,
  userId: string | null,
  resource: string,
  details: Record<string, unknown> = {},
  ip?: string
): Record<string, unknown> => {
  return {
    timestamp: new Date().toISOString(),
    action,
    userId,
    resource,
    details: sanitizeForLogging(details),
    ip,
    sessionId: createDataHash(`${userId}:${Date.now()}`),
  };
};
