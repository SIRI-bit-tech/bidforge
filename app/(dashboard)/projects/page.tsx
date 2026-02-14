"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { ProjectCard } from "@/components/project-card"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePlanLimits } from "@/hooks/use-plan-limits"
import { StatsCard } from "@/components/stats-card"
import { formatCurrency } from "@/lib/utils/format"
import type { BidStatus } from "@/lib/types"
import { Plus, Folder, Search, DollarSign, FileClock, Award } from "lucide-react"

export default function ProjectsPage() {
  const router = useRouter()
  const { currentUser, projects, bids, getBidsByProject, loadProjects, loadBids } = useStore()
  const { checkLimit } = usePlanLimits()
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Load projects and bids for real-time stats
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadProjects()
        if (currentUser?.role === "CONTRACTOR") {
          await loadBids()
        }
      } catch (error) {
        console.error('Failed to load projects:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentUser, loadProjects, loadBids])

  if (!currentUser) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  const userProjects = projects.filter(
    (project) => project.createdBy === currentUser.id || project.createdById === currentUser.id,
  )

  const matchesSearch = (value: string) => {
    if (!searchTerm.trim()) return true
    return value.toLowerCase().includes(searchTerm.toLowerCase())
  }

  const filteredByStatus =
    activeTab === "all" ? userProjects : userProjects.filter((project) => project.status.toLowerCase() === activeTab)

  const filteredProjects = filteredByStatus.filter(
    (project) =>
      matchesSearch(project.title) ||
      matchesSearch(project.location) ||
      matchesSearch(project.city || "") ||
      matchesSearch(project.state || ""),
  )

  const activeProjects = userProjects.filter((project) => project.status === "PUBLISHED")

  const getEstimatedBudget = (project: (typeof userProjects)[number]) => {
    if (project.budgetMax) return Number(project.budgetMax)
    if (project.budgetMin) return Number(project.budgetMin)
    if (project.budget) return Number(project.budget)
    return 0
  }

  const totalActiveValue = activeProjects.reduce((sum, project) => sum + getEstimatedBudget(project), 0)

  const pendingStatuses: BidStatus[] = ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED"]

  const pendingBidsCount = bids.filter(
    (bid) =>
      pendingStatuses.includes(bid.status) &&
      userProjects.some((project) => project.id === bid.projectId),
  ).length

  const awardedProjectsCount = userProjects.filter((project) => project.status === "AWARDED").length

  return (
    <div className="min-h-screen">
      <div className="flex flex-col lg:flex-row items-start justify-between mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-sm lg:text-base text-muted-foreground mt-1">Manage all your construction projects</p>
        </div>
        <Button
          onClick={() => {
            if (checkLimit("CREATE_PROJECT")) {
              router.push("/projects/new")
            }
          }}
          className="w-full lg:w-auto bg-accent hover:bg-accent-hover text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Project
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects by name, location, or trade..."
            className="pl-9"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs lg:text-sm">
          <Button
            type="button"
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className={`rounded-full px-3 py-1 h-8 ${viewMode === "grid" ? "bg-accent text-white hover:bg-accent-hover" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            Grid
          </Button>
          <Button
            type="button"
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className={`rounded-full px-3 py-1 h-8 ${viewMode === "list" ? "bg-accent text-white hover:bg-accent-hover" : ""}`}
            onClick={() => setViewMode("list")}
          >
            List
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full lg:w-auto grid grid-cols-2 lg:flex lg:grid-cols-none">
          <TabsTrigger value="all" className="text-xs lg:text-sm">All ({userProjects.length})</TabsTrigger>
          <TabsTrigger value="published" className="text-xs lg:text-sm">
            Active ({userProjects.filter((p) => p.status === "PUBLISHED").length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="text-xs lg:text-sm">Draft ({userProjects.filter((p) => p.status === "DRAFT").length})</TabsTrigger>
          <TabsTrigger value="closed" className="text-xs lg:text-sm">Closed ({userProjects.filter((p) => p.status === "CLOSED").length})</TabsTrigger>
          <TabsTrigger value="awarded" className="text-xs lg:text-sm">
            Awarded ({userProjects.filter((p) => p.status === "AWARDED").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredProjects.length > 0 ? (
        <>
          <div
            className={
              viewMode === "grid"
                ? "grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2"
                : "flex flex-col gap-3"
            }
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                bidsCount={getBidsByProject(project.id).length}
                actionHref={`/projects/${project.id}`}
                actionLabel="View Bids"
                viewMode={viewMode}
                onEdit={() => router.push(`/projects/${project.id}/edit`)}
                onInvite={() => router.push(`/subcontractors?project=${project.id}`)}
              />
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <StatsCard
              title="Total Active Value"
              value={formatCurrency(totalActiveValue)}
              icon={DollarSign}
              description={`${activeProjects.length} active ${
                activeProjects.length === 1 ? "project" : "projects"
              }`}
            />
            <StatsCard
              title="Pending Bids"
              value={pendingBidsCount}
              icon={FileClock}
              description="Awaiting review or award"
            />
            <StatsCard
              title="Awards This Month"
              value={awardedProjectsCount}
              icon={Award}
              description="Total awarded projects"
            />
          </div>
        </>
      ) : (
        <EmptyState
          icon={Folder}
          title="No projects found"
          description={
            activeTab === "all"
              ? "Create your first project to start receiving bids from subcontractors"
              : `No projects with ${activeTab} status`
          }
          action={
            activeTab === "all"
              ? {
                label: "Create Project",
                onClick: () => {
                  if (checkLimit("CREATE_PROJECT")) {
                    router.push("/projects/new")
                  }
                },
              }
              : undefined
          }
        />
      )}
    </div>
  )
}
