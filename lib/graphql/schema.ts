// GraphQL schema definition
export const typeDefs = `
  scalar DateTime
  scalar Money
  scalar Upload
  scalar JSON

  enum UserRole {
    CONTRACTOR
    SUBCONTRACTOR
  }

  enum ProjectStatus {
    DRAFT
    PUBLISHED
    CLOSED
    AWARDED
  }

  enum BidStatus {
    DRAFT
    SUBMITTED
    UNDER_REVIEW
    AWARDED
    DECLINED
    WITHDRAWN
  }

  enum InvitationStatus {
    PENDING
    ACCEPTED
    DECLINED
    EXPIRED
  }

  enum DocumentType {
    BLUEPRINT
    SPECIFICATION
    CONTRACT
    ADDENDUM
    PHOTO
    OTHER
  }

  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    company: Company
    createdProjects: [Project!]!
    bids: [Bid!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Company {
    id: ID!
    name: String!
    type: String
    address: String
    city: String
    state: String
    zip: String
    phone: String
    website: String
    description: String
    logo: String
    users: [User!]!
    trades: [Trade!]!
    certifications: [Certification!]!
    insurance: [Insurance!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Trade {
    id: ID!
    name: String!
    category: String
    description: String
  }

  type Project {
    id: ID!
    title: String!
    description: String!
    location: String!
    city: String
    state: String
    budgetMin: Money
    budgetMax: Money
    startDate: DateTime
    endDate: DateTime
    deadline: DateTime!
    status: ProjectStatus!
    createdBy: User!
    trades: [Trade!]!
    documents: [Document!]!
    bids: [Bid!]!
    invitations: [Invitation!]!
    messages: [Message!]!
    bidCount: Int!
    averageBid: Money
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Document {
    id: ID!
    projectId: ID!
    name: String!
    type: DocumentType!
    url: String!
    size: Int
    version: Int!
    uploadedBy: User!
    uploadedAt: DateTime!
  }

  type Bid {
    id: ID!
    project: Project!
    subcontractor: User!
    totalAmount: Money!
    status: BidStatus!
    notes: String
    completionTime: Int
    lineItems: [LineItem!]!
    alternates: [Alternate!]!
    messages: [Message!]!
    submittedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type LineItem {
    id: ID!
    bidId: ID!
    description: String!
    quantity: Float!
    unit: String!
    unitPrice: Money!
    totalPrice: Money!
    notes: String
    sortOrder: Int!
  }

  type Alternate {
    id: ID!
    bidId: ID!
    description: String!
    adjustmentAmount: Money!
    notes: String
  }

  type Invitation {
    id: ID!
    project: Project!
    subcontractor: User!
    status: InvitationStatus!
    sentAt: DateTime!
    respondedAt: DateTime
  }

  type Message {
    id: ID!
    project: Project
    bid: Bid
    sender: User!
    receiver: User!
    text: String!
    read: Boolean!
    sentAt: DateTime!
  }

  type Certification {
    id: ID!
    companyId: ID!
    type: String!
    number: String
    issueDate: DateTime
    expiryDate: DateTime
    documentUrl: String
  }

  type Insurance {
    id: ID!
    companyId: ID!
    type: String!
    provider: String
    policyNumber: String
    coverage: Money
    expiryDate: DateTime
    documentUrl: String
  }

  type Notification {
    id: ID!
    userId: ID!
    type: String!
    title: String!
    message: String!
    read: Boolean!
    link: String
    createdAt: DateTime!
  }

  type Analytics {
    totalProjects: Int!
    activeProjects: Int!
    totalBids: Int!
    averageBidAmount: Money
    winRate: Float
    responseRate: Float
  }

  input CreateProjectInput {
    title: String!
    description: String!
    location: String!
    city: String
    state: String
    budgetMin: Money
    budgetMax: Money
    startDate: DateTime
    endDate: DateTime
    deadline: DateTime!
    tradeIds: [ID!]!
  }

  input UpdateProjectInput {
    title: String
    description: String
    location: String
    city: String
    state: String
    budgetMin: Money
    budgetMax: Money
    startDate: DateTime
    endDate: DateTime
    deadline: DateTime
    tradeIds: [ID!]
  }

  input CreateBidInput {
    projectId: ID!
    totalAmount: Money!
    notes: String
    completionTime: Int
    lineItems: [LineItemInput!]!
    alternates: [AlternateInput!]
  }

  input UpdateBidInput {
    totalAmount: Money
    notes: String
    completionTime: Int
    lineItems: [LineItemInput!]
    alternates: [AlternateInput!]
  }

  input LineItemInput {
    description: String!
    quantity: Float!
    unit: String!
    unitPrice: Money!
    notes: String
  }

  input AlternateInput {
    description: String!
    adjustmentAmount: Money!
    notes: String
  }

  input CreateCompanyInput {
    name: String!
    type: String
    address: String
    city: String
    state: String
    zip: String
    phone: String
    website: String
    description: String
    tradeIds: [ID!]
  }

  input RegisterInput {
    email: String!
    password: String!
    name: String!
    role: UserRole!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input ProjectFilter {
    status: ProjectStatus
    tradeId: ID
    city: String
    state: String
    budgetMin: Money
    budgetMax: Money
  }

  input BidFilter {
    projectId: ID
    status: BidStatus
    subcontractorId: ID
  }

  type Query {
    me: User
    projects(filter: ProjectFilter, limit: Int, offset: Int): [Project!]!
    project(id: ID!): Project
    myProjects: [Project!]!
    bids(filter: BidFilter): [Bid!]!
    bid(id: ID!): Bid
    myBids: [Bid!]!
    subcontractors(tradeId: ID, city: String, state: String): [User!]!
    subcontractor(id: ID!): User
    invitations: [Invitation!]!
    messages(projectId: ID, bidId: ID): [Message!]!
    notifications(unreadOnly: Boolean): [Notification!]!
    documents(projectId: ID!): [Document!]!
    trades: [Trade!]!
    analytics: Analytics!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    createCompany(input: CreateCompanyInput!): Company!
    updateCompany(input: CreateCompanyInput!): Company!
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    publishProject(id: ID!): Project!
    closeProject(id: ID!): Project!
    deleteProject(id: ID!): Boolean!
    createBid(input: CreateBidInput!): Bid!
    updateBid(id: ID!, input: UpdateBidInput!): Bid!
    submitBid(id: ID!): Bid!
    withdrawBid(id: ID!): Bid!
    awardBid(id: ID!): Bid!
    inviteSubcontractors(projectId: ID!, subcontractorIds: [ID!]!): [Invitation!]!
    acceptInvitation(id: ID!): Invitation!
    declineInvitation(id: ID!): Invitation!
    uploadDocument(projectId: ID!, file: Upload!, type: DocumentType!): Document!
    deleteDocument(id: ID!): Boolean!
    sendMessage(projectId: ID, bidId: ID, receiverId: ID!, text: String!): Message!
    markMessageAsRead(id: ID!): Message!
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: Boolean!
  }

  type Subscription {
    bidSubmitted(projectId: ID!): Bid!
    bidUpdated(bidId: ID!): Bid!
    projectUpdated(projectId: ID!): Project!
    invitationReceived: Invitation!
    messageAdded(bidId: ID, projectId: ID): Message!
    notificationReceived: Notification!
  }
`
