"use client"

import { useStore } from "@/lib/store"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Bell, Check } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils/format"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function NotificationsPage() {
  const router = useRouter()
  const { currentUser, getNotificationsByUser, markNotificationAsRead, markAllNotificationsAsRead } = useStore()

  if (!currentUser) return null

  const notifications = getNotificationsByUser(currentUser.id)
  const unreadCount = notifications.filter((n) => !n.read).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "BID_SUBMITTED":
        return "📝"
      case "BID_AWARDED":
        return "🎉"
      case "INVITATION":
        return "📨"
      case "DEADLINE":
        return "⏰"
      case "MESSAGE":
        return "💬"
      default:
        return "🔔"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllNotificationsAsRead(currentUser.id)}>
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => {
                if (!notification.read) {
                  markNotificationAsRead(notification.id)
                }
                if (notification.link) {
                  router.push(notification.link)
                }
              }}
              className={cn(
                "flex items-start gap-4 rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                !notification.read && "bg-accent/5 border-accent/30",
              )}
            >
              <div className="text-2xl mt-1">{getNotificationIcon(notification.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className={cn("font-semibold text-sm", !notification.read && "text-accent")}>
                    {notification.title}
                  </h3>
                  {!notification.read && <span className="flex h-2 w-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You'll see updates about your projects and bids here"
        />
      )}
    </div>
  )
}
