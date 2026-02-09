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
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    if (planFilter === "free") {
      where.plan = "FREE"
    } else if (planFilter === "pro") {
      where.plan = "PRO"
    } else if (planFilter === "trial") {
      where.trialEndDate = {
        gt: new Date(),
      }
    }

    if (statusFilter === "active") {
      where.trialEndDate = {
        gt: new Date(),
      }
    } else if (statusFilter === "expired") {
      where.trialEndDate = {
        lte: new Date(),
      }
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
