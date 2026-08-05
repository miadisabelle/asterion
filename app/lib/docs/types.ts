// Documentation types for Asterion interactive documentation system

export type DocOrigin = 'academic' | 'technical' | 'narrative' | 'operational';

export type DocType = 
  | 'concept'    // Core ideas and abstractions
  | 'guide'      // How-to instructions
  | 'rispec'     // RISE/spec rebuildable specifications
  | 'api'        // API reference
  | 'playbook'   // Operational procedures
  | 'diagram'    // Visual-first content
  | 'story'      // Narrative arc
  | 'decision';  // Architectural decision records

export type DocStatus = 'draft' | 'review' | 'canonical' | 'deprecated';

export type SectionType = 
  | 'text'         // Rich text content
  | 'diagram'      // Mermaid or ReactFlow diagram
  | 'callout'      // Educational/warning/info boxes
  | 'code'         // Code snippets
  | 'interactive'; // Custom interactive elements

export type DiagramType =
  | 'layer_map'        // 7-layer Asterion topology
  | 'tension_chart'    // Structural tension visualization
  | 'telescope_tree'   // Recursive decomposition
  | 'runtime_loop'     // MMOT / execution cycles
  | 'project_lens'     // Cross-repo orchestration view
  | 'event_timeline'   // Immutable event history
  | 'narrative_thread' // Story progression
  | 'github_sync'      // GitHub integration flow
  | 'custom';          // Freeform diagram

export type CalloutType = 
  | 'info'       // General information
  | 'warning'    // Caution/watch out
  | 'tip'        // Helpful suggestion
  | 'why'        // Why framing matters (methodology teaching)
  | 'explorer';  // Explorer mode special content

export type LinkType = 
  | 'reference'    // General reference
  | 'implements'   // This doc implements that artifact
  | 'extends'      // This doc extends that concept
  | 'prerequisite' // Must read before this
  | 'related';     // Related content

export type AudienceMode = 'technical' | 'explorer';

export interface SourceRef {
  type: 'github_issue' | 'tension' | 'file' | 'url' | 'entity' | 'video_frame' | 'image_part';
  ref: string;
  label?: string;
}

export interface AudienceNotes {
  explorer_metaphor?: string;      // Different metaphor for explorer mode
  explorer_diagram_code?: string;  // Different diagram for explorer mode
  explorer_sequence?: number[];    // Different section order for explorer mode
}

export interface DocPage {
  id: string;
  slug: string;
  title: string;
  title_explorer: string | null;
  origin: DocOrigin;
  doc_type: DocType;
  status: DocStatus;
  parent_id: string | null;
  sort_order: number;
  audience_notes: AudienceNotes;
  source_refs: SourceRef[];
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  sections?: DocSection[];
}

export interface DocSection {
  id: string;
  page_id: string;
  title: string;
  title_explorer: string | null;
  content: string;
  content_explorer: string | null;
  section_type: SectionType;
  diagram_type: DiagramType | null;
  diagram_code: string | null;
  callout_type: CalloutType | null;
  sort_order: number;
  status: DocStatus;
  source_refs: SourceRef[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  links?: DocLink[];
}

export interface DocLink {
  id: string;
  from_section_id: string;
  to_page_id: string | null;
  to_tension_id: string | null;
  to_entity_id: string | null;
  to_layer_id: string | null;
  to_project_id: string | null;
  to_event_id: string | null;
  to_thread_id: string | null;
  to_github_ref: string | null;
  link_text: string;
  link_type: LinkType;
  metadata: Record<string, unknown>;
}

export interface DocRevision {
  id: string;
  section_id: string;
  content: string;
  content_explorer: string | null;
  edited_by: string | null;
  edit_summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DocNavItem {
  id: string;
  slug: string;
  title: string;
  title_explorer: string | null;
  origin: DocOrigin;
  doc_type: DocType;
  status: DocStatus;
  children?: DocNavItem[];
}

export interface DocSearchResult {
  page_id: string;
  slug: string;
  title: string;
  origin: DocOrigin;
  doc_type: DocType;
  matched_section_id?: string;
  matched_section_title?: string;
  snippet: string;
  score: number;
}

// Origin metadata for UI
export const DOC_ORIGINS: Record<DocOrigin, { label: string; description: string; icon: string }> = {
  academic: {
    label: 'Academic',
    description: 'Theoretical foundations, research references, conceptual frameworks',
    icon: 'GraduationCap'
  },
  technical: {
    label: 'Technical',
    description: 'Engineering specifications, architecture decisions, implementation details',
    icon: 'Code'
  },
  narrative: {
    label: 'Narrative',
    description: 'Stories, journeys, explanatory arcs, contextual understanding',
    icon: 'BookOpen'
  },
  operational: {
    label: 'Operational',
    description: 'API usage, playbooks, incident flows, runtime procedures',
    icon: 'Settings'
  }
};

export const DOC_TYPES: Record<DocType, { label: string; description: string }> = {
  concept: { label: 'Concept', description: 'Core ideas and abstractions' },
  guide: { label: 'Guide', description: 'How-to instructions' },
  rispec: { label: 'RISE/Spec', description: 'Rebuildable specifications' },
  api: { label: 'API Reference', description: 'API documentation' },
  playbook: { label: 'Playbook', description: 'Operational procedures' },
  diagram: { label: 'Diagram', description: 'Visual-first content' },
  story: { label: 'Story', description: 'Narrative arc' },
  decision: { label: 'Decision', description: 'Architectural decision record' }
};

export const DOC_STATUSES: Record<DocStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-yellow-500/20 text-yellow-400' },
  review: { label: 'In Review', color: 'bg-blue-500/20 text-blue-400' },
  canonical: { label: 'Canonical', color: 'bg-emerald-500/20 text-emerald-400' },
  deprecated: { label: 'Deprecated', color: 'bg-red-500/20 text-red-400' }
};

export const DIAGRAM_TYPES: Record<DiagramType, { label: string; description: string }> = {
  layer_map: { label: 'Layer Map', description: '7-layer Asterion topology' },
  tension_chart: { label: 'Tension Chart', description: 'Structural tension visualization' },
  telescope_tree: { label: 'Telescope Tree', description: 'Recursive decomposition' },
  runtime_loop: { label: 'Runtime Loop', description: 'MMOT / execution cycles' },
  project_lens: { label: 'Project Lens', description: 'Cross-repo orchestration view' },
  event_timeline: { label: 'Event Timeline', description: 'Immutable event history' },
  narrative_thread: { label: 'Narrative Thread', description: 'Story progression' },
  github_sync: { label: 'GitHub Sync', description: 'GitHub integration flow' },
  custom: { label: 'Custom', description: 'Freeform diagram' }
};

export const CALLOUT_TYPES: Record<CalloutType, { label: string; icon: string; color: string }> = {
  info: { label: 'Info', icon: 'Info', color: 'border-blue-500/50 bg-blue-500/10' },
  warning: { label: 'Warning', icon: 'AlertTriangle', color: 'border-amber-500/50 bg-amber-500/10' },
  tip: { label: 'Tip', icon: 'Lightbulb', color: 'border-emerald-500/50 bg-emerald-500/10' },
  why: { label: 'Why This Matters', icon: 'HelpCircle', color: 'border-purple-500/50 bg-purple-500/10' },
  explorer: { label: 'Explorer Note', icon: 'Sparkles', color: 'border-pink-500/50 bg-pink-500/10' }
};
