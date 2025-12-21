"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { BidCard } from "@/components/bid-card"
import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { formatCurrency, formatDate, formatTimeUntil, getTradeLabel } from "@/lib/utils/format"
import { ArrowLeft, MapPin, DollarSign, Calendar, Clock, Users, FileText } from "lucide-react"
import Link from "next/link"

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { projects, getBidsByProject, companies, users, publishProject, closeProject } = useStore()

  const project = projects.find((p) => p.id === id)
  const projectBids = project ? getBidsByProject(project.id) : []

  if (!project) {
    return (
      <EmptyState
        icon={FileText}
        title="Project not found"
        description="The project you're looking for doesn't exist or has been deleted"
        action={{
          label: "Back to Projects",
          onClick: () => router.push("/projects"),
        }}
      />
    )
  }

  const timeRemaining = formatTimeUntil(project.deadline)
  const avgBidAmount =
    projectBids.length > 0 ? projectBids.reduce((sum, b) => sum + b.totalAmount, 0) / projectBids.length : 0
  const lowestBid = projectBids.length > 0 ? Math.min(...projectBids.map((b) => b.totalAmount)) : 0
  const highestBid = projectBids.length > 0 ? Math.max(...projectBids.map((b) => b.totalAmount)) : 0

  return (
    <div>
      <div className="mb-8">
        <Link href="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">{project.title}</h1>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex gap-2">
                {project.status === "DRAFT" && (
                  <Button
                    onClick={() => {
                      publishProject(project.id)
                      router.refresh()
                    }}
                    className="bg-accent hover:bg-accent-hover text-white"
                  >
                    Publish Project
                  </Button>
                )}
                {project.status === "PUBLISHED" && (
                  <Button
                    onClick={() => {
                      closeProject(project.id)
                      router.refresh()
                    }}
                    variant="outline"
                  >
                    Close Bidding
                  </Button>
                )}
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-6">{project.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{project.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Budget: {formatCurrency(project.budget)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatDate(project.startDate)} - {formatDate(project.endDate)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className={new Date(project.deadline) < new Date() ? "text-destructive" : "text-warning"}>
                  Deadline: {timeRemaining}
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Required Trades</h3>
              <div className="flex flex-wrap gap-2">
                {project.trades.map((trade) => (
                  <span key={trade} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {getTradeLabel(trade)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Bids Received ({projectBids.length})</h2>

            {projectBids.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-border">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Average Bid</div>
                    <div className="text-lg font-bold">{formatCurrency(avgBidAmount)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Lowest Bid</div>
                    <div className="text-lg font-bold text-success">{formatCurrency(lowestBid)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Highest Bid</div>
                    <div className="text-lg font-bold text-destructive">{formatCurrency(highestBid)}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {projectBids.map((bid) => {
                    const subcontractor = users.find((u) => u.id === bid.subcontractorId)
                    const company = subcontractor ? companies.find((c) => c.id === subcontractor.companyId) : undefined
                    return <BidCard key={bid.id} bid={bid} company={company} />
                  })}
                </div>
              </>
            ) : (
              <EmptyState
                icon={Users}
                title="No bids yet"
                description="Invite subcontractors to start receiving bids for this project"
                action={{
                  label: "Invite Subcontractors",
                  onClick: () => router.push("/subcontractors"),
                }}
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">Project Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => router.push("/subcontractors")}
              >
                <Users className="h-4 w-4 mr-2" />
                Invite Subcontractors
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <FileText className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Calendar className="h-4 w-4 mr-2" />
                View Timeline
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
