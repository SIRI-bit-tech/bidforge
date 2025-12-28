"use client"

import { useState, useEffect } from "react"
import { useStore } from "@/lib/store"
import { ProjectCard } from "@/components/project-card"
import { EmptyState } from "@/components/empty-state"
import { Input } from "@/components/ui/input"
import { Folder, Search } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function OpportunitiesPage() {
  const { projects, currentUser, getBidsByProject, loadProjects } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("published")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load projects on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null)
        // Loading projects...
        const projects = await loadProjects()
        // Loaded projects
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to load projects:', error)
        }
        setError('Failed to load projects. Please try again.')
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
          <p className="text-muted-foreground">Loading opportunities...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const availableProjects = projects.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status.toLowerCase() === statusFilter
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesSearch
  })

  return (
    <div className="min-h-screen">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Project Opportunities</h1>
        <p className="text-sm lg:text-base text-muted-foreground mt-1">Browse available construction projects and submit bids</p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
        <TabsList className="w-full lg:w-auto grid grid-cols-3 lg:flex lg:grid-cols-none">
          <TabsTrigger value="published" className="text-xs lg:text-sm">
            Active ({projects.filter((p) => p.status === "PUBLISHED").length})
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs lg:text-sm">All ({projects.length})</TabsTrigger>
          <TabsTrigger value="closed" className="text-xs lg:text-sm">Closed ({projects.filter((p) => p.status === "CLOSED").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {availableProjects.length > 0 ? (
        <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
          {availableProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              bidsCount={getBidsByProject(project.id).length}
              actionHref={`/projects/${project.id}`}
              actionLabel="View & Bid"
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Folder}
          title="No projects found"
          description="Check back later for new project opportunities"
        />
      )}
    </div>
  )
}
