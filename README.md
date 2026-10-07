# 🏁 Pit Wall Predictor

Live score tracker for our Formula 1 prediction game with friends.
During a race it shows **how many points each player would have if the race stopped right now**,
and **why** the score changes (which predictions are right, partly right or wrong).

![status](https://img.shields.io/badge/status-v0.1-red)

## What it does

1. **Pick a race**: any Grand Prix from 2023 onwards (data from [OpenF1](https://openf1.org)),
   or the built-in **Demo Grand Prix** that works offline.
2. **Fill in predictions** for one or more players: top 10, last place, fastest lap and
   who drops out. A "fill with starting grid" shortcut helps for quick testing.
3. **Replay the race** in fast-forward (the whole race in 1, 3, 5 or 10 minutes) and watch:
   - the running order, with your predicted positions marked ✓ / ≈ / ✗,
   - the standings between players "if the race stopped now",
   - each prediction's points and the reason,
   - a chart of your points during the race and a feed of every score change.
4. **Follow live** (experimental): during a race weekend, refresh real data every 30 s.
   See [ADR 0002](docs/decisions/0002-f1-data-source.md) for the limits.

> ⚠️ The scoring uses **placeholder points** until the official rules are added — see
> [docs/game-rules.md](docs/game-rules.md).

## Getting started

Requirements: [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install      # once
npm run dev      # start the app at http://localhost:5173
```

## Scripts

| Command              | What it does                                 |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Development server with hot reload           |
| `npm test`           | Run all tests once                           |
| `npm run test:watch` | Re-run tests on every change                 |
| `npm run lint`       | Lint the code (oxlint)                       |
| `npm run typecheck`  | TypeScript type check                        |
| `npm run check`      | Lint + typecheck + tests (run before commit) |
| `npm run build`      | Production build in `dist/`                  |

GitHub Actions runs lint, tests and build on every push (`.github/workflows/ci.yml`).

## Project structure

```
src/
  domain/        Pure game logic, no React, no network — easy to test
    types.ts       Driver, RaceTimeline, RaceSnapshot, Prediction
    snapshot.ts    State of the race at any moment ("if it stopped now")
    scoring.ts     The game rules → points per prediction   ← change rules here
    changes.ts     Which predictions gained/lost points
    history.ts     Score over the whole race (feed + chart)
  data/          Getting data in and out
    openf1.ts      OpenF1 API client + mapping to a RaceTimeline
    demoRace.ts    Generated offline demo race
    races.ts       Race list helpers (demo vs. OpenF1, live window)
    predictionsStore.ts  Predictions saved in the browser (localStorage)
  simulation/    Fast-forward replay clock (pure functions + React hook)
  components/    React UI
  App.tsx        Page layout and state
docs/
  decisions/     Architecture Decision Records (why we chose what)
  game-rules.md  The rules of our game
```

Tests live next to the code they test (`*.test.ts(x)`).

## Decisions

All important choices are documented in [docs/decisions](docs/decisions/):

- [0001 – Tech stack](docs/decisions/0001-tech-stack.md)
- [0002 – F1 data source](docs/decisions/0002-f1-data-source.md)
- [0003 – Scoring rules](docs/decisions/0003-scoring-rules.md)
- [0004 – Race replay & "if the race stopped now"](docs/decisions/0004-replay-and-snapshots.md)

---

Not affiliated with Formula 1. F1 data © its respective owners, via OpenF1.
