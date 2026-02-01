"use client"

import { useStore } from "@/lib/store"
import { StatsCard } from "@/components/stats-card"
import { ProjectCard } from "@/components/project-card"
import { BidCard } from "@/components/bid-card"
import { EmptyState } from "@/components/empty-state"
import { Folder, DollarSign, TrendingUp, Clock, Plus, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils/format"
import { UsageTracker } from "@/components/usage-tracker"

export default function DashboardPage() {
  const router = useRouter()
  const {
    currentUser,
    projects,
    bids,
    invitations,
    companies,
    users,
    getBidsByProject,
    getBidsBySubcontractor,
    getInvitationsBySubcontractor,
  } = useStore()

  if (!currentUser) return null

  const isContractor = currentUser.role === "CONTRACTOR"

  // Contractor stats
  const userProjects = projects.filter((p) => p.createdBy === currentUser.id)
  const activeProjects = userProjects.filter((p) => p.status === "PUBLISHED")
  const totalBidsReceived = userProjects.reduce((sum, p) => sum + getBidsByProject(p.id).length, 0)
  const avgBidsPerProject = userProjects.length > 0 ? (totalBidsReceived / userProjects.length).toFixed(1) : "0"

  // Subcontractor stats
  const userBids = getBidsBySubcontractor(currentUser.id)
  const submittedBids = userBids.filter((b) => b.status === "SUBMITTED" || b.status === "UNDER_REVIEW")
  const awardedBids = userBids.filter((b) => b.status === "AWARDED")
  const pendingInvitations = getInvitationsBySubcontractor(currentUser.id).filter((inv) => inv.status === "PENDING")
  const totalBidValue = userBids.reduce((sum, b) => sum + b.totalAmount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {isContractor ? "Manage your projects and review bids" : "Track your bids and opportunities"}
          </p>
        </div>
        {isContractor && (
          <Button onClick={() => router.push("/projects/new")} className="bg-accent hover:bg-accent-hover text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {isContractor ? (
          <>
            <StatsCard
              title="Active Projects"
              value={activeProjects.length}
              icon={Folder}
              description="Currently accepting bids"
            />
            <StatsCard title="Total Projects" value={userProjects.length} icon={Folder} description="All time" />
            <StatsCard
              title="Bids Received"
              value={totalBidsReceived}
              icon={TrendingUp}
              description="Across all projects"
            />
            <StatsCard
              title="Avg Bids/Project"
              value={avgBidsPerProject}
              icon={Clock}
              description="Average response rate"
            />
          </>
        ) : (
          <>
            <StatsCard
              title="Active Bids"
              value={submittedBids.length}
              icon={TrendingUp}
              description="Submitted and under review"
            />
            <StatsCard title="Won Projects" value={awardedBids.length} icon={Folder} description="Awarded contracts" />
            <StatsCard
              title="Pending Invites"
              value={pendingInvitations.length}
              icon={Inbox}
              description="Awaiting your response"
            />
            <StatsCard
              title="Total Bid Value"
              value={formatCurrency(totalBidValue)}
              icon={DollarSign}
              description="All bids combined"
            />
          </>
        )}
      </div>

      {/* Usage Tracker for FREE users */}
      <div className="mb-8">
        <UsageTracker />
      </div>

      {/* Main Content */}
      {isContractor ? (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Active Projects</h2>
            {activeProjects.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {activeProjects.slice(0, 4).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    bidsCount={getBidsByProject(project.id).length}
                    actionHref={`/projects/${project.id}`}
                    actionLabel="View Bids"
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Folder}
                title="No active projects"
                description="Create your first project to start receiving bids from subcontractors"
                action={{
                  label: "Create Project",
                  onClick: () => router.push("/projects/new"),
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {pendingInvitations.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Pending Invitations</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {pendingInvitations.slice(0, 2).map((invitation) => {
                  const project = projects.find((p) => p.id === invitation.projectId)
                  if (!project) return null
                  return (
                    <ProjectCard
                      key={invitation.id}
                      project={project}
                      actionHref={`/invitations`}
                      actionLabel="Respond"
                    />
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Recent Bids</h2>
            {userBids.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {userBids.slice(0, 4).map((bid) => {
                  const project = projects.find((p) => p.id === bid.projectId)
                  return <BidCard key={bid.id} bid={bid} project={project} showProject />
                })}
              </div>
            ) : (
              <EmptyState
                icon={Folder}
                title="No bids yet"
                description="Browse available projects and submit your first bid to get started"
                action={{
                  label: "View Opportunities",
                  onClick: () => router.push("/opportunities"),
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
