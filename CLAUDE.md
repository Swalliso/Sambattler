# Spore & Sprawl: project notes for Claude

A lane tug-of-war auto-battler roguelite in the browser (TypeScript, Vite, Canvas). The design and
milestones live in `SPEC.md`. This file holds only what every session needs. Rules that matter in
only some files live in `.claude/rules/` and load when Claude opens one of those files (see the end).

## How we work

- **Start from `develop`.** New desktop-app sessions are often cut from `main`, which lags `develop`. For feature work, `git fetch` and then `git switch --no-track -c feature/<name> origin/develop`.
- **One session per milestone or phase**, each in its own worktree from `develop`, ending in a PR into `develop`.
- **Review before building.** Playtest notes, reviews and ideas get discussed with the user before anything is built from them.
- **Balance and rules:** diagnose, measure and recommend. A rule change or a retune across several units waits for the user's OK (`.claude/rules/balance.md`).
- **Where things get written down:**
  - where things stand, what waits on the user and what's next: `docs/status.md`. Read it first, and update it when work lands or the user decides something
  - adopted rules and the milestones: `SPEC.md`, updated when a change is adopted
  - a milestone's plan, stand-ins and "As built" results: `docs/mN-plan.md`
  - balance candidates and prototype results: `docs/balance-backlog.md`; data changes: `data/CHANGELOG-balance.md`
  - human playtest notes: `docs/playtest-feedback.md`, newest first
  - ideas that aren't adopted: `docs/ideas/`
  - decisions go in the repo rather than in Claude's memory, so every session (and Codex) sees them. Details that matter only in some files go in `.claude/rules/`, not here.

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

`npm run build:dev` (`--mode develop`, see `src/app/channel.ts`) titles the page "Spore & Sprawl (dev)" with `noindex`, shows a `DEV BUILD · <sha>` tag and saves under `dev/`-prefixed keys. The `dev-site` launch config serves it locally on port 5174.

Both sites share the swalliso.github.io origin, so every localStorage key goes through `storageKey()`, and the game's keys must never change (`.claude/rules/storage.md` lists them).

## Checks

- `npm run verify` is the gate (SPEC §15.1): typecheck, lint, data validation, unit tests, golden replays, sim smoke and a quick bench.
- One test file: `npx vitest run tests/unit/<name>.test.ts`.
- `npm run test:browser` and `npm run test:slow` (the balance guardrails) run separately. With `?debug=1` or `?test=1` the page exposes `window.__GAME__` (`src/app/debugBridge.ts`) for scripted browser checks.
- Any change to the sim's rules or data changes the golden hashes. Refresh them with `npm run golden -- update`, and log data changes in `data/CHANGELOG-balance.md`.

## Topic rules (`.claude/rules/`)

| File | Loads with | Covers |
| --- | --- | --- |
| `balance.md` | `data/`, `src/data/`, the balance, experiment and golden tools, `tests/slow/`, `tests/golden/` | the approval rule, prototypes, changelog entries, goldens, guardrails, sweeps |
| `storage.md` | `src/app/channel.ts`, `settings.ts`, `run.ts`, `tips.ts`, `src/run/storage.ts`, `resume.ts` | the storage keys, `storageKey()`, the `Storage` interface |
