import { NextRequest, NextResponse } from 'next/server'
import { db, invitations, projects, users } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { projectId, subcontractorIds, message } = await request.json()

    // Validate input
    if (!projectId || !subcontractorIds || !Array.isArray(subcontractorIds)) {
      return NextResponse.json(
        { error: 'Project ID and subcontractor IDs are required' },
        { status: 400 }
      )
    }

    // Verify project exists and is published
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

    if (project.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Can only invite to published projects' },
        { status: 400 }
      )
    }

    // For now, let's assume all provided IDs are valid subcontractors
    // In production, you'd want to verify each ID exists and is a subcontractor
    const validSubcontractorIds = subcontractorIds

    if (validSubcontractorIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid subcontractors found' },
        { status: 400 }
      )
    }

    // Check for existing invitations to avoid duplicates
    const existingInvitations = await db
      .select()
      .from(invitations)
      .where(eq(invitations.projectId, projectId))

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
    const newInvitations = await db
      .insert(invitations)
      .values(
        newSubcontractorIds.map(subcontractorId => ({
          projectId,
          subcontractorId,
          status: 'PENDING' as const,
        }))
      )
      .returning()

    // TODO: Send email notifications to subcontractors
    // This would integrate with your email service
    
    return NextResponse.json({
      success: true,
      invitations: newInvitations,
      message: `Successfully sent ${newInvitations.length} invitation${newInvitations.length !== 1 ? 's' : ''}`
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to send invitations:', error)
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')

    let whereConditions = []

    if (userId) {
      whereConditions.push(eq(invitations.subcontractorId, userId))
    }

    if (projectId) {
      whereConditions.push(eq(invitations.projectId, projectId))
    }

    const result = whereConditions.length > 0 
      ? await db.select().from(invitations).where(and(...whereConditions))
      : await db.select().from(invitations)

    return NextResponse.json({
      success: true,
      invitations: result
    })

  } catch (error) {
    console.error('Failed to fetch invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}