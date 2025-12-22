// Utility functions for formatting data

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
    return "Not specified"
  }
  
  const numAmount = Number(amount)
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Not specified"
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return "Invalid date"
  }
  
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateObj)
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "Not specified"
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return "Invalid date"
  }
  
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(dateObj)
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Unknown"
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return "Invalid date"
  }
  
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return formatDate(dateObj)
}

export function formatTimeUntil(date: Date | string | null | undefined): string {
  if (!date) return "Not specified"
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return "Invalid date"
  }
  
  const now = new Date()
  const diffInMs = dateObj.getTime() - now.getTime()

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

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
