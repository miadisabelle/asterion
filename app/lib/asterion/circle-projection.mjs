// Miadi circles → Asterion: the circle projection (miadisabelle/asterion#11).
//
// A circle and the ceremonies held in it live on the medicine wheel, which is
// the record. Asterion holds a projection of them. This module reads one circle
// through the wheel's published packages, plans its rows, and writes them. It
// is shared by every way in (today only scripts/circle-sync.mjs), so there is
// exactly one mapping to keep right. Plain ESM with no path aliases, so node
// runs it without a build.
//
// The mapping:
//   circle             → projects            (external_source 'medicine-wheel', external_id = circle id)
//   ceremony opened    → narrative_threads   (thread_type 'ceremony')
//   its closing record → the thread's metadata.closed_at
//   turn spoken in it  → narrative_beats     (beat_type 'turn', held by thread_id, no tension)
// Threads and beats carry external_source 'medicine-wheel:<circle id>' and their
// wheel id as external_id, so a second pass is an update.
//
// Consent, per person. A circle holds people's words, so nothing is written for
// someone who has not said yes. A yes is a consent record on the wheel (a
// knowledge node with metadata.is_consent_record, as @medicine-wheel/mcp's
// mw_consent_grant writes it) whose grantor is the person, whose grantee is
// 'asterion', whose scope covers data type 'circle' for purpose
// 'asterion-projection', and whose dependentRelations name the circle. The
// facilitator's yes carries the circle and its ceremonies. Each speaker's yes
// carries their own turns. A witness is named only with their own yes. This
// module never writes a consent record.
//
// Nothing is deleted. A ceremony gone from the wheel leaves its thread marked
// archived. A turn whose speaker withdraws keeps its row with the words emptied,
// and a circle whose facilitator withdraws keeps its rows with every word emptied.
//
// Asterion never writes the wheel. A person speaks, witnesses or closes in
// Miadi (/ceremony/<id>), and the next pass carries it.

import { createHash } from 'node:crypto'
import { closingOf, createMedicineWheelClient } from '@medicine-wheel/client'
import { circleFromNode, membersOf, personFromNode } from '@medicine-wheel/community-identity'
import { scopeIncludes } from '@medicine-wheel/consent-lifecycle'

export const SYSTEM = 'medicine-wheel'
/** Raise when the mapping changes, so every circle re-projects on its next pass. */
export const MAPPER_VERSION = 1
export const CIRCLE_ID_PATTERN = /^circle:[A-Za-z0-9:_-]{1,120}$/
export const sourceFor = (circleId) => `${SYSTEM}:${circleId}`

/** What a consent record must cover for Asterion to hold a person's words. */
export const CONSENT = Object.freeze({ grantee: 'asterion', dataType: 'circle', purpose: 'asterion-projection' })

/** Cache patterns (under asterion:cache:) that a projection makes stale. */
export const CACHE_PATTERNS = ['projects:*', 'project:*']

const STANDING = new Set(['granted', 'active', 'renewal-needed'])
const sha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

// ---------- consent ----------

/**
 * Whether one consent record lets Asterion hold what `personId` said in `circleId`.
 * @param {object} record a ConsentRecord (@medicine-wheel/consent-lifecycle)
 */
export function consentHolds(record, personId, circleId, now = Date.now()) {
  if (!record || record.grantor !== personId || record.grantee !== CONSENT.grantee) return false
  if (!STANDING.has(record.state)) return false
  if (record.expiresAt && !(Date.parse(record.expiresAt) > now)) return false
  if (!Array.isArray(record.dependentRelations) || !record.dependentRelations.includes(circleId)) return false
  const scope = { dataTypes: [], purposes: [], restrictions: [], ...(record.scope ?? {}) }
  return scopeIncludes(scope, { dataType: CONSENT.dataType, purpose: CONSENT.purpose }).withinScope
}

/** The people whose consent for this circle stands, from the wheel's consent nodes. */
export function consentingPeople(consentNodes, circleId, now = Date.now()) {
  const yes = new Set()
  for (const node of consentNodes ?? []) {
    const record = node?.metadata?.is_consent_record ? node.metadata.full_record : null
    if (record && consentHolds(record, record.grantor, circleId, now)) yes.add(record.grantor)
  }
  return yes
}

