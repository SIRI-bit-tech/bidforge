"use client"

import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

/**
 * Check if user has special access (founder or trial)
 */
function hasSpecialAccess(currentUser: any, company: any): boolean {
  if (!currentUser) return false
  
  // Check if user is founder (determined server-side for security)
  const isFounder = currentUser?.isFounder || false
  
  // Check if company is in trial period
  const isInTrial = company?.trialEndDate ? 
    new Date(company.trialEndDate) > new Date() : false
  
  return isFounder || isInTrial
}

export function usePlanLimits() {
    const { currentUser, companies, projects, bids } = useStore()
    const { toast } = useToast()
    const router = useRouter()

    const company = companies.find((c) => c.id === currentUser?.companyId)
    const userPlan = company?.plan || "FREE"

    // Check if user has special access
    const hasAccess = hasSpecialAccess(currentUser, company)

    const limits = {
        CONTRACTOR: {
            FREE: {
                maxActiveProjects: 1,
                canInviteDirectly: false,
                advancedBidComparison: false,
            },
            PRO: {
                maxActiveProjects: Infinity,
                canInviteDirectly: true,
                advancedBidComparison: true,
            },
            ENTERPRISE: {
                maxActiveProjects: Infinity,
                canInviteDirectly: true,
                advancedBidComparison: true,
            }
        },
        SUBCONTRACTOR: {
            FREE: {
                maxBidsPerMonth: 2,
                priorityPlacement: false,
                verifiedBadge: false,
            },
            PRO: {
                maxBidsPerMonth: Infinity,
                priorityPlacement: true,
                verifiedBadge: true,
            },
            ENTERPRISE: {
                maxBidsPerMonth: Infinity,
                priorityPlacement: true,
                verifiedBadge: true,
            }
        }
    }

    const checkLimit = (feature: string) => {
        if (!currentUser) return false

        // Founder and trial users get full access
        if (hasAccess) return true

        const roleLimits = (limits as any)[currentUser.role][userPlan]

        if (feature === "CREATE_PROJECT") {
            const activeProjects = projects.filter(p =>
                (p.createdBy === currentUser.id || p.createdById === currentUser.id) &&
                p.status === "PUBLISHED"
            ).length

            if (activeProjects >= roleLimits.maxActiveProjects) {
                showUpgradeToast("Active Projects Limit Reached", `Your ${userPlan} plan allows for ${roleLimits.maxActiveProjects} active projects at a time.`)
                return false
            }
        }

        if (feature === "SUBMIT_BID") {
            const now = new Date()
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const monthlyBids = bids.filter(b =>
                b.subcontractorId === currentUser.id &&
                b.status === "SUBMITTED" &&
                b.submittedAt &&
                new Date(b.submittedAt) >= firstDayOfMonth
            ).length

            if (monthlyBids >= roleLimits.maxBidsPerMonth) {
                showUpgradeToast("Monthly Bid Limit Reached", `Your ${userPlan} plan allows for ${roleLimits.maxBidsPerMonth} bid submissions per month.`)
                return false
            }
        }

        if (feature === "INVITE_SUBCONTRACTOR" && !roleLimits.canInviteDirectly) {
            showUpgradeToast("Upgrade to Pro", "Direct subcontractor invitations are only available on Pro and Enterprise plans.")
            return false
        }

        if (feature === "SEND_DIRECT_MESSAGE" && userPlan === "FREE") {
            showUpgradeToast("Upgrade to Pro", "Direct messaging subcontractors is a premium feature.")
            return false
        }

        if (feature === "ADVANCED_ANALYTICS" && userPlan === "FREE") {
            showUpgradeToast("Advanced Analytics", "Detailed analytics and market reports are premium features.")
            return false
        }

        return true
    }

    const showUpgradeToast = (title: string, description: string) => {
        // Don't show upgrade prompts to founders or trial users
        if (hasAccess) return

        // Calculate next reset date for monthly limits
        const now = new Date()
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const resetDate = nextMonth.toLocaleDateString("en-US", { month: "short", day: "numeric" })

        // Check if this is a monthly limit (for subcontractors)
        const isMonthlyLimit = title.includes("Monthly") || title.includes("Bid")

        toast({
            title,
            description: isMonthlyLimit
                ? `${description}\n\nYour limit resets in ${daysUntilReset} day${daysUntilReset !== 1 ? 's' : ''} (${resetDate}).`
                : description,
            variant: "default",
            action: (
                <button
                    onClick={() => router.push("/pricing")}
                    className="bg-accent text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-accent-hover"
                >
                    Upgrade
                </button>
            )
        })
    }

    // Get effective limits (Pro limits for special access users)
    const effectiveLimits = hasAccess 
        ? (limits as any)[currentUser?.role || "CONTRACTOR"]["PRO"]
        : (limits as any)[currentUser?.role || "CONTRACTOR"][userPlan]

    return { 
        checkLimit, 
        userPlan: hasAccess ? "PRO" : userPlan, 
        limits: effectiveLimits,
        isFounder: currentUser?.isFounder || false,
        isInTrial: hasAccess && company?.trialEndDate && new Date(company.trialEndDate) > new Date(),
        hasSpecialAccess: hasAccess
    }
}
