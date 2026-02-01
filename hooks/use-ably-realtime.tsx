"use client"

import { useEffect } from "react"
import { useAbly } from "./use-ably-chat"
import { useStore } from "@/lib/store"
import { useToast } from "./use-toast"

export function useAblyRealtime() {
    const { realtimeClient, isConnected } = useAbly()
    const { currentUser, addNotification, addMessage } = useStore()
    const { toast } = useToast()

    useEffect(() => {
        if (!isConnected || !realtimeClient || !currentUser) return

        // 1. Subscribe to User Notifications
        const notifChannel = realtimeClient.channels.get(`notifications:${currentUser.id}`)

        notifChannel.subscribe("new-notification", (message) => {
            console.log("🔔 New Real-time Notification:", message.data)

            const notification = {
                ...message.data,
                createdAt: new Date(message.data.createdAt)
            }

            addNotification(notification)

            // Show toast
            toast({
                title: notification.title,
                description: notification.message,
            })
        })

        // 2. Subscribe to Global Messages (for unread counts/updates when not in room)
        const msgChannel = realtimeClient.channels.get(`messages:${currentUser.id}`)

        msgChannel.subscribe("new-message", (message) => {
            console.log("💬 New Real-time Message Alert:", message.data)

            const chatMsg = {
                ...message.data,
                sentAt: new Date(message.data.sentAt)
            }

            addMessage(chatMsg)
        })

        return () => {
            notifChannel.unsubscribe()
            msgChannel.unsubscribe()
        }
    }, [isConnected, realtimeClient, currentUser, addNotification, addMessage, toast])
}
