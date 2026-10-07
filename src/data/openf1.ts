import type { Driver, LapEvent, PositionEvent, RaceTimeline, RetirementEvent } from '../domain/types'

/**
 * Client for the OpenF1 API (https://openf1.org) — open source, free for historical data
 * (2023 onwards), no API key needed. See docs/decisions/0002-f1-data-source.md.
 */
export const OPENF1_BASE_URL = 'https://api.openf1.org/v1'

/** A driver who hasn't completed a lap for this long (while others have) is assumed out. */
const STALE_DRIVER_MS = 5 * 60_000
/** A retirement is placed shortly after the driver's last completed lap. */
const RETIREMENT_DELAY_MS = 30_000

// --- Raw OpenF1 response shapes (only the fields we use) ---

export interface OpenF1Session {
  session_key: number
  meeting_key: number
  session_name: string
  date_start: string
  date_end: string
  country_name: string
  location: string
  year: number
}
export interface OpenF1Meeting {
  meeting_key: number
  meeting_name: string
}
export interface OpenF1Driver {
  driver_number: number
  name_acronym: string
  full_name: string
  team_name: string | null
  team_colour: string | null
}
export interface OpenF1Lap {
  driver_number: number
  lap_number: number
  date_start: string | null
  lap_duration: number | null
}
export interface OpenF1Position {
  date: string
  driver_number: number
  position: number
}
export interface OpenF1Result {
  driver_number: number
  position: number | null
  number_of_laps: number
  dnf: boolean
  dns: boolean
  dsq: boolean
}

export interface RaceSummary {
  id: string
  sessionKey: number
  name: string
  date: string
}

export interface RawRaceData {
  session: Pick<OpenF1Session, 'session_key' | 'date_start' | 'date_end'>
  name: string
  drivers: OpenF1Driver[]
  laps: OpenF1Lap[]
  positions: OpenF1Position[]
  results: OpenF1Result[]
}

type FetchFn = typeof fetch

// --- Fetching ---

async function getJson<T>(path: string, fetchFn: FetchFn, retries = 2): Promise<T[]> {
  const response = await fetchFn(`${OPENF1_BASE_URL}${path}`)
  // OpenF1 answers 404 when a query has no results.
  if (response.status === 404) return []
  if (response.status === 429 && retries > 0) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return getJson<T>(path, fetchFn, retries - 1)
  }
  if (!response.ok) throw new Error(`OpenF1 request failed (${response.status}): ${path}`)
  return (await response.json()) as T[]
}

/** All Grand Prix races of a season that have started already, oldest first. */
export async function fetchRaces(year: number, fetchFn: FetchFn = fetch, now = Date.now()): Promise<RaceSummary[]> {
  const sessions = await getJson<OpenF1Session>(`/sessions?year=${year}&session_name=Race`, fetchFn)
  const meetings = await getJson<OpenF1Meeting>(`/meetings?year=${year}`, fetchFn)
  const meetingNames = new Map(meetings.map((m) => [m.meeting_key, m.meeting_name]))
  return sessions
    .filter((s) => Date.parse(s.date_start) <= now)
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))
    .map((s) => ({
      id: `openf1-${s.session_key}`,
      sessionKey: s.session_key,
      name: meetingNames.get(s.meeting_key) ?? `${s.country_name} (${s.location})`,
      date: s.date_start,
    }))
}

/** Downloads all data of one race and turns it into a timeline. Requests run one by one (rate limit). */
export async function fetchRaceTimeline(race: RaceSummary, fetchFn: FetchFn = fetch): Promise<RaceTimeline> {
  const key = race.sessionKey
  const sessions = await getJson<OpenF1Session>(`/sessions?session_key=${key}`, fetchFn)
  if (sessions.length === 0) throw new Error(`Race session ${key} not found`)
  const drivers = await getJson<OpenF1Driver>(`/drivers?session_key=${key}`, fetchFn)
  const laps = await getJson<OpenF1Lap>(`/laps?session_key=${key}`, fetchFn)
  const positions = await getJson<OpenF1Position>(`/position?session_key=${key}`, fetchFn)
  const results = await getJson<OpenF1Result>(`/session_result?session_key=${key}`, fetchFn)
  return buildTimeline({ session: sessions[0], name: race.name, drivers, laps, positions, results })
}

// --- Mapping (pure, unit tested) ---

