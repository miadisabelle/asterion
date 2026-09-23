// RSS 2.0 feed for asterion.jgwill.com (academic / research origin)
export const jgwillRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Asterion · JGWill Research</title>
    <link>https://asterion.jgwill.com/feed</link>
    <atom:link href="https://asterion.jgwill.com/feed" rel="self" type="application/rss+xml" />
    <description>Research notes and package releases on relational software, event-sourced memory, and the Medicine Wheel.</description>
    <language>en-us</language>
    <category>research</category>
    <lastBuildDate>Tue, 23 Sep 2026 16:00:00 GMT</lastBuildDate>
    <item>
      <title>@medicine-wheel/honcho 0.15.2: the wheel&apos;s projection into memory that reasons</title>
      <link>https://asterion.jgwill.com/feed/honcho-0-15-2</link>
      <description><![CDATA[<p><code>@medicine-wheel/honcho</code> connects the Medicine Wheel to a self-hosted Honcho. The wheel keeps what was recorded and how it relates; Honcho keeps what that history has come to mean about each participant, revising it as new records arrive.</p><p>It works in three deliberate moves: project a beat, ceremony log, or diary entry into one Honcho message; recall a participant&apos;s representation; then project a conclusion back as a knowledge node with source record ids, derivation, and an <code>inferred</code>, <code>confirmed</code>, or <code>rejected</code> status.</p><p>The writer never waits on memory. Wheel ids map deterministically to Honcho ids, ceremonies remain one session, and the package uses only <code>fetch</code>—no vendor SDK.</p>]]></description>
      <author>research@jgwill.com (J. G. Will)</author>
      <category>packages</category>
      <pubDate>Tue, 23 Sep 2026 16:00:00 GMT</pubDate>
      <guid isPermaLink="false">jgwill-honcho-0-15-2</guid>
    </item>
    <item>
      <title>Honcho and the accountability of memory</title>
      <link>https://asterion.jgwill.com/feed/honcho-accountability</link>
      <description><![CDATA[<p>Event sourcing gives the wheel an append-only record and rebuildable projections. Reflection gives an agent a memory stream that can form higher-level conclusions. Relational accountability and Indigenous data sovereignty ask the harder questions: where does memory live, who may read it, and who decides what enters it?</p><p>Honcho is a projection, not a replacement for the record. Every conclusion traces back to the wheel, while recall and project-back remain deliberate calls rather than hidden automation.</p>]]></description>
      <author>research@jgwill.com (J. G. Will)</author>
      <category>methodology</category>
      <pubDate>Tue, 23 Sep 2026 14:00:00 GMT</pubDate>
      <guid isPermaLink="false">jgwill-honcho-accountability</guid>
    </item>
    <item>
      <title>A Honcho projection in a Miadi talking circle</title>
      <link>https://asterion.jgwill.com/feed/honcho-talking-circle</link>
      <description><![CDATA[<p>When a facilitator opens a circle, the ceremony log and members become a Honcho session. Each member&apos;s turn and diary entry arrives in that session in their voice. Miadi decides who may open, speak, or write; the wheel projects what was stored without filtering it.</p><p>The projection does not yet cover circle membership, witnesses added after a turn, or records written before 20 September 2026. A closing lands in its own session.</p>]]></description>
      <author>research@jgwill.com (J. G. Will)</author>
      <category>field-notes</category>
      <pubDate>Tue, 23 Sep 2026 12:00:00 GMT</pubDate>
      <guid isPermaLink="false">jgwill-honcho-talking-circle</guid>
    </item>
    <item>
      <title>Prompt Decomposition Engine: a formal model</title>
      <link>https://asterion.jgwill.com/feed/pde-formal-model</link>
      <description><![CDATA[PDE decomposes prompts into primary/secondary intents, directional mapping (E/S/W/N), action stacks, and ambiguities.]]></description>
      <author>research@jgwill.com (J. G. Will)</author>
      <category>pde</category>
      <pubDate>Tue, 13 May 2026 16:00:00 GMT</pubDate>
      <guid isPermaLink="false">jgwill-pde-formal-model</guid>
    </item>
    <item>
      <title>Structural tension as a generative primitive</title>
      <link>https://asterion.jgwill.com/feed/structural-tension</link>
      <description><![CDATA[Revisiting Fritz: the tension between current reality and desired outcome as the engine of advancing patterns.]]></description>
      <author>research@jgwill.com (J. G. Will)</author>
      <category>methodology</category>
      <pubDate>Mon, 12 May 2026 11:20:00 GMT</pubDate>
      <guid isPermaLink="false">jgwill-structural-tension</guid>
    </item>
    <item>
      <title>The four directions of inquiry</title>
      <link>https://asterion.jgwill.com/feed/four-directions</link>
      <description><![CDATA[East (vision), South (analysis), West (validation), North (action) as a diversity model for planning.]]></description>
      <author>research@jgwill.com (J. G. Will)</author>
      <category>theory</category>
      <pubDate>Sun, 11 May 2026 08:00:00 GMT</pubDate>
      <guid isPermaLink="false">jgwill-four-directions</guid>
    </item>
    <item>
      <title>MMOT as recursive self-witnessing</title>
      <link>https://asterion.jgwill.com/feed/mmot-self-witnessing</link>
      <description><![CDATA[Acknowledge, analyze, update the chart, and recommit or redirect: a correction loop for living systems.]]></description>
      <author>research@jgwill.com (J. G. Will)</author>
      <category>evaluation</category>
      <pubDate>Sat, 10 May 2026 19:30:00 GMT</pubDate>
      <guid isPermaLink="false">jgwill-mmot-self-witnessing</guid>
    </item>
    <item>
      <title>Functional review: multi-domain access and content boundaries</title>
      <link>https://asterion.jgwill.com/feed/multi-domain-access-review</link>
      <description><![CDATA[<p>A functional review of how domain selection changes the content surface in Asterion.</p><p><strong>Domain resolution:</strong> requests are parsed from the Host header into a main domain, so <code>asterion.jgwill.com</code>, <code>asterion.tushell.com</code>, and <code>asterion.sanctuaireagentique.com</code> resolve to separate feed registries even though they share the same subdomain. The main-domain key is the content boundary: it selects which RSS channel and articles are reachable.</p><p><strong>Content access:</strong> the same <code>/feed</code> path is therefore domain-aware. A reader subscribing to one hostname receives that hostname&apos;s feed rather than a blended stream. Article links remain canonical to the selected domain, making the domain part of the publication identity and navigation path.</p><p><strong>Preview behavior:</strong> a <code>?domain=</code> override allows a preview deployment to exercise a specific registry without changing its Host header. This is useful for testing, but it is also an explicit alternate input and should remain constrained to known registry keys rather than becoming an arbitrary content selector.</p><p><strong>Isolation and failure modes:</strong> supported domains are isolated by exact registry lookup. Unknown domains return a valid empty RSS document with a 404, which is predictable for clients but should be monitored so misconfigured DNS or Host forwarding is visible. The current implementation does not merge domains or fall back to another publication.</p><p><strong>Operational and security considerations:</strong> canonical links, cache keys, and reverse-proxy Host preservation must all retain the domain distinction. Cache layers should vary by hostname and query override; otherwise one domain&apos;s XML could be served to another. The override should be validated against the supported-domain list, and production deployments should decide whether preview overrides need to be disabled or authenticated.</p><p><strong>Review outcome:</strong> the functional model is coherent and intentionally simple: hostname selects publication, publication selects content, and unsupported hosts fail closed. Recommended follow-up is to add automated coverage for each supported host, an unsupported host, ports, preview overrides, cache variation, and canonical article links.</p>]]></description>
      <author>research@jgwill.com (J. G. Will)</author>
      <category>architecture</category>
      <pubDate>Sun, 30 Aug 2026 12:00:00 GMT</pubDate>
      <guid isPermaLink="false">jgwill-multi-domain-access-review</guid>
    </item>
    <item>
      <title>What is a relational-development-companion?</title>
      <link>https://asterion.jgwill.com/feed/relational-development-companion</link>
      <description><![CDATA[<p>A relational-development-companion is not a faster problem solver. It is an engineered partner for distinguishing a problem to resolve from a possibility to bring into being.</p><p>The companion starts by enriching the inquiry: who is asking, for what purpose, who benefits, what harm must be avoided, what is being honored, and which lens is speaking. This prevents a request from being stripped of its relational context and routed as a generic task.</p><p>Its creative loop is not “input, execute, output.” It moves from desired outcome to honest current reality, names the structural tension between them, surfaces secondary choices, and advances through an inspectable experiment. Structural tension is not a gap to fill; it is information about the creation still available. The system should preserve the lineage from question to artifact to decision so that advancement can be reviewed rather than mystified.</p><p>Multi-domain access makes the architecture concrete. A shared runtime may serve distinct epistemic and editorial surfaces, but hostname resolution, canonical URLs, cache variation, permissions, and feed identity must keep those relations legible. Domain selection is therefore not cosmetic routing: it is a content boundary and an accountability boundary.</p><p>Engineering is successful when the companion increases collective capacity without replacing agency: it asks for human judgment at consequential turns, records uncertainty, supports reciprocity, and evaluates whether relations and communities benefit. Innovation is not merely the answer produced; it is the durable capacity to see, choose, create, and remain accountable together.</p>]]></description>
      <author>research@jgwill.com (J. G. Will)</author>
      <category>relational-development</category>
      <pubDate>Sun, 30 Aug 2026 13:00:00 GMT</pubDate>
      <guid isPermaLink="false">jgwill-relational-development-companion</guid>
    </item>
  </channel>
</rss>`
