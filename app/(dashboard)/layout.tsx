"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/providers/auth-provider"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { AuthLoading } from "@/components/auth-loading"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, currentUser } = useStore()
  const { isLoading, isInitialized } = useAuth()

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isInitialized, router])

  // Show loading while session is being restored
  if (isLoading || !isInitialized) {
    return <AuthLoading />
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !currentUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
