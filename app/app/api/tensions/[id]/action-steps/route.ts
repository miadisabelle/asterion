// POST /api/tensions/[id]/action-steps - Create action step
// GET /api/tensions/[id]/action-steps - List action steps

import { NextRequest, NextResponse } from 'next/server'
import { 
  getActionSteps,
  createActionStep,
  logEvent,
  type CreateActionStepInput
} from '@/lib/asterion'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const actionSteps = await getActionSteps(id)
    
    return NextResponse.json({ action_steps: actionSteps })
  } catch (error) {
    console.error('Error fetching action steps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch action steps' },
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
    const body = await request.json() as Omit<CreateActionStepInput, 'tension_id'>
    
    const actionStep = await createActionStep({
      ...body,
      tension_id: id,
    })
    
    await logEvent({
      event_type: 'action_step.created',
      tension_id: id,
      payload: { title: actionStep.title },
    })

    return NextResponse.json({ action_step: actionStep }, { status: 201 })
  } catch (error) {
    console.error('Error creating action step:', error)
    return NextResponse.json(
      { error: 'Failed to create action step' },
      { status: 500 }
    )
  }
}
