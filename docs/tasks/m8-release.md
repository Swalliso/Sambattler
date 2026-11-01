# M8 — Release candidate: tasks

M8 turns `develop` into the first release:
- a render pass on the biggest clash;
- the settings screen and the light juice (spore puffs and an optional shake), both built early (§10.5), checked against v2;
- a Firefox determinism check;
- the final balance tournament and tuning;
- a README that teaches rounds;
- the release build on GitHub Pages.

SPEC §16 M8 has no Goal line, so this is its scope.

This list is a draft of 2026-11-01, made from SPEC v2 and `docs/tasks/spec-analysis.md` before M7 lands and before `docs/m8-plan.md` exists. **Refine with the tasks step when the plan is agreed.** It's coarse: the plan comes first, and much of M8 measures what R1–M7 built. Task IDs run in execution order, except T028 and T029, which were added later and sit where they run.

**Status:** Draft, not agreed · **Spec:** SPEC §16 "Milestone 8 — Release candidate" and the sections it cites · **Plan:** `docs/m8-plan.md` (written in S0) · **Gate in:** M7 merged into `develop`; R2b's playtest has re-set the run-length target (X6, R2b/T149) · **Gate out:** the user asks for the release, the release PR from `develop` into `main` merges, and the live site loads (T027)

## Read first

