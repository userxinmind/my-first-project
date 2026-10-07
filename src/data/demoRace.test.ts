import { describe, expect, it } from 'vitest'
import { snapshotAt } from '../domain/snapshot'
import { createDemoRace } from './demoRace'

describe('createDemoRace', () => {
  const race = createDemoRace()

  it('is the same every time (deterministic)', () => {
    expect(createDemoRace()).toEqual(race)
  })

  it('has a full grid and plausible race length', () => {
    expect(race.drivers).toHaveLength(20)
    expect(race.totalLaps).toBe(30)
    const minutes = (race.endMs - race.startMs) / 60_000
    expect(minutes).toBeGreaterThan(40)
    expect(minutes).toBeLessThan(55)
  })

  it('starts with all 20 cars and ends with two retirements', () => {
    expect(snapshotAt(race, race.startMs).order).toHaveLength(20)
    const end = snapshotAt(race, race.endMs)
    expect(end.retired).toHaveLength(2)
    expect(end.order).toHaveLength(18)
    expect(end.finished).toBe(true)
    expect(end.currentLap).toBe(30)
    expect(end.fastestLap).not.toBeNull()
  })

  it('has position changes during the race', () => {
    const grid = snapshotAt(race, race.startMs).order
    const halfway = snapshotAt(race, (race.startMs + race.endMs) / 2).order
    expect(halfway).not.toEqual(grid.filter((d) => halfway.includes(d)))
  })
})
