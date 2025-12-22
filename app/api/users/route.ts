import { NextRequest, NextResponse } from 'next/server'
import { db, users, companies } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    // Build the base query
    const baseQuery = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        companyId: users.companyId,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)

    let result
    // Filter by role if specified
    if (role && ['CONTRACTOR', 'SUBCONTRACTOR'].includes(role)) {
      result = await baseQuery.where(eq(users.role, role as 'CONTRACTOR' | 'SUBCONTRACTOR'))
    } else {
      result = await baseQuery
    }

    return NextResponse.json({
      success: true,
      users: result
    })

  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}