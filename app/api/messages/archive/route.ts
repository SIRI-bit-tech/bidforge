import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'
import { logError } from '@/lib/logger'

async function ensureArchiveTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE IF NOT EXISTS "archived_conversations" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        project_id uuid NOT NULL,
        other_user_id uuid NOT NULL,
        archived_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS archived_conversations_unique
        ON "archived_conversations" (user_id, project_id, other_user_id);
      CREATE INDEX IF NOT EXISTS archived_conversations_user_idx
        ON "archived_conversations" (user_id);
    `)
  } catch {}
}

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
    const items = await prisma.$queryRaw<{ projectId: string; otherUserId: string }[]>`
      SELECT "project_id" AS "projectId", "other_user_id" AS "otherUserId"
      FROM "archived_conversations"
      WHERE "user_id" = ${payload.userId}
    `
    return NextResponse.json({ items }, { status: 200 })
  } catch (error) {
    const msg = String((error as any)?.message || '')
    if (msg.includes('relation "archived_conversations" does not exist') || msg.includes('42P01')) {
      await ensureArchiveTable()
      try {
        const token = request.cookies.get('auth-token')?.value
        if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        const payload = verifyJWT(token)
        if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
        const items = await prisma.$queryRaw<{ projectId: string; otherUserId: string }[]>`
          SELECT "project_id" AS "projectId", "other_user_id" AS "otherUserId"
          FROM "archived_conversations"
          WHERE "user_id" = ${payload.userId}
        `
        return NextResponse.json({ items }, { status: 200 })
      } catch {
        return NextResponse.json({ items: [] }, { status: 200 })
      }
    }
    logError('get archived conversations error', error, { endpoint: '/api/messages/archive' })
    return NextResponse.json({ error: 'Failed to load archives' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
    const body = await request.json()
    const { projectId, otherUserId } = body || {}
    if (!projectId || !otherUserId) {
      return NextResponse.json({ error: 'Project ID and other user ID are required' }, { status: 400 })
    }
    await prisma.$executeRaw`
      INSERT INTO "archived_conversations" ("user_id","project_id","other_user_id")
      VALUES (${payload.userId}, ${projectId}, ${otherUserId})
      ON CONFLICT ("user_id","project_id","other_user_id") DO NOTHING
    `
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    const msg = String((error as any)?.message || '')
    if (msg.includes('relation "archived_conversations" does not exist') || msg.includes('42P01')) {
      await ensureArchiveTable()
      try {
        const token = request.cookies.get('auth-token')?.value
        if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        const payload = verifyJWT(token)
        if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
        const body = await request.json()
        const { projectId, otherUserId } = body || {}
        if (!projectId || !otherUserId) {
          return NextResponse.json({ error: 'Project ID and other user ID are required' }, { status: 400 })
        }
        await prisma.$executeRaw`
          INSERT INTO "archived_conversations" ("user_id","project_id","other_user_id")
          VALUES (${payload.userId}, ${projectId}, ${otherUserId})
          ON CONFLICT ("user_id","project_id","other_user_id") DO NOTHING
        `
        return NextResponse.json({ ok: true }, { status: 200 })
      } catch {
        return NextResponse.json({ ok: true }, { status: 200 })
      }
    }
    logError('archive conversation error', error, { endpoint: '/api/messages/archive' })
    return NextResponse.json({ error: 'Failed to archive conversation' }, { status: 500 })
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
    await prisma.$executeRaw`
      DELETE FROM "archived_conversations"
      WHERE "user_id" = ${payload.userId}
        AND "project_id" = ${projectId}
        AND "other_user_id" = ${otherUserId}
    `
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    const msg = String((error as any)?.message || '')
    if (msg.includes('relation "archived_conversations" does not exist') || msg.includes('42P01')) {
      await ensureArchiveTable()
      return NextResponse.json({ ok: true }, { status: 200 })
    }
    logError('unarchive conversation error', error, { endpoint: '/api/messages/archive' })
    return NextResponse.json({ error: 'Failed to unarchive conversation' }, { status: 500 })
  }
}
