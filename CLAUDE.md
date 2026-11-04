# Spore & Sprawl: project notes for Claude

A round-based lane auto-battler roguelite in the browser (TypeScript, Vite, Canvas). The design and
milestones live in `SPEC.md`, which is v2 since 2026-10-31: read its §0.1 (what changed) and §1.3 (the
decisions) before design work. Since R2b the code and the data hold only v2's battle in rounds: S3 deleted v1's
battle and S12 its last data keys. This file holds only what every
session needs. Rules that matter in only some files live in `.claude/rules/` and load when Claude opens
one of those files (see the end).

## How we work

- **Start from `develop`.** New desktop-app sessions are often cut from `main`, which lags `develop`. For feature work, `git fetch` and then `git switch --no-track -c feature/<name> origin/develop`.
- **One session per milestone or phase**, each in its own worktree from `develop`, ending in a PR into `develop`.
- **Review before building.** Playtest notes, reviews and ideas get discussed with the user before anything is built from them.
- **Balance and rules:** diagnose, measure and recommend. A rule change or a retune across several units waits for the user's OK (`.claude/rules/balance.md`).
- **Tests follow the spec.** When SPEC retires a system, its tests, goldens and guardrails are retired or rewritten with it. They don't hold the new design to the old rules.
- **Where things get written down:**
  - where things stand, what waits on the user and what's next: `docs/status.md`. Read it first, and update it when work lands or the user decides something
  - adopted rules and the milestones: `SPEC.md`, updated when a change is adopted
  - a milestone's plan, stand-ins and "As built" results: `docs/<milestone>-plan.md`, such as `docs/r1-plan.md`. A plan has: Goal, Scope, Stand-ins, Steps, Verification, Open questions for the user, and, once built, As built
  - a milestone's task list, in spec-kit's format, with one session per row of its Sessions table: `docs/tasks/<milestone>.md`. The decisions each milestone needs from the user are in `docs/tasks/clarify.md`, and the review of SPEC v2 in `docs/tasks/spec-analysis.md`. `docs/tasks/README.md` says how a session picks up its tasks, and the skills `/implement`, `/clarify` and `/tasks` run its procedures. Tick a task in the same commit as its work
  - balance candidates and prototype results: `docs/balance-backlog.md` (v2's); data changes: `data/CHANGELOG-balance.md`
  - human playtest notes: `docs/playtest-feedback.md`, newest first
  - ideas that aren't adopted, written against v2: `docs/ideas/`
  - research on other games: `docs/research/`
  - v1-era notes: `docs/archive/v1/`. It's history and evidence. Don't take rules, numbers, plans or proposals from it as current, or use it as design input, unless the user or a SPEC v2 section points you to a named part of it. Read that part as background; SPEC v2 wins wherever they differ
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
- **Pushing and merging** (agreed with the user on 2026-11-02):
  - A session pushes its own `feature/…` or `docs/…` branch and opens its PR into `develop` when its work is done, without asking.
  - It then turns on auto-merge with `gh pr merge --auto --merge`, so the PR merges itself once CI's `test-and-build` passes.
  - The exception is a PR that changes `src/sim/`, `src/data/` or `tools/lib/`: it waits for a review (the hub's, when a hub runs the sessions, or the user's), and the reviewer turns auto-merge on.
  - Never push to `main` or `develop` directly, never force-push, and never touch `main` unless the user asks for a release or a hotfix.
- **Prototypes:** no new named presets (the user, 2026-11-03). A candidate rule is either a data change, measured with the `--proto path:value` override (no code needed; `?proto=` takes the same spec in the browser), or code on a short-lived branch, measured there and then merged into `develop` as the default with the user's OK, or deleted. New rules get playtested on the dev site, not behind `?proto=` knobs on `main`. Any temporary switch names the session that removes it. No preset is left: R2b's S14 deleted `bosslives`, the last one (2026-11-04).
- **v2's milestones replace the v1 battle** (SPEC §16): each lands on `develop` as the new default, not as another knob on v1, and retires what it replaces. `main` keeps the v1 game until the user asks for a release.

## Dev-site builds

`npm run build:dev` (`--mode develop`, see `src/app/channel.ts`) titles the page "Spore & Sprawl (dev)" with `noindex`, shows a `DEV BUILD · <sha>` tag and saves under `dev/`-prefixed keys. The `dev-site` launch config serves it locally on port 5174.

Every battle is the battle in rounds since R2b's S2: `/?scene=battle` opens a single battle with SPEC §15.6's parameters (`round=`, `phase=`, `ticks=` within a clash), and a run's battles open the same scene. `/?scene=rounds` and `/?scene=deploy` say they aren't part of the game.

Both sites share the swalliso.github.io origin, so every localStorage key goes through `storageKey()`, and the game's keys must never change (`.claude/rules/storage.md` lists them).

## Checks

- `npm run verify` is the gate (SPEC §15.1): typecheck, lint, data validation, unit tests, golden replays, sim smoke and a quick bench.
- One test file: `npx vitest run tests/unit/<name>.test.ts`.
- `npm run test:browser` and `npm run test:slow` run separately. `test:slow` asserts the round guardrails (SPEC §12.3). Ten known misses are expected fails through R2b (T168): R2a's six (T133: G1, G2, G3, G7, G8's mono clause and G16), G4's round-9 clause and G5 since S5b's upgrades, and G14 and G15, which Cordis's runs keep outside their bands after S12's retune. S14 tunes G1, G2, G7, G4's round-9 clause and G5 and reworks Cordis for G14 and G15 (T169), R3's copies take G3 and G8's mono clause, and R3's combos take G16's pairs. Keep the rest passing. With `?debug=1` or `?test=1` the page exposes `window.__GAME__` (`src/app/debugBridge.ts`) for scripted browser checks.
- Any change to the sim's rules or data changes the golden hashes. Refresh them with `npm run golden -- update`, and log data changes in `data/CHANGELOG-balance.md`.

## Topic rules (`.claude/rules/`)

| File | Loads with | Covers |
| --- | --- | --- |
| `balance.md` | `data/`, `src/data/`, the balance, experiment and golden tools, `tools/lib/`, `tests/slow/`, `tests/golden/`, `docs/balance-backlog.md` | the approval rule, prototypes, changelog entries, goldens, guardrails, sweeps |
| `storage.md` | `src/app/channel.ts`, `settings.ts`, `run.ts`, `tips.ts`, `src/run/storage.ts`, `resume.ts`, `runState.ts`, `flow.ts`, `src/meta/` | the storage keys, `storageKey()`, the `Storage` interface, the profile |
| `v1-code.md` | `src/`, `tests/`, `tools/` | the code runs v2's battle in rounds: don't rebuild retired systems, what v1 left on purpose, and new work follows SPEC v2 |
