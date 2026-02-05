import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
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

    // Only subcontractors can decline invitations
    if (payload.role !== 'SUBCONTRACTOR') {
      return NextResponse.json(
        { error: 'Only subcontractors can decline invitations' },
        { status: 403 }
      )
    }

    const { id: invitationId } = await params

    // Verify the invitation exists and belongs to the authenticated user
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        subcontractorId: payload.userId
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or access denied' },
        { status: 404 }
      )
    }

    // Check if invitation is still pending
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation has already been responded to' },
        { status: 400 }
      )
    }

    // Update invitation status to declined
    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: { 
        status: 'DECLINED',
        respondedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      invitation: updatedInvitation,
      message: 'Invitation declined successfully'
    })

  } catch (error) {
    // Failed to decline invitation
    return NextResponse.json(
      { error: 'Failed to decline invitation' },
      { status: 500 }
    )
  }
}