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
        // Augment existing where object, don't replace it
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

    // Role-specific filter (for valid requests) - preserve existing where conditions
    if (role && ['CONTRACTOR', 'SUBCONTRACTOR'].includes(role)) {
      // Only apply role filter if caller has sufficient privileges or the role is in their allowed set
      const canFilterByRole = payload.role === 'ADMIN' ||
        (payload.role === 'CONTRACTOR' && role === 'SUBCONTRACTOR') ||
        (payload.role === 'SUBCONTRACTOR' && ['CONTRACTOR', 'SUBCONTRACTOR'].includes(role))

      if (canFilterByRole) {
        where.role = role as any
      }
    }

    // Get total count and users using Promise.all for parallel reads
    const [totalCount, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          company: {
            include: {
              trades: {
                include: {
                  trade: true
                }
              },
              certifications: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      })
    ])

    // Add isFounder field to users and format company trades
    const usersWithFounderStatus = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isFounder: user.company?.isFounder || false,
      company: user.company ? {
        id: user.company.id,
        name: user.company.name,
        type: user.company.type,
        address: user.company.address,
        phone: user.company.phone,
        website: user.company.website,
        description: user.company.description,
        logo: user.company.logo,
        verified: user.company.verified,
        plan: user.company.plan,
        isFounder: user.company.isFounder,
        trialEndDate: user.company.trialEndDate,
        trades: user.company.trades?.map((ct: any) => ct.trade.name) || [],
        certifications: user.company.certifications || []
      } : undefined,
    }))

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      users: usersWithFounderStatus,
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