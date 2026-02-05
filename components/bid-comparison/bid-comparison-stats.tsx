"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Users, Clock, Award } from "lucide-react"
import { formatCurrency } from "@/lib/utils/format"
import type { Bid } from "@/lib/types"

interface BidComparisonStatsProps {
  bids: Bid[]
}

export function BidComparisonStats({ bids }: BidComparisonStatsProps) {
  const stats = useMemo(() => {
    if (bids.length === 0) {
      return {
        total: 0,
        average: 0,
        lowest: 0,
        highest: 0,
        submitted: 0,
        avgCompletionTime: 0,
        spread: 0,
        spreadPercentage: 0
      }
    }

    const amounts = bids.map(bid => Number(bid.totalAmount))
    const submittedBids = bids.filter(bid => bid.status === 'SUBMITTED')
    const completionTimes = bids.filter(bid => bid.completionTime).map(bid => bid.completionTime!)
    
    const lowest = Math.min(...amounts)
    const highest = Math.max(...amounts)
    const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
    const spread = highest - lowest
    const spreadPercentage = lowest > 0 ? (spread / lowest) * 100 : 0

    return {
      total: bids.length,
      average,
      lowest,
      highest,
      submitted: submittedBids.length,
      avgCompletionTime: completionTimes.length > 0 
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
        : 0,
      spread,
      spreadPercentage
    }
  }, [bids])

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    subtitle 
  }: { 
    title: string
    value: string | number
    icon: any
    trend?: 'up' | 'down' | 'neutral'
    subtitle?: string
  }) => (
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-lg ${
        trend === 'up' ? 'bg-green-100 text-green-600' :
        trend === 'down' ? 'bg-red-100 text-red-600' :
        'bg-blue-100 text-blue-600'
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <div className="text-lg font-bold">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bid Analysis</span>
          <Badge variant="secondary" className="text-xs">
            Live Stats
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Average Bid"
            value={formatCurrency(stats.average)}
            icon={DollarSign}
            trend="neutral"
          />
          
          <StatCard
            title="Lowest Bid"
            value={formatCurrency(stats.lowest)}
            icon={TrendingDown}
            trend="down"
            subtitle="Best value"
          />
          
          <StatCard
            title="Highest Bid"
            value={formatCurrency(stats.highest)}
            icon={TrendingUp}
            trend="up"
          />
          
          <StatCard
            title="Bid Spread"
            value={formatCurrency(stats.spread)}
            icon={TrendingUp}
            trend="neutral"
            subtitle={`${stats.spreadPercentage.toFixed(1)}% range`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
          <StatCard
            title="Total Bids"
            value={stats.total}
            icon={Users}
            trend="neutral"
          />
          
          <StatCard
            title="Submitted"
            value={`${stats.submitted}/${stats.total}`}
            icon={Award}
            trend="up"
            subtitle={`${stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0}% completion`}
          />
          
          <StatCard
            title="Avg Timeline"
            value={stats.avgCompletionTime > 0 ? `${Math.round(stats.avgCompletionTime)} days` : 'N/A'}
            icon={Clock}
            trend="neutral"
          />
        </div>
      </CardContent>
    </Card>
  )
}