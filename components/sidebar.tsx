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
    : "hidden lg:flex lg:fixed lg:top-16 lg:left-0 lg:bottom-0 w-64 flex-col border-r border-border bg-muted/30 z-30"

  return (
    <aside className={sidebarClasses}>
      <div className="flex-1 py-6 overflow-hidden">{/* Removed overflow-y-auto */}
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
                  isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        {company ? (
          company.plan === "FREE" ? (
            <div className="rounded-xl bg-accent/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-accent">
                <Zap className="h-4 w-4 fill-current" />
                <span className="text-xs font-bold uppercase tracking-wider">Free Plan</span>
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                Upgrade to Pro to unlock unlimited projects and advanced bid tools.
              </p>
              <Button
                size="sm"
                className="w-full bg-accent hover:bg-accent-hover text-white text-xs h-8"
                onClick={() => router.push("/pricing")}
              >
                Upgrade Now
              </Button>
            </div>
          ) : (
            <div className="rounded-xl bg-muted p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent fill-current" />
                <span className="text-xs font-bold uppercase">{company.plan} Plan</span>
              </div>
              <Link href="/pricing" className="text-[10px] text-muted-foreground hover:text-foreground underline">
                Manage
              </Link>
            </div>
          )
        ) : null}
      </div>
    </aside>
  )
}
