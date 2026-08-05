import { sql } from '@/lib/asterion/db';
import type { 
  DocPage, 
  DocSection, 
  DocLink, 
  DocRevision, 
  DocNavItem,
  DocSearchResult,
  DocOrigin,
  DocType,
  DocStatus
} from './types';

// ============================================================================
// Doc Pages
// ============================================================================

export async function getDocPages(filters?: {
  origin?: DocOrigin;
  doc_type?: DocType;
  status?: DocStatus;
  parent_id?: string | null;
}): Promise<DocPage[]> {
  let query = `
    SELECT * FROM asterion.doc_pages
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.origin) {
    query += ` AND origin = $${paramIndex++}`;
    params.push(filters.origin);
  }
  if (filters?.doc_type) {
    query += ` AND doc_type = $${paramIndex++}`;
    params.push(filters.doc_type);
  }
  if (filters?.status) {
    query += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }
  if (filters?.parent_id !== undefined) {
    if (filters.parent_id === null) {
      query += ` AND parent_id IS NULL`;
    } else {
      query += ` AND parent_id = $${paramIndex++}`;
      params.push(filters.parent_id);
    }
  }

  query += ` ORDER BY sort_order, title`;

  const result = await sql.query(query, params);
  return result as DocPage[];
}

export async function getDocPageBySlug(slug: string): Promise<DocPage | null> {
  const result = await sql`
    SELECT * FROM asterion.doc_pages WHERE slug = ${slug}
  `;
  return result[0] as DocPage || null;
}

export async function getDocPageById(id: string): Promise<DocPage | null> {
  const result = await sql`
    SELECT * FROM asterion.doc_pages WHERE id = ${id}::uuid
  `;
  return result[0] as DocPage || null;
}

export async function getDocPageWithSections(slug: string): Promise<DocPage | null> {
  const page = await getDocPageBySlug(slug);
  if (!page) return null;

  const sections = await getDocSections(page.id);
  
  // Get links for each section
  for (const section of sections) {
    section.links = await getDocLinks(section.id);
  }

  return { ...page, sections };
}

export async function createDocPage(data: {
  slug: string;
  title: string;
  title_explorer?: string;
  origin: DocOrigin;
  doc_type?: DocType;
  status?: DocStatus;
  parent_id?: string;
  sort_order?: number;
  audience_notes?: Record<string, unknown>;
  source_refs?: unknown[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<DocPage> {
  const result = await sql`
    INSERT INTO asterion.doc_pages (
      slug, title, title_explorer, origin, doc_type, status, 
      parent_id, sort_order, audience_notes, source_refs, tags, metadata
    ) VALUES (
      ${data.slug},
      ${data.title},
      ${data.title_explorer || null},
      ${data.origin},
      ${data.doc_type || 'concept'},
      ${data.status || 'draft'},
      ${data.parent_id || null}::uuid,
      ${data.sort_order || 0},
      ${JSON.stringify(data.audience_notes || {})}::jsonb,
      ${JSON.stringify(data.source_refs || [])}::jsonb,
      ${data.tags || []}::text[],
      ${JSON.stringify(data.metadata || {})}::jsonb
    )
    RETURNING *
  `;
  return result[0] as DocPage;
}

export async function updateDocPage(
  id: string,
  data: Partial<Omit<DocPage, 'id' | 'created_at'>>
): Promise<DocPage> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fields = [
    'slug', 'title', 'title_explorer', 'origin', 'doc_type', 
    'status', 'parent_id', 'sort_order', 'audience_notes', 
    'source_refs', 'tags', 'metadata'
  ];

  for (const field of fields) {
    if (field in data) {
      const value = data[field as keyof typeof data];
      if (field === 'audience_notes' || field === 'metadata') {
        setClauses.push(`${field} = $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(value));
      } else if (field === 'source_refs') {
        setClauses.push(`${field} = $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(value));
      } else if (field === 'tags') {
        setClauses.push(`${field} = $${paramIndex++}::text[]`);
        values.push(value);
      } else if (field === 'parent_id') {
        setClauses.push(`${field} = $${paramIndex++}::uuid`);
        values.push(value);
      } else {
        setClauses.push(`${field} = $${paramIndex++}`);
        values.push(value);
      }
    }
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const query = `
    UPDATE asterion.doc_pages 
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING *
  `;

  const result = await sql.query(query, values);
  return result[0] as DocPage;
}

export async function deleteDocPage(id: string): Promise<void> {
  await sql`DELETE FROM asterion.doc_pages WHERE id = ${id}::uuid`;
}

// ============================================================================
// Doc Sections
// ============================================================================

export async function getDocSections(pageId: string): Promise<DocSection[]> {
  const result = await sql`
    SELECT * FROM asterion.doc_sections 
    WHERE page_id = ${pageId}::uuid
    ORDER BY sort_order
  `;
  return result as DocSection[];
}

export async function createDocSection(data: {
  page_id: string;
  title: string;
  title_explorer?: string;
  content: string;
  content_explorer?: string;
  section_type?: string;
  diagram_type?: string;
  diagram_code?: string;
  callout_type?: string;
  sort_order?: number;
  status?: string;
  source_refs?: unknown[];
  metadata?: Record<string, unknown>;
}): Promise<DocSection> {
  const result = await sql`
    INSERT INTO asterion.doc_sections (
      page_id, title, title_explorer, content, content_explorer,
      section_type, diagram_type, diagram_code, callout_type,
      sort_order, status, source_refs, metadata
    ) VALUES (
      ${data.page_id}::uuid,
      ${data.title},
      ${data.title_explorer || null},
      ${data.content},
      ${data.content_explorer || null},
      ${data.section_type || 'text'},
      ${data.diagram_type || null},
      ${data.diagram_code || null},
      ${data.callout_type || null},
      ${data.sort_order || 0},
      ${data.status || 'draft'},
      ${JSON.stringify(data.source_refs || [])}::jsonb,
      ${JSON.stringify(data.metadata || {})}::jsonb
    )
    RETURNING *
  `;
  return result[0] as DocSection;
}

export async function updateDocSection(
  id: string,
  data: Partial<Omit<DocSection, 'id' | 'page_id' | 'created_at'>>,
  editSummary?: string
): Promise<DocSection> {
  // First, save a revision if content changed
  if (data.content || data.content_explorer) {
    const current = await sql`SELECT * FROM asterion.doc_sections WHERE id = ${id}::uuid`;
    if (current[0]) {
      await createDocRevision({
        section_id: id,
        content: current[0].content as string,
        content_explorer: current[0].content_explorer as string | undefined,
        edit_summary: editSummary
      });
    }
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fields = [
    'title', 'title_explorer', 'content', 'content_explorer',
    'section_type', 'diagram_type', 'diagram_code', 'callout_type',
    'sort_order', 'status', 'source_refs', 'metadata'
  ];

  for (const field of fields) {
    if (field in data) {
      const value = data[field as keyof typeof data];
      if (field === 'source_refs' || field === 'metadata') {
        setClauses.push(`${field} = $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(value));
      } else {
        setClauses.push(`${field} = $${paramIndex++}`);
        values.push(value);
      }
    }
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const query = `
    UPDATE asterion.doc_sections 
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING *
  `;

  const result = await sql.query(query, values);
  return result[0] as DocSection;
}

