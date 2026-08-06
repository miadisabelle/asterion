// Asterion Data Access Layer - Tensions
import { sql } from './db'
import { invalidateCache, getCache, setCache } from './redis'
import type { 
  Tension, 
  CreateTensionInput, 
  UpdateTensionInput,
  ActionStep,
  CreateActionStepInput,
  TensionEdge,
  EdgeType
} from './types'

// ============== TENSIONS ==============

export async function getTensions(filters?: {
  phase?: Tension['phase']
  status?: Tension['status']
  layer_id?: string
  parent_id?: string | null
}): Promise<Tension[]> {
  const cacheKey = `tensions:${JSON.stringify(filters || {})}`
  const cached = await getCache<Tension[]>(cacheKey)
  if (cached) return cached

  // Build conditions array for the WHERE clause
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (filters?.phase) {
    conditions.push(`phase = $${paramIndex++}`)
    params.push(filters.phase)
  }
  if (filters?.status) {
    conditions.push(`status = $${paramIndex++}`)
    params.push(filters.status)
  }
  if (filters?.layer_id) {
    conditions.push(`layer_id = $${paramIndex++}`)
    params.push(filters.layer_id)
  }
  if (filters?.parent_id !== undefined) {
    if (filters.parent_id === null) {
      conditions.push('parent_id IS NULL')
    } else {
      conditions.push(`parent_id = $${paramIndex++}`)
      params.push(filters.parent_id)
    }
  }

  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : ''
  
  const query = `SELECT * FROM asterion.tensions ${whereClause} ORDER BY created_at DESC`

  // Use sql.query() for dynamic parameterized queries
  const result = await sql.query(query, params)
  const tensions = result as Tension[]
  
  await setCache(cacheKey, tensions, 60)
  return tensions
}

export async function getTensionById(id: string): Promise<Tension | null> {
  const cacheKey = `tension:${id}`
  const cached = await getCache<Tension>(cacheKey)
  if (cached) return cached

  const result = await sql`
    SELECT t.*, 
           l.name as layer_name, 
           l.layer_type,
           l.description as layer_description
    FROM asterion.tensions t
    LEFT JOIN asterion.layers l ON t.layer_id = l.id
    WHERE t.id = ${id}
  `
  
  if (result.length === 0) return null
  
  const tension = result[0] as Tension
  await setCache(cacheKey, tension, 120)
  return tension
}

export async function getTensionWithRelations(id: string): Promise<Tension | null> {
  const tension = await getTensionById(id)
  if (!tension) return null

  // Fetch children, action steps, and edges in parallel
  const [children, actionSteps, edgesFrom, edgesTo] = await Promise.all([
    sql`SELECT * FROM asterion.tensions WHERE parent_id = ${id} ORDER BY created_at`,
    sql`SELECT * FROM asterion.action_steps WHERE tension_id = ${id} ORDER BY sort_order`,
    sql`
      SELECT te.*, t.title as to_tension_title 
      FROM asterion.tension_edges te
      JOIN asterion.tensions t ON te.to_tension_id = t.id
      WHERE te.from_tension_id = ${id}
    `,
    sql`
      SELECT te.*, t.title as from_tension_title 
      FROM asterion.tension_edges te
      JOIN asterion.tensions t ON te.from_tension_id = t.id
      WHERE te.to_tension_id = ${id}
    `,
  ])

  return {
    ...tension,
    children: children as Tension[],
    action_steps: actionSteps as ActionStep[],
    edges_from: edgesFrom as TensionEdge[],
    edges_to: edgesTo as TensionEdge[],
  }
}

export async function createTension(input: CreateTensionInput): Promise<Tension> {
  // Calculate telescope depth
  let telescopeDepth = 0
  if (input.parent_id) {
    const parent = await getTensionById(input.parent_id)
    if (parent) {
      telescopeDepth = parent.telescope_depth + 1
    }
  }

  const result = await sql`
    INSERT INTO asterion.tensions (
      title, desired_outcome, current_reality, phase, layer_id, parent_id,
      source_action_step_id, telescope_depth, accountable_user_id,
      github_owner, github_repo, github_issue_number, due_date, metadata
    ) VALUES (
      ${input.title},
      ${input.desired_outcome},
      ${input.current_reality},
      ${input.phase || 'germination'},
      ${input.layer_id || null},
      ${input.parent_id || null},
      ${input.source_action_step_id || null},
      ${telescopeDepth},
      ${input.accountable_user_id || null},
      ${input.github_owner || null},
      ${input.github_repo || null},
      ${input.github_issue_number || null},
      ${input.due_date || null},
      ${JSON.stringify(input.metadata || {})}
    )
    RETURNING *
  `

  await invalidateCache('tensions:*')
  return result[0] as Tension
}

