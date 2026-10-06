#!/usr/bin/env node
// The circle registry: which Miadi circles Asterion keeps current (miadisabelle/asterion#11).
//
//   node scripts/circle-sync.mjs plan <circle-id> [--json]   what a sync would write; reads the wheel only
//   node scripts/circle-sync.mjs register <circle-id>        first sync; refused until the facilitator consents
//   node scripts/circle-sync.mjs sync [<circle-id>]          re-project registered circles
//   node scripts/circle-sync.mjs list
//
// A circle is one asterion.projects row (external_source 'medicine-wheel'),
// fed only by this sync, which pulls from the wheel. Nothing posts circles to
// Asterion, so a pass can never race a second transport, and Miadi never waits
// on Asterion. The wheel is MIADI_CHRONICLE_MW_URL (or MW_API_URL), else
// http://127.0.0.1:8040, the chronicle wheel as gaia reaches it.
//
// What enters is decided per person, on the wheel, by consent records this
// script only reads (lib/asterion/circle-projection.mjs says which record
// counts). `plan` shows who is seated, who has consented, the rows a sync would
// write, and every row held back with the reason. It never connects to Asterion.
// A private circle is a private project: only signed-in writers see its rows.

import { connect, hostOf, invalidateCaches, loadEnv } from './lib/connect.mjs'
import {
  CACHE_PATTERNS, CIRCLE_ID_PATTERN, CONSENT, SYSTEM, applyCircleProjection, planCircleProjection, readCircle, wheelClient,
} from '../lib/asterion/circle-projection.mjs'
import { wheelUrlFromEnv } from '@medicine-wheel/client'

const [cmd, ...argv] = process.argv.slice(2)
const has = (name) => argv.includes(name)
const positional = argv.find((a) => !a.startsWith('--'))

loadEnv()
const wheelUrl = wheelUrlFromEnv() ?? 'http://127.0.0.1:8040'
const wheel = wheelClient(wheelUrl)

async function planFor(circleId) {
  if (!CIRCLE_ID_PATTERN.test(circleId ?? '')) throw new Error(`not a circle id: ${circleId ?? '(none)'}`)
  const snapshot = await readCircle(wheel, circleId)
  if (!snapshot) throw new Error(`the wheel holds no circle ${circleId}`)
  return planCircleProjection(snapshot)
}

function print(plan) {
  console.log(`circle ${plan.circleId}  →  ${plan.source}  (${plan.visibility === 'private' ? 'private: signed-in writers only' : 'public'})\n`)
  console.log('seated')
  for (const p of plan.seated) console.log(`  ${p.role.padEnd(11)} ${p.name}  ${p.id}  ${p.consented ? 'consented' : 'no consent recorded'}`)
  console.log(`\nwould write`)
  if (plan.project) console.log(`  project  ${plan.project.external_id}  "${plan.project.name}"`)
  for (const t of plan.threads) {
    console.log(`  thread   ${t.external_id}  "${t.name}"  ${t.metadata.closed_at ? `closed ${t.metadata.closed_at}` : 'open'}`)
    for (const b of plan.beats.filter((x) => x.thread_external_id === t.external_id)) {
      console.log(`    turn   ${b.external_id}  ${b.metadata.speaker.name}  "${b.title ?? ''}"`)
    }
  }
  if (!plan.project && !plan.threads.length && !plan.beats.length) console.log('  nothing')
  console.log(`\nheld for consent`)
  for (const h of plan.held) console.log(`  ${h.kind.padEnd(8)} ${h.wheel_id}  ${h.reason}`)
  if (!plan.held.length) console.log('  nothing')
  console.log(`\nA consent counts when its grantor is the person, its grantee '${CONSENT.grantee}', and its scope covers data type ${plan.circleId} for purpose '${CONSENT.purpose}'.`)
}

async function planCmd() {
  const plan = await planFor(positional)
  if (has('--json')) console.log(JSON.stringify(plan, null, 2))
  else print(plan)
  console.log(`\ndry run: read from ${wheelUrl}, wrote nothing to Asterion`)
}

async function register(sql) {
  const plan = await planFor(positional)
  if (!plan.project) {
    print(plan)
    console.error(`\nnot registered: ${plan.held[0]?.reason ?? 'nothing to project'}`)
    process.exit(2)
  }
  const result = await applyCircleProjection(sql, plan, { register: true })
  console.log(`registered ${plan.project.name} as ${plan.source}: ${result.status}`, result.counts ?? '')
  const cache = await invalidateCaches(CACHE_PATTERNS)
  if (cache.error) console.log(`caches not dropped: ${cache.error}`)
}

async function registered(sql) {
  return sql.query(
    `SELECT p.external_id, p.name, p.metadata,
            (SELECT count(*)::int FROM asterion.narrative_threads t WHERE t.external_source = $1 || ':' || p.external_id) AS threads
       FROM asterion.projects p WHERE p.external_source = $1 ORDER BY p.created_at`,
    [SYSTEM]
  )
}

async function list(sql) {
  const rows = await registered(sql)
  if (!rows.length) { console.log('no registered circles'); return }
  for (const r of rows) {
    console.log(`${r.external_id}  ${r.name}  (${r.threads} ceremony thread(s))${r.metadata?.visibility === 'private' ? '  PRIVATE' : ''}${r.metadata?.withheld ? '  WITHHELD' : ''}`)
  }
}

async function sync(sql) {
  const rows = (await registered(sql)).filter((r) => !positional || r.external_id === positional)
  if (positional && !rows.length) { console.error(`${positional} is not registered`); process.exit(1) }
  let wrote = false
  for (const r of rows) {
    try {
      const plan = await planFor(r.external_id)
      const result = await applyCircleProjection(sql, plan)
      console.log(`${r.external_id}  ${result.status}`, result.counts ?? '')
      if (result.status !== 'unchanged') wrote = true
    } catch (err) {
      console.log(`${r.external_id}  skipped: ${err instanceof Error ? err.message : String(err)}`)
      process.exitCode = 2
    }
  }
  if (wrote) {
    const cache = await invalidateCaches(CACHE_PATTERNS)
    if (cache.error) console.log(`caches not dropped: ${cache.error}`)
  }
}

if (!['plan', 'register', 'list', 'sync'].includes(cmd)) {
  console.error('usage: node scripts/circle-sync.mjs <plan|register|list|sync> …  (see the header of this file)')
  process.exit(1)
}
try {
  if (cmd === 'plan') await planCmd()
  else {
    const sql = await connect()
    if (cmd !== 'list') console.log(`asterion → ${hostOf(process.env.DATABASE_URL)}  ·  wheel → ${wheelUrl}\n`)
    await { register, list, sync }[cmd](sql)
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
