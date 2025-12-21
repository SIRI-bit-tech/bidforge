import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// JWT token utilities for GraphQL authentication
export function signJWT(payload: any, expiresIn = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export async function verifyJWT(token: string): Promise<any> {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    console.error("[v0] JWT verification error:", error)
    return null
  }
}
