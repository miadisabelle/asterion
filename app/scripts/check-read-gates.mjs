#!/usr/bin/env node
// Every route that reads Asterion's charts asks who is reading (viewerOf in
// lib/asterion/visibility.ts), so a private project reaches signed-in writers only.
// This runs before `next build` (vercel.json) with check-write-gates.mjs, so a new
// read route that never asks fails the deploy instead of showing private charts.
//
//   node scripts/check-read-gates.mjs        exit 0 every GET asks, 1 one does not

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const API = join(ROOT, 'app', 'api')

// These read nothing a project owns: the sign-in, the docs pages, the layer list.
const NO_PROJECT_DATA = [/^app\/api\/session\//, /^app\/api\/docs\//, /^app\/api\/layers\//, /^app\/api\/ingest\//]

function routes(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return routes(path)
    return name === 'route.ts' ? [path] : []
  })
}

const open = []
let asking = 0
for (const file of routes(API)) {
  const rel = relative(ROOT, file).split('\\').join('/')
  if (NO_PROJECT_DATA.some((re) => re.test(rel))) continue
  const text = readFileSync(file, 'utf8')
  if (/export\s+const\s+GET\s*=/.test(text)) { open.push(`${rel}: GET is an exported const; write it as a function that calls viewerOf(request)`); continue }
  const heads = [...text.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)]
  heads.forEach((m, i) => {
    if (m[1] !== 'GET') return
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length
    if (/viewerOf\(request\)/.test(text.slice(m.index, end))) asking += 1
    else open.push(`${rel}: GET never asks viewerOf(request)`)
  })
}

if (open.length) {
  console.error(`check-read-gates: ${open.length} read handler(s) do not ask who is reading:\n  ${open.join('\n  ')}`)
  process.exit(1)
}
console.log(`check-read-gates: ${asking} read handlers, all ask who is reading`)
