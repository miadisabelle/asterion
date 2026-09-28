// Where a projected row came from. Rows born in Asterion carry no
// external_source and render nothing here.
import { formatDistanceToNow } from 'date-fns'
import { FileText, Github } from 'lucide-react'

const chip = 'inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'

/** 'coaia-narrative:ep060' → { system: 'coaia-narrative', key: 'ep060' } */
export function parseSource(source: string | null | undefined): { system: string; key: string | null } | null {
  if (!source) return null
  const i = source.indexOf(':')
  return i < 0 ? { system: source, key: null } : { system: source.slice(0, i), key: source.slice(i + 1) }
}

export function ProvenanceBadges({
  source,
  githubOwner,
  githubRepo,
  githubIssue,
}: {
  source?: string | null
  githubOwner?: string | null
  githubRepo?: string | null
  githubIssue?: number | null
}) {
  const parsed = parseSource(source)
  const issue = githubOwner && githubRepo && githubIssue ? `${githubOwner}/${githubRepo}#${githubIssue}` : null
  if (!parsed && !issue) return null
  return (
    <>
      {parsed && (
        <span className={chip} title={`Projected from ${source}. The ${parsed.system} memory is the record; this is its projection.`}>
          <FileText className="h-3 w-3" />
          {parsed.key ? `from ${parsed.key}` : `from ${parsed.system}`}
        </span>
      )}
      {issue && (
        <a
          className={`${chip} hover:text-foreground`}
          href={`https://github.com/${githubOwner}/${githubRepo}/issues/${githubIssue}`}
          target="_blank"
          rel="noreferrer"
        >
          <Github className="h-3 w-3" />
          {issue}
        </a>
      )}
    </>
  )
}

type SourceFile = { kind?: string; name?: string | null; syncedAt?: string | null; failing?: boolean }

/** For a registered project: its source system and when its files were last read. */
export function ProjectSourceLine({ metadata }: { metadata?: Record<string, unknown> | null }) {
  const source = (metadata?.source ?? null) as { system?: string; key?: string; projectedAt?: string | null; files?: SourceFile[] } | null
  if (!source?.system) return null
  const files = source.files ?? []
  const synced = source.projectedAt ?? files.map((f) => f.syncedAt).filter((s): s is string => Boolean(s)).sort().pop()
  const failing = files.some((f) => f.failing)
  return (
    <p className="text-xs text-muted-foreground">
      {source.system}:{source.key} · {files.length ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'fed by its writer'}
      {synced ? ` · updated ${formatDistanceToNow(new Date(synced), { addSuffix: true })}` : ''}
      {failing ? ' · a file could not be read' : ''}
    </p>
  )
}
