import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'
import Ably from 'ably'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check - retrieve current session
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    // Fetch the message by id to verify ownership
    const message = await prisma.message.findUnique({
      where: { id },
      select: {
        id: true,
        receiverId: true,
        senderId: true,
        read: true
      }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Authorization check - verify session user id matches message recipient
    if (message.receiverId !== payload.userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only mark your own messages as read.' },
        { status: 403 }
      )
    }

    // Check if message is already read
    if (message.read) {
      return NextResponse.json({ message })
    }

    // Only perform update after authentication and authorization checks pass
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { read: true }
    })

    if (!updatedMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Publish read receipt via Ably
    if (process.env.ABLY_API_KEY) {
      try {
        const client = new Ably.Rest(process.env.ABLY_API_KEY)
        // Notify the sender that their message was read
        const channel = client.channels.get(`messages:${updatedMessage.senderId}`)
        await channel.publish('message-read', {
          messageId: updatedMessage.id,
          readBy: payload.userId,
          readAt: new Date().toISOString()
        })
      } catch (e) {
        console.error('Failed to publish read receipt via Ably', e)
      }
    }

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    // Error marking message as read
    return NextResponse.json(
      { error: 'Failed to mark message as read' },
      { status: 500 }
    )
  }
}