# Milestone R2b plan: the run in rounds

**Status: agreed with the user on 2026-11-03** (S0 of [the task list](tasks/r2b-run-in-rounds.md), T001–T005). The user took every recommendation for R2b's open calls, kept R1's call on #27's unit levels, dropped the cutover branch (Call 14), and agreed this plan. The answers are dated in `docs/tasks/clarify.md` ("R2b S0"), and S0 wrote them into SPEC before any code.

Written 2026-11-03 against `develop` at `4644feb`, once R2a's gate had passed and S21 ([#108](https://github.com/Swalliso/Sambattler/pull/108)) and S21b ([#109](https://github.com/Swalliso/Sambattler/pull/109)) had merged. R2b is the second part of SPEC §16 "Milestone R2 — Rounds", split by X1. Its tasks are in `docs/tasks/r2b-run-in-rounds.md`, T001–T158, in sessions S0–S14. R2a's plan is [r2a-plan.md](r2a-plan.md).

## Goal

A whole run in rounds, played on the dev site from round 1's planning to the run summary. The battle R2a built sits inside a run with 3 lives: a lost battle costs a life and the run goes on, the Grove can regain one, won battles add plots, drafts open in planning, and a reload resumes between rounds. v1's battle is deleted from the game, its tests and its tools.

R2b's gate asks what R2a's couldn't: did a close battle leave a mark, did a lost battle feel like a setback rather than the end, and how long does a run take (§16 R2 step 10, questions 4 and 5).

## Scope

