/**
 * The writer tier: who may make Asterion act outside itself.
 *
 * A request is a writer's when it carries ASTERION_API_TOKEN_WRITER, either as
 * `Authorization: Bearer <token>` or in the `asterion_writer` cookie that
 * POST /api/session sets. When the variable is not set, nobody is a writer:
 * the tier is closed, as Miadi's MIADI_API_TOKEN_WRITER is (lib/api-tokens.ts).
 *
 * Today only the GitHub reach asks for it (a step that opens a sub-issue).
 * Writes that stay on the site do not, yet.
 */

import { timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

export const WRITER_COOKIE = 'asterion_writer'

export function writerToken(): string | null {
  return process.env.ASTERION_API_TOKEN_WRITER || null
}

export function matchesWriterToken(candidate: string | null | undefined): boolean {
  const expected = writerToken()
  if (!expected || !candidate) return false
  const a = Buffer.from(candidate)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function isWriter(request: NextRequest): boolean {
  const header = request.headers.get('authorization') ?? ''
  if (/^Bearer\s+/i.test(header) && matchesWriterToken(header.replace(/^Bearer\s+/i, ''))) return true
  return matchesWriterToken(request.cookies.get(WRITER_COOKIE)?.value)
}
