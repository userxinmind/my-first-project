import type { Driver } from '../domain/types'

interface Props {
  label: string
  drivers: Driver[]
  value: number | null
  onChange: (value: number | null) => void
  /** Drivers that are already used elsewhere (shown but disabled). */
  taken?: Set<number>
}

export function DriverSelect({ label, drivers, value, onChange, taken }: Props) {
  return (
    <label className="driver-select">
      <span className="driver-select__label">{label}</span>
      <select
        aria-label={label}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      >
        <option value="">— pick a driver —</option>
        {drivers.map((d) => (
          <option key={d.number} value={d.number} disabled={d.number !== value && taken?.has(d.number)}>
            {d.code} · {d.name} ({d.team})
          </option>
        ))}
      </select>
    </label>
  )
}
