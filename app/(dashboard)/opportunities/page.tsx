"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { ProjectCard } from "@/components/project-card"
import { EmptyState } from "@/components/empty-state"
import { Input } from "@/components/ui/input"
import { Folder, Search } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function OpportunitiesPage() {
  const { projects, currentUser, getBidsByProject } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("published")

  if (!currentUser) return null

  const availableProjects = projects.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status.toLowerCase() === statusFilter
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesSearch
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Project Opportunities</h1>
        <p className="text-muted-foreground mt-1">Browse available construction projects and submit bids</p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-md">
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
        <TabsList>
          <TabsTrigger value="published">
            Active ({projects.filter((p) => p.status === "PUBLISHED").length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({projects.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({projects.filter((p) => p.status === "CLOSED").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {availableProjects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
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
