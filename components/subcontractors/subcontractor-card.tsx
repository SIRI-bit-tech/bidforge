import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Award, Star } from "lucide-react"
import type { User, Company } from "@/lib/types"

export type SubcontractorCardProps = {
  user: User
  company?: Company
  onViewProfile: (user: User) => void
  onInvite: (user: User) => void
  disableInvite?: boolean
}

export function SubcontractorCard({
  user,
  company,
  onViewProfile,
  onInvite,
  disableInvite = false,
}: SubcontractorCardProps) {
  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
  const verified =
    user.isFounder ||
    company?.plan === "PRO" ||
    company?.plan === "ENTERPRISE" ||
    !!(company?.trialEndDate && new Date(company.trialEndDate) > new Date())

  const gridHeader = (
    <>
      <div className="relative h-24 w-full bg-muted">
        {company?.logo ? (
          <img src={company.logo} alt={company.name || initials} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
        )}
        {company?.trades?.[0] && (
          <span className="absolute top-2 left-2 rounded-md bg-accent text-accent-foreground text-[10px] px-2 py-0.5 shadow-sm">
            {company.trades[0]}
          </span>
        )}
      </div>
      <CardHeader className="pb-2 px-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold text-foreground">{user.name}</CardTitle>
              {verified && <img src="/verified-badge.png" alt="Verified" className="h-3.5 w-3.5" />}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {company?.name || "Independent Contractor"}
            </div>
          </div>
          {typeof company?.experienceRating === "number" && (
            <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              {company.experienceRating.toFixed(1)}
            </div>
          )}
        </div>
      </CardHeader>
    </>
  )

  return (
    <Card className="hover:shadow-md transition-all duration-200 border border-border bg-card h-full flex flex-col overflow-hidden">
      {gridHeader}
      <CardContent className="space-y-2 pt-0 px-4 pb-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="truncate">
            {company?.address && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{company.address}</span>
              </span>
            )}
          </div>
          {company?.certifications && company.certifications.length > 0 && (
            <div className="inline-flex items-center gap-1">
              <Award className="h-4 w-4 text-success" />
              <span>{company.certifications.length}</span>
            </div>
          )}
        </div>
        <div className="mt-auto space-y-2">
          <Button size="sm" className="w-full h-9 bg-accent hover:bg-accent-hover text-accent-foreground" onClick={() => onInvite(user)} disabled={disableInvite}>
            Invite to Bid
          </Button>
          <Button variant="outline" size="sm" className="w-full h-9 border-border" onClick={() => onViewProfile(user)}>
            View Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
