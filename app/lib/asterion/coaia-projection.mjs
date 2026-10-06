// coaia-narrative → Asterion: the one mapper.
//
// A coaia-narrative JSONL memory is the record. Asterion holds a projection of
// it, grouped by project. This module turns records into rows and writes them;
// it is shared by every way in — the ingest door (app/api/ingest/coaia-narrative),
// the registry sync (scripts/coaia-sync.mjs) and the one-off importer
// (scripts/import-coaia-jsonl.mjs) — so there is exactly one mapping to keep
// right. Plain ESM with no path aliases, so node runs it without a build.
//
// Identity. A project row carries external_source = 'coaia-narrative' and
// external_id = its key. Every row it projects carries
// external_source = 'coaia-narrative:<key>' and external_id = the record's own
// name, and the unique indexes on those pairs make a second pass an update.
//
// One authority per project. A project with registered files is fed by the
// registry sync, which reads all of them together. A project with no files is
// fed by its writer through the door, one memory file posted whole. Two
// transports never write the same project, so neither can undo the other.
//
// Nothing is deleted. A chart the record no longer carries can be archived
// (status 'archived'), which a later pass reverses if the chart comes back.
//
// The mapping:
//   structural_tension_chart → tensions (github_* from metadata.github)
//   action_step              → action_steps
//   narrative_beat           → narrative_beats
//   chart family with beats  → narrative_threads + thread_tensions
//   every entity / relation  → entities / relations
//   every chart              → project_tensions

import { createHash } from 'node:crypto'
// The package that writes these files owns how they are read. Classification —
// which line is an entity, a relation, or a legacy beat — comes from its contract,
// so a dialect it learns is one Asterion reads without a change here.
import { parseStore, getWork } from 'coaia-narrative/contract'

export const SYSTEM = 'coaia-narrative'
/** Raise when the mapping changes, so every project re-projects on its next pass. */
// 4: parents from metadata.parentChart (what coaia-narrative writes), and a
// telescoped child chart is work of its parent (contract getWork).
// 5: a flat step and the child it opened into are one step (contract childChartId).
export const MAPPER_VERSION = 5
export const KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/
export const sourceFor = (key) => `${SYSTEM}:${key}`

/** Cache patterns (under asterion:cache:) that a projection makes stale. */
export const CACHE_PATTERNS = ['tensions:*', 'tension:*', 'projects:*', 'project:*']

const PHASES = new Set(['germination', 'assimilation', 'completion'])
const STATUSES = new Set(['active', 'paused', 'resolved', 'archived'])

const sha = (value) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex')
export const hashText = (text) => sha(text)

// ---------- reading ----------

/**
 * Parse JSONL text into plain records, reporting lines that are not JSON objects.
 * Used to count and merge a project's files; the plan itself reads through the
 * package contract (planProjection).
 * @param {string} text
 * @returns {{ records: object[], errors: { line: number, message: string }[] }}
 */
export function parseJsonl(text) {
  const records = []
  const errors = []
  String(text ?? '').split('\n').forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    try {
      const value = JSON.parse(line)
      if (value && typeof value === 'object') records.push(value)
      else errors.push({ line: i + 1, message: 'not an object' })
    } catch (err) {
      errors.push({ line: i + 1, message: err instanceof Error ? err.message : String(err) })
    }
  })
  return { records, errors }
}

