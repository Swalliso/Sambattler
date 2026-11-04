# v3 prototype — one battle in rounds, by v3's rules: tasks

The v3 prototype is step C of the plan in `docs/design-brief.md`. It's one battle in rounds, played from a preview link on the dev site (`?scene=battle&rules=v3`), with v3's rules:
- hidden plantings;
- fruiting;
- plots bought with gold;
- four combos;
- merging at ×2.0;
- three generals that rush or greed and read your sprouts.

v2's game stays the default, with its rules and goldens, as R2a was built beside v1 (X2). The switch is temporary, and S10 removes it.

**Status:** Agreed 2026-11-04 (the user's "Start S1"); S1 built T001–T011, S2 T012–T017 · **Concept:** `docs/spec-v3-concept.md` · **Plan:** `docs/v3-proto-plan.md` · **Decisions:** the audit's V3-Q1–V3-Q13 (`docs/spec-v3-audit.md`, section 5, decided 2026-11-04) and the plan's open questions (Plan-Q1–Q4) · **Gate in:** the user has reviewed the concept and answered Plan-Q1

"C3.2" cites the concept's section 3.2. "§" cites SPEC v2.

## Read first

- **Docs:**
  - `docs/design-brief.md`;
  - `docs/spec-v3-concept.md` and `docs/v3-proto-plan.md`, all of them;
  - `docs/spec-v3-audit.md`, sections 3–5;
  - `docs/ideas/reveal-last-fielded.md` (S19's four gaps);
  - `docs/balance-backlog.md`, the "R2b S14" section (merging at 2.0);
  - CLAUDE.md, `.claude/rules/balance.md` and `.claude/rules/v1-code.md`.
- **SPEC v2:**
  - the round and the colony: §4.4, §4.6, §4.7;
  - combat and merging: §5.3, §5.5, §5.6;
  - gold: §6.1, §6.2, §6.7;
  - the general: §7.2–§7.5, §7.7;
  - the screen: §10.2, §10.4;
  - content: §11.2, §11.11, §11.14;
  - tools and checks: §12.2, §12.3 (G16), §13.3, §13.7, §15.2, §15.6.
- **Code:**
  - config: `src/sim/create.ts` (flags and config), `src/sim/state.ts`, `src/sim/compile.ts`, `src/sim/hash.ts`;
  - the round: `src/sim/round.ts`, `src/sim/planning.ts`, `src/sim/commands.ts`, `src/sim/colony.ts`, `src/sim/formation.ts`;
  - effects and systems: `src/sim/effects.ts`, `src/sim/systems/` (`combat.ts`, `targeting.ts`, `economy.ts`, `clash.ts`);
  - the general: `src/sim/ai/` (`view.ts`, `answer.ts`, `controller.ts`, `counter.ts`, `formationScore.ts`, `profiles.ts`);
  - data: `src/data/schema.ts`, `src/data/proto.ts`, `data/balance.json`, `data/generals.json`, `data/bots.json`;
  - the app and screen: `src/app/urlParams.ts`, `src/app/battleView.ts`, `src/app/main.ts`, `src/app/phases/`, `src/render/preview.ts`, `src/render/renderer.ts`, `src/ui/hud/`, `src/ui/doctrine.ts`, `src/ui/inspect.ts`, `src/ui/screens/title.ts`;
  - tools and tests: `tools/experiment.ts`, `tools/golden.ts`, `tools/screenshot.ts`, `tools/lib/params.ts`, `tools/lib/balance.ts`, `tests/browser/reveal.test.ts`.

## Before you start

**Decisions.** v3's decision blocks are in the audit (V3-Q*) and the plan's open questions (Plan-Q*), not in `docs/tasks/clarify.md`.

| Ref | Decision | Blocks |
|---|---|---|
| V3-Q1–V3-Q13 | Taken as recommended, 2026-11-04 ("Take them all") | Everything |
| Plan-Q1 | Fruiting's timing: **decided 2026-11-04, the recommendation** ("Start S1"): every building fruits a round after it's planted, the opener too, and round 1 has no clash. `v3.fruitFromRound` is 1 | S1's default for `v3.fruitFromRound` (T002) |
| Plan-Q2–Q4 | First guesses, which stand (the user, 2026-11-04, "Start S1"): the general's gold at the start of its turn is the tell; the Blightwright is the counter-builder; battle index 1, with the cap and the Heartcaps left to S8's levers | S2 (Q2), S6 (Q3), S8 (Q4) |

**The switch.**
- Every v3 rule runs only when the battle's config says `rules: 'v3'`, and the `v3` block in `data/balance.json` is read only then.
- New state fields are optional and stay undefined under v2.
- It's a temporary switch (CLAUDE.md, "Prototypes"), and S10 removes it. It isn't a `?proto=` preset: `PROTO_PRESETS` stays empty.
- `--proto v3.<key>:<value>` and `?proto=` tune the block as for any data.

**The goldens.**
- v2's seven `tests/golden/r2-*.replay.json` must not move. Every PR checks `git diff --stat origin/develop -- 'tests/golden/r2-*'` is empty.
- A moved `r2-*` hash is a leak to fix, never a golden to refresh.
- v3's own `tests/golden/v3-*.replay.json` move whenever a v3 rule or number changes, and the PR says which and why.

**Review.**
- A PR touching `src/sim/`, `src/data/` or `tools/lib/` waits for the hub's review, and the hub turns on its auto-merge (CLAUDE.md).
- S8's tuning waits for the hub as well.
- Every other PR turns on its own auto-merge.

**Balance.**
- V3-Q9 approved setting the economy's numbers as data, headless, before the playtest. So S8 tunes the `v3` block and the generals' `v3` entries, and logs each change in `data/CHANGELOG-balance.md`.
- Anything outside them, such as v2's data or S14's held numbers, waits for the user (`.claude/rules/balance.md`).

## Technical context

| Rule | Sim | Data | Screen | Tools |
|---|---|---|---|---|
| The switch | `create.ts` (`rules` in the config), `state.ts`, `compile.ts`, `v3.ts` (the rules' tests) | `data/balance.json` (`v3`), `src/data/schema.ts` | `src/app/urlParams.ts` (`rules`), `src/ui/screens/title.ts` | `tools/sim.ts` and `tools/lib/run.ts` (`--rules`), `tools/golden.ts`; `tools/lib/params.ts` mirrors the page's `?rules=` |
| Fruiting | `colony.ts` (the round planted), `formation.ts` (sprouts field nothing), `round.ts` and `systems/clash.ts` (the empty clash) | `v3.fruitFromRound` | `src/render/renderer.ts`, `src/render/preview.ts`, `src/app/phases/` | – |
| Hidden plantings | `ai/view.ts` (the visible colony), `ai/answer.ts`, `planning.ts` (gold at the start of the general's turn) | `v3.hideFromRound` | `src/app/battleView.ts`, `src/app/phases/planning.ts`, `src/ui/hud/explain.ts` | `tools/screenshot.ts` (assertion 4) |
| Plots | `commands.ts` (`buyPlot`), `colony.ts`, `planning.ts`, `ai/controller.ts` | `v3.plotPrices`; plot weights in `data/generals.json` and `data/bots.json` | `src/app/phases/planning.ts`, `src/render/renderer.ts` | – |
| No upgrade | `commands.ts`, `ai/controller.ts` | – | the upgrade button hidden under v3 | – |
| Combos | `combos.ts` (new), `round.ts`, `systems/combat.ts`, `systems/targeting.ts`, `effects.ts`, `systems/economy.ts`, `ai/formationScore.ts` | `v3.combos` | `src/render/preview.ts`, `src/render/renderer.ts`, `src/ui/inspect.ts` | – |
| Merging ×2.0 | `compile.ts` | `v3.tierStatMult` | – | – |
| The generals | `ai/controller.ts`, `ai/counter.ts`, `ai/profiles.ts` | `data/generals.json` (`v3` entries), `data/bots.json` (three bots) | `src/ui/hud/explain.ts`, `src/ui/doctrine.ts` | – |
| The checks | – | – | – | `tools/lib/v3checks.ts` (new), `tools/experiment.ts` |

## Stories

| Story | Priority | What a player or a tool sees | Independent test |
|---|---|---|---|
| US1 | P1 | A v3 battle from a preview link, with fruiting and hidden plantings | On `?scene=battle&rules=v3`, a building planted from `fruitFromRound` shows a sprout and fields a clash later. The general's plantings show only at Begin. `npm run golden` passes with the `r2-*` files unchanged |
| US2 | P2 | Gold buys plots, and no upgrade | A plot bought in planning opens in sprawl's order at its price. `upgrade` is refused under v3 |
| US3 | P2 | Four combos, shown before you place | Hovering a Burster Pod beside another shows the hypha and Chain Burst's icon. In the clash, one burst sets off the other Pod's Bursters |
| US4 | P2 | Three generals that rush or greed, and read your sprouts | Over 30 seeds, each general draws its openers by its odds. The Blightwright plants the answer to your sprouts |
| US5 | P3 | v3's checks pass headless | `npm run experiment -- --rules v3 --checks v3` prints PASS on every line |
| US6 | P3 | The user's playtest judges pillars 1–4 | The answers and the verdict are recorded |

## Phase 1: Setup

- [x] T001 Add `rules: 'v2' | 'v3'` to the battle config, defaulting to v2, read from `?rules=` in `src/app/urlParams.ts` (`BATTLE_PARAMS`) and `--rules` in `tools/sim.ts` (through `tools/lib/run.ts`; `tools/lib/params.ts` mirrors the page's). An unknown value is refused visibly, as `reveal` is (`src/sim/create.ts`, `src/sim/state.ts`; plan Scope). *As built:* the config names `rules` only for v3, so v2's configs are as before. `src/sim/v3.ts` holds the rules' tests (`isV3`, `isSprout`, `isHidden`)
- [x] T002 Add the `v3` block to `data/balance.json`, with its schema in `src/data/schema.ts`. ⛔ Plan-Q1 sets `fruitFromRound`'s default. The block holds:
  - `fruitFromRound`: 1 or 2;
  - `hideFromRound`: 2;
  - `tierStatMult`: 2.0;
  - `plotPrices`: 100, 150, 200, 250;
  - `roster`: the seven building ids;
  - `combos`: on or off for each of the four;
  - V3-Q9's levers, unset until S8 sets them: the Cellar's cost and yield, the round cap, and each Heartcap's HP.

  `--proto v3.<key>:<value>` reaches the block through `src/data/proto.ts` unchanged (C3, C4). *As built:* `fruitFromRound` 1 (Plan-Q1). The levers are `cellar` (`cost`, `goldPerRound`), `roundDamageCap`, `heartcapPlayerHp` and `heartcapEnemyHp`, and each replaces v2's number once set. Only a v3 battle's library carries the block, so v2's state hashes as before
- [x] T003 Under `rules: 'v3'` (`src/sim/compile.ts`, `src/sim/commands.ts`, `src/sim/ai/controller.ts`; C3.3, C3.5, C4):
  - compile the battle's balance with the block's overrides;
  - keep both kits to `v3.roster`;
  - refuse the `upgrade` command;
  - keep the general and the bots from buying upgrades.

## Phase 2: Foundational (blocks every story)

- [x] T004 [P] Unit tests (`tests/unit/v3Rules.test.ts` (new); §13.3):
  - a config without `rules` hashes as before;
  - under v3, `tierStatMult` is 2.0, `upgrade` is refused and the kits hold the roster;
  - `--proto v3.tierStatMult:2.1` applies.
- [x] T005 Teach `tools/golden.ts` a replay's `rules`, and record `tests/golden/v3-mold-bogwater-s1.replay.json` and `tests/golden/v3-baron-twin-s1.replay.json` (new), with `bot:balanced` in the player's seat (§13.3; plan, Goldens)

**Checkpoint:**
- `npm run verify` passes.
- `npm run golden` passes.
- `git diff --stat origin/develop -- 'tests/golden/r2-*'` is empty.

## Phase 3: US1 — Fruiting and hidden plantings (P1)

**Goal:** a v3 battle in which what you plant from `fruitFromRound` fields a clash later, and the general's plantings this round stay hidden until Begin. **Test:** as the Stories table says.

**Tests first:**
- [x] T006 [P] [US1] Unit tests for fruiting (`tests/unit/v3Fruiting.test.ts` (new); C3.2):
  - a building planted in round r ≥ `fruitFromRound` fields from clash r + 1;
  - until then `formationOf` and `mergePreview` leave its slot empty;
  - a building sold and replanted sprouts again;
  - economy pays from the next round's income, as before;
  - with `fruitFromRound` 1, round 1's clash fields nothing and ends on tick 0, a draw with no damage.
- [x] T007 [P] [US1] Unit tests for the hidden view (`tests/unit/v3Hidden.test.ts` (new); C3.1):
  - from `hideFromRound`, the general's plantings this round are missing from the visible colony until Begin;
  - its sales and merge toggles show;
  - the general's gold at the start of its turn is recorded;
  - `bot:answer` plans from the visible colony, not the state.

**Then:**
- [x] T008 [US1] Record the round each building was planted in. Under v3, a sprout's slot stays empty in `formationOf` and `mergePreview` (`src/sim/colony.ts`, `src/sim/formation.ts`; C3.2). *As built:* buildings already recorded `plantedRound`, so only `formation.ts` changed
- [x] T009 [US1] A clash in which neither side fields anything ends on tick 0, as a draw that deals no damage, and the round moves on (`src/sim/round.ts`, `src/sim/systems/clash.ts`; C3.2, Plan-Q1)
- [x] T010 [US1] The visible colony (`src/sim/ai/view.ts`, `src/sim/planning.ts`, `src/sim/ai/answer.ts`; C3.1). *As built:* `visibleColony` in `ai/view.ts`, which `planningView` gives a planner on the player's side; the gold is the plan's `goldAtStart` (`ai/controller.ts`); `answer.ts` needed no change, since it reads the view:
  - a pure function that gives the general's colony as the player may see it, holding back this round's plantings from `hideFromRound` until Begin;
  - the general's gold at the start of its turn, recorded;
  - `bot:answer` reads both.
- [x] T011 [US1] Re-record v3's goldens, and confirm the `r2-*` ones haven't moved (plan, Goldens)

**Checkpoint (S1 ends):** `npm run verify` passes, the goldens hold, and `npm run sim -- --rules v3 --seeds 1..5 --summary` shows sprouts fielding a clash later.

- [x] T012 [P] [US1] Browser tests (`tests/browser/v3.test.ts` (new), from `tests/browser/reveal.test.ts`):
  - from round 2, the general's plantings are neither drawn nor inspectable until Begin, then they appear as sprouts;
  - both sides' sprouts show their timer;
  - the formation preview leaves sprout slots empty.

  *As built:* five browser tests, and `tests/unit/v3View.test.ts` (new) for the pure parts. A human player can't be fast-forwarded to round 2 headlessly, so the inspect check plays from round 1, through the empty clash. The checks without input use `bot:balanced` at round 2 and compare with Node, since any input lets a bot's queued Begin through
- [x] T013 [US1] Draw a sprout with a timer ("fruits next clash") on its plot and in the formation preview, for both sides (`src/render/renderer.ts`, `src/render/preview.ts`; C3.2). *As built:* the timer is "R" and the round whose clash it first fields in ("R3"), beside the sprout glyph. It's drawn on the plot through planning, the clash and the aftermath, and in the sprout's dashed, empty slot in the formation preview. Inspect adds a "Sprout" row ("fields from round 3"; an economy building "pays from") and hides the gold upgrade's button under v3 (C3.3). The bridge's `preview()` gives each building's `fruits`, and its colony follows the battle outside planning
- [x] T014 [US1] Under v3, the planning view draws the general from T010's visible colony and closes S19's four gaps (`src/app/battleView.ts`, `src/app/phases/planning.ts`, `src/ui/hud/explain.ts`, `tools/screenshot.ts`; C3.1, `docs/ideas/reveal-last-fielded.md`):
  - a plot holding a hidden building opens no details;
  - a sold building that's drawn again can be inspected;
  - the empty-lane warning reads the visible formation;
  - `tools/screenshot.ts`'s assertion 4 passes a v3 capture from round 2.

  *As built:* `v3Held` in `src/render/preview.ts` gives the preview `visibleColony`'s colony, in `lastFielded`'s shape, and `heldUntilBegin` holds under v3 in planning from `hideFromRound`. The gaps:
  - a click reads the visible plots (`RoundSession.selectAt`);
  - the second doesn't arise under v3: the general's sales show at once (C3.1), so no sold building is drawn again;
  - `emptyLanes`, now in `src/app/phases/planning.ts`, reads `visibleColony`'s formation. Under the default timing a hidden planting is also a sprout, so the warning only differs under another timing, which the unit test uses;
  - assertion 4 compares with `visibleColony(node, 'enemy').formation`, and v3 captures of round 1, round 2's planning and its clash pass.

  `reveal=last`, which isn't adopted, keeps its four gaps
- [x] T015 [US1] The Intent panel shows the general's gold at the start of its turn and its income rows (Plan-Q2) (`src/ui/hud/explain.ts`, `src/ui/doctrine.ts`; C3.1). *As built:* in planning from `hideFromRound`, the panel reads "gold 154", "income 114" and "Plantings show at Begin", with any sale. Its tip has Gold, Income and "Banked: shows at Begin", since what it banked would give away what it planted. From Begin, it shows what it banked and planted, as v2 does (`src/ui/hud/top.ts`)
- [x] T016 [US1] The preview link (`src/ui/screens/title.ts`, `src/app/main.ts`; plan Scope, §13.8):
  - a title button, on the dev site only, that opens `?scene=battle&rules=v3`;
  - a "v3 prototype" tag on the battle screen;
  - a v3 battle writes no save or record.

  *As built:* the button is "v3 prototype" (`#title-v3`), and the tag (`#v3-tag`) shows on any v3 battle, under the dev badge where there is one. A single battle already saves nothing (§13.8). The tips store remembers the tips shown, as in any battle
- [x] T017 [US1] An empty clash shows no clash or aftermath: Begin goes straight to the next round's planning, with the callout "Both colonies sprout" (`src/app/phases/clash.ts`, `src/app/phases/aftermath.ts`; C3.2). *As built:* `emptyClash` in `src/app/phases/aftermath.ts`. The loop steps through an empty clash's aftermath in the same frame (`src/app/loop.ts`), and the view says the callout as the next round opens and mutes the empty clash's lane news. Under v3, round 1's hint adds "it sprouts, and fields from round 2"

**Checkpoint (S2 ends):** `npm run verify` and `npm run test:browser` pass, and the dev build plays a v3 battle from the title.

## Phase 4: US2 — Plots bought with gold (P2)

**Goal:** gold buys the next closed plot, for every side. **Test:** as the Stories table says.

- [ ] T018 [P] [US2] Unit tests (`tests/unit/v3Plots.test.ts` (new); C3.3):
  - `buyPlot` opens the next closed plot in sprawl's order (§4.6) at `v3.plotPrices[n]`;
  - it's refused when gold is short or the third rank is open, and under v2;
  - the general's purchase is hidden until Begin.
- [ ] T019 [US2] The `buyPlot` command and its price (`src/sim/commands.ts`, `src/sim/colony.ts`, `src/sim/planning.ts`; C3.3, §14.5)
- [ ] T020 [US2] The visible colony holds back the general's plots bought this round (`src/sim/ai/view.ts`; C3.1)
- [ ] T021 [US2] The general and the bots buy plots by a `plot` weight (`src/sim/ai/controller.ts`, `data/generals.json`, `data/bots.json`; C3.3):
  - when their front is full, or their bank passes a threshold;
  - the greedy one early;
  - the rusher only once its front is full.
- [ ] T022 [US2] On the planning screen, a closed plot that's next shows its price and buys on a click (`src/app/phases/planning.ts`, `src/render/renderer.ts`; C3.3)
- [ ] T023 [P] [US2] A browser test: buy a plot, plant on it, and see a sprout (`tests/browser/v3.test.ts`)
- [ ] T024 [US2] Re-record v3's goldens (plan, Goldens)

**Checkpoint (S3 ends):** `npm run verify` and `npm run test:browser` pass.

## Phase 5: US3 — Four combos (P2)

**Goal:** Shield Wall, Spotted Screen, Chain Burst and Truffle Hunters change what squads do, and they show before you place. **Test:** as the Stories table says.

- [ ] T025 [P] [US3] Unit tests (`tests/unit/v3Combos.test.ts` (new); C3.4, §11.14):
  - `combosOf` finds each combo by position (in front of, behind, beside; no corners; never across lanes), among buildings whose spawners have fruited;
  - a squad takes each combo once;
  - Shield Wall's archers aren't pinned;
  - enemy ranged units shoot Spotted Screen's Knights first;
  - Chain Burst sets off your Bursters within 1.5 tiles;
  - Truffle Hunters credits 2 gold for each Sporeling death, as gold from the clash.
- [ ] T026 [US3] `combosOf`, a pure function of the colony like `formationOf`, recorded on the squads at Begin (`src/sim/combos.ts` (new), `src/sim/round.ts`; C3.4)
- [ ] T027 [US3] The four effects (C3.4, §5.3, §6.2):
  - pinning skips Shield Wall's archers (`src/sim/systems/combat.ts`);
  - enemy ranged targeting prefers Spotted Screen's Knights (`src/sim/systems/targeting.ts`);
  - Chain Burst (`src/sim/effects.ts`);
  - Truffle Hunters, on the existing clash-gold path (`src/sim/systems/economy.ts`).
- [ ] T028 [US3] The general's combo term: its placement scores a plot by the combos it would make (`src/sim/ai/formationScore.ts`; §7.3)
- [ ] T029 [US3] Re-record v3's goldens (plan, Goldens)

**Checkpoint (S4 ends):** `npm run verify` passes, and `npm run bench -- --quick --rules v3` stays within budget.

- [ ] T030 [P] [US3] Browser tests (`tests/browser/v3.test.ts`):
  - hovering a card over a plot lights its combo partner and the combo's icon before you place;
  - planted combos draw a hypha with the icon, on both colonies.
- [ ] T031 [US3] The ghost lights the partner and shows the combo's icon and a one-line text, and inspect lists a building's combos (`src/render/preview.ts`, `src/ui/inspect.ts`, `src/ui/tooltip.ts`, `src/ui/icons.ts`; C3.4, §10.4)
- [ ] T032 [US3] Hyphae between linked buildings in planning, for both colonies, the general's drawn from the visible colony (`src/render/renderer.ts`; C3.4)

**Checkpoint (S5 ends):** `npm run verify` and `npm run test:browser` pass.

## Phase 6: US4 — Three generals (P2)

**Goal:** Mold rushes, the Baron greeds and the Blightwright answers your sprouts, each with tells you can read. **Test:** as the Stories table says.

- [ ] T033 [P] [US4] Unit tests (`tests/unit/v3General.test.ts` (new); C3.6, C4):
  - each general draws its rush or greed opener by its odds, from its own stream;
  - the counter cycle counts the player's sprouts;
  - the Blightwright's turn plants the answer to the player's sprouts;
  - the three opener bots plan from the visible colony.
- [ ] T034 [US4] Each general's `v3` entry in `data/generals.json`, with its schema in `src/data/schema.ts`: personality, rush and greed openers, their odds, weights over the roster, and plot weight (C4; Plan-Q3)
- [ ] T035 [US4] The general's turn (`src/sim/ai/controller.ts`, `src/sim/ai/counter.ts`, `src/sim/ai/profiles.ts`; C3.6, V3-Q11, §7.4):
  - the opener drawn by personality;
  - the counter cycle reads sprouts as well as `fielded`;
  - the counter-builder answers your sprouts every round from round 2.
- [ ] T036 [US4] Three opener bots in `data/bots.json`, with `src/sim/ai/answer.ts` for the counter bot (V3-Q9):
  - `bot:v3-rush`, spawners only;
  - `bot:v3-greed`, a Cellar and plots first;
  - `bot:v3-counter`, answering the general's sprouts from the visible colony.
- [ ] T037 [US4] The Intent panel names the general's personality when the battle opens (`src/ui/hud/explain.ts`, `src/ui/doctrine.ts`; C3.6)
- [ ] T038 [US4] Record `tests/golden/v3-blightwright-bogwater-s1.replay.json` (new), and re-record v3's other goldens (plan, Goldens)

**Checkpoint (S6 ends):** `npm run verify` passes, and the goldens hold.

## Phase 7: US5 — v3's checks (P3)

**Goal:** the plan's Verification step 4 runs headless, and passes on the tuned numbers. **Test:** as the Stories table says.

- [ ] T039 [P] [US5] Unit tests for the checks' arithmetic on fixed results: the bands, clashes counted rather than rounds, and the round-6 supply among battles that reach it (`tests/unit/v3Checks.test.ts` (new))
- [ ] T040 [US5] `--checks v3` in `npm run experiment` (`tools/lib/v3checks.ts` (new), `tools/experiment.ts`; plan, Verification step 4):
  - the openers;
  - length;
  - battle 1's bite;
  - a counter in time;
  - the best spot.

  Each prints PASS or FAIL with its number, on both maps.
- [ ] T041 [US5] Run the checks on the first guesses, and record the table in `docs/balance-backlog.md`, in a new "v3 prototype" section

**Checkpoint (S7 ends):** `npm run verify` passes. The table is recorded, FAIL lines and all.

- [ ] T042 [US5] Tune V3-Q9's levers until every line of `--checks v3` passes, as data. Log each change in `data/CHANGELOG-balance.md`, re-record v3's goldens, and put the final table in `docs/balance-backlog.md`. A lever outside the `v3` block and the generals' `v3` entries waits for the user (`data/balance.json`, `data/generals.json`; V3-Q9, Plan-Q4). The levers:
  - the Cellar's cost and yield;
  - plot prices;
  - the cap and the Heartcaps;
  - the generals' odds and weights.
- [ ] T043 [US6] The playtest guide (`docs/tasks/v3-playtest-guide.md` (new); plan, The playtest):
  - the dev-site links for each general and map;
  - the plan's checklist;
  - what to send back.

**Checkpoint (S8 ends):**
- `npm run verify`, `npm run test:browser` and `npm run bench -- --quick --rules v3` pass;
- `--checks v3` passes;
- once merged, the dev site plays the tuned prototype.

## Phase 8: US6 — The playtest (P3)

- [ ] T044 [USER] [US6] The user plays on the dev site with T043's guide. The answers go in `docs/playtest-feedback.md`, newest first, and the verdict in `docs/v3-proto-plan.md`'s As built: pass, the next lever, or the continuous prototype. The hub records it in `docs/status.md` (plan, The playtest)

## Phase 9: Polish

- [ ] T045 Retire the switch as the verdict says, so no `rules=v3` is left (CLAUDE.md, "Prototypes"):
  - **if v3 passes,** SPEC v3's first milestone makes v3's rules the default and retires v2's paths, its goldens and `rules`;
  - **if not,** delete the v3 code the next lever doesn't reuse, with the user's OK.

## Dependencies and parallel work

- S1 blocks everything.
- S2 needs S1.
- S3 needs S2, since both edit `src/app/phases/planning.ts`.
- S4 needs S1, and may run beside S3, since they edit different files:
  - S3: `commands.ts`, `colony.ts`, `planning.ts`, `ai/view.ts` and `ai/controller.ts`;
  - S4: `combos.ts`, `round.ts`, the systems, `effects.ts` and `ai/formationScore.ts`.

  The hub still checks the two branches together before turning on the second's auto-merge.
- S5 needs S2 and S4.
- S6 needs S3 and S4, since personalities buy plots and score combos.
- S7 needs S6, S8 needs S5 and S7, S9 needs S8 merged and deployed, and S10 needs the verdict.

## Sessions

| Session | Tasks | Branch | Gate (true before starting) | Review | Ends with |
|---|---|---|---|---|---|
| S0 | none (this list, the plan and the concept) | `docs/v3-concept` → `develop` (docs only) | V3-Q1–V3-Q13 decided | Its own auto-merge | The concept, the plan and this list; the user reviews them and answers Plan-Q1 |
| S1 | T001–T011 | `feature/v3-rules` → `develop` | S0 merged; the user reviewed the concept; Plan-Q1 answered | **Hub** (`src/sim/`, `src/data/`) | A v3 battle headless: fruiting, the empty clash, the hidden view for bots, ×2.0 and no upgrade; two v3 goldens; the `r2-*` goldens unchanged |
| S2 | T012–T017 | `feature/v3-view` → `develop` | S1 merged | Its own auto-merge | The preview link plays on the dev site: sprouts, the hidden view with S19's gaps closed, the gold tell |
| S3 | T018–T024 | `feature/v3-plots` → `develop` | S2 merged | **Hub** (`src/sim/`) | Gold buys plots, for every side, on the screen |
| S4 | T025–T029 | `feature/v3-combos` → `develop` | S1 merged; may run beside S3 | **Hub** (`src/sim/`) | The four combos in the sim, and the general's combo term |
| S5 | T030–T032 | `feature/v3-combo-view` → `develop` | S2 and S4 merged | Its own auto-merge | Combos shown on hover and as hyphae |
| S6 | T033–T038 | `feature/v3-generals` → `develop` | S3 and S4 merged | **Hub** (`src/sim/`, `src/data/`) | Three generals with personalities, openers and sprout-reading; the three opener bots |
| S7 | T039–T041 | `feature/v3-checks` → `develop` | S6 merged | **Hub** (`tools/lib/`) | `--checks v3`, with its first table in the backlog |
| S8 | T042–T043 | `feature/v3-tune` → `develop` | S5 and S7 merged | **Hub** (balance) | The checks pass; the playtest guide; the tuned prototype on the dev site |
| S9 | T044 | none (the hub records it) | S8 merged and deployed | The user | The answers and the verdict |
| S10 | T045 | named by the verdict | The verdict | **Hub** | No `rules=v3` left |

## Coverage

| Item | Tasks |
|---|---|
| The switch (plan Scope) | T001, T016, T045 |
| C3.1 Hidden plantings | T007, T010, T012, T014, T015, T020 |
| C3.2 Fruiting, and Plan-Q1's timing | T002, T006, T008, T009, T013, T017 |
| C3.3 Plots; no upgrade | T003, T018–T024 |
| C3.4 Combos | T025–T032 |
| C3.5 Merging at ×2.0 | T002, T003, T004 |
| C3.6 The general's tells, openers and prediction | T015, T033–T037 |
| C4 The roster and the generals | T003, T034 |
| Verification 1–2: verify and the goldens | T004, T005, T011, T024, T029, T038, T042 |
| Verification 3: the browser | T012, T023, T030 |
| Verification 4: `--checks v3` | T036, T039–T042 |
| Verification 5: the bench | S4's and S8's checkpoints |
| Verification 6: the dev site | T016, T043 |
| Verification 7: the playtest | T043, T044 |
