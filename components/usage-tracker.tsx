"use client"

import { useStore } from "@/lib/store"
import { usePlanLimits } from "@/hooks/use-plan-limits"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Calendar, TrendingUp, Zap } from "lucide-react"

export function UsageTracker() {
    const { currentUser, companies, projects, bids } = useStore()
    const { userPlan } = usePlanLimits()
    const router = useRouter()

    if (!currentUser) return null

    const company = companies.find((c) => c.id === currentUser.companyId)
    const isContractor = currentUser.role === "CONTRACTOR"

    // Calculate next reset date (first day of next month)
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Contractor usage
    const activeProjects = projects.filter(
        (p) => (p.createdBy === currentUser.id || p.createdById === currentUser.id) && p.status === "PUBLISHED"
    ).length
    const contractorLimit = userPlan === "FREE" ? 1 : Infinity

    // Subcontractor usage
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlyBids = bids.filter(
        (b) =>
            b.subcontractorId === currentUser.id &&
            b.status === "SUBMITTED" &&
            b.submittedAt &&
            new Date(b.submittedAt) >= firstDayOfMonth
    ).length
    const subcontractorLimit = userPlan === "FREE" ? 2 : Infinity

    const currentUsage = isContractor ? activeProjects : monthlyBids
    const maxLimit = isContractor ? contractorLimit : subcontractorLimit
    const usagePercent = maxLimit === Infinity ? 0 : (currentUsage / maxLimit) * 100
    const isAtLimit = currentUsage >= maxLimit && maxLimit !== Infinity

    if (userPlan !== "FREE") return null // Only show for FREE users

    return (
        <Card className="border-warning/20 bg-warning/5">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-warning" />
                        <CardTitle className="text-base">Usage This Month</CardTitle>
                    </div>
                    {isAtLimit && (
                        <span className="text-xs font-bold text-warning uppercase tracking-wider">Limit Reached</span>
                    )}
                </div>
                <CardDescription className="text-xs">
                    {isContractor ? "Active Projects" : "Bid Submissions"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold">
                            {currentUsage} / {maxLimit === Infinity ? "∞" : maxLimit}
                        </span>
                        {maxLimit !== Infinity && (
                            <span className="text-xs text-muted-foreground">{Math.round(usagePercent)}% used</span>
                        )}
                    </div>
                    {maxLimit !== Infinity && (
                        <Progress value={usagePercent} className="h-2" />
                    )}
                </div>

                {isAtLimit && (
                    <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-foreground">Monthly limit reached</p>
                                <p>Resets in {daysUntilReset} day{daysUntilReset !== 1 ? "s" : ""} ({nextMonth.toLocaleDateString("en-US", { month: "short", day: "numeric" })})</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => router.push("/pricing")}
                            className="w-full bg-warning hover:bg-warning/90 text-white"
                            size="sm"
                        >
                            <Zap className="h-4 w-4 mr-2" />
                            Upgrade to Pro for Unlimited Access
                        </Button>
                    </div>
                )}

                {!isAtLimit && maxLimit !== Infinity && (
                    <p className="text-xs text-muted-foreground">
                        You have <span className="font-semibold text-foreground">{maxLimit - currentUsage}</span> {isContractor ? "project slot" : "bid"}{maxLimit - currentUsage !== 1 ? "s" : ""} remaining this month.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
