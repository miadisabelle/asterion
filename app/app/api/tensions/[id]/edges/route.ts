// POST /api/tensions/[id]/edges - Create tension edge
// GET /api/tensions/[id]/edges - Get tension edges

import { NextRequest, NextResponse } from 'next/server'
import { 
  createTensionEdge,
  logEvent,
  type EdgeType
} from '@/lib/asterion'
import { sql } from '@/lib/asterion/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [edgesFrom, edgesTo] = await Promise.all([
      sql`
        SELECT te.*, t.title as to_tension_title 
        FROM asterion.tension_edges te
        JOIN asterion.tensions t ON te.to_tension_id = t.id
        WHERE te.from_tension_id = ${id}
      `,
      sql`
        SELECT te.*, t.title as from_tension_title 
        FROM asterion.tension_edges te
        JOIN asterion.tensions t ON te.from_tension_id = t.id
        WHERE te.to_tension_id = ${id}
      `,
    ])

    return NextResponse.json({ 
      edges_from: edgesFrom,
      edges_to: edgesTo 
    })
  } catch (error) {
    console.error('Error fetching tension edges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tension edges' },
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
      to_tension_id: string
      edge_type: EdgeType
      metadata?: Record<string, unknown>
    }
    
    if (!body.to_tension_id || !body.edge_type) {
      return NextResponse.json(
        { error: 'to_tension_id and edge_type are required' },
        { status: 400 }
      )
    }

    const validEdgeTypes: EdgeType[] = ['blocks', 'depends_on', 'relates_to', 'duplicates', 'supersedes']
    if (!validEdgeTypes.includes(body.edge_type)) {
      return NextResponse.json(
        { error: `Invalid edge_type. Must be one of: ${validEdgeTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const edge = await createTensionEdge(
      id,
      body.to_tension_id,
      body.edge_type,
      body.metadata
    )
    
    await logEvent({
      event_type: 'tension_edge.created',
      tension_id: id,
      payload: { 
        to_tension_id: body.to_tension_id,
        edge_type: body.edge_type
      },
    })

    return NextResponse.json({ edge }, { status: 201 })
  } catch (error) {
    console.error('Error creating tension edge:', error)
    return NextResponse.json(
      { error: 'Failed to create tension edge' },
      { status: 500 }
    )
  }
}
