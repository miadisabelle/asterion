// POST /api/tensions/[id]/telescope - Telescope action step into full tension

import { NextRequest, NextResponse } from 'next/server'
import { 
  telescopeActionStep,
  logEvent,
  type CreateTensionInput
} from '@/lib/asterion'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tensionId } = await params
    const body = await request.json() as {
      action_step_id: string
      tension: Omit<CreateTensionInput, 'source_action_step_id' | 'parent_id'>
    }
    
    if (!body.action_step_id || !body.tension) {
      return NextResponse.json(
        { error: 'action_step_id and tension data are required' },
        { status: 400 }
      )
    }

    const tension = await telescopeActionStep(body.action_step_id, body.tension)
    
    await logEvent({
      event_type: 'tension.telescoped',
      tension_id: tension.id,
      payload: { 
        parent_tension_id: tensionId,
        source_action_step_id: body.action_step_id,
        title: tension.title
      },
    })

    return NextResponse.json({ tension }, { status: 201 })
  } catch (error) {
    console.error('Error telescoping action step:', error)
    return NextResponse.json(
      { error: 'Failed to telescope action step' },
      { status: 500 }
    )
  }
}
