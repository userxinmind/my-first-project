import { describe, expect, it } from 'vitest'
import { emptyPrediction, loadPredictions, savePredictions } from './predictionsStore'

describe('predictionsStore', () => {
  it('saves and loads predictions per race', () => {
    const alex = { ...emptyPrediction('Alex'), dnf: 44 }
    savePredictions('race-1', [alex])
    expect(loadPredictions('race-1')).toEqual([alex])
    expect(loadPredictions('race-2')).toEqual([])
  })

  it('ignores corrupt data', () => {
    localStorage.setItem('f1-predictions:race-1', '{not json')
    expect(loadPredictions('race-1')).toEqual([])
  })

  it('creates an empty prediction with 10 open slots', () => {
    const p = emptyPrediction('Sam')
    expect(p.playerName).toBe('Sam')
    expect(p.top10).toEqual(Array(10).fill(null))
    expect(p.playerId).not.toBe(emptyPrediction('Sam').playerId)
  })
})
