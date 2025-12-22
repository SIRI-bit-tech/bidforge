import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useStore } from '@/lib/store'

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const { currentUser, addMessage, markMessageAsRead } = useStore()

  useEffect(() => {
    if (!currentUser) return

    // Initialize socket connection
    const initSocket = async () => {
      // Ensure socket server is initialized
      await fetch('/api/socket')
      
      // Connect to socket
      socketRef.current = io({
        path: '/api/socket',
      })

      const socket = socketRef.current

      socket.on('connect', () => {
        console.log('Connected to Socket.IO server')
        
        // Join user's personal room
        socket.emit('join-user-room', currentUser.id)
      })

      // Listen for new messages
      socket.on('new-message', (messageData) => {
        console.log('Received new message:', messageData)
        addMessage(messageData)
      })

      // Listen for message read confirmations
      socket.on('message-read', (data) => {
        console.log('Message marked as read:', data)
        markMessageAsRead(data.messageId)
      })

      // Listen for typing indicators
      socket.on('user-typing', (data) => {
        // Handle typing indicator UI updates
        console.log('User typing:', data)
      })

      socket.on('user-stopped-typing', (data) => {
        // Handle stop typing UI updates
        console.log('User stopped typing:', data)
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server')
      })
    }

    initSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [currentUser, addMessage, markMessageAsRead])

  const sendMessage = (messageData: any) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', messageData)
    }
  }

  const joinProjectRoom = (projectId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-project-room', projectId)
    }
  }

  const markAsRead = (messageId: string, senderId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('mark-message-read', { messageId, senderId })
    }
  }

  const startTyping = (projectId: string, receiverId: string) => {
    if (socketRef.current && currentUser) {
      socketRef.current.emit('typing-start', {
        userId: currentUser.id,
        projectId,
        receiverId
      })
    }
  }

  const stopTyping = (projectId: string, receiverId: string) => {
    if (socketRef.current && currentUser) {
      socketRef.current.emit('typing-stop', {
        userId: currentUser.id,
        projectId,
        receiverId
      })
    }
  }

  return {
    socket: socketRef.current,
    sendMessage,
    joinProjectRoom,
    markAsRead,
    startTyping,
    stopTyping,
    isConnected: socketRef.current?.connected || false
  }
}