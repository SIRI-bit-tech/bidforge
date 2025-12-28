import { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/services/auth'
import { logError } from '@/lib/logger'

export interface AuthUser {
  userId: string
  role: string
  companyId?: string
}

/**
 * Extract and verify JWT token from httpOnly cookie
 */
export function getAuthUserFromCookie(request: NextRequest): AuthUser | null {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return null
    }

    const payload = verifyJWT(token)
    
    if (!payload || !payload.userId || !payload.role) {
      return null
    }

    return {
      userId: payload.userId,
      role: payload.role,
      companyId: payload.companyId
    }
  } catch (error) {
    // Log JWT verification failure for debugging and security monitoring
    logError('JWT verification failed in auth cookie extraction', error, {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      cookieName: 'auth-token',
      cookiePath: '/',
      hasToken: !!request.cookies.get('auth-token')?.value,
      tokenLength: request.cookies.get('auth-token')?.value?.length || 0,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 'unknown',
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      severity: 'medium',
      errorType: 'auth_cookie_verification_failure',
      securityEvent: true
    })
    
    return null
  }
}

/**
 * Check if user is authenticated from cookie
 */
export function isAuthenticated(request: NextRequest): boolean {
  const user = getAuthUserFromCookie(request)
  return user !== null
}

/**
 * Check if user has specific role
 */
export function hasRole(request: NextRequest, requiredRole: string): boolean {
  const user = getAuthUserFromCookie(request)
  return user?.role === requiredRole
}