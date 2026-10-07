import { describe, expect, it, vi } from 'vitest'
import { buildTimeline, fetchRaces, fetchRaceTimeline, type RawRaceData } from './openf1'

const iso = (s: number) => new Date(Date.UTC(2025, 6, 27, 13, 0, s)).toISOString()
const ms = (s: number) => Date.UTC(2025, 6, 27, 13, 0, 0) + s * 1000

/** Shaped like real OpenF1 responses (trimmed): 3 drivers, 2 laps, driver 44 retires. */
function raw(overrides: Partial<RawRaceData> = {}): RawRaceData {
  return {
    session: { session_key: 9999, session_name: 'Race', date_start: iso(0), date_end: iso(7200) },
    name: 'Belgian Grand Prix',
    drivers: [
      { driver_number: 1, name_acronym: 'VER', full_name: 'Max VERSTAPPEN', team_name: 'Red Bull Racing', team_colour: '3671C6' },
      { driver_number: 4, name_acronym: 'NOR', full_name: 'Lando NORRIS', team_name: 'McLaren', team_colour: 'FF8000' },
      { driver_number: 44, name_acronym: 'HAM', full_name: 'Lewis HAMILTON', team_name: null, team_colour: null },
      { driver_number: 4, name_acronym: 'NOR', full_name: 'Lando NORRIS', team_name: 'McLaren', team_colour: 'FF8000' },
    ],
    laps: [
      // lap 1 has no duration (standing start), lap 2 has no next lap: use start + duration
      { driver_number: 1, lap_number: 1, date_start: iso(10), lap_duration: null },
      { driver_number: 1, lap_number: 2, date_start: iso(110), lap_duration: 95.5 },
      { driver_number: 4, lap_number: 1, date_start: iso(11), lap_duration: null },
      { driver_number: 4, lap_number: 2, date_start: iso(111), lap_duration: 95.1 },
      { driver_number: 44, lap_number: 1, date_start: null, lap_duration: 101 },
    ],
    positions: [
      { date: iso(150), driver_number: 4, position: 1 },
      { date: iso(0), driver_number: 1, position: 1 },
      { date: iso(0), driver_number: 4, position: 2 },
      { date: iso(0), driver_number: 44, position: 3 },
    ],
    results: [
      { driver_number: 4, position: 1, number_of_laps: 2, dnf: false, dns: false, dsq: false },
      { driver_number: 1, position: 2, number_of_laps: 2, dnf: false, dns: false, dsq: false },
      { driver_number: 44, position: null, number_of_laps: 1, dnf: true, dns: false, dsq: false },
    ],
    ...overrides,
  }
}

describe('buildTimeline', () => {
  it('maps drivers, without duplicates, with team colours', () => {
    const t = buildTimeline(raw())
    expect(t.id).toBe('openf1-9999')
    expect(t.kind).toBe('race')
    expect(t.name).toBe('Belgian Grand Prix')
    expect(t.drivers.map((d) => d.code)).toEqual(['VER', 'NOR', 'HAM'])
    expect(t.drivers[0]).toMatchObject({ team: 'Red Bull Racing', teamColor: '#3671C6' })
    expect(t.drivers[2]).toMatchObject({ team: 'Unknown', teamColor: '#888888' })
  })

  it('turns lap start times into lap completion times', () => {
    const t = buildTimeline(raw())
    expect(t.laps).toEqual([
      { t: ms(110), driver: 1, lap: 1, duration: null },
      { t: ms(111), driver: 4, lap: 1, duration: null },
      { t: ms(205.5), driver: 1, lap: 2, duration: 95.5 },
      { t: ms(206.1), driver: 4, lap: 2, duration: 95.1 },
    ])
  })

  it('derives start, end and race distance', () => {
    const t = buildTimeline(raw())
    expect(t.startMs).toBe(ms(10))
    expect(t.endMs).toBe(ms(206.1))
    expect(t.totalLaps).toBe(2)
  })

  it('sorts position updates by time', () => {
    expect(buildTimeline(raw()).positions.map((p) => p.t)).toEqual([ms(0), ms(0), ms(0), ms(150)])
  })

  it('takes retirements and the final order from the official result', () => {
    const t = buildTimeline(raw())
    expect(t.retirements).toEqual([{ driver: 44, t: ms(10) }])
    expect(t.finalOrder).toEqual([4, 1])
  })

  it('treats a driver that did not start as out from the start', () => {
    const results = raw().results.map((r) => (r.driver_number === 44 ? { ...r, dnf: false, dns: true } : r))
    expect(buildTimeline(raw({ results })).retirements).toEqual([{ driver: 44, t: ms(10), dns: true }])
  })

  it('recognises a sprint', () => {
    const t = buildTimeline(raw({ session: { ...raw().session, session_name: 'Sprint' } }))
    expect(t.kind).toBe('sprint')
  })

  it('during a live race (no result yet) assumes drivers who stopped lapping are out', () => {
    const laps = [
      ...raw().laps,
      { driver_number: 1, lap_number: 3, date_start: iso(206), lap_duration: 300 },
      { driver_number: 4, lap_number: 3, date_start: iso(207), lap_duration: 300 },
    ]
    const t = buildTimeline(raw({ laps, results: [] }))
    expect(t.finalOrder).toBeUndefined()
    expect(t.retirements.map((r) => r.driver)).toEqual([44])
  })
})

