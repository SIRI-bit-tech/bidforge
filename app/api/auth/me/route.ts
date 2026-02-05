import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/services/auth'
import prisma from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { isFounderEmail } from '@/lib/utils/admin-auth'

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
      include: {
        company: {
          select: {
            id: true,
            name: true,
            plan: true,
            isFounder: true,
            trialEndDate: true,
          }
        }
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

    // Return user data with founder status and company info
    // Check founder status from both company record and email verification
    const isFounderByEmail = isFounderEmail(user.email)
    const isFounderByCompany = user.company?.isFounder || false
    const actualIsFounder = isFounderByEmail || isFounderByCompany

    // If founder status is incorrect in database, fix it
    if (isFounderByEmail && user.company && !user.company.isFounder) {
      try {
        await prisma.company.update({
          where: { id: user.company.id },
          data: { 
            isFounder: true,
            plan: "PRO",
            subscriptionStatus: "ACTIVE"
          }
        })
        // Update the user.company object to reflect the changes
        user.company.isFounder = true
        user.company.plan = "PRO"
      } catch (updateError) {
        logError('Failed to update founder status in database', updateError, {
          endpoint: '/api/auth/me',
          userId: user.id,
          companyId: user.company.id,
          errorType: 'founder_status_update'
        })
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        companyId: user.companyId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isFounder: actualIsFounder,
        company: user.company ? {
          ...user.company,
          isFounder: actualIsFounder, // Ensure company also reflects correct founder status
          plan: actualIsFounder ? "PRO" : user.company.plan // Ensure founder gets Pro plan
        } : undefined
      }
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