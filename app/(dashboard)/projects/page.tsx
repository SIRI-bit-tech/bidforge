"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { ProjectCard } from "@/components/project-card"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Plus, Folder } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePlanLimits } from "@/hooks/use-plan-limits"

export default function ProjectsPage() {
  const router = useRouter()
  const { currentUser, projects, getBidsByProject, loadProjects } = useStore()
  const { checkLimit } = usePlanLimits()
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)

  // Load projects on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadProjects()
      } catch (error) {
        console.error('Failed to load projects:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [loadProjects])

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

  const userProjects = projects.filter((p) => p.createdBy === currentUser.id)
  const filteredProjects =
    activeTab === "all" ? userProjects : userProjects.filter((p) => p.status.toLowerCase() === activeTab)

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
        <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              bidsCount={getBidsByProject(project.id).length}
              actionHref={`/projects/${project.id}`}
            />
          ))}
        </div>
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
