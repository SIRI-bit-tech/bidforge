import { NextRequest, NextResponse } from 'next/server'
import { db, companies } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'
import { logError } from '@/lib/logger'

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const { id } = params
        const token = request.cookies.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = verifyJWT(token)
        if (!payload) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        // Authorization check: Ensure user belongs to the company being updated
        // Allow override for 'ADMIN' role if it exists
        if (String(payload.companyId) !== String(id) && payload.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Access denied. You can only update your own company plan.' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { plan } = body

        if (!['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }

        // Update company plan in DB
        const updated = await db.update(companies)
            .set({
                plan,
                subscriptionStatus: 'ACTIVE',
                updatedAt: new Date()
            })
            .where(eq(companies.id, id))
            .returning()

        if (!updated.length) {
            return NextResponse.json({
                success: false,
                message: 'Company not found'
            }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            message: `Plan upgraded to ${plan}`
        })

    } catch (error) {
        logError('plan upgrade error', error, {
            endpoint: '/api/companies/[id]/plan',
            severity: 'high'
        })

        return NextResponse.json(
            { error: 'Failed to upgrade plan' },
            { status: 500 }
        )
    }
}
