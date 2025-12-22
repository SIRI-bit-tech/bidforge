import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

import { NextApiResponse } from 'next'

export type SocketServer = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer
    }
  }
}

export const initSocket = (res: SocketServer) => {
  if (!res.socket.server.io) {
    // Initializing Socket.IO server silently
    
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    })

    // Handle socket connections
    io.on('connection', (socket) => {
      // User connected silently

      // Join user to their personal room for notifications
      socket.on('join-user-room', (userId: string) => {
        socket.join(`user:${userId}`)
      })

      // Join project room for project-specific messaging
      socket.on('join-project-room', (projectId: string) => {
        socket.join(`project:${projectId}`)
      })

      // Handle new messages
      socket.on('send-message', (messageData) => {
        // Broadcast to project room
        socket.to(`project:${messageData.projectId}`).emit('new-message', messageData)
        
        // Send to specific receiver
        socket.to(`user:${messageData.receiverId}`).emit('new-message', messageData)
      })

      // Handle message read status
      socket.on('mark-message-read', (data) => {
        socket.to(`user:${data.senderId}`).emit('message-read', data)
      })

      // Handle typing indicators
      socket.on('typing-start', (data) => {
        socket.to(`project:${data.projectId}`).emit('user-typing', {
          userId: data.userId,
          projectId: data.projectId,
          receiverId: data.receiverId
        })
      })

      socket.on('typing-stop', (data) => {
        socket.to(`project:${data.projectId}`).emit('user-stopped-typing', {
          userId: data.userId,
          projectId: data.projectId,
          receiverId: data.receiverId
        })
      })

      socket.on('disconnect', () => {
        // User disconnected silently
      })
    })

    res.socket.server.io = io
  }
  
  return res.socket.server.io
}