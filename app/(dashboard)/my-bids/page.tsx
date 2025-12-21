"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { BidCard } from "@/components/bid-card"
import { EmptyState } from "@/components/empty-state"
import { ClipboardList } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"

export default function MyBidsPage() {
  const router = useRouter()
  const { currentUser, getBidsBySubcontractor, projects } = useStore()
  const [statusFilter, setStatusFilter] = useState("all")

  if (!currentUser) return null

  const userBids = getBidsBySubcontractor(currentUser.id)
  const filteredBids =
    statusFilter === "all" ? userBids : userBids.filter((b) => b.status.toLowerCase() === statusFilter)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Bids</h1>
        <p className="text-muted-foreground mt-1">Track all your submitted bids and their status</p>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All ({userBids.length})</TabsTrigger>
          <TabsTrigger value="submitted">
            Submitted ({userBids.filter((b) => b.status === "SUBMITTED").length})
          </TabsTrigger>
          <TabsTrigger value="under_review">
            Under Review ({userBids.filter((b) => b.status === "UNDER_REVIEW").length})
          </TabsTrigger>
          <TabsTrigger value="awarded">Awarded ({userBids.filter((b) => b.status === "AWARDED").length})</TabsTrigger>
          <TabsTrigger value="declined">
            Declined ({userBids.filter((b) => b.status === "DECLINED").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredBids.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredBids.map((bid) => {
            const project = projects.find((p) => p.id === bid.projectId)
            return <BidCard key={bid.id} bid={bid} project={project} showProject />
          })}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No bids found"
          description={
            statusFilter === "all"
              ? "Start submitting bids on available projects to see them here"
              : `No bids with ${statusFilter.replace("_", " ")} status`
          }
          action={
            statusFilter === "all"
              ? {
                  label: "Browse Projects",
                  onClick: () => router.push("/opportunities"),
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
