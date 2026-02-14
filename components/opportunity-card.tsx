import type { Project } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, DollarSign, Calendar } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils/format"

interface OpportunityCardProps {
  project: Project
  bidsCount: number
  onViewBid: () => void
}

export function OpportunityCard({ project, bidsCount, onViewBid }: OpportunityCardProps) {
  const budgetLabel =
    (project as any).budgetMin && (project as any).budgetMax
      ? `${formatCurrency(Number((project as any).budgetMin))} - ${formatCurrency(
          Number((project as any).budgetMax),
        )}`
      : project.budget
        ? formatCurrency(project.budget)
        : "Budget not specified"

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 lg:p-5 shadow-sm lg:flex-row lg:items-stretch">
      <div className="w-full overflow-hidden rounded-xl bg-muted lg:w-48 lg:flex-shrink-0">
        {project.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.coverImageUrl} alt={project.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            Project image
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wide">
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-2 py-0.5">
              Published
            </Badge>
          </div>
          <h3 className="text-base lg:text-lg font-semibold text-foreground">{project.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs lg:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{project.city && project.state ? `${project.city}, ${project.state}` : project.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{budgetLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Bids due: {formatDate(project.deadline)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            <span>{bidsCount} bids submitted</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-3 lg:w-40 lg:flex-shrink-0">
        <Button
          className="w-full rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-semibold"
          onClick={onViewBid}
        >
          View & Bid
        </Button>
      </div>
    </div>
  )
}

