// GET /api/threads - List narrative threads
// POST /api/threads - Create narrative thread

import { NextRequest, NextResponse } from 'next/server'
import { 
  getNarrativeThreads,
  createNarrativeThread,
  logEvent
} from '@/lib/asterion'

export async function GET() {
  try {
    const threads = await getNarrativeThreads()
    return NextResponse.json({ threads })
  } catch (error) {
    console.error('Error fetching narrative threads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch narrative threads' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      name: string
      thread_type?: string
      description?: string
      metadata?: Record<string, unknown>
    }
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    const thread = await createNarrativeThread(
      body.name,
      body.thread_type,
      body.description,
      body.metadata
    )
    
    await logEvent({
      event_type: 'thread.created',
      payload: { 
        thread_id: thread.id, 
        name: thread.name,
        thread_type: thread.thread_type 
      },
    })

    return NextResponse.json({ thread }, { status: 201 })
  } catch (error) {
    console.error('Error creating narrative thread:', error)
    return NextResponse.json(
      { error: 'Failed to create narrative thread' },
      { status: 500 }
    )
  }
}
