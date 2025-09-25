import { createClient } from 'redis'
import { env } from '../config/env'

let redis: ReturnType<typeof createClient> | null = null

// Only initialize Redis if URL is provided
if (env.REDIS_URL) {
  redis = createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: 60000,
    },
  })

  redis.on('error', (err) => {
    console.error('❌ Redis Client Error:', err)
  })

  redis.on('connect', () => {
    console.log('✅ Redis connected')
  })

  redis.on('ready', () => {
    console.log('✅ Redis ready')
  })

  redis.on('end', () => {
    console.log('🔄 Redis connection closed')
  })

  // Connect to Redis
  if (env.NODE_ENV !== 'test') {
    redis.connect().catch((err) => {
      console.error('❌ Failed to connect to Redis:', err)
      redis = null
    })
  }
} else {
  console.log('ℹ️ Redis not configured - caching and sessions will use in-memory fallback')
}

// Graceful shutdown
process.on('beforeExit', async () => {
  if (redis?.isOpen) {
    console.log('🔄 Disconnecting Redis...')
    await redis.quit()
  }
})

export { redis }

// Redis utility functions
export const RedisUtils = {
  // Cache with TTL
  async setCache(key: string, value: unknown, ttlSeconds = 3600) {
    if (!redis?.isOpen) return false
    
    try {
      await redis.setEx(key, ttlSeconds, JSON.stringify(value))
      return true
    } catch (error) {
      console.error('Redis setCache error:', error)
      return false
    }
  },

  // Get cached value
  async getCache<T = unknown>(key: string): Promise<T | null> {
    if (!redis?.isOpen) return null
    
    try {
      const value = await redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Redis getCache error:', error)
      return null
    }
  },

  // Delete cache key
  async deleteCache(key: string): Promise<boolean> {
    if (!redis?.isOpen) return false
    
    try {
      await redis.del(key)
      return true
    } catch (error) {
      console.error('Redis deleteCache error:', error)
      return false
    }
  },

  // Increment counter with TTL
  async incrementCounter(key: string, ttlSeconds = 3600): Promise<number> {
    if (!redis?.isOpen) return 0
    
    try {
      const count = await redis.incr(key)
      if (count === 1) {
        await redis.expire(key, ttlSeconds)
      }
      return count
    } catch (error) {
      console.error('Redis incrementCounter error:', error)
      return 0
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (!redis?.isOpen) return false
    
    try {
      const exists = await redis.exists(key)
      return exists === 1
    } catch (error) {
      console.error('Redis exists error:', error)
      return false
    }
  }
}
