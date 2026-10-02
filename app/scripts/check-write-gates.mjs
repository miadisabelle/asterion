#!/usr/bin/env node
// Every route that changes Asterion asks requireWriter first (lib/asterion/writer.ts).
// This runs before `next build` (vercel.json), so a new write route without the gate
// fails the deploy instead of reaching the public site open.
//
//   node scripts/check-write-gates.mjs        exit 0 gated, 1 a write handler is open

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const API = join(ROOT, 'app', 'api')

// These guard themselves: ingest with its own Bearer token, session is the sign-in.
const OWN_GATE = new Set(['app/api/ingest/coaia-narrative/route.ts', 'app/api/session/route.ts'])

function routes(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return routes(path)
    return name === 'route.ts' ? [path] : []
  })
}

const open = []
let gated = 0
for (const file of routes(API)) {
  const rel = relative(ROOT, file).split('\\').join('/')
  if (OWN_GATE.has(rel)) continue
  const text = readFileSync(file, 'utf8')
  const heads = [...text.matchAll(/export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)\s*\(/g)]
  const arrows = [...text.matchAll(/export\s+const\s+(POST|PUT|PATCH|DELETE)\s*=/g)]
  for (const m of arrows) open.push(`${rel}: ${m[1]} is an exported const; write it as a function that calls requireWriter`)
  heads.forEach((m, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length
    const body = text.slice(m.index, end)
    // The gate must come before any other statement in the handler body.
    const first = body.slice(body.indexOf('{', body.indexOf(')')) + 1).trim().split('\n')[0]
    if (/^const denied = requireWriter\(\w+\)$/.test(first.trim())) gated += 1
    else open.push(`${rel}: ${m[1]} does not start with requireWriter`)
  })
}

if (open.length) {
  console.error(`check-write-gates: ${open.length} write handler(s) open:\n  ${open.join('\n  ')}`)
  process.exit(1)
}
console.log(`check-write-gates: ${gated} write handlers, all start with requireWriter`)
