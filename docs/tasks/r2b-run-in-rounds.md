# R2b — The run in rounds: tasks

R2b finishes SPEC §16 R2's Goal: the battle in rounds that R2a built now sits "inside a run with lives". A whole run plays in rounds, from round 1's planning to the run summary, and v1's battle is deleted from the game, its tests and its tools. R2b switches the game over on `develop` in S1–S4, each an ordinary PR that keeps verify green and the game playable (X2; Call 14, settled at S0 on 2026-11-03), and the sessions after them are PRs into `develop` too. This list was drafted on 2026-11-01, made from SPEC v2 and `docs/tasks/spec-analysis.md` before R1's results, before R2a is built and before R2a's playtest.

**Status:** Agreed 2026-11-03 (S0) · **Spec:** SPEC §16 "Milestone R2 — Rounds" and the sections it cites · **Plan:** `docs/r2b-plan.md` (written in S0; R2a's is `docs/r2a-plan.md`) · **Gate in:** R2a merged into `develop`, its playtest answered, and R2a/T139 done: the user agreed to start R2b's S0 · **Gate out:** a whole run plays in rounds on the dev site, nothing from Appendix A's R2 rows remains, §16 R2 verification steps 1–9 pass in full, and the full playtest gate (step 10) has been put to the user

X1 and X2 were decided on 2026-11-02. At S0 (2026-11-03) the user dropped the cutover branch (Call 14): S1–S4 land on `develop` directly, each green and playable, and S4b is gone. S0 also refreshed this list with the user's decisions: T159–T169, US10 and S5b are new.

## Read first

- **SPEC:**
  - §0.1, §1.3 (#2, #3, #4, #5, #11, #12, #13) and §16 "Milestone R2 — Rounds", in full.
  - The run: §8.1–§8.10, §4.5, §4.6 (sprawl), §6.5, §6.6, §7.5–§7.8, §11.6, §11.7, §11.10, §2 (lives' name).
  - Saves: §8.9, §13.8.
  - The code map and what retires: §13.4, §13.5, §14.2, §14.4 (RunState, BattleRecord), §14.5, §14.6, Appendix A.
  - Tools and tests: §12.2, §12.3 (G4, G6, G8, G11, G14, G15, G16), §13.7, §15.1–§15.7.
  - §11.1 (the final key names R2a's `rounds` blocks fold into).
  - §18.2 rows #16–#35.
- **Docs:**
  - `docs/tasks/clarify.md`: X1–X10, and the sections "R2a: a battle in rounds" and "R2b: the run in rounds".
  - `docs/tasks/spec-analysis.md`: the R2b findings (A042–A207 as listed below), and the R2a findings this file's deletion work rests on (A027, A101, A102, A103, A104, A109).
  - R2a's task list (`docs/tasks/r2a-battle-in-rounds.md`), above all its Technical context (the `rounds/` table, "Files outside `rounds/` that R2a edits", "What R2b deletes", and Calls 1, 2, 19, 25, 26, 27 and 29), and `docs/r2a-plan.md`'s As built with R2a/T136's per-file test inventory: what R2a named and built.
  - R1's task list (`docs/tasks/r1-clash-check.md`): what R1 built on v1's sim, which S3 ports or deletes (R1/T007–T010, T012–T024, T029, T034–T039; T041, T151, T158).
  - R4's task list (`docs/tasks/r4-readable-armies.md`): its Call 3 (the lineup scenarios whose round-form copies R2b moves into place), R4/T009, R4/T043, and its handoff on `src/render/unitSprite.ts`.
  - `docs/status.md`, `CLAUDE.md` ("How we work", "Checks"), `.claude/rules/balance.md`, `.claude/rules/storage.md`, `.claude/rules/v1-code.md`.
  - `docs/balance-backlog.md` (R1's and R2a's results), `docs/playtest-feedback.md` (R2a's gate answers).
  - `docs/tasks/run-it-back.md`'s handoffs: records-1 touches `src/app/run.ts`, `src/app/main.ts` and `src/ui/screens/run.ts`, adds `#run-it-back` and its profile key, and merged on 2026-11-01 (T004). Under X10, records-1 records no runs and counts no play time (agreed 2026-11-01); R2a/T128's `PlayClock` is the one play-time module.
- **Code:**
  - The run: `src/run/runState.ts`, `src/run/flow.ts` (`battleConfig`, `generalKit`, `bossCounters`, `finishBattle`, `groveChoose`, `recoverPendingChoice`), `src/run/rewards.ts`, `src/run/resume.ts`, `src/run/auto.ts`, `src/run/scenes.ts`, `src/run/intel.ts`, `src/run/route.ts`.
  - The app and UI: `src/app/run.ts`, `src/app/main.ts`, `src/app/channel.ts`, `src/app/loop.ts`, `src/app/debugBridge.ts`, `src/app/tips.ts`, `src/ui/screens/run.ts`, `src/ui/screens/title.ts`, `src/ui/report.ts`, `src/ui/help.ts`, `src/ui/draftOverlay.ts`.
  - Data: `src/data/schema.ts`, `src/data/proto.ts`, `src/data/registry.ts`, `data/relics.json`, `data/events.json`, `data/commanders.json`, `data/generals.json`, `data/elites.json`, `data/upgrades.json`, `data/bots.json`, `data/balance.json`, `data/balance-targets.json`.
  - Tools and tests: `tools/sim.ts`, `tools/golden.ts`, `tools/verify.ts`, `tools/balance.ts`, `tools/experiment.ts`, `tools/bench.ts`, `tools/screenshot.ts`, `tools/lib/run.ts`, `tools/lib/balance.ts`, `tools/lib/engagement.ts`, `tools/lib/lanes.ts`, `tools/lib/spread.ts`, `tools/lib/pool.ts`, `tools/lib/params.ts`, `tests/helpers.ts`, `tests/slow/guardrails.test.ts`, `vitest.config.ts`.
  - R1's clash check (R1 creates these): `tools/lib/clash.ts`, `tools/lib/roundRace.ts`, its functions in `tools/lib/balance.ts`, `tools/lib/pool.ts` and `tools/lib/bench.ts`, `tests/unit/clash.test.ts`, `tests/unit/formation.test.ts`, and its cases in `tests/unit/counters.test.ts` and `tests/unit/combat.test.ts`.
  - R2a's modules under its `rounds/` folders (R2a's Technical context table, checked against `docs/r2a-plan.md`'s As built in T001).

## Before you start

**Decisions** (clarify refs, and the session each one blocks). All were decided at S0 on 2026-11-03, as recommended (`docs/r2b-plan.md`, "The decisions"), with #27's unit levels as R1's review gate left them. R2-Q13 was decided at T029 on S1b's table (2026-11-03: soften Mold's opener), and #17's clean-win half and #33 wait for the playtest (S14):

| Ref | Decision (recommendation) | Blocks |
|---|---|---|
| X1, X2 | R2 split in two (2026-11-02). At S0 (2026-11-03) the user dropped the cutover branch: S1–S4 land on develop directly (Call 14) | S0 |
| #32 | A run saved before R2 migrates: lives = 3 − v1 battles lost (at least 1), plots by sprawl | S1 |
| R2-Q23 | The run's kit stays a list of building ids until R3 (copy counts if X4 brought copies into R2a) | S1 |
| #16 | A boss loss ends the run; "lives left count at the boss" as a default-off knob | S1 |
| #17 | No clean-win bonus; a won battle pays each draft it skipped as an extra spoils pick; a Decision's "2 cards" is a pick of 1 from 2 | S1 (Decision spoils), S5 (skipped drafts); its clean-win half at S14 |
| #18, #21 | +1 plot per battle won, up to 4, inside R1-Q5's budget; the general opens the map's plots plus your sprawl gains | S1 |
| #20 | Planted buildings don't carry between battles | S1 |
| R2-Q14 | A boss win by Decision pays the full boss reward | S1 |
| R2-Q21 | The Grove gets an always-lit Leave choice | S1 |
| §8.7 events | Fallen Oak, Quiet Clearing's Rest and Mold Bloom as §8.7's first guesses ("none is decided"; no clarify block, so T003 settles them in the plan) | S1 |
| #56 | Lives are called Regrowths, with "lives" in the tooltip | S1 (minimal), S9 |
| R2-Q13 | A guaranteed answer in battle 1: Old Mother Mold's battle-1 opener becomes a Sporeling Burrow and a Truffle Cellar, with no opening pick (S1b's table, 2026-11-03) | S1b (measure), S5 (build) |
| #27 | v1's upgrade levels: dead levels get `offered: false`; unit levels become fixed adds | S5 |
| #28 | `plant`, `sell` and `toggleMerge` are refused while your draft is open | S5 |
| R2-Q19, #24, #26 | Relic details as a set; a round-result heal lands after the damage; the Rhizome Vault waits for R3 behind `requires` | S6 |
| R2-Q20 | Gold earned in a clash takes one path: credited at once, shown as one income row | S6 |
| R2-Q17 | The generals' passives, the Pale Sovereign's union of counter sets among them | S6 (T072's `inCounterSet`), S7 |
| R2-Q15, R2-Q16, R2-Q18 | Home Brood, Rhizome Tithe, the opening doctrine | S7 |
| R2-Q22 | A reload on the report goes to the next screen; firing the power saves the battle | S8 |
| R2-Q24 | The in-battle draft is a bottom sheet | S10 |
| #35 | G14 and G15, set from one measurement; G8 re-read beside G14 (A204). R2a set G4, G6 (both clauses), G8, G13 and G16 (R2a/T125) | S11, S12 |
| #33 | The battle-1 economy tip stays | S14 |
| X6 | The 25–35 minute run is measured, then re-set after R2b's playtest | S9, S14 |

R2a's decisions that R2b builds on, settled before R2a: X3 (R4a first), X4 (copies), X5 (the scoring curve), X7 (the answer bot), X8 (the general between cycles), X10 (records in two parts), R2-Q1 (the reveal A/B), R2-Q4 and R2-Q5 (the general's kit weights), R2-Q7 (Cordis and Puppet Bloom), R2-Q8 (display text out of the hashed state), R2-Q9 (test:slow's runtime), RB-Q3 (active play time), M6-Q1 (feat stats).

If one of those went the other way:
- **X3 no:** R4a hasn't landed. T035 keeps the unit drawer R2a made (R2a/T081) and its `TIER_SCALE`, and T048 has no lineups to port.
- **X4 yes:** the kit carries copies. T008 and T010 change its shape, and T019, T062, T065 and T067 add copies at draft time (each says how).
- **X7 no:** T122 reads fixed weights only, and G14 and G15 read one policy.
- **X8 "replace when full" as default data** (not taken: X8 went as recommended on 2026-11-02, so `data/balance.json` has both knobs off, and S12 deletes them unless S11 shows a need, T172): R2a would have turned the knob on and moved the round goldens then, and T055's data-knob case would expect `replaceWhenFull` on and `leanToLastAnswer` off.
- **X10 "all after R2b":** records-1's hooks don't exist. Drop "keep records-1's hooks" in T024, T097 and T104; T104 adds `#run-it-back` (run-it-back's US1 footer moves into R2b's summary).

**Results it needs:**
- R1's results in `docs/balance-backlog.md`, agreed by the user: the squad sizes (#7), for #27's unit levels (S5); the chosen set of rework pieces and one outcome per knob (adopt, keep as a knob, delete; A109), for S4; R1-Q5's full-colony budget, for #18's plot cap (S1).
- R2a's As built in `docs/r2a-plan.md`: its staging folders, battle scene, dev-only entry, round tools, round goldens, `tests/slow/rounds/` files, play-time store and R2a/T136's test inventory (S0).
- R2a's playtest answers in `docs/playtest-feedback.md`, and the user's tuning calls in `data/CHANGELOG-balance.md` (S0's gate).
- The battle-1 pairing table for R2-Q13: S1b's, in `docs/balance-backlog.md` (T028).

**Findings R2b must handle** (high and medium):
- A042: the opening doctrine barely touches the round-1 opener; swap its last army card (R2-Q18, T087).
- A056: the boss's first extra card for Swarm is the Sporeling Burrow, and for Line the Morel Warren, since `bossCounters` takes the cheapest building of a set that holds the swarm (T154, T155).
- A057: Puppet Bloom finds little to merge after the muster, so the Cordis smoke can fail (R2-Q7, T079, T080, T085, T089).
- A058: Old Mother Mold's "+10% units" can mean fewer bodies after the muster (R2-Q17, T086).
- A062: today's draft dialog covers the general's formation (R2-Q24, T116).
- A063: lives can't be checked on single-battle captures; add a run-scene capture (T110, T144, T157).
- A080, A105: #27's dead levels sit mid-track and strand later levels (#27, T064, T066).
- A081: the battle's end must be recorded before its report, Amber included (R2-Q22, T097, T098).
- A082: the Grove can dead-end at full lives (R2-Q21, T020).
- A083: Mycorrhizal Link, Forward Spores and the Vault have no working form in R2 (R2-Q19, #26, T073, T075, T076).
- A084: the migration needs a full field map, and the title overwrites an unreadable save (#32, T007–T012).
- A085: "+1 unit" effects scale with unit size (R2-Q15, T085).
- A096: the muster pre-empts Cordis's knit content (R2-Q7, T085).
- A097, A197: the boss is nearly always a Decision; what does it pay (X5, R2-Q14, T018, T122).
- A156: nobody owns the round tips, the Rounds tab and the round chip tooltips (X1, T117, T118; the chip tooltips are R2a/T090's).
- A199: lives rarely bind, and lives left at the boss are worth nothing (#16, #35, T021, T119, T131).
- A207: an early Rout pays less kit than a late Decision (#17, T067).
- From R2a's section, R2b's part: A101, A195, A025, A066 (the landing: X1, X2, the session order and the moves in T150, T151 and T043); A027, A103, A104 (R2a's copies, §13.4's and §15.7's gaps, the deletion inventory in T041–T046 and T151); A102 (the slow suite's runtime, T127); A109 (one outcome per knob, T059); A152 (display text, T077, T132).

**Lows** (grouped): A037, A091 (one path for clash gold, T074); A050, A054, A086 (the Sovereign's sets and the Sigil per power, T084, T086); A073 (the summary changes, T104); A074 (the title blurb and og image, T108); A079 (`scene=draft`, T115); A087 (the power save, T096); A088 (resume time, T099); A089 (BattleSave `v: 3`, T095); A090 (Rot-Eater and the Sigil follow the storm, T075); A093 (the draft stream, T065); A094 (the Tithe's kill count, T082, T083); A095 (the kit stays ids, T008); A098 (`plotsGained`, T008); A099 (Martyr's Bloom by source building, T075); A100 (the general's levels, T066); A114 (Appendix A's R2 rows, T130, T145); A117 (old `?proto=` links, T061); A201 (battle-1 pairings, T028); A204 (G8 and G14 read together, T131).

## Technical context

**Names from R2a.** R2a stages every v2 file under a `rounds/` folder, as R2a's Technical context table lists: `src/sim/rounds/`, `src/app/rounds/`, `src/ui/rounds/`, `src/render/rounds/`, `tests/unit/rounds/`, `tests/browser/rounds/`, `tests/slow/rounds/`, `tests/roundHelpers.ts`, `data/scenarios/rounds/` and `tools/lib/rounds/`. It records its As built and the per-file test inventory (R2a/T136) in `docs/r2a-plan.md`. S0 checks the table against that As built (T001). R2b moves the battle scene in S2 (T150) and the rest in S3 (T151, T043, T048, T050). A path marked "(R2a)" is one R2a creates: before its move it sits at its `rounds/` path, which S1's tasks name; after it, at the path written here. A path marked "(new)" is one this file creates.

**Where code lands:**
- **Branches.** Each session branches `feature/r2b-<short>` from `origin/develop` and opens one PR into `develop` (Call 14), as CLAUDE.md's "Pushing and merging" says. Each PR keeps `npm run verify`, the browser tests and both builds green, and leaves the game playable: from S1 on, a run plays from the title to the summary.
- **Order of the switch-over.** S1 makes the run play R2a's round battle while v1's sim still exists. S2 makes every battle entry open R2a's battle scene, moves that scene to §13.4's paths (T150) and deletes v1's battle UI and R2a's dev-only entry, so nothing outside `src/sim`, `tools` and `tests` reads v1 state. S3 deletes v1 from the sim, tools and tests, and moves R2a's sim, tests, scenarios and tool libraries into place. S4 deletes the presets of retired systems. From S5 on, every edit is in place, on a code base with one battle.
- **New files:** `docs/r2b-plan.md`, `src/run/migrate.ts`, `tests/unit/migrate.test.ts`, `tests/fixtures/saves/v1/` (fixtures recorded from v1's code), `tests/unit/flyers.test.ts` (deleted in S4c, T170), `tests/slow/runs.test.ts`, `tests/golden/r2-armilla-power-s3.replay.json`.
- **Rewritten:** `src/run/runState.ts` (RunState v2), `src/run/resume.ts` (saves between rounds), `src/run/rewards.ts`, `src/run/intel.ts`, the run screens in `src/ui/screens/run.ts`, `src/ui/help.ts`, `src/app/tips.ts`, `src/ui/draftOverlay.ts`, and the content files `data/relics.json`, `data/events.json`, `data/commanders.json`, `data/generals.json`, `data/elites.json`, `data/upgrades.json`.
- **Retired:** listed per file in T030–T061, T150, T151 and T129. The v1 files that go whole:
  - v1's battle UI, replaced by R2a's copies in T150: `src/app/{battleView,session,loop,input}.ts`, `src/ui/hud/{top,explain,tray}.ts`, `src/ui/{doctrine,inspect,report,callouts}.ts`, `src/render/renderer.ts`.
  - v1's sim files, replaced by R2a's copies in T043, and the systems with no copy: `src/sim/systems/spawning.ts`, `src/sim/systems/territory.ts`, `src/sim/systems/stance.ts`, and `src/sim/placement.ts` once nothing imports it.
  - R1's clash runner on v1's sim: `placeArmy` and `playClash` in `tools/lib/clash.ts` (T158) and `runClashBench` in `tools/lib/bench.ts` (T052). The rest of R1's clash check is ported to the round sim (T158).
  - `tools/lib/lanes.ts`, `tools/lib/spread.ts`, `tests/slow/guardrails.test.ts`, `tests/unit/territory.test.ts`, `tests/unit/combatRework.test.ts`, `tests/unit/battleFeel.test.ts`, `tests/unit/tray.test.ts` (if nothing else is left), the eight v1 goldens, five v1 scenarios and four unused test maps.
- **R2a's temporary pieces, deleted:** `scene=rounds` and the title's preview button (T032; R2a S0 dropped `ROUNDS_PREVIEW` and `--dev`, X2's R2a part, 2026-11-02); `kind: "rounds"` and `ROUND_REPLAYS` (T047); the `--rounds` switch (T050, T051); the `rounds` data blocks, folded (T129); §15's lines on them (T135).

**Reused:**
- `generalKit` (`src/run/flow.ts:155`) for the general's kit by battle index, in battles and on route nodes. No new `generalKitAt` is needed: it already takes an index.
- `recoverPendingChoice` (`src/run/flow.ts:428`) for saved prompts that name a level #27 stops offering.
- The draft offer code in `src/sim/draft.ts`, which spoils also use. Only the in-battle opening and the held clock change.
- `rowPool` in `tools/lib/pool.ts`, as the pattern for a run pool.
- `src/render/unitSprite.ts` (R4a, or R2a/T081 if R4a hadn't landed) as the one unit drawer.
- From R2a: the round state machine, `planningView` and the general's planner, the power once per clash, `incomePreview`, `RoundResult` with the `fielded` record, the per-squad stat path (A028), the counter sets (R2a/T099), the round tools, the answer bot (X7), R2a/T128's `PlayClock` (`src/app/rounds/playTime.ts`, at `src/app/playTime.ts` after T150) (RB-Q3), the round goldens and the battle-level guardrails.
- From R1: `tools/lib/clash.ts`'s army and slot builders (`squadSize`, `clashArmyIds`, `armyFromBot`, `clashField`, `lineOf`, `assignSlots`), which R2a/T116's `playRoundClash` uses, and the clash check's reports, which T158 moves onto the round sim.

**Stand-ins** (S0 copies this list into the plan's Stand-ins; each is gone by the task named):
- From S1 until S5 (T067), run battles open no in-battle drafts.
- From S1 until S6 and S7, content tied to retired systems (relics, passives) does nothing in a round battle, as R2a's compile lists it (R2a Call 19). Rhizome Tithe is refused with `notInRoundsYet` until T082.
- From S1 until S8 (T095, T096), a reload mid-battle restarts that battle at round 1's planning, with the restart notice.
- From S5 (T153) until S10 (T116), the draft is today's centred dialog, which covers the general's formation (A062).
- From S3 until S12 (T129), retired selectors and triggers still in the data compile to no-ops, their schema keys remain, and R2a's `rounds` data blocks sit beside v1's keys.
- From S1 on, each stand-in still open is on the dev site (Call 14). S1 lists them in `docs/status.md`, T152 checks the list once S4 has merged, and the session that lifts one updates it.

**Determinism and goldens:**
- S1 deletes the v1 run golden `m3-run-s7` and records `r2-run-s7` on rounds. S3 deletes the other seven v1 goldens. S5, S6 and S7 change content, so each runs `npm run golden -- update` and says so in its commit and PR. S7 records Armilla's power replay (T156). S12 regenerates every golden once more, on the final rules and after T129's fold.
- If R2-Q8 took display text out of the hashed state (R2a), rewording moves no golden. If not, a text change also needs `npm run golden -- update`.
- Play time never enters RunState or the battle state, so it never moves a hash (A185, RB-Q3).
- The storage keys never change (`.claude/rules/storage.md`). `RUN_VERSION` becomes 2 with the migration in the same PR (S1). The battle save becomes `v: 3` (A089).
- Every data change goes in `data/CHANGELOG-balance.md`, with whether the user approved it. A retune across several units waits for the user (`.claude/rules/balance.md`).

**Calls this list makes** (each reversible; S0 confirms them in the plan):
1. `migrateRun` is pure and chained by version (v1 → v2 now; R3 adds its own steps, R3-Q6: copies in R3 S2b and the upgrade fields in R3 S12b). `loadRun` tells "no save" from "unreadable save" (A084).
2. RunState stores `plotsGained` (sprawl only, 0–4), not `plots`. A battle's colony is the map's plots + `plotsGained` + plot modifiers; the general's is the map's plots + `plotsGained` (A098). SPEC §14.4 is updated to match.
3. The player's per-battle max HP is `round(heartcapPlayerHp × (1 + heartcapMaxPct) × (1 + next.heartcapMaxHpPct))`: the run-long and one-battle changes multiply.
4. Plots past the map's closed plots are dropped, since the map has no tiles for them. That is §18.2 #50's first guess, which R3 S0 settles.
5. Clash gold takes one path (R2-Q20): credited at once with a `gold` event of source `clash`, and shown as one "from the clash" row in the next income. R2a builds `pendingGold` (R2a Call 25); S6 removes it (T074). The alternative (A091): everything goes through `pendingGold`.
6. The Tithe counts kills in `ClashState.killedSupply: Record<Side, number>`: a merged unit at its own supply, an emplacement at 0 (A094).
7. The Sporestorm Sigil scales one named field per power: Spore Burst's damage (90 → 135), the Tithe's gold per supply (2 → 3), Puppet Bloom's radius (3 → 4.5 tiles) (A054, A086). Rot-Eater and the Sigil switch on at the storm's first round, which Mold Bloom moves to round 4 (A090).
8. A `requires` gate on relics and on buildings keeps content out of drafts, spoils, events and general kits until its system exists: `'combos'` for Mycorrhizal Link and the Rhizome Vault, and `'clouds'` for Forward Spores if R1 dropped spore clouds (A083, #26).
9. The battle's end is the run's node boundary: `finishBattle` runs when the battle ends, and the report reads the new BattleRecord (A081, R2-Q22).
10. "Lives left count at the boss" is a default-off `?proto=` knob, `bosslives`, for the playtest (#16, A199), which then adopts it as data or deletes it (T149, T171).
11. `scene=draft` opens round 3's planning, with the bot's rounds 1–2 played and its round-3 plan run once the player's draft resolves (A079).
12. A `?proto=` spec naming an unknown preset shows a visible notice and opens no prototype save space (A117).
13. A `melee` selector matches a unit without the `ranged` tag, for Quick Roots. SPEC §14.2 gains it in T135.
14. **No cutover branch** (S0, 2026-11-03; the user chose "Drop it, land on develop", which X2 allows). S1–S4 are ordinary PRs into develop, each green and playable, so the dev site plays the run in rounds from S1 with the stand-ins still open, listed in `docs/status.md`. No long branch drifts from develop, and S4b is dropped. `main` keeps v1's game until the user asks for a release.
15. R2a's battle scene keeps its module names at §13.4's `src/app` paths, with `src/app/phases/{planning,clash,aftermath}.ts` added to the tree (T135). R2a's `startRounds` folds into `src/app/main.ts`, its `urlParams.ts` into `src/app/urlParams.ts` and its `bridge.ts` into `src/app/debugBridge.ts`. `scene=rounds` and `scene=deploy` get the visible "not part of" message rather than an alias (T032).

## Stories

| ID | Priority | Story | Independent test |
|---|---|---|---|
| US1 | P1 | A player plays a whole run in rounds: each battle has its own Heartcaps, the run has 3 lives, a lost battle costs one and the run goes on, the Grove regains a life or lets you leave, and won battles add plots. A run saved before R2 carries on, migrated, with a notice | `npm run sim -- --run --seeds 1..20 --player bot:balanced --auto-draft greedy --auto-route random --summary`: every run completes in 4–5 battles, and none loses a life in a won battle. `tests/unit/migrate.test.ts` passes. The browser case for a v1 battle save opens round 1's planning with its notice |
| US2 | P2 | Every battle the game opens is the round battle, at §13.4's paths. v1's battle screen, its controls, its browser cases and R2a's dev-only entry are gone | `npm run test:browser` passes, and `grep -rnE "scene=(deploy|rounds)|proto=rework|hotstart|spawnTimers|\bstance\b" tests/browser` finds nothing; T040's grep for v1-only sim exports in `src/app`, `src/ui` and `src/render` finds nothing |
| US3 | P2 | The sim, the tools and the tests hold only the round battle: v1's systems, goldens, guardrails and scenarios, the presets of retired systems and R2a's `rounds/` folders are gone | `npm run verify`, `npm run test:slow` and `npm run test:browser` pass; the grep for retired names finds only the keys S12 removes; `find src tools tests data -type d -name rounds` finds nothing; `PROTO_PRESETS` equals the agreed list |
| US4 | P2 | Drafts open in the planning phases of rounds 3, 5 and 7, with v1's cards, and must be resolved before Begin | `tests/unit/drafts.test.ts` passes; a 40-seed sim with drafts on has `rejectedCommands` = 0 |
| US5 | P2 | Every relic, commander passive and power, general's passive and elite modifier has its v2 effect, or stays out of the pool until its system exists, and the boss's extra cards are real answers | `tests/unit/effects.test.ts`, `tests/unit/powers.test.ts`, `tests/unit/commanders.test.ts`, `tests/unit/ai.test.ts` and `tests/unit/run.test.ts` pass; `npm run verify`'s Armilla and Cordis smokes assert their power stats; `npm run golden -- verify` holds Armilla's replay |
| US6 | P2 | A reload resumes the planning phase as it was, or the clash's first tick; a finished battle is recorded before its report; a fired power stays fired | `tests/unit/resume.test.ts` and `tests/browser/resume.test.ts` pass; `npm run bench` reports the resume replay inside its budget |
| US7 | P3 | The run screens show lives and rounds: the title, the run bar, the Grove, the route nodes' kits and the summary's round sparklines. The link previews and the title describe the round game, and play time shows | `tests/browser/runScreens.test.ts` passes; the `r2-route`, `r2-run-planning`, summary and `r2-title` screenshots pass |
| US8 | P3 | The draft sits as a bottom sheet with the general's army in view, and Help and the first-time tips teach rounds | the draft case in `tests/browser/rounds.test.ts` (R2a's `tests/browser/rounds/rounds.test.ts`, moved in T150), `tests/unit/teachingText.test.ts` and the tip cases in `tests/browser/clarity.test.ts` pass |
| US9 | P3 | The tools measure whole runs in rounds, G14 and G15 assert in `npm run test:slow`, and the slow suite finishes in its time budget | `tests/slow/runs.test.ts` passes; `npm run balance -- tournament --commanders all` reports lives, battle 1 and the boss |
| US10 | P2 | Once your colony is full, gold buys upgrades: a planted building's squad fields one merge tier up for the rest of the battle, and the general and the bots buy them too (#67) | `tests/unit/upgrades.test.ts` passes; T163's 200 battles keep G4, G8 and G13 in band with upgrades on |

## Phase 1: Setup

- [x] T001 Check R2a's Technical context table of `rounds/` paths (`docs/tasks/r2a-battle-in-rounds.md`) against `docs/r2a-plan.md`'s As built (R2a), and record in `docs/r2b-plan.md` (new) every file R2a renamed, added or didn't build, with its battle scene's entry, its round tools' options, its round goldens, its `tests/slow/rounds/` files, its play-time store and R2a/T136's test inventory. Rename the paths in this file in the same commit (X2, §13.4)
- [x] T002 Write the rest of `docs/r2b-plan.md` in CLAUDE.md's format: Goal (§16 R2's run half), Scope (US1–US9), Stand-ins (Technical context's list), Steps (the Sessions table), Verification (§16 R2 steps 1–10), Open questions for the user (the refs in "Before you start") (§16 R2)
- [x] T003 [USER] Settle the R2b blocks of `docs/tasks/clarify.md` with the user: R2-Q14–R2-Q24 (R2-Q13 at T029, after S1b's table, unless R1's pairing table already settles it); §18.2 #16, #17's Rout-kit half and what a Decision's "2 cards" means (its clean-win half waits for T148), #18, #20, #21, #24, #26, #27, #28, #32, #56 and #35's R2b half; and §8.7's event first guesses (Fallen Oak, Quiet Clearing's Rest, Mold Bloom), recorded in `docs/r2b-plan.md` since clarify.md has no block for them. For each clarify ref, write the Decision line with the date, change the SPEC section it names in `SPEC.md` (the §18.2 row marked "(closed)"), and note it in `docs/status.md` (§18.2, §16 R2, §8.7)
  - Where the user picks an alternative, edit the affected tasks in this file before S1. Each task says what changes.
  - The SPEC wording fixes in `docs/tasks/spec-analysis.md`'s R2b table (A063, A073, A074, A089, A090, A093, A098, A114, A156) go in with them.
- [x] T004 Check that R2a's playtest answers are in `docs/playtest-feedback.md` and the user's tuning calls from them are in `data/CHANGELOG-balance.md`, and that records-1 has merged into develop (`docs/tasks/run-it-back.md`). If either is missing, stop and ask the user (§16 R2 verification 10, X1, X10)
- [x] T005 [USER] Agree `docs/r2b-plan.md` with the user, open the plan's docs-only PR into develop when the user asks and merge it when the user asks, and record the user's call on the cutover branch (Call 14) in the plan (X2, §16)

**Checkpoint:** `npm run verify` passes on the docs PR; `docs/r2b-plan.md` is agreed and Call 14 is settled.

## Phase 2: Foundational (blocks every story)

These tasks land in S1's PR together with US1, so `RUN_VERSION` 2 and the migration arrive with the first change to RunState's shape.

- [x] T006 Record v1 save fixtures in `tests/fixtures/saves/v1/` (new) from today's code, before anything in the run changes: one `spore-sprawl.run.v1` record per screen (route, battle, spoils with an `up:` card, event, grove, prompt, summary), one after Fallen Oak, one after a Decision loss, one v1 BattleSave (`v: 2`) taken mid-battle, and one legacy BattleSave (no `v`). Make them with a throwaway script run against `createRun`, `simulateRun` and `battleSave`, kept out of the repo; commit only the JSON and `tests/fixtures/saves/v1/README.md` (new) naming the commit and seeds (§8.9, §16 R2 verification 6)
- [x] T007 Write `tests/unit/migrate.test.ts` (new) first, on T006's fixtures (§8.9, §16 R2 verification 6) ⛔ §18.2 #32
  - Every run fixture loads migrated, never null. The kit, relics, upgrades, path, route, Spores, Amber, rng streams and intel are kept.
  - `lives` = {left: max(1, 3 − v1 battles lost), max: 3}; Fallen Oak's max becomes `heartcapMaxPct` −0.15 (`heartcap.max / heartcapPlayerHp − 1`); `next.sporestormShiftSeconds` −60 becomes `sporestormShiftRounds` −1; `plotsGained` = min(4, battles won), clamped to #18's cap.
  - v1 BattleRecords become v2 with `rounds: []` and `lifeLost = (winner === 'enemy')`. A v1 counter record's round is `floor(activeAt / 1200) + 1`.
  - A `battle` screen's embedded v1 config is rebuilt by `battleConfig` from its route node; a pending Quiet Clearing Rest (`repairPct`) becomes `nextBattle.heartcapMaxHpPct` 0.15.
  - Corrupt JSON and an unknown `v` give an "unreadable" result with its notice, never a fresh run. A `v: 2` record passes through unchanged.
  - If #32 is "end it with a notice": the run moves to its summary with the notice, and no battle is recorded as lost.
- [x] T008 Define RunState v2 in `src/run/runState.ts` (§14.4, §8.5, §4.6) ⛔ R2-Q23, §18.2 #18
  - `RUN_VERSION` 2. `lives: {left, max}` from T009's `lives` replaces `heartcap`. Add `heartcapMaxPct` and `plotsGained` (A098); `next` becomes `{startingGold, sporestormShiftRounds, heartcapMaxHpPct}`.
  - `kit: string[]` stays (A095). If X4 brought copies into R2a, the kit becomes `KitCard[]` (`{building, copies}`, R2a/T033's type, §14.2) and T010 maps starters ×2 and the rest ×1 (R2-Q23's alternative).
  - BattleRecord v2 per §14.4: add `rounds: RoundResult[]`, `heartcaps: Record<Side, {max, end}>` (missing on a battle migrated from v1, whose Heartcap was the run's) and `lifeLost`; drop `durationTicks`, `front`, `mapWidth`, `heartcapBefore` and `heartcapAfter`. `CounterRecordBrief` becomes `{kind, round, drafted?, sold, built}`.
  - `RunScreen`'s battle holds R2a's round BattleConfig (`src/sim/rounds/state.ts`, R2a; `src/sim/state.ts` from T043).
- [x] T009 Read the run's lives from R2a's `balance.rounds.lives` (3, R2a/T008) in `src/run/runState.ts` and `src/run/flow.ts`; add no key. Leave `routRepair`, `decisionLossDamage` and `groveRepair` in `data/balance.json` until T129, since v1's code still reads them until S3 (§8.5, §11.1)
- [x] T010 Build `migrateRun(content, raw): {kind: 'run', run, notice?} | {kind: 'unreadable', notice}` in `src/run/migrate.ts` (new), pure and chained by version, with T007's field map, and export it from `src/run/index.ts` (§8.9, §13.8, §14.4) ⛔ §18.2 #32
- [x] T011 Change `loadRun` in `src/run/resume.ts` to return `{kind: 'none'} | {kind: 'run', run, notice?} | {kind: 'unreadable', notice}` through `migrateRun`, instead of null on a version mismatch (`resume.ts:24`) or bad JSON (`resume.ts:27-29`). The keys stay `spore-sprawl.run.v1` and `spore-sprawl.battle.v1` (§8.9, §13.8)
  - Update every caller to the `{kind}` result: `src/app/main.ts:207` and `:240` (T012), `tests/unit/commanders.test.ts:78`, and `tests/unit/run.test.ts:346`, `:359`, `:390`, `:418`, `:489` and `:493`.
- [x] T012 Make the title tell an unreadable save from none in `src/app/main.ts`: Continue names its row and lives ("Row 3 of 6 · 2 Regrowths", `main.ts:211`); a migrated run shows its notice in a status line (`#run-notice`, `role=status`); New run over an unreadable save asks before overwriting it (`main.ts:214`); `startRun` reads the new `loadRun` (`main.ts:240`) (§8.9, §10.5) ⛔ §18.2 #56

**Checkpoint:** `npx vitest run tests/unit/migrate.test.ts` passes. These tasks don't merge alone: they go in S1's PR with US1.

## Phase 3: US1 — The run plays rounds, with lives (P1)

**Goal:** a run of battles in rounds on R2a's battle scene, with per-battle Heartcaps, 3 lives, sprawl, v2 rewards, v2 events and the Grove's three choices. **Independent test:** `npm run sim -- --run --seeds 1..20 --player bot:balanced --auto-draft greedy --auto-route random --summary` completes every run in 4–5 battles with no life lost in a won battle, and `/?scene=run&seed=7&test=1` plays battle 1 in rounds in the browser.

- [x] T013 [P] [US1] Rewrite the run cases in `tests/unit/run.test.ts` (§8.5, §8.6, §8.7, §6.5, §7.6) ⛔ §18.2 #16, §18.2 #17, §18.2 #18, §18.2 #21, R2-Q14, R2-Q21
  - Replace "Heartcap carryover" (`run.test.ts:184`) with: a battle lost by Rout or by Decision costs one life, and a won battle none; after a loss the run goes on to the next row with no spoils and 0 Spores, earlier Spores kept and intel updated; the run ends at 0 lives; a boss loss ends it (#16).
  - A boss win by Decision pays 60 Spores and +2 Amber (R2-Q14). A Decision win's spoils are a pick of 1 from 2 cards (#17).
  - Each battle's player Heartcap starts at its max: 3000, 2550 after Fallen Oak, and +15% for one battle after Quiet Clearing's Rest. Battle configs carry no `heartcapHp`.
  - `plotsGained` rises by 1 per won battle up to 4 (#18), and both colonies open the map's plots + `plotsGained` (#21). Both colonies start empty (#20).
  - The Grove: a life up to the max, refused at full lives; graft through a prompt; Leave always taken. Mold Bloom: the next battle's storm starts at round 4 with +150 gold, then resets.
  - The battle profile is the mean of the per-round kind scores over `rounds[].fielded.player`, skipping empty rounds; the update is ½ / ½.
  - Delete the two v1 mid-battle save cases (`run.test.ts:496`, `:524`): they test a retired format (Appendix A, "Mid-battle saves from the command log").
- [x] T014 [P] [US1] In `tests/browser/resume.test.ts`, write T006's v1 BattleSave and its run under `RUN_KEY` and `BATTLE_KEY` (the default-mode server's keys, with no `dev/` prefix), open `scene=run` and see round 1's planning (`__GAME__.phase` `planning`, round 1) with `#save-recovery` (`role=status`), the run's row and kit kept and the battle key cleared. Delete the cases that resume a v1 mid-battle save or a held draft (§16 R2 verification 6, §8.9, §15.6)
- [x] T015 [P] [US1] Update the cases in `tests/browser/runScreens.test.ts` that read the run's Heartcap: the title's Continue names row and lives, the Grove shows three choices, and the summary has no Length, Heartcap or Front line columns (§10.5, §8.8)
- [x] T016 [US1] Rewrite `battleConfig` in `src/run/flow.ts` (`flow.ts:68-124`) for R2a's round config (§4.5, §4.6, §6.1, §7.8, §8.5) ⛔ §18.2 #18, §18.2 #20, §18.2 #21
  - The player: max HP by Technical context's call 3, no `heartcapHp`, the run's kit, upgrades, relics and commander, and `plotsGained`.
  - The general: max HP by R2a's rule (`heartcapEnemyHp` in `data/balance.json`: 2000 + 250 × (i − 1), the boss 3600, Fortified via its modifier) or X5's answer; its kit and levels from `generalKit`; the same `plotsGained` (#21); the weight-1 rule for unlisted run-kit cards (`flow.ts:104-107`, R2-Q4).
  - Starting gold 300 + 75 × (i − 1) + `next.startingGold`. The storm's start round (§14.2's `battle.sporestormStart`, which R2a/T047 tests at round 4) is `balance.rounds.sporestorm.startRound` (5) + `next.sporestormShiftRounds`, carried as a `battle.sporestormStart` modifier, which R2a's compile already reads as a round (`src/sim/rounds/compile.ts`), so the config gains no field (S1).
  - Both colonies empty (#20). `flags.drafts` off until T067. Delete `hotStart` (`flow.ts:112-115`).
- [x] T017 [US1] Rewrite `finishBattle` in `src/run/flow.ts` (`flow.ts:224-292`) for the round BattleState: read `outcome {winner, by, round}` and `rounds`; write BattleRecord v2; a loss costs one life (`lifeLost`) and pays nothing; the run ends at 0 lives or on a boss loss; a win pays Spores and spoils and adds `plotGrowth.perWin` to `plotsGained`, up to `plotGrowth.max` (R2a's `balance.rounds.plotGrowth {perWin 1, max 4}`), capped by #18; reset `next`; intel updates after a loss too. Delete the repair lines (`flow.ts:235-240`) and `frontSamples` (`flow.ts:214`) (§8.5, §8.6, §4.6, §7.6) ⛔ §18.2 #16, §18.2 #18
- [x] T018 [US1] Rewrite `battleRewards` in `src/run/rewards.ts`: drop `heartcapPct`, `heartcapZero`, `routRepair` and `decisionLossDamage` from `RewardRules` and the result (`rewards.ts:13-20`, `:34-39`); a boss win pays 60 Spores and +2 Amber by Rout or Decision; a Decision win's spoils pick is 1 of 2 cards. Update the callers in `src/run/flow.ts` (`flow.ts:206-210`) (§8.6, §6.5) ⛔ R2-Q14, §18.2 #17
- [x] T019 [US1] Rewrite the run effects in `src/data/schema.ts` (RunEffect, `schema.ts:676`) and `data/events.json`, and log the change in `data/CHANGELOG-balance.md`, with the events by T003's plan call (§8.7, §14.2) ⛔ X4
  - `gainLife` replaces `repairPct`; `maxHpPct` writes `heartcapMaxPct`; `nextBattle.sporestormShiftRounds` and `nextBattle.heartcapMaxHpPct` replace `sporestormShiftSeconds`.
  - `fallen-oak`: kept, its text saying every later battle's Heartcap starts 15% lower. `quiet-clearing`: Rest is `nextBattle.heartcapMaxHpPct` 0.15; Forage keeps v1's random level until R3. `mold-bloom`: `sporestormShiftRounds` −1 with +150 gold, its text "the Sporestorm starts at round 4".
  - `spore-merchant` and `twin-spores` keep v1's upgrade effects until R3. `burn-the-notes`, `hungry-roots` and `amber-seep` are kept.
  - Under X4 (copies in R2a): Twin Spores adds 1 copy of a card you choose, and Spore Merchant removes all copies of the card it takes (§8.7). If X4 is no, none of this.
- [x] T020 [US1] Give the Grove three choices in `src/run/flow.ts` (`flow.ts:343-357`) and `src/run/auto.ts` (`auto.ts:45-80`): `groveChoose(content, run, 'life' | 'graft' | 'leave')`, where a life is +1 up to the max and refused at full lives, graft is v1's +1 level through a prompt, and leave is always allowed; `resolvePending` (`flow.ts:510`) applies `gainLife` and the next-battle effects; `autoDecide` takes a life if hurt, else graft, else leave, and `outcomeValue` scores `gainLife` and next-battle max HP (§8.7, A082) ⛔ R2-Q21
- [x] T021 [US1] Add the default-off knob "lives left count at the boss" in `src/data/proto.ts` (preset `bosslives`: `livesAtBoss.heartcapPerLife` 250) and `src/data/schema.ts`, read by `battleConfig` in `src/run/flow.ts`, which adds 250 × `lives.left` to the player's boss Heartcap. It stays absent from `data/balance.json` (§8.5, §12.4, A199) ⛔ §18.2 #16
- [x] T022 [US1] Build the battle profile from the fielded record in `src/run/intel.ts` (`intel.ts:13-21`): the mean of the five kind scores (Anti-Ranged among them, #14) from `analyzeFielded` in `src/sim/rounds/ai/counter.ts` (R2a/T099) over `rounds[].fielded.player`, skipping rounds with nothing fielded, for every battle. The update rule, the boss's unweighted mean, Burn the Notes and `intelDots` stay (§7.6)
- [x] T023 [US1] Play runs headless on rounds in `src/run/auto.ts` and `src/run/scenes.ts`: `autoBattle` queues no `begin` (`auto.ts:116`), since a player-side bot plans and queues `beginClash` in the round's opening (§14.6); `RunResult` swaps `heartcap` for `lives` and sums clash ticks from the rounds (`auto.ts:122-177`); `runForScene` builds v2 runs (§15.2, §13.5)
- [x] T024 [US1] Open run battles on R2a's battle scene in `src/app/run.ts` (§8.9, §13.5, §10.2)
  - `startBattle` (`run.ts:206-242`) creates the round battle from the run's config and opens it through `startRounds` in `src/app/rounds/main.ts` (R2a/T076, the function behind `scene=rounds`), extended to take a BattleConfig, the run's lives (for T106's top band) and an `onEnded` hook. The imports of v1's `BattleView`, `bindInput`, `GameLoop` and `Session` (`run.ts:23-27`) go. Bots get no queued `begin` (`run.ts:230-231`). `rewardsOf` (`run.ts:245-255`) uses T018's rules.
  - The report is R2a's (`src/ui/rounds/report.ts`, R2a/T096), with Continue in place of Again and Rematch in a run. Its Continue still calls `finishBattle` until T097 moves it to the battle's end.
  - No battle saves yet: remove the `saveBattle` calls at `run.ts:75` (on hide), `:88` and `:236` (on wave steps) until T096. A battle save found at `startBattle` is cleared, and the battle opens in round 1's planning with the notice "The saved battle could not be restored. This battle restarted from round 1's planning; your run progress is preserved." (`run.ts:227`).
  - Keep records-1's hooks in `RunController` (`docs/tasks/run-it-back.md`).
- [x] T025 [US1] Take the run's Heartcap off the run screens in `src/ui/screens/run.ts` and `src/app/debugBridge.ts` (S9 finishes them) (§10.5, §8.8) ⛔ §18.2 #56
  - The run bar shows one cap icon per life, lit for each one left (`run.ts:46-63`). Event chips and the result diff use lives and `heartcapMaxPct` (`run.ts:293`, `:371-400`).
  - The Grove shows three cards: Regain a Regrowth (unlit at full lives, with its reason), Graft and Leave (`run.ts:480-489`).
  - The summary drops Length, Heartcap before → after and the front-line sparkline (`run.ts:519-576`), and shows each battle's outcome, how it was decided and lives lost. The spoils screen's rules drop the repair terms (`run.ts:97`).
  - The bridge's `run()` reports lives (`debugBridge.ts:14`, `:60`).
- [x] T026 [US1] Move the run tools onto rounds in `tools/sim.ts`, `tools/lib/run.ts`, `tools/lib/engagement.ts` and `tools/lib/balance.ts`: `--run` plays v2 runs; its summary reports runs won, the boss reached and lives left (`sim.ts:236`, `:254-277`); engagement counts lives instead of full-HP wins (`engagement.ts:184-187`); `commanderTournament` reads lives; the run results drop `durationTicks` and `heartcap` (§15.2, §15.3)
- [x] T027 [US1] Replace the v1 run golden: delete `tests/golden/m3-run-s7.replay.json`, add `r2-run-s7` to `RUN_REPLAYS` in `tools/golden.ts` (`golden.ts:54-56`), record it with `npm run golden -- update`, and say so in the commit. T126 and T132 record it again (§15.5)

S1b (the battle-1 measurement):

- [x] T164 [US1] Set the round cap to one fixed 750 for both sides (#68, the user, 2026-11-03): `balance.rounds.roundDamageCap` in `data/balance.json` becomes `{ "flat": 750 }`, which S18's code already reads. The `round-damage-cap` scenario, `scoring.test.ts`'s cap cases and any text that names the cap as a share follow, and `npm run golden -- update` moves the round goldens. Log it in `data/CHANGELOG-balance.md` (§6.7, D28)
- [x] T028 [US1] Measure battle 1 per commander and battle-1 general for R2-Q13, unless R1 recorded the table: `npm run sim -- --run --seeds 1..100 --player bot:balanced --commander <c> --auto-draft greedy --auto-route random --power-policy auto --summary` for Vesper, Armilla and Cordis, read by the battle-1 general (Old Mother Mold, the Lichen Baron). Write the table in `docs/balance-backlog.md`, noting that run battles have no in-battle drafts yet and Armilla's Tithe is refused until T082 (§7.8, §8.1, §12.3 G14, A201)
- [x] T029 [US1] [USER] Put R2-Q13 to the user with T028's table, and record the decision in `docs/tasks/clarify.md`. If the user adopts the opening pick, agree its building list for T068 (§8.3, §12.3) ⛔ R2-Q13

**Checkpoint:** `npm run verify` (v1's single-battle smokes and the round goldens still pass), `npx vitest run tests/unit/run.test.ts tests/unit/migrate.test.ts`, `npm run test:browser`, both builds, and the US1 sim command: every run completes in 4–5 battles and none loses a life in a won battle. S1b ends with T028's table in `docs/balance-backlog.md`.

## Phase 4: US2 — One battle screen (P2)

**Goal:** every battle the game opens is R2a's round battle, R2a's battle scene sits at §13.4's paths, and v1's battle UI and R2a's dev-only entry are deleted, so nothing outside `src/sim`, `tools` and `tests` reads v1 state. **Independent test:** `npm run test:browser` passes, US2's grep of `tests/browser` finds nothing, and T040's grep finds nothing.

- [x] T030 [P] [US2] Port the browser suite off deploy and ticks in `tests/browser/hud.test.ts`, `tests/browser/clarity.test.ts`, `tests/browser/inspect.test.ts`, `tests/browser/commanders.test.ts`, `tests/browser/settings.test.ts`, `tests/browser/scale.test.ts`, `tests/browser/sound.test.ts`, `tests/browser/runScreens.test.ts` and `tests/browser/protoSaves.test.ts`: every `scene=deploy` and `ticks=N` URL opens `scene=battle` with R2a's `round=` and `phase=` (§15.6)
  - Retire the cases for retired controls: hud's "F says when Hold is ready" and its two `proto=rework` loops (`hud.test.ts:67`, `:259`), clarity's spawn timers (`clarity.test.ts:275-278`), the deploy hint and the forward plot's price; "not your territory" becomes a plot reason. Delete runScreens' "a power under the rework" case (`runScreens.test.ts:178`).
  - Switch `protoSaves.test.ts`'s `PROTO` from `hotstart` (`protoSaves.test.ts:11`) to `b3`, a preset that stays (T055).
  - `tests/browser/frame.test.ts` is kept. Where R2a has a file of the same name under `tests/browser/rounds/` (`hud`, `inspect`, `commanders`), T150 joins the two.
  - As built (S2): `PROTO` lives in `tests/browser/serve.ts`. The joined files keep R2a's cases and add v1's that still hold (the tray's fit and unlit cards, the ghost tip, the cog, the inspector's focus, the Elder's pips, the Underroot). Also retired with v1's battle: clarity's first-time tips and relics popover, and hud's battle-1 economy tip, which T118 brings back in rounds.
- [x] T031 [P] [US2] Retire the v1 cases of the UI unit tests whose modules T150 replaces, in `tests/unit/tray.test.ts`, `tests/unit/teachingText.test.ts`, `tests/unit/report.test.ts` and `tests/unit/settings.test.ts` (§15.7, §10.5)
  - `tray.test.ts`: `cheapestPrice` and the forward plot. Delete the file if nothing else is left (R2a's tray cases are in `tests/browser/rounds/inspect.test.ts`).
  - `teachingText.test.ts`: Hold, waves, stormWaves and the territory, supply and wave tips (`teachingText.test.ts:101-123`). R2a's `tests/unit/rounds/teachingText.test.ts` (R2a/T087) moves over it, keeping v1's Help cases.
  - `report.test.ts`: the front-line and turret rows, the `protoContent('breach')` case (`report.test.ts:39`) and every use of `liveState`. R2a's `tests/unit/rounds/report.test.ts` (R2a/T092) moves over it.
  - `settings.test.ts` adds: a record with `spawnTimers` loads and drops it on save.
- [x] T032 [US2] Open every battle entry on R2a's battle scene in `src/app/main.ts` and `src/app/urlParams.ts`: `scene=battle`, `scene=report` and battle parameters without a scene open it; `scene=deploy` and `scene=rounds` give the visible "not part of" message (`main.ts:93-95`, Call 15). Delete R2a's temporary entry: the `scene=rounds` branch and its dynamic `import()` from `src/app/main.ts` (`main.ts:124`; R2a never built `ROUNDS_PREVIEW`, T001), and the title's "A battle in rounds (preview)" button from `src/ui/screens/title.ts` (R2a/T075, R2a Call 2). `DEV_SITE` keeps `storageKey()`, `protoSpace()` and the build tag (§15.6, §10.5, X2)
- [x] T150 [US2] Move R2a's battle scene into place with `git mv`, deleting each v1 namesake first (§13.4, §13.5, X2, A066)
  - `src/app/rounds/{loop,session,input,battleView}.ts` over `src/app/`, and `src/app/rounds/phases/` to `src/app/phases/` (Call 15). Fold `src/app/rounds/main.ts`'s `startRounds` into `src/app/main.ts`'s battle branch, `src/app/rounds/urlParams.ts` into `src/app/urlParams.ts`, and `src/app/rounds/bridge.ts` into `src/app/debugBridge.ts`. `git mv src/app/rounds/playTime.ts src/app/playTime.ts` (R2a/T128's `PlayClock`, the one play-time module; records-1 builds none under X10); T151 moves its test.
  - `src/ui/rounds/hud/{top,explain,tray}.ts` over `src/ui/hud/`, `src/ui/rounds/hud/tally.ts` to `src/ui/hud/tally.ts`, and `src/ui/rounds/{doctrine,inspect,report,callouts}.ts` over `src/ui/`, and S13's styles, `src/ui/rounds/rounds.css`, to `src/ui/battle.css` (T001).
  - `src/render/rounds/renderer.ts` over `src/render/renderer.ts`, and `src/render/rounds/{preview,aftermath,unitLook}.ts` to `src/render/` (`unitLook.ts` is S21b's T160, T001).
  - `tests/browser/rounds/*.test.ts` into `tests/browser/`, every `scene=rounds` URL becoming `scene=battle`. Where a v1 file has the name (`hud`, `inspect`, `commanders`), one file holds R2a's cases and T030's ported ones.
  - Fix the imports in `src`, `tools` and `tests`. `src/app/rounds/`, `src/ui/rounds/` and `src/render/rounds/` are gone; the sim stays at `src/sim/rounds/` until T043.
- [x] T033 [US2] Strip v1's battle code from the `src/app` files R2a didn't replace. T150 replaced `battleView.ts` (the deploy hint, stance rows, the power's cooldown ring and "Ready at m:ss", and `NUDGE_AT_SECONDS`, `battleView.ts:40`, which T118 replaces), `session.ts` (`legalPlacements`, `priceAt`, `depthOf`, `footprintOnLoam`, `heldColumns`, `surgeLanes`, `frontier`, the stance methods), `loop.ts` (`state.held` and `draftCommandDue`, `loop.ts:49`) and `input.ts` (the F key, Hold, placing while live) whole (§10.2, §10.3, §13.5, Appendix A)
  - `src/app/main.ts`: v1's battle start and the `deploy` branch.
  - `src/app/urlParams.ts`: v1-only battle parameters, such as `ticks` counted from a battle's start with no `round`.
  - `src/app/debugBridge.ts`: v1-only fields, beside the fields folded in from R2a's `bridge.ts`.
  - `src/app/run.ts`: anything left that reads v1 battle state.
- [x] T034 [US2] Strip v1's HUD and panels from the `src/ui` files R2a didn't copy. T150 replaced `src/ui/hud/top.ts` (the territory `LaneTug`, the supply, wave and beat chips, `incomePerMinute`, `columnsOwned`), `src/ui/hud/explain.ts` (`territoryTip`, `supplyTip`, `waveTip`, `beatTip`, `waitingUnits`, `nextWaveTypes`, `isSuppressed`), `src/ui/hud/tray.ts` (`cheapestPrice`, `legalPlacements`), `src/ui/doctrine.ts` (the countdown), `src/ui/inspect.ts` (`isBesieged`, Next spawn, building HP), `src/ui/report.ts` (`frontLineGraph`, the turrets row, the battle-length clock) and `src/ui/callouts.ts` whole (§10.2, §10.4, Appendix A)
  - `src/ui/cards.ts`: `buildingOutput`'s "2 / 16 s". `src/ui/buildingInfo.ts`: the turret line (`buildingInfo.ts:78`). `src/ui/matrixHints.ts`: the turret hint (`matrixHints.ts:30`). `src/ui/hud/kit.ts`: anything that reads v1 state.
  - `src/ui/words.ts`: v1-only rewordings, such as the power's cooldown (`words.ts:71`).
  - `src/ui/draftOverlay.ts`: it opens on the side's `draft` in the round state, not `held` (`draftOverlay.ts:46`), typed on R2a's state. Nothing opens it until T153.
  - `src/ui/styles.css`: `.tug`, `.stance`, `.beat` and the deploy hint.
  - Keep any v1 callout that v2 still has and R2a's lane lacks.
- [x] T035 [US2] Keep `src/render/unitSprite.ts` (R4a) as the one unit drawer for the renderer T150 moved in, with R4a's pips (X3, R4's handoff). v1's `src/render/renderer.ts` went in T150, with `bakeTerritory`, `drawCapture`, `drawRally`, the turrets and `turretPos`, `frontier` and `frontierBlocked`, `lanePresence`, `holdsLane` and `rallyX`, the besieged, holding and stored glyphs and the spawn timers. Turn the territory tugbar in `src/render/assistPreview.ts` into R2a's tally pips with the Rot's hatch (§13.6, §10.4)
  - If X3 is no, the drawer is the one R2a/T081 made, and it keeps `TIER_SCALE`.
- [x] T036 [US2] Remove the spawn-timers setting from `src/ui/settingsScreen.ts` (`settingsScreen.ts:38`, `:178-179`) and `src/app/settings.ts` (`settings.ts:28`, `:53`): a saved `spawnTimers` loads and is dropped. The key `spore-sprawl/settings/v1` stays (§10.5, §13.8)
- [x] T037 [US2] Remove every v1-only reference from `src/app/tips.ts` (Hold, waves, the frontier, the power's cooldown at `tips.ts:99`) and `src/ui/help.ts` (forward building, holds, waves, full refund within seconds), so neither imports a v1-only export. T117 and T118 write their round text (§10.5, §15.7)
- [x] T038 [US2] Play battle sounds by phase in `src/app/battleSound.ts` and `data/sounds.json`, unless R2a's scene already does: drop `spawned`, `columnFlipped`, `buildingDestroyed`, `counterWarned`, `counterActive`, `sporestorm`, `wave` and v1's `ended` (`battleSound.ts:48-92`); planning, clash and aftermath sounds per §13.9; rewrite the battle-sound cases in `tests/unit/audio.test.ts` (`audio.test.ts:200-255`) for v2's events (§13.9, §15.7)
  - As built (S2): R2a's scene played none, so `RoundsView` feeds `BattleSound` and its bottom band has the speaker button again. Six new ids copy the retired sounds they replace (`arrive`, `plan`, `counter`, `power`, `lane-won`, `lane-lost`), in `REQUIRED_SOUNDS` too; T129 drops the retired ids.
- [x] T039 [US2] Make `tools/screenshot.ts` capture the round battle at its final scenes: R2a's captures move from `scene=rounds` to `scene=battle` (R2a has no `--dev` mode since its S0), and every battle scene's expected hash comes from R2a's `roundStateForParams` (`tools/lib/rounds/params.ts`, R2a/T080). Remove v1's assertions: the supply check (`screenshot.ts:199`), the Intent panel's "must stay vague" check (`:212`) and the countdown check (`:219`). Drop the queued `begin` for bots in `tools/lib/params.ts` if R2a left it (§15.6)
- [x] T040 [US2] Check the cut: `grep -rnE "\b(columnsOwned|supplyUsed|stance|stanceRows|stanceShown|laneStance|waveTicks|turretPos|legalPlacements|priceAt|depthOf|heldColumns|surgeLanes|powerCooldownTicks|powerFirstReadyTicks|incomePerMinute|isBesieged|isSuppressed|lanePresence|frontier|frontierBlocked|holdsLane|rallyX|draftCommandDue)\b|\.held\b" src/app src/ui src/render` finds nothing, `find src/app src/ui src/render -type d -name rounds` finds nothing, and `npm run build` and `npm run build:dev` pass (§13.2, Appendix A)
- [x] T167 [US2] Place a card on its plot only (S21b's note; the user, 2026-11-03: "stick to just having the user place the buildings"): with a card chosen, hovering or clicking a squad's spot in the field no longer places it, in the planning input (`src/app/input.ts` and `src/app/phases/planning.ts` after T150), with a case in `tests/browser/planning.test.ts` (§10.2)
  - As built (S2): the snap lived in `RoundSession.plotAt` (`src/app/session.ts`) and the preview's `plotUnder` (`src/render/preview.ts`); with a card chosen, neither reads your slots now.

**Checkpoint:** `npm run verify`, `npm run test:browser`, both builds, and R2a's screenshot commands on `scene=battle` pass; a run and a single battle both play in rounds.

## Phase 5: US3 — v1 is gone from the sim, the tools and the tests (P2)

**Goal:** only the round battle is left: v1's systems, the v1 parts of the files R2 keeps, v1's goldens, guardrails, scenarios and tests, the presets of retired systems and R2a's temporary switches are deleted; R2a's sim, tests, scenarios and tool libraries sit at §13.4's paths; and R1's clash check plays on the round sim. **Independent test:** `npm run verify`, `npm run test:slow` and `npm run test:browser` pass; T158's two clash-check commands run; T054's grep finds only the schema and data keys T129 removes; `find src tools tests data -type d -name rounds` finds nothing; `PROTO_PRESETS` equals the agreed list.

S3 (the systems):

- [x] T041 [US3] Delete v1's unit tests and cases in `tests/unit/`, file by file, following R2a/T136's inventory in `docs/r2a-plan.md`. Where R2a put the round cases in a file under `tests/unit/rounds/`, T151 moves it over its v1 namesake (§15.7, A104)
  - Delete whole: `tests/unit/territory.test.ts`, `tests/unit/battleFeel.test.ts` (if R2a hasn't), `tests/unit/combatRework.test.ts` (the kept pieces' cases live in `tests/unit/damage.test.ts` and `tests/unit/combat.test.ts` since R2a/T013; T056 writes the flyer cases again).
  - `tests/unit/prototypes.test.ts`: delete every case built on `liveState` or `config.test` (`prototypes.test.ts:25-394`, among them `protoContent('b1,b3,b4,a2,a3')`, `hold`, `nohold`, `t1`, T2's fall-back, T3's spawner defense and `diverleap`); keep the spec parser; rewrite A2's and B3's cases on the round helpers. T055 finishes the file in S4. (S3: no battle in rounds reads A2's or B3's key, so only their presets' keys are checked; see the plan's "What S3 left".)
  - `tests/unit/healing.test.ts` (it imports `liveState`): delete it if R2a's `tests/unit/rounds/combat.test.ts` covers healing (R2a/T035), else rewrite it on the round helpers (§15.7 Combat: healing kept).
  - `tests/unit/counters.test.ts`: point `evaluateCounters`, `evaluateG3` and `g3Row` at R2a's round counter matrix (`tools/lib/rounds/balance.ts`, at `tools/lib/balance.ts` after T050) (§15.7 Counter matrix: kept).
  - `tests/unit/economy.test.ts`: the income tick, besieged halving, the supply line, comeback by columns, `priceAt`.
  - `tests/unit/buildings.test.ts`: first-spawn timing, the supply-cap hold, besieged and `isBesieged`, the sell timer, `legalPlacements`.
  - `tests/unit/endings.test.ts`: the 10:00 limit and the columns tiebreak.
  - `tests/unit/powers.test.ts`: the cooldown and first-ready `it.each`, the Rhizome Surge block (`powers.test.ts:107-136`), the `surger` fixture, the Tithe per column, Vesper's and Armilla's v1 passives, `frontier`.
  - `tests/unit/ai.test.ts`: the spawn-mix analysis, `warnedAt` and `activeAt`, the live think, the stance policy, lanes by border, `legalPlacements`; the Vault and Exchange cases move to `tests/unit/buildings.test.ts` and `tests/unit/economy.test.ts` if they still hold.
  - `tests/unit/drafts.test.ts`: the in-battle wave block, "four drafts per full battle" and the held clock (T062 writes the round block).
  - `tests/unit/effects.test.ts`: the `waveStart`, `buildingDestroyed`, `zone`, adjacency and `repairHeartcapPct` cases.
  - `tests/unit/resume.test.ts`: every v1 BattleSave case (deploy, held tick, legacy save).
  - `tests/unit/merging.test.ts`: presence and `lanePresence`. `tests/unit/combat.test.ts`: siege preferring buildings and the Heartcap (`combat.test.ts:33`) and "deaths free supply". `tests/unit/damage.test.ts`: the Heartcap's storm vulnerability (`damage.test.ts:35`).
  - `tests/unit/run.test.ts`: the `legalPlacements` use. `tests/unit/scenarios.test.ts`: the v1 scenarios T048 deletes. `tests/unit/report.test.ts` was done in T031.
  - R1's tests that run on v1's sim (§12.2: from R2 every tool measures the real loop):
    - `tests/unit/clash.test.ts` (R1): delete `placeArmy`'s cases (R1/T013's last two) and the runner and record cases (R1/T015–T018: `playClash`'s `stage`, E1–E6 played on v1's sim, the tick-20 clock, the muster applied with `mergeTriosNow`, the record read from v1's state). Keep the army, field and slot cases (R1/T011, R1/T013), the pairing cases (R1/T035) and the full-colony cases (R1/T037). T151 adds R2a's round clash cases to the same file.
    - `tests/unit/counters.test.ts`: point R1's clash-bar cases (R1/T020: the pool's `clash` dispatch, clash G3, the clash counter matrix, the cache, `clashG13`) at the round runner (T158).
    - `tests/unit/combat.test.ts`: delete R1/T007's `noBuildingPreference` and `idleSeek` cases, since R2a made both the rule (R2a Call 20, R2a/T035). The switches go with v1's `src/sim/state.ts`, `compile.ts`, `systems/targeting.ts` and `systems/movement.ts` in T043.
- [x] T042 [US3] Delete `liveState`, `setBorders` and the building-by-column helper from `tests/helpers.ts`; T151 folds R2a's round helpers in (§15.7)
- [x] T151 [US3] Move R2a's tests into place with `git mv`: `tests/unit/rounds/*.test.ts` over their v1 namesakes in `tests/unit/`, by R2a/T136's inventory (one file per name, holding R2a's round cases and the v1 file's kept cases), and the ones with no namesake, such as `playTime.test.ts` (R2a/T126), into `tests/unit/` as they are; `tests/slow/rounds/*.test.ts` into `tests/slow/`, with S18's `verdict.ts` (T001); and `tests/roundHelpers.ts` into `tests/helpers.ts`. Fix the imports, and check that `vitest.config.ts` still finds every file (§15.7, A104)
  - Two names collide with R1's v2 tests rather than v1's. Merge `tests/unit/rounds/formation.test.ts` (R2a/T019) into R1's `tests/unit/formation.test.ts` (R1/T003, R1/T005: the slot layout and the muster), keeping every case of both. Move `tests/unit/rounds/clash.test.ts` (R2a/T042) into `tests/unit/clash.test.ts` only after T041 has dropped R1's runner cases, keeping R1's army, slot, pairing and full-colony cases in the same file. Both keep the cases §16 R1 verification 1 asks for.
- [x] T043 [US3] Move R2a's sim into place: for each file in R2a's Technical context table, delete v1's `src/sim/X.ts` and `git mv src/sim/rounds/X.ts src/sim/X.ts`, `systems/` and `ai/` included: `index`, `state`, `compile`, `effects`, `create`, `commands`, `step`, `snapshot`, `headless`, `stats`, `summary`, `world`, `targets`, `spatial`, `hits`, `powers`; `systems/{economy,victory,combat,targeting,movement,merging,healing,clouds}`; `ai/{controller,profiles,counter}` (§13.4, Appendix A, A027, A103)
  - Add R2a's new files at their §13.4 paths: `round.ts`, `planning.ts`, `kit.ts`, `colony.ts`, `matchups.ts`, `systems/clash.ts`, `ai/view.ts`, `ai/formationScore.ts` and `ai/answer.ts`.
  - Merge `src/sim/rounds/formation.ts` into R1's `src/sim/formation.ts`, and `colony.ts` into it too if S0's plan says so.
  - Delete the v1-only files with no copy: `src/sim/systems/spawning.ts`, `src/sim/systems/territory.ts`, `src/sim/systems/stance.ts`, and `src/sim/placement.ts` once nothing imports it (`planning.ts` holds `legalPlots`, `plantProblem` and `priceOf`). v1's `buildLibrary` and its strip of v2 fields (R2a Call 27) go with v1's `compile.ts`.
  - Retired selectors and triggers still in the data compile to no-ops, as R2a's compile lists them (R2a Call 19), until T075, T085 and T086 rewrite the content and T129 removes their keys.
- [x] T044 [US3] Strip v1's parts from the sim files R2a didn't copy, and type them on the round state: `src/sim/draft.ts` (the wave opening, the held clock and `bigDrafts`, `draft.ts:158-190`; the offer code stays for spoils, and T065 opens drafts in planning), `src/sim/ai/draftPolicy.ts` (v1's held-draft timing) and `src/sim/rng.ts` (v1's single `ai` stream name goes; R2a's `ai.player` and `ai.enemy` stay) (§13.4, §14.4)
- [x] T045 [US3] Make `src/sim/index.ts` (R2a's, moved in T043) export §14.6's API alone: none of `lanePresence`, `frontierBlocked`, `frontier`, `isBesieged`, `isSuppressed`, `turretPos`, `holdsLane`, `rallyX`, `heldColumns`, `surgeLanes`, `powerCooldownTicks`, `powerFirstReadyTicks`, `priceAt`, `depthOf`, `incomePerMinute`, `legalPlacements` or `draftCommandDue` remains. Delete R2a's internal round-mode switch, if any, and fix the imports in `src`, `tools` and `tests`, so `grep -rn "sim/rounds" src tools tests` finds nothing (§13.4, §14.6)
- [x] T046 [US3] Delete v1's battle saves from `src/run/resume.ts`: `battleSave`, `resumeBattle`, `resumeLegacyBattle` and the held-draft boundary code (`resume.ts:37-139`), which read v1 state. `RUN_KEY`, `BATTLE_KEY`, `saveRun` and `loadRun` stay; T095 writes v2's battle saves (§8.9, §13.8)
- [x] T047 [US3] Delete the seven v1 battle goldens in `tests/golden/` (`m1-balanced-vs-scripted-s1`, `m1-turtle-vs-scripted-s2`, `m2-merge-mirror-s3`, `m4-adaptive-mold-s4`, `m5-armilla-power-s3`, `m5-cordis-power-s3`, `m5-vesper-power-s3`). In `tools/golden.ts`, fold R2a's `ROUND_REPLAYS` into `REPLAYS` and drop the `kind: "rounds"` discriminator, since every replay is a round replay; delete `update()`'s fallback that replays unknown files (`golden.ts:155-161`) (§15.5)
- [x] T048 [US3] Move R2a's scenarios from `data/scenarios/rounds/` into `data/scenarios/` and delete v1's (§15.2, §15.7)
  - R2a/T048 already wrote clash-form copies of R4a's `unit-lineup` and `unit-lineup-twin` (R4/T009, which replace `elder-showcase`) in `data/scenarios/rounds/`. The `git mv` below puts them over R4a's v1-format files, before `test.noTurrets` leaves the schema. Never delete them: R4's screenshots read them (R4 Call 3), so R4/T043 only adds the Burster and the Rhizomorph. If R2a didn't make them, port R4a's files to the round format now, before the schema change. If X3 is no, they don't exist.
  - `git mv` `data/scenarios/rounds/*.json` over `data/scenarios/`: R2a's `merge-trio`, `knit-cancel`, `elder-ladder`, `unit-lineup`, `unit-lineup-twin`, `elder-showcase` (only if X3 is no; R4a deleted it otherwise), `merge-under-fire` and `bench-300` replace v1's, and R2a's rule scenarios join them. R2a's `RoundScenarioSchema` becomes `ScenarioSchema` in `src/data/schema.ts`, and `src/data/registry.ts`'s `scenarios/rounds/` branch goes (`content.roundScenarios` becomes `content.scenarios`).
  - Delete `fort-blocks-flip`, `home-never-flips`, `besieged-control`, `besieged-half-speed` and `comeback-6` (R2a's `comeback-r4` replaces it for G6). Rewrite `power-demo` in round form for its users (`tests/browser/commanders.test.ts`, `tests/browser/runScreens.test.ts`), or delete it with them.
  - Then remove v1's fields (`clockSeconds`, `lanes.pBorder` and `eBorder`, `test.noTurrets`, `noTerritory` and `noHeartcapTargets`, buildings by `col` and `row`) from the schema. R2a's `createFromScenario` (in `src/sim/create.ts` since T043) is the only one.
- [x] T049 [US3] Delete v1's guardrails: `tests/slow/guardrails.test.ts`; in `tools/lib/balance.ts`, `productionDuel`, `duelState`'s `DUEL_TEST` switches, and the seconds-based G4, `comeback-6` G6, spawn-share G7, and live-battle G3 and G8; in `data/balance-targets.json` and BalanceTargetsSchema, v1's G4 keys (`medianMinSeconds`, `medianMaxSeconds`, `maxDecisionShare`) and `G1.seconds`. R2a's round forms stay: its evaluators (`tools/lib/rounds/balance.ts`, moved in T050) and its `tests/slow/rounds/` files (moved in T151) (§12.3)
- [x] T050 [US3] Make the tools round-only: `tools/lib/`, `tools/sim.ts`, `tools/balance.ts`, `tools/bench.ts` and `tools/experiment.ts` (§15.2, §15.3, §12.2)
  - Move `tools/lib/rounds/{run,params,bench,balance}.ts` (R2a) over their `tools/lib/` namesakes, folding in what the tools still need from the files they replace: T026's run code in `tools/lib/run.ts`, the run scenes in `tools/lib/params.ts`, and R1's clash functions in `tools/lib/balance.ts` (`clashG13`, `evaluateClashG3`, `evaluateClashCounters`, `evaluateClashG4Row`, `evaluatePairings`; T158 ports them). Never overwrite a namesake whole.
  - Delete the `--rounds` switch from `tools/sim.ts`, `tools/balance.ts`, `tools/bench.ts` and `tools/experiment.ts`, so rounds are the default, and the `rounds` job kind's discriminator from `tools/lib/pool.ts`.
  - `tools/sim.ts`: ticks and mm:ss in `parseUntil`, `DIVERGE_COLUMNS`, `RUN_MINUTES`, the "≥ 30% reach the boss" line. `tools/lib/run.ts`: columns, `frontLine`, `laneDivergence`, the supply cap, `spawned`, the duration. `tools/lib/asserts.ts`: anything that reads v1 state. `tools/experiment.ts`: the TRIANGLE production edges become squad duels; the `turret` diagnostics at `experiment.ts:150-152` go.
  - Delete `tools/lib/lanes.ts` with `--checks lanes`, and `tools/lib/spread.ts` (R2a/T123's `formation` check replaces it; T124 adds the alias).
  - R1's clash check: T158.
- [x] T158 [US3] Port R1's clash check onto the round sim in `tools/lib/clash.ts` (R1), `tools/lib/balance.ts`, `tools/lib/pool.ts` and `tools/experiment.ts`: every clash it plays goes through `playRoundClash` (R2a/T116, in `tools/lib/clash.ts` since S3, beside the armies it plays), and nothing in it calls v1's `makeConfig` test switches, `createBattle`'s live phase, `addUnit`, `addBuilding` or `mergeTriosNow` (§12.2, §15.3, §16 R2)
  - `tools/lib/clash.ts`: keep `squadSize`, `clashArmyIds`, `armyFromBot`, `clashField`, `lineOf`, `assignSlots`, `fullColony` and `overflowTable`; `playRoundClash` builds on the army and slot ones. `armyFromBot` resolves the controller's opener, weights and `maxOwned` from the round `createBattle` that T043 moved in, not v1's throwaway state, and `squadSize` reads each building's `squad` (R2a), since `spawn` leaves the schema in T129. Delete `placeArmy`, `playClash` and their v1 imports.
  - `tools/lib/balance.ts`: `evaluateClashG3`, `evaluateClashCounters`, `clashG13`, `evaluateClashG4Row` and `evaluatePairings` (R1/T022, T023, T034, T036) play each clash through `playRoundClash` and read its round result. Record fields with no round source (`capAfterMuster`, the `v1Movement` and `v1Targeting` options) leave the report, and its header says so. R2a/T123's round evaluators stay beside them: the clash check measures one clash at a budget, R2a's guardrails whole round battles.
  - `tools/lib/pool.ts`: the `clash` job kind, `clashPool` and `inProcessClashes` (R1/T021) dispatch to `playRoundClash`.
  - `tools/experiment.ts`: `--checks clash` (with `--pair`, the race section and the full-colony sections) and `--checks pairings` stay, on the round runner, with the header comment updated. `tools/lib/roundRace.ts` (R1) stays, fed the round records.
  - R1/T039's `runClashBench` goes in T052. R1's tests are pruned in T041 and merged in T151.
  - Check: `npm run experiment -- --checks clash --pair bot:mono:sporelingBurrow,bot:balanced --budgets 600 --seeds 3` prints 6 records per field, and `npm run experiment -- --checks clash --budgets 300 --g3seeds 2 --screen-seeds 2 --confirm-seeds 2 --mono sporelingBurrow --workers 2` gives the same JSON as `--workers 1` apart from `options.workers` and `timing` (R1's US1 and US2 tests). R3/T127 and R3/T135 run this check.
- [x] T051 [US3] Rewrite the smokes in `tools/verify.ts` in round form, keeping R2a's (R2a/T071, T103, T110) without their `--rounds`, and R2a/T118's bench line as `npm run bench -- --quick`: `rejectedCommands=0` and `rounds<=9` for the 3-seed scripted battle; `counters[0].kind=elite` and `counters[0].round=4` for mono Sporeling against adaptive Old Mother Mold (R2a's T103 smoke: its Elders read as elite at their parts' supply, R2-Q3; this line said `swarm`, v1's smoke, until S3); Cordis as R2-Q7's result set; Armilla asserts `rejectedCommands=0` only until T089 restores `powerGold` (§15.1, §7.4)
- [x] T052 [US3] Delete v1's live `bench-300` loop and R1's `runClashBench` (R1/T039) from `tools/bench.ts` and `tools/lib/bench.ts`. R2a's round cases, on `data/scenarios/bench-300.json` since T048, are the only ones, and R2a/T114's full-colony round case replaces `runClashBench` (M8 reads it) (§15.4)
- [x] T053 [US3] Delete the unused 2-lane test maps `data/maps/test-bogwater-2lane.json`, `data/maps/test-bogwater-2lane-tall.json`, `data/maps/test-stumpfield-2lane.json` and `data/maps/test-stumpfield-2lane-tall.json`, after a grep of `src`, `tools`, `tests` and `data/scenarios` confirms nothing reads them (§11.9)
- [x] T054 [US3] Run `npm run golden -- update` if the move changed a hash and say why in the commit. Then grep `src`, `tools` and `tests` for `spawned`, `columnFlipped`, `buildingDestroyed`, `'wave'`, `stance`, `turret`, `frontier`, `besieged`, `deploy` and `liveState`, check that `find src tools tests data -type d -name rounds` finds nothing, and list what's left (only schema and data keys for T129) in `docs/r2b-plan.md` (§16 R2 Done when, Appendix A)

S4 (the presets):

- [x] T055 [P] [US3] Rewrite `tests/unit/prototypes.test.ts`: `Object.keys(PROTO_PRESETS)` equals the agreed list (`bosslives` alone since S4c: R1's review kept no knob, the user dropped `a2` and `b3` on 2026-11-03, "Drop both", since no battle in rounds read them, and `flyers` the same day, "Cleanup first", T170); each preset's keys are absent from `data/balance.json`; X8's data knobs (`rounds.ai.leanToLastAnswer` and `rounds.ai.replaceWhenFull`, R2a/T101; `ai.*` after T129) stay in `data/balance.json`, off by default; `protoContent('rework')` reports an unknown preset; keep the spec parser (§15.7 Prototypes)
- [x] T056 [P] [US3] Write `tests/unit/flyers.test.ts` (new): `protoContent('flyers')` validates in squad form (the Drift Stalk fields 6 Driftlings, with no `hp` and no `spawn.interval`), and with the knob off no flyer exists (§11.2, §1.3 #11)
  - S4c deleted the file with the preset (T170).
- [x] T057 [P] [US3] In `tests/browser/protoSaves.test.ts` (whose `PROTO` T030 switched to `b3`), add a case: a retired preset in `?proto=`, its URL built from `const RETIRED = 'rework'` so US2's grep stays clean, shows a visible notice and saves under no prototype key (§13.8, A117)
- [x] T058 [US3] Delete the presets §16 R2 says go, with their schema keys in `src/data/schema.ts`, compiled rules in `src/sim/compile.ts` and state fields in `src/sim/state.ts`, from `src/data/proto.ts` (§16 R2, §13.4)
  - `b1` (`approachRush`; `rushUntil`, `rushReady`), `a3` (the preset only; `ai.counter.cycles` counts rounds since R2a), `b4` (`unitLifespan`; `expiresTick`), `hold` and `nohold` (`laneStance`, also in `data/balance.json`), `t1` (`rangedFirstSpawnFraction`), `t2` (`fallBack`), `diver` and `diverleap` (`diveRanged`), `hotstart` (`hotStart`; `rules.deployDraft`), `breach` (`sideTriggers`, the `heartcapBreach` trigger and its `at`, `shieldHeartcap`, `readyPower`, `sporestorm.heartcapTakenPerStack`), `bigdrafts` (`bigDrafts`; `rules.bigDrafts`), `t3` (`spawnerDefense`), `callforhelp` (`callForHelp`; `rules.help`), `waves` (`waves`; `UnitState.wave`, `waveBeatTicks`, `side.waveBeat`, `side.waveSize`), `stormwaves` (`stormWaves`) and `rework`; and the override-only `besiegedBy` (`suppressBy`).
  - Skip any R2a already deleted. `hotstart` and `breach` stay undecided proposals (Appendix A) and may come back in round form.
  - Also `a2` (`ai.counter.counterFloorWeight`) and `b3` (`firingCongestion`), which the user dropped on 2026-11-03 ("Drop both"): no battle in rounds read either.
  - S4: S3 had already removed the compiled rules and state fields with v1's sim. The schema keys that only these presets set are gone. `laneStance` and the timed storm's `heartcapTakenPerStack` are in `data/balance.json`, and the battle state hashes the whole balance, so they wait for T129, whose fold moves every golden anyway (T132).
- [x] T059 [US3] Apply R1's knob outcomes in `src/data/proto.ts`, `src/sim/world.ts` and `src/sim/systems/merging.ts` (§16 R2, §1.3 #11, A109) ⛔ R1 results
  - Skip any preset R2a already removed (R2a/T013: `pinned`, `sporecloud`, `cleave`, `burster`, `rhizomorph` and `kept`, once adopted as data). What's left is what v1's code kept alive:
  - `mixedwave` goes with `mixedWave`, `soakShield` (`world.ts:52`) and merging's shield share, unless R1 kept the shield as clash-form data; the arrival-shield knob goes with it.
  - `swarmread` goes, or `ai.counter.swarmMaxSupply` becomes the rule.
  - The Elder's splash-off inside `rework` goes.
  - R1's pace-variant knob goes unless #12 was adopted.
  - S4: R1 kept the shield as clash-form data (#8), so `soakShield` and merging's shield share stay as the arrival shield's. Gone: `mixedwave`, `clashshield`, `swarmread` with `ai.counter.swarmMaxSupply`, `rework` with its splash-off, `noeldersplash` and `clashpace`. The `noBuildingPreference` and `idleSeek` flags had already gone with S3.
- [x] T060 [US3] Rewrite the `flyers` preset in squad form in `src/data/proto.ts` (the Drift Stalk: a squad of 6 Driftlings, §11.2), and drop `holdsGround` and the flying clauses about turrets and waves (`towerReachesAir` if emplacements are units) from `src/data/schema.ts` (§1.3 #11, §11.2, X9)
  - S4: a building in squad form needs the schema to take one, so a spawner needs a `squad` block (v2's) instead of v1's `spawn`, `hp` is needed only by a tower (its emplacement's), and the tools and `src/run/flow.ts` read `squad`. T129 still removes `spawn` and moves a tower's `hp`. There's no `towerReachesAir` key. The round sim has no flyer rules yet, so Driftlings fight as ground units.
  - S4c deleted the preset (T170).
- [x] T061 [US3] Make an unknown preset visible in `src/app/main.ts` and `src/app/channel.ts`: a `?proto=` spec naming one shows a notice on the page and opens no prototype save space (`protoSpace()` returns null for it) (§13.8, A117)

S4's last task (S0 dropped S4b with the cutover branch, 2026-11-03):

- [x] T152 [US3] Check the switch-over once S4's tasks are done (Call 14, X2): `npm run verify`, `npm run test:slow`, `npm run test:browser`, both builds and US1's sim command pass, and `docs/status.md` lists each stand-in still open with the session that lifts it (§16 R2, X2)
  - S4 (2026-11-03): verify, test:browser (124 cases) and both builds pass. test:slow fails only R2a's six known misses (G1, G2, G3, G7, G8's mono clause, G16), which T168 makes expected fails. US1's sim command: all 20 runs complete and no life is lost in a won battle, but 19 of 20 fight 4–5 battles: seed 4 loses its first three and ends after 3, as in S1, so §16 R2 step 5's wording waits for the user (S13 needs it). `docs/status.md` lists the open stand-ins, each with its session.

S4c (the last prototype switches, added 2026-11-03). The user: "I'm not personally a fan of having a bunch of these that we have to keep track of and think we should remove these where it makes sense and either have separate prototype branches or some sort of debug mode for testing these features instead." Then, accepting the hub's plan: "Cleanup first".

- [x] T170 [US3] Delete the `flyers` preset and the code only flyers use: `FLYERS` and its entry in `src/data/proto.ts`; the `flying` balance block and the `flying` tag in `src/data/schema.ts`; `UnitState.flying` and the hit's `noAir` in `src/sim/state.ts`; the lift, bob and shadow in `src/render/unitSprite.ts`, and the `flying` that `src/render/renderer.ts` passes it; the preset-only units in `tools/sprite-sheet.ts`; T056's `tests/unit/flyers.test.ts`; and the Driftling's and the Drift Stalk's sprites in `data/sprites/`, which nothing else reads. The round sim has no flyer rules, and flyers are out of the first release (X9) (§1.3 #11, §11.2, A109)
  - Tests first: `tests/unit/prototypes.test.ts` holds `PROTO_PRESETS` to `bosslives`, reports `flyers` as an unknown preset (T061, so `?proto=flyers` shows the notice and saves nowhere), and the content refuses a `flying` block or tag. `data.test.ts` and `shapes.test.ts`, which S4 moved from `rework` to `flyers` for its extra sprites, check the default content, which has had the Burster since R2a. `unitSprite.test.ts` drops the flyer's lift.
  - No golden moves, since `flyers` was off by default.
  - S4c: also the drawer's `calm` flag, which only the flyer's bob read, with its path through `src/render/renderer.ts` and `src/render/preview.ts`; and `tests/unit/matchups.test.ts`'s unknown-unit case names a made-up id, not the Driftling. No golden moved.
- [x] T171 [US3] Give `bosslives` its end: R2b's playtest (S14) adopts it as data or deletes it (#16, A199). Say so in `src/data/proto.ts`, T149, SPEC §16 R2, `.claude/rules/balance.md` and `docs/status.md`
- [x] T172 [US3] Give X8's two knobs their end: S12 (T129) deletes `rounds.ai.leanToLastAnswer` and `rounds.ai.replaceWhenFull`, with their code in `src/sim/ai/controller.ts`, unless S11's measurement of the general (T128) shows a need. Add it to T129, T128 and T148, and correct "Before you start", whose X8 line reads as if R2a had turned `replaceWhenFull` on (§7.2, X8)
- [x] T173 [US3] Write the rule into `.claude/rules/balance.md`'s Prototypes bullet, SPEC §16 R2's presets line and `CLAUDE.md`'s Prototypes bullet: no new named presets; a candidate rule is either a data change, measured with the `--proto path:value` override (which needs no code), or code on a short-lived branch, measured there and then merged as the default with the user's OK, or deleted; any temporary switch names the session that removes it
- [x] T174 [US3] Record the decision with the user's words: a dated note in `docs/tasks/clarify.md` under A109 and X9; T055's list, now `bosslives` only; `tests/unit/prototypes.test.ts`; SPEC §1.3 #11, §11.2 and §16 R2, so the flyer's design lives in SPEC until its milestone; and `data/CHANGELOG-balance.md`

**Checkpoint:** `npm run verify`, `npm run test:slow`, `npm run test:browser` and both builds pass; T158's two clash-check commands run on the round sim; T054's list holds only schema and data keys; `find src tools tests data -type d -name rounds` finds nothing; `PROTO_PRESETS` equals the agreed list. The dev site plays a whole run in rounds from S1 on.

## Phase 6: US4 — Drafts in planning (P2)

**Goal:** in every battle with drafts on, a draft opens in the planning phases of rounds 3, 5 and 7, with v1's cards and #27's levels, and must be resolved before Begin. **Independent test:** `npx vitest run tests/unit/drafts.test.ts`, and `npm run sim -- --seeds 1..40 --player bot:balanced --enemy general:scripted --flags merging,drafts --auto-draft greedy --summary` with `rejectedCommands` = 0.

- [x] T062 [P] [US4] Write the round block of `tests/unit/drafts.test.ts` (§8.3, §11.6, §14.5, §14.6) ⛔ §18.2 #27, §18.2 #28, X4
  - A draft opens in round 3's planning after `generalPlanned`, never in rounds 1–2; at most 3 (rounds 3, 5, 7); a battle that ends in round 4 had 1.
  - `beginClash` is refused while it's open and accepted after a pick or a skip; `plant`, `sell` and `toggleMerge` are refused while it's open, each with its reason (#28).
  - Skip gives +40 in this phase, counted in `bankedAtBegin`; rerolls cost 20, then 30; a picked blueprint plants in the same phase; the general never drafts; a player-side bot answers before it plans; draft commands carry their round.
  - Offers come from the battle's draft stream and replay exactly (A093).
  - No offer holds a level marked `offered: false`, and the level after it stays reachable (A105). The Burrow's and the Morel Warren's level 3 aren't offered, so a Burrow fields R1's 8 and a Warren its 6 at every level (#27 as decided at S0, which dropped the fixed unit adds; this line said 12 and 9 until S5).
  - Under X4: a picked blueprint adds a card with 1 copy, and a picked card you own adds 1 copy (§1.3 #5, §8.10). If X4 is no, none of this.
- [x] T063 [P] [US4] Add to `tests/unit/run.test.ts` (§7.8, §8.6, §8.9) ⛔ §18.2 #17, §18.2 #27
  - The general's random levels and the Veteran level land only on live levels, the track length comes from data, and Veteran on an Amanita Lodge never takes its dead level (A100).
  - A battle won by Rout before round 7's planning adds one spoils pick for each draft it didn't reach (#17, A207).
  - A migrated run's spoils offer or prompt naming a level now `offered: false` is re-dealt, or answered with `recoverPendingChoice`'s notice (A084, #27).
- [x] T064 [US4] Change the draft data in `data/balance.json`, `src/data/schema.ts` (TrackLevel gains `offered?: false`) and `data/upgrades.json`, and log it in `data/CHANGELOG-balance.md` (§11.6, §8.3) ⛔ §18.2 #27, R1 results
  - The draft rounds are R2a's `balance.rounds.draftRounds` [2, 4, 6] (R2a/T008), the planning after each; add no `draft.rounds`. `draftWaves` stays until T129.
  - `offered: false` with empty effects: Truffle Cellar L2 and Spore Exchange L2 (HP +200), Amanita Lodge L3 (spawn speed), the Rhizome Vault's whole track.
  - `building.goldPerTick` +1 becomes `building.goldPerRound` +12: Truffle Cellar L1 and L3, Spore Exchange L1.
  - `building.spawnCount` +1 levels, the Burrow's L3 and the Morel Warren's L3, get `offered: false` with empty effects too: a unit level adds no unit in rounds (§18.2 #7, R1's review gate; #27, 2026-11-03).
  - Texts: the Rootbreaker's L3 "+25% against structures" applies to emplacements; the Mortar's levels to its emplacement.
- [x] T065 [US4] Open drafts in planning in `src/sim/draft.ts`, `src/sim/round.ts` (R2a), `src/sim/planning.ts` (R2a), `src/sim/state.ts` and `src/sim/ai/draftPolicy.ts` (§8.3, §4.7, §14.5, §14.6) ⛔ §18.2 #28, X4
  - Remove R2a's refusal of `flags.drafts` in a round battle, and fill `openRound`'s empty draft hook (R2a Call 26, R2a/T055).
  - At opening step 6, once the general has planned, a side with drafts on gets `side.draft` in the planning after each round in `draftRounds`. A battle that ends first skips the rest. The general takes none.
  - `beginClash`, `plant`, `sell` and `toggleMerge` are refused while the side's draft is open (#28). `draftSkip` adds +40 at once; `draftReroll` costs 20 + 10 per extra reroll in this draft; `draftPick` adds the card and recompiles without v1's building-HP rescale (`draft.ts:236-254`).
  - A player-side bot answers through `aiDraft` before step 7's plan. Offers draw from the battle's draft stream (A093).
  - Under X4, `draftPick` adds copies as T062 says.
- [x] T066 [US4] Skip `offered: false` levels in `src/sim/draft.ts` (the in-order offer, `draft.ts:79-83`) and `src/run/flow.ts` (`upgradeable`, `flow.ts:35-41`; `generalKit`'s random levels and Veteran, `flow.ts:155-190`, reading track lengths from data). The Grove's graft, Spore Merchant, Twin Spores and Quiet Clearing's forage use the same rule, and `recoverPendingChoice`'s notice covers a saved prompt naming a level now skipped (§11.6, §7.8, §8.7, §8.9) ⛔ §18.2 #27
- [x] T153 [US4] Show the draft in planning with today's dialog until T116 docks it: `src/app/battleView.ts` opens `src/ui/draftOverlay.ts` when the player's `side.draft` is set in planning, sends `draftPick`, `draftReroll` and `draftSkip`, and closes it when the draft resolves; Begin is unlit while it's open (§8.3, §10.2, §14.5)
- [x] T067 [US4] Turn drafts on in run battles in `src/run/flow.ts` (`battleConfig`'s `flags.drafts`), record each battle's picks in `BattleRecord.drafted`, and in the spoils `finishBattle` deals (`skippedDrafts`) add one spoils pick for each round in `draftRounds` whose next planning the won battle didn't reach (§8.3, §8.6, A207) ⛔ §18.2 #17, X4
  - Under X4, a spoils pick adds copies as T062 says (`dealSpoils`, `spoilsPick`). If X4 is no, none of this.
- [x] T068 [US4] Soften Old Mother Mold's battle-1 opener (R2-Q13, the user, 2026-11-03: "Soften Mold's opener"). Her `opener` in `data/generals.json` becomes `["sporelingBurrow", "truffleCellar"]`, in that order as S1b measured it, so her battle-1 kit holds both and the Gill Archer Nest joins in battle 2 (§7.8). No opening pick is built. Log it in `data/CHANGELOG-balance.md` with S1b's measurement (battle 1 won 82%, 52% and 76% for Vesper, Armilla and Cordis, `docs/balance-backlog.md`), refresh the goldens with `npm run golden -- update`, and fix any test or scenario that names her old opener (§7.8, §12.3 G14)
- [x] T069 [US4] Run `npm run golden -- update` for the moved round goldens in `tests/golden/` and say so in the commit; log the draft data in `data/CHANGELOG-balance.md` (§15.5, §12.4)

**Checkpoint:** `npm run verify`, `npx vitest run tests/unit/drafts.test.ts tests/unit/run.test.ts`, and the US4 sim command with `rejectedCommands` = 0; on `npm run dev`, a run opens round 3's draft, and play goes on after a pick or a skip.

## Phase 6b: US10 — Gold buys upgrades once the colony is full (P2)

S5b, after S5's drafts (#67, the user, 2026-11-03).

- [x] T159 [US10] Measure the late game with S5's drafts on, before building: over `npm run sim -- --seeds 1..40 --player bot:balanced --enemy general:scripted --flags drafts --summary`, the round each colony fills and the gold banked each round after it, for both sides, in `docs/balance-backlog.md` (§6.1, #67)
- [x] T160 [US10] Write `tests/unit/upgrades.test.ts` (new) first (§6.1, §4.4, §5.6, §7.1, #67)
  - An `upgrade` command on a planted spawner costs its price, and is refused on an empty plot, on an upgraded building, on a building that fields no squad, before the side's colony is full, without the gold, and while the side's draft is open (#28; the user, 2026-11-03: "Take them all").
  - From the next Begin, every unit of the building's squad arrives Bloomed (tier 2) for the rest of the battle, so it can knit on to Elders at the muster, and the formation preview equals what fields.
  - Selling refunds the upgrade with the building, by the phase rule.
  - The general and the bots buy upgrades only once their plots are full, and the general never reads what the player buys in the same phase.
- [ ] T161 [US10] Build it in `src/sim/planning.ts` and `src/sim/state.ts` (the command, the plot's flag and its event), `src/sim/formation.ts` (the squad's tier at the muster), and `src/sim/ai/controller.ts` with the bots (spending once the plots are full), with the price in `data/balance.json` and its schema in `src/data/schema.ts`. Log it in `data/CHANGELOG-balance.md` (§6.1, §7.2, §14.5, #67)
- [x] T162 [US10] Show it: the Upgrade button and its price on a planted building's inspect panel (`src/ui/inspect.ts`), the upgraded squad's tier in the formation preview and on its plot (`src/render/renderer.ts`), the general's upgrades in its plan, and a line in Help's planning tab for T117 (§10.2, §10.4, #67). Help has no planning tab yet, so the line sits in its Economy tab (`#help-upgrades`), with U in the keys, and T117 moves it
- [ ] T163 [US10] Set the price from a measurement: G4, G8 and G13 over 200 battles with upgrades on (`npm run experiment -- --checks g4,g8`), the lowest share of the building's cost, of 150%, 200% and 300%, that keeps them in band, in `data/balance.json` (the user's OK, 2026-11-03: "Take them all"), the results in `docs/balance-backlog.md`, and `npm run golden -- update` (§12.3, #67)

**Checkpoint:** `npx vitest run tests/unit/upgrades.test.ts` passes, and `npm run verify` is green with the goldens updated.

## Phase 7: US5 — Content in rounds (P2)

**Goal:** every relic, commander passive and power, general's passive and elite modifier tied to a retired system has its v2 effect, or stays out of the pool until its system exists (§16 R2's content bullet), and the boss's first extra cards are real answers (A056). **Independent test:** `npx vitest run tests/unit/effects.test.ts tests/unit/powers.test.ts tests/unit/commanders.test.ts tests/unit/ai.test.ts tests/unit/run.test.ts`, `npm run verify`'s Armilla and Cordis smokes asserting their power stats, and `npm run golden -- verify` with Armilla's replay.

S6 (the effects DSL and relics):

- [x] T070 [P] [US5] Write the v2 cases in `tests/unit/effects.test.ts` (§11.7, §14.2, §6.7) ⛔ R2-Q19, R2-Q20, §18.2 #24
  - A `rank: 0` modifier changes only front-rank squads' units, and the formation preview equals the arrival (A028). `plantedThisRound` adds a unit only in the clash right after planting. `onLoam` matches a loam plot. `roundGte` gates a modifier.
  - The storm-active condition switches Rot-Eater and the Sigil on at round 5, and at round 4 under Mold Bloom (A090).
  - Rot Ward's `heartcapDamageTaken` 0.85 turns a 500 raw loss into 425 before the cap (8500 bp, floored).
  - Mending Moss's `roundWon` heal lands after the round's damage, never above max, and leaves `dealt` unchanged (#24).
  - `squadWiped` fires once per squad per clash, by source building after the muster; a squad absorbed whole at the muster doesn't burst (A099).
  - Forward Spores' `clashStart` cloud lands on the middle of each lane's enemy front rank: 1.5 tiles, 4 s, 10 a second.
  - Gold earned in a clash arrives as one "from the clash" row in the next income (R2-Q20).
  - A relic or building with an unmet `requires` is never offered in drafts, spoils or events, and never joins a general's kit.
  - One case per relic with a new effect, asserting §11.7's numbers.
  - As built (S6): the trigger cases fire on a real battle, since actions now touch the whole state. No real colony gets a squad absorbed whole at the muster (knits stay inside a slot), so that case credits one squad's units to another directly.
- [x] T071 [P] [US5] Add to `tests/unit/data.test.ts`: `data/relics.json` validates, and no relic uses a retired stat, selector or trigger (§15.7 Data)
- [x] T072 [US5] Extend the effects DSL in `src/data/schema.ts`, `src/sim/effects.ts` and `src/sim/compile.ts`, skipping what R2a added (§14.2, §11.7) ⛔ R2-Q19, R2-Q17
  - Stats: `side.heartcapDamageTaken` (basis points, at §6.7 step 3, before the cap), `side.incomeMult`, `side.powerEffectMult`, `unit.openingSpeed`, `side.plots`; `side.comboCorners` and `run.maxLives` in the schema only.
  - Selectors: `rank` (0 is the front), `onLoam`, `plantedThisRound`, `inCounterSet` (the union of the dual doctrine's two sets and the active counter's set, read at each Begin; R2-Q17, for the Pale Sovereign in T086), and `melee` (a unit without the `ranged` tag, for Quick Roots; Call 13). `ModifierDef.if` gains `roundGte` and storm-active. Unit stats with a plot selector resolve per squad through R2a's per-squad path (A028).
  - Triggers: `roundStart`, `clashStart`, `battleStart`, `roundWon`, `squadWiped`. Actions: `cloud` with `at: 'enemyFrontRank'`, `healHeartcap`.
  - As built (S6): T075 also needed `building.squadCount` and `building.goldPerRound` (§14.2), and Rot-Eater the `enemyUnitKilled` trigger. Storm-active is `if: { sporestormGte: 1 }`, as triggers already wrote it, and `if` works only on a stat read when it's used (`side.powerEffectMult`, read by `powerEffectMult`). `explode` runs in rounds, so Spore Cloud's death burst does. A heal never lifts a fallen Heartcap, so it can't undo a Rout (E8).
- [x] T073 [US5] Widen the `requires` gate in `src/data/schema.ts` (`schema.ts:667`: `'powers'` gains `'combos'`, and `'clouds'` if R1 dropped spore clouds) to relics and buildings, and apply it where the pool is built: `src/sim/create.ts` (the pool code, `create.ts:185` before T043's move) and `src/run/flow.ts` (`runPool`, `relicCandidates`, `generalKit`) (§8.4, §11.7, A083) ⛔ R2-Q19
  - As built (S6): `featureReady` in `src/sim/kit.ts`; the pool code is `draftPool` in `src/sim/create.ts`, and a single battle's roster (`kitOf`) leaves the Vault out too.
- [x] T074 [US5] Give clash gold one path in `src/sim/effects.ts`, `src/sim/systems/economy.ts` and `src/sim/state.ts`: `gainGold` during a clash credits the side at once with a `gold` event of source `clash`; the next round's `income` event and `incomePreview` show it as one "from the clash" row; `stats.goldEarned` gains `clash`. Remove `pendingGold` (R2a Call 25) from `src/sim/state.ts`, the income step in `src/sim/systems/economy.ts` and the snapshot (§6.2, §14.4, A037, A091) ⛔ R2-Q20
  - The alternative (A091): every clash gold goes into `pendingGold`, paid at the next income and lost if the battle ends.
- [x] T075 [US5] Rewrite all 21 relics in `data/relics.json` by §11.7's table, with every `text`, and log them in `data/CHANGELOG-balance.md` (§11.7, §6.6, §6.7) ⛔ R2-Q19, §18.2 #24
  - New effects: `thickCaps` `unit.hp` ×1.15 at rank 0; `fruitingSeason` `goldPerRound` +12 on economy buildings; `rotWard` `side.heartcapDamageTaken` ×0.85; `quickRoots` `unit.openingSpeed` ×1.25 for melee units; `freshSpores` `squadCount` +1 where `plantedThisRound`; `rootStipend` the stipend +24 a round; `forwardSpores` a `clashStart` cloud at the enemy's front rank (`requires: 'clouds'` if R1 dropped clouds); `mycelialWeb` `side.plots` +1, opening the next closed plot by #19's order, at once when picked mid-battle; `mendingMoss` `roundWon` `healHeartcap` 100; `mycorrhizalLink` `requires: 'combos'`, no effect until R3 (A138); `sporestormSigil` `powerEffectMult` 1.5 while the storm is active, keeping `requires: 'powers'`; `rotEater` +1 gold per enemy unit killed while the storm is active; `martyrsBloom` `squadWiped` burst of 60 crush, splash 2.0.
  - Kept: `hardySpores`, `deepCellars`, `sporeTithe` (it pays on muster merges too), `knittingCircle` (its knit-time bonus acts after the muster; its radius widens the muster), `secondFlush` (a fielded building's refund 0.8), `bloomVigor`, `sporeCloud`, `eldersPatience`.
  - As built (S6): Mycelial Web's plot opens when the battle is created, and at once when a draft picks it: the pick's recompile (S5's T065) opens the side's plots up to `side.plots`, in `openOrder` (`openPlots`).
- [x] T076 [US5] Keep the Rhizome Vault out until R3: `requires: 'combos'` on `rhizomeVault` in `data/factions/velvet-bloom/buildings.json`, so it leaves drafts, spoils, events, general kits and Armilla's core offers, which then offer five core cards; log it in `data/CHANGELOG-balance.md` (§4.4, §11.2, §11.10) ⛔ §18.2 #26
- [x] T077 [US5] Delete the rewordings in `src/ui/words.ts` that name a rewritten relic, so no v1 sentence shows over a v2 effect, and update `tests/unit/words.test.ts`. If R2-Q8 kept text in the hashed state, the new texts move goldens: T078 covers it (§10.4, §15.7, A152) ⛔ R2-Q8
  - As built (S6): every relic's text is v2's in the data, so `src/ui/words.ts` rewords none, and v1's adjacency diagram for Mycorrhizal Link went with them.
- [x] T078 [US5] Run `npm run golden -- update` for the moved goldens in `tests/golden/` and say so in the commit (§15.5)
  - As built (S6): all six moved at round 1's first checkpoint, by the state's new shape, regenerated after S5 and S9 merged. The five battle replays play out as on `develop` (the same winners, rounds, damage and gold); `r2-run-s7` moved further, with the run's pool and relics.

S7 (commanders, powers, generals, the boss's extra cards):

- [ ] T079 [P] [US5] Write the power cases in `tests/unit/powers.test.ts` (§6.6, §11.10) ⛔ R2-Q16, R2-Q19
  - Rhizome Tithe (`harvest`) pays 2 gold per enemy supply killed so far this clash, a merged Bloomed kill at its own supply and an emplacement at 0, by T074's path. Firing at 0 kills is allowed and pays 0.
  - The auto policy fires on the first think at a clash time of 40 s or later, or when either side's surviving supply in an unfinished lane is at most 25% of its arrival supply, and replays to the same hash.
  - The Sigil, while the storm is active: Spore Burst deals 135 in the same 2 tiles, the Tithe pays 3 a supply, Puppet Bloom reaches 4.5 tiles; each preview shows the boosted value.
  - Spore Burst hits enemy units and emplacements and no building.
- [ ] T080 [P] [US5] Write the passive cases in `tests/unit/commanders.test.ts` (§11.10, §4.6) ⛔ R2-Q15, R2-Q7
  - Home Brood: Vesper's front-rank squads have +10% HP and damage and the back rank none, and the preview agrees. On R2-Q15's alternative: a front-rank Burrow fields 9 and a back-rank one 8.
  - Landholder: Armilla's colony opens one more plot from battle 1, the first third-rank plot by #19's order, and the general's colony doesn't.
  - Cordis: knit time ×0.5 and merge radius 2.0, which widens the muster, plus R2-Q7's v2 effect if adopted (such as merged units starting at +10% HP).
  - Pools, starters and bans keep their cases.
- [ ] T081 [P] [US5] Write the general cases in `tests/unit/ai.test.ts` (§7.6, §7.7) ⛔ R2-Q17, R2-Q18
  - Old Mother Mold's `swarm` units have +10% HP (R2-Q17); on its alternative, her swarm squads field 10% more, rounded up, and the preview shows more bodies than a plain Burrow's. The Lichen Baron's front-rank units have 1.2× the HP of the same unit in the back rank. The Blightwright's siege units are 15% faster.
  - The Pale Sovereign's units from buildings `inCounterSet` deal +15% damage, read at each Begin; with no doctrine, no bonus (A050).
  - Elites: Swift gives +15% unit speed; Fortified +30% battle Heartcap; Veteran +1 level on live levels.
  - The opening doctrine swaps the opener's last army card for the cheapest kit card in the doctrine's counter set when the kit holds one, and the round-1 callout matches the army shown (A042).
- [ ] T154 [P] [US5] Add to `tests/unit/run.test.ts`: with Swarm intel on top (a run that fielded mono Sporeling Burrows), the boss kit's first extra card isn't a `swarm` building (not `sporelingBurrow`), and its unit is strong against Sporelings (`matchupClass`); with Line intel (mono Capguard Halls), it isn't `morelWarren`, and its unit is strong against Capguards (§7.8, §7.4, A056)
- [ ] T082 [US5] Build Rhizome Tithe's v2 power in `src/sim/powers.ts`, `src/sim/state.ts` and `data/commanders.json`: `{kind: 'harvest', target: 'none', goldPerSupply: 2}` replaces `goldPerColumn` 30 (`commanders.json:27`); `ClashState.killedSupply: Record<Side, number>` counts enemy supply killed this clash; the payout takes T074's path; the preview shows "gold if fired now", and the tooltip says to fire before the last kill. Remove the `notInRoundsYet` refusal and the auto policy's skip (R2a Call 19) (§11.10, §6.6, A094) ⛔ R2-Q16
- [ ] T083 [US5] Add the harvest rule to the auto power policy in `src/sim/powers.ts`: think every 20 ticks of the clash clock from its first tick, fire by T079's rule, skip once `powerUsed` is set (§6.6, §14.6, §15.2) ⛔ R2-Q16
- [ ] T084 [US5] Apply the Sigil per power in `src/sim/powers.ts`: `side.powerEffectMult` scales Spore Burst's damage, harvest's gold per supply and Puppet Bloom's radius, and the previews read the scaled values (§6.6, §11.7, A054, A086) ⛔ R2-Q19
- [ ] T085 [US5] Rewrite the commanders' passives in `data/commanders.json`, `src/sim/compile.ts` and `src/data/schema.ts`: Home Brood per R2-Q15; Landholder as `side.plots` +1 in the third rank from battle 1, not counted for the general (§4.6); Cordis per R2-Q7 (A096); remove `cooldown` and `firstReady` from the data and from PowerDef (`schema.ts:701`) if R2a left them; Spore Burst's text drops buildings and the descriptions drop "takes columns faster". Log the data in `data/CHANGELOG-balance.md` (§11.10, §6.6) ⛔ R2-Q15, R2-Q7
- [ ] T086 [US5] Rewrite the generals' passives and the elites in `data/generals.json` and `data/elites.json` (with any compile support in `src/sim/compile.ts`): Mold's per R2-Q17, the Baron's `unit.hp` ×1.2 at rank 0, the Blightwright's kept, the Sovereign's `unit.damage` ×1.15 on `inCounterSet` as T081 defines; Swift becomes `unit.speed` ×1.15; Fortified kept; remove `building.spawnInterval`, `building.hp`, `side.turretDamage` and `building.firstSpawnFraction`; reword every text. Log them in `data/CHANGELOG-balance.md` (§7.7, §14.2, A058) ⛔ R2-Q17
- [ ] T087 [US5] Swap the opener's last army card for the opening doctrine's cheapest kit counter in the general's round-1 plan in `src/sim/ai/controller.ts` (R2a's planner), when its kit holds one (§7.6, A042) ⛔ R2-Q18
- [ ] T155 [US5] Make `bossCounters` in `src/run/flow.ts` (`flow.ts:191-203`) read R2a's counter sets (`src/sim/ai/counter.ts`, R2a/T099: no `swarm` unit in the Anti-Swarm or Anti-Line set) and take, for each of the top two intel kinds, the cheapest counter whose unit beats that kind's dominant armor in the matrix, R2a/T099's missing-answer rule, instead of the cheapest building in the set (§7.8, §7.4, A056)
- [ ] T088 [US5] Show harvest in the power's preview and tooltip in `src/app/battleView.ts` and `src/app/phases/clash.ts` (R2a/T109's power controls, moved in T150) and `src/ui/words.ts`: the gold so far this clash on the reticle and "fire it before the last kill" (§6.6, §10.2)
- [ ] T165 [US5] Give each general 2–3 openers in `data/generals.json` (its schema in `src/data/schema.ts`), one drawn per battle from the general's own stream for its round-1 plan in `src/sim/ai/controller.ts`, with cases in `tests/unit/ai.test.ts`: one seed always draws the same opener, and across seeds each opener is drawn. T087's doctrine swap applies to the drawn opener (§7.7, §11.11, #69)
- [ ] T166 [US5] Give Puppet Bloom its v2 job in `src/sim/powers.ts` and `data/commanders.json`: it lifts the same-type units within 3 tiles one tier, since S16 read a median of 0 trios after the muster (R2-Q7, 2026-11-03). Its cases go in T079's `tests/unit/powers.test.ts`, the auto policy fires it where the lift is largest, T084's Sigil scales its radius, and T089's Cordis smoke asserts it (§11.10, A057)
- [ ] T089 [US5] Restore the power smokes in `tools/verify.ts`: Armilla asserts `stats.player.powerGold>=1`, Cordis `stats.player.powerMerges>=1` (or R2-Q7's v2 stat), and every smoke `stats.player.powerUses<=rounds` (§15.1, §6.6, A057)
- [ ] T156 [US5] Add `r2-armilla-power-s3` to `REPLAYS` in `tools/golden.ts` (seed 3, `bot:balanced`, `--commander armilla --power-policy auto`, flags `merging,adaptive,powers`, as R2a's Vesper and Cordis replays are), and record `tests/golden/r2-armilla-power-s3.replay.json` (new) with `npm run golden -- update` after T082 and T083; say so in the commit (§15.5, §6.6)
- [ ] T090 [US5] Run `npm run golden -- update` for the power replays in `tests/golden/` and the other moved goldens, and say so in the commit (§15.5)

**Checkpoint:** `npm run verify` with the Armilla and Cordis smokes asserting, the five US5 unit files passing, and `npm run golden -- verify` holding `r2-armilla-power-s3`.

## Phase 8: US6 — Saves between rounds (P2)

**Goal:** the battle saves at each planning phase's start, at Begin and when the power fires; resume returns to that point; and a finished battle is recorded before its report. **Independent test:** `npx vitest run tests/unit/resume.test.ts tests/unit/determinism.test.ts` and `npm run test:browser`'s resume cases pass, and `npm run bench` reports the resume replay.

- [x] T091 [P] [US6] Rewrite `tests/unit/resume.test.ts` (§8.9, §15.5) ⛔ R2-Q22
  - A round-1 planning save with plants made resumes to the same hash with the same gold. A planning save with an open draft, and one after a reroll, resumes with the same offer.
  - A Begin save resumes at the clash's first tick, and both copies run to the same hash. A save requested in a clash or an aftermath leaves the Begin save as the latest.
  - A power fired in a clash is saved and replays at its tick on resume, so it can't be fired again in that clash (A087). A power logged in an earlier clash replays at its tick.
  - A battle save whose `v` isn't 3 is refused, with the restart notice, never resumed (A089).
- [x] T092 [P] [US6] Add the resume cases to `tests/unit/determinism.test.ts`: a resume from each save point (planning, Begin, the power save, a save requested in an aftermath) matches the uninterrupted run (§15.5)
- [x] T093 [P] [US6] Rewrite `tests/browser/resume.test.ts` beyond T014's case: a planning save with two plantings resumes with both; a bad hash restarts round 1's planning with the notice and keeps the run; when a battle ends, the run save has already moved on (spoils, route or summary, the battle key cleared); a reload on the report opens the next screen with a one-line result notice; the report's Amber equals the run's (§8.9, §15.6, A081) ⛔ R2-Q22
- [x] T094 [P] [US6] Add to `tests/unit/run.test.ts` "a save round-trip between rounds" (§16 R2 verification 1), and to `tests/unit/report.test.ts`: in a run, a loss's report names the life lost and the lives left, and the banner's Amber is the rolled amount (§10.4, §10.5, §8.5)
- [x] T095 [US6] Write v2's battle saves in `src/run/resume.ts` (§8.9, §13.8, §14.5, A089)
  - `BattleSave {v: 3, config, commands, pending, round, phase, events, hash}`: planning commands stamped with their round and order, power commands with their round and clash tick.
  - `resumeBattle` replays each planning phase from its commands and each earlier clash tick by tick, checks the hash, and continues in planning (plantings, gold, any open draft) or at the clash's first tick. Any other `v` restarts round 1's planning with the notice. The keys stay.
- [x] T096 [US6] Save at the right moments in `src/app/run.ts` and the phase controllers in `src/app/phases/` (R2a, moved in T150): on `roundStarted`, once the general has planned and any draft's offer is set (round 1 included); on `clashStarted` (Begin); when a power command executes; after each planning command; and on `visibilitychange` during planning. A clash or an aftermath writes nothing new (where `run.ts:75`, `:88` and `:236` saved before T024) (§8.9, A087) ⛔ R2-Q22
- [x] T097 [US6] Make the battle's end the run's node boundary in `src/app/run.ts`: on `battleEnded`, call `finishBattle` (the life, Spores, the Amber roll, spoils dealt), `saveRun` and `clearBattle`, then show the report from the live state and the new BattleRecord; Continue only shows the next screen; a reload on the report opens the next screen with a one-line notice ("Won by Rout in round 6 · +20 Spores"), in the `#reward-recovery` pattern (`run.ts:199`, `:245-263`). Keep records-1's hook in `finish()` (§8.9, §8.6, A081) ⛔ R2-Q22
- [x] T098 [US6] Show the run's lines in the report in `src/ui/report.ts` (R2a's report, moved in T150): the banner's gold, Spores and the Amber actually rolled, from the BattleRecord; on a loss in a run, the life lost and the lives left; nothing about lives in a single battle (§10.4, §10.5, §8.5)
- [x] T099 [US6] Add a resume-replay case to `tools/bench.ts` and `tools/lib/bench.ts`: replay a round-9 planning save in Node and report its time against about 1 s. Past that, store a hash-checked snapshot at each planning start in the save, or show "Restoring the battle…" while it replays (§13.7, §15.4, A088)
- [x] T100 [US6] Check that a prototype battle still saves under its `proto=` key in `v: 3`, with a case in `tests/browser/protoSaves.test.ts` (§13.8)

**Checkpoint:** `npm run verify`, `npm run test:browser`, `npm run bench` (the resume case reported), and a manual reload in planning, in a clash and on the report.

## Phase 9: US7 — Run screens for lives (P3)

**Goal:** the run's screens show lives and rounds, the route's battle nodes show their general's kit, the game's link previews describe rounds, and play time shows. **Independent test:** `tests/browser/runScreens.test.ts` passes, and the `r2-route`, `r2-run-planning`, summary and `r2-title` screenshots pass their assertions.

- [x] T101 [P] [US7] Extend `tests/browser/runScreens.test.ts`: the title's Continue reads "Row n of 6 · 3 Regrowths"; the run bar's lit caps equal `run().lives.left`; the Grove's regain is unlit at full lives with its reason, and Leave stays lit; the summary lists each battle's outcome ("Won by Rout in round 6", "Lost by Decision"), the lives lost and a round sparkline per battle; every battle, elite and boss node lists its general's kit equal to `generalKit` at the right index, and the boss node carries its intel note; the summary's `#summary-playtime` shows the run's minutes and the median planning seconds per round, and the run save holds no play time; "no run screen clips at 1280×720" stays (§10.5, §8.8, §8.2)
- [x] T102 [US7] Name lives "Regrowths", with "lives" in each tooltip, on the run bar, the Grove, the report, the title and the top band, in `src/ui/words.ts` (or in data, per R2-Q8) (§2, §8.5) ⛔ §18.2 #56
- [x] T103 [US7] Finish the run bar, the Grove card's lives chip, the event chips and the result diff in `src/ui/screens/run.ts` (`run.ts:46-63`, `:293`, `:371-400`, `:480-488`) (§10.5, §8.7)
- [x] T104 [US7] Rewrite the summary in `src/ui/screens/run.ts` (`run.ts:519-576`) per §8.8: each battle's outcome and how it was decided (the round a Heartcap fell, or the Decision), map, general and lives lost; cards drafted; the kit at run end; damage by building; a per-battle round sparkline from `BattleRecord.rounds`, damage dealt rising in violet and taken hanging in ash; Spores, Amber and XP. It renders migrated records with `rounds: []`, and keeps records-1's `#run-it-back` (§8.8, §10.5, A073)
- [x] T105 [US7] Show the general's kit on the route's battle nodes in `src/ui/screens/run.ts` and `src/ui/styles.css`, from `generalKit` (`src/run/flow.ts:155`): at the node's nominal battle index (`ROW_INDEX` in `src/run/route.ts`), or its actual index once the node is in the row you choose from; v1's random levels stand in for augments; the elite modifier; the boss node's note that its first extra cards follow intel; the `bosslives` bonus when that knob is on; small 1× sprites inside the ~190 px column, details on hover or focus (§8.2, §7.5, §7.8)
- [x] T106 [US7] Show lives under your Heartcap in a run battle in `src/ui/hud/top.ts` (R2a's top band, moved in T150): `#hud-lives`, one cap per life, lit for each one left, from the lives T024 passes in; nothing in a single battle (§10.2, §8.5)
- [x] T107 [US7] Finish the title in `src/app/main.ts` and `src/ui/screens/title.ts`: Continue names its row and Regrowths, and the blurb (`title.ts:51`) describes rounds: plan with the general's army in view, then watch both armies clash (§10.5, A074)
- [x] T108 [US7] Rewrite `index.html`'s `description`, `og:description` and `twitter:description` (`index.html:7`, `:13`, `:21`) for the round-based game, with no "tug-of-war", "front line" or "columns", and regenerate `public/og-image.png` with `npm run og-image` from the new title (§13.8, §16 R2, A074)
- [x] T109 [US7] Add `#summary-playtime` to the summary in `src/ui/screens/run.ts`: the run's minutes and the median planning seconds per round, from `PlayClock` in `src/app/playTime.ts` (R2a/T128's module, moved in T150), by RB-Q3's rule. `RunController` in `src/app/run.ts` holds one clock for the run (the one run-it-back's T016 extends) and feeds it each battle's phases; the minutes are its planning, clash and aftermath seconds summed, and a reload restarts the count until records-2 adds `restore`. It never enters RunState or the hash, and any key goes through `storageKey()` (§8.2, §16 R2 verification 10, A185, A203) ⛔ X6
- [x] T157 [US7] Make `scene=run` fast-forward the run's current battle to `round` and `phase` in `src/app/run.ts` (`startBattle`) and `src/app/urlParams.ts`, and mirror it in `tools/lib/params.ts`, so Node's hash equals the browser's at the same round and phase (§15.6, A063)
- [x] T110 [US7] Add the run-scene checks to `tools/screenshot.ts`: `r2-run-planning` (`scene=run&seed=7&player=bot:balanced&round=2&phase=planning`, through T157) compares `#hud-lives` with `__GAME__.run().lives`, which must be absent in single battles; the route's battle nodes list `generalKit`; the summary's battles match the run (§15.6, A063)

**Checkpoint:** `npm run test:browser`, both builds, and the screenshots `r2-route`, `r2-run-planning`, the summary (`scene=summary&autoplay=run`) and `r2-title`, each PNG opened and checked.

## Phase 10: US8 — Teaching for rounds (P3)

**Goal:** the draft sits as a bottom sheet with the general's formation in view, and Help, the first-time tips and the top band's tooltips teach rounds with a first true wording that R4b rewords (A156). **Independent test:** the draft case in `tests/browser/rounds.test.ts`, `tests/unit/teachingText.test.ts` and the tip cases in `tests/browser/clarity.test.ts` pass.

- [ ] T111 [P] [US8] Add the draft cases to `tests/browser/rounds.test.ts` (R2a's `tests/browser/rounds/rounds.test.ts`, moved in T150): `scene=draft&seed=1&test=1` opens round 3's planning with 3 cards; Begin is unlit with its tooltip; `#draft`'s box doesn't overlap the general's slots, whose pixels stay undimmed; keys 1–3 pick (§10.2, §8.3) ⛔ R2-Q24
- [ ] T112 [P] [US8] Rewrite `tests/unit/teachingText.test.ts` for rounds: Help has six tabs; Keys covers 1–9, the draft's 1–3 and Space in all three phases; the Rounds tab's multipliers equal §6.4's from data; the Economy example pays `min(cap, floor(140 / 20))`, or R2-Q2's rate; the top band's gold tip rows add up to the chip; the first-time tips' texts (§10.5, §15.7)
- [ ] T113 [P] [US8] Rewrite the tip cases in `tests/browser/clarity.test.ts` (the army tip shows in round 1's planning, is remembered under `spore-sprawl/tips/v1`, stays off when tips are off, comes back with "Show tips again", never shows after battle 2, and counts as shown only once it was visible; A067) and `tests/browser/hud.test.ts`'s battle-1 case (round 2's planning with no economy building planted tips and pulses the economy cards for 12 s; #33's first guess, which the playtest judges at T148 and T149) (§10.2, §10.5)
- [ ] T114 [P] [US8] Add to `tests/browser/resume.test.ts`: a pending draft reroll in round 3's planning resumes and executes once (§8.9)
- [ ] T115 [US8] Make `scene=draft` open round 3's planning in `src/run/scenes.ts`, `src/app/urlParams.ts` and its Node mirror `tools/lib/params.ts`: the bot's rounds 1–2 played, its round-3 plan run once the player's draft resolves (§15.6, A079)
- [ ] T116 [US8] Dock the draft as a bottom sheet in `src/ui/draftOverlay.ts` and `src/ui/styles.css`, wired from `src/app/battleView.ts` (T153's wiring): it replaces the bottom band while open, with shorter cards and details in tooltips; the field dims except the general's preview, whose squads stay hoverable; it opens on `side.draft`; the title drops "the battle is held"; Reroll shows its cost and Skip "+40 gold"; keys 1–3; Begin is unlit with "pick or skip the draft first" (§10.2, §8.3, A062) ⛔ R2-Q24
- [ ] T117 [US8] Write Help's six tabs in `src/ui/help.ts`: Matrix; Merging (the muster, the toggle set in planning); The general (plans first, counters by round, no telegraph); Economy (income per round by source, interest as "bank 140 for +7", the Spore Exchange, comeback gold); Rounds (the three phases, how a clash ends and what it costs, the storm's table by round, the Decision and Regrowths); Keys by phase. Each fits 1280×720. R4b rewords it (§10.5, §10.3, A156)
- [ ] T118 [US8] Write the round tips in `src/app/tips.ts` and `src/ui/callouts.ts`; it builds #33's first guess, which the playtest judges at T148 and T149 (§10.2, §10.5, A156, A067)
  - The tips: reading the general's army (round 1's planning opens), the formation (your first planting), the clash and the power (the first Begin), the aftermath (the first one), the first draft, the round escalation (round 5's planning opens), interest (the first time it pays). Each lasts 8 s, in battles 1–2, once ever, with new ids where a tip's meaning changed.
  - The coach triggers on phase changes and planning events, not ticks (`tips.ts:76`). The callouts lane reports what it rendered, and a tip counts as shown only once visible.
  - The battle-1 economy tip, #33's first guess: in battle 1, if round 2's planning opens with no economy building planted, the economy cards pulse for 12 s. It replaces v1's `NUDGE_AT_SECONDS`.
  - The top band's round, gold, plots and storm tooltips in `src/ui/hud/explain.ts` get a first true wording wherever R2a left a placeholder.

**Checkpoint:** `npm run verify`, `npm run test:browser`, and screenshots of round 3's draft and each Help tab at 1280×720, opened and checked.

## Phase 11: US9 — Run tools and guardrails (P3)

**Goal:** the tools measure whole runs in rounds, G14 and G15 assert in `npm run test:slow`, and the slow suite finishes in R2-Q9's budget. **Independent test:** `npx vitest run tests/slow/runs.test.ts`, and `npm run balance -- tournament --commanders all` reports lives lost, battle 1, boss reach and boss wins per commander.

- [ ] T119 [P] [US9] Write `tests/slow/runs.test.ts` (new): G14, the run bot (`bot:balanced`, greedy drafts, the auto power policy) winning 70–90% of battle 1s for each commander over 100 runs; G15, at least 40% reaching the boss and 40–70% of boss fights won, with an upper bound on boss reach (first guess ≤ 85%); both read from `data/balance-targets.json` and played on a run pool (§12.3 G14, G15, A199) ⛔ §18.2 #35
- [ ] T120 [P] [US9] Add to `tests/unit/run.test.ts`: whole runs are deterministic per seed and policies, a run that loses battle 1 goes on to battle 2, and a run played on the pool equals one played in process (§8.5, §15.2)
- [ ] T121 [US9] Add a run pool to `tools/lib/pool.ts` that plays whole runs in worker threads with the same results as in process, following `rowPool` (§12.2, A102)
- [ ] T122 [US9] Report G14 and G15 in `tools/lib/balance.ts` (`commanderTournament`, `balance.ts:781`) with their thresholds in `data/balance-targets.json`: lives lost, battle-1 results by general, boss reach and boss wins, rounds per battle and the Decision share by battle index (A097), under both planning policies, fixed weights and X7's answer bot (§12.3, §15.3) ⛔ X7
- [ ] T123 [US9] Update `tools/balance.ts`: `tournament --commanders all` prints T122's table and drops the `powerCaptures` columns; `guardrails` runs every suite guardrail, G8 and G11 included (the list at `tools/balance.ts:103-104`) (§15.3, §12.2)
- [ ] T124 [US9] Update `tools/experiment.ts` and `tools/lib/engagement.ts`: `runs` and `boss` report lives; `engagement` in round terms (clash length, round damage, comebacks, how often the lead in the Heartcap race changes hands); `spread` becomes an alias of R2a/T123's `formation` check (G16) (§12.2, §15.3)
- [ ] T125 [US9] Finish `tools/sim.ts`'s `--run --summary` per §15.2: each battle's result, lives lost and left, how the run ended, runs won and the boss reached (§15.2, §16 R2 verification 5)
- [ ] T126 [US9] Pick the run golden's seed in `tools/golden.ts`: a whole run with drafts after rounds 2, 4 and 6 and a life lost in a run that goes on. Keep `r2-run-s7` if it qualifies; otherwise search seeds and rename it `r2-run-s<seed>` (§15.5)
- [ ] T127 [US9] Split `tests/slow` so vitest runs the files in parallel (R2a's battle files, moved in T151, and `tests/slow/runs.test.ts`), set per-test timeouts in `vitest.config.ts` from measured runtimes, and bring the suite to about 15 minutes on the dev machine. Record each file's runtime in `docs/balance-backlog.md`. Past 20 minutes, ask the user whether G12 screens in the suite and confirms with `--checks counters` (§12.3, A102) ⛔ R2-Q9
- [ ] T168 [US9] Keep T133's misses as known misses in the slow suite (the user, 2026-11-03): G1, G2, G3, G7, G8's mono clause and G16 assert as expected fails in `tests/slow/` (R2a's `tests/slow/rounds/`, moved in T151), each printing its numbers and failing once it passes, so a fix shows. Their owners: S14's tuning for G1, G2 and G7 (T169), R3's copies for G3 and G8's mono clause, and R3's combos for G16's Gill Archer and Mortar pairs. §16 R2 step 7 passes on the rest (§12.3, §16 R2 step 7)
- [ ] T128 [US9] Run G14, G15 and T122's readouts and write the results in `docs/balance-backlog.md`. Report a miss with its numbers; any retune waits for the user (`.claude/rules/balance.md`) (§12.3, §12.4)
  - X8's knobs (T172; the user, 2026-11-03): from the general's readouts in these runs (banked gold, free plots, what it planted and sold, exact replays; R2a/T100), say whether it needs `leanToLastAnswer` or `replaceWhenFull`. If not, T129 deletes both; if it does, recommend that knob as the rule, which waits for the user.

**Checkpoint:** `npm run test:slow` finishes inside its timeouts with G14 and G15 asserting, and `npm run balance -- tournament --commanders all` prints the table.

## Phase 12: Polish and verification

S12 (keys, bands, docs):

- [ ] T129 Retire v1's schema and data keys and fold R2a's `rounds` blocks, once no data file uses the old keys, in `src/data/schema.ts`, `src/data/registry.ts`, `data/balance.json`, `data/balance-targets.json`, `data/generals.json`, `data/bots.json`, `data/factions/velvet-bloom/buildings.json`, `data/sprites/heartcap.json` and `data/sounds.json`, skipping any already gone, and log it in `data/CHANGELOG-balance.md` (§11.1, §14.2, §15.7 Data)
  - The fold: R2a's `rounds` blocks in `data/balance.json` and `data/balance-targets.json` move to §11.1's top-level names: `maxRounds`, `clashCapSeconds`, `formationGapTiles`, `heartcapDamagePerSupply`, `siegeHeartcapMult`, `roundDamageCap`, `sporestorm` by round, `stipendPerRound`, `interestPer`, `interestCap`, `comebackGold`, `enemyIncomeMult`, `draftRounds`, `lives`, `plotGrowth`, the `ai.*` round keys (X8's knobs among them, unless the next point deletes them) and, under X4, `kit` (R2a Call 29). Do it in BalanceSchema, BalanceTargetsSchema and every reader, once v1's time-based `sporestorm` and `ai.*` timings are gone (R2a Call 1). The fold moves every golden; T132's refresh carries it.
  - X8's knobs (T172; the user, 2026-11-03, "Cleanup first"): delete `rounds.ai.leanToLastAnswer` and `rounds.ai.replaceWhenFull` from BalanceSchema and `data/balance.json`, with their code in `src/sim/ai/controller.ts` (`replaceWhenFull` and its call, `leanKind` and the lean in `weightOf`) and their cases in `tests/unit/ai.test.ts`, `tests/unit/data.test.ts` and `tests/unit/prototypes.test.ts`, unless S11's measurement of the general (T128) shows a need. Then the knob it needs becomes the rule, as data, with the user's OK (§7.2, X8).
  - BalanceSchema: `waveSeconds`, `incomeTickSeconds`, `stipendPerTick`, `supplyCap`, `comebackDivisor`, `comebackMax`, `supplyLinePerColumn`, `fullRefundSeconds`, `besiegedSeconds`, `besiegedRate`, `firstSpawnFraction`, `timeLimitSeconds`, `turret`, `captureSeconds`, `captureRatio`, `captureDecayMult`, the time-based Sporestorm fields, `routRepair`, `decisionLossDamage`, `groveRepair`, `draftWaves`, `movement.spawnOffset` and `spawnJitter`, and the `ai.*` timings in seconds and score terms §7.3's weights replaced.
  - StatKey: `building.hp`, `building.spawnInterval`, `building.firstSpawnFraction`, `building.spawnCount`, `building.goldPerTick`, `side.supplyCap`, `side.captureSpeed`, `side.supplyLineRate`, `side.turretDamage`, `side.powerCooldown`, `side.waveBeat`, `side.waveSize`. Selector: `zone`, `adjacentOwnBuildingsGte`. Trigger: `waveStart`, `buildingDestroyed`, `heartcapBreach`. EffectAction: `repairHeartcapPct`, `shieldHeartcap`, `readyPower`. PowerSchema: `cooldown`, `firstReady`, `surge`, `tithe`. RunEffect: `repairPct`.
  - BuildingSchema: `hp` (a tower's moves to `attack.hp` first, §14.2, with the compile reading it there), `spawn` (whole; `squad` replaces it), `economy.goldPerTick`, `utility.laneCaptureBonus` and `utility.supplyCapAdd`. The limit schema and BotSchema lose `afterSeconds`, and so do `data/generals.json` and `data/bots.json` (`afterRound` stays).
  - `REQUIRED_SPRITES` loses `turret` (`registry.ts:55`) and the sprite goes from `data/sprites/heartcap.json`; `REQUIRED_SOUNDS` loses `column-gained`, `column-lost`, `building-lost`, `building-razed`, and `wave` and `counter-warn` if no v2 event plays them (`registry.ts:60-64`).
  - Delete the no-op compile path for retired selectors and triggers (R2a Call 19, T043).
- [ ] T130 Add to `tests/unit/data.test.ts`: a modifier on `side.supplyCap`, a `waveStart` trigger, a building with `hp` and a limit with `afterSeconds` are each rejected, and `data/balance.json` has no `rounds` block; every data file validates. Then check Appendix A's rows tagged R2 one by one against `src`, `tools`, `tests` and the UI, and record the result in `docs/r2b-plan.md` (§15.7, Appendix A, A114)
- [ ] T131 [USER] Set G14's and G15's bands from one measurement, recommended in `docs/balance-backlog.md` and written to `data/balance-targets.json` (§12.3, A204, A199) ⛔ §18.2 #35
  - Measure G14 and G15, and re-read G8 beside G14 with the lift from drafts and commanders stated (A204), over `npm run test:slow` and `npm run balance -- guardrails`.
  - Recommend bands in `docs/balance-backlog.md`, with an upper bound on G15's boss reach (A199). R2a set G4, G6 (both clauses, A107, A111), G8, G13 and G16 (R2a/T125); re-open one only if the run's content moved it past its band, with the numbers.
  - The user agrees; write them in `data/balance-targets.json` and `data/CHANGELOG-balance.md`.
- [ ] T132 Regenerate every golden on the final rules with `npm run golden -- update` in `tests/golden/`, and say so in the commit. If R2-Q8 left text in the hashed state, move `src/ui/words.ts`'s plain wording into `data/*.json` in the same refresh (§15.5, §10.4, A152)
- [ ] T133 Update the rules once v1 is gone: rewrite `.claude/rules/v1-code.md` as a short note that the code runs v2's round battle (or delete it and its row in CLAUDE.md's topic table); drop the "until R2" lines in `.claude/rules/balance.md` (v1's guardrails, prototypes "until R2 retires them") and `.claude/rules/storage.md` (R2's migration is built: `RUN_VERSION` 2, BattleSave `v: 3`) (§16 R2, §13.8)
- [ ] T134 Update the project docs once v1 is gone: `CLAUDE.md` (the intro's "Until milestone R2 lands" sentence, Checks' `test:slow` line, the "Dev-site builds" lines R2a added about the preview, the topic table), `AGENTS.md` (the v1 battle line), `package.json`'s description, the header of `src/data/proto.ts` (which claims every knob is absent from `data/balance.json`), `docs/balance-backlog.md` ("Until R2") and `docs/status.md` (In short, the "rework on the dev site, until R2" section and its `?proto=rework` links, Next, Waiting on the user) (§16 R2, A117)
- [ ] T135 Bring SPEC in line with what was built in `SPEC.md`, where S0's decisions didn't already (§0, §13.4, §15.7)
  - §13.4's tree and table: the modules at their final paths (`src/sim/colony.ts`, `src/sim/matchups.ts`, `src/sim/ai/{view,formationScore,answer}.ts`, `src/app/phases/`, `src/ui/hud/tally.ts`, `src/render/{preview,aftermath}.ts`, and `src/run/migrate.ts` on the `src/run` line), `src/sim/placement.ts` gone if T043 deleted it, `src/sim/targets.ts` and `src/sim/effects.ts` with v1 parts removed (A103), and no staging folder.
  - §15's lines for `scene=rounds` and `--rounds`, which R2a/T005 added as temporary options: removed.
  - §15.7's rows for drafts, saves, the effects DSL, the tray, determinism and sound (A104); §14.2's `melee` selector (Call 13); §14.4 (`plotsGained`, BattleRecord v2); §8.9 (`v: 3`, the power save); §10.5 (the Amber shown, the summary); and Appendix A's R2 rows marked done.

S13 (verification):

- [ ] T136 §16 R2 verification 1: run `npm run verify`, and check that the unit suite covers §15.7's round rows: the order of a round's events; income by round; the formation from the plots; how a clash ends; the damage formula; merging at the muster with the preview equal to what fields; the Heartcap race and the Decision after round 9; lives; refunds by phase; the general planning first and never reading what the player plants in the same phase; a save round-trip between rounds. Paste the output's summary in `docs/r2b-plan.md` (§16 R2, §15.7)
- [ ] T137 §16 R2 verification 2: `npm run golden -- verify` passes, and `tools/golden.ts` holds §15.5's set: a battle of rounds against a general that plans first, Twin Roots, the merge mirror with knitting at the muster, a whole run with drafts after rounds 2, 4 and 6 and a life lost, and each commander's power once per clash, Armilla's included (T156) (§15.5)
- [ ] T138 §16 R2 verification 3: run `npm run sim -- --seeds 1..40 --player bot:balanced --enemy general:scripted --summary` with `tools/sim.ts` (rounds by default since T050) and check every battle ends with `rejectedCommands` = 0, a median of 6–8 rounds, at most 15% reaching round 9, at most 15% of clashes at the 45 s cap, the bot winning 30–70%, and a mean wall time inside §13.7's budget. A miss is reported with its numbers in `docs/balance-backlog.md` (§16 R2, §13.7)
- [ ] T139 §16 R2 verification 4: the rule scenarios in `data/scenarios/` assert their outcomes exactly (`npx vitest run tests/unit/scenarios.test.ts`): `general-plans-first`, `formation-from-plots`, `clash-cap`, `round-damage-cap`, `decision-round-9`, and E1–E8 (`lane-empty-one-side`, `lane-empty-both`, `cap-tie`, `double-wipe`, `emplacements-only-draw`, `emplacement-only-win`, `split-lanes`, `both-heartcaps-zero`) (§16 R2, §6.7)
- [ ] T140 §16 R2 verification 5: run `npm run sim -- --run --seeds 1..20 --player bot:balanced --auto-draft greedy --auto-route random --summary` with `tools/sim.ts`: every run completes with 4–5 battles, no run loses a life in a won battle, and runs won, the boss reached and lives left are reported against G14 and G15 (§16 R2, §12.3)
- [ ] T141 §16 R2 verification 6: `tests/unit/migrate.test.ts` loads a run saved under `RUN_VERSION` 1 and gets it migrated with its notice, never null, and `tests/browser/resume.test.ts` loads a v1 battle save in a run that goes on and sees round 1's planning with the restart notice and the run's progress kept (§16 R2, §8.9)
- [ ] T142 §16 R2 verification 7: `npm run test:slow` asserts and passes the guardrails in round form (G1–G8 and G11–G16, among them G4, G11 from R2a/T113, G13 and G16), with the retired forms gone from `tests/slow/` (§16 R2, §12.3)
- [ ] T143 §16 R2 verification 8: `npm run bench` with `tools/bench.ts`: R1's full-colony clash, the clash's first tick, the general's planning turn, the planning command's sim part (`formationOf` and `mergePreview` after a plant), a full battle and the resume replay, all inside §13.7's budget (§16 R2, §13.7, §15.4)
- [ ] T144 §16 R2 verification 9: run the five screenshots §16 R2 lists (`r2-planning-1`, `r2-planning-4`, `r2-clash`, `r2-report`, `r2-route`) plus `r2-run-planning` (T157), R2a's preview and aftermath captures (A076) on `scene=battle`, and the summary with `tools/screenshot.ts`; check §15.6's assertions, Node's hash equal to the browser's included; open each PNG and walk §16 R2's checklist: plots with loam and stumps, the general's army before any command, previews matching the first tick, both Heartcaps, lives in the run capture, round of 9 and the tally, the lane tug, marks while a card is chosen, nothing retired, the round chart, the kit on route nodes, nothing clipped at 1280×720 (§16 R2, §15.6, A063)
- [ ] T145 Check §16 R2's Done when in `docs/r2b-plan.md`: nothing from Appendix A's R2 rows remains in the game, its tests or its tools (T130's check), and every verification step above passed (§16 R2)
- [ ] T146 Write `docs/r2b-plan.md`'s As built, and update `docs/status.md`, `docs/balance-backlog.md` and `data/CHANGELOG-balance.md` with what landed and what waits on the user (§16 R2, CLAUDE.md)
- [ ] T147 [USER] Open S13's PR (`feature/r2b-verify` → `develop`) with the verification summary, ending with the attribution line, when the user asks, and merge it when the user asks, so the dev site plays R2's whole round game (`docs/r2b-plan.md`) (§16 R2, §13.8, X2)

S14 (the playtest and tuning):

- [ ] T148 [USER] §16 R2 verification 10, the playtest gate: the user plays at least one full run on the dev site and answers all seven questions (R2a asked 1, 2, 3, 6 and 7 of a single battle; ask them again of a whole run, with 4 on lives and 5 on planning time and run length), plus #33 (did the economy tip help?), #17 (would a clean win want a bonus?), R2-Q1's reveal A/B if R2a kept it, and X8's knobs if S11 kept them (T172). The user also plays one run with `?proto=bosslives` and says whether lives left at the boss mattered (#16, A199). The answers go in `docs/playtest-feedback.md` (§16 R2, X6) ⛔ §18.2 #33, §18.2 #17, X6
- [ ] T149 [USER] Tune before R3 with the user: re-set X6's run-length target from the measured play time, and if the run is long, pick the lever (rounds per battle first, then the route's length, moving the route's shape from `src/run/route.ts` into data as §8.2's SHOULD asks); decide #33, #17 and the `bosslives` knob, which is adopted as data (its key into `data/balance.json`, the preset gone) or deleted with its schema key and `battleConfig`'s read (T171); log every data change in `data/CHANGELOG-balance.md` (§16 R2, §8.2, §12.4) ⛔ X6, §18.2 #33, §18.2 #17
- [ ] T169 [USER] Tune G1, G2 and G7 after the playtest, each retune with the user's OK: the Sporeling Burrow's and the Rhizomorph Tunnel's duels (G1), the Gill Archer's and the Amanita Knight's edges (G2) and merging's edge (G7), measured with `npm run experiment -- --checks` and logged in `docs/balance-backlog.md` and `data/CHANGELOG-balance.md`. T168's expected fails become asserts as each passes (§12.3)

**Checkpoint:** on S13's branch, `npm run verify`, `npm run test:slow`, `npm run test:browser`, both builds, `npm run golden -- verify` and T138–T144's commands pass, and T145's Done-when list is complete in `docs/r2b-plan.md`. S14 ends with the answers in `docs/playtest-feedback.md`.

## Dependencies and parallel work

**Phase order:** Setup (S0) → Foundational and US1 (S1, then S1b's measurement) → US2 (S2) → US3 (S3, then S4) → US4 (S5) → US5 (S6, then S7) → US6 (S8) → US7 (S9) → US8 (S10) → US9 (S11) → Polish (S12, then S13) → the playtest and tuning (S14).

**Story dependencies:**
- US1 needs only Setup. US2 needs US1, since v1's battle UI can't go while the run still plays v1 battles. US3 needs US2, since the sim's deletion breaks any UI that still reads v1 state.
- US4, US5 and US6 edit the sim in place, so they come after S4. US5's S7 needs S6's DSL (`rank`, `inCounterSet`, `powerEffectMult`, the clash-gold path). US6 needs US4, for the saves with an open draft.
- US7 needs US2's UI move (T150) and runs after S4. US8 needs US4 (the draft and T153's wiring), US5's S7 (the power's text) and US6 (the reroll resume). US9 needs US4 and US5, since G14 and G15 read the run with its content.
- Polish needs every story: T129 can't retire a key while data still uses it. S14 needs S13 merged, so the playtest runs on the finished game.

**In parallel** (each its own session and worktree):
- S1b beside S2, S3 and S4 (docs only).
- After S4: S5, S6 and S9. S5 and S6 both edit `src/data/schema.ts`, `src/sim/state.ts` and `src/run/flow.ts`, in different functions; the second to merge rebases.
- After S5: S5b, then S11 measures the run with upgrades on. S5b and S6 both edit `src/data/schema.ts` and `data/balance.json`: land one, then rebase the other.
- After S5: S8, beside S6 and S7. S8 owns `src/app/run.ts`, `src/run/resume.ts` and `src/ui/report.ts`.
- After S5, S6 and S7: S11. After S5, S7 and S8: S10. S10 and S11 may run together.
- S9 and S10 both edit `src/ui/styles.css`, S9 and S6 both edit `src/ui/words.ts`, and S7's T155 and S9's T105 both read `src/run/flow.ts`'s kit code: land one, then rebase the other.
- S12, S13 and S14 run alone, in that order.

**Handoffs in:**
- R1 → S5 (squad sizes, for #27's unit levels), S4 (the chosen set and one outcome per knob, A109), S1 (R1-Q5's budget, for #18's cap), S1b's T028 (the pairing table, if R1 ran one).
- R1/T007–T010, T012–T024, T029, T034–T039 → S3's T041, T151, T158 and T052: R1's clash check (`tools/lib/clash.ts`, the clash evaluators, the pool's `clash` kind, `runClashBench`) and its tests (`tests/unit/clash.test.ts`, `tests/unit/formation.test.ts`, R1's cases in `tests/unit/counters.test.ts` and `tests/unit/combat.test.ts`), which ran on v1's sim and are ported or deleted.
- R2a → every session: the `rounds/` table and `docs/r2a-plan.md`'s As built (T001), checked and then moved (T150, T151, T043, T048, T050); R2a/T136's test inventory (T041, T151); the temporary pieces R2b deletes (T032, T039, T047, T050, T051, T135); the `rounds` data blocks R2b folds (T129); the stand-ins R2b lifts: R2a Call 19 (T082, T085, T086), Call 25 (T074), Call 26 (T065); the round tools, goldens and guardrail files; the power once per clash; `planningView`; the per-squad stat path (A028); the counter sets (R2a/T099, for T022 and T155); the answer bot (X7, T122); X8's knobs (T055); the one play-time module, `PlayClock` in `src/app/rounds/playTime.ts` (R2a/T128; moved in T150, its test in T151, read in T109); R2-Q7's and R2-Q8's outcomes (T077, T080, T085); #35's battle-level bands (R2a/T125, read in T131).
- R2a/T110 and R2a/T111 → S7: Armilla's round smoke (T089) and power replay (T156).
- R4a → S2's T035 and T150 (`src/render/unitSprite.ts` as the one unit drawer, the pips, X3) and S3's T048: R2a's clash-form copies of `unit-lineup` and `unit-lineup-twin` (R2a/T048) move over R4a's v1-format files (R4/T009), so R4/T043 only adds the Burster and the Rhizomorph (R4 Call 3). If X3 is no, both drop.
- records-1 → S1's T024 and S8's T097 keep its `RunController` hooks; S9's T104 keeps `#run-it-back` (`docs/tasks/run-it-back.md`).

**Handoffs out:**
- R3 (`docs/tasks/r3-kit.md`) reads `docs/r2b-plan.md`'s As built and builds on `migrateRun`'s chain (T010, for R3-Q6's two steps), the `requires` gates (T073, T076), #27's `offered: false` flags (T064), the run pool and G14 and G15 (T119–T122). R3/T127 and R3/T135 run `--checks clash` on the round sim (T158).
- records-2 (`docs/tasks/run-it-back.md`) reads `RUN_VERSION` 2, lives, `BattleRecord.rounds` with `fielded` (T008), and the summary, draft sheet and route node as built (T104, T105, T116). It extends `PlayClock` at `src/app/playTime.ts` (T150) and the run clock T109 wires, and replaces T109's line.
- R4b rewords Help and the tips (T117, T118), keeps #56's name (T102), and finds the lineups in round form (T048) and one unit drawer (T035).
- M8's run-length check (step 6) reads the play time (T109) and X6's target (T149).

## Sessions

| Session | Tasks | Branch | Gate (true before starting) | Ends with |
|---|---|---|---|---|
| S0 | T001–T005 | `feature/r2b-plan` → `develop` (docs only) | R2a merged into develop; R2a's playtest answered and R2a/T139 done (the user agreed to start R2b's S0); X1 and X2 decided | `docs/r2b-plan.md` agreed; the R2b decisions recorded in clarify.md, SPEC and the plan; Call 14 settled |
| S1 | T006–T027, T164 | `feature/r2b-run` → `develop` | S0 done; #32, #16, #17, #18, #20, #21, R2-Q14, R2-Q21, R2-Q23, #56, #68 and §8.7's events decided; R1-Q5's budget known | A run plays rounds with lives; `RUN_VERSION` 2 and `migrateRun` in the same PR; v1 single battles still verify |
| S1b | T028–T029 | `feature/r2b-battle1` → `develop` | S1 merged | R2-Q13's table in `docs/balance-backlog.md`; R2-Q13 decided before S5 |
| S2 | T030–T040, T150, T167 | `feature/r2b-screen` → `develop` | S1 merged | Every battle is the round battle, at §13.4's paths; R2a's preview entry gone; T040's grep empty; the browser suite ported |
| S3 | T041–T054, T151, T158 | `feature/r2b-delete-v1` → `develop` | S2 merged | v1 gone from the sim, tools and tests; R2a's sim, tests, scenarios and tool libraries at §13.4's paths, with no `rounds/` folder left; `--rounds` gone; R1's clash check on the round sim; T054's list in the plan |
| S4 | T055–T061, T152 | `feature/r2b-presets` → `develop` | S3 merged; R1's knob outcomes recorded (A109) | `PROTO_PRESETS` equals the agreed list; flyers in squad form; unknown presets visible |
| S4c | T170–T174 | `feature/r2b-proto-cleanup` → `develop` | S4 merged | `PROTO_PRESETS` is `bosslives`, which S14 adopts or deletes; no code reads flying rules; X8's knobs end in S12; the rule on prototypes written and the decision recorded |
| S5 | T062–T069, T153 | `feature/r2b-drafts` → `develop` | S4 merged; #27, #28, #17 and R2-Q13 decided; R1's squad sizes agreed | Drafts open in rounds 3, 5 and 7 in runs and with `--flags drafts`, in today's dialog; Mold opens with a Sporeling Burrow and a Truffle Cellar (T068); goldens updated |
| S5b | T159–T163 | `feature/r2b-upgrades` → `develop` | S5 merged; #67 decided | Gold buys upgrades once the colony is full, for you, the general and the bots; T159's measurement and the price in `docs/balance-backlog.md`; goldens updated |
| S6 | T070–T078 | `feature/r2b-relics` → `develop` | S4 merged; R2-Q17, R2-Q19, R2-Q20, #24, #26 and R2-Q8 decided | All 21 relics in v2 form; the `requires` gates; one path for clash gold; goldens updated |
| S7 | T079–T090, T154–T156, T165, T166 | `feature/r2b-commanders` → `develop` | S6 merged; R2-Q15, R2-Q16, R2-Q17, R2-Q18, #69 and R2-Q7's v2 jobs decided (R2b S0) | Passives, the Tithe, the Sigil, the generals, the elites and the boss's extra cards in v2 form; the power smokes assert; Armilla's replay recorded |
| S8 | T091–T100 | `feature/r2b-saves` → `develop` | S5 merged; R2-Q22 decided | Battle saves `v: 3` between rounds; the battle's end recorded before its report; the resume bench case |
| S9 | T101–T110, T157 | `feature/r2b-run-screens` → `develop` | S4 merged; #56 and X6's measurement decided | Run screens for lives; route node kits; link previews and og image; play time on the summary; `scene=run` at a round and phase |
| S10 | T111–T118 | `feature/r2b-teaching` → `develop` | S5, S7 and S8 merged; R2-Q24 decided | The draft as a bottom sheet; Help's six tabs; the round tips |
| S11 | T119–T128, T168 | `feature/r2b-run-tools` → `develop` | S5, S5b, S6 and S7 merged; R2-Q9 and X7 settled | G14 and G15 assert; the run pool; the slow suite inside its budget; results in the backlog |
| S12 | T129–T135 | `feature/r2b-cleanup` → `develop` | S5–S11 merged, S5b among them; T128's results in `docs/balance-backlog.md` | v1's keys retired and R2a's `rounds` blocks folded; G14's and G15's bands agreed (T131); every golden regenerated; rules, docs and SPEC updated |
| S13 | T136–T147 | `feature/r2b-verify` → `develop` | S12 merged | §16 R2 verification 1–9 logged in `docs/r2b-plan.md`; the PR into develop (merged when the user asks) |
| S14 | T148–T149, T169 | `feature/r2b-tune` → `develop` | S13 merged; the dev site plays the whole round game | The answers in `docs/playtest-feedback.md`; the tuning in `data/CHANGELOG-balance.md`; X6's target re-set |

S4b, which merged the cutover branch, was dropped at S0 (Call 14, 2026-11-03); its T152 is S4's last task.

## Coverage

**Table 1: SPEC §16 R2's items** (R2's bullets are shared with R2a; each row says which part is R2b's)

| SPEC §16 item | Tasks |
|---|---|
| Scope: the round loop (§4.2, §4.7) | R2a; re-checked in T136 |
| Scope: scoring, the storm, per-battle Heartcaps, the end at 0 or after round 9 (§6.4, §6.5, §6.7) | R2a; per-battle Heartcaps in a run T016, T017; boss Decision rewards T018 |
| Scope: lives, the Grove's regained life, repairs retired, Mending Moss's heal (§8.5, §8.7, §11.7) | T008, T009, T013, T017, T019, T020, T021, T075, T129 |
| Scope: the colony, its plots, loam and stumps, and plots gained over a run (§4.6, §11.9) | R2a; sprawl T016, T017; Mycelial Web T075; Landholder T085 |
| Scope: the general plans first, its kit by battle index and on its route node, `maxOwned` until R3 (§7.1–§7.5, §7.8) | R2a; kits in runs T016, T066; the boss's first extra cards T154, T155; route nodes T105; the opening doctrine T087 |
| Scope: the economy per round and selling refunds (§6.1, §6.2, §4.4) | R2a; clash gold T074 |
| Scope: drafts after rounds 2, 4 and 6 with v1's cards (§8.3) | T062–T069, T153, T111, T116 |
| Scope: the commander power once per clash (§6.6) | R2a; the Tithe T082, T083; the Sigil T084; Armilla's smoke and replay T089, T156 |
| Scope: content tied to retired systems: passives, the Tithe, the generals, relics, Rot-Eater (§7.7, §11.7, §11.8, §11.10) | T019, T064, T075, T076, T082–T087 |
| Scope: saves at each planning phase's start and at Begin (§8.9) | T091–T097, T100 |
| Scope: runs and battles saved before R2 (§8.9, §18.2 #32) | T006–T012, T014, T063, T141 |
| Scope: UI: views, plots, previews, tally, lane tug, Heartcaps, marks, report by round (§10.2, §10.5) | R2a, moved into place in T150; lives in battle T106; the report's run lines T098; the run bar T103; the general's kit on route nodes T105; the summary T104 |
| Scope: retiring v1's battle in code, with its tests, goldens, guardrails, UI, Help and tips (Appendix A, §13.4, §15.6, §15.7) | T030–T054, T150, T151, T117, T118, T129, T130; R1's tools and tests on v1's sim T041, T052, T151, T158; R2a's temporary pieces T032 (entry), T039 (`--dev`), T047 (`kind: "rounds"`), T050 and T051 (`--rounds`), T129 (the `rounds` blocks), T135 (§15's lines) |
| Scope: the rework's pieces become the default (§1.3 #11) | R2a; the leftover knobs T059 |
| Scope: deleting the `?proto=` presets of retired systems, with their schema keys and tests (§16 R2 lists) | T055–T061; `flyers`, and the rule on prototypes, T170–T174 |
| Scope: settle §18.2 #16–#35 in the plan | R2a's S0 in `docs/r2a-plan.md` (#19, #22, #23, #25, #29, #30, #31, #34 as X7, #35's battle-level bands, R2a/T125); T003 in `docs/r2b-plan.md` (#16, #17's Rout-kit half, #18, #20, #21, #24, #26, #27, #28, #32, #35's run half); T131 (#35's G14 and G15); #17's clean-win half and #33 at the gate, T148, T149 |
| Scope: link previews (§13.8) | T108, with the title blurb T107 (A074) |
| Scope: tools play rounds; new goldens replace v1's eight; guardrails in round form; screenshot parameters (§15.2–§15.6, §12.3) | R2a for single battles; T026, T050, T051, T123–T125 (tools); T158 (R1's clash check on the round sim, §12.2); T027, T047, T126, T132, T156 (goldens); T049, T119, T122, T127, T151 (guardrails); T039, T110, T157 (captures) |
| Not in R2: copies, augments, combos, packs, the core six as a set, the shape language's art, the card text, the rewritten Help (§16 R2) | No task builds them; X4's copies, if adopted, come from R2a and only change T008, T010, T019, T062, T065 and T067 |
| Done when: a human can play a whole run in rounds on the dev site, round 1's planning to the summary | T152 (the run on the dev site), T147 (the whole of R2b), T148 |
| Done when: nothing from the retired list remains in the game, its tests or its tools | T040, T054, T130, T145 |
| Done when: every verification step passes | T136–T144 |
| Done when: the playtest gate questions have been put to the user | T148 |
| Verification 1: `npm run verify` with §15.7's round rows | T136 |
| Verification 2: new goldens, one single battle and one run at least | T137 (T027, T126, T132, T156) |
| Verification 3: 40 headless battles | T138 |
| Verification 4: rule scenarios, E1–E8 included | T139 (T048) |
| Verification 5: whole runs | T140 (T125) |
| Verification 6: saves from before R2 | T141 (T007, T014) |
| Verification 7: `npm run test:slow` in round form | T142 (T119, T127, T151) |
| Verification 8: `npm run bench` | T143 (T099) |
| Verification 9: browser checks and the visual checklist | T144 (T110, T157) |
| Verification 10: the playtest gate, then tune before R3 | T148, T149 |

**Table 2: findings**

| Finding | Handled by |
|---|---|
| A042 (medium): the opening doctrine barely shows in the opener | R2-Q18; T081, T087 |
| A056 (high): the Anti-Swarm set holds the swarm, and "cheapest" picks it; the boss's first extra card | #14, #15 (R1's gate); R2a/T098–T099 for the missing answer in battle; T154, T155 for the boss kit |
| A057 (high): Puppet Bloom finds little to merge after the muster | R2-Q7 (R2a measures, R2a/T107); T079 (the Sigil's radius), T080, T085, T089 (the Cordis smoke on R2-Q7's stat) |
| A058 (medium): Mold's passive means fewer bodies after the muster | R2-Q17; T081, T086 |
| A062 (medium): the draft dialog covers the general's formation | R2-Q24; T111, T116 (T153's dialog is a stand-in until then) |
| A063 (medium): lives can't be checked on single-battle captures | T106, T110, T144, T157 |
| A080 (medium): #27's dead levels strand later levels | §18.2 #27; T062, T064, T066 |
| A081 (medium): the result must be recorded before the report, Amber included | R2-Q22; T093, T097, T098 |
| A082 (medium): the Grove can dead-end | R2-Q21; T013, T020, T025, T101 |
| A083 (medium): Mycorrhizal Link, Forward Spores and the Vault have no working form | R2-Q19, §18.2 #26; T073, T075, T076 |
| A084 (medium): the migration's field map; the title overwrites an unreadable save | §18.2 #32; T006, T007, T010, T011, T012, T063 |
| A085 (medium): "+1 unit" effects scale with unit size | R2-Q15; T080, T085 |
| A096 (medium): the muster pre-empts Cordis's knit content | R2-Q7 (R2a's measure); T080, T085, T089 |
| A097 (medium): the boss is nearly always a Decision; no guardrail measures it | X5 (R2a), R2-Q14; T018, T122 |
| A105 (medium): #27's "stop being offered" is undefined mid-track | §18.2 #27; T064, T066 |
| A156 (medium): nobody owns the round tips, the Rounds tab and the round chip tooltips | X1; T117 (Help's Rounds tab), T118 (the round tips, and a first wording wherever R2a left a chip placeholder); the round chip tooltips are R2a/T090's |
| A197 (medium): the boss's win is a half-reward Decision | R2-Q14, X5; T013, T018 |
| A199 (medium): lives rarely bind, and lives at the boss are worth nothing | §18.2 #16, §18.2 #35; T021, T119, T131, T148 |
| A207 (medium): an early Rout pays less kit than a late Decision | §18.2 #17; T063, T067 |
| A025, A101, A195 (high), A066 (medium): R2 can't land piecemeal or stay green in place | X1, X2; S1–S4's order and Call 14 (Technical context); the moves T150, T151, T043, T048, T050 |
| A027, A103 (medium): §13.4 calls kept files "unchanged"; R2a's copies | R2a's copies (R2a Call 3); T043 moves them over v1's files; T135 fixes §13.4 |
| A102 (medium): the slow suite will pass vitest's timeout | R2-Q9; T121, T127 |
| A104 (medium): §15.7's rows miss files with v1 cases | R2a/T136's inventory; T031, T041, T151, T135 |
| A109 (medium): one outcome per knob, the pace variant included | T059; the last switches T170–T172 |
| A152 (medium): display text in the hashed state | R2-Q8 (R2a); T077, T132 |
| A193, A196 (high), A208 (medium): the scoring curve; copies before R3 | X5, X4 (R1's gate, R2a); R2b reads their outcome in T016, T008, T019, T062, T065, T067, and reports per battle index in T122 |
| A198 (medium): full reveal makes the general easy | R2-Q1 (R2a's A/B); asked again in T148 if R2a kept the option |
| A200 (medium): the full-colony budget | R1-Q5 (R1); its cap bounds sprawl in T017 |
| A175 (medium): feat stats in §5.7 | M6-Q1 (R2a records them); not handled here: R2b only keeps them, and T132 regenerates the goldens with them |
| A024, A041 (high); A026, A028–A030, A059 (downgraded on re-check), A039, A043–A046, A060, A061, A064, A065, A076, A106–A108, A119 (medium) | R2a's own findings (`docs/tasks/spec-analysis.md`, R2a). R2b relies on A028's per-squad path (T072, T085, T086), A059's planning checkpoint (T157) and A076's captures (T144) |
| A077 (medium): Twin Roots below 2× | Not handled here: R4a's #52 |

**Table 3: R2b S0's decisions (2026-11-03)**

| Decision | Tasks |
|---|---|
| #67, gold buys upgrades once the colony is full | T159–T163 (S5b) |
| #68, one fixed round cap of 750 | T164 |
| #69, several openers per general | T165 |
| R2-Q7, Puppet Bloom's and Cordis's v2 jobs | T166, T085, T089 |
| Placing on plots only (S21b's note) | T167 |
| T133's misses, known through R2b | T168, T169 |
