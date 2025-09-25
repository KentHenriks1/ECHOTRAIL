import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'

// Global type for Prisma Client singleton
declare global {
  var __prisma: PrismaClient | undefined
}

// Create Prisma Client instance with logging and error handling
export const prisma = globalThis.__prisma || new PrismaClient({
  log: env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
  
  errorFormat: 'pretty',
  
  datasources: {
    db: {
      url: env.DATABASE_URL
    }
  }
})

// Prevent multiple instances in development due to hot reload
if (env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// Note: Prisma event listeners removed due to type conflicts
// Consider using Prisma's built-in logging instead

// Graceful shutdown handling
process.on('beforeExit', async () => {
  console.log('🔄 Disconnecting Prisma Client...')
  await prisma.$disconnect()
})
