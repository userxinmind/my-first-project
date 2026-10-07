import type { Driver, Prediction, RaceSnapshot, RaceTimeline } from '../domain/types'

/** Small, hand-made race for unit tests: 4 drivers, 3 laps. */
export const T0 = Date.UTC(2025, 6, 27, 13, 0, 0)
export const sec = (s: number) => T0 + s * 1000

const driver = (number: number, code: string): Driver => ({
  number,
  code,
  name: code,
  team: 'Team',
  teamColor: '#ffffff',
})

export function tinyRace(overrides: Partial<RaceTimeline> = {}): RaceTimeline {
  return {
    id: 'tiny',
    name: 'Tiny GP',
    drivers: [driver(1, 'AAA'), driver(2, 'BBB'), driver(3, 'CCC'), driver(4, 'DDD')],
    totalLaps: 3,
    startMs: sec(0),
    endMs: sec(300),
    positions: [
      // grid, before the start
      { t: sec(-60), driver: 1, position: 1 },
      { t: sec(-60), driver: 2, position: 2 },
      { t: sec(-60), driver: 3, position: 3 },
      { t: sec(-60), driver: 4, position: 4 },
      // lap 2: driver 2 overtakes driver 1
      { t: sec(150), driver: 2, position: 1 },
      { t: sec(151), driver: 1, position: 2 },
    ],
    laps: [
      { t: sec(100), driver: 1, lap: 1, duration: 100 },
      { t: sec(101), driver: 2, lap: 1, duration: 101 },
      { t: sec(195), driver: 2, lap: 2, duration: 94 },
      { t: sec(196), driver: 1, lap: 2, duration: 96 },
      { t: sec(290), driver: 2, lap: 3, duration: 95 },
      { t: sec(291), driver: 1, lap: 3, duration: 92.5 },
    ],
    retirements: [{ t: sec(120), driver: 4 }],
    ...overrides,
  }
}

export function snapshot(overrides: Partial<RaceSnapshot> = {}): RaceSnapshot {
  return {
    order: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    retired: [],
    fastestLap: null,
    currentLap: 1,
    totalLaps: 50,
    finished: false,
    ...overrides,
  }
}

export function prediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    playerId: 'p1',
    playerName: 'Alex',
    top10: Array.from({ length: 10 }, () => null),
    last: null,
    fastestLap: null,
    dnf: null,
    ...overrides,
  }
}
