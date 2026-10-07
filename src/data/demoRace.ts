import type { Driver, LapEvent, PositionEvent, RaceTimeline, RetirementEvent } from '../domain/types'

/**
 * A made-up race that works without internet. Useful for trying the app and for tests.
 * It is generated from a fixed seed, so it is identical every time.
 */
export const DEMO_RACE_ID = 'demo'

const DEMO_DRIVERS: Driver[] = [
  { number: 1, code: 'VER', name: 'Max Verstappen', team: 'Red Bull Racing', teamColor: '#3671C6' },
  { number: 22, code: 'TSU', name: 'Yuki Tsunoda', team: 'Red Bull Racing', teamColor: '#3671C6' },
  { number: 4, code: 'NOR', name: 'Lando Norris', team: 'McLaren', teamColor: '#FF8000' },
  { number: 81, code: 'PIA', name: 'Oscar Piastri', team: 'McLaren', teamColor: '#FF8000' },
  { number: 16, code: 'LEC', name: 'Charles Leclerc', team: 'Ferrari', teamColor: '#E8002D' },
  { number: 44, code: 'HAM', name: 'Lewis Hamilton', team: 'Ferrari', teamColor: '#E8002D' },
  { number: 63, code: 'RUS', name: 'George Russell', team: 'Mercedes', teamColor: '#27F4D2' },
  { number: 12, code: 'ANT', name: 'Andrea Kimi Antonelli', team: 'Mercedes', teamColor: '#27F4D2' },
  { number: 14, code: 'ALO', name: 'Fernando Alonso', team: 'Aston Martin', teamColor: '#229971' },
  { number: 18, code: 'STR', name: 'Lance Stroll', team: 'Aston Martin', teamColor: '#229971' },
  { number: 10, code: 'GAS', name: 'Pierre Gasly', team: 'Alpine', teamColor: '#0093CC' },
  { number: 43, code: 'COL', name: 'Franco Colapinto', team: 'Alpine', teamColor: '#0093CC' },
  { number: 23, code: 'ALB', name: 'Alexander Albon', team: 'Williams', teamColor: '#64C4FF' },
  { number: 55, code: 'SAI', name: 'Carlos Sainz', team: 'Williams', teamColor: '#64C4FF' },
  { number: 6, code: 'HAD', name: 'Isack Hadjar', team: 'Racing Bulls', teamColor: '#6692FF' },
  { number: 30, code: 'LAW', name: 'Liam Lawson', team: 'Racing Bulls', teamColor: '#6692FF' },
  { number: 31, code: 'OCO', name: 'Esteban Ocon', team: 'Haas', teamColor: '#B6BABD' },
  { number: 87, code: 'BEA', name: 'Oliver Bearman', team: 'Haas', teamColor: '#B6BABD' },
  { number: 27, code: 'HUL', name: 'Nico Hulkenberg', team: 'Kick Sauber', teamColor: '#52E252' },
  { number: 5, code: 'BOR', name: 'Gabriel Bortoleto', team: 'Kick Sauber', teamColor: '#52E252' },
]

/** Small deterministic random number generator (mulberry32). */
function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createDemoRace(seed = 2026, totalLaps = 30): RaceTimeline {
  const random = seededRandom(seed)
  const startMs = Date.UTC(2026, 2, 8, 15, 0, 0)

  // Car performance roughly follows the list order, with some randomness.
  const pace = new Map(DEMO_DRIVERS.map((d, i) => [d.number, 90 + i * 0.09 + random() * 0.6]))
  const grid = [...DEMO_DRIVERS]
    .map((d) => ({ driver: d.number, quali: pace.get(d.number)! + random() * 0.8 }))
    .sort((a, b) => a.quali - b.quali)
    .map((g) => g.driver)

  // Two drivers drop out on fixed-but-random laps; everybody pits once.
  const retiresAfterLap = new Map([
    [grid[13], 4 + Math.floor(random() * 6)],
    [grid[4], 15 + Math.floor(random() * 8)],
  ])
  const pitLap = new Map(DEMO_DRIVERS.map((d) => [d.number, 10 + Math.floor(random() * 12)]))

  const positions: PositionEvent[] = grid.map((driver, i) => ({ t: startMs - 60_000, driver, position: i + 1 }))
  const laps: LapEvent[] = []
  const retirements: RetirementEvent[] = []
  // Grid slots cost a little time at the start.
  const elapsed = new Map(grid.map((driver, i) => [driver, i * 0.25]))
  const running = new Set(grid)

  for (let lap = 1; lap <= totalLaps; lap++) {
    for (const driver of running) {
      const tyreDrop = lap * 0.03
      const pit = pitLap.get(driver) === lap ? 21 : 0
      const firstLap = lap === 1 ? 6 : 0
      const duration = pace.get(driver)! + tyreDrop + pit + firstLap + (random() - 0.5) * 1.6
      elapsed.set(driver, elapsed.get(driver)! + duration)
      laps.push({ t: startMs + elapsed.get(driver)! * 1000, driver, lap, duration: Number(duration.toFixed(3)) })
    }
    const order = [...running].sort((a, b) => elapsed.get(a)! - elapsed.get(b)!)
    order.forEach((driver, i) => {
      positions.push({ t: startMs + elapsed.get(driver)! * 1000, driver, position: i + 1 })
    })
    for (const [driver, retireLap] of retiresAfterLap) {
      if (retireLap === lap && running.delete(driver)) {
        retirements.push({ t: startMs + (elapsed.get(driver)! + 40) * 1000, driver })
      }
    }
  }

  laps.sort((a, b) => a.t - b.t)
  positions.sort((a, b) => a.t - b.t)
  return {
    id: DEMO_RACE_ID,
    name: 'Demo Grand Prix (offline)',
    drivers: [...DEMO_DRIVERS].sort((a, b) => a.number - b.number),
    totalLaps,
    startMs,
    endMs: laps.at(-1)!.t,
    positions,
    laps,
    retirements,
  }
}
