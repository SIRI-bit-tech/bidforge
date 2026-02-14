"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useAblyChat } from "@/hooks/use-ably-chat"
import { Room, Message as ChatMessage } from "@ably/chat"
import { useStore } from "@/lib/store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Loader2, ArrowLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { MessageFileUpload, AttachmentDisplay } from "./message-file-upload"
import { useUploadThing } from "@/lib/services/uploadthing"
import type { MessageAttachment } from "@/lib/types"

interface ChatRoomProps {
    projectId: string
    recipientId: string
    recipientName: string
    existingMessages?: any[] // Messages from database
    onBack?: () => void
    className?: string
}

export function ChatRoom({ projectId, recipientId, recipientName, existingMessages = [], onBack, className }: ChatRoomProps) {
    const { getRoom, isConnected, error: ablyError } = useAblyChat()
    const { currentUser, users } = useStore()
    const [room, setRoom] = useState<Room | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])

    // Convert existing database messages to ChatMessage format
    const convertedExistingMessages = useMemo(() => {
        return existingMessages.map((msg: any) => {
            // Find sender name from users array
            const sender = users.find(u => u.id === msg.senderId)
            const senderName = sender?.name || (msg.senderId === currentUser?.id ? currentUser?.name : 'Unknown')

            return {
                serial: msg.id,
                text: msg.text,
                clientId: msg.senderId,
                timestamp: new Date(msg.sentAt).getTime(),
                metadata: {
                    senderId: msg.senderId,
                    senderName,
                    projectId: msg.projectId,
                },
            }
        })
    }, [existingMessages, users, currentUser])
    const [newMessage, setNewMessage] = useState("")
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const { startUpload: startMessageUpload } = useUploadThing("messageAttachment")
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
        if (!currentUser) return

        let currentRoom: Room | null = null

        async function setupRoom() {
            if (!roomId) return
            try {
                const r = await getRoom(roomId)
                if (!r) return

                currentRoom = r
                setRoom(r)

                // Subscriptions and cleanup will be managed carefully
                let unsubMessages: (() => void) | undefined
                let unsubTyping: (() => void) | undefined

                try {
                    // 1. Explicitly attach first
                    await r.attach()

                    if (currentRoom === r && r.status === 'attached') {
                        // 2. Initialize with existing database messages first
                        setMessages(convertedExistingMessages as any)

                        // 3. Load Ably history and merge with existing messages
                        const history = await r.messages.history({ limit: 50 })
                        const historicalMessages = history.items.reverse()

                        // Merge database messages with Ably messages, avoiding duplicates
                        setMessages((prev) => {
                            const combined = [...prev]
                            const existingSerials = new Set(combined.map(m => m.serial))
                            const existingContentTimestamps = new Set()

                            // Create a set of content+timestamp pairs for faster duplicate detection
                            combined.forEach(m => {
                                const timestamp = typeof m.timestamp === 'number' ? m.timestamp : 0
                                const key = `${m.text}-${Math.floor(timestamp / 1000)}`
                                existingContentTimestamps.add(key)
                            })

                            historicalMessages.forEach(ablyMsg => {
                                // Check by serial first
                                if (ablyMsg.serial && existingSerials.has(ablyMsg.serial)) {
                                    return
                                }

                                // Check by content and timestamp (within 1 second)
                                const ablyTimestamp = typeof ablyMsg.timestamp === 'number' ? ablyMsg.timestamp : 0
                                const contentKey = `${ablyMsg.text}-${Math.floor(ablyTimestamp / 1000)}`
                                if (existingContentTimestamps.has(contentKey)) {
                                    return
                                }

                                // Add the message if not duplicate
                                combined.push(ablyMsg)
                                if (ablyMsg.serial) existingSerials.add(ablyMsg.serial)
                                existingContentTimestamps.add(contentKey)
                            })

                            // Final deduplication by serial
                            const uniqueMessagesMap = new Map()
                            combined.forEach(msg => {
                                if (!uniqueMessagesMap.has(msg.serial)) {
                                    uniqueMessagesMap.set(msg.serial, msg)
                                }
                            })

                            const uniqueMessages = Array.from(uniqueMessagesMap.values())

                            // Sort by timestamp
                            return uniqueMessages.sort((a, b) => {
                                const aTime = typeof a.timestamp === 'number' ? a.timestamp : 0
                                const bTime = typeof b.timestamp === 'number' ? b.timestamp : 0
                                return aTime - bTime
                            })
                        })

                        // 4. Setup subscriptions only after attached and history loaded
                        const msgSub = r.messages.subscribe((msg) => {
                            setMessages((prev) => {
                                // Improved deduplication logic - more comprehensive checks
                                const existingMessage = prev.find(m => 
                                    // Check by serial first (most reliable)
                                    m.serial === msg.message.serial || 
                                    // Check by exact text and sender (within 5 seconds)
                                    (m.text === msg.message.text && 
                                     m.clientId === msg.message.clientId &&
                                     typeof m.timestamp === 'number' &&
                                     typeof msg.message.timestamp === 'number' &&
                                     Math.abs(m.timestamp - msg.message.timestamp) < 5000) ||
                                    // Check by exact text only (last resort for same session)
                                    (m.text === msg.message.text && 
                                     m.clientId === msg.message.clientId &&
                                     prev.filter(p => p.text === msg.message.text).length > 2)
                                )

                                if (existingMessage) {
                                    return prev
                                }

                                // Remove optimistic placeholder if it matches
                                const filtered = prev.filter(m => {
                                    const isOptimistic = m.serial?.toString().startsWith('optimistic-')
                                    if (!isOptimistic) return true

                                    const textMatches = m.text === msg.message.text
                                    const timeClose = typeof m.timestamp === 'number' &&
                                        typeof msg.message.timestamp === 'number' &&
                                        Math.abs(m.timestamp - msg.message.timestamp) < 5000

                                    if (textMatches && timeClose) {
                                        return false // Remove this optimistic message
                                    }
                                    return true
                                })

                                const newMessages = [...filtered, msg.message]
                                
                                // Final safety check - remove any duplicates that might have slipped through
                                const finalMessages = newMessages.filter((msg, index, self) => 
                                    index === self.findIndex(m => 
                                        m.serial === msg.serial || 
                                        (m.text === msg.text && m.clientId === msg.clientId)
                                    )
                                )
                                
                                return finalMessages
                            })
                            setTimeout(() => {
                                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                            }, 100)
                        })
                        unsubMessages = msgSub.unsubscribe

                        const typeSub = r.typing.subscribe((event) => {
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
                        unsubTyping = typeSub.unsubscribe

                        // 4. Enter presence
                        if (r.status === 'attached') {
                            r.presence.enter().catch(() => { })
                        }
                    }
                } catch (bgError) {
                    if (currentRoom === r) {
                        console.warn("Room attachment failed, will retry:", bgError)
                    }
                }

                return () => {
                    unsubMessages?.()
                    unsubTyping?.()
                    if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current)
                        typingTimeoutRef.current = null
                    }

                    // Graceful cleanup
                    if (r.status === 'attached' || r.status === 'attaching') {
                        r.typing.stop().catch(() => { })
                        r.presence.leave().catch(() => { })
                        r.detach().catch(() => { })
                    }
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
        if (!room || (!messageText && selectedFiles.length === 0) || !currentUser || isSending) return

        setIsSending(true)
        try {
            // Upload files first if any
            let uploadedAttachments: MessageAttachment[] = []
            if (selectedFiles.length > 0) {
                const uploaded = await startMessageUpload(selectedFiles)

                if (!uploaded || uploaded.length === 0) {
                    throw new Error("Failed to upload attachments")
                }

                uploadedAttachments = uploaded.map((file, index): MessageAttachment => {
                    const original = selectedFiles[index]
                    const id = file.serverData.url || file.url
                    return {
                        id,
                        messageId: "",
                        fileName: original?.name ?? file.name,
                        originalName: original?.name ?? file.name,
                        fileType: original?.type ?? file.type,
                        fileSize: original?.size ?? file.size,
                        url: file.serverData.url,
                        uploadedAt: new Date(),
                    }
                })
            }

            // Create message text with file info if needed
            let finalMessageText = messageText
            if (!finalMessageText && uploadedAttachments.length > 0) {
                finalMessageText = `Sent ${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''}`
            }

            // JSON-safe attachment payload for Ably metadata and API body
            const attachmentsJson = uploadedAttachments.map((attachment) => ({
                ...attachment,
                uploadedAt: attachment.uploadedAt.toISOString(),
            }))

            // Optimistic update
            const optimisticMsg: any = {
                serial: `optimistic-${Date.now()}`,
                text: finalMessageText,
                clientId: currentUser.id,
                timestamp: Date.now(),
                metadata: {
                    senderId: currentUser.id,
                    senderName: currentUser.name,
                    projectId,
                    attachments: attachmentsJson,
                },
            }

            setMessages((prev) => [...prev, optimisticMsg])
            setNewMessage("")
            setSelectedFiles([]) // Clear selected files after sending

            await room.messages.send({
                text: finalMessageText,
                metadata: {
                    senderId: currentUser.id,
                    senderName: currentUser.name,
                    projectId,
                    attachments: attachmentsJson,
                },
            })

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
                    text: finalMessageText,
                    attachments: attachmentsJson,
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

    const handleFileSelect = (files: File[]) => {
        setSelectedFiles(prev => [...prev, ...files])
    }

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    }

    if (ablyError && !room) {
        return (
            <div className={`flex flex-col ${className || "h-full"} bg-white`}>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center text-red-500">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <p className="font-semibold mb-2">Chat Connection Error</p>
                        <p className="text-sm">{ablyError}</p>
                        <p className="text-xs mt-4 text-gray-400">Retrying automatically...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!room) {
        return (
            <div className={`flex flex-col ${className || "h-full"} bg-white`}>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">Initializing chat...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`flex flex-col ${className || "h-full"} bg-white`}>
            {/* Fixed Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center justify-between">
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
                        <Avatar className="h-10 w-10 bg-gray-600 text-white">
                            <AvatarFallback className="bg-gray-600 text-white font-medium">
                                {recipientName[0]?.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-semibold text-gray-900">{recipientName}</h3>
                            {typingUsers.has(recipientId) ? (
                                <p className="text-sm text-gray-500 italic">typing...</p>
                            ) : !isConnected ? (
                                <p className="text-sm text-amber-500">connecting...</p>
                            ) : (
                                <p className="text-sm text-green-500 font-medium">online</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Scrollable Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <p className="text-sm">No messages yet. Start the conversation!</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg, index) => {
                            const isOwnMessage = msg.metadata?.senderId === currentUser?.id
                            const showAvatar = index === 0 || messages[index - 1]?.metadata?.senderId !== msg.metadata?.senderId

                            return (
                                <div key={msg.serial} className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                                    <div className={`flex-shrink-0 ${showAvatar ? "" : "invisible"}`}>
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className={isOwnMessage ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}>
                                                {(msg.metadata?.senderName as string)?.[0]?.toUpperCase() || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? "items-end" : "items-start"}`}>
                                        <div
                                            className={`rounded-2xl px-4 py-3 ${isOwnMessage
                                                ? "bg-gray-600 text-white rounded-br-md"
                                                : "bg-white text-gray-900 border border-gray-200 rounded-bl-md shadow-sm"
                                                }`}
                                        >
                                            <p className="text-sm leading-relaxed">{msg.text}</p>
                                            {(() => {
                                                const attachments = msg.metadata?.attachments;
                                                if (!attachments) return null;
                                                
                                                // Handle case where attachments might be a JSON string
                                                const parsedAttachments = typeof attachments === 'string' 
                                                    ? JSON.parse(attachments) 
                                                    : attachments;
                                                
                                                if (!Array.isArray(parsedAttachments) || parsedAttachments.length === 0) return null;
                                                
                                                return (
                                                    <div className="mt-2">
                                                        <AttachmentDisplay
                                                            attachments={parsedAttachments}
                                                            onDownload={(attachment) => {
                                                                // Create a temporary link and trigger download
                                                                const link = document.createElement('a')
                                                                link.href = attachment.url
                                                                link.download = attachment.originalName || attachment.fileName
                                                                document.body.appendChild(link)
                                                                link.click()
                                                                document.body.removeChild(link)
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <span className="text-xs text-gray-400 mt-1 px-2">
                                            {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Fixed Input Area */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
                <MessageFileUpload
                    onFileSelect={handleFileSelect}
                    selectedFiles={selectedFiles}
                    onRemoveFile={handleRemoveFile}
                    disabled={isSending}
                />
                <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 relative">
                        <Input
                            ref={inputRef}
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value)
                                handleTyping()
                            }}
                            onKeyPress={handleKeyPress}
                            placeholder="Your message"
                            disabled={isSending}
                            className="pr-12 rounded-full border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-300 text-sm"
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || isSending}
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 p-0 bg-gray-600 hover:bg-gray-700 text-white"
                        >
                            {isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
