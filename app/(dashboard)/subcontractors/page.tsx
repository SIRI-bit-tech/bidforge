"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/empty-state"
import { getTradeLabel } from "@/lib/utils/format"
import { Users, Search } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TradeCategory } from "@/lib/types"

export default function SubcontractorsPage() {
  const { users, companies } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTrade, setSelectedTrade] = useState<string>("all")

  const subcontractors = users.filter((u) => u.role === "SUBCONTRACTOR")

  const filteredSubcontractors = subcontractors.filter((sub) => {
    const company = companies.find((c) => c.id === sub.companyId)
    if (!company) return false

    const matchesSearch =
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.type.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTrade = selectedTrade === "all" || company.trades.includes(selectedTrade as TradeCategory)

    return matchesSearch && matchesTrade
  })

  const allTrades = Array.from(new Set(companies.flatMap((c) => c.trades)))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Subcontractor Directory</h1>
        <p className="text-muted-foreground mt-1">Browse and invite qualified subcontractors</p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={selectedTrade} onValueChange={setSelectedTrade} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Trades</TabsTrigger>
          {allTrades.slice(0, 5).map((trade) => (
            <TabsTrigger key={trade} value={trade}>
              {getTradeLabel(trade)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filteredSubcontractors.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubcontractors.map((sub) => {
            const company = companies.find((c) => c.id === sub.companyId)
            if (!company) return null

            return (
              <div key={sub.id} className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-bold">
                    {company.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{company.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{company.type}</p>
                  </div>
                </div>

                {company.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{company.description}</p>
                )}

                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-2">Specializations</div>
                  <div className="flex flex-wrap gap-1">
                    {company.trades.map((trade) => (
                      <span key={trade} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {getTradeLabel(trade)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    View Profile
                  </Button>
                  <Button size="sm" className="flex-1 bg-accent hover:bg-accent-hover text-white">
                    Invite to Bid
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No subcontractors found"
          description="Try adjusting your search criteria or browse all subcontractors"
        />
      )}
    </div>
  )
}
