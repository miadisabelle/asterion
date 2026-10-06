// One ingest token per host.
//
// The door (app/api/ingest/coaia-narrative) accepts a token that names the host
// presenting it, so a single machine can be cut off without touching the others
// and the event log says which host each arrival came from. Decided 2026-10-06
// (Q1 of the bridge proposal).
//
//   ASTERION_INGEST_TOKENS="gaia=<token> ilex=<token>"   one per host, comma or whitespace separated
//   ASTERION_INGEST_TOKEN="<token>"                      the earlier single token, host "unnamed"
//
// Both names are read, so a host configured before this existed keeps working
// and is reported as `unnamed` until it is given its own entry. Revoking a host
// is removing its pair and restarting the service.
//
// Plain ESM with no path aliases, like coaia-projection.mjs, so a script can
// read the same rules the route enforces.

import { createHash, timingSafeEqual } from 'node:crypto'

export const HOST_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/
export const UNNAMED_HOST = 'unnamed'

const digest = (value) => createHash('sha256').update(String(value)).digest()

/**
 * The tokens this instance accepts, as [{ host, token }].
 * Malformed entries are skipped rather than failing the door for every host;
 * `skipped` counts them so a caller can report the configuration is partly wrong.
 * @param {Record<string, string | undefined>} env
 */
export function parseIngestTokens(env = process.env) {
  const accepted = []
  let skipped = 0
  for (const entry of String(env.ASTERION_INGEST_TOKENS ?? '').split(/[\s,]+/)) {
    if (!entry) continue
    const at = entry.indexOf('=')
    const host = at > 0 ? entry.slice(0, at).toLowerCase() : ''
    const token = at > 0 ? entry.slice(at + 1) : ''
    if (!HOST_PATTERN.test(host) || !token) {
      skipped += 1
      continue
    }
    accepted.push({ host, token })
  }
  const single = env.ASTERION_INGEST_TOKEN
  if (single && !accepted.some((t) => t.token === single)) {
    accepted.push({ host: UNNAMED_HOST, token: single })
  }
  return { accepted, skipped }
}

/**
 * The host whose token this is, or null. Every entry is compared, on digests of
 * equal length, so neither the number of hosts nor a token's length is timed.
 * @param {string | null} header the Authorization header as sent
 * @param {{ host: string, token: string }[]} accepted
 */
export function hostForToken(header, accepted) {
  if (!header || !/^Bearer\s+/i.test(header)) return null
  const presented = digest(header.replace(/^Bearer\s+/i, '').trim())
  let found = null
  for (const { host, token } of accepted) {
    if (timingSafeEqual(presented, digest(token)) && !found) found = host
  }
  return found
}

/**
 * What the event log records for an arrival: the host alone, or the host and the
 * writer that named itself, so "which host stopped posting" stays answerable.
 */
export function actorFor(host, actor) {
  const named = typeof actor === 'string' ? actor.trim().slice(0, 120) : ''
  return { type: 'writer', id: named ? `${host}/${named}` : host }
}
