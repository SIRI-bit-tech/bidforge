import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/utils/admin-auth"
import { WaitlistRequest, WaitlistResponse, WaitlistEntry } from "@/lib/types"
import { SupabaseWaitlistService } from "@/lib/services/supabase-service"

/**
 * Get all waitlist entries from Supabase
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

    // Get waitlist entries with server-side filtering and pagination
    const offset = (page - 1) * limit
    const { entries, total } = await SupabaseWaitlistService.getEntriesWithFilters({
      search,
      filter,
      limit,
      offset
    })

    const paginatedEntries = entries

    return NextResponse.json({
      success: true,
      data: paginatedEntries,
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
 * Add email to waitlist (Supabase)
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

    // Add to Supabase waitlist
    const entry = await SupabaseWaitlistService.addToWaitlist(email, {
      addedBy: adminUser.id,
    })

    const response: WaitlistResponse = {
      success: true,
      message: "Email added to waitlist successfully",
      entry,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Add waitlist error:", error)
    const errorMessage = error.message || "Internal server error"

    // Handle duplicate email error
    if (errorMessage.includes("duplicate") || errorMessage.includes("already exists")) {
      return NextResponse.json(
        { success: false, error: "Email already in waitlist" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * Bulk add emails to waitlist (Supabase)
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

    // Add each email individually to Supabase
    let addedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const email of validEmails) {
      try {
        await SupabaseWaitlistService.addToWaitlist(email, {
          addedBy: adminUser.id,
        })
        addedCount++
      } catch (error: any) {
        skippedCount++
        errors.push(`${email}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Added ${addedCount} emails to waitlist`,
      added: addedCount,
      skipped: skippedCount,
    })
  } catch (error) {
    console.error("Bulk add waitlist error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}