'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PhaseBadge, StatusBadge, LayerBadge } from './badges'
import { Progress } from '@/components/ui/progress'
import { Target, ChevronRight, GitBranch } from 'lucide-react'
import type { Tension } from '@/lib/asterion/types'

interface TensionCardProps {
  tension: Tension
  compact?: boolean
}

export function TensionCard({ tension, compact = false }: TensionCardProps) {
  if (compact) {
    return (
      <Link href={`/tensions/${tension.id}`}>
        <div className="flex items-center justify-between rounded-md border border-border bg-card p-3 transition-colors hover:bg-accent/50">
          <div className="flex items-center gap-3 min-w-0">
            <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-sm font-medium">{tension.title}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <PhaseBadge phase={tension.phase} />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/tensions/${tension.id}`}>
      <Card className="transition-colors hover:bg-accent/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium leading-tight">
              {tension.title}
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <PhaseBadge phase={tension.phase} />
              <StatusBadge status={tension.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {tension.desired_outcome}
          </p>
          
          <div className="flex items-center gap-4">
            {tension.layer && (
              <LayerBadge 
                layerType={tension.layer.layer_type} 
                name={tension.layer.name} 
              />
            )}
            {tension.telescope_depth > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                <span>Depth {tension.telescope_depth}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{tension.progress}%</span>
            </div>
            <Progress value={tension.progress} className="h-1.5" />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(tension.created_at), { addSuffix: true })}
            </span>
            {tension.due_date && (
              <span>
                Due {formatDistanceToNow(new Date(tension.due_date), { addSuffix: true })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
