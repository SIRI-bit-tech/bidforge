"use client"

import { useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { ProjectCard } from "@/components/project-card"
import { BidCard } from "@/components/bid-card"
import { EmptyState } from "@/components/empty-state"
import { Folder, FileText, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentUser, projects, bids, companies, users, getBidsByProject } = useStore()

  if (!currentUser) return null

  const rawQuery = searchParams.get("q") || ""
  const query = rawQuery.trim()
  const queryLower = query.toLowerCase()

  const isContractor = currentUser.role === "CONTRACTOR"

  const { projectResults, bidResults, contactResults } = useMemo(() => {
    if (!queryLower) {
      return {
        projectResults: [],
        bidResults: [],
        contactResults: [],
      }
    }

    const filteredProjects = projects.filter((project) => {
      const text = `${project.title} ${project.description} ${project.location}`.toLowerCase()
      return text.includes(queryLower)
    })

    const filteredBids = bids.filter((bid) => {
      if (isContractor && bid.projectId) {
        const project = projects.find((p) => p.id === bid.projectId)
        if (!project) return false
        const text = `${project.title} ${project.location}`.toLowerCase()
        return text.includes(queryLower)
      }

      const text = `${bid.notes || ""}`.toLowerCase()
      return text.includes(queryLower)
    })

    const filteredContacts = users
      .map((user) => {
        const company = companies.find((c) => c.id === user.companyId)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          companyName: company?.name,
        }
      })
      .filter((entry) => {
        const text = `${entry.name} ${entry.email} ${entry.companyName || ""}`.toLowerCase()
        return text.includes(queryLower)
      })

    return {
      projectResults: filteredProjects,
      bidResults: filteredBids,
      contactResults: filteredContacts,
    }
  }, [projects, bids, users, companies, queryLower, isContractor])

  const hasQuery = query.length > 0
  const hasResults = projectResults.length > 0 || bidResults.length > 0 || contactResults.length > 0

  if (!hasQuery) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Search</h1>
          <p className="text-muted-foreground mt-1">Use the search bar in the header to find projects, bids, or contacts.</p>
        </div>
      </div>
    )
  }

  if (!hasResults) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Search Results</h1>
          <p className="text-muted-foreground mt-1">
            No matches found for <span className="font-semibold">&quot;{query}&quot;</span>.
          </p>
        </div>

        <EmptyState
          icon={Folder}
          title="No results"
          description="Try searching by project name, location, bid notes, or contact name."
          action={{
            label: isContractor ? "View All Projects" : "View Opportunities",
            onClick: () => router.push(isContractor ? "/projects" : "/opportunities"),
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Search Results</h1>
        <p className="text-muted-foreground mt-1">
          Showing matches for <span className="font-semibold">&quot;{query}&quot;</span>.
        </p>
      </div>

      {projectResults.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Projects</h2>
            </div>
            <span className="text-xs text-muted-foreground">{projectResults.length} results</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projectResults.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                bidsCount={getBidsByProject(project.id).length}
                actionHref={`/projects/${project.id}`}
                actionLabel="Open Project"
              />
            ))}
          </div>
        </section>
      )}

      {bidResults.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Bids</h2>
            </div>
            <span className="text-xs text-muted-foreground">{bidResults.length} results</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {bidResults.slice(0, 6).map((bid) => {
              const project = projects.find((p) => p.id === bid.projectId)
              const company = companies.find((c) => c.id === currentUser.companyId)
              return <BidCard key={bid.id} bid={bid} project={project} company={company} showProject />
            })}
          </div>
        </section>
      )}

      {contactResults.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
            </div>
            <span className="text-xs text-muted-foreground">{contactResults.length} results</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contactResults.map((contact) => (
              <div
                key={contact.id}
                className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">{contact.name}</div>
                  <div className="text-xs text-muted-foreground">{contact.email}</div>
                  {contact.companyName && (
                    <div className="text-xs text-muted-foreground mt-1">{contact.companyName}</div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => router.push("/messages")}
                >
                  Message
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

