// GET /api/events - List events
// POST /api/events - Log event

import { NextRequest, NextResponse } from 'next/server'
import { 
  getEvents,
  logEvent,
  type LogEventInput
} from '@/lib/asterion'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filters: {
      tension_id?: string
      event_type?: string
      limit?: number
      offset?: number
    } = {}

    const tensionId = searchParams.get('tension_id')
    if (tensionId) filters.tension_id = tensionId
    
    const eventType = searchParams.get('event_type')
    if (eventType) filters.event_type = eventType
    
    const limit = searchParams.get('limit')
    if (limit) filters.limit = parseInt(limit, 10)
    
    const offset = searchParams.get('offset')
    if (offset) filters.offset = parseInt(offset, 10)

    const events = await getEvents(filters)
    
    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as LogEventInput
    
    if (!body.event_type) {
      return NextResponse.json(
        { error: 'event_type is required' },
        { status: 400 }
      )
    }

    const event = await logEvent(body)

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('Error logging event:', error)
    return NextResponse.json(
      { error: 'Failed to log event' },
      { status: 500 }
    )
  }
}
