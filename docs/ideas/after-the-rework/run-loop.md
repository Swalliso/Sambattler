# The run loop and meta layer as a player meets them: where the "one more run" pull is weak

Evidence for [After the combat rework](../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): the run loop and meta layer. Written by an agent during that review; nothing here is adopted. Recovered from the session transcript; its scripts are in [scripts/run-loop/](scripts/run-loop/), and their raw output wasn't kept.

Written 2026-10-31 against `develop` at `ef2e133` (a separate checkout). No tracked file was changed. **Nothing here is adopted.** Rule and data changes wait for the user (`.claude/rules/balance.md`).

Sources: SPEC §3, §6.5, §8, §9, §11.5–11.10, §16 (M3–M8), §18; `src/run/*.ts`; `src/sim/draft.ts`, `src/sim/ai/draftPolicy.ts`, `src/sim/systems/economy.ts`; `src/ui/screens/{run,underroot}.ts`; `src/app/{main,run}.ts`; `data/{relics,upgrades,events,elites,commanders,generals,balance,bots}.json`, `data/factions/velvet-bloom/buildings.json`; `src/data/proto.ts`; `docs/m5-plan.md`, `docs/engagement-review.md`, `docs/ideas/one-more-run-review.md`, `docs/balance-backlog.md` (step A, step B, P2), `docs/playtest-feedback.md`, `docs/ideas/rounds.md` and `colony-swarm.md` (run-layer sections).

---

## Short answer

1. **A run has no arc. It's a sudden-death gauntlet decided in battle 1, and the playtest rules make that worse.**
   - Under today's `rework` preset, **51% of bot runs lose battle 1**: Vesper 36%, Armilla 54%, Cordis 63%. M5 without `?proto=` loses 35%.
   - A rout loss sets the Heartcap to 0 (`src/run/rewards.ts:35`), and nearly every loss is a rout. So the run's Heartcap is binary: 92% of battles start at full HP, and Groves are almost never used for repair.
   - Battle 1 is always Old Mother Mold or the Lichen Baron. Under `rework`, Mold wins 68% of those fights.
