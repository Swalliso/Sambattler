# Rounds: a paper design for the combat rework's Level 3

Drafted on 2026-10-31 against `c556f3c` (`develop`). **This is a paper design. Nothing here is built or adopted.** It's the hedge in the [combat rework](combat-rework.md). If Level 2 (waves on a shared clock, plus new tools) can't give every strong build an answer, the plan's [P4](combat-rework.md#p4-decide) moves to [Level 3](combat-rework.md#level-3-rounds): rounds, as in Mechabellum, written up as "a paper design plus a headless clash prototype". This doc is the paper design. It specifies the prototype but doesn't build it.

Where Level 2 stands: P1c's write-up is on `feature/combat-rework` (`e648dee`), which isn't on `develop` yet.
- The strict counter bar passes in all nine of P1c's confirmed variants.
- G3 passes in none, though 20 s beats come close: only mono Sporeling fails there.
- G4 fails in all nine on Decisions (30–48%), because the answers to the swarm win by holding more columns at 10:00 rather than by taking the Heartcap.
- P1d and a check after it found that the mixed-wave shields, not the Burster, are what pass the strict bar. Without them, mono Sporeling's best answer falls from 85% to 47% ([the rework doc](combat-rework.md#p1d-fewer-stalls-and-the-shields-carry-the-strict-bar)).

## In short

