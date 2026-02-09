"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Filter,
  Download,
  Users,
  Building2,
  Mail,
  Calendar
} from "lucide-react"
import { AdminUser } from "@/lib/types"
import { formatDate } from "@/lib/utils/format"

/**
 * Admin users management page
 * Shows all users with filtering and search capabilities
 */
export default function AdminUsersPage() {
  const router = useRouter()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter states
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  /**
   * Load admin user authentication
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

  /**
   * Load users data
   */
  const loadUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        search,
        role: roleFilter,
      })

      const response = await fetch(`/api/admin/users?${params}`, {
        method: "GET",
        credentials: "include",
      })
      
      if (!response.ok) {
        throw new Error("Failed to load users")
      }

      const data = await response.json()
      if (data.success) {
        setUsers(data.data)
        setTotalPages(data.pagination.pages)
      }
    } catch (error) {
      console.error("Load users error:", error)
    }
  }

  // Load data on mount and when filters change
  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadUsers().finally(() => setLoading(false))
    }
  }, [user, page, search, roleFilter])

  if (loading) {
    return (
      <AdminLayout user={user || undefined}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout user={user || undefined}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage all registered users and their accounts
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="all">All Roles</option>
                <option value="CONTRACTOR">Contractors</option>
                <option value="SUBCONTRACTOR">Subcontractors</option>
                <option value="ADMIN">Admins</option>
              </select>

              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user, index) => (
                  <div key={user.id || `user-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {user.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                      
                      {user.company && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          {user.company.name}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(user.createdAt)}
                      </div>
                      
                      <Badge variant={user.emailVerified ? "default" : "secondary"}>
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>
                  </div>
                ))}
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
            
            <span className="px-4 py-2 text-sm">
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
