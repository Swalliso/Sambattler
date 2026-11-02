# R1 — The clash check: tasks

R1 builds a headless check that fights whole armies at equal gold, in formation, and finds out whether every strong army has an answer and what squad sizes R2a starts from (SPEC §16 R1's Goal). It changes no rule and no data, so no golden hash moves. This list was drafted on 2026-11-01 from SPEC v2 and `docs/tasks/spec-analysis.md`. The user agreed `docs/r1-plan.md` the same day (S0), taking every recommendation, so the tasks stand as written.

**Status:** Agreed 2026-11-01 (S0) · **Spec:** SPEC §16 "Milestone R1 — The clash check" and the sections it cites · **Plan:** `docs/r1-plan.md` (agreed 2026-11-01, T001) · **Gate in:** SPEC v2 (#39) and these task lists (the `feature/v2-tasks` PR) on `develop`; then S0 merged: the plan agreed and R1's calls written into SPEC (T001, T051) · **Gate out:** the user has read the report and settled #7–#15, X4 and X5 (T049), and T050 has recorded the calls. R2a S0 starts only then.

## Read first

- **SPEC:** §16 R1 in full; §1.3 #4, #9, #11; §4.1, §4.6; §5.2; §5.3 (pinning, cleave, spore clouds, bursts); §5.4–§5.6; §6.4, §6.7; §7.3 (the line tags, the lane rule); §7.4; §7.7 and §7.8 (the generals' passives and battle-1 kits); §8.10 (copies, for X4); §11.1–§11.4; §12.1–§12.3; §13.3, §13.4 (the `formation.ts` row), §13.7; §14.6 (`formationOf`, `mergePreview`); §15.3, §15.4, §15.7 (Formation, Merging); §18.1 D33, D45, D47, D48, D50; §18.2 #7–#15, #36, #51.
- **Plan and calls:** `docs/r1-plan.md` (its 23 calls); `docs/tasks/clarify.md`, blocks X4, X5, R1-Q1 to R1-Q9, R2-Q3, #7–#15 and #51; `docs/tasks/spec-analysis.md`, "SPEC wording fixes", R1.
- **Code:**
  - `tools/lib/balance.ts`: `duelState`, `supplyDuel`, `toolRand`, `rosterIds`, `spawnerIds`, `armyIds`, `pairOpener`, `counterBots`, `counterBotSpec`, `counterAnswers`, `evaluateCounters`, `g3Setup`, `g3Verdict`, `COUNTERS`;
  - `tools/lib/pool.ts`; `tools/experiment.ts` (its header and the `counters` check); `tools/lib/bench.ts`, `tools/bench.ts`; `tools/lib/content.ts` (`protoContent`);
  - `src/data/proto.ts` (the rework's presets and `rework`'s explicit appends);
  - `src/sim/create.ts` (`makeConfig`, `createBattle`, `addUnit`, `addBuilding`, `sideModifiers`; `state.nextId` numbers units and buildings alike); `src/sim/compile.ts` (`compileRules`); `src/sim/state.ts` (`BattleConfig.test`, `Rules.test`); `src/sim/hash.ts` (undefined fields are skipped); `src/sim/headless.ts` (`runHeadless`, whose `onTick` first fires after the first step); `src/sim/world.ts` (`clampToLane`, `laneTop`, `laneBottom`);
  - `src/sim/systems/merging.ts` (`canMerge`, `detectTrios`, `resolveKnits`, which completes knits in each trio's lowest-id order, `mergeTriosNow`, `complete`); `src/sim/systems/movement.ts`; `src/sim/systems/targeting.ts` (`retargetUnit`); `src/sim/systems/spawning.ts` (`emerge`, `shieldMixedWaves`);
  - `src/sim/ai/profiles.ts` (`resolveAiProfile`, which resolves bots and generals alike); `src/sim/ai/counter.ts` (`counterSets`, `analyzeMix`); `src/sim/powers.ts` (`bloomTrios`); `src/sim/rng.ts`; `src/run/flow.ts` (`generalKit`); `src/run/route.ts` (`assignGenerals`: runs use only adaptive generals); `src/run/runState.ts` (`createRun`);
  - data: `data/bots.json`, `data/commanders.json`, `data/generals.json`, `data/upgrades.json`, `data/balance-targets.json` (G3, G11), `data/maps/test-flat.json`, `data/maps/twin-roots.json`, `data/maps/test-3lane.json`.
- **Docs:** `docs/status.md`; `docs/balance-backlog.md`; `.claude/rules/balance.md` and `.claude/rules/v1-code.md`.

## Before you start

**Decisions** (by clarify ref; until one is answered, its task builds the recommendation):
- R1-Q1 to R1-Q9, R2-Q3's R1 part, and the R1 parts of X4 and X5 were agreed at T001 (S0) on 2026-11-01, each as recommended, and T051 wrote them into SPEC. The ⛔ marks on them below are satisfied. What each blocks:
  - R1-Q1 (where squads stand) → T013, T014;
  - R1-Q2 (spending a budget) → T011, T012;
  - R1-Q3 (a clash win, jitter) → T015, T016, T020, T022, T023;
  - R1-Q4 (extra plots) → T012, T014, T045;
  - R1-Q5 (the full colony and the bench case) → T037–T039, T046;
  - R1-Q6 (the sixth archetype, appended spawners) → T028, T030, T045;
  - R1-Q7 (v2 targeting) → T007–T009;
  - R1-Q8 (v2 movement) → T007, T008, T010;
  - R1-Q9 (a three-lane screen) → T014, T045;
  - R2-Q3 (eliteShare by parts' base supply) → T017, T018;
  - X4 (the copies variants) → T028, T029, T045;
  - X5 (the race model) → T032–T034.
- §18.2 #51: R1 uses its recommendation provisionally in the copies variants (T029). A mono holds N copies of its card, and its other plots and gold go by `bot:balanced`'s weights.
- At the gate (T049): #7–#15, X4's and X5's calls (with #51 if X4 is yes), the #36 reading, and each knob's outcome (A109).

**Results it needs:** none. R1 is v2's first milestone.

**Findings it must handle** (high and medium):
- A001 (high): no clash winner and no draws; G12 must be strict per field → T016, T023.
- A021 (high): today's movement parks unopposed squads at the far edge → T010.
- A196 (high): squad sizes would be tuned against copy-free mono builds → T029, T045, T052; X4's SPEC changes at T050.
- A193 (high): a flat 500 cap sends most battles to round 9 → T033 (G4's even battles first), T034.
- A041 (high, r2-ai slice): every squad of 3 or more knits at the muster, so eliteShare reads Elite → T018.
- A057 (high, r2-ai slice): Puppet Bloom may have nothing left to knit after the muster → T018.
- A024 (high, r2-sim slice): the arrival's unit order decides what the muster knits → T013, T014 (units in slot order); T005, T006 (new keys in the sim's id order); T016 (id equals key).
- A002: alternating lanes split a pair by type → T014.
- A003: the build list's spending and stop rules → T012.
- A004, A200: a full colony already exceeds "about 100 supply" → T038, T039.
- A005: which budgets get extra plots → T012, T014, T045.
- A006: the role rule leaves out `support` and `burst` → T014; SPEC's wording, T051.
- A007: mono-against-mono cells are deterministic without jitter → T022.
- A008: siege units prefer the Mortar's building → T009.
- A009: the pace code keys on `u.wave` → T029.
- A010: `--squad-seconds` isn't a uniform scale → T029–T031.
- A011: the sixth-archetype variant adds nothing as written → T030.
- A022: under the 500 cap, split Twin Roots clashes draw → T016, T034.
- A023: appended spawners change the reference army → T030.
- A197: the boss can hardly be routed → T033 (the boss rows).
- A208: the cap binds from round 4–5 → T034.
- A109: one outcome per knob at R1's review → T047, T049.
- A119: `bench-300` can't run as a clash for 2,000 ticks → T039 runs a whole clash instead.
- A102: the round-form slow suite will need the pool → T021's clash jobs are what R2a pools.
- Not R1's (in the Coverage table with the reason): A101, A103–A108, A194, A195, A198, A199, A207.

**Lows**, handled where noted: A012 (T014, T051), A013 (T042's timings, T040), A014 (T018), A015 (T030's merge mirror), A016 (T012, T051), A017 (T031, T040), A018 (T039), A019 (plan call 1, T051), A020 (T038), A032 (T006), A112 (T039), A116 (T045), A201 (T035, T036).

## Technical context

- **New files:** `src/sim/formation.ts`, `tools/lib/clash.ts`, `tools/lib/roundRace.ts`, `tests/unit/formation.test.ts`, `tests/unit/clash.test.ts`, `tests/unit/roundRace.test.ts`; and `tools/lib/roster.ts` (added at S4: `rosterIds`, which `balance.ts` and `clash.ts` both import).
- **Extended:**
  - the two switches: `src/sim/state.ts`, `src/sim/compile.ts`, `src/sim/systems/targeting.ts`, `src/sim/systems/movement.ts`;
  - four presets: `src/data/proto.ts`;
  - the tools: `tools/lib/pool.ts`, `tools/lib/balance.ts`, `tools/experiment.ts`, `tools/lib/bench.ts`, `tools/bench.ts`;
  - tests: `tests/unit/combat.test.ts`, `tests/unit/combatRework.test.ts`, `tests/unit/prototypes.test.ts`, `tests/unit/counters.test.ts`;
  - docs: `SPEC.md` (R1's calls and wording fixes in S0; §12.2, §13.4, §15.3, §15.4 as built; then the gate's calls), `docs/balance-backlog.md`, `docs/status.md`, `docs/r1-plan.md`, `docs/tasks/clarify.md`, `docs/tasks/README.md`.
- **Retired:** nothing. R1 retires no system (§16 R1, "Not in R1").
- **Left as they are:** `detectTrios` in `src/sim/systems/merging.ts` (formation.ts copies its rule, and a test proves they agree); the `mixedWave` gate at `src/sim/compile.ts:85` (plan call 10); `evaluateCounters` and `rowPool`'s G3 behaviour; every golden; every `data/*.json` file.
- **Reused:** `makeConfig`, `createBattle`, `addUnit`, `addBuilding`, `runHeadless`; `mergeTriosNow`, `canMerge`; `bloomTrios`; `counterSets` and `buildLibrary`; `seedStream`, `hash32`, `nextFloat`; `counterBots`, `counterBotSpec`, `counterAnswers`, `COUNTERS`, `mapPool`; `protoContent`; the duels' test flags (`noTurrets`, `noTerritory`, `noHeartcapTargets`).
- **Determinism and goldens:**
  - every new config and rules field is absent unless set, and `hashState` skips undefined fields, so `npm run golden -- verify` passes unchanged at every PR;
  - `formation.ts` draws no random stream;
  - the tool's streams: each army `seedStream(hash32(seed, controller, 0), 'ai', 0)`, each clash's jitter `seedStream(hash32(seed, 'jitter:' + seat, 0), 'combat', 0)`. A mirror (`bot:balanced` against itself) builds its second army on seed 1,000 + s, so the two armies differ;
  - pooled runs give exactly the in-process results, in job order.
- **The v1 code rule** (`.claude/rules/v1-code.md`): R1 builds on no retired system. The switches sit in files §13.4 keeps (movement and targeting). The pace variant reads v1's waves code for a measurement only (plan call 9). R2a writes the switches' behaviour as the rule in its round systems (R2a/T035, T037, T038). R2b/T043 deletes the flags with v1's `src/sim/state.ts` and `src/sim/compile.ts`, and R2b/T158 deletes the tool code that sets them.
- **Calls this list makes,** beyond the plan's:
  - Armies are built in the main thread and sent to the workers as clash jobs. So each distinct clash is played once (A007), and workers need no bot content.
  - A clash job carries the tool's options (merging, squads, jitter, switches, lane rule, extra plots), since they aren't in the proto spec (A017).
  - The clash bars are new functions beside `evaluateCounters`, which stays v1's (A001).
  - Units arrive in slot order (lane, rank, file), then by j within a squad, never in build-list order, so the muster's result depends only on the colony (A024).
  - `musterKnits` sorts each trio's keys and orders the trios by their lowest key, the order `resolveKnits` completes knits in. New keys then equal the ids `mergeTriosNow` gives, so a pass's tie-breaks match the sim's (A024, A032).
  - G13's bar reads every clash record the check produced, as §16 R1 verification 2 and §12.3 G13 say. G3's clashes are reported beside it (plan call 15).
  - The race model's first case is G4's pairing, `bot:balanced` against `general:scripted` on the one-lane field, since A193's claim and G4's band are about even battles. G3's lopsided rows follow (plan call 17).
  - The pairing table plays both controllers as `human` (as every clash does, T016), so no general's passive applies; R2-Q17 decides their v2 form.
  - The bench case is report-only, and `--quick` skips it (A018, R1-Q5).
  - `test-flat` stands in for the one-lane colony, and Twin Roots' stumps and loam are decorative in a clash (§16 R1, "Fields").

## Stories

| ID | Priority | Story | Independent test |
|---|---|---|---|
| US1 | P1 | The user plays one clash of two bot armies at a budget and reads its record: each lane's winner, survivors, Heartcap damage, length and cap, and the muster's merges | `npm run experiment -- --checks clash --pair bot:mono:sporelingBurrow,bot:balanced --budgets 600 --seeds 3` prints 6 records per field (3 seeds × 2 seats) and writes `reports/experiments/<label>.json` |
| US2 | P1 | The clash check reports G3, G12 and G13 on today's combat, per budget beside the pooled result, with the clash matrix for #14 and #15 | `npm run experiment -- --checks clash --budgets 300 --g3seeds 2 --screen-seeds 2 --confirm-seeds 2 --mono sporelingBurrow --workers 2` finishes in about a minute with PASS/FAIL lines; `--workers 1` gives the same JSON apart from `options.workers` and `timing` |
| US3 | P2 | The variants run: the kept pieces alone and together, merging and the Elder's splash, squad sizes, the pace variant, the shields, copies, the core six | `npm run experiment -- --proto kept --checks clash --budgets 600 --g3seeds 2 --screen-seeds 2 --confirm-seeds 2 --copies 3 --mono sporelingBurrow` runs, and its report names the variant |
| US4 | P2 | The race model shows how long battles would last under each scoring curve, and the pairing table whether each starter answers each battle-1 general | `npx vitest run tests/unit/roundRace.test.ts` passes, and the small US2 run prints a race section and the cap-binding share |
| US5 | P2 | The full colony is known, and the bench times one clash of two full colonies | `npm run bench` prints the full-colony case beside `bench-300`, with its exit code unchanged |

## Phase 1: Setup

- [x] T001 [USER] Agree `docs/r1-plan.md` with the user. Walk through its calls; the user answers R1-Q1 to R1-Q9, R2-Q3's R1 part and the R1 parts of X4 and X5. Write each R1-Q answer, dated, in the Decision line of its block in `docs/tasks/clarify.md`, and every answer beside its call in `docs/r1-plan.md`; set the plan's status line to "agreed" (§16 R1)
  - A changed answer changes the tasks it blocks (Before you start). Edit those task lines in this file in the same commit.
  - For X4, X5 and R2-Q3, add a dated "R1 measures: …" line under the block and leave its Decision line open. X4 and X5 close at T050, R2-Q3 at R2a S0.
- [x] T051 Write the agreed R1-Q answers and R1's wording fixes (`docs/tasks/spec-analysis.md`, "SPEC wording fixes", R1) into `SPEC.md`, so every later session reads a SPEC that matches this list (§0, §16 R1, §12.2)
  - §16 R1's scope and §12.2's clash check:
    - formation: the line by §7.3's tags (A006); centre-out files, and on Twin Roots the `line` lane rule with §7.3's round-1 rule as a variant (R1-Q1, A012, A002); formation by plot is R2's, measured by G16 (A019);
    - spending: economy and utility picks skipped; a pick that doesn't fit is skipped and drawing goes on; one stream per army; the monos are the army buildings, the Tender's Ring and the Puffball Mortar included (R1-Q2, A016, A003);
    - the clash winner: more lanes won, then more uncapped Heartcap damage, else a draw worth half a win to each side; G12 on each build's best confirmed answer's worst field, among answers that pass G3; numbers quoted at jitter ±0.2 with the jitter-free run beside them (R1-Q3, A001, A007);
    - plots: every budget at the base plots, plus one late-run reading with 4 more at 1,200 and 1,500 gold (R1-Q4, A005);
    - the sixth archetype: a core-six check per candidate, and G3 twice for the variants that append spawners (R1-Q6, A011, A023);
    - two tool-only flags, `noBuildingPreference` and `idleSeek`, on in the check and off in every battle (R1-Q7, R1-Q8, A008, A021);
    - a three-lane screen outside the bars (R1-Q9);
    - the records: eliteShare by parts' base supply, with the swarm read and the Elder-only share (R2-Q3's R1 part; §7.4's rule waits for R2a S0);
    - the copies variants at 2, 3 and 4 (X4's R1 part) and the race-model section (X5's R1 part). D45, §6.7 and §8.10 stay as they are until T050.
  - §13.7 and §15.4: the full-colony budget in live units at the arrival (at most 150 a side), and the bench case as the true worst case, reported only until R2 adds it to G11 (R1-Q5, A004, A018, A200). §16 R1's Done-when line names the same budget.
    - The old "about 100 supply" also stood in §1.1, §4.6, §5.4, §11.1, §12.2, D33 and §18.2 #7's first guess, so S0 changed those too and SPEC states one budget (added at S0: the task named only §13.7, §15.4 and §16 R1).
  - Leave A013 (§12.2's cost) and A017 (§15.3's options) to T040, which writes them as built.
  - Write the answer the user gave at T001, not the recommendation, where they differ.
- [x] T002 Update `docs/status.md` (R1 started, its branches, the agreed calls in one line each, and "Next session" naming S1 and S2) and the R1 rows of `docs/tasks/README.md`'s "Where to start" (§16 R1)

**Checkpoint:** the plan says "agreed"; `docs/tasks/clarify.md` has a dated Decision line for each R1-Q and an "R1 measures" line under X4, X5 and R2-Q3; §16 R1 and §12.2 no longer give "files in order from file 1", "alternating" or formation "by plot" as R1's rule; `npm run verify` is green (S0 is docs only).

## Phase 2: Foundational (blocks every story)

- [x] T003 [P] Write the slot-layout tests in `tests/unit/formation.test.ts` (new) (§4.6, §15.7)
  - `formationBox` on `test-flat`'s geometry (width 32, one lane of rows 0–7, gap 6): the player's front rank at column 11 and back rank at column 9, the general's front at 19 and back at 21 (§4.1's Bogwater columns 9–12 and 19–22); files 1–4 at rows 0, 2, 4, 6 on both sides; with 3 ranks, the third at columns 7 and 23.
  - Twin Roots (lanes 0–5 and 7–12): 3 files a lane, at rows 0, 2, 4 and 7, 9, 11. `test-3lane` (width 30, lanes of 5 rows): 2 files a lane, no slot on the leftover row, fronts at columns 10 and 18.
  - Slots come ordered by lane, then rank, then file (§13.3 rule 4).
  - `slotPositions(n, slot, side)` for n = 1, 2, 3, 4, 6, 8, 9, 12: k = ceil(sqrt(n)), spacing 2/k, centred in the slot. Unit j stands in column j mod k counted from the slot's front and row floor(j / k) from the top. The player's front is the slot's +x edge, the general's its −x edge; rows count from the top for both. Example: 8 Sporelings in the player's front slot of file 1 stand at x = 13 − (c + 0.5) × 2/3, y = (q + 0.5) × 2/3. n = 1 stands at the slot's centre.
  - `emplacementPosition(slot)` is the slot's centre.
  - `overflows(n, radius)` is true when 2 × radius > 2/k: false for every §11.2 squad at 60 s (8 Sporelings: 0.5 < 0.667; 2 Amanita Knights: 0.9 < 1.0; 3 Rootbreakers: 0.9 < 1.0), true for 5 Capguards (0.7 > 0.667), false for 12 Sporelings (0.5 = 0.5, exactly fits).
  - The same input gives the same output, with no stream drawn.
- [x] T004 Build the slot layout in `src/sim/formation.ts` (new): `formationBox(geom, side, ranks)`, `slotPositions(n, slot, side)`, `emplacementPosition(slot)` and `overflows(n, radius)`, with the types `FieldGeom` ({ width, lanes: { rowStart, rowEnd }[], gapTiles }), `Slot` ({ lane, rank, file, col, row }, rank 0 the front) and `Point` (§4.6, §13.3, §14.6)
  - Pure: no state, no stream, only `Math.sqrt`, `ceil` and `floor`. `tests/unit/purity.test.ts` scans it.
  - The gap is a parameter; the clash tool passes 6 (plan call 19). The header comment says R2a's `formationOf` maps plots to these slots and calls these functions unchanged.
  - Added at S1: `slotGrid(n)` → { k, spacing }, the grid `slotPositions` and `overflows` share, so T017's overflow list reads k and the spacing from the same rule. `formationBox` throws when the width less the gap is odd (the box can't centre) or the ranks don't fit the field.
- [x] T005 Add the muster's tests to `tests/unit/formation.test.ts` (§5.6, §15.7)
  - Values from the review's simulation of §4.6's layout under merging's rule. If the function gives otherwise, check the geometry by hand before changing an expectation; §5.6 says the preview shows what the geometry gives.
  - One Burrow (8 Sporelings, merging on) in a front slot → 2 Bloomed + 2 base.
  - Two Burrows side by side (files 2 and 3 of the front rank) → 1 Elder + 2 Bloomed + 1 base, in 2 passes (§5.6's example).
  - Three Burrows side by side (files 1–3) → 2 Elders + 2 Bloomed + 0 base.
  - A Burrow beside a merge-off Burrow → the merge-off squad adds nothing and stays at 8 base.
  - Units in different lanes never knit, even with a merge radius of 3 across Twin Roots' root wall (A040), and neither do ineligible ones (tier 3, `mergeOn` false, `eligible` false for burrowed and burst units).
  - The fixed point terminates, and running `musterKnits` on its own output finds no pass. Ties go to the lower key. A merged unit's key is above every existing key, and its `source` and `mergeOn` come from its lowest-key parent. A merged unit near a lane's edge is clamped by its merged radius: top + r ≤ y ≤ bottom + 1 − r and r ≤ x ≤ width − r.
  - Key order: a unit skipped in the walk (key 0 has one match only) is later taken into another unit's trio ({0, 5, 6}, after {1, 2, 3} formed). For example, 0, 5 and 6 in a row, 0.9 r apart, so 6 is beyond 0's radius but within 5's, and {1, 2, 3} out of 0's reach. `passes` lists the trios as {0, 5, 6}, then {1, 2, 3}, each sorted ascending, and the new keys follow that order from `opts.firstKey`.
  - Agreement with the sim: put the same positions in with `addUnit` and run `mergingSystem` on a tick where tick % 10 === 0; the knits it starts equal `findTrios`'s first pass. Applying each pass with `mergeTriosNow` in `passes`'s order leaves the same units (unitId, tier, x, y) as `musterKnits`'s final list, and each new unit's id equals its key (the key-order case included).
- [x] T006 Build the muster's knitting in `src/sim/formation.ts`: `findTrios(units, radius)` and `musterKnits(units, opts)` on plain `MusterUnit` records ({ key, side, lane, unitId, tier, x, y, mergeOn, eligible, source }), returning `{ passes, units }` (§5.6, §14.6)
  - `findTrios` is one pass of `detectTrios`'s rule (`src/sim/systems/merging.ts`). Per side, walk eligible units in key order. For each unreserved unit, find unreserved units of the same unitId, tier and lane within the radius (squared centre distance ≤ r²). Take the two nearest, with strict < so ties go to the lower key, and reserve all three.
  - `musterKnits` runs on one side's units a call, with `opts = { firstKey, mergeRadius, radiusOf(unitId, tier), lanes: { top, bottom }[], width }`. `mergeRadius` is that side's (a merge-radius bonus widens it, §5.6). The caller passes `firstKey = state.nextId`, and each lane's `top` and `bottom` rows and the map's width, as `clampToLane` reads them (`src/sim/world.ts`).
  - It repeats passes until none forms. Within a pass, it sorts each trio's keys ascending and the trios by their lowest key, the order `resolveKnits` completes knits in, and `passes` returns them in that order. Each trio becomes one unit at its centroid, at tier + 1, clamped by `radiusOf(unitId, tier + 1)` to top + r ≤ y ≤ bottom + 1 − r and r ≤ x ≤ width − r, as `clampToLane` does. New keys are given in that order, from `firstKey`, so they equal the ids `mergeTriosNow` gives.
  - Don't change `detectTrios`: the goldens must not move. Records go in and out, so R2a can apply the passes once with their side effects (A032).

- [x] T007 [P] Write the switches' tests in `tests/unit/combat.test.ts` (§5.2)
  - `test: { noBuildingPreference: true }`: a Rootbreaker with an enemy Capguard 2 tiles away and an enemy Puffball Mortar 3 tiles away, both within its aggro range of 4, targets the Capguard. Without the flag it targets the Mortar, as v1 does.
  - `test: { idleSeek: true }`: a player Sporeling with no enemy within its aggro range and an enemy Capguard 8 tiles ahead and 3 rows down steps toward the Capguard each tick, at its speed. Without the flag it advances along +x and drifts toward its spawn row.
  - Idle seek never seeks a burrowed unit. With a Mortar as the only enemy in its lane, it walks toward the Mortar's centre. With no enemy in its lane, it advances as before.
  - Without either flag, `compileRules` gives `rules.test` with neither key.
- [x] T008 Add `noBuildingPreference?: boolean` and `idleSeek?: boolean` to `BattleConfig.test`, and `noBuildingPreference?: true` and `idleSeek?: true` to `Rules.test`, in `src/sim/state.ts`; set them in `compileRules` in `src/sim/compile.ts` only when true (§5.2, §13.3) ⛔ R1-Q7, R1-Q8
  - A comment on each: tool-only, for R1's clash check; v2's rule (§5.2); R2a writes the rule in its round systems (R2a/T037, T038), and R2b deletes `config.test` (R2b/T043, R2b/T158).
  - If the user declines a flag, skip it here and in T009 or T010, and have T018's records count far-edge parking and the Mortar cells as v1 behaviour instead.
- [x] T009 Drop siege units' building preference under `rules.test.noBuildingPreference` in `retargetUnit` in `src/sim/systems/targeting.ts`: `prefBuildings = def.siege && !state.rules.test.noBuildingPreference` (§5.2, §6.7) ⛔ R1-Q7
- [x] T010 Add the idle seek under `rules.test.idleSeek` to the no-target branch of `movementSystem` in `src/sim/systems/movement.ts` (§5.2) ⛔ R1-Q8
  - The unit steps toward the nearest enemy in its lane that it could target, by squared edge distance, ties to the lower id: living units (not burrowed; not a flyer unless `reachesAir`), and living enemy towers, at their centre.
  - The step is capped as the advance is (`waveStep` when `rules.waves` is set), so the pace variant still applies. With no candidate, it advances as before.
  - Support units (the `support` tag: the Tender, which only heals) never seek an enemy. With no heal target they advance as before.
  - A burst unit (under `burster`) seeks only what it could aim at: units, not flyers or towers, since `aimBurst` never picks either (added in S2).
  - Build each side's per-lane candidate list once a tick, as `prepareWaves` does, not once per unit.

The armies (T011–T012) need nothing from `formation.ts` or the switches, so S2 builds them beside S1.

- [x] T011 [P] Write the army tests in `tests/unit/clash.test.ts` (new) (§11.2, §12.2, §16 R1) ⛔ R1-Q2
  - `squadSize` at 60 s reproduces §11.2's Squad column: Burrow 8, Hall 4, Nest 4, Lodge 2, Forge 4, Den 3, Grove 3, Hollow 6, Warren 6, Ring 3; the Burster Pod 6 under `protoContent('burster')` and the Rhizomorph Tunnel 3 under `protoContent('rhizomorph')`.
  - `clashArmyIds` is the roster without the Truffle Cellar, the Spore Exchange and the Rhizome Vault; the Tender's Ring and the Puffball Mortar are in (A016).
  - `armyFromBot`: mono Burrow spends 220 at 300 (2 Burrows) and holds 8 Burrows at 1,500 on the one-lane field (the plot cap, 880 spent); mono Lodge holds 1 at 300.
  - `bot:balanced` never holds a Cellar (its opener's Cellar is skipped). It stops only when no pickable card fits the gold left or the plots are full. Since `afterSeconds` is ignored, some seed in 1–50 holds a Rootbreaker Den at 600.
  - The same (bot, budget, seed) gives the same army in both seats and against every opponent. At 900, seeds 1–10 give at least two distinct `bot:balanced` armies.
  - `general:scripted` builds an army too: its opener's Cellar is skipped and its squads have merging on (`mergePolicy` "auto").
  - `bot:pair-capguardHall-gillNest` (from `counterBotSpec`) at 300 is [capguardHall, gillNest]. `bot:balanced-nomerge`'s squads have merging off.
- [x] T012 Build squads and armies in `tools/lib/clash.ts` (new): `squadSize(content, buildingId, seconds = 60)`, `clashArmyIds(content)` and `armyFromBot(content, controller, budget, seed, plots)` → `Army` (§11.2, §12.2, §16 R1) ⛔ R1-Q2, R1-Q4
  - `squadSize`: `spawn.count × round(seconds / spawn.interval)`, halves rounded up.
  - `armyFromBot` reads the opener, the weights and `maxOwned` from the `AiState` that `createBattle` resolves for the controller on a throwaway state, which it then drops.
  - It filters economy and utility cards out first, takes the opener (skipping what doesn't fit), then weighted picks from the army's own stream (Technical context). A pick that doesn't fit is skipped and drawing goes on. It stops when no pickable card fits or the plots are full. It honours `maxOwned` and ignores `afterSeconds`.
  - `mergeOn` follows the bot's `mergePolicy` ("auto" reads as on). A tower is an emplacement entry, not a squad.
  - `Army` = { controller, budget, spent, entries: { buildingId, kind: 'squad' | 'emplacement', unitId?, count, mergeOn }[], supply, units }.
  - `plots` is the base count (8 one-lane, 12 Twin Roots, 12 three-lane); the late-run reading passes +4 (plan call 3).
  - Named constants for v2's numbers not yet in data: gap 6, muster 20 ticks, cap 900 ticks, 25 per supply, siege ×2, cap 500, G13 15% (plan call 19).

**Checkpoint:** `npm run verify` is green, and `npm run golden -- verify` reports no moved hash. `npx vitest run tests/unit/formation.test.ts tests/unit/combat.test.ts tests/unit/clash.test.ts` passes.

## Phase 3: US1 — One clash, recorded (P1)

**Goal:** two armies built from bot specs at a budget stand in §4.6's formation, muster, fight to §6.7's lane ends, and give one record. **Independent test:** `npm run experiment -- --checks clash --pair bot:mono:sporelingBurrow,bot:balanced --budgets 600 --seeds 3` prints the records.

- [x] T013 [US1] Add the field and placement tests to `tests/unit/clash.test.ts` (§4.6, §7.3, §16 R1) ⛔ R1-Q1, R1-Q4
  - `clashField('one' | 'twin' | 'three')`: `test-flat`, `twin-roots` and `test-3lane`, with 8, 12 and 12 base plots a side; with `extraPlots: 4`, 12 and 16 on the first two.
  - `lineOf`: the Tender's Ring, a Gill Nest, the Mortar and (under `burster`) the Burster Pod are back line; the Capguard Hall, the Burrow and the Lodge are front line.
  - `assignSlots` on one lane: front-line squads fill the front rank in files 2, 3, 1, 4, in build-list order, and back-line squads the back rank the same way. A fifth front-line squad takes the first free back-rank slot. The third rank opens only with extra plots, in files 2, 3, 1, 4.
  - On Twin Roots (lane rule `line`): [Hall, Nest] puts the Hall in the top lane and the Nest in the bottom one; [Hall, Nest, Hall, Nest] gives each lane one of each; mono Lodge at 300 fills only the top lane. Extra plots open file 2 of the top lane, file 2 of the bottom lane, then file 1 of each. With lane rule `general` (§7.3's round-1 rule), [Hall, Nest, Hall, Nest] goes top, bottom, top, bottom.
  - `placeArmy` creates units in slot order (lane, rank, file), then by j within a squad, so the same colony listed in two build-list orders gives the same ids by slot and the same muster result (A024).
  - `placeArmy` with jitter 0 puts each unit exactly at `slotPositions` (after `addUnit`'s lane clamp). Rhizomorphs arrive burrowed, each squad's units carry its `mergeOn`, a Mortar is a building whose 2×2 footprint is its slot, and `stats.spawned` counts the arrivals.
- [x] T014 [US1] Build `clashField`, `lineOf`, `assignSlots(army, field, { extraPlots, lanesRule })` and `placeArmy(state, side, placements)` in `tools/lib/clash.ts` (§4.6, §7.3, §16 R1) ⛔ R1-Q1, R1-Q4, R1-Q9
  - As built (S3): each takes the content first, as the module's other functions do. The field carries its extra plots, `clashField(content, id, { extraPlots })`, so `armyFromBot` reads `field.plots` and `assignSlots(content, army, field, { lanesRule })` reads `field.open`. A placement is the plot (`lane`, `rank`, `file`) with its entry and build-list index; `placeArmy` maps it to its side's slot and returns each unit's placement. `armyOf(content, controller, budget, ids, mergeOn)` builds an army from a building list, and `armyFromBot` now ends with it.
  - The line by §7.3's tags (A006); centre-out files (A012); a full rank sends front-line squads to the back rank, then the third, and back-line squads to the third rank, then the front (plan call 1).
  - Twin Roots' `line` rule: in build-list order, the lane with fewer buildings of its line; ties to the lane with fewer buildings in all, then the top lane; a full lane falls back (A002). The `general` rule is §7.3's round-1 rule: the lane with less planned supply, then the lower-numbered lane.
  - `placeArmy` creates units in slot order (lane, rank, file), then by j within each squad, as R2a's arrival will (A024). It uses `addUnit` with `sourceBuildingId` 0 and keeps a map from unit id to squad (plan call 20). It sets `u.burrowed` for `burrow` units and `u.mergeOn` per squad, since `addUnit` sets neither, adds to `stats.spawned`, and places a tower with `addBuilding` at its slot's col and row.
  - The three-lane field reads `test-3lane` as 3 lanes of 2 files and 2 ranks, with no map edit (R1-Q9).
- [x] T015 [US1] Add the clash runner's tests to `tests/unit/clash.test.ts` (§5.6, §6.7, §16 R1) ⛔ R1-Q3
  - `playClash` takes an optional `stage(state)` so a test can place exact units.
  - E1: a lane where only one side fields anything locks on the clash's first tick (tick 0, length 0), won with that side's whole damage supply after the muster. E2: a lane where neither side fields anything is drawn, with no damage. E3: equal surviving supply at the cap is a draw. E4: two Sporelings at 1 HP in contact, cooldowns equal, die on the same tick, and the lane is drawn. E5: only Mortars left on both sides at the cap is a draw. E6: a side left with only a Mortar against nothing wins with 0 supply and 0 damage.
  - A surviving Rootbreaker counts 3 toward surviving supply and 6 toward damage supply (150 raw). At the cap the margin is the winner's damage supply minus the loser's, never below 0 (#22's first guess). Each Heartcap's damage is capped at 500 over the lanes it lost, and the uncapped sum is kept beside it.
  - The clock: a lane's length counts the 20 muster ticks. Before tick 20 nobody moves or attacks: positions at tick 20 equal those after the muster's knits. With jitter 0, no field knit starts at tick 20, since the muster left no trio. One clash gives both readings: a lane still fighting at tick 900 locks there for `cap`, and at 920 for `capAfterMuster`.
  - The winner: more lanes won, then more uncapped Heartcap damage dealt, else a draw (R1-Q3). The capped round result (§6.7) is recorded beside it.
  - Two Burrows side by side record merges at the muster of { 2: 5, 3: 1 } and field 1 Elder + 2 Bloomed + 1 base. After the muster, every merged unit's id equals its `musterKnits` key.
  - The state has no AI side, and turrets, territory and Heartcap targets are off. v1's time limit doesn't end it before tick 920. `idleSeek` and `noBuildingPreference` are on by default, and `v1Movement` and `v1Targeting` turn each off. The same inputs give the same record twice.
- [x] T016 [US1] Build `playClash(content, job)` → `ClashRecord` in `tools/lib/clash.ts` (§5.6, §6.7, §16 R1) ⛔ R1-Q3
  - As built (S3): `playClash(content, job, { stage, mustered })`. A `ClashJob` is `{ field, seed, seat, armies: [a, b], jitter, opts }`, where `seat` is the side the first army plays and `opts` holds `merging`, `extraPlots`, `lanesRule`, `v1Movement` and `v1Targeting` (A017). The record keeps both readings at its top level (`cap`, `capAfterMuster`) and in each lane, with a case id per reading, since a lane locked at 900 for `cap` can end by a wipe before 920.
  - Added at S3: the jitter is applied here, after the muster's knits and before the clock jumps to tick 20, by T022's rule (the jitter stream, ±j per axis, clamped to the lane, 0 draws nothing). The record states it, and `--pair` takes `--jitter`, so T022 only passes it through.
  - Measured at S3, for S4 and S7's run time (A013): a clash takes about 6 ms (60 clashes, mono Burrow against `bot:balanced` at 300 to 1,500 gold on both fields), and `runHeadless`'s hash of the final state, which the clash never reads, is about 1.5 ms of it. If the pool's runs need the time, driving `step` directly in the same loop gives the same records.
  - Done at S4: `playClash` drives `step` itself, in `runHeadless`'s loop without the final hash. If v1's battle ended before the clash did, it would now stop with an error, where `runHeadless` left the lanes unlocked. The records are byte-identical on 440 clashes (every mono against `bot:balanced`, 300 to 1,500 gold, both fields, 2 seeds a seat, jitter 0.2). A clash on that mix takes 3.3 ms, down from 4.75.
  - Set-up: `makeConfig({ seed, mapId, player: 'human', enemy: 'human', flags: { merging }, test: { noTurrets: true, noTerritory: true, noHeartcapTargets: true, timeLimitSeconds: 47, noBuildingPreference, idleSeek } })`, `createBattle`, then `state.phase = 'live'`, as `duelState` does.
  - Arrival: `placeArmy` for both sides at tick 0.
  - Muster: per side, player first, the units as `MusterUnit` records and `musterKnits` with `firstKey: state.nextId`, `state.compiled[side].mergeRadius`, the lanes' rows and the map's width (T006). Apply each pass with `mergeTriosNow` in `musterKnits`'s order (each trio sorted ascending, the trios by their lowest key), and assert `id === key` for every merged unit. Then set `state.tick = 20` (plan call 6).
  - The first lane check, after the muster's knits and before the first step: a lane where only one side has units or emplacements locks at tick 0, length 0, won with that side's whole damage supply (E1). A lane where neither side has any locks at tick 0 as a draw with no damage (E2). `runHeadless`'s `onTick` first fires after the first step (tick 21), so it handles every later end.
  - Lane ends, in `runHeadless`'s `onTick`: a side is out of a lane when it has no living unit and no living tower there. The lane locks on that tick: winner, each side's surviving and damage supply, length, case id (E3–E6). At tick 900 the lanes still fighting lock for `cap` on surviving supply; the run goes on to 920 for `capAfterMuster`, then sets `phase = 'ended'`.
  - Scoring per reading: §6.7's margin, 25 × margin raw per lane, storm ×1.0, each Heartcap's sum over the lanes it lost capped at 500; the clash winner (R1-Q3); the capped round result.
- [x] T017 [US1] Add the record tests to `tests/unit/clash.test.ts` (§5.7, §7.4, §16 R1) ⛔ R2-Q3
  - eliteShare after the muster, by parts' base supply (a Bloomed unit counts its 3 parts' tier-1 supply, an Elder its 9). One Burrow alone (2 Bloomed + 2 base) reads 6/8 = 0.75 without the swarm read and 0 with `swarmMaxSupply` 1, and 0 Elder-only. One Capguard Hall (1 Bloomed + 1 base) reads 0.75 both ways, since a Capguard's supply is 2.
  - The light, medium, heavy and ranged shares by the same measure; the four kinds' scores from `balance.json`'s `ai.counter` (`swarmEliteDiscount`, `eliteScoreMult`), with no noise; and the top kind.
  - The overflow list (building, n, k, spacing, unit width); the units parked within 0.5 tiles of the far edge when their lane ended; and the most trios `bloomTrios(state, side, x, y, 3)` finds at any of a side's unit positions at tick 20.
  - Gold spent, buildings, units and supply at the arrival and after the muster; merges at the muster and after it.
- [x] T018 [US1] Build the `ClashRecord` in `tools/lib/clash.ts` (§5.7, §7.4, §16 R1) ⛔ R2-Q3
  - Per army: controller, entries, spent, buildings, units and supply at the arrival and after the muster, merges at and after the muster (from `stats.merges`), eliteShare `{ plain, swarmRead, elderOnly }`, the shares, the scores and the top kind (A014, A041), the overflow list, Puppet Bloom's trios (A057), and units parked at the far edge (A021).
  - Per lane: the case id and both readings, each { winner, ticks, capped, surviving, damageSupply, raw }, plus whether emplacements alone held it (#10).
  - Per reading: each Heartcap's uncapped and capped damage, the clash winner and the round result. Also the clash's length, field, budget, seed, seat and jitter.
  - As built (S3): the four kinds' scores and the top kind are recorded under each eliteShare reading (`kinds.plain`, `kinds.swarmRead`, `kinds.elderOnly`), so R2a sees which kind each recalibration would read. The swarm read uses the data's `ai.counter.swarmMaxSupply`, and 1 where the data leaves it unset, as the `swarmread` preset sets it. Puppet Bloom's radius comes from its power's data (3 tiles). `parked` counts at each lane's lock in the `cap` reading.
- [x] T019 [US1] Add `--checks clash --pair <a>,<b>` to `tools/experiment.ts`: play that matchup at `--budgets` on `--fields` (default `one,twin`) for seeds 1 to `--seeds n`, in both seats; print one line per clash (field, budget, seed, seat, each lane's winner, surviving supply, damage capped and uncapped, length, capped, merges at the muster) and write the records to `reports/experiments/<label>.json`, where `--label` defaults to `clash-pair-<a>-<b>` (sanitised as today's labels are), so no run overwrites v1's `baseline` report; document it in the header comment (§12.2, §15.3)
  - As built (S3): `playPair`, `pairLine` and `pairScore` in `tools/lib/clash.ts` play and print it, so `tools/experiment.ts` only parses the options. `--seeds` defaults to 3 and `--jitter j` (default 0) is passed through. The label gains `-<proto>` when `--proto` is set, so a variant's run doesn't overwrite the baseline's. The content carries `counterBotSpec`, as the counter check's does, so any answer it knows can play. After the lines, a's score per field and budget (draws half). Without `--pair`, `--checks clash` stops with a message until S4's T024.
- [x] T053 [US1] Make the muster's ties exact in `src/sim/formation.ts`, test first: in `findTrios`'s walk, compare squared distances within 1e-9, so a tie goes to the lower key as §5.6 says, whatever the rounding of the positions (§5.6, §4.6)
  - Found at S3 (2026-11-01). §4.6's grid stands many units at exactly equal distances, and the walk's strict `<` breaks those ties by floating-point rounding, which differs between the two sides' mirrored positions. So the same colony musters differently by seat. Of 310 armies (every mono and 20 `bot:balanced` seeds, at the five budgets on both fields), 15 do. Mono Sporeling is among them: at 600 on one lane it musters as 1 base, 4 Bloomed and 3 Elders for the player and 4, 3 and 3 for the general; at 1,200 on Twin Roots, 44 supply against 38. In R2a the preview would show the two sides different musters for the same colony.
  - The fix, prototyped at S3: `if (d > r2 + 1e-9) continue;`, then `d < da - 1e-9` and `d < db - 1e-9` for the two nearest. With it, none of the 310 differ by seat, and `tests/unit/formation.test.ts` (its sim-agreement case included) and `tests/unit/clash.test.ts` pass unchanged.
  - Add a test that a colony musters the same on both sides (five Burrows on one lane, the S3 case), and reword the header: `findTrios` keeps `detectTrios`'s rule but breaks exact ties by key, where `detectTrios`, which stays as it is, leaves them to rounding.
  - Not done in S3, which built on `formation.ts` as it was. It touches only `formation.ts` and its tests, so S4 does it first, and it must land before S7's runs.
  - As built (S4): the tolerance is `TIE` in `formation.ts`. The test musters the five Burrows (front files 1–4, back file 2) on both sides: the same passes, mirrored positions, and 3 Elders + 4 Bloomed + 1 base, which is also what the walk gives on whole-number coordinates (every coordinate × 27, so every squared distance is exact). Of the 310 armies, none now differ by seat, on the passes as well as the counts; before, 15 differed on the counts and 31 on the passes.

**Checkpoint:** `npm run verify` is green with no moved hash, and `npm run experiment -- --checks clash --pair bot:mono:sporelingBurrow,bot:balanced --budgets 600 --seeds 3` prints 6 records per field.

## Phase 4: US2 — The bars on today's combat (P1)

**Goal:** the full check: G3 and G13 on clashes, the strict counter bar (G12) and the clash matrix, per budget beside the pooled result, on the worker pool. **Independent test:** the small run in the Stories table finishes in about a minute, and `--workers 1` gives the same JSON apart from `options.workers` and `timing`.

- [x] T020 [US2] Write the bar tests in `tests/unit/counters.test.ts` (§12.2, §12.3) ⛔ R1-Q3
  - The pool, without worker threads (no unit test starts one today, and `tools/lib/pool.ts` loads itself as a `.ts` worker): `inProcessClashes` returns one record per job, in job order, and the worker's dispatch function, called directly on a `{ kind: 'clash' }` message, returns the same record as `playClash`. Pooled-equals-in-process is checked by the Checkpoint's CLI comparison. A worker case, if one is kept, skips itself when a worker can't load.
  - Clash G3 on a tiny set (2 monos, 1 budget, 2 seeds, both fields): the mean is (2 × one-lane + Twin Roots) / 3; the worst field is the highest; a draw counts half a win.
  - The clash counter matrix (2 builds, 3 answers, 1 budget, 2 screen seeds, 2 confirm seeds): screens rank by the worst field, then the mean; confirmations play fresh seeds; G12 passes on the best confirmed answer's worst field among answers that pass clash G3; a mono answer that fails G3 is flagged and doesn't count; a pair, counter-bot or data-bot answer always counts.
  - The cache: with jitter 0, two cells that field the same army pair in the same seat play one clash (count the clashes played); with jitter on, different seeds share nothing.
  - `clashG13` over a mixed set of records (G3 cells and counter-matrix cells): the bar is the share of every record whose `cap` reading capped, with G3's records' share and `capAfterMuster` beside it, and the median length in seconds.
  - The existing "counter matrix run" test still passes.
  - As built (S4): the rules (clash G3's draws, pooling and flags; the counter matrix's ranking, confirmation and pass) run on a scripted runner that plays nothing and names each clash's winner, so the test sets every cell's result. The pool, the cache and a tiny clash G3 run on the real sim. The cache case also checks its premise: with no jitter, another seed plays the same clash. No worker case.
- [x] T021 [US2] Generalise `tools/lib/pool.ts` to job kinds, `{ kind: 'g3', … } | { kind: 'clash', job: ClashJob }`, with a dispatch in the worker; add `clashPool(spec, size)` and `inProcessClashes(content)`, and keep `rowPool` and `RowRunner` working for G3 as they do today (§12.2, §15.3)
  - Each worker still builds `protoContent(spec)` once. A `ClashJob` carries both armies (built in the main thread), the field, seed, seat, jitter and the tool options. Results come back in job order.
  - As built (S4): `PoolJob` and `dispatch(content, job)`, which each worker calls on its messages; `rowPool` and `clashPool` wrap one job pool. `ClashRunner` sits beside `RowRunner` in `tools/lib/balance.ts`. The workers build the main thread's spec, counter bots included.
- [x] T022 [US2] Build clash G3 and G13 in `tools/lib/balance.ts`: `clashG13(records)`, and `evaluateClashG3(content, opts)` over the monos of `clashArmyIds` (or `--mono`) against `bot:balanced`, at each budget and field, in both seats; with the dedupe and the jitter (§12.2, §12.3) ⛔ R1-Q3
  - Per build: the win rate (draws half) per budget and field, pooled over the budgets with each budget weighted equally; the mean over maps with the one-lane field counted twice; the worst map. Pass at `data/balance-targets.json` G3's `maxMeanWinRate` (0.55) and `maxMapWinRate` (0.60). Flag a budget whose mean is over 55% or worst field over 60% while the pool passes. A three-lane field is a lead, outside the mean.
  - G13 is `clashG13(records)`, which T024 calls on every record the run produced, each cell counted once: G3's cells and the counter matrix's screens and confirmations, and, once they land, the mirror (T030) and the G4 row (T034). It reports the share that reached the cap in the `cap` reading (bar 15%) and the median clash length in seconds against 20–40 s, per budget and field and pooled, with `capAfterMuster` and G3's clashes' share beside it (§16 R1 verification 2, §12.3 G13, plan call 15).
  - The dedupe: build every army in the main thread, fingerprint it (entries, squad sizes, `mergeOn`), and play each distinct (field, seat, both fingerprints, jitter seed, options) once; report the clashes played against the cells.
  - The jitter: ±j tiles per unit per axis, uniform, from the jitter stream (Technical context), applied after the muster's knits, clamped to the lane. Jitter 0 draws nothing. The report states the jitter (A007).
  - As built (S4):
    - The dedupe is `clashCache(content, runner, { jitter, opts, keep })`, and a cell is a `Cell`: { a, b, field, budget, seed, seat }.
      - It builds every army once and plays each distinct clash once, in batches of 2,048. A mirror's second army is built on seed 1,000 + s, as `playPair` builds it.
      - `full(cells)` gives each cell its clash's record, with the cell's own budget, seed and controllers. `slim(cells)` gives only what the bars read (`CellRecord`), which the counter matrix keeps since it plays the most.
      - A clash's key leaves out the seed when the jitter is 0: a clash then draws no random number, so a fixed pair of armies plays the same clash on every seed and budget.
    - `uniqueCells` gives G13 each cell once. `CLASH_CHECK` holds the defaults: the budgets, the fields and 20 screen seeds.
    - `rosterIds` moved to `tools/lib/roster.ts`, which `balance.ts` re-exports, so `balance.ts` imports `clash.ts` with no import cycle.
    - The median's 20–40 s target is `CLASH.g13MedianSeconds`.
- [x] T023 [US2] Build the strict clash counter matrix and the clash matrix in `tools/lib/balance.ts`: `evaluateClashCounters(content, opts)` beside `evaluateCounters`, which stays as it is (§12.2, §12.3 G12, §7.4) ⛔ R1-Q3
  - Builds: monos with a clash G3 mean above `COUNTERS.minBuildMean` (40%), or every mono with `matrix: 'all'`. Answers: `counterAnswers` without the economy and utility monos, built from `protoContent(spec + counterBotSpec)`.
  - Screen at `screenSeeds` (default 20) per seat, rank by the worst field pooled over the budgets (ties by the mean), and confirm the top 3 on the next `confirmSeeds` (default 50). Report per budget and pooled.
  - G12 passes when each build's best confirmed answer that passes clash G3 wins at least `COUNTERS.minAnswerRate` (60%) on its worst field. Only mono answers are G3-tested (from T022's G3); pair, counter-bot and data-bot answers always count, as in `evaluateCounters`.
  - The clash matrix for #14 and #15: each mono build's best 3 answers per budget, beside §7.4's counter sets (`counterSets(buildLibrary(…), roster)`) and the kinds each answer's buildings fall in. A line says whether `swarm` spawners (the Burrow, the Morel Warren) top the answers to mono Gill Nest at each budget.
  - As built (S4):
    - The confirmation takes the best `top` answers that count. A mono answer that fails clash G3 is flagged in the screen and never confirmed, so G12 always rests on `top` answers that count. This reads "the top 3" as the top 3 the bar can use.
    - A mono answer that clash G3 didn't play (a run with `--mono`) counts, marked "clash G3 not played", as in `evaluateCounters`.
    - The clash matrix lists 3 answers per budget (`CLASH_CHECK.matrixAnswers`), whatever `--top` is. Each answer comes with the cards its armies fielded there and their §7.4 kinds. The row gives the build's read: its army's top kind after the muster, plain and with the swarm read, from G3's record on the first field.
- [x] T024 [US2] Add `--checks clash` to `tools/experiment.ts` (§12.2, §15.3, §16 R1)
  - Options: `--budgets` (default 300,600,900,1200,1500), `--fields` (default `one,twin`), `--g3seeds` (default G3's 50), `--screen-seeds` (20), `--confirm-seeds` (50), `--top` (3), `--mono`, `--answers`, `--matrix all`, `--jitter` (0), `--records` (write every record), `--workers`, `--label` (default `clash`, or `clash-<proto>` with a proto spec, sanitised as today's labels are, so no run overwrites v1's `baseline` report).
  - Refuse any spec whose items include the `rework` preset (`rework`, `kept,rework` and so on) with "rework is v1's P3 package, not R1's variant (SPEC §16 R1)".
  - `reports/experiments/<label>.json`: options, armies per build and budget (entries, spent, supply, units), G3, G12, G13 (`clashG13` over every record) and the matrix, per budget and field beside the pooled result. Wall time and clashes played go in a `timing` block and on stdout.
  - Stdout, in the tables `docs/balance-backlog.md` will quote: G3 per build per budget beside pooled; G12 per build with its top answers per field; G13 both readings; PASS/FAIL lines; clashes played and wall time.
  - Update the header comment, which documents every option.
  - As built (S4):
    - The report's `clash` block holds `options`, `armies`, `G3`, `G12`, `matrix`, `G13` and `timing`, plus `records` with `--records`.
      - `armies`: each mono's and `bot:balanced`'s, per field and budget, with the means over the seeds.
      - `G12` carries the answers' descriptions and §7.4's sets.
      - `timing`: `ms`, `clashes` played and `cells`.
      - `records`: every clash played, once each, with the controllers of the first cell that played it.
    - Stdout prints the clash matrix between G12 and G13.
    - `--pair` keeps S3's mode, and the `rework` refusal covers both modes, through `specPresets` in `src/data/proto.ts`.
    - The small run plays 108 clashes for 600 cells in under a second, since with no jitter a mono's army is one clash a seat. Its `--workers 1` JSON matches `--workers 2`'s apart from `options.workers` and `timing`. So does a jittered run of every mono at 300, 900 and 1,500 gold: 7,202 clashes for 9,276 cells, 22 s on one worker and 6 s on four.
- [x] T054 [US2] Fix three of the bars' reports in `tools/lib/balance.ts` and `tools/experiment.ts`, test first, from the hub's review of S4 (2026-11-01, at `f9a579b`) (§12.2, §12.3 G12, G13)
  - **G12 counts no untested mono.** With `--mono`, clash G3 plays only the named monos, so G12 can name an answer that never faced G3, marked "clash G3 not played". A build whose only 60% answer is a mono that fails G3 then passes, and nothing says so. v1's `evaluateCounters` never has this case: its `--mono` limits only the builds. Do as v1 does. When G12 runs, clash G3 plays every mono of `clashArmyIds`, and `--mono` picks only the builds. This replaces T023's "clash G3 not played" rule.
  - **#15's line reports ties.** In a 20-seed jittered screen at 300 gold, 10 of mono Gill Nest's 71 answers tie at 100%, and the line answers "yes" from whichever ranks first. It should say how many tie and how many of them are swarm-only, and leave out answers that fail clash G3 (⚑), or label them.
  - **G13 counts only the counted fields.** G3 and G12 drop the three-lane screen through `countedFields` (R1-Q9), but G13's share and PASS/FAIL take it in with `--fields one,twin,three`. Count the bar over the counted fields, and report `three` beside it.
  - As built (S5):
    - `evaluateClashCounters` takes `builds` (what `--mono` passes) and refuses a build or a mono answer that clash G3 didn't play, so `ClashAnswer.untested` is gone. `--checks clash` plays G3 on every mono of `clashArmyIds`.
    - `ClashMatrixRow.best` holds the answers that count tied for the best at its budget (by the worst field, then the mean), and the swarm-only ones among them. The #15 line reads, for example, "300: 7 of 10 tied at 100%", and names the swarm-only answers, or the best ones when none is swarm-only.
    - `clashG13` counts the bar over `countedFields` of the fields in its records, and reports the three-lane screen as `three`, beside the bar.
- [x] T055 [US2] Guard the clash tools in `tools/lib/clash.ts`, `tools/lib/balance.ts` and `tools/experiment.ts`, from the same review (§12.2, §15.3)
  - `playClash` fails loudly if a clash at jitter 0 draws a random number. The cache merges clashes on that assumption, and only one test guards it today.
  - `--checks clash` checks its numbers: `--top`, `--screen-seeds`, `--g3seeds` and `--confirm-seeds` at least 1, and `--jitter` at least 0. Today `--top 0` fails every build, `--screen-seeds 0` ranks NaN, and a negative jitter prints "on" but applies none.
  - The `rework` refusal runs before any check in the command, so it doesn't throw away their work.
  - As built (S5): at jitter 0, `playClash` compares `state.rng` at the clash's end with its value after `createBattle`, and throws if a stream moved. The CLI's refusals and number checks run before any check, `--seeds` included in `--pair` mode.

**Checkpoint:** `npm run verify` is green with no moved hash. The small run in the Stories table finishes in about a minute, and the same run with `--workers 1` writes JSON identical apart from `options.workers` and `timing` (this is the pooled-equals-in-process check).

## Phase 5: US3 — The variants (P2)

**Goal:** every variant §16 R1 lists, plus the ones the plan's calls add, runs through `--checks clash` with its own spec or option. **Independent test:** the US3 run in the Stories table.

- [x] T025 [P] [US3] Write the `kept` preset's tests in `tests/unit/combatRework.test.ts`, as "the kept preset (R1)" beside "the package (preset rework)" (§1.3 #11, §16 R1)
  - `protoContent('kept')` loads. `rules.pin`, `cloud`, `burst` and `cleave` are set; `rules.waves`, `help`, `mixed`, `flying` and `stormWaves` are absent.
  - Both rosters end with `bursterPod` and `rhizomorphTunnel`; the Elder Sporeling keeps its 0.6 splash; `balance.json` has none of it by default.
- [x] T026 [P] [US3] Write the other presets' tests in `tests/unit/prototypes.test.ts` (§16 R1, §12.4)
  - `noeldersplash` removes `unit.sporeling.mergePerks.3.splashRadius`.
  - `clashpace` compiles `rules.waves` with `rangedGap` 1 and `matchPace` true.
  - `clashshield` sets `balance.mixedWave` (minTypes 2, shieldFrac 0.2) and leaves `rules.mixed` absent, so a 600-tick `bot:balanced` against `general:scripted` battle has the same units, buildings and outcome as without it (compare those, not `hashState`, which covers the balance).
- [x] T027 [US3] Add the presets `kept`, `noeldersplash`, `clashpace` and `clashshield` to `PROTO_PRESETS` in `src/data/proto.ts`, each with a doc comment (§16 R1, §1.3 #11, §12.4)
  - `kept` = { ...PINNED, ...SPORE_CLOUD, ...BURSTER, ...CLEAVE, ...RHIZOMORPH }, with `faction.velvet-bloom.buildings+` and `faction.gray-rot.buildings+` set to ['bursterPod', 'rhizomorphTunnel'], since spreading keeps only the last append.
  - `noeldersplash` = NO_ELDER_SPLASH. `clashpace` = WAVES; its comment says the pace rule exists only in the clash check, which stamps wave 0 (plan call 9). `clashshield` = MIXED_WAVE alone, read by the clash check (plan call 10).
- [x] T028 [US3] Add the variant tests to `tests/unit/clash.test.ts` (§16 R1, §12.2) ⛔ X4, §18.2 #51, R1-Q6
  - Shield: under `clashshield`, a lane army of 2 or more unit types (a merged form counts as its base type) gets round(0.2 × max HP) shields on every unit at the arrival, before the muster; a one-type army gets none; a unit knit at the muster keeps its parts' shields in proportion. Emplacements neither count as a type nor take a shield: a lane of Capguards and a Mortar is one type, and the Mortar's building has no shield (R2a decides emplacements if #8 is adopted).
  - Pace: under `clashpace` every arriving unit has wave 0, an idle lane army marches at its slowest idle unit's pace, and idle ranged units stop 1 tile behind their side's frontmost melee unit. Without it, each unit moves at its own speed.
  - `merging: false`: no knits at the muster or after.
  - Squads: `squadSeconds` 45 and 75 give Burrow 6 and 10, Lodge 2 and 3, Forge 3 and 4; `squadScale` 45 and 75 give Burrow 6 and 10, Hollow 5 and 8, Lodge 2 and 3, Forge 3 and 5; `squad: { sporelingBurrow: 7 }` gives 7.
  - Copies 3: no card fields more than 3 buildings; mono Burrow at 1,500 holds 3 Burrows and fills the rest by `bot:balanced`'s weights; `bot:balanced` also stops at 3 of a card.
  - Core six: the `core6` reference weighs the five core spawners and the candidate at 1 each, with the Burrow as its opener.
- [x] T029 [US3] Add the variants to `tools/lib/clash.ts`: the arrival shield from `content.balance.mixedWave`, the wave-0 stamp when `state.rules.waves` is set, `merging` off, `squadSeconds`, `squadScale` and per-building `squad` overrides in `squadSize`, and `copies` in `armyFromBot` (§16 R1, §11.2, §8.10) ⛔ X4, §18.2 #51
  - The shield copies `shieldMixedWaves`'s rule (`src/sim/systems/spawning.ts`) without its wave filter, per lane, before the muster. It counts unit types over units only: emplacements neither count as a type nor take a shield in R1, since a v1 building holds none.
  - Copies use #51's recommendation provisionally: a mono's card capped at N, the rest of its gold and plots by `bot:balanced`'s weights. If the user changes #51, only this rule changes.
  - As built (S5): `squadSize(content, id, opts)` takes `SquadOpts` ({ `squadSeconds`, `squadScale`, `squad` }; the first two don't combine), and `armyFromBot` and `armyOf` take `ArmyOpts` (the squads plus `copies`). With `copies`, a `bot:mono:` army that runs out of picks draws on with `bot:balanced`'s weights, on the same stream. `playClash` stamps wave 0 when `rules.waves` is set and shields at the arrival from `content.balance.mixedWave`, both before the `stage` hook, and gained a `step` hook for the pace test. The core-six test's `CORE_SPAWNERS` and `core6Spec` are in `tools/lib/balance.ts`, for T030.
- [x] T030 [US3] Add the core-six check, the merge mirror, the fixed reference and the squad table to `tools/lib/balance.ts` (§16 R1, §11.4, §12.3 G7) ⛔ R1-Q6
  - Core six (`core6: <candidate>`): builds and answers limited to the five core spawners plus the candidate (the Burster Pod or the Puffball Mortar): their monos, the 15 even pairs and `bot:core6`, the G3 reference. `bot:core6` is a spec item the check appends, as `counterBotSpec` does: `bot.core6:{"description":"core six, even","opener":["sporelingBurrow"],"weights":{<the six>:1},"mergePolicy":"on","fixedWeights":true}`.
  - Report §11.4's intended graph: each "beats" and "loses to" edge as the clash win rate per budget (A011). §11.4 has a row for the Burster and none for the Mortar, so the Mortar's run reports its measured row (what it beats and loses to at 60% or more) with no intended row beside it.
  - Merge mirror (`mirror`): every G3 build and `bot:balanced` against its own army with merging off, per budget and field, 20 seeds per seat: G7's round form, for #9 (A015).
  - Fixed reference: when the spec holds `bot.balanced.fixedWeights:true`, the report labels G3 "reference on its data weights" and lists the appended monos and pairs apart (A023).
  - The squad table: each building's squad and value per gold (§11.4: squad × sqrt(HP × DPS) × role factor / cost, with §11.4's role factors; "–" for the Burster and the Tender) under the run's squad options (A010).
  - As built (S5):
    - Core six: `CORE_SPAWNERS`, `core6Spec`, `core6Ids`, `core6Answers` (the six's monos, their 15 pair bots and `bot:core6`) and `evaluateCore6Graph`. The graph plays every two of the six's monos at the screen's seeds, so it shares the screen's clashes, and reads each edge as its winner's rate. `evaluateClashG3` takes a `defender`, which `--core6` sets to `bot:core6`.
    - Merge mirror: `evaluateMergeMirror`, on twin cells (`Cell.twin`): the second army is the first's own, on the same seed, with merging off, and it plays as "<controller> (merging off)". `CLASH_CHECK.mirrorSeeds` is 20. It reports each merge-on side's mean against G7's 55–70%, report only.
    - Fixed reference: `ClashG3Verdict.reference` is "data weights" and `appended` lists the builds whose card carries `aiWeight`. Their rows print apart, after the others.
    - Squad table: `squadTable` and `squadLines`. At 60 s it gives §11.4's table to the hundredth (Burrow 1.83 a gold, 201 a plot). The Burster and the Tender read "–", and towers have no squad, so the table leaves them out.
    - The mirror's and the graph's records join G13 through `uniqueCells`.
- [x] T031 [US3] Add the variant options to `tools/experiment.ts`: `--merging off`, `--squad-seconds S`, `--squad-scale S`, `--squad <id>=<n>[,…]`, `--copies N`, `--core6 <id>`, `--mirror`, `--fields three`, `--extra-plots 4` (applied at 1,200 and 1,500 only), `--lanes-rule general`, `--v1-movement` and `--v1-targeting`; put each in the report's options and the header comment (§12.2, §15.3)
  - From S4's review: `clashCache` doesn't key on options, which works only while one cache holds one set of them. `--extra-plots` varies by budget, so extraPlots goes into both its army key and its clash key. Extra plots move squads even for the same army: a fifth back-line squad goes to rank 2 instead of rank 0.
  - As built (S5): `clashCache` takes `army` (the `ArmyOpts`) and `extraPlotsFrom` (`CLASH_CHECK.extraPlotsFrom`, 1,200), and the extra plots join its army key, its field cache and its clash key. The other clash options stay one set per cache. The options are checked before any check runs, and they're refused with `--pair`. Each one set names the default label (for example `clash-kept-copies3`) and the stdout's "clash variant" line. The report adds `squads`, plus `core6` and `mirror` when asked. A jittered run of five variants together (kept, copies 3, extra plots 4, core six with the Burster, the mirror) writes the same JSON on 1 worker as on 4.

**Checkpoint:** `npm run verify` is green with no moved hash; the US3 run in the Stories table writes its report.

## Phase 6: US4 — The race model and battle 1 (P2)

**Goal:** the race-model section for X5, the cap-binding and drawn shares, and the battle-1 pairing table. **Independent test:** `npx vitest run tests/unit/roundRace.test.ts` passes, and the small US2 run prints a race section.

- [x] T032 [P] [US4] Write the race tests in `tests/unit/roundRace.test.ts` (new) (§6.4, §6.5, §6.7) ⛔ X5
  - A stream of 400-raw wins routs a 2000 Heartcap in round 5 (400 × 4, then 480).
  - A raw 600 is capped to 500. At round 9 a raw 200 becomes 400 and a raw 300 is capped at 500: the storm applies before the cap.
  - Both Heartcaps at 0 in one round: the player loses (E8).
  - The Decision after round 9: damage dealt, then the HP fraction, then the general. Under the alternative, by share of max HP lost.
  - The alternatives: a cap of 25% of the loser's max HP (500 against 2000, 750 against 3000, 900 against the boss's 3600); the cap × stormBp; equal Heartcaps (2000 + 250 × (i − 1) on both sides).
  - Round r of battle i reads the clash at the measured budget nearest below 300 + 75 × (i − 1) + 150 × (r − 1), at most 1,500.
  - The G4 case: `raceReport` builds it only from records whose armies are `bot:balanced` against `general:scripted`, or `bot:balanced` against itself with the second army on seed 1,000 + s; a G3 record (a mono against `bot:balanced`) never enters it. In the first, the `bot:balanced` side is the player whichever seat it played. X5's section lists the G4 case first, then the G3 cases.
- [x] T033 [US4] Build the race model in `tools/lib/roundRace.ts` (new): `raceBattle(rounds, opts)` and `raceReport(records, opts)`, pure functions over clash records (§6.4, §6.5, §6.7, §4.5) ⛔ X5
  - The G4 case first (A193): G4's pairing (§12.3), `bot:balanced` against `general:scripted` at every budget on the one-lane field, 50 seeds per seat, with `bot:balanced` as the player (3000). Beside it, `bot:balanced` against itself on fresh seeds (the second army on seed 1,000 + s), where the seat sets who is the player. These are even battles, the population A193's claim and G4's band (≤ 15% reach round 9, median 6–8) are about. X5's section quotes them first.
  - Then the G3 cases, the lopsided ones: each (mono, seed, seat, field) of G3's records. The seat as played sets who is the player (3000).
  - Each case gives one battle per battle index 1–5, a Fortified elite at index 3 (the general's Heartcap +30%) and the boss (3600, index 6).
  - Per case and alternative: the median rounds, the share reaching round 9, Routs by side and round, how often the lead changes, and the shares of general wins by Rout and by Decision.
  - The header says what it leaves out: income, comeback gold and counters; and one seed's armies at each budget stand in for a colony growing within a battle (plan call 17).
- [x] T034 [US4] Add the race section to the clash report in `tools/lib/balance.ts` and `tools/experiment.ts` (`--checks clash` prints it after G13), with the G4 row, the cap-binding share and the drawn share (§6.7, §12.3 G4, §16 R1)
  - From S4's review: in `clashCache`, `full()` after `slim()` on the same key plays the clash again, and the clash then shows twice in `records()` and `played` (`balance.ts:869–879` at `f9a579b`). If the G4 row asks for both, `full()` reuses the record instead.
  - The G4 row: `evaluateClashG4Row(content, opts)` in `tools/lib/balance.ts` plays T033's G4 case on the one-lane field at every budget in `--budgets`, in both seats, at `--g4seeds n` per seat (default 50 here; the option exists for v1's `g4`, whose default stays G4's 40), on the pool with the dedupe and the jitter. `--checks clash` plays it by default, so every clash report (r1-baseline and r1-kept included, T042) carries its records; its records join G13's (T022).
  - Cap-binding (A208): per budget and field, the share of records whose loser's uncapped Heartcap damage passes 500, at storm ×1.0 and at the budget's round storm (×1.0, ×1.0, ×1.2, ×1.6, ×2.0 at 300 to 1,500).
  - Drawn share (A022): per budget and field, the share of records whose capped round result is a draw.
- [x] T035 [P] [US4] Write the pairing tests in `tests/unit/clash.test.ts` (§8.1, §7.8, §11.10)
  - The pairings come from the data: each commander's `starter` (`data/commanders.json`) against each adaptive, non-boss general with 1 in `appearsIn` (`data/generals.json`): Old Mother Mold and the Lichen Baron. Runs use only adaptive generals (`assignGenerals` in `src/run/route.ts`), so `scripted` is left out.
  - A general's battle-1 kit is §7.8's rule at index 1: its opener's cards, economy filtered. Mold's is the Sporeling Burrow alone; the Baron's the Capguard Hall (its Cellar filtered). Each equals `generalKit(content, createRun(content, { seed: 1, commander: 'vesper' }), { kind: 'battle', map: 'bogwater-hollow', general: id }, 1).kit` (`src/run/flow.ts`) with economy cards removed.
  - A starter's candidate armies are the monos and even pairs of its army cards.
- [x] T036 [US4] Add `--checks pairings` to `tools/experiment.ts`, with `evaluatePairings(content, opts)` in `tools/lib/balance.ts`: at 300, 600 and 900 gold, the general's army from its opener and weights limited to its battle-1 kit, against each starter's candidates; report each pairing's best candidate and its win rate, and the share of pairings with no answer at 60% or more (§16 R1, §12.3 G14)
  - Both fields (the one-lane field counted twice in the mean), 20 seeds, the general's army in the enemy seat only, at `--jitter` as given (the report states it). Passives are off: both controllers are `human` in a clash (T016), so `sideModifiers` adds none, and R2-Q17 decides their v2 form.
  - It's the measurement R2-Q13 asks for (A201): R2b decides on a guaranteed answer in battle 1 from it.

**Checkpoint:** `npm run verify` is green with no moved hash, and the small US2 run prints the race section, the cap-binding share and the drawn share.

## Phase 7: US5 — The full colony and the bench case (P2)

**Goal:** the most a full colony fields is known, and the bench times a clash of two full colonies. **Independent test:** `npm run bench` prints the full-colony case beside `bench-300`, and its exit code depends only on `bench-300` and the full battle, as today.

- [x] T037 [US5] Add the full-colony and overflow tests to `tests/unit/clash.test.ts` (§13.7, §4.6, §18.2 #7, #11) ⛔ R1-Q5
  - `fullColony`: at the first-guess sizes the biggest one-lane colony is 12 plots. 12 Burrows at the level-3 squad of 12 field 144 units and 144 supply a side; 12 Dens field 36 units and 108 supply; 12 Burrows of 8 field 96. Twin Roots' 16 plots field 192 units a side at 12 per squad.
  - The overflow table lists each squad at 45, 60 and 75 s and with +1 (the Vault's first guess) and +2 (the Shrine's), and flags the overflows (for example Hall 5, Forge 5, Den 5) (A020).
- [x] T038 [US5] Build `fullColony(content, opts)` and `overflowTable(content, opts)` in `tools/lib/clash.ts`, and print both as sections of the clash report in `tools/experiment.ts` (§13.7, §4.6) ⛔ R1-Q5
  - `fullColony`: per building, its squad, its squad with the v1 upgrade levels that add units (`building.spawnCount` in `data/upgrades.json`: the Burrow's 12, the Warren's 9), supply and units; per field, the biggest colony by units and by supply, against "about 100 supply" and against 150 live units a side at the arrival (A004, A200).
  - Sensitivity rows for SPEC's other unit-adding first guesses (A200): every squad +1 (the Rhizome Vault's "each spawner beside it fields 1 more unit", §11.2, as an upper bound that ignores the Vault's own plot); the squad in front +2 (the Velvet Shrine's); and Old Mother Mold's passive (§7.7's first guess: `swarm` squads +10%, rounded up, so a Burrow's 12 become 14). Each row gives the biggest colony's units and supply a side.
- [x] T039 [US5] Add the full-colony clash to `tools/lib/bench.ts` as `runClashBench(content)`, and print it in `tools/bench.ts` (§13.7, §15.4) ⛔ R1-Q5
  - Two cases: the one-lane field at 12 plots and Twin Roots at 16, every plot a Burrow of 12 Sporelings, merging off (A018).
  - Warm on a throwaway copy, then time the arrival (both armies placed) against 5 ms, and every tick until the clash ends (at most 920): mean, p95, p99, peak units and heap growth, against G11's 1.0 ms mean and 2.5 ms p99.
  - Print the verdict as "report only until R2 adds it to G11". It doesn't change the exit code, and `--quick` skips it, so `npm run verify` is unchanged. `bench-300` stays the stress case of placed units (A112, A119).

**Checkpoint:** `npm run bench` prints both cases; `npm run verify` is green with no moved hash.

## Phase 8: Polish and verification

- [x] T040 [P] Document the clash check as built in `SPEC.md`: §12.2 (the winner rule, the jitter, the dedupe, the measured cost), §13.4's `formation.ts` row (the function names), §15.3 (every option of `--checks clash` and `--checks pairings`) and §15.4 (the full-colony case, report only) (§16's intro: a milestone documents its commands in §15; A017)
- [x] T041 Verification step 1: run `npm run verify` (`tools/verify.ts`) and `npm run golden -- verify` (`tools/golden.ts`); no hash moves, and the unit suite covers the slot layout and the muster (one Burrow, two side by side, three in a row); also run `npm run test:slow`, whose v1 guardrails must give the same verdicts as `develop` before R1 (no rule changed; a v1 miss isn't open work, CLAUDE.md); quote the summaries in the commit (§16 R1 verification 1, §15.7)
- [x] T042 Verification step 2: the clash check on today's combat and on `kept`, in the background, each writing `reports/experiments/<label>.json`; note each run's wall time for `docs/r1-plan.md`'s As built (§16 R1 verification 2)
  - Each run plays the G4 row by default (T034), so r1-baseline and r1-kept carry the even battles X5's race section quotes first.
  - `npm run experiment -- --checks clash --budgets 300,600,900,1200,1500 --jitter 0.2 --matrix all --mirror --workers 8 --label r1-baseline`
  - `npm run experiment -- --checks clash --budgets 300,600,900,1200,1500 --jitter 0 --workers 8 --label r1-baseline-j0` (the deterministic reference)
  - `npm run experiment -- --proto kept --checks clash --budgets 300,600,900,1200,1500 --jitter 0.2 --mirror --workers 8 --label r1-kept`
  - `npm run experiment -- --proto kept,bot.balanced.fixedWeights:true --checks clash --budgets 300,600,900,1200,1500 --jitter 0.2 --workers 8 --label r1-kept-fixedref` (A023)
- [x] T043 Verification step 2, the variants: 20-seed screens with `tools/experiment.ts` (`--checks clash --budgets 300,600,900,1200,1500 --g3seeds 20 --confirm-seeds 20 --jitter 0.2 --workers 8`), each against the baseline and with its own label in `reports/experiments/`, in this order (§16 R1 verification 2, §12.2)
  - `--merging off`; `--proto noeldersplash`;
  - `--squad-seconds 45`, `--squad-seconds 75`, `--squad-scale 45`, `--squad-scale 75`; `--squad sporelingBurrow=6`, `--squad sporelingBurrow=7`;
  - `--proto pinned`, `sporecloud`, `burster`, `cleave`, `rhizomorph`, alone; `burster` and `rhizomorph` again with `bot.balanced.fixedWeights:true`;
  - `--proto clashpace`; `--lanes-rule general --fields twin`;
  - last, `--proto clashshield`. Not `--proto rework`.
- [x] T044 Verification step 2, the set of pieces, with `tools/experiment.ts`: if `kept` fails a bar, screen sets by this rule, then confirm the best set that passes at 50 seeds (`--g3seeds 50 --confirm-seeds 50 --mirror`) (§16 R1 Done when, §18.2 #8, #9)
  - Mono Sporeling fails G3 or G12: screen `kept,noeldersplash`, then `kept,clashshield`.
  - G13 fails: screen `kept,clashpace`.
  - A piece whose own screen (T043) fails a bar: screen `kept` without it, written as a CLI spec of the other four presets, for example `pinned,sporecloud,burster,cleave`. CLI specs apply presets in order and `setPath`'s `+` accumulates appends (`src/data/proto.ts`), so the spawners the four bring stay appended.
  - If no screened set passes, say so, and confirm the set closest to passing.
- [x] T045 The other measurements the calls ask for, with `tools/experiment.ts`, as 20-seed screens unless noted, each with its own label in `reports/experiments/` (§16 R1, §12.2) ⛔ X4, R1-Q4, R1-Q6, R1-Q9
  - X4 (A196): `--copies 2`, `--copies 3` and `--copies 4`, on the baseline and on T044's set.
  - R1-Q4 (A005): `--extra-plots 4 --budgets 1200,1500`, the late-run colony.
  - R1-Q6 and #36's reading (A011): `--core6 bursterPod --proto burster` (or T044's set) and `--core6 puffballMortar`.
  - R1-Q9: `--fields three`, a lead outside the bars.
  - A021 and A008: `--v1-movement` and `--v1-targeting`, to show what each switch changes in G13, far-edge parking and the Mortar's cells.
  - A116: `npm run experiment -- --proto kept --checks duels,g8`, G1, G2 and G8 on v1's battle with the kept set; record any new miss.
  - R2-Q13 (A201): `npm run experiment -- --checks pairings --jitter 0.2`.
- [x] T052 Verification step 2, the 50-seed confirmations, with `tools/experiment.ts`: re-run at 50 seeds per seat (`--g3seeds 50 --confirm-seeds 50`, the same spec and options, the label with `-50` appended) every T043–T045 variant whose screen flips a bar against the baseline, or that supports a recommendation departing from SPEC's first guess (§16 R1 verification 2, §12.2)
  - §16 R1 quotes numbers at 50 seeds; a 20-seed screen is good to about ±8 points.
  - List in the T047 entry which variants were confirmed and why. Every other variant number is labelled "a 20-seed screen".
- [x] T046 Verification step 3: `npm run bench` (`tools/bench.ts`); record each full-colony case's units and supply a side, the arrival time and the tick mean and p99 against §13.7, and if a case is over, the lever that brings it inside (squads, the upgrade's +1 per batch, or plots) (§16 R1 verification 3, §13.7) ⛔ R1-Q5
- [x] T047 Write R1's entry in `docs/balance-backlog.md`, replacing its "Open: R1" item: the date, the commit, every command, the seeds and the jitter, and the results with a recommendation for each (§16 R1 Done when, §18.2 #7–#15)
  - G3, G12 and G13 tables per budget beside the pooled result, for the baseline, `kept` and T044's set; the variant screens.
  - Seeds: a number quoted as a result comes from a 50-seed run (T042, T044's confirmation, T052). Every other variant number is labelled "a 20-seed screen", and a recommendation for #8, #9, #12 or X4 rests on a 50-seed number.
  - #7: squads and value per gold under each squad option, and the full colony against §13.7 (with T046). #8 and #9: the shield and splash variants and the merge mirror. #10: the Mortar's cells with the switch on and off, and how often emplacements alone held a lane. #11: the overflow table, noting it rests on few cases (A020). #12: the pace variant's G12, G13 and clash length. #13: both cap readings. #14 and #15: the clash matrix beside §7.4's sets.
  - X4: G3 and G12 under 2, 3 and 4 copies beside unlimited. X5: the race section, with the cap-binding and drawn shares. R2-Q3 and A041: the eliteShare readings. R2-Q7 and A057: Puppet Bloom's trios per clash. R2-Q13: the pairing table. #36: the core-six check.
  - A proposal for each knob (A109): adopt as data, keep default-off, or delete, for `pinned`, `sporecloud`, `burster`, `cleave`, `rhizomorph`, `kept`, `noeldersplash`, `clashpace`, `clashshield` and `swarmread`, and for the two switches (R2a builds the rule).
  - The new knobs, as `src/data/proto.ts`'s header asks. No entry in `data/CHANGELOG-balance.md`: R1 changes no data.
- [x] T048 Write the hand-over in `docs/status.md` and the As built in `docs/r1-plan.md` (§16 R1 Done when)
  - `docs/status.md`: R1's results in short, what waits on the user (T049), and what R2a takes: the `formation.ts` API (`formationBox`, `slotPositions`, `emplacementPosition`, `overflows`, `findTrios`, `musterKnits`), `tools/lib/clash.ts`'s army builder and slot assignment (`armyFromBot`, `lineOf`, `assignSlots`) for R2a's `playRoundClash`, the pool's clash jobs, the knobs' proposed outcomes, and the bench case.
  - `docs/r1-plan.md`: what was built against the plan, the calls that changed, and the runs' wall times (A013).
- [ ] T049 [USER] Review gate: the user reads the R1 entry in `docs/balance-backlog.md`; agrees the squad sizes (#7) and the set of pieces R2a starts from; settles #8–#15; makes the X4 call and, if X4 is yes, #51 (what mono means under copies); makes the X5 call; gives the #36 reading; and picks each knob's outcome (A109) (§16 R1 verification 4) ⛔ R1 results
- [ ] T050 Record the gate's calls: the dated Decision lines in `docs/tasks/clarify.md` (#7–#15, X4, X5, #36's reading, and #51 if settled); in `SPEC.md`, §18.2 rows #7–#15 marked "(closed)" with the decision and the date, §11.2's Squad column, §6.7's emplacement rules (with A029's list if agreed), §13.7 if the bench's result changes the budget T051 wrote or the user adopts a lever, the Open markers they settle in §4.6, §5.2, §5.6 and §7.4, §6.5 and §6.7 for X5's call, and §16 R2's knob lists (A109); and `docs/status.md`'s "Next: R2a S0" (§16 R1 verification 4, §18.2)
  - X4, if yes: D45 (§18.1) replaced, §8.10's "By milestone" line, §12.3's "Open: what mono means" marker, and §16 R2's and R3's scope (copies move to R2a). If #51 is settled with it, §18.2 row #51 marked "(closed)" and §12.3's rule written. If no, D45 stands and the X4 block says so.
  - No data change: R2a adopts the data and logs it in `data/CHANGELOG-balance.md`.

**Checkpoint:** `npm run verify` is green with no moved hash; `docs/balance-backlog.md` has R1's entry; the clarify blocks #7–#15, X4 and X5 have Decision lines.

## Dependencies and parallel work

- **Phase order:** Setup (S0, docs only) → Foundational → US1 → US2 → US3, US4 and US5 → Polish.
- **Inside Foundational:** the formation tasks (T003–T006), the switches (T007–T010) and the armies (T011–T012) share no file. The formation tasks run in S1; the switches and the armies in S2, beside it.
- **Story dependencies:**
  - US1 needs all of Foundational: `formation.ts` for the slots and the muster, the switches for the baseline's combat, the armies for what stands in the slots.
  - US2 needs US1's runner and records.
  - US3, US4 and US5 need US2's report. US5's bench case needs only US1's runner, so T039 could start after S3 if S6 is short of time.
  - T052 needs T043–T045's screens; T047 needs T052.
- **Sessions in parallel:**
  - S1 and S2, once S0 has merged.
  - S5 and S6, once S4 has merged. Both add to `tools/lib/clash.ts`, `tools/lib/balance.ts`, `tools/experiment.ts` and `tests/unit/clash.test.ts`. The additions are separate functions and options, so the second to merge rebases.
- **Beside R1,** if the user agrees X3 and X10: R4a and records-1 run in sessions of their own. They touch none of R1's files except `docs/status.md`, where each keeps to its own section.
- **Handoffs out:**
  - R1/T004 and T006 → R2a/T020 (`formationFor` and `musterFor`, on `formationBox`, `slotPositions`, `emplacementPosition`, `findTrios` and `musterKnits`, unchanged) and R2a/T043 (Begin's arrival and muster) (§14.6).
  - R1/T012 and T014 (`armyFromBot`, `lineOf`, `assignSlots` in `tools/lib/clash.ts`) → R2a/T116's `playRoundClash`, which R2a/T122 uses for G1, G12 and G16 in round form. R1's `placeArmy` and `playClash` (T014, T016) run on v1's sim, and R2a doesn't reuse them.
  - R1/T021 → R2a/T117 and T123, whose `rounds` job kind joins the clash jobs in `tools/lib/pool.ts` (A102, R2-Q9).
  - R1/T008–T010 → R2a/T035, T037 and T038 write the idle seek and siege targeting as the rule in its round systems; R2b/T043 deletes the flags with v1's `src/sim/state.ts` and `src/sim/compile.ts`, and R2b/T158 deletes the tool code that sets them.
  - R1/T051 → every later session: SPEC §16 R1 and §12.2 state the agreed calls.
  - R1/T039 → R2a/T114: the bench in round form, `bench-300`'s rewrite and G11's arrival budget (A119).
  - R1/T033 and T034 (the race model) → X5's call at T049, then R2a/T119's bands.
  - R1/T047–T050 → R2a/T002 (its gate check) and R2a/T009–T011 (squad sizes, the chosen set, each knob's outcome, A109), with the X4 and X5 calls. Also R2b S1b's pairing table (R2b/T028, R2-Q13) and G14's evidence.
- **Handoffs in:** SPEC v2 is merged (#39). The task lists (this file, `docs/tasks/clarify.md`, `docs/tasks/spec-analysis.md`, the `feature/v2-tasks` PR) must be on `develop` before S0.

## Sessions

| Session | Tasks | Branch | Gate (true before starting) | Ends with |
|---|---|---|---|---|
| S0 | T001, T051, T002 | `feature/r1-plan` | SPEC v2 (#39) and the task lists (`feature/v2-tasks`) merged into `develop` | A docs-only PR into `develop`: the plan agreed; R1-Q1 to R1-Q9 recorded in `docs/tasks/clarify.md`, SPEC and `docs/status.md`; verify green |
| S1 | T003–T006 | `feature/r1-formation` | S0 merged | A PR into `develop` with `src/sim/formation.ts` and its tests; verify green, no golden moved |
| S2 | T007–T012 | `feature/r1-armies` | S0 merged; may run beside S1 | A PR into `develop` with the two switches and the army builder; verify green, no golden moved |
| S3 | T013–T019 | `feature/r1-clash-runner` | S1 and S2 merged | A PR into `develop`: one clash recorded, and `--checks clash --pair`; verify green |
| S4 | T053, T020–T024 | `feature/r1-clash-bars` | S3 merged | A PR into `develop`: `--checks clash` with G3, G12 and G13 on the pool; the small run's output in the PR |
| S5 | T054, T055, T025–T031 | `feature/r1-variants` | S4 merged | A PR into `develop`: the fixes from S4's review first (T054, T055), then the four presets and every variant option; verify green, no golden moved |
| S6 | T032–T039 | `feature/r1-race-bench` | S4 merged; may run beside S5 | A PR into `develop`: the race model, the pairings, the full colony and the bench case; `npm run bench` output in the PR |
| S7 | T040–T045, T052, T046–T048 | `feature/r1-results` | S5 and S6 merged | The runs done (about 40, in the background); a docs PR into `develop` with R1's entry in `docs/balance-backlog.md`, `docs/status.md`, the plan's As built and SPEC §15's tool docs |
| S8 | T049–T050 | `feature/r1-gate` | S7's PR merged, and the user has read the report | The user's calls recorded in `docs/tasks/clarify.md`, SPEC and `docs/status.md`, in a PR into `develop`; R2a S0 may start |

Each session ends in one PR into `develop`, opened when the user asks and never merged by the session (CLAUDE.md).

## Coverage

**Table 1: SPEC §16 R1**

| SPEC §16 item | Tasks |
|---|---|
| Scope: the tool, `--checks clash`, a clash row in `tools/lib/balance.ts`, built on `createBattle`, `addUnit`, `addBuilding` and `runHeadless`, the full check on the worker pool | T016, T021, T022, T023, T024 |
| Scope: armies from build lists: the opener, then weighted picks on the AI stream, until a gold budget is spent | T011, T012 |
| Scope: the budget counts army buildings only; economy picks are skipped | T011, T012, T051 (utility picks skipped too, A016) |
| Scope: each spawner's squad from §11.2 (a minute of spawns, whole batches, halves up); `--squad-seconds`; the Mortar as an emplacement | T011, T012, T028, T029, T031 |
| Scope: no supply cap; 8 plots on one lane, 6 a lane on Twin Roots, up to 4 more at the top budgets | T011, T012, T013, T014, T045 |
| Scope: formation by role first, then by plot once by role reads clearly | T013, T014 (by role); by plot is R2's, and T051 says so in SPEC (plan call 1, A019) |
| Scope: by role, melee in front and ranged and emplacements 2 tiles behind, files in order, a full rank's squad to the nearest free slot | T013, T014 (§7.3's tags and centre-out files, R1-Q1); T051 (SPEC's wording, A006) |
| Scope: the slot layout as a pure function in `src/sim`, which `formationOf` reuses | T003, T004, T048 |
| Scope: code but no rule, so no golden moves | T041, and every phase's checkpoint |
| Scope: jitter as a measurement option only | T020, T022, T024, T042 |
| Scope: the clash: both armies on the same tick, front ranks 6 tiles apart, a flat field with the map's lanes, merging on | T013, T014, T015, T016 |
| Scope: §5.6's muster: 1 s, knits in place to a fixed point, landing on the first tick; v1's rule after it | T005, T006, T015, T016 |
| Scope: the muster's knitting as a pure function beside the layout, which `mergePreview` reuses | T005, T006, T048 |
| Scope: the clash clock includes the muster; a clash runs until one side is gone in every lane, or 45 s | T015, T016 |
| Scope: the records, with eliteShare after the muster, with and without `ai.counter.swarmMaxSupply` | T017, T018 |
| Scope: #11, overflow at each squad size, fielded packed tighter | T003, T004, T017, T018, T037, T038 |
| Scope: #12, the pace variant (`matchPace` and `rangedGap`) against each unit at its own speed | T026, T027, T028, T029, T043 |
| Scope: #13, the stall share and the median clash length, with the muster counted and with the cap after it | T015, T016, T020, T022 (`clashG13`) |
| Scope: #14 and #15, the clash matrix and best answers per budget beside §7.4's sets; whether `swarm` spawners best answer mono Gill Archers | T023, T042 |
| Scope: fields, one lane of 8 rows and Twin Roots' two lanes of 6, the split alternating to start; the one-lane field counts twice | T013, T014 (the split per R1-Q1, with §7.3's rule as a variant), T020, T022, T043, T051 |
| Scope: budgets of 300 to 1,500, each shown beside the pooled result | T022, T024 |
| Scope: variants, merging off, then only the Elder Sporeling's splash off | T026, T027, T029, T031, T043 |
| Scope: variants, squad minutes of 45, 60 and 75 s, and the Burrow at 6 and 7 | T028, T029, T030, T031, T043 |
| Scope: variants, the kept pieces alone and together; `kept` with both new spawners appended; not `rework` | T024, T025, T027, T042, T043, T044 |
| Scope: variants, the sixth archetype's candidates | T028, T030, T045 (the core-six check, R1-Q6) |
| Scope: variants, last, the mixed-wave shields at the arrival; the waves requirement lifted for the clash check | T026, T027, T028, T029, T043 (read in the tool, plan call 10) |
| Scope: the bench case, one clash of two full colonies | T037, T038, T039, T046 |
| Not in R1: no round loop, income, planning, drafts, UI or rule and data change; the new knobs default-off | T025, T026, T041 |
| Done when: the squad sizes are chosen and recorded as R2's starting data | T047, T049, T050 |
| Done when: a set of pieces passes the bars, and the report says whether it needs the shields and the Elder's splash | T042, T043, T044, T047, T049 |
| Done when: the most supply a full colony fields is known and fits §13.7 | T038, T039, T046, T047; T051 states the budget (R1-Q5) |
| Done when: §6.7's first-guess emplacement rules are confirmed or changed | T009, T045, T047, T049, T050 |
| Done when: every §18.2 row #7–#15 has its measure and a recommendation | T047 |
| Done when: the results are in `docs/balance-backlog.md` and `docs/status.md`, and the user has seen them before R2 | T047, T048, T049 |
| Verification 1: `npm run verify`, no golden moves; the unit suite covers the slot layout and the muster | T003, T005, T041 |
| Verification 2: the clash check on today's combat and on `kept`, the variants, seeds 20 and 50, the bars G12, G3 and G13, the per-budget flags | T042, T043, T044, T045, T052 (50 seeds for any number quoted), T047 |
| Verification 3: `npm run bench` with the bench case | T046 |
| Verification 4: the review gate | T049, T050 |

**Table 2: findings**

| Finding | Handled by |
|---|---|
| A001 (high) | T015, T016, T020, T022, T023; R1-Q3, into SPEC by T051 |
| A021 (high) | T007, T008, T010, T045; R1-Q8 |
| A196 (high) | T028, T029, T045, T052, T049, T050 (X4's SPEC changes); X4, #51 |
| A193 (high) | T032, T033 (the G4 case first), T034 (the G4 row), T042, T049, T050; X5 |
| A041 (high, r2-ai) | T017, T018, T047; R2-Q3 (R2a recalibrates) |
| A057 (high, r2-ai) | T017, T018, T047; R2-Q7 (R2a decides) |
| A024 (high, r2-sim) | T013, T014 (units in slot order; R2a's arrival follows the same order); T005, T006 (new keys in the sim's id order); T015, T016 (id equals key); T053 (exact ties, so a colony musters the same on both sides; found at S3) |
| A194 (high) | Not handled: the general's copies are R3's (#42); R1's copies variants (T045) cover only the bots |
| A195 (high) | Not handled: how R2 is cut and lands is X1 and X2 |
| A101 (high) | Not handled: R2's branches are X2's |
| A002 | T013, T014, T043; R1-Q1 |
| A003 | T011, T012; R1-Q2 |
| A004 | T037, T038, T039, T046; R1-Q5, into SPEC by T051 |
| A005 | T012, T014, T045; R1-Q4 |
| A006 | T013, T014; R1-Q1; T051 (SPEC's wording) |
| A007 | T020, T022, T042; R1-Q3 |
| A008 | T007, T008, T009, T045; R1-Q7 |
| A009 | T028, T029 (plan call 9) |
| A010 | T028, T029, T030, T031, T043; #7 |
| A011 | T030, T045; R1-Q6 |
| A022 | T016, T034; R1-Q3 |
| A023 | T030, T042, T043; R1-Q6 |
| A197 | T033 (the boss rows, G4 case first), T049; X5. What a boss win by Decision pays is R2-Q14 (R2b) |
| A198 | Not handled: the reveal is R2a's (R2-Q1, with X7's bot) |
| A199 | Not handled: lives are R2b's (#16) |
| A200 | T037, T038 (with the Vault, Shrine and Mold rows), T039, T046; R1-Q5, into SPEC by T051 |
| A207 | Not handled: a Rout's kit is R2b's (#17) |
| A208 | T034, T049; X5 |
| A102 | Partly: T021 adds the clash jobs R2a's slow suite pools; the suite's run time is R2a's (R2-Q9) |
| A103 | Not handled: §13.4's file table is fixed in R2a S0 |
| A104 | Not handled: §15.7's rows are R2's |
| A105 | Not handled: dead upgrade levels are R2b's (#27) |
| A106 | Not handled: the round-form scenario schema is R2a's |
| A107 | Not handled: G6's seats and HP are R2a's (#35) |
| A108 | Not handled: G16's pairs are R2a's (R2-Q10); it builds on T014's line tags and slot assignment, through R2a/T116's `playRoundClash` |
| A109 | T047, T049, T050 |
| A119 | Partly: T039 times a whole clash rather than 2,000 ticks; the `bench-300` rewrite is R2a's (R1-Q5) |
