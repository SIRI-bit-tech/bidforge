import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'
import { broadcastNotification } from '@/lib/socket/server'
import { logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  let payload: any
  let projectId: string | undefined = undefined

  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    if (payload.role !== 'SUBCONTRACTOR') {
      return NextResponse.json(
        { error: 'Only subcontractors can submit bids' },
        { status: 403 }
      )
    }

    const requestBody = await request.json()
    projectId = requestBody.projectId
    const { totalAmount, notes, lineItems, alternates, completionTime } = requestBody

    if (!projectId || !totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Project ID and valid total amount are required' },
        { status: 400 }
      )
    }

    // Verify project exists and is published
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        createdById: true,
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (project.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Can only bid on published projects' },
        { status: 400 }
      )
    }

    if (new Date() > new Date(project.deadline)) {
      return NextResponse.json(
        { error: 'Bidding deadline has passed' },
        { status: 400 }
      )
    }

    // Check for existing bid
    const existingBid = await prisma.bid.findFirst({
      where: {
        projectId,
        subcontractorId: payload.userId
      }
    })

    if (existingBid) {
      return NextResponse.json(
        { error: 'You have already submitted a bid for this project' },
        { status: 400 }
      )
    }

    // Create the bid, line items, alternates, and notification in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const newBid = await tx.bid.create({
        data: {
          projectId,
          subcontractorId: payload.userId,
          totalAmount: totalAmount,
          status: 'SUBMITTED',
          notes: notes || null,
          completionTime: completionTime || null,
          submittedAt: new Date(),
        }
      })

      // Optional: create line items if provided
      if (Array.isArray(lineItems) && lineItems.length > 0) {
        await tx.lineItem.createMany({
          data: lineItems.map((item: any, index: number) => ({
            bidId: newBid.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: String(Number(item.quantity) * Number(item.unitPrice)),
            notes: item.notes || null,
            sortOrder: index,
          })),
        })
      }

      // Optional: create alternates if provided
      if (Array.isArray(alternates) && alternates.length > 0) {
        await tx.alternate.createMany({
          data: alternates.map((alt: any) => ({
            bidId: newBid.id,
            description: alt.description,
            adjustmentAmount: alt.adjustmentAmount,
            notes: alt.notes || null,
          })),
        })
      }

      const notification = await tx.notification.create({
        data: {
          userId: project.createdById,
          type: 'BID_SUBMITTED',
          title: 'New Bid Received',
          message: `A new bid has been submitted for "${project.title}"`,
          link: `/projects/${projectId}/bids/${newBid.id}`,
          read: false,
          createdAt: new Date(),
        }
      })

      return { newBid, notification }
    })

    // Async broadcast
    try {
      await broadcastNotification(project.createdById, result.notification)
    } catch (e) {
      console.error('Failed to broadcast notification:', e)
    }

    return NextResponse.json({
      success: true,
      bid: {
        ...result.newBid,
        totalAmount: result.newBid.totalAmount.toString()
      },
      message: 'Bid submitted successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Bid submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit bid' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  let payload: any

  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    const where: any = {}

    if (payload.role === 'CONTRACTOR') {
      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { createdById: true }
        })

        if (!project || project.createdById !== payload.userId) {
          return NextResponse.json(
            { error: 'Access denied. You can only view bids for your own projects.' },
            { status: 403 }
          )
        }
        where.projectId = projectId
      } else {
        where.project = { createdById: payload.userId }
      }
    } else if (payload.role === 'SUBCONTRACTOR') {
      where.subcontractorId = payload.userId
      if (projectId) {
        where.projectId = projectId
      }
    } else {
      return NextResponse.json(
        { error: 'Access denied. Invalid user role.' },
        { status: 403 }
      )
    }

    const bids = await prisma.bid.findMany({
      where,
      include: {
        project: {
          select: { title: true }
        },
        subcontractor: {
          select: { name: true, email: true }
        },
        lineItems: true,
        alternates: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Serialize Decimals
    const formattedBids = bids.map((bid: any) => ({
      ...bid,
      totalAmount: bid.totalAmount.toString(),
      lineItems: (bid.lineItems || []).map((item: any) => ({
        ...item,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
      alternates: (bid.alternates || []).map((alt: any) => ({
        ...alt,
        adjustmentAmount: alt.adjustmentAmount.toString(),
      })),
    }))

    return NextResponse.json({
      success: true,
      bids: formattedBids
    })

  } catch (error) {
    console.error('Failed to fetch bids:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bids' },
      { status: 500 }
    )
  }
}
