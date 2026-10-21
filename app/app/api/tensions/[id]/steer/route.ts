// POST /api/tensions/[id]/steer - Give a writer's steer to the agent that keeps this chart:
//   { text, dry_run? }  dry_run answers with the brief and the door, and starts nothing.
//
// Only on gaia (lib/asterion/steer.ts). Every steer, previewed, sent or refused,
// is logged as a tension.steered event on the chart, so the chart shows what was
// asked of its keeper and what happened to it.

import { NextRequest, NextResponse } from 'next/server'
import { getTensionWithRelations, getSeatsOfTension, logEvent } from '@/lib/asterion'
import type { ProjectSeat } from '@/lib/asterion/types'
import { currentWriter, requireWriter } from '@/lib/asterion/writer'
import { viewerOf } from '@/lib/asterion/visibility'
import { steer, steerBrief, steeringHere } from '@/lib/asterion/steer'

export const runtime = 'nodejs'

const TAILNET_ADDRESS = 'https://asterion.tail3b11eb.ts.net'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireWriter(request)
  if (denied) return denied
  try {
    if (!steeringHere()) {
      return NextResponse.json(
        { error: `A steer starts an agent on gaia, so it is sent only from ${TAILNET_ADDRESS}.`, steer_from: TAILNET_ADDRESS },
        { status: 503 }
      )
    }
    const { id } = await params
    const body = (await request.json().catch(() => null)) as { text?: unknown; dry_run?: unknown } | null
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    if (!text || text.length > 4000) return NextResponse.json({ error: 'Send { text } of 1 to 4000 characters.' }, { status: 400 })
    const dryRun = body?.dry_run === true

    const viewer = viewerOf(request)
    const chart = await getTensionWithRelations(id, viewer)
    if (!chart) return NextResponse.json({ error: 'Tension not found' }, { status: 404 })
    const named = (await getSeatsOfTension(id, viewer)).find((s) => s.seat && 'agent' in s.seat)
    if (!named) {
      return NextResponse.json({ error: "No agent is named as the keeper of this chart's project. Name it on the project page." }, { status: 409 })
    }
    const seat = named.seat as ProjectSeat
    const from = currentWriter(request)?.name ?? 'A writer'
    const brief = steerBrief({
      chart,
      projectName: named.project_name,
      seat,
      text,
      from,
      chartUrl: `${TAILNET_ADDRESS}/tensions/${id}`,
    })
    const outcome = await steer(seat, brief, dryRun)

    if (!dryRun) {
      await logEvent({
        event_type: 'tension.steered',
        actor_type: 'human',
        actor_id: currentWriter(request)?.name,
        tension_id: id,
        payload: {
          project_id: named.project_id,
          agent: seat.agent,
          agent_name: seat.name,
          status: outcome.status,
          detail: outcome.detail,
          session_id: outcome.session_id ?? null,
          text,
        },
      })
    }
    return NextResponse.json({ steer: outcome }, { status: outcome.status === 'failed' ? 502 : 200 })
  } catch (error) {
    console.error('Error steering the chart:', error)
    return NextResponse.json({ error: 'Failed to steer the chart' }, { status: 500 })
  }
}
