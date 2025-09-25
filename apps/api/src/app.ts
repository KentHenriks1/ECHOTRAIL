import fastify, { FastifyInstance, FastifyRequest, FastifyReply, FastifyServerOptions } from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import compress from '@fastify/compress'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import websocket from '@fastify/websocket'
import underPressure from '@fastify/under-pressure'
import fastifyCaching from '@fastify/caching'
import formbody from '@fastify/formbody'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'
import path from 'path'

import { env } from './config/env'
import { prisma } from './lib/prisma'
import { redis } from './lib/redis'

// Import route modules
import { healthRoutes } from './routes/health'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { trailRoutes } from './routes/trails'
import { shareRoutes } from './routes/sharing'
import { websocketRoutes } from './routes/websocket'
import { uploadRoutes } from './routes/uploads'

// Type extensions for Fastify
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string
      email: string
      role: string
    }
    user: {
      userId: string
      email: string
      role: string
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  
  interface FastifyRequest {
    userId?: string
  }
}

export function build(opts: FastifyServerOptions = {}): FastifyInstance {
  return buildApp(opts)
}

export function buildForVercel(opts: FastifyServerOptions = {}): FastifyInstance {
  // Simplified version for Vercel serverless
  const server = fastify({
    logger: false,
    disableRequestLogging: true,
    ...opts
  })

  // Essential plugins only for serverless
  server.register(sensible)
  server.register(compress, { global: true })
  server.register(formbody)
  
  // JWT authentication
  server.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  })

  // Authentication decorator
  server.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
      request.userId = request.user.userId
    } catch (_err) {
      reply.code(401).send({ 
        success: false,
        error: { 
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      })
    }
  })

  // Simplified error handler
  server.setErrorHandler(async (error, request, reply) => {
    const { statusCode = 500 } = error
    reply.code(statusCode).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
      }
    })
  })

  // Not found handler
  server.setNotFoundHandler(async (request, reply) => {
    reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`
      }
    })
  })

  // Register routes
  server.register(async function (fastify) {
    await fastify.register(healthRoutes)
    await fastify.register(authRoutes)
    await fastify.register(userRoutes)
    await fastify.register(trailRoutes)
    await fastify.register(shareRoutes)
  }, { prefix: '/v1' })

  return server
}

function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
  const server = fastify({
    logger: {
      transport: env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      } : undefined
    },
    ...opts
  })

  // Essential plugins first
  server.register(sensible)
  server.register(compress, { global: true })
  server.register(formbody)
  server.register(cookie, {
    secret: env.JWT_SECRET,
    parseOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict'
    }
  })

  // System monitoring and performance
  server.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 100000000,
    maxRssBytes: 100000000,
    maxEventLoopUtilization: 0.98,
    message: 'Under pressure!',
    retryAfter: 50,
    pressureHandler: (req, rep, type, value) => {
      if (type === 'eventLoopDelay') {
        server.log.error({ value }, 'Event loop delay too high')
      } else if (type === 'heapUsedBytes') {
        server.log.error({ value }, 'Heap usage too high')
      } else if (type === 'rssBytes') {
        server.log.error({ value }, 'RSS usage too high')
      }
      rep.send('Service temporarily unavailable')
    }
  })

  // Caching support
  server.register(fastifyCaching, {
    privacy: fastifyCaching.privacy.NOCACHE
  })

  // File upload support with limits
  server.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 5,
      headerPairs: 2000
    },
    attachFieldsToBody: 'keyValues'
  })

  // Static file serving for uploads
  server.register(staticFiles, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false
  })

  // WebSocket support for real-time features
  server.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
      verifyClient: (info, next) => {
        // Verify WebSocket connections here if needed
        next(true)
      }
    }
  })

  // Security plugins
  server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })

  server.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  })

  // Rate limiting
  if (env.ENABLE_RATE_LIMITING) {
    server.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW,
      // Skip Redis for now - use in-memory store
      // redis: redis || undefined,
    })
  }

  // JWT authentication
  server.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  })

  // Authentication decorator
  server.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
      
      // Get user from database to ensure they still exist
      const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        }
      })

      if (!user) {
        reply.code(401).send({ 
          success: false,
          error: { 
            code: 'UNAUTHORIZED',
            message: 'User not found'
          }
        })
        return
      }

      request.userId = user.id
    } catch (_err) {
      // JWT verification handles error details internally
      reply.code(401).send({ 
        success: false,
        error: { 
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      })
    }
  })

  // Swagger documentation
  if (env.ENABLE_SWAGGER) {
    server.register(swagger, {
      openapi: {
        openapi: '3.0.3',
        info: {
          title: 'EchoTrail API',
          description: 'RESTful API for EchoTrail - GPS trail tracking platform',
          version: '1.0.0',
        },
        servers: [
          {
            url: 'http://localhost:3000/v1',
            description: 'Development server'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            }
          }
        }
      }
    })

    server.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      }
    })
  }

  // Global error handler
  server.setErrorHandler(async (error, request, reply) => {
    const { statusCode = 500 } = error

    server.log.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    })

    // Don't leak error details in production
    const message = env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal Server Error'
      : error.message

    reply.code(statusCode).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message,
      }
    })
  })

  // Global not found handler
  server.setNotFoundHandler(async (request, reply) => {
    reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`
      }
    })
  })

  // Health check hook
  server.addHook('onReady', async () => {
    try {
      // Test database connection - TEMPORARILY DISABLED FOR TESTING
      // await prisma.$queryRaw`SELECT 1`
      // server.log.info('✅ Database connection established')
      server.log.info('⚠️ Database connection test disabled for testing')
      
      // Test Redis connection if available
      if (redis) {
        await redis.ping()
        server.log.info('✅ Redis connection established')
      } else {
        server.log.info('ℹ️ Redis not configured - using fallback')
      }
    } catch (err) {
      server.log.error({ err }, '❌ Failed to establish connections')
      throw err
    }
  })

  // Graceful shutdown hook
  server.addHook('onClose', async () => {
    server.log.info('🔄 Closing database connections...')
    await prisma.$disconnect()
    
    if (redis) {
      await redis.quit()
    }
    
    server.log.info('✅ All connections closed')
  })

  // Register WebSocket routes (no prefix needed)
  server.register(websocketRoutes, { prefix: '/ws' })

  // Register API routes with v1 prefix
  server.register(async function (fastify) {
    await fastify.register(healthRoutes)
    await fastify.register(authRoutes)
    await fastify.register(userRoutes)
    await fastify.register(trailRoutes)
    await fastify.register(shareRoutes)
    await fastify.register(uploadRoutes, { prefix: '/uploads' })
  }, { prefix: '/v1' })

  return server
}
