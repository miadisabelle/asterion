#!/usr/bin/env node
// The registry: which coaia-narrative memories Asterion keeps current, by project.
//
//   node scripts/coaia-sync.mjs register <key> --name "<name>" --git <checkout> --path <path> [--remote origin] [--ref origin/main]
//   node scripts/coaia-sync.mjs register <key> --name "<name>" --file <absolute path>
//   node scripts/coaia-sync.mjs register <key> --name "<name>" --writer
//   node scripts/coaia-sync.mjs list
//   node scripts/coaia-sync.mjs sync [<key>] [--force] [--dry-run] [--archive-orphans]
//
// A project is one asterion.projects row, fed by exactly one transport:
//   - registered files (--git, --file; registering again adds a file, or updates
//     the one with the same path): this sync reads all of them together;
//   - --writer: no files; its writer posts the whole memory file to
//     POST /api/ingest/coaia-narrative, and this sync leaves it alone.
// A project that is not registered is never read and the door refuses it, which
// is how what reaches the public site stays a decision.
//
// sync reads a git file from a remote-tracking ref after fetching that remote,
// never through a working tree (a checkout like the chronicle is shared by
// several seats), and a plain file from disk. A project whose files have not
// changed is skipped; one that cannot be read whole is skipped and reported.
// Nothing is deleted: --archive-orphans marks charts the files no longer carry
// as archived, and a later pass restores them if they come back.

import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { connect, hostOf, invalidateCaches } from './lib/connect.mjs'
import {
  CACHE_PATTERNS, KEY_PATTERN, MAPPER_VERSION, applyProjection, checkSourceFile, getRegisteredProject, hashText,
  listRegisteredProjects, parseJsonl, planProjection, recordFileSync, registeredFiles, sameFile, sourceFor, upsertProject,
} from '../lib/asterion/coaia-projection.mjs'

const [cmd, ...argv] = process.argv.slice(2)
const VALUE_FLAGS = ['--name', '--description', '--git', '--path', '--ref', '--remote', '--file']
const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null)
const has = (name) => argv.includes(name)
const positional = argv.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]))
const actor = { type: 'scheduler', id: 'scripts/coaia-sync.mjs' }
const firstLine = (err) => (err?.stderr?.toString?.() || err?.message || String(err)).trim().split('\n')[0]

function describe(f) {
  return f.kind === 'git' ? `git ${f.repo} @ ${f.ref} : ${f.path}` : `file ${f.path}`
}

