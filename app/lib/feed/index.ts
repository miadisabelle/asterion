import { XMLParser } from 'fast-xml-parser'
import { tushellRss } from './data/tushell.com'
import { jgwillRss } from './data/jgwill.com'
import { sanctuaireRss } from './data/sanctuaireagentique.com'

export type FeedItem = {
  title: string
  link: string
  description: string
  author: string
  category: string
  pubDate: string
  guid: string
}

export type FeedChannel = {
  title: string
  link: string
  description: string
  language: string
  category: string
  lastBuildDate: string
  items: FeedItem[]
}

/**
 * Registry of domain-specific RSS 2.0 feeds, keyed by main domain.
 * All three supported hosts share the "asterion" subdomain but differ
 * by main domain, so we key on the main domain.
 * These raw XML strings are the source of truth served at /feed.
 */
const FEED_REGISTRY: Record<string, string> = {
  'tushell.com': tushellRss,
  'jgwill.com': jgwillRss,
  'sanctuaireagentique.com': sanctuaireRss,
}

/**
 * Resolve the raw RSS 2.0 XML for a given main domain.
 * Returns null when the domain is not supported (so /feed serves no data).
 */
export function getFeedXmlForDomain(mainDomain: string): string | null {
  return FEED_REGISTRY[mainDomain] ?? null
}

const parser = new XMLParser({
  ignoreAttributes: true,
  cdataPropName: '__cdata',
  trimValues: true,
})

function normalizeText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if ('__cdata' in obj) return String(obj.__cdata ?? '').trim()
    if ('#text' in obj) return String(obj['#text'] ?? '').trim()
    return ''
  }
  return String(value).trim()
}

/**
 * Parse raw RSS 2.0 XML into a structured channel for HTML rendering.
 * Returns null when the XML cannot be parsed into a channel.
 */
export function parseFeedXml(xml: string): FeedChannel | null {
  try {
    const doc = parser.parse(xml)
    const channel = doc?.rss?.channel
    if (!channel) return null

    const rawItems = Array.isArray(channel.item)
      ? channel.item
      : channel.item
        ? [channel.item]
        : []

    const items: FeedItem[] = rawItems.map((item: Record<string, unknown>) => ({
      title: normalizeText(item.title),
      link: normalizeText(item.link),
      description: normalizeText(item.description),
      author: normalizeText(item.author),
      category: normalizeText(item.category),
      pubDate: normalizeText(item.pubDate),
      guid: normalizeText(item.guid),
    }))

    return {
      title: normalizeText(channel.title),
      link: normalizeText(channel.link),
      description: normalizeText(channel.description),
      language: normalizeText(channel.language),
      category: normalizeText(channel.category),
      lastBuildDate: normalizeText(channel.lastBuildDate),
      items,
    }
  } catch {
    return null
  }
}

/**
 * Resolve a parsed feed channel for a given main domain (for HTML rendering).
 */
export function getFeedChannelForDomain(mainDomain: string): FeedChannel | null {
  const xml = getFeedXmlForDomain(mainDomain)
  if (!xml) return null
  return parseFeedXml(xml)
}

/**
 * List of all supported main domains (useful for previews / testing).
 */
export const SUPPORTED_FEED_DOMAINS = Object.keys(FEED_REGISTRY)
