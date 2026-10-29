# SPORE & SPRAWL — Game Specification (v1)

> Working title. A browser-based, single-player, lane-based tug-of-war auto-battler with roguelite runs and persistent meta-progression.
> Status: implementation spec, written from a design interview on 2026-10-24. This document is self-contained: an implementer needs nothing else.

---

## 0. How to read this document

| Sections | Contents |
|---|---|
| 1–3 | Pitch, pillars, theme, overall structure |
| 4–6 | Battle rules (map, territory, buildings, units, merging, economy, endings) |
| 7 | The enemy general (AI) |
| 8–9 | Run structure, then meta-progression |
| 10 | Controls, UI layout and feedback |
| 11 | Content tables with first-pass balance numbers |
| 12 | Balance method and targets |
| 13–14 | Technical architecture and data model |
| 15 | Testing and verification tooling |
| 16 | Milestone plan, with verification for every milestone |
| 17 | OUT OF SCOPE for v1 |
| 18 | Defaults chosen without asking, open questions, tuning knobs |

Conventions:

- **MUST / SHOULD / MAY** are normative.
- Every number in this spec is a *first-pass* value. Numbers live in data files (§14), never in code, and are tuned with the headless balance tools (§12, §15).
- Time in data files is written in **seconds**. The loader converts it to integer **ticks** (20 ticks per second). Distances are in **tiles**.
- "Player" means the human side (left, violet). "Enemy" or "general" means the AI side (right, gray). The rules are symmetric unless stated otherwise.

---

## 1. Pitch and pillars

**Pitch.** Beneath an old forest, two fungal colonies war over the soil. You place fruiting-body buildings on a tile grid. They automatically produce gold or spawn units, the units march down lanes and fight on their own, and you win a battle by destroying the enemy's Heartcap. The ground your army holds *is* your build space: push forward and your mycelial mat creeps over new tiles you can build on; lose ground and your forward buildings get torn down. Three identical units that meet away from the fighting knit into one stronger veteran. The enemy general reads what your buildings produce and counter-builds against it, with a vague warning a couple of waves ahead, and it keeps an intel file on you for the whole run. A run is a short campaign of battles in which you draft new buildings, upgrades and relics. Between runs you unlock new building strains, commanders, colony traits and blights.

**Pillars** (the tie-breakers for every design decision):

1. **Territory is build space.** Pushing is the only way to get more room, and room is always scarce.
2. **Three become one.** Merging is a visible, emergent, controllable event with a real tradeoff, not a free stat bonus.
3. **The general adapts and remembers.** No build survives a whole run on autopilot.
4. **Every run asks something new.** Maps, generals, drafts, strains and feats push you off your comfort build.
5. **Deterministic and testable.** The simulation is pure logic: same seed and same inputs give the same battle, in Node and in the browser.

### 1.1 Genre pitfalls and how this design counters them

