"use client"

import { usePathname } from "next/navigation"
import { AuthProvider } from "@/lib/providers/auth-provider"
import { AblyProvider } from "@/hooks/use-ably-chat"
import { RealTimeManager } from "@/components/real-time-manager"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  const isAdminPage = pathname?.startsWith('/admin')

  if (isAdminPage) {
    // For admin pages, only use AuthProvider (without real-time features)
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    )
  }

  // For regular pages, use all providers including real-time features
  return (
    <AuthProvider>
      <AblyProvider>
        <RealTimeManager />
        {children}
      </AblyProvider>
    </AuthProvider>
  )
}
