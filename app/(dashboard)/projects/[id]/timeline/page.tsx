"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"
import { ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"

export default function ProjectTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  return (
    <div>
      <div className="mb-8">
        <Link 
          href={`/projects/${id}`} 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Project Timeline</h1>
        
        <EmptyState
          icon={Calendar}
          title="Timeline Coming Soon"
          description="Project timeline and milestone tracking will be available in a future update."
          action={{
            label: "Back to Project",
            onClick: () => router.push(`/projects/${id}`),
          }}
        />
      </div>
    </div>
  )
}
