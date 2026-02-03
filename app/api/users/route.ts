import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'

export async function GET(request: NextRequest) {
  try {
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
    const role = searchParams.get('role')
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')))
    const skip = Math.max(0, parseInt(searchParams.get('offset') || '0'))

    // Build Prisma where clause based on authorization and filters
    const where: any = {}

    if (payload.role === 'ADMIN') {
      // No restrictions
    } else if (payload.role === 'CONTRACTOR') {
      if (role === 'SUBCONTRACTOR') {
        where.role = 'SUBCONTRACTOR'
      } else if (payload.companyId) {
        where.companyId = payload.companyId
      } else {
        if (!role || role !== 'SUBCONTRACTOR') {
          return NextResponse.json(
            { error: 'Access denied. Contractors can view subcontractors or users from their company.' },
            { status: 403 }
          )
        }
      }
    } else if (payload.role === 'SUBCONTRACTOR') {
      if (role === 'SUBCONTRACTOR') {
        where.role = 'SUBCONTRACTOR'
      } else if (role === 'CONTRACTOR') {
        where.role = 'CONTRACTOR'
      } else if (payload.companyId) {
        where.companyId = payload.companyId
      } else {
        if (!role || !['SUBCONTRACTOR', 'CONTRACTOR'].includes(role)) {
          return NextResponse.json(
            { error: 'Access denied. Subcontractors can view other subcontractors, contractors, or users from their company.' },
            { status: 403 }
          )
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Access denied. Invalid user role.' },
        { status: 403 }
      )
    }

    // Role-specific filter (for valid requests)
    if (role && ['CONTRACTOR', 'SUBCONTRACTOR'].includes(role)) {
      where.role = role as any
    }

    // Get total count and users using Prisma
    const [totalCount, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          companyId: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        limit,
        offset: skip,
        total: totalCount,
        totalPages,
        hasNext: skip + limit < totalCount,
        hasPrev: skip > 0,
        currentPage: Math.floor(skip / limit) + 1
      }
    })

  } catch (error) {
    logError('users endpoint error', error, {
      endpoint: '/api/users',
      errorType: 'users_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}