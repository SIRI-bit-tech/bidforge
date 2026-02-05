import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'
import { broadcastNotification } from '@/lib/socket/server'

export async function POST(request: NextRequest) {
  try {
    // Authentication check - verify caller is authenticated
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      // Invitation creation attempt without authentication token
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      // Invitation creation attempt with invalid token
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { projectId, subcontractorIds, message } = await request.json()

    // Validate input
    if (!projectId || !subcontractorIds || !Array.isArray(subcontractorIds)) {
      return NextResponse.json(
        { error: 'Project ID and subcontractor IDs are required' },
        { status: 400 }
      )
    }

    // Authorization check - verify caller is authorized to invite subcontractors to the project
    // (i.e., is the project owner)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        createdById: true,
        status: true,
        title: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if the authenticated user is the project owner
    if (project.createdById !== payload.userId) {
      // User attempted unauthorized invitation creation for project
      return NextResponse.json(
        { error: 'Access denied. Only project owners can send invitations.' },
        { status: 403 }
      )
    }

    if (project.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Can only invite to published projects' },
        { status: 400 }
      )
    }

    // Short-circuit if no subcontractor IDs provided
    if (subcontractorIds.length === 0) {
      return NextResponse.json(
        { error: 'No subcontractors specified' },
        { status: 400 }
      )
    }

    // Verify that all provided IDs are valid subcontractors
    const validSubcontractors = await prisma.user.findMany({
      where: {
        role: 'SUBCONTRACTOR',
        id: { in: subcontractorIds }
      },
      select: { id: true }
    })

    // Extract valid subcontractor IDs from the database results
    const validSubcontractorIds = validSubcontractors.map(sub => sub.id)

    if (validSubcontractorIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid subcontractors found' },
        { status: 400 }
      )
    }

    // Check for existing invitations to avoid duplicates
    const existingInvitations = await prisma.invitation.findMany({
      where: { projectId },
      select: { subcontractorId: true }
    })

    const existingSubcontractorIds = existingInvitations.map(inv => inv.subcontractorId)
    const newSubcontractorIds = validSubcontractorIds.filter(
      id => !existingSubcontractorIds.includes(id)
    )

    if (newSubcontractorIds.length === 0) {
      return NextResponse.json(
        { error: 'All selected subcontractors have already been invited' },
        { status: 400 }
      )
    }

    // Create invitations
    const newInvitations = await prisma.invitation.createMany({
      data: newSubcontractorIds.map(subcontractorId => ({
        projectId,
        subcontractorId,
        status: 'PENDING' as const,
      }))
    })

    // User successfully sent invitations for project

    // Create notifications for invited subcontractors
    for (const subcontractorId of newSubcontractorIds) {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId: subcontractorId,
            type: 'INVITATION',
            title: 'New Project Invitation',
            message: `You've been invited to bid on "${project.title}"`,
            link: `/opportunities`,
            read: false,
            createdAt: new Date(),
          }
        })

        // Broadcast notification via WebSocket for real-time updates
        try {
          await broadcastNotification(subcontractorId, notification)
        } catch (broadcastError) {
          // Log broadcast error but don't fail the invitation
          logError('Notification broadcast error', broadcastError, {
            endpoint: '/api/invitations',
            errorType: 'notification_broadcast_error',
            severity: 'medium'
          })
        }
      } catch (notificationError) {
        // Log notification creation error but don't fail the invitation
        logError('Notification creation error', notificationError, {
          endpoint: '/api/invitations',
          errorType: 'notification_creation_error',
          severity: 'medium'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Invitations sent to ${newSubcontractorIds.length} subcontractors`,
      invitedCount: newSubcontractorIds.length
    })

  } catch (error) {
    logError('invitations endpoint error', error, {
      endpoint: '/api/invitations',
      errorType: 'invitations_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check for GET endpoint as well
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')

    // Authorization: Users can only view invitations they're involved with
    if (payload.role === 'CONTRACTOR') {
      // Contractors can view invitations for their own projects
      if (projectId) {
        // Verify the contractor owns this project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { createdById: true }
        })

        if (!project || project.createdById !== payload.userId) {
          return NextResponse.json(
            { error: 'Access denied. You can only view invitations for your own projects.' },
            { status: 403 }
          )
        }

        const invitations = await prisma.invitation.findMany({
          where: { projectId }
        })

        return NextResponse.json({
          success: true,
          invitations
        })
      } else {
        // If no specific project, show invitations for all their projects
        const invitations = await prisma.invitation.findMany({
          where: {
            project: {
              createdById: payload.userId
            }
          }
        })

        return NextResponse.json({
          success: true,
          invitations
        })
      }
    } else if (payload.role === 'SUBCONTRACTOR') {
      // Subcontractors can only view their own invitations
      const where: any = { subcontractorId: payload.userId }

      if (projectId) {
        where.projectId = projectId
      }

      const invitations = await prisma.invitation.findMany({ where })

      return NextResponse.json({
        success: true,
        invitations
      })
    } else {
      return NextResponse.json(
        { error: 'Access denied. Invalid user role.' },
        { status: 403 }
      )
    }

  } catch (error) {
    logError('invitations endpoint error', error, {
      endpoint: '/api/invitations',
      errorType: 'invitations_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}