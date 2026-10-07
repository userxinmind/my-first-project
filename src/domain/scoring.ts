import type { Prediction, RaceSnapshot } from './types'

/**
 * Points of our game, from the official rules "Formule 1 regelement De Karre 2026"
 * (summary in docs/game-rules.md). All scoring logic lives in this file.
 */
export interface ScoringRules {
  /** Points for the right driver at exactly P1, P2, ... of the race. */
  racePositions: number[]
  /** Points for the right driver at exactly P1, P2, P3 of the sprint. */
  sprintPositions: number[]
  /** The joker must start at this grid position or lower; he scores his grid position. */
  jokerMinGridPosition: number
  /** Last classified finisher (a driver who dropped out doesn't count). */
  last: number
  fastestLap: number
  /** A driver who started and dropped out. */
  dnf: number
  /** Last finisher, fastest lap and dropout all three right. */
  bonusAllThree: number
  /** "Bierbonus": one beer per this many points. */
  pointsPerBeer: number
}

export const DEFAULT_RULES: ScoringRules = {
  racePositions: [15, 12, 10, 8, 7, 5, 5, 5, 5, 5],
  sprintPositions: [8, 7, 5],
  jokerMinGridPosition: 11,
  last: 5,
  fastestLap: 5,
  dnf: 5,
  bonusAllThree: 10,
  pointsPerBeer: 4,
}

export type ItemStatus = 'right' | 'wrong' | 'empty'

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
  const positionPoints = snapshot.kind === 'sprint' ? rules.sprintPositions : rules.racePositions
  const items = positionPoints.map((points, i) =>
    scorePosition(prediction.positions[i] ?? null, i, points, snapshot),
  )

  if (snapshot.kind === 'race') {
    const last = scoreLast(prediction.last, snapshot, rules)
    const fastestLap = scoreFastestLap(prediction.fastestLap, snapshot, rules)
    const dnf = scoreDnf(prediction.dnf, snapshot, rules)
    items.push(scoreJoker(prediction.joker, snapshot, rules), last, fastestLap, dnf)
    items.push(scoreBonus([last, fastestLap, dnf], rules))
  }

  return {
    total: items.reduce((sum, item) => sum + item.points, 0),
    max: items.reduce((sum, item) => sum + item.maxPoints, 0),
    items,
  }
}

/** "Bierbonus": 105 points = 26 beers. */
export function beers(total: number, rules: ScoringRules = DEFAULT_RULES): number {
  return Math.floor(total / rules.pointsPerBeer)
}

const empty = (base: Omit<ScoreItem, 'detail' | 'points' | 'status'>): ScoreItem => ({
  ...base,
  detail: 'Not predicted',
  points: 0,
  status: 'empty',
})

function where(driver: number, snapshot: RaceSnapshot): string {
  if (snapshot.notStarted.includes(driver)) return 'Did not start'
  if (snapshot.retired.includes(driver)) return 'Out of the race'
  const index = snapshot.order.indexOf(driver)
  return index === -1 ? 'Not classified' : `currently P${index + 1}`
}

function scorePosition(driver: number | null, index: number, points: number, snapshot: RaceSnapshot): ScoreItem {
  const base = { key: `p${index + 1}`, label: `P${index + 1}`, predicted: driver, maxPoints: points }
  if (driver === null) return empty(base)
  const right = snapshot.order[index] === driver
  return { ...base, detail: where(driver, snapshot), points: right ? points : 0, status: right ? 'right' : 'wrong' }
}

function scoreJoker(driver: number | null, snapshot: RaceSnapshot, rules: ScoringRules): ScoreItem {
  const base = { key: 'joker', label: 'Joker', predicted: driver, maxPoints: 0 }
  if (driver === null) return empty(base)

  const gridPosition = snapshot.grid.indexOf(driver) + 1
  if (gridPosition === 0) return { ...base, detail: 'Not on the starting grid', points: 0, status: 'wrong' }
  if (gridPosition < rules.jokerMinGridPosition) {
    return {
      ...base,
      detail: `Started P${gridPosition} — the joker must start P${rules.jokerMinGridPosition} or lower`,
      points: 0,
      status: 'wrong',
    }
  }

  const index = snapshot.order.indexOf(driver)
  const now = where(driver, snapshot)
  const detail = `Started P${gridPosition}, ${now.charAt(0).toLowerCase()}${now.slice(1)}`
  const inTop10 = index !== -1 && index < 10
  return {
    ...base,
    maxPoints: gridPosition,
    detail,
    points: inTop10 ? gridPosition : 0,
    status: inTop10 ? 'right' : 'wrong',
  }
}

function scoreLast(driver: number | null, snapshot: RaceSnapshot, rules: ScoringRules): ScoreItem {
  const base = { key: 'last', label: 'Last finisher', predicted: driver, maxPoints: rules.last }
  if (driver === null) return empty(base)
  if (snapshot.order.at(-1) === driver) {
    return { ...base, detail: `Last, P${snapshot.order.length}`, points: rules.last, status: 'right' }
  }
  const index = snapshot.order.indexOf(driver)
  const detail = index === -1 ? `${where(driver, snapshot)} (doesn't count as last)` : `currently P${index + 1} of ${snapshot.order.length}`
  return { ...base, detail, points: 0, status: 'wrong' }
}

function scoreFastestLap(driver: number | null, snapshot: RaceSnapshot, rules: ScoringRules): ScoreItem {
  const base = { key: 'fastestLap', label: 'Fastest lap', predicted: driver, maxPoints: rules.fastestLap }
  if (driver === null) return empty(base)
  const fl = snapshot.fastestLap
  if (!fl) return { ...base, detail: 'No lap times yet', points: 0, status: 'wrong' }
  const detail = `${formatLapTime(fl.duration)} on lap ${fl.lap}`
  if (fl.driver === driver) return { ...base, detail: `Holds it: ${detail}`, points: rules.fastestLap, status: 'right' }
  return { ...base, detail: `Fastest: ${detail}`, points: 0, status: 'wrong' }
}

function scoreDnf(driver: number | null, snapshot: RaceSnapshot, rules: ScoringRules): ScoreItem {
  const base = { key: 'dnf', label: 'Dropout', predicted: driver, maxPoints: rules.dnf }
  if (driver === null) return empty(base)
  if (snapshot.notStarted.includes(driver)) {
    return { ...base, detail: "Did not start (doesn't count)", points: 0, status: 'wrong' }
  }
  if (snapshot.retired.includes(driver)) return { ...base, detail: 'Out of the race', points: rules.dnf, status: 'right' }
  return { ...base, detail: 'Still racing', points: 0, status: 'wrong' }
}

function scoreBonus(parts: ScoreItem[], rules: ScoringRules): ScoreItem {
  const base = { key: 'bonus', label: 'Bonus', predicted: null, maxPoints: rules.bonusAllThree }
  if (parts.some((p) => p.status === 'empty')) {
    return { ...base, detail: 'Needs last finisher, fastest lap and dropout', points: 0, status: 'empty' }
  }
  const right = parts.filter((p) => p.status === 'right').length
  if (right === parts.length) {
    return { ...base, detail: 'Last finisher, fastest lap and dropout all right', points: rules.bonusAllThree, status: 'right' }
  }
  return { ...base, detail: `${right} of 3 right (last finisher, fastest lap, dropout)`, points: 0, status: 'wrong' }
}

/** 83.456 -> "1:23.456" */
export function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = (seconds - minutes * 60).toFixed(3).padStart(6, '0')
  return `${minutes}:${rest}`
}
