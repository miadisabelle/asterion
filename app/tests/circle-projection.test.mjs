// The circle projection (miadisabelle/asterion#11): what a synthetic circle
// becomes, whose words enter, and that a second pass writes nothing.
//
//   node --test tests/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  SYSTEM, applyCircleProjection, consentHolds, consentingPeople, planCircleProjection, sourceFor,
} from '../lib/asterion/circle-projection.mjs'
import { APP } from './lib/load-ts.mjs'

const CIRCLE = 'circle:1000000000000:fixt01'
const NOW = Date.parse('2026-10-06T12:00:00.000Z')
const fixture = () => JSON.parse(readFileSync(join(APP, 'tests', 'fixtures', 'circle.json'), 'utf8'))
const plan = (snapshot = fixture()) => planCircleProjection(snapshot, { now: NOW })
const without = (snapshot, consentId) => ({ ...snapshot, consents: snapshot.consents.filter((c) => c.id !== consentId) })

const record = (over = {}) => ({
  id: 'consent:x', grantor: 'node:human:ada', grantee: 'asterion',
  scope: { description: '', dataTypes: [CIRCLE], purposes: ['asterion-projection'], restrictions: [] },
  state: 'active', ceremonies: [], history: [], communityLevel: false,
  dependentRelations: [], ocapFlags: { compliant: false }, ...over,
})

// ---------- consent ----------

test('a consent holds only for its grantor, for Asterion, for this circle, in scope, while it stands', () => {
  const ada = 'node:human:ada'
  assert.equal(consentHolds(record(), ada, CIRCLE, NOW), true)
  assert.equal(consentHolds(record({ state: 'granted' }), ada, CIRCLE, NOW), true)
  assert.equal(consentHolds(record({ state: 'pending' }), ada, CIRCLE, NOW), false)
  assert.equal(consentHolds(record({ state: 'withdrawn' }), ada, CIRCLE, NOW), false)
  assert.equal(consentHolds(record({ state: 'expired' }), ada, CIRCLE, NOW), false)
  assert.equal(consentHolds(record({ expiresAt: '2026-10-01T00:00:00.000Z' }), ada, CIRCLE, NOW), false)
  assert.equal(consentHolds(record({ expiresAt: '2027-01-01T00:00:00.000Z' }), ada, CIRCLE, NOW), true)
  assert.equal(consentHolds(record(), 'node:human:bo', CIRCLE, NOW), false, 'someone else cannot consent for Ada')
  assert.equal(consentHolds(record({ grantee: 'honcho' }), ada, CIRCLE, NOW), false)
  assert.equal(consentHolds(record({ scope: { description: '', dataTypes: ['circle:other'], purposes: ['asterion-projection'], restrictions: [] } }), ada, CIRCLE, NOW), false, 'another circle')
  assert.equal(consentHolds(record({ scope: { description: '', dataTypes: ['*'], purposes: ['asterion-projection'], restrictions: [] } }), ada, CIRCLE, NOW), true, 'every circle')
  assert.equal(consentHolds(record({ scope: { description: '', dataTypes: [CIRCLE], purposes: ['research'], restrictions: [] } }), ada, CIRCLE, NOW), false)
  assert.equal(consentHolds(record({ scope: { description: '', dataTypes: ['*'], purposes: ['*'], restrictions: ['no asterion-projection'] } }), ada, CIRCLE, NOW), false)
})

test('a record shaped as mw_consent_grant writes it counts', () => {
  // @medicine-wheel/mcp mw_consent_grant: scope from dataTypes and purposes, dependentRelations empty, state set by grantConsent.
  const granted = record({ state: 'granted', dependentRelations: [], ocapFlags: { compliant: false } })
  assert.equal(consentHolds(granted, 'node:human:ada', CIRCLE, NOW), true)
})

test('consenting people are read from the consent nodes on the wheel', () => {
  const yes = consentingPeople(fixture().consents, CIRCLE, NOW)
  assert.deepEqual([...yes].sort(), ['node:human:ada', 'node:human:bo'])
})

// ---------- planning ----------

