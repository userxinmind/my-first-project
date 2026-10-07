import type { RaceSnapshot, RaceTimeline } from './types'

/**
 * Reconstructs the state of the race at time `t` (epoch ms):
 * "if the race stopped right now, what would the result be?"
 */
export function snapshotAt(timeline: RaceTimeline, t: number): RaceSnapshot {
  const finished = t >= timeline.endMs

  const retired = timeline.retirements
    .filter((r) => r.t <= t)
    .sort((a, b) => a.t - b.t)
    .map((r) => r.driver)
  const retiredSet = new Set(retired)

  let order: number[]
  if (finished && timeline.finalOrder?.length) {
    order = timeline.finalOrder.filter((d) => !retiredSet.has(d))
  } else {
    order = runningOrderAt(timeline, t).filter((d) => !retiredSet.has(d))
  }

  let fastestLap: RaceSnapshot['fastestLap'] = null
  let lapsCompleted = 0
  for (const lap of timeline.laps) {
    if (lap.t > t) continue
    lapsCompleted = Math.max(lapsCompleted, lap.lap)
    if (lap.duration !== null && (fastestLap === null || lap.duration < fastestLap.duration)) {
      fastestLap = { driver: lap.driver, lap: lap.lap, duration: lap.duration }
    }
  }

  return {
    order,
    retired,
    fastestLap,
    currentLap: finished ? timeline.totalLaps : Math.min(lapsCompleted + 1, timeline.totalLaps),
    totalLaps: timeline.totalLaps,
    finished,
  }
}

/**
 * Latest known position per driver at time `t`. Position updates of two drivers swapping
 * places arrive a moment apart, so on a tie the most recent update wins.
 * Drivers without any position yet are put at the back in car-number order.
 */
function runningOrderAt(timeline: RaceTimeline, t: number): number[] {
  const latest = new Map<number, { position: number; t: number }>()
  for (const e of timeline.positions) {
    // Position events before the start (the grid) count as the starting order.
    if (e.t > t && e.t > timeline.startMs) continue
    const prev = latest.get(e.driver)
    if (!prev || e.t >= prev.t) latest.set(e.driver, { position: e.position, t: e.t })
  }

  return timeline.drivers
    .map((d) => d.number)
    .sort((a, b) => {
      const pa = latest.get(a)
      const pb = latest.get(b)
      if (!pa || !pb) return pa ? -1 : pb ? 1 : a - b
      if (pa.position !== pb.position) return pa.position - pb.position
      return pb.t - pa.t
    })
}
