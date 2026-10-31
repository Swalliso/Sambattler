# Proposals, lens B: build expression and run-to-run variety

Evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): lens B's proposals. Written by an agent during that review and checked in [the critique](b-builds-critique.md); nothing here is adopted, and the review's [Appendix A](../../after-the-rework.md#appendix-a-every-surviving-proposal) holds the final verdicts. Recovered from the session transcript, so the screenshots it names aren't linked (see the [README](README.md)) and raw outputs weren't kept.

Written 2026-10-31 against `develop` at `ef2e133`, with `?proto=rework` as the game being judged. Nothing here is built or adopted. Rule changes arrive as default-off `?proto=` knobs in `src/data/proto.ts`, are measured with `npm run experiment`, then playtested; multi-unit retunes and rule changes wait for the user's OK (`.claude/rules/balance.md`).

Evidence comes from the review's reports: [`ledger.md`](../ledger.md), [`rework-state.md`](../rework-state.md), [`run-loop.md`](../run-loop.md), [`measurements.md`](../measurements.md), [`playthrough-strategist.md`](../playthrough-strategist.md), [`playthrough-newcomer.md`](../playthrough-newcomer.md), [`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md), [`research-lane-battlers.md`](../research-lane-battlers.md), [`research-one-more-run-and-feel.md`](../research-one-more-run-and-feel.md). Code references were checked in the checkout.

---

## Diagnosis: what a player meets on `develop` with the rework on

### 1. Composition isn't a build; one cheap spawner is
- **What the player sees:** on one seed (Stumpfield against Old Mother Mold), mono Sporeling won at 8:37 and mono Drift Stalk won at 9:04 with no decisions, while the counter matrix's mixed answer lost at 6:54. The winners' top building dealt 70–98% of their damage ([playthrough-strategist](../playthrough-strategist.md) §1, §2). The strategist's lesson: "stop thinking about composition and count Burrows".
- **Measured:** G3 fails on mono Sporeling (83/86), mono Drift Stalk (72/90) and mono Veilstalker (69/80) ([status](../../../status.md)).
- **The only reward for mixing** is a one-time 20% shield for *any* two unit types in a lane. [rework-state.md](../rework-state.md) (§5.2, risk 8) calls this "diversity by tax".
- **Placement adds nothing:** at 3:00 the best plot beats the median by 5% of a building's worth (25% on M5), and there are 14 legal plots ([measurements.md](../measurements.md)). The only placement signal ever measured was the lane choice on Twin Roots (ρ 0.68, step A).

### 2. Cards are small, repetitive and invisible, so picking well doesn't matter
- **Card size:** 40 of 42 upgrade levels and 12 of 21 relics are flat numbers.
- **Picking barely matters:** a bot that drafts at random wins 41 runs against greedy's 44, out of 240.
- **Rule-changing relics are rare:** one is in 6% of offers and owned at the end of 17% of runs ([run-loop](../run-loop.md) §2–3).
- **In play:**
  - In two strategist runs, 8 offers and 3 rerolls held one card that changed a plan, Elder's Patience (`r2b1_draft1`).
  - Thick Caps appeared 4 times, one draft repeated an earlier offer exactly, and a Gill Nest upgrade came after the Gill Nest had died (`r2b1_draft3`).
  - Upgrades came for buildings that were never built, and "+0.3 tiles" can't be seen ([playthrough-newcomer](../playthrough-newcomer.md) F-6, `SS/115`).
  - Spore Tithe paid about 400 gold that the report never shows (`src/ui/report.ts:251`).
- **The rework's three buildings** have no upgrade tracks, and they're offered in only 17–25% of runs.

### 3. Runs don't differ, and the commanders converge or fall behind
- **The pool never changes:** every run deals from the same 17 buildings and 21 relics, and "bans barely shaped the drafts".
- **Kits converge:** Armilla's end-of-run kits hold a Sporeling Burrow in 58 of 80 runs ([run-loop](../run-loop.md) §4).
- **The commander gap:** under `rework`, runs won are Vesper 36%, Armilla 11% and Cordis 14%, over 600 runs. Battle 1 is lost 38%, 61% and 56% of the time ([measurements.md](../measurements.md)). With `hotstart,bigdrafts` the gap widens to 56% against 29–30%.
- **Armilla:** her opener has one unit type, so it gets no shields, and her Mortar is worth 1.5 supply in 90 s.
- **Cordis:** her merging is what waves already do. Merges run 66–127 a battle for her (a median of 80 against M5's 24 for all battles), and Puppet Bloom doesn't chain into Elders (`r2b1_puppet3`).
- **The generals:** they mirror the player's roster, and every read is "SWARM, SWARM, SWARM" ([playthrough-newcomer](../playthrough-newcomer.md) §5).

### 4. A build never gets the time or the parts to form
- **Runs are short:** 48–52% of runs end in battle 1. The median run is 1–2 battles, with 2–6 run-level choices.
- **Engines can't come together:** the §11.7 engines need 2–4 specific cards, each offered in 6–17% of runs, and they lean on M6 strains that don't exist yet.
- **The route doesn't shape the build:**
  - every node links to every node in the next row (F10);
  - elites add about 10 points of run-ending risk for one relic (F11);
  - spoils deal the same cards as drafts (F9);
  - 6 of the 8 events offer "nothing happens".
- **Unused hooks:** the wave hooks `side.waveBeat` and `side.waveSize` exist, and nothing uses them (CR-4).

### 5. Territory and placement carry no build meaning
- **Territory misleads:** the side holding more ground at 2–4 minutes wins only 37–44% of battles ([measurements.md](../measurements.md)).
- **Flyers hold no ground:** a winning flyer army sat 7–9 columns behind while it razed the base (`SS/159`).
- **Forward building:**
  - it "never came up" (strategist);
  - new forward buildings die fast while home space runs out ([playthrough-newcomer](../playthrough-newcomer.md) F-5);
  - placements failed silently 6 times for 1–10 gold, because the card shows the base price and the forward price applies.
- **Comeback income** paid the side that was ahead in army 219–277 gold.
- **Open asks:** F1, F6, F14, F15 and F16 are all unanswered, and step C is parked.

---

## Summary, ranked by expected impact on fun

| # | Proposal | Effort | Timing | Knob |
|---|---|---|---|---|
| B1 | Lane pairs: printed two-building combos | M | after P4 | `wavepairs` |
| B2 | Keystones: a few big, wave-native rule-benders on a schedule | L | after P4 (K0 slice can start early) | `keystones` |
| B3 | Mutations: level 3 becomes a choice of two transformations | L | after P4 | `mutations` |
| B4 | Commander identities that survive waves | M | after P4 | `cmdkits` |
| B5 | Loot from the general you beat, shown on the node | M | after P4 (stage 1 any time) | `loot` |
| B6 | Themed wilds: a smaller, curated pool per run | S | now | `wilds` |
| B7 | Draft and card hygiene | S | now | `drafthygiene` + UI |
| B8 | Measure build expression: card-impact check and a committed draft bot | M | now | tooling |
| B9 | The Sporemat: a small building that spreads your ground (F14, F15) | M | only if P3 shows it | `sporemat` |
| B10 | Seasons: one global rule per run, for both sides | S | later bet | `seasons` |

**Order of work** (this differs from the impact rank):
1. **Now, during P3:** B7 (its UI items first), then B8, then B6. None of them changes a battle rule.
2. **At P4:** B4, together with whatever battle-1 fix P4 adopts, and B1 if waves and two-type shields are adopted.
3. **Then a content pass against the adopted combat model:** B2's K0 slice, then B3, then B5 (stage 1, then stage 2), then the rest of B2.
4. **Conditional:** B9.
5. **Later:** B10.

**Learning load (F8):**
- B6 and B7 reduce it.
- B1 is taught by the starter kits, since each holds exactly one pair.
- B2 replaces the elite relic pick and half of the drafts' relics, rather than adding a screen on top.
- B3 replaces a number with one sentence.
- Never introduce more than one new rule family in a single playtest.

---

## B1. Lane pairs: printed two-building combos that make *which* second building matter

**Problem.** Under `rework`, the cheapest spawner massed is the build that wins:
- Strategist sandbox, seed 4242: mono Sporeling won at 8:37, mono Drift Stalk at 9:04, and the counter matrix's mix lost at 6:54. The winners' top building dealt 70–98% of their damage.
- G3 fails Sporeling 83/86, Drift Stalk 72/90 and Veilstalker 69/80.
- Mixing earns only the 20% shield for any two types ("diversity by tax", [rework-state.md](../rework-state.md) §5.2 risk 8).
- Placement is noise: best − median at 3:00 is 5% of worth. Only Twin Roots' lane choice ever showed signal (ρ 0.68).

**Change.** Add 7 printed **lane pairs**:
- A pair is active in a lane while both of its buildings stand in that lane, and it changes what the named units or tower do there.
- Effects are transformations, not percentages.
- Every starter kit holds exactly one pair.

| Pair | Buildings | Effect in that lane |
|---|---|---|
| **Phalanx** | Sporeling Burrow + Capguard Hall (Vesper's starter) | Sporelings march 1 tile behind the Capguard front (the `rangedGap` rule extended to them). Capguards get +15% of max HP shield on top of the mixed shield (35% in all) |
| **Screen** | Gill Nest + Sporeling Burrow or Capguard Hall (Cordis's starter) | Archers behind their melee front are pinned at ×0.6 instead of ×0.35 |
| **Anvil** | Capguard Hall + Puffball Mortar (Armilla's starter) | The Mortar's minimum range falls from 1.5 to 0.5 while a Capguard stands within 2 tiles of it. Enemies hugging inside 1.5 killed the strategist's Mortar (`b1_t522`) |
| **Hunting Pack** | Sporeling Burrow + Veilstalker Hollow (the matrix's swarm answer) | Veilstalkers prefer enemy units that are knitting, and see them from 2 tiles farther, so the pack breaks up the enemy's merges |
| **Fuse** | Burster Pod + any melee spawner | Bursters wait behind their wave's melee front until it makes contact, then roll |
| **Updraft** | Drift Stalk + Capguard Hall or Amanita Lodge | Driftlings in that lane hold ground. Mono flyers still hold none |
| **Tended** | Tender's Ring + any spawner | Healing that would overflow a unit's HP restores its mixed-wave shield, up to the shield's starting size |

**UI:**
- Each card prints "Pairs with …".
- A partner's tray card glows while you hover a lane that already holds the other building.
- The beat tooltip lists the next wave's active pairs.
- Each pair's first activation gets one callout, and it isn't repeated in that run.

**AI:** the general and the bots get a placement term: +N score for completing a pair in a lane.

**What the player would feel.**
- The second building becomes a choice with a reason printed on the card: "I want Hunting Pack against Mold's swarm".
- The starter kit teaches the idea for free.
- On two-lane maps, the lane you build in decides which pairs you get.
- Mixed armies can do things a mono army can't, instead of paying a tax.

**Implementation.**
- **Kind of change:** a sim rule, behind the default-off knob `wavepairs`, which sets `wavePairs: [{ a, b, effect }]` in balance via `src/data/proto.ts`. The schema goes in `src/data/schema.ts`.
- **State:** a per-side, per-lane pair bitmask. It's recomputed on each beat in `waveSystem` (`src/sim/systems/spawning.ts`, next to `shieldMixedWaves`) and whenever a building is placed or destroyed.
- **Systems that read it:**
  - `combat.ts`: pinned rate, shield top-up, Tender overflow;
  - `targeting.ts`: Hunting Pack's preference and the Burster's wait;
  - `movement.ts`: the Phalanx gap;
  - `territory.ts`: Updraft's presence;
  - the tower code: the Mortar's minimum range.
- **UI:** `src/ui/buildingInfo.ts`, the beat tooltip in `src/ui/hud/top.ts`, and `src/ui/callouts.ts`.
- **AI:** a `pairBonus` term in the placement score (`src/sim/ai/`).
- **Goldens:** unchanged while the knob is off. Adoption refreshes them and needs a SPEC note on §17 #11. Lane pairs aren't plot adjacency, but the user should say so.

**Test.**
- **The bars:** `npm run experiment -- --proto rework,wavepairs --checks g3,counters,g4 --g3seeds 50 --g4seeds 200 --workers 8`.
  - The G3 means for mono Sporeling, Drift Stalk and Veilstalker fall by at least 10 points. `bot:balanced` builds Phalanx, Screen and Hunting Pack on its own.
  - The strict counter bar still passes.
  - G4 stays in band.
  - No two-building pair bot goes above 55/60. Add 7 `bot.pair-*` profiles through the existing `--proto bot.<id>:{…}` override.
- **Placement:** `--checks spread --maps twin-roots,bogwater-hollow`. Twin Roots' split-half ρ stays at 0.6 or more, and best − median rises above 25% of worth.
- **Playtest question:** "Why did you build your second spawner, and where did you put it? Could you tell which pairs were on?"

**Depends on.** P4 keeping waves and two-type shields (CR-5), or rounds, where pairs would apply to a round's army. The case is strongest if P3's Q1 says the swarm decided the battles.

**Ledger.**
- **Builds on parked items:** OMR-13, CS-1, CS-2 and CS-3 (rules about which neighbour, transformations not percentages, printed on the card), and DR-8 (hover stars).
- **What's different:** the neighbourhood is the lane, not plot adjacency. So it needs neither step C's network nor the counting of neighbours in a packed home zone that the OMR rethink rejected. It isn't DR-7's rejected flat +10% per neighbour.
- **Extends CR-5** (the mixed-wave shield, in P3) from "any two" to "which two".
- **Hunting Pack isn't DR-4's diver** (measured and failed): that preferred ranged targets for every Veilstalker. This prefers knitting units, and only inside a pair.
- **Phalanx's extra shield is generic,** not Pierce-only, so it isn't DR-3's rejected Cap Shield. Measure the archers anyway.

**Sources.**
- Hades duo boons and TFT traits ([research-autobattler](../research-autobattler-roguelites.md) §2, §3.4).
- 9 Kings neighbour cards ([combat-rework](../../combat-rework.md#what-9-kings-does) "What 9 Kings does").
- Backpack Battles stars ([DR](../../one-more-run-design-review.md)).
- Balatro and Vampire Survivors signposting ([research-one-more-run](../research-one-more-run-and-feel.md) #19).
- Mechabellum tech as a counter to a counter ([research-autobattler](../research-autobattler-roguelites.md), Mechabellum).

**Risks.**
- **Combat rules:** every pair is a G3 and counter-matrix variant, and a pair could become the new two-building mono. That's why the test includes pair bots.
- **Learning load (F8):** one line per card. It's staged: a starter kit shows one pair, more appear only when both buildings are in your kit, and each pair has a single first-time callout.
- **The general must use pairs,** or the player gets a free edge. That edge would also soften battle 1, which may be welcome (K1).
- **The callout lane is already crowded** (F-8).
- **Updraft touches the flyer territory rule.**

---

## B2. Keystones: a few big, wave-native rule-benders on a schedule

**Problem.**
- **Picking barely matters:** random drafting wins 41 of 240 runs against greedy's 44.
- **Rule-changing relics are rare:** one is in 6% of offers and owned at the end of 17% of runs.
- **Rare cards aren't bigger:** "today's rare cards aren't much stronger than common ones" ([backlog](../../../balance-backlog.md#step-b-battle-feel-prototypes-2026-10-30), Step B).
- **In play:** 8 offers and 3 rerolls held one plan-changing card (Elder's Patience), and skipping was "often the honest best choice".
- **Rewards:** elites cost about 10 points of run-ending risk for one relic (F11), and spoils deal the same cards as drafts (F9).
- **Unused hooks:** `side.waveBeat` and `side.waveSize` exist, and nothing uses them (CR-4).
- **No time to build:** about half of runs end in battle 1, before any build forms.

**Change.** A new card class, the **Keystone**: one rule that bends a system.

**When it's offered.** Three times a run, on a schedule the route shows. Each offer is 1 of 3, and a reroll costs 10 Spores (Spores have no use today).
- **K0, at run start:** in the Underroot, after you pick a commander. Even a run lost in battle 1 had an identity.
- **K1, after the row-3 node.**
- **K2, after the row-5 node.** K2 may hold one card from a labelled **Broken** set.

**What each offer holds** (as 9 Kings guarantees a decree for your king):
- one keystone for your commander, always;
- one keyed to your most-built spawner;
- one generic.

**What it replaces:**
- **Elites:** an elite win gives an extra keystone pick (1 of 3) instead of the relic-only pick.
- **Drafts:** the relic share of in-battle drafts drops from 20% to 10%.
- **The result:** drafts deal blueprints and upgrades, spoils deal blueprints and relics, and keystones deal rules. That answers F9.

**The first 14 keystones.**

| Keystone | For | Effect | New sim code? |
|---|---|---|---|
| Double Time | any | Your beat is 15 s; waves ×0.8 | No: `side.waveBeat`, `side.waveSize` |
| Great Muster | any | Your beat is 30 s; waves ×1.6 | No |
| Three-Strain Wave | any | A lane wave of 3+ types gets a 40% shield instead of 20% | Side stats `side.mixedShieldFrac`, `side.mixedMinTypes` |
| Vanguard | any | Your first wave leaves at 0:10, doubled | `side.firstBeatSeconds` |
| Patient Roots | any | Hold has no cooldown; a held lane's next wave is +25% | Hold settings as side stats |
| Heirloom | any | Pick a blueprint: it starts every battle planted on a home plot (the user's own idea, CS-9) | Run-layer deploy |
| Brood Beat | Sporeling builds | Every 3rd beat, each Sporeling Burrow releases its units already Bloomed | Action `releaseMerged` |
| **Mono Bloom** (Broken) | any | A one-type wave gets the mixed shield; mixed waves lose it (CR-6's "relic that rewards a mono wave") | `side.monoShield` |
| Burst Seeds | Vesper | Spore Burst leaves a 4 s, 1.5-tile cloud at 10/s | Power parameter `cloud` |
| Home Brood | Vesper | Home spawners release +1 unit every other beat | `building.spawnCount` made positional |
| Rootholds | Armilla | No supply-line surcharge on columns you've held for a full beat | Small placement rule |
| Deep Tithe | Armilla | Rhizome Tithe also pays 20 for each enemy building standing in columns you hold | Tithe parameter |
| Chain Bloom | Cordis | Puppet Bloom repeats once on the Bloomed it made, making Elders | Power parameter `chain` |
| Knit on the March | Cordis | Your wave units knit while marching, before contact | Merge rule as a side stat |

**The general gets no keystones.** They're player-only rewards, and its doctrine is its equivalent. SPEC §7.1's honest AI is about rules, gold and information.

**What the player would feel.**
- Every run starts with a rule you chose, with two more big moments you can see coming on the route.
- "My Great Muster run" or "my Chain Bloom Cordis" plays at a different rhythm; it isn't a +15% card.
- A battle-1 loss still had a shape.

**Implementation.**
- **Content:** a new `data/keystones.json` (an EffectBundle, text, `tier`, optional `commander` and `broken`), or `data/relics.json` with a `keystone` rarity. The schema goes in `src/data/schema.ts`.
- **Run layer:**
  - `src/run/flow.ts`: a `keystone` screen at run start and after rows 3 and 5, set by `balance.keystones: { at: ['start', 3, 5], cards: 3, rerollSpores: 10 }`;
  - `src/run/rewards.ts`: the elite reward;
  - `src/run/runState.ts`: owned keystones (prototype saves already use their own keys);
  - UI in `src/ui/screens/underroot.ts` and `run.ts`.
- **Sim:**
  - new side stats: `side.mixedShieldFrac`, `side.mixedMinTypes`, `side.monoShield`, `side.firstBeatSeconds`, `side.holdCooldown`;
  - a `release` trigger (the `release` event already fires in `waveSystem`);
  - actions `releaseMerged` and `cloud`;
  - power parameters `cloud` and `chain`;
  - `building.spawnCount` added to the positional stats.
- **The knob:** `keystones`. `applyProto` needs a `keystone` or `relic` entry kind; today it reaches buildings, units, bots, generals and factions only.
- **Goldens:** none change while the knob is off. Adoption refreshes `m3-run-s7`.
- **The bot** needs a keystone score (see B8).

**Test.**
- **Command:** `npm run experiment -- --proto rework,keystones --checks runs --commander all --power-policy auto --runs 200`, plus B8's card check on each keystone.
- **Pass:**
  - each keystone moves battle-1 and run win rates by +3 to +15 points: worth having, but never forced;
  - committed and random keystone picks differ by at least 8 points of runs won;
  - the commander spread stays within 15 points;
  - no Broken keystone is above +20.
- **Stage 1:** K0 only, with the six keystones that need little or no new sim code: Double Time, Great Muster, Heirloom, Burst Seeds, Rootholds and Deep Tithe.
- **Playtest questions:** "Which keystone did you take at the start, and did your first battle look different because of it? Did you plan toward the next one?"

**Depends on.**
- P4's combat model. Keystones act on waves; under rounds they'd act on rounds.
- B8, to measure card size.
- A boss and late-run retune (ER-3c), because run wins will rise.

**Ledger.**
- **Picks up:** ER-5b and DR-17 (never addressed), ER-5c and ER-5d, CR-4 (hooks built but unused), CR-6 (special waves, never addressed), CR-7 (9 Kings kits, partly planned for M6), CS-9 (the heirloom, parked for M6), F9 and F11 (never addressed).
- **Not `bigdrafts`** (built, off). That measured that rarer cards don't help, because rare cards aren't bigger. This adds a bigger class of card instead.
- **Not DR-23's rejected draft every wave:** keystones add no draft holds.

**Sources.**
- 9 Kings' Royal Councils (years 4, 14, 21 and 29; a king-specific decree guaranteed; a named "broken" category).
- TFT augments (2-1, 3-2, 4-2).
- Against the Storm's cornerstones.
- Hearthstone trinkets keyed to your type.
- Slay the Spire's boss relics and Neow ([research-autobattler](../research-autobattler-roguelites.md) §2, A2, A3, A15).

**Risks.**
- **A new screen (F8).** It's offset by removing the elite relic pick and halving relics in drafts. Each keystone's text stays to one line, and the route shows when the next one comes.
- **Run wins inflate,** so the boss has to get harder in the same pass.
- **Bots can't value rules** until B8's committed draft policy exists.
- **A keystone that's always right becomes a forced build** (TFT's "too solved"). Broken keystones are capped to K2.

---

## B3. Mutations: level 3 of each track becomes a choice of two transformations

**Problem.**
- **Upgrades are numbers:** all 42 levels are numeric, and the level-3 "signature boost" is a number every time (+1 unit per spawn at best).
- **In play:** "Mortar blast reaches +0.3 tiles farther" (`SS/115`), "+15% HP" filler, and upgrades for buildings never built. "Drafts rarely change how I play" (F-6).
- **The rework's three buildings have no tracks,** so drafting a Drift Stalk or a Burster Pod has no growth path.
- **SPEC §11.5's strains** (Teeming, Volley and the rest) are real sidegrades that exist only on paper, as M6 choices made before a run.

**Change.**
- Levels 1 and 2 stay small numbers.
- Every level-3 card becomes "Mutate: choose 1 of 2", with both shown on one card. A building gets one mutation for the run.
- **First slice:** 7 buildings and 14 mutations, taken from §11.5 where they exist:

| Building | Mutation A | Mutation B |
|---|---|---|
| Sporeling Burrow | **Teeming:** 3 per release, 18 s, HP ×0.8 | **Bursting:** Sporelings burst on death (15 crush, radius 0.8); HP ×0.85 |
| Capguard Hall | **Ironcap:** heavy armour, speed ×0.85, HP ×1.1 | **Bulwark:** a lane wave holding a Capguard gives every unit in it +10% of max HP as a shield, mixed or not |
| Gill Nest | **Longgill:** range +1.5, interval ×1.25 | **Volley:** 2 per release, 20 s, damage ×0.8 |
| Truffle Cellar | **Deep Truffle:** +50% gold when wholly in home columns; no loam bonus | **Wild Truffle:** loam bonus doubled; −25% gold off loam |
| Drift Stalk (new track: L1 HP +15%, L2 damage +15%) | **Thistledown:** Driftlings drop a 1-tile cloud on death (8/s, 3 s) | **Gale:** Driftlings hold ground; speed ×0.85 |
| Burster Pod (new: L1 HP +20%, L2 interval −10%) | **Fusecap:** Bursters wait for contact (as B1's Fuse) | **Sporebloom:** cloud radius 2.0 for 6 s; burst 40 → 30 |
| Rhizomorph Tunnel (new; only if P4 keeps it) | **Sapper:** surfaces under the nearest enemy building, siege ×2 | **Brood Tunnel:** Rhizomorphs that leave on one beat surface together |

- **The general's level 3s** pick a mutation from its doctrine (deterministic, `ai` stream), so you see mutations in action before you own them.
- **M6 strains** then become a loadout of which two mutations can appear, not a separate system.

**What the player would feel.**
- Reaching level 3 is a moment that changes what the building does: your Burrow now bursts, your archers volley.
- Two runs with the same buildings play differently.
- Bursting plus the Spore Cloud relic is the §11.7 "chain detonations" engine, and you can actually hit it.

**Implementation.**
- **Kind of change:** data plus sim.
- **Data:** level 3 in `data/upgrades.json` gains `choices: [{ id, name, text, effects }, …]`, with the schema in `src/data/schema.ts`.
- **Picking:** `draftPick` takes a `choice` (`src/sim/commands.ts`, `applyCard` in `src/sim/draft.ts`). `Loadout` gains `mutations`, which changes the run save's shape; prototype saves are already kept apart.
- **Effects:** most mutations are modifier bundles and `unitDeath` triggers the DSL already has. New: an armour override stat, a per-unit `holdsGround`, cloud parameters as stats, and the Rhizomorph's surfacing rules.
- **The general:** `generalKit` in `src/run/flow.ts` picks mutations for it.
- **UI:** the draft card, a tint or glyph on mutated units, and an inspect row.
- **The knob:** `mutations` patches the upgrade tracks. `applyProto` needs an `upgrade.<building>` entry kind, because `data/upgrades.json` is keyed by `building`, not `id`.
- **Goldens:** unchanged while the knob is off.

**Test.**
- **The bars:** `npm run experiment -- --proto rework,mutations --checks g3,counters --g3seeds 50 --workers 8`, with each mutation as a mono-bot variant (mono bots at level 3 with mutation A or B, through a bot override with upgrades).
  - No mutated mono bot goes above 55/60.
  - The strict bar holds.
- **Runs:** `--checks runs --commander all --power-policy auto --runs 200`, with B8's card check.
  - Each mutation moves win rates by at least 3 points in battles where its building is built.
  - A and B differ by matchup, so neither option is strictly better.
- **Playtest questions:** "Did a level-3 choice change what you built next, or how you used it? Could you see what mutated units do?"

**Depends on.** P4, which decides the units that survive (the Rhizomorph, CR-15; flyers), and B8.

**Ledger.**
- **Picks up:** ER-5c (planned for M6 as meta strains, not drafts), ER-5d (never addressed), CR-9 (never addressed), DR-16 (broken engines, parked).
- **Differs from CS-10's cut list** (tracks replaced by drafting a building again to level it, never addressed). B3 keeps the tracks and changes what level 3 is, because the board resets every battle, so levels on placed buildings wouldn't persist.
- **Nothing measured-and-failed is re-proposed.**

**Sources.** TFT Anomalies and Power Ups, Mechabellum unit tech, Wildfrost charms, Despot's Game weapons, Vampire Survivors evolutions ([research-autobattler](../research-autobattler-roguelites.md) A1, A4); SPEC §11.5's strains.

**Risks.**
- **14 new unit variants** for G3 and the counter matrix. The tools can sweep them, at about 10–15 minutes a matrix.
- **Readability:** mutated units need a mark on sprites about 8 px tall.
- **Learning load (F8):** one line per building, only at level 3. Most runs reach level 3 on 1–3 tracks, and the first slice covers only 7 buildings.
- **Bursting plus Spore Cloud might be forced** rather than rare. Measure it.

---

## B4. Commander identities that survive waves

**Problem.**
- **The gap:** under `rework`, runs won are Vesper 36%, Armilla 11% and Cordis 14%, over 600 runs. The M5 bar was a 15-point spread. Battle 1 is lost 38%, 61% and 56% of the time.
- **It widens with step B:** with `hotstart,bigdrafts` the gap is 56% against 29–30%.
- **Armilla:**
  - her starter (Capguard, Cellar, Mortar) has one unit type, so her opening waves never get shields;
  - the Mortar is worth 1.5 supply in 90 s;
  - Rhizome Tithe pays per column held, while the first flip comes at 2:02.
- **Cordis:** her merging is what waves do anyway (66–127 merges a battle), and Puppet Bloom doesn't chain to Elders (`r2b1_puppet3`).
- **Everyone:** passives are invisible percentages, and kits converge.
- **The cost:** "a commander that's clearly worse is a run the player won't pick twice" ([rework-state.md](../rework-state.md) §5.2).

**Change.** Give each commander one signature rule that bends a wave system, and keep kits distinct. Vesper stays the baseline.

**Armilla, Bastion** (replaces capture +25%):
- A standing tower in a lane counts as a unit type for that lane's mixed-wave shield, so Capguard plus Mortar shields from the first beat.
- Rhizome Tithe also pays 15 for each of her buildings standing past her home columns. Her forward building gets a payoff, which is F1 for one commander.

**Cordis, Puppeteer** (replaces knit −50% and merge radius 2):
- Her buildings' merge toggles start Off.
- Puppet Bloom's cooldown drops from 80 to 35 s, its radius rises from 3 to 3.5, and it chains once: Bloomed trios it makes merge into Elders.
- Merging becomes her decision (pillar 2), and her power has a target every beat.

**Vesper:** unchanged, but her passive shows as a visible "+10%" on her home spawners' badges.

**Kits:**
- `draft.coreWeight` rises from 2 to 3.
- The first spoils of a run deals only core blueprints.

**Stage 2** (M6's exclusive buildings, pulled forward and redesigned for waves):
- **Rootgate** (Armilla): capture in its lane takes 0.5 s, so her marching waves claim ground (F6).
- **Puppet Pod** (Cordis): 3 Sporelings every 24 s, released pre-Bloomed every other beat.
- **Velvet Shrine** (Vesper): spawners within 2 tiles release shielded, even in a one-type wave.

**What the player would feel.**
- Armilla plays a fortress that shields from the first second and gets paid for planting forward.
- Cordis decides when her army knits, and her button matters every 35 s.
- Picking a commander changes what you do, and the two weaker ones are worth a second run.

**Implementation.**
- **Mostly data:** `data/commanders.json` (passive effects, the power's `cooldown`, `radius` and a new `chain`), which the M5 kickoff rules allow with a changelog entry.
- **Two small sim rules:**
  - towers counting as a type in `shieldMixedWaves` (`src/sim/systems/spawning.ts`, side stat `side.towersCountAsType`);
  - `chain` in the bloom power (`src/sim/powers.ts`), plus the per-building term in the tithe.
- **Merge toggles:** a default per commander, in `src/sim/create.ts`.
- **The bot:** the `auto` power policy has to use Cordis's faster Bloom.
- **Draft settings:** `balance.draft.coreWeight`, and a spoils `coreOnly` flag in `src/run/rewards.ts`.
- **The knob:** `cmdkits`. `applyProto` needs a `commander.<id>` entry kind.
- **Goldens:** `m5-*-power-s3` stay unchanged while the knob is off.

**Test.**
- **Command:** `npm run experiment -- --proto rework,cmdkits --checks runs,engagement --commander all --power-policy auto --runs 200 --seeds 30`. Repeat it with `hotstart,bigdrafts`, which widened the gap.
- **Pass:**
  - the commander spread in runs won stays within 15 points;
  - Armilla's and Cordis's battle-1 losses are at most 45%;
  - Cordis's merges per battle fall and her power uses rise;
  - Vesper doesn't change.
- **Playtest questions:** "Did your second commander feel like a different game? As Cordis, did you choose when to merge? As Armilla, did you build forward?"

**Depends on.** P4's waves decision and its battle-1 fix (K1: `hotstart`, or Mold out of battle 1), and the `auto` power policy.

**Ledger.**
- **Picks up:** CR-7 and DR-29 (planned for M6), DR-37 (a placement rule per commander, never addressed; Bastion and the Tithe term are the nearest), and [rework-state.md](../rework-state.md) K1's suggestions (a second unit type for Armilla; revisit Tithe and Puppet Bloom).
- **Each change is a rule that gives the commander a verb under waves,** not a retune of numbers for its own sake.

**Sources.** 9 Kings' kings, Mechabellum's specialists, Brotato's characters, Monster Train's clans ([research-autobattler](../research-autobattler-roguelites.md) A16); the strategist's suggestion to retune Cordis for waves ([playthrough-strategist](../playthrough-strategist.md) §6 #8).

**Risks.**
- **The bot's power policy** may undervalue Cordis's new verb, so the measured gap could mislead in either direction.
- **With auto-merge off,** Cordis is weaker if the player forgets to Bloom. The merge toggle stays.
- **Learning load:** it rewrites two commanders' text, with one rule each. Stage 2 adds three buildings, so it goes with M6 mastery or one building at a time.

---

## B5. Loot from the general you beat, shown on the route node

**Problem.**
- **The route is about risk, not build:**
  - rows are all-to-all (F10);
  - always fighting the row-2 battle and never taking an elite wins 33 runs, against 44 for a random route;
  - elites are lost 44% of the time against 34% for a plain battle ([run-loop](../run-loop.md) §2, §7.6).
- **Generals all read the same:** they mirror the player's roster (ER-6c), and every read is "SWARM, SWARM, SWARM" ([playthrough-newcomer](../playthrough-newcomer.md) §5, F-9). Mold "countered your Swarm with Sporeling Burrow ×3" (`r2b1_end`).
- **Elite rewards** are one relic plus currencies that buy nothing (F11).
- **The user named 9 Kings as the model,** and looting the defeated king's cards (CR-8) was never addressed.

**Change.**
- **Doctrines:** each general gets a 3-card **doctrine**, shown on its route node as "Win to take one of: …".
- **Spoils:**
  - a Rout win adds one doctrine pick (1 of 3) to the normal spoils;
  - an elite win gives 2 doctrine picks instead of the relic-only pick.
- **The general uses its own doctrine:** from battle 2 on it fields one of its doctrine cards, so you see a card working before you can take it.
- **No doctrine** for battle 1's scripted general or the boss.

| General | Stage 1 (existing cards, measurable now) | Stage 2 (authored, from B2 and B3) |
|---|---|---|
| Old Mother Mold | Knitting Circle, Spore Tithe, Bloom Vigor | Brood Beat; Burrow·Teeming; Mother's Milk (a merge restores 25% HP) |
| The Lichen Baron | Thick Caps, Rot Ward, Elder's Patience | Capguard·Bulwark; Patient Roots; Lichen Plating (buildings regrow 1% HP a second out of combat, which also answers F12's repair ask) |
| The Blightwright | Martyr's Bloom, Spore Cloud, Second Flush | Rootbreaker·Battering; Tunnel·Sapper; Martyr's Spores (a destroyed building releases its stored units plus 2, shielded) |

**What the player would feel.**
- Choosing a node means choosing what your build gets next: "fight the Baron for Bulwark".
- Each general has a recognizable signature.
- You learn a card by being hit with it before you own it.
- Elites become the place to go when you want two.

**Implementation.**
- **Kind of change:** data plus the run layer, with no sim rule.
- **Data:** `data/generals.json` gains `doctrine: string[]`. General entries can already be patched by a knob, for example `general.mother-mold.doctrine:[…]`.
- **Rewards:** `src/run/rewards.ts` adds a `{ label: 'Loot', pool: 'doctrine', cards: 3, picks: 1 }` spoils (2 picks for elites, replacing the relic-only pick).
- **Run flow:** `src/run/flow.ts` deals it with `generateOffer` on a fixed pool, and `generalKit` adds one doctrine card to the general's loadout from battle 2.
- **UI:** route nodes in `src/ui/screens/run.ts` (lines 108–131) show the doctrine as three icons with tooltips.
- **The knob:** `loot`, a balance flag plus general patches.
- **Goldens:** the run golden `m3-run-s7` changes only on adoption.

**Test.**
- **Command:** `npm run experiment -- --proto rework,loot --checks runs --commander all --power-policy auto --runs 200`.
- **Route choice:** add a route policy that chases a doctrine (a small addition to the runs tool) and compare it with a random route. Target: at least 5 points of runs won between the best and worst policies. Today route choice is pure risk.
- **Difficulty:** battle-2 and battle-3 losses mustn't rise more than 5 points from the general fielding its doctrine. If they do, the general fields it only as an elite.
- **Playtest questions:** "Did you pick a node for its loot? Did you recognise a card you'd seen the general use?"

**Depends on.** Stage 1, nothing. Stage 2, B2's and B3's content and P4.

**Ledger.**
- **Picks up:** CR-8, F10 and F11 (never addressed), F12 (repair, through Lichen Plating).
- **ER-6c** (an asymmetric Gray Rot, never addressed): doctrines give each general a signature before M7.
- **[Research](../research-autobattler-roguelites.md) A7** adds showing the loot on the node, which this keeps. Its "a loss still pays" half belongs to the run-arc work.

**Sources.** 9 Kings (a card from the defeated king; the Rainbow King), The Bazaar (monsters drop known items, and players pick fights for loot), Monster Train ("the route you choose determines your deck") ([research-autobattler](../research-autobattler-roguelites.md) §2, A7, A11).

**Risks.**
- **Harder middle battles:** the general fielding its doctrine makes battles 2–3 harder, and battle 2 is already lost 43% of the time under the rework. Stage it.
- **Mirror rosters:** while the Gray Rot mirrors the player's roster, stage-1 doctrines are flavour on shared relics.
- **Learning load is low:** the same cards, in a new place.

---

## B6. Themed wilds: a smaller, curated pool per run

**Problem.**
- **The same pool every run:** 17 buildings and 21 relics, and three bans "barely shaped the drafts I saw" ([playthrough-strategist](../playthrough-strategist.md) §3).
- **Engines don't assemble:** the intended engines need 2–4 specific cards, each offered in 6–17% of runs ([run-loop](../run-loop.md) §3.5).
- **The new buildings rarely appear:** the rework's three are offered in 17–25% of runs.
- **Learning load:** a newcomer meets 17 building types (F8).
- **Why it has to be themed:** a smaller random pool wouldn't help engines. It lowers the odds that both parts are present about as much as it raises how often each appears.

**Change.** At run start the run rolls its **wilds**:
- your commander's 6-building core;
- the M1 basics: Burrow, Capguard, Gill Nest, Rootbreaker, Mortar and Cellar;
- **4 of 10 themed packs,** each one shared building plus two relics that pair with it.

| Pack | Building | Relics |
|---|---|---|
| Brood | Morel Warren | Knitting Circle, Spore Tithe |
| Bursting | Burster Pod | Spore Cloud, Martyr's Bloom |
| Air | Drift Stalk | Mycelial Web, Hardy Spores |
| Bastion | Hammercap Forge | Thick Caps, Rot Ward |
| Elders | Amanita Lodge | Elder's Patience, Bloom Vigor |
| Deep Roots | Rhizome Vault | Root Stipend, Deep Cellars |
| Undermine | Rhizomorph Tunnel | Quick Roots, Forward Spores |
| Trade | Spore Exchange | Fruiting Season, Second Flush |
| Hunt | Veilstalker Hollow | Rot-Eater, Fresh Spores |
| Mending | Tender's Ring | Mending Moss, Mycorrhizal Link |

- **Always in:** Sporestorm Sigil.
- **Overlap with your core:** a pack whose building is in your core still adds its relics.
- **The Underroot** shows the four packs next to your core.
- **Bans become 2 pack swaps:** each re-rolls one pack.
- **The general's extra blueprints come from the same wilds,** so a run without a Burster Pod has no enemy Bursters.
- **The pool** shrinks to about 10–13 buildings and 9 relics, from 17 and 21.

**What the player would feel.**
- Runs differ before the first battle: "a Bursting and Air run".
- An engine's parts come together.
- Cards you can't use stop showing up.
- A newcomer has fewer cards to read.

**Implementation.**
- **Kind of change:** the run layer and UI, with no battle rule.
- **Setting:** `balance.wilds: { packs: [...], draw: 4, swaps: 2, always: [...] }`, behind the knob `wilds`.
- **Building the pool:** in `src/run/flow.ts` (`runPool`) and `draftPool` (`src/sim/create.ts` lines 177–188), stored in `RunState`. Packs are drawn on the `route` or `draft` stream.
- **The Underroot** (`src/ui/screens/underroot.ts`) shows the packs and the swaps.
- **The general:** `generalKit` filters its extra blueprints (not its opener) by the wilds.
- **Goldens:** the run golden changes only on adoption.

**Test.**
- **Command:** `npm run experiment -- --proto rework,wilds --checks runs --commander all --power-policy auto --runs 200`, plus the [run-loop](../run-loop.md) exposure script ([`runstats.ts`](../scripts/run-loop/runstats.ts)).
- **Targets:**
  - a rule-changing relic owned at run end rises from 17% to at least 30%;
  - both relics of a pack's engine are owned in at least 25% of runs that reach battle 3 with that pack;
  - no pack draw drops a commander's runs won below half its mean.
- **Playtest questions:** "Did your runs feel different before the first battle? Did you read the packs and plan a build?"

**Depends on.** Nothing: the mechanism doesn't depend on the roster, so packs follow whatever P4 keeps. It pairs with B7's no-repeat rule, since a smaller pool repeats more.

**Ledger.**
- **SPEC §8.4's pool composition** is unchanged since M3.
- **DR-28** (horizontal unlocks, never addressed): the wilds are the in-run version, and a natural base for an M6 unlock ladder.
- **ER-5b** (rule-bending relics as the substance), in part.
- **Not a rarity change:** `bigdrafts` measured that rarity doesn't help.

**Sources.** Hearthstone Battlegrounds' 5 of 10 tribes, shown at hero select; Super Auto Pets packs; Rogue Tower players trimming unlocks against dilution; 9 Kings' small, memorable decks ([research-autobattler](../research-autobattler-roguelites.md) A6, §3 guardrails).

**Risks.**
- **Some packs suit some commanders.** Measure per pack.
- **A smaller pool repeats more** (B7 handles it).
- **Filtering the general's kit changes difficulty by pack.** Without Air there are no enemy Driftlings, for example, so measure battle-1 losses by pack.
- **Learning load goes down.**

---

## B7. Draft and card hygiene

**Problem.**
- **Offers repeat:** Thick Caps appeared 4 times in two runs, and run 2's third draft repeated an earlier offer exactly.
- **Offers include dead cards:**
  - a Gill Nest upgrade came after the Gill Nest had been destroyed (`r2b1_draft3`);
  - upgrades came for buildings never built ([playthrough-newcomer](../playthrough-newcomer.md), battle 3).
  - The cause: upgrade cards follow the kit, not the board (`candidates` in `src/sim/draft.ts`).
- **Card effects are invisible:**
  - Spore Tithe paid about 400 gold that the report never shows (`src/ui/report.ts:251` lists only stipend, economy, interest and comeback);
  - "+0.3 tiles" can't be seen.
- **Prices:** the tray card shows the base price while the forward price applies, and placements failed silently 6 times for 1–10 gold (F-10).
- **Dead relics:** Mending Moss and Rot Ward are dead while run HP is binary ([run-loop](../run-loop.md) §3.5).

**Change.** Six small changes, each its own knob or UI fix:
1. **No repeats within a battle.** A card offered in this battle's earlier drafts or rerolls isn't offered again until the pool runs dry (`draftHygiene.noRepeat`).
2. **Upgrades only for what's on the board.** In-battle upgrade cards come only for kit buildings with one standing or placed this battle (`draftHygiene.boardUpgrades`). Spoils keep the kit rule.
3. **Retire Mending Moss** from the pool while a Rout loss still ends the run (`draft.exclude`). Revisit if a lives rule lands.
4. **The report shows what cards did:** rows for relic and draft gold (`goldEarned.effects` and `drafts`, already tracked in `src/sim/state.ts:641`), and a "Your cards" line per upgraded building ("Sporeling upgrades: +1,240 damage").
5. **Prices at the cursor:** the tray card shows the price at the cursor's column (the ghost already computes it, `src/app/battleView.ts:501`), and a failed placement says "Need 7 more gold".
6. **"Pairs with" lines** on relics and blueprints that form an engine. Spore Tithe: "pairs with Knitting Circle, merging armies". Spore Cloud: "pairs with swarms".

**What the player would feel.**
- Every offer is a fresh choice about what's on the board.
- The report shows what your picks did.
- A placement never fails without saying why.

**Implementation.**
- **Items 1–2 are sim draft rules** in `src/sim/draft.ts`: a per-side `offered` set passed as `taken`, and a board filter in `candidates`. The schema gets an optional `draftHygiene`, behind the knob `drafthygiene`. They stay deterministic: each card still draws three numbers.
- **Item 3 is data:** `draft.exclude` in balance.
- **Items 4–6 are UI only:** `src/ui/report.ts`, the tray, and text in `data/relics.json`.
- **Goldens:** single-battle goldens have drafts off. The run golden changes only if items 1–3 are adopted.

**Test.**
- **Command:** `npm run experiment -- --proto rework,drafthygiene --checks runs --commander all --power-policy auto --runs 200`.
- **Targets:** zero repeated cards and zero upgrade cards for buildings not on the board, per battle. Runs won shouldn't move by more than noise.
- **The UI items** need no measurement.
- **Playtest questions:** "Did you see a card twice in one battle? Did you know what your relics paid? Did a placement ever fail without a reason?"

**Depends on.** Nothing.

**Ledger.**
- **New:** the strategist's "dedupe offers" ([playthrough-strategist](../playthrough-strategist.md) §6 #7), [playthrough-newcomer](../playthrough-newcomer.md) F-6 and F-10, and [research-one-more-run](../research-one-more-run-and-feel.md) #18 ("show what the cards did").
- **F9** only indirectly.
- **F1** (forward price, never addressed as a rule): this only shows the price.
- **Nothing here was tried before.**

**Sources.** Balatro and Peglin show the build's effect as a number ([research-one-more-run](../research-one-more-run-and-feel.md) #18); Hearthstone's trinket offer rules (no repeats, keyed to your main type) ([research-autobattler](../research-autobattler-roguelites.md) §2).

**Risks.**
- **Low overall.**
- **No-repeat with a small pool (B6)** can empty an offer late. Fall back to repeats.
- **Retiring Mending Moss is temporary,** and must be revisited.

---

## B8. Measure build expression: a card-impact check and a committed draft bot

**Problem.**
- **The only number we have** for build expression is that random drafting wins as many runs as greedy (41 against 44 of 240).
- **That number is confounded:**
  - greedy maps cards onto the bot's fixed building weights;
  - it scores every relic by rarity alone (`RELIC_SCORE` 7/9/12 in `src/sim/ai/draftPolicy.ts`);
  - it never commits to an engine, and bots never ban.
- **No tool says how big a card is.**
- **The user's process needs a headless number** before a playtest, for every proposal here (B1–B6, B10).

**Change.** Two tools, with no rule change.
- **(a) `--checks cards`.** For each card in the pool (blueprints, upgrade levels and relics, later keystones and mutations):
  - play `bot:balanced` with each commander against the battle-1 and battle-2 generals on the run maps, with the card given from the start, as the spread tool's `--relics` does;
  - 30 seeds per cell;
  - report the change in win rate against no card, and how the bot's army mix changes;
  - output a card-size table and histogram.
- **(b) `--auto-draft commit`.** A draft policy that:
  - scores a card by what the side already owns: the same building, a pair from B1, a pack from B6, a keystone tag;
  - raises its build weight by 2 for each blueprint it drafts, so it builds what it drafts.

  Build expression then reads as committed against random.
- **Bars to start from:**
  - at least a third of uncommon and rare cards at +5 points or more;
  - keystones at +8 to +15;
  - nothing above +20;
  - committed beats random by at least 10 points of runs won.

**What the player would feel.** Nothing directly. It lets the user see whether a card change made picks matter before playing it.

**Implementation.**
- **Tooling only:** `tools/lib/cards.ts`, modelled on `tools/lib/spread.ts`, registered in `tools/experiment.ts`.
- **The policy:** `commit` in `src/sim/ai/draftPolicy.ts`, deterministic on the `ai` stream. The bot's weights live in `ss.ai.weights`.
- **No knob, no golden change:** the new policy is opt-in.

**Test.**
- **Baseline on `rework` today:** reproduce greedy 44 and random 41 of 240, and run `--checks cards` for today's card sizes. The hypothesis is that most commons sit within ±3 points.
- **Then each B knob.**
- **No playtest question:** it's a tool.

**Depends on.** Nothing.

**Ledger.**
- **OMR-5 and CS-11** (the placement-spread tool, adopted): this is its card analogue.
- **ER-8a** (the engagement and runs tools, adopted).
- **DR-6** (archetype bots, pick share and entropy, never built): the committed bot is the archetype bot.

**Sources.** Hivemind's puzzle generator ([colony-swarm](../../colony-swarm.md), through the spread tool); Riot's "hard to hit, and worth hitting" for augment tiers ([research-autobattler](../research-autobattler-roguelites.md) §2, TFT).

**Risks.**
- **Compute:** about 80 cards × 3 commanders × 4 generals × 30 seeds is roughly 30,000 battles. Sample commons at 20 seeds or use one commander, and use workers.
- **Timing bias:** a card given at 0:00 is worth more than one drafted at 4:00.
- **Bots still aren't people.**

---

## B9. The Sporemat: a small building that spreads your ground (F14, F15)

**Problem.**
- **Territory misleads:** the side holding more ground at 2–4 minutes wins only 37–44% of battles.
- **The front is still:** under waves the first flip comes at 2:02, and 27% of battles have none by 3:00.
- **Flyers hold no ground:** a winning flyer army sat 7–9 columns behind while it razed the base (`SS/159`).
- **Forward building:** it "never came up" ([playthrough-strategist](../playthrough-strategist.md) §3), and new forward buildings die fast while home space runs out (F-5).
- **Comeback income** paid the side that was ahead in army 219–277 gold.
- **Testers' asks:** smaller buildings (F14), a building that spreads the fungus (F15), and a home-ground benefit (F16). F1 and F6 are also open, and step C is parked.

**Change.** One new uncommon blueprint, core for Armilla. It's a card, not a base rule.
- **Sporemat:** 60 gold, a 1×2 footprint, 300 HP, no units.
- **Where it goes:** on any column you own, or on the first column past your border, where it's the only building allowed. No forward price.
- **What it does:**
  - it holds its column while it stands, as forward buildings already do;
  - every 2 beats (40 s), if no enemy unit stands in the next column toward the enemy, that column becomes yours.
- **Limit:** 2 per lane.
- **Not proposed: F16's home-ground bonus as a base rule.** It would add to the measured edge of falling back (G6 88%, K2).

**What the player would feel.**
- Ground becomes something you can build and defend.
- Armilla gets a landholder build, with Tithe and Rootgate (B4).
- Forward plots open without a fight.
- The enemy's wave has a target, and attacking it moves the front.

**Implementation.**
- **Kind of change:** data plus a sim rule.
- **The building:** in `data/factions/velvet-bloom/buildings.json` with a `spread` field, mirrored for the Gray Rot.
- **Placement:** in `src/sim/placement.ts`, the border-plus-one exception and 1×2 footprints. Check the renderer and the AI's placement for assumptions that every building is 2×2 (D5).
- **Spreading:** in `src/sim/systems/territory.ts`.
- **The general and bots** must value it (`aiWeight`, the placement score).
- **The knob:** `sporemat`, as a building patch (`building.sporemat:{…}`) plus `faction.*.buildings+`, both of which `applyProto` already supports.
- **Goldens:** unchanged while the knob is off.

**Test.**
- **Command:** `npm run experiment -- --proto rework,sporemat --checks g3,g4,g6,engagement,spread --g4seeds 200 --workers 8`.
- **Targets:**
  - the first flip comes earlier (median before 1:30);
  - the territory leader's win rate at 3:00 rises above 50%;
  - G4 Decisions stay at or below 15%;
  - G6 doesn't rise;
  - no mono build passes G3 with it;
  - spread best − median rises above 25% of worth.
- **Playtest questions:** "Did you build forward? Did the ground you held feel like yours?"

**Depends on.** P3 or P4 showing territory as meaningless or forward building as pointless again (F1, F6), or the playtester noticing K2 ("falling back is a big edge").

**Ledger.**
- **Picks up:** F14, F15 and F16 (never addressed), F1 and F6 (never addressed as rules), and ER-4a–c (never addressed).
- **Parked neighbours:** DR-10's Fed/Starved, CS-6's terrain, and step C (parked behind the rework). The Sporemat needs no neighbour rule and no terrain layer.
- **It isn't OMR-11's flank orders.**

**Sources.** Warcraft Rumble's points to take, Line War (land means resources), Thronefall (only surviving buildings pay) ([research-lane-battlers](../research-lane-battlers.md) #17, #19); the playtesters' own F14 and F15.

**Risks.**
- **It changes territory and Decisions.** It could stall, with two players spreading mats, or snowball.
- **The general must buy and target it.**
- **Learning load:** one new building and one rule (F8).

---

## B10. Seasons: one global rule per run, for both sides

**Problem.**
- **Every run plays the same rules:** three maps, three mirror generals and the boss.
- **Variety comes only from the player's picks,** and those are small (see B2 and B3).
- **The boss is a formality:** 88–95% of boss fights are won.

**Change.**
- **The roll:** each run rolls one Season, shown on route row 1 and on every node.
- **Both sides:** it applies to both as a battle modifier.
- **First six,** all using stats that exist:

| Season | Effect |
|---|---|
| Monsoon | Beat 15 s, waves ×0.8 (`side.waveBeat`, `side.waveSize`) |
| Drought | Beat 30 s, waves ×1.5 |
| Bloomtide | Knit time ×0.5, merge radius +0.5 |
| Long Night | The Sporestorm starts 1:00 later (`battle.sporestormStart`) |
| Rich Soil | Loam bonus +50% |
| Thin Year | Stipend −2, starting gold +100 |

- **No repeats within three runs** would need a profile, and none exists yet, so that waits for M6.

**What the player would feel.**
- Each run asks a different question of the same build: "a Drought run, so big waves, so Teeming is great".
- Generals feel different, because the world changed around them.

**Implementation.**
- **Kind of change:** data plus the run layer, with no new sim rule.
- **Data:** `data/seasons.json` (an EffectBundle per season, with a schema).
- **The roll:** on the `route` stream at run setup.
- **Applying it:** `battleConfig` (`src/run/flow.ts`) pushes `{ side: 'both', source: 'season:<id>' }`, exactly as it pushes the `event:next-battle` modifiers.
- **UI:** shown in `src/ui/screens/run.ts`.
- **The knob:** `seasons`.
- **Goldens:** unchanged while the knob is off.

**Test.**
- **Command, per season** (with a forced-season override): `npm run experiment -- --proto rework,seasons,season:<id> --checks g3,g4 --g3seeds 30 --workers 8`.
- **Targets:** no season lets a mono build pass a 60% mean or pushes G4 Decisions above 20%.
- **Runs check:** per season.
- **Playtest question:** "Did the season change what you drafted?"

**Depends on.** B6, which shares the run-setup screen, and P4.

**Ledger.**
- **SP-6** (relics and events that bend rules, never addressed).
- **[Research](../research-autobattler-roguelites.md) A5,** which isn't in the ledger.
- **Not tried before.**

**Sources.** Hearthstone Battlegrounds' anomalies (one rule per lobby, no repeat for 3 games), TFT portals, Against the Storm's seasons and Forest Mysteries, Super Auto Pets' weekly pack ([research-autobattler](../research-autobattler-roguelites.md) A5).

**Risks.**
- **Each season changes which mono build is strongest,** so G3 has to run per season.
- **Fairness:** Hearthstone players call anomalies unfair. Here it's single-player, shown before the run and applied to both sides.
- **Learning load:** one rule per run, shown before the run starts (F8).

---

## Considered and not proposed

- **F16's home-ground bonus as a base rule.** Falling back is already a measured edge (G6 88%, K2), and this would add to it. It survives only as a mutation (Deep Truffle) or a keystone.
- **Drafting a building again to level it where it stands** (CR-10, CS-10). The board resets every battle, so levels on placed buildings wouldn't persist. B3 changes what level 3 is instead.
- **Extra drafts bought with gold** (a sink for late gold). DR-23 rejected more drafts because the problem was card size, not count. Revisit after B2 and B3 make cards bigger.
- **An allied commander** ([research](../research-autobattler-roguelites.md) A17). It dilutes identity and adds load, so it waits for M6 mastery.
- **Omens and battle wagers** ([research](../research-autobattler-roguelites.md) A12). They belong to the run-arc lens, with the lives rule and the boss retune.
- **Plot-adjacency neighbour rules** (step C). They stay parked. Lane pairs (B1) test "which neighbour" first, on the neighbourhood the rework created.
