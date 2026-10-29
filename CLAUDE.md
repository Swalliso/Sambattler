# Spore & Sprawl: project notes for Claude

A lane tug-of-war auto-battler roguelite in the browser (TypeScript, Vite, Canvas). The design and
milestones live in `SPEC.md`. Balance work is tracked in `docs/balance-backlog.md` and
`data/CHANGELOG-balance.md`, and playtest notes in `docs/playtest-feedback.md`.

## Branches and deployment

Repo: github.com/Swalliso/Sambattler.

| Branch | Role | Deploys to |
| --- | --- | --- |
| `main` | The game. Changes only through a release PR from `develop`, or a hotfix | https://swalliso.github.io/Sambattler/ |
| `develop` | Integration. Finished features are merged here by PR and playtested on the dev site | https://swalliso.github.io/Sambattler/dev/ |
| `feature/…` | One per feature, milestone or experiment, made from `develop` | nothing (`ci.yml` checks and builds it) |
| `hotfix/…` | Urgent fix to the game, made from `main`. PR into `main`, then merge `main` into `develop` | via `main` |

- **Deploys:** every push to `main` or `develop` runs `.github/workflows/deploy.yml`. It verifies and builds both branches (`develop` with `npm run build:dev`) and publishes them as one Pages site, so pushing either branch publishes.
- **CI:** `ci.yml` (job `test-and-build`) runs `npm run verify`, the browser tests and both builds on every PR, and on pushes to feature and hotfix branches.
- **Only push, open PRs or merge when the user asks.** Never touch `main` unless the user asks for a release or a hotfix.
- **Prototypes:** new rules and experiments go to `develop` and get playtested on the dev site, rather than shipping behind `?proto=` knobs on `main`. `?proto=` stays available for headless measurement (`npm run experiment -- --proto …`).

## Dev-site builds

`npm run build:dev` (`--mode develop`, see `src/app/channel.ts`) changes three things:
- it titles the page "Spore & Sprawl (dev)" and adds `noindex`
- it shows a `DEV BUILD · <sha>` tag
- it saves under `dev/`-prefixed localStorage keys

Both sites share the swalliso.github.io origin, so every localStorage key must go through `storageKey()`. The game's keys (`spore-sprawl.run.v1`, `spore-sprawl.battle.v1`, `spore-sprawl/settings/v1`) must never change.

## Checks

- `npm run verify` is the gate (SPEC §15.1): typecheck, lint, data validation, unit tests, golden replays, sim smoke and a quick bench.
- `npm run test:browser` and `npm run test:slow` (the balance guardrails) run separately.
- Any change to the sim's rules or data changes the golden hashes. Refresh them with `npm run golden -- update`, and log data changes in `data/CHANGELOG-balance.md`.
