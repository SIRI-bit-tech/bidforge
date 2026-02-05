import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAdminToken } from "@/lib/utils/admin-auth"
import { AdminUser } from "@/lib/types"
import { logInfo } from "@/lib/logger"

/**
 * Get all users with admin view
 * Returns paginated list of users with company and activity information
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
    const role = searchParams.get("role") || ""
    const plan = searchParams.get("plan") || ""

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    if (role && role !== "all") {
      where.role = role
    }

    if (plan && plan !== "all") {
      where.company = {
        plan: plan,
      }
    }

    // Get users with detailed information
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          company: true,
          _count: {
            select: {
              projects: true,
              bids: true,
              sentMessages: true,
              notifications: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Format user data for admin view
    const adminUsers: AdminUser[] = users.map((user: any) => ({
      ...user,
      passwordHash: undefined, // Don't send password hash
      projectCount: user._count?.projects || 0,
      bidCount: user._count?.bids || 0,
      lastActive: user.updatedAt, // Use updatedAt as proxy for last activity
    }))

    return NextResponse.json({
      success: true,
      data: adminUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get admin users error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Update user information (admin only)
 * Allows admin to modify user details and roles
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminUser = await verifyAdminToken(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { userId, updates } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      )
    }

    // Validate allowed updates
    const allowedFields = ["name", "email", "emailVerified"] // Removed "role" to handle it separately
    const filteredUpdates: any = {}

    // First fetch the current user state if role is being updated
    let currentUserState = null
    if (Object.keys(updates).includes("role")) {
      currentUserState = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      })
    }

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value
      } else if (key === "role") {
        // Special handling for role updates
        if (value === "ADMIN") {
          return NextResponse.json(
            { success: false, error: "Cannot promote users to ADMIN role via this endpoint" },
            { status: 403 }
          )
        }

        // Audit log for role changes
        if (currentUserState && currentUserState.role !== value) {
          logInfo("Admin changed user role", {
            adminId: adminUser.id,
            targetUserId: userId,
            oldRole: currentUserState.role,
            newRole: value,
            timestamp: new Date().toISOString()
          })
          filteredUpdates[key] = value
        }
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid updates provided" },
        { status: 400 }
      )
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...filteredUpdates,
        updatedAt: new Date(),
      },
      include: {
        company: true,
        _count: {
          select: {
            projects: true,
            bids: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: {
        ...updatedUser,
        passwordHash: undefined, // Don't send password hash
        projectCount: updatedUser._count?.projects || 0,
        bidCount: updatedUser._count?.bids || 0,
      },
    })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Delete user (admin only)
 * Removes user and associated data
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
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      )
    }

    // Prevent admin from deleting themselves
    if (userId === adminUser.id) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // Get user to check if they're the only user in their company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          include: {
            users: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // If user is the only one in their company, delete the company too
    const shouldDeleteCompany = user.company && user.company.users.length === 1

    if (shouldDeleteCompany) {
      // Delete company (cascade will handle user deletion)
      await prisma.company.delete({
        where: { id: user.companyId! },
      })
    } else {
      // Just delete the user
      await prisma.user.delete({
        where: { id: userId },
      })
    }

    return NextResponse.json({
      success: true,
      message: shouldDeleteCompany
        ? "User and company deleted successfully"
        : "User deleted successfully",
    })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}