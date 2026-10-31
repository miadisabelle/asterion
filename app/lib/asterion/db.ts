// Asterion Database Layer - Neon PostgreSQL
import { neon, neonConfig } from '@neondatabase/serverless'

// A Postgres on this host answers Neon's HTTP protocol through asterion-postgres-http (docker/compose.yml).
// The driver otherwise always calls https://api.<host>/sql, so a local store needs this one setting.
if (process.env.NEON_HTTP_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_HTTP_ENDPOINT

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const sql = neon(connectionString)

// Helper for parameterized queries
export async function query<T>(
  queryText: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await sql.query(queryText, params)
  return result as T[]
}

// Transaction helper (Neon doesn't support traditional transactions in serverless,
// but we can use this pattern for consistency)
export async function withTransaction<T>(
  callback: (sql: typeof import('@neondatabase/serverless').neon) => Promise<T>
): Promise<T> {
  return callback(sql)
}
