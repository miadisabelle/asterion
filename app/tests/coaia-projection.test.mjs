// The chart projection's threads and beat times (miadisabelle/asterion#20 A38, A51):
// a chart family is a thread of type 'chart' whose state and opening come from
// its root chart, and a beat keeps the time it happened.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAPPER_VERSION, applyProjection, planProjection } from '../lib/asterion/coaia-projection.mjs'

/** A one-chart memory, as coaia-narrative writes it, with one beat. */
const memory = (status, beatTime = '2026-05-23T10:00:00.000Z') => [
  { type: 'entity', name: 'chart_1_chart', entityType: 'structural_tension_chart', observations: ['Chart one'],
    metadata: { chartId: 'chart_1', level: 0, createdAt: '2026-05-22T10:00:00.000Z', updatedAt: '2026-05-22T10:00:00.000Z', ...(status ? { status } : {}) } },
  { type: 'entity', name: 'chart_1_desired_outcome', entityType: 'desired_outcome', observations: ['A thread page that shows its state'], metadata: { chartId: 'chart_1' } },
  { type: 'entity', name: 'chart_1_current_reality', entityType: 'current_reality', observations: ['It shows none'], metadata: { chartId: 'chart_1' } },
  { type: 'entity', name: 'beat_1', entityType: 'narrative_beat', observations: ['Something happened'],
    metadata: { chartId: 'chart_1', ...(beatTime ? { timestamp: beatTime } : {}) } },
]

test('a chart family is a thread of type chart, opened when its root chart was created', () => {
  const [t] = planProjection(memory('active')).threads
  assert.equal(t.thread_type, 'chart')
  assert.equal(t.rootChartId, 'chart_1')
  assert.equal(t.opened_at, '2026-05-22T10:00:00.000Z')
  assert.equal(MAPPER_VERSION, 9)
})

test("the thread's state is read from its root chart, and the chart's own word is kept", () => {
  const state = (status) => {
    const [t] = planProjection(memory(status)).threads
    return [t.state, t.state_note]
  }
  assert.deepEqual(state('active'), ['active', 'active'])
  assert.deepEqual(state('paused'), ['deferred', 'paused'])
  assert.deepEqual(state('resolved'), ['resolved', 'resolved'])
  assert.deepEqual(state(undefined), ['active', null], 'no word in the record, the chart reads as active')
  assert.deepEqual(state('archived'), [null, 'archived'], 'a word with no match leaves the state empty')
})

test('a beat carries the time it happened, and none when the record has none', () => {
  assert.equal(planProjection(memory('active')).charts[0].beats[0].happened_at, '2026-05-23T10:00:00.000Z')
  assert.equal(planProjection(memory('active', null)).charts[0].beats[0].happened_at, null)
  assert.equal(planProjection(memory('active', 'not a time')).charts[0].beats[0].happened_at, null)
})

// Delayed resolution (miadi-chronicle Episode 297, coaia-narrative 0.24): a step keeps the
// choice to wait through ingest, its session never leaves the entity, and the chart thread
// says it is delaying resolution without touching the keeper's state.

const session = {
  sessionId: '79e16c02-0000', agent: 'claude', host: 'gaia', cwd: '/a/ws/private-dir', tmux: 't4-seat:0.0',
  resumeCommand: 'cd /a/ws/private-dir && claude --resume 79e16c02-0000', inventoryRecord: '/home/mia/workspace/.mino/session-inventory/79e16c02.json',
}
const chosen = { chosenAt: '2026-10-19T20:00:00.000Z', chosenBy: 'mia@gaia', reason: 'William answers D5 first', primaryChoice: 'A thread page that shows its state' }
const step = (name, observation, metadata) => ({ type: 'entity', name, entityType: 'action_step', observations: [observation], metadata: { chartId: 'chart_1', ...metadata } })

/** chart_1 with four written steps and one telescoped child chart, chart_2, whose desired outcome carries a delay. */
const delayMemory = () => [
  ...memory('active'),
  step('chart_1_action_1', 'Show a delayed step', {
    dueDate: '2026-11-02T00:00:00.000Z',
    delayedResolution: { ...chosen, resolveBy: '2026-11-02T00:00:00.000Z', wakeOn: ['William answers D5', 'the T4 seat lands'], session },
    delayedResolutionHistory: [{ ...chosen, resolveBy: '2026-10-25T00:00:00.000Z', session, endedAt: '2026-10-19T20:00:00.000Z' }],
  }),
  step('chart_1_action_2', 'A delay that ended', {
    delayedResolution: { ...chosen, resolveBy: '2026-10-22T00:00:00.000Z', session, endedAt: '2026-10-20T08:00:00.000Z', endedBy: 'william', outcome: 'released', endNote: 'went ahead' },
  }),
  step('chart_1_action_3', 'Completed while a delay stood', {
    completionStatus: true, delayedResolution: { ...chosen, resolveBy: '2026-10-21T00:00:00.000Z' },
  }),
  step('chart_1_action_4', 'A step with no delay', {}),
  { type: 'entity', name: 'chart_2_chart', entityType: 'structural_tension_chart', observations: ['Child'],
    metadata: { chartId: 'chart_2', parentChart: 'chart_1', level: 1, dueDate: '2026-10-25T00:00:00.000Z' } },
  { type: 'entity', name: 'chart_2_desired_outcome', entityType: 'desired_outcome', observations: ['The child outcome'],
    metadata: { chartId: 'chart_2', delayedResolution: { ...chosen, resolveBy: '2026-10-25T00:00:00.000Z', session } } },
  { type: 'entity', name: 'chart_2_current_reality', entityType: 'current_reality', observations: ['Not yet'], metadata: { chartId: 'chart_2' } },
]
const NOW = Date.parse('2026-10-20T12:00:00.000Z')
const stepsOf = (plan) => Object.fromEntries(plan.charts.find((c) => c.chartId === 'chart_1').steps.map((s) => [s.name, s]))

