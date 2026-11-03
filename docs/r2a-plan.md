# Milestone R2a plan: a battle in rounds

**Status: agreed with the user on 2026-11-02** (S0 of [the task list](tasks/r2a-battle-in-rounds.md), T003–T006). The user took every recommendation for R2a's 26 open calls, chose the preview entry on every build (X2's R2a part), and agreed the plan as outlined. The answers are dated in `docs/tasks/clarify.md` ("R2a S0"), and S0 wrote them into SPEC before any code.

Written 2026-11-02 against `develop` at `e6541f4` ([#66](https://github.com/Swalliso/Sambattler/pull/66), R1's review gate, merged). R2a is the first part of SPEC §16 "Milestone R2 — Rounds", split by X1. Its tasks are `docs/tasks/r2a-battle-in-rounds.md`, T001–T146, in sessions S0–S21. R2b writes `docs/r2b-plan.md`.

## Goal

One battle in rounds, played on the dev site. You plan with the clock stopped, seeing the general's whole army. Then both whole armies clash, and the round is scored into two Heartcaps until one falls, or round 9 ends in a Decision. The general plans first and adapts at rounds 4 and 7, and your colony is your formation.

R2a tests v2's core bet before R2b builds the run around it: does planning with the general's army in view, then watching whole armies clash, play well? The rough playtest after S14 asks that first (R2-Q25), and S21's playtest is the gate.

## Scope

**In R2a** (§16 R2's first half, X1):
- **The round loop** (§4.2, §4.7): planning, clash and aftermath; ticks only in a clash; squads fielded fresh each round, in formation from their plots; both armies arriving on one tick; the muster's knitting inside Begin, with the preview equal to what fields; the 45 s cap and how a lane ends (§5.6, §6.7).
- **Scoring** (§6.4, §6.5, §6.7): 25 per surviving damage supply, the storm by round, X5's cap of 25% of the loser's max HP a round, and a Rout at 0 or a Decision by share after round 9.
- **The colony** (§4.6, §11.9): fixed 2×2 plots in 2 ranks, loam and stumps, and the closed third rank with its open order. Gaining plots is R2b's.
- **The general plans first** (§7.1–§7.4): income, the counter cycle at rounds 4 and 7 reading what you fielded, and buying and placing by §7.3, on `maxOwned` until R3. Bots plan after it.
- **The economy per round** and refunds by phase (§6.1, §6.2, §4.4).
- **The commander power** once per clash (§6.6).
- **The UI for one battle** (§10.2, §10.5): the three views, both colonies, the formation and merge previews, the tally and the lane tug, both Heartcaps, basic marks and the report by round.
- **Tools in round form** (§12.3, §15): `sim`, `balance`, `bench` and `experiment`, round goldens, the round guardrails (G1–G8, G11–G13, G16) and screenshot parameters.
- **R1's chosen set as default data** (§1.3 #11), which v1's battle on `develop` plays too.

**Not in R2a.** R2b's ([its task list](tasks/r2b-run-in-rounds.md)): lives, the run, drafts, saves, sprawl, the route node's kit, content's v2 effects, retiring v1 with its tests, Help and tips, link previews, and G14 and G15. Not in R2 at all: copies, augments, combos and packs (R3), and the card text (R4b).

## What R2a starts from

- **R1's set** (R1's review gate, 2026-11-02):
  - all of `kept` as default data: pinning, spore clouds, cleave, the Burster and the Rhizomorph;
  - the arrival shield as v2's rule, under `balance.rounds.arrivalShield {minTypes 2, shieldFrac 0.2}`. It applies at the arrival, before the muster, as R1's `clashshield` did (`tools/lib/clash.ts`): emplacements neither count as a type nor take a shield, and a knit keeps shields in proportion;
  - squads per building: §11.2's column, with Capguard Hall at 3;
  - the Elder Sporeling keeps its splash;
  - emplacements by #10, with A029's body rules;
  - D47's overflow, no pace rule, and the muster inside the 45 s.
- **Scoring:** X5's cap and Decision by share. G4's band is measured on real battles (S10b, S18).
- **No copies before R3** (X4 decided no, so D45 stands).
- **The counter cycle:** the Anti-Ranged kind (#14), type-and-tag sets with three fixes (#15), and eliteShare by Elder parts (R2-Q3).
- **R1's code:**
  - `src/sim/formation.ts`'s layout and muster;
  - `tools/lib/clash.ts`'s army builder, for the round tools only;
  - the pool's clash jobs, the race model and the full-colony bench case.
- **R4a's drawer:** `src/render/unitSprite.ts`, with its pips, the Elder rim and the emplacement sprites.
- **For R2a to watch** (R1):
  - Capguard Hall at 3 still won 92% at 300 gold and 2% at 1,500, so read it round by round;
  - `pinned` alone weakened the answers to the Sporeling and the Capguard;
  - under `kept`, v1's G2 newly failed on the Gill Archer;
  - the Rhizomorph Tunnel won 1% as a mono, so its job is support;
  - no scoring rule brought R1's race model inside G4's band.

## The decisions (2026-11-02)

Every recommendation was taken. ★ marks a departure from SPEC's first guess.

| Ref | The call |
|---|---|
| X6 | Measure the run's length first: planning seconds per round in R2a, the run's minutes in R2b. Re-set the target after R2b's playtest |
| X7 ★ | `bot:answer` plans after the general and leans toward the answer to what it sees. G8 reads under both policies (R2a), as do G14 and G15 (R2b) |
| X8 | §7.2 stands. R2a reports the general's banked gold, free plots and exact replays, and adds two default-off knobs |
| RB-Q3 | Active play time is visible wall time, with a 60 s idle cutoff. It never enters the state |
| R2-Q1 | The full reveal stays the default, with an A/B "last fielded" view (`reveal=last`) in the playtest |
| R2-Q2 ★ | Interest is 1 per 10 gold banked, up to 30. If the playtest still finds it confusing, cut it |
| R2-Q3 ★ | eliteShare counts Elder units only, at their parts' base supply. The swarm read goes |
| R2-Q4 ★ | A single battle's general buys only its listed weights |
| R2-Q5 | The Burster Pod and the Rhizomorph Tunnel get weight 1 in data, and `aiWeight` retires |
| R2-Q6 | `bot:rush` and `bot:turtle` are weight profiles, and `placement` goes |
| R2-Q7 | R2a re-measures Puppet Bloom's trios in rounds (R1: a median of 0 in rounds 1–3). If they're still below 1, R2b's S0 gives it a v2 job |
| R2-Q8 | The round state holds ids and numbers, and the UI reads text by id |
| R2-Q9 | `test:slow` asserts every round guardrail in about 15 minutes, on worker pools |
| R2-Q10 ★ | G16 counts role-split pairs, with a column per budget |
| R2-Q11 | The clash-rule set: plot-order arrival, the muster inside Begin, per lane only, the lowest-id parent's stats, frozen lanes, capped damage before the HP floor |
| R2-Q12 | The planning-screen set: a fresh keydown and about 400 ms for Begin by key, your hits' marks, the slot-to-plot snap, the aftermath held under Help |
| #19 ★ | `colony.startRanks`; files open 2, 3, 1, 4, and on Twin Roots 2, 1, 3, alternating lanes |
| #22, #23, #25, #31 | SPEC's first guesses |
| #29 | No bank reserve for now |
| #30 | SPEC's first guess, with a lane on each fielded squad |
| #35 ★ | The approach: one measurement, with four changes. R2a sets G4, G6, G8, G13 and G16 (T125) |
| M6-Q1 | SPEC lists the feat stats now, and R2a records them |
| M7-Q1 ★ | The Gray Rot's trait is dropped (the records part waits for M7) |

## Simplified under X2

X2's decision (2026-11-02) lets `develop` switch wholly to v2, as long as `npm run verify` stays green on every PR. R2a uses that in three places:
1. **The preview entry loads on every build.** `scene=rounds` goes through a dynamic `import()` (its own chunk, so the main bundle stays small), and the title's button shows only on the dev site. That drops the `ROUNDS_PREVIEW` gate and its "not part of this build" message (T075). It also drops `tools/screenshot.ts`'s `--dev` mode, which would have served the app through Vite's dev server (T080, T135, T138). Captures and browser tests reach the preview as they reach v1's scenes. `main` never sees it, since R2b deletes the preview before any release.
2. **No session checks by hand that v1 still plays.** `npm run verify` still covers v1 through its tests and goldens, but S4's "the v1 game still plays" check is gone.
3. **R2b deletes less:** no `ROUNDS_PREVIEW` or `--dev`. Its S0 settles its own branches with X2.

R2a keeps building beside v1, as X2 decided: edits in place would break the typecheck of everything that imports the sim (A025), and verify stays green on every PR.

## Calls this plan makes

The task list's "Calls this list makes" (Technical context) are this plan's calls, as refreshed at S0:
- Call 2, the entry, changed under X2;
- Call 29 retired with X4's no.

They're each reversible, and S0 wrote those that change SPEC text into SPEC (T005).

## Stand-ins

Each is temporary, and R2b removes or folds it:
- **The entry:** `scene=rounds` and the title's preview button on the dev site.
- **Staging:** the `rounds/` folders beside v1's code (§13.4's paths under `rounds/`), and the copies of kept systems typed on the round state (A027, A103). A fix to a kept rule lands in both copies until R2b.
- **Tools:**
  - `--rounds` on `sim`, `balance`, `bench` and `experiment`;
  - `kind: "rounds"` replays in `ROUND_REPLAYS` beside v1's;
  - `@r<n>` checkpoints beside v1's `@<tick>`.
- **Data beside v1's fields:** `balance.rounds`, `squad`, `economy.goldPerRound`, `afterRound` and each map's `colony` block. They're kept out of v1's library (Call 27), so they never move a v1 golden.
- **Content tied to retired systems** (Call 19):
  - modifiers on retired stats compile to nothing, and the compile lists them;
  - Rhizome Tithe is refused with `notInRoundsYet`;
  - the Rhizome Vault plants but does nothing;
  - no elites, relics or upgrade levels in a single battle.
- **What R2a doesn't pay for yet:**
  - `pendingGold` exists, and nothing pays into it (Call 25);
  - there are no drafts: the opening's draft step is an empty hook (Call 26).
- **The general on `maxOwned`** until R3's copies (#42).
- **Help and sound:** Help still describes v1, and the preview plays no battle sounds.

## Steps

The task list's Sessions table, one PR each into `develop`:

| Phase | Sessions | What lands |
|---|---|---|
| Setup | S0 | This plan, R2a's decisions, the refreshed task list |
| Foundational | S1, S2 (side by side), S3a, S3b, S4 | R1's set and the rounds data (v1's goldens move once, in S1); the colony and the formation's pure core; the round types, compile and the modifier DSL; `createBattle` and the step by phase; the planning commands and the kit |
| US1, a round's clash | S5, S6, S7 | The kept combat copied and stripped, with emplacements; Begin, the arrival shield, the muster and lane ends; scoring, the Decision and the rule scenarios |
| US2, a whole battle headless | S8, S9, S10a, S10b | Opening a round, the economy and stats; `runHeadless` and `sim --rounds`; the general plans first and the bots after it; the first round golden and step 3's reading |
| US3, play it on the dev site | S11, S12 and S13 (side by side), S14 | The entry, the loop and the bridge; the field and the previews; the bands and the Intent panel; the tray, inspect, the chrome and the report |
| The rough playtest | S14b | You play two or three battles (R2-Q25) |
| US4 and US5 | S15, S16 (side by side) | The counter cycle in rounds, with X8's readouts; the power once per clash |
| US6, tools and guardrails | S17, S18 | Round replays, the bench, the balance tools; the round guardrails, the answer bot, and #35's bands agreed with you |
| US7, measures | S19 | The "last fielded" view and planning seconds per round |
| Polish | S20, S21 | Verification and the docs; the playtest gate |

## Verification

- **S20 runs §16 R2's steps 1–4 and 7–9 for single battles** (T129–T135):
  - `npm run verify`, with §15.7's round rows;
  - the round goldens: one battle, Twin Roots, the merge mirror, and Vesper's and Cordis's powers;
  - 40 headless battles against `general:scripted` (median rounds, the share reaching round 9, capped clashes, the bot's win rate);
  - every rule scenario exactly, E1–E8 among them;
  - `npx vitest run tests/slow/rounds`;
  - `npm run bench -- --rounds`;
  - the captures with §15.6's assertions.
- **Steps 5 and 6**, and the run parts of the rest, are R2b's.
- **The rough playtest** (S14b, T145) asks step 10's questions 1, 2, 3 and 6 in rough form, and whether S15–S20 should change.
- **The gate** (S21, T137) asks questions 1, 2, 3, 6 and 7, R4a's Elders question, and #52's reading on Twin Roots, with a `reveal=last` battle for R2-Q1's A/B. Planning seconds per round are read off the report (X6).

## Open questions for the user

**At S0: answered 2026-11-02.** You took every recommendation (the table above) and the preview on every build, and agreed this plan.

**Later:**
- **S14b (T145):** the rough playtest, and any change to S15–S20.
- **S18 (T125):** the battle-level bands for G4, G6, G8, G13 and G16 (#35), from T124's measurement.
- **S21 (T137, T139):** the playtest gate, your tuning calls, and R2b's start.
- **R2b's S0:**
  - Puppet Bloom's v2 job, if S16's median is still below 1 (R2-Q7);
  - a bank reserve, if X8's readouts warrant one (#29).

## As built

Written at S20 (2026-11-03), on `develop` at `6f99d2f`, once S18 ([#104](https://github.com/Swalliso/Sambattler/pull/104)) had merged. R2a's sessions S0–S19 landed in [#67](https://github.com/Swalliso/Sambattler/pull/67)–[#105](https://github.com/Swalliso/Sambattler/pull/105), with the hub's docs PRs between them. Each session's own As built is in [the task list](tasks/r2a-battle-in-rounds.md) and its bullet in [status.md](status.md).

**What R2a built:** a battle in rounds that a human plays on the dev site at `/?scene=rounds`, from round 1's planning to the report by round. The general plans first and adapts at rounds 4 and 7, your colony is your formation, the commander's power fires at most once a clash, and the round tools and guardrails measure it headlessly. It stands beside v1, which the game and `main` still run. The pace is 100 Heartcap damage a supply (T125, the user, 2026-11-03), so a battle takes a median of 7 rounds. S21's playtest is the gate.

### Verification (S20, T129–T135)

SPEC §16 R2's steps 1–4 and 7–9 for a single battle. Steps 5 and 6, and the run parts of the rest, are R2b's.

| Step | Command | Result |
|---|---|---|
| 1 | `npm run verify` | Green in 26 s: 60 unit files, 1,066 cases passing and one expected fail, the Burster seat effect (T148). Every round row of §15.7 for a single battle has its cases (below) |
| 2 | `npm run golden -- verify` | v1's eight replays and the five round replays pass: `r2-balanced-vs-scripted-s1`, `r2-twin-roots-balanced-vs-scripted-s3`, `r2-merge-mirror-s3`, `r2-vesper-power-s3` and `r2-cordis-power-s3` |
| 3 | `npm run sim -- --rounds --seeds 1..40 --player bot:balanced --enemy general:scripted --summary` | Every expectation passes: all 40 end with no rejected command, a median of 7 rounds, 15% reach round 9 (at most 15%), 9% of clashes reach the cap, the bot wins 60%, 36 ms a battle. In `docs/balance-backlog.md`'s S20 entry, beside S10b's reading at 25 a supply |
| 4 | `npx vitest run tests/unit/rounds/scenarios.test.ts`, and `npm run sim -- --rounds --scenario clash-cap --until r1 --assert roundLog[0].lanes[0].capped=true` | The 21 round scenarios assert their outcomes exactly (34 cases), E1–E8 among them. The CLI check passes after S20's fix (below), and verify now runs it |
| 7 | `npx vitest run tests/slow/rounds` | **Six round guardrails miss, each waiting for the user's call**: G1, G2, G3, G7, G8's mono clause and G16. G4, G5, G6, G11, G12, G13 and G8's two bands pass. The suite asserts them all, takes 4 minutes, and reads as S18's did at 100 a supply. Every verdict is in `docs/balance-backlog.md`'s S20 entry, and T133 stays open until the user's calls. v1's `tests/slow/guardrails.test.ts` still runs until R2b |
| 8 | `npm run bench -- --rounds` | Inside §13.7. R1's full-colony clash: a mean tick of 0.27 ms and a p99 of 0.79 ms on the one-lane field (96 units a side), 0.33 ms and 0.80 ms on Twin Roots (120 a side), against 1 and 2.5 ms |
| 9 | `npm run screenshot`, T135's nine captures | All nine pass §15.6's assertions 1–5, each with the browser's hash equal to Node's, and read right against step 9's checklist, minus lives and the route (below). The report's chart needed S20's second fix |

**Step 1's round rows,** in `tests/unit/rounds/`:
- the order of a round's events: `rounds.test.ts` (round 1's opening, a later round's, what carries over, the last round's aftermath);
- income by round: `economy.test.ts`;
- the formation from the plots: `formation.test.ts` and the `formation-from-plots` scenario;
- how a clash ends: `clash.test.ts` (a lane's end), `scoring.test.ts`, and the `clash-cap` and E1–E6 scenarios;
- the damage formula: `scoring.test.ts` (merged supply, siege counted once to decide and twice to deal, the cap over the lanes lost, the storm);
- merging at the muster, the preview equal to what fields: `formation.test.ts` (`musterFor`) and `clash.test.ts` (the muster inside Begin);
- the Heartcap race and the Decision after round 9: `scoring.test.ts` and the `decision-round-9` and `both-heartcaps-zero` scenarios;
- refunds by phase: `planning.test.ts`;
- the general planning first and never reading what you plant: `ai.test.ts` (`planningView`), `rounds.test.ts` and the `general-plans-first` scenario;
- a snapshot round trip between rounds: `rounds.test.ts` and `determinism.test.ts`.

**Step 9's captures** (`artifacts/screenshots/s20/`, each on `scene=rounds&seed=1&player=bot:balanced&enemy=general:scripted`): `r2a-planning-1`, `r2a-planning-4` with the Sporeling Burrow's card chosen, `r2a-clash-start`, `r2a-clash`, `r2a-aftermath`, `r2a-report` (a Rout in round 7), `r2a-planning-twin`, and `r2a-planning-4` under the deuteranopia and protanopia filters. Against the checklist:
- both colonies show their plots, and Twin Roots draws its stumps and loam as themselves;
- in planning the general's whole army stands in formation, and assertion 4 holds the previews against the clash's first tick in `r2a-clash-start`;
- the top band shows both Heartcaps, the round of 9 and the round tally, and the clash shows the lane tug;
- the matchup marks show on the general's squads while the card is chosen, and under both filters the teams and the marks stay apart;
- nothing from the retired list shows, and nothing is clipped at 1280×720;
- the report shows the round chart. #52's reading of Twin Roots' scale is the user's, at S21.

**S20's two fixes:**
- **The CLI's scenarios:** `npm run sim -- --rounds --scenario <id>` stopped in round 1's planning, since a round scenario's player is human, and only the player's side Begins. `tools/sim.ts` now Begins each round for a human player with no other command, as `playerScript` does in the tests, and `tools/verify.ts` runs step 4's `clash-cap` check. A bot player Begins itself, as before.
- **The report's chart:** a Sporestorm round's multiplier was drawn over its damage label whenever the round's bar was the tallest, which at 100 a supply is most storm rounds (the cap binds in 70%), so "☁ ×1.2" read as "×12". The chart's top pad in `src/ui/rounds/report.ts` now holds the multiplier above the label, and `tests/browser/rounds/inspect.test.ts` checks the two apart on the capture's battle.

### The names R2b/T001 takes

Every file in the task list's Technical context table landed under its proposed name, and no session renamed one.
- **The staging folders:** `src/sim/rounds/`, `src/app/rounds/`, `src/render/rounds/`, `src/ui/rounds/`, `tools/lib/rounds/`, `tests/unit/rounds/`, `tests/browser/rounds/`, `tests/slow/rounds/`, `tests/roundHelpers.ts` and `data/scenarios/rounds/`.
- **Files the table doesn't list:** `src/ui/rounds/rounds.css` (S13's styles), `tests/slow/rounds/verdict.ts` (S18's shared verdicts and pools) and `data/scenarios/rounds/bench-300.json` (S17's bench case, which `scenarios.test.ts` also asserts).
- **The entry:** `scene=rounds`, a dynamic `import()` of `src/app/rounds/main.ts` in `src/app/main.ts`, and the title's "A battle in rounds (preview)" button, on the dev site only (`src/ui/screens/title.ts`, under `DEV_SITE`).
- **The switch:** `--rounds` on `tools/sim.ts`, `tools/balance.ts`, `tools/bench.ts` and `tools/experiment.ts`, and verify's round steps in `tools/verify.ts`.
- **The goldens:** the five `r2-…` replays in `tests/golden/`, listed in `tools/golden.ts`'s `ROUND_REPLAYS` as `kind: "rounds"`. The two power replays set `starter: true` (S16).
- **The play-time module:** `PlayClock` in `src/app/rounds/playTime.ts`, with its test `tests/unit/rounds/playTime.test.ts`, which records-2 extends (run-it-back.md T015, T016).
- **Data beside v1's fields:** `balance.rounds`, the `rounds` block of `data/balance-targets.json`, `squad`, `economy.goldPerRound`, `afterRound`, each map's `colony` block, and the bots `bot:answer`, `bot:slayer-rounds` and `bot:slayer-rounds-nomerge`.
- **The test inventory** (T136) is below.

### Departures from SPEC, and calls where it's silent

- **State beyond §14.4's listing,** for R2b to write into §14.4 or fold away:
  - `UnitState.shield` (the arrival shield), `UnitState.slotY` (v1's `spawnY`, for §5.2's drift) and `UnitState.arrival` (a unit's place in its side's order onto the field);
  - `SquadState.slot` (R1's `Slot`) and `SquadState.stats` (per-squad tiers from `rank` and `onLoam`);
  - `LaneLock.capped`; `ClashState.fielded`, `ClashState.maxElders` and `ClashState.arrived`; `RoundResult.stats`; and the `musterKnit` event's extra fields.
- **Help in the preview is v1's** (S14). `src/app/rounds/battleView.ts` reads it from a v1 rules-only battle, as the title's Help does. That's the one place a `rounds/` file uses v1's `BattleState` (`.claude/rules/v1-code.md`), until R2b rewrites Help.
- **The counter cycle** (S15), where SPEC is silent:
  - counter sets hold spawners only, as in v1;
  - an added missing answer weighs 1, and when a set has cards but none beats the dominant armor, the missing answer is the set's cheapest;
  - `AiPlan.counter` is set in the activation round only;
  - X8's knobs act only for a general that runs the cycle, and replace-when-full acts once a turn, for the heaviest card it can afford.
- **The power** (S16): the power replays use the commander's starter kit, since with the faction roster Cordis's Bloom never fires on seed 3. The tooltip is worded from the power's numbers, since the data's text is v1's.
- **The tools** (S17):
  - off CI, the Chromium checks hold §13.7's budgets on statistics one slow frame can't decide: the p95 frame and the median of five plants. On CI they and the round bench's timings hold a guard of 3× each budget, since CI's shared runner takes about three times as long;
  - the clash's first fighting tick runs cold in Chromium, 4.8–11.4 ms once a page load, so the frame check reads the frames after it;
  - Twin Roots' full colony is 120 units a side, not 128, since one front-rank plot a side is a stump;
  - supply duels end at the 45 s clash cap.
- **The guardrails** (S18):
  - the answer bot leans × 3 toward the card whose hits are best on the general's planned squads, by supply. A tie goes to the card the squads' own hits are weakest on, then the heavier weight, then the id: on hits alone, Sporelings tie Capguards against mono Sporelings;
  - G12 confirms the top 3 answers that pass G3, since an answer that fails G3 doesn't count (§12.3). Confirming the top 3 of every answer had left mono Rootbreaker with three G3-failing monos and no clean answer measured;
  - G4 plays 200 battles, not 40, with at most 20% reaching round 9: the user's call at T125, since 40 battles can't tell 18% from 15%.
- **The measures** (S19): `reveal=last` is a view rule only, worked out from Call 12's records, and the Intent panel says "Changes show at Begin". The play clock never saves.
- **The CLI's scenarios** (S20): a human player Begins each round (above).

### For S21 and R2b

None of these blocks S21's playtest.
- **The `reveal=last` view's gaps** (S19):
  - a click on a plot holding a hidden building still opens its details;
  - a sold building that's drawn again can't be inspected;
  - the empty-lane warning reads the live formation;
  - `tools/screenshot.ts`'s assertion 4 compares the drawn enemy with the live `formationOf`, so a `reveal=last` capture from round 2 fails it. T135 takes none.
- **The cold first fighting tick in Chromium** (S17): a warm-up in `src/app/rounds/main.ts`, which steps a throwaway clash tick before the first one drawn, would fix it.
- **`power-demo` has no clash form yet** (§15.7): v1's other merge scenarios do (`merge-trio`, `knit-cancel`, `merge-under-fire`, `elder-ladder`).
- **The round guardrails that miss** (T133) wait for the user's calls at S21 (T139) or earlier. Each is in `docs/balance-backlog.md`.
- **R2-Q7 and #29 for R2b's S0:** Puppet Bloom's v2 job, since S16's median is 0 trios, and a bank reserve, since your colony is full from round 5 and you then bank a median of 320 gold a round.

### The test inventory for R2b (T136)

For each of v1's test files: what §15.7 says happens to it, and the round file that replaces it at R2b's switch-over. "Merge" means the two files become one when R2b moves `…/rounds/X` to `…/X`.

**Unit tests** (`tests/unit/`):

| v1's file | §15.7 | At the switch-over |
|---|---|---|
| `ai.test.ts` | rewritten | `rounds/ai.test.ts` replaces it: the general's view, buying, toggles, bots after the general, the counter cycle in rounds and the answer bot. v1's ticks and telegraph cases retire; the Spore Exchange's interest is in `rounds/economy.test.ts`, and the Rhizome Vault's case waits for its job in rounds (Call 19) |
| `asserts.test.ts` | kept | kept: it already holds `@r<n>`. v1's `@<tick>` cases go with v1's sim |
| `audio.test.ts` | rewritten in part | the bank, limiter and engine cases kept; "battle sounds" rewritten for round events (R2b/T038). No round file yet |
| `battleFeel.test.ts` | retired | retired with `breach`, `hotstart` and `bigdrafts` (§16 R2) |
| `buildings.test.ts` | rewritten | `rounds/planning.test.ts` (plots, stumps, refunds by phase, `priceOf`) and `rounds/compile.test.ts` (each spawner's squad). Besieged production retires |
| `clash.test.ts` | (R1's tool) | retired with R1's `placeArmy` and `playClash`, which play on v1's sim; the army builder's cases (`armyFromBot`, `lineOf`, `assignSlots`) are kept while the round tools use it. `rounds/clash.test.ts` and `rounds/tools.test.ts` cover the clash on the round sim, and the full colony is the round bench's |
| `combat.test.ts` | kept, minus v1's parts | merge with `rounds/combat.test.ts`, dropping buildings and Heartcaps as targets, turrets, call for help, rush, fall-back and dive (§13.4) |
| `combatRework.test.ts` | retired | retired with its presets (§16 R2). Clouds and the Rhizomorph, now default data, are in `rounds/combat.test.ts` and `damage.test.ts` |
| `commanders.test.ts` | kept (run) | kept: commanders, bans and pool weighting |
| `contrast.test.ts` | kept | kept |
| `counters.test.ts` | kept (counter matrix) | the matrix's answer bots and tiny run kept, on round battles. R1's clash G3, G12, G13 and the clash cache retire with `playClash`; `tests/slow/rounds/counters.test.ts` and `battles.test.ts` replace them |
| `damage.test.ts` | kept, extended | kept |
| `data.test.ts` | kept, extended | kept; its "rounds data" cases fold with the `rounds` blocks |
| `determinism.test.ts` | rewritten | `rounds/determinism.test.ts` replaces it |
| `drafts.test.ts` | rewritten in part | R2b's drafts in planning after rounds 2, 4 and 6 (§8.3); the in-battle hold retires |
| `economy.test.ts` | rewritten | `rounds/economy.test.ts` replaces it |
| `effects.test.ts` | kept | merge with `rounds/effects.test.ts` (the round triggers, `rank` and `onLoam`) |
| `endings.test.ts` | rewritten | `rounds/scoring.test.ts` (the battle's end) and its scenarios replace it. Lives are R2b's |
| `formation.test.ts` | (R1's module) | kept, and merged with `rounds/formation.test.ts` as the two `formation.ts` files merge |
| `healing.test.ts` | kept | kept, on rounds' `systems/healing.ts`; `rounds/combat.test.ts` and `clash.test.ts` hold the round cases |
| `merging.test.ts` | kept, extended | kept; presence retires. The muster's cases are in `rounds/formation.test.ts` and `rounds/clash.test.ts`, and merge policies in `rounds/ai.test.ts`'s toggles |
| `powers.test.ts` | rewritten | `rounds/powers.test.ts` replaces it. The cooldown and first-ready cases retire; Rhizome Tithe's waits for its effect in rounds, and Puppet Bloom's for its v2 job (R2-Q7) |
| `prototypes.test.ts` | rewritten | only the knobs that stay (`a2`, `b3`, `flyers`); the rest retire with their presets (§16 R2) |
| `purity.test.ts` | kept | kept: it already walks `src/sim/rounds/` |
| `records.test.ts` | kept | kept (records-2 extends it) |
| `report.test.ts` | kept, extended | `rounds/report.test.ts` (the round chart, gold by source, the outcome) replaces it |
| `resume.test.ts` | rewritten | R2b's: saves at planning and at Begin, and step 6's save from before R2 (§8.9) |
| `rng.test.ts` | kept | kept |
| `roundRace.test.ts` | (R1's race model) | kept while R2b's S0 uses `tools/lib/roundRace.ts` for G14's and G15's first guesses (#35), then retired with it |
| `run.test.ts` | rewritten in part | R2b's: the route, rewards and the Grove kept and extended; the resume and whole-run cases change |
| `scenarios.test.ts` | rewritten | `rounds/scenarios.test.ts` replaces it. v1's territory and besieged scenarios and `comeback-6` retire, and `power-demo` still needs its clash form |
| `settings.test.ts` | kept | kept |
| `shapes.test.ts` | kept | kept (R4a's) |
| `teachingText.test.ts` | rewritten | R2b's round Help and tips; `rounds/teachingText.test.ts` holds the top band's gold and storm tips |
| `territory.test.ts` | retired | retired (§4.3) |
| `tray.test.ts` | rewritten | the round tray's prices and "need N" are in `tests/browser/rounds/inspect.test.ts`, and `priceOf` in `rounds/planning.test.ts` |
| `unitSprite.test.ts` | kept | kept (R4a's) |
| `words.test.ts` | kept | kept until R4b deletes `src/ui/words.ts` |

**Browser tests** (`tests/browser/`; §15.6 retires deploy, Hold and its `F` key, and forward plots):

| v1's file | At the switch-over |
|---|---|
| `clarity.test.ts` | "Space in deploy" retires; the HUD's tooltips are in `rounds/hud.test.ts`; the tips, events and relics stay with the run, rewritten by R2b |
| `commanders.test.ts` | the Underroot kept; the power is `rounds/commanders.test.ts` |
| `frame.test.ts` | the ambient spores kept; the frame budget at 300 units is `rounds/perf.test.ts` |
| `hud.test.ts` | `rounds/hud.test.ts` and `rounds/inspect.test.ts` (the top band, the tray, the controls); deploy retires |
| `inspect.test.ts` | `rounds/inspect.test.ts`; deploy-phase and live inspection retire with deploy and placing while live |
| `protoSaves.test.ts` | kept, for the knobs that stay |
| `records.test.ts`, `scale.test.ts`, `settings.test.ts` | kept |
| `resume.test.ts` | rewritten by R2b (step 6) |
| `runScreens.test.ts` | kept, extended by R2b: lives on the run bar, the general's kit on its route node |
| `sound.test.ts` | rewritten in part (R2b/T038) |

New in R2a: `rounds/planning.test.ts`, `rounds/rounds.test.ts`, `rounds/reveal.test.ts` and `rounds/perf.test.ts`.

**Slow tests, goldens and helpers:**
- `tests/slow/guardrails.test.ts` retires. `tests/slow/rounds/` replaces it: `duels.test.ts` (G1, G2), `battles.test.ts` (G4–G8, G13), `counters.test.ts` (G3, G12), `formation.test.ts` (G16) and `perf.test.ts` (G11). G2 reads v1's kept block, and R2b adds G14 and G15.
- v1's eight `m…` replays retire, and the five `r2-…` replays replace them. `m3-run-s7` is replaced by R2b's run replay.
- `tests/helpers.ts` is replaced by `tests/roundHelpers.ts`, moved to its name.
