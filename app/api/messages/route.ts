import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'
import Ably from 'ably'

// Get messages for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Extract authenticated user's ID from auth token
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

    const authenticatedUserId = payload.userId
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    const userMessages = await prisma.message.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: authenticatedUserId },
              { receiverId: authenticatedUserId }
            ]
          },
          projectId ? { projectId } : {}
        ]
      },
      orderBy: {
        sentAt: 'desc'
      },
      select: {
        id: true,
        projectId: true,
        senderId: true,
        receiverId: true,
        text: true,
        attachments: true,
        sentAt: true,
        read: true,
        bidId: true
      }
    })

    // Convert timestamps to ISO strings and parse attachments JSON
    const formattedMessages = userMessages.map((msg: any) => ({
      ...msg,
      sentAt: msg.sentAt instanceof Date ? msg.sentAt.toISOString() : msg.sentAt,
      attachments: msg.attachments ? JSON.parse(msg.attachments) : []
    }))

    return NextResponse.json({ messages: formattedMessages })
  } catch (error) {
    logError('messages endpoint error', error, {
      endpoint: '/api/messages',
      errorType: 'messages_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// Send a new message
export async function POST(request: NextRequest) {
  try {
    // Extract authenticated user's ID from auth token
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

    const authenticatedUserId = payload.userId
    const { projectId, receiverId, text, bidId, attachments } = await request.json()

    if (!projectId || !receiverId || (!text && (!attachments || attachments.length === 0))) {
      return NextResponse.json(
        { error: 'Project ID, receiver ID, and either text or attachments are required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check authorization
    const isProjectOwner = project.createdById === authenticatedUserId
    let canSendMessage = isProjectOwner

    if (!canSendMessage) {
      const userBid = await prisma.bid.findFirst({
        where: {
          projectId,
          subcontractorId: authenticatedUserId
        }
      })
      canSendMessage = !!userBid
    }

    if (!canSendMessage) {
      const existingConversation = await prisma.message.findFirst({
        where: {
          projectId,
          OR: [
            { AND: [{ senderId: authenticatedUserId }, { receiverId }] },
            { AND: [{ senderId: receiverId }, { receiverId: authenticatedUserId }] }
          ]
        }
      })
      canSendMessage = !!existingConversation
    }

    if (!canSendMessage) {
      return NextResponse.json(
        { error: 'Access denied. You must be the project owner, have submitted a bid, or be part of an existing conversation to send messages for this project.' },
        { status: 403 }
      )
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    })

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      )
    }

    if (authenticatedUserId === receiverId) {
      return NextResponse.json(
        { error: 'Cannot send message to yourself' },
        { status: 400 }
      )
    }

    // Create message with prisma
    const newMessage = await prisma.message.create({
      data: {
        projectId,
        senderId: authenticatedUserId,
        receiverId,
        text: text?.trim() || '',
        attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
        bidId: bidId || null,
        read: false,
        sentAt: new Date(),
      }
    })

    const formattedMessage = {
      ...newMessage,
      sentAt: newMessage.sentAt.toISOString(),
      attachments: attachments || []
    }

    // --- Ably & Notification Logic ---
    try {
      if (process.env.ABLY_API_KEY) {
        const client = new Ably.Rest(process.env.ABLY_API_KEY)

        const channelName = `messages:${receiverId}`
        await client.channels.get(channelName).publish('new-message', formattedMessage)

        const newNotification = await prisma.notification.create({
          data: {
            userId: receiverId,
            type: 'MESSAGE',
            title: 'New Message',
            message: `You have a new message from ${project.title}`,
            link: `/messages?project=${projectId}&user=${authenticatedUserId}`,
            read: false,
            createdAt: new Date(),
          }
        })

        const notifChannel = `notifications:${receiverId}`
        await client.channels.get(notifChannel).publish('new-notification', {
          ...newNotification,
          createdAt: newNotification.createdAt.toISOString()
        })
      }
    } catch (ablyError) {
      // Don't block
    }

    return NextResponse.json({ message: formattedMessage }, { status: 201 })
  } catch (error) {
    logError('messages endpoint error', error, {
      endpoint: '/api/messages',
      errorType: 'messages_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}