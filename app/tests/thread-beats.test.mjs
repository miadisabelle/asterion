// The thread page's beats (miadisabelle/asterion#11, miadisabelle/asterion#20 A39),
// rendered from fixtures: a ceremony's turns from the fixture circle's plan, and
// a chart family's beats as GET /api/threads/<id> returns them.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { planCircleProjection } from '../lib/asterion/circle-projection.mjs'
import { APP, loadTs } from './lib/load-ts.mjs'

const { ThreadBeats, emptyLine, spokenAt } = await loadTs('components/asterion/thread-beats.tsx')
const snapshot = JSON.parse(readFileSync(join(APP, 'tests', 'fixtures', 'circle.json'), 'utf8'))
const plan = planCircleProjection(snapshot, { now: Date.parse('2026-10-06T12:00:00.000Z') })

/** The rows the page reads back from /api/threads/<id>, for the first ceremony. */
const turns = plan.beats
  .filter((b) => b.thread_external_id === 'ceremony:fixt-c1')
  .map((b, i) => ({ id: `row-${i}`, beat_type: 'turn', tension_id: null, title: b.title, content: b.content, created_at: b.created_at, metadata: b.metadata }))
const render = (beats, props = {}) => renderToStaticMarkup(createElement(ThreadBeats, { beats, empty: emptyLine('ceremony'), ...props }))

test("a ceremony's turns: speaker, time, title, words, learnings, witnesses", () => {
  const html = render(turns)
  assert.match(html, /<ol[^>]*aria-label="Beats"/)
  assert.equal((html.match(/<li class="rounded-lg border bg-card/g) ?? []).length, 2)
  assert.ok(html.indexOf('Ada') < html.indexOf('Bo speaks'), 'in the order they were spoken')
  assert.match(html, /2026-10-01 10:05 UTC/)
  assert.match(html, /Ada opens/)
  assert.match(html, /We begin by listening\.\nEach of us says one thing\./)
  assert.match(html, /Listening first slows us down/)
  assert.match(html, /Witnessed by Bo</)
  assert.match(html, /The tests caught it before anyone saw it\./)
  assert.ok(!html.includes('Cy'), 'a turn or witness without consent never reaches the page')
  assert.ok(!html.includes('>turn<'), 'a turn shows no kind chip')
})

test('a withheld turn keeps its place without its words', () => {
  const html = render([...turns, { id: 'row-x', title: null, content: '', created_at: '2026-10-01T10:20:00.000Z', metadata: { wheel_id: 'beat:fixt-t3', withheld: true } }])
  assert.match(html, /A turn whose words are not held here\./)
})

test("a chart family's beats name their chart and kind, in the order they happened", () => {
  const charts = { 't-root': 'Root chart', 't-child': 'Telescoped chart' }
  const beats = [
    { id: 'b1', beat_type: 'mmot_evaluation', tension_id: 't-child', title: 'Evaluated the step', content: 'Evaluated the step\nIt held.', created_at: '2026-08-02T03:15:57.035Z', metadata: { timestamp: '2026-08-02T03:15:57.035Z' } },
    { id: 'b2', beat_type: 'resolution', tension_id: 't-root', title: 'Resolved', content: 'Resolved', created_at: '2026-08-16T04:21:54.966Z', metadata: {} },
  ]
  const html = render(beats, { charts, empty: emptyLine('chart-family') })
  assert.ok(html.indexOf('Telescoped chart') < html.indexOf('Root chart'))
  assert.match(html, /2026-08-02 03:15 UTC/)
  assert.match(html, />mmot_evaluation</)
  assert.match(html, />resolution</)
  assert.ok(!html.includes('<h3'), 'a title that opens the content is not repeated')
  assert.ok(!html.includes('Someone'))
})

test('an empty thread says what it is waiting for, by type, and no thread shows a count', () => {
  assert.match(render([], { empty: emptyLine('ceremony') }), /No consented turn has been carried here yet\./)
  assert.match(render([], { empty: emptyLine('chart-family') }), /The charts in this family carry no beat yet\./)
  assert.match(render([], { empty: emptyLine(null) }), /Nothing has been carried into this thread yet\./)
  assert.ok(!/\d+ (turns?|beats?)/.test(render(turns)), 'no engagement count')
})

test('spokenAt writes a UTC minute and nothing for a missing time', () => {
  assert.equal(spokenAt('2026-10-01T10:05:59.000Z'), '2026-10-01 10:05 UTC')
  assert.equal(spokenAt(undefined), '')
  assert.equal(spokenAt('not a date'), '')
})
