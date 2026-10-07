/**
 * Core domain types. These are independent of any data source (OpenF1, demo data, ...)
 * and of the UI, so the scoring logic can be tested in isolation.
 */

/** A driver taking part in a race. `number` is the car number and is used as the id. */
export interface Driver {
  number: number
  code: string // three-letter acronym, e.g. "VER"
  name: string
  team: string
  teamColor: string // CSS colour, e.g. "#3671C6"
}

/** A driver's race position changed at time `t` (epoch ms). */
export interface PositionEvent {
  t: number
  driver: number
  position: number
}

/** A driver completed lap `lap` at time `t` (epoch ms). `duration` in seconds, if known. */
export interface LapEvent {
  t: number
  driver: number
  lap: number
  duration: number | null
}

/** A driver dropped out of the race at time `t` (epoch ms). */
export interface RetirementEvent {
  t: number
  driver: number
}

/**
 * Everything that happened during a race, as time-stamped events.
 * From this we can reconstruct the state of the race at any moment (see `snapshotAt`).
 */
export interface RaceTimeline {
  id: string
  name: string
  drivers: Driver[]
  totalLaps: number
  startMs: number
  endMs: number
  positions: PositionEvent[]
  laps: LapEvent[]
  retirements: RetirementEvent[]
  /** Official result (after penalties), used once the race is finished. Optional. */
  finalOrder?: number[]
}

/** The state of the race at one moment in time. */
export interface RaceSnapshot {
  /** Running order of drivers still in the race, P1 first. */
  order: number[]
  /** Drivers that dropped out, in the order they retired. */
  retired: number[]
  fastestLap: { driver: number; lap: number; duration: number } | null
  /** Lap currently being raced by the leader (1-based). */
  currentLap: number
  totalLaps: number
  finished: boolean
}

/** One player's predictions for one race. Values are car numbers, `null` = not filled in. */
export interface Prediction {
  playerId: string
  playerName: string
  top10: (number | null)[] // index 0 = predicted P1
  last: number | null
  fastestLap: number | null
  dnf: number | null
}