- **The idea:** a battle becomes a series of rounds against the same general. Each round is a paused planning phase, then a clash in which both whole armies start at once, in formation, and fight to the end. The winner's survivors then damage the loser's Heartcap.
- **The colony is the army.** Each spawner fields a fixed squad every round, and where a building stands in your colony is where its squad stands in the clash. Nothing trickles out, waits on the field or carries over.
- **What goes:** spawn timers, column capture, forward building, Hold, Heartcap turrets and the 10:00 Decision. The round structure does their jobs ([table](#todays-systems-under-rounds)). Combat, merging, the general, drafts, relics and the run's Heartcap stay.
- **Why it could work:**
  - It removes the trickle and the pile-up of survivors at the root.
  - You see what the general fielded last round, so a committed build can be answered within the battle.
  - Every clash ends, so answers can't win by stalling, which is where P1c fails G4.
- **Why it might not:**
  - Whole armies meeting at once make Lanchester's square law stronger.
  - At equal gold, the Burrow fields 36% more bodies than a Capguard Hall. Until the supply cap binds, Capguards stop being a clean answer to Sporelings ([below](#todays-strong-builds-under-rounds)).
  - A fixed mix still splits its strength, so mono archers would probably still beat `bot:balanced`.

  Rounds need Level 2's area damage and back-line tools, and they make those tools matter more.
- **Identity:** the opponent is an adaptive general rather than a human, the colony's layout is the formation, merging happens on the field, and one Heartcap lasts the run. Together they keep the game apart from Mechabellum and 9 Kings.
- **The cost:** about 1,250 lines of combat code carry over, and about 1,500 lines of the loop, spawning, economy, AI, drafts and powers are rewritten. The UI needs a planning screen, and the goldens and most guardrails change. Today's maps also go flat: their loam and Stumpfield's stumps all lie in contested ground.
- **The prototype:** a headless tool that turns two build lists into two armies at equal gold, deploys them in formation and runs one clash on today's combat code. That lets the counter matrix and G3 run on clashes. It changes no rules and takes about a session.
- **Recommendation:** build the clash prototype before tuning Level 2 further. It tests the rework's own diagnosis, "it's how armies meet", directly. If a mixed army in formation still loses whole-army clashes, neither waves nor rounds fixes G3 without changes to combat itself.

## How round-based autobattlers do it

Five questions for each game:
- what happens in planning;
- what carries over between rounds;
- how the loser takes damage;
- what you see of the opponent before you commit;
- what stops snowballing.

### Mechabellum

Game River's 1v1 game (early access 2023, full release 2024), and the model for Level 3.

- **Planning:**
  - **Supply:** each round brings supply, which one guide gives as 200 × the round number, and unspent supply carries over.
  - **Limits:** you unlock at most one new unit type a round and deploy up to two new units.
  - **Other buys:** upgrades and tech.
  - **Cards:** you take one of four reinforcement cards that both players see, or skip it for 50 supply.
- **What carries over:**
  - The whole army. A unit stays where it was first placed, and every unit is restored before the next round.
  - Units gain experience and levels.
  - The towers are put back each round.
- **The loser:**
  - **The rule:** each of the winner's surviving units takes HP from the loser by its base cost, whatever its level. A 100-supply unit deals 100, 200 deals 200, 300 deals 250, 400 deals 350, 500 deals 400 and 800 deals 500, split over a squad's mechs.
  - **HP:** players start with 4,500 HP, adjusted by specialist and starting pack.
  - **Ending:** tournament games stop at 13 rounds, and the player with more HP wins.
- **Before you commit:** the enemy army as it stood in earlier rounds. This round's new placements stay hidden until the fight starts.
- **Against snowballing:**
  - Both sides get the same supply whatever happened.
  - A lost round costs HP, not units.
  - Only survivors count, so a close loss costs little.

Sources: [Mechabellum Wiki: Player Hit Points](https://mechabellum.wiki.gg/wiki/Player_Hit_Points); [gameplay.tips' mechanics guide](https://gameplay.tips/guides/mechabellum-guide-to-unit-and-mechanism-details.html); [GamePretty's beginners' guide](https://gamepretty.com/mechabellum-beginners-guide/); [GamingOnLinux](https://www.gamingonlinux.com/2023/05/mechabellum-is-an-auto-battling-supreme-commander-im-completely-hooked/page=1/); [MonsterVine's review](https://monstervine.com/2025/04/mechabellum-review/); [Wikipedia](https://en.wikipedia.org/wiki/Mechabellum).

### Teamfight Tactics

Riot's eight-player free-for-all (2019).

- **Planning:**
  - **Phase:** a short timed phase, in which you buy champions from a shared shop, place them on a hex board and level up.
  - **Income:** 5 gold a round, plus interest (1 for every 10 banked, up to 5) and streak gold.
- **What carries over:** your board, bench and items. Your opponent changes each round and is assigned at random.
- **The loser:**
  - **Damage:** the stage's base damage, which rises to 17 at stage 7 and 150 at stage 8, plus 1 for each surviving enemy champion. That has been the rule since patch 14.8.
  - **HP:** players start with 100 HP.
  - **Timeouts:** a fight that times out counts as a loss for both players.
- **Before you commit:** every other player's board, which you can view at any time. Scouting is a core skill.
- **Against snowballing:**
  - Base income is the same for everyone.
  - Losing streaks pay gold: +1 at 3–4 losses, +2 at 5, +3 at 6 or more.
  - Trailing players pick first in shared drafts.
  - Damage is set by the stage and the unit count, not the margin.

Sources: League of Legends Wiki, [Teamfight Tactics](https://wiki.leagueoflegends.com/en-us/Teamfight_Tactics_%28game%29) and [Gold](https://wiki.leagueoflegends.com/en-us/TFT:Gold); [patch 14.8 notes](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-14-8-notes/); [esports.gg on viewing other boards](https://esports.gg/guides/teamfight-tactics/tft-tip-tuesday-how-to-utilize-the-ui-tools).

### Super Auto Pets

Team Wood's asynchronous game (2021).

- **Planning:** 10 gold a turn. Pets and most food cost 3 gold and a roll costs 1, and you can freeze shop items to keep them.
- **What carries over:** your team of pets, with its levels and stats.
- **The loser:**
  - **The rule:** one life per lost battle, however badly it went. A draw costs nothing.
  - **Arena:** you have 5 lives, need 10 wins (trophies), and get a life back on turn 3 if you've lost one.
- **Before you commit:** nothing. The game picks a stored team that another player built on the same turn.
- **Against snowballing:**
  - A loss costs one life whatever the margin.
  - Everyone gets the same gold.
  - Your opponent has had as many turns as you.

Source: [Super Auto Pets Wiki: The Basics](https://superautopets.wiki.gg/wiki/The_Basics).

### Backpack Battles

PlayWithFurcifer's asynchronous game (2024).

- **Planning:** a shop each round, where you buy items and bags, sell and reroll. An item's shape and its neighbors in the backpack decide how it works, and adjacent items combine by recipe.
- **What carries over:** the backpack and its layout.
- **The loser:**
  - **The rule:** each loss costs one of 5 lives.
  - **Winning:** you win a run by winning 10 battles before losing 5. You may then play on in survival mode, up to 18 rounds.
  - **Length:** a fight lasts 10–20 s.
- **Before you commit:** nothing. Opponents are other players' recorded builds, picked semi-randomly, and from a similar rank in ranked play.
- **Against snowballing:** a loss costs one life however it went, and gold and health rise each round for everyone.

Sources: [Wikipedia](https://en.wikipedia.org/wiki/Backpack_Battles); [GamingOnLinux](https://www.gamingonlinux.com/2024/03/backpack-battles-is-another-clear-indie-steam-hit).

### 9 Kings

Sad Socket's roguelike (2025), in which your kingdom is a small grid of plots.

- **Planning:** each year you play cards onto plots: troops, buildings that boost their neighbors, enchantments and one-shot tomes.
- **What carries over:** the whole kingdom: its plots, their levels and the cards on them. Each battle fields what your plots hold.
- **The loser:** you lose one of three lives if any enemy unit touches your Kingdom Base card. Losing a life in the final battle ends the run.
- **Before you commit:** which king attacks next, shown as an icon, so you know its deck. You can pay to change the attacker: 10 gold, then 10 more for each further reroll.
- **Against snowballing:**
  - Every battle pays 9 gold, won or lost.
  - A loss still gives a card, from your own king's deck rather than the defeated king's.

Sources: [9 Kings Wiki: Run](https://wiki.hoodedhorse.com/9_Kings/index.php?oldid=702&title=Run); the combat rework's [notes on 9 Kings](combat-rework.md#what-9-kings-does).

### Legion TD 2

AutoAttack Games' lane game, the closest to our structure: a lane, a fixed formation, and players who attack as well as defend.

- **Planning:** before each wave, you place fighters on a grid in your lane and upgrade them. You also hire mercenaries with mythium and send them at an opponent's lane, which raises your income.
- **What carries over:** your fighters. After each wave they're restored to their original formation.
- **The loser:**
  - **Leaks:** creatures that get past your fighters go through to your king. A leak also costs you the wave's end-of-round gold, and pays your opponents a bonus.
  - **Winning:** the team whose king survives longer wins. A match takes about 25 minutes.
- **Before you commit:** the creature waves follow a fixed list (wave 10 is a known boss), so you build for the wave that's coming. The surprise is your opponent's sends.
- **Against snowballing:** little. Leaks are punished three ways, and the fixed waves keep everyone on the same schedule.

Sources: [Legion TD 2 Wiki](https://legiontd2.wiki.gg/wiki/Legion_TD_2) and its [Mercenaries page](https://legiontd2.wiki.gg/wiki/Mercenaries); [Switchblade Gaming's wave guide](https://www.switchbladegaming.com/strategy-games/legion-td-2/wave-composition-guide/).

### Hearthstone Battlegrounds

Blizzard's eight-player mode (2019) has two rules that bear on our Heartcap cliff:
- **The loser** takes the winner's tavern tier plus the tiers of its surviving minions.
- **A cap:** since 2021, no player takes more than 15 damage from one combat until the first player in the lobby dies.

Weaker heroes also start with more armor: 5 to 20, since 2023.

Sources: [Blizzard's 2021 revamp notes](https://hearthstone.blizzard.com/en-us/news/23714527/battlegrounds-revamp-coming-tomorrow); [Hearthstone Wiki: Armor](https://hearthstone.wiki.gg/wiki/Battlegrounds/Armor); [Sportskeeda's guide](https://www.sportskeeda.com/esports/hearthstone-battlegrounds-the-ultimate-guide-to-gameplay-heroes-and-more).

### What they share, and what we take

| Question | What they do | Our pick |
|---|---|---|
| Planning | A shop phase between fights. Mechabellum caps new units at two a round | Paused and untimed, like today's deploy. Gold and plots are the only limits |
| What carries over | The army or team, restored each round (Mechabellum, Legion TD 2, 9 Kings, Super Auto Pets) | The colony. Every squad is fielded fresh each round |
| The loser | HP by survivors: by cost (Mechabellum), by count plus stage (TFT), by tiers with a cap (Hearthstone). Or one life a loss (Super Auto Pets, Backpack Battles, 9 Kings) | HP by surviving supply, capped each round, rising late |
| Before you commit | Last round's army (Mechabellum), every board (TFT), the attacker (9 Kings), the waves (Legion TD 2), nothing (the asynchronous games) | Last round's army, both ways |
| Against snowballing | Equal income, armies restored, damage by survivors, loss-streak gold, damage caps | All five |

In all of these games, committing to a composition is the strategy. They balance it with answers you can see and build, which is the premise of [the counter matrix](combat-rework.md#the-counter-matrix-check): "A strong build isn't the bug. A build with no answer is."

## The battle loop

### A round

| Phase | What happens | Clock |
|---|---|---|
| **Planning** | Income arrives. You see the general's colony and its last army. You plant and sell buildings and set merge toggles, and on draft rounds you take a draft | Stopped, untimed |
| **Clash** | Both armies appear in formation on the same tick. They fight until one side is gone in every lane, or until 45 s pass | Live, about 20–40 s |
| **Aftermath** | The winner's survivors damage the loser's Heartcap. A short report says what killed what | About 3 s of animation, not simulated |

**An example:** battle 1 against Old Mother Mold.
- **Round 1's planning:** you have 300 gold, as in today's deploy. You plant a Capguard Hall and a Sporeling Burrow, and Mold plants her two Burrows. Neither side sees the other's opener.
- **Clash 1:** your 4 Capguards and 8 Sporelings meet her 16 Sporelings. Slash does ×1.5 against light armor, which favors your Capguards.
- **Round 2's planning:**
  - **What you see:** her 16 Sporelings. She sees your Capguards.
  - **Your move:** a Scythecap Grove, since cleave suits a swarm.
  - **Her move:** she gets her income, plus 40 gold if she lost, and buys from her doctrine (Burrow 5, Gill Nest 2, and so on).
- **Clash 2:** if her doctrine picked a Gill Nest, its archers appear behind her Sporelings. That's the first thing you'll answer in round 3.

Clashes are big from round 1. Today each side has 4–7 supply on the field at 1:00 ([engagement review](../engagement-review.md)), and a round-1 clash is about 16 a side.

### How many rounds, and how long

- **A battle ends** when a Heartcap falls, or after round 9. At round 9, the side that has dealt more Heartcap damage in the battle wins by Decision, with half rewards as today.
- **Target:** a median of 6–8 rounds, with at most 15% of battles reaching round 9.
- **Time:**
  - **A round:** a clash takes about 25 s on the sim clock, and planning about 30 s at the table.
  - **A battle:** seven rounds take about 3 minutes on the sim clock and 6–8 minutes in all. That fits the spec's 6–8 minutes a battle and 25–35 minutes a run.
- **G4 has to change.** Its band, a median of 5:30–8:30 on the sim clock, can't be read as is, because planning isn't on the clock. The round version:
  - a median of 6–8 rounds;
  - at most 15% of battles reaching round 9;
  - at most 15% of clashes reaching the 45 s cap;
  - the reference bot winning 30–70% against the scripted general.

### The clash

- **Start:** both armies appear on the same tick, each squad in its slot ([The base](#the-base-buildings-supply-and-squads)). The two formations face each other with 6 tiles between their front ranks, so the first blows land within 2–5 s.
- **Rules:** today's, unchanged:
  - targeting and movement (§5.2);
  - attacks, the matrix and splash (§5.3);
  - merging (§5.6);
  - healing.
- **End:** a lane's clash ends when one side has no units left in it.
- **At 45 s:** the side with more surviving supply in the lane wins it, and its damage counts only the difference. A stalled clash still costs someone.
- **Lanes:** on Twin Roots each lane is its own clash, so both Heartcaps can take damage in the same round.
- **The commander power** is the one live verb. You fire it during the clash, at most once a clash: Spore Burst on the enemy's formation as it lands, or Puppet Bloom on your own.

### The aftermath

- **Damage:**
  - **Per lane:** 25 for each supply the winner has left in the lane.
  - **Merged units** count their own supply (twice the base for Bloomed, four times for Elder). So for the same power, a swarm of base units hits harder than a few merged ones, just as it holds more ground today (§4.3).
  - **Siege units** count double. That gives the Rootbreaker a job when there are no buildings to break.
- **Escalation:** from round 5, the Sporestorm raises round damage by 20% a round, up to ×2.0 at round 9.
- **A cap:** no round deals more than 500, a quarter of battle 1's enemy Heartcap, as Hearthstone caps its early rounds. No Heartcap falls in fewer than four lost rounds, so there's no cliff.
- **Heartcaps:**
  - **The general's:** today's numbers, 2,000 + 250 per battle (3,600 for the boss).
  - **Yours:** 3,000 for the whole run, as today.
- **What these numbers give:** say a side wins every round with 40% of its army left.
  - It deals 160 in round 1 and 400 in round 4, then reaches the cap.
  - Battle 1's general falls in round 6.

  These are starting points to tune on the full loop, not on the clash prototype.

## The base: buildings, supply and squads

### Squads instead of timers

**Each spawner fields one squad a round:** what it makes in a minute today, in whole batches, with halves rounded up. That keeps today's supply per gold, so the value check (§11.4) still holds. Spawn numbers are from `data/factions/velvet-bloom/buildings.json`.

| Building | Cost | Today | Squad | Supply |
|---|---|---|---|---|
| Sporeling Burrow | 110 | 2 every 16 s | 8 Sporelings | 8 |
| Capguard Hall | 150 | 1 every 15 s | 4 Capguards | 8 |
| Gill Archer Nest | 150 | 1 every 15 s | 4 Gill Archers | 8 |
| Rootbreaker Den | 200 | 1 every 20 s | 3 Rootbreakers | 9 |
| Scythecap Grove | 170 | 1 every 18 s | 3 Scythecaps | 6 |
| Hammercap Forge | 170 | 1 every 17 s | 4 Hammercaps | 8 |
| Veilstalker Hollow | 160 | 2 every 18 s | 6 Veilstalkers | 6 |
| Tender's Ring | 180 | 1 every 20 s | 3 Tenders | 3 |
| Amanita Lodge | 260 | 1 every 30 s | 2 Amanita Knights | 6 |
| Morel Warren | 130 | 2 every 18 s | 6 Morel Runners | 6 |
| Puffball Mortar | 160 | A tower | Itself, as an emplacement ([below](#the-formation-is-the-colony)) | – |
| Truffle Cellar, Spore Exchange, Rhizome Vault | | Economy and utility | Nothing | – |

- **Upgrades that change a spawn change the squad.** For example, the Burrow's level 3, "+1 Sporeling per spawn", makes its squad 12.
- **The supply cap stays at 60.**
  - A squad that doesn't fit doesn't field, and the planning screen says so.
  - At about 8 supply a squad, the cap binds at 7–8 spawners. That's about the eight plots in Bogwater's home zone.
- **Gold per body:**
  - **The numbers:** a Burrow's squad is 8 supply for 110 gold, and a Capguard Hall's or Gill Nest's is 8 for 150. So the swarm gets 36% more bodies per gold, or 28% at today's spawn rates, before the rounding above.
  - **Today and under rounds:** today the trickle and the cap offset that edge. In a clash nothing offsets it until the cap binds ([below](#todays-strong-builds-under-rounds)).
  - **The knob:** squad sizes are the obvious one.

### The formation is the colony

- **Your colony is still your home zone.** On Bogwater and Stumpfield its 4 columns by 8 rows hold eight 2×2 plots, and on Twin Roots it holds six per lane.
- **At the clash, squads take the colony's shape.**
  - **The box:** each squad appears in a formation box that copies your home zone's layout. The box is set in the middle of the lane.
  - **Slots:** a building's column sets its squad's rank, front or back, and its rows set the squad's file.
  - **The fiction:** the colony fruits at the front of the mat.
- **So placement is positioning:**
  - A Capguard Hall in front of a Gill Nest gives you archers behind a shield wall.
  - An economy building's plot is a hole in your line, so Cellars go at the back.
  - Terrain in the home zone would add holes and bonuses you didn't choose. Today's maps have none there ([below](#todays-systems-under-rounds)).

  This is step C's goal, positioning as a real skill, and it needs no forward plots.
- **The Mortar fields itself** as an emplacement in its slot. It can't move, it has the Mortar's HP and attack, and it's restored each round.
- **Buildings don't take part otherwise.** They can't be hit, and nothing is lost between rounds.
- **The general places by the same rule** ([The general](#the-general-7)).
- **Later:** colony-swarm's neighbor rules ("in front of", "behind", "beside") map straight onto the formation, and so does the parked part of step C.

### Merging

- **Today's rule applies** (§5.6): three identical units within 1.5 tiles, with no combat for 2 s, knit in 1 s.
- **Squads knit on the approach.** A squad starts idle and packed, so a Burrow's 8 Sporelings arrive as 2 Bloomed and 2 base. Archer fire cancels a knit near the front.
- **The toggle becomes a planning choice.** The screen can preview it: "fields as 2 Bloomed + 2".
- **Neighbors make Elders.** Two Burrows side by side field 16 Sporelings, enough for an Elder (9) if they stand within reach. Adjacency matters, with no new rule.
- **The risk:** P1c found that the Elder Sporeling's splash is worth 9–18 points to the swarm under waves, because waves doubled merges. Under rounds, merges will be common. So the prototype also measures with merging off, and with the Elder splash off.

## Today's systems under rounds

| System | Under rounds | What does its job |
|---|---|---|
| Spawn timers and besieged spawners (§4.4) | Gone | Squads, fielded fresh each round |
| Column capture (§4.3) | Gone | Heartcap damage shows who's winning. The round tally and both Heartcaps are the readout |
| Forward building and its price (§6.3) | Gone | The formation: which plot a building takes is the placement decision. F1, round 3's report that forward building isn't worth it, stops being a question |
| Rich Loam and stumps (§4.1, §11.9) | Out of play. Every loam tile on today's maps, and every one of Stumpfield's stumps, lies in contested ground. So for rounds, Stumpfield plays like Bogwater | Round maps would need terrain in the colony itself: colony-swarm's [terrain idea](colony-swarm.md#terrain-civilization-vi), with loam that feeds a Cellar or a stump that breaks a line |
| Comeback income (§6.2) | Becomes +40 gold to each round's loser | The same brake, once a round, like TFT's loss-streak gold |
| Hold (§5.2) | Gone | Every clash starts both whole armies at once, which is what Hold was for |
| Heartcap turrets (§4.5) | Gone | The per-round damage cap protects the loser. Rot Ward and the Pale Sovereign's passive need new effects |
| The Sporestorm (§6.4) | From round 5, round damage rises 20% a round, up to ×2.0 | It's still the stalemate breaker, now across rounds. The 45 s cap breaks a stall inside a clash |
| The 10:00 Decision (§6.5) | Round 9, decided by damage dealt | The same tiebreak, without columns |
| Heartcap HP (§4.5, §8.5) | Stays, as one pool for the run | Lost rounds chip it ([The run layer](#the-run-layer)) |
| The 60 s wave (§4.2) | The round | Drafts, interest, the storm and the counter cycle count rounds |

## The run layer

- **Income per round** (starting numbers):

  | Source | Per round | Today |
  |---|---|---|
  | Heartcap stipend | 100 | 96 a minute |
  | Each Truffle Cellar | +50, with loam's +50% as today | 48 a minute |
  | Interest | 1 per 20 gold banked at the end of planning, up to 10. Deep Cellars or a Spore Exchange add 10 to the cap, and the Exchange's trickle becomes +12 a round | Up to 10 a wave |
  | The last round's loser | +40 | Comeback income, up to 72 a minute |
- **What a battle pays:**
  - **Under rounds:** about one new spawner a round after the 300-gold opener, or 1,000–1,300 gold over 7 rounds.
  - **Today:** one `npm run sim` game (seed 3, `bot:balanced` against the Lichen Baron on Bogwater) earned 813 gold beyond its 300 opener, for 8 buildings, in a 5:06 rout.
- **Interest gets a moment.** You plan with your gold in front of you ("bank 140 for +7"), which is clearer than today's tick at each wave.
  - Both round 3 testers found interest and the Spore Exchange confusing ([colony-swarm](colony-swarm.md#what-it-could-simplify)).
  - TFT shows that the choice between banking and spending can carry a game.
- **Drafts:**
  - **When:** after rounds 2, 4 and 6, in the next planning phase. That's three a battle, not four.
  - **What stays:** the cards, rerolls and skip gold.
  - **Step B:** its deploy draft fits round 1's planning, and its finding still holds: a bigger draft has to mean more picks ([step B](one-more-run-review.md#step-b-results-2026-10-30)).
- **Selling:** you get 100% back for a building planted in this planning phase (today's deploy rule), and 60% once it has fielded. Selling is how you pivot.
- **Relics, upgrades and commanders:** the ones that change stats carry over unchanged. These need new effects, since their system is gone:
  - capture speed: Quick Roots, Root Pressure and the Rootgate;
  - the forward price: Forward Spores;
  - spawn timing: Fresh Spores, Mycorrhizal Link (perhaps +1 unit in each neighbor's squad) and Vesper's passive;
  - turrets: Rot Ward;
  - the storm's timing: Rot-Eater;
  - columns: Armilla's passive and her power, Rhizome Tithe.
- **The run's Heartcap:** you'll lose some rounds even in battles you win, so repairs become real choices: a rout win's +10%, a Grove's +30%, Mending Moss.
  - A lost battle ends the run only if your Heartcap reaches 0.
  - That's the [engagement review](../engagement-review.md#recommendations-highest-impact-first)'s recommendation 2, a loss that costs HP instead of the run.
  - It also answers step B's finding that runs are lost in battle 1 (33% of runs today).
- **The route, nodes, rewards, events and intel bars** don't change.

## Scouting: what you see before you deploy

- **The rule: both sides commit at the same moment, on last round's information.**
  - In planning you see the general's colony and the army it fielded last round, and it sees yours.
  - What it plants this round shows when the clash starts.

  This is Mechabellum's rule, and it keeps §7.1's general honest: both sides have the same information.
- **In the sim:** the general plans at the start of the planning phase, from the state the last clash left. It can't read what you plant now.
- **Round 1:** both sides plant blind, as in today's deploy. The route map already shows the general, and its opener follows its doctrine and your intel file.
- **On the planning screen:**
  - the general's last army, by unit type and squad, each marked strong or weak against yours by the matrix (the hit-spark classes, §5.3);
  - any counter warning, with its kind and the rounds to go (§7.4);
  - its income, which is public, since it plays by your rules.
- **After the clash:** the report says what killed what. Damage by building is already recorded (§5.7).
- **Why not show everything:** there are two ways to get it wrong:
  - If you saw its purchases first, you'd always counter last, and its counter cycle could never land.
  - If you saw nothing, as in the asynchronous games, counters wouldn't be readable.

  Last round's army sits between them.
- **A spec line to reword:** §17 #9 rules out hidden information beyond the telegraph. The only thing hidden here is the other side's move in the same pause, so that line needs rewording, not dropping.

## The general (§7)

- **Planning AI:**
  1. At the start of planning, it takes its income.
  2. It applies any doctrine change that's due.
  3. It buys in a loop until its target is out of reach. Each pick is §7.2's weighted pick, with the situational multipliers keyed to rounds:
     - economy ×1.5 before round 3 and ×0.3 from round 6;
     - towers ×2 after a lost round.

  One new knob: how much it banks for interest.
- **Placement:**
  - **What changes:** §7.3's depth and threat terms go, and a formation score replaces them: melee spawners in front, ranged spawners and Mortars behind, economy at the back.
  - **How simple:** a short greedy rule should do, as Hivemind's AI shows ([colony-swarm](colony-swarm.md#the-hivemind-prototype)).
- **Lanes:**
  - **The rule:** on Twin Roots, it picks a lane for each building. A starting rule: send the next spawner to the lane where it lost the most last round.
  - **Why it's open:** Twin Roots is where mono Sporeling escaped its answers in P0, because `bot:balanced` splits.
- **Counter cycle (§7.4):**
  - **Schedule:** analysis after rounds 2 and 5, with the warning at once, and the counter active from rounds 4 and 7. That's two rounds of warning, as today's two waves. The boss analyzes after round 1 and acts from round 3.
  - **Input:** the analysis reads the squads you actually fielded, which is simpler and exact. Today it estimates them from spawn rates and merged fractions.
  - **Activation:** as today. The counter set's weights go ×3 and the rest ×0.6, and it sells up to 2 buildings for room.
- **What the counter matrix adds:** [P0's answers](../balance-backlog.md#counter-matrix-on-todays-rules-2026-10-30) say what each counter kind should build:

  | Against | Build |
  |---|---|
  | Archers | Sporelings |
  | Sporelings | Capguards or Amanita Knights |
  | Amanita Knights | Hammercaps |
  | Morel Runners | Veilstalkers |

  Under rounds, the counter sets can come straight from the clash matrix.
- **Counters become moments.** An activated counter appears as new buildings in the general's colony at the next clash. That's the visible doctrine wave the engagement review asked for (its recommendation 6).
- **Honest AI (§7.1):** the general has the same gold, rules and information as the player. It still gets no active power (§17 #13).

## The rework's pieces under rounds

| Piece | Under rounds | Verdict |
|---|---|---|
| Waves on a shared clock | A round is the whole army in one wave, and nothing carries over | Not needed |
| Hold | Nothing trickles, so there's nothing to group | Not needed |
| Call for help | Its job was buildings shot with no answer. Buildings aren't in the clash, and units already fight what's near them | Not needed |
| Pinning (×0.35 attack rate in contact) | Melee that reaches the back rank should count | Keep |
| Spore clouds | Both armies start packed in formation, which is what clouds punish. P1b's densest-cluster aim fits. The Mortar needs its emplacement form to join the clash | Keep; likely more important |
| Cleave (Scythecap) | Swarms surround their targets, so cleave hits many | Keep; cheap |
| The Burster | Area damage that travels with the army. Under waves it helps against the runners, but the swarm's answers are two-building armies that win on mixed-wave shields and don't build it. Its bursts stalled battles into Decisions. A clash can't stall past 45 s, but the cap share needs watching | Keep |
| The Rhizomorph | Every clash has a back rank to reach, as TFT's assassins and Mechabellum's flyers do. P1's problem, surfacing beside spawners under the turrets, can't happen, because neither is in the clash | Keep; its job is clearer |
| Mixed-wave shields | Under waves they're what passes the strict bar: without them, mono Sporeling's best answer falls from 85% to 47%. Rounds give a mixed army another edge, information, so measure with and without | Optional |
| Flyers (approved, after P2) | Mechabellum's air and ground axis suits rounds | Later |

## Today's strong builds under rounds

### What changes in how armies meet

The diagnosis's [three causes](combat-rework.md#three-causes), under rounds:
- **The trickle goes, by construction.** Both whole armies start at once. That was the first cause, and the one that sank every fix that kept the continuous lane.
- **Out of reach goes too.** Buildings aren't in the clash, so archers can't besiege spawners from beyond melee aggro range. They shoot the army in front of them.
- **The pile-up goes.** Survivors don't carry over, so a won clash buys damage, not a bigger army next round. Level 2 kept that snowball ("survivors still carry over from wave to wave").
- **Scale gets stronger.** Every unit fights from the first seconds, so the square law applies to the whole army. The 60-supply duel margins (remaining supply, last measured on 2026-10-27) become clash margins:
  - Sporelings beat archers by +8;
  - archers beat Capguards by +39 and Rootbreakers by +46;
  - Capguards beat Sporelings by +40.
- **Clumps are guaranteed.** Both armies start packed. That's what area damage punishes, and ours is token: the Mortar deals 18 to an archer every 3 s.

### At equal gold, the triangle tilts toward the swarm

The margins above are for equal supply. Below the cap, armies are equal in gold instead, and the Burrow's squads carry 36% more supply. Here is a rough square-law reading (strength ∝ quality × bodies²). The 30-supply margins give the same picture.

| Matchup | At equal supply (60 each) | At equal gold, below the cap |
|---|---|---|
| Sporelings against archers | Sporelings by +8, near even | Sporelings, about 1.9× as strong |
| Archers against Capguards | Archers by +39 | Archers, about 1.7× |
| Capguards against Sporelings | Capguards by +40 | About even |

- **The swarm has no clean answer in the triangle** until the cap binds, at around round 6–7. That's P0's finding again: mono Sporeling is the build without a reliable answer.
- **At the cap,** strength per supply decides, and the Sporeling has less than the Capguard: 25 against 28, by §11.4's measure on today's data. Merging into Elders is how Sporelings beat that.
- **P1b points the same way.** Its beat sweep found that longer beats feed swarms: at a 30 s beat, mono Sporeling won 98% against `bot:balanced`. A round is the longest beat there is.
  - **What's different:** nothing carries over, and both armies are complete.
  - **What it means:** watch the swarm first.
- **So answers have to come from beyond the triangle:**
  - area damage: the Burster, spore clouds, cleave;
  - the Elder splash, trimmed;
  - or smaller Burrow squads.

### The builds

- **Mono Gill Nest (archers):**
  - **Its weakness:** a pure ranged army has no front line, so any melee mass reaches it. P0's Sporeling-led answers already win 80–88%, and at equal gold the swarm's edge grows.
  - **Under rounds:** it should be answered.
  - **The catch:** at the cap its margin is the triangle's smallest (+8), so one archer upgrade could flip late rounds. Pinning and the Rhizomorph widen the margin.
- **Mono Sporeling (swarm):** rounds give it what Hold gave it, arriving together, plus a gold edge that peaks in the middle rounds. Expect it to be the hard case again. Level 2's answers are the likely ones: two-building armies such as Sporeling + Veilstalker. Under waves those win on mixed-wave shields, so the prototype measures them with and without.
- **`bot:balanced` against committed builds:**
  - **The problem:** a fixed mix splits its strength, and the square law punishes splitting.
  - **Where a mix wins:** where its parts protect each other. Capguards in front soaking fire while archers shoot from behind is the one combined-arms effect that a formation creates.
  - **Against mono archers:** its Capguards and Rootbreakers are archer food (+39, +46), and its Sporelings are too few. It should still lose.
  - **Against mono Sporeling:** its Capguard front, with archers and Scythecaps behind it, might hold below the cap. That's the open question.
  - **Prediction:** G3 on clashes still fails on mono archers, and probably on mono Sporeling, unless the area-damage and back-line pieces are on.
- **G3 asks something different under rounds.**
  - **Committed builds can be answered.** A committed build is visible after round 1 and can be answered in round 2, while a mono build can't change without leaving mono. A fixed-weight reference bot can't make that answer, so G3 measures the worst case.
  - **The counter matrix becomes the main bar,** since its answers can actually be played within a battle.
- **Twin Roots:**
  - **Lanes:** each lane is its own clash. With scouting, lane choice becomes a guessing game: concentrate to win one lane big, or split to contest both. The square law rewards concentration in the lane it picks, and damage is per lane, so both sides can score in one round.
  - **The swarm there:** today mono Sporeling escapes its answers on Twin Roots, because `bot:balanced` splits. Under rounds the swarm's lane is visible after a round, and the answer can go there.

## The cost

### In `src/sim` (4,938 lines)

| | Files | Lines | What happens |
|---|---|---|---|
| **Carries over** | `systems/combat.ts`, `targeting.ts`, `movement.ts`, `merging.ts`, `healing.ts`; `hits.ts`, `targets.ts`, `spatial.ts`, `effects.ts` | 1,250 | Unchanged, apart from dropping the Hold branch in movement and the turret code in combat |
| **Carries over** | The unit data and damage matrix, `rng.ts`, `hash.ts` | | Unchanged |
| **Rewritten** | `step.ts`; `systems/spawning.ts`, `territory.ts`, `stance.ts`, `economy.ts`, `victory.ts` | 412 | Planning, clash and aftermath phases; squads; income by round; how a clash and a battle end |
| **Rewritten** | `ai/controller.ts`, `ai/counter.ts` | 577 | A buying loop for planning, formation placement, a schedule in rounds |
| **Reworked** | `draft.ts`, `powers.ts`, `placement.ts` | 553 | Draft points and cooldowns in rounds; placement without columns |
| **Extended** | `state.ts`, `create.ts`, `compile.ts`, `commands.ts`, `src/data/schema.ts` | | Phases, squads and round results; commands per planning phase |

**The supply duel is already a clash.** `supplyDuel` in `tools/lib/balance.ts` puts two armies on `test-flat` with no turrets, no territory and no Heartcap targets, and fights them to the death. The prototype generalizes it.

### UI and run pacing

- **The planning screen:**
  - **What exists:** it's today's deploy phase, every round, and placing while paused already works.
  - **What's new:** the general's last army, the formation preview, the matchup marks, the round tally and both Heartcaps.
- **The clash:** the renderer draws it as today. The aftermath needs a short animation.
- **Leaving the screen:** the front line and capture progress, Hold's buttons and rally lines, the forward price on the ghost, the besieged marks, and the help and tooltips that explain them. The report's front-line graph becomes a chart by round.
- **The run (`src/run`, 1,366 lines):** almost unchanged, since a battle still returns an outcome and a Heartcap. Saving gets simpler: save between rounds.
- **Tools:**
  - Every golden hash changes.
  - G2's supply duels stay. G1 and G3–G8 need round versions.
  - The engagement checks (first flip, Heartcap fall time) give way to round measures.
- **Run pacing:** 6–8 rounds × 4–5 battles is about 30 clashes and planning phases a run. The 25–35 minute run holds if planning averages about 30 s.
- **Maps:** today's three would need terrain in the home zones to stay different, since all their loam and stumps lie in contested ground. Rounds don't need 24 contested columns, so maps could shrink at the same time.
- **M6 and M7 content** (strains, traits, the Gray Rot) would be written against the round model.

### Size

This is a real rewrite of the battle loop, the AI, the economy, the HUD and the guardrails, on top of combat that stays. It's several sessions on a `feature/rounds` branch, then the dev site for a playtest. It can't be a `?proto=` knob, because the loop itself is different.

## Identity

The design review warned against competing head-on with Mechabellum and 9 Kings. Here's what would keep this game its own:

| | Mechabellum | 9 Kings | Spore & Sprawl with rounds |
|---|---|---|---|
| The opponent | Another player | A fixed deck for each enemy king | One general that reads your army, warns you, and remembers you across the run |
| The army | Units bought and placed anywhere in a zone | Cards on a small grid of plots | A colony, in which each building fields a squad |
| Positioning | Units placed freely | Which plot a card goes on | The colony's layout is the formation. Economy leaves holes, and terrain in the colony could shape it |
| Getting stronger | Levels and tech, bought with supply | Plot levels and enchantments | Three become one on the field, and neighbors make Elders |
| HP | Per match | Three lives a run | One Heartcap for the run |
| The field | Both sides attack | You defend | Both sides attack, in lanes. Twin Roots splits the clash |

- **The theme carries the tools:** spore clouds, burrowing Rhizomorphs, Bursters and the Sporestorm.
- **The risk to watch:** the battle loses its live verbs, placing while it runs and Hold. Only the commander power stays live. That's the most Mechabellum-like part of the design, and a question for the playtest.

## The smallest clash prototype

### What it is

A headless check, `npm run experiment -- --checks clash`, with no change to the sim's rules:
1. **Armies from build lists:**
   - **The build list:** take any bot spec the counter check uses: mono bots, the pairs, `bot:balanced` and the hand-written answers. Use its opener, then its weighted picks with the seed's AI stream, until a gold budget is spent.
   - **The budget** counts army buildings only, since a single clash can't value economy. Economy picks are skipped.
   - **The army:** each spawner adds its squad ([the table](#squads-instead-of-timers)), and `--squad-seconds` changes the minute. A Mortar adds an emplacement.
   - **Limits:** 60 supply, and no more buildings than the home zone holds: 8 plots on the one-lane maps, 6 per lane on Twin Roots.
2. **Formation by role.** Melee squads form the front rank. Ranged squads and emplacements stand 2 tiles behind, with files spread over the lane's rows. Formation by building slot is a later variant.
3. **Deploy and fight.** Both armies appear on the same tick, front ranks 6 tiles apart, on a flat field with the map's lanes. This is `supplyDuel`'s setup, with merging on. The clash runs until one side is gone in every lane, or 45 s pass.
4. **Record:**
   - the winner of each lane;
   - surviving supply;
   - clash length, and whether it hit the cap;
   - merges.

**The maps reduce to two fields.** Units ignore stumps, so Bogwater and Stumpfield give the same clash: one lane of 8 rows. Twin Roots is two lanes of 6 rows, with each side's buildings split between them by a lane rule (alternating, to start). G3's mean still averages the three run maps, so the one-lane field counts twice.

### What it measures, and the bars

- **The counter matrix on clashes:** P0's `evaluateCounters`, with a clash row in place of `g3Row`. The same builds are tested against the same 74 answers, with the same screen and confirmation.
- **G3 on clashes:** each mono army against `bot:balanced`'s, at the same budget.
- **Five budgets:** 300, 600, 900, 1,200 and 1,500 gold of army, about rounds 1, 3, 5, 7 and 9. The square law's effect grows with army size, and the cap binds near the top, so the report shows each budget beside the pooled result. A build that dominates only early or only late shows up there.
- **Seeds** vary the positions' jitter and the bots' picks. Use 20 per seat for screens and 50 for any number quoted, as G3 does.

| Bar | To pass |
|---|---|
| **The strict counter bar** | Every mono build with a clash G3 mean above 40% has an answer that wins at least 60% on every map, pooled over the budgets |
| **G3** | Each mono army against `bot:balanced` has a mean over the maps of at most 55% and a worst map of at most 60%, pooled over the budgets |
| **Stalls** | At most 15% of clashes reach the 45 s cap, the round version of G4's Decision limit |

### Variants

- **Today's combat alone:** the baseline, and the test of the diagnosis.
- **Merging:** merging off, then only the Elder Sporeling's splash off.
- **Squads:**
  - squad minutes of 45, 60 and 75 s, which set how gold turns into bodies;
  - the Burrow's squad at 6 and 7, the direct lever on the swarm's gold edge.
- **The rework's pieces** from `feature/combat-rework`, alone and together:
  - pinning;
  - spore clouds, through the Mortar emplacement;
  - the Burster;
  - cleave;
  - the Rhizomorph.

  A shield for mixed armies comes last, to see whether rounds need it. Under waves it's what passes the strict bar.
- **Formation by building slot,** once formation by role reads clearly.

### Cost

- **To build:** a tool of a couple of hundred lines, plus a clash row in `tools/lib/balance.ts`. It uses `createBattle`, `addUnit`, `addBuilding` and `runHeadless`, as the duels do. One session.
- **To run:**
  - **One clash:** 400–900 ticks with up to 120 units, which I estimate at 10–30 ms.
  - **The full check:** P0's full check at five budgets is about 155,000 clashes. That's under an hour on one thread, or about 10 minutes on 6 workers (`tools/lib/pool.ts`).
  - **A narrow run:** about a minute.

### What it won't tell us

- **The economy, the scouting loop and the general** need the round loop.
- **Whether rounds feel better** needs a playtest.
- **The next step after a pass:** a round loop in the same tool.
  - It chains clashes, with gold by round and one of two policies: fixed weights, or "buy the answer to what you saw".
  - If counters keep cycling and no build takes over, build the full loop on a branch.

## Recommendation

- **Build the clash prototype now, before more Level 2 tuning.** Branch from `feature/combat-rework` so its pieces can be switched on. It's a tool, one session's work, and it changes no rules.
- **Read it on today's combat first.** That tests the rework's diagnosis directly:
  - If `bot:balanced` holds in whole-army clashes, the problem really is how armies meet, and rounds are a strong fallback.
  - If it doesn't hold, changing how armies meet isn't enough on its own. Neither waves nor rounds will pass G3 without changes to combat: more area damage, different margins in the triangle, or a reward for mixing. That work comes next, whichever level wins.
- **Then turn the pieces on,** to find the smallest set that passes the strict bar and G3 on clashes. That set is the round design's roster.
- **Only then build the round loop,** on its own branch, with this doc's numbers as starting points.
- **Why rounds are worth the hedge:**
  - **No stalls:** every clash ends, which removes G4's Decision problem by construction.
  - **No pile-up:** survivors never carry over.

  Level 2 can't do either while its answers win by holding ground.

## Open questions for the user

1. **The prototype:** build it now, from `feature/combat-rework`, before more Level 2 tuning?
2. **Territory:** drop the column tug-of-war under rounds? Then the colony is the formation and Heartcap damage is the score, but today's maps lose their loam and stumps until they get terrain in the home zone. The alternative keeps a front that moves one column per won clash, as build space.
3. **The run's Heartcap:** make it one pool for the run, so a lost battle costs HP and ends the run only if the Heartcap reaches 0?
4. **Scouting:**
   - (a) both sides commit on last round's information, as in Mechabellum; or
   - (b) the general's purchases are shown before you commit.
5. **Damage:** use these starting numbers, or play out the survivors' attack on the Heartcap instead?
   - 25 per surviving supply;
   - siege units count double;
   - at most 500 a round;
   - the storm from round 5.
6. **Merging:** squads would knit at the start of a clash under today's rule, so the toggle becomes a planning choice. Is that still "three become one"?
7. **Live verbs:** only the commander power stays live during a clash. Is losing live placement and Hold acceptable?
8. **G3 under rounds:** keep `bot:balanced` as the reference, with the counter matrix as the main bar?
