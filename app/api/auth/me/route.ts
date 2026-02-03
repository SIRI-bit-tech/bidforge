import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/services/auth'
import prisma from '@/lib/prisma'
import { logError } from '@/lib/logger'

export async function GET(request: NextRequest) {
  let token: string | undefined
  let payload: any
  
  try {
    // Get token from HTTP-only cookie
    token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      )
    }

    // Verify JWT token
    payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Fetch current user data from database using Prisma
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      // User no longer exists, clear the cookie
      const response = NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
      response.cookies.delete('auth-token')
      return response
    }

    // Return user data
    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    // Log database/auth errors with email notification
    logError('Session verification failed', error, {
      endpoint: '/api/auth/me',
      userId: payload?.userId || 'unknown',
      hasToken: !!token,
      errorType: 'session_verification',
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })
    
    return NextResponse.json(
      { error: 'Session verification failed' },
      { status: 500 }
    )
  }
}