| Pitfall | Countermeasures (section) |
|---|---|
| Runs get repetitive once you find a dominant build | Adaptive general with counter cycles (§7.4); shared intel file across battles (§7.6); campaign of different maps and generals (§8); random drafts with commander core plus bans (§8.4); strains and feats reward trying other builds (§9); blights (§9.6) |
| One cheap unit spammed beats everything | Supply cap with per-unit supply costs (§5.4); 3×3 damage/armor matrix plus Splash/Slayer/Siege tags (§5.3); general's Anti-Swarm doctrine (§7.4); value budget per supply (§11.4) |
| Hundreds of units tank the frame rate | Supply cap of 60 per side; merging removes entities; spatial hash plus staggered retargeting; 20 Hz sim with render interpolation; atlas rendering; a benchmark gate in every milestone (§13.7, §15) |
| *Introduced by this design:* territory snowball (forward build space removes the defender's natural advantage) | Four brakes: safe home zones, Heartcap defenses, supply-line cost, comeback income (§4.1, §4.5, §6.2, §6.3) |
| *Introduced by the brakes:* stalemates | Sporestorm escalation from 5:00 plus a time-limit Decision at 10:00 (§6.4–6.5) |

### 1.2 Interview decisions (record)

| Topic | Decision |
|---|---|
| Battle flow | Continuous real-time battle. Each building spawns on **its own timer**. A "wave" is a 60 s beat of the battle clock that drives drafts, interest, the Sporestorm and the general's counter cycles. |
| Run shape | Campaign of 4–5 short battles (~6–8 min each) on a branching route, ending at a boss general |
| Run length | 25–35 min |
| Theme | Fungal colonies: the Velvet Bloom (player) vs the Gray Rot (enemy) |
| Map shape | Lane count is a per-map property (1–3 lanes). Milestone 1 ships one wide lane. |
| Claiming ground | Column tug-of-war per lane: the column next to your border flips after 3 s of you out-muscling the enemy there (presence ≥ 1.5× theirs) |
| Overrun | Buildings are forts: a column can't flip while an enemy building stands in it. Siege units deal bonus damage to structures; damaged buildings spawn at half speed. |
| Snowball brakes | All four: safe home zones, Heartcap defenses, supply-line cost, comeback income |
| Merge rule | Out of combat, anywhere: 3 identical units within 1.5 tiles, none of which dealt or took damage in the last 2 s, knit for 1 s into one unit |
| Merge power | Sidegrade: ×2.5 HP and damage per tier, ⅔ the supply of its parts, a role perk; a per-building merge toggle. Tiers: base → Bloomed → Elder. |
| What the general reads | Your buildings' spawn mix (weighted by spawn rate and merge toggles) |
| Telegraph | Vague: you learn that a counter is coming and its broad kind (Anti-Swarm / Anti-Line / Anti-Armor / Anti-Elite), not the exact units, 2 waves ahead |
| Income | Heartcap stipend, gold buildings, rich-loam tiles, interest on savings, comeback income |
| Anti-spam | Supply cap plus the armor/damage matrix |
| Counters | 3×3 matrix (Slash/Pierce/Crush × Light/Medium/Heavy) plus Structure armor plus role tags |
| Stalemates | Sporestorm from 5:00 plus a Decision at 10:00 (more territory wins, reduced rewards) |
| Battle start | Fresh map each battle with a paused deploy phase; starting gold grows each battle; blueprints, upgrades and relics carry over |
| Enemy memory | Shared intel file: each new general opens against what you fielded last battle; the boss reads your whole run |
| Meta-progression | Building strains (Hades-aspect style), feat unlocks, a colony-trait loadout under a Root Capacity budget, and commander mastery |
| Draft pool | Commander core pool plus a shared unlocked pool; ban up to 3 buildings per run |
| Difficulty | Honest AI (same rules, no cheats) at one tuned baseline; a small set of blights after the first win; the full ladder later |
| Power curve | Rare broken runs are allowed but can't be forced every run |
| Battle info | Clean field, rich inspection: hit sparks tinted by effectiveness, callouts, a post-battle report with a front-line graph |
| Unit control | Per-lane **Hold / Advance** (adopted 2026-10-28, §5.2): units advance by default, and a held lane gathers at a rally line behind its border. The commander's one active power is the other timing tool. |
| Milestone 1 | Territory core only, one battle, scripted general |
| Art | Text-defined pixel sprites in data files, baked to a canvas atlas at startup |

---

## 2. Theme and naming

**Setting.** Under the roots of an ancient forest, the **Velvet Bloom**, a violet mycelial colony, fights the **Gray Rot**, an ashen gray-green colony, for living soil. Every battle is a new patch of forest. Your colony's heart, the **Heartcap**, survives from battle to battle because it travels on the wind as spores and regrows. That fiction is why Heartcap damage carries across a run (§8.5).

All names below are original to this project.

| Concept | In-game name | Code id style |
|---|---|---|
| Player faction | the Velvet Bloom (violet) | `velvet-bloom` |
| Enemy faction | the Gray Rot (ashen gray-green) | `gray-rot` |
| Base / keep | Heartcap | `heartcap` |
| Your territory | the mat (your mycelial mat) | `territory` |
| Rich soil tile | Rich Loam | `loam` |
| Merge tier 2 / tier 3 | Bloomed / Elder | tier `2` / `3` |
| Stalemate escalation | the Sporestorm | `sporestorm` |
| Time-limit result | Win/Loss by Decision | `decision` |
| Common / rare meta currency | Spores / Amber | `spores` / `amber` |
| Curse / curse points | Blight / Decay | `blight` / `decay` |
| Meta hub screen | the Underroot | `underroot` |
| Passive loadout / its budget | Colony Traits / Root Capacity | `trait` / `rootCapacity` |
| Building variant | Strain | `strain` |
| Achievement that unlocks content | Feat | `feat` |
| Player commanders (v1) | Vesper Velvetcap (starter), Armilla the Vast, Cordis the Puppeteer | `vesper`, `armilla`, `cordis` |
| Enemy generals (v1) | Old Mother Mold, the Lichen Baron, the Blightwright; boss: the Pale Sovereign | `mother-mold`, `lichen-baron`, `blightwright`, `pale-sovereign` |

The v1 unit and building roster is in §11.2–11.3.

**Palette direction.** Velvet Bloom: violet and lilac (#8a4fd8, #c9a2ff) with cream stalks. Gray Rot: ash, moss and bone (#7d8a7a, #b8c4a8). Soil: dark brown. Rich Loam: near-black with gold flecks. Both team colors MUST stay distinguishable under deuteranopia and protanopia simulation, which violet-vs-gray does; check it in M7.

---

## 3. Game structure (three nested loops)

```
META LOOP (persistent)                 RUN LOOP (25–35 min)                    BATTLE LOOP (~6–8 min, max 10)
the Underroot                          route map (6 rows)                       DEPLOY (paused, place opener)
 ├─ pick commander                       ├─ Battle / Elite / Event / Grove       LIVE  (waves of 60 s)
 ├─ equip traits (Root Capacity)         ├─ 4–5 battles total incl. boss          ├─ buildings spawn on own timers
 ├─ choose strains, ban ≤3 buildings     ├─ Heartcap HP carries over              ├─ drafts after waves 2/4/6/8 (paused)
 ├─ toggle blights (Decay)               └─ run ends: boss beaten or Heartcap 0   ├─ general counter cycles (M4+)
 └─ spend Spores/Amber, see feats                                                 └─ Sporestorm from 5:00
        ▲                                        │                              END: Heartcap destroyed or Decision at 10:00
        └──────── rewards: Spores, Amber, mastery XP, feats ◄─────────────────── report: front line over time, damage by building
```

**Moment to moment**, the player:

- places and sells buildings (allowed while paused),
- flips per-building merge toggles,
- fires the commander's active power (M5+),
- reads the general's telegraph and pivots,
- drafts a card at each draft point.

The player does **not** control units directly.

---

## 4. The battlefield

### 4.1 Map and grid

- A map is a grid of **W columns × H rows** of square tiles (16 px at native resolution).
- Rows are grouped into **lanes** separated by impassable one-row **root walls**. A map has 1–3 lanes. Units never leave the lane they spawned in.
- Columns are shared by all lanes, but **territory is tracked per lane** (each lane has its own front).
- The player's side is the left (column 0); the enemy's is the right (column W−1).
- Each side's **Heartcap** sits *off-grid* in a 2-tile strip behind its first column and spans every lane. Its attackable edge is x = 0 (player) or x = W (enemy). The rendered map is therefore W + 4 tiles wide.
- Tile kinds:

| Kind | Glyph | Buildable | Units walk on it | Notes |
|---|---|---|---|---|
| soil | `.` | yes | yes | |
| rich loam | `$` | yes | yes | Gold buildings with any footprint tile on loam yield +50% (§6.2) |
| stump | `o` | no | yes | Breaks up placement; decorative to units |
| root wall | `#` | no | no | Only between lanes and at map edges |

- **Home columns:** columns `[0, homeCols−1]` belong to the player and `[W−homeCols, W−1]` to the enemy, permanently. All other columns start **neutral**.
- Maps MUST be **point-symmetric** (tile (c, r) mirrors tile (W−1−c, H−1−r)), so neither side gets a positional advantage. A unit test enforces this.
- Scarcity target: a map's home zone should hold about half of the buildings a typical battle wants (about 4–6 of 10–14). `homeCols` is tuned per map.

**Milestone 1 map, "Bogwater Hollow":** 1 lane, W = 32, H = 8, homeCols = 4 (24 contested columns).

```
tens       0         1         2         3
ones       01234567890123456789012345678901
home       PPPP                        EEEE      (P = player home, E = enemy home)
row 0  [H] ..........$$....................  [H]
row 1  [H] ..........$$.o..................  [H]
row 2  [H] ........................o.......  [H]
row 3  [H] ...............$$...............  [H]
row 4  [H] ...............$$...............  [H]
row 5  [H] .......o........................  [H]
row 6  [H] ..................o.$$..........  [H]
row 7  [H] ....................$$..........  [H]
```

Each tile row above is exactly 32 characters. This is the same string format the map data file uses (§14.2).

### 4.2 Time model

- The sim runs a **fixed timestep of 20 ticks per second** (50 ms). Every gameplay timer is an integer tick count.
- **Battle phases:** `deploy` → `live` → `ended`.
  - `deploy`: the clock is stopped, and you place your opener with starting gold. It ends when the player presses *Begin*. The general places its opener at the same moment, using the same rules.
  - `live`: the clock runs from 0:00.
  - `ended`: the outcome is fixed and the report is shown.
- **Waves:** wave *n* covers clock time [(n−1)·60 s, n·60 s). Wave boundaries trigger interest (§6.2), drafts (§8.3), Sporestorm stacks (§6.4) and the general's counter cycle (§7.4).
- **Income tick:** every 5 s (100 ticks) of `live` time.
- **Speed:** 1×, 2× or 3× (the render loop runs 1, 2 or 3 sim ticks per 50 ms of real time).
- **Pause:** pause is a UI state, and the sim does not advance. Every player command (place, sell, merge toggle, power targeting) is allowed while paused and executes on the next tick. An open draft also holds the sim.

### 4.3 Territory: column tug-of-war

**State, per lane:** an owner for each column (`player` | `enemy` | `neutral`), plus two borders, `pBorder` and `eBorder`.

**Invariant:** the player owns exactly columns `[0, pBorder]`, the enemy owns exactly `[eBorder, W−1]`, and every column in between is neutral. Home columns never change owner.

**Frontier:** the only column a side can capture in a lane.

- Player frontier: `pBorder + 1`
- Enemy frontier: `eBorder − 1`

A frontier is invalid if it would be an opposing home column. When a single neutral column separates the sides, both frontiers are that same column.

**Presence:** `presence(side, column, lane)` is the sum of the **current supply** of that side's living units whose center x lies in `[column, column + 1)` in that lane. Supply is 1–3 for base units; Bloomed and Elder costs are in §5.6. So merged armies exert *less* presence per unit of power than swarms. This is an intended tradeoff: many bodies hold ground.

**Capture rule.** Every tick, for each lane and each side, with F = that side's frontier column:

1. **Forts.** If F contains any opposing building, there is no progress this tick. Apply decay (step 4) and stop.
2. Let A = the attacking side's presence in F, and D = the opposing side's presence in F (zero if nobody is there).
3. If `A > 0` and `A ≥ 1.5 × D`, then `progress += 100 × captureSpeed`. `captureSpeed` is 1.0 by default; modifiers adjust it, and the result is rounded down to an integer.
4. Otherwise `progress = max(0, progress − 200)`.
5. When `progress ≥ 6000` (3.0 s at base speed), F flips to the attacker:
   - Update the borders. If F was the opponent's border column, the opponent's border retreats by one.
   - Reset progress to 0.
   - Emit a `columnFlipped` event.

Progress is stored per (lane, side) together with the column it applies to. If the frontier column changes, its progress resets to 0.

**Consequences (intended):**

- **Contiguous fronts.** Territory is always one contiguous run from each home, so a front is a clean line per lane. The renderer may still draw it as creeping, organic mycelium.
- **No orphaned buildings.** You can only lose a column after every building of yours in it has been destroyed, so a building never sits on enemy ground. "Overrun" always means a fight that tears down your buildings.
- **Forward buildings anchor ground.** They also make the frontier unflippable for the enemy until they fall, which is why Siege units exist (§5.3).

**Placement legality:** every tile of the footprint must be:

- in a column you own (in that lane),
- buildable (soil or loam),
- unoccupied,
- inside a single lane.

### 4.4 Buildings

Common fields: footprint (all v1 buildings are 2×2; footprint is data-driven), max HP, armor (always `structure`), cost, and kind (`spawner` | `tower` | `economy` | `utility`).

- **Placing:** allowed in `deploy` and `live`, including while paused. The price is `cost × supplyLineMultiplier` (§6.3), rounded up and charged immediately. Buildings are active immediately.
- **Spawners:**
  - The first spawn happens `0.5 × spawnInterval` after placement; after that, one spawn every `spawnInterval`.
  - Each spawn creates `spawnCount` units of the building's unit type just in front of the building's front edge (+0.3 tiles toward the enemy). Spawn y is the building's center ± a seeded jitter of up to 0.4 tiles, clamped to the lane.
  - A spawn needs free supply for the whole batch (§5.5). If supply is short, the building **holds**: its timer stays full until the batch fits, and its status shows "Waiting for supply".
- **Towers** attack like stationary units (they never move) and are never slowed by being besieged.
- **Economy buildings** add gold on every income tick (§6.2).
- **Besieged:** a spawner or economy building that took damage in the last 2.0 s runs at **50% speed**:
  - its spawn timer advances at half rate (timers count in half-ticks internally), and
  - an income tick yields half its gold, rounded down.

  This keeps forward forts from pumping out units point-blank and is the tool against walls of buildings.
- **Merge toggle:** every spawner has one, default **on** (§5.6).
- **Selling:**
  - Allowed for your own buildings at any time, including while paused, **except while besieged**. This blocks selling a building just before it dies.
  - Refund: **100%** of the price paid during `deploy`, or within 10 s of placement **before the building has spawned units, earned gold, or fired a shot**; otherwise **60%**, rounded down (modified by refund relics). Once a live building has produced anything, the full-refund entitlement does not return even if its units die. This prevents free production through repeated placement and selling.
  - The tiles free up at once, and units the building already spawned stay on the field.
- **Destroyed:** the building is removed with no refund and emits an event. If it stood in your border column, that column becomes capturable again.

### 4.5 Heartcaps

| | Player Heartcap | Enemy Heartcap |
|---|---|---|
| Max HP | 3000. **Damage persists across the run** (§8.5). | 2000 + 250 × (battle index − 1); boss: 3600 |
| Armor | structure | structure |
| Turrets | 2 per lane, at the Heartcap edge at ⅓ and ⅔ of the lane height | same |
| Turret attack | Pierce, 18 damage every 1.0 s, range 7 tiles from the turret; targets the nearest enemy unit, then the nearest enemy building | same |

The Sporestorm weakens turrets and makes Heartcaps take more damage (§6.4). Heartcaps never spawn units.

With homeCols = 4, the turrets cover the home zone plus about 3 contested columns, so the last stretch of any push is a real siege.

---

## 5. Units and combat

### 5.1 Unit definition fields

| Field | Meaning |
|---|---|
| `hp` | Max HP at tier 1 (integer) |
| `armor` | `light` / `medium` / `heavy` |
| `damage`, `damageType` | Damage per hit at tier 1; `slash` / `pierce` / `crush` |
| `attackInterval` | Seconds between attacks |
| `range` | Edge-to-edge attack reach in tiles (melee ≈ 0.4–0.7) |
| `projectileSpeed` | Tiles/s; `0` means melee (the hit applies instantly) |
| `speed` | Tiles/s |
| `supply` | Supply used at tier 1 (1–3) |
| `aggroRange` | Edge distance in tiles at which the unit acquires targets |
| `radius` | Body radius in tiles (collision and range math) |
| `splashRadius` | Optional; tiles |
| `tags` | Subset of `siege`, `slayer`, `ranged`, `swarm`, `support` |
| `mergePerks` | Stat patches applied at tier 2 and at tier 3 (§5.6) |

### 5.2 Movement and targeting

- **Retargeting** happens on ticks where `(tick + unitId) % 5 === 0`, or immediately if the current target died.
- **Candidates:**
  - enemy units in the same lane within `aggroRange` (edge distance)
  - enemy buildings in the same lane within `aggroRange`
  - the enemy Heartcap edge, if within `aggroRange`
- **Choosing a target:**
  1. **Preferred class first:** `siege` units prefer buildings and the Heartcap; `slayer` units prefer tier-2+ units.
  2. Otherwise, the nearest by squared edge distance.
  3. Ties go to the lowest entity id.
- **Stickiness:** keep the current target while it lives and stays within `aggroRange × 1.25`, unless a candidate of the unit's preferred class appears.
- **Moving:**
  - With a target out of range: step toward it at `speed`.
  - With no target: advance along the lane (+x for the player, −x for the enemy) while drifting back toward the unit's spawn y at 0.3 tiles/s.
  - **Hold / Advance** (`laneStance`, adopted 2026-10-28 from the engagement review's E1):
    - **Holding:** a side can hold each lane. Idle units in a held lane gather at a rally line 1.5 tiles behind the front edge of the side's border column, and merge there. Units that dealt or took damage in the last 2 s fight as usual.
    - **Limits:** a hold lasts at most 30 s, then the lane advances on its own and can't hold again for 10 s.
    - **The AI musters:** every AI side holds a lane until 12 supply stands in it, then advances, and holds again once it drops below 4.
  - Units stop at the enemy Heartcap edge.
- **Separation:**
  - After moving, overlapping units (from either side) are pushed apart by half their overlap each, for at most 2 passes, using the spatial hash.
  - Positions are then clamped to the lane.
  - Units do **not** collide with buildings, stumps or the Heartcap strip. The renderer draws units above buildings.
- **No pathfinding.** Lanes are open fields, and avoiding a pathfinder is a deliberate performance and determinism choice.

### 5.3 Attacks and damage

**Attacking:** when `cooldown ≤ 0` and the target is in range, the unit attacks and `cooldown = attackInterval`.

- **Melee hits** apply on the same tick.
- **Ranged hits** are scheduled for `tick + ceil(distance / projectileSpeed × 20)`. They resolve against the original target if it's still alive, and are lost otherwise.
- **Splash attacks** always detonate: at the target's position at impact, or its last known position if it died.

**Damage formula** (rounded to an integer, minimum 1):

```
damage = baseDamage
       × tierMult(attacker)          // 1, 2.5, 6.25 for tiers 1, 2, 3
       × upgradeMult(attacker)       // from drafts, relics, traits, strains
       × MATRIX[damageType][armor]
       × tagMult                     // siege vs structure ×2.0; slayer vs tier ≥ 2 ×1.75
       × sporestormMult(attacker)    // units and towers: 1 + 0.10 × stacks
       × takenMult(target)           // Heartcaps: 1 + 0.10 × stacks; merge-perk resistances
```

**Damage/armor matrix:**

|  | Light | Medium | Heavy | Structure |
|---|---|---|---|---|
| **Slash** | 1.5 | 1.0 | 0.5 | 0.5 |
| **Pierce** | 1.0 | 1.5 | 0.75 | 0.5 |
| **Crush** | 0.75 | 0.75 | 1.5 | 1.5 |

Reading guide: Slash shreds swarms of Light units, Pierce breaks Medium line troops, and Crush cracks Heavy armor and structures.

**Splash:** the primary target takes full damage. Every *other* enemy unit or building within `splashRadius` of the impact point (in the same lane) takes 50%.

**Tags:**

| Tag | Effect |
|---|---|
| `siege` | ×2.0 vs structure; prefers buildings |
| `slayer` | ×1.75 vs Bloomed and Elder; prefers them |
| `ranged` | Informational, used by the general's analysis |
| `swarm` | Informational, used by the general's analysis |
| `support` | Marks healers (M3+) |

**Effectiveness class** (sent to the renderer for hit sparks):

- *strong:* combined multiplier ≥ 1.5
- *weak:* combined multiplier ≤ 0.75
- *normal:* everything else

**Combat timestamp:** a unit's `lastCombatTick` updates whenever it deals or takes damage. Merging uses it.

**Deaths** are processed after all hits resolve on a tick. Dead units free their supply immediately.

### 5.4 Supply

- Each side has a supply cap of **60** (data; relics and utility buildings may raise it).
- Used supply is the sum of current supply over living units, including units that are knitting.
- A spawn needs free supply for its whole batch (§4.4).
- The HUD shows used/cap and flags buildings that are holding.

### 5.5 Supply and presence of merged units

| Tier | Name | Stat multiplier vs tier 1 | Supply | Presence (§4.3) |
|---|---|---|---|---|
| 1 | base | ×1 | s | s |
| 2 | Bloomed | ×2.5 HP and damage | 2s (parts: 3s) | 2s |
| 3 | Elder | ×6.25 HP and damage | 4s (parts: 6s) | 4s |

Why ×2.5 is a fair sidegrade:

- One body keeps its full damage until it dies, while three bodies lose damage as each one falls (Lanchester). Under focused fire, a ×2.5 Bloomed deals about the same total damage as the three units it replaced, with about 17% less total HP.
- It takes one splash hit instead of three.
- It frees ⅓ of the supply, so a merged army at the supply cap is stronger.
- Its costs: it is vulnerable to `slayer` units, it fields fewer bodies to block melee, and it exerts **⅔ the presence**, so it claims ground more slowly.

### 5.6 Merging (Milestone 2)

**Eligibility.** A unit can merge if all of these hold:

- its tier is below 3,
- its `mergeOn` flag is set (copied from its building's toggle at spawn; toggling a building updates every living unit it spawned; units of destroyed buildings keep their last value),
- it hasn't dealt or taken damage in the last 40 ticks (2.0 s),
- it isn't already knitting.

**Detection** runs every 10 ticks, per side:

1. Walk the eligible units in id order.
2. For each unreserved unit `u`, find other eligible, unreserved units with the same `(unitId, tier)` within **1.5 tiles** (center distance).
3. If there are at least 2, take the two nearest (ties go to the lower id) and reserve all three.

**Knitting** lasts 20 ticks (1.0 s). The three units stop attacking and retargeting and walk toward their centroid. They can be attacked. If any of them takes damage or dies, the knit cancels and the survivors are released.

**Completion.** Remove the three units and spawn one at the centroid:

- the same `unitId`, at `tier + 1`
- max HP and damage per §5.5
- current HP = `round(newMaxHp × ΣcurrentHp / ΣmaxHp)` (no free heal)
- radius × 1.25 per tier; speed, range and attack interval unchanged
- the tier's `mergePerks` applied
- `sourceBuildingId` and `mergeOn` taken from the lowest-id parent
- `lastCombatTick` set to the latest of its parents' values, so an idle trio of Bloomed units can knit again right away

Merging always *reduces* supply, so it never waits on the cap.

**Perks** are small stat patches defined per unit in data (examples in §11.4). The allowed patch keys are:

- `hpMult`, `damageMult`, `speedMult`, `attackIntervalMult`
- `rangeAdd`, `splashRadius`
- `resist: { slash | pierce | crush: mult }`

**Feedback** (renderer only):

- faint tethers between candidate trios
- a glow while units knit
- a "Bloomed!" or "Elder!" pop
- tier insignia on the merged unit

### 5.7 Battle statistics

The sim records deterministic counters per side. Reports, feats and balance tools all read them.

- units spawned (by type)
- merges (by tier)
- damage dealt, attributed to buildings through `sourceBuildingId`
- damage taken by the Heartcap
- gold earned (by source)
- buildings built, lost and destroyed
- the maximum number of Elders alive at once
- the maximum gold banked
- columns owned per lane, sampled every second (this drives the front-line graph)

---

## 6. Economy, snowball brakes and endings

### 6.1 Gold

Gold is an integer per side. It does **not** carry between battles.

Starting gold for the deploy phase is `300 + 75 × (battleIndex − 1)`, the same for both sides. Traits and relics may modify it.

### 6.2 Income

**On every income tick** (every 5 s of `live` time), each side gains:

| Source | Amount per income tick |
|---|---|
| Heartcap stipend | 8 |
| Each economy building | its `goldPerTick` (Truffle Cellar: 4) × 1.5 if any footprint tile is loam, × 0.5 if besieged; floor after each multiplier |
| Comeback income | If the side owns fewer columns in total (summed over lanes) than its opponent: `min(6, floor(deficit / 2))` |

**On every wave boundary**, each side gains **interest** of `min(interestCap, floor(gold / 20))`. The base `interestCap` is 10.

Expected mid-battle income is roughly 200–280 gold per minute. The balance tools report the actual figure (§12).

### 6.3 Supply-line cost

```
depth      = (frontmost footprint column) − (homeCols − 1)    // mirrored for the enemy
multiplier = 1 + 0.05 × max(0, depth)
price      = ceil(cost × multiplier)
```

Example: a 2×2 building in columns 8–9 on Bogwater Hollow has depth 9 − 3 = 6 and costs ×1.30.

The price shows on the placement ghost before you click.

### 6.4 The Sporestorm (stalemate breaker)

At clock 5:00, 6:00, 7:00, 8:00 and 9:00 the storm gains one stack, up to a maximum of 5. Each stack:

- all units and towers deal **+10%** damage,
- Heartcap turrets deal **−10%** damage,
- Heartcaps take **+10%** damage.

The HUD shows the stack count, and the renderer adds a spore haze that thickens per stack.

### 6.5 How a battle ends

- **Rout:** a Heartcap reaches 0 HP and the battle ends at once; the other side wins. If both Heartcaps reach 0 on the same tick, the player loses.
- **Decision:** the clock reaches 10:00 with both Heartcaps standing. The winner is decided by these tiebreakers, in order:
  1. more columns owned (summed over lanes),
  2. higher Heartcap HP fraction,
  3. otherwise, the general wins.

| Outcome | Rewards (§8.6) | Player Heartcap afterwards |
|---|---|---|
| Win by Rout | full | repaired by 10% of max HP |
| Win by Decision | half | no repair |
| Loss by Decision | none | loses 25% of max HP; the run ends if it reaches 0 |
| Loss by Rout | none | 0, and the run ends |

Milestone 1 has a single battle, so it only shows the outcome type and the stats.

### 6.6 Commander power (Milestone 5)

- Each commander has exactly one active power, with a cooldown and an initial delay (the time of `live` play before its first use).
- A power targets a point, a lane or nothing (global).
- Activate it with `Q` or the HUD button, then click a target. Targeting works while paused, and the command executes on the next tick.
- Powers are ordinary deterministic commands (§14.5).
- Generals have no active power; each has a passive instead (§7.7).

---

## 7. The enemy general (AI)

### 7.1 An honest opponent

The general is a full participant in the sim and obeys every rule the player does:

- the same starting gold, income rules and prices (including supply-line cost),
- the same supply cap,
- the same territory, placement, merge and selling rules.

It acts **only** by issuing the same commands as the player (`place`, `sell`, `toggleMerge`; §14.5). A command it generates on tick *t* executes on tick *t + 1* and is written to the command log, exactly like a player command.

Where it differs:

- It has a personality **passive** and no active power (§7.7).
- Its building kit and upgrade levels grow with the battle index, like a player's drafted deck (§7.8).
- It draws all randomness from the `ai` RNG stream.

The same AI framework also drives the **strategy bots** used in headless testing on the player side: `script:balanced`, `script:rush`, `script:turtle`, `script:greedy` and `script:mono:<buildingId>`. Bots never adapt unless a flag enables it.

### 7.2 Decision loop

The general runs once at the end of `deploy` (its opener) and then every 20 ticks (1 s) of `live` time:

1. **Assess pressure per lane:** compare its own and the enemy's presence within 6 columns of its border.
2. **Apply a doctrine change** if one is due (§7.4).
3. **Pick a target purchase** (sticky until bought, or for 10 s):
   - Work through the opener list first.
   - After that, make a weighted pick (`ai` stream) from its kit using `doctrine weight × situational multipliers`:

     | Multiplier | Condition |
     |---|---|
     | economy × 1.5 | before 2:00 |
     | economy × 0.3 | after 6:00 |
     | towers × 2 | any lane under pressure |
     | counter weights | §7.4 |
4. **Place** the target as soon as it's affordable, at the best-scoring tile (§7.3).
5. **Merge toggles:** on by default. It switches off merging on its `swarm` buildings while the player's `slayer` spawn share is above 25%.
6. **Sell** only during a doctrine change, to free space (§7.4).

### 7.3 Placement heuristic

The candidates are every legal top-left position for the footprint in the general's own territory. Score each one:

| Building kind | Score |
|---|---|
| spawner | `+2 × depth − 6 × threat − 0.02 × surcharge` |
| economy | `+8 if on loam − 1 × depth − 10 × threat` |
| tower | `+5 if in the frontmost 2 owned columns of the most-pressured lane − 2 × threat` |

- `threat` = enemy presence within 4 tiles, plus 2 if the position is inside an enemy tower's range.
- On multi-lane maps, spawners go to the lane with the worst presence balance. Aggressive personalities (the Blightwright) instead pick the lane where the enemy holds the least territory.
- Add seeded noise of ±0.5 from the `ai` stream before tie-breaking. Ties then go to the lower column, then the lower row.

### 7.4 Counter cycle (Milestone 4)

**Schedule:**

| When | What happens |
|---|---|
| End of wave 2 (2:00) | Analysis 1; the warning appears immediately |
| 4:00 | Counter 1 activates |
| End of wave 5 (5:00) | Analysis 2; warning |
| 7:00 | Counter 2 activates |

The boss also gets an early cycle: analysis at 1:00, active at 3:00.

**Analysis: the player's spawn mix.**

1. For each standing player spawner `b`, compute its supply rate: `rate_b = spawnCount × unit.supply / spawnInterval`.
2. Turn the rates into shares of the total: Light, Medium and Heavy armor; ranged; and `eliteShare`.
3. `eliteShare` counts only real merging: `Σ rate_b × mergedFraction_b / Σ rate_b`, over buildings with merge on. `mergedFraction_b` is the fraction of `b`'s units spawned in the last 2 waves that were consumed by merges. A toggle left on by default therefore reads as no threat.
4. Score the four counter kinds:

| Kind | Score | Counter set (buildings in the general's roster whose unit has…) |
|---|---|---|
| **Anti-Swarm** | `lightShare × (1 − 0.5 × eliteShare)` | `splash`, or `slash` damage |
| **Anti-Line** | `mediumShare` | `pierce` damage |
| **Anti-Armor** | `heavyShare` | `crush` damage or `siege` |
| **Anti-Elite** | `1.2 × eliteShare` | `slayer` |

5. Add seeded noise of ±0.03 to each score and take the highest. Ties resolve in this order: Elite, Armor, Line, Swarm.

**Warning (vague telegraph):**

- The sim emits `counterWarned { kind, activatesAtTick }`.
- The UI shows the kind's icon and a countdown, never the exact units, for example: "The Lichen Baron is preparing to counter your **SWARM** — 2 waves."
- There is no fog of war. Once the counter is active, the player sees the general's new buildings appear.

**Activation:**

- The doctrine weights of buildings in the counter set are multiplied by **×3**, and all others by **×0.6**. That puts roughly 55–65% of new spending into counters: a strong lean, not a hard switch.
- If the general's kit has no building for that kind, it **drafts** the cheapest counter blueprint from its faction roster when the warning fires.
- If it has fewer than 2 free 2×2 slots, it sells up to 2 of its own non-besieged buildings whose units fare worst against the player's dominant armor (lowest matrix multiplier), preferring the rearmost.
- The doctrine stays until the next activation replaces it.

### 7.5 What the player sees

- **General's Intent panel** (top right): portrait, the active doctrine icon, and any pending warning with its countdown.
- **Callouts** when a warning fires and when a counter activates.
- **Post-battle report:** "Countered: Swarm (4:00) with Scythe-type buildings; Elite (7:00) with Slayers." The report names the units after the fact, so the player learns.

### 7.6 Intel file (memory across a run)

- **After each battle**, the run builds the player's profile for that battle: the average of the four kind scores at 2:00, at 5:00 and at the end of the battle.
- **Update:** `intel = 0.5 × intel + 0.5 × lastBattleProfile` (the first battle simply sets it).
- **Opening doctrine:** every new general starts the battle with a doctrine aimed at intel's top kind, at reduced intensity (×2 for the counter set, ×0.8 for everything else). The battle opens with the callout "The Gray Rot remembers your **SWARM**."
- **The boss** (the Pale Sovereign) uses the *unweighted* average of every battle in the run. It runs a **dual doctrine** against the top two kinds (×2.5 each) on top of its normal counter cycles.
- **Visibility:** the route map shows the player their own intel bars ("Gray Rot intel: Swarm ●●●○, Elite ●○○○ …"). It's your history, shown fairly, so you can plan a pivot before the boss.

### 7.7 Generals (v1)

| General | Personality and doctrine bias | Passive | Appears in |
|---|---|---|---|
| Old Mother Mold | Swarm, early aggression; heavy on `swarm` spawners | Her `swarm` buildings spawn 10% faster | battles 1–3 |
| The Lichen Baron | Defensive; towers and Heavy units | Her buildings have +20% HP | battles 1–4 |
| The Blightwright | Siege pushes with ranged support; aggressive lane choice | `siege` units +15% speed | battles 2–4 |
| **The Pale Sovereign** (boss) | Adaptive; dual doctrine from the whole run's intel; early counter cycle | Heartcap turrets +25% damage | final battle |

**Elite nodes** use a regular general plus one elite modifier drawn from `run` RNG:

| Modifier | Effect |
|---|---|
| *Fortified* | Heartcap +30% HP |
| *Veteran* | +1 upgrade level on all its units |
| *Swift* | Its buildings' first spawn is instant |

### 7.8 Enemy kit progression

| Battle | General's kit |
|---|---|
| Battle index *i* | Its opener buildings + (*i* − 1) extra blueprints from its preferred list; *i* − 1 random upgrade levels (`ai` stream) on units in its kit |
| Elite | +1 extra upgrade level |
| Boss | 7 buildings and 4 upgrade levels |

### 7.9 Milestone 1's scripted general

- No analysis, no counters, no intel.
- It plays the Velvet Bloom roster with the Gray Rot palette (a mirror match). The distinct Gray Rot roster arrives in M7.
- **Opener** (300 gold): Sporeling Burrow + Truffle Cellar.
- **Doctrine weights:**

| Building | Weight |
|---|---|
| Sporeling Burrow | 3 |
| Capguard Hall | 3 |
| Gill Archer Nest | 2 |
| Truffle Cellar | 2 (only while it owns fewer than 3) |
| Rootbreaker Den | 1 (only after 3:00) |
| Puffball Mortar | 1 (×2 when a lane is under pressure) |

- Placement follows §7.3. Merging doesn't exist yet in M1.

---

## 8. Run structure (Milestone 3+)

### 8.1 Run setup (in the Underroot)

1. **Pick a commander** (from those unlocked).
2. **Equip colony traits** within your Root Capacity (§9.4).
3. **Pick a strain** for each building that has unlocked alternates (§9.3).
4. **Ban up to 3 buildings** from the shared pool. Commander core buildings can't be banned.
5. **Toggle blights** (after your first boss win) to set the run's Decay (§9.6).
6. **The run seed** comes from `crypto.getRandomValues` at run start, outside the sim, and is recorded in the save. The `?seed=` debug parameter overrides it.

### 8.2 Route map

The route map has six rows. You pick one node per row, and every node connects to every node in the next row. It's a deliberately simple "choice per step" structure rather than a path graph.

| Row | Nodes offered |
|---|---|
| 1 | Battle |
| 2 | Battle, Event, Grove (one of each) |
| 3 | Battle, Elite |
| 4 | Two of {Event, Grove} (distinct, `route` stream) |
| 5 | Battle, Elite |
| 6 | Boss |

- **Battles per run:** 4 or 5, including the boss. With ~6–8 minute battles that matches the 25–35 minute target.
- **Battle nodes** show the map name and lane count, the general's portrait, and any elite modifier.
- **Assignment** (`route` stream):
  - Generals are drawn from those eligible for that battle index, with no repeats within a run.
  - Maps are drawn from the pool with no repeats until it's exhausted. v1 ships 4 maps (§11.9).
- **Intel bars** (§7.6) are shown on the route map.

### 8.3 Drafts during battles

**When:** a draft opens at the end of waves 2, 4, 6 and 8 while the battle is live. The sim holds while it's open, so a battle has up to 4 drafts. Battle 1 starts from the commander's 3-building starter kit.

**Each draft offers 3 cards.** There are three card types:

| Card type | Effect |
|---|---|
| **Blueprint** | Adds a building to your kit for the rest of the run |
| **Upgrade** | +1 level on a unit or building track you own (tracks in §11.6) |
| **Relic** | A run-long global passive (§11.7) |

**How offers are generated** (`draft` stream):

- **Type weights:** blueprint 35%, upgrade 45%, relic 20%. While your kit has fewer than 5 buildings, the blueprint weight is 50%. Empty categories are reweighted away.
- **Rarity** (common/uncommon/rare): 70/25/5 in battle 1, then each battle moves 3 points from common to rare. Spoils drafts after an elite get +10 rare.
- **Exclusions:** no duplicate cards within an offer, no blueprints you already own, no maxed upgrade tracks, no relics you already own. Upgrades are only offered for buildings in your kit.
- Commander core blueprints are weighted **×2** against shared-pool blueprints.

**Rerolls and skips (in-battle drafts):**

- A reroll costs 20 battle gold, plus 10 per extra reroll in the same draft.
- Skip a draft to take +40 gold instead.

**Determinism:** a pick is a command (`draftPick { cardId }`). Each offer is a pure function of (run seed, draft index, run state), so battles stay replayable.

### 8.4 Draft pool composition

- **Commander core:** 6 buildings per commander, always in the pool (minus those you already own). The 3 starter buildings come from the core.
- **Shared pool:** every unlocked building outside the core, minus your bans (at most 3).
- **Relic pool:** every unlocked relic.
- **Upgrades:** generated from the buildings in your kit.

### 8.5 Heartcap HP across a run

- The player's Heartcap has 3000 max HP (traits may change this), and its current HP carries from battle to battle.
- **Repairs:**
  - Win by Rout: +10% of max HP
  - Grove node: +30%
  - some events and relics
- Decision losses cost 25% of max HP (§6.5).
- **The run is lost** when the Heartcap reaches 0 or you lose the boss battle by any outcome.

### 8.6 Rewards

| Result | In-run reward | Spores | Other |
|---|---|---|---|
| Win by Rout | Spoils draft: choose 1 of 3 (+1 rarity bias, 1 free reroll) | 20 | |
| Win by Decision | Spoils draft of 2 cards | 10 | |
| Elite win (adds to the above) | A relic-only spoils pick (1 of 3) | +15 | 25% chance of +1 Amber |
| Boss win | — | 60 | +2 Amber |
| Loss | — | 0 for that battle | Earlier battles' Spores are kept |

- **At run end:** total Spores are multiplied by `(1 + 0.10 × Decay)`.
- **Commander mastery XP** = the Spores earned before that multiplier + 25 per battle won.
- **Feats** are checked at the end of every battle and at the end of the run (§9.2).

### 8.7 Non-battle nodes

- **Grove:** choose one:
  - repair the Heartcap by 30% of max HP, or
  - **graft** +1 level onto an upgrade track you own.
- **Event:** a data-driven text scene with 2–3 choices that carry tradeoffs. Outcomes use the `events` stream. v1 has 8 events:

| Event | Choice → effect |
|---|---|
| Fallen Oak | Take a random rare relic; Heartcap −15% max HP. *Or* leave. |
| Spore Merchant | Give up a non-starter blueprint → gain 2 upgrade levels of your choice. *Or* leave. |
| Quiet Clearing | Repair 15%. *Or* +1 level on a random upgrade track. |
| Mold Bloom | Next battle: the Sporestorm starts at 4:00 (both sides) and you get +150 starting gold. *Or* decline. |
| Burn the Notes | Halve the Gray Rot's intel on you; next battle starting gold −75. *Or* leave. |
| Hungry Roots | Sacrifice a relic → gain 2 random relics one rarity lower. *Or* leave. |
| Amber Seep | Gain 1 Amber (meta); next battle starting gold −100. *Or* leave. |
| Twin Spores | Copy one upgrade level you own (choose). *Or* take 1 random common relic. |

### 8.8 End of run

- **Victory:** you beat the boss. **Defeat:** your Heartcap reached 0, or you lost to the boss.
- **Summary screen:**
  - each battle's outcome, map and general
  - cards drafted
  - damage by building across the whole run
  - a per-battle front-line sparkline
  - Spores, Amber and XP earned; feats completed; Decay

### 8.9 Save and resume

- **Autosave** run state at every node boundary.
- **Mid-battle saves:** store the battle config, executed human command log, pending human command queue, phase, tick, last-step events and state hash at every wave boundary and on `visibilitychange`. Keep executed and pending commands separate: a draft can execute commands stamped tick T+1 while holding the clock at T.
- **Resume:**
  1. Re-simulate headlessly from tick 0, applying only executed input, including draft decisions on the held tick. Restore pending commands without executing them, and restore the last-step event boundary.
  2. Verify the state hash. Accept legacy checkpoints only if their replay matches; an incompatible checkpoint visibly restarts the current battle from deployment while preserving the run's progress.
  3. Continue play.

  A battle is at most 12,000 ticks, so replaying takes about a second.

- **Legacy event prompts:** if an old save offers a sacrifice that can no longer pay its full reward, return to the event choices before charging that cost. If an older version already charged the cost for an upgrade reward, offer the levels its remaining tracks can hold (or continue if none fit), with a visible shortfall notice and preserved run progress.

---

## 9. Meta-progression

Four systems, each with a single input, so they never become currency soup:

| System | Answers the question | Fed by | Introduced |
|---|---|---|---|
| **Feats** | *What* is unlocked (buildings, strains, commanders, relics, blights) | Doing specific things in play | M6 |
| **Colony traits + Root Capacity** | Your passive loadout this run (power plus sidegrades) | **Spores** (common) | M6 |
| **Strains + strain ranks** | *How* each building plays, plus a small power boost | Unlocked by feats or mastery; ranked with **Amber** (rare) | M6 |
| **Commander mastery** | Your progress with each commander | Mastery XP from runs | M6 |
| **Blights → Decay** | Opt-in difficulty; multiplies Spores | Unlocked by beating the boss | M7 |

Until Milestone 6 there is no gating: every implemented building and relic is in the pool, and every implemented commander is selectable.

### 9.1 Currencies

- **Spores** (common): earned every run (§8.6). They buy colony traits (one-time unlocks) and Root Capacity increases.
- **Amber** (rare): from boss and elite wins, some feats, and one event. It buys strain ranks.

### 9.2 Feats

Each feat is a data record: `id`, `name`, `description`, `scope` (`battle` or `run`), a `condition` over deterministic stats (§5.7, run stats), and a `reward` (unlock ids and/or Amber).

**Condition DSL:**

```json
{ "all": [ { "stat": "battle.won", "eq": true },
           { "stat": "battle.economyBuildingsBuilt", "eq": 0 } ] }
```

- Operators: `eq`, `gte`, `lte`.
- Combinators: `all`, `any`.
- Stat paths are whitelisted.

**v1 ships at least 15 feats**, for example:

| Feat | Condition | Unlocks |
|---|---|---|
| First Sprout | Win a battle | Scythecap Grove (shared pool) |
| Root and Branch | Win a battle on a 2-lane map | Hammercap Forge |
| Adapt | Win a battle in which both counter cycles fired | Veilstalker Hollow |
| Survivor | Win a battle with your Heartcap below 25% | Tender's Ring |
| Long March | Own 20+ columns in one lane at once | Commander **Armilla the Vast** |
| Elder Council | Have 3 Elders alive at once | Commander **Cordis the Puppeteer** |
| Lean Roots | Win a battle without building an economy building | Truffle Cellar strain *Wild Truffle* |
| Rich Soil | Have 4 economy buildings on loam at once | Truffle Cellar strain *Deep Truffle* |
| Unbroken Mat | Win a battle without ever losing a column | Capguard Hall strain *Ironcap* |
| Swarm Mind | Spawn 60 Sporelings in one battle | Sporeling Burrow strain *Teeming* |
| Siegebreaker | Rootbreakers deal ≥ 50% of the damage in a Rout of an enemy Heartcap | Rootbreaker Den strain *Battering* |
| Hoarder | Bank 300 gold at once | Relic *Deep Cellars* |
| Pivot | Win a battle after selling 3+ buildings in it | Relic *Second Flush* |
| Boss Down | Defeat the Pale Sovereign | Blights (Decay) + 2 Amber |
| Into the Rot | Win a run at Decay ≥ 3 | Relic *Rot-Eater* |

### 9.3 Strains (Hades-aspect style)

- Every building has a **base strain**, plus up to 2 **alternate strains** unlocked by feats or mastery.
- Before each run you choose one strain per building. The choice applies for the whole run.
- **A strain is a data patch** over the building and unit definitions, restricted to whitelisted fields (§14.2). Patches can change damage type, armor, spawn count, interval, merge behavior and similar fields, which makes them real sidegrades.
- **Strain ranks 1–3** cost 1/2/3 Amber. Each rank gives the building's units **+4% HP and +4% damage** unless the strain defines its own rank effect.
- **v1 content:** at least 2 alternate strains for each of 6 buildings (§11.5).

### 9.4 Colony traits and Root Capacity (Hades II Arcana style)

- **Traits** are passive modifiers. You unlock each one once with Spores, then equip a set per run whose total cost fits your **Root Capacity**. Each trait costs 0–3 capacity.
- **Root Capacity** starts at 3 and rises one step at a time to 12. The steps cost 60, 90, 120, … Spores (+30 per step; 1,620 Spores in total).
- **0-cost traits carry a drawback.** They're true sidegrades.
- **Power ceiling:** the balance harness measures a full 12-capacity loadout. It must raise the balanced bot's win rate by no more than 15 points (§12.3).
- **v1 content:** at least 12 traits (§11.7).

### 9.5 Commander mastery (Monster Train clan style)

- **XP per run:** see §8.6.
- **Cumulative XP for levels 2–10:** 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700.

| Level | Unlock (per commander) |
|---|---|
| 2 | Exclusive building joins this commander's core pool |
| 3 | Alternate active power (choose before a run; a sidegrade) |
| 4 | Starter choice: pick the 3rd starter building from 2 options |
| 5 | An alternate strain for one core building |
| 6 | Passive upgrade I |
| 7 | Exclusive relic joins the pool |
| 8 | A second alternate strain |
| 9 | Passive upgrade II |
| 10 | A commander-specific blight worth +2 Decay |

### 9.6 Blights and Decay (Milestone 7)

- Blights unlock after the first boss win (*Boss Down*).
- Before a run, toggle any blights, in ranks 1–2. Each rank adds Decay.
- **Reward:** Spores × `(1 + 0.10 × Decay)`.
- The best Decay won with each commander is recorded and shown in the Underroot.
- v1 ships 6 blights (§11.8). The full ladder comes after v1.

### 9.7 Profile save

- **Storage:** localStorage key `spore-sprawl/profile/v1`.
- **Contents:** `{ version, spores, amber, unlocks[], feats{}, traitsOwned[], rootCapacity, strainRanks{}, strainChoice{}, commanderXp{}, bestDecay{}, bans[], settings, runInProgress? }`
- **Versioning:** each schema version comes with a migration function.
- **Export/import:** a base64 JSON string on the Settings screen. There's no backend, so this is the backup.
- **Corruption handling:** a corrupt or unparseable save is copied to a backup key, then the player is asked whether to reset.

### 9.8 Pacing targets

- The first unlock (*First Sprout*) arrives within the first 1–2 runs.
- About 50% of v1 content is unlocked by ~15 runs, and 100% by ~35–45 runs (about 15–25 hours).
- Measured with the meta-progress simulation (§15.3).

---

## 10. Controls, UI layout and feedback

### 10.1 Platform and rendering surface

- **Supported:** desktop browsers (current Chromium, Firefox and Safari) with mouse and keyboard, at a minimum window size of 1280×720.
- **Battlefield canvas:**
  - It renders at native pixel resolution: `(W + 4) × 16` by `H × 16`. Bogwater Hollow is 576 × 128.
  - It's scaled by the **largest integer factor** that fits its area. If integer scaling would waste more than 30% of that area, it falls back to a fractional scale with `image-rendering: pixelated`.
- **HUD, menus and overlays** are **DOM** elements around and over the canvas. That keeps text crisp, makes the UI accessible, and lets Playwright query it.

### 10.2 Battle screen layout

```
┌─────────────────┬─────────────────────────────────────────┬───────────────────┬────────────────────┐
│ ♥ YOUR HEARTCAP │ (◆ 245 +212/min)  (⬢ 38/60 supply)      │ GRAY ROT HEART ♥  │ GENERAL'S INTENT   │
│   2710/3000     │ (⧗ Wave 4 3:42)  (☁ Storm 0)            │       1650/2000   │ ☻ Lichen Baron     │
│ ▓▓▓▓▓▓▓▓▓▓▓░░░  │ ▓▓▓▓▓▓▓▓▓▓▓▓|·:·:·:·:▒▒▒▒▒▒▒▒▒▒▒▒▒▒     │ ░░▒▒▒▒▒▒▒▒▒▒▒▒▒   │ Watching your army │
│                 │ 13 columns     territory    11 columns  │                   │ ⚠ SWARM ●● 2 waves │
├─────────────────┴─────────────────────────────────────────┴───────────────────┴────────────────────┤
│        [ callout lane: "Column 13 claimed" · pinned: deploy hint, "Paused" ]                       │
│                                                                                                    │
│                  BATTLEFIELD  (canvas, pixel-scaled, in its frame)                                 │
│                                                                                                    │
├────────────────┬──────────────────────────────────────────────────────────────┬────────────────────┤
│ (Q) POWER      │ ╭──────╮╭──────╮╭──────╮╭──────╮                             │ INSPECT            │
│ [Begin Enter]  │ │1  150││2  110││3  150││4  150│  …                          │ Capguard Hall      │
│ (1× 2× 3× ❚❚)  │ │ art  ││ art  ││ art  ││ art  │                             │ merge ON [M]       │
│ (▣|») Advancing│ │Cellar││Burrow││Capgd ││ Gill │                             │ sell 90 [X]        │
│ spk cog Help H │ ╰──────╯╰──────╯╰──────╯╰──────╯                             │                    │
└────────────────┴──────────────────────────────────────────────────────────────┴────────────────────┘
```

- **Top band** (docs/ui-ux-plan.md, Phase 1b): the win condition frames it.
  - **Your Heartcap** at the left end and **the Gray Rot's** at the right: the Heartcap's cap, its HP in the display face and a striped HP bar that drains toward the field's centre. Below a third of its HP, the number turns danger red.
  - Between them, **stat chips** (a pixel icon, a tabular display-face number and a small word): gold with its per-minute rate, supply used/cap, wave number and clock, and Sporestorm stacks (lit lilac once the storm is on). The gold chip pulses whenever income lands.
  - Under the chips, the **territory tug**: one bar per lane, a tick per column, your columns striped violet from the left, theirs striped ash from the right, unclaimed columns between, and a glowing lilac line at your frontier. Column counts sit under its ends.
  - The **General's Intent** panel at the top right: the general's portrait at 3× (48 px), name and doctrine. When a counter is coming, a warning row names the kind and counts down in waves, with one lit pip per wave that pulses (still under `prefers-reduced-motion`).
- **Callout lane:** transient banners centered above the battlefield. At most 3 show at once, each for 2.5 s (tips 6 s), in priority order: counter warnings > building lost > Heartcap under attack > tips > column flipped > merges.
  - **Battle-1 economy tip** (playtest 2026-10-28): in battle 1 only, if the player has no economy building built, queued or being placed 30 s after Begin, a tip names the first economy card and its hotkey, and the economy cards pulse for 12 s or until one is placed. It fires at most once.
  - **Pinned callouts** come before the timed ones and stay until they no longer apply: the deploy hint, "Paused" while a live battle is paused, and a notice when a saved battle couldn't be restored. Nothing else sits on the field.
- **Field frame** (docs/ui-ux-plan.md, Phase 1a): the void between the bands, above, below and beside the battlefield, is drawn as the earth the field sits in.
  - What it shows: a roots ceiling, a soil bed with each side's buried threads (lilac under your half, ash under theirs), roots down each side, and each Heartcap's crown rising into the ceiling.
  - How it's drawn: text sprites from `data/sprites/frame.json`, baked onto a canvas behind the field and the bands at the field's own pixel scale, with its pixels lined up with the field's. It stays darker than the field and takes no input.
  - **Ambient spores** drift across it, thicker with each Sporestorm stack. They move at the game's speed, stop while the battle is paused, held or over, and hold still under `prefers-reduced-motion` and `?test=1`.
- **Bottom band:**
  - **Controls** (left): the commander power; **Begin** in deploy, then one segmented control for 1×, 2×, 3× and pause; a **Hold / Advance** switch per lane (the `i-hold` and `i-advance` icons, the lit one is the lane's stance) with its state and timer beside it ("Advancing", "Hold · 25 s", "Hold in 12 s"; a hold on cooldown is unlit); then the speaker (§13.9), the **settings** cog and Help. The settings popover holds the damage-numbers choice (§10.4) until the settings screen arrives (§10.5).
  - **The building tray** (centre): cards are grouped by role, economy first, then army, defense and utility, each group in kit order; the `1`–`9` hotkeys follow this order.
    - Each card has a cap-shaped band across its top in its role's colour, its hotkey, its base price as a gold chip, the building at 2× (64 px), its name, a role tag (Economy, Army, Defense, Utility) and a one-line summary (at most two lines).
    - A card you can't afford is **unlit**: the sprite desaturates, the price turns danger red, and the summary becomes a bar filling toward the price and "need N". The name stays readable; nothing fades.
    - Cards keep a card's width (88–108 px) however few there are. When they don't fit one row (14 cards at 1280 px), the tray turns **compact**: two rows of smaller cards with the sprite at 1× beside the hotkey and price, then the name, the role and the summary. The tray never clips a card or scrolls sideways.
    - Hovering a card, or focusing it from the keyboard, shows a tooltip with the description, output, unit stats, matchups (strong vs, weak vs, armor), merge perks and, for economy, the payback time. Stats come from the compiled side, so upgrades and relics show.
  - **The inspect panel** (right). Empty, it shows a short tip; the hotkeys live in Help.
- **Deploy phase:** the same layout. **Begin** is the bottom band's one primary button, and the deploy hint with the starting gold is pinned in the callout lane, so the field stays clear for placing. The general's opener appears when you press Begin, so both sides place blind.
- **Placing:** while a building is chosen, every tile of your mat where it could go gets a soft lilac grid (gold isn't considered; a hover you can't afford still says so). The ghost's tip sits beside its footprint inside the field, flipping to the left near the right edge, so it never covers the ghost, a band or the callout lane.
- **Draft overlay:** the battlefield dims, and three large cards show type, rarity, effect text and an "owned: X" context line. Reroll shows its cost; Skip shows "+40 gold".

### 10.3 Controls

| Input | Action |
|---|---|
| `1`–`9` or click a tray card | Choose a building to place |
| Mouse move (placing) | Your legal tiles show a lilac grid. The ghost snaps to the grid and shows legality (with a reason when illegal), the final price including surcharge, depth and the loam bonus |
| Left click (placing) | Place. Hold `Shift` to keep placing the same building. |
| Right click / `Esc` | Cancel placement, or deselect |
| Left click a building or unit | Inspect it |
| `M` | Toggle merging on the selected building |
| `X` / `Delete` | Sell the selected building (the first press shows the refund; the second confirms) |
| `Q`, then click | Use the commander power (Milestone 5+) |
| `Space` | Pause or resume (every command still works while paused) |
| `]` / `[` | Speed up or down (1× / 2× / 3×) |
| `Tab` | Cycle through your buildings |
| `F`, or a lane's Hold / Advance switch | Hold every lane, or advance them all; the switch sets one lane (§5.2) |
| `H` | Help overlay: matrix chart, tags, hotkeys |
| `S`, or the speaker button | Sound on or off, anywhere in the game. Hovering or focusing the speaker opens the volume sliders (§13.9) |
| `F3` | Debug overlay (only with `?debug=1`): column presence numbers, capture progress, aggro radii, ids |

### 10.4 Feedback rules (clean field, rich inspection)

- **Damage numbers:** none by default. The setting offers *off*, *big hits only* (30 or more) and *all*. It lives on the settings screen (§10.5), which the cog in the battle's bottom band opens, and is saved with the other settings.
- **HP bars:** shown only on damaged units and buildings; always shown on Heartcaps.
- **Hit sparks** come in three tints by effectiveness class (§5.3):
  - *strong:* a large, bright gold spark
  - *normal:* a small white spark
  - *weak:* a small, dull gray spark

  This is how players learn the matrix without numbers.
- **Merging:** faint tethers between candidate trios, a glow while units knit, a pop label, and tier pips (one for Bloomed, two for Elder) plus a slightly larger sprite.
- **Territory:**
  - Owned columns are tinted with the owner's mycelium texture.
  - The frontier fills with creeping hyphae in proportion to capture progress, with a thin bar at the top of the lane.
  - A column that can't flip because of a fort shows a small shield glyph.
- **Building status glyphs:** besieged (½ speed: a flicker and "½"), holding for supply ("⬢!"), and merge off (a crossed knot).
- **Inspect panel:**
  - *Units:* tier, HP, damage type and armor with matrix hints ("strong vs Light · weak vs Heavy"), live DPS over the last 5 s, kills.
  - *Buildings:* spawn timer, living units, damage dealt, gold produced, merge toggle, sell value.
- **Post-battle report:**
  - the outcome and how it was decided
  - the **front-line graph:** columns owned over time, one band per lane
  - damage by building (a bar list)
  - units spawned and merged
  - gold by source
  - the general's counters with timestamps and the buildings used
- **Puffs:** a unit's spawn and death are puffs of spores, the one particle: a few spore-white motes, 1–2 px, that drift up and fade (spawn 320 ms, death 420 ms). The Sporestorm's specks on the field are spore-white too.
- **Accessibility:**
  - Anything shown by color is also shown by an icon or shape.
  - Pause is always available.
  - Text is at least 12 CSS px.
  - Screen shake is off by default. Turned on, it is a restrained jolt of the field when a Heartcap is hit: up to 3 screen px by damage, 180 ms, at most once every 1.5 s per Heartcap, and never under reduced motion.
  - **Reduced motion** follows the device's setting unless the player turns it on or off. It drops the screen wipe, drift, tilt, lift, roll-ups and shake, and keeps fades at 120 ms or less.
  - **Color-blind assist** (off by default): a team mark under every unit, a light lilac ring for the Velvet Bloom and a dark bar with pale dashes for the Gray Rot, so the sides differ in shape and lightness as well as hue; brighter wandering strands on the Bloom's mat and dark ash tufts on the Rot's; and a leaning hatch on the Rot's half of the territory bar.

### 10.5 Screens

- Title
- The Underroot (tabs: Commanders, Traits, Strains, Feats, Blights, Settings)
- Run setup
- Route map
- Battle, with the draft overlay
- Battle report
- Run summary
- Settings: sound, damage numbers, default speed, screen shake, UI scale, reduced motion, color-blind assist (save export/import and a profile reset arrive with the profile in M6)

Milestone 1 needs only Battle (with deploy) and a simple end screen.

**Run screens as built (docs/ui-ux-plan.md, Phase 2).** Every run screen is DOM (so Playwright can query it), with spores drifting behind it, the run bar on top and a footer with the seed.
- **Title** (the page with no `scene`): "Spore & Sprawl" in the display face beside the Heartcap's silhouette, lit from below. Continue (only with a saved run, and naming its row and Heartcap), New run (after a confirm if a run is saved), How to play (Help) and Settings (the settings screen). The run's route and summary have a Title button back. It becomes the door to the Underroot in M6.
- **Run bar:** the Heartcap's HP and bar, Spores and Amber with their icons, battles won, the kit and the relics, then the speaker and the settings cog. Each relic is a pixel badge whose shape and rim name its rarity (round, diamond, star), with a tooltip on hover or focus.
- **Route map:** spore pods on soil, one icon per node kind, joined by hyphae from every node to every node in the next row (and from the colony's start to the first row). The path you walked glows violet, the threads you can take now glow lilac, the rest stay dim, and hovering or focusing a pod lights its threads. A legend names the node kinds.
- **Draft and spoils cards:** a frame per rarity (common bark, uncommon teal-lit, rare amber-lit with a spore sparkle), each keeping its word; the type's icon in the header; a blueprint's price, output and role as chips; `1`–`3` as keycaps (the keys pick on spoils too). Cards deal in left to right, and on hover lift and lean a little toward the pointer (at most 3° and 4°). The in-battle draft opens with a burst of spores rising behind the cards.
- **Event and Grove:** a framed scene at 4× per event (`v-<event id>`) and for the Grove, the story on stalk cream, and the choices as cards with outcome chips (gains, costs with a real minus, gold, notes), each with a word and usually an icon. Number keys pick a choice.
- **Battle report and run summary:** an outcome banner (on a win the Heartcap blooms in lilac spores, on a loss the cap wilts to ash) with the MVP building beside it, then a staged reveal: the banner, the front line, then the bars. Every table stays. The report's banner names what the battle earned: gold, and in a run its Spores and any Amber (an elite's Amber is shown as a chance, since it is rolled on Continue). Rewards roll up from 0 (600 ms, ease-out, then one bump): the report's gold and gold bars, and the summary's Spores, Amber and Commander XP.
- **Help:** four tabs (Matrix · Merging · The general · Keys), each fitting 1280×720; keys are drawn as keycaps.
- **Motion:** things grow in (from 0.96, ease-out) and nothing bounces more than once. Every screen change (title, route, spoils, event, Grove, battle, report, summary) is a spore-burst wipe of 360 ms: a veil of the void rises over the old screen on a band of spore-white motes (150 ms, ease-in), the screen swaps, and the veil lifts off the new one from the bottom up (210 ms, ease-out). Clicks and keys wait while it runs; the page's first screen appears at once. Under reduced motion (§10.4) there's no wipe, stagger, lift, tilt, sparkle, roll-up or drift, and fades take 120 ms or less. `?test=1` holds every screen still and makes every change instant.

**Settings screen as built (docs/ui-ux-plan.md, Phase 3).** An overlay sheet that opens from the title's Settings button, the battle's cog (the battle pauses while it is open, and the sheet says so) and the run bar's cog. Esc, Close or a press on the scrim closes it; while it is open, keys reach nothing behind it (except `S`, which still mutes) and Tab stays inside. The speakers keep their quick mute. Two columns:
- **Sound:** mute, and master, effects and ambience volume (§13.9).
- **Battle:** damage numbers (off, big hits, all), default speed (1×, 2×, 3×: each battle runs at it once it begins) and screen shake (off or on).
- **Display and motion:** UI scale (auto, or 125%, 150%, 175% or 200% for big screens; a step never lays the page out below 1280×720, so a window too small for it gets the largest scale that fits), reduced motion (system, on, off) and color-blind assist (off, on), with a live preview under it: a strip of field at 3× with two units a side and a territory bar, drawn the way the field draws them, so turning the assist on shows its marks at once.

Every change saves at once into the one settings record, `spore-sprawl/settings/v1` (through `storageKey()`, so the dev site keeps its own); a record saved before a field existed loads with that field's default, and a value the game doesn't know falls back to the default.

---

## 11. Content and first-pass numbers

Everything in this section lives in data files (§14.2). The **M** column gives the milestone that first needs each item.

### 11.1 Global constants (`data/balance.json`)

| Key | Value | Key | Value |
|---|---|---|---|
| `tickRate` | 20 | `captureSeconds` | 3.0 |
| `waveSeconds` | 60 | `captureRatio` | 1.5 |
| `incomeTickSeconds` | 5 | `captureDecayMult` | 2 |
| `stipendPerTick` | 8 | `mergeRadius` | 1.5 |
| `startingGold` / `perBattle` | 300 / +75 | `mergeCombatCooldownSeconds` | 2.0 |
| `supplyCap` | 60 | `mergeKnitSeconds` | 1.0 |
| `interestPer` / `interestCap` | 20 / 10 | `mergeCheckEveryTicks` | 10 |
| `comebackDivisor` / `comebackMax` | 2 / 6 | `tierStatMult` | 2.5 |
| `supplyLinePerColumn` | 0.05 | `tierSupplyMult` | [1, 2, 4] |
| `sellRefund` / `fullRefundSeconds` | 0.6 / 10 | `retargetEveryTicks` / `leashMult` | 5 / 1.25 |
| `besiegedSeconds` / `besiegedRate` | 2.0 / 0.5 | `splashFalloff` | 0.5 |
| `firstSpawnFraction` | 0.5 | `sporestormStartSeconds` / `maxStacks` | 300 / 5 |
| `timeLimitSeconds` | 600 | `sporestorm` per stack: unit dmg / turret dmg / Heartcap taken | +0.10 / −0.10 / +0.10 |
| `heartcapPlayerHp` | 3000 | `heartcapEnemyHp` base / per battle / boss | 2000 / +250 / 3600 |
| `turret` | 2 per lane, 18 pierce, 1.0 s, range 7 | `routRepair` / `decisionLossDamage` / `groveRepair` | 0.10 / 0.25 / 0.30 |
| `draftWaves` | [2, 4, 6, 8] | `reroll` base / step, `skipGold` | 20 / 10, 40 |

### 11.2 Velvet Bloom buildings

All buildings have a 2×2 footprint and Structure armor.

| M | id | Name | Kind | Cost | HP | Output |
|---|---|---|---|---|---|---|
| 1 | `sporelingBurrow` | Sporeling Burrow | spawner | 110 | 450 | 2 × Sporeling / 16 s |
| 1 | `capguardHall` | Capguard Hall | spawner | 150 | 600 | 1 × Capguard / 15 s |
| 1 | `gillNest` | Gill Archer Nest | spawner | 150 | 450 | 1 × Gill Archer / 15 s |
| 1 | `rootbreakerDen` | Rootbreaker Den | spawner | 200 | 650 | 1 × Rootbreaker / 24 s |
| 1 | `puffballMortar` | Puffball Mortar | tower | 160 | 500 | Crush 24 / 3.0 s, range 6, min range 1.5, splash 1.0 |
| 1 | `truffleCellar` | Truffle Cellar | economy | 150 | 400 | +4 gold per income tick |
| 2 | `scythecapGrove` | Scythecap Grove | spawner | 170 | 550 | 1 × Scythecap / 18 s |
| 4 | `hammercapForge` | Hammercap Forge | spawner | 170 | 600 | 1 × Hammercap / 17 s |
| 2 | `veilstalkerHollow` | Veilstalker Hollow | spawner | 160 | 450 | 1 × Veilstalker / 16 s |
| 3 | `tendersRing` | Tender's Ring | spawner | 180 | 450 | 1 × Tender / 20 s |
| 4 | `amanitaLodge` | Amanita Lodge | spawner | 260 | 750 | 1 × Amanita Knight / 30 s |
| 4 | `morelWarren` | Morel Warren | spawner | 130 | 450 | 2 × Morel Runner / 18 s |
| 4 | `rhizomeVault` | Rhizome Vault | utility | 140 | 500 | +6 supply cap (at most 2 vaults count) |
| 4 | `sporeExchange` | Spore Exchange | economy | 160 | 400 | +1 gold per income tick; interest cap +10 |
| 6 | `velvetShrine` | Velvet Shrine (Vesper, mastery 2) | utility | 150 | 500 | Units spawned by buildings within 2 tiles deal +10% damage |
| 6 | `rootgate` | Rootgate (Armilla, mastery 2) | utility | 140 | 1200 | No attack; your capture progress in this lane is +50% while it stands |
| 6 | `puppetPod` | Puppet Pod (Cordis, mastery 2) | spawner | 150 | 450 | 3 × Sporeling / 24 s; merge forced on; knit time −50% |

### 11.3 Velvet Bloom units

`dmg/int` is damage per hit / seconds between attacks. `rng` is range, `proj` is projectile speed (0 = melee), `spd` is speed, `sup` is supply, `aggro` is aggro range, `rad` is radius.

| M | id | Name | HP | Armor | Dmg / int | Type | Rng | Proj | Spd | Sup | Aggro | Rad | Tags / notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `sporeling` | Sporeling | 60 | light | 7 / 0.8 | slash | 0.4 | 0 | 1.3 | 1 | 4 | 0.25 | swarm |
| 1 | `capguard` | Capguard | 220 | medium | 14 / 1.0 | slash | 0.5 | 0 | 0.9 | 2 | 4 | 0.35 | |
| 1 | `gillArcher` | Gill Archer | 90 | light | 14 / 1.2 | pierce | 5.0 | 8 | 1.0 | 2 | 6 | 0.25 | ranged |
| 1 | `rootbreaker` | Rootbreaker | 520 | medium | 30 / 2.0 | crush | 0.6 | 0 | 0.6 | 3 | 4 | 0.45 | siege; a ram, not a tank (Medium armor, so Pierce counters it) |
| 2 | `scythecap` | Scythecap | 200 | medium | 16 / 1.3 | slash | 0.6 | 0 | 0.9 | 2 | 4 | 0.35 | cleave: splash 0.8 |
| 4 | `hammercap` | Hammercap | 240 | medium | 22 / 1.4 | crush | 0.5 | 0 | 0.85 | 2 | 4 | 0.35 | anti-Heavy |
| 2 | `veilstalker` | Veilstalker | 110 | light | 18 / 1.1 | pierce | 0.5 | 0 | 1.4 | 1 | 5 | 0.25 | slayer |
| 3 | `tender` | Tender | 90 | light | heals 8 HP / 1.0 | — | 2.5 | — | 1.0 | 1 | 4 | 0.25 | support: heals the most-damaged ally unit in range (ties → id) |
| 4 | `amanitaKnight` | Amanita Knight | 700 | heavy | 34 / 1.4 | slash | 0.6 | 0 | 0.75 | 3 | 4 | 0.45 | |
| 4 | `morelRunner` | Morel Runner | 80 | medium | 9 / 0.9 | pierce | 0.4 | 0 | 1.8 | 1 | 4 | 0.25 | swarm |

**Merge perks** (applied at tier 2 / tier 3, on top of ×2.5 per tier):

| Unit | Bloomed (tier 2) | Elder (tier 3) |
|---|---|---|
| Sporeling | speed ×1.15 | cleave: splash 0.6 |
| Capguard | resist pierce ×0.85 | resist pierce ×0.7, radius +0.1 |
| Gill Archer | range +0.75 | range +1.5, attack interval ×0.9 |
| Rootbreaker | speed ×1.1 | splash 0.6 |
| Scythecap | splash +0.2 | splash +0.4 |
| Hammercap | resist crush ×0.85 | resist crush ×0.7, damage ×1.1 |
| Veilstalker | speed ×1.1 | slayer bonus 1.75 → 2.0 |
| Tender | heal range +0.5 | heals 2 targets |
| Amanita Knight | resist slash ×0.85 | resist slash ×0.7 |
| Morel Runner | speed ×1.1 | damage ×1.1 |

### 11.4 Value check for the M1 roster (sanity, not law)

The heuristic, so new content starts near balance:

```
value = (units per minute) × sqrt(HP × DPS) × roleFactor / cost
```

The role factors are guesses until the harness calibrates them: ranged 1.6, splash 1.4, siege 1.3, slayer 1.2, other 1.0. Target value: 1.45 ± 0.15 per gold, before matrix effects.

| Building | Units/min | sqrt(HP × DPS) | Role factor | Value |
|---|---|---|---|---|
| Sporeling Burrow | 7.5 | 22.9 | 1.0 | 1.56 |
| Capguard Hall | 4.0 | 55.5 | 1.0 | 1.48 |
| Gill Archer Nest | 4.0 | 32.4 | 1.6 | 1.38 |
| Rootbreaker Den | 2.5 | 88.3 | 1.3 | 1.43 |

**Per supply** (which matters at the cap), `sqrt(HP × DPS) / supply`:

| Unit | Per supply |
|---|---|
| Sporeling | 22.9 |
| Capguard | 27.7 |
| Gill Archer | 16.2 (×1.6 effective = 25.9) |
| Rootbreaker | 29.4 |

Cheap Sporelings are the most gold-efficient and the least supply-efficient. The supply cap and Slash damage are their brakes, and merging is the way to lift them past the cap.

**Intended M1 counter graph** in 12-supply duels (rough Lanchester estimates for G2 to confirm): Capguard > Sporeling; Gill Archer > Capguard (narrowly, thanks to range); Sporeling > Gill Archer; Gill Archer > Rootbreaker; Capguard > Rootbreaker (narrowly); Rootbreaker > Sporeling. Ranged units are the likeliest to drift over-efficient. If the guardrails flag the Gill Archer, cut its range to 4.5 before touching its damage.

### 11.5 Strains (Milestone 6)

| Building | Strain | Patch |
|---|---|---|
| Sporeling Burrow | *Teeming* | 3 per spawn / 18 s; Sporeling HP ×0.8; knit time ×0.5 |
| Sporeling Burrow | *Bursting* | Sporelings explode on death for 15 crush, splash 0.8; HP ×0.85 |
| Capguard Hall | *Ironcap* | Capguard armor → heavy; speed ×0.85; HP ×1.1 |
| Capguard Hall | *Gillguard* | Capguard damage type → pierce |
| Gill Archer Nest | *Longgill* | range +1.5; attack interval ×1.25 |
| Gill Archer Nest | *Volley* | 2 per spawn / 20 s; damage ×0.8 |
| Rootbreaker Den | *Battering* | siege multiplier 2.0 → 2.6; damage to units ×0.7 |
| Rootbreaker Den | *Tunneling* | speed ×1.4; HP ×0.8 |
| Puffball Mortar | *Thornpuff* | damage type → slash; splash 1.3; damage ×0.8 |
| Puffball Mortar | *Longshot* | range 8; min range 3; interval ×1.2 |
| Truffle Cellar | *Deep Truffle* | +50% gold if wholly in home columns; no loam bonus |
| Truffle Cellar | *Wild Truffle* | loam bonus +100%; −25% gold elsewhere |

### 11.6 Upgrade tracks (draft upgrades; 3 levels each)

| Building | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Sporeling Burrow | Sporeling HP +15% | Sporeling damage +15% | +1 Sporeling per spawn |
| Capguard Hall | Capguard HP +15% | Capguard resist pierce ×0.8 | Capguard damage +20% |
| Gill Archer Nest | Gill Archer range +0.75 | Gill Archer damage +15% | Attack interval −15% |
| Rootbreaker Den | Rootbreaker HP +20% | Rootbreaker speed +20% | +25% vs structure |
| Puffball Mortar | splash +0.3 | damage +20% | range +1 |
| Truffle Cellar | +1 gold per tick | Building HP +200 | +1 gold per tick |
| Others (M2+) | Same pattern: survivability → damage → a signature boost, defined in each building's data | | |

### 11.7 Relics (Milestone 3) and colony traits (Milestone 6)

**Relics.** v1 ships at least 20; the first 16 are listed here. C = common, U = uncommon, R = rare.

| Rarity | Relic | Effect |
|---|---|---|
| C | Thick Caps | Your buildings +15% HP |
| C | Fruiting Season | Economy buildings +1 gold per income tick |
| C | Rot Ward | Heartcap turrets +25% damage |
| C | Quick Roots | Capture speed +20% |
| C | Fresh Spores | Each building's first spawn is instant |
| U | Deep Cellars | Interest cap +10 |
| U | Spore Tithe | +4 gold per merge |
| U | Forward Spores | Supply-line surcharge halved |
| U | Knitting Circle | Knit time −50%, merge radius +0.5 |
| U | Second Flush | Selling refunds 80% |
| U | Mycelial Web | Supply cap +6 |
| R | Mycorrhizal Link | Buildings orthogonally adjacent to 2+ of your buildings spawn 15% faster |
| R | Spore Cloud | Your units release a cloud on death: 10 crush, splash 1.0 |
| R | Elder's Patience | Elders +25% HP; they regenerate 2% HP/s while out of combat |
| R | Sporestorm Sigil | Commander power cooldown −30% |
| R | Rot-Eater (feat) | +1 gold per enemy unit killed while the Sporestorm is active |

**Intended "rare broken run" engines.** These are allowed, but they depend on rare finds:

- Spore Tithe + Knitting Circle + *Teeming* strain: a merge economy.
- Spore Cloud + *Bursting* strain: chain detonations.
- Mycorrhizal Link + a tight cluster of buildings: production density.

**Colony traits.** v1 ships at least 12:

| Trait | Cost | Effect |
|---|---|---|
| Thick Hyphae | 1 | Heartcap +10% max HP |
| Early Flush | 2 | +50 starting gold each battle |
| Quick Knit | 1 | Knit time −30% |
| Rich Veins | 2 | Loam bonus +25% (to +75%) |
| Spore Memory | 2 | The first draft of each battle offers 4 cards |
| Root Pressure | 3 | Capture speed +15% |
| Patient Growth | 1 | Interest cap +5 |
| Bulwark Spores | 2 | Buildings +15% HP |
| Thrifty | 1 | Rerolls cost 10 less |
| Feral Bloom | 0 | Units +10% damage; buildings −15% HP |
| Hermit | 0 | No comeback income; +100 starting gold |
| Wild Draft | 0 | Drafts offer +1 card; no rerolls |

### 11.8 Blights (Milestone 7)

| Blight | Decay per rank | Effect |
|---|---|---|
| Hardened Rot | 1 / 2 | Enemy buildings +15% / +30% HP |
| Quick Learner | 2 | The general's warning comes 1 wave ahead instead of 2 |
| Thin Soil | 1 | Your home zone −1 column (minimum 2) |
| Famine | 1 / 2 | Your Heartcap stipend −25% / −50% |
| Early Storm | 2 | The Sporestorm starts at 3:00 |
| Silent General | 2 | No counter warnings (counters still happen) |

### 11.9 Maps (v1)

All maps are point-symmetric and hand-authored. Map files sit next to the other data files.

| M | id | Name | Lanes | W × H | Home columns | Character |
|---|---|---|---|---|---|---|
| 1 | `bogwater-hollow` | Bogwater Hollow | 1 | 32 × 8 | 4 | Central loam patch; a few stumps (§4.1) |
| 3 | `stumpfield` | Stumpfield | 1 | 34 × 8 | 4 | Dense stumps fragment placement; loam near both borders |
| 3 | `twin-roots` | Twin Roots | 2 | 32 × 13 (6 + wall + 6) | 4 | Loam only in each side's "far" lane: greed means pushing the lane you're weaker in |
| 7 | `three-hollows` | Three Hollows | 3 | 30 × 17 (5 + 1 + 5 + 1 + 5) | 3 | Short lanes and tight space; the middle lane holds the loam |

### 11.10 Commanders (Milestone 5)

| Commander | Core pool (6) | Starter kit (3) | Passive | Active power |
|---|---|---|---|---|
| **Vesper Velvetcap** (starter) | Burrow, Capguard Hall, Gill Nest, Rootbreaker Den, Puffball Mortar, Truffle Cellar | Burrow, Capguard Hall, Truffle Cellar | Buildings in home columns spawn 10% faster | **Spore Burst:** 90 crush to every enemy unit and building within 2 tiles of a point. Cooldown 75 s; first ready at 0:45. |
| **Armilla the Vast** | Capguard Hall, Rootbreaker Den, Puffball Mortar, Truffle Cellar, Hammercap Forge, Rhizome Vault | Capguard Hall, Truffle Cellar, Puffball Mortar | Capture speed +25% | **Rhizome Surge:** instantly capture your frontier column in every lane where it holds no enemy building. Cooldown 100 s; first ready at 1:30. |
| **Cordis the Puppeteer** | Burrow, Gill Nest, Scythecap Grove, Veilstalker Hollow, Tender's Ring, Truffle Cellar | Burrow, Gill Nest, Truffle Cellar | Knit time −50%; merge radius 2.0 | **Puppet Bloom:** every same-type trio within 3 tiles of a point merges instantly, ignoring the combat timer. Cooldown 80 s; first ready at 1:00. |

### 11.11 Generals' doctrine weights (Milestone 4)

These use M1–M2 building ids. The Gray Rot equivalents replace them in M7.

| General | Opener | Weights |
|---|---|---|
| Old Mother Mold | Burrow, Burrow | Burrow 5, Capguard 1, Gill 2, Cellar 2, Scythecap 1, Mortar 0.5 |
| The Lichen Baron | Capguard, Cellar | Capguard 3, Mortar 3, Hammercap 2, Cellar 2, Rootbreaker 1, Gill 1 |
| The Blightwright | Gill, Cellar | Rootbreaker 3, Gill 3, Capguard 2, Cellar 2, Burrow 1 |
| The Pale Sovereign | Capguard, Gill, Cellar | Even weights over its kit; driven mostly by its dual doctrine |

### 11.12 Gray Rot roster (Milestone 7)

The Gray Rot mirrors the Velvet Bloom's roles under its own names. Faction trait: units have **+10% HP and −10% speed**.

| Role | Gray Rot building → unit |
|---|---|
| swarm | Ashling Pit → Ashling |
| line | Moldhusk Hall → Moldhusk |
| ranged | Spitcap Nest → Spitcap |
| siege | Gravemaw Den → Gravemaw |
| splash tower | Ashpuff Kiln |
| economy | Grub Larder |
| cleave | Rotreaper Grove → Rotreaper |
| crush line | Bonecap Smithy → Bonecap |
| slayer | Pallid Hollow → Pallid Stalker |
| elite heavy | Lichen Bastion → Lichen Warden |

---

## 12. Balance method and targets

### 12.1 Principles

- **Soft counters.** Matrix extremes stay within 0.5–1.5. No unit is useless against anything, and every unit has at least one favorable and one unfavorable matchup.
- **Author with the value heuristic** (§11.4), then calibrate with the tools below. Playtesting answers "is it fun?". The tools answer "is it degenerate?".
- **Rare broken runs are welcome. Forced ones are not.** Draft randomness and the general's adaptation keep any single engine from being reachable every run.

### 12.2 Tools

These are defined in §15.

- `npm run balance -- duel`: two kinds of duels on a flat test map with no Heartcap turrets and no territory.
  - **Production duels:** equal gold spent on a single building type per side, 3 minutes.
  - **Supply duels:** 12 supply of unit A against 12 supply of unit B, fought to the death.

  The outputs are win-rate and remaining-value matrices.
- `npm run balance -- tournament`: strategy bots × generals × maps × seeds, producing a win-rate table, median battle length, the share of battles decided by Decision, and front-line volatility.
- Reports are written to `reports/balance/<timestamp>.md` plus `.json`. The `reports/` folder is git-ignored.

### 12.3 Guardrails

These run as the slow test suite, `npm run test:slow`. Their thresholds live in `data/balance-targets.json`, so they're tunable too.

| # | Guardrail | From |
|---|---|---|
| G1 | Production duels: no building wins more than 80% of its pairings; every building wins at least one pairing and loses at least one clearly (the opponent keeps ≥ 30% more remaining value) | M1 |
| G2 | Supply duels (12 supply each, 5 seeds) form a healthy counter graph: every unit type beats at least one other type and loses to at least one in ≥ 4 of 5 seeds. The report also checks the intended edges: M1 per §11.4; M2 adds Scythecap > Sporeling and Veilstalker > Bloomed Capguard; M4 adds Hammercap > Amanita Knight and Amanita Knight > Gill Archer | M1, extended each milestone |
| G3 | Every `script:mono:<id>` bot wins ≤ 55% against `script:balanced` (honest, symmetric) | M1 |
| G4 | `script:balanced` vs the scripted general on Bogwater Hollow over 40 seeds: median length 5:30–8:30, ≤ 15% of battles end by Decision | M1 |
| G5 | Snowball: a side given +150 starting gold wins 55–75% | M1 |
| G6 | Comeback: starting from a scenario with a 6-column deficit at 3:00, the behind side still wins ≥ 20% | M1 |
| G7 | Merging: in a merge-on vs merge-off mirror, merge-on wins 55–70%. Against an opponent with a 25% Slayer spawn share, merge-on wins ≤ 50%. | M2 |
| G8 | Adaptation: every mono bot's win rate drops by ≥ 20 points against the adaptive general compared with the same general with adaptation off. `script:balanced` wins 40–65% against the adaptive general at battle index 1. | M4 |
| G9 | Meta ceiling: a full 12-capacity trait loadout raises `script:balanced`'s win rate by ≤ 15 points | M6 |
| G10 | Blights: Decay 6 lowers `script:balanced`'s run win rate by 25–50 points against Decay 0 | M7 |
| G11 | Performance budgets (§13.7) | M1 |

### 12.4 Tuning workflow

1. Edit the data.
2. Run `npm run balance -- duel` and `npm run balance -- tournament --seeds 40`.
3. Read the report diff.
4. Run `npm run test:slow`.
5. Playtest.
6. Record notable changes in `data/CHANGELOG-balance.md`.

---

## 13. Technical architecture

### 13.1 Stack

| Concern | Choice |
|---|---|
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| Build / dev server | Vite (current stable at project creation), static output |
| Tests | Vitest |
| Node CLIs | `tsx` (Node ≥ 20; this machine runs Node 26) |
| Browser checks | Playwright (Chromium) |
| Data validation | zod (the only runtime dependency) |
| Lint | ESLint + typescript-eslint, with per-directory purity rules |
| UI | Vanilla TypeScript with a tiny `h()` DOM helper. No framework. |
| Hosting | GitHub Pages via GitHub Actions; Vite `base: './'` so the build works under any repository path |

The lockfile is committed and dependency versions are pinned exactly.

### 13.2 Layering (enforced)

```
app ──► ui ──► render ──► (reads) sim state + events
 │       └──► run, meta ──► sim ──► data (types, registry, loaders)
tools (Node CLIs) ──► run, meta, sim, data
```

- **`src/sim`** is pure. It MUST NOT import from `render`, `ui`, `app`, `run` or `meta`. It MUST NOT touch `window`, `document`, timers, `Math.random`, `Date`, `performance` or async APIs.
- **`src/run` and `src/meta`** are pure too. Persistence is injected through a `Storage` interface.
- **`src/render` and `src/ui`** read sim state but never mutate it. They consume per-tick events.
- **Enforcement:** ESLint rules (`no-restricted-imports`, `no-restricted-globals`, `no-restricted-properties`) scoped by directory, plus a unit test that scans import graphs.

### 13.3 Determinism rules for `src/sim`

1. **Fixed timestep.** `step(state)` advances exactly one tick and takes no time delta.
2. **Seeded randomness only.** The PRNG is sfc32. Each stream is seeded through splitmix32 from `hash32(runSeed, streamName, battleIndex)`, and stream state lives in the sim state.
   - Streams: `combat` (spawn jitter), `ai`, `draft`, `route`, `events`, `meta`.
   - Streams are separate so that variance in one system never shifts another's sequence. For example, combat outcomes don't change which draft offers come next.
3. **Restricted math.** Allowed: `+ − × ÷`, `Math.sqrt`, `floor`/`ceil`/`round`/`trunc`/`abs`/`min`/`max`/`sign`/`imul`, and integer bit ops. **Banned:** `Math.sin`/`cos`/`tan`/`atan2`/`exp`/`log`/`pow`/`hypot`/`random` and `**` with non-integer exponents. These aren't guaranteed bit-identical across JavaScript engines. Directions use normalized vectors; if angles are ever needed, use lookup tables.
4. **Ordered iteration.** Entities live in arrays sorted by id. Every sort comparator ends with an id comparison. Never base a gameplay decision on object-key order.
5. **Number types.** HP, gold, timers, progress and supply are integers. Only positions and velocities are floats.
6. **No wall clock.** Speed and pause exist only in the app loop.
7. **Commands are the only input.** Every input is a tick-stamped command, and AI commands go through the same queue.
8. **Plain data.** State is JSON-serializable: no class instances with hidden fields and no closures. That makes snapshotting, hashing, diffing and resuming trivial.
9. **Hashing.** `hashState` is FNV-1a 64 (two 32-bit lanes) over a canonical traversal in fixed field order. Floats are hashed through a `Float64Array` byte view, so the hash is bit-exact.

### 13.4 Module layout

```
/
├─ SPEC.md
├─ index.html
├─ package.json            # scripts in §15.1
├─ tsconfig.json  vite.config.ts  vitest.config.ts  eslint.config.js
├─ .github/workflows/deploy.yml, ci.yml
├─ data/                   # ALL tunable content (JSON), validated by zod
│  ├─ balance.json  balance-targets.json  CHANGELOG-balance.md
│  ├─ factions/velvet-bloom/{buildings,units,upgrades,strains}.json
│  ├─ factions/gray-rot/{buildings,units,upgrades}.json          (M7)
│  ├─ maps/<map-id>.json
│  ├─ commanders.json  generals.json  relics.json  traits.json
│  ├─ blights.json  feats.json  events.json  mastery.json
│  ├─ bots.json                       # strategy bot definitions (§7.1)
│  ├─ scenarios/<scenario-id>.json    # fixed setups for tests/screenshots
│  ├─ sounds.json                     # synthesized sounds as parameters (§13.9)
│  └─ sprites/<sheet>.json            # text-defined pixel sprites
├─ src/
│  ├─ data/        schema.ts (zod)  registry.ts (load + index + cross-ref check)  patch.ts (strain/upgrade patching)  effects.ts (modifier DSL)
│  ├─ sim/         index.ts (public API)  state.ts (types)  rng.ts  hash.ts  commands.ts  stats.ts  events.ts
│  │  ├─ systems/  economy.ts  spawning.ts  targeting.ts  movement.ts  combat.ts  projectiles.ts
│  │  │            merging.ts  territory.ts  sporestorm.ts  victory.ts  powers.ts  healing.ts
│  │  ├─ spatial.ts                    # uniform grid spatial hash
│  │  └─ ai/       general.ts  doctrine.ts  placement.ts  analysis.ts  intel.ts  bots.ts
│  ├─ run/         route.ts  draft.ts  rewards.ts  events.ts  runState.ts  resume.ts
│  ├─ meta/        profile.ts  feats.ts  traits.ts  strains.ts  mastery.ts  blights.ts  migrations.ts  storage.ts
│  ├─ render/      atlas.ts (bake text sprites)  renderer.ts  layers/*.ts  effects.ts  interpolate.ts
│  ├─ audio/       engine.ts (WebAudio graph, ambient bed)  synth.ts (layers to nodes)  limits.ts (voice cap, cooldowns)
│  ├─ ui/          h.ts  hud/*.ts  screens/*.ts  callouts.ts  inspect.ts  draftOverlay.ts  report.ts
│  └─ app/         main.ts  loop.ts  input.ts  urlParams.ts  debugBridge.ts (window.__GAME__)  sound.ts  battleSound.ts  soundBoard.ts
├─ tools/          sim.ts  balance.ts  bench.ts  screenshot.ts  validate-data.ts  golden.ts
├─ tests/
│  ├─ unit/**      # fast suite (npm test)
│  ├─ slow/**      # guardrails, multi-seed sims (npm run test:slow)
│  └─ golden/      # *.replay.json + expected hashes
├─ artifacts/      # screenshots, sim outputs (git-ignored)
└─ reports/        # balance reports (git-ignored)
```

### 13.5 Game loop (browser)

1. Each `requestAnimationFrame`: `accumulator += min(realDt, 250 ms) × speed`.
2. While `accumulator ≥ 50 ms` and the sim isn't held (paused or drafting): `step()`, then `accumulator −= 50 ms`.
3. Render with `alpha = accumulator / 50 ms`, interpolating each entity between its previous and current positions.

Commands from input are queued with `tick = state.tick + 1`. Headless tools call `step()` in a tight loop with no rendering.

### 13.6 Rendering

- **Atlas:** at startup, bake every text sprite (§14.3) into an atlas using a simple shelf packer, on an `OffscreenCanvas` where available. Faction palette swaps are baked as separate regions.
- **Layers, back to front:**
  1. terrain (pre-rendered offscreen, redrawn only on `columnFlipped`)
  2. territory tint and capture progress
  3. buildings
  4. units, sorted by y and then id
  5. projectiles and sparks
  6. overlays: placement ghost, ranges, debug
- **Animation:** 2-frame walk cycles at 4 fps, an attack frame on attack events, 2-frame idle for buildings, a spawn puff.
- **Coin pops:** on each income tick, every economy building that paid out shows a pixel coin and "+N" rising off it (the enemy's at half opacity). The amount is the change in the building's `goldByBuilding` total, so the renderer never recomputes income and the sim's events and hashes are unchanged.
- **Effects** use a fixed-capacity ring buffer (512).
- **No camera:** the whole map is always visible.

### 13.7 Performance budget (verified every milestone)

| Metric | Budget |
|---|---|
| Sim tick, bench scenario with 300 live units | mean ≤ 1.0 ms, p99 ≤ 2.5 ms (Node, this machine) |
| One full M1 battle, headless | ≤ 3 s wall time |
| Render frame at 300 units (Chromium) | ≤ 8 ms |
| Hot-loop allocations | none: pooled objects and reused arrays |
| Shipped JS + data | ≤ 300 KB gzipped (v1) |

**Techniques:**

- The supply cap keeps a typical battle at ≤ 120 units, and merging removes entities. The bench covers 2.5× that.
- A uniform-grid spatial hash with 2-tile cells, rebuilt every tick.
- Staggered retargeting.
- Pre-rendered terrain and atlas `drawImage` calls.
- HP bars drawn only for damaged entities.

### 13.8 Persistence and deployment

- **Storage:** a `Storage` interface with a localStorage implementation in the browser and an in-memory one in tests. Profile format in §9.7, run resume in §8.9.
- **Deployment:**
  - `npm run build` emits a static `dist/`. `npm run build:dev` emits the dev-site build (`--mode develop`).
  - **Branches** (the same strategy as Swalliso/dig-deep):
    - `main` is the game, at https://swalliso.github.io/Sambattler/. It changes only through a release PR from `develop`, or a `hotfix/…` branch.
    - `develop` is the integration branch, at https://swalliso.github.io/Sambattler/dev/. Finished `feature/…` branches (made from `develop`) are merged into it by PR and playtested there.
    - A hotfix is made from `main`, merged into `main`, then `main` is merged back into `develop`.
  - **`.github/workflows/deploy.yml`** runs on every push to `main` or `develop`. A Pages deploy replaces the whole site, so each run builds both branches:
    - `main` is verified and built into the site root
    - `develop` is verified and built into `/dev/` with `VITE_COMMIT`
    - `actions/deploy-pages` then publishes the result
    - A broken `develop` never blocks `main`: on a push to `main` it is left out with a warning; on a push to `develop` the run fails.
    - The `github-pages` environment allows deployments from both `main` and `develop`.
  - **`.github/workflows/ci.yml`** (job `test-and-build`) runs `npm run verify`, the browser tests and both builds on every pull request, and on pushes to `feature/**` and `hotfix/**`.
  - **The dev site:**
    - it is titled "Spore & Sprawl (dev)", carries `noindex`, and shows a `DEV BUILD · <sha>` tag
    - it keeps its own localStorage keys (prefix `dev/`, `src/app/channel.ts`), because both sites share an origin, so a dev run never resumes or overwrites a saved run on the game
  - **Link previews:** `index.html` carries Open Graph and Twitter card tags, so a link shared in Slack, Discord or elsewhere shows the title, a line of description and a 1200×630 image. Previews need absolute addresses, so `vite.config.ts` fills them in per build: the game's tags point at `https://swalliso.github.io/Sambattler/og-image.png`, and the dev site's at `/Sambattler/dev/og-image.png` with "(dev)" in the title. The image lives in `public/` (Vite copies it to the site root); `npm run og-image` renders it again from the title screen after the title's art changes.
  - The user creates the GitHub repository and sets Pages' source to "GitHub Actions". Claude can't push without the user's remote and credentials. Locally, `npm run preview` serves the production build, and the screenshot check runs against it.

### 13.9 Audio

Every sound is synthesized with WebAudio from parameters in `data/sounds.json`, the way sprites are text-defined, so the game ships no audio files. A sound can switch to a CC0 sample later if the synthesized one feels thin.

- **Engine (`src/audio/`).** A sound layers up to six sources. Each is an oscillator (sine, triangle, square, saw) or looping noise (white, pink, brown), through an optional biquad filter (lowpass, highpass, bandpass, notch or peaking), shaped by an envelope (attack, decay, sustain level, hold, release). Oscillators can glide in pitch and wobble (vibrato); filters can sweep; a layer can start late, for arpeggios. Each play can jitter pitch, gain and pan by a small random amount. `src/audio` uses `Math.random` and WebAudio, so it sits outside the pure layers and imports nothing but data types.
- **Routing.** Voices go to an `sfx`, `ui` or `ambient` bus, then a master gain, then a limiter (a DynamicsCompressor), then the speakers. Each bus also sends to a short generated cave reverb.
- **Data format.** `data/sounds.json` holds the bus levels, `enemyGain`, `maxVoices`, the speed thinning, the reverb, the ambient bed, and the sounds. Each sound has an id, name, note, bus, gain, priority (0–10), `cooldownMs`, an optional `frequent` flag, optional jitter and its layers, for example `{ "wave": "sine", "freq": 150, "sweep": { "to": 55, "time": 0.14 }, "env": { "attack": 0.004, "decay": 0.16, "sustain": 0, "hold": 0, "release": 0.05 }, "gain": 0.9 }`. `SoundBankSchema` in `src/data/schema.ts` validates it, and the registry checks that every sound the game plays exists (`REQUIRED_SOUNDS`) and that the drips are ambient sounds, so `npm run validate:data` catches mistakes. It loads into `Content.audio` and `Content.sounds` like the sprite sheets. The sim never reads it, so sound changes never move a golden hash.
- **Throttling.** Each sound has a cooldown (per key: the two Heartcaps throttle separately). At most 12 voices play at once: a new sound takes over the oldest voice of lower priority, or is dropped. At 2× and 3× speed, `frequent` sounds (spawn puffs, knits) stretch their cooldown 2× and 3.5× and play at 70% and 50% gain.
- **Battle sounds** (`src/app/battleSound.ts`) come from each tick's sim events, render-side only, the way callouts are: place, sell, a refused placement, the player's income (once per income tick), spawn, column claimed or lost, a building lost or razed, knit, merge (fuller for an Elder), a Heartcap hit (at most once every 1.5 s per Heartcap; ordinary hits make no sound), the counter warning and activation, the Sporestorm, each new wave, Begin, the draft opening and a pick, and the win or loss. The enemy's sounds play at `enemyGain` (50%), and sounds with a place on the field pan with it.
- **UI sounds.** A very soft tick when the pointer moves onto a button, and a click when one is pressed, delegated from the document so every screen has them. Route nodes, event and Grove choices, and draft and spoils cards have their own sounds; a button's `data-sfx` overrides the choice.
- **Ambient bed.** Low-passed brown noise whose cutoff drifts slowly, plus a random water drip every 2.5–9 s, on the ambient bus. It keeps going while a battle is paused, at half level.
- **Browser rules.** The AudioContext is made on the first `pointerdown` or `keydown` (autoplay rules) and is suspended while the tab is hidden or sound is muted. Without WebAudio, under `?test=1`, in automated browsers (`navigator.webdriver`, unless `?sound=1`) and in Node, the engine does nothing and never throws, so screenshots and tests are unaffected.
- **Settings.** `masterVolume` (default 0.6), `sfxVolume` (0.8; it also sets the UI bus), `ambientVolume` (0.5) and `muted` live in `spore-sprawl/settings/v1`, and saves from before sound load with these defaults. Gains follow the square of the slider, which sounds closer to even steps. The speaker button sits in the battle's speed row and in the run bar: a click mutes, and hovering or focusing it opens the volume sliders. The settings screen (§10.5) holds the same mute and sliders. `S` mutes or unmutes anywhere.
- **Sound board.** `?scene=sounds` lists every sound with Play and ×8 (eight plays 70 ms apart, to hear cooldowns and the voice cap), plays the ambient bed, and can audition 2× and 3× speed, the enemy's quieter side and the paused level.

---

## 14. Data model

### 14.1 Principles

- **All content is JSON under `data/`.** Each file is validated by a zod schema in `src/data/schema.ts`.
- **Validation runs in three places:** at app startup in development, in `npm run validate:data`, and in the unit suite. Cross-references (unit ids, sprite ids, unlock ids) are checked by `registry.ts`.
- **Compiled definitions.** At battle start, and after each draft pick, the sim compiles a per-side set of resolved definitions:

  ```
  base data → strain patch → modifiers (sum all `add`, then multiply all `mul`, then apply `set`)
  ```

  The compiled set is stored in state and never recomputed per tick.
- **One modifier and trigger DSL** (`EffectBundle`) serves upgrades, relics, traits, blights, strain ranks, commander and general passives, and elite modifiers. New content should rarely need new code. When it does, add a new `stat` key or `action` kind to the whitelist.

### 14.2 Content types (TypeScript view of the JSON)

```ts
type Id = string;
type Side = 'player' | 'enemy';
type DamageType = 'slash' | 'pierce' | 'crush';
type ArmorType = 'light' | 'medium' | 'heavy' | 'structure';
type Tag = 'siege' | 'slayer' | 'ranged' | 'swarm' | 'support';
type Seconds = number;                       // data only; loader converts to integer ticks
type Rarity = 'common' | 'uncommon' | 'rare';

interface UnitDef {
  id: Id; name: string; sprite: Id;
  hp: number; armor: Exclude<ArmorType, 'structure'>;
  damage: number; damageType: DamageType; attackInterval: Seconds;
  range: number; projectileSpeed: number;    // 0 = melee
  speed: number; supply: 1 | 2 | 3; aggroRange: number; radius: number;
  splashRadius?: number; tags: Tag[];
  heal?: { amount: number; interval: Seconds; range: number; targets: number };
  onDeath?: EffectAction[];
  mergePerks: { 2: StatPatch; 3: StatPatch };
}

interface StatPatch {
  hpMult?: number; damageMult?: number; speedMult?: number; attackIntervalMult?: number;
  rangeAdd?: number; splashRadius?: number; radiusAdd?: number; slayerMult?: number;
  resist?: Partial<Record<DamageType, number>>; healTargets?: number;
}

interface BuildingDef {
  id: Id; name: string; sprite: Id; description: string;
  kind: 'spawner' | 'tower' | 'economy' | 'utility';
  footprint: { w: number; h: number }; cost: number; hp: number;
  spawn?: { unit: Id; count: number; interval: Seconds; mergeForced?: boolean; knitMult?: number };
  attack?: { damage: number; damageType: DamageType; interval: Seconds; range: number;
             minRange?: number; splashRadius?: number; projectileSpeed: number };
  economy?: { goldPerTick: number; interestCapAdd?: number };
  utility?: { supplyCapAdd?: number; auraRadius?: number; aura?: ModifierDef[];
              laneCaptureBonus?: number };
}

interface FactionDef { id: Id; name: string; palette: Record<string, string>;
                       buildings: Id[]; trait?: EffectBundle }

// ---- one DSL for every modifier source ----
interface Selector { unit?: Id; building?: Id; tag?: Tag; tier?: 1 | 2 | 3;
                     zone?: 'home' | 'contested'; onLoam?: boolean; adjacentOwnBuildingsGte?: number }
interface ModifierDef { stat: StatKey; op: 'add' | 'mul' | 'set'; value: number;
                        side?: 'self' | 'opponent'; where?: Selector }
type StatKey =                                   // whitelist, extended deliberately
  | 'unit.hp' | 'unit.damage' | 'unit.attackInterval' | 'unit.range' | 'unit.speed'
  | 'unit.splashRadius' | 'unit.resist.slash' | 'unit.resist.pierce' | 'unit.resist.crush'
  | 'unit.siegeMult' | 'unit.regenPctPerSec'
  | 'building.hp' | 'building.spawnInterval' | 'building.spawnCount' | 'building.goldPerTick'
  | 'building.firstSpawnFraction' | 'tower.damage' | 'tower.range' | 'tower.splashRadius'
  | 'side.supplyCap' | 'side.interestCap' | 'side.stipend' | 'side.captureSpeed'
  | 'side.startingGold' | 'side.sellRefund' | 'side.supplyLineRate' | 'side.knitTicks'
  | 'side.mergeRadius' | 'side.rerollCost' | 'side.draftCards' | 'side.heartcapMaxHp'
  | 'side.turretDamage' | 'side.comebackEnabled' | 'side.homeCols' | 'side.powerCooldown'
  | 'side.loamBonus' | 'battle.sporestormStart' | 'general.warningWaves' | 'general.warningsVisible';
interface TriggerDef {
  on: 'merge' | 'unitDeath' | 'buildingDestroyed' | 'enemyUnitKilled' | 'waveStart' | 'battleStart';
  if?: Selector & { sporestormGte?: number };
  do: EffectAction[];
}
type EffectAction =
  | { gainGold: number }
  | { explode: { damage: number; damageType: DamageType; radius: number } }
  | { repairHeartcapPct: number };
interface EffectBundle { modifiers?: ModifierDef[]; triggers?: TriggerDef[] }

// ---- run & meta content ----
interface UpgradeTrackDef { building: Id; levels: [EffectBundle, EffectBundle, EffectBundle];
                            rarity: [Rarity, Rarity, Rarity] }
interface RelicDef  { id: Id; name: string; rarity: Rarity; effects: EffectBundle; unlockedBy?: Id }
interface StrainDef { id: Id; building: Id; name: string; unlockedBy: Id;
                      patch: { building?: Partial<BuildingDef>; unit?: Partial<UnitDef> };
                      rankEffect?: EffectBundle }      // default: +4% unit hp & damage per rank
interface TraitDef  { id: Id; name: string; cost: 0 | 1 | 2 | 3; sporePrice: number; effects: EffectBundle }
interface BlightDef { id: Id; name: string; ranks: { decay: number; effects: EffectBundle }[] }
type Condition = { all: Condition[] } | { any: Condition[] }
               | { stat: StatPath; eq?: number | boolean; gte?: number; lte?: number };
interface FeatDef { id: Id; name: string; description: string; scope: 'battle' | 'run';
                    condition: Condition; reward: { unlocks?: Id[]; amber?: number } }
interface PowerDef { id: Id; name: string; cooldown: Seconds; firstReady: Seconds;
                     target: 'point' | 'lane' | 'none';
                     action: { burst?: { damage: number; damageType: DamageType; radius: number } }
                           | { captureFrontiers: true } | { instantMerge: { radius: number } } }
interface CommanderDef { id: Id; name: string; sprite: Id; core: Id[]; starter: [Id, Id, Id];
                         passive: EffectBundle; power: PowerDef; altPower?: PowerDef;
                         mastery: { level: number; unlock: Id | 'altPower' | 'starterChoice' |
                                    { passive: EffectBundle } }[] }
interface GeneralDef { id: Id; name: string; sprite: Id; faction: Id; opener: Id[];
                       weights: Record<Id, number>; preferred: Id[]; passive: EffectBundle;
                       laneStyle: 'defensive' | 'aggressive'; appearsIn: number[]; boss?: boolean }
interface EventDef { id: Id; title: string; text: string;
                     choices: { label: string; text: string; outcome: RunEffect[] }[] }
interface BotDef { id: Id; opener: Id[]; weights: Record<Id, number>; mergePolicy: 'on' | 'off';
                   adaptive?: boolean }

// ---- maps & sprites ----
interface MapDef { id: Id; name: string; width: number; height: number; homeCols: number;
                   lanes: { rowStart: number; rowEnd: number }[];
                   tiles: string[];             // H strings × W chars: . $ o #
                   milestone: number }
interface SpriteDef { id: Id; w: number; h: number; anchor: [number, number];
                      palette: Record<string, string | null>;   // char → #rrggbb, null = transparent
                      frames: string[][];                        // frames × h rows × w chars
                      factionSwap?: boolean }                    // bake a gray-rot variant
```

### 14.3 Text-defined sprites

- Units are about 10–14 px; buildings are 32 × 32 px (2 × 2 tiles); Heartcaps are 32 × (lane height × 16).
- A sprite is a palette plus rows of characters. `null` means transparent. Every row in a frame MUST have exactly `w` characters; the schema enforces it.
- Velvet Bloom sprites use palette keys that the faction swap maps to Gray Rot colors at bake time, so one drawing serves both factions until M7 adds distinct Gray Rot art.
- Example: the Sporeling, as shown in the interview:

```json
{ "id": "sporeling", "w": 12, "h": 10, "anchor": [6, 9], "factionSwap": true,
  "palette": { ".": null, "k": "#1a1020", "v": "#8a4fd8", "l": "#c9a2ff", "s": "#e8d9b5" },
  "frames": [[ "....kkkk....", "..kkvvvvkk..", ".kvvlvvlvvk.", ".kvvvvvvvvk.", "..kkkkkkkk..",
               "....kssk....", "...kssssk...", "...kssssk...", "....k..k....", "...kk..kk..." ]] }
```

### 14.4 Runtime state (plain, serializable data)

```ts
interface BattleConfig {
  seed: number; battleIndex: number; mapId: Id;
  player: SideConfig; enemy: SideConfig;
  modifiers: EffectBundle[];                        // event effects, blights, elite modifier
  flags: { merging: boolean; drafts: boolean; adaptiveGeneral: boolean; powers: boolean };
}
interface SideConfig {
  faction: Id;
  controller: { kind: 'human' } | { kind: 'general'; id: Id } | { kind: 'bot'; id: Id };
  kit: Id[]; upgrades: Record<Id, number>; relics: Id[]; traits: Id[];
  strains: Record<Id, Id>; strainRanks: Record<Id, number>; commander?: Id;
  heartcapHp: number; heartcapMaxHp: number; startingGold: number; intel?: IntelProfile;
}
type IntelProfile = Record<'swarm' | 'line' | 'armor' | 'elite', number>;

interface BattleState {
  v: 1; config: BattleConfig; tick: number;
  phase: 'deploy' | 'live' | 'ended'; held: boolean;        // held = draft open
  rng: Record<'combat' | 'ai' | 'draft', [number, number, number, number]>;
  nextId: number;
  sides: Record<Side, SideState>;
  lanes: LaneState[];
  units: UnitState[];                // sorted by id
  buildings: BuildingState[];        // sorted by id
  hits: PendingHit[];                // sorted by (tick, sourceId, seq)
  sporestorm: number;
  queue: Command[];                  // pending, sorted by (tick, side, seq)
  log: Command[];                    // every executed command (replays, resume)
  events: SimEvent[];                // this tick only
  compiled: Record<Side, CompiledDefs>;
  stats: Record<Side, SideStats>;
  outcome?: { winner: Side; by: 'rout' | 'decision'; tick: number };
}
interface SideState {
  gold: number; supplyUsed: number; supplyCap: number;
  heartcapHp: number; heartcapMaxHp: number; turretCooldowns: number[];
  powerCooldown: number; kit: Id[];
  draft?: { offer: Id[]; rerolls: number; index: number };
  ai?: AiState;                       // doctrine, target purchase, pending counter, noise
}
interface LaneState {
  rowStart: number; rowEnd: number;
  owner: number[];                    // per column: 0 neutral, 1 player, 2 enemy
  pBorder: number; eBorder: number;
  capture: Record<Side, { column: number; progress: number }>;
}
interface UnitState {
  id: number; side: Side; lane: number; unitId: Id; tier: 1 | 2 | 3;
  x: number; y: number; px: number; py: number; spawnY: number;
  hp: number; maxHp: number; supply: number; cooldown: number;
  targetId: number; lastCombatTick: number; mergeOn: boolean;
  knit?: { group: number; untilTick: number };
  sourceBuildingId: number;
}
interface BuildingState {
  id: number; side: Side; buildingId: Id; lane: number; col: number; row: number;
  hp: number; maxHp: number; timer: number;   // half-ticks remaining to next spawn
  cooldown: number; lastDamagedTick: number; placedTick: number; pricePaid: number;
  mergeOn: boolean; holding: boolean; spawnedIds: number[];
}
interface PendingHit { tick: number; sourceId: number; seq: number; side: Side; targetId: number;
                       x: number; y: number; damage: number; damageType: DamageType;
                       splashRadius: number; sourceBuildingId: number }
```

### 14.5 Commands and events

```ts
type Command = { tick: number; side: Side; seq: number } & (
  | { type: 'begin' }                                           // ends deploy
  | { type: 'place'; buildingId: Id; lane: number; col: number; row: number }
  | { type: 'sell'; entityId: number }
  | { type: 'toggleMerge'; entityId: number; on: boolean }
  | { type: 'power'; x?: number; y?: number; lane?: number }
  | { type: 'draftPick'; cardId: Id } | { type: 'draftReroll' } | { type: 'draftSkip' });

type SimEvent =
  | { t: 'spawned' | 'died'; id: number } | { t: 'hit'; target: number; amount: number; eff: 'strong' | 'normal' | 'weak' }
  | { t: 'knitStart' | 'knitCancel'; ids: number[] } | { t: 'merged'; id: number; tier: 2 | 3 }
  | { t: 'columnFlipped'; lane: number; column: number; to: Side }
  | { t: 'buildingPlaced' | 'buildingDestroyed' | 'buildingSold'; id: number }
  | { t: 'income'; side: Side; amount: number } | { t: 'wave'; n: number } | { t: 'sporestorm'; stacks: number }
  | { t: 'draftOpen'; side: Side } | { t: 'counterWarned' | 'counterActive'; kind: CounterKind; tick: number }
  | { t: 'powerUsed'; side: Side } | { t: 'commandRejected'; seq: number; reason: string }
  | { t: 'ended'; winner: Side; by: 'rout' | 'decision' };
```

- **Validation happens at execution time.** The state may change between queueing and execution, so a command is re-validated on the tick it runs. An illegal command becomes a `commandRejected` event. Because validation is deterministic, replaying the full log reproduces identical rejections.

### 14.6 Sim public API (`src/sim/index.ts`)

```ts
loadContent(raw: RawContent): Content                       // zod-validate, index, cross-check
createBattle(content: Content, config: BattleConfig): BattleState
queueCommand(state: BattleState, cmd: Omit<Command, 'seq'>): void
step(state: BattleState): void                              // exactly one tick
runHeadless(state: BattleState, opts: { until: 'end' | number; commands?: Command[];
            hashEvery?: number; onTick?: (s: BattleState) => void }): HeadlessResult
hashState(state: BattleState): string                       // 16 hex chars
snapshot(state: BattleState): string;  restore(json: string): BattleState
legalPlacements(state: BattleState, side: Side, buildingId: Id): Placement[]   // UI ghost + AI
priceAt(state: BattleState, side: Side, buildingId: Id, col: number): number
```

**System order within `step`.** The order is fixed and covered by tests:

1. Clear events; snapshot the previous positions.
2. Execute queued commands for this tick, sorted by (side: player first, then seq).
3. Clock, waves and Sporestorm. Open a draft (setting `held`) if due.
4. Income tick (every 100 ticks); interest at wave boundaries.
5. Building timers, then spawns, ordered by building id.
6. AI think (every 20 ticks): emits commands for `tick + 1`.
7. Targeting (staggered).
8. Movement, then separation.
9. Attacks: start cooldowns and schedule hits.
10. Resolve hits due this tick (this sets units' `lastCombatTick` and buildings' `lastDamagedTick`).
11. Healing.
12. Deaths and removals: free supply, fire `unitDeath` and `buildingDestroyed` triggers.
13. Merging (every 10 ticks).
14. Territory capture and flips.
15. Victory check.
16. Stats sampling (every 20 ticks).

---

## 15. Testing and verification tooling

Everything here is runnable by Claude, headlessly, from the project root.

### 15.1 npm scripts

| Script | What it does |
|---|---|
| `dev` | Vite dev server on :5173 |
| `build` | `typecheck`, then `vite build` into `dist/` |
| `preview` | Serve `dist/` on :4173 |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint, including the sim purity rules |
| `test` | Fast unit suite (`vitest run tests/unit`), under 30 s |
| `test:slow` | Guardrails and multi-seed sims (`vitest run tests/slow`) |
| `validate:data` | zod-validate every data file and check cross-references |
| `sim` | Headless battle, run and meta simulator (§15.2) |
| `balance` | Duels, tournaments, reports (§12.2) |
| `bench` | Performance benchmark (§15.4) |
| `golden` | Verify or update golden replays (§15.5) |
| `screenshot` | Playwright browser check (§15.6) |
| `og-image` | Render the link-preview image `public/og-image.png` (1200×630) from the title screen (§13.8) |
| `verify` | `typecheck` → `lint` → `validate:data` → `test` → `golden verify` → a sim smoke test (3 seeds) → `bench --quick`. One command, non-zero exit on any failure. |

### 15.2 Headless simulator: `npm run sim -- [options]`

| Option | Meaning |
|---|---|
| `--map <id>` | Map (default `bogwater-hollow`) |
| `--seed <n>` / `--seeds <a>..<b>` | One seed or a range (multi-seed prints a summary table) |
| `--player <ctl>` / `--enemy <ctl>` | `bot:<id>` · `general:<id>` · `general:scripted` · `replay` |
| `--scenario <id>` | Start from `data/scenarios/<id>.json` (pre-placed buildings, units, gold, clock) |
| `--replay <file>` | Replay a command log |
| `--until <end \| ticks \| mm:ss>` | When to stop (default `end`) |
| `--battle-index <n>` | Battle index for scaling (default 1) |
| `--flags <list>` | Feature flags: `merging`, `drafts`, `adaptive`, `powers` (defaults follow the milestone) |
| `--auto-draft <first \| random \| greedy>` | Draft policy for bots |
| `--commander <id>` / `--power-policy <none \| auto>` | Player commander, and whether bots fire its power (M5) |
| `--bot <id>` | Bot used by `--meta-progress` (M6) |
| `--run` / `--auto-route <policy>` | Simulate a whole run: route, battles, drafts, events |
| `--meta-progress --runs <n>` | Simulate profile progression over N runs (M6) |
| `--hash-every <ticks>` | Record state hashes at checkpoints |
| `--assert <expr>` (repeatable) | `<path>[@<tick>]<op><value>`, with `op` one of `= != < <= > >=`. `path` is a dotted path into the result JSON (indices allowed, e.g. `counters[0].kind`); `@<tick>` reads the summary recorded at that tick (assert ticks are recorded automatically). Examples: `winner=player`, `by=rout`, `durationTicks<=10200`, `hash@2400=<hex>`, `lanes[0].pBorder@300=7`. Exit code 1 on failure. |
| `--out <file>` / `--summary` | Write JSON to `artifacts/sim/…`, or print a table |

Single-battle JSON output:

```json
{ "seed": 1, "map": "bogwater-hollow", "winner": "player", "by": "rout",
  "durationTicks": 8420, "duration": "7:01", "wallMs": 640,
  "finalHash": "9f2c41d07ab35e18", "hashes": { "600": "…", "1200": "…" },
  "columns": { "player": 17, "enemy": 15 }, "heartcap": { "player": 2210, "enemy": 0 },
  "spawned": { "player": { "sporeling": 64, "capguard": 21 }, "enemy": { "…": 0 } },
  "merges": { "player": { "2": 0, "3": 0 } }, "goldEarned": { "player": { "stipend": 672, "economy": 410 } },
  "frontLine": [[0, 3, 28], [20, 4, 28], [40, 6, 27]],
  "counters": [], "rejectedCommands": 0 }
```

`frontLine` holds `[tick, pBorder, eBorder]` samples per lane. The result also carries `events` (counts per event type), `stats` (the §5.7 counters per side), `lanes[i]` (final borders) and `counters` (kind, `warnedAt` and `activeAt` per cycle).

The multi-seed summary shows win rate per side, median, min and max duration, the share of Decisions, the mean `wallMs` and any failed asserts.

### 15.3 Balance and meta tools

- `npm run balance -- duel [--seeds 5]`: production and supply duel matrices (§12.2).
- `npm run balance -- tournament --seeds 40 [--bots all] [--generals all] [--maps all]`: win-rate tables and length distributions.
- `npm run sim -- --meta-progress --runs 40 --bot balanced`: unlock pacing curve against the §9.8 targets (M6).
- Every tool writes `reports/balance/<timestamp>.{md,json}` and prints the guardrail verdicts.

### 15.4 Benchmark: `npm run bench [-- --quick]`

- **Scenario `bench-300`:** the 3-lane test map with 150 units per side placed mid-field and 20 buildings per side.
- **Run length:** 2,000 ticks (400 with `--quick`).
- **Output:** mean, p95 and p99 ms per tick, peak unit count, and heap growth.
- **Pass/fail:** exits 1 if a §13.7 budget is exceeded.
- **Before M7:** until the 3-lane map ships, the bench uses an internal test map, `data/maps/test-3lane.json`, which is excluded from play.

### 15.5 Golden replays

- **Files:** `tests/golden/<name>.replay.json` contains `{ config, commands, expected: { "<tick>": "<hash>", "final": "<hash>" } }`.
- **`npm run golden -- verify`** replays every file and reports the **first** checkpoint that diverges.
- **`npm run golden -- update`** rewrites the expected hashes. Run it only after an *intentional* behavior change, and say so in the commit message.
- **Determinism tests** in the unit suite:
  - running the same config and commands twice gives equal hashes at every 200 ticks;
  - snapshot at tick T → restore → continue gives the same final hash as an uninterrupted run;
  - a mid-battle resume from the command log matches.

### 15.6 Browser screenshot check: `npm run screenshot -- [options]`

**How it works:**

1. Build if `dist/` is stale.
2. Start `vite preview` on :4173, or reuse a server via `--url`.
3. Launch Playwright Chromium at 1280×720 with device scale factor 1.
4. Open `/?<params>`. The first run needs `npx playwright install chromium` once, which downloads the browser.

Script options: `--name <file>` (it may hold folders: `phase4/1280x720/title`), `--params "<query>"`, `--url <base>`, `--browser chromium|firefox`, `--filter deuteranopia|protanopia` (applies a color-vision filter before capture), `--size WxH` (the window; 1280×720 by default), `--click <selector>` (repeatable: presses a button before the capture, such as `#settings-btn` or `#help-tab-keys`) and `--settings '<json>'` (writes the settings record before the game boots, such as `'{"colorAssist":true}'`). When a click opened the settings screen, the script also checks that it shows every setting and the three volumes and fits the window.

**URL parameters** (supported in dev and production builds):

| Param | Meaning |
|---|---|
| `scene` | `title` (the default: with no `scene` and no battle parameters the page opens on the title), `run` (resume the saved run or start one, skipping the title), `battle` (the default when battle parameters are given), `deploy`, `draft`, `report`, `route`, `summary`, `underroot`, and the tool `sounds` (the sound board, §13.9) |
| `map`, `seed`, `battleIndex` | Battle setup |
| `player`, `enemy` | Controllers: `human`, `bot:<id>`, `general:<id>` |
| `scenario` | Start from a scenario file |
| `ticks` | Fast-forward the sim headlessly to this tick (or `end`) before the first frame |
| `paused` | `1` = start paused (stable screenshots) |
| `flags` | Feature flags, as in the CLI |
| `debug` | `1` = debug overlay and the `window.__GAME__` bridge |
| `test` | `1` = the bridge without the overlay; sound is off |
| `sound` | `1` = sound on in an automated browser, where it is off by default (`test=1` still wins) |
| `autoplay` | Let bots play through `run` (a whole run) or `battles:<n>` (the first n battles), for route and summary screens |
| `tab`, `profile` | Underroot tab; `profile=fixture:<name>` loads a test profile from `tests/fixtures/` |
| `targeting`, `measure` | `targeting=1` opens power targeting; `measure=frames` records frame times into the bridge |

**Bridge** (`window.__GAME__`, only with `debug=1` or `test=1`): `{ ready, scene, tick, hash, summary(), run(), battle(), errors[] }`. `battle()` is the live state, for browser tests that stage a HUD case (a smaller kit, less gold); changing it gives up the hash check.

**Assertions** the script makes before saving:

1. No console errors and no page errors.
2. `__GAME__.hash` equals the hash from headless `npm run sim` with the same parameters at the same tick. This cross-checks Node against the browser.
3. The canvas isn't blank: at least 12 distinct colors in a sampled grid, and both team tints present in their home columns.
4. The HUD agrees with the state. For example, `#hud-gold` equals `summary().gold.player` and `#hud-supply` equals `summary().supply.player`. On run screens the DOM agrees with the run: the route's six rows and node icons, the draft's cards, the summary's battles, the intel bars, and on the title the wordmark, a primary button, How to play and Settings. The title holds no run or battle yet, so its hash check compares empty hashes.
5. It writes `artifacts/screenshots/<name>.png` and a matching `<name>.json` summary.

Claude then **opens the PNG with the Read tool** and checks the milestone's visual checklist. For interactive spot checks it can also open `npm run dev` in its built-in browser pane.

### 15.7 Unit test map (fast suite)

| Area | Examples of what's asserted |
|---|---|
| RNG | Fixed seeds give fixed sequences; streams are independent |
| Data | Every file validates; references resolve; maps are point-symmetric; sprite rows have the right width |
| Matrix and damage | Formula results for every type pair; tag multipliers; rounding; minimum 1 |
| Territory | Frontier-only capture; the 1.5× rule; 60-tick flip; decay; forts block; home columns never flip; a single neutral column contested by both sides |
| Economy | Stipend, loam, besieged halving, interest floor and cap, comeback formula, supply-line price |
| Buildings | Placement legality; first-spawn timing; holding at the supply cap; sell refund windows; no selling while besieged |
| Combat | Target choice, stickiness and tie-breaks; siege and slayer preferences; projectile delay; splash falloff |
| Endings | Rout; Decision tiebreakers; simultaneous Heartcap death |
| Merging (M2) | Eligibility; radius; knit cancel; HP carry; supply ⅔; presence; toggle propagation |
| AI (M4) | Analysis scores for synthetic mixes; warning and activation ticks; doctrine weights; selling for space; intel decay |
| Run (M3) | Route constraints; draft weights and exclusions; effect compilation order; rewards; save round-trip |
| Meta (M6) | Feat conditions; strain patching; trait capacity; mastery thresholds; migrations |
| Sound | The sound bank's schema and references; cooldowns per key; the voice cap and priority stealing; speed thinning; the engine as a no-op in Node; which battle events make sounds, at whose gain; settings migration |
| Settings and contrast | Older settings records load with new fields at their defaults; unknown values fall back; listeners hear each change. Every text pair the UI uses is 4.5:1 or better and every control edge 3:1 or better, read from the tokens in `styles.css` |
| Purity | No forbidden imports or globals in `src/sim`, `src/run` or `src/meta` |

---

## 16. Milestone plan

**v1 = Milestones 1–8.** Every milestone:

- leaves the game playable in the browser,
- passes `npm run verify`,
- ends with a commit summarizing the verification output.

The verification blocks below are written so Claude can run them unattended. Screenshot checks always end with Claude opening the PNGs and walking the visual checklist.

### Milestone 1 — Territory core vertical slice (one battle)

**Goal:** one playable battle that proves the core feel. Building on held ground, pushing to claim more, and forts being torn down should be fun on their own.

**Scope:**

- **Scaffold:**
  - `git init`, `.gitignore` (`node_modules`, `dist`, `artifacts`, `reports`)
  - Vite + strict TypeScript, ESLint with the sim purity rules, Vitest, tsx, Playwright
  - the GitHub Pages workflow
- **Data pipeline:**
  - zod schemas for balance, buildings, units, maps, sprites, generals (M1 subset), bots and scenarios
  - `registry.ts` and `validate:data`
- **Rendering:** text-sprite atlas baking with the Gray Rot palette swap.
- **Sim core:**
  - state, RNG streams, the command queue and log, events, stats, `hashState`, snapshot and restore
  - systems: economy (stipend, Truffle Cellar, loam, interest, comeback income, supply-line pricing), spawning (first spawn, holding at the cap, besieged), targeting, movement and separation, combat (matrix, siege, splash, projectiles), towers (including the Mortar's minimum range), Heartcap turrets, territory (frontier capture, forts, home zones), the Sporestorm, endings (Rout and Decision)
- **Content:**
  - the Bogwater Hollow map
  - the 6 M1 buildings and 4 units (§11.2–11.3) with sprites, plus Heartcaps and terrain tiles
  - the scripted general (§7.9)
  - bots: `balanced`, `rush`, `turtle`, `greedy`, `mono:<id>`
  - the internal `test-3lane` bench map
- **App:**
  - the battle screen with deploy phase and Begin
  - the building tray and a placement ghost showing legality, price and depth
  - inspect panel and selling
  - pause and 1×/2×/3× speed
  - HUD: gold and income, supply, wave and clock, Sporestorm, territory bar, Heartcap HP
  - callouts
  - an end screen with the outcome, how it was decided, and basic stats
- **Tools:** `sim`, `balance duel`, `bench`, `golden`, `screenshot`, `verify`.

**Not in M1:**

- merging (the toggle is hidden)
- drafts, the run and route
- the adaptive general
- commander powers
- meta-progression, blights, strains
- multi-lane content (the engine supports lanes; only the bench map uses 3)
- the Gray Rot roster
- the report screen

**Done when:**

- A human can play a full battle in the browser, from deploy to Rout or Decision.
- Every verification step below passes.
- The playtest gate questions have been put to the user.

**Verification:**

1. `npm run verify`. The unit suite covers the M1 rows of §15.7.
2. Golden replays are created and passing: `m1-balanced-vs-scripted-s1` and `m1-turtle-vs-scripted-s2`.
3. Headless battles:

   ```bash
   npm run sim -- --seed 1 --player bot:balanced --enemy general:scripted --hash-every 600 --assert "durationTicks<=12000" --out artifacts/sim/m1-s1.json
   npm run sim -- --seeds 1..40 --player bot:balanced --enemy general:scripted --summary
   ```

   Expect:
   - every battle ends (no crash, no stuck state, `rejectedCommands` = 0 for bots)
   - median length 5:30–8:30
   - ≤ 15% Decisions
   - the bot wins 30–70%
   - mean wall time ≤ 3 s per battle
4. Rule scenarios (each asserts exact borders):

   ```bash
   npm run sim -- --scenario fort-blocks-flip --until 600 --assert "lanes[0].pBorder@300=7" --assert "lanes[0].pBorder@600=6"
   npm run sim -- --scenario home-never-flips --until 1200 --assert "lanes[0].pBorder@1200=3"
   npm run sim -- --scenario besieged-half-speed --until 700 --assert "spawned.player.capguard@700=1"
   npm run sim -- --scenario besieged-control     --until 700 --assert "spawned.player.capguard@700=2"
   ```

   - `fort-blocks-flip`: enemy units stand in the player's border column, which holds a player building. The border holds until the building falls, then flips within 3.5 s. The scenario is authored so the building falls at about tick 400.
   - `home-never-flips`: an overwhelming enemy army sits in the player's home columns.
   - `besieged-half-speed` / `besieged-control`: a freshly placed Capguard Hall under constant harassment spawns once by tick 700 (first spawn at tick 300 instead of 150); the unharassed control spawns twice (ticks 150 and 450).
5. `npm run test:slow`: G1–G6 and G11. G2–G6 may start as *recorded* rather than asserted, but MUST be asserting and passing by the end of M1.
6. `npm run bench`: within the §13.7 budget.
7. Browser checks:

   ```bash
   npm run screenshot -- --name m1-deploy    --params "scene=deploy&map=bogwater-hollow&seed=1"
   npm run screenshot -- --name m1-battle    --params "scene=battle&seed=1&player=bot:balanced&enemy=general:scripted&ticks=3600&paused=1"
   npm run screenshot -- --name m1-end       --params "scene=battle&seed=1&player=bot:balanced&enemy=general:scripted&ticks=end&paused=1"
   ```

   The automatic assertions are listed in §15.6; this includes browser hash = Node hash at tick 3600. Visual checklist:
   - The 32×8 field fits with Heartcaps at both ends.
   - The violet mat is on the left and gray on the right; in `m1-deploy`, the neutral middle is visible.
   - 2×2 building sprites are legible, and units of both sides are clashing mid-field.
   - The frontier's capture fill is visible.
   - The HUD shows gold and income, supply, wave and clock, territory counts and both Heartcap HPs, with nothing clipped at 1280×720.
   - The end screen states the winner and whether it was a Rout or a Decision.
8. **Playtest gate (human):** the user plays 3 battles and answers:
   - Was pushing worth the risk?
   - Did losing forward buildings feel fair and readable?
   - Did battles last 5–9 minutes?
   - Is one building obviously the best?

   Tune the data before starting M2.

### Milestone 2 — Merging and combat depth

**Scope:**

- Merging per §5.5–5.6: eligibility, knitting, tiers, per-building toggles, perks, supply and presence rules.
- Bloomed and Elder visuals: tethers, glow, pips.
- Two new buildings, bringing the total to 8: Scythecap Grove (anti-swarm cleave) and Veilstalker Hollow (the Slayer that keeps merging honest), with their units and sprites.
- Hit sparks by effectiveness and the damage-numbers setting.
- The help overlay with the matrix.
- The battle report screen: front-line graph, damage by building, gold by source.
- The general and bots get merge policies.

**Verification:**

1. `npm run verify`, including the merging unit tests (§15.7) and a new golden replay, `m2-merge-mirror-s3`.
2. Scenarios:

   ```bash
   npm run sim -- --scenario merge-trio       --until 60  --flags merging --assert "merges.player.2=1"
   npm run sim -- --scenario merge-under-fire --until 200 --flags merging --assert "merges.player.2=0"
   npm run sim -- --scenario knit-cancel      --until 80  --flags merging --assert "events.knitCancel>=1" --assert "merges.player.2=0"
   npm run sim -- --scenario elder-ladder     --until 400 --flags merging --assert "merges.player.3=1"
   ```

3. Battles still land in the target band:

   ```bash
   npm run sim -- --seeds 1..40 --player bot:balanced --enemy general:scripted --flags merging --summary
   ```

   Expect a median of 5:30–8:30 and merges in at least 90% of battles.
4. `npm run test:slow`: G1–G2 with the 8-building roster, plus G7.
5. Browser checks:

   ```bash
   npm run screenshot -- --name m2-knit   --params "scenario=merge-trio&ticks=25&paused=1&flags=merging"
   npm run screenshot -- --name m2-elders --params "scenario=elder-showcase&paused=1&flags=merging"
   npm run screenshot -- --name m2-report --params "scene=report&seed=1&player=bot:balanced&enemy=general:scripted&flags=merging"
   ```

   Visual checklist:
   - The tethers and knit glow are visible.
   - Bloomed and Elder units are visibly larger, with pips.
   - Strong, normal and weak sparks are distinguishable.
   - The report shows a readable front-line graph.

### Milestone 3 — Run loop: route, drafts, relics, carryover

**Scope:**

- **Run structure:**
  - run state and the route map (§8.2)
  - starting gold that grows per battle
  - Heartcap HP carryover and repairs, Decision consequences (§6.5)
- **Drafts** (§8.3–8.4): blueprints, upgrade tracks (§11.6), relics (20), rarity, rerolls, skip.
- **The effects DSL:** the compiler plus triggers.
- **Non-battle nodes:** Grove, the 8 events, rewards (Spores are tracked even though the meta UI isn't built yet), the run summary.
- **Save and resume** at node boundaries, plus mid-battle resume by replaying the command log.
- **New content:** the Stumpfield and Twin Roots (2-lane) maps; Tender's Ring and the `healing` system.

**Verification:**

1. `npm run verify`. New unit tests cover route constraints, draft generation (weights, exclusions, determinism per seed), effect compile order, triggers, rewards, a save round-trip, and mid-battle resume hash equality.
2. Whole runs:

   ```bash
   npm run sim -- --run --seed 7 --player bot:balanced --auto-draft greedy --auto-route random --out artifacts/sim/m3-run7.json
   npm run sim -- --run --seeds 1..20 --player bot:balanced --auto-draft greedy --auto-route random --summary
   ```

   Expect:
   - every run completes
   - 4–5 battles per run
   - total *simulated battle time* per run of 22–38 min (the run-length target before menu time)
   - at least 30% of runs reach the boss
3. Two lanes:

   ```bash
   npm run sim -- --map twin-roots --seeds 1..20 --player bot:balanced --enemy general:scripted --flags merging --summary
   ```

   Expect per-lane front-line samples that diverge in at least half the battles, and median length in band.
4. Golden replay `m3-run-s7`: the hashes of every battle in the run.
5. Browser checks:

   ```bash
   npm run screenshot -- --name m3-route   --params "scene=route&seed=7"
   npm run screenshot -- --name m3-draft   --params "scene=draft&seed=7&ticks=2400"
   npm run screenshot -- --name m3-twin    --params "scene=battle&map=twin-roots&seed=2&player=bot:balanced&enemy=general:scripted&ticks=3000&paused=1&flags=merging"
   npm run screenshot -- --name m3-summary --params "scene=summary&seed=7&autoplay=run"
   ```

   Visual checklist:
   - The route rows are readable with node icons.
   - The three draft cards show type, rarity and effect text.
   - Both lanes show independent fronts.
   - The summary lists each battle's result.

### Milestone 4 — Adaptive general and intel

**Scope:**

- **The counter cycle:**
  - spawn-mix analysis and the four counter kinds (§7.4)
  - the vague telegraph: the General's Intent panel and callouts
  - doctrine activation, including drafting a missing counter and selling for space
- **Memory:** the intel file across battles (§7.6), with intel bars on the route map.
- **Generals:** the three generals and the Pale Sovereign (boss), with personalities and passives; elite modifiers; enemy kit progression (§7.8).
- **Buildings:** Hammercap Forge, Amanita Lodge (the first Heavy unit, so Anti-Armor finally has a target), Morel Warren, Rhizome Vault, Spore Exchange.
- **Report:** a "the general countered…" section.

**Verification:**

1. `npm run verify`. New unit tests cover:
   - analysis scores for synthetic mixes: all-Sporeling → Swarm, all-Amanita → Armor, Capguard- or Rootbreaker-dominant → Line, merge-heavy with a high merged fraction → Elite;
   - a merge toggle left on with no actual merges → **not** Elite;
   - warning and activation ticks (2:00 → 4:00, 5:00 → 7:00; boss 1:00 → 3:00);
   - the intel update rule;
   - dual-doctrine weights.
2. Counter kinds fire as expected:

   ```bash
   npm run sim -- --seed 4 --player bot:mono:sporelingBurrow --enemy general:mother-mold --flags merging,adaptive --assert "counters[0].kind=swarm" --assert "counters[0].warnedAt=2400" --assert "counters[0].activeAt=4800"
   npm run sim -- --seed 4 --player bot:mono:amanitaLodge    --enemy general:lichen-baron --flags merging,adaptive --assert "counters[0].kind=armor"
   ```

3. Adaptation matters (G8):

   ```bash
   npm run sim -- --seeds 1..30 --player bot:mono:sporelingBurrow --enemy general:lichen-baron --flags merging          --summary
   npm run sim -- --seeds 1..30 --player bot:mono:sporelingBurrow --enemy general:lichen-baron --flags merging,adaptive --summary
   ```

   Expect the mono bot's win rate to drop by at least 20 points. `npm run test:slow` asserts G8 for every mono bot.
4. Memory across a run:

   ```bash
   npm run sim -- --run --seeds 1..20 --player bot:mono:sporelingBurrow --auto-draft greedy --flags merging,adaptive --summary
   ```

   Expect the battle-2+ opening doctrine to be Swarm in at least 80% of runs, and the boss to run a dual doctrine.
5. Browser checks:

   ```bash
   npm run screenshot -- --name m4-telegraph --params "scene=battle&seed=4&player=bot:mono:sporelingBurrow&enemy=general:mother-mold&flags=merging,adaptive&ticks=2420&paused=1"
   npm run screenshot -- --name m4-intel     --params "scene=route&seed=4&autoplay=battles:2"
   ```

   Visual checklist:
   - The Intent panel shows the general, the SWARM icon and a "2 waves" countdown, and never names exact units.
   - The route map shows intel bars.

### Milestone 5 — Commanders and powers

**Scope:**

- The commander select screen.
- Vesper, Armilla and Cordis, each with a passive, a power, a core pool and a starter kit (§11.10).
- Bans (up to 3).
- Power UX: `Q` then click, a cooldown ring, and targeting while paused.
- Powers enabled for the player's controller in sims through `--power-policy auto`.

**Verification:**

1. `npm run verify`. New unit tests cover each power's effect, cooldown, first-ready time and targeting validation; ban filtering; core-pool weighting.
2. Powers take effect:

   ```bash
   npm run sim -- --seed 3 --player bot:balanced --commander armilla --power-policy auto --flags merging,adaptive,powers --assert "stats.player.powerCaptures>=1"
   npm run sim -- --seed 3 --player bot:balanced --commander cordis  --power-policy auto --flags merging,adaptive,powers --assert "stats.player.powerMerges>=1"
   ```

3. A commander tournament (`npm run balance -- tournament --commanders all --seeds 30`): no commander's run win rate is more than 15 points above another's.
4. Browser checks: `m5-commander-select` (`scene=underroot&tab=commanders`) and `m5-power-targeting` (`scenario=power-demo&targeting=1&paused=1`).

   Visual checklist:
   - The three commander cards show the passive, power and starter kit.
   - The targeting reticle and radius are visible on the field.

### Milestone 6 — Meta-progression

**Scope:**

- The profile and the Underroot screens.
- Spores and Amber.
- At least 15 feats with the condition DSL.
- 12 strains with Amber ranks.
- 12 traits and Root Capacity.
- Commander mastery: 10 levels × 3 commanders, including the exclusive buildings (Velvet Shrine, Rootgate, Puppet Pod) and alternate powers.
- Save export/import and a migration framework.

**Verification:**

1. `npm run verify`. New unit tests cover:
   - feat conditions against synthetic stats
   - strain patch application (whitelisted fields only)
   - capacity enforcement, including 0-cost drawback traits
   - mastery thresholds and XP math
   - a migration fixture (`profile-v1.json` → current)
   - export → import round-trip
2. Unlock pacing against §9.8:

   ```bash
   npm run sim -- --meta-progress --runs 40 --bot balanced --out artifacts/sim/m6-meta.json
   ```

   Expect the first unlock by run 2, about 50% of content by run 15, and the remainder by about run 45.
3. `npm run test:slow`: G9 (the meta power ceiling).
4. Browser checks: `m6-traits`, `m6-strains`, `m6-feats` and `m6-mastery` (`scene=underroot&tab=…&profile=fixture:mid`).

   Visual checklist:
   - The capacity meter shows the right value.
   - Strain cards show their patch summary.
   - Locked feats show the condition text.

### Milestone 7 — Gray Rot, blights, content and polish

**Scope:**

- The distinct Gray Rot roster (10 buildings, §11.12) with sprites; generals switch over to it.
- Six blights and Decay (§11.8), Decay reward multipliers, and the best Decay per commander.
- The Three Hollows (3-lane) map.
- Relics brought up to at least 20.
- A colorblind palette check: simulate deuteranopia and protanopia on screenshots.
- First-run tutorial hints.

**Verification:**

1. `npm run verify`, with new unit tests for each blight's effect and Decay math.
2. `npm run test:slow`: G10, plus G1–G3 re-run against the Gray Rot roster.
3. All maps:

   ```bash
   npm run balance -- tournament --maps all --seeds 30
   ```

   Expect every map's median length in band and no map with more than a 65% win rate for either side in mirror bot matchups.
4. Browser checks: `m7-gray-rot`, `m7-three-hollows`, `m7-blights`, and colorblind-filtered copies of `m7-three-hollows` (`--filter deuteranopia|protanopia`).

   Visual checklist:
   - The factions stay distinguishable under both filters.
   - The 3-lane map fits at 1280×720.

### Milestone 8 — Release candidate

**Scope:**

- A render performance pass.
- The settings screen. (Built early with the UI/UX plan's Phase 3: §10.5.)
- Light juice: spawn and death puffs, optional screen shake. (Built early with Phase 3: puffs are spores, and the shake is a setting, §10.4.)
- A Firefox determinism check.
- The final balance tournament and tuning.
- A README with how to play.
- GitHub Pages deployment.

**Verification:**

1. `npm run verify` and `npm run test:slow` both pass, with every guardrail asserting.
2. `npm run build`: shipped JS + data ≤ 300 KB gzipped (the build prints the size).
3. `npm run bench` passes. A render benchmark (`npm run screenshot -- --name m8-perf --params "scenario=bench-300&test=1&measure=frames"`) reports a p95 frame time ≤ 8 ms.
4. A cross-engine check: `npm run screenshot -- --browser firefox --name m8-ff --params "<the m1-battle params>"` gives the same hash as Node and Chromium.
5. Production preview screenshots of every screen; Claude reviews all of them.
6. Deployment: the user creates the GitHub repository and enables Pages, and Claude verifies that the workflow run succeeds and that the live URL loads (built-in browser pane screenshot).

---

## 17. OUT OF SCOPE for v1

These are explicitly **not** built in v1 (Milestones 1–8). Anything here needs a spec change first.

**Platform and online**

1. Multiplayer of any kind (PvP, co-op, async), online leaderboards, accounts, cloud saves, any backend, analytics or telemetry.
2. Phone layouts, touch controls and gamepad support. v1 is desktop mouse + keyboard only; tablets may work but aren't tested.
3. Desktop or Steam packaging, and PWA/offline install.
4. Cross-browser determinism guarantees beyond Chromium and Firefox. Safari is supported for play but isn't hash-verified.

**Gameplay**

5. A second playable faction or faction selection. The Gray Rot is enemy-only.
6. Direct unit control: rally points, formations, unit-activated abilities. (Per-lane Hold / Advance was adopted on 2026-10-28, §5.2.)
7. Flying units, anti-air, burrowing, and any terrain that changes movement except root walls.
8. Pathfinding, and unit collision with buildings.
9. Fog of war, and any hidden information beyond the general's vague telegraph.
10. Procedurally generated battle maps. Maps are hand-authored; only the route is generated.
11. Core placement-synergy rules such as adjacency bonuses. Specific relics like Mycorrhizal Link may reference adjacency.
12. In-battle tech research or in-place building upgrades. Upgrades come only from drafts, Groves and events.
13. Active powers for enemy generals.
14. Difficulty tiers (Easy/Normal/Hard). Difficulty is the honest baseline plus blights.

**Progression and content**

15. The full blight ladder (more than 6 blights), ranked or seasonal challenges, a daily-seed UI, and seed sharing.
16. Cosmetics: skins, palettes, badges, titles, a cosmetics shop.

**Presentation and tooling**

17. A replay viewer UI. Command logs exist only for tests and resume.
18. Audio of any kind. The per-tick event stream is designed so adding SFX later is easy.
19. Localization (v1 is English only), and screen-reader support beyond semantic DOM.
20. Art beyond text-defined sprites: no PNG or Aseprite pipeline, and no animations beyond 2-frame cycles.
21. Modding tools, or loading custom content in-game. The data is plain JSON, but there's no loader UI.

---

## 18. Defaults chosen without asking, open questions, tuning knobs

### 18.1 Defaults chosen without asking

The interview didn't cover these. Each is a deliberate default that's easy to change.

| # | Default | Why |
|---|---|---|
| D1 | A "wave" is a 60 s beat of the battle clock | Spawns run on per-building timers, so drafts and counter cycles need a shared beat |
| D2 | Drafts at waves 2/4/6/8, pausing the sim; skipping gives +40 gold | About 3 drafts per battle and ~12 per run, matching the run-length target |
| D3 | Heartcap damage persists across a run; a Decision loss costs 25% of max HP; the run ends at 0 | Attrition makes every battle matter and makes route choices (Groves) meaningful, without one Decision loss ending a run |
| D4 | Gold doesn't carry between battles | Keeps battles self-contained, which also makes them easy to balance and simulate |
| D5 | Every v1 building is 2×2; units don't collide with buildings; no pathfinding | Readable sprites, a scarce grid, and a cheap, deterministic sim |
| D6 | Home zone of 4 columns on Bogwater Hollow, rather than the "~6" floated in the interview | With 8-row lanes, 6 columns would hold almost every building a battle needs, and pushing would stop mattering |
| D7 | Presence is weighted by supply, so merged armies claim ground more slowly | Gives merging a real cost and ties it to territory |
| D8 | Besieged buildings run at 50% speed instead of stopping | One harassing archer shouldn't shut a building down completely |
| D9 | Telegraph lead of 2 waves; analyses at 2:00 and 5:00; four counter kinds; Elite is read from *actual* merges, not toggles | A vague warning needs few, legible kinds, and default-on toggles would otherwise always read as Elite |
| D10 | No fog of war: the general's buildings are visible, and only its intent is vague | Keeps counterplay fair and readable |
| D11 | The general may draft a missing counter blueprint at warning time | It counter-builds even with a thin kit, and it still never cheats on gold or stats |
| D12 | The Sporestorm also makes Heartcaps take +10% damage per stack, on top of weakening turrets | Ensures stalemates break before the Decision clock in most battles |
| D13 | Generals get a passive but no active power | Their adaptation is their signature |
| D14 | Active pause with full building and selling; 1×/2×/3× speeds | Strategy over APM for a single-player game |
| D15 | Desktop only, no audio in v1 | Focus on proving the gameplay first |
| D16 | Milestone 1's enemy is a gray mirror of the Velvet Bloom roster; the distinct Gray Rot roster comes in M7 | The smallest slice that still has a real opponent |
| D17 | Interest: +1 per 20 banked, capped at 10. Comeback: +1 per 2 columns behind per income tick, capped at 6. | Noticeable but not dominant; the Sporestorm punishes banking passively |
| D18 | Selling refunds 100% during deploy or within 10 s before a building produces units, gold or a shot; otherwise 60%; no selling while besieged | Forgiving for misclicks, prevents free-production cycles, and blocks selling a building just before it dies |
| D19 | One input per meta system: feats unlock content, Spores buy traits and capacity, Amber buys strain ranks, XP feeds mastery | Four systems without currency soup |
| D20 | Spores are kept on failed runs | Progress never feels wasted |
| D21 | Route: pick one node per row, fully connected | Simpler than a path graph and still a real choice every step |
| D22 | Maps must be point-symmetric | Fairness for an honest AI |
| D23 | 20 Hz sim; zod is the only runtime dependency; no UI framework | Cheap headless runs and a small bundle |
| D24 | The enemy's kit grows with the battle index; elite nodes add modifiers | Difficulty rises over a run while the AI stays honest |

### 18.2 Open questions for playtesting

1. Is a 3 s capture with a 1.5× presence ratio the right pace for pushes?
2. Does the Sporestorm end battles satisfyingly, or abruptly?
3. Do players feel forced to leave merging on? (G7 measures this; watch human behavior too.)
4. Is the vague telegraph enough information? An opt-in "answer card" assist (the interview's rejected alternative) could be a future accessibility setting.
5. After v1: a second playable faction? A daily-seed mode (the infrastructure is already deterministic)?
6. Should more relics and events bend territory rules (e.g. "the first column you lose each battle doesn't flip")?

### 18.3 Tuning knobs: where to turn first

| Symptom | First knobs (all in data) |
|---|---|
| Battles run long or end by Decision too often | `sporestormStartSeconds`, Heartcap HP, turret damage, `captureSeconds` |
| Battles snowball | `comebackMax`, `supplyLinePerColumn`, `homeCols`, turret range |
| Swarm play dominates | `supplyCap`, Sporeling HP and spawn interval, Scythecap splash |
| Merging feels mandatory | `tierStatMult` 2.5 → 2.3, the slayer multiplier, merged presence |
| Merging feels pointless | `tierStatMult` 2.5 → 2.7, `mergeKnitSeconds`, `mergeRadius` |
| The general feels unfair | Counter weight ×3 → ×2.5, warning lead 2 → 3 waves |
| Economy builds dominate | Truffle `goldPerTick`, `interestCap`, the loam bonus |
| Forward forts are too strong | `besiegedRate`, the siege multiplier, `supplyLinePerColumn` |

*End of specification.*
