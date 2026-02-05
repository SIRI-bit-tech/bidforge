"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import * as Ably from "ably"
import { ChatClient, Room, LogLevel } from "@ably/chat"
import { useStore } from "@/lib/store"

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
    const isAuthenticated = useStore(state => state.isAuthenticated)

    // Retry mechanism constants and state
    const MAX_INIT_RETRIES = 5
    const BASE_DELAY = 1000 // 1 second base delay
    const [retryCount, setRetryCount] = useState(0)

    useEffect(() => {
        let mounted = true
        let realtime: Ably.Realtime | null = null

        async function initializeChat() {
            if (!isAuthenticated) return

            try {
                // Get auth token from your API with a timeout
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 10000)

                const response = await fetch("/api/ably/auth", { signal: controller.signal })
                clearTimeout(timeoutId)

                if (!response.ok) {
                    if (response.status === 401) {
                        // Silently handle unauthorized - wait for login
                        return
                    }
                    throw new Error(`Failed to get Ably token: ${response.statusText}`)
                }

                const tokenRequest = await response.json()

                // Create Ably Realtime client
                realtime = new Ably.Realtime({
                    authCallback: async (tokenParams, callback) => {
                        try {
                            const res = await fetch("/api/ably/auth")
                            if (!res.ok) throw new Error("Ably auth failed")
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

                // Monitor connection state
                const handleStateChange = () => {
                    if (mounted) {
                        setIsConnected(realtime?.connection.state === "connected")
                    }
                }

                realtime.connection.on("connected", handleStateChange)
                realtime.connection.on("disconnected", handleStateChange)
                realtime.connection.on("failed", handleStateChange)
                realtime.connection.on("suspended", handleStateChange)

                handleStateChange()

                // Reset retry count on successful initialization
                if (mounted) {
                    setRetryCount(0)
                }

            } catch (err: any) {
                console.error("Failed to initialize Ably Chat:", err)
                if (mounted) {
                    setError(err.message || "Failed to initialize chat")
                    
                    // Bounded retry with exponential backoff
                    if (isAuthenticated && retryCount < MAX_INIT_RETRIES) {
                        const delay = Math.min(BASE_DELAY * Math.pow(2, retryCount), 30000) // Cap at 30 seconds
                        setRetryCount(prev => prev + 1)
                        setTimeout(initializeChat, delay)
                    } else if (retryCount >= MAX_INIT_RETRIES) {
                        console.error(`Ably initialization failed after ${MAX_INIT_RETRIES} retries`)
                        setError(`Failed to initialize chat after ${MAX_INIT_RETRIES} attempts`)
                    }
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
            setRealtimeClient(null)
            setChatClient(null)
            setIsConnected(false)
            // Reset retry count on cleanup
            setRetryCount(0)
        }
    }, [isAuthenticated])

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
