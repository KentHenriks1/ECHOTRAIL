import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { prisma } from '../lib/prisma'
import { env } from '../config/env'

// Validation schemas
const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).trim(),
})

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
})

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register new user
  fastify.post('/auth/register', {
    schema: {
      tags: ['Authentication'],
      description: 'Register a new user account',
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 1, maxLength: 100 }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' }
              }
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refresh_token: { type: 'string' },
                expiresIn: { type: 'number' }
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
        409: {
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
      const { email, password, name } = registerSchema.parse(request.body)

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        reply.code(409)
        return {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'A user with this email already exists'
          }
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS)

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password_hash: passwordHash,
          preferences: {
            units: 'metric',
            language: 'en',
            mapStyle: 'default',
            privacyLevel: 'private'
          }
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          created_at: true
        }
      })

      // Create refresh token session
      const refreshToken = nanoid(64)
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      await prisma.userSession.create({
        data: {
          user_id: user.id,
          refresh_token: refreshToken,
          expires_at: refreshExpiresAt,
          user_agent: request.headers['user-agent'],
          ip_address: request.ip
        }
      })

      // Generate access token
      const accessToken = fastify.jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        { expiresIn: env.JWT_EXPIRES_IN }
      )

      fastify.log.info(`New user registered: ${user.email}`)

      reply.code(201)
      return {
        success: true,
        user,
        tokens: {
          accessToken,
          refresh_token: refreshToken,
          expiresIn: 3600 // 1 hour in seconds
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

      fastify.log.error({ error }, 'Registration error:')
      throw error
    }
  })

  // Login user
  fastify.post('/auth/login', {
    schema: {
      tags: ['Authentication'],
      description: 'Authenticate user and return tokens',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body)

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password_hash: true,
          created_at: true
        }
      })

      if (!user) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)

      if (!isValidPassword) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      }

      // Create refresh token session
      const refreshToken = nanoid(64)
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      await prisma.userSession.create({
        data: {
          user_id: user.id,
          refresh_token: refreshToken,
          expires_at: refreshExpiresAt,
          user_agent: request.headers['user-agent'],
          ip_address: request.ip
        }
      })

      // Generate access token
      const accessToken = fastify.jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        { expiresIn: env.JWT_EXPIRES_IN }
      )

      // Remove password hash from response
      const { password_hash, ...userResponse } = user

      fastify.log.info(`User logged in: ${user.email}`)

      return reply.send({
        success: true,
        user: userResponse,
        tokens: {
          accessToken,
          refresh_token: refreshToken,
          expiresIn: 3600 // 1 hour in seconds
        }
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

      fastify.log.error({ error }, 'Login error:')
      throw error
    }
  })

  // Refresh access token
  fastify.post('/auth/refresh', {
    schema: {
      tags: ['Authentication'],
      description: 'Refresh access token using refresh token',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refresh_token: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { refresh_token: refreshToken } = refreshSchema.parse(request.body)

      // Find and validate refresh token
      const session = await prisma.userSession.findUnique({
        where: { refresh_token: refreshToken },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      })

      if (!session || session.expires_at < new Date()) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token'
          }
        })
      }

      // Generate new access token
      const accessToken = fastify.jwt.sign(
        { userId: session.user.id, email: session.user.email, role: session.user.role },
        { expiresIn: env.JWT_EXPIRES_IN }
      )

      // Update session timestamp
      await prisma.userSession.update({
        where: { id: session.id },
        data: { updated_at: new Date() }
      })

      return reply.send({
        success: true,
        user: session.user,
        tokens: {
          accessToken,
          refresh_token: refreshToken, // Keep the same refresh token
          expiresIn: 3600
        }
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

      fastify.log.error({ error }, 'Token refresh error:')
      throw error
    }
  })

  // Logout user
  fastify.post('/auth/logout', {
    preHandler: fastify.authenticate,
    schema: {
      tags: ['Authentication'],
      description: 'Logout user and invalidate tokens',
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      // Invalidate all user sessions
      await prisma.userSession.deleteMany({
        where: { user_id: request.userId }
      })

      fastify.log.info('User logged out')

      return reply.send({
        success: true,
        message: 'Logged out successfully'
      })

    } catch (error) {
      fastify.log.error({ error }, 'Logout error:')
      throw error
    }
  })
}

export { authRoutes }
