// Simple debug server to test API
require('dotenv').config();

console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('📊 PORT:', process.env.PORT);
console.log('🗄️  DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

try {
  const fastify = require('fastify')({ logger: true });

  // Simple health route
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Simple v1 health route
  fastify.get('/v1/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  const start = async () => {
    try {
      await fastify.listen({ port: 3000, host: '0.0.0.0' });
      console.log('🚀 Debug server running on http://localhost:3000');
      console.log('🏥 Health: http://localhost:3000/health');
      console.log('🏥 API Health: http://localhost:3000/v1/health');
    } catch (err) {
      console.error('❌ Failed to start debug server:', err);
      process.exit(1);
    }
  };

  start();
} catch (error) {
  console.error('❌ Debug server setup error:', error);
}