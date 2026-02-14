"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Folder, Users, MessageSquare, BarChart3, Inbox, ClipboardList, Settings, Zap, LogOut } from "lucide-react"

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, messages, logout } = useStore()

  if (!currentUser) return null

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  // Get company data from user object instead of companies array
  const company = currentUser.company

  // Count unread messages
  const unreadCount = messages.filter(msg =>
    msg.receiverId === currentUser.id && !msg.read
  ).length

  const contractorLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: Folder },
    { href: "/subcontractors", label: "Subcontractors", icon: Users },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  const subcontractorLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/opportunities", label: "Opportunities", icon: Folder },
    { href: "/invitations", label: "Invitations", icon: Inbox },
    { href: "/my-bids", label: "My Bids", icon: ClipboardList },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  const links = currentUser.role === "CONTRACTOR" ? contractorLinks : subcontractorLinks

  const sidebarClasses = mobile
    ? "flex w-full flex-col"
    : "hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 w-64 flex-col bg-[#354d61] text-white z-50"

  return (
    <aside className={sidebarClasses}>
      <div className="flex-1 py-6 overflow-hidden">
        <nav className="space-y-1 px-3">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href || (pathname && pathname.startsWith(link.href + "/"))
            const showBadge = link.href === "/messages" && unreadCount > 0

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
                  isActive
                    ? "bg-[#f97316] text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
                {showBadge && (
                  <Badge
                    variant="destructive"
                    className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout button */}
        <div className="px-3 mt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-white/10 space-y-3">
        {company ? (
          company.plan === "FREE" ? (
            <div className="rounded-xl bg-white/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#f97316]">
                <Zap className="h-4 w-4 fill-current" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Free Plan</span>
              </div>
              <p className="text-xs text-white/80 leading-tight">
                Upgrade to Pro to unlock unlimited projects and advanced bid tools.
              </p>
              <Button
                size="sm"
                className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white text-xs h-8"
                onClick={() => router.push("/pricing")}
              >
                Upgrade Now
              </Button>
            </div>
          ) : (
            <div className="rounded-xl bg-white/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#f97316] fill-current" />
                <span className="text-xs font-bold uppercase text-white">{company.plan} Plan</span>
              </div>
              <Link href="/pricing" className="text-[10px] text-white/80 hover:text-white underline">
                Manage
              </Link>
            </div>
          )
        ) : null}

        <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
            {(currentUser.name && currentUser.name.charAt(0).toUpperCase()) ||
              (currentUser.email && currentUser.email.charAt(0).toUpperCase())}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">
              {currentUser.name}
            </div>
            {company?.name && (
              <div className="truncate text-xs text-white/80">
                {company.name}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
