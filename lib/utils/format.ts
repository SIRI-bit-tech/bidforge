// Utility functions for formatting data

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return formatDate(date)
}

export function formatTimeUntil(date: Date): string {
  const now = new Date()
  const diffInMs = date.getTime() - now.getTime()

  if (diffInMs < 0) return "Expired"

  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h`

  const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${minutes}m`
}

export function getTradeLabel(trade: string): string {
  const labels: Record<string, string> = {
    ELECTRICAL: "Electrical",
    PLUMBING: "Plumbing",
    HVAC: "HVAC",
    CONCRETE: "Concrete",
    FRAMING: "Framing",
    ROOFING: "Roofing",
    DRYWALL: "Drywall",
    FLOORING: "Flooring",
    PAINTING: "Painting",
    LANDSCAPING: "Landscaping",
  }
  return labels[trade] || trade
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: "text-muted-foreground bg-muted",
    PUBLISHED: "text-info-foreground bg-info",
    CLOSED: "text-muted-foreground bg-muted",
    AWARDED: "text-success-foreground bg-success",
    CANCELLED: "text-error-foreground bg-error",
    SUBMITTED: "text-info-foreground bg-info",
    UNDER_REVIEW: "text-warning-foreground bg-warning",
    SHORTLISTED: "text-warning-foreground bg-warning",
    DECLINED: "text-error-foreground bg-error",
    WITHDRAWN: "text-muted-foreground bg-muted",
    PENDING: "text-warning-foreground bg-warning",
    ACCEPTED: "text-success-foreground bg-success",
  }
  return colors[status] || "text-muted-foreground bg-muted"
}

export function getStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")
}
