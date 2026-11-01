# Critique of lens E (Opposition and challenge)

> **Archived: v1 era.** Written before [SPEC v2](../../../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../../../README.md)).

Evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): a critic's check of [lens E's proposals](e-opposition.md). Written by an agent during that review; nothing here is adopted, and the review's [Appendix A](../../after-the-rework.md#appendix-a-every-surviving-proposal) holds the final verdicts. Recovered from the session transcript, so raw outputs weren't kept.

Written 2026-10-31 against `develop` at `ef2e133` (a local checkout). I read the [ledger](../ledger.md), [`e-opposition.md`](e-opposition.md), its logs in `E-measure/` (raw output not kept), [`rework-state.md`](../rework-state.md), [`measurements.md`](../measurements.md) and `official.md` (raw output not kept), [`run-loop.md`](../run-loop.md), both playthroughs ([newcomer](../playthrough-newcomer.md), [strategist](../playthrough-strategist.md)), [research](../../../../../research/research-autobattler-roguelites.md) #8 and #10, and lenses [A](a-battle.md), [B](b-builds.md) and [D](d-feel.md) for overlaps. I checked the code: `src/sim/ai/counter.ts`, `controller.ts`, `src/sim/systems/spawning.ts` and `stance.ts`, `src/run/flow.ts` and `route.ts`, `src/data/proto.ts` and `schema.ts`, `src/ui/doctrine.ts`, `hud/top.ts` and `explain.ts`, `src/ui/screens/run.ts` and `src/app/tips.ts`. I also checked the data: `data/generals.json`, `elites.json`, `balance.json`, the units and buildings, and the counter-matrix tables in [`docs/archive/v1/balance-backlog.md`](../../../balance-backlog.md). I ran nothing new and changed no file in the checkout.

## Verdicts at a glance

| # | Verdict | Impact | Confidence | Effort | The main problem |
|---|---|---|---|---|---|
| E1 Scout the general | revise | 3 | 4 | S | Mostly duplicates D1 and D2. Its army number isn't validated. Its only unique part is the "Massing" line |
| E2 Re-voice the generals | revise | 3 | 3 | M | The tempo is a Mold nerf with no known mechanism, and it widens the commander gap. The Blightwright's stance can't work under the hold rule. Showing the title should ship now |
| E3 Counter recipes | revise | 4 | 2 | M | The recipes contradict the counter matrix, and the Baron's recipe has already been measured to fail. The "no own staple" rule removes half of every confirmed answer |
| E4 Choose your first opponent | revise | 3 | 2 | M | The route code makes the Blightwright battle 2 every time and lets players skip Mold for the whole run. The choice is dominated. Items 2–3 duplicate D7 |
| E5 The counter wave | revise | 2 | 2 | M | The double wave carries almost no counter units at 4:20–4:40, and without E3 Mold's counter changes nothing |
| E6 The boss's Edict | revise | 4 | 3 | L | Phases tied to the Heartcap fire after the boss is already dead. "Long Brood" does nothing by the lens's own measurement. The boss fields 10 buildings, not 7 |
| E7 Elites as trials | revise | 3 | 3 | M | "Brood" and "Shield Wall" are number bumps. The loot half duplicates B5 |
| E8 The general as a nemesis | revise (light) | 2 | 3 | S | The "dossier" repeats the intel bars. The grudge line should agree with D8's numbers |
| E9 The asymmetric Gray Rot | revise | 3 | 2 | XL | "Feeds" snowballs in a game with no comebacks. A faction-wide 15 s beat would be a large untested difficulty swing |

The lens has the right targets: the counter isn't a moment, the boss is too easy, generals differ only in difficulty, and nobody is behind a loss. Its strongest finding is the new measurement: one data knob moves battle-1 losses 53% → 37%. Its weakest part is E3's recipes, which the matrix it cites contradicts.

---

## E1. Scout the general: revise (fold into D1 and D2)