// ---------- reading ----------

/**
 * Read one circle from the wheel: everything the plan needs, nothing written.
 * @param {import('@medicine-wheel/client').MedicineWheelClient} client
 * @returns {Promise<object|null>} a snapshot, or null when the id is not a circle
 */
export async function readCircle(client, circleId) {
  const node = await client.nodes.get(circleId)
  const circle = circleFromNode(node)
  if (!circle) return null
  const [edges, ceremonies, beats, knowledge] = await Promise.all([
    client.edges.list({ to: circleId, limit: 'all' }),
    client.ceremonies.list({ circle_id: circleId, limit: 'all' }),
    client.beats.list({ limit: 'all' }),
    client.nodes.list({ type: 'knowledge', limit: 'all' }),
  ])
  const held = new Set(ceremonies.items.map((c) => c.id))
  const turns = beats.items.filter((b) => (b.ceremonies ?? []).some((id) => held.has(id)))
  const ids = new Set([
    circle.facilitator_id,
    ...membersOf(circleId, edges.items).map((m) => m.person_id),
    ...turns.flatMap((t) => [t.speaker, ...(t.witnesses ?? [])]),
  ].filter(Boolean))
  const people = (await Promise.all([...ids].map((id) => client.nodes.get(id)))).filter(Boolean)
  return {
    wheel: client.baseUrl,
    circle: node,
    edges: edges.items,
    ceremonies: ceremonies.items,
    turns,
    people,
    consents: knowledge.items.filter((n) => n?.metadata?.is_consent_record),
  }
}

export function wheelClient(baseUrl) {
  return createMedicineWheelClient({ baseUrl, timeoutMs: 30_000 })
}

// ---------- planning ----------

const label = (type) => String(type ?? 'ceremony').replace(/_/g, ' ')
const day = (iso) => (typeof iso === 'string' ? iso.slice(0, 10) : '')

/**
 * Turn a snapshot into the rows Asterion should hold, and what waits for consent.
 * Pure: the same snapshot (and the same `now`) gives the same plan.
 */