export async function deleteDocSection(id: string): Promise<void> {
  await sql`DELETE FROM asterion.doc_sections WHERE id = ${id}::uuid`;
}

// ============================================================================
// Doc Links
// ============================================================================

export async function getDocLinks(sectionId: string): Promise<DocLink[]> {
  const result = await sql`
    SELECT * FROM asterion.doc_links WHERE from_section_id = ${sectionId}::uuid
  `;
  return result as DocLink[];
}

export async function createDocLink(data: {
  from_section_id: string;
  link_text: string;
  link_type?: string;
  to_page_id?: string;
  to_tension_id?: string;
  to_entity_id?: string;
  to_layer_id?: string;
  to_project_id?: string;
  to_event_id?: string;
  to_thread_id?: string;
  to_github_ref?: string;
  metadata?: Record<string, unknown>;
}): Promise<DocLink> {
  const result = await sql`
    INSERT INTO asterion.doc_links (
      from_section_id, link_text, link_type,
      to_page_id, to_tension_id, to_entity_id, to_layer_id,
      to_project_id, to_event_id, to_thread_id, to_github_ref, metadata
    ) VALUES (
      ${data.from_section_id}::uuid,
      ${data.link_text},
      ${data.link_type || 'reference'},
      ${data.to_page_id || null}::uuid,
      ${data.to_tension_id || null}::uuid,
      ${data.to_entity_id || null}::uuid,
      ${data.to_layer_id || null}::uuid,
      ${data.to_project_id || null}::uuid,
      ${data.to_event_id || null}::uuid,
      ${data.to_thread_id || null}::uuid,
      ${data.to_github_ref || null},
      ${JSON.stringify(data.metadata || {})}::jsonb
    )
    RETURNING *
  `;
  return result[0] as DocLink;
}

export async function deleteDocLink(id: string): Promise<void> {
  await sql`DELETE FROM asterion.doc_links WHERE id = ${id}::uuid`;
}

