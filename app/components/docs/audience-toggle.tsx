'use client';

import { useAudienceMode } from '@/lib/docs/hooks';
import { cn } from '@/lib/utils';
import { GraduationCap, Sparkles } from 'lucide-react';

export function AudienceToggle() {
  const [mode, setMode] = useAudienceMode();

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted p-1">
      <button
        onClick={() => setMode('technical')}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
          mode === 'technical'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <GraduationCap className="h-4 w-4" />
        <span className="hidden sm:inline">Technical</span>
      </button>
      <button
        onClick={() => setMode('explorer')}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
          mode === 'explorer'
            ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Explorer</span>
      </button>
    </div>
  );
}
