"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Award } from "lucide-react"
import { formatCurrency, formatDateTime } from "@/lib/utils/format"
import { StatusBadge } from "@/components/status-badge"
import type { Bid, Company, User } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BidComparisonTableProps {
  bids: Bid[]
  companies: Company[]
  users: User[]
  onViewBid: (bidId: string) => void
  onAwardBid?: (bidId: string) => void
  canAward?: boolean
  isAwarding?: boolean
}

type SortField = 'amount' | 'company' | 'submittedAt' | 'status'
type SortDirection = 'asc' | 'desc'

export function BidComparisonTable({
  bids,
  companies,
  users,
  onViewBid,
  onAwardBid,
  canAward = false,
  isAwarding = false
}: BidComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('amount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortedBids = useMemo(() => {
    return [...bids].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'amount':
          aValue = Number(a.totalAmount)
          bValue = Number(b.totalAmount)
          break
        case 'company':
          const aUser = users.find(u => u.id === a.subcontractorId)
          const bUser = users.find(u => u.id === b.subcontractorId)
          const aCompany = aUser ? companies.find(c => c.id === aUser.companyId) : null
          const bCompany = bUser ? companies.find(c => c.id === bUser.companyId) : null
          aValue = aCompany?.name || ''
          bValue = bCompany?.name || ''
          break
        case 'submittedAt':
          aValue = new Date(a.submittedAt || a.createdAt)
          bValue = new Date(b.submittedAt || b.createdAt)
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [bids, companies, users, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const getCompanyInfo = (bid: Bid) => {
    const user = users.find(u => u.id === bid.subcontractorId)
    const company = user ? companies.find(c => c.id === user.companyId) : null
    return { user, company }
  }

  const lowestBid = Math.min(...bids.map(b => Number(b.totalAmount)))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bid Comparison ({bids.length} bids)</span>
          <Badge variant="secondary" className="text-xs">
            Pro Feature
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('amount')}
                  >
                    Bid Amount
                    {getSortIcon('amount')}
                  </Button>
                </TableHead>
                <TableHead>Details</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('submittedAt')}
                  >
                    Submitted
                    {getSortIcon('submittedAt')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBids.map((bid) => {
                const { user, company } = getCompanyInfo(bid)
                const isLowest = Number(bid.totalAmount) === lowestBid

                return (
                  <TableRow key={bid.id} className={cn(isLowest && "bg-green-50 dark:bg-green-950/20")}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold text-xs">
                          {company?.name?.substring(0, 2).toUpperCase() || user?.name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <div>
                          <div className="font-medium">{company?.name || user?.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{company?.type || 'Independent'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-lg font-bold", isLowest && "text-green-600")}>
                          {formatCurrency(bid.totalAmount)}
                        </span>
                        {isLowest && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            Lowest
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {bid.lineItems?.length || 0} items • {bid.alternates?.length || 0} alternates
                        {bid.completionTime && (
                          <div className="text-xs">{bid.completionTime} days</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={bid.status} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {bid.submittedAt ? formatDateTime(bid.submittedAt) : 'Draft'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewBid(bid.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canAward && onAwardBid && bid.status === 'SUBMITTED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAwardBid(bid.id)}
                            disabled={isAwarding}
                            className={cn(
                              "text-green-600 border-green-600 hover:bg-green-50",
                              isAwarding && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Award className="h-4 w-4 mr-1" />
                            {isAwarding ? "Awarding..." : "Award"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}