const text = (e) => (Array.isArray(e?.observations) ? e.observations.filter((o) => typeof o === 'string') : []).join('\n\n')
const firstLine = (s, n = 120) => {
  const line = (s ?? '').split('\n')[0].trim()
  return line.length > n ? `${line.slice(0, n - 1)}…` : line
}
// Values that land in typed columns are checked here, so one odd record
// cannot stop a whole pass at the database.
const asInt = (v) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  return Number.isInteger(n) && n >= 0 && n < 2 ** 31 ? n : null
}
// A date Postgres will take: a real calendar day in years 1..9999, returned as UTC ISO.
const asDate = (v) => {
  if (typeof v !== 'string') return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim())
  if (m) {
    const [y, mo, day] = m.slice(1).map(Number)
    if (y < 1 || mo < 1 || mo > 12 || day < 1 || day > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return null
  }
  const year = d.getUTCFullYear()
  return year >= 1 && year <= 9999 ? d.toISOString() : null
}
// Postgres refuses U+0000 in text and in jsonb; one stray byte must not stop a project.
const scrub = (v) =>
  typeof v === 'string' ? v.replace(/\u0000/g, '')
    : Array.isArray(v) ? v.map(scrub)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [scrub(k), scrub(x)]))
        : v
const asText = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

// metadata.github, plus the two legacy shapes coaia-narrative still accepts.
function githubOf(meta = {}) {
  const gh = meta?.github ?? {}
  const legacy = meta?.sync_target ?? meta?.github_ref ?? {}
  const issue = gh.issue ?? {}
  const item = gh.projectItem ?? (Array.isArray(gh.projectItems) ? gh.projectItems[0] : null) ?? {}
  return {
    owner: asText(issue.owner ?? legacy.owner),
    repo: asText(issue.repo ?? legacy.repo),
    number: asInt(issue.number ?? legacy.issue_number ?? legacy.issueNumber ?? legacy.number),
    projectId: asText(item.projectId ?? legacy.project_id ?? legacy.projectId),
    itemId: asText(item.itemId ?? legacy.item_id ?? legacy.itemId),
    syncState: gh.syncState
      ? { state: String(gh.syncState), lastSyncedAt: asDate(gh.lastSyncedAt), authoritativeOnLastSync: gh.authoritativeOnLastSync ?? null }
      : {},
  }
}

// ---------- the plan ----------

/**
 * Turn a memory file into what Asterion will hold. Pure: no database, no clock.
 * @param {string | object[]} input  the file's text, or its records
 * @param {{ file?: string | null }} [opts]
 */
