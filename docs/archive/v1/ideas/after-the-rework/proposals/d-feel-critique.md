# Critique of lens D: feel, readability and learning

> **Archived: v1 era.** Written before [SPEC v2](../../../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../../../README.md)).

Evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): a critic's check of [lens D's proposals](d-feel.md). Written by an agent during that review; nothing here is adopted, and the review's [Appendix A](../../after-the-rework.md#appendix-a-every-surviving-proposal) holds the final verdicts. Recovered from the session transcript, so raw outputs weren't kept.

Checked 2026-10-31 against `develop` at `ef2e133` (a local checkout), the [ledger](../ledger.md), [`measurements.md`](../measurements.md), [`battle-feel.md`](../battle-feel.md), [`rework-state.md`](../rework-state.md), both playthroughs ([newcomer](../playthrough-newcomer.md), [strategist](../playthrough-strategist.md)), the three research files ([lane battlers](../../../../../research/research-lane-battlers.md), [auto-battlers](../../../../../research/research-autobattler-roguelites.md), [one more run and feel](../../../../../research/research-one-more-run-and-feel.md)), and lenses [A](a-battle.md) and [E](e-opposition.md) (for overlaps). Nothing in the repo was changed.

## The short version

| id | Verdict | Impact | Confidence | Effort | Main problem |
|---|---|---|---|---|---|
| D1 Read the enemy | **revise** | 4 | 3 | M | Supply is the wrong default gauge (merges cut supply but multiply stats), the ≥70% bar is met today only by a measure that includes the hidden bank, the warnings have no false-alarm check, and the next-wave visual duplicates D2's door clusters. Same job as A3 items 1–2 and E1 items 1–4 |
| D2 Beat voice, door, one name | **revise** | 3 | 3 | M (not S) | Effort understated; the count-in on every beat is fatigue; door clusters duplicate D1's gate strip; the draft move is a sim rule |
| D3 A finish you feel | **revise** | 3 | 3 | M | The "slowed last third" has no cap: with `breach` (⅔ → dead 24 s on the rework) it becomes up to a minute of slow motion |
| D4 Rules visible on the field | **revise** | 3 | 4 | M | The spark fix is wrong: a Sporeling's slash on a Driftling is ×0.75, which the game's own thresholds call **weak**, not normal. The `waveCapped` event carries no building, and "⬢!" already means "holding for supply" |
| D5 Teach in game, callout diet | **revise** | 3 | 4 | S | The diet changes the default game too, not just rework; "columns you held" needs ownership tracking; flyer/mound tips duplicate D7's card; function words are a separate change |
| D6 Juice decisions, combat sound | **revise** | 3 | 2 | L as written | Its own evidence (Kao 2024) argues against its combat din and kill pops; effort is L; overlaps D3 and D5 |
| D7 Stage units, first-sight card | **revise** | 2 | 2 | M | Bundles a UI card (no approval needed) with a run rule (needs approval). Tips stop after battle 2, so the card can't ride TipCoach as is. Removing the Stalk and Tunnel from Mold's battle-1 kit may make her swarm *stronger* |
| D8 Report that explains the loss | **revise** | 3 | 3 | M | Its army-line storage conflicts with D1's "never enters rules" knob; the near-miss line almost never fires on today's rules; the replay is out of scope (SPEC §17 #17) |
| D9 Honest prices, pending placement | **keep** | 3 | 4 | S | Sound. Same as A3 item 3; add a cancel and callout when the plot turns illegal |
| D10 Front lens | **keep** (conditional) | 2 | 2 | L | Fine as a parked, P3-gated option. Its cheap inset doesn't fit at 1280×720 |

**Cross-lens duplicates the reconciler must merge:**
- D1 ≈ A3 items 1–2 ≈ E1 items 1–4: an army readout, the next-wave preview and a big-wave callout.
- D9 ≈ A3 item 3: the queued placement.
- D2 item 3's clock-time countdown ≈ E1 item 5.
- D2 item 4 ≈ D5 item 4: the shields callout.
- D5 and D6 both drop enemy BLOOMED! labels.
- D3 and D6 both change the loop's time scale.
- D5's `flyer` and `mound` tips ≈ D7's first-sight card.

---

## D1. Read the enemy: army gauge, next wave at the gate, warnings

**Verdict: revise.** The problem is the best-evidenced one in the lens. The fix is right in kind but wrong in three details.

**Verified:**
- `top.ts:199` shows only `p.supplyUsed`. No enemy army appears anywhere.
- `waitingUnits` and `nextWaveTypes` exist in `explain.ts:247/257`, and `b.stored` is on state (`state.ts:426`).
- [measurements.md](../measurements.md) (rework, 720 battles): territory leader wins 39/41/44% at 2:00/3:00/4:00; material 64/70/78%; field supply 60/63/72%.
- The quotes from both playthroughs are accurate (27–13 at 7:08, Rout at 7:47; the Twin Roots stack found via `__GAME__`).
- `compileRules` (`src/sim/compile.ts:21`) builds rules field by field. `createBattle` keeps no raw balance in state, so a `present` key wouldn't move a hash. `BalanceSchema` is `.strict()`, so the key must be added to the schema.
- SPEC §17 #9 allows no hidden information beyond the vague telegraph, so showing what's on the field is consistent.
- The counter badge is feasible: the counter history records "buildings in the counter set placed while this counter was the active doctrine" (`state.ts:551`).

**Wrong or missing:**
1. **Supply is the wrong default gauge.**
   - `data/balance.json` has `tierSupplyMult` [1, 2, 4] and `tierStatMult` 2.8. Nine Sporelings (9 supply) merge into one Elder of 4 supply, with about 7.8× a Sporeling's HP and damage.
   - So a supply gauge shows a merged swarm at about half its strength. That's the strategist's loss case: 20 enemy Elders to 0.
   - The default should be tier-weighted unit-equivalents or Σ(HP+shield)×DPS. The proposal lists the latter as one candidate; it should be the leading one.
   - The example text "Army 34 · 51" reads as supply.
2. **The acceptance bar (≥70% at 3:00) is met today only by "material".** That measure includes each side's bank, which isn't on the field and isn't shown to the player now.
   - Field supply reaches 63% at 3:00.
   - A visible-only gauge should be held to "clearly beats territory, and at least matches field supply" (≥63% at 3:00, ≥72% at 4:00). Otherwise the bar invites adding the enemy's gold.
3. **The warnings have no false-alarm or lead-time check.** "Outnumbered 2:1" fires at a 1.5 ratio, so show the real ratio.
   - The readout tool should report the median lead time from the first warning to the end, and the share of warned battles the warned side still won.
   - Ship a warning only if it comes a minute or more ahead and isn't usually wrong.
4. **Two visuals for one fact.** D1's gate strip and D2's door clusters both draw the units waiting inside. Keep the per-lane enemy strip (counts, shield glyph, storm ×) and put the player's own next wave in the beat chip.
5. **Two risks the proposal doesn't name:**
   - With 0 comebacks in 720 battles, an accurate gauge can turn "out of nowhere" into "two minutes watching myself lose". Ask about that in the playtest, and pair it with any comeback rule (A1 Rally).
   - Making army size legible will speed up the lesson "mass the cheapest spawner" (G3 fails for Sporeling at 83/86). That's a rules problem, but the gauge shouldn't be read as solving it.

---

## D2. Give the beat a voice, a door and one name

**Verdict: revise.** The direction matches [rework-state.md](../rework-state.md)'s own "Adopt waves" work column (§4.1). It isn't independent work; it is the presentation P1 skipped.

**Verified:**
- `battleSound.ts` has no `release` case.
- The spawn sound is priority 1, `cooldownMs` 220, `frequent`.
- `top.ts:132` puts `i-hold` on the beat chip.
- The `wave` sound plays once a minute.
- `wavesText` is in `src/ui/doctrine.ts:50`.
- `REQUIRED_SOUNDS` is at `src/data/registry.ts:60`.
- The engine pans and has brown noise and sweeps.
- "Shields up" fires on 17–20 of ~23 beats ([rework-state.md](../rework-state.md) §5.2).
- The 34-px overflow comes from [battle-feel](../battle-feel.md) §3.4.

**Wrong or missing:**
1. **Effort is M, not S.** The proposal adds 5 new sounds, a new field effect, door clusters, a vocabulary change across `top.ts`, `explain.ts`, `help.ts`, `tips.ts` and `doctrine.ts`, a callout policy and a browser test.
2. **The count-in is fatigue.** There are ~24 beats in an 8-minute battle, and "only while you have units waiting" is nearly always true under waves. Add the enemy's answering drum and that's ~70 count-in ticks plus ~48 drums.
   - Limit the count-in to beats where a Hold is available and would double a wave, or to the first two beats as a teaching cue.
3. **Door clusters duplicate D1's gate strip.** [rework-state.md](../rework-state.md) lists door clusters as the answer to one specific outcome ("less alive"). Keep them as an A/B for that outcome, not as default.
4. **Moving the draft is a sim rule.** `openDraft` is called from `economy.ts:27` at the wave tick. Gate it under `rules.waves`; then no committed golden moves (the m3 run golden has drafts but no waves). It needs G4/runs numbers and the user's OK. The proposal flags this; it belongs with the rules lenses.
5. **Shared items:** the shields callout is also D5 item 4, and the clock-time countdown is also E1 item 5. Give each one owner.

---

## D3. A finish you see coming and feel

**Verdict: revise.** Heartcap stages, alarms both ways, a moment tier and a held final frame are cheap and well supported. The slow-motion step is the problem.

**Verified:**
- `battleView.ts:336–337` raises a callout only for `target === -1`.
- `bakeTerrain` (`renderer.ts:186`) bakes the Heartcap strip once. Only the 3-px bar redraws (`renderer.ts:384`).
- The report wipes in on the first `ended` frame (`battleView.ts:511–523`).
- `loop.ts` uses `this.acc += dt * s.speed`, so a view-set scale works and the sim stays deterministic.
- `screenShake` defaults to false, and `reducedMotion` exists (`settings.ts:27`).
- `data/sprites/heartcap.json` exists.

**Wrong or missing:**
1. **The "slowed last third" has no cap.** It starts at ⅓ and runs "until the end" at 0.4×.
   - On plain rework that's ~3 game-seconds, about 7 s to watch.
   - Under `rework,breach`, ⅔ → dead is 24 s ([measurements.md](../measurements.md)), and the ⅓ last stand alone gives 20 s at quarter damage. That's 30–60 s of slow motion.
   - On a 3×-speed run it also overrides the player's own speed choice for the most decisive seconds.
   - Use a hit-stop and the held frame on the killing blow instead. If slow motion stays as an A/B, cap it at about 3 s of real time and then ease back to 1×.
2. **It presents a cliff; it doesn't soften one.** Under rework your own ⅔ "cracking" alarm comes about 6 s before death, so it's drama rather than a warning. D1 is the warning. Say so, so nobody counts D3 as a comeback measure.
3. **SPEC §17 #20** ("no animations beyond 2-frame cycles"): the crack stages are static overlays and the burst is an effect, so it's fine. Note it when SPEC is updated.

---

## D4. Make the rework's rules visible and honest

**Verdict: revise.** The highest-confidence readability work, and P3 Q4 asks exactly this. Two facts are wrong.

**Verified:**
- `combat.ts:301` pushes `eff: classify(state, combined)` with `combined = effMult = matrix × tag` (`damageFor`, line 235). The flyer `meleeMult` goes into `resist` (lines 256–259) and is left out.
- `isPinned` (line 114), `noteCall` (309) and `answerCalls` (322) are used only in the sim.
- Cloud alphas are 0.14 and 0.22 (`renderer.ts:443/445`).
- The mound is drawn in `renderer.ts:509`.
- `hashState` walks the whole state, `state.events` included (`snapshot.ts:5`, `hash.ts`). D4 is right that a `called` event moves rework hashes, and [battle-feel](../battle-feel.md)'s "events aren't hashed" is wrong. No committed golden (M1–M5) uses rework, so nothing committed moves.

**Wrong:**
1. **The spark reclassification.** `data/balance.json` sets `effectiveness.strongAtLeast` 1.5 and `weakAtMost` 0.75.
   - A Sporeling's slash on a light Driftling is 1.5 × 0.5 = **0.75, which is "weak"** (a gray spark), not "normal" as the proposed unit test expects.
   - "Step down one class" gives normal, which is still dishonest.
   - Classify on the effective multiplier (matrix × tag × the flyer's `meleeMult`), using the same thresholds.
   - Also decide whether merge-perk resistances (also in `resist`, also left out) should count. They're small; probably not.
2. **The storm-cap glyph.**
   - The `waveCapped` event is `{ side, units }` (`state.ts:529`), with no building.
   - "⬢!" already means "holding for supply" (`renderer.ts:308`, SPEC §10.4), a different state.
   - Show "−N to the supply cap" on the beat chip for a few seconds instead.

---

## D5. Teach the rework in the game, and put the callouts on a diet

**Verdict: revise.** The facts check out.
- `help.ts:56` lists keys 1–8. `help.ts:68` gives Hold's duration from `maxHoldTicks` (30 s, wrong under waves).
- `tips.ts:83` has the Hold tip's "hold your units back".
- `movement.ts:60` applies the rally only when `!r.waves`.
- `battleView.ts:332` raises red "Column N lost" for any enemy flip.
- `TABS` (`help.ts:16`) has no rework tab.

**Wrong or missing:**
1. **"No knob is needed because all the text exists only under rework rules" is wrong for item 4 and item 5.** Neutral-column callouts, Bloomed callouts and tray wording all fire on the default game.
   - That's acceptable: UI passes have shipped straight to develop before. But say it, or put the diet behind its knob for the A/B.
2. **"Only for columns you held" needs ownership tracking.** The `columnFlipped` event is `{ lane, column, to }` with no `from` (`state.ts:503`), so the view must remember the previous borders.
3. **The `flyer` and `mound` tips are the same job as D7's first-sight card.** Use one mechanism.
4. **Item 5 (function words on every tray card) is separate.** It's [research](../../../../../research/research-one-more-run-and-feel.md) #24, it touches every mode, and the cards already truncate.
5. **Timing.** [rework-state.md](../rework-state.md)'s adoption plan already lists "Help tabs, first-time tips". Writing a full Waves tab before P4 risks text for rules P4 drops (Rhizomorph K6, flyers K5).
   - The proposal's own argument ("lets P3 separate bad rule from unknown rule") holds only if something ships *before* the user's playtest.
   - So: the stale-text fixes now (hours), the tab and tips with adoption.

---

## D6. Juice the player's decisions, and give combat a sound

**Verdict: revise (narrow it).**

**Verified:**
- 30 sounds in `data/sounds.json`.
- `hit` plays only for Heartcaps.
- Powers reuse event sounds (`battleSound.ts`, the `power` case).
- `TIER_SCALE` [1, 1.25, 1.5] (`renderer.ts:22`).
- The engine has one looped drone, so a din needs new engine work.

**Problems:**
1. **Its own evidence cuts against two items.** Kao et al. 2024, as the [research file](../../../../../research/research-one-more-run-and-feel.md) summarises it: feedback tied to success raised every motive, and plain amplification lowered them.
   - A din whose gain follows *all* hits is plain amplification.
   - So is a pop for every one of your kills: about half of ~27 deaths a minute.
   - Keep both out of the first pass, or treat them as a later A/B.
2. **Effort is L, not M.** It covers hit-stop, three power effects and sounds, a clash flash, a flip creep, a new engine loop, kill pops, unit scale and outline, shadows, a settings toggle and a SPEC table.
3. **Overlaps:**
   - Enemy BLOOMED! labels: D5 also drops them.
   - The loop time scale: D3.
   - The clash flash needs waves; the proposal says so.
   - A larger Elder (1.7×) makes 8-Elder clumps overlap more. Pair it with the outline and check it in screenshots.
4. **What stays:**
   - hit-stop on the player's own power (≥3 targets) and Elder birth;
   - distinct power effects and sounds with a count pop;
   - the clash flash for a held wave;
   - Elder scale and outline;
   - ground shadows;
   - the flip creep;
   - the standard/full toggle.

---

## D7. Stage the rework's units across a run, with a first-sight card for each

**Verdict: revise (split it).**

**Verified:**
- `flow.ts:169–170` adds every roster building with an `aiWeight` to every general's kit.
- In battle 1, Mold's kit is her opener (Sporeling Burrow, deduplicated) plus the Tunnel, the Pod and the Stalk.
- No starter kit has a rework building.
- `hotStart` is a balance key that `src/run` reads.
- The battle-1 numbers are right (52% overall; 67% vs Mold; Armilla 61%, Cordis 56%).

**Problems:**
1. **Two different things in one proposal.**
   - The first-sight card is UI-only and can ship now.
   - `debut` is a run-layer rule. It needs measuring and the user's OK, after P4.
2. **The card can't ride the tips coach as is.** `TipCoach.wants` refuses after `LAST_BATTLE = 2` (`tips.ts:22, 54`), yet D7 debuts the Tunnel at battle 3.
   - Store `seen:<unit>` in the same remembered set (`spore-sprawl/tips/v1`), but don't gate it by battle.
   - It should absorb D5's flyer and mound tips.
3. **Mold may get stronger.** Under debut, her battle-1 kit becomes Burrow plus Pod, so her buys concentrate on Burrows: the mono swarm that already wins her mirror 70% ([rework-state.md](../rework-state.md) 4.2).
   - "Can move either way" undersells this. Measure vs Mold specifically, alone and with `hotstart`.
4. **Evidence of harm from untaught units is thin.** The only reports are [rework-state.md](../rework-state.md)'s risk 6 ("reads as unfair", reasoned, not observed) and "never saw a Rhizomorph", which is a readability problem D4 addresses. Impact is modest.

---

## D8. A battle report that explains the loss

**Verdict: revise.**

**Verified:**
- `report.ts:250–251` lists only stipend, economy, interest and comeback. `goldEarned.effects` and `.drafts` exist (`state.ts:641`).
- `frontLine` is in state and hashed.
- The Tithe's ~400 invisible gold is from the [first-run playthrough](../playthrough-newcomer.md).

**Problems:**
1. **Storage conflict.** UI-side sampling in `battleView` breaks on resume: `resume.ts` re-simulates headless, so the view never sees those ticks.
   - A sim-side `armyLine` must be gated by a compiled rule, which moves hashes only under that knob.
   - That contradicts D1's "present never enters `state.rules`".
   - Pick one: a rules-gated stats flag in the `feel` preset, or a per-step hook during re-simulation.
2. **The near-miss line almost never fires on today's rules.**
   - "Their Heartcap ≤ 50%": the winner's Heartcap is untouched in 719/720 battles.
   - "You led the army within 60 s of the end": the army gap opens ~2 min before the end.
   - Use "you led the army until M:SS" (when the loser led for ≥30 s after 2:00), and measure how often it fires.
3. **The turning-point median depends on the metric.**
   - Field supply: the gap opens ~2 min before the end.
   - Material: the winner pulls ahead for good about 53% of the battle from the end, ~3.5–4 min.
   - Report the measured value rather than asserting ~2 min.
4. **The replay is out of scope.** SPEC §17 #17 rules out a replay viewer UI, so it needs a spec change. Park it.
5. **Ship the "Relics and cards" gold row now.** It's a bug fix and independent of everything else.

---

## D9. Prices that tell the truth, and a placement that waits for its gold

**Verdict: keep.**

**Verified:**
- `tray.ts:88–99` compares and fills toward `c.cost` (the base price).
- The session already shows queued placements while paused (`session.ts:57, 167–170`).
- The ghost shows the forward price (`battleView.ts` ghost tip).
- The six failed placements come from the [first-run playthrough](../playthrough-newcomer.md).

**Additions:**
- Cancel the pending placement with a callout when its plot turns illegal (a border moves, or the plot becomes occupied). Otherwise the sim rejects the command and plays "illegal": the silent fail this proposal exists to remove.
- Compute "from N" on a cache keyed like `legalMask` (borders and buildings), not every frame.
- Same as A3 item 3. Give it one owner.

---

## D10. A front lens

**Verdict: keep, conditional.**

**Verified:**
- SPEC §13.6 says "No camera: the whole map is always visible".
- The field is 35.6% of the window height ([battle-feel](../battle-feel.md) §2.1).
- ER-7a (scaling the whole strip) was rejected and done differently. A crop is a different angle.

**Notes:**
- At 3× and 1280 wide, about 26 tiles fit, not 24.
- The "fight inset at ≥900 px" doesn't exist at 1280×720, the SPEC minimum. All the frame art (roots ceiling plus soil bed) is ~22% of 720 px, about 158 px in total, against the 288 px an 8×6-tile crop at 3× needs.
- The cheaper levers in D6 (Elder outline and scale, shadows) and D5 (label diet) should be judged first.
- Add "could you see what your units were doing?" to this playtest, so the gate condition is measured rather than assumed.

---

## What this lens should also have proposed

1. **A pre-playtest fix list and an observation sheet.**
   - The user is about to playtest. Several of this lens's findings are self-inflicted confusion the playtest will otherwise measure. Each fix takes hours and is UI-only:
     - Help Keys' Hold line and 1–9 (`help.ts:56/68`);
     - the Hold tip under waves (`tips.ts:83`);
     - the 1280 chip overflow;
     - "Column N lost" for neutral columns (`battleView.ts:332`);
     - the flyer spark class.
   - If the build must stay frozen, hand the tester a one-page "what's different under rework" sheet and a record sheet. Record per battle:
     - commander, general, map and result;
     - the clock time they knew who'd win, against the actual end;
     - failed placements;
     - Holds, and whether they were by rote;
     - whether they heard the beat;
     - whether "2 waves" read as beats or minutes;
     - what can hit a flyer.
2. **Clash results per beat** ([battle-feel](../battle-feel.md) G8).
   - When a side's wave *n* in a lane is wiped out, show "Clash won · 9 left" or "Clash lost", with a bigger banner for a clean sweep.
   - It's render-side, from units' `wave` field.
   - It gives each 20 s beat a readable outcome, and a "who's winning" at the scale the player acts on. Neither D1 nor D6 covers it: D6's clash flash only marks a held wave meeting the line.
3. **A Hold prompt at the beat** ([battle-feel](../battle-feel.md) G6, UI part).
   - At 3 s before the beat, show "Send 14 / Hold → 28" per lane with that lane's switch, beside the beat chip.
   - Hold is the one beat verb, and today it's offered nowhere near the information. Overlaps A3 item 2.
4. **A persistent "Massing" line in the intent panel** (E1 item 3).
   - For example "Massing: Sporeling Burrow ×9". P3 Q2's complaint is "nothing names what the enemy masses".
   - D1's strip shows the next wave for only 5 s a beat, and its gauge gives size, not kind.
