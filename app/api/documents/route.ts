import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'

export async function POST(request: NextRequest) {
  try {
    // 1. Extract and verify authenticated user
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      // Document upload attempt without authentication token
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      // Document upload attempt with invalid token
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { projectId, name, type, url, size } = await request.json()

    // 4. Adjust input validation - no longer require uploadedBy from client
    if (!projectId || !name || !type || !url) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, name, type, url' },
        { status: 400 }
      )
    }

    // 2. Validate user has access to the project
    // Check if user is project owner OR has submitted a bid to the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        createdById: true,
        bids: {
          where: { subcontractorId: payload.userId },
          select: { id: true }
        }
      }
    })

    if (!project) {
      // User attempted to upload document to non-existent project
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user has access (is owner OR has submitted a bid)
    const isOwner = project.createdById === payload.userId
    const hasBid = project.bids.length > 0
    const hasAccess = isOwner || hasBid

    if (!hasAccess) {
      // User attempted unauthorized document upload to project
      return NextResponse.json(
        { error: 'Access denied. You must be the project owner or have submitted a bid to upload documents.' },
        { status: 403 }
      )
    }

    // 3. User & Company Access Validation
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        companyId: true,
        company: {
          select: {
            plan: true,
            storageUsed: true
          }
        }
      }
    })

    if (!user || !user.companyId || !user.company) {
      return NextResponse.json(
        { error: 'User must belong to a company to upload documents' },
        { status: 400 }
      )
    }

    // Define Quotas (in Bytes)
    const QUOTAS = {
      FREE: 50 * 1024 * 1024, // 50MB
      PRO: 10 * 1024 * 1024 * 1024, // 10GB
      ENTERPRISE: Number.MAX_SAFE_INTEGER, // Unlimited
    }

    const currentPlan = user.company.plan as keyof typeof QUOTAS
    const limit = QUOTAS[currentPlan]
    const sizeInBytes = size || 0

    if ((user.company.storageUsed || 0) + sizeInBytes > limit) {
      return NextResponse.json(
        { error: `Storage quota exceeded for ${currentPlan} plan. Please upgrade or delete old files.` },
        { status: 403 }
      )
    }

    // 4. Insert Document and Update Storage in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const newDocument = await tx.document.create({
        data: {
          projectId,
          name,
          type,
          url,
          size: sizeInBytes,
          uploadedById: payload.userId,
          version: 1,
        }
      })

      // Update Company Storage Usage
      await tx.company.update({
        where: { id: user.companyId! },
        data: {
          storageUsed: {
            increment: sizeInBytes
          },
          updatedAt: new Date(),
        }
      })

      return newDocument
    })

    // Document uploaded successfully

    return NextResponse.json({ document: result }, { status: 201 })
  } catch (error) {
    logError('documents endpoint error', error, {
      endpoint: '/api/documents',
      errorType: 'documents_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Failed to save document' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Retrieve current user/session at the top of the handler
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to the requested project
    // Check if project belongs to or is shared with the user
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        createdById: true,
        bids: {
          where: { subcontractorId: payload.userId },
          select: { id: true }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user is project owner OR has submitted a bid (project access)
    const isOwner = project.createdById === payload.userId
    const hasBid = project.bids.length > 0
    const hasAccess = isOwner || hasBid

    if (!hasAccess) {
      // User attempted unauthorized document access to project
      return NextResponse.json(
        { error: 'Access denied. You must be the project owner or have submitted a bid to access documents.' },
        { status: 403 }
      )
    }

    // Only proceed to fetch and return documents when access check passes
    const projectDocuments = await prisma.document.findMany({
      where: { projectId },
      orderBy: { uploadedAt: 'desc' }
    })

    return NextResponse.json({ documents: projectDocuments })
  } catch (error) {
    logError('documents endpoint error', error, {
      endpoint: '/api/documents',
      errorType: 'documents_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}