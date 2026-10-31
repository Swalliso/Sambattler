# Critique of lens B: build expression and run-to-run variety

Evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): a critic's check of [lens B's proposals](b-builds.md). Written by an agent during that review; nothing here is adopted, and the review's [Appendix A](../../after-the-rework.md#appendix-a-every-surviving-proposal) holds the final verdicts. Recovered from the session transcript, so raw outputs weren't kept.

Written 2026-10-31 against `develop` at `ef2e133` (a local checkout). I checked each proposal against the [ledger](../ledger.md), the review's evidence reports and the code. Nothing in the repo was changed.

## Verdicts at a glance

| id | Proposal | Verdict | Impact | Confidence | Effort | The main reason |
|---|---|---|---|---|---|---|
| B1 | Lane pairs | **revise** | 3 | 2 | L | 2 of the 3 run maps have one lane, so a "lane pair" there just means owning both buildings. Its placement bar can't pass on Bogwater. It also duplicates two of B3's mutations. Effort is L, not M |
| B2 | Keystones | **revise** | 4 | 2 | L | Deep Tithe can never pay out. Mono Bloom rewards the dominant strategy. Only 2 of the 6 "stage 1" cards need no new sim code. It competes with B5 for the elite reward, and repeats B10, B4 and A7 |
| B3 | L3 mutations | **revise** | 3 | 3 | M (first slice) | 73% of `rework` runs end with no level-3 track, so a mutation gated at L3 reaches about a quarter of runs. Teeming is weaker than today's L3. The G3 bar can't be met. Generals almost never reach L3 |
| B4 | Commander identities | **revise** | 4 | 3 | M | Puppet Bloom skips units whose merge toggle is off (`powers.ts:62`), so "toggles start Off" disables Cordis's power. The Velvet Shrine rewards mono waves. This is part of P4's K1 work, not something to do after P4 |
| B5 | Loot from the general | **revise** | 3 | 3 | M | It overlaps E7 and E2, and fights B2 for the elite slot. Fixed doctrines make every run's loot the same. Its route bar is already met today. Mold's doctrine would strengthen the battle-1 wall |
| B6 | Themed wilds | **revise** | 3 | 3 | M | It leaves out the Scythecap Grove, the only anti-swarm spawner. Replacing bans changes an interview decision. Three packs depend on what P4 keeps. Effort is M, not S |
| B7 | Draft and card hygiene | **revise** | 2 | 4 | S | Item 5 duplicates D9 (which is fuller). `draft.exclude` doesn't exist. Damage from upgrades isn't tracked. Rot Ward is misattributed |
| B8 | Card-impact check and commit bot | **revise** | 2 | 4 | M | A fixed-weight bot never builds an unweighted blueprint. There are 3 generals, not 4. It should add build-diversity metrics and bring the exposure script into the repo |
| B9 | The Sporemat | **drop** | 2 | 1 | L | Comeback income pays the side with fewer columns, so the Sporemat's ground pays the enemy. Ground has no payoff, and being behind is already an edge. Its tests are self-fulfilling. It belongs to the territory lens |
| B10 | Seasons | **revise** | 2 | 3 | S | It repeats B2's Double Time and Great Muster. It should share M7's blight pipeline. It doesn't depend on B6, and Rich Soil leans on loam, which measures as noise |

**The set as a whole.** It proposes seven new layers: pairs, keystones, mutations, commander rules, doctrines, packs and seasons. That comes on top of the rework's roughly 10 new rules, which already strain F8. Together they would bury the newcomer that [playthrough-newcomer](../playthrough-newcomer.md) describes. A sensible order:
- **Now:** B8 and B7, which are tools and hygiene; also measure B6.
- **With P4:** B4.
- **After P4:**
  - B3 as mutation cards;
  - B2 at K0 only;
  - B5 merged with E7;
  - Hunting Pack alone from B1.
- **Later:** B10.
- **Drop:** B9.

Every proposal also rests on runs lasting long enough for a build to form, and 48% of runs end in battle 1. Its value depends on [lens C](c-run.md)'s run-arc work (`hotstart`, lives) landing first.

