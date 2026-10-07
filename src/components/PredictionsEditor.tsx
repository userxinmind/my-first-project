import { useState } from 'react'
import { emptyPrediction } from '../data/predictionsStore'
import type { Driver, Prediction } from '../domain/types'
import { DriverSelect } from './DriverSelect'

interface Props {
  drivers: Driver[]
  /** Starting grid order, used for the "fill in the grid" shortcut. */
  grid: number[]
  predictions: Prediction[]
  onChange: (predictions: Prediction[]) => void
}

/** Add players and fill in their predictions for the selected race. */
export function PredictionsEditor({ drivers, grid, predictions, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(predictions[0]?.playerId ?? null)
  const [newName, setNewName] = useState('')
  const selected = predictions.find((p) => p.playerId === selectedId) ?? predictions[0]

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const player = emptyPrediction(name)
    onChange([...predictions, player])
    setSelectedId(player.playerId)
    setNewName('')
  }

  const update = (patch: Partial<Prediction>) =>
    onChange(predictions.map((p) => (p.playerId === selected.playerId ? { ...p, ...patch } : p)))

  const remove = () => {
    if (!confirm(`Remove ${selected.playerName}?`)) return
    onChange(predictions.filter((p) => p.playerId !== selected.playerId))
    setSelectedId(null)
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
        <PredictionForm drivers={drivers} grid={grid} prediction={selected} onChange={update} onRemove={remove} />
      )}
    </section>
  )
}

interface FormProps {
  drivers: Driver[]
  grid: number[]
  prediction: Prediction
  onChange: (patch: Partial<Prediction>) => void
  onRemove: () => void
}

function PredictionForm({ drivers, grid, prediction, onChange, onRemove }: FormProps) {
  const taken = new Set(prediction.top10.filter((d): d is number => d !== null))
  const setSlot = (index: number, driver: number | null) =>
    onChange({ top10: prediction.top10.map((d, i) => (i === index ? driver : d)) })

  return (
    <div className="prediction-form">
      <div className="prediction-form__header">
        <h2>{prediction.playerName}'s prediction</h2>
        <div className="prediction-form__actions">
          <button className="button button--ghost" onClick={() => onChange({ top10: grid.slice(0, 10) })}>
            Fill top 10 with starting grid
          </button>
          <button className="button button--ghost button--danger" onClick={onRemove}>
            Remove player
          </button>
        </div>
      </div>

      <div className="prediction-form__columns">
        <fieldset>
          <legend>Top 10</legend>
          {prediction.top10.map((driver, i) => (
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
        <fieldset>
          <legend>Extras</legend>
          <DriverSelect
            label="Last place"
            drivers={drivers}
            value={prediction.last}
            onChange={(last) => onChange({ last })}
          />
          <DriverSelect
            label="Fastest lap"
            drivers={drivers}
            value={prediction.fastestLap}
            onChange={(fastestLap) => onChange({ fastestLap })}
          />
          <DriverSelect
            label="Drops out"
            drivers={drivers}
            value={prediction.dnf}
            onChange={(dnf) => onChange({ dnf })}
          />
        </fieldset>
      </div>
    </div>
  )
}
