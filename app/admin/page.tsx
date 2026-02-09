"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Building2, 
  FolderOpen, 
  FileText, 
  Clock, 
  Mail,
  TrendingUp,
  Activity
} from "lucide-react"
import { AdminUser, AdminStats } from "@/lib/types"
import { formatNumber, formatDate } from "@/lib/utils/format"

/**
 * Admin dashboard main page
 * Shows overview statistics and recent activity
 */
export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Load admin user and dashboard data
   */
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // Verify authentication and get user (uses HTTP-only cookie)
        const authResponse = await fetch("/api/admin/auth", {
          method: "GET",
        })

        if (!authResponse.ok) {
          router.push("/admin/login")
          return
        }

        const authData = await authResponse.json()
        if (!authData.success) {
          localStorage.removeItem("admin_token")
          router.push("/admin/login")
          return
        }

        setUser(authData.user)

        // Load dashboard analytics
        const analyticsResponse = await fetch("/api/admin/analytics", {
          method: "GET",
        })
        
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json()
          if (analyticsData.success) {
            setStats(analyticsData.stats)
            setRecentActivity(analyticsData.details)
          } else {
            console.error("Analytics API returned error:", analyticsData.error)
          }
        } else {
          console.error("Analytics API failed with status:", analyticsResponse.status)
          const errorText = await analyticsResponse.text()
          console.error("Error response:", errorText)
        }
      } catch (error) {
        console.error("Dashboard load error:", error)
        router.push("/admin/login")
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load dashboard</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Stats cards configuration
  const statsCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/admin/users",
    },
    {
      title: "Companies",
      value: stats.totalCompanies,
      icon: Building2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: "/admin/companies",
    },
    {
      title: "Projects",
      value: stats.totalProjects,
      icon: FolderOpen,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Bids",
      value: stats.totalBids,
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Active Trials",
      value: stats.activeTrials,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      href: "/admin/trials",
    },
    {
      title: "Waitlist",
      value: stats.waitlistCount,
      icon: Mail,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      href: "/admin/waitlist",
    },
    {
      title: "Recent Signups",
      value: stats.recentSignups,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      subtitle: "Last 7 days",
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate}%`,
      icon: Activity,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      subtitle: "Waitlist to signup",
    },
  ]

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user.name}. Here's what's happening with your platform.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((card, index) => {
            const Icon = card.icon
            const CardComponent = card.href ? "a" : "div"
            
            return (
              <Card 
                key={index} 
                className={card.href ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                onClick={card.href ? () => router.push(card.href) : undefined}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
                      </p>
                      {card.subtitle && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {card.subtitle}
                        </p>
                      )}
                    </div>
                    <div className={`p-3 rounded-lg ${card.bgColor}`}>
                      <Icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Recent Activity */}
        {recentActivity && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recent Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.recent?.users?.slice(0, 5).map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {user.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {user.role}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!recentActivity.recent?.users || recentActivity.recent.users.length === 0) && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No recent users
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Projects */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Recent Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.recent?.projects?.slice(0, 5).map((project: any) => (
                    <div key={project.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{project.title}</p>
                        <p className="text-xs text-muted-foreground">
                          by {project.createdBy?.name || "Unknown"}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <Badge 
                          variant={project.status === "PUBLISHED" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {project.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(project.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!recentActivity.recent?.projects || recentActivity.recent.projects.length === 0) && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No recent projects
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => router.push("/admin/waitlist")}
              >
                <Mail className="h-4 w-4 mr-2" />
                Manage Waitlist
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => router.push("/admin/trials")}
              >
                <Clock className="h-4 w-4 mr-2" />
                Grant Trials
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => router.push("/admin/analytics")}
              >
                <Activity className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}