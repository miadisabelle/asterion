#!/usr/bin/env node
// Project one coaia-narrative JSONL memory into Asterion, by hand.
//
//   node scripts/import-coaia-jsonl.mjs <file.jsonl> --project <key>            report what would be written
//   node scripts/import-coaia-jsonl.mjs <file.jsonl> --project <key> --apply    write it
//     --name "<project name>"   the project's display name when it is created here (default: the key)
//     --label <key>             older spelling of --project
//
// This is the manual form of the door: it feeds a project that has no
// registered files, creating it if it is new. A project with registered files
// is fed by scripts/coaia-sync.mjs alone, and this script refuses it. All three
// ways in use lib/asterion/coaia-projection.mjs.
//
// coaia-narrative JSONL stays the record. Nothing here writes back to it.

import { readFileSync, existsSync } from 'node:fs'
import { basename } from 'node:path'
import { connect, hostOf, invalidateCaches } from './lib/connect.mjs'
import {
  CACHE_PATTERNS, KEY_PATTERN, applyProjection, getRegisteredProject, parseJsonl, planProjection, registeredFiles, sourceFor, upsertProject,
} from '../lib/asterion/coaia-projection.mjs'

const argv = process.argv.slice(2)
const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null)
const valueFlags = ['--project', '--label', '--name']
const file = argv.find((a, i) => !a.startsWith('--') && !valueFlags.includes(argv[i - 1]))
const key = flag('--project') ?? flag('--label') ?? (file ? basename(file).replace(/(\.coaia-narrative)?\.jsonl$/, '') : null)
const APPLY = argv.includes('--apply')

if (!file || !existsSync(file) || !key) {
  console.error('usage: node scripts/import-coaia-jsonl.mjs <file.jsonl> --project <key> [--name "<name>"] [--apply]')
  process.exit(1)
}
if (!KEY_PATTERN.test(key)) {
  console.error(`project key must match ${KEY_PATTERN}: ${key}`)
  process.exit(1)
}

const { records, errors } = parseJsonl(readFileSync(file, 'utf8'))
const plan = planProjection(records, { file: basename(file) })

console.log(`source   ${file}`)
console.log(`key      ${sourceFor(key)}\n`)
for (const [k, v] of Object.entries(plan.counts)) console.log(`  ${k.padEnd(18)} ${v}`)
if (errors.length) console.log(`\n  ${errors.length} line(s) did not parse: ${errors.slice(0, 5).map((e) => e.line).join(', ')}`)
console.log('')
for (const c of plan.charts) {
  const gh = c.github.number ? `  ${c.github.owner}/${c.github.repo}#${c.github.number}` : ''
  console.log(`  ${c.chartId.padEnd(46)} ${String(c.phase).padEnd(12)} ${String(c.steps.length).padStart(2)} steps  ${String(c.beats.length).padStart(2)} beats  ${c.progress}%${gh}`)
}
for (const t of plan.threads) console.log(`  thread: ${t.name} (${t.members.length} chart(s))`)

if (!APPLY) {
  console.log('\ndry run — nothing written. Re-run with --apply to write it.')
  process.exit(0)
}

const sql = await connect()
console.log(`\nwriting → ${hostOf(process.env.DATABASE_URL)}\n`)

// Creates the project if it is new; refuses one that the registry sync feeds.
const existing = await getRegisteredProject(sql, key)
if (existing && registeredFiles(existing).length) {
  console.error(`${key} is fed by its registered files. Run: node scripts/coaia-sync.mjs sync ${key}`)
  process.exit(1)
}
const project = existing ?? (await upsertProject(sql, { key, name: flag('--name') ?? key, files: [] }))
const result = await applyProjection(sql, plan, {
  project,
  actor: { type: 'importer', id: 'scripts/import-coaia-jsonl.mjs' },
  force: argv.includes('--force'),
})
const cache = result.unchanged ? { dropped: 0 } : await invalidateCaches(CACHE_PATTERNS)

console.log(`  project             ${project.name} (${project.id})`)
if (result.unchanged) {
  console.log('  nothing to write: this is the file last projected for the project')
  process.exit(0)
}
for (const k of ['tensions', 'action_steps', 'narrative_beats', 'narrative_threads', 'entities']) console.log(`  ${k.padEnd(19)} ${result[k]}`)
console.log(`  relations           ${result.relations_written}${result.relations_unresolved ? ` (${result.relations_unresolved} unresolved)` : ''}`)
console.log(`  charts changed      ${result.changed}`)
if (result.orphans) console.log(`  no longer in file   ${result.orphans} chart(s), kept as they are`)
console.log(`  caches dropped      ${cache.dropped}${cache.error ? ` (${cache.error})` : ''}\n`)
console.log('done — coaia-narrative JSONL remains the record; this is its projection.')
