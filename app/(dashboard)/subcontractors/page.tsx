"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent} from "@/components/ui/card"
import { User, Company } from "@/lib/types"
import { usePlanLimits } from "@/hooks/use-plan-limits"
import { SubcontractorCard as CardItem } from "@/components/subcontractors/subcontractor-card"
import { SubcontractorFilters } from "@/components/subcontractors/subcontractor-filters"
import { SubcontractorProfileModal } from "@/components/subcontractors/subcontractor-profile-modal"
import { InviteModal } from "@/components/subcontractors/invite-modal"
import { MessageModal } from "@/components/subcontractors/message-modal"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

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
  const [selectedTrade, setSelectedTrade] = useState<string>("")
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const [ratingMin, setRatingMin] = useState<number>(0)
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
  const [page, setPage] = useState(1)
  const pageSize = 8

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

  const filteredSubcontractors = useMemo(() => {
    const tradesFilter = selectedTrade ? [selectedTrade] : []
    let list = searchSubcontractors(searchQuery, tradesFilter)
    list = list.filter((u) => {
      const profile = getSubcontractorProfile(u.id)
      const company = profile?.company
      if (ratingMin && typeof company?.experienceRating === "number" && company.experienceRating < ratingMin) return false
      if (selectedLocation) {
        const loc = (company?.address || "").toLowerCase()
        if (!loc.includes(selectedLocation.toLowerCase())) return false
      }
      return true
    })
    return list
  }, [searchQuery, selectedTrade, selectedLocation, ratingMin, searchSubcontractors, getSubcontractorProfile])

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
  const availableLocations = useMemo(() => {
    const s = new Set<string>()
    companies.forEach((c) => {
      if (c.address) {
        const parts = c.address.split(",").map((p) => p.trim())
        const lastTwo = parts.slice(-2).join(", ")
        if (lastTwo) s.add(lastTwo)
      }
    })
    return Array.from(s).sort()
  }, [companies])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedTrade, selectedLocation, ratingMin])

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

      <div className="mb-8">
        <SubcontractorFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          availableTrades={availableTrades}
          availableLocations={availableLocations}
          selectedTrade={selectedTrade}
          onSelectTrade={setSelectedTrade}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          ratingMin={ratingMin}
          onSelectRating={setRatingMin}
        />
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredSubcontractors.length} subcontractor{filteredSubcontractors.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {filteredSubcontractors.length > 0 ? (
        <>
        <div className={"grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr"}>
          {filteredSubcontractors.slice((page-1)*pageSize, (page-1)*pageSize + pageSize).map((subcontractor) => (
            <CardItem
              key={subcontractor.id}
              user={subcontractor}
              company={getSubcontractorProfile(subcontractor.id)?.company as Company | undefined}
              onViewProfile={handleViewProfile}
              onInvite={handleInviteToProject}
              disableInvite={userProjects.length === 0}
            />
          ))}
        </div>
        {filteredSubcontractors.length > pageSize && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p-1)) }} />
                </PaginationItem>
                {[...Array(Math.ceil(filteredSubcontractors.length / pageSize)).keys()].slice(0,5).map(i => (
                  <PaginationItem key={i}>
                    <PaginationLink href="#" isActive={page === i+1} onClick={(e) => { e.preventDefault(); setPage(i+1) }}>
                      {i+1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(Math.ceil(filteredSubcontractors.length / pageSize), p+1)) }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        </>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-muted-foreground mb-4">
              <h3 className="text-lg font-medium mb-2">No subcontractors found</h3>
              <p>Try adjusting your search criteria or filters</p>
            </div>
            {(searchQuery || selectedTrade || selectedLocation || ratingMin) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedTrade("")
                  setSelectedLocation("")
                  setRatingMin(0)
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <SubcontractorProfileModal
        profile={selectedProfile}
        onOpenChange={(open) => !open && setSelectedProfile(null)}
        onMessage={(u) => {
          setSelectedProfile(null)
          setSelectedSubcontractor(u)
          setMessageModalOpen(true)
          setMessageText(`Hi ${u.name},\n\nI'd like to discuss potential collaboration opportunities with you.\n\nBest regards,\n${currentUser?.name}`)
        }}
      />
      <InviteModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        subcontractor={selectedSubcontractor}
        userProjects={userProjects}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        inviteMessage={inviteMessage}
        onChangeMessage={setInviteMessage}
        onSend={handleSendInvitation}
      />
      <MessageModal
        open={messageModalOpen}
        onOpenChange={(open) => {
          setMessageModalOpen(open)
          if (!open) setMessageText("")
        }}
        subcontractor={selectedSubcontractor}
        messageText={messageText}
        onChangeMessage={setMessageText}
        sending={sendingMessage}
        onSend={handleSendMessage}
      />
    </div>
  )
}
