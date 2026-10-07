# 0002 – F1 data source: OpenF1

- **Status:** accepted
- **Date:** 2026-10-07

## Context

We need, for any moment of a race: the running order, lap times (fastest lap) and
who dropped out. That has to work for past races (testing / replay) and preferably live.

## Decision

Use **[OpenF1](https://openf1.org)** (open source, [github.com/br-g/openf1](https://github.com/br-g/openf1)).

- Free and no API key for **historical data from 2023 onwards**. CORS-enabled, so the browser can
  call it directly.
- Time-stamped data: `position` (every position change), `laps` (lap start + duration),
  `session_result` (final classification with `dnf` / `dns` / `dsq`), `drivers` (codes, team colours),
  `sessions` / `meetings` (race list and names).
- A race is downloaded once (5 requests, one after the other because of the rate limit) and turned into a
  `RaceTimeline` (`src/data/openf1.ts → buildTimeline`).

How the data is interpreted:

- Lap *completion* time = start of the next lap (or start + duration for the last lap).
- Race start = start of lap 1; race end = last lap completed.
- Drop-outs = `dnf`/`dns` in the official result, placed 30 s after the driver's last lap.
  During a live race there is no result yet, so a driver who hasn't completed a lap for 5 minutes
  while others have is assumed out.

## Alternatives considered

- **Jolpica-F1** (successor of Ergast): good historical results and per-lap positions, but no
  sub-lap timing and no live data.
- **FastF1**: excellent, but a Python library — would require a backend.
- **Official F1 live timing feed**: unofficial to use, needs a backend and is fragile.

## Consequences / limitations

- **Live data**: OpenF1 real-time access requires a paid OpenF1 account. Without it, data for a running
  session may be unavailable or delayed. The "Follow live" option polls every 30 s and works as soon as
  data is available. Adding an API key would need a small backend (never put a secret in browser code).
- `session_result` is marked *beta* by OpenF1.
- Unofficial data, may contain gaps. Pre-2023 races are not available.
- An offline **Demo Grand Prix** (`src/data/demoRace.ts`) makes the app usable and testable without network.