export function planCircleProjection(snapshot, { now = Date.now() } = {}) {
  const circle = circleFromNode(snapshot.circle)
  if (!circle) throw new Error('the snapshot does not hold a circle')
  const source = sourceFor(circle.id)
  const yes = consentingPeople(snapshot.consents, circle.id, now)
  const nameOf = new Map()
  for (const n of snapshot.people ?? []) nameOf.set(n.id, personFromNode(n)?.name ?? n.name ?? n.id)
  const who = (id) => ({ id, name: nameOf.get(id) ?? id })

  const seats = new Map([[circle.facilitator_id, 'facilitator']])
  for (const m of membersOf(circle.id, snapshot.edges ?? [])) if (!seats.has(m.person_id)) seats.set(m.person_id, m.role)
  const seated = [...seats].map(([id, role]) => ({ ...who(id), role, consented: yes.has(id) }))

  const records = snapshot.ceremonies ?? []
  const closingFor = new Map()
  for (const r of records) {
    const opening = closingOf(r)
    if (opening && (!closingFor.has(opening) || r.timestamp < closingFor.get(opening).timestamp)) closingFor.set(opening, r)
  }
  const openings = records
    .filter((r) => !closingOf(r) && r.type !== 'closing')
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)) || a.id.localeCompare(b.id))
  const opened = new Set(openings.map((c) => c.id))
  const turns = (snapshot.turns ?? [])
    .map((t) => ({ t, ceremony: (t.ceremonies ?? []).find((id) => opened.has(id)) }))
    .filter((x) => x.ceremony)
    .sort((a, b) => String(a.t.timestamp).localeCompare(String(b.t.timestamp)) || a.t.id.localeCompare(b.t.id))

  const held = []
  const facilitatorSaidYes = yes.has(circle.facilitator_id)
  const waitingForCircle = `waiting for the facilitator's consent (${circle.facilitator_id})`
  if (!facilitatorSaidYes) {
    held.push({ kind: 'circle', wheel_id: circle.id, reason: waitingForCircle })
    for (const c of openings) held.push({ kind: 'ceremony', wheel_id: c.id, reason: waitingForCircle })
  }

  const beats = []
  for (const { t, ceremony } of turns) {
    const reasons = []
    if (!t.speaker) reasons.push('the turn names no speaker')
    else if (!yes.has(t.speaker)) reasons.push(`waiting for the speaker's consent (${t.speaker})`)
    if (!facilitatorSaidYes) reasons.push(waitingForCircle)
    if (reasons.length) {
      held.push({ kind: 'turn', wheel_id: t.id, ceremony, reason: reasons.join('; ') })
      continue
    }
    beats.push({
      external_id: t.id,
      thread_external_id: ceremony,
      beat_type: 'turn',
      title: t.title ?? null,
      content: t.prose ?? t.description ?? '',
      created_at: t.timestamp,
      metadata: {
        wheel_id: t.id,
        speaker: who(t.speaker),
        witnesses: (t.witnesses ?? []).filter((w) => yes.has(w)).map(who),
        learnings: t.learnings ?? [],
        direction: t.direction ?? null,
        spoken_at: t.timestamp,
        source: { system: SYSTEM, circle_id: circle.id },
      },
    })
  }

  const threads = facilitatorSaidYes
    ? openings.map((c) => {
        const closing = closingFor.get(c.id)
        const intentions = (c.intentions ?? []).filter((s) => typeof s === 'string' && s.trim())
        return {
          external_id: c.id,
          name: intentions[0] ?? `${label(c.type)}, ${c.direction}, ${day(c.timestamp)}`,
          thread_type: 'ceremony',
          description: intentions.length ? intentions.join('\n') : null,
          metadata: {
            wheel_id: c.id,
            ceremony_type: c.type,
            direction: c.direction,
            opened_at: c.timestamp,
            ...(closing ? { closed_at: closing.timestamp, closing_id: closing.id } : {}),
            ...(c.subject_id ? { subject_id: c.subject_id } : {}),
            ...(c.episode_path ? { episode_path: c.episode_path } : {}),
            ...(c.episode_number !== undefined ? { episode_number: c.episode_number } : {}),
            miadi_path: `/ceremony/${encodeURIComponent(c.id)}`,
            source: { system: SYSTEM, circle_id: circle.id },
          },
        }
      })
    : []

  const project = facilitatorSaidYes
    ? {
        external_id: circle.id,
        name: circle.name,
        description: circle.intention || null,
        metadata: {
          source: { system: SYSTEM, circle_id: circle.id, ...(snapshot.wheel ? { wheel: snapshot.wheel } : {}) },
          visibility: circle.is_public ? 'public' : 'private',
          circle_type: circle.circle_type,
          ...(circle.direction ? { direction: circle.direction } : {}),
          ...(circle.episode_path ? { episode_path: circle.episode_path } : {}),
          facilitator: who(circle.facilitator_id),
        },
      }
    : null

  const rows = { project, threads, beats }
  const visibility = circle.is_public ? 'public' : 'private'
  return { circleId: circle.id, source, visibility, mapperVersion: MAPPER_VERSION, seated, ...rows, held, hash: sha({ v: MAPPER_VERSION, ...rows }) }
}

// ---------- writing ----------

/**
 * Write a plan. Every write is an upsert on (external_id, external_source), so a
 * second pass is an update, and a plan equal to the last one writes nothing.
 * @param {{ query(text: string, params?: unknown[]): Promise<object[]> }} sql
 * @returns {Promise<{ status: 'unchanged'|'projected'|'withheld'|'not-registered', counts?: object }>}
 */
