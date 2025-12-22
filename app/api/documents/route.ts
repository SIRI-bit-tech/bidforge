import { NextRequest, NextResponse } from 'next/server'
import { db, documents } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { projectId, name, type, url, size, uploadedBy } = await request.json()

    // Validate input
    if (!projectId || !name || !type || !url || !uploadedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create document record in database
    const [newDocument] = await db
      .insert(documents)
      .values({
        projectId,
        name,
        type,
        url,
        size: size || 0,
        uploadedById: uploadedBy,
        version: 1,
      })
      .returning()

    return NextResponse.json({ document: newDocument }, { status: 201 })
  } catch (error) {
    console.error('Failed to save document:', error)
    return NextResponse.json(
      { error: 'Failed to save document' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const projectDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.uploadedAt))

    return NextResponse.json({ documents: projectDocuments })
  } catch (error) {
    console.error('Failed to fetch documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}