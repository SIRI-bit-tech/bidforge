"use client"

import { useAblyRealtime } from "@/hooks/use-ably-realtime"

export function RealTimeManager() {
    useAblyRealtime()
    return null
}