export async function updateTension(
  id: string, 
  input: UpdateTensionInput
): Promise<Tension | null> {
  const updates: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`)
    params.push(input.title)
  }
  if (input.desired_outcome !== undefined) {
    updates.push(`desired_outcome = $${paramIndex++}`)
    params.push(input.desired_outcome)
  }
  if (input.current_reality !== undefined) {
    updates.push(`current_reality = $${paramIndex++}`)
    params.push(input.current_reality)
  }
  if (input.phase !== undefined) {
    updates.push(`phase = $${paramIndex++}`)
    params.push(input.phase)
    updates.push('phase_started_at = NOW()')
  }
  if (input.phase_notes !== undefined) {
    updates.push(`phase_notes = $${paramIndex++}`)
    params.push(input.phase_notes)
  }
  if (input.layer_id !== undefined) {
    updates.push(`layer_id = $${paramIndex++}`)
    params.push(input.layer_id)
  }
  if (input.progress !== undefined) {
    updates.push(`progress = $${paramIndex++}`)
    params.push(input.progress)
  }
  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex++}`)
    params.push(input.status)
  }
  if (input.due_date !== undefined) {
    updates.push(`due_date = $${paramIndex++}`)
    params.push(input.due_date)
  }
  if (input.metadata !== undefined) {
    updates.push(`metadata = $${paramIndex++}`)
    params.push(JSON.stringify(input.metadata))
  }

  if (updates.length === 0) return getTensionById(id)

  updates.push('updated_at = NOW()')
  params.push(id)

  const query = `
    UPDATE asterion.tensions 
    SET ${updates.join(', ')} 
    WHERE id = $${paramIndex}
    RETURNING *
  `

  const result = await sql.query(query, params)
  
  await invalidateCache(`tension:${id}`)
  await invalidateCache('tensions:*')
  
  return result[0] as Tension || null
}

export async function deleteTension(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM asterion.tensions WHERE id = ${id} RETURNING id
  `
  
  await invalidateCache(`tension:${id}`)
  await invalidateCache('tensions:*')
  
  return result.length > 0
}

// ============== ACTION STEPS ==============

export async function getActionSteps(tensionId: string): Promise<ActionStep[]> {
  const result = await sql`
    SELECT * FROM asterion.action_steps 
    WHERE tension_id = ${tensionId}
    ORDER BY sort_order
  `
  return result as ActionStep[]
}

export async function createActionStep(input: CreateActionStepInput): Promise<ActionStep> {
  const result = await sql`
    INSERT INTO asterion.action_steps (
      tension_id, title, description, assigned_to, sort_order, metadata
    ) VALUES (
      ${input.tension_id},
      ${input.title},
      ${input.description || null},
      ${input.assigned_to || null},
      ${input.sort_order || 0},
      ${JSON.stringify(input.metadata || {})}
    )
    RETURNING *
  `
  
  await invalidateCache(`tension:${input.tension_id}`)
  return result[0] as ActionStep
}

export async function updateActionStepStatus(
  id: string, 
  status: ActionStep['status']
): Promise<ActionStep | null> {
  const result = await sql`
    UPDATE asterion.action_steps 
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  
  if (result.length > 0) {
    const step = result[0] as ActionStep
    await invalidateCache(`tension:${step.tension_id}`)
    
    // Update tension progress based on completed steps
    await updateTensionProgress(step.tension_id)
  }
  
  return result[0] as ActionStep || null
}

async function updateTensionProgress(tensionId: string): Promise<void> {
  const steps = await getActionSteps(tensionId)
  if (steps.length === 0) return

  const completed = steps.filter(s => s.status === 'completed').length
  const progress = Math.round((completed / steps.length) * 100)

  await sql`
    UPDATE asterion.tensions 
    SET progress = ${progress}, updated_at = NOW()
    WHERE id = ${tensionId}
  `
  
  await invalidateCache(`tension:${tensionId}`)
}

