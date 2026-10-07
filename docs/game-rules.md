# Game rules

> ⚠️ **To be completed.** The official rules document has not been added yet.
> Until then the app uses the placeholder points below. When the rules arrive, update this
> file, `src/domain/scoring.ts` and `src/domain/scoring.test.ts`.

## What every player predicts (after qualifying)

- The **top 10** of the race (P1 … P10)
- Who finishes **last**
- Who sets the **fastest lap**
- Who **drops out** of the race (DNF)

## Points (placeholder)

| Prediction                                 | Points |
| ------------------------------------------ | ------ |
| Top-10 driver at exactly the predicted spot | 3      |
| Top-10 driver in the top 10, other spot     | 1      |
| Last place correct                          | 3      |
| Fastest lap correct                         | 3      |
| Drop-out correct                            | 3      |

## Interpretations (to confirm with the rules)

- **"Last"** = last driver still running (live) / last classified finisher (after the race).
  Drivers who dropped out are *not* "last".
- **"Drops out"** = DNF or did not start. A disqualification (DSQ) is not a drop-out.
- After the chequered flag the **official result** (incl. penalties) is used when available.
- One driver per drop-out prediction.

## Season ranking

Per race every player gets a score; the season ranking is the sum over all races.
(Not in the app yet — see the roadmap ideas in ADR 0001.)
