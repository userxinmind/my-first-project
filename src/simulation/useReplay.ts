import { useCallback, useEffect, useState } from 'react'
import { elapsedRealAt, raceTimeAt } from './clock'

export const REPLAY_DURATIONS_MIN = [1, 3, 5, 10] as const

/**
 * Plays a race back in fast-forward: the whole race in `durationMs` of real time.
 * Returns the current race time and controls to play, pause, seek and change speed.
 */
export function useReplay(startMs: number, endMs: number, initialDurationMs = 3 * 60_000) {
  const [durationMs, setDurationMs] = useState(initialDurationMs)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [playing, setPlaying] = useState(false)

  const done = elapsedMs >= durationMs
  const isPlaying = playing && !done

  useEffect(() => {
    if (!isPlaying) return
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      // Read the delta now: the state updater may run later, after `previous` changed.
      const delta = now - previous
      previous = now
      setElapsedMs((e) => Math.min(e + delta, durationMs))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, durationMs])

  const play = useCallback(() => {
    if (done) setElapsedMs(0)
    setPlaying(true)
  }, [done])

  const changeDuration = useCallback(
    (next: number) => {
      // Keep the same position in the race when changing speed.
      setElapsedMs((e) => (e / durationMs) * next)
      setDurationMs(next)
    },
    [durationMs],
  )

  return {
    raceMs: raceTimeAt(elapsedMs, startMs, endMs, durationMs),
    progress: durationMs > 0 ? elapsedMs / durationMs : 1,
    playing: isPlaying,
    durationMs,
    play,
    pause: useCallback(() => setPlaying(false), []),
    seek: useCallback(
      (raceMs: number) => setElapsedMs(elapsedRealAt(raceMs, startMs, endMs, durationMs)),
      [startMs, endMs, durationMs],
    ),
    setDurationMs: changeDuration,
  }
}