**What checks out**
- **The HUD shows only the player's numbers.** `top.ts` shows the player's `supplyUsed` and `waitingUnits(state,'player')`. The intent panel talks only about the player's army.
- **The helpers exist.** `waitingUnits(state, side)` and `nextWaveTypes(state, side, lane)` are in `explain.ts:247–262`. `renderer.ts:310` already draws "+N" on both sides' spawners.
- **SPEC §7.4 has no fog of war,** so summing what's on the field is honest.
- **The quotes are real:**
  - [`playthrough-strategist.md:187–188`](../playthrough-strategist.md) (the lane-1 stack was found only through `__GAME__`; "The HUD shows my supply, not theirs");
  - `:81` and `:89` (27 columns to 13; 468 units spawned to 177);
  - [`playthrough-newcomer.md:245`](../playthrough-newcomer.md) ("Nothing told me what the enemy was massing").

**What's wrong**
- **D1 already does most of it, and better.**
  - D1 has the army gauge, the per-lane next-wave strip with a shield glyph, and a "Big wave" warning at ≥ 1.5× and ≥ 10 units.
  - D1 also picks the gauge's formula with a measured readout check. At 3:00 the leader on territory goes on to win 41% of battles, on field supply 63%, on material 70% ([`measurements.md`](../measurements.md)).
- **D2 item 3 already covers E1 item 5** (the countdown as a clock time, "at 4:00 · 0:43"). D2 also draws each side's waiting units at its spawners' doors.
- **"Army 38/60 from `supplyUsed`" is an unvalidated readout.** Under waves, `supplyUsed` includes units waiting inside buildings ([`measurements.md`](../measurements.md) caveat). It may be fine, but a wrong gauge is worse than none.
- **"+N" undercounts the wave.** `releaseStored` multiplies the stored count by `waveSize` and the storm-wave factor when the wave leaves. After 4:00, the "+12" on the chip isn't what arrives.

**What survives:** the "Massing: Sporeling Burrow ×9" line and a lane-stacking note ("stacking lane 1: 5 of 7 buildings"). The first-run player asked for exactly this ([`playthrough-newcomer.md:246`](../playthrough-newcomer.md)), and neither D1 nor D2 has it.

**Revised:** ship inside D1 and D2. E1 contributes the Massing line and the lane-stacking note, with D1's validated army number and D2's clock-time countdown.

---

## E2. Re-voice the generals: revise (split it)

**What checks out**
- **The measurement logs match the claims** (`E-measure/*.txt`, raw output not kept):
  - Mold on a 15 s beat: Vesper 40 → 70%. Mold on a 30 s beat: 40 → 43%.
  - Stacked with the Baron's Mortar at weight 1: Armilla vs Mold 77%, Cordis vs Mold 13%.
  - The Baron gets tougher: bot wins 63 → 55 of 90.
  - Runs: battle 1 lost 159 → 110, won 53 → 76, battle 2 lost 65/153 → 83/205, boss fights 76/85.
  - The baselines (40 / 37 / 20%, 80 / 73 / 57%) match `official.md` (raw output not kept).
- **The knobs are real:**
  - `side.waveBeat` is a side stat (`schema.ts:42`, `compile.ts:353`);
  - `general.<id>.passive.modifiers+` works through `applyProto`.
- **The Baron's weights:** his Mortar is weight 3 of 15 under `rework`. His six listed weights sum to 12, and the three rework buildings add 1 each.
- **Every general gets the three rework buildings from battle 1** (`flow.ts:169–170`).
- **No screen renders `title`.** `GeneralSchema.title`'s own comment says it's the "Portrait line on the route and in the Intent panel", so showing it is finishing intended work.

**What's wrong**
- **The tempo is a nerf with no known mechanism, framed as personality.**
  - It's a ~30-point swing for Vesper and Armilla, and nobody knows why a 25% faster beat does that while a 50% slower one does nothing.
  - Candidates: smaller waves meeting the player's under its turrets, fewer idle trios knitting into Elders, or single-type waves losing their shields.
  - [`rework-state.md`](../rework-state.md)'s battle-flow numbers (units per release, shielded releases, merges) would tell, and nobody has checked whether a person even notices a 15 s rhythm.
