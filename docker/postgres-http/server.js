// asterion-postgres-http — Neon's HTTP SQL protocol in front of asterion-postgres.
//
// Asterion's code talks to its database through @neondatabase/serverless `neon()`, which POSTs each
// query as JSON to `<endpoint>/sql` and expects Neon's answer. This gateway answers that protocol from
// a plain Postgres, so the 115 queries in the app stay as they are; the app only points
// `neonConfig.fetchEndpoint` here (NEON_HTTP_ENDPOINT, lib/asterion/db.ts).
//
// The protocol, as @neondatabase/serverless 1.1.0 speaks it:
//   request   POST /sql, headers Neon-Connection-String, Neon-Raw-Text-Output: true, Neon-Array-Mode: true,
//             and for a batch Neon-Batch-Isolation-Level / -Read-Only / -Deferrable;
//             body {query, params} or {queries: [{query, params}, ...]}
//   answer    {command, rowCount, rows, fields, rowAsArray}: rows as arrays of the values' text, which
//             the driver parses by each field's dataTypeID; a batch is {results: [...]}, run in one transaction
//   error     HTTP 400 with {message, severity, code, detail, hint, position, ...}, the fields the
//             driver copies onto its NeonDbError
//
// Auth: the password inside Neon-Connection-String must equal ASTERION_PG_PASSWORD. The gateway always
// connects with its own ASTERION_PG_URL, whatever host the header names. Logs carry the command, row
// count and duration of each request, never a query's text or its parameters.

'use strict'

const http = require('node:http')
const crypto = require('node:crypto')
const { Pool } = require('pg')

const PORT = Number(process.env.PORT || 4444)
const PG_URL = process.env.ASTERION_PG_URL
const PASSWORD = process.env.ASTERION_PG_PASSWORD
const MAX_BODY = 64 * 1024 * 1024
if (!PG_URL || !PASSWORD) {
  console.error('asterion-postgres-http: set ASTERION_PG_URL and ASTERION_PG_PASSWORD')
  process.exit(1)
}

const pool = new Pool({ connectionString: PG_URL, max: Number(process.env.ASTERION_PG_POOL || 10) })
pool.on('error', (error) => console.error(`pool: ${error.message}`))

// Every value comes back as Postgres' own text; the driver parses it by type, as Neon does.
const RAW = { getTypeParser: () => (value) => value }
const ERROR_FIELDS = ['severity', 'code', 'detail', 'hint', 'position', 'internalPosition', 'internalQuery',
  'where', 'schema', 'table', 'column', 'dataType', 'constraint', 'file', 'line', 'routine']
const ISOLATION = { ReadUncommitted: 'READ UNCOMMITTED', ReadCommitted: 'READ COMMITTED',
  RepeatableRead: 'REPEATABLE READ', Serializable: 'SERIALIZABLE' }

function authorized(header) {
  if (!header) return false
  let password
  try { password = decodeURIComponent(new URL(header).password) } catch { return false }
  const a = Buffer.from(password), b = Buffer.from(PASSWORD)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function shape(result) {
  // A text with several statements and no parameters returns one result per statement: answer the last.
  const r = Array.isArray(result) ? result[result.length - 1] : result
  return {
    command: r.command,
    rowCount: r.rowCount,
    rows: r.rows,
    fields: r.fields.map((f) => ({ name: f.name, tableID: f.tableID, columnID: f.columnID, dataTypeID: f.dataTypeID,
      dataTypeSize: f.dataTypeSize, dataTypeModifier: f.dataTypeModifier, format: f.format })),
    rowAsArray: true,
  }
}

async function run(client, { query, params }) {
  const values = Array.isArray(params) && params.length ? params : undefined
  return shape(await client.query({ text: query, values, rowMode: 'array', types: RAW }))
}

async function batch(client, queries, headers) {
  const mode = [ISOLATION[headers['neon-batch-isolation-level']] && `ISOLATION LEVEL ${ISOLATION[headers['neon-batch-isolation-level']]}`,
    headers['neon-batch-read-only'] === 'true' && 'READ ONLY',
    headers['neon-batch-deferrable'] === 'true' && 'DEFERRABLE'].filter(Boolean).join(' ')
  await client.query(`BEGIN${mode ? ' ' + mode : ''}`)
  try {
    const results = []
    for (const q of queries) results.push(await run(client, q))
    await client.query('COMMIT')
    return { results }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

function send(res, status, body, type = 'application/json') {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(text) })
  res.end(text)
}

const server = http.createServer((req, res) => {
  const started = Date.now()
  const log = (status, what) => console.log(`${req.method} ${req.url} ${status} ${Date.now() - started}ms ${what}`)

  if (req.method === 'GET' && req.url === '/health') {
    pool.query('SELECT 1').then(() => send(res, 200, 'ok', 'text/plain'), (e) => send(res, 503, e.message, 'text/plain'))
    return
  }
  if (req.method !== 'POST' || req.url.split('?')[0] !== '/sql') { send(res, 404, 'not found', 'text/plain'); return }
  if (!authorized(req.headers['neon-connection-string'])) { log(401, 'refused'); send(res, 401, 'unauthorized', 'text/plain'); return }

  const chunks = []
  let size = 0
  req.on('data', (chunk) => {
    size += chunk.length
    if (size > MAX_BODY) { req.destroy(); return }
    chunks.push(chunk)
  })
  req.on('end', async () => {
    let body
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch {
      log(400, 'bad json'); send(res, 400, { message: 'request body is not JSON' }); return
    }
    const client = await pool.connect().catch((e) => e)
    if (client instanceof Error) { log(503, client.message); send(res, 503, `database unavailable: ${client.message}`, 'text/plain'); return }
    try {
      if (Array.isArray(body.queries)) {
        const out = await batch(client, body.queries, req.headers)
        log(200, `batch ${body.queries.length}`)
        send(res, 200, out)
      } else if (typeof body.query === 'string') {
        const out = await run(client, body)
        log(200, `${out.command} ${out.rowCount ?? ''}`)
        send(res, 200, out)
      } else {
        log(400, 'no query'); send(res, 400, { message: 'body needs query or queries' })
      }
    } catch (error) {
      const out = { message: error.message }
      for (const k of ERROR_FIELDS) if (error[k] !== undefined) out[k] = error[k]
      log(400, `error ${error.code ?? ''}`)
      send(res, 400, out)
    } finally {
      client.release()
    }
  })
})

server.listen(PORT, () => console.log(`asterion-postgres-http listening on ${PORT}`))
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => pool.end().then(() => process.exit(0))))
