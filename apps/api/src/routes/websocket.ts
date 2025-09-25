import { FastifyInstance, FastifyRequest } from 'fastify'

interface WebSocketConnection {
  socket: any // WebSocket connection from Fastify
  userId?: string
  rooms: Set<string>
}

// Store active WebSocket connections
const connections = new Map<string, WebSocketConnection>()

export async function websocketRoutes(fastify: FastifyInstance) {
  // WebSocket endpoint for real-time trail updates
  fastify.register(async function (fastify) {
    fastify.get('/trail-updates', { websocket: true }, (connection, request) => {
      const connectionId = `conn_${Date.now()}_${Math.random()}`
      
      connections.set(connectionId, {
        socket: connection,
        rooms: new Set<string>()
      })

      connection.on('message', async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString())
          
          switch (data.type) {
            case 'authenticate':
              await handleAuthentication(connectionId, data.token)
              break
              
            case 'join_trail':
              await handleJoinTrail(connectionId, data.trailId)
              break
              
            case 'leave_trail':
              await handleLeaveTrail(connectionId, data.trailId)
              break
              
            case 'location_update':
              await handleLocationUpdate(connectionId, data)
              break
              
            default:
              connection.send(JSON.stringify({
                type: 'error',
                message: 'Unknown message type'
              }))
          }
        } catch (error) {
          fastify.log.error({ error }, 'WebSocket message error')
          connection.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }))
        }
      })

      connection.on('close', () => {
        connections.delete(connectionId)
        fastify.log.info(`WebSocket connection ${connectionId} closed`)
      })

      connection.on('error', (error) => {
        fastify.log.error({ error, connectionId }, 'WebSocket error')
        connections.delete(connectionId)
      })

      // Send welcome message
      connection.send(JSON.stringify({
        type: 'connected',
        connectionId,
        message: 'Connected to EchoTrail real-time updates'
      }))
    })
  })
}

async function handleAuthentication(connectionId: string, token: string) {
  const conn = connections.get(connectionId)
  if (!conn) return

  try {
    // In a real implementation, verify JWT token here
    // For now, we'll extract userId from a mock verification
    const userId = extractUserIdFromToken(token)
    
    if (userId) {
      conn.userId = userId
      conn.socket.send(JSON.stringify({
        type: 'authenticated',
        userId
      }))
    } else {
      conn.socket.send(JSON.stringify({
        type: 'auth_error',
        message: 'Invalid token'
      }))
    }
  } catch (error) {
    conn.socket.send(JSON.stringify({
      type: 'auth_error',
      message: 'Authentication failed'
    }))
  }
}

async function handleJoinTrail(connectionId: string, trailId: string) {
  const conn = connections.get(connectionId)
  if (!conn || !conn.userId) {
    conn?.socket.send(JSON.stringify({
      type: 'error',
      message: 'Authentication required'
    }))
    return
  }

  conn.rooms.add(`trail_${trailId}`)
  conn.socket.send(JSON.stringify({
    type: 'joined_trail',
    trailId
  }))
}

async function handleLeaveTrail(connectionId: string, trailId: string) {
  const conn = connections.get(connectionId)
  if (!conn) return

  conn.rooms.delete(`trail_${trailId}`)
  conn.socket.send(JSON.stringify({
    type: 'left_trail',
    trailId
  }))
}

async function handleLocationUpdate(connectionId: string, data: any) {
  const conn = connections.get(connectionId)
  if (!conn || !conn.userId) return

  // Broadcast location update to all connections in the same trail
  const trailRoom = `trail_${data.trailId}`
  
  connections.forEach((otherConn, otherConnId) => {
    if (otherConnId !== connectionId && otherConn.rooms.has(trailRoom)) {
      otherConn.socket.send(JSON.stringify({
        type: 'location_update',
        trailId: data.trailId,
        userId: conn.userId,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp || new Date().toISOString()
        }
      }))
    }
  })
}

// Mock function - in real implementation, use proper JWT verification
function extractUserIdFromToken(token: string): string | null {
  try {
    // This should use your JWT verification logic
    // For now, return a mock user ID
    return token.length > 10 ? 'mock_user_id' : null
  } catch {
    return null
  }
}

// Utility function to broadcast to all connections in a room
export function broadcastToRoom(room: string, message: any) {
  connections.forEach((conn) => {
    if (conn.rooms.has(room)) {
      conn.socket.send(JSON.stringify(message))
    }
  })
}

// Utility function to send message to specific user
export function sendToUser(userId: string, message: any) {
  connections.forEach((conn) => {
    if (conn.userId === userId) {
      conn.socket.send(JSON.stringify(message))
    }
  })
}