- SPEC §8.2 (run length), §10.4 (puffs and the shake), §10.5 (the settings screen as built), §12 (all of it), §13.3 (determinism rules), §13.6, §13.7, §13.8 (deployment), §15.1, §15.4, §15.6 (`measure`, `--browser`, `--filter`), §16 M8, §17 (what the first release leaves out).
- Code:
  - `src/app/loop.ts` (`GameLoop`), `src/app/debugBridge.ts`, `src/app/urlParams.ts`, `src/app/battleView.ts` (`shakeOn` is private), `src/app/main.ts` (the title's `Milestone` label), `src/app/content.ts` (the data is bundled into the JS);
  - `src/render/renderer.ts`, `src/render/effects.ts` (death and spawn puffs, in the effects ring), `src/render/spores.ts`, `src/ui/settingsScreen.ts`;
  - `tools/screenshot.ts`, `tools/bench.ts`, `tools/lib/bench.ts` (R2a/T114's round bench, moved there by R2b/T050), `data/scenarios/` (R2a's scenarios, moved there by R2b/T048), `tools/balance.ts`, `vite.config.ts` (`reportCompressedSize`);
  - `.github/workflows/deploy.yml`, `.github/workflows/ci.yml` (Chromium only), `src/sim/create.ts` (`MILESTONE`), `src/data/proto.ts` (the `?proto=` presets left), `index.html`, `tests/slow/`, `data/balance-targets.json`.
- Docs: `docs/tasks/clarify.md` (X6, X7, X8, X9, #35, #16), `docs/tasks/m7-gray-rot-and-content.md`, `docs/tasks/r1-clash-check.md` (R1/T039), `docs/tasks/r2a-battle-in-rounds.md` (R2a/T114, R2a/T128), `docs/tasks/r2b-run-in-rounds.md` (R2b/T048, R2b/T050, R2b/T109, R2b/T149), `docs/balance-backlog.md`, `.claude/rules/balance.md`, CLAUDE.md's "Branches and deployment".

## Before you start

**Decisions:**
- X6 (R2a S0, re-set after R2b's gate in R2b/T149; blocks T024): how step 6's 25–35 minutes reads. If it stays binding and a run measures longer, the levers go in X6's order: rounds per battle (X5), then the route's length, whose shape is data (§8.2).
- #35 (R2a S0, R2b S0): the bands every guardrail asserts at T016 and T019, G15's upper bound on boss reach included (with #16).
- X7 (R2a S0): the answer bot, which T013 reports beside fixed weights.
- X8 (R2a S0): the general between counter cycles, and its two default-off knobs, which T014 decides on.
- X9 (R3 S0): the release ships 9 packs and no flyers. The README and §17 say so.
- No M8 row exists: clarify says M8 raises no new question. S0 settles only the plan: the tuning scope, the README's outline, the release checklist, and whether a Firefox job and the bundle check join CI.
- **The release to `main` happens only when the user asks** (CLAUDE.md). Nothing in this list pushes to `main` on its own.

**Results this needs:**
- M7 merged, with every guardrail in round form in `npm run test:slow` (from R2a, R2b, R3, M6 and M7).
- R2a/T114's round bench and `bench-300`, at `data/scenarios/bench-300.json` since R2b/T048 (A119), and R2a/T114's full-colony round case (R1/T039's clash on the round loop), in `tools/lib/bench.ts` since R2b/T050 (A200). R1/T039's `runClashBench` ran on v1's sim and is gone by M8.
- R2a/T128's play-time store (`src/app/playTime.ts`), shown on the summary by R2b/T109 and given a run total by records-2 (RB/T016, `docs/tasks/run-it-back.md`); R2b's playtest readings of run length and X6's re-set target (R2b/T149).

**Findings:** no high or medium finding is M8's own. M8 reads these:
- A119 (medium, R2): `bench-300` can't measure 300 live units as a clash. R2a/T114 defines the v2 bench case, and T005 and T021 measure frames on it.
- A200 (medium, R1): a full colony exceeds the budget's first guess. R1/T039 builds the case, in round form since R2a/T114; T028 makes it a browser scenario, and T005 measures that clash.
- A193 (high) and A208 (medium), X5: the scoring curve sets the rounds per battle, and so the run's length. X5 decides it; T024 reads the result.
- A199 (medium, R2): lives rarely bind, and G15 needs an upper bound on boss reach. #16 and #35 (R2b) set it; T016 asserts it.
- A197 (medium, R2): a boss win by Decision may pay half. X5 and R2-Q14 decide it; T013 reports the boss's Rout and Decision shares.
- Lows: A187 (`measure=frames` isn't built): T003. A203 (run length): T024.

## Technical context

**Frame-time measurement** (§13.7, §15.6, A187):
- `measure=frames` is parsed in `src/app/urlParams.ts`.
- `GameLoop` (`src/app/loop.ts`) times each frame's draw into a fixed ring buffer in `src/app/frameStats.ts` (new), with no allocation per frame (§13.7).
- The bridge (`src/app/debugBridge.ts`) adds `frames(): { n, p50, p95, max }`.
- With `measure=frames` in its params, `tools/screenshot.ts` lets the clash run a fixed number of frames, prints p95, and fails above 8 ms.

**Scenarios:** two, both in `data/scenarios/`. R2b/T048 moved R2a's scenarios there and deleted the registry's `scenarios/rounds/` branch, so no `rounds` folder is left (check R2b's As built):
- `bench-300`: R2a/T114's clash form, at `data/scenarios/bench-300.json` since R2b/T048.
- `full-colony`: written in T028 from R2a/T114's full-colony case, since it is a bench function, not a scenario a browser can load.

**Firefox:**
- `tools/screenshot.ts --browser firefox` exists.
- Playwright's Firefox has to be installed once (`npx playwright install firefox`). That's a download, so T029 asks the user first.
- CI installs only Chromium. A Firefox job is S0's call.

**Bundle size:**
- `vite.config.ts` prints each chunk's gzipped size, and the data ships inside the JS (`import.meta.glob` in `src/app/content.ts`), so the budget is a sum.
- `tools/bundle-size.ts` (new) sums the gzipped size of `dist/`'s JS, CSS and JSON, and fails above 300 KB.

**Juice in v2:**
- The arrival is the muster (§5.6), so spawn puffs fire on the muster's first tick.
- Heartcap hits come in the aftermath (§6.7), so the shake fires there: only with its setting on, never under reduced motion, and never under `?test=1`.
- R2's battle views may already do this; M8 checks it.
- A browser test can't see the shake (`shakeOn` is private) or the puffs (the effects ring), so T012 adds `juice(): { shakes: number; puffs: { spawn: number; death: number } }` to the debug bridge, counted in `BattleView` and `src/render/effects.ts`. Its positive cases run with `debug=1`, since `test=1` turns the shake off.

**The label:**
- `MILESTONE` in `src/sim/create.ts` goes to 8, and the title's label follows (`src/app/main.ts`).
- Raising it changes which content `milestone` admits. No content is tagged 8, so no golden should move; if one does, refresh it and say why.

**Tuning** follows §12.4 and `.claude/rules/balance.md`:
- a rule change, or a retune across several units, waits for the user's OK (T014);
- every data change is logged;
- moved goldens are refreshed and named in the commit;
- Gray Rot units copy their mirror's stats at load (M7/T006), so a retune edits the Velvet Bloom record only.

## Stories

| ID | Priority | Story | Independent test |
|---|---|---|---|
| US1 | P1 | The biggest clash renders within the frame budget | `npm run screenshot -- --name m8-perf --params "scenario=bench-300&test=1&measure=frames"` reports p95 ≤ 8 ms, and so does `--name m8-perf-full` on `scenario=full-colony` |
| US2 | P2 | A battle gives the same hash in Firefox as in Node and Chromium | The `m8-ff` screenshots' hash assertions pass |
| US3 | P3 | The settings and the juice hold for v2 | Browser: the shake fires only with its setting on and never under reduced motion; puffs appear at the muster |
| US4 | P4 | The final balance: every guardrail asserts green, with any retune the user approved | `npm run test:slow`, all green |
| US5 | P5 | A README teaches rounds and links both sites | Claude reads it, and every link resolves |
| US6 | P6 | The release candidate is labeled and its link previews are current | The title shows the release label; `npm run og-image` matches the title |

## Phase 1: Setup

- [ ] T001 [USER] Write `docs/m8-plan.md` (new) in CLAUDE.md's format, and agree it with the user (§16 M8, §12.4, §13.8) ⛔ X6
  - The tuning scope.
  - The README's outline.
  - The release checklist.
  - How step 6 reads under X6.
  - Whether a Firefox CI job and the bundle check join CI.

## Phase 2: Foundational (blocks every story)

- [ ] T002 [P] Write `tests/unit/frameStats.test.ts` (new): known samples give their p50, p95 and max; the buffer wraps without growing; an empty buffer reports `n: 0` (§13.7)
- [ ] T003 Build frame measurement in `src/app/frameStats.ts` (new), `src/app/loop.ts`, `src/app/debugBridge.ts`, `src/app/urlParams.ts` (`measure=frames`) and `tools/screenshot.ts` (prints p95, fails above 8 ms) (§13.7, §15.6)
- [ ] T004 [P] Write `tools/bundle-size.ts` (new) and a `size` script in `package.json`: it sums the gzipped JS, CSS and JSON in `dist/` and exits 1 above 300 KB (§13.7, §16 M8 step 2)
- [ ] T028 [P] Write `data/scenarios/full-colony.json` (new), in the round format of `ScenarioSchema` (R2b/T048), from R2a/T114's full-colony case: both colonies at the most plots §4.6 allows, with the biggest squads, opening in round 1's clash, so `npm run screenshot -- --name m8-perf-full --params "scenario=full-colony&test=1&measure=frames"` loads it (§13.7, §15.4)

**Checkpoint:** `npx vitest run tests/unit/frameStats.test.ts` passes; `npm run validate:data` loads `full-colony`; `npm run build && npm run size` prints the total.

## Phase 3: US1 — The biggest clash renders within budget (P1)

**Goal:** a clash of two full colonies draws in ≤ 8 ms a frame at p95. **Independent test:** T005's two measurements.

- [ ] T005 [US1] Measure the baseline with `tools/screenshot.ts`, and record p50 and p95 in `docs/m8-plan.md` (§13.7, §16 M8 step 3)
  - `--name m8-perf --params "scenario=bench-300&test=1&measure=frames"`.
  - `--name m8-perf-full --params "scenario=full-colony&test=1&measure=frames"` (T028).
- [ ] T006 [US1] Make the render pass on the full-colony clash in `src/render/renderer.ts`, `src/render/effects.ts` and `src/render/spores.ts`, with §13.6's and §13.7's techniques, until both T005 measurements read p95 ≤ 8 ms (§13.6, §13.7)
  - Pre-rendered terrain.
  - Atlas `drawImage` calls.
  - HP bars only for damaged units.
  - A formation preview recomputed only on change.
  - No allocation in hot loops.
- [ ] T007 [US1] Run `npm run bench` (`tools/bench.ts`): every §13.7 budget passes (G11) (§13.7, §15.4)

**Checkpoint:** T005's two commands report p95 ≤ 8 ms, and `npm run bench` passes.

## Phase 4: US2 — Firefox determinism (P2)

**Goal:** Firefox, Chromium and Node agree on every hash. **Independent test:** T008's hash assertions.

- [ ] T029 [US2] [USER] The user agrees to installing Playwright's Firefox (`npx playwright install firefox`, with its download size stated when asking). Stop here until they say yes; on a yes, the session runs the install (§13.3, §15.6)
- [ ] T008 [US2] Run three Firefox checks with `tools/screenshot.ts --browser firefox`, after T029's install. Each hash must equal Node's and Chromium's (§13.3, §15.6, §17 #4)
  - `--name m8-ff --params "scene=battle&seed=1&player=bot:balanced&enemy=general:scripted&round=4&phase=clash&ticks=200&paused=1"` (§16 R2 step 9's `r2-clash` params).
  - `--name m8-ff-summary --params "scene=summary&seed=7&autoplay=run&test=1"`.
  - `--name m8-ff-hollows --params "scene=battle&map=three-hollows&seed=1&player=bot:balanced&enemy=general:scripted&round=4&phase=clash&ticks=200&paused=1"`.
- [ ] T009 [US2] If a hash differs, find the engine-dependent call in `src/sim` (§13.3 rule 3), fix it, and add its pattern to `BANNED_TEXT` in `tests/unit/purity.test.ts`. Refresh any golden the fix moves, and say so (§13.3, §15.5)
- [ ] T010 [US2] If S0 chose it, add a Firefox job to `.github/workflows/ci.yml` that runs T008's three checks (§13.8)

**Checkpoint:** T008's three screenshots pass their hash assertions in Firefox.

## Phase 5: US3 — Settings and juice for v2 (P3)

**Goal:** the settings and the juice built early still fit v2's battle. **Independent test:** T011's browser cases.

- [ ] T011 [US3] Write `tests/browser/juice.test.ts` (new) and extend `tests/browser/settings.test.ts` (§10.4, §10.5)
  - Juice, asserting on `__GAME__.juice()` (T012), with `debug=1` for the positive cases:
    - after the muster's first tick, `puffs.spawn` is above 0;
    - after a scored aftermath that hits a Heartcap, `shakes` rose by 1 with the shake setting on, and by 0 with it off or under `prefers-reduced-motion`;
    - under `?test=1`, `shakes` stays 0;
    - after a clash with deaths, `puffs.death` is above 0.
  - Settings: the sheet holds v2's settings (no spawn-timers setting) and M6's Export, Import and Reset, and it fits 1280×720.
- [ ] T012 [US3] Make T011 pass in `src/app/debugBridge.ts`, `src/app/battleView.ts`, `src/render/effects.ts` and `src/ui/settingsScreen.ts` (§10.4, §10.5)
  - Add `juice(): { shakes: number; puffs: { spawn: number; death: number } }` to the bridge, counted in `BattleView` (where `shakeOn` fires) and in the effects ring.
  - Move spawn puffs to the muster's first tick, if R2's views didn't.
  - Fire the shake on aftermath Heartcap damage only when the setting is on and motion isn't reduced, never under `?test=1`.
  - Remove any v1-only setting T011 finds, and fit the sheet.

**Checkpoint:** `npx vitest run tests/browser/juice.test.ts tests/browser/settings.test.ts` passes.

## Phase 6: US4 — The final tournament and tuning (P4)

**Goal:** every guardrail asserts green, and every number the user cares about is one they agreed. **Independent test:** T016's run.

- [ ] T013 [US4] Run the final measurements with `tools/balance.ts`, and write every miss with its numbers into `docs/balance-backlog.md`, with candidate fixes (§12.2, §12.3, §12.4)
  - `npm run balance -- tournament --maps all --seeds 40`.
  - `npm run balance -- tournament --commanders all`.
  - `npm run test:slow`.
  - Report G8, G14 and G15 under fixed weights and under the answer bot (X7).
  - Report the boss battles' Rout and Decision shares, and what a Decision win pays (A197, R2-Q14).
- [ ] T014 [US4] [USER] The user approves the retune list from `docs/balance-backlog.md`: every rule change and every retune across several units (§12.4)
  - The user also decides whether X8's two default-off knobs and any presets left in `src/data/proto.ts` stay for the release.
- [ ] T015 [US4] Apply the approved changes in `data/balance.json` and `data/factions/velvet-bloom/units.json`, or the files the list names (Gray Rot units follow their mirrors, M7/T006). Log each in `data/CHANGELOG-balance.md`, run `npm run golden -- update` and name the reason in the commit (§12.4, §15.5)
- [ ] T016 [US4] Make every guardrail assert against `data/balance-targets.json`'s bands: none reports only, and none is skipped (§12.3, §16 M8 step 1)
  - G1–G10 and G12–G16 in `tests/slow/`.
  - G11 through `npm run bench` (T007).
  - G15 with its upper bound on boss reach (#16, #35, A199).

**Checkpoint:** `npm run test:slow` and `npm run bench` pass with every guardrail asserting.

## Phase 7: US5 — The README (P5)

**Goal:** a reader learns how to play rounds and where to play. **Independent test:** T017's read-through.

- [ ] T017 [US5] Write `README.md` (new) for players: what the game is; a round's three phases; the general planning first; lives; the kit and its copies; the colony as the formation; the keys (§10.3); links to the game and the dev site; how to run it locally (§15.1); what the first release leaves out (§17, X9). Claude reads it and checks that every link resolves (§16 M8, §10.3, §13.8)

## Phase 8: US6 — The release candidate's label and previews (P6)

**Goal:** the build says what it is. **Independent test:** the title's label, and the link preview.

- [ ] T018 [US6] Label the release in `src/sim/create.ts`, `src/app/main.ts` and `index.html` (§13.8, §16 M8)
  - Raise `MILESTONE` to 8 in `src/sim/create.ts`, and set the title's label in `src/app/main.ts` as S0 decided.
  - Check that `index.html`'s descriptions describe the round game.
  - Run `npm run og-image` (`tools/og-image.ts`) if the title's art changed.
  - Run `npm run golden -- verify`; if a golden moved, refresh it and say why.

## Phase 9: Polish and verification

- [ ] T019 §16 M8 step 1: `npm run verify` (`tools/verify.ts`) and `npm run test:slow` both pass, with every guardrail asserting (T016) (§16 M8)
- [ ] T020 §16 M8 step 2: `npm run build`, then `npm run size` (`tools/bundle-size.ts`). Shipped JS and data are ≤ 300 KB gzipped (§13.7, §16 M8)
- [ ] T021 §16 M8 step 3: `npm run bench` (`tools/bench.ts`) passes, and the `m8-perf` (`scenario=bench-300`) and `m8-perf-full` (`scenario=full-colony`) render benchmarks report p95 ≤ 8 ms (T005) (§13.7, §16 M8)
- [ ] T022 §16 M8 step 4: the cross-engine check, T008's `m8-ff` command with `--browser firefox` (`tools/screenshot.ts`), gives the same hash as Node and Chromium (§13.3, §16 M8)
- [ ] T023 §16 M8 step 5: production preview screenshots of every screen with `tools/screenshot.ts` against `npm run preview`, and Claude reviews them all (§10.5, §15.6, §16 M8)
  - The title.
  - Each Underroot tab, with `--profile tests/fixtures/profile-late.json` (M7/T046) and `test=1`, which M6/T011 reads read-only.
  - The route, an event, the Grove and the spoils.
  - Each battle phase: planning, a draft in planning, the clash and the aftermath, on each map.
  - The report and the summary.
  - Settings and every Help tab.
- [ ] T024 [USER] §16 M8 step 6: the user plays a whole run at 1× on the dev site. Its active play time (the summary's line: R2b/T109, then RB/T029) goes in `docs/playtest-feedback.md`. Under X6, a run outside the target goes to X6's levers, with the numbers (§8.2, §16 M8) ⛔ X6
- [ ] T025 Update `docs/status.md`, `docs/balance-backlog.md`, `data/CHANGELOG-balance.md` and the As built section of `docs/m8-plan.md`, and end the last PR's commit with a summary of the verification output (§16)
- [ ] T026 [USER] The release, only when the user asks: open the release PR from `develop` into `main`, as `CLAUDE.md`'s "Branches and deployment" says. Never before, and never as part of another task (§13.8)
- [ ] T027 §16 M8 step 7: once the release PR merges, check that the Pages workflow run (`.github/workflows/deploy.yml`) succeeded, and take a screenshot of https://swalliso.github.io/Sambattler/ in the built-in browser pane to see it load (§13.8, §16 M8)

## Dependencies and parallel work

- **Order:** Phase 1 → 2 → US1 to US6 → Phase 9.
  - US1 needs Phase 2's measurement and T028's scenario.
  - US2, US3 and US5 need only S0.
  - US4 should run after US1 to US3, so the final tuning sees the final code.
  - US6 comes last before Phase 9, after US4's tuning.
- **In parallel:** S1 (perf), S2 (Firefox), S3 (juice) and S5 (README) may run side by side.
  - S1 and S3 both touch `src/render/effects.ts`: merge one, rebase the other.
- **Handoffs in:**
  - `docs/tasks/m7-gray-rot-and-content.md`: the Three Hollows (T008's third check), the per-seat tools and `--maps all` (T013), derived Gray Rot stats (M7/T006, T015), and `tests/fixtures/profile-late.json` (M7/T046, T023).
  - `docs/tasks/r2a-battle-in-rounds.md`: R2a/T114 (`bench-300` and the round bench with its full-colony case, A119, A200); R2a/T128 (the play-time store).
  - `docs/tasks/r1-clash-check.md`: R1/T039, in round form since R2a/T114 (the full-colony clash, A200), which T028 turns into a scenario.
  - `docs/tasks/r2b-run-in-rounds.md`: R2b/T048 and R2b/T050 (the scenarios in `data/scenarios/` and the round bench in `tools/lib/bench.ts`) for T028, T005 and T021; R2b/T109 and R2b/T149 (play time on the summary, and X6's re-set target) for T024.
  - `docs/tasks/run-it-back.md`: RB/T016's run total and RB/T029's truth line (T024).
  - `docs/tasks/m6-meta-progression.md`: G9, Export and Import, and the read-only test load (T011, T016, T023).
- **Handoff out:** after the release, `develop` carries on. Hotfixes follow CLAUDE.md's `hotfix/…` route.

## Sessions

| Session | Tasks | Branch | Gate (true before starting) | Ends with |
|---|---|---|---|---|
| S0 | T001 | `feature/m8-plan` | M7 merged | `docs/m8-plan.md` agreed; PR into `develop` |
| S1 | T002–T004, T028, T005–T007 | `feature/m8-perf` | S0 merged | Frame measurement, the bundle check, the full-colony scenario, the render pass; PR into `develop` |
| S2 | T029, T008–T010 | `feature/m8-firefox` | S0 merged | The user's OK for the Firefox download (T029) first; matching hashes in Firefox; PR into `develop` |
| S3 | T011–T012 | `feature/m8-juice` | S0 merged | Settings and juice checked for v2; PR into `develop` |
| S4 | T013–T016 | `feature/m8-tuning` | S1–S3 merged | The approved retune, every guardrail asserting; PR into `develop` |
| S5 | T017 | `feature/m8-readme` | S0 merged | The README; PR into `develop` |
| S6 | T018–T025 | `feature/m8-release-candidate` | S4 and S5 merged | The release label, M8 verified on `develop`; PR into `develop`; the user's run-length playtest (T024) |
| S7 | T026–T027 | the release PR, `develop` into `main` | The user asked for the release | `main` deployed, and the live site checked |

## Coverage

**SPEC §16 items**

| SPEC §16 item | Tasks |
|---|---|
| A render performance pass on the biggest clash (two full colonies) | T002, T003, T028, T005, T006 |
| The settings screen (built early with the UI/UX plan's Phase 3) | T011, T012 |
| Light juice: arrival and death puffs, optional screen shake (built early) | T011, T012 |
| A Firefox determinism check | T029, T008, T009, T010 |
| The final balance tournament and tuning | T013, T014, T015, T016 |
| A README with how to play rounds | T017 |
| The release build on GitHub Pages | T018, T026, T027 |
| Step 1: `npm run verify` and `npm run test:slow` pass, with every guardrail asserting | T016, T019 |
| Step 2: `npm run build`: shipped JS + data ≤ 300 KB gzipped | T004, T020 |
| Step 3: `npm run bench` passes; the render benchmark and the full-colony clash report p95 ≤ 8 ms | T003, T028, T005, T007, T021 |
| Step 4: the cross-engine check in Firefox gives the same hash as Node and Chromium | T029, T008, T022 |
| Step 5: production preview screenshots of every screen; Claude reviews all | T023 |
| Step 6: a run with a person at 1× lasts 25–35 minutes | X6; T024 |
| Step 7: the Pages workflow run succeeds and the live URL loads | T027 |
| Every milestone: playable, verify green, a commit summarizing the verification | Every checkpoint; T019, T025 |
| From R2 on: built on feature branches and merged into `develop` as the default, never as a `?proto=` knob; retired systems' tests, goldens and guardrails removed in the same change | Sessions: every session but the release is a feature branch into `develop`. T014 decides which `?proto=` presets and X8 knobs stay; T012 removes v1-only settings |

**Findings**

| Finding | Handled by |
|---|---|
| No high or medium finding is M8's own | – |
| A119 (medium, R2): `bench-300` as a clash | R2a/T114 (`docs/tasks/r2a-battle-in-rounds.md`); T005, T021 measure on it |
| A200 (medium, R1): the full colony's size | R1/T039 (`docs/tasks/r1-clash-check.md`), in round form since R2a/T114 (`docs/tasks/r2a-battle-in-rounds.md`); T028, T005, T006 |
| A193 (high), A208 (medium): the scoring curve, and so run length | X5; T024 |
| A199 (medium, R2): lives rarely bind; G15's upper bound on boss reach | #16 and #35 (R2b); T016 asserts it |
| A197 (medium, R2): what a boss win by Decision pays | X5 and R2-Q14; T013 reports the boss's Rout and Decision shares |
