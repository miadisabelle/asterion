// The thread page's turns, rendered from the fixture circle's plan
// (miadisabelle/asterion#11): what the projector would write is what the page shows.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { planCircleProjection } from '../lib/asterion/circle-projection.mjs'
import { APP, loadTs } from './lib/load-ts.mjs'

const { ThreadTurns, spokenAt } = await loadTs('components/asterion/thread-turns.tsx')
const snapshot = JSON.parse(readFileSync(join(APP, 'tests', 'fixtures', 'circle.json'), 'utf8'))
const plan = planCircleProjection(snapshot, { now: Date.parse('2026-10-06T12:00:00.000Z') })

/** The rows the page reads back from /api/threads/<id>, for the first ceremony. */
const turns = plan.beats
  .filter((b) => b.thread_external_id === 'ceremony:fixt-c1')
  .map((b, i) => ({ id: `row-${i}`, title: b.title, content: b.content, created_at: b.created_at, metadata: b.metadata }))
const render = (t) => renderToStaticMarkup(createElement(ThreadTurns, { turns: t }))

test('the thread page renders each turn: speaker, time, title, words, learnings, witnesses', () => {
  const html = render(turns)
  assert.match(html, /<ol[^>]*aria-label="Turns"/)
  assert.equal((html.match(/<li class="rounded-lg border bg-card/g) ?? []).length, 2)
  assert.ok(html.indexOf('Ada') < html.indexOf('Bo speaks'), 'in the order they were spoken')
  assert.match(html, /2026-10-01 10:05 UTC/)
  assert.match(html, /Ada opens/)
  assert.match(html, /We begin by listening\.\nEach of us says one thing\./)
  assert.match(html, /Listening first slows us down/)
  assert.match(html, /Witnessed by Bo</)
  assert.match(html, /The tests caught it before anyone saw it\./)
  assert.ok(!html.includes('Cy'), 'a turn or witness without consent never reaches the page')
})

test('a withheld turn keeps its place without its words', () => {
  const html = render([...turns, { id: 'row-x', title: null, content: '', created_at: '2026-10-01T10:20:00.000Z', metadata: { wheel_id: 'beat:fixt-t3', withheld: true } }])
  assert.match(html, /A turn whose words are not held here\./)
})

test('a thread with no turn says so, and shows no count', () => {
  const html = render([])
  assert.match(html, /No turn has been carried here yet\./)
  assert.ok(!/\d+ turns?/.test(render(turns)), 'no engagement count')
})

test('spokenAt writes a UTC minute and nothing for a missing time', () => {
  assert.equal(spokenAt('2026-10-01T10:05:59.000Z'), '2026-10-01 10:05 UTC')
  assert.equal(spokenAt(undefined), '')
  assert.equal(spokenAt('not a date'), '')
})
