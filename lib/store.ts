"use client"

import { create } from "zustand"
import type {
  User,
  Company,
  Project,
  Bid,
  Document,
  Invitation,
  Message,
  Notification,
  UserRole,
  InvitationStatus,
} from "./types"

// In-memory data store with production-ready patterns
interface AppState {
  // Auth state
  currentUser: User | null
  isAuthenticated: boolean

  // Data stores
  users: User[]
  companies: Company[]
  projects: Project[]
  bids: Bid[]
  documents: Document[]
  invitations: Invitation[]
  messages: Message[]
  notifications: Notification[]

  // Auth actions
  login: (email: string, password: string) => Promise<User>
  register: (email: string, password: string, name: string, role: UserRole) => Promise<User>
  logout: () => void

  // Company actions
  createCompany: (data: Partial<Company>) => Company
  updateCompany: (id: string, data: Partial<Company>) => Company
  getCompany: (id: string) => Company | undefined

  // Project actions
  createProject: (data: Partial<Project>) => Project
  updateProject: (id: string, data: Partial<Project>) => Project
  publishProject: (id: string) => Project
  closeProject: (id: string) => Project
  getProject: (id: string) => Project | undefined
  getProjectsByUser: (userId: string) => Project[]

  // Bid actions
  createBid: (data: Partial<Bid>) => Bid
  updateBid: (id: string, data: Partial<Bid>) => Bid
  submitBid: (id: string) => Bid
  withdrawBid: (id: string) => Bid
  awardBid: (id: string) => Bid
  getBid: (id: string) => Bid | undefined
  getBidsByProject: (projectId: string) => Bid[]
  getBidsBySubcontractor: (subcontractorId: string) => Bid[]

  // Invitation actions
  inviteSubcontractors: (projectId: string, subcontractorIds: string[]) => Invitation[]
  acceptInvitation: (id: string) => Invitation
  declineInvitation: (id: string) => Invitation
  getInvitationsBySubcontractor: (subcontractorId: string) => Invitation[]

  // Document actions
  uploadDocument: (data: Partial<Document>) => Document
  deleteDocument: (id: string) => void
  getDocumentsByProject: (projectId: string) => Document[]

  // Message actions
  sendMessage: (data: Partial<Message>) => Message
  getMessagesByProject: (projectId: string) => Message[]
  markMessageAsRead: (id: string) => void

  // Notification actions
  createNotification: (data: Partial<Notification>) => Notification
  getNotificationsByUser: (userId: string) => Notification[]
  markNotificationAsRead: (id: string) => void
  markAllNotificationsAsRead: (userId: string) => void
}

// Helper function to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 15)

