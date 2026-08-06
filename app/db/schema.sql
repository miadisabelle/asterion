-- Asterion database schema
-- Introspected from the live Neon instance, not hand-written.
-- Replay against a fresh database to rebuild the factory's surface.

CREATE SCHEMA IF NOT EXISTS asterion;

-- ============ tables ============

CREATE TABLE IF NOT EXISTS asterion.action_steps (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tension_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending'::text,
  assigned_to text,
  responsible_entity_id uuid,
  sort_order integer DEFAULT 0,
  telescoped_to_tension_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT action_steps_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS asterion.doc_links (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  from_section_id uuid NOT NULL,
  to_page_id uuid,
  to_tension_id uuid,
  to_entity_id uuid,
  to_layer_id uuid,
  to_project_id uuid,
  to_event_id uuid,
  to_thread_id uuid,
  to_github_ref text,
  link_text text NOT NULL,
  link_type text DEFAULT 'reference'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT doc_links_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS asterion.doc_pages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  title_explorer text,
  origin text NOT NULL,
  doc_type text DEFAULT 'concept'::text,
  status text DEFAULT 'draft'::text,
  parent_id uuid,
  sort_order integer DEFAULT 0,
  audience_notes jsonb DEFAULT '{}'::jsonb,
  source_refs jsonb DEFAULT '[]'::jsonb,
  tags text[] DEFAULT '{}'::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT doc_pages_pkey PRIMARY KEY (id),
  CONSTRAINT doc_pages_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS asterion.doc_revisions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  section_id uuid,
  content text NOT NULL,
  content_explorer text,
  edited_by uuid,
  edit_summary text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT doc_revisions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS asterion.doc_sections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  page_id uuid NOT NULL,
  title text NOT NULL,
  title_explorer text,
  content text NOT NULL,
  content_explorer text,
  section_type text DEFAULT 'text'::text,
  diagram_type text,
  diagram_code text,
  callout_type text,
  sort_order integer DEFAULT 0,
  status text DEFAULT 'draft'::text,
  source_refs jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT doc_sections_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS asterion.entities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  entity_type text NOT NULL,
  external_id text,
  external_source text,
  layer_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT entities_pkey PRIMARY KEY (id),
  CONSTRAINT entities_external_id_external_source_key UNIQUE (external_id, external_source)
);

CREATE TABLE IF NOT EXISTS asterion.events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_type text NOT NULL,
  actor_type text,
  actor_id text,
  tension_id uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS asterion.layers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  layer_type text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT layers_pkey PRIMARY KEY (id),
  CONSTRAINT layers_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS asterion.mmot_evaluations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tension_id uuid NOT NULL,
  phase text NOT NULL,
  acknowledge_notes text,
  analyze_notes text,
  chart_update text,
  recommit_or_redirect text,
  outcome text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT mmot_evaluations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS asterion.narrative_beats (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tension_id uuid NOT NULL,
  beat_type text NOT NULL,
  title text,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT narrative_beats_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS asterion.narrative_threads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  thread_type text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT narrative_threads_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS asterion.observations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_id uuid NOT NULL,
  content text NOT NULL,
  observation_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT observations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS asterion.project_tensions (
  project_id uuid NOT NULL,
  tension_id uuid NOT NULL,
  lens text,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT project_tensions_pkey PRIMARY KEY (project_id, tension_id)
);

CREATE TABLE IF NOT EXISTS asterion.projects (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  codename text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS asterion.relations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  from_entity_id uuid NOT NULL,
  to_entity_id uuid NOT NULL,
  relation_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT relations_pkey PRIMARY KEY (id),
  CONSTRAINT relations_from_entity_id_to_entity_id_relation_type_key UNIQUE (from_entity_id, to_entity_id, relation_type)
);

CREATE TABLE IF NOT EXISTS asterion.tension_edges (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  from_tension_id uuid,
  to_tension_id uuid,
  edge_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tension_edges_pkey PRIMARY KEY (id),
  CONSTRAINT tension_edges_from_tension_id_to_tension_id_edge_type_key UNIQUE (from_tension_id, to_tension_id, edge_type)
);

CREATE TABLE IF NOT EXISTS asterion.tensions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  desired_outcome text NOT NULL,
  current_reality text NOT NULL,
  phase text DEFAULT 'germination'::text NOT NULL,
  phase_notes text,
  phase_started_at timestamptz DEFAULT now(),
  layer_id uuid,
  parent_id uuid,
  source_action_step_id uuid,
  telescope_depth integer DEFAULT 0,
  accountable_user_id uuid,
  github_owner text,
  github_repo text,
  github_issue_number integer,
  github_project_id text,
  github_project_item_id text,
  github_sync_state jsonb DEFAULT '{}'::jsonb,
  due_date timestamptz,
  progress integer DEFAULT 0,
  status text DEFAULT 'active'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT tensions_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
  CONSTRAINT tensions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS asterion.thread_tensions (
  thread_id uuid NOT NULL,
  tension_id uuid NOT NULL,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT thread_tensions_pkey PRIMARY KEY (thread_id, tension_id)
);

-- ============ foreign keys ============
ALTER TABLE asterion.action_steps ADD CONSTRAINT action_steps_telescoped_to_tension_id_fkey FOREIGN KEY (telescoped_to_tension_id) REFERENCES asterion.tensions(id) ON DELETE SET NULL;
ALTER TABLE asterion.action_steps ADD CONSTRAINT action_steps_tension_id_fkey FOREIGN KEY (tension_id) REFERENCES asterion.tensions(id) ON DELETE CASCADE;
ALTER TABLE asterion.doc_links ADD CONSTRAINT doc_links_from_section_id_fkey FOREIGN KEY (from_section_id) REFERENCES asterion.doc_sections(id) ON DELETE CASCADE;
ALTER TABLE asterion.doc_links ADD CONSTRAINT doc_links_to_entity_id_fkey FOREIGN KEY (to_entity_id) REFERENCES asterion.entities(id) ON DELETE CASCADE;
ALTER TABLE asterion.doc_links ADD CONSTRAINT doc_links_to_event_id_fkey FOREIGN KEY (to_event_id) REFERENCES asterion.events(id) ON DELETE CASCADE;
ALTER TABLE asterion.doc_links ADD CONSTRAINT doc_links_to_layer_id_fkey FOREIGN KEY (to_layer_id) REFERENCES asterion.layers(id) ON DELETE CASCADE;
ALTER TABLE asterion.doc_links ADD CONSTRAINT doc_links_to_page_id_fkey FOREIGN KEY (to_page_id) REFERENCES asterion.doc_pages(id) ON DELETE CASCADE;
ALTER TABLE asterion.doc_links ADD CONSTRAINT doc_links_to_project_id_fkey FOREIGN KEY (to_project_id) REFERENCES asterion.projects(id) ON DELETE CASCADE;
ALTER TABLE asterion.doc_links ADD CONSTRAINT doc_links_to_tension_id_fkey FOREIGN KEY (to_tension_id) REFERENCES asterion.tensions(id) ON DELETE CASCADE;
ALTER TABLE asterion.doc_links ADD CONSTRAINT doc_links_to_thread_id_fkey FOREIGN KEY (to_thread_id) REFERENCES asterion.narrative_threads(id) ON DELETE CASCADE;
ALTER TABLE asterion.doc_pages ADD CONSTRAINT doc_pages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES asterion.doc_pages(id) ON DELETE SET NULL;
ALTER TABLE asterion.doc_revisions ADD CONSTRAINT doc_revisions_section_id_fkey FOREIGN KEY (section_id) REFERENCES asterion.doc_sections(id) ON DELETE CASCADE;
ALTER TABLE asterion.doc_sections ADD CONSTRAINT doc_sections_page_id_fkey FOREIGN KEY (page_id) REFERENCES asterion.doc_pages(id) ON DELETE CASCADE;
ALTER TABLE asterion.entities ADD CONSTRAINT entities_layer_id_fkey FOREIGN KEY (layer_id) REFERENCES asterion.layers(id) ON DELETE SET NULL;
ALTER TABLE asterion.events ADD CONSTRAINT events_tension_id_fkey FOREIGN KEY (tension_id) REFERENCES asterion.tensions(id) ON DELETE SET NULL;
ALTER TABLE asterion.mmot_evaluations ADD CONSTRAINT mmot_evaluations_tension_id_fkey FOREIGN KEY (tension_id) REFERENCES asterion.tensions(id) ON DELETE CASCADE;
ALTER TABLE asterion.narrative_beats ADD CONSTRAINT narrative_beats_tension_id_fkey FOREIGN KEY (tension_id) REFERENCES asterion.tensions(id) ON DELETE CASCADE;
ALTER TABLE asterion.observations ADD CONSTRAINT observations_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES asterion.entities(id) ON DELETE CASCADE;
ALTER TABLE asterion.project_tensions ADD CONSTRAINT project_tensions_project_id_fkey FOREIGN KEY (project_id) REFERENCES asterion.projects(id) ON DELETE CASCADE;
ALTER TABLE asterion.project_tensions ADD CONSTRAINT project_tensions_tension_id_fkey FOREIGN KEY (tension_id) REFERENCES asterion.tensions(id) ON DELETE CASCADE;
ALTER TABLE asterion.relations ADD CONSTRAINT relations_from_entity_id_fkey FOREIGN KEY (from_entity_id) REFERENCES asterion.entities(id) ON DELETE CASCADE;
ALTER TABLE asterion.relations ADD CONSTRAINT relations_to_entity_id_fkey FOREIGN KEY (to_entity_id) REFERENCES asterion.entities(id) ON DELETE CASCADE;
ALTER TABLE asterion.tension_edges ADD CONSTRAINT tension_edges_from_tension_id_fkey FOREIGN KEY (from_tension_id) REFERENCES asterion.tensions(id) ON DELETE CASCADE;
ALTER TABLE asterion.tension_edges ADD CONSTRAINT tension_edges_to_tension_id_fkey FOREIGN KEY (to_tension_id) REFERENCES asterion.tensions(id) ON DELETE CASCADE;
ALTER TABLE asterion.tensions ADD CONSTRAINT tensions_layer_id_fkey FOREIGN KEY (layer_id) REFERENCES asterion.layers(id) ON DELETE SET NULL;
ALTER TABLE asterion.tensions ADD CONSTRAINT tensions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES asterion.tensions(id) ON DELETE CASCADE;
ALTER TABLE asterion.thread_tensions ADD CONSTRAINT thread_tensions_tension_id_fkey FOREIGN KEY (tension_id) REFERENCES asterion.tensions(id) ON DELETE CASCADE;
ALTER TABLE asterion.thread_tensions ADD CONSTRAINT thread_tensions_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES asterion.narrative_threads(id) ON DELETE CASCADE;

-- ============ indexes ============
CREATE INDEX IF NOT EXISTS idx_doc_pages_origin ON asterion.doc_pages USING btree (origin);
CREATE INDEX IF NOT EXISTS idx_events_created ON asterion.events USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tensions_phase ON asterion.tensions USING btree (phase);
CREATE INDEX IF NOT EXISTS idx_tensions_status ON asterion.tensions USING btree (status);
