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
  Building2,
  Users,
  Mail,
  Calendar,
  CheckCircle,
  XCircle
} from "lucide-react"
import { AdminUser } from "@/lib/types"
import { formatDate } from "@/lib/utils/format"

/**
 * Admin companies management page
 * Shows all companies with filtering and search capabilities
 */
export default function AdminCompaniesPage() {
  const router = useRouter()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter states
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  
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
   * Load companies data
   */
  const loadCompanies = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        search,
        plan: planFilter,
        status: statusFilter,
      })

      const response = await fetch(`/api/admin/companies?${params}`, {
        method: "GET",
        credentials: "include",
      })
      
      if (!response.ok) {
        throw new Error("Failed to load companies")
      }

      const data = await response.json()
      if (data.success) {
        setCompanies(data.data)
        setTotalPages(data.pagination.pages)
      }
    } catch (error) {
      console.error("Load companies error:", error)
    }
  }

  // Load data on mount and when filters change
  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadCompanies().finally(() => setLoading(false))
    }
  }, [user, page, search, planFilter, statusFilter])

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
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="text-muted-foreground mt-1">
            Manage all registered companies and their subscriptions
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
                    placeholder="Search companies by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="all">All Plans</option>
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
                <option value="TRIAL">Trial</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="expired">Expired</option>
              </select>

              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Companies List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              All Companies ({companies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No companies found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {companies.map((company, index) => (
                  <div key={company.id || `company-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.email}</p>
                        {company.address && (
                          <p className="text-xs text-muted-foreground">
                            {company.city}, {company.state}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Badge variant={
                        company.plan === "PRO" ? "default" : 
                        company.plan === "TRIAL" ? "secondary" : "outline"
                      }>
                        {company.plan}
                      </Badge>
                      
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {company._count?.users || 0} users
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(company.createdAt)}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {company.verified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          {company.verified ? "Verified" : "Unverified"}
                        </span>
                      </div>
                      
                      {company.trialEndDate && (
                        <Badge variant="outline">
                          Trial ends: {formatDate(company.trialEndDate)}
                        </Badge>
                      )}
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