/** Read one registered file without touching any working tree. */
function readSource(f, fetched) {
  const problem = checkSourceFile(f)
  if (problem) throw new Error(`the registration is invalid: ${problem}`)
  if (f.kind === 'git') {
    const remote = f.remote ?? 'origin' // registrations made before remote was recorded
    const id = `${f.repo}\n${remote}`
    if (!fetched.has(id)) {
      execFileSync('git', ['-C', f.repo, 'fetch', '-q', '--', remote], { stdio: ['ignore', 'ignore', 'pipe'] })
      fetched.add(id)
    }
    return execFileSync('git', ['-C', f.repo, 'show', `${f.ref}:${f.path}`], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  }
  return readFileSync(f.path, 'utf8')
}

async function register(sql) {
  const key = positional
  if (!key || !KEY_PATTERN.test(key)) {
    console.error(`register needs a key matching ${KEY_PATTERN}`)
    process.exit(1)
  }
  const existing = await getRegisteredProject(sql, key)
  let files = [...registeredFiles(existing)]
  if (has('--writer')) {
    files = []
  } else if (flag('--git') || flag('--file')) {
    const remote = flag('--remote') ?? 'origin'
    const file = flag('--git')
      ? { kind: 'git', repo: flag('--git'), remote, ref: flag('--ref') ?? `${remote}/main`, path: flag('--path') }
      : { kind: 'file', path: flag('--file') }
    const problem = checkSourceFile(file)
    if (problem) { console.error(`cannot register: ${problem}`); process.exit(1) }
    if (!existsSync(file.kind === 'git' ? file.repo : file.path)) { console.error(`nothing at ${file.kind === 'git' ? file.repo : file.path}`); process.exit(1) }
    const i = files.findIndex((f) => sameFile(f, file))
    if (i >= 0) files[i] = { ...files[i], ...file }
    else files.push(file)
  } else if (!existing) {
    console.error('a new project needs --git … --path …, --file …, or --writer')
    process.exit(1)
  }
  const project = await upsertProject(sql, {
    key,
    name: flag('--name') ?? existing?.name ?? key,
    description: flag('--description') ?? existing?.description ?? null,
    files,
  })
  console.log(`registered ${project.name} as ${sourceFor(key)}`)
  const now = registeredFiles(project)
  for (const f of now) console.log(`  ${describe(f)}`)
  if (!now.length) console.log('  fed by its writer through POST /api/ingest/coaia-narrative')
}

async function list(sql) {
  const projects = await listRegisteredProjects(sql)
  if (!projects.length) { console.log('no registered projects'); return }
  for (const p of projects) {
    const projected = p.metadata?.source?.projectedAt ? `projected ${p.metadata.source.projectedAt}` : 'never projected'
    console.log(`${p.external_id.padEnd(16)} ${p.name}  (${p.tension_count} tension(s), ${projected})`)
    const files = registeredFiles(p)
    if (!files.length) console.log('  fed by its writer through the door')
    for (const f of files) {
      console.log(`  ${describe(f)}  — ${f.syncedAt ? `synced ${f.syncedAt}` : 'never synced'}${f.error ? `  — ERROR ${f.error}` : ''}`)
    }
  }
}

async function syncProject(sql, project, fetched) {
  const key = project.external_id
  const files = registeredFiles(project)
  if (!files.length) return { key, skipped: 'fed by its writer' }

  const read = []
  for (const f of files) {
    try {
      const content = readSource(f, fetched)
      read.push({ f, content, sha: hashText(content) })
    } catch (err) {
      const message = firstLine(err)
      if (!has('--dry-run')) await recordFileSync(sql, project.id, f, { error: message, checkedAt: new Date().toISOString() })
      throw new Error(`cannot read ${describe(f)} — ${message}`)
    }
  }

  // A file counts as changed when its bytes moved, or when the mapper did since it was last read.
  const changed = read.some((r) => {
    const seenBefore = files.find((f) => sameFile(f, r.f))
    return r.sha !== seenBefore?.sha || seenBefore?.mapper !== MAPPER_VERSION
  })
  if (!changed && !has('--force') && !has('--archive-orphans')) return { key, skipped: 'unchanged' }

  const records = []
  const seen = new Map()
  const duplicates = new Set()
  let parseErrors = 0
  for (const [i, r] of read.entries()) {
    const { records: rs, errors } = parseJsonl(r.content)
    parseErrors += errors.length
    for (const rec of rs) {
      if (typeof rec.name === 'string' && rec.type !== 'relation') {
        if (seen.has(rec.name) && seen.get(rec.name) !== i) duplicates.add(rec.name)
        seen.set(rec.name, i)
      }
      records.push(rec)
    }
  }
  const plan = planProjection(records, { file: read.map((r) => r.f.path.split('/').pop()).join(', ') })
  const notes = []
  if (parseErrors) notes.push(`${parseErrors} line(s) did not parse and were skipped`)
  if (duplicates.size) notes.push(`${duplicates.size} name(s) appear in more than one file, the last file wins: ${[...duplicates].slice(0, 5).join(', ')}`)
  if (has('--dry-run')) return { key, plan, notes, dryRun: true }

  // Archive only from a clean read: a line that did not parse may be a chart that still exists.
  const archive = has('--archive-orphans') && parseErrors === 0 && plan.counts.tensions > 0
  if (has('--archive-orphans') && !archive) notes.push('not archiving: the files did not read cleanly')
  const result = await applyProjection(sql, plan, { project, actor, whole: true, archiveOrphans: archive, force: has('--force') })
  const syncedAt = new Date().toISOString()
  for (const r of read) await recordFileSync(sql, project.id, r.f, { sha: r.sha, mapper: MAPPER_VERSION, syncedAt, error: null, parseErrors })
  return { key, plan, notes, result }
}

async function sync(sql) {
  const only = positional
  const projects = (await listRegisteredProjects(sql)).filter((p) => !only || p.external_id === only)
  if (only && !projects.length) { console.error(`no registered project ${only}`); process.exit(1) }
  const fetched = new Set()
  let wrote = 0
  let failed = 0
  for (const project of projects) {
    try {
      const { key, skipped, plan, notes = [], result, dryRun } = await syncProject(sql, project, fetched)
      for (const n of notes) console.log(`${key}: ${n}`)
      if (skipped) { console.log(`${key}: ${skipped}`); continue }
      const line = `${key}: ${plan.counts.tensions} chart(s), ${plan.counts.action_steps} step(s), ${plan.counts.narrative_beats} beat(s)`
      if (dryRun) { console.log(`${line}  (dry run)`); continue }
      if (result.unchanged) { console.log(`${line} — nothing to write`); continue }
      wrote++
      const orphans = result.orphans ? `, ${result.orphans} no longer in the files${result.archived ? ` (${result.archived} archived)` : ' (kept)'}` : ''
      console.log(`${line} — ${result.changed} changed${orphans}`)
    } catch (err) {
      failed++
      console.log(`${project.external_id}: FAILED — ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  if (wrote) {
    const cache = await invalidateCaches(CACHE_PATTERNS)
    if (cache.error) console.log(`caches not dropped: ${cache.error}`)
  }
  if (failed) process.exitCode = 2
}

if (!['register', 'list', 'sync'].includes(cmd)) {
  console.error('usage: node scripts/coaia-sync.mjs <register|list|sync> …  (see the header of this file)')
  process.exit(1)
}
const sql = await connect()
if (cmd !== 'list') console.log(`asterion → ${hostOf(process.env.DATABASE_URL)}\n`)
await { register, list, sync }[cmd](sql)
