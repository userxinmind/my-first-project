import type { Prediction, SessionKind } from '../domain/types'

/**
 * Predictions are stored in the browser (localStorage), per race.
 * Simple and private; sharing between devices is a possible future feature
 * (see docs/decisions/0001-tech-stack.md).
 */
const keyFor = (raceId: string) => `f1-predictions:${raceId}`

export function loadPredictions(raceId: string): Prediction[] {
  try {
    const raw = localStorage.getItem(keyFor(raceId))
    const predictions = raw ? (JSON.parse(raw) as Prediction[]) : []
    // Skip data saved by older versions of the app.
    return predictions.filter((p) => Array.isArray(p.positions))
  } catch {
    return []
  }
}

export function savePredictions(raceId: string, predictions: Prediction[]): void {
  try {
    localStorage.setItem(keyFor(raceId), JSON.stringify(predictions))
  } catch {
    // Storage full or blocked (private mode): the app keeps working, it just won't remember.
  }
}

export function emptyPrediction(playerName: string, kind: SessionKind): Prediction {
  return {
    playerId: crypto.randomUUID(),
    playerName,
    positions: Array.from({ length: kind === 'sprint' ? 3 : 10 }, () => null),
    joker: null,
    last: null,
    fastestLap: null,
    dnf: null,
  }
}
