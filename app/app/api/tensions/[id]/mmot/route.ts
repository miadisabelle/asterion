// POST /api/tensions/[id]/mmot - Create MMOT evaluation
// GET /api/tensions/[id]/mmot - Get MMOT evaluations

import { NextRequest, NextResponse } from 'next/server'
import { 
  createMMOTEvaluation,
  getMMOTEvaluations,
  logEvent,
  type MMOTPhase
} from '@/lib/asterion'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const evaluations = await getMMOTEvaluations(id)
    
    return NextResponse.json({ evaluations })
  } catch (error) {
    console.error('Error fetching MMOT evaluations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MMOT evaluations' },
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
      phase: MMOTPhase
      acknowledge_notes?: string
      analyze_notes?: string
      chart_update?: string
      recommit_or_redirect?: string
      outcome?: string
      metadata?: Record<string, unknown>
    }
    
    const validPhases: MMOTPhase[] = ['acknowledge', 'analyze', 'update_chart', 'recommit_or_redirect']
    if (!body.phase || !validPhases.includes(body.phase)) {
      return NextResponse.json(
        { error: `Invalid phase. Must be one of: ${validPhases.join(', ')}` },
        { status: 400 }
      )
    }

    const evaluation = await createMMOTEvaluation({
      ...body,
      tension_id: id,
    })
    
    await logEvent({
      event_type: 'mmot.created',
      tension_id: id,
      payload: { phase: body.phase, outcome: body.outcome },
    })

    return NextResponse.json({ evaluation }, { status: 201 })
  } catch (error) {
    console.error('Error creating MMOT evaluation:', error)
    return NextResponse.json(
      { error: 'Failed to create MMOT evaluation' },
      { status: 500 }
    )
  }
}
