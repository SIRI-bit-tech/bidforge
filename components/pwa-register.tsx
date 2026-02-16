"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {})
        // Optional: request push permission (non-blocking)
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission().catch(() => {})
        }
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
