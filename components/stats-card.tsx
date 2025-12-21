import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: string
    positive: boolean
  }
}

export function StatsCard({ title, value, icon: Icon, description, trend }: StatsCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        {trend && (
          <div className={`text-sm font-medium ${trend.positive ? "text-success" : "text-destructive"}`}>
            {trend.positive ? "+" : ""}
            {trend.value}
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        {description && <div className="text-xs text-muted-foreground mt-1">{description}</div>}
      </div>
    </div>
  )
}
