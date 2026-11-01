# Run it back plan: records-1 and records-2

**Status: agreed with the user on 2026-11-01 (records S0).** The user took the recommendations for X10, RB-Q1 and RB-Q2, and asked that records-1 build only v2 work, so no run is recorded before records-2. records-2's part stays a first guess until its S3 updates this plan against R2b as built (T024).

Written 2026-11-01 against `develop` at `778a564` (R1 S0 merged). The scope is SPEC §16 M6's block "Independent of M6: Run it back, and records", and the sections it touches: §8.1, §8.8, §8.9, §9.7, §10.3, §10.5, §13.2, §13.3, §13.8, §14.4 and §15.6. The calls come from the review of SPEC v2 (A172, A179, A185, A186, A073 and A203 in `docs/tasks/spec-analysis.md`) and the user's decisions in `docs/tasks/clarify.md` (X10, RB-Q1 to RB-Q4). The tasks are in `docs/tasks/run-it-back.md`, cited as RB/T0nn.

## Goal

Make the next run one key away, and make the end of a run say what happened.

A player who finishes a run starts another with the same commander and bans on a new seed, straight on the route, and the Underroot opens on the setup they last played. After R2b, the summary says how far the run got, what beat it and how long it took, and names the general that ended it. The game keeps each commander's bests, the last 20 runs and a codex of the cards seen. None of it touches a battle or the run's hash.

## Decisions

Settled with the user on 2026-11-01:
- **X10, two parts.** records-1 now, beside R1. records-2 after R2b, reading R2b's run. It was asked in the hub session that started records S0.
- **RB-Q1, the profile key.** Records live in `spore-sprawl/profile/v1`, through `storageKey()`, as profile version 1 and meta only. Settings, tips and the run keep their own keys. M6 adds its fields as a later version of the same record, with a migration, under the same key.
- **RB-Q2, prototype runs.** A `?proto=` run writes no records and no remembered setup. Run it back still works in one, because it reads the run that ended.
- **No v1 records** (at the plan's agreement). records-1 builds only what reads no battle rules: the profile store holding the last setup, Run it back, and the Underroot remembering the setup. It records no runs, so no v1 run is ever recorded. Run records, the last 20 runs, each commander's records, play time, the summary lines, the grudge line and the codex all start in records-2, on R2b's run. The user's reason: work toward v2 only, and test v2's features from here on.

The first three are recorded in their blocks in `docs/tasks/clarify.md`, and all four in SPEC §9.7, §13.8 and §16 M6.

## Scope

**records-1** (now, beside R1; sessions S1 and S2):
- `src/meta/records.ts` and `src/meta/index.ts` (new), the first modules of `src/meta`. They're pure (§13.2) and use the `Storage` interface. `src/meta` joins the pure layers in `eslint.config.js` and `tests/unit/purity.test.ts`.
- The profile record, version 1, holding `lastSetup`: the commander and bans of the last run begun. Its loader is as forgiving as `loadSettings()`.
- Run it back on the summary: `Enter` or `R` starts a new seed straight on the route.
- The Underroot opens on the last setup, after a reload too.
- The served-page browser harness moves out of `tests/browser/protoSaves.test.ts` into `tests/browser/serve.ts`, for the new browser cases.

**records-2** (after R2b; sessions S3–S5, updated against R2b as built at T024):
- Run records from R2b's run: each finished or abandoned run, recorded once; the last 20 runs; and each commander's tallies.
- Active play time for the whole run, on R2a's play clock (RB-Q3), with its total kept in the records.
- The truthful summary lines and the grudge line, on R2b's summary, in #56's word for lives.
- The records views: bests and recent runs on the summary, a line on each commander card, and the Underroot's Collection tab.
- The codex of cards seen (RB-Q4).

**Not in this piece:**
- any record of a v1 run;
- M6's meta: banking Spores, Amber and XP, unlocks, feats, traits, strains and mastery;
- save export and import, and §9.7's reset prompt;
- Run it back with M6's whole loadout (M6-Q7);
- a practice battle.

No rule or data changes, and no golden moves. `src/sim`, `src/run` and `data/` aren't touched, `RunState` gains no field, and `RUN_VERSION` doesn't move.

## Calls this plan makes

Each is reversible. The record's types are in the task list's Technical context.

**records-1's, agreed:**
1. **One write path.** Every write to the profile is one synchronous step: load the key's current value, apply a pure change, save. `updateRecords(storage, change)` in `src/meta/records.ts` does it, and no screen holds a copy of the record across another screen. records-2's play-time flush and M6's writes go through it too, so a key that several features share never loses an update.
2. **What Run it back reads.** Only the ended run's `commander` and `bans`, which R2b's run keeps, so Run it back carries over to rounds unchanged.
   - It builds the next run with `createRun(content, { seed: env.newSeed(), commander, bans })`, never `?seed=`.
   - Each ban stays only while `banProblem()` accepts it, and an unknown commander falls back to `DEFAULT_COMMANDER`.
   - It works wherever the summary shows, in seeded, test and prototype runs too. Only the remembered setup needs the profile.
3. **Keys and footer.**
   - `Enter`, `r` and `R` work on the summary only. They're ignored on a held key, while the settings sheet is open, and once the screen has gone.
   - One guard stops the focused button and the key from both starting a run.
   - The footer reads Title, New run (to the Underroot, no longer primary) and Run it back (primary, focused, with its keycaps).
4. **Corrupt and newer records.** A corrupt record (unparseable, or not an object with `v`) is copied raw to `spore-sprawl/profile/v1.bak`, and defaults load. M6 adds §9.7's prompt. A record whose `v` is above the build's loads read-only and is never overwritten.
5. **Who writes.** Normal play writes, on the game and on the dev site (under its `dev/` prefix). Seeded and test pages (`persist: false`) and prototype runs get no profile storage, so they neither read nor write it. M6 later lets test pages read it read-only (M6/T011).

**records-2's first guesses,** which T024 confirms against R2b as built:

6. **Recording is idempotent** on the run's key, `${seed}:${last battle's finalHash}`, because the summary renders again after a reload.
7. **Abandoned runs** are listed with outcome `abandoned`, and never count in the tallies. A run abandoned before its first battle isn't recorded.
   - A saved run that New run replaces from the title, after its confirm, counts as abandoned too. `start()` clears it without a trace today, so records-2 records it there as well as in `abandon()` (T043).
8. **Eras.** Every record is a run saved by R2b or later. If R3's kit makes earlier bests unfair to compare, each record carries its run's `RunState.v`, and the tallies keep eras apart. T024 decides.

## Stand-ins

- **Run it back on today's summary.** records-1 puts Run it back on the summary as it stands. R2b rewrites the summary and keeps `#run-it-back` and its keys (R2b/T104), and records-1's browser cases guard them.
- **The setup is the commander and bans.** M6 adds traits and strains, and M7 blights (M6-Q7). The record leaves room for them.
- **The Underroot's tabs.** Commanders and Bans stay as they are until records-2 adds the Collection tab (RB-Q4).

