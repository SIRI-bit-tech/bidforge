import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAdminToken } from "@/lib/utils/admin-auth"
import { WaitlistRequest, WaitlistResponse, WaitlistEntry } from "@/lib/types"

/**
 * Get all waitlist entries
 * Returns paginated list of waitlist emails with usage status
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
    const filter = searchParams.get("filter") || "all" // all, used, unused

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.email = {
        contains: search,
        mode: "insensitive",
      }
    }

    if (filter === "used") {
      where.isUsed = true
    } else if (filter === "unused") {
      where.isUsed = false
    }

    // Get waitlist entries with pagination
    const [entries, total] = await Promise.all([
      prisma.waitlist.findMany({
        where,
        orderBy: { addedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.waitlist.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get waitlist error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Add email to waitlist
 * Creates a new waitlist entry for early access
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

    const body: WaitlistRequest = await request.json()
    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already in waitlist" },
        { status: 409 }
      )
    }

    // Create waitlist entry
    const entry = await prisma.waitlist.create({
      data: {
        email: email.toLowerCase(),
        addedBy: adminUser.id,
      },
    })

    const response: WaitlistResponse = {
      success: true,
      message: "Email added to waitlist successfully",
      entry,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Add waitlist error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Bulk add emails to waitlist
 * Accepts array of emails for batch processing
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
    const { emails } = body

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { success: false, error: "Array of emails is required" },
        { status: 400 }
      )
    }

    // Validate and normalize emails
    const validEmails = emails
      .filter((email) => email && email.includes("@"))
      .map((email) => email.toLowerCase())

    if (validEmails.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid emails provided" },
        { status: 400 }
      )
    }

    // Get existing emails to avoid duplicates
    const existing = await prisma.waitlist.findMany({
      where: {
        email: {
          in: validEmails,
        },
      },
      select: { email: true },
    })

    const existingEmails = new Set(existing.map((e: { email: string }) => e.email))
    const newEmails = validEmails.filter((email) => !existingEmails.has(email))

    if (newEmails.length === 0) {
      return NextResponse.json(
        { success: false, error: "All emails already in waitlist" },
        { status: 409 }
      )
    }

    // Bulk create waitlist entries
    await prisma.waitlist.createMany({
      data: newEmails.map((email) => ({
        email,
        addedBy: adminUser.id,
      })),
    })

    return NextResponse.json({
      success: true,
      message: `Added ${newEmails.length} emails to waitlist`,
      added: newEmails.length,
      skipped: validEmails.length - newEmails.length,
    })
  } catch (error) {
    console.error("Bulk add waitlist error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}