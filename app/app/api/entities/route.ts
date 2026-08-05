// GET /api/entities - List entities
// POST /api/entities - Create entity

import { NextRequest, NextResponse } from 'next/server'
import { 
  getEntities,
  createEntity,
  logEvent,
  type CreateEntityInput
} from '@/lib/asterion'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filters: {
      entity_type?: string
      layer_id?: string
      external_source?: string
    } = {}

    const entityType = searchParams.get('entity_type')
    if (entityType) filters.entity_type = entityType
    
    const layerId = searchParams.get('layer_id')
    if (layerId) filters.layer_id = layerId
    
    const externalSource = searchParams.get('external_source')
    if (externalSource) filters.external_source = externalSource

    const entities = await getEntities(filters)
    
    return NextResponse.json({ entities })
  } catch (error) {
    console.error('Error fetching entities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateEntityInput
    
    if (!body.name || !body.entity_type) {
      return NextResponse.json(
        { error: 'name and entity_type are required' },
        { status: 400 }
      )
    }

    const entity = await createEntity(body)
    
    await logEvent({
      event_type: 'entity.created',
      payload: { 
        entity_id: entity.id, 
        name: entity.name,
        entity_type: entity.entity_type 
      },
    })

    return NextResponse.json({ entity }, { status: 201 })
  } catch (error) {
    console.error('Error creating entity:', error)
    return NextResponse.json(
      { error: 'Failed to create entity' },
      { status: 500 }
    )
  }
}
