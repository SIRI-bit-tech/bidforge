"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useAblyChat } from "@/hooks/use-ably-chat"
import { Room, Message as ChatMessage } from "@ably/chat"
import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Loader2, ArrowLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ChatRoomProps {
    projectId: string
    recipientId: string
    recipientName: string
    onBack?: () => void
    className?: string
}

export function ChatRoom({ projectId, recipientId, recipientName, onBack, className }: ChatRoomProps) {
    const { getRoom, isConnected } = useAblyChat()
    const { currentUser } = useStore()
    const [room, setRoom] = useState<Room | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
    const [isSending, setIsSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Room ID format: project-{projectId}-{user1Id}-{user2Id} (sorted)
    const roomId = useMemo(() => {
        if (!currentUser?.id) return null
        return `project-${projectId}-${[currentUser.id, recipientId].sort().join("-")}`
    }, [projectId, currentUser?.id, recipientId])

    useEffect(() => {
        if (!isConnected || !currentUser) return

        let currentRoom: Room | null = null

        async function setupRoom() {
            if (!roomId) return
            try {
                const r = await getRoom(roomId)
                if (!r) return

                currentRoom = r
                setRoom(r)

                // Attach to room
                await r.attach()

                // Load message history
                const history = await r.messages.history({ limit: 50 })
                setMessages(history.items.reverse())

                // Subscribe to new messages
                const { unsubscribe: unsubMessages } = r.messages.subscribe((msg) => {
                    setMessages((prev) => [...prev, msg.message])

                    // Scroll to bottom
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                    }, 100)
                })

                // Subscribe to typing indicators
                const { unsubscribe: unsubTyping } = r.typing.subscribe((event) => {
                    setTypingUsers((prev) => {
                        const next = new Set(prev)
                        if (event.currentlyTyping.has(recipientId)) {
                            next.add(recipientId)
                        } else {
                            next.delete(recipientId)
                        }
                        return next
                    })
                })

                // Subscribe to presence
                await r.presence.enter()

                return () => {
                    unsubMessages()
                    unsubTyping()
                    if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current)
                        typingTimeoutRef.current = null
                    }
                    r.typing.stop().catch(() => { })
                    r.presence.leave().catch(console.error)
                    r.detach().catch(console.error)
                }
            } catch (error) {
                console.error("Failed to setup chat room:", error)
            }
        }

        const cleanup = setupRoom()

        return () => {
            cleanup.then((fn) => fn?.())
        }
    }, [isConnected, currentUser?.id, roomId, recipientId, getRoom])

    const handleSendMessage = async () => {
        const messageText = newMessage.trim()
        if (!room || !messageText || !currentUser || isSending) return

        setIsSending(true)
        try {
            await room.messages.send({
                text: messageText,
                metadata: {
                    senderId: currentUser.id,
                    senderName: currentUser.name,
                    projectId,
                },
            })

            setNewMessage("")

            // Stop typing indicator
            await room.typing.stop()
            setIsTyping(false)

            // Also persist to database for notifications
            await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    receiverId: recipientId,
                    text: messageText,
                }),
            })
        } catch (error) {
            console.error("Failed to send message:", error)
        } finally {
            setIsSending(false)
            inputRef.current?.focus()
        }
    }

    const handleTyping = async () => {
        if (!room || !currentUser) return

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        if (!isTyping) {
            setIsTyping(true)
        }
        await room.typing.keystroke()

        // Auto-stop typing after 5 seconds of inactivity
        typingTimeoutRef.current = setTimeout(async () => {
            if (isTyping) {
                await room.typing.stop()
                setIsTyping(false)
                typingTimeoutRef.current = null
            }
        }, 5000)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    if (!isConnected) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Connecting to chat...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={`flex flex-col ${className || "h-[600px]"}`}>
            <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="lg:hidden"
                            onClick={onBack}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div>
                        <CardTitle className="text-lg">
                            Chat with {recipientName}
                        </CardTitle>
                        {typingUsers.has(recipientId) && (
                            <p className="text-xs text-muted-foreground italic">typing...</p>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwnMessage = msg.metadata?.senderId === currentUser?.id
                        return (
                            <div
                                key={msg.serial}
                                className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                        {(msg.metadata?.senderName as string)?.[0]?.toUpperCase() || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={`flex flex-col ${isOwnMessage ? "items-end" : ""}`}>
                                    <div
                                        className={`rounded-lg px-4 py-2 max-w-md ${isOwnMessage
                                            ? "bg-accent text-white"
                                            : "bg-muted text-foreground"
                                            }`}
                                    >
                                        <p className="text-sm">{msg.text}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </CardContent>

            <div className="border-t p-4">
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value)
                            handleTyping()
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        disabled={isSending}
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isSending}
                        className="bg-accent hover:bg-accent-hover text-white"
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </Card>
    )
}
