// GET /api/tensions - List tensions with filters
// POST /api/tensions - Create new tension

import { NextRequest, NextResponse } from 'next/server'
import { 
  getTensions, 
  createTension, 
  validateTension, 
  logEvent,
  type Phase,
  type TensionStatus,
  type CreateTensionInput 
} from '@/lib/asterion'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filters: {
      phase?: Phase
      status?: TensionStatus
      layer_id?: string
      parent_id?: string | null
    } = {}

    const phase = searchParams.get('phase')
    if (phase) filters.phase = phase as Phase
    
    const status = searchParams.get('status')
    if (status) filters.status = status as TensionStatus
    
    const layerId = searchParams.get('layer_id')
    if (layerId) filters.layer_id = layerId
    
    const parentId = searchParams.get('parent_id')
    if (parentId === 'null') {
      filters.parent_id = null
    } else if (parentId) {
      filters.parent_id = parentId
    }

    const tensions = await getTensions(filters)
    
    return NextResponse.json({ tensions })
  } catch (error) {
    console.error('Error fetching tensions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tensions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateTensionInput
    
    // Validate using Fritz methodology
    const validation = validateTension(body)
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          errors: validation.errors,
          warnings: validation.warnings 
        },
        { status: 400 }
      )
    }

    const tension = await createTension(body)
    
    // Log event for immutable history
    await logEvent({
      event_type: 'tension.created',
      tension_id: tension.id,
      payload: { title: tension.title, phase: tension.phase },
    })

    return NextResponse.json({ 
      tension,
      warnings: validation.warnings 
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating tension:', error)
    return NextResponse.json(
      { error: 'Failed to create tension' },
      { status: 500 }
    )
  }
}
