'use client'

import { useDomain } from '@/hooks/use-domain'
import { cn } from '@/lib/utils'

interface DomainIndicatorProps {
  className?: string
  showFull?: boolean
}

/**
 * A small, discrete indicator showing the current domain
 * Useful for multi-tenant applications
 */
export function DomainIndicator({ className, showFull = false }: DomainIndicatorProps) {
  const domain = useDomain()

  if (!domain) return null

  const displayText = showFull 
    ? domain.full 
    : domain.isLocalhost 
      ? 'localhost' 
      : domain.mainDomain

  return (
    <div 
      className={cn(
        'fixed top-2 right-2 z-50',
        'px-2 py-1 rounded-md',
        'bg-muted/50 backdrop-blur-sm border border-border/50',
        'text-[10px] text-muted-foreground/70 font-mono',
        'select-none pointer-events-none',
        'transition-opacity opacity-60 hover:opacity-100',
        className
      )}
      title={`Full domain: ${domain.full}`}
    >
      {displayText}
    </div>
  )
}
