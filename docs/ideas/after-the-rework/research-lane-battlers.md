# Research: what makes lane tug-of-war and real-time army games fun, and what Spore & Sprawl lacks

Evidence for [After the combat rework](../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): web research on lane battlers and real-time army games. Written by an agent during that review; nothing here is adopted. Recovered from the session transcript.

Written 2026-10-31 against `develop` at `ef2e133` (a separate checkout). Web research only; nothing in the repo was changed. **Nothing here is adopted or measured.** Every mechanic below is a candidate for the user to discuss, and any rule change still needs the user's OK (`.claude/rules/balance.md`).

## How to read this

1. [What the repo already covers](#what-the-repo-already-covers), so the new material is clear.
2. [The problems this research is aimed at](#the-problems-this-research-is-aimed-at), with codes used throughout.
3. [Per-game notes](#per-game-notes), with links: verbs and how often they're used, pacing, comebacks, how bases fall, how territory pays, readability, and what players and reviewers like or dislike.
4. [Patterns across the games](#patterns-across-the-games).
5. **[23 transferable mechanics](#transferable-mechanics)**, each with its sources, the problem it addresses, how it would work in our structure, what to measure, and the risk.
6. [A suggested shortlist and what to watch in the P3 playtest](#a-suggested-shortlist).
7. [Sources](#sources).

Source quality varies. Official wikis and patch notes are used for numbers where they exist; fan guides are marked as such, and numbers that sources disagree on are flagged.

---

## What the repo already covers

So that a reader can tell what's new here:

| Already in the repo | Where | Games used |
|---|---|---|
| How other games stop one unit type winning (arrive together, punish clumps, bypass the front, protect ranged, call for help, multi-axis counters) | `docs/ideas/combat-rework.md` "How other games handle it" | LoL/Dota creep waves, TFT, Mechabellum, Clash Royale (Skeleton Army, Fireball, Miner), Battle Cats (meatshields, burrowers), AoE II, SC2, PvZ (Pole Vaulter, Digger, Balloon…), Total War, WC3 call for help, Castle Fight |
| Run variety from kings, looting cards from beaten enemies, enchantments, neighbor buildings | same doc, "Waves and run variety" | 9 Kings |
| Round-based structure (Level 3) | `docs/ideas/rounds.md` | Mechabellum, TFT, Super Auto Pets, Backpack Battles, 9 Kings, Legion TD 2 (as a round game), Hearthstone Battlegrounds (damage by tier, the 15-damage cap) |
| Flyers and anti-air | `docs/ideas/flyers.md` | Kingdom Rush, Clash Royale, PvZ, Battle Cats |
| Battle-feel recommendations | `docs/engagement-review.md` | Hold / Advance (adopted), siege and breach moments, hot start, territory income, bigger drafts, doctrine waves, juice, engagement metrics |
| Built but off, waiting on a playtest | `src/data/proto.ts` presets `hotstart`, `breach`, `bigdrafts` | Breach = pulses and damage reduction at ⅔ and ⅓ HP, +150 gold to the defender |

This report goes past those in five directions the repo hasn't researched: **how lane games ramp a battle and end it** (elixir ramps, overtime, cannon cadence, flagged huge waves), **how their bases fall in steps** (turret plates, inhibitors, shrines, boss-on-hit), **how their comebacks are built** (objective bounties, counter-pushes, defender surges), **what extra verbs they give** (sends, call-early, field drops, battle XP, stances, heroes) and **how they make position pay** (gold nodes, middle-line income, forward deploy points, mercenary camps).

## The problems this research is aimed at

From `docs/status.md`, `docs/engagement-review.md` and the P2 numbers in `docs/balance-backlog.md` ("Engagement and runs, with commanders"):

| Code | Problem | Evidence |
|---|---|---|
| **OPEN** | Quiet openings | Under the P2 package the first column flips at 1:04–3:22 (today 0:34–1:40). The engagement review's human run: nothing moved until 4:30 (before Hold) |
| **CLIFF** | The Heartcap cliff | Under the package a falling Heartcap dies 5–10 s after it reaches ⅔; the winner's Heartcap is untouched in 360 of 360 battles |
| **VERBS** | Few player verbs | About 2 decisions a minute (engagement review). Bot commands per minute fall from 2.6–3.7 to 1.8–2.8 under `rework`. One power on a 75–90 s cooldown |
| **COMEBACK** | No comebacks | 0 in 360 battles, on either rule set |
| **TERRITORY** | Territory doesn't pay | F1 (forward building not worth it), F6, F15 (a building that spreads territory), F16 (a home-ground bonus). Bots bank 220–390 gold, the human run ended with 801 unspent |
| **STALL** | Endings by tiebreak | Decisions rise from 7 to 29 of 360 under the package, up to 37% against the Lichen Baron (Cordis) |
| **READ** | Hard to read | Units are about 8 px at 1280×800; the P3 questions ask whether clouds, Rhizomorphs and flyers read |
| **RUN** | Weak "one more run" pull | Battle-1 losses rise to 108 of 240 runs under the package (79 today); run HP is binary; drafts are mostly +15% cards |
| **GENERAL** | The general's counters aren't moments | Pillar 3 "weak" in the engagement review; the general doesn't answer a swarm (status item 3) |

---

## Per-game notes

Each entry: **Verbs** (and how often) · **Pacing** · **Comebacks** · **How the base falls** · **Territory and position** · **Readability** · **What players say**. "Us" lines compare with Spore & Sprawl where it's useful.

### Clash Royale (Supercell, 2016): the tug-of-war with the tightest pacing

- **Verbs:** play one of four cards in hand (eight-card deck) anywhere on your half; spells anywhere. Elixir regenerates at about 1 per 2.8 s up to 10 (fan guides; the official support page only says the rate rises during the battle). With cards costing 1–9, that's one play every 8–12 s at normal rate and every 4–6 s in double elixir (my estimate from the rates). Placement matters: where you drop a unit decides what it targets.
- **Pacing:** 3:00 of regulation; double elixir in the last minute; if towers destroyed are level, **overtime** (now 2:00, cut from 3:00) where **the first tower destroyed wins**, with triple elixir in the last minute of overtime. If nothing falls, a **tiebreaker**: every tower takes even damage until the one with the lowest HP falls ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale), [Supercell's release notes](https://supercell.com/en/games/clashroyale/blog/release-notes/november-update)).
- **Comebacks:** the **counter-push**. You defend near your own towers, which help; if your defense cost less elixir than their attack (a "positive elixir trade"), your surviving defenders plus a tank become a push the opponent can't afford to answer. Guides stress the elixir lead decays, so you attack at once ([Clash Royale support: 1v1 Battle](https://support.clashroyale.com/hc/en-us/articles/49484904683803-1v1-Battle), [Sportskeeda on elixir trades](https://sportskeeda.com/esports/how-maintain-positive-elixir-trades-clash-royale)). Also the **King Tower activation**: the king only shoots once it's damaged or a Princess Tower falls, and pulling an attacker into its range on purpose (Tornado, a well-placed Ice Spirit) gives you a third defending tower for the rest of the match. Guides call this "the highest-value defensive technique available when you are behind" ([TouchTapPlay](https://www.touchtapplay.com/best-ways-to-activate-king-tower-in-clash-royale/), [Sportskeeda on Tornado](https://sportskeeda.com/esports/how-use-tornado-effectively-clash-royale)).
- **How the base falls:** in three steps. Each Princess Tower is a crown (a partial win). Destroying one **expands your deploy zone** into the enemy half ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)) and wakes the King. The King Tower is an instant win.
- **Territory:** territory is only the deploy zone; it changes once per tower destroyed, and it matters a lot.
- **Readability:** few units on screen, big silhouettes, team-coloured bases. Spells have clear radii.
- **What players say:** critics praise short battles, accessible but deep strategy, and "one more match" pull (Metacritic 86); complaints are about monetization, not pacing ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)).
- **Us:** our 10:00 clock has an escalation (the Sporestorm from 4:00) but it escalates **Heartcap fragility** (+20% damage taken a stack), not **what the player can do**. Clash Royale escalates the player's resource and ends on a sudden-death rule, not a count.

### The Battle Cats (PONOS, 2012): the purest one-lane tug-of-war

- **Verbs:** tap a cat to deploy it at your base; each cat has its own recharge timer, so cheap "meatshields" are spammed several times a minute while "nukers" are timed. **Upgrade the Worker Cat** mid-battle (raises wallet cap and income rate; guides warn early upgrades risk being overrun, late ones leave you short when the boss arrives). **Fire the Cat Cannon**, which knocks back and damages a wave and takes about 50 s to charge from 0% ([CatCombo guide](https://thanksfeanor.pythonanywhere.com/guides/documents/catcombos.html), [BlueStacks beginner's guide](https://www.bluestacks.com/blog/game-guides/the-battle-cats/tbc-beginners-guide-en.html)).
- **Pacing:** money builds up through the battle; the classic loop is stall with meatshields, upgrade the Worker Cat to max, "stack" attackers behind the wall, then push ([Battle Cats Wiki, Heavenly Tower 10](https://battle-cats.fandom.com/wiki/Heavenly_Tower/Floor_10)).
- **Comebacks / base fall:** the enemy base **fights back when first hit**. On most stages the boss spawns when the enemy base drops to a set HP, "typically 99%"; its arrival sends a **shockwave that knocks back every cat on the field**, and if the base would die before the boss spawns it's held at 1 HP so the boss always appears. Some stages add a barrier that blocks base damage until the boss dies; others spill a stack of enemies when the base is damaged, or spawn a new boss each time the base loses a set amount ([Battle Cats Wiki: Enemy Units](https://battle-cats.fandom.com/wiki/Enemy_Units), [Version 13.3](https://battle-cats.fandom.com/wiki/Version_13.3_Update), [Into the Fray](https://battle-cats.fandom.com/wiki/Arena_of_Honor/Into_the_Fray:_Servants_Strike!)). So the final push is a **two-step assault** the player prepares for, not a melt.
- **Territory:** none; position is only how far the front sits from each base.
- **Readability:** few, large, comic units with distinct silhouettes; knockback is a clear visual verb.
- **What players say:** charm and creativity; the strategy is team variety and timing; the grind and energy limits are the complaint ([Destructoid on Battle Cats POP!](https://destructoid.com/?p=209730), [Siliconera](https://www.siliconera.com/?p=1041701)).

### Stick War: Legacy (Max Games): stances as the core verb

- **Verbs:** train units from gold that **miners** collect; switch the whole army between **Attack**, **Defend** (hold in front of your statue) and **Garrison** (pull everyone into the base, miners included, where castle archers defend, at the cost of leaving the statue exposed); **take direct control** of one unit, which makes it faster and stronger (a controlled miner mines faster); cast one-shot spells ([Stick War Wiki: Garrison](https://stick-war.fandom.com/wiki/Global_Garrison_Command), [Pocket Gamer guide](https://www.pocketgamer.com/stick-war-legacy/beginners-guide/)).
- **Comebacks:** garrisoning saves an army that's losing, and a 2025 patch made the statue's reinforcements always attack while you're garrisoned ([APKMirror changelog](https://www.apkmirror.com/?p=11277229)). The base itself produces defenders when you turtle.
- **Pacing:** economy first (miners), then army; statue upgrades add income and reinforcements.
- **Us:** Hold / Advance is our version of Defend / Attack. Stick War's third stance and its "statue fights when you turtle" are what we don't have; note status.md's "falling back early is a big edge", which Stick War prices by exposing the statue.

### Age of War (Max Games, 2007): escalation by eras

- **Verbs:** buy units, buy and sell turrets on a few base slots, fire a **special** (meteor shower, orbital laser) that "normally consists of destroying many enemy units at once and has a long cooldown, though it costs no money", and **evolve** to the next of five ages with XP from kills ([MobyGames](https://www.mobygames.com/game/age-of-war), [fan wiki](https://aowg.fandom.com/wiki/Medieval_Age?oldid=4557)).
- **Pacing:** four evolutions are four power spikes that both players race to; a guide notes that the special is wasted on scouts if used early and comes too late "if your base is already at half health" ([shapes.inc fan page](https://shapes.inc/fandom/age-of-war)).
- **Us:** our battle has no within-battle power spike the player chooses the timing of. Drafts are the closest, but they arrive on a fixed clock.

### Warpips (Skirmish Mode Games, 2021–22): units as poker chips

- **Verbs:** deploy infantry, vehicles and aircraft from cash up to a **pip supply** cap; call support powers (airstrike, drone strike, tear gas, smoke, missiles); place static defenses (turrets, sandbags, mines). **Kills give medals that you spend mid-battle on one of three things: a unit type's rank, a higher unit cap, or cash** ([Destructoid](https://destructoid.com/?p=266808), [fan guide](https://gamepretty.com/warpips-loadout-selection-and-battle-strategy/)). Units have attack and defence modes (extra accuracy or extra range, per the fan guide).
- **Pacing:** the guide's plan is defend early for quick kills, push the frontline "not to destroy the enemy" but to farm XP and **place pumpjacks and oil derricks on the ground you took**, then time the final attack **outside the enemy's scheduled waves**. Rounds run 10–20 minutes ([Steam](https://store.steampowered.com/app/1291010/Warpips/)).
- **Territory:** forward ground is where you put economy buildings, so the front pays.
- **Run layer:** in the campaign the units you deploy are spent, win or lose; Destructoid's reviewer found that treating the army like poker chips gave "a satisfying tension".
- **What players say:** fast, easy to learn, the in-battle level-ups are liked; it gets repetitive after a few hours, and the AI controlling your units is frustrating "especially when there are two lanes" ([Vaporlens summary of Steam reviews](https://vaporlens.app/app/1291010/warpips), [Destructoid](https://destructoid.com/?p=266808)).

### Legion TD 2 (AutoAttack Games): sends

`rounds.md` covers Legion TD 2 as a round game. What it doesn't cover is the **send economy**, which is the genre's most-copied verb:
- **Verbs:** each wave, build fighters in your lane and **hire mercenaries with mythium** (20 for a Snail up to 400 for a Kraken) that attack an opponent's lane at the next wave. **Spending mythium raises your gold income for the rest of the game**, so a send is both an attack and an investment; you can save mythium across waves for one big send, or **upgrade your king** instead when you expect to struggle to hold the opponent's send. Power mercs trade income for auras or tankiness ([Legion TD 2 Wiki: Mercenaries](https://legiontd2.wiki.gg/wiki/Mercenaries), [Mythium](https://legiontd2.wiki.gg/wiki/Mythium), [Switchblade beginner's guide](https://www.switchbladegaming.com/strategy-games/legion-td-2/beginners-guide-12/)).
- **Comebacks / base fall:** a leak costs three ways (you lose the wave's end gold, opponents get a bonus, your king takes damage). The king is upgradable and fights.
- **Readability:** the creature waves follow a fixed, known list (wave 10 is a known boss), so you build for the wave that's coming.
- **Line Tower Wars**, its Warcraft III ancestor, made sending the main way to raise income, and lets a player skip defense if their attacker is weak ([Steam listing of the modern Line Tower Wars](https://store.steampowered.com/app/4954340/)).

### Desert Strike / Direct Strike (StarCraft II Arcade): the closest structure to ours

- **Structure:** you place units or structures on your own build island; copies spawn as a wave at a fixed interval and march down a shared lane toward the enemy base; the more and higher-tier your build, the bigger your wave ([Blizzard: New in the Arcade](https://starcraft2.com/en-us/news/21700687), [Desert Strike guide](https://eu.forums.blizzard.com/en/sc2/t/desert-strike-1338-guide/1814)).
- **Territory pays:** in Direct Strike, "by winning fights and taking control of the middle line, your team gets 2 gases worth of income each"; losing the middle forces a choice between fighting back without gas or gassing hard to drag the game long ([Direct Strike standard guide](https://us.forums.blizzard.com/en/sc2/t/direct-strike-standard-guide/1233)). A bunker and a cannon in front of the base let a team "push back from early-game disadvantages", and killing the enemy's turret is the benchmark for safe greed.
- **Us:** this is the existence proof for "hold ground, get income" in a wave-spawning lane game, and for defensive structures as the comeback tool. The exact wave timer couldn't be confirmed from a written source.
- **Castle Fight** (WC3), which `combat-rework.md` already cites: a community note says units "don't hold the line, they go whenever and wherever they can", and that players build barracks behind the castle so a push can't reach them ([Steam workshop discussion](https://steamcommunity.com/workshop/filedetails/discussion/1757281740/4931980436575090767)).

### Warcraft Rumble (Blizzard, 2023): lanes with points to take

The task's "Rumbleverse-style lane games" most likely means Warcraft Rumble; Rumbleverse itself is a battle-royale brawler without lanes.
- **Verbs:** deploy minis with gold that accrues over time; **send a cheap unit (a Kobold miner, 1 gold) to mine a gold vein**, ideally with a second unit to secure it; pick up **treasure chests**; **capture Guard Towers and Meeting Stones** to deploy closer to the enemy. A meeting stone is claimed a couple of seconds after a non-flying unit reaches it and can be taken back ([Method beginner guide](https://method.gg/guides/warcraft-rumble-beginner-guide), [Pro Game Guides on capture points](https://progameguides.com/warcraft-arclight-rumble/what-do-capture-points-do-in-warcraft-arclight-rumble/), [Blizzard's gameplay overview](https://news.blizzard.com/en-us/article/23785121/warcraft-rumbletm-gameplay-overview)).
- **Leaders:** each army has a leader mini with a trait or ability; PvE levels end in a famous boss.
- **What players say:** "Joyful Chaos" fighting fires across lanes is the appeal; monetization is the complaint ([Massively OP](https://massivelyop.com/2023/11/17/first-impressions-warcraft-rumble-is-a-slick-but-shambolic-multiplayer-romp/), [Checkpoint Gaming interview](https://checkpointgaming.net/features/2023/10/blizzard-tells-us-all-about-the-joyful-chaos-of-warcraft-rumble), [Pocket Gamer review](https://www.pocketgamer.com/warcraft-rumble/review/)).
- **Us:** territory pays through **specific points** (a vein, a stone, a tower), not through a column count. A point gives the opening a target.

### Kingdom Rush (Ironhide): two cheap spells and a call-early button

- **Verbs:** build and upgrade towers; set barracks rally points; move the hero; two universal spells, **Reinforcements** (two soldiers, 15 s cooldown in Kingdom Rush 6) and **Rain of Fire** (60 s) ([wikily: Kingdom Rush 6 spells](https://wikily.gg/kingdom-rush-6-genesis/spells)); and **call the next wave early**, which pays bonus gold and cuts spell cooldowns, at the risk of overlapping waves ([AOL tips](https://www.aol.com/news/2014-07-30-kingdom-rush-tips-and-tricks.html), [walkthrough](https://ayumilove.net/kingdom-rush-walkthrough-guide/)). One player found the gold for an instant call small (about 20) ([Steam discussion](https://steamcommunity.com/app/816340/discussions/0/1734342161871096889)); the exact formula isn't published.
- **Readability:** tap the wave icon to see the incoming enemies; tap an enemy for its stats; an encyclopedia fills in as new enemies appear ([Encyclopedia](https://kingdomrushtd.fandom.com/wiki/Encyclopedia)).
- **Us:** a 15 s "Reinforcements" is a verb you use about four times a minute; our only active verb (the power) is used 5–7 times a battle.

### Plants vs. Zombies (PopCap, 2009) and PvZ 2

- **Verbs:** collect sun (every few seconds), plant from seed packets with per-plant recharge, dig up with the shovel. In PvZ 2, **Plant Food**: glowing zombies drop it, you drag it onto any plant for that plant's unique super action, and it can also instantly recharge a seed packet ([PvZ Wiki: Plant Food](https://plantsvszombies.wiki.gg/wiki/Plant_Food)).
- **Pacing:** a progress bar with **flags for huge waves**, announced by a Flag Zombie, at the end of every level and often mid-level; level 1-7 is the first with two ([Flag Zombie](https://plantsvszombies.fandom.com/wiki/Flag_Zombie_(PvZ)), [Level 1-7](https://plantsvszombies.wiki.gg/wiki/Level_1-7)).
- **How the base falls:** each lane has **one lawn mower**, a one-use last line that clears the lane the first time a zombie reaches the house; a second breach in that lane loses the level.
- **Us:** the flag meter is anticipation you can see; the mower is a per-lane, one-use, visible save. The `breach` prototype is close to the mower in spirit but is invisible until it fires.

### Thronefall (Grizzly Games, 2023–24)

- **Loop:** build by day, defend by night as a hero on the field. **Only buildings that survive the night pay gold the next morning**, so "houses or defenses?" is the core decision ([Siliconera review](https://siliconera.com/?p=1058854)). Version 1.0 added **enemy wave previews** ([PCGamesN](https://www.pcgamesn.com/thronefall/full-version-launch)).
- **Run variety:** perks, weapons and optional **mutators** that make a level harder for a higher score; reviewers call mutators "the most fun of all".
- **What players say:** Metascore 92; the critical review (StartMenu, 6/10) says many options won't win, there's a difficulty spike, and "minimalist visuals muddy gameplay", with enemies hard to read ([StartMenu](https://www.startmenu.co.uk/home/review-thronefall)).

### Bad North (Plausible Concept, 2018)

- **Verbs:** move up to four squads; issuing an order slows time "to a crawl" ([TheSixthAxis](https://www.thesixthaxis.com/2018/08/23/bad-north-review/)). Squads are readable as clumps with clear roles (archers, shields, pikes).
- **Stakes:** permadeath for squads; items give squads skills.
- **What players say:** minutes to learn and surprisingly tactical; the complaints are monotony (islands feel the same) and "little drives you to do better or start a new run" ([TheSixthAxis](https://www.thesixthaxis.com/2018/08/23/bad-north-review/), [Pocket Tactics](https://www.pockettactics.com/bad-north/review)).
- **Us:** a warning for our run layer: simple, readable battles weren't enough to give Bad North "one more run" pull.

### Line War (Studio Centurion, 2022)

- **Verbs:** draw lines to move units, form defensive lines and conquer ground; filter which units follow a line.
- **Territory pays:** "The more land you have, the more you'll be able to build"; towns, cities, industries and trade routes earn resources; refineries and power plants run vehicles ([Steam](https://store.steampowered.com/app/1309610/Line_War/)). Low-APM by design. One player complaint: on small maps territory "gets claimed too fast" with too few cities ([OpenCritic](https://opencritic.com/game/13114/line-war), search summary).

### MOBA lanes: League of Legends, Dota 2, Heroes of the Storm, Deadlock

MOBAs are lane tug-of-wars with a tuned, decades-old toolkit for exactly our problems (CLIFF, COMEBACK, OPEN).
- **Cadence.** Waves every 30 s; **every third wave carries a cannon (siege) minion** until 20:00, and turrets target siege minions first ([Mobalytics](https://mobalytics.gg/blog/wave-management/), [LoL Wiki: Turrets](https://wiki.leagueoflegends.com/en-us/Turrets)). Wave management (freeze, slow push, crash) is a whole skill built on that cadence: a slow push lets successive waves pile up before they crash ([LoL Theory](https://blog.loltheory.gg/wave-management-league-of-legends/)).
- **Bases fall in steps.**
  - **Turret plating:** an outer turret has 5 plates; each pays 120 gold to whoever breaks it. **Bulwark:** when a turret's HP drops past 90/75/55/30%, it gains bonus armor for 20 s, scaling with nearby enemies ([LoL Wiki: Turrets](https://wiki.leagueoflegends.com/en-us/Turrets)). Outer turrets are fortified early and decay from 11:00 to 15:00. (Plate gold differs between patches: 120–160.)
  - **Backdoor protection:** a turret takes 80% less damage when no enemy minions are nearby, so a lone champion can't sneak a structure down.
  - **Inhibitors → super minions:** destroying an inhibitor puts a super minion in that lane's waves for the next 8 waves; they stop two waves before the inhibitor respawns, so it isn't instantly lost again ([LoL Wiki: Super minion](https://wiki.leagueoflegends.com/en-us/Super_minion)).
  - **Heroes of the Storm:** destroying a fort or keep makes that lane spawn catapults with each wave and exposes the core; the core defends itself ([HotS Wiki: Fort](https://heroesofthestorm.fandom.com/wiki/Fort)).
  - **Deadlock:** two shrines must fall before the base (Patron) can be hurt; destroying a shrine sends stronger troopers down its lane; after phase 1 the defenders' respawn timers drop sharply and the Patron gains damage resistance while enemies are near ([Deadlock Wiki: Patron](https://deadlock.wiki/Patrons)).
- **Comebacks.**
  - **Objective bounties** (LoL, since patch 11.23): computed from gold, XP, dragon and turret leads; a trailing team gets bounties on objectives, about 10% of the gold deficit, capped at 1000 a bounty; they switch on 15 s after the team falls behind. Riot cut them 20–40% in 14.21 when the trailing team is already coming back, because chained bounties caused "extreme gold swings" ([LoL Wiki: Objective bounties](https://wiki.leagueoflegends.com/en-us/Objective_bounties), [patch 14.21](https://www.leagueoflegends.com/en-us/news/game-updates/patch-14-21-notes/)).
  - **Kill bounties** that scale with the victim's streak (Dota 2), and buyback ([DotaFire forum on the comeback patch](https://www.dotafire.com/dota-2/forum/general/details-and-graphic-of-comeback-patch-9905)).
  - **The wave bounces back:** a wave crashed into a turret dies there, and the next one meets the defender's wave nearer the defender's turret, so a push naturally recedes unless it's reinforced.
- **Position pays.** **Mercenary camps** (HotS): neutral groups you capture by standing near them; siege giants or knights then push a lane, and teams time them before bigger objectives ([HotS Wiki: Mercenary camp](https://heroesofthestorm.fandom.com/wiki/Mercenary_camp), [Dignitas](https://dignitas.gg/articles/blogs/Heroes-Of-The-Storm/11768/heroes-of-the-storm-how-to-fully-utilize-mercenary-camps)). **Mid-boss buffs** (Deadlock's Rejuvenator): troopers get 1.7–2.3× HP and heroes fire faster for a few minutes ([Deadlock Wiki](https://deadlock.wiki/Mechanics)).
- **Readability.** Riot's "Clarity in League": silhouette first; attention proportional to importance (damage, hard crowd control, impact); telegraphs and audio wind-ups; hitboxes match visuals ([Riot dev blog](https://www.leagueoflegends.com/en-gb/news/dev/clarity-in-league/)).

### Merge games: Hearthstone Battlegrounds, Rush Royale

- **Hearthstone Battlegrounds:** three copies merge into a golden minion **and give a Triple Reward card that Discovers a minion from the next tavern tier**, so a merge is a moment and a payout ([Blizzard's launch post](https://hearthstone.blizzard.com/en-us/news/23156373), [Icy Veins mechanics guide](https://www.icy-veins.com/hearthstone/hearthstone-battlegrounds-mechanics-guide)).
- **Rush Royale:** merging two identical units raises the rank but turns it into a random unit from your deck; bosses arrive on a schedule (2 minutes after the roulette) and some punish unmerged units, so players time merges before the boss ([TouchTapPlay on merging](https://www.touchtapplay.com/how-does-merging-work-in-rush-royale/), [on bosses](https://www.touchtapplay.com/how-to-beat-all-bosses-in-rush-royale/)).
- **Us:** merges happen 49–119 times a battle under the package, all automatic; pillar 2 is "partial" because merging isn't a decision (engagement review).

### Inscryption (Daniel Mullins, 2021): the scale and overkill

A tug-of-war of damage: you win by tipping the scale five teeth your way, and **damage past the winning blow is paid out as teeth you keep and spend** ([Wikipedia](https://en.wikipedia.org/wiki/Inscryption), [NY Game Critics](https://nygamecritics.com/2022/01/23/the-insight-in-inscryption-the-only-prize-you-win-is-a-few-more-minutes-of-life/)). Commentators say the scale builds dread better than a health bar, with clinks rising in pitch as it nears the end ([Well Played](https://well-played.com.au/inscryption-review)).

### Mechabellum's real-time half

`rounds.md` covers its round structure. On the fight itself: the appeal is spectacle ("lots of explosions, lasers and missiles firing everywhere", "quite epic to watch") and watching a plan work; **destroying one or both enemy towers briefly slows enemy units**, which "can be quite devastating" ([GamingOnLinux](https://www.gamingonlinux.com/2023/05/mechabellum-is-an-auto-battling-supreme-commander-im-completely-hooked/page=1/)). There's no control during the clash; reinforcement cards between rounds can be skipped for 50 supply ([Pro Game Guides](https://progameguides.com/mechabellum/mechabellum-tips-guide-reinforcements-research-points-specialists/)).

### Lower relevance (researched, little to take)

- **Spellcasters Chronicles** (Quantic Dream, 2025, early access): a 3v3 third-person game that "ditches automated creep waves"; summons are central; reception mixed ([Wccftech preview](https://wccftech.com/spellcasters-chronicles-hands-on-preview-quantic-dream/amp/), [Notebookcheck](https://www.notebookcheck.net/New-free-to-play-MOBA-from-Quantic-Dream-launches-on-Steam-early-access-with-Mixed-rating-and-technical-friction.1236331.0.html)). Not a lane auto-battler.
- **Clash Mini** (Supercell, cancelled): grid-stepping minis, upgrading mid-battle by deploying duplicates, heroes repositioned once a game ([Deconstructor of Fun](https://deconstructoroffun.com/blog/2022/1/14/clash-mini)). The duplicate-to-upgrade idea overlaps with merge rewards below.

---

## Patterns across the games

| | Escalation in a battle | How the base falls | Comeback tool | What position pays | Player verbs (cadence) |
|---|---|---|---|---|---|
| Clash Royale | Double then triple elixir; overtime; sudden death; tiebreaker | 3 towers; a tower expands your deploy zone and wakes the King | Counter-push after a cheap defense; King activation | Deploy zone after a tower falls | A card every 4–12 s |
| Battle Cats | Money ramps; Worker Cat levels | Boss at 99% base HP with a knockback shockwave | The base fights back | None | Many deploys a minute; cannon ~50 s |
| Stick War | Economy then army | Statue | Garrison; statue reinforcements | None | Stances, direct control, spells |
| Age of War | Five ages | Base with turret slots | Special with long cooldown | None | Buy, turret slots, special, evolve |
| Warpips | Medals buy rank, cap or cash | Base | Static defenses | Forward ground holds pumpjacks | Deploys, support powers, medal spends |
| Legion TD 2 | Fixed wave list, wave-10 boss | King with HP; leaks | King upgrades | n/a | Build + send each wave |
| Direct Strike | Tiers | Bunker, cannon, base | Defensive turrets | **Middle line pays gas** | Build between spawns |
| Warcraft Rumble | Gold accrues | Towers, base | Retaking stones | **Gold veins, chests, stones, towers** | Deploys, mining runs |
| Kingdom Rush | Waves; call early | Lives | Spells | n/a | Reinforcements 15 s, meteor 60 s, call early |
| PvZ | **Flagged huge waves** | **One mower per lane** | The mower | n/a | Sun, planting, Plant Food |
| LoL / HotS / Deadlock | **Cannon every 3rd wave**; super minions | **Plates, bulwark, backdoor protection, inhibitors, shrines** | **Objective bounties**; wave bounce | **Mercenary camps; mid-boss buff** | Constant |
| **Us (package)** | Storm: +10% damage, +20% Heartcap damage taken, waves +20% a stack | **One HP bar, dies 5–10 s after ⅔** | **Passive comeback income (≤ 6 a tick)** | **Build space (surcharged)** | **~2 decisions a minute; a power every 75–90 s** |

Four things every successful game here has and we don't:
1. **The ending escalates what the player can do**, not only how fragile the base is (elixir, money, medals, ages).
2. **The base falls in visible steps that each change the game** (a crown, a plate, a woken king, a boss, a mower).
3. **Comebacks are actions with a payout spike** (a counter-push, a bounty, a retaken stone), not a passive trickle.
4. **Position pays at specific points** (a vein, the middle line, a camp, a tower), not per abstract column.

---

## Transferable mechanics

23 candidates in six groups. Each lists its **sources**, the **problem codes** it addresses, **how it would work here** (columns, spawners, the 20 s beat, Hold / Advance, merging, the Heartcap, the general), **what to measure** with the existing checks (`--checks engagement,runs,g3,g4,counters`), the **risk**, and how it relates to what's **already in the repo**. Numbers are starting points for a prototype, not proposals to adopt.

### A. Pacing: opening, escalation and the end

#### 1. Siege beats (a cannon every third wave)
- **Sources:** LoL's cannon minion every third wave, which turrets target first; HotS catapults.
- **Addresses:** OPEN, CLIFF, and gives siege a job (combat-rework "What waits": "if siege still lacks a job").
- **How it works here:** under `waves`, every third beat (0:40, 1:40, 2:40…) each side's wave in each lane brings one free siege unit (0 supply, slow, tanky, +damage to buildings, low damage to units). Heartcap turrets and towers target it first, as LoL turrets do, so it soaks fire during a siege. Both sides get it, so the first heavy thing walks into midfield at 0:40 and the opening has a pulse. Relics and commander perks can act on it ("your siege beats bring two"), which is what "waves give perks something to act on" asked for.
- **Measure:** first flip (target before 1:30), Decisions %, G4, the counter matrix.
- **Risk:** free units reduce agency; it may favour whoever is already ahead, since their siege unit arrives nearer the enemy. Supply-free units must not break the supply cap's job.
- **Repo:** new. `stormwaves` grows waves 20% a stack, which is size, not cadence.

#### 2. A visible battle timeline with flagged huge waves
- **Sources:** PvZ's flag meter and Flag Zombie huge waves; Rush Royale's scheduled bosses; Legion TD 2's known wave list and wave-10 boss; Thronefall's wave previews.
- **Addresses:** OPEN (anticipation), READ, GENERAL.
- **How it works here:** a strip under the territory tug shows the 20 s beats as ticks, the 60 s wave boundaries, the draft points (waves 2, 4, 6, 8), storm stacks from 4:00, and the general's counter warning (2:00) and activation (4:00). The beat on which a counter activates becomes a flagged **doctrine wave**: ×1.5 the general's wave, a banner and a callout. That's engagement-review rec 6, but anchored to a beat the player can see coming and prepare for (Hold the wave before it, save the power for it).
- **Measure:** the playtest's "when were you bored?"; whether the player's power use clusters on flagged beats.
- **Risk:** mostly UI; a ×1.5 doctrine wave could decide battles if the player has no answer, so it needs the answer pick from rec 6 or a cheap verb (#12, #13).
- **Repo:** extends rec 6; the timeline itself is new.

#### 3. Escalate the economy, not the Heartcap's fragility ("double bloom")
- **Sources:** Clash Royale's double elixir in the last minute and triple in overtime; Battle Cats' money ramp and Worker Cat; Warpips' medal-to-cash.
- **Addresses:** CLIFF, STALL, VERBS.
- **How it works here:** replace the storm's "+20% Heartcap damage taken a stack" with income steps: stipend and economy ×1.5 from 6:00 and ×2 from 8:00 (stipend 8 → 12 → 16 a tick), with +10 supply cap at each step so the gold becomes waves. A "Double Bloom" callout marks it. The end is reached by bigger armies the player chose, not by a brittle Heartcap. Keep `stormwaves` or replace it: `stormwaves` grows waves for free, while this gives the player more to decide.
- **Measure:** ⅔→dead and ⅓→dead, Decisions %, G4 median, gold banked, decisions per minute.
- **Risk:** the 60 supply cap binds and gold piles up again, so it needs a gold sink (#12, #17); bigger late armies may favour the side already ahead.
- **Repo:** the engagement review (rec 2) suggested dropping the storm's Heartcap bonus, and `breach` halves it. What's new is putting the escalation into the player's hands, as Clash Royale does.

#### 4. Overtime and sudden death instead of a column count
- **Sources:** Clash Royale's overtime (the first tower destroyed wins) and tiebreaker (every tower takes even damage until the lowest falls).
- **Addresses:** STALL (Decisions up to 37% against the Lichen Baron), CLIFF.
- **How it works here:** at 10:00, if both Heartcaps stand and the column lead is 2 or less, play 60 s of **Overtime**: storm at its maximum, beats every 10 s, and the first side to destroy any enemy structure in the enemy's last three columns (a turret, a plate from #6, a home building) wins. If nothing falls, both Heartcaps "wither" at the same rate until the lower HP fraction gives out (today's second tiebreaker, shown as an event). A lead of 3 or more columns still wins by Decision. Decision rewards (half) and the Decision loss (−25% run HP) stay as they are.
- **Measure:** Decisions %, battle length (G4), share of overtime battles won by the side that led at 10:00.
- **Risk:** adds up to a minute; the "first structure wins" rule rewards forward towers and Rhizomorph dives in a way G3 must check.
- **Repo:** new.

#### 5. Call the beat early
- **Sources:** Kingdom Rush's "call the next wave early" (bonus gold and shorter spell cooldowns); the Warpips guide's advice to time attacks around the enemy's waves.
- **Addresses:** VERBS, OPEN.
- **How it works here:** a command `callBeat { lane }` fires the next beat in that lane **for both sides at once**, so waves still meet together (the fix for trickle fights stays intact). The caller gets 1 gold a second skipped (up to 20) and the same seconds off its power cooldown; once per lane per 60 s. Only units already waiting leave, so an early call sends a smaller, maybe unshielded wave (the mixed-wave shield needs two types): that's the price. With Hold (delay one beat) it completes a timing verb pair: call when the general's next wave (#20) is weak or mid-merge, hold when it's strong.
- **Measure:** first flip, decisions per minute, G3 (calling could favour cheap fast spawners).
- **Risk:** always calling may dominate early; the general needs a policy; calling could strip the defender of its wave's shield.
- **Repo:** new; Hold is the other half.

### B. Bases that fall in steps

#### 6. Heartcap plates, a bounty and a bulwark
- **Sources:** LoL turret plating (5 plates, 120 gold each) and Bulwark (bonus resistances at 90/75/55/30% HP for 20 s); Deadlock's shrines and Patron phase 2.
- **Addresses:** CLIFF (5–10 s from ⅔ to dead), RUN (run HP in chunks).
- **How it works here:** split each Heartcap into 4 plates (the player's 3000 into 750s; the enemy's 2000 + 250 × (battle − 1) the same way), shown as four pips on the HUD and on the tug. Breaking a plate pays the **attacker** +60 gold (a payout for pushing that comes before the kill) and puts the Heartcap in **bulwark** for one beat (8–10 s at ×0.5 damage taken), with the defender's waiting units released at once. A siege becomes four visible steps with a breathing space after each. In a run, the player's lost plates are the unit of run HP, which makes Groves and repairs legible ("repair one plate").
- **Measure:** ⅔→dead and ⅓→dead (target over 45 s, from the engagement review's M4.5 gate), the comeback count, Decisions %, G4.
- **Risk:** routs may become Decisions; paying the attacker can snowball. Overlaps `breach`.
- **Repo:** `breach` (⅔ and ⅓ triggers, defender pulse and damage reduction, +150 gold to the defender) is the defensive half. Plates add the attacker's reward, two more steps and a visible structure. The `heartcapBreach` trigger with `at`, `shieldHeartcap` and the effects DSL already carry most of it.

#### 7. Breakthroughs: break a turret, get super waves and forward ground
- **Sources:** LoL inhibitors (super minions for 8 waves, stopping 2 waves before the respawn); HotS forts (catapults); Deadlock shrines (stronger troopers); Clash Royale (a fallen Princess Tower expands your deploy zone); Mechabellum (a fallen tower slows the enemy).
- **Addresses:** CLIFF, TERRITORY (F1), and gives the last three contested columns a purpose.
- **How it works here:** each lane's two Heartcap turrets (18 pierce a second, range 7) get HP and can be destroyed. Destroying one: (a) your waves in that lane carry one "blight bloom" super unit for the next 6 beats (2 minutes), stopping a beat before the turret regrows; (b) you may build anywhere on the contested ground you own in that lane **without the supply-line surcharge** while it's down. The turret regrows after 8 beats, as an inhibitor respawns, so the edge is temporary.
- **Measure:** ⅔→dead, Decisions %, placement spread (step A's tool), F1 in the playtest.
- **Risk:** turrets are the defender's main comeback tool (they cover about 3 contested columns), so losing them can speed up the cliff unless #6 or #8 balances it. Large scope: turrets become targets for every unit's targeting rule.
- **Repo:** new. The engagement review's "make held ground pay" never tied forward building to a breakthrough.

#### 8. The Heartcap wakes on first contact
- **Sources:** Battle Cats (the boss spawns when the base reaches 99% HP, with a shockwave that knocks back every cat; the base is held at 1 HP until it does); Clash Royale's King Tower activation; Stick War's statue reinforcements while garrisoned; PvZ's one mower per lane.
- **Addresses:** COMEBACK, CLIFF.
- **How it works here:** the first enemy hit on a Heartcap in a lane wakes it, once per lane per battle: a knockback wave 4 tiles out (no damage), and every home spawner in that lane releases its next batch at once (a "Heartguard" wave). The general gets it too, so assaulting a Heartcap becomes a two-step event the attacker prepares for (Battle Cats players max the Worker Cat and stack attackers before touching the base). A per-lane icon shows whether it's used, like a mower. Run option: a used wake comes back only at a Grove.
- **Measure:** comebacks (0 of 360 today), columns retaken after a wake, Decisions %.
- **Risk:** too strong a defense pushes battles to 10:00; it overlaps `breach`.
- **Repo:** `breach` fires at ⅔ and ⅓ with a pulse, damage reduction and gold. This fires earlier, uses units and knockback that can flip columns back (a comeback shows on the tug), and is visible before it fires. Pick one of the two, or merge them.

#### 9. Backdoor protection
- **Sources:** LoL's turrets take 80% less damage when no enemy minions are nearby.
- **Addresses:** CLIFF, and the flyer army (Drift Stalk 72 / 90 in G3; status item 2) and Rhizomorph dives.
- **How it works here:** Heartcaps, turrets and home buildings take ×0.25 damage from units unless a ground unit of the attacker's stands within 3 tiles. A siege needs an army at the walls; flyers and tunnellers support a wave instead of winning alone. A small shield glyph shows when protection is on.
- **Measure:** G3 for Drift Stalk and Veilstalker; the counter matrix; flyers' share of Heartcap damage.
- **Risk:** may leave flyers with no job (G1/G2 checks); one more rule to explain.
- **Repo:** new. `flyers.md` weighs a Driftling retune or an Anti-Air counter; this is a third option that targets only the base damage.

### C. Comebacks

#### 10. Reclaim bounties for the side behind
- **Sources:** LoL objective bounties (computed from leads, about 10% of the deficit, capped; switched on 15 s after falling behind; cut 20–40% once a comeback is under way, after chained bounties caused extreme swings); Dota 2's streak bounties.
- **Addresses:** COMEBACK, TERRITORY.
- **How it works here:** when a side trails by 3 or more columns (summed over lanes) for a full beat, each column it retakes pays 10 × the deficit in gold (cap 60), shown as a coin on its frontier ("+40 if retaken"). Killing an enemy Elder pays a bounty too. This turns today's passive comeback income (`min(6, floor(deficit / 2))` a tick) into payouts for actions; keep a smaller passive part or drop it.
- **Measure:** comebacks, the first leader's win rate (30–57% today, the brake that works), Decisions %.
- **Risk:** farming (giving ground on purpose to earn bounties), which the one-beat delay and a decay once the deficit shrinks guard against, as Riot found it needed to.
- **Repo:** new; comeback income exists, bounties don't.

#### 11. Regroup on the beat (the counter-push)
- **Sources:** Clash Royale's counter-push (surviving defenders plus a tank, right after a positive trade); LoL's wave bounce.
- **Addresses:** COMEBACK, and keeps fights in waves.
- **How it works here:** when a side's beat fires, its units standing idle on its own ground within 2 columns of the front join the departing wave and get the wave's mixed-wave shield (20% of max HP) if the wave qualifies. A good defense becomes a shielded counter-push on the next beat. Since defending happens nearer home, this favours the side being pushed.
- **Measure:** comebacks, columns retaken within 2 beats of a lost column.
- **Risk:** stacking shields and spore clouds; it helps a turtling side too, which can raise Decisions.
- **Repo:** new; waves and mixed shields exist.

### D. Player verbs

#### 12. Sends: one-shot squads that raise income
- **Sources:** Legion TD 2 mercenaries (20–400 mythium, arrive at the next wave, raise income permanently, can be saved up, the king upgrade as the defensive alternative); Line Tower Wars.
- **Addresses:** VERBS, gold piling up (TERRITORY's symptom), OPEN, GENERAL.
- **How it works here:** a second tray row of 3 send cards per commander (for example 4 Sporelings for 40, 2 Rootbreakers for 90, a Burster trio for 70), each on a 40 s cooldown. A send joins your next beat in the chosen lane (and counts toward its mixed-wave shield), and every 100 gold sent adds +1 gold a tick for the rest of the battle. Hold lets you stack sends into one big wave, as Legion TD players save mythium. The general uses sends for its doctrine wave (#2), so a counter arrives as a visible squad. In the run, send cards become a fourth draft type that relics can act on.
- **Measure:** decisions per minute (target 4+), gold banked, G3 (a "mono send" build), the counter matrix.
- **Risk:** sends can make spawners pointless or become the dominant build; the supply cap must apply to them.
- **Repo:** new. The engagement review's alternative to Hold, a gold-cost "Surge" that fires every spawn timer in a lane, is the nearest idea.

#### 13. Field drops that supercharge a building
- **Sources:** PvZ 2's Plant Food (dropped by glowing zombies; a unique super action for every plant; can also recharge a seed packet); Age of War's specials; Warpips' support powers.
- **Addresses:** VERBS, READ (a glowing unit is a focal point), and pillar 2 if Overblooms merge.
- **How it works here:** one unit in every second enemy wave glows (seeded). Killing it on your own ground drops a spore mote. Spend a mote on any of your buildings for its **Overbloom**: Burrow releases an extra batch now; Gill Nest fires at double rate for 5 s; Capguard Hall shields the next wave; Truffle Cellar pays 3 ticks at once; Mortar fires three shells; any spawner's waiting units leave pre-merged. Up to 2 motes held.
- **Measure:** decisions per minute; whether motes go to the same building every time (a sign one Overbloom is too strong).
- **Risk:** cognitive load in a battle that already has a power; if motes drop anywhere, the winning side gets more (hence own-ground kills only).
- **Repo:** new.

#### 14. Battle XP: kills buy ranks, supply or gold
- **Sources:** Warpips' medals (unit rank, a higher unit cap, or cash); Age of War's XP-to-evolve; Battle Cats' Worker Cat level.
- **Addresses:** VERBS, OPEN (growth within a battle), RUN (fewer +15% cards).
- **How it works here:** every enemy supply killed adds 1 spore XP. At each threshold (say 12, then +6 each time) choose one, for this battle only: +1 rank for one building's units (+10% HP and damage), +4 supply cap, or +60 gold. That's a choice every 45–60 s that changes this battle, while drafts stay for the run. It could take the place of the in-battle drafts at waves 4, 6 and 8, so drafts become fewer and bigger (the `bigdrafts` direction) and F9 (drafts and spoils look alike) eases.
- **Measure:** decisions per minute, G3, battle-1 losses.
- **Risk:** snowballs (the side killing more grows faster); overlaps upgrades. A loss-side XP rate (XP for your own losses at half rate) could brake it.
- **Repo:** new; `bigdrafts` is related.

#### 15. Entrench: a third stance
- **Sources:** Stick War's Attack / Defend / Garrison; Warpips' defence mode (+range) and attack mode (+accuracy); F16's home-ground request.
- **Addresses:** VERBS, F16, and status.md's "falling back early is a big edge".
- **How it works here:** besides Hold (gather behind the border, at most one beat) and Advance, **Entrench** keeps a lane's units at the front column: +25% damage reduction and +1 range for ranged units, no capture progress, no reclaim bounties (#10). Cancelled by Advance; 20 s cooldown. It gives a "stand here" choice that isn't falling back.
- **Measure:** Decisions % (turtling risk), comebacks, G3 for ranged builds (pinning interacts).
- **Risk:** stalls; the AI must use it.
- **Repo:** extends Hold / Advance (§5.2).

#### 16. A commander on the field
- **Sources:** Kingdom Rush heroes and rally points; Warcraft Rumble's leader minis; Thronefall's hero; Stick War's direct control (the controlled unit is faster and stronger); Clash Mini's one repositioning per game.
- **Addresses:** VERBS, READ (one focal point per side), RUN (commanders feel different).
- **How it works here:** each commander gets an avatar that stands in a column you own: a 3-tile aura (Vesper: spawn speed; Armilla: capture speed; Cordis: knit time), the power fires from its position, it fights, and if it dies it comes back at the Heartcap after 20 s. Moving it takes a command and a 10 s walk. A low-APM verb every 20–40 s.
- **Measure:** decisions per minute; commander win-rate spread (battle 1 is harder for Armilla and Cordis under the package).
- **Risk:** the largest scope here; a one-lane map limits where it can stand; generals need one or a passive answer.
- **Repo:** new; M5 built powers only.

### E. Territory that pays

#### 17. Spore vents: points in contested ground that pay
- **Sources:** Warcraft Rumble's gold veins, chests and meeting stones; Direct Strike's middle line ("2 gases worth of income"); Line War (land means resources); Warpips' pumpjacks on the taken frontline; HotS map objectives.
- **Addresses:** TERRITORY (F1, F6, F15), OPEN (a target for the first fight).
- **How it works here:** each map places one vent per lane in mirrored central columns (on Bogwater, say columns 13 and 18). The owner of a vent's column earns +6 gold a beat from it, and may build a "vent tap" (an economy building) on it with no supply-line surcharge. The vent glows in its owner's colour. The first fight now has a reason to happen at 0:40–1:30, and holding ground pays at a point the player can see.
- **Measure:** first flip, gold banked, placement spread, F1 in the playtest.
- **Risk:** a snowball (ground → gold → ground), which comeback income and #10 brake; maps need redesign (Bogwater's loam already sits in contested ground); point-symmetry must hold.
- **Repo:** the engagement review's rec 4 suggested income per contested column. The research favours a **point** over a per-column rate because points create fights where a rate doesn't.

#### 18. A wild colony to recruit (mercenary camps)
- **Sources:** HotS mercenary camps (captured by standing near them; siege giants or knights then push a lane; timed before objectives); Deadlock's mid-boss buff (troopers 1.7–2.3× HP for a few minutes).
- **Addresses:** OPEN (something happens at 2:00, when the front used to sit still), COMEBACK (the trailing side can steal it), VERBS (Hold to time the take).
- **How it works here:** at 2:00 a neutral wild colony grows in the neutral column nearest midfield: a clump (about 6 supply of feral units) that fights whoever comes near. The side that clears it and holds its column for 3 s gains a boon: its next 3 beats each carry +2 feral units, or its waves get +20% HP for 2 beats. A callout and the timeline (#2) show when it grows.
- **Measure:** first flip, comebacks, the first leader's win rate.
- **Risk:** on one lane it may grow in one side's half; it adds randomness to an otherwise even fight; the general needs a policy.
- **Repo:** new.

#### 19. Held ground and survivors pay after the battle
- **Sources:** Thronefall (only buildings that survive the night pay the next morning); Bad North's houses; Inscryption (excess becomes currency).
- **Addresses:** TERRITORY, RUN.
- **How it works here:** at the end of a battle, each contested column you hold adds +1 Spore and +10 gold of "harvest" to spoils, and each forward building still standing repairs 1% Heartcap HP (cap 10%). Forward building becomes a bet the player can read: it pays if it survives.
- **Measure:** placement spread, F1 and F3 in the playtest, run outcomes.
- **Risk:** rewards the winner further; Decisions already count columns.
- **Repo:** the positive version of the engagement review's "enemy-held columns drain run HP".

### F. Reading the battle

#### 20. Wave preview at the gate, and first-sight cards
- **Sources:** Kingdom Rush (tap the wave icon to see incoming enemies; an encyclopedia that fills in; tap an enemy for stats); Thronefall 1.0's wave previews; Legion TD 2's known wave list; Mechabellum (you see last round's army).
- **Addresses:** READ, VERBS (Hold, Call and Entrench need information), GENERAL.
- **How it works here:** waves make the general's next wave knowable: its units wait inside its buildings until the beat. Five seconds before each beat, show icons at the enemy gate per lane ("next: 6 Sporelings · 2 Gill · 1 Burster, shielded"). The first time a unit type appears in a run, a one-line card slides in without pausing. The counter warning stays vague two waves ahead (§7.4); the preview shows only the wave about to leave.
- **Measure:** the P3 question "when the general massed something, could you answer it, and did you know how?".
- **Risk:** clutter; less surprise. It's mostly render work plus a sim query.
- **Repo:** new; only possible because of waves, which is an argument for them.

#### 21. Read the army, not the unit
- **Sources:** Riot's "Clarity in League" (silhouette first, attention by importance, telegraphs); Bad North's squads as clumps; the Thronefall review that blamed minimalist visuals for unreadable enemies; Mechabellum's unit-size axis.
- **Addresses:** READ (8 px units).
- **How it works here:** each departing wave gets a banner or ring at its centre showing its type count and its shield; Blooms and Elders scale up (1.0 → 1.4 → 1.8×) with a crown mark; spore clouds take their owner's tint; flyers cast shadows; one bar per wave for its total HP instead of a bar per unit.
- **Measure:** the screenshot check; the P3 readability question.
- **Risk:** render-only; must stay within the G11 frame budget.
- **Repo:** rec 7 (juice, a bigger battlefield) is related; wave-level readability is new.

### G. The run's pull

#### 22. Overkill pays
- **Sources:** Inscryption (damage past the winning blow becomes teeth you keep); Mechabellum (damage by surviving units' cost); Hearthstone Battlegrounds (damage by tier).
- **Addresses:** RUN, CLIFF (a reason to finish well, not only finish).
- **How it works here:** a Rout win pays +1 Spore for every 10 s left on the clock and +1 for each plate (#6) of your own Heartcap intact. A fast, clean win becomes a goal, and a slow win by Decision is clearly the weaker result it already is (half rewards).
- **Measure:** run outcomes; Spores per run.
- **Risk:** rich-get-richer across the run; rewards stomping easy early battles.
- **Repo:** new.

#### 23. Merges as moments with a reward
- **Sources:** Hearthstone Battlegrounds' triple reward (a golden minion and a Discover from the next tier); Rush Royale (timing merges before a boss); the Spore Tithe relic (+4 gold a merge) and Cordis's Puppet Bloom.
- **Addresses:** VERBS, pillar 2 ("merging isn't a decision"), RUN.
- **How it works here:** the first Elder each battle, and every third after, grants a **Bloom pick**: one of two battle-local effects (that building's next three batches leave pre-merged; +1 upgrade level for this battle; +80 gold). Merges go from 49–119 a battle under the package, so rewarding every merge would flood the game; Elders are the moment. The spawner's merge toggle becomes a real choice ("rush an Elder before the counter lands").
- **Measure:** merges per battle, toggle use, G3 for merge-heavy builds.
- **Risk:** favours merge-heavy builds and Cordis; another pick screen (keep it in-place, not a pause).
- **Repo:** the Spore Tithe relic and Puppet Bloom touch it; a base rule is new.

---

## A suggested shortlist

Ranked by impact on the listed problems against build cost, with the sim's current hooks in mind (`heartcapBreach` with `at`, `shieldHeartcap`, `readyPower`, the triggers `waveStart`, `unitDeath`, `merge`, `enemyUnitKilled`, `buildingDestroyed`, the `waves` beat, the stance command):

| Rank | Mechanic | Problems | Cost | Why first |
|---|---|---|---|---|
| 1 | #6 plates + bulwark, folded together with `breach` or #8 | CLIFF, COMEBACK, RUN | Small: mostly the existing breach trigger at four thresholds plus a gold action for the attacker | The cliff is the most-measured failure (0 comebacks, 5–10 s from ⅔ to dead) and every successful game here breaks its base into steps |
| 2 | #20 wave preview + #2 timeline | READ, GENERAL, OPEN | Small to medium, mostly render | Waves make it possible; it serves every later verb |
| 3 | #12 sends | VERBS, gold sink, GENERAL | Medium: a command, a tray row, AI use | The genre's most-copied verb; turns banked gold into decisions |
| 4 | #17 spore vents (or #10 reclaim bounties as the cheap first step) | TERRITORY, OPEN, COMEBACK | Medium (map data) / small (income code) | The first fight gets a target; ground pays at a point |
| 5 | #3 income ramp with #4 overtime | STALL, CLIFF | Small (data) / medium | Replaces the glass-Heartcap ending with a player-driven one |
| 6 | #5 call the beat | VERBS, OPEN | Small | The other half of Hold, keeps waves synchronized |

Bigger bets to discuss rather than prototype first: #7 (turrets as targets), #16 (commander on the field), #14 (battle XP replacing drafts).

### What to watch for in the P3 playtest

These observations from the user's playtest would say which mechanics are needed:
- **Count the seconds with nothing to do** in the first two minutes, and note when the first column flips. Long gaps point to #1, #5, #17, #18.
- **Watch the end of each battle you win or lose:** how long from the first Heartcap hit to the end, and whether anything could have been done. Seconds point to #6, #8, #9.
- **Note your gold** at 3:00 and 6:00. A pile points to #12, #3.
- **When you lost ground, did you get it back?** Never points to #10, #11.
- **Before each beat, did you know what the general was sending?** No points to #20, #21.
- **Did you ever choose to build forward, and did it pay?** No points to #17, #19, #7.
- **After the run, did you want another?** Note why or why not; Bad North and Warpips both had battles reviewers liked and runs they didn't return to.

---

## Sources

**Clash Royale:** [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale) · [Supercell release notes (overtime, triple elixir)](https://supercell.com/en/games/clashroyale/blog/release-notes/november-update) · [Support: Elixir](https://support.clashroyale.com/hc/en-us/articles/49484936933403-Elixir) · [Support: 1v1 Battle](https://support.clashroyale.com/hc/en-us/articles/49484904683803-1v1-Battle) · [LootBar elixir guide (2.8 s rate)](https://lootbar.gg/blog/en/clash-royale-elixir-guide-prevent-running-out-during-pushes.html) · [Sportskeeda: elixir trades](https://sportskeeda.com/esports/how-maintain-positive-elixir-trades-clash-royale) · [Sportskeeda: Tornado](https://sportskeeda.com/esports/how-use-tornado-effectively-clash-royale) · [TouchTapPlay: King Tower activation](https://www.touchtapplay.com/best-ways-to-activate-king-tower-in-clash-royale/)

**The Battle Cats:** [Wiki: Enemy Units](https://battle-cats.fandom.com/wiki/Enemy_Units) · [Wiki: Version 13.3](https://battle-cats.fandom.com/wiki/Version_13.3_Update) · [Wiki: Into the Fray](https://battle-cats.fandom.com/wiki/Arena_of_Honor/Into_the_Fray:_Servants_Strike!) · [Wiki: Heavenly Tower 10](https://battle-cats.fandom.com/wiki/Heavenly_Tower/Floor_10) · [CatCombo guide](https://thanksfeanor.pythonanywhere.com/guides/documents/catcombos.html) · [BlueStacks beginner's guide](https://www.bluestacks.com/blog/game-guides/the-battle-cats/tbc-beginners-guide-en.html) · [Destructoid on Battle Cats POP!](https://destructoid.com/?p=209730) · [Siliconera](https://www.siliconera.com/?p=1041701)

**Stick War: Legacy:** [Stick War Wiki: Garrison](https://stick-war.fandom.com/wiki/Global_Garrison_Command) · [Pocket Gamer guide](https://www.pocketgamer.com/stick-war-legacy/beginners-guide/) · [APKMirror changelog](https://www.apkmirror.com/?p=11277229)

**Age of War:** [MobyGames](https://www.mobygames.com/game/age-of-war) · [shapes.inc fan page](https://shapes.inc/fandom/age-of-war) · [fan wiki: Medieval Age](https://aowg.fandom.com/wiki/Medieval_Age?oldid=4557)

**Warpips:** [Steam](https://store.steampowered.com/app/1291010/Warpips/) · [Destructoid](https://destructoid.com/?p=266808) · [GamePretty fan guide](https://gamepretty.com/warpips-loadout-selection-and-battle-strategy/) · [Vaporlens review summary](https://vaporlens.app/app/1291010/warpips)

**Legion TD 2 and sends:** [Wiki: Mercenaries](https://legiontd2.wiki.gg/wiki/Mercenaries) · [Wiki: Mythium](https://legiontd2.wiki.gg/wiki/Mythium) · [Switchblade beginner's guide](https://www.switchbladegaming.com/strategy-games/legion-td-2/beginners-guide-12/) · [Line Tower Wars on Steam](https://store.steampowered.com/app/4954340/)

**Desert / Direct Strike, Castle Fight:** [Blizzard: New in the Arcade](https://starcraft2.com/en-us/news/21700687) · [Direct Strike standard guide](https://us.forums.blizzard.com/en/sc2/t/direct-strike-standard-guide/1233) · [Desert Strike guide](https://eu.forums.blizzard.com/en/sc2/t/desert-strike-1338-guide/1814) · [Castle Fight discussion](https://steamcommunity.com/workshop/filedetails/discussion/1757281740/4931980436575090767)

**Warcraft Rumble:** [Blizzard gameplay overview](https://news.blizzard.com/en-us/article/23785121/warcraft-rumbletm-gameplay-overview) · [Method beginner guide](https://method.gg/guides/warcraft-rumble-beginner-guide) · [Pro Game Guides: capture points](https://progameguides.com/warcraft-arclight-rumble/what-do-capture-points-do-in-warcraft-arclight-rumble/) · [Massively OP](https://massivelyop.com/2023/11/17/first-impressions-warcraft-rumble-is-a-slick-but-shambolic-multiplayer-romp/) · [Checkpoint Gaming](https://checkpointgaming.net/features/2023/10/blizzard-tells-us-all-about-the-joyful-chaos-of-warcraft-rumble) · [Pocket Gamer review](https://www.pocketgamer.com/warcraft-rumble/review/)

**Kingdom Rush:** [wikily: KR6 spells](https://wikily.gg/kingdom-rush-6-genesis/spells) · [AOL tips](https://www.aol.com/news/2014-07-30-kingdom-rush-tips-and-tricks.html) · [walkthrough](https://ayumilove.net/kingdom-rush-walkthrough-guide/) · [Steam discussion](https://steamcommunity.com/app/816340/discussions/0/1734342161871096889) · [Encyclopedia](https://kingdomrushtd.fandom.com/wiki/Encyclopedia)

**Plants vs. Zombies:** [Flag Zombie](https://plantsvszombies.fandom.com/wiki/Flag_Zombie_(PvZ)) · [Level 1-7](https://plantsvszombies.wiki.gg/wiki/Level_1-7) · [Plant Food](https://plantsvszombies.wiki.gg/wiki/Plant_Food)

**Thronefall:** [Siliconera](https://siliconera.com/?p=1058854) · [StartMenu](https://www.startmenu.co.uk/home/review-thronefall) · [PCGamesN](https://www.pcgamesn.com/thronefall/full-version-launch)

**Bad North:** [TheSixthAxis](https://www.thesixthaxis.com/2018/08/23/bad-north-review/) · [Pocket Tactics](https://www.pockettactics.com/bad-north/review)

**Line War:** [Steam](https://store.steampowered.com/app/1309610/Line_War/) · [OpenCritic](https://opencritic.com/game/13114/line-war)

**MOBAs:** [LoL Wiki: Turrets](https://wiki.leagueoflegends.com/en-us/Turrets) · [LoL Wiki: Super minion](https://wiki.leagueoflegends.com/en-us/Super_minion) · [LoL Wiki: Objective bounties](https://wiki.leagueoflegends.com/en-us/Objective_bounties) · [Patch 14.21](https://www.leagueoflegends.com/en-us/news/game-updates/patch-14-21-notes/) · [Riot: Clarity in League](https://www.leagueoflegends.com/en-gb/news/dev/clarity-in-league/) · [Mobalytics: wave management](https://mobalytics.gg/blog/wave-management/) · [LoL Theory: wave management](https://blog.loltheory.gg/wave-management-league-of-legends/) · [DotaFire: comeback patch](https://www.dotafire.com/dota-2/forum/general/details-and-graphic-of-comeback-patch-9905) · [HotS Wiki: Fort](https://heroesofthestorm.fandom.com/wiki/Fort) · [HotS Wiki: Mercenary camp](https://heroesofthestorm.fandom.com/wiki/Mercenary_camp) · [Dignitas: mercenary camps](https://dignitas.gg/articles/blogs/Heroes-Of-The-Storm/11768/heroes-of-the-storm-how-to-fully-utilize-mercenary-camps) · [Deadlock Wiki: Patrons](https://deadlock.wiki/Patrons) · [Deadlock Wiki: Mechanics](https://deadlock.wiki/Mechanics)

**Merge games:** [Blizzard: Introducing Battlegrounds](https://hearthstone.blizzard.com/en-us/news/23156373) · [Icy Veins: Battlegrounds mechanics](https://www.icy-veins.com/hearthstone/hearthstone-battlegrounds-mechanics-guide) · [TouchTapPlay: Rush Royale merging](https://www.touchtapplay.com/how-does-merging-work-in-rush-royale/) · [TouchTapPlay: Rush Royale bosses](https://www.touchtapplay.com/how-to-beat-all-bosses-in-rush-royale/)

**Inscryption:** [Wikipedia](https://en.wikipedia.org/wiki/Inscryption) · [NY Game Critics](https://nygamecritics.com/2022/01/23/the-insight-in-inscryption-the-only-prize-you-win-is-a-few-more-minutes-of-life/) · [Well Played](https://well-played.com.au/inscryption-review)

**Mechabellum:** [GamingOnLinux](https://www.gamingonlinux.com/2023/05/mechabellum-is-an-auto-battling-supreme-commander-im-completely-hooked/page=1/) · [Pro Game Guides](https://progameguides.com/mechabellum/mechabellum-tips-guide-reinforcements-research-points-specialists/)

**Lower relevance:** [Wccftech: Spellcasters Chronicles](https://wccftech.com/spellcasters-chronicles-hands-on-preview-quantic-dream/amp/) · [Notebookcheck](https://www.notebookcheck.net/New-free-to-play-MOBA-from-Quantic-Dream-launches-on-Steam-early-access-with-Mixed-rating-and-technical-friction.1236331.0.html) · [Deconstructor of Fun: Clash Mini](https://deconstructoroffun.com/blog/2022/1/14/clash-mini)

**Repo files read:** `docs/status.md`, `CLAUDE.md`, `docs/engagement-review.md`, `docs/ideas/combat-rework.md` (How other games handle it; Waves and run variety; P3), `docs/ideas/rounds.md` (How round-based autobattlers do it), `docs/balance-backlog.md` (Step B; `rework` engagement; P2 engagement with commanders), `docs/playtest-feedback.md` (F1–F16), `SPEC.md` §4, §6, §7.4–7.8, §8.3–8.6, §11.7, §11.10, `src/data/proto.ts` (waves, mixed waves, presets).
