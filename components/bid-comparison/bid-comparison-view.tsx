"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lock, Zap } from "lucide-react"
import { BidComparisonTable } from "./bid-comparison-table"
import { BidFilters } from "./bid-filters"
import { BidComparisonStats } from "./bid-comparison-stats"
import { usePlanLimits } from "@/hooks/use-plan-limits"
import type { Bid, Company, User } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BidComparisonViewProps {
  projectId: string
  bids: Bid[]
  companies: Company[]
  users: User[]
  onViewBid: (bidId: string) => void
  onAwardBid?: (bidId: string) => void
  canAward?: boolean
}

export function BidComparisonView({
  projectId,
  bids,
  companies,
  users,
  onViewBid,
  onAwardBid,
  canAward = false
}: BidComparisonViewProps) {
  const router = useRouter()
  const { userPlan, limits } = usePlanLimits()
  const [filteredBids, setFilteredBids] = useState<Bid[]>(bids)
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true)

  const hasAdvancedComparison = limits?.advancedBidComparison || false

  // Update filtered bids when bids prop changes (real-time updates)
  useEffect(() => {
    if (isRealTimeEnabled) {
      setFilteredBids(bids)
    }
  }, [bids, isRealTimeEnabled])

  // Only show submitted bids for comparison
  const submittedBids = filteredBids.filter(bid => bid.status === 'SUBMITTED')

  if (!hasAdvancedComparison) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Advanced Bid Comparison</span>
            <Badge variant="outline" className="text-xs bg-accent/5 text-accent border-accent/20">
              PRO FEATURE
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-hidden rounded-lg border border-border p-8 text-center">
            <div className={cn(
              "grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 transition-all duration-300",
              "blur-[3px] opacity-40 select-none grayscale"
            )}>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">SIDE-BY-SIDE</div>
                <div className="text-lg font-bold">Compare All Bids</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">SMART FILTERS</div>
                <div className="text-lg font-bold">Filter & Sort</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">REAL-TIME</div>
                <div className="text-lg font-bold">Live Updates</div>
              </div>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[1px]">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-3">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Advanced Bid Comparison</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Compare bids side-by-side with advanced filtering, sorting, and real-time updates. 
                Perfect for making informed decisions quickly.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Unlock Pro Features</span>
              </div>
              <Button
                onClick={() => router.push("/pricing")}
                className="bg-accent hover:bg-accent-hover text-white"
              >
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (bids.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bid Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No bids to compare yet.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Real-time indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">
            Live updates enabled • {bids.length} total bids
          </span>
        </div>
        <Badge variant="secondary" className="text-xs">
          Pro Feature Active
        </Badge>
      </div>

      {/* Stats Overview */}
      <BidComparisonStats bids={submittedBids} />

      {/* Filters */}
      <BidFilters 
        bids={submittedBids} 
        onFiltersChange={setFilteredBids} 
      />

      {/* Comparison Table */}
      <BidComparisonTable
        bids={filteredBids}
        companies={companies}
        users={users}
        onViewBid={onViewBid}
        onAwardBid={onAwardBid}
        canAward={canAward}
      />
    </div>
  )
}