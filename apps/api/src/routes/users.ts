import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { RedisUtils } from '../lib/redis'

// Validation schemas
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  avatar: z.string().url().optional(),
  preferences: z.object({
    units: z.enum(['metric', 'imperial']).optional(),
    language: z.enum(['en', 'nb']).optional(),
    mapStyle: z.string().optional(),
    privacyLevel: z.enum(['public', 'friends', 'private']).optional(),
  }).optional(),
})

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Get current user profile
  fastify.get('/users/me', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Users'],
      description: 'Get current user profile',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string', nullable: true },
                role: { type: 'string' },
                preferences: { type: 'object' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const cacheKey = `user:${request.userId}`
      
      // Try to get user from cache first
      let user = await RedisUtils.getCache(cacheKey)
      
      if (!user) {
        // Get user from database
        user = await prisma.user.findUnique({
          where: { id: request.userId },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            role: true,
            units: true,
            language: true,
            mapStyle: true,
            privacyLevel: true,
            createdAt: true,
            updatedAt: true
          }
        })

        if (!user) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found'
            }
          })
        }

        // Cache user data for 15 minutes
        await RedisUtils.setCache(cacheKey, user, 900)
      }

      return reply.send({
        success: true,
        user
      })

    } catch (error) {
      fastify.log.error({ error }, 'User profile error:')
      throw error
    }
  })

  // Update user profile
  fastify.put('/users/me', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Users'],
      description: 'Update current user profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          avatar: { type: 'string', format: 'uri' },
          preferences: {
            type: 'object',
            properties: {
              units: { type: 'string', enum: ['metric', 'imperial'] },
              language: { type: 'string', enum: ['en', 'nb'] },
              mapStyle: { type: 'string' },
              privacyLevel: { type: 'string', enum: ['public', 'friends', 'private'] }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string', nullable: true },
                role: { type: 'string' },
                preferences: { type: 'object' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const updateData = updateUserSchema.parse(request.body)

      // Transform preferences object to individual fields
      const { preferences, ...otherData } = updateData
      const updateFields = {
        ...otherData,
        ...(preferences && {
          units: preferences.units ? preferences.units.toUpperCase() as 'METRIC' | 'IMPERIAL' : undefined,
          language: preferences.language ? preferences.language.toUpperCase() as 'EN' | 'NB' : undefined,
          mapStyle: preferences.mapStyle,
          privacyLevel: preferences.privacyLevel ? preferences.privacyLevel.toUpperCase() as 'PUBLIC' | 'FRIENDS' | 'PRIVATE' : undefined
        })
      }

      // Update user in database
      const user = await prisma.user.update({
        where: { id: request.userId },
        data: updateFields,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          units: true,
          language: true,
          mapStyle: true,
          privacyLevel: true,
          createdAt: true,
          updatedAt: true
        }
      })

      // Invalidate cache
      const cacheKey = `user:${request.userId}`
      await RedisUtils.deleteCache(cacheKey)

      // Cache updated user data
      await RedisUtils.setCache(cacheKey, user, 900)

      fastify.log.info(`User profile updated: ${user.email}`)

      return reply.send({
        success: true,
        user
      })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors
          }
        })
      }

      fastify.log.error({ error }, 'Update profile error:')
      throw error
    }
  })

  // Delete user account
  fastify.delete('/users/me', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Users'],
      description: 'Delete current user account and all associated data',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Delete user and all associated data (cascading deletes handled by Prisma)
      await prisma.user.delete({
        where: { id: request.userId }
      })

      // Invalidate cache
      const cacheKey = `user:${request.userId}`
      await RedisUtils.deleteCache(cacheKey)

      fastify.log.info(`User account deleted: ${request.user?.email}`)

      return reply.send({
        success: true,
        message: 'Account deleted successfully'
      })

    } catch (error) {
      fastify.log.error({ error }, 'User stats error:')
      throw error
    }
  })

  // Get user statistics
  fastify.get('/users/me/stats', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Users'],
      description: 'Get user trail statistics',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            stats: {
              type: 'object',
              properties: {
                totalTrails: { type: 'number' },
                totalDistance: { type: 'number' },
                totalDuration: { type: 'number' },
                totalElevationGain: { type: 'number' },
                averageDistance: { type: 'number' },
                averageDuration: { type: 'number' },
                longestTrail: { type: 'number' },
                firstTrailDate: { type: 'string', format: 'date-time', nullable: true },
                lastTrailDate: { type: 'string', format: 'date-time', nullable: true }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const cacheKey = `user-stats:${request.userId}`
      
      // Try to get stats from cache first
      let stats = await RedisUtils.getCache(cacheKey)
      
      if (!stats) {
        // Calculate statistics from database
        const trails = await prisma.trail.findMany({
          where: { user_id: request.userId },
          select: {
            metadata: true,
            created_at: true
          }
        })

        const totalTrails = trails.length
        let totalDistance = 0
        let totalDuration = 0
        let totalElevationGain = 0
        let longestTrail = 0
        
        trails.forEach(trail => {
          const metadata = trail.metadata
          if ((metadata as any)?.distance) {
            totalDistance += (metadata as any).distance
            longestTrail = Math.max(longestTrail, (metadata as any).distance)
          }
          if ((metadata as any)?.duration) {
            totalDuration += (metadata as any).duration
          }
          if ((metadata as any)?.elevationGain) {
            totalElevationGain += (metadata as any).elevationGain
          }
        })

        stats = {
          totalTrails,
          totalDistance: Math.round(totalDistance),
          totalDuration: Math.round(totalDuration),
          totalElevationGain: Math.round(totalElevationGain),
          averageDistance: totalTrails > 0 ? Math.round(totalDistance / totalTrails) : 0,
          averageDuration: totalTrails > 0 ? Math.round(totalDuration / totalTrails) : 0,
          longestTrail: Math.round(longestTrail),
          firstTrailDate: trails.length > 0 ? trails[trails.length - 1].created_at : null,
          lastTrailDate: trails.length > 0 ? trails[0].created_at : null
        }

        // Cache stats for 5 minutes
        await RedisUtils.setCache(cacheKey, stats, 300)
      }

      return reply.send({
        success: true,
        stats
      })

    } catch (error) {
      fastify.log.error({ error }, 'Delete account error:')
      throw error
    }
  })
}

export { userRoutes }
