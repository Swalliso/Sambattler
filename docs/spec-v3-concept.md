# Spore & Sprawl v3: the concept

**Status:** step B of the v3 plan in [design-brief.md](design-brief.md). It's docs only: no code, data, rule or test changed. Written on 2026-11-04 against `develop` at `acbeefd`, from the audit's decisions ([spec-v3-audit.md](spec-v3-audit.md), section 5: the user took all 13 on 2026-11-04). It's only as big as the prototype needs. SPEC v3 comes after the prototype passes. The prototype's plan is [v3-proto-plan.md](v3-proto-plan.md), and its tasks are [tasks/v3-prototype.md](tasks/v3-prototype.md).

**One question before the prototype builds:** under V3-Q3's timing as decided, round 2's clash replays round 1's (section 3.2). The plan's open question 1 asks which timing to build first.

"First guess" marks a number nobody has measured yet. The prototype's checks set those numbers.

## 1. The core loop

> Each round, without seeing what the rival plants this round, you split your gold three ways: an answer that fruits in time for what you predict it will field, pressure that lands before its economy pays, and growth that outscales later. Then you choose where each one grows, because its neighbours change what its squad does. (the audit, section 4)

A round from round 2 on. It follows v2's order (§4.7), and the changes are in bold:
1. **Income lands:** the stipend, economy, interest and comeback gold, as in v2 (§6.2).
2. **The general plans first** (§7.2). It plants, **buys plots** and sets its merge toggles. **You don't see what it plants or which plots it buys this round.** You do see:
   - its base;
   - the sprouts it planted last round, which fruit in this clash;
   - its gold and income;
   - its doctrine.
3. **You plan:** plant, sell, **buy plots**, set merge toggles and bank. **What you plant is a sprout until the next clash.**
4. **Begin.** Both plans lock, and **the general's plantings appear as sprouts.**
5. **The clash:** each fruited building fields its squad in formation, and sprouts field nothing. **Combos change what squads do.** The rest is v2's: the muster, the 45 s limit, scoring, the 750 cap and the Sporestorm.
6. **The aftermath** drains the Heartcaps. Only the Heartcaps, the colony and gold carry into the next round, and every squad fields fresh (V3-Q8).

What this buys: the clash you're about to watch is always fully in view, since nothing hidden fights in it. What's hidden is the next clash. You never lose a clash to something you couldn't see, but to win the next one you have to predict it.

## 2. A battle, walked through

This is illustrative: SPEC v2's costs, the prototype's first guesses, and outcomes I expect, not measured ones. It uses the timing the plan recommends (open question 1): every building fruits a round after it's planted, so round 1 has no clash. Under the timing as decided, the openers would fight in round 1 too, and round 2's clash would replay that fight.

You play Vesper on Bogwater Hollow: one lane, 8 plots in two ranks of four, a loam plot at the back, and four closed plots behind them for sale. You face Old Mother Mold, the rusher. Your Heartcap has 3000, hers 2000.

**Round 1: rush or greed.** Both sides have 300. Mold plans first, and round 1 keeps the full reveal: two Sporeling Burrows in her front rank, 80 gold banked. That's a rush, 16 Sporelings and no Cellar. You can open three ways:
- rush back with two Burrows of your own (220);
- answer her with a Burster Pod and a Capguard Hall (280), the swarm's counters;
- greed: a Truffle Cellar on your loam plot (150, then +75 a round) and one Burster Pod (130) to blunt her.

You take greed. You'll probably lose the first clash, but the cap limits that to 750 of your 3000, and from round 2 you out-earn her by 75 a round. At Begin, both openers sprout.

**Round 2: the first read.** You have 197 and Mold has 198. She plans first, and from now on you don't see what she plants. Her tells:
- she's the rusher;
- she has 198 to spend and no Cellar;
- her Intent panel shows no counter yet.

So you read more swarm: a third Burrow (110), fruiting in clash 3.

You plant a second Burster Pod beside your first. As you hover it, a hypha lights between the two Pods with Chain Burst's icon: a burst sets off every one of your Bursters within 1.5 tiles. It fruits in clash 3, the same clash as her new Burrow.

