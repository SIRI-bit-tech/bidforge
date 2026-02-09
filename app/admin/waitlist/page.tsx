"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { 
  Plus, 
  Mail, 
  Search, 
  Filter,
  Download,
  Upload,
  Check,
  X,
  Calendar
} from "lucide-react"
import { AdminUser, WaitlistEntry } from "@/lib/types"
import { formatDate } from "@/lib/utils/format"

/**
 * Waitlist management page
 * Connects to external Supabase waitlist database
 * Allows admin to view and manage waitlist entries from external website
 */
export default function AdminWaitlistPage() {
  const router = useRouter()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [addLoading, setAddLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  
  // Form states
  const [newEmail, setNewEmail] = useState("")
  const [bulkEmails, setBulkEmails] = useState("")
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  
  // Filter states
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all") // all, used, unused
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Messages
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  /**
   * Load waitlist data from API (which uses Supabase)
   */
  const loadWaitlist = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        search,
        filter,
      })

      const response = await fetch(`/api/admin/waitlist?${params}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/admin/login")
          return
        }
        throw new Error("Failed to load waitlist")
      }

      const data = await response.json()
      if (data.success) {
        setWaitlist(data.data)
        setTotalPages(data.pagination.pages)
      }
    } catch (error) {
      console.error("Load waitlist error:", error)
      setMessage({ type: "error", text: "Failed to load waitlist" })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load admin user
   */
  const loadUser = async () => {
    try {
      const response = await fetch("/api/admin/auth", {
        method: "GET",
      })

      if (!response.ok) {
        router.push("/admin/login")
        return
      }

      const data = await response.json()
      if (data.success) {
        setUser(data.user)
      } else {
        router.push("/admin/login")
      }
    } catch (error) {
      console.error("Load user error:", error)
      router.push("/admin/login")
    }
  }

  // Load data on mount and when filters change
  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadWaitlist().finally(() => setLoading(false))
    }
  }, [user, page, search, filter])

  /**
   * Add single email to waitlist (API)
   */
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return

    setAddLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/admin/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: newEmail.trim() }),
      })

      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: "success", text: data.message })
        setNewEmail("")
        loadWaitlist()
      } else {
        setMessage({ type: "error", text: data.error })
      }
    } catch (error) {
      console.error("Add email error:", error)
      setMessage({ type: "error", text: "Failed to add email" })
    } finally {
      setAddLoading(false)
    }
  }

  /**
   * Add multiple emails to waitlist (API)
   */
  const handleBulkAdd = async () => {
    if (!bulkEmails.trim()) return

    setBulkLoading(true)
    setMessage(null)

    try {
      const emails = bulkEmails
        .split(/[\n,]/)
        .map(email => email.trim())
        .filter(email => email)

      const response = await fetch("/api/admin/waitlist", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ emails }),
      })

      const data = await response.json()
      
      if (data.success) {
        setMessage({ 
          type: "success", 
          text: `${data.message}. Added: ${data.added}, Skipped: ${data.skipped}` 
        })
        setBulkEmails("")
        setShowBulkAdd(false)
        loadWaitlist()
      } else {
        setMessage({ type: "error", text: data.error })
      }
    } catch (error) {
      console.error("Bulk add error:", error)
      setMessage({ type: "error", text: "Failed to add emails" })
    } finally {
      setBulkLoading(false)
    }
  }

  /**
   * Export waitlist to CSV (Supabase)
   */
  const handleExport = () => {
    const csv = [
      "Email,Added At,Status,Converted At",
      ...waitlist.map(entry => {
        const addedAt = entry.created_at ? formatDate(entry.created_at) : formatDate(entry.addedAt)
        const status = entry.status === "converted" || entry.converted_at ? "Used" : "Unused"
        const convertedAt = entry.converted_at ? formatDate(entry.converted_at) : ""
        return `${entry.email},${addedAt},${status},${convertedAt}`
      })
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `supabase-waitlist-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <AdminLayout user={user || undefined}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading waitlist...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout user={user || undefined}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Waitlist Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage early access waitlist for 60-day trials
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowBulkAdd(!showBulkAdd)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Add
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Add Email Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add to Waitlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddEmail} className="flex gap-4">
              <Input
                type="email"
                placeholder="Enter email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1"
                disabled={addLoading}
              />
              <Button type="submit" disabled={addLoading || !newEmail.trim()}>
                {addLoading ? "Adding..." : "Add Email"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Bulk Add Form */}
        {showBulkAdd && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Add Emails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter multiple emails (one per line or comma-separated)"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={6}
                disabled={bulkLoading}
              />
              <div className="flex gap-2">
                <Button onClick={handleBulkAdd} disabled={bulkLoading || !bulkEmails.trim()}>
                  {bulkLoading ? "Adding..." : "Add All Emails"}
                </Button>
                <Button variant="outline" onClick={() => setShowBulkAdd(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search emails..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={filter === "unused" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("unused")}
                >
                  Unused
                </Button>
                <Button
                  variant={filter === "used" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("used")}
                >
                  Used
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Waitlist Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Waitlist Entries ({waitlist.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {waitlist.length > 0 ? (
              <div className="space-y-4">
                {waitlist.map((entry, index) => (
                  <div
                    key={entry.id || `entry-${index}`}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${entry.status === "converted" || entry.converted_at ? "bg-green-100" : "bg-gray-100"}`}>
                        {entry.status === "converted" || entry.converted_at ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Mail className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{entry.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Added {formatDate(entry.created_at || entry.addedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {entry.converted_at && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Converted</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(entry.converted_at)}
                          </p>
                        </div>
                      )}
                      <Badge variant={entry.status === "converted" || entry.converted_at ? "default" : "secondary"}>
                        {entry.status === "converted" || entry.converted_at ? "Converted" : "Waiting"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No waitlist entries found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add emails above to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}