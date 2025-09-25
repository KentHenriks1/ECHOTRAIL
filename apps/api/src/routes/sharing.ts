import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { prisma } from '../lib/prisma'
import { RedisUtils } from '../lib/redis'
// import { env } from '../config/env' // Not currently used

// Validation schemas
const createShareLinkSchema = z.object({
  expires_at: z.string().datetime().optional(),
})

const shareRoutes: FastifyPluginAsync = async (fastify) => {
  // Create share link for trail
  fastify.post('/trails/:trailId/share', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Sharing'],
      description: 'Generate a shareable link for a trail',
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
          expires_at: {
            type: 'string',
            format: 'date-time',
            description: 'Optional expiration date for the share link'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            shareLink: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                token: { type: 'string' },
                shareUrl: { type: 'string', format: 'uri' },
                expires_at: { type: 'string', format: 'date-time', nullable: true },
                is_active: { type: 'boolean' },
                created_at: { type: 'string', format: 'date-time' }
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
      const body = createShareLinkSchema.parse(request.body || {})

      // Verify trail exists and user owns it
      const trail = await prisma.trail.findUnique({
        where: {
          id: trailId,
          user_id: request.userId
        }
      })

      if (!trail) {
        reply.code(404)
        return {
          success: false,
          error: {
            code: 'TRAIL_NOT_FOUND',
            message: 'Trail not found'
          }
        }
      }

      // Check if an active share link already exists for this trail
      const existingShare = await prisma.shareLink.findFirst({
        where: {
          trail_id: trailId,
          is_active: true,
          OR: [
            { expires_at: null },
            { expires_at: { gt: new Date() } }
          ]
        }
      })

      if (existingShare) {
        // Return existing share link
        const shareUrl = `${process.env.FRONTEND_URL || 'https://echotrail.app'}/shared/${existingShare.token}`
        
        return reply.send({
          success: true,
          shareLink: {
            ...existingShare,
            shareUrl
          }
        })
      }

      // Create new share link
      const token = nanoid(32) // URL-safe token
      const expiresAt = body.expires_at ? new Date(body.expires_at) : null

      if (!request.userId) {
        throw new Error('User ID is required')
      }

      const shareUrl = `${process.env.FRONTEND_URL || 'https://echotrail.app'}/shared/${token}`
      
      const shareLink = await prisma.shareLink.create({
        data: {
          trail_id: trailId,
          token,
          share_url: shareUrl,
          expires_at: expiresAt,
          is_active: true
        }
      })

      fastify.log.info(`Share link created for trail ${trailId}`)

      reply.code(201)
      return {
        success: true,
        shareLink: {
          ...shareLink,
          shareUrl
        }
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400)
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors
          }
        }
      }

      fastify.log.error({ error }, 'Create share link error:')
      throw error
    }
  })

  // Get shared trail (public endpoint - no authentication required)
  fastify.get('/shared/:shareToken', {
    schema: {
      tags: ['Sharing'],
      description: 'Retrieve a trail using its share token (no authentication required)',
      params: {
        type: 'object',
        required: ['shareToken'],
        properties: {
          shareToken: { type: 'string' }
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
                      altitude: { type: 'number', nullable: true }
                    }
                  }
                },
                created_at: { type: 'string', format: 'date-time' },
                owner: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' }
                  }
                }
              }
            },
            shareInfo: {
              type: 'object',
              properties: {
                isExpired: { type: 'boolean' },
                expires_at: { type: 'string', format: 'date-time', nullable: true }
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
      const { shareToken } = request.params as { shareToken: string }

      // Try to get from cache first
      const cacheKey = `shared-trail:${shareToken}`
      const cachedTrail = await RedisUtils.getCache<{ trail: unknown; shareInfo: unknown }>(cacheKey)

      if (cachedTrail) {
        return reply.send({
          success: true,
          trail: cachedTrail.trail,
          shareInfo: cachedTrail.shareInfo
        })
      }

      // Find share link
      const shareLink = await prisma.shareLink.findUnique({
        where: { token: shareToken },
        include: {
          trails: {
            include: {
              track_points: {
                select: {
                  id: true,
                  latitude: true,
                  longitude: true,
                  timestamp: true,
                  elevation: true
                },
                orderBy: { timestamp: 'asc' }
              }
            }
          }
        }
      })

      if (!shareLink || !shareLink.is_active) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'SHARE_LINK_NOT_FOUND',
            message: 'Share link not found or has been deactivated'
          }
        })
      }

      // Check if expired
      const isExpired = shareLink.expires_at && shareLink.expires_at < new Date()
      
      if (isExpired) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'SHARE_LINK_EXPIRED',
            message: 'This share link has expired'
          }
        })
      }

      // Prepare response data (exclude sensitive information)
      const trailData = {
        id: shareLink.trails.id,
        name: shareLink.trails.name,
        description: shareLink.trails.description,
        metadata: shareLink.trails.metadata,
        track_points: shareLink.trails.track_points,
        created_at: shareLink.trails.created_at,
        owner: {
          name: 'Trail Owner' // User info not available in current schema
        }
      }

      const shareInfo = {
        isExpired: false,
        expires_at: shareLink.expires_at
      }

      // Cache the result for 5 minutes
      await RedisUtils.setCache(cacheKey, { trail: trailData, shareInfo }, 300)

      fastify.log.info(`Shared trail accessed: ${shareLink.trails.name} (${shareToken})`)

      return reply.send({
        success: true,
        trail: trailData,
        shareInfo
      })

    } catch (error) {
      fastify.log.error({ error }, 'Share trail error:')
      throw error
    }
  })

  // Get user's share links
  fastify.get('/users/me/share-links', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Sharing'],
      description: 'Get all share links created by the current user',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            share_links: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  token: { type: 'string' },
                  shareUrl: { type: 'string', format: 'uri' },
                  expires_at: { type: 'string', format: 'date-time', nullable: true },
                  is_active: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                  trail: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const shareLinks = await prisma.shareLink.findMany({
        include: {
          trails: {
            select: {
              id: true,
              name: true,
              user_id: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      })

      // Filter by current user's trails
      const userShareLinks = shareLinks.filter(link => 
        link.trails && link.trails.user_id === request.userId
      )

      // Add share URLs
      const shareLinksWithUrls = userShareLinks.map(link => ({
        ...link,
        trail: link.trails, // Keep trail structure for backward compatibility
        shareUrl: `${process.env.FRONTEND_URL || 'https://echotrail.app'}/shared/${link.token}`
      }))

      return reply.send({
        success: true,
        share_links: shareLinksWithUrls
      })

    } catch (error) {
      fastify.log.error({ error }, 'Share by token error:')
      throw error
    }
  })

  // Deactivate share link
  fastify.delete('/share-links/:shareId', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Sharing'],
      description: 'Deactivate a share link',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['shareId'],
        properties: {
          shareId: { type: 'string' }
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
      const { shareId } = request.params as { shareId: string }

      // First verify the user owns the trail associated with this share link
      const shareLink = await prisma.shareLink.findUnique({
        where: { id: shareId },
        include: {
          trails: {
            select: {
              user_id: true
            }
          }
        }
      })

      if (!shareLink || !shareLink.trails || shareLink.trails.user_id !== request.userId) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'SHARE_LINK_NOT_FOUND',
            message: 'Share link not found'
          }
        })
      }

      const result = await prisma.shareLink.update({
        where: { id: shareId },
        data: {
          is_active: false
        }
      })

      // Clear cached shared trail
      await RedisUtils.deleteCache(`shared-trail:${result.token}`)

      fastify.log.info(`Share link deactivated: ${shareId} by ${request.user?.email}`)

      return reply.send({
        success: true,
        message: 'Share link deactivated successfully'
      })

    } catch (error) {
      fastify.log.error({ error }, 'Share revoke error:')
      throw error
    }
  })

  // Update share link expiration
  fastify.put('/share-links/:shareId', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Sharing'],
      description: 'Update share link expiration',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['shareId'],
        properties: {
          shareId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          expires_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Set to null for no expiration'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { shareId } = request.params as { shareId: string }
      const { expiresAt } = request.body as { expiresAt?: string | null }

      // First verify the user owns the trail associated with this share link
      const existingShareLink = await prisma.shareLink.findUnique({
        where: { id: shareId },
        include: {
          trails: {
            select: {
              user_id: true
            }
          }
        }
      })

      if (!existingShareLink || !existingShareLink.trails || existingShareLink.trails.user_id !== request.userId) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'SHARE_LINK_NOT_FOUND',
            message: 'Share link not found'
          }
        })
      }

      const updatedShareLink = await prisma.shareLink.update({
        where: { id: shareId },
        data: {
          expires_at: expiresAt ? new Date(expiresAt) : null
        },
        include: {
          trails: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Clear cache
      if (updatedShareLink) {
        await RedisUtils.deleteCache(`shared-trail:${updatedShareLink.token}`)
      }

      fastify.log.info(`Share link expiration updated: ${shareId} by ${request.user?.email}`)

      return reply.send({
        success: true,
        shareLink: {
          ...updatedShareLink,
          trail: updatedShareLink.trails, // Keep backward compatibility
          shareUrl: `${process.env.FRONTEND_URL || 'https://echotrail.app'}/shared/${updatedShareLink.token}`
        }
      })

    } catch (error) {
      fastify.log.error({ error }, 'List shares error:')
      throw error
    }
  })
}

export { shareRoutes }
