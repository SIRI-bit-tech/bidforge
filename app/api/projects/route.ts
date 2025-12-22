import { NextRequest, NextResponse } from 'next/server'
import { db, projects, projectTrades, trades } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const createdBy = searchParams.get('createdBy')

    // Get projects with their trades
    const projectsWithTrades = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        location: projects.location,
        city: projects.city,
        state: projects.state,
        budgetMin: projects.budgetMin,
        budgetMax: projects.budgetMax,
        startDate: projects.startDate,
        endDate: projects.endDate,
        deadline: projects.deadline,
        status: projects.status,
        createdById: projects.createdById,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        tradeName: trades.name,
      })
      .from(projects)
      .leftJoin(projectTrades, eq(projects.id, projectTrades.projectId))
      .leftJoin(trades, eq(projectTrades.tradeId, trades.id))

    // Apply filters
    let filteredProjects = projectsWithTrades
    if (status && ['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED'].includes(status)) {
      filteredProjects = filteredProjects.filter(p => p.status === status)
    }
    if (createdBy) {
      filteredProjects = filteredProjects.filter(p => p.createdById === createdBy)
    }

    // Group trades by project
    const projectsMap = new Map()
    
    filteredProjects.forEach(row => {
      if (!projectsMap.has(row.id)) {
        projectsMap.set(row.id, {
          id: row.id,
          title: row.title,
          description: row.description,
          location: row.location,
          city: row.city,
          state: row.state,
          budgetMin: row.budgetMin,
          budgetMax: row.budgetMax,
          startDate: row.startDate,
          endDate: row.endDate,
          deadline: row.deadline,
          status: row.status,
          createdBy: row.createdById, // Map createdById to createdBy for compatibility
          createdById: row.createdById,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          trades: [],
        })
      }
      
      if (row.tradeName) {
        const project = projectsMap.get(row.id)
        if (!project.trades.includes(row.tradeName)) {
          project.trades.push(row.tradeName)
        }
      }
    })

    const result = Array.from(projectsMap.values())

    return NextResponse.json({
      success: true,
      projects: result
    })

  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, location, budgetMin, budgetMax, startDate, endDate, deadline, createdById, status } = body

    // Validate required fields
    if (!title || !description || !location || !deadline || !createdById) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const [project] = await db
      .insert(projects)
      .values({
        title,
        description,
        location,
        budgetMin: budgetMin || null,
        budgetMax: budgetMax || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        deadline: new Date(deadline),
        createdById,
        status: status || 'DRAFT',
      })
      .returning()

    return NextResponse.json({
      success: true,
      project
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}