2. **Picking well barely matters, and the cards that would define a build rarely show up.**
   - All 42 upgrade levels and 12 of the 21 relics are flat numbers.
   - A relic that changes the rules (Spore Cloud, Martyr's Bloom, Spore Tithe, Rot-Eater) is offered in only a third of `rework` runs. Each rare relic shows up in 6–9% of runs.
   - **A bot that drafts at random wins as many runs as the greedy one** (41 against 44 of 240). Taking the in-battle drafts away costs 15 wins.
3. **Nothing carries from one run to the next.**
   - Spores, Amber and XP roll up on the summary, then disappear. No profile is saved.
   - The summary says "Feats: none yet (Milestone 6)", "Decay 0" and "Every run starts fresh".
   - The Underroot even forgets your last commander and bans.
4. **The ending isn't a climax, and winning leads nowhere.**
   - Under `rework`, runs that reach the Pale Sovereign beat it 92% of the time (96% with `hotstart,bigdrafts`).
   - There's no next rung to climb: blights and Decay are M7.
5. **Commanders change your power, not how you play, and the rework spreads them apart.**
   - `rework` runs won: Vesper 33%, Armilla 10%, Cordis 13%. That's a 23-point spread; M5 accepted 15.
   - Cordis's identity, merging, gets washed out because waves make everything merge.
   - Drafted kits converge across commanders.
6. **Route, elite, Grove and event choices are shallow.**
   - The route is fully connected (F10).
   - Taking the optional row-2 battle is pure risk: a bot that always fights wins 33 runs against 44.
   - Elites add about 10 points of run-ending risk for one relic pick plus Spores and Amber that buy nothing (F11).
   - 6 of 8 events offer "nothing happens", and Amber Seep is a trap today.

**The most promising run-level lever measured here is a "lives" rule:** a lost non-boss battle costs 40% of max HP instead of the run.
- In a scratch emulation (no rule change), runs that reach the boss go from 20% to 89% under `rework`, and battle time per run from 13 to 26 min.
- Groves start being used for repair (48% of visits, against about 4%), and half of all battles start below full HP.
- It overshoots: bots then win 70% of runs, and 90% with `hotstart,bigdrafts`. So it needs a harder late game and boss alongside.

---

## Fresh measurements (this review)

**Method.** A scratch script ([`runstats.ts`](scripts/run-loop/runstats.ts)) plays whole runs the same way as `npm run experiment -- --checks runs`:
- `bot:balanced`, greedy drafts, a random route, power policy auto;
- 80 seeds per commander, so 240 runs per row;
- it also records every in-battle offer and spoils offer, every node and Grove choice, and the Heartcap at each battle.

It reproduces the official tool exactly:
- M5 (no `?proto=`), every commander: Vesper reaches the boss 31, wins 22, ends in battle 1 24; Armilla 25 / 17 / 29; Cordis 20 / 15 / 26, matching the backlog's P2 "today" rows.
- `rework` Armilla: `npm run experiment -- --proto rework --checks runs --commander armilla --power-policy auto --runs 80` gives 11 / 8 / 43, matching.

Error: about ±5 points per commander and about ±3 pooled.

**"Lives" emulation.** In the script, a non-boss rout loss is relabelled a Decision loss and the battle's Heartcap reset, so that the loss costs 40% of max HP and the run continues. This is the engagement review's recommendation 2, run half. It isn't a rule; the battles themselves are unchanged.

### Master table (240 runs per row)

| Variant | Runs won | Reached the boss | Lost battle 1 (ended the run) | Boss fights won | Battles per run | Battle min per run (mean) |
|---|---|---|---|---|---|---|
| **M5 (no proto)** | 54 (23%) | 76 (32%) | 83 (79) = 35% | 54/76 (71%) | 2.49 | 14.6 |
| **`rework` (the playtest)** | 44 (18%) | 48 (20%) | 122 (114) = **51%** | 44/48 (**92%**) | 2.11 | 13.3 |
| `rework`, random drafts | 41 (17%) | 45 | 122 (112) | 41/45 | 2.04 | 13.2 |
| `rework`, no in-battle drafts (`draftWaves:[]`) | 29 (12%) | 33 | 135 (125) | 29/33 | 1.85 | 12.6 |
| `rework`, route "battles" (row-2 battle always; never an elite) | 33 (14%) | 37 | 122 (114) | 33/37 | 2.13 | 13.7 |
| `rework,hotstart,bigdrafts` | 96 (40%) | 100 (42%) | 52 (47) = 22% | 96/100 (96%) | 2.93 | 16.9 |
| M5 + lives (40%) | 154 (64%) | 232 (97%) | 83 (0) | 154/232 (66%) | 4.33 | 24.2 |
| `rework` + lives (40%) | 167 (70%) | 214 (89%) | 122 (0) | 167/214 (78%) | 4.20 | 25.6 |
| `rework,hotstart,bigdrafts` + lives | 217 (90%) | 232 (97%) | 52 (0) | 217/232 (94%) | 4.33 | 24.4 |

`rework` per commander (V / A / C):
- runs won 26 / 8 / 10;
- battle 1 lost 29 / 43 / 50;
- boss fights won 26/26, 8/11, 10/11.

`rework,hotstart,bigdrafts`: runs won 45 / 30 / 21, battle 1 lost 4 / 20 / 28.

---

## 1. A run, step by step

### Setup: Title → New run → the Underroot → Begin run (`src/app/main.ts:174–181`, `src/ui/screens/underroot.ts`)

- **Commander:** Vesper, Armilla or Cordis, all unlocked (M5 kickoff decision). Each card shows the passive, the power (with aim and timing), the starter kit and the rest of the core pool, marked "drafted twice as often".
  - **The screen always opens on Vesper with no bans** (`choice: { commander: DEFAULT_COMMANDER, bans: [] }`, `main.ts:177`).
- **Bans:** up to 3 of the shared pool (`MAX_BANS = 3`, `src/sim/create.ts:170`).
  - The shared pool is the roster minus the commander's 6 core buildings: 8 today, 11 under `rework` (Rhizomorph Tunnel, Burster Pod and Drift Stalk are added to the roster, `src/data/proto.ts:227–228`).
- **Not built:** SPEC §8.1's traits (step 2), strains (step 3) and blights (step 5). That makes setup two choices.
- **Seed:** `crypto.getRandomValues` (`main.ts:51–55`).

### The route (`src/run/route.ts:40–77`, SPEC §8.2)

| Row | Nodes | Notes |
|---|---|---|
| 1 | Battle | Always Mold or the Baron. The scripted general is excluded because it isn't adaptive (`assignGenerals`, `route.ts:79–82`), and Blightwright's `appearsIn` starts at 2 (`data/generals.json:40, 58, 76`) |
| 2 | Battle · Event · Grove | The only optional battle |
| 3 | Battle · Elite | |
| 4 | Event · Grove (order random) | Never a battle |
| 5 | Battle · Elite | |
| 6 | Boss (the Pale Sovereign) | |

- **Every node links to every node in the next row,** so each row is an independent pick and there are no paths to plan (SPEC D21; playtest F10).
- **A full run has 4 battles** (rows 1, 3, 5, 6), or 5 if you take row 2's.
- **Content per run:**
  - 3 maps in the pool (Bogwater, Stumpfield, Twin Roots; `mapPool` excludes test maps, and Three Hollows is M7), so maps repeat within a run;
  - 3 regular generals plus the boss;
  - 3 elite modifiers;
  - 2 of the 8 events are drawn, and you visit 0–2 of them.
- **What a node shows** (`src/ui/screens/run.ts:108–131`):
  - a battle shows its map, lane count and general;
  - an elite adds its modifier and an "Extra reward" chip (relic pick, +15 Spores, 25% Amber);
  - an event says "A choice with tradeoffs";
  - a Grove says "Repair 30% or graft an upgrade".
- **Intel bars** show what the Gray Rot has learned about you (`intelBars`, `run.ts:140–155`).

### Each battle

**Config** (`src/run/flow.ts:68–130`):
- **Starting gold:** 300 + 75 × (battle − 1) (`balance.json` `startingGold`, `startingGoldPerBattle`).
- **Your kit, upgrades, relics and Heartcap** carry over from earlier battles.
- **The enemy:**
  - **Kit:** its opener plus one preferred blueprint and one random upgrade level per battle index. An elite adds a level. The boss fields 7 buildings and 4 levels (`generalKit`, `balance.json` `enemyKit`).
  - **Heartcap:** 2000 + 250 × (battle − 1), or 3600 for the boss.

**Deploy** is paused placement with your kit. Battle 1 starts from the commander's 3-building starter.

**Drafts** (`economy.ts:26–28`, `src/sim/draft.ts`):
- **When:** at 2:00, 4:00, 6:00 and 8:00 of the live clock. Under `rework`, waves set out on a 20 s beat, but drafts still follow the 60 s wave.
- **The offer:** 1 card of 3, with type weights blueprint 35 / upgrade 45 / relic 20. Blueprints rise to 50% while the kit has fewer than 5 buildings.
- **Rarity:** 70/25/5, moving 3 points to rare each battle.
- **Reroll and skip:** a reroll costs 20 gold, then +10 each; a skip pays 40 gold. The sim holds while a draft is open.
- **Measured:** 2.4 drafts per battle on M5. Under `rework`: Vesper 2.44, Armilla 2.57, Cordis 2.95, because Cordis's battles run longer (median 7:01).

**Your verbs in battle:** place and sell buildings, merge toggles, Hold / Advance per lane, and the commander power (`Q`).

**How it ends** (SPEC §6.5): a Rout, or a Decision at 10:00.
- Battle medians: 5:41–5:50 on M5, 5:54 / 6:00 / 7:01 (V / A / C) under `rework`.
- Decisions are 2–9% of battles.

### After a battle (`src/run/rewards.ts`, `flow.ts:224–295`)

| Result | Spoils | Spores | Heartcap |
|---|---|---|---|
| Win by Rout | 1 of 3, +10 rare, 1 free reroll | 20 | +10% of max |
| Win by Decision | 1 of 2 | 10 | — |
| Elite win, on top | +10 rare on spoils, plus a relic-only pick (1 of 3) | +15 | 25% chance of +1 Amber |
| Boss win | — (the run is won) | 60 | +2 Amber |
| Loss by Decision | — | 0 | −25% of max |
| **Loss by Rout** | — | 0 | **→ 0: the run ends** (`rewards.ts:35`, `flow.ts:275–276`) |

- Skipping a spoils pick pays nothing; only the in-battle skip pays gold.
- Spoils and in-battle drafts deal the same cards (F9).

### Non-battle nodes

- **Grove** (`flow.ts:343`): repair 30% of max HP, or graft +1 level onto a track you own.
- **Events:** 8, in `data/events.json`. See §3.6.

### The boss: the Pale Sovereign (`data/generals.json:80–101`)

- 7 buildings and 4 upgrade levels, plus counters to your top two intel kinds (`bossCounters`, `flow.ts:191–202`).
- An early counter cycle (warning at 1:00, active at 3:00), a dual doctrine, and +25% turret damage.
- 3600 HP, against 2750 for a battle 4.

### The summary (`summaryScreen`, `src/ui/screens/run.ts:544–611`)

- A victory or defeat banner and the run's MVP building.
- Intel bars.
- A table of battles: node, map, general, result, length, Heartcap before → after, a front-line sparkline, counters.
- Damage by building, the cards drafted, and "Earned": Spores, Amber and Commander XP rolling up, then **"Feats: none yet (Milestone 6)"** and **"Decay: 0"** as hard-coded rows (`run.ts:602–603`).
- The footer reads **"Every run starts fresh: a new route, kit and set of generals"** (`run.ts:608`), with New run (back to the Underroot) and Title.

### What carries between runs today

**Nothing that affects play.** The only saved keys are:
- the run in progress and the battle checkpoint (`spore-sprawl.run.v1`, `spore-sprawl.battle.v1`);
- settings and the tips already shown (`.claude/rules/storage.md`).

Spores, Amber and XP live only in `RunState` (`runState.ts:112–114`) and are dropped with it.

### Times

| Measure | Value | Source |
|---|---|---|
| SPEC target | Run 25–35 min; battle ~6–8 min, at most 10; 4–5 battles | SPEC §3, §1.2 |
| Battle median (bots) | 5:41–5:50 (M5); 5:54 / 6:00 / 7:01 V / A / C (`rework`) | this review |
| Battle time in a **won** run (bots, median) | 20.5–23.0 min over 4.1–4.2 battles (M5); 22.0 / 25.7 / 26.4 min (`rework`) | this review; M5: backlog step A |
| Battle time per run, all runs (mean) | 14.6 min (M5); 13.3 min (`rework`); median Armilla 7.8, Cordis 9.3 (`rework`) | this review |
| Battles per run (mean, all runs) | 2.49 (M5); 2.11 (`rework`) | this review |
| Human wall-clock | **Unmeasured.** Deploy, draft holds and about 10–12 run screens come on top of battle time. 1×/2×/3× speeds exist (`src/app/input.ts:100–101`). Estimate for a won run at 1×: about 30–40 min | one-more-run review ("human time … unmeasured") |

---

## 2. Every decision a player makes in a run

Counts are means per run under `rework` (240 runs), for all runs and for won runs.

| Decision | When | All runs / won runs | How much it matters (evidence) |
|---|---|---|---|
| Commander (1 of 3) | Setup | 1 / 1 | **A lot.** `rework` runs won: V 33%, A 10%, C 13%. Battle 1 lost: 36 / 54 / 63%. Powers alone move runs ending in battle 1 from 42–70% to 32–37% on M5 (backlog step A, power on/off) |
| Bans (0–3 of 8, or 11 under `rework`) | Setup | 1 / 1 | **Unmeasured**, likely moderate. Three bans remove 27–38% of the shared blueprints, and blueprints are about 35–50% of cards. Bots never ban |
| Route node, rows 2–5 | Between battles | 1.48 / 4.0 | **Small, and mostly about risk.** Fully connected; the information shown is map, general and elite modifier. Taking the row-2 battle and skipping elites: 33 runs won against 44 (random route) |
| Battle vs elite (rows 3 and 5) | | inside the above | **About 10 points of extra run-ending risk** for a relic pick. Battles 2+: elite lost 44% vs battle 34% (`rework`), 35% vs 27% (M5). Veteran is the deadliest (42–49%) |
| Placing and selling buildings | In battle | continuous (~10 placements a battle, engagement review) | The core battle decision; other reviews cover it. Placement spread (step A): the best plot is no better than the median at 1:00 on Bogwater |
| Hold / Advance | In battle | 4–7 stance commands a battle (engagement review) | Real timing decision (adopted E1) |
| Commander power | In battle | 5–7 uses a battle (75–80 s cooldowns) | **A lot** (above) |
| In-battle draft (1 of 3; reroll; skip) | 2:00, 4:00, 6:00, 8:00 | 5.5 / 9.8 | **Having drafts matters, but which card you pick barely does.** No in-battle drafts: 29 wins against 44. Random picks: 41 against 44 |
| Spoils (1 of 3 or 1 of 2) and the elite relic pick | After a win | 1.3 / 4.1 | Same cards as in-battle drafts (F9) |
| Grove: repair or graft | Rows 2 and 4 | 0.34 / 1.05 | **Almost never a real choice today.** Repair chosen in 3 of 81 Groves (`rework`) and 4 of 110 (M5), because 92% of battles start at full HP. Under the lives emulation: 97 of 203 (48%) |
| Event choice | Rows 2 and 4 | 0.23 / 0.80 | Small. 6 of 8 are take-it-or-leave-it (§3.6) |
| Prompts (which track, which blueprint or relic to give up) | After some events and Groves | rare | Small to moderate |

**In total, a won run** asks about 20 run-level choices: about 10 drafts, 4 spoils picks, 4 route picks, 1 event or Grove and the setup. That's spread over 22–26 min of battle, on top of the battle verbs.

**The median run is about 1–2 battles**, so it asks 2–6 run-level choices before it ends.

---

## 3. The draft pool, audited

### 3.1 How many cards, by kind

| Kind | Count | Notes |
|---|---|---|
| Blueprints | 14 buildings (17 under `rework`) | Per commander: 3 starters, 3 more core (weight ×2, `balance.json` `draft.coreWeight`), 8 shared (11 under `rework`) minus bans |
| Upgrade levels | 14 tracks × 3 = **42** | No tracks for the Rhizomorph Tunnel, the Burster Pod or the Drift Stalk (`data/upgrades.json`) |
| Relics | **21** (`data/relics.json`) | 7 common, 8 uncommon, 6 rare. Rot-Eater's `unlockedBy` is ignored until M6 (`src/data/schema.ts:664`; `draftPool` doesn't read it, `create.ts:177–188`) |

