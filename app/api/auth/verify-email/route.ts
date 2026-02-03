import { NextRequest, NextResponse } from 'next/server'
import { generateJWT } from '@/lib/services/auth'
import prisma from '@/lib/prisma'
import { getRateLimitKey, checkRateLimit, RATE_LIMITS, formatTimeRemaining } from '@/lib/utils/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting using shared utility
    const rateLimitKey = getRateLimitKey(request, RATE_LIMITS.EMAIL_VERIFICATION.keyPrefix)
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.EMAIL_VERIFICATION)

    if (!rateLimit.allowed) {
      const resetIn = formatTimeRemaining(rateLimit.resetTime!)
      return NextResponse.json(
        { error: `Too many verification attempts. Please try again in ${resetIn}.` },
        { status: 429 }
      )
    }

    const { email, code } = await request.json()

    // Validate input
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    // Validate code format
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid verification code format' },
        { status: 400 }
      )
    }

    // Find user by email using Prisma
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Check if user is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Find valid verification code using Prisma
    const verificationRecord = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: code,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (!verificationRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Update user and mark code as used in a transaction
    try {
      await prisma.$transaction(async (tx: any) => {
        // Mark user as verified
        await tx.user.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
            updatedAt: new Date()
          }
        })

        // Mark verification code as used
        await tx.verificationCode.update({
          where: { id: verificationRecord.id },
          data: { used: true }
        })
      })

      // Generate JWT token for automatic login after verification
      const tokenPayload = {
        userId: user.id,
        role: user.role,
        companyId: user.companyId || undefined
      }
      const token = generateJWT(tokenPayload)

      // Create response with user data
      const response = NextResponse.json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: true,
          companyId: user.companyId,
        }
      })

      // Set httpOnly cookie with JWT token
      const isProduction = process.env.NODE_ENV === 'production'
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      })

      return response

    } catch (dbError) {
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 500 }
      )
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}