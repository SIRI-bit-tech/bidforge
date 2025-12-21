# BidForge - Construction Bid Management Platform

A comprehensive B2B platform connecting general contractors with qualified subcontractors. Streamline RFPs, compare bids in real-time, and award contracts with confidence.

## Overview

BidForge is a production-ready construction bid management platform built with modern web technologies. It provides a complete solution for managing construction projects, inviting subcontractors, receiving and comparing bids, and awarding contracts.

## Features

### For General Contractors
- **Project Management**: Create and publish construction projects with detailed RFPs
- **Bid Comparison**: Review and compare bids side-by-side with intelligent filtering
- **Subcontractor Discovery**: Search and invite qualified subcontractors by trade
- **Real-time Updates**: Get instant notifications when bids are submitted
- **Document Management**: Upload blueprints, specifications, and project documents
- **Analytics Dashboard**: Track project performance and bid statistics

### For Subcontractors
- **Project Opportunities**: Browse available projects matching your trades
- **Bid Submission**: Submit detailed bids with line items and alternates
- **Invitation Management**: Respond to direct project invitations
- **Bid Tracking**: Monitor status of all submitted bids in one place
- **Messaging**: Communicate directly with general contractors
- **Performance Insights**: View win rates and bidding analytics

### Platform Features
- **Real-time Subscriptions**: WebSocket-based updates using GraphQL subscriptions
- **File Storage**: Cloudinary integration for blueprints and documents
- **Email Notifications**: Automated alerts for bids, awards, and deadlines
- **Authentication**: Secure JWT-based auth with role-based access control
- **Mobile Responsive**: Optimized for on-site access from any device

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19.2
- **Styling**: Tailwind CSS v4 with custom design tokens
- **Components**: shadcn/ui with Radix UI primitives
- **State Management**: URQL for GraphQL + local UI state
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

### Backend
- **API**: GraphQL with GraphQL Yoga
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Type-safe database schema with relations
- **Authentication**: Better Auth with JWT tokens
- **Caching**: Redis for data caching with IORedis
- **File Storage**: Cloudinary for document/image uploads
- **Email**: SendGrid for transactional emails

### GraphQL Architecture
- **Client**: URQL with normalized caching (GraphCache)
- **Real-time**: WebSocket subscriptions via graphql-ws
- **Optimization**: DataLoader for N+1 query prevention
- **Pub/Sub**: Event-driven notifications and updates
- **Code Generation**: GraphQL Code Generator for TypeScript types

## Project Structure

