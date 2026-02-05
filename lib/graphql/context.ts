import type { YogaInitialContext } from "graphql-yoga"
import prisma from "@/lib/prisma"
import jwt from "jsonwebtoken"
import { getJWTSecret } from "@/lib/utils/jwt"
import { logError } from "@/lib/logger"
import {
  createUserLoader,
  createCompanyLoader,
  createProjectLoader,
  createBidLoader,
  createTradeLoader,
} from "./loaders"

export interface GraphQLContext extends YogaInitialContext {
  prisma: typeof prisma
  userId?: string
  userRole?: "CONTRACTOR" | "SUBCONTRACTOR"
  loaders: {
    user: ReturnType<typeof createUserLoader>
    company: ReturnType<typeof createCompanyLoader>
    project: ReturnType<typeof createProjectLoader>
    bid: ReturnType<typeof createBidLoader>
    trade: ReturnType<typeof createTradeLoader>
  }
}

// Create context for each request
export async function createContext(initialContext: YogaInitialContext): Promise<GraphQLContext> {
  const token = initialContext.request.headers.get("authorization")?.replace("Bearer ", "")

  let userId: string | undefined
  let userRole: "CONTRACTOR" | "SUBCONTRACTOR" | undefined

  if (token) {
    try {
      const decoded = jwt.verify(token, getJWTSecret(), {
        issuer: 'bidforge',
        audience: 'bidforge-users',
      }) as {
        userId: string
        role: "CONTRACTOR" | "SUBCONTRACTOR"
      }
      userId = decoded.userId
      userRole = decoded.role
    } catch (error) {
      // Log JWT verification failure for security monitoring
      logError('JWT verification failed', error, {
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'JWT verification error',
        operation: 'graphql_context_creation',
        tokenPresent: !!token,
        tokenLength: token ? token.length : 0,
        userAgent: initialContext.request.headers.get('user-agent'),
        ip: initialContext.request.headers.get('x-forwarded-for') || 
            initialContext.request.headers.get('x-real-ip') || 'unknown',
        timestamp: new Date().toISOString(),
        severity: 'medium',
        errorType: 'jwt_verification_failure',
        securityEvent: true
      })
      // Continue with unauthenticated context
    }
  }

  return {
    ...initialContext,
    prisma,
    userId,
    userRole,
    loaders: {
      user: createUserLoader(),
      company: createCompanyLoader(),
      project: createProjectLoader(),
      bid: createBidLoader(),
      trade: createTradeLoader(),
    },
  }
}

// Helper to require authentication
export function requireAuth(context: GraphQLContext) {
  if (!context.userId) {
    throw new Error("Authentication required")
  }
  return context.userId
}

// Helper to require specific role
export function requireRole(context: GraphQLContext, role: "CONTRACTOR" | "SUBCONTRACTOR") {
  requireAuth(context)
  if (context.userRole !== role) {
    throw new Error(`This action requires ${role} role`)
  }
}
