#!/usr/bin/env node
// Provision a fresh Asterion database.
//
// The v0 draft created its tables through the Neon console, so the schema lived
// only inside one instance. db/schema.sql is that schema, introspected back out.
// This applies it — and the layer taxonomy the app reads — to whatever
// DATABASE_URL points at.
//
//   node scripts/db-provision.mjs                 apply schema, migrations, reference data
//   node scripts/db-provision.mjs --schema        schema and migrations only
//   node scripts/db-provision.mjs --migration 001 one migration, nothing else
//   node scripts/db-provision.mjs --verify        report what is there, change nothing
//
// A change to a live database is a numbered file in db/migrations/
// (NNN-what-it-does.sql), written to replay as a no-op, and applied alone with
// --migration. A fresh database gets schema.sql, then every migration in order.
//
// Idempotent: replaying against a provisioned database is a no-op.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { neon } from '@neondatabase/serverless'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = new Set(process.argv.slice(2))

// .env.local is the local convention; a DATABASE_URL already in the environment wins.
if (!process.env.DATABASE_URL) {
  for (const f of ['.env.local', '.env']) {
    const p = join(ROOT, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*"?(.*?)"?\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
    break
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

// Split on semicolons that sit outside single-quoted strings.
//
// Comments are stripped first, and that is not cosmetic: an apostrophe inside a
// `-- comment` ("the factory's surface") would otherwise open a string literal
// and swallow every semicolon after it, fusing the whole file into one statement.
export function statements(text) {
  const out = []
  let buf = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (!quoted && c === '-' && text[i + 1] === '-') {
      const nl = text.indexOf('\n', i)
      i = nl === -1 ? text.length : nl
      buf += '\n'
      continue
    }
    if (!quoted && c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      i = end === -1 ? text.length : end + 1
      continue
    }
    if (c === "'") {
      if (quoted && text[i + 1] === "'") { buf += "''"; i++; continue }
      quoted = !quoted
    }
    if (c === ';' && !quoted) { out.push(buf.trim()); buf = ''; continue }
    buf += c
  }
  if (buf.trim()) out.push(buf.trim())
  return out.filter(Boolean)
}

const EXISTS = /already exists|duplicate (object|key|table)/i

async function apply(file) {
  const path = join(ROOT, 'db', file)
  if (!existsSync(path)) { console.error(`missing ${path}`); process.exit(1) }
  const stmts = statements(readFileSync(path, 'utf8'))
  let applied = 0, skipped = 0
  for (const stmt of stmts) {
    try {
      await sql.query(stmt)
      applied++
    } catch (err) {
      if (EXISTS.test(err.message)) { skipped++; continue }
      console.error(`\n  failed: ${stmt.slice(0, 120).replace(/\s+/g, ' ')}…\n  ${err.message}`)
      process.exit(1)
    }
  }
  console.log(`  ${file}: ${applied} applied, ${skipped} already present (${stmts.length} statements)`)
}

async function verify() {
  const tables = await sql.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'asterion' ORDER BY tablename`
  )
  if (!tables.length) {
    console.log('schema "asterion" is empty or absent — run without --verify to provision')
    return
  }
  console.log(`schema "asterion": ${tables.length} tables`)
  for (const { tablename } of tables) {
    const r = await sql.query(`SELECT count(*)::int AS n FROM asterion.${tablename}`)
    console.log(`  ${tablename.padEnd(24)} ${r[0].n}`)
  }
}

// Importable as a module (the provisioning test reuses `statements`);
// only provisions when run directly.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const host = process.env.DATABASE_URL.match(/@([^/:]+)/)?.[1] ?? 'unknown host'
  console.log(`asterion → ${host}\n`)

  const migrationsDir = join(ROOT, 'db', 'migrations')
  const migrations = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((f) => /^\d{3}-.+\.sql$/.test(f)).sort()
    : []

  if (args.has('--verify')) {
    await verify()
  } else if (args.has('--migration')) {
    const n = process.argv[process.argv.indexOf('--migration') + 1] ?? ''
    const match = migrations.filter((f) => f.startsWith(`${n}-`))
    if (!/^\d{3}$/.test(n) || match.length !== 1) {
      console.error(`--migration takes a number naming one file in db/migrations/ (have: ${migrations.join(', ') || 'none'})`)
      process.exit(1)
    }
    await apply(`migrations/${match[0]}`)
  } else {
    await apply('schema.sql')
    for (const m of migrations) await apply(`migrations/${m}`)
    if (!args.has('--schema')) await apply('seed.sql')
    console.log('')
    await verify()
  }
}
