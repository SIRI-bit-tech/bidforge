"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Search, MapPin, Phone, Globe, Award, Mail, Calendar, Building, BadgeCheck } from "lucide-react"
import { User, Company } from "@/lib/types"
import { usePlanLimits } from "@/hooks/use-plan-limits"

export default function SubcontractorsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    getSubcontractors,
    searchSubcontractors,
    getSubcontractorProfile,
    companies,
    loadSubcontractors,
    loadCompanies,
    projects,
    loadProjects,
    inviteSubcontractors,
    sendMessage,
    currentUser
  } = useStore()
  const { checkLimit } = usePlanLimits()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTrades, setSelectedTrades] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<{ user: User; company?: Company } | null>(null)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<User | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [inviteMessage, setInviteMessage] = useState("")
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null)
        await Promise.all([
          loadSubcontractors(),
          loadCompanies(),
          loadProjects()
        ])
      } catch (error) {
        console.error('Failed to load data:', error)
        setError('Failed to load subcontractors. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [loadSubcontractors, loadCompanies, loadProjects])

  // Get all subcontractors
  const allSubcontractors = getSubcontractors()

  // Filter subcontractors based on search and trades
  const filteredSubcontractors = useMemo(() => {
    if (!searchQuery && selectedTrades.length === 0) {
      return allSubcontractors
    }
    return searchSubcontractors(searchQuery, selectedTrades)
  }, [searchQuery, selectedTrades, searchSubcontractors, allSubcontractors])

  // Get unique trades from all companies and also load all trades from database
  const availableTrades = useMemo(() => {
    const trades = new Set<string>()
    
    // Add trades from loaded companies
    companies.forEach(company => {
      company.trades.forEach(trade => trades.add(trade))
    })
    
    // Add all standard trades that are available during onboarding
    const standardTrades = [
      "ELECTRICAL",
      "PLUMBING", 
      "HVAC",
      "CONCRETE",
      "FRAMING",
      "ROOFING",
      "DRYWALL",
      "FLOORING",
      "PAINTING",
      "LANDSCAPING"
    ]
    
    standardTrades.forEach(trade => trades.add(trade))
    
    return Array.from(trades).sort()
  }, [companies])

  const toggleTrade = (trade: string) => {
    setSelectedTrades(prev =>
      prev.includes(trade)
        ? prev.filter(t => t !== trade)
        : [...prev, trade]
    )
  }

  // Get user's projects for invitation
  const userProjects = currentUser ? projects.filter(p => p.createdBy === currentUser.id && p.status === 'PUBLISHED') : []

  const handleViewProfile = (user: User) => {
    const profile = getSubcontractorProfile(user.id)
    setSelectedProfile(profile)
  }

  const handleInviteToProject = (user: User) => {
    if (!checkLimit("INVITE_SUBCONTRACTOR")) return
    setSelectedSubcontractor(user)
    setInviteModalOpen(true)
    setSelectedProject("")
    setInviteMessage(`Hi ${user.name},\n\nI would like to invite you to bid on one of my projects. Please review the project details and let me know if you're interested.\n\nBest regards,\n${currentUser?.name}`)
  }

  const handleSendInvitation = async () => {
    if (!selectedSubcontractor || !selectedProject) return

    try {
      await inviteSubcontractors(selectedProject, [selectedSubcontractor.id])
      setInviteModalOpen(false)
      setSelectedSubcontractor(null)
      setSelectedProject("")
      setInviteMessage("")
      toast({
        title: "Invitation Sent Successfully!",
        description: `Invitation sent to ${selectedSubcontractor.name}`,
      })
    } catch (error) {
      console.error('Failed to send invitation:', error)
      toast({
        title: "Failed to Send Invitation",
        description: "There was an error sending the invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSendMessage = async () => {
    if (!selectedSubcontractor || !messageText.trim() || !currentUser) return
    if (!checkLimit("SEND_DIRECT_MESSAGE")) return

    setSendingMessage(true)
    try {
      // We need a project context for messaging. Let's use the most recent project
      const userProject = projects.find(p => p.createdBy === currentUser.id || p.createdById === currentUser.id)

      if (!userProject) {
        toast({
          title: "No Projects Available",
          description: "You need to have at least one project to send messages. Please create a project first.",
          variant: "destructive",
        })
        return
      }

      const messageData = {
        projectId: userProject.id,
        receiverId: selectedSubcontractor.id,
        text: messageText.trim()
      }

      await sendMessage(messageData)

      toast({
        title: "Message Sent Successfully!",
        description: `Your message has been sent to ${selectedSubcontractor.name}`,
      })

      // Close modal and navigate to messages
      setMessageModalOpen(false)
      setSelectedSubcontractor(null)
      setMessageText("")

      // Navigate to messages with the conversation selected
      router.push(`/messages?project=${userProject.id}&user=${selectedSubcontractor.id}`)

    } catch (error) {
      console.error('Failed to send message:', error)
      toast({
        title: "Failed to Send Message",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSendingMessage(false)
    }
  }

  const SubcontractorCard = ({ user }: { user: User }) => {
    const profile = getSubcontractorProfile(user.id)
    const company = profile?.company

    return (
      <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm bg-card h-full flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-muted flex-shrink-0">
              <AvatarImage src={company?.logo} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-lg">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-xl font-semibold text-foreground">{user.name}</CardTitle>
                {/* Verification badge for Pro users */}
                {(user.isFounder || 
                  company?.plan === "PRO" || 
                  company?.plan === "ENTERPRISE" ||
                  (company?.trialEndDate && new Date(company.trialEndDate) > new Date())) && (
                  <img 
                    src="/verified-badge.png" 
                    alt="Verified Pro Member" 
                    className="h-6 w-6 flex-shrink-0" 
                    title="Verified Pro Member" 
                  />
                )}
              </div>
              <CardDescription className="text-base text-muted-foreground mb-3">
                {company?.name || "Independent Contractor"}
              </CardDescription>
              {company?.type && (
                <Badge variant="secondary" className="text-sm bg-accent/10 text-accent border-accent/20">
                  {company.type}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-0 flex-1 flex flex-col">
          {company?.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {company.description}
            </p>
          )}

          {/* Contact Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Location */}
            {company?.address && (
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground/70 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{company.address}</span>
              </div>
            )}

            {/* Phone */}
            {company?.phone && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
                <span>{company.phone}</span>
              </div>
            )}
          </div>

          {/* Website */}
          {company?.website && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Globe className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-hover hover:underline transition-colors"
              >
                {company.website}
              </a>
            </div>
          )}

          {/* Trades */}
          {company?.trades && company.trades.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 flex-1">
              <Label className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 block">Specialties</Label>
              <div className="flex flex-wrap gap-2">
                {company.trades.slice(0, 4).map((trade) => (
                  <Badge key={trade} variant="outline" className="text-sm bg-card border-border text-foreground hover:bg-muted/50">
                    {trade}
                  </Badge>
                ))}
                {company.trades.length > 4 && (
                  <Badge variant="outline" className="text-sm bg-card border-border text-muted-foreground">
                    +{company.trades.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Certifications */}
          {company?.certifications && company.certifications.length > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Award className="h-5 w-5 text-success flex-shrink-0" />
              <span>{company.certifications.length} certification{company.certifications.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-border mt-auto">
            <Button
              variant="outline"
              size="default"
              className="flex-1 border-border text-foreground hover:bg-muted"
              onClick={() => handleViewProfile(user)}
            >
              View Profile
            </Button>
            <Button
              size="default"
              className="flex-1 bg-accent hover:bg-accent-hover text-accent-foreground"
              onClick={() => handleInviteToProject(user)}
              disabled={userProjects.length === 0}
            >
              Invite to Project
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading subcontractors...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Find Subcontractors</h1>
        <p className="text-muted-foreground">
          Browse and connect with qualified subcontractors for your projects
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-border focus:border-accent focus:ring-accent"
          />
        </div>

        {/* Trade Filters */}
        {availableTrades.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-4">
            <Label className="text-sm font-semibold text-foreground mb-3 block">Filter by Trade</Label>
            <div className="flex flex-wrap gap-2">
              {availableTrades.map((trade) => (
                <Button
                  key={trade}
                  variant={selectedTrades.includes(trade) ? "default" : "outline"}
                  size="sm"
                  className={selectedTrades.includes(trade) 
                    ? "bg-accent hover:bg-accent-hover text-accent-foreground border-accent" 
                    : "border-border text-foreground hover:bg-muted hover:border-border"
                  }
                  onClick={() => toggleTrade(trade)}
                >
                  {trade}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredSubcontractors.length} subcontractor{filteredSubcontractors.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Subcontractor Grid */}
      {filteredSubcontractors.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 auto-rows-fr">
          {filteredSubcontractors.map((subcontractor) => (
            <SubcontractorCard key={subcontractor.id} user={subcontractor} />
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-muted-foreground mb-4">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No subcontractors found</h3>
              <p>Try adjusting your search criteria or filters</p>
            </div>
            {(searchQuery || selectedTrades.length > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedTrades([])
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile Modal */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedProfile?.company?.logo} />
                <AvatarFallback>
                  {selectedProfile?.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{selectedProfile?.user.name}</span>
                  {/* Verification badge for Pro users */}
                  {(selectedProfile?.user.isFounder || 
                    selectedProfile?.company?.plan === "PRO" || 
                    selectedProfile?.company?.plan === "ENTERPRISE" ||
                    (selectedProfile?.company?.trialEndDate && new Date(selectedProfile.company.trialEndDate) > new Date())) && (
                    <img 
                      src="/verified-badge.png" 
                      alt="Verified Pro Member" 
                      className="h-5 w-5" 
                      title="Verified Pro Member" 
                    />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedProfile?.company?.name || "Independent Contractor"}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedProfile && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedProfile.user.email}</span>
                  </div>
                  {selectedProfile.company?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedProfile.company.phone}</span>
                    </div>
                  )}
                  {selectedProfile.company?.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={selectedProfile.company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedProfile.company.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Information */}
              {selectedProfile.company && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Company Information
                  </h3>
                  <div className="space-y-3">
                    {selectedProfile.company.type && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">TYPE</Label>
                        <p className="text-sm">{selectedProfile.company.type}</p>
                      </div>
                    )}

                    {selectedProfile.company.address && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">ADDRESS</Label>
                        <p className="text-sm">{selectedProfile.company.address}</p>
                      </div>
                    )}

                    {selectedProfile.company.description && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">DESCRIPTION</Label>
                        <p className="text-sm">{selectedProfile.company.description}</p>
                      </div>
                    )}

                    {selectedProfile.company.trades && selectedProfile.company.trades.length > 0 && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">SPECIALTIES</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedProfile.company.trades.map((trade) => (
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

              {/* Member Since */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Member Since
                </h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedProfile.user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {/* Message Action */}
              <div className="pt-4 border-t">
                <Button
                  className="w-full bg-accent hover:bg-accent-hover text-white"
                  onClick={() => {
                    setSelectedProfile(null)
                    setSelectedSubcontractor(selectedProfile.user)
                    setMessageModalOpen(true)
                    setMessageText(`Hi ${selectedProfile.user.name},\n\nI'd like to discuss potential collaboration opportunities with you.\n\nBest regards,\n${currentUser?.name}`)
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite to Project Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite to Project</DialogTitle>
            <DialogDescription>
              Send an invitation to {selectedSubcontractor?.name} to bid on one of your projects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {userProjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  You don't have any published projects yet.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create and publish a project first to invite subcontractors.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setInviteModalOpen(false)
                    window.location.href = '/projects'
                  }}
                >
                  Go to Projects
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="project">Select Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {userProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Add a personal message..."
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setInviteModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendInvitation}
                    disabled={!selectedProject}
                    className="flex-1"
                  >
                    Send Invitation
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Message Modal */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a message to {selectedSubcontractor?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="messageText">Message</Label>
              <Textarea
                id="messageText"
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={6}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setMessageModalOpen(false)
                  setMessageText("")
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendingMessage}
                className="flex-1 bg-accent hover:bg-accent-hover text-white"
              >
                {sendingMessage ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}