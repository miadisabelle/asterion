'use server'

import { headers } from 'next/headers'
import { parseDomain, type DomainInfo } from './domain-utils'

/**
 * Get domain information from the request headers (server-side).
 * Works with Next.js App Router.
 *
 * Note: this is a 'use server' module, so it may only export async functions.
 * Import the `DomainInfo` type and the pure `parseDomain` helper directly from
 * '@/lib/domain-utils' instead of re-exporting them here.
 */
export async function getDomainInfo(): Promise<DomainInfo> {
  const headersList = await headers()
  const host =
    headersList.get('host') ||
    headersList.get('x-forwarded-host') ||
    'localhost:3000'

  return parseDomain(host)
}
