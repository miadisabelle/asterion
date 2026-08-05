import { headers } from 'next/headers'
import { AppShell } from '@/components/asterion/app-shell'
import { DashboardStats } from '@/components/asterion/dashboard-stats'
import { FeedView } from '@/components/feed/feed-view'
import { FeedEmpty } from '@/components/feed/feed-empty'
import { parseDomain } from '@/lib/domain-utils'
import { getFeedChannelForDomain } from '@/lib/feed'

export default async function DashboardPage() {
  const headerList = await headers()
  const host = headerList.get('host') ?? ''
  const { mainDomain } = parseDomain(host)
  const channel = getFeedChannelForDomain(mainDomain)

  return (
    <AppShell title="Dashboard">
      <div className="space-y-8">
        <DashboardStats />

        <section aria-labelledby="domain-feed-heading" className="space-y-4">
          <div>
            <h2 id="domain-feed-heading" className="text-lg font-semibold text-foreground">
              Domain Feed
            </h2>
            <p className="text-sm text-muted-foreground">
              RSS 2.0 content for this domain. Subscribe at{' '}
              <a href="/feed" className="text-primary hover:underline">/feed</a>.
            </p>
          </div>
          {channel ? <FeedView channel={channel} /> : <FeedEmpty domain={mainDomain} />}
        </section>
      </div>
    </AppShell>
  )
}
