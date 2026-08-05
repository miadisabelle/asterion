// GET /api/projects - List projects
// POST /api/projects - Create project

import { NextRequest, NextResponse } from 'next/server'
import { 
  getProjects,
  createProject,
  logEvent,
  type CreateProjectInput
} from '@/lib/asterion'

export async function GET() {
  try {
    const projects = await getProjects()
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateProjectInput
    
    if (!body.name || body.name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Project name is required (min 2 characters)' },
        { status: 400 }
      )
    }

    const project = await createProject(body)
    
    await logEvent({
      event_type: 'project.created',
      payload: { project_id: project.id, name: project.name },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
