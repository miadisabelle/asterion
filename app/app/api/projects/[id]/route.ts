// GET /api/projects/[id] - Get project with tensions
// POST /api/projects/[id]/tensions - Add tension to project
// DELETE /api/projects/[id]/tensions/[tensionId] - Remove tension from project

import { NextRequest, NextResponse } from 'next/server'
import { 
  getProjectWithTensions,
  addTensionToProject,
  logEvent
} from '@/lib/asterion'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await getProjectWithTensions(id)
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as {
      tension_id: string
      lens?: string
      sort_order?: number
    }
    
    if (!body.tension_id) {
      return NextResponse.json(
        { error: 'tension_id is required' },
        { status: 400 }
      )
    }

    const projectTension = await addTensionToProject(
      id,
      body.tension_id,
      body.lens,
      body.sort_order
    )
    
    await logEvent({
      event_type: 'project.tension_added',
      tension_id: body.tension_id,
      payload: { project_id: id, lens: body.lens },
    })

    return NextResponse.json({ project_tension: projectTension }, { status: 201 })
  } catch (error) {
    console.error('Error adding tension to project:', error)
    return NextResponse.json(
      { error: 'Failed to add tension to project' },
      { status: 500 }
    )
  }
}
