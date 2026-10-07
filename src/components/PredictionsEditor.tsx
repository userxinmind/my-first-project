import { useState } from 'react'
import { emptyPrediction } from '../data/predictionsStore'
import { DEFAULT_RULES } from '../domain/scoring'
import type { Driver, Prediction, SessionKind } from '../domain/types'
import { DriverSelect } from './DriverSelect'

interface Props {
  kind: SessionKind
  drivers: Driver[]
  /** Starting grid order: for the "fill in the grid" shortcut and the joker rule. */
  grid: number[]
  predictions: Prediction[]
  onChange: (predictions: Prediction[]) => void
}

/** Add players and fill in their predictions for the selected race. */
export function PredictionsEditor({ kind, drivers, grid, predictions, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(predictions[0]?.playerId ?? null)
  const [newName, setNewName] = useState('')
  const selected = predictions.find((p) => p.playerId === selectedId) ?? predictions.at(0)

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const player = emptyPrediction(name, kind)
    onChange([...predictions, player])
    setSelectedId(player.playerId)
    setNewName('')
  }

  return (
    <section className="card predictions">
      <div className="players">
        {predictions.map((p) => (
          <button
            key={p.playerId}
            className={`chip ${p.playerId === selected?.playerId ? 'chip--active' : ''}`}
            onClick={() => setSelectedId(p.playerId)}
          >
            {p.playerName}
          </button>
        ))}
        <form className="players__add" onSubmit={addPlayer}>
          <input
            aria-label="Player name"
            placeholder="Add a player…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="button" disabled={!newName.trim()}>
            Add
          </button>
        </form>
      </div>

      {!selected ? (
        <p className="muted">Add yourself (and your friends) to fill in predictions.</p>
      ) : (
        <PredictionForm
          kind={kind}
          drivers={drivers}
          grid={grid}
          prediction={selected}
          onChange={(patch) =>
            onChange(predictions.map((p) => (p.playerId === selected.playerId ? { ...p, ...patch } : p)))
          }
          onRemove={() => {
            if (!confirm(`Remove ${selected.playerName}?`)) return
            onChange(predictions.filter((p) => p.playerId !== selected.playerId))
            setSelectedId(null)
          }}
        />
      )}
    </section>
  )
}

interface FormProps {
  kind: SessionKind
  drivers: Driver[]
  grid: number[]
  prediction: Prediction
  onChange: (patch: Partial<Prediction>) => void
  onRemove: () => void
}

function PredictionForm({ kind, drivers, grid, prediction, onChange, onRemove }: FormProps) {
  const size = prediction.positions.length
  const taken = new Set(prediction.positions.filter((d): d is number => d !== null))
  const setSlot = (index: number, driver: number | null) =>
    onChange({ positions: prediction.positions.map((d, i) => (i === index ? driver : d)) })

  // The joker may not be one of the top 10 after qualifying.
  const minGrid = DEFAULT_RULES.jokerMinGridPosition
  const jokerCandidates = grid.slice(minGrid - 1).flatMap((n) => drivers.find((d) => d.number === n) ?? [])

  return (
    <div className="prediction-form">
      <div className="prediction-form__header">
        <h2>{prediction.playerName}'s prediction</h2>
        <div className="prediction-form__actions">
          <button className="button button--ghost" onClick={() => onChange({ positions: grid.slice(0, size) })}>
            Fill top {size} with starting grid
          </button>
          <button className="button button--ghost button--danger" onClick={onRemove}>
            Remove player
          </button>
        </div>
      </div>

      <div className="prediction-form__columns">
        <fieldset>
          <legend>{kind === 'sprint' ? 'Sprint top 3' : 'Top 10'}</legend>
          {prediction.positions.map((driver, i) => (
            <DriverSelect
              key={i}
              label={`P${i + 1}`}
              drivers={drivers}
              value={driver}
              taken={taken}
              onChange={(d) => setSlot(i, d)}
            />
          ))}
        </fieldset>
        {kind === 'race' && (
          <fieldset>
            <legend>Extras</legend>
            <DriverSelect
              label="Joker"
              drivers={jokerCandidates}
              value={prediction.joker}
              onChange={(joker) => onChange({ joker })}
            />
            <p className="hint">Starts P{minGrid} or lower. Finishes in the top 10 → points = his starting position.</p>
            <DriverSelect
              label="Last finisher"
              drivers={drivers}
              value={prediction.last}
              onChange={(last) => onChange({ last })}
            />
            <p className="hint">Last classified finisher — a dropout doesn't count.</p>
            <DriverSelect
              label="Fastest lap"
              drivers={drivers}
              value={prediction.fastestLap}
              onChange={(fastestLap) => onChange({ fastestLap })}
            />
            <DriverSelect
              label="Dropout"
              drivers={drivers}
              value={prediction.dnf}
              onChange={(dnf) => onChange({ dnf })}
            />
            <p className="hint">Must have started the race. All three of last, fastest lap and dropout right: +10 bonus.</p>
          </fieldset>
        )}
      </div>
    </div>
  )
}