- **It widens the commander gap.**
  - On the same seeds (1–100), runs won go 28 / 12 / 13 → 39 / 22 / 15, so the spread goes from 16 to 24 points.
  - The write-up's "It's 24 today" is wrong: 24 is the spread *after* the change.
  - Cordis gains 2 runs, and Cordis vs a 15 s Mold falls 20 → 13% (30 seeds, noisy).
- **It competes with levers already built.** `hotstart` alone already gets battle-1 run endings to 23% ([`rework-state.md`](../rework-state.md) §3.3). E2 never measures the tempo stacked with `hotstart`, where Vesper and Armilla could find Mold trivial.
- **The Blightwright's siege-push stance can't work.**
  - Under waves the beat spends every hold and sets `readyAt = tick + beat + 1` (`spawning.ts` `waveSystem`), so a lane holds at most one beat in two.
  - "Hold until 2+ siege units are stored" therefore collapses into the Baron's every-other-beat sally.
- **AI holds don't exist under waves** (`controller.ts:108`). Both stances need that machinery first, and A5 builds it too.
  - The player's every-other-beat hold was worth +8 of 30 against the Baron, so a sallying Baron may be much harder.
  - His Decisions are already 22% overall and 33–37% for Cordis, against a G4 limit of 15%.

**Revised:**
- **Now, UI only:** print the title and the passive in words on the route node and in the intent panel.
- **Data knobs, optional on the URL now:**
  - Mold's tempo, at ×0.75 and also at ×0.8–0.85;
  - the Baron's Mortar 3 → 1.
  - Measure the mechanism first, stack with `hotstart`, add a 60-seed Cordis cell, and keep a commander-spread target.
- **After P4, and only on top of a shared AI-hold path:** the Baron's sally.
- **The Blightwright:** drop its stance. Its kit (Drift Stalk second in `preferred`) and its lane choice carry its identity.

---

## E3. Counter recipes: revise (the recipes are wrong)

**What checks out**
- **The Swarm set:** `counterKindsOf` puts every slash or splash spawner in it, including the Burrow, all three rework buildings (the Burster is crush with splash, the Rhizomorph and the Driftling are slash), and Capguard, Scythecap and Amanita.
- **Mold's mix:**
  - battle 1: 62% Burrows before and after the counter (5 of 8 weight, every building ×3);
  - whole roster: 34 → 46%.
- **The boss's counters:** `bossCounters` takes the cheapest set member (the Burrow at 110 gold).
- **[`rework-state.md`](../rework-state.md) §3.3:** "Teaching the answer means changing what the counter set *is*".
- **Status #3** says don't start it unasked, and E3 respects that.

**What's wrong: the recipes contradict the evidence E3 cites**
- **Every confirmed answer to mono Sporeling under the rework contains Sporelings.** Wins on Bogwater / Stumpfield / Twin Roots, from [`balance-backlog.md`](../../../balance-backlog.md):

  | Answer | Wins | How |
  |---|---|---|
  | Sporeling + Veilstalker | 93 / 91 / 71 | It works because the pair's waves get 2-type shields. With `minTypes:3` it falls to 52 / 54 / 36 |
  | `d1-amanita` (Amanita 4, Burrow 2) | 73 / 80 / 71 | |
  | Mono Capguard | | Only by stalling into Decisions (74–76%) |

  So "a recipe never lists the general's own staple" forbids half of every real answer.
- **The proposal breaks its own rule.**
  - The Baron's recipe uses Capguard, his opener and a weight-3 staple.
  - The Blightwright's uses Gill Nest, a weight-3 staple of his.
