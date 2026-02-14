import Link from "next/link"
import { formatCurrency, formatDate, formatTimeUntil, getTradeLabel } from "@/lib/utils/format"
import { StatusBadge } from "./status-badge"
import type { ProjectCardProps } from "@/lib/types"
import { Calendar, DollarSign, MapPin, Clock, ImageOff, Pencil, UserPlus } from "lucide-react"
import { Button } from "./ui/button"

export function ProjectCard({
  project,
  bidsCount = 0,
  showActions = true,
  actionLabel,
  actionHref,
  viewMode = "grid",
  onEdit,
  onInvite,
}: ProjectCardProps) {
  const timeRemaining = formatTimeUntil(project.deadline)
  const isExpired = new Date(project.deadline) < new Date()

  const hasCoverImage = Boolean(project.coverImageUrl)

  const containerClasses =
    viewMode === "list"
      ? "flex gap-5 rounded-2xl border border-border bg-card p-4 lg:p-5 hover:shadow-md transition-shadow"
      : "rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col"

  return (
    <div className={containerClasses}>
      {viewMode === "grid" && (
        <>
          <div className="relative h-40 w-full overflow-hidden">
            {hasCoverImage ? (
              <img
                src={project.coverImageUrl as string}
                alt={project.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <ImageOff className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="absolute top-3 right-3">
              <StatusBadge status={project.status} />
            </div>
          </div>

          <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
            <div className="mb-3">
              <Link
                href={`/projects/${project.id}`}
                className="line-clamp-1 text-base font-semibold text-foreground hover:text-primary"
              >
                {project.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{project.location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>
                  {project.budgetMin && project.budgetMax
                    ? `${formatCurrency(Number(project.budgetMin))} - ${formatCurrency(
                        Number(project.budgetMax),
                      )}`
                    : project.budget
                    ? formatCurrency(Number(project.budget))
                    : "Budget not specified"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(project.startDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className={isExpired ? "text-red-500" : "text-amber-500"}>{timeRemaining}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {project.trades.slice(0, 3).map((trade) => (
                <span
                  key={trade}
                  className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {getTradeLabel(trade)}
                </span>
              ))}
              {project.trades.length > 3 && (
                <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  +{project.trades.length - 3} more
                </span>
              )}
            </div>

            {showActions && (
              <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {bidsCount} {bidsCount === 1 ? "Bid" : "Bids"} Received
                </span>
                <div className="flex items-center gap-2">
                  {actionHref && (
                    <Button asChild size="sm" className="bg-accent hover:bg-accent-hover text-white">
                      <Link href={actionHref}>{actionLabel || "View Details"}</Link>
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={(event) => {
                        event.preventDefault()
                        onEdit()
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onInvite && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={(event) => {
                        event.preventDefault()
                        onInvite()
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {viewMode === "list" && (
        <>
          <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-xl">
            {hasCoverImage ? (
              <img
                src={project.coverImageUrl as string}
                alt={project.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <ImageOff className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="absolute top-2 left-2">
              <StatusBadge status={project.status} />
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between">
            <div className="mb-2">
              <Link
                href={`/projects/${project.id}`}
                className="line-clamp-1 text-sm font-semibold text-foreground hover:text-primary"
              >
                {project.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{project.location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>
                  {project.budgetMin && project.budgetMax
                    ? `${formatCurrency(Number(project.budgetMin))} - ${formatCurrency(
                        Number(project.budgetMax),
                      )}`
                    : project.budget
                    ? formatCurrency(Number(project.budget))
                    : "Budget not specified"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className={isExpired ? "text-red-500" : "text-amber-500"}>{timeRemaining}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {project.trades.slice(0, 2).map((trade) => (
                  <span
                    key={trade}
                    className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {getTradeLabel(trade)}
                  </span>
                ))}
                {project.trades.length > 2 && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    +{project.trades.length - 2} more
                  </span>
                )}
              </div>
              {showActions && actionHref && (
                <Button asChild size="sm" className="bg-accent hover:bg-accent-hover text-white">
                  <Link href={actionHref}>{actionLabel || "View Details"}</Link>
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
