"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Filter } from "lucide-react"
import type { Bid } from "@/lib/types"

interface BidFiltersProps {
  bids: Bid[]
  onFiltersChange: (filteredBids: Bid[]) => void
}

interface FilterState {
  minAmount: string
  maxAmount: string
  status: string
  search: string
}

const BID_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'AWARDED', label: 'Awarded' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
]

export function BidFilters({ bids, onFiltersChange }: BidFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    minAmount: '',
    maxAmount: '',
    status: '',
    search: '',
  })

  const [isExpanded, setIsExpanded] = useState(false)

  const applyFilters = (newFilters: FilterState) => {
    let filtered = [...bids]

    // Filter by amount range
    if (newFilters.minAmount) {
      const min = Number(newFilters.minAmount)
      filtered = filtered.filter(bid => Number(bid.totalAmount) >= min)
    }

    if (newFilters.maxAmount) {
      const max = Number(newFilters.maxAmount)
      filtered = filtered.filter(bid => Number(bid.totalAmount) <= max)
    }

    // Filter by status
    if (newFilters.status) {
      filtered = filtered.filter(bid => bid.status === newFilters.status)
    }

    // Filter by search (company name or notes)
    if (newFilters.search) {
      const searchLower = newFilters.search.toLowerCase()
      filtered = filtered.filter(bid => 
        bid.notes?.toLowerCase().includes(searchLower)
      )
    }

    onFiltersChange(filtered)
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    applyFilters(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {
      minAmount: '',
      maxAmount: '',
      status: '',
      search: '',
    }
    setFilters(clearedFilters)
    applyFilters(clearedFilters)
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '')
  const activeFilterCount = Object.values(filters).filter(value => value !== '').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-2 text-xs"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Amount Range */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Amount Range</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Min"
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Max"
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {BID_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value} className="text-xs">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Search Notes</Label>
              <Input
                placeholder="Search in notes..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Quick Stats */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Quick Stats</Label>
              <div className="text-xs text-muted-foreground">
                <div>Total: {bids.length} bids</div>
                <div>Submitted: {bids.filter(b => b.status === 'SUBMITTED').length}</div>
                <div>Avg: ${bids.length > 0 ? Math.round(bids.reduce((sum, b) => sum + Number(b.totalAmount), 0) / bids.length).toLocaleString() : 0}</div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}