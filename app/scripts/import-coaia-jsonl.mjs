#!/usr/bin/env node
// Project a coaia-narrative JSONL memory into Asterion.
//
//   node scripts/import-coaia-jsonl.mjs <file.jsonl>            report what would be written
//   node scripts/import-coaia-jsonl.mjs <file.jsonl> --apply    write it
//   --label <name>   the source label recorded on every row (default: the file's basename)
//
// coaia-narrative JSONL stays the record. Asterion holds a projection of it:
// every row carries external_source/external_id, so a second run updates the
// same rows instead of minting new ones. Nothing here writes back.
//
// The mapping, as the 2026-05-17 checkpoint named it:
//   structural_tension_chart → asterion.tensions      (+ github_* from metadata.github)
//   action_step              → asterion.action_steps
//   narrative_beat           → asterion.narrative_beats
//   chart family with beats  → asterion.narrative_threads + thread_tensions
//   every entity / relation  → asterion.entities / asterion.relations

import { readFileSync, existsSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const file = argv.find((a) => !a.startsWith('--') && a !== argv[argv.indexOf('--label') + 1])
const label = argv.includes('--label') ? argv[argv.indexOf('--label') + 1] : null

if (!file || !existsSync(file)) {
  console.error('usage: node scripts/import-coaia-jsonl.mjs <file.jsonl> [--label name] [--apply]')
  process.exit(1)
}

const SOURCE = `coaia-narrative:${label ?? basename(file).replace(/\.jsonl$/, '')}`

// ---------- read the memory ----------

const records = readFileSync(file, 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l))

// Older writers recorded a beat as `type: "narrative_beat"` with no entityType;
// both shapes are the same entity and both must project.
const entities = records
  .filter((r) => r.type !== 'relation')
  .map((r) => ({ ...r, entityType: r.entityType ?? r.type }))
const relations = records.filter((r) => r.type === 'relation')
const byName = new Map(entities.map((e) => [e.name, e]))
const of = (type) => entities.filter((e) => e.entityType === type)

const chartIdOf = (e) => e.metadata?.chartId ?? e.name.replace(/_chart$/, '')
const text = (e) => (e?.observations ?? []).join('\n\n')
const firstLine = (s, n = 120) => {
  const line = (s ?? '').split('\n')[0].trim()
  return line.length > n ? `${line.slice(0, n - 1)}…` : line
}

// A chart's parent: stated in metadata, or carried by a telescopes_to edge
// whose source is the parent chart or one of its action steps.
const parentOf = (chartId) => {
  const stated = byName.get(`${chartId}_chart`)?.metadata?.parentChartId
  if (stated) return stated
  for (const r of relations) {
    if (r.relationType !== 'telescopes_to') continue
    if (r.to !== chartId && r.to !== `${chartId}_chart`) continue
    const from = byName.get(r.from) ?? byName.get(`${r.from}_chart`)
    if (from?.entityType === 'action_step') return from.metadata?.chartId ?? null
  }
  return null
}

// metadata.github, plus the two legacy shapes coaia-narrative still accepts.
const githubOf = (meta = {}) => {
  const gh = meta.github ?? {}
  const legacy = meta.sync_target ?? meta.github_ref ?? {}
  const issue = gh.issue ?? {}
  const item = gh.projectItem ?? (gh.projectItems ?? [])[0] ?? {}
  return {
    owner: issue.owner ?? legacy.owner ?? null,
    repo: issue.repo ?? legacy.repo ?? null,
    number: issue.number ?? legacy.issue_number ?? legacy.issueNumber ?? legacy.number ?? null,
    projectId: item.projectId ?? legacy.project_id ?? legacy.projectId ?? null,
    itemId: item.itemId ?? legacy.item_id ?? legacy.itemId ?? null,
    syncState: gh.syncState
      ? { state: gh.syncState, lastSyncedAt: gh.lastSyncedAt ?? null, authoritativeOnLastSync: gh.authoritativeOnLastSync ?? null }
      : {},
  }
}

