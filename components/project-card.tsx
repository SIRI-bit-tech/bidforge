import Link from "next/link"
import { formatCurrency, formatDate, formatTimeUntil, getTradeLabel } from "@/lib/utils/format"
import { StatusBadge } from "./status-badge"
import type { Project } from "@/lib/types"
import { Calendar, DollarSign, MapPin, Clock } from "lucide-react"
import { Button } from "./ui/button"

interface ProjectCardProps {
  project: Project
  bidsCount?: number
  showActions?: boolean
  actionLabel?: string
  actionHref?: string
}

export function ProjectCard({ project, bidsCount = 0, showActions = true, actionLabel, actionHref }: ProjectCardProps) {
  const timeRemaining = formatTimeUntil(project.deadline)
  const isExpired = new Date(project.deadline) < new Date()

  return (
    <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Link href={`/projects/${project.id}`} className="text-lg font-semibold text-foreground hover:text-primary">
            {project.title}
          </Link>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="truncate">{project.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>{formatCurrency(project.budget)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(project.startDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span className={isExpired ? "text-destructive" : "text-warning"}>{timeRemaining}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {project.trades.slice(0, 3).map((trade) => (
          <span key={trade} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {getTradeLabel(trade)}
          </span>
        ))}
        {project.trades.length > 3 && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            +{project.trades.length - 3} more
          </span>
        )}
      </div>

      {showActions && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">{bidsCount} bids submitted</span>
          {actionHref && (
            <Button asChild size="sm" className="bg-accent hover:bg-accent-hover text-white">
              <Link href={actionHref}>{actionLabel || "View Details"}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