// ============================================================================
// Doc Revisions
// ============================================================================

export async function getDocRevisions(sectionId: string): Promise<DocRevision[]> {
  const result = await sql`
    SELECT * FROM asterion.doc_revisions 
    WHERE section_id = ${sectionId}::uuid
    ORDER BY created_at DESC
  `;
  return result as DocRevision[];
}

export async function createDocRevision(data: {
  section_id: string;
  content: string;
  content_explorer?: string;
  edited_by?: string;
  edit_summary?: string;
  metadata?: Record<string, unknown>;
}): Promise<DocRevision> {
  const result = await sql`
    INSERT INTO asterion.doc_revisions (
      section_id, content, content_explorer, edited_by, edit_summary, metadata
    ) VALUES (
      ${data.section_id}::uuid,
      ${data.content},
      ${data.content_explorer || null},
      ${data.edited_by || null}::uuid,
      ${data.edit_summary || null},
      ${JSON.stringify(data.metadata || {})}::jsonb
    )
    RETURNING *
  `;
  return result[0] as DocRevision;
}

// ============================================================================
// Navigation
// ============================================================================

export async function getDocNavigation(): Promise<Record<DocOrigin, DocNavItem[]>> {
  const pages = await sql`
    SELECT id, slug, title, title_explorer, origin, doc_type, status, parent_id, sort_order
    FROM asterion.doc_pages
    ORDER BY sort_order, title
  `;

  const nav: Record<DocOrigin, DocNavItem[]> = {
    academic: [],
    technical: [],
    narrative: [],
    operational: []
  };

  // Build tree structure
  const pageMap = new Map<string, DocNavItem>();
  for (const page of pages) {
    const p = page as DocPage;
    pageMap.set(p.id, {
      id: p.id,
      slug: p.slug,
      title: p.title,
      title_explorer: p.title_explorer,
      origin: p.origin,
      doc_type: p.doc_type,
      status: p.status,
      children: []
    });
  }

  // Assign children and roots
  for (const page of pages) {
    const p = page as DocPage;
    const navItem = pageMap.get(p.id)!;
    if (p.parent_id && pageMap.has(p.parent_id)) {
      pageMap.get(p.parent_id)!.children!.push(navItem);
    } else {
      nav[p.origin].push(navItem);
    }
  }

  return nav;
}

// ============================================================================
// Search
// ============================================================================

export async function searchDocs(
  query: string,
  filters?: {
    origin?: DocOrigin;
    doc_type?: DocType;
    status?: DocStatus;
  }
): Promise<DocSearchResult[]> {
  const searchPattern = `%${query.toLowerCase()}%`;
  
  let filterClause = '';
  const params: unknown[] = [searchPattern, searchPattern, searchPattern, searchPattern];
  let paramIndex = 5;

  if (filters?.origin) {
    filterClause += ` AND p.origin = $${paramIndex++}`;
    params.push(filters.origin);
  }
  if (filters?.doc_type) {
    filterClause += ` AND p.doc_type = $${paramIndex++}`;
    params.push(filters.doc_type);
  }
  if (filters?.status) {
    filterClause += ` AND p.status = $${paramIndex++}`;
    params.push(filters.status);
  }

  const result = await sql.query(`
    SELECT DISTINCT ON (p.id)
      p.id as page_id,
      p.slug,
      p.title,
      p.origin,
      p.doc_type,
      s.id as matched_section_id,
      s.title as matched_section_title,
      COALESCE(
        CASE WHEN LOWER(s.content) LIKE $1 
          THEN SUBSTRING(s.content FROM 1 FOR 200) 
          ELSE NULL 
        END,
        CASE WHEN LOWER(p.title) LIKE $2 
          THEN p.title 
          ELSE NULL 
        END
      ) as snippet,
      CASE 
        WHEN LOWER(p.title) LIKE $3 THEN 100
        WHEN LOWER(s.title) LIKE $4 THEN 80
        ELSE 50
      END as score
    FROM asterion.doc_pages p
    LEFT JOIN asterion.doc_sections s ON s.page_id = p.id
    WHERE (
      LOWER(p.title) LIKE $1 OR
      LOWER(p.title_explorer) LIKE $1 OR
      LOWER(s.title) LIKE $1 OR
      LOWER(s.content) LIKE $1 OR
      LOWER(s.content_explorer) LIKE $1 OR
      $1 = ANY(SELECT LOWER(unnest(p.tags)))
    )
    ${filterClause}
    ORDER BY p.id, score DESC
    LIMIT 50
  `, params);

  return result as DocSearchResult[];
}