// ---------- build the projection ----------

const charts = of('structural_tension_chart').map((e) => {
  const chartId = chartIdOf(e)
  const outcome = byName.get(`${chartId}_desired_outcome`)
  const reality = byName.get(`${chartId}_current_reality`)
  const desired = text(outcome) || text(e) || chartId
  const steps = of('action_step').filter((s) => s.metadata?.chartId === chartId)
  const done = steps.filter((s) => s.metadata?.completionStatus === true).length
  return {
    chartId,
    entity: e,
    title: firstLine(desired) || chartId,
    desired_outcome: desired,
    current_reality: text(reality) || '(not recorded in the source memory)',
    phase: e.metadata?.phase ?? 'germination',
    status: e.metadata?.status ?? 'active',
    due_date: e.metadata?.dueDate ?? null,
    telescope_depth: e.metadata?.level ?? 0,
    progress: steps.length ? Math.round((done / steps.length) * 100) : 0,
    parentChartId: parentOf(chartId),
    github: githubOf(e.metadata),
    steps,
    beats: of('narrative_beat').filter((b) => b.metadata?.chartId === chartId),
  }
})

const chartById = new Map(charts.map((c) => [c.chartId, c]))
const familyRoot = (c) => {
  let cur = c
  const seen = new Set()
  while (cur.parentChartId && chartById.has(cur.parentChartId) && !seen.has(cur.chartId)) {
    seen.add(cur.chartId)
    cur = chartById.get(cur.parentChartId)
  }
  return cur
}

// One thread per chart family that actually carries beats.
const threads = []
for (const c of charts) {
  const root = familyRoot(c)
  const family = charts.filter((x) => familyRoot(x).chartId === root.chartId)
  if (!family.some((x) => x.beats.length)) continue
  if (threads.some((t) => t.rootChartId === root.chartId)) continue
  threads.push({
    rootChartId: root.chartId,
    name: root.title,
    thread_type: 'chart-family',
    description: `Projected from ${basename(file)} — ${family.length} chart(s), ${family.reduce((n, x) => n + x.beats.length, 0)} beat(s)`,
    members: family,
  })
}

const counts = {
  tensions: charts.length,
  action_steps: charts.reduce((n, c) => n + c.steps.length, 0),
  narrative_beats: charts.reduce((n, c) => n + c.beats.length, 0),
  narrative_threads: threads.length,
  entities: entities.length,
  relations: relations.length,
  events: charts.length + 1,
}

console.log(`source   ${file}`)
console.log(`label    ${SOURCE}\n`)
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(18)} ${v}`)
console.log('')
for (const c of charts) {
  const gh = c.github.number ? `  ${c.github.owner}/${c.github.repo}#${c.github.number}` : ''
  console.log(
    `  ${c.chartId.padEnd(42)} ${String(c.phase).padEnd(12)} ${String(c.steps.length).padStart(2)} steps  ${String(c.beats.length).padStart(2)} beats  ${c.progress}%${gh}`
  )
}
console.log('')
for (const t of threads) console.log(`  thread: ${t.name} (${t.members.length} chart(s))`)

if (!APPLY) {
  console.log('\ndry run — nothing written. Re-run with --apply to write it.')
  process.exit(0)
}

// ---------- write ----------

