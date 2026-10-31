# Research: auto-battlers and builder roguelites, for build expression and run-to-run variety

Evidence for [After the combat rework](../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): web research on auto-battlers and builder roguelites. Written by an agent during that review; nothing here is adopted. Recovered from the session transcript.

Written 2026-10-31 against `develop` `ef2e133`, for the fun review. This is web research plus a mapping onto our run structure (SPEC §8–§9, §11.5–§11.11). Nothing here is measured in our sim, and nothing is adopted.

## How to read this

- **Section 1** says what our run looks like today and names the problems (D1–D12) and constraints (C1–C5) that the mechanics in section 4 refer to.
- **Section 2** has per-game notes with links: how a build forms, what makes a run different, broken builds, how enemies and bosses test you (and whether you can scout), rewards for risky nodes, meta-progression, run length, and praise and criticism.
- **Section 3** pulls the patterns out, including the criticisms that should act as guardrails.
- **Section 4** has **23 transferable mechanics**. Each one names its sources, the problem it addresses, how it would work in our structure, and its risk.
- **Section 5** is a suggested shortlist and order.

**Caveats on sources.**
- Many wiki and guide sites blocked direct fetches (403/402): the hoodedhorse wikis, Mobalytics, ProGameGuides, Unwinnable, Fandom. For those, the facts come from search-result extracts of the cited page.
- Where a fact comes from my general knowledge of a game and was not re-verified this session, it's marked *(unverified)*.
- Run lengths are rarely stated by reliable sources, so they are given only when sourced.
- The repo already covers some of this, and this file doesn't repeat it:
  - 9 Kings' kings, loot and perk board: `docs/ideas/combat-rework.md` "Waves and run variety";
  - round-based loss and scouting rules for Mechabellum, TFT, Super Auto Pets, Backpack Battles, 9 Kings, Legion TD 2 and Hearthstone Battlegrounds: `docs/ideas/rounds.md`;
  - Backpack Battles hover stars, Hades Heat, Balatro's "ruthless design", Monster Train's assembly rule and the Ascension and Covenant ladders: the external design review.

---

## 1. Where our run stands (the problems this research targets)

**Today's run** (SPEC §8):
- **Setup:** pick a commander, ban up to 3 buildings (§8.1).
- **Route:** six rows (Battle; Battle/Event/Grove; Battle/Elite; two of Event/Grove; Battle/Elite; Boss). Every node links to every node in the next row (§8.2). That makes 4–5 battles.
- **In-battle drafts:** at waves 2, 4, 6 and 8 (`waveSeconds` 60, `draftWaves` [2,4,6,8] in `data/balance.json`). Each offers 3 cards: blueprint 35% / upgrade 45% / relic 20% (§8.3).
- **Spoils:** after a win, a draft of the same kinds of cards (§8.6).
- **Elite win:** adds a relic-only pick, +15 Spores and a 25% chance of Amber (§8.6).
- **Other nodes:** 8 events (§8.7) and Groves (repair 30% or graft one upgrade level).
- **Commanders:** 3 (Vesper, Armilla, Cordis), each with a 6-building core, a 3-building starter, a passive and one power (§11.10).
- **Enemies:** 3 generals plus the Pale Sovereign boss (§7.7), and 3 elite modifiers: Fortified, Veteran, Swift (`data/elites.json`).
- **Meta:** none yet. Feats, traits, strains and mastery are M6 (§9); blights are M7.

**Problems** (cited from the repo):

