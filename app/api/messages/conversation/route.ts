import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'

// Delete all messages in a conversation (project + user pair)
export async function DELETE(request: NextRequest) {
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
    const otherUserId = searchParams.get('otherUserId')

    if (!projectId || !otherUserId) {
      return NextResponse.json(
        { error: 'Project ID and other user ID are required' },
        { status: 400 }
      )
    }

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check authorization - user can only delete conversations they're part of
    const isProjectOwner = project.createdById === authenticatedUserId
    let canDeleteConversation = isProjectOwner

    if (!canDeleteConversation) {
      const userBid = await prisma.bid.findFirst({
        where: {
          projectId,
          subcontractorId: authenticatedUserId
        }
      })
      canDeleteConversation = !!userBid
    }

    if (!canDeleteConversation) {
      // Check if user has any messages in this conversation
      const existingMessage = await prisma.message.findFirst({
        where: {
          projectId,
          OR: [
            { AND: [{ senderId: authenticatedUserId }, { receiverId: otherUserId }] },
            { AND: [{ senderId: otherUserId }, { receiverId: authenticatedUserId }] }
          ]
        }
      })
      canDeleteConversation = !!existingMessage
    }

    if (!canDeleteConversation) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete conversations you are part of.' },
        { status: 403 }
      )
    }

    // Delete all messages between the two users for this project
    const deleteResult = await prisma.message.deleteMany({
      where: {
        projectId,
        OR: [
          { AND: [{ senderId: authenticatedUserId }, { receiverId: otherUserId }] },
          { AND: [{ senderId: otherUserId }, { receiverId: authenticatedUserId }] }
        ]
      }
    })

    return NextResponse.json(
      { 
        message: 'Conversation deleted successfully',
        deletedCount: deleteResult.count
      },
      { status: 200 }
    )
  } catch (error) {
    logError('delete conversation endpoint error', error, {
      endpoint: '/api/messages/conversation',
      errorType: 'delete_conversation_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}
