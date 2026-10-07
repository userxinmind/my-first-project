import { describe, expect, it } from 'vitest'
import { elapsedRealAt, formatDuration, raceTimeAt } from './clock'

describe('replay clock', () => {
  const start = 1_000_000
  const end = start + 90 * 60_000 // a 1.5 hour race
  const replay = 3 * 60_000 // replayed in 3 minutes

  it('maps replay time to race time', () => {
    expect(raceTimeAt(0, start, end, replay)).toBe(start)
    expect(raceTimeAt(90_000, start, end, replay)).toBe(start + 45 * 60_000)
    expect(raceTimeAt(replay, start, end, replay)).toBe(end)
  })

  it('stays within the race', () => {
    expect(raceTimeAt(-5, start, end, replay)).toBe(start)
    expect(raceTimeAt(replay * 2, start, end, replay)).toBe(end)
  })

  it('maps race time back to replay time', () => {
    expect(elapsedRealAt(start + 45 * 60_000, start, end, replay)).toBe(90_000)
    expect(elapsedRealAt(end + 1, start, end, replay)).toBe(replay)
  })

  it('formats durations', () => {
    expect(formatDuration(83_000)).toBe('1:23')
    expect(formatDuration(5_025_000)).toBe('1:23:45')
    expect(formatDuration(-1)).toBe('0:00')
  })
})
