"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Send } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

export default function MessagesPage() {
  const { currentUser, messages, users, sendMessage } = useStore()
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messageText, setMessageText] = useState("")

  if (!currentUser) return null

  // Get all conversations for current user
  const userMessages = messages.filter((m) => m.senderId === currentUser.id || m.receiverId === currentUser.id)

  // Group messages by conversation partner
  const conversations = Array.from(
    new Set(userMessages.map((m) => (m.senderId === currentUser.id ? m.receiverId : m.senderId))),
  ).map((userId) => {
    const partner = users.find((u) => u.id === userId)
    const conversationMessages = userMessages.filter(
      (m) =>
        (m.senderId === userId && m.receiverId === currentUser.id) ||
        (m.receiverId === userId && m.senderId === currentUser.id),
    )
    const lastMessage = conversationMessages.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0]
    const unreadCount = conversationMessages.filter((m) => m.receiverId === currentUser.id && !m.read).length

    return {
      userId,
      partner,
      messages: conversationMessages,
      lastMessage,
      unreadCount,
    }
  })

  const selectedConversationData = conversations.find((c) => c.userId === selectedConversation)

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return

    sendMessage({
      projectId: "", // In real app, would be associated with a project
      receiverId: selectedConversation,
      text: messageText,
    })

    setMessageText("")
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground mt-1">Communicate with contractors and subcontractors</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Conversations</h2>
            </div>

            {conversations.length > 0 ? (
              <div className="divide-y divide-border">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.userId}
                    onClick={() => setSelectedConversation(conversation.userId)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                      selectedConversation === conversation.userId && "bg-muted",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-sm flex-shrink-0">
                        {conversation.partner?.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-sm truncate">{conversation.partner?.name}</div>
                          {conversation.unreadCount > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white text-xs font-bold flex-shrink-0">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage?.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(conversation.lastMessage?.sentAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8">
                <EmptyState
                  icon={MessageSquare}
                  title="No messages"
                  description="Start a conversation with a contractor or subcontractor"
                />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedConversationData ? (
            <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-sm">
                    {selectedConversationData.partner?.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{selectedConversationData.partner?.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedConversationData.partner?.email}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversationData.messages
                  .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime())
                  .map((message) => {
                    const isOwnMessage = message.senderId === currentUser.id

                    return (
                      <div key={message.id} className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg p-3",
                            isOwnMessage ? "bg-accent text-white" : "bg-muted",
                          )}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              isOwnMessage ? "text-accent-foreground/70" : "text-muted-foreground",
                            )}
                          >
                            {formatRelativeTime(message.sentAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} className="bg-accent hover:bg-accent-hover text-white">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-12">
              <EmptyState
                icon={MessageSquare}
                title="No conversation selected"
                description="Select a conversation from the left to start messaging"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
