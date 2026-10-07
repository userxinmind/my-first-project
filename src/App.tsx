import { useEffect, useMemo, useState } from 'react'
import { PredictionsEditor } from './components/PredictionsEditor'
import { RacePicker } from './components/RacePicker'
import { RaceView } from './components/RaceView'
import type { RaceSummary } from './data/openf1'
import { loadPredictions, savePredictions } from './data/predictionsStore'
import { DEMO_RACE, isPossiblyLive, loadRaceTimeline } from './data/races'
import { snapshotAt } from './domain/snapshot'
import type { Prediction, RaceTimeline } from './domain/types'

type Tab = 'predictions' | 'race'
const LIVE_REFRESH_MS = 30_000

export default function App() {
  const [race, setRace] = useState<RaceSummary>(DEMO_RACE)
  const [timeline, setTimeline] = useState<RaceTimeline | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>(() => loadPredictions(DEMO_RACE.id))
  const [tab, setTab] = useState<Tab>('predictions')
  const [live, setLive] = useState(false)

  // Load race data whenever another race is picked (and keep refreshing in live mode).
  useEffect(() => {
    let cancelled = false
    const load = () =>
      loadRaceTimeline(race)
        .then((t) => !cancelled && setTimeline(t))
        .catch((e: Error) => !cancelled && setError(e.message))
    load()
    const timer = live ? setInterval(load, LIVE_REFRESH_MS) : undefined
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [race, live])

  const selectRace = (next: RaceSummary) => {
    setRace(next)
    setTimeline(null)
    setError(null)
    setLive(false)
    setPredictions(loadPredictions(next.id))
  }

  const updatePredictions = (next: Prediction[]) => {
    setPredictions(next)
    savePredictions(race.id, next)
  }

  const grid = useMemo(() => (timeline ? snapshotAt(timeline, timeline.startMs).order : []), [timeline])

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden>
            ▰▰
          </span>
          <div>
            <h1>Pit Wall Predictor</h1>
            <p className="muted">Your prediction points, live — as if the race stopped right now.</p>
          </div>
        </div>
        <RacePicker value={race} onChange={selectRace} />
      </header>

      <nav className="tabs" aria-label="Sections">
        <button className={`tab ${tab === 'predictions' ? 'tab--active' : ''}`} onClick={() => setTab('predictions')}>
          1 · Predictions
        </button>
        <button className={`tab ${tab === 'race' ? 'tab--active' : ''}`} onClick={() => setTab('race')}>
          2 · Race
        </button>
        {isPossiblyLive(race) && (
          <label className="live-toggle">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> Follow live
          </label>
        )}
      </nav>

      <main>
        {error ? (
          <div className="card error">
            <p>Could not load this race: {error}</p>
            <p className="muted">Check your internet connection, or try the offline Demo race.</p>
          </div>
        ) : !timeline ? (
          <div className="card loading">Loading race data…</div>
        ) : tab === 'predictions' ? (
          <PredictionsEditor
            key={race.id}
            drivers={timeline.drivers}
            grid={grid}
            predictions={predictions}
            onChange={updatePredictions}
          />
        ) : (
          <RaceView key={race.id} timeline={timeline} predictions={predictions} live={live} />
        )}
      </main>

      <footer className="app__footer muted">
        Data: <a href="https://openf1.org">OpenF1</a> (unofficial, not affiliated with Formula 1).
      </footer>
    </div>
  )
}