export function planProjection(input, { file = null } = {}) {
  const raw = typeof input === 'string' ? input : input.map((r) => JSON.stringify(r)).join('\n')
  const store = parseStore(raw)
  const entities = [...store.entities.values()]
    .map(scrub)
    .filter((e) => typeof e.entityType === 'string' && typeof e.name === 'string' && e.name)
    .map((e) => ({ ...e, metadata: e.metadata && typeof e.metadata === 'object' ? e.metadata : {} }))
  const relations = store.relations
    .map(scrub)
    .filter((r) => typeof r.from === 'string' && typeof r.to === 'string' && typeof r.relationType === 'string')
  const byName = new Map(entities.map((e) => [e.name, e]))
  const of = (type) => entities.filter((e) => e.entityType === type)
  const chartIdOf = (e) => (typeof e.metadata.chartId === 'string' && e.metadata.chartId) || e.name.replace(/_chart$/, '')
  const telescopeStepId = (childChartId) => `telescope:${childChartId}`
  // The chart's work, as the contract counts it (getWork, coaia-narrative 0.21): flat
  // steps, a flat step that opened into a child chart carrying childChartId (whichever
  // side wrote the link), and child charts no step stands for.
  const workOf = new Map(of('structural_tension_chart').map((e) => [chartIdOf(e), getWork(store, chartIdOf(e))]))
  const stepForChild = new Map()
  for (const work of workOf.values()) {
    for (const w of work) if (w.childChartId) stepForChild.set(w.childChartId, w.id)
  }

  // A chart's parent: metadata.parentChart, the key coaia-narrative writes and its
  // contract reads (getChildCharts); parentChartId from older writers; or a
  // telescopes_to edge whose source is an action step of the parent chart.
  const parentOf = (chartId) => {
    const meta = byName.get(`${chartId}_chart`)?.metadata ?? {}
    for (const stated of [meta.parentChart, meta.parentChartId]) {
      if (typeof stated === 'string' && stated && stated !== chartId) return stated
    }
    for (const r of relations) {
      if (r.relationType !== 'telescopes_to') continue
      if (r.to !== chartId && r.to !== `${chartId}_chart`) continue
      const from = byName.get(r.from) ?? byName.get(`${r.from}_chart`)
      if (from?.entityType === 'action_step' && typeof from.metadata.chartId === 'string') return from.metadata.chartId
    }
    return null
  }

  const charts = of('structural_tension_chart').map((e) => {
    const chartId = chartIdOf(e)
    const outcome = byName.get(`${chartId}_desired_outcome`)
    const reality = byName.get(`${chartId}_current_reality`)
    const desired = text(outcome) || text(e) || chartId
    const work = workOf.get(chartId) ?? []
    const steps = work.filter((w) => !w.telescoped).map((w) => byName.get(w.id)).filter(Boolean)
    // A child chart no flat step stands for becomes a step of this chart that telescopes to it.
    const children = work.filter((w) => w.telescoped && byName.has(`${w.id}_chart`))
    const done = steps.filter((s) => s.metadata.completionStatus === true).length + children.filter((w) => w.completed).length
    const total = steps.length + children.length
    const beats = of('narrative_beat').filter((b) => b.metadata.chartId === chartId)
    const chart = {
      chartId,
      entityName: e.name,
      title: firstLine(desired) || chartId,
      desired_outcome: desired,
      current_reality: text(reality) || '(not recorded in the source memory)',
      phase: PHASES.has(e.metadata.phase) ? e.metadata.phase : 'germination',
      status: STATUSES.has(e.metadata.status) ? e.metadata.status : 'active',
      due_date: asDate(e.metadata.dueDate),
      telescope_depth: asInt(e.metadata.level) ?? 0,
      progress: total ? Math.round((done / total) * 100) : 0,
      parentChartId: parentOf(chartId),
      // A chart telescoped from its parent's work hangs off the step that stands for it.
      sourceActionStepId: asText(e.metadata.sourceActionStepId) ?? stepForChild.get(chartId) ?? (parentOf(chartId) ? telescopeStepId(chartId) : null),
      elementsOfPerformance: Array.isArray(e.metadata.elementsOfPerformance) ? e.metadata.elementsOfPerformance : [],
      github: githubOf(e.metadata),
      steps: steps.map((s, i) => ({
        name: s.name,
        title: firstLine(text(s), 200) || s.name,
        description: text(s),
        status: s.metadata.completionStatus === true ? 'completed' : 'pending',
        sort_order: i,
        dueDate: asDate(s.metadata.dueDate),
        telescopedToChartId: work.find((w) => w.id === s.name)?.childChartId ?? asText(s.metadata.telescopedToChartId),
      })).concat(children.map((w, i) => {
        const childOutcome = byName.get(`${w.id}_desired_outcome`)
        const childChart = byName.get(`${w.id}_chart`)
        return {
          name: telescopeStepId(w.id),
          title: firstLine(text(childOutcome), 200) || w.id,
          description: text(childOutcome),
          status: w.completed ? 'completed' : 'pending',
          sort_order: steps.length + i,
          dueDate: asDate(w.dueDate),
          telescopedToChartId: w.id,
          // The GitHub issue the child records, so a step made on the site for that
          // sub-issue can be recognised as this one.
          github: githubOf(childChart?.metadata),
        }
      })),
      beats: beats.map((b) => ({
        name: b.name,
        beat_type: asText(b.metadata.type_dramatic) ?? 'beat',
        title: firstLine(text(b), 200) || b.name,
        content: asText(b.metadata.narrative?.prose) ?? text(b),
        metadata: b.metadata,
      })),
    }
    // What a reader would see change. Used to log only real changes.
    chart.hash = sha({ ...chart, entityName: undefined })
    return chart
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
    if (threads.some((t) => t.rootChartId === root.chartId)) continue
    const family = charts.filter((x) => familyRoot(x).chartId === root.chartId)
    if (!family.some((x) => x.beats.length)) continue
    threads.push({
      rootChartId: root.chartId,
      name: root.title,
      thread_type: 'chart-family',
      description: `The chart ${root.chartId} and the charts telescoped from it`,
      members: family.map((x) => x.chartId),
    })
  }

  return {
    file,
    // Lines the package contract does not read as any record.
    skipped: store.skipped,
    charts,
    threads,
    entities,
    relations,
    // Everything a pass would write. Equal hashes mean the pass would change nothing.
    hash: sha({ mapper: MAPPER_VERSION, charts: charts.map((c) => c.hash), entities, relations }),
    counts: {
      tensions: charts.length,
      action_steps: charts.reduce((n, c) => n + c.steps.length, 0),
      narrative_beats: charts.reduce((n, c) => n + c.beats.length, 0),
      narrative_threads: threads.length,
      entities: entities.length,
      relations: relations.length,
    },
  }
}

// ---------- the registry ----------

/** Validate one registered file. Returns an error message, or null. */
export function checkSourceFile(f) {
  if (!f || (f.kind !== 'git' && f.kind !== 'file')) return 'a file is { kind: "git", repo, remote, ref, path } or { kind: "file", path }'
  if (typeof f.path !== 'string' || !f.path || f.path.startsWith('-')) return 'path must be a non-empty string not starting with "-"'
  if (f.kind === 'file' && !f.path.startsWith('/')) return 'a plain file needs an absolute path'
  if (f.kind === 'git') {
    if (typeof f.repo !== 'string' || !f.repo.startsWith('/')) return 'repo must be the absolute path of a checkout'
    if (!/^[A-Za-z0-9._-]+$/.test(f.remote ?? '')) return 'remote must be a remote name such as origin'
    // Only a remote-tracking ref moves when the remote is fetched; a local branch would be read stale.
    if (typeof f.ref !== 'string' || !f.ref.startsWith(`${f.remote}/`) || /\s|\.\.|^-/.test(f.ref)) return `ref must be a remote-tracking ref such as ${f.remote ?? 'origin'}/main`
  }
  return null
}

/** A git file registered before `remote` was recorded reads from origin. */
export const normalizeSourceFile = (f) => (f && f.kind === 'git' && !f.remote ? { ...f, remote: 'origin' } : f)

export const sameFile = (a, b) => a.kind === b.kind && a.path === b.path && (a.repo ?? null) === (b.repo ?? null)

/**
 * Register (or update) a project. files: the files the registry sync reads, or
 * [] for a project fed by its writer through the door.
 */
// visibility: 'private' shows the project's rows to signed-in writers only (lib/asterion/visibility.ts);
// 'public' shows them to everyone; undefined keeps what the project already has.
export async function upsertProject(sql, { key, name, description = null, files = [], visibility }) {
  if (visibility !== undefined && visibility !== 'private' && visibility !== 'public') {
    throw new Error(`visibility must be 'private' or 'public': ${visibility}`)
  }
  if (!KEY_PATTERN.test(key)) throw new Error(`project key must match ${KEY_PATTERN}: ${key}`)
  files = files.map(normalizeSourceFile)
  for (const f of files) {
    const problem = checkSourceFile(f)
    if (problem) throw new Error(`cannot register ${key}: ${problem}`)
  }
  const existing = await getRegisteredProject(sql, key)
  const prior = existing?.metadata?.source?.files ?? []
  // Keep what the sync learned about a file the registration still names.
  const merged = files.map((f) => {
    const same = prior.find((p) => sameFile(p, f))
    return same ? { ...same, ...f } : f
  })
  const metadata = {
    ...(existing?.metadata ?? {}),
    ...(visibility === 'private' ? { visibility } : {}),
    source: {
      ...(existing?.metadata?.source ?? {}),
      system: SYSTEM,
      key,
      files: merged,
      registeredAt: existing?.metadata?.source?.registeredAt ?? new Date().toISOString(),
    },
  }
  if (visibility === 'public') delete metadata.visibility
  const rows = await sql.query(
    `INSERT INTO asterion.projects (external_id, external_source, name, codename, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (external_id, external_source) DO UPDATE SET
       name = EXCLUDED.name, codename = EXCLUDED.codename,
       description = EXCLUDED.description, metadata = EXCLUDED.metadata, updated_at = now()
     RETURNING *`,
    [key, SYSTEM, name, key, description, JSON.stringify(metadata)]
  )
  return rows[0]
}

export async function getRegisteredProject(sql, key) {
  const rows = await sql.query(
    `SELECT * FROM asterion.projects WHERE external_source = $1 AND external_id = $2`,
    [SYSTEM, key]
  )
  return rows[0] ?? null
}

export async function listRegisteredProjects(sql) {
  return sql.query(
    `SELECT p.*, (SELECT count(*)::int FROM asterion.project_tensions pt WHERE pt.project_id = p.id) AS tension_count
       FROM asterion.projects p
      WHERE p.external_source = $1
      ORDER BY p.name`,
    [SYSTEM]
  )
}

/** Files the registry sync reads for a project; [] means the project is fed through the door. */
export const registeredFiles = (project) => (project?.metadata?.source?.files ?? []).map(normalizeSourceFile)

/**
 * Record what a sync saw for one file, merged in place by the file's identity,
 * so a registration or another pass running at the same time is not undone.
 */
export async function recordFileSync(sql, projectId, file, state) {
  await sql.query(
    `UPDATE asterion.projects SET metadata = jsonb_set(metadata, '{source,files}', (
        SELECT coalesce(jsonb_agg(CASE
                 WHEN f->>'kind' = $2 AND f->>'path' = $3 AND coalesce(f->>'repo', '') = $4 THEN f || $5::jsonb
                 ELSE f END ORDER BY ord), '[]'::jsonb)
          FROM jsonb_array_elements(metadata->'source'->'files') WITH ORDINALITY AS t(f, ord)
      )), updated_at = now()
     WHERE id = $1 AND jsonb_typeof(metadata->'source'->'files') = 'array'`,
    [projectId, file.kind, file.path, file.repo ?? '', JSON.stringify(state)]
  )
}

async function setSourceField(sql, projectId, field, value) {
  await sql.query(
    `UPDATE asterion.projects SET metadata = jsonb_set(metadata, ARRAY['source', $2::text], $3::jsonb), updated_at = now()
     WHERE id = $1 AND metadata ? 'source'`,
    [projectId, field, JSON.stringify(value)]
  )
}

// ---------- writing ----------

/**
 * Write a plan under a registered project. Idempotent: a plan equal to the
 * last one written for that project returns { unchanged: true } without writing.
 *
 * @param {Function & { query: Function }} sql  a @neondatabase/serverless client
 * @param {ReturnType<typeof planProjection>} plan
 * @param {{
 *   project: { id: string, external_id: string, metadata?: object },
 *   actor: { type: string, id: string },
 *   whole?: boolean,
 *   archiveOrphans?: boolean,
 *   force?: boolean,
 * }} opts
 *   whole: the plan holds every record of the project (true for both transports);
 *   archiveOrphans: mark charts the record no longer carries as archived;
 *   force: write even when the plan hash is unchanged.
 */
export async function applyProjection(sql, plan, { project, actor, whole = true, archiveOrphans = false, force = false }) {
  const key = project?.external_id
  if (!project?.id || !KEY_PATTERN.test(key ?? '')) throw new Error('applyProjection needs a registered project')
  if (archiveOrphans && !whole) throw new Error('archiving needs a whole plan: a partial plan cannot say what is gone')
  // An empty plan is far more often an unreadable file than a project emptied on purpose.
  if (archiveOrphans && plan.charts.length === 0) throw new Error('refusing to archive from a plan with no charts')
  const source = sourceFor(key)
  const one = async (q, p) => (await sql.query(q, p))[0]

  if (!force && !archiveOrphans && project.metadata?.source?.planHash === plan.hash) {
    return { unchanged: true, external_source: source, ...plan.counts, changed: 0, changes: [], orphans: 0, archived: 0, relations_unresolved: 0 }
  }

  const prior = new Map(
    (await sql.query(
      `SELECT external_id, id, metadata->'source'->>'hash' AS hash FROM asterion.tensions WHERE external_source = $1`,
      [source]
    )).map((r) => [r.external_id, r])
  )
  const changes = plan.charts
    .filter((c) => prior.get(c.chartId)?.hash !== c.hash)
    .map((c) => ({ chartId: c.chartId, change: prior.has(c.chartId) ? 'updated' : 'created' }))

  // tensions, first pass. The stored hash stays the previous one until the pass
  // has finished, so a pass that fails midway is seen as a change on retry.
  const tensionId = new Map()
  for (const c of plan.charts) {
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
        c.chartId, source, c.title, c.desired_outcome, c.current_reality, c.phase, c.status,
        c.due_date, c.telescope_depth, c.progress, c.github.owner, c.github.repo, c.github.number,
        c.github.projectId, c.github.itemId, JSON.stringify(c.github.syncState),
        JSON.stringify({
          elementsOfPerformance: c.elementsOfPerformance,
          source: { system: SYSTEM, key, file: plan.file, entity: c.entityName, hash: prior.get(c.chartId)?.hash ?? null },
        }),
      ]
    )
    tensionId.set(c.chartId, row.id)
  }

  // action steps
  const stepId = new Map()
  for (const c of plan.charts) {
    for (const s of c.steps) {
      // A step made on the site that opened a GitHub sub-issue (metadata.github.subIssue)
      // is the same step as the telescoped child that sub-issue's chart becomes: the
      // projection adopts that row instead of adding a second one beside it.
      if (s.telescopedToChartId && s.github?.number && s.github.owner && s.github.repo) {
        await sql.query(
          `UPDATE asterion.action_steps SET external_id = $1, external_source = $2
            WHERE id = (
              SELECT id FROM asterion.action_steps
               WHERE tension_id = $3 AND external_source IS NULL
                 AND (metadata->'github'->'subIssue'->>'number')::int = $4
                 AND lower(metadata->'github'->'subIssue'->>'owner') = lower($5)
                 AND lower(metadata->'github'->'subIssue'->>'repo') = lower($6)
               LIMIT 1)
              AND NOT EXISTS (SELECT 1 FROM asterion.action_steps WHERE external_source = $2 AND external_id = $1)`,
          [s.name, source, tensionId.get(c.chartId), s.github.number, s.github.owner, s.github.repo]
        )
      }
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
          s.name, source, tensionId.get(c.chartId), s.title, s.description, s.status, s.sort_order,
          JSON.stringify({
            dueDate: s.dueDate, telescopedToChartId: s.telescopedToChartId, source: { system: SYSTEM, key, entity: s.name },
            ...(s.github?.number ? { github: { subIssue: { owner: s.github.owner, repo: s.github.repo, number: s.github.number } } } : {}),
          }),
        ]
      )
      stepId.set(s.name, row.id)
    }
  }

  // Telescoping links resolve against everything this project has projected,
  // not only this plan, so a chart whose parent sits elsewhere keeps its parent.
  const lookup = async (table, externalId, local) => {
    if (!externalId) return null
    if (local.has(externalId)) return local.get(externalId)
    const row = await one(`SELECT id FROM asterion.${table} WHERE external_source = $1 AND external_id = $2`, [source, externalId])
    return row?.id ?? null
  }
  for (const c of plan.charts) {
    await sql.query(
      'UPDATE asterion.tensions SET parent_id = $1, source_action_step_id = $2 WHERE id = $3',
      [await lookup('tensions', c.parentChartId, tensionId), await lookup('action_steps', c.sourceActionStepId, stepId), tensionId.get(c.chartId)]
    )
    for (const s of c.steps) {
      await sql.query(
        'UPDATE asterion.action_steps SET telescoped_to_tension_id = $1 WHERE id = $2',
        [await lookup('tensions', s.telescopedToChartId, tensionId), stepId.get(s.name)]
      )
    }
  }

  // narrative beats
  for (const c of plan.charts) {
    for (const b of c.beats) {
      await sql.query(
        `INSERT INTO asterion.narrative_beats
           (external_id, external_source, tension_id, beat_type, title, content, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (external_id, external_source) DO UPDATE SET
           tension_id = EXCLUDED.tension_id, beat_type = EXCLUDED.beat_type,
           title = EXCLUDED.title, content = EXCLUDED.content, metadata = EXCLUDED.metadata`,
        [b.name, source, tensionId.get(c.chartId), b.beat_type, b.title, b.content,
          JSON.stringify({ ...b.metadata, source: { system: SYSTEM, key, entity: b.name } })]
      )
    }
  }

  // threads: derived from the whole family, so only a whole plan may draw them
  if (whole) {
    for (const t of plan.threads) {
      const row = await one(
        `INSERT INTO asterion.narrative_threads (external_id, external_source, name, thread_type, description, metadata)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (external_id, external_source) DO UPDATE SET
           name = EXCLUDED.name, thread_type = EXCLUDED.thread_type,
           description = EXCLUDED.description, metadata = EXCLUDED.metadata
         RETURNING id`,
        [t.rootChartId, source, t.name, t.thread_type, t.description, JSON.stringify({ source: { system: SYSTEM, key, file: plan.file } })]
      )
      for (const [i, chartId] of t.members.entries()) {
        await sql.query(
          `INSERT INTO asterion.thread_tensions (thread_id, tension_id, sort_order)
           VALUES ($1,$2,$3) ON CONFLICT (thread_id, tension_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
          [row.id, tensionId.get(chartId), i]
        )
      }
    }
  }

  // the graph: every entity, then the edges between them
  const entityId = new Map()
  for (const e of plan.entities) {
    const row = await one(
      `INSERT INTO asterion.entities (external_id, external_source, name, entity_type, metadata)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (external_id, external_source) DO UPDATE SET
         name = EXCLUDED.name, entity_type = EXCLUDED.entity_type,
         metadata = EXCLUDED.metadata, updated_at = now()
       RETURNING id`,
      [e.name, source, e.name, e.entityType, JSON.stringify({ ...e.metadata, observations: e.observations ?? [], source: { system: SYSTEM, key } })]
    )
    entityId.set(e.name, row.id)
  }
  let relationsWritten = 0
  const unresolved = []
  for (const r of plan.relations) {
    const from = (await lookup('entities', r.from, entityId)) ?? (await lookup('entities', `${r.from}_chart`, entityId))
    const to = (await lookup('entities', r.to, entityId)) ?? (await lookup('entities', `${r.to}_chart`, entityId))
    if (!from || !to) { unresolved.push(`${r.from} -${r.relationType}-> ${r.to}`); continue }
    await sql.query(
      `INSERT INTO asterion.relations (from_entity_id, to_entity_id, relation_type, metadata)
       VALUES ($1,$2,$3,$4) ON CONFLICT (from_entity_id, to_entity_id, relation_type) DO NOTHING`,
      [from, to, r.relationType, JSON.stringify({ ...(r.metadata && typeof r.metadata === 'object' ? r.metadata : {}), source: { system: SYSTEM, key } })]
    )
    relationsWritten++
  }

  // the project lens
  for (const [i, c] of plan.charts.entries()) {
    await sql.query(
      `INSERT INTO asterion.project_tensions (project_id, tension_id, lens, sort_order, metadata)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (project_id, tension_id) DO UPDATE SET lens = EXCLUDED.lens, sort_order = EXCLUDED.sort_order`,
      [project.id, tensionId.get(c.chartId), SYSTEM, i, JSON.stringify({ source: { system: SYSTEM, key } })]
    )
  }

  // Charts this project projected before that the record no longer carries.
  // Reported always on a whole plan; archived only when asked; never deleted.
  let orphanIds = []
  let archived = 0
  if (whole) {
    const current = plan.charts.map((c) => c.chartId)
    orphanIds = (await sql.query(
      `SELECT external_id FROM asterion.tensions
        WHERE external_source = $1 AND NOT (external_id = ANY($2::text[])) AND status <> 'archived'`,
      [source, current]
    )).map((r) => r.external_id)
    if (archiveOrphans && orphanIds.length) {
      const rows = await sql.query(
        `UPDATE asterion.tensions
            SET status = 'archived', updated_at = now(),
                metadata = jsonb_set(metadata, '{source,archivedAt}', to_jsonb(now()::text))
          WHERE external_source = $1 AND external_id = ANY($2::text[]) RETURNING id`,
        [source, orphanIds]
      )
      archived = rows.length
    }
  }

  // the log: one event per chart that actually changed, one for the pass
  for (const ch of changes) {
    await sql.query(
      `INSERT INTO asterion.events (event_type, actor_type, actor_id, tension_id, payload)
       VALUES ('tension.projected', $1, $2, $3, $4)`,
      [actor.type, actor.id, tensionId.get(ch.chartId), JSON.stringify({ change: ch.change, external_source: source, external_id: ch.chartId, file: plan.file })]
    )
  }
  const summary = {
    unchanged: false,
    external_source: source,
    project_id: project.id,
    file: plan.file,
    ...plan.counts,
    relations_written: relationsWritten,
    relations_unresolved: unresolved.length,
    changed: changes.length,
    orphans: orphanIds.length,
    archived,
  }
  if (changes.length || archived) {
    await sql.query(
      `INSERT INTO asterion.events (event_type, actor_type, actor_id, payload) VALUES ('coaia.projected', $1, $2, $3)`,
      [actor.type, actor.id, JSON.stringify(summary)]
    )
  }

  // Only now, with everything written and logged, do the hashes move forward.
  for (const c of plan.charts) {
    if (prior.get(c.chartId)?.hash === c.hash) continue
    await sql.query(
      `UPDATE asterion.tensions SET metadata = jsonb_set(metadata, '{source,hash}', to_jsonb($2::text)) WHERE id = $1`,
      [tensionId.get(c.chartId), c.hash]
    )
  }
  await setSourceField(sql, project.id, 'planHash', plan.hash)
  await setSourceField(sql, project.id, 'projectedAt', new Date().toISOString())

  return { ...summary, changes, orphanIds, unresolved }
}

/** What the public API may show of a project: no local paths, no error text. */
export function publicProject(p) {
  const source = p?.metadata?.source
  if (!source) return p
  return {
    ...p,
    metadata: {
      ...p.metadata,
      source: {
        system: source.system,
        key: source.key,
        registeredAt: source.registeredAt ?? null,
        projectedAt: source.projectedAt ?? null,
        // Idempotent: a project already in its public shape passes through unchanged.
        files: (source.files ?? []).map((f) => ({
          kind: f.kind,
          name: f.name ?? (typeof f.path === 'string' ? f.path.split('/').pop() : null),
          syncedAt: f.syncedAt ?? null,
          failing: Boolean(f.error ?? f.failing),
        })),
      },
    },
  }
}
