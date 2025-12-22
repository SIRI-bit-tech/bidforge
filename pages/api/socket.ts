import { NextApiRequest } from 'next'
import { initSocket, SocketServer } from '@/lib/socket/server'

export default function handler(req: NextApiRequest, res: SocketServer) {
  if (!res.socket.server.io) {
    // Setting up Socket.IO server silently
    initSocket(res)
  }
  
  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}