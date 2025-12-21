import Redis from "ioredis"

// Redis client for caching frequently accessed data
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number.parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: Number.parseInt(process.env.REDIS_DB || "0"),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
})

redis.on("error", (error) => {
  console.error("[v0] Redis connection error:", error)
})

redis.on("connect", () => {
  console.log("[v0] Redis connected successfully")
})

// Cache helper functions
export const cache = {
  // Get cached value
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error(`[v0] Cache get error for key ${key}:`, error)
      return null
    }
  },

  // Set cached value with optional TTL (in seconds)
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      if (ttl) {
        await redis.setex(key, ttl, serialized)
      } else {
        await redis.set(key, serialized)
      }
    } catch (error) {
      console.error(`[v0] Cache set error for key ${key}:`, error)
    }
  },

  // Delete cached value
  async del(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      console.error(`[v0] Cache delete error for key ${key}:`, error)
    }
  },

  // Delete multiple keys matching pattern
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error(`[v0] Cache delete pattern error for ${pattern}:`, error)
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.error(`[v0] Cache exists error for key ${key}:`, error)
      return false
    }
  },
}

export default redis
