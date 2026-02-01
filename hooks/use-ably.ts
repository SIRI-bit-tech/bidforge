import { useEffect, useState } from 'react'
import Ably from 'ably'

let ablyClient: Ably.Realtime | null = null

export function useAbly() {
    const [client, setClient] = useState<Ably.Realtime | null>(null)

    useEffect(() => {
        if (!ablyClient) {
            ablyClient = new Ably.Realtime({ authUrl: '/api/ably/auth' })
        }
        setClient(ablyClient)

        return () => {
            // We don't necessarily want to close the connection on unmount of every component
            // but if we wanted to be strict:
            // if (ablyClient) {
            //   ablyClient.close()
            //   ablyClient = null
            // }
        }
    }, [])

    return client
}

export function useChannel(channelName: string, callback: (msg: Ably.Message) => void) {
    const client = useAbly()
    const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null)

    useEffect(() => {
        if (!client || !channelName) return

        const ch = client.channels.get(channelName)
        ch.subscribe(callback)
        setChannel(ch)

        return () => {
            ch.unsubscribe(callback)
        }
    }, [client, channelName, callback])

    return channel
}
