import { diffScores, type ScoreChange } from './changes'
import { DEFAULT_RULES, scorePrediction, type ScoringRules } from './scoring'
import { snapshotAt } from './snapshot'
import type { Prediction, RaceTimeline } from './types'

export interface ScoreHistoryEntry {
  t: number
  lap: number
  total: number
  changes: ScoreChange[]
}

/**
 * Walks through the race in small steps and records every moment the score changed.
 * Computed once per prediction, so the UI can show "why did my score change?" for any
 * point in the replay (also when jumping back and forth).
 */
export function buildScoreHistory(
  timeline: RaceTimeline,
  prediction: Prediction,
  rules: ScoringRules = DEFAULT_RULES,
  stepMs = 5_000,
): ScoreHistoryEntry[] {
  const times: number[] = []
  for (let t = timeline.startMs; t < timeline.endMs; t += stepMs) times.push(t)
  times.push(timeline.endMs)

  const history: ScoreHistoryEntry[] = []
  let previous = null
  for (const t of times) {
    const snapshot = snapshotAt(timeline, t)
    const score = scorePrediction(prediction, snapshot, rules)
    const changes = previous ? diffScores(previous, score) : []
    if (!previous || changes.length > 0) {
      history.push({ t, lap: snapshot.currentLap, total: score.total, changes })
    }
    previous = score
  }
  return history
}
