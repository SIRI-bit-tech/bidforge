import type { StatsCardProps } from "@/lib/types"

export function StatsCard({ title, value, icon: Icon, description, trend }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-card px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff4ec]">
          <Icon className="h-4 w-4 text-[#f97316]" />
        </div>
      </div>
      <div className="text-3xl font-semibold text-foreground tracking-tight">{value}</div>
      <div className="mt-1 flex items-center justify-between text-[11px]">
        {description && <span className="text-muted-foreground">{description}</span>}
        {trend && (
          <span className={trend.positive ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
            {trend.positive ? "+" : ""}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  )
}
