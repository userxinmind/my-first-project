import type { RaceTimeline } from '../domain/types'
import { createDemoRace, createDemoSprint, DEMO_RACE_ID, DEMO_SPRINT_ID } from './demoRace'
import { fetchRaceTimeline, type RaceSummary } from './openf1'

export const DEMO_RACE: RaceSummary = {
  id: DEMO_RACE_ID,
  sessionKey: 0,
  kind: 'race',
  name: 'Demo Grand Prix (offline)',
  date: new Date(Date.UTC(2026, 2, 8, 15)).toISOString(),
}

export const DEMO_SPRINT: RaceSummary = {
  id: DEMO_SPRINT_ID,
  sessionKey: 0,
  kind: 'sprint',
  name: 'Demo Sprint (offline)',
  date: new Date(Date.UTC(2026, 2, 7, 15)).toISOString(),
}

export const DEMO_RACES = [DEMO_RACE, DEMO_SPRINT]
const isDemo = (race: RaceSummary) => DEMO_RACES.some((d) => d.id === race.id)

/** Seasons OpenF1 has data for (2023 onwards), newest first. */
export function availableSeasons(now = new Date()): number[] {
  const seasons: number[] = []
  for (let year = now.getUTCFullYear(); year >= 2023; year--) seasons.push(year)
  return seasons
}

export function loadRaceTimeline(race: RaceSummary): Promise<RaceTimeline> {
  if (race.id === DEMO_RACE_ID) return Promise.resolve(createDemoRace())
  if (race.id === DEMO_SPRINT_ID) return Promise.resolve(createDemoSprint())
  return fetchRaceTimeline(race)
}

/** A race counts as "possibly live" from its start until 4 hours later. */
export function isPossiblyLive(race: RaceSummary, now = Date.now()): boolean {
  if (isDemo(race)) return false
  const start = Date.parse(race.date)
  return now >= start && now - start < 4 * 60 * 60_000
}
