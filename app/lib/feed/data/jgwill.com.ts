// RSS 2.0 feed for asterion.jgwill.com (academic / research origin)
export const jgwillRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Asterion · JGWill Research</title>
    <link>https://asterion.jgwill.com/feed</link>
    <atom:link href="https://asterion.jgwill.com/feed" rel="self" type="application/rss+xml" />
    <description>Academic notes on structural tension, prompt decomposition, and recursive execution theory.</description>
    <language>en-us</language>
    <category>research</category>
    <lastBuildDate>Tue, 13 May 2026 16:00:00 GMT</lastBuildDate>
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
      <description><![CDATA[Revisiting Fritz: the gap between current reality and desired outcome as the engine of advancing patterns.]]></description>
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
      <description><![CDATA[<p>A relational-development-companion is not a faster problem solver. It is an engineered partner for noticing the difference between a problem to resolve and a possibility to bring into being.</p><p>From an engineering perspective, the relationship begins with domain-aware context: who is asking, what they are trying to create, which relations are affected, what accountability is required, and where the inquiry belongs. A companion should preserve those distinctions rather than collapse every request into a generic task list.</p><p>Its development function is an advancing loop: desired outcome, honest current reality, structural tension, secondary choices, and advancement. Structural tension is not a gap to erase; it is information about the creative work still available. The companion helps turn that tension into inspectable artifacts, small experiments, and decisions that remain connected to their origin.</p><p>Its relational function is equally technical. Each domain can expose a different content surface while sharing a substrate, so hostname, canonical links, cache keys, and permissions must preserve the boundary. The architecture should make context visible, keep humans in the loop at consequential turns, and treat validation as relational rather than merely computational.</p><p>Innovation, then, is not only the answer produced. It is the strengthened capacity of people and systems to see, choose, create, and remain accountable together.</p>]]></description>
      <author>research@jgwill.com (J. G. Will)</author>
      <category>relational-development</category>
      <pubDate>Sun, 30 Aug 2026 13:00:00 GMT</pubDate>
      <guid isPermaLink="false">jgwill-relational-development-companion</guid>
    </item>
  </channel>
</rss>`
