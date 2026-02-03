import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cache } from '@/lib/cache/redis'
import { getConnectionStats as getSocketStats } from '@/lib/socket/server'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Check database health (Prisma)
    let dbHealthy = false
    try {
      await prisma.$queryRaw`SELECT 1`
      dbHealthy = true
    } catch (e) {
      console.error('Database health check failed:', e)
    }

    // Check Redis health
    let redisHealthy = false
    let redisStats = {}
    try {
      redisHealthy = await cache.ping()
      if (redisHealthy) {
        redisStats = await cache.getStats()
      }
    } catch (e) {
      console.error('Redis health check failed:', e)
    }

    // Check Socket.IO health
    const socketStats = getSocketStats()

    // System metrics
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    const responseTime = Date.now() - startTime

    const health = {
      status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      uptime: `${Math.floor(uptime)}s`,
      services: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy'
        },
        redis: {
          status: redisHealthy ? 'healthy' : 'unhealthy',
          stats: redisStats
        },
        websocket: {
          status: 'healthy',
          connections: socketStats
        }
      },
      system: {
        memory: {
          used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        uptime: `${Math.floor(uptime)}s`,
        nodeVersion: process.version,
        platform: process.platform
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 503

    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      responseTime: `${Date.now() - startTime}ms`
    }, { status: 503 })
  }
}

// Liveness probe
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}