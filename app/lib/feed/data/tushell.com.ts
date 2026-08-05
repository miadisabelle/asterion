// RSS 2.0 feed for asterion.tushell.com (technical / engineering origin)
export const tushellRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Asterion · Tushell Engineering</title>
    <link>https://asterion.tushell.com/feed</link>
    <atom:link href="https://asterion.tushell.com/feed" rel="self" type="application/rss+xml" />
    <description>Runtime engineering updates, build topology, and execution substrate changes.</description>
    <language>en-us</language>
    <category>engineering</category>
    <lastBuildDate>Tue, 13 May 2026 17:00:00 GMT</lastBuildDate>
    <item>
      <title>Neon serverless driver migration completed</title>
      <link>https://asterion.tushell.com/feed/neon-driver-migration</link>
      <description><![CDATA[All dynamic queries moved from tagged-template calls to sql.query(), unblocking tension creation across the runtime.]]></description>
      <author>engineering@tushell.com (Runtime Team)</author>
      <category>runtime</category>
      <pubDate>Tue, 13 May 2026 17:00:00 GMT</pubDate>
      <guid isPermaLink="false">tushell-neon-driver-migration</guid>
    </item>
    <item>
      <title>Event log now powers timeline reconstruction</title>
      <link>https://asterion.tushell.com/feed/event-log-timeline</link>
      <description><![CDATA[The immutable events table records actor, payload, and tension linkage for replay and archaeology.]]></description>
      <author>engineering@tushell.com (Runtime Team)</author>
      <category>observability</category>
      <pubDate>Mon, 12 May 2026 14:30:00 GMT</pubDate>
      <guid isPermaLink="false">tushell-event-log-timeline</guid>
    </item>
    <item>
      <title>Mobile-first shell with collapsible drawer navigation</title>
      <link>https://asterion.tushell.com/feed/mobile-shell</link>
      <description><![CDATA[AppShell now adapts to iOS Safari with 44px touch targets and a Sheet-based mobile drawer.]]></description>
      <author>engineering@tushell.com (Frontend)</author>
      <category>frontend</category>
      <pubDate>Sun, 11 May 2026 09:15:00 GMT</pubDate>
      <guid isPermaLink="false">tushell-mobile-shell</guid>
    </item>
    <item>
      <title>Multi-domain detection scaffolding shipped</title>
      <link>https://asterion.tushell.com/feed/multi-domain</link>
      <description><![CDATA[Domain resolver distinguishes the shared asterion subdomain across tushell, jgwill, and sanctuaire hosts.]]></description>
      <author>engineering@tushell.com (Platform)</author>
      <category>platform</category>
      <pubDate>Sat, 10 May 2026 20:45:00 GMT</pubDate>
      <guid isPermaLink="false">tushell-multi-domain</guid>
    </item>
  </channel>
</rss>`