## Steps

1. **Agree this plan** (S0, T001–T002): X10, RB-Q1 and RB-Q2, then SPEC §9.7, §13.8 and §16 M6, `.claude/rules/storage.md`, CLAUDE.md, `docs/tasks/clarify.md` and `docs/status.md`. Docs only, one PR into `develop`.
2. **The store and Run it back** (S1, `feature/records-1-run-it-back`, T003–T012), once S0 has merged:
   - tests first;
   - `src/meta` in the pure layers;
   - the store, with `lastSetup` and `updateRecords`;
   - `RunEnv`'s profile storage;
   - `runItBackSetup`, the bridge's `seed`, `RunController.runItBack()`, and the summary's footer and keys.

   It also brings SPEC §13.2's and §13.4's lines on `src/meta` up to date, since that section follows the code.
3. **The remembered setup, and records-1's check** (S2, `feature/records-1-setup`, T013–T014, T020–T023):
   - the Underroot reads and writes `lastSetup`;
   - `npm run verify` and the browser suite;
   - the screenshots `rb/summary` and `rb/underroot`;
   - this plan's As built;
   - the user's check on the dev site.
4. **After R2b merges** (S3, `feature/records-2-base`, T024–T026, T042, T043):
   - update this plan against R2b as built, and settle RB-Q3 (unless R2a's S0 did) and RB-Q4 (T024);
   - the run records, from R2b's run;
   - recording from the summary, `abandon()` and `start()`.
5. **Play time for the whole run** (S3b, `feature/records-2-playtime`, T015, T019, T016, T017).
6. **The summary's lines and the records views** (S4, `feature/records-2-summary`, T027–T033).
7. **The codex, and records-2's check** (S5, `feature/records-2-codex`, T034–T041).

**Beside other work:**
- records-1 shares no code file with R1, which is headless tooling, or with R4a, which works on sprites and render.
- It edits `src/app/main.ts`, `src/app/run.ts` and `src/ui/screens/run.ts`, which R2a S11 and R2b rewrite around. So it should land before R2a S11 (R2a/T075) and before R2b's S0 ends (R2b/T004 stops and asks if it hasn't).

## Verification

