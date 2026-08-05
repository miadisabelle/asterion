'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDocNavigation, useAudienceMode } from '@/lib/docs/hooks';
import type { DocNavItem, DocOrigin } from '@/lib/docs/types';
import { DOC_ORIGINS, DOC_STATUSES } from '@/lib/docs/types';
import { 
  GraduationCap, 
  Code, 
  BookOpen, 
  Settings, 
  ChevronRight,
  FileText 
} from 'lucide-react';

const ORIGIN_ICONS = {
  academic: GraduationCap,
  technical: Code,
  narrative: BookOpen,
  operational: Settings,
};

interface DocSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function DocSidebar({ className, onNavigate }: DocSidebarProps) {
  const pathname = usePathname();
  const { data: navigation } = useDocNavigation();
  const [audienceMode] = useAudienceMode();

  if (!navigation) {
    return (
      <nav className={cn('w-64 p-4', className)}>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="ml-4 space-y-1">
                <div className="h-3 w-32 rounded bg-muted/50" />
                <div className="h-3 w-28 rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      </nav>
    );
  }

  const origins: DocOrigin[] = ['academic', 'technical', 'narrative', 'operational'];

  return (
    <nav className={cn('w-64 overflow-y-auto p-4', className)}>
      <div className="space-y-6">
        {origins.map((origin) => {
          const items = navigation[origin];
          if (!items || items.length === 0) return null;

          const Icon = ORIGIN_ICONS[origin];
          const config = DOC_ORIGINS[origin];

          return (
            <div key={origin}>
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Icon className="h-4 w-4" />
                {config.label}
              </div>
              <ul className="mt-1 space-y-0.5">
                {items.map((item) => (
                  <NavItem 
                    key={item.id} 
                    item={item} 
                    pathname={pathname}
                    audienceMode={audienceMode}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

interface NavItemProps {
  item: DocNavItem;
  pathname: string;
  audienceMode: 'technical' | 'explorer';
  depth?: number;
  onNavigate?: () => void;
}

function NavItem({ item, pathname, audienceMode, depth = 0, onNavigate }: NavItemProps) {
  const isActive = pathname === `/docs/${item.slug}`;
  const title = audienceMode === 'explorer' && item.title_explorer 
    ? item.title_explorer 
    : item.title;

  return (
    <li>
      <Link
        href={`/docs/${item.slug}`}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-2.5 text-sm transition-colors min-h-[44px]',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          depth > 0 && 'ml-4'
        )}
      >
        <FileText className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 truncate">{title}</span>
        {item.status !== 'canonical' && (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded',
            DOC_STATUSES[item.status].color
          )}>
            {item.status}
          </span>
        )}
        {item.children && item.children.length > 0 && (
          <ChevronRight className="h-4 w-4" />
        )}
      </Link>
      {item.children && item.children.length > 0 && (
        <ul className="mt-0.5">
          {item.children.map((child) => (
            <NavItem
              key={child.id}
              item={child}
              pathname={pathname}
              audienceMode={audienceMode}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
