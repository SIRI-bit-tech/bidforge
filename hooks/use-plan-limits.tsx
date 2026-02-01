"use client"

import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function usePlanLimits() {
    const { currentUser, companies, projects, bids } = useStore()
    const { toast } = useToast()
    const router = useRouter()

    const company = companies.find((c) => c.id === currentUser?.companyId)
    const userPlan = company?.plan || "FREE"

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
                new Date(b.updatedAt) >= firstDayOfMonth
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
        toast({
            title,
            description,
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

    return { checkLimit, userPlan, limits: (limits as any)[currentUser?.role || "CONTRACTOR"][userPlan] }
}
