# 0004 – Race replay and "if the race stopped now"

- **Status:** accepted
- **Date:** 2026-10-07

## Context

We want to see live points during the race, and to test this by replaying a past race in
fast-forward (e.g. 1.5 hours in 3 minutes), including *why* points change.

## Decision

1. **Timeline → snapshot.** A race is a `RaceTimeline`: time-stamped position changes, completed laps and
   retirements. `snapshotAt(timeline, t)` reconstructs the state at any moment t: running order (without
   drivers who dropped out), fastest lap so far, current lap. After the finish the official result is used.
2. **Score = f(prediction, snapshot).** Live, replay and final scores all use the same function.
   Live mode simply takes the snapshot at the newest data point.
3. **Replay clock.** `raceTimeAt` maps real elapsed time to race time; `useReplay` drives it with
   `requestAnimationFrame` and supports play/pause, seeking and speed changes.
4. **Score history.** `buildScoreHistory` samples the race every 5 s (race time) once per prediction and
   records every change with its reason. The "why did my score change?" feed and the points chart show
   only entries up to the current moment (no spoilers), and keep working when jumping back and forth.

## Consequences

- Everything except the clock hook is pure and unit-tested with small hand-made races.
- Changes that last under 5 s of race time may not appear in the feed (they still count in the live score).