### 3.2 What players are actually offered (`rework`, in-battle offers, 240 runs)

- **By rarity:** 76% common, 20% uncommon, 4% rare.
- **By type:** blueprints 43%, upgrades 39%, relics 18%.
- **A relic** is in 41–46% of offers; a rare relic in 3–5%.
- **A blueprint** is in 76% of offers. It's the main "new thing" card, and the run's real build choice.
- **Only 6%** of offers hold a relic that changes the rules.
- **Over a whole run:**
  - any rare relic is offered in 67 of 240 runs (28%);
  - a rule-changing relic in 79 of 240 (33%; 32 of 44 won runs), and one is owned at the end of 41 (17%);
  - with `hotstart,bigdrafts`: 141 offered (59%) and 118 owned.

**Exposure per card under `rework`:** the share of runs in which the card was offered at least once, and the share among runs that reached battle 3 (480 runs: greedy plus random drafts).

| Blueprints | Seen (all / 3+ battles) | Relics | Seen (all / 3+ battles) |
|---|---|---|---|
| Rootbreaker Den | 86 / 99% | Hardy Spores (C) | 36 / 69% |
| Morel Warren (common, shared for all) | 73 / 99% | Quick Roots (C) | 35 / 64% |
| Puffball Mortar | 56 / 77% | Thick Caps (C) | 33 / 64% |
| Gill Nest | 52 / 72% | Fresh Spores (C) | 31 / 57% |
| Amanita Lodge (rare) | 39 / 75% | Rot Ward (C) | 30 / 60% |
| Rhizome Vault | 28 / 52% | Root Stipend (C) | 29 / 57% |
| Hammercap Forge | 27 / 45% | Fruiting Season (C) | 19 / 45% |
| Scythecap Grove | 27 / 45% | Deep Cellars (U) | 18 / 39% |
| Tender's Ring | 26 / 48% | Spore Tithe (U) | 17 / 35% |
| Veilstalker Hollow | 26 / 45% | Mycelial Web (U) | 15 / 35% |
| **Rhizomorph Tunnel** (`rework`) | **25 / 48%** | Forward Spores (U) | 13 / 33% |
| Spore Exchange | 23 / 47% | Second Flush (U) | 12 / 22% |
| **Drift Stalk** (`rework`) | **20 / 41%** | Bloom Vigor, Mending Moss, Knitting Circle (U) | 9 / 19–28% |
| **Burster Pod** (`rework`) | **17 / 32%** | Spore Cloud, Mycorrhizal Link (R) | 9 / 23–26% |
| | | Rot-Eater (R) | 8 / 19% |
| | | Sporestorm Sigil, Martyr's Bloom, Elder's Patience (R) | 6 / 15–18% |

