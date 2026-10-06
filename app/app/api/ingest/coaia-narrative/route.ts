// POST /api/ingest/coaia-narrative — a writer posts what it just wrote.
//
// The door for coaia-narrative memories: the MCP server (or anything holding the
// token) sends one project's whole memory file after each save, and Asterion
// projects it with the same mapper the registry sync uses
// (lib/asterion/coaia-projection.mjs). Sending the same file twice writes nothing.
//
//   Authorization: Bearer <the token of the host posting>
//   { "project": "<key>", "jsonl": "<the whole file>" }      or
//   { "project": "<key>", "records": [ …every record of the file… ] }
//   optional: "file" (the file's name), "actor" (who is writing)
//
// Only a project registered with no files is fed through this door: one memory
// file, one writer, posted whole. A project with registered files is fed by the
// registry sync alone, so the two transports never write the same project.
// Registering is scripts/coaia-sync.mjs register <key> --writer.
//
// One token per host (ASTERION_INGEST_TOKENS, lib/asterion/ingest-tokens.mjs):
// the token names the host, the host is what the event log records, and removing
// one pair cuts that machine off without touching the others.

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/asterion/db'
import { invalidateCache } from '@/lib/asterion/redis'
import {
  CACHE_PATTERNS,
  KEY_PATTERN,
  applyProjection,
  getRegisteredProject,
  parseJsonl,
  planProjection,
  registeredFiles,
  sourceFor,
} from '@/lib/asterion/coaia-projection.mjs'
import { actorFor, hostForToken, parseIngestTokens } from '@/lib/asterion/ingest-tokens.mjs'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 16 * 1024 * 1024

export async function POST(request: NextRequest) {
  const { accepted } = parseIngestTokens(process.env)
  if (!accepted.length) {
    return NextResponse.json({ error: 'Ingest is not enabled here.' }, { status: 503 })
  }
  const host = hostForToken(request.headers.get('authorization'), accepted)
  if (!host) {
    return NextResponse.json({ error: "Send Authorization: Bearer <this host's ingest token>." }, { status: 401 })
  }
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_BYTES) {
    return NextResponse.json({ error: `The body is larger than ${MAX_BYTES} bytes.` }, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = null
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'The body must be a JSON object: { project, jsonl } or { project, records }.' }, { status: 400 })
  }
  const input = body as { project?: unknown; records?: unknown; jsonl?: unknown; file?: unknown; actor?: unknown }

  const key = typeof input.project === 'string' ? input.project.trim() : ''
  if (!KEY_PATTERN.test(key)) {
    return NextResponse.json({ error: `"project" must be a registered key matching ${KEY_PATTERN}.` }, { status: 400 })
  }

  let records: object[]
  let parseErrors = 0
  if (Array.isArray(input.records)) {
    records = input.records.filter((r): r is object => typeof r === 'object' && r !== null)
  } else if (typeof input.jsonl === 'string') {
    const parsed = parseJsonl(input.jsonl)
    records = parsed.records
    parseErrors = parsed.errors.length
  } else {
    return NextResponse.json({ error: 'Send the file as "jsonl" (its text) or "records" (an array).' }, { status: 400 })
  }

  try {
    const project = await getRegisteredProject(sql, key)
    if (!project) {
      return NextResponse.json(
        { error: `Project "${key}" is not registered. Register it with scripts/coaia-sync.mjs register ${key} --name "…" --writer.` },
        { status: 404 }
      )
    }
    if (registeredFiles(project).length) {
      return NextResponse.json(
        { error: `Project "${key}" is fed by its registered files through the registry sync. Commit and push the file; the sync carries it.` },
        { status: 409 }
      )
    }
    const file = typeof input.file === 'string' ? input.file.slice(0, 200) : null
    const actor = actorFor(host, typeof input.actor === 'string' ? input.actor : null)
    const plan = planProjection(records, { file })
    const result = await applyProjection(sql, plan, { project, actor })
    if (!result.unchanged) {
      await Promise.all(CACHE_PATTERNS.map((p: string) => invalidateCache(p).catch(() => undefined)))
    }

    return NextResponse.json({
      ok: true,
      project: { key, name: project.name, id: project.id },
      host,
      actor: actor.id,
      external_source: sourceFor(key),
      unchanged: result.unchanged,
      counts: plan.counts,
      changed: result.changes.map((c: { chartId: string; change: string }) => ({ chartId: c.chartId, change: c.change })),
      no_longer_in_file: result.orphans,
      relations_unresolved: result.relations_unresolved,
      parse_errors: parseErrors,
    })
  } catch (error) {
    console.error('coaia-narrative ingest failed:', error)
    return NextResponse.json(
      { error: 'The projection stopped partway. Send the same file again: rows are keyed, so a second send completes it without duplicating.' },
      { status: 500 }
    )
  }
}
