import { useMemo, useState } from 'react'
import { buildScoreHistory, type ScoreHistoryEntry } from '../domain/history'
import { beers, formatLapTime, scorePrediction, type ScoreBreakdown } from '../domain/scoring'
import { snapshotAt } from '../domain/snapshot'
import type { Driver, Prediction, RaceSnapshot, RaceTimeline } from '../domain/types'
import { formatDuration } from '../simulation/clock'
import { REPLAY_DURATIONS_MIN, useReplay } from '../simulation/useReplay'
import { DriverTag } from './DriverTag'

interface Props {
  timeline: RaceTimeline
  predictions: Prediction[]
  /** Live mode: always show the latest data instead of a replay. */
  live?: boolean
}

export function RaceView({ timeline, predictions, live = false }: Props) {
  const replay = useReplay(timeline.startMs, timeline.endMs)
  const raceMs = live ? timeline.endMs : replay.raceMs
  const snapshot = useMemo(() => snapshotAt(timeline, raceMs), [timeline, raceMs])
  const driversById = useMemo(() => new Map(timeline.drivers.map((d) => [d.number, d])), [timeline])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = predictions.find((p) => p.playerId === selectedId) ?? predictions[0]

  const scores = predictions
    .map((p) => ({ prediction: p, score: scorePrediction(p, snapshot) }))
    .sort((a, b) => b.score.total - a.score.total)
  const selectedScore = scores.find((s) => s.prediction.playerId === selected?.playerId)?.score
  const history = useMemo(() => (selected ? buildScoreHistory(timeline, selected) : []), [timeline, selected])

  return (
    <section className="race">
      <div className="card race-controls">
        {live ? (
          <span className="live-badge">● LIVE</span>
        ) : (
          <button
            className="button button--play"
            onClick={replay.playing ? replay.pause : replay.play}
            aria-label={replay.playing ? 'Pause' : 'Play'}
          >
            {replay.playing ? '❚❚' : '▶'}
          </button>
        )}
        <div className="race-controls__status">
          <strong>
            {snapshot.finished ? 'Finished' : `Lap ${snapshot.currentLap} / ${snapshot.totalLaps}`}
          </strong>
          <span className="muted">{formatDuration(raceMs - timeline.startMs)} race time</span>
        </div>
        {!live && (
          <>
            <input
              className="race-controls__scrubber"
              type="range"
              aria-label="Race position"
              min={timeline.startMs}
              max={timeline.endMs}
              step={1000}
              value={raceMs}
              onChange={(e) => replay.seek(Number(e.target.value))}
            />
            <label className="race-controls__speed">
              Race in
              <select
                aria-label="Replay duration"
                value={replay.durationMs}
                onChange={(e) => replay.setDurationMs(Number(e.target.value))}
              >
                {REPLAY_DURATIONS_MIN.map((min) => (
                  <option key={min} value={min * 60_000}>
                    {min} min
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      <div className="race__grid">
        <RunningOrder snapshot={snapshot} driversById={driversById} score={selectedScore} />

        <div className="race__side">
          {predictions.length === 0 ? (
            <div className="card">
              <p className="muted">No predictions yet. Add players on the Predictions tab.</p>
            </div>
          ) : (
            <>
              <div className="card">
                <h2>Standings if the race stopped now</h2>
                <ol className="standings">
                  {scores.map(({ prediction, score }, i) => (
                    <li key={prediction.playerId}>
                      <button
                        className={`standings__row ${prediction.playerId === selected?.playerId ? 'standings__row--active' : ''}`}
                        onClick={() => setSelectedId(prediction.playerId)}
                      >
                        <span className="standings__pos">{i + 1}</span>
                        <span className="standings__name">{prediction.playerName}</span>
                        <span className="standings__points">{score.total}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
              {selected && selectedScore && (
                <ScoreCard name={selected.playerName} score={selectedScore} driversById={driversById} />
              )}
              <ScoreChart history={history} raceMs={raceMs} timeline={timeline} />
              <ChangeFeed history={history} raceMs={raceMs} driversById={driversById} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function RunningOrder({
  snapshot,
  driversById,
  score,
}: {
  snapshot: RaceSnapshot
  driversById: Map<number, Driver>
  score?: ScoreBreakdown
}) {
  // Which position the selected player predicted for each driver, and the joker.
  const predictedSlot = new Map<number, string>()
  let joker: number | null = null
  score?.items.forEach((item) => {
    if (/^p\d+$/.test(item.key) && item.predicted !== null) predictedSlot.set(item.predicted, item.label)
    if (item.key === 'joker') joker = item.predicted
  })

  return (
    <div className="card running-order">
      <h2>Running order</h2>
      <ol>
        {snapshot.order.map((driver, i) => {
          const slot = predictedSlot.get(driver)
          const hit = slot === `P${i + 1}` ? 'right' : 'wrong'
          return (
            <li key={driver} className={`running-order__row ${i === 9 ? 'running-order__row--cutoff' : ''}`}>
              <span className="running-order__pos">{i + 1}</span>
              <DriverTag driver={driversById.get(driver)} fallback={driver} />
              <span className="running-order__name">{driversById.get(driver)?.name ?? `#${driver}`}</span>
              {snapshot.fastestLap?.driver === driver && (
                <span className="badge badge--purple" title={formatLapTime(snapshot.fastestLap.duration)}>
                  ⏱ {formatLapTime(snapshot.fastestLap.duration)}
                </span>
              )}
              {slot && <span className={`badge badge--${hit}`}>you: {slot}</span>}
              {joker === driver && <span className={`badge badge--${i < 10 ? 'right' : 'joker'}`}>joker</span>}
            </li>
          )
        })}
        {snapshot.retired.map((driver) => (
          <li key={driver} className="running-order__row running-order__row--out">
            <span className="running-order__pos">{snapshot.notStarted.includes(driver) ? 'DNS' : 'OUT'}</span>
            <DriverTag driver={driversById.get(driver)} fallback={driver} />
            <span className="running-order__name">{driversById.get(driver)?.name ?? `#${driver}`}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

const STATUS_ICON = { right: '✓', wrong: '✗', empty: '·' } as const

function ScoreCard({
  name,
  score,
  driversById,
}: {
  name: string
  score: ScoreBreakdown
  driversById: Map<number, Driver>
}) {
  return (
    <div className="card score-card">
      <div className="score-card__header">
        <h2>{name}</h2>
        <div className="score-card__total" aria-label="Total points">
          <span key={score.total} className="score-card__number">
            {score.total}
          </span>
          <span className="muted"> / {score.max} pts</span>
          <div className="score-card__beers" title="Bierbonus: 1 beer per 4 points">
            🍺 {beers(score.total)} {beers(score.total) === 1 ? 'beer' : 'beers'}
          </div>
        </div>
      </div>
      <ul className="score-items">
        {score.items.map((item) => (
          <li key={item.key} className={`score-item score-item--${item.status}`}>
            <span className="score-item__icon">{STATUS_ICON[item.status]}</span>
            <span className="score-item__label">{item.label}</span>
            <DriverTag driver={item.predicted !== null ? driversById.get(item.predicted) : undefined} fallback={item.predicted} />
            <span className="score-item__detail">{item.detail}</span>
            <span className="score-item__points">
              {item.points}/{item.maxPoints}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Step chart of the score so far (no spoilers: only up to the current moment). */
function ScoreChart({ history, raceMs, timeline }: { history: ScoreHistoryEntry[]; raceMs: number; timeline: RaceTimeline }) {
  if (history.length === 0) return null
  const width = 600
  const height = 120
  const maxTotal = Math.max(1, ...history.map((h) => h.total))
  const x = (t: number) => ((t - timeline.startMs) / Math.max(1, timeline.endMs - timeline.startMs)) * width
  const y = (total: number) => height - 8 - (total / maxTotal) * (height - 16)

  const visible = history.filter((h) => h.t <= raceMs)
  let path = ''
  visible.forEach((h, i) => {
    path += i === 0 ? `M ${x(h.t)} ${y(h.total)}` : ` H ${x(h.t)} V ${y(h.total)}`
  })
  if (visible.length) path += ` H ${x(raceMs)}`

  return (
    <div className="card">
      <h2>Your points during the race</h2>
      <svg className="score-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Points over time">
        <path d={path} className="score-chart__line" vectorEffect="non-scaling-stroke" />
        <line x1={x(raceMs)} x2={x(raceMs)} y1={0} y2={height} className="score-chart__now" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

function ChangeFeed({
  history,
  raceMs,
  driversById,
}: {
  history: ScoreHistoryEntry[]
  raceMs: number
  driversById: Map<number, Driver>
}) {
  const entries = history.filter((h) => h.t <= raceMs && h.changes.length > 0).reverse()
  return (
    <div className="card">
      <h2>Why did my score change?</h2>
      {entries.length === 0 ? (
        <p className="muted">Nothing yet — changes appear here as the race develops.</p>
      ) : (
        <ul className="feed">
          {entries.map((entry) =>
            entry.changes.map((change) => (
              <li key={`${entry.t}-${change.key}`} className="feed__item">
                <span className="feed__lap">Lap {entry.lap}</span>
                <span className={`feed__delta ${change.delta > 0 ? 'feed__delta--up' : 'feed__delta--down'}`}>
                  {change.delta > 0 ? '+' : ''}
                  {change.delta}
                </span>
                <span>
                  <strong>{change.label}</strong>{' '}
                  {change.predicted !== null && (driversById.get(change.predicted)?.code ?? `#${change.predicted}`)}:{' '}
                  {change.detail}
                </span>
              </li>
            )),
          )}
        </ul>
      )}
    </div>
  )
}
