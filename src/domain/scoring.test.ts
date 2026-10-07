import { describe, expect, it } from 'vitest'
import { prediction, snapshot } from '../test/fixtures'
import { beers, DEFAULT_RULES, formatLapTime, scorePrediction } from './scoring'
import type { Prediction, RaceSnapshot } from './types'

const item = (key: string, p: Partial<Prediction>, s: Partial<RaceSnapshot> = {}) =>
  scorePrediction(prediction(p), snapshot(s)).items.find((i) => i.key === key)!
const top = (...drivers: (number | null)[]) => [...drivers, ...Array(10 - drivers.length).fill(null)]

describe('official rules (De Karre 2026)', () => {
  it('has the official point values', () => {
    expect(DEFAULT_RULES).toEqual({
      racePositions: [15, 12, 10, 8, 7, 5, 5, 5, 5, 5],
      sprintPositions: [8, 7, 5],
      jokerMinGridPosition: 11,
      last: 5,
      fastestLap: 5,
      dnf: 5,
      bonusAllThree: 10,
      pointsPerBeer: 4,
    })
  })
})

describe('scorePrediction – race', () => {
  it('gives 0 points for an empty prediction', () => {
    const score = scorePrediction(prediction(), snapshot())
    expect(score.total).toBe(0)
    expect(score.items.map((i) => i.key)).toEqual([
      'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10',
      'joker', 'last', 'fastestLap', 'dnf', 'bonus',
    ])
    expect(score.items.every((i) => i.status === 'empty')).toBe(true)
  })

  describe('top 10', () => {
    it('gives 15-12-10-8-7-5-5-5-5-5 for the exact positions', () => {
      const score = scorePrediction(prediction({ positions: top(1, 2, 3, 4, 5, 6, 7, 8, 9, 10) }), snapshot())
      expect(score.items.slice(0, 10).map((i) => i.points)).toEqual([15, 12, 10, 8, 7, 5, 5, 5, 5, 5])
      expect(score.total).toBe(77)
    })

    it('gives nothing for the right driver at another position', () => {
      expect(item('p1', { positions: top(2) })).toMatchObject({ status: 'wrong', points: 0, detail: 'currently P2' })
    })

    it('says when a predicted driver dropped out or did not start', () => {
      const s = { retired: [3, 4], notStarted: [4], order: [1, 2, 5] }
      expect(item('p1', { positions: top(3) }, s)).toMatchObject({ points: 0, detail: 'Out of the race' })
      expect(item('p1', { positions: top(4) }, s)).toMatchObject({ points: 0, detail: 'Did not start' })
    })
  })

  describe('joker', () => {
    it('scores his starting position when he finishes in the top 10', () => {
      // Driver 14 started P14 and is currently P8.
      const order = [1, 2, 3, 4, 5, 6, 7, 14, 8, 9, 10, 11, 12, 13, 15]
      expect(item('joker', { joker: 14 }, { order })).toMatchObject({
        status: 'right',
        points: 14,
        maxPoints: 14,
        detail: 'Started P14, currently P8',
      })
    })

    it('gives nothing when he is outside the top 10', () => {
      expect(item('joker', { joker: 12 })).toMatchObject({ status: 'wrong', points: 0, maxPoints: 12 })
    })

    it('may not start in the top 10', () => {
      const order = [10, 1, 2, 3]
      expect(item('joker', { joker: 10 }, { order })).toMatchObject({
        status: 'wrong',
        points: 0,
        detail: 'Started P10 — the joker must start P11 or lower',
      })
    })
  })

  describe('last finisher', () => {
    it('scores the last driver still classified', () => {
      expect(item('last', { last: 20 })).toMatchObject({ status: 'right', points: 5, detail: 'Last, P20' })
      expect(item('last', { last: 3 })).toMatchObject({ status: 'wrong', points: 0, detail: 'currently P3 of 20' })
    })

    it('does not count a dropout as last', () => {
      const s = { order: [1, 2, 3], retired: [20] }
      expect(item('last', { last: 20 }, s)).toMatchObject({
        status: 'wrong',
        detail: "Out of the race (doesn't count as last)",
      })
      expect(item('last', { last: 3 }, s)).toMatchObject({ status: 'right', points: 5 })
    })
  })

  it('scores the fastest lap', () => {
    const fastestLap = { driver: 16, lap: 44, duration: 83.456 }
    expect(item('fastestLap', { fastestLap: 16 }, { fastestLap })).toMatchObject({
      status: 'right',
      points: 5,
      detail: 'Holds it: 1:23.456 on lap 44',
    })
    expect(item('fastestLap', { fastestLap: 1 }, { fastestLap })).toMatchObject({ status: 'wrong', points: 0 })
    expect(item('fastestLap', { fastestLap: 1 })).toMatchObject({ detail: 'No lap times yet' })
  })

  describe('dropout', () => {
    it('scores a driver who started and dropped out', () => {
      expect(item('dnf', { dnf: 20 }, { retired: [20] })).toMatchObject({ status: 'right', points: 5 })
      expect(item('dnf', { dnf: 20 })).toMatchObject({ status: 'wrong', detail: 'Still racing' })
    })

    it('does not count a driver who did not start', () => {
      expect(item('dnf', { dnf: 20 }, { retired: [20], notStarted: [20] })).toMatchObject({
        status: 'wrong',
        points: 0,
        detail: "Did not start (doesn't count)",
      })
    })
  })

  describe('bonus', () => {
    const fastestLap = { driver: 1, lap: 3, duration: 90 }
    const s = { order: [1, 2, 3], retired: [20], fastestLap }

    it('gives 10 extra points when last finisher, fastest lap and dropout are all right', () => {
      const score = scorePrediction(prediction({ last: 3, fastestLap: 1, dnf: 20 }), snapshot(s))
      expect(score.items.find((i) => i.key === 'bonus')).toMatchObject({ status: 'right', points: 10 })
      expect(score.total).toBe(5 + 5 + 5 + 10)
    })

    it('gives nothing when one of the three is wrong', () => {
      expect(item('bonus', { last: 2, fastestLap: 1, dnf: 20 }, s)).toMatchObject({
        status: 'wrong',
        points: 0,
        detail: '2 of 3 right (last finisher, fastest lap, dropout)',
      })
    })

    it('is not possible when one of the three is not predicted', () => {
      expect(item('bonus', { fastestLap: 1, dnf: 20 }, s)).toMatchObject({ status: 'empty', points: 0 })
    })
  })
})

describe('scorePrediction – sprint', () => {
  it('only scores the top 3, with 8-7-5 points', () => {
    const p = prediction({ positions: [1, 2, 3], last: 20, dnf: 20 })
    const score = scorePrediction(p, snapshot({ kind: 'sprint' }))
    expect(score.items.map((i) => [i.key, i.points])).toEqual([
      ['p1', 8],
      ['p2', 7],
      ['p3', 5],
    ])
    expect(score.total).toBe(20)
  })
})

describe('beers (Bierbonus)', () => {
  it('gives one beer per 4 points, rounded down', () => {
    expect(beers(105)).toBe(26)
    expect(beers(3)).toBe(0)
    expect(beers(8)).toBe(2)
  })
})

describe('formatLapTime', () => {
  it('formats seconds as m:ss.mmm', () => {
    expect(formatLapTime(83.456)).toBe('1:23.456')
    expect(formatLapTime(65.04)).toBe('1:05.040')
  })
})