**In R2b** (§16 R2's second half, X1), by the task list's stories:
- **US1, the run plays rounds, with lives** (§8.5, §8.6, §8.7, §4.6): RunState v2 with lives and `plotsGained`, the run's battles on R2a's round sim, the Grove's life, sprawl, the events' v2 effects, and the migration of runs saved before R2 (§8.9, #32).
- **US2, one battle screen** (§13.4, §15.6): every battle entry opens R2a's scene, moved to §13.4's paths; v1's battle UI and R2a's preview entry go.
- **US3, v1 gone from the sim, tools and tests** (Appendix A, §15.7): R2a's `rounds/` folders move into place, R1's clash check moves onto the round sim, and the retired presets go.
- **US4, drafts in planning** (§8.3): rounds 3, 5 and 7, with v1's cards until R3.
- **US5, content in rounds** (§7.7, §11.7, §11.8, §11.10): relics, passives, powers, generals, elites and the boss's extra cards in v2 form, or held out of the pool by `requires` until their system exists.
- **US6, saves between rounds** (§8.9): at each planning phase and at Begin; the battle's end recorded before its report.
- **US7, run screens for lives** (§10.5): the run bar, the Grove, route nodes with the general's kit, the summary's round sparklines, link previews and play time.
- **US8, teaching** (§10.2): the draft as a bottom sheet, Help and the round tips (a first wording that R4b rewords).
- **US9, run tools and guardrails** (§12.3, §15.2): whole runs headless, G14 and G15, and the slow suite in its budget.

**Not in R2b:** copies, augments, combos and packs (R3); the card text and the rewritten Help (R4b); records-2 (after R2b).

## What R2b starts from

### R2a's names, as built (T001)

Checked on `develop` at `4644feb` against R2a's Technical context table and [r2a-plan.md's As built](r2a-plan.md#as-built).
- **Every file in the table landed at its proposed path,** and no session renamed one.
- **Four files the table doesn't list,** each now in R2b's move tasks:
  - `src/ui/rounds/rounds.css`: S13's styles, imported by the top band, the tray and the tally (T150);
  - `src/render/rounds/unitLook.ts`: S21b's T160, which draws the Mortar's emplacement. It came after the As built (T150);
  - `tests/slow/rounds/verdict.ts`: S18's shared verdicts and pools (T151);
  - `data/scenarios/rounds/bench-300.json`: S17's bench case, already in T048.
- **Not built:** `ROUNDS_PREVIEW`, which R2a's S0 dropped under X2. T032 no longer deletes it.
- **The entry:** `scene=rounds`, a dynamic `import()` of `src/app/rounds/main.ts` (`startRounds`) at `src/app/main.ts:124`, and the title's "A battle in rounds (preview)" button on the dev site only (`src/ui/screens/title.ts`, under `DEV_SITE`). T032 deletes both.
- **The round tools:** `--rounds` on `tools/sim.ts`, `tools/balance.ts`, `tools/bench.ts` and `tools/experiment.ts`, and verify's round steps in `tools/verify.ts`, step 4's `clash-cap` check among them (T050, T051).
- **The goldens:** the five `r2-…` replays in `tests/golden/`, listed in `tools/golden.ts`'s `ROUND_REPLAYS` as `kind: "rounds"`. The two power replays set `starter: true` (T047).
- **The tests:** 23 files in `tests/unit/rounds/`, 7 in `tests/browser/rounds/` (commanders, hud, inspect, perf, planning, reveal, rounds) and 5 in `tests/slow/rounds/` with `verdict.ts`: `duels` (G1, G2), `battles` (G4–G8, G13), `counters` (G3, G12), `formation` (G16) and `perf` (G11). R2a/T136's per-file inventory, which T041 and T151 follow, is in [r2a-plan.md](r2a-plan.md#the-test-inventory-for-r2b-t136).
- **The scenarios:** 21 files in `data/scenarios/rounds/`, `bench-300` among them (T048).
- **Play time:** `PlayClock` in `src/app/rounds/playTime.ts`, tested by `tests/unit/rounds/playTime.test.ts` (T150, T151, T109).
- **Data beside v1's fields:** `balance.rounds`, the `rounds` block of `data/balance-targets.json`, `squad`, `economy.goldPerRound`, `afterRound`, each map's `colony` block, and the bots `bot:answer`, `bot:slayer-rounds` and `bot:slayer-rounds-nomerge` (T129).
- **State beyond §14.4's listing,** which T135 writes into §14.4 or folds away: R2a's As built lists it ("Departures from SPEC").

### R2a's results

- **The pace:** 100 Heartcap damage a supply (T125). A battle takes a median of 7 rounds, 16–18.5% reach round 9, the bot wins about 60%, and the damage cap binds in 70% of damaging rounds.
- **A full colony:** the player's colony is full from round 5 in 37 of 40 battles, and then banks a median of 320 gold a round (X8's readouts, S15).
- **Puppet Bloom** finds a median of 0 trios after the muster (S16), so R2-Q7 gives it a v2 job here.
- **A fixed round cap** (S21b): a fixed 750 for both sides passes every band measured; a fixed 500 fails G4.
- **The round guardrails that miss** (T133, S20, S21b): G1, G2, G3, G7, G8's mono clause and G16. G16 reads 40% after the Burster moved to the front line: Gill Archer pairs 55%, Mortar pairs 26%.

### The playtest's calls (2026-11-03)

The full reveal stays the default, Hold stays out, the pace is 100 a supply, and Bursters stand in the front line. The gate's other notes are #67–#71 below, and S21b's three notes for the user.

## The decisions

**Settled on 2026-11-03** (T003). The user took every recommendation below. They chose the three real calls as recommended: "Gold upgrades in R2b" (#67), "Fixed 750 for both" (#68) and "Known misses, owned later" (T133). They took the rest as a batch ("Take them all"). Each ref has a dated Decision line in [clarify.md](tasks/clarify.md), with the evidence and alternatives, and SPEC states the rules. #27's recommendation predated R1's review gate, so the user was asked again at T005 and kept R1's call (below).

**The playtest's questions:**

| Ref | Recommendation | Blocks |
|---|---|---|
| #67 | Gold buys upgrades once the colony is full, the user's idea, each a real jump: the first form to measure is a planted building whose squad fields one merge tier up for the rest of the battle. Built in R2b after the drafts, so the measurement first shows what the drafts leave of the banked gold. The general and the bots buy them too | S5b (T159–T163) |
| #68 | One fixed cap for both sides: 750 a round. It passes every band S21b measured, and it makes D28's bigger Heartcaps cost rounds again | S1 (T164) |
| #69 | Several openers per general, one drawn per battle | S7 (T165) |
| #70 | No change now. R2b's commander work and its playtest watch it, and the power's timing is the first lever | — |
| #71 | Keep E1 and E6: a lane you leave empty is a fair trade | — |

**S21b's notes, and what's still open from R2a:**

| Ref | Recommendation | Blocks |
|---|---|---|
| Placing by the squad's spot | A card is placed on its plot only, not by its squad's spot in the field: "stick to just having the user place the buildings" | S2 (T167) |
| Melee fan-out | Not in R2b. It changes how every melee squad moves, so it stays a candidate in `docs/balance-backlog.md`, for R2b's playtest to raise again | — |
| The Fuse augment's text | R3 rewords it ("wait behind your front rank"), now that Bursters stand in front | R3 |
| T133's misses | Known misses through R2b: the slow suite asserts them as expected fails, printing their numbers, and step 7 passes on the rest. S14 tunes G1, G2 and G7 after the playtest, each retune with the user's OK: the Sporeling Burrow wins 9 of 10 duels, the Gill Archer beats no unit, and merging wins 88%. G3 and G8's mono clause wait for R3's copies, which cap monos (§8.10). G16's Gill Archer and Mortar pairs wait for R3's combos, as the hub recommended | S11 (T168), S14 (T169) |
| R2-Q7 | Puppet Bloom lifts same-type units within 3 tiles one tier, and Cordis's knit-time bonus becomes merged units starting at +10% HP | S7 (T166, T085) |
| #29 | No bank reserve for the general: it spends what it can | — |

**R2b's blocks, as clarify.md recommends:**

| Ref | Recommendation | Blocks |
|---|---|---|
| #16 | A boss loss ends the run. "Lives left count at the boss" is a default-off knob, `bosslives`, for the playtest | S1 |
| #17 | No clean-win bonus (the playtest asks again). A won battle pays each draft it skipped by ending early as an extra spoils pick, and a Decision's "2 cards" is a pick of 1 from 2 | S1, S5; S14 |
| #18 | +1 plot per battle won, up to 4, inside R1-Q5's budget of 150 live units a side. The run stores `plotsGained` only | S1 |
| #20 | Planted buildings don't carry between battles | S1 |
| #21 | The general opens the map's plots plus your sprawl gains | S1 |
| #24 | A heal on a round's result lands after the damage and the cap | S6 |
| #26 | The Rhizome Vault's effect waits for R3's combos, held out of the pool by `requires` | S6 |
| #27 | Dead upgrade levels get `offered: false`, so later levels stay reachable. A unit level adds no unit in rounds, as R1's review gate decided (§18.2 #7: one more unit per batch put Twin Roots' full colony at 192 units a side, over §13.7's 150), so it's a dead level too. The recommendation's fixed adds (Burrow +4, Warren +3) predated that gate: asked again at T005, the user chose "Keep R1's call" | S5 (T064, T066) |
| #28 | `plant`, `sell` and `toggleMerge` are refused while your draft is open | S5 |
| #32 | A run saved before R2 migrates: lives = 3 − v1 battles lost (at least 1), plots by battles won, and a mid-battle save restarts at round 1's planning with a notice | S1 |
| #33 | The battle-1 economy tip stays; the playtest decides | S14 |
| #35 | G14's and G15's bands are set at S12 (T131) from S11's measurement, starting from §12.3's (G14 70–90%; G15 at least 40% reach the boss, the bot wins 40–70% there, and reach at most 85%), with G8 re-read beside G14 | S11, S12 |
| #56 | Lives are called Regrowths, with "lives" in the tooltip | S1, S9 |
| R2-Q14 | A boss win by Decision pays the full boss reward | S1 |
| R2-Q15 | Home Brood becomes +10% HP and damage for Vesper's front-rank squads | S7 |
| R2-Q16 | The Tithe counts killed supply in the clash; the auto policy fires at 40 s, or once a lane's surviving supply on either side is at most 25% of its arrival. With a median clash of 19 s, the 25% clause is the one that fires | S7 |
| R2-Q17 | Mold: +10% HP for swarm units. The Sovereign: the union of its doctrine's sets and the active counter's, read at each Begin | S6, S7 |
| R2-Q18 | The opening doctrine swaps the opener's last army card for the cheapest kit card in its counter set | S7 |
| R2-Q19 | The relic details as a set: the Sigil per power, Rot-Eater and the Sigil from the storm's first round, `requires` for Mycorrhizal Link (and Forward Spores if clouds go), Martyr's Bloom by source building | S6 |
| R2-Q20 | Clash gold takes one path: credited at once, shown as one "from the clash" income row | S6 |
| R2-Q21 | The Grove gets an always-lit Leave choice | S1 |
| R2-Q22 | A reload on the report goes to the next screen with a notice; firing the power saves the battle | S8 |
| R2-Q23 | The run's kit stays a list of building ids until R3 | S1 |
| R2-Q24 | The in-battle draft is a bottom sheet, with the general's army in view | S10 |
| §8.7's events | Fallen Oak: −15% max HP for the run. Quiet Clearing's Rest: +15% max HP next battle. Mold Bloom: the storm one round earlier, at round 4, and +150 gold. Spore Merchant, Quiet Clearing's forage and Twin Spores keep v1's upgrade effects until R3 | S1 |

R2-Q13, a guaranteed answer in battle 1, was settled at T029 on S1b's pairing table (2026-11-03, "Soften Mold's opener"). Old Mother Mold's battle-1 opener becomes a Sporeling Burrow and a Truffle Cellar, which S5 lands in T068's place, and no opening pick is built. X6 was decided at R2a's S0: R2b's playtest reads the run's minutes.

**Settled by this plan, with no call from the user:** A063, A073, A074, A079, A088, A089, A093 and A117, as the task list's tasks say.

## Calls this plan makes

The task list's "Calls this list makes" (Technical context, Calls 1–15) are this plan's, each reversible. Call 14 was the user's: at T005 they chose "Drop it, land on develop", which X2 allows. S1–S4 are ordinary PRs into `develop`, each green and playable, there's no `feature/r2b-cutover`, and S4b is dropped. S4 takes its check (T152). `main` keeps v1's game until the user asks for a release.

## Stand-ins

Each is temporary, and the task named lifts it:
- From S1 until S5 (T067), run battles open no in-battle drafts.
- From S1 until S6 and S7, content tied to retired systems does nothing in a round battle, as R2a's compile lists it (R2a Call 19). Rhizome Tithe is refused with `notInRoundsYet` until T082.
- From S1 until S8 (T095, T096), a reload mid-battle restarts that battle at round 1's planning, with the restart notice.
- From S5 (T153) until S10 (T116), the draft is today's centred dialog, which covers the general's formation (A062).
- From S3 until S12 (T129), retired selectors and triggers still in the data compile to no-ops, their schema keys remain, and R2a's `rounds` data blocks sit beside v1's keys.
- From S1 on, the run in rounds is on `develop`, so each stand-in still open is on the dev site. S1 lists them in `docs/status.md`, T152 checks the list once S4 has merged, and the session that lifts one updates it.

## Steps

The task list's Sessions table:

| Phase | Sessions | What lands |
|---|---|---|
| Setup | S0 | This plan and R2b's decisions |
| The switch-over, on `develop` | S1, S1b, S2, S3, S4 | The run plays rounds with lives, `RUN_VERSION` 2, the migration and the fixed cap; battle 1's pairing table (R2-Q13); one battle screen, with cards placed on plots only; v1 gone from the sim, tools and tests; the retired presets gone, and T152's check |
| Content | S5, S5b, S6, S7 | Drafts in rounds 3, 5 and 7; gold upgrades once the colony is full (#67); relics; commanders, generals, elites and the boss |
| Saves, screens, teaching | S8, S9, S10 | Saves between rounds; run screens for lives; the draft sheet, Help and tips |
| Tools | S11 | G14 and G15, the run pool, the slow suite's budget |
| Polish | S12, S13 | v1's keys retired and the `rounds` blocks folded; every golden regenerated; §16 R2's verification |
| The playtest | S14 | Questions 4 and 5, the tuning, X6's target |

Where sessions may run side by side is in the task list's "Dependencies and parallel work".

## Verification

- **S13 runs §16 R2's steps 1–9 in their final forms** (T136–T147): verify with §15.7's round rows, lives among them; the goldens, one run at least; 40 headless battles; the rule scenarios; 20 whole runs (step 5); the saves from before R2 (step 6); `npm run test:slow` with G14 and G15; the bench; and the captures, the route's among them.
- **Nothing from Appendix A's R2 rows remains** in the game, its tests or its tools (T130, T145).
- **The gate** (S14, T148) has the user play at least one full run on the dev site and asks questions 4 and 5. Planning seconds and the run's minutes are read off the report and the summary (X6).

## Open questions for the user

**At S0: answered 2026-11-03.** The user took every recommendation (above), kept R1's call on #27's unit levels, dropped the cutover branch (Call 14), and agreed this plan.

**Later:**
- **S1b (T029):** R2-Q13, on battle 1's pairing table. Answered 2026-11-03: soften Mold's opener.
- **S5b (T163):** the upgrades' price, from its measurement (#67).
- **S12 (T131):** G14's and G15's bands, from S11's measurement (#35).
- **S14 (T148, T149, T169):** the playtest gate, the tuning (G1, G2 and G7 among it), #17's clean-win half, #33, and X6's target.

## What S3 left (T054)

S3 deleted v1's battle from the sim, the tools and the tests, and moved R2a's `rounds/` folders into place: `find src tools tests data -type d -name rounds` finds nothing. T054's grep of `src`, `tools` and `tests` for `spawned`, `columnFlipped`, `buildingDestroyed`, `'wave'`, `stance`, `turret`, `frontier`, `besieged`, `deploy` and `liveState` finds only these, besides comments that say a system is gone:

- **For T129 (S12), in the schema and the data:** `src/data/schema.ts`'s keys for retired systems: the `buildingDestroyed`, `waveStart` and `heartcapBreach` triggers, `besiegedBy`, `laneStance`, `rules.deployDraft`, `waves`, `mixedWave`, `stormWaves`, the `turret` block, `building.spawn`, and v1's target blocks beside `rounds` (G2 and G3–G8's `seeds` are still read by the round tools). In the registry, the Heartcap `turret` sprite and the retired `wave` sound (T129 drops the retired sounds).
- **For S4 (T058, T059), in `src/data/proto.ts`:** the presets of retired systems (`hold`, `nohold`, `hotstart`, `waves`, `bigdrafts`, `breach` and the rest of T058's list), whose keys no battle reads. S4 deleted them with the schema keys only they set; `laneStance` and the timed storm's `heartcapTakenPerStack` are data, so they join T129's list.
- **Kept on purpose:** the `'turret'` damage source in `src/ui/report.ts` and `src/ui/screens/run.ts`, which labels a run migrated from v1 (its BattleRecords); `tests/fixtures/saves/v1/`, the migration's fixtures; `scene=deploy`'s "not part of the game" message (T032); and `frontier`, a tip id in `tests/unit/settings.test.ts`'s tips-store case.

What else S3 found, for later sessions:

- **A2 and B3 have no round form.** No battle in rounds reads `ai.counter.counterFloorWeight` (A2) or `firingCongestion` (B3), so their behaviour cases went with v1's battle, and `tests/unit/prototypes.test.ts` checks only that the presets set their keys. T055's agreed list keeps both, so S4 kept them; the hub recommends dropping them, and the user hasn't decided.
- **The run's general draws its upgrade levels from `ai.enemy`** (battle index 1000 + n), since T044 removed v1's single `ai` stream. That moved `r2-run-s7`'s hash from battle 2 on, and nothing else. The clash check's armies and G2's supply duels draw from `ai.player` and `combat` for the same reason, so their measured numbers shift with the reseed.
- **The clash check on the round sim** (T158): its records read the round's result, so R1's second cap reading (after the muster), the lane cases E1–E6, the damage supply, the arrival count, parked units and lanes held by emplacements left the record, and so did the `--v1-movement`, `--v1-targeting` and squad-timer variants. `playRoundClash` sits in `tools/lib/clash.ts`, beside the armies it plays, so the clash and balance modules don't import each other. The race section still reads R1's 500 cap, while the round's cap is 750 (#68); S11's run tools can read it from the data.
- **The full colony and the overflow table** read the data's squads: 12 Burrows of 8 field 96 units on one lane and 128 on Twin Roots, inside 150, since no upgrade adds units until #27's fixed adds (S5).

## Handoffs

- **To R3:** the Fuse augment's text ("wait behind your front rank"), now that Bursters stand in front; G3 and G8's mono clause, for its copies; G16's Gill Archer and Mortar pairs, for its combos; and #67's upgrades beside its augments.

## As built

Written by the last session (S13).