test("without the facilitator's consent nothing is written, and the plan says why", () => {
  const p = plan(without(fixture(), 'consent:fixt-ada'))
  assert.equal(p.project, null)
  assert.deepEqual(p.threads, [])
  assert.deepEqual(p.beats, [])
  assert.deepEqual(p.held.map((h) => `${h.kind} ${h.wheel_id}`), [
    `circle ${CIRCLE}`, 'ceremony ceremony:fixt-c1', 'ceremony ceremony:fixt-c2',
    'turn beat:fixt-t1', 'turn beat:fixt-t2', 'turn beat:fixt-t3', 'turn beat:fixt-t4', 'turn beat:fixt-t5',
  ])
  assert.match(p.held[0].reason, /facilitator's consent \(node:human:ada\)/)
})

test('seated people are the facilitator and the members, each with their consent', () => {
  assert.deepEqual(plan().seated, [
    { id: 'node:human:ada', name: 'Ada', role: 'facilitator', consented: true },
    { id: 'node:human:bo', name: 'Bo', role: 'member', consented: true },
    { id: 'node:human:cy', name: 'Cy', role: 'member', consented: false },
  ])
})

test("the facilitator's consent carries the circle and its ceremonies, and a closing closes a thread", () => {
  const p = plan()
  assert.equal(p.source, sourceFor(CIRCLE))
  assert.equal(p.project.external_id, CIRCLE)
  assert.equal(p.project.name, 'Fixture circle')
  assert.equal(p.project.description, 'Hear what the week taught us')
  assert.equal(p.project.metadata.visibility, 'private')
  assert.deepEqual(p.threads.map((t) => [t.external_id, t.name, t.thread_type]), [
    ['ceremony:fixt-c1', 'Name what the week taught us', 'ceremony'],
    ['ceremony:fixt-c2', 'talking circle, south, 2026-10-03', 'ceremony'],
  ])
  const [c1, c2] = p.threads
  assert.equal(c1.metadata.closed_at, '2026-10-01T11:00:00.000Z')
  assert.equal(c1.metadata.closing_id, 'ceremony:fixt-c1-close')
  assert.equal(c1.metadata.episode_path, '2026-10-01-episode-900-fixture')
  assert.equal(c1.metadata.miadi_path, '/ceremony/ceremony%3Afixt-c1')
  assert.equal(c2.metadata.closed_at, undefined)
  assert.equal(c2.metadata.subject_id, 'review:00000000-0000-0000-0000-000000000000')
})

test("each speaker's consent carries only their own turns, in the order they were spoken", () => {
  const p = plan()
  assert.deepEqual(p.beats.map((b) => [b.external_id, b.thread_external_id, b.metadata.speaker.name]), [
    ['beat:fixt-t1', 'ceremony:fixt-c1', 'Ada'],
    ['beat:fixt-t2', 'ceremony:fixt-c1', 'Bo'],
    ['beat:fixt-t4', 'ceremony:fixt-c2', 'Bo'],
  ])
  assert.equal(p.beats[0].content, 'We begin by listening.\nEach of us says one thing.')
  assert.equal(p.beats[0].created_at, '2026-10-01T10:05:00.000Z')
  assert.deepEqual(p.held.map((h) => `${h.wheel_id}: ${h.reason}`), [
    "beat:fixt-t3: waiting for the speaker's consent (node:human:cy)",
    'beat:fixt-t5: the turn names no speaker',
  ])
  const heldText = JSON.stringify(p.held)
  assert.ok(!heldText.includes('Words Cy has not shared') && !heldText.includes('Words with no speaker'), 'a held turn carries no words')
})

test('a witness is named only with their own consent', () => {
  const [t1, t2] = plan().beats
  assert.deepEqual(t1.metadata.witnesses, [{ id: 'node:human:bo', name: 'Bo' }])
  assert.deepEqual(t2.metadata.witnesses, [{ id: 'node:human:ada', name: 'Ada' }])
})

test("a speaker's withdrawal takes their turns out of the plan", () => {
  const snapshot = fixture()
  snapshot.consents.find((c) => c.id === 'consent:fixt-bo').metadata.full_record.state = 'withdrawn'
  assert.deepEqual(plan(snapshot).beats.map((b) => b.external_id), ['beat:fixt-t1'])
})

test('a public circle is a public project', () => {
  const snapshot = fixture()
  snapshot.circle.metadata.is_public = true
  assert.equal(plan(snapshot).project.metadata.visibility, 'public')
  assert.equal(plan(snapshot).visibility, 'public')
})

test('planning twice gives the same plan, and a new turn changes its hash', () => {
  assert.deepEqual(plan(), plan())
  const snapshot = fixture()
  snapshot.turns.push({ ...snapshot.turns[1], id: 'beat:fixt-t6', timestamp: '2026-10-01T10:30:00.000Z' })
  assert.notEqual(plan(snapshot).hash, plan().hash)
})

// ---------- writing ----------

/** A stand-in for Neon's `sql`: records every statement, answers like the database would. */
function fakeSql(existing = null) {
  const log = []
  let n = 0
  return {
    log,
    async query(text, params = []) {
      log.push({ text: text.replace(/\s+/g, ' ').trim(), params })
      if (/^SELECT id, metadata FROM asterion\.projects/.test(log.at(-1).text)) return existing ? [existing] : []
      if (/RETURNING id/.test(text)) return [{ id: `row-${++n}` }]
      return []
    },
  }
}

test('the first pass registers the circle, and every write is an upsert on its source', async () => {
  const p = plan()
  const sql = fakeSql()
  const result = await applyCircleProjection(sql, p, { register: true })
  assert.equal(result.status, 'projected')
  assert.deepEqual(result.counts, { threads: 2, turns: 3, held: 2 })
  const writes = sql.log.filter((q) => !q.text.startsWith('SELECT'))
  assert.ok(writes.every((q) => !/\bDELETE\b|\bTRUNCATE\b|\bDROP\b/i.test(q.text)), 'nothing is deleted')
  const inserts = writes.filter((q) => q.text.startsWith('INSERT INTO asterion.'))
  assert.deepEqual(inserts.map((q) => q.text.match(/^INSERT INTO asterion\.(\w+)/)[1]), [
    'projects', 'narrative_threads', 'narrative_threads', 'narrative_beats', 'narrative_beats', 'narrative_beats', 'events',
  ])
  assert.ok(inserts.slice(0, -1).every((q) => q.text.includes('ON CONFLICT (external_id, external_source) DO UPDATE')))
  const beat = inserts.find((q) => q.text.startsWith('INSERT INTO asterion.narrative_beats'))
  assert.deepEqual(beat.params.slice(0, 3), ['beat:fixt-t1', sourceFor(CIRCLE), 'row-2'], 'a turn is held by its thread, named by its wheel id')
  assert.equal(JSON.parse(inserts[0].params[4]).projection.hash, p.hash)
})

test('a second pass over the same circle writes nothing', async () => {
  const p = plan()
  const sql = fakeSql({ id: 'row-1', metadata: { projection: { hash: p.hash, mapper_version: 1 } } })
  const result = await applyCircleProjection(sql, p)
  assert.equal(result.status, 'unchanged')
  assert.equal(sql.log.length, 1, 'one read, no write')
})

test('a circle that was never registered is not written by sync', async () => {
  const sql = fakeSql()
  assert.equal((await applyCircleProjection(sql, plan())).status, 'not-registered')
  assert.equal(sql.log.length, 1)
})

test('register refuses a circle whose facilitator has not consented', async () => {
  const sql = fakeSql()
  const result = await applyCircleProjection(sql, plan(without(fixture(), 'consent:fixt-ada')), { register: true })
  assert.equal(result.status, 'not-registered')
  assert.equal(sql.log.length, 1)
})

test("a facilitator's withdrawal empties every word and keeps every row", async () => {
  const sql = fakeSql({ id: 'row-1', metadata: { projection: { hash: plan().hash, mapper_version: 1 } } })
  const result = await applyCircleProjection(sql, plan(without(fixture(), 'consent:fixt-ada')))
  assert.equal(result.status, 'withheld')
  const writes = sql.log.slice(1).map((q) => q.text)
  assert.equal(writes.length, 3)
  assert.ok(writes.every((t) => t.startsWith('UPDATE asterion.')))
  assert.match(writes[2], /SET title = NULL, content = ''/)
  assert.equal(JSON.parse(sql.log[1].params[1]).visibility, 'private')
})

test('turns no longer consented keep their row with the words emptied', async () => {
  const sql = fakeSql({ id: 'row-1', metadata: { projection: { hash: 'older', mapper_version: 1 } } })
  await applyCircleProjection(sql, plan())
  const blank = sql.log.find((q) => q.text.startsWith("UPDATE asterion.narrative_beats SET title = NULL, content = ''"))
  assert.deepEqual(blank.params, [sourceFor(CIRCLE), ['beat:fixt-t1', 'beat:fixt-t2', 'beat:fixt-t4']])
  assert.equal(SYSTEM, 'medicine-wheel')
})
