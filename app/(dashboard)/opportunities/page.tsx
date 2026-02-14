"use client"

import { useState, useEffect } from "react"
import { useStore } from "@/lib/store"
import { OpportunityCard } from "@/components/opportunity-card"
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
        <h1 className="text-3xl font-bold text-foreground">Subcontractor Opportunities</h1>
        <p className="mt-1 text-sm lg:text-base text-muted-foreground">
          Find and bid on active commercial construction projects from verified general contractors.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="inline-flex rounded-full bg-muted p-1">
            <TabsTrigger
              value="published"
              className="rounded-full px-4 py-1.5 text-xs lg:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Active
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="rounded-full px-4 py-1.5 text-xs lg:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              All Projects
            </TabsTrigger>
            <TabsTrigger
              value="closed"
              className="rounded-full px-4 py-1.5 text-xs lg:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Closed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects, GCs, or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-full border-border bg-background pl-9 text-sm"
          />
        </div>
      </div>

      {availableProjects.length > 0 ? (
        <div className="space-y-4 lg:space-y-5">
          {availableProjects.map((project) => (
            <OpportunityCard
              key={project.id}
              project={project}
              bidsCount={getBidsByProject(project.id).length}
              onViewBid={() => window.location.assign(`/projects/${project.id}`)}
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
