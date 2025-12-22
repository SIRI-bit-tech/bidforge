import { NextRequest, NextResponse } from 'next/server'
import { db, messages } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    // Update message as read
    const [updatedMessage] = await db
      .update(messages)
      .set({ read: true })
      .where(eq(messages.id, id))
      .returning()

    if (!updatedMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    console.error('Error marking message as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark message as read' },
      { status: 500 }
    )
  }
}