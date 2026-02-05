import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { AdminLoginRequest, AdminLoginResponse } from "@/lib/types"

const JWT_SECRET = process.env.JWT_SECRET!
const ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Admin login endpoint
 * Authenticates admin users and creates secure sessions
 */
import { getRateLimitKey, checkRateLimit, RATE_LIMITS, formatTimeRemaining } from "@/lib/utils/rate-limit"
import { cache } from "@/lib/cache/redis"

// ... imports

/**
 * Admin login endpoint
 * Authenticates admin users and creates secure sessions
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitKey = getRateLimitKey(request, RATE_LIMITS.LOGIN.keyPrefix)
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.LOGIN)

    if (!rateLimit.allowed) {
      const resetIn = formatTimeRemaining(rateLimit.resetTime!)
      return NextResponse.json(
        { success: false, error: `Too many login attempts. Please try again in ${resetIn}.` },
        { status: 429 }
      )
    }

    const body: AdminLoginRequest = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Find admin user
    const user = await prisma.user.findFirst({
      where: {
        email,
        role: "ADMIN",
      },
      include: {
        company: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Reset rate limit on successful login
    await cache.del(rateLimitKey)

    // Create session token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    )

    // Store session in database
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION)
    await prisma.adminSession.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    })

    // Clean up expired sessions
    await prisma.adminSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })

    const response = NextResponse.json({
      success: true,
      user: {
        ...user,
        passwordHash: undefined, // Don't send password hash
      } as any,
    })

    // Set HTTP-only cookie
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_DURATION / 1000, // Convert to seconds
    })

    return response
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Admin logout endpoint
 * Invalidates the current session
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("admin_token")?.value
    if (!token) {
      return NextResponse.json({ success: true }) // Already logged out effectively
    }

    // Remove session from database
    await prisma.adminSession.deleteMany({
      where: { token },
    })

    const response = NextResponse.json({ success: true })
    response.cookies.delete("admin_token")

    return response
  } catch (error) {
    console.error("Admin logout error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Verify admin session endpoint
 * Checks if the current token is valid
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("admin_token")?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No token provided" },
        { status: 401 }
      )
    }

    // Verify session exists and is not expired
    const session = await prisma.adminSession.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          include: {
            company: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        ...session.user,
        passwordHash: undefined, // Don't send password hash
      },
    })
  } catch (error) {
    console.error("Admin session verification error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}