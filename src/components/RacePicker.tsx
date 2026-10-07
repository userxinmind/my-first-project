import { useEffect, useState } from 'react'
import { fetchRaces, type RaceSummary } from '../data/openf1'
import { availableSeasons, DEMO_RACE } from '../data/races'

const DEMO = 'demo'

interface Props {
  value: RaceSummary
  onChange: (race: RaceSummary) => void
}

/** Choose the offline demo race or any race from OpenF1 (2023 onwards). */
export function RacePicker({ value, onChange }: Props) {
  const [season, setSeason] = useState<string>(value.id === DEMO_RACE.id ? DEMO : value.date.slice(0, 4))
  const [races, setRaces] = useState<RaceSummary[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>(season === DEMO ? 'idle' : 'loading')

  useEffect(() => {
    if (season === DEMO) return
    let cancelled = false
    fetchRaces(Number(season))
      .then((list) => {
        if (cancelled) return
        setRaces(list)
        setStatus('idle')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [season])

  const changeSeason = (next: string) => {
    setSeason(next)
    setRaces([])
    setStatus(next === DEMO ? 'idle' : 'loading')
    if (next === DEMO) onChange(DEMO_RACE)
  }

  return (
    <div className="race-picker">
      <label>
        <span className="race-picker__label">Season</span>
        <select aria-label="Season" value={season} onChange={(e) => changeSeason(e.target.value)}>
          <option value={DEMO}>Demo (offline)</option>
          {availableSeasons().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      {season !== DEMO && (
        <label>
          <span className="race-picker__label">Race</span>
          <select
            aria-label="Race"
            value={races.some((r) => r.id === value.id) ? value.id : ''}
            disabled={status !== 'idle' || races.length === 0}
            onChange={(e) => {
              const race = races.find((r) => r.id === e.target.value)
              if (race) onChange(race)
            }}
          >
            <option value="">
              {status === 'loading'
                ? 'Loading races…'
                : status === 'error'
                  ? 'Could not load races (offline?)'
                  : races.length === 0
                    ? 'No races yet'
                    : '— pick a race —'}
            </option>
            {races.map((r) => (
              <option key={r.id} value={r.id}>
                {r.date.slice(0, 10)} · {r.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
