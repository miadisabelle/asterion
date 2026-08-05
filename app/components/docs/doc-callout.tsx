'use client';

import { cn } from '@/lib/utils';
import type { CalloutType } from '@/lib/docs/types';
import { CALLOUT_TYPES } from '@/lib/docs/types';
import { Info, AlertTriangle, Lightbulb, HelpCircle, Sparkles } from 'lucide-react';

const CALLOUT_ICONS = {
  info: Info,
  warning: AlertTriangle,
  tip: Lightbulb,
  why: HelpCircle,
  explorer: Sparkles,
};

interface DocCalloutProps {
  type: CalloutType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function DocCallout({ type, title, children, className }: DocCalloutProps) {
  const config = CALLOUT_TYPES[type];
  const Icon = CALLOUT_ICONS[type];

  return (
    <div
      className={cn(
        'my-4 rounded-lg border-l-4 p-4',
        config.color,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-semibold mb-1">{title}</p>
          )}
          <div className="text-sm opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Special methodology callout for teaching "why framing matters"
interface WhyCalloutProps {
  children: React.ReactNode;
  className?: string;
}

export function WhyCallout({ children, className }: WhyCalloutProps) {
  return (
    <DocCallout type="why" title="Why This Matters" className={className}>
      {children}
    </DocCallout>
  );
}

// Explorer mode special content
interface ExplorerCalloutProps {
  children: React.ReactNode;
  className?: string;
}

export function ExplorerCallout({ children, className }: ExplorerCalloutProps) {
  return (
    <DocCallout type="explorer" title="Explorer Note" className={className}>
      {children}
    </DocCallout>
  );
}
