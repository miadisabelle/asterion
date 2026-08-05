// Fritz Structural Tension Validation
// Ensures tensions follow proper methodology rather than problem-solving heuristics

import type { 
  Tension, 
  CreateTensionInput, 
  TensionValidation, 
  TensionValidationError, 
  TensionValidationWarning 
} from './types'

// Problem-solving indicator patterns (these suggest wrong framing)
const PROBLEM_SOLVING_PATTERNS = [
  /^fix\s/i,
  /^solve\s/i,
  /^eliminate\s/i,
  /^get rid of/i,
  /^remove\s/i,
  /^stop\s/i,
  /^prevent\s/i,
  /^avoid\s/i,
]

// Vague outcome indicators
const VAGUE_OUTCOME_PATTERNS = [
  /^improve\s/i,
  /^better\s/i,
  /^enhance\s/i,
  /^optimize\s/i,
  /^good\s/i,
  /^nice\s/i,
  /working/i,
  /functional/i,
]

// False readiness indicators (claiming completion without substance)
const FALSE_READINESS_PATTERNS = [
  /^done$/i,
  /^complete$/i,
  /^finished$/i,
  /^ready$/i,
  /^n\/a$/i,
]

export function validateTension(
  input: CreateTensionInput | Partial<Tension>
): TensionValidation {
  const errors: TensionValidationError[] = []
  const warnings: TensionValidationWarning[] = []

  // Required fields
  if (!input.title || input.title.trim().length < 3) {
    errors.push({
      field: 'title',
      code: 'TITLE_TOO_SHORT',
      message: 'Title must be at least 3 characters',
    })
  }

  if (!input.desired_outcome || input.desired_outcome.trim().length < 10) {
    errors.push({
      field: 'desired_outcome',
      code: 'OUTCOME_TOO_SHORT',
      message: 'Desired outcome must be at least 10 characters',
    })
  }

  if (!input.current_reality || input.current_reality.trim().length < 10) {
    errors.push({
      field: 'current_reality',
      code: 'REALITY_TOO_SHORT',
      message: 'Current reality must be at least 10 characters',
    })
  }

  // Fritz methodology: Check for problem-solving framing
  if (input.desired_outcome) {
    for (const pattern of PROBLEM_SOLVING_PATTERNS) {
      if (pattern.test(input.desired_outcome)) {
        warnings.push({
          field: 'desired_outcome',
          code: 'PROBLEM_SOLVING_FRAMING',
          message: 'Desired outcome appears to be framed as problem-solving. Focus on what you want to create, not what you want to eliminate.',
        })
        break
      }
    }
  }

  // Check for vague outcomes
  if (input.desired_outcome) {
    for (const pattern of VAGUE_OUTCOME_PATTERNS) {
      if (pattern.test(input.desired_outcome)) {
        warnings.push({
          field: 'desired_outcome',
          code: 'VAGUE_OUTCOME',
          message: 'Desired outcome may be too vague. Be specific about what the end result looks like.',
        })
        break
      }
    }
  }

  // Check for false readiness in current reality
  if (input.current_reality) {
    for (const pattern of FALSE_READINESS_PATTERNS) {
      if (pattern.test(input.current_reality.trim())) {
        errors.push({
          field: 'current_reality',
          code: 'FALSE_READINESS',
          message: 'Current reality cannot indicate completion. Describe the actual current state.',
        })
        break
      }
    }
  }

  // Check for disconnected current reality (no clear gap)
  if (input.desired_outcome && input.current_reality) {
    const outcomeWords = new Set(input.desired_outcome.toLowerCase().split(/\s+/))
    const realityWords = new Set(input.current_reality.toLowerCase().split(/\s+/))
    
    // If there's too much overlap, they might be describing the same thing
    const commonWords = [...outcomeWords].filter(w => realityWords.has(w) && w.length > 4)
    const overlapRatio = commonWords.length / Math.max(outcomeWords.size, realityWords.size)
    
    if (overlapRatio > 0.6) {
      warnings.push({
        field: 'current_reality',
        code: 'DISCONNECTED_REALITY',
        message: 'Current reality and desired outcome appear very similar. Ensure there is a clear gap between them.',
      })
    }
  }

  // Title should not be identical to desired outcome
  if (input.title && input.desired_outcome && 
      input.title.toLowerCase().trim() === input.desired_outcome.toLowerCase().trim()) {
    warnings.push({
      field: 'title',
      code: 'TITLE_EQUALS_OUTCOME',
      message: 'Title should summarize the tension, not duplicate the desired outcome.',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// Check if tension is ready for phase transition
export function validatePhaseTransition(
  tension: Tension,
  targetPhase: Tension['phase']
): TensionValidation {
  const errors: TensionValidationError[] = []
  const warnings: TensionValidationWarning[] = []

  const phaseOrder = ['germination', 'assimilation', 'completion']
  const currentIndex = phaseOrder.indexOf(tension.phase)
  const targetIndex = phaseOrder.indexOf(targetPhase)

  // Can't skip phases
  if (targetIndex > currentIndex + 1) {
    errors.push({
      field: 'phase',
      code: 'PHASE_SKIP',
      message: `Cannot skip from ${tension.phase} directly to ${targetPhase}`,
    })
  }

  // Germination -> Assimilation: Need action steps defined
  if (tension.phase === 'germination' && targetPhase === 'assimilation') {
    if (!tension.action_steps || tension.action_steps.length === 0) {
      warnings.push({
        field: 'phase',
        code: 'NO_ACTION_STEPS',
        message: 'Consider defining action steps before moving to assimilation phase',
      })
    }
  }

  // Assimilation -> Completion: Should have progress
  if (tension.phase === 'assimilation' && targetPhase === 'completion') {
    if (tension.progress < 80) {
      warnings.push({
        field: 'phase',
        code: 'LOW_PROGRESS',
        message: `Progress is at ${tension.progress}%. Consider completing more action steps before marking complete.`,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
