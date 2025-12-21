"use client"

import { useStore } from "@/lib/store"
import { ProjectCard } from "@/components/project-card"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Inbox, Check, X } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils/format"
import { useRouter } from "next/navigation"

export default function InvitationsPage() {
  const router = useRouter()
  const { currentUser, getInvitationsBySubcontractor, projects, acceptInvitation, declineInvitation } = useStore()

  if (!currentUser) return null

  const invitations = getInvitationsBySubcontractor(currentUser.id)
  const pendingInvitations = invitations.filter((inv) => inv.status === "PENDING")

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Bid Invitations</h1>
        <p className="text-muted-foreground mt-1">Review and respond to project invitations</p>
      </div>

      {pendingInvitations.length > 0 ? (
        <div className="space-y-6">
          {pendingInvitations.map((invitation) => {
            const project = projects.find((p) => p.id === invitation.projectId)
            if (!project) return null

            return (
              <div key={invitation.id} className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{project.title}</h3>
                    <p className="text-sm text-muted-foreground">Invited {formatRelativeTime(invitation.sentAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        declineInvitation(invitation.id)
                        router.refresh()
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="bg-accent hover:bg-accent-hover text-white"
                      onClick={() => {
                        acceptInvitation(invitation.id)
                        router.push(`/projects/${project.id}`)
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept & View
                    </Button>
                  </div>
                </div>

                <ProjectCard project={project} showActions={false} />
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Inbox}
          title="No pending invitations"
          description="You'll see new project invitations here when contractors invite you to bid"
        />
      )}
    </div>
  )
}