At Begin her sprout appears: a third Burrow, as you read. Clash 2 is the openers' fight, with both formations in view: her 16 Sporelings against your 6 Bursters. Her swarm wins it.

**Round 3: in time.** Before you plan, you can see clash 3 exactly: her 24 Sporelings, knitting at ×2.0, against your 12 Bursters in two linked Pods. Your Cellar has now paid twice, and losing the round paid you +40. You buy your first back plot (100, a first guess) and bank the rest for interest: your greed buys room.

In the clash, her swarm reaches your front and the first Burster bursts. The chain sets off all twelve at once, the swarm breaks, and you win the clash. Had you waited to see her sprout before planting the second Pod, it would have fruited in clash 4, and clash 3 would have been hers too. A counter planted in reaction costs a capped round, not the battle.

**Round 4: her answer, read.** Mold's counter cycle (§7.4) has read the Bursters you fielded, and her Intent panel says so: she's answering light armour with slash. In her kit that means more Sporelings or a Capguard Hall. Your Pods handle Sporelings. Capguards are the threat, since their medium armour shrugs off the Bursters' crush. So you plant a Gill Archer Nest on your new back plot: pierce cuts medium armour, and the Nest fruits in clash 5, the same clash as anything she plants now.

**Round 5: the war you built.** Her answer fruits into a Burster chain and archer fire. You've taken clashes 3 to 5, and her Heartcap falls three clashes after she won the first.

The battle held:
- a rush-or-greed choice in round 1;
- two reads made before the threat could be seen (rounds 2 and 4);
- a combo planted on purpose;
- a swing: the side that won the first clash lost the battle.

In v2, you'd have seen her third Burrow and her answer as you planned, and answered each in the same clash.

## 3. The rules the prototype changes from v2

