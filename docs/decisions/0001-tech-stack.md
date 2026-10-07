# 0001 – Tech stack

- **Status:** accepted
- **Date:** 2026-10-07

## Context

First app, built by one person, to be extended over time. It has to be simple to understand,
nice looking, testable, and easy to put on GitHub. It mostly shows data in the browser.

## Decision

| Concern     | Choice                                    | Why                                                                                  |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| UI          | **React 19**                              | Most widely used UI library: the most tutorials, examples and help when you're stuck. |
| Language    | **TypeScript** (strict)                   | Catches mistakes early, and editors can autocomplete the F1 data shapes.              |
| Build / dev | **Vite**                                  | Fast dev server, almost no configuration.                                             |
| Tests       | **Vitest** + **Testing Library**          | Works with Vite out of the box. Testing Library tests the UI the way a user uses it.  |
| Lint        | **oxlint** (Vite template default)        | Fast, no configuration needed.                                                        |
| Styling     | **Plain CSS** with design tokens          | Nothing new to learn. Can move to Tailwind or CSS modules later if it grows.          |
| Storage     | **localStorage**                          | No server or account needed for v1.                                                   |
| CI          | **GitHub Actions**                        | Lint, tests and build on every push.                                                  |

Single-page app, **no backend**: the browser talks directly to the OpenF1 API.

## Alternatives considered

- **Next.js / SvelteKit**: more powerful (server rendering, API routes), but more concepts to learn.
  Worth revisiting when we need a server, e.g. shared predictions.
- **Svelte / Vue**: arguably simpler syntax, but a smaller ecosystem than React.
- **Python (Streamlit / FastF1)**: great for data, but weaker for a polished, live-updating UI.

## Consequences

- Predictions are stored **per device**. Friends can't see each other's predictions unless they
  enter them on the same device. Natural next step: a small shared backend
  (e.g. Supabase or Firebase) for predictions + season standings.
- The game logic is pure TypeScript (`src/domain`), so moving to another framework later
  would only mean rewriting the UI layer.

## Ideas for later

Shared predictions between devices, season ranking, an official rules engine,
push notifications on score changes, PWA install on phones.
