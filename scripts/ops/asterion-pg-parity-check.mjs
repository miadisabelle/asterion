#!/usr/bin/env node
// asterion-pg-parity-check.mjs — is asterion-postgres the same as Neon, and does an Asterion on it answer the same?
//
//   node scripts/ops/asterion-pg-parity-check.mjs [--from-env <file>] [--live <url>] [--preview <url>]
//
// 1. Row counts of the 18 tables of schema `asterion`: Neon (DATABASE_URL in --from-env, default
//    app/.env.local) against the local store (through asterion-postgres-http, password from docker/.env).
// 2. /api/threads and /api/tensions from the live Asterion (--live, default http://127.0.0.1:3336) against an
//    Asterion running on the local store (--preview, default http://127.0.0.1:3346), as a writer
//    (ASTERION_API_TOKEN_WRITER from the same env file), compared by the set of ids.
//
// Exit 0 when every count and both id sets match; 1 on a difference; 3 when Neon or the live instance
// cannot be read, which is not parity. Never prints a URL, password or token.

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const args = process.argv.slice(2)
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback }
const ENV_FILE = opt('--from-env', join(ROOT, 'app', '.env.local'))
const LIVE = opt('--live', 'http://127.0.0.1:3336')
const PREVIEW = opt('--preview', 'http://127.0.0.1:3346')
const GATEWAY = process.env.ASTERION_PG_HTTP || 'http://127.0.0.1:5435/sql'

function readEnv(file) {
  const out = {}
  if (!existsSync(file)) return out
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*['"]?(.*?)['"]?\s*$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}
const env = readEnv(ENV_FILE)
const dockerEnv = readEnv(join(ROOT, 'docker', '.env'))
const neonUrl = env.DATABASE_URL && /neon\.tech/.test(env.DATABASE_URL) ? env.DATABASE_URL : null
if (!dockerEnv.ASTERION_PG_PASSWORD) { console.error('docker/.env has no ASTERION_PG_PASSWORD'); process.exit(1) }
const LOCAL_HOST = 'asterion-postgres.local'
const localUrl = `postgres://asterion:${encodeURIComponent(dockerEnv.ASTERION_PG_PASSWORD)}@${LOCAL_HOST}/asterion`

// One driver, two endpoints: the local host goes to the gateway, any other to Neon as the driver would.
const require = createRequire(join(ROOT, 'app', 'package.json'))
const { neon, neonConfig } = require('@neondatabase/serverless')
neonConfig.fetchEndpoint = (host) => host === LOCAL_HOST ? GATEWAY : `https://${host.replace(/^[^.]+\./, 'api.')}/sql`

const TABLES = ['action_steps', 'doc_links', 'doc_pages', 'doc_revisions', 'doc_sections', 'entities', 'events',
  'layers', 'mmot_evaluations', 'narrative_beats', 'narrative_threads', 'observations', 'project_tensions',
  'projects', 'relations', 'tension_edges', 'tensions', 'thread_tensions']

async function counts(url) {
  const sql = neon(url)
  const out = {}
  for (const t of TABLES) out[t] = Number((await sql.query(`SELECT count(*)::int AS n FROM asterion.${t}`))[0].n)
  return out
}
const short = (e) => String(e?.message ?? e).replace(/postgres(ql)?:\/\/\S+/g, '<url>').slice(0, 140)

let unreadable = false, different = false
console.log('== row counts: Neon | local')
let neonCounts = null, localCounts = null
try { localCounts = await counts(localUrl) } catch (e) { console.log(`local store unreadable: ${short(e)}`); process.exit(1) }
if (!neonUrl) { console.log(`Neon: no Neon DATABASE_URL in ${ENV_FILE}`); unreadable = true }
else { try { neonCounts = await counts(neonUrl) } catch (e) { console.log(`Neon unreadable: ${short(e)}`); unreadable = true } }
for (const t of TABLES) {
  const n = neonCounts ? neonCounts[t] : '—', l = localCounts[t]
  const mark = neonCounts ? (n === l ? 'same' : 'DIFFERENT') : ''
  if (neonCounts && n !== l) different = true
  console.log(`  ${t.padEnd(20)} ${String(n).padStart(6)} | ${String(l).padStart(6)}  ${mark}`)
}

async function ids(base, path, key) {
  const headers = env.ASTERION_API_TOKEN_WRITER ? { authorization: `Bearer ${env.ASTERION_API_TOKEN_WRITER}` } : {}
  const res = await fetch(base + path, { headers, signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = await res.json()
  const list = Array.isArray(body) ? body : body[key] ?? []
  return new Set(list.map((x) => x.id))
}
console.log('== API, as a writer: live | preview')
for (const [path, key] of [['/api/threads', 'threads'], ['/api/tensions', 'tensions']]) {
  let live = null, preview = null
  try { preview = await ids(PREVIEW, path, key) } catch (e) { console.log(`  ${path}: preview unreadable (${short(e)})`); different = true; continue }
  try { live = await ids(LIVE, path, key) } catch (e) { console.log(`  ${path}: live unreadable (${short(e)}); preview answers ${preview.size}`); unreadable = true; continue }
  const onlyLive = [...live].filter((x) => !preview.has(x)).length, onlyPreview = [...preview].filter((x) => !live.has(x)).length
  if (onlyLive || onlyPreview) different = true
  console.log(`  ${path}: ${live.size} | ${preview.size}  ${onlyLive || onlyPreview ? `DIFFERENT (${onlyLive} only live, ${onlyPreview} only preview)` : 'same'}`)
}

const verdict = different ? 'DIFFERENT' : unreadable ? 'NOT PROVEN: a side cannot be read' : 'PARITY'
console.log(`== ${verdict}`)
process.exit(different ? 1 : unreadable ? 3 : 0)
