import { NextRequest, NextResponse } from 'next/server'
import { generateVerificationData } from '@/lib/services/auth'
import { sendVerificationEmail } from '@/lib/services/email'
import prisma from '@/lib/prisma'
import { getRateLimitKey, checkRateLimit, RATE_LIMITS, formatTimeRemaining } from '@/lib/utils/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting using shared utility
    const rateLimitKey = getRateLimitKey(request, RATE_LIMITS.RESEND_CODE.keyPrefix)
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.RESEND_CODE)

    if (!rateLimit.allowed) {
      const resetIn = formatTimeRemaining(rateLimit.resetTime!)
      return NextResponse.json(
        { error: `Too many resend attempts. Please try again in ${resetIn}.` },
        { status: 429 }
      )
    }

    const { email } = await request.json()

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email using Prisma
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    // Security: Always return success to prevent user enumeration
    if (!user || user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists and is unverified, a verification code has been sent.',
      })
    }

    // Generate new verification code
    const verificationData = generateVerificationData()

    // Invalidate old codes and create new one in transaction
    try {
      await prisma.$transaction(async (tx: any) => {
        // Mark all existing unused codes for this user as used
        await tx.verificationCode.updateMany({
          where: {
            userId: user.id,
            used: false
          },
          data: {
            used: true
          }
        })

        // Insert new verification code
        await tx.verificationCode.create({
          data: {
            userId: user.id,
            code: verificationData.code,
            expiresAt: verificationData.expiresAt,
          }
        })
      })

    } catch (dbError) {
      console.error('Database error during code generation:', dbError)
      return NextResponse.json(
        { error: 'Failed to generate new verification code. Please try again.' },
        { status: 500 }
      )
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationData.code, user.name)

    } catch (error) {
      console.error("Failed to send verification email:", error)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with this email exists and is unverified, a verification code has been sent.',
    })

  } catch (error) {
    console.error('Resend code error:', error)
    return NextResponse.json(
      { error: 'Failed to resend code. Please try again.' },
      { status: 500 }
    )
  }
}