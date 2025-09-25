import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Health check endpoint
  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      description: 'API health check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'error'] },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string' },
            uptime: { type: 'number' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'string', enum: ['ok', 'error'] },
                redis: { type: 'string', enum: ['ok', 'error'] }
              }
            }
          }
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'error'] },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string' },
            uptime: { type: 'number' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'string', enum: ['ok', 'error'] },
                redis: { type: 'string', enum: ['ok', 'error'] }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const startTime = Date.now()
    
    // Check database connectivity
    let databaseStatus = 'ok'
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (error) {
      databaseStatus = 'error'
      fastify.log.error({ error }, 'Database health check failed:')
    }
    
    // Check Redis connectivity
    let redisStatus = 'ok'
    if (redis) {
      try {
        await redis.ping()
      } catch (error) {
        redisStatus = 'error'
        fastify.log.error({ error }, 'Redis health check failed:')
      }
    } else {
      redisStatus = 'not_configured'
    }
    
    const overallStatus = databaseStatus === 'ok' && 
                         (redisStatus === 'ok' || redisStatus === 'not_configured') 
                         ? 'ok' : 'error'
    
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      checks: {
        database: databaseStatus,
        redis: redisStatus
      },
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    }
    
    const statusCode = overallStatus === 'ok' ? 200 : 503
    reply.code(statusCode)
    return response
  })

  // Readiness probe (Kubernetes)
  fastify.get('/ready', {
    schema: {
      tags: ['Health'],
      description: 'Readiness probe for Kubernetes',
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' }
          }
        },
        503: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Check critical dependencies
      await prisma.$queryRaw`SELECT 1`
      
      return reply.send({ ready: true })
    } catch (error) {
      fastify.log.error({ error }, 'Readiness check failed:')
      reply.code(503)
      return { ready: false }
    }
  })

  // Liveness probe (Kubernetes)
  fastify.get('/live', {
    schema: {
      tags: ['Health'],
      description: 'Liveness probe for Kubernetes',
      response: {
        200: {
          type: 'object',
          properties: {
            alive: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    // Simple liveness check - if we can respond, we're alive
    return reply.send({ alive: true })
  })

  // Metrics endpoint (basic)
  fastify.get('/metrics', {
    schema: {
      tags: ['Health'],
      description: 'Basic application metrics',
      response: {
        200: {
          type: 'object',
          properties: {
            uptime: { type: 'number' },
            memory: { type: 'object' },
            cpu: { type: 'object' },
            requests: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    return reply.send({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    })
  })
}

export { healthRoutes }
