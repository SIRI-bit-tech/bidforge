"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useStore } from "@/lib/store"
import type { Bid } from "@/lib/types"
import { BidComparisonView } from "@/components/bid-comparison/bid-comparison-view"
import { EmptyState } from "@/components/empty-state"
import { formatCurrency } from "@/lib/utils/format"
import { ArrowLeft } from "lucide-react"

export default function ProjectBidComparisonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { projects, companies, users, loadProjects, loadBids, awardBid, currentUser } = useStore()
  const [loading, setLoading] = useState(true)
  const [isAwarding, setIsAwarding] = useState(false)
  const [bids, setBids] = useState<Bid[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadProjects()

        if (currentUser) {
          const projectBids = await loadBids(id)
          setBids(projectBids)
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, currentUser, loadProjects, loadBids])

  const project = projects.find((p) => p.id === id)

  const isProjectOwner =
    currentUser && project && (project.createdBy === currentUser.id || project.createdById === currentUser.id)

  const handleViewBid = (bidId: string) => {
    router.push(`/projects/${id}/bids/${bidId}`)
  }

  const handleAwardBid = async (bidId: string) => {
    try {
      setIsAwarding(true)
      await awardBid(bidId)

      const refreshedBids = await loadBids(id)
      setBids(refreshedBids)
    } finally {
      setIsAwarding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading bid comparison...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Project not found"
        description="The project you're looking for doesn't exist or has been deleted"
        action={{
          label: "Back to Projects",
          onClick: () => router.push("/projects"),
        }}
      />
    )
  }

  if (!isProjectOwner) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Bid comparison unavailable"
        description="Only the project owner can compare bids for this project."
        action={{
          label: "Back to Project",
          onClick: () => router.push(`/projects/${id}`),
        }}
      />
    )
  }

  const submittedBids = bids.filter((bid) => bid.status === "SUBMITTED")

  return (
    <div className="min-h-screen">
      <div className="mb-6 lg:mb-8 flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Bid Comparison: {project.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {submittedBids.length} subcontractors responding • Average bid{" "}
            {submittedBids.length > 0
              ? formatCurrency(
                  submittedBids.reduce((sum, bid) => sum + bid.totalAmount, 0) / submittedBids.length,
                )
              : "N/A"}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <BidComparisonView
          projectId={id}
          bids={bids}
          companies={companies}
          users={users}
          onViewBid={handleViewBid}
          onAwardBid={handleAwardBid}
          canAward={isProjectOwner}
          isAwarding={isAwarding}
        />
      </div>
    </div>
  )
}

