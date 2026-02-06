import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAdminToken } from "@/lib/utils/admin-auth"
import { AdminUser } from "@/lib/types"
import { logInfo } from "@/lib/logger"
import { Prisma } from "@prisma/client"

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

    // Fetch the target user first to verify existence
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // Validate allowed updates
    const allowedRoles = ["CONTRACTOR", "SUBCONTRACTOR", "ADMIN"]
    const allowedFields = ["name", "email", "emailVerified"]
    const filteredUpdates: any = {}

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value
      } else if (key === "role") {
        // Special handling for role updates
        if (!allowedRoles.includes(value as string)) {
          return NextResponse.json(
            { success: false, error: `Invalid role value: ${value}. Allowed roles: ${allowedRoles.join(", ")}` },
            { status: 400 }
          )
        }

        if (value === "ADMIN") {
          return NextResponse.json(
            { success: false, error: "Cannot promote users to ADMIN role via this endpoint" },
            { status: 403 }
          )
        }

        if (targetUser.role !== value) {
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

    // Log role change audit entry AFTER successful update
    if (filteredUpdates.role && targetUser.role !== filteredUpdates.role) {
      logInfo("Admin changed user role", {
        adminId: adminUser.id,
        targetUserId: userId,
        oldRole: targetUser.role,
        newRole: updatedUser.role,
        timestamp: new Date().toISOString()
      })
    }

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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            error: "Email already in use. Please choose a different email address."
          },
          { status: 409 }
        )
      }
    }

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