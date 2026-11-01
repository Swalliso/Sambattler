# Run it back — Run it back, and records: tasks

This piece is SPEC §16 M6's independent work: remember the last commander and bans, restart with Run it back, make the summary lines tell the truth, and keep per-commander records, the last 20 runs, a codex of cards seen and a grudge line. It needs neither M6 nor the round battle. Under X10 it comes in two parts:
- **records-1, now** (beside R1): the profile store holding the last setup, the remembered setup and Run it back. It records no runs.
- **records-2, after R2b**: the run records, the truthful summary lines, play time and the grudge line (they read R2b's `RoundResult` and R2a's play-time store), the records views and the codex.

This list was drafted on 2026-11-01 from SPEC v2 and `docs/tasks/spec-analysis.md`, and refreshed the same day at S0, when the user agreed `docs/run-it-back-plan.md`. X10, RB-Q1 and RB-Q2 took their recommendations, and the user added that records-1 records no runs, so no v1 run is ever recorded: run recording moved into records-2 (T025, T026, T042, T043). records-1's part is agreed. records-2's part stays a draft until its S3 updates the plan against R2b as built (T024).

The file holds two parts, so each part ends with its own Polish phase. Task IDs run in execution order across both parts, with two exceptions:
- the play-time tasks T015–T019 moved into records-2 under X10 and kept their numbers, and T018 is dropped;
- T042 and T043, added at S0 when run recording moved into records-2, sit in Phase 6, where they run.

From another file, cite this file's tasks as RB/T0nn.

