import { NextRequest, NextResponse } from 'next/server'
import { db, companies } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { verifyJWT } from '@/lib/services/auth'
import { logError } from '@/lib/logger'

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const token = request.cookies.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = verifyJWT(token)
        if (!payload) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        const body = await request.json()
        const { plan } = body

        if (!['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }

        // Update company plan in DB
        await db.update(companies)
            .set({
                plan,
                subscriptionStatus: 'ACTIVE',
                updatedAt: new Date()
            })
            .where(eq(companies.id, id))

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
