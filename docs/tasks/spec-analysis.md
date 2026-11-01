# Analyze: what the review of SPEC v2 found

This is the analyze step for SPEC v2, in spec-kit's sense: a check of the spec against itself, the code and the plan to build it, before any task runs. SPEC.md is the spec, `docs/tasks/clarify.md` the clarify step, `docs/<milestone>-plan.md` the plan and `docs/tasks/<milestone>.md` the tasks.

- **What it is:** a review of SPEC v2 done on 2026-11-01, while breaking SPEC into tasks. Ten reviewers each read one slice against SPEC and the code: R1; R2's sim, AI, UI, run, and retirement of v1; R3; R4; M6–M8; and the design as a whole. A skeptic then checked every finding. It re-read the cited lines and code, corrected summaries that overreached, dropped what didn't hold and added what the reviewer missed.
- **What survived:** 209 findings, A001–A209. 93 held as written, 83 were corrected by the skeptic, and 33 were found by the skeptic.
- **Types:** 65 gaps, 39 ambiguities, 38 contradictions, 38 risks, 23 pushbacks on a decision, 6 factual errors.
- **Line numbers:** "L928" is a line of SPEC.md at commit 270081f (develop after #39). Each cite also gives the §, since lines move as SPEC changes. Code is cited as `file:line` on the same commit.

**By severity**

| Severity | In the review | After this re-check |
|---|---|---|
| High | 19 | 18 |
| Medium | 91 | 92 |
| Low | 99 | 99 |
| **All** | **209** | **209** |

**By milestone** (the section of this file a finding sits in; R2 findings follow the R2a / R2b boundary that `docs/tasks/clarify.md` X1 sets)

| Milestone | High | Medium | Low | All |
|---|---|---|---|---|
| R1 | 2 | 14 | 10 | 26 |
| R2a: a battle in rounds | 5 | 27 | 34 | 66 |
| R2b: the run in rounds | 0 | 17 | 22 | 39 |
| R3 | 3 | 12 | 14 | 29 |
| R4 (R4a 10, R4b 7) | 1 | 11 | 5 | 17 |
| M6, with records-1 and records-2 | 2 | 8 | 7 | 17 |
| M7 | 1 | 1 | 5 | 7 |
| M8 | 0 | 0 | 0 | 0 |
| Cross-cutting | 4 | 2 | 2 | 8 |
| **All** | **18** | **92** | **99** | **209** |

**How a finding is routed.** Each finding names its route:

- **A clarify ref** (X1, R2-Q11, #42 and so on): the user makes a call. The block in `clarify.md` gives the question, a recommendation and what changes with the other answer. Until it's answered, the task files assume the recommendation.
- **SPEC fix:** a contradiction or factual error that can be fixed without changing a rule. The "SPEC wording fixes" section lists them by the milestone whose Setup phase lands them.
- **Task note:** the milestone's plan settles it with no call from the user, and the task that builds that part carries it. `clarify.md` lists these at the end of each milestone's section.

Some findings have both a call and a wording fix. The route then names the call, and the wording lands once it's answered.

**How to read an entry:** **A-ID** · severity · type · the problem. Then the evidence, the recommendation and the route. Low findings take one line each.

## What matters most

These twelve change what gets built, or in what order. Each names its findings, why it matters, what's recommended and the call it waits on.

1. **The scoring curve makes most battles go to round 9** (A193, A208, A097, A197, A022).
   - Round 1's 300 gold buys at most 16 supply, so it deals at most 400. Against your 3000 Heartcap and a flat cap of 500 a round, the general can't rout you before round 7. You can rout battle 1's 2000 in round 5 at the earliest. A crude model puts 45–83% of battle 1s at round 9, against G4's "at most 15%" (§1.3 #2, §6.7 L928, G4 L2392).
   - The cap binds on most decisive wins from about round 4 or 5. After that a narrow win and a flawless one score the same, and the Sporestorm, applied before the cap, does nothing (A208). The boss needs 8 capped wins out of 9, so its wins are mostly half-pay Decisions (A097, A197). On Twin Roots, split lanes become drawn rounds (A022).
   - **Recommended:** R1 adds a race model (rounds to fall per battle index, the share of clashes whose damage passes 500 at each budget). The user decides at R1's gate, before R2a builds scoring. The lean is a cap of 25% of the loser's max HP, which is D26's intent at every Heartcap size, and a Decision by share of max HP lost. Either is a rule change.
   - ⛔ X5 blocks R2a's scoring.
2. **R2 can't be built in place** (A025, A101, A066).
   - §13.4 edits `state.ts`, `step.ts`, `create.ts` and `commands.ts` in place. 71 files outside `src/sim` import the sim, and 23 name a helper §14.6 retires, so every intermediate PR breaks the whole project's typecheck. 14 of 31 unit test files build on v1's `liveState`, and every battle UI file reads v1 state.
   - **Recommended:** build v2 beside v1. R2a's PRs land on develop one at a time, as new modules and data fields v1 ignores, and end with a dev-only entry that plays one battle in rounds. R2b switches the game over on `feature/r2b-cutover` and deletes v1.
   - ⛔ X2 blocks R2a S0.
3. **R2 and R4 are each several milestones** (A195, A101, A202, A148).
   - R2's scope (§16 L3627–3672) is the round loop, scoring, lives, the colony, the general, the economy, drafts, powers, content effects, saves, the whole UI and v1's deletion, with one playtest at the end.
   - R2's playtest asks whether seeing the general's army helped, but today a sprite's size shows its merge tier, not its armor (`renderer.ts:25` `TIER_SCALE`), so the answer is confounded (A202). No sprite fits a size band yet (A148).
   - **Recommended:** split R2 into R2a, a battle in rounds, and R2b, the run in rounds, each with a playtest. Split R4: R4a (body size by armor, weapon marks, pips instead of `TIER_SCALE`) now, beside R1, landing before R2a's playtest; R4b (marks in full, the card text, Help) after R3. R4a reverses §1.3 #10's order, so it needs the user's OK. Sprites aren't battle state, so R4a moves no golden.
   - ⛔ X1 blocks every R2 session. X3 blocks R4a S0.
4. **Copies arrive after the playtests that need them** (A196, A033, A145).
   - The supply cap went because "mass the cheapest spawner" kept winning: mono Sporeling failed G3 at 83 and 86% under the rework (Appendix A L4204). D45 then leaves R2 with plots as the only limit, which is that configuration again, and R1 must pass G3 and G12 on copy-free mono builds. Squad sizes may get bent to tame a build R3 removes.
   - Single battles, where G3, G8, G12 and the goldens run, have no copy rule at all (A145).
   - **Recommended:** R1 measures G3 and G12 at 2, 3 and 4 copies beside unlimited. If mono Sporeling fails without copies, R2a brings copies (only copies) forward from R3, with §1.3 #5's "drafting a card you own adds a copy" and §18.2 #51 settled with it.
   - ⛔ X4 is decided at R1's gate and blocks R2a S0.
5. **R1 has no clash winner** (A001, A022).
   - R1 records each lane's winner, but G3 and G12 need a winner per clash, and §6.7 allows drawn rounds. The existing `evaluateCounters` assumes "there are no draws" and passes an answer on its mean over maps (`tools/lib/balance.ts:693`, `:706`, `:714`), while G12 needs 60% on every map.
   - **Recommended:** a clash's winner is lanes won, then uncapped damage, then a draw worth half. Report the capped round result beside it. Rank answers by their worst field, among answers that don't fail G3.
   - ⛔ R1-Q3 blocks R1 S0.
6. **R1 would measure v1's movement and targeting** (A021, A008).
   - Today an idle unit with no enemy in aggro range marches down its row to the far edge (`movement.ts:66-67`, `targeting.ts:150-158`). v2's §5.2 L509 sends it to the nearest enemy in its lane. In R1's clashes, unopposed squads walk past the enemy and park, which inflates stalls (G13), decides lanes at 45 s by supply and blunts the square law R1 exists to measure.
   - Siege units still prefer the Mortar building, and every unit targets it as a 2×2 rectangle (A008).
   - **Recommended:** a default-off, tool-only rules knob for v2's idle seek, always on in the clash check, and a duel flag that drops the building preference. R2 builds both rules anyway.
   - ⛔ R1-Q8 and R1-Q7 block R1 S0.
7. **The muster depends on which building was planted first** (A024, A026, A039).
   - The muster knits greedily in unit-id order (§5.6 L693–695, `merging.ts:136-158`), and nothing fixes the order the arrival creates units. Re-running the reviewer's model: two Burrows side by side give 1 Elder + 2 Bloomed + 1 base if file 1's units come first, and 0 + 4 + 4 if file 2's do. That breaks D48 ("two Burrows side by side make an Elder by placement alone") and §15.7's two-Burrow test.
   - **Recommended:** units arrive in plot order (lane, rank, file, then unit), the muster resolves inside Begin before any tick or power, and `mergePreview` runs on the same positions in the same order. A unit test checks that plant order never changes the preview.
   - ⛔ R2-Q11 blocks R2a's clash core.
8. **The general would read almost every army as Elite** (A041, A014, A058).
   - Under the muster every squad of 3 or more knits. Counting merged units at their parts' supply, a bot:balanced-like colony reads eliteShare 0.87: Elite 1.04 against Swarm 0.36. Even with the swarm read it's Elite 0.57 against Swarm 0.48 (§7.4 L1065–1075). Anti-Elite's only member is the Veilstalker Hollow, and the player can dodge it by toggling merges off.
   - §7.4's "at its base supply" has three readings that differ up to ninefold (A014). Mold's "more bodies" passive gives one Elder from 9 Sporelings (A058).
   - **Recommended:** count merged units at their parts' base supply, then recalibrate from R1's records, either by counting only Elder parts or by cutting the Anti-Elite multiplier from 1.2 to about 0.6. A unit case: bot:balanced's round-4 colony doesn't read Elite.
   - ⛔ R2-Q3: R1 S0 records it, R2a S0 decides.
9. **The Anti-Swarm set holds the swarm** (A056, A055).
   - Sporelings deal slash, so the Burrow is in its own counter set. "The cheapest counter" then picks it for Swarm (110 gold) and the Morel Warren for Line (130). v1 measured both as non-answers. Mold's battle-1 "counter" to a swarm just triples her Burrows' weight (§7.4 L1072, L1091, L1100; §7.8 L1162).
   - **Recommended:** take `swarm`-tagged units out of the Anti-Swarm and Anti-Line sets, add an Anti-Ranged kind whose set is the swarm spawners, and pick "the cheapest counter whose unit beats the dominant armor".
   - ⛔ #14 and #15 are decided at R1's gate and block R2a's counter cycle.
10. **The general's kit in R3 can't fill its colony** (A122, A194, A146, A123, A125).
    - §18.2 #42's first guess gives the general the player's copy rule. Mold's battle-1 kit is one card, the Burrow, so she fields 2 Burrows on 8 plots for three rounds and banks the rest (§7.8 L1164–1165, `src/run/flow.ts:163`). §7.4's ×3 lean and its selling for room then almost never fire. On Twin Roots one lane goes empty (A146).
    - No augments are written for the pack buildings or the Truffle Cellar, which hold 9 of today's 14 upgrade tracks, so the general's i − 1 and Veteran draws run dry (A123, A125).
    - **Recommended:** size the general's copies to its colony, for example ceil(open army plots / army cards) + 1, recomputed per battle and shown on its route node, or keep v1's `maxOwned` until R3 measures. Retire all 42 upgrade levels and write one augment for each pack spawner.
    - ⛔ #42 and R3-Q2 block R3 S0.
11. **M6's unlocks have no sources** (A168, A169, A190, A173).
    - §9.2's example feats unlock only 3 of the 9 shippable pack buildings, and Root and Branch has lost its target. §9.5 promises each of the three commanders an alternate power, a starter option, two passive upgrades, an exclusive relic and two strains, 21 items in all, and names none. §11.5's 12 strains target v1's six basics, not v2's core six, and 7 of them have no source. Pivot's reward sits in the Air pack, which never deals.
    - Nothing before M6 waits on these, but M6 can't be planned without them.
    - **Recommended:** a feat for every pack building, about 20 feats; a per-commander mastery table; strains for the always-in set, each with one source (a feat or `mastery:<commander>:<level>`).
    - ⛔ M6-Q3, M6-Q4 and M6-Q5 block M6 S0. X9 settles the Air pack.
12. **The Gray Rot has no map to the Velvet Bloom's ids** (A170, A182).
    - Packs, augments, the always-in set, counter sets and generals' weights all name Velvet Bloom ids, and the code fixes each seat's faction (`src/sim/create.ts:107`, `src/run/flow.ts:72`). Nothing maps a Gray Rot card to its counterpart, and the Rhizome Vault and Spore Exchange have none.
    - The Gray Rot's +10% HP trait is an unlisted edge for every general, which would retune every band R2–R4 set (A182).
    - **Recommended:** separate Gray Rot records, each with a `mirrors` field and identical stats, which every Velvet Bloom reference resolves through. Drop the trait, or ship it from R2a so the bands include it.
    - ⛔ M7-Q1 blocks M7's roster, and R2a S0 if the trait stays.

## Re-check of the high findings

Each of the 19 high findings was re-checked against the SPEC lines and code it cites.

| A-ID | Held? | What was checked |
|---|---|---|
| A001 | Yes | `tools/lib/balance.ts:693` says "there are no draws", `:706` ranks by mean, `:714` passes on the best mean. §16 R1 L3575 records lane winners only; §6.7 L934 allows drawn rounds |
| A021 | Yes | `src/sim/systems/movement.ts:66-67` steps an idle unit along its row; `targeting.ts:150-158` takes enemies within aggro range only; §5.2 L509 seeks the nearest enemy |
| A024 | Yes | Re-ran the reviewer's muster model: 1 Elder + 2 Bloomed + 1 base against 0 + 4 + 4 by creation order. `merging.ts:136-158` is greedy in id order; §14.4 L3038 sorts squads by building id, and nothing orders the units |
| A025 | Yes | §13.4 L2554–2571. By grep, 71 files outside `src/sim` import it, 23 name a helper §14.6 retires and 27 hold `'deploy'` or `'live'` (the finding's 22 and 33 used other patterns) |
| A041 | Yes | Re-derived the worked example: eliteShare 0.87 by parts (Elite 1.04, Swarm 0.36); 0.47 with the swarm read (0.57, 0.48). Only `veilstalker` has `slayer` |
| A056 | Yes | `units.json`: `sporeling` is slash; `buildings.json`: the Burrow (110) is the cheapest slash or splash spawner, the Morel Warren (130) the cheapest pierce one |
| A057 | Yes, as a risk | §5.6 L716 knits to a fixed point; `powers.ts:170` needs 2 trios; `tools/verify.ts:15-19` asserts Cordis's `powerMerges ≥ 1`. Not measured, so R2-Q7 measures first |
| A059 | Yes, **downgraded to medium** | `src/app/loop.ts:44-46` runs any queued command in deploy; `main.ts:275-277` and `tools/lib/params.ts:45` queue Begin for bots; §15.6 has no planning checkpoint. It's one definition in §15.6 that R2a's plan writes with no call, and it changes nothing about what is built or when |
| A101 | Yes | 14 of 31 unit test files import `liveState`; §15 L3300 retires tests "in the same change"; §16 L3502–3511 |
| A122 | Yes | `data/generals.json`: Mold's opener is `[sporelingBurrow, sporelingBurrow]`, which `flow.ts:163` dedups to one card; §7.8 L1165 gives it 2 copies. It overlaps A194 and §18.2 #42, and adds why §7.4 stops working |
| A123 | Yes | `data/upgrades.json` has 14 tracks, 9 on buildings outside the core six; §11.13 L2239 writes augments for the core six only, and L2262 promises the rest |
| A148 | Yes | Re-measured frame 0 of `data/sprites/units.json`: Amanita Knight 14×13 (132 px) against Rootbreaker 14×13 (131 px); Gill Archer 10×13 against Capguard 12×13; Morel Runner 10×11 against Tender 11×12. `SpriteSchema` (`src/data/schema.ts:494-511`) has no shape fields |
| A168 | Yes | §9.2 L1469–1483. The table is "for example" (L1465), so this is content M6 has to write, not a contradiction |
| A169 | Yes | §9.5 L1519–1529; nothing in SPEC names the items |
| A170 | Yes | `src/sim/create.ts:107` fixes the faction by seat; `data/factions/gray-rot/faction.json` lists Velvet Bloom ids ("Mirror match until M7"); §11.11 L2204 |
| A193 | Yes | §1.3 #2 L170, §6.7 L909–928, D26 L3989, D28 L3991, G4 L2392. The round-7 and round-5 limits follow from the arithmetic; the shares reaching round 9 come from a crude model, not a measurement |
| A194 | Yes | Same evidence as A122 |
| A195 | Yes | §16 R2 L3627–3672; §16 L3502–3511 |
| A196 | Yes | D45 L4008, §8.10 L1415–1417, Appendix A L4204, R1's done-when L3598–3600 |

- **Dropped on re-check:** none. Every high finding's evidence held.
- **Downgraded:** A059, from high to medium.
- **Small corrections to cited evidence**, made in the entries below: A194 cites `src/run/flow.ts:162` for the opener's dedup, which is at `:163`. A025's file counts depend on the grep pattern (22 or 23 files with retired helpers, 27 to 33 with the phase strings); the conclusion doesn't change.
- **Found on re-check, with no A-ID:** §1.3 #1 (L168) says "no round deals more than 500", but §6.7 step 4 caps each Heartcap, and E7 lets both Heartcaps take up to 500 in one round on Twin Roots. D26 has it right. It's listed under R2a's wording fixes.

## SPEC wording fixes

These are contradictions and factual errors that can be fixed without changing a rule. Each lands in the Setup phase of the milestone named, so that milestone's sessions read a consistent SPEC. A fix marked with a clarify ref lands after that call. The section and line are where the wrong text is today.

### R1

| A-ID | Section | Fix |
|---|---|---|
| A006 | §16 R1 L3567, §12.2 L2343 | "Melee squads in front, ranged squads and emplacements behind" becomes §7.3's rule: a spawner whose unit has the `ranged`, `support` or `burst` tag, and every tower, stands behind (L1018) |
| A019 | §16 R1 L3566, §12.2 L2343 | Formation "by plot" is R2's (it needs §7.3's placement, and G16 measures it); R1 forms by role only |
| A016 | §16 R1 L3563 | Skip utility picks as well as economy picks; G3's monos and the clash answers are the army buildings and the Tender (R1-Q2) |
| A013 | §12.2 L2360 | Replace "one clash takes about 10–30 ms … about 10 minutes on 6 workers" (from before the cap went) with the measured 40–90 ms at 900–1,500 gold with merging off, about 15–20 minutes per full check on 6–8 workers |
| A017 | §15.3 L3382 | List the clash check's options: `--merging off`, a `noeldersplash` preset and `--squad <id>=<n>`, beside `--budgets` and `--squad-seconds` |

### R2a

| A-ID | Section | Fix |
|---|---|---|
| A195, A101, A025 | §16 R2 L3627, L3651, step 10 L3719, §16 L3510 | Split R2 into R2a and R2b, each with its own gate questions: R2a's playtest of one battle asks step 10's questions 1, 2, 3, 6 and 7, R2b's whole run asks 4 and 5. `docs/r2-plan.md` becomes `docs/r2a-plan.md` and `docs/r2b-plan.md`. R2a lands beside v1 on develop, behind a dev-only entry; R2b switches over on `feature/r2b-cutover` and deletes v1, so L3510's "merged into `develop` as the new default" holds from R2b's merge (X1, X2) |
| (none) | §1.3 #1 L168 | "No round deals more than 500" becomes "no Heartcap takes more than 500 in a round", as §6.7 step 4, E7 and D26 have it |
| A027, A103 | §13.4 L2571 | `merging.ts` (muster mode; v1's supply, wave and shield fields out), `targets.ts` (units only) and `effects.ts` (R2's selectors and triggers) move from "Carries over … Unchanged" to "Kept, with v1 parts removed". `clouds.ts` follows R1's mixed-wave call. Add `combat.ts`'s and `commands.ts`'s imports from `spawning.ts` and `stance.ts` to the retirement row |
| A036, A121 | §15.5 L3399, §14.5 L3172, §14.6 L3235 | §15.5's "each command carries the round and phase" becomes "the round, and for a clash command its tick within the clash", since the phase follows from the command type. `runHeadless`'s `until` takes `{ round, tick? }`, as `--until r<n>:<tick>` does (§15.2 L3340) |
| A110 | §15.7 L3479 | The Combat row keeps "slayer and tunneler preferences"; siege preference is retired (§5.2 L502) |
| A104 | §15.7 L3467–3495 | Run and Sound are "rewritten in part", not "Kept": drafts, effects and resume cases, and v1's battle sounds with `REQUIRED_SOUNDS`. Add merge-under-fire, knit-cancel, elder-showcase, power-demo and merge-trio to the Rule scenarios row, in round form |
| A113 | §12.3 G11 L2399, §15.4 | G11's Node bench times the sim part of a planning command (`formationOf` and `mergePreview` after a plant). The 4 ms Chromium figure (§13.7 L2642) is measured in a browser test |
| A115 | §15.2 L3348 and its JSON example, §15.5 | Checkpoint keys are `r<n>.planning`, `r<n>.clash`, `r<n>.aftermath` and `r<n>:<t>`, with t counted within the clash and `r<n>` an alias for the end of the aftermath |
| A075 | §15.6 L3437 | `ticks` counts from the clash's start; the bridge reports the cumulative `state.tick`. A `round` past the battle's end fails the capture with a message |
| A061 | §10.2 L1675, §10.5 L1797 | Under `?test=1` the aftermath jumps to its final frame and holds; the next round waits for input, or for the usual duration when no `phase=` hold is set |
| A078 | §13.5 L2595, §10.2 L1641 | The aftermath plays at the speed the clash ended at; the speed control stays live there, with pause hidden (R2-Q12) |
| A059 | §15.6 | Define the `phase=planning` checkpoint: the general has planned, a bot player's planning commands have run, and its `beginClash` is still queued. Browser and Node stop there |
| A076 | §16 R2 step 9 L3704–3715 | Add `--click` on a tray card to r2-planning-4, an r2-clash-start capture at `ticks=1&paused=1`, and a bridge field for what the preview drew |
| A040 | §5.6 L693–695, L716–717 | Detection takes units "in the same lane", as `merging.ts:146` does (R2-Q11) |
| A035, A092, A209 | §6.5 L870 | Tiebreak 1 is "more Heartcap damage dealt in the battle: the sum of each round's damage as applied in §6.7 step 4". Drop "(the HP each Heartcap lost …)", which a heal would change (R2-Q11) |
| A055 | §7.4 L1070 | A unit that deals no damage, such as a healer, is in no counter set, as `counter.ts:30` has it |
| A109 | §16 R2 L3648–3650 | Separate "adopted as data" from "kept as a default-off knob", and add R1's pace variant and the arrival shield to the lists (#12) |
| A112 | §15.4 L3389, §13.7 L2652 | bench-300 stays a clash of placed units in formation-like blocks, with no plots (test-3lane can't hold plots); R1's full-colony clash is the formation-from-plots case (R1-Q5) |
| A119 | §15.4, §13.7 L2639, G11 | bench-300 as a clash can't run 2,000 ticks. Say whether it turns damage off or chains fresh clashes of at most 900 ticks, and set `G11.benchTicks` to match (R1-Q5) |

### R2b

| A-ID | Section | Fix |
|---|---|---|
| A073 | §10.5 L1781, §16 R2 UI | The run summary changes too: how each battle was decided, lives lost and the round sparkline (§8.8). It reads only fields R2 keeps |
| A074 | §16 R2 link-preview bullet | Add the title screen's blurb and a regenerated og image (`npm run og-image`) |
| A089 | §8.9 L1376 | R2's BattleSave is `v: 3` (v1-rules saves already use `v: 2`); any other version restarts with the notice |
| A093 | §8.3 L1267 | "A pure function of (run seed, battle index, draft index, run state)" becomes "from the battle's draft stream", or each draft is sub-seeded |
| A098 | §14.4 L3142 | `plots` becomes `plotsGained` (sprawl only, 0–4); a battle's colony is the map's plots + `plotsGained` + plot modifiers |
| A090 | §14.4 L3042, §11.7 L2118 | The Sigil and Rot-Eater keep "from round 5" on purpose; the comment "0 before round 5" becomes "0 before the storm's first round", which Mold Bloom and Early Storm move to round 4 |
| A114 | §16 R2 Done when L3663, Appendix A | Tag each Appendix A row with the milestone that removes it; R2's done-when checks the rows tagged R2 |
| A156 | §15.7 L3491, §16 R2 L3645 and L3658 | R2b writes the round tips, the Rounds tab and the round chip tooltips with a first true wording; R4b rewords them (X1) |
| A063 | §16 R2 step 9 L3714, §15.6 L3455 | Lives show only in run scenes. Add a run-scene planning capture and compare `#hud-lives` with `__GAME__.run().lives` |

### R3

| A-ID | Section | Fix |
|---|---|---|
| A140 | §16 R3 L3737 | "Only through run packs" becomes "through run packs or the commander's core" (§8.4 L1277, §11.10 L2198) |
| A134 | §16 R3 Tools, §15.2 L3343, L3768 | Add `--auto-draft commit`; "today" becomes "greedy against random today" |
| A153 | §14.2 L2971, §18.2 #39 | "The way merge perks' resistances do" contradicts §5.3 L642 ("Merge-perk resistances don't count"); align the wording with §5.3, then settle #39 |
| A139 | §8.4 L1282, §11.15 L2315 | Until flyers ship, Hardy Spores and Second Flush are in every run's relic pool (X9) |

### R4

| A-ID | Section | Fix |
|---|---|---|
| A149 | §16 R4 step 1 L3811 | The check reads: the area mark for `burst` units, the heal mark for a healer that deals no damage, otherwise the damage type's mark (an arrow when `projectileSpeed > 0`, else a spike for pierce) |
| A150 | §11.3 L1981 | The Scythecap carries the blade only; §5.8 L784 says cleave never changes a unit's mark |
| A077, A158 | §10.1, §10.4 L1719, #52 | Twin Roots draws at about 1.78× in a 1280×720 window, not 2×. State the scale per map, and make Twin Roots the worst case for readability (#52) |
| A159 | §2 L237, §16 R4 L3827 | The colour-blind check moves from M7 to R4a (R4-Q4) |

### M6 (with records)

| A-ID | Section | Fix |
|---|---|---|
| A172 | §9.7 L1543 | The profile is meta-only: settings, tips and the run keep their own keys (§13.8). Add the last setup, records and the codex (RB-Q1) |
| A186 | §10.5 L1773, §16 M6 L3873 | One tab list for the Underroot: Commanders, Traits, Strains, Bans, Blights (M7) and Collection (RB-Q4) |
| A187 | §15.6 L3445–3446 | `profile=fixture` is marked (M6) and `measure=frames` (M8); neither exists today. A fixture loads through a screenshot `--profile` option, never in the production build |

### Cross-cutting

| A-ID | Section | Fix |
|---|---|---|
| A191, A178 | §17 preamble L3937 and #7 L3950, §1.3 #11, §16 M7 L3889 | Say once that flyers come after the first release, and that runs deal 4 of 9 packs (X9) |

## Findings by milestone

Each milestone lists its high findings, then medium, then low. A finding sits under the milestone that has to act on it first; its route says where it's settled.

### R1: the clash check (26)

#### High

- **A001** · high · gap · R1 defines no clash winner for G3 and G12, and no draw. The existing `evaluateCounters` assumes "there are no draws", ranks answers by their mean over maps and passes on the mean, while G12 needs 60% on every map.
  - Evidence: §16 R1 L3575 (lane winners only) and L3619–3621; §6.7 L934 (drawn rounds); G12 L2400; `tools/lib/balance.ts:693`, `:706`, `:714`.
  - Recommendation: a clash's winner is the lanes won, then uncapped damage, then a draw counted half to each side (see A022). Rank screens and confirmations by the worst field, and pass G12 on the best confirmed answer's worst field among answers that don't fail G3.
  - Route: R1-Q3.
- **A021** · high · gap · R1 runs today's movement, where a unit with no enemy in aggro range marches down its row to the far edge. v2's §5.2 sends it to the nearest enemy in its lane. Unopposed squads walk past each other and park, which inflates G13's stalls, decides lanes at 45 s by supply and blunts the square law.
  - Evidence: §5.2 L509; §16 R1 L3556, L3583 ("today's combat alone"); `src/sim/systems/movement.ts:66-67`; `src/sim/systems/targeting.ts:150-158`. The skeptic's runs on test-flat: a Capguard squad in file 4 against Sporelings in file 1 never fought in 900 ticks.
  - Recommendation: v2's idle seek as a default-off rules knob that the clash check always turns on (R2 builds the rule anyway). At least, report how many clashes had idle units at the far edge and how many stalls they caused.
  - Route: R1-Q8.

#### Medium

- **A002** · medium · ambiguity · On Twin Roots, alternating by build-list index splits a pair's opener by type, so at 300 gold each lane fights as a mono squad, and above 300 the lanes mix at random. A one-building army fields only the top lane and gives the other away by E1.
  - Evidence: §16 R1 L3581, §12.2 L2346; `tools/lib/balance.ts:528-536` (`pairOpener`), `:549`; §7.3 L1039.
  - Recommendation: each building goes to the lane with fewer buildings of its line (front or back), ties to the top lane. Report §7.3's round-1 rule as a Twin Roots variant, since R2's general uses it.
  - Route: R1-Q1.
- **A003** · medium · ambiguity · The build-list rule doesn't say what happens to a pick that doesn't fit, when to stop, or which random stream each army draws from. v1's AI waits for gold, which never arrives with a fixed budget, and both sides share one AI stream, so an army changes with its seat.
  - Evidence: §16 R1 L3562, §12.2 L2339; `src/sim/ai/controller.ts:49`, `:163`, `:174`; `src/sim/ai/profiles.ts:75`.
  - Recommendation: filter economy and utility out before drawing; skip a pick that doesn't fit and keep drawing until nothing fits or the plots are full; ignore `afterSeconds` or map it to the budget's round; one stream per army keyed by (seed, bot). Report gold spent.
  - Route: R1-Q2.
- **A004** · medium · contradiction · SPEC's own first guesses give a full colony of 144 supply (upgraded Burrows on 12 plots), or 108 without upgrades, against "about 100". R1's bot armies top out at 96, so the check understates it.
  - Evidence: §13.7 L2638, L2652; §4.4 L353; §4.6 L401; §11.6 L2087; `data/upgrades.json:7`.
  - Recommendation: state the budget in live units at arrival (for example at most 150 a side). Decide whether the full colony includes the level-3 upgrade; if "about 100 supply" must hold, R1 recommends the cut.
  - Route: R1-Q5.
- **A005** · medium · ambiguity · R1 doesn't say which budgets get the extra plots, or the file order inside a Twin Roots lane. That decides whether cheap builds are plot-capped at 1,200–1,500 gold (8 Burrows cost 880, 12 cost 1,320).
  - Evidence: §16 R1 L3565, L3582; §12.2 L2342; §4.6 L401–402.
  - Recommendation: measure every budget at the map's base plots, plus one reading with all 4 extra plots at 1,200 and 1,500, labelled "a late-run colony", placed in §4.6's order.
  - Route: R1-Q4.
- **A006** · medium · contradiction · R1's role rule names only melee, ranged and emplacements, so the Tender (support) and the Burster (burst) would stand in front. §7.3 and G16 put them behind.
  - Evidence: §16 R1 L3567, §12.2 L2343; §7.3 L1016, L1018; G16 L2420.
  - Recommendation: use §7.3's tag rule, so the check's armies stand as R2's general places them.
  - Route: R1-Q1; SPEC fix.
- **A007** · medium · risk · With jitter off, a clash between two fixed armies is deterministic, so every mono-against-mono cell replays one clash 100 times and reads 0, 50 or 100%.
  - Evidence: §12.2 L2349; §16 R1 L3618; `src/sim/systems/spawning.ts:71` (the combat stream's only use); `profiles.ts:46-48`.
  - Recommendation: cache clashes by army fingerprint, report deterministic cells as such, and quote mono-against-mono numbers with a small stated jitter (for example ±0.2 tiles).
  - Route: R1-Q3.
- **A008** · medium · risk · Under today's targeting, siege units prefer the Mortar building, and every unit targets it as a 2×2 rectangle it walks through, so R1's emplacement reading (#10) measures v1 behaviour.
  - Evidence: `targeting.ts:134`, `:162-164`; `movement.ts` (separation pushes units only); §5.2 L502; §4.4.
  - Recommendation: a tool-only duel flag that drops the building preference, or flag the Rootbreaker-against-Mortar cells as v1 behaviour. R2 states the emplacement's collision radius and whether it separates other units (A029).
  - Route: R1-Q7.
- **A009** · medium · gap · The pace variant can't run on the rework's code as it stands: `matchPace` keys on `u.wave`, which units added with `addUnit` never have.
  - Evidence: §16 R1 L3600, L3605; `movement.ts:104`, `:123`; `spawning.ts:75`; `src/sim/create.ts:401-424`.
  - Recommendation: a pace preset with `waves.matchPace`, and the clash tool stamps `u.wave = 0` on every unit. It rides retired code, so R2 reimplements the rule in `systems/clash.ts` if it's adopted.
  - Route: task note (R1 plan).
- **A010** · medium · pushback · `--squad-seconds` with whole-batch rounding isn't a uniform scale. At 45 s the Burrow drops from 8 to 6, while the Lodge, Hollow and Warren don't change; at 75 s the Lodge gains 50% and the Forge nothing.
  - Evidence: §16 R1 L3564, L3585; §11.2 L1917.
  - Recommendation: report each building's squad and value per gold under every variant. Better, let R1 recommend squad sizes per building, the Burrow first; a global scale uses round(squad60 × S / 60).
  - Route: #7.
- **A011** · medium · ambiguity · The "sixth archetype's candidates" variant adds nothing over the baseline: the Mortar is already in the roster and in bot:balanced's weights, and the Burster variant is just `--proto burster`.
  - Evidence: §16 R1 L3590; §12.2 L2357; `data/factions/velvet-bloom/faction.json`; `data/bots.json`; §11.4 L2038.
  - Recommendation: a core-six run, with builds and answers limited to the five core spawners plus the candidate, once with the Burster Pod and once with the Mortar, reporting §11.4's counter-graph edges.
  - Route: R1-Q6.
- **A022** · medium · risk · Under §6.7's cap of 500 per Heartcap, most Twin Roots clashes that split one lane each are drawn rounds at R1's budgets. Using the round result as the clash winner then pulls Twin Roots answers toward 50%, on the map where the strict bar fails.
  - Evidence: §6.7 L926–928, L934; §7.3 L1043; §12.3 L2417. A lane margin of 20 supply already deals 500.
  - Recommendation: the clash winner is lanes won, then uncapped damage, then a draw. Report the capped round result beside it, with the share of drawn rounds per field and budget.
  - Route: R1-Q3; X5.
- **A023** · medium · risk · The burster, rhizomorph and kept variants change the reference army and the answer list, not just the rules: bot:balanced buys the new spawners at weight 1, and they join G3's monos and the pairs.
  - Evidence: `src/sim/ai/profiles.ts` (the `if (!mono && !fixed)` loop); `src/data/proto.ts:38`, `:70-71`, `:87`; `tools/lib/balance.ts:593`; §16 R1 L3583, L3620.
  - Recommendation: run G3 twice for those variants, with bot:balanced pinned to its data weights and as the data has it, and list the added monos and pairs separately.
  - Route: R1-Q6.
- **A109** · medium · gap · R2's lists use "keeps" both for keeping a knob and for adopting a piece, and they leave out R1's pace variant, whose code hangs off `waves`.
  - Evidence: §16 R2 L3648–3650; §16 R1 L3595; `spawning.ts:121-139`; `movement.ts:95-124`.
  - Recommendation: R1's review records one outcome per knob: adopted as data, kept as a default-off knob, or deleted. If #12 is adopted, the pace rule gets its own key and reads the lane's army, not buildings.
  - Route: #12 (R1's gate); SPEC fix.
- **A200** · medium · contradiction · The full-colony budget, a MUST of about 100 supply a side, is already exceeded by SPEC's own first guesses: 16 plots × 8 on Twin Roots, 12 × 9 Rootbreakers on one lane, 12 × 12 upgraded Burrows, plus Mold's, the Vault's and the Shrine's extra units.
  - Evidence: §13.7 L2638, L2652; D33 L3996; §4.6 L389; §4.4 L353; §11.2 L1934–1942; §7.7 L1137.
  - Recommendation: R1's bench case uses the true worst case. State which holds: the budget is per lane on two-lane maps, sprawl stops at 12 plots on Twin Roots, or unit-adding effects count against a per-squad ceiling.
  - Route: R1-Q5.

#### Low

- **A012** · low · pushback · R1 fills files from file 1, so partial armies stand off-centre, while §7.3 centres them; fill centre-out (2, 3, 1, 4; 2, 1, 3 per Twin Roots lane). §16 R1 L3567, §7.3 L1020. Route: R1-Q1.
- **A013** · low · risk · The 10–30 ms per clash estimate predates dropping the cap; merging-off clashes at 900–1,500 gold take 40–90 ms, and the pool can't run clash jobs yet. Plan for 15–20 minutes per full check and generalise the pool. §12.2 L2360. Route: task note (R1 plan); SPEC fix.
- **A014** · low · ambiguity · eliteShare "at its base supply" has three readings that differ up to ninefold; 8 Burrows in one lane knit to 7 Elders + 1 base. Count each merged unit at its parts' base supply, tool-side in R1. §7.4 L1065–1067, §16 R1 L3575. Route: R2-Q3.
- **A015** · low · risk · The muster makes merging total and instant (8 Burrows: 64 supply fielded becomes 29), which changes what the merge toggle is worth. Add a mirror row: each army against its merge-off twin, per budget. §6.7 L949. Route: #9.
- **A016** · low · gap · The Truffle Cellar, Spore Exchange and Rhizome Vault field nothing but would enter G3 and the answer list as monos; skip utility picks like economy ones. `tools/lib/balance.ts:39-41`, `:609`; §16 R1 L3563. Route: R1-Q2; SPEC fix.
- **A017** · low · gap · "Merging off" has no switch in the tool; add `--merging off`, a `noeldersplash` preset and `--squad <id>=<n>`, and list them in §15.3. `tools/experiment.ts:56-84`; `src/data/proto.ts:94`, `:218-224`. Route: task note (R1 plan); SPEC fix.
- **A018** · low · gap · The full-colony bench case doesn't fix merging or run length; with merging on it measures almost nothing. Run it with merging off at 12 plots, timing the arrival tick and every tick to the clash's end. `tools/lib/bench.ts:24-40`; §15.4 L3390. Route: R1-Q5.
- **A019** · low · ambiguity · Formation "by plot" can't be built without §7.3's placement, which is R2's; say it's R2's (G16). §16 R1 L3566, §12.2 L2343. Route: R1-Q1; SPEC fix.
- **A020** · low · risk · At the planned squad sizes only the Capguard Hall at 75 s overflows its slot, so #11 rests on one case; add the Vault's and Shrine's sizes to the overflow table. §16 R1 L3598. Route: #11.
- **A116** · low · risk · R1 reads neither G1 nor G8 with the Burster Pod and Rhizomorph Tunnel; run `npm run experiment -- --proto kept --checks duels,g8` before adopting, and exclude burst units from G2 if the Burster can't meet it by design. `tools/lib/balance.ts:47-53`; G2 L2391. Route: task note (R1's gate).

### R2a: a battle in rounds (66)

#### High

- **A193** · high · contradiction · With your Heartcap at 3000, battle 1's general at 2000 and a flat 500 cap applied after the storm, the general can rout you only with about 6 near-maximal wins, so most general wins and most even battles run to round 9. G4 wants at most 15% there and a median of 6–8.
  - Evidence: §1.3 #2 L170; §6.7 L909–928 (storm in step 2, cap in step 4); G4 L2392; G6 L2394; D26 L3989; D28 L3991. Round 1 deals at most 400 (16 supply), so the general fells 3000 in round 7 at the earliest, and you fell 2000 by round 5. A crude model puts 45–83% of battle 1s at round 9. The bars are fractions (§10.2), while the Decision reads absolute damage (§6.5 L870).
  - Recommendation: R1's race model first, then the user's call. The reviewer's set: equal per-battle Heartcaps, a cap of 25% of the loser's max HP, and the storm raising the cap. D26 states the cap as "a quarter of battle 1's enemy Heartcap", so scaling it is a rule change.
  - Route: X5.
- **A024** · high · gap · Nothing fixes the order in which the arrival creates units, yet the muster's result depends on it. Two Burrows side by side make an Elder or none, depending on which was planted first.
  - Evidence: §5.6 L693–695 (id order, ties to the lower id); §14.4 L3038 (squads sorted by building id, that is plant order); §13.3 rule 4 L2478 orders plots, not units; D48 L4011; §4.6 L414; §15.7 L3483; `src/sim/systems/merging.ts:136-158`. Re-checked by model: 1 Elder + 2 Bloomed + 1 base against 0 + 4 + 4.
  - Recommendation: the arrival creates units in plot order (lane, rank, file, §13.3 rule 4), then by j within each squad. `mergePreview` runs on the same absolute coordinates in the same order. A unit test checks that plant order never changes the preview or the fielded record.
  - Route: R2-Q11.
- **A041** · high · pushback · Under v2 every squad of 3 or more knits at the muster, so the counter cycle reads Elite for mixed armies like bot:balanced's, even with the swarm read (0.57 against Swarm 0.48). Anti-Elite's only member is the Veilstalker Hollow, which the player can dodge by turning merges off.
  - Evidence: §5.6 L724, L729; §7.4 L1065–1075; §11.2 L1923–1932; `data/factions/velvet-bloom/units.json` (only `veilstalker` has `slayer`); `src/sim/ai/counter.ts:61-71`, `:92`; `tools/verify.ts:14`. Mono Capguard and Hammercap still read Line, and mono Amanita reads Armor.
  - Recommendation: count merged units at their parts' base supply, then recalibrate from R1's eliteShare records, by counting only Elder parts or by cutting `eliteScoreMult` from 1.2 to about 0.6. Unit case: bot:balanced's round-4 colony with default toggles doesn't read Elite. Say which supply the 25% Slayer share in the merge-toggle rule uses (§7.2 L1006).
  - Route: R2-Q3.
- **A056** · high · pushback · The Anti-Swarm set contains the swarm, and "the cheapest counter" picks it. The general's missing answer, and the boss's first extra card, for Swarm is the Sporeling Burrow, and for Line the Morel Warren. v1 measured both as non-answers.
  - Evidence: §7.4 L1072 (slash is in the set; `sporeling` is slash), L1083–1091, L1100; §7.6 L1130; §7.8 L1160–1162. Mold's battle-1 kit is a Burrow only, so her Swarm "counter" adds no card and triples the Burrow's weight.
  - Recommendation: exclude `swarm`-tagged units from the Anti-Swarm and Anti-Line sets; add an Anti-Ranged kind whose set is the swarm spawners (#14); pick "the cheapest counter whose unit beats the dominant armor in the matrix". Unit case: Mold's Anti-Swarm activation adds a non-swarm card.
  - Route: #14, #15 (R1's gate).
- **A057** · high · risk · Puppet Bloom, Cordis's power, has almost nothing left to merge. The muster has knit every reachable group to a fixed point, Cordis's 2.0 radius joins neighbouring squads, and no units arrive during a clash. The auto policy needs 2 trios, so it rarely fires, and Cordis's verify smoke fails.
  - Evidence: §5.6 L689–695, L729; §11.10 L2196; §4.7; `src/sim/powers.ts:170` (`BLOOM_MIN_TRIOS = 2`); `tools/verify.ts:15-19`. Not measured.
  - Recommendation: R1's clash check, or R2a's first run, reports Puppet Bloom trios available per clash for Cordis's kits. If the median is below 1, give the power a v2 job in §11.10 (for example, knitting units of one type and any tier one tier up) and rewrite the smoke.
  - Route: R2-Q7.

#### Medium

- **A026** · medium · ambiguity · The muster's timing is consistent, but §14.6 has no step that resolves its fixed point (at Begin, before `clashStart` triggers and before any power), and nothing lists the systems that skip the 20 muster ticks. A literal build would reuse v1's every-10-ticks merging and let a first-tick power break muster knits.
  - Evidence: §4.7 L448, L492; §14.6 L3269, L3274, L3283, L3288; #25 L4077; `src/sim/systems/merging.ts:23`.
  - Recommendation: write the order into §14.6. The arrival places units at `formationOf`'s positions and resolves the muster in the Begin step; muster ticks skip targeting, movement, separation and attacks; a muster-knit event carries each part's position and tier for the view; "tick 0" is the Begin step.
  - Route: R2-Q11.
- **A027** · medium · factual · §13.4 says `merging.ts`, `clouds.ts`, `targets.ts` and `effects.ts` carry over unchanged. Each holds v1 parts R2 retires, or lacks rules R2 needs.
  - Evidence: §13.4 L2571; `merging.ts:105-119` (supply, wave, mixed-wave shields, v1 counter tracking; no muster mode); `targets.ts:26-44` (buildings and Heartcaps as targets); `effects.ts:121-128`, `:172`, `:191-227` (selectors and actions §14.2 retires).
  - Recommendation: move them to "Kept, with v1 parts removed" or "Extended", and note that `clouds.ts`'s shield code follows R1's mixed-wave call.
  - Route: task note (R2a plan); SPEC fix.
- **A028** · medium · gap · Per-squad unit stats (`rank` and `inCounterSet` selectors on `unit.*`) have no compile path: `tierDef` is side-wide, and merges recompute max HP from it. Nothing says which stats a unit knit from a front-rank and a back-rank squad follows. R2b's content (the Baron's passive, Thick Caps, Home Brood) needs the path.
  - Evidence: §7.7 L1138; §11.7 L2100; §14.2 L2820–2821; §5.6 L706, L716–717; `src/sim/state.ts` (`CompiledSide`); `src/sim/world.ts` (`tierDef`).
  - Recommendation: at Begin, compile a per-squad unit table where a squad's plot matches a selector, and resolve stats through `sourceBuildingId`. A merged unit takes its lowest-id parent's squad, with HP carried by ratio. Write it into §5.6 and §14.4. R3 extends the same table (A131).
  - Route: R2-Q11.
- **A029** · medium · gap · An emplacement "targets and is targeted as a unit does", but its unit mechanics are open. Separation would push it although it never moves, a unit's edge-to-edge range would differ from a tower's centre-based one, and its firing band, cloud aim, structure armor and healing exist only on the building path.
  - Evidence: §6.7 L906–910; §5.2 L519, L521; `movement.ts:277-309`; `targets.ts:11` (`MAX_RADIUS` 0.8) and `create.ts:225`; `targeting.ts:36-45`, `:206-232`; `combat.ts:165-176`.
  - Recommendation: a short emplacement rule list in §6.7, settled with #10: immovable (separation moves the other unit by the whole overlap); radius at most 0.8, range from the centre; structure armor; clouds, bursts and powers hit it; not healed; pins nothing and never merges.
  - Route: #10.
- **A030** · medium · gap · A lane's result "locks", but the state doesn't keep what scoring needs from that moment, and "holds still" doesn't say what stops.
  - Evidence: §14.4 L3091–3094, L3097; §6.7 L912–913, L918, L946; §4.7 L451; §14.6 L3285.
  - Recommendation: at the lock, store the winner, survivors, each side's damage supply and the margin, and put per-lane damage in `RoundResult.lanes`. Freeze an ended lane completely: drop hits into it, stop its clouds, skip its units in every system. Refuse a power aimed at it.
  - Route: R2-Q11.
- **A039** · medium · gap · `mergePreview` returns counts per building, which can't show cross-squad knits or drive the muster's feedback. With neighbours, one building's preview looks as if it lost units.
  - Evidence: §14.6 L3245–3246; §5.6 L706; §10.2 L1666; §10.4 L1743.
  - Recommendation: the pure muster in `formation.ts` returns the trios per pass (parts, tier, centroid) beside the counts. Labels such as "shares an Elder with file 2" and the 1 s animation read from it. Write the shape into §14.6.
  - Route: task note (R2a plan).
- **A043** · medium · pushback · With the back rank full and a front-rank plot free, a back-line building scores the same in the front and third ranks, and ties go to the front. After the ±0.5 noise it's a coin flip, which hits Mortar-heavy generals most.
  - Evidence: §7.3 L1027, L1032, L1034; #18, #19 L4070–4071; G16 L2404.
  - Recommendation: an asymmetric term, such as −10 × max(0, 1 − depth) − 2 × max(0, depth − 1), or back-line ties toward the back. Write it into §7.3 so the formation test can assert it.
  - Route: task note (R2a plan).
- **A044** · medium · contradiction · §14.2's `BotDef` drops `limits`, which §7.2's loop and `data/bots.json` use. `placement.spawnerDepthWeight` has no v2 meaning, so bot:rush and bot:turtle need new definitions. `fixedWeights` is needed while `aiWeight` survives.
  - Evidence: §14.2 L2953–2954; §7.2 L986, L995; `data/bots.json`; `src/sim/ai/controller.ts:241`; `src/data/schema.ts:617-622`.
  - Recommendation: keep `limits` (with `afterRound`) and `fixedWeights`; drop `placement`; define rush and turtle as weight profiles.
  - Route: R2-Q6.
- **A045** · medium · ambiguity · "A kit card its weights don't list gets weight 1" has no scope. A single battle gives the general its whole roster, so G4's scripted opponent would buy every Gray Rot building at weight 1.
  - Evidence: §11.11 L2214; §7.8 L1154–1168; §7.9 L1172; G4 L2392; `src/sim/create.ts:108`; `src/run/flow.ts:104-107`; `src/sim/ai/profiles.ts:66-77`.
  - Recommendation: weight 1 applies to cards §7.8 adds to a run kit and to a counter's missing answer. A single battle's general buys only its listed weights.
  - Route: R2-Q4.
- **A046** · medium · gap · A power command queued on a clash's last tick reaches the aftermath and is rejected. That breaks R2's `rejectedCommands = 0` check for bots, and a player's last-moment click is rejected too. The auto policy's "every 20 ticks" also drifts, since `state.tick` counts clash ticks across the battle.
  - Evidence: §14.5 L3219, L3221; §14.6 L3276, L3284; §14.4 L3029; §16 R2 L3678; `src/sim/commands.ts:47-50`.
  - Recommendation: when a clash ends, drop its queued clash commands without a rejection, and say so in §14.5. Run the think every 20 ticks from the clash's first tick.
  - Route: task note (R2a plan).
- **A059** · medium (high in the review, downgraded on re-check) · contradiction · The opening queues `beginClash` for a player-side bot, and the browser loop runs it on the first frame, so `phase=planning` with `player=bot` can't be held, captured or hash-matched.
  - Evidence: §14.6 L3263; §13.5 L2586, L2595; §16 R2 L3704–3705, L3713; §15.6 L3455; `src/app/loop.ts:44-46`; `src/app/main.ts:275-277`; `tools/lib/params.ts:45`.
  - Recommendation: define the checkpoint in §15.6: the round has opened, the general has planned, a bot player's plant, sell and toggle commands have run, and its `beginClash` is still queued. The browser holds there until input, and `tools/lib/params.ts` stops at the same state.
  - Route: task note (R2a plan); SPEC fix.
- **A060** · medium · gap · §14.6 exports no matchup classifier (`classify` is private, so the UI would copy the rule), says nothing of how the ghost's squad is placed, and has no surviving-supply helper.
  - Evidence: §10.2 L1615, L1679; §10.3 L1694; §13.2 L2465–2466; §14.6 L3244–3247; `src/sim/systems/combat.ts:247`.
  - Recommendation: `formationOf(state, side, change?)` and `mergePreview(state, side, change?)` with a hypothetical plant, sell or toggle, both pure; `matchupClass(...)`; `survivingSupply(state, side, lane)`. The formation session builds them and the UI calls them.
  - Route: task note (R2a plan).
- **A061** · medium · contradiction · It's unclear whether `?test=1`'s "instant" aftermath jumps to its final frame or steps to the next round. Under the second reading, `phase=aftermath` captures can't see the aftermath.
  - Evidence: §10.2 L1675; §10.5 L1797; §15.6 L3436; §13.5 L2599; `tools/screenshot.ts:87`.
  - Recommendation: under `?test=1` the aftermath jumps to its final frame (bars drained, banner up, pip filled), and the next round waits for input. With `phase=aftermath` the view holds there.
  - Route: task note (R2a plan); SPEC fix.
- **A064** · medium · gap · §5.7 keeps per-round stats, damage by building included, but §14.4 gives them no shape. Survivors per building in the last clash aren't specified anywhere, yet inspect and the aftermath need them after the units are cleared.
  - Evidence: §10.2 L1614, L1674; §10.4 L1753; §5.7 L756; §14.4 L3101–3109; §15.7 L3486; `src/sim/state.ts:635`; `src/ui/inspect.ts:14`.
  - Recommendation: add `damageByBuilding` and `survivorsByBuilding` per side to `RoundResult` (or `SideStats.rounds[r]`), written when the round is scored.
  - Route: task note (R2a plan).
- **A065** · medium · risk · Space means Begin in planning, pause in a clash and skip in the aftermath, and the three follow each other without a pause. A held or double-tapped Space skips the aftermath and starts the next clash before the player has planned.
  - Evidence: §10.3 L1702; `src/app/input.ts:94-99` (acts on every keydown, repeats included); `docs/playtest-feedback.md:91-92`.
  - Recommendation: keep Space for Begin, but ignore auto-repeat, accept Begin only from a keydown that started after planning opened, and wait about 400 ms. Browser test: holding Space through an aftermath never starts the next clash.
  - Route: R2-Q12.
- **A076** · medium · gap · Three things step 9 checks can't be seen in the five captures it lists: marks while a card is chosen, previews matching the clash's first tick, and the general's formation drawn before the player's first command.
  - Evidence: §16 R2 L3704–3708, L3713, L3715; §15.6 L3424–3446, L3455; `src/app/debugBridge.ts:21-30`; `src/ui/hud/tray.ts:80`.
  - Recommendation: `--click` on a tray card in r2-planning-4; an r2-clash-start capture at `ticks=1&paused=1`; a bridge field (`__GAME__.preview()`) that assertion 4 compares with `formationOf`.
  - Route: task note (R2a plan); SPEC fix.
- **A102** · medium · risk · G3, and above all G12, in round form will likely pass vitest's 600 s per-test timeout if each runs in process in one test. v1's G3 alone took 459 s, and the full counter matrix about 35 minutes single-threaded.
  - Evidence: §12.3 L2400; `vitest.config.ts:7`; `tests/slow/guardrails.test.ts:18-21`; `docs/archive/v1/balance-backlog.md` (L622, L957).
  - Recommendation: split `tests/slow` into files vitest runs in parallel, play G3 and G12 cells through `tools/lib/pool.ts`, and set timeouts from measured runs. If the suite still runs past about 20 minutes, the user chooses whether G12 confirms through `--checks counters`.
  - Route: R2-Q9.
- **A103** · medium · factual · As A027, for `targets.ts` and `effects.ts`; also, the imports of `combat.ts` and `commands.ts` from `spawning.ts` and `stance.ts` aren't in §13.4's retirement row, which names only movement's.
  - Evidence: §13.4 L2557, L2571; `targets.ts:27-44`; `effects.ts:77`, `:121-127`, `:172`, `:191-227`; `combat.ts:6`; `commands.ts:9-10`; §14.2 L2794–2797, L2826–2833, L2841–2842.
  - Recommendation: move both files to "Kept, with v1 parts removed", listing what goes and what §14.2 adds; add the two files' imports to the retirement row.
  - Route: task note (R2a plan); SPEC fix.
- **A104** · medium · gap · Several §15.7 rows marked Kept cover files with v1 cases: Run (drafts, effects, resume) and Sound (v1 battle sounds and `REQUIRED_SOUNDS`). The Rule scenarios row leaves out five scenarios that depend on retired systems.
  - Evidence: §15.7 L3467–3495; `tests/unit/drafts.test.ts:107`, `:183`; `effects.test.ts:83`, `:140`, `:148`; `resume.test.ts:111`; `tray.test.ts:24`, `:66`; `audio.test.ts:205-218`, `:240-255`; `src/data/registry.ts` (`REQUIRED_SOUNDS`).
  - Recommendation: add rows (Drafts and Saves rewritten, Effects DSL, Tray, Determinism), mark Sound's battle cases rewritten, and add merge-under-fire, knit-cancel, elder-showcase, power-demo and merge-trio to Rule scenarios in round form. R2b owns the drafts and saves rows.
  - Route: task note (R2a plan); SPEC fix.
- **A106** · medium · gap · A scenario that starts at round n > 1 can't give the last round's loser (comeback gold) or the earlier rounds' fielded record, which round 4's counter cycle reads.
  - Evidence: §15.2 L3338; G6 L2394; §6.2; §6.5; §7.4 L1053; `src/data/schema.ts:640-650`.
  - Recommendation: per side, `dealt` (default: the other side's max HP minus its HP), the previous round's result, and an optional `rounds` history. Validate that HP lost equals the other side's `dealt`.
  - Route: task note (R2a plan).
- **A107** · medium · ambiguity · G6 doesn't say which seat is behind or what the max HP is. With the default HP, a player 700 below full still has more HP than the general's full Heartcap.
  - Evidence: G6 L2394; §11.1 L1830–1831; `src/sim/create.ts:109`; `tools/lib/balance.ts:424-433`.
  - Recommendation: equal max HP on both sides, the behind side at max − 700, both seats played, as G5 does.
  - Route: #35.
- **A108** · medium · pushback · Pooled over every even pair, G16 is mostly pairs where swapping the ranks only relabels the formation: 29 of 45 pairs are same-role. The 16 real cases would have to win about 78% for the pool to reach 60%.
  - Evidence: G16 L2404; §7.3 L1018; `tools/lib/balance.ts:522-525`.
  - Recommendation: G16 over role-split pairs only (one front-line and one back-line building) at budgets where both fit, at least 60% pooled, with a per-budget column. Report same-role pairs apart.
  - Route: R2-Q10.
- **A119** · medium · contradiction · bench-300 as a clash can't measure "a sim tick with 300 live units" for 2,000 ticks: a clash ends within 900, and with no spawners its units die from first contact.
  - Evidence: §15.4 L3389, L3392; §13.7 L2639, L2652–2653; §6.7 L915; `tools/lib/bench.ts:35-40`.
  - Recommendation: either a test switch that turns damage off so 300 units stay live, or repeated fresh clashes of at most 900 ticks, weighted by live units. Say which in §15.4 and §13.7, and set `G11.benchTicks` to match.
  - Route: R1-Q5; SPEC fix.
- **A152** · medium · contradiction · §10.4 and §15.5 move the plain wording into data at R2's golden refresh, while §16 R4 schedules it for R4, which would move the goldens again. `words.ts` overrides win over data text, so R2's new relic effects would show v1 sentences unless R2 removes them.
  - Evidence: §10.4 L1718; §15.5 L3403, L3411; §16 R4 L3798; `src/sim/state.ts:189-197`; `src/sim/hash.ts`; `src/ui/words.ts:10-23`.
  - Recommendation: strip display text (name, description, text) out of the hashed Library in R2a, so later rewording never moves goldens; R4b then deletes `words.ts`. Otherwise R2 rewrites the texts in the data directly.
  - Route: R2-Q8.
- **A175** · medium · gap · There's no stat-path whitelist, and §5.7 doesn't record several stats the feats read (economy buildings on loam at once, sales of buildings that have fielded, Heartcap damage by building type, economy buildings planted). Adding them in M6 would move every golden a second time.
  - Evidence: §9.2 L1450, L1455, L1476–1481; §5.7 L756–768; `src/sim/state.ts:630-661`; §13.4 L2579.
  - Recommendation: list the feat stats in §5.7 now, so R2a records them when it rewrites stats per round, and put the `StatPath` whitelist in §14.2.
  - Route: M6-Q1.
- **A198** · medium · pushback · With the full reveal and no compensating edge for the general, the player always moves last, and counters bite only when the player lacks the card, plots or gold to answer. The risk that the game is too easy is real but unmeasured, and fixed-weight bots can't show it.
  - Evidence: §1.3 #3 L171; §7.1 L977–984; §7.4 L1053; D37 L4000; comparable games in `docs/archive/v1/ideas/rounds.md`.
  - Recommendation: keep the full reveal as the default (the user's call, F18's fix) and A/B "what it fielded last round" in R2a's playtest. Add the answer-buying bot policy and report G8, G14 and G15 under both policies.
  - Route: R2-Q1; X7.
- **A208** · medium · contradiction · The flat 500 cap binds on most decisive wins from about round 4–5, so late rounds score "won = 500" whatever the margin. That defeats §6.7's "why only survivors count", and leaves the Sporestorm, applied before the cap, with no effect on the rounds it's meant to escalate.
  - Evidence: §6.7 L909, L928, L950; §11.2 (8 supply per spawner plot); D27; Appendix A's timed-Sporestorm row.
  - Recommendation: R1 reports the share of clash records whose §6.7 damage passes 500 at each budget. If most at 900 gold and above are capped, apply the storm to the cap, or let the cap grow by round while lowering damage per supply. Either is a rule change.
  - Route: X5.

#### Low

- **A031** · low · contradiction · The skeptic found no contradiction, only gaps: `homeCols` alone can't say which ranks start open, Twin Roots' 3-file order isn't given, and nothing checks for even `homeCols`. Add `colony: { startRanks: 2 }` to MapDef, order 2, 1, 3 per lane, and redraw test-3lane and test-flat. §4.1 L288, §4.6 L400–402, §14.2 L2957–2960. Route: #19.
- **A032** · low · risk · SPEC makes the muster pure, but not that the arrival applies its side effects once (ids, events, `stats.merges`, Spore Tithe's gold). Test that `hashState` is unchanged after `formationOf` and `mergePreview`, and that Spore Tithe pays once per muster merge. `merging.ts:111-125`; §11.7 L2108. Route: task note (R2a plan).
- **A033** · low · pushback · D45 leaves both sides without a spawner limit in R2a (the general's `maxOwned` caps only Cellars and Mortars). If R1's mono-Burrow G3 is above 55%, give the player an interim limit of 3 per card through `freeCopies`. L120, L344, §11.4 L2036, D38 L4001, §14.6 L3247. Route: X4.
- **A034** · low · gap · Say which side's `beginClash` ends planning; refuse enemy-side planning commands outside the opening's general step, and `beginClash` from any side but the player. §13.3 rule 7, §14.5, §15.7 L3471. Route: task note (R2a plan).
- **A035** · low · ambiguity · The round's result and the Decision can both read `RoundResult.damage` (capped, before the HP floor); only §6.5 L870's parenthetical needs rewording so Mending Moss's heals don't count. §6.7 L932–934, §14.4 L3128. Route: R2-Q11; SPEC fix.
- **A036** · low · contradiction · §15.5 says commands carry their phase, but §14.5's Command has none, and `runHeadless`'s `until` doesn't match the CLI's `r<n>:<tick>`. §15.5 L3399, §14.5 L3171–3172, §14.6 L3235, §15.2 L3340. Route: task note (R2a plan); SPEC fix.
- **A038** · low · gap · The bots' `afterSeconds` limits and `ai.economyEarly` / `economyLate` aren't converted to rounds; follow §7.2 L1010's one round a minute (for example `afterRound: 3`). `data/bots.json:7-48`, `data/balance.json:79-80`, §7.9 L1172. Route: R2-Q6.
- **A040** · low · gap · §5.6's detection leaves out the same-lane condition the code applies (`merging.ts:146`), so a muster built from SPEC would knit across Twin Roots' root wall with a radius bonus. Add "in the same lane" and a Twin Roots muster case with Knitting Circle. §5.6 L693–695, L716–717. Route: R2-Q11; SPEC fix.
- **A047** · low · gap · The aggressive lane rule reads "where the player fielded the least supply last round", but `FieldedSquad` has no lane; add one. §7.3 L1040, §14.4 L3097, L3106; `controller.ts:184-191`. Route: #30.
- **A048** · low · risk · When the Burster Pod and Rhizomorph Tunnel move into data, drop `aiWeight` and both back doors (`src/run/flow.ts:169-170`, `src/sim/ai/profiles.ts:58-65`), or every kit and bot:balanced change silently. Kit test: no Burster Pod in a battle-1 general's kit. `src/data/proto.ts:38`, `:87`. Route: R2-Q5.
- **A049** · low · risk · Once its plots fill (about round 6 of battle 1, sooner later), the general changes its army only at rounds 4 and 7 and banks the rest. Report banked gold and free plots per round; keep a default-off "replace when full" knob. §7.2 L992, L1005; §7.4 L1053–1054; §6.2 L842. Route: X8.
- **A052** · low · risk · Both sides share one `ai` stream, so the general's picks shift with the player-side bot's draws; sub-seed it per side, and test that the general's plan depends only on the fielded record and its own state. §7.1 L979; `src/sim/create.ts:261`; `src/sim/ai/draftPolicy.ts:24`, `:39`. Route: task note (R2a plan).
- **A053** · low · gap · Nothing says whether a power can hit or merge survivors in a Twin Roots lane that has locked; powers skip ended lanes, and the reticle shows 0 targets there. §4.7 L451, §6.7 L918, §6.6 L895; `src/sim/powers.ts:59-102`. Route: R2-Q11.
- **A055** · low · gap · Read literally, §7.4 puts Tender's Ring (slash, 0 damage) in the Anti-Swarm set; say a unit with no damage is in no set, as `counter.ts:30` has it. §7.4 L1070–1075. Route: #15; SPEC fix.
- **A067** · low · risk · A first-time tip pushed while the callout lane is full of pinned items is sliced off screen but marked shown forever. Mark a tip shown only once it's visible, or reserve a slot during planning. `src/ui/callouts.ts:65`; `src/app/tips.ts:114`, `:120`; §10.2 L1622, L1634. Route: task note (R2a plan).
- **A068** · low · ambiguity · On Twin Roots the report's round chart splits each column by lane, but the cap applies to the sum over lanes; scale per-lane damage to the capped total and label it, or show two half-pips. §10.4 L1756, §6.7 L928, §14.4 L3103. Route: task note (R2a plan).
- **A069** · low · ambiguity · A squad that fields as "2 Bloomed + 2" holds tiers a slayer treats differently, but a mark is one class per squad; show the body mark, plus a pips mark when merged units take another class. §10.4 L1728, L1731. Route: task note (R2a plan).
- **A070** · low · gap · The Intent panel's income and buildings sold this round have no per-round state, so they vanish after a command or a resume; record the general's plan per round in state. §7.5 L1117, §10.2 L1619, §14.4 L3045, L3082. Route: task note (R2a plan).
- **A071** · low · ambiguity · The aftermath's result banner belongs in the callout lane but has no priority there; pin it for the aftermath. §10.2 L1634, L1674. Route: task note (R2a plan).
- **A072** · low · gap · §10.2 doesn't say how closed third-rank plots look or what the ghost says on one: dark unlit soil, "opens after a battle won", and the chip counts open plots only. §4.6 L402, §10.2 L1599, L1653. Route: task note (R2a plan).
- **A075** · low · ambiguity · Whether `ticks=` counts from the clash's start or across the battle, and what a `round=` past the battle's end does (from round 7 a human who fields nothing has lost). §15.6 L3437, §14.4 L3029. Route: task note (R2a plan); SPEC fix.
- **A078** · low · contradiction · §13.5 applies speed only in a clash, but the aftermath's length depends on it. The aftermath plays at the clash's speed; the speed control stays live, with pause hidden. §13.5 L2595, L2597; §10.2 L1641, L1675. Route: R2-Q12; SPEC fix.
- **A092** · low · ambiguity · §6.5's "the HP each Heartcap lost" (net) conflicts with §14.4 L3132, under which the Decision compares `RoundResult.damage` (gross); drop the parenthetical. §6.5 L870, §11.7 L2113. Route: R2-Q11; SPEC fix.
- **A110** · low · contradiction · §15.7's Combat row keeps "siege … preferences", but §5.2 L502 says siege units fight the nearest enemy; retire `tests/unit/combat.test.ts:33`. §15.7 L3479. Route: task note (R2a plan); SPEC fix.
- **A111** · low · pushback · Give G6's first clause an upper bound, such as 20–45%. v1's 88% came from territory income, which v2 drops, so the evidence is weak, but the bound is cheap. G6 L2394, #35 L4087. Route: #35.
- **A112** · low · contradiction · bench-300's "both armies in formation" can't come from plots on test-3lane (3 home columns, 5-row lanes); it places its units directly and stays the 300-unit stress case. §13.7 L2638, L2652; §15.4 L3389; `data/maps/test-3lane.json`. Route: R1-Q5; SPEC fix.
- **A113** · low · contradiction · G11, a Node guardrail, is said to include the planning command, whose budget is measured in Chromium and which §15.4 doesn't time. G11 L2399, §13.7 L2642; `tests/slow/guardrails.test.ts:25-33`. Route: task note (R2a plan); SPEC fix.
- **A115** · low · ambiguity · Golden checkpoint keys and their tick basis aren't pinned: §15.2's example hashes by round, §15.5 by phase, and the golden tool keys by absolute tick. §15.2 L3348, §15.5 L3399–3404. Route: task note (R2a plan); SPEC fix.
- **A118** · low · gap · Copying the spore-cloud preset into `data/balance.json` as is would carry `aiCover`, a territory term; adopt it without, and delete `laneCover` and the schema field. `src/data/proto.ts:21`; `compile.ts:102`; `controller.ts:194`, `:249`; `schema.ts:230`; §11.1 L1883. Route: task note (R2a plan).
- **A120** · low · ambiguity · G16 swaps "front and back ranks", which isn't defined for three ranks at the top budgets; swap ranks 0 and 1 with the third left in place, and report 1,200 and 1,500 apart. G16 L2404, §12.2 L2346, §7.3 L1019. Route: R2-Q10.
- **A121** · low · contradiction · As A036: §15.5 L3399 against §14.5 L3172. Also pin `Command.tick`'s basis. Route: task note (R2a plan); SPEC fix.
- **A205** · low · pushback · Interest never poses a real choice: at most +10 against a 100 stipend, so spending wins before the plots fill and banking is free after. Cut it, or make it a stake (1 per 10 gold, up to 30). §6.2 L838, §1.3 #12 L180, playtest F4. Route: R2-Q2.
- **A206** · low · risk · A round in which neither colony changed and no power fired replays the last clash exactly. Pin it with a determinism test, say "same plans as last round" in planning, and let the clash skip to its known result. §4.6 L410; `src/sim/systems/spawning.ts:71`; §7.2. Route: X8.
- **A209** · low · ambiguity · Decision tiebreak 1 is both "damage dealt" and "the HP each Heartcap lost", which differ once Mending Moss heals; use the gross damage applied at step 4, summed from `rounds`, and add a round-9 scenario with a heal. §6.5 L870, §11.7 L2113, #24, §14.4 L3128. Route: R2-Q11; SPEC fix.

### R2b: the run in rounds (39)

#### High

None.

#### Medium

- **A042** · medium · contradiction · §7.6 says the player sees the opening doctrine's effect in the general's opener. But the opener is bought first, at fixed cost, and leaves 0–230 gold, so the doctrine changes at most one round-1 building and usually none.
  - Evidence: §7.6 L1128–1129; §7.2 L994; §6.1 L823; §11.11 L2208–2211; `src/sim/ai/controller.ts:17-32` (`aiOpener` ignores the doctrine).
  - Recommendation: let the doctrine shape the opener: swap its last army card for the cheapest kit card in the doctrine's counter set, when the kit holds one. Or reword §7.6 to say its first visible picks usually come in round 2.
  - Route: R2-Q18.
- **A058** · medium · contradiction · Old Mother Mold's v2 passive is "more bodies for the swarm", but under the muster her 9 Sporelings knit into exactly one Elder: one body instead of four, a ×3 slayer target that reads 100% Elite.
  - Evidence: §7.7 L1137, L1142; §5.6 L729; §5.5; `src/sim/ai/profiles.ts:41` (merging on by default).
  - Recommendation: phrase the passive by what fields after the muster (for example "+1 base Sporeling that never merges", or "+10% HP for swarm units"), or turn her swarm buildings' merging off. A §15.7 case: Mold's Burrow preview shows more bodies than a plain Burrow's.
  - Route: R2-Q17.
- **A062** · medium · pushback · A layout gap, not a pushback. §10.2 wants the general's formation lit under three large draft cards but doesn't place the cards, and today's centred 940 px dialog covers the general's slots at 1280×720.
  - Evidence: §10.2 L1682; §4.6 L320 (the general's slots in columns 19–22); `src/ui/styles.css:436`, `:541`, `:547`.
  - Recommendation: dock the draft as a bottom sheet in place of the bottom band, with shorter cards and details in tooltips, and the field dimmed except the general's preview. A test checks that the draft's box doesn't overlap the general's slots.
  - Route: R2-Q24.
- **A063** · medium · contradiction · R2's lives check and assertion can't pass: the listed battle captures are single battles, which have no lives, and the battle summary has no lives to compare against.
  - Evidence: §10.2 L1596; §16 R2 L3704–3708, L3714; §15.6 L3455; `src/app/debugBridge.ts:60` (the run brief still carries v1's Heartcap).
  - Recommendation: add a run-scene capture (`scene=run&seed=7&player=bot:balanced&round=2&phase=planning`), compare `#hud-lives` with `__GAME__.run().lives` there, and assert it's absent in single battles.
  - Route: task note (R2b plan); SPEC fix.
- **A080** · medium · ambiguity · #27's first guess says dead levels "stop being offered", but tracks are offered in order and the dead levels sit mid-track, so Truffle Cellar L3 and Spore Exchange's interest level become unreachable. `generalKit`'s hard-coded 3 has to follow any change.
  - Evidence: §11.6 L2087; #27 L4079; `src/sim/draft.ts:79-83`; `src/run/flow.ts:35-41`, `:173`, `:183`; `data/upgrades.json`.
  - Recommendation: R2b removes the dead levels from `data/upgrades.json` (Truffle Cellar +12 and +12 a round; Spore Exchange +12 and interest +10; Amanita HP and damage; no Vault track until R3), writes unit levels as fixed `building.squadCount` adds, and maps saved level counts in the migration.
  - Route: #27.
- **A081** · medium · contradiction · §8.9 records a battle's result before its report, but the report has no defined run screen, and §10.5 says an elite's Amber is "rolled on Continue". Today everything applies on Continue, so a reload on the report replays the battle's end.
  - Evidence: §8.9 L1369; §10.5 L1791; §16 R2 L3642; `src/app/run.ts:88`, `:236`, `:258-263`; `src/run/flow.ts:242`.
  - Recommendation: when the battle ends, run all of `finishBattle` (life, Spores, the Amber roll, spoils dealt), save the run, clear the battle save, and show the report from the `BattleRecord`. Show the actual Amber. Define what a reload on the report shows.
  - Route: R2-Q22.
- **A082** · medium · gap · The Grove can dead-end: at full lives its life choice is unlit, and graft is disabled once every owned track is maxed, leaving no legal choice. Full lives will be common.
  - Evidence: §8.7 L1335; `src/ui/screens/run.ts:483-488`; `src/run/flow.ts:350`; `src/run/auto.ts:79-80`; `tests/browser/runScreens.test.ts:151`.
  - Recommendation: a third choice that's always lit (Leave). The auto order: a life if hurt, else graft, else leave. A unit and a browser case for full lives with maxed tracks.
  - Route: R2-Q21.
- **A083** · medium · gap · Three R2 content effects have no working form. Mycorrhizal Link's corners need R3's combos; Forward Spores needs the cloud system whatever R1 keeps; the Rhizome Vault's "beside" has no selector in R2's effect DSL.
  - Evidence: §11.7 L2096, L2109, L2115; §11.2 L1939; #26 L4078; §14.2 L2795–2797, L2816; §16 R2 L3641, L3649; `src/data/schema.ts:667` (`requires: 'powers'`).
  - Recommendation: a `requires` gate ('combos', 'clouds') that keeps such content out of the pool until its system exists. For the Vault, a plot-adjacency selector (`besidePlot`) or an interim effect. R3 owns the Vault's mechanics (A124).
  - Route: R2-Q19; #26.
- **A084** · medium · gap · Migrating a pre-R2 run needs much more than "keeping its kit, relics and progress, with 3 lives", and the title overwrites an unreadable save silently.
  - Evidence: §8.9 L1385–1390; #32 L4084; `src/run/runState.ts:82`, `:122`; `src/run/flow.ts:62`, `:515-517`; `src/ui/screens/run.ts:531-576`; `src/run/resume.ts:27-29`; `src/app/main.ts:207-213`.
  - Recommendation: a pure, version-chained `migrateRun` with a field map. Rebuild a battle screen's config, clear the v1 battle save with the restart notice, and tell "no save" from "unreadable" so the title warns. The `RUN_VERSION` bump and the migration land in the same merge as the first `RunState` change.
  - Route: #32.
- **A085** · medium · pushback · "+1 unit" effects scale with the unit's size, so Home Brood is worth about 9× more on an Amanita Lodge (+50% of the squad) than on a Sporeling Burrow (+12.5%). Fresh Spores, the Vault (#26) and the Shrine follow the same pattern, and Home Brood steers Vesper toward the heaviest unit.
  - Evidence: §11.10 L2194; §11.7 L2104; §11.2 L1919–1926, L1939; `data/commanders.json` (v1's uniform 10%).
  - Recommendation: a uniform Home Brood, such as front-rank squads +10% HP and damage. Keep "+1 unit" for one-clash effects like Fresh Spores, or check the per-building value in R2's measurements first.
  - Route: R2-Q15.
- **A096** · medium · pushback · The muster pre-empts Cordis's identity and the knit-time content that SPEC marks "kept". A knit-time bonus does nothing at the muster, yet §11.10 still says "Cordis's squads knit sooner", and Puppet Bloom finds few trios after a fixed-point knit (A057).
  - Evidence: §5.6 L716, L718; §11.10 L2196; `src/sim/powers.ts:62`; `docs/archive/v1/balance-backlog.md` L1808.
  - Recommendation: give Cordis's knit-time half something the muster uses (a wider muster reach, or merged units starting with +10% HP), give Quick Knit and Knitting Circle muster-relevant effects, and fix "knit sooner". Puppet Bloom's job is A057's.
  - Route: R2-Q7.
- **A097** · medium · risk · The fixed cap against Heartcaps that grow with the battle index makes later battles and the boss long by construction. Routing the boss takes 8 capped wins of 9, so it's nearly always a Decision. No guardrail measures it, and whether a boss Decision pays half is unstated.
  - Evidence: §6.7 L928; §4.5 L369; §1.3 #2 L169; G4 L2392 (only Bogwater, the scripted general); §8.6 L1320, L1323; `src/run/rewards.ts:40-43` (the boss pays 60 Spores and 2 Amber, Rout or Decision).
  - Recommendation: scale the cap with the defender's max HP, or keep 500 and say battles run long late. Add a per-battle-index readout of rounds and Decisions to `tournament --commanders all`, a G4 clause for battles 3+ and the boss, and state what a boss Decision win pays.
  - Route: X5; R2-Q14.
- **A105** · medium · contradiction · #27's "stop being offered" is undefined for a dead level mid-track, and the stat keys §14.2 retires force those levels' data to change anyway.
  - Evidence: §14.2 L2822–2824; §11.6 L2087; #27 L4079; `data/upgrades.json`; `src/data/schema.ts` (`UpgradeTrackSchema`, three levels).
  - Recommendation: pick one rule before the drafts session. Either an `offered: false` flag with the level's effects emptied and `draft.ts` skipping it, or the dead levels removed (A080). Rewrite `goldPerTick` levels as +12 `goldPerRound` and `spawnCount` as `squadCount` +1 per batch.
  - Route: #27.
- **A156** · medium · gap · §15.7 makes R2 rewrite the teaching text (Help, tips, tooltips) for rounds, while R2's scope only removes v1's text and leaves "the rewritten Help" to R4. Nobody owns the five new round tips, the Rounds tab or the round chip tooltips, so R2 and R3 would ship with missing or false teaching text.
  - Evidence: §15.7 L3491; §16 R2 L3645, L3658; §10.2 L1625–1633; §10.5 L1795; §16 R4 L3799; `src/app/tips.ts:25`; `src/ui/help.ts:16`, `:133-180`; `src/ui/hud/explain.ts:1-3`.
  - Recommendation: R2b writes the tip triggers with a first true wording, the Rounds tab and the round chip tooltips; R4b rewords them and adds the shape language to Help.
  - Route: X1; SPEC fix.
- **A197** · medium · gap · Bigger later and boss Heartcaps under a flat 500 cap mostly turn Routs into half-reward Decisions rather than making generals win more, and the boss can almost never be routed: 3600 is 7.2 capped wins.
  - Evidence: §7.1 L984; D28 L3991; §6.5 L870, L877; §6.7 L928; §7.7 L1150 (Fortified ×1.3); §8.6 L1319.
  - Recommendation: a cap that scales with the loser's max HP, so every Heartcap falls in at least 4 capped rounds, with battle-index difficulty from the general's kit and augments (§7.8). Decide what a boss Decision win pays; the reviewer would pay it in full.
  - Route: R2-Q14; X5.
- **A199** · medium · pushback · With 3 lives over 3–4 non-boss battles and a boss loss ending the run, lives rarely bind (three losses in 2.7–8.4% of runs at a 70% win rate), and lives left at the boss are worth nothing. A lost battle costs no relative plot, since the general's colony grows with yours (D49).
  - Evidence: D30 L3993; §8.2 L1214–1218; G14 L2402; G15 L2403; D49 L4012.
  - Recommendation: make lives count at the climax (for example, each life left adds 250 to your boss-battle Heartcap, shown on the boss node), or make sprawl yours alone. Give G15 an upper bound on boss reach, such as 85%.
  - Route: #16; #35.
- **A207** · medium · contradiction · Drafts come from rounds reached, so an early Rout pays less kit than a late Decision: a round-6 Rout gets 2 drafts and a full spoils pick, a round-9 Decision 3 drafts and a 2-card spoils. A player who's ahead gains by not finishing the general.
  - Evidence: §8.3 L1237; §8.6 L1319–1322; §1.3 #2; §6.5; §7.8 (the general takes no drafts).
  - Recommendation: a Rout is never worse in kit than a Decision. For example, a battle that ends before round 7 pays each skipped draft as an extra spoils pick, or the drafts not reached are paid at the spoils screen. Say whether a Decision's "2 cards" means pick 1 of 2.
  - Route: #17.

#### Low

- **A037** · low · pushback · `pendingGold` gives the same state at every decision point as gold paid at once (`gainGold`); the only possible difference, whether `side.incomeMult` multiplies it, is unspecified. Credit it at once with an `effectGold` event shown in the next income, or say `incomeMult` excludes it. §6.1 L821, L823; §14.4 L3060–3061. Route: R2-Q20.
- **A050** · low · ambiguity · The Pale Sovereign's passive doesn't say which counter sets count or when they're read; use the union of its dual doctrine's sets and the active counter's, read at each Begin. §7.7 L1140, §7.6 L1131, §14.2 L2796. Route: R2-Q17.
- **A054** · low · ambiguity · The Sporestorm Sigil's "50% stronger" has no number for Puppet Bloom: Burst damage ×1.5, harvest gold ×1.5, Bloom radius ×1.5 (4.5 tiles), written in §11.7. §11.7 L2118, §14.2 L2815. Route: R2-Q19.
- **A073** · low · contradiction · §10.5 says the run screens change only for lives, copies and the route kit, but the summary reads `BattleRecord` fields R2 retires; add the summary to §10.5 and R2's UI bullet. §10.5 L1781, §8.8 L1361, §14.4 L3166; `src/ui/screens/run.ts:546`, `:561`. Route: task note (R2b plan); X10 (records-2); SPEC fix.
- **A074** · low · gap · R2 rewrites `index.html`'s preview text, but the title screen's blurb says the same v1 thing and the og image is a screenshot of it; add both. §16 R2 L3652; `src/ui/screens/title.ts:50`; `tools/og-image.ts:17-23`. Route: task note (R2b plan); SPEC fix.
- **A079** · low · gap · `scene=draft` breaks under v2's opening: the player-side bot plans after the draft opens, so its plants and `beginClash` are refused. Define it as round 3's planning with rounds 1–2 played, or let the bot's plan wait for its draft. `src/run/scenes.ts:27-28`; §14.6 L3262–3263; §14.5 L3209; #28. Route: task note (R2b plan).
- **A086** · low · ambiguity · `side.powerEffectMult` has an obvious target for Spore Burst and Rhizome Tithe but none for Puppet Bloom: Burst 135 damage, Tithe 3 gold per supply, Bloom radius 4.5, with the preview showing the boosted value. §6.6 L897, §14.2 L2815; `data/commanders.json`. Route: R2-Q19.
- **A087** · low · pushback · Resuming from the Begin save lets a player who saw a bad round reload and replay the identical clash, timing the power with foresight. Save again when a power executes, or accept it and say so in §8.9. §8.9 L1382, §6.6 L890. Route: R2-Q22.
- **A088** · low · risk · "Replaying takes about a second" is optimistic: a late resume replays up to 8,100 clash ticks that start with about 200 units. Add a resume-replay bench case; past about 1 s show "Restoring the battle…" or snapshot each planning start. §8.9 L1384, §13.7 L2637, L2641; `src/run/resume.ts:4`; `src/app/run.ts:214`. Route: task note (R2b plan).
- **A089** · low · factual · §8.9 doesn't version R2's BattleSave, and v1-rules saves already use `v: 2`; R2's is `v: 3`, and `resumeLegacyBattle` and the held-draft boundary code retire. `src/run/resume.ts:37-39`, `:61`, `:101-108`, `:125-139`; §8.9 L1376. Route: task note (R2b plan); SPEC fix.
- **A090** · low · ambiguity · Not an ambiguity: the Sigil and Rot-Eater are gated on round 5 on purpose. Only the Sigil's name and §14.4 L3042's comment ("0 before round 5") disagree with a storm moved to round 4. §6.4 L859, L862; §11.7 L2118. Route: R2-Q19; SPEC fix.
- **A091** · low · gap · Gold earned in a clash has two paths, `gainGold` (Spore Tithe, Rot-Eater) and `pendingGold` (Tithe, Truffle Hunters): same amounts, different readouts. Pick one path. `data/relics.json`; `src/sim/effects.ts:208-211`; §14.2 L2834; §6.2 L835. Route: R2-Q20.
- **A093** · low · factual · §8.3's "a pure function of (…, draft index, …)" is loose v1 wording; the code draws every offer from one draft stream. Reword it, or sub-seed each draft. §8.3 L1267; `src/sim/draft.ts:172`, `:218`. Route: task note (R2b plan); SPEC fix.
- **A094** · low · gap · Rhizome Tithe in rounds needs a per-clash count of killed supply, a rule for merged units and emplacements, a refusal rule and an auto policy. Add `ClashState.killedSupply`, allow firing at 0, and fire below 25% enemy supply or at 40 s. §11.10 L2195; §14.4 L3052–3065, L3091–3094; `src/sim/powers.ts:118`, `:168`, `:183-186`. Route: R2-Q16.
- **A095** · low · risk · `KitCard[]` in R2 is refactor scope (79 references in 23 files) with no R2 behaviour; keep `kit: string[]` until R3 and its migration. §14.4 L3138, §14.2 L2847. Route: R2-Q23.
- **A098** · low · ambiguity · `RunState.plots` is "the colony's plot count", but §4.6 has the run carry plots gained, and the general's colony counts only sprawl's; rename it `plotsGained`. §14.4 L3142, §4.6 L400, L403–404. Route: #18; SPEC fix.
- **A099** · low · ambiguity · Martyr's Bloom ("when the last unit of one of your squads dies") is undefined once muster knits move units into another squad's credit; membership follows `sourceBuildingId` after the muster, and an absorbed squad doesn't burst. §11.7 L2119, §14.2 L2828, §5.6 L706, L717. Route: R2-Q19.
- **A100** · low · gap · R2's interim upgrade levels touch `generalKit`, which assumes 3-level tracks and v1's `spawn`; read track length from data, filter on `squad`, and test Veteran on an Amanita Lodge. `src/run/flow.ts:173`, `:183`; §11.2 L1917. Route: #27.
- **A114** · low · ambiguity · R2's "nothing from the retired list remains" names no single list, and Appendix A holds rows that retire in R3 or R4; tag each row with its milestone, and check the R2 rows. §16 R2 L3645, L3663; Appendix A; `src/render/renderer.ts:25`; `src/sim/stats.ts:12-19`. Route: task note (R2a plan tags the rows, R2b checks them); SPEC fix.
- **A117** · low · risk · After R2, an old `?proto=rework` link plays the shipped rules but saves under a prototype key, with only a console warning. Show a notice and open no prototype save space; update `docs/status.md`'s links. `src/app/content.ts:9-15`; `src/app/main.ts:109-111`, `:130`. Route: task note (R2b plan).
- **A201** · low · gap · Each commander's starter answers only one of the two battle-1 generals, so battle 1's difficulty depends on the pairing until round 3's draft. Measure per commander and general in G14 first; the reviewer's pick is one free blueprint from the always-in set in battle 1. `data/commanders.json`; `src/run/route.ts:89`; §7.8 L1164; §11.4 L2042–2043. Route: R2-Q13.
- **A204** · low · contradiction · G8 (a single battle, 40–65%) and G14 (runs with drafts and commanders, 70–90%) are different setups, so they don't contradict, but SPEC should say why the bands differ by 25 points and set both from one measurement. G8 L2396, G14 L2402; `data/balance-targets.json`. Route: #35.

### R3: the kit (29)

#### High

- **A122** · high · pushback · §18.2 #42 already asks whether the general needs more copies. This finding adds the arithmetic: under the first guess the general has 2–5 copies in battle 1 (Mold: 2 Burrows, 220 of roughly 1,200–1,500 gold), so §7.4's ×3 lean and its selling for room almost never fire, and only the one-copy missing answer can change its army. G8's 20-point drop and G14's band are at risk.
  - Evidence: §7.8 L1164–1165; §7.4 L1099–1101; §6.2 L840–842; #42 L4094; `data/generals.json`; `src/sim/ai/controller.ts:162` (`maxOwned` is today's only limit).
  - Recommendation: settle #42 with this arithmetic before building the general's kit. The reviewer's pick: copies that scale with the battle index (2 per opener card + 1 per card per battle index, bounded by its plots), with a counter card arriving at 2 copies. Or keep `maxOwned` until R3 measures. Measure G8, G14 and the general's unspent gold either way.
  - Route: #42.
- **A194** · high · contradiction · #42's first guess can't work with §7.8's battle-1 kits. From R3, Mold and the Baron can field at most 2 spawners on 8 plots and bank gold they can't spend, against a player with 4 spawner copies and up to 3 drafts a battle. It also leaves open whether a card listed twice in an opener gives 2 copies or 4.
  - Evidence: §7.8 L1164–1165; #42 L4094; `src/run/flow.ts:163` (`[...new Set(g.opener)]`); `data/generals.json`; §7.1 L977–984; §7.2.
  - Recommendation: size the general's copies to its colony, for example ceil(open army plots / army cards) + 1, recomputed per battle and shown on its route node, or keep `maxOwned`. Say how a repeated opener entry counts (A141). Test that its free copies cover its open plots at every battle index.
  - Route: #42.
- **A123** · high · gap · No augments are written for the pack buildings or the Truffle Cellar. They hold 9 of today's 14 upgrade tracks, and the general's i − 1 and Veteran draws need augments on them. Armilla's starter includes the Mortar and the Blightwright opens with a Rootbreaker Den, neither of which has one.
  - Evidence: §11.13 L2239, L2262; §16 R3 L3738; §11.15 L2301–2310; `data/upgrades.json`; `data/commanders.json`.
  - Recommendation: decide R3's content scope. The reviewer's pick: retire all 42 levels (none clears DR-7's bar, L2275) and write one augment for each pack spawner (Rootbreaker, Mortar, Scythecap, Veilstalker, Tender, Morel, Rhizomorph). Economy and utility buildings get none.
  - Route: R3-Q2.

#### Medium

- **A124** · medium · gap · The Rhizome Vault's first-guess effect has no form in the DSL: there's no adjacency selector, and neither `UnitPatch` nor `ComboDef` can add units to a squad. #26 is settled in R2, but R2's scope doesn't build it. Some levels (range, squad size, economy) also have no augment form, though R3 may retire them.
  - Evidence: §11.2 L1939, L1945; #26 L4078; §14.2 L2797, L2820, L2852–2862, L2877–2882, L2888; `data/upgrades.json`.
  - Recommendation: add `squadAdd` (and `rangeAdd` if wanted) to `UnitPatch`, and allow a combo whose partner is a utility building. The Vault becomes a combo (a spawner beside the Vault: `squadAdd: 1`), which also gives the Velvet Shrine its form. Say in §16 that R3 owns the Vault's mechanics.
  - Route: #26.
- **A125** · medium · gap · The general's augment draws can outrun the augments that exist, and there's no rule for that. `GeneralDef.augments` reads like an ordered list, while §7.8 draws augments at random. The Blightwright at battle index 4 as an elite needs 8 augments; 6 exist for its kit.
  - Evidence: §7.8 L1161, L1168; §7.7 L1151; §11.13 L2245; §14.2 L2933; `data/generals.json`.
  - Recommendation: draws skip cards with no eligible augment left; Veteran adds one to each army card that still has one; `GeneralDef.augments` is an optional whitelist or weighting, not a fixed order. A unit test for a kit with too few augments.
  - Route: R3-Q3.
- **A126** · medium · gap · No order is given among taunts, combo target priorities, the preferred-class rule and stickiness, and four §11.13–§11.14 examples depend on it (a Veilstalker beside a Holdfast Capguard and a Bloomed unit; a Rhizomorph surfacing near a Spotted Screen Knight).
  - Evidence: §5.2 L499, L503; §14.2 L2860–2861.
  - Recommendation: one ordered list in §5.2: the unit's own combo target priority, then an enemy taunt (if the taunter is a candidate), then the preferred class, then the nearest. A taunt counts as a preferred-class candidate for stickiness.
  - Route: R3-Q5.
- **A127** · medium · gap · Combos are per squad, but squads knit across buildings at the muster, and nothing says which combos a merged unit keeps. #38 asks only about augments.
  - Evidence: §5.6 L706, L717; §14.4 L3089; §11.14 L2274; `src/sim/compile.ts:318`.
  - Recommendation: a merged unit keeps a combo only if every parent had it, and keeps its building's augments. The merge preview shows the result.
  - Route: #38.
- **A128** · medium · ambiguity · R3's bar, "a card that changes the rules owned at the end of at least 30% of runs", is near-automatic if every augment counts: every augment changes how units play, and runs see about 10 augment cards each. The 17% it compares with counted 4 of 21 relics.
  - Evidence: §16 R3 L3769; §1.3 #7; `docs/archive/v1/ideas/after-the-rework.md:98`.
  - Recommendation: name the qualifying cards in data (a `rulesChanging` tag on the matchup-flipping rare augments and the rule-changing relics), or redefine the bar as "a rare augment or a rule-changing relic".
  - Route: R3-Q7.
- **A129** · medium · ambiguity · The card check's bars are in "points of runs won", but the proposal it cites measures battle win rate with the card given from the start. The two differ several-fold in cost and meaning.
  - Evidence: §16 R3 L3767; `docs/archive/v1/ideas/after-the-rework.md` L541–546; `docs/archive/v1/ideas/after-the-rework/proposals/b-builds.md` (B8).
  - Recommendation: measure cards per battle as B8 does, and keep "runs won" for the commit-against-random bar in `--checks runs`.
  - Route: R3-Q7.
- **A130** · medium · gap · Nothing says what happens to a run saved in R2's format (a kit without copies, upgrade levels, pending upgrade prompts) once R3 lands. §8.9 covers only saves from before R2.
  - Evidence: §8.9 L1383–1387; §13.8 L2668; `.claude/rules/storage.md`; `src/run/flow.ts` (`recoverPendingChoice`).
  - Recommendation: R3 bumps `RUN_VERSION` and migrates: starters ×2, other cards ×1, upgrade levels dropped with a notice, packs dealt from the saved seed, a pending upgrade prompt turned into a 1-of-3 augment choice. Test it.
  - Route: R3-Q6.
- **A131** · medium · risk · R2 already has to compile unit stats per squad (A028). R3 should extend that structure with augment and combo patches rather than build a second one, and per-hit triggers need a bench gate with full colonies.
  - Evidence: `src/sim/compile.ts:318`; `src/sim/effects.ts:88`; §11.14 L2285; §14.2 L2863–2870; §13.7.
  - Recommendation: one `CompiledSquad` (base unit, side modifiers, building augments, squad combos), designed once and reused by the augment and combo sessions, which are gated on `npm run bench` with both colonies full and every augment active.
  - Route: task note (R3 plan).
- **A144** · medium · gap · The general's augment draw has no rarity rule. Drawn uniformly, as v1's levels are, half its augments on 5 of the 6 core archetypes are rare matchup flippers, against 5% rare in the player's battle-1 drafts. Mold in battle 2 has a 50% chance of Tough Caps, which flips Vesper's starter Capguards.
  - Evidence: §7.8 L1168; §11.13 L2241, L2249–2260; §8.3 L1254; §5.8 L808; `src/run/flow.ts:179`.
  - Recommendation: draw the general's augments with the draft rarity weights for its battle index (elites +10 rare, as for spoils), or keep rare augments for elites and the boss. A unit test of the mix over many seeds.
  - Route: R3-Q3.
- **A145** · medium · gap · Copies are defined only for run kits. Single battles give each side the whole faction roster with no copy rule, yet G3, G8, G12, the clash check, the goldens and `npm run sim` all run on single battles. #51 asks only about mono bots.
  - Evidence: `src/sim/create.ts:108`; `data/generals.json` (scripted: "single battles keep the whole roster"); §7.8; §8.10; G8 L2396; G12 L2400.
  - Recommendation: one rule for every side in a single battle, settled with #51: a single battle at battle index i gives each side what a run would hold at i, or reference bots get unlimited copies with plots binding. Apply it to the general too, and state it in §12.2 and §15.2. If X4 brings copies into R2a, this moves with it.
  - Route: #51; X4.
- **A146** · medium · risk · Copies count across the whole colony, but Twin Roots fights two clashes on 12 plots. A battle-1 or battle-2 general with 2–4 army copies leaves a lane thin or empty, so the player wins it uncontested. Battle 1 is on Twin Roots in about 1 run in 3.
  - Evidence: §8.10 L1393; §4.6 L389; §7.8 L1164–1165; §7.3 L1038–1040, L1043; `src/run/route.ts:48-58`.
  - Recommendation: settle with #42: scale the general's opener copies by lane count, or keep `maxOwned` on two-lane maps until measured. Add a Twin Roots battle-1 slice to G14.
  - Route: #42.
- **A153** · medium · contradiction · §14.2 L2971 and #39 say merge-perk resistances count toward a hit's effectiveness class; §5.3 L642 and the code say they don't, and §5.3 L640 already counts augment and combo matchup changes. Under today's rule an Elder Capguard (resist pierce ×0.7) still shows a pierce "strong" mark while hits land at ×1.05.
  - Evidence: §5.3 L640, L642; §14.2 L2971; #39 L4091; `src/sim/systems/combat.ts:242`, `:297-298`.
  - Recommendation: fix L2971 and #39's wording to match §5.3, then decide #39 against L640. R4b's mark tests follow the chosen rule.
  - Route: #39; SPEC fix.

#### Low

- **A132** · low · ambiguity · #48 limits only the general's extra blueprints to the run's pool; its opener, the boss's counters and in-battle missing answers still come from the whole roster. Draw all but the opener from the always-in set, the dealt packs and the player's commander core. §11.15 L2316, §7.4 L1100, §7.8 L1162; `src/sim/ai/counter.ts:257-268`; `src/run/flow.ts:191-195`. Route: #48.
- **A133** · low · pushback · With 2 augments written per core archetype, #38's first-guess cap of 2 per building type is vacuous; cap at 1, or write 3 per archetype. §11.13 L2239, L2245; §8.3 L1253. Route: #38.
- **A134** · low · gap · R3's bar needs `--auto-draft commit`, which is missing from R3's Tools bullet and §15.2; "today" means greedy against random. §16 R3 L3768, §15.2 L3343; `src/run/auto.ts:17`; `tools/lib/engagement.ts:182`. Route: R3-Q7; SPEC fix.
- **A135** · low · pushback · The always-in set's area archetype is in the pool but rarely offered early (an uncommon blueprint, about 7% per battle-1 draft); make it common or weight always-in blueprints ×2, and report "swarm answer owned by battle 2". §8.4 L1278; §8.3 L1254, L1260; `src/data/proto.ts:84`. Route: R3-Q4.
- **A136** · low · risk · "Tune the data before starting R3" blocks R3 work that needs no tuned numbers, and R3's copies undo much of R2's tuning of the general and the economy; start R3's data-model sessions once R2's code is merged. §16 R3 L3728. Route: R3-Q1.
- **A137** · low · risk · Once copies bind (about round 5 of battle 1), spare gold flows into rerolls (200 gold buys 5), which weakens draft scarcity; report unspent gold and rerolls per draft. §8.3 L1264, §6.2 L842, D34 L3997. Route: R3-Q7.
- **A138** · low · ambiguity · Mycorrhizal Link's "combos also link at corners" doesn't map onto in front of, behind and beside, and the relic is dead between R2 and R3. A corner plot satisfies "beside", and "in front of" or "behind" by its rank difference; keep it out of R2's pool. §11.7 L2115, §11.14 L2273, §4.6 L396. Route: R3-Q5; R2-Q19.
- **A139** · low · gap · Hardy Spores and Second Flush are unreachable while the Air pack waits for flyers; treat them as unpacked relics, or give the Air slot a stand-in building. §11.15 L2310, L2315; §8.4 L1282. Route: X9; SPEC fix.
- **A140** · low · contradiction · R3's scope says every non-core building enters a run "only through run packs", but commander cores bring pack buildings too. §16 R3 L3737, §8.4 L1277, §11.10 L2198. Route: task note (R3 plan); SPEC fix.
- **A141** · low · ambiguity · Mold's opener lists the Burrow twice, so "2 copies of each opener card" could give 2 or 4. Copies count distinct opener cards; a repeat only orders round 1's plants. `data/generals.json`; §7.8 L1165; `src/run/flow.ts:163`. Route: #42.
- **A142** · low · ambiguity · Splash and status rules are loose for Red Charge, Shockwave, Sunder and Sticky Darts. A splash hits the other units in the radius, not the target; the matrix applies by the weapon's damage type; statuses of one kind refresh without stacking. §11.13 L2255, L2257; §14.2 L2873. Route: R3-Q5.
- **A143** · low · gap · The general's combo placement term has no weight, and §15.6 can't stage kits, copies or augments for R3's browser checks; a first guess of +3 per combo the plot makes, and scenarios that carry `KitCard[]` and augments. §7.3 L1034; §16 R3 L3774; `src/data/schema.ts:634`. Route: R3-Q5.
- **A147** · low · gap · Two packs' buildings depend on R1's result: if R1 drops the Rhizomorph, Deep Roots has no building, and if the Mortar becomes the sixth archetype and the Burster goes, Bastion has none. A pack whose building isn't in the roster is never dealt, and its relics join the unpacked pool. §11.2 L1944, §16 R2 L3646, §11.15 L2313, L2315. Route: #46.
- **A163** · low · ambiguity · "Pips" mean four things on one screen: copies, merge tiers, the round tally and the slayer's matchup mark. Give copies a different glyph (a "2/3" count), and keep pips for merge tiers. §10.2 L1610, L1642; §5.8 L777, L797; §10.4 L1728. Route: R3-Q8.

### R4: readable armies (17)

Each entry names its half: R4a (the shape language on the field, now) or R4b (marks in full, card text, icons and Help, after R3), as X3 splits them.

#### High

- **A148** · high · gap · R4a · There's no measurable definition of a body-size band or of a weapon mark, and `SpriteDef` has no field for either, so R4's two data checks have nothing to test. Today's sprites break size-by-armor both ways, and any bands must also fit §4.6's squad spacing (A165).
  - Evidence: §14.3 L2977 ("about 10–14 px"), L2981 (one band per class, no numbers); §16 R4 L3811; §11.3 L1975, L1982; §10.4 L1726 ("24–28 screen px" at 2×, which disagrees with L2977); `src/data/schema.ts:494-511`; `data/sprites/units.json` (Amanita Knight 14×13 against Rootbreaker 14×13; Gill Archer 10×13 as tall as Capguard 12×13; Morel Runner 10×11 smaller than Tender 11×12).
  - Recommendation: annotate each unit sprite with `shape { body, mark, markKeys }`. Size is the opaque bounding-box height without the mark, with bands at least 3 px apart (8–9, 11–12 and 15–16 px, L2977 widened to about 8–16). `src/data/registry.ts` checks every frame against them.
  - Route: R4-Q1 (X3).

#### Medium

- **A077** · medium · factual · R4a · Twin Roots never renders at 2× in a 1280×720 window, yet §10.4's MUST and #52's first guess assume the field is at 2×. The field gets about 370 px for 208 native px, so `fit()` picks about 1.78×, and R2a's pips, previews and marks draw at that scale too.
  - Evidence: `data/maps/twin-roots.json:4-5`; `src/ui/styles.css:139`, `:225`, `:254`; `src/app/battleView.ts:317`, `:319-322`; §10.4 L1719, L1724; #52 L4108.
  - Recommendation: state the scale per map in §10.1. Make Twin Roots the worst case for R4's readability gate (units about 21–25 px there), or give two-lane maps a slimmer bottom band: 2× needs the bands to total 272 px at most, against 334 today.
  - Route: #52; SPEC fix.
- **A149** · medium · contradiction · R4a · R4's check "every unit carries its damage type's weapon mark" contradicts the area mark for burst units and the Tender's heal mark. Taken literally it demands a hammer on the Burster (crush in data) and a blade on the Tender (slash, 0 damage).
  - Evidence: §16 R4 L3811; §5.8 L784; §11.3 L1979; #55; `src/data/proto.ts:80`; `data/factions/velvet-bloom/units.json` (`tender`).
  - Recommendation: the check reads: the area mark if the unit has the `burst` tag; the heal mark if it heals and deals no damage; otherwise its damage type's mark, with pierce an arrow when `projectileSpeed > 0` and a spike otherwise.
  - Route: R4-Q2; SPEC fix.
- **A150** · medium · contradiction · R4a · §11.3 gives the Scythecap "a blade with the area mark", but §5.8 says cleave never changes a unit's mark and the area mark only ever replaces a type's mark.
  - Evidence: §11.3 L1981; §5.8 L784; `data/factions/velvet-bloom/units.json` (`scythecap` splash 0.8).
  - Recommendation: the blade only. Cleave already shows as a spark on every unit it hits (§10.4).
  - Route: R4-Q2; SPEC fix.
- **A151** · medium · pushback · R4a · Giving splashing emplacements the area mark in place of their type's mark contradicts §5.8's table, where area "ignores armor", and its rule that the shape tells the base matchup. The Mortar's shells are crush through the matrix: ×1.5 against heavy, ×0.75 against light and medium.
  - Evidence: §5.8 L784, L798, L803; `data/factions/velvet-bloom/buildings.json` (`puffballMortar` crush); `src/sim/systems/combat.ts:176`, `:241`; `src/sim/systems/clouds.ts:79` (only bursts skip the matrix).
  - Recommendation: keep the area mark for armor-ignoring damage (bursts). A splashing emplacement keeps the hammer, with a small splash accent. It matters more if the Mortar becomes the sixth archetype (#36).
  - Route: R4-Q2.
- **A154** · medium · gap · R4a and R4b · Matchup marks have no glyph for Structure targets, so crush, siege, slash and pierce cards can't show how they fare against an emplacement, and Structure has no body band. The 32×32 tower art fits a slot; only its weapon mark is missing.
  - Evidence: §5.8 L777, L790–798; §4.4 L355; §11.2 L1941, L1946; `data/balance.json` (structure column); `data/sprites/buildings.json`.
  - Recommendation: R4a draws emplacements with a slot-sized sprite carrying their weapon mark (the Rootgate has none). R4b adds a structure glyph (a stump or a block) to the marks. Record that Structure has no body band.
  - Route: R4-Q5.
- **A155** · medium · gap · R4b · R4's planning screenshot can't show augment icons, since the scripted general holds none at battle index 1, and nothing verifies the in-full marks on the planning screen. R2's own check of basic marks (L3715) has the same hole (A076).
  - Evidence: §16 R4 L3816, L3826; §10.4 L1731; §7.8.
  - Recommendation: `--click` on a tray card, and a battle index or scenario where the general holds augments. Cover the reverse hover in a marks browser test.
  - Route: task note (R4 plans).
- **A157** · medium · ambiguity · R4b · It's unclear whether "no card face carries a sentence" covers draft and spoils cards, which §10.2 says show effect text. A relic or an augment has no shape to show.
  - Evidence: §16 R4 L3798, L3806; §10.2 L1682; `src/ui/words.ts:19`; `src/ui/cards.ts:96`.
  - Recommendation: the rule covers the kit tray and the run bar. Draft and spoils cards keep one effect line, about 12 words at most, with numbers as chips. The browser test checks it.
  - Route: R4-Q6.
- **A158** · medium · risk · R4a · As A077: Twin Roots draws the field at a fractional ~1.78×, so marks and pips land unevenly, and R4 checks readability only at 2×.
  - Evidence: `src/ui/styles.css:139`, `:225`, `:254`; `src/app/battleView.ts:316-322`; `data/maps/twin-roots.json`; `tests/browser/frame.test.ts:32`; §10.4 L1726; #52.
  - Recommendation: a Twin Roots lineup screenshot, and marks and pips at least 2 native px wide.
  - Route: #52; SPEC fix.
- **A159** · medium · risk · R4a · Under both colour-blind filters the team tones keep a hue difference but almost no lightness difference (contrast 1.00–1.17), which is marginal on small sprites. §2 defers the check to M7, while R4's checklist runs it with the assist off.
  - Evidence: §2 L237; §10.4 L1768; §16 R4 L3827; `tools/screenshot.ts:79-80`; `data/factions/gray-rot/faction.json`.
  - Recommendation: move the check into R4a with a unit test, and give the Gray Rot's swap tones a lightness offset (a darker ash body) for at least 1.5:1 under both filters.
  - Route: R4-Q4; SPEC fix.
- **A165** · medium · gap · R4a · Body bands have to fit §4.6's squad grid: at k = 3 (squads of 5–9) the spacing is 10.67 native px, at k = 4 it's 8 px. Medium or big bodies in squads of 5 or more overlap in the formation preview, where R2a's playtest asks players to read the general's army. A Veilstalker (12×12) and a Capguard (12×13) already exceed 10.67.
  - Evidence: §4.6 L411–412; §11.2 L1922–1942; §4.4 L353; `data/sprites/units.json`.
  - Recommendation: state the bands in §14.3 as widths that fit the grids (small ≤ 9–10 px wide, medium ≤ 10–11), with height carrying the size difference, or accept the overlap. Put the weapon mark on each sprite's front edge. A unit test compares every unit sprite's opaque width with 32/k for its squad.
  - Route: R4-Q1.
- **A166** · medium · risk · R4b · Weak-class marks are "drawn like that class's hit spark", and the weak spark is the same gray as the Gray Rot's body (#8d8794 against #7d8a7a, contrast 1.04), so weak marks on enemy squads, the main planning read, nearly vanish.
  - Evidence: §10.4 L1728, L1731; `src/render/effects.ts:59-61`; `data/factions/gray-rot/faction.json`; `tests/unit/contrast.test.ts:10-12` (CSS tokens only).
  - Recommendation: give marks, and the weak spark, a dark outline and a shape distinct from the strong mark (a down-chevron against a burst). Extend the contrast test to each mark tint against both factions' body tones.
  - Route: R4-Q6.

#### Low

- **A160** · low · gap · R4b · The field-overlay icons (augment, combo, mark, pip) aren't sized; at the ui sheet's 16×16, each covers a quarter of a 32 px slot. Make them 8×8, drawn at 1× on the field and 2× in the DOM. §13.6 L2619; `data/sprites/ui.json`; `src/ui/styles.css:135`. Route: R4-Q6.
- **A161** · low · gap · R4b · "Every augment has an icon" is met trivially by the schema and R3's placeholders; check that each augment's and combo's icon resolves, is unique and isn't a placeholder, and add combo icons to R4's scope. §14.2 L2880, L2886; §16 R4 L3795, L3811; `src/data/registry.ts:172-174`. Route: task note (R4 plans).
- **A162** · low · pushback · R4a · With 3×2 pips and the Elder aura as the only tier cues, an Elder with ×7.84 HP and damage may read like its base unit. Keep size for armor, but add a rim per tier (lilac Bloomed, gold Elder), pips at least 2 px tall, and "could you spot the Elders?" at the playtest. §1.3 #9 L177; `src/render/renderer.ts:720-728`. Route: R4-Q3.
- **A164** · low · risk · R4b · The compact tray (14 cards) has to fit a sprite, name, role, copies, squad size and up to three marks per card; group marks into one strong and one weak row, and say what the compact card drops first. §10.2 L1642, L1645; `tests/browser/hud.test.ts:98`. Route: R4-Q6.
- **A167** · low · gap · R4b · Card marks list matrix and tag classes separately, but the slayer tag multiplies the matrix, so a Veilstalker card shows "weak against big" and "strong against pips" at once, and both light against a Bloomed Amanita Knight (a real hit of ×2.25). Light card marks from the combined class the planning marks use. §5.8 L796–797; §10.4 L1730; §13.2 L2466; `src/sim/systems/combat.ts:223-228`. Route: R4-Q6.

### M6: meta-progression, with records-1 and records-2 (17)

Four findings are about "Run it back, and records", §16 M6's independent piece, which X10 splits into records-1 (now) and records-2 (after R2b): A172 and A179 (records-1), A185 and A186 (records-2).

#### High

- **A168** · high · gap · §9.2's example table names a feat for only 3 of the 9 shippable pack buildings (Scythecap Grove, Veilstalker Hollow, Tender's Ring), and Root and Branch has lost its target. Six pack buildings have no unlock source, so the ladder stalls once those three are unlocked. Dealing no packs on run 1 is intended (§9.2, #60).
  - Evidence: §9.2 L1457–1459, L1465 ("for example"), L1469–1483; §11.15 L2297–2310; §16 M6 L3841; `src/sim/create.ts:177-188` (`draftPool` has no unlock filter).
  - Recommendation: give every pack building its own feat, ordered by what each teaches, about 20 feats with the commander, strain and relic unlocks. Decide whether a building in a commander's core counts as unlocked for packs (#59). Consider dealing min(4, unlocked) packs so early runs still differ (#60).
  - Route: M6-Q3; #59; #60.
- **A169** · high · gap · §9.5 promises each commander an alternate power, a starter option, two passive upgrades, an exclusive relic and two strains, and SPEC names none of them: 21 items. Strain sources are unassigned too: 5 of §11.5's 12 have a feat, the 6 mastery slots name no building, and the new core archetypes' strains have no source.
  - Evidence: §9.5 L1519–1529; §16 M6 L3845; §11.2 L1940–1942; §11.5 L2057–2068, L2071; §9.2 L1475–1479; §14.2 L2905.
  - Recommendation: a per-commander mastery table with first guesses: 3 alternate powers, 6 passive upgrades, 3 exclusive relics, 3 starter alternates and 6 mastery strains with their buildings. `unlockedBy` names a feat or `mastery:<commander>:<level>`.
  - Route: M6-Q4.

#### Medium

- **A171** · medium · contradiction · Mastery level 10 adds 3 commander blights beyond the release's 6, and three M6 rewards depend on M7's blights (Boss Down's Blights, Into the Rot's Decay 3 and its relic). M6 can't reach its pacing target with M6's content.
  - Evidence: §9.5 L1529; §9.6 L1537; §11.8 L2150; §17 #15 L3961; §9.2 L1482–1483; §16 M6 L3871.
  - Recommendation: count 6 general blights plus 3 commander blights in the release and reword §9.6, §11.8 and §17 #15, or give level 10 another reward. Ship mastery levels 2–9 in M6 and level 10 in M7, and scope M6's pacing check to M6's content.
  - Route: M6-Q4.
- **A172** · medium · contradiction · records-1 · §9.7 puts the settings and the run in progress inside the profile, but both have fixed keys that must never change. The profile also has no place for records or the last commander, which Run it back needs.
  - Evidence: §9.7 L1543; §13.8 L2663–2667; `src/app/settings.ts:10`; `src/run/resume.ts:11`; §16 M6 L3850–3853.
  - Recommendation: a meta-only profile: Spores, Amber, unlocks, feats, traits, Root Capacity, strain ranks and choices, commander XP, best Decay, the last setup (commander, bans, traits, strains, blights), records and the codex. Settings, tips and the run keep their keys; the export bundles them under its own version.
  - Route: RB-Q1; SPEC fix.
- **A173** · medium · gap · Pivot's reward, Second Flush, can't reach a run in the first release, and neither can Hardy Spores: both sit in the Air pack, which waits for flyers.
  - Evidence: §9.2 L1481; §11.15 L2310, L2315; §1.3 #11 L178; §8.4 L1281; §18.2 #65–#66.
  - Recommendation: until flyers ship, take the Air pack's relics out of packs (so they're in every pool) or move them to shipped packs, and point Pivot at a reward that can appear.
  - Route: X9.
- **A174** · medium · gap · `StrainDef`, a partial building and unit patch, can't express half of §11.5's strains: Teeming's knit time is a side stat, Wild Truffle needs a loam bonus and an off-loam selector, Deep Truffle a rank selector, and "HP ×0.8" can only be an absolute number. The Puppet Pod's knit time has the same problem.
  - Evidence: §14.2 L2808, L2905–2908; §11.5 L2057, L2067–2068; §11.2 L1942.
  - Recommendation: add `effects?: EffectBundle` to `StrainDef`, scoped to its building, for multipliers and side stats. Keep `patch` for structural fields (squad count, on-death, merge perks), and have the whitelist test cover both.
  - Route: task note (M6 plan).
- **A176** · medium · gap · SPEC doesn't say when an unlock takes effect: feats are checked at the end of every battle, but packs are dealt at run start. `RunState` has no fields for the run's unlocks, traits, strains, blights or Decay, and `src/run` can't import `src/meta`.
  - Evidence: §8.6 L1328; §8.1 L1188; §14.4 L3014, L3134–3153; `eslint.config.js:61-65`.
  - Recommendation: unlocks earned mid-run apply from the next run. Add a meta snapshot to `RunState` (unlocked, traits, strains, strain ranks, blights, Decay), set at `createRun` from the profile.
  - Route: M6-Q2.
- **A177** · medium · ambiguity · The pacing check can't be run as written: "content" is undefined, trait prices and the bot's spending policy are missing, and a 40-run sim can't show run 45. Rough arithmetic puts mastery and strain ranks past 45 runs (level 10 needs about 17 runs per commander; ranks about 55).
  - Evidence: §16 M6 L3868–3871; §9.8 L1551–1553; §14.2 L2909; §8.6 L1316–1322; §9.5 L1517; §9.3 L1490; §9.4 L1509.
  - Recommendation: define content as unlock ids (feat unlocks, traits, capacity steps, mastery levels), not ranks; give trait prices; specify the sim's policy (cheapest capacity step first, then the cheapest trait; play the least-mastered commander); run at least 50 runs; then re-check the XP curve.
  - Route: M6-Q8.
- **A179** · medium · gap · records-1 · SPEC doesn't say where Run it back's records live, how they're versioned or how they relate to M6's profile. The source idea's decision about prototype keys was dropped, and M6 expects a `profile-v1.json` fixture though no profile v1 is defined.
  - Evidence: §16 M6 L3848–3853, L3863; §9.7 L1542–1543; §9.6 L1536; `src/app/run.ts:37-41`; `src/app/main.ts:129-134`; `docs/archive/v1/ideas/after-the-rework.md:249-250`.
  - Recommendation: records ship as profile v1 at `spore-sprawl/profile/v1` through `storageKey()`, each run record tagged by ruleset. M6 migrates v1 to v2, and the per-commander record becomes the one home for best Decay and XP.
  - Route: RB-Q1.
- **A190** · medium · contradiction · §11.5's 12 strains target v1's six basics (Vesper's core), not v2's core six. M6's "12 strains" also conflicts with §11.5's promise of strains for the new core archetypes, and with the cap of 2 per building Vesper's mastery strains can only be existing ones.
  - Evidence: §11.5 L2057–2068, L2071; §16 M6 L3843; §9.3 L1487, L1491; §9.5 L1524, L1527; §11.10 L2194.
  - Recommendation: retarget the first release's strains at the always-in set (the core six and the Truffle Cellar, 14 strains); keep Rootbreaker and Mortar strains as extras or defer them. State M6's strain count once, and give every strain one source in a table, within the cap of 2.
  - Route: M6-Q5.

#### Low

- **A180** · low · contradiction · Rich Soil (4 economy buildings on loam at once) is impossible on every map, which have 1–2 loam plots, so Deep Truffle never unlocks. "A Truffle Cellar on a third-rank plot" unlocks Deep Truffle, and a loam goal moves to Wild Truffle. §9.2 L1476; §11.9 L2176–2184; §11.5 L2067. Route: M6-Q3.
- **A181** · low · contradiction · Hoarder ("bank 300 gold at once", kept) is met in round 1 of every battle before the player acts; read the gold at Begin from round 2, or raise it to 500. §9.2 L1480; §6.1 L823; `src/sim/stats.ts:7-11`. Route: M6-Q3.
- **A185** · low · risk · records-2 · An implementer would likely put play time or "what beat you" into `RunState` and read v1 fields, which breaks the Node and browser hash check now and the summary at R2. Note in §16 that both live in the records store, computed when the run finishes. §16 M6 L3851; §13.3 rule 6 L2480; `tools/screenshot.ts:129-153`; `tools/golden.ts:54-60`. Route: RB-Q3; X10.
- **A186** · low · contradiction · records-2 · §10.5's Underroot tabs disagree with M6's checks and the built screen, which has a Bans tab, and no tab shows locked cards. One list: Commanders, Traits, Strains, Bans, Blights (M7) and Collection. §10.5 L1773–1774; §16 M6 L3873; `src/ui/screens/underroot.ts:14`. Route: RB-Q4; SPEC fix.
- **A187** · low · factual · §15.6 lists `profile=fixture` and `measure=frames` as supported, but neither exists, and a fixture loader in the production build would ship test profiles. Mark them (M6) and (M8), and load fixtures through a screenshot `--profile` option. §15.6 L3445–3446; `src/app/urlParams.ts:27-28`, `:67`; `tools/screenshot.ts:6-7`, `:55-64`. Route: task note (M6 plan); SPEC fix.
- **A188** · low · ambiguity · G9's loadout and win-rate measure, and G10's Decay-6 set, are undefined; fix both in `data/balance-targets.json` (G9: the best 12-capacity loadout by a greedy search, as run win rate; G10: a named set). G9 L2397, G10 L2398; §11.8 L2154–2159. Route: M6-Q8.
- **A192** · low · risk · From M6, a new profile's runs (0–3 packs, a general whose preferred buildings may be locked) differ sharply from what G14 and G15 measure, and nothing measures them. The meta sim reports battle-1 and boss win rates for runs 1–5 of a fresh profile; say what a general does when its preferred card isn't in the run. G14 L2402, G15 L2403; §9.2 L1458–1459; `tools/sim.ts:15`. Route: M6-Q8.

### M7: Gray Rot, blights and content (7)

#### High

- **A170** · high · gap · Nothing maps a Gray Rot card to its Velvet Bloom counterpart. Packs, augments, the always-in set, counter sets and general kits all name Velvet Bloom ids, and the code fixes each seat's faction. §11.12 and #64 name no counterpart for the Rhizome Vault or the Spore Exchange, both pack buildings.
  - Evidence: §11.11 L2204; §11.12 L2221–2233; §11.15 L2301–2310, L2316; §7.8 L1165; §14.2 L2879; `src/sim/create.ts:107`; `src/run/flow.ts:72`; `tools/lib/balance.ts:14`, `:38-41`; `data/factions/gray-rot/faction.json`.
  - Recommendation: each Gray Rot building and unit gets a `mirrors: <Velvet Bloom id>` field, and packs, the always-in set, augments, combos, counter sets and general weights resolve through it. Name a counterpart for every pack building. Decide whether Gray Rot stats are derived (the mirror's, plus any trait) or written.
  - Route: M7-Q1.

#### Medium

- **A178** · medium · ambiguity · M7's "the relics and buildings the ten run packs need" overlaps R3, which already deals packs and gives every relic its v2 effect, and the tenth pack depends on flyers, which are "later".
  - Evidence: §16 M7 L3889; §16 R3 L3741–3742; §11.15 L2315; §1.3 #11 L178.
  - Recommendation: say what M7 adds. Either flyers and the Drift Stalk (then flyers ship, and #65 and #66 move to M7), or nothing pack-related, and the line goes.
  - Route: X9.

#### Low

- **A051** · low · ambiguity · Only Quick Learner's window is unspecified: a cycle moved to round 3 can read only rounds 1–2. Store cycles as `{ round, from }` and confirm the boss's round-4 cycle reads 1–3. §7.4 L1053, L1056; §11.8 L2155. Route: M7-Q2.
- **A182** · low · pushback · The Gray Rot's +10% HP and −10% speed is an unlisted edge for every general, more than a point of Decay buys, and it would retune every band R2–R4 set when it lands in M7. Drop it, or ship it as enemy-seat data from R2a and list it in §7.1. §11.12 L2219; §7.1 L968–977; §11.8 L2154. Route: M7-Q1.
- **A183** · low · contradiction · Three Hollows' first guess (4 home columns, 30 wide) conflicts with #19's `homeCols` 6, and #19's opening order doesn't cover 3 lanes; make it 32 wide with `homeCols` 6 and give its third-rank order, capped at 4. #62 L4114; §4.1 L395; §11.9 L2170, L2186; §4.6 L401–402. Route: #62.
- **A184** · low · risk · Three Hollows joins G3's and G12's map pool at M7, v1's three-lane lead had the worst mono results, and M7's checks don't read G12 there. R1 reads a three-lane colony as a screen, and M7 adds "G12 on Three Hollows". G3 L2391, G12 L2400; §16 M7 L3896–3903; `docs/archive/v1/balance-backlog.md:231-238`. Route: #62; R1-Q9.
- **A189** · low · ambiguity · Thin Soil doesn't say which plot becomes a stump, and Early Storm's stacking with Mold Bloom is unclear. Name the plot (the back rank's last non-loam file, the lower lane on Twin Roots); Early Storm sets round 4 and Mold Bloom then moves it one earlier, no earlier than round 3. §11.8 L2156, L2158; §8.7 L1344; §14.2 L2810. Route: M7-Q2.

### M8: release candidate (0)

No finding is M8's own. Two touch it:
- A187 (M6): `measure=frames` is listed as supported, but M8 builds it.
- A203 (cross-cutting): M8 step 6 asserts a 25–35 minute run, which X6 re-sets after R2b's playtest.

### Cross-cutting (8)

These shape how the milestones are cut and ordered, or span more than two of them.

#### High

- **A025** · high · risk · §13.4 plans R2 as in-place edits to `state.ts`, `step.ts`, `create.ts` and `commands.ts`. That breaks the whole project's typecheck at every intermediate step, so R2 can't land in pieces on develop or stay green on an integration branch.
  - Evidence: §13.4 L2554–2571; by grep, 71 files in `src/app`, `src/ui`, `src/run`, `src/render`, `tools` and `tests` import the sim, 23 use API §14.6 retires (`legalPlacements`, `priceAt`, `lanePresence`, `turretPos`, `holdsLane`, `incomePerMinute` and others), and 27 use the phase strings `'deploy'` and `'live'`; `.github/workflows/ci.yml:29`; `.claude/rules/v1-code.md`. v1 also reads `homeCols` (`src/sim/placement.ts:8`, `src/sim/create.ts:201-205`, `:337`), which v2 changes.
  - Recommendation: build v2's sim beside v1: new modules, data fields v1 ignores, a v2 colony block in each map, and a dev-only entry so the user can playtest rounds on the dev site. Each PR into develop stays green. A cutover deletes v1 and moves v2 into place with the UI, run and AI.
  - Route: X2; SPEC fix.
- **A101** · high · risk · R2 is one milestone with no PR order. Deleting v1 breaks typecheck outside `src/sim`, and 14 of the 31 unit test files build on v1's `liveState`. Each sub-PR can be green only if both loops coexist for a while, or if the order keeps each PR green.
  - Evidence: §15 L3300 ("in the same change"); §1.3 #13 L180; `src/sim/index.ts:12-36`; `src/render/renderer.ts:12`; `src/app/session.ts:5-6`; `src/app/battleView.ts:25`; `src/ui/inspect.ts:8`; `src/ui/hud/top.ts:7`; `tests/helpers.ts:10`; `src/sim/state.ts:667`.
  - Recommendation: the reviewer's pick was one integration branch with both loops behind an internal switch, never a `?proto=` knob. `clarify.md` recommends R2a beside v1 on develop and R2b's switch-over on `feature/r2b-cutover`, which keeps the same order: adopt R1's set, the round loop with its tests and goldens beside v1's, tools in round form, the flip, then the deletion.
  - Route: X1; X2; SPEC fix.
- **A195** · high · risk · R2 is several milestones in one: the round loop, scoring, lives, the colony and sprawl, the general, the economy, drafts, powers, new content effects, saves and migration, the whole UI, v1's deletion, the adopted pieces, 20 §18.2 rows and the tools. Its rules (playable at the end, merged as the default, never a knob) conflict with one session or PR per phase unless something gives.
  - Evidence: §16 R2 L3627–3672; §16 L3501–3511; `src/sim` (5,783 lines); 32 files under `src` mention territory, frontier, stance or turrets; `tests` (7,621 lines, 31 unit files, 8 goldens).
  - Recommendation: split R2, as X1 does, and land it as X2 says. The reviewer's alternative, one integration branch with about 6 phase PRs, stays X2's alternative.
  - Route: X1; X2; SPEC fix.
- **A196** · high · risk · R1 tunes squad sizes against copy-free mono builds, and R2 playtests with plots as the only limit. Both use the "mass the cheapest spawner" configuration that R3's copies abolish, so R1's and R2's done-when may only be reachable by bending squad sizes (the Burrow at 6 or 7).
  - Evidence: D45 L4008; §8.10 L1415–1417; Appendix A L4204 (mono Sporeling at 83 and 86%); §16 R1 L3598–3600, L3612–3617; §11.4 L2022, L2036; #51.
  - Recommendation: R1 reports G3 and G12 at 2, 3 and 4 copies beside unlimited, so squad sizes aren't bent to tame a build R3 removes. R2a gets copies, or an interim limit, if R1's swarm fails without them.
  - Route: X4.

#### Medium

- **A066** · medium · risk · Every battle-UI file reads v1 state that R2's sim deletes, so the v2 UI can't land on develop piecemeal without breaking typecheck or the dev site's game.
  - Evidence: `state.held` (`src/app/loop.ts:48`, `src/app/battleView.ts`, `src/ui/draftOverlay.ts:46`); `supplyUsed` (`src/ui/hud/top.ts:212`); `legalPlacements`, `priceAt`, `depthOf` (`src/app/session.ts:5`, `src/ui/hud/tray.ts:11`); `src/render/renderer.ts:12`; `phase === 'deploy'` in 9 files; `.claude/rules/v1-code.md`.
  - Recommendation: R2a builds the new battle UI as new modules beside v1's, reached only from the dev-only entry; R2b's switch-over replaces v1's screen in one sub-PR with the state, command and event types.
  - Route: X2.
- **A191** · medium · contradiction · SPEC disagrees on whether flyers are in the first release. §17's preamble and #7 imply they return as an unlockable role, while §1.3 #11, §5.3 and §11.2 say "later" and no milestone builds them. #64's first guess asks M7 to make a Gray Rot flyer that never fields.
  - Evidence: §17 L3937, #7 L3950; §1.3 #11 L178; §5.3 L613; §11.2 L1936; §11.12 L2235; #64 L4116; #65–#66; §11.15 L2310.
  - Recommendation: decide it in one place. Flyers after the first release: restore §17 #7 for flyers only, drop the flyer from #64, and move the Air pack's relics. Or flyers in M7, with #65 and #66 moved there.
  - Route: X9; #64.

#### Low

- **A202** · low · pushback · R2's playtest reads the general's army on v1 sprites, where size means merge tier, so "see it, answer it" is partly confounded by F17. Moving the render-only shape rules ahead of the playtest is reasonable, but it reverses §1.3 #10's order and needs the user's OK. §16 R2 L3644, L3720; `src/render/renderer.ts:25`; `docs/playtest-feedback.md` (F17). Route: X3.
- **A203** · low · risk · SPEC's own numbers disagree on run length: §8.2 and D29 say 25–35 minutes, §8.2's next line 35–45 with lives. Per round, 30 s of planning, a 20–40 s clash, the muster and the aftermath come to 54–74 s. Pick the lever order now and record real planning seconds and run minutes. §4.2 L334; §8.2 L1214–1222; D29; §16 R2 L3724; §16 M8 L3930. Route: X6.
