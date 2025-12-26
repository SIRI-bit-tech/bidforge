"use client"

import { useEffect, useState } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { formatDate, formatTimeUntil } from "@/lib/utils/format"
import { Mail, Calendar, MapPin, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function InvitationsPage() {
  const router = useRouter()
  const { 
    currentUser, 
    getInvitationsBySubcontractor, 
    acceptInvitation, 
    declineInvitation,
    projects,
    loadProjects
  } = useStore()
  
  const [loading, setLoading] = useState(true)
  const [invitations, setInvitations] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadInvitations = async () => {
    if (!currentUser) return
    
    try {
      const response = await fetch(`/api/invitations?userId=${currentUser.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setInvitations(data.invitations)
      }
    } catch (error) {
      console.error('Failed to load invitations:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return
      
      try {
        // Load projects first
        await loadProjects()
        
        // Load invitations from API
        await loadInvitations()
      } catch (error) {
        console.error('Failed to load invitations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentUser, loadProjects])

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!currentUser) return
    
    setActionLoading(invitationId)
    try {
      await acceptInvitation(invitationId)
      // Reload invitations to get updated data from server
      await loadInvitations()
    } catch (error) {
      console.error('Failed to accept invitation:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    if (!currentUser) return
    
    setActionLoading(invitationId)
    try {
      await declineInvitation(invitationId)
      // Reload invitations to get updated data from server
      await loadInvitations()
    } catch (error) {
      console.error('Failed to decline invitation:', error)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invitations...</p>
        </div>
      </div>
    )
  }

  if (!currentUser || currentUser.role !== 'SUBCONTRACTOR') {
    return (
      <EmptyState
        icon={Mail}
        title="Access Denied"
        description="Only subcontractors can view invitations"
      />
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Project Invitations</h1>
        <p className="text-muted-foreground">
          Review and respond to project invitations from contractors
        </p>
      </div>

      {invitations.length > 0 ? (
        <div className="space-y-6">
          {invitations.map((invitation) => {
            const project = projects.find(p => p.id === invitation.projectId)
            if (!project) return null

            const isExpired = new Date(project.deadline) < new Date()
            const timeRemaining = formatTimeUntil(project.deadline)

            return (
              <Card key={invitation.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Invited on {formatDate(invitation.sentAt)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          invitation.status === 'PENDING' ? 'default' :
                          invitation.status === 'ACCEPTED' ? 'secondary' :
                          'outline'
                        }
                      >
                        {invitation.status}
                      </Badge>
                      {isExpired && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{project.description}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{project.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Budget: {project.budgetMin && project.budgetMax 
                          ? `$${project.budgetMin} - $${project.budgetMax}`
                          : 'Not specified'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {project.startDate && project.endDate 
                          ? `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`
                          : 'Dates not specified'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className={isExpired ? "text-destructive" : "text-warning"}>
                        Deadline: {timeRemaining}
                      </span>
                    </div>
                  </div>

                  {invitation.status === 'PENDING' && !isExpired && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={() => handleDeclineInvitation(invitation.id)}
                        variant="outline"
                        className="flex-1"
                        disabled={actionLoading === invitation.id}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {actionLoading === invitation.id ? 'Declining...' : 'Decline'}
                      </Button>
                      <Button
                        onClick={() => handleAcceptInvitation(invitation.id)}
                        className="flex-1 bg-accent hover:bg-accent-hover text-white"
                        disabled={actionLoading === invitation.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {actionLoading === invitation.id ? 'Accepting...' : 'Accept & View Project'}
                      </Button>
                    </div>
                  )}

                  {invitation.status === 'ACCEPTED' && (
                    <div className="pt-4">
                      <Button
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="w-full bg-accent hover:bg-accent-hover text-white"
                      >
                        View Project Details
                      </Button>
                    </div>
                  )}

                  {invitation.respondedAt && (
                    <p className="text-xs text-muted-foreground pt-2">
                      Responded on {formatDate(invitation.respondedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Mail}
          title="No invitations yet"
          description="You haven't received any project invitations. Check back later or browse available opportunities."
          action={{
            label: "Browse Opportunities",
            onClick: () => router.push("/opportunities"),
          }}
        />
      )}
    </div>
  )
}