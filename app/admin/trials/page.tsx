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
  Clock,
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { AdminUser } from "@/lib/types"
import { formatDate } from "@/lib/utils/format"

/**
 * Admin trials management page
 * Shows all trial companies and their trial status
 */
export default function AdminTrialsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [trials, setTrials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter states
  const [search, setSearch] = useState("")
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
   * Load trials data
   */
  const loadTrials = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        search,
        status: statusFilter,
      })

      const response = await fetch(`/api/admin/trials?${params}`, {
        method: "GET",
        credentials: "include",
      })
      
      if (!response.ok) {
        throw new Error("Failed to load trials")
      }

      const data = await response.json()
      if (data.success) {
        setTrials(data.data)
        setTotalPages(data.pagination.pages)
      }
    } catch (error) {
      console.error("Load trials error:", error)
    }
  }

  // Load data on mount and when filters change
  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadTrials().finally(() => setLoading(false))
    }
  }, [user, page, search, statusFilter])

  if (loading) {
    return (
      <AdminLayout user={user || undefined}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  const getTrialStatus = (trialEndDate: string) => {
    const now = new Date()
    const endDate = new Date(trialEndDate)
    
    if (endDate > now) {
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return {
        status: "active",
        label: `${daysLeft} days left`,
        color: "text-green-600",
        bgColor: "bg-green-50"
      }
    } else {
      return {
        status: "expired",
        label: "Expired",
        color: "text-red-600",
        bgColor: "bg-red-50"
      }
    }
  }

  return (
    <AdminLayout user={user || undefined}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Active Trials</h1>
          <p className="text-muted-foreground mt-1">
            Manage trial subscriptions and monitor trial periods
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
                    placeholder="Search trials by company name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active Trials</option>
                <option value="expired">Expired Trials</option>
                <option value="expiring">Expiring Soon</option>
              </select>

              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Trials List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Trial Companies ({trials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trials.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No trial companies found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trials.map((trial, index) => {
                  const trialStatus = getTrialStatus(trial.trialEndDate)
                  
                  return (
                    <div key={trial.id || `trial-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{trial.name}</p>
                          <p className="text-sm text-muted-foreground">{trial.email}</p>
                          {trial.address && (
                            <p className="text-xs text-muted-foreground">
                              {trial.city}, {trial.state}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={trialStatus.bgColor}>
                          <Clock className="h-3 w-3 mr-1" />
                          <span className={trialStatus.color}>{trialStatus.label}</span>
                        </Badge>
                        
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {trial._count?.users || 0} users
                        </div>
                        
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Started: {formatDate(trial.createdAt)}
                        </div>
                        
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Ends: {formatDate(trial.trialEndDate)}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {trial.verified ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          )}
                          <span className="text-sm">
                            {trial.verified ? "Verified" : "Unverified"}
                          </span>
                        </div>
                        
                        <Button variant="outline" size="sm">
                          Convert to Pro
                        </Button>
                      </div>
                    </div>
                  )
                })}
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
