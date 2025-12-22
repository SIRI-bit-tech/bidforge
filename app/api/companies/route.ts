import { NextRequest, NextResponse } from 'next/server'
import { db, companies, companyTrades, trades } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Get companies with their trades
    const companiesWithTrades = await db
      .select({
        id: companies.id,
        name: companies.name,
        type: companies.type,
        address: companies.address,
        city: companies.city,
        state: companies.state,
        zip: companies.zip,
        phone: companies.phone,
        website: companies.website,
        description: companies.description,
        logo: companies.logo,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
        tradeName: trades.name,
      })
      .from(companies)
      .leftJoin(companyTrades, eq(companies.id, companyTrades.companyId))
      .leftJoin(trades, eq(companyTrades.tradeId, trades.id))

    // Group trades by company
    const companiesMap = new Map()
    
    companiesWithTrades.forEach(row => {
      if (!companiesMap.has(row.id)) {
        companiesMap.set(row.id, {
          id: row.id,
          name: row.name,
          type: row.type,
          address: row.address,
          city: row.city,
          state: row.state,
          zip: row.zip,
          phone: row.phone,
          website: row.website,
          description: row.description,
          logo: row.logo,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          trades: [],
          certifications: [], // TODO: Add certifications if needed
        })
      }
      
      if (row.tradeName) {
        const company = companiesMap.get(row.id)
        if (!company.trades.includes(row.tradeName)) {
          company.trades.push(row.tradeName)
        }
      }
    })

    const result = Array.from(companiesMap.values())

    return NextResponse.json({
      success: true,
      companies: result
    })

  } catch (error) {
    console.error('Failed to fetch companies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}