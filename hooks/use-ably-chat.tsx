"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import * as Ably from "ably"
import { ChatClient, Room, LogLevel } from "@ably/chat"

interface AblyContextType {
    realtimeClient: Ably.Realtime | null
    chatClient: ChatClient | null
    isConnected: boolean
    error: string | null
    getRoom: (roomId: string) => Promise<Room | null>
}

const AblyContext = createContext<AblyContextType | undefined>(undefined)

export function AblyProvider({ children }: { children: React.ReactNode }) {
    const [realtimeClient, setRealtimeClient] = useState<Ably.Realtime | null>(null)
    const [chatClient, setChatClient] = useState<ChatClient | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true
        let client: ChatClient | null = null
        let realtime: Ably.Realtime | null = null

        async function initializeChat() {
            try {
                // Get auth token from your API with a timeout
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 10000)

                const response = await fetch("/api/ably/auth", { signal: controller.signal })
                clearTimeout(timeoutId)

                if (!response.ok) {
                    throw new Error(`Failed to get Ably token: ${response.statusText}`)
                }

                const tokenRequest = await response.json()

                // Create Ably Realtime client
                realtime = new Ably.Realtime({
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

                if (mounted) {
                    setRealtimeClient(realtime)
                }

                // Create Chat client immediately
                const chat = new ChatClient(realtime, {
                    logLevel: LogLevel.Warn,
                })

                if (mounted) {
                    setChatClient(chat)
                }

                // Monitor connection state in the background
                const handleStateChange = () => {
                    if (mounted) {
                        setIsConnected(realtime?.connection.state === "connected")
                    }
                }

                realtime.connection.on("connected", handleStateChange)
                realtime.connection.on("disconnected", handleStateChange)
                realtime.connection.on("failed", handleStateChange)
                realtime.connection.on("suspended", handleStateChange)

                // Initial check
                handleStateChange()

            } catch (err: any) {
                console.error("Failed to initialize Ably Chat:", err)
                if (mounted) {
                    setError(err.message || "Failed to initialize chat")
                    // If it failed once, we might want to retry after a delay
                    setTimeout(initializeChat, 5000)
                }
            }
        }

        initializeChat()

        return () => {
            mounted = false
            if (realtime) {
                realtime.connection.off()
                realtime.close()
            }
        }
    }, [])

    const getRoom = useCallback(async (roomId: string): Promise<Room | null> => {
        if (!chatClient) {
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
    }, [chatClient])

    return (
        <AblyContext.Provider value={{ realtimeClient, chatClient, isConnected, error, getRoom }}>
            {children}
        </AblyContext.Provider>
    )
}

export function useAbly() {
    const context = useContext(AblyContext)
    if (!context) {
        throw new Error("useAbly must be used within AblyProvider")
    }
    return context
}

export function useAblyChat() {
    return useAbly()
}
