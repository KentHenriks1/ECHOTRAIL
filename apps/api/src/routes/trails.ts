import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { RedisUtils } from '../lib/redis'

// Validation schemas
const createTrailSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(1000).optional(),
  is_public: z.boolean().default(false),
})

const updateTrailSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(1000).optional(),
  is_public: z.boolean().optional(),
})

const addTrackPointsSchema = z.object({
  track_points: z.array(z.object({
    coordinate: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
    timestamp: z.string().datetime(),
    accuracy: z.number().optional(),
    altitude: z.number().optional(),
    speed: z.number().optional(),
    heading: z.number().optional(),
  })).min(1).max(1000), // Limit batch size
})

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

const trailRoutes: FastifyPluginAsync = async (fastify) => {
  // List user trails with pagination
  fastify.get('/trails', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Trails'],
      description: 'Get paginated list of user trails',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          sort: { type: 'string', enum: ['createdAt', 'updatedAt', 'name'], default: 'createdAt' },
          order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  is_public: { type: 'boolean' },
                  metadata: { type: 'object' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' }
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
      const { page, limit, sort, order } = querySchema.parse(request.query)

      // Get total count
      const total = await prisma.trail.count({
        where: { user_id: request.userId }
      })

      // Get paginated trails
      const trails = await prisma.trail.findMany({
        where: { user_id: request.userId },
        select: {
          id: true,
          name: true,
          description: true,
          is_public: true,
          metadata: true,
          created_at: true,
          updated_at: true
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      })

      const totalPages = Math.ceil(total / limit)

      return reply.send({
        success: true,
        data: trails,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors
          }
        })
      }

      fastify.log.error({ error }, 'Trail error:')
      throw error
    }
  })

  // Create new trail
  fastify.post('/trails', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Trails'],
      description: 'Create a new trail',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 1000 },
          is_public: { type: 'boolean', default: false }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            trail: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                user_id: { type: 'string' },
                is_public: { type: 'boolean' },
                metadata: { type: 'object' },
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
      const trailData = createTrailSchema.parse(request.body)

      if (!request.userId) {
        throw new Error('Authentication required')
      }

      const trail = await prisma.trail.create({
        data: {
          ...trailData,
          user_id: request.userId,
          metadata: {}
        }
      })

      // Invalidate user stats cache
      await RedisUtils.deleteCache(`user-stats:${request.userId}`)

      fastify.log.info(`New trail created: ${trail.name} by ${request.user?.email}`)

      return reply.code(201).send({
        success: true,
        trail
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

      fastify.log.error({ error }, 'Trail creation error:')
      throw error
    }
  })

  // Get trail by ID
  fastify.get('/trails/:trailId', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Trails'],
      description: 'Get trail by ID with track points',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['trailId'],
        properties: {
          trail_id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            trail: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                user_id: { type: 'string' },
                is_public: { type: 'boolean' },
                metadata: { type: 'object' },
                track_points: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      latitude: { type: 'number' },
                      longitude: { type: 'number' },
                      timestamp: { type: 'string', format: 'date-time' },
                      accuracy: { type: 'number', nullable: true },
                      altitude: { type: 'number', nullable: true },
                      speed: { type: 'number', nullable: true },
                      heading: { type: 'number', nullable: true }
                    }
                  }
                },
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
      const { trail_id: trailId } = request.params as { trail_id: string }

      const trail = await prisma.trail.findUnique({
        where: {
          id: trailId,
          user_id: request.userId // Ensure user owns the trail
        },
        include: {
          track_points: {
            orderBy: { timestamp: 'asc' }
          }
        }
      })

      if (!trail) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'TRAIL_NOT_FOUND',
            message: 'Trail not found'
          }
        })
      }

      return reply.send({
        success: true,
        trail
      })

    } catch (error) {
      fastify.log.error({ error }, 'Trail fetch error:')
      throw error
    }
  })

  // Update trail
  fastify.put('/trails/:trailId', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Trails'],
      description: 'Update trail information',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['trailId'],
        properties: {
          trail_id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 1000 },
          is_public: { type: 'boolean' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            trail: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                user_id: { type: 'string' },
                is_public: { type: 'boolean' },
                metadata: { type: 'object' },
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
      const { trail_id: trailId } = request.params as { trail_id: string }
      const updateData = updateTrailSchema.parse(request.body)

      const trail = await prisma.trail.updateMany({
        where: {
          id: trailId,
          user_id: request.userId // Ensure user owns the trail
        },
        data: updateData
      })

      if (trail.count === 0) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'TRAIL_NOT_FOUND',
            message: 'Trail not found'
          }
        })
      }

      const updatedTrail = await prisma.trail.findUnique({
        where: { id: trailId }
      })

      fastify.log.info(`Trail updated: ${updatedTrail?.name} by ${request.user?.email}`)

      return reply.send({
        success: true,
        trail: updatedTrail
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

      fastify.log.error({ error }, 'Trail update error:')
      throw error
    }
  })

  // Delete trail
  fastify.delete('/trails/:trailId', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Trails'],
      description: 'Delete trail and all associated data',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['trailId'],
        properties: {
          trail_id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
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
      const { trail_id: trailId } = request.params as { trail_id: string }

      const result = await prisma.trail.deleteMany({
        where: {
          id: trailId,
          user_id: request.userId // Ensure user owns the trail
        }
      })

      if (result.count === 0) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'TRAIL_NOT_FOUND',
            message: 'Trail not found'
          }
        })
      }

      // Invalidate user stats cache
      await RedisUtils.deleteCache(`user-stats:${request.userId}`)

      fastify.log.info(`Trail deleted: ${trailId} by ${request.user?.email}`)

      return reply.send({
        success: true,
        message: 'Trail deleted successfully'
      })

    } catch (error) {
      fastify.log.error({ error }, 'Trail deletion error:')
      throw error
    }
  })

  // Add track points to trail
  fastify.post('/trails/:trailId/track-points', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['TrackPoints'],
      description: 'Batch upload GPS track points for a trail',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['trailId'],
        properties: {
          trail_id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['trackPoints'],
        properties: {
          track_points: {
            type: 'array',
            minItems: 1,
            maxItems: 1000,
            items: {
              type: 'object',
              required: ['coordinate', 'timestamp'],
              properties: {
                coordinate: {
                  type: 'object',
                  required: ['latitude', 'longitude'],
                  properties: {
                    latitude: { type: 'number', minimum: -90, maximum: 90 },
                    longitude: { type: 'number', minimum: -180, maximum: 180 }
                  }
                },
                timestamp: { type: 'string', format: 'date-time' },
                accuracy: { type: 'number' },
                altitude: { type: 'number' },
                speed: { type: 'number' },
                heading: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { trail_id: trailId } = request.params as { trail_id: string }
      const { track_points: trackPoints } = addTrackPointsSchema.parse(request.body)

      // Verify trail exists and user owns it
      const trail = await prisma.trail.findUnique({
        where: {
          id: trailId,
          user_id: request.userId
        }
      })

      if (!trail) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'TRAIL_NOT_FOUND',
            message: 'Trail not found'
          }
        })
      }

      // Batch insert track points
      const trackPointsData = trackPoints.map(point => ({
        trail_id: trailId,
        latitude: point.coordinate.latitude,
        longitude: point.coordinate.longitude,
        timestamp: new Date(point.timestamp),
        accuracy: point.accuracy,
        altitude: point.altitude,
        speed: point.speed,
        heading: point.heading,
      }))

      await prisma.trackPoint.createMany({
        data: trackPointsData
      })

      // Calculate and update trail metadata
      const allTrackPoints = await prisma.trackPoint.findMany({
        where: { trail_id: trailId },
        orderBy: { timestamp: 'asc' }
      })

      // Calculate basic statistics
      const metadata = calculateTrailMetadata(allTrackPoints)

      // Update trail with new metadata
      await prisma.trail.update({
        where: { id: trailId },
        data: {
          metadata,
          updated_at: new Date()
        }
      })

      // Invalidate user stats cache
      await RedisUtils.deleteCache(`user-stats:${request.userId}`)

      fastify.log.info(`Added ${trackPoints.length} track points to trail ${trailId}`)

      return reply.code(201).send({
        success: true,
        message: `Added ${trackPoints.length} track points successfully`
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

      fastify.log.error({ error }, 'Track points error:')
      throw error
    }
  })
}

