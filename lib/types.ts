// Core data types for BidForge application

export type UserRole = "CONTRACTOR" | "SUBCONTRACTOR" | "ADMIN"

export type ProjectStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "AWARDED" | "CANCELLED"

export type BidStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "AWARDED" | "DECLINED" | "WITHDRAWN"

export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED"

export type DocumentType =
  | "BLUEPRINT"
  | "SPECIFICATION"
  | "CONTRACT"
  | "ADDENDUM"
  | "PHOTO"
  | "LICENSE"
  | "INSURANCE"
  | "OTHER"

export type TradeCategory =
  | "ELECTRICAL"
  | "PLUMBING"
  | "HVAC"
  | "CONCRETE"
  | "FRAMING"
  | "ROOFING"
  | "DRYWALL"
  | "FLOORING"
  | "PAINTING"
  | "LANDSCAPING"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  companyId: string
  password?: string // Hashed password
  emailVerified: boolean
  verificationCode?: string
  verificationCodeExpiry?: Date
  passwordResetToken?: string
  passwordResetExpiry?: Date
  createdAt: Date
  updatedAt: Date
  isFounder?: boolean // Added for client-side founder status
  company?: {
    id: string
    name: string
    plan: "FREE" | "PRO" | "ENTERPRISE"
    isFounder: boolean
    trialEndDate?: Date | null
  } // Added for client-side company info
}

export interface Company {
  id: string
  name: string
  type: string
  address: string
  phone: string
  website?: string
  description?: string
  logo?: string
  trades: TradeCategory[]
  certifications: Certification[]
  plan: "FREE" | "PRO" | "ENTERPRISE"
  subscriptionStatus: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "INACTIVE"
  storageUsed: number // in bytes
  verified: boolean
  trialStartDate?: Date
  trialEndDate?: Date
  isFounder: boolean
  createdAt: Date
}

export interface Project {
  id: string
  title: string
  description: string
  location: string
  city?: string
  state?: string
  budgetMin?: number
  budgetMax?: number
  budget?: number // Keep for backward compatibility
  startDate: Date | null
  endDate: Date | null
  deadline: Date
  status: ProjectStatus
  createdBy: string
  createdById?: string // Database uses createdById
  trades: TradeCategory[]
  createdAt: Date
  updatedAt: Date
}

export interface Bid {
  id: string
  projectId: string
  subcontractorId: string
  totalAmount: number
  status: BidStatus
  notes?: string
  submittedAt?: Date
  createdAt: Date
  updatedAt: Date
  completionTime?: number // in days
  lineItems: LineItem[]
  alternates: Alternate[]
}

export interface LineItem {
  id: string
  bidId: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  notes?: string
}

export interface Alternate {
  id: string
  bidId: string
  description: string
  adjustmentAmount: number
  notes?: string
}

export interface Document {
  id: string
  projectId: string
  name: string
  type: DocumentType
  url: string
  size: number
  uploadedBy: string
  uploadedAt: Date
  version: number
}

export interface Invitation {
  id: string
  projectId: string
  subcontractorId: string
  status: InvitationStatus
  sentAt: Date
  respondedAt?: Date
}

export interface Message {
  id: string
  projectId: string
  bidId?: string
  senderId: string
  receiverId: string
  text: string
  sentAt: Date
  read: boolean
  attachments?: MessageAttachment[]
}

export interface MessageAttachment {
  id: string
  messageId: string
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  url: string
  uploadedAt: Date
}

export interface Certification {
  id: string
  companyId: string
  type: string
  number: string
  issueDate: Date
  expiryDate: Date
  documentUrl?: string
}

export interface Notification {
  id: string
  userId: string
  type: "BID_SUBMITTED" | "BID_AWARDED" | "INVITATION" | "DEADLINE" | "MESSAGE"
  title: string
  message: string
  read: boolean
  createdAt: Date
  link?: string
}

// Admin-specific types
export interface Waitlist {
  id: string
  email: string
  addedAt: Date
  usedAt?: Date
  isUsed: boolean
  addedBy?: string
}

export interface AdminSession {
  id: string
  token: string
  userId: string
  expiresAt: Date
  createdAt: Date
}

export interface AdminStats {
  totalUsers: number
  totalCompanies: number
  totalProjects: number
  totalBids: number
  activeTrials: number
  waitlistCount: number
  recentSignups: number
  conversionRate: number
}

export interface AdminUser extends User {
  company?: Company
  projectCount?: number
  bidCount?: number
  lastActive?: Date
}

export interface AdminCompany extends Company {
  userCount: number
  projectCount: number
  bidCount: number
  trialDaysRemaining?: number
}

export interface WaitlistEntry {
  id: string
  email: string
  addedAt: Date
  usedAt?: Date | null
  isUsed: boolean
  addedBy?: string | null
}

export interface TrialManagement {
  companyId: string
  companyName: string
  userEmail: string
  trialStartDate: Date | null
  trialEndDate: Date | null
  daysRemaining?: number
  isActive: boolean
  canExtend: boolean
}

export interface AdminLoginRequest {
  email: string
  password: string
}

export interface AdminLoginResponse {
  success: boolean
  token?: string
  user?: AdminUser
  error?: string
}

export interface WaitlistRequest {
  email: string
}

export interface WaitlistResponse {
  success: boolean
  message: string
  entry?: WaitlistEntry
}

export interface TrialRequest {
  companyId: string
  days: number
}

export interface TrialResponse {
  success: boolean
  message: string
  company?: AdminCompany
}
