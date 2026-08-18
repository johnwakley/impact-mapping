import type { GoalNode } from '../types.ts'

/**
 * Progress along a goal's metric.
 *
 * Plenty of goals move *downwards* — waiting times, defects, churn, cost — so
 * progress is measured along the span from baseline to target in whichever
 * direction that runs, not as a bare "is the number bigger yet".
 */
export interface GoalProgress {
  /** Where we are now: `current`, falling back to `baseline`. */
  at: number
  /** Signed distance from baseline to target. Negative when the goal is a reduction. */
  span: number
  /** 0–1 along that span, clamped. */
  fraction: number
  /** False when there is nothing to measure against yet. */
  measurable: boolean
}

export function goalProgress(goal: GoalNode): GoalProgress {
  const baseline = goal.baseline ?? 0
  const at = goal.current ?? baseline
  const span = goal.target !== undefined ? goal.target - baseline : 0
  const measurable = span !== 0
  const fraction = measurable ? Math.max(0, Math.min(1, (at - baseline) / span)) : 0
  return { at, span, fraction, measurable }
}
