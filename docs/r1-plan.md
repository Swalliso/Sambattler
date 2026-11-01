# Milestone R1 plan: the clash check

**Status: draft, not yet agreed with the user.** Session S0 of [the task list](tasks/r1-clash-check.md), a docs-only session, starts by agreeing it (T001) and writes the agreed calls into SPEC (T051) before any code.

Written 2026-11-01 against `develop` at `270081f` ([#39](https://github.com/Swalliso/Sambattler/pull/39), SPEC v2, merged). Scope and verification come from SPEC §16 "Milestone R1 — The clash check" and the sections it cites: §4.6, §5.2, §5.6, §6.7, §7.3, §7.4, §11.2, §11.4, §12.2, §12.3, §13.7, §15.3, §15.4, §15.7 and §18.2 #7–#15. The calls below come from the review of SPEC v2: its findings, cited by A-ID (`docs/tasks/spec-analysis.md`), and the calls the user makes (`docs/tasks/clarify.md`, R1-Q1 to R1-Q9). The tasks are in `docs/tasks/r1-clash-check.md`.

## Goal

Before the round loop is built, find out whether whole armies that meet at once, in formation, give every strong army an answer, and set squad sizes (§16 R1). R1 is a headless measurement. It changes no rule and no data, so no golden hash moves.

It gives the user's review gate numbers for:
- the squad sizes R2a starts from (§18.2 #7);
- which of the rework's kept pieces (§1.3 #11) R2a adopts, and whether that set needs the mixed-wave shields (#8) and the Elder Sporeling's splash (#9);
- how an emplacement counts (#10), overflow (#11), formation on the approach (#12), the muster inside the 45 s (#13), an Anti-Ranged kind (#14) and counter sets (#15);
- the most a full colony fields, against §13.7's budget;
- two calls that shape R2a: copies before R3 (X4) and the scoring curve (X5).

## Scope

**In R1:**
- `src/sim/formation.ts` (new): §4.6's slot layout and §5.6's muster knitting, as pure functions that draw no random stream. R2a's `formationOf` and `mergePreview` call them unchanged (§13.4, §14.6).
- Two tool-only switches in `src/sim`, off in every battle: siege units without a building preference, and §5.2's idle seek (R1-Q7, R1-Q8).
- Four default-off presets in `src/data/proto.ts`: `kept`, `noeldersplash`, `clashpace` (the pace variant) and `clashshield` (the arrival shield).
- `tools/lib/clash.ts` (new): squads, armies from bot specs and budgets, fields, slots by role, the lane rule, the clash runner and its records.
- The worker pool generalised to clash jobs; the clash rows and bars in `tools/lib/balance.ts` (G3, G12 strict per field, G13); `--checks clash` in `tools/experiment.ts`, with its options and report.
- `tools/lib/roundRace.ts` (new): a race model over the clash records, for X5.
- A battle-1 pairing table (the measurement R2-Q13 asks for) and the full-colony bench case.
- Before any code: the agreed calls and R1's SPEC wording fixes (A006, A016, A019 in `docs/tasks/spec-analysis.md`) written into SPEC §16 R1, §12.2, §13.7 and §15.4, so later sessions read a SPEC that matches the tasks.
- The runs, the write-up in `docs/balance-backlog.md` and `docs/status.md`, and the review gate.

**Not in R1** (§16 R1): the round loop, income, the general's planning, drafts, any UI, and any change to the game's rules or data. Formation by plot isn't R1's either: placing a build list on plots needs §7.3's placement rule, so it's R2a's, with G16 (A019).

**What R1 hands to R2a:**
- `formation.ts`'s API: `formationBox`, `slotPositions`, `emplacementPosition`, `overflows`, `findTrios` and `musterKnits`.
- From `tools/lib/clash.ts`, the army builder and slot assignment (`armyFromBot`, `lineOf`, `assignSlots`), which R2a's `playRoundClash` builds on for its squad duels (G1), G12 and G16; and the clash jobs in `tools/lib/pool.ts`, which R2a's `rounds` job kind joins. `placeArmy` and `playClash` stay tools on v1's sim.
- Each knob's outcome, as the user decides at the gate: adopted as data, kept as a default-off knob, or deleted (A109).
- The numbers: squad sizes, the chosen set of pieces, the full colony and the bench case, the race model's readings and the eliteShare readings (R2-Q3).
- The two tool-only switches. R2a writes idle seek and siege targeting as the rule in its round systems (R2a/T035, T037, T038), R2b/T043 deletes the flags with v1's `state.ts`, `compile.ts`, `targeting.ts` and `movement.ts`, and R2b/T158 deletes the tool code that sets them. Under X2, R2a builds beside v1 and leaves v1's state alone.

## Calls this plan makes where the spec is ambiguous

Each is easy to reverse; say so if you want one changed. A call with a clarify ref is yours to agree at T001. The others the plan settles itself, as `docs/tasks/clarify.md` says ("The R1 plan settles these itself").

1. **Where squads stand** (R1-Q1; A006, A012, A002, A019).
   - The line follows §7.3's tags. A spawner whose unit has the `ranged`, `support` or `burst` tag, and every tower, is back line. Every other spawner is front line. §16 names only melee, ranged and emplacements, which leaves the Tender and the Burster nowhere.
   - Each rank fills its files centre-out, in build-list order: 2, 3, 1, 4 on one lane, and 2, 1, 3 in each Twin Roots lane, as §7.3's `offCentre` and §4.6's sprawl order do. §16 says "from file 1".
   - A squad whose rank is full takes the first free slot of the nearest other rank: a front-line squad the back rank, then the third; a back-line squad the third rank, then the front.
   - On Twin Roots, in build-list order, each building goes to the lane with fewer buildings of its line. Ties go to the lane with fewer buildings in all, then the top lane. A full lane falls back to the other. §16's "alternating" splits a pair by type (A002). "Ties to the top lane" alone would put a two-building army in one lane and give the other away by E1, so the emptier lane comes first. §7.3's round-1 rule runs as a variant (`--lanes-rule general`).
   - Formation by plot is R2a's (above).
2. **Spending a budget** (R1-Q2; A003, A016).
   - Economy and utility cards are filtered out of the opener and the weights first.
   - A pick that doesn't fit the gold left is skipped and drawing goes on, until no pickable card fits or the plots are full. `maxOwned` holds; `afterSeconds` is ignored.
   - Each army draws from its own stream, keyed by the seed and the bot, so an army is the same in both seats and against every opponent.
   - The monos are the army buildings, the Tender's Ring and the Puffball Mortar included.
3. **Extra plots** (R1-Q4; A005). Every budget is measured at the map's base plots (8, or 6 a lane). A separate "late-run colony" reading adds all 4 plots at 1,200 and 1,500 gold, opened in #19's first-guess order.
4. **What counts as a win** (R1-Q3; A001, A022).
   - The side that won more lanes wins the clash. Then the side that dealt more uncapped Heartcap damage (storm ×1.0). Else it's a draw, worth half a win to each side.
   - §6.7's capped round result and the share of drawn rounds are reported beside it. Under the 500 cap most split Twin Roots clashes would draw, which would pull answers toward 50% on the map where the strict bar failed (A022).
   - G12 passes on the best confirmed answer's worst field, among answers that pass G3. Today's `evaluateCounters` passes on the mean and has no draws, so the clash bars are new functions beside it; `evaluateCounters` stays as it is.
5. **Jitter and identical clashes** (R1-Q3; A007).
   - Numbers are quoted with a jitter of ±0.2 tiles, and the jitter-free run is reported beside them.
   - The jitter moves each unit after the muster's knits, so the muster gives exactly what the game's preview would. A jittered leftover trio can still knit on the field, by v1's rule.
   - With jitter 0, a clash of two fixed armies is deterministic, so a mono-against-mono cell would replay one clash 100 times. Each distinct clash is played once and its result reused.
6. **The muster in today's sim.** `musterKnits` runs on the units as they stand after the arrival. The tool applies its passes at tick 0 with `mergeTriosNow`, then sets the clock to tick 20. Within a pass, each trio's keys are sorted and the trios go in order of their lowest key, the order `resolveKnits` completes knits in, so each merged unit's id equals its key and the pure muster's tie-breaks match the sim's (A024, A032). Lanes where one side or neither fields anything lock at tick 0 (E1, E2), before the first step. Nothing is lost: in the muster nobody moves or attacks, and R1 has no powers, so #25's first guess (the knits land on the first tick) gives the same clash.
7. **Both cap readings from one clash** (#13). A lane still fighting at tick 900 locks there for the first guess (the muster counted). The clash runs on to tick 920 for the other reading (the cap starting after the muster). Lanes that ended before tick 900 read the same both ways.
8. **v2's targeting and movement in the check** (R1-Q7, R1-Q8; A008, A021).
   - Two `config.test` flags, `noBuildingPreference` and `idleSeek`, absent unless set, so no battle and no hash changes. The clash check turns both on.
   - Without the first, siege units prefer the Mortar's building, so #10's reading would measure v1.
   - With `idleSeek`, a unit with no target walks toward the nearest enemy in its lane that it could target, enemy towers included, since they stand in for emplacements. With none, it advances as before. Without it, unopposed squads walk past the enemy and park at the far edge, which inflates G13's stalls and decides lanes at 45 s by supply rather than by combat.
   - `--v1-targeting` and `--v1-movement` turn them off, for one diagnostic screen each.
9. **The pace variant** (A009). `clashpace` sets v1's `waves` (`matchPace` on, `rangedGap` 1), and the tool stamps every arriving unit with wave 0, which `addUnit` doesn't set. Wave 0 never trips the beat timing, and merged units copy it. This reads the retired waves code for a measurement only. If #12 is adopted, R2a writes the rule with its own key (A109).
10. **The arrival shield** (§16 R1). `clashshield` sets `mixedWave` alone. The clash check reads `content.balance.mixedWave` itself and shields each lane army of 2 or more unit types at the arrival, before the muster; merging carries shields in proportion, as it does today. §16 says R1 lifts compile.ts's waves requirement "for the clash check". Reading the setting in the tool does that without touching `src/sim/compile.ts`, so no battle, UI text or hash changes. To reverse it: drop `b.waves &&` at `src/sim/compile.ts:85` and guard the two UI readers of `rules.mixed`.
11. **Squad variants** (#7; A010). `--squad-seconds S` follows §16 (whole batches, halves up). Whole-batch rounding moves some squads by 25–50% at 45 and 75 s and leaves others alone, so `--squad-scale S` (round(squad × S / 60)) runs beside it. `--squad <id>=<n>` sets one building's squad, for the Burrow at 6 and 7. Every run prints each building's squad and its value per gold (§11.4).
12. **The sixth archetype and the appended spawners** (R1-Q6; A011, A023).
    - As written, the Mortar candidate equals the baseline and the Burster Pod candidate equals `--proto burster`. So the candidate variant is a core-six check instead: builds and answers limited to the five core spawners plus the candidate, against a `core6` reference that weighs the six evenly, read against §11.4's intended graph. It runs once with the Burster Pod and once with the Mortar.
    - The variants that append buildings (`burster`, `rhizomorph`, `kept`) run G3 twice: with `bot:balanced` as the data has it (it buys appended spawners at weight 1), and on its data weights (`bot.balanced.fixedWeights:true`). Appended monos and pairs are listed apart.
13. **The full colony and the bench case** (R1-Q5; A004, A018, A200).
    - §13.7's budget is read in live units at the arrival: at most 150 a side, so two colonies fit `bench-300`. SPEC's own first guesses already give 144 supply a side (12 plots of the Burrow's upgraded 12), against "about 100".
    - The full colony is the true worst case: 12 plots on one lane and 16 on Twin Roots, the biggest squads (the Burrow's level-3 squad of 12), merging off.
    - The bench case plays one whole clash, to its end. It prints its verdict as a report only: R2 adds the arrival to G11 (§13.7), so it doesn't change `npm run bench`'s exit code, and `--quick` skips it, so `npm run verify` is unchanged.
    - R1 names the lever that keeps a colony inside: squads, the upgrade's +1 per batch, or plots.
    - Sensitivity rows show SPEC's other unit-adding first guesses: the Rhizome Vault's +1 beside, the Velvet Shrine's +2 in front, and Old Mother Mold's +10% on `swarm` squads (§7.7, §11.2).
14. **eliteShare** (R2-Q3; A014, A041). Merged units count at their parts' base supply: a Bloomed unit counts its 3 parts, an Elder its 9. R1 records it after the muster with and without the swarm read, plus the Elder-only share and the four kinds' scores, so R2a can recalibrate the Elite read.
15. **G13's bar** reads every clash record the check produced, as §16 R1 verification 2 and §12.3 G13 say: G3's cells, the counter matrix's, the mirror's and the G4 row's. The share over G3's clashes alone is reported beside it.
16. **Copies** (X4; A196). `--copies N` caps every card at N buildings. A mono holds N of its card, and its other plots and gold go by `bot:balanced`'s weights. That's #51's recommendation, used provisionally. R1 measures 2, 3 and 4 beside unlimited, so squad sizes aren't bent to tame a build R3's copies remove.
17. **The race model** (X5; A193, A197, A208, A022).
    - `tools/lib/roundRace.ts` chains clashes into battles of up to 9 rounds. Round r of battle i uses the clash at the measured budget nearest below 300 + 75 × (i − 1) + 150 × (r − 1), at most 1,500.
    - Its first case is G4's pairing (§12.3): `bot:balanced` against `general:scripted` on the one-lane field at every budget, 50 seeds per seat, with `bot:balanced` against itself on fresh seeds beside it. `--checks clash` plays this G4 row by default. These are the even battles A193's claim (most reach round 9) and G4's band (≤ 15% reach round 9, median 6–8) are about, so X5's section quotes them first.
    - G3's pairs (each mono against `bot:balanced`) follow, as the lopsided case: they rout early and understate the round-9 share.
    - It applies §6.4's storm, the round cap, Heartcaps of 3000 against 2000 + 250 × (i − 1) (a Fortified elite +30%, the boss 3600) and §6.5's Decision.
    - It reports rounds to fall, the share of battles reaching round 9, Routs by side and round, and how often the lead changes, for battle indices 1–5, an elite and the boss.
    - It does so under the first guess and the alternatives: a cap of 25% of the loser's max HP, the storm applied to the cap, equal Heartcaps, and a Decision by share of max HP lost.
    - Beside it, the clash report gives the share of clashes whose damage passes 500 at each budget (A208), and the drawn-round share (A022).
    - It's crude: no income, comeback gold or counters, and one seed's armies at each budget stand in for a colony that grows within a battle. It's for the X5 call, not a guardrail.
18. **A three-lane screen** (R1-Q9). `--fields three` reads `data/maps/test-3lane.json` as 3 lanes of 2 files and 2 ranks: 4 plots a lane, and the leftover row holds none. The map file isn't edited. A 20-seed screen, outside the bars.
19. **v2's constants in a tool.** The 6-tile gap, the 1 s muster, the 45 s cap, 25 per supply, siege ×2 for damage, the 500 cap and G13's 15% are named constants in `tools/lib/clash.ts`. Putting them in `data/balance.json` would move every golden. R2a moves them into the data (§11.1).
20. **How units arrive** (A024). Units are created in slot order (lane, rank, file), then by j within a squad, never in build-list order, so the muster's result depends only on the colony, as R2a's arrival will. They arrive with `sourceBuildingId` 0, and the tool keeps the map from each unit to its squad: real ids would collide with the Mortars' ids, and negative ids belong to the Heartcaps and turrets.
21. **Puppet Bloom's trios** (A057, R2-Q7). Each record counts the most trios Cordis's power (a 3-tile circle) could knit right after the muster, so R2a can tell whether the power has anything left to do.
22. **Battle-1 pairings** (A201, R2-Q13). Each commander's starter against each battle-1 general's army at 300, 600 and 900 gold: R2b's evidence for G14 and for a guaranteed answer in battle 1.
    - The generals are the adaptive, non-boss ones with 1 in `appearsIn`, the ones runs use: Old Mother Mold and the Lichen Baron. Each fields its battle-1 kit, §7.8's rule at index 1 (its opener's cards, economy filtered).
    - Both fields, 20 seeds, the general in the enemy seat only, passives off (both sides are `human` in a clash; R2-Q17 decides their v2 form).
23. **No changelog entry.** R1 changes no data. The new knobs are listed in `docs/balance-backlog.md`, as `src/data/proto.ts`'s header asks.

## Stand-ins

What R1 uses in place of v2's real pieces, and why each is good enough for a measurement:

- **The fields.** `data/maps/test-flat.json` is the one-lane field (Bogwater Hollow and Stumpfield give the same clash, since units ignore stumps), and `data/maps/twin-roots.json` the two-lane one. No map has plots yet (R2a draws them), so `formationBox` works from a map's width and lanes alone.
- **Today's combat.** v1's systems, with turrets, territory and Heartcap targets off, as the supply duels run, plus the two switches (call 8).
- **The emplacement.** The Puffball Mortar is a v1 tower building on its slot. Units target it by its 2×2 rectangle, and it shoots from its centre. It never moves, keeps its lane alive and counts 0 supply. R2a makes it a unit, with the rules #10 settles (A029).
- **The muster.** A clock jump after the knits (call 6).
- **Bot build lists** stand in for the general's planning (§7.2) and the player's.
- **The Burrow's level-3 squad of 12** comes from `--squad`, not from the upgrade system.
- **v2's constants** live in the tool (call 19).
- **The race model** stands in for the round loop's battles (call 17).
- **The pace variant** runs on v1's waves code (call 9).

## Steps

The tasks are in `docs/tasks/r1-clash-check.md`, one session per row of its Sessions table.

1. **Agree this plan** (S0, T001): the calls marked with a clarify ref, and what R1 records for R2-Q3, X4 and X5. Then write the agreed calls and R1's wording fixes into SPEC (T051), and update `docs/status.md` (T002). S0 is docs only, one PR into `develop`.
2. **`formation.ts`** (S1, once S0 has merged): the slot layout, then the muster's knitting, test first. Includes a test that the pure muster finds the same first trios as `src/sim/systems/merging.ts`.
3. **The two switches** (S2, beside S1): `noBuildingPreference` in targeting and `idleSeek` in movement.
4. **Armies from build lists** (S2): squads, the army cards, and an army from a bot and a budget.
5. **One clash, recorded** (S3): fields, slots by role, the lane rule, the arrival, the muster, lane ends, both cap readings, §6.7's scoring, the clash winner, the records, and a `--pair` mode that plays one matchup.
6. **The bars** (S4): clash jobs in the pool, G3 and G13 on clashes, the strict counter matrix, the clash matrix for #14 and #15, the cache and the jitter, and `--checks clash` with its report.
7. **The variants** (S5): the four presets; the shield, the pace stamp, merging off, squad options and copies in the clash tool; the core-six check, the merge mirror and the fixed reference.
8. **The race model, battle 1 and the full colony** (S6, beside S5): `roundRace.ts` with the cap-binding and drawn shares, the pairing table, the full-colony and overflow tables, and the bench case.
9. **The runs and the write-up** (S7). The runs take hours (A013). §12.2's 10–30 ms per clash came from the 60-supply cap, and merging-off armies at 900–1,500 gold run 40–90 ms. Estimate: the four 50-seed runs (T042) take 30–60 minutes each on 8 workers, and each 20-seed screen 10–15 minutes. T043–T045 come to about 35 runs, so about 40 with T042's four: 8–12 hours of background compute, more with T052's 50-seed confirmations. Any variant whose screen flips a bar, or backs a recommendation that departs from SPEC's first guess, is re-run at 50 seeds before it's quoted (§16 R1 verification 2); every other variant number is labelled a 20-seed screen. The write-up goes in `docs/balance-backlog.md` and `docs/status.md`, and this plan gets its As built.
10. **The review gate, then the calls** (S8): the user settles #7–#15, X4 and X5, gives the #36 reading and each knob's outcome; the session records them in `docs/tasks/clarify.md`, SPEC and `docs/status.md`. R2a S0 starts after that, not before (`docs/status.md`).

Beside R1, if the user agrees X3 and X10, R4a and records-1 can run in sessions of their own. They share no code file with R1. All three edit `SPEC.md`, in different sections: R1 §12.2, §13.4, §13.7, §15.3, §15.4 and §16 R1, then at its gate §18.2 #7–#15 and the sections they settle (R1/T050); R4a §1.3 #10, §2, §5.8, §10.1, §10.2, §10.4, §11.3, §14.3, §16 R4, §16 M7 and §18.2 #52, #53 and #55; records-1 §9.7, §13.8 and §16 M6. Each also edits its own blocks in `docs/tasks/clarify.md`, and `docs/status.md`. Run the three S0 sessions one after another (R1 S0 first), or rebase the later one. In `docs/status.md` each track edits only its own bullet under "Next session". R4a and records-1 also share `docs/playtest-feedback.md` (R4a/T038, RB/T023).

## Verification

SPEC §16 R1's four steps:

1. `npm run verify` is green, and `npm run golden -- verify` moves no hash. The unit suite covers the slot layout (§4.6's k × k grid, filled front to back, then top to bottom) and the muster's knitting to a fixed point, with one Burrow, two side by side and three in a row (§5.6, §15.7).
2. The clash check on today's combat, then on the kept pieces together, quoted at 50 seeds per seat and jitter ±0.2, with the jitter-free run beside them:

   ```bash
   npm run experiment -- --checks clash --budgets 300,600,900,1200,1500 --jitter 0.2 --matrix all --mirror --workers 8 --label r1-baseline
   npm run experiment -- --proto kept --checks clash --budgets 300,600,900,1200,1500 --jitter 0.2 --mirror --workers 8 --label r1-kept
   ```

   The variants run as 20-seed screens, each with its own `--proto` spec or option; `--proto rework` is refused. A screen that flips a bar, or backs a recommendation that departs from SPEC's first guess, is re-run at 50 seeds before it's quoted (T052). The bars, pooled over the budgets:
   - **G12, the strict counter bar:** every mono build with a clash G3 mean above 40% has an answer that wins at least 60% on every field, among answers that pass G3;
   - **G3 on clashes:** each mono army against `bot:balanced`'s at the same budget has a mean over the maps of at most 55%, with the one-lane field counted twice, and a worst map of at most 60%;
   - **G13:** at most 15% of clashes reach the 45 s cap, over every clash the check played, with G3's clashes beside it and the median clash length against 20–40 s, read both ways (#13).

   A build that dominates only early or only late is flagged in the per-budget columns.
3. `npm run bench` prints the full-colony case beside `bench-300`: units and supply a side, the arrival's time against 5 ms, and the tick mean and p99 against 1.0 and 2.5 ms. If it's over, the report names the lever.
4. **Review gate (the user):** reads the report, agrees the squad sizes and the set of pieces R2a starts from, and settles the other §18.2 rows R1 measured (#8–#15), with X4's and X5's calls.

Also, outside §16's steps: `npm run test:slow` gives the same v1 verdicts as `develop` before R1, since no rule changed (a v1 miss isn't open work, CLAUDE.md), and `npm run experiment -- --proto kept --checks duels,g8` reads G1, G2 and G8 on the kept set before R2a adopts it (A116).

## Open questions for the user

**At T001 (S0), to agree before building** (each with a recommendation in `docs/tasks/clarify.md`):
- R1-Q1: where squads stand (call 1).
- R1-Q2: spending a budget (call 2).
- R1-Q3: what counts as a clash win, and quoting with jitter (calls 4 and 5).
- R1-Q4: the extra plots at the top budgets (call 3).
- R1-Q5: the full colony and the bench case (call 13).
- R1-Q6: the sixth-archetype check and the appended spawners (call 12).
- R1-Q7 and R1-Q8: v2's targeting and movement in the check (call 8).
- R1-Q9: a three-lane screen (call 18).
- R2-Q3, R1's part: recording eliteShare by parts' base supply (call 14).
- X4 and X5, R1's part: the copies variants and the race model (calls 16 and 17). The calls themselves come at the gate, so their Decision lines stay open; T001 adds an "R1 measures" line under each, and under R2-Q3.

**At the gate** (T049):
- #7–#15, each with its measure and a recommendation;
- X4: copies before R3, if mono Sporeling fails G3 or G12 without them; if yes, #51 (what mono means under copies) with it, and D45, §8.10, §12.3 and §16 R2's and R3's scope change (T050);
- X5: the scoring curve, from the race model;
- the #36 reading: the sixth archetype's core-six check;
- each knob's outcome: adopt as data, keep default-off, or delete (A109).

## As built

_Empty until R1 lands._
