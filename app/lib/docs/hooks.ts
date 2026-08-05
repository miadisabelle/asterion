'use client';

import useSWR, { mutate } from 'swr';
import type { 
  DocPage, 
  DocNavItem, 
  DocSearchResult, 
  DocOrigin, 
  DocType, 
  DocStatus,
  AudienceMode,
  DocRevision
} from './types';

const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    // Surface HTTP failures as SWR errors instead of resolving with the
    // error body, which would otherwise be treated as valid data.
    const error = new Error(
      `Request failed with status ${res.status}`
    ) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return res.json();
};

// ============================================================================
// Audience Mode
// ============================================================================

const AUDIENCE_KEY = 'asterion-audience-mode';

export function useAudienceMode(): [AudienceMode, (mode: AudienceMode) => void] {
  const { data, mutate: setData } = useSWR<AudienceMode>(
    'audience-mode',
    () => {
      if (typeof window === 'undefined') return 'technical';
      return (localStorage.getItem(AUDIENCE_KEY) as AudienceMode) || 'technical';
    },
    { fallbackData: 'technical' }
  );

  const setMode = (mode: AudienceMode) => {
    localStorage.setItem(AUDIENCE_KEY, mode);
    setData(mode, false);
  };

  return [data || 'technical', setMode];
}

// ============================================================================
// Doc Pages
// ============================================================================

export function useDocPages(filters?: {
  origin?: DocOrigin;
  doc_type?: DocType;
  status?: DocStatus;
}) {
  const params = new URLSearchParams();
  if (filters?.origin) params.set('origin', filters.origin);
  if (filters?.doc_type) params.set('doc_type', filters.doc_type);
  if (filters?.status) params.set('status', filters.status);
  
  const queryString = params.toString();
  const url = `/api/docs/pages${queryString ? `?${queryString}` : ''}`;
  
  return useSWR<DocPage[]>(url, fetcher);
}

export function useDocPage(slug: string) {
  return useSWR<DocPage>(
    slug ? `/api/docs/pages/${slug}` : null,
    fetcher
  );
}

export async function createDocPage(data: Partial<DocPage>) {
  const res = await fetch('/api/docs/pages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create page');
  mutate((key: string) => key?.startsWith('/api/docs'));
  return res.json();
}

export async function updateDocPage(id: string, data: Partial<DocPage>) {
  const res = await fetch(`/api/docs/pages/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update page');
  mutate((key: string) => key?.startsWith('/api/docs'));
  return res.json();
}

export async function deleteDocPage(id: string) {
  const res = await fetch(`/api/docs/pages/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete page');
  mutate((key: string) => key?.startsWith('/api/docs'));
}

// ============================================================================
// Doc Sections
// ============================================================================

export async function createDocSection(data: {
  page_id: string;
  title: string;
  content: string;
  [key: string]: unknown;
}) {
  const res = await fetch('/api/docs/sections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create section');
  mutate((key: string) => key?.startsWith('/api/docs'));
  return res.json();
}

export async function updateDocSection(
  id: string, 
  data: Record<string, unknown>,
  editSummary?: string
) {
  const res = await fetch(`/api/docs/sections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, edit_summary: editSummary })
  });
  if (!res.ok) throw new Error('Failed to update section');
  mutate((key: string) => key?.startsWith('/api/docs'));
  return res.json();
}

export async function deleteDocSection(id: string) {
  const res = await fetch(`/api/docs/sections/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete section');
  mutate((key: string) => key?.startsWith('/api/docs'));
}

// ============================================================================
// Doc Navigation
// ============================================================================

export function useDocNavigation() {
  return useSWR<Record<DocOrigin, DocNavItem[]>>(
    '/api/docs/navigation',
    fetcher
  );
}

// ============================================================================
// Doc Search
// ============================================================================

export function useDocSearch(query: string, filters?: {
  origin?: DocOrigin;
  doc_type?: DocType;
  status?: DocStatus;
}) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (filters?.origin) params.set('origin', filters.origin);
  if (filters?.doc_type) params.set('doc_type', filters.doc_type);
  if (filters?.status) params.set('status', filters.status);
  
  const queryString = params.toString();
  const url = query ? `/api/docs/search?${queryString}` : null;
  
  return useSWR<DocSearchResult[]>(url, fetcher);
}

// ============================================================================
// Doc Revisions
// ============================================================================

export function useDocRevisions(sectionId: string) {
  return useSWR<DocRevision[]>(
    sectionId ? `/api/docs/sections/${sectionId}/revisions` : null,
    fetcher
  );
}
