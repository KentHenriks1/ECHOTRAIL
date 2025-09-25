import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Simple health check without strict schemas
  fastify.get('/health', async (request, reply) => {
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
    return reply.code(statusCode).send(response)
  })

  // Simple readiness probe
  fastify.get('/ready', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return reply.send({ ready: true })
    } catch (error) {
      fastify.log.error({ error }, 'Readiness check failed:')
      return reply.code(503).send({ ready: false })
    }
  })

  // Simple liveness probe
  fastify.get('/live', async (request, reply) => {
    return reply.send({ alive: true })
  })

  // Simple metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
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