- **The Baron's recipe has effectively been measured and failed.**
  - Capguard + Veilstalker is the matrix's answer to mono *Veilstalker*, and it wins by stalling (73 / 52 / 18% Decisions).
  - The Baron with Capguards plus 30 Veilstalker Hollows already won only 13 of 50 against mono Sporeling ([`rework-state.md`](../rework-state.md) §3.3, "swarm read off, `a2`").
- **Gill Nest + Burster against a swarm** has no support under pinning.
- **Mold doesn't need a recipe.** She wins the swarm mirror 70% and beats mono Veilstalker 100%. The G8 problem is the Baron and the Blightwright.
- **The mechanism needs one more change.** `draftMissingCounter` drafts only when the kit holds *no* set member. With recipes it must draft the recipe's missing buildings, or nothing visible changes.

**Revised:**
- **Recipes come from the confirmed answers** under the adopted model.
- **Voice comes from choosing among confirmed answers,** not from excluding staples:
  - the Baron: Amanita + Sporeling (Amanita is already in his `preferred`);
  - the Blightwright: Sporeling + Veilstalker;
  - Mold: unchanged.
- **Make the counter visible** by suppressing everything outside the recipe harder (`otherMult` 0.6 → about 0.2), and by drafting the recipe's missing buildings.
- **The AIR kind:** its recipe comes from a measured answer to mono Drift Stalk.
- **The boss** takes each kind's recipe head.

---

## E4. Choose your first opponent: revise

**What checks out**
- **Row 1 is a single battle** (`generateRoute`).
- **`assignGenerals` gives the generals in a row distinct ids,** and the battle-1 eligible ones are Mold and the Baron. The scripted general isn't adaptive, so it's excluded.
- **The node shows only the map and the portrait** (`nodeView`).
- **No enemy first-sight tip exists.** `TipId` covers frontier, hold, draft, storm, interest, economy and power.
- **Mold opens with two Burrows,** and her Cellar is first in `preferred` (it joins in battle 2).

**What's wrong**
- **The route side effects are misread.** `assignGenerals` pushes *every* general in a row into `fought`, the chosen node and the other one alike.
  - With Mold and the Baron in row 1, row 2's battle is always the Blightwright, the only fresh general eligible for battle 2.
  - Row 3 picks two of three generals at random, so Mold can be dodged for the whole run, and she isn't eligible in row 5.
  - So the stated risk, "Mold lands in battle 2", is wrong. The real change is a fixed battle 2 and an optional Mold.
- **The choice is dominated.** Battle 1 is lost 67% of the time against Mold and 34% against the Baron.
  - With no trade-off, informed players always pick the Baron.
  - [Research](../../../../../research/research-autobattler-roguelites.md) #8, which E4 cites, prices the choice: a reroll costs 5% of max Heartcap, free only in battle 1.