---

## B1. Lane pairs: revise

**What I checked:**
- **Bogwater Hollow and Stumpfield each have 1 lane; Twin Roots has 2** (`data/maps/*.json`). On 2 of the 3 run maps, "active while both stand in that lane" means "own both". So:
  - the "lane you build in decides your pairs" feel applies only to Twin Roots;
  - the spread bar on Bogwater ("best − median above 25% of worth") can't be moved by a lane rule.
- **Twin Roots split-half ρ is 0.68 at 3:00**, confirmed in [`docs/balance-backlog.md`](../../../balance-backlog.md#placement-spread-step-cs-baseline) §"Placement spread" (on M5 rules).
- **`bot:balanced` builds Burrow 3, Capguard 3, Gill 2, Scythecap 2, Veilstalker 1 and Mortar 1** (`data/bots.json`). So it fields Phalanx, Screen, Hunting Pack and Anvil, and the G3 drop would partly come from strengthening the defender. That's legitimate, but it should be reported separately.
- **Two pairs duplicate B3:**
  - Fuse (Bursters wait for contact) is B3's Fusecap;
  - Updraft (Driftlings hold ground) is B3's Gale.

  Updraft also touches the flyer territory rule, which sits inside known issue K5.
- **There's no `bot.pair-*` wildcard.** `applyProto` adds a bot only by exact id (`src/data/proto.ts` `ENTRY_FILES`).
- **The pairs are small next to what decides battles.** The strategist's diagnosis is ×6.25 Elder tiers from waves that merge almost everything. Only Hunting Pack, which attacks units that are knitting, goes at that mechanism. Phalanx's extra 15% shield is the same "20% shield doesn't offset an Elder" problem.
- **Effort is L:** seven bespoke rules across `combat.ts`, `targeting.ts`, `movement.ts`, `territory.ts` and the tower code, plus UI, AI and a bot for each pair.

**Ledger:** this is a new angle on OMR-13 and CS-1 to CS-3, which are parked. It isn't DR-7. The user parked "which neighbour" rules behind the rework, so "after P4" respects that.

**Revised proposal.** Strain pairs, first slice:
- **Scope.** Four pairs, active in a lane while both buildings stand in it. State plainly that on one-lane maps this is a composition rule, not a placement rule.
  - **Hunting Pack** (Burrow + Veilstalker Hollow): Veilstalkers take enemy units that are knitting before other targets, and see 2 tiles farther. Build it first, as its own knob, because it's the one pair aimed at the merge snowball.
  - **Phalanx** (Vesper's starter): Sporelings march 1 tile behind the Capguard front.
  - **Screen** (Cordis's starter): archers behind their melee are pinned at ×0.6.
  - **Anvil** (Armilla's starter): the Mortar's minimum range drops to 0.5 while a friendly Capguard is within 2 tiles of the target.
  - Drop Fuse and Updraft, which belong to B3, and Tended (Tender's Ring is seen in 26% of runs).
- **UI and AI:** as proposed.
- **Test:** `npm run experiment -- --proto rework,huntpack --checks g3,counters,g4 --g3seeds 50 --g4seeds 200 --workers 8`, then the same with `wavepairs`. Pass if:
  - mono Sporeling and mono Veilstalker G3 means drop at least 8 points;
  - the strict counter bar passes and G4 stays in band;
  - each pair bot, entered as its own `bot.<id>:{…}`, stays at or below 55/60.

  Report how much of each G3 drop comes from `bot:balanced` gaining pairs.
- **Placement bar:** Twin Roots only (lane-choice ρ stays at least 0.6). Drop the Bogwater bar.
- **Effort:** L for four pairs; M for Hunting Pack alone.
- **Timing:** after P4. Also read it alongside [lens A](a-battle.md)'s merge-at-the-beat work (A4), because pairs matter only if the merge snowball is addressed.

---

## B2. Keystones: revise

**What I checked:**
- **Deep Tithe would never pay.** A building is a fort: `frontierBlocked` and `laneForts` in `src/sim/systems/territory.ts` stop its column from flipping. Placement also requires your own territory (`placement.ts`: "not your territory"). So an enemy building can never stand in a column you own.
- **Mono Bloom works against the lens.** It gives one-type waves the shield and takes it from mixed waves. That flips the rework's only reward for diversity, in favour of the strategy that already wins (G3: Sporeling 83/86). [Research](../research-autobattler-roguelites.md) #4 says broken builds should "take assembly"; Mono Bloom needs none.
- **"Stage 1 needs little or no new sim code" is true only for Double Time and Great Muster.** Those use `side.waveBeat` and `side.waveSize`, which exist in `schema.ts:42`, and `waveSystem` already supports a per-side beat. The others need new code:
  - **Burst Seeds** needs a cloud action. `EffectActionSchema` has only gainGold, explode, repairHeartcapPct, shieldHeartcap and readyPower.
  - **Heirloom** needs run-layer pre-placement.
  - **Rootholds** needs per-column hold timing.
  - **Deep Tithe** needs a new term (and is broken, above).
- **Confirmed:**
  - the `release` event fires in `waveSystem` (`spawning.ts:189`), but there's no `release` trigger (`TriggerSchema`);
  - `applyProto` reaches only building, unit, bot, general and faction entries;
  - research supports 9 Kings' councils at years 4, 14, 21 and 29, a king-specific decree at each, and a named "broken" category.
- **Repeats elsewhere in the set:**
  - Double Time and Great Muster are B10's Monsoon and Drought;
  - Vanguard is A7 (first wave at 0:10) plus a new `firstBeatSeconds` knob;
  - Chain Bloom is B4's Puppeteer change.
- **The elite reward is claimed by B2, B5 and E7 at once.**
- **Halving relics in drafts (20 → 10) makes in-battle drafts flatter.** Upgrades are 100% flat numbers until B3 lands. It also cuts rule-changing exposure, which is already only 6% of offers.
- **A K0 reroll at 10 Spores is impossible:** a run starts with 0 Spores.
- **"Each keystone moves battle 1 by +3 to +15" can only hold for K0.** K1 and K2 come after battle 1.

**Ledger:** a real new angle. `bigdrafts` showed rarity isn't size; this adds a bigger class of card. It answers ER-5b, CR-4, CR-6, F9 and F11.

**Revised proposal.** Keystones:
- **Schedule:** 1 of 3 at K0 (run start, in the Underroot, one free reroll), K1 (after row 3) and K2 (after row 5); later rerolls cost 10 Spores.
- **Each offer:** one commander keystone, one keyed to your most-built spawner (the starter at K0) and one generic.
- **Card list, first 12:**
  - **Generic:**
    - Double Time (your beat 15 s, waves ×0.8);
    - Great Muster (your beat 30 s, waves ×1.6);
    - Three-Strain Wave (a wave of 3+ types gets a 40% shield);
    - Patient Roots (a held wave leaves +25%; the cooldown is unchanged, so it doesn't feed the rote hold schedule K-Hold found);
    - Heirloom.
  - **Spawner-keyed:** Brood Beat.
  - **Vesper:** Burst Seeds, Home Brood.
  - **Armilla:**
    - Rootholds;
    - Siege Tithe (Tithe also pays 20 for each enemy building you destroyed this battle).
  - **Cordis:**
    - Stored Bloom (Puppet Bloom also merges units waiting inside spawners in its radius);
    - Knit on the March.
  - **Cut:** Mono Bloom and Vanguard (A7 owns the first beat).
  - **K2's labelled Broken card must need assembly,** e.g. Three-Strain Wave at 60%.
- **Rewards:**
  - Leave the elite slot to the loot system (B5 merged with E7).
  - Keep relics at 20% of draft cards until B3 lands.
  - The general gets none.
- **Implementation:** as proposed. Stage 1 is K0 with Double Time, Great Muster and Three-Strain Wave, which need only stats or a `mixedMinTypes`/`shieldFrac` side stat. Heirloom, Burst Seeds and Rootholds are stage 2.
- **Test:** `--proto rework,keystones --checks runs --commander all --power-policy auto --runs 200`, plus B8's card check. Pass if:
  - each K0 keystone moves battle-1 losses and runs won by +3 to +15 points;
  - K1 and K2 move runs won by +3 to +15 among runs that reach them;
  - committed picks beat random picks by at least 8 points;
  - the commander spread is 15 points or less;
  - no Broken card adds more than 20.
- **Effort:** L. **Timing:** after P4.
- **Depends on:** P4, B8, and a boss retune (lenses C and E).

---

## B3. Mutations: revise

**What I checked:**
- **Most runs never reach L3 under `rework`.** Re-reading [run-loop](../run-loop.md)'s raw run data (`rework-*.json`, raw output not kept):

  | Runs | Level-3 tracks at the end: 0 / 1 / 2 / 3+ |
  |---|---|
  | All 240 `rework` runs | 176 (73%) / 41 / 18 / 5 |
  | The 44 won runs | 3 / 22 / 16 / 3 |
  | `rework,hotstart,bigdrafts` (all runs) | 93 / 41 / 49 / 57 |

  "Most runs reach L3 on 1–3 tracks" is true only for won runs, so a mutation gated at L3 is a late-run reward that 3 in 4 runs never see. Upgrade candidates offer only a track's next level (`draft.ts` `candidates`), so L3 needs two earlier picks on the same track.
- **Teeming is weaker than the L3 it replaces.** Today's Burrow L3 is "+1 Sporeling per spawn" at full HP every 16 s (`data/upgrades.json`; the Burrow makes 2 every 16 s). B3's Teeming is 3 every 18 s at HP ×0.8. SPEC §11.5's Teeming also had knit time ×0.5, which B3 dropped.
- **"The general's L3 picks a mutation, so you see mutations first" won't happen.** `generalKit` gives (i − 1) random levels spread over the whole kit, and the boss 4. A general almost never reaches L3 before the boss, except through Veteran.
- **The G3 bar ("no mutated mono exceeds 55/60") can't be met.** The unmutated mono Sporeling, Drift Stalk and Veilstalker already exceed it. G3 battles also don't field upgrades (OMR), so mono bots with L3s need new tooling.
- **Feeding the worst offenders:**
  - a Drift Stalk track (HP +15%, damage +15%) strengthens mono Drift Stalk, which is at 72/90 (K5);
  - Gale duplicates B1's Updraft.
- **Longgill's +1.5 range takes the Gill Archer to 6.5,** reopening DR-2's range-ceiling question for runs.
- **Confirmed:**
  - upgrades are keyed by `building` (so `applyProto` needs an `upgrade.<building>` kind);
  - `draftPick` is in `commands.ts`;
  - the Tunnel, Pod and Stalk have no tracks;
  - the DSL already covers most of the slice: `unitDeath` → `explode`, the `zone` and `onLoam` positional `goldPerTick`, `siegeMult`, `spawnCount`, `range` and `attackInterval`.

**Ledger:** ER-5c, ER-5d, CR-9 and DR-16. Nothing here was measured and failed.

**Revised proposal.** Mutation cards:
- **The card.** "Mutate: \<building\>" is its own uncommon draft card. It's offered once you own the building, at most once per building per run, and shows both options on the card. Taking it removes that track's L3 from future offers. This is ER-5c's "mutation cards as draft cards", so they can arrive in battles 1–2.
- **First slice:** 6 buildings, 12 mutations.
  - **Burrow:**
    - Teeming: 3 per release every 16 s, HP ×0.85, knit ×0.5;
    - Bursting: on death, 15 crush with radius 0.8; HP ×0.85.
  - **Capguard:** Ironcap (needs an armor-override stat) or Bulwark.
  - **Gill Nest:**
    - Longgill: range +1.0, interval ×1.25;
    - Volley.
  - **Truffle Cellar:** Deep Truffle or Wild Truffle.
  - **Rootbreaker:** Battering or Tunneling (SPEC §11.5).
  - **Burster Pod:** Fusecap or Sporebloom.
  - **Deferred:** the Drift Stalk until K5 is settled, and the Tunnel until CR-15 is decided.
- **The general** shows mutations through its doctrine (B5 merged with E7), not through L3.
- **Implementation:** as proposed, plus a mono-bot loadout override in `tools/lib` so G3 can field mutations.
- **Test:** `--proto rework,mutations --checks g3,counters --g3seeds 50 --workers 8`. Pass if:
  - no mutation raises its mono build's G3 mean by more than 5 points over the unmutated mono under the same rules;
  - the strict bar holds;
  - in runs, each mutation moves runs won by at least 3 points where its building is built;
  - A and B win different matchups.
- **Effort:** M (DSL plus one stat). **Timing:** after P4.

---

## B4. Commander identities: revise

**What I checked:**
- **Cordis's redesign as written disables her power.** `bloomTrios` skips any unit with `!u.mergeOn` (`src/sim/powers.ts:62`). Merge toggles are per building, and units inherit them (`create.ts:392`, `commands.ts:130`). So "toggles start Off" plus Puppet Bloom merges nothing unless the player first turns each building's toggle on.
- **Armilla's opener is Capguard Hall 150 + Mortar 160 = 310** against 300 starting gold. One stipend tick (8 gold every 5 s) covers it before the first beat at 0:20, but the card should say so.
- **"A standing tower counts as a type" needs a definition.** It should mean tower buildings (the Mortar), not the Heartcap's turrets.
- **The Velvet Shrine's stage 2** (spawners near it release shielded even in a one-type wave) is a local Mono Bloom: it rewards mono.
- **Numbers confirmed in [`measurements.md`](../measurements.md):**
  - runs won 36 / 11 / 14% (V / A / C);
  - battle 1 lost 38 / 61 / 56%;
  - with `hotstart` and `bigdrafts`: 56 vs 30 vs 30% won;
  - the Mortar is worth 1.5 supply in 90 s;
  - Cordis makes 66–127 merges a battle ([`rework-state.md`](../rework-state.md)).
- **Timing.** [`rework-state.md`](../rework-state.md) P4 row K1 already proposes "a second unit type for Armilla; revisit Tithe and Puppet Bloom". This is P4's K1 work, not something for after it.
- **[Lens E](e-opposition.md) already moved part of this.** E's measurement (`revoice-runs-armilla.txt`, raw output not kept) re-voiced Old Mother Mold (beat ×0.75), and Armilla's battle-1 losses fell to 38 of 100. Part of the commander gap is the battle-1 general, so measure B4 with and without E2 to avoid fixing it twice.

**Ledger:** CR-7 and DR-29 (planned M6), DR-37; it follows K1. Not a repeat.

**Revised proposal.** One signature rule per commander, measured as part of P4's K1:
- **Armilla, Bastion** (replaces capture +25%): a tower building standing in a lane counts as one unit type for that lane's mixed-wave check. Rhizome Tithe also pays 15 for each of her buildings standing past home.
  - **Control:** measure the data-only alternative from [`rework-state.md`](../rework-state.md) K1 alongside it (starter Mortar → Sporeling Burrow) and keep whichever closes the gap with fewer rules.
- **Cordis, Puppeteer:**
  - merge toggles stay On;
  - Puppet Bloom's cooldown goes 80 → 45 s and its radius 3 → 3.5;
  - it chains once (Bloomed trios become Elders);
  - it also merges units waiting inside her spawners in the radius, which then leave pre-merged on the next beat.

  If default-Off toggles are tried as a variant, Bloom must ignore the toggle.
- **Vesper:** unchanged, with her passive shown on home spawner badges.
- **Kits:** `draft.coreWeight` 2 → 3, and the run's first spoils deals core blueprints only.
- **Stage 2** (tied to M6 mastery):
  - Rootgate and the Puppet Pod as proposed;
  - Velvet Shrine: spawners within 2 tiles release with +1 unit every other beat, not "shielded in a one-type wave".
- **Implementation:** as proposed: a `towersCountAsType` side flag read by `shieldMixedWaves`, bloom `chain` and `stored` in `powers.ts`, and a `commander.<id>` kind for `applyProto`.
- **Test:** `--proto rework,cmdkits --checks runs,engagement --commander all --power-policy auto --runs 200 --seeds 30`, with and without `hotstart,bigdrafts`, and with and without E2's general change. Pass if:
  - the runs-won spread is 15 points or less;
  - Armilla and Cordis lose battle 1 at most 45% of the time;
  - Cordis's power merges per use rise;
  - Vesper is unchanged.
- **Effort:** M. **Timing:** with P4.

---

## B5. Loot from the general you beat: revise

**What I checked:**
- **Generals can hold relics.** `battleConfig` passes the enemy no relics today, but the sim compiles relics per side (`draft.ts` line 239 reads the enemy's relics), so "no sim rule" is plausible. `general.mother-mold.<path>` is patchable (the id is `mother-mold`).
- **Overlaps:**
  - E7 (elites as trials, with themed loot from the beaten general, citing CR-8 and F11);
  - E2 (re-voicing the generals with a doctrine each).
- **Conflict:** B2 also takes the elite relic slot.
- **The route bar is already met.** "Best and worst route policies differ by at least 5 points": [run-loop](../run-loop.md)'s "battles" route (33 wins) and random route (44) already differ by 11.
- **Fixed three-card doctrines make every run's loot identical,** since there are only 3 regular generals. That cuts run-to-run variety.
- **The general fielding Knitting Circle and Bloom Vigor would strengthen the wall.** Old Mother Mold already wins 67% of battle 1s, and battle 2 is lost 43%. The merge snowball is what decides battles.

**Revised proposal.** Merge with E7 as a single loot system:
- **Doctrines per run.** Each general has a 6-card doctrine pool, and each run draws 3 of them, shown on the node as "Win to take one of: …".
- **Rewards:**
  - a Rout win adds one loot pick to the spoils;
  - an elite (E7's trials) gives 2 loot picks in place of the relic-only pick.
- **Fielding.** The general fields one of its run's doctrine cards from battle 2, chosen from cards that don't feed the swarm-merge snowball. Mold's pool drops Knitting Circle and Bloom Vigor from what she fields; they stay in her loot.
- **Stage 1:** existing relics. **Stage 2:** B2 and B3 content.
- **Implementation:** as proposed: `generals.json` `doctrine`, `generalKit` returns relics, `rewards.ts`, and `run.ts` nodes.
- **Test:** `--proto rework,loot --checks runs --commander all --power-policy auto --runs 200`, plus a loot-chasing route policy. Pass if:
  - the loot-chasing route wins at least 3 points more than the random route;
  - the "always fight" route trails random by 5 points or less (today it trails by 11);
  - battle-2 and battle-3 losses rise at most 5 points.
- **Effort:** M. **Timing:** after P4, with E6 and E7.

---

## B6. Themed wilds: revise

**What I checked:**
- **The roster is 17 buildings:** 6 basics, 11 others.
  - The 10 packs plus the basics cover 16; **the Scythecap Grove is missing.** It would then appear only for Cordis, whose core it is.
  - It's `bot:balanced`'s weight-2 anti-swarm unit and an answer named in the counter work.
- **The relic count is right.** 10 packs × 2, plus the Sporestorm Sigil, is exactly the 21 in `data/relics.json`.
- **Vesper's core is the M1 basics,** so her pool is 6 buildings plus 4 pack buildings.
- **The §11.7 merge engine is split.** Spore Tithe and Knitting Circle are in Brood; Bloom Vigor and Elder's Patience are in Elders. Drawing both packs in 4 of 10 has a chance of C(8,2) / C(10,4) = 13%.
- **The rest checks out:**
  - the probability argument (a smaller pool alone doesn't help engines) is sound;
  - `draftPool` is at `create.ts:177–188`, as cited, and `runPool` is in `flow.ts`.
- **Replacing 3 bans with 2 pack swaps changes SPEC §1.2's interview decision** (core + shared pool + up to 3 bans). The spec is malleable, but this is the user's call. Bots never ban, so `runs` won't measure swaps.
- **Effort is M, not S:** Underroot UI, `RunState`, the save shape and the general's kit filter.
- **3 of the 10 packs anchor on rework buildings** (Burster Pod, Drift Stalk, Tunnel), so their contents depend on P4.
- **Overlaps with D7,** which stages the rework's buildings by battle index. Both filter the player's pool and the general's kit.
- **The exposure script** [`runstats.ts`](../scripts/run-loop/runstats.ts) is a scratch script, outside the repo's tools.

**Revised proposal.** As proposed, with these changes:
- the Scythecap Grove joins the always-in set beside the M1 basics, so every run has an anti-swarm spawner;
- say plainly that the full merge engine needs two packs, or move Bloom Vigor into Brood and give Elders Hardy Spores;
- keep bans and add one pack swap, until the user decides on §1.2;
- coordinate with D7 so a pack can't put a building into battle 1 that D7 debuts later.

**Test:** as proposed. Port the exposure counts into `--checks runs` (B8), and add "both relics of a pack owned" per pack.

**Effort:** M. **Timing:** measure now, adopt with P4.

---

## B7. Draft and card hygiene: revise

**What I checked:**
- **Confirmed:**
  - `report.ts:251` lists only stipend, economy, interest and comeback;
  - `state.ts:641` tracks `effects` and `drafts`;
  - the ghost tip already shows the price at the cursor (`battleView.ts:497–506`);
  - offers draw three numbers per card (`draft.ts`);
  - `candidates` keys upgrades on the kit, not the board.
- **`draft.exclude` doesn't exist** in `balance.json` or the schema. Item 3 is a small schema addition, not pure data.
- **The damage gained from upgrades isn't tracked.** "Sporeling upgrades: +1,240 damage" would need per-modifier attribution. An estimate (damage × (1 − 1/multiplier)) has to be labelled as one.
- **Item 5 duplicates D9,** which adds a pending placement that waits for its gold.
- **Rot Ward is near-dead because it matters only while you're losing,** not because run HP is binary ([run-loop](../run-loop.md) §3.5).

**Revised proposal.** Five changes, each its own knob or UI fix:
1. No repeats within a battle (`draftHygiene.noRepeat`), falling back to repeats when the pool runs dry.
2. In-battle upgrade cards only for kit buildings standing or placed this battle (`draftHygiene.boardUpgrades`). Spoils keep the kit rule.
3. A new `draft.exclude` list (a schema field) that retires Mending Moss while a Rout loss ends the run. Revisit it with [lens C](c-run.md)'s lives rule.
4. Report rows for "Relics and cards" gold (`goldEarned.effects`, `drafts`). A "Your cards" line shows each upgraded building's levels and an estimated damage share, labelled "about".
5. A "Pairs with" line on engine relics.

The tray price and the failed-placement message go to D9.

**Test:** as proposed (repeats and dead upgrade offers per battle at 0; runs won within noise).

**Effort:** S. **Timing:** now.

---

## B8. Measure build expression: revise

**What I checked:**
- **Confirmed:** `RELIC_SCORE` 7/9/12 (`draftPolicy.ts:10`) and spread's `--relics` (`tools/lib/spread.ts:154`).
- **Greedy scores an unweighted blueprint at 0** (`greedyScore`). Run bots get weight 1 only for commander core buildings (`botCoreWeights`, `flow.ts`), so neither greedy nor random ever builds a shared blueprint the profile doesn't weight. That's part of why random matches greedy, and it means a "card given from the start" check says nothing about blueprints unless the card comes with a build weight.
- **3 generals, not 4.** The battle-1 and battle-2 generals are Mold, the Baron and the Blightwright; the scripted general never appears in runs.

**Revised proposal.** As proposed, with these changes:
- the card check gives a blueprint card a build weight of 2 (as the commit policy would);
- it uses the 3 run generals (about 80 × 3 × 3 × 30, roughly 21.6k battles plus baselines);
- `--checks runs` gains build-diversity outputs:
  - the end-kit entropy and convergence per commander;
  - the top building's share of damage per battle (the strategist's 70–98%);
  - offer and owned exposure per card, ported from [run-loop](../run-loop.md)'s [`runstats.ts`](../scripts/run-loop/runstats.ts) (DR-6's pick share and entropy, never built).

**Effort:** M. **Timing:** now.

---

## B9. The Sporemat: drop

- **The Sporemat's ground pays the enemy.** Comeback income goes to the side with fewer columns: `deficit = cols[other] − cols[side]`, `min(comebackMax 6, floor(deficit / 2))` per 5 s tick (`economy.ts:61–65`). Every column the mat takes adds comeback gold for the side behind. That's the mis-payment both playthroughs flagged (219–277 gold to the side ahead in army).
- **Ground has no payoff** apart from build space and the Decision at 10:00. G6 at 88% says being behind is an edge. So a building that spreads ground without an army makes territory track the army even less, and "the ground leader at 3:00 wins over 50%" is likely to fall.
- **"First flip before 1:30" is self-fulfilling.** A 60-gold mat placed at deploy flips a column by 0:40.
- **1×2 footprints** touch D5's all-2×2 assumptions in the renderer, the AI and placement, so the effort is L.
- **It belongs to the territory lens.** It needs a territory payoff first (ER-4a) and a comeback rule keyed to army rather than columns. Record F14 and F15 in `docs/ideas/`.

---

## B10. Seasons: revise

**What I checked:**
- **Every stat exists:**
  - `side.waveBeat` and `side.waveSize`;
  - `side.knitTicks` and `side.mergeRadius`;
  - `battle.sporestormStart`;
  - `side.loamBonus`, `side.stipend` and `side.startingGold`.

  `battleConfig` already pushes `side: 'both'` modifiers (`flow.ts:117`).
- **Monsoon and Drought are B2's Double Time and Great Muster.**
- **The dependency on B6 is wrong:** seasons show on route row 1, not in the Underroot.
- **Rich Soil leans on loam,** which the spread tool calls "pure noise".
- **Long Night moves the storm,** and A2 reshapes it.
- **M7's blights (§9.6, §11.8)** are the same mechanism: one-sided or battle modifiers before a run.

**Revised proposal.** Seasons, one both-sides rule per run, built on the blight pipeline that M7 will reuse:
- Monsoon and Drought stay here, and B2 drops its copies or keeps only player-side versions under other names.
- Replace Rich Soil with "Thin Walls": Heartcap turret damage ×0.8 for both sides, through `side.turretDamage`. It weakens the "fight under your own turrets" edge that [`rework-state.md`](../rework-state.md) gives as K2's likely cause. Avoid first-spawn seasons, because waves hold every spawn to the 0:20 beat anyway.
- Coordinate Long Night with A2.
- **Test:** per season, G3 at 30 seeds and G4 at 200, plus a runs check. No mono build may pass a 60% mean, and G4 Decisions must stay at or below 20%.
- **Effort:** S. **Timing:** later.
- **Depends on:** P4 and A2.

---

## What this lens should have proposed

1. **Feats as build goals, plus run history and a remembered setup.** This is the thin meta, and it doesn't depend on P4. Feats like:
   - "win a battle with no Sporeling Burrow";
   - "win with three unit types in every wave";
   - "five Elders at once".

   They push players to try different builds across runs, which is pillar 4 and SPEC §9.2. The stats they need mostly exist (`state.ts:630–661`). It needs a profile key under `.claude/rules/storage.md`. This is the direct run-to-run variety lever, with no combat risk.
2. **A data-only commander control before B4's rules:**
   - Armilla's starter Mortar → Sporeling Burrow;
   - `coreWeight` 3;
   - a first spoils of core blueprints only;
   - SPEC §9.5's level-4 "starter choice" (2 options) pulled forward.
3. **A "choose the card type" spoils** (blueprint / relic / upgrade, then 1 of 3), which answers F9 and lets a player commit to a plan. [Run-loop](../run-loop.md) §7.2 names it; it's cheaper than keystones.
4. **Build-diversity metrics in `runs`** (folded into B8's revision above), so "builds diverge" has a number beside G3.
5. **An explicit link to the merge snowball.** Pairs and mutations change little while waves turn any body-count edge into ×6.25 Elders. The lens should say its proposals are judged after [lens A](a-battle.md)'s merge work (A4) or a merge cap, and its tests should include a "top building's damage share" bar.
