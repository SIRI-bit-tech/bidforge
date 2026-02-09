import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAdminToken } from "@/lib/utils/admin-auth"
import { AdminStats } from "@/lib/types"
import { SupabaseWaitlistService } from "@/lib/services/supabase-service"

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
    const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000)

    // Get local database statistics
    const [
      totalUsers,
      totalCompanies,
      totalProjects,
      totalBids,
      activeTrials,
      planDistribution,
      userRoleDistribution,
      userGrowthRaw,
      revenueRaw,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.project.count(),
      prisma.bid.count(),
      prisma.company.count({
        where: {
          trialEndDate: {
            gt: now,
          },
        },
      }),
      prisma.company.groupBy({
        by: ["plan"],
        _count: {
          plan: true,
        },
      }),
      prisma.user.groupBy({
        by: ["role"],
        _count: {
          role: true,
        },
      }),
      // Get daily user signups for last 30 days
      prisma.$queryRaw<Array<{ date: Date; users: bigint }>>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as users
        FROM users 
        WHERE created_at >= ${thirtyOneDaysAgo.toISOString()}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `,
      // Get revenue from actual plan upgrades (PRO/ENTERPRISE only)
      prisma.$queryRaw<Array<{ date: Date; upgrades: bigint }>>`
        SELECT 
          DATE(updated_at) as date,
          COUNT(*) as upgrades
        FROM companies 
        WHERE plan IN ('PRO', 'ENTERPRISE') 
        AND updated_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE(updated_at)
        ORDER BY DATE(updated_at)
      `,
    ])

    // Convert BigInt to regular numbers
    const userGrowthData = userGrowthRaw.map((item: any) => ({
      date: item.date,
      users: Number(item.users)
    }))

    const revenueData = revenueRaw.map((item: any) => ({
      date: item.date,
      upgrades: Number(item.upgrades),
      revenue: Number(item.upgrades) * 29 // Precomputed revenue on server
    }))

    // Get waitlist stats from Supabase
    const waitlistStats = await SupabaseWaitlistService.getWaitlistStats()
    const { totalCount: waitlistTotal, convertedCount: waitlistUsed, conversionRate: waitlistConversionRate } = waitlistStats

    // Format plan distribution
    const planStats = planDistribution.reduce((acc: Record<string, number>, item: any) => {
      acc[item.plan] = Number(item._count.plan)
      return acc
    }, {} as Record<string, number>)

    // Format role distribution
    const roleStats = userRoleDistribution.reduce((acc: Record<string, number>, item: any) => {
      acc[item.role] = Number(item._count.role)
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
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          emailVerified: true,
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
      waitlistCount: waitlistTotal,
      recentSignups: userGrowthData.reduce((sum, day) => sum + Number(day.users), 0),
      conversionRate: Math.round(waitlistConversionRate * 100) / 100,
    }

    // Convert BigInt values to regular numbers before JSON serialization
    const serializedStats = {
      totalUsers: Number(totalUsers),
      totalCompanies: Number(totalCompanies),
      totalProjects: Number(totalProjects),
      totalBids: Number(totalBids),
      activeTrials: Number(activeTrials),
      waitlistCount: Number(waitlistTotal),
      recentSignups: userGrowthData.reduce((sum, day) => sum + Number(day.users), 0),
      conversionRate: Math.round(waitlistConversionRate * 100) / 100,
    }

    return NextResponse.json({
      success: true,
      stats: serializedStats,
      details: {
        userGrowthData: userGrowthData,
        revenueData: revenueData,
        planDistribution: planStats,
        roleDistribution: roleStats,
        recentActivity: {
          projects: recentProjectsList,
        },
        recent: {
          users: recentUsers,
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