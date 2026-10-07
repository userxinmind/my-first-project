# 0003 – Scoring rules

- **Status:** accepted (updated with the official rules on 2026-10-07)
- **Date:** 2026-10-07

## Context

The game has its own rules: "Formule 1 regelement De Karre 2026" ([PDF](../F1_regelement_2026.pdf),
summary in [game-rules.md](../game-rules.md)). The first version of the app used placeholder points
until the rules were shared.

## Decision

- All scoring lives in **one pure function**: `scorePrediction(prediction, snapshot, rules)` in
  `src/domain/scoring.ts`. It returns per-prediction points **and a human-readable reason**
  ("currently P5", "Started P14, currently P8", "Did not start (doesn't count)"), shown directly in the UI.
- Point values are in `DEFAULT_RULES` (a `ScoringRules` object), so a new season's values are a small change.
- A **sprint** is its own session (`kind: 'sprint'`) with only a top 3 prediction (8-7-5).
- A prediction stores `positions` (10 for a race, 3 for a sprint) plus `joker`, `last`, `fastestLap`, `dnf`.

Interpretations:

- Top 10 and sprint top 3: points only for the **exact** position (the rules list points per position).
- **Joker grid**: the rules say "the standing right after qualifying, including grid penalties announced
  before". The app uses the **starting grid** from the race data, which is the same in nearly all cases.
  It can differ when a car is moved after qualifying (e.g. a pit-lane start after parc fermé changes).
- **Last finisher** live = the last driver still running; a dropout never counts as last.
- **Dropout**: a DNS doesn't count (he must have started). A disqualification is not a dropout.
- **Bonus** needs all three of last finisher, fastest lap and dropout right.

## Consequences

- Rule changes: update `scoring.ts`, `scoring.test.ts` and `docs/game-rules.md` together.
- Data saved by v0.1 (placeholder version, `top10` field) is ignored on load.
- Not modelled (organisation rules): deadlines, the "no list handed in" default, prize pot,
  weekend total of sprint + race, season standings.
