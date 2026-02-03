import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, generateVerificationData, validatePasswordStrength } from '@/lib/services/auth'
import { sendVerificationEmail } from '@/lib/services/email'
import prisma from '@/lib/prisma'
import { getRateLimitKey, checkRateLimit, RATE_LIMITS, formatTimeRemaining } from '@/lib/utils/rate-limit'
import { logError } from '@/lib/logger'
import { handleAPIError } from '@/app/api/error-handler/route'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting using shared utility
    const rateLimitKey = getRateLimitKey(request, RATE_LIMITS.REGISTRATION.keyPrefix)
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.REGISTRATION)

    if (!rateLimit.allowed) {
      const resetIn = formatTimeRemaining(rateLimit.resetTime!)
      // Rate limit exceeded for registration attempt
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${resetIn}.` },
        { status: 429 }
      )
    }

    const { email, password, name, role } = await request.json()

    // Validate input
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['CONTRACTOR', 'SUBCONTRACTOR'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      )
    }

    // Check if user already exists using Prisma
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      // Registration attempt with existing email
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isValid) {
      // Environment-aware error response
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.SHOW_PASSWORD_ERRORS === 'true'

      if (isDevelopment) {
        return NextResponse.json(
          { error: 'Password does not meet requirements', details: passwordValidation.errors },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: 'Password does not meet security requirements' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate verification code
    const verificationData = generateVerificationData()

    // Create user and verification code in a transaction
    let newUser: any

    try {
      newUser = await prisma.$transaction(async (tx: any) => {
        const createdUser = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            name: name.trim(),
            passwordHash: hashedPassword,
            role: role as 'CONTRACTOR' | 'SUBCONTRACTOR',
            emailVerified: false,
          }
        })

        await tx.verificationCode.create({
          data: {
            userId: createdUser.id,
            code: verificationData.code,
            expiresAt: verificationData.expiresAt,
          }
        })

        return createdUser
      })

    } catch (dbError) {
      // Log database errors with email notification
      logError('Database error during user registration', dbError, {
        endpoint: '/api/auth/register',
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        errorType: 'registration_database_error',
        severity: 'critical'
      })

      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Send verification email (after successful DB creation)
    try {
      await sendVerificationEmail(email, verificationData.code, name)

    } catch (emailError) {
      // Log email sending errors
      logError('Failed to send verification email', emailError, {
        endpoint: '/api/auth/register',
        userId: newUser.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        errorType: 'email_sending_error',
        severity: 'medium'
      })

      return NextResponse.json(
        {
          error: 'Account created but failed to send verification email. Please try resending the verification code.',
          userId: newUser.id,
          canResend: true
        },
        { status: 207 }
      )
    }

    // Return success
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
      },
      needsVerification: true,
    }, { status: 201 })

  } catch (error) {
    return handleAPIError(error as Error, request, {
      errorType: 'registration_system_error',
      severity: 'high'
    })
  }
}