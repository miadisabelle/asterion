// What every Asterion script needs before it touches data: the environment
// from .env.local (a variable already set wins), a Neon client, and a way to
// drop the page caches a write has made stale.

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

export function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = join(APP_ROOT, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*"?(.*?)"?\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
    break
  }
}

export async function connect() {
  loadEnv()
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.')
    process.exit(1)
  }
  const { neon } = await import('@neondatabase/serverless')
  return neon(process.env.DATABASE_URL)
}

export const hostOf = (url) => url?.match(/@([^/:]+)/)?.[1] ?? 'unknown host'

/** Drop cached pages under asterion:cache:. A missing Redis is reported, not fatal. */
export async function invalidateCaches(patterns) {
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = Redis.fromEnv()
    let dropped = 0
    for (const p of patterns) {
      const keys = await redis.keys(`asterion:cache:${p}`)
      if (keys.length) dropped += await redis.del(...keys)
    }
    return { dropped }
  } catch (err) {
    return { dropped: 0, error: err instanceof Error ? err.message : String(err) }
  }
}
