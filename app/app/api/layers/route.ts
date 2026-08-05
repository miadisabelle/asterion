// GET /api/layers - List canonical layers

import { NextResponse } from 'next/server'
import { getLayers } from '@/lib/asterion'

export async function GET() {
  try {
    const layers = await getLayers()
    return NextResponse.json({ layers })
  } catch (error) {
    console.error('Error fetching layers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch layers' },
      { status: 500 }
    )
  }
}
