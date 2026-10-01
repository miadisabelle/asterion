// GET    /api/session - Is this browser signed in as a writer?
// POST   /api/session - Sign in as a writer: { token }
// DELETE /api/session - Sign out

import { NextRequest, NextResponse } from 'next/server'
import { WRITER_COOKIE, isWriter, matchesWriterToken, writerToken } from '@/lib/asterion/writer'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return NextResponse.json({ writer: isWriter(request), enabled: Boolean(writerToken()) })
}

export async function POST(request: NextRequest) {
  if (!writerToken()) {
    return NextResponse.json({ error: 'Signing in is not enabled here.' }, { status: 503 })
  }
  let token: unknown
  try {
    token = ((await request.json()) as { token?: unknown })?.token
  } catch {
    token = null
  }
  if (typeof token !== 'string' || !matchesWriterToken(token.trim())) {
    return NextResponse.json({ error: 'That token is not the writer token.' }, { status: 401 })
  }
  const response = NextResponse.json({ writer: true })
  response.cookies.set(WRITER_COOKIE, token.trim(), {
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ writer: false })
  response.cookies.delete(WRITER_COOKIE)
  return response
}
