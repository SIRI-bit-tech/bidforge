import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import jwt from "jsonwebtoken"
import { AdminUser } from "@/lib/types"

const JWT_SECRET = process.env.JWT_SECRET!

/**
 * Verify admin authentication token
 * Returns admin user if valid, null if invalid
 */
export async function verifyAdminToken(request: NextRequest): Promise<AdminUser | null> {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (decoded.role !== "ADMIN") {
      return null
    }

    // Check if session exists and is not expired
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

    if (!session || session.user.role !== "ADMIN") {
      return null
    }

    return {
      ...session.user,
      company: session.user.company ? {
        ...session.user.company,
        trades: [], // Will be populated if needed
        certifications: [], // Will be populated if needed
      } : undefined,
    } as AdminUser
  } catch (error) {
    console.error("Admin token verification error:", error)
    return null
  }
}

/**
 * Check if user is founder based on environment variables
 * Supports multiple founder emails for testing different roles
 */
export function isFounderEmail(email: string): boolean {
  const founderEmail1 = process.env.FOUNDER_EMAIL
  const founderEmail2 = process.env.FOUNDER_EMAIL_2
  
  const emailLower = email.toLowerCase()
  
  return (
    (founderEmail1 && emailLower === founderEmail1.toLowerCase()) ||
    (founderEmail2 && emailLower === founderEmail2.toLowerCase())
  )
}

/**
 * Get trial duration from environment variable
 */
export function getTrialDays(): number {
  return parseInt(process.env.TRIAL_DAYS || "60")
}

/**
 * Calculate trial end date
 */
export function calculateTrialEndDate(startDate: Date = new Date()): Date {
  const trialDays = getTrialDays()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + trialDays)
  return endDate
}

/**
 * Check if company is currently in trial period
 */
export function isInTrialPeriod(company: { trialStartDate?: Date; trialEndDate?: Date }): boolean {
  if (!company.trialStartDate || !company.trialEndDate) {
    return false
  }

  const now = new Date()
  return now >= company.trialStartDate && now <= company.trialEndDate
}

/**
 * Calculate remaining trial days
 */
export function getTrialDaysRemaining(trialEndDate?: Date): number {
  if (!trialEndDate) return 0
  
  const now = new Date()
  const diffTime = trialEndDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}