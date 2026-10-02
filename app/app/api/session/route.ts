// GET    /api/session - Who is signed in, and may they change Asterion?
// POST   /api/session - Sign in with a Miadi token (or the writer token): { token }
// DELETE /api/session - Sign out

import { NextRequest, NextResponse } from 'next/server'
import {
  LEGACY_WRITER_COOKIE,
  SESSION_COOKIE,
  SESSION_HOURS,
  currentWriter,
  matchesWriterToken,
  miadiIdentity,
  readSession,
  sealSession,
  signingInEnabled,
} from '@/lib/asterion/writer'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = readSession(request)
  const writer = currentWriter(request)
  return NextResponse.json({
    enabled: signingInEnabled(),
    signed_in: Boolean(session),
    name: session?.name ?? null,
    being: session?.being ?? null,
    via: session?.via ?? null,
    writer: Boolean(writer),
  })
}

export async function POST(request: NextRequest) {
  if (!signingInEnabled()) {
    return NextResponse.json({ error: 'Signing in is not enabled here.' }, { status: 503 })
  }
  let token: unknown
  try {
    token = ((await request.json()) as { token?: unknown })?.token
  } catch {
    token = null
  }
  if (typeof token !== 'string' || !token.trim()) {
    return NextResponse.json({ error: 'Send { token }: your Miadi token.' }, { status: 400 })
  }
  token = token.trim()

  const answer = matchesWriterToken(token as string)
    ? { ok: true as const, claims: { sub: 'writer-token', name: 'Writer token', being: 'token', role: null, tier: 'write' as const, via: 'writer-token' as const } }
    : await miadiIdentity(token as string)
  if (!answer.ok) return NextResponse.json({ error: answer.error }, { status: answer.status })

  const sealed = sealSession(answer.claims)
  if (!sealed) return NextResponse.json({ error: 'Signing in is not enabled here.' }, { status: 503 })
  const response = NextResponse.json({
    signed_in: true,
    name: answer.claims.name,
    writer: answer.claims.tier === 'write',
    ...(answer.claims.tier === 'write' ? {} : { note: 'Miadi does not give you write access, so you can read Asterion but not change it.' }),
  })
  response.cookies.set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  })
  response.cookies.delete(LEGACY_WRITER_COOKIE)
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ signed_in: false, writer: false })
  response.cookies.delete(SESSION_COOKIE)
  response.cookies.delete(LEGACY_WRITER_COOKIE)
  return response
}
