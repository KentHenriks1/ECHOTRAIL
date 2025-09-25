import { env } from './env';

// Re-export env as config for backward compatibility
export const config = {
  ...env,
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  sessionSecret: env.JWT_SECRET, // Using JWT_SECRET as session secret
  corsOrigin: env.CORS_ORIGIN,
  bcryptRounds: env.BCRYPT_ROUNDS,
  rateLimitMax: env.RATE_LIMIT_MAX,
  rateLimitWindow: env.RATE_LIMIT_WINDOW,
  maxFileSize: env.MAX_FILE_SIZE,
  mapboxAccessToken: env.MAPBOX_ACCESS_TOKEN,
  sentryDsn: env.SENTRY_DSN,
  enableSwagger: env.ENABLE_SWAGGER,
  enableRateLimiting: env.ENABLE_RATE_LIMITING,
  logLevel: env.LOG_LEVEL,
  // Additional properties for middleware compatibility
  apiKey: process.env.API_KEY || 'development-api-key',
  allowedOrigins: env.CORS_ORIGIN === '*' ? ['*'] : env.CORS_ORIGIN.split(','),
  healthCheckIPs: (process.env.HEALTH_CHECK_IPS || '').split(',').filter(Boolean),
  healthCheckKey: process.env.HEALTH_CHECK_KEY || 'development-health-key',
};

export type Config = typeof config;