"use client"

import { createContext, useContext, useEffect, useState } from "react"
import * as Ably from "ably"
import { ChatClient, Room, LogLevel } from "@ably/chat"

interface AblyContextType {
    realtimeClient: Ably.Realtime | null
    chatClient: ChatClient | null
    isConnected: boolean
    getRoom: (roomId: string) => Promise<Room | null>
}

const AblyContext = createContext<AblyContextType | undefined>(undefined)

export function AblyProvider({ children }: { children: React.ReactNode }) {
    const [realtimeClient, setRealtimeClient] = useState<Ably.Realtime | null>(null)
    const [chatClient, setChatClient] = useState<ChatClient | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        let mounted = true
        let client: ChatClient | null = null
        let realtime: Ably.Realtime | null = null

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

                // Wait for connection with proper listener cleanup to avoid memory leaks
                await new Promise<void>((resolve, reject) => {
                    if (!realtime) return reject(new Error("Realtime client not initialized"))

                    const handlerConnected = () => {
                        realtime?.connection.off("connected", handlerConnected)
                        realtime?.connection.off("failed", handlerFailed)
                        resolve()
                    }
                    const handlerFailed = (error: any) => {
                        realtime?.connection.off("connected", handlerConnected)
                        realtime?.connection.off("failed", handlerFailed)
                        reject(error)
                    }
                    realtime.connection.on("connected", handlerConnected)
                    realtime.connection.on("failed", handlerFailed)
                })

                // Persistent listeners for subsequent connection state changes
                realtime.connection.on("connected", () => {
                    if (mounted) setIsConnected(true)
                })

                realtime.connection.on("disconnected", () => {
                    if (mounted) setIsConnected(false)
                })

                realtime.connection.on("failed", () => {
                    if (mounted) setIsConnected(false)
                })

                if (mounted) {
                    setRealtimeClient(realtime)
                }

                // Create Chat client
                client = new ChatClient(realtime, {
                    logLevel: LogLevel.Error,
                })

                if (mounted) {
                    setChatClient(client)
                }
            } catch (error) {
                console.error("Failed to initialize Ably Chat:", error)
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
        <AblyContext.Provider value={{ realtimeClient, chatClient, isConnected, getRoom }}>
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
