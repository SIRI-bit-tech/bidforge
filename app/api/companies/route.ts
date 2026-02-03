import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token found' },
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
    const skip = (page - 1) * pageSize

    // Get total count and companies with trades using Prisma
    const [total, companies] = await prisma.$transaction([
      prisma.company.count(),
      prisma.company.findMany({
        skip,
        take: pageSize,
        include: {
          trades: {
            include: {
              trade: true
            }
          },
          certifications: true
        },
        orderBy: {
          name: 'asc'
        }
      })
    ])

    const totalPages = Math.ceil(total / pageSize)

    // Format the result
    const result = companies.map((company: any) => ({
      ...company,
      trades: company.trades.map((ct: any) => ct.trade.name)
    }))

    return NextResponse.json({
      success: true,
      companies: result,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    logError('companies endpoint error', error, {
      endpoint: '/api/companies',
      errorType: 'companies_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}