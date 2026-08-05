import type { NextRequest } from 'next/server'
import { parseDomain } from '@/lib/domain-utils'
import { getFeedXmlForDomain } from '@/lib/feed'

/**
 * GET /feed
 * Serves the domain-specific RSS 2.0 feed as raw XML so feed readers can subscribe.
 *
 * Domain is detected from the Host header. A ?domain= query override is
 * supported for previewing off the production hosts.
 */
export async function GET(request: NextRequest) {
  const override = request.nextUrl.searchParams.get('domain')
  const host = request.headers.get('host') ?? ''
  const mainDomain = override ?? parseDomain(host).mainDomain

  const xml = getFeedXmlForDomain(mainDomain)

  if (!xml) {
    // Unsupported domain: valid, empty RSS 2.0 document so readers get no items.
    const emptyRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Asterion</title>
    <link>https://${host}/feed</link>
    <description>No feed is available for this domain.</description>
  </channel>
</rss>`
    return new Response(emptyRss, {
      status: 404,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
    },
  })
}
