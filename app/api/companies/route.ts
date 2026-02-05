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

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name, type, address, phone, website, description, trades } = body

    if (!name || !type || !address || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, address, phone' },
        { status: 400 }
      )
    }

    // Create company using Prisma transaction with increased timeout
    const result = await prisma.$transaction(async (tx) => {
      // Create the company
      const company = await tx.company.create({
        data: {
          name,
          type,
          address,
          phone,
          website: website || null,
          description: description || null,
        }
      })

      // Add trades if provided - optimize by batching operations
      if (trades && trades.length > 0) {
        // Get existing trades and create missing ones in batch
        const existingTrades = await tx.trade.findMany({
          where: {
            name: { in: trades }
          }
        })

        const existingTradeNames = existingTrades.map(t => t.name)
        const missingTradeNames = trades.filter((name: string) => !existingTradeNames.includes(name))

        // Create missing trades in batch
        if (missingTradeNames.length > 0) {
          await tx.trade.createMany({
            data: missingTradeNames.map((name: string) => ({ name })),
            skipDuplicates: true
          })
        }

        // Get all trade IDs
        const allTrades = await tx.trade.findMany({
          where: {
            name: { in: trades }
          }
        })

        // Create company-trade relationships in batch
        await tx.companyTrade.createMany({
          data: allTrades.map(trade => ({
            companyId: company.id,
            tradeId: trade.id
          })),
          skipDuplicates: true
        })
      }

      // Update user's companyId
      await tx.user.update({
        where: { id: payload.userId },
        data: { companyId: company.id }
      })

      return company
    }, {
      timeout: 15000 // Increase timeout to 15 seconds
    })

    // Fetch the complete company data with trades outside the transaction
    const completeCompany = await prisma.company.findUnique({
      where: { id: result.id },
      include: {
        trades: {
          include: {
            trade: true
          }
        },
        certifications: true
      }
    })

    // Format the result
    const formattedCompany = {
      ...completeCompany,
      trades: completeCompany?.trades.map((ct: any) => ct.trade.name) || []
    }

    return NextResponse.json({
      success: true,
      company: formattedCompany
    })

  } catch (error) {
    logError('companies POST endpoint error', error, {
      endpoint: '/api/companies',
      errorType: 'company_creation_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}