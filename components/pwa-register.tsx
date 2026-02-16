"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {})
      }
      if (document.readyState === "complete") {
        register()
      } else {
        window.addEventListener("load", register, { once: true })
      }
    }
  }, [])
  return null
}

export function NotificationPermissionButton({ className }: { className?: string }) {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default")

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("unsupported")
      return
    }
    setPerm(Notification.permission)
  }, [])

  if (perm === "unsupported") return null
  if (perm !== "default") return null

  const handleClick = async () => {
    try {
      const result = await Notification.requestPermission()
      setPerm(result)
    } catch {
      // ignore
    }
  }

  return (
    <Button type="button" onClick={handleClick} className={className}>
      Enable notifications
    </Button>
  )
}
