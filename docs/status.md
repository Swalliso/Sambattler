# Where things stand

Updated 2026-11-03, on `docs/r2a-s17-s19` (the hub's docs PR into `develop`). This is the hand-over page. It covers what we're working on, what's waiting on the user's decision, and where each piece lives. Update it when work lands or the user decides something. Keep the detail in the docs it links to.

## In short

- **The game on `develop`:** Milestones 1–5 are built, plus the combat rework behind `?proto=rework`.
  - `main` has M1–M4 and the UI work.
  - M5 (commanders and powers) is only on `develop` ([#22](https://github.com/Swalliso/Sambattler/pull/22)).
- **The design changed on 2026-10-31.** After the rework's playtest (P3), the user moved the game to **SPEC v2**:
  - battles become rounds: you plan with the clock stopped, then both whole armies clash;
  - the general plans first, and you see its whole army before you plan;
  - each battle is a race between two Heartcaps, and the run has lives, so a won battle never costs anything;
  - the column fight is gone, your colony is your formation, and the colony grows plots over a run;
  - a kit of building cards with copies;
  - six core archetypes, with augments and combos.

  See [SPEC §0.1](../SPEC.md#01-what-changed-in-v2), [§1.3](../SPEC.md#13-v2-decisions-2026-10-31) and the [P3 notes](playtest-feedback.md#2026-10-31-p3-the-combat-rework-the-user).
- **SPEC v2 is on `develop`** ([#39](https://github.com/Swalliso/Sambattler/pull/39)). **Nothing in v2 is built yet.** Until milestone R2 lands, the code follows v1: the M5 battle, with the rework's pieces behind `?proto=rework` on the dev site.
- **The spec is broken into task lists** in [docs/tasks/](tasks/README.md) ([#40](https://github.com/Swalliso/Sambattler/pull/40), on `develop`), spec-kit style: one list per milestone, one session per row of its Sessions table. The decisions each milestone needs from the user are in [clarify.md](tasks/clarify.md), and the problems the breakdown found in SPEC v2 are in [spec-analysis.md](tasks/spec-analysis.md). Lists after R1's are drafts, refreshed when each milestone's plan is agreed.
- **Milestone R1, the clash check, is done** ([SPEC §16](../SPEC.md#16-milestone-plan)). A headless tool fought whole armies at equal gold, with no rule change, to set squad sizes and check that every strong army has an answer before the round loop is built. At its review gate on 2026-11-02 you took every recommendation (below). **R2a's plan is agreed** (S0, 2026-11-02), **R2a S1 to S13 have merged**, with S7b's and S9b's fixes: US1 (a round's clash, scored) and US2 (a battle in rounds, with the general planning first) are done, a round in which nothing changed replays the last clash exactly, and the first round golden is recorded. S14 ([#95](https://github.com/Swalliso/Sambattler/pull/95)) made `/?scene=rounds` play a whole battle in rounds, from round 1's planning to the report, and your rough playtest (S14b) found the loop working. **S15 ([#99](https://github.com/Swalliso/Sambattler/pull/99)), the counter cycle, S16 ([#98](https://github.com/Swalliso/Sambattler/pull/98)), the power once per clash, and S19 ([#101](https://github.com/Swalliso/Sambattler/pull/101)), the playtest's measures, have merged. S17 ([#102](https://github.com/Swalliso/Sambattler/pull/102)), the round tools, passed the hub's review and lands when CI passes.**
- **Then:**
  - R2: rounds, the general plans first, lives, and the planning screen. R2a's plan, [r2a-plan.md](r2a-plan.md), was agreed on 2026-11-02. The task lists split it in two (X1): R2a, a single battle in rounds, then R2b, the run in rounds. R2a gets a rough playtest after S14, as soon as a battle in rounds is properly playable and before its counter cycle and powers (R2-Q25, agreed 2026-11-01), and S21's playtest stays the gate;
  - R3: the kit, the six archetypes, augments, combos and run packs;
  - R4: readable armies and the card-text pass, in two parts (X3, agreed 2026-11-01): R4a, the shapes on the field, now beside R1 (below), and R4b, the cards, after R3;
  - then M6–M8, rewritten for v2.

  [docs/tasks/README.md](tasks/README.md) has the full order and every milestone's sessions.

## Next: S18 up to T125, then S20

- S17 ([#102](https://github.com/Swalliso/Sambattler/pull/102)) lands when CI passes, with its auto-merge on. The hub's check of S17 and S19 together was clean.
- Then S18 (the round guardrails and the answer bot, T119–T125) runs. It stops before T125, for your call on the bands and the pace. S17's first G4 reading in rounds is below: a median of 9 rounds against G4's 6–8.
- Then S20 (verification and the As built, once S18 and S19 have merged), its deploy to the dev site, and your playtest gate at S21.

## R2a, a battle in rounds

- **S0** (`feature/r2a-plan`, T001–T006, [#67](https://github.com/Swalliso/Sambattler/pull/67)): the plan, [docs/r2a-plan.md](r2a-plan.md), agreed on 2026-11-02.
  - **The calls:** you took every recommendation for R2a's 26 open calls. Each is dated in [clarify.md](tasks/clarify.md) and written into SPEC.
  - **Eight depart from or add to SPEC's first guess:**
    - interest at 1 per 10 gold, up to 30 (R2-Q2);
    - eliteShare counting Elder parts only (R2-Q3);
    - a single battle's general on its listed weights (R2-Q4);
    - G16 on role-split pairs (R2-Q10);
    - the answer bot (X7);
    - no Gray Rot trait (M7-Q1);
    - `colony.startRanks` (#19);
    - #35's approach to the bands.
  - **Under X2,** the preview entry `scene=rounds` loads on every build, with its title button on the dev site only, so there's no dev-only gate and no `--dev` mode.
  - **The task list is refreshed:**
    - R1's set and the decisions are in its tasks;
    - Call 30 places the arrival shield before the muster, as R1 measured it;
    - the copy tasks are gone (X4).
    - R2b's list no longer names `ROUNDS_PREVIEW` or `--dev`.
- **S1** (`feature/r2a-data`, T007–T014, [#70](https://github.com/Swalliso/Sambattler/pull/70)): merged.
  - The `rounds` data is kept out of v1's library (Call 27). R1's set is default data: all of `kept`, the arrival shield under `balance.rounds.arrivalShield`, the squads with Capguard Hall at 3, and `tierRadiusMult` 1.0.
  - R2-Q5's weights are in data for all seven data bots and the five generals. G7's three mirrors are among the bots, since R1 measured them that way (the hub's reading of the decision, 2026-11-02). `aiWeight` is retired.
  - v1's eight goldens moved once, with a CHANGELOG entry. T014's readings are in [balance-backlog.md](balance-backlog.md).
  - Two CI fixes let the tray hold 16 cards: it picks one row or two at the styles' 88 px card minimum, and a name that still overflows sets a size smaller.
- **S2** (`feature/r2a-colony`, T015–T020, [#69](https://github.com/Swalliso/Sambattler/pull/69)): merged. The five maps have a `colony` block (homeCols 6, `startRanks` 2, §11.9's layouts) that `MapSchema` checks. `src/sim/rounds/colony.ts` gives the plots, their neighbours and #19's open order. `src/sim/rounds/formation.ts` gives `formationFor` and `musterFor` (Call 5's shape), built on R1's `formation.ts`, whose `knit` is now exported. No golden moved.
- **S3a** (`feature/r2a-state`, T023–T025, T140, T026, [#72](https://github.com/Swalliso/Sambattler/pull/72)): merged. No golden moved.
  - `src/sim/rounds/state.ts` holds the round types.
  - `src/sim/rounds/compile.ts` builds the library with no name, description or text (R2-Q8), plus the rules and each side's kit: squads from `squad`, a tower as an emplacement unit, and gold a round. Call 19's passives on retired stats compile to nothing and are listed.
  - `src/sim/rounds/effects.ts` is the DSL: the triggers `roundStart`, `clashStart` and `roundWon`, `gainGold`, and `rank` and `onLoam` by plot.
  - The hub's review found that v1 doesn't know `rank`: a `rank` modifier on a building stat would apply to every building, and v1 ignores a trigger's `if.rank`. No data uses it. T046 now makes v1 skip those too.
  - Two shapes differ from §14.4's listing, for S20's As built: `UnitState.shield` (the arrival shield) and `SquadState.slot` as R1's `Slot`.
- **S3b** (`feature/r2a-create`, T021, T022, T027–T029, [#74](https://github.com/Swalliso/Sambattler/pull/74)): merged. No golden moved.
  - `tests/roundHelpers.ts` starts the round harness with `planningState` and `fromScenario`.
  - `src/sim/rounds/create.ts` has `createBattle`, `makeRoundConfig` and `createFromScenario`. `createBattle` opens round 1's planning through `openRound`, a stub in `round.ts` until T055, whose hooks are the general's turn and a player-side bot's.
  - `rng.ts` adds `ai.player` and `ai.enemy`. `commands.ts`, `step.ts`, `snapshot.ts` and `index.ts` hold the queue, the step by phase, hashing and the API. Every command is refused until its executor lands.
  - Round scenarios load from `data/scenarios/rounds/`. A scenario from a later round makes the rounds before it from `dealt` and `last`.
- **S4** (`feature/r2a-planning`, T030–T034, [#76](https://github.com/Swalliso/Sambattler/pull/76)): merged, which ends Phase 2. No golden moved.
  - `src/sim/rounds/planning.ts` holds the executors for `plant`, `sell`, `toggleMerge` and `beginClash`'s planning half, and the checks `legalPlots`, `plantProblem`, `priceOf` and `sellValue`. Each refusal is a `commandRejected` with a code.
  - A queued enemy plan is refused with `enemyPlanAfterOpening`, so the general's turn (T068) calls the executors directly in the round's opening. A player-side Begin is refused with `notInRoundsYet` until T043.
  - `src/sim/rounds/kit.ts` gives the faction roster with no copies. A general's cards carry its `maxOwned`, which `plant` checks.
  - `formationOf` and `mergePreview` take an optional `change`, and `survivingSupply` is exported with them.
- **S5** (`feature/r2a-combat`, T035–T041, [#78](https://github.com/Swalliso/Sambattler/pull/78)): merged. It starts Phase 3 (US1). No golden moved, and no bug was found in a kept rule.
  - `src/sim/rounds/` holds copies of v1's `world.ts`, `targets.ts`, `spatial.ts` and `hits.ts`, and `systems/` its targeting, movement, combat, merging, healing and clouds. They're typed on rounds' state and stripped as T036–T040 list, with v2's §5.2 as the rule (Call 20).
  - Flyers' checks went too, since nothing in rounds sets `flying` yet. They come back if X9 brings flyers in.
  - Emplacements fire from their centre within their band, never move in separation, pin nothing, never merge and are never healed. Clouds, bursts and the Spore Burst's strike hit them, and a Burster aims at one as at any unit (§6.7).
  - `UnitState.slotY` (v1's `spawnY`, for §5.2's drift) differs from §14.4's listing, for S20's As built.
- **S6** (`feature/r2a-clash`, T042, T046, T043–T045, [#80](https://github.com/Swalliso/Sambattler/pull/80)): merged. No golden moved.
  - **Begin** (`startClash` in `round.ts`) fields both armies at `formationOf`'s positions, in plot order and then j. It shields each lane's mixed army, and applies the muster's passes once (Call 4), so Begin knits what `mergePreview` showed. It writes the fielded record to `clash.fielded`, and `clashStart` fires last.
  - **The clash step:** `systems/clash.ts` skips targeting, movement and attacks on the muster's 20 ticks. It ends each lane on a wipe or at `startTick + 900`, and the ended lane freezes. `step.ts` runs the clash tick in §14.6's order.
  - **Per-squad stats** (T046): a `rank` or `onLoam` modifier on a unit stat gives its squad its own tiers (`SquadState.stats`). v1's compile skips such modifiers, and building modifiers and triggers with `rank`.
  - **For S20's As built:** `LaneLock.capped`, `ClashState.fielded`, `SquadState.stats` and the `musterKnit` event's extra fields aren't in §14.4's listing.
- **S7** (`feature/r2a-scoring`, T047–T052, [#81](https://github.com/Swalliso/Sambattler/pull/81)): merged, and US1 is done. No golden moved.
  - **Scoring** (`scoreRound` in `round.ts`, its helpers in `systems/victory.ts`): 25 × each lane's margin, the storm by round, the loser's damage-taken modifiers (none reach R2a), then the cap on each Heartcap's sum. `RoundResult.damage` is recorded capped, before the HP floor, and the round's winner fires `roundWon`.
  - **The end:** a Rout at 0, with both at 0 going to the general (E8). After round 9 it's a Decision by share of max HP, then the HP fraction, then the general.
  - **19 round scenarios** in `data/scenarios/rounds/`: §16's, E1–E8, `comeback-r4`, and clash-form copies of v1's merge scenarios and R4a's lineups. `scenarios.test.ts` asserts each exactly.
- **S7b** (`feature/r2a-seat-fix`, T147, [#82](https://github.com/Swalliso/Sambattler/pull/82)): merged, on your OK (2026-11-02). No golden moved.
  - **Why:** S7 found that mirror-image clashes didn't come out even. Its check showed that whichever side's units take the lower ids decided them. Every player unit took a lower id than every enemy unit, and separation pushed overlapping pairs apart one at a time, in id order.
  - **The fix:** each separation pass now works out every push from where units stood at its start, sums them in fixed point, and applies them together. An exact stack splits by a mirror-image rule, and units steer by where others stood at the tick's start. SPEC §5.2 says so.
  - **Now:** the Hammercap mono and `comeback-r4` draw whichever side's ids come first, and the other mirrors match unit for unit. `tests/unit/rounds/seats.test.ts` holds it. Rounds' clash cost is unchanged.
- **S8** (`feature/r2a-economy`, T053–T057, [#84](https://github.com/Swalliso/Sambattler/pull/84)): merged. No golden moved.
  - **Opening a round** (`openRound` in `round.ts`) follows §14.6's steps 1–7: it clears the field, pays the income from round 2, sets the storm and emits `roundStarted`, fires `battleStart` in round 1 and then `roundStart`, and runs the general's turn and a player-side bot's turn.
  - **The economy** (`systems/economy.ts`): the stipend, economy buildings at × 1.5 on loam, interest at 1 per 10 banked up to 30 plus 10 for each Spore Exchange, +40 to the last round's loser (nothing after a draw), and `pendingGold` paid once. `incomePreview` is exported.
  - **Stats per round** (`stats.ts`): each round's record closes into `RoundResult.stats`, and `foldRounds` rebuilds the battle's figures. M6-Q1's feat stats are in, and `summarize` gives §15.2's `roundLog`. For S20's As built: `ClashState.maxElders` and `RoundResult.stats` aren't in §14.4's listing.
- **S9** (`feature/r2a-headless`, T058–T064, [#85](https://github.com/Swalliso/Sambattler/pull/85)) and **S10a** (`feature/r2a-general`, T065–T069, [#86](https://github.com/Swalliso/Sambattler/pull/86)): merged, side by side on your OK (2026-11-02). The hub checked the two branches together before either merged. No golden moved.
  - **S9:** `runHeadless` steps by phase with Call 17's checkpoints and stops a planning phase that never Begins. `npm run sim -- --rounds` gives §15.2's result and summary, `@r<n>` asserts sit beside v1's `@<tick>`, `tools/golden.ts` takes `kind: "rounds"` replays (`ROUND_REPLAYS`, empty until T072), and `determinism.test.ts` holds the round determinism cases.
  - **S9's finding:** a round in which neither colony changed doesn't replay the last clash exactly, since the kept systems phase their periodic checks by the battle's tick and the unit's id. It added T149, which S9b fixed (below).
  - **S10a:** the general plans first through `planningView`, with §7.3's scores (Call 11's back-line term), its listed weights only (R2-Q4), `maxOwned` and `afterRound`, and no bank reserve (#29). Bots plan after it and queue `beginClash`, which makes the planning checkpoint (Call 14).
- **S9b** (`feature/r2a-replay-fix`, T149, [#88](https://github.com/Swalliso/Sambattler/pull/88)) and **S11** (`feature/r2a-ui-loop`, T074–T081 and T141, [#89](https://github.com/Swalliso/Sambattler/pull/89)): merged, side by side on your OK (2026-11-02). #89's CI ran before #88 landed, so the hub merged the two locally and ran the typecheck, the round unit and browser tests and the build. No golden moved.
  - **S9b:** the retarget stagger, the pin gate, heals, regen, the trio checks and cloud pulses run on the clash's own clock (`clashTick`). A unit is phased by its `arrival`, its place in its side's order onto the field, never by its id. A round in which neither colony changed and no power fired now replays the last clash tick for tick. A mirror's two sides keep the same timers, so `unit-lineup` ends the same unit for unit with either side's ids first, which settles S7b's watch item on timers phased by id. SPEC §5.2, §5.3 and §13.3 say it, on your OK. For S20's As built: `UnitState.arrival` and `ClashState.arrived` aren't in §14.4's listing.
  - **S11:** `/?scene=rounds` opens the preview on every build, and the dev site's title has an "A battle in rounds (preview)" button. It loads as its own chunk (31 kB gzipped), so the main bundle stays at 192 kB, inside §13.7's 300 KB. It has:
    - the loop by phase, with `battleView.ts`'s mounts for S12–S14;
    - the session on plots and the keys by phase;
    - the bridge and the URL parameters, with Call 28's defaults;
    - the screenshot tool's round captures (§15.6's assertions 1–3 and 5);
    - the renderer's first cut.

    No storage key changed.
  - **For R2b:** `tools/lib/rounds/params.ts` opens the preview's state through the page's own `previewState` in `src/app/rounds/urlParams.ts`, which imports no DOM, so a capture's hash can't drift from the page's. `urlParams.ts` reads v1's `parseFlags` from `src/sim/create.ts`.
- **S10b** (`feature/r2a-general-check`, T070–T073, [#91](https://github.com/Swalliso/Sambattler/pull/91)), **S12** (`feature/r2a-ui-field`, T082–T086 and T142, [#93](https://github.com/Swalliso/Sambattler/pull/93)) and **S13** (`feature/r2a-ui-bands`, T087–T091, [#92](https://github.com/Swalliso/Sambattler/pull/92)): merged, side by side on your OK (2026-11-02). Before turning on #91's and #93's auto-merge, the hub merged the three branches locally and ran the typecheck, the round tests, every golden, the round browser tests and the build. Only the new golden was added. US2 is done.
  - **S10b:**
    - `general-plans-first` shows that the general's colony and army stand before your first command. Three different plans of yours leave its side hash-equal, in rounds 1 and 2 (§16 R2 step 4).
    - Verify runs a round smoke (3 seeds).
    - `r2-balanced-vs-scripted-s1` is the first round golden: 36 checkpoints over 9 rounds. v1's eight goldens didn't move.
  - **Step 3 in rounds** (T073; 40 battles of `bot:balanced` against `general:scripted`, in [balance-backlog.md](balance-backlog.md)):
    - Every battle ends, with no rejected command. 8% of clashes reach the cap, the bot wins 60%, and a battle takes 50 ms.
    - **It misses two numbers: a median of 9 rounds against step 3's 6–8, and 73% of battles reach round 9 against at most 15%.**
    - Why: a won round deals a median of 250 to the general's 2000 HP, and the two sides split the rounds almost evenly. So half the battles end in a Decision.
    - Nothing was tuned. S18's G4 run and #35's bands decide the pace, unless your rough playtest says otherwise.
  - **S12:**
    - the formation preview in planning, for both sides, from `formationOf` and `mergePreview`;
    - `matchupClass` (`src/sim/rounds/matchups.ts`, pure, never called by the battle) and its strong and weak marks;
    - the aftermath, drawn from the round's result;
    - the field's details: the "New" sprout, arrival puffs, coin pops, the storm haze and F3's debug view.
  - **S13:**
    - both Heartcaps;
    - the chips: gold, plots, the round with the clash clock, and the storm;
    - the round tally and the lane tug;
    - the chips' tooltips, computed from the sim's functions;
    - the general's Intent panel, from `ai.plans`.

    Its styles are in `src/ui/rounds/rounds.css`.
- **S14** (`feature/r2a-ui-panels`, T092–T097 and T143, [#95](https://github.com/Swalliso/Sambattler/pull/95)): passed the hub's review. A battle in rounds now plays on the preview from round 1's planning to the report by round. No golden moved. US3 is done.
  - **What it builds:**
    - the tray: prices from `priceOf`, "need N" on a card you can't afford, and tooltips with `matchupClass`'s strong and weak;
    - inspect for buildings and units, from `mergePreview` and `sellValue`;
    - rounds' own callouts, in §10.2's priority order;
    - the pinned planning hint, which in round 9 names who leads on the Decision (`decisionWinner`);
    - the report by round, with Again and Rematch.

    Help and the settings screen sit in the controls and hold a clash and the aftermath while open.
  - **How it was checked:** on the dev build, the title's button opened the preview and a battle played to the report (a Rout in round 7). T135's captures pass §15.6's assertions 1–5.
  - **A small change to Call 14:** choosing a card no longer releases a `phase=planning` or `paused=1` hold, so a capture of the marks can click a card. Every other key or press still releases it.
  - **For S20 (T138):** Help in the preview is v1's. It's read from a v1 rules-only battle, the way the title's Help builds it. That's the one place a `rounds/` file uses v1's `BattleState`, so T138's line in `.claude/rules/v1-code.md` keeps it as an exception until R2b rewrites Help.
- **S14b** (`feature/r2a-rough-playtest`, T145, T146, [#97](https://github.com/Swalliso/Sambattler/pull/97)): docs only. Your rough playtest, written down in [playtest-feedback.md](playtest-feedback.md#2026-11-02-r2as-rough-playtest-a-battle-in-rounds-the-user). The core loop works and nothing needs a dramatic change. The grid stays as it is, SPEC §18.2 #67 asks what a full colony's gold does, S18 may bring a pace retune beside the bands (T124, T125), and R3's S0 reads your note on builds and synergies.
- **S15** (`feature/r2a-counters`, T098–T103, [#99](https://github.com/Swalliso/Sambattler/pull/99)): merged after the hub's review.
  - **The counter cycle in rounds** (`src/sim/rounds/ai/counter.ts`). At rounds 4 and 7, and a boss's also at 3, the general reads what you fielded. It weights its answer ×3, adds a missing answer and sells for room. The Intent panel shows "Countering SWARM" and "New: …", and an adaptive smoke runs in verify.
  - **X8's readouts, with your side added after the rough playtest.** Over 40 seeds with `bot:balanced` against Mold and the Baron:
    - your colony is full from round 5 or 6, and you then bank a median of 582 (Mold) or 542 (the Baron) gold a round;
    - once both colonies are full, about half the clashes replay the last one exactly (52 of 105 against Mold, 77 of 141 against the Baron).

    That's your playtest's empty late rounds, in numbers.
  - **The general's win rate** against `bot:balanced`: 70% as Mold (68% with the cycle off), and 53% as the Baron (60% off). S18's G8 reads the cycle's effect.
  - **Goldens:** X8's two knobs ship off. The round golden moved only because the rounds library hashes the two new keys, and v1's goldens didn't move.
  - **For you:** Gill Archers read as Swarm and as Ranged equally (1.0 each), so the ±0.03 noise picks between them about half the time. #14's tie order (Ranged first) decides only without noise. Two possible fixes are in [balance-backlog.md](balance-backlog.md), each a rule change that waits for your OK.
  - **Readings where SPEC is silent,** for S20's As built:
    - counter sets hold spawners only, as in v1;
    - an added missing answer weighs 1;
    - when a set has cards but none beats the dominant armor, the missing answer is the set's cheapest;
    - `AiPlan.counter` is set in the activation round only;
    - X8's knobs act only for a general that runs the cycle, and replace-when-full acts once a turn, for the heaviest card it can afford.
- **S16** (`feature/r2a-powers`, T104–T111, [#98](https://github.com/Swalliso/Sambattler/pull/98)): merged after the hub's review.
  - **The power at most once per clash** (`src/sim/rounds/powers.ts`). It fires from the muster's first tick, and is refused in planning, in the aftermath and at a lane whose clash has ended. Rhizome Tithe is refused until R2b.
  - **Its controls:** Ready, Aiming, Used this clash. It also has two smokes and two replays.
  - **R2-Q7:** Puppet Bloom finds a median of 0 trios after the muster for Cordis's starter kit, with at least one in 8–9% of clashes, over 40 seeds against Mold and the Baron. So R2b's S0 gives Bloom a v2 job, with your OK.
  - **Its calls,** for S20's As built:
    - the power replays use the commander's starter kit (`starter: true` in `ROUND_REPLAYS`), since with the faction roster Cordis's Bloom never fires on seed 3;
    - the tooltip is worded from the power's numbers, since the data's text is v1's, which R2b rewords.
  - **Merging with S15:** the joint check found four conflicts, each two additions in one place, in `battleView.ts`, `tools/lib/rounds/run.ts`, `tools/sim.ts` and `tools/verify.ts`. It also found the two power replays' hashes moved by S15's keys, with the battles unchanged. S16 merged `develop`, kept both sides and refreshed its replays to the hashes the hub computed.
- **S17** (`feature/r2a-tools`, T148, T112–T118, [#102](https://github.com/Swalliso/Sambattler/pull/102)): passed the hub's review, and lands when CI passes.
  - **The tools in round form:**
    - two round replays, Twin Roots and the merge mirror;
    - G11's round budgets as a slow test;
    - the round bench, `npm run bench -- --rounds`, whose quick run is in verify;
    - Chromium's frame checks;
    - `npm run balance -- --rounds` and `npm run experiment -- --rounds` (`duels` and `g4`), which play in worker threads with the same results as in process.

    Nothing in `src/` or the balance data changed.
  - **The bench is inside §13.7** on this machine, with each budget in brackets:
    - the arrival at 0.26 ms (5 ms);
    - the general's turn at 0.43 ms at most (20 ms);
    - one battle at 39 ms (3 s);
    - the tick at 300 live units at a mean of 0.40 ms and a p99 of 0.91 ms (1.0 and 2.5 ms);
    - a plant in Chromium at 1.0 ms at most (4 ms);
    - a render frame at 3.4 ms at most (8 ms).
  - **The first G4 reading in rounds**, with `bot:balanced` against the scripted general over 40 battles:
    - a median of 9 rounds, against G4's 6–8;
    - 73% reaching round 9, against a limit of 15%;
    - the bot winning 60%;
    - 8% of clashes reaching the cap;
    - a median clash of 17.5 s, under G13's 20–40 s.

    These are the same battles as S10b's, and nothing was tuned. S18 and T125 take it from here.
  - **For you (T148):** a mirror of Bursters is decided by seat.
    - Whichever side's ids come first bursts first, fells the other's Bursters before they burst, and wins the lane 4–0. In rounds that's the player's side.
    - In `playRoundClash`'s mirrors that include Bursters, the player wins 13 to 6.
    - The lever is to let a unit felled by a burst still attack that tick. That's a rule change, so it waits for your OK. Until then the case is an `it.fails`.
  - **Departures, for S20's As built:**
    - the clash's first fighting tick runs cold in Chromium, 4.8–11.4 ms once per page load, so the frame check reads the frames after it. A warm-up in `src/app/rounds/main.ts` would fix it, a job for S20;
    - the Chromium checks hold statistics that a single slow frame can't decide: the p95 frame, as SPEC §16's Milestone 8 words the budget, and the median of five plants. CI's shared runner failed one run on single-frame spikes (a 4.5 ms plant, and a 12.4 ms frame with the median at 1.4 ms), and the budgets themselves stay as they are;
    - Twin Roots' full colony is 120 units a side, not 128, since one front-rank plot on each side is a stump;
    - supply duels end at the 45 s clash cap.
- **S19** (`feature/r2a-measures`, T126–T128, [#101](https://github.com/Swalliso/Sambattler/pull/101)): merged. It changed only the app's views and the report, so it needed no review.
  - **The "last fielded" view:** with `reveal=last`, from round 2 on, the general's colony and squads are drawn as it fielded them last round. The view is worked out from Call 12's records, and the general's new buildings appear at Begin. It's view only, and the Intent panel says "Changes show at Begin", so it doesn't spoil the A/B.
  - **The play clock:** the report shows the planning seconds of each round, their median and the minutes of active play (`src/app/rounds/playTime.ts`). It never saves.
  - **Gaps for S20 or S21, none blocking the A/B:**
    - clicking a plot with a hidden building still opens its details;
    - a sold building that's drawn again can't be inspected;
    - the empty-lane warning reads the live formation;
    - `tools/screenshot.ts`'s assertion 4 would fail a `reveal=last` capture from round 2.
- **What R2a starts from:** R1's chosen set as default data (all of `kept`, the arrival shield, Capguard Hall's squad at 3, the Elder's splash on); X5's cap and Decision by share; no copies before R3 (D45); the Anti-Ranged kind and the three fixes to the counter sets (§7.4); and eliteShare by Elder parts.
- **For R2a to watch** (R1, and the readings of S1 and S7b):
  - Capguard Hall at 3 still won 92% at 300 gold and 2% at 1,500;
  - `pinned` alone weakened the answers to the Sporeling and the Capguard;
  - v1's G2 newly failed on the Gill Archer under `kept`;
  - no scoring rule brought R1's race model inside G4's band;
  - at `tierRadiusMult` 1.0 (S1), R1's chosen set fails G3 on the Sporeling's worst field in R1's tool: 62% on Twin Roots against a 60% bar, where 1.25 passed. Nothing changed for it; S17 and S18 read G3 in rounds;
  - a Burster's strike lands at once inside the attack step, so it may fell a later unit before that unit attacks (S7b). S17's T148 measured it: a mirror of Bursters is decided by seat (above).
- **Open for you in R2a:**
  - the battle-level bands at S18 (T125), with a pace retune beside them if G4 misses;
  - S15's Gill Archer tie: one of two fixes in [balance-backlog.md](balance-backlog.md), or neither;
  - S17's Burster seat effect (T148): a unit felled by a burst still attacks that tick, or no change;
  - the playtest gate at S21 (T137, T139).

## R1, the clash check: done (2026-11-02)

- **Its sessions,** from [docs/tasks/r1-clash-check.md](tasks/r1-clash-check.md):
  - **S1** (`feature/r1-formation`, T003–T006): merged ([#46](https://github.com/Swalliso/Sambattler/pull/46)). `src/sim/formation.ts` holds the slot layout (`formationBox`, `slotPositions`, `emplacementPosition`, `overflows`, `slotGrid`) and the muster's knitting (`findTrios`, `musterKnits`), as pure functions that R2 reuses. A test checks that the muster agrees with the sim's merging;
  - **S2** (`feature/r1-armies`, T007–T012): merged ([#45](https://github.com/Swalliso/Sambattler/pull/45)). The two tool-only switches (`noBuildingPreference`, `idleSeek`, in `config.test`) and the army builder in `tools/lib/clash.ts`;
  - **S3** (`feature/r1-clash-runner`, T013–T019): merged ([#50](https://github.com/Swalliso/Sambattler/pull/50)). `tools/lib/clash.ts` plays one clash: the fields (`clashField`), formation by role (`lineOf`, `assignSlots`), the arrival (`placeArmy`), the muster, §6.7's lane ends and scoring in both cap readings, R1-Q3's winner, and the record (`playClash`). `npm run experiment -- --checks clash --pair a,b` plays one matchup;
  - **S4** (`feature/r1-clash-bars`, T053, T020–T024): merged ([#54](https://github.com/Swalliso/Sambattler/pull/54)).
    - T053 makes the muster's ties exact, so a colony musters the same from both seats. S3 had found 15 of 310 armies mustering differently by seat, mono Sporeling among them.
    - The clash jobs run on the worker pool, and each distinct clash plays once (`clashCache`).
    - `npm run experiment -- --checks clash` plays clash G3, the strict counter matrix (G12) with the clash matrix for #14 and #15, and G13, each per budget beside the pooled result.
    - A clash takes about 3.3 ms, since `playClash` no longer hashes its final state. Verify green, no golden moved.
- **S5 and S6** ran side by side after S4:
  - S5 (`feature/r1-variants`, T054, T055, T025–T031): merged ([#60](https://github.com/Swalliso/Sambattler/pull/60)). First the fixes from S4's review: clash G3 plays every mono, so G12 counts no untested one; #15's line counts the answers tied for the best; G13 counts only the counted fields; and the guards. Then the presets `kept`, `noeldersplash`, `clashpace` and `clashshield`, and every variant option of `--checks clash`: squads, copies, the core-six check, the merge mirror, extra plots, the lanes rule and the v1 switches, with §11.4's squad table. Verify green, no golden moved;
  - S6 (`feature/r1-race-bench`, T032–T039): merged ([#59](https://github.com/Swalliso/Sambattler/pull/59)). Verify green, no golden moved.
    - `tools/lib/roundRace.ts` is the race model for X5. `--checks clash` now plays the G4 row (`--g4seeds`, default 50) and prints after G13 the cap-binding and drawn shares, then the race over the G4 case and G3's, the full colony and the overflow table.
    - `--checks pairings` is battle 1's pairing table (R2-Q13), and `npm run bench` times the full-colony clash, report only. Twin Roots' full colony fields 192 units a side, over §13.7's 150; the one-lane field's 144 fits.
    - It also fixed S4's `clashCache` count of a clash played for a slim record and then a full one.

- **S7** (`feature/r1-results`, T040–T048, T052): merged ([#65](https://github.com/Swalliso/Sambattler/pull/65)). 65 runs in about 93 minutes on 6 workers, against the plan's 8–12 hours, since a clash takes about 4 ms. No rule or data changed, and no golden hash moved; `npm run test:slow` gives the same v1 verdicts as before R1. The results and a recommendation for each call are R1's entry in [docs/balance-backlog.md](balance-backlog.md#r1--the-clash-check-2026-11-02).
  - **In short:** in a clash the muster's knitting favours mono armies. On today's combat four monos fail clash G3 (Capguard Hall 90%, Sporeling Burrow 79%, Gill Nest 75%, Veilstalker Hollow 64%), and the Sporeling and the Capguard have no answer (G12). G13 passes.
  - `kept` still fails (Capguard Hall 90%, Sporeling 62%, Rootbreaker Den on Twin Roots). No preset set passes. `kept,clashshield` with Capguard Hall's squad at 3 passes G3, G12 and G13 at 50 seeds, the only set that does.
  - Twin Roots' full colony fields 192 units a side, over §13.7's 150 (S6's finding), yet ticks inside G11; the one-lane colony's 144 fits.
  - The recommendations: Capguard Hall's squad at 3 (#7), adopt the arrival shield (#8), keep the splash (#9), agree on #10–#13, add an Anti-Ranged kind (#14), keep type-and-tag sets (#15), no copies before R3 (X4), the X5 lean with G4's band measured in R2a (X5), the Burster Pod (#36), count Elder parts for eliteShare (R2-Q3), and a v2 job for Puppet Bloom (R2-Q7).
- **What R2a takes from R1:** `formation.ts`'s layout and muster (`formationBox`, `slotPositions`, `emplacementPosition`, `overflows`, `findTrios`, `musterKnits`); `tools/lib/clash.ts`'s army builder and slot assignment (`armyFromBot`, `lineOf`, `assignSlots`) for its `playRoundClash`; the pool's clash jobs; the knobs' outcomes, agreed at S8 (`kept` and `clashshield` adopted as data; `noeldersplash`, `clashpace` and `swarmread` deleted); and the bench's full-colony case, report-only until R2 adds it to G11.
- **S8, R1's review gate** (`feature/r1-gate`, T049, T050, [#66](https://github.com/Swalliso/Sambattler/pull/66)): on 2026-11-02 you read R1's report and took every recommendation. Each call is dated in [clarify.md](tasks/clarify.md) and written into SPEC:
  - #7: squads per building, §11.2's column with Capguard Hall at 3. The full colony stays at most 150 live units a side, and in rounds an upgrade adds no unit per batch, so Twin Roots' full colony fields 128;
  - #8: the arrival shield, v2's rule under its own key (§5.3). #9: the Elder keeps its splash;
  - #10–#13: SPEC's first guesses, with A029's body rules for emplacements (§6.7);
  - #14: an Anti-Ranged kind, which bites once R2-Q3 counts Elder parts. #15: type-and-tag counter sets with three fixes (§7.4);
  - X4: no copies before R3, so D45 stays. X5: a cap of 25% of the loser's max HP and a Decision by share (§6.5, §6.7), with G4's band measured in R2a;
  - #36's reading: the Burster Pod, with the call at R3's plan; and each knob's outcome (§16 R2).
  - For R2a to watch: Capguard Hall at 3 still wins 92% at 300 gold and 2% at 1,500; the shield carries G3 as well as G12; and no scoring rule brought battles inside G4's band in the race model.
- **R1's calls, agreed 2026-11-01:** every recommendation. They're dated in [clarify.md](tasks/clarify.md) and written into SPEC §16 R1 and §12.2.
  - R1-Q1, where squads stand: §7.3's tags set the line, files fill centre-out, and on Twin Roots each building goes to the lane with fewer of its line.
  - R1-Q2, spending: economy and utility cards are filtered out, a pick that doesn't fit is skipped, and each army has its own stream.
  - R1-Q3, a clash win: more lanes, then more uncapped damage, else a draw worth half. Numbers are quoted at jitter ±0.2.
  - R1-Q4, plots: the base plots at every budget, plus a late-run reading with 4 more at 1,200 and 1,500 gold.
  - R1-Q5, the full colony: §13.7's budget is now at most 150 live units a side at the arrival, not about 100 supply. The bench case is the true worst case, report-only until R2.
  - R1-Q6, the sixth archetype: a core-six check per candidate, and G3 twice for the variants that append spawners.
  - R1-Q7 and R1-Q8: the tool-only flags `noBuildingPreference` and `idleSeek`, on in the check and absent in every battle.
  - R1-Q9: a three-lane screen, outside the bars.
  - For later calls, R1 also records eliteShare by parts' base supply (R2-Q3), measures copies at 2, 3 and 4 (X4), and builds the race model (X5). Those calls stay open.
- **Alongside R1:**
  - **R4a, the shape language on the field** (X3, agreed 2026-11-01).
    - **Its plan,** [docs/r4a-plan.md](r4a-plan.md), was agreed on 2026-11-01 (R4a-S0). Every recommendation was taken but two: only Elders get a rim (R4-Q3), and the merged radius goes ×1.0, which R2a writes (#53).
    - **R4a-S1** (`feature/r4a-unit-drawer`, R4/T008–T016): merged ([#47](https://github.com/Swalliso/Sambattler/pull/47)). One unit drawer, `src/render/unitSprite.ts`, for v1's renderer and R2a's views. `TIER_SCALE` is gone, so merged units keep their body. `i-pip` marks the tier on the field and in the inspect panel, and Elders get a gold rim. It also adds the `unit-lineup` and `unit-lineup-twin` scenarios.
    - **R4a-S2** (`feature/r4a-shape-checks`, R4/T017–T023): merged ([#49](https://github.com/Swalliso/Sambattler/pull/49)). A sprite's `shape` block and a sheet's `bands` in the schema, the pure checks in `src/data/shapes.ts`, which the registry runs on every sprite with a shape, and `npm run sprite-sheet`, which renders a sheet with its measurements, squad strips and problems. Its mark glyphs went in S2b.
    - **R4a-S2b** (`feature/r4a-silhouettes`, R4/T024–T026, T077): merged ([#55](https://github.com/Swalliso/Sambattler/pull/55)).
      - **No weapon marks on units** (the user, 2026-11-01, at the sheet's review; SPEC §5.8): no unit or emplacement carries one, now or later. `data/sprites/marks.json` and the shape block's mark fields are gone, and a block that names a mark fails to load. A unit's damage type shows in its silhouette, the hit sparks, the matchup marks on cards and the planning screen, and the inspect panel.
      - **The silhouette sheet,** `docs/r4a-silhouettes.json`, was redrawn without marks and **approved by the user as drawn** (T026). The record is in [r4a-plan.md](r4a-plan.md#the-approved-silhouette-sheet-t026-2026-11-01).
      - Verify green, no golden moved.
    - **R4a-S3** (`feature/r4a-core-sprites`, R4/T027–T029): merged ([#58](https://github.com/Swalliso/Sambattler/pull/58)). The core six (the Sporeling, Capguard, Gill Archer, Amanita Knight, Hammercap and Burster) are redrawn from the approved sheet, three frames each, with shape blocks, and `units.json` has the bands. `e-puffballMortar` is the Mortar's emplacement, and the registry requires one for every tower with an attack; `emplacementSprite()` finds it. Verify green, no golden moved.
    - **R4a-S4** (`feature/r4a-roster-sprites`, R4/T030–T032): merged ([#62](https://github.com/Swalliso/Sambattler/pull/62)). The other seven (the Tender, Veilstalker, Scythecap, Morel Runner, Rootbreaker, Rhizomorph and Driftling) are redrawn from the approved sheet, three frames each, with shape blocks. The registry now requires a shape on every unit sprite. `tests/unit/shapes.test.ts` holds the whole roster to T030's rules: no two silhouettes alike, and every frame's width within its squad at base + 1. R1 hasn't proposed squad sizes yet, so that bound uses today's spawn-derived ones. The sheet is deleted; the approved version stays at `dbd7f09:docs/r4a-silhouettes.json`. Verify green, no golden moved.
    - **R4a-S5** (`feature/r4a-contrast`, R4/T033–T038): merged ([#63](https://github.com/Swalliso/Sambattler/pull/63)). The Gray Rot's bodies are now a light bone (`#b0bcab`, `#eaf0e2`, `#808b7c`), and `tests/unit/contrast.test.ts` holds SPEC §2's three cases: under both colour filters the sides differ by 1.51–2.13:1 (v1's ash: 1.00–1.10:1), and both stand off the soil and the outline. It also ran R4a's verification and wrote the plan's [As built](r4a-plan.md#as-built), with #52's first reading on Twin Roots. Verify green, no golden moved.
    - **R4a's review gate** (R4/T039) passed on 2026-11-02. You're okay with the Amanita Knight's cap staying red on both sides, and with how the sprites read under the colour-blind filters ([r4a-plan.md](r4a-plan.md#as-built)). **R4a is done.**
    - **R2a's playtest runs on these sprites** (R2a/T137).
  - **Run it back** ([run-it-back.md](tasks/run-it-back.md)): X10 was agreed on 2026-11-01, and records S0 agreed its plan, [run-it-back-plan.md](run-it-back-plan.md), with RB-Q1 and RB-Q2 as recommended ([#44](https://github.com/Swalliso/Sambattler/pull/44)). records-1 builds only the remembered setup and Run it back, and records no runs, so no v1 run is ever recorded. Run records start in records-2, after R2b.
    - **records S1** (`feature/records-1-run-it-back`, T003–T012): merged ([#48](https://github.com/Swalliso/Sambattler/pull/48)). The profile store, `src/meta/records.ts`, keeps the last setup under `spore-sprawl/profile/v1`, and every write goes through `updateRecords()`. On the summary, Run it back (`Enter` or `R`) starts the same commander and bans on a new seed, straight on the route.
    - **records S2** (`feature/records-1-setup`, T013–T014, T020–T022): merged ([#51](https://github.com/Swalliso/Sambattler/pull/51)). The Underroot opens on the setup last begun, after a reload too, and both Begin run and Run it back remember it. Seeded, test and prototype pages neither read nor write the profile. Verify green, 94 browser tests pass, no golden moved, and the `rb/summary` and `rb/underroot` screenshots pass. records-1 is built: see the plan's [As built](run-it-back-plan.md#as-built).
    - **Your check on the dev site** (T023) passed on 2026-11-01: you finished a run, pressed Run it back, then reloaded and chose New run, and "it worked" ([playtest-feedback.md](playtest-feedback.md#2026-11-01-records-1s-check-on-the-dev-site-the-user)). records-1 is done.
    - **Next: records-2,** after R2b (S3, `feature/records-2-base`).

  These touch different files.
- **No rule changes in R1:** it changed no rule or data, so no golden hash moved. R2a S1 writes R1's set as default data.
- **R1's results are in** [docs/balance-backlog.md](balance-backlog.md), v2's backlog, and its review gate (S8) settled the calls R2a needed.

## Waiting on the user

1. **R2a's next calls:**
   - #35's battle-level bands at S18 (T125), with a pace retune beside them if G4 misses. S17's first G4 reading in rounds had a median of 9 rounds, and 73% of battles reaching round 9. Each lever is a retune that waits for your OK.
   - Then the playtest gate at S21.
   - S15's Gill Archer tie and S17's Burster seat effect (T148) also wait for you. Each fix is a rule change, and they're in [balance-backlog.md](balance-backlog.md).

   S18 runs up to T125 once S17 lands. R2a's plan and its 26 calls were settled at S0 on 2026-11-02.
2. **The decisions that shape the milestones**, X1–X10 in [clarify.md](tasks/clarify.md#index). Each has a recommendation. The task lists assume them and say what changes otherwise.
   - X1 and X2 were decided on 2026-11-02. R2 splits into R2a and R2b, and R2a is built beside v1 on `develop`. You also said `develop` may switch wholly to v2 from now on, so R2b's switch-over needn't go through `feature/r2b-cutover`. Verify still stays green on every PR, since a failing `develop` blocks every deploy. X3 (split R4, the field's shapes first) and X10 (Run it back in two parts) were agreed on 2026-11-01.
   - X4 and X5 were decided at R1's review gate on 2026-11-02: no copies before R3, and a cap of 25% of the loser's max HP with a Decision by share.
   - X6, X7 and X8 were decided at R2a S0 on 2026-11-02: measure the run's length first, add the answer bot, and measure the general before changing §7.2.
   - Later: X9 (flyers out of the first release).
3. **The six core archetypes** are a first cut the user wants to discuss further. The sixth slot is open: the Burster Pod, or the Puffball Mortar ([§11.2](../SPEC.md#112-velvet-bloom-buildings)). It's §18.2 #36 in clarify.md: R1's reading (2026-11-02) supports the Burster Pod, and the call comes at R3's plan.
4. **The open rules in §18.2** now each have a block in [clarify.md](tasks/clarify.md) with a recommendation, filed under the milestone that needs them. Some recommendations disagree with SPEC's first guess and say why. R2a's rows (#19, #22, #23, #25, #29–#31 and #34) were settled at its S0, with #35's approach. R2b's (#16–#18, #20, #21, #24, #26–#28, #32 and #33) wait for R2b S0, #32 among them: what happens to runs saved before R2.
5. **A release to `main`:** only when the user asks.

## Where things live

| What | Where |
|---|---|
| The design: rules, milestones, open questions | [SPEC.md](../SPEC.md) (v2). Start with §0.1 and §1.3 |
| The work: a task list per milestone, and how a session runs | [tasks/](tasks/README.md) |
| The decisions each milestone needs, with recommendations | [tasks/clarify.md](tasks/clarify.md) |
| The review of SPEC v2: problems found, and where each is handled | [tasks/spec-analysis.md](tasks/spec-analysis.md) |
| A milestone's plan and As built | `docs/<milestone>-plan.md`. R1's is [r1-plan.md](r1-plan.md) |
| Human playtest notes | [playtest-feedback.md](playtest-feedback.md), newest first. Older items carry a v2 status |
| v2's balance work | [balance-backlog.md](balance-backlog.md) and `data/CHANGELOG-balance.md` |
| Ideas written against v2 | [ideas/](ideas/README.md) |
| Research on other games | [research/](research/README.md) |
| Everything written for the v1 battle | [archive/](archive/README.md). It's history and evidence, not design input |

## Recent work

| Work | Where | State |
|---|---|---|
| R2a S17 and S19 (2026-11-03) | [#102](https://github.com/Swalliso/Sambattler/pull/102) (the round tools), [#101](https://github.com/Swalliso/Sambattler/pull/101) (the playtest's measures) | #101 merged. #102 passed the hub's review and lands when CI passes. Before that, S17 made its Chromium timing checks hold against CI's single-frame spikes. The hub checked the two together. S18 runs next, up to T125 |
| R2a S14b, S15 and S16 (2026-11-02 and 03) | [#97](https://github.com/Swalliso/Sambattler/pull/97) (your rough playtest), [#99](https://github.com/Swalliso/Sambattler/pull/99) (the counter cycle), [#98](https://github.com/Swalliso/Sambattler/pull/98) (the power once per clash) | Merged. The hub checked #98 and #99 together |
| R2a S14: the tray, inspect, the chrome and the report (2026-11-02) | [#95](https://github.com/Swalliso/Sambattler/pull/95) | Merged after the hub's review. No golden moved. US3 is done, and your rough playtest followed |
| R2a S10b, S12 and S13, side by side (2026-11-02) | [#91](https://github.com/Swalliso/Sambattler/pull/91) (the first round golden, step 3 in rounds), [#93](https://github.com/Swalliso/Sambattler/pull/93) (the field), [#92](https://github.com/Swalliso/Sambattler/pull/92) (the top band and the Intent panel) | Merged after the hub's review and a check of all three together. Only the new golden was added. Step 3 misses its pace (a median of 9 rounds). S14 runs next, then your rough playtest |
| R2a S9b and S11, side by side (2026-11-02) | [#88](https://github.com/Swalliso/Sambattler/pull/88) (clash timers on the clash's clock), [#89](https://github.com/Swalliso/Sambattler/pull/89) (the `scene=rounds` preview) | Merged after the hub's review. #89's CI ran before #88 landed, so the hub checked the two together locally. No golden moved. S10b, S12 and S13 run next, side by side |
| R2a S9 and S10a, side by side (2026-11-02) | [#85](https://github.com/Swalliso/Sambattler/pull/85) (`runHeadless`, `sim --rounds`, round replays), [#86](https://github.com/Swalliso/Sambattler/pull/86) (`src/sim/rounds/ai/`) | Merged after the hub's review and a check of both together. No golden moved. S9 found T149, so S9b runs next beside S11 |
| R2a S8: opening a round, the economy and stats per round (2026-11-02) | [#84](https://github.com/Swalliso/Sambattler/pull/84), `src/sim/rounds/round.ts`, `systems/economy.ts`, `stats.ts`, `summary.ts` | Merged after the hub's review. No golden moved |
| R2a S7b: no seat decides a clash (2026-11-02) | [#82](https://github.com/Swalliso/Sambattler/pull/82), `src/sim/rounds/systems/movement.ts`, `tests/unit/rounds/seats.test.ts`, SPEC §5.2 | Merged on your OK. Mirror-image clashes no longer depend on which side's ids come first. S8 is next |
| R2a S7: scoring, the end of a battle and the rule scenarios (2026-11-02) | [#81](https://github.com/Swalliso/Sambattler/pull/81), `src/sim/rounds/systems/victory.ts`, `round.ts`, `data/scenarios/rounds/` | Merged after the hub's review. US1 is done, and no golden moved |
| R2a S6: Begin, the muster and a lane's end (2026-11-02) | [#80](https://github.com/Swalliso/Sambattler/pull/80), `src/sim/rounds/round.ts`, `systems/clash.ts`, `step.ts`, `src/sim/compile.ts` | Merged after the hub's review. No golden moved |
| R2a S5: the kept combat copied into rounds, and emplacements (2026-11-02) | [#78](https://github.com/Swalliso/Sambattler/pull/78), `src/sim/rounds/systems/`, `world.ts`, `targets.ts`, `tests/unit/rounds/combat.test.ts` | Merged after the hub's review. No golden moved, and no bug found in a kept rule. S6 is next |
| R2a S4: the planning commands, the kit and the formation on state (2026-11-02) | [#76](https://github.com/Swalliso/Sambattler/pull/76), `src/sim/rounds/planning.ts`, `kit.ts`, `formation.ts` | Merged after the hub's review. No golden moved. Phase 2 is done, and S5 is next |
| R2a S3b: `createBattle`, the step by phase and round scenarios (2026-11-02) | [#74](https://github.com/Swalliso/Sambattler/pull/74), `src/sim/rounds/create.ts`, `commands.ts`, `step.ts`, `snapshot.ts`, `tests/roundHelpers.ts` | Merged after the hub's review. No golden moved. S4 is next |
| R2a S3a: the round types, compile and the modifier DSL (2026-11-02) | [#72](https://github.com/Swalliso/Sambattler/pull/72), `src/sim/rounds/state.ts`, `compile.ts`, `effects.ts`, `src/data/schema.ts` | Merged after the hub's review. No golden moved. S3b is next |
| R2a S1: the rounds data, and R1's set as default data (2026-11-02) | [#70](https://github.com/Swalliso/Sambattler/pull/70), `data/balance.json`, `src/data/schema.ts`, `src/sim/compile.ts`, `data/CHANGELOG-balance.md`, [balance-backlog.md](balance-backlog.md) | Merged after the hub's review. v1's goldens moved once, and the tray holds 16 cards. At `tierRadiusMult` 1.0 the Sporeling misses clash G3 on Twin Roots (62%), for S17 and S18 to read in rounds |
| R2a S2: the colony and the formation's pure core (2026-11-02) | [#69](https://github.com/Swalliso/Sambattler/pull/69), `src/sim/rounds/colony.ts`, `src/sim/rounds/formation.ts`, the maps' `colony` blocks | Merged after the hub's review. No golden moved. S3a is next |
| R2a S0: R2a's plan and its calls (2026-11-02) | [#67](https://github.com/Swalliso/Sambattler/pull/67), [r2a-plan.md](r2a-plan.md), [clarify.md](tasks/clarify.md) (26 calls), SPEC, [r2a-battle-in-rounds.md](tasks/r2a-battle-in-rounds.md) | Merged. Plan agreed, every recommendation taken |
| R1 S8: R1's review gate (2026-11-02) | [#66](https://github.com/Swalliso/Sambattler/pull/66), [clarify.md](tasks/clarify.md) #7–#15, X4, X5 and #36, SPEC §4.6, §5.2, §5.3, §5.6, §6.5, §6.7, §7.4, §11.2, §11.6, §13.7, §16 R2 and §18.2 | Merged. Every recommendation taken. R1 is done |
| R1 S7: R1's runs and write-up (2026-11-02) | [#65](https://github.com/Swalliso/Sambattler/pull/65), [balance-backlog.md](balance-backlog.md#r1--the-clash-check-2026-11-02), [r1-plan.md](r1-plan.md#as-built) | Merged. In 65 runs four monos beat `bot:balanced`, and `kept` with the arrival shield and Capguard Hall at 3 is the only set that passes every bar |
| R4a's review gate passed, and X1 and X2 decided (2026-11-02) | [#64](https://github.com/Swalliso/Sambattler/pull/64), [r4a-plan.md](r4a-plan.md#as-built), [clarify.md](tasks/clarify.md) X1 and X2 | Done. R4a is finished. R2 splits into R2a and R2b, R2a goes beside v1, and `develop` may switch wholly to v2 |
| R4a-S5: the sides' contrast, and R4a's verification (2026-11-02) | [#63](https://github.com/Swalliso/Sambattler/pull/63), `tests/unit/contrast.test.ts`, [r4a-plan.md](r4a-plan.md#as-built) | Merged. The Gray Rot is a light bone, and the sides differ by 1.51–2.13:1 under both filters |
| R4a-S4: the other seven redrawn (2026-11-02) | [#62](https://github.com/Swalliso/Sambattler/pull/62), `data/sprites/units.json`, `tests/unit/shapes.test.ts` | Merged. Every unit sprite has a shape, and the draft sheet is deleted |
| R1 S5: the review's fixes, the presets and the variants (2026-11-01) | [#60](https://github.com/Swalliso/Sambattler/pull/60), [tools/lib/balance.ts](../tools/lib/balance.ts), `src/data/proto.ts`, `--checks clash` | Merged. T054 and T055 fixed G12, #15's line and G13, and every variant option is in. S7's runs are next, on your OK |
| R1 S6: the race model, the pairings, the full colony and the bench (2026-11-01) | [#59](https://github.com/Swalliso/Sambattler/pull/59), [tools/lib/roundRace.ts](../tools/lib/roundRace.ts), `--checks pairings`, `npm run bench` | Merged. Twin Roots' full colony fields 192 units a side, over §13.7's 150 (report only, for R1's review gate) |
| R4a-S3: the core six and the Mortar redrawn (2026-11-01) | [#58](https://github.com/Swalliso/Sambattler/pull/58), `data/sprites/units.json`, `data/sprites/buildings.json` | Merged. R4a-S4 redraws the other seven next |
| The hub's review of #54 and #55 (2026-11-01) | SPEC §9.3, §10.2 and §11.5, [r1-clash-check.md](tasks/r1-clash-check.md) T054 and T055, [r4-readable-armies.md](tasks/r4-readable-armies.md) T024 and T062 | Both sound, with minor issues. #55 missed some weapon-mark lines, now fixed. #54's three report fixes go first in R1 S5, and none of them affects the planned runs |
| records-1's check passed (2026-11-01) | [#53](https://github.com/Swalliso/Sambattler/pull/53), [playtest-feedback.md](playtest-feedback.md#2026-11-01-records-1s-check-on-the-dev-site-the-user), [run-it-back.md](tasks/run-it-back.md) T023 | Done. records-1 is finished; records-2 starts after R2b |
| R4a-S2b: the approved silhouette sheet, and no weapon marks (2026-11-01) | [#55](https://github.com/Swalliso/Sambattler/pull/55), [r4a-plan.md](r4a-plan.md#the-approved-silhouette-sheet-t026-2026-11-01), `docs/r4a-silhouettes.json`, SPEC §5.8 | Merged. You approved the sheet (T026) and dropped weapon marks from units (T077). R4a-S3 redraws the core six next |
| R1 S4: the muster's exact ties, and the clash bars (2026-11-01) | [#54](https://github.com/Swalliso/Sambattler/pull/54), [tools/lib/balance.ts](../tools/lib/balance.ts), `tools/lib/pool.ts`, `--checks clash` | Merged. Clash G3, G12 and G13 run on the worker pool, and a colony musters the same from both seats. S5 and S6 are next |
| R2a's rough playtest added (2026-11-01) | [#52](https://github.com/Swalliso/Sambattler/pull/52), [r2a-battle-in-rounds.md](tasks/r2a-battle-in-rounds.md) S14b (T145, T146), [clarify.md](tasks/clarify.md) R2-Q25, SPEC §16 R2 step 10 | Merged. After S14 you play a battle in rounds, before S15 and S16 start. S21 stays the gate |
| records-1 S2: the remembered setup (2026-11-01) | [#51](https://github.com/Swalliso/Sambattler/pull/51), `src/app/main.ts` | Merged. records-1 is built |
| R1 S3: one clash recorded (2026-11-01) | [#50](https://github.com/Swalliso/Sambattler/pull/50), [tools/lib/clash.ts](../tools/lib/clash.ts), `--checks clash --pair` | Merged. It found T053, the muster's seat-dependent ties, which S4 fixed |
| R4a-S2: the shape checks (2026-11-01) | [#49](https://github.com/Swalliso/Sambattler/pull/49), `src/data/shapes.ts`, `data/sprites/marks.json`, `npm run sprite-sheet` | Merged. Its mark glyphs were retired in #55 |
| records-1 S1: the profile store and Run it back (2026-11-01) | [#48](https://github.com/Swalliso/Sambattler/pull/48), `src/meta/records.ts` | Merged |
| R4a-S1: one unit drawer, pips and the Elder rim (2026-11-01) | [#47](https://github.com/Swalliso/Sambattler/pull/47), [src/render/unitSprite.ts](../src/render/unitSprite.ts), `compose.ts`, `i-pip`, the lineups | Merged. Merged units keep their size |
| R1 S1: the formation and the muster (2026-11-01) | [#46](https://github.com/Swalliso/Sambattler/pull/46), [src/sim/formation.ts](../src/sim/formation.ts) | Merged |
| R1 S2: the switches and the army builder (2026-11-01) | [#45](https://github.com/Swalliso/Sambattler/pull/45), `src/sim/systems/targeting.ts`, `movement.ts`, [tools/lib/clash.ts](../tools/lib/clash.ts) | Merged |
| Run it back plan agreed (2026-11-01) | [#44](https://github.com/Swalliso/Sambattler/pull/44), [run-it-back-plan.md](run-it-back-plan.md), [clarify.md](tasks/clarify.md) (X10, RB-Q1, RB-Q2), SPEC §9.7, §13.8 and §16 M6 | Merged. Recommendations taken; records-1 records no runs, so run recording moved into records-2 |
| R4a plan agreed (2026-11-01) | [#43](https://github.com/Swalliso/Sambattler/pull/43), [r4a-plan.md](r4a-plan.md), [clarify.md](tasks/clarify.md) (X3, R4-Q1 to R4-Q5, #52, #53, #55) and SPEC | Merged. Every recommendation taken but two: only Elders get a rim, and the merged radius goes ×1.0 in R2a |
| R1 plan agreed (2026-11-01) | [#42](https://github.com/Swalliso/Sambattler/pull/42), [r1-plan.md](r1-plan.md), [clarify.md](tasks/clarify.md) (R1-Q1 to R1-Q9), SPEC §16 R1, §12.2 and §13.7 | Merged. Every recommendation taken. The full-colony budget is now 150 live units a side |
| SPEC v2 broken into tasks (2026-11-01) | [tasks/](tasks/README.md), [#40](https://github.com/Swalliso/Sambattler/pull/40) | On `develop`. R1's list is being worked; the rest are refreshed at each milestone's plan |
| Archive of the v1-era notes (2026-10-31) | [archive/](archive/README.md), [research/](research/README.md), the `feature/spec-v2` PR | v1 notes moved, links kept, rules updated so sessions don't pick up v1 as current |
| SPEC v2 (2026-10-31) | [SPEC.md](../SPEC.md), [#39](https://github.com/Swalliso/Sambattler/pull/39) | On `develop`; nothing built |
| P3 playtest (2026-10-31) | [playtest-feedback.md](playtest-feedback.md#2026-10-31-p3-the-combat-rework-the-user) | Done. The notes moved the game to v2 (F17–F22) |
| Pre-playtest UI fixes (2026-10-31) | [#38](https://github.com/Swalliso/Sambattler/pull/38) | On `develop` |

**Before v2:**
- **Archived:** the reviews, the combat rework, rounds as a paper design, flyers, the measurement steps and the prototypes. The [archive's README](archive/README.md) lists them.
- **Still in code and tools:** the tools they built, for engagement, runs, spread, counters and lanes. The rework stays behind `?proto=rework` until R2.

## The rework on the dev site, until R2

- **Play** at https://swalliso.github.io/Sambattler/dev/?proto=rework. Without `?proto=`, the dev site plays like M5.
  - A prototype run saves under its own keys ([#34](https://github.com/Swalliso/Sambattler/pull/34)).
- **What `rework` turns on** (`src/data/proto.ts`):
  - waves on a 20 s beat, with mixed-wave shields;
  - pinning and call for help;
  - the Rhizomorph and the Burster;
  - the Elder Sporeling without splash;
  - storm-grown waves;
  - the general's swarm read;
  - flyers under rule C.
- **Measuring it:** `tools/experiment.ts`'s header documents every option. For example:

  ```bash
  npm run experiment -- --proto rework --checks g3,g4 --g4seeds 200 --workers 8
  ```

  Add `--checks counters` for the strict counter bar, and `path:value` overrides for variants. These measure the v1 battle. Don't tune it unless the user asks; v2's measurements start with R1.

## Starting a session

- Branch from `develop` (CLAUDE.md). Read this page, then SPEC §0.1 and the sections for your milestone.
- Work comes from [docs/tasks/](tasks/README.md): its README says how a session checks its gate, works and ticks its tasks, and finishes.
- `docs/archive/` is history. Don't take rules, numbers or plans from it, or use it as design input, unless the user points you there.
- Rule changes and retunes across several units wait for the user's OK (`.claude/rules/balance.md`).
- Tests follow the spec: when v2 retires a system, its tests, goldens and guardrails go with it (CLAUDE.md).
- When your work lands or the user decides something, update this page.
