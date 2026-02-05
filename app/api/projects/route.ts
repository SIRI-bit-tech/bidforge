import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'
import { handleAPIError } from '@/app/api/error-handler/route'

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
    const status = searchParams.get('status')

    // Define authorization-based filtering
    const where: any = {}

    if (payload.role === 'CONTRACTOR') {
      // Contractors see their own projects
      where.createdById = payload.userId
    } else if (payload.role === 'SUBCONTRACTOR') {
      // Subcontractors see published projects
      where.status = 'PUBLISHED'
    } else {
      return NextResponse.json(
        { error: 'Access denied. Invalid user role.' },
        { status: 403 }
      )
    }

    // Apply additional status filter if specified, but respect role-enforced restrictions
    if (status && ['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED'].includes(status)) {
      // Only apply status filter if no role-enforced status exists, or if role permits overriding
      if (!where.status || payload.role === 'CONTRACTOR') {
        where.status = status as any
      }
    }

    // Get projects with their trades using Prisma
    const projects = await prisma.project.findMany({
      where,
      include: {
        trades: {
          include: {
            trade: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format the result to match the expected interface (flattening trades and serializing Decimals)
    const result = projects.map((project: any) => ({
      ...project,
      budgetMin: project.budgetMin?.toString() || null,
      budgetMax: project.budgetMax?.toString() || null,
      createdBy: project.createdById,
      trades: project.trades.map((pt: any) => pt.trade.name)
    }))

    return NextResponse.json({
      success: true,
      projects: result
    })

  } catch (error) {
    return handleAPIError(error as Error, request, {
      method: 'GET',
      userId: payload?.userId || 'unknown',
      userRole: payload?.role || 'unknown',
      errorType: 'projects_fetch_error',
      severity: 'medium'
    })
  }
}

export async function POST(request: NextRequest) {
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

    if (payload.role !== 'CONTRACTOR') {
      return NextResponse.json(
        { error: 'Access denied. Only contractors can create projects.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, location, budgetMin, budgetMax, startDate, endDate, deadline, status, trades } = body

    if (!title || !description || !location || !deadline) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, location, deadline' },
        { status: 400 }
      )
    }

    // Use Prisma transaction for project and trades creation
    const project = await prisma.$transaction(async (tx: any) => {
      // Create project
      const createdProject = await tx.project.create({
        data: {
          title,
          description,
          location,
          budgetMin: budgetMin ? Number(budgetMin) : null,
          budgetMax: budgetMax ? Number(budgetMax) : null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          deadline: new Date(deadline),
          createdById: payload.userId,
          status: status || 'DRAFT',
        }
      })

      // Link trades if provided
      if (trades && Array.isArray(trades) && trades.length > 0) {
        for (const tradeName of trades) {
          const trade = await tx.trade.upsert({
            where: { name: tradeName },
            update: {},
            create: { name: tradeName }
          })

          await tx.projectTrade.create({
            data: {
              projectId: createdProject.id,
              tradeId: trade.id
            }
          })
        }
      }

      return createdProject
    })

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        budgetMin: project.budgetMin?.toString() || null,
        budgetMax: project.budgetMax?.toString() || null,
      }
    }, { status: 201 })

  } catch (error) {
    return handleAPIError(error as Error, request, {
      method: 'POST',
      userId: payload?.userId || 'unknown',
      userRole: payload?.role || 'unknown',
      errorType: 'project_creation_error',
      severity: 'high'
    })
  }
}