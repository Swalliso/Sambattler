# SPORE & SPRAWL — Game Specification (v2)

> Working title. A browser-based, single-player, round-based lane auto-battler with roguelite runs and persistent meta-progression.
> Status: v2 draft of 2026-10-31, written after the combat rework's P3 playtest. v1, from the design interview of 2026-10-24, stays readable at <https://github.com/Swalliso/Sambattler/blob/aa37365/SPEC.md>. Until Milestone R2 lands, the code follows v1 (Milestones 1–5) and the combat rework's `?proto=` prototypes. The rules are here; the docs this spec links hold the reasoning, the research and the measurements.

---

## 0. How to read this document

| Sections | Contents |
|---|---|
| 1–3 | Pitch, pillars, the decision records, theme, overall structure |
| 4–6 | Battle rules (map, colony and plots, rounds, buildings, units, merging, the shape language, economy, endings) |
| 7 | The enemy general (AI) |
| 8–9 | Run structure (lives, the kit), then meta-progression |
| 10 | Controls, UI layout (including the planning screen) and feedback |
| 11 | Content tables with first-pass balance numbers, and first examples of augments, combos and run packs |
| 12 | Balance method and targets |
| 13–14 | Technical architecture and data model |
| 15 | Testing and verification tooling |
| 16 | Milestone plan (M1–M5 as built under v1, then R1–R4 and M6–M8), with verification for every milestone |
| 17 | OUT OF SCOPE |
| 18 | Defaults chosen without asking, open questions, tuning knobs |
| Appendix A | Retired v1 systems: what each was, what replaced it, and why |

Coming from v1? Read §0.1 first, then §1.3 and §4.7.

Conventions:

- **MUST / SHOULD / MAY** are normative.
- Every number in this spec is a *first-pass* value. Numbers live in data files (§14), never in code, and are tuned with playtests and the headless balance tools (§12, §15). Numbers new in v2 are first guesses from §1.3 until their milestone puts them in the data (§16).
- **Open:** marks a rule the user hasn't decided. §18.2 lists every one.
- Time in data files is written in **seconds**. The loader converts it to integer **ticks** (20 ticks per second), and ticks run only during a clash (§4.2). Distances are in **tiles**.
- Rounds are numbered from 1 within each battle. The **battle index** numbers the battles of a run from 1.
- "Player" means the human side (left, violet). "Enemy" or "general" means the AI side (right, gray). The rules are symmetric unless stated otherwise. The main exception is the order of planning: the general plans first, and the player plans seeing its army (§7.1).
- **v1 and v2** are versions of this spec. Where a passage kept from v1 says what "v1 ships", or titles a table "(v1)", it means the game's first full release, through Milestone 8 (§16).
- **Links into `docs/archive/v1/` are background:** the v1-era reasoning, research and evidence behind a v2 rule. They aren't rules, and where an archived doc and this spec differ, this spec wins. Research on other games that still applies is in `docs/research/`.
- **Section numbers are fixed.** v2 keeps every v1 section number, because the code cites sections by number (for example `SPEC §7.4`).
  - A v1 subsection whose system v2 retires stays as a short stub under its old number and title, marked "(retired in v2)". The stub says what replaced the system and points to Appendix A. The retired system's code remains until milestone R2 removes it.
  - A new subsection takes the next free number in its section (for example §4.6, §5.8, §8.10).
  - The numbered items in §17 and §18.2 keep their numbers. A removed §17 item is marked "(removed in v2)", and a settled §18.2 question "(closed in v2)", each with one line on why. New items are appended.

### 0.1 What changed in v2

v2 rebuilds the battle around rounds and keeps most of the rest. The decisions are the user's, made on 2026-10-31 after the combat rework's P3 playtest, and §1.3 records them.

**New:**
- **Rounds.** A battle is a series of rounds against one general: planning with the clock stopped, a live clash of both whole armies, then a short aftermath in which the winner's survivors damage the loser's Heartcap (§4.2, §4.7, §6.7).
- **A Heartcap race each battle, and lives for the run.** Both Heartcaps start every battle full. A lost battle costs one of 3 lives, and a won battle never costs one (§4.5, §6.5, §8.5).
- **The general plans first,** and you see its whole colony and the army it will field before you plan (§7.2, §7.5).
- **The colony is the formation.** Buildings stand on fixed 2×2 plots, and a plot's rank and file set where its squad stands. The colony gains plots over a run, and map terrain (loam and stumps) moves into it (§4.6, §11.9).
- **A kit of building cards with copies.** Plots and copies are the build limits, and the supply cap goes (§4.4, §8.10).
- **Six core archetypes,** with the rest of the roster unlockable (§11.2).
- **Augments and combos.** Augments change how a building's units play and replace upgrade tracks. Combos reward placing in front of, behind and beside. Built up, they can flip a matchup, at a real cost and in plain view (§11.13, §11.14).
- **Run packs.** Each run deals 4 of 10 themed packs into its draft pool (§8.4, §11.15).
- **The shape language.** Body size shows armor, each archetype has a silhouette of its own, pips mark merges and icons mark augments. Units carry no weapon mark (§5.8).
- **Milestones R1–R4** (the clash check, rounds, the kit, readable armies) come before M6–M8, which are rewritten for v2 (§16).

**Retired** (each has a row in Appendix A):
- **The live battle:** spawn timers, v1's 60 s wave, the rework's waves on a 20 s beat, placing while the battle runs, Hold / Advance and call for help.
- **Territory:** column capture, borders and frontiers, presence, forward building and the supply-line cost, besieged spawners and the front-line graph.
- **The Heartcap's defenses and clock:** Heartcap turrets and the 10:00 time limit. A Decision now comes after round 9.
- **Limits and hints:** the supply cap of 60 and the general's vague telegraph.
- **The run-long Heartcap:** HP no longer carries from battle to battle, so v1's repairs lose their target. The Grove regains a life instead (§8.7).
- **Two exclusions:** §17 #7 (flying and burrowing) and #11 (placement synergy) are removed.

**What stays:** the theme and names, the route and its nodes, the damage matrix and tags, merging's rule, the general's memory, commanders, relics and events (some with new effects), meta-progression's systems, determinism and the tech stack.

**Why.** The user played the combat rework (`?proto=rework`) on the dev site on 2026-10-31 ([P3 notes](docs/playtest-feedback.md#2026-10-31-p3-the-combat-rework-the-user)). Some areas felt better, but the game still lacked the "just one more run" pull, and the notes pointed at the structure rather than the tuning:
- **Units** were hard to tell apart, and knowing which unit counters which meant reading long descriptions.
- **The opener felt like gambling:** "you don't know if your opponent is going to bum rush you with a big sporeling swarm or if they're going to build economy buildings first."
- **Waves** mixed real time with turns. The user suggested a build phase, then a fight phase.
- **Placement didn't matter:** the player filled the home zone from the top left down.
- **Close calls left no mark.** The battles weren't too easy, but the run summary showed the Heartcap at 3000 → 3000 in all four battles.
- **The spec and the tests:** the user wondered whether following v1 and its older tests too closely was limiting what got tried. In v2, tests follow the spec (§1.3 #13).

The measurements agree ([docs/archive/v1/ideas/after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md) and its folder):
- under the rework, the best plot was worth about 5% of a building more than the median one;
- two playtests found forward building not worth it (F1), and testers found column capture awkward or confusing (F6);
- the side holding more ground at 2:00–4:00 went on to win only about 40% of the time;
- the winner's Heartcap was almost never hit, so the run's Heartcap was all or nothing: 92% of battles started at full HP;
- of about 155 earlier fun recommendations, the only rule change that shipped was Hold / Advance.

**Open:** §18.2 lists every undecided rule, with its first guess, its section and the milestone that settles it. The main ones:
- the sixth core archetype (first guess: the Burster Pod; the alternative is the Puffball Mortar as an emplacement), and the core six as a whole;
- how the colony gains plots (first guess: +1 per battle won, up to 4 more);
- whether an augment attaches to a building type or to one card (first guess: the type, for the run);
- a bonus for a clean win (not adopted);
- whether losing the boss battle ends the run (first guess: yes, as in v1);
- an in-world name for lives (§2);
- what milestone R1's clash check settles: squad sizes, how an emplacement fights (§6.7), whether mixed armies need the rework's mixed-wave shields, and the Elder Sporeling's splash.

---

## 1. Pitch and pillars

**Pitch.** Beneath an old forest, two fungal colonies war over the soil. A battle is a series of rounds against one enemy general. Each round the general plans first, and you see its whole army before you plan. Then, with the clock stopped, you plant fruiting-body buildings from your kit on the plots of your colony, and where a building stands is where its squad stands: shield walls in front, archers behind, economy at the back. Both whole armies then appear at once and fight on their own, and the winner's survivors damage the loser's Heartcap. Each battle is a race between two Heartcaps, and a lost battle costs one of the run's lives, not the whole run. Three identical units that meet away from the fighting knit into one stronger veteran. The general answers what you fielded, in the open, and keeps an intel file on you for the whole run. A run is a short campaign of battles in which your colony sprawls over more plots, and a few core archetypes become a build of your own through augments, combos and relics. Between runs you unlock new buildings, strains, commanders, colony traits and blights.

**Pillars** (the tie-breakers for every design decision):

1. **See it, answer it.** The general shows its army before you plan, and a unit's job reads from its shape, not from a paragraph.
2. **Your colony is your army.** Where you plant a building is where its squad stands. Plots are scarce, and your colony grows over a run (that's the "sprawl").
3. **A few archetypes, built differently each run.** Six core archetypes. A run builds on them with augments, combos and relics, unlocked over runs or found during one.
4. **The general adapts and remembers, in the open.** It answers what you fielded, visibly, and keeps its intel file on you across the run.
5. **Deterministic and testable.** The simulation is pure logic: same seed and same inputs give the same battle, in Node and in the browser.

v1's pillars *Territory is build space* and *Three become one* no longer break ties: territory is retired (Appendix A), and merging stays as a rule (§5.6). *Every run asks something new* lives on in pillar 3.

**What keeps it its own game.** Rounds move the game toward Mechabellum, and plots and lives toward 9 Kings ([docs/archive/v1/ideas/rounds.md](docs/archive/v1/ideas/rounds.md), "Identity"). Four things keep it apart:
- **The opponent** is one general that plans in the open, answers what you fielded and remembers you across the run, not another player or a fixed deck.
- **The army is a colony.** Each building fields a squad, and the colony's layout is the formation.
- **Units grow on the field.** Three become one, and neighbors make Elders.
- **The theme carries the tools:** spore clouds, burrowing Rhizomorphs, Bursters and the Sporestorm.

### 1.1 Genre pitfalls and how this design counters them

| Pitfall | Countermeasures (section) |
|---|---|
| Runs get repetitive once you find a dominant build | The general answers what you fielded, in the open (§7.4, §7.5), and its intel file carries across the run (§7.6); its kit grows each battle, with augments (§7.8); a campaign of different maps and generals (§8); each run deals the commander's core, an always-in set and 4 of 10 random themed packs, plus bans (§8.4, §11.15); builds made from augments, combos and relics (§11.7, §11.13, §11.14); strains, feats and the unlock ladder (§9); blights (§9.6) |
| One cheap unit spammed beats everything | Copies: each kit card has only so many, so massing the cheapest spawner is impossible by construction (§8.10); scarce plots (§4.6); 3×3 damage/armor matrix plus Splash/Slayer/Siege tags (§5.3); area damage, spore clouds and cleave punish an army that starts packed (§5.3); the always-in set holds an answer to the swarm (§8.4); general's Anti-Swarm doctrine (§7.4); value budget per supply (§11.4) |
| Hundreds of units tank the frame rate | No supply cap, so plots and copies bound the army: squad sizes and the most plots a colony can hold MUST keep a full colony inside the budget, at most 150 live units a side when the armies arrive, checked on the bench (§4.4, §13.7); merging removes entities; spatial hash plus staggered retargeting; 20 Hz sim with render interpolation, ticking only during a clash; atlas rendering; a benchmark gate in every milestone (§13.7, §15) |
| *Seen in v1:* the opener is a guess (will the general rush, or build economy?) | The general plans first, and you see its whole colony and the army it will field before you plan: squad types, formation, merges and augments (§7.2, §7.5); planning has no time limit (§4.2); copies are fixed, not a random hand, so the answer you own is always there to plant (§8.10); a general's kit can show on its route node (§7.5) |
| *Seen in v1:* placement doesn't matter | The colony is the formation: a plot's rank sets front or back, and its file sets the place across the lane (§4.6); plots are scarce, and economy buildings leave holes in the line (§4.6); combos reward placing in front of, behind and beside (§11.14); loam and stump plots shape each map's colony (§4.1, §11.9) |
| *Seen in v1:* armies can't be read without a wall of text | The shape language: body size shows armor, pips mark merges and icons mark augments, on both sides (§5.8, §10.4); cards and the planning screen show matchups as marks, not paragraphs (§10.2, §10.4); six core archetypes with distinct silhouettes, and the rest unlocked a few at a time (§11.2, §9); a build may flip a matchup, but the shape never lies (§5.8) |
| *Seen in v1:* one lost battle erases the run | A lost battle costs one of 3 lives, and a won battle never costs one (§6.5, §8.5); both Heartcaps start every battle full (§4.5); the Grove can regain a life (§8.7) |
| Stalemates | Every clash ends: at 45 s, the side with more surviving supply in a lane wins it, and its damage counts only the difference (§6.7); the Sporestorm raises round damage from round 5 (§6.4); a Decision by damage dealt after round 9 (§6.5); targets of a median of 6–8 rounds, with at most 15% of battles reaching round 9 (§12.3) |
| Snowballing | Nothing carries between rounds but the colony and gold, so every squad is fielded fresh (§4.7); only survivors deal damage, so a close loss costs little, and a cap on each round's damage means no Heartcap falls to one bad round (§6.7); income doesn't reward winning a round, and the loser gets +40 gold (§6.2); the two Heartcap bars show who's winning, and a battle can swing back (§4.5, §10.2) |

### 1.2 Interview decisions (record)

The design interview of 2026-10-24 settled these, and Hold / Advance joined on 2026-10-28. The table stays as the record. The last column says what became of each decision in v2 (kept, changed or retired) and where to read more. Some numbers in the record predate later tuning in the data: the Sporestorm's start (now 4:00, `sporestorm.startSeconds` 240), the column flip (now 2 s, `captureSeconds`) and the merge multiplier (now ×2.8, `tierStatMult`).

| Topic | Decision | In v2 |
|---|---|---|
| Battle flow | Continuous real-time battle. Each building spawns on **its own timer**. A "wave" is a 60 s beat of the battle clock that drives drafts, interest, the Sporestorm and the general's counter cycles. | **Changed:** a battle is a series of rounds of planning, clash and aftermath (§4.2, §4.7). Spawn timers and the wave are retired, and drafts, interest, the Sporestorm and the counter cycle count rounds (Appendix A). |
| Run shape | Campaign of 4–5 short battles (~6–8 min each) on a branching route, ending at a boss general | **Kept** (§8.2). A battle now targets a median of 6–8 rounds (§6.5). |
| Run length | 25–35 min | **Kept** (§8.2), if planning averages about 30 s a round. |
| Theme | Fungal colonies: the Velvet Bloom (player) vs the Gray Rot (enemy) | **Kept** (§2). |
| Map shape | Lane count is a per-map property (1–3 lanes). Milestone 1 ships one wide lane. | **Kept** (§4.1). Each lane is its own clash (§6.7), and map terrain moves into the colonies (§11.9). |
| Claiming ground | Column tug-of-war per lane: the column next to your border flips after 3 s of you out-muscling the enemy there (presence ≥ 1.5× theirs) | **Retired** with territory (§4.3, Appendix A). Heartcap damage per round is the score (§6.7). |
| Overrun | Buildings are forts: a column can't flip while an enemy building stands in it. Siege units deal bonus damage to structures; damaged buildings spawn at half speed. | **Retired:** buildings aren't in clashes and can't be hit (§4.4, §4.6). Siege units count double toward Heartcap damage instead (§6.7). |
| Snowball brakes | All four: safe home zones, Heartcap defenses, supply-line cost, comeback income | **Changed:** comeback income stays, as +40 gold to each round's loser (§6.2). The other three go with territory (§4.5, §6.3, Appendix A). Fresh squads each round and the per-round damage cap are the new brakes (§4.7, §6.7). |
| Merge rule | Out of combat, anywhere: 3 identical units within 1.5 tiles, none of which dealt or took damage in the last 2 s, knit for 1 s into one unit | **Kept** (§5.6). Squads set to merge knit as the clash opens, before anyone moves (§5.6). |
| Merge power | Sidegrade: ×2.5 HP and damage per tier, ⅔ the supply of its parts, a role perk; a per-building merge toggle. Tiers: base → Bloomed → Elder. | **Kept** (§5.5, §5.6); the data has since moved to ×2.8 (§5.5). The toggle is set in planning, with a preview, and pips mark tiers instead of a bigger body (§5.8). |
| What the general reads | Your buildings' spawn mix (weighted by spawn rate and merge toggles) | **Changed:** the squads you actually fielded in earlier rounds (§7.4). |
| Telegraph | Vague: you learn that a counter is coming and its broad kind (Anti-Swarm / Anti-Line / Anti-Armor / Anti-Elite), not the exact units, 2 waves ahead | **Retired:** you see the general's whole army before you plan (§7.5). Its counters still come, as new buildings in its colony (§7.4). |
| Income | Heartcap stipend, gold buildings, rich-loam tiles, interest on savings, comeback income | **Changed:** paid once a round: the stipend, Truffle Cellars (+50% on loam plots), interest and comeback gold (§6.2). |
| Anti-spam | Supply cap plus the armor/damage matrix | **Changed:** copies and scarce plots replace the supply cap, beside the matrix (§4.6, §5.3, §8.10). |
| Counters | 3×3 matrix (Slash/Pierce/Crush × Light/Medium/Heavy) plus Structure armor plus role tags | **Kept** (§5.3). Pinning, spore clouds, cleave and bursts join it, and the shape language shows it (§5.8). |
| Stalemates | Sporestorm from 5:00 plus a Decision at 10:00 (more territory wins, reduced rewards) | **Changed:** a 45 s limit on each clash, the Sporestorm from round 5, and a Decision by damage dealt after round 9 (§6.4, §6.5, §6.7). |
| Battle start | Fresh map each battle with a paused deploy phase; starting gold grows each battle; blueprints, upgrades and relics carry over | **Changed:** each battle still starts on a fresh map, with starting gold growing each battle (§6.1), and round 1's planning replaces the deploy phase (§4.7). The kit, augments and relics carry over, and the colony keeps the plots it has gained (§4.6, §8.10). **Open:** whether planted buildings carry to the next battle (first guess: no, each battle starts with an empty colony; §4.6). |
| Enemy memory | Shared intel file: each new general opens against what you fielded last battle; the boss reads your whole run | **Kept** (§7.6). |
| Meta-progression | Building strains (Hades-aspect style), feat unlocks, a colony-trait loadout under a Root Capacity budget, and commander mastery | **Kept** (§9). The unlock ladder also gates the roster beyond the six core archetypes, and feats tied to columns are rewritten (§9.2). |
| Draft pool | Commander core pool plus a shared unlocked pool; ban up to 3 buildings per run | **Changed:** the commander's core, an always-in set and 4 of 10 random themed packs. Bans stay (§8.4, §11.15). |
| Difficulty | Honest AI (same rules, no cheats) at one tuned baseline; a small set of blights after the first win; the full ladder later | **Kept** (§7.1, §9.6). The general now plans first, so the information edge is the player's by design; enemy income is a data value that a blight may raise (§17 #14). |
| Power curve | Rare broken runs are allowed but can't be forced every run | **Kept** (§12.1). Augments and combos may flip a matchup, at a real cost and in plain view (§5.8). |
| Battle info | Clean field, rich inspection: hit sparks tinted by effectiveness, callouts, a post-battle report with a front-line graph | **Changed:** the clean field and rich inspection stay. The shape language, pips, augment icons, combo highlights and matchup marks join them, and the front-line graph goes with territory (§5.8, §10.4). |
| Unit control | Per-lane **Hold / Advance** (adopted 2026-10-28, §5.2): units advance by default, and a held lane gathers at a rally line behind its border. The commander's one active power is the other timing tool. | **Retired:** both whole armies start each clash at once, which is what Hold was for (§5.2, Appendix A). The commander power is the one live action, at most once per clash (§6.6). |
| Milestone 1 | Territory core only, one battle, scripted general | **Kept** as history: built under v1 (§7.9, §16). |
| Art | Text-defined pixel sprites in data files, baked to a canvas atlas at startup | **Kept** (§14.3, §17 #20). Each archetype MUST have a distinct silhouette (§5.8). |

### 1.3 v2 decisions (2026-10-31)

The user made these decisions on 2026-10-31, after the P3 playtest (§0.1). They are the base of v2, and the sections in the last column carry the detail. Numbers are first guesses, tuned like every number in this spec. A rule marked **Open:** is undecided and listed in §18.2. Other sections cite a decision here as §1.3 #N. §18.1's defaults, numbered D1 onward, are a separate list.

| # | Topic | Decision | Sections |
|---|---|---|---|
| 1 | Battles are rounds | A battle is a series of rounds against the same general, each in three phases. **Planning:** the clock is stopped, with no time limit, and placing happens only here. **Clash:** live; both whole armies appear on the same tick, in formation, and fight to the end. A lane's clash ends when one side has no units left in it; at 45 s the side with more surviving supply in the lane wins it, and its damage counts only the difference (§6.7 has the edge cases, emplacements included). **Aftermath:** a short animation, not simulated, in which the winner's survivors damage the loser's Heartcap: 25 per supply left in each lane (merged units count their own supply, and siege units count double for damage only), and no round deals more than 500 (§6.7 gives the order of the arithmetic). From round 5 the Sporestorm raises round damage 20% a round, up to ×2.0 at round 9. The commander power is the one live action, at most once per clash. Nothing carries between rounds except the planted colony and gold. | §4.2, §4.7, §6.4, §6.6, §6.7 |
| 2 | Heartcaps per battle, lives for the run | Each battle is a Heartcap race. Both Heartcaps start full: yours at 3000, the general's at 2000 + 250 × (battle index − 1), the boss's at 3600. A lost round chips yours, a won round chips the general's, and the two bars show who's winning. A battle ends when a Heartcap reaches 0, or after round 9 by **Decision**: the side that dealt more Heartcap damage in the battle wins, with half rewards. Target: a median of 6–8 rounds, with at most 15% of battles reaching round 9. The run has 3 lives: a lost battle costs one, a won battle never does, and the run ends at 0. The Grove's repair becomes "regain a life", Mending Moss gets a new effect that heals within a battle (first guess, §11.7), and other repairs are retired. The user: losing Heartcap in a battle you win "feels like punishing a player for succeeding". **Open:** whether losing the boss battle ends the run (first guess: yes, as in v1), and a bonus for a clean win. | §4.5, §6.5, §8.5, §8.7, §11.7 |
| 3 | The general plans first, and you see its whole army | At the start of each planning phase the general takes its income, applies any due doctrine or counter change, buys from its kit and plants. Then you plan, seeing its whole colony and the army it will field: squad types, formation positions, merges and augments. It never sees what you plant in the same phase; it reacts to what you fielded in earlier rounds. It has the same gold, income rules, prices, kit, copy and plot rules (its kit for each battle is §7.8's, and its plots are §4.6's), and no extra gold for going first (the user: "it should just be the default"), so the information edge is the player's by design. The vague telegraph is retired, and counters show as new buildings in its colony. Its kit can show on its route node. There is no Easy / Normal / Hard (§17 #14). | §7.1, §7.2, §7.4, §7.5, §7.8 |
| 4 | No column fight; the colony is the formation | Column capture, borders, frontiers, presence and forward building are gone, and Heartcap damage per round is the score. The colony is your home zone, divided into fixed 2×2 plots: 8 on one-lane maps (2 ranks × 4 files) and 6 per lane on Twin Roots (2 ranks × 3 files). In a clash each squad stands in its building's plot's slot of a formation box set in the middle of the lane: the plot's rank sets front or back, and its file sets the place across the lane. Buildings aren't in clashes. Plots and copies replace the supply cap of 60; supply stays as a unit's weight, and a full colony MUST fit the performance budget. Loam and stump plots move into the colonies. The colony gains plots over a run, as a third rank behind. **Open:** how many plots, and when (first guess: +1 per battle won, up to 4 more; some relics or nodes may add plots). | §4.1, §4.3, §4.6, §5.4, §11.9, §13.7 |
| 5 | The kit: building cards with copies | Your kit lists the building cards you own this run, each with a number of copies. Each copy is one building you can have planted at once in a battle. Copies are fixed, not a random hand, so the answer you own is always there. Gold is still the price of planting. Selling returns the copy, refunding 100% in the planning phase it was planted and 60% once it has fielded. The starting kit is the commander's 3 starter buildings, 2 copies each. A blueprint adds a card with 1 copy, and drafting a card you own adds a copy. The general follows the same rule (§7.8). Copies arrive in milestone R3 (§16). | §4.4, §8.3, §8.10 |
| 6 | Six core archetypes | A first cut: swarm (Sporeling Burrow), shield (Capguard Hall), archer (Gill Archer Nest), heavy (Amanita Lodge), crusher (Hammercap Forge) and area damage (the Burster Pod, or the Puffball Mortar as an emplacement). The Truffle Cellar is a basic card for everyone. Every other role (healer, slayer, cleave, fast swarm, siege, tunneler, flyer, emplacement) is unlockable: until M6 it enters runs through run packs, and M6 gates it behind unlocks. **Open:** the sixth slot, and the set as a whole, which the user wants to discuss further. | §8.4, §9, §11.2 |
| 7 | Augments and combos | Augments are draft cards that change how a building's units play, not flat numbers. They replace v1's upgrade tracks in R3, and every augment shows on its squad and its card, the general's included. Combos are a few rules about position (in front of, behind, beside), shown while placing, each changing what happens rather than adding a small percentage. A unit's body and weapon never change, but a build may tilt a matchup far enough to flip it, at a real cost and in plain view. The user: "the right build or set of items should possibly allow for a unit to beat a unit it usually doesn't." §17 #11 is removed. **Open:** whether an augment attaches to a building type or to one card (first guess: the type, for the run). | §5.8, §11.6, §11.13, §11.14, §17 |
| 8 | Run variety | Each run's draft pool deals from the commander's core, an always-in set that includes an answer to the swarm (§8.4 says what it holds), and 4 of 10 random themed packs (one building and two relics each). Bans stay (§8.4). Most variety comes from builds: augments, combos and relics. | §8.4, §11.15 |
| 9 | Merging stays for now | v1's rule applies. Squads set to merge knit as the clash opens (§5.6), the merge toggle is a planning choice that the planning screen previews ("fields as 2 Bloomed + 2"), and neighbors can make Elders. Pips mark merge tiers instead of a bigger sprite, so size can mean armor. Slayers stay the counter. | §5.5, §5.6, §5.8 |
| 10 | The shape language | Body size shows armor, team color stays violet against gray, pips mark merge tiers and icons mark augments. Cards and the planning screen show matchups as marks, not paragraphs. Text-defined sprites stay, but each archetype MUST have a distinct silhouette. Units carry no weapon mark (2026-11-01, §5.8). The art and the card-text pass are milestone R4, in two parts (X3, agreed 2026-11-01): R4a, the shapes on the field, runs beside R1 and lands before R2's first playtest; R4b, matchup marks in full, augment icons and the card-text pass, follows R3 (§16). | §5.8, §10.4, §17 #20 |
| 11 | The rework's pieces | Kept: pinning, spore clouds, cleave, the Burster (the area candidate) and the Rhizomorph (an unlockable tunneler). Retired: waves, Hold and call for help. Measured in R1: whether mixed armies need the mixed-wave shields, and the Elder Sporeling's splash. Later: flyers, as an unlockable, starting from the rework's rule that melee hits them for half damage and lobbed shells and bursts can't hit them. The general reads the squads you actually fielded. | §5.3, §7.4, §11.2, §11.3, §16 |
| 12 | The economy per round | Each round: the Heartcap stipend of 100, +50 per Truffle Cellar (+50% on loam), interest of 1 per 20 gold banked at the end of planning (up to 10), and +40 to the last round's loser. Starting gold stays 300 + 75 per battle. Drafts come after rounds 2, 4 and 6, three a battle, opening in the next planning phase once the general has planned (§4.7), plus spoils after a won battle; rerolls and skips stay as in v1. | §6.1, §6.2, §8.3 |
| 13 | How the work is done, and the tests | Rounds are the new battle, built on feature branches and merged into `develop` as the default, not as a `?proto=` knob. Tests follow the spec: goldens regenerate, and the tests and guardrails of retired systems go with them. Playtests decide what's fun, and bots catch degenerate builds; the main bar is the counter matrix's: "A strong build isn't the bug. A build with no answer is." Milestones R1–R4 (the clash check, rounds, the kit, readable armies) come before M6–M8, which are rewritten for v2. | §12, §15, §16 |

**Unchanged unless a section says otherwise:** theme and names; the damage matrix and tags (§5.3); merging's rule (§5.6); the general's memory (§7.6); commanders and powers, with new effects where theirs were tied to a retired system (§11.10); the route, nodes, events, rewards and relics, some with new effects (§8, §11.7); meta-progression's systems (§9); determinism, the tech stack, data-driven content, the localStorage keys and deployment (§13, §14).

---

## 2. Theme and naming

**Setting.** Under the roots of an ancient forest, the **Velvet Bloom**, a violet mycelial colony, fights the **Gray Rot**, an ashen gray-green colony, for living soil. Every battle is a new patch of forest. Your colony's heart, the **Heartcap**, travels on the wind as spores and regrows on each new patch, which is why both Heartcaps start every battle whole (§4.5). A colony that loses a battle regrows from the spores that escape, but only so many times in a run: those are its lives (§8.5).

All names below are original to this project.

| Concept | In-game name | Code id style |
|---|---|---|
| Player faction | the Velvet Bloom (violet) | `velvet-bloom` |
| Enemy faction | the Gray Rot (ashen gray-green) | `gray-rot` |
| Base / keep | Heartcap | `heartcap` |
| The run's spare tries; a lost battle costs one | lives (working in-world name: *Regrowths*) | `lives` |
| One fight of a battle: planning, then a clash, then an aftermath | a round | `round` |
| The phase with the clock stopped, when both sides build | planning | phase `planning` |
| The live phase, when both whole armies fight | the clash | phase `clash` |
| The short phase after a clash, when the winner's survivors damage the loser's Heartcap | the aftermath | phase `aftermath` |
| Your home zone, where you build | your colony | `colony` |
| A fixed 2×2 building site in the colony | a plot | `plot` |
| Rich soil plot (economy buildings yield +50%) | Rich Loam | `loam` |
| A plot that can't be built on | a stump | `stump` |
| A plot's place front to back, and its squad's (front or back; sprawl adds a third rank) | rank | `rank` |
| A plot's place across the lane, and its squad's | file | `file` |
| The units one building fields each round | a squad | `squad` |
| The army's layout in a clash, copied from the colony | the formation | `formation` |
| The area in the middle of the lane where one side's formation appears: one per side, or one per lane on Twin Roots | the formation box | built by `formationOf` (§4.6, §14.6) |
| A plot's place in the formation box; it holds that plot's one squad | a slot | `slot` |
| The clash's opening moment, when nobody moves or attacks and squads set to merge knit (first guess, §5.6) | the muster | `muster` |
| The building cards you own this run | the kit, made of kit cards (never "deck": nothing is drawn) | `kit` |
| How many of one card you can have planted at once | copies | `copies` |
| One of the six core unit roles | an archetype | `archetype` |
| A draft card that changes how a building's units play | an augment | `augment` |
| A rule about position: in front of, behind, beside | a combo | `combo` |
| A themed set in a run's draft pool: one building and two relics | a run pack | `pack` |
| Merge tier 2 / tier 3 | Bloomed / Elder | tier `2` / `3` |
| Round escalation, from round 5 | the Sporestorm | `sporestorm` |
| The result after round 9 | Win/Loss by Decision | `decision` |
| Common / rare meta currency | Spores / Amber | `spores` / `amber` |
| Curse / curse points | Blight / Decay | `blight` / `decay` |
| Meta hub screen | the Underroot | `underroot` |
| Passive loadout / its budget | Colony Traits / Root Capacity | `trait` / `rootCapacity` |
| Building variant | Strain | `strain` |
| Achievement that unlocks content | Feat | `feat` |
| Player commanders (v1) | Vesper Velvetcap (starter), Armilla the Vast, Cordis the Puppeteer | `vesper`, `armilla`, `cordis` |
| Enemy generals (v1) | Old Mother Mold, the Lichen Baron, the Blightwright; boss: the Pale Sovereign | `mother-mold`, `lichen-baron`, `blightwright`, `pale-sovereign` |

In rules text, lives are called "lives". **Open:** an in-world name for them; *Regrowths* is a working name.

**Retired names.** *The mat* (your mycelial mat, `territory`) went with territory (§4.3, Appendix A). *Wave* no longer names a clock: v1's 60 s wave and the rework's 20 s beat and its waves are retired, and rounds do their jobs.

The unit and building roster is in §11.2–11.3, and §11.2 marks the six core archetypes.

**Palette direction.** Velvet Bloom: violet and lilac (#8a4fd8, #c9a2ff) with cream stalks. Gray Rot: ash, moss and bone, with pale bone-gray bodies (#b0bcab, #eaf0e2 and a dark #808b7c, since milestone R4a; v1 had #7d8a7a, #b8c4a8 and #4b5649). Soil: dark brown. Rich Loam: near-black with gold flecks.

Both team colors MUST stay distinguishable under deuteranopia and protanopia simulation, in lightness as well as hue (R4-Q4, agreed 2026-11-01). A unit test checks it from R4a on, with three cases:
- under both filters, the two sides' body tones differ by at least 1.5:1 in luminance;
- each side's body tones stand at least 1.75:1 off every soil tone, plain and under both filters, so neither army sinks into the clash ground;
- each side's dark tone stands at least 1.5:1 off the dark outline.

Violet against v1's ash tones differed by only 1.00–1.10:1 under the filters, a hue difference with almost no lightness difference (A159). So R4a lightened the Gray Rot's bodies: the bone tones differ from the Velvet Bloom's by 1.51–2.13:1 under the filters, and stand 3.57:1 or more off the soil and 4.73:1 or more off the outline (`tests/unit/contrast.test.ts`). A darker body would sink into the soil. M7 checks the Gray Rot's own sprites the same way (§16).

Color is never the only cue: body size, silhouettes, pips and icons carry the rest (§5.8, §10.4).

---

## 3. Game structure (three nested loops)

```
META LOOP (persistent)               RUN LOOP (25–35 min)                   BATTLE LOOP (6–8 rounds, at most 9)
the Underroot                        route map (6 rows)                     EACH ROUND, until the battle ends:
 ├─ pick commander                    ├─ Battle / Elite / Event / Grove     1. PLANNING (clock stopped, untimed)
 ├─ equip traits (Root Capacity)      ├─ 4–5 battles total incl. boss           ├─ income arrives
 ├─ choose strains, ban ≤3 buildings  ├─ 3 lives: a lost battle costs one       ├─ the general plans first: you see its army
 ├─ toggle blights (Decay)            ├─ the kit grows: cards, copies,          ├─ a draft on rounds 3, 5 and 7
 └─ spend Spores/Amber, see feats     │   augments, relics                      └─ plant and sell on plots, set merge toggles
        ▲                             ├─ the colony gains plots (sprawl)    2. CLASH (live, about 20–40 s, at most 45 s)
        │                             └─ run ends: boss won or lost,            ├─ both whole armies appear in formation
        │                                 or 0 lives                            ├─ the muster: squads set to merge knit
        │                                        │                              └─ the commander power, at most once
        │                                        │                          3. AFTERMATH (a few seconds, not simulated)
        │                                        │                              ├─ survivors damage the loser's Heartcap
        │                                        │                              └─ the Sporestorm raises it from round 5
        │                                        │                          END: a Heartcap at 0, or Decision after round 9
        └──────── rewards: Spores, Amber, mastery XP, feats ◄────────────── report: each round's result, damage by building
```

A round, step by step, is in §4.7.

**Moment to moment**, the player:

- **in planning,** with the clock stopped and no time limit:
  - reads the general's colony and the army it will field this clash: squad types, formation, merges and augments,
  - takes a draft in the planning phase after rounds 2, 4 and 6, once the general has planned,
  - plants buildings from the kit on free plots, and sells them,
  - sets each spawner's merge toggle and sees what it will field,
  - banks gold for interest or spends it,
  - starts the clash when ready;
- **in the clash,** watches the armies fight and may fire the commander's power, at most once, from the first tick (§6.6);
- **in the aftermath,** sees the damage land on a Heartcap.

The player does **not** control units directly, and nothing is planted while a clash runs.

---

## 4. The battlefield

### 4.1 Map and grid: colonies and the arena

- A map is a grid of **W columns × H rows** of square tiles (16 px at native resolution).
- Rows are grouped into **lanes** separated by impassable one-row **root walls**. A map has 1–3 lanes. Units never leave the lane they appear in.
- The player's side is the left (column 0); the enemy's is the right (column W−1).
- Each side's **Heartcap** sits *off-grid* in a 2-tile strip behind its first column and spans every lane. Its edge is x = 0 (player) or x = W (enemy). The rendered map is therefore W + 4 tiles wide. Heartcaps are never targets in a clash (§4.5).
- **Colonies:** columns `[0, homeCols−1]` are the player's **colony** and `[W−homeCols, W−1]` the general's, permanently. Each colony is divided into fixed 2×2 **plots**, where buildings stand (§4.6).
- **The arena:** every column between the two colonies. Nobody owns it and nothing is built there. At each clash both armies appear in the arena, in formation, with their front ranks 6 tiles apart in the middle of the lane (§4.6). Column capture and territory are retired (§4.3).
- Tile kinds:

| Kind | Glyph | Buildable | Units walk on it | Notes |
|---|---|---|---|---|
| soil | `.` | yes | yes | |
| rich loam | `$` | yes | yes | In a colony, it makes a **loam plot**: an economy building there yields +50% (§4.6, §6.2) |
| stump | `o` | no | yes | In a colony, it makes a **stump plot**, which can't be built on and leaves a hole in the formation (§4.6). Decorative to units |
| root wall | `#` | no | no | Only between lanes and at map edges |

- **Terrain belongs in the colonies.** Loam and stumps act only on plots. In the arena they have no effect on play: units walk over both, as they always did. Every loam and stump tile on today's maps lies in the arena, so R2 redraws the maps with terrain in the colonies, and the arena MAY shrink (§11.9).
- Maps MUST be **point-symmetric** (tile (c, r) mirrors tile (W−1−c, H−1−r)), so neither side gets a positional advantage: the map's own plots, loam and stumps mirror between the two colonies. A unit test enforces this. How many plots the general opens beyond the map's own is in §4.6.
- **Scarcity:** plots are meant to be scarce. By mid-run the kit SHOULD hold more copies than the colony has plots, so what to leave out is a decision (§4.6, §8.10). `homeCols` and the colony's terrain are tuned per map.

**Bogwater Hollow** (the Milestone 1 map): 1 lane, W = 32, H = 8, homeCols = 4. Each colony holds 8 plots, 2 ranks × 4 files, and the arena is 24 columns wide. The tiles are today's: its loam and stumps are all in the arena, so they have no effect until R2 moves terrain into the colonies.

```
tens            0         1         2         3
ones            01234567890123456789012345678901
colony          BBFF                        FFBB      (your colony | its colony; the arena between)
formation                BBFF      FFBB               (slots at the clash; 6 tiles between front ranks)
row 0       [H] B1F1......$$................F1B1  [H]
row 1       [H] B1F1......$$.o..............F1B1  [H]
row 2       [H] B2F2....................o...F2B2  [H]
row 3       [H] B2F2...........$$...........F2B2  [H]
row 4       [H] B3F3...........$$...........F3B3  [H]
row 5       [H] B3F3...o....................F3B3  [H]
row 6       [H] B4F4..............o.$$......F4B4  [H]
row 7       [H] B4F4................$$......F4B4  [H]
```

Each 2×2 plot is labelled by its rank (F front, B back) and file (1–4, from the top). The formation row shows where each rank's squads appear at the clash: the player's front rank in columns 11–12 and back rank in 9–10, the general's front rank in 19–20 and back rank in 21–22. In the map data file each tile row is exactly 32 characters of the tile glyphs (§14.2); the plot labels are drawn here only.

### 4.2 Time model: rounds

- The sim runs a **fixed timestep of 20 ticks per second** (50 ms). Every gameplay timer is an integer tick count. **Ticks run only during a clash.**
- **A battle is a series of rounds** (§1.3 #1), numbered from 1, up to 9 (§6.5). Each round has three phases, and the battle a fourth state:
  - `planning`: the clock is stopped and planning is untimed. Income lands, the general plans, then the player plans (§4.7). It ends when the player presses *Begin*. No tick runs, so planning is paused by definition.
  - `clash`: live. It opens with a 1 s muster, in which nobody moves or attacks (§5.6). The clash clock runs from 0:00 and stops when every lane's clash has ended, at 45 s at most (§6.7).
  - `aftermath`: not simulated, and no tick runs. The sim has already scored the round when the clash ended (§6.7); the aftermath only shows it (about 3 s at 1×, §10.2).
  - `ended`: the outcome is fixed and the report is shown (§6.5).
- **Rounds replace the wave.** v1's 60 s wave is retired (Appendix A). Rounds drive what waves drove: interest and income (once a round, §6.2), drafts (after rounds 2, 4 and 6, §8.3), the Sporestorm (from round 5, §6.4) and the general's counter cycle (§7.4).
- **Income** lands once a round, at the start of planning (§6.2). The 5 s income tick is retired.
- **Speed:** 1×, 2× or 3× in a clash (the render loop runs 1, 2 or 3 sim ticks per 50 ms of real time). The aftermath's animation follows the same speed.
- **Pause:** pause is a UI state in a clash, and the sim does not advance. The one command in a clash is the commander power (`power`, §6.6): it can be aimed while paused and executes on the next tick. Planting, selling and merge toggles (`plant`, `sell`, `toggleMerge`) are planning commands (§4.4, §14.5); in a clash they're refused.
- **There is no battle clock.** Time on the sim clock is the sum of the clashes. A clash takes about 20–40 s and planning about 30 s at the table, so a 7-round battle takes about 6–8 minutes in all (§8.2, §12.3).

### 4.3 Territory: column tug-of-war (retired in v2)

Column capture, borders, frontiers, presence and forts are retired with rounds. Heartcap damage each round is the score (§6.7), the round tally and both Heartcaps show who's winning (§10.2), and where a building stands is set by the colony's plots (§4.6). Quick Roots and Armilla's passive and power need new effects (§11.7, §11.10). See Appendix A.

### 4.4 Buildings: cards, copies, plots and squads

Common fields: footprint (every building is 2×2 and fills one plot), cost, and kind (`spawner` | `tower` | `economy` | `utility`). A spawner also has its **squad** (§11.2). Buildings take no part in a clash: they can't be hit, so they have no HP in play, and they aren't lost between rounds (§4.6). The data keeps `hp` for a tower's emplacement, and for the rest until R2 removes it.

- **Kit cards and copies:** you plant buildings from your **kit**, the building cards you own this run, each with a number of **copies** (§8.10). Each copy is one building you can have planted at once in a battle. A card with no free copy can't be planted, so massing the cheapest spawner is impossible by construction (§1.3 #5). Copies arrive in R3 (§16): until then a kit card has no copy limit. Each battle starts with an empty colony and every copy free (a first guess, **Open** in §4.6).
- **Planting** is a planning action only (§4.7). It needs:
  - a free, open plot in your colony that isn't a stump (§4.6);
  - a free copy of the card;
  - the price: the building's `cost`, charged at once. Traits and relics may modify it. There's no forward price (§6.3).

  A building planted in a planning phase fields its squad in that round's clash, and an economy building pays from the next round's income (§6.2).
- **Squads:** each spawner fields **one squad every clash**: `count` units of its unit type, in its plot's slot of the formation (§4.6). Every squad is fielded fresh each round; nothing a squad suffered carries to the next round.
  - **Sizes** are in §11.2. First guess: what the building made in a minute under v1, in whole batches, with halves rounded up. That keeps v1's supply per gold, so the value check still holds (§11.4). A Sporeling Burrow (2 every 16 s) fields 8 Sporelings. Milestone R1's clash check sets the real sizes (§16).
  - Augments change a squad (§11.13). Until augments replace upgrade tracks in R3, an upgrade that changes a spawn changes the squad: the Burrow's level 3, "+1 Sporeling per spawn", makes its squad 12.
  - There is no supply cap (§5.4). Plots and copies are the build limits, and a full colony MUST fit the performance budget (§4.6, §13.7).
- **Towers** field themselves as an **emplacement**: one unit at the centre of the tower's slot, with the building's HP and attack, restored each round. `kind` stays `tower`; "emplacement" is its archetype (§5.1, §11.2). Today the Puffball Mortar is the one tower. How an emplacement fights, and how it counts when a lane ends, is in §6.7.
- **Economy buildings** add gold once a round, at the start of planning (§6.2). They field nothing, so their plot is a hole in the formation (§4.6).
- **Utility buildings:** the Rhizome Vault raised the supply cap, which is gone. **Open:** its new effect (first guess: each spawner beside it fields 1 more unit, §11.2).
- **Merge toggle:** every spawner has one, default **on** (§5.6). It is set in planning, and the planning screen previews what the squad will field ("fields as 2 Bloomed + 2", §10.2), by the same rule the clash's muster runs (§5.6).
- **Selling** is a planning action only:
  - **Refund:** **100%** of the price for a building planted in this planning phase; otherwise **60%**, rounded down, once it has been through a clash (modified by refund relics, such as Second Flush).
  - The copy returns to your kit and the plot frees up at once. Moving a building is selling it and planting it again, so a pivot costs 40% of its price.
- **Besieged buildings, spawn timers and destroyed buildings** are retired with the live battle (Appendix A).
- **The general** plants by the same rules, from a kit of its own (§7.3, §7.8).

### 4.5 Heartcaps

| | Player Heartcap | Enemy Heartcap |
|---|---|---|
| Max HP | 3000 (traits may change this) | 2000 + 250 × (battle index − 1); boss: 3600. Elite modifiers may change it (Fortified: +30%, §7.7) |
| At the start of each battle | full | full |
| Takes damage | only from the lanes it loses in a round: scored as the clash ends, shown in the aftermath (§6.7) | same |

- **A Heartcap race each battle** (§1.3 #2). A lost round chips yours, and a won round chips the general's. The two bars in the top band are the "who's winning" readout (§10.2). The cap on a round's damage (§6.7) means a battle can swing back.
- **HP doesn't carry** from battle to battle. What carries is the run's lives: a lost battle costs one, and a won battle never does (§6.5, §8.5). v1's repairs lose their target: the Grove regains a life instead (§8.7), and other repairs are retired or get new effects (§11.7).
- **Not a target in a clash.** Nothing attacks a Heartcap during a clash; it takes damage only in the aftermath. Where units may move is in §5.2. Heartcaps never field units.
- **Turrets are retired** (Appendix A). The per-round damage cap protects the loser instead (§6.7). Rot Ward and the Pale Sovereign's passive get new effects (§7.7, §11.7).

### 4.6 The colony: plots and formation

**Plots.** Each colony is divided into fixed 2×2 plots, counted from the arena backward:

- A plot's **rank** is its place front to back: the **front** rank borders the arena, and the **back** rank stands behind it.
- A plot's **file** is its place across the lane, numbered from 1 at the lane's top row, on both sides.
- A plot is named by its lane, rank and file ("front rank, file 2").

| Map | Lanes | Rows per lane | Plots per colony |
|---|---|---|---|
| Bogwater Hollow, Stumpfield | 1 | 8 | 8: 2 ranks × 4 files |
| Twin Roots | 2 | 6 | 12: 6 per lane, 2 ranks × 3 files |

- **Rules:**
  - A plot holds one building. An empty plot fields nothing.
  - A **loam plot** (any of its tiles is rich loam) makes an economy building there yield +50% (§6.2).
  - A **stump plot** (any of its tiles is a stump) can't be built on. It's a permanent hole in that colony's formation.
  - On a lane whose rows don't divide into pairs, the leftover row holds no plot. **Open:** Three Hollows' shape under plots (first guess: 3 lanes of 4 rows and 4 home columns, 12 plots in all, §11.9).
- **Neighbors** are what combos read (§11.14). Plot B is **in front of** plot A when it is in the same file and the next rank toward the arena, **behind** it the other way round, and **beside** it when it is in the same rank and the next file. Plots touching only at a corner aren't neighbors, and plots in different lanes never are.

**Sprawl: the colony gains plots over a run** (§1.3 #4).
- Gained plots extend the colony backward, as a third rank behind the back rank. Some relics or route nodes MAY add plots too (§8.2, §11.7).
- The run carries how many plots the colony has gained, and each map sets the colony it starts from.
- **Open:** how many plots, and when. First guess: +1 plot per battle won, up to 4 more, which fills a third rank of 4 files on a one-lane map.
- **Open:** where the third rank's tiles come from, and the order its plots open. First guess: R2's maps reserve two more columns behind each colony (homeCols 6), whose plots stay closed until gained, and the arena shrinks to match (§11.9). On a one-lane map, gained plots open the middle files first (2, then 3), then file 1, then file 4. On Twin Roots, they open in the third rank of each lane in turn, the top lane first.
- **Open: planted buildings don't carry between battles** (first guess). Each battle is a new map, so it starts with both colonies empty and every copy free, and only the run's state carries: the kit and its copies, augments, relics, the plots gained and lives (§4.7, §8.10). §4.4, §4.7, §8 and §14.4 point here.
- **Open: the general's plots** (first guess). In each battle the general's colony opens the map's own plots plus as many as your colony has gained from sprawl by then. Plots from your own relics, traits or commander (such as Mycelial Web, Root Pressure and Armilla's Landholder, §11.7, §11.10) don't count: they're yours alone, and so is a blight's change to your plots, such as Thin Soil's stump (§11.8). §7.1 and §7.8 point here.

**The formation is the colony.** At the clash, each side's squads appear in a **formation box** that copies its colony's layout (§1.3 #4):

- **The box** has one 2×2 **slot** per plot, in the same ranks and files. It sits in the arena, in the middle of the lane: each side's front rank faces the other's with **6 tiles** between them. On Bogwater Hollow that puts the player's slots in columns 9–12 and the general's in columns 19–22 (§4.1).
- **A squad appears in its building's slot,** at the positions `formationOf` gives (§14.6).
- **`formationOf` is deterministic.** It is a pure function of the colony: its plots, its buildings, their squad sizes and their merge toggles. It draws on no random stream, so the same colony always gives the same formation, and the preview can't differ from the clash. R1's clash check MAY add a seeded jitter as a measurement option; that's not a game rule (§12.2, §16).
- **The layout inside a slot:** a squad of n units stands on a k × k grid, where k = ceil(sqrt(n)), with a spacing of 2/k tiles, centred in the 2×2 slot. Unit j (from 0) takes the grid's column j mod k, counted from the slot's front, and its row floor(j / k), counted from the top: the grid fills front to back, then top to bottom. "Front" is the side facing the enemy (+x for the player, −x for the general). A tower's emplacement stands at its slot's centre.
- **Open: overflow** (first guess). A squad too big to stand apart in its slot, whose units are wider than its grid's spacing, packs tighter: it keeps the same k × k grid and spacing, and its units overlap. (An upgraded Burrow's 12 Sporelings stand 0.5 tiles apart, exactly their width, so they still fit.)
- **Holes stay holes.** A slot whose plot is empty, a stump, or holds an economy or utility building fields nothing, and the formation doesn't close up around it. So economy buildings belong at the back.
- **So placement is positioning.** A Capguard Hall in front of a Gill Nest gives you archers behind a shield wall. Two Sporeling Burrows side by side field 16 Sporelings within reach of each other, enough for an Elder when they knit at the muster (§5.6).
- **On Twin Roots**, each lane has its own colony, its own formation box and its own clash. A building fields in its plot's lane. The general picks a lane for each building (§7.3).
- **The general's colony** follows the same rules, mirrored on the field.
- **The planning screen** previews both formations from the same rule the clash uses, `formationOf`, so squads appear where the player saw them (§10.2). The merge preview is the muster's own rule (§5.6).

**Buildings stay out of the clash.** They can't be hit, don't block units and aren't lost between rounds. Colony ground takes no part in play; where units may move is in §5.2.

**The budget.** There's no supply cap: plots and copies bound the army. Squad sizes and the most plots a colony can hold MUST keep a full colony of both sides inside the performance budget, at most 150 live units a side when the armies arrive, checked on the bench (§13.7, §15).

### 4.7 A round, step by step

This is the exact order of events, and tests cover it. The sim owns every step except the aftermath's animation. The general and the player follow the same rules; the one difference is the order of planning (§1.3 #3). §7.2, §8.3, §8.9, §10.2, §13.4, §13.5 and §14.6 follow this order or point here.

**At the start of a battle:**

1. A fresh map (§4.1). Both colonies are empty, every copy in both kits is free (first guess, §4.6), and both Heartcaps are full (§4.5).
2. Each colony opens its plots: the map's own, plus the plots the run has gained (§4.6).
3. Each side gets its starting gold, `300 + 75 × (battle index − 1)` (§6.1). The Sporestorm stands at ×1.0 (§6.4).
4. Round 1 begins. Its planning phase takes the place of v1's deploy phase.

**Planning** (the clock is stopped; no tick runs):

5. **Income lands** for both sides, from round 2 on: the stipend, economy buildings, interest on the gold each side banked at Begin last round, +40 to the last round's loser, and any pending gold (§6.2). Round 1 has no income: starting gold takes its place.
6. **The round's Sporestorm multiplier** is set (§6.4).
7. **`roundStart` triggers** fire, such as relics' (§14.6).
8. **The general plans first** (§7.2). It applies any due doctrine or counter change (§7.4), reading the squads you fielded in earlier rounds (`fielded`, step 12), never what you plant now. It sells for room if a counter needs it, buys from its kit and plants (§7.3), then sets its merge toggles.
9. **You see its army.** The planning view opens with the general's whole colony and the army it will field this clash: squad types, formation positions, merges and augments (§7.5, §10.2). Its buildings planted this round carry a "New" sprout. In a round with no draft, the battle saves now (§8.9).
10. **A draft**, in a run, in the planning phases of rounds 3, 5 and 7 (after rounds 2, 4 and 6). It opens now, after the general has planned, over the field, with the general's army still lit. You pick, reroll or skip, and a skip pays +40 gold (§8.3). Begin is refused while it's open (§10.2, §14.5). The battle saves once the offer is dealt (§8.9).
    - **Open:** whether `plant`, `sell` and `toggleMerge` are also refused while your draft is open. First guess: yes, so you pick, reroll or skip before planning goes on.
11. **You plan:** plant and sell on your plots, set merge toggles, and bank or spend gold (§4.4). The formation preview follows every change.
12. **Begin** (`beginClash`). Your plan locks. Interest for the next round is worked out on the gold each side holds now (§6.2). The sim records what each side fields this round in `fielded`: unit type, tier, count and augments, from `formationOf` and `mergePreview`, which equal the squads after the muster (§14.4). The counter cycle and the intel file read it (§7.4, §7.6). The battle saves (§8.9).

**Clash** (live; the clock runs):

13. **Tick 0:** every squad of both sides appears in its slot, at the positions `formationOf` gives, in every lane, on the same tick (§4.6).
14. **The muster** (1 s): nobody moves or attacks, and squads set to merge knit in place (§5.6).
15. **The clash runs** under the combat rules (§5). You may fire the commander power once, from the clash's first tick, the muster included (§6.6).
16. **A lane's clash ends** when one side has no units and no emplacements left in it, or at 45 s (§6.7). Its result locks on that tick. On Twin Roots, a lane that ends first holds still while the other fights on.
17. **The clash ends** when every lane's clash has ended. The sim scores the round: each lane's winner and margin, the damage, the Sporestorm, the cap, and the round's winner and loser. Each Heartcap loses the round's damage at once (§6.7).

**Aftermath** (not simulated; about 3 s at 1×, and skippable). Every round has one, the last included:

18. The winner's survivors surge into the loser's Heartcap, and the bars drain by the damage the sim already scored. The round tally takes the round's result (§10.2).
19. **The battle ends** when the aftermath closes, if a Heartcap is at 0 or if this was round 9 (§6.5). Otherwise the colony and gold carry into the next round, everything else on the field is cleared, and the next round begins at step 5.

**At the end of a battle:** the report shows (§10.5). In a run, a won battle pays its rewards and spoils (§8.6), and a lost battle costs a life (§8.5). Pending gold not yet paid is lost (§6.2). Only the run's state carries into the next battle (§4.6, §8.10).

---

## 5. Units and combat

### 5.1 Unit definition fields

| Field | Meaning |
|---|---|
| `hp` | Max HP at tier 1 (integer) |
| `armor` | `light` / `medium` / `heavy`. This is the unit's **body**, which its size shows (§5.8) |
| `damage`, `damageType` | Damage per hit at tier 1 (0 only for `support` units, which heal instead); `slash` / `pierce` / `crush`. The damage type is the unit's **weapon** (§5.8) |
| `attackInterval` | Seconds between attacks |
| `range` | Edge-to-edge attack reach in tiles (melee ≈ 0.4–0.7) |
| `projectileSpeed` | Tiles/s; `0` means melee (the hit applies instantly) |
| `speed` | Tiles/s |
| `supply` | The unit's weight at tier 1 (1–3, §5.4) |
| `aggroRange` | Edge distance in tiles at which the unit acquires targets |
| `radius` | Body radius in tiles (collision and range math) |
| `splashRadius` | Optional; tiles. For a cleave unit it's the cleave's reach, and for a burst unit the burst's radius (§5.3) |
| `tags` | Subset of `siege`, `slayer`, `ranged`, `swarm`, `support`, `burrow`, `burst`, `flying` (§5.3) |
| `heal` | `support` units only: the amount, interval and number of targets of its heal (§11.3) |
| `onDeath` | Optional: effects fired where the unit dies (§14.2). Augments MAY add them (§11.13) |
| `mergePerks` | Stat patches applied at tier 2 and at tier 3 (§5.6) |
| `archetype` (new in v2) | The unit's role, which its silhouette shows (§5.8). One of the six core archetypes, `swarm`, `shield`, `archer`, `heavy`, `crusher` and `area`, or an unlockable role: `healer`, `slayer`, `cleave`, `fastSwarm`, `siege`, `tunneler` or `flyer` (§1.3 #6) |

- **An archetype is a role, not a rule.** It's what the player reads and what the kit and the unlock ladder sort by (§8.10, §9). What a unit does comes from its stats and tags. Some role names match tag names (`swarm`, `slayer`, `siege`), and the tag is still what the rules read.
- **Cards take their unit's archetype.** A building card's archetype is its unit's. A tower that fields itself takes `emplacement` (the Puffball Mortar, §5.2), and economy and utility cards have none (§11.2). §11.3 gives each unit's archetype.
- **Squad size is a building field,** not a unit field: how many units a building fields each round (§4.4).

### 5.2 Movement and targeting in a clash

Units exist only during a clash. On the clash's first tick, each squad appears in its slot of its side's formation box (§4.6, §4.7). The clash opens with a **1 s muster**, in which squads knit and nobody moves or attacks (§5.6). Then the rules below run until the lane's clash ends (§6.7). A unit counts as out of combat when it's fielded, so its squad can knit at the muster.

- **Retargeting** happens on ticks where `(tick + unitId) % 5 === 0`, or immediately if the current target died.
- **Candidates:** enemy units in the same lane within `aggroRange` (edge distance).
  - Buildings take no part in a clash, and a Heartcap takes damage only in the aftermath (§4.6, §6.7), so units never target either.
  - A burrowed unit is never a candidate. A flyer is a candidate only for an attacker that can hit it (§5.3).
- **Choosing a target:**
  1. **Preferred class first:** `slayer` units prefer tier-2+ units, and a surfaced `burrow` unit prefers `ranged` units. A `burst` unit aims by its own rule (§5.3).
  2. Otherwise, the nearest by squared edge distance.
  3. Ties go to the lowest entity id.
- **Siege units under rounds:** v1's `siege` units preferred buildings and the Heartcap, and a clash has neither. They fight the nearest enemy like any unit, and their job comes from the aftermath, where they count double toward Heartcap damage (§5.4, §6.7).
- **Stickiness:** keep the current target while it lives and stays within `aggroRange × 1.25`, unless a candidate of the unit's preferred class appears.
- **Where units move:**
  - A unit moves within its lane between the two Heartcap edges, x = 0 to W (§4.1), over the arena and over colony ground alike. Positions are clamped to that span, and a unit stops at the far edge: x = W for the player's units, x = 0 for the enemy's.
  - Nothing attacks a Heartcap during a clash. Heartcap damage happens only in the aftermath (§6.7). §4.5 and §4.6 point here.
- **Moving:**
  - With a target out of range: step toward it at `speed`.
  - With no target in reach: move toward the nearest enemy unit in its lane that it could target (by squared edge distance; not a burrowed unit, and not a flyer for a unit that can't hit one, §5.3).
  - With no such enemy: advance along the lane (+x for the player, −x for the enemy) while drifting back toward the y of the unit's slot (its file, §4.6) at 0.3 tiles/s, up to the far edge.
  - **Open:** whether a squad keeps its place in the formation on the approach. The rework's waves marched at their slowest unit's pace, with ranged units 1 tile behind their melee front. The first guess is no: each unit moves at its own speed, as in v1. R1's pace variant measures it (§16).
- **Hold / Advance** (`laneStance`, retired in v2): both whole armies start each clash at once, after the same 1 s muster (§5.6), which is what Hold was for, so no lane holds. See Appendix A.
- **Tunnelers** (the `burrow` tag; the Rhizomorph, an unlockable, §11.3):
  - A tunneler is fielded **burrowed**. While burrowed it has no target, can't be targeted or hit by anything (attacks, splash, clouds, bursts), passes under every unit, pins nothing and doesn't merge.
  - It tunnels straight at its surfacing point at its `speed` and surfaces once its attack range reaches it. The point is the nearest enemy `ranged` unit in the lane, skipping any that an enemy emplacement could hit; with none, the enemy's frontmost unit.
  - Surfaced, it's an ordinary unit that prefers `ranged` units.
  - v1's fallback, an enemy spawner behind the front, is gone with buildings in the clash.
- **Flyers** (the `flying` tag; later, as an unlockable, §5.3): a flyer passes over ground units. It doesn't collide with them, so it can't block or be blocked. It separates from other flyers and keeps to its lane like every unit.
- **Emplacements:** a tower card fields itself as an emplacement, one unit in its slot (§4.4; the Puffball Mortar, as an unlockable or as the sixth archetype, §1.3 #6, §11.2). It never moves. It targets and is targeted as a unit does, with its building's HP and attack, restored each round. §6.7 owns the rest: its armor, its supply, and how it counts when a lane ends.
- **Separation:**
  - After moving, overlapping units (from either side) are pushed apart by half their overlap each, for at most 2 passes, using the spatial hash.
  - Positions are then clamped to the lane.
  - Units do **not** collide with buildings, stumps or Heartcaps. Burrowed units collide with nothing, and flyers only with other flyers.
- **No pathfinding.** Lanes are open fields, and avoiding a pathfinder is a deliberate performance and determinism choice.

### 5.3 Attacks and damage

**Attacking:** when `cooldown ≤ 0` and the target is in range, the unit attacks and `cooldown = attackInterval`.

- **Melee hits** apply on the same tick.
- **Ranged hits** are scheduled for `tick + ceil(distance / projectileSpeed × 20)`. They resolve against the original target if it's still alive, and are lost otherwise.
- **Splash attacks** always detonate: at the target's position at impact, or its last known position if it died.

**Damage formula** (rounded to an integer, minimum 1):

```
damage = baseDamage
       × tierMult(attacker)          // 1, 2.8, 7.84 for tiers 1, 2, 3 (tierStatMult, §5.5)
       × upgradeMult(attacker)       // augments, relics, traits, strains (upgrade levels until R3, §11.6)
       × MATRIX[damageType][armor]
       × tagMult                     // siege vs structure ×2.0; slayer vs tier ≥ 2 ×3.0
       × takenMult(target)           // merge-perk resistances; a flyer's ×0.5 against melee
```

v1's `sporestormMult` on units and towers is retired: the Sporestorm now raises each round's Heartcap damage instead (§6.4). The Heartcap's own `takenMult` goes with it, since a Heartcap is never hit in a clash (§6.7).

**Damage/armor matrix:**

|  | Light | Medium | Heavy | Structure |
|---|---|---|---|---|
| **Slash** | 1.5 | 1.0 | 0.5 | 0.5 |
| **Pierce** | 1.0 | 1.5 | 0.75 | 0.5 |
| **Crush** | 0.75 | 0.75 | 1.5 | 1.5 |

Reading guide: Slash shreds swarms of Light units, Pierce breaks Medium line troops, and Crush cracks Heavy armor and structures. Buildings and Heartcaps aren't hit in a clash, so the Structure column applies only where something in a clash has structure armor (emplacements, §6.7).

**Splash:** the primary target takes full damage. Every *other* enemy unit within `splashRadius` of the impact point (in the same lane) takes 50% (`splashFalloff`).

**Tags:**

| Tag | Effect |
|---|---|
| `siege` | ×2.0 vs structure. Counts double toward Heartcap damage in the aftermath, but not in the 45 s comparison (§6.7) |
| `slayer` | ×3.0 vs Bloomed and Elder (`tagMult.slayerVsElite`); prefers them. The counter to merging (§5.6) |
| `ranged` | Can be pinned (below). Tunnelers surface beside it. Used by the general's analysis |
| `swarm` | Informational, used by the general's analysis |
| `support` | Marks healers |
| `burrow` | Tunnels burrowed, then surfaces (§5.2) |
| `burst` | Has no ordinary attack. Bursts (below) |
| `flying` | A flyer (below) |

v2 keeps four rules from the combat rework as rules of the game (§1.3 #11). The numbers below are the rework's, from `src/data/proto.ts`. Until a milestone adopts a rule (§16), it stays a `?proto=` setting there, off by default.

**Pinning:** a `ranged` unit with an enemy unit within **1 tile** (edge distance) attacks at **×0.35** its rate (`pinned.radius`, `pinned.rateMult`).

- Its cooldown runs on only 350 ticks in 1000, spread evenly and phased by unit id, so the rate is deterministic.
- A burrowed unit pins nothing. A flyer in contact pins like any unit.
- Why: melee that reaches the back rank should count. A shield wall in front of the archers is what keeps them free to shoot (§4.6).

**Cleave:** a cleave unit's swing hits every other enemy unit within its `splashRadius` of its target at **full damage**, not the 50% splash share (`cleave.units`: the Scythecap).

- Its reach is **1 tile**, then 1.2 for Bloomed and 1.4 for Elder (the rework's numbers; today's data has 0.8, 1.0 and 1.2).
- Why: a swarm surrounds its targets, so cleave hits many.

**Spore clouds:** a cloud is a disc that deals its damage **once a second**, ignoring armor, to every enemy unit whose body is inside it, for as long as it lasts.

| Source | Radius | Lasts | Damage per second |
|---|---|---|---|
| A Puffball Mortar's shell, where it lands (`sporeCloud`) | 1.5 | 6 s | 10 |
| A Burster's burst (`burst.cloud`) | 1.5 | 4 s | 10 |

- **Who it hurts:** never buildings, friends or burrowed units. Flyers take its full rate.
- **Credit:** its damage is credited to the building whose unit or shell made it.
- **Combat:** a pulse counts as damage taken, so a unit in a cloud can't start a knit, and a pulse cancels a knit in progress (§5.6).
- **The Mortar's shells:**
  - A Mortar whose shells leave clouds reaches **7 tiles** (6 without).
  - It aims each shell at the enemy unit in its firing band with the most enemy units inside a cloud centred on it. Ties go to the nearer, then the lower id.
  - The rework's package left the Mortar's clouds out because they stalled battles under waves. Under rounds the 45 s cap ends a stalled clash (§6.7).
- Why: both armies start each clash packed in formation, which is what clouds punish.

**Bursts:** a `burst` unit (the Burster, the area archetype's candidate, §1.3 #6) has no ordinary attack.

- **Aim:** among the enemy units of its lane within its `aggroRange`, it picks the one with the most enemy units whose bodies are within its `splashRadius` of it. Ties go to the nearer, then the lower id. It rolls at that unit and never picks a flyer.
- **The burst:** when it reaches its target, or when it dies, whichever comes first, it bursts:
  - **40 damage**, ignoring armor, to every enemy unit whose body is within **1.5 tiles** of the point;
  - and a spore cloud there (above).
- **Spent:** its burst spends the Burster, so one that has burst is gone.
- **Never merges:** it can't merge (§5.6), so it has no merge perks (§11.3).
- **Unburst at the end:** a Burster that hasn't burst when its lane's clash ends counts as a living unit with its supply (1), like any unit: toward having units left, the 45 s comparison and Heartcap damage (§6.7).
- **Chains:** a burst that fells another Burster sets it off in turn, in id order, until none is left.
- **What it can't hit:** buildings, friends, burrowed units and flyers.

**Flyers (later, as an unlockable):** v2 adds flyers as an unlockable role (the Driftling, a working name, §11.3). The starting rule is the rework's **rule C**, from [docs/archive/v1/ideas/flyers.md](docs/archive/v1/ideas/flyers.md): no immunity, a penalty.

- **Who can hit it:** every unit can hit a flyer. A ground unit's melee hit on one deals **×0.5** (`flying.meleeMult`), and ranged hits and other flyers' hits deal full damage.
- **What can't:** lobbed shells (a tower whose shell splashes, such as the Mortar) and bursts can't hit a flyer, and neither aims at one.
- **Clouds:** spore clouds hit it at their full rate (`flying.cloudsReach`).
- **Its own attacks:** a flyer hits ground and air from just overhead.
- **Reading it:** it floats over a shadow on the ground, and range, targeting and its lane position all use the shadow's point (§5.8).
- **A harder rule:** with the general's army in view before planning, flyers.md notes that a harder rule (ranged only) stops being a trap. Rule C is where flyers start.
- **Open:** whether surviving flyers count toward Heartcap damage in the aftermath (§6.7). First guess: yes, like any living unit.

**What else the rework built:**

| Piece | In v2 |
|---|---|
| Waves on a shared beat, Hold, call for help | Retired. See Appendix A |
| The Rhizomorph's tunnelling | Kept, for the unlockable tunneler (§5.2) |
| Mixed-wave shields (20% of max HP for a mixed wave) | Not adopted. Milestone R1 measures whether mixed armies need them (§16) |
| The Elder Sporeling's splash off | Measured in R1 (§5.6) |

**Effectiveness class** (sent to the renderer for hit sparks, `effectiveness` in the data):

- *strong:* combined multiplier ≥ 1.5
- *weak:* combined multiplier ≤ 0.75
- *normal:* everything else

The combined multiplier is the matrix times the tag multiplier, times any rule that changes the hit after the matrix:
- a ground unit's melee hit on a flyer (×0.5);
- an augment or combo that changes the matchup (§5.8).

Merge-perk resistances don't count, as in v1. Damage that ignores armor (clouds, bursts) is *normal*.

**Combat timestamp:** a unit's `lastCombatTick` updates whenever it deals or takes damage, cloud pulses included. Merging uses it.

**Deaths** are processed after all hits resolve on a tick. A dead unit stops counting toward its side's surviving supply at once (§5.4, §6.7).

### 5.4 Supply: a unit's weight

- **Supply is a unit's weight.** Each unit has one, 1–3 at tier 1 (§5.1), and a merged unit counts its own (§5.5). A squad's supply is the sum of its units'.
- **No supply cap.** v1's cap of 60 is retired (Appendix A). Plots and copies are the build limits (§4.6, §8.10), so no squad ever waits on supply.
- **What supply is used for:**
  - **Ending a clash:** at the 45 s cap, the side with more surviving supply in a lane wins it (§6.7).
  - **Heartcap damage:** the winner's surviving supply in the lane sets it, with siege units counting double for damage only (§6.7).
  - **The general's reads** of the squads you fielded (§7.4).
  - **The value check** per supply (§11.4).
- **The performance budget:** squad sizes and the most plots a colony can hold MUST keep a full colony inside the budget (§13.7): at most 150 live units a side when the armies arrive, checked on the bench. It counts units, not supply, since a tick's cost follows live units.
- **The HUD** has no supply chip. In a clash, the lane tug shows each side's surviving supply per lane (§10.2).

### 5.5 Supply of merged units

| Tier | Name | Stat multiplier vs tier 1 | Supply |
|---|---|---|---|
| 1 | base | ×1 | s |
| 2 | Bloomed | ×2.8 HP and damage | 2s (parts: 3s) |
| 3 | Elder | ×7.84 HP and damage | 4s (parts: 6s) |

The multiplier is `tierStatMult` (2.8 since 2026-10-26; v1 started at 2.5), and the supply is `tierSupplyMult` (1, 2, 4). v1's presence column is gone with territory: see Appendix A.

Why ×2.8 is a fair sidegrade:

- **Bodies:** one body keeps its full damage until it dies, while three bodies lose damage as each one falls (Lanchester). Under focused fire, a ×2.8 Bloomed deals about 30% more total damage than the three units it replaced, with about 7% less total HP.
- **Splash:** it takes one splash, cleave or cloud hit instead of three.
- **Its costs:**
  - It's vulnerable to `slayer` units (×3.0).
  - It fields fewer bodies to block melee.
  - Under rounds, its survivors count ⅔ the supply of their parts toward Heartcap damage and toward winning a clash at the 45 s cap (§6.7). For the same strength, a swarm of base units hits the Heartcap harder than a few merged ones, as it held more ground under v1's presence.

### 5.6 Merging (Milestone 2)

v1's rule applies under rounds (§1.3 #9). What changes is when it happens: every squad fields at tier 1 each round (§4.7), and squads knit at the clash's opening muster, before anyone moves (below).

**Eligibility.** A unit can merge if all of these hold:

- its tier is below 3,
- its `mergeOn` flag is set (copied from its building's merge toggle when the squad is fielded; the toggle can't change during a clash),
- it hasn't dealt or taken damage in the last 40 ticks (2.0 s),
- it isn't already knitting,
- it isn't burrowed or a `burst` unit (§5.3). A Burster never merges, so it has no merge perks (§11.3).

**Detection** runs every 10 ticks, per side:

1. Walk the eligible units in id order.
2. For each unreserved unit `u`, find other eligible, unreserved units with the same `(unitId, tier)` within **1.5 tiles** (center distance).
3. If there are at least 2, take the two nearest (ties go to the lower id) and reserve all three.

**Knitting** lasts 20 ticks (1.0 s). The three units stop attacking and retargeting and walk toward their centroid. They can be attacked. If any of them takes damage or dies, the knit cancels and the survivors are released.

**Completion.** Remove the three units and spawn one at the centroid:

- the same `unitId`, at `tier + 1`
- max HP and damage per §5.5
- current HP = `round(newMaxHp × ΣcurrentHp / ΣmaxHp)` (no free heal)
- radius unchanged by tier, as the sprite keeps its size (§5.8): `tierRadiusMult` is 1.0 (§18.2 #53). v1's data grows it ×1.25 per tier until R2 changes it; speed, range and attack interval unchanged
- the tier's `mergePerks` applied
- `sourceBuildingId` and `mergeOn` taken from the lowest-id parent. A unit knit from two squads' units therefore credits all its damage to that parent's building (§5.7)
- `lastCombatTick` set to the latest of its parents' values, so an idle trio of Bloomed units can knit again right away

With no supply cap, nothing waits on supply. A merged unit counts its own supply (§5.5).

**The radius doesn't grow** (§18.2 #53, decided 2026-11-01). A merged unit keeps its parts' collision radius, now that its sprite doesn't grow either. Under v1's ×1.25 an Elder Capguard's radius (about 0.65 tiles, with its `radiusAdd` perk) was bigger than an Amanita Knight's (0.45); at ×1.0 it's 0.45. The change moves the golden hashes, so R2 makes it in its first golden refresh. R4a, which moves no golden, leaves the data alone.

**The muster: squads knit in place.** This section owns the rule; it's a first guess that milestone R1's clash check settles (§16).

- **What it is:** a clash opens with a **1 s muster** (20 ticks), in which nobody moves or attacks.
- **Knitting in place:** squads with merging on knit where they stand, by the rule above (trios of identical eligible units within 1.5 tiles). The rule runs on `formationOf`'s positions (§4.6) to a fixed point: detection and knitting repeat, each merged unit standing at its trio's centroid, until no new trio forms. No enemy and no damage takes part. So Bloomed units that stand within reach of each other knit again into Elders.
- **Across squads:** units of the same type from different squads knit together when they stand within reach, whatever their buildings. Only units with `mergeOn` take part, so a neighbor with merging off adds nothing and fields at tier 1. Distance decides which squads combine, not which slots touch, so a chain such as three Burrows in a row resolves by the same rule.
- **Bonuses:** a merge-radius bonus widens the muster's reach. A knit-time bonus acts only after the muster, since the muster's knits take no time of their own.
- **Powers:** a commander power may fire from the clash's first tick, during the muster too (§6.6).
- **After the muster,** v1's rule applies on the field: units still eligible (leftovers, and units back out of combat) knit when a trio stands within reach, at the usual knit time, and fire can cancel those knits.
- **Open:** when, inside the muster, the merged units replace their parts in the sim, and so whether a power fired during the muster can break a muster knit. First guess: on the clash's first tick, so a power hits the merged units and can't break a muster knit; the muster's 1 s shows the knits (tethers, glow, pop).
- **Open:** whether the muster counts toward the 45 s clash cap (§6.7). First guess: yes, the clash clock starts on the clash's first tick.

**The toggle is a planning choice.** Each spawner has a merge toggle, on by default. It's set in planning (`M`, §10.3), and every unit the building fields that round takes its value.

**The preview.** The planning screen shows what each squad fields ("fields as 2 Bloomed + 2", §10.2):

- **One rule, one place:** `mergePreview` is the muster's own function (above), run on the same positions. So the preview equals what each side fields at the muster, by construction (§13.2).
- **The arithmetic, as an illustration:** a group of n units of one type that all stand within reach of each other knits into ⌊n / 9⌋ Elders, ⌊(n mod 9) / 3⌋ Bloomed and n mod 3 base units. A Sporeling Burrow's 8 Sporelings come to 2 Bloomed and 2 base. Where the slot's geometry gives something else, the preview shows what the geometry gives.
- **What it doesn't promise:** knits after the muster, on the field, which fire can cancel.
- **It's the same for both sides:** the general's squads show their preview too (§7.5).

**Neighbors make Elders.**
- **How:** squads of the same unit with merging on, in slots close enough that their units stand within reach, knit together at the muster (above). The preview shows the result.
- **The example:** two Sporeling Burrows side by side field 16 Sporelings. The arithmetic gives 1 Elder, 2 Bloomed and 1 base; the muster gives what the two slots' geometry allows.
- **No new rule:** it's merging's own rule meeting the formation, and it's the one combo that needs none (§11.14).
- **Tests:** §15.7 checks two Burrows side by side and three in a row, with the preview equal to what fields.

**Perks** are small stat patches defined per unit in data (examples in §11.3). The allowed patch keys are:

- `hpMult`, `damageMult`, `speedMult`, `attackIntervalMult`
- `rangeAdd`, `radiusAdd`, `splashRadius`, `slayerMult`, `healTargets`
- `resist: { slash | pierce | crush: mult }`

**Open:** whether the Elder Sporeling keeps its splash perk (0.6 tiles in today's data). The rework turned it off because, under waves, it was area damage that the swarm brought in numbers, and under rounds merges are common. Milestone R1 measures it (§16). First guess: it keeps it, as today's data does outside `?proto=rework`.

**Feedback** (renderer only, §10.4):

- faint tethers between candidate trios
- a glow while units knit
- a "Bloomed!" or "Elder!" pop
- tier **pips** on the merged unit (one for Bloomed, two for Elder), on a sprite of the unit's own size, and a gold rim on an Elder. v1 drew merged units bigger (×1.25 and ×1.5, `TIER_SCALE` in `src/render/renderer.ts`). R4a drops that, so size can mean armor (§5.8)

### 5.7 Statistics per round and per battle

The sim records deterministic counters per side. It keeps them for each round, and a battle's figures are the sum of its rounds. Reports, feats and balance tools all read them.

- units fielded each round, as they stand after the muster: type, tier, count and augments (the `fielded` record, §14.4)
- merges (by tier)
- damage dealt, attributed to buildings through `sourceBuildingId` (cloud and burst damage included)
- each lane's clash: its result (won, lost or drawn), its length in ticks, and each side's surviving supply at its end
- Heartcap damage dealt and taken, after the cap and the Sporestorm (§6.4, §6.7). A Decision reads the battle's totals (§6.5)
- gold earned (by source)
- buildings planted and sold
- commander power use (§6.6)
- the maximum number of Elders alive at once
- the maximum gold banked

**Gone:** buildings lost and destroyed (buildings can't be hit), and columns owned per lane, which drove v1's front-line graph. The report's round chart takes that graph's place (§10.4). See Appendix A.

### 5.8 The shape language

A unit's job reads from its shape, not from a paragraph (pillar 1). The rules below hold on the field, in the formation preview and on cards, for both sides.

| Cue | Shows | Rule |
|---|---|---|
| **Body size** | Armor (`armor`) | Light units are small, medium units are medium, heavy units are big, in three height bands (§14.3). Size means armor and nothing else |
| **Silhouette** | Archetype (`archetype`) | Each archetype MUST have a distinct silhouette |
| **Team color** | Side | Violet against gray (§2) |
| **Pips** | Merge tier | One for Bloomed, two for Elder, and a gold rim on an Elder. A merged unit keeps its body size |
| **Icons** | Augments | On the squad and its card, the general's included (§10.4, §11.13) |

- **No weapon marks on units** (the user, 2026-11-01). No unit or emplacement carries a mark for its damage type on the field, and none is to be added later.
  - **Why:** the archetypes are few and each is drawn distinct, so the silhouette tells a unit apart. A mark on every body was clutter: a 5 × 5 glyph covered about a third of a small body.
  - **Where the damage type shows instead:**
    - in the silhouette, where §11.3 draws a weapon (the Gill Archer's bow, the Hammercap's raised maul, the Scythecap's hooked cap, the Rootbreaker's ram). That weapon is body, and it counts toward the band;
    - in the hit sparks, which teach the matrix (§10.4);
    - on the unit's card and on the planning screen, whose matchup marks show what it's strong and weak against (§10.4);
    - in the inspect panel.
  - It replaced R4-Q2's shared mark glyphs and #55's heal mark, both agreed earlier the same day, and R4a retired `data/sprites/marks.json` with them (R4/T077). The shape block holds the body alone, so the data checks reject a mark (§14.2).
- **Emplacements** stand in their slot on a sprite of their own. Structure armor has no body band (R4-Q5, agreed 2026-11-01; §14.3).
- **Flyers and tunnelers:** a flyer floats over its shadow, and a burrowed tunneler shows as a moving mound.
- **Color is never the only cue:** body size, silhouettes, pips and icons carry the rest (§2, §10.4).
- **Sprites stay text-defined** (§17 #20).
- **Who does what** (X3, agreed 2026-11-01):
  - R4a draws the shape language on the field before R2's first playtest: bodies, pips and silhouettes.
  - R2's planning screen needs basic matchup marks to be playtestable.
  - R4b draws matchup marks in full and augment icons, and does the card-text pass, after R3 (§16).

**The matrix, in shapes.** A matchup mark (§10.4) shows the class of a unit's hits on a shape (§5.3). From the matrix and tags alone:

| Damage type | Strong against | Weak against |
|---|---|---|
| Slash | Small bodies | Big bodies |
| Pierce | Medium bodies | Big bodies |
| Crush | Big bodies | Small and medium bodies |
| Any `slayer` | Pips (Bloomed and Elder) | – |
| Area (`burst`) | – (it ignores armor, and punishes an army that stands packed) | – |

**Open:** whether area damage gets a matchup mark against crowds, since no body size is strong or weak against it. First guess: no; the Burster's own silhouette and its burst are the cue.

**The shape never lies, but a build can beat it** (§1.3 #7):
- **What never changes:** nothing changes a unit's `armor` or `damageType`. That covers augments, combos, relics, merge perks, commander powers and strains (§9.3). The shape always tells the base matchup.
  - **Open:** whether a strain, which is chosen before the run, may change a unit's body or weapon, its unit then drawn with the body it has. First guess: no.
- **What a build may change:** everything else, including stats, resistances and new effects (a cloud when a unit dies, a shield that stops arrows).
  - Augments and combos MAY tilt a matchup far enough to flip it.
  - For example, Capguards normally lose to archers, but Capguards with a spore shield that blocks arrows could win.
- **The price:** flipping a matchup MUST cost real investment, in copies, augments and plots. One flat bonus SHOULD NOT flip one. "Rare broken runs are welcome. Forced ones are not." (§12.1)
- **In plain view:**
  - A build that beats the shape shows its icon: every augment shows on its squad and its card, the general's included.
  - A matchup mark that an augment or combo changes carries its icon, and the tooltip gives the changed number (§10.4).
  - The general sees it and answers (§7.4).
- **The hits agree:** a hit spark shows the class of what the hit deals (§5.3), so a flipped matchup shows on the field as well as on the card.

---

## 6. Economy, snowball brakes and endings

### 6.1 Gold

Gold is an integer per side. It carries from round to round within a battle, and it does **not** carry between battles.

Starting gold for round 1 is `300 + 75 × (battleIndex − 1)`, the same for both sides (`startingGold`, `startingGoldPerBattle` in `data/balance.json`). Traits, relics and events may modify it (Mold Bloom: +150, §8.7). Gold is spent only in planning: on planting (§4.4), and on draft rerolls (§8.3).

### 6.2 Income per round

**At the start of each planning phase from round 2 on** (§4.7), each side gains:

| Source | Amount per round |
|---|---|
| Heartcap stipend | 100 |
| Each economy building | its gold per round (Truffle Cellar: 50; Spore Exchange: 12), × 1.5 on a loam plot (§4.6), rounded down |
| Interest | `min(interestCap, floor(gold / 20))`, on the gold the side held when the last clash began. The base `interestCap` is 10; Deep Cellars and the Spore Exchange each add 10 |
| Comeback gold | +40 to the side that lost the last round (§6.7); nothing after a drawn round |
| Pending gold | Gold an effect earned in the last clash for the next planning phase, held as the side's `pendingGold` (§14.4): Rhizome Tithe (§11.10) and the Truffle Hunters combo (§11.14). It's lost if the battle ends first (first guess) |

- **Round 1 has no income.** Starting gold takes its place (§6.1).
- **Interest gets a moment.** You plan with your gold in front of you, and the gold chip shows what the next round will pay if you Begin now: hold 140 for +7, or 200 for the cap of +10 (§10.2). Both round 3 testers found v1's interest confusing; planning makes the choice between banking and spending visible.
- **Comeback gold** is v1's comeback income, paid once a round, like the loss-streak gold in Teamfight Tactics. Winning a round pays nothing extra, so income never snowballs.
- **The general's income** follows the same rules, times a data value of **1.0**. It gets no extra gold for planning first (§1.3 #3). A blight MAY raise the value later (§9.6, §17 #14).
- Relics and traits may modify any source (§11.7).
- **Expected income:** about one new spawner a round after the opener, or 1,000–1,300 gold over a 7-round battle ([docs/archive/v1/ideas/rounds.md](docs/archive/v1/ideas/rounds.md), "The run layer"). The balance tools report the actual figure (§12).

### 6.3 Supply-line cost (retired in v2)

Forward building is gone with territory, so a building's price is its cost on any plot of your colony (§4.4). Which plot a building takes is the placement decision (§4.6). Forward Spores needs a new effect (§11.7). See Appendix A.

### 6.4 The Sporestorm: round escalation

The Sporestorm is still the stalemate breaker, now across rounds (§1.3 #1). From round 5, it raises **round damage**, the Heartcap damage a round deals (§6.7), by 20% a round, up to ×2.0 at round 9:

| Round | 1–4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|
| Round damage | ×1.0 | ×1.2 | ×1.4 | ×1.6 | ×1.8 | ×2.0 |
| In basis points | 10000 | 12000 | 14000 | 16000 | 18000 | 20000 |

- **The rule:** from the storm's first round s (5), round r multiplies round damage by `min(2.0, 1 + 0.2 × (r − s + 1))`; before round s, by 1.0. The sim holds it as an integer in basis points, `min(20000, 10000 + 2000 × (r − s + 1))`, and applies it as §6.7 says. The first round, the step and the maximum are data.
- It applies to both Heartcaps alike, to each lane's damage before the round cap of 500 (§6.7). It no longer changes unit damage, and the turrets it weakened are retired.
- **Moving it:** an event or blight may move the first round for one battle. v1's one-minute shifts become one round: Mold Bloom (§8.7) and Early Storm (§11.8) start the storm in round 4. The multiplier still rises 20% a round and stays at ×2.0 once it gets there.
- The top band shows the multiplier (its tooltip explains the storm and gives the multiplier for each round to come, §10.2), and the renderer thickens a spore haze with each storm round.
- Inside a clash, the 45 s cap breaks a stall (§6.7).
- Rot-Eater, which paid while the storm was active, gets a new effect: +1 gold for each enemy unit killed in a clash from round 5 (§11.7).

### 6.5 How a battle ends: the Heartcap race, Decision at round 9, lives

Each battle is a Heartcap race (§4.5). The sim checks for the end after scoring each round (§4.7), and the battle ends after that round's aftermath.

- **Rout:** a Heartcap reaches 0 HP; the other side wins. If both reach 0 in the same round (possible only when lanes split, §6.7), the player loses.
- **Decision:** round 9 ends with both Heartcaps standing. The winner is decided by these tiebreakers, in order:
  1. more Heartcap damage dealt in the battle (the HP each Heartcap lost, after the Sporestorm and the cap),
  2. higher Heartcap HP fraction,
  3. otherwise, the general wins.

| Outcome | Rewards (§8.6) | Lives (§8.5) |
|---|---|---|
| Win by Rout | full | none lost |
| Win by Decision | half | none lost |
| Loss by Decision | none | one lost |
| Loss by Rout | none | one lost |

- **Lives:** the run has **3 lives** (§1.3 #2). A lost battle, by Rout or by Decision, costs one, and a won battle never does. The run ends at 0 lives, and losing the boss battle ends the run (first guess, as in v1). §8.5 has the rules, and the Grove can regain a life (§8.7).
- **No repairs:** HP doesn't carry between battles, so v1's repair after a Rout win (+10%) and the Decision loss's 25% are retired (Appendix A).
- **Targets:** a median of 6–8 rounds a battle, with at most 15% of battles reaching round 9 (§12.3).
- **Open:** a bonus for a clean win, such as extra Spores or a better pick, so that a close call costs a bonus rather than health. Not adopted (§18.2).
- **Open:** whether losing the boss battle ends the run, or costs a life like any other battle (first guess: it ends the run).
- A single battle outside a run shows only the outcome and the stats (§10.5).

### 6.6 Commander power: once per clash

- Each commander has exactly one active power. It is the one live action (§1.3 #1).
- **Once per clash:** the power can be fired at most once in each clash. It's ready from the clash's first tick, the muster included (§5.6). An unused power doesn't carry to the next clash. v1's cooldown and initial delay are retired: the data's `cooldown` and `firstReady` are marked retired (§14.2) and ignored until R2 removes them.
- A power targets a point, a lane or nothing (global).
- Activate it with `Q` or the bottom band's button, then click a target. Aiming works while the clash is paused, and the command executes on the next tick. In planning and the aftermath it's refused (§10.3).
- Buildings can't be hit, so a power that hit buildings in v1 now hits units only. It hits emplacements as units (§6.7).
- A power that kills a side's last units and emplacements in a lane ends that lane's clash like any other kill (§6.7).
- Powers are ordinary deterministic commands (§14.5).
- Rhizome Tithe (gold per column held) and Sporestorm Sigil (a shorter cooldown) were tied to retired systems and get new effects. Rhizome Tithe pays gold at the next planning phase (§6.2, §11.10). The Sigil keeps the once-per-clash rule: from round 5, your power's effect is 50% stronger (§11.7).
- Generals have no active power; each has a passive instead (§7.7).

### 6.7 How a clash ends and what it costs the loser

**Surviving supply.** A side's surviving supply in a lane is the sum, over its living units in that lane, of each unit's current supply (§5.4): a merged unit counts its own supply (§5.5). Every living unit counts, including one that is knitting, and a Burster that hasn't burst, which counts its supply (1) like any unit (§5.3). Siege units count once here. It's the number on the lane tug (§10.2) and the one the 45 s comparison reads.

**Damage supply** is surviving supply with each `siege` unit counted twice. It's used for Heartcap damage only.

**Emplacements.** A tower fields as an emplacement (§4.4). **Open:** how an emplacement counts. First guesses, to settle in R1:
- An emplacement is a unit in the clash. It never moves, and it can be attacked and killed. Its armor is `structure` (first guess).
- It keeps its side alive in its lane: a lane ends only when a side has no units and no emplacements left.
- It counts 0 supply, toward both Heartcap damage and the 45 s comparison.
- If both sides have only emplacements left at 45 s, the lane is a draw (E5).
- Commander powers hit emplacements as units (§6.6).

§4.4, §5.2, §6.6 and §11.2 point here.

**A lane's clash ends** on the first tick when one side has no units and no emplacements left in the lane, or at **45 s** (900 ticks) of the clash clock. Its result locks on that tick:
- The side with units or emplacements left wins the lane. At 45 s, the side with more surviving supply wins it.
- **The margin** is what the winner's damage counts. A wiped-out loser has 0, so the margin is all the winner's damage supply; at 45 s only the difference counts. **Open:** the margin when siege units are in play. First guess: the winner's damage supply minus the loser's, never below 0.
- On Twin Roots each lane is its own clash, and a lane that ends first holds still while the other fights on.
- **Open:** whether the 1 s muster (§5.6) counts toward the 45 s. First guess: yes; the clash clock starts at the muster's first tick.

**The clash ends** when every lane's clash has ended. A clash typically lasts 20–40 s.

**What it costs the loser.** As the clash ends, the sim scores the round, in integers:

1. **Lane damage:** per lane, raw damage = 25 × the margin, to the Heartcap of the lane's loser. Merged units count their own supply, and siege units count double (damage supply).
2. **The Sporestorm:** × the round's multiplier in basis points (§6.4), floored: `floor(raw × stormBp / 10000)`.
3. **The loser's damage-taken modifiers,** such as Rot Ward's 15% less (8500 basis points, §11.7): × each modifier in basis points, in turn, floored.
4. **The cap:** each Heartcap's damage is summed over the lanes it lost, then capped at **500** per Heartcap per round, then applied, down to 0 at the lowest (§6.5). At 500, no Heartcap falls in fewer than four lost rounds, so there's no cliff.

- **Open:** when an effect that heals on a round's result lands, such as Mending Moss (§11.7). First guess: after step 4, never above the Heartcap's max HP.

The aftermath then shows the round (§10.2).

**The round's result.** The side that dealt more Heartcap damage this round, as applied in step 4, wins the round, and the other side loses it; equal damage (including none) is a **drawn** round. The round's loser gets +40 comeback gold next round (§6.2), and the round tally shows the result (§10.2).

**Edge cases.** **Open:** these are first guesses, to confirm in R2. Each has an ID that §15.7's tests cite:

| ID | Case | Result |
|---|---|---|
| E1 | Only one side fields units or emplacements in a lane | They still appear, and that side wins the lane on the first tick with its whole damage supply as the margin |
| E2 | Neither side fields anything in a lane | No clash in that lane. It's drawn: no damage either way |
| E3 | A tie in surviving supply at 45 s | The lane is drawn: no damage either way |
| E4 | Both sides wiped out on the same tick | The lane is drawn: no damage either way |
| E5 | Both sides have only emplacements left at 45 s | The lane is drawn: no damage either way |
| E6 | A side wins a lane with only emplacements left (the other side has nothing) | It wins the lane with 0 surviving supply and deals no damage |
| E7 | Two lanes with different winners in one round | Each Heartcap takes the damage of the lane it lost, both in the same round, each capped at 500. The round goes to the side that dealt more, and the tally shows each lane's half (§10.2) |
| E8 | Both Heartcaps reach 0 in the same round | The player loses (§6.5) |

**Why only survivors count.** A close loss costs little and a rout costs a lot, so the bars say how a round went. Merged units count their own supply (twice the base for Bloomed, four times for Elder), so for the same power a swarm of base units hits harder than a few merged ones. Siege units count double toward damage, which gives the Rootbreaker a job when there are no buildings to break; they count once when a lane is decided at 45 s, so they don't decide who wins.

---

## 7. The enemy general (AI)

### 7.1 An honest opponent

The general is a full participant in the sim and obeys every rule the player does:

- the same starting gold (§6.1), income rules (§6.2) and prices,
- the same kit and copy rules: each copy is one building it can have planted at once, and selling returns the copy, refunding 100% in the planning phase it was planted and 60% once it has fielded (§4.4, §8.10). Its kit and copy counts by battle are §7.8's, and copies arrive in R3,
- the same plot rules: its colony has the map's layout of ranks, files, loam and stumps (§4.6). How many plots it opens in a battle is §4.6's (**Open** there),
- the same merge rule and merge toggle (§5.6).

There is no supply cap for either side (§5.4).

It acts **only** by issuing the same commands as the player (`plant`, `sell`, `toggleMerge`; §14.5). Its planning commands are ordinary commands, written to the command log exactly like a player command.

Where it differs:

- **It plans first.** At the start of every planning phase it takes its turn (§7.2) before the player's begins, and the player then plans seeing its whole colony and the army it will field (§7.5). It never sees what the player plants in the same planning phase; it reacts to the squads the player fielded in earlier rounds (§7.4) and to its intel file (§7.6). The information edge is the player's by design (§1.3 #3).
- It has a personality **passive** and no active power (§7.7, §17 #13).
- Its kit, copies and augments grow with the battle index, as a player's kit grows through drafts (§7.8). It takes no drafts during a battle.
- It draws all randomness from the `ai` RNG stream.

**No extra gold for going first.** The general's income is multiplied by a data value, the enemy income multiplier, which is ×1.0. A blight MAY raise it later (§9.6); that is M7's opt-in difficulty ladder. There is no Easy / Normal / Hard (§17 #14).

**Where the challenge comes from.** Since the general has no edge in gold or information, the challenge comes from the rules, and tuning works on these:

- **scarce plots** (§4.6);
- **limited copies:** an answer the player doesn't own can't be planted (§8.10);
- **the cost of changing course:** a building that has fielded sells for 60% (§4.4);
- **mixed armies:** as its kit grows, a general fields more than one archetype, so one answer rarely covers all of them (§7.8, §11.11);
- **its kit grows each battle,** with augments, like the player's (§7.8);
- **bigger Heartcaps** for later generals: 2000 + 250 × (battle index − 1), and 3600 for the boss (§4.5).

The same AI framework also drives the **strategy bots** used in headless testing on the player side: `bot:balanced`, `bot:balanced-nomerge`, `bot:rush`, `bot:turtle`, `bot:greedy`, `bot:slayer`, `bot:slayer-nomerge` and `bot:mono:<buildingId>` (`data/bots.json`). A bot plans in the player's turn with §7.2's loop and doesn't read the general's army. Bots never adapt unless a flag enables it.

### 7.2 Decision loop

The general takes one turn in every planning phase. It comes after income, the round's Sporestorm multiplier and `roundStart` triggers, and before any draft and the player's planning (§4.7). Its income has already landed by then, multiplied by the enemy income multiplier (§6.2, §7.1). Planning is untimed and the clock is stopped (§4.2), so the turn is a fixed sequence:

1. **Apply a doctrine change** if one is due: in round 1, the opening doctrine from the intel file (§7.6); at a counter cycle, the counter's activation, which may add a counter card to its kit and sell for room (§7.4). This is the only time it sells.
2. **Buy and plant in a loop:**
   - **Round 1:** work through the opener list first (§7.7, §11.11), skipping a building it can't afford or has no free copy of. Then go on as below with the gold left.
   - **Pick a target purchase:** a weighted pick (`ai` stream) from the cards in its kit, with `doctrine weight × situational multipliers × counter multipliers` (§7.4, §7.6). A card with no free copy, or with no free plot for it, weighs 0. A weight MAY carry limits from the data: at most so many owned (`maxOwned`), or only from a given round. Until R3 brings copies, those limits are the only cap on a card (§7.8).

     | Multiplier | Condition |
     |---|---|
     | economy × 1.5 | before round 3 |
     | economy × 0.3 | from round 7 |
     | `tower` buildings × 2 | after a round it lost (the Puffball Mortar, an emplacement in v2, §11.2) |
     | counter weights | §7.4 |

   - **Plant the target** at the best-scoring plot (§7.3) if it can afford it, then pick again.
   - **Stop** when the target is out of reach or no plot is free. A target out of reach stays its target into the next planning phase, once, so it can save for a dear building; then it picks afresh.
3. **Set merge toggles:** on by default. It switches off merging on its `swarm` buildings while `slayer` units made up more than 25% of the supply the player fielded last round (the `fielded` record, §14.4). The decision reads only last round's record, so step 2's placement score (§7.3) already knows which buildings will merge.

**Banking.** The loop spends whatever it can, so the general banks only what is left over. Interest counts the gold a side holds at Begin (§6.2), which for the general is what its turn left. **Open:** a bank reserve, the gold it keeps back for interest (first guess: 0, which is the loop above).

Limits that v1 keyed to the clock (`afterSeconds` in `data/generals.json`) are read in rounds, one round per minute: "after 3:00" becomes "from round 4".

The turn issues all its commands before any draft opens and before the player's planning begins, so everything it planted and sold is on the field when the player drafts and plans (§4.7, §7.5).

### 7.3 Placement heuristic

The candidates are the free plots of the general's colony (stump plots are never free). The general's formation is its colony, by the same rule as the player's (§4.6), so placement chooses where each squad stands: **melee in front, ranged and area behind, economy at the back.**

- **Back-line buildings:** a spawner whose unit has the `ranged`, `support` or `burst` tag, and every `tower` (emplacement). **Front-line buildings:** every other spawner.
- `depth` is a plot's rank counted from the front: 0 for the front rank, 1 behind it, and 2 for the third rank that sprawl adds (§4.6).
- `offCentre` is `|file centre − lane centre|` in tiles: the distance across the lane from the centre of the plot's file to the centre of its lane. It works for even file counts too: on a one-lane map's 4 files it is 3, 1, 1 and 3. On Twin Roots it is measured in the plot's own lane.

Score each candidate:

| Building | Score |
|---|---|
| front-line spawner | `−10 × depth − 1 × offCentre + 2 if beside a plot holding the same building with merging on` |
| back-line spawner or tower | `−10 × abs(depth − 1) − 1 × offCentre + 3 if the plot in front (same file, one rank forward) holds one of its front-line buildings + 2 if beside the same building with merging on` |
| economy | `+10 × depth + 8 if on loam + 1 × offCentre` |
| utility | `+10 × depth + 1 × offCentre` |

- **What it gives:** shield walls in front and archers behind them, squads of the same unit side by side so they can knit into Elders (§5.6), and economy buildings at the back, where their holes in the line cost least.
- **Noise:** add seeded noise of ±0.5 from the `ai` stream before tie-breaking. Ties then go to the front rank, then the lower file.
- **Ties between buildings** go by building id, wherever the general chooses among buildings on equal terms (such as which spawner to sell for room, §7.4). **The cheapest counter building** (§7.4) breaks ties by cost, then by id.
- The weights are first guesses. R2 tunes them, and R3 adds a term for combos (§11.14).

**Lanes on Twin Roots.** Each lane has its own colony of 6 plots and its own clash (§4.6, §6.7), so the general first picks a lane for each building, then a plot in it.

- **The starting rule:** a spawner goes to the lane where the general lost the most last round. A lane's need is the player's surviving supply minus its own when that lane's clash ended (a lane it won scores below 0). Each spawner it plans in a lane lowers that lane's need by its squad's supply, so it spreads once it has covered the loss.
- **Round 1,** and ties: the lane where it has planned less supply, then the lower lane.
- **Aggressive personalities** (the Blightwright, `laneStyle: aggressive`) send spawners instead to the lane where the player fielded the least supply last round.
- **Economy and utility** go to a lane with a free loam plot, else to the lane with more free back-rank plots.
- A full lane falls back to the other.
- **Open:** the lane rule. First guess: the starting rule above. Twin Roots is where mono Sporeling escaped its answers in the counter-matrix check, because `bot:balanced` splits its army ([docs/archive/v1/ideas/combat-rework.md](docs/archive/v1/ideas/combat-rework.md#the-counter-matrix-check); [docs/archive/v1/ideas/rounds.md](docs/archive/v1/ideas/rounds.md), "The general (§7)").

### 7.4 Counter cycle (Milestone 4, in rounds)

The counter cycle still runs, now in rounds. It reads what the player fielded and leans the general's buying toward an answer. Its counters show up as new buildings in its colony, which the player sees before planning (§7.5): counters become moments.

**Schedule:**

| When | What happens |
|---|---|
| Round 4's planning | Cycle 1: it reads the squads the player fielded in rounds 1–3, and the counter activates at once |
| Round 7's planning | Cycle 2: it reads rounds 4–6, and the counter activates at once |

The boss also gets an early cycle in round 3's planning, reading rounds 1–2.

- Each cycle analyses and activates in the same planning phase. v1 warned two waves ahead; with the vague telegraph retired there is no pending counter to hide (§7.5, Appendix A). The activation rounds are those of [docs/archive/v1/ideas/rounds.md](docs/archive/v1/ideas/rounds.md).
- A cycle runs in the general's turn (§7.2, step 1), so the counter's buildings are planted before the player plans.
- A battle that ends sooner never reaches its later cycles.
- **Open:** whether a counter should land a round after its analysis instead, so the player's build gets a round to pay off. First guess: no, it activates in the planning phase of its analysis, as above.

**Analysis: the squads the player fielded.** Under rounds the general reads the squads the player actually fielded, which is exact; v1 estimated them from spawn rates and merged fractions. The analysis reads only the `fielded` record (§14.4): per side and per round, each unit type with its tier, count and augments.

1. Take every unit in the player's `fielded` record for the rounds read, at its base supply.
2. Turn the supply into shares of the total: Light, Medium and Heavy armor; ranged; and `eliteShare`.
3. `eliteShare` counts only real merging: the share of the fielded supply that the record shows as Bloomed or Elder units (§5.6). A merge toggle left on with no merges therefore reads as no threat. A unit of 1 supply counts by its armor whether or not it merged: that is the combat rework's swarm read (the balance key `ai.counter.swarmMaxSupply`, absent from `data/balance.json` and set to 1 by the `swarmread` and `rework` presets in `src/data/proto.ts`), since a merged Sporeling swarm otherwise reads as Elite. R1 measures whether rounds still need it.
4. Score the four counter kinds:

| Kind | Score | Counter set (buildings in the general's faction roster whose unit has…) |
|---|---|---|
| **Anti-Swarm** | `lightShare × (1 − 0.5 × eliteShare)` | `splash`, or `slash` damage |
| **Anti-Line** | `mediumShare` | `pierce` damage |
| **Anti-Armor** | `heavyShare` | `crush` damage or `siege` |
| **Anti-Elite** | `1.2 × eliteShare` | `slayer` |

5. Add seeded noise of ±0.03 to each score and take the highest. Ties resolve in this order: Elite, Armor, Line, Swarm.

If the player fielded nothing in the rounds read, the cycle passes.

**What the counter-matrix check found.** The counter-matrix check ([docs/archive/v1/ideas/combat-rework.md](docs/archive/v1/ideas/combat-rework.md#the-counter-matrix-check)), run on v1's rules on 2026-10-30 ([results](docs/archive/v1/balance-backlog.md#counter-matrix-on-todays-rules-2026-10-30)), measured what beats each strong mono build:

| Against | Best answers |
|---|---|
| Gill Archers | Sporelings (88%), or a Sporeling-led mix |
| Sporelings | `bot:turtle` (61%), Amanita Knights or Capguards (56–57%) |
| Amanita Knights | Hammercaps (93%) |
| Morel Runners | Veilstalkers, alone or with Amanita Knights (97–98%) |
| Veilstalkers | Sporelings with Gill Archers (95%) |

- The counter sets above match most of these: slash for the swarm (Capguards, Amanita Knights), crush for heavy armor (Hammercaps), pierce for medium (Veilstalkers against Morel Runners).
- They miss archers: the analysis computes a ranged share, but no kind scores it, and the check's answer to archers is a swarm. **Open:** whether R1 adds an Anti-Ranged kind that scores `rangedShare`, with `swarm` spawners as its set. First guess: no, the four kinds above until R1 measures it.
- **Open:** whether the counter sets come from R1's clash matrix instead, as [docs/archive/v1/ideas/rounds.md](docs/archive/v1/ideas/rounds.md) suggests. First guess: by damage type and tag, as in the table above.
- **Open:** an Anti-Air kind for flyers, which come later (§1.3 #11). First guess: none until flyers arrive.
- **Open:** (settled in R3) how the analysis reads an augment that flips a matchup, so the general can answer it as §1.3 #7 requires. First guess: the general rates its counter set against the player's squads as augmented (the compiled matchup, §5.3), skips a building that loses, and reaches for the next answer.

**Activation:**

- The doctrine weights of buildings in the counter set are multiplied by **×3**, and all others by **×0.6**. That puts roughly 55–65% of new spending into counters: a strong lean, not a hard switch.
- **A missing answer:** if the general's kit has no card in the counter set, it adds the cheapest counter building from its faction roster to its kit (ties: §7.3), with an added card's copies (§7.8). This is the only way its kit grows during a battle.
- **Selling for room:** if it has fewer than 2 free plots, it sells up to 2 of its own spawners outside the counter set whose units fare worst against the player's dominant armor (lowest matrix multiplier), preferring the rearmost. A sold building that has fielded refunds 60%, as the player's does, and its copy returns to the general's kit.
  - **The dominant armor** is the armor class with the largest share in the analysis. Ties go Heavy, then Medium, then Light, the order of the kinds' tie-break above.
  - **Further ties** go to the lower file, then by building id (§7.3).
- The doctrine stays until the next activation replaces it.

**Counters become moments.** The buildings it plants under a new counter carry a "New" sprout (§10.4), the General's Intent panel names the counter and its buildings ("Countering SWARM", "New: Capguard Hall"), and a callout marks it (§10.2). The general's counters by round, with the buildings it planted and sold for them, are in the post-battle report (§10.4).

### 7.5 What the player sees

The player sees the general's whole army before planning. Nothing about the general is hidden; its next move is unknown only because it hasn't made it yet (§17 #9).

- **Its colony and the army it will field:** every round, once the general has planned, its colony and its formation preview are on the field: squad types, formation positions, merge previews and augment icons (§10.2). Its opener in round 1 is included, so the opener is no longer a guess.
- **Matchup marks:** choosing a card or hovering a squad marks the general's squads with the class of the hits between them (§10.4).
- **General's Intent panel** (top right, §10.2):
  - its portrait, name and doctrine: what it remembers about the player (§7.6), or the counter it's running (§7.4);
  - its income this round and the gold it banked, which are public because it plays by the player's rules (§7.1);
  - what it changed this round: the buildings it planted and sold;
  - in its tooltip, its passive (§7.7) and its kit, each card with its copies and augments (§7.8).
- **Callouts:** when a counter lands (§7.4), and round 1's "The Gray Rot remembers your **SWARM**." (§7.6).
- **Its kit on the route node:** a battle node on the route map shows its general, any elite modifier and the general's kit for that battle, each card with its copies and augments, so the player can plan a run around who's coming (§8.2, §10.5). The kit is fixed by the run seed and the battle index (§7.8), except the boss's first extra cards, which follow the intel file and can change until the boss battle starts. The boss node says so.
- **Intel bars** on the route map (§7.6).
- **Post-battle report:** the general's counters by round, for example "Countered: SWARM (round 4) with Capguard Hall ×2; sold Gill Archer Nest" (§10.4).
- **Retired: the vague telegraph.** v1 warned of a coming counter's kind and a countdown, never the units. The player now sees the general's army itself, so the warning, its countdown and the `counterWarned` event go in R2 (§14.5). See Appendix A.

### 7.6 Intel file (memory across a run)

- **After each battle,** won or lost, the run builds the player's profile for that battle: the average of the four kind scores (§7.4) of the squads the player fielded in each of the battle's rounds, read from the `fielded` record (§14.4).
- **Update:** `intel = 0.5 × intel + 0.5 × lastBattleProfile` (the first battle simply sets it).
- **Opening doctrine:** every new general starts the battle with a doctrine aimed at intel's top kind, at reduced intensity (×2 for the counter set, ×0.8 for everything else). It applies from round 1's planning, so the player sees its effect in the general's opener, and it ends when the first counter activates (§7.4). The battle opens with the callout "The Gray Rot remembers your **SWARM**."
- **The boss** (the Pale Sovereign) uses the *unweighted* average of every battle in the run. It runs a **dual doctrine** against the top two kinds (×2.5 each) for the whole battle, on top of its normal counter cycles, and its kit's first extra cards are the cheapest counters to those two kinds (§7.8).
- **Visibility:** the route map shows the player their own intel bars ("Gray Rot intel: Swarm ●●●○, Elite ●○○○ …"). It's your history, shown fairly, so you can plan a pivot before the boss.

### 7.7 Generals

| General | Personality and doctrine bias | Passive (v2) | Appears in |
|---|---|---|---|
| Old Mother Mold | Swarm, early aggression; heavy on `swarm` spawners | `swarm` squads field 10% more units, rounded up: a Sporeling Burrow's 8 Sporelings become 9 (first guess; v1: `swarm` buildings spawn 10% faster) | battles 1–3 |
| The Lichen Baron | Defensive; towers and Heavy units | Units in its front-rank squads have +20% HP (first guess; v1: its buildings had +20% HP, and buildings aren't in clashes) | battles 1–4 |
| The Blightwright | Siege pushes with ranged support; aggressive lane choice (§7.3) | `siege` units +15% speed (kept) | battles 2–4 |
| **The Pale Sovereign** (boss) | Adaptive; dual doctrine from the whole run's intel; early counter cycle | Units from buildings in its doctrine's counter sets deal +15% damage (first guess; v1: Heartcap turrets +25% damage, and turrets are retired) | final battle |

- The three new passives are first guesses, to tune in R2 with the rest of the general. Each keeps its general's personality: more bodies for the swarm, a sturdier line for the defender, sharper answers for the adaptive boss.
- The v1 passives' stats (`building.spawnInterval`, `building.hp`, `side.turretDamage` in `data/generals.json`) go with their systems. The new effects need stats of their own (§14).
- Opener lists and doctrine weights are in `data/generals.json` (§11.11).

**Elite nodes** use a regular general plus one elite modifier drawn from `run` RNG (`data/elites.json`):

| Modifier | Effect |
|---|---|
| *Fortified* | Its battle Heartcap +30% HP (§4.5) |
| *Veteran* | One more augment on each army card in its kit (first guess). Until R3 brings augments: +1 upgrade level on all its units, as in v1 |
| *Swift* | Its units +15% speed (first guess; v1: its buildings' first spawn was instant, and spawn timers are retired) |

### 7.8 Enemy kit progression

The general has a kit of its own, by the same rule as the player's (§8.10): cards with copies, and augments. It takes no drafts, so its kit is set by the battle index when the battle starts. Only a counter's missing answer adds a card during a battle (§7.4).

| Battle | General's kit |
|---|---|
| Battle index *i* | Its opener's cards, plus (*i* − 1) extra cards from its preferred list, as in v1; copies by the player's rule (from R3); *i* − 1 augments (from R3) |
| Elite | +1 augment, and the Veteran modifier's (§7.7) |
| Boss | 7 cards and 4 augments; copies by the player's rule (from R3); its first extra cards are the cheapest counters to the run's top two intel kinds (§7.6) |

- **Cards:** the opener's cards, then the first cards of its preferred list that it doesn't already have, as in v1 (`enemyKit.blueprintsPerBattle` 1 and `bossBuildings` 7 in `data/balance.json`). A general without a preferred list has its whole faction roster, as in v1. So in battle 1 the Lichen Baron's kit holds only a Capguard Hall and a Truffle Cellar, and Old Mother Mold's only a Sporeling Burrow (its preferred list starts with the Truffle Cellar, so its second army card, the Gill Archer Nest, joins in battle 3). The player sees such a one-archetype army before planning (§7.5).
- **Copies (from R3):** the player's rule (§8.10): 2 copies of each opener card, and 1 of each card added after it, including a counter card added in battle (§7.4). Until R3 there are no copies, and v1's `limits.*.maxOwned` in `data/generals.json` apply (for example, at most 3 Truffle Cellars).
- **Open:** whether the general needs more copies because it takes no drafts. First guess: no, the player's rule above.
- **Plots:** how many plots its colony opens in a battle is §4.6's (**Open** there).
- **Augments** (from R3) replace v1's random upgrade levels: one per battle index above 1 (§1.3 #7). Each is drawn for a spawner card in its kit from the `ai` stream, sub-seeded per battle index, so the kit doesn't depend on the path the player takes and its route node can show it (§7.5). An augment attaches as the player's do (§11.13). Every augment shows on its squad and its card. Until R3, *i* − 1 random upgrade levels on units in its kit (`ai` stream) stand in for them, as in v1 (`enemyKit` in `data/balance.json`).

### 7.9 Milestone 1's scripted general

Milestone 1 shipped a scripted general with no analysis, counters or intel. It played the Velvet Bloom roster in the Gray Rot palette (a mirror match, until the Gray Rot's own roster in M7), opened with a Sporeling Burrow and a Truffle Cellar, and bought by fixed doctrine weights: Sporeling Burrow 3, Capguard Hall 3, Gill Archer Nest 2, Truffle Cellar 2 (while it owned fewer than 3), Rootbreaker Den 1 (after 3:00) and Puffball Mortar 1. It placed by v1's §7.3 and, from M2, merged. It stays in `data/generals.json` as `scripted`, the default general where none is named; under v2 it plans by §7.2 and §7.3 with those weights. The full v1 text is at <https://github.com/Swalliso/Sambattler/blob/aa37365/SPEC.md>.

---

## 8. Run structure (Milestone 3+)

A run is a short campaign of battles on a route. Between battles only the run's state carries: the kit and its copies (§8.10), augments, relics, the plots the colony has gained (§4.6) and lives (§8.5). Each battle starts with its starting gold (§6.1) and, as a first guess, an empty colony (Open, §4.6). Round 1's planning replaces v1's deploy phase (§4.7).

### 8.1 Run setup (in the Underroot)

1. **Pick a commander** (from those unlocked).
2. **Equip colony traits** within your Root Capacity (§9.4).
3. **Pick a strain** for each building that has unlocked alternates (§9.3).
4. **Ban up to 3 buildings** from the shared pool (§8.4). Commander core buildings can't be banned. As a first guess, neither can the always-in set's, so the answer to the swarm is in every run (Open, §8.4).
5. **Toggle blights** (after your first boss win) to set the run's Decay (§9.6).
6. **The run seed** comes from `crypto.getRandomValues` at run start, outside the sim, and is recorded in the save. The `?seed=` debug parameter overrides it.
7. **The run packs are dealt:** 4 of the 10 run packs (§8.4, §11.15), from the run's `draft` stream before any offer. The route map and the run bar show them.

**The run starts with:**

| Run state | At the start |
|---|---|
| Kit | The commander's 3 starter buildings, **2 copies each** (copies arrive in R3, §8.10) |
| Lives | 3 (§8.5) |
| Colony plots | The map's own: 8 on one-lane maps, 6 per lane on Twin Roots (§4.6). None gained yet |
| Augments, relics | None |
| Intel | None: the first general opens without a doctrine from memory (§7.6) |

| Commander | Starting kit |
|---|---|
| Vesper Velvetcap | Sporeling Burrow ×2, Capguard Hall ×2, Truffle Cellar ×2 |
| Armilla the Vast | Capguard Hall ×2, Truffle Cellar ×2, Puffball Mortar ×2 |
| Cordis the Puppeteer | Sporeling Burrow ×2, Gill Archer Nest ×2, Truffle Cellar ×2 |

The starters are each commander's `starter` list in `data/commanders.json`. Armilla's Puffball Mortar sits outside the six core archetypes unless the Mortar becomes the sixth (§11.2).

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

- **Battles per run:** 4 or 5, including the boss. A battle of 6–8 rounds takes about 6–8 minutes if planning averages about 30 s a round ([docs/archive/v1/ideas/rounds.md](docs/archive/v1/ideas/rounds.md)), which matches the 25–35 minute target.
- **Run length under lives:** a lost battle no longer ends the run (§8.5), so more runs reach the boss and a run grows longer. With lives, an emulation under v1's waves put a run at about 35–45 minutes for a person at 1× ([docs/archive/v1/ideas/after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md), Tier 1 item 2). The route's shape (its rows and the node kinds in each) SHOULD live in data, so a shorter run can be measured.
- **Battle nodes** show:
  - the map name and lane count;
  - the general's portrait, name and title, and any elite modifier (§7.7);
  - **the general's kit:** each card with its copies, and its augments' icons (§7.5, §7.8). You can plan a run around who's coming.

  The kit a node shows is the general's kit at the node's nominal battle index, the same index that picks its eligible generals (`src/run/route.ts`). Once the node is in the row you choose from, it shows the kit at the battle index it will actually be fought at.
- **Assignment** (`route` stream):
  - Generals are drawn from those eligible for that battle index. Nodes in the same row get different generals, and a general repeats only once every eligible one has fought in the run.
  - Maps are drawn from the pool with no repeats until it's exhausted. The first release ships 4 maps (§11.9).
- **Intel bars** (§7.6) are shown on the route map.
- **The run's packs** (§8.4) are listed on the route map, each with its building and its two relics.

### 8.3 Drafts during battles

**When:** a draft opens after rounds 2, 4 and 6, in the next planning phase (rounds 3, 5 and 7), once the general has planned (§4.7). The clock is already stopped in planning, so nothing holds. A battle has up to 3 drafts: one that ends before a draft's planning phase skips it. Battle 1 starts from the commander's starting kit (§8.1).

- The draft MUST be resolved (a pick or a skip) before Begin. A blueprint or copy you pick can be planted in the same planning phase, and an augment you pick shows on its squad in the formation preview at once (§10.2).
- The general takes no drafts in battle. Its kit grows by battle index, and its counters add buildings (§7.4, §7.8).

**Each draft offers 3 cards.** There are four card types:

| Card type | Effect |
|---|---|
| **Blueprint** | Adds a building card you don't own to your kit, with 1 copy, for the rest of the run (§8.10) |
| **Copy** | +1 copy of a card already in your kit (§8.10) |
| **Augment** | Changes how one building's units play, for the rest of the run (§11.13). It shows on its card and its squad |
| **Relic** | A run-long global passive (§11.7) |

**How offers are generated** (`draft` stream):

- **Type weights:** blueprint 35%, copy 20%, augment 25%, relic 20%. While your kit has fewer than 5 cards, the blueprint weight is 50% and the others share the rest in proportion. Empty categories are reweighted away.
- **Rarity** (common/uncommon/rare): 70/25/5 in battle 1, then each battle moves 3 points from common to rare. Spoils drafts after an elite get +10 rare. A blueprint or copy card has its building's rarity (`rarity` in the building's data, common when unset). An augment has its own (§11.13).
- **Exclusions:**
  - no duplicate cards within an offer;
  - a blueprint only for a building you don't own, and a copy only for a card you do;
  - an augment only for a building in your kit, and never one you already have;
  - no relics you already own.
- Commander core blueprints are weighted **×2** against every other blueprint.

**Rerolls and skips (in-battle drafts):**

- A reroll costs 20 battle gold, plus 10 per extra reroll in the same draft.
- Skip a draft to take +40 gold instead. The gold lands in the same planning phase, so it counts toward that phase's interest (§6.2).

**Determinism:** a pick is a command (`draftPick { cardId }`, with `draftReroll` and `draftSkip`; §14.5), executed in planning like a placement. Each offer is a pure function of (run seed, battle index, draft index, run state), so battles stay replayable.

**Open:** a cap on copies of one card. First guess: at most 4. Without one, plots are the only limit on a drafted card (§4.6).

**By milestone** (§16): R2 moves v1's drafts (blueprint, upgrade and relic, at v1's weights of 35/45/20) to the planning phases above. R3 replaces the upgrade card with the copy and augment cards and sets the weights above.

### 8.4 Draft pool composition

A run's draft pool deals from three sources. Bans remove buildings from it.

- **Commander core:** 6 buildings per commander (`core` in `data/commanders.json`), always in the pool. A core building you don't own is offered as a blueprint, and one you own as copies. The 3 starter buildings come from the core.
- **The always-in set:** the six core archetypes and the Truffle Cellar (§11.2), in every run (first guess). Its contents follow the sixth archetype, which is still open (§11.2). It always holds an answer to the swarm: the area-damage archetype. The swarm has been the hardest army to answer in every measurement, so the answer MUST be in every run. This section owns the set: §11.15 and other sections point here.
- **Run packs:** 10 themed packs, each one building plus two relics (§11.15). Each run deals **4** of them at run start (§8.1), and only the dealt packs' buildings and relics reach the run. A pack's building is usually one of the roles outside the six (healer, slayer, cleave, fast swarm, siege, tunneler, flyer, emplacement, §11.2). Packs make runs differ before battle 1, and they bring a building and the relics that suit it together.
- **Shared pool** (v1's name, kept): every building in the always-in set or a dealt pack, outside the commander's core, minus your bans (at most 3). It replaces v1's "every unlocked building outside the core". Since neither the core nor the always-in set can be banned, a ban can only remove a pack's building.
- **Relic pool:** the dealt packs' relics, plus every relic that belongs to no pack.
- **Augments:** generated from the buildings in your kit (§11.13).
- **Copies:** generated from the cards in your kit (§8.10).
- **Bans** stay as in v1: up to 3 buildings, chosen at run setup (§8.1). A banned building is never offered in drafts, spoils or events. v1's rule stays: commander core buildings can't be banned. The always-in set can't be banned either (first guess, Open below), so its swarm answer stays guaranteed.

"Commander core" (the 6 buildings a commander's drafts favour) and "the six core archetypes" (the roster every run has, §11.2) are different lists. A building can be in both.

- **Open:** whether the always-in set holds any relics. First guess: no. The Sporestorm Sigil isn't in it (§11.7).
- **Open:** whether the always-in set can be banned. First guess: no, so the swarm's answer is in every run. v1 had no such set, so this extends v1's ban rule.
- **Open:** what a ban does to a pack. First guess: a pack whose building is banned isn't dealt, and the next pack is dealt in its place.
- **Open:** a pack swap at run setup (one dealt pack traded for another), which [docs/archive/v1/ideas/after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md) Tier 4 #3 suggests beside the bans. First guess: no swap.

### 8.5 Lives across a run

- **Each battle is its own Heartcap race.** Your Heartcap starts every battle full, at 3000 max HP (traits may change this, §9.4), and its HP doesn't carry from battle to battle (§4.5, §6.5).
- **The run has 3 lives.** Colony traits MAY change the maximum (§9.4).
  - A lost battle costs **one life**, whether it's lost by Rout (your Heartcap reaches 0) or by Decision after round 9 (§6.5).
  - A won battle never costs a life, however close it was.
  - After a lost battle the run goes on to the next row. The loss pays no spoils and no Spores (§8.6), and the general's intel file still updates (§7.6).
- **Regaining lives:** the Grove can regain a life, up to the max (§8.7). Mending Moss keeps a heal within a battle, as a first guess (§11.7).
- **Retired with the run-long Heartcap** (Appendix A): the Rout win's repair of 10% of max HP, the Grove's 30% repair, the 25% of max HP that a Decision loss cost, and every other repair that carried between battles.
- **The run is lost** at 0 lives, or (first guess, Open below) when you lose the boss battle by any outcome.
- **Shown:** your lives sit under your Heartcap in battle (§10.2) and on the run bar (§10.5). The battle report names a life lost and the lives left.

**Why lives:** under v1, 92% of battles started at full HP, so repairs did almost nothing, and only 2 of 159 runs that lost battle 1 went on to win ([docs/archive/v1/ideas/after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md), Tier 1 item 2). Losing Heartcap in a battle you win punished success (§1.3 #2). A life is a cost you can see, paid only for a loss.

The number of lives, 3, is a first guess to tune like any number, not an open rule.

- **Open:** whether losing the boss battle ends the run. First guess: yes, as in v1.
- **Open:** an in-world name for lives. First guess: the working name *Regrowths* (§2).

### 8.6 Rewards

| Result | In-run reward | Spores | Other |
|---|---|---|---|
| Win by Rout | Spoils draft: choose 1 of 3 (+1 rarity bias, 1 free reroll) | 20 | |
| Win by Decision | Spoils draft of 2 cards | 10 | |
| Elite win (adds to the above) | A relic-only spoils pick (1 of 3) | +15 | 25% chance of +1 Amber |
| Boss win | None | 60 | +2 Amber |
| Loss, by Rout or by Decision | None | 0 for that battle | **−1 life** (§8.5). Earlier battles' Spores are kept |
| Boss loss | None | 0 for that battle | The run ends (§8.5) |

- A Win by Rout means the general's Heartcap reached 0. A Decision comes after round 9 and pays half (§6.5).
- **Spoils drafts** come after a won battle, on the spoils screen between battles. They use the same card types and rules as the drafts in battle (§8.3). An elite's extra pick deals relics only.
- **The colony's plots:** the colony may gain a plot after a won battle (§4.6). How many, and when, is Open there.
- **At run end:** total Spores are multiplied by `(1 + 0.10 × Decay)`.
- **Commander mastery XP** = the Spores earned before that multiplier + 25 per battle won.
- **Feats** are checked at the end of every battle and at the end of the run (§9.2).

**Open: a clean-win bonus.** A win in which your Heartcap took little or no damage could pay a bonus, such as extra Spores or a better pick, so that a close call costs a bonus rather than health. First guess: no bonus; it isn't adopted.

### 8.7 Non-battle nodes

- **Grove:** choose one:
  - **regain a life**, up to the max (§8.5). At full lives it does nothing, and the Grove shows it unlit; or
  - **graft:** choose 1 of 3 augments for buildings in your kit (§11.13). Until augments arrive in R3, the graft is v1's: +1 level onto an upgrade track you own.
- **Event:** a data-driven text scene with 2–3 choices that carry tradeoffs. Outcomes use the `events` stream. There are 8 events (`data/events.json`). Four had effects tied to systems v2 retires or replaces (the run-long Heartcap, upgrade levels and the Sporestorm's clock), and each has a v2 effect below, as a first guess.

| Event | Choice → effect | In v2 |
|---|---|---|
| Fallen Oak | Take a random rare relic; your Heartcap's max HP −15% for the rest of the run, so every later battle's Heartcap starts lower. *Or* leave. | Kept. The cost now bites, because every battle's Heartcap starts at the max |
| Spore Merchant | Give up a non-starter card from your kit (all its copies) → choose 2 augments for buildings in your kit. *Or* leave. | Changed: augments replace v1's 2 upgrade levels |
| Quiet Clearing | Rest: your Heartcap has +15% max HP in the next battle. *Or* forage: a random augment for a building in your kit. | Changed: v1's 15% repair and random upgrade level have no target |
| Mold Bloom | Next battle: the Sporestorm starts one round earlier, at round 4 (both sides), and you get +150 starting gold. *Or* decline. | Changed: v1 started the storm 1:00 earlier, at 3:00 (data: `startSeconds` 240, shift −60 s) |
| Burn the Notes | Halve the Gray Rot's intel on you; next battle starting gold −75. *Or* leave. | Kept |
| Hungry Roots | Sacrifice a relic → gain 2 random relics one rarity lower. *Or* leave. | Kept |
| Amber Seep | Gain 1 Amber (meta); next battle starting gold −100. *Or* leave. | Kept |
| Twin Spores | +1 copy of a card in your kit (choose). *Or* take 1 random common relic. | Changed: copies replace v1's copied upgrade level |

- Every changed effect is a first guess, and none is decided. Until R3 brings copies and augments (§16), Spore Merchant, Quiet Clearing's forage and Twin Spores keep v1's upgrade effects.
- An event's random choices draw only from the run's draft pool (§8.4), so bans and the dealt packs hold.

### 8.8 End of run

- **Victory:** you beat the boss. **Defeat:** your lives reached 0, or you lost to the boss (§8.5).
- **Summary screen:**
  - each battle's outcome, how it was decided (the round a Heartcap fell, or the Decision), map and general, and the lives lost
  - cards drafted: blueprints, copies, augments and relics
  - the kit at run end, with each card's copies and augments, and the run's packs
  - damage by building across the whole run
  - a per-battle round sparkline: the Heartcap damage dealt and taken in each round (it replaces v1's front-line sparkline)
  - Spores, Amber and XP earned; feats completed; Decay
- **Run it back and records** ([docs/archive/v1/ideas/after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md) Tier 1 item 7) is independent work (§16): a quick restart with the last commander and bans, truthful summary lines and per-commander records. Nothing in this section depends on it.

### 8.9 Save and resume

This section owns when a battle saves and where it resumes. §13.8 points here.

- **Autosave** run state at every node boundary. A battle's node boundary comes when the battle ends, before its report: the run records the result and any life lost (§8.5) in that save, so a finished battle is never replayed.
- **Battle saves** come between rounds:
  - at the start of every planning phase, once the general has planned (§4.7) and any draft's offer is set;
  - at Begin.
- **A save requested at another moment** (on `visibilitychange`, for example):
  - during planning, it saves the planning phase so far, with every plant and sale made;
  - during a clash or an aftermath, it writes nothing new, and the Begin save stays the latest.
- **A battle save stores:** the battle config; the executed human command log, with each planning command stamped with its round and its order and each power command with its round and clash tick; any pending human commands; the round and the phase; the last step's events; and the state hash.
- **Resume** returns to the latest save:
  1. Re-simulate headlessly from the battle's start, applying only executed input: each planning phase from its commands, and each earlier clash tick by tick. Restore pending commands without executing them.
  2. Verify the state hash. An incompatible save visibly restarts the current battle from round 1's planning while preserving the run's progress.
  3. Continue play:
     - **from a planning save:** in that planning phase, with its plantings, gold and any open draft;
     - **from a Begin save:** at the clash's first tick, rebuilt deterministically from the Begin save. The clash then runs live again, so a power fired in the interrupted clash can be fired again. A save requested in that clash's aftermath resumes here too.

  A clash is at most 45 s (900 ticks, §6.7), so a battle is at most 9 × 900 = 8,100 ticks, and replaying takes about a second or less.
- **Saves from before R2:** a run or battle saved under v1's rules can't continue under rounds. A v1 battle restarts from round 1's planning with v1's notice for an incompatible save, and the run's progress is kept.
  - **Open:** what a run saved before R2 becomes, since it has a run-long Heartcap and no lives or copies. First guess: it migrates, keeping its kit, relics and progress, with 3 lives. The alternative is to end it with a notice. Either way it MUST NOT be lost silently, and its key stays (§13.8). Today `loadRun` (`src/run/resume.ts`) returns null on a version mismatch, which would drop it silently, so R2 MUST replace that (§16).
- **Legacy event prompts:** if an old save offers a sacrifice that can no longer pay its full reward, return to the event choices before charging that cost. If an older version already charged the cost for an upgrade reward, offer the levels its remaining tracks can hold (or continue if none fit), with a visible shortfall notice and preserved run progress. This applies until R3 replaces upgrade levels with augments.

### 8.10 The kit: cards and copies

- **Your kit** lists the building cards you own this run, each with a number of **copies**. For example: Sporeling Burrow ×2, Capguard Hall ×2, Truffle Cellar ×1.
  - Each copy is one building you can have planted at once in a battle. Planting takes a free copy, and a card with no free copy can't be planted ("all planted", §10.2).
  - Copies count across the whole colony: on Twin Roots, both lanes share them.
  - It's a **kit**, not a deck: nothing is drawn. The code already calls it `kit`.
- **Two limits:** plots (§4.6) and copies are the build limits. They replace v1's supply cap of 60.
- **Gold is still the price** of planting (§6.1).
- **Selling** returns the copy to your kit:
  - the refund is 100% for a building planted in this planning phase;
  - it's 60% once the building has fielded, that is, once a clash has run with it planted (§4.4).
- **Fixed copies, not a random hand.** All your copies are there in every planning phase. A random hand would move the guessing to your own side: you'd see the general's swarm and not draw your answer (§1.3 #5).
- **What carries:** the kit, with its copies and augments, carries from battle to battle. Whether planted buildings carry is Open in §4.6 (first guess: no, each battle is a new map).
- **How the kit grows and shrinks:**

  | Source | Effect on the kit |
  |---|---|
  | Run start | The commander's 3 starters, 2 copies each (§8.1) |
  | Blueprint card | A new card with 1 copy (§8.3) |
  | Copy card | +1 copy of a card you own (§8.3) |
  | Augment card | Changes how one building's units play (§11.13) |
  | Spoils | The same cards, after a won battle (§8.6) |
  | Events | Twin Spores adds a copy; Spore Merchant removes a card with all its copies (§8.7) |

- **Augments and the kit:** an augment belongs to a building in your kit, shows on its card and its squad, and is shown on the general's kit too (§10.4, §11.13). **Open:** whether an augment attaches to the building type, so all its copies field it, or to one copy. First guess: the type, for the run.
- **The general** follows the same rule with a kit of its own: cards, copies by your copy rule, and augments, growing by battle index (§7.8). Its kit shows on its route node (§8.2) and in the General's Intent panel (§10.2).
- **Why copies:** "mass the cheapest spawner" (G3, §12.3) becomes impossible by construction, because each card has only so many copies.
- **Data:** the run state's `kit` (today a list of building ids, `src/run/runState.ts`) gains a copy count per card (§14.4).
- **By milestone** (§16): R2 has kit cards with no copy limit, so until R3 plots are the build limit. Copies and their counts arrive in R3.

---

## 9. Meta-progression

Four systems, each with a single input, so they never become currency soup:

| System | Answers the question | Fed by | Introduced |
|---|---|---|---|
| **Feats** | *What* is unlocked (buildings beyond the six core archetypes, strains, commanders, relics, blights) | Doing specific things in play | M6 |
| **Colony traits + Root Capacity** | Your passive loadout this run (power plus sidegrades) | **Spores** (common) | M6 |
| **Strains + strain ranks** | *How* each building plays, chosen before a run, plus a small power boost | Unlocked by feats or mastery; ranked with **Amber** (rare) | M6 |
| **Commander mastery** | Your progress with each commander | Mastery XP from runs | M6 |
| **Blights → Decay** | Opt-in difficulty; multiplies Spores | Unlocked by beating the boss | M7 |

Until Milestone 6 there is no gating: every implemented building and relic can reach a run, and every implemented commander is selectable. Buildings outside the six core archetypes and the commander's core reach a run through its run packs (§8.4, §11.15). M6 gates them behind unlocks (§9.2).

v2 changes the systems' content, not the systems (§1.3): the unlock ladder now gates the roster beyond the six core archetypes, feats tied to retired systems are rewritten in M6, and strains sit beside augments (§9.3). M6 is rewritten for v2 (§16).

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

**The unlock ladder (M6).** A new profile starts with the six core archetypes and the Truffle Cellar (§11.2). Feats unlock the rest of the roster a few buildings at a time, so a new player meets each role once they know the ones before it: the roster is taught by gating, not by text.
- A locked building's card shows the feat that unlocks it, so the quest is printed where the player sees it.
- A run pack is dealt only once its building is unlocked (§8.4).
- Feats SHOULD reward variety as well as skill, for example "win a battle with no Sporeling Burrow".

- **Open:** whether a commander's core buildings outside the six are gated too. First guess: no, since the core is the commander's identity.
- **Open:** what a run deals when fewer than 4 packs are unlocked. First guess: every unlocked pack.

**The first release ships at least 15 feats**, for example the table below. Several were written for v1's battle, and the last column marks those M6 rewrites. None was tied to Heartcap turrets.

| Feat | Condition | Unlocks | In v2 |
|---|---|---|---|
| First Sprout | Win a battle | Scythecap Grove | Kept |
| Root and Branch | Win a battle on a 2-lane map | Hammercap Forge | **M6 rewrite:** the Hammercap Forge is a core archetype in v2 (§11.2), so the feat needs a new unlock |
| Adapt | Win a battle in which both counter cycles fired | Veilstalker Hollow | **M6 rewrite:** restate it in rounds (§7.4) |
| Survivor | Win a battle with your Heartcap below 25% | Tender's Ring | Kept: it reads that battle's Heartcap (§4.5) |
| Long March | Own 20+ columns in one lane at once | Commander **Armilla the Vast** | **M6 rewrite:** columns are retired (§4.3) |
| Elder Council | Have 3 Elders alive at once | Commander **Cordis the Puppeteer** | Kept |
| Lean Roots | Win a battle without building an economy building | Truffle Cellar strain *Wild Truffle* | Kept |
| Rich Soil | Have 4 economy buildings on loam at once | Truffle Cellar strain *Deep Truffle* | **M6 check:** it needs a colony with 4 loam plots (§4.6, §11.9) |
| Unbroken Mat | Win a battle without ever losing a column | Capguard Hall strain *Ironcap* | **M6 rewrite:** columns are retired (§4.3) |
| Swarm Mind | Spawn 60 Sporelings in one battle | Sporeling Burrow strain *Teeming* | **M6 rewrite:** spawn timers are retired, and squads field fresh each round (§4.4) |
| Siegebreaker | Rootbreakers deal ≥ 50% of the damage in a Rout of an enemy Heartcap | Rootbreaker Den strain *Battering* | **M6 rewrite:** Heartcap damage now comes from survivors in the aftermath, where siege units count double (§6.7) |
| Hoarder | Bank 300 gold at once | Relic *Deep Cellars* | Kept |
| Pivot | Win a battle after selling 3+ buildings in it | Relic *Second Flush* | **M6 check:** count only buildings that have fielded, since selling in the phase you planted is free (§8.10) |
| Boss Down | Defeat the Pale Sovereign | Blights (Decay) + 2 Amber | Kept |
| Into the Rot | Win a run at Decay ≥ 3 | Relic *Rot-Eater* | Kept |

### 9.3 Strains (Hades-aspect style)

- Every building has a **base strain**, plus up to 2 **alternate strains** unlocked by feats or mastery.
- Before each run you choose one strain per building. The choice applies for the whole run.
- **A strain is a data patch** over the building and unit definitions, restricted to whitelisted fields (§14.2). Patches can change squad size, merge behavior and similar fields, which makes them real sidegrades. Whether a patch may change damage type or armor is Open (below).
- **Strain ranks 1–3** cost 1/2/3 Amber. Each rank gives the building's units **+4% HP and +4% damage** unless the strain defines its own rank effect.
- **The first release:** at least 2 alternate strains for each of 6 buildings (§11.5).

**Strains and augments.** Both change how a building's units play, at different times:

| | Strain | Augment |
|---|---|---|
| Chosen | Before a run, in the Underroot | During a run, from drafts, spoils, the Grove and events (§8.3, §8.7) |
| Lasts | The whole run | The rest of the run |
| Fed by | Feats and mastery (unlocks), Amber (ranks) | The run's draft pool (§8.4) |
| May change body or weapon | No, as a first guess (Open below) | Never (§5.8) |

- **Order:** the strain patches the building's definition first, and augments apply on top of it. This is v1's order of base data, then the strain patch, then modifiers (§14.1).
- **Open:** whether a strain may change a unit's body (armor class) or weapon (damage type). First guess: no, as for augments, so the shape never lies (§5.8, §14.1). v1's strains that change one (*Ironcap*'s heavy Capguards, *Gillguard*'s and *Thornpuff*'s damage types, §11.5) then need new patches in M6. If the answer is yes, such a strain MUST change the unit's drawn body to match, so the shape still tells the matchup. Units carry no weapon mark (§5.8), so a strain that changes only a damage type (*Gillguard*, *Thornpuff*) would need its body redrawn to show the new weapon. §5.8, §11.5 and §14.1 point here.
- **Open:** how strains and augments divide the work. Some v1 strains read like augments (*Bursting*'s Sporelings that explode on death), and [docs/archive/v1/ideas/after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md) Tier 4 #4 suggests drafting strains as "mutation" cards. First guess: strains stay the loadout chosen before a run, augments are the build found during it, and R3 and M6 remove overlaps.

### 9.4 Colony traits and Root Capacity (Hades II Arcana style)

- **Traits** are passive modifiers. You unlock each one once with Spores, then equip a set per run whose total cost fits your **Root Capacity**. Each trait costs 0–3 capacity.
- **Root Capacity** starts at 3 and rises one step at a time to 12. The steps cost 60, 90, 120, … Spores (+30 per step; 1,620 Spores in total).
- **0-cost traits carry a drawback.** They're true sidegrades.
- **Power ceiling:** the balance harness measures a full 12-capacity loadout. It must raise the balanced bot's win rate by no more than 15 points (§12.3).
- **The first release:** at least 12 traits (§11.7). Traits whose effects were tied to retired systems, such as capture speed or building HP, get new effects there.

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
- The first release ships 6 blights (§11.8). The full ladder comes after the first release (§17 #15).
- **Blights are the difficulty ladder.** There's no Easy / Normal / Hard (§17 #14). The general's income is a data value (×1.0, §7.1), so a blight MAY raise it: for example, *Hoarding Rot*'s general's income ×1.15 at rank 1 and ×1.30 at rank 2 (§11.8, which says whether it is one of the six). Blights tied to retired systems, such as the counter warning and building HP, get new effects in §11.8.

### 9.7 Profile save

- **Storage:** localStorage key `spore-sprawl/profile/v1`, through `storageKey()` like every key (§13.8). The key never changes, and the record carries its version in `v`. Run it back's first part, records-1, writes it first, as version 1 (§16 M6, RB-Q1). M6 adds its fields as a later version, with a migration.
- **Contents:** meta only. Settings, tips and the run in progress keep their own keys (§13.8).
  - **Version 1:** `{ v, lastSetup?, runs?, tallies?, codex? }`.
    - `lastSetup` is the commander and bans of the last run begun, with room for M6's traits and strains and M7's blights. records-1 writes it.
    - `runs` holds the last 20 runs, newest first, with how far each got, what beat it and its play time. `tallies` keeps each commander's runs, wins and bests, and `codex` the cards seen. records-2 adds them, from R2b's run on, so the version stays 1. No v1 run is ever recorded.
  - **M6 adds:** `spores, amber, unlocks[], feats{}, traitsOwned[], rootCapacity, strainRanks{}, strainChoice{}, commanderXp{}, bestDecay{}`.
- **Who writes it:** normal play. Seeded and test pages, and prototype runs (`?proto=`), never write it (RB-Q2).
- **Versioning:** each schema version comes with a migration function. A record whose `v` is newer than the build's loads read-only and is never overwritten.
- **Export/import:** a base64 JSON string on the Settings screen. There's no backend, so this is the backup.
- **Corruption handling:** a corrupt or unparseable save is copied to `spore-sprawl/profile/v1.bak`, and defaults load. From M6, the player is then asked whether to reset.

### 9.8 Pacing targets

- The first unlock (*First Sprout*) arrives within the first 1–2 runs.
- About 50% of the first release's content is unlocked by ~15 runs, and 100% by ~35–45 runs (about 15–25 hours).
- Measured with the meta-progress simulation (§15.3).

---

## 10. Controls, UI layout and feedback

### 10.1 Platform and rendering surface

- **Supported:** desktop browsers (current Chromium, Firefox and Safari) with mouse and keyboard, at a minimum window size of 1280×720.
- **Battlefield canvas:**
  - It renders at native pixel resolution: `(W + 4) × 16` by `H × 16`. Bogwater Hollow is 576 × 128.
  - It's scaled by the **largest integer factor** that fits its area. If integer scaling would waste more than 30% of that area, it falls back to a fractional scale with `image-rendering: pixelated`.
  - **At 1280×720:** the one-lane maps draw at 2×. Twin Roots, at 576 × 208, gets about 370 px of height and draws at about 1.78×, a fractional scale (A077). The shape language is checked at both, with Twin Roots as the worst case (§10.4, §16 R4).
- **HUD, menus and overlays** are **DOM** elements around and over the canvas. That keeps text crisp, makes the UI accessible, and lets Playwright query it.

### 10.2 Battle screen layout

A battle is a series of rounds (§4.7), and the battle screen keeps one layout through all of them. It has three **views**, one for each phase of a round: **planning**, **clash** and **aftermath**. The bands, the field and the panels stay where they are. What changes is what they show and which controls are lit. The diagram shows planning in round 4.

```
┌─────────────────┬─────────────────────────────────────────┬───────────────────┬────────────────────┐
│ ♥ YOUR HEARTCAP │ (◆ 245 +160)  (▦ 5/8 plots)  (✦ 3 R)    │ GRAY ROT HEART ♥  │ GENERAL'S INTENT   │
│   2725/3000     │ (⧗ Round 4 of 9)  (☁ ×1.0)              │       1650/2000   │ ☻ Lichen Baron     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░  │ ▓  ▓  ░  ◌  ·  ·  ·  ·  ·  round tally  │ ░░░▒▒▒▒▒▒▒▒▒▒▒▒   │ Countering SWARM   │
│ lives ● ● ●     │ dealt 350                    taken 275  │                   │ income 155         │
│                 │                                         │                   │ New: Capguard Hall │
├─────────────────┴─────────────────────────────────────────┴───────────────────┴────────────────────┤
│   [ callout lane: "The Lichen Baron now counters your SWARM" · pinned: planning hint, "Paused" ]   │
│                                                                                                    │
│  YOUR COLONY      YOUR FORMATION     ◄── 6 tiles ──►     ITS FORMATION        ITS COLONY           │
│  plots, combo     squads with pips                       squads with pips,    plots, "New"         │
│  links            and augments                           augments and marks   sprouts              │
│                    BATTLEFIELD  (canvas, pixel-scaled, in its frame)                               │
├────────────────┬──────────────────────────────────────────────────────────────┬────────────────────┤
│ (Q) POWER      │ ╭──────╮╭──────╮╭──────╮╭──────╮                             │ INSPECT            │
│ in a clash     │ │1  150││2  110││3  150││4  150│  …                          │ Capguard Hall      │
│ [Begin Space]  │ │ art  ││ art  ││ art  ││ art  │                             │ fields 4 Capguards │
│ (1× 2× 3× ❚❚)  │ │Cellar││Burrow││Capgd ││ Gill │                             │ front rank, file 2 │
│ spk cog Help H │ │ ●○   ││ ●●   ││ ○○   ││ ●    │                             │ merge ON [M]       │
│                │ ╰──────╯╰──────╯╰──────╯╰──────╯                             │ sell 90 [X]        │
└────────────────┴──────────────────────────────────────────────────────────────┴────────────────────┘
```

- **Top band** (docs/archive/v1/ui-ux-plan.md, Phase 1b): the win condition frames it.
  - **Your Heartcap** at the left end and **the Gray Rot's** at the right: the Heartcap's cap, its HP in the display face and a striped HP bar that drains toward the field's centre. Both are this battle's Heartcaps, full when the battle starts (§4.5). Below a third of its HP, the number turns danger red.
  - **Lives:** in a run, your lives sit under your Heartcap, one cap icon per life, lit for each one left (§8.5).
  - Between the Heartcaps, **stat chips** (a pixel icon, a tabular display-face number and a small word):
    - gold, with what it will earn at the start of the next round if you Begin now: income plus the interest on what you're holding (§6.2);
    - plots planted, of plots owned (§4.6);
    - the round, of 9, and in a clash its clock against the 45 s cap (§6.7). The clock glows in the cap's last 5 s;
    - the Sporestorm's multiplier on round damage (the round escalation, §6.4), unlit at ×1.0 and lit lilac from round 5.

    The gold chip pulses when income lands at the start of planning. If the row would run into the Heartcap labels (a narrow window, big late-run numbers), it first closes up, then hides its small words (screen readers still read them).
  - **Chip tooltips** (playtest round 3): each chip, the round tally and the lane tug has a real tooltip in the card-tooltip style, on hover or keyboard focus, closed by leaving or Esc; `I` puts focus on the gold chip and Tab moves along the band. They are computed from render-side state and content; nothing joins the sim state.
    - *Gold:* next round's income by source (Heartcap stipend, each economy building with any loam bonus, the Spore Exchange's trickle), totalling the chip's figure, and the comeback gold a lost round would add; interest in plain words ("1 gold for every 20 you're holding when you Begin, up to 10"), what your gold now would pay, with an example of a partial amount ("bank 140 for +7"), and how much to hold for the full cap (200 for +10 at the base cap, more when the cap is raised); what the Spore Exchange adds (with its hotkey) or that yours raises the cap.
    - *Plots:* your plots by rank and file, which are free, which are loam or stumps, and how the colony gains plots over a run (§4.6).
    - *Round:* a round's three phases; how a lane's clash ends and what happens at the 45 s cap; what the loser's Heartcap takes (§6.7); the drafts in the planning phases of rounds 3, 5 and 7, after rounds 2, 4 and 6 (§8.3); and the Decision after round 9, with the Heartcap damage each side has dealt so far (§6.5).
    - *Storm:* what the round escalation is, its multiplier now and in each round to come, the cap on a round's damage, and whether an event moved it.
  - **Relics and augments:** the last chip counts your relics and augments. A click or `R` opens a popover under it with the run bar's relic badges (each with its tooltip on hover or focus) and every building you've augmented, with each augment's icon and words (§11.13); Tab moves inside it, and Esc, `R` or a press outside closes it. Drafted cards join it live. Until augments arrive in R3, it lists upgrade levels as v1 did (§11.6).
  - Under the chips, the **round tally**: one pip per round, up to round 9.
    - A pip is violet for a round you won, ash for one the general won, a dash for a round nobody won (§6.7) and hollow for a round to come. The current round's pip is outlined.
    - On Twin Roots, where each lane is its own clash, each pip has one half per lane. A half is violet or ash for the lane's winner, and a dash for a drawn lane (§6.7).
    - Under the tally's ends sit the Heartcap damage you've dealt in this battle and the damage you've taken. A Decision goes to the bigger number (§6.5).
    - A past pip's tooltip gives that round: each lane's result and survivors, the damage both ways, and your squads that dealt the most ("what killed what").
  - **In a clash, the lane tug** takes the tally's place: one bar per lane, your surviving supply striped violet from the left and the general's striped ash from the right, with both numbers under its ends. It's the clash's "who's winning" readout, because surviving supply is what the aftermath counts (§6.7). A lane whose clash has ended locks and names its result: won, lost or drawn. A drawn lane's tug goes neutral, with neither side's stripes lit.
  - The **General's Intent** panel at the top right shows what §7.5 lists:
    - the general's portrait at 3× (48 px), its name, and its doctrine: what it remembers about you, or the counter it's running (§7.4, §7.6);
    - its income this round and the gold it banked, which are public because it plays by your rules (§7.1);
    - what it changed this round: the buildings it planted and sold. A counter shows here as its kind with the buildings it planted for it ("Countering SWARM", "New: Capguard Hall").

    There's no countdown. The general's army is on the field before you plan, so the vague telegraph is retired (Appendix A). The panel's tooltip gives the general's passive and its kit, with each card's copies (§7.8).
- **Callout lane:** transient banners centered above the battlefield. At most 3 show at once, each for 2.5 s (tips 6 s), in priority order: a counter moment (a counter the general brings into this round, or round 1's "The Gray Rot remembers your SWARM", §7.6) > a lane won, lost or drawn > a refused key (the power outside a clash or already spent in this one, a card with no copy left, selling or the merge toggle during a clash) > tips > an Elder, on either side > other news. A Bloomed merge gets no callout: squads knit every round, so its pop on the field is enough.
  - **Battle-1 economy tip** (playtest 2026-10-28): in battle 1 only, if round 2's planning opens with no economy building planted, a tip names the first economy card and its hotkey, and the economy cards pulse for 12 s or until one is placed. It fires at most once. **Open:** whether this tip still helps now that the general plans first and its army can punish a greedy opener. First guess: keep it as it is. R2's playtest decides.
  - **First-time tips** (playtest round 3): in a run's first two battles (and single battles numbered 1 or 2), one-time tips go through the lane, one at a time, each up for 8 s:
    - reading the general's army, as round 1's planning opens;
    - the formation: ranks and files, at your first planting;
    - the clash and the commander power, at the first Begin;
    - the aftermath: surviving supply becomes Heartcap damage, at the first one;
    - the first draft, as it opens (the lane shows above the draft's scrim);
    - the round escalation, as round 5's planning opens;
    - interest, the first time it pays.

    Each is shown once, ever, and remembered under `spore-sprawl/tips/v1` (through `storageKey()`); the settings screen turns tips off or shows them all again. The ids of v1's retired tips (the frontier, Hold) stay in old records and are ignored. The economy tip waits in the same queue but isn't remembered. A tip is cream on its panel with a lilac "Tip" word and names its key with a keycap; tips never use gold, which means money. R4b rewrites their words (§16).
  - **Pinned callouts** come before the timed ones and stay until they no longer apply: the planning hint, the empty-lane warning at Begin (see the planning view), "Paused" while a clash is paused, the commander power's aim while aiming, and a notice when a saved battle couldn't be restored. Nothing else sits on the field.
- **Field frame** (docs/archive/v1/ui-ux-plan.md, Phase 1a): the void between the bands, above, below and beside the battlefield, is drawn as the earth the field sits in.
  - What it shows: a roots ceiling, a soil bed with each side's buried threads (lilac under your half, ash under theirs), roots down each side, and each Heartcap's crown rising into the ceiling.
  - How it's drawn: text sprites from `data/sprites/frame.json`, baked onto a canvas behind the field and the bands at the field's own pixel scale, with its pixels lined up with the field's. It stays darker than the field and takes no input.
  - **Ambient spores** drift across it, thicker with each round of the Sporestorm from round 5. They drift at 1× in planning, move at the game's speed in a clash, stop while a clash is paused and once the battle is over, and hold still under `prefers-reduced-motion` and `?test=1`.
- **Bottom band:**
  - **Controls** (left): the commander power, lit only in a clash, from its first tick (§6.6); **Begin** in planning, then, in a clash, one segmented control for 1×, 2×, 3× and pause; then the speaker (§13.9), the **settings** cog, which opens the settings screen (§10.5), and Help.
  - **The kit tray** (centre): your kit's cards (§8.10), grouped by role: economy first, then army, defense and utility, each group in kit order. The `1`–`9` hotkeys follow this order.
    - **Each card shows** a cap-shaped band across its top in its role's colour, its hotkey, its price as a gold chip, its **copies** (one pip per copy, lit while the copy is free and dim once it's planted), the building at 2× (64 px), its name and its role word (§11.2). An army card also shows its squad: the unit's sprite (its body and silhouette, §5.8), the squad's size ("×8") and matchup marks for the shapes it's strong and weak against (§10.4). An economy card shows what it earns a round. Every other detail goes in the tooltip, so a card carries no sentences. The art and the words are milestone R4b's card-text pass (§16); this list is the rule they follow.
    - A card you can't afford is **unlit**: the sprite desaturates, the price turns danger red, and the line under the name becomes a bar filling toward the price and "need N". A card with no copy left is unlit the same way and says "all planted". The name stays readable; nothing fades.
    - In a clash the tray takes no clicks, since planting is a planning action (§4.4), but it stays readable and its tooltips still open.
    - Cards keep a card's width (88–108 px) however few there are. When they don't fit one row (14 cards at 1280 px), the tray turns **compact**: two rows of smaller cards with the sprite at 1× beside the hotkey and price, then the name, the role and the marks. The tray never clips a card or scrolls sideways.
    - Hovering a card, or focusing it from the keyboard, shows a tooltip with the description, the squad and its unit's stats, its matchups in words (strong vs, weak vs, armor), its augments and the combos it can make (§11.13, §11.14), merge perks and, for economy, how many rounds it takes to pay for itself. Stats come from the compiled side, so augments and relics show.
  - **The inspect panel** (right). Empty, it shows a short tip; the hotkeys live in Help.
- **Planning view.** Round 1's planning takes the place of v1's deploy phase, and every round opens with one.
  - **When:** at the start of every round, once the general has planned, in §4.7's order. Income has landed (from round 2) and the general has taken its turn, so its whole army is on the field before you plan, its opener included (§7.5). In rounds 3, 5 and 7 the draft opens next, over that army (see the draft overlay), and you plan once it's resolved. Planning is untimed, and the clock is stopped (§4.2).
  - **Begin** is the bottom band's one primary button (its keycap shows `Space`; `Enter` works too). It ends planning and starts the clash running: a pause never carries into a clash. The planning hint is pinned in the callout lane: the round, your gold and "plan, then press Begin" (round 1: "place your opener"). In round 9 the hint says it's the last round and who leads on damage for the Decision.
    - **While a draft is open,** Begin is unlit, and its tooltip says the draft must be picked or skipped first (§8.3).
    - **An empty lane warns.** If you'd field nothing in a lane (no squad and no emplacement) where the general fields something, your whole formation on a one-lane map, the first press of Begin doesn't start the clash. It pins a warning in the callout lane ("The general takes this lane unopposed"; on Twin Roots it names the lane), and Begin reads "Begin anyway". A second press begins; planting or `Esc` clears the warning. The lane would go to the general with its whole surviving supply (§6.7).
  - **Both colonies** show their plots as a faint grid of 2×2 squares, yours on the left and the general's on the right (§4.6). A loam plot keeps the loam look and a stump plot shows its stump, so a formation's holes show before the clash. The general's buildings planted this round carry a "New" sprout: that's how its counters land on the field (§7.4).
  - **The formation preview:** both armies stand in the arena where they will appear on the clash's first tick, front ranks 6 tiles apart (§4.6).
    - Each squad is drawn as its units in the shape language (§5.8), dimmed so it reads as a plan, inside a faint outline of its slot (the plot's place in the formation box, §4.6). The preview MUST come from the same formation rule the clash uses, so the squads appear where you saw them.
    - It updates as you plant, sell or toggle merging, so the formation you're building is always in front of you.
    - Hovering a plot lights its squad's slot, and hovering a slot lights its plot. That's "your colony is your army", drawn.
  - **Each squad's slot carries:**
    - its **merge preview** (§5.6): pips for the Bloomed and Elder units it knits into at the muster, then the count of base units left over. Its tooltip and the inspect panel say it in words ("fields as 2 Bloomed + 2"). The preview is the muster's own knitting rule run on the formation (§5.6), so it shows what fields: neighboring squads of the same unit that combine, such as two Burrows side by side making an Elder, show it.
    - its **augment icons** (§11.13), the general's included;
    - **matchup marks** (§10.4) while a card is chosen or a squad is hovered: choosing a card or hovering one of your squads marks every enemy squad with the class of your hits on it, and hovering an enemy squad marks your squads and cards with the class of its hits on them.
  - **Selling:** `X` twice. The first press shows the refund: the full price for a building planted in this planning phase, 60% for one that has fielded (§4.4). The copy goes back to your kit and the preview drops its squad.
  - **Twin Roots:** each lane has its own colony and its own formation preview (§4.6).
- **Clash view.**
  - **Begin** turns both previews into units on the same tick (§4.7), each ghost appearing with a spore puff. The speed control takes Begin's place, the power button lights, and the tray stops taking clicks.
  - **The muster:** the clash opens with a 1 s muster (§5.6). Nobody moves or attacks, and squads set to merge knit in place, so the field shows the knits the merge preview promised before the armies close. The power can already fire.
  - Both colonies stay on the field, idle: buildings can't be hit and take no part in a clash (§4.6).
  - The lane tug replaces the round tally, and the round chip shows the clash clock.
  - On Twin Roots, a lane whose clash ends first gets a callout ("Lane won · 9 supply left", "Lane lost", "Lane drawn"), its tug locks, and the other lane fights on. At the 45 s cap, a lane still fighting is decided on surviving supply (§6.7), and its tug shows the winner and the margin.
  - Pause (`Space` or the pause button) stops the clash, and the power can be aimed while paused. The settings screen and Help pause a clash while they're open.
- **Aftermath view.** It's render only: the sim has already scored the round (§6.7).
  - When every lane's clash has ended, the field holds still, and in each lane the winner's survivors surge toward the loser's Heartcap and burst into spores on it. At the 45 s cap both sides have survivors: the loser's wilt where they stand. A drawn lane has no surge, and any survivors in it wilt (§6.7).
  - The loser's bar in the top band drains by the round's damage and pulses, and the number rises over its Heartcap on the field, with the Sporestorm's multiplier and "capped" beside it when they apply. At the cap it shows the difference that counts.
  - A result banner then names the round (won, lost, drawn, or split by lane on Twin Roots), the damage both ways, and your squad that dealt the most damage. The tally takes the round's pip, and the next planning phase opens.
  - It lasts about 3 s at 1×, and less at 2× and 3×. `Space`, `Enter` or a click skips it. Under reduced motion there's no surge: the bars change within a fade of 120 ms or less, and the banner shows. `?test=1` makes it instant.
  - **The end of a battle:** when a Heartcap reaches 0, or round 9's aftermath ends (§6.5), the field holds for about a second on the fallen Heartcap (it bursts into lilac spores, or wilts to ash). Then the report arrives behind the spore wipe (§10.5).
  - The in-field Heartcaps MAY show their damage in stages, render only: cracks below ⅔ of their HP, and a wilting cap below ⅓.
- **Placing:** while a card is chosen in planning, every free plot where it could go gets a soft lilac grid (gold isn't considered; a hover you can't afford still says so).
  - The ghost snaps to a plot, and the formation preview shows its squad in that slot.
  - Each planted neighbor it would link with lights up, with the combo's icon (§10.4, §11.14).
  - The ghost's tip sits beside its footprint inside the field, flipping to the left near the right edge, so it never covers the ghost, a band or the callout lane. It gives the price, the plot's rank and file, the loam bonus for an economy card and the combos it would make, or the reason it can't go there.
- **Draft overlay:** a draft opens in the planning phases that hold one (§8.3), after the general has planned. The battlefield dims, except the general's formation preview, which stays lit so the cards can be weighed against its army. Three large cards show type (blueprint, copy, augment or relic), rarity, effect text and an "owned" context line: the copies you own, or the building an augment changes. Reroll shows its cost; Skip shows "+40 gold".
- **Gone with their systems** (Appendix A): spawn timers, the supply chip, the territory tug and capture progress, the Hold / Advance switches and rally lines, the forward price on the ghost and on cards, the besieged and "waiting for supply" glyphs, and the warning countdown.
- **By milestone** (§16):
  - **R2** builds the three views, the formation and merge previews, the round tally and the lane tug, lives, and basic matchup marks (the class against each enemy squad), on today's sprites.
  - **R3** adds copies, augments and combos to the cards, the formation preview and the ghost, with placeholder icons.
  - **R4** comes in two parts (X3, agreed 2026-11-01):
    - **R4a**, before R2's first playtest, draws the shape language on the field: silhouettes, body sizes, and pips and the Elder's rim without the bigger sprite. Units carry no weapon mark (§5.8).
    - **R4b**, after R3, draws matchup marks in full and augment icons, does the card-text pass, and rewrites Help and the tooltips.

### 10.3 Controls

| Input | Action |
|---|---|
| `1`–`9` or click a tray card | In planning: choose a building to plant |
| Mouse move (placing) | Free plots where it can go show a lilac grid. The ghost snaps to a plot and shows legality (with a reason when illegal), the price, the loam bonus, its rank and file and the neighbors it would link with. The formation preview shows its squad in place |
| Left click (placing) | Plant it. Hold `Shift` to keep planting the same building while copies and gold last |
| Mouse over a plot or a squad (planning) | Lights the plot's squad, or the squad's plot, and shows matchup marks against the other army (§10.4) |
| Right click / `Esc` | Cancel placement or aiming, or deselect |
| Left click a building, unit or squad | Inspect it, yours or the general's |
| `M` | In planning: toggle merging on the selected building. Its merge preview updates |
| `X` / `Delete` | In planning: sell the selected building (the first press shows the refund; the second confirms). Its copy returns to your kit |
| `Q`, then click | In a clash: aim the commander power, then fire it, at most once per clash (§6.6). Aiming works while the clash is paused; `Esc` cancels |
| `Space` | In planning: Begin, as `Enter` does (unlit while a draft is open; a second press after the empty-lane warning, §10.2). In a clash: pause or resume (the power can still be aimed). In the aftermath: skip to the next planning phase |
| `Enter` | Begin (in planning); skip the aftermath |
| `1`–`3` (a draft is open) | Pick a draft card |
| `R`, or the relics chip | Your relics and augments (§10.2) |
| `I` | Focus the top band's chips (Tab moves along them; each shows its tooltip; Esc leaves) |
| `]` / `[` | Speed up or down (1× / 2× / 3×), in a clash |
| `Tab` | Cycle through your buildings |
| `H` | Help overlay: the matrix and the shape language, merging, the general, the economy, rounds, and every key |
| `S`, or the speaker button | Sound on or off, anywhere in the game. Hovering or focusing the speaker opens the volume sliders (§13.9) |
| `F3` | Debug overlay (only with `?debug=1`): plots, the formation box and its slots, aggro radii, ids |

- **Planning keys in a clash:** planting, selling and `M` are planning actions. During a clash they're refused with a callout that says so, and so is `Q` outside a clash.
- **Gone:** `F` and the Hold / Advance switches went with Hold (§5.2, Appendix A).

### 10.4 Feedback rules (clean field, rich inspection)

- **Plain words** (playtest round 3): player-facing text avoids jargon ("touching on a side, not just a corner", "half as much extra", "while it is hit"). Data text is copied into every battle's state, so rewording it moves the golden hashes; until the next golden refresh the plain wording lives in `src/ui/words.ts`, and a unit test keeps its numbers in step with the data. R2 regenerates the goldens (§15.5), so the plain wording SHOULD move into `data/*.json` then. A layout rule gets a small picture: every combo shows its positions (in front of, behind, beside) as one (§11.14).
- **The shape language** (§5.8): a unit's look says its job, so the field teaches matchups without text. This answers the P3 playtest's "a wall of text" (docs/playtest-feedback.md, F17).
  - *Body size shows armor:* light units are small, medium are medium and heavy are big, in three height bands (§14.3). Size means armor and nothing else, so a merged unit keeps its body. v1 drew Bloomed units at ×1.25 and Elders at ×1.5 (`TIER_SCALE` in `src/render/renderer.ts`); R4a drops that.
  - *No weapon marks* (the user, 2026-11-01): no unit or emplacement carries a mark glyph for its damage type, and none is to be added. A unit's silhouette tells it apart. Its damage type shows in the hit sparks, in the matchup marks on its card and on the planning screen, and in the inspect panel (§5.8).
  - *Team color stays:* violet against gray (§2).
  - *Pips* mark merge tiers: one for Bloomed and two for Elder, each a gold core at least 3×3 native px in a dark outline. An Elder also carries a 1-px gold rim and its aura (R4-Q3, agreed 2026-11-01). Bloomed units get no rim: a rim makes a unit look 2 px bigger, which would blur the 2–3 px between the bands, and Bloomed units are about half of a merging army. *Icons* mark augments.
  - Each archetype MUST have a distinct silhouette. Sprites stay text-defined (§17 #20).
  - *The shape never lies* (§5.8): augments and combos never change a unit's body or weapon. The shape always tells the base matchup, and a build that beats it shows its icon.
  - **Open:** whether the shape language reads at the field's scale in a 1280×720 window, or a clash needs a closer view. First guess: it reads, with no closer view. §13.6 keeps the whole map in view, with no camera.
    - The sizes: at 2× the bodies are 16–18, 22–24 and 30–32 screen px tall. Twin Roots, at about 1.78× (§10.1), is the worst case, at 14–16, 20–21 and 27–28.
    - The plan (agreed 2026-11-01): R4a adds a Twin Roots lineup capture beside the one-lane one, and draws pips at least 2 native px wide. R2's first playtest takes a first reading, and R4b's fresh-tester gate decides (§16 R4, §18.2 #52).
- **Matchup marks:** cards and the planning screen show matchups as marks, not paragraphs.
  - A mark is a shape (a body size, or pips for Bloomed and Elder targets) in a class: *strong* (the hits do ×1.5 or more, §5.3) or *weak* (×0.75 or less). It's drawn like that class's hit spark, so the marks and the field teach the same thing. A normal matchup has no mark. A mark's class shows in its size and outline as well as its tint.
  - Marks show the matrix and the tags (§5.3), which the shapes always tell. An augment or combo that changes a matchup adds its icon to the mark, and the tooltip gives the changed number.
  - **On a card:** the shapes its unit is strong against and weak against. In planning, a mark lights while the general's army fields that shape, so a card that answers its army stands out at a glance.
  - **On the planning screen:** while a card is chosen or one of your squads is hovered, each enemy squad shows the class of your hits on it. Hovering an enemy squad shows the class of its hits on your squads and cards.
  - R2's planning screen needs basic marks to be playtestable; R4b draws them in full (§16).
- **Augment icons:** an augment shows on its card and on its squad in the formation preview, the general's included (§11.13). In a clash a unit carries no augment icon. An augment shows its icon where and when it acts (spores bursting from a dying Sporeling, a shield stopping an arrow), and inspecting the unit lists its augments.
- **Combo highlights:** while placing, the ghost lights each neighbor it would link with and shows the combo's icon. In planning, linked buildings are joined by a hypha with the combo's icon at its middle ("mycelium connects", docs/archive/v1/ui-ux-plan.md). In a clash, a combo shows its icon when it acts, as an augment does.
- **Damage numbers:** none by default. The setting offers *off*, *big hits only* (30 or more) and *all*. It lives on the settings screen (§10.5), which the cog in the battle's bottom band opens, and is saved with the other settings.
- **HP bars:** shown only on damaged units; always shown on Heartcaps, in the top band. Buildings can't be hit, so they have none.
- **Hit sparks** come in three tints by effectiveness class (§5.3):
  - *strong:* a large, bright gold spark
  - *normal:* a small white spark
  - *weak:* a small, dull gray spark

  This is how players learn the matrix without numbers, and the matchup marks use the same classes. A hit whose damage another rule changes after the matrix (a ground unit's melee on a flyer) shows the class of what it deals.
- **Merging:** faint tethers between candidate trios, a glow while units knit (at the muster, and later wherever v1's rule finds a trio, §5.6), a pop label, and tier pips (one for Bloomed, two for Elder) on a sprite of the unit's own size, with an Elder's gold rim. The pop label shows for your merges and for every Elder. An enemy Bloomed merge shows its glow and pips only, so a round's knitting doesn't crowd the field.
- **The colonies** (v1's territory is retired, Appendix A): each colony's ground carries its side's mycelium, and the arena between them is bare soil that nobody owns. In planning, plots show as a faint grid, with loam and stump plots drawn as themselves (§10.2).
- **Kept combat rules show on the field** (§5.3):
  - a pinned ranged unit SHOULD carry a small knot over its head while it's pinned;
  - spore clouds are soft discs in their owner's glow;
  - a burst swells to its radius with a ring;
  - cleave throws a spark on every unit it hits.
- **Building status glyphs:** merge off (a crossed knot) and "New" (a sprout on either side's buildings planted this planning phase, until the clash). The besieged and supply glyphs are gone with their rules.
- **Inspect panel:**
  - *Units:* tier, HP, shape and weapon (armor and damage type) with matrix hints ("strong vs Light · weak vs Heavy"), augments, live DPS over the last 5 s, kills.
  - *Buildings:* its squad (unit and size) with its merge preview ("fields as 2 Bloomed + 2"), its plot (rank, file, loam), its combos and augments, its squad's damage and survivors in the current or last clash, gold produced (economy), the merge toggle, the sell value and its copy ("copy 1 of 2"). The general's buildings show the same, without the buttons.
- **Post-battle report** (by round):
  - the outcome and how it was decided: the round a Heartcap fell in, or the Decision after round 9 with each side's damage dealt (§6.5); in a run, a life lost on a loss (§8.5)
  - the **round chart:** one column per round, the Heartcap damage you dealt rising in violet and the damage you took hanging in ash, with each Heartcap's HP after the round as a line. Sporestorm rounds are marked, and on Twin Roots each column splits by lane
  - damage by building (a bar list), over the battle's clashes
  - units fielded and merged
  - gold by source
  - the general's counters by round, with the buildings it planted for them
- **Puffs:** a unit's arrival at the clash and its death are puffs of spores, the one particle: a few spore-white motes, 1–2 px, that drift up and fade (arrival 320 ms, death 420 ms). The Sporestorm's specks on the field are spore-white too.
- **Accessibility:**
  - Anything shown by color is also shown by an icon or shape.
  - Planning is untimed, and a clash can always be paused.
  - Text is at least 12 CSS px.
  - Screen shake is off by default. Turned on, it is a restrained jolt of the field when a Heartcap is hit in the aftermath: up to 3 screen px by damage, 180 ms, at most once every 1.5 s per Heartcap, and never under reduced motion.
  - **Reduced motion** follows the device's setting unless the player turns it on or off. It drops the screen wipe, drift, tilt, lift, roll-ups, shake and the aftermath's surge, and keeps fades at 120 ms or less.
  - **Color-blind assist** (off by default): a team mark under every unit, the formation preview's included, a light lilac ring for the Velvet Bloom and a dark bar with pale dashes for the Gray Rot, so the sides differ in shape and lightness as well as hue; brighter wandering strands on the Bloom's colony and dark ash tufts on the Rot's; and a leaning hatch on the Rot's pips in the round tally and on its half of the lane tug.

### 10.5 Screens

- Title
- The Underroot (tabs: Commanders, Traits, Strains, Feats, Blights, Settings)
- Run setup
- Route map
- Battle: planning, clash and aftermath, with the draft overlay
- Battle report
- Run summary
- Settings: sound, damage numbers, default speed, screen shake, UI scale, reduced motion, color-blind assist, tips (save export/import and a profile reset arrive with the profile in M6)

Milestone R2 (§16) needs the battle's three views and the report by round. The run screens change only where lives replace the run's Heartcap, the kit gains copies and the general's route node shows its kit.

**Run screens as built (docs/archive/v1/ui-ux-plan.md, Phase 2), with v2's changes.** Every run screen is DOM (so Playwright can query it), with spores drifting behind it, the run bar on top and a footer with the seed.
- **Title** (the page with no `scene`): "Spore & Sprawl" in the display face beside the Heartcap's silhouette, lit from below. Continue (only with a saved run, and naming its row and lives), New run (after a confirm if a run is saved), How to play (Help) and Settings (the settings screen). The run's route and summary have a Title button back. It becomes the door to the Underroot in M6.
- **Run bar:** your lives (one cap icon per life, lit for each one left, §8.5) in place of v1's Heartcap HP and bar, Spores and Amber with their icons, battles won, the kit (each card with its copies and its augments' icons) and the relics, then the speaker and the settings cog. Each relic is a pixel badge whose shape and rim name its rarity (round, diamond, star), with a tooltip on hover or focus.
- **Route map:** spore pods on soil, one icon per node kind, joined by hyphae from every node to every node in the next row (and from the colony's start to the first row). The path you walked glows violet, the threads you can take now glow lilac, the rest stay dim, and hovering or focusing a pod lights its threads. A legend names the node kinds. A battle node shows its general (portrait, name and title), any elite modifier and the general's kit with each card's copies, so you can plan a run around who's coming (§7.5, §8.2).
- **Draft and spoils cards:** a frame per rarity (common bark, uncommon teal-lit, rare amber-lit with a spore sparkle), each keeping its word; the type's icon in the header (blueprint, copy, augment or relic, §8.3); a blueprint's price, squad (its unit's shape, weapon and size) and role as chips; an augment's icon and the building it changes; `1`–`3` as keycaps (the keys pick on spoils too). Cards deal in left to right, and on hover lift and lean a little toward the pointer (at most 3° and 4°). The in-battle draft opens with a burst of spores rising behind the cards.
- **Event and Grove:** a framed scene at 4× per event (`v-<event id>`) and for the Grove, the story on stalk cream, and the choices as cards with outcome chips (gains, costs with a real minus, gold, notes), each with a word and usually an icon. Number keys pick a choice. The Grove's choices are §8.7's; a life regained shows as a lives chip.
- **Event result** (playtest round 3): after an event whose outcome is random (§8.7), the same vignette shows what you got in place of the choices: the card or augment and what it does, or the relic's badge, name, rarity and text, then anything lost and any chip (lives, Amber, next battle). Continue (Enter, Space or 1) goes on to the route. The UI works it out by comparing the run before and after the choice; the run is already saved at the route.
- **Spoils and elites:** the spoils screen says spoils are a bonus draft for winning, with the same kinds of cards as the drafts in battle (an elite's extra pick: relics only). Elite route nodes show the extra reward from §8.6: a relic pick, +15 Spores and a 25% chance of Amber.
- **Battle report and run summary:** an outcome banner (on a win the Heartcap blooms in lilac spores, on a loss the cap wilts to ash) with the MVP building beside it, then a staged reveal: the banner, the round chart, then the bars. Every table stays. The report's banner names what the battle earned: gold, and in a run its Spores and any Amber (an elite's Amber is shown as a chance, since it is rolled on Continue). On a loss in a run, it also names the life lost and the lives left (§8.5). Rewards roll up from 0 (600 ms, ease-out, then one bump): the report's gold and gold bars, and the summary's Spores, Amber and Commander XP.
- **Help:** six tabs (Matrix · Merging · The general · Economy · Rounds · Keys), each fitting 1280×720; keys are drawn as keycaps.
  - Matrix shows the shape language (§5.8) beside the matrix and the tags.
  - Economy covers income per round by source, interest in plain words with an example ("bank 140 for +7"), the Spore Exchange and comeback gold.
  - Rounds covers a round's three phases, how a clash ends and what it costs the loser, the Sporestorm's escalation with a round-by-round table, the Decision and lives. It replaces v1's Sporestorm tab.
  - R4 rewrites Help's words (§16).
- **Motion:** things grow in (from 0.96, ease-out) and nothing bounces more than once. Every screen change (title, route, spoils, event, Grove, battle, report, summary) is a spore-burst wipe of 360 ms: a veil of the void rises over the old screen on a band of spore-white motes (150 ms, ease-in), the screen swaps, and the veil lifts off the new one from the bottom up (210 ms, ease-out). Clicks and keys wait while it runs; the page's first screen appears at once. A battle's phases aren't screen changes: planning, clash and aftermath share the battle screen, and only the report arrives behind the wipe. Under reduced motion (§10.4) there's no wipe, stagger, lift, tilt, sparkle, roll-up, drift or surge, and fades take 120 ms or less. `?test=1` holds every screen still and makes every change instant.

**Settings screen as built (docs/archive/v1/ui-ux-plan.md, Phase 3).** An overlay sheet that opens from the title's Settings button, the battle's cog (a clash pauses while it is open, and the sheet says so) and the run bar's cog. Esc, Close or a press on the scrim closes it; while it is open, keys reach nothing behind it (except `S`, which still mutes) and Tab stays inside. The speakers keep their quick mute. Two columns:
- **Sound:** mute, and master, effects and ambience volume (§13.9).
- **Battle:** damage numbers (off, big hits, all), default speed (1×, 2×, 3×: a battle's first clash runs at it, and a speed you choose carries to the next clash) and screen shake (off or on). v1's spawn timers setting is gone with spawn timers; a saved value is ignored.
- **Learning** (under Display and motion): tips (off or on, on by default) and "Show tips again", which forgets which first-time tips were shown.
- **Display and motion:** UI scale (auto, or 125%, 150%, 175% or 200% for big screens; a step never lays the page out below 1280×720, so a window too small for it gets the largest scale that fits), reduced motion (system, on, off) and color-blind assist (off, on), with a live preview under it: a strip of field at 3× with two units a side and a round tally, drawn the way the field draws them, so turning the assist on shows its marks at once.

Every change saves at once into the one settings record, `spore-sprawl/settings/v1` (through `storageKey()`, so the dev site keeps its own); a record saved before a field existed loads with that field's default, and a value the game doesn't know falls back to the default.

---

## 11. Content and first-pass numbers

Everything in this section lives in data files (§14.2). The **M** column gives the milestone that first needs each item: M1–M8 as in v1, or R1–R4, the milestones v2 adds (§16).

v2 changes what the content is for. Squads replace spawn timers, plots and copies replace the supply cap, and augments replace upgrade tracks. The values below are checked against `data/*.json` and `src/data/proto.ts` at `aa37365`. Rows and tables new in v2 are **first examples to tune**, as §1.3 says of every v2 number: augments (§11.13), combos (§11.14), run packs (§11.15), and the new effects given to content whose v1 system is retired.

### 11.1 Global constants (`data/balance.json`)

Key names for new constants are first guesses; §14.2 fixes them.

**Rounds and battles** (new in v2, §1.3 #1 and #2):

| Key | Value | Section |
|---|---|---|
| `maxRounds` | 9; after round 9 a battle ends by Decision | §6.5 |
| `clashCapSeconds` | 45; at the cap, more surviving supply in the lane wins it, by the difference | §6.7 |
| `formationGapTiles` | 6 between the two front ranks | §4.6 |
| `heartcapDamagePerSupply` | 25 per supply the winner has left in a lane | §6.7 |
| `siegeHeartcapMult` | 2: `siege` units count double toward Heartcap damage only, not in the 45 s comparison | §6.7 |
| `roundDamageCap` | 500 | §6.7 |
| `sporestorm` start round / per round / max | 5 / +0.20 / ×2.0 (round 5 ×1.2, rising to ×2.0 at round 9) | §6.4 |
| `heartcapPlayerHp` | 3000, every battle | §4.5 |
| `heartcapEnemyHp` base / per battle / boss | 2000 / +250 / 3600, every battle | §4.5 |
| `lives` | 3 | §8.5 |

**Economy per round** (§1.3 #12):

| Key | Value | Section |
|---|---|---|
| `startingGold` / `startingGoldPerBattle` | 300 / +75 (kept) | §6.1 |
| `stipendPerRound` | 100 (was 8 per 5 s tick) | §6.2 |
| A Truffle Cellar's `goldPerRound` | 50, or 75 on a loam plot (was 4 per tick) | §6.2, §11.2 |
| `loamBonus` | 0.5 (kept) | §6.2 |
| `interestPer` / `interestCap` | 20 / 10 (kept), on gold banked at the end of planning | §6.2 |
| `comebackGold` | 40 to the last round's loser | §6.2 |
| `enemyIncomeMult` | 1.0. A blight may raise it (§11.8) | §7.1 |
| `draftRounds` | [2, 4, 6]: a draft opens in the planning phase after each | §8.3 |
| `reroll` base / step, `skipGold` | 20 / 10, 40 (kept) | §8.3 |

**The kit and the colony** (§1.3 #4 and #5). Copies arrive in R3; R2's kit cards have no copy limit (§8.10):

| Key | Value | Section |
|---|---|---|
| `kit.starterCopies` | 2 of each of the commander's 3 starter cards (R3) | §8.10 |
| `kit.blueprintCopies` / `kit.copyCopies` | 1 / 1: a drafted blueprint, and a drafted copy of a card you own (R3) | §8.3, §8.10 |
| `sellRefund` | 0.6 once a building has fielded; 1.0 in the planning phase it was planted (replaces `fullRefundSeconds`) | §4.4 |
| Plots | Per map: 8 on one-lane maps, 6 per lane on Twin Roots (§11.9) | §4.6 |
| `plotGrowth` | +1 plot per battle won, up to 4 more. **Open:** the exact growth (§1.3 #4); this is the first guess | §4.6 |
| Full-colony budget | At most 150 live units a side when the armies arrive, checked on the bench | §13.7 |

**Merging and combat** (kept from v1):

| Key | Value |
|---|---|
| `tickRate` | 20 (ticks run only in a clash, §4.2) |
| `mergeRadius` | 1.5 |
| `mergeCombatCooldownSeconds` / `mergeKnitSeconds` / `mergeCheckEveryTicks` | 2.0 / 1.0 / 10 |
| `tierStatMult` | 2.8 per tier (v1's table said 2.5; the data was tuned to 2.8) |
| `tierSupplyMult` | [1, 2, 4] |
| `tierRadiusMult` | 1.0: a merged unit's collision radius doesn't grow, nor does its drawn body (§5.6, §5.8, §18.2 #53). v1's data has 1.25 until R2 changes it |
| `retargetEveryTicks` / `leashMult` | 5 / 1.25 |
| `splashFalloff` | 0.5 |
| `matrix` | §5.3 (the Structure column now applies only to emplacements, §11.2) |
| `tagMult` | `siegeVsStructure` 2.0 (now only against emplacements); `slayerVsElite` 3.0 (v1's §5.3 said 1.75; the data was tuned to 3.0) |
| `effectiveness` | strong at ×1.5 or more, weak at ×0.75 or less: the hit sparks and the matchup marks (§10.4) |
| `movement.driftSpeed` / `separationPasses` | 0.3 / 2 |

**The combat rework's rules kept in v2** (§1.3 #11). They live in `src/data/proto.ts` today. R2 adopts R1's chosen set as default data: its rules move into `data/balance.json`, and the Burster's and the Rhizomorph's units and buildings into the faction files (§11.2). R3 gives those buildings their place in a run (§11.15):

| Rule | Value | Section |
|---|---|---|
| Pinning | A ranged unit with an enemy unit within 1 tile attacks at ×0.35 its rate | §5.3 |
| Cleave (Scythecap) | Full damage to every enemy within 1.0 tile of its target; Bloomed 1.2, Elder 1.4 | §5.3 |
| Burst (Burster) | 40 damage, ignoring armor, to every enemy within 1.5 tiles, plus a spore cloud of 1.5 tiles for 4 s at 10 a second | §5.3 |
| Spore clouds (Puffball Mortar) | Range 7; each shell leaves a cloud of 1.5 tiles for 6 s at 10 a second, ignoring armor | §5.3, §11.2 |
| Flyers (later) | Rule C: melee hits a flyer for ×0.5; lobbed shells and bursts can't hit it | §5.3 |
| Mixed-wave shields | Not adopted. R1 measures whether mixed armies need them, as a shield at a clash's arrival; R2 adopts them only if R1 keeps them | §16 |
| The Elder Sporeling's splash | Off under `?proto=rework`. R1 measures it, and R2 follows R1's result | §16 |
| The general's swarm read | `ai.counter.swarmMaxSupply` 1, the `swarmread` preset in `src/data/proto.ts` (not in `data/balance.json`): a unit of 1 supply reads by its armor, not as Elite, even when merged. R1 measures whether rounds still need it | §7.4 |

**Retired in v2** (Appendix A). The values are the data's at `aa37365`:

| Key | v1 value | Replaced by |
|---|---|---|
| `waveSeconds` | 60 | The round (§4.2) |
| `incomeTickSeconds` / `stipendPerTick` | 5 / 8 | `stipendPerRound` |
| `supplyCap` | 60 | Plots and copies (§4.6, §8.10) |
| `comebackDivisor` / `comebackMax` | 2 / 6 | `comebackGold` |
| `supplyLinePerColumn` | 0.05 | Nothing: forward building is gone (§6.3) |
| `fullRefundSeconds` | 10 | A full refund in the planning phase a building was planted |
| `besiegedSeconds` / `besiegedRate` | 2.0 / 0.5 | Nothing: buildings aren't in clashes |
| `firstSpawnFraction` | 0.5 | Squads (§4.4) |
| `timeLimitSeconds` | 600 | `maxRounds` |
| `turret` | 2 per lane, 18 pierce, 1.0 s, range 9 | The per-round damage cap (§6.7) |
| `captureSeconds` / `captureRatio` / `captureDecayMult` | 2.0 / 1.5 / 0.5 | Heartcap damage per round (§4.3) |
| `sporestorm` (by time) | from 4:00, a stack every 60 s, up to 5; per stack: unit damage +0.10, turret damage −0.10, Heartcap damage taken +0.20 | `sporestorm` by round |
| `routRepair` / `decisionLossDamage` / `groveRepair` | 0.10 / 0.25 / 0.30 | Lives; the Grove regains a life (§8.7) |
| `draftWaves` | [2, 4, 6, 8] | `draftRounds` |
| `laneStance` | Hold / Advance | Nothing: both armies start each clash at once (§5.2) |
| `movement.spawnOffset` / `spawnJitter` | 0.3 / 0.4 | The formation rule (§4.6) |
| `ai.*` timings in seconds | think every 1 s; economy ×1.5 before 2:00 and ×0.3 after 6:00; counter cycles at 2:00 / 4:00 and 5:00 / 7:00 | The planning AI and the counter cycle in rounds (§7.2, §7.4) |
| `enemyKit.upgradesPerBattle` / `eliteUpgrades` / `bossUpgrades` | 1 / 1 / 4 | Augments from R3, by §7.8's counts (*i* − 1, +1 for an elite, 4 for the boss). `blueprintsPerBattle` 1 and `bossBuildings` 7 stay: the general's kit is §7.8's |
| `draft.typeWeights` | blueprint 35, upgrade 45, relic 20 | v2's card types (blueprint, copy, augment, relic) and their weights (§8.3) |

### 11.2 Velvet Bloom buildings

All buildings have a 2×2 footprint and fill one plot (§4.6). Buildings aren't in clashes and can't be hit, so they have no HP in v2. The `hp` field stays in the data until R2 removes it, except on an emplacement, which fields with it.

**Squads.** Each spawner fields one **squad** every round: what it made in a minute under v1's timers, in whole batches, with halves rounded up (`squad = count × round(60 / interval)`). That keeps v1's supply per gold, so the value check (§11.4) still holds. These are starting points: milestone R1's clash check sets squad sizes (§16). A building's `squad` field replaces `count` and `interval` (§14.2).

**The six core archetypes** (★) are a first cut. **Open:** the sixth (§1.3 #6). First guess: the Burster Pod; the alternative is the Puffball Mortar as an emplacement. Every run can draft them (§8.4). The Truffle Cellar is a basic card for everyone. Every other building is **unlockable**: until M6 it enters a run through its run pack (§11.15), and M6 gates it behind unlocks (§9).

| M | id | Name | Role | Core | Kind | Cost | Squad | Supply |
|---|---|---|---|---|---|---|---|---|
| 1 | `sporelingBurrow` | Sporeling Burrow | Swarm | ★ | spawner | 110 | 8 Sporelings | 8 |
| 1 | `capguardHall` | Capguard Hall | Shield | ★ | spawner | 150 | 4 Capguards | 8 |
| 1 | `gillNest` | Gill Archer Nest | Archer | ★ | spawner | 150 | 4 Gill Archers | 8 |
| 4 | `amanitaLodge` | Amanita Lodge | Heavy | ★ | spawner | 260 | 2 Amanita Knights | 6 |
| 4 | `hammercapForge` | Hammercap Forge | Crusher | ★ | spawner | 170 | 4 Hammercaps | 8 |
| R1 | `bursterPod` | Burster Pod | Area | ★ (Open) | spawner | 130 | 6 Bursters | 6 |
| 1 | `truffleCellar` | Truffle Cellar | Economy | basic | economy | 150 | none: +50 gold a round, +75 on loam | – |
| 3 | `tendersRing` | Tender's Ring | Healer | | spawner | 180 | 3 Tenders | 3 |
| 2 | `veilstalkerHollow` | Veilstalker Hollow | Slayer | | spawner | 160 | 6 Veilstalkers | 6 |
| 2 | `scythecapGrove` | Scythecap Grove | Cleave | | spawner | 170 | 3 Scythecaps | 6 |
| 4 | `morelWarren` | Morel Warren | Fast swarm | | spawner | 130 | 6 Morel Runners | 6 |
| 1 | `rootbreakerDen` | Rootbreaker Den | Siege | | spawner | 200 | 3 Rootbreakers | 9 (18 toward Heartcap damage) |
| R1 | `rhizomorphTunnel` | Rhizomorph Tunnel | Tunneler | | spawner | 160 | 3 Rhizomorphs | 6 |
| later | `driftStalk` | Drift Stalk | Flyer | | spawner | 160 | 6 Driftlings | 6 |
| 1 | `puffballMortar` | Puffball Mortar | Emplacement | (Open) | tower | 160 | itself: crush 24 every 3.0 s, range 6 (7 with spore clouds), min range 1.5, splash 1.0; 500 HP, Structure armor (first guess) | – |
| 4 | `sporeExchange` | Spore Exchange | Economy | | economy | 160 | none: +12 gold a round; interest cap +10 | – |
| 4 | `rhizomeVault` | Rhizome Vault | Utility | | utility | 140 | none: each spawner beside it fields 1 more unit (new effect, first guess) | – |
| 6 | `velvetShrine` | Velvet Shrine (Vesper, mastery 2) | Utility | | utility | 150 | none: the squad in front of it fields 2 more units. **Open:** its new effect; this is the first guess | – |
| 6 | `rootgate` | Rootgate (Armilla, mastery 2) | Emplacement | | tower | 140 | itself: a root wall in its slot, 1200 HP, no attack, restored each round. **Open:** its new effect; this is the first guess | – |
| 6 | `puppetPod` | Puppet Pod (Cordis, mastery 2) | Swarm | | spawner | 150 | 9 Sporelings; merge forced on; knit time −50% | 9 |

- **The rework's three buildings** (the Burster Pod, the Rhizomorph Tunnel and the Drift Stalk) exist today only as `?proto=` presets (`burster`, `rhizomorph` and `flyers` in `src/data/proto.ts`, all three in `rework`). R2 moves the ones in R1's chosen set into `data/factions/velvet-bloom/buildings.json` and `units.json` as default data (§16). R3 gives each its place in a run: the Burster Pod as the sixth archetype or in a pack, and the Rhizomorph Tunnel in the Deep Roots pack (§11.15). The Drift Stalk waits for flyers (§1.3 #11).
- **Economy and utility buildings** field nothing, so each leaves a hole in the formation; they belong at the back (§4.6). A Truffle Cellar on a loam plot yields +50% (§11.9). The Spore Exchange's +12 a round is its v1 trickle of 1 gold per 5 s tick. The Rhizome Vault's v1 effect (+6 supply cap, at most 2 Vaults) went with the supply cap; its new effect and the Velvet Shrine's show on the field as combo links do (§10.4, §11.14).
- **The Puffball Mortar** is the alternative sixth archetype. Until that's decided it's an unlockable emplacement in the Bastion pack (§11.15), and it stays in Vesper's core and Armilla's starter (§11.10). As an **emplacement** (a `tower` building's archetype, §4.4) it fields itself in its plot's slot: it can't move, it fights with its own HP, armor and attack, and it's restored every round. With the kept spore-cloud rule its shells reach 7 tiles and leave clouds (§11.1). Siege units deal ×2.0 to it (Structure armor, a first guess). How an emplacement keeps its lane alive and what it counts toward Heartcap damage are §6.7's (a first guess, Open there).
- The Gray Rot plays this roster in its own palette until M7 (§11.12).

### 11.3 Velvet Bloom units

`dmg/int` is damage per hit / seconds between attacks. `rng` is range, `proj` is projectile speed (0 = melee), `spd` is speed, `sup` is supply, `aggro` is aggro range, `rad` is radius. Values are the data's (`data/factions/velvet-bloom/units.json`, and `src/data/proto.ts` for the rework's units), which several M2–M5 tuning passes moved from v1's first table.

| M | id | Name | Body (armor) | Weapon (damage) | HP | Dmg / int | Rng | Proj | Spd | Sup | Aggro | Rad | Tags / notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `sporeling` | Sporeling | light | slash | 72 | 7 / 0.8 | 0.4 | 0 | 1.5 | 1 | 4 | 0.25 | swarm |
| 1 | `capguard` | Capguard | medium | slash | 220 | 14 / 1.0 | 0.5 | 0 | 0.75 | 2 | 4 | 0.35 | |
| 1 | `gillArcher` | Gill Archer | light | pierce | 110 | 14 / 1.2 | 5.0 | 8 | 1.0 | 2 | 6 | 0.25 | ranged; pinned in contact (§5.3) |
| 4 | `amanitaKnight` | Amanita Knight | heavy | slash | 500 | 28 / 1.4 | 0.6 | 0 | 0.75 | 3 | 4 | 0.45 | |
| 4 | `hammercap` | Hammercap | medium | crush | 240 | 25 / 1.4 | 0.5 | 0 | 0.85 | 2 | 4 | 0.35 | anti-Heavy |
| R1 | `burster` | Burster | light | area (burst) | 50 | 40, once | 0.3 | 0 | 1.6 | 1 | 5 | 0.3 | burst: rolls at the thickest knot of enemy units in its aggro range and bursts on reaching it or on dying (§11.1); never merges (§5.6) |
| 3 | `tender` | Tender | light | none (heals 8 HP / 1.0) | 90 | – | 2.5 | – | 1.0 | 1 | 4 | 0.25 | support: heals the most-damaged ally unit in range (ties → id) |
| 2 | `veilstalker` | Veilstalker | light | pierce | 80 | 12 / 1.1 | 0.5 | 0 | 1.4 | 1 | 5 | 0.25 | slayer: ×3.0 against Bloomed and Elder units |
| 2 | `scythecap` | Scythecap | medium | slash, area (cleave) | 200 | 16 / 1.3 | 0.6 | 0 | 0.9 | 2 | 4 | 0.35 | cleave 1.0 (§11.1) |
| 4 | `morelRunner` | Morel Runner | medium | pierce | 80 | 9 / 0.9 | 0.4 | 0 | 1.8 | 1 | 4 | 0.25 | swarm |
| 1 | `rootbreaker` | Rootbreaker | medium | crush | 460 | 28 / 2.0 | 0.6 | 0 | 0.6 | 3 | 4 | 0.45 | siege: counts double toward Heartcap damage (§6.7); a ram, not a tank (Medium armor, so Pierce counters it) |
| R1 | `rhizomorph` | Rhizomorph | medium | slash | 140 | 16 / 1.0 | 0.5 | 0 | 1.2 | 2 | 4 | 0.3 | burrow: tunnels and surfaces by §5.2 |
| later | `driftling` | Driftling | light | slash | 70 | 8 / 1.0 | 1.0 | 0 | 1.4 | 1 | 5 | 0.25 | flying, under rule C (§11.1) |

**The shape each implies** (§5.8). Body size shows armor (light small, medium medium, heavy big) and nothing else: the collision radius above is a separate number, so the Rootbreaker is drawn at a medium body. Units carry no weapon mark (§5.8, 2026-11-01). Each core archetype MUST have a distinct silhouette. The silhouettes are ideas for R4a, which draws them. A weapon a silhouette draws is body, and it counts toward the band: the Gill Archer's bow, the Hammercap's raised maul, the Scythecap's hooked cap edge and the Rootbreaker's ram (`docs/r4a-plan.md`, call 9).

| Unit | Body | Silhouette idea (R4a) |
|---|---|---|
| Sporeling ★ | small | a round puff on stubby legs |
| Capguard ★ | medium | a broad flat cap held forward like a shield |
| Gill Archer ★ | small | a tall thin stalk with a gill fan and a bow |
| Amanita Knight ★ | big | a spotted red-and-cream dome over a heavy stem |
| Hammercap ★ | medium | a squat cap with a maul raised over it |
| Burster ★ | small | a swollen spore sac that rolls |
| Tender | small | a ring-shaped cap with a lantern glow |
| Veilstalker | small | a hooded, veiled stalk, leaning forward |
| Scythecap | medium | a hooked cap edge like a scythe |
| Morel Runner | medium | a ridged, honeycombed morel on long legs |
| Rootbreaker | medium | a ram's head of knotted root |
| Rhizomorph | medium | a root cord with a mouth, half in the soil |
| Driftling | small | a floating seed-head with a shadow under it |

**Merge perks** (applied at tier 2 / tier 3, on top of ×2.8 HP and damage per tier). Merged units are marked with pips, not drawn bigger (§5.8).

| Unit | Bloomed (tier 2) | Elder (tier 3) |
|---|---|---|
| Sporeling | speed ×1.15 | splash 0.6 (off under `?proto=rework`; R1 measures it) |
| Capguard | resist pierce ×0.85 | resist pierce ×0.7, radius +0.1 |
| Gill Archer | range +0.75 | range +1.5, attack interval ×0.9 |
| Amanita Knight | resist slash ×0.85 | resist slash ×0.7 |
| Hammercap | resist crush ×0.85 | resist crush ×0.7, damage ×1.1 |
| Burster | – (never merges, §5.6) | – |
| Tender | heal range +0.5 | heals 2 targets |
| Veilstalker | speed ×1.1 | slayer bonus 3.0 → 3.4 |
| Scythecap | cleave 1.2 | cleave 1.4 |
| Morel Runner | speed ×1.1 | damage ×1.1 |
| Rootbreaker | speed ×1.1 | splash 0.6 |
| Rhizomorph | speed ×1.1 | damage ×1.1 |
| Driftling | speed ×1.1 | damage ×1.1 |

### 11.4 Value check per squad and gold (sanity, not law)

The heuristic, so new content starts near balance. A squad is a minute of v1's output (§11.2), so v1's formula carries over with the squad size in place of units per minute:

```
value per gold = squad size × sqrt(HP × DPS) × roleFactor / cost
value per plot = squad size × sqrt(HP × DPS) × roleFactor
```

- **Per gold** decides the early rounds, while gold is short.
- **Per plot** decides once the plots are full, which replaces v1's "per supply at the cap".
- **Per supply** (`sqrt(HP × DPS) × roleFactor / supply`) is what each survivor is worth in Heartcap damage (§6.7).

The role factors are guesses until the clash check calibrates them: ranged 1.6, splash and cleave 1.4, siege 1.3 (now for its double Heartcap weight), slayer 1.2, other 1.0. Target: 1.45 ± 0.15 per gold, before matrix effects. The numbers use the data in §11.3.

| Building | Squad | sqrt(HP × DPS) | Role factor | Per gold | Per plot | Per supply |
|---|---|---|---|---|---|---|
| Sporeling Burrow ★ | 8 | 25.1 | 1.0 | 1.83 | 201 | 25.1 |
| Capguard Hall ★ | 4 | 55.5 | 1.0 | 1.48 | 222 | 27.7 |
| Gill Archer Nest ★ | 4 | 35.8 | 1.6 | 1.53 | 229 | 28.7 |
| Amanita Lodge ★ | 2 | 100.0 | 1.0 | 0.77 | 200 | 33.3 |
| Hammercap Forge ★ | 4 | 65.5 | 1.0 | 1.54 | 262 | 32.7 |
| Burster Pod ★ | 6 | – | – | – | – | – |
| Veilstalker Hollow | 6 | 29.5 | 1.2 | 1.33 | 213 | 35.4 |
| Scythecap Grove | 3 | 49.6 | 1.4 | 1.23 | 208 | 34.7 |
| Morel Warren | 6 | 28.3 | 1.0 | 1.31 | 170 | 28.3 |
| Rootbreaker Den | 3 | 80.2 | 1.3 | 1.56 | 313 | 34.8 |
| Rhizomorph Tunnel | 3 | 47.3 | 1.0 | 0.89 | 142 | 23.7 |
| Puppet Pod | 9 | 25.1 | 1.0 | 1.51 | 226 | 25.1 |

- **What the heuristic can't value:** the Burster deals its 40 once, through armor and over an area; the Tender heals; the Rhizomorph's worth is where it surfaces. The clash check measures those three directly. The Amanita Knight's worth is mostly its armor: against Slash, which takes ×0.5 on Heavy, its effective HP doubles and its value per gold reads about 1.09.
- **The swarm's gold edge.** Cheap Sporelings are the most gold-efficient squad and among the least plot-efficient. In a clash the square law (strength ∝ quality × bodies²) widens that edge further than this linear value shows ([docs/archive/v1/ideas/rounds.md](docs/archive/v1/ideas/rounds.md), "At equal gold, the triangle tilts toward the swarm"). Their brakes in v2 are copies and plots (the supply cap was v1's), Slash damage, and area damage. Merging is how a squad rises above its per-plot value. The direct knob is the Burrow's squad: at 7 its value per gold is 1.60, and at 6 it's 1.37.

**Intended counter graph for the core six** (rough estimates for R1's clash check to confirm; each core archetype has an answer among the six):

| Archetype | Beats | Loses to |
|---|---|---|
| Swarm (Sporeling) | Gill Archers (reaches them and pins them), Hammercaps | Capguards (Slash on Light), Amanita Knights, Bursters |
| Shield (Capguard) | Sporelings | Gill Archers (Pierce on Medium), Amanita Knights |
| Archer (Gill Archer) | Capguards, Hammercaps | Sporelings, Amanita Knights (Pierce on Heavy ×0.75) |
| Heavy (Amanita Knight) | Sporelings, Capguards, Gill Archers | Hammercaps (Crush on Heavy) |
| Crusher (Hammercap) | Amanita Knights | Sporelings, Gill Archers |
| Area (Burster) | packed formations, above all Sporelings | Gill Archers, which shoot Bursters before they arrive |

Ranged units are the likeliest to drift over-efficient. If the guardrails flag the Gill Archer, cut its range to 4.5 before touching its damage.

### 11.5 Strains (Milestone 6)

Strains are chosen before a run (§9.3); augments are drafted during one (§11.13). §9.3 says how the two relate. Patches that named spawn counts and timers now name the squad, by §11.2's rule.

| Building | Strain | Patch |
|---|---|---|
| Sporeling Burrow | *Teeming* | 3 per batch: a squad of 9; Sporeling HP ×0.8; knit time ×0.5 |
| Sporeling Burrow | *Bursting* | Sporelings explode on death for 15 crush, splash 0.8; HP ×0.85 |
| Capguard Hall | *Ironcap* | Capguard armor → heavy; speed ×0.85; HP ×1.1 |
| Capguard Hall | *Gillguard* | Capguard damage type → pierce |
| Gill Archer Nest | *Longgill* | range +1.5; attack interval ×1.25 |
| Gill Archer Nest | *Volley* | 2 per batch: a squad of 6; damage ×0.8 |
| Rootbreaker Den | *Battering* | counts triple toward Heartcap damage (not double); damage to units ×0.7 (new effect: v1 raised its bonus against structures) |
| Rootbreaker Den | *Tunneling* | speed ×1.4; HP ×0.8 |
| Puffball Mortar | *Thornpuff* | damage type → slash; splash 1.3; damage ×0.8 |
| Puffball Mortar | *Longshot* | range 8; min range 3; interval ×1.2 |
| Truffle Cellar | *Deep Truffle* | +50% gold on a third-rank plot; no loam bonus (new effect: v1 paid it in home columns, and every plot is home now) |
| Truffle Cellar | *Wild Truffle* | loam bonus +100%; −25% gold elsewhere |

- **Strains that change a body or a weapon** (*Ironcap*, *Gillguard*, *Thornpuff*, kept from v1). Augments and combos never change either (§5.8). **Open:** whether a strain may change a body or a weapon (§9.3). First guess: no, as for augments, so these three strains need new patches in M6. If a strain may, it changes the unit's drawn body with it, so the shape still tells the truth.
- The new core archetypes (the Amanita Lodge, the Hammercap Forge and the Burster Pod) get their strains in M6.

### 11.6 Upgrade tracks (replaced by augments in R3)

v1's drafts offered upgrade levels: 14 tracks of 3 levels, 42 levels in all, 40 of them flat numbers (`data/upgrades.json`). In R3 augments replace them (§11.13): draft cards that change how a building's units play. The code keeps the tracks until then. v1's table, kept as the record:

| Building | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Sporeling Burrow | Sporeling HP +15% | Sporeling damage +15% | +1 Sporeling per spawn |
| Capguard Hall | Capguard HP +15% | Capguard resist pierce ×0.8 | Capguard damage +20% |
| Gill Archer Nest | Gill Archer range +0.75 | Gill Archer damage +15% | Attack interval −15% |
| Rootbreaker Den | Rootbreaker HP +20% | Rootbreaker speed +20% | +25% vs structure |
| Puffball Mortar | splash +0.3 | damage +20% | range +1 |
| Truffle Cellar | +1 gold per tick | Building HP +200 | +1 gold per tick |
| Others (M2+) | Same pattern: survivability → damage → a signature boost, defined in each building's data | | |

**In R2, before augments.** **Open:** what each upgrade level does in rounds. First guess: a level that adds a unit per spawn adds one unit per batch to the squad (the Burrow's level 3 makes its squad 12, the Morel Warren's 9); a level of gold per tick is +12 gold a round; levels on building HP, the supply cap or spawn speed do nothing, and R2's drafts stop offering them.

### 11.7 Relics (Milestone 3) and colony traits (Milestone 6)

**Relics.** The first release ships at least 20, and `data/relics.json` holds 21. Each has a v2 status:
- **Kept:** unchanged;
- **Kept, per round:** each gold it paid per 5 s income tick becomes 12 gold a round, as the Spore Exchange's does;
- **New effect:** its v1 effect was tied to a retired system. The new effect is a first guess.

No relic is retired. C = common, U = uncommon, R = rare. Each relic's pack, if it has one, is in §11.15.

| Rarity | Relic | v1 effect | v2 status | v2 effect |
|---|---|---|---|---|
| C | Thick Caps | Your buildings +15% HP | New effect | Your front-rank units +15% HP |
| C | Fruiting Season | Economy buildings +1 gold per income tick | Kept, per round | Economy buildings +12 gold a round |
| C | Rot Ward | Heartcap turrets +25% damage | New effect | Your Heartcap takes 15% less damage from each lost round, before the round cap (§6.7) |
| C | Quick Roots | Capture speed +20% | New effect | Your melee units move 25% faster until their first attack in each clash |
| C | Fresh Spores | Each building's first spawn is instant | New effect | A building planted this planning phase fields 1 more unit in its first clash |
| C | Hardy Spores | Your units +8% HP | Kept | |
| C | Root Stipend | Heartcap stipend +2 gold per income tick | Kept, per round | Heartcap stipend +24 gold a round |
| U | Deep Cellars | Interest cap +10 | Kept | |
| U | Spore Tithe | +4 gold per merge | Kept | Watch it: squads knit every round, so merges are common |
| U | Forward Spores | Supply-line surcharge halved | New effect | As each clash starts, a spore cloud lands on the middle of the enemy's front rank in each lane (1.5 tiles, 4 s, 10 a second) |
| U | Knitting Circle | Knit time −50%; merge radius +0.5 | Kept | |
| U | Second Flush | Selling refunds 80% | Kept | Selling a building that has fielded refunds 80%, not 60% |
| U | Mycelial Web | Supply cap +6 | New effect | Your colony gains 1 plot (§4.6) |
| U | Mending Moss | At the start of each wave, repair your Heartcap by 2% of max HP | New effect | Each round you win, your Heartcap regains 100 HP, up to its max. A first guess that brings back an in-battle heal, which v2 otherwise retires (§1.3 #2) |
| U | Bloom Vigor | Bloomed and Elder units deal +15% damage | Kept | |
| R | Mycorrhizal Link | Buildings orthogonally adjacent to 2+ of your buildings spawn 15% faster | New effect | Your combos also link buildings that touch only at a corner (§11.14) |
| R | Spore Cloud | Your units release a cloud on death: 10 crush, splash 1.0 | Kept | |
| R | Elder's Patience | Elders +25% HP; they regenerate 2% HP/s while out of combat | Kept | |
| R | Sporestorm Sigil | Commander power cooldown −30% | New effect | From round 5, your commander power's effect is 50% stronger. It still fires at most once per clash (§6.6) |
| R | Rot-Eater (feat) | +1 gold per enemy unit killed while the Sporestorm is active | New effect | +1 gold for each enemy unit killed in a clash from round 5 (§6.4) |
| R | Martyr's Bloom | When one of your buildings is destroyed, it bursts for 60 crush, splash 2.0 | New effect | When the last unit of one of your squads dies, it bursts there for 60 crush, splash 2.0, once per squad per clash |

**Intended "rare broken run" engines.** These are allowed, but they depend on rare finds:

- Spore Tithe + Knitting Circle + *Teeming* strain: a merge economy (the Brood pack).
- Spore Cloud + Martyr's Bloom + the Sporeling's Spore Pop augment: chain detonations (the Reaping pack, §11.13).
- Mycorrhizal Link + Mycelial Web + a colony packed with combos: combo density (the Deep Roots pack).
- The Rhizome Vault + Bloom Vigor + Elder's Patience: bigger squads that knit into Elders (the Elder Grove pack).

**Colony traits.** The first release ships at least 12:

| Trait | Cost | v1 effect | v2 status | v2 effect |
|---|---|---|---|---|
| Thick Hyphae | 1 | Heartcap +10% max HP | Kept | Every battle's Heartcap |
| Early Flush | 2 | +50 starting gold each battle | Kept | |
| Quick Knit | 1 | Knit time −30% | Kept | |
| Rich Veins | 2 | Loam bonus +25% (to +75%) | Kept | |
| Spore Memory | 2 | The first draft of each battle offers 4 cards | Kept | |
| Root Pressure | 3 | Capture speed +15% | New effect | Your colony has 1 more plot (§4.6) |
| Patient Growth | 1 | Interest cap +5 | Kept | |
| Bulwark Spores | 2 | Buildings +15% HP | New effect | Your front-rank units +10% HP |
| Thrifty | 1 | Rerolls cost 10 less | Kept | |
| Feral Bloom | 0 | Units +10% damage; buildings −15% HP | New effect | Units +10% damage; your Heartcap −10% max HP |
| Hermit | 0 | No comeback income; +100 starting gold | Kept | No comeback gold (§6.2) |
| Wild Draft | 0 | Drafts offer +1 card; no rerolls | Kept | |

**Open:** whether plots from relics, traits and commanders count toward the most plots a colony can hold (§4.6). First guess: yes, so no source takes a colony past that limit, and a full colony stays inside the performance budget (§13.7).

### 11.8 Blights (Milestone 7)

v1 listed 6 blights, and v2 keeps 6 (§9.6, §17 #15). Four get new effects, since their systems are retired. Silent General's effect (no counter warnings) has nothing left to remove, because v2 retires the warnings and shows the general's army instead (§7.5), so **Hoarding Rot**, which raises the general's income (§7.1, §17 #14), replaces it. All new effects, and the replacement, are first guesses.

| Blight | Decay per rank | v2 effect | v1 effect, if changed |
|---|---|---|---|
| Hardened Rot | 1 / 2 | Enemy units +8% / +15% HP | Enemy buildings +15% / +30% HP |
| Quick Learner | 2 | The general's counter cycle runs one round earlier (§7.4) | The general's warning comes 1 wave ahead instead of 2 |
| Thin Soil | 1 | Your colony has 1 fewer plot: one back-rank plot becomes a stump | Your home zone −1 column (minimum 2) |
| Famine | 1 / 2 | Your Heartcap stipend −25% / −50% | |
| Early Storm | 2 | The Sporestorm starts at round 4 (§6.4) | The Sporestorm starts at 3:00 |
| **Hoarding Rot** (new; replaces Silent General) | 1 / 2 | The general's income each round ×1.15 / ×1.30 (`enemyIncomeMult`) | Silent General (2 Decay): no counter warnings (counters still happen) |

### 11.9 Maps (v1, with v2 colonies)

All maps are point-symmetric and hand-authored, and map files sit next to the other data files. In v2 a map's terrain moves into the colonies (§1.3 #4), because rounds don't use the contested middle where all of v1's loam and stumps lie. Lanes and root walls stay, and the arena between the colonies MAY shrink (§4.1).

| M | id | Name | Lanes | W × H | Colony | Character in v2 |
|---|---|---|---|---|---|---|
| 1 | `bogwater-hollow` | Bogwater Hollow | 1 | 32 × 8 | 8 plots: 2 ranks × 4 files | The plain colony. One loam plot, in the back rank, where economy belongs anyway: the teaching map |
| 3 | `stumpfield` | Stumpfield | 1 | 34 × 8 | 8 plots, 6 buildable | Two stumps break the line, and the one loam plot is in the front rank, so greed costs a front-line plot |
| 3 | `twin-roots` | Twin Roots | 2 | 32 × 13 (6 + wall + 6) | 6 plots per lane: 2 ranks × 3 files | Your loam is in one lane and a stump in the other. By point symmetry the general's loam lane faces your stump lane, so each lane pits one side's greed against the other's broken front |
| 7 | `three-hollows` | Three Hollows | 3 | 30 × 14 (4 + 1 + 4 + 1 + 4), first guess | 4 plots per lane: 2 ranks × 2 files | Short lanes and tight space; the middle lane's back rank holds the loam |

**Colony layouts** (first guesses). `·` is soil, `$` a loam plot, `o` a stump plot. Files are numbered from the top of the map (row 0), and on Twin Roots from the top of each lane. Each layout is the player's colony; the general's is its point mirror (§4.1), so its front rank is still its front, and its file 1 mirrors your last file.

| Map | Lane | Front rank, files 1→n | Back rank, files 1→n | Buildable |
|---|---|---|---|---|
| Bogwater Hollow | – | `· · · ·` | `· $ · ·` | 8 |
| Stumpfield | – | `· o · $` | `· · o ·` | 6 |
| Twin Roots | upper | `· o ·` | `· · ·` | 5 |
| Twin Roots | lower | `· · ·` | `$ · $` | 6 |
| Three Hollows | upper and lower | `· ·` | `· ·` | 4 each |
| Three Hollows | middle | `· ·` | `$ ·` | 4 |

- **A loam plot** is a 2×2 of loam tiles: an economy building there yields +50% (§6.2). **A stump plot** can't be built on, so it leaves a hole in the formation (§4.6).
- **Plots the colony gains** over a run (the third rank, §4.6) are plain soil on every map (first guess).
- **Map files:** R2 moves each map's `$` and `o` tiles into its home columns to match these layouts, and the contested middle becomes plain soil.
- **Three Hollows** keeps v1's character, but v1's lanes of 5 rows and 3 home columns can't hold whole 2×2 plots. **Open:** its shape under plots. First guess: 3 lanes of 4 rows and 4 home columns, so 12 plots in all.

### 11.10 Commanders (Milestone 5)

Each commander's starter kit is its 3 starter cards with 2 copies each (copies from R3, §8.10). The power is fired during a clash, at most once per clash (§6.6), so v1's cooldowns and first-ready times are retired. Vesper's passive and Armilla's passive and power were tied to retired systems; their new effects are first guesses.

| Commander | Core pool (6) | Starter kit (3 × 2 copies) | Passive | Active power (once per clash) |
|---|---|---|---|---|
| **Vesper Velvetcap** (starter) | Burrow, Capguard Hall, Gill Nest, Rootbreaker Den, Puffball Mortar, Truffle Cellar | Burrow, Capguard Hall, Truffle Cellar | **Home Brood** (new): each of Vesper's spawners on a front-rank plot fields 1 more unit. It's the round form of Vesper's v1 passive, home buildings spawning 10% faster, and it shows in the formation preview as the bigger squad | **Spore Burst:** 90 crush to every enemy unit within 2 tiles of a point. Strongest on the general's formation as it lands |
| **Armilla the Vast** | Capguard Hall, Rootbreaker Den, Puffball Mortar, Truffle Cellar, Hammercap Forge, Rhizome Vault | Capguard Hall, Truffle Cellar, Puffball Mortar | **Landholder** (new): Armilla's colony has 1 more plot, in the third rank, from battle 1 (§4.6). It replaces capture speed +25%: ground is plots now | **Rhizome Tithe** (new): +2 gold for each supply of enemy units killed so far in this clash, held as pending gold and paid at the next planning phase, or lost if the battle ends first (§14.4). Fire it late for more, but before the clash ends. It replaces +30 gold per column held past home |
| **Cordis the Puppeteer** | Burrow, Gill Nest, Scythecap Grove, Veilstalker Hollow, Tender's Ring, Truffle Cellar | Burrow, Gill Nest, Truffle Cellar | Knit time −50%; merge radius 2.0 (kept: Cordis's squads knit sooner and from farther apart) | **Puppet Bloom** (kept): every same-type trio within 3 tiles of a point merges at once, even in combat |

- **Cores and the core six.** A commander's core pool isn't limited to the six core archetypes: Vesper's and Armilla's bring the Rootbreaker Den and the Puffball Mortar, Armilla's the Rhizome Vault, and Cordis's the Scythecap Grove, the Veilstalker Hollow and Tender's Ring (§8.4).
- **Armilla's starter** holds one unit type plus the Mortar, which fields itself as an emplacement (§11.2).
- **v1's powers** (for the record): Spore Burst also hit buildings, with a 75 s cooldown, first ready at 0:45. Rhizome Tithe paid per column with a 75 s cooldown, first ready at 1:00; M5 reworked it from Rhizome Surge, which captured the frontier column in every lane (docs/archive/v1/m5-plan.md). Puppet Bloom had an 80 s cooldown, first ready at 1:00.

### 11.11 Generals' doctrine weights (Milestone 4)

These use the Velvet Bloom's building ids (`data/generals.json`); the Gray Rot equivalents replace them in M7. The general's passives are in §7.7. The opener is what the general buys in round 1's planning. Its kit in each battle (cards, copies and augments) is §7.8's, built from the opener and the preferred list below.

| General | Opener | Weights | Preferred blueprints (in order) |
|---|---|---|---|
| Old Mother Mold | Burrow, Burrow | Burrow 5, Capguard 1, Gill 2, Cellar 2, Scythecap 1, Mortar 0.5 | Cellar, Gill, Scythecap, Capguard, Mortar, Morel Warren |
| The Lichen Baron | Capguard, Cellar | Capguard 3, Mortar 3, Hammercap 2, Cellar 2, Rootbreaker 1, Gill 1 | Mortar, Hammercap, Gill, Rootbreaker, Amanita Lodge, Scythecap |
| The Blightwright | Rootbreaker, Cellar (M4 tuning: an archer opener won 93% of its run battles) | Rootbreaker 3, Gill 3, Capguard 2, Cellar 2, Burrow 1 | Capguard, Gill, Burrow, Hammercap, Mortar, Scythecap |
| The Pale Sovereign | Capguard, Gill, Cellar | Even weights over its kit; driven mostly by its dual doctrine | Burrow, Mortar, Scythecap, Rootbreaker, Hammercap, Veilstalker, Amanita Lodge, Morel Warren |

- **Weights pick kit cards** in the general's planning (§7.2). It can plant only what its kit holds, within its copies (§7.8). Until R3 there are no copies, and v1's `limits.*.maxOwned` apply (`data/generals.json`: 3 Truffle Cellars for every general, and 4 Puffball Mortars for the Lichen Baron).
- **A kit card its weights don't list** gets weight 1, as the rework's three buildings do today (`aiWeight`). **Open:** whether each general gets its own weights for the Burster Pod and the other v2 cards. First guess: no, they keep weight 1 until tuning says otherwise.
- **Counter sets** are §7.4's, chosen by damage type and tag (Open there: whether R1's clash matrix replaces them).

### 11.12 Gray Rot roster (Milestone 7)

The Gray Rot mirrors the Velvet Bloom's roles under its own names. Faction trait: units have **+10% HP and −10% speed**. Each Gray Rot unit MUST keep its role's body and damage type, so the shape language reads the same on both sides (§5.8). ★ marks the core six.

| Role | Gray Rot building → unit |
|---|---|
| Swarm ★ | Ashling Pit → Ashling |
| Shield ★ | Moldhusk Hall → Moldhusk |
| Archer ★ | Spitcap Nest → Spitcap |
| Heavy ★ | Lichen Bastion → Lichen Warden |
| Crusher ★ | Bonecap Smithy → Bonecap |
| Area ★ | **Open:** the Gray Rot's area archetype. First guess: a Gray Rot Burster (working name: Ashburst Sac → Ashburster) |
| Economy | Grub Larder |
| Siege | Gravemaw Den → Gravemaw |
| Cleave | Rotreaper Grove → Rotreaper |
| Slayer | Pallid Hollow → Pallid Stalker |
| Emplacement | Ashpuff Kiln |

**Open:** Gray Rot counterparts for the healer, fast swarm, tunneler and flyer roles, which v1's roster didn't have. First guess: M7 names them, one per role, each with its role's body and damage type.

### 11.13 Augments (first examples)

An **augment** is a draft card that changes how a building's units play (§1.3 #7). Augments replace upgrade tracks in R3 (§11.6). These are first examples, two for each core archetype, to tune.

- **The shape never lies, but a build can beat it.** An augment never changes a unit's body or weapon (§5.8). It may change the unit's numbers, what it targets, what happens when it hits or dies, and how its squad forms up. Five of the examples below can flip one of the matchups in §11.4. Each costs something real: a rare card, and a weakness the general can see and answer.
- **Where it attaches.** **Open:** to a building type or to one card (§1.3 #7). First guess: to the building type, for the rest of the run, so every copy's squad has it.
- **Every augment shows:** its icon on its card, on the building's tray card and on its squad in the formation preview, the general's included. In a clash the icon shows where and when the augment acts (§10.4).
- **Drafts** offer an augment only for a building in your kit (§8.3). The general's kit gains augments by battle index (§7.8).
- **Open:** how many augments one building type may hold (first guess: 2), and whether merged units keep their squad's augments (first guess: yes).

| Archetype | Augment | Rarity | What it does | Matchup it can flip, and its cost | Icon idea |
|---|---|---|---|---|---|
| Swarm | **Spore Pop** | U | Each Sporeling that dies leaves a spore cloud where it fell: 1.0 tile, 3 s, 8 a second, ignoring armor | – | a puff ring |
| Swarm | **Tough Caps** | R | Sporelings take ×0.6 damage from Slash; Sporeling HP ×0.85 | Sporelings beat Capguards at equal gold. Cost: weaker against Pierce and area, so Gill Archers and Bursters answer it | a dented cap |
| Shield | **Spore Shield** | R | Capguards take ×0.4 damage from projectiles (arrows, darts, shells); Capguard speed ×0.8 | Capguards beat Gill Archers. Cost: slower, and no help against melee, so Hammercaps and Amanita Knights answer it | a round spore shield |
| Shield | **Holdfast** | U | An enemy melee unit that comes within 1.5 tiles of a Capguard attacks Capguards first | – | an anchoring root |
| Archer | **Sticky Darts** | U | A Gill Archer's hit slows its target to ×0.6 speed for 2 s | – | a dripping dart |
| Archer | **Barbed Darts** | R | Each hit also strikes one more enemy unit within 1 tile of the target, for full damage; attack interval ×1.3 | Gill Archers beat Sporelings, with a shield in front. Cost: less damage against a lone heavy target | a forked dart |
| Heavy | **Red Charge** | U | Each Knight's first blow in a clash deals ×3 damage to every enemy unit within 1 tile of its target | – | a spotted horn |
| Heavy | **Spongy Cap** | R | Knights take ×0.6 damage from Crush, and ×1.25 from Slash and Pierce | Knights beat Hammercaps. Cost: archers now hurt them, so Gill Archers answer it | a sponge with holes |
| Crusher | **Shockwave** | R | Every third Hammercap blow also deals its damage to every enemy unit within 1 tile of the target; attack interval ×1.15 | Hammercaps beat Sporelings. Cost: slower against single targets, so Gill Archers answer it | a ring of cracks |
| Crusher | **Sunder** | U | A unit a Hammercap hits takes ×1.25 damage from every source for 4 s, shown as a crack on it | – | a split shell |
| Area | **Fuse** | U | Bursters wait behind your front rank until it makes contact, then roll | – | a lit fuse |
| Area | **Sporebloom** | U | A burst's cloud is 2.0 tiles for 6 s; the burst itself deals 30, not 40 | – | a big cloud |

Unlockable buildings get augments when they join the roster in R3 and later. Until R3, upgrade tracks stay as §11.6 says.

### 11.14 Combos (first examples)

A **combo** is a rule about position: two buildings planted in front of, behind or beside each other change what their squads do in the clash (§1.3 #7). These are first examples to tune.

- **Positions** (first guess), on the colony's plots:
  - **in front of:** the plot one rank nearer the enemy, in the same file;
  - **behind:** the plot one rank farther from the enemy, in the same file;
  - **beside:** the plot in the next file, in the same rank.

  A plot that touches only at a corner doesn't count, except with Mycorrhizal Link (§11.7). On Twin Roots a combo never crosses lanes.
- **A combo is active** while both buildings are planted, and it acts on the squads it names. Both sides make combos, and the general's colony shows its own (§7.3).
- **Each combo changes what happens,** never a small percentage per neighbor: the research found those below noise ([DR-7](docs/archive/v1/ideas/after-the-rework.md#what-not-to-do-again)). Keep them few.
- **It shows while placing:** the ghost lights the neighbor it would link with, and in planning the two buildings are joined by a hypha with the combo's icon (§10.4).
- **Open:** whether a combo stacks when a building has two partners. First guess: no; a squad gets each combo's effect once.

| Combo | Buildings and position | What changes | Icon idea |
|---|---|---|---|
| **Shield Wall** | Gill Archer Nest behind Capguard Hall | Its Gill Archers aren't pinned (§5.3), so melee that reaches them doesn't slow their fire | a shield over an arrow |
| **Spotted Screen** | Amanita Lodge in front of any spawner | Enemy ranged units shoot an Amanita Knight first while one is in their range | a spotted cap over an arrow |
| **Sundering Volley** | Gill Archer Nest behind Hammercap Forge | Its Gill Archers shoot the enemy unit the nearest Hammercap is fighting, when it's in range | a hammer and an arrow |
| **Hunting Pack** | Veilstalker Hollow beside Sporeling Burrow | Its Veilstalkers attack enemy units that are knitting first, and see them from 2 tiles farther. A hit breaks the knit (§5.6) | a pair of eyes |
| **Truffle Hunters** | Sporeling Burrow beside Truffle Cellar | Each of its Sporelings that dies drops 2 gold, held as pending gold and paid at the next planning phase (§14.4). A Cellar wants the back and a Burrow the front, so this costs a plot's best use | a coin |
| **Chain Burst** | Burster Pod beside Burster Pod | A burst sets off every one of your Bursters within 1.5 tiles, from either Pod: each bursts where it stands | linked puffs |
| **Anvil** | Puffball Mortar behind Capguard Hall | While a Capguard stands within 2 tiles of the Mortar, its minimum range is 0.5, not 1.5 | an anvil |

**Merging's own combo.** Two Sporeling Burrows beside each other field 16 Sporelings that knit together at the muster: enough for an Elder (§5.6). No extra rule makes this happen, but the formation preview shows it, as it does any merge (§10.2).

### 11.15 Run packs (first examples)

Each run's draft pool deals from the commander's core, the always-in set and **4 of 10 run packs** (§1.3 #8, §8.4). A **run pack** is one building plus two relics that suit it, so a run's engine parts arrive together. These are first examples to tune.

**The always-in set** is §8.4's, with the swarm's guaranteed answer. It isn't a pack.

The ten packs use every unlockable building once (the mastery buildings aside, §9) and every relic but the Sporestorm Sigil once. The Sigil belongs to no pack, so it's in every run's relic pool (§8.4):

| Pack | Building | Relics | The build it points at |
|---|---|---|---|
| **Brood** | Morel Warren | Knitting Circle, Spore Tithe | Cheap squads that knit fast and pay for each merge |
| **Elder Grove** | Rhizome Vault | Bloom Vigor, Elder's Patience | Squads fed bigger by the Vault, knitting into Elders that last |
| **Reaping** | Scythecap Grove | Spore Cloud, Martyr's Bloom | Area damage and deaths that burst: another answer to the swarm |
| **Bastion** | Puffball Mortar | Thick Caps, Rot Ward | A hard front rank with a Mortar behind it, and a Heartcap that takes less |
| **Vanguard** | Rootbreaker Den | Quick Roots, Forward Spores | Melee that crosses the gap fast into a softened front; siege counting double |
| **Deep Roots** | Rhizomorph Tunnel | Mycelial Web, Mycorrhizal Link | More plots, and combos that also link at corners |
| **Trade** | Spore Exchange | Fruiting Season, Deep Cellars | Banking and economy, for a later, bigger army |
| **Hunt** | Veilstalker Hollow | Rot-Eater, Fresh Spores | Answering the general's new buildings and Elders as they land |
| **Mending** | Tender's Ring | Mending Moss, Root Stipend | A Heartcap that holds through a long race |
| **Air** | Drift Stalk | Hardy Spores, Second Flush | Fragile flyers, kept alive and sold when the general answers them |

- **Overlap with a core:** a pack whose building is already in your commander's core still adds its relics (§8.4).
- **If the Puffball Mortar becomes the sixth archetype,** the Burster Pod takes its place in the Bastion pack (first guess).
- **Bans stay** as in v1 (§8.4).
- **The Air pack** waits for flyers (§1.3 #11). Until then the draw is 4 of the other 9 (first guess).
- **Open:** whether the general's extra blueprints come only from the run's packs and the always-in set. First guess: yes, so a run without the Air pack meets no enemy Driftlings (§7.8).

---

## 12. Balance method and targets

### 12.1 Principles

- **Playtests decide what's fun. Bots catch degenerate builds** (§1.3 #13). A playtest answers "is it fun?" and "can I read it?". The tools answer "is it degenerate?". A guardrail never overrules a playtest on fun, and a playtest never waives a guardrail on degeneracy.
- **A strong build isn't the bug. A build with no answer is.** That is the main bar, measured as the strict counter bar (G12, §12.3). Under rounds a committed build is in plain view after one clash, and the general's is in plain view before you plan (§7.5), so an answer can actually be played inside a battle.
- **Soft counters.** Matrix extremes stay within 0.5–1.5. No unit is useless against anything, and every unit has at least one favorable and one unfavorable matchup (§5.3).
- **The shape never lies, but a build can beat it** (§1.3 #7, §5.8). A unit's body and weapon never change, so its base matchups hold, and G2 measures them without augments or combos. Augments and combos MAY tilt a matchup far enough to flip it. Flipping one MUST cost real investment (copies, augments, plots), and the general sees it and answers (§7.4). A build that beats its counter this way is a success, as long as it still has an answer of its own (G12).
- **Author with the value heuristic** (§11.4), then calibrate with the tools below.
- **Rare broken runs are welcome. Forced ones are not.** Fixed copies (§8.10), the 4 of 10 run packs (§8.4), draft randomness and the general's adaptation keep any single engine from being reachable every run.
- **Measure the game as it is played.** Guardrails measure the round loop, not v1's live battle. A check tied to a retired system is retired with it or rewritten in round form (§12.3).
- **Report a miss; don't bend a rule to pass it.** A data tweak that fixes one guardrail is fine. A rule change, or a retune across several units, waits for the user's OK (§12.4).

### 12.2 Tools

These are defined in §15. Every tool is headless, deterministic and seeded, and writes a report.

**The clash check (milestone R1).** `npm run experiment -- --checks clash`, defined here and in §16's R1. It began as the clash prototype in the archived [rounds.md](docs/archive/v1/ideas/rounds.md) ("The smallest clash prototype"), which is background only (§0). It changes no rule. It fights single clashes on today's sim and sets squad sizes before the round loop is built (§16).
- **Armies from build lists:**
  - **The build list:** any bot spec the counter matrix uses (mono bots, the even pairs, `bot:balanced` and the hand-written answers). The army takes the bot's opener, then its weighted picks from its own stream, keyed by the seed and the bot, so an army is the same in either seat. A pick that doesn't fit the gold left is skipped and drawing goes on, until no card the bot can pick fits or the plots are full.
  - **The budget** counts army buildings only, since one clash can't value economy. Economy and utility cards are filtered out before any draw, so the mono builds are the army buildings, the Tender's Ring and the Puffball Mortar included.
  - **The army:** each spawner adds its squad (§4.4), starting from §11.2's Squad column, and `--squad-seconds` sets how many seconds of v1 production a squad is worth. A Puffball Mortar adds itself as an emplacement.
  - **Limits:** no more buildings than the colony holds: 8 plots on the one-lane maps and 6 per lane on Twin Roots, at every budget. A separate late-run reading adds the 4 plots sprawl can open, at 1,200 and 1,500 gold (§4.6). v2 has no supply cap (§5.4), so the report gives each army's supply and units, to check the full-colony budget of at most 150 live units a side (§13.7).
- **Formation:** by role, by §7.3's tags. A spawner whose unit has the `ranged`, `support` or `burst` tag, and every tower, takes a back-rank slot, 2 tiles behind; every other spawner takes a front-rank slot. Files fill centre-out, as §7.3 centres a partial army. Formation by plot needs §7.3's placement rule, so it's R2's, and G16 measures it. Units stand at §4.6's slot layout, which R1 builds as a pure function in `src/sim` for R2's `formationOf` to reuse (§16).
- **The fight:** both armies appear on the same tick, front ranks 6 tiles apart, on a flat field with the map's lanes and merging on. The clash opens with §5.6's muster: for 1 s nobody moves or attacks, and squads with merging on knit in place to a fixed point. The clash clock includes the muster. A lane's clash runs until it ends by §6.7's rule: one side has no units and no emplacements left in it, or 45 s pass. Two tool-only flags, absent in every battle, give the check §5.2's targeting and movement: siege units with no preference for buildings, and the idle seek toward the nearest enemy in the lane (§16).
- **Records:** each lane's winner, surviving supply, the Heartcap damage §6.7 would deal, clash length (the muster included), whether it hit the 45 s cap, and merges. Each army's `eliteShare` after the muster counts a merged unit at its parts' base supply, with and without the swarm read (§16).
- **The winner,** for G3 and G12: the side that won more lanes, then the side that dealt more uncapped Heartcap damage, else a draw worth half a win to each side. §6.7's capped round result and the share of drawn rounds are reported beside it.
- **Maps reduce to two fields.** Units ignore stumps, so Bogwater Hollow and Stumpfield give the same clash: one lane of 8 rows. Twin Roots is two lanes of 6 rows. Each building goes to the lane with fewer buildings of its line, and §7.3's round-1 rule runs as a variant (§16). Means over maps still average the three run maps, so the one-lane field counts twice. A three-lane screen runs outside the bars.
- **Budgets** (`--budgets`): 300, 600, 900, 1,200 and 1,500 gold of army, about rounds 1, 3, 5, 7 and 9. The report shows each budget beside the pooled result, so a build that dominates only early or only late shows up.
- **Seeds** vary the bots' picks and the jitter: 20 per seat for screens, and 50 for any number quoted, as G3 uses.
- **Jitter is a measurement option, not a game rule.** The game's formation has no randomness (§4.6), and by default the clash check's formation has none either. It MAY add a seeded jitter to where units stand, to see whether a result hangs on exact positions. As built, `--jitter j` moves each unit up to ±j tiles per axis after the muster, from a stream of its own for each seed and seat, so the armies don't change. The report says when jitter is on. Numbers are quoted at ±0.2 tiles, with the jitter-free run beside them. In R1's runs the two gave the same G3 and G12 verdicts, and pooled G3 means within 6 points.
- **Bars:** the strict counter bar (G12), G3 and clash stalls (G13), all on clashes.
- **Variants:**
  - today's combat with the two flags on (the baseline);
  - merging off, then only the Elder Sporeling's splash off;
  - squad sizes: squads worth 45, 60 and 75 s of production, and the Burrow's squad at 6 and 7;
  - the rework's kept pieces from `src/data/proto.ts`, alone and together: pinning, spore clouds, the Burster, cleave and the Rhizomorph (§1.3 #11). Alone they're the presets `pinned`, `sporecloud`, `burster`, `cleave` and `rhizomorph`; together they're `kept`, a preset R1 adds (§16). The ones that append spawners run G3 twice, with `bot:balanced` buying them and on its data weights;
  - the sixth archetype's candidates: the Burster Pod, and the Puffball Mortar as an emplacement (§11.2), each in a core-six check (§16);
  - copies: every card capped at 2, 3 and 4 buildings, beside unlimited (§8.10, §16);
  - a pace variant: each lane's army keeps its formation on the approach, at its slowest idle unit's pace (§5.2, §18.2 #12);
  - last, the rework's mixed-wave shield, to see whether mixed armies need it. At the arrival, each lane's army of at least `mixedWave.minTypes` unit types gives each of its units a shield of `shieldFrac` × its max HP. R1 lifts the requirement that `mixedWave` comes with `waves`, for the clash check (§16).
- **The race model:** a section of the report chains the clash records into battles of rounds, to show how long battles would last under §6.7's cap and its alternatives (§16). It informs the scoring-curve call at R1's review and isn't a guardrail.
- **Not `rework`.** `?proto=rework` is v1's P3 package: waves with `matchPace`, mixed-wave shields, call for help, storm-grown waves, flyers, the swarm read and the Elder's splash off, without spore clouds or cleave. It isn't R1's variant.
- **Each distinct clash is played once.** Armies are built in the main thread and sent to the workers as clash jobs (`tools/lib/pool.ts`), and cells that would play the same clash share one (A007). Without jitter a mono's army is the same on every seed, so the jitter-free baseline plays 70,698 clashes for its 169,000 cells.
- **Measured cost** (R1, 2026-11-02; 6 workers on a 12-core laptop doing other work too): about 4 ms of a worker per clash, the army building included, against the 10–30 ms first estimated. The 50-seed baseline with the full matrix and the merge mirror played 299,150 clashes for 362,200 cells in about 3 minutes, the jitter-free run 47 s, and a 20-seed screen about 70 s.
- **What it settles:** squad sizes, whether mixed armies need the shield, the Elder Sporeling's splash, how an emplacement counts, and the most a full colony fields, with a measure for each other §18.2 row settled by R1 (#11–#15, listed in §16), and the evidence for two calls at its review: copies before R3 (§8.10) and the scoring curve (§6.7). A bench case, one clash of two full colonies, comes with it (§15.4). **Open:** each of those is R1's result, and the user decides what to adopt (§16).

**The round loop.** The clash check can't judge the economy, the general's planning or the counter cycle. Those need whole battles of rounds.
- [rounds.md](docs/archive/v1/ideas/rounds.md) suggests chaining clashes in the same tool next, with gold by round and one of two planning policies: fixed weights, or "buy the answer to what you saw". In v2 the round loop is R2's work instead (§16), so the clash check stays a check of single clashes.
- **From R2,** the round loop is the sim itself (§4.7). `npm run sim` plays battles of rounds and whole runs with lives, and every tool below measures the real loop.
- **How bots plan.** A strategy bot plans by its fixed weights and doesn't read the general's army (§7.1), which is what G3 and G12 need. [rounds.md](docs/archive/v1/ideas/rounds.md)'s second policy, "buy the answer to what you saw", MAY be added to the tools as a planning policy. **Open:** whether to add it, and whether the run guardrails (G14, G15) use it. The information edge is the player's by design (§1.3 #3), so a bot that ignores it understates the player.

**The tools that persist,** rewritten in round form by R2:
- `npm run balance -- duel`: two kinds of duels.
  - **Squad duels** (G1): equal gold spent on a single building type per side, fielded as squads in formation by role and fought as one clash. Until R2, v1's production duels (3 minutes of production on a flat test map with no Heartcap turrets and no territory) run in their place.
  - **Supply duels** (G2): 12 supply of unit A against 12 supply of unit B, fought to the death.

  The outputs are win-rate and remaining-value matrices.
- `npm run balance -- tournament`: the strategy bots (`bot:balanced`, `bot:rush`, `bot:turtle` and `bot:greedy`) against the scripted general (§7.9) on Bogwater Hollow over seeds. It gives a win-rate table, the median rounds per battle, the share of battles that reach round 9 (and so end by Decision), the share of clashes that reach the 45 s cap, the median clash length, and how often the lead in the Heartcap race changes hands. v1's front-line volatility is retired with territory. `tournament --commanders all` plays whole runs per commander: lives lost, battle-1 results, boss reach and boss fights won.
- `npm run experiment -- --proto <spec> --checks …`: measures a prototype (§12.4) against the guardrails and the opt-in checks: `counters` (the counter matrix, G12), `engagement` (pacing), `runs` (how runs end) and, from R1, `clash`. R2 rewrites `engagement` in round terms (clash length, round damage, comebacks), retires `lanes` (per-lane border traces, tied to territory) and rewrites `spread` (placement spread) as the formation check (G16).
- **The counter matrix** (`--checks counters`, `evaluateCounters` in `tools/lib/balance.ts`). Each build under test plays a field of answers on every run-pool map in both seats: every other mono bot, every even pair of army buildings, `bot:balanced`, the hand-written counter bots and the other data bots. A screen at 10 seeds per seat ranks the answers, and each build's top answers are confirmed on fresh seeds (50 per seat). From R1 it has a clash row beside its battle row, and from R2 its games are battles of rounds.
- **Reports** are written to `reports/balance/<timestamp>-<mode>.md` plus `.json`, and experiments to `reports/experiments/<label>.json`. The `reports/` folder is git-ignored. Measurements worth keeping go in `docs/balance-backlog.md` (v2's; v1's is archived).

### 12.3 Guardrails

These run as the slow test suite, `npm run test:slow`. Their thresholds live in `data/balance-targets.json`, so they're tunable too.

**v1's guardrails keep running on v1 code until R2 replaces them.** Until R2 lands, `test:slow` runs G1–G8 and G11 as the [v1 spec](https://github.com/Swalliso/Sambattler/blob/aa37365/SPEC.md) defines them, against v1's live battle. R1's clash check reports G3, G12 and G13 on clashes, outside the suite. R2 retires the v1 forms with the code they test, puts the round forms below into the suite, and moves their thresholds in `data/balance-targets.json` in the same change (§1.3 #13).

A guardrail keeps its number where its check persists in round form. New ones take G12 onward.

| # | Guardrail | In v2 | From |
|---|---|---|---|
| G1 | Squad duels: equal gold on a single building type per side, fought as one clash. No building wins more than 80% of its pairings; every building wins at least one pairing and loses at least one clearly (the opponent keeps ≥ 30% more remaining value) | **Rewritten:** v1's 3-minute production duels become clashes of squads | M1; round form R2 |
| G2 | Supply duels (12 supply each, 5 seeds) form a healthy counter graph: every unit type beats at least one other type and loses to at least one in ≥ 4 of 5 seeds. The report also checks the intended edges: M1 per §11.4; M2 adds Scythecap > Sporeling and Veilstalker > Bloomed Capguard; M4 adds Hammercap > Amanita Knight and Amanita Knight > Gill Archer. Units fight without augments or combos: these are the shape's matchups (§5.8). R3 adds the intended edges of any core archetype not yet covered (§11.2) | **Kept** | M1, extended each milestone |
| G3 | Every `bot:mono:<buildingId>` bot plays `bot:balanced` on every map in the run pool (the §11.9 maps shipped so far, never test maps; a new map joins when it ships), 50 seeds per seat: 100 games per map (honest, symmetric). A bot passes if its mean win rate over those maps is ≤ 55% and its worst map ≤ 60%. R1 measures it on clashes, pooled over the five budgets (§12.2); from R2 the games are battles of rounds. It stays beside G12: G12 says every build has an answer, and G3 says a mixed army holds up against committed builds | **Kept**, in round form | M1; rewritten after step A (2026-10-30); round form R1–R2 |
| G4 | Rounds per battle: `bot:balanced` against the scripted general (§7.9) on Bogwater Hollow over 40 seeds. Median 6–8 rounds; ≤ 15% of battles reach round 9; the bot wins 30–70% | **Rewritten:** v1's band of a 5:30–8:30 median length and ≤ 15% Decisions can't be read under rounds, because planning isn't on the clock | M1; round form R2 |
| G5 | Snowball: a side given +150 starting gold wins 55–75% of battles | **Kept**, in round form | M1; round form R2 |
| G6 | Comeback: starting round 4 from a scenario in which the behind side lost rounds 1–3 (its Heartcap 700 below full, with equal colonies and gold), the behind side still wins ≥ 20%. And in G4's games, the winner's Heartcap takes damage in at least half of the battles | **Rewritten:** v1's scenario, a 6-column deficit at 3:00, went with territory | M1; round form R2 |
| G7 | Merging: in a merge-on vs merge-off mirror, merge-on wins 55–70%. Against an opponent fielding 25% of its supply as Slayers, merge-on wins ≤ 50%. R1 also measures the Elder Sporeling's splash (§1.3 #11) | **Kept**, in round form (v1 read a 25% Slayer spawn share) | M2; round form R2 |
| G8 | Adaptation: every mono bot's win rate drops by ≥ 20 points against the adaptive general compared with the same general with adaptation off. `bot:balanced` wins 40–65% against the adaptive general at battle index 1. Under rounds the general reads the squads you fielded and answers with new buildings in its colony (§7.4) | **Kept**, in round form | M4; round form R2 |
| G9 | Meta ceiling: a full 12-capacity trait loadout raises `bot:balanced`'s win rate by ≤ 15 points | **Kept** | M6 |
| G10 | Blights: Decay 6 lowers `bot:balanced`'s run win rate by 25–50 points against Decay 0 | **Kept** | M7 |
| G11 | Performance budgets (§13.7). From R1 the bench includes a clash between two full colonies, and R2 adds the clash's first tick, the planning command and the general's planning turn (§15.4) | **Kept**, extended | M1 |
| G12 | **The strict counter bar, the main bar.** Every mono build whose G3 mean is above 40% has an answer that wins ≥ 60% on every map in the run pool; an answer that fails G3 itself doesn't count. R1 reads it on clashes, pooled over the five budgets; from R2 the games are battles of rounds. From R3 the builds under test include the augment and combo builds the bots can draft (§11.13, §11.14), so a build that flips a matchup passes only if it still has an answer | **New** (the counter matrix of 2026-10-30, made a guardrail) | R1 (report); R2 (suite) |
| G13 | Clash stalls: ≤ 15% of clashes reach the 45 s cap (§6.7). The report also gives the median clash length against the 20–40 s target. R1 reads it over the clash check's clashes; from R2, over G4's games | **New** (the round form of v1 G4's Decision limit) | R1 (report); R2 (suite) |
| G14 | Battle 1: the run bot (`bot:balanced`, greedy drafts, the auto power policy) wins 70–90% of battle 1s for each commander, over 100 runs per commander. A lost battle costs a life, not the run (§8.5), so battle 1 can bite without ending runs | **New** | R2 |
| G15 | The boss: in the same runs, at least 40% reach the boss, and the bot wins 40–70% of its boss fights | **New** | R2 |
| G16 | Formation: a colony planted by the formation rule (melee in front, ranged and area behind, economy at the back, §7.3) beats the same colony with its front and back ranks swapped in ≥ 60% of clashes, pooled over the clash check's budgets and the even pairs of army buildings. Placement must matter (§1 pillar 2, §4.6) | **New** (the round form of the placement-spread measurement) | R2 |

**Retired v1 forms.** No guardrail number is retired outright. These parts go with their systems (Appendix A):
- G1's 3-minute production duels (spawn timers);
- G4's length band in minutes and its Decision share at 10:00 (the 10:00 Decision);
- G6's column-deficit scenario `comeback-6` (territory);
- G7's Slayer spawn share (spawn timers);
- G3's and G8's games as live battles, the `lanes` traces, and the placement spread in seconds of live battle.

**Open:** the bands of G6's second clause and of G14–G16 are first guesses, and so is G6's 700-HP deficit. R2's first full measurement and its playtest set them.

**Open:** what "mono" means once copies apply (R3, §8.10). Copies make massing one card impossible by construction (§1.3 #5), so G3's and G12's mono bots need a rule for how many copies of their card they hold.

**Why G12 is the main bar.** Under rounds, a committed build can be answered in the next round: the general's army is in plain view before you plan, and yours is in plain view to the general after one clash. A mono build can't change without leaving mono, and a fixed-weight reference bot can't make the answer either, so G3 measures the worst case. The counter matrix's answers are ones a player, or the general, can actually plant within a battle. On 2026-10-30 every strong mono build had an answer on every map except mono Sporeling, which failed the strict bar under every variant measured, always on Twin Roots ([docs/archive/v1/balance-backlog.md](docs/archive/v1/balance-backlog.md), "The counter matrix, against the strict bar"). At equal gold a clash favors the swarm, so R1 reads mono Sporeling first ([rounds.md](docs/archive/v1/ideas/rounds.md), "Today's strong builds under rounds").

**Why G3 measures every map.** Until step A, G3 required every mono bot to win ≤ 55% on Bogwater Hollow alone, with 40 games. That missed mono Sporeling's real rate (about 75% over 100 games; the 40-game check read 65%) and every failure that only shows on another map, such as mono Amanita on Twin Roots. Each map's rate is measured to about ±5 points, so the worst of three maps reads high on noise alone; the worst-map limit is 5 points above the mean's to allow for that. The mean catches a bot that is a little too strong everywhere, and the worst map catches one that dominates a single map.

**Why G6, G14 and G15 are new in kind.** v1's Heartcap was all or nothing: the winner's Heartcap was almost never hit, and 92% of battles started at full HP ([docs/archive/v1/ideas/after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md)). Under v2 each battle is a Heartcap race (§6.5), and the per-round damage cap is where comebacks come from. These checks make sure the race is a race, that battle 1 threatens a life without deciding the run, and that the boss is the run's hardest test.

### 12.4 Tuning workflow

1. Edit the data. A rule experiment starts as a default-off knob in `src/data/proto.ts`, measured with `npm run experiment -- --proto <spec>` and playable with `?proto=<spec>`. Rounds themselves are not a knob (§1.3 #13).
2. Run the narrowest check that reads the change: from R1, `npm run experiment -- --checks clash` for anything a single clash can show; then `npm run balance -- duel` and `npm run balance -- tournament --seeds 40`.
3. Read the report diff.
4. Run `npm run test:slow`.
5. If the change moves the golden hashes, run `npm run golden -- update` and say so in the commit message and the PR (§15.5).
6. Playtest. An adopted rule goes to `develop` for a dev-site playtest.
7. Record notable changes in `data/CHANGELOG-balance.md`, newest first: what changed, the guardrail or measurement behind it, and whether the user approved it. Open misses and candidate fixes go in `docs/balance-backlog.md`.

**Who decides.** Diagnosing, measuring and recommending need no approval, and neither does a data tweak that fixes one guardrail. A rule change (anything that changes a rule in this spec), a retune across several units, and adopting a prototype wait for the user's OK. Report a guardrail miss with its numbers instead of bending a core rule to pass it.

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
- **`src/run` and `src/meta`** are pure too. Persistence is injected through a `Storage` interface. `src/meta` starts with Run it back's records-1, whose `records.ts` keeps the profile record (§9.7, §16 M6), and M6 adds the rest of the profile.
- **`src/render` and `src/ui`** read sim state but never mutate it. They consume per-tick events, and in planning the events of each command.
- **One rule, one place.** Whatever the planning screen shows about the coming clash comes from the sim's own functions, never from a copy of the rule in `render` or `ui`. The formation preview calls the same formation function the clash's arrival uses (§13.4, §14.6), and prices, refunds, copies, merge previews and combos come from the sim too.
- **`src/audio`** uses `Math.random` and WebAudio, so it sits outside the pure layers and imports nothing but data types (§13.9).
- **Enforcement:** ESLint rules (`no-restricted-imports`, `no-restricted-globals`, `no-restricted-properties`) scoped by directory, plus a unit test that scans import graphs.

### 13.3 Determinism rules for `src/sim`

1. **Fixed timestep.** In a clash, `step(state)` advances exactly one tick and takes no time delta. Planning has no ticks: there, `step` only runs the queued commands. In the aftermath, `step` opens the next round, or ends the battle after its last round. §14.6 gives the order within each.
2. **Seeded randomness only.** The PRNG is sfc32. Each stream is seeded through splitmix32 from `hash32(runSeed, streamName, battleIndex)`, and stream state lives in the sim state.
   - Streams: `combat` (randomness in a clash), `ai`, `draft`, `route`, `events`, `meta`.
   - Streams are separate so that variance in one system never shifts another's sequence. For example, combat outcomes don't change which draft offers come next.
   - **The formation draws on no stream.** `formationOf` is a pure function of the colony: its plots, buildings, squad sizes and merge toggles (§4.6). Where a squad's units stand when they arrive is fixed by §4.6's layout, so recomputing the preview never moves a stream. R1's clash check MAY add a seeded jitter to arrival positions as a measurement option of its own; it isn't a game rule (§12.2, §16).
3. **Restricted math.** Allowed: `+ − × ÷`, `Math.sqrt`, `floor`/`ceil`/`round`/`trunc`/`abs`/`min`/`max`/`sign`/`imul`, and integer bit ops. **Banned:** `Math.sin`/`cos`/`tan`/`atan2`/`exp`/`log`/`pow`/`hypot`/`random` and `**` with non-integer exponents. These aren't guaranteed bit-identical across JavaScript engines. Directions use normalized vectors; if angles are ever needed, use lookup tables.
4. **Ordered iteration.** Entities live in arrays sorted by id. Every sort comparator ends with an id comparison. Never base a gameplay decision on object-key order. Plots are ordered by lane, then rank, then file.
5. **Number types.** HP, gold, timers, supply and Heartcap damage are integers. Only positions and velocities are floats. A round's Heartcap damage is integer at every step, in §6.7's order: the Sporestorm's multiplier and the loser's damage-taken modifiers are basis points (10000 = ×1.0), each product is floored, and the 500 cap comes last (§6.4, §6.7).
6. **No wall clock.** Speed and pause exist only in the app loop. Planning is untimed: nothing in the sim measures how long the player plans, and the aftermath's animation isn't simulated.
7. **Commands are the only input.** Every input is a stamped command, and AI commands go through the same queue.
   - A **planning command** carries its round and executes when it's queued, in the order queued. The general's commands for a round run when the round opens, before the player can queue any (§4.7, §7.2), so its plan never depends on the player's.
   - A **clash command** (the commander power) carries a tick and executes on that tick.
   - Replaying a battle's log with the same seed reproduces every round: the general's plans, every clash and every rejection.
8. **Plain data.** State is JSON-serializable: no class instances with hidden fields and no closures. That makes snapshotting, hashing, diffing and resuming trivial.
9. **Hashing.** `hashState` is FNV-1a 64 (two 32-bit lanes) over a canonical traversal in fixed field order. Floats are hashed through a `Float64Array` byte view, so the hash is bit-exact.

### 13.4 Module layout

The tree is the code as built under v1 (Milestones 1–5 and the combat rework's prototypes), with v2's changes marked. Names of new modules are proposals: the milestone that adds a module MAY rename it, and this section follows the code.

```
/
├─ SPEC.md
├─ index.html
├─ package.json            # scripts in §15.1
├─ tsconfig.json  vite.config.ts  vitest.config.ts  eslint.config.js
├─ .github/workflows/deploy.yml, ci.yml
├─ public/og-image.png     # the link-preview image (§13.8)
├─ data/                   # ALL tunable content (JSON), validated by zod
│  ├─ balance.json  balance-targets.json  CHANGELOG-balance.md
│  ├─ factions/velvet-bloom/{faction,buildings,units}.json      buildings gain squads and archetypes (R2, R3)
│  ├─ factions/velvet-bloom/strains.json                        (M6)
│  ├─ factions/gray-rot/faction.json                            its own buildings and units in M7
│  ├─ maps/<map-id>.json                                        colonies with plots, loam and stump plots (R2)
│  ├─ commanders.json  generals.json  relics.json  events.json  elites.json
│  ├─ upgrades.json                                             retired in R3: tracks become augments
│  ├─ augments.json  combos.json  packs.json                    (new in R3)
│  ├─ traits.json  feats.json  mastery.json  blights.json       (M6, M7)
│  ├─ bots.json                       # strategy bot definitions (§7.1)
│  ├─ scenarios/<scenario-id>.json    # fixed setups for tests and screenshots
│  ├─ sounds.json                     # synthesized sounds as parameters (§13.9)
│  └─ sprites/<sheet>.json            # text-defined pixel sprites (buildings, frame, heartcap, run, terrain, ui, units)
├─ src/
│  ├─ data/        schema.ts (zod)  registry.ts (load + index + cross-ref check)  proto.ts (`?proto=` presets)
│  ├─ sim/         index.ts (public API)  state.ts (types)  create.ts  compile.ts  effects.ts (modifier DSL)
│  │               commands.ts  step.ts  rng.ts  hash.ts  snapshot.ts  headless.ts  stats.ts  summary.ts
│  │               world.ts  spatial.ts (uniform grid spatial hash)  targets.ts  hits.ts
│  │               draft.ts  powers.ts  placement.ts
│  │               formation.ts                                                   (new in R1, extended in R2)
│  │               round.ts  planning.ts  kit.ts                                  (new in R2)
│  │               combos.ts                                                      (new in R3)
│  │  ├─ systems/  merging.ts  healing.ts  clouds.ts
│  │  │            combat.ts  targeting.ts  movement.ts                           (v1 parts removed in R2)
│  │  │            economy.ts  victory.ts                                         (rewritten in R2)
│  │  │            clash.ts                                                       (new in R2)
│  │  │            spawning.ts  territory.ts  stance.ts                           (retired in R2)
│  │  └─ ai/       controller.ts  counter.ts                                      (rewritten in R2)
│  │               profiles.ts  draftPolicy.ts
│  ├─ run/         flow.ts  runState.ts  route.ts  rewards.ts  intel.ts  resume.ts  storage.ts  auto.ts  scenes.ts  index.ts
│  │               packs.ts                                                       (new in R3)
│  ├─ meta/        records.ts  index.ts                                           (new in records-1)
│  │               profile.ts  feats.ts  traits.ts  strains.ts  mastery.ts  blights.ts  migrations.ts   (M6)
│  ├─ render/      atlas.ts (bake text sprites)  renderer.ts  effects.ts  frame.ts  spores.ts  pixelText.ts  assistPreview.ts
│  ├─ audio/       engine.ts (WebAudio graph, ambient bed)  synth.ts (layers to nodes)  limits.ts (voice cap, cooldowns)
│  ├─ ui/          h.ts  hud/{top,tray,kit,explain}.ts  screens/{title,run,underroot}.ts  callouts.ts  inspect.ts
│  │               draftOverlay.ts  report.ts  cards.ts  buildingInfo.ts  doctrine.ts  matrixHints.ts  mergeHints.ts
│  │               words.ts  help.ts  tooltip.ts  icons.ts  motion.ts  scale.ts  settingsScreen.ts  soundControls.ts
│  │               styles.css  fonts/
│  └─ app/         main.ts  loop.ts  input.ts  session.ts  battleView.ts  run.ts  content.ts  channel.ts
│                  settings.ts  tips.ts  urlParams.ts  debugBridge.ts (window.__GAME__)  sound.ts  battleSound.ts  soundBoard.ts
├─ tools/          sim.ts  balance.ts  bench.ts  experiment.ts  golden.ts  screenshot.ts  og-image.ts  validate-data.ts  verify.ts  lib/
├─ tests/
│  ├─ unit/**      # fast suite (npm test)
│  ├─ slow/**      # guardrails, multi-seed sims (npm run test:slow)
│  ├─ browser/**   # Playwright checks (npm run test:browser)
│  └─ golden/      # *.replay.json + expected hashes
├─ artifacts/      # screenshots, sim outputs (git-ignored)
└─ reports/        # balance reports (git-ignored)
```

**What v2 changes in `src/sim`.** Milestone R1 adds the slot layout and the muster's knitting for the clash check, R2 builds rounds and removes v1's battle systems from the code, and R3 adds the kit's augments and combos (§16). This table is the plan, checked against the tree above and the code. It began as the cost estimate in the archived `docs/archive/v1/ideas/rounds.md` ("The cost"), which is background only (§0).

| Change | Files | What happens |
|---|---|---|
| **Retired** (R2) | `systems/spawning.ts`, `systems/territory.ts`, `systems/stance.ts` | Spawn timers and waves, column capture and frontiers, and Hold / Advance go (Appendix A). Squads are fielded fresh each round instead |
| **Retired** (R2), inside files that stay | `world.ts`, `placement.ts`, `powers.ts`, `data/proto.ts` | Besieged spawners and suppression; the forward price; the column powers (`surge`, and `tithe`'s gold per column); the `?proto=` presets whose systems retire or that R1 doesn't keep, such as the mixed-wave preset, with their schema keys and tests (§16's R2 lists them). R1's chosen set of the rework's pieces (pinning, spore clouds, cleave, the Burster and the Rhizomorph, as R1 decides) moves from presets into the data (§1.3 #11, §11.1, §11.2) |
| **Kept, with v1 parts removed** (R2) | `systems/movement.ts`, `systems/targeting.ts`, `systems/combat.ts` | **Movement** loses Hold and waves (with its imports from `spawning.ts` and `stance.ts`), rush, fall-back and dive, and the Rhizomorph's surfacing at spawners and its check for Heartcap turrets. **Targeting** loses buildings and Heartcaps as targets (emplacements stay targets, §6.7), call for help, and dive's preference for ranged units. **Combat** loses Heartcap turrets and damage to buildings and the Heartcap; siege's ×2 stays, against emplacements (§11.1). What stays follows §5.2 and §5.3 |
| **Rewritten** (R2) | `step.ts` | The step by phase: planning, clash and aftermath (§14.6) |
| **Rewritten** (R2) | `systems/economy.ts` | Income once a round, at the round's opening: the stipend, economy buildings with the loam bonus, interest on the gold banked at the end of planning, comeback gold (§6.2), and gold a clash left pending (`pendingGold`, §14.4) |
| **Rewritten** (R2) | `systems/victory.ts` | The Heartcap race: a Heartcap at 0, or a Decision on damage dealt after round 9 (§6.5) |
| **Rewritten** (R2) | `ai/controller.ts` | The general's planning turn, after income and the Sporestorm in the round's opening (§4.7): any due doctrine or counter change, selling for room if a counter needs it, buying from its kit, planting by its formation rule and picking a lane per building, then its merge toggles (§7.2, §7.3) |
| **Rewritten** (R2) | `ai/counter.ts` | The counter cycle on a schedule in rounds, reading the squads the player actually fielded (§7.4) |
| **Reworked** (R2) | `draft.ts`, `powers.ts`, `placement.ts` | Drafts open in the planning phases after rounds 2, 4 and 6 (§8.3); the power fires once per clash, from the clash's first tick (§6.6); placing is on plots, with no columns (§4.6) |
| **Extended** (R2) | `state.ts`, `create.ts`, `compile.ts`, `commands.ts`, `index.ts`, `src/data/schema.ts` | Phases, rounds and round results with the fielded record, plots, squads, per-battle Heartcaps, pending gold, the kit's cards, and commands per planning phase (§14). Copies join the kit in R3 |
| **New** (R2) | `round.ts` | A round's phases: opening a round in §4.7's order, Begin, scoring a finished clash, round results |
| **New** (R2) | `planning.ts` | The planning commands `plant`, `sell`, `toggleMerge` and `beginClash` (§14.5), with their checks, prices and refunds |
| **New** (R2) | `systems/clash.ts` | The muster that opens a clash (§5.6), on `formation.ts`'s knitting, and how a lane's clash ends: one side has no units and no emplacements left, or the 45 s cap decides on surviving supply (§6.7) |
| **New** (R1; extended in R2) | `formation.ts` | R1: the formation box, its slots and the units' places in each slot (§4.6), and the muster's knitting in place to a fixed point (§5.6), as pure functions for the clash check: `formationBox`, `slotGrid`, `slotPositions`, `emplacementPosition` and `overflows` for the layout, `findTrios` and `musterKnits` for the muster. R2: plots to the formation box and each squad's slot, `formationOf` and both sides' merge previews (`mergePreview`) on them, and the arrival. Pure functions with no random stream (§13.3). The clash, the planning preview and the general all use them |
| **New** (R2; copies R3) | `kit.ts` | Kit cards: what is free to plant, and what selling returns (§8.10). In R2 a card has no copy limit and plots are the build limit; R3 adds copies and augments (§11.13) |
| **New** (R3) | `combos.ts` | Combos: which planted neighbors link (in front of, behind, beside), resolved per squad when a clash begins (§11.14) |
| **Carries over** | `systems/merging.ts`, `healing.ts`, `clouds.ts`; `hits.ts`, `targets.ts`, `spatial.ts`, `effects.ts`, `rng.ts`, `hash.ts` | Unchanged |

**Outside `src/sim`:**
- **`src/run`** (R2): `runState.ts` and `flow.ts` swap the run's Heartcap for lives, keep the kit (its copies from R3) and the plot count, and turn the Grove's repair into regaining a life (§8.5, §8.7). `resume.ts` saves between rounds (§8.9, §13.8), and its `loadRun` handles runs saved before R2 as §8.9 decides, where today it returns null on a version mismatch. `intel.ts` builds the profile from the squads fielded (§7.6). R3 adds `packs.ts`, which deals each run's 4 of 10 packs (§8.4).
- **`src/render`** (R2, R4): the territory layer goes; the plot grid, the formation preview and the aftermath come in R2; pips and augment icons replace `TIER_SCALE` in R4 (§13.6).
- **`src/ui` and `src/app`** (R2): the battle screen's three views, the round tally, the lane tug, lives, the kit tray (its copies from R3) and the draft in planning (§10.2). The Hold / Advance controls, the territory tug and the spawn-timer setting go.
- **`src/data`** (R1, R2): R1 adds the `kept` preset and the clash check's default-off knobs to `proto.ts`. R2 moves R1's chosen pieces into the data and deletes the presets of retired systems, with their keys in `schema.ts` (§16).
- **`index.html`** (R2): its `description`, `og:description` and `twitter:description` describe the round-based game (§13.8). The text stays as it is until R2.
- **`tools` and `tests`** (R1, R2): R1 adds the clash check (§12.2, §15). R2 regenerates every golden and removes the tests and guardrails of retired systems (§1.3 #13, §15).

### 13.5 Game loop (browser), by phase

The loop treats each phase of a round differently (§4.2, §4.7). The constant is the step: 50 ms of sim time, 20 ticks a second.

- **Planning: no ticks.**
  - Commands from input execute as soon as they're queued: the loop calls `step()` once when the queue isn't empty, as v1's deploy phase did. The sim clock doesn't move.
  - Render every frame with `alpha = 1`. The ambient spores drift at 1× (§10.2).
  - The formation preview is recomputed only when a command changes the colony or a merge toggle, never per frame.
  - A draft that opens in planning (§8.3) needs no hold, because planning has no clock. The overlay waits for the pick, and the clash can't begin until the draft is picked or skipped (§14.5).
- **Clash: 20 Hz with interpolation.**
  1. Each `requestAnimationFrame`: `accumulator += min(realDt, 250 ms) × speed`.
  2. While `accumulator ≥ 50 ms` and the clash isn't paused: `step()`, then `accumulator −= 50 ms`. At most 12 steps run in one frame; past that, the accumulator resets.
  3. Render with `alpha = accumulator / 50 ms`, interpolating each unit between its previous and current positions.

  A clash command (the power) is queued with `tick = state.tick + 1`. Pause and speed (1×, 2×, 3×) apply only here, and a pause never carries into the next clash (§10.2).
- **Aftermath: render only.**
  - The clash's last tick has already scored the round (§6.7, §14.6). The loop runs no steps while the view plays the aftermath from the round's result in state: about 3 s at 1×, shorter at 2× and 3×, skipped by `Space`, `Enter` or a click, and instant under `?test=1` (§10.2).
  - When the animation ends (or is skipped), the loop calls `step()` once. That opens the next round in §4.7's order, which ends in planning. After the battle's last round, which has an aftermath like any other, that step ends the battle instead (`battleEnded`, §6.5), and the report follows (§10.5).

Headless tools call `step()` in a tight loop with no rendering. A bot playing the player's side plans and begins inside the planning step (§14.6), so `runHeadless` plays a whole battle with no input.

### 13.6 Rendering

- **Atlas:** at startup, bake every text sprite (§14.3) into an atlas using a simple shelf packer, on an `OffscreenCanvas` where available. Faction palette swaps are baked as separate regions.
- **Layers, back to front:**
  1. terrain (pre-rendered offscreen, redrawn only when the map or the layout changes)
  2. the colonies: each side's mycelium under its colony, with the plot grid, loam plots and stumps in planning (§4.6, §10.4)
  3. buildings, with combo hyphae between linked buildings in planning (§11.14)
  4. in planning, the formation preview; in a clash, merge tethers and knit glow, then units, sorted by y and then id
  5. projectiles, spore clouds, bursts and sparks
  6. labels: merge pops, damage numbers and coin pops
  7. overlays: the placement ghost and its combo links, matchup marks, ranges, debug

  v1's territory tint and capture progress layer is retired with territory (Appendix A).
- **The shape language** (§5.8, §10.4) is drawn from data, so the renderer holds no per-unit art rules:
  - **Body size shows armor.** A unit's sprite is drawn at its own size whatever its merge tier. v1's `TIER_SCALE` in `src/render/renderer.ts` (×1.25 for Bloomed, ×1.5 for Elder) goes in R4a, so size means armor and nothing else.
  - **No weapon mark:** nothing is baked over a unit's frame (§5.8, 2026-11-01).
  - **Pips** mark merge tiers: one for Bloomed, two for Elder, drawn over the unit from the `ui` sheet. An Elder's gold rim is a region of its own, baked per frame and drawn under the sprite.
  - **Augment icons** come from the `ui` sheet by the augment's `icon` (§14.2). They show on a squad's slot in the formation preview, the general's included, and flash where an augment acts in a clash. A unit in a clash carries no standing icon (§10.4).
  - **Combo highlights:** while placing, the ghost lights each neighbor it would link with, with the combo's icon. In planning, linked buildings are joined by a hypha with the icon at its middle. In a clash, a combo shows its icon when it acts.
  - Team color, hit-spark tints and the color-blind assist's team marks stay as they are (§10.4).
- **The formation preview** (planning only):
  - It draws each squad as its units, dimmed, inside a faint outline of its slot, for both sides, at the positions `formationOf` returns (§14.6). Those are the positions the clash's arrival uses, and no random stream moves them (§13.3), so the squads appear where the player saw them.
  - It shows each squad's merge preview (pips, then the count of base units left over), from `mergePreview`, which is the muster's own knitting rule (§5.6), and its augment icons.
  - It's recomputed when the colony or a merge toggle changes, and cached between changes.
- **The aftermath** is drawn from the round's result in state, not simulated: the winners' surge toward the loser's Heartcap, its burst of spores, the bar's drain and the number over the Heartcap (§10.2). Under reduced motion it's a fade of 120 ms or less.
- **Animation:** 2-frame walk cycles at 4 fps, an attack frame on attack events, 2-frame idle for buildings, and a spore puff when a unit arrives at the clash and when it dies.
- **Coin pops:** when income lands at the start of planning, every economy building that paid shows a pixel coin and "+N" rising off it (the enemy's at half opacity). The amount is the change in the building's `goldByBuilding` total, so the renderer never recomputes income and the sim's events and hashes are unchanged.
- **Effects** use a fixed-capacity ring buffer (512), and labels have their own (256), so a big fight's sparks never evict a merge pop.
- **No camera:** the whole map is always visible.

### 13.7 Performance budget (verified every milestone)

v2 has no supply cap, so plots (and copies, from R3) bound a clash: its size is the plots a colony holds times its squads' sizes. Squad sizes and the most plots a colony can hold MUST keep a full colony inside the budget (§4.4, §4.6).

| Metric | Budget |
|---|---|
| A full colony | at most **150 live units a side** when the armies arrive, before the muster's knits: every plot planted with the biggest squad its kit allows, augments that add units included. A clash then starts with at most 300 units, `bench-300`'s size. The budget counts units, not supply, since a tick's cost follows live units |
| Sim tick, bench clash with 300 live units | mean ≤ 1.0 ms, p99 ≤ 2.5 ms (Node, this machine) |
| The clash's first tick (both armies arrive) | ≤ 5 ms (Node) |
| One full battle, headless, bots on both sides | ≤ 3 s wall time |
| A planning command and the formation preview it updates | ≤ 4 ms (Chromium) |
| The general's planning turn | ≤ 20 ms (Node) |
| Render frame at 300 units (Chromium) | ≤ 8 ms |
| Hot-loop allocations | none: pooled objects and reused arrays |
| Shipped JS + data | ≤ 300 KB gzipped (the first release) |

The tick and full-battle budgets are G11's in `data/balance-targets.json` today. The full colony, the arrival, the planning command and the general's turn are new in v2. From R1 the bench plays a clash of two full colonies and reports it without failing on it (§15.4). R2's bench measures all four and adds them to G11 (§12.3).

**Techniques:**

- **A bounded clash.** The bench covers 300 live units: two full colonies at the budget. A change to squad sizes, to the most plots a colony can hold, or an augment or combo that adds units MUST be checked against it with `npm run bench`. R2 rewrites the `bench-300` scenario as a clash: both armies in formation, merging off so all 300 stay live.
- **Ticks only in a clash.** Planning and the aftermath cost only rendering, and a clash ends within 45 s (900 ticks), so a battle is at most 9 × 900 = 8,100 ticks.
- **Merging removes entities.**
- A uniform-grid spatial hash with 2-tile cells, rebuilt every tick.
- Staggered retargeting.
- Pre-rendered terrain and atlas `drawImage` calls.
- HP bars drawn only for damaged units.
- The formation preview is cached and recomputed only on change.

### 13.8 Persistence and deployment

- **Storage:** a `Storage` interface (`src/run/storage.ts`) with a localStorage implementation in the browser (`BrowserStorage` in `src/app/run.ts`) and an in-memory one (`MemoryStorage`) in tests and tools. Profile format in §9.7, run resume in §8.9.
- **Keys never change,** or players lose their saves:
  - `spore-sprawl.run.v1` and `spore-sprawl.battle.v1` (`src/run/resume.ts`);
  - `spore-sprawl/settings/v1` and `spore-sprawl/tips/v1` (`src/app/settings.ts`);
  - `spore-sprawl/profile/v1` and its backup `spore-sprawl/profile/v1.bak` (`src/meta/records.ts`, from Run it back's records-1): the profile (§9.7).

  Every key goes through `storageKey()` (`src/app/channel.ts`), which adds the `dev/` prefix on dev-site builds. A new key is added the same way, and the `dev/` prefix is never written by hand. When a record's format changes, the record carries its own version (its `v` field); the key stays. A prototype run (`?proto=`) saves only on the dev site, under `proto=<spec>/` keys of its own (`protoSpace()`), and the game never saves one. A prototype run never writes the profile: no records and no remembered setup (RB-Q2).
- **Saves between rounds:** §8.9 owns when a battle saves, what a save holds and where resume returns to. In short, a battle saves at the start of each planning phase, once the general has planned, and at Begin, and resume returns to the latest save (a clash replays from its Begin save). This section adds only the storage side:
  - Planning commands execute when they're queued, so a save in planning holds every plant and sale made before it.
  - Resume replays from round 1's planning and checks the hash. A battle is at most 8,100 clash ticks (§13.7), so the replay is faster than v1's.
- **Saves from before R2** follow §8.9, where what becomes of them is **Open**. Whatever is decided, their keys stay.
- **Deployment:**
  - `npm run build` emits a static `dist/`. `npm run build:dev` emits the dev-site build (`--mode develop`).
  - **Branches** (the same strategy as Swalliso/dig-deep):
    - `main` is the game, at https://swalliso.github.io/Sambattler/. It changes only through a release PR from `develop`, or a `hotfix/…` branch.
    - `develop` is the integration branch, at https://swalliso.github.io/Sambattler/dev/. Finished `feature/…` branches (made from `develop`) are merged into it by PR and playtested there. Rounds arrive this way, as the new default rather than a `?proto=` knob (§1.3 #13).
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

The game has sound. Every sound is synthesized with WebAudio from parameters in `data/sounds.json`, the way sprites are text-defined, so the game ships no audio files. A sound can switch to a CC0 sample later if the synthesized one feels thin.

- **Engine (`src/audio/`).** A sound layers up to six sources. Each is an oscillator (sine, triangle, square, saw) or looping noise (white, pink, brown), through an optional biquad filter (lowpass, highpass, bandpass, notch or peaking), shaped by an envelope (attack, decay, sustain level, hold, release). Oscillators can glide in pitch and wobble (vibrato); filters can sweep; a layer can start late, for arpeggios. Each play can jitter pitch, gain and pan by a small random amount. `src/audio` uses `Math.random` and WebAudio, so it sits outside the pure layers and imports nothing but data types.
- **Routing.** Voices go to an `sfx`, `ui` or `ambient` bus, then a master gain, then a limiter (a DynamicsCompressor), then the speakers. Each bus also sends to a short generated cave reverb.
- **Data format.** `data/sounds.json` holds the bus levels, `enemyGain`, `maxVoices`, the speed thinning, the reverb, the ambient bed, and the sounds. Each sound has an id, name, note, bus, gain, priority (0–10), `cooldownMs`, an optional `frequent` flag, optional jitter and its layers, for example `{ "wave": "sine", "freq": 150, "sweep": { "to": 55, "time": 0.14 }, "env": { "attack": 0.004, "decay": 0.16, "sustain": 0, "hold": 0, "release": 0.05 }, "gain": 0.9 }`. `SoundBankSchema` in `src/data/schema.ts` validates it, and the registry checks that every sound the game plays exists (`REQUIRED_SOUNDS`) and that the drips are ambient sounds, so `npm run validate:data` catches mistakes. It loads into `Content.audio` and `Content.sounds` like the sprite sheets. The sim never reads it, so sound changes never move a golden hash.
- **Throttling.** Each sound has a cooldown (per key: the two Heartcaps throttle separately). At most 12 voices play at once: a new sound takes over the oldest voice of lower priority, or is dropped. At 2× and 3× speed, `frequent` sounds (arrival puffs, knits) stretch their cooldown 2× and 3.5× and play at 70% and 50% gain.
- **Battle sounds** (`src/app/battleSound.ts`) come from the sim's events, render-side only, the way callouts are. The enemy's sounds play at `enemyGain` (50%), and sounds with a place on the field pan with it.
  - **In planning:** a building planted, sold or refused (`illegal`); the player's income, once as the planning phase opens; the general's plan landing, with a counter's own sound when its plan brings one (§7.4); the round escalation as round 5's planning opens and each round after (§6.4); the draft opening and a pick.
  - **In a clash:** Begin, the armies' arrival (a `frequent` sound, throttled so two whole armies arriving make one swell, not dozens of puffs), knit, merge (fuller for an Elder), the commander power, and a lane won or lost.
  - **In the aftermath:** the Heartcap hit, timed to the animation rather than to the sim event, at most once every 1.5 s per Heartcap; then the battle's win or loss.
  - **Gone with their events:** spawns, a column claimed or lost, a building lost or razed, the counter's warning and activation, and each new wave.
  - **Sound ids** are data. R2 adds ids for its new events (for example `lane-won`, `lane-lost` and `round`) and drops those of retired ones (`spawn`, `column-gained`, `column-lost`, `building-lost`, `building-razed`, `counter-warn`, `counter-active`, `wave`), and `REQUIRED_SOUNDS` follows. A kept sound keeps its id.
- **UI sounds.** A very soft tick when the pointer moves onto a button, and a click when one is pressed, delegated from the document so every screen has them. Route nodes, event and Grove choices, and draft and spoils cards have their own sounds; a button's `data-sfx` overrides the choice.
- **Ambient bed.** Low-passed brown noise whose cutoff drifts slowly, plus a random water drip every 2.5–9 s, on the ambient bus. It plays at full level in planning and in a running clash, and keeps going while a clash is paused, at half level (`pausedLevel`).
- **Browser rules.** The AudioContext is made on the first `pointerdown` or `keydown` (autoplay rules) and is suspended while the tab is hidden or sound is muted. Without WebAudio, under `?test=1`, in automated browsers (`navigator.webdriver`, unless `?sound=1`) and in Node, the engine does nothing and never throws, so screenshots and tests are unaffected.
- **Settings.** `masterVolume` (default 0.6), `sfxVolume` (0.8; it also sets the UI bus), `ambientVolume` (0.5) and `muted` live in `spore-sprawl/settings/v1`, and saves from before sound load with these defaults. Gains follow the square of the slider, which sounds closer to even steps. The speaker button sits in the battle's bottom band and in the run bar: a click mutes, and hovering or focusing it opens the volume sliders. The settings screen (§10.5) holds the same mute and sliders. `S` mutes or unmutes anywhere.
- **Sound board.** `?scene=sounds` lists every sound with Play and ×8 (eight plays 70 ms apart, to hear cooldowns and the voice cap), plays the ambient bed, and can audition 2× and 3× speed, the enemy's quieter side and the paused level.

---

## 14. Data model

The types below are v2's target. Until milestone R2 lands, `src/data/schema.ts` and `src/sim/state.ts` hold v1's shapes (§0). Fields marked R2 or R3 arrive with that milestone (§16), and a retired field is removed with its system. Shapes marked **first guess** are starting points for R3's content, to be settled when it's built.

### 14.1 Principles

- **All content is JSON under `data/`.** Each file is validated by a zod schema in `src/data/schema.ts`.
- **Validation runs in three places:** at app startup in development, in `npm run validate:data`, and in the unit suite. Cross-references (unit ids, sprite ids, icon ids, unlock ids, the buildings and relics a pack names, the buildings an augment or combo names) are checked by `registry.ts`.
- **Compiled definitions.** At battle start, and after each draft pick (drafts happen in planning, §8.3), the sim compiles a per-side set of resolved definitions:

  ```
  base data → strain patch → augment patches → modifiers (sum all `add`, then multiply all `mul`, then apply `set`)
  ```

  The compiled set is stored in state and never recomputed per tick.
- **Combos depend on position,** so they're resolved per squad from the colony's layout when a clash begins (§11.14). They're stored with the squad for that clash and never recomputed per tick.
- **One modifier and trigger DSL** (`EffectBundle`) serves relics, traits, blights, strain ranks, commander and general passives, and elite modifiers (and upgrade tracks until R3 turns them into augments, §11.6). Augments and combos (R3) change how one squad plays, so they use a unit patch and unit triggers of their own (§14.2). New content should rarely need new code. When it does, add a new `stat` key, trigger or `action` kind to the whitelist.
- **The shape never lies** (§5.8). No stat key, patch field or action changes a unit's armor or damage type, and none may be added, so no augment, combo, relic or trait can change a unit's body or weapon.
- **Open:** whether a strain may change a body or a weapon (§9.3). First guess: no, so a strain's unit patch leaves out `armor` and `damageType` too (`StrainDef`, §14.2).

### 14.2 Content types (TypeScript view of the JSON)

```ts
type Id = string;
type Side = 'player' | 'enemy';
type DamageType = 'slash' | 'pierce' | 'crush';
type ArmorType = 'light' | 'medium' | 'heavy' | 'structure';
type Tag = 'siege' | 'slayer' | 'ranged' | 'swarm' | 'support' | 'burrow' | 'burst' | 'flying';
type Seconds = number;                       // data only; loader converts to integer ticks
type Rarity = 'common' | 'uncommon' | 'rare';

/** A building's role (§11.2). `core` marks the six core archetypes; the rest are unlockable (§1.3 #6). */
type Archetype =
  | 'swarm' | 'shield' | 'archer' | 'heavy' | 'crusher' | 'area'                 // the core six (first cut; Open)
  | 'healer' | 'slayer' | 'cleave' | 'fastSwarm' | 'siege' | 'tunneler' | 'flyer' | 'emplacement';

interface UnitDef {
  id: Id; name: string; sprite: Id; milestone: number;
  hp: number; armor: Exclude<ArmorType, 'structure'>;   // the body: never changed by any effect (§5.8)
  damage: number; damageType: DamageType;               // the weapon: never changed by any effect
  attackInterval: Seconds;
  range: number; projectileSpeed: number;    // 0 = melee
  speed: number; supply: 1 | 2 | 3; aggroRange: number; radius: number;
  splashRadius?: number; tags: Tag[];
  heal?: { amount: number; interval: Seconds; targets?: number };
  onDeath?: EffectAction[];
  mergePerks: { 2: StatPatch; 3: StatPatch };
}

interface StatPatch {
  hpMult?: number; damageMult?: number; speedMult?: number; attackIntervalMult?: number;
  rangeAdd?: number; splashRadius?: number; radiusAdd?: number; slayerMult?: number;
  resist?: Partial<Record<DamageType, number>>; healTargets?: number;
}

interface BuildingDef {
  id: Id; name: string; sprite: Id; description: string; milestone: number; rarity?: Rarity;
  kind: 'spawner' | 'tower' | 'economy' | 'utility';           // a `tower` fields as an emplacement (§4.4)
  archetype?: Archetype; core?: boolean;                        // R3: the role, and the core six (§11.2)
  footprint: { w: 2; h: 2 };                                    // one plot (§4.6)
  cost: number;
  squad?: { unit: Id; count: number;                            // R2: the units it fields each round (§4.4);
            mergeForced?: boolean; knitMult?: number };         //   replaces v1's `spawn` and its interval
  attack?: { damage: number; damageType: DamageType; interval: Seconds; range: number;
             minRange?: number; splashRadius?: number; projectileSpeed: number;
             hp?: number };                                     // its emplacement: a unit, structure armor (first guess, §6.7)
  economy?: { goldPerRound: number; interestCapAdd?: number };  // R2: replaces `goldPerTick`
  utility?: { effects: EffectBundle };                          // v1's `supplyCapAdd` goes with the cap (§11.2)
}
// Retired in R2: `hp` (buildings can't be hit), `spawn.interval` (spawn timers) and
// `utility.laneCaptureBonus` / `supplyCapAdd` (territory and the supply cap).

interface FactionDef { id: Id; name: string; palette: Record<string, string>;
                       mat: { base: string; strand: string; glow: string };   // the colony's mycelium; kept as a
                                                              // field name until R2 removes territory rendering (§2)
                       buildings: Id[]; trait?: EffectBundle }

// ---- one DSL for every modifier source ----
interface Selector { unit?: Id; building?: Id; tag?: Tag; tier?: 1 | 2 | 3;
                     archetype?: Archetype;                        // R3
                     rank?: number; onLoam?: boolean;              // R2: plots replace v1's `zone` (rank 0 is the front)
                     plantedThisRound?: boolean;                   // R2, first guess: Fresh Spores (§11.7)
                     inCounterSet?: boolean;                       // R2, first guess: the Pale Sovereign (§7.7)
                     adjacentOwnBuildingsGte?: number }   // retired in R2 with Mycorrhizal Link's v1 effect (§11.7)
interface ModifierDef { stat: StatKey; op: 'add' | 'mul' | 'set'; value: number;
                        side?: 'self' | 'opponent'; where?: Selector;
                        if?: { roundGte?: number } }       // R2, first guess: the Sporestorm Sigil, from round 5 (§11.7)
type StatKey =                                   // whitelist, extended deliberately
  | 'unit.hp' | 'unit.damage' | 'unit.attackInterval' | 'unit.range' | 'unit.speed'
  | 'unit.splashRadius' | 'unit.resist.slash' | 'unit.resist.pierce' | 'unit.resist.crush'
  | 'unit.siegeMult' | 'unit.regenPctPerSec' | 'unit.healAmount'
  | 'building.squadCount' | 'building.goldPerRound'                     // R2: replace spawnCount, goldPerTick
  | 'tower.damage' | 'tower.range' | 'tower.splashRadius'
  | 'side.interestCap' | 'side.stipend' | 'side.startingGold' | 'side.sellRefund'
  | 'side.knitTicks' | 'side.mergeRadius' | 'side.rerollCost' | 'side.draftCards'
  | 'side.heartcapMaxHp' | 'side.comebackEnabled' | 'side.loamBonus'
  | 'battle.sporestormStart'                                            // a round number in v2 (§6.4)
  // R2, first guesses: the keys v2's new effects need (§7.7, §8.5, §11.7, §11.8, §11.10)
  | 'side.plots'                     // the colony's plot count: Mycelial Web, Root Pressure, Landholder, Thin Soil (§4.6)
  | 'side.heartcapDamageTaken'       // × Heartcap damage this side takes, applied in basis points (Rot Ward, §6.7)
  | 'side.incomeMult'                // × a side's income; the general's starts at `enemyIncomeMult` (Hoarding Rot, §7.1)
  | 'side.powerEffectMult'           // × the commander power's effect (the Sporestorm Sigil, §6.6)
  | 'side.comboCorners'              // 1: combos also link plots touching at a corner (Mycorrhizal Link, §11.14)
  | 'unit.openingSpeed'              // × speed until a unit's first attack in a clash (Quick Roots)
  | 'general.counterLeadRounds'      // its counter cycle runs this many rounds earlier (Quick Learner, §7.4)
  | 'run.maxLives';                  // the run's max lives (§8.5); traits MAY change it (§9.4)
// Squad sizes by rank or tag (Home Brood, Old Mother Mold) use `building.squadCount` with a `rank` or `tag`
// selector; front-rank HP (Thick Caps, the Lichen Baron) uses `unit.hp` with `rank: 0`.
// Retired in R2 with their systems: building.hp, building.spawnInterval, building.firstSpawnFraction,
// side.supplyCap, side.captureSpeed, side.supplyLineRate, side.turretDamage, side.homeCols (now side.plots),
// side.powerCooldown, side.waveBeat, side.waveSize, general.warningWaves, general.warningsVisible.
interface TriggerDef {
  on: 'merge' | 'unitDeath' | 'enemyUnitKilled'
    | 'roundStart' | 'clashStart' | 'battleStart'                      // R2: roundStart replaces waveStart
    | 'roundWon' | 'squadWiped';                                       // R2, first guesses: Mending Moss, Martyr's Bloom
  if?: Selector & { roundGte?: number };          // R2, first guess: Rot-Eater, from round 5 (§11.7)
  do: EffectAction[];
}
// Retired in R2: the `buildingDestroyed` trigger (buildings can't be destroyed), `waveStart`, and the
// breach preset's `heartcapBreach` trigger with its `at` (`src/data/proto.ts`).
type EffectAction =
  | { gainGold: number }
  | { pendingGold: number }                                // R2: paid at the next planning phase (`pendingGold`, §14.4)
  | { explode: { damage: number; damageType: DamageType; radius: number } }
  | { cloud: { radius: number; seconds: Seconds; damagePerSecond: number;
               at?: 'self' | 'enemyFrontRank' } }          // R2, first guess: Forward Spores lands on the enemy's front rank
  | { healHeartcap: number };                              // R2, first guess: Mending Moss, up to the max (§11.7)
// Retired in R2: `repairHeartcapPct` (the run's Heartcap is gone, §1.3 #2), and the breach preset's
// `shieldHeartcap` and `readyPower` (the power is ready from the clash's first tick, §6.6).
interface EffectBundle { modifiers?: ModifierDef[]; triggers?: TriggerDef[] }

// ---- the kit (§8.10) ----
/** A kit card: a building you own this run, and how many of it you can have planted at once. */
interface KitCard { building: Id;
                    copies?: number }   // R3. Until R3 a card has no copy limit, and plots are the build limit

// ---- augments, combos and packs (R3; first guesses) ----
/** Numbers and behavior an augment or combo changes on one squad's units. Never `armor` or `damageType`. */
interface UnitPatch {
  hpMult?: number; damageMult?: number; speedMult?: number; attackIntervalMult?: number;
  takenMult?: Partial<Record<DamageType | 'projectile' | 'melee', number>>;  // Tough Caps, Spore Shield, Spongy Cap
  minRange?: number;                                 // Anvil
  burst?: { damage?: number; cloudRadius?: number; cloudSeconds?: Seconds }; // Sporebloom
  holdUntilContact?: true;                           // Fuse: wait behind the front rank until it makes contact
  ignorePin?: true;                                  // Shield Wall (§5.3)
  aggroRangeAdd?: number;                            // Hunting Pack
  taunt?: { who: 'melee' | 'ranged'; radius?: number };   // Holdfast, Spotted Screen: those enemies attack it first
  targetPriority?: 'knitting' | 'partnerTarget';     // Hunting Pack; Sundering Volley (the partner squad's target)
}
type UnitTriggerOn = 'death' | 'hit' | 'attack' | 'muster' | 'burst';
interface UnitTrigger {
  on: UnitTriggerOn;
  everyNth?: number;                                 // Shockwave: every third blow
  firstInClash?: true;                               // Red Charge: the first blow of each clash
  action: UnitAction;
}
type UnitAction =
  | { cloud: { radius: number; seconds: Seconds; damagePerSecond: number } }        // Spore Pop
  | { status: { kind: 'slow' | 'sunder'; mult: number; seconds: Seconds } }         // Sticky Darts, Sunder
  | { strikeExtra: { count: number; radius: number; damageMult: number } }          // Barbed Darts
  | { splash: { radius: number; damageMult: number } }                              // Shockwave, Red Charge
  | { pendingGold: number }                                                          // Truffle Hunters
  | { setOffBursts: { radius: number } };                                           // Chain Burst
interface AugmentDef {
  id: Id; name: string; rarity: Rarity; text: string; unlockedBy?: Id;
  building: Id;                               // the building whose units it changes
  icon: Id;                                   // a `ui` sprite, shown on its squad and its card (§5.8)
  patch?: UnitPatch; triggers?: UnitTrigger[];
}
type ComboRelation = 'inFront' | 'behind' | 'beside';   // where `a`'s plot stands from `b`'s (§4.6)
interface BuildingMatch { building?: Id; archetype?: Archetype; kind?: BuildingDef['kind']; tag?: Tag }
interface ComboDef {
  id: Id; name: string; text: string; icon: Id; unlockedBy?: Id;
  a: BuildingMatch; b: BuildingMatch; relation: ComboRelation;
  effect: { patch?: UnitPatch; triggers?: UnitTrigger[];       // on `a`'s squad, for the clash
            whilePartnerWithin?: number };                     // Anvil: only while a `b` unit is this close
}

interface PackDef { id: Id; name: string; text: string; building: Id; relics: [Id, Id] }
interface PacksFile {
  alwaysIn: { buildings: Id[]; relics?: Id[] };   // the always-in set (§8.4 owns its contents)
  packs: PackDef[];                               // 10 themed packs; each run deals `balance.packsPerRun` (4)
}

// ---- run & meta content ----
type CardType = 'blueprint' | 'copy' | 'augment' | 'relic';   // §8.3; `upgrade` until R3
interface UpgradeTrackDef { building: Id; levels: [TrackLevel, TrackLevel, TrackLevel];   // retired in R3
                            rarity: [Rarity, Rarity, Rarity] }
interface TrackLevel { text: string; effects: EffectBundle }
interface RelicDef  { id: Id; name: string; rarity: Rarity; text: string; effects: EffectBundle;
                      unlockedBy?: Id; requires?: 'powers' }
interface StrainDef { id: Id; building: Id; name: string; unlockedBy: Id;
                      patch: { building?: Partial<BuildingDef>;
                               unit?: Partial<Omit<UnitDef, 'armor' | 'damageType'>> };   // first guess (§14.1)
                      rankEffect?: EffectBundle }      // default: +4% unit hp & damage per rank
interface TraitDef  { id: Id; name: string; cost: 0 | 1 | 2 | 3; sporePrice: number; effects: EffectBundle }
interface BlightDef { id: Id; name: string; ranks: { decay: number; effects: EffectBundle }[] }
type Condition = { all: Condition[] } | { any: Condition[] }
               | { stat: StatPath; eq?: number | boolean; gte?: number; lte?: number };
interface FeatDef { id: Id; name: string; description: string; scope: 'battle' | 'run';
                    condition: Condition; reward: { unlocks?: Id[]; amber?: number } }
type PowerDef = {                                       // fired at most once per clash, from its first tick (§6.6)
  id: Id; name: string; text: string;
} & ( { kind: 'burst'; target: 'point'; radius: number; damage: number; damageType: DamageType }
    | { kind: 'bloom'; target: 'point'; radius: number }
    | { kind: 'harvest'; target: 'none'; goldPerSupply: number } );   // R2, first guess: Rhizome Tithe (§11.10),
                                                                      //   paid through `pendingGold` (§14.4)
// Retired in R2: `cooldown` and `firstReady` (once per clash, ready from the clash's first tick, §6.6),
// and the column powers `surge` and `tithe`.
interface CommanderDef { id: Id; name: string; milestone: number; title: string; sprite: Id; description: string;
                         core: Id[];                        // 6 buildings
                         starter: [Id, Id, Id];             // the starting kit; R3: `balance.kit.starterCopies` (2) each
                         passive: { text: string; effects: EffectBundle }; power: PowerDef }
interface GeneralDef { id: Id; name: string; title?: string; description?: string; sprite: Id; faction: Id;
                       milestone: number;
                       opener: Id[]; weights: Record<Id, number>;
                       limits?: Record<Id, { maxOwned?: number; afterRound?: number }>;  // v1: afterSeconds;
                                                            //   `maxOwned` applies until copies arrive in R3
                       preferred?: Id[];                    // battle i adds i − 1 of these (§7.8)
                       augments?: Id[];                     // R3: i − 1 in battle i, +1 at an elite, 4 for the boss (§7.8)
                       mergePolicy?: 'on' | 'off' | 'auto'; passive?: EffectBundle;
                       adaptive?: boolean; boss?: boolean; appearsIn: number[];
                       laneStyle: 'defensive' | 'aggressive' }   // two-lane maps: how it picks a lane (§7.3)
// The general's kit isn't stored: §7.8 builds it from `opener` and `preferred` by battle index, with
// the player's copy rule from R3.
type RunEffect =                                        // event and Grove outcomes (§8.7)
  | { gainLife: number }                                // R2: up to the max; replaces repairPct
  | { maxHpPct: number }                                // kept: every later battle's Heartcap max, for the run (Fallen Oak)
  | { gainRelic: { rarity?: Rarity; count?: number } } | { gainAmber: number }
  | { nextBattle: { startingGold?: number; sporestormShiftRounds?: number;
                    heartcapMaxHpPct?: number } }       // R2, first guess: Quiet Clearing's Rest
  | { halveIntel: true } | { removeBlueprint: 'choose' }
  | { sacrificeRelic: { gain: number; rarityShift: number } }
  | { gainCopy: { pick: 'choose' } }                    // R3, first guess: Twin Spores (§8.7)
  | { augment: { count: number; pick: 'choose' | 'random'; ownedOnly?: boolean } };  // R3: v1's `upgrade`
interface EliteDef { id: Id; name: string; text: string; effects?: EffectBundle;
                     augments?: number }                // R3: replaces `upgradeLevels`
interface EventDef { id: Id; title: string; text: string;
                     choices: { label: string; text: string; outcome: RunEffect[] }[] }
interface BotDef { id: Id; description?: string; opener: Id[]; weights: Record<Id, number>;
                   mergePolicy: 'on' | 'off' | 'auto'; adaptive?: boolean }

// ---- maps & sprites ----
interface MapDef { id: Id; name: string; width: number; height: number; milestone: number; testOnly?: boolean;
                   homeCols: number;                    // each colony's columns; cut into 2×2 plots (§4.6)
                   lanes: { rowStart: number; rowEnd: number }[];
                   tiles: string[] }                    // H strings × W chars: . $ o #
interface SpriteDef { id: Id; w: number; h: number; anchor: [number, number];
                      palette: Record<string, string | null>;   // char → #rrggbb, null = transparent
                      frames: string[][];                        // frames × h rows × w chars
                      factionSwap?: boolean;                     // bake a gray-rot variant
                      shape?: SpriteShape }                      // a unit's or an emplacement's shape (§5.8, §14.3; R4a)
interface SpriteShape { body: 'small' | 'medium' | 'big' | 'structure' }  // the body alone: no weapon mark (§5.8)
// A sprite sheet is { sheet, sprites: SpriteDef[], bands? }. bands gives each body class its
// [min, max] height in native px (§14.3); it's display data, kept out of data/balance.json.
```

- **Squads.** A spawner's `squad` is what it fields each round. R1's clash check sets the counts (§1.3 #11, §16); §11.2's Squad column has the starting table, such as 8 Sporelings for a Sporeling Burrow and 4 Capguards for a Capguard Hall.
- **Copies** arrive in R3 (§8.10). Then `data/balance.json` gains a `kit` block: `starterCopies` (2), `blueprintCopies` (1, a drafted blueprint) and `copyCopies` (1, a drafted copy of a card you own). These are the key names §11.1 uses. Until R3 a kit card has no copy limit. `data/balance.json` also gains `packsPerRun` (4) in R3 (§8.4).
- **Augments and combos** (R3) are first guesses, shaped so that every example in §11.13 and §11.14 can be written: the comment on each `UnitPatch` field, trigger and action names the example that needs it. An augment patches its building's unit and adds triggers to it; a combo does the same to the squad of `a` while `a` stands in its `relation` to a `b`. Timed statuses (slow, sunder) and the counters that `everyNth` and `firstInClash` read live on the unit in a clash (`UnitState`, §14.4). R3 adds a unit test for each example.
- **Open:** whether an augment attaches to a building type or to one card (§8.10, §11.13). First guess: the type, for the run, so every copy's squad has it.
- **Open:** whether damage-taken changes from augments and combos (`takenMult`) count toward a hit's effectiveness class, the hit sparks and matchup marks of §5.3 and §10.4, the way merge perks' resistances do. First guess: yes, so a flipped matchup shows as one.
- **Maps.** A map's tiles mark loam (`$`) and stumps (`o`) inside the colonies as well as `.` soil and `#` root walls; a plot is a loam or stump plot by the tiles it covers (§4.1, §11.9). How a map leaves room for the sprawl's third rank follows §4.6.
- **Content types** stay plain data. `Content` (`src/data/registry.ts`) gains `augments`, `combos` and `packs`, keyed by id with their data-file order kept, in R3.

### 14.3 Text-defined sprites

- Unit bodies are 8–16 px tall, in three bands by armor (below); buildings are 32 × 32 px (2 × 2 tiles, one plot); a Heartcap is drawn from a cap, a stalk and a base, stretched to its lane's height.
- A sprite is a palette plus rows of characters. `null` means transparent. Every row in a frame MUST have exactly `w` characters; the schema enforces it.
- A unit sprite has three frames: two walk frames and an attack frame (§13.6).
- **The shape language** (§5.8) is drawn into the sprites (R4a; R4-Q1, R4-Q3 and R4-Q5, agreed 2026-11-01). A unit's sprite declares its `shape` (§14.2), which is its body. The data checks hold every frame to it.
  - **Body bands.** A body's height is the height of its frame's own opaque pixels, with the Elder's rim left out:
    - small (light): 8–9 native px;
    - medium: 11–12;
    - big (heavy): 15–16.

    The sheet holds the bands (`bands`).
  - **Body width.** A body's width is at most floor(32 / k) native px. k = ceil(sqrt(n)), and n is its building's squad plus 1, for a Rhizome Vault beside it (§4.6, §11.2). So the squad stands apart in its slot. A bigger squad, such as the Velvet Shrine's +2, overflows by §4.6's rule, and the sprite-sheet tool lists it.
  - **No weapon mark** (§5.8, 2026-11-01): nothing is baked over a frame, and the shape block holds no mark, so the data checks reject one. A weapon the silhouette draws, such as the Hammercap's raised maul, is body: it counts toward the band and the width.
  - Each archetype MUST have a distinct silhouette.
  - **Pips and rims.** Pips (`i-pip`, a 3 × 3 gold core in a 1-px dark outline) and augment icons are `ui` sprites drawn over a unit or a squad's slot, never part of a unit's sprite. An Elder's 1-px gold rim is baked per frame as a region of its own, outside the outline, and drawn under the sprite.
  - **An emplacement** has a sprite of its own, `e-<buildingId>`, at most 32 × 32, drawn at its slot's centre. Its body is `structure`, which has no band, and it carries no mark. Without one, the building's own sprite stands in.
- Velvet Bloom sprites use palette keys that the faction swap maps to Gray Rot colors at bake time, so one drawing serves both factions until M7 adds distinct Gray Rot art.
- Example: v1's Sporeling, as shown in the interview, before R4a redraws it to the bands:

```json
{ "id": "sporeling", "w": 12, "h": 10, "anchor": [6, 9], "factionSwap": true,
  "palette": { ".": null, "k": "#1a1020", "v": "#8a4fd8", "l": "#c9a2ff", "s": "#e8d9b5" },
  "frames": [[ "....kkkk....", "..kkvvvvkk..", ".kvvlvvlvvk.", ".kvvvvvvvvk.", "..kkkkkkkk..",
               "....kssk....", "...kssssk...", "...kssssk...", "....k..k....", "...kk..kk..." ]] }
```

### 14.4 Runtime state (plain, serializable data)

**A battle.**

```ts
interface BattleConfig {
  seed: number; battleIndex: number; mapId: Id;
  player: SideConfig; enemy: SideConfig;
  modifiers?: BattleModifier[];                     // event effects, blights, elite modifier
  flags: { merging: boolean; drafts: boolean; adaptiveGeneral: boolean; powers: boolean };
  scenario?: Id;
}
interface BattleModifier { side: Side | 'both'; source: string; effects: EffectBundle }
interface SideConfig {
  faction: Id;
  controller: { kind: 'human' } | { kind: 'general'; id: Id } | { kind: 'bot'; id: Id };
  kit: KitCard[];                                   // R2: the run's kit; copies from R3 (§8.10)
  augments?: Record<Id, Id[]>;                      // R3: building id → its augments (§11.13)
  upgrades?: Record<Id, number>;                    // until R3
  relics: Id[]; traits?: Id[]; strains?: Record<Id, Id>; strainRanks?: Record<Id, number>;
  commander?: Id; power?: Id; powerPolicy?: 'none' | 'auto';
  plots: number;                                    // R2: the plots the colony holds this battle (§4.6)
  heartcapMaxHp: number;                            // this battle's; the Heartcap starts full (§4.5)
  startingGold: number;                             // 300 + 75 per battle (§6.1)
  draft?: DraftPool; autoDraft?: DraftPolicy; aiWeights?: Record<Id, number>;
  intel?: IntelProfile;
}
// Retired in R2: `heartcapHp` (every battle starts full), and the `test` switches for turrets and territory.
type IntelProfile = Record<'swarm' | 'line' | 'armor' | 'elite', number>;

interface BattleState {
  v: 2; config: BattleConfig;
  phase: 'planning' | 'clash' | 'aftermath' | 'ended';
  round: number;                     // 1–9 (§6.5)
  tick: number;                      // clash ticks so far this battle; doesn't move in planning or the aftermath
  clash?: ClashState;                // from Begin until the next round opens
  rounds: RoundResult[];             // one per finished round, in order, with what each side fielded
  rng: Record<'combat' | 'ai' | 'draft', [number, number, number, number]>;
  nextId: number; nextSeq: Record<Side, number>;
  rules: Rules; library: Library; map: MapState;
  sides: Record<Side, SideState>;
  lanes: { rowStart: number; rowEnd: number }[];   // v1's owner, borders and capture are retired
  buildings: BuildingState[];        // sorted by id
  squads: SquadState[];              // this clash's, sorted by building id; empty in planning
  units: UnitState[];                // sorted by id; empty in planning
  hits: PendingHit[];                // sorted by (tick, sourceId, seq)
  clouds?: CloudState[];             // spore clouds, oldest first
  sporestorm: number;                // this round's escalation step: 0 before round 5 (§6.4)
  queue: Command[];                  // pending, sorted by (round, tick, side, seq)
  log: Command[];                    // every executed command, in execution order (replays, resume)
  events: SimEvent[];                // this step only
  compiled: Record<Side, CompiledDefs>;
  stats: Record<Side, SideStats>;
  outcome?: { winner: Side; by: 'rout' | 'decision'; round: number };   // set when the last round is scored
}
// Retired in R2: `held` (a draft in planning needs no hold) and `frontLine`.

interface SideState {
  gold: number;
  heartcapHp: number; heartcapMaxHp: number;       // this battle's Heartcap (§4.5)
  kit: KitCard[];                                   // its cards; R3: copies, with the planted ones counted from `buildings`
  augments: Record<Id, Id[]>;                       // R3
  upgrades: Record<Id, number>;                     // until R3
  relics: Id[];
  plots: PlotState[];                               // the colony, ordered by lane, rank, file
  bankedAtBegin: number;                            // gold held when this side's planning ended (interest, §6.2)
  pendingGold: number;                              // R2: gold a clash won (Rhizome Tithe, Truffle Hunters); paid
                                                    //   at the next planning phase, lost if the battle ends first
  powerUsed: boolean;                               // in this clash (§6.6)
  draft?: OpenDraft; draftsOpened: number;
  ai?: AiState;                                     // doctrine, counter schedule in rounds, noise
}
// Retired in R2: supplyUsed, supplyCap, turretCooldowns, powerCooldown, stance, heartcapShield.

interface PlotState {
  lane: number; rank: number; file: number;        // rank 0 is the front; sprawl adds rank 2 (§4.6)
  col: number; row: number;                         // its top-left tile
  terrain: 'soil' | 'loam' | 'stump';
  building: number;                                 // the building on it, or 0 when free
}
interface BuildingState {
  id: number; side: Side; buildingId: Id; plot: number;   // an index into the side's plots
  plantedRound: number; pricePaid: number;
  fielded: boolean;                                 // has been through a clash: selling then refunds 60% (§4.4)
  mergeOn: boolean;
}
// Retired in R2: hp, maxHp, timer, cooldown, targetId, lastDamagedTick, holding, hasProduced and the
// waves' stored units. A tower fielded as an emplacement keeps its cooldown and target on its unit.

interface SquadState {
  building: number; side: Side; lane: number; unitId: Id;
  rank: number; file: number;
  slot: { x0: number; y0: number; x1: number; y1: number };  // its slot in the formation box, in tiles (§4.6)
  units: number; supply: number;                   // units and supply at arrival
  combos: Id[];                                     // R3: the combos it took into this clash
}
interface ClashState {
  startTick: number;                                // the 45 s cap is startTick + 900
  lanes: { ended: boolean; endTick: number; winner: Side | null; survivors: Record<Side, number> }[];
}
interface RoundResult {
  round: number;
  lanes: { winner: Side | null; survivors: Record<Side, number>; capped: boolean; ticks: number }[];
  damage: Record<Side, number>;                    // Heartcap damage this side dealt, after the storm, the
                                                   //   loser's damage-taken modifiers and the cap (§6.7)
  stormBp: number; capped: boolean;                // the round escalation in basis points, 10000–20000 (§6.4),
                                                   //   and the 500 cap (§6.7)
  heartcaps: Record<Side, number>;                 // each Heartcap's HP after the round
  fielded: Record<Side, FieldedSquad[]>;           // R2: what each side fielded this round, recorded at Begin
}
/** One entry of the fielded record: the counter cycle (§7.4) and the intel file (§7.6) read it. */
interface FieldedSquad { unitId: Id; tier: 1 | 2 | 3; count: number; augments: Id[] }

interface UnitState {
  id: number; side: Side; lane: number; unitId: Id; tier: 1 | 2 | 3;
  x: number; y: number; px: number; py: number;
  hp: number; maxHp: number; supply: number; cooldown: number;
  targetId: number; lastCombatTick: number; lastAttackTick: number; mergeOn: boolean;
  knit?: { group: number; untilTick: number; x: number; y: number; hurt: boolean };
  sourceBuildingId: number;                         // its squad's building
  burrowed?: boolean; burst?: boolean; flying?: boolean;   // the tunneler, the Burster, flyers (§5.3)
  statuses?: { kind: 'slow' | 'sunder'; mult: number; untilTick: number }[];   // R3, first guess (§14.2)
  blows?: number;                                   // R3: its blows this clash, for `everyNth` and `firstInClash`
}
interface PendingHit { tick: number; sourceId: number; seq: number; side: Side; targetId: number;
                       x: number; y: number; damage: number; damageType: DamageType;
                       splashRadius: number; slayerMult: number; sourceBuildingId: number }
```

- **Surviving supply** in `ClashState`, `RoundResult` and the events is plain supply: merged units count their own supply, and siege units count once. It decides the 45 s comparison. Siege units count double only in the Heartcap damage (§6.7).
- **The fielded record.** At Begin the sim writes each side's `fielded` entries from `formationOf` and `mergePreview` (§14.6), which equal what fields once the muster's knits are made (§5.6): one entry per unit type, tier and augment set, with its count. It's stored in that round's `RoundResult`, and the battle record carries it into the run, so the counter cycle, the general's merge toggle and the intel file all read this one record (§4.7, §7.2, §7.4, §7.6).
- **Squads are fielded fresh.** Units exist only in a clash. When the next round opens, `units`, `squads`, `hits` and `clouds` are cleared, and only buildings and gold carry (§4.7).
- **Pending gold** (first guess). Gold that an effect pays "at the next planning phase" goes to `pendingGold`. It's paid as part of the next round's income (§4.7, §6.2) and lost if the battle ends first.
- **Per-battle Heartcaps.** Both sides' `heartcapHp` start at `heartcapMaxHp` when the battle is created. Heartcap damage is taken only when a round is scored (§6.7), and `rounds` keeps what each side dealt, which a Decision after round 9 compares (§6.5).

**The run** (`src/run/runState.ts`). Between battles only the run's state carries: the kit (its copies from R3), augments, relics, the plot count and lives. Whether planted buildings carry between battles is **Open** in §4.6; under its first guess they don't, so each battle starts with an empty colony and its starting gold.

```ts
interface RunState {
  v: 2;                              // R2; the key stays `spore-sprawl.run.v1` (§13.8)
  seed: number; commander: Id; bans: Id[]; faction: Id;
  player: string; autoDraft: DraftPolicy; powerPolicy?: PowerPolicy; flags: Flags;
  route: RouteNode[][]; path: number[];
  kit: KitCard[];                    // R2: cards; copies from R3 (§8.10)
  augments: Record<Id, Id[]>;        // R3
  upgrades: Record<Id, number>;      // until R3
  relics: Id[];
  plots: number;                     // R2: the colony's plot count, which sprawl raises (§4.6)
  lives: { left: number; max: number };   // R2: 3 (§8.5); replaces v1's `heartcap: { hp, max }`
  heartcapMaxPct: number;            // R2: run-long change to your battle Heartcap's max (Fallen Oak's −0.15, §8.7)
  packs?: Id[];                      // R3: the packs this run dealt (§8.4)
  battles: BattleRecord[]; cards: CardRecord[];
  spores: number; amber: number; xp: number;
  intelHalvings: number; intel?: IntelProfile; profiles?: IntelProfile[];
  next: { startingGold: number; sporestormShiftRounds: number;
          heartcapMaxHpPct: number };                          // one-shot event effects (Quiet Clearing's Rest)
  pending: RunEffect[]; rng: Record<'route' | 'events' | 'draft' | 'meta', Rng4>;
  screen: RunScreen; outcome?: 'victory' | 'defeat';
}
interface BattleRecord {
  index: number; row: number; kind: RouteNode['kind'];
  map: Id; mapName: string; lanes: number; general: Id; elite?: Id;
  winner: Side; by: 'rout' | 'decision'; finalHash: string;
  rounds: RoundResult[];             // R2: the battle's rounds (the report's round chart, §10.4)
  heartcaps: Record<Side, { max: number; end: number }>;   // R2: replaces heartcapBefore and heartcapAfter
  lifeLost: boolean;                 // R2 (§8.5)
  damageByBuilding: Record<Id, number>; drafted: Id[]; spores: number;
  opening?: { kinds: CounterKind[]; dual: boolean };
  counters?: CounterRecordBrief[];   // by round in v2 (§7.4)
  profile?: IntelProfile;
}
// Retired in R2: `front` (the front-line sparkline), `durationTicks` and `mapWidth`.
```

### 14.5 Commands and events

```ts
type Command = { round: number; tick: number; side: Side; seq: number } & (
  // planning: each executes when queued (§13.3 rule 7)
  | { type: 'plant'; buildingId: Id; plot: number }    // spends a free copy and the price
  | { type: 'sell'; entityId: number }                 // returns the copy: 100% this phase, 60% once fielded
  | { type: 'toggleMerge'; entityId: number; on: boolean }
  | { type: 'beginClash' }                             // ends planning; both armies arrive
  | { type: 'draftPick'; cardId: Id } | { type: 'draftReroll' } | { type: 'draftSkip' }
  // clash: executes on its tick
  | { type: 'power'; x?: number; y?: number; lane?: number });   // at most once per clash (§6.6)
// Retired in R2: `begin` (now `beginClash`), `place` (now `plant`, on a plot) and `stance` (Hold).

type SimEvent =
  // a round opens
  | { t: 'income'; side: Side; amount: number } | { t: 'interest'; side: Side; amount: number }
  | { t: 'roundStarted'; round: number; stormBp: number }
  | { t: 'draftOpen'; side: Side; index: number }
  | { t: 'drafted'; side: Side; cardId: Id | null; skipped: boolean }
  | { t: 'generalPlanned'; side: Side; planted: number[]; sold: Id[]; counter?: CounterKind }
  // planning
  | { t: 'buildingPlanted'; id: number }
  | { t: 'buildingSold'; id: number; side: Side; refund: number }
  | { t: 'mergeToggled'; id: number; on: boolean }
  | { t: 'commandRejected'; side: Side; seq: number; reason: string }
  // the clash
  | { t: 'clashStarted'; round: number; supply: Record<Side, number> }
  | { t: 'arrived'; side: Side; ids: number[] }        // a squad's units, on the clash's first tick
  | { t: 'hit'; target: number; src: number; amount: number; eff: 'strong' | 'normal' | 'weak';
      x: number; y: number; splash: boolean }
  | { t: 'died'; id: number; side: Side; unitId: Id; x: number; y: number }
  | { t: 'healed'; target: number; src: number; amount: number; x: number; y: number }
  | { t: 'knitStart'; side: Side; ids: number[]; x: number; y: number } | { t: 'knitCancel'; side: Side; ids: number[] }
  | { t: 'merged'; side: Side; id: number; unitId: Id; tier: 2 | 3; x: number; y: number }
  | { t: 'burst'; side: Side; id: number; x: number; y: number; radius: number }
  | { t: 'effectGold'; side: Side; amount: number; pending?: boolean }   // pending: into `pendingGold`
  | { t: 'power'; side: Side; power: Id; x?: number; y?: number; hits: number; merges: number }
  | { t: 'augmentActed' | 'comboActed'; side: Side; id: Id; x: number; y: number }   // R3: icon flashes (§13.6)
  | { t: 'laneWon'; lane: number; winner: Side | null; survivors: Record<Side, number>; capped: boolean }
  // scoring: on the clash's last tick
  | { t: 'heartcapDamaged'; side: Side; amount: number; stormBp: number; capped: boolean }   // `side` took it
  // the aftermath's step, after the battle's last round
  | { t: 'battleEnded'; winner: Side; by: 'rout' | 'decision'; round: number };
// Retired in R2: spawned (now arrived), columnFlipped, buildingPlaced (now buildingPlanted),
// buildingDestroyed, wave, begin (now clashStarted), counterWarned and counterActive (a counter now
// shows in generalPlanned), stance, release, waveCapped, heartcapBreach, sporestorm (now
// roundStarted.stormBp), ended (now battleEnded).
```

- **Stamps.** A planning command carries the round and the tick at which that planning phase stands (`state.tick`, which doesn't move in planning); it executes when queued. A clash command carries `state.tick + 1`. The queue sorts by (round, tick, side: player first, seq), and sequence numbers are per side.
- **Validation happens at execution time.** The state may change between queueing and execution, so a command is re-validated when it runs. An illegal command becomes a `commandRejected` event. Because validation is deterministic, replaying the full log reproduces identical rejections. Among the checks:
  - **the phase:** plant, sell, `toggleMerge` and `beginClash` only in planning; `power` only in a clash, and only once in it;
  - **the kit:** `plant` needs a free copy of the card (§8.10), the price in gold and a free plot of the side's colony that isn't a stump (§4.6);
  - **the draft:** `beginClash` is refused while the side's draft is open, and draft commands only run while one is. **Open:** whether `plant`, `sell` and `toggleMerge` are refused too while the side's draft is open. First guess: yes, since you plan once the draft is resolved (§4.7, §10.2);
  - **the side:** a side can't sell, toggle or target the other side's buildings.
- **A lane drawn.** `laneWon` with `winner: null` is a lane both sides emptied on the same tick, or one level on surviving supply at the 45 s cap. It deals no damage (§6.7).
- **Render timing.** Events are emitted when the sim decides them. The aftermath's animation and sounds play `heartcapDamaged` later, at the pace of the animation. `battleEnded` comes from the step that closes the last round's aftermath (§13.5, §13.9, §14.6).

### 14.6 Sim public API (`src/sim/index.ts`)

```ts
loadContent(raw: RawContent): Content                       // zod-validate, index, cross-check
createBattle(content: Content, config: BattleConfig): BattleState   // in round 1's planning, the general's plan made
queueCommand(state: BattleState, cmd: Omit<Command, 'seq'>): Command
step(state: BattleState): void                              // by phase: see below
runHeadless(state: BattleState, opts: { until: 'end' | number; commands?: Command[];
            hashEvery?: number; onTick?: (s: BattleState) => void }): HeadlessResult
hashState(state: BattleState): string                       // 16 hex chars
snapshot(state: BattleState): string;  restore(json: string): BattleState
legalPlots(state: BattleState, side: Side, buildingId: Id): number[]   // UI ghost + AI; replaces legalPlacements
plantProblem(state: BattleState, side: Side, buildingId: Id, plot: number): string | null
priceOf(state: BattleState, side: Side, buildingId: Id): number        // no column term; replaces priceAt
sellValue(state: BattleState, entityId: number): number
freeCopies(state: BattleState, side: Side, buildingId: Id): number   // R3; until then, no copy limit
formationOf(state: BattleState, side: Side): SquadPlan[]    // the arrival, the planning preview and the AI
mergePreview(state: BattleState, side: Side): Record<number, { elders: number; bloomed: number; base: number }>
                                                            // by building: "fields as 2 Bloomed + 2" (§5.6)
combosAt(state: BattleState, side: Side, buildingId: Id, plot: number): Id[]       // R3: the ghost's links
incomePreview(state: BattleState, side: Side): IncomeBreakdown   // next round's income if planning ended now
```

`formationOf` is the one formation rule (§4.6): a pure function of the colony (plots, buildings, squad sizes and merge toggles) that draws on no random stream (§13.3). A `SquadPlan` is a squad's building, lane, rank, file, slot and each unit's starting position, by §4.6's layout. The clash's arrival places units exactly there, so the preview and the clash can't disagree. `mergePreview` is the muster's own knitting (§5.6), run on `formationOf`'s positions to a fixed point with no enemies, so it shows what fields after the muster, neighboring squads that combine included. Both build on the pure functions R1 adds to `formation.ts` for the clash check: the slot layout and the muster's knitting (§13.4, §16). Retired with their systems: `legalPlacements`, `priceAt`, `depthOf`, `heldColumns`, `surgeLanes`, `lanePresence`, `frontier`, `frontierBlocked`, `isBesieged`, `isSuppressed`, `turretPos`, `holdsLane`, `rallyX` and `incomePerMinute`.

**The step, by phase.** The order is fixed and covered by tests. §4.7 owns a round's order of events; the steps below implement it.

*Opening a round* (`createBattle` for round 1; `step` in the aftermath for the rest):

1. Clear events. Clear the last clash's units, squads, hits and clouds. Advance the round, unless it's round 1.
2. Income for both sides, from round 2, with any `pendingGold` (§6.2). In round 1 a side has its starting gold (§6.1).
3. Set the Sporestorm's multiplier for the round (§6.4). Emit `roundStarted`.
4. Fire `roundStart` triggers, such as relics' (and `battleStart` in round 1).
5. The general plans (§7.2): it applies any due doctrine or counter change, sells for room if a counter needs it, buys from its kit and plants, then sets its merge toggles. Its commands execute at once, in order, then `generalPlanned`.
6. On rounds 3, 5 and 7, open a draft for each drafting side (§8.3), after the general has planned. AI sides pick at once.
7. A bot or general on the player's side plans here, and queues `beginClash`. Enter planning.

*Planning* (`step` with commands queued):

1. Clear events.
2. Execute queued commands in queue order. Each is validated as it runs.
3. On `beginClash`: record each side's gold as `bankedAtBegin`, mark every planted building as fielded, write the round's `fielded` record (§14.4), compile combos per squad, and run the arrival: both formations' units appear on the same tick at the positions `formationOf` gives (`clashStarted`, `arrived`). Fire `clashStart` triggers. Enter the clash.

*Clash* (`step`: exactly one tick):

1. Clear events; `tick++`; snapshot previous positions.
2. Execute queued commands for this tick (the power), sorted by (side: player first, then seq).
3. The clash clock against the 45 s cap.
4. AI think (every 20 ticks): only the power, for a side with `powerPolicy: 'auto'`. Nobody buys in a clash.
5. Targeting (staggered).
6. Movement, then separation.
7. Attacks: start cooldowns and schedule hits.
8. Resolve hits due this tick (this sets units' `lastCombatTick`), then spore clouds' pulses.
9. Healing.
10. Deaths and removals: fire `unitDeath` triggers.
11. Merging (every 10 ticks for new trios; every tick for active knits).
12. Lane ends (§6.7): a lane where one side has no units and no emplacements left ends (`laneWon`). At the cap, every lane still fighting is decided on surviving supply.
13. When every lane has ended, score the round in §6.7's integer order: per lane 25 × the margin, with siege units counting double, then the Sporestorm's multiplier and the loser's damage-taken modifiers in basis points, each floored, then the sum over lanes capped at 500 per Heartcap; `heartcapDamaged`; push the `RoundResult`. Then check the battle's end (§6.5): a Heartcap at 0, or round 9 scored (a Decision). If it has ended, set `outcome`. Enter the aftermath either way.
14. Stats sampling (every 20 ticks).

During the muster that opens a clash (§5.6), nobody moves or attacks, and squads set to merge knit in place by §5.6's rule. A power command may run from the first tick, the muster included (§6.6).

*Aftermath* (`step`): if `outcome` is set, emit `battleEnded` and enter `ended`; the last round has its aftermath like any other (§4.7, §6.5). Otherwise open the next round, as above. Nothing is simulated in the aftermath itself.

Retired from v1's order: the clock and waves, the income tick, building timers and spawns, the AI's buying while live, and territory capture and flips.

---

## 15. Testing and verification tooling

Everything here is runnable by Claude, headlessly, from the project root.

**Tests follow the spec** (§1.3 #13). Until R2 lands, the tools and tests below run on v1's code, as the [v1 spec](https://github.com/Swalliso/Sambattler/blob/aa37365/SPEC.md) describes them. R2 replaces v1's battle with the round loop (§4.7), and in the same change it:
- removes the tests and guardrails of every retired system along with that system's code (Appendix A);
- adds tests for rounds, planning, clashes, formation and lives, and R3 adds them for the kit (§15.7);
- regenerates the golden replays for the round loop (§15.5);
- moves the guardrails to their round forms (§12.3).

### 15.1 npm scripts

| Script | What it does |
|---|---|
| `dev` | Vite dev server on :5173 |
| `build` | `typecheck`, then `vite build` into `dist/` |
| `build:dev` | `typecheck`, then the dev-site build (`vite build --mode develop`, §13.8) |
| `preview` | Serve `dist/` on :4173 |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint, including the sim purity rules |
| `test` | Fast unit suite (`vitest run tests/unit`), under 30 s |
| `test:slow` | Guardrails and multi-seed sims (`vitest run tests/slow`, §12.3) |
| `test:browser` | Browser tests (`vitest run tests/browser`): Playwright Chromium against a Vite server (§15.6) |
| `validate:data` | zod-validate every data file and check cross-references |
| `sim` | Headless battle, run and meta simulator (§15.2) |
| `balance` | Duels, tournaments, guardrail reports (§12.2, §15.3) |
| `experiment` | Measures a prototype against the guardrails and the opt-in checks, including the clash check from R1 (§12.2, §15.3) |
| `bench` | Performance benchmark (§15.4) |
| `golden` | Verify or update golden replays (§15.5) |
| `screenshot` | Playwright browser check (§15.6) |
| `og-image` | Render the link-preview image `public/og-image.png` (1200×630) from the title screen (§13.8) |
| `verify` | `typecheck` → `lint` → `validate:data` → `test` → `golden verify` → sim smoke tests (a battle against the general over 3 seeds, the adaptive general over 2, and Armilla's and Cordis's powers) → `bench --quick`. One command, non-zero exit on any failure. R2 rewrites the smoke tests' asserts in round form (§15.2) |

### 15.2 Headless simulator: `npm run sim -- [options]`

From R2, a battle is a series of rounds (§4.7), and the simulator plays planning, clash and aftermath for both sides. Ticks run only in clashes (§4.2), so the options and the output count rounds, and ticks within a round's clash. Until R2, the options and output are v1's.

| Option | Meaning |
|---|---|
| `--map <id>` | Map (default `bogwater-hollow`) |
| `--seed <n>` / `--seeds <a>..<b>` | One seed or a range (multi-seed prints a summary table) |
| `--player <ctl>` / `--enemy <ctl>` | `bot:<id>` · `general:<id>` · `general:scripted` (v1's Milestone 1 general, §7.9) · `replay` |
| `--scenario <id>` | Start from `data/scenarios/<id>.json`: each side's planted colony, kit, gold and Heartcap, and the round to start in; or units already placed for a clash, for rule tests. Until R2: v1's pre-placed buildings, units, gold and clock |
| `--replay <file>` | Replay a command log |
| `--until <end \| r<n> \| r<n>:<tick>>` | When to stop: the battle's end (the default), the end of round n, or tick t of round n's clash. Until R2: `end`, ticks or `mm:ss` |
| `--battle-index <n>` | Battle index for scaling (default 1) |
| `--flags <list>` | Feature flags: `merging`, `drafts`, `adaptive`, `powers` (defaults follow the milestone) |
| `--auto-draft <first \| random \| greedy>` | Draft policy for bots |
| `--commander <id>` / `--power-policy <none \| auto>` | Player commander, and whether bots fire its power, at most once per clash (§6.6) |
| `--bot <id>` | Bot used by `--meta-progress` (M6) |
| `--run` / `--auto-route <policy>` | Simulate a whole run: route, battles, drafts, events and lives |
| `--meta-progress --runs <n>` | Simulate profile progression over N runs (M6) |
| `--hash-every <ticks>` | Record state hashes at checkpoints: the end of every phase of every round, plus every n ticks of each clash |
| `--assert <expr>` (repeatable) | `<path>[@<checkpoint>]<op><value>`, with `op` one of `= != < <= > >=`. `path` is a dotted path into the result JSON (indices allowed, e.g. `roundLog[0].lanes[0].winner`); `@r<n>` reads the summary recorded at the end of round n, and `@r<n>:<tick>` at tick t of its clash (assert checkpoints are recorded automatically). Examples: `winner=player`, `by=rout`, `rounds<=9`, `hash@r3=<hex>`, `roundLog[2].lanes[0].capped=false`, `counters[0].kind=swarm`. Exit code 1 on failure. |
| `--out <file>` / `--summary` | Write JSON to `artifacts/sim/…`, or print a table |

Single-battle JSON output:

```json
{ "seed": 1, "map": "bogwater-hollow", "winner": "player", "by": "rout",
  "rounds": 7, "clashTicks": 3480, "clashTime": "2:54", "wallMs": 240,
  "finalHash": "9f2c41d07ab35e18", "hashes": { "r1": "…", "r2": "…" },
  "heartcap": { "player": 2450, "enemy": 0 }, "dealt": { "player": 2000, "enemy": 550 },
  "roundLog": [
    { "round": 1, "storm": 1.0, "taken": { "player": 225, "enemy": 0 },
      "lanes": [{ "winner": "enemy", "ticks": 610, "capped": false, "survivors": { "player": 0, "enemy": 9 } }] }
  ],
  "fielded": { "player": { "sporeling": 64, "capguard": 21 }, "enemy": { "…": 0 } },
  "merges": { "player": { "2": 0, "3": 0 } },
  "goldEarned": { "player": { "stipend": 600, "economy": 400, "interest": 55, "comeback": 120 } },
  "counters": [], "rejectedCommands": 0 }
```

- **`roundLog`** has one entry per round. For each lane it gives the winner (or none, §6.7), the clash's length in ticks, whether it reached the 45 s cap, and each side's surviving supply. `taken` is the Heartcap damage each side took in the aftermath, after the Sporestorm's multiplier (`storm`, §6.4), any damage-taken modifiers and the cap (§6.7).
- **`dealt`** totals each side's Heartcap damage for the battle, which decides a Decision after round 9 (§6.5).
- **The result also carries** `events` (counts per event type), `stats` (the §5.7 counters per side, per round), `fielded` (units fielded over the battle, by type, summed from the state's per-round `fielded` record, §14.4) and `counters` (each counter cycle's kind and the round its buildings first stood in the general's colony, §7.4).
- **The multi-seed summary** shows win rate per side, the median, min and max rounds, the share of battles that reach round 9, the share of clashes that reach the 45 s cap, the median clash length, the mean `wallMs` and any failed asserts.
- **A run** (`--run`) adds each battle's result, lives lost and left (§8.5), and how the run ended.

### 15.3 Balance and meta tools

- `npm run balance -- duel [--seeds 5] [--supply 60]`: squad and supply duel matrices (§12.2). `--supply 60` re-runs the supply duels at army scale (G2 itself stays at its data value).
- `npm run balance -- tournament [--seeds 40] [--commanders all | <a>,<b>]`: win-rate tables and length distributions for the strategy bots against the general. The bots are `bot:balanced`, `bot:rush`, `bot:turtle` and `bot:greedy`, against the scripted general on Bogwater Hollow; from R2 they play battles of rounds, and the table reports rounds per battle (§12.2). `--commanders` plays whole runs per commander instead.
- `npm run balance -- guardrails [--seeds n]`: the guardrail verdicts on their own.
- `npm run experiment -- [--proto <spec>] [--checks <list>] [--label <name>]`: measures a prototype (`src/data/proto.ts`), or the shipped rules without `--proto`, and writes `reports/experiments/<label>.json`.
  - **Checks:** `duels`, `g3`, `g4`, `g5`, `g6`, `g7`, `g8`, `g11` and `boss` by default. Opt-in: `g3gill` (G3's mono Gill Nest per seat), `counters` (the counter matrix, G12), `engagement`, `runs`, `lanes` and `spread`. R1 adds `clash` and `pairings` (§12.2, §16 R1).
  - **Common options:** `--maps`, `--mono`, `--g3seeds`, `--g4seeds`, `--seeds`, `--runs`, `--commander`, `--power-policy` and `--workers` (cells play in worker threads with the same results; 1 plays them in process). The counter matrix also takes `--answers`, `--top`, `--screen-seeds` and `--confirm-seeds`.
  - **The clash check** (`--checks clash`, R1, §12.2): every army is built in the main thread, and each distinct clash is played once, on `--workers n` threads (default half the machine's; 1 gives the same results in process). It prints the squad table, the bars per budget beside the pooled result, the clashes played and the wall time. The report holds the options, the armies, the bars, the clash matrix, the race section, the full-colony and overflow tables and a `timing` block.
    - **What it plays:** `--budgets` (default 300,600,900,1200,1500) on `--fields` (default `one,twin`; `three` is the three-lane screen, outside the bars and the means). Clash G3 is every mono against `bot:balanced`, in both seats, `--g3seeds n` a seat (default 50). G12's strict matrix takes the monos whose clash G3 mean is above 40%, every mono with `--matrix all`, or the `--mono a,b` builds. It screens the answers (`--answers a,b`, default every answer the counter check tries but the economy and utility monos) on `--screen-seeds n` a seat (default 20) and confirms the best `--top n` (default 3) on `--confirm-seeds n` more (default 50). The G4 row is `bot:balanced` against `general:scripted` on the one-lane field, `--g4seeds n` a seat (default 50 here), and `bot:balanced` against itself.
    - **Measurement options:** `--jitter j` moves each unit up to ±j tiles per axis after the muster (default 0; numbers are quoted at 0.2, beside the jitter-free run). `--records` keeps every clash's record. `--proto <spec>` refuses `rework`.
    - **Variants,** each in the report's options and its default label: `--merging off`; `--squad-seconds S` (v1's timers over S seconds, in whole batches); `--squad-scale S` (the 60 s squad × S / 60); `--squad id=n,…` (a fixed squad per building); `--copies N` (no card more than N times, and a capped mono's other plots and gold go by `bot:balanced`'s weights, #51); `--core6 <id>` (the core-six check with that candidate: the builds, the answers and the G3 reference `bot:core6` limited to the five core spawners and the candidate, with §11.4's graph on clashes); `--mirror` (each G3 build and the reference against its own merge-off twin, 20 seeds a seat); `--extra-plots n` (n more plots a side from 1,200 gold); `--lanes-rule general` (§7.3's round-1 rule on Twin Roots); `--v1-movement` and `--v1-targeting` (each switch off).
    - **One matchup:** `--pair a,b` plays any bot the counter check knows, or a general, at each budget on each field for seeds 1 to `--seeds n` (default 3), with `a` in each seat, and prints one line per clash. A mirror builds its second army on seed 1,000 + s. It refuses the variant options.
  - **Battle 1's pairings** (`--checks pairings`, R1, R2-Q13): each commander's starter candidates (the monos and even pairs of its army cards) against each battle-1 general's army (its opener and weights on its battle-1 kit, §7.8), the general in the enemy seat, at `--budgets` (default 300,600,900) on `--fields` (default `one,twin`), `--seeds n` (default 20), `--jitter j` as given, on `--workers n`. Passives are off: a clash plays both sides as human. It prints each pairing's best candidate and its win %, and the share of pairings with no answer at 60% or more.
  - **In R2:** `g4` and `g6` take their round forms, `boss` and `runs` report lives, `engagement` is rewritten in round terms, `lanes` is retired with territory, and `spread` becomes the formation check (G16).
- `npm run sim -- --meta-progress --runs 40 --bot balanced`: unlock pacing curve against the §9.8 targets (M6).
- `balance` writes `reports/balance/<timestamp>-<mode>.{md,json}` and prints the guardrail verdicts.

### 15.4 Benchmark: `npm run bench [-- --quick]`

- **Scenario `bench-300`:** the 3-lane test map with 150 units per side placed mid-field and 20 buildings per side, with merging off so all 300 units stay live. R2 rewrites it as a clash: both armies in formation, merging still off (§13.7).
- **The full-colony clash (from R1):** one whole clash, to its end, of two full colonies at the true worst case: every plot a colony can hold (12 on one lane, 16 on Twin Roots, §4.6), each with the biggest squad (today the Burrow's upgraded 12 Sporelings), merging off. It times the arrival and every tick, and checks that a full colony fits the performance budget, at most 150 live units a side when the armies arrive (§1.3 #4, §13.7). If one doesn't fit, the report names the lever that brings it inside: squads, the upgrade's +1 per batch, or plots. For each field it prints the colony (plots, squad, and units and supply a side against the 150), the arrival's time against 5 ms, the ticks to the clash's end, and the tick mean, p95 and p99 against G11's. Until R2 adds it to G11 it's report-only: it doesn't change the exit code, and `--quick` skips it.
- **The full battle:** one headless battle, timed against §13.7's wall-time budget. From R2 it's a battle of rounds, bots on both sides.
- **Run length:** 2,000 ticks (400 with `--quick`).
- **Output:** mean, p95 and p99 ms per tick, peak unit count, and heap growth. From R2 it also times a clash's first tick, when both armies arrive, and the general's planning turn (§13.7).
- **Pass/fail:** exits 1 if a §13.7 budget is exceeded (G11).
- **Before M7:** until the 3-lane map ships, the bench uses an internal test map, `data/maps/test-3lane.json`, which is excluded from play.

### 15.5 Golden replays

- **Files:** `tests/golden/<name>.replay.json` contains `{ config, commands, expected: { "<checkpoint>": "<hash>", "final": "<hash>" } }`. From R2 each command carries the round and phase it was issued in, and the checkpoints are the end of every planning phase, clash and aftermath. A run replay (`kind: "run"`) holds a seed and autoplay policies, and pins every battle's checkpoint hashes plus the final run-state hash.
- **`npm run golden -- verify`** replays every file and reports the **first** checkpoint that diverges.
- **`npm run golden -- update`** rewrites the expected hashes. Run it only after an *intentional* behavior change, and say so in the commit message. Data changes move the hashes too, display text included, because every battle copies the data's text into its state.
- **R2 regenerates the set for the round loop.**
  - **Until R2,** the v1 replays (`m1-…` to `m5-…`: two M1 battles against the scripted general, M2's merge mirror, M3's run, M4's adaptive Old Mother Mold and one M5 replay per commander's power) pin v1's battle.
  - **R2 retires them** with v1's battle code, and records replays named the same way (`<milestone>-<what>-s<seed>`). They MUST cover:
    - a battle of rounds against a general that plans first;
    - Twin Roots, where each lane is its own clash;
    - the merge mirror, knitting at the muster (§5.6);
    - a whole run with drafts after rounds 2, 4 and 6 and a life lost;
    - each commander's power, once per clash.
  - **R3 adds replays** for the kit's copies, augments, combos and run packs.
  - R2's regeneration is when the plain wording kept in `src/ui/words.ts` SHOULD move into `data/*.json` (§10.4).
- **Determinism tests** in the unit suite:
  - running the same config and commands twice gives equal hashes at every phase boundary and every 200 ticks of each clash;
  - snapshot at any checkpoint or clash tick → restore → continue gives the same final hash as an uninterrupted run;
  - a resume from each save point (§8.9) matches the uninterrupted run: from a planning phase, and from a save requested during a clash or an aftermath, which keeps the Begin save and replays the clash from it.

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
| `scene` | `title` (the default: with no `scene` and no battle parameters the page opens on the title), `run` (resume the saved run or start one, skipping the title), `battle` (the default when battle parameters are given), `draft`, `report`, `route`, `summary`, `underroot`, and the tool `sounds` (the sound board, §13.9). Until R2, `deploy` opens v1's deploy phase; from R2 a battle opens in round 1's planning, and `deploy` is retired |
| `map`, `seed`, `battleIndex` | Battle setup |
| `player`, `enemy` | Controllers: `human`, `bot:<id>`, `general:<id>` |
| `scenario` | Start from a scenario file |
| `round`, `phase` | From R2: play the earlier rounds headlessly with the controllers, then open round n in `planning` (the default), `clash` or `aftermath` |
| `ticks` | Fast-forward the sim headlessly to this tick (or `end`) before the first frame. From R2, a tick of the clash in `round` |
| `paused` | `1` = start paused (stable screenshots) |
| `flags` | Feature flags, as in the CLI |
| `proto` | A balance prototype spec (§12.4). On the dev site a prototype run saves under keys of its own; elsewhere it never saves |
| `debug` | `1` = debug overlay and the `window.__GAME__` bridge |
| `test` | `1` = the bridge without the overlay; sound is off |
| `sound` | `1` = sound on in an automated browser, where it is off by default (`test=1` still wins) |
| `autoplay` | Let bots play through `run` (a whole run) or `battles:<n>` (the first n battles), for route and summary screens |
| `tab`, `profile` | Underroot tab; `profile=fixture:<name>` loads a test profile from `tests/fixtures/` |
| `targeting`, `measure` | `targeting=1` opens power targeting (in a clash, from R2); `measure=frames` records frame times into the bridge |

**Bridge** (`window.__GAME__`, only with `debug=1` or `test=1`): `{ ready, scene, tick, hash, summary(), run(), battle(), errors[] }`. R2 adds `round` and `phase`. `battle()` is the live state, for browser tests that stage a HUD case (a smaller kit, less gold); changing it gives up the hash check.

**Assertions** the script makes before saving:

1. No console errors and no page errors.
2. `__GAME__.hash` equals the hash from headless `npm run sim` with the same parameters at the same checkpoint (from R2, the same round, phase and tick). This cross-checks Node against the browser.
3. The canvas isn't blank: at least 12 distinct colors in a sampled grid, and both team tints present in their colonies.
4. The HUD agrees with the state. For example, `#hud-gold` equals `summary().gold.player`. From R2 the plots chip, the round chip, both Heartcaps and the lives agree with the summary, and in planning the general's whole colony and formation are drawn before the player's first command (§7.5, §10.2). On run screens the DOM agrees with the run: the route's six rows and node icons, the draft's cards, the summary's battles, the intel bars, and on the title the wordmark, a primary button, How to play and Settings. The title holds no run or battle yet, so its hash check compares empty hashes.
5. It writes `artifacts/screenshots/<name>.png` and a matching `<name>.json` summary.

Claude then **opens the PNG with the Read tool** and checks the milestone's visual checklist. For interactive spot checks it can also open `npm run dev` in its built-in browser pane.

**Browser tests** (`npm run test:browser`, `tests/browser/`) drive the real UI in Playwright Chromium against a Vite server, for what a screenshot can't show: the HUD's layout and tooltips, the run screens, settings and their saves, sound under `?test=1`, UI scale, resume, and prototype saves. R2 retires the cases for retired controls (deploy, Hold and its `F` key, forward plots and their price) and adds the planning screen: the general's army shown before planning, placing and selling on plots, the merge preview, Begin, and the power once per clash (§10.2, §10.3). It also adds resuming a battle saved before R2, which restarts round 1's planning with its notice (§8.9).

### 15.7 Unit test map (fast suite)

"In v2" says what happens to each area's tests: **kept**, **rewritten** in R2 for rounds, **retired** with the system they test (in R2, along with its code), or **new**.

| Area | Examples of what's asserted | In v2 |
|---|---|---|
| RNG | Fixed seeds give fixed sequences; streams are independent | Kept |
| Data | Every file validates; references resolve; maps are point-symmetric; sprite rows have the right width. From R2: each colony's plots, loam and stumps are legal and mirror between the sides (§4.6). From R3: kit cards, copies, augments, combos and packs reference real ids | Kept, extended |
| Matrix and damage | Formula results for every type pair; tag multipliers; rounding; minimum 1; pinning, spore clouds, cleave and bursts (§5.3) | Kept, extended as the rework's pieces become rules |
| Rounds (R2) | The order of a round's steps (§4.7): income from round 2, the Sporestorm multiplier, `roundStart` triggers, the general plans, the draft on rounds 3, 5 and 7 (after the general has planned), the player plans, Begin, the clash, the aftermath; nothing but the colony and gold carries between rounds; every squad is fielded fresh; the last round has its aftermath, then the battle ends at a Heartcap at 0 or after round 9 | New |
| Planning (R2) | No ticks pass while planning (§4.2); the general's plan is complete before the player's first command is accepted; the general's plan doesn't change with what the player plants in the same phase; planting and selling happen only in planning; the merge preview equals what fields (see Merging) | New |
| Formation (R2) | A plot's rank and file set its squad's slot; the formation box is set mid-lane with front ranks 6 tiles apart; economy plots leave holes; `formationOf` is a pure function of the colony and draws on no random stream; each slot's k × k grid fills front to back, then top to bottom, with front toward the enemy, and a squad too large for its slot packs tighter (§4.6); the preview's positions equal the arrival positions; the general's formation rule and lane choice (§7.3); the colony mirrors for the general | New |
| Clash and aftermath (R2) | Both armies appear on the same tick; nobody moves or attacks in the 1 s muster (§5.6); a lane ends when one side has no units and no emplacements left in it, and an emplacement counts 0 supply; at 45 s the side with more surviving supply wins and its damage counts only the difference; on Twin Roots each lane is its own clash; round damage in integers by §6.7's steps, with the Sporestorm from round 5 up to ×2.0 (§6.4) and the 500 cap. §6.7's edge cases get one rule scenario each, named by its ID: E1 only one side fields units in a lane, E2 neither side does, E3 a tie at 45 s, E4 both sides wiped out on the same tick, E5 both sides left with only emplacements at 45 s, E6 a win with only emplacements left (0 surviving supply), E7 two lanes with different winners, E8 both Heartcaps at 0 in the same round. Each asserts the winner, the margin, the damage and who gets comeback gold | New |
| Kit (R3) | Copies limit what's planted at once; selling returns the copy; a blueprint adds a card with 1 copy and a drafted owned card adds a copy; augments compile onto squads and show; combos fire on in front of, behind and beside; the run deals 4 of 10 packs and the always-in set (§8.4, §8.10, §11.13–11.15) | New |
| Territory | Frontier-only capture; the 1.5× rule; 60-tick flip; decay; forts block; home columns never flip; a single neutral column contested by both sides | Retired (§4.3) |
| Economy | Stipend, Truffle Cellars and loam plots, interest floor and cap on gold banked at the end of planning, comeback gold to the last round's loser (§6.2). v1's besieged halving and supply-line price go | Rewritten |
| Buildings | Placement only on free plots, never on stumps; sell refunds (100% in the planning phase it was planted, 60% once it has fielded); the squad each spawner fields; the tray's price is one you can plant for now. v1's first-spawn timing, holding at the supply cap, no selling while besieged and the forward plot's price go | Rewritten |
| Combat | Target choice, stickiness and tie-breaks; siege and slayer preferences; projectile delay; splash falloff; healing | Kept, minus the tests of the v1 parts §13.4 removes (buildings and Heartcaps as targets, turrets, call for help, rush, fall-back and dive) |
| Powers (M5) | Each power's effect, targeting validation, the auto policy and determinism. From R2: ready from the clash's first tick, during the muster too, and at most once per clash; the cooldown and first-ready time are retired (§14.2); new effects where a power was tied to a retired system (§6.6, §11.10) | Rewritten |
| Rule scenarios | The `data/scenarios/` files assert their outcomes in the fast suite too. v1's territory and besieged scenarios (`fort-blocks-flip`, `home-never-flips`, `besieged-control`, `besieged-half-speed`) and `comeback-6` go. R2 adds round scenarios, such as the general planning first, the formation from plots, the 45 s cap, the round-damage cap, the Decision after round 9, and one per §6.7 edge case, E1 onward (§16) | Rewritten |
| Endings and lives | A Heartcap at 0 (Rout); the Decision after round 9 by Heartcap damage dealt, and its tiebreakers; both Heartcaps reaching 0 in the same aftermath (E8, §6.7); both Heartcaps full and both colonies empty at each battle's start (§4.6); a lost battle costs one life and a won battle none; the run ends at 0 lives (§6.5, §8.5) | Rewritten |
| Merging (M2) | Eligibility; radius; knit cancel; HP carry; supply ⅔; toggle propagation. From R2: squads set to merge knit in place during the muster, on `formationOf`'s positions, to a fixed point; `mergePreview` is the same function, so the preview equals what fields, with two Burrows side by side and three in a row as cases; after the muster v1's rule applies on the field (§5.6). v1's presence goes | Kept, extended; presence retired |
| AI (M4) | Analysis scores for the squads fielded, read only from the per-round `fielded` record (§14.4); doctrine weights; buying from its kit under the plot rules, and from R3 the copy rules; selling for space; intel decay. v1's warning and activation ticks go with the telegraph | Rewritten |
| Run (M3) | Route constraints; draft weights and exclusions; effect compilation order; rewards; the commanders' pools, starter kits and bans; save round-trip between rounds. From R2: a run saved before R2 migrates or ends with a visible notice, never silently (§8.9) | Kept, extended |
| Report | The battle report's gold rows add up to the gold the banner shows. From R2 it reports by round: each round's result and the damage by building (§10.5) | Kept, extended |
| Meta (M6) | Feat conditions; strain patching; trait capacity; mastery thresholds; migrations | Kept |
| Sound | The sound bank's schema and references; cooldowns per key; the voice cap and priority stealing; speed thinning; the engine as a no-op in Node; which battle events make sounds, at whose gain; settings migration | Kept |
| Settings and contrast | Older settings records load with new fields at their defaults; unknown values fall back; listeners hear each change. Every text pair the UI uses is 4.5:1 or better and every control edge 3:1 or better, read from the tokens in `styles.css` | Kept |
| Plain words | Every rewording in `src/ui/words.ts` names a real id and keeps every number the data's own text gives | Kept until the wording moves into data (§15.5) |
| Teaching text | What Help, the first-time tips and the top band's tooltips teach agrees with the rules and the data | Rewritten in R2, and again with R4's Help |
| Prototypes | Each `src/data/proto.ts` knob is absent from `data/balance.json`, so the shipped rules are unchanged; with the knob set, the prototype behaves as described. Knobs tied to retired systems go with them in R2, as §16's R2 lists (for example `waves`, `stormwaves`, `callforhelp`, `hold` and `nohold`, and `mixedwave` unless R1 keeps the shields); the pieces R1's chosen set keeps (pinning, spore clouds, cleave, the Burster, the Rhizomorph) move to the areas above when R2 adopts them | Rewritten |
| Counter matrix | Its answer bots join the content through a proto spec without touching the shipped bots; a tiny run screens and confirms | Kept |
| Purity | No forbidden imports or globals in `src/sim`, `src/run` or `src/meta` | Kept |

---

## 16. Milestone plan

**The first release = Milestones 1–5, R1–R4 and 6–8,** in that order. Milestones 1–5 were built under v1. R1–R4 rebuild the battle for v2 (§1.3), and Milestones 6–8 keep their numbers and are rewritten for v2. R4 comes in two parts: R4a runs beside R1 and lands before R2's first playtest, and R4b follows R3 (X3, Milestone R4 below).

Every milestone:

- leaves the game playable in the browser,
- passes `npm run verify`,
- ends with a commit summarizing the verification output.

From R2 on, every milestone also:

- is built on feature branches and merged into `develop` as the new default, never as a `?proto=` knob (§1.3 #13);
- removes the tests, goldens and guardrails of any system it retires, in the same change. Tests follow the spec, not the other way round (§12.3, §15).

The verification blocks below are written so Claude can run them unattended. Screenshot checks always end with Claude opening the PNGs and walking the visual checklist. Commands and URL parameters that a milestone adds (for example the clash check, or `round` and `phase` in a screenshot) are built in that milestone and documented in §15.

### Milestone 1 — Territory core vertical slice (one battle)

**Built under v1.** One playable battle on Bogwater Hollow against the scripted general (§7.9):

- the scaffold, the data pipeline (zod schemas, `registry.ts`, `validate:data`) and the text-sprite atlas with the Gray Rot palette swap;
- the deterministic sim core: state, RNG streams, the command queue and log, events, stats, hashing, snapshot and restore;
- v1's battle systems: economy on an income tick, spawn timers, targeting, movement, combat, towers, Heartcap turrets, territory, the timed Sporestorm, and Rout and Decision endings;
- the battle screen with a deploy phase and Begin, and the tools `sim`, `balance duel`, `bench`, `golden`, `screenshot` and `verify`.

Its goldens are `m1-balanced-vs-scripted-s1` and `m1-turtle-vs-scripted-s2`. Its playtest gate's answers are F1–F3 in `docs/playtest-feedback.md`.

**In v2:** the scaffold, the pipeline, the sim core and the tools stay. Spawn timers, territory, turrets, the income tick and the 10:00 Decision retire in R2 (Appendix A). The full scope and verification are in the [v1 spec's §16](https://github.com/Swalliso/Sambattler/blob/aa37365/SPEC.md#16-milestone-plan).

### Milestone 2 — Merging and combat depth

**Built under v1.** Merging per §5.5–5.6 (eligibility, knitting, tiers, per-building toggles, perks), with tethers, glow and pips; the Scythecap Grove and the Veilstalker Hollow; hit sparks by effectiveness and the damage-numbers setting; the Help overlay with the matrix; the battle report; merge policies for the general and the bots. Its golden is `m2-merge-mirror-s3`.

**In v2:** merging's rule stays (§1.3 #9). The bigger Bloomed and Elder sprites give way to pips in R4, and the report's front-line graph gives way to a chart by round in R2 (§10.4). The full scope is in the [v1 spec's §16](https://github.com/Swalliso/Sambattler/blob/aa37365/SPEC.md#16-milestone-plan).

### Milestone 3 — Run loop: route, drafts, relics, carryover

**Built under v1.** The run: the route map, starting gold that grows each battle, Heartcap HP carried across the run with repairs, drafts (blueprints, upgrade tracks, relics, rarity, rerolls, skip), the effects DSL, the Grove, 8 events, rewards and the run summary, save and resume, Stumpfield and Twin Roots, and Tender's Ring with healing. Its golden is `m3-run-s7`.

**In v2:** the route, the nodes, events, rewards, relics and the effects DSL stay. The run's Heartcap and its repairs give way to per-battle Heartcaps and lives in R2 (§1.3 #2), and upgrade tracks give way to augments in R3 (§11.6, §11.13). The full scope is in the [v1 spec's §16](https://github.com/Swalliso/Sambattler/blob/aa37365/SPEC.md#16-milestone-plan).

### Milestone 4 — Adaptive general and intel

**Built under v1.** The counter cycle (spawn-mix analysis, the four counter kinds, the vague telegraph, doctrine activation), the intel file across battles with intel bars on the route, the three generals and the Pale Sovereign with passives, elite modifiers and enemy kit progression, and five buildings: the Hammercap Forge, Amanita Lodge, Morel Warren, Rhizome Vault and Spore Exchange. Its golden is `m4-adaptive-mold-s4`.

**In v2:** the counter kinds, the intel file and the generals stay. The general now plans first and you see its whole army, so the telegraph retires in R2; the counter cycle counts rounds and reads the squads you actually fielded (§7.4, §7.5). The full scope is in the [v1 spec's §16](https://github.com/Swalliso/Sambattler/blob/aa37365/SPEC.md#16-milestone-plan).

### Milestone 5 — Commanders and powers

**Built under v1.** The commander select screen; Vesper, Armilla and Cordis, each with a passive, a power, a core pool and a starter kit; bans of up to 3 buildings; the power's UX (`Q`, then click, with targeting while paused); and powers for bots in sims through `--power-policy auto`. Its goldens are `m5-vesper-power-s3`, `m5-armilla-power-s3` and `m5-cordis-power-s3`. M5 is on `develop`; `main` has M1–M4.

**Alongside M1–M5:** the UI/UX plan's phases 1–3 (§10), sound (§13.9) and the combat rework's prototypes behind `?proto=rework` (`src/data/proto.ts`, `docs/archive/v1/ideas/combat-rework.md`).

**In v2:** commanders and bans stay. A power fires at most once per clash instead of on a cooldown (§6.6), and Vesper's passive, Armilla's passive and Armilla's Rhizome Tithe get new effects because the systems they relied on retire (§11.10). The full scope is in the [v1 spec's §16](https://github.com/Swalliso/Sambattler/blob/aa37365/SPEC.md#16-milestone-plan).

### Milestone R1 — The clash check

**Goal:** before the round loop is built, find out whether whole armies that meet at once, in formation, give every strong army an answer, and set squad sizes. R1 changes no rule in the game. Its design is this section and §12.2's clash check, and its plan, `docs/r1-plan.md`, was agreed with the user on 2026-11-01. It began as the clash prototype in the archived `docs/archive/v1/ideas/rounds.md`, which is background only (§0): that prototype keeps the supply cap of 60 and knits squads on the approach, and v2 drops both.

**Scope:**

- **The tool:** a headless check, `npm run experiment -- --checks clash`, plus a clash row in `tools/lib/balance.ts`, built on `createBattle`, `addUnit`, `addBuilding` and `runHeadless` as the supply duels are. The full check runs on `tools/lib/pool.ts`'s worker pool; §12.2 gives its expected cost.
- **Armies from build lists:**
  - Any bot spec the counter check uses (mono bots, the pairs, `bot:balanced`, the hand-written answers) gives its opener, then its weighted picks, until no card it can pick fits the gold left or the plots are full.
  - The budget counts army buildings only, since one clash can't value economy. Economy and utility cards (the Truffle Cellar, the Spore Exchange and the Rhizome Vault) are filtered out of the opener and the weights before any draw.
  - A pick that doesn't fit the gold left is skipped, and drawing goes on. `maxOwned` holds, and `afterSeconds` is ignored.
  - Each army draws from its own stream, keyed by the seed and the bot, so an army is the same in both seats and against every opponent.
  - The mono builds (G3's monos, the counter matrix's builds and its mono answers) are the army buildings: every spawner, the Tender's Ring included, and the Puffball Mortar.
  - Each spawner adds its squad, from §11.2's Squad column: one minute of today's spawns in whole batches, halves rounded up. `--squad-seconds` changes the minute. A Puffball Mortar adds itself as an emplacement, under §6.7's first-guess rules for emplacements.
  - **Limits:** no supply cap (§1.3 #4). The plots are the limit: 8 on a one-lane field and 6 per lane on Twin Roots, and every budget is measured at these base plots. A separate "late-run colony" reading adds all 4 plots sprawl can open at 1,200 and 1,500 gold, opened in §18.2 #19's first-guess order (§4.6).
- **Formation, by role:**
  - **The line** follows §7.3's tags. A spawner whose unit has the `ranged`, `support` or `burst` tag, and every tower, stands in the back rank, 2 tiles behind. Every other spawner stands in the front rank.
  - **Files** fill centre-out, in build-list order: 2, 3, 1, 4 on one lane, and 2, 1, 3 in each Twin Roots lane, as §7.3 centres a partial army. A squad whose rank is full takes the first free slot of the nearest other rank: a front-line squad the back rank, then the third; a back-line squad the third rank, then the front.
  - **Formation by plot isn't R1's.** Placing a build list on plots needs §7.3's placement rule, so it's R2's, and G16 measures it.
  - **The slot layout:** R1 builds §4.6's layout (the formation box, its slots and each unit's place in its slot) as a pure function in `src/sim`, with no random draw. R2's `formationOf` reuses it (§14.6), so the check's squads stand where the game's will.
  - This adds code but no rule, so no golden hash moves.
- **Jitter, as a measurement option only:** the check MAY add a seeded jitter to where units stand at the start, to see how much a result depends on exact positions. It's the tool's own variation, not a game rule: the game's formation stays deterministic (§4.6). The jitter moves units after the muster's knits, so the muster gives what the game's preview would. Numbers are quoted at a jitter of ±0.2 tiles, with the jitter-free run beside them.
- **The clash:** both armies appear on the same tick at their slot positions, front ranks 6 tiles apart, on a flat field with the map's lanes, with merging on.
  - **It opens with §5.6's muster:** for 1 s nobody moves or attacks, and squads with merging on knit in place, by merging's rule, to a fixed point. The knits land on the clash's first tick (§5.6's first guess; R1 has no powers, so the timing inside the muster changes nothing). After the muster, v1's rule applies on the field. The archived prototype's knitting on the approach isn't R1's rule.
  - R1 builds the muster's knitting as a pure function in `src/sim`, beside the slot layout, and R2's `mergePreview` reuses it (§14.6). Like the layout, it adds code but no rule.
  - **The clash clock includes the muster** (§18.2 #13). The clash runs until one side is gone in every lane, or 45 s pass (§6.7).
  - **v2's targeting and movement:** the check turns on two tool-only flags. They live in `config.test` and are absent in every battle, so no golden moves. With `noBuildingPreference`, siege units fight the nearest enemy, as §5.2 says for rounds, rather than going for buildings first. With `idleSeek`, a unit with no target walks toward the nearest enemy in its lane that it could target, enemy towers included, rather than marching to the far edge (§5.2). Each can be turned off for a diagnostic screen, and R2 writes both as the rule.
- **The clash winner,** for G3 and G12: the side that won more lanes; then the side that dealt more uncapped Heartcap damage (storm ×1.0); else a draw, worth half a win to each side. §6.7's capped round result and the share of drawn rounds are reported beside it.
- **Records:** each lane's winner, surviving supply, the Heartcap damage §6.7 would deal, clash length (the muster included), whether the clash hit the 45 s cap, and merges, at the muster and after it. For the swarm read (§7.4, §11.1), each army's `eliteShare` after the muster, with each merged unit counted at its parts' base supply (a Bloomed unit its 3 parts' tier-1 supply, an Elder its 9), with and without `ai.counter.swarmMaxSupply`, plus the share of Elders alone and the four counter kinds' scores. §7.4's own reading of merged units is settled in R2.
- **The other §18.2 rows R1 settles** (#11–#15), each with a recorded measure or a variant:
  - **Overflow** (#11, §4.6): the report lists each squad that overflows its slot (units wider than its grid's spacing) at each squad size measured. The check fields such a squad by the first guess, packed tighter.
  - **Keeping formation on the approach** (#12, §5.2): a pace variant. Each lane's army marches at its slowest idle unit's pace, with idle ranged units 1 tile behind their side's frontmost melee unit, as the rework's waves did (`waves.matchPace` and `rangedGap`). The baseline is the first guess: each unit at its own speed.
  - **The muster and the 45 s cap** (#13, §5.6, §6.7): the report gives the stall share (G13) and the median clash length with the muster counted, as the first guess has it, and with the cap starting after the muster.
  - **An Anti-Ranged kind, and counter sets from the clash matrix** (#14, #15, §7.4): the report gives the clash matrix, each mono build's best answers at each budget, beside §7.4's counter sets by damage type and tag. It says whether `swarm` spawners are the best answers to mono Gill Archers.
- **Fields:** one lane of 8 rows (Bogwater Hollow and Stumpfield give the same clash, since units ignore stumps) and Twin Roots' two lanes of 6 rows. The one-lane field counts twice in any mean over the run's maps.
  - **The lane rule on Twin Roots:** in build-list order, each building goes to the lane with fewer buildings of its line (front or back). Ties go to the lane with fewer buildings in all, then the top lane, and a full lane falls back to the other. §7.3's round-1 rule (the lane with less planned supply, then the lower lane) runs as a variant.
  - **A three-lane screen:** `data/maps/test-3lane.json`, read as 3 lanes of 2 files and 2 ranks with no map edit, at 20 seeds, outside the bars.
- **Budgets:** 300, 600, 900, 1,200 and 1,500 gold of army, about rounds 1, 3, 5, 7 and 9. The report shows each budget beside the pooled result.
- **Variants,** each against the baseline of today's combat with the two flags on:
  - merging off, then only the Elder Sporeling's splash off;
  - squad minutes of 45, 60 and 75 s, and the Sporeling Burrow's squad at 6 and 7;
  - the rework's kept pieces (§1.3 #11), alone and together: pinning, spore clouds through the Mortar's emplacement, the Burster, cleave and the Rhizomorph.
    - Alone, each is a preset in `src/data/proto.ts` today: `pinned`, `sporecloud`, `burster`, `cleave` and `rhizomorph`.
    - Together, they're a new preset that R1 adds there, `kept`: those five, with both new spawners (the Burster Pod and the Rhizomorph Tunnel) appended to both rosters as `rework` does, since spreading presets keeps only the last one's append.
    - The variants that append spawners (`burster`, `rhizomorph` and `kept`) run G3 twice: with `bot:balanced` as the data has it, which buys the new spawners, and on its data weights. Their monos and pairs are listed apart.
    - Not `rework`: that's v1's P3 package (waves on a 20 s beat with `matchPace` on, mixed-wave shields, call for help, storm-grown waves, flyers, the swarm read and the Elder's splash off), and it has neither spore clouds nor cleave. It isn't R1's variant.
  - the sixth archetype's candidates (§11.2), the Burster Pod and the Puffball Mortar, each in a core-six check: builds and answers limited to the five core spawners plus the candidate, against a reference that weighs the six evenly, read against §11.4's intended graph;
  - copies (§8.10): every card capped at 2, 3 and then 4 buildings, beside unlimited. A mono holds that many of its card and spends the rest of its gold and plots by `bot:balanced`'s weights, a provisional rule for §18.2 #51. It's evidence for whether copies come before R3, which the review gate decides;
  - the pace variant (§18.2 #12, above);
  - last, the rework's mixed-wave shields, to see whether mixed armies need them. In a clash, at the arrival, each lane's army of at least `mixedWave.minTypes` unit types (2; a merged form counts as its base type) gives each of its units a shield of `shieldFrac` (0.2) × its max HP. A shield soaks damage first and never comes back, and a unit knit at the muster keeps its parts' shields in proportion, as today's merging does. Today `src/sim/compile.ts` compiles `mixedWave` only with `waves`; R1 lifts that requirement for the clash check.
- **The race model,** for the scoring curve (§6.4, §6.5, §6.7): `tools/lib/roundRace.ts` chains clash records into battles of up to 9 rounds. Its first case is G4's pairing (`bot:balanced` against the scripted general on the one-lane field), and G3's pairs follow. It reports rounds to fall, the share of battles reaching round 9, Routs and how often the lead changes, under the 500 cap and its alternatives (a cap at a share of the loser's max HP, the storm raising the cap, equal Heartcaps), with the share of clashes whose damage passes 500. It's crude, with no income, comeback gold or counters, and isn't a guardrail.
- **The bench case:** one whole clash of two full colonies at the true worst case (every plot a colony can hold, the biggest squads, merging off) for `npm run bench`. It's reported against §13.7's budget and doesn't change the exit code until R2 adds it to G11 (§13.7, §15.4).

**Not in R1:** the round loop, income, the general's planning, drafts, any UI, and any change to the game's rules or data. The knobs R1 adds to `src/data/proto.ts` (the `kept` preset, the pace variant, the shield at the arrival) are default-off, so without a spec the rules don't change (§12.4). The two flags for v2's targeting and movement are tool-only and absent in every battle.

**Done when:**

- the squad sizes are chosen and recorded as R2's starting data;
- a set of pieces is found that passes the bars below, and the report says whether that set needs the mixed-wave shields and the Elder Sporeling's splash (§18.2);
- the most a full colony fields is known, in live units and supply, against §13.7's budget of at most 150 live units a side when the armies arrive; if it's over, the report names the lever that brings it inside (squads, the upgrade's +1 per batch, or plots);
- §6.7's first-guess rules for emplacements are confirmed or changed;
- every §18.2 row settled by R1 (#7–#15) has its measure in the report and a recommendation;
- the results are in `docs/balance-backlog.md` and `docs/status.md`, and the user has seen them before R2 starts.

**Verification:**

1. `npm run verify`. No golden hash moves, since no rule changed. The unit suite covers the slot layout (§4.6's k × k grid, filled front to back, then top to bottom) and the muster's knitting to a fixed point, with two Burrows side by side and three in a row (§5.6, §15.7).
2. The clash check on today's combat, then on the kept pieces together:

   ```bash
   npm run experiment -- --checks clash --budgets 300,600,900,1200,1500 --jitter 0.2 --workers 8
   npm run experiment -- --proto kept --checks clash --budgets 300,600,900,1200,1500 --jitter 0.2 --workers 8
   ```

   Numbers are quoted at jitter ±0.2, with the baseline's jitter-free run (`--jitter 0`) beside them. The other variants run the same way, each with its own `--proto` spec or option (`--proto pinned`, `--squad-seconds 45` and so on). `--proto rework` isn't one of them.

   Seeds vary the bots' picks and the positions' jitter: 20 per seat for screens, and 50 for any number quoted. A draw counts half a win. Bars, pooled over the budgets:
   - **The strict counter bar** (G12): every mono build with a clash G3 mean above 40% has an answer that wins at least 60% on every field, among answers that pass G3.
   - **G3 on clashes:** each mono army against `bot:balanced`'s, at the same budget, has a mean over the maps of at most 55% and a worst map of at most 60%.
   - **Stalls** (G13): at most 15% of the clashes the check played reach the 45 s cap.

   A build that dominates only early or only late shows in the per-budget columns, and the report flags it.
3. `npm run bench` prints the bench case beside `bench-300`: units and supply a side, the arrival's time against 5 ms, and the tick mean and p99 against G11's. If a full colony is over §13.7's budget, the report names the lever.
4. **Review gate (human):** the user reads the report, agrees the squad sizes and the set of pieces R2 starts from, and settles the other §18.2 rows R1 measured (#8–#15), with the calls on copies before R3 and on the scoring curve.

### Milestone R2 — Rounds

**Goal:** the new battle. A battle is a series of rounds (planning, clash, aftermath) against one general that plans first, scored as a race between two Heartcaps, inside a run with lives. Placement means position, because the colony is the formation.

**Scope:**

- **The round loop** (§4.2, §4.7): phases `planning`, `clash` and `aftermath`, opening in §4.7's order; ticks only during a clash; squads fielded fresh each round with R1's sizes; both armies appearing on the same tick, in formation; the 45 s cap and how a lane's clash ends (§6.7); merging at the clash's opening muster, with the toggle set in planning and the preview equal to what fields (§5.6).
- **Scoring** (§6.4, §6.5, §6.7): Heartcap damage from surviving supply with the per-round cap, the Sporestorm's round escalation, per-battle Heartcaps, the end of a battle at a Heartcap of 0 or by Decision after round 9.
- **Lives** (§8.5): 3 a run; a lost battle costs one, a won battle never does. The Grove's "regain a life" (§8.7). Repairs retire, and Mending Moss keeps an in-battle heal as a first guess (§11.7).
- **The colony** (§4.6): fixed 2×2 plots in 2 ranks; the formation copied from the colony; loam and stump plots on each map (§11.9); the colony gaining plots over a run, by §4.6's first guess.
- **The general plans first** (§7.1, §7.2): income, any due doctrine or counter change, buying and planting, all before the player's planning starts; formation by its short greedy rule (§7.3); the counter cycle in rounds, reading the squads you fielded (§7.4); its kit on its route node (§7.5). Its kit is §7.8's. Until R3 its cards have no copies, and v1's `limits.*.maxOwned` apply instead (`data/generals.json`).
- **The economy per round** (§6.1, §6.2): the stipend, Truffle Cellars, interest at the end of planning, and +40 gold to the last round's loser. Selling refunds 100% in the planning phase a building was planted and 60% once it has fielded (§4.4).
- **Drafts** after rounds 2, 4 and 6, in the next planning phase, with v1's cards until R3 (§8.3).
- **The commander power** at most once per clash (§6.6).
- **Content tied to retired systems** gets its new effect or retires, as §7.7, §11.7, §11.8 and §11.10 list: Vesper's and Armilla's passives and Rhizome Tithe, the generals' passives, and the relics about capture, the forward price, spawn timing and turrets. Rot-Eater, which paid while the storm was active, pays for kills in a clash from round 5 (§11.7).
- **Saves** at the start of each planning phase and at Begin (§8.9).
- **Runs and battles saved before R2** (§8.9, §18.2 #32): get the user's call on migrating a saved run or ending it with a notice. Then `loadRun` (`src/run/resume.ts`) handles the old `RUN_VERSION` (1) as decided, instead of returning null: today a version mismatch drops the run silently, with no Continue and no notice. A v1 battle save in a run that goes on restarts round 1's planning with the notice for an incompatible save, instead of being ignored (today `src/app/run.ts` resumes a battle save only when its config matches). The keys stay (§13.8).
- **UI** (§10.2, §10.5): the planning, clash and aftermath views; both colonies' plots; the formation and merge previews; the round tally and the lane tug; both Heartcaps and your lives; basic matchup marks (the class of your hits against each enemy squad); the report by round; lives on the run bar; the general's kit on its route node. All on today's sprites.
- **Retiring v1's battle in code** (Appendix A; files in §13.4, tests in §15.7 and §15.6): spawn timers, besieged spawners, territory and presence, forward building and the supply-line price, Hold / Advance, Heartcap turrets, the timed Sporestorm, the 10:00 Decision, the income tick, the supply cap, the vague telegraph, the run's Heartcap and its repairs, the deploy phase and placing while live. Their tests, goldens, guardrails, UI, Help and tips go with them. The systems R2 keeps lose their v1 parts as §13.4 lists (movement, targeting and combat).
- **The rework's pieces become the default** (§1.3 #11): R2 adopts R1's chosen set as default data. Its rules (pinning, spore clouds, cleave and the Burster's burst) move from `src/data/proto.ts` into `data/balance.json` (§11.1), and its units and buildings (the Burster Pod and the Rhizomorph Tunnel, if the set keeps them) into the faction files, for both rosters (§11.2). The mixed-wave shields, in clash form, and the Elder Sporeling's splash follow R1's result. Until R3 the new buildings join the roster like any other; R3 gives each its place in a run, a core archetype or a pack (§11.2, §11.15).
- **Deleting the `?proto=` presets whose systems retire,** with their schema keys (`src/data/schema.ts`) and tests (`tests/unit/prototypes.test.ts`, `combatRework.test.ts`, `battleFeel.test.ts`, and the cases elsewhere that set them). In `src/data/proto.ts`:
  - **They go in R2:** `b1` (`approachRush`), `a3` (counter cycles in seconds), `b4` (`unitLifespan`), `hold` and `nohold` (`laneStance`), `t1` (`rangedFirstSpawnFraction`), `t2` (`fallBack`), `diver` and `diverleap` (`diveRanged`), `hotstart` (`hotStart`), `breach` (`sideTriggers` and the `heartcapBreach` trigger), `bigdrafts` (`bigDrafts`), `t3` (`spawnerDefense`), `callforhelp` (`callForHelp`), `waves` (`waves`), `stormwaves` (`stormWaves`) and `rework`. `hotstart` and `breach` stay undecided proposals (Appendix A), and MAY come back in round form.
  - **They stay only if R1 keeps them:** `mixedwave` (`mixedWave`, in clash form without `waves`), `swarmread` (`ai.counter.swarmMaxSupply`), the Elder Sporeling's splash off (inside `rework`), and any of `pinned`, `sporecloud`, `cleave`, `burster` and `rhizomorph` that R1's set leaves out. A piece R1 keeps becomes default data, and its preset (with `kept`) then goes, since the rule is the default.
  - **They stay as default-off knobs:** `a2` and `b3`, which tune systems that stay, and `flyers`, for the later flyer (§1.3 #11), without `holdsGround`, which only territory reads.
- **Settle §18.2's rows "Settled by R2"** (#16–#35) with the user in `docs/r2-plan.md` before building. The two that R2's playtest settles (#17, #33) start from their first guesses.
- **Link previews** (§13.8): `index.html`'s `description`, `og:description` and `twitter:description` describe the round-based game. Today they describe v1's tug-of-war; their text stays as it is until R2.
- **Tools:** `npm run sim` and `npm run balance` play rounds (§15.2); new goldens replace v1's eight (§15.5); the guardrails in round form (§12.3); screenshot parameters for a round and a phase (§15.6). §15.7 says which unit tests are kept, rewritten, retired or new, and §15.6 which browser tests go and come.

**Not in R2:**

- copies, augments, combos, run packs and the six core archetypes as a set (R3). Until R3 the kit has no copy limit, so plots are R2's only build limit (§18.1, D45);
- the shape language's art, the card-text pass and the rewritten Help (R4).

**Done when:**

- a human can play a whole run in rounds on the dev site, from round 1's planning to the run summary;
- nothing from the retired list remains in the game, its tests or its tools;
- every verification step below passes;
- the playtest gate questions have been put to the user.

**Verification:**

1. `npm run verify`. The unit suite covers the round rows of §15.7: the order of a round's events; income by round; the formation from the plots; how a clash ends (a lane wiped, the 45 s cap, the difference in supply); the damage formula (merged supply, siege counting double, the cap, the storm); merging at the muster, with the preview equal to what fields (§5.6); the Heartcap race and the Decision after round 9; lives; refunds by phase; the general planning first and never reading what the player plants in the same phase; and a save round-trip between rounds.
2. The new goldens are created and passing (§15.5), one single battle and one run at least.
3. Headless battles:

   ```bash
   npm run sim -- --seeds 1..40 --player bot:balanced --enemy general:scripted --summary
   ```

   Expect:
   - every battle ends (no crash, no stuck state, `rejectedCommands` = 0 for bots)
   - a median of 6–8 rounds
   - at most 15% of battles reach round 9
   - at most 15% of clashes reach the 45 s cap
   - the bot wins 30–70%
   - mean wall time within the §13.7 budget for one battle
4. Rule scenarios (`data/scenarios/`), each asserting its outcome exactly:
   - `general-plans-first`: the general's colony and army are fixed before the player's first command in a planning phase, and a different player plan in that phase leaves the general's plan the same;
   - `formation-from-plots`: a Capguard Hall planted in front of a Gill Archer Nest fields its Capguards in the front rank and the archers behind them;
   - `clash-cap`: two armies that can't finish each other in 45 s; the lane goes to the side with more surviving supply, and the damage counts only the difference;
   - `round-damage-cap`: an overwhelming win deals exactly the per-round cap;
   - `decision-round-9`: a battle with both Heartcaps standing after round 9 goes to the side that dealt more Heartcap damage;
   - one scenario for each edge case in §6.7's table, citing its ID there: `lane-empty-one-side` (E1), `lane-empty-both` (E2), `cap-tie` (E3), `double-wipe` (E4), `emplacements-only-draw` (E5), `emplacement-only-win` (E6), `split-lanes` (E7) and `both-heartcaps-zero` (E8). Each asserts the lane's winner, the margin, the Heartcap damage and who gets the comeback gold.
5. Whole runs:

   ```bash
   npm run sim -- --run --seeds 1..20 --player bot:balanced --auto-draft greedy --auto-route random --summary
   ```

   Expect every run to complete with 4–5 battles, no run to lose a life in a won battle, and the run's results (runs won, the boss reached, lives left) reported against §12.3's run guardrails (G14 for battle 1, G15 for the boss).
6. Saves from before R2 (§8.9): a unit test loads a run saved under `RUN_VERSION` 1 and gets it migrated, or ended with a visible notice, as the user decided, never null; a browser test (§15.6) loads a v1 battle save in a run that goes on and sees round 1's planning with the restart notice, the run's progress kept.
7. `npm run test:slow`: the guardrails in round form (§12.3), asserting and passing, among them G4 (rounds per battle), G13 (stalls) and G16 (formation). The retired ones are gone.
8. `npm run bench`: R1's full-colony clash inside the §13.7 budget.
9. Browser checks (the parameters are §15.6's):

   ```bash
   npm run screenshot -- --name r2-planning-1 --params "scene=battle&seed=1&player=bot:balanced&enemy=general:scripted&round=1&phase=planning"
   npm run screenshot -- --name r2-planning-4 --params "scene=battle&seed=1&player=bot:balanced&enemy=general:scripted&round=4&phase=planning"
   npm run screenshot -- --name r2-clash     --params "scene=battle&seed=1&player=bot:balanced&enemy=general:scripted&round=4&phase=clash&ticks=200&paused=1"
   npm run screenshot -- --name r2-report    --params "scene=report&seed=1&player=bot:balanced&enemy=general:scripted"
   npm run screenshot -- --name r2-route     --params "scene=route&seed=7"
   ```

   The automatic assertions are §15.6's, including the browser hash equal to the Node hash. Visual checklist:
   - Both colonies show their plots, with loam and stump plots drawn as themselves.
   - In planning, the general's whole army stands in formation before any player command, and both formation previews match where the clash's first tick puts the units.
   - The top band shows both Heartcaps, your lives, the round of 9 and the round tally; the clash shows the lane tug.
   - Basic matchup marks show on the general's squads while a card is chosen.
   - Nothing from the retired list shows: no territory, frontier, Hold switches, spawn timers, supply chip or telegraph countdown.
   - The report shows the round chart. The route's battle node shows its general's kit.
   - Nothing is clipped at 1280×720.
10. **Playtest gate (human):** the user plays at least one full run on the dev site and answers:
    - Did seeing the general's army first turn the opener into a plan rather than a gamble?
    - Did where you planted change how a clash went?
    - Did rounds read as "plan, then fight"?
    - Did a close battle leave a mark, and did a lost battle feel like a setback rather than the end?
    - About how long did planning take each round, and how long was the run (target 25–35 minutes)?
    - When were you bored, and when did you feel clever?
    - Did you miss placing or Hold during a clash, with only the commander power live?

    Tune the data before starting R3. The answers go in `docs/playtest-feedback.md`.

    **A rough playtest comes first** (agreed 2026-11-01). Once a single battle in rounds is properly playable on the dev site, with the planning screen, the clash chrome and the report, and before the counter cycle and the commander power land, the user plays it rough and answers questions 1, 2, 3 and 6. Its notes steer the rest of R2, and this gate stays.

### Milestone R3 — The kit

**Goal:** runs built from a few archetypes, differently each time. The kit's copies make "mass the cheapest spawner" impossible by construction, and augments, combos and run packs make the builds.

**Scope:**

- **Copies** (§8.10): each kit card has copies, each copy one building planted at once; the starting kit is the commander's 3 starters at 2 copies each; selling returns the copy. The general's kit gets copies by the player's rule (§7.8).
- **The six core archetypes** (§11.2), with the Truffle Cellar a basic card for everyone. Every other building enters a run only through run packs until M6.
- **Augments** (§11.13) replace upgrade tracks (§11.6). Every upgrade level and every effect that grants one (the Grove's graft, the events that give levels) is remade as an augment or retired. Every augment shows on its card and its squad, the general's included. The general's kit gains augments by battle index (§7.8).
- **Combos** (§11.14): a few rules about position (in front of, behind, beside), shown while placing.
- **Run packs** (§8.4, §11.15): each run deals the commander's core, an always-in set that includes an answer to the swarm, and 4 of 10 themed packs. Bans stay.
- **Drafts reworked** (§8.3): blueprint, copy, augment and relic cards, after rounds 2, 4 and 6, and in spoils.
- **Relics** (§11.7): each with its v2 effect, or retired.
- **UI** (§10.2): copies, augments and combos on the cards, the formation preview, the ghost and the draft, with placeholder icons.
- **Tools:** a card check, `--checks cards` (`docs/archive/v1/ideas/after-the-rework.md`, Tier 1 item 1), and build-diversity numbers in `--checks runs`: kit variety, the top building's damage share, and how often each card is offered and owned.

**Not in R3:** the shape language's art and the card-text pass (R4); gating by unlocks (M6).

**Done when:**

- a human can play a run whose kit has copies, augments, combos and packs;
- upgrade tracks are gone from the game, its data and its tests;
- every verification step below passes;
- the playtest gate questions have been put to the user.

**Verification:**

1. `npm run verify`. New unit tests cover copy limits and returns, the starting kit, augment application (including the general's), combo detection for each position, pack dealing (deterministic per seed, the swarm answer always present, bans applied), the general's copies (§7.8) and its augments by battle index, and draft generation for each card type.
2. The goldens are updated, and the commit says why.
3. The clash check (R1) with augments and combos: the strict counter bar still passes. A build that augments or combos flip into a win (§5.8) only wins with the copies, augments or plots it invested, and the general's counter cycle answers it: such a build's win rate drops against the adaptive general, as G8 measures (§12.3).
4. The card check and run numbers:

   ```bash
   npm run experiment -- --checks cards,runs --commander all --power-policy auto --runs 200
   ```

   Expect (first guesses from the card check's proposal):
   - a third or more of uncommon and rare cards worth +5 points of runs won, and none above +20;
   - a drafter that commits to its picks winning at least 10 points more runs than one that drafts at random (today they're about even);
   - a card that changes the rules (an augment or a rule-changing relic) owned at the end of at least 30% of runs (17% today);
   - the top building's share of damage below about 60% in a typical run.
5. `npm run test:slow` and `npm run bench`.
6. Browser checks: `r3-draft` (a draft showing each card type), `r3-tray` (copies lit and spent), `r3-combo` (a ghost lighting the neighbor it links with) and `r3-general-augments` (the general's squads with augment icons in planning).

   Visual checklist:
   - Each card shows its copies as pips, lit while free.
   - A ghost shows its combo's icon on the neighbor it would link with.
   - The general's augments show on its squads before you plan.
   - A draft card names its type and, for an augment, the building it changes.
7. **Playtest gate (human):**
   - Did your build feel like your own by the end of the run?
   - Did an augment or a combo change what you built next, or where?
   - Did you ever see the general's army and not have the answer to plant? Was that fair?
   - Did any build win without you having to think?

### Milestone R4 — Readable armies

**Goal:** you can tell the units apart and see what counters what without reading a paragraph (F17), and cards stop being walls of words (F21).

**In two parts** (X3, agreed 2026-11-01). Sprites aren't battle state, so the field's shapes can land early. R2's first playtest asks whether seeing the general's army helped, and today a sprite's size shows its merge tier rather than its armor, which would confound the answer (A202).
- **R4a, the shape language on the field,** runs beside R1 and lands before R2's first playtest. Its plan is `docs/r4a-plan.md`.
- **R4b, matchups and words,** follows R3, since it draws R3's augments and combos. Its plan is `docs/r4b-plan.md`.

Elsewhere in this spec, "R4" means both parts, and a part is named where its timing matters. The tasks are in `docs/tasks/r4-readable-armies.md`.

**Scope, R4a:**

- **The shape language** (§5.8, §10.4) on both sides:
  - body size by armor class, in measured height bands (light small, medium medium, heavy big; §14.3);
  - no weapon mark on any unit or emplacement, since the silhouette tells a unit apart (§5.8, 2026-11-01);
  - pips for merge tiers and a gold rim on Elders, with the bigger Bloomed and Elder sprites (`TIER_SCALE` in `src/render/renderer.ts`) dropped;
  - a distinct silhouette for every archetype and every unlockable unit, and the Puffball Mortar's emplacement sprite. Sprites stay text-defined (§17 #20).
- One unit drawer that v1's renderer and R2's views share, so the change lands once for both (§13.6).
- The shape checks, a sprite-sheet tool, the lineup scenarios and their captures, and the team-contrast check under colour-vision filters, moved here from M7 (§2).

**Scope, R4b:**

- An icon for each augment and each combo (§11.13, §11.14).
- **Matchup marks** drawn in full on cards and on the planning screen, with a glyph for Structure targets (§10.4).
- **The card-text pass:** no sentences on a card face; the tooltip holds the detail (§10.2). Player-facing words move from `src/ui/words.ts` into the data, since R2 already regenerated the goldens (§10.4).
- **Help and tooltips** rewritten for rounds, and the first-time tips reworded (§10.2, §10.5).

**Not in R4:** new rules or numbers. The merged radius (§18.2 #53) changes in R2, not here. The Gray Rot's own sprites are M7's.

**Done when:**

- R4a: every unit on the field reads its armor from its size and its archetype from its silhouette, on both sides; R4a's part of steps 1 and 2 below passes, and the user has agreed it at R4a's review gate;
- R4b: no card face carries a sentence;
- every verification step below passes, and a fresh tester has played.

**Verification:**

1. `npm run verify`. New data checks: every unit's body size follows its armor class and no shape block carries a mark (R4a), and every augment and combo has an icon (R4b).
2. Browser checks:

   ```bash
   npm run screenshot -- --name r4-lineup      --params "scenario=unit-lineup&paused=1"
   npm run screenshot -- --name r4-lineup-twin --params "scenario=unit-lineup-twin&paused=1"
   npm run screenshot -- --name r4-planning    --params "scene=battle&seed=1&player=bot:balanced&enemy=general:scripted&round=4&phase=planning"
   npm run screenshot -- --name r4-lineup-d    --params "scenario=unit-lineup&paused=1" --filter deuteranopia
   npm run screenshot -- --name r4-lineup-p    --params "scenario=unit-lineup&paused=1" --filter protanopia
   ```

   plus each Help tab (`--click`, §15.6). R4a runs the four lineups, and R4b runs everything, the lineups again with the full roster.

   Visual checklist:
   - At the field's scale in a 1280×720 window (2× on one-lane maps, about 1.78× on Twin Roots, §10.1), each archetype is recognizable by its silhouette alone, on both sides. (R4a)
   - Bodies are ordered by armor, and merged units keep their body with pips added, Elders with a gold rim. (R4a)
   - Augment icons show on squads in planning. (R4b)
   - The sides stay distinguishable under both filters. (R4a)
   - No card face carries a sentence, and every Help tab fits 1280×720. (R4b)
3. **Playtest gate (human, a fresh tester with tips reset), after R4b:**
   - Was anything on the field you didn't understand?
   - Shown the general's army in planning, can you pick the card that answers it without opening a tooltip?
   - Could you spot the Elders?

   The gate also answers §10.4's open question: whether the shape language reads at the field's scale, Twin Roots included, or a clash needs a closer view (§18.2 #52).

**R4a's review gate (the user, before R2's first playtest).** The user looks at R4a's lineup captures and at the dev site, and agrees that R2's first playtest can run on these sprites. That playtest also asks "Could you spot the Elders, and tell a Bloomed unit from a base one?", and takes a first reading of #52 on Twin Roots.

### Milestone 6 — Meta-progression

**Scope:**

- The profile and the Underroot screens.
- Spores and Amber.
- **The unlock ladder:** the roster beyond the six core archetypes is gated behind unlocks, which teach it a few buildings at a time: teach by gating, not by text. A locked card shows the feat that unlocks it. Until M6 every building beyond the core enters runs through run packs; from M6, packs deal only what the profile has unlocked (§8.4, §9).
- **At least 15 feats** with the condition DSL, written for rounds (§9.2). The feats tied to columns (Long March, Unbroken Mat) are rewritten, and every other feat is checked against v2's stats.
- 12 strains with Amber ranks, related to augments as §9.3 says.
- 12 traits and Root Capacity. Traits tied to retired systems (Root Pressure's capture speed; the building HP in Bulwark Spores and Feral Bloom) get new effects (§11.7).
- Commander mastery: 10 levels × 3 commanders, including the exclusive buildings (Velvet Shrine, Rootgate, Puppet Pod) and alternate powers. The Rootgate's effect is tied to capture, so it gets a new one (§9.5, §11.2).
- Save export/import and a migration framework.

**Independent of M6: Run it back, and records** (`docs/archive/v1/ideas/after-the-rework.md`, Tier 1 item 7). It doesn't depend on the battle or on M6, and M6 doesn't depend on it, so it MAY land before, during or after M6 as its own piece of work:

- remember the last commander and bans, and "Run it back" (`Enter` or `R`) starts a new seed straight on the route;
- summary lines that tell the truth: how far you got, what beat you, and active play time;
- per-commander records, the last 20 runs, and a codex of cards seen;
- a grudge line naming the general that ended the run.

It comes in two parts (X10, 2026-11-01). The plan is `docs/run-it-back-plan.md`, and the tasks are in `docs/tasks/run-it-back.md`.
- **records-1, beside R1:** remember the last commander and bans, and Run it back. They read only the ended run's commander and bans, which R2b's run keeps, so they carry over to rounds unchanged. records-1 records no runs, so no v1 run is ever recorded (2026-11-01).
- **records-2, after R2b:** the run records (per-commander records and the last 20 runs), the truthful summary lines, active play time, the grudge line, the records views and the codex, all from R2b's run. It waits for R2b because R2b rewrites the battle records the summary reads (lives, and each battle's rounds).

Where it lives (RB-Q1, RB-Q2):
- The records live in the profile, `spore-sprawl/profile/v1` (§9.7), as its version 1, which M6 migrates in place.
- Play time and what beat you live in the records. `src/app` and `src/meta` work them out, and they never enter `RunState` or a battle's state, so no hash moves (§13.3 rule 6, §15.6).
- Prototype runs write no records and no remembered setup. Run it back still works in one, from the run that ended.

**Verification:**

1. `npm run verify`. New unit tests cover:
   - feat conditions against synthetic round and run stats
   - the unlock ladder: a locked building is never dealt, and unlocking one adds it to the pool
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
3. `npm run test:slow`: G9 (the meta power ceiling), in round form (§12.3).
4. Browser checks: `m6-traits`, `m6-strains`, `m6-feats`, `m6-mastery` and `m6-locked-card` (`scene=underroot&tab=…&profile=fixture:mid`).

   Visual checklist:
   - The capacity meter shows the right value.
   - Strain cards show their patch summary.
   - Locked feats show the condition text, and a locked building's card shows the feat that unlocks it.

### Milestone 7 — Gray Rot, blights, content and polish

**Scope:**

- **The distinct Gray Rot roster** (§11.12) with sprites, for the six core archetypes and the unlockable roles; generals switch over to it. Its units follow the shape language (§5.8), so a Gray Rot unit's body and damage type read the same matchup as the Velvet Bloom's, and it carries no weapon mark either.
- **Blights and Decay** (§9.6, §11.8), rewritten for rounds, with Decay reward multipliers and the best Decay per commander:
  - blights tied to retired systems get new effects (the telegraph's Quick Learner, Thin Soil's home columns, Early Storm's clock, Hardened Rot's building HP), and Hoarding Rot replaces Silent General (§11.8);
  - a blight raises the general's income above its default ×1.0 (§1.3 #3). This is the difficulty ladder's way of giving the general more, since there's no Easy / Normal / Hard (§17 #14).
- **The Three Hollows** (3-lane) map, with a colony in each lane (§4.6, §11.9). **Open:** its layout, since its 5-row lanes and 3 home columns don't divide into v2's 2×2 plots in 2 ranks. First guess: 3 lanes of 4 rows and 4 home columns, 12 plots in all (§11.9).
- **Content:** the relics and buildings that the ten run packs need (§11.15), each relic with a v2 effect.
- The colour-vision check on the Gray Rot's own sprites. R4a's contrast test already holds the palette to §2's cases (R4-Q4). M7 runs it on the new sprites' tones, and its filtered screenshots check the new silhouettes.
- First-run tutorial hints beyond the first-time tips (§10.2).

**Verification:**

1. `npm run verify`, with new unit tests for each blight's effect and Decay math.
2. `npm run test:slow`: G10, plus the counter bar and G3 on clashes re-run against the Gray Rot roster (§12.3).
3. All maps:

   ```bash
   npm run balance -- tournament --maps all --seeds 30
   ```

   Expect every map's median rounds per battle in band (§12.3) and no map with more than a 65% win rate for either side in mirror bot matchups.
4. Browser checks: `m7-gray-rot`, `m7-three-hollows`, `m7-blights`, and colorblind-filtered copies of `m7-three-hollows` (`--filter deuteranopia|protanopia`).

   Visual checklist:
   - The factions stay distinguishable under both filters.
   - Each Gray Rot archetype has its own silhouette and reads its armor from its size, like its Velvet Bloom role, with no weapon mark.
   - The 3-lane map fits at 1280×720.

### Milestone 8 — Release candidate

**Scope:**

- A render performance pass on the biggest clash (two full colonies).
- The settings screen. (Built early with the UI/UX plan's Phase 3: §10.5.)
- Light juice: arrival and death puffs, optional screen shake. (Built early with Phase 3: puffs are spores, and the shake is a setting, §10.4.)
- A Firefox determinism check.
- The final balance tournament and tuning.
- A README with how to play rounds.
- The release build on GitHub Pages. (The Pages workflow exists since M1, and the dev site serves `develop` at `/dev/`: §13.8.)

**Verification:**

1. `npm run verify` and `npm run test:slow` both pass, with every guardrail asserting.
2. `npm run build`: shipped JS + data ≤ 300 KB gzipped (the build prints the size).
3. `npm run bench` passes. A render benchmark (`npm run screenshot -- --name m8-perf --params "scenario=bench-300&test=1&measure=frames"`), and the same on the full-colony clash, reports a p95 frame time ≤ 8 ms.
4. A cross-engine check: `npm run screenshot -- --browser firefox --name m8-ff --params "<the r2-clash params>"` gives the same hash as Node and Chromium.
5. Production preview screenshots of every screen; Claude reviews all of them.
6. A run with a person at 1× lasts 25–35 minutes (§8.2).
7. Deployment: Claude verifies that the Pages workflow run succeeds and that the live URL loads (built-in browser pane screenshot).

---

## 17. OUT OF SCOPE for the first release

These are explicitly **not** built in the first release (Milestones 1–5, R1–R4 and 6–8, §16). Anything here needs a spec change first. Items keep their v1 numbers: a removed item is marked "(removed in v2)" with one line on why, and new items are appended.

**Platform and online**

1. Multiplayer of any kind (PvP, co-op, async), online leaderboards, accounts, cloud saves, any backend, analytics or telemetry.
2. Phone layouts, touch controls and gamepad support. The first release is desktop mouse + keyboard only; tablets may work but aren't tested.
3. Desktop or Steam packaging, and PWA/offline install.
4. Cross-browser determinism guarantees beyond Chromium and Firefox. Safari is supported for play but isn't hash-verified.

**Gameplay**

5. A second playable faction or faction selection. The Gray Rot is enemy-only.
6. Direct unit control: rally points, moving or ordering units, unit-activated abilities. The formation comes from the colony's layout (§4.6), not from controlling units, and the commander power is the one live action (§6.6). (Per-lane Hold / Advance, adopted on 2026-10-28, is retired in v2: Appendix A.)
7. **(removed in v2)** Flying and burrowing units. They return as unlockable roles: the Rhizomorph as a tunneler, and a flyer that starts from the rework's rule C, under which ground melee hits a flyer for half damage and lobbed shells and bursts can't hit it at all (§1.3 #11, §11.2). Terrain that changes movement stays out, as #22.
8. Pathfinding, and unit collision with buildings. Buildings take no part in a clash (§4.6).
9. Fog of war, and hidden information about the general. The general plans first, and you see its whole colony and the army it will field, with its formation, merges and augments, before you plan (§7.5). The one thing hidden is your own planting in the same planning phase, which the general never sees (§7.1).
10. Procedurally generated battle maps. Maps are hand-authored; only the route is generated.
11. **(removed in v2)** Core placement-synergy rules. Placement is now a core rule: the colony is the formation (§4.6), and combos reward placing in front of, behind and beside (§1.3 #7, §11.14).
12. In-battle tech research, or upgrading one planted building in place. Augments come only from drafts, spoils and the route's nodes (§8.3, §8.7, §11.13).
13. Active powers for enemy generals. Planning first and adapting in the open are their signature (§7.1).
14. Difficulty tiers (Easy/Normal/Hard). Difficulty is the honest baseline plus blights. The general's income is a data value (×1.0), and a blight MAY raise it (§9.6, §11.8).

**Progression and content**

15. The full blight ladder (more than 6 blights), ranked or seasonal challenges, a daily-seed UI, and seed sharing.
16. Cosmetics: skins, palettes, badges, titles, a cosmetics shop.

**Presentation and tooling**

17. A replay viewer UI. Command logs exist only for tests and resume.
18. Music and voice acting. Sound effects and the ambient bed exist: they are synthesized with WebAudio from `data/sounds.json` (§13.9). (v1 left out audio of any kind; the sound pass replaced that.)
19. Localization (the first release is English only), and screen-reader support beyond semantic DOM.
20. Art beyond text-defined sprites: no PNG or Aseprite pipeline, and no animations beyond 2-frame cycles. Within that, each archetype MUST have a distinct silhouette, and the shape language's rules apply (§5.8).
21. Modding tools, or loading custom content in-game. The data is plain JSON, but there's no loader UI.

**Added in v2**

22. Terrain that changes movement, except root walls. Map terrain lives in the colonies as loam and stump plots (§4.6, §11.9). (Carried over from v1's #7.)

---

## 18. Defaults chosen without asking, open questions, tuning knobs

### 18.1 Defaults chosen without asking

Each default is deliberate and easy to change. D1–D24 are v1's, from the design interview of 2026-10-24: the table keeps them as the record, under their numbers, with what became of each in v2. D25 on are v2's: the first guesses behind the decisions of 2026-10-31 (§1.3) that matter most, and the defaults this spec chose where the decisions were silent. These D numbers are this section's own; a v2 decision is cited as §1.3 #N. A default that rests on an undecided rule names its §18.2 item.

**v2's defaults**

| # | Default | Why |
|---|---|---|
| D25 | A clash opens with a 1 s muster (D48). A lane's clash ends when one side has no units and no emplacements left in it; at 45 s the side with more surviving supply in the lane wins it, and its damage counts only the difference. Front ranks start 6 tiles apart | Every clash ends, so an answer can't win by stalling. A typical clash lasts 20–40 s, and the first blows land within 2–5 s |
| D26 | Heartcap damage per lane: 25 for each supply in the winner's margin, merged units counting their own supply and siege units double (for damage only, not the 45 s comparison); then the Sporestorm and the loser's damage-taken modifiers, in basis points, floored; no Heartcap takes more than 500 a round (§6.7) | Only survivors count, so a close loss costs little. The cap is a quarter of battle 1's enemy Heartcap, so no Heartcap falls to one bad round. Siege units get a job with no buildings to break |
| D27 | The Sporestorm raises round damage 20% a round from round 5, up to ×2.0 at round 9 | It stays the stalemate breaker, now across rounds |
| D28 | Your Heartcap is 3000 in every battle; the general's is 2000 + 250 × (battle index − 1), and the boss's 3600 | v1's numbers, now per battle. Later generals are harder by their Heartcaps, not by an AI edge |
| D29 | After round 9, the side that dealt more Heartcap damage in the battle wins by Decision, with half rewards. Target: a median of 6–8 rounds, with at most 15% of battles reaching round 9 | v1's tiebreak without columns. Seven rounds take about 3 minutes on the sim clock and 6–8 minutes in all, which fits 25–35 minutes a run |
| D30 | The run has 3 lives, a first-guess number tuned like any other. Losing the boss battle ends the run (**Open:** §18.2 #16) | 9 Kings uses three. A lost battle becomes a setback, not the end |
| D31 | One-lane colonies hold 8 plots, 2 ranks × 4 files; on Twin Roots each lane's colony holds 6, 2 ranks × 3 files | The home zone of 4 columns × 8 rows (v1's D6) divides into 2×2 plots that way |
| D32 | The colony gains 1 plot for each battle won, up to 4 more, as a third rank behind (**Open:** §18.2 #18, #19) | Sprawl you can see: each plot gained is another squad and another place in the formation |
| D33 | A full colony fields at most 150 live units a side when the armies arrive, checked on the bench (§18.2 #7). Until 2026-11-01 it read about 100 supply a side, which the spec's own first guesses already passed (144 supply from 12 upgraded Burrows) | No supply cap, so squad sizes and the most plots MUST keep the biggest clash inside the §13.7 budget. A tick's cost follows live units, so the budget counts them |
| D34 | From R3, the starting kit is the commander's 3 starter buildings, 2 copies each. A blueprint adds a card with 1 copy, and drafting a card you own adds 1 copy | Enough copies to field a real army in round 1, and few enough that answers have to be drafted |
| D35 | Selling refunds 100% in the planning phase a building was planted, and 60% once it has fielded. From R3 the copy returns to the kit | Forgiving for misclicks; changing course after a clash has a real cost |
| D36 | Income each round: the Heartcap stipend of 100, +50 per Truffle Cellar (+50% on loam), interest of 1 per 20 gold banked at the end of planning up to 10 (Deep Cellars and the Spore Exchange add 10 to the cap, and the Exchange's trickle becomes +12 a round), and +40 to the last round's loser | `docs/archive/v1/ideas/rounds.md`'s numbers, close to v1's per-minute rates. About one new spawner a round after the opener |
| D37 | Drafts after rounds 2, 4 and 6, in the next planning phase, plus spoils after a won battle. A draft opens after the general has planned, so you draft seeing its army (§4.7). Skipping a draft gives +40 gold | Three a battle. [Step B](docs/archive/v1/ideas/one-more-run-review.md#step-b-results-2026-10-30) found that a bigger draft has to mean more picks, not rarer cards |
| D38 | From R3, each run deals the commander's core, an always-in set with an answer to the swarm, and 4 of 10 themed packs of one building and two relics. Neither the core nor the always-in set can be banned (**Open:** §18.2 #44, #45) | Runs differ before battle 1. The swarm has been the hardest army to answer in every measurement, so its answer is in every run |
| D39 | An augment attaches to a building type, for the run (**Open:** §18.2 #37) | Simplest to show and to read: every copy of a building plays the same |
| D40 | From R3, the general's kit has copies by the player's rule and gains one augment for each battle index above 1 (§7.8). Until R3, v1's `limits.*.maxOwned` and random upgrade levels stand in | It replaces v1's random upgrade levels, and the player sees each one |
| D41 | The general's income is a data value at ×1.0. It gets no extra gold for planning first | The information edge is the player's by design. A blight MAY raise the income (§17 #14) |
| D42 | The general's formation: melee in front, ranged and area behind, economy at the back, by a short greedy rule, with ties going by building id (§7.3). On two-lane maps it sends each building to the lane where it lost the most last round (**Open:** §18.2 #30) | Simple, readable, and the same rule the player's colony follows |
| D43 | The Grove regains a life, up to the run's maximum | Repairs have no target once Heartcaps are per battle |
| D44 | The sixth core archetype is the Burster Pod; the alternative is the Puffball Mortar as an emplacement (**Open:** §18.2 #36) | Area damage that travels with the army is what a packed formation needs to fear |
| D45 | Until R3 builds copies, a kit card has no copy limit, so plots are R2's only build limit. The general's cards follow v1's `limits.*.maxOwned` until then | R2 can then retire the supply cap with the rest of v1's battle, and R3 adds copies on top |
| D46 | Until M6 there's no gating: buildings beyond the core enter runs only through run packs | Every building stays playable before the unlock ladder exists |
| D47 | The formation is deterministic: `formationOf` is a pure function of the colony (plots, buildings, squad sizes and merge toggles) and draws on no random stream. A squad of n stands on a k × k grid in its slot (k = ceil(sqrt(n)), spacing 2/k tiles), filled front to back, then top to bottom. A squad too big for its slot packs tighter (**Open:** §18.2 #11) | The preview can't differ from the clash, so where you plant is where you fight. R1's clash check MAY jitter positions as a measurement, never as a game rule (§4.6) |
| D48 | A clash opens with a 1 s muster: nobody moves or attacks, and squads set to merge knit in place, neighbouring squads of the same unit included. The merge preview is the muster's own rule, and the commander power is ready from the clash's first tick (§5.6, §6.6) | The preview equals what fields, so two Burrows side by side make an Elder by placement alone |
| D49 | Each battle starts with both colonies empty and every copy free. The general's colony opens the map's plots plus as many as yours has gained from sprawl, not your relics', traits' or commander's (**Open:** §18.2 #20, #21) | Each battle is a new map, and the general's colony keeps pace with yours without copying what is yours alone |
| D50 | An emplacement (a tower fielding itself) is a unit that never moves: it keeps its side alive in its lane and counts 0 supply toward Heartcap damage and the 45 s comparison (**Open:** §18.2 #10) | It can hold a lane but deals no Heartcap damage |

**v1's defaults (record)**

| # | Default | Why (v1) | In v2 |
|---|---|---|---|
| D1 | A "wave" is a 60 s beat of the battle clock | Spawns run on per-building timers, so drafts and counter cycles need a shared beat | **Retired:** rounds do its jobs (§4.2, Appendix A) |
| D2 | Drafts at waves 2/4/6/8, pausing the sim; skipping gives +40 gold | About 3 drafts per battle and ~12 per run, matching the run-length target | **Changed:** after rounds 2, 4 and 6 (D37); skip gold stays |
| D3 | Heartcap damage persists across a run; a Decision loss costs 25% of max HP; the run ends at 0 | Attrition makes every battle matter and makes route choices (Groves) meaningful, without one Decision loss ending a run | **Retired:** per-battle Heartcaps and lives (§1.3 #2, D30) |
| D4 | Gold doesn't carry between battles | Keeps battles self-contained, which also makes them easy to balance and simulate | **Kept:** only the run's state carries (§4.7) |
| D5 | Every v1 building is 2×2; units don't collide with buildings; no pathfinding | Readable sprites, a scarce grid, and a cheap, deterministic sim | **Kept:** buildings stand on 2×2 plots and take no part in a clash (§4.6) |
| D6 | Home zone of 4 columns on Bogwater Hollow, rather than the "~6" floated in the interview | With 8-row lanes, 6 columns would hold almost every building a battle needs, and pushing would stop mattering | **Changed:** the 4 columns hold the colony's plots (D31) |
| D7 | Presence is weighted by supply, so merged armies claim ground more slowly | Gives merging a real cost and ties it to territory | **Retired** with presence (Appendix A) |
| D8 | Besieged buildings run at 50% speed instead of stopping | One harassing archer shouldn't shut a building down completely | **Retired:** buildings can't be hit (Appendix A) |
| D9 | Telegraph lead of 2 waves; analyses at 2:00 and 5:00; four counter kinds; Elite is read from *actual* merges, not toggles | A vague warning needs few, legible kinds, and default-on toggles would otherwise always read as Elite | **Changed:** the four kinds stay, read from the squads you fielded and scheduled in rounds (§7.4); the telegraph is retired |
| D10 | No fog of war: the general's buildings are visible, and only its intent is vague | Keeps counterplay fair and readable | **Changed:** nothing about the general is hidden; you see its whole army before you plan (§7.5, §17 #9) |
| D11 | The general may draft a missing counter blueprint at warning time | It counter-builds even with a thin kit, and it still never cheats on gold or stats | **Kept**, when a counter is chosen rather than at a warning, and within its copy rules (§7.4) |
| D12 | The Sporestorm also makes Heartcaps take +10% damage per stack, on top of weakening turrets | Ensures stalemates break before the Decision clock in most battles | **Retired:** the storm escalates round damage (D27) |
| D13 | Generals get a passive but no active power | Their adaptation is their signature | **Kept** (§17 #13) |
| D14 | Active pause with full building and selling; 1×/2×/3× speeds | Strategy over APM for a single-player game | **Changed:** planning is untimed and the only time to build; speeds and pause apply to a clash (§4.2) |
| D15 | Desktop only, no audio in v1 | Focus on proving the gameplay first | **Changed:** desktop only stays; sound exists (§13.9, §17 #18) |
| D16 | Milestone 1's enemy is a gray mirror of the Velvet Bloom roster; the distinct Gray Rot roster comes in M7 | The smallest slice that still has a real opponent | **Kept** (§16, M7) |
| D17 | Interest: +1 per 20 banked, capped at 10. Comeback: +1 per 2 columns behind per income tick, capped at 6. | Noticeable but not dominant; the Sporestorm punishes banking passively | **Changed:** interest stays, paid each round; comeback gold is +40 to a round's loser (D36) |
| D18 | Selling refunds 100% during deploy or within 10 s before a building produces units, gold or a shot; otherwise 60%; no selling while besieged | Forgiving for misclicks, prevents free-production cycles, and blocks selling a building just before it dies | **Changed:** by phase (D35) |
| D19 | One input per meta system: feats unlock content, Spores buy traits and capacity, Amber buys strain ranks, XP feeds mastery | Four systems without currency soup | **Kept** (§9) |
| D20 | Spores are kept on failed runs | Progress never feels wasted | **Kept** |
| D21 | Route: pick one node per row, fully connected | Simpler than a path graph and still a real choice every step | **Kept** (§8.2) |
| D22 | Maps must be point-symmetric | Fairness for an honest AI | **Kept**, colonies and their loam and stump plots included (§11.9) |
| D23 | 20 Hz sim; zod is the only runtime dependency; no UI framework | Cheap headless runs and a small bundle | **Kept** |
| D24 | The enemy's kit grows with the battle index; elite nodes add modifiers | Difficulty rises over a run while the AI stays honest | **Kept**, with copies and augments from R3 (§7.8, D40) |

### 18.2 Open questions for playtesting

Items 1–6 are v1's and keep their numbers; an item v2 settles is marked "(closed in v2)" with one line on why.

1. **(closed in v2)** Is a 3 s capture with a 1.5× presence ratio the right pace for pushes? Column capture is retired (Appendix A).
2. Does the Sporestorm end battles satisfyingly, or abruptly? In v2 it escalates round damage from round 5 (§6.4); R2's playtest asks again.
3. Do players feel forced to leave merging on? (G7 measures this; watch human behavior too.) In v2 squads set to merge knit at every clash's muster (§5.6).
4. **(closed in v2)** Is the vague telegraph enough information? An opt-in "answer card" assist could be a future accessibility setting. The telegraph is retired: you see the general's whole army before you plan (§7.5).
5. After the first release: a second playable faction? A daily-seed mode (the infrastructure is already deterministic)?
6. **(closed in v2)** Should more relics and events bend territory rules (e.g. "the first column you lose each battle doesn't flip")? Territory is retired. Relics and events that bent it get new effects (§11.7).

Items from 7 on are v2's, one row per question: each is a rule the user hasn't decided, marked **Open:** in the section the row names. Where several sections carry the marker, the first one named holds the rule and the rest point to it. The rows run in the order of the milestone that settles them (§16): R1, R2, R3, R4, M6, M7, then later. §0.1's **Open:** list names the main ones. The number of lives (3) is a first guess like any number, not an Open rule (D30). A commander power's delay into a clash and the siege count in the 45 s comparison were settled in review (§6.6, §6.7), so they have no row.

| # | Question | First guess | Section | Settled by |
|---|---|---|---|---|
| 7 | Squad sizes: what each building fields a round, and the most a full colony fields | §11.2's Squad column (8 Sporelings for a Burrow, 4 Capguards for a Hall); at most 150 live units a side when the armies arrive (D33) | §11.2, §12.2 | R1 |
| 8 | Do mixed armies need the rework's mixed-wave shields (20% of max HP for an army of 2 or more unit types) to pass the strict counter bar in clashes? | Not adopted | §12.2 | R1 |
| 9 | Does the Elder Sporeling keep its splash perk (0.6 tiles), which the rework turned off? | It keeps it, as today's data does outside `?proto=rework` | §5.6, §12.2 | R1 |
| 10 | How an emplacement counts in a clash | A unit that never moves and can be killed (Structure armor); it keeps its side alive in its lane; 0 supply toward Heartcap damage and the 45 s comparison; only emplacements left at 45 s is a draw (E5); powers hit it as a unit (D50) | §6.7 (§11.2 points there) | R1 |
| 11 | Overflow: where a squad too big to stand apart in its slot puts its units | It keeps its k × k grid and spacing and packs tighter, its units overlapping (D47) | §4.6 | R1 |
| 12 | Does a squad keep its place in the formation on the approach, marching at its slowest unit's pace with ranged units 1 tile behind, as the rework's waves did? | No: each unit moves at its own speed, as in v1 | §5.2 | R1 |
| 13 | Does the 1 s muster count toward the 45 s clash cap? | Yes: the clash clock starts on the muster's first tick | §5.6, §6.7 | R1 |
| 14 | Does the counter cycle get an Anti-Ranged kind that scores `rangedShare`, with `swarm` spawners as its set? No v1 kind scores the ranged share, and the counter-matrix check's answer to archers is a swarm | No: the four kinds until R1 measures it | §7.4 | R1 |
| 15 | Do counter sets come from R1's clash matrix instead of damage types and tags? | No: by damage type and tag | §7.4 (§11.11 points there) | R1 |
| 16 | Does losing the boss battle end the run, or cost a life like any other battle? | It ends the run, as in v1 (D30) | §1.3 #2, §6.5, §8.5 | R2 |
| 17 | A clean-win bonus: should a battle won with little or no Heartcap damage pay a bonus, such as extra Spores or a better pick, so a close call costs a bonus rather than health? | Not adopted | §1.3 #2, §6.5, §8.6 | R2 (its playtest) |
| 18 | Sprawl: how many plots the colony gains, and when. Some relics or nodes may add plots | +1 per battle won, up to 4 more, as a third rank (D32) | §1.3 #4, §4.6, §8.6, §11.1 | R2 |
| 19 | Where the third rank's tiles come from, and the order its plots open | R2's maps reserve homeCols 6, the back two columns closed until gained, and the arena shrinks to match. One lane: files 2, 3, 1, then 4. Twin Roots: each lane's third rank in turn, top lane first | §4.6 | R2 |
| 20 | Do planted buildings carry between battles? | No: each battle is a new map, with both colonies empty and every copy free (D49) | §4.6 (§1.2, §4.4, §8, §8.10 and §14.4 point there) | R2 |
| 21 | How many plots the general's colony opens in a battle | The map's plots plus as many as your colony has gained from sprawl; your relics', traits' and commander's plots don't count (D49) | §4.6 (§7.1 and §7.8 point there) | R2 |
| 22 | The margin a lane's winner scores when siege units are in play | The winner's damage supply minus the loser's, never below 0 | §6.7 | R2 |
| 23 | The clash's edge cases E1–E8: one side or neither fields in a lane, a tie at 45 s, both wiped on one tick, only emplacements left on both sides at 45 s, a win with only emplacements left, split lanes, both Heartcaps at 0 | §6.7's table | §6.7 | R2 |
| 24 | When an effect that heals on a round's result lands, such as Mending Moss | After the round's damage is applied, never above the Heartcap's max HP | §6.7 | R2 |
| 25 | When, inside the muster, merged units replace their parts, and so whether a power fired during the muster can break a muster knit | On the clash's first tick, so a power hits the merged units and can't break a muster knit | §5.6 | R2 |
| 26 | The Rhizome Vault's new effect, since the supply cap it raised is gone | Each spawner beside it fields 1 more unit | §4.4 | R2 |
| 27 | What v1's upgrade levels do in R2, before augments replace them | A level that adds a unit per spawn adds one per batch to the squad; gold per tick becomes +12 a round; levels on building HP, the supply cap or spawn speed do nothing and stop being offered | §11.6 | R2 |
| 28 | Are `plant`, `sell` and `toggleMerge` refused while your draft is open, as `beginClash` is? | Yes: you pick, reroll or skip before planning goes on | §4.7, §14.5 | R2 |
| 29 | A bank reserve: gold the general keeps back for interest | 0: it spends whatever it can | §7.2 | R2 |
| 30 | The general's lane rule on Twin Roots | The lane where it lost the most last round, its need lowered by each squad it plans there (D42) | §7.3 | R2 |
| 31 | Should a counter land a round after its analysis, so the player's build gets a round to pay off? | No: it activates in the planning phase of its analysis | §7.4 | R2 |
| 32 | What a run saved before R2 becomes. It MUST NOT be lost silently, and its key stays | It migrates, keeping its kit, relics and progress, with 3 lives; the alternative is to end it with a notice | §8.9 (§13.8 points there) | R2 |
| 33 | Does the battle-1 economy tip still help, now that the general plans first and can punish a greedy opener? | Keep it as it is | §10.2 | R2 (its playtest) |
| 34 | Should the tools add `docs/archive/v1/ideas/rounds.md`'s second bot policy, "buy the answer to what you saw", and should the run guardrails (G14, G15) use it? | Bots plan by fixed weights | §12.2 | R2 |
| 35 | The bands of G6's second clause and of G14–G16, and G6's 700-HP deficit | §12.3's numbers, set by R2's first full measurement and its playtest | §12.3 | R2 |
| 36 | The sixth core archetype, and the core six as a whole, which the user wants to discuss further | The Burster Pod; the alternative is the Puffball Mortar as an emplacement (D44) | §1.3 #6, §11.2, §14.2, Appendix A | R3 (R1 measures both candidates) |
| 37 | Does an augment attach to a building type (all its copies) or to one card? | The type, for the run (D39) | §1.3 #7, §8.10, §11.13, §14.2 | R3 |
| 38 | How many augments one building type may hold, and do merged units keep their squad's augments? | 2; yes | §11.13 | R3 |
| 39 | Do damage-taken changes from augments and combos (`takenMult`) count toward a hit's effectiveness class, its hit sparks and matchup marks, as merge perks' resistances do? | Yes, so a flipped matchup shows as one | §14.2 | R3 |
| 40 | Does a combo stack when a building has two partners? | No: a squad gets each combo's effect once | §11.14 | R3 |
| 41 | How the general's analysis reads an augment that flips a matchup | It rates its counter set against your squads as augmented, skips a building that loses, and reaches for the next answer | §7.4 | R3 |
| 42 | Does the general need more copies, since it takes no drafts? | No: the player's rule | §7.8 | R3 |
| 43 | A cap on copies of one card | At most 4; without one, plots are the only limit | §8.3 | R3 |
| 44 | Does the always-in set hold any relics? | No: the six core archetypes and the Truffle Cellar only. The Sporestorm Sigil isn't in it | §8.4 | R3 |
| 45 | Can the always-in set be banned? | No, so the swarm's answer is in every run (D38) | §8.4 (§8.1 points there) | R3 |
| 46 | What a ban does to a run pack | A pack whose building is banned isn't dealt, and the next pack is dealt in its place | §8.4 | R3 |
| 47 | A pack swap at run setup, one dealt pack traded for another (`docs/archive/v1/ideas/after-the-rework.md` Tier 4 #3) | No swap | §8.4 | R3 |
| 48 | Do the general's extra blueprints come only from the run's packs and the always-in set? | Yes, so a run without the Air pack meets no enemy Driftlings | §11.15 | R3 |
| 49 | Does each general get its own weights for the Burster Pod and the other v2 cards? | No: weight 1 for any card its weights don't list, until tuning says otherwise | §11.11 | R3 |
| 50 | Do plots from relics, traits and commanders (Mycelial Web, Root Pressure, Armilla) count toward the most plots a colony can hold? | Yes, so no source takes a colony past that limit or the performance budget | §11.7 | R3 |
| 51 | What "mono" means for G3's and G12's mono bots once copies apply: how many copies of their card they hold | None yet | §12.3 | R3 |
| 52 | Does the shape language read at the field's scale in a 1280×720 window (2×, and about 1.78× on Twin Roots), or does a clash need a closer view? | It reads, with no closer view. The plan, agreed 2026-11-01: Twin Roots is the worst case, with a lineup capture of its own, and pips are at least 2 native px wide (units carry no weapon mark since 2026-11-01, §5.8) | §10.4 | R4 (R4b's playtest gate); R2's first playtest reads it first |
| 53 | **(closed 2026-11-01)** Should a merged unit's body radius still grow ×1.25 per tier now that its sprite doesn't? | Decided: no. `tierRadiusMult` becomes 1.0, and R2 changes the data inside its first golden refresh. R4a, which moves no golden, leaves it | §5.6 | R4a's plan (S0) |
| 54 | Does area damage get a matchup mark against crowds, since no body size is strong or weak against it? | No: the Burster's own silhouette and its burst are the cue (units carry no weapon mark, §5.8) | §5.8 | R4 |
| 55 | **(closed 2026-11-01)** What mark the Tender gets, since it has no weapon | Decided: the heal mark. Superseded the same day: units carry no weapon mark (§5.8), so the Tender carries none | §11.3 | R4a's plan (S0) |
| 56 | An in-world name for lives | The working name *Regrowths* | §2, §8.5 | R4 (the card-text pass) |
| 57 | May a strain, chosen before the run, change a unit's body or weapon? If it may, its drawn body changes with it | No, as for augments, so *Ironcap*, *Gillguard* and *Thornpuff* need new patches | §9.3 (§5.8, §11.5 and §14.1 point there) | M6 |
| 58 | How strains and augments divide the work (*Bursting* reads like an augment; Tier 4 #4 suggests strains as draftable mutation cards) | Strains are the loadout chosen before a run, augments the build found during it; R3 and M6 remove overlaps | §9.3 | M6 |
| 59 | Are a commander's core buildings outside the six core archetypes gated by the unlock ladder? | No: the core is the commander's identity | §9.2 | M6 |
| 60 | What a run deals when fewer than 4 packs are unlocked | Every unlocked pack | §9.2 | M6 |
| 61 | The Velvet Shrine's and the Rootgate's new effects | Shrine: the squad in front of it fields 2 more units. Rootgate: a 1200 HP root-wall emplacement, restored each round | §11.2 | M6 |
| 62 | The Three Hollows' colonies: its 5-row lanes and 3 home columns don't divide into 2×2 plots in 2 ranks | 3 lanes of 4 rows and 4 home columns, 12 plots in all | §4.6, §11.9, §16 (M7) | M7 |
| 63 | The Gray Rot's area archetype | A Gray Rot Burster (working name Ashburst Sac, then Ashburster) | §11.12 | M7 |
| 64 | Gray Rot counterparts for the healer, fast swarm, tunneler and flyer roles | M7 names them, one per role, each with its role's body and damage type | §11.12 | M7 |
| 65 | Do surviving flyers count toward Heartcap damage in the aftermath? | Yes, like any living unit | §5.3 | Later (with flyers) |
| 66 | An Anti-Air counter kind for flyers | None until flyers arrive | §7.4 | Later (with flyers) |

### 18.3 Tuning knobs: where to turn first

| Symptom | First knobs (all in data) |
|---|---|
| Battles run long, or too many reach round 9 | Damage per surviving supply (`heartcapDamagePerSupply`, 25), the round cap (`roundDamageCap`, 500), the Sporestorm's first round (5) and step (20%), the general's Heartcap (`heartcapEnemyHp`) |
| A Heartcap falls in too few rounds | The round cap, damage per surviving supply, `siegeHeartcapMult` (2), both Heartcaps' HP |
| Clashes stall at the 45 s cap | Area damage (the Burster, spore clouds, cleave), the gap between front ranks (`formationGapTiles`, 6), the clash cap (`clashCapSeconds`) |
| Battles snowball, with no swing back | Comeback gold (`comebackGold`, +40), the round cap, `interestCap` |
| Swarm play dominates | The Burrow's squad size, and its copies from R3; Scythecap cleave, the Burster, the Elder Sporeling's splash |
| Archer play dominates | Pinning (`pinned.rateMult`, 0.35), the Gill Archer Nest's squad size, and its copies from R3; the Rhizomorph |
| One building is in every winning colony | Its squad size, its price; from R3, its copies and how often its pack is dealt |
| Merging feels mandatory | `tierStatMult` (2.8) down, the slayer multiplier (`tagMult.slayerVsElite`), merged units' supply in Heartcap damage (`tierSupplyMult`) |
| Merging feels pointless | `tierStatMult` up, `mergeRadius` (the muster's reach), `mergeKnitSeconds` (knits after the muster only; the muster's take no time) |
| The general feels unfair | Its kit's growth per battle (`enemyKit`), from R3 its augments per battle index, counter weight (`ai.counter.counterMult`, ×3), its Heartcap. Not its income, which stays ×1.0 outside blights (D41) |
| The general feels easy | The same knobs the other way; then a blight that raises its income (§11.8) |
| Economy builds dominate | The Truffle Cellar's +50 a round, `loamBonus`, `interestCap`, the stipend (`stipendPerRound`) |
| Placement doesn't matter | The number of plots, stump plots, the formation box's depth, the gap between front ranks; from R3, the combos (§11.14) |
| Builds look the same run to run | The core's draft weight (`draft.coreWeight`); from R3, packs dealt per run (`packsPerRun`, 4 of 10), copies per draft, the augments' strength |
| Runs end too early, or never end | Lives (`lives`, 3), the Grove's regained life, the general's Heartcap by battle index |
| The biggest clash is too slow | Squad sizes, the most plots a colony can hold (D33) |

---

## Appendix A: Retired v1 systems

v2 retires these v1 systems. Each row says what the system was, where the [v1 spec](https://github.com/Swalliso/Sambattler/blob/aa37365/SPEC.md) described it, what does its job now, and why it went. The decisions are the user's, made on 2026-10-31 after the combat rework's P3 playtest (§1.3). The evidence is in `docs/playtest-feedback.md` (F numbers), `docs/archive/v1/ideas/after-the-rework.md` and its folder, and `docs/archive/v1/ideas/rounds.md`.

The code for every retired system remains until milestone R2 removes it, with its tests, goldens and guardrails (§16). A v1 subsection whose system is retired stays in this spec as a short stub under its old number.

**Why so much went at once.** The P3 notes pointed at the structure, not the tuning ([P3 notes](docs/playtest-feedback.md#2026-10-31-p3-the-combat-rework-the-user)):
- the opener felt like gambling, because "you don't know if your opponent is going to bum rush you with a big sporeling swarm or if they're going to build economy buildings first" (F18);
- waves felt like "trying to do both a real-time thing mixed in with a turn based thing" (F19);
- placement didn't matter: the user filled the home zone from the top left down (F20);
- the close calls left no mark, with the run's Heartcap at 3000 → 3000 in all four battles.

Most of the systems below served the continuous battle, and rounds do their jobs ([rounds.md, "Today's systems under rounds"](docs/archive/v1/ideas/rounds.md#todays-systems-under-rounds)).

### The retired systems

**The live battle**

| System | What it was (v1) | v1 § | In v2 | Why |
|---|---|---|---|---|
| Spawn timers | Each spawner made units on its own timer, with a half-interval first spawn; a render bar showed the next spawn | §4.4, §10.2 | Each building fields one squad a round, fresh, in formation (§4.4, §4.7) | Units arrived one or two at a time, the first of the rework's three causes of one-sided battles ([combat-rework.md](docs/archive/v1/ideas/combat-rework.md#three-causes)). Rounds remove the trickle by construction |
| The 60 s wave | A beat of the battle clock that drove drafts, interest, the Sporestorm and the counter cycle | §4.2, §18.1 D1 | The round: drafts, interest, the storm and the counter cycle count rounds (§4.2) | Under the rework "wave" named two clocks, and the user found the mix of real time and turns hard to follow (F19; [after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md#where-the-fun-stands-on-develop), problem 11) |
| The deploy phase | A paused phase before the battle's clock started, with a 100% refund | §4.2, §10.2 | Round 1's planning, after the general has planned (§4.7, §10.2) | The opener was a guess (F18). Now every round opens with planning, and the general's opener is on the field first |
| Placing while live | Planting and selling at any time, with an active pause | §4.4, §10.3, §18.1 D14 | Placing and selling are planning actions only. Planning is untimed (§4.2) | The user asked for "a build phase, then a fight phase" (F19) |
| Hold / Advance | Per-lane stance: a held lane gathered at a rally line behind its border (adopted 2026-10-28) | §5.2, §10.3 | Both whole armies start every clash at once, which is what Hold was for (§5.2). The commander power is the one live action (§6.6) | Nothing trickles under rounds, so there's nothing to group. Under waves Hold became routine ([after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md#where-the-fun-stands-on-develop), problem 7) |
| Power cooldowns | A commander power recharged on a cooldown, first ready after a delay | §6.6 | At most once per clash (§6.6) | A clash lasts 20–40 s, so a cooldown would mean once anyway |
| The income tick | Income every 5 s: the stipend and economy buildings | §6.2 | Income once a round, at the start of planning (§6.2) | You plan with your gold in front of you, which gives interest a moment ("bank 140 for +7"). Round 3's testers found interest confusing (F4) |

**Territory**

| System | What it was (v1) | v1 § | In v2 | Why |
|---|---|---|---|---|
| Column capture | A column-by-column tug-of-war in each lane: the frontier column flipped after you out-muscled the enemy there (presence ≥ 1.5×) | §4.3 | Heartcap damage per round is the score. The two Heartcap bars and the round tally show who's winning (§4.5, §6.7) | Testers found capture awkward or confusing (F6). The side holding more ground at 2:00, 3:00 and 4:00 went on to win only 39, 41 and 44% of the time under the rework ([after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md#where-the-fun-stands-on-develop), problem 3) |
| Borders, frontiers and home zones as build space | You could build only on your own ground; home columns never flipped; buildings were forts that held a column | §4.3, §4.4 | The colony: fixed 2×2 plots whose rank and file set the formation (§4.6) | Under the rework the best plot was worth about 5% of a building more than the median one (25% on M5), from 14 legal plots (problem 4). Placement now sets position |
| Presence | Each unit's weight in a column's tug; merged units counted their supply | §5.5, §18.1 D7 | Merged units' supply counts toward Heartcap damage (§5.5, §6.7) | It existed for column capture |
| Forward building and the supply-line cost | Buildings past your home columns cost +5% a column | §6.3 | Plots are fixed in your colony (§4.6) | Two playtests found forward building not worth it (F1), and its readability question never got an answer (F3) |
| Besieged spawners | A spawner under attack spawned at half speed | §4.4, §18.1 D8 | Buildings take no part in a clash and can't be hit (§4.6) | Under rounds archers shoot the army in front of them, not spawners from out of reach (rounds.md, "What changes in how armies meet") |
| Buildings as targets | Buildings had HP, could be razed, and siege units dealt ×2 to them | §4.4, §5.3 | Buildings can't be hit and aren't lost between rounds. Siege units count double toward Heartcap damage (§6.7) | Gives the Rootbreaker a job when there's nothing to break. F12's repair question becomes moot |
| Comeback income by columns | +1 gold per 2 columns behind per income tick, up to 6 | §6.2, §18.1 D17 | +40 gold to each round's loser (§6.2) | Paid by ground, it went the wrong way: eventual winners and losers each collected about 69 gold a battle under the rework ([after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md#tier-1-now-while-you-playtest), item 4) |
| Rich Loam and stumps in the contested middle | Loam tiles and stumps on the map between the home zones | §4.1, §11.9 | Loam and stump plots inside each colony (§4.6, §11.9) | Every loam tile on the maps, and every one of Stumpfield's stumps, lay in ground that rounds don't use (rounds.md) |
| The front-line graph | The report's graph of each lane's borders over time | §5.7, §10.4 | The report's round chart: Heartcap damage both ways by round (§10.4) | Ground stopped predicting the winner (problem 3) |

**The Heartcap's defenses and clock**

| System | What it was (v1) | v1 § | In v2 | Why |
|---|---|---|---|---|
| Heartcap turrets | Two turrets per lane at each Heartcap | §4.5 | The per-round damage cap protects the loser (§6.7) | Turrets protected a base under a continuous push. Under the rework a beaten Heartcap still died a median 12 s after its first hit, with 0 comebacks in 720 battles (problem 2) |
| The 10:00 Decision | At the time limit, more territory won, with reduced rewards | §6.5 | A Decision after round 9, by Heartcap damage dealt in the battle (§6.5) | The same tiebreak without columns. Under waves, the swarm's answers won Decisions by holding columns rather than by taking the Heartcap (30–48% Decisions in P1c; rounds.md) |
| The timed Sporestorm | Stacks every 60 s from 4:00: units dealt more, turrets less, Heartcaps took more | §6.4, §18.1 D12 | Round escalation: round damage +20% a round from round 5, up to ×2.0 (§6.4) | It stays the stalemate breaker, now across rounds, and the 45 s cap breaks a stall inside a clash |

**The run's Heartcap**

| System | What it was (v1) | v1 § | In v2 | Why |
|---|---|---|---|---|
| Heartcap HP across a run | One Heartcap of 3000 for the run; its HP carried from battle to battle, and a Decision loss cost 25% of max HP | §8.5, §6.5, §18.1 D3 | Per-battle Heartcaps, both full at the start of each battle, and 3 lives for the run (§4.5, §6.5, §8.5) | The user: losing Heartcap in a battle you win "feels like punishing a player for succeeding". 92% of battles started at full HP, so run HP was all or nothing, and the P3 summary read 3000 → 3000 despite close calls ([after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md#tier-1-now-while-you-playtest), item 2) |
| Repairs | A Rout win's +10%, the Grove's +30%, Quiet Clearing's 15% and Mending Moss | §8.5, §8.7, §11.7 | The Grove regains a life (§8.7). Mending Moss keeps an in-battle heal as a first guess (§11.7), and the events get new effects (§8.7) | Nothing to repair once Heartcaps are per battle. Grove repair was chosen on 3 of 98 visits |

**Limits, hints and content**

| System | What it was (v1) | v1 § | In v2 | Why |
|---|---|---|---|---|
| The supply cap | 60 supply on the field per side | §5.4, §6.3 | Plots are the build limit, and copies join them in R3; supply stays as a unit's weight (§4.4, §5.4, §8.10) | "Mass the cheapest spawner" kept winning: G3 failed on mono Sporeling at 83 and 86% under the rework (F2; [after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md#short-answer)). Copies make it impossible by construction |
| The vague telegraph | A warning of a counter's broad kind, 2 waves ahead, without its units; the General's Intent countdown | §7.4, §7.5, §18.1 D9 | You see the general's whole army before you plan. Its counters show as new buildings in its colony (§7.4, §7.5) | The opener felt like a gamble (F18), and counters become moments you can see |
| The spawn-mix read | The general estimated your army from spawn rates and merge toggles | §7.4 | It reads the squads you actually fielded (§7.4) | Exact and simpler. Under waves the read called a merged Sporeling swarm Elite in 155 of 199 reads (`src/data/proto.ts`) |
| Random enemy upgrade levels | The general's kit gained random upgrade levels each battle | §7.8 | From R3, one augment per battle index above 1, shown on its squads (§7.8) | You can see an augment and plan for it |
| Upgrade tracks | 3 levels per building, drafted; almost all flat numbers | §11.6 | Augments, which change how a building's units play (§11.13), from R3 | Almost all 42 levels were flat numbers, and 73% of runs never reached a level 3 ([after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md#tier-4-bigger-bets-for-m6-and-beyond), Tier 4 #4) |
| The shared unlocked pool | A run's draft pool: the commander's core plus every unlocked building | §8.4 | The commander's core, an always-in set and 4 of 10 random themed packs (§8.4, §11.15) | Runs differed too little before battle 1 ([after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md#tier-4-bigger-bets-for-m6-and-beyond), Tier 4 #3) |
| Selling by timer | 100% refund in deploy or within 10 s before a building produced, otherwise 60%; no selling while besieged | §4.4, §18.1 D18 | 100% in the planning phase a building was planted, 60% once it has fielded; from R3 the copy returns (§4.4) | The timer rules guarded live production, which is gone |
| Bigger merged units | Bloomed drawn at ×1.25 and Elders at ×1.5 (`TIER_SCALE`) | §10.4 | Pips mark merge tiers, and body size means armor (§5.8) | Units were hard to tell apart (F17); size has to mean one thing |
| Mid-battle saves from the command log | Saves at every wave boundary, resumed by replaying the battle | §8.9 | Saves at the start of each planning phase and at Begin; a clash resumes by replaying it from its Begin save (§8.9) | The state between rounds is small and stable |
| Effects tied to retired systems | Vesper's passive and the generals' passives about spawn speed, Armilla's capture passive and Rhizome Tithe, the Lichen Baron's building HP, the Pale Sovereign's turrets; relics, traits, feats and blights about capture, columns, turrets, the forward price, spawn timing and the storm's clock | §7.7, §9.2, §11.7, §11.8, §11.10 | New effects or retirement, listed where each lives (§7.7, §9.2, §11.7, §11.8, §11.10) | Their system is gone |
| Guardrails and tests of retired systems | G4's band on the sim clock, G6's 6-column deficit, the territory, besieged and spawn-timing tests, v1's eight goldens | §12.3, §15.5, §15.7 | Round versions where a check persists; new checks for stalls, rounds per battle and comebacks (§12.3, §15) | Tests follow the spec (§1.3 #13) |

**Exclusions removed**

| Exclusion | v1 § | In v2 | Why |
|---|---|---|---|
| Flying units, anti-air and burrowing | §17 #7 | Unlockable roles: the Rhizomorph tunneler, and a flyer under the rework's rule C (§11.2). Terrain that changes movement stays out (§17 #22) | The rework built both; P2 and the flyer tests found where they help and where they take over ([combat-rework.md](docs/archive/v1/ideas/combat-rework.md#what-p2-found)) |
| Core placement synergy | §17 #11 | Combos: in front of, behind, beside (§11.14) | Placement didn't matter (F20). Each combo changes what happens, because flat percentages per neighbour measured below the spread tool's noise ([after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md#what-not-to-do-again), DR-7) |

### The rework's pieces and proposals that v2 didn't adopt

Each row here follows from a decision of 2026-10-31, cited as §1.3 #N. Proposals that no decision settles are under "Not in v2 yet (undecided)" below.

**The combat rework's pieces** (`?proto=rework`, `src/data/proto.ts`). Pinning, spore clouds, cleave, the Burster and the Rhizomorph carry into v2 (§1.3 #11, §5.3). The rest:

| Piece | What it was | In v2 | Why |
|---|---|---|---|
| Waves on a 20 s beat | Spawns waited inside their building, and each lane's wave set out together on a shared beat | Retired (§1.3 #1, #11) | A round is the whole army in one wave, and nothing carries over. Waves felt like real time mixed with turns (F19) |
| Hold under waves | A held lane kept its next wave home for one beat | Retired (§1.3 #11) | Nothing to group |
| Call for help | Units within 5 tiles of an attacked friend took the attacker | Retired (§1.3 #11) | Its job was buildings shot with no answer; buildings aren't in a clash, and units already fight what's near them. It never had a visual |
| Mixed-wave shields | A wave of 2 or more unit types set out with shields of 20% of each unit's max HP | Not adopted; R1 measures whether mixed armies need them (§1.3 #11, §18.2) | Under waves they carried the strict counter bar: without them, mono Sporeling's best answer fell from 85% to 47% ([combat-rework.md](docs/archive/v1/ideas/combat-rework.md#p1d-fewer-stalls-and-the-shields-carry-the-strict-bar)). Rounds give a mixed army information, another edge |
| Storm-grown waves | Each Sporestorm stack made waves 20% bigger | Retired with waves (§1.3 #1) | The storm raises round damage instead (§6.4) |
| The Elder Sporeling's splash off | The swarm's Elder lost its splash | Measured in R1 (§1.3 #11, §18.2) | Under waves it was worth 9–18 points to the swarm, because waves doubled merges. Under rounds merges will be common too |
| Flyers (the Driftling and its Drift Stalk) | Floating units that held no ground, under rule C | Later, as an unlockable flyer, starting from rule C (§1.3 #11, §11.2) | A flyer army took over G3 (mono Drift Stalk 89%, 72% under rule C) |
| The general's swarm read | A 1-supply unit's spawner read by its armor, merged or not | Simplified: the general reads the squads you fielded (§1.3 #11, §7.4) | Exact under rounds |

**Step B's prototypes** ([one-more-run-review.md](docs/archive/v1/ideas/one-more-run-review.md#step-b-results-2026-10-30); `?proto=` presets in `src/data/proto.ts`). `hotstart` and `breach` are undecided, below. The one a decision settles:

| Prototype | What it was | In v2 | Why |
|---|---|---|---|
| `bigdrafts` | Two drafts of 2 picks from 4 cards | Not adopted: drafts come after rounds 2, 4 and 6 (§1.3 #12, §8.3) | Its finding stays: a bigger draft means more picks, not rarer cards |

**`docs/archive/v1/ideas/rounds.md`'s choices that v2 changed** (its own list is at its top):

| rounds.md | In v2 | Why |
|---|---|---|
| Both sides commit at once, on last round's information; round 1 is planted blind | The general plans first, and you see its whole army, its opener included (§1.3 #3) | The user chose it so the opener isn't a gamble (F18). The information edge is the player's by design |
| A counter warning on the planning screen, with its kind and the rounds to go | Counters show as new buildings in the general's colony (§1.3 #3, §7.4) | You already see its army |
| One Heartcap for the whole run, with repairs as real choices | Per-battle Heartcaps and lives (§1.3 #2) | A won battle should never cost anything |
| The supply cap stays at 60 | No supply cap; plots, and copies from R3 (§1.3 #4, #5) | One limit instead of two |
| The Puffball Mortar fields itself as an emplacement | One of the two candidates for the sixth archetype (§1.3 #6). **Open:** the sixth archetype (first guess: the Burster Pod; §11.2, §18.2) | The user wants to discuss the core six further |

**`docs/archive/v1/ideas/after-the-rework.md`'s proposals.** v2 folds in lives (item 2), reading the enemy (item 5, as the general planning first), the generals' kits on their route nodes (item 8), themed packs (Tier 4 #3, as run packs), mutation cards (Tier 4 #4, as augments) and the unlock ladder (Tier 4 #7, in M6). "Run it back, and records" (item 7) is independent work (§16, M6). These follow from a decision and aren't adopted:

| Proposal | Settled by | Why not, under v2 |
|---|---|---|
| AI holds, and Strike (item 1, Tier 3) | §1.3 #1, #11 | No waves and no Hold |
| Comeback gold paid by army (item 4) | §1.3 #12 | Comeback gold goes to each round's loser |
| An army gauge and gate previews (item 5) | §1.3 #1, #3 | You see the general's whole army before you plan, and the lane tug shows surviving supply in a clash (§10.2) |
| A pending building that waits for gold (item 6) | §1.3 #1 | Planning is untimed, so there's nothing to wait for |
| Deciding what territory is for (item 9) | §1.3 #4 | Territory is retired |
| Knitting at the door, an Elder cap, a knit cost (item 10) | §1.3 #9 | Merging stays as v1's rule for now; R1 and the playtests decide whether it needs more |
| Second Wind (item 11) | §1.3 #1 | The commander power is the one live action. A lost round already costs little, and the loser gets +40 gold |

### Not in v2 yet (undecided)

No decision of 2026-10-31 covers these, and the user hasn't rejected them. None is a rule in v2. Each can come back as a proposal, and the note says what v2 has in its place for now.

| Proposal | Source | What it was | Note |
|---|---|---|---|
| `hotstart` | Step B; [after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md#url-variants-worth-playing-beside-protorework) | A free draft at deploy, and a battle-1 general on ¾ income | Under the rework, battle 1 was lost 53% of the time without it and 26% with it (step B's own measurement: 33% → 18%). v2 has no deploy phase, and the general's income is ×1.0 outside blights (§1.3 #3). Lives already make battle 1 a setback rather than the end (§1.3 #2) |
| `breach` | Step B; [after-the-rework.md](docs/archive/v1/ideas/after-the-rework.md#url-variants-worth-playing-beside-protorework) | Defensive pulses at ⅔ and ⅓ of the Heartcap | Under the rework the fall went from 12 s to 31 s (step B: 18 s → 45 s), with identical outcomes and 0 comebacks. Under v2 a Heartcap takes damage only in the aftermath, and the per-round cap (§6.7) is what keeps it from falling at once |
| The battle-1 package (item 3) | after-the-rework.md, Tier 1 | `hotstart`, moving Old Mother Mold out of battle 1, and related data changes, measured side by side | Battle 1's general and its difficulty are tuned in data. Lives and the general planning first change what battle 1 has to teach |
| Keystones and seasons (Tier 4 #5, #10) | after-the-rework.md, Tier 4 | Big rule cards at run start and after rows 3 and 5; one rule per run for both sides | For now augments, combos and relics carry run variety (§1.3 #7, #8) |
| The boss's Edict (Tier 4 #6) | after-the-rework.md, Tier 4 | One rule per run, shown on the boss node from row 1 | For now the boss's Heartcap, kit and dual doctrine are its challenge (§7.6, §7.8) |
| Lane pairs (Tier 4 #8) | after-the-rework.md, Tier 4 | Two-building rules, Hunting Pack first | Combos cover rules between neighbours for now (§11.14) |
| A branching route (Tier 4 #9) | after-the-rework.md, Tier 4 | A route with paths instead of one node per row | The route stays as v1's for now (§18.1 D21) |

---

*End of specification.*
