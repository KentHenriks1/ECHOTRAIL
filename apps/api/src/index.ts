import { build } from './app'
import { env } from './config/env'

const server = build({
  logger: {
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === 'development' && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    })
  }
})

const start = async () => {
  try {
    await server.listen({ 
      port: env.PORT, 
      host: '0.0.0.0' // Listen on all interfaces for mobile access
    })
    
    server.log.info('🚀 EchoTrail API server started successfully')
    server.log.info(`📍 Server listening on http://localhost:${env.PORT}`)
    server.log.info(`📚 API Documentation available at http://localhost:${env.PORT}/docs`)
    server.log.info(`🏥 Health check available at http://localhost:${env.PORT}/v1/health`)
    
  } catch (err) {
    server.log.error({ err }, '❌ Failed to start server')
    process.exit(1)
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  server.log.info(`📋 Received ${signal}, starting graceful shutdown...`)
  
  try {
    await server.close()
    server.log.info('✅ Server closed successfully')
    process.exit(0)
  } catch (err) {
    server.log.error({ err }, '❌ Error during shutdown')
    process.exit(1)
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  server.log.error({ err }, '💥 Uncaught Exception')
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  server.log.error({ reason }, '💥 Unhandled Rejection')
  process.exit(1)
})

start()
