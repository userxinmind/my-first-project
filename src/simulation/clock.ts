/**
 * Maps real (wall clock) time to race time, so a 1.5 hour race can be replayed in e.g. 3 minutes.
 */
export function raceTimeAt(elapsedRealMs: number, startMs: number, endMs: number, replayDurationMs: number): number {
  if (replayDurationMs <= 0) return endMs
  const progress = Math.min(Math.max(elapsedRealMs / replayDurationMs, 0), 1)
  return startMs + progress * (endMs - startMs)
}

/** Inverse of `raceTimeAt`: how far into the replay a given race time is. */
export function elapsedRealAt(raceMs: number, startMs: number, endMs: number, replayDurationMs: number): number {
  if (endMs <= startMs) return replayDurationMs
  const progress = Math.min(Math.max((raceMs - startMs) / (endMs - startMs), 0), 1)
  return progress * replayDurationMs
}

/** 5025000 -> "1:23:45", 83000 -> "1:23" */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
