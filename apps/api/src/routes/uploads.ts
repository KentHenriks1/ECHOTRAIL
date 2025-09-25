import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'

interface UploadRequest extends FastifyRequest {
  body: {
    files: {
      image?: {
        filename: string
        mimetype: string
        file: NodeJS.ReadableStream
      }
    }
    fields: {
      type?: { value: string }
      trailId?: { value: string }
    }
  }
}

// Allowed file types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function uploadRoutes(fastify: FastifyInstance) {
  // Upload profile image
  fastify.post<{ Body: any }>('/profile-image', {
    preHandler: fastify.authenticate
  }, async (request: UploadRequest, reply: FastifyReply) => {
    try {
      const data = await request.file()
      
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        })
      }

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only JPEG, PNG, and WebP images are allowed'
          }
        })
      }

      // Generate unique filename
      const fileExt = path.extname(data.filename || '.jpg')
      const filename = `profile_${request.userId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${fileExt}`
      const filepath = path.join(process.cwd(), 'uploads', 'profiles', filename)
      
      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(filepath), { recursive: true })

      // Process image with Sharp (resize and optimize)
      const processedImagePath = filepath.replace(fileExt, '_processed.webp')
      
      // Save file to disk first, then process with Sharp
      await pipeline(
        data.file,
        fs.createWriteStream(filepath)
      )
      
      // Process with Sharp
      await sharp(filepath)
        .resize(400, 400, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 85 })
        .toFile(processedImagePath)
      
      // Remove original file
      await fs.promises.unlink(filepath)

      // Update user profile image URL in database
      const imageUrl = `/uploads/profiles/${path.basename(processedImagePath)}`
      
      // In a real implementation, update the user's profile image in database
      // await prisma.user.update({
      //   where: { id: request.userId },
      //   data: { profileImage: imageUrl }
      // })

      reply.send({
        success: true,
        data: {
          imageUrl,
          filename: path.basename(processedImagePath)
        }
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Profile image upload error')
      reply.code(500).send({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload profile image'
        }
      })
    }
  })

  // Upload trail media (photos from trail)
  fastify.post<{ Body: any }>('/trail-media', {
    preHandler: fastify.authenticate
  }, async (request: UploadRequest, reply: FastifyReply) => {
    try {
      const data = await request.file()
      
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        })
      }

      // Get trail ID from fields
      const trailId = request.body?.fields?.trailId?.value
      if (!trailId) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'NO_TRAIL_ID',
            message: 'Trail ID is required'
          }
        })
      }

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only JPEG, PNG, and WebP images are allowed'
          }
        })
      }

      // Generate unique filename
      const fileExt = path.extname(data.filename || '.jpg')
      const filename = `trail_${trailId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${fileExt}`
      const filepath = path.join(process.cwd(), 'uploads', 'trails', filename)
      
      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(filepath), { recursive: true })

      // Save original file first
      await pipeline(
        data.file,
        fs.createWriteStream(filepath)
      )
      
      // Create multiple sizes for responsive images
      const sizes = [
        { name: 'thumb', width: 200, height: 200 },
        { name: 'medium', width: 800, height: 600 },
        { name: 'large', width: 1200, height: 900 }
      ]

      const processedImages: Array<{
        size: string
        url: string
        width: number
        height: number
      }> = []

      for (const size of sizes) {
        const processedPath = filepath.replace(fileExt, `_${size.name}.webp`)
        
        await sharp(filepath)
          .resize(size.width, size.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 85 })
          .toFile(processedPath)

        processedImages.push({
          size: size.name,
          url: `/uploads/trails/${path.basename(processedPath)}`,
          width: size.width,
          height: size.height
        })
      }
      
      // Remove original file
      await fs.promises.unlink(filepath)

      // In a real implementation, save media metadata to database
      // await prisma.trailMedia.create({
      //   data: {
      //     trailId,
      //     userId: request.userId,
      //     filename: path.basename(filename),
      //     originalName: data.filename,
      //     mimeType: data.mimetype,
      //     images: processedImages
      //   }
      // })

      reply.send({
        success: true,
        data: {
          images: processedImages,
          originalFilename: data.filename
        }
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Trail media upload error')
      reply.code(500).send({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload trail media'
        }
      })
    }
  })

  // Get user's uploaded files
  fastify.get('/my-uploads', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      // In a real implementation, fetch from database
      const uploads = []
      
      reply.send({
        success: true,
        data: uploads
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Get uploads error')
      reply.code(500).send({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch uploads'
        }
      })
    }
  })

  // Delete uploaded file
  fastify.delete<{ Params: { filename: string } }>('/file/:filename', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const { filename } = request.params
      
      // Security: Validate filename and user ownership
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_FILENAME',
            message: 'Invalid filename'
          }
        })
      }

      // In a real implementation, verify user owns the file before deletion
      const profilePath = path.join(process.cwd(), 'uploads', 'profiles', filename)
      const trailPath = path.join(process.cwd(), 'uploads', 'trails', filename)
      
      let deleted = false
      
      try {
        await fs.promises.unlink(profilePath)
        deleted = true
      } catch (err) {
        // File not in profiles, try trails
        try {
          await fs.promises.unlink(trailPath)
          deleted = true
        } catch (err) {
          // File not found in either location
        }
      }

      if (!deleted) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found'
          }
        })
      }

      reply.send({
        success: true,
        message: 'File deleted successfully'
      })
      
    } catch (error) {
      fastify.log.error({ error }, 'Delete file error')
      reply.code(500).send({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete file'
        }
      })
    }
  })
}