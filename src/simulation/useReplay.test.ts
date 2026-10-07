import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReplay } from './useReplay'

/** Drives requestAnimationFrame by hand so we control time. */
let now = 0
let callbacks: FrameRequestCallback[] = []
function advanceFrames(ms: number, frameMs = 16) {
  for (let t = 0; t < ms; t += frameMs) {
    now += frameMs
    const pending = callbacks
    callbacks = []
    act(() => pending.forEach((cb) => cb(now)))
  }
}

beforeEach(() => {
  now = 0
  callbacks = []
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => callbacks.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => {})
})
afterEach(() => vi.unstubAllGlobals())

describe('useReplay', () => {
  const start = 0
  const end = 90 * 60_000

  it('plays the race in real time proportion to the chosen duration', () => {
    const { result } = renderHook(() => useReplay(start, end, 60_000))
    act(() => result.current.play())
    advanceFrames(30_000)
    // Half of the replay duration = half of the race (within one frame).
    expect(result.current.progress).toBeCloseTo(0.5, 2)
    expect(result.current.raceMs).toBeCloseTo(end / 2, -5)
  })

  it('stops at the end, and restarts from the beginning when played again', () => {
    const { result } = renderHook(() => useReplay(start, end, 1_000))
    act(() => result.current.play())
    advanceFrames(2_000)
    expect(result.current.raceMs).toBe(end)
    expect(result.current.playing).toBe(false)
    act(() => result.current.play())
    expect(result.current.raceMs).toBe(start)
  })

  it('seeks and keeps the race position when the speed changes', () => {
    const { result } = renderHook(() => useReplay(start, end, 60_000))
    act(() => result.current.seek(end / 4))
    expect(result.current.raceMs).toBe(end / 4)
    act(() => result.current.setDurationMs(300_000))
    expect(result.current.raceMs).toBe(end / 4)
  })
})
