"use client"

import { createContext, useContext, useEffect, useState } from "react"
import * as Ably from "ably"
import { ChatClient, Room, LogLevel } from "@ably/chat"

interface AblyChatContextType {
    chatClient: ChatClient | null
    isConnected: boolean
    getRoom: (roomId: string) => Promise<Room | null>
}

const AblyChatContext = createContext<AblyChatContextType>({
    chatClient: null,
    isConnected: false,
    getRoom: async () => null,
})

export function AblyChatProvider({ children }: { children: React.ReactNode }) {
    const [chatClient, setChatClient] = useState<ChatClient | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        let mounted = true
        let client: ChatClient | null = null

        async function initializeChat() {
            try {
                // Get auth token from your API
                const response = await fetch("/api/ably/auth")
                if (!response.ok) {
                    console.error("Failed to get Ably token")
                    return
                }

                const tokenRequest = await response.json()

                // Create Ably Realtime client
                const realtimeClient = new Ably.Realtime({
                    authCallback: async (tokenParams, callback) => {
                        try {
                            const res = await fetch("/api/ably/auth")
                            const tokenReq = await res.json()
                            callback(null, tokenReq)
                        } catch (error: any) {
                            callback(error, null)
                        }
                    },
                })

                // Wait for connection
                await new Promise<void>((resolve, reject) => {
                    realtimeClient.connection.on("connected", () => {
                        console.log("✅ Ably Realtime connected")
                        resolve()
                    })
                    realtimeClient.connection.on("failed", (error) => {
                        console.error("❌ Ably connection failed:", error)
                        reject(error)
                    })
                })

                // Create Chat client
                client = new ChatClient(realtimeClient, {
                    logLevel: LogLevel.Error,
                })

                if (mounted) {
                    setChatClient(client)
                    setIsConnected(true)
                }
            } catch (error) {
                console.error("Failed to initialize Ably Chat:", error)
            }
        }

        initializeChat()

        return () => {
            mounted = false
            if (client) {
                // Cleanup will be handled by room releases
            }
        }
    }, [])

    const getRoom = async (roomId: string): Promise<Room | null> => {
        if (!chatClient) {
            console.warn("Chat client not initialized")
            return null
        }

        try {
            const room = await chatClient.rooms.get(roomId, {
                typing: { heartbeatThrottleMs: 5000 },
            })
            return room
        } catch (error) {
            console.error("Failed to get room:", error)
            return null
        }
    }

    return (
        <AblyChatContext.Provider value={{ chatClient, isConnected, getRoom }}>
            {children}
        </AblyChatContext.Provider>
    )
}

export function useAblyChat() {
    const context = useContext(AblyChatContext)
    if (!context) {
        throw new Error("useAblyChat must be used within AblyChatProvider")
    }
    return context
}
