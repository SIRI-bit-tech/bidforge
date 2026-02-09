import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAdminToken } from "@/lib/utils/admin-auth"

/**
 * Get all companies with pagination and filtering
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
    const search = searchParams.get("search") || ""
    const planFilter = searchParams.get("plan") || "all"
    const statusFilter = searchParams.get("status") || "all"

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { users: { some: { email: { contains: search, mode: "insensitive" } } } },
      ]
    }

    // Handle plan filter
    if (planFilter === "free") {
      where.plan = "FREE"
    } else if (planFilter === "pro") {
      where.plan = "PRO"
    } else if (planFilter === "trial") {
      // Trial filter means we only want companies with trials
      where.trialEndDate = { not: null }
    }

    // Handle status filter with proper combination logic
    if (statusFilter === "active") {
      if (planFilter === "trial") {
        // Trial + Active: trials that are currently active
        where.trialEndDate = { gt: new Date() }
      } else {
        // Active status without trial filter: any active trial
        where.trialEndDate = { gt: new Date() }
      }
    } else if (statusFilter === "expired") {
      if (planFilter === "trial") {
        // Trial + Expired: trials that have expired
        where.trialEndDate = { lte: new Date() }
      } else {
        // Expired status without trial filter: any expired trial
        where.trialEndDate = { lte: new Date() }
      }
    } else if (statusFilter === "all" && planFilter === "trial") {
      // All trials (both active and expired)
      where.trialEndDate = { not: null }
    }

    // Get companies with pagination and user counts
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: { users: true }
          }
        }
      }),
      prisma.company.count({ where }),
    ])

    // Format response
    const formattedCompanies = companies.map(company => ({
      ...company,
      userCount: company._count.users,
      trialDaysRemaining: company.trialEndDate
        ? Math.ceil((company.trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }))

    return NextResponse.json({
      success: true,
      data: formattedCompanies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get companies error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
