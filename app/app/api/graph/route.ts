// GET /api/graph - Get tension dependency graph

import { NextRequest, NextResponse } from 'next/server'
import { getTensionGraph } from '@/lib/asterion'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rootId = searchParams.get('root_id') || undefined

    const graph = await getTensionGraph(rootId)
    
    return NextResponse.json({ 
      nodes: graph.nodes,
      edges: graph.edges,
      meta: {
        node_count: graph.nodes.length,
        edge_count: graph.edges.length,
      }
    })
  } catch (error) {
    console.error('Error fetching tension graph:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tension graph' },
      { status: 500 }
    )
  }
}
