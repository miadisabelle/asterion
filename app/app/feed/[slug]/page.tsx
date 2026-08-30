import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { parseDomain } from '@/lib/domain-utils'
import {
  getFeedChannelForDomain,
  SUPPORTED_FEED_DOMAINS,
  type FeedItem,
} from '@/lib/feed'

type ArticlePageProps = {
  params: Promise<{ slug: string }>
}

function getArticle(slug: string, mainDomain: string): FeedItem | null {
  const channel = getFeedChannelForDomain(mainDomain)
  return channel?.items.find((item) => {
    try {
      return new URL(item.link).pathname === `/feed/${slug}`
    } catch {
      return false
    }
  }) ?? null
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const requestHeaders = await headers()
  const host = requestHeaders.get('host') ?? ''
  const { mainDomain } = parseDomain(host)
  const article = SUPPORTED_FEED_DOMAINS.includes(mainDomain)
    ? getArticle(slug, mainDomain)
    : null

  return {
    title: article ? `${article.title} · Asterion` : 'Article not found · Asterion',
    description: article?.description.replace(/<[^>]*>/g, '').slice(0, 160),
  }
}

export default async function FeedArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const requestHeaders = await headers()
  const host = requestHeaders.get('host') ?? ''
  const { mainDomain } = parseDomain(host)

  if (!SUPPORTED_FEED_DOMAINS.includes(mainDomain)) notFound()

  const article = getArticle(slug, mainDomain)
  if (!article) notFound()

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground sm:px-10">
      <article className="mx-auto max-w-3xl">
        <header className="mb-10 border-b border-border pb-8">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {article.category} · {mainDomain}
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {article.title}
          </h1>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span>{article.author}</span>
            <time dateTime={article.pubDate}>{article.pubDate}</time>
          </div>
        </header>
        <div
          className="prose prose-invert max-w-none leading-7 text-muted-foreground prose-headings:text-foreground prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: article.description }}
        />
      </article>
    </main>
  )
}

export const dynamic = 'force-dynamic'
export const dynamicParams = true