function mockFetch(routes: Record<string, unknown>) {
  return vi.fn(async (url: string | URL | Request) => {
    const path = String(url).replace('https://api.openf1.org/v1', '')
    const match = Object.keys(routes).find((prefix) => path.startsWith(prefix))
    if (!match) return new Response(JSON.stringify({ detail: 'No results found.' }), { status: 404 })
    return new Response(JSON.stringify(routes[match]), { status: 200 })
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>
}

describe('fetchRaces', () => {
  it('lists races and sprints that have started, oldest first, with their Grand Prix name', async () => {
    const fetchFn = mockFetch({
      '/sessions': [
        { session_key: 2, meeting_key: 20, session_name: 'Race', date_start: '2025-05-04T20:00:00Z', country_name: 'United States', location: 'Miami', year: 2025 },
        { session_key: 1, meeting_key: 10, session_name: 'Race', date_start: '2025-03-16T04:00:00Z', country_name: 'Australia', location: 'Melbourne', year: 2025 },
        { session_key: 4, meeting_key: 20, session_name: 'Sprint', date_start: '2025-05-03T16:00:00Z', country_name: 'United States', location: 'Miami', year: 2025 },
        { session_key: 5, meeting_key: 20, session_name: 'Sprint Qualifying', date_start: '2025-05-02T20:30:00Z', country_name: 'United States', location: 'Miami', year: 2025 },
        { session_key: 3, meeting_key: 30, session_name: 'Race', date_start: '2025-12-07T13:00:00Z', country_name: 'UAE', location: 'Yas Marina', year: 2025 },
      ],
      '/meetings': [{ meeting_key: 10, meeting_name: 'Australian Grand Prix' }],
    })
    const races = await fetchRaces(2025, fetchFn, Date.parse('2025-06-01T00:00:00Z'))
    expect(races).toEqual([
      { id: 'openf1-1', sessionKey: 1, kind: 'race', name: 'Australian Grand Prix', date: '2025-03-16T04:00:00Z' },
      { id: 'openf1-4', sessionKey: 4, kind: 'sprint', name: 'United States (Miami) – Sprint', date: '2025-05-03T16:00:00Z' },
      { id: 'openf1-2', sessionKey: 2, kind: 'race', name: 'United States (Miami)', date: '2025-05-04T20:00:00Z' },
    ])
    expect(fetchFn).toHaveBeenCalledWith('https://api.openf1.org/v1/sessions?year=2025&session_type=Race')
  })

  it('throws a clear error when the API fails', async () => {
    const fetchFn = vi.fn(async () => new Response('boom', { status: 500 })) as unknown as typeof fetch
    await expect(fetchRaces(2025, fetchFn)).rejects.toThrow('OpenF1 request failed (500)')
  })
})

describe('fetchRaceTimeline', () => {
  it('downloads all parts of a race and builds the timeline', async () => {
    const r = raw()
    const fetchFn = mockFetch({
      '/sessions?session_key=9999': [r.session],
      '/drivers': r.drivers,
      '/laps': r.laps,
      '/position': r.positions,
      // no '/session_result' -> 404 -> treated as "no result yet"
    })
    const race = { id: 'openf1-9999', sessionKey: 9999, kind: 'race' as const, name: 'Belgian Grand Prix', date: iso(0) }
    const t = await fetchRaceTimeline(race, fetchFn)
    expect(t.drivers).toHaveLength(3)
    expect(t.finalOrder).toBeUndefined()
    expect(fetchFn).toHaveBeenCalledTimes(5)
  })
})
