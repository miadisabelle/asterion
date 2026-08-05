// Asterion Redis Layer - Upstash for ephemeral state, caching, event queues
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

// Key prefixes for namespace isolation
const PREFIXES = {
  session: 'asterion:session:',
  cache: 'asterion:cache:',
  queue: 'asterion:queue:',
  idempotency: 'asterion:idempotency:',
  lock: 'asterion:lock:',
} as const

// Session cache (ephemeral user state)
export async function setSession<T>(
  sessionId: string,
  data: T,
  ttlSeconds = 3600
): Promise<void> {
  await redis.setex(`${PREFIXES.session}${sessionId}`, ttlSeconds, JSON.stringify(data))
}

export async function getSession<T>(sessionId: string): Promise<T | null> {
  const data = await redis.get<string>(`${PREFIXES.session}${sessionId}`)
  if (!data) return null
  return typeof data === 'string' ? JSON.parse(data) : data as T
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`${PREFIXES.session}${sessionId}`)
}

// Cache layer for expensive queries
export async function setCache<T>(
  key: string,
  data: T,
  ttlSeconds = 300
): Promise<void> {
  await redis.setex(`${PREFIXES.cache}${key}`, ttlSeconds, JSON.stringify(data))
}

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get<string>(`${PREFIXES.cache}${key}`)
  if (!data) return null
  return typeof data === 'string' ? JSON.parse(data) : data as T
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(`${PREFIXES.cache}${pattern}`)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

// Event queue for async processing
export async function pushEvent(
  queueName: string,
  event: Record<string, unknown>
): Promise<void> {
  await redis.lpush(`${PREFIXES.queue}${queueName}`, JSON.stringify(event))
}

export async function popEvent<T>(queueName: string): Promise<T | null> {
  const data = await redis.rpop<string>(`${PREFIXES.queue}${queueName}`)
  if (!data) return null
  return typeof data === 'string' ? JSON.parse(data) : data as T
}

export async function getQueueLength(queueName: string): Promise<number> {
  return redis.llen(`${PREFIXES.queue}${queueName}`)
}

// Idempotency keys for async operations
export async function checkIdempotency(eventId: string): Promise<boolean> {
  const exists = await redis.exists(`${PREFIXES.idempotency}${eventId}`)
  return exists === 1
}

export async function setIdempotency(
  eventId: string,
  ttlSeconds = 86400 // 24 hours default
): Promise<void> {
  await redis.setex(`${PREFIXES.idempotency}${eventId}`, ttlSeconds, '1')
}

// Distributed locking for critical sections
export async function acquireLock(
  lockName: string,
  ttlSeconds = 30
): Promise<boolean> {
  const result = await redis.set(
    `${PREFIXES.lock}${lockName}`,
    '1',
    { nx: true, ex: ttlSeconds }
  )
  return result === 'OK'
}

export async function releaseLock(lockName: string): Promise<void> {
  await redis.del(`${PREFIXES.lock}${lockName}`)
}

// Export raw client for advanced operations
export { redis }
