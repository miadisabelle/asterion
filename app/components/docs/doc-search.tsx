'use client';

import { useState } from 'react';
import { useDocSearch, useAudienceMode } from '@/lib/docs/hooks';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, X, FileText } from 'lucide-react';
import Link from 'next/link';
import { DOC_ORIGINS } from '@/lib/docs/types';

interface DocSearchProps {
  className?: string;
}

export function DocSearch({ className }: DocSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data: results, isLoading } = useDocSearch(query);
  const [audienceMode] = useAudienceMode();

  const handleClose = () => {
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-9"
        />
        {query && (
          <button
            onClick={handleClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border bg-popover shadow-lg">
          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {!isLoading && results && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {!isLoading && results && results.length > 0 && (
            <ul className="divide-y divide-border">
              {results.map((result) => (
                <li key={`${result.page_id}-${result.matched_section_id || 'page'}`}>
                  <Link
                    href={`/docs/${result.slug}`}
                    onClick={handleClose}
                    className="flex items-start gap-3 p-3 hover:bg-muted transition-colors"
                  >
                    <FileText className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{result.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {DOC_ORIGINS[result.origin].label}
                        </span>
                      </div>
                      {result.matched_section_title && (
                        <p className="text-sm text-muted-foreground truncate">
                          Section: {result.matched_section_title}
                        </p>
                      )}
                      {result.snippet && (
                        <p className="text-xs text-muted-foreground/70 truncate mt-1">
                          {result.snippet}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
