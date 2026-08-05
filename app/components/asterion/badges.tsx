import { cn } from '@/lib/utils'
import type { Phase, TensionStatus, LayerType } from '@/lib/asterion/types'

export function PhaseBadge({ phase }: { phase: Phase }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        phase === 'germination' && 'bg-[oklch(0.75_0.12_85/0.2)] text-[oklch(0.85_0.12_85)]',
        phase === 'assimilation' && 'bg-[oklch(0.65_0.15_255/0.2)] text-[oklch(0.75_0.15_255)]',
        phase === 'completion' && 'bg-[oklch(0.65_0.15_165/0.2)] text-[oklch(0.75_0.15_165)]'
      )}
    >
      {phase}
    </span>
  )
}

export function StatusBadge({ status }: { status: TensionStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'active' && 'bg-[oklch(0.65_0.15_165/0.2)] text-[oklch(0.75_0.15_165)]',
        status === 'paused' && 'bg-[oklch(0.6_0.1_50/0.2)] text-[oklch(0.7_0.1_50)]',
        status === 'resolved' && 'bg-[oklch(0.55_0.12_255/0.2)] text-[oklch(0.65_0.12_255)]',
        status === 'archived' && 'bg-muted text-muted-foreground'
      )}
    >
      {status}
    </span>
  )
}

export function LayerBadge({ layerType, name }: { layerType: LayerType; name: string }) {
  const colors: Record<LayerType, string> = {
    runtime: 'bg-[oklch(0.65_0.15_165/0.2)] text-[oklch(0.75_0.15_165)]',
    memory: 'bg-[oklch(0.65_0.12_255/0.2)] text-[oklch(0.75_0.12_255)]',
    governance: 'bg-[oklch(0.7_0.15_320/0.2)] text-[oklch(0.8_0.15_320)]',
    pde: 'bg-[oklch(0.75_0.12_85/0.2)] text-[oklch(0.85_0.12_85)]',
    docs: 'bg-[oklch(0.6_0.1_200/0.2)] text-[oklch(0.7_0.1_200)]',
    security: 'bg-[oklch(0.6_0.2_25/0.2)] text-[oklch(0.7_0.2_25)]',
    operator: 'bg-[oklch(0.7_0.1_50/0.2)] text-[oklch(0.8_0.1_50)]',
  }

  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colors[layerType])}>
      {name}
    </span>
  )
}

export function EdgeTypeBadge({ edgeType }: { edgeType: string }) {
  const colors: Record<string, string> = {
    blocks: 'bg-destructive/20 text-destructive',
    depends_on: 'bg-[oklch(0.65_0.15_255/0.2)] text-[oklch(0.75_0.15_255)]',
    relates_to: 'bg-muted text-muted-foreground',
    duplicates: 'bg-[oklch(0.6_0.1_50/0.2)] text-[oklch(0.7_0.1_50)]',
    supersedes: 'bg-[oklch(0.7_0.15_320/0.2)] text-[oklch(0.8_0.15_320)]',
  }

  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colors[edgeType] || 'bg-muted text-muted-foreground')}>
      {edgeType.replace('_', ' ')}
    </span>
  )
}
