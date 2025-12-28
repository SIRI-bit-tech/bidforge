"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { LogOut, Menu, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { useState } from "react"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, isAuthenticated, logout } = useStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const isPublicPage = ["/", "/about", "/how-it-works", "/pricing", "/contact", "/login", "/register"].some(
    (path) => pathname === path,
  )

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2">
            <img 
              src="/bidforge-logo-horizontal.svg" 
              alt="BidForge" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          {isPublicPage && !isAuthenticated && (
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

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated && currentUser ? (
              <>
                {/* Notifications */}
                <NotificationsDropdown />

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => router.push("/settings/profile")}>Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden md:inline-flex">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="bg-accent hover:bg-accent-hover text-white">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
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
