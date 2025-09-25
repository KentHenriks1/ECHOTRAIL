import { FastifyReply } from 'fastify'

// Standard API response types
export interface SuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

// Helper function to send error responses
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  reply.code(statusCode)
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    }
  } as ErrorResponse
}

// Helper function to send success responses
export function sendSuccess<T>(
  reply: FastifyReply,
  statusCode: number,
  data?: T,
  message?: string
) {
  reply.code(statusCode)
  return {
    success: true,
    ...(data && { data }),
    ...(message && { message })
  } as SuccessResponse<T>
}

// Authentication helper to ensure userId exists
export function requireAuth(request: { userId?: string }): asserts request is { userId: string } {
  if (!request.userId) {
    throw new Error('Authentication required')
  }
}
