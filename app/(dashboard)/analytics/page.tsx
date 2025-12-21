"use client"

import { useStore } from "@/lib/store"
import { StatsCard } from "@/components/stats-card"
import { BarChart3, TrendingUp, Target, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/utils/format"

export default function AnalyticsPage() {
  const { currentUser, projects, bids, getBidsByProject, getBidsBySubcontractor, getProjectsByUser } = useStore()

  if (!currentUser) return null

  const isContractor = currentUser.role === "CONTRACTOR"

  // Contractor analytics
  const userProjects = getProjectsByUser(currentUser.id)
  const totalBidsReceived = userProjects.reduce((sum, p) => sum + getBidsByProject(p.id).length, 0)
  const avgBidsPerProject = userProjects.length > 0 ? (totalBidsReceived / userProjects.length).toFixed(1) : "0"
  const awardedProjects = userProjects.filter((p) => p.status === "AWARDED").length

  // Subcontractor analytics
  const userBids = getBidsBySubcontractor(currentUser.id)
  const awardedBids = userBids.filter((b) => b.status === "AWARDED")
  const winRate = userBids.length > 0 ? ((awardedBids.length / userBids.length) * 100).toFixed(1) : "0"
  const totalBidValue = userBids.reduce((sum, b) => sum + b.totalAmount, 0)
  const avgBidValue = userBids.length > 0 ? totalBidValue / userBids.length : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your performance and insights</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {isContractor ? (
          <>
            <StatsCard
              title="Total Projects"
              value={userProjects.length}
              icon={BarChart3}
              description="All time projects created"
            />
            <StatsCard
              title="Awarded Projects"
              value={awardedProjects}
              icon={Target}
              description="Contracts awarded"
              trend={{
                value: "12%",
                positive: true,
              }}
            />
            <StatsCard
              title="Total Bids Received"
              value={totalBidsReceived}
              icon={TrendingUp}
              description="Across all projects"
            />
            <StatsCard
              title="Avg Bids per Project"
              value={avgBidsPerProject}
              icon={Clock}
              description="Response rate"
            />
          </>
        ) : (
          <>
            <StatsCard title="Total Bids" value={userBids.length} icon={BarChart3} description="All submitted bids" />
            <StatsCard
              title="Win Rate"
              value={`${winRate}%`}
              icon={Target}
              description="Bids awarded vs submitted"
              trend={{
                value: "5%",
                positive: true,
              }}
            />
            <StatsCard
              title="Total Bid Value"
              value={formatCurrency(totalBidValue)}
              icon={TrendingUp}
              description="Combined value of all bids"
            />
            <StatsCard
              title="Avg Bid Amount"
              value={formatCurrency(avgBidValue)}
              icon={Clock}
              description="Average bid value"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              {isContractor
                ? "View detailed analytics about your projects, bid trends, and subcontractor performance"
                : "Track your bidding patterns, win rates, and identify opportunities for improvement"}
            </p>
            <p className="text-xs">More detailed analytics coming soon...</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Performance Insights</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              {isContractor
                ? "Identify the best performing subcontractors and optimize your bidding process"
                : "Analyze your competitive positioning and pricing strategies"}
            </p>
            <p className="text-xs">Advanced insights available in the full version...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