export async function applyCircleProjection(sql, plan, { register = false, actor = { type: 'scheduler', id: 'scripts/circle-sync.mjs' } } = {}) {
  const one = async (text, params) => (await sql.query(text, params))[0] ?? null
  const existing = await one(
    `SELECT id, metadata FROM asterion.projects WHERE external_source = $1 AND external_id = $2`,
    [SYSTEM, plan.circleId]
  )
  if (!existing && !register) return { status: 'not-registered' }
  if (!existing && !plan.project) return { status: 'not-registered' }
  const last = existing?.metadata?.projection ?? {}
  if (existing && last.hash === plan.hash && last.mapper_version === MAPPER_VERSION) return { status: 'unchanged' }

  const source = plan.source
  const keep = (rows) => rows.map((r) => r.external_id)
  const projection = { hash: plan.hash, mapper_version: MAPPER_VERSION }

  if (!plan.project) {
    // The facilitator withdrew: keep every row, empty every word.
    await sql.query(
      `UPDATE asterion.projects SET name = 'Withheld circle', description = NULL,
         metadata = metadata || $2::jsonb, updated_at = now() WHERE id = $1`,
      [existing.id, JSON.stringify({ withheld: true, visibility: 'private', projection })]
    )
    await sql.query(
      `UPDATE asterion.narrative_threads SET name = 'Withheld ceremony', description = NULL,
         metadata = jsonb_build_object('wheel_id', external_id, 'withheld', true) WHERE external_source = $1`,
      [source]
    )
    await sql.query(
      `UPDATE asterion.narrative_beats SET title = NULL, content = '',
         metadata = jsonb_build_object('wheel_id', external_id, 'withheld', true) WHERE external_source = $1`,
      [source]
    )
    return { status: 'withheld' }
  }

  const project = await one(
    `INSERT INTO asterion.projects (external_id, external_source, name, description, metadata)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (external_id, external_source) DO UPDATE SET
       name = EXCLUDED.name, description = EXCLUDED.description,
       metadata = asterion.projects.metadata - 'withheld' || EXCLUDED.metadata, updated_at = now()
     RETURNING id`,
    [plan.project.external_id, SYSTEM, plan.project.name, plan.project.description,
      JSON.stringify({ ...plan.project.metadata, projection })]
  )

  const threadId = new Map()
  for (const t of plan.threads) {
    const row = await one(
      `INSERT INTO asterion.narrative_threads (external_id, external_source, name, thread_type, description, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::timestamptz, now()))
       ON CONFLICT (external_id, external_source) DO UPDATE SET
         name = EXCLUDED.name, thread_type = EXCLUDED.thread_type,
         description = EXCLUDED.description, metadata = EXCLUDED.metadata
       RETURNING id`,
      [t.external_id, source, t.name, t.thread_type, t.description, JSON.stringify(t.metadata), t.metadata.opened_at ?? null]
    )
    threadId.set(t.external_id, row.id)
  }
  // A ceremony the wheel no longer carries: its thread stays, marked archived.
  await sql.query(
    `UPDATE asterion.narrative_threads SET metadata = metadata || '{"archived": true}'::jsonb
      WHERE external_source = $1 AND NOT (external_id = ANY($2::text[]))`,
    [source, keep(plan.threads)]
  )

  for (const b of plan.beats) {
    await sql.query(
      `INSERT INTO asterion.narrative_beats (external_id, external_source, thread_id, tension_id, beat_type, title, content, metadata, created_at)
       VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,COALESCE($8::timestamptz, now()))
       ON CONFLICT (external_id, external_source) DO UPDATE SET
         thread_id = EXCLUDED.thread_id, beat_type = EXCLUDED.beat_type,
         title = EXCLUDED.title, content = EXCLUDED.content, metadata = EXCLUDED.metadata`,
      [b.external_id, source, threadId.get(b.thread_external_id), b.beat_type, b.title, b.content,
        JSON.stringify(b.metadata), b.created_at ?? null]
    )
  }
  // A turn no longer consented (or gone from the wheel): the row stays, its words do not.
  await sql.query(
    `UPDATE asterion.narrative_beats SET title = NULL, content = '',
       metadata = jsonb_build_object('wheel_id', external_id, 'withheld', true)
     WHERE external_source = $1 AND NOT (external_id = ANY($2::text[]))
       AND (content <> '' OR title IS NOT NULL)`,
    [source, keep(plan.beats)]
  )

  await sql.query(
    `INSERT INTO asterion.events (event_type, actor_type, actor_id, payload) VALUES ('circle.projected', $1, $2, $3)`,
    [actor.type, actor.id, JSON.stringify({
      external_source: source, project_id: project.id, mapper_version: MAPPER_VERSION,
      threads: plan.threads.length, turns: plan.beats.length, held: plan.held.length,
    })]
  )
  return { status: 'projected', counts: { threads: plan.threads.length, turns: plan.beats.length, held: plan.held.length } }
}
