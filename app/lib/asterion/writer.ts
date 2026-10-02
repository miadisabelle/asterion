/**
 * Who may change Asterion.
 *
 * Every write route calls requireWriter (scripts/check-write-gates.mjs fails the
 * build when one does not). A request is a writer's when:
 *
 * - it carries `Authorization: Bearer <ASTERION_API_TOKEN_WRITER>`, for scripts; or
 * - its `asterion_session` cookie is signed with ASTERION_SESSION_SECRET and says
 *   `tier: "write"`. POST /api/session sets it after asking Miadi who a token
 *   belongs to (GET <MIADI_IDENTITY_URL>/api/identity/me): a person whose Miadi
 *   API tier is `write` may change Asterion. The writer token also signs in.
 *
 * The Miadi token itself is never stored here. Only the answer is kept, signed,
 * for SESSION_HOURS, so Miadi is asked once per sign-in and not per request.
 * When neither variable is set, nobody is a writer: the tier is closed, as
 * Miadi's MIADI_API_TOKEN_WRITER tier is closed when unset (lib/api-tokens.ts).
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

export const SESSION_COOKIE = 'asterion_session'
/** The 0.1 cookie held the raw writer token; it is cleared on sign-out and never read. */
export const LEGACY_WRITER_COOKIE = 'asterion_writer'
export const SESSION_HOURS = 12

export type Tier = 'write' | 'read' | null

export interface SessionClaims {
  sub: string
  name: string
  being: string
  role: string | null
  tier: Tier
  via: 'miadi' | 'writer-token'
  exp: number
}

export function writerToken(): string | null {
  return process.env.ASTERION_API_TOKEN_WRITER || null
}

function sessionSecret(): string | null {
  return process.env.ASTERION_SESSION_SECRET || null
}

export function miadiIdentityUrl(): string {
  return (process.env.MIADI_IDENTITY_URL || 'https://miadi.sanctuaireagentique.com').replace(/\/+$/, '')
}

export function signingInEnabled(): boolean {
  return Boolean(sessionSecret())
}

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function matchesWriterToken(candidate: string | null | undefined): boolean {
  const expected = writerToken()
  return Boolean(expected && candidate && sameText(candidate, expected))
}

const b64 = (text: string) => Buffer.from(text).toString('base64url')
const sign = (body: string, secret: string) => createHmac('sha256', secret).update(body).digest('base64url')

export function sealSession(claims: Omit<SessionClaims, 'exp'>, now = Date.now()): string | null {
  const secret = sessionSecret()
  if (!secret) return null
  const body = b64(JSON.stringify({ ...claims, exp: now + SESSION_HOURS * 3600 * 1000 }))
  return `${body}.${sign(body, secret)}`
}

function cookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const at = part.indexOf('=')
    if (at > 0 && part.slice(0, at).trim() === name) return decodeURIComponent(part.slice(at + 1).trim())
  }
  return null
}

export function readSession(request: Request, now = Date.now()): SessionClaims | null {
  const secret = sessionSecret()
  const value = cookie(request, SESSION_COOKIE)
  if (!secret || !value) return null
  const [body, mac] = value.split('.')
  if (!body || !mac || !sameText(mac, sign(body, secret))) return null
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionClaims
    return typeof claims.exp === 'number' && claims.exp > now ? claims : null
  } catch {
    return null
  }
}

/** The writer behind a request, or null. */
export function currentWriter(request: Request): { name: string; via: SessionClaims['via'] } | null {
  const header = request.headers.get('authorization') ?? ''
  if (/^Bearer\s+/i.test(header) && matchesWriterToken(header.replace(/^Bearer\s+/i, ''))) {
    return { name: 'Writer token', via: 'writer-token' }
  }
  const session = readSession(request)
  return session?.tier === 'write' ? { name: session.name, via: session.via } : null
}

export function isWriter(request: Request): boolean {
  return currentWriter(request) !== null
}

/** Call first in every write handler: `const denied = requireWriter(request); if (denied) return denied`. */
export function requireWriter(request: Request): NextResponse | null {
  if (isWriter(request)) return null
  return NextResponse.json(
    { error: 'Sign in to change Asterion: /signin', signin: '/signin' },
    { status: 401 }
  )
}

/** Ask Miadi who a token belongs to. */
export async function miadiIdentity(token: string): Promise<
  | { ok: true; claims: Omit<SessionClaims, 'exp'> }
  | { ok: false; status: number; error: string }
> {
  let res: Response
  try {
    res = await fetch(`${miadiIdentityUrl()}/api/identity/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return { ok: false, status: 502, error: 'Miadi could not be reached to check that token.' }
  }
  if (res.status === 401 || res.status === 403) return { ok: false, status: 401, error: 'Miadi does not know that token.' }
  if (!res.ok) return { ok: false, status: 502, error: `Miadi answered ${res.status}.` }
  const me = (await res.json()) as { person?: { id?: string; name?: string; being?: string; role?: string }; api_tier?: Tier }
  if (!me.person?.id) return { ok: false, status: 502, error: 'Miadi answered without a person.' }
  return {
    ok: true,
    claims: {
      sub: me.person.id,
      name: me.person.name || me.person.id,
      being: me.person.being || 'human',
      role: me.person.role ?? null,
      tier: me.api_tier ?? null,
      via: 'miadi',
    },
  }
}
