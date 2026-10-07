import { describe, expect, it } from 'vitest'
import { emptyPrediction, loadPredictions, savePredictions } from './predictionsStore'

describe('predictionsStore', () => {
  it('saves and loads predictions per race', () => {
    const alex = { ...emptyPrediction('Alex', 'race'), dnf: 44 }
    savePredictions('race-1', [alex])
    expect(loadPredictions('race-1')).toEqual([alex])
    expect(loadPredictions('race-2')).toEqual([])
  })

  it('ignores corrupt data', () => {
    localStorage.setItem('f1-predictions:race-1', '{not json')
    expect(loadPredictions('race-1')).toEqual([])
  })

  it('ignores predictions saved by an older version of the app', () => {
    localStorage.setItem('f1-predictions:race-1', JSON.stringify([{ playerName: 'Old', top10: [] }]))
    expect(loadPredictions('race-1')).toEqual([])
  })

  it('creates an empty prediction: 10 open positions for a race, 3 for a sprint', () => {
    const p = emptyPrediction('Sam', 'race')
    expect(p.playerName).toBe('Sam')
    expect(p.positions).toEqual(Array(10).fill(null))
    expect(p.joker).toBeNull()
    expect(emptyPrediction('Sam', 'sprint').positions).toEqual([null, null, null])
    expect(p.playerId).not.toBe(emptyPrediction('Sam', 'race').playerId)
  })
})
