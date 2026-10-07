import { describe, expect, it } from 'vitest'
import { availableSeasons, DEMO_RACE, DEMO_SPRINT, isPossiblyLive, loadRaceTimeline } from './races'

describe('races', () => {
  it('lists seasons from now back to 2023', () => {
    expect(availableSeasons(new Date('2026-10-07'))).toEqual([2026, 2025, 2024, 2023])
  })

  it('loads the demo race and sprint without network', async () => {
    expect(await loadRaceTimeline(DEMO_RACE)).toMatchObject({ id: 'demo', kind: 'race' })
    expect(await loadRaceTimeline(DEMO_SPRINT)).toMatchObject({ id: 'demo-sprint', kind: 'sprint' })
  })

  it('treats a race as possibly live during the first 4 hours', () => {
    const race = { id: 'openf1-1', sessionKey: 1, kind: 'race' as const, name: 'X', date: '2026-10-04T13:00:00Z' }
    expect(isPossiblyLive(race, Date.parse('2026-10-04T12:59:00Z'))).toBe(false)
    expect(isPossiblyLive(race, Date.parse('2026-10-04T14:30:00Z'))).toBe(true)
    expect(isPossiblyLive(race, Date.parse('2026-10-04T17:01:00Z'))).toBe(false)
    expect(isPossiblyLive(DEMO_RACE)).toBe(false)
    expect(isPossiblyLive(DEMO_SPRINT)).toBe(false)
  })
})