// Telescope: Convert action step into full tension
export async function telescopeActionStep(
  actionStepId: string,
  tensionInput: Omit<CreateTensionInput, 'source_action_step_id' | 'parent_id'>
): Promise<Tension> {
  // Get the action step to find its parent tension
  const stepResult = await sql`
    SELECT * FROM asterion.action_steps WHERE id = ${actionStepId}
  `
  if (stepResult.length === 0) {
    throw new Error('Action step not found')
  }
  const step = stepResult[0] as ActionStep

  // Create new tension with lineage preserved
  const tension = await createTension({
    ...tensionInput,
    parent_id: step.tension_id,
    source_action_step_id: actionStepId,
  })

  // Link action step to new tension
  await sql`
    UPDATE asterion.action_steps 
    SET telescoped_to_tension_id = ${tension.id}, updated_at = NOW()
    WHERE id = ${actionStepId}
  `

  return tension
}

// ============== TENSION EDGES ==============

export async function createTensionEdge(
  fromTensionId: string,
  toTensionId: string,
  edgeType: EdgeType,
  metadata?: Record<string, unknown>
): Promise<TensionEdge> {
  const result = await sql`
    INSERT INTO asterion.tension_edges (
      from_tension_id, to_tension_id, edge_type, metadata
    ) VALUES (
      ${fromTensionId},
      ${toTensionId},
      ${edgeType},
      ${JSON.stringify(metadata || {})}
    )
    ON CONFLICT (from_tension_id, to_tension_id, edge_type) DO NOTHING
    RETURNING *
  `
  
  await invalidateCache(`tension:${fromTensionId}`)
  await invalidateCache(`tension:${toTensionId}`)
  
  return result[0] as TensionEdge
}

export async function deleteTensionEdge(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM asterion.tension_edges WHERE id = ${id} RETURNING *
  `
  
  if (result.length > 0) {
    const edge = result[0] as TensionEdge
    await invalidateCache(`tension:${edge.from_tension_id}`)
    await invalidateCache(`tension:${edge.to_tension_id}`)
  }
  
  return result.length > 0
}

// Get all tensions that block this tension
export async function getBlockingTensions(tensionId: string): Promise<Tension[]> {
  const result = await sql`
    SELECT t.* FROM asterion.tensions t
    JOIN asterion.tension_edges e ON t.id = e.from_tension_id
    WHERE e.to_tension_id = ${tensionId} AND e.edge_type = 'blocks'
  `
  return result as Tension[]
}

// Get tension dependency graph for visualization
export async function getTensionGraph(rootTensionId?: string): Promise<{
  nodes: Tension[]
  edges: TensionEdge[]
}> {
  let tensionsQuery: string
  let edgesQuery: string

  if (rootTensionId) {
    // Get all connected tensions recursively
    tensionsQuery = `
      WITH RECURSIVE connected AS (
        SELECT id FROM asterion.tensions WHERE id = $1
        UNION
        SELECT DISTINCT COALESCE(e.from_tension_id, e.to_tension_id) 
        FROM asterion.tension_edges e
        JOIN connected c ON e.from_tension_id = c.id OR e.to_tension_id = c.id
      )
      SELECT t.* FROM asterion.tensions t
      JOIN connected c ON t.id = c.id
    `
    edgesQuery = `
      SELECT * FROM asterion.tension_edges 
      WHERE from_tension_id IN (
        WITH RECURSIVE connected AS (
          SELECT id FROM asterion.tensions WHERE id = $1
          UNION
          SELECT DISTINCT COALESCE(e.from_tension_id, e.to_tension_id) 
          FROM asterion.tension_edges e
          JOIN connected c ON e.from_tension_id = c.id OR e.to_tension_id = c.id
        ) SELECT id FROM connected
      )
    `
  } else {
    tensionsQuery = 'SELECT * FROM asterion.tensions WHERE status = \'active\''
    edgesQuery = 'SELECT * FROM asterion.tension_edges'
  }

  // These are built as query strings, not tagged templates, so they go through
  // sql.query(). The @neondatabase/serverless v1 driver rejects a bare sql(text, params)
  // call outright — every route reaching this function returned 500 until now.
  const [nodes, edges] = await Promise.all([
    rootTensionId
      ? sql.query(tensionsQuery, [rootTensionId])
      : sql.query(tensionsQuery),
    rootTensionId
      ? sql.query(edgesQuery, [rootTensionId])
      : sql.query(edgesQuery),
  ])

  return {
    nodes: nodes as Tension[],
    edges: edges as TensionEdge[],
  }
}