A starter building's row in the blueprint column counts only the commanders that don't start with it. The most common relic offers are the smallest effects (+8% unit HP, +20% capture, +15% building HP).

### 3.3 Blueprints

| Building | Cost · rarity | Core of | Build-defining? |
|---|---|---|---|
| Sporeling Burrow | 110 · C | V, C (starter) | **Yes:** mono Sporeling is the strongest swarm build (G3 83 / 86 under `rework`) |
| Capguard Hall | 150 · C | V, A (starter) | Line anchor; mono Capguard is the flyer answer |
| Gill Archer Nest | 150 · C | V; C (starter) | Pinned under `rework` (Gill Nest 51 / 54 in G3) |
| Rootbreaker Den | 200 · C | V, A | Siege |
| Puffball Mortar | 160 · C | V; A (starter) | Tower; F13 says under-ranged. Its shells can't hit flyers |
| Truffle Cellar | 150 · C | all (starter) | Economy |
| Scythecap Grove | 170 · U | C | Anti-swarm |
| Veilstalker Hollow | 160 · U | C | **Yes:** Slayer (G3 69 / 80 under `rework`) |
| Tender's Ring | 180 · U | C | Healer |
| Hammercap Forge | 170 · U | A | Anti-heavy |
| Amanita Lodge | 260 · R | shared | Heavy; strong on two-lane maps (step A, 64%) |
| Morel Warren | 130 · C | shared | Skirmisher |
| Rhizome Vault | 140 · U | A | +6 supply cap. Matters only if supply binds; under `rework` supply at 5:00 is 41–48 of 60 (backlog P2) |
| Spore Exchange | 160 · U | shared | Interest. Testers found interest confusing (F4, round 3) |
| Rhizomorph Tunnel (`rework`) | 160 · U | shared | Rhizomorphs deal 1–4% of their side's damage; it "carries nothing measured" (backlog P2) |
| Burster Pod (`rework`) | 130 · U | shared | Area answer to swarms (12–19% of a user's damage) |
| Drift Stalk (`rework`) | 160 · U | shared | **Yes:** mono Drift Stalk 72 / 90 in G3 under rule C |

**Blueprints are the real build decisions, but only a building that wins alone defines a build.** Mixing buildings has no synergy rules: §17 #11 rules out adjacency, and Mycorrhizal Link "doesn't register" (step A's placement spread).

### 3.4 Upgrade tracks: 42 levels, all numeric

| Effect | Levels |
|---|---|
| Unit HP, building HP or resist | 13 |
| Damage (plus Tender healing and Rootbreaker siege) | 11 |
| Range | 3 (Gill L1, Mortar L3, Tender L3) |
| Attack speed | 2 (Gill L3, Hammercap L3) |
| Splash | 2 (Mortar L1, Scythecap L3) |
| Move speed | 2 (Rootbreaker L2, Veilstalker L3) |
| +1 unit per spawn | 2 (Burrow L3, Morel L3): the biggest, +50% bodies |
| Spawn rate | 1 (Amanita L3) |
| Gold per tick | 3 (Cellar L1 and L3, Exchange L1) |
| Interest cap +10 | 1 (Exchange L3) |
| Supply cap +3 | 2 (Vault L2 and L3) |

- **No level changes what a unit does.** SPEC §11.6's "signature boost" at level 3 is a number in every case.
- The engagement review's recommendation 5 already asks for "signature level-3 upgrades" and "mutation" cards.
- **Bots won't show it, but human players** may treat most upgrade cards as filler: "+15% Sporeling damage" doesn't change a plan.

### 3.5 Relics, grouped

**A. Flat stat bumps (12):**

| Relic | Effect | Notes |
|---|---|---|
| Thick Caps | +15% building HP | |
| Hardy Spores | +8% unit HP | |
| Rot Ward | +25% turret damage | |
| Quick Roots | +20% capture | |
| Fruiting Season | +1 gold on economy buildings | |
| Root Stipend | +2 stipend | |
| Deep Cellars | +10 interest cap | |
| Mycelial Web | +6 supply | |
| Forward Spores | half the forward price | |
| Second Flush | 80% sell refund | |
| Sporestorm Sigil | −30% power cooldown | **Strong:** powers are the biggest single lever |
| Fresh Spores | first spawn instant | Probably diluted under waves, where spawns wait for the 20 s beat (unmeasured) |

**B. Conditional bumps that nudge a build (4):**
- Knitting Circle: merge speed and radius;
- Bloom Vigor: +15% damage for tier 2 and 3;
- Elder's Patience: Elders +25% HP and regeneration;
- Mycorrhizal Link: +13% spawn speed when touching 2+ buildings.

**C. Triggers, the cards that change rules (5):**
- Spore Tithe: +4 gold per merge;
- **Spore Cloud:** units burst on death;
- Rot-Eater: +1 gold per kill during the storm;
- **Martyr's Bloom:** a destroyed building bursts;
- Mending Moss: 2% repair each wave.

Only Spore Cloud and Martyr's Bloom visibly change what happens on the field.

**Could define a build** (the engines SPEC §11.7 intends):
- **merge economy:** Spore Tithe + Knitting Circle + Bloom Vigor + Elder's Patience, natural with Cordis;
- **death chains:** Spore Cloud plus a swarm (the *Bursting* strain it was meant to pair with is M6);
- **power build:** Sporestorm Sigil;
- **big army:** Mycelial Web + Rhizome Vault, if supply binds under `rework`.

But a build needs 2–4 specific cards, and each uncommon or rare is seen in 6–17% of runs. **The engines almost never come together.** A rule-changing relic is owned at the end of 17% of `rework` runs.

**Dead or near-dead today:**

| Relic | Why |
|---|---|
| **Mending Moss** | The run's Heartcap matters only after a Decision loss; 92% of battles start at full HP |
| **Forward Spores** | Forward building doesn't pay (F1, twice); placement spread says "don't build forward" |
| **Second Flush** | Selling is rare |
| **Mycorrhizal Link** | Doesn't register in placement spread (step A) |
| **Rot-Eater** | Pays only during the storm, +1 gold per kill |
| **Fresh Spores** | One spawn per building per battle |
| **Rot Ward** | Matters only while you're losing |

### 3.6 Events (`data/events.json`)

| Event | Choice | Real decision today? |
|---|---|---|
| Fallen Oak | Rare relic, −15% max HP · leave | **No:** HP is binary, so the cost is almost free. Take it |
| Spore Merchant | A non-starter blueprint → 2 upgrade levels of your choice · leave | **Yes:** breadth vs depth |
| Quiet Clearing | Repair 15% · +1 random upgrade | **No:** HP is nearly always full, so Forage wins |
| Mold Bloom | Storm 1:00 earlier and +150 gold next battle · decline | Mild. Testers took it without knowing what the storm is (round 3) |
| Burn the Notes | Halve the intel; −75 gold · leave | Weak: adaptation is worth only 4–11 points against the builds it should punish (backlog P2, G8) |
| Hungry Roots | Sacrifice a relic → 2 random relics a rarity lower · leave | **Yes**, a gamble |
| Amber Seep | +1 Amber, −100 gold next battle · leave | **A trap:** Amber buys nothing today |
| Twin Spores | Copy an owned upgrade level · a random common relic | Two small positives |

- **6 of 8 events have "nothing happens" as the alternative.**
- No event changes the route, the next general, a battle's rules or your kit's shape, apart from Merchant's trade. §18.2 Q6 ("relics and events that bend territory rules") was never acted on.
- A player meets 0–2 events per run: 0.23 a run on average, 0.8 in won runs.

### 3.7 Elites (`data/elites.json`) and the Grove

- **Elites:**
  - Fortified: Heartcap +30%;
  - Veteran: +1 upgrade level on every unit;
  - Swift: instant first spawns, likely diluted under waves.

  All three are stat modifiers. The reward is a relic-only pick (1 of 3), +10 rare on spoils, +15 Spores and a 25% chance of Amber, and the last two buy nothing (F11).
- **The Grove's repair option is dead** while the Heartcap is binary (§2).

---

## 4. Commanders and powers

Data: `data/commanders.json`; SPEC §11.10; `docs/m5-plan.md`.

| | Vesper | Armilla | Cordis |
|---|---|---|---|
| Starter | Burrow, Capguard, Cellar | Capguard, Cellar, Mortar | Burrow, Gill Nest, Cellar |
| Core (×2 in drafts) | the M1 roster | Capguard, Rootbreaker, Mortar, Cellar, Hammercap, Rhizome Vault (no swarm, no archers) | Burrow, Gill, Scythecap, Veilstalker, Tender, Cellar |
| Passive | Home buildings spawn 10% faster (invisible) | Capture +25% | Knit −50%, merge radius 2 |
| Power | Spore Burst: 90 crush in a 2-tile circle, aimed. Cooldown 75 s, first ready 0:45 | Rhizome Tithe: +30 gold per column held past home. Global, cooldown 75 s, first ready 1:00 | Puppet Bloom: every trio within 3 tiles merges at once, aimed. Cooldown 80 s, first ready 1:00 |
| What it changes in play | The one skill shot: hit the clump. Under waves the clumps are bigger | Push and cash in. A "press when ahead" button with no aim | Engineer merges mid-fight |
| M5 runs won (80 runs) | 28% | 21% | 19% |
| `rework` runs won | 33% | **10%** | **13%** |
| `rework` battle 1 lost | 36% | 54% | 63% |

### Do they make runs different?

**Partly.** The power is the biggest difference, and it matters a lot: on M5, battle-1 wins go from 30–58% with no power to 70–75% with one (m5-plan "Battle 1 alone"). The rest converges:
- **The shared pool is open to everyone.** Core weight ×2 against 8–11 shared buildings means a blueprint card is a core building only about 40% of the time once the starter is placed.
- **Bots end up with similar kits.** Kits at the end of `rework` runs:
  - Armilla's hold a Sporeling Burrow in 58 of 80 and a Gill Nest in 52;
  - Vesper's and Cordis's hold Capguard, Mortar and Rootbreaker in 58–80.
- **Passives are invisible percentages.**

### The rework pulls them apart

- **The spread in runs won is 23 points** (33 vs 10). The M5 tournament's bar was 15, and M5 passed at 10.
- **Cordis:** under waves almost everything merges anyway. Merges per battle are 90–119 with the package against 15–38 today (backlog P2 engagement table), so Puppet Bloom and the knit passive lose their point.
- **Armilla:** the Tithe pays per column held, and under waves the first flip comes 40 s to 3 min later. The backlog names both as hypotheses ("Why isn't measured").

**What's missing for commander identity** (all M6 in the SPEC):
- exclusive buildings (Velvet Shrine, Rootgate, Puppet Pod);
- alternate powers;
- a starter choice;
- exclusive relics;
- mastery.

---

## 5. Difficulty curve and pacing

| Evidence | Number | Source |
|---|---|---|
| Battle 1 lost (`rework`) | 51%: V 36 / A 54 / C 63% | this review |
| Battle 1 lost (M5) | 33–35% | this review; backlog step A, step B |
| Battle 1 by general (`rework`) | Old Mother Mold 81 of 120 lost (**68%**); the Lichen Baron 41 of 120 (34%) | this review |
| Battle 1 by general (M5, step B) | Mold 79 of 99 battle-1 losses (51% of Mold fights); Baron 14% | backlog step B |
| Battle 1 with `hotstart` | M5: 33 → 18%; `rework` + `bigdrafts`: 51 → 22% | step B; this review |
| Mold moved out of battle 1 (`appearsIn` [2, 3]) | With `hotstart`: battle 1 lost 6%, but battle 2 lost 37% | backlog step B |
| Boss fights won | M5 71%; `rework` **92%**; `rework,hotstart,bigdrafts` 96% | this review |
| Runs won | M5 23%; `rework` 18%; `+hotstart,bigdrafts` 40% | this review |
| Run Heartcap | 92% of battles start at full HP. 7 of 8 `rework` Armilla wins end at full HP | this review; `experiment --checks runs` line "7 at full Heartcap" |
| Winner's Heartcap in a battle | Untouched in 359 of 360 (M5) and 360 of 360 (`rework`) | backlog step A; P2 |
| Comebacks (won after own Heartcap fell to ⅔) | 0 in 360 (M5 and `rework`); 2 with `breach` | backlog step B, P2 |
| Loser's state when its Heartcap is first hit | About 1 building, 0 units; half the base lost ~35 s before | backlog step B |

**The curve is still upside down:**
- the first fight is the deadliest, and decided mostly by which of two generals you draw;
- the middle filters weak runs;
- the boss is a formality for any run that gets there.

**And no run is ever "nearly won":** you die early or you win. That removes the near-miss, which drives "one more run".

---

## 6. Meta-progression: code today vs SPEC §9 / M6

| System (SPEC) | In code today | Evidence |
|---|---|---|
| Profile save `spore-sprawl/profile/v1` (§9.7) | **None** | No such key; `.claude/rules/storage.md` lists only the run, battle, settings and tips keys |
| Spores, Amber, mastery XP (§9.1, §8.6) | **Counted per run, shown, then dropped** | `RunState.spores`, `.amber`, `.xp` (`runState.ts:112–114`); run-bar tooltips say "spent in the Underroot (Milestone 6)" (`run.ts:65–66`); the summary rolls them up |
| Feats (§9.2, 15+) | **None.** Some stats a feat would need exist | Summary row "none yet (Milestone 6)". `stats.maxEldersAlive`, `maxGoldBanked`, `columnsLost`, `buildingsSold` and `buildingsBuilt` exist (`src/sim/state.ts:630–661`); `economyBuildingsBuilt` doesn't. `tools/sim.ts:15` lists `--meta-progress` as NOT_YET |
| Unlock gating | **None:** everything is unlocked | Relic `unlockedBy` is defined but unused (`schema.ts:664`) |
| Strains (§9.3, §11.5) | **None** | `schema.ts:432` mentions "M6's Bursting strain" for `onDeath` |
| Colony traits and Root Capacity (§9.4) | **None, but most trait effects already exist as stats** | `side.draftCards`, `side.rerollCost`, `side.comebackEnabled`, `side.startingGold`, `side.heartcapMaxHp`, `side.knitTicks`, `side.captureSpeed`, `side.interestCap`, `side.loamBonus` (`schema.ts:37–42`) |
| Commander mastery (§9.5) | **None** | |
| Blights and Decay (§9.6, M7) | **None**; the summary hard-codes Decay 0 | `run.ts:603`. Several blights could be written in the effects language: opponent-side modifiers, `battle.sporestormStart`, `side.stipend` |
| Run history, records, best run | **None** | |
| Remembered Underroot choice | **None** | `main.ts:177` |

`docs/status.md` says M6–M8 content waits on P4, because it will be written for the combat model that's adopted.

---

## 7. Weak spots for "one more run", ranked

Each item gives the evidence, then what would change it and where.

### 1. Runs have no arc: sudden death in battle 1, binary Heartcap, and the rework makes it worse

**Evidence:**
- Under `rework`, 51% of runs lose battle 1, 48% end there, and the median run is about 1–2 battles. Armilla and Cordis lose battle 1 54% and 63% of the time.
- One rout loss ends the run (`rewards.ts:35`). Run HP is binary: 92% of battles start at full HP, and the Grove repairs 3 times in 81 visits.
- Battle 1 is a coin flip between Mold (68% lost) and the Baron (34%) (`route.ts:79–82`, `generals.json`).
- A lost run leaves nothing behind (item 3).

**What would change it:**
- **`hotstart`** (already built): battle 1 lost 51 → 22% with `bigdrafts`; 33 → 18% on M5. A data adoption: `balance.json` `hotStart`.
- **A lives rule** (a rule change; not built). A non-boss loss costs a share of max HP instead of the run.
  - **Where:** `battleRewards` in `src/run/rewards.ts`, with a new `balance.json` knob beside `decisionLossDamage`.
  - **Emulated at 40%:** reaching the boss goes 20 → 89%, battle time per run 13 → 26 min, and the Heartcap and Groves start to matter (49% of battles start hurt; 48% of Groves repair).
  - **It needs retuning against it.** Runs won jump to 70–90%. A harder boss and late game are needed, perhaps a 50% cost, or a lost battle also costing spoils (it already pays nothing).
  - The engagement review's recommendation 2, step B's conclusion ("a rout loss costs HP instead of the run") and rounds.md's run section all point here.
- **The battle-1 draw:** move Mold out of battle 1 (`generals.json` `appearsIn`), or make battle 1 a fixed, gentler general per commander.

### 2. Draft choices barely matter, and build-defining cards rarely appear

**Evidence:**
- Random drafting wins as many runs as greedy (41 vs 44 of 240).
- All 42 upgrade levels are numeric.
- 6% of offers hold a rule-changing relic; it's owned at the end of 17% of runs.
- Each rare relic is seen in 6–9% of runs; rarities are 76/20/4.
- The intended engines (§11.7) need 2–4 specific cards.
- Step B: "today's rare cards aren't much stronger than common ones."

**What would change it:**
- **A card content pass, written against whatever P4 adopts** (data, `data/relics.json`, `data/upgrades.json`):
  - "Mutation" cards from §11.5's strains. Teeming, Volley, Longshot and Battering are expressible today as modifier bundles on `building.spawnCount`, `spawnInterval`, `unit.damage`, `unit.range` and `unit.siegeMult`. Bursting can be a relic trigger: `on: unitDeath`, `if: { unit: "sporeling" }`, `explode`. The effects language supports both (`schema.ts:50–92`).
  - Signature level-3 upgrades that change behavior.
  - Wave hooks for relics under `rework` (`side.waveBeat`, `side.waveSize`, `schema.ts:40–41`).
  - Upgrade tracks for the three `rework` buildings.
- **Rarity and offers** (data, `balance.json` `draft.rarity`, `rarityShiftPerBattle`, `rarityBiasStep`):
  - `bigdrafts` (built) lifts rule-changing exposure from 33% to 59% of runs (with `hotstart`).
  - A "pick a card of this type" spoils, or a guaranteed rare on elite spoils, would put engines within reach.

### 3. Nothing carries between runs

**Evidence:**
- No profile key. Spores, Amber and XP are dropped.
- The summary hard-codes "Feats none yet" and "Decay 0", and says "Every run starts fresh" (`run.ts:602–608`).
- The Underroot forgets your choices (`main.ts:177`).
- No run history.

**What would change it:** a thin meta layer that doesn't depend on the combat model. This is new code: a profile under a new `storageKey()` key, which `.claude/rules/storage.md` requires.
- **Records:** runs won per commander, furthest row, best run.
- **Feats as goals first:** the condition language over existing stats (§9.2). They could unlock cosmetics or nothing at first, then content later.
- **Remember the last commander and bans.**
- **A Decay or blight ladder after the first boss win** (pulled forward from M7). Most §11.8 blights are opponent-side or battle modifiers.

Strains, traits and mastery content should wait for P4, as `docs/status.md` says. The engagement review warned that meta "multiplies a loop that isn't fun yet". So build the scaffolding and the goals before the power.

### 4. The ending isn't a climax, and winning leads nowhere

**Evidence:**
- Boss fights won: 92% under `rework`, 96% with `hotstart,bigdrafts`, 71% on M5.
- The boss is a bigger general (7 buildings, 4 levels, 3600 HP; `balance.json` `enemyKit`, `heartcapEnemyHp.boss`) with no mechanic of its own. Generals get no powers: §17 #13, D13.
- After a win: no Decay, no unlock, no next rung (§6).

**What would change it:**
- **A boss retune** (data, `balance.json` and `generals.json` `pale-sovereign`). The backlog already flags it: "once the early battles are gentler, the boss is the next problem."
- **A boss with a signature rule** within the honest-AI pillar, such as phases or a second Heartcap stage. That's a rule change.
- **Blights or Decay** as the next rung (item 3).

### 5. Commanders: different power, similar play, and a strength gap under `rework`

**Evidence:**
- `rework` runs won: V 33 / A 10 / C 13% (spread 23 points, against the bar of 15).
- Cordis's merging is diluted by waves, and Armilla's Tithe is starved by late first flips (hypotheses in backlog P2).
- Kits converge through the open shared pool. Passives are invisible.

**What would change it:**
- Retune powers and passives for waves if P4 adopts them (data, `commanders.json`; allowed per the M5 kickoff rules, with a changelog entry).
- Commander-specific cards in the pool: the exclusive relic or building from §9.5 pulled forward (data).
- A higher `draft.coreWeight`, or a core-only first spoils (data, `balance.json`).

### 6. Route and node choices are shallow, and elites aren't worth it

**Evidence:**
- Fully connected rows (F10).
- The optional battle is pure risk: always taking it and skipping elites gives 33 wins against 44.
- An elite costs about 10 points of run-ending risk (44% vs 34%) for one relic plus currencies that buy nothing (F11).
- The Grove always grafts while HP is full.

**What would change it:**
- **A route graph with real branches** and visible node rewards ("this battle's spoils: a rare relic"; "elite: choose any blueprint"): `route.ts` `generateRoute` and `rewards.ts`.
- **Elite rewards that matter now** (data or rewards table): a guaranteed rare, or two picks.
- **Item 1's lives rule**, which turns Grove repair, Quiet Clearing's rest, Mending Moss and Fallen Oak's cost into real trades.

### 7. Events are thin, and one is a trap

**Evidence:**
- 8 events, 0–2 met per run.
- 6 of 8 offer "nothing happens".
- Amber Seep costs 100 gold for a currency with no use.
- None bends battle rules (§18.2 Q6).

**What would change it** (data, `data/events.json`):
- More events.
- Events that change the next battle's rules, map or general.
- Rule-bending trades.
- Retire or rework Amber Seep until Amber has a use.

`RunEffect` grows one kind at a time (`src/data/schema.ts`).

### 8. Restart friction and the end screen

**Evidence:**
- To start again: Summary → New run → the Underroot (reset to Vesper, no bans) → Begin → route → battle → deploy.
- No "again" key, no "same seed" retry, no "next unlock" teaser. The summary is a results table.
- The one-more-run review called one-key restart "a quick UI win".

**What would change it** (UI only):
- Remember the last setup (`main.ts:177`).
- Add a "Run it back" button on the summary.
- Show progress toward goals on the summary (with item 3).

### 9. For the P3 playtest itself: the new pieces rarely come up

**Evidence:**
- Under `rework` the three new buildings are uncommon (`proto.ts`). Across commanders, they're offered in only 20% (Drift Stalk), 17% (Burster Pod) and 25% (Tunnel) of runs; Vesper alone: 28 / 23 / 38%.
- None has an upgrade track.
- A playtester may finish runs without meeting them.

**What would change it** (no code):
- Play with `?proto=rework,building.driftStalk.rarity:"common",building.bursterPod.rarity:"common",building.rhizomorphTunnel.rarity:"common"`. Measured for Vesper: exposure rises to 56 / 56 / 60% of runs, with runs won unchanged (31% vs 33%).
- Or ban 3 shared buildings in the Underroot.

---

## Suggested order, given P3 and P4

1. **During the P3 playtest, ask run-loop questions too:**
   - After a battle-1 loss, did you want to go again at once? Why or why not?
   - Did any card change how you played?
   - Did you take the row-2 battle or an elite, and why?
   - Did you ever repair at a Grove?
   - What did you expect Spores and Amber to do?
   - Did the boss feel like a finale?
   - Did your second commander feel different from your first?
   - Did you see a Drift Stalk, a Burster Pod or a Tunnel in a draft?
2. **With P4, adopt a "run arc" package, measured with `--checks runs --commander all --power-policy auto`:**
   - `hotstart,bigdrafts` (built);
   - a lives rule (new, small: `rewards.ts` and `balance.json`);
   - a boss and late-battle retune to bring runs won back into a target band, which the user would set (today there is none: bots aren't people).
3. **A card content pass**, written for the adopted combat model: mutation cards, signature upgrades, wave relics and fewer flat commons. Before M6's strains, or as their first version.
4. **A thin meta:** a profile, records, feats as goals, a remembered setup, one-key restart, then Decay and blights. Full M6 (traits, strains, mastery) after that.

---

## Appendix: reproducing

- **Scratch tools** (in [scripts/run-loop/](scripts/run-loop/)):
  - [`runstats.ts`](scripts/run-loop/runstats.ts) (arguments: `proto|- commander seeds greedy|random out.json [route] [lossHp]`);
  - [`analyze.mjs`](scripts/run-loop/analyze.mjs), [`analyze2.mjs`](scripts/run-loop/analyze2.mjs) and [`analyze3.mjs`](scripts/run-loop/analyze3.mjs);
  - raw output in `out/*.json` (raw output not kept).
- **Official cross-check:** `npm run experiment -- --proto rework --checks runs --commander armilla --power-policy auto --runs 80` gives 11 reach the boss, 8 win and 43 end in battle 1, identical to the script. The report is in `reports/experiments/runloop-check-armilla.json` (gitignored; raw output not kept).
- **Lives emulation:** in the script only, a non-boss rout loss is relabelled a Decision loss and the battle's Heartcap reset, so the run loses 40% of max HP and continues.