```
bidforge/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Authenticated dashboard routes
│   │   ├── dashboard/           # Main dashboard page
│   │   ├── projects/            # Project management
│   │   ├── opportunities/       # Browse projects (subcontractors)
│   │   ├── my-bids/            # Bid tracking
│   │   ├── invitations/         # Invitation management
│   │   ├── subcontractors/      # Subcontractor directory
│   │   ├── messages/            # Messaging system
│   │   ├── notifications/       # Notification center
│   │   ├── analytics/           # Performance analytics
│   │   └── settings/            # User/company settings
│   ├── api/                     # API routes
│   │   ├── graphql/            # GraphQL API endpoint
│   │   ├── auth/               # Better Auth routes
│   │   └── upload/             # File upload endpoint
│   ├── login/                   # Authentication pages
│   ├── register/
│   ├── onboarding/
│   └── page.tsx                 # Landing page
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── project-card.tsx         # Reusable project card
│   ├── bid-card.tsx            # Reusable bid card
│   ├── stats-card.tsx          # Dashboard statistics
│   ├── navbar.tsx              # Navigation header
│   ├── sidebar.tsx             # Dashboard sidebar
│   └── ...
├── lib/                         # Core library code
│   ├── db/                      # Database layer
│   │   ├── schema.ts           # Drizzle ORM schema
│   │   └── index.ts            # Database client
│   ├── graphql/                 # GraphQL layer
│   │   ├── schema.ts           # GraphQL schema definition
│   │   ├── context.ts          # Request context with loaders
│   │   ├── loaders.ts          # DataLoader implementations
│   │   ├── pubsub.ts           # Pub/Sub for subscriptions
│   │   ├── client.ts           # URQL client configuration
│   │   ├── cache-config.ts     # GraphCache configuration
│   │   ├── resolvers/          # GraphQL resolvers
│   │   │   ├── auth.ts         # Authentication
│   │   │   ├── projects.ts     # Projects CRUD
│   │   │   ├── bids.ts         # Bids management
│   │   │   ├── invitations.ts  # Invitation handling
│   │   │   ├── messages.ts     # Messaging
│   │   │   ├── notifications.ts # Notifications
│   │   │   ├── documents.ts    # Document management
│   │   │   ├── companies.ts    # Company profiles
│   │   │   ├── subcontractors.ts # Subcontractor directory
│   │   │   ├── trades.ts       # Trade categories
│   │   │   ├── analytics.ts    # Performance analytics
│   │   │   ├── subscriptions.ts # Real-time subscriptions
│   │   │   └── index.ts        # Combined resolvers
│   │   └── queries/            # Client-side GraphQL queries
│   │       ├── projects.ts     # Project queries/mutations
│   │       ├── bids.ts         # Bid operations
│   │       ├── auth.ts         # Auth operations
│   │       ├── invitations.ts  # Invitation operations
│   │       ├── messages.ts     # Message queries
│   │       ├── notifications.ts # Notification queries
│   │       ├── documents.ts    # Document operations
│   │       └── companies.ts    # Company queries
│   ├── auth/                    # Authentication
│   │   └── index.ts            # Better Auth configuration
│   ├── cache/                   # Caching layer
│   │   └── redis.ts            # Redis client and helpers
│   ├── storage/                 # File storage
│   │   └── cloudinary.ts       # Cloudinary integration
│   ├── utils/                   # Utility functions
│   │   ├── email.ts            # Email templates and sender
│   │   ├── jwt.ts              # JWT utilities
│   │   ├── format.ts           # Formatting helpers
│   │   └── ...
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-auth.ts         # Authentication hook
│   │   └── use-mobile.tsx      # Mobile detection
│   ├── providers/               # React providers
│   │   └── urql-provider.tsx   # URQL GraphQL provider
│   └── types.ts                # TypeScript type definitions
├── scripts/                     # Database scripts
│   └── 001-init-database.sql   # Initial schema setup
├── drizzle.config.ts           # Drizzle ORM configuration
├── codegen.yml                 # GraphQL code generation config
└── package.json

```

## Getting Started

### Prerequisites
- Node.js 20+ 
- PostgreSQL database
- Redis server (optional, for caching)
- Cloudinary account (for file storage)
- SendGrid account (for emails)

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bidforge"

# Authentication
JWT_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_SECRET="your-auth-secret"
BETTER_AUTH_URL="http://localhost:3000"

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Redis (Optional - for caching)
REDIS_URL="redis://localhost:6379"

# SendGrid (Email Notifications)
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@bidforge.com"

# GraphQL
NEXT_PUBLIC_GRAPHQL_URL="http://localhost:3000/api/graphql"
NEXT_PUBLIC_GRAPHQL_WS_URL="ws://localhost:3000/api/graphql"
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/bidforge.git
cd bidforge
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up the database**
```bash
# Push schema to database
npm run db:push

# (Optional) Run seed script
npm run db:seed
```

4. **Generate GraphQL types**
```bash
npm run codegen
```

5. **Start development server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to `http://localhost:3000`

## Database Schema

### Core Tables
- **users**: User accounts (contractors & subcontractors)
- **companies**: Company profiles and information
- **projects**: Construction projects with RFPs
- **bids**: Subcontractor bid submissions
- **line_items**: Detailed cost breakdown for bids
- **alternates**: Alternative options in bids
- **invitations**: Project invitations to subcontractors
- **documents**: Uploaded files (blueprints, specs)
- **messages**: Communication between users
- **notifications**: System notifications
- **trades**: Trade categories and specializations

### Relations
- Users belong to Companies (one-to-many)
- Projects have many Bids (one-to-many)
- Bids have many Line Items and Alternates (one-to-many)
- Projects have many Invitations and Documents (one-to-many)
- Messages link Users to Projects (many-to-many)

## GraphQL API

### Queries
- `me`: Current authenticated user
- `projects(filter, limit, offset)`: List projects
- `project(id)`: Single project details
- `bids(projectId, subcontractorId, status)`: List bids
- `bid(id)`: Single bid details
- `invitations(...)`: List invitations
- `messages(projectId)`: Project messages
- `notifications(userId)`: User notifications
- `subcontractors(trade, search)`: Subcontractor directory
- `analytics`: Performance metrics

