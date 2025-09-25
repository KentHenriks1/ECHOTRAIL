import fastify from 'fastify'

const server = fastify({
  logger: {
    level: 'info'
  }
})

server.get('/test', async () => {
  return { message: 'EchoTrail API is working!', timestamp: new Date().toISOString() }
})

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '127.0.0.1' })
    console.log('🚀 Test server running on http://localhost:3000')
    console.log('📍 Test endpoint: http://localhost:3000/test')
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