// Seed data for testing
const seedData = () => {
  const contractors: User[] = [
    {
      id: "user-1",
      email: "john@buildcorp.com",
      name: "John Mitchell",
      role: "CONTRACTOR",
      companyId: "company-1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ]

  const subcontractors: User[] = [
    {
      id: "user-2",
      email: "sarah@electricpro.com",
      name: "Sarah Johnson",
      role: "SUBCONTRACTOR",
      companyId: "company-2",
      createdAt: new Date("2024-01-05"),
      updatedAt: new Date("2024-01-05"),
    },
    {
      id: "user-3",
      email: "mike@plumbmaster.com",
      name: "Mike Davis",
      role: "SUBCONTRACTOR",
      companyId: "company-3",
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-10"),
    },
    {
      id: "user-4",
      email: "lisa@hvacexperts.com",
      name: "Lisa Chen",
      role: "SUBCONTRACTOR",
      companyId: "company-4",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
  ]

  const companies: Company[] = [
    {
      id: "company-1",
      name: "BuildCorp General Contractors",
      type: "General Contractor",
      address: "123 Main St, Los Angeles, CA 90001",
      phone: "(555) 123-4567",
      website: "https://buildcorp.example.com",
      description: "Leading general contractor specializing in commercial construction projects",
      trades: [],
      certifications: [],
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "company-2",
      name: "ElectricPro Solutions",
      type: "Electrical Contractor",
      address: "456 Oak Ave, Los Angeles, CA 90002",
      phone: "(555) 234-5678",
      website: "https://electricpro.example.com",
      description: "Commercial electrical contractor with 20+ years of experience",
      trades: ["ELECTRICAL"],
      certifications: [],
      createdAt: new Date("2024-01-05"),
    },
    {
      id: "company-3",
      name: "PlumbMaster Inc",
      type: "Plumbing Contractor",
      address: "789 Elm St, Los Angeles, CA 90003",
      phone: "(555) 345-6789",
      website: "https://plumbmaster.example.com",
      description: "Expert plumbing services for commercial and residential projects",
      trades: ["PLUMBING"],
      certifications: [],
      createdAt: new Date("2024-01-10"),
    },
    {
      id: "company-4",
      name: "HVAC Experts LLC",
      type: "HVAC Contractor",
      address: "321 Pine Rd, Los Angeles, CA 90004",
      phone: "(555) 456-7890",
      website: "https://hvacexperts.example.com",
      description: "Full-service HVAC installation and maintenance",
      trades: ["HVAC"],
      certifications: [],
      createdAt: new Date("2024-01-15"),
    },
  ]

  const projects: Project[] = [
    {
      id: "project-1",
      title: "Downtown Office Complex - Phase 1",
      description:
        "Construction of a 5-story office building with underground parking. Requires electrical, plumbing, HVAC, and interior finishing.",
      location: "Downtown Los Angeles, CA",
      budget: 5000000,
      startDate: new Date("2024-06-01"),
      endDate: new Date("2025-12-31"),
      deadline: new Date("2024-05-15"),
      status: "PUBLISHED",
      createdBy: "user-1",
      trades: ["ELECTRICAL", "PLUMBING", "HVAC", "DRYWALL", "FLOORING"],
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
    },
    {
      id: "project-2",
      title: "Riverside Shopping Center Renovation",
      description:
        "Complete renovation of existing 50,000 sq ft shopping center including storefront updates, HVAC system replacement, and parking lot resurfacing.",
      location: "Riverside, CA",
      budget: 2500000,
      startDate: new Date("2024-07-01"),
      endDate: new Date("2025-03-31"),
      deadline: new Date("2024-06-01"),
      status: "PUBLISHED",
      createdBy: "user-1",
      trades: ["ELECTRICAL", "PLUMBING", "HVAC", "PAINTING", "CONCRETE"],
      createdAt: new Date("2024-03-15"),
      updatedAt: new Date("2024-03-15"),
    },
  ]

  const invitations: Invitation[] = [
    {
      id: "inv-1",
      projectId: "project-1",
      subcontractorId: "user-2",
      status: "ACCEPTED",
      sentAt: new Date("2024-03-02"),
      respondedAt: new Date("2024-03-03"),
    },
    {
      id: "inv-2",
      projectId: "project-1",
      subcontractorId: "user-3",
      status: "ACCEPTED",
      sentAt: new Date("2024-03-02"),
      respondedAt: new Date("2024-03-04"),
    },
    {
      id: "inv-3",
      projectId: "project-1",
      subcontractorId: "user-4",
      status: "PENDING",
      sentAt: new Date("2024-03-02"),
    },
  ]

  const bids: Bid[] = [
    {
      id: "bid-1",
      projectId: "project-1",
      subcontractorId: "user-2",
      totalAmount: 450000,
      status: "SUBMITTED",
      notes: "Includes all electrical work for floors 1-5 and parking structure. Premium grade materials specified.",
      submittedAt: new Date("2024-03-10"),
      updatedAt: new Date("2024-03-10"),
      lineItems: [
        {
          id: "li-1",
          bidId: "bid-1",
          description: "Main electrical panel installation and distribution",
          quantity: 5,
          unit: "floors",
          unitPrice: 45000,
          totalPrice: 225000,
        },
        {
          id: "li-2",
          bidId: "bid-1",
          description: "Lighting fixtures and controls",
          quantity: 250,
          unit: "fixtures",
          unitPrice: 500,
          totalPrice: 125000,
        },
        {
          id: "li-3",
          bidId: "bid-1",
          description: "Emergency backup generator system",
          quantity: 1,
          unit: "system",
          unitPrice: 100000,
          totalPrice: 100000,
        },
      ],
      alternates: [
        {
          id: "alt-1",
          bidId: "bid-1",
          description: "LED upgrade for all lighting fixtures",
          adjustmentAmount: 25000,
          notes: "Higher upfront cost but 40% energy savings over 10 years",
        },
      ],
    },
    {
      id: "bid-2",
      projectId: "project-1",
      subcontractorId: "user-3",
      totalAmount: 380000,
      status: "SUBMITTED",
      notes: "Complete plumbing system for all floors including water supply, drainage, and fixtures.",
      submittedAt: new Date("2024-03-12"),
      updatedAt: new Date("2024-03-12"),
      lineItems: [
        {
          id: "li-4",
          bidId: "bid-2",
          description: "Main water supply and distribution piping",
          quantity: 5,
          unit: "floors",
          unitPrice: 35000,
          totalPrice: 175000,
        },
        {
          id: "li-5",
          bidId: "bid-2",
          description: "Drainage and waste system",
          quantity: 5,
          unit: "floors",
          unitPrice: 28000,
          totalPrice: 140000,
        },
        {
          id: "li-6",
          bidId: "bid-2",
          description: "Bathroom fixtures and installation",
          quantity: 25,
          unit: "fixtures",
          unitPrice: 2600,
          totalPrice: 65000,
        },
      ],
      alternates: [],
    },
  ]

  return {
    users: [...contractors, ...subcontractors],
    companies,
    projects,
    bids,
    invitations,
    documents: [],
    messages: [],
    notifications: [],
  }
}

export const useStore = create<AppState>((set, get) => ({
  // Initialize with seed data
  ...seedData(),
  currentUser: null,
  isAuthenticated: false,

  // Auth actions
  login: async (email: string, password: string) => {
    const user = get().users.find((u) => u.email === email)
    if (!user) {
      throw new Error("Invalid credentials")
    }
    set({ currentUser: user, isAuthenticated: true })
    return user
  },

  register: async (email: string, password: string, name: string, role: UserRole) => {
    const newUser: User = {
      id: generateId(),
      email,
      name,
      role,
      companyId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    set((state) => ({
      users: [...state.users, newUser],
      currentUser: newUser,
      isAuthenticated: true,
    }))
    return newUser
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false })
  },

  // Company actions
  createCompany: (data) => {
    const newCompany: Company = {
      id: generateId(),
      name: data.name || "",
      type: data.type || "",
      address: data.address || "",
      phone: data.phone || "",
      website: data.website,
      description: data.description,
      logo: data.logo,
      trades: data.trades || [],
      certifications: data.certifications || [],
      createdAt: new Date(),
    }
    set((state) => ({ companies: [...state.companies, newCompany] }))
    return newCompany
  },

  updateCompany: (id, data) => {
    set((state) => ({
      companies: state.companies.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }))
    return get().companies.find((c) => c.id === id)!
  },

  getCompany: (id) => {
    return get().companies.find((c) => c.id === id)
  },

  // Project actions
  createProject: (data) => {
    const currentUser = get().currentUser
    if (!currentUser) throw new Error("Not authenticated")

    const newProject: Project = {
      id: generateId(),
      title: data.title || "",
      description: data.description || "",
      location: data.location || "",
      budget: data.budget || 0,
      startDate: data.startDate || new Date(),
      endDate: data.endDate || new Date(),
      deadline: data.deadline || new Date(),
      status: "DRAFT",
      createdBy: currentUser.id,
      trades: data.trades || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    set((state) => ({ projects: [...state.projects, newProject] }))
    return newProject
  },

  updateProject: (id, data) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date() } : p)),
    }))
    return get().projects.find((p) => p.id === id)!
  },

  publishProject: (id) => {
    return get().updateProject(id, { status: "PUBLISHED" })
  },

  closeProject: (id) => {
    return get().updateProject(id, { status: "CLOSED" })
  },

  getProject: (id) => {
    return get().projects.find((p) => p.id === id)
  },

  getProjectsByUser: (userId) => {
    return get().projects.filter((p) => p.createdBy === userId)
  },

  // Bid actions
  createBid: (data) => {
    const currentUser = get().currentUser
    if (!currentUser) throw new Error("Not authenticated")

    const newBid: Bid = {
      id: generateId(),
      projectId: data.projectId || "",
      subcontractorId: currentUser.id,
      totalAmount: data.totalAmount || 0,
      status: "DRAFT",
      notes: data.notes,
      submittedAt: undefined,
      updatedAt: new Date(),
      lineItems: data.lineItems || [],
      alternates: data.alternates || [],
    }
    set((state) => ({ bids: [...state.bids, newBid] }))
    return newBid
  },

  updateBid: (id, data) => {
    set((state) => ({
      bids: state.bids.map((b) => (b.id === id ? { ...b, ...data, updatedAt: new Date() } : b)),
    }))
    return get().bids.find((b) => b.id === id)!
  },

  submitBid: (id) => {
    const bid = get().updateBid(id, {
      status: "SUBMITTED",
      submittedAt: new Date(),
    })

    // Create notification for contractor
    const project = get().getProject(bid.projectId)
    if (project) {
      const company = get().companies.find(
        (c) => c.id === get().users.find((u) => u.id === bid.subcontractorId)?.companyId,
      )
      get().createNotification({
        userId: project.createdBy,
        type: "BID_SUBMITTED",
        title: "New Bid Submitted",
        message: `${company?.name} has submitted a bid for ${project.title}`,
        read: false,
        createdAt: new Date(),
        link: `/projects/${project.id}/bids/${bid.id}`,
      })
    }

    return bid
  },

  withdrawBid: (id) => {
    return get().updateBid(id, { status: "WITHDRAWN" })
  },

  awardBid: (id) => {
    const bid = get().updateBid(id, { status: "AWARDED" })
    const project = get().getProject(bid.projectId)

    if (project) {
      // Update project status
      get().updateProject(project.id, { status: "AWARDED" })

      // Notify winning bidder
      get().createNotification({
        userId: bid.subcontractorId,
        type: "BID_AWARDED",
        title: "Congratulations! Bid Awarded",
        message: `Your bid for ${project.title} has been awarded!`,
        read: false,
        createdAt: new Date(),
        link: `/my-bids/${bid.id}`,
      })

      // Decline other bids
      const otherBids = get()
        .getBidsByProject(project.id)
        .filter((b) => b.id !== id)
      otherBids.forEach((b) => {
        get().updateBid(b.id, { status: "DECLINED" })
        get().createNotification({
          userId: b.subcontractorId,
          type: "BID_AWARDED",
          title: "Bid Not Selected",
          message: `Thank you for your bid on ${project.title}. Another contractor was selected for this project.`,
          read: false,
          createdAt: new Date(),
        })
      })
    }

    return bid
  },

  getBid: (id) => {
    return get().bids.find((b) => b.id === id)
  },

  getBidsByProject: (projectId) => {
    return get().bids.filter((b) => b.projectId === projectId)
  },

  getBidsBySubcontractor: (subcontractorId) => {
    return get().bids.filter((b) => b.subcontractorId === subcontractorId)
  },

  // Invitation actions
  inviteSubcontractors: (projectId, subcontractorIds) => {
    const newInvitations = subcontractorIds.map((subId) => {
      const invitation: Invitation = {
        id: generateId(),
        projectId,
        subcontractorId: subId,
        status: "PENDING",
        sentAt: new Date(),
      }

      // Create notification
      const project = get().getProject(projectId)
      if (project) {
        get().createNotification({
          userId: subId,
          type: "INVITATION",
          title: "New Bid Invitation",
          message: `You've been invited to bid on ${project.title}`,
          read: false,
          createdAt: new Date(),
          link: `/invitations`,
        })
      }

      return invitation
    })

    set((state) => ({ invitations: [...state.invitations, ...newInvitations] }))
    return newInvitations
  },

  acceptInvitation: (id) => {
    set((state) => ({
      invitations: state.invitations.map((inv) =>
        inv.id === id ? { ...inv, status: "ACCEPTED" as InvitationStatus, respondedAt: new Date() } : inv,
      ),
    }))
    return get().invitations.find((inv) => inv.id === id)!
  },

  declineInvitation: (id) => {
    set((state) => ({
      invitations: state.invitations.map((inv) =>
        inv.id === id ? { ...inv, status: "DECLINED" as InvitationStatus, respondedAt: new Date() } : inv,
      ),
    }))
    return get().invitations.find((inv) => inv.id === id)!
  },

  getInvitationsBySubcontractor: (subcontractorId) => {
    return get().invitations.filter((inv) => inv.subcontractorId === subcontractorId)
  },

  // Document actions
  uploadDocument: (data) => {
    const currentUser = get().currentUser
    if (!currentUser) throw new Error("Not authenticated")

    const newDoc: Document = {
      id: generateId(),
      projectId: data.projectId || "",
      name: data.name || "",
      type: data.type || "OTHER",
      url: data.url || "",
      size: data.size || 0,
      uploadedBy: currentUser.id,
      uploadedAt: new Date(),
      version: 1,
    }
    set((state) => ({ documents: [...state.documents, newDoc] }))
    return newDoc
  },

  deleteDocument: (id) => {
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) }))
  },

  getDocumentsByProject: (projectId) => {
    return get().documents.filter((d) => d.projectId === projectId)
  },

  // Message actions
  sendMessage: (data) => {
    const currentUser = get().currentUser
    if (!currentUser) throw new Error("Not authenticated")

    const newMessage: Message = {
      id: generateId(),
      projectId: data.projectId || "",
      bidId: data.bidId,
      senderId: currentUser.id,
      receiverId: data.receiverId || "",
      text: data.text || "",
      sentAt: new Date(),
      read: false,
    }
    set((state) => ({ messages: [...state.messages, newMessage] }))

    // Create notification
    get().createNotification({
      userId: newMessage.receiverId,
      type: "MESSAGE",
      title: "New Message",
      message: `You have a new message from ${currentUser.name}`,
      read: false,
      createdAt: new Date(),
      link: `/messages`,
    })

    return newMessage
  },

  getMessagesByProject: (projectId) => {
    return get().messages.filter((m) => m.projectId === projectId)
  },

  markMessageAsRead: (id) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
    }))
  },

  // Notification actions
  createNotification: (data) => {
    const newNotification: Notification = {
      id: generateId(),
      userId: data.userId || "",
      type: data.type || "MESSAGE",
      title: data.title || "",
      message: data.message || "",
      read: false,
      createdAt: new Date(),
      link: data.link,
    }
    set((state) => ({ notifications: [...state.notifications, newNotification] }))
    return newNotification
  },

  getNotificationsByUser: (userId) => {
    return get()
      .notifications.filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  },

  markNotificationAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }))
  },

  markAllNotificationsAsRead: (userId) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
    }))
  },
}))
