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

_Empty until S20._