These rules apply only behind the preview switch (`rules=v3`, the plan's Scope). v2's battle on `develop` keeps its rules and its goldens.

### 3.1 Hidden plantings (V3-Q2) · v2: §1.3 #3, §4.7 steps 8–9, §7.5

- **Hidden:** from round 2, while you plan, the plantings the general made this round and the plots it bought this round. They appear at Begin, as sprouts.
- **In view:**
  - its colony as it stands: fruited buildings, plus last round's sprouts, which fruit in this clash;
  - its sales and its merge toggles, which act at once, as in v2;
  - its gold at the start of its turn (first guess, the plan's question 2) and its income rows;
  - its doctrine in the Intent panel.
- **Round 1 keeps the full reveal:** its opener is in view, so the opener is a plan, not a gamble (F18).
- **The preview stays exact.** A sprout fields nothing until the next clash, so the formation preview of the clash you're about to watch shows everything that fights in it.
- **In the sim,** the general already plans first and never reads your plan this round. The change is in what the player sees, plus one rule: a bot that plans after the general (`bot:answer`, the opener bots) reads the same hidden view.
- **It builds on `reveal=last`** (§7.5, §15.6) and closes S19's four gaps ([reveal-last-fielded.md](ideas/reveal-last-fielded.md)).

### 3.2 Fruiting (V3-Q3) · v2: §4.7 steps 11–13, §4.6

- **As decided:** a building planted from round 2 fields its squad from the next clash. Until then it's a sprout, with a timer on its plot and in the formation preview, and `formationOf` leaves its slot empty.
- Round 1's opener fields at once.
- Economy pays as now, from the next round's income.
- A building sold and replanted sprouts again, so a pivot costs a round as well as 40% of the price (§4.4).

**Found while writing this: round 2's clash replays round 1's.**
- Nothing planted in round 2 fields until clash 3, so clash 2 has clash 1's armies.
- R2a's sim replays an unchanged round exactly, unless a side sells, toggles a merge or fires its power at another moment.
- So the opener's result counts twice: a greedy opener loses two rounds to a rush, and you watch the same fight twice.

**Recommendation:** every building fruits a round after it's planted, the opener too, and round 1 has no clash. Both openers sprout in view, and the first fight is round 2's. **Why:**
- It keeps every reason V3-Q2 and V3-Q3 gave: the opener is in view, a predicted counter is in time, and a reactive one is a round late.
- It's one rule with no exception.
- The first decision still comes at once: round 1's planting.

The plan builds the timing as data (`fruitFromRound`: 1 as recommended, 2 as decided), so either one plays, and the user picks the default before S1 (open question 1).

### 3.3 Plots bought with gold (V3-Q5) · v2: §4.6 (sprawl), §6.1 (upgrades)

- **Buying a plot:** in planning, a side may buy the next closed plot of its colony, in sprawl's open order (§4.6): files 2, 3, 1 and then 4 of the third rank, or on Twin Roots files 2, 1 and 3, alternating lanes. It can buy up to 4 more plots.
- **The price:** 100, 150, 200 and then 250 (first guess). It's one of V3-Q9's levers.
- **A bought plot** opens at once, and a building planted on it sprouts like any other. The general's purchases are part of its hidden plan.
- **The gold upgrade is gone** (§6.1, R2b's S5b): the `upgrade` command is refused, and no side buys one.
- **The general and the bots buy plots** by their personality: the greedy one early, the rusher once its front is full.
- **Runs:** a single battle has no sprawl. In a run, whether bought plots replace sprawl's +1 per battle won is SPEC v3's call.

### 3.4 Four combos (V3-Q7) · v2: §11.14 (R3's, not built)

Positions are §11.14's: in front of, behind and beside, never at a corner and never across lanes. A combo is active in a clash once both its buildings are planted and every spawner in it has fruited. A squad gets each combo's effect once.

| Combo | Buildings and position | What changes |
|---|---|---|
| **Shield Wall** | Gill Archer Nest behind Capguard Hall | Its Gill Archers aren't pinned (§5.3), so melee that reaches them doesn't slow their fire |
| **Spotted Screen** | Amanita Lodge in front of any spawner | Enemy ranged units shoot an Amanita Knight first while one is in range |
| **Chain Burst** | Burster Pod beside Burster Pod | A burst sets off every one of your Bursters within 1.5 tiles |
| **Truffle Hunters** | Sporeling Burrow beside Truffle Cellar | Each of its Sporelings that dies drops 2 gold, credited as gold from the clash (§6.2) |

- **Each combo shows before you place:** the ghost lights the partner and the combo's icon, and planted combos are joined by a hypha (§10.4). Both colonies' combos are drawn, the general's included, so its combos are tells.
- **The general's placement scores combos,** as §7.3's combo term.

### 3.5 Merging at ×2.0 (V3-Q10) · v2: §5.5, `tierStatMult` 2.8

`tierStatMult` is 2.0 under v3: a Bloomed unit has ×2.0 its parts' stats and an Elder ×4.0, matching their supply. This is S14's measure: G7's mirror reads 60%, and 34% against Slayers ([balance-backlog.md](balance-backlog.md)). Merging's rule and the toggle don't change (§5.6).

### 3.6 The general's tells, openers and prediction (V3-Q11) · v2: §7.2–§7.5, §7.7, §11.11

- **Tells:** what 3.1 leaves in view, plus its personality, named when the battle opens. In a run, its kit on the route node and its intel file add to them, but neither is in the prototype.
- **Openers:** each general has a rush opener (spawners only) and a greed opener (a Cellar, then plots), and its personality sets the odds. It draws one from its own stream, as R2b's S7 draws openers. In a run, the intel file would weigh in too.
- **Prediction:** it reads your sprouts as well as what you fielded. Its counter cycle (§7.4) counts your sprouts, and the counter-builder answers them every round.

## 4. The generals and the roster

**The roster** is the six core archetypes and the Truffle Cellar (§11.2), for both sides. There are no copies, and v2's limit of 3 Cellars applies.

| Building | Cost | Squad | Strong against | Combos |
|---|---|---|---|---|
| Sporeling Burrow | 110 | 8 Sporelings: light, slash, swarm | light units; archers (the swarm tag) | Truffle Hunters |
| Capguard Hall | 150 | 3 Capguards: medium, slash | light units: swarms, archers, Bursters | Shield Wall (in front) |
| Gill Archer Nest | 150 | 4 Gill Archers: light, pierce, ranged | medium units: Capguards, Hammercaps | Shield Wall (behind) |
| Amanita Lodge | 260 | 2 Amanita Knights: heavy, slash | light units; it draws fire | Spotted Screen |
| Hammercap Forge | 170 | 4 Hammercaps: medium, crush | heavy units: Amanita Knights | none |
| Burster Pod | 130 | 6 Bursters: light, crush, area burst | crowds, and heavy units | Chain Burst |
| Truffle Cellar | 150 | none: +50 gold a round, +75 on loam | none | Truffle Hunters |

**The three generals** are first guesses. S6 sets them as data, and S7 and S8 measure them. Each plays the whole roster.

| General | Personality | Rush opener | Greed opener | Its tells |
|---|---|---|---|---|
| **Old Mother Mold** | The rusher. She draws rush 2 battles in 3, plants spawners in front and banks little. She buys plots only once her front is full | Two Sporeling Burrows (220), her v2 first opener | A Burrow and a Cellar on loam (260), her softened battle-1 opener (R2-Q13) | A low bank and no second Cellar; Burrows and Pods in her front rank |
| **The Lichen Baron** | The greedy one. He draws greed 2 battles in 3, banks toward the interest cap and buys plots early, then spends in a spike | A Hammercap Forge and a Burrow (280) | A Capguard Hall and a Cellar on loam (300), his v2 opener | A Cellar on loam, a bank near 300 and plots bought, behind a quiet front. Then the spike: an Amanita Lodge in front of a spawner, for Spotted Screen |
| **The Blightwright** | The counter-builder. It draws either opener evenly and keeps a reserve. From round 2 it answers your sprouts with the counter set the matrix names (§7.4) | A Gill Archer Nest and a Burrow (260) | A Gill Archer Nest and a Cellar (300) | A bank kept high, and an Intent panel naming the kind it's answering. Its answer to your sprouts fruits a round later, so you can plant the answer to its answer |

v2's Blightwright opened with a Rootbreaker Den, which isn't in the prototype's roster.

## 5. What's cut or paused from v2

**Cut under `rules=v3`.** v2's game on `develop` keeps these until SPEC v3:
- the full reveal from round 2 (§7.5);
- fielding in the clash a building is planted for (§4.7);
- the gold upgrade (§6.1);
- merging at ×2.8 (§5.5).

**Not in the prototype.** These are paused, and v2's game keeps them:
- the run: the route, lives, the Grove, spoils, saves and sprawl (§8, §4.6);
- drafts and relics (§8.3, §11.7);
- commanders other than Vesper (§11.10), and the intel file (§7.6);
- R3's kit, copies, augments and run packs (§8.10, §11.13, §11.15), and §11.14's other three combos: Sundering Volley, Hunting Pack and Anvil;
- every building outside the roster, and the maps other than Bogwater Hollow and Twin Roots;
- the guardrail changes in V3-Q13, which wait for SPEC v3;
- M6–M8 and R4b.

**Unchanged:**
- the round loop's skeleton;
- combat and the damage matrix;
- the colony as the formation;
- the Heartcap race with its 750 cap and the Sporestorm;
- the deterministic sim and the headless tools.

## 6. After the prototype passes (an outline)

- **SPEC v3** writes down the adopted rules, and the preview switch goes: v3 becomes the default, and v2's paths and goldens retire.
- **Archetypes with deliberately broken engines** (pillar 5):
  - each archetype gets an engine of two or three parts that multiplies once it's assembled, such as Truffle Hunters paying for a Burrow line, or Chain Burst with a building that reseeds Bursters;
  - they're rule-benders, not percentages;
  - they're measured by build variety (V3-Q13), not by single-building ceilings.
- **Keystones** (the review's #5): three big picks a run, after battle 1, after battle 3 and before the boss. Each bends a rule, and together they take the place of the in-battle relics. Drafts become fewer, bigger picks.
- **Meta progression** (M6, rewritten): horizontal unlocks of buildings, combos, generals, commanders and Keystones, each teaching one keyword, with no power creep. A seeded challenge mode can come later.
- **The shop** (V3-Q5 and V3-Q6's next lever), only if the prototype's playtest still finds every round the same. It deals random offers each round, with rerolls, and replaces the drafts. It keeps your kit in its pool, so the answer you predicted stays plantable.
- **The fallbacks:** a moving front (V3-Q8's (b)) if battles still don't swing, and a continuous prototype (V3-Q1) if pillar 1 or 4 still fails in rounds.
