import { describe, expect, it } from 'vitest'
import { sec, tinyRace } from '../test/fixtures'
import { snapshotAt } from './snapshot'

describe('snapshotAt', () => {
  it('uses the starting grid at the start of the race', () => {
    const s = snapshotAt(tinyRace(), sec(0))
    expect(s.order).toEqual([1, 2, 3, 4])
    expect(s.retired).toEqual([])
    expect(s.fastestLap).toBeNull()
    expect(s.currentLap).toBe(1)
    expect(s.finished).toBe(false)
  })

  it('removes drivers that dropped out from the running order', () => {
    const s = snapshotAt(tinyRace(), sec(130))
    expect(s.order).toEqual([1, 2, 3])
    expect(s.retired).toEqual([4])
  })

  it('applies overtakes as they happen', () => {
    expect(snapshotAt(tinyRace(), sec(149)).order.slice(0, 2)).toEqual([1, 2])
    expect(snapshotAt(tinyRace(), sec(152)).order.slice(0, 2)).toEqual([2, 1])
  })

  it('lets the most recent update win while two drivers briefly share a position', () => {
    // At 150s driver 2 is reported P1, driver 1 still has its old P1.
    expect(snapshotAt(tinyRace(), sec(150)).order.slice(0, 2)).toEqual([2, 1])
  })

  it('tracks the fastest lap so far', () => {
    expect(snapshotAt(tinyRace(), sec(100)).fastestLap).toEqual({ driver: 1, lap: 1, duration: 100 })
    expect(snapshotAt(tinyRace(), sec(195)).fastestLap).toEqual({ driver: 2, lap: 2, duration: 94 })
    expect(snapshotAt(tinyRace(), sec(300)).fastestLap).toEqual({ driver: 1, lap: 3, duration: 92.5 })
  })

  it('counts the lap the leader is on, capped at the race distance', () => {
    expect(snapshotAt(tinyRace(), sec(110)).currentLap).toBe(2)
    expect(snapshotAt(tinyRace(), sec(295)).currentLap).toBe(3)
  })

  it('uses the official result once the race is finished', () => {
    const race = tinyRace({ finalOrder: [3, 2, 1] })
    expect(snapshotAt(race, sec(299)).order).toEqual([2, 1, 3])
    const final = snapshotAt(race, sec(300))
    expect(final.finished).toBe(true)
    expect(final.order).toEqual([3, 2, 1])
  })

  it('puts drivers without position data at the back', () => {
    const race = tinyRace({ positions: [{ t: sec(-60), driver: 3, position: 1 }], retirements: [] })
    expect(snapshotAt(race, sec(10)).order).toEqual([3, 1, 2, 4])
  })
})
