import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Rss, MessageSquare, Clock, ExternalLink } from 'lucide-react'
import type { FeedChannel } from '@/lib/feed'

function formatDate(pubDate: string): string {
  const d = new Date(pubDate)
  if (Number.isNaN(d.getTime())) return pubDate
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function FeedView({ channel }: { channel: FeedChannel }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-primary">
                <Rss className="h-4 w-4 shrink-0" />
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {channel.title}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {channel.description}
              </p>
            </div>
            <a
              href="/feed"
              className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted min-h-[44px] sm:min-h-0"
            >
              <Rss className="h-3.5 w-3.5" />
              RSS
            </a>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {channel.items.map((item) => (
          <Card key={item.guid || item.link}>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-2">
                {item.category && (
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(item.pubDate)}
                </span>
              </div>

              <h3 className="mt-3 font-semibold text-foreground text-pretty">
                {item.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                {item.description}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  {item.author}
                </span>
                <a
                  href={item.link}
                  className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                >
                  Open
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
