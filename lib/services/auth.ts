import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validatePasswordStrength } from '@/lib/validation/password'
import { generateVerificationCode, generateVerificationData } from '@/lib/validation/verification-code'

// This file should only be used on the server side
// Client-side code should use API routes instead

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12 // Higher salt rounds for better security
  return await bcrypt.hash(password, saltRounds)
}

// Password verification
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

// JWT token generation
export function generateJWT(payload: { userId: string; role: string; companyId?: string }): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  
  return jwt.sign(payload, secret, {
    expiresIn: '30d',
    issuer: 'bidforge',
    audience: 'bidforge-users',
  })
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

// JWT token verification
export function verifyJWT(token: string): { userId: string; role: string; companyId?: string } | null {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET is not configured')
    }
    
    const decoded: unknown = jwt.verify(token, secret, {
      issuer: 'bidforge',
      audience: 'bidforge-users',
    })
    
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
      console.warn('JWT verification failed:', error.message)
    } else {
      console.warn('JWT verification failed: Invalid or expired token')
    }
    return null
  }
}

// Re-export shared validation and verification functions
export { validatePasswordStrength }
export { generateVerificationCode, generateVerificationData }