import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAdminToken, calculateTrialEndDate, getTrialDaysRemaining } from "@/lib/utils/admin-auth"
import { TrialRequest, TrialResponse, TrialManagement, AdminCompany } from "@/lib/types"

/**
 * Get all trial information
 * Returns companies with trial status and management options
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminUser = await verifyAdminToken(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const filter = searchParams.get("filter") || "all" // all, active, expired, none

    const skip = (page - 1) * limit

    // Build where clause based on filter
    const where: any = {}
    const now = new Date()

    if (filter === "active") {
      where.AND = [
        { trialStartDate: { not: null } },
        { trialEndDate: { not: null } },
        { trialEndDate: { gt: now } },
      ]
    } else if (filter === "expired") {
      where.AND = [
        { trialStartDate: { not: null } },
        { trialEndDate: { not: null } },
        { trialEndDate: { lte: now } },
      ]
    } else if (filter === "none") {
      where.OR = [
        { trialStartDate: null },
        { trialEndDate: null },
      ]
    }

    // Get companies with trial information
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          users: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: {
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.company.count({ where }),
    ])

    // Format trial management data
    const trialData: TrialManagement[] = companies.map((company: any) => {
      const primaryUser = company.users?.[0]
      const daysRemaining = company.trialEndDate ? getTrialDaysRemaining(company.trialEndDate) : undefined
      const isActive = company.trialEndDate ? company.trialEndDate > now : false

      return {
        companyId: company.id,
        companyName: company.name,
        userEmail: primaryUser?.email || "No users",
        trialStartDate: company.trialStartDate,
        trialEndDate: company.trialEndDate,
        daysRemaining,
        isActive,
        canExtend: true, // Admin can always extend
      }
    })

    return NextResponse.json({
      success: true,
      data: trialData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get trials error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Grant or extend trial for a company
 * Creates new trial or extends existing one
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminUser = await verifyAdminToken(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body: TrialRequest = await request.json()
    const { companyId, days } = body

    if (!companyId || !days || days <= 0) {
      return NextResponse.json(
        { success: false, error: "Company ID and valid days are required" },
        { status: 400 }
      )
    }

    // Get company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: {
            email: true,
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Company not found" },
        { status: 404 }
      )
    }

    const now = new Date()
    let trialStartDate: Date
    let trialEndDate: Date

    // Determine start date
    if (company.trialStartDate && company.trialEndDate && company.trialEndDate > now) {
      // Extend existing active trial
      trialStartDate = company.trialStartDate
      trialEndDate = new Date(company.trialEndDate.getTime() + days * 24 * 60 * 60 * 1000)
    } else {
      // Start new trial
      trialStartDate = now
      trialEndDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    }

    // Update company with trial information
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        trialStartDate,
        trialEndDate,
        plan: "PRO", // Grant Pro access during trial
        subscriptionStatus: "TRIALING",
      },
      include: {
        users: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: {
            email: true,
          },
        },
      },
    })

    const response: TrialResponse = {
      success: true,
      message: `Trial ${company.trialStartDate ? "extended" : "granted"} for ${days} days`,
      company: {
        ...updatedCompany,
        userCount: updatedCompany.users.length,
        projectCount: 0, // Will be calculated if needed
        bidCount: 0, // Will be calculated if needed
        trialDaysRemaining: getTrialDaysRemaining(trialEndDate),
        trades: [], // Add empty array for required field
        certifications: [], // Add empty array for required field
      } as AdminCompany,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Grant trial error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Revoke trial for a company
 * Removes trial access and downgrades to free plan
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminUser = await verifyAdminToken(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Company ID is required" },
        { status: 400 }
      )
    }

    // Update company to remove trial
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        trialStartDate: null,
        trialEndDate: null,
        plan: "FREE",
        subscriptionStatus: "INACTIVE",
      },
    })

    return NextResponse.json({
      success: true,
      message: "Trial revoked successfully",
      company: updatedCompany,
    })
  } catch (error) {
    console.error("Revoke trial error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}