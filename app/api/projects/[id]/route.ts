import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'
import { handleAPIError } from '@/app/api/error-handler/route'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
        { error: 'Access denied. Only contractors can update projects.' },
        { status: 403 }
      )
    }

    const { id } = params

    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        trades: {
          include: {
            trade: true
          }
        }
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (existingProject.createdById !== payload.userId) {
      return NextResponse.json(
        { error: 'Access denied. You can only update your own projects.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      location,
      budgetMin,
      budgetMax,
      startDate,
      endDate,
      deadline,
      status,
      trades,
      coverImageUrl,
    } = body

    const updateData: any = {}

    if (typeof title === 'string') updateData.title = title
    if (typeof description === 'string') updateData.description = description
    if (typeof location === 'string') updateData.location = location
    if (budgetMin !== undefined) updateData.budgetMin = budgetMin ? Number(budgetMin) : null
    if (budgetMax !== undefined) updateData.budgetMax = budgetMax ? Number(budgetMax) : null
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : existingProject.deadline
    if (typeof status === 'string') updateData.status = status
    if (typeof coverImageUrl === 'string') updateData.coverImageUrl = coverImageUrl

    const updatedProject = await prisma.$transaction(async (tx: any) => {
      const project = await tx.project.update({
        where: { id },
        data: updateData,
      })

      if (Array.isArray(trades)) {
        await tx.projectTrade.deleteMany({
          where: { projectId: id },
        })

        for (const tradeName of trades) {
          const trade = await tx.trade.upsert({
            where: { name: tradeName },
            update: {},
            create: { name: tradeName },
          })

          await tx.projectTrade.create({
            data: {
              projectId: project.id,
              tradeId: trade.id,
            },
          })
        }
      }

      return project
    })

    return NextResponse.json({
      success: true,
      project: {
        ...updatedProject,
        budgetMin: updatedProject.budgetMin?.toString() || null,
        budgetMax: updatedProject.budgetMax?.toString() || null,
      },
    })
  } catch (error) {
    return handleAPIError(error as Error, request, {
      method: 'PATCH',
      userId: payload?.userId || 'unknown',
      userRole: payload?.role || 'unknown',
      errorType: 'project_update_error',
      severity: 'high',
    })
  }
}

