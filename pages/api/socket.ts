import { NextApiRequest } from 'next'
import { initSocket, SocketServer } from '@/lib/socket/server'

export default function handler(req: NextApiRequest, res: SocketServer) {
  try {
    if (!res.socket.server.io) {
      initSocket(res)
    }
    
    res.end()
  } catch (error) {
    res.status(500).end()
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}