import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAdminToken } from "@/lib/utils/admin-auth"
import { AdminStats } from "@/lib/types"

/**
 * Get admin dashboard analytics
 * Returns comprehensive platform statistics
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

    // Calculate date ranges
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get all statistics in parallel
    const [
      totalUsers,
      totalCompanies,
      totalProjects,
      totalBids,
      activeTrials,
      waitlistCount,
      recentSignups,
      waitlistUsed,
      recentProjects,
      recentBids,
      planDistribution,
      userRoleDistribution,
    ] = await Promise.all([
      // Total counts
      prisma.user.count(),
      prisma.company.count(),
      prisma.project.count(),
      prisma.bid.count(),

      // Active trials
      prisma.company.count({
        where: {
          trialEndDate: {
            gt: now,
          },
        },
      }),

      // Waitlist stats
      prisma.waitlist.count(),

      // Recent signups (last 7 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),

      // Waitlist conversion
      prisma.waitlist.count({
        where: {
          isUsed: true,
        },
      }),

      // Recent activity
      prisma.project.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),

      prisma.bid.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),

      // Plan distribution
      prisma.company.groupBy({
        by: ["plan"],
        _count: {
          plan: true,
        },
      }),

      // User role distribution
      prisma.user.groupBy({
        by: ["role"],
        _count: {
          role: true,
        },
      }),
    ])

    // Calculate conversion rate
    const conversionRate = waitlistCount > 0 ? (waitlistUsed / waitlistCount) * 100 : 0

    // Format plan distribution
    const planStats = planDistribution.reduce((acc: Record<string, number>, item: any) => {
      acc[item.plan] = item._count.plan
      return acc
    }, {} as Record<string, number>)

    // Format role distribution
    const roleStats = userRoleDistribution.reduce((acc: Record<string, number>, item: any) => {
      acc[item.role] = item._count.role
      return acc
    }, {} as Record<string, number>)

    // Get recent activity details
    const [recentUsers, recentCompanies, recentProjectsList] = await Promise.all([
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          company: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),

      prisma.company.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),

      prisma.project.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          createdBy: {
            include: {
              company: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ])

    const stats: AdminStats = {
      totalUsers,
      totalCompanies,
      totalProjects,
      totalBids,
      activeTrials,
      waitlistCount,
      recentSignups,
      conversionRate: Math.round(conversionRate * 100) / 100,
    }

    return NextResponse.json({
      success: true,
      stats,
      details: {
        planDistribution: planStats,
        roleDistribution: roleStats,
        recentActivity: {
          projects: recentProjects,
          bids: recentBids,
        },
        recent: {
          users: recentUsers.map(user => ({
            ...user,
            passwordHash: undefined, // Don't send password hash
          })),
          companies: recentCompanies,
          projects: recentProjectsList,
        },
      },
    })
  } catch (error) {
    console.error("Admin analytics error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}