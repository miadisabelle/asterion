// GET /api/projects/[id] - Get project with tensions
// PATCH /api/projects/[id] - Name the project's seat: { seat: { session, host? } | null }
// POST /api/projects/[id]/tensions - Add tension to project
// DELETE /api/projects/[id]/tensions/[tensionId] - Remove tension from project

import { NextRequest, NextResponse } from 'next/server'
import { 
  getProjectWithTensions,
  addTensionToProject,
  setProjectSeat,
  SEAT_SESSION_PATTERN,
  SEAT_HOST_PATTERN,
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
    const body = (await request.json().catch(() => null)) as { seat?: { session?: unknown; host?: unknown } | null } | null
    if (!body || !('seat' in body)) {
      return NextResponse.json({ error: 'Send { seat: { session, host? } } or { seat: null }' }, { status: 400 })
    }
    const existing = await getProjectWithTensions(id, viewerOf(request))
    if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    let seat = null
    if (body.seat !== null) {
      const session = typeof body.seat?.session === 'string' ? body.seat.session.trim() : ''
      const host = typeof body.seat?.host === 'string' && body.seat.host.trim() ? body.seat.host.trim() : null
      if (!SEAT_SESSION_PATTERN.test(session)) {
        return NextResponse.json({ error: 'seat.session must be a tmux session name' }, { status: 400 })
      }
      if (host !== null && !SEAT_HOST_PATTERN.test(host)) {
        return NextResponse.json({ error: 'seat.host must be a host name' }, { status: 400 })
      }
      seat = {
        kind: 'tmux' as const,
        session,
        host,
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
