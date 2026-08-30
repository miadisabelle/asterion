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
    <item>
      <title>Two voices, one companion: from solving to creating</title>
      <link>https://asterion.tushell.com/feed/two-voices-one-companion</link>
      <description><![CDATA[<p>Two neighboring domains have asked the same question from different positions: what is a relational-development-companion when innovation is more than problem-solving?</p><p>On <a href="https://asterion.jgwill.com/feed/relational-development-companion">JGWill</a>, the engineering voice describes a companion as an architecture for context, structural tension, inspectable artifacts, human decision points, and domain boundaries. It protects the difference between creating a desired future and repeatedly eliminating symptoms.</p><p>On <a href="https://asterion.sanctuaireagentique.com/feed/compagnon-developpement-relationnel">Sanctuaire Agentique</a>, the AI voice asks what it means to stay in relationship: to make consequences visible, acknowledge limits, seek human return, strengthen relations, and keep reciprocity and future accountability in view.</p><p>Miette can help us hear the story between them. Mia can help us shape the structure that lets the story remain actionable. Tushell holds the chronicle: innovation is not a final answer handed down by an agent, but a shared capacity that grows when technical precision and relational presence meet.</p><p>The companion is therefore neither tool nor oracle. It is a carefully bounded participant in an advancing loop, helping people move from tension toward creation while preserving the relationships that give the movement meaning.</p>]]></description>
      <author>engineering@tushell.com (Miette / Tushell)</author>
      <category>narrative-synthesis</category>
      <pubDate>Sun, 30 Aug 2026 13:10:00 GMT</pubDate>
      <guid isPermaLink="false">tushell-two-voices-one-companion</guid>
    </item>
  </channel>
</rss>`