- **Items 2 and 3 duplicate D7** (staging the rework's units through a run, with a first-sight card for each). D7 even picks the debut order: Burster from battle 1, Stalk from battle 2, Tunnel from battle 3.
- **It's an alternative to ER-3b,** the user's own open call (Mold out of battle 1). The two should be put to the user side by side.

**Revised:**
- **Now:** each battle node shows its general's title, opener and kit, on every row.
- **Behind a knob:** a two-node first row with a visible trade-off, such as the harder general paying the elite's relic pick. Measure the new general sequence, including how often a run meets Mold.
- **Leave the kit staging and first-sight cards to D7.**

---

## E5. The counter wave: revise

**What checks out**
- **The counter activates at 4:00 and 7:00,** and the boss's at 3:00 (`balance.json` `ai.counter.cycles` and `bossCycles`).
- **The AI never holds under waves** (`controller.ts:108`).
- **ER-6a has never been addressed,** and E5's honest-AI framing, using only the player's own Hold, is sound.

**What's wrong**
- **The "counter-wave led by its new counter units" mostly won't exist.**
  - At activation the AI banks about 100 gold and earns 96 a minute (stipend 8 per 5 s).
  - A 130–160 gold counter building's first unit appears half an interval after it's placed.
  - So a hold at 4:20 releasing at 4:40 is the general's ordinary army doubled.
- **Without E3, Mold's battle-1 counter changes nothing** (all four of her buildings are in the Swarm set).
- **It shares its AI-hold machinery with A5,** which adds a general hold-and-call policy.

**Revised:**
- **Key the hold to the counter's own units:** the first beat where a counter or recipe building placed after activation has units waiting, at most once per counter.
- **Build it on the shared AI-hold path, after E3.**
- **Measure** the counter units' share of the double wave, and G4's Decisions.

---

## E6. The boss's Edict: revise

**What checks out**
- **Boss fights won:** 88% (95% with `hotstart` and `bigdrafts`).
- **The boss's data:** 3600 HP, `bossBuildings` 7, `bossUpgrades` 4, +25% turrets, even weights over 11 buildings.
- **Every Edict's stat exists:** `side.knitTicks`, `side.mergeRadius`, `side.turretDamage`, `side.stipend`, `side.waveBeat`.
- **Phase triggers in a passive work as data today.** `GeneralSchema.passive` is an effect bundle with triggers, `heartcapBreach` and `gainGold` exist, and `generalPassives` feeds them to the general's side.

**What's wrong**
- **Phases at ⅔ and ⅓ of the Heartcap fire after the fight is over.**
  - Under `rework`, the beaten Heartcap goes from ⅔ to dead in 4–9 s, and from its first hit to dead in about 12 s. The loser has 1 building and 0 units at the first hit.
  - A re-read that "activates after one beat" (20 s) lands after the boss has died.
  - `breach`'s Heartcap triggers gave 0 comebacks in 720 battles under `rework`.
  - Phases need to key off the fight: the boss's buildings lost, or the storm stacks.
- **"of the Long Brood" (`side.waveBeat` ×1.5) is inert.** The lens's own measurement: Mold on a 30 s beat goes 40 → 43%.
- **"of Many Hands" may be marginal.** Merges are already 3–4× under waves. Measure it.
- **The boss fields 10 buildings under `rework`, not 7.** `generalKit` appends the three `aiWeight` buildings after the size cap.
- **Determinism:** draw the Edict last, or on a sub-seeded stream, so a seed's maps, events and generals don't shift.

**Revised:**
- **Keep** the Edict shown from row 1, and the `bossfight` harness.
- **Replace** Long Brood with a bigger `side.waveSize` or a two-lane boss map ("Sovereign of Roots" in [research](../../../../../research/research-autobattler-roguelites.md) #10).
- **Re-key the phases** to the fight's arc, not the Heartcap.

---

## E7. Elites as trials: revise

**What checks out**
- **The three elites** are Fortified, Veteran and Swift.
- **The elite tax:** an elite is lost 44% of the time against 34% for a plain battle, Veteran 42–49% ([`run-loop.md`](../run-loop.md)).
- **`side.waveBeat` and `side.waveSize` exist, and nothing uses them** (CR-4).

**What's wrong**
- **"Brood" tests numbers.** Its ×1.5 beat is inert by the lens's own data, and `waveSize` ×1.2 is just +20% units.
- **"Shield Wall" tests nothing specific.** `soakShield` absorbs every hit, bursts and clouds included, so shields on every wave are +20% effective HP, not a test of armor-ignoring damage.
- **The loot half duplicates B5** (loot from the general you beat, shown on the node, 2 picks for elites).
- **The AIR answer relic doesn't need E3's AIR kind.** It's a player relic.

**Revised:**
- **Opener trials:** `openerAdd` puts 2 of one spawner type in the elite's opener, a type whose matrix answer is known.
  - Airborne Host: 2 Drift Stalks (the K5 flyer problem).
  - Siege Column: 2 Rootbreaker Dens.
- **Veteran stays** as the numbers elite.
- **Loot through B5,** with the trial's building as one of the options.

---

## E8. The general as a nemesis: revise (lightly)

**What checks out**
- **The summary has no intel** (`summaryScreen`).
- **The only memory the player sees** is the intel bars and the `rememberText` callout.
- **DR-19, DR-32, DR-38 and CX-7 were never addressed.**
- **The first-run quote** "felt the same every battle" is real ([`playthrough-newcomer.md:163`](../playthrough-newcomer.md)).

**What's wrong**
- **The "dossier" ("The Baron will open against your SWARM") repeats what's already on the route.** The intel bars' tooltip says "Each new general opens against your top kind". Put the line on the adaptive general's node instead.
- **The grudge line should share D8's measures,** so the summary and the battle report agree.

**Revised:**
- **The title and voice lines** in the panel (shared with E2's title work).
- **The boss names the generals you beat.**
- **A grudge line** on the summary, built from D8's metrics.
- **"Opens against your X"** on the node.
- **Cross-run counts** once a profile exists.

---

## E9. The asymmetric Gray Rot: revise (later bet)

**What checks out**
- **SPEC §11.12 is a role mirror** with +10% HP and −10% speed.
- **`data/factions/gray-rot/`** holds only `faction.json`.
- **ER-6c and CR-13 are open,** and SPEC §17 #5 isn't broken (the Rot isn't playable).

**What's wrong**
- **"Feeds"** (each killing blow gives +15% HP and damage, up to ×1.6) pays the side that's already winning fights.
  - Under `rework` the winner's Heartcap is untouched in 719 of 720 battles, with 0 comebacks.
  - Feeding steepens the cliff, [ledger](../ledger.md) problem #1.
- **A faction-wide 15 s beat is untested.** On Mold alone it was a ~30-point swing, and it was never tried on the other generals.

**Revised:**
- **When M7 is rewritten after P4:** keep the role mirror and give the Rot 2–3 signature units with their own jobs (CR-13). Each gets a first-sight card (D7).
- **Pick a faction rule that creates counterplay, not snowball.**
- **Leave tempo to per-general voice** (E2).

---

## What the lens is missing

1. **An AI that can hold under waves, as a standalone knob that has to come first.**
   - `controller.ts:108` returns early, so every difficulty number ignores Hold.
   - A blind every-other-beat schedule gives the player +6 to +8 wins of 30 against two generals ([`rework-state.md`](../rework-state.md)), and only the player has it.
   - The knob is a muster rule: hold when the general's waiting supply in a lane is at most 0.6× the player's and nothing there is besieged, every other beat at most.
   - E2's sally, E5 and A5 all need this. Measure it on G3, G4, engagement and runs first.
2. **A practice rematch of the run battle that beat you** (CX-6, never addressed).
   - From the run summary after a loss, replay that battle with the same kit, general, map, seed, levels and relics, for no reward.
   - Single battles already have a same-seed Rematch (`src/app/main.ts` `rematch`).
   - It turns a run-ending battle-1 loss (52%) into a lesson about that general, and pairs with E8's grudge line.
3. **A reward for out-adapting a counter** (the second half of DR-18, never addressed).
   - Pay a draft card or gold when the general's next analysis after an activation reads a different top kind (you pivoted), or when you beat its first counter wave in a lane.
   - The warning stays vague, and it makes the counter a moment with a payoff.
   - Measure it with a scripted bot that pivots.
4. **A general-by-commander matchup check** before any general is retuned.
   - Cordis wins 20% against Mold, 13% with E2's tempo.
   - Armilla and Cordis lose 56–63% of battle 1s.
   - Add `--checks matchups` (commander × general × map) with a floor per cell, so a "voice" change can't quietly open a hole.
5. **The Baron's stall as a target of its own.**
   - 22% Decisions overall (37% for Cordis), and no column flipped by 3:00 in 50% of battles against him.
   - E2 touches it only through the Mortar's weight.
   - Once missing item 1 exists, a "sally when N supply is waiting" policy is the direct fix.
