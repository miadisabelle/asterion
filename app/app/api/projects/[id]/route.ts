// GET /api/projects/[id] - Get project with tensions
// PATCH /api/projects/[id] - Name the agent that keeps its charts: { seat: { agent, name, folder?, mcp_server? } | null }
// POST /api/projects/[id]/tensions - Add tension to project
// DELETE /api/projects/[id]/tensions/[tensionId] - Remove tension from project

import { NextRequest, NextResponse } from 'next/server'
import { 
  getProjectWithTensions,
  addTensionToProject,
  setProjectSeat,
  SEAT_AGENT_PATTERN,
  SEAT_FOLDER_PATTERN,
  SEAT_SERVER_PATTERN,
  logEvent
} from '@/lib/asterion'
import { currentWriter, requireWriter } from '@/lib/asterion/writer'
import { viewerOf } from '@/lib/asterion/visibility'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await getProjectWithTensions(id, viewerOf(request))
    
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
  const denied = requireWriter(request)
  if (denied) return denied
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireWriter(request)
  if (denied) return denied
  try {
    const { id } = await params
    const body = (await request.json().catch(() => null)) as
      | { seat?: { agent?: unknown; name?: unknown; folder?: unknown; mcp_server?: unknown } | null }
      | null
    if (!body || !('seat' in body)) {
      return NextResponse.json({ error: 'Send { seat: { agent, name, folder?, mcp_server? } } or { seat: null }' }, { status: 400 })
    }
    const existing = await getProjectWithTensions(id, viewerOf(request))
    if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    let seat = null
    if (body.seat !== null) {
      const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
      const agent = text(body.seat?.agent) ?? ''
      const name = text(body.seat?.name) ?? ''
      const folder = text(body.seat?.folder)
      const server = text(body.seat?.mcp_server)
      if (!SEAT_AGENT_PATTERN.test(agent)) {
        return NextResponse.json({ error: 'seat.agent must be a Miadi person id (node:<kind>:<number>:<suffix>)' }, { status: 400 })
      }
      if (!name || name.length > 80) return NextResponse.json({ error: 'seat.name must be 1 to 80 characters' }, { status: 400 })
      if (folder !== null && !SEAT_FOLDER_PATTERN.test(folder)) {
        return NextResponse.json({ error: 'seat.folder must be an absolute path' }, { status: 400 })
      }
      if (server !== null && !SEAT_SERVER_PATTERN.test(server)) {
        return NextResponse.json({ error: 'seat.mcp_server must be a server name' }, { status: 400 })
      }
      seat = {
        agent,
        name,
        folder,
        mcp_server: server,
        set_by: currentWriter(request)?.name ?? 'writer',
        set_at: new Date().toISOString(),
      }
    }

    const project = await setProjectSeat(id, seat)
    await logEvent({
      event_type: seat ? 'project.seat_named' : 'project.seat_cleared',
      actor_type: 'human',
      actor_id: currentWriter(request)?.name,
      payload: { project_id: id, seat },
    })
    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error naming the project seat:', error)
    return NextResponse.json({ error: 'Failed to name the seat' }, { status: 500 })
  }
}
