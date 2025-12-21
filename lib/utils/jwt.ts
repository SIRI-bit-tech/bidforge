import jwt, { SignOptions } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// JWT token utilities for GraphQL authentication
export function signJWT(payload: object, expiresIn = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as SignOptions)
}

// Type guard to validate JWT payload structure
function isValidJWTPayload(payload: unknown): payload is { userId: string; role: string; companyId?: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as any).userId === 'string' &&
    typeof (payload as any).role === 'string' &&
    ((payload as any).companyId === undefined || typeof (payload as any).companyId === 'string')
  )
}

export function verifyJWT(token: string): { userId: string; role: string; companyId?: string } | null {
  try {
    const decoded: unknown = jwt.verify(token, JWT_SECRET)
    
    // Runtime validation of payload structure
    if (!isValidJWTPayload(decoded)) {
      console.warn('JWT verification failed: Invalid payload structure')
      return null
    }
    
    return decoded
  } catch (error) {
    // Secure error logging - don't expose sensitive information
    const isDevelopment = process.env.NODE_ENV === 'development'
    if (isDevelopment && error instanceof Error) {
      console.warn('[v0] JWT verification failed:', error.message)
    } else {
      console.warn('[v0] JWT verification failed: Invalid or expired token')
    }
    return null
  }
}