| ID | Problem | Evidence |
|---|---|---|
| D1 | Draft cards are mostly percentages | `data/upgrades.json`: 42 upgrade levels over 14 tracks. 40 are numeric (+15% HP, +0.75 range, +1 gold). The other two are "+1 unit per spawn" (Burrow, Morel). Engagement review, pillar 4: "drafts are mostly +15% cards" |
| D2 | Relics rarely change what happens on the field | `data/relics.json`: 21 relics. Only Spore Cloud, Martyr's Bloom and arguably Fresh Spores change behavior; the rest are stat or economy modifiers. Mycorrhizal Link's +13–15% "doesn't register" in the placement-spread tool (one-more-run review, step A) |
| D3 | Elite rewards are too small (F11) | Rewards in §8.6, above; F11 in `docs/playtest-feedback.md` |
| D4 | The route doesn't really branch (F10) | §8.2: every node links to every node in the next row |
| D5 | Spoils are the same as in-battle drafts (F9) | §8.3 and §8.6 |
| D6 | The run is decided in battle 1 | 33% of runs are lost in battle 1. Old Mother Mold causes 79 of 99 battle-1 losses (one-more-run review, step B). `hotstart` halves this |
| D7 | The boss is the easiest fight | A run that reaches the boss wins 70–87% of the time (step A); 85% of boss fights are won with all of step B on |
| D8 | No meta-progression yet | §9 is M6/M7 |
| D9 | Commanders are thin | A core pool, a +10%/+25%-style passive and one power (§11.10) |
| D10 | Run HP is binary | Groves, repairs and Mending Moss are almost always wasted (engagement review) |
| D11 | The same pool every run | "Until Milestone 6 there is no gating" (§9). All 14 Velvet Bloom buildings (plus the rework's 3) and all 21 relics are in every run, minus at most 3 bans |
| D12 | The general's counters aren't moments | Engagement review rec 6; G8 |

**Constraints:**

| ID | Constraint |
|---|---|
| C1 | Too much to learn (F8): the round 3 testers' main message |
| C2 | The honest general (§7.1): new rules either apply to both sides, or are clearly player-only rewards |
| C3 | Determinism. Drafts hold the sim, and each pick is a command (§8.3, §13.3) |
| C4 | Out of scope (§17): #9 hidden information beyond the telegraph, #11 core adjacency rules, #12 in-battle research and in-place upgrades, #13 active powers for generals, #14 difficulty tiers, #15 daily seeds. The user has said the spec is malleable (one-more-run review, decisions), but each of these still needs the user's OK |
| C5 | The guardrails: G3 on every map and the strict counter bar. Anything that changes unit behavior has to be re-measured |

---

## 2. Per-game notes

### Mechabellum (Game River, 1v1 round-based)
The repo covers its rounds and HP rules. New here:
- **How a build forms:**
  - **Specialist:** each match starts with a starting-pack choice that includes a **specialist**, which changes costs, stats or HP. The Elite Specialist forces you to buy only level-2 units at a premium. The Giant Specialist gives free unlocks; one player puts that at "about 300 free credits". Early-strong specialists start with less player HP ([GamePretty guide](https://gamepretty.com/mechabellum-beginners-guide/); [Steam thread on specialists](https://steamcommunity.com/app/669330/discussions/0/3810655055436554947)). The Supply Specialist's HP modifier was patched from −500 to −600 ([wiki patch notes](https://mbwiki.dreamhaven.com/updates/update-161)).
  - **Unlocks:** you unlock at most one new unit type a round.
  - **Unit tech:** most units can hold **up to four techs**, and each further tech on the same unit costs 200 more. The store copy: you can "turn snipers into rapid-fire swarm clearers, or equip heavy tanks with self-destruct charges" ([Steam store](https://store.steampowered.com/app/669330/); [Steam forum](https://steamcommunity.com/app/669330/discussions/1/7004881118891638807)).
  - **Loadouts:** a forum post notes the tech loadout can be customized per game mode, so which techs can appear is a pre-match choice.
- **Tech as counter-of-counter.** A player: Rhinos lose to Steel Balls; give the Rhino Whirlwind and it beats them; give the Steel Balls range and they beat the Whirlwind Rhino ([Steam forum](https://steamcommunity.com/app/669330/discussions/1/7004881118891638807)). A unit's answer can be a *tech on the same unit*, not only a different unit.
- **Unit levels:** units gain XP up to a cap. Upgrading costs 50% of a new copy and multiplies attack and HP (GamePretty).
- **Reinforcement cards:** both players see the *same* offer each round. You must pick one or skip for 50 supply. Some are one-shot abilities (Incendiary Bomb, Nuke, Orbital Javelin, at about 200 supply) (GamePretty; [ProGameGuides tips](https://progameguides.com/mechabellum/mechabellum-tips-guide-reinforcements-research-points-specialists/)).
- **Scouting:** you see last round's enemy army (repo, rounds.md).
- **Criticism:** specialist choice "tells your tactic to your opponent" (Giant); some techs are never used ("never seen anyone run Anti-tank rockets on storms").

### 9 Kings (Sad Socket / Hooded Horse)
The repo covers its kings, loot from the enemy, the perk board, and Laura Michet's critique. New here:
- **Decrees on a fixed schedule:**
  - **When:** **Royal Councils** come on years **4, 14, 21 and 29**, then at year 37 and every 11 years in endless play. Each offers a choice of permanent decrees.
  - **The pool:** **18 common, 5 rainbow, 9 "broken" decrees, and 4–5 per king**.
  - **The guarantee:** at least one option at every council is **specific to your king**. Rerolls are random ([official wiki, Royal Council](https://wiki.hoodedhorse.com/9_Kings/Royal_Council)).
  - Effects include Bunker (tower attack speed) and Weakspot (damage against frozen, stunned or poisoned units). The King of Greed's own decrees include Bargain, Burglary, Insurance, Salvage and Scimitars.
  - "Broken" decrees are a named category, so the designers label the game-breakers instead of hiding them.
- **Unlocks shown on the locked card:** only the King of Nothing is available at first. Other kings unlock through quests printed on their locked card, and a pop-up on the end screen announces each unlock ([9 Kings wiki, Kings](https://9kings.wiki.gg/wiki/Kings)).
- **Special enemies:**
  - **The Rainbow King** is guaranteed once per standard run. Its cards can show up in any shop, and beating it gives a special card.
  - **The Chaos King** uses spin-off versions of other kings' cards that are stronger than the originals.
- **Difficulty:** nine tiers that only make enemies stronger ([Rogueliker, early access review](https://rogueliker.com/9-kings-early-access-review/); [Elliot C Smith](https://www.elliotcsmith.com/9-kings-early-access-review/)). At mid-to-high tiers "some kings feel much stronger than other kings".
- **Readability:** decks are small enough that you can recall every available card at any time. Michet finds this intuitive ([Laura Michet](https://blog.lauramichet.com/i-am-enjoying-9-kings/)). The flip side, already noted in the repo, is that nine cards per king narrows a run to one or two builds.
- **Criticism:**
  - the King of Stone's Trapper card is near-useless because its traps sit where enemies never walk (Michet);
  - endless mode is "TOO DIFFICULT" (Steam);
  - players ask for more cards, kings, modes and events ([Vaporlens summary](https://vaporlens.app/app/2784470/9_kings)).

### Teamfight Tactics (Riot)
- **How a build forms:** shop champions, traits and items. **Augments** are the big picks: three per game, offered at stages **2-1, 3-2 and 4-2**, as 1 of 3, with at least one reroll. They come in **Silver, Gold and Prismatic**. Riot made Gold the default in Set 7 so it could tune all three tiers better ([Dexerto](https://www.dexerto.com/league-of-legends/draconic-augments-tft-set-7-new-changes-dragonlands-1829835/); [AFK Gaming](https://afkgaming.com/esports/guide/teamfight-tactics-set-9-patch-1314-all-augment-changes-explained)).
- **Unit-level mutations:**
  - **Set 13 Anomalies:** at stage 4-6 you give one champion a powerful effect. A reroll costs 1 gold, and there are 60+ anomalies ([Mobalytics](https://mobalytics.gg/blog/tft/set-13-guide-anomalies/); [esports.gg](https://esports.gg/guides/teamfight-tactics/tft-set-13-anomaly-tier-list)).
  - **Set 15 Power Ups:** twice per game (1-3 and 3-6), a champion gets a unique ability. It can be swapped or removed ([Mobalytics](https://mobalytics.gg/blog/tft/guide-set-15-mechanic-power-ups/)).
- **Run variety:** Riot says **Portals** add variance to the start of a game "much like beginning a run of a roguelike game". They replaced the opening carousel and are now permanent like Augments ([Riot dev post, Remix Rumble learnings](https://teamfighttactics.leagueoflegends.com/en-us/news/dev/dev-teamfight-tactics-remix-rumble-learnings/)). Set 11's **Encounters** occur at random during the game ([GGRecon](https://www.ggrecon.com/articles/tft-inkborn-fables-preview/)).
- **Broken builds:** Riot wants high moments "hard to hit, and worth hitting". It capped trait augments at +1 per trait so highrolls don't get too easy (Riot dev post). Players disliked it when power cuts made high moments rarer.
- **Catch-up:** at the carousel, the lowest-HP players pick first ([Mobalytics carousel guide](https://mobalytics.gg/blog/tft/tft-guide-how-to-choose-tft-carousel/)).
- **Item loot philosophy:** variance should be "game to game ... NOT player to player": every player gets the same outcome (Riot dev post).
- **Praise and criticism (Riot's own reading):**
  - players enjoy "big-risk, big-reward economy traits";
  - Fortune, Mercenary and Piltover became "too solved over time, with too little real risk";
  - players wanted the impactful Portals at once, not later (Riot dev post);
  - Riot's Runeterra Reforged learnings: spending augment design time on Hero Augments left the next set "with the same core Augments" ([Riot](https://teamfighttactics.leagueoflegends.com/en-au/news/dev/dev-tft-runeterra-reforged-learnings)).

### Hearthstone Battlegrounds (Blizzard)
- **How a build forms:** a tavern shop of minions in tribes. Tavern tier is a tempo choice.
- **Per-game pool:** **5 of 10 minion types** are drawn each game and shown at hero select. Heroes built around an absent type sit out ([Playnews tier list, 2026](https://www.playnews.gg/en/guides/hearthstone-battlegrounds-2026-post-patch-35-4-tier-list); [Cardgamer](https://cardgamer.com/games/digital-card-games/hearthstone/hearthstone-battlegrounds-mode-explained-beginners-guide/)).
- **Quests:**
  - **The offer:** at turn 4, three **quest-reward pairs**. "The less powerful Rewards will make your Quest easier to complete and the more powerful Rewards will make the Quest harder."
  - **Visibility:** progress shows on your hero, and the scoreboard shows others' rewards.
  - **The reward:** paid automatically, and it lasts all game. There are about 24 rewards ([Blizzard, Quests](https://playhearthstone.com/en-us/blog/23831409); [Quests return](https://hearthstone.blizzard.com/news/23973118)).
- **Trinkets:**
  - **When:** four **Lesser** trinkets offered on turn 6, **Greater** trinkets on turn 9, bought with gold (mostly 1–4).
  - **Offer rules:** each offer includes one trinket for your most common minion type, at least one typeless one, at least one costing 2 or less, and only one for a type that isn't your main one, at 2 less. No repeats ([Blizzard developer insights](https://eu.forums.blizzard.com/en/hearthstone/t/battlegrounds-developer-insights-updated-trinket-rules/12768)).
  - Quests and trinkets serve as **catch-up mechanics** ([BlizzardWatch](https://blizzardwatch.com/2023/09/12/anomalies-hearthstone-battlegrounds-season-5/)).
- **Anomalies:**
  - **The rule:** one game-changing rule per lobby, the same for every player. Some minions and heroes are excluded under certain anomalies ([Blizzard 27.2 notes](https://hearthstone.blizzard.com/en-us/news/23987537/27-2-patch-notes)).
  - Since 33.6.2, an anomaly won't reappear for at least three games after you've had it ([Blizzard 33.6.2](https://news.blizzard.com/en-us/article/24240524/33-6-2-patch-notes)).
  - Anomalies can switch other systems on: one makes quests available from the start, another turns trinkets on.
- **Criticism:** some say anomalies "undermine the level playing field" ([Blizzard forums](https://us.forums.blizzard.com/en/hearthstone/t/new-battlegrounds-gimmick-is-the-worst-yet/112255)). Quests and trinkets come and go by season, so the mode keeps re-tuning its variety layer.

### Super Auto Pets (Team Wood)
The repo covers its lives and asynchronous fights. New here:
- **Packs:** curated pet pools. The Turtle pack is standard, and Expansion packs 1 and 2 are paid.
- **The Weekly Pack:** generated every Monday from pets of all packs, free for everyone.
- **Custom packs:** you build your own from owned pets, under tier rules ([Wikipedia](https://en.wikipedia.org/wiki/Super_Auto_Pets); [TouchTapPlay](https://www.touchtapplay.com/what-are-weekly-and-custom-packs-in-super-auto-pets-answered/)).
- Variety comes from *which pool you play*, not from more cards per run.

### Backpack Battles (PlayWithFurcifer)
The repo covers adjacency stars, recipes and lives. New here:
- **A mid-run identity pivot:** at **round 8** a subclass is picked from the shop, from about five per class. Its class item goes straight into your backpack. Guides say to choose by what your round-8 shop and existing items support ([ProGameGuides, Berserker subclasses](https://progameguides.com/backpack-battles/all-berserker-subclasses-in-backpack-battles); [Sportskeeda](https://www.sportskeeda.com/esports/all-backpack-battles-classes-explained-which-right-one-you)).
- Some guides describe earlier unlock conditions, such as after 5 wins, so the exact trigger has varied by patch.

### The Bazaar (Tempo / Reynad)
- **Run shape:**
  - **The day:** a run is days of hours. A typical day is 6 hours: vendors or events at hours 0–1, a **PvE monster at hour 2**, vendors or events at hours 3–4, and **PvP at hour 5** ([Mobalytics day guide](https://mobalytics.gg/the-bazaar/guides/day-guide)). Each hour offers three options ([Game8](https://game8.co/articles/games/the-bazaar)).
  - **Winning:** the goal is 10 PvP wins against asynchronous ghosts of other players' builds.
  - **Stakes:** you start with **20 Prestige**, and a loss costs prestige **equal to the day number**, so later losses cost more ([Mobalytics prestige](https://mobalytics.gg/the-bazaar/guides/prestige)).
  - **End rewards:** chests by win count: 4 wins → 2, 7 → 4, 10 → 6 ([Mobalytics beginner guide](https://mobalytics.gg/blog/the-bazaar/the-bazaar-beginner-guide/)).
- **How a build forms:** you pick a hero, then buy, sell and upgrade items, and level-ups give skills. PvE monsters drop specific items and skills. Guides catalog each monster's drops so players choose a fight for its loot. Gold scales with the encounter's tier: Bronze pays 2 gold and 3 XP ([Mobalytics PvE drops](https://mobalytics.gg/blog/the-bazaar/pve-encounters-and-drops)).
- **Risk node:** choosing a higher-tier monster pays more gold and XP, but "losing can be extremely detrimental" (beginner guide).

### Despot's Game (Konfa Games)
- **Run shape:** a room-to-room labyrinth with shops for food, equipment and more humans. **Food is consumed by fighting**, so army size has upkeep. Weapons change how units move and attack, and the game rewards several units of one class with *different* weapons. **Mutations** come from certain rooms and can be bought and levelled; they make abilities trigger more often or return damage. Each run ends in a boss fight ([Superjump](https://www.superjumpmagazine.com/despots-game-review/); [Gamecritics](https://gamecritics.com/eugene-sax/despots-game-dystopian-army-builder-review/); [GamingOnLinux](https://www.gamingonlinux.com/articles/21728/)).
- **Criticism:** "feels unbalanced in a significant way" (Gamecritics, 8/10); "fun, but just a limited amount of fun" (Superjump). Difficulty-curve complaints are summarized on [Wikipedia](https://en.wikipedia.org/wiki/Despot%27s_Game).

### Loop Hero (Four Quarters / Devolver)
- **How a build forms:** you place tiles that both **empower you and spawn or strengthen enemies**. From the postmortem: a cemetery's "skeletons are more powerful, but drop better loot" ([Game Developer postmortem](https://www.gamedeveloper.com/design/postmortem-loop-hero)).
- **You summon the boss:** placing cards fills the **boss meter**, and Oblivion cards step it back ([Steam guide, Lich](https://steamah.com/loop-hero-how-to-kill-the-lich-boss/)).
- **Cashing out:** you can retreat with your resources, keeping everything at camp and losing most on death. Search extracts disagree on the exact share; one says a defeat costs 70%. The usual figures are 100% at camp, 60% elsewhere and 30% on death *(unverified)* ([RPGamer impression](https://rpgamer.com/2021/01/loop-hero-impression/), for the general loop).
- **Pacing:** the day timer keeps ticking while you rest at a tavern; "some time to think, but can't waste time" (postmortem).
- **Late additions:** traits arrived "two-thirds of the way through development" and boss-drop perks at the very end (postmortem). The team limited the number of elements and polished each one.

### Rogue Tower (Die Hard Dev)
- **How a build forms:** the enemy path **grows each level in a direction you choose**, and it twists and splits. You can choose whether enemies arrive one at a time or merge, which suits area-damage towers. Random upgrade and unlock cards come from a pool of 400+. Elevation gives towers a damage bonus, and towers unlock over time, so you hold good spots for towers you don't have yet ([Steam store](https://store.steampowered.com/app/1843760/Rogue_Tower/)).
- **Meta:** XP unlocks new towers and cards, and permanent upgrades persist.
- **Criticism:** one player advises resetting unlocks and buying only what you need: "having everything unlocked means you're less likely to get what you want" ([Steam thread](https://steamcommunity.com/app/1843760/discussions/0/3825299364576183432)). That's pool dilution. Metacritic shows 6.5 ([Deku Deals](https://www.dekudeals.com/items/rogue-tower)).

### Thronefall (Grizzly Games)
- **Loadout before a level:** 9 weapons, 54 perks (up to 5), and 18 **mutators** that buff enemies or restrict you in exchange for **score bonuses** ([Start Menu review](https://www.startmenu.co.uk/home/review-thronefall); [SteamPulse](https://steampulse.org/game/2239150); [Siliconera](https://www.siliconera.com/?p=1058854)).
- **Praise:** it pares tower defense back to something "simpler but still quite satisfying".
- **Criticism:**
  - most perks don't push new playstyles: "You'll probably end up running the same builds on every map" (Start Menu);
  - difficulty is "too vertical" (Steam).

### Against the Storm (Eremite Games)
- **How a build forms:**
  - **Blueprints:** **3 blueprints** are picked at the start of each settlement, and more at reputation **1, 2, 3, 4, 5, 7, 9 and 11** ([official wiki, Blueprints](https://wiki.hoodedhorse.com/Against_the_Storm/Blueprints)). A devlog describes the design as a "deck" of blueprints: you pick buildings from the roster and build only those ([Eremite devlog 6](https://eremitegames.com/devlog-6/)).
  - **Cornerstones:** a cornerstone pick every year. They're **Legendary in years 2, 4 and 6** and Epic in other years, and the wiki advises saving rerolls for Legendary years ([official wiki, Cornerstones](https://wiki.hoodedhorse.com/Against_the_Storm/Cornerstones)).
- **Run variety:**
  - each settlement brings a biome, species and modifiers *(unverified detail)*;
  - **Forest Mysteries** turn positive in Drizzle and negative in Storm ([official wiki, Season](https://wiki.hoodedhorse.com/Against_the_Storm/Season)).
- **Risky nodes:** **dangerous and forbidden glades** carry "even sweeter rewards" and raise hostility. Their glade events must be handled before a timer runs out. One reward option gives 2–3 random Epic cornerstones ([Glade Events](https://wiki.hoodedhorse.com/Against_the_Storm/Dangerous_Events); [Steam discussion](https://steamcommunity.com/app/1336490/discussions/0/3946902677727091217)).
- **Criticism:** randomness can feel punishing. Players often call some cornerstones much stronger than others ([cornerstone tier list](https://gameplay.tips/guides/against-the-storm-cornerstone-tier-list.html)).

### Dome Keeper (Bippinbits / Raw Fury)
- **Run shape:**
  - **The loop:** mine during a quiet window of about a minute, then go back up to defend against the next wave ([PC Gamer](https://www.pcgamer.com/dome-keeper-review)).
  - **Gadgets:** limited and rare, so each pick counts, and gadget combinations give each run its feel ([Prima](https://primagames.com/featured/dome-keeper-review)).
  - **Upgrades:** you can afford about 3–4 upgrade trees out of 15+ ([Shacknews](https://www.shacknews.com/article/132448/dome-keeper-review)).
  - **Prestige mode:** unlocked by winning Relic Hunt; it's about score.
- **Criticism:** "long-term play is limited in scope" (Shacknews, 7/10).

### Ball x Pit (Kenny Sun / Devolver, 2025)
- **How a build forms:** balls **fuse and evolve** into new effects when specific weapons combine, and a **village-building** meta runs between runs.
- **Praise:** "Runs are short and explosive, and you can feel the improvements in between them"; the village is "incredibly engaging and offers constant progression" ([Stevivor](https://stevivor.com/reviews/ball-x-pit-review-meet-your-new-addiction/); [Rogueliker](https://rogueliker.com/ball-x-pit-review/); [OpenCritic](https://opencritic.com/game/19209/-/reviews), Top Critic Average 86).
- **Criticism:** repetition. Only eight levels, and new game plus feels the same as the base game.

### Balatro (LocalThunk / Playstack)
- **How a build forms:** jokers bend scoring rules. Vouchers are permanent shop upgrades; guides say they refresh only after the boss blind *(search extract)*.
- **Skipping:** you can **skip** a Small or Big blind, giving up its cash and shop for a **tag**. Some tags act later, such as the Investment Tag.
- **The boss:** **Boss Blinds can't be skipped**, and each boss's effect is visible at the start of its ante, so you can plan for it ([Dot Esports, antes and blinds](https://dotesports.com/indies/news/balatro-antes-blinds-explained); [Dot Esports, Double Tag](https://dotesports.com/indies/news/balatro-double-tag-explained)).
- **Run variety:** starting decks and stakes change the rules *(unverified detail)*.

### Monster Train 1 and 2 (Shiny Shoe)
- **How a build forms:**
  - **Clans:** you pick a primary and an allied clan and get every card from both ([PlayStation listing](https://www.playstation.com/en-ca/games/monster-train/)).
  - **The route:** "after each successful defense ... a branching pathway. The route you choose will also determine the development of your deck" ([KeenGamer review](https://keengamer.com/articles/reviews/pc-reviews/monster-train-review-snowpiercer-meets-slay-the-spire-it-is-sinfully-fun)).
  - **The champion** is upgraded several times per run. Each champion has multiple upgrade paths, and you can commit to one or mix them ([BlueStacks guide](https://www.bluestacks.com/blog/game-guides/monster-train/mstn-beginners-guide-en.html)).
- **Bosses:** three boss encounters with "a variable set of abilities"; "a successful boss fight means the chance to upgrade your Hero unit" (KeenGamer).
- **Meta:** **25 Covenant** levels and **10 clan levels** per clan, each unlocking cards (PlayStation listing).
- **New in Monster Train 2 (2025):**
  - **Room cards** change the rules of a floor, and **equipment** attaches to a unit ([Deltia's Gaming](https://deltiasgaming.com/?p=238448); [Destructoid on upgrades](https://www.destructoid.com/how-to-upgrade-units-in-monster-train-2/)).
  - **Pyre Hearts** are a chosen "run life" with its own power. Wyngh's Spirit restores front-line units on all floors once per battle.
  - 10 clans to combine ([Seasoned Gaming](https://seasonedgaming.com/2025/05/21/review-monster-train-2-a-hellishly-good-time)).
- **Broken builds:** tolerated when they need assembly (repo, external review).

### Slay the Spire (Mega Crit) and Slay the Spire 2
- **How a build forms:** card rewards, relics and removals.
  - **Relic sources:** relics come from elites, chests, the shop and events, roughly 50/33/17 common/uncommon/rare.
  - **Boss relics** come only from bosses, as 1 of 3, and one can replace your starter relic ([wiki, Relics](https://slaythespire.wiki.gg/wiki/Relics)).
  - The classic boss relics give +1 energy at a cost: Ectoplasm (no more gold), Coffee Dripper (can't rest), Busted Crown (fewer card choices), Runic Dome (can't see enemy intents), Sozu (no potions), Philosopher's Stone (enemies stronger) *(costs from general knowledge, unverified)*.
- **The map:**
  - **Size:** 17 floors per act.
  - **Room odds:** normal 53%, elite 8%, rest 12%, merchant 5%, unknown 22%.
  - **Ascension 1** adds about 60% more elites ([wiki, Map Locations](https://slaythespire.wiki.gg/wiki/Map_Locations); [wiki, Elite](https://slaythespire.wiki.gg/wiki/Elite)).
  - The act boss is shown on the map from the start of the act *(general knowledge)*.
- **The burning elite:** once Act 4 is unlocked, one elite per act is marked and buffed, and it drops the Emerald Key ([wiki, Keys](https://slaythespire.wiki.gg/wiki/Keys)).
- **The run start (Neow):**
  - **Four blessings:** a free card reward, a free basic reward (max HP, a common relic, 100 gold, potions), a **trade-off**, and a **boss swap** (your starter relic for a random boss relic). Trade-offs pair a cost (lose max HP, take damage, a curse, lose all gold) with a bigger reward (a rare relic, 250 gold, remove 2 cards...).
  - **After a bad run:** if your last run didn't reach the Act 1 boss, Neow offers only max HP or **Neow's Lament: enemies in your next three combats have 1 HP** ([wiki, Neow](https://slaythespire.wiki.gg/wiki/Neow)).
- **Meta:** **Ascension 1–20**, cumulative. It hits elites (1, 3, 8, 18), bosses (4, 5, 9, 13, 19, and two bosses at 20), events (15) and shops (16) ([wiki, Ascension](https://slaythespire.wiki.gg/wiki/Ascension)).
- **Slay the Spire 2 (early access, 2026):**
  - Guide sites say it replaces boss relics with **Ancients**, which offer powerful boons *(search extract; details unverified)* ([op.gg, Neow](https://op.gg/ar/slay-the-spire2/events/Neow); [sts2.gg](https://sts2.gg/guides/neow-relic-guide)).
  - Reviewers praise the "one more run" pull ([Noobfeed](https://noobfeed.com/reviews/slay-the-spire-2-early-access-review)), but some find it "more like a remake ... than a sequel" ([Metacritic](https://legacy.prod.metacritic.com/game/pc/slay-the-spire-2)).

### Wildfrost (Deadpan / Gaziter / Chucklefish)
- **How a build forms:**
  - **charms** modify cards;
  - **Crowns** let a card be played free at the start of a battle;
  - **companions** are recruited along the way ([Getting Started](https://wildfrostwiki.com/Getting_Started)).
- **Criticism:** difficulty. Reviewers found charm drops so random that a plan built on one charm could fail ([Punished Backlog](https://punishedbacklog.com/wildfrost-review/); [GGRecon](https://cms.ggrecon.com/reviews/wildfrost-review/)).
- **The response: v1.1, the Storm Bells update.**
  - It *lowered* the base difficulty, removing Companion Injuries among other things.
  - It moved the challenge into **13 opt-in Storm Bells with point values**, such as fewer wave-bell encounters or higher shop and Crown prices ([GoNintendo](https://www.gonintendo.com/contents/29760-wildfrost-ver-1-1-0-the-storm-bells-update-now-live)).

### Inscryption (Daniel Mullins)
- **How a build forms:**
  - **Sacrifice economy:** you sacrifice cards on the board to summon stronger ones.
  - **The campfire:** boosts a card, but each use risks losing it ([GameSpot](https://gamespot.com/reviews/inscryption-review-house-of-cards/1900-6417788/)).
  - **The Mycologists** fuse **two copies of the same card into one with the summed attack and health and both sets of sigils** ([ProGameGuides](https://progameguides.com/inscryption/how-does-the-mycologist-work-in-inscryption/)). That's a cousin of our 3-into-1 merging, offered as a *rare node*.
  - **Totems** add a sigil to every card of a tribe *(general knowledge; a search extract agrees, from a weak source)*.
- **Criticism:** later acts draw most of it (Act 1 is the celebrated part). A player complaint about Act 1: "we start each time with the same (almost) deck, follow the same path, and defeat the same bosses" ([Steam](https://steamcommunity.com/app/1092790/discussions/0/3123802224159358003)).

### Beyond the list

- **Hades (Supergiant).**
  - **Chaos Gates** cost HP to enter. A Chaos boon is a **curse for a few encounters, then a permanent blessing**. They stack and can't be upgraded with Poms ([Prima Games](https://primagames.com/gaming/hades-chaos-realm-chaos-blessings)). Guides say to take Chaos early, so the curse ends before the boss.
  - **Duo boons** need boons from two gods ([Gamepressure](https://www.gamepressure.com/hades/boons/z9d9c9)).
- **Vampire Survivors (poncle):** **evolutions** need a max-level weapon plus a specific passive, then an elite's chest. The passive is consumed ([Vampire Survivors wiki](https://vampire-survivors.fandom.com/wiki/Evolution); [Prima](https://primagames.com/gaming/vampire-survivors-weapon-evolution-guide)).
- **Brotato (Blobfish):**
  - **Characters:** each has advantages and disadvantages to play around, 62 with the DLC.
  - **Danger levels:** six, unlocked one at a time; the Demon character needs Danger 5.
  - **Criticism:** players call Danger 5 a wall ([Rogueranker](https://rogueranker.com/brotato-review/); [Fantasy Warden](https://fantasywarden.com/games/brotato-beginners-guide)).
- **Bloons TD 6: Rogue Legends (Ninja Kiwi, 2025 DLC):**
  - **Artifacts:** beneficial effects, some with negative trade-offs ([Bloons Wiki, Artifact](https://www.bloonswiki.com/Artifact)).
  - **Skipping:** on encounter tiles you **fight, or pay one heart to skip** ([Bloons Wiki, Bloon Encounter](https://www.bloonswiki.com/Bloon_Encounter_(Rogue_Legends))).
  - **Criticism:** "runs take far too long", and it's "more of an RNG fest than a roguelike" ([Vaporlens](https://vaporlens.app/app/3377850/bloons_td_6_rogue_legends); [Steam](https://steamcommunity.com/app/960090/discussions/0/596268332586428194)).

---

## 3. What these games share

1. **A run's identity is declared early and cheaply, then deepened.**
   - **Declared:** a king, clan pair, class, hero, specialist or character, plus a starting choice (Neow, a Pyre Heart, a specialist pack).
   - **Narrowed:** the pool is cut to what that identity wants. 9 Kings guarantees a king-specific decree; HS trinket offers key to your main type.
   - **Pivoted:** a fixed mid-run beat lets you pivot or commit (Backpack Battles' round-8 subclass, Monster Train's champion upgrades).
2. **The biggest picks are few and scheduled.**
   - **Examples:** TFT's three augments (2-1, 3-2, 4-2); 9 Kings' four councils (years 4, 14, 21, 29); HS trinkets (turns 6 and 9); Against the Storm's cornerstones (Legendary in years 2, 4, 6); StS's boss relic after each act.
   - **Around them:** many small purchases.
   - **What players learn:** the big moments are known in advance, so they plan toward them.
3. **Rule-benders carry costs, and the cost is in another currency.** StS's boss relics, Neow trade-offs, Chaos curses, Rogue Legends' artifacts, Thronefall's mutators and Brotato's characters all trade a resource you have for a rule you want.
4. **Broken builds take assembly, and the recipe is visible.** Vampire Survivors' evolutions, Hades' Duos, Ball x Pit's fusions, Backpack Battles' recipes and Inscryption's Mycologists all need two named parts. 9 Kings even labels "broken" decrees as a category.
5. **The test is known, so you can prepare for it.** StS shows the act boss, Balatro the boss blind's rule, 9 Kings the attacker (rerollable for 10 gold), Legion TD the wave list, and Dome Keeper the wave timer. Monster Train's bosses vary but show their abilities.
6. **Risky nodes pay in a different kind,** not just "more of the same":
   - StS elites are the main relic source, and the burning elite pays the Emerald Key;
   - forbidden glades pay cornerstones;
   - the Bazaar's higher-tier monsters pay more gold, XP and specific drops;
   - HS quests are explicitly harder for a better reward.
7. **Some variety comes from the world, not from the player's picks.** HS anomalies and its 5 of 10 tribes, TFT portals and encounters, Super Auto Pets' weekly pack, and Against the Storm's biomes and Forest Mysteries are one global rule or pool per run, applied to everyone.
8. **Catch-up feels like a reward, not a handout.** TFT's carousel order, HS quests and trinkets as catch-up, Neow's Lament after a run that died early, and 9 Kings paying a loser a card and the same gold.
9. **Meta-progression comes in five shapes:**
   - breadth unlocks (9 Kings' kings via printed quests, Monster Train's clan levels, Brotato's characters);
   - opt-in difficulty ladders (Ascension 20, Covenant 25, Storm Bells with points, Thronefall's mutators with a score, Brotato's Danger 0–5);
   - pre-run loadouts (Mechabellum's tech loadout, Thronefall's 5 perks of 54, Against the Storm's blueprint deck);
   - a between-run town (Ball x Pit, Wildfrost, Loop Hero's camp);
   - lineage: Inscryption's death cards carry a run's cards into the next *(general knowledge)*.

**What players and reviewers criticise.** These read as guardrails for us:

| Criticism | Game | Guardrail for us |
|---|---|---|
| A small identity pool narrows each run to 1–2 builds | 9 Kings | Each commander needs at least 2 viable directions |
| A plan depends on a random rule-bender that doesn't show | Wildfrost charms | Show prizes ahead of time, or add pity |
| Economy picks get "solved", with too little real risk | TFT (Fortune and others) | An economy keystone needs a real cost |
| High moments too easy, or too rare | TFT (Riot) | "Hard to hit, and worth hitting" |
| Perks that don't change how you play | Thronefall | Same as D1 |
| Difficulty too vertical, or a wall at the top | Thronefall, Brotato D5, Wildfrost at launch | Lower the base, move challenge into opt-in modifiers |
| Runs too long | BTD6 Rogue Legends | Keep the 25–35 min target |
| A global rule feels unfair | HS anomalies | Telegraph it before the run, and apply it to both sides |
| Repetition | Ball x Pit (8 levels), StS2 "a remake" | Maps, seasons and bosses need to vary, not only cards |
| Pool dilution as unlocks grow | Rogue Tower | Curate or trim pools per run |

---

## 4. Transferable mechanics for Spore & Sprawl (23)

Each entry gives its **sources**, the **problem** (the IDs from section 1), **how it would work** here, its **risk**, and its **repo status** where the repo already has something like it.

### A. Picks that define a build

**1. Mutation cards: one behavior patch per building, drafted in-run.**
- **Sources:**
  - TFT Set 13 Anomalies (one champion gets a power at 4-6; a reroll costs 1 gold) and Set 15 Power Ups;
  - Mechabellum's unit tech ("turn snipers into rapid-fire swarm clearers"; up to 4 per unit, each +200);
  - Wildfrost charms and 9 Kings' enchantments;
  - Despot's weapons, which change how a unit moves and attacks.
- **Problem:** D1 (40 of 42 upgrade levels are numeric), D11, and the engagement review's rec 5 ("strain-style mutation cards").
- **How it would work:**
  - **The card:** a new card type in §8.3's drafts. Choose one building in your kit and attach a mutation: one of the §11.5 strain patches, which are already written. There are 12: Teeming, Bursting, Ironcap, Gillguard, Longgill, Volley, Battering, Tunneling, Thornpuff, Longshot, Deep Truffle, Wild Truffle. Mutations for the M3/M4 and rework buildings would join them (e.g. a Rhizomorph that surfaces with its wave, a Burster whose cloud slows).
  - **The limit:** one mutation per building, as TFT allows one anomaly per champion. That keeps the reading load at "one line per building".
  - **A cheap way in:** make each track's level 3 a choice of 2 mutations instead of today's third numeric step. Total draft volume stays the same.
  - **M6 strains** then become the pre-run choice of *which* mutations can appear (mechanic 19).
- **Risk:**
  - Every mutation is a new unit variant for G3 and the counter matrix (C5), about 28 variants for 14 buildings × 2. The experiment tool can sweep them.
  - The general needs mutations too (C2). §7.8's "(i−1) random upgrade levels" could become "(i−1) mutations from its doctrine".
  - Adds a concept (C1). It replaces level-3 numbers rather than adding a fourth card type.

**2. Keystones: a few big, tiered picks on a fixed schedule, one always commander-specific.**
- **Sources:**
  - TFT's augments (three per game at 2-1, 3-2 and 4-2, in Silver, Gold and Prismatic);
  - 9 Kings' Royal Councils (years 4, 14, 21, 29; one king-specific decree guaranteed);
  - Against the Storm's cornerstones (yearly, Legendary in years 2, 4 and 6);
  - HS trinkets (Lesser on turn 6, Greater on turn 9, offers keyed to your type);
  - the Backpack Battles subclass at round 8.
- **Problem:** D2, D5 (F9), D9, D1.
- **How it would work:**
  - **When:** three Keystone picks per run:
    1. at run start (or after battle 1), Lesser;
    2. after route row 3, Greater;
    3. after row 5, before the boss, Legendary.
  - **The offer:** 1 of 3, with one paid reroll. Built like HS's trinket offers: one keyed to your most-built building, one generic, and one specific to your commander (9 Kings' guarantee).
  - **What a keystone is:** a rule-bender, not a percentage. For example:
    - "Waves of three or more types also leave a cloud" (from the `mixedWave` idea in combat-rework);
    - "Your Elders split into two Bloomed units on death";
    - "Hold no longer has a cooldown";
    - "Your Heartcap turrets fire Sporeling pods".
  - **The split it gives us:**

    | Pick | Offers |
    |---|---|
    | In-battle drafts | Blueprints, upgrades and mutations |
    | Spoils | Relics: today's stat relics, moved here |
    | Keystones | Rule-benders |

    That answers F9: spoils and drafts would differ.
- **Risk:** a new screen (C1), though it replaces the relic share of drafts and the elite's relic pick. "Hard to hit, worth hitting" means each keystone must be tested with the `runs` check. Keystones are player-only (C2): the general's equivalent is its doctrine.
- **Repo status:** new. It extends the engagement review's "fewer, bigger drafts" and Step B's `bigdrafts` finding that "a bigger draft has to mean more picks".

**3. Blighted relics: big rule-benders with a cost in another currency.**
- **Sources:**
  - StS boss relics (+1 energy for no gold, no rest, fewer card choices, no intents, or stronger enemies);
  - Neow's trade-offs;
  - Rogue Legends' artifacts with negatives;
  - Hades' Chaos (curse, then blessing);
  - Brotato's characters.
- **Problem:** D2, D3 (F11), D7. It also gives the "rare broken run" of §1.2 a deliberate home.
- **How it would work:** a "Blighted" rarity, offered only by elites, the Fallen Oak event and mechanic 12's Omens. Several costs reuse §11.8's blights, which are already specced for M7. Examples:
  - **Silent Spores:** income +25%; you get no counter warnings (the Silent General blight as the cost; the Runic Dome pattern).
  - **Hollow Crown:** +1 Keystone pick for the run; in-battle drafts show 2 cards (Busted Crown).
  - **Restless Mat:** spawners 15% faster; Groves can't repair (Coffee Dripper). That makes D10's repairs a real choice.
  - **Mono Bloom:** waves of a single unit type get the mixed-wave shield, and mixed waves lose it. The "relic that rewards a mono wave" combat-rework already floated.
  - **Rot Pact:** +1 card in every draft; the general starts each battle with its elite modifier.
- **Risk:** the drawback must be readable at pick time (C1). One per run at first. They're a reward, so the general doesn't get them (C2).

**4. Symbioses: combination unlocks with a visible recipe.**
- **Sources:**
  - Vampire Survivors' evolutions (a max weapon plus a specific passive, from an elite's chest);
  - Hades' Duo boons (two gods);
  - Ball x Pit's fusions;
  - Backpack Battles' recipes;
  - Inscryption's Mycologists (two copies fused, stats and sigils summed);
  - Monster Train: "broken is fine if it takes assembly".
- **Problem:** §11.7's three "rare broken run" engines are invisible and depend on luck. D2.
- **How it would work:**
  - **The offer:** a Symbiosis card appears in a draft only when its parts are owned. Examples:
    - Sporeling Burrow at upgrade level 3 + the Spore Cloud relic → **Bursting Brood**: Sporelings burst on death, and the cloud's damage scales with merge tier;
    - Spore Tithe + Knitting Circle + a Burrow → **Merge Economy**: each Elder birth pays 25 gold;
    - Mycorrhizal Link + 4 linked buildings → **Hyphal Mat**: linked spawners share one wave timer, so their units always leave together.
  - **The display:** the codex in Help lists recipes once you've seen one. A draft card that's part of a recipe shows "Part of Bursting Brood (1 of 2)".
  - **The general** doesn't get them (C2).
- **Risk:** content count, spikes in the `runs` check, and more to learn (C1). Hiding recipes until first seen, as Vampire Survivors does, keeps early runs simple.

### B. Variety from the world

**5. A Season per run: one global rule, applied to both sides.**
- **Sources:**
  - HS anomalies (lobby-wide; no repeat within 3 games; some content excluded under one);
  - TFT portals ("much like beginning a run of a roguelike game") and encounters;
  - Against the Storm's Forest Mysteries (positive in Drizzle, negative in Storm);
  - Super Auto Pets' weekly pack.
- **Problem:** D11, D12 (the mirror-match general), and "every run asks something new" (pillar 4).
- **How it would work:**
  - **The roll:** each run rolls one Season on the `route` stream, shown on route row 1 and on every battle node. It applies to both sides (C2).
  - **Examples:**
    - Wet Season: loam yields double, and the Sporestorm starts 1:00 later;
    - Swarming: every Burrow-type spawner +1 unit, and merges knit 50% faster;
    - Spore Fall: every 4th wave beat, a Spore Burst lands on the front for both sides;
    - Rot Year: every general carries an elite modifier, and spoils get +1 rarity step.
  - **No repeats** within 3 runs, kept in the profile.
  - **Later:** the generals and Gray Rot can carry Season-specific doctrines (M7).
- **Risk:**
  - HS players call anomalies unfair, but this is single-player and telegraphed.
  - Each Season needs a G3 and counter check (C5). 4–6 Seasons is enough to start.
  - Cheap: modifiers on existing stats via the `effects.modifiers` machinery that `elites.json` already uses.

**6. A curated building pool per run: "five tribes".**
- **Sources:**
  - HS Battlegrounds (5 of 10 types per lobby, shown at hero select; heroes for an absent type sit out);
  - Super Auto Pets' packs and weekly pack;
  - Rogue Tower players trimming unlocks to avoid diluted draws;
  - 9 Kings' small, memorable decks (Michet: you can recall every card).
- **Problem:** D11, C1 (fewer buildings to read per run), D9.
- **How it would work:**
  - **The pool:** each run's shared pool (§8.4) is a random 5–6 of the non-core buildings, shown on the commander screen next to each commander's core. Commander cores stay complete, and player bans still apply.
  - **The general** draws its extra blueprints (§7.8) from the same run pool, so the world hangs together.
  - **Later:** a pool could be themed ("a run of the Deep Wood").
- **Risk:** some pools suit some commanders, which the commander tournament can measure. Cheap: `src/run` setup plus a `draft` stream change.

**7. Loot from the general you beat, shown on the route node.**
- **Sources:**
  - 9 Kings: you take a card from the defeated king; a loss still gives one from your own deck;
  - the Bazaar: monsters drop known items, and guides list them so players choose a fight for its loot;
  - Monster Train: "the route you choose will also determine the development of your deck".
- **Problem:** D4, D5, D11.
- **How it would work:** each battle node shows "Spoils include one of: {3 of this general's doctrine buildings or mutations}". The Rout spoils (§8.6) gains one card drawn from that list. Picking Old Mother Mold's node then means picking the swarm kit.
- **Risk:** a general's kit is the Velvet Bloom roster until M7, so loot is a mirror (the Gray Rot's asymmetric roster would fix that). With mechanic 6, loot can bring in buildings outside the run's pool, which is a feature.
- **Repo status:** already proposed in combat-rework's 9 Kings table. The research adds showing the loot on the node, and a loss still paying.

**8. Know and choose your opponent.**
- **Sources:**
  - 9 Kings: you see which king attacks next and can reroll it for 10 gold, +10 per reroll;
  - BTD6 Rogue Legends: pay one heart to skip an encounter;
  - the Bazaar: choose the encounter;
  - StS shows the act boss;
  - Legion TD's known wave list.
- **Problem:** D4, D6, D12. Today's route shows the general's portrait and the map (§8.2), but not its kit.
- **How it would work:**
  - **The node:** a battle node shows the general's opener buildings and upgrade levels (§7.8), its elite modifier, and which counter kind your intel bars (§7.6) predict.
  - **The reroll:** pay 5% of max Heartcap to swap a node's general for another eligible one.
  - **Battle 1:** the reroll is free in battle 1, a direct answer to "Mold causes 79 of 99 battle-1 losses".
- **Risk:** it trivializes counters if the reroll is too cheap. Small cost: a route UI and the `route` stream.

**9. A route that branches, with costs.**
- **Sources:**
  - StS's map (paths, about 8% elites, rest sites, unknown rooms; Ascension 1 adds more elites);
  - Monster Train's two paths per ring;
  - Against the Storm's choice of glades.
- **Problem:** D4 (F10), D3, D10.
- **How it would work:**
  - **The links:** replace §8.2's every-node links with 3 columns per row, each node linking to 1–2 nodes in the next row. A Grove then sits on one path and an elite on another, so repairs compete with prizes.
  - **The map:** the whole map, the boss's Edict (mechanic 10) and the Season (mechanic 5) are visible from the start.
  - **"?" nodes:** add unknown nodes that resolve to an event, a Grove or a small battle.
- **Risk:** the route generator and the `runs` measurement change. §8.2 calls the full links "deliberate". A hover that shows every path to a node is the F10 tester's ask. Medium cost.

**10. The boss as a visible exam, with variants.**
- **Sources:**
  - Balatro's boss blinds (a named rule, visible at the start of the ante);
  - Monster Train's bosses (variable abilities);
  - StS's pool of bosses per act, shown on the map;
  - Legion TD's known boss wave.
- **Problem:** D7 (a run that reaches the boss wins 70–87%), D12, and every run ends in the same fight.
- **How it would work:**
  - **The roll:** the Pale Sovereign rolls one **Edict** per run, shown from route row 1. Each is a passive or a rule, not an active power, so it stays within §17 #13.
  - **Examples:**
    - Sovereign of Thorns: its Heartcap turrets reach 2 more columns;
    - Sovereign of Many: its trios merge instantly;
    - Sovereign of Mirrors: it builds your two most-built buildings;
    - Sovereign of Roots: a two-lane boss map.
  - Its counter cycle and intel (§7.4–§7.6) stay.
- **Risk:** balance per Edict, and boss content. It also lets the difficulty curve stop being upside down without touching battles 1–4.

### C. Risk and reward

**11. Elite prizes shown up front and paid in a different kind.**
- **Sources:**
  - StS elites (the main relic source) and the burning elite (buffed, pays the Emerald Key);
  - Against the Storm's forbidden glades ("even sweeter rewards");
  - the Bazaar's monster tiers;
  - HS quests (harder for a better reward).
- **Problem:** D3 (F11). Today an elite adds a relic pick, +15 Spores and a 25% chance of Amber, against +30% Heartcap, +1 upgrade level or instant first spawns.
- **How it would work:**
  - **The prize:** each elite node shows one, from: a Keystone (mechanic 2), a Blighted relic (mechanic 3), a mutation (mechanic 1), or a building looted from that general (mechanic 7). Amber is guaranteed, not 25%.
  - **The burning elite:** once per run, one elite has two modifiers and pays a Legendary Keystone and 2 Amber.
- **Risk:**
  - Elite inflation raises run wins, so measure with `--checks runs`.
  - A harder elite path could raise run deaths. Mechanic 14 softens that.
  - Cheap: route node data and spoils.

**12. Omens: a wager you can put on any battle.**
- **Sources:**
  - Thronefall's mutators (buff enemies, raise the score);
  - Loop Hero's tiles (more danger, better loot);
  - the Bazaar's choice of a tougher monster;
  - Against the Storm's dangerous glades;
  - HS's quest-reward pairing;
  - Hades' Chaos (pay now, gain later).
- **Problem:** D3, battles with few greed decisions, F1 (forward risk that doesn't pay).
- **How it would work:**
  - **The wager:** before any battle you may add 0–2 Omens. They reuse what already exists: the elite modifiers (Fortified, Veteran, Swift) and the blights (Hardened Rot, Early Storm, Quick Learner).
  - **The payout:** each Omen raises that battle's spoils one step: +1 rarity, then +1 pick, then a Keystone.
  - **Score:** Omens could feed M7's Decay score.
- **Risk:** players optimize for safety and ignore it, which is fine because it's optional. Cheap: data plus a pre-battle toggle on the node.

**13. Commissions: quest-reward pairs in a battle or a run.**
- **Sources:** HS Battlegrounds quests (turn 4; three pairs; harder quest for a stronger reward; progress shown).
- **Problem:** D1 and D2 (rewards that ask for a style), battles with few goals, F6 (territory ignored).
- **How it would work:**
  - **The offer:** at deploy in battles 2 and 3, pick 1 of 3 commissions written in §9.2's feat condition DSL, whose stat paths already exist. For example:
    - "Hold 18 columns at once": a rare relic;
    - "Birth 2 Elders": a mutation;
    - "Lose no building": a Keystone.
  - **Progress:** a chip in the top band, next to the relic chip added in round 3.
  - **Difficulty and reward** scale together, as in HS.
- **Risk:** it can push degenerate play (mono builds to farm merges), so pick conditions that reward mixed waves and territory. More to read (C1): one at a time.

**14. A loss that still pays, with costs that rise through the run.**
- **Sources:**
  - 9 Kings (a loss still gives a card and the same gold);
  - the Bazaar (prestige lost equals the day number, so later losses cost more);
  - BTD6 Rogue Legends (pay a heart to skip);
  - TFT's loss-streak gold and carousel order;
  - HS quests and trinkets as catch-up;
  - Super Auto Pets and Backpack Battles lives.
- **Problem:** D6 (33% of runs lost in battle 1), D10, "no comebacks".
- **How it would work:**
  - **The cost:** a lost Rout costs Heartcap HP that rises with the battle index (battle 1 −20% of max, battle 2 −30%, battle 3 −40%, battle 4 −50%) instead of ending the run. A boss loss still ends it.
  - **The payout:** a lost battle still gives a 2-card spoils from your commander's core (9 Kings).
  - **The next battle:** the deploy draft gets +1 card (TFT's carousel order).
- **Risk:** lower tension. Runs get longer: measure the median and the boss-reach rate.
- **Repo status:** engagement review rec 2 and rounds.md's run layer already propose "a loss costs HP". The research adds the scaling by battle index and the paid loss.

**15. Sprouting: a start-of-run boon with a trade-off, and a softer start after a bad run.**
- **Sources:**
  - StS's Neow (four blessings: a free card, a free basic reward, a trade-off, a boss swap; after a run that died before the Act 1 boss, max HP or Neow's Lament, which gives enemies 1 HP for three combats);
  - Monster Train 2's Pyre Hearts;
  - Mechabellum's specialist pack.
- **Problem:** D6, D9, and runs that start the same way.
- **How it would work:**
  - **Step 0 in the Underroot:** pick 1 of 4:
    1. a blueprint (1 of 3 from your core);
    2. a basic boon (+150 gold in battle 1, or +10% max Heartcap);
    3. a trade-off (−15% max Heartcap for a rare relic or a mutation);
    4. a commander swap: replace your passive with a random alternate. M6 mastery plans alternates.
  - **After a bad run:** if the last run ended in battle 1, add **Mother's Mercy**: in battle 1, the general plays at ¾ income. That's exactly the second half of `hotstart` in `src/data/proto.ts`, offered only to players who need it.
- **Risk:** low. One screen; mostly data and UI.

### D. Commanders as identities

**16. Commanders as decks with a signature rule.**
- **Sources:**
  - 9 Kings (a deck, decrees and perks per king; one king-specific decree per council);
  - Monster Train's clans;
  - Backpack Battles' classes;
  - Mechabellum's specialists (Elite: only level-2 units; Giant: free unlocks; HP modifiers);
  - Brotato's characters (advantages and drawbacks).
- **Problem:** D9, D11.
- **How it would work:**
  - **A signature rule** that bends a system rather than adding 10%. For example:
    - Vesper: your waves leave on a 15 s beat instead of 20;
    - Armilla: no supply-line surcharge on columns you've held for a full wave (also F1);
    - Cordis: a merge needs 2 of a type, not 3.
  - **2–3 commander-only Keystones,** one guaranteed in each Keystone offer (mechanic 2).
  - **One commander event each.**
- **Risk:**
  - These are rule changes, so they need the user's OK (`.claude/rules/balance.md`).
  - The commander tournament spread is about 10 points today, and must stay within its band.
  - Each commander needs at least 2 viable directions, so 9 Kings' "one or two builds per king" isn't repeated.

**17. An allied commander: a second pool.**
- **Sources:** Monster Train's primary and allied clan (every card from both; 10 clans in MT2).
- **Problem:** D11, D9. With 3 commanders, ordered pairs make 6 combinations (12 with 4 commanders).
- **How it would work:** at run setup, or through a row 2 event, pick an ally. Its core pool joins your shared pool at ×1.5 weight, and its commander-specific Keystones can appear. You keep only your own power.
- **Risk:** diluted identity and more to learn (C1). Lock it until M6 mastery level 3 or so.

**18. A champion building with a branching upgrade path.**
- **Sources:**
  - Monster Train's champions (several paths; commit or mix; upgraded after bosses);
  - Mechabellum's unit levels and tech;
  - 9 Kings' plot levels.
- **Problem:** D1, no star unit, and automatic merges.
- **How it would work:**
  - **The champion:** each commander's starter kit holds one Champion building, e.g. Vesper's Velvet Brood.
  - **Its upgrades:** at Groves and elite wins, on one of 3 paths, each 2–3 steps that change behavior. Examples: a Swarm path (bigger spawns, faster knit), an Elder path (its trios skip Bloomed and go straight to Elder), and a Siege path.
  - **Groves** become a real choice between repair, graft and champion (D10).
- **Risk:** a fixed starter can narrow kits. This overlaps 16. Medium content cost.

### E. Meta-progression (M6–M7)

**19. Choose the offer pool before a run (a loadout).**
- **Sources:**
  - Mechabellum's tech loadout per mode;
  - Thronefall's 5 perks of 54;
  - Against the Storm's blueprint "deck" (devlog);
  - Rogue Tower players trimming unlocks.
- **Problem:** D8, C1 (narrower pools are easier to read), and the size of mechanic 1's mutation pool.
- **How it would work:** recast §9.3's strains as "which 2 mutations of this building can appear in this run's drafts". Defaults are filled in, and feats and mastery unlock more.
- **Risk:** optimizing before the run. Defaults and a "random" button cover it.

**20. Unlock quests printed on the locked item, gating complexity rather than power.**
- **Sources:**
  - 9 Kings (kings unlock through quests shown on the locked card; only the King of Nothing at the start);
  - Brotato (characters unlocked by Danger);
  - Monster Train's clan levels.
- **Problem:** D8, F8 (staged unlocks are onboarding).
- **How it would work:** §9.2's feats already exist. Start a new profile with Vesper, about 6 buildings, about 8 relics and no mutations or keystones. Each locked thing shows its feat on its card. The first unlock comes in runs 1–2 (§9.8).
- **Risk:** low. It's M6.
- **Repo status:** the one-more-run review endorsed "keyword-at-a-time unlocks". The research adds printing the quest on the locked card, and gating complexity rather than power.

**21. Opt-in difficulty with points, and a lower base.**
- **Sources:**
  - Wildfrost's Storm Bells (it lowered base difficulty after launch complaints, then added 13 opt-in bells with point values);
  - Thronefall's mutators with a score bonus;
  - StS's Ascension (20 cumulative levels);
  - Monster Train's Covenant 25;
  - Brotato's Danger 0–5.
- **Problem:** D6, D7, D8.
- **How it would work:**
  - Our blights (§9.6, §11.8) are already points-based. Two additions:
    - **Move some of today's difficulty into a blight,** following Wildfrost. For example, "Mother's Brood: Old Mother Mold may appear in battle 1". Step B found that moving Mold out of battle 1 takes `hotstart` to 6% battle-1 losses.
    - **Offer a cumulative "Decay ladder" path,** StS-style, beside the free toggles, for players who want a next step chosen for them.
  - Fits §17 #14: difficulty is the baseline plus blights.
- **Risk:** low. It's M7 content.

**22. The Underroot as a colony you grow between runs.**
- **Sources:**
  - Ball x Pit's village ("constant progression");
  - Wildfrost's town;
  - Loop Hero's camp;
  - 9 Kings' perk board, where rainbow perks multiply their neighbors.
- **Problem:** D8.
- **How it would work:** colony traits (§9.4) become small structures planted on an Underroot grid with Spores. The neighbor rules live in the meta screen, so §17 #11, which bans core battle adjacency, isn't touched. Root Capacity becomes plots.
- **Risk:** grind. The engagement review warns that "meta multiplies the core loop's fun and doesn't create it". Lower priority.

### F. Scouting and counters

**23. Visible enemy picks from a shared offer.**
- **Sources:**
  - Mechabellum (both players see the same reinforcement offer each round; skip for 50);
  - TFT (every board can be scouted);
  - HS (the scoreboard shows the quest rewards others chose).
- **Problem:** D12, C2.
- **How it would work:** at the in-battle draft at wave 4, both sides draft from one visible offer of 4. You pick first, and the general takes one of the remaining three. The report and a callout show its pick. That gives a "deny" decision and makes the general's adaptation (§7.4) visible.
- **Risk:**
  - Draft AI for the general.
  - Determinism: the general's pick must be a pure function of state (C3).
  - More to read (C1).
  - The engagement review's "free answer pick on a counter warning" is the alternative.

---

## 5. Suggested shortlist and order

Ranked by fun per cost, and by fit with the playtest and P4 timeline. Nothing here touches the rework's combat rules.

| # | Mechanics | When | Why |
|---|---|---|---|
| 1 | **15** (Sprouting and Mother's Mercy) and **14** (scaled loss costs, a paid loss) | After P4, alongside step B's `hotstart`, `breach` and `bigdrafts` decision | Mostly data and UI. They target D6 (33% of runs lost in battle 1) directly, which no combat change fixes |
| 2 | **11** (elite prizes) and **12** (Omens) | Next | F11 has waited since round 3. Both reuse `elites.json` and the blight list. Cheap |
| 3 | **1** (mutations, via strains moved into drafts) and **2** (Keystones, a relic restructure) | The core build-expression change, written against whichever combat model P4 adopts | Mutations re-run G3 and the counter matrix with the experiment tool, so they come after P4 |
| 4 | **5** (Seasons) and **6** (curated pools) | Cheap world variety | Both use existing modifier machinery and the `route` and `draft` streams |
| 5 | **9** (branching route), **10** (boss Edicts) and **8** (opponent info and reroll) | A route and boss pass, tied to F10 and D7 | |
| 6 | **16–18** (commanders) | With M6 mastery | Each signature rule is a rule change that needs the user's OK |
| 7 | **19–22** (meta) | Folded into M6 and M7 as reshapes of §9 | Not additions |

Two lessons apply to all of it:
- **Replace before adding.** Mutations replace level-3 numbers, and Keystones replace the relic share of drafts and the elite relic pick. That keeps C1, "too much to learn", from growing.
- **Show it before it matters.** Show the boss Edict, the elite prize, the Season and the loot on the node before the player needs them. Every game praised here lets players plan toward a known test.
