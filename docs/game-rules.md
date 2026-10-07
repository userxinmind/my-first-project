# Game rules — "De Karre" 2026

Source: [F1_regelement_2026.pdf](F1_regelement_2026.pdf) (official, in Dutch, dated 7 March 2026).
This is an English summary plus how the app applies each rule. The code is in
`src/domain/scoring.ts`; in case of doubt the PDF (and the board, "het bestuur") decides.

## Grand Prix (Sunday race)

| # | Prediction | Points | How the app applies it |
| - | ---------- | ------ | ---------------------- |
| 1 | **Top 10** (P1 … P10) | 15 – 12 – 10 – 8 – 7 – 5 – 5 – 5 – 5 – 5 | Only for the right driver at **exactly** that position. |
| 2 | **Joker** | the joker's **starting position** | Must start **P11 or lower** (the grid right after qualifying, including grid penalties announced before). If he finishes in the top 10 you get his starting position: started P11 → 11 points, P12 → 12, etc. |
| 3 | **Last finisher** | 5 | Last **classified** finisher. A dropout does **not** count as last. |
| 4 | **Dropout** (uitvaller) | 5 | Any driver who drops out — he **must have started** (a DNS doesn't count). |
| 5 | **Fastest lap** | 5 | Driver with the fastest lap time of the race. |
| 6 | **Bonus** | 10 | Last finisher, dropout **and** fastest lap all three right. |

## Sprint

| # | Prediction | Points |
| - | ---------- | ------ |
| 7 | **Top 3 of the sprint** | 8 – 7 – 5 (exact position) |

The result right after the sprint is binding. Sprint points are added to Sunday's race
(and count for the Bierbonus). In the app a sprint is a separate session with its own prediction;
adding sprint + race together per weekend is a later feature.

## Bierbonus 🍺

Points of the day ÷ 4, rounded down = beers. Example: 105 points = 26 beers.

## Not in the app (organisation rules)

- Predictions must be handed in at least 1 hour before the start (fastest lap only counts then).
- No list handed in → the qualifying result counts, except for P1, joker, no. 15, dropout and fastest lap.
- Prize pot: €5 per race (€4 paid out that day: 50% / 30% / 20%; €1 to the season pot,
  paid out to the top 10 of the season: 25, 18, 15, 12, 10, 8, 6, 4, 2 and 1%).
- Final result according to the FIA, up to the last finisher.

## Live scoring

During the race the app shows the score **as if the race stopped at that moment**:
current running order, fastest lap so far, drivers out so far, and the last driver still running.
After the finish the official classification is used (when available from OpenF1).
