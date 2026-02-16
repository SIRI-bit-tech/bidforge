"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useStore } from "@/lib/store"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MessageSquare, Search, MoreHorizontal, Trash2 } from "lucide-react"
import { ChatRoom } from "@/components/chat-room"
import { Message, Project, User } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"

interface Conversation {
  projectId: string
  project: Project
  otherUser: User
  lastMessage?: Message
  unreadCount: number
  messages: Message[]
}

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    currentUser,
    messages,
    projects,
    users,
    markMessageAsRead,
    getMessagesByUser,
    loadAllUsers,
    loadProjects,
    loadArchivedConversations,
    archiveConversation,
    unarchiveConversation,
    archivedConversations
  } = useStore()

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showConversationsList, setShowConversationsList] = useState(true)
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'ARCHIVE'>('GENERAL')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ projectId: string, otherUserId: string } | null>(null)

  // Load messages and related data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        try {
          // Load users and projects first, then messages
          // This ensures we have the necessary data for conversation grouping
          await Promise.all([loadAllUsers(), loadProjects()])
          await getMessagesByUser(currentUser.id)
          await loadArchivedConversations()
        } catch (error) {
          console.error('Failed to load messages:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    loadData()
  }, [currentUser, getMessagesByUser, loadAllUsers, loadProjects, loadArchivedConversations])

  // Group messages into conversations by project
  const conversations = useMemo(() => {
    if (!currentUser) return []

    const conversationMap = new Map<string, Conversation>()

    // Get all messages where current user is sender or receiver
    const userMessages = messages.filter(msg =>
      msg.senderId === currentUser.id || msg.receiverId === currentUser.id
    )

    userMessages.forEach(message => {
      const project = projects.find(p => p.id === message.projectId)
      if (!project) {
        return
      }

      // Determine the other user in the conversation
      const otherUserId = message.senderId === currentUser.id ? message.receiverId : message.senderId
      const otherUser = users.find(u => u.id === otherUserId)
      if (!otherUser) {
        return
      }

      const key = `${message.projectId}::${otherUserId}`

      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          projectId: message.projectId,
          project,
          otherUser,
          messages: [],
          unreadCount: 0,
          lastMessage: undefined
        })
      }

      const conversation = conversationMap.get(key)!
      conversation.messages.push(message)

      // Count unread messages (messages sent to current user that are unread)
      if (message.receiverId === currentUser.id && !message.read) {
        conversation.unreadCount++
      }

      // Update last message if this is more recent
      if (!conversation.lastMessage || message.sentAt > conversation.lastMessage.sentAt) {
        conversation.lastMessage = message
      }
    })

    // Sort messages within each conversation
    conversationMap.forEach(conversation => {
      conversation.messages.sort((a, b) => {
        const aTime = new Date(a.sentAt).getTime()
        const bTime = new Date(b.sentAt).getTime()
        return aTime - bTime
      })
    })

    // Convert to array and sort by last message time
    const result = Array.from(conversationMap.values())
      .sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.sentAt).getTime() : 0
        const bTime = b.lastMessage ? new Date(b.lastMessage.sentAt).getTime() : 0
        return bTime - aTime
      })

    return result
  }, [messages, projects, users, currentUser])

  // Handle URL parameters for pre-selecting conversations
  useEffect(() => {
    if (!searchParams) return

    const projectId = searchParams.get('project')
    const userId = searchParams.get('user')

    if (projectId && userId) {
      // Auto-select conversation based on URL params
      setSelectedConversation(`${projectId}::${userId}`)
      // Clear URL params after selection
      router.replace('/messages', { scroll: false })
    } else if (userId && !projectId) {
      // If only user ID is provided, try to find any conversation with that user
      const conversation = conversations.find(conv => conv.otherUser.id === userId)
      if (conversation) {
        setSelectedConversation(`${conversation.projectId}::${conversation.otherUser.id}`)
      } else {
        // Create a new conversation context - we need a project for messaging
        // For now, let's use the most recent project the current user created
        const userProject = projects.find(p => p.createdBy === currentUser?.id || p.createdById === currentUser?.id)
        if (userProject) {
          setSelectedConversation(`${userProject.id}::${userId}`)
        }
      }
      router.replace('/messages', { scroll: false })
    }
  }, [searchParams, conversations, projects, currentUser, router])

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations

    return conversations.filter(conv =>
      conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage?.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [conversations, searchQuery])
  const archivedKey = useMemo(() => {
    const set = new Set<string>()
    archivedConversations.forEach(a => set.add(`${a.projectId}::${a.otherUserId}`))
    return set
  }, [archivedConversations])
  const tabConversations = useMemo(() => {
    return filteredConversations.filter(conv => {
      const key = `${conv.projectId}::${conv.otherUser.id}`
      const isArchived = archivedKey.has(key)
      return activeTab === 'ARCHIVE' ? isArchived : !isArchived
    })
  }, [filteredConversations, archivedKey, activeTab])

  // Get selected conversation or create a virtual one for new conversations
  const selectedConv = useMemo(() => {
    if (!selectedConversation || !currentUser) return null

    // Try to find existing conversation
    const existing = conversations.find(conv =>
      `${conv.projectId}::${conv.otherUser.id}` === selectedConversation
    )

    if (existing) return existing

    // Create virtual conversation for new chats
    const [projectId, userId] = selectedConversation.split('::')
    const project = projects.find(p => p.id === projectId)
    const otherUser = users.find(u => u.id === userId)

    if (project && otherUser) {
      return {
        projectId,
        project,
        otherUser,
        messages: [],
        unreadCount: 0,
        lastMessage: undefined
      }
    }

    return null
  }, [selectedConversation, conversations, projects, users, currentUser])

  // Poll for new messages every 5 seconds when a conversation is selected
  useEffect(() => {
    if (!selectedConv || !currentUser) return

    const pollMessages = async () => {
      try {
        await getMessagesByUser(currentUser.id)
      } catch (error) {
        console.error('Failed to poll messages:', error)
      }
    }

    // Poll every 5 seconds
    const interval = setInterval(pollMessages, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [selectedConv, currentUser, getMessagesByUser])

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConv && currentUser) {
      const messagesToMarkAsRead = selectedConv.messages
        .filter(msg => {
          const isReceiver = msg.receiverId === currentUser.id
          const isUnread = !msg.read
          return isReceiver && isUnread
        })

      // Mark messages as read sequentially to avoid race conditions
      const markMessagesSequentially = async () => {
        for (const msg of messagesToMarkAsRead) {
          try {
            await markMessageAsRead(msg.id)
            // WebSocket markAsRead disabled - using API only
            // markAsRead(msg.id, msg.senderId)
          } catch (error) {
            console.error(`Failed to mark message ${msg.id} as read:`, error)
            // Continue with other messages even if one fails
          }
        }
      }

      if (messagesToMarkAsRead.length > 0) {
        markMessagesSequentially()
      }
    }
  }, [selectedConv, currentUser, markMessageAsRead])

  // Join project room when conversation is selected (disabled - WebSocket not available)
  // useEffect(() => {
  //   if (selectedConv) {
  //     joinProjectRoom(selectedConv.projectId)
  //   }
  // }, [selectedConv, joinProjectRoom])

  // Handle conversation selection for mobile
  const handleConversationSelect = (conversationKey: string) => {
    setSelectedConversation(conversationKey)
    setShowConversationsList(false) // Hide conversations list on mobile when chat is selected
  }

  // Handle back to conversations on mobile
  const handleBackToConversations = () => {
    setSelectedConversation(null)
    setShowConversationsList(true)
  }

  const handleDeleteConversation = async (projectId: string, otherUserId: string) => {
    try {
      const response = await fetch(`/api/messages/conversation?projectId=${projectId}&otherUserId=${otherUserId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await unarchiveConversation(projectId, otherUserId)
        if (currentUser) {
          await getMessagesByUser(currentUser.id)
        }
        if (selectedConversation === `${projectId}::${otherUserId}`) {
          setSelectedConversation(null)
          setShowConversationsList(true)
        }
        setDeleteDialogOpen(false)
        setDeleteTarget(null)
      } else {
        console.error('Failed to delete conversation')
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  if (!currentUser) return null

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed top-16 left-0 lg:left-64 right-0 bottom-0 flex overflow-hidden">
      {/* Messages List Column - Fixed, with internal scrolling */}
      <div className={`w-full lg:w-[400px] flex-shrink-0 border-r border-border bg-card flex flex-col overflow-x-hidden ${!showConversationsList ? 'hidden lg:flex' : ''}`}>
        {/* Messages Header - Fixed */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Messages</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (currentUser?.role === 'CONTRACTOR') {
                  router.push('/subcontractors')
                } else {
                  router.push('/opportunities')
                }
              }}
            >
              New Chat
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTab === 'GENERAL' ? "default" : "outline"}
              size="sm"
              className={activeTab === 'GENERAL' ? "rounded-full bg-primary text-primary-foreground" : "rounded-full"}
              onClick={() => setActiveTab('GENERAL')}
            >
              General
            </Button>
            <Button
              variant={activeTab === 'ARCHIVE' ? "default" : "outline"}
              size="sm"
              className={activeTab === 'ARCHIVE' ? "rounded-full bg-primary text-primary-foreground" : "rounded-full"}
              onClick={() => setActiveTab('ARCHIVE')}
            >
              Archive
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {tabConversations.length > 0 ? (
            <div>
              {tabConversations.map((conversation) => {
                const isSelected = `${conversation.projectId}::${conversation.otherUser.id}` === selectedConversation
                const isArchived = archivedKey.has(`${conversation.projectId}::${conversation.otherUser.id}`)

                return (
                  <div
                    key={`${conversation.projectId}::${conversation.otherUser.id}`}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border ${isSelected ? 'bg-muted' : ''
                      }`}
                    onClick={() => handleConversationSelect(`${conversation.projectId}::${conversation.otherUser.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {conversation.otherUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">
                            {conversation.otherUser.name}
                          </p>
                          <div className="ml-auto flex items-center gap-2">
                            {conversation.lastMessage && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(conversation.lastMessage.sentAt), { addSuffix: false })}
                              </span>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!isArchived ? (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      await archiveConversation(conversation.projectId, conversation.otherUser.id)
                                    }}
                                  >
                                    Archive
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      await unarchiveConversation(conversation.projectId, conversation.otherUser.id)
                                    }}
                                  >
                                    Unarchive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDeleteTarget({ projectId: conversation.projectId, otherUserId: conversation.otherUser.id })
                                    setDeleteDialogOpen(true)
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Conversation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        {conversation.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {conversation.lastMessage.text}
                          </p>
                        )}
                        <div className="flex items-center justify-end">
                          {conversation.unreadCount > 0 && (
                            <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area - Fixed layout with internal scrolling */}
      <div className={`flex-1 flex flex-col ${showConversationsList ? 'hidden lg:flex' : ''} bg-background overflow-hidden`}>
        {selectedConv ? (
          <ChatRoom
            projectId={selectedConv.projectId}
            recipientId={selectedConv.otherUser.id}
            recipientName={selectedConv.otherUser.name}
            existingMessages={selectedConv.messages}
            onBack={handleBackToConversations}
            className="h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this entire conversation? This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  handleDeleteConversation(deleteTarget.projectId, deleteTarget.otherUserId)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
