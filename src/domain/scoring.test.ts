import { describe, expect, it } from 'vitest'
import { prediction, snapshot } from '../test/fixtures'
import { DEFAULT_RULES, formatLapTime, scorePrediction, type ScoringRules } from './scoring'

const rules: ScoringRules = { top10Exact: 3, top10InTop10: 1, last: 5, fastestLap: 2, dnf: 4 }
const item = (key: string, p = prediction(), s = snapshot()) =>
  scorePrediction(p, s, rules).items.find((i) => i.key === key)!

describe('scorePrediction', () => {
  it('gives 0 points for an empty prediction', () => {
    const score = scorePrediction(prediction(), snapshot(), rules)
    expect(score.total).toBe(0)
    expect(score.items).toHaveLength(13)
    expect(score.items.every((i) => i.status === 'empty')).toBe(true)
    expect(score.max).toBe(10 * 3 + 5 + 2 + 4)
  })

  describe('top 10', () => {
    const top10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    it('gives full points for the exact position', () => {
      const score = scorePrediction(prediction({ top10 }), snapshot(), rules)
      expect(score.total).toBe(30)
      expect(score.items[0]).toMatchObject({ label: 'P1', status: 'exact', detail: 'currently P1', points: 3 })
    })

    it('gives partial points when the driver is in the top 10 at another position', () => {
      const p = prediction({ top10: [2, 1, null, null, null, null, null, null, null, null] })
      expect(item('p1', p)).toMatchObject({ status: 'partial', points: 1, detail: 'currently P2' })
      expect(item('p2', p)).toMatchObject({ status: 'partial', points: 1, detail: 'currently P1' })
    })

    it('gives no points when the driver is outside the top 10', () => {
      const p = prediction({ top10: [11, null, null, null, null, null, null, null, null, null] })
      expect(item('p1', p)).toMatchObject({ status: 'wrong', points: 0, detail: 'currently P11' })
    })

    it('gives no points when the driver dropped out', () => {
      const p = prediction({ top10: [99, null, null, null, null, null, null, null, null, null] })
      const s = snapshot({ retired: [99] })
      expect(item('p1', p, s)).toMatchObject({ status: 'wrong', points: 0, detail: 'Out of the race' })
    })
  })

  it('scores last place against the last driver still running', () => {
    expect(item('last', prediction({ last: 12 }))).toMatchObject({ status: 'exact', points: 5 })
    expect(item('last', prediction({ last: 3 }))).toMatchObject({
      status: 'wrong',
      points: 0,
      detail: 'currently P3 of 12',
    })
  })

  it('scores the fastest lap', () => {
    const s = snapshot({ fastestLap: { driver: 16, lap: 44, duration: 83.456 } })
    expect(item('fastestLap', prediction({ fastestLap: 16 }), s)).toMatchObject({
      status: 'exact',
      points: 2,
      detail: 'Holds it: 1:23.456 on lap 44',
    })
    expect(item('fastestLap', prediction({ fastestLap: 1 }), s)).toMatchObject({ status: 'wrong', points: 0 })
    expect(item('fastestLap', prediction({ fastestLap: 1 }))).toMatchObject({ detail: 'No lap times yet' })
  })

  it('scores the driver that drops out', () => {
    expect(item('dnf', prediction({ dnf: 20 }), snapshot({ retired: [20] }))).toMatchObject({
      status: 'exact',
      points: 4,
    })
    expect(item('dnf', prediction({ dnf: 20 }))).toMatchObject({ status: 'wrong', detail: 'Still racing' })
  })

  it('adds everything up', () => {
    const p = prediction({
      top10: [1, 3, 2, 4, 5, 6, 7, 8, 9, 15],
      last: 12,
      fastestLap: 1,
      dnf: 20,
    })
    const s = snapshot({ fastestLap: { driver: 1, lap: 3, duration: 90 } })
    // 7 exact (21) + 2 partial (2) + 1 wrong + last (5) + fastest lap (2) + dnf wrong (0)
    expect(scorePrediction(p, s, rules).total).toBe(30)
  })

  it('uses the default rules when none are given', () => {
    const p = prediction({ top10: [1, null, null, null, null, null, null, null, null, null] })
    expect(scorePrediction(p, snapshot()).total).toBe(DEFAULT_RULES.top10Exact)
  })
})

describe('formatLapTime', () => {
  it('formats seconds as m:ss.mmm', () => {
    expect(formatLapTime(83.456)).toBe('1:23.456')
    expect(formatLapTime(65.04)).toBe('1:05.040')
  })
})
