// Asterion - Recursive Execution Operating Substrate
// Public API exports

// Types
export * from './types'

// Database
export { sql, query } from './db'

// Redis/Cache
export {
  setSession,
  getSession,
  deleteSession,
  setCache,
  getCache,
  invalidateCache,
  pushEvent,
  popEvent,
  getQueueLength,
  checkIdempotency,
  setIdempotency,
  acquireLock,
  releaseLock,
  redis,
} from './redis'

// Validation
export { validateTension, validatePhaseTransition } from './validation'

// Tensions
export {
  getTensions,
  getTensionById,
  getTensionWithRelations,
  createTension,
  updateTension,
  deleteTension,
  getActionSteps,
  createActionStep,
  updateActionStepStatus,
  telescopeActionStep,
  createTensionEdge,
  deleteTensionEdge,
  getBlockingTensions,
  getTensionGraph,
} from './tensions'

// Data (Projects, Layers, KG, etc.)
export {
  // Projects
  getProjects,
  getProjectById,
  getProjectWithTensions,
  createProject,
  addTensionToProject,
  removeTensionFromProject,
  // Layers
  getLayers,
  getLayerById,
  // Knowledge Graph - Entities
  getEntities,
  getEntityById,
  getEntityByExternalId,
  createEntity,
  // Knowledge Graph - Relations
  createRelation,
  getEntityRelations,
  // Knowledge Graph - Observations
  addObservation,
  getEntityObservations,
  // MMOT
  createMMOTEvaluation,
  getMMOTEvaluations,
  // Narrative
  getNarrativeThreads,
  createNarrativeThread,
  addTensionToThread,
  createNarrativeBeat,
  getNarrativeBeats,
  // Events
  logEvent,
  getEvents,
  getEventTimeline,
} from './data'
