import { Card, CardContent } from '@/components/ui/card'
import { RssIcon } from 'lucide-react'

export function FeedEmpty({ domain }: { domain: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <RssIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          No feed for this domain
        </h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
          {domain
            ? `There is no feed configured for "${domain}".`
            : 'There is no feed configured for this domain.'}{' '}
          Feeds are available on the supported Asterion domains.
        </p>
      </CardContent>
    </Card>
  )
}
