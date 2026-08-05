'use client';

import { use } from 'react';
import { useDocPage, useAudienceMode } from '@/lib/docs/hooks';
import { DocSectionRenderer } from '@/components/docs/doc-section-renderer';
import { DocLinks } from '@/components/docs/doc-links';
import { DOC_ORIGINS, DOC_TYPES, DOC_STATUSES } from '@/lib/docs/types';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Clock, Tag, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: page, isLoading, error } = useDocPage(slug);
  const [audienceMode] = useAudienceMode();

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-12 w-96 rounded bg-muted" />
          <div className="space-y-4">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
            <div className="h-4 w-4/6 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !page) {
    notFound();
  }

  const title = audienceMode === 'explorer' && page.title_explorer
    ? page.title_explorer
    : page.title;

  // Fall back gracefully when a page carries an unknown or missing enum value
  const origin = DOC_ORIGINS[page.origin];
  const docType = DOC_TYPES[page.doc_type];
  const status = DOC_STATUSES[page.status];

  const originLabel = origin?.label ?? 'Uncategorized';
  const docTypeLabel = docType?.label ?? 'Document';
  const statusLabel = status?.label ?? 'Unknown';
  const statusColor = status?.color ?? 'bg-muted text-muted-foreground';

  // Collect all links from sections
  const allLinks = page.sections?.flatMap(s => s.links || []) || [];

  return (
    <article className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/docs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          All Documentation
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {originLabel}
          </span>
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {docTypeLabel}
          </span>
          <span className={cn('px-2 py-0.5 rounded', statusColor)}>
            {statusLabel}
          </span>
        </div>

        <h1 className="text-3xl font-bold mb-4">{title}</h1>

        {page.tags && page.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {page.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {new Date(page.updated_at).toLocaleDateString()}
          </span>
          {page.source_refs && page.source_refs.length > 0 && (
            <span className="flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {page.source_refs.length} source{page.source_refs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      {/* Sections */}
      <div className="space-y-8">
        {page.sections?.map((section) => (
          <DocSectionRenderer key={section.id} section={section} />
        ))}

        {(!page.sections || page.sections.length === 0) && (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              This page has no content yet.
            </p>
          </div>
        )}
      </div>

      {/* Related Links */}
      {allLinks.length > 0 && (
        <DocLinks links={allLinks} className="mt-12" />
      )}

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page ID: {page.id}</span>
          <Link
            href={`/docs/admin/${page.slug}`}
            className="hover:text-foreground"
          >
            Edit this page
          </Link>
        </div>
      </footer>
    </article>
  );
}
