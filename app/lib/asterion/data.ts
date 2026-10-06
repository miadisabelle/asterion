// Asterion Data Access Layer - Projects, Layers, Knowledge Graph
import { sql } from './db'
import { invalidateCache, getCache, setCache } from './redis'
import { publicProject } from './coaia-projection.mjs'
import { PRIVATE_PROJECT_IDS, PRIVATE_SOURCES, PRIVATE_TENSION_IDS, PRIVATE_THREAD_IDS, seesPrivate, type Viewer } from './visibility'
import type { 
  Project, 
  ProjectSeat,
  CreateProjectInput,
  ProjectTension,
  Layer,
  Entity,
  CreateEntityInput,
  Relation,
  Observation,
  NarrativeThread,
  NarrativeBeat,
  MMOTEvaluation,
  CreateMMOTEvaluationInput,
  AsterionEvent,
  LogEventInput
} from './types'

// ============== PROJECTS ==============

export async function getProjects(viewer: Viewer): Promise<Project[]> {
  const all = seesPrivate(viewer)
  // The cache is shared with every deployment, so what it holds is made public on the way out too.
  // These keys are new: a deployment from before private projects caches every project under
  // 'projects:all', and a public read must never pick that list up.
  const cacheKey = all ? 'projects:writer' : 'projects:public'
  const cached = await getCache<Project[]>(cacheKey)
  if (cached) return cached.map((p) => publicProject(p) as Project)

  const result = await sql.query(
    `SELECT * FROM asterion.projects ${all ? '' : `WHERE id NOT IN (${PRIVATE_PROJECT_IDS})`} ORDER BY created_at DESC`
  )
  
  // A registered project's source files are local paths on one host; the public shape names them only.
  const projects = (result as Project[]).map((p) => publicProject(p) as Project)
  await setCache(cacheKey, projects, 60)
  return projects
}

export async function getProjectById(id: string): Promise<Project | null> {
  const result = await sql`
    SELECT * FROM asterion.projects WHERE id = ${id}
  `
  return result[0] ? (publicProject(result[0]) as Project) : null
}

export async function getProjectWithTensions(id: string, viewer: Viewer): Promise<Project | null> {
  const project = await getProjectById(id)
  if (!project) return null
  const all = seesPrivate(viewer)
  if (!all && project.metadata?.visibility === 'private') return null

  const tensions = await sql.query(
    `SELECT pt.*, t.*
     FROM asterion.project_tensions pt
     JOIN asterion.tensions t ON pt.tension_id = t.id
     WHERE pt.project_id = $1 ${all ? '' : `AND t.id NOT IN (${PRIVATE_TENSION_IDS})`}
     ORDER BY pt.sort_order`,
    [id]
  )

  return {
    ...project,
    tensions: tensions as ProjectTension[],
  }
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const result = await sql`
    INSERT INTO asterion.projects (name, codename, description, metadata)
    VALUES (
      ${input.name},
      ${input.codename || null},
      ${input.description || null},
      ${JSON.stringify(input.metadata || {})}
    )
    RETURNING *
  `
  
  await invalidateCache('projects:*')
  return result[0] as Project
}

// A tmux session name (Miadi's seats are tmux sessions) and a host name.
export const SEAT_SESSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/
export const SEAT_HOST_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.-]{0,62}$/

/** Name the session that keeps a project's charts, or clear it with null. */
export async function setProjectSeat(id: string, seat: ProjectSeat | null): Promise<Project | null> {
  const result = await sql`
    UPDATE asterion.projects
       SET metadata = CASE
             WHEN ${seat === null} THEN COALESCE(metadata, '{}'::jsonb) - 'seat'
             ELSE jsonb_set(COALESCE(metadata, '{}'::jsonb), '{seat}', ${JSON.stringify(seat)}::jsonb)
           END,
           updated_at = NOW()
     WHERE id = ${id}
     RETURNING *
  `
  await invalidateCache('projects:*')
  return result[0] ? (publicProject(result[0]) as Project) : null
}

