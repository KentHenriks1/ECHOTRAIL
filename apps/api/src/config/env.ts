import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  // Database
  DATABASE_URL: z.string().min(1),
  
  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Redis (optional for caching/sessions)
  REDIS_URL: z.string().optional(),
  
  // Security
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(900000), // 15 minutes
  
  // CORS
  CORS_ORIGIN: z.string().default('*'),
  
  // File uploads (for future avatar support)
  MAX_FILE_SIZE: z.coerce.number().default(5242880), // 5MB
  
  // External APIs (for future integrations)
  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  
  // Monitoring & Analytics
  SENTRY_DSN: z.string().url().optional(),
  
  // Feature flags
  ENABLE_SWAGGER: z.coerce.boolean().default(true),
  ENABLE_RATE_LIMITING: z.coerce.boolean().default(true),
})

export type Env = z.infer<typeof envSchema>

const parseResult = envSchema.safeParse(process.env)

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parseResult.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parseResult.data

// Validate critical settings
if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET.length < 64) {
    console.error('❌ JWT_SECRET must be at least 64 characters in production')
    process.exit(1)
  }
  
  if (env.CORS_ORIGIN === '*') {
    console.warn('⚠️  CORS_ORIGIN is set to "*" in production - consider restricting origins')
  }
}

// Log configuration in development
if (env.NODE_ENV === 'development') {
  console.log('🔧 Environment configuration:')
  console.log(`   NODE_ENV: ${env.NODE_ENV}`)
  console.log(`   PORT: ${env.PORT}`)
  console.log(`   LOG_LEVEL: ${env.LOG_LEVEL}`)
  console.log(`   DATABASE_URL: ${env.DATABASE_URL.replace(/:[^:@]*@/, ':***@')}`)
  console.log(`   JWT_SECRET: ${env.JWT_SECRET.substring(0, 8)}...`)
  console.log(`   ENABLE_SWAGGER: ${env.ENABLE_SWAGGER}`)
  console.log(`   ENABLE_RATE_LIMITING: ${env.ENABLE_RATE_LIMITING}`)
}