test('an open delay on a written step: status delayed, the record kept without its session', () => {
  const s = stepsOf(planProjection(delayMemory(), { now: NOW })).chart_1_action_1
  assert.equal(s.status, 'delayed')
  assert.deepEqual(s.delay, {
    resolveBy: '2026-11-02T00:00:00.000Z', chosenAt: '2026-10-19T20:00:00.000Z', chosenBy: 'mia@gaia',
    reason: 'William answers D5 first', primaryChoice: 'A thread page that shows its state',
    wakeOn: ['William answers D5', 'the T4 seat lands'],
  })
  assert.equal(s.delayHistoryCount, 1)
  assert.equal(s.dueDate, '2026-11-02T00:00:00.000Z')
  assert.ok(!JSON.stringify(s).includes('private-dir') && !JSON.stringify(s).includes('session'), 'no session reaches the step')
})

test('an ended delay: the step is pending again and carries how the delay ended', () => {
  const s = stepsOf(planProjection(delayMemory(), { now: NOW })).chart_1_action_2
  assert.equal(s.status, 'pending')
  assert.equal(s.delay.outcome, 'released')
  assert.equal(s.delay.endedAt, '2026-10-20T08:00:00.000Z')
  assert.equal(s.delay.endedBy, 'william')
  assert.ok(!JSON.stringify(s).includes('session'))
})

test('completed wins over an open delay, and a step with no delay carries no delay keys', () => {
  const steps = stepsOf(planProjection(delayMemory(), { now: NOW }))
  assert.equal(steps.chart_1_action_3.status, 'completed')
  assert.equal(steps.chart_1_action_4.status, 'pending')
  assert.ok(!('delay' in steps.chart_1_action_4) && !('delayHistoryCount' in steps.chart_1_action_4), 'a chart with no delay keeps the hash it had')
})

test("a telescoped step's delay is read from its child chart's desired outcome", () => {
  const s = stepsOf(planProjection(delayMemory(), { now: NOW }))['telescope:chart_2']
  assert.equal(s.status, 'delayed')
  assert.equal(s.delay.resolveBy, '2026-10-25T00:00:00.000Z')
  assert.equal(s.delayHistoryCount, 0)
  assert.ok(!JSON.stringify(s).includes('session'))
})

test("the chart thread says it is delaying resolution, earliest first, and keeps the keeper's state", () => {
  const [t] = planProjection(delayMemory(), { now: NOW }).threads
  assert.deepEqual([t.state, t.state_note], ['active', 'active'], 'state and state_note stay the keeper\'s words (D17)')
  assert.equal(t.delaying.resolveBy, '2026-10-25T00:00:00.000Z')
  assert.deepEqual(t.delaying.steps.map((x) => [x.step, x.chartId, x.resolveBy]), [
    ['telescope:chart_2', 'chart_1', '2026-10-25T00:00:00.000Z'],
    ['chart_1_action_1', 'chart_1', '2026-11-02T00:00:00.000Z'],
  ], 'open delays only: not the ended one, not the completed one')
  assert.equal(t.delaying.owed, false)
  assert.equal(t.delaying.asOf, '2026-10-20T12:00:00.000Z')
  const [later] = planProjection(delayMemory(), { now: Date.parse('2026-10-26T00:00:00.000Z') }).threads
  assert.equal(later.delaying.owed, true, 'owed once the earliest resolveBy has passed')
  const [none] = planProjection(memory('active')).threads
  assert.ok(!('delaying' in none), 'a family with no open delay carries none')
})

test('the write path stores the public delay on the step row and delaying on the thread, never the session', async () => {
  const calls = []
  const sql = { query: async (q, p = []) => { calls.push({ q, p }); return /RETURNING/.test(q) ? [{ id: `row-${calls.length}` }] : [] } }
  const plan = planProjection(delayMemory(), { now: NOW })
  await applyProjection(sql, plan, { project: { id: 'p1', external_id: 'fixture', metadata: {} }, actor: { type: 'test', id: 'test' } })
  const stepRow = (name) => JSON.parse(calls.find((c) => /INSERT INTO asterion\.action_steps/.test(c.q) && c.p[0] === name).p[7])
  assert.equal(stepRow('chart_1_action_1').delayedResolution.resolveBy, '2026-11-02T00:00:00.000Z')
  assert.equal(stepRow('chart_1_action_1').delayedResolutionHistoryCount, 1)
  assert.equal(stepRow('chart_1_action_2').delayedResolution.outcome, 'released')
  assert.ok(!('delayedResolution' in stepRow('chart_1_action_4')))
  const stepWrites = calls.filter((c) => /INSERT INTO asterion\.action_steps/.test(c.q))
  assert.equal(stepWrites.length, 5)
  assert.ok(stepWrites.every((c) => !JSON.stringify(c.p).includes('private-dir')), 'no step row carries the session')
  const statusOf = Object.fromEntries(stepWrites.map((c) => [c.p[0], c.p[5]]))
  assert.equal(statusOf.chart_1_action_1, 'delayed')
  assert.equal(statusOf['telescope:chart_2'], 'delayed')
  const thread = calls.find((c) => /INSERT INTO asterion\.narrative_threads/.test(c.q))
  const threadMeta = JSON.parse(thread.p[5])
  assert.equal(threadMeta.delaying.resolveBy, '2026-10-25T00:00:00.000Z')
  assert.deepEqual([thread.p[6], thread.p[7]], ['active', 'active'])
})
