// The circle projection against a real Postgres, inside one transaction that is
// rolled back (miadisabelle/asterion#11). It proves, with the queries the app
// itself filters by, that a second pass writes nothing and that a signed-out
// reader sees no row of a private circle. Nothing it writes survives.
//
//   ASTERION_DB_TEST=1 node --test tests/circle-projection.db.test.mjs
//
// Skipped unless ASTERION_DB_TEST=1, since it needs DATABASE_URL (.env.local).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyCircleProjection, planCircleProjection, sourceFor } from '../lib/asterion/circle-projection.mjs'
import { APP, loadTs } from './lib/load-ts.mjs'
import { loadEnv } from '../scripts/lib/connect.mjs'

const RUN = process.env.ASTERION_DB_TEST === '1'
const NOW = Date.parse('2026-10-06T12:00:00.000Z')
const CIRCLE = 'circle:1000000000000:fixt01'
const SOURCE = sourceFor(CIRCLE)

test('a private circle: a second pass writes nothing, and a signed-out reader sees none of it', { skip: !RUN && 'set ASTERION_DB_TEST=1' }, async () => {
  loadEnv()
  const { Pool } = await import('@neondatabase/serverless')
  const vis = await loadTs('lib/asterion/visibility.ts', { './writer': 'export const currentWriter = () => null' })
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  const sql = { query: async (text, params) => (await client.query(text, params)).rows }
  const count = async (text, params) => (await sql.query(`SELECT count(*)::int AS n FROM (${text}) q`, params))[0].n
  const views = async () => ({
    writer: {
      projects: await count(`SELECT id FROM asterion.projects WHERE external_source = 'medicine-wheel' AND external_id = $1`, [CIRCLE]),
      threads: await count(`SELECT id FROM asterion.narrative_threads WHERE external_source = $1`, [SOURCE]),
      turns: await count(`SELECT id FROM asterion.narrative_beats WHERE external_source = $1 AND content <> ''`, [SOURCE]),
    },
    public: {
      projects: await count(`SELECT id FROM asterion.projects WHERE external_source = 'medicine-wheel' AND external_id = $1 AND id NOT IN (${vis.PRIVATE_PROJECT_IDS})`, [CIRCLE]),
      threads: await count(`SELECT id FROM asterion.narrative_threads WHERE external_source = $1 AND id NOT IN (${vis.PRIVATE_THREAD_IDS})`, [SOURCE]),
      turns: await count(`SELECT b.id FROM asterion.narrative_beats b JOIN asterion.narrative_threads t ON t.id = b.thread_id
                           WHERE t.external_source = $1 AND b.thread_id NOT IN (${vis.PRIVATE_THREAD_IDS})`, [SOURCE]),
      events: await count(`SELECT id FROM asterion.events WHERE payload->>'external_source' = $1
                            AND COALESCE(payload->>'external_source', '') NOT IN (${vis.PRIVATE_SOURCES})`, [SOURCE]),
    },
  })
  const snapshot = JSON.parse(readFileSync(join(APP, 'tests', 'fixtures', 'circle.json'), 'utf8'))
  try {
    await client.query('BEGIN')
    assert.equal(await count(`SELECT id FROM asterion.projects WHERE external_source = 'medicine-wheel' AND external_id = $1`, [CIRCLE]), 0, 'the fixture circle is not in Asterion')

    const plan = planCircleProjection(snapshot, { now: NOW })
    assert.equal((await applyCircleProjection(sql, plan, { register: true })).status, 'projected')
    const after = await views()
    assert.deepEqual(after.writer, { projects: 1, threads: 2, turns: 3 })
    assert.deepEqual(after.public, { projects: 0, threads: 0, turns: 0, events: 0 }, 'a signed-out reader sees nothing of a private circle')

    const rows = async () => sql.query(`SELECT external_id, name, description, metadata::text FROM asterion.narrative_threads WHERE external_source = $1
                                        UNION ALL SELECT external_id, title, content, metadata::text FROM asterion.narrative_beats WHERE external_source = $1 ORDER BY 1`, [SOURCE])
    const before = await rows()
    assert.equal((await applyCircleProjection(sql, planCircleProjection(snapshot, { now: NOW }))).status, 'unchanged')
    assert.deepEqual(await rows(), before, 'the second pass changed no row')

    snapshot.circle.metadata.is_public = true
    assert.equal((await applyCircleProjection(sql, planCircleProjection(snapshot, { now: NOW }))).status, 'projected')
    const open = await views()
    assert.deepEqual({ ...open.public, events: undefined }, { projects: 1, threads: 2, turns: 3, events: undefined }, 'the same rows show once the circle is public')
  } finally {
    await client.query('ROLLBACK')
    const left = await count(`SELECT id FROM asterion.narrative_threads WHERE external_source = $1
                              UNION ALL SELECT id FROM asterion.projects WHERE external_source = 'medicine-wheel' AND external_id = $2`, [SOURCE, CIRCLE])
    client.release()
    await pool.end()
    assert.equal(left, 0, 'the rollback left nothing behind')
  }
})
