import type { CSSProperties } from 'react'
import type { Driver } from '../domain/types'

/** Three-letter driver code with a stripe in the team colour. */
export function DriverTag({ driver, fallback }: { driver?: Driver; fallback?: number | null }) {
  if (!driver) return <span className="driver-tag driver-tag--empty">{fallback ?? '—'}</span>
  return (
    <span className="driver-tag" style={{ '--team': driver.teamColor } as CSSProperties} title={driver.name}>
      {driver.code}
    </span>
  )
}