export async function addTensionToProject(
  projectId: string,
  tensionId: string,
  lens?: string,
  sortOrder?: number
): Promise<ProjectTension> {
  const result = await sql`
    INSERT INTO asterion.project_tensions (project_id, tension_id, lens, sort_order)
    VALUES (${projectId}, ${tensionId}, ${lens || null}, ${sortOrder || 0})
    ON CONFLICT (project_id, tension_id) DO UPDATE SET lens = ${lens || null}
    RETURNING *
  `
  return result[0] as ProjectTension
}

export async function removeTensionFromProject(
  projectId: string,
  tensionId: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM asterion.project_tensions 
    WHERE project_id = ${projectId} AND tension_id = ${tensionId}
    RETURNING *
  `
  return result.length > 0
}

// ============== LAYERS ==============

export async function getLayers(): Promise<Layer[]> {
  const cacheKey = 'layers:all'
  const cached = await getCache<Layer[]>(cacheKey)
  if (cached) return cached

  const result = await sql`
    SELECT * FROM asterion.layers ORDER BY sort_order
  `
  
  const layers = result as Layer[]
  await setCache(cacheKey, layers, 300) // Cache for 5 minutes
  return layers
}

export async function getLayerById(id: string): Promise<Layer | null> {
  const result = await sql`
    SELECT * FROM asterion.layers WHERE id = ${id}
  `
  return result[0] as Layer || null
}

// ============== KNOWLEDGE GRAPH - ENTITIES ==============

export async function getEntities(filters: {
  entity_type?: string
  layer_id?: string
  external_source?: string
} | undefined, viewer: Viewer): Promise<Entity[]> {
  const conditions: string[] = seesPrivate(viewer) ? [] : [`COALESCE(external_source, '') NOT IN (${PRIVATE_SOURCES})`]
  const params: unknown[] = []
  let paramIndex = 1

  if (filters?.entity_type) {
    conditions.push(`entity_type = $${paramIndex++}`)
    params.push(filters.entity_type)
  }
  if (filters?.layer_id) {
    conditions.push(`layer_id = $${paramIndex++}`)
    params.push(filters.layer_id)
  }
  if (filters?.external_source) {
    conditions.push(`external_source = $${paramIndex++}`)
    params.push(filters.external_source)
  }

  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : ''
  
  const query = `SELECT * FROM asterion.entities ${whereClause} ORDER BY created_at DESC`

  const result = await sql.query(query, params)
  return result as Entity[]
}

export async function getEntityById(id: string): Promise<Entity | null> {
  const result = await sql`
    SELECT * FROM asterion.entities WHERE id = ${id}
  `
  return result[0] as Entity || null
}

export async function getEntityByExternalId(
  externalId: string,
  externalSource: string
): Promise<Entity | null> {
  const result = await sql`
    SELECT * FROM asterion.entities 
    WHERE external_id = ${externalId} AND external_source = ${externalSource}
  `
  return result[0] as Entity || null
}

export async function createEntity(input: CreateEntityInput): Promise<Entity> {
  const result = await sql`
    INSERT INTO asterion.entities (
      name, entity_type, external_id, external_source, layer_id, metadata
    ) VALUES (
      ${input.name},
      ${input.entity_type},
      ${input.external_id || null},
      ${input.external_source || null},
      ${input.layer_id || null},
      ${JSON.stringify(input.metadata || {})}
    )
    ON CONFLICT (external_id, external_source) 
    DO UPDATE SET name = ${input.name}, updated_at = NOW()
    RETURNING *
  `
  return result[0] as Entity
}

// ============== KNOWLEDGE GRAPH - RELATIONS ==============

export async function createRelation(
  fromEntityId: string,
  toEntityId: string,
  relationType: string,
  metadata?: Record<string, unknown>
): Promise<Relation> {
  const result = await sql`
    INSERT INTO asterion.relations (from_entity_id, to_entity_id, relation_type, metadata)
    VALUES (
      ${fromEntityId},
      ${toEntityId},
      ${relationType},
      ${JSON.stringify(metadata || {})}
    )
    ON CONFLICT (from_entity_id, to_entity_id, relation_type) DO NOTHING
    RETURNING *
  `
  return result[0] as Relation
}

export async function getEntityRelations(entityId: string): Promise<{
  from: Relation[]
  to: Relation[]
}> {
  const [from, to] = await Promise.all([
    sql`
      SELECT r.*, e.name as to_entity_name, e.entity_type as to_entity_type
      FROM asterion.relations r
      JOIN asterion.entities e ON r.to_entity_id = e.id
      WHERE r.from_entity_id = ${entityId}
    `,
    sql`
      SELECT r.*, e.name as from_entity_name, e.entity_type as from_entity_type
      FROM asterion.relations r
      JOIN asterion.entities e ON r.from_entity_id = e.id
      WHERE r.to_entity_id = ${entityId}
    `,
  ])

  return {
    from: from as Relation[],
    to: to as Relation[],
  }
}

// ============== KNOWLEDGE GRAPH - OBSERVATIONS ==============

export async function addObservation(
  entityId: string,
  content: string,
  observationType?: string,
  metadata?: Record<string, unknown>
): Promise<Observation> {
  const result = await sql`
    INSERT INTO asterion.observations (entity_id, content, observation_type, metadata)
    VALUES (
      ${entityId},
      ${content},
      ${observationType || null},
      ${JSON.stringify(metadata || {})}
    )
    RETURNING *
  `
  return result[0] as Observation
}

export async function getEntityObservations(entityId: string): Promise<Observation[]> {
  const result = await sql`
    SELECT * FROM asterion.observations 
    WHERE entity_id = ${entityId}
    ORDER BY created_at DESC
  `
  return result as Observation[]
}

// ============== MMOT EVALUATIONS ==============

export async function createMMOTEvaluation(
  input: CreateMMOTEvaluationInput
): Promise<MMOTEvaluation> {
  const result = await sql`
    INSERT INTO asterion.mmot_evaluations (
      tension_id, phase, acknowledge_notes, analyze_notes, 
      chart_update, recommit_or_redirect, outcome, metadata
    ) VALUES (
      ${input.tension_id},
      ${input.phase},
      ${input.acknowledge_notes || null},
      ${input.analyze_notes || null},
      ${input.chart_update || null},
      ${input.recommit_or_redirect || null},
      ${input.outcome || null},
      ${JSON.stringify(input.metadata || {})}
    )
    RETURNING *
  `
  return result[0] as MMOTEvaluation
}

export async function getMMOTEvaluations(tensionId: string, viewer: Viewer): Promise<MMOTEvaluation[]> {
  const result = await sql.query(
    `SELECT * FROM asterion.mmot_evaluations
     WHERE tension_id = $1 ${seesPrivate(viewer) ? '' : `AND tension_id NOT IN (${PRIVATE_TENSION_IDS})`}
     ORDER BY created_at DESC`,
    [tensionId]
  )
  return result as MMOTEvaluation[]
}

// ============== NARRATIVE THREADS ==============

export async function getNarrativeThreads(viewer: Viewer): Promise<NarrativeThread[]> {
  const result = await sql.query(
    `SELECT * FROM asterion.narrative_threads
     ${seesPrivate(viewer) ? '' : `WHERE id NOT IN (${PRIVATE_THREAD_IDS})`}
     ORDER BY created_at DESC`
  )
  return result as NarrativeThread[]
}

export async function createNarrativeThread(
  name: string,
  threadType?: string,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<NarrativeThread> {
  const result = await sql`
    INSERT INTO asterion.narrative_threads (name, thread_type, description, metadata)
    VALUES (
      ${name},
      ${threadType || null},
      ${description || null},
      ${JSON.stringify(metadata || {})}
    )
    RETURNING *
  `
  return result[0] as NarrativeThread
}

export async function addTensionToThread(
  threadId: string,
  tensionId: string,
  sortOrder?: number
): Promise<void> {
  await sql`
    INSERT INTO asterion.thread_tensions (thread_id, tension_id, sort_order)
    VALUES (${threadId}, ${tensionId}, ${sortOrder || 0})
    ON CONFLICT (thread_id, tension_id) DO NOTHING
  `
}

// ============== NARRATIVE BEATS ==============

export async function createNarrativeBeat(
  tensionId: string,
  beatType: string,
  content: string,
  title?: string,
  metadata?: Record<string, unknown>
): Promise<NarrativeBeat> {
  const result = await sql`
    INSERT INTO asterion.narrative_beats (tension_id, beat_type, title, content, metadata)
    VALUES (
      ${tensionId},
      ${beatType},
      ${title || null},
      ${content},
      ${JSON.stringify(metadata || {})}
    )
    RETURNING *
  `
  return result[0] as NarrativeBeat
}

export async function getNarrativeBeats(tensionId: string): Promise<NarrativeBeat[]> {
  const result = await sql`
    SELECT * FROM asterion.narrative_beats 
    WHERE tension_id = ${tensionId}
    ORDER BY created_at
  `
  return result as NarrativeBeat[]
}

// ============== EVENTS (IMMUTABLE LOG) ==============

export async function logEvent(input: LogEventInput): Promise<AsterionEvent> {
  const result = await sql`
    INSERT INTO asterion.events (event_type, actor_type, actor_id, tension_id, payload)
    VALUES (
      ${input.event_type},
      ${input.actor_type || null},
      ${input.actor_id || null},
      ${input.tension_id || null},
      ${JSON.stringify(input.payload || {})}
    )
    RETURNING *
  `
  return result[0] as AsterionEvent
}

export async function getEvents(filters: {
  tension_id?: string
  event_type?: string
  limit?: number
  offset?: number
} | undefined, viewer: Viewer): Promise<AsterionEvent[]> {
  // An event belongs to a private project through its chart, its source, its project, or a chart it names.
  const conditions: string[] = seesPrivate(viewer) ? [] : [
    `COALESCE(tension_id::text, '') NOT IN (SELECT id::text FROM (${PRIVATE_TENSION_IDS}) h)`,
    `COALESCE(payload->>'external_source', '') NOT IN (${PRIVATE_SOURCES})`,
    `COALESCE(payload->>'project_id', '') NOT IN (SELECT id::text FROM (${PRIVATE_PROJECT_IDS}) p)`,
    `COALESCE(payload->>'tension_id', '') NOT IN (SELECT id::text FROM (${PRIVATE_TENSION_IDS}) h)`,
    `COALESCE(payload->>'to_tension_id', '') NOT IN (SELECT id::text FROM (${PRIVATE_TENSION_IDS}) h)`,
    `COALESCE(payload->>'parent_tension_id', '') NOT IN (SELECT id::text FROM (${PRIVATE_TENSION_IDS}) h)`,
  ]
  const params: unknown[] = []
  let paramIndex = 1

  if (filters?.tension_id) {
    conditions.push(`tension_id = $${paramIndex++}`)
    params.push(filters.tension_id)
  }
  if (filters?.event_type) {
    conditions.push(`event_type = $${paramIndex++}`)
    params.push(filters.event_type)
  }

  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : ''
  
  let query = `SELECT * FROM asterion.events ${whereClause} ORDER BY created_at DESC`

  if (filters?.limit) {
    query += ` LIMIT $${paramIndex++}`
    params.push(filters.limit)
  }
  if (filters?.offset) {
    query += ` OFFSET $${paramIndex++}`
    params.push(filters.offset)
  }

  const result = await sql.query(query, params)
  return result as AsterionEvent[]
}

export async function getEventTimeline(
  tensionId: string,
  limit = 50
): Promise<AsterionEvent[]> {
  const result = await sql`
    SELECT * FROM asterion.events 
    WHERE tension_id = ${tensionId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return result as AsterionEvent[]
}
