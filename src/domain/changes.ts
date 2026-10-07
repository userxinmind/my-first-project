import type { ScoreBreakdown } from './scoring'

export interface ScoreChange {
  key: string
  label: string
  predicted: number | null
  delta: number
  detail: string
}

/**
 * Which prediction items gained or lost points between two moments, and why.
 * Used for the "why did my score change?" feed.
 */
export function diffScores(previous: ScoreBreakdown, next: ScoreBreakdown): ScoreChange[] {
  const before = new Map(previous.items.map((item) => [item.key, item.points]))
  return next.items
    .map((item) => ({
      key: item.key,
      label: item.label,
      predicted: item.predicted,
      delta: item.points - (before.get(item.key) ?? 0),
      detail: item.detail,
    }))
    .filter((change) => change.delta !== 0)
}