**Status:** records-1 agreed 2026-11-01 (S0); records-2 a draft until T024 · **Spec:** SPEC §16 "Milestone 6 — Meta-progression" (its block "Independent of M6: Run it back, and records") and the sections it cites · **Plan:** `docs/run-it-back-plan.md` (agreed 2026-11-01, T001; updated in records-2's S3) · **Gate in:** records-1: S0 merged, with X10, RB-Q1 and RB-Q2 answered (2026-11-01); R1 may be in flight; records-2: R2b merged into `develop` · **Gate out:** records-1: the user has tried Run it back on the dev site (T023); records-2: the user has checked the summary, the records and the codex on the dev site (T041)

## Read first

- SPEC §16 M6's independent block, §8.1 (run setup), §8.5 (lives), §8.8 (end of run), §8.9 (saves), §9.7 (profile save), §10.3 (keys), §10.5 (screens), §13.2 (layering), §13.3 rule 6 (no wall clock in pure code), §13.8 (keys never change), §14.4 (`RunState`, `BattleRecord`, the v2 fields R2 keeps and retires), §15.6 (the screenshot hash check).
- Code:
  - `src/app/run.ts` (`RunController`, `BrowserStorage`, `abandon()`, `newRun()`, `start()`), `src/app/main.ts` (`runStorage()`, `openTitle()`'s `openSetup`, `startRun()`, `randomSeed()`), `src/app/channel.ts` (`storageKey()`, `protoSpace()`), `src/app/settings.ts` (the forgiving load pattern), `src/app/debugBridge.ts` (`RunBrief`).
  - `src/run/runState.ts` (`createRun`, `banProblem`, `RUN_VERSION`, `hashRun`, `battlesWon`, `reachedBoss`), `src/run/flow.ts` (`endRun` sets the summary screen), `src/run/resume.ts` (`RUN_KEY`), `src/run/storage.ts`.
  - `src/ui/screens/run.ts` (`summaryScreen`, and `eventResultScreen`'s key listener as the pattern), `src/ui/screens/underroot.ts`, `src/ui/settingsScreen.ts` (`settingsOpen()`).
  - `eslint.config.js`, `tests/unit/purity.test.ts`, `tests/browser/protoSaves.test.ts` (the served-page and dev-server harness, `serve(mode?)`, and its `PROTO` constant), `tests/browser/runScreens.test.ts` (the fit check), `tools/screenshot.ts`, `tools/golden.ts`.
  - records-2 also: R2a's play-time store `src/app/playTime.ts` and its test `tests/unit/playTime.test.ts` (R2a/T126, R2a/T128, moved out of `rounds/` by R2b), and R2b's summary in `src/ui/screens/run.ts` (R2b/T104, R2b/T109).
- Docs: `docs/tasks/clarify.md` (X10, RB-Q1 to RB-Q4, M6-Q6, M6-Q7, #56), `.claude/rules/storage.md`, `docs/status.md`. For records-2: `docs/tasks/r2a-battle-in-rounds.md` (T126, T128) and `docs/tasks/r2b-run-in-rounds.md` (T008, T104, T105, T109, T116). The source idea, `docs/archive/v1/ideas/after-the-rework.md` Tier 1 item 7, is background only (SPEC §16 points to it).

## Before you start

**Decisions** (each task file assumes the recommendation). X10, RB-Q1 and RB-Q2 were settled on 2026-11-01 (S0), each as recommended, and the ⛔ marks on them below are satisfied:
- X10: two parts, with play time in records-2. When the user agreed the plan, they added that records-1 records no runs, so no v1 run is ever recorded. Run recording is records-2's (T025, T026, T042, T043).
- RB-Q1: the profile key `spore-sprawl/profile/v1` as profile version 1, meta only.
- RB-Q2: prototype runs write no records and no remembered setup (T007, T013).
- RB-Q3 (R2a S0, or records-2's S3 at the latest; blocks T015–T017 and T019): active play time is visible wall time with a 60 s idle cutoff. R2a builds the counter (R2a/T128), R2b shows it on the summary (R2b/T109), and records-2 gives it a run total kept in the records. records-1 counts no play time and records no runs.
- M6-Q7 (M6 S0): whether Run it back keeps M6's whole loadout. The setup record leaves optional room for traits, strains and blights now, so either answer fits.
- RB-Q4 (records-2 S3, blocks T033 and US6): what makes a card seen, and the Collection tab.
- #56 (R2b S0, blocks T029 and T030): the in-world name for lives, which records-2's summary lines use.

**Results this needs:**
- records-1: none. It reads only the ended run's commander and bans, which R2b's run keeps, and changes no rule, no data and no golden.
- records-2: R2b S13 merged into `develop` (R2b/T147): `RUN_VERSION` 2, `RunState.lives` and `BattleRecord.rounds` with each round's `fielded` record (R2b/T008), R2b's summary screen (R2b/T104) and its play-time line (R2b/T109), the draft view R2b settles (R2-Q24, R2b/T116) and the general's kit on route nodes (R2b/T105). R2a's play-time store (R2a/T128).

**Findings** (A-IDs from `docs/tasks/spec-analysis.md`):
- A179 (medium): SPEC says nowhere where records live or how they're versioned. T001, T002, T006.
- A172 (medium): §9.7 puts settings and the run in the profile, whose keys never change. T002 makes the profile meta only; T006 stores only meta.
- Lows: A185 (play time or defeat data in `RunState` would break the Node and browser hash check, and the summary must read only fields v2 keeps): T017, T019, T025, T026. A073 (R2 rewrites the summary): records-2 reads R2b's summary (T026, T030). A186 (no tab shows locked cards): T033, T037. A203 (play time feeds X6): T016 extends R2a/T128's measure, the one X6 reads.

## Technical context

**Where code lands:**
- New: `src/meta/records.ts` and `src/meta/index.ts`, the first modules of `src/meta`. §13.4 plans `src/meta` for M6; `records.ts` isn't in its list, and §13.4 allows new names. Also new: `src/ui/screens/records.ts` (records-2), `tests/unit/records.test.ts`, `tests/browser/records.test.ts`, and `tests/browser/serve.ts`, the served-page harness moved out of `tests/browser/protoSaves.test.ts`.
- Extended: `src/app/run.ts`, `src/app/main.ts`, `src/app/debugBridge.ts`, `src/ui/screens/run.ts`, `src/ui/screens/underroot.ts`, `src/app/urlParams.ts` (records-2), `eslint.config.js`, `tests/unit/purity.test.ts`, `tests/browser/protoSaves.test.ts`, `.claude/rules/storage.md` and `CLAUDE.md` (the new keys).
  - records-2 extends the play-time store, `src/app/playTime.ts`, and its test, `tests/unit/playTime.test.ts`. Under X10 records-1 builds no clock. R2a/T128 creates `PlayClock` at `src/app/rounds/playTime.ts`, with its test at `tests/unit/rounds/playTime.test.ts` (R2a/T126), and R2b moves both to `src/app/playTime.ts` and `tests/unit/playTime.test.ts`. There is no second play-time module.
- Untouched: `src/sim`, `src/run` and `data/`.
  - No `RunState` field and no `RUN_VERSION` bump; R2b bumps it (§18.2 #32). If a later task ever needs a run field, it's optional.
  - No golden moves, and `hashRun` and `hashState` are unchanged.

**Determinism and storage:**
- Play time, records and the codex never enter `RunState` or `BattleState` (A185). `tools/screenshot.ts` compares the browser's `hashRun` with Node's on run scenes, and the run golden pins the run hash.
- `src/meta` is pure (§13.2):
  - no `window`, `Date`, timers or `localStorage`;
  - the app passes `now` and the `Storage` in;
  - it may import from `src/data`, `src/sim` and `src/run` (types such as `Storage` and `RunState`, and `banProblem`);
  - `src/run` never imports `src/meta` (the lint rule exists).
- The store uses `new BrowserStorage('')` from `src/app/run.ts` with the raw key `spore-sprawl/profile/v1`. `BrowserStorage` applies `storageKey()`, so the dev site gets `dev/spore-sprawl/profile/v1`. Never write the `dev/` prefix by hand (`.claude/rules/storage.md`).
- Seeded and test runs (`persist: false` in `runStorage()`) and prototype runs (RB-Q2) get no records storage. In those cases `RunEnv.records` is `null`.
- Every write goes through `updateRecords(storage, change)`: one synchronous step that loads the key's current value, applies a pure change and saves it. No screen holds a copy of the record across another screen (the plan's call 1).

**Calls this list makes** (each reversible):
- **The profile record, version 1.** records-1 writes only `lastSetup`. records-2's additions are optional, so `v` stays 1 until M6 migrates it (A179):
  ```ts
  interface SetupRecord { commander: string; bans: string[];
    traits?: string[]; strains?: Record<string, string>; blights?: Record<string, number> }   // M6, M7 (M6-Q7)
  interface ProfileV1 {
    v: 1; lastSetup?: SetupRecord;                  // records-1
    // records-2 adds (a first guess, settled at T024):
    //   runs?: RunRecord[] (newest first, at most 20); tallies?: Record<string, CommanderTally>;
    //   current?: { seed: number; playMs: number } (the run in progress, US3);
    //   codex?: string[]; grudges?: Record<string, number>
  }
  // records-2's run record, read from R2b's run (a first guess, settled at T024)
  interface RunRecord {
    key: string;                                    // `${seed}:${last battle's finalHash}`, or `${seed}:abandoned:${row}`
    seed: number; commander: string; bans: string[];
    outcome: 'victory' | 'defeat' | 'abandoned';
    row: number; rows: number;                      // path.length, route.length
    won: number; fought: number; bossReached: boolean;
    lostLives: number;                              // battles lost: each costs one life (§8.5)
    endedBy?: string;                               // on a defeat: the general of the battle that cost the last life
    beatBy?: { general: string; unit?: string; by: string; round: number };   // US4
    playMs: number;                                 // 0 until T017
    endedAt: number;                                // ms since 1970, stamped in src/app
  }
  interface CommanderTally { runs: number; wins: number; bossReached: number; bestRow: number; bestWon: number }
  ```
- **No v1 records.** records-1 records no runs, so every record is a run saved by R2b or later. If R3's kit makes earlier bests unfair to compare, each record also carries its run's `RunState.v`, and the tallies keep eras apart. T024 decides.
- **Recording is idempotent on `key`** (records-2). The summary is a saved screen that renders again after a reload (`endRun` in `src/run/flow.ts`).
  - An abandoned run is listed with outcome `abandoned`, but it never counts in `tallies`.
  - A run abandoned before its first battle isn't recorded.
  - A saved run that New run replaces from the title, after its confirm, is recorded as abandoned too. Today `start()` clears it without a trace (T043).
- **A corrupt record** (unparseable, or not an object with `v`) is copied raw to `spore-sprawl/profile/v1.bak`, and defaults load. M6 adds §9.7's reset prompt.
- **A record with `v` above 1** (written by a newer build) loads read-only and is never overwritten.
- **Run it back:**
  - it calls `createRun(content, { seed: env.newSeed(), commander, bans })`, then `start()`. It never uses `params.seed`;
  - each ban is kept only while `banProblem()` accepts the list with it, so a ban that is now in the commander's core, or outside the roster, drops;
  - an unknown commander falls back to `DEFAULT_COMMANDER`;
  - when R3 makes the always-in set unbannable and M6 locks commanders, `banProblem` and the M6 check cover those too.
- **Keys:** `Enter`, `r` and `R` on the summary only, ignored on `e.repeat`, while the settings sheet is open (`settingsOpen()`) and once the screen has left the page.
  - A `left` guard, as in `eventResultScreen`'s `done()`, stops the focused button's click and the key from both starting a run.
  - `R` is free on run screens; in battle it opens the relics, which the summary doesn't have.
- **Play time** (records-2, RB-Q3's recommendation, on R2a's counter):
  - it counts while `document.visibilityState` is `visible` and a run screen or battle of a persisted run is up;
  - it stops counting 60 s after the last `pointerdown`, `pointermove` or `keydown`, and the next input resumes it. Idle time isn't added back;
  - it is held at 0 under `?test=1`;
  - it's flushed to the record's `current` every 15 s, on `visibilitychange` and at the summary.
- **Records views (records-2):**
  - the summary shows this run against the commander's bests and the 5 most recent runs;
  - the Underroot gets a Collection tab, which lists all 20 runs and the codex (RB-Q4, A186). M6 adds locked cards to it.

## Stories

| ID | Priority | Story | Independent test |
|---|---|---|---|
| US1 | P1 | From a finished run's summary, `Enter` or `R` starts a new run with the same commander and bans on a new seed, straight on the route | Browser: from `/?scene=summary&seed=7&autoplay=run&test=1`, `R` opens the route at row 0 with the same commander and bans and another seed |
| US2 | P2 | The Underroot opens on the last commander and bans, after a reload too | Browser on a persisted page: Begin with Armilla and a ban, reload, and the Underroot shows both selected |
| US3 | P3 | (records-2) The summary's play time covers the whole run, counted outside the run state, and a reload continues it | Unit cases in `tests/unit/playTime.test.ts` (R2a/T126's) with a fake clock; T019's browser case: the run save holds no play time, and the run hash is unchanged |
| US4 | P4 | The summary tells the truth: how far you got, what beat you and play time, plus a grudge line naming the general that ended the run | Browser: an autoplayed defeat names the general, its unit and "row n of 6"; a victory has no grudge line |
| US5 | P5 | Per-commander records and the last 20 runs, on the summary, the commander cards and the Collection tab | Browser on a persisted page: two finished runs list newest first, and the commander card reads "2 runs" |
| US6 | P6 | A codex of cards seen, counted in the Collection tab | Browser: opening a draft offer raises the codex count by the offer's new cards |

## Phase 1: Setup

- [x] T001 [USER] Write `docs/run-it-back-plan.md` (new) in CLAUDE.md's plan format (Goal, Scope, Stand-ins, Steps, Verification, Open questions for the user, As built), and agree it with the user, settling X10, RB-Q1 and RB-Q2 through `docs/tasks/clarify.md` (§16 M6, §9.7, §13.8) ⛔ X10
  - Record each answer in its clarify block's Decision line, with the date.
  - The plan's stand-ins: Run it back sits on today's summary, which R2b rewrites and keeps it on (R2b/T104), and the setup is the commander and bans until M6.
  - RB-Q3 is settled at R2a's S0, or at T024 at the latest.
  - Done 2026-11-01. The user took the recommendations for X10, RB-Q1 and RB-Q2, and, agreeing the plan, asked that records-1 build only v2 work: it records no runs, so no v1 run is ever recorded. S0 moved run recording into records-2: T003 and T005–T007 lost their recording parts, which T025, T026 and the new T042 and T043 now hold.
- [x] T002 Write the decisions into `SPEC.md`, `docs/status.md`, `.claude/rules/storage.md` and `CLAUDE.md` (§9.7, §13.8, §16 M6) ⛔ RB-Q1
  - §9.7's contents become meta only: drop `settings` and `runInProgress?`, which keep their own keys, and add `lastSetup`, the run records and the codex (A172).
  - §16 M6's independent block names the key, says records-1 records no runs, and says play time and "what beat you" live in the records, never in the run state (A179, A185).
  - `.claude/rules/storage.md`: add `spore-sprawl/profile/v1` and `spore-sprawl/profile/v1.bak` (`src/meta/records.ts`) to the list of the game's keys that never change, and add `src/meta/**`, `tests/unit/records.test.ts` and `tests/browser/records.test.ts` to its `paths`.
  - `CLAUDE.md`: add `src/meta/` to the `storage.md` row of the topic-rules table.
  - `docs/status.md` gets the item in "Waiting on the user" and its row in "Recent work".

## Phase 2: Foundational (blocks every story)

- [x] T003 [P] Write `tests/unit/records.test.ts` (new) against `src/meta/records.ts` (new in T006), on `MemoryStorage` (§9.7, §13.8) ⛔ RB-Q1
  - Empty storage loads `{ v: 1 }`.
  - `updateRecords` with `setLastSetup` saves the setup, and the next load returns it.
  - A garbage string at `spore-sprawl/profile/v1` is copied to `spore-sprawl/profile/v1.bak`, and defaults load.
  - Unknown fields, and unknown commander or building ids in `lastSetup`, survive a load and a save.
  - A record with `v: 2` loads read-only: `updateRecords` writes nothing.
  - The run-record cases are records-2's (T025).
- [x] T004 [P] Add `src/meta` to the pure layers in `eslint.config.js` and `tests/unit/purity.test.ts` (§13.2, §13.3)
  - `eslint.config.js`: a `files: ['src/meta/**/*.ts']` block with `pureRules`, whose `no-restricted-imports` forbids `forbiddenFromPure` (render, ui, app, tools, Node modules).
  - `tests/unit/purity.test.ts`: add `'src/meta'` to `PURE`. `BANNED_IMPORT` already bans `/meta/` from the other pure layers. Imports inside `src/meta` are `./…`, and `src/meta` may import `../run/`, `../sim/` and `../data/`.
  - The test's `files()` throws on a missing folder, and T006 creates `src/meta`: skip a folder that doesn't exist yet.
- [x] T005 [P] Move the served-page harness from `tests/browser/protoSaves.test.ts` into `tests/browser/serve.ts` (new), for the records cases (§13.8, §15.6)
  - `tests/browser/serve.ts` exports `serve(mode?)` (a game server, or a `develop`-mode server for the dev-site cases) and `PROTO`. `tests/browser/protoSaves.test.ts` imports both, so R2b, which retires the `hotstart` preset (§16 R2), changes one line.
  - `tests/browser/protoSaves.test.ts` passes, with no other change. T008 writes `tests/browser/records.test.ts` on the harness.
- [x] T006 Build the profile store in `src/meta/records.ts` (new) and `src/meta/index.ts` (new) (§9.7, §13.2, §13.8) ⛔ RB-Q1
  - Exports: `PROFILE_KEY = 'spore-sprawl/profile/v1'`, `PROFILE_BACKUP_KEY = 'spore-sprawl/profile/v1.bak'`, `SetupRecord` and `ProfileV1` from Technical context, `loadRecords(storage)`, `updateRecords(storage, change)` and `setLastSetup(rec, setup)`.
  - `updateRecords` loads the key's current value, applies the pure `change` and saves, in one synchronous step. It writes nothing when the record is read-only or the change leaves it as it was.
  - The load is as forgiving as `loadSettings()`: it keeps unknown fields and fills missing ones with defaults.
  - Pure: no `window`, `Date` or `localStorage`; the caller passes the `Storage`.
  - Bring SPEC §13.2's line on when `src/meta` arrives, and §13.4's `meta/` line, up to date with `records.ts` and `index.ts`, since §13.4 follows the code (added at S0).
  - Make T003 and T004 pass.
- [x] T007 Give the app its profile storage in `src/app/run.ts` and `src/app/main.ts` (§9.7, §13.8) ⛔ RB-Q2
  - `RunEnv` gains `records: Storage | null`.
  - `openTitle()` and `startRun()` in `src/app/main.ts` pass `new BrowserStorage('')` when `persist` is true and `params.proto` is null, else `null`.
  - Nothing writes it yet: T011 saves `lastSetup` from Run it back, and T014 from the Underroot. Run recording is records-2's (T042, T043).

**Checkpoint:** `npx vitest run tests/unit/records.test.ts tests/unit/purity.test.ts tests/browser/protoSaves.test.ts` passes, and `npm run verify` stays green with no golden change.

## Phase 3: US1 — Run it back (P1)

**Goal:** a finished run restarts in one key, with the same commander and bans on a new seed, straight on the route. **Independent test:** the browser cases in T008.

- [ ] T008 [US1] Write `tests/browser/records.test.ts` (new) on T005's harness, with the Run it back cases, and add them to `tests/unit/records.test.ts` (§16 M6, §8.1, §10.3, §13.8)
  - Browser, from `/?scene=summary&seed=7&autoplay=run&test=1`:
    - `R` opens the route: `__GAME__.run()` reports screen `route`, row 0, the ended run's commander and bans, and a `seed` that differs;
    - `Enter` does the same;
    - with the settings sheet open (`#settings-btn`), `R` does nothing;
    - one press starts exactly one run;
    - the page writes no profile key, before or after `R`.
  - Browser, on a persisted page: seed a finished run into `spore-sprawl.run.v1` with `addInitScript` (`simulateRun(nodeContent(), 7, AUTOPLAY, { commander: 'armilla', bans: ['scythecapGrove'] }).run`), and open `/?scene=run&debug=1`, which has no seed or `test`, so the page persists and still has the bridge. `R` restarts the run as Armilla with `scythecapGrove` banned, and `localStorage['spore-sprawl/profile/v1']`'s `lastSetup` names both.
  - Unit: `runItBackSetup(content, { commander: 'nobody', bans: [] })` gives `DEFAULT_COMMANDER`. `runItBackSetup(content, { commander: 'vesper', bans: ['rootbreakerDen', 'scythecapGrove'] })` drops `rootbreakerDen`, which is in Vesper's core, and keeps `scythecapGrove`.
- [ ] T009 [P] [US1] Add `runItBackSetup(content, setup)` to `src/meta/records.ts`. It returns a commander and the bans that `banProblem()` (`src/run/runState.ts`) accepts, in their order, at most `MAX_BANS` (§8.1, §8.4)
- [ ] T010 [P] [US1] Add `seed` to `RunBrief` in `src/app/debugBridge.ts` (§15.6)
  - The bridge is app-only, so no hash moves.
- [ ] T011 [US1] Add `RunController.runItBack()` to `src/app/run.ts` (§16 M6, §8.1)
  - Take `{ commander, bans }` from the ended run through `runItBackSetup`.
  - Call `createRun(content, { seed: this.env.newSeed(), ...setup })`, then `this.start(run)`, which clears the old save and shows the route.
  - When `records` is set, save `lastSetup` with `updateRecords(records, (rec) => setLastSetup(rec, setup))`.
  - It works on both entry paths: from the title (`openTitle`, which has a `setup`) and from `scene=run` (`startRun`, which has none).
- [ ] T012 [US1] Give the summary's footer Run it back and its keys in `src/ui/screens/run.ts` (§16 M6, §10.3, §10.5)
  - `summaryScreen`'s actions gain `runItBack()`.
  - The footer reads: Title, New run (to the Underroot, no longer primary), and Run it back (`#run-it-back`, `btn primary`, with `Enter` and `R` keycaps), which takes the focus.
  - The key listener follows `eventResultScreen`'s pattern and the calls above.
  - `src/app/run.ts` passes `() => this.runItBack()`.

**Checkpoint:** `npx vitest run tests/browser/records.test.ts tests/unit/records.test.ts` and `npm run verify` pass: the summary restarts on `R` or `Enter`, and no golden moves.

## Phase 4: US2 — The Underroot remembers (P2)

**Goal:** New run opens the Underroot on the last commander and bans, after a reload too. **Independent test:** T013's persisted-page case.

- [ ] T013 [US2] Add the remembered-setup cases to `tests/browser/records.test.ts` (§16 M6, §8.1)
  - On the game server, open `/?scene=underroot&debug=1`, pick Armilla, ban the Scythecap Grove, Begin, then reload `/?scene=underroot&debug=1`: Armilla's `.commander-card` has `.on`, and `[data-ban="scythecapGrove"]` is pressed.
  - Seed a profile whose `lastSetup` names an unknown commander: the Underroot opens on Vesper with no bans.
  - `/?scene=underroot&seed=5&test=1` never writes the profile key.
  - On the `develop`-mode server, `/?proto=${PROTO}&scene=underroot` writes no `dev/spore-sprawl/profile/v1` (RB-Q2), with `PROTO` from `tests/browser/serve.ts` (T005).
- [ ] T014 [US2] Remember the setup in `src/app/main.ts` (§8.1, §13.8)
  - `openSetup` opens `underrootScreen` with `choice: runItBackSetup(content, loadRecords(records).lastSetup)` when `records` is set, else today's `{ commander: DEFAULT_COMMANDER, bans: [] }`.
  - Its `begin` saves `lastSetup` through `updateRecords` before `play()`.

**Checkpoint:** `npx vitest run tests/browser/records.test.ts tests/browser/commanders.test.ts` and `npm run verify` pass: the Underroot opens on the last setup, and the Underroot's tests still pass.

## Phase 5: Polish and verification, records-1

- [ ] T020 Run `npm run verify` (`tools/verify.ts`) and `npm run test:browser`, and end the PR's last commit with a summary of their output (§16's rules for every milestone, §15.1)
- [ ] T021 Take screenshots `rb/summary` (`scene=summary&seed=7&autoplay=run&test=1`) and `rb/underroot` (`scene=underroot&test=1`) with `tools/screenshot.ts`, and read the PNGs (§15.6)
  - Each passes its Node-against-browser hash assertion, so the run hash didn't move.
  - Run it back is the primary button with its keycaps.
  - The footer and the banner fit 1280×720.
  - The Underroot looks as before.
- [ ] T022 Update `docs/status.md` (records-1 landed, Run it back on the dev site) and the As built section of `docs/run-it-back-plan.md` (§16 M6)
- [ ] T023 [USER] records-1 check on the dev site: the user finishes a run, uses Run it back, reloads, and sees the Underroot remember the setup. Play time comes with records-2. Notes go in `docs/playtest-feedback.md`, newest first (§16 M6, §8.1)

## Phase 6: Setup and foundational, records-2 (after R2b)

- [ ] T024 [USER] Update `docs/run-it-back-plan.md` for records-2 against R2b as built, and agree it (§8.8, §10.5) ⛔ RB-Q3 RB-Q4
  - Name where R2b put the summary (R2b/T104), its play-time line (R2b/T109), the in-battle draft (R2-Q24, R2b/T116) and the route node's kit (R2b/T105), and where R2a's play-time store and its test ended up (R2a/T126, R2a/T128).
  - Settle RB-Q3 if R2a's S0 didn't, settle RB-Q4, and take #56's word for lives.
  - Confirm the plan's records-2 calls 6–8: the record's key, abandoned runs, and whether eras need keeping apart (Technical context, "No v1 records").
- [ ] T025 Write the run-record cases in `tests/unit/records.test.ts`, on R2b's run (§9.7, §14.4, §8.5)
  - `recordRun` twice with one `key` adds one entry.
  - The 21st run drops the oldest, and the list stays newest first.
  - Tallies count runs, wins, boss reached, best row and best battles won per commander, and skip abandoned runs.
  - `runRecordOf` reads only fields R2b keeps: `seed`, `commander`, `bans`, `path`, `route.length`, `lives`, `outcome`, and `battles[]`'s `winner`, `kind`, `general` and `finalHash`. It never reads `durationTicks`, `front`, `mapWidth`, `heartcapBefore`, `heartcapAfter` or `heartcap`, which R2 retires.
  - A run with two lost battles and one life regained at the Grove records `lostLives` 2.
  - A records-1 profile, which holds only `lastSetup`, loads unchanged and keeps its setup once a run is recorded.
- [ ] T026 Add the run records to `src/meta/records.ts`: `RunRecord`, `CommanderTally`, `runs`, `tallies`, `recordRun(rec, record)` and `runRecordOf(run, { outcome?, now, playMs })`, reading R2b's `RunState` (§14.4, §8.5, §9.7)
  - `lostLives` counts the battles you lost, `battles.filter(b => b.winner !== 'player').length`: each loss costs exactly one life (§8.5), and a regained life doesn't undo one. `lives.max - lives.left` would undercount after the Grove.
  - `endedBy` is the general of the battle that cost the last life, or the boss.
  - If T024 keeps eras apart, each record carries its run's `RunState.v`, and the tallies are kept per era.
  - Make T025 pass.
- [ ] T042 Add the recording cases to `tests/browser/records.test.ts` (§8.8, §13.8) (added at S0)
  - Seed a finished R2b run into `spore-sprawl.run.v1` with `addInitScript`, from `simulateRun` as T008 seeds one, and open `/?scene=run&debug=1`. The summary shows, and `localStorage['spore-sprawl/profile/v1']` holds one run.
  - A reload on the summary still holds one run.
  - Abandoning a run after its first battle records it as `abandoned`, and so does replacing a saved run from the title's New run, after its confirm. A run abandoned before its first battle isn't recorded.
  - `/?scene=summary&seed=7&autoplay=run&test=1` writes no profile key, and on the `develop`-mode server a `?proto=` run writes no `dev/spore-sprawl/profile/v1` (RB-Q2).
- [ ] T043 Record each finished or abandoned run from `src/app/run.ts` (§8.8, §13.8) (added at S0)
  - `RunController.render()`'s `summary` case records the run through `updateRecords(records, (rec) => recordRun(rec, runRecordOf(run, { now: Date.now(), playMs })))`, with `playMs` 0 until T017 passes the play clock's total.
  - `abandon()` records an `abandoned` run before `clearRun`, if the run has fought a battle.
  - `start()` records the saved run it replaces as `abandoned`, if that run has no outcome and has fought a battle. That's the title's New run path, which today clears the run without a trace.
  - M6 banks Spores, Amber and XP in this same write (M6/T013).
  - Make T042 pass.

**Checkpoint:** `npx vitest run tests/unit/records.test.ts tests/browser/records.test.ts` and `npm run verify` pass: a finished run leaves one record, seeded and prototype runs leave none, and no golden moves.

## Phase 7: US3 — Active play time (P3)

**Goal:** the summary's play time covers the whole run, counted in `src/app` on R2a's counter and kept outside the run state. **Independent test:** T015's unit cases, and T019's browser case.

- [ ] T015 [US3] Add the run-total cases to `tests/unit/playTime.test.ts` (R2a/T126's), with an injected clock (§16 M6, §13.3) ⛔ RB-Q3
  - Keep R2a's cases (visible time counts, hidden time doesn't, the 60 s idle cutoff, nothing enters the state), and add:
  - the run total sums every battle and run screen of one run;
  - after the idle cutoff, the next `input()` resumes the count, and the idle gap isn't added;
  - `restore(ms)` continues from a saved total;
  - a counter built with `still: true` stays at 0.
- [ ] T019 [US3] Add the hash case to `tests/browser/records.test.ts` (§15.5, §15.6) ⛔ RB-Q3
  - On a persisted page (`/?scene=run&debug=1`, with a run in progress seeded into `spore-sprawl.run.v1` as T042 seeds one, from `createRun(nodeContent(), { seed: 7 })`), after 20 s of input (Playwright's `page.clock`, or a real wait past the 15 s flush), `localStorage['spore-sprawl.run.v1']` holds no play-time field, and `hashRun` of the loaded run equals the seeded run's.
  - The profile's `current.playMs` is above 0, and a reload continues from it.
- [ ] T016 [US3] Add a run total, `restore(ms)` and `still` to `PlayClock` in `src/app/playTime.ts` (R2a/T128's). Don't create a second module (§16 M6, §8.2, §13.3) ⛔ RB-Q3
  - R2a/T128 creates it as `new PlayClock(now, {idleMs?})` with `setVisible`, `input`, `phase` and the per-phase readouts (`planningSecondsByRound()`, `clashSeconds()`, `aftermathSeconds()`), with `idleMs` 60 000 by default. This task adds `total(): number`, `restore(ms)` and the `still` option (`opts: { idleMs?: number; still?: boolean }`).
  - It stays X6's one measure (A203): R2a's planning seconds per round, plus the run's total.
  - If R2a or R2b/T109 already built part of it, add only what's missing.
- [ ] T017 [US3] Run the counter for the whole run from `src/app/run.ts`, and keep its total in `src/meta/records.ts` (§16 M6, §13.3, §13.8) ⛔ RB-Q3
  - `RunController` holds one counter for the run (the one R2b/T109 wired, if it did), built with `still: env.still` when `records` is set. It restores it from `current` when `current.seed` equals `run.seed`, and resets it in `start()`.
  - It feeds input from `pointerdown`, `pointermove` and `keydown` on `window`, and visibility from the existing `visibilitychange` listener.
  - Add `current?` to `ProfileV1` and `setCurrent(rec, { seed, playMs })`, called every 15 s (a `setInterval` cleared in `stop()`), when the tab is hidden, and at the summary. The summary's `recordRun` takes the total in place of T043's `playMs: 0`.
  - Nothing reaches `RunState` (A185).
- T018 is dropped: R2b/T109 shows the minutes on the summary, and T029 and T030 replace that line.

**Checkpoint:** `npx vitest run tests/unit/playTime.test.ts tests/browser/records.test.ts` and `npm run verify` pass (`npm run golden -- verify` reports no change): play time counts across the whole run and a reload, and every hash is unchanged.

## Phase 8: US4 — Truthful summary lines and the grudge line (P4)

**Goal:** the summary says how far you got, what beat you, how long you played, and names the general that ended the run. **Independent test:** T027's browser cases.

- [ ] T027 [US4] Add the cases to `tests/unit/records.test.ts` and `tests/browser/records.test.ts` (§16 M6, §8.8)
  - Unit: on a staged v2 run, `defeatInfo(content, run)`:
    - picks the last lost battle;
    - returns its general, its `by`, and the round its Heartcap fell (`rounds.length`), or "after round 9";
    - returns the enemy's most-fielded unit type in it, summed over `rounds[].fielded` for the enemy, ties broken by id;
    - returns null on a victory.
  - Unit: `grudges` counts endings per general and is filled from `runs` when the field is missing.
  - Browser: the summary of an autoplayed defeat shows `#summary-truth` with "row n of 6", the battles won of fought, the lives lost and the play time, and `#summary-grudge` naming the general. An autoplayed victory has no `#summary-grudge`. Pick one seed of each kind in the session and name them in the test.
- [ ] T028 [US4] Add `defeatInfo()`, `RunRecord.beatBy?: { general, unit?, by, round }` and the `grudges` tally to `src/meta/records.ts` (§8.8, §5.7)
- [ ] T029 [US4] Write `truthLines(content, run, info, playMs)` and `grudgeLine(content, info, grudges)` in `src/ui/screens/records.ts` (new) (§8.8, §16 M6) ⛔ §18.2 #56
  - The lines: "Reached row r of 6 · won w of f battles · lost n lives" (n is `lostLives`); "What beat you: Old Mother Mold, with Sporelings, by Rout in round 6"; "Played 31 min".
  - The grudge line: "Old Mother Mold ended this run. It has ended 3 of your runs."
  - Use #56's word for lives.
- [ ] T030 [US4] Put the lines on R2b's summary in `src/ui/screens/run.ts` (or wherever T024 found it), replacing the banner's hint line and R2b/T109's play-time line (§8.8, §10.5) ⛔ §18.2 #56

**Checkpoint:** `npx vitest run tests/unit/records.test.ts tests/browser/records.test.ts` and `npm run verify` pass: a defeat names what beat you, and no golden moves.

## Phase 9: US5 — Per-commander records and the last 20 runs (P5)

**Goal:** you can see your bests with each commander and your recent runs. **Independent test:** T031's persisted-page case.

- [ ] T031 [US5] Add the cases to `tests/browser/records.test.ts` (§16 M6, §8.8)
  - Seed a profile with two finished Vesper runs (one won) and one abandoned run.
  - The summary's `#records-bests` compares this run with Vesper's bests.
  - `#records-recent` lists the 5 newest, newest first, with abandoned shown as Abandoned.
  - Vesper's Underroot card reads "2 runs · 1 win · best row 6".
  - `/?scene=underroot&tab=collection&debug=1` lists all three runs.
  - The summary and the Collection tab fit 1280×720 and 1366×650, as `tests/browser/runScreens.test.ts`'s fit check does.
- [ ] T032 [US5] Write `bestsLine(content, tally, record)`, `recentRuns(content, rec, n)` and `commanderLine(tally)` in `src/ui/screens/records.ts` (§16 M6)
  - If T024 keeps eras apart, a run from an earlier era is marked with it and never counts toward the current bests.
  - Leave room in `CommanderTally` for M6's `xp` and M7's `bestDecay` (§9.5, §9.6), so per-commander numbers have one home.
- [ ] T033 [US5] Show the records in `src/ui/screens/run.ts` (the summary's `#records-bests` and `#records-recent`), `src/ui/screens/underroot.ts` (a record line on each commander card, and a Collection tab with a Runs section) and `src/app/urlParams.ts` (`tab=collection`) (§10.5, §15.6) ⛔ RB-Q4
  - The Underroot's tabs become Commander, Bans and Collection (A186). M6 adds Traits and Strains, and M7 Blights.

**Checkpoint:** `npx vitest run tests/browser/records.test.ts tests/browser/runScreens.test.ts` and `npm run verify` pass: records show and every run screen still fits.

## Phase 10: US6 — The codex of cards seen (P6)

**Goal:** the Collection tab counts the cards you've seen, out of all of them. **Independent test:** T034's draft case.

- [ ] T034 [US6] Add the cases to `tests/unit/records.test.ts` and `tests/browser/records.test.ts` (§16 M6, §8.3) ⛔ RB-Q4
  - Unit: `markSeen` is a set union that ignores unknown ids.
  - Unit: `codexCount(content, codex)` gives seen and total. The total is the Velvet Bloom roster plus every relic, plus R3's augments when `content` has them.
  - Browser: on a persisted page, an in-battle draft offer, then a spoils offer, raise `#codex-count` by their new cards.
- [ ] T035 [US6] Add `codex?: string[]`, `markSeen(rec, ids)` and `codexCount(content, codex)` to `src/meta/records.ts` (§16 M6)
- [ ] T036 [US6] Mark cards seen from `src/app/run.ts` (§8.3, §8.6, §8.7, §7.5)
  - Offers: the in-battle draft's offer as the draft view R2b built shows it (R2b/T116; today `src/ui/draftOverlay.ts`), spoils offers (`run.screen.picks[].offer`), and event prompt options (`run.screen.prompt.options`).
  - Owned: `run.kit` and `run.relics` at each node boundary.
  - The general's kit: on its route node, and `config.enemy.kit` when a battle starts.
  - After M7, M7/T012 maps a Gray Rot id to its `mirrors` id before `markSeen`, so the codex stays in Velvet Bloom ids.
- [ ] T037 [US6] Add a Cards seen section to the Collection tab in `src/ui/screens/underroot.ts`: `#codex-count` ("23 of 38"), and the cards seen beside unseen ones drawn as dim backs. It is M6's home for locked cards (A186) (§10.5, §16 M6)

**Checkpoint:** `npx vitest run tests/unit/records.test.ts tests/browser/records.test.ts` and `npm run verify` pass: the codex counts what you've seen.

## Phase 11: Polish and verification, records-2

- [ ] T038 Run `npm run verify` (`tools/verify.ts`) and `npm run test:browser`, and end the PR's last commit with a summary of their output (§16, §15.1)
- [ ] T039 Take screenshots `rb/summary-defeat` and `rb/summary-victory` (the seeds T027 picked, with `scene=summary&autoplay=run&test=1`) and `rb/collection` (`scene=underroot&tab=collection&test=1`) with `tools/screenshot.ts`, and read the PNGs (§15.6)
  - The truthful lines read plainly.
  - The grudge line is absent on the victory.
  - The Collection tab fits 1280×720.
- [ ] T040 Update `SPEC.md` §10.5 (the Underroot's tabs: Commanders, Traits, Strains, Bans, Blights in M7, Collection; A186), `docs/status.md` and the As built section of `docs/run-it-back-plan.md` (§10.5, §16 M6)
- [ ] T041 [USER] records-2 check on the dev site: the user plays a run to its end and checks the summary's lines and play time, the records and the codex. Notes go in `docs/playtest-feedback.md` (§16 M6, §8.8)

## Dependencies and parallel work

- **Order:** Phase 1 → 2 → US1 → US2 → Phase 5 (records-1). Then, after R2b: Phase 6 → US3 → US4 → US5 → US6 → Phase 11 (records-2).
  - US2 needs US1's `runItBackSetup`.
  - US3 needs Phase 6 and R2a's play-time store (R2a/T128). US4's truth lines show US3's total.
  - US5 needs US4's record fields. US6 needs US5's Collection tab.
- **Beside other work:**
  - records-1 shares no file with R1, which is headless tooling, or with R4a, which works on sprites, render and its data checks, so it may run in parallel with either.
  - It merges before R2b's S0 ends: R2b/T004 stops and asks if it hasn't.
  - Its sessions touch `src/app/run.ts`, `src/app/main.ts` and `src/ui/screens/run.ts`, which R2b rewrites around, so records-1 lands first.
  - records-1 (RB/T007, T014) and R2a S11 (R2a/T075) both edit `src/app/main.ts`: land records-1 first, or the later one rebases.
- **Handoffs out:**
  - R2b/T104 (`docs/tasks/r2b-run-in-rounds.md`) keeps `#run-it-back` and its keys in the summary rewrite. T008's and T013's browser cases guard them.
  - Play time has one module, `src/app/playTime.ts`. Under X10 records-1 builds no clock, so R2a/T128 (`docs/tasks/r2a-battle-in-rounds.md`) creates it, R2b moves it to `src/app/playTime.ts` and R2b/T109 shows it on the summary, T016 adds the run total, and T029 and T030 replace R2b/T109's line.
  - M6/T008 (`docs/tasks/m6-meta-progression.md`) migrates the v1 record: T006's `lastSetup`, plus records-2's runs if it has landed. `tests/fixtures/profile-v1.json` is such a record. M6 doesn't wait on records-1 (§16 M6): if records-1 hasn't landed, M6 starts from no key.
  - M6/T013 banks Spores, Amber and XP in T043's `recordRun` write. If records-2 hasn't landed when M6 needs it, M6 builds that write, as T043 describes.
  - M6/T011 reads the profile read-only under `test=1` and `seed=` for its screenshots. Records still never write there.
  - M6's locked cards go into T037's Collection tab (M6/T024). If records-2 hasn't landed when M6 needs it, M6 builds the tab.
  - M6/T052 and M6/T053 extend Run it back to M6's whole loadout (M6-Q7).
  - M8/T024 (`docs/tasks/m8-release.md`), the run-length check (step 6), reads the play time on the summary (R2b/T109, then T029).
- **Handoffs in:**
  - records-2 needs R2b (`docs/tasks/r2b-run-in-rounds.md`): R2b/T008 (`RUN_VERSION` 2, lives, `BattleRecord.rounds` with `fielded`), R2b/T104 (the summary), R2b/T105 (the route node's kit), R2b/T109 (play time on the summary) and R2b/T116 (the draft sheet).
  - R2a/T126 and R2a/T128: the play-time store and its test, which US3 extends.
  - M7/T012 (`docs/tasks/m7-gray-rot-and-content.md`): after M7, T036's seen-marking maps a Gray Rot id to its `mirrors` id first, so a met Ashling counts as the Sporeling Burrow seen.
- **Conflict to watch:** records-2's US5 and R3's run-screen session both edit `src/ui/screens/run.ts` and `src/ui/screens/underroot.ts`. Land one, then rebase the other.

## Sessions

| Session | Tasks | Branch | Gate (true before starting) | Ends with |
|---|---|---|---|---|
| S0 | T001–T002 | `feature/records-plan` | SPEC v2 (#39) and these task lists (`feature/v2-tasks`) merged into `develop`; T001 puts X10, RB-Q1 and RB-Q2 to the user | `docs/run-it-back-plan.md` agreed; SPEC §9.7 and §16, `.claude/rules/storage.md` and CLAUDE.md updated; PR into `develop` |
| S1 | T003–T012 | `feature/records-1-run-it-back` | S0 merged; RB-Q1 and RB-Q2 answered | The profile store and Run it back; PR into `develop`, verify green, no golden moved |
| S2 | T013–T014, T020–T023 | `feature/records-1-setup` | S1 merged | The remembered setup, records-1 verified; PR into `develop`; the user's check (T023) |
| S3 | T024–T026, T042, T043 | `feature/records-2-base` | S2 merged; R2b S13 merged into `develop` (R2b/T147) | The plan updated, RB-Q3 and RB-Q4 settled; run records from R2b's run, recorded from the summary, `abandon()` and `start()`; PR into `develop`, no golden moved |
| S3b | T015, T019, T016, T017 | `feature/records-2-playtime` | S3 merged; RB-Q3 answered | Play time for the whole run, kept in the records; PR into `develop`, no golden moved |
| S4 | T027–T033 | `feature/records-2-summary` | S3b merged; RB-Q4 and #56 answered | Truthful lines, the grudge line, records on the summary, cards and Collection tab; PR into `develop` |
| S5 | T034–T041 | `feature/records-2-codex` | S4 merged | The codex, records-2 verified; PR into `develop`; the user's check (T041) |

## Coverage

**SPEC §16 items**

| SPEC §16 item | Tasks |
|---|---|
| Independent of M6: it doesn't depend on the battle or on M6, and MAY land before, during or after M6 | X10's split; T001; Sessions S0–S5; M6 doesn't gate on it (handoffs out) |
| Two parts (X10); records-1 records no runs, so no v1 run is recorded | records-1 holds only the setup (T003, T006, T007); recording starts in records-2 (T025, T026, T042, T043) |
| Remember the last commander and bans | T006, T013, T014 |
| "Run it back" (`Enter` or `R`) starts a new seed straight on the route | T008–T012 |
| Summary lines that tell the truth: how far you got | T027, T029, T030 |
| … what beat you | T027, T028, T029, T030 |
| … active play time | T015, T016, T017, T019 (counted for the whole run, records-2); T029, T030 (shown in the lines) |
| Per-commander records | T025, T026 (tallies), T031–T033 |
| The last 20 runs | T025, T026 (kept), T042, T043 (recorded), T031–T033 (shown) |
| A codex of cards seen | T034–T037 |
| A grudge line naming the general that ended the run | T027–T030 |
| Every milestone leaves the game playable and passes `npm run verify` | Every phase's checkpoint; T020, T038 |
| Every milestone ends with a commit summarizing the verification output | T020, T038 |
| From R2 on: built on feature branches and merged into `develop` as the default, never as a `?proto=` knob | Sessions: every session is a feature branch into `develop`, and nothing here is a knob |

**Findings**

| Finding | Handled by |
|---|---|
| A179 (medium): where records live, how they're versioned | RB-Q1; T001, T002, T006 |
| A172 (medium): the profile must be meta only | RB-Q1; T002, T006. M6 keeps it so (M6/T004, M6/T008) |
| A185 (low): play time and defeat data out of the run state; the summary reads only kept fields | T017, T019, T025, T026 |
| A186 (low): no tab for locked cards | T033, T037, T040 |
| A073 (low): R2 rewrites the summary | T024, T030 (records-2 builds on R2b's summary) |
| A203 (low): run length needs a measure | T016 (extends R2a/T128, X6's measure); M8/T024 |