### Mutations
- `login(email, password)`: Authenticate user
- `register(input)`: Create new account
- `createProject(input)`: Create project
- `updateProject(id, input)`: Update project
- `publishProject(id)`: Publish project for bidding
- `createBid(input)`: Submit new bid
- `submitBid(id)`: Submit draft bid
- `awardBid(id)`: Award contract to bid
- `inviteSubcontractors(...)`: Send invitations
- `respondToInvitation(id, accept)`: Accept/decline invite
- `sendMessage(input)`: Send message
- `uploadDocument(input)`: Upload file
- `updateCompany(id, input)`: Update company profile

### Subscriptions
- `bidSubmitted(projectId)`: New bid submitted
- `bidUpdated(projectId)`: Bid status changed
- `invitationReceived(subcontractorId)`: New invitation
- `messageReceived(userId)`: New message
- `notificationCreated(userId)`: New notification

## Key Features Implementation

### DataLoader (N+1 Prevention)
All resolvers use DataLoader to batch and cache database queries:
- User loader: Batch load users by ID
- Company loader: Batch load companies
- Project loader: Batch load projects
- Bid loader: Batch load bids with counts

### Normalized Caching
URQL GraphCache provides normalized caching:
- Entities cached by ID
- Automatic cache updates on mutations
- Optimistic updates for instant UI feedback
- Cache invalidation strategies

### Real-time Updates
WebSocket subscriptions for live updates:
- Bid submissions notify contractors instantly
- Award notifications sent to subcontractors
- Real-time message delivery
- Live notification feed

### File Management
Cloudinary integration for scalable storage:
- Direct uploads from browser
- Automatic image optimization
- Secure signed URLs for private documents
- CDN delivery for fast access

### Email Notifications
Automated SendGrid emails for key events:
- Bid submission confirmations
- Award notifications
- Invitation reminders
- Deadline alerts

## Color Theme

BidForge uses a professional construction industry color palette:

- **Primary (Steel Gray)**: #708090 - Main brand color
- **Accent (Construction Orange)**: #FF8C42 - CTAs and highlights
- **Background**: #FAFAFA - Clean, light background
- **Card**: #FFFFFF - Content containers
- **Muted**: #F5F5F5 - Subtle backgrounds
- **Foreground**: #1A1A1A - Primary text
- **Muted Foreground**: #6B7280 - Secondary text

## Development Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Database operations
npm run db:push          # Push schema changes
npm run db:studio        # Open Drizzle Studio
npm run db:generate      # Generate migrations

# GraphQL operations
npm run codegen          # Generate TypeScript types
npm run graphql:schema   # Export GraphQL schema

# Code quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript checking
```

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables
4. Deploy automatically

### Environment Configuration
- Set all required environment variables
- Configure PostgreSQL database (Neon, Supabase, etc.)
- Set up Redis instance (Upstash recommended)
- Configure Cloudinary project
- Add SendGrid API key

### Database Migrations
```bash
# Generate migration
npm run db:generate

# Apply migrations
npm run db:push
```

## Security

### Authentication
- JWT-based authentication with secure token storage
- Role-based access control (CONTRACTOR, SUBCONTRACTOR)
- Protected API routes with middleware
- Session management with Better Auth

### Authorization
- GraphQL resolver-level authorization checks
- User can only access their own data
- Contractors can only manage their projects
- Subcontractors can only view published projects

### Data Protection
- Password hashing with bcrypt
- Secure file uploads with validation
- SQL injection prevention with parameterized queries
- XSS protection with React's built-in escaping

## Performance Optimizations

- **DataLoader**: Batch and cache database queries
- **GraphCache**: Normalized client-side caching
- **Redis**: Server-side data caching
- **Cloudinary CDN**: Fast file delivery
- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Next.js Image component
- **Server Components**: Reduced client JavaScript

## Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run type checking
npm run type-check
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@bidforge.com or open an issue in the GitHub repository.

## Acknowledgments

- Built with Next.js and React
- UI components from shadcn/ui
- GraphQL API with GraphQL Yoga
- Database ORM by Drizzle
- File storage by Cloudinary
- Icons by Lucide

---

**BidForge** - Connecting contractors with qualified subcontractors, one bid at a time.