export function buildTimeline(raw: RawRaceData): RaceTimeline {
  const drivers = mapDrivers(raw.drivers)
  const laps = mapLaps(raw.laps)

  const lapOneStarts = raw.laps
    .filter((l) => l.lap_number === 1 && l.date_start)
    .map((l) => Date.parse(l.date_start!))
  const startMs = lapOneStarts.length
    ? Math.min(...lapOneStarts)
    : laps.length
      ? laps[0].t - 120_000
      : Date.parse(raw.session.date_start)
  const endMs = laps.length ? Math.max(...laps.map((l) => l.t)) : Date.parse(raw.session.date_end)

  const totalLaps = Math.max(0, ...raw.results.map((r) => r.number_of_laps), ...laps.map((l) => l.lap))

  const positions: PositionEvent[] = raw.positions
    .map((p) => ({ t: Date.parse(p.date), driver: p.driver_number, position: p.position }))
    .sort((a, b) => a.t - b.t)

  const finalOrder = raw.results
    .filter((r) => r.position !== null && !r.dnf && !r.dns && !r.dsq)
    .sort((a, b) => a.position! - b.position!)
    .map((r) => r.driver_number)

  return {
    id: `openf1-${raw.session.session_key}`,
    name: raw.name,
    drivers,
    totalLaps,
    startMs,
    endMs,
    positions,
    laps,
    retirements: findRetirements(raw.results, drivers, laps, startMs, endMs),
    finalOrder: finalOrder.length ? finalOrder : undefined,
  }
}

function mapDrivers(raw: OpenF1Driver[]): Driver[] {
  const byNumber = new Map<number, Driver>()
  for (const d of raw) {
    byNumber.set(d.driver_number, {
      number: d.driver_number,
      code: d.name_acronym,
      name: d.full_name,
      team: d.team_name ?? 'Unknown',
      teamColor: d.team_colour ? `#${d.team_colour.replace('#', '')}` : '#888888',
    })
  }
  return [...byNumber.values()].sort((a, b) => a.number - b.number)
}

/**
 * OpenF1 gives the *start* time of each lap. A lap is completed when the next one starts,
 * or (for the last lap) at start + duration.
 */
function mapLaps(raw: OpenF1Lap[]): LapEvent[] {
  const perDriver = new Map<number, OpenF1Lap[]>()
  for (const lap of raw) {
    const list = perDriver.get(lap.driver_number) ?? []
    list.push(lap)
    perDriver.set(lap.driver_number, list)
  }

  const events: LapEvent[] = []
  for (const [driver, list] of perDriver) {
    list.sort((a, b) => a.lap_number - b.lap_number)
    list.forEach((lap, i) => {
      const next = list[i + 1]
      let t: number | null = null
      if (next?.date_start && next.lap_number === lap.lap_number + 1) t = Date.parse(next.date_start)
      else if (lap.date_start && lap.lap_duration !== null) t = Date.parse(lap.date_start) + lap.lap_duration * 1000
      if (t !== null) events.push({ t, driver, lap: lap.lap_number, duration: lap.lap_duration })
    })
  }
  return events.sort((a, b) => a.t - b.t)
}

/**
 * Uses the official result (dnf/dns flags) when available. During a live race there is
 * no result yet, so a driver who stopped completing laps is assumed to be out.
 */
function findRetirements(
  results: OpenF1Result[],
  drivers: Driver[],
  laps: LapEvent[],
  startMs: number,
  endMs: number,
): RetirementEvent[] {
  const lastLapAt = new Map<number, number>()
  for (const lap of laps) lastLapAt.set(lap.driver, Math.max(lap.t, lastLapAt.get(lap.driver) ?? 0))
  const retireTime = (driver: number) => {
    const last = lastLapAt.get(driver)
    return last === undefined ? startMs : Math.min(last + RETIREMENT_DELAY_MS, endMs)
  }

  if (results.length > 0) {
    return results
      .filter((r) => r.dnf || r.dns)
      .map((r) => ({ driver: r.driver_number, t: r.dns ? startMs : retireTime(r.driver_number) }))
      .sort((a, b) => a.t - b.t)
  }

  if (laps.length === 0) return []
  return drivers
    .filter((d) => (lastLapAt.get(d.number) ?? startMs) < endMs - STALE_DRIVER_MS)
    .map((d) => ({ driver: d.number, t: retireTime(d.number) }))
    .sort((a, b) => a.t - b.t)
}
