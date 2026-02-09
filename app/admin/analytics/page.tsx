"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Building2, 
  FolderOpen, 
  BarChart3, 
  TrendingUp, 
  Download,
  Calendar,
  Search,
  Filter,
  PieChart,
  Activity,
  Target,
  MapPin,
  Clock,
  Mail,
  FileText
} from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'
import { AdminUser, AdminStats } from "@/lib/types"
import { formatNumber, formatDate } from "@/lib/utils/format"

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

/**
 * Admin analytics page
 * Shows detailed analytics and insights
 */
export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
   * Load analytics data
   */
  const loadAnalytics = async () => {
    try {
      const response = await fetch("/api/admin/analytics", {
        method: "GET",
        credentials: "include",
      })
      
      if (!response.ok) {
        throw new Error("Failed to load analytics")
      }

      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
        setDetails(data.details)
      }
    } catch (error) {
      console.error("Load analytics error:", error)
    }
  }

  // Load data on mount
  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadAnalytics().finally(() => setLoading(false))
    }
  }, [user])

  if (loading) {
    return (
      <AdminLayout user={user || undefined}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!stats) {
    return (
      <AdminLayout user={user || undefined}>
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load analytics</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const statsCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: stats.recentSignups,
      changeLabel: "last 7 days"
    },
    {
      title: "Companies",
      value: stats.totalCompanies,
      icon: Building2,
      color: "text-green-600",
      bgColor: "bg-green-50",
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
    },
    {
      title: "Waitlist",
      value: stats.waitlistCount,
      icon: Mail,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
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
      icon: BarChart3,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      subtitle: "Waitlist to signup",
    },
  ]

  return (
    <AdminLayout user={user || undefined}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive insights with interactive charts and detailed metrics
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((card, index) => {
            const Icon = card.icon
            
            return (
              <Card 
                key={card.title || `card-${index}`}
                className="relative overflow-hidden"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
                      </p>
                      {card.subtitle && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {card.subtitle}
                        </p>
                      )}
                    </div>
                    <div className={`p-3 rounded-full ${card.bgColor}`}>
                      <Icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>User Growth Trend</span>
                <Badge variant="outline">Last 30 days</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar
                  data={{
                    labels: details?.userGrowthData?.map((item: any) => `Day ${new Date(item.date).getDate()}`) || [],
                    datasets: [{
                      label: 'New Users',
                      data: details?.userGrowthData?.map((item: any) => item.users) || [],
                      backgroundColor: 'rgb(99, 102, 241)',
                      borderColor: 'rgb(99, 102, 241)',
                      borderWidth: 1,
                      borderRadius: 4,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgb(99, 102, 241)',
                        borderWidth: 1
                      }
                    },
                    scales: {
                      x: {
                        grid: {
                          display: false
                        },
                        ticks: {
                          maxTicksLimit: 6
                        }
                      },
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Revenue Overview</span>
                <Badge variant="outline">Monthly</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line
                  data={{
                    labels: details?.revenueData?.map((item: any) => new Date(item.date).toLocaleDateString('en-US', { month: 'short' })) || [],
                    datasets: [{
                      label: 'Pro Upgrades',
                      data: details?.revenueData?.map((item: any) => item.revenue) || [], // Use precomputed revenue from server
                      borderColor: 'rgb(99, 102, 241)',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4,
                      pointBackgroundColor: 'rgb(99, 102, 241)',
                      pointBorderColor: '#fff',
                      pointBorderWidth: 2,
                      pointRadius: 5,
                      pointHoverRadius: 7,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgb(99, 102, 241)',
                        borderWidth: 1,
                        callbacks: {
                          label: function(context) {
                            const value = context.parsed?.y
                            return `Revenue: $${value?.toLocaleString() || '0'}`
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        grid: {
                          display: false
                        }
                      },
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                          callback: function(value) {
                            return '$' + value.toLocaleString()
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Plan Distribution with Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Plan Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Pie
                  data={{
                    labels: Object.keys(details?.planDistribution || {}),
                    datasets: [{
                      data: Object.values(details?.planDistribution || {}),
                      backgroundColor: [
                        'rgb(99, 102, 241)',
                        'rgb(34, 197, 94)',
                        'rgb(249, 115, 22)',
                        'rgb(168, 85, 247)',
                      ],
                      borderColor: '#fff',
                      borderWidth: 2,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgb(99, 102, 241)',
                        borderWidth: 1,
                        callbacks: {
                          label: function(context) {
                            const label = context.label || ''
                            const dataset = Array.isArray(context.dataset?.data) ? context.dataset.data : []
                            const total = dataset.reduce((a: number, b: number) => a + b, 0)
                            if (total === 0) return `${label}: 0 (0%)`
                            const value = context.parsed || 0
                            const percentage = Math.round((value / total) * 100)
                            return `${label}: ${value} (${percentage}%)`
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

                  </div>

        {/* Recent Activity Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users with Avatars */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recent Users
                </span>
                <Badge variant="outline">Last 7 days</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(details?.recent?.users ?? []).slice(0, 6).map((user: any, userIndex: number) => (
                  <div key={user.id || `user-${userIndex}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {(user?.name ?? '').substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{user?.email ?? 'No email'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(user?.createdAt)}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {user?.role ?? 'User'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Companies with Growth Indicators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Recent Companies
                </span>
                <Badge variant="outline">Last 7 days</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(details?.recent?.companies ?? []).slice(0, 6).map((company: any, companyIndex: number) => (
                  <div key={company.id || `company-${companyIndex}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{company?.name ?? 'Unknown Company'}</p>
                        <p className="text-xs text-muted-foreground">{company?.email ?? 'No email'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(company?.createdAt)}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-500">Active</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

              </div>
    </AdminLayout>
  )
}
