"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, isAuthenticated } = useStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const isPublicPage = ["/", "/about", "/how-it-works", "/pricing", "/contact", "/login", "/register"].some(
    (path) => pathname === path,
  )

  const isDashboardRoute = pathname === "/dashboard"

  const handleSearch = () => {
    const query = searchQuery.trim()
    if (!query) return
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <nav className="fixed top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {isAuthenticated && currentUser ? (
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex flex-1 items-center justify-center">
              <div className="relative w-full max-w-lg">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects, bids, or contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch()
                    }
                  }}
                  className="h-10 pl-9 pr-3 text-sm rounded-full border-border bg-background"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentUser.role === "CONTRACTOR" && isDashboardRoute && (
                <Button
                  className="hidden sm:inline-flex bg-accent hover:bg-accent-hover text-white rounded-full px-4"
                  onClick={() => router.push("/projects/new")}
                >
                  + Create Project
                </Button>
              )}
              <NotificationsDropdown />
            </div>
          </div>
        ) : (
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="BidForge"
                className="h-10 w-auto"
                width={160}
                height={40}
              />
            </Link>

            {isPublicPage && (
              <div className="hidden md:flex items-center gap-6">
                <Link href="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
                  How It Works
                </Link>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
                  Pricing
                </Link>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                  About
                </Link>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
                  Contact
                </Link>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild className="hidden md:inline-flex">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="bg-accent hover:bg-accent-hover text-white">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        )}

        {mobileMenuOpen && isPublicPage && !isAuthenticated && (
          <div className="md:hidden border-t border-border py-4 space-y-2">
            <Link href="/how-it-works" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              How It Works
            </Link>
            <Link href="/pricing" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/about" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              About
            </Link>
            <Link href="/contact" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              Contact
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
