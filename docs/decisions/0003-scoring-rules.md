# 0003 – Scoring rules (placeholder)

- **Status:** proposed — waiting for the official rules document
- **Date:** 2026-10-07

## Context

The rules of the game will be shared separately. The app had to be built before that.

## Decision

- All scoring lives in **one pure function**: `scorePrediction(prediction, snapshot, rules)` in
  `src/domain/scoring.ts`. It returns per-prediction points **and a human-readable reason**, which the UI
  shows directly ("currently P5", "Out of the race", "Holds it: 1:23.456 on lap 44").
- The point values are a `ScoringRules` object (`DEFAULT_RULES`), so changing values is a one-line change.
- Placeholder values and interpretations: see [docs/game-rules.md](../game-rules.md).

## Consequences

- When the official rules arrive: update `DEFAULT_RULES` (and the logic if a rule works differently),
  update `scoring.test.ts`, `docs/game-rules.md`, and mark this ADR as accepted.
