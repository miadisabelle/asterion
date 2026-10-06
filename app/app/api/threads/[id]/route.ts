// GET /api/threads/[id] - One narrative thread and the beats it holds
//
// A ceremony thread (miadisabelle/asterion#11) holds the turns spoken in it.
// Its people speak, witness and close in Miadi, so the answer carries the
// ceremony's Miadi address when the thread came from the wheel.

import { NextRequest, NextResponse } from 'next/server'
import { getNarrativeThread, getThreadBeats } from '@/lib/asterion'
import { viewerOf } from '@/lib/asterion/visibility'
import { miadiIdentityUrl } from '@/lib/asterion/writer'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const viewer = viewerOf(request)
    const thread = UUID.test(id) ? await getNarrativeThread(id, viewer) : null

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      )
    }

    const beats = await getThreadBeats(id, viewer)
    const path = thread.metadata?.miadi_path
    const miadi_url = typeof path === 'string' && path.startsWith('/') ? `${miadiIdentityUrl()}${path}` : null

    return NextResponse.json({ thread, beats, miadi_url })
  } catch (error) {
    console.error('Error fetching narrative thread:', error)
    return NextResponse.json(
      { error: 'Failed to fetch narrative thread' },
      { status: 500 }
    )
  }
}
