import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { NextApiResponse } from 'next'
import { verifyJWT } from '@/lib/services/auth'
import prisma from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'

export type SocketServer = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer
    }
  }
}

// Global reference to the socket server for broadcasting notifications
let globalIO: SocketIOServer | null = null

// Connection tracking for monitoring
const connectionStats = {
  totalConnections: 0,
  authenticatedConnections: 0,
  messagesSent: 0,
  errorsCount: 0
}

// Function to get or initialize the socket server
export const getSocketServer = (): SocketIOServer | null => {
  return globalIO
}

// Function to set the socket server
export const setSocketServer = (io: SocketIOServer) => {
  globalIO = io
}

// Get connection statistics
export const getConnectionStats = () => ({ ...connectionStats })

// Helper function to broadcast notifications to a specific user
export const broadcastNotification = (userId: string, notification: any) => {
  if (globalIO) {
    globalIO.to(`user:${userId}`).emit('notification', notification)
  }
}

// Helper function to authenticate socket connection
const authenticateSocket = async (socket: Socket, token: string): Promise<boolean> => {
  try {
    const payload = verifyJWT(token)
    if (!payload) {
      return false
    }

    // Attach user info to socket
    const socketAny = socket as any
    socketAny.userId = payload.userId
    socketAny.role = payload.role
    socketAny.companyId = payload.companyId
    socketAny.violationCount = 0
    socketAny.lastActivity = Date.now()

    return true
  } catch (error) {
    return false
  }
}

// Helper function to check project membership/permission
const checkProjectPermission = async (userId: string, projectId: string): Promise<boolean> => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdById: true }
    })

    if (project?.createdById === userId) {
      return true
    }

    const bid = await prisma.bid.findFirst({
      where: {
        projectId,
        subcontractorId: userId
      }
    })

    return !!bid
  } catch (error) {
    return false
  }
}

// Helper function to handle violations
const handleViolation = (socket: Socket, reason: string) => {
  const socketAny = socket as any
  socketAny.violationCount = (socketAny.violationCount || 0) + 1
  connectionStats.errorsCount++

  if (socketAny.violationCount >= 3) {
    socket.emit('error', { message: 'Connection terminated due to repeated security violations' })
    socket.disconnect()
  } else {
    socket.emit('error', { message: `Unauthorized action: ${reason}` })
  }
}

// Rate limiting for socket events
const checkSocketRateLimit = async (socket: Socket, eventType: string): Promise<boolean> => {
  const socketAny = socket as any
  if (!socketAny.userId) return false

  const key = `socket:${eventType}:${socketAny.userId}`
  const config = RATE_LIMITS.WEBSOCKET_MESSAGE

  const result = await checkRateLimit(key, config)
  return result.allowed
}

export const initSocket = (res: SocketServer) => {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true,
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
      }
    })

    globalIO = io

    io.use(async (socket: any, next: any) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')

      if (!token) {
        return next(new Error('Authentication required'))
      }

      const connectKey = `socket:connect:${socket.handshake.address}`
      const connectRateLimit = await checkRateLimit(connectKey, RATE_LIMITS.WEBSOCKET_CONNECT)

      if (!connectRateLimit.allowed) {
        return next(new Error('Too many connection attempts'))
      }

      const isAuthenticated = await authenticateSocket(socket, token)

      if (!isAuthenticated) {
        return next(new Error('Invalid authentication token'))
      }

      next()
    })

    io.on('connection', async (socket: Socket) => {
      const socketAny = socket as any

      connectionStats.totalConnections++
      connectionStats.authenticatedConnections++

      const heartbeatInterval = setInterval(() => {
        socketAny.lastActivity = Date.now()
        socket.emit('heartbeat', { timestamp: Date.now() })
      }, 30000)

      socket.on('join-user-room', async (userId: string) => {
        if (!socketAny.userId || socketAny.userId !== userId) {
          handleViolation(socket, 'Unauthorized room access')
          return
        }

        const allowed = await checkSocketRateLimit(socket, 'join-room')
        if (!allowed) return

        socket.join(`user:${userId}`)
      })

      socket.on('join-project-room', async (projectId: string) => {
        if (!socketAny.userId) return

        const allowed = await checkSocketRateLimit(socket, 'join-room')
        if (!allowed) return

        const hasPermission = await checkProjectPermission(socketAny.userId, projectId)
        if (!hasPermission) {
          handleViolation(socket, `Unauthorized project access (${projectId})`)
          return
        }

        socket.join(`project:${projectId}`)
      })

      socket.on('send-message', async (messageData: any) => {
        if (!socketAny.userId) return

        const allowed = await checkSocketRateLimit(socket, 'send-message')
        if (!allowed) return

        const sanitizedData = {
          ...messageData,
          senderId: socketAny.userId,
          text: typeof messageData.text === 'string' ? messageData.text.trim().slice(0, 1000) : '',
          sentAt: new Date().toISOString()
        }

        if (!sanitizedData.projectId || !sanitizedData.receiverId || !sanitizedData.text) {
          handleViolation(socket, 'Invalid message data')
          return
        }

        const hasPermission = await checkProjectPermission(socketAny.userId, sanitizedData.projectId)
        if (!hasPermission) return

        connectionStats.messagesSent++
        socket.to(`user:${sanitizedData.receiverId}`).emit('new-message', sanitizedData)
        socket.to(`project:${sanitizedData.projectId}`).emit('new-message', sanitizedData)
        socket.emit('message-sent', { success: true })
      })

      socket.on('mark-message-read', async (data: any) => {
        if (!socketAny.userId) return
        const { messageId } = data
        if (!messageId) return

        try {
          const message = await prisma.message.findUnique({
            where: { id: messageId },
            select: { senderId: true, receiverId: true }
          })

          if (message && message.receiverId === socketAny.userId) {
            socket.to(`user:${message.senderId}`).emit('message-read', {
              messageId,
              readBy: socketAny.userId
            })
          }
        } catch (e) { }
      })

      socket.on('heartbeat-response', () => {
        socketAny.lastActivity = Date.now()
      })

      socket.on('disconnect', () => {
        connectionStats.authenticatedConnections--
        clearInterval(heartbeatInterval)
      })
    })

    res.socket.server.io = io
  }

  return res.socket.server.io
}