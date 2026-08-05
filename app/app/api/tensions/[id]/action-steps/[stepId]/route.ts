// PATCH /api/tensions/[id]/action-steps/[stepId] - Update action step status

import { NextRequest, NextResponse } from 'next/server'
import { updateActionStepStatus, logEvent } from '@/lib/asterion'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id: tensionId, stepId } = await params
    const body = await request.json() as { status: string }
    
    if (!body.status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'skipped']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const actionStep = await updateActionStepStatus(stepId, body.status as 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped')
    
    if (!actionStep) {
      return NextResponse.json(
        { error: 'Action step not found' },
        { status: 404 }
      )
    }

    await logEvent({
      event_type: 'action_step.status_changed',
      tension_id: tensionId,
      payload: { action_step_id: stepId, status: body.status },
    })

    return NextResponse.json({ action_step: actionStep })
  } catch (error) {
    console.error('Error updating action step:', error)
    return NextResponse.json(
      { error: 'Failed to update action step' },
      { status: 500 }
    )
  }
}
