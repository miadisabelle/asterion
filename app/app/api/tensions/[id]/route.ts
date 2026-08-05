// GET /api/tensions/[id] - Get tension with relations
// PATCH /api/tensions/[id] - Update tension
// DELETE /api/tensions/[id] - Delete tension

import { NextRequest, NextResponse } from 'next/server'
import { 
  getTensionWithRelations,
  updateTension,
  deleteTension,
  validateTension,
  validatePhaseTransition,
  logEvent,
  type UpdateTensionInput
} from '@/lib/asterion'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tension = await getTensionWithRelations(id)
    
    if (!tension) {
      return NextResponse.json(
        { error: 'Tension not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ tension })
  } catch (error) {
    console.error('Error fetching tension:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tension' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as UpdateTensionInput
    
    // Get current tension for validation
    const current = await getTensionWithRelations(id)
    if (!current) {
      return NextResponse.json(
        { error: 'Tension not found' },
        { status: 404 }
      )
    }

    // Validate phase transition if changing phase
    if (body.phase && body.phase !== current.phase) {
      const phaseValidation = validatePhaseTransition(current, body.phase)
      if (!phaseValidation.valid) {
        return NextResponse.json(
          { 
            error: 'Phase transition validation failed',
            errors: phaseValidation.errors,
            warnings: phaseValidation.warnings
          },
          { status: 400 }
        )
      }
    }

    // Validate content changes
    const contentValidation = validateTension({ ...current, ...body })
    if (!contentValidation.valid) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          errors: contentValidation.errors,
          warnings: contentValidation.warnings
        },
        { status: 400 }
      )
    }

    const tension = await updateTension(id, body)
    
    // Log event
    await logEvent({
      event_type: 'tension.updated',
      tension_id: id,
      payload: { 
        changes: Object.keys(body),
        phase_changed: body.phase && body.phase !== current.phase
      },
    })

    return NextResponse.json({ 
      tension,
      warnings: contentValidation.warnings
    })
  } catch (error) {
    console.error('Error updating tension:', error)
    return NextResponse.json(
      { error: 'Failed to update tension' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tension = await getTensionWithRelations(id)
    
    if (!tension) {
      return NextResponse.json(
        { error: 'Tension not found' },
        { status: 404 }
      )
    }

    // Log before deletion
    await logEvent({
      event_type: 'tension.deleted',
      tension_id: id,
      payload: { title: tension.title },
    })

    const deleted = await deleteTension(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete tension' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tension:', error)
    return NextResponse.json(
      { error: 'Failed to delete tension' },
      { status: 500 }
    )
  }
}
