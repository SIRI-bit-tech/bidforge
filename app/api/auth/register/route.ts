import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, generateVerificationData, validatePasswordStrength } from '@/lib/services/auth'
import { sendVerificationEmail } from '@/lib/services/email'
import prisma from '@/lib/prisma'
import { getRateLimitKey, checkRateLimit, RATE_LIMITS, formatTimeRemaining } from '@/lib/utils/rate-limit'
import { logError } from '@/lib/logger'
import { handleAPIError } from '@/app/api/error-handler/route'
import { isFounderEmail, calculateTrialEndDate } from '@/lib/utils/admin-auth'

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

    const { email, password, name, role, companyName, companyType } = await request.json()

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

    // Check if email is in waitlist for trial access
    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { 
        email: email.toLowerCase(),
        isUsed: false 
      }
    })

    // Check if user is founder
    const isFounder = isFounderEmail(email)

    // Determine trial and plan settings
    let trialStartDate: Date | undefined
    let trialEndDate: Date | undefined
    let plan: "FREE" | "PRO" | "ENTERPRISE" = "FREE"
    let subscriptionStatus: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "INACTIVE" = "INACTIVE"

    if (isFounder) {
      // Founder gets permanent Pro access
      plan = "PRO"
      subscriptionStatus = "ACTIVE"
    } else if (waitlistEntry) {
      // Waitlist user gets trial access
      trialStartDate = new Date()
      trialEndDate = calculateTrialEndDate(trialStartDate)
      plan = "PRO"
      subscriptionStatus = "TRIALING"
    }

    // Create user, company, and verification code in a transaction
    let newUser: any

    try {
      newUser = await prisma.$transaction(async (tx: any) => {
        // Create company first
        const company = await tx.company.create({
          data: {
            name: companyName || `${name}'s Company`,
            type: companyType || (role === 'CONTRACTOR' ? 'General Contractor' : 'Subcontractor'),
            plan,
            subscriptionStatus,
            isFounder,
            trialStartDate,
            trialEndDate,
          }
        })

        // Create user
        const createdUser = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            name: name.trim(),
            passwordHash: hashedPassword,
            role: role as 'CONTRACTOR' | 'SUBCONTRACTOR',
            emailVerified: false,
            companyId: company.id,
          }
        })

        // Create verification code
        await tx.verificationCode.create({
          data: {
            userId: createdUser.id,
            code: verificationData.code,
            expiresAt: verificationData.expiresAt,
          }
        })

        // Mark waitlist entry as used if applicable
        if (waitlistEntry) {
          await tx.waitlist.update({
            where: { id: waitlistEntry.id },
            data: {
              isUsed: true,
              usedAt: new Date(),
            }
          })
        }

        return { ...createdUser, company }
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

    // Prepare response message based on access level
    let welcomeMessage = 'Account created successfully!'
    if (isFounder) {
      welcomeMessage = 'Welcome, Founder! You have full Pro access.'
    } else if (waitlistEntry) {
      welcomeMessage = 'Welcome! You have been granted 60 days of Pro access.'
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
        companyId: newUser.company.id,
      },
      needsVerification: true,
      message: welcomeMessage,
      hasTrialAccess: !!waitlistEntry,
      isFounder,
    }, { status: 201 })

  } catch (error) {
    return handleAPIError(error as Error, request, {
      errorType: 'registration_system_error',
      severity: 'high'
    })
  }
}