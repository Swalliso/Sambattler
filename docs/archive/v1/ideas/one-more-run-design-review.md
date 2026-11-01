# Spore & Sprawl: Design Review and Roadmap to "One More Run"

> **Archived: v1 era.** Written before [SPEC v2](../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../README.md)).

An external review from 2026-10-30, written in a claude.ai conversation that couldn't read the repo: it worked from PR descriptions, commit messages and a spec summary (see its Caveats). The user brought it in that day, and it was copied here as written on 2026-10-31. **Nothing in it is adopted.** The [One More Run review](one-more-run-review.md) checked it against the data, the code and earlier experiments, and the [ledger](after-the-rework/ledger.md) (section 1.2) tracks each recommendation as DR-1 to DR-41.

**Bottom line: Spore & Sprawl's main problem isn't archer numbers, it's structure.** Units spawn on timers and walk into the fight one at a time. Buildings have almost nothing to say to each other. A run takes 25–35 minutes and gives few, small power spikes. Keep the real-time lane tug-of-war, the territory rule, merging and the deterministic sim. On top of that, add a visible **Mycelium Network** placement layer: adjacency links, keyword thresholds, soil that changes during play, and supply lines tied to the Heartcap. Shorten battles and draft every wave. Rewrite the guardrails so they measure *build diversity* instead of capping power.

## TL;DR
- **Why it's flat:** placement barely matters because only economy buildings care about soil, and only by +50% gold. Archers dominate because enemy melee arrives one unit at a time. Your own experiments show the defender "never has more than 0–7 supply on the field", and mono Gill Nest wins 100% at shipped settings. Pacing is slow: 41% of runs end in battle 1, and the losing Heartcap goes from first hit to dead in 13–20 s.
- **Recommended direction (Direction A+):** keep continuous lane battles but cut them to about 4–5 min and draft after every wave. Add a fungal placement system: hyphal links, colony thresholds, Fed/Starved supply lines, compost that turns into loam, and fairy rings. Build 8 archetypes around it, including three deliberately "broken" engines. Recast the adaptive general and bosses as visible tests of your build rather than hidden nerfs.
- **Do first:** a combined archer fix (pack spawning for melee, a range cap, a diver and shield counter) tested with your existing `?proto=` harness. Then a hot-start and pacing pass, then a 1–2 week paper-and-proto test of the network rules before any content push. Replace guardrail G3 with diversity metrics: archetype pick share, win-rate spread, build entropy.

## 1. Executive summary: the five decisions that matter

1. **Admit the structural cause of archer dominance and fix it at the rule level.** Number tweaks have been tried and don't work. In PR #8, Gill Nest intervals of 17/19/21 s still gave mono Gill Nest 100% / 100% / 98%. At 24 s it reached 85% but broke G4. At 28 s, mono Sporeling and mono Amanita reached 57%. The only setting that passed G3 (B1 plus a 24 s interval, at 55%) broke G1 and G7 and stalled about a third of battles into Decisions.\[1\] Hold/Advance (E1) fixed the quiet opening, but "Mono Gill Nest stays at 93–100% under every policy variant."\[2\] Spawning, arrival and range-stacking rules have to change.
2. **Make placement the main skill expression, and reverse SPEC §17 item 11.** "Core placement-synergy rules such as adjacency bonuses" were explicitly out of scope. That was a reasonable call for v1, but it is now the biggest reason the game feels samey. Make adjacency and networks core, and make them visible.
3. **Change the balance philosophy from "no build survives on autopilot" to "every build gets tested, and some builds break the game."** Keep "rare broken runs welcome, forced ones not", but enforce it with diversity metrics rather than win-rate ceilings on single buildings.
4. **Shorten the loop and increase decision density.** Draft after every wave, not every second wave. Cut battles to about 4–5 min and runs to about 20–25 min. Get the first meaningful choice inside the first 30 seconds.
5. **Build meta progression for a premium PC game:** horizontal unlocks that teach complexity, commanders as build anchors, a codex, a Decay/Blight ladder, and later a seeded "Prismatic"-style challenge. Leave out daily quests, streaks and idle accrual.

## 2. Current-state review

### What exists (from the repo's PR history; see Caveats)
- **M1–M4 are merged.**
  - M2 added merging, Scythecap Grove and Veilstalker Hollow.\[3\]
  - M3 added the six-row route, drafts after waves 2/4/6/8, upgrade tracks, 21 relics (20 in the pool), Heartcap carryover, elites and a 3600 HP boss.\[4\]
  - M4 added the adaptive general's counter cycle, with warnings at 2:00/5:00 that activate at 4:00/7:00.\[5\]
