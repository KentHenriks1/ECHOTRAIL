#!/usr/bin/env node

/**
 * EchoTrail Backend Server
 * Main server entry point
 */

import app from './app';
import { validateEnvironment, checkRequiredServices, getConfigSummary } from './utils/env-validator';
import { logger } from './utils/logger';

// Validate environment variables on startup
let env: ReturnType<typeof validateEnvironment>;
try {
  env = validateEnvironment();
  checkRequiredServices();
} catch (error) {
  console.error('❌ Environment validation failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}

const PORT = env.PORT || 3000;

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info('🚀 EchoTrail Backend Server Started', {
    port: PORT,
    environment: env.NODE_ENV,
    nodeVersion: process.version,
    pid: process.pid,
  });

  // Log configuration summary
  const configSummary = getConfigSummary();
  logger.info('📋 Server Configuration', configSummary);

  if (env.NODE_ENV === 'development') {
    console.log('\n🔗 Server URLs:');
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Network:  http://0.0.0.0:${PORT}`);
    console.log('\n📚 API Documentation:');
    console.log(`   Health:   http://localhost:${PORT}/health`);
    console.log(`   API:      http://localhost:${PORT}/api/${env.API_VERSION}`);
  }
});

export default server;