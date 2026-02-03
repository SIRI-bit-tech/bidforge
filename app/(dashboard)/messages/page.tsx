"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageFileUpload, AttachmentDisplay } from "@/components/message-file-upload"
import { Send, MessageSquare, Search, Clock, CheckCheck, ArrowLeft } from "lucide-react"
import { ChatRoom } from "@/components/chat-room"
import { Message, Project, User, MessageAttachment } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

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
    sendMessage,
    markMessageAsRead,
    getMessagesByUser,
    loadUsers,
    loadProjects
  } = useStore()

  const { toast } = useToast()

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showConversationsList, setShowConversationsList] = useState(true)

  // Load messages and related data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        try {
          await getMessagesByUser(currentUser.id)
          await loadUsers()
          await loadProjects()
        } catch (error) {
          console.error('Failed to load messages:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    loadData()
  }, [currentUser, getMessagesByUser, loadUsers, loadProjects])

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

    return () => clearInterval(interval)
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
    <div className="fixed top-16 left-0 right-0 bottom-0 lg:relative lg:top-auto lg:left-auto lg:right-auto lg:bottom-auto lg:h-auto flex flex-col lg:container lg:mx-auto lg:px-4 lg:py-8">
      {/* Header - Only show on desktop or when conversations list is visible on mobile */}
      <div className={`mb-4 lg:mb-8 px-4 py-4 lg:px-0 lg:py-0 ${!showConversationsList ? 'hidden lg:block' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Messages</h1>
            <p className="text-sm lg:text-base text-muted-foreground">
              Communicate with {currentUser.role === "CONTRACTOR" ? "subcontractors" : "contractors"} about your projects
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 lg:gap-6 h-full lg:h-[calc(100vh-200px)] overflow-hidden">
        {/* Conversations List - Show/hide based on mobile state */}
        <Card className={`lg:col-span-1 h-full flex flex-col ${!showConversationsList ? 'hidden lg:flex' : ''} border-0 lg:border rounded-none lg:rounded-lg`}>
          <CardHeader className="pb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conversations</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // For contractors, go to subcontractors page
                  // For subcontractors, show available projects/contractors
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {filteredConversations.length > 0 ? (
                <div className="space-y-1">
                  {filteredConversations.map((conversation) => {
                    const isSelected = `${conversation.projectId}::${conversation.otherUser.id}` === selectedConversation

                    return (
                      <div
                        key={`${conversation.projectId}::${conversation.otherUser.id}`}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? 'bg-muted border-r-2 border-primary' : ''
                          }`}
                        onClick={() => handleConversationSelect(`${conversation.projectId}::${conversation.otherUser.id}`)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {conversation.otherUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate">
                                {conversation.otherUser.name}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-1">
                              {conversation.project.title}
                            </p>
                            {conversation.lastMessage && (
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground truncate">
                                  {conversation.lastMessage.text}
                                </p>
                                <div className="flex items-center gap-1 ml-2">
                                  {conversation.lastMessage.senderId === currentUser.id && (
                                    <CheckCheck className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {conversation.lastMessage.sentAt ? formatDistanceToNow(new Date(conversation.lastMessage.sentAt), { addSuffix: true }) : 'Unknown time'}
                                  </span>
                                </div>
                              </div>
                            )}
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
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area - Show/hide based on mobile state */}
        <div className={`lg:col-span-2 h-full flex flex-col ${showConversationsList ? 'hidden lg:flex' : ''} bg-background lg:bg-card overflow-hidden`}>
          {selectedConv ? (
            <ChatRoom
              projectId={selectedConv.projectId}
              recipientId={selectedConv.otherUser.id}
              recipientName={selectedConv.otherUser.name}
              onBack={handleBackToConversations}
              className="h-full border-0 lg:border rounded-none lg:rounded-lg"
            />
          ) : (
            <Card className="flex items-center justify-center h-full border-0 lg:border rounded-none lg:rounded-lg">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p>Choose a conversation from the list to start messaging</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}