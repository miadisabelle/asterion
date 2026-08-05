// Asterion Core Types - Recursive Execution Operating Substrate

export type Phase = 'germination' | 'assimilation' | 'completion'
export type TensionStatus = 'active' | 'paused' | 'resolved' | 'archived'
export type ActionStepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped'
export type EdgeType = 'blocks' | 'depends_on' | 'relates_to' | 'duplicates' | 'supersedes'
export type LayerType = 'runtime' | 'memory' | 'governance' | 'pde' | 'docs' | 'security' | 'operator'
export type MMOTPhase = 'acknowledge' | 'analyze' | 'update_chart' | 'recommit_or_redirect'

// Fritz Structural Tension methodology
export interface Tension {
  id: string
  title: string
  desired_outcome: string
  current_reality: string
  phase: Phase
  phase_notes: string | null
  phase_started_at: string
  layer_id: string | null
  parent_id: string | null
  source_action_step_id: string | null
  telescope_depth: number
  accountable_user_id: string | null
  // GitHub bridge
  github_owner: string | null
  github_repo: string | null
  github_issue_number: number | null
  github_project_id: string | null
  github_project_item_id: string | null
  github_sync_state: Record<string, unknown>
  due_date: string | null
  progress: number
  status: TensionStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Relations (populated by queries)
  layer?: Layer
  parent?: Tension
  children?: Tension[]
  action_steps?: ActionStep[]
  edges_from?: TensionEdge[]
  edges_to?: TensionEdge[]
}

export interface TensionEdge {
  id: string
  from_tension_id: string
  to_tension_id: string
  edge_type: EdgeType
  metadata: Record<string, unknown>
  created_at: string
  // Relations
  from_tension?: Tension
  to_tension?: Tension
}

export interface ActionStep {
  id: string
  tension_id: string
  title: string
  description: string | null
  status: ActionStepStatus
  assigned_to: string | null
  responsible_entity_id: string | null
  sort_order: number
  telescoped_to_tension_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Relations
  tension?: Tension
  telescoped_tension?: Tension
}

// Projects - Orchestration lenses across repos
export interface Project {
  id: string
  name: string
  codename: string | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Relations
  tensions?: ProjectTension[]
}

export interface ProjectTension {
  project_id: string
  tension_id: string
  lens: string | null
  sort_order: number
  metadata: Record<string, unknown>
  // Relations
  project?: Project
  tension?: Tension
}

// Canonical Layer Taxonomy
export interface Layer {
  id: string
  name: string
  layer_type: LayerType
  description: string | null
  sort_order: number
  metadata: Record<string, unknown>
  created_at: string
}

// Knowledge Graph
export interface Entity {
  id: string
  name: string
  entity_type: string
  external_id: string | null
  external_source: string | null
  layer_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Relations
  layer?: Layer
  relations_from?: Relation[]
  relations_to?: Relation[]
  observations?: Observation[]
}

export interface Relation {
  id: string
  from_entity_id: string
  to_entity_id: string
  relation_type: string
  metadata: Record<string, unknown>
  created_at: string
  // Relations
  from_entity?: Entity
  to_entity?: Entity
}

export interface Observation {
  id: string
  entity_id: string
  content: string
  observation_type: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// MMOT Evaluation (recursive witnessing)
export interface MMOTEvaluation {
  id: string
  tension_id: string
  phase: MMOTPhase
  acknowledge_notes: string | null
  analyze_notes: string | null
  chart_update: string | null
  recommit_or_redirect: string | null
  outcome: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// Narrative Threading
export interface NarrativeThread {
  id: string
  name: string
  thread_type: string | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  // Relations
  tensions?: ThreadTension[]
}

export interface ThreadTension {
  thread_id: string
  tension_id: string
  sort_order: number
  metadata: Record<string, unknown>
}

export interface NarrativeBeat {
  id: string
  tension_id: string
  beat_type: string
  title: string | null
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

// Immutable Event Log
export interface AsterionEvent {
  id: string
  event_type: string
  actor_type: string | null
  actor_id: string | null
  tension_id: string | null
  payload: Record<string, unknown>
  created_at: string
}

// Validation types for Fritz methodology
export interface TensionValidation {
  valid: boolean
  errors: TensionValidationError[]
  warnings: TensionValidationWarning[]
}

export interface TensionValidationError {
  field: string
  code: string
  message: string
}

export interface TensionValidationWarning {
  field: string
  code: string
  message: string
}

// Input types for mutations
export interface CreateTensionInput {
  title: string
  desired_outcome: string
  current_reality: string
  phase?: Phase
  layer_id?: string
  parent_id?: string
  source_action_step_id?: string
  accountable_user_id?: string
  github_owner?: string
  github_repo?: string
  github_issue_number?: number
  due_date?: string
  metadata?: Record<string, unknown>
}

export interface UpdateTensionInput {
  title?: string
  desired_outcome?: string
  current_reality?: string
  phase?: Phase
  phase_notes?: string
  layer_id?: string | null
  progress?: number
  status?: TensionStatus
  due_date?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateActionStepInput {
  tension_id: string
  title: string
  description?: string
  assigned_to?: string
  sort_order?: number
  metadata?: Record<string, unknown>
}

export interface CreateProjectInput {
  name: string
  codename?: string
  description?: string
  metadata?: Record<string, unknown>
}

export interface CreateEntityInput {
  name: string
  entity_type: string
  external_id?: string
  external_source?: string
  layer_id?: string
  metadata?: Record<string, unknown>
}

export interface CreateMMOTEvaluationInput {
  tension_id: string
  phase: MMOTPhase
  acknowledge_notes?: string
  analyze_notes?: string
  chart_update?: string
  recommit_or_redirect?: string
  outcome?: string
  metadata?: Record<string, unknown>
}

export interface LogEventInput {
  event_type: string
  actor_type?: string
  actor_id?: string
  tension_id?: string
  payload?: Record<string, unknown>
}
