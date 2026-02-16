import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'
import { logError } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
    const rows = await prisma.archivedConversation.findMany({
      where: { userId: payload.userId },
      select: { projectId: true, otherUserId: true },
    })
    const items = rows.map(r => ({ projectId: r.projectId, otherUserId: r.otherUserId }))
    return NextResponse.json({ items }, { status: 200 })
  } catch (error) {
    logError('get archived conversations error', error, { endpoint: '/api/messages/archive' })
    return NextResponse.json({ error: 'Failed to load archives' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const parsed = await request.json().catch(() => ({} as any))
  const { projectId, otherUserId } = parsed || {}
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
    if (!projectId || !otherUserId) {
      return NextResponse.json({ error: 'Project ID and other user ID are required' }, { status: 400 })
    }
    await prisma.archivedConversation.upsert({
      where: {
        userId_projectId_otherUserId: {
          userId: payload.userId,
          projectId,
          otherUserId,
        },
      },
      create: {
        userId: payload.userId,
        projectId,
        otherUserId,
      },
      update: {},
    })
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    logError('archive conversation error', err, { endpoint: '/api/messages/archive' })
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const otherUserId = searchParams.get('otherUserId')
    if (!projectId || !otherUserId) {
      return NextResponse.json({ error: 'Project ID and other user ID are required' }, { status: 400 })
    }
    await prisma.archivedConversation.deleteMany({
      where: {
        userId: payload.userId,
        projectId,
        otherUserId,
      },
    })
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    logError('unarchive conversation error', error, { endpoint: '/api/messages/archive' })
    return NextResponse.json({ error: 'Failed to unarchive conversation' }, { status: 500 })
  }
}
