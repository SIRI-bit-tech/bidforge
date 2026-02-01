"use client"

import { useEffect } from "react"
import { useAbly } from "@/hooks/use-ably"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
    const { currentUser, addMessage, addNotification, loadNotifications } = useStore()
    const client = useAbly()
    const { toast } = useToast()
    const router = useRouter()

    useEffect(() => {
        if (currentUser) {
            loadNotifications()
        }
    }, [currentUser, loadNotifications])

    useEffect(() => {
        if (!client || !currentUser) return

        // 1. Subscribe to Messages
        const messageChannel = client.channels.get(`messages:${currentUser.id}`)

        // Define message handler
        const handleMessage = (message: any) => {
            const msgData = message.data

            // Convert date string back to Date object
            if (typeof msgData.sentAt === 'string') {
                msgData.sentAt = new Date(msgData.sentAt)
            }

            addMessage(msgData)

            // Optional: Sound or Toast for message if not on messages page
            if (!window.location.pathname.includes('/messages')) {
                toast({
                    title: "New Message",
                    description: "You have received a new message",
                    action: (
                        <button
                            onClick={() => router.push(`/messages?project=${msgData.projectId}&user=${msgData.senderId}`)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded text-xs"
                        >
                            View
                        </button>
                    )
                })
            }
        }

        messageChannel.subscribe('new-message', handleMessage)

        // 2. Subscribe to Notifications
        const notificationChannel = client.channels.get(`notifications:${currentUser.id}`)

        const handleNotification = (message: any) => {
            const notifData = message.data

            if (typeof notifData.createdAt === 'string') {
                notifData.createdAt = new Date(notifData.createdAt)
            }

            addNotification(notifData)

            toast({
                title: notifData.title,
                description: notifData.message,
            })
        }

        notificationChannel.subscribe('new-notification', handleNotification)

        return () => {
            messageChannel.unsubscribe('new-message', handleMessage)
            notificationChannel.unsubscribe('new-notification', handleNotification)
        }
    }, [client, currentUser, addMessage, addNotification, toast, router])

    return <>{children}</>
}