**records-1:**
1. `npm run verify` is green, and `npm run golden -- verify` reports no change.
2. `npx vitest run tests/unit/records.test.ts tests/unit/purity.test.ts` covers:
   - the store's defaults, `lastSetup`, `updateRecords`, unknown fields, corruption and newer-version cases;
   - `runItBackSetup`;
   - `src/meta`'s purity.
3. `npm run test:browser`, with `tests/browser/records.test.ts`:
   - `Enter` and `R` start one run with the same commander and bans on another seed, and do nothing while the settings sheet is open;
   - a saved Armilla run with a ban restarts as Armilla with the same ban, and its setup is remembered;
   - the Underroot opens on the last setup after a reload;
   - seeded, test and prototype pages write no profile.

   `tests/browser/protoSaves.test.ts` passes on the moved harness.
4. The screenshots `rb/summary` and `rb/underroot` pass their Node-against-browser hash check, so the run hash didn't move, and they fit 1280×720.
5. The user's check on the dev site (T023).

**records-2:** the recording cases (T025, T042), then the task list's T038–T041: verify, the browser suite, the screenshots `rb/summary-defeat`, `rb/summary-victory` and `rb/collection`, and the user's check, with no golden moved.

## Open questions for the user

**Settled at S0** (2026-11-01): X10, RB-Q1, RB-Q2, and no v1 records.

**Later:**
- RB-Q3, what counts as active play time: at R2a's S0, or records-2's S3 at the latest.
- RB-Q4, what makes a card seen, and the Collection tab: at records-2's S3.
- #56, the word for lives in the summary lines: at R2b's S0.
- M6-Q7, Run it back with M6's whole loadout: at M6's S0. The setup record leaves room for traits, strains and blights.

## As built

**records-1,** built on 2026-11-01 in S1 ([#48](https://github.com/Swalliso/Sambattler/pull/48), T003–T012) and S2 (`feature/records-1-setup`, T013–T014 and T020–T022). It went as planned: calls 1–5 hold, and no rule, data or golden changed. Only the user's check (T023) is left. records-2 adds its part here at T040.

- **The profile store** (S1): `src/meta/records.ts` and `src/meta/index.ts`, a pure layer in `eslint.config.js` and `tests/unit/purity.test.ts`.
  - They export `PROFILE_KEY`, `PROFILE_BACKUP_KEY`, `SetupRecord`, `ProfileV1`, `loadRecords()`, `updateRecords()`, `setLastSetup()` and `runItBackSetup()`.
  - The record holds only `v` and `lastSetup`.
- **Who writes** (call 5): `runStorage()` in `src/app/main.ts` gives normal play `new BrowserStorage('')`, so the dev site keeps its own `dev/spore-sprawl/profile/v1`. Seeded, test and prototype pages get `null`: they neither read nor write the profile.
- **Run it back** (S1): `RunController.runItBack()` and the summary's footer. The footer reads Title (when the run was opened from the title), New run, and Run it back (`#run-it-back`, primary and focused, with `Enter` and `R` keycaps).
- **The remembered setup** (S2):
  - `openSetup` in `src/app/main.ts` opens the Underroot on `runItBackSetup(content, loadRecords(records).lastSetup)`.
  - Begin run saves `lastSetup` through `updateRecords()` before the run starts, and Run it back saves it too.
  - So New run, from the title or the summary, opens on the setup last begun, after a reload too.
  - A remembered commander that no longer exists falls back to Vesper, and bans the commander can't take drop.
- **Calls made while building** (also in the task list's Technical context):
  - `ProfileV1.v` is typed `number`, so a newer build's record loads with its own `v`, read-only;
  - the summary ignores a key pressed with Ctrl, Cmd or Alt, so Ctrl+R and Cmd+R still reload the page;
  - `Enter` on another focused button stays that button's;
  - `tests/browser/serve.ts` also exports `closeServers()`.
- **Verification** (records-1's list above):
  1. `npm run verify` is green. `npm run golden -- verify` passes 8 of 8 with no hash moved.
  2. `tests/unit/records.test.ts` and `tests/unit/purity.test.ts` pass, among verify's 581 unit tests.
  3. `npm run test:browser` passes 94 tests in 12 files. `tests/browser/records.test.ts` has 10 of them: 5 for Run it back (S1), and 5 for the remembered setup (S2), whose reload case runs on both the game and the dev site.
  4. The screenshots pass their assertions at 1280×720.
     - `rb/summary`: the browser's run hash matches Node's, `35aa71db199a496f`, which is the `m3-run-s7` golden's. Run it back is the primary button with its keycaps, and the footer and the banner fit.
     - `rb/underroot`: a test page, so it opens on Vesper as before.
  5. The user's check on the dev site (T023) waits on S2's merge.
