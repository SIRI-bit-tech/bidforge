import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { cache } from '@/lib/cache/redis'
import { getConnectionStats as getSocketStats } from '@/lib/socket/server'

// Metrics endpoint for monitoring systems (Prometheus format)
export async function GET(request: NextRequest) {
  try {
    // For now, we'll use placeholder DB stats since we don't have a connection pool monitor
    const dbStats = { available: false, total_connections: null, active_connections: null, idle_connections: null }
    const socketStats = getSocketStats()
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    // Prometheus metrics format
    const metrics = [
      '# HELP bidforge_uptime_seconds Application uptime in seconds',
      '# TYPE bidforge_uptime_seconds counter',
      `bidforge_uptime_seconds ${uptime}`,
      '',
      '# HELP bidforge_memory_usage_bytes Memory usage in bytes',
      '# TYPE bidforge_memory_usage_bytes gauge',
      `bidforge_memory_usage_bytes{type="heap_used"} ${memoryUsage.heapUsed}`,
      `bidforge_memory_usage_bytes{type="heap_total"} ${memoryUsage.heapTotal}`,
      `bidforge_memory_usage_bytes{type="external"} ${memoryUsage.external}`,
      `bidforge_memory_usage_bytes{type="rss"} ${memoryUsage.rss}`,
      '',
      '# HELP bidforge_database_connections Database connection count',
      '# TYPE bidforge_database_connections gauge',
      `bidforge_database_connections{state="total"} ${dbStats.available && dbStats.total_connections !== null ? dbStats.total_connections : -1}`, // Use -1 to indicate unavailable
      `bidforge_database_connections{state="active"} ${dbStats.available && dbStats.active_connections !== null ? dbStats.active_connections : -1}`,
      `bidforge_database_connections{state="idle"} ${dbStats.available && dbStats.total_connections !== null ? dbStats.idle_connections : -1}`,
      '',
      '# HELP bidforge_websocket_connections WebSocket connection count',
      '# TYPE bidforge_websocket_connections gauge',
      `bidforge_websocket_connections{state="total"} ${socketStats.totalConnections}`,
      `bidforge_websocket_connections{state="authenticated"} ${socketStats.authenticatedConnections}`,
      '',
      '# HELP bidforge_websocket_messages_total Total WebSocket messages sent',
      '# TYPE bidforge_websocket_messages_total counter',
      `bidforge_websocket_messages_total ${socketStats.messagesSent}`,
      '',
      '# HELP bidforge_websocket_errors_total Total WebSocket errors',
      '# TYPE bidforge_websocket_errors_total counter',
      `bidforge_websocket_errors_total ${socketStats.errorsCount}`,
      ''
    ].join('\n')

    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    })
  } catch (error) {
    logError('metrics endpoint error', error, {
      endpoint: '/api/metrics',
      errorType: 'metrics_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Metrics unavailable' },
      { status: 500 }
    )
  }
}

// JSON format metrics for internal monitoring
export async function POST(request: NextRequest) {
  try {
    // For now, we'll use placeholder DB stats since we don't have a connection pool monitor
    const dbStats = { available: false, total_connections: null, active_connections: null, idle_connections: null }
    const socketStats = getSocketStats()
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: uptime,
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      database: {
        available: dbStats.available,
        totalConnections: dbStats.available ? dbStats.total_connections : null,
        activeConnections: dbStats.available ? dbStats.active_connections : null,
        idleConnections: dbStats.available ? dbStats.idle_connections : null
      },
      websocket: {
        totalConnections: socketStats.totalConnections,
        authenticatedConnections: socketStats.authenticatedConnections,
        messagesSent: socketStats.messagesSent,
        errorsCount: socketStats.errorsCount
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }

    return NextResponse.json(metrics)
  } catch (error) {
    logError('metrics endpoint error', error, {
      endpoint: '/api/metrics',
      errorType: 'metrics_error',
      severity: 'high'
    })

    return NextResponse.json(
      { error: 'Metrics unavailable' },
      { status: 500 }
    )
  }
}