'use client';

import Link from 'next/link';
import type { DocLink } from '@/lib/docs/types';
import { 
  FileText, 
  Target, 
  Box, 
  Layers, 
  FolderKanban, 
  Calendar, 
  BookOpen,
  Github
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocLinksProps {
  links: DocLink[];
  className?: string;
}

export function DocLinks({ links, className }: DocLinksProps) {
  if (!links || links.length === 0) return null;

  return (
    <div className={cn('mt-6 rounded-lg border bg-card p-4', className)}>
      <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Related</h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <DocLinkItem key={link.id} link={link} />
        ))}
      </ul>
    </div>
  );
}

function DocLinkItem({ link }: { link: DocLink }) {
  const { href, icon: Icon, type } = getLinkInfo(link);

  if (!href) return null;

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1">{link.link_text}</span>
        <span className="text-xs opacity-60">{type}</span>
      </Link>
    </li>
  );
}

function getLinkInfo(link: DocLink): { 
  href: string | null; 
  icon: typeof FileText; 
  type: string;
} {
  if (link.to_page_id) {
    return { href: `/docs/${link.to_page_id}`, icon: FileText, type: 'doc' };
  }
  if (link.to_tension_id) {
    return { href: `/tensions/${link.to_tension_id}`, icon: Target, type: 'tension' };
  }
  if (link.to_entity_id) {
    return { href: `/graph?entity=${link.to_entity_id}`, icon: Box, type: 'entity' };
  }
  if (link.to_layer_id) {
    return { href: `/layers`, icon: Layers, type: 'layer' };
  }
  if (link.to_project_id) {
    return { href: `/projects/${link.to_project_id}`, icon: FolderKanban, type: 'project' };
  }
  if (link.to_event_id) {
    return { href: `/events?event=${link.to_event_id}`, icon: Calendar, type: 'event' };
  }
  if (link.to_thread_id) {
    return { href: `/threads?thread=${link.to_thread_id}`, icon: BookOpen, type: 'thread' };
  }
  if (link.to_github_ref) {
    return { href: link.to_github_ref, icon: Github, type: 'github' };
  }
  return { href: null, icon: FileText, type: 'unknown' };
}