if (!process.env.DATABASE_URL) {
  for (const f of ['.env.local', '.env']) {
    const p = join(ROOT, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*"?(.*?)"?\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
    break
  }
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const one = async (q, p) => (await sql.query(q, p))[0]

console.log(`\nwriting → ${process.env.DATABASE_URL.match(/@([^/:]+)/)?.[1] ?? 'unknown host'}\n`)

// tensions, first pass: no parent, no source_action_step (their targets may not exist yet)
const tensionId = new Map()
for (const c of charts) {
  const row = await one(
    `INSERT INTO asterion.tensions
       (external_id, external_source, title, desired_outcome, current_reality, phase, status,
        due_date, telescope_depth, progress, github_owner, github_repo, github_issue_number,
        github_project_id, github_project_item_id, github_sync_state, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (external_id, external_source) DO UPDATE SET
       title = EXCLUDED.title, desired_outcome = EXCLUDED.desired_outcome,
       current_reality = EXCLUDED.current_reality, phase = EXCLUDED.phase,
       status = EXCLUDED.status, due_date = EXCLUDED.due_date,
       telescope_depth = EXCLUDED.telescope_depth, progress = EXCLUDED.progress,
       github_owner = EXCLUDED.github_owner, github_repo = EXCLUDED.github_repo,
       github_issue_number = EXCLUDED.github_issue_number,
       github_project_id = EXCLUDED.github_project_id,
       github_project_item_id = EXCLUDED.github_project_item_id,
       github_sync_state = EXCLUDED.github_sync_state,
       metadata = EXCLUDED.metadata, updated_at = now()
     RETURNING id`,
    [
      c.chartId, SOURCE, c.title, c.desired_outcome, c.current_reality, c.phase, c.status,
      c.due_date, c.telescope_depth, c.progress, c.github.owner, c.github.repo, c.github.number,
      c.github.projectId, c.github.itemId, JSON.stringify(c.github.syncState),
      JSON.stringify({ source: { system: 'coaia-narrative', file: basename(file), entity: c.entity.name }, elementsOfPerformance: c.entity.metadata?.elementsOfPerformance ?? [] }),
    ]
  )
  tensionId.set(c.chartId, row.id)
}
console.log(`  tensions            ${tensionId.size}`)

// action steps
let stepCount = 0
const stepId = new Map()
for (const c of charts) {
  for (const [i, s] of c.steps.entries()) {
    const row = await one(
      `INSERT INTO asterion.action_steps
         (external_id, external_source, tension_id, title, description, status, sort_order, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (external_id, external_source) DO UPDATE SET
         tension_id = EXCLUDED.tension_id, title = EXCLUDED.title,
         description = EXCLUDED.description, status = EXCLUDED.status,
         sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata, updated_at = now()
       RETURNING id`,
      [
        s.name, SOURCE, tensionId.get(c.chartId), firstLine(text(s), 200) || s.name, text(s),
        s.metadata?.completionStatus === true ? 'completed' : 'pending', i,
        JSON.stringify({ source: { system: 'coaia-narrative', entity: s.name }, dueDate: s.metadata?.dueDate ?? null, telescopedToChartId: s.metadata?.telescopedToChartId ?? null }),
      ]
    )
    stepId.set(s.name, row.id)
    stepCount++
  }
}
console.log(`  action_steps        ${stepCount}`)

// second pass: telescoping links, both directions
for (const c of charts) {
  const parent = c.parentChartId ? tensionId.get(c.parentChartId) : null
  const srcStep = c.entity.metadata?.sourceActionStepId ? stepId.get(c.entity.metadata.sourceActionStepId) : null
  if (parent || srcStep) {
    await sql.query('UPDATE asterion.tensions SET parent_id = $1, source_action_step_id = $2 WHERE id = $3', [parent ?? null, srcStep ?? null, tensionId.get(c.chartId)])
  }
  for (const s of c.steps) {
    const target = s.metadata?.telescopedToChartId ? tensionId.get(s.metadata.telescopedToChartId) : null
    if (target) await sql.query('UPDATE asterion.action_steps SET telescoped_to_tension_id = $1 WHERE id = $2', [target, stepId.get(s.name)])
  }
}

// narrative beats
let beatCount = 0
for (const c of charts) {
  for (const b of c.beats) {
    await sql.query(
      `INSERT INTO asterion.narrative_beats
         (external_id, external_source, tension_id, beat_type, title, content, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (external_id, external_source) DO UPDATE SET
         tension_id = EXCLUDED.tension_id, beat_type = EXCLUDED.beat_type,
         title = EXCLUDED.title, content = EXCLUDED.content, metadata = EXCLUDED.metadata`,
      [
        b.name, SOURCE, tensionId.get(c.chartId), b.metadata?.type_dramatic ?? 'beat',
        firstLine(text(b), 200) || b.name, b.metadata?.narrative?.prose ?? text(b),
        JSON.stringify({ source: { system: 'coaia-narrative', entity: b.name }, ...b.metadata }),
      ]
    )
    beatCount++
  }
}
console.log(`  narrative_beats     ${beatCount}`)

// threads
for (const t of threads) {
  const row = await one(
    `INSERT INTO asterion.narrative_threads (external_id, external_source, name, thread_type, description, metadata)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (external_id, external_source) DO UPDATE SET
       name = EXCLUDED.name, thread_type = EXCLUDED.thread_type,
       description = EXCLUDED.description, metadata = EXCLUDED.metadata
     RETURNING id`,
    [t.rootChartId, SOURCE, t.name, t.thread_type, t.description, JSON.stringify({ source: { system: 'coaia-narrative', file: basename(file) } })]
  )
  for (const [i, m] of t.members.entries()) {
    await sql.query(
      `INSERT INTO asterion.thread_tensions (thread_id, tension_id, sort_order)
       VALUES ($1,$2,$3) ON CONFLICT (thread_id, tension_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
      [row.id, tensionId.get(m.chartId), i]
    )
  }
}
console.log(`  narrative_threads   ${threads.length}`)

// the graph: every entity, then the edges between them
const entityId = new Map()
for (const e of entities) {
  const row = await one(
    `INSERT INTO asterion.entities (external_id, external_source, name, entity_type, metadata)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (external_id, external_source) DO UPDATE SET
       name = EXCLUDED.name, entity_type = EXCLUDED.entity_type,
       metadata = EXCLUDED.metadata, updated_at = now()
     RETURNING id`,
    [e.name, SOURCE, e.name, e.entityType, JSON.stringify({ ...e.metadata, observations: e.observations ?? [] })]
  )
  entityId.set(e.name, row.id)
}
let relCount = 0, relSkipped = 0
for (const r of relations) {
  const from = entityId.get(r.from) ?? entityId.get(`${r.from}_chart`)
  const to = entityId.get(r.to) ?? entityId.get(`${r.to}_chart`)
  if (!from || !to) { relSkipped++; continue }
  await sql.query(
    `INSERT INTO asterion.relations (from_entity_id, to_entity_id, relation_type, metadata)
     VALUES ($1,$2,$3,$4) ON CONFLICT (from_entity_id, to_entity_id, relation_type) DO NOTHING`,
    [from, to, r.relationType, JSON.stringify({ source: { system: 'coaia-narrative' }, ...(r.metadata ?? {}) })]
  )
  relCount++
}
console.log(`  entities            ${entityId.size}`)
console.log(`  relations           ${relCount}${relSkipped ? ` (${relSkipped} unresolved)` : ''}`)

// the log, with attribution — the one thing append-only makes hard to retrofit
for (const c of charts) {
  await sql.query(
    `INSERT INTO asterion.events (event_type, actor_type, actor_id, tension_id, payload)
     VALUES ('tension.imported', 'importer', 'scripts/import-coaia-jsonl.mjs', $1, $2)`,
    [tensionId.get(c.chartId), JSON.stringify({ external_source: SOURCE, external_id: c.chartId, file: basename(file) })]
  )
}
await sql.query(
  `INSERT INTO asterion.events (event_type, actor_type, actor_id, payload)
   VALUES ('import.completed', 'importer', 'scripts/import-coaia-jsonl.mjs', $1)`,
  [JSON.stringify({ external_source: SOURCE, file: basename(file), ...counts })]
)
console.log(`  events              ${charts.length + 1}\n`)
console.log('done — coaia-narrative JSONL remains the record; this is its projection.')
