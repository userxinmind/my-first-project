import type { Prediction, RaceSnapshot } from './types'

/**
 * Points per prediction type.
 *
 * ⚠️ PLACEHOLDER VALUES — the official rules of our game still have to be added
 * (see docs/game-rules.md and docs/decisions/0003-scoring-rules.md).
 * All scoring logic lives in this file, so updating the rules only touches this file
 * and its tests.
 */
export interface ScoringRules {
  /** Predicted driver finishes exactly at the predicted position (P1-P10). */
  top10Exact: number
  /** Predicted driver finishes in the top 10, but at another position. */
  top10InTop10: number
  /** Correctly predicted the last driver still running / classified. */
  last: number
  /** Correctly predicted the driver with the fastest lap. */
  fastestLap: number
  /** Correctly predicted a driver that drops out (DNF). */
  dnf: number
}

export const DEFAULT_RULES: ScoringRules = {
  top10Exact: 3,
  top10InTop10: 1,
  last: 3,
  fastestLap: 3,
  dnf: 3,
}

export type ItemStatus = 'exact' | 'partial' | 'wrong' | 'empty'

export interface ScoreItem {
  key: string
  label: string
  predicted: number | null
  /** Human-readable explanation of the current situation, e.g. "currently P5". */
  detail: string
  points: number
  maxPoints: number
  status: ItemStatus
}

export interface ScoreBreakdown {
  total: number
  max: number
  items: ScoreItem[]
}

/** Score of one prediction "if the race stopped at this snapshot". */
export function scorePrediction(
  prediction: Prediction,
  snapshot: RaceSnapshot,
  rules: ScoringRules = DEFAULT_RULES,
): ScoreBreakdown {
  const items: ScoreItem[] = [
    ...prediction.top10.map((driver, i) => scoreTop10Slot(driver, i, snapshot, rules)),
    scoreLast(prediction.last, snapshot, rules),
    scoreFastestLap(prediction.fastestLap, snapshot, rules),
    scoreDnf(prediction.dnf, snapshot, rules),
  ]
  return {
    total: items.reduce((sum, item) => sum + item.points, 0),
    max: items.reduce((sum, item) => sum + item.maxPoints, 0),
    items,
  }
}

function scoreTop10Slot(
  driver: number | null,
  index: number,
  snapshot: RaceSnapshot,
  rules: ScoringRules,
): ScoreItem {
  const base = { key: `p${index + 1}`, label: `P${index + 1}`, predicted: driver, maxPoints: rules.top10Exact }
  if (driver === null) return { ...base, detail: 'Not predicted', points: 0, status: 'empty' }

  const actualIndex = snapshot.order.indexOf(driver)
  if (actualIndex === -1) {
    const detail = snapshot.retired.includes(driver) ? 'Out of the race' : 'Not classified'
    return { ...base, detail, points: 0, status: 'wrong' }
  }
  const actual = `currently P${actualIndex + 1}`
  if (actualIndex === index) return { ...base, detail: actual, points: rules.top10Exact, status: 'exact' }
  if (actualIndex < 10) return { ...base, detail: actual, points: rules.top10InTop10, status: 'partial' }
  return { ...base, detail: actual, points: 0, status: 'wrong' }
}

function scoreLast(driver: number | null, snapshot: RaceSnapshot, rules: ScoringRules): ScoreItem {
  const base = { key: 'last', label: 'Last place', predicted: driver, maxPoints: rules.last }
  if (driver === null) return { ...base, detail: 'Not predicted', points: 0, status: 'empty' }
  const lastDriver = snapshot.order.at(-1)
  if (lastDriver === driver) return { ...base, detail: 'Currently last', points: rules.last, status: 'exact' }
  const pos = snapshot.order.indexOf(driver)
  const detail = pos === -1 ? 'Out of the race' : `currently P${pos + 1} of ${snapshot.order.length}`
  return { ...base, detail, points: 0, status: 'wrong' }
}

function scoreFastestLap(driver: number | null, snapshot: RaceSnapshot, rules: ScoringRules): ScoreItem {
  const base = { key: 'fastestLap', label: 'Fastest lap', predicted: driver, maxPoints: rules.fastestLap }
  if (driver === null) return { ...base, detail: 'Not predicted', points: 0, status: 'empty' }
  const fl = snapshot.fastestLap
  if (!fl) return { ...base, detail: 'No lap times yet', points: 0, status: 'wrong' }
  const detail = `${formatLapTime(fl.duration)} on lap ${fl.lap}`
  if (fl.driver === driver) return { ...base, detail: `Holds it: ${detail}`, points: rules.fastestLap, status: 'exact' }
  return { ...base, detail: `Fastest: ${detail}`, points: 0, status: 'wrong' }
}

function scoreDnf(driver: number | null, snapshot: RaceSnapshot, rules: ScoringRules): ScoreItem {
  const base = { key: 'dnf', label: 'Drops out', predicted: driver, maxPoints: rules.dnf }
  if (driver === null) return { ...base, detail: 'Not predicted', points: 0, status: 'empty' }
  if (snapshot.retired.includes(driver)) return { ...base, detail: 'Out of the race', points: rules.dnf, status: 'exact' }
  return { ...base, detail: 'Still racing', points: 0, status: 'wrong' }
}

/** 83.456 -> "1:23.456" */
export function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = (seconds - minutes * 60).toFixed(3).padStart(6, '0')
  return `${minutes}:${rest}`
}
