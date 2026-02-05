import Ably from 'ably'
import { NextApiResponse } from 'next'

// We don't need the complex SocketServer type anymore since we aren't attaching to the HTTP server
export type SocketServer = NextApiResponse

// Helper function to broadcast notifications to a specific user via Ably
export const broadcastNotification = async (userId: string, notification: any) => {
  try {
    if (process.env.ABLY_API_KEY) {
      const client = new Ably.Rest(process.env.ABLY_API_KEY)
      const channel = client.channels.get(`notifications:${userId}`)

      await channel.publish('new-notification', {
        ...notification,
        createdAt: notification.createdAt instanceof Date ? notification.createdAt.toISOString() : notification.createdAt
      })
    } else {
      console.warn('ABLY_API_KEY is not set, cannot broadcast notification')
    }
  } catch (error) {
    console.error('Failed to broadcast notification via Ably:', error)
  }
}

// These functions were used for socket.io but are now no-ops or deprecated
// We keep them to avoid breaking imports in other files that might reference them, 
// though ideally those references should be cleaned up.

export const getSocketServer = () => {
  return null
}

export const setSocketServer = (io: any) => {
  // No-op
}

export const getConnectionStats = () => ({
  totalConnections: 0,
  authenticatedConnections: 0,
  messagesSent: 0,
  errorsCount: 0
})

export const initSocket = (res: any) => {
  // No-op
  return null
}