import { NextRequest, NextResponse } from 'next/server'
import { db, messages, users, projects } from '@/lib/db'
import { eq, and, or, desc } from 'drizzle-orm'

// Get messages for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    let query = db
      .select({
        id: messages.id,
        projectId: messages.projectId,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        text: messages.text,
        sentAt: messages.sentAt,
        read: messages.read,
        bidId: messages.bidId,
      })
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )

    // Filter by project if specified
    if (projectId) {
      query = query.where(
        and(
          or(
            eq(messages.senderId, userId),
            eq(messages.receiverId, userId)
          ),
          eq(messages.projectId, projectId)
        )
      )
    }

    const userMessages = await query.orderBy(desc(messages.sentAt))

    // Convert timestamps to ISO strings for proper JSON serialization
    const formattedMessages = userMessages.map(msg => ({
      ...msg,
      sentAt: msg.sentAt.toISOString()
    }))

    return NextResponse.json({ messages: formattedMessages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// Send a new message
export async function POST(request: NextRequest) {
  try {
    const { projectId, receiverId, text, senderId, bidId } = await request.json()

    // Validate input
    if (!projectId || !receiverId || !text || !senderId) {
      return NextResponse.json(
        { error: 'Project ID, receiver ID, text, and sender ID are required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Verify users exist
    const [sender] = await db
      .select()
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1)

    const [receiver] = await db
      .select()
      .from(users)
      .where(eq(users.id, receiverId))
      .limit(1)

    if (!sender || !receiver) {
      return NextResponse.json(
        { error: 'Sender or receiver not found' },
        { status: 404 }
      )
    }

    // Create message
    const [newMessage] = await db
      .insert(messages)
      .values({
        projectId,
        senderId,
        receiverId,
        text: text.trim(),
        bidId: bidId || null,
        read: false,
        sentAt: new Date(),
      })
      .returning()

    console.info('Message sent:', {
      messageId: newMessage.id,
      projectId,
      senderId: senderId.replace(/(.{2}).*/, '$1***'),
      receiverId: receiverId.replace(/(.{2}).*/, '$1***'),
      timestamp: new Date().toISOString()
    })

    // Format the message for JSON response
    const formattedMessage = {
      ...newMessage,
      sentAt: newMessage.sentAt.toISOString()
    }

    return NextResponse.json({ message: formattedMessage }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}