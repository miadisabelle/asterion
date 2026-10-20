// Delayed resolution on the read side (miadi-chronicle Episode 297): the session a delay
// would rehydrate reaches signed-in writers only, and a step row shows the delay.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { publicEntity, withoutDelaySessions } from '../lib/asterion/delayed-resolution.mjs'
import { APP, loadTs } from './lib/load-ts.mjs'

const real = (file) => `export * from '${pathToFileURL(join(APP, file)).href}'`

const session = { sessionId: 's-1', agent: 'claude', host: 'gaia', cwd: '/a/ws/private-dir', tmux: 't4:0.0', resumeCommand: 'cd /a/ws/private-dir && claude --resume s-1' }
const delayedEntity = () => ({
  id: 'e1',
  name: 'chart_1_action_1',
  entity_type: 'action_step',
  external_source: 'coaia-narrative:fixture',
  metadata: {
    chartId: 'chart_1',
    delayedResolution: { resolveBy: '2026-11-02T00:00:00.000Z', reason: 'wait', chosenBy: 'mia', session },
    delayedResolutionHistory: [{ resolveBy: '2026-10-25T00:00:00.000Z', endedAt: '2026-10-19T00:00:00.000Z', session }, { resolveBy: '2026-10-01T00:00:00.000Z' }],
  },
})

test('publicEntity removes the session of the open delay and of every earlier one, and nothing else', () => {
  const e = delayedEntity()
  const out = publicEntity(e)
  assert.ok(!JSON.stringify(out).includes('private-dir'))
  assert.equal(out.metadata.delayedResolution.reason, 'wait')
  assert.equal(out.metadata.delayedResolutionHistory.length, 2)
  assert.equal(out.metadata.chartId, 'chart_1')
  assert.equal(e.metadata.delayedResolution.session.cwd, '/a/ws/private-dir', 'the row read from the database is not changed')
  const plain = { id: 'e2', metadata: { chartId: 'chart_1' } }
  assert.equal(publicEntity(plain), plain, 'an entity with no session passes through as it is')
  assert.equal(withoutDelaySessions(plain.metadata), plain.metadata)
})

test('GET /api/entities: an anonymous viewer never receives a delay session, a writer does', async () => {
  const { getEntities } = await loadTs('lib/asterion/data.ts', {
    './db': 'export const sql = Object.assign(async () => [], { query: async () => [globalThis.__delayedEntity()] })',
    './redis': 'export const invalidateCache = async () => {}; export const getCache = async () => null; export const setCache = async () => {}',
    './coaia-projection.mjs': real('lib/asterion/coaia-projection.mjs'),
    './delayed-resolution.mjs': real('lib/asterion/delayed-resolution.mjs'),
    './visibility': `export const seesPrivate = (viewer) => viewer?.includePrivate === true
      export const PRIVATE_PROJECT_IDS = 'SELECT 1', PRIVATE_SOURCES = 'SELECT 1', PRIVATE_TENSION_IDS = 'SELECT 1', PRIVATE_THREAD_IDS = 'SELECT 1'`,
  })
  globalThis.__delayedEntity = delayedEntity
  const anonymous = await getEntities(undefined, { includePrivate: false })
  assert.ok(!JSON.stringify(anonymous).includes('private-dir'))
  assert.ok(!JSON.stringify(anonymous).includes('resumeCommand'))
  assert.equal(anonymous[0].metadata.delayedResolution.resolveBy, '2026-11-02T00:00:00.000Z')
  const writer = await getEntities(undefined, { includePrivate: true })
  assert.equal(writer[0].metadata.delayedResolution.session.cwd, '/a/ws/private-dir')
})

test('a step row shows until when, how long, why, what the wait serves and what wakes it', async () => {
  const { StepDelay } = await loadTs('components/asterion/badges.tsx', {
    '@/lib/utils': "export const cn = (...a) => a.filter(Boolean).join(' ')",
    '@/lib/asterion/delayed-resolution.mjs': real('lib/asterion/delayed-resolution.mjs'),
  })
  const now = Date.parse('2026-10-20T12:00:00.000Z')
  const render = (metadata, at = now) => renderToStaticMarkup(createElement(StepDelay, { metadata, now: at }))
  const open = {
    dueDate: '2026-11-02T00:00:00.000Z',
    delayedResolution: { resolveBy: '2026-11-02T00:00:00.000Z', reason: 'William answers D5 first', primaryChoice: 'A thread page that shows its state', wakeOn: ['William answers D5', 'the T4 seat lands'] },
  }
  const html = render(open)
  assert.match(html, /delayed until 2026-11-02 · in 13 days/)
  assert.match(html, /Why wait: William answers D5 first/)
  assert.match(html, /Serves: A thread page that shows its state/)
  assert.match(html, /Wake on: William answers D5 · the T4 seat lands/)
  assert.ok(!html.includes('due 2026-11-02'), 'the due date is the delay date, said once')
  assert.match(render(open, Date.parse('2026-11-03T00:00:00.000Z')), /delayed until 2026-11-02 · owed/)
  assert.match(render({ dueDate: '2026-12-01T00:00:00.000Z' }), /due 2026-12-01/, 'a step due date shows without a delay')
  const ended = render({ delayedResolution: { resolveBy: '2026-10-22T00:00:00.000Z', endedAt: '2026-10-20T08:00:00.000Z', outcome: 'released', reason: 'x', wakeOn: [] } })
  assert.match(ended, /delay ended 2026-10-20 · released/)
  assert.ok(!ended.includes('Why wait'), 'an ended delay shows how it ended, not its reasons')
  assert.equal(render({}), '')
})
