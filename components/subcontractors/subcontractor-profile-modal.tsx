import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar, Mail, Phone, Globe, Building } from "lucide-react"
import type { User, Company } from "@/lib/types"
import { ScrollArea } from "@/components/ui/scroll-area"

export type ProfileData = { user: User; company?: Company } | null

export type SubcontractorProfileModalProps = {
  profile: ProfileData
  onOpenChange: (open: boolean) => void
  onMessage: (user: User) => void
}

export function SubcontractorProfileModal({ profile, onOpenChange, onMessage }: SubcontractorProfileModalProps) {
  const initials = profile?.user.name
    ? profile.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : ""

  return (
    <Dialog open={!!profile} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[92vw] rounded-2xl p-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 px-5 pt-5">
            <Avatar className="h-11 w-11">
              <AvatarImage src={profile?.company?.logo} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{profile?.user.name}</span>
                {(profile?.user.isFounder ||
                  profile?.company?.plan === "PRO" ||
                  profile?.company?.plan === "ENTERPRISE" ||
                  (profile?.company?.trialEndDate && new Date(profile.company.trialEndDate) > new Date())) && (
                  <img src="/verified-badge.png" alt="Verified" className="h-4 w-4" />
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {profile?.company?.name || "Independent Contractor"}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="px-5 pb-3" />
        </DialogHeader>

        {profile && (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-5 px-5 pb-5">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                Contact Information
              </h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{profile.user.email}</span>
                  </div>
                  {!!profile.company?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.company.phone}</span>
                    </div>
                  )}
                  {!!profile.company?.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={profile.company.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        {profile.company.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {!!profile.company && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4" />
                    Company Information
                  </h3>
                  <div className="space-y-2.5">
                    {!!profile.company.type && (
                      <div>
                        <Label className="text-[11px] font-medium text-muted-foreground">TYPE</Label>
                        <p className="text-sm">{profile.company.type}</p>
                      </div>
                    )}
                    {!!profile.company.address && (
                      <div>
                        <Label className="text-[11px] font-medium text-muted-foreground">ADDRESS</Label>
                        <p className="text-sm">{profile.company.address}</p>
                      </div>
                    )}
                    {!!profile.company.description && (
                      <div>
                        <Label className="text-[11px] font-medium text-muted-foreground">DESCRIPTION</Label>
                        <p className="text-sm leading-relaxed">{profile.company.description}</p>
                      </div>
                    )}
                    {!!profile.company.trades?.length && (
                      <div>
                        <Label className="text-[11px] font-medium text-muted-foreground">SPECIALTIES</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {profile.company.trades.map((trade) => (
                            <Badge key={trade} variant="outline" className="text-xs">
                              {trade}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  Member Since
                </h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(profile.user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button
                  className="w-full bg-accent hover:bg-accent-hover text-white"
                  onClick={() => onMessage(profile.user)}
                >
                  Send Message
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
