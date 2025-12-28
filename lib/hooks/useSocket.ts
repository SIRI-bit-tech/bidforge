import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'

// WebSocket functionality temporarily disabled
// TODO: Implement WebSocket server compatible with Next.js 16 App Router
// import { io, Socket } from 'socket.io-client'

type Socket = any // Placeholder type

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const { currentUser, addMessage, markMessageAsRead, loadNotifications, addNotification } = useStore()

  useEffect(() => {
    if (!currentUser) return

    // WebSocket functionality temporarily disabled
    // TODO: Implement WebSocket server compatible with Next.js 16 App Router
    // The current Socket.IO implementation is not compatible with Next.js 16
    
    // Load notifications on mount instead of socket connect
    loadNotifications()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [currentUser, loadNotifications])

  const sendMessage = (messageData: any) => {
    // WebSocket functionality temporarily disabled
    // TODO: Implement proper messaging system
    console.warn('WebSocket messaging temporarily disabled')
  }

  const joinProjectRoom = (projectId: string) => {
    // WebSocket functionality temporarily disabled
    console.warn('WebSocket room joining temporarily disabled')
  }

  const markAsRead = (messageId: string, senderId: string) => {
    // WebSocket functionality temporarily disabled
    console.warn('WebSocket read receipts temporarily disabled')
  }

  const startTyping = (projectId: string, receiverId: string) => {
    // WebSocket functionality temporarily disabled
    console.warn('WebSocket typing indicators temporarily disabled')
  }

  const stopTyping = (projectId: string, receiverId: string) => {
    // WebSocket functionality temporarily disabled
    console.warn('WebSocket typing indicators temporarily disabled')
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