// The chart projection's threads and beat times (miadisabelle/asterion#20 A38, A51):
// a chart family is a thread of type 'chart' whose state and opening come from
// its root chart, and a beat keeps the time it happened.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAPPER_VERSION, planProjection } from '../lib/asterion/coaia-projection.mjs'

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
  assert.equal(MAPPER_VERSION, 7)
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
