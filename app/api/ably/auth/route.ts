import { NextRequest, NextResponse } from 'next/server'
import Ably from 'ably'
import { verifyJWT } from '@/lib/services/auth'

export const revalidate = 0

export async function GET(request: NextRequest) {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyJWT(token)
    if (!payload) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const client = new Ably.Rest(process.env.ABLY_API_KEY as string)

    try {
        const tokenRequestData = await client.auth.createTokenRequest({ clientId: payload.userId })
        return NextResponse.json(tokenRequestData)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to generate token request' }, { status: 500 })
    }
}