// Helper function to calculate trail metadata
function calculateTrailMetadata(track_points: { latitude: number; longitude: number; timestamp: string | Date; altitude?: number | null; speed?: number | null }[]) {
  if (track_points.length === 0) {
    return {
      distance: 0,
      duration: 0,
      avgSpeed: 0,
      maxSpeed: 0,
      elevationGain: 0,
      elevationLoss: 0
    }
  }

  let totalDistance = 0
  let elevationGain = 0
  let elevationLoss = 0
  let maxSpeed = 0

  // Calculate distance and elevation
  for (let i = 1; i < track_points.length; i++) {
    const prev = track_points[i - 1]
    const curr = track_points[i]

    // Calculate distance between points using Haversine formula
    const distance = calculateDistance(
      prev.latitude, prev.longitude,
      curr.latitude, curr.longitude
    )
    totalDistance += distance

    // Calculate elevation changes
    if (prev.altitude && curr.altitude) {
      const elevDiff = curr.altitude - prev.altitude
      if (elevDiff > 0) {
        elevationGain += elevDiff
      } else {
        elevationLoss += Math.abs(elevDiff)
      }
    }

    // Track max speed
    if (curr.speed && curr.speed > maxSpeed) {
      maxSpeed = curr.speed
    }
  }

  // Calculate duration
  const startTime = new Date(track_points[0].timestamp).getTime()
  const endTime = new Date(track_points[track_points.length - 1].timestamp).getTime()
  const duration = (endTime - startTime) / 1000 // seconds

  // Calculate average speed
  const avgSpeed = duration > 0 ? totalDistance / duration : 0

  return {
    distance: Math.round(totalDistance),
    duration: Math.round(duration),
    avgSpeed: Math.round(avgSpeed * 100) / 100,
    maxSpeed: Math.round(maxSpeed * 100) / 100,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss)
  }
}

// Haversine distance formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export { trailRoutes }
