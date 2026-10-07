import { describe, expect, it } from 'vitest'
import { prediction, sec, tinyRace } from '../test/fixtures'
import { diffScores } from './changes'
import { buildScoreHistory } from './history'
import { DEFAULT_RULES, scorePrediction } from './scoring'
import { snapshotAt } from './snapshot'

const p = prediction({
  positions: [1, 2, null, null, null, null, null, null, null, null],
  fastestLap: 2,
  dnf: 4,
})

describe('diffScores', () => {
  it('lists only the items whose points changed, with the reason', () => {
    const race = tinyRace()
    const before = scorePrediction(p, snapshotAt(race, sec(140)))
    const after = scorePrediction(p, snapshotAt(race, sec(160)))
    expect(diffScores(before, after)).toEqual([
      { key: 'p1', label: 'P1', predicted: 1, delta: -15, detail: 'currently P2' },
      { key: 'p2', label: 'P2', predicted: 2, delta: -12, detail: 'currently P1' },
    ])
  })
})

describe('buildScoreHistory', () => {
  const history = buildScoreHistory(tinyRace(), p, DEFAULT_RULES, 10_000)

  it('starts with the score at the start of the race', () => {
    expect(history[0]).toMatchObject({ t: sec(0), lap: 1, total: 27, changes: [] })
  })

  it('records each moment the score changed, and why', () => {
    const summary = history.slice(1).map((h) => ({
      t: (h.t - sec(0)) / 1000,
      total: h.total,
      keys: h.changes.map((c) => `${c.key}${c.delta > 0 ? '+' : ''}${c.delta}`),
    }))
    expect(summary).toEqual([
      { t: 120, total: 32, keys: ['dnf+5'] },
      { t: 150, total: 5, keys: ['p1-15', 'p2-12'] },
      { t: 200, total: 10, keys: ['fastestLap+5'] },
      { t: 300, total: 5, keys: ['fastestLap-5'] },
    ])
  })

  it('ends with the final score', () => {
    const last = history.at(-1)!
    expect(last.t).toBe(sec(300))
    // P1/P2 swapped (0), dropout right (5), fastest lap lost (0)
    expect(last.total).toBe(5)
  })
})
