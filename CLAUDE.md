# Context for AI assistants (and humans)

Pit Wall Predictor: live score tracker for a private F1 prediction game among friends.
Read `README.md` first, then `docs/decisions/` for why things are the way they are.

## Conventions

- Keep it simple: this is a small app. No state library, no router, no backend until needed.
- Game logic lives in `src/domain/` as **pure functions** (no React, no fetch). UI in `src/components/`.
- All scoring rules are in `src/domain/scoring.ts`. Rule changes = that file + its tests + `docs/game-rules.md`.
  The official rules are `docs/F1_regelement_2026.pdf` (Dutch); `docs/game-rules.md` is the English summary.
- Every change comes with tests. Run `npm run check` (lint + typecheck + tests) before committing.
- Tests sit next to the code: `foo.ts` → `foo.test.ts`. Use the fixtures in `src/test/fixtures.ts`.
- New significant decision → add a numbered ADR in `docs/decisions/` (copy the format of an existing one).
- Plain CSS in `src/styles.css` with the design tokens at the top. BEM-like class names.

## Open items / later

- Live mode depends on OpenF1 real-time access (ADR 0002).
- Parked by the owner for later: sharing predictions between friends' devices (needs a small backend),
  weekend total (sprint + race), season standings.