- **Balance-prototype rounds** (PRs #7, #8 and #9) produced default-off knobs (B1, B3, B4, A2, A3, T1–T3, E1) and an `npm run experiment` harness. It supports `--proto`, `--checks engagement,runs` and `--defender bot:<id>`.\[1\]\[6\]
- **Hold/Advance (E1)** shipped in PR #10. The commit records a "1.5-tile rally, 30 s holds, 10 s cooldown, AI musters at 12 supply and releases below 4".\[7\]
- **A large UI, sound and clarity pass** landed on Oct 29: PRs #12–#20.
- **An M5 PR (#22) is on develop** as of Oct 30. It notes that G1, G3, G7 and G8 "still fail (archer spam)".\[8\]
- **Merge tier multiplier:** the repo uses `tierStatMult` 2.8 (PR #1), not the spec's ×2.5.\[3\]
- **Sporestorm:** it starts at 4:00, not the spec's 5:00, with +20% Heartcap damage per stack (PR #20).\[9\]

### Strengths to keep
- **The deterministic 20 Hz sim with headless duels, goldens and a proto harness.** This is rare for a hobby project and is your best asset. Very few solo developers can answer "does this rule change fix the meta?" in minutes.
- **Territory as build space.** It is a strong, original hook: the push *is* the land grab.
- **Merging.** It is a natural source of visible power spikes.
- **The adaptive general's intel file.** It is good flavor and can become a "nemesis" rather than a nerf machine.
- **Active pause with full build/sell.** This is PC-friendly depth.
- **A mature workflow:** milestone PRs, verification tables and "nothing adopted" changelogs. Claude Code works well with this.

### Problem 1: placement doesn't matter
Here is every factor that currently gives location meaning, and why each one is weak:

| Factor | What it does | Why it doesn't drive decisions |
|---|---|---|
| Rich loam ("fertile soil") | +50% gold for economy buildings with a footprint tile on loam | Affects only Truffle Cellar-type buildings, usually 1–2 per battle. Loam is in fixed spots (e.g. "loam only in each side's far lane" on Twin Roots).\[4\] Spawners and towers ignore it, so the most important buildings never care. It is a solved, one-time check, not a tradeoff. |
| Home columns / forward columns | You can build only on owned columns. Forward building pays a supply-line surcharge. | Playtest F1: "Forward building isn't worth it, because the supply-line surcharge feels steep for what it gives back."\[10\] The dominant strategy is therefore "build at home". |
| Forts / besieged | Buildings block column flipping | This is defensive value only, and it pushes you further toward safe home building. |
| Lanes | Units march down their building's lane | With 1–2 lanes, the choice is mostly binary, and archers win either lane. |
| Mycorrhizal Link (rare relic) | Buildings orthogonally adjacent to 2+ of yours spawn 15% faster | It's the only adjacency rule, it's rare, and it's undiscoverable. Playtesters needed a diagram ("touching on a side, not just a corner").\[9\] |
| Velvet Shrine aura | Commander-exclusive aura | It's gated behind one commander. |

**Root cause:** there is nothing *between* buildings. A building's value is the same wherever it sits on owned ground, so placement is about convenience, not strategy. Compare Backpack Battles. There, items show "stars" on adjacent slots when you hover them, and filled stars mean the bonus is active.\[11\] Position is the build.\[12\] Your loam bonus is a stat, not a relationship.

### Problem 2: Gill Archers dominate
From the spec values and your experiment data:
- **Reach asymmetry.** Range 5 and aggro 6 against melee reach of about 0.5 means melee crosses about 4.5 tiles under fire. 14 pierce every 1.2 s is about 11.7 DPS, or about 17.5 DPS against Medium armor because of the ×1.5 Pierce multiplier. That hits Capguard, which is supposed to be the counter in the Sporeling → Gill Archer → Capguard triangle.
- **Range stacks with no ceiling.** A Bloomed archer has +0.75 range and an Elder +1.5. Longgill adds +1.5 and the upgrade track adds more. An Elder Longgill reaches 8+ tiles, so its effective threat zone grows faster than its DPS. A ×2.8 tier multiplier on top makes Elders brutal.
- **Arrival is piecemeal, and this is the root cause.** PR #7's instrumented battles found that "the defender never has more than 0–7 supply on the field".\[6\] Timer-based spawning feeds melee into the kill zone one at a time. Concentrated ranged fire beats trickled melee in any lane game, and your sim has no muster rule except the player-driven Hold. The defender diagnostic confirms it isn't an artifact of the bots: every one-off defender bot, even mono Sporeling, lost 95–100% to mono Gill Nest.\[1\]
- **Spawn interval tuning just moves the problem** (see Decision 1). T3 (home spawners shoot) cut archer wins to 30%, but "every battle stalls to a Decision."\[1\]
- **The counters are soft by design.** Matrix values of 0.5–1.5 mean no counter is ever decisive. The general's counter cycle reads your spawn mix, but its answers fail against the same arrival problem.

### Problem 3: no "one more run" pull
- **Slow starts.** Before Hold, "nothing on the front moves for the first 2–4 minutes"; the first column flip came at 2:16–4:14. Hold brought that down to 0:34–1:29.\[2\]
- **Brutal, unreadable endings.** "The losing Heartcap goes from first hit to dead in 13–20 s, and the winner's is never touched."\[2\] Players get no near-miss drama and no chance to come back.
- **Early run deaths.** "41% of runs end in battle 1, while the boss loses 80% of the time once reached."\[2\] Bot boss reach fell from 25% to 11% after Hold shipped.\[7\]
- **Few, small power spikes.** There are 4 drafts per battle at waves 2/4/6/8,\[4\] and most cards are +1-level upgrades or passives with no visible board change.
- **Synergies are invisible.** Playtest round 3 (two testers): "there's too much to learn and the game doesn't explain itself."\[9\]
- **Meta progression (M6–M8) isn't built yet.** Nothing new appears between runs.

### The philosophy tension
The spec's G3 ("no mono bot over 55%") and pillar 3 ("no build survives a whole run on autopilot") were written to *prevent* the kind of builds you now want. Every archer experiment was judged against G3, so the harness has been tuning toward flatness. Keep the harness, change the targets (Section 5.4).

## 3. What the research says

### "Just one more run"
- **Feel good, avoid frustration.** Luca Galante (Vampire Survivors) says what makes the game "is the fact that it's easy to play, makes you feel good, and tries to avoid frustration."\[13\] He built the original in the HTML5 engine Phaser, which is relevant for a browser game.\[14\] His gambling-industry background mostly shaped the over-the-top treasure-chest reveal, which shows how much juice on the reward moment matters.\[15\]\[16\]
- **Difficulty fights replayability.** Hades creative director Greg Kasavin: "The part where roguelikes can be brutally difficult is, ironically, directly at odds with the part where they're so replayable."\[17\] Supergiant's answers were opt-in difficulty (the Pact of Punishment: stackable Heat modifiers after your first clear, up to 64 Heat) and God Mode for players who struggle.\[17\]\[18\]\[19\]
- **Suspense over calculation.** LocalThunk deliberately hid Balatro's score preview to keep suspense on each played hand.\[20\] He describes "ruthless design": removing whole systems often made the game more fun.\[21\] Balatro grew from a hobby project; one friend put "ten, 20, 30 hours into it" before the developer saw its potential.\[22\]
- **Short, chunky runs and visible fusion moments.** Ball x Pit, a 2025 solo-developer hit from Kenny Sun published by Devolver, built its pull around ball fusions and evolutions. Reviewers single out the "Balatro-esque" fusion screens. It sold 300,000 copies in its first five days after launching on Oct 15, 2025 (Kenny Sun on Bluesky, reported by PC Gamer: "300,000!!! in 5 DAYS"), and passed 1 million copies by December 2025 (Gamereactor). One review site puts runs at about 15–25 minutes; that is a secondary source.\[23\]
- **Skill ladders extend life.** Slay the Spire has 20 Ascension levels, unlocked one at a time, plus Custom and Daily modes.\[24\] Monster Train has 25 Covenant ranks.\[25\]\[26\]
- **Seeded challenges for PC.** RoR2's Prismatic Trials are solo seeded runs with a new seed every 72 hours, identical enemies and chests for everyone, fixed Rainstorm difficulty, a global leaderboard, and an unlock (Harvester's Scythe) for your first completion.\[27\]\[28\] Mark Cooke (Shiny Shoe) called Monster Train 1's fixed-start "Expert Challenges" a design mistake that the sequel corrected, so a seeded mode needs to be built well.\[29\]

### Synergy and balance
- **Every card should have a place, and nothing should warp the game too much.** That was Slay the Spire's stated balance goal (GDC 2019, Anthony Giovannetti). Two developers balanced the game on metrics plus 18,168 pieces of feedback, iterating weekly through Early Access.\[24\] Single-player roguelikes can tolerate strong cards because nobody loses to them in PvP.\[30\]
- **Broken is fine if it takes assembly.** Monster Train's analytics led Shiny Shoe to nerf Onehorn's Tome "over and over", raising its cost from 3 to 5 Ember.\[31\] Cooke says they are "certain that it is possible to clear the highest difficulty" with every clan pairing, and that exploring the combinations "is a big part of the fun."\[29\] Broken builds are tolerated when they require assembly. Nerfs land on single cards that are broken *alone*.
- **"Break the game" is a selling point.** Hooded Horse CEO Tim Bender on the 9 Kings demo: "I sought bonuses and combos to break the game, but the game broke me."\[32\]

### Placement as strategy (survey)
- **9 Kings:** a 3×3 kingdom grid that expands over the years, with cards placed onto tiles. Some tiles are buildings that buff other tiles. Battles last seconds. The meta-perk tree is itself an adjacency grid.\[33\]\[34\] Its demo drew 200,000+ players at Next Fest and 170,000+ wishlists. After its May 23, 2025 Early Access launch, Hooded Horse said it was "smashing past 250,000 copies in its first week", and it reported 500,000 copies at six weeks.
- **There Are No Orcs (your inspiration):** released Nov 5, 2025 by BaseTrade Studio. Players place tile buildings that automatically produce gold or units, and placement-based synergy bonuses are the core.\[35\] Each faction places differently: Humans "optimize building placement to boost production", Demons summon all units through one portal, and Dwarves juggle building overload against downtime and a second resource.\[36\] It offers 30 commanders, each with active and passive skills and four exclusive buildings.\[37\]\[38\] The lesson: **give each faction or commander a different placement rule**, not just different stats.
- **Loop Hero:** discoverable adjacency transformations. A Meadow next to rocks becomes a Blooming Meadow; a 3×3 block of rock or mountain becomes a Mountain Peak; a Vampire Mansion next to a Village makes a Ransacked Village. A plus-shape of five suburbs makes a Town.\[39\]\[40\]\[41\]\[42\] Shapes and pairings create *new tiles*, with both upsides and risks.\[43\]\[44\]
- **Backpack Battles:** stars light up on hover and show exactly which neighbors are active.\[11\]\[12\] This is the gold standard for readability.
- **Hivemind (your friend's game):** merge-4 versus keep-adjacent tension. Decrees reward opposite board shapes (Hivemind adds +10% per matching neighbor; Lean Comb adds +5% per empty cell).

### Fungal biology as mechanics
- **Mycorrhizal networks and hyphal anastomosis.** Separate mycelia can fuse. Mikkelsen, Rosendahl & Jakobsen (2008, *New Phytologist* 180: 890–898) used ³²P labelling to show nutrient transfer between individual mycorrhizal networks: "The transfer probably occurred via anastomoses between the mycelia as no transfer of 32P was detected between the mycelia of different fungi." → **Linked buildings share bonuses.**
- **Armillaria rhizomorphs.** These "flat shoestringlike structures … bridge gaps between food sources and expand the fungus's sweeping perimeter."\[45\] A USDA Forest Service document from the Malheur National Forest lists one Oregon *A. ostoyae* genet at "2,385 acres" and gives three age estimates of 1,900, 2,200 and 8,650 years, so even the primary source gives a wide range. → **Supply lines that link forward buildings back to the Heartcap.**
- **Fairy rings.** The mycelium "grows radially outward." Breaking down organic matter releases nitrogen and makes a dark green ring. "When the nutrients in the center are exhausted, the center dies."\[46\]\[47\]\[48\] → **Ring formations around an empty center, and soil that depletes.**
- **Decomposition.** Fungi feeding on decomposing matter release nitrogen into the soil.\[49\]\[50\] → **Corpses compost soil into loam.**
- **Ophiocordyceps.** Infected ants show "summit disease": they climb, lock their jaws and die where spores disperse best.\[51\]\[52\] → **Parasite keyword: marked enemies walk to your frontier and burst.**
- **Antibiotic warfare** (the penicillin story) → **Anti-Rot zones that deny enemy auras.**
- **Fruiting triggers (moisture)** → **Rain/Sporestorm events that act as fruiting windows.**

## 4. Three directions

| | **A+. Keep real-time lanes, add the network layer and tighten pacing (recommended)** | **B. Rounds hybrid: build phase, then a 60–90 s clash, repeated** | **C. Full board-autobattler rework (9 Kings / Hivemind-like)** |
|---|---|---|---|
| Core change | Adjacency/network/terrain rules, draft every wave, battles ~4–5 min | The sim pauses between short clashes; territory resolves per round | A discrete grid with seconds-long fights; lanes become abstract |
| Fun gain | High: placement matters all battle, with more spikes | Very high decision density | Highest readability, but loses the identity |
| Cost | ~4–6 milestones | ~6–9 milestones, with a heavy rework of the UI, AI and goldens | Near rewrite |
| Risk to good bones | Low: territory, merging, the general and determinism all stay | Medium: territory flipping and Hold need redesign; goldens reset | High: territory and continuous merging mostly lost |
| Verdict | **Do this.** Revisit B only if playtests show real-time hides the network decisions | A fallback experiment, behind a proto flag | Don't. It would compete directly with 9 Kings and Hivemind |

Why A+: active pause already gives you a build phase whenever the player wants one. The fun gap is about *what* there is to decide, not *when*.

## 5. Recommended design

### 5.1 Revised pillars
1. **Territory is build space.** (kept)
2. **The colony is the build.** Where you place matters as much as what you place: links, shapes and soil.
3. **Three become one.** (kept, plus merge triggers)
4. **The general tests you openly.** It reads your build, announces a challenge and rewards you for beating it. It never quietly nerfs you.
5. **Break it on purpose.** Multiplicative engines exist and take assembly. Variety beats ceilings.
6. **Deterministic and measurable.** (kept, now measuring diversity)

### 5.2 The Mycelium Network system
1. **Hyphal links (adjacency).** Buildings that share an edge are *linked*. Links show as glowing threads at all times, and hovering a building or card shows Backpack Battles-style "stars" on the cells it cares about. Mycorrhizal Link becomes a base rule (+10% spawn rate per linked neighbor, max 3). The relic version upgrades it.
2. **Colonies and keyword thresholds.** A connected group is a colony. Each building carries 1–2 keywords: **Spore, Cap, Gill, Rot, Root, Glow, Parasite, Truffle**. Colony keyword counts trigger tiers at 2/4/6, TFT-style but *spatial*. For example, 4 Gill in one colony gives Volley (every 4th shot splits). Splitting your base into two colonies is now a real choice.
3. **Fed vs Starved (Armillaria rhizomorphs).** A colony touching your Heartcap's home columns, or joined to it by a chain of **Rhizome** tiles (a cheap 1×1 "building"), is *Fed*. Fed colonies pay no supply-line surcharge, and forward Fed buildings get +25% spawn rate ("fruiting near the front"). Unconnected forward buildings pay the surcharge and are Starved. This makes the forward-versus-home question a puzzle: run a vulnerable line forward, or stay safe and slow. Enemy units that stand on a Rhizome tile sever it, which creates natural targets and drama.
4. **Living soil.**
   - **Loam becomes universal fertile ground.** Spawners on loam get +1 merge-progress per spawn, so units arrive pre-knit more often. Towers get +15% damage and economy keeps +50% gold.
   - **Compost:** every 6 unit deaths on a tile turn it to loam for the rest of the battle. The front line becomes the richest soil, which pays off brave forward building.
   - **Depletion:** loam under an economy building exhausts after N income ticks, as at a fairy ring's center, so you have to relocate or reseed.
   - **Deadwood:** stumps stop being plain blockers. Rot buildings adjacent to a stump gain +1 keyword count.
5. **Formations.**
   - **Fairy Ring:** buildings around a 2×2 empty center grant a ring aura to units spawned inside it.
   - **Lines:** three buildings in a row along a lane form a **Spore Column**, whose units leave the spawn as one squad. This also helps the arrival problem.
   - **Placement-order effects:** "the first building placed each battle becomes the Colony Heart: +1 to all keyword counts."
6. **Lane identity.** Each lane can carry a soil type per map (Wet, Dry, Deadwood). It changes which keywords thrive there.

### 5.3 The archer fix (part of the design, not just a nerf)
- **Muster spawning for melee.** Melee spawners accumulate and release packs: Sporeling Burrow sends 4 at once on a longer timer, Capguard sends 2. This attacks the "0–7 supply on the field" root cause directly.
- **Range ceiling.** Base range 4.5, as spec §11.4 already suggested. Convert the range from merge tiers, strains and upgrades into damage or attack speed past a hard cap of 6.0. Longgill becomes "+1 range and arrows pierce one target."
- **Real counters.**
  - Capguard's **Cap Shield** absorbs the first 3 pierce hits.
  - Veilstalker gets a **burrow-leap** onto the nearest ranged unit, giving the game a backline diver.
  - Puffball Mortar gets +50% damage against clumps of 3 or more, and archers clump.
- **Prototype first:** run each change as a `?proto=` knob and combine them. Accept the bundle if mono Gill Nest drops below 65%, every defender bot wins at least 35%, and no mono build passes 65%.

### 5.4 Example content: 8 archetypes
| Archetype | Anchor (commander / strain) | Key pieces | Engine |
|---|---|---|---|
| **Volley Grove** (ranged) | Longgill strain | Gill Nest, Glow Lantern (a new Glow building that boosts ranged in its colony) | Gill 6: shots chain. Needs Cap walls in front |
| **Bloom Swarm** | Vesper | Sporeling Burrow, Spore Column lines | Swarm count scaling; Spore Cloud death bursts |
| **Knitting Engine** *(broken)* | Cordis | Knitting Circle, Spore Tithe, Elder Grove | Merges grant gold, gold buys merges. "Elder Cascade": every Elder knit instantly knits one more trio nearby |
| **Rot & Compost** *(broken)* | New: **Mother Mould** (deaths give double compost) | Rot Pit, Spore Cloud | Chain detonations turn soil to loam, and loam powers Rot. A battlefield that feeds itself |
| **Cordyceps Parasite** | Puppet Pod commander | Veilstalker, Puppet Pod, "Summit" relic | Marked enemies march to *your* frontier and burst into spores, which convert the next enemy |
| **Truffle Hoard** | New: **Old Truffler** | Truffle Cellar, Spore Exchange, "Gilded Gills" relic | Banked gold scales all units (+1% damage per 10 gold). The economy *is* the army |
| **Fairy Ring Fortress** | New strain: Ringcap | Puffball Mortar, Velvet Shrine | Ring auras stack multiplicatively within rings |
| **Rhizomorph Push** *(broken)* | Armilla | Rootgate, Rhizome tiles, Rootbreaker | Every captured column extends a free Rhizome; Fed forward buildings spawn ×1.5. A runaway frontier |

**Content rules:**
- **Pool design.** Drafts are themed by the colony's dominant keyword, offering 2 cards that fit and 1 wildcard, like Hivemind's themed shops. Rarity gates the rule-benders.
- **Multiplicative layers.** Only legendary relics and colony tier 6 multiply. Everything else adds.
- **Example relics:**
  - Anastomosis: two colonies that touch merge their keyword counts.
  - Fruiting Rain: during a storm, spawn rates double.
  - Antibiotic Ring: enemy auras inside your rings are void.

### 5.5 The adaptive general and bosses
- **Keep the counter cycle but make it open and rewarding.** A banner announces "The Gray Rot fields Gillbreakers in 2 waves". Beating an active counter grants a bonus draft card, so the general becomes a source of loot.
- **Keep the intel file** as a nemesis log on the run summary, e.g. "it learned you love archers".
- **Bosses are build exams with known rules.** Example: the Blight Baron "spreads Starve to colonies of 5+". Players can see the test coming and plan for it.
- **Bound counter strength** so a fully assembled engine still wins about 70–80% of its battles at Decay 0.

### 5.6 Pacing changes
- **Battles:** about 4–5 min target with a 7 min cap. Waves of about 45 s, a draft after every wave, and a hot start: a free pick from 3 starting buildings at 0:00.
- **Runs:** about 20–25 min, i.e. 5 battles plus events.
- **Heartcap fights:** give the Heartcap a last-stand phase at 25% HP (a shield plus a free Spore Burst), turning 13–20 s collapses into readable comeback moments.
- **Battle 1 is tuned to be winnable** (target ≥85%) so the 41% first-battle wipeout disappears.

### 5.7 Meta progression (premium PC)
- **Horizontal unlocks that teach.** Runs 1–3 unlock keywords one at a time: Spore and Cap first, then Gill, Rot and so on. Each unlock introduces one new rule, the way Hivemind's levels and Vampire Survivors' unlock lists do.
- **Commanders as rule-benders** (spec Vesper, Armilla, Cordis, plus the new ones above), with mastery 2–10 (spec).
- **Spec meta assessment.**
  - Feats: keep.
  - Root Capacity traits: keep, but cap the vertical power.
  - Strains: keep, as archetype anchors.
  - Decay: keep, as the Heat/Ascension ladder.
  - Pacing of "50% content by ~15 runs": a good target.
- **Collection codex:** buildings, colony tiers reached, and formations discovered, Loop Hero-style.
- **Run summary:** best colony diagram, the "most broken moment" (peak DPS multiplier), the nemesis log, and the next unlock progress bar. One keypress starts the next run.
- **Later: a Spore Trial** seeded mode using the deterministic sim. A fixed seed rotating every 72 h, fixed commander, local and friends leaderboard, and a first-clear unlock.
- **Skip:** daily quests, login streaks and idle accrual. These are mobile retention hooks that read as manipulative in a premium game. Seeded trials give the "today's challenge" feeling without obligation.

## 6. Quick wins and roadmap

### Quick wins (1–3 sessions each)
1. **Archer bundle as proto knobs** (5.3), measured with `npm run experiment`.
2. **Hot start plus a draft every wave** behind flags.
3. **Heartcap last stand.**
4. **One-key restart and unlock progress** on the summary.
5. **Always-on link threads and hover stars,** render-only so goldens don't change.

### Phased roadmap
| # | Milestone | Goal / scope | Acceptance and playtest | Metrics |
|---|---|---|---|---|
| P0 | Archer & arrival | Muster spawning, range cap, counters | Mono Gill Nest ≤65%; no mono >65%; G4 Decisions ≤15%. Playtest: testers name ≥2 viable openings | Mono win%, defender supply on field, Heartcap fall time |
| P1 | Pacing | Hot start, a draft every wave, last stand, 4–5 min battles | First decision <30 s; battle 1 win ≥85%; run 20–25 min. Testers press "new run" ≥50% of the time | Time to first decision, commands/min, battle-1 loss % |
| P2 | Network prototype (paper first, then proto) | Links, colonies, Fed/Starved, 4 keywords | Paper test with 3 friends, then proto. ≥60% of placements change because of links | Placement-entropy, % buildings linked, Fed share |
| P3 | Living soil & formations | Compost, depletion, rings, lines | Loam tiles chosen on purpose in ≥50% of battles | Loam-use rate, forward-build share |
| P4 | Archetype content | 8 archetypes, themed drafts, 3 broken engines | Each archetype wins ≥40% when assembled; top pick share ≤25% | Archetype pick share, win-rate spread, build entropy, peak multiplier |
| P5 | General & bosses as tests | Open counters, counter-beaten rewards, boss exams | Testers describe counters as "fair" | Counter-beaten %, boss win by archetype |
| P6 | Meta | Unlock ladder, codex, summary, Decay | Each of runs 1–10 unlocks something | Unlocks per run, return rate |
| P7 | Spore Trials | Seeded 72 h challenge | Same seed gives identical goldens | Completion %, retries |

**Replace G3** with: (a) mono-building bots with no synergy pieces ≤60%; (b) ≥6 archetype bots each between 40% and 75% against the balanced bot; (c) no archetype above 25% pick share among strategy bots; (d) build entropy above a threshold. These measure variety while still allowing power.

## 7. Borrow and avoid
- **Borrow:**
  - From Hivemind: spatial tension between merging and adjacency, decrees that reward opposite shapes, themed shops, humor and personality. A "Mycelial Gazette" event feed could give events voice without copying Hivemind's Buzz feed.
  - From Backpack Battles: hover stars.
  - From Loop Hero: discoverable combos.
  - From 9 Kings: a small grid with big multipliers.
  - From There Are No Orcs: a different placement rule per faction or commander.
  - From Hades and Slay the Spire: opt-in Heat and Ascension ladders.
  - From RoR2: seeded trials.
  - From Balatro: ruthless system cuts and suspense.
- **Avoid:**
  - Mobile retention hooks.
  - Hidden synergies with no tooltip; your own testers already flagged this.
  - Merge-4. Keep your 3-merge identity.
  - Balancing toward flatness.
  - Fixed-start "expert challenges" (Shiny Shoe's own regret).\[29\]
  - Adding systems without cutting old ones.

## 8. Indie success (brief)
- **Polish the core hook first.** Clear, fast hooks plus juice and personality (Vampire Survivors, Balatro, Ball x Pit) matter more than content volume.
- **Use Steam Next Fest data if you go to Steam.** Chris Zukowski's How To Market A Game survey of 182 developers after the February 2026 fest (published April 13, 2026) put the median gain at 806 wishlists, down from 1,079 a year earlier. GameDiscoverCo estimates the true median across all 3,500+ demos is "nearer 200". Demos that were live for more than a month before the fest earned about 2.5× the wishlists of demos launched during it. 68–88% of fest wishlists come from people who never played the demo.\[53\]\[54\] For now, a browser build plus a small Discord of friends is the right stage.

## 9. Open questions for you
1. Are you willing to change SPEC §5.2 (spawning and arrival) and drop G3 as written?
2. Is a 20–25 min run acceptable, or do you want 30+ for depth?
3. Should forward building be *the* high-skill play, or one option among equals?
4. How much humor and voice do you want? Is a Gray Rot "nemesis" character in scope?
5. Should the Spore Trials leaderboard stay local-and-friends, or would you add a backend?
6. Can you commit the uncommitted worktree notes so they can be reviewed against this plan?

## Caveats
- **I couldn't read the develop branch's files directly.** GitHub blocked automated access. The repo analysis relies on PR descriptions and commit messages (#1, #4, #6–#10, #12–#20, #22) and on your spec summary.
- **Unverified data values:** exact data JSON values (archer HP and cost, loam multiplier, surcharge amount, Mycorrhizal Link) and the text of playtest items F8–F16 are unverified. The archer numbers come from the spec and may differ in data. Only the 15 s Gill Nest interval is confirmed.\[1\]
- **Uncommitted notes:** your worktree notes aren't committed, so some of these recommendations may duplicate or conflict with them.
- **Secondary sources:** the Ball x Pit run length comes from a secondary source. The Armillaria age range (1,900–8,650 years) is uncertain in the USDA source itself.
- **Untested proposals:** all proposed numbers are starting points for proto testing, not tuned values.

## Sources

1. [Balance prototypes round 2: Gill Nest interval, T1–T3, defender diagnostic (nothing adopted) by Swalliso · Pull Request #8 · Swalliso/Sambattler · GitHub](https://github.com/Swalliso/Sambattler/pull/8)
2. [Engagement review, E1 Hold / Advance prototype and engagement checks (nothing adopted) by Swalliso · Pull Request #9 · Swalliso/Sambattler · GitHub](https://github.com/Swalliso/Sambattler/pull/9)
3. [Milestone 2: merging and combat depth by Swalliso · Pull Request #1 · Swalliso/Sambattler · GitHub](https://github.com/Swalliso/Sambattler/pull/1)
4. [Milestone 3: run loop, drafts, relics, carryover by Swalliso · Pull Request #4 · Swalliso/Sambattler](https://github.com/Swalliso/Sambattler/pull/4)
5. [Milestone 4: adaptive general, counter cycle and intel by Swalliso · Pull Request #6 · Swalliso/Sambattler · GitHub](https://github.com/Swalliso/Sambattler/pull/6)
6. [Balance-backlog prototypes: rounds 1-2 behind default-off knobs (nothing adopted) by Swalliso · Pull Request #7 · Swalliso/Sambattler](https://github.com/Swalliso/Sambattler/pull/7)
7. [Playtest UI, dig-deep-style develop → /dev/ site, and Hold / Advance by Swalliso · Pull Request #10 · Swalliso/Sambattler · GitHub](https://github.com/Swalliso/Sambattler/pull/10)
8. [Milestone 5: commanders and powers by Swalliso · Pull Request #22 · Swalliso/Sambattler · GitHub](https://github.com/Swalliso/Sambattler/pull/22)
9. [Clarity pass from playtest round 3, and round 3 logged by Swalliso · Pull Request #20 · Swalliso/Sambattler · GitHub](https://github.com/Swalliso/Sambattler/pull/20)
10. [Track M1 playtest feedback for the next milestone by Swalliso · Pull Request #2 · Swalliso/Sambattler · GitHub](https://github.com/Swalliso/Sambattler/pull/2)
11. [What are stars? :: Backpack Battles General Discussions](https://steamcommunity.com/app/2427700/discussions/0/3812906855244750368/)
12. [Backpack Battles](https://steamcommunity.com/app/2427700/discussions/0/4290313152625938174)
13. ["I'm Making This For Me, Not To Make Everyone Happy": Vampire Survivors Creator On His Next Game - GameSpot](https://www.gamespot.com/articles/im-making-this-for-me-not-to-make-everyone-happy-vampire-survivors-creator-on-his-next-game/1100-6536362/)
14. [Vampire Survivors development sounds like an open-sourced fueled fever dream](https://www.gamedeveloper.com/design/vampire-survivors-development-sounds-like-an-open-source-fueled-fever-dream)
15. [Vampire Survivors developer explores the story so far and what comes next](https://www.androidpolice.com/vampire-survivors-developer-interview/)
16. [Vampire Survivors](https://en.wikipedia.org/wiki/Vampire_Survivors)
17. ['Hades' devs reveal how God Mode solves the worst thing about the genre](https://www.inverse.com/gaming/hades-god-mode-interview)
18. [Hades: Tips and Tricks For Taking on the Pact of Punishment](https://www.cbr.com/hades-pact-of-punishment-guide/)
19. [Hades Review: How Supergiant Perfected the Roguelike](https://theplayjournal.com/hades-review/)
20. [Balatro's 'Cursed' Design Problem](https://gmtk.substack.com/p/balatros-cursed-design-problem)
21. [Balatro Creator LocalThunk Talks Inspirations and Jokers](https://sozai.app/transcript/balatro-creator-localthunk-inspirations-jokers/)
22. ['Balatro' Creator LocalThunk Reflects On Making 2024's Best Game](https://www.rollingstone.com/culture/rs-gaming/balatro-localthunk-interview-1235214060/)
23. [BALL x PIT Review 2025: Devolver’s Best New Roguelite Hit - GameDaily](https://gamedaily.com/reviews/ball-x-pit-the-roguelite-sensation-redefining-indie-gaming-in-october-2025)
24. ['SLAY THE SPIRE': METRICS DRIVEN DESIGN AND BALANCE Anthony Giovannetti](https://gdcvault.com/play/mediaProxy.php?sid=1026309)
25. [Review : Monster Train : Can You Keep Hell From Freezing Over? : Seasoned Gaming](https://seasonedgaming.com/2021/03/30/review-monster-train-can-you-keep-hell-from-freezing-over/)
26. [Monster Train on Steam](https://store.steampowered.com/app/1102190/Monster_Train/)
27. [Risk Of Rain 2: What Is A Prismatic Trial?](https://www.thegamer.com/risk-of-rain-2-prismatic-trial/)
28. [Risk of Rain](https://riskofrain.2k.com/)
29. [Shiny Shoe CEO Mark Cooke explains why Monster Train needed a sequel instead of more DLC - gamepressure.com](https://www.gamepressure.com/newsroom/shiny-shoe-ceo-mark-cooke-explains-why-monster-train-needed-a-seq/zd8975)
30. [Slay the Spire: Metrics Driven Design and Balance](https://podwise.ai/episodes/1459444)
31. [Shiny Shoe's CEO Talks Monster Train, Inkbound, & Creating "Poggable Moments" For Players](https://screenrant.com/inkbound-monster-train-mark-cooke-interview/)
32. [Hooded Horse to publish roguelite kingdom-builder 9 Kings](https://www.dbltap.com/news-hooded-horse-to-publish-roguelite-kingdom-builder-9-kings)
33. [9 Kings Early Access Review: auto-roguelite royalty in the making - Rogueliker](https://rogueliker.com/9-kings-early-access-review/)
34. [9 Kings is worth tracking on its early access journey](https://www.rogue.site/editorials/9-kings-impressions-early-access/)
35. [There Are No Orcs on Steam](https://store.steampowered.com/app/3480990/There_Are_No_Orcs/)
36. [Steam Community :: There Are No Orcs](https://steamcommunity.com/app/3480990/allnews/)
37. [There Are No Orcs 🥇 Best Prices](https://www.g2a.com/there-are-no-orcs-p10000514400)
38. [There Are No Orcs](https://isteam.net/app/3480990)
39. ['Loop Hero' tile combos: Blooming Meadows and 5 more key building combinations](https://www.inverse.com/gaming/loop-hero-tile-combos-building-blooming-meadow-oasis)
40. [Loop Hero: Every Tile Combo And Synergies](https://www.thegamer.com/loop-hero-tile-combo-synergies/)
41. [Loop Hero - All Card/Tile Combinations](https://www.slythergames.com/2021/03/11/loop-hero-all-card-tile-combinations/)
42. [Loop Hero - Tile Combinations List](https://gameplay.tips/guides/9992-loop-hero.html)
43. [Loop Hero: Tile Combos Guide](https://gamerant.com/loop-hero-tile-combos-guide/)
44. [Loop Hero Deep Run Guide: Trait Decks, Tile Sets and Boss Tactics](https://beyondsblog.com/walkthrough/loop-hero-deep-run-guide-trait-decks-tile-sets-and-boss-tactics/)
45. [Strange but True: The Largest Organism on Earth Is a Fungus](https://www.scientificamerican.com/article/strange-but-true-largest-organism-is-fungus/)
46. [Fairy Ring](https://turfpestlab.psu.edu/pest-profiles/fairy-ring/)
47. [Mushrooms in Turf: Don’t Be Afraid of the Fairy Rings - Lee County Center](https://lee.ces.ncsu.edu/news/mushrooms-in-turf-dont-be-afraid-of-the-fairy-rings/)
48. [Fairy ring](https://en.wikipedia.org/wiki/Fairy_ring)
49. [Fairy Rings in Lawns - SDSU Extension](https://extension.sdstate.edu/fairy-rings-lawns)
50. [Fairy Ring in Lawns: What Causes It and How to Get Rid of It](https://whatgrassisthis.com/blog/fairy-ring-lawn-causes-treatment)
51. [Multiomic interpretation of fungus-infected ant metabolomes during manipulated summit disease](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10474057/)
52. [What Is Ophiocordyceps? The Zombie-Ant Fungus Explained - ScienceInsights](https://scienceinsights.org/what-is-ophiocordyceps-the-zombie-ant-fungus-explained/)
53. [Steam Next Fest 2026: Complete Prep Guide & Checklist](https://presskit.gg/field-guides/steam-next-fest-guide)
54. [How to Get Steam Wishlists: Tactics Ranked by Real Data](https://www.steampageanalyzer.com/blog/how-to-get-steam-wishlists)
