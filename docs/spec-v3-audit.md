# SPEC v2 against the v3 brief: the audit

**Status:** step A of the v3 plan in [design-brief.md](design-brief.md). It's docs only: no code, data, rule or test changed. Written on 2026-11-04 against `develop` at `1676282`. The hub records it in `docs/status.md`. The concept, [spec-v3-concept.md](spec-v3-concept.md), starts from the user's answers to section 5.

**Decided 2026-11-04:** the user took all 13 recommendations ("Take them all"), the three the hub flagged among them (V3-Q2, V3-Q5 and V3-Q8). Each question's **Decision** line records it.

**Sources:**
- the brief;
- SPEC v2, cited by section;
- R2b's playtest (2026-11-04): the user's notes, which S14's PR #141 records in `docs/playtest-feedback.md`;
- the design review, [more-decisions-each-round.md](ideas/more-decisions-each-round.md) ("the review"). This audit reuses its measurements rather than repeating them;
- [balance-backlog.md](balance-backlog.md). Its "R2b S14" tables are measured but not adopted.

"Measured" marks a number from these sources, and "guess" marks my judgment.

## In short

- **What v2 delivers:** squads that fight on their own (pillar 4), short runs with lives (6), and a general you can read (1). But the reading is reaction: you see the general's whole plan, and your answer fields in the same clash.
- **What it misses:** prediction (pillar 1), placement that changes what units do (2), and greed that outscales (3). Battles end in routs (4).
- **The causes are structural, not tuning:**
  - the full reveal, with squads fielding in the clash they're planted for (§1.3 #3, §4.7);
  - plots that run out before gold does (§4.6, §6.2);
  - built placement rules that each give one obvious answer, or matter little (section 2);
  - merging as a flat buff (§5.5).
- **Most of v2 survives:** the sim, the tools, the round loop, combat, the colony as formation, the general and the run (section 3).
- **If the user takes section 5's recommendations,** the prototype is one battle in rounds with four rule changes:
  - the rival's additions this round stay hidden until Begin;
  - buildings take time to fruit;
  - gold buys plots;
  - three or four combos.

  S14's ×2.0 merging comes in as data.

## 1. Per pillar

### Pillar 1: read and out-guess the rival

- **Delivers:**
  - the general's whole colony and army are in view before you plan, read through the shape language, the matchup marks and the Intent panel (§7.5, §5.8, §10.4);
  - its kit shows on the route node, and the intel file reads you across the run (§7.6).
- **Misses:** out-guessing.
  - Nothing is hidden, and nothing takes time to come online. So the round's decision is "plant the answer to what you see", and the answer is in time every round.
  - The general can't out-guess you either. It plans first and never sees your plan, so "the information edge is the player's by design" (§1.3 #3).
- **Why:**
  - The full reveal fixed v1's gambling opener (F18), and the user kept it at R2a's A/B (R2-Q1, 2026-11-03).
  - A planted building fields in that round's clash (§4.7, steps 11–13).
  - Hiding a plan with no delay is a gamble, and a delay with nothing hidden is only reaction a round later (V3-Q2).

### Pillar 2: the colony is the build

- **Delivers:** the colony is the formation, by rank and file (§4.6). Economy buildings leave holes in the line, and Twin Roots splits the colony by lane.
- **Misses:** rules that change what units do, by which neighbour and which direction, and that show before you place.
  - A colony planted by the formation rule loses to the same colony with its ranks swapped (G16 at 39–40%, against ≥ 60%; measured).
  - The only synergy built is neighbours knitting into Elders, which is a flat buff.
  - The user: placement helps "but not as much as I was hoping".
  - Section 2 goes through every rule.
- **Why:** combos (§11.14) are R3's and aren't built. With a 6-tile gap, start positions matter little: only a 2-tile gap made the formation rule win (G16's levers, measured; the reading is a guess).

### Pillar 3: rush or greed

- **Delivers:** a Truffle Cellar, loam, interest and comeback gold (§6.2), and several openers for each general (R2b S7).
- **Misses:** greed that outscales.
  - A Cellar breaks even after 3 rounds (2 on loam).
  - Most of its gold lands after the colony fills at round 5, when 200–300 sits banked with nothing to buy (measured, the review).
  - The user: "the tradeoff on building econ buildings is hard to justify vs just trying to win a battle instead with more units".
  - Rush has no tool of its own beyond siege counting double (§6.7).
- **Why:**
  - Plots run out before gold does (8 plots, §4.6), and the one late sink, the upgrade at 300% (§6.1), was never bought.
  - The bot opens with a Cellar on loam in all 240 of the review's battles, so neither side's opener is something to read.

### Pillar 4: watch the war you built

- **Delivers:** buildings field squads that fight on their own (§4.7), with no unit control since Hold was retired, and the aftermath drains two Heartcap bars (§4.5).
- **Misses:** swings and drama.
  - "I'm frequently either dominating or being dominated, there's rarely any close battles."
  - Two playtest battles were won by Rout in round 3, 2250 dealt to 0 taken. A lost one went 1900 to 3000.
- **Why:**
  - Merging (×2.8; merge-on wins 96% of G7's mirror) and Cordis (100% of battle 1s) decided battles before any read did (measured).
  - In battle 1, the general's 2000 HP falls in 3 rounds at the cap of 750 a round (§1.3 #1, #2).
  - The side that moves last, with the other's whole plan in view, wins every round it reads right (a guess).

### Pillar 5: break it on purpose

- **Delivers:** relics and the commanders' passives (§11.7, §11.10). Augments, combos and run packs are R3's (§11.13–11.15).
- **Misses:** builds put together on purpose.
  - The one broken build comes free: the Sporeling Burrow did 69% of the damage in the `bosslives` run (measured).
  - The user found the relics "fairly inconsequential", with not "much choice in what I'm doing run to run".
- **Why:**
  - R3 isn't built, and the drafts' cards are mostly levels (#27).
  - The guardrails cap single buildings (G1, G3), where the brief asks to measure build variety (V3-Q13).

### Pillar 6: runs that pull you back

- **Delivers:** short campaigns with lives, the route, the Grove, spoils and saves (§8). A run took about 10 minutes at the playtest, and S14's PR sets X6's target to 10–15.
- **Misses:** rewards that change how you play, and unlocks (§9, M6, not built). The user: "I'm worried we still don't have what we need to warrant another play through".
- **Why:** R3 and M6 aren't built, and with one decision a round, one run plays much like the next (pillars 1–3).

### Pillar 7: fungal through and through

- **Delivers:** the theme and names (§2). Spore clouds, the Sporestorm, Bursters, burrowing Rhizomorphs, merges that knit, and combos drawn as hyphae (§10.4).
- **Misses:** mechanics from biology. SPEC has none of the brief's fruiting time, compost into loam, fairy rings or parasites, and mycelial links exist only as two relics (§11.7).
- **Why:** v1 and v2 dressed standard rules in the theme.
- **Candidates for the concept** (guesses):
  - fruiting time (V3-Q3);
  - combos as mycelial links (V3-Q7);
  - compost: a sold building leaves its plot as loam, so a pivot feeds the economy.

### Each v2 system against the pillars

| v2 system | Verdict | Pillars | Why |
|---|---|---|---|
| Rounds: planning, clash, aftermath (§1.3 #1, §4.7) | **Keep** | 1, 4 | Commit-then-reveal needs a paused build phase. The user found rounds read as "plan then fight" and doesn't miss Hold |
| The general plans first, with the full reveal (§1.3 #3, §7.5) | **Change** | 1 | Hide this round's additions from round 2, with fruiting time (V3-Q2) |
| A building fields in the clash it's planted for (§4.7) | **Change** | 1, 3 | Fruiting: from round 2, a squad fields a round later (V3-Q3) |
| Fresh squads each round, carrying only the colony and gold (§1.3 #1) | **Keep** | 4 | v2's snowball brake (§1.1). V3-Q8 asks what "the front persists" means |
| The Heartcap race, the 750 cap, the Sporestorm, a Decision after round 9 (§4.5, §6.4–6.7) | **Keep**, retuned | 4 | The cap and the HP set how soon a rout can come |
| Lives: 3 Regrowths (§8.5) | **Keep** | 6 | The brief's battle-1 check needs a form for lives (V3-Q12) |
| The colony is the formation: plots by rank and file (§4.6) | **Keep** | 2 | The ground combos stand on. On its own, G16 reads 39–40% |
| Holes in the line, loam and stumps (§4.6) | **Keep** | 2, 3 | The trade between the economy and the line, and each map's shape |
| Sprawl: +1 plot per battle won (§4.6, §18.2 #18) | **Change** | 1, 3 | Gold buys plots within a battle (V3-Q5) |
| The kit with copies (§1.3 #5, §8.10; R3, not built) | **Keep**, later | 1, 5 | Not needed in the prototype. Copies keep the answer you predicted plantable |
| Six core archetypes (§1.3 #6, §11.2) | **Keep** | 1 | The prototype's roster |
| Merging: knits at the muster, the toggle, neighbours making Elders (§5.5, §5.6) | **Change** | 2, 4 | At ×2.8 merging is the only right move. S14's ×2.0 makes it a sidegrade (V3-Q10) |
| The damage matrix and tags; pinning, clouds, cleave, bursts (§5.3) | **Keep** | 1 | The counters that prediction aims at |
| The shape language (§5.8, R4a) | **Keep** | 1, 4 | How you read the rival's sprouts and army |
| The economy: stipend, Cellar, interest, comeback gold (§6.2) | **Change** | 3 | The Cellar pays too late, into a full colony (V3-Q9) |
| Gold upgrades at 300% (§6.1, S5b) | **Cut** | 3 | The user never bought one, and cheaper ones pushed G5 to 89–90% |
| The counter cycle and doctrines (§7.4, §11.11) | **Change** | 1 | Counters become hidden plantings with tells (V3-Q11) |
| The general's openers and placement (§7.3, R2b S7) | **Keep**, extended | 2, 3 | Openers for rush and for greed; placement gets a combo term |
| The intel file (§7.6) | **Keep** | 1 | The rival reads you too. On the brief's keep-list |
| Drafts in rounds 3, 5 and 7 (§8.3) | **Change**, later | 5, 6 | The cards are small. Fewer, bigger picks; not in the prototype |
| Relics and spoils (§8.6, §11.7) | **Change**, later | 5, 6 | "Fairly inconsequential". Keystones at set points (the review's #3) |
| Augments, combos, run packs (§11.13–11.15; R3, not built) | **Keep** | 2, 5, 6 | v3's rule-benders and placement rules. A few combos join the prototype (V3-Q7) |
| Commanders and powers (§6.6, §11.10) | **Keep** | 5, 6 | On the keep-list. Cordis waits for S14's held Puppet Bloom rework |
| The route, nodes, the Grove, saves (§8) | **Keep** | 6 | Not in the prototype |
| Meta-progression (§9; M6, not built) | **Keep** | 6 | Horizontal unlocks fit pillar 6 |
| Lanes and Twin Roots (§4.1, §7.3) | **Keep** | 2 | On the keep-list. The one placement choice that's real (section 2) |
| Planning with no time limit (§4.2) | **Keep** | 1 | Reading takes time, and this is a desktop game |
| G1's and G3's ceilings on single buildings (§12.3) | **Change** | 5 | The brief: measure build variety. G12 stays the main bar (V3-Q13) |
| G16, the formation check (§12.3) | **Change** | 2 | Becomes the brief's "best spot beats a median spot", per building |

## 2. Pillar 2 in detail: every placement rule

| Rule | SPEC | State | Real decision, or flat buff? | Evidence |
|---|---|---|---|---|
| **Rank:** a plot's rank sets front or back | §4.6 | Built | **Weak.** The rule's answer loses to the swap | G16 39–40%, against ≥ 60% (S13, S21b). The rework found the best plot worth about 5% of a building over the median (§0.1). The user: "not as much as I was hoping" |
| **File:** a plot's place across the lane | §4.6, §7.3 | Built | **Little** (a guess): one lane's squads converge | Not measured. The general weighs it at 1 a tile (§7.3) |
| **Holes stay holes:** economy, utility, empty and stump plots field nothing | §4.6 | Built | **One answer:** economy goes at the back | The general scores economy +10 a rank back (§7.3), and the bot always does it |
| **Loam plots:** +50% economy yield | §4.6, §6.2 | Built | **One answer:** the opener's Cellar goes on loam | The bot opens with a Cellar on loam in 240 of 240 battles (the review) |
| **Stump plots:** can't be built on | §4.6, §11.9 | Built | **A constraint,** not a decision | Map shape |
| **The Burster in front** | §7.3 (T159) | Built | **One answer:** the front rank | With Bursters behind, G16's Burster pairs read 0%. Moving them to the front made those pairs same-role (G16 24% → 40%) |
| **Neighbours make Elders:** squads of one unit, merging on, within 1.5 tiles knit together at the muster | §5.6; §11.14, "merging's own combo" | Built | **Flat buff,** the brief's first lesson: always plant same-type side by side | Merge-on wins 96% of G7's mirror (S14). The Sporeling Burrow did 69% of a run's damage. The general scores +2 for a plot beside the same building with merging on (§7.3). The user: "the only right move" |
| **The merge toggle** | §5.6 | Built | **No decision** while merging is a buff | 32 toggles in 240 bot battles (the review). At ×2.0 it becomes a sidegrade (G7 60%; 34% against Slayers) |
| **The third rank:** sprawl opens files 2, 3, 1, then 4 | §4.6 | Built | **No decision:** a fixed order | – |
| **Lanes on Twin Roots:** which lane a building fields in | §4.6, §7.3 | Built | **Real** (a guess): split the lanes or stack one | Mono Sporeling escaped its answers on Twin Roots because `bot:balanced` splits its army (§7.3) |
| **The gap between front ranks:** 6 tiles | §4.6 (`formationGapTiles`) | Built, a constant | Sets how much rank matters | Only a 2-tile gap brought G16's Gill and Mortar pairs over 60% (G16's levers) |
| **Combos:** in front of, behind and beside, seven examples | §11.14 | R3, not built | **Designed to be real:** each changes behaviour, never a small percentage | Not measured. R3 meant Shield Wall and Anvil to take G16's Gill and Mortar pairs |
| **Corner links:** Mycorrhizal Link lets combos link at corners | §11.7, §11.15 | A relic, not built | A rule-bender on combos (pillar 5) | – |
| **The general's combo term** | §7.3 | R3, not built | Needed, so that the rival's combos are tells | – |
| **Augments that change how a squad forms up,** such as Fuse | §11.13 | R3, not built | Real, if Bursters waiting behind the front changes the clash | – |
| **Copies** | §8.10 | R3, not built | Not about placement: they limit mono builds | At 2–4 copies, mono Sporeling still won 57–63% (X4) |

**So:**
- Of the built rules, only Twin Roots' lanes is a real decision. The rest either give one obvious answer (holes, loam, the Burster, neighbours) or matter little (rank, file).
- Pillar 2 rests on R3's combos, which aren't built or measured.
- The measure is G16, rewritten as the brief's "the best spot clearly beats a median spot" (V3-Q13).

## 3. What survives unchanged

**The brief's must-keeps:** the mushroom theme, buildings that spawn squads, the deterministic sim and headless tools, and the CLAUDE.md workflow.

**Code systems** (v2's unless marked; the prototype builds on them):
- **The sim's determinism** (§13.3): seeded streams (`src/sim/rng.ts`), the 20 Hz tick, the spatial hash, plain state, golden hashes. From v1.
- **The round loop's skeleton** (§4.7, §14.5): planning commands, `beginClash`, the muster, clash scoring and the aftermath (`src/sim/round.ts`, `planning.ts`, `commands.ts`).
- **Combat** (§5.2, §5.3): movement, targeting, the matrix, pinning, clouds, cleave, bursts and the arrival shield (`step.ts`, `targets.ts`, `hits.ts`, `effects.ts`).
- **The colony and its formation** (`colony.ts`, `formation.ts`): plots, ranks, files, loam and stumps. `formationOf` and `mergePreview` are pure, so the preview equals the clash.
- **The general** (`src/sim/ai/`): its turn, placement, counter cycle, doctrines, openers and intel file.
- **The tools** (§12.2, §15): `npm run sim`, `experiment` with `--proto`, the round guardrails, the bench, goldens and screenshots (`tools/lib/`).
- **Data and art:** data-driven content and its validator (§14), text-defined sprites and the shape language's drawing (§14.3, §5.8). The sprites are from v1.
- **The planning screen** (§10.2): the tray, inspect, the Intent panel, matchup marks and the formation preview.
  - `reveal=last` (§15.6) already draws the general's colony as it fielded it last round.
  - It's a start for hidden additions, but S19 left four gaps to close first ([reveal-last-fielded.md](ideas/reveal-last-fielded.md)).
- **The run:** the route, lives, drafts, relics, commanders and saves (§8), `storageKey()` and the storage keys (§13.8). The route and nodes are from v1.
- **Around the game:** the dev site, deploys, CI and the debug bridge.

**Rules:**
- the theme and names, the Velvet Bloom against the Gray Rot (§2), from v1;
- buildings field squads and stay out of the clash (§4.6);
- the general plays by your rules, with no cheats (§7.1), from v1;
- the damage matrix and tags (§5.3), from v1;
- the shape language: body size shows armor, pips show merges, icons show augments (§5.8);
- merging's rule, three identical units knitting into one (§5.6), from v1;
- each battle is a Heartcap race, scored by the survivors' supply (§4.5, §6.7), with lives for the run (§8.5);
- the colony is the formation, with economy as holes in the line (§4.6);
- planning has no time limit (§4.2);
- there's no unit control in a clash, beside the commander's one power per clash (§6.6);
- the intel file reads you across the run (§7.6), from v1;
- each round fields fresh squads (§1.3 #1), unless V3-Q8 says otherwise.

## 4. The decision a v3 round holds

> Each round, without seeing what the rival plants this round, you split your gold three ways: an answer that fruits in time for what you predict it will field, pressure that lands before its economy pays, and growth that outscales later. Then you choose where each one grows, because its neighbours change what its squad does.

v2's round holds only part of this, as a reaction: plant the counter to what you can see.

## 5. Questions for the user

They're ranked by how much the answer changes the prototype. Each has a recommendation and the reason, as in [clarify.md](tasks/clarify.md).

### V3-Q1 · Rounds first, or both prototypes

- **Question:** The brief says to prototype both rounds and continuous battles cheaply before choosing. Should the first prototype be rounds alone, with a continuous one only if rounds fail?
- **Today:** v2 is rounds (§1.3 #1). v1's continuous battle (spawn timers and waves) was deleted in R2b's S3 (#118).
- **Recommendation:** rounds first, on their own. Judge them at the prototype's playtest, and build a continuous prototype next only if pillar 1 or 4 still fails. **Why:**
  - The continuous code is gone, so a continuous prototype means rebuilding v1's spawning from git history. That isn't cheap.
  - The user asked for a build phase and then a fight phase at P3 (§0.1), found rounds read as "plan then fight" at R2a's gate, and doesn't miss Hold.
  - The brief's pillars lean toward commit-then-reveal.
  - The continuous option's own idea, commitment through fruiting time, can be tested inside rounds (V3-Q3).
- **Alternatives:** both, side by side, the second a rebuild; continuous first.
- **What it changes:** every question below assumes rounds.
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all"): the recommendation. Rounds first, on their own. A continuous prototype comes only if the rounds prototype's playtest still fails pillar 1 or 4.

### V3-Q2 · Hide the rival's additions this round

- **Question:** Should planning work as if both sides plan at once? You'd see the general's base and what it fielded, but not what it plants this round until Begin.
- **Today:** the full reveal (§1.3 #3, §7.5).
  - R2a's A/B (R2-Q1, 2026-11-03) kept it: "I think the default should be to be reacting to your opponent".
  - `reveal=last` stays an idea ([reveal-last-fielded.md](ideas/reveal-last-fielded.md)).
- **Recommendation:** yes, from round 2, together with fruiting time (V3-Q3). Round 1's opener stays in view. This reverses your call at R2a, so it needs your OK. **Why:**
  - Under the full reveal, a round's one decision is reaction, and the brief ranks prediction first.
  - R2a's `reveal=last` hid buildings that fought in the same clash, so a hidden counter hit you before you'd seen it. That's a gamble with no tell.
  - With fruiting, a hidden addition shows as a sprout at Begin and fights a round later.
    - A counter you predicted fruits in time.
    - A counter you plant in reaction arrives a round late. That costs one capped round, not the battle.
  - Fruiting alone, with the full reveal, would only delay reaction: you'd see the sprout and answer it in the same round.
  - Keeping the opener in view keeps F18's fix, so the opener isn't a gamble.
- **Alternatives:**
  - keep the full reveal, and find prediction somewhere else;
  - hide from round 1 too, so the opener itself becomes a blind bet on rush or greed. The P3 playtest called that kind of opener gambling (F18).
- **What it changes:** the view exists, behind `reveal=last`, with S19's four gaps. The sim only needs the reveal at Begin, since the general already never sees what you plant this round.
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all", with this one flagged as reversing R2-Q1): the recommendation. From round 2 the rival's plantings this round stay hidden until Begin, together with fruiting (V3-Q3), and round 1's opener stays in view. This reverses R2a's full-reveal call (F18, R2-Q1, 2026-11-03) for the prototype. v2's game on `develop` keeps the full reveal until SPEC v3.

### V3-Q3 · Fruiting time

- **Question:** How long after it's planted does a building field its squad?
- **Today:** at once. A building planted in planning fields in that round's clash (§4.7, steps 11–13).
- **Recommendation:** one round, for every building planted from round 2. Until then it shows a sprout with a timer, and round 1's opener fields at once. Economy keeps today's timing, paying from the next round's income. **Why:**
  - It's the smallest rule that makes prediction pay (V3-Q2), and it's fungal (pillar 7).
  - One time for every building keeps the first test clean. Fast-fruiting cheap buildings can come later as a rush lever (pillar 3).
- **Alternatives:**
  - a time per building: swarms at once, heavies in two rounds;
  - growth stages, where a growing building fields part of its squad;
  - economy that fruits too.
- **What it changes:** a sim rule: a building's first round, with unfruited plots left empty in `formationOf`. Plus a sprout drawn on the field.
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all"): the recommendation. One round for every building planted from round 2, shown as a sprout with a timer. Round 1's opener fields at once, and economy pays as today. The concept found that under this timing round 2's clash replays round 1's, and asks one follow-up before the prototype builds it ([v3-proto-plan.md](v3-proto-plan.md), open question 1).

### V3-Q4 · The prototype's size: one battle or a run

- **Question:** Is the prototype one battle in rounds, or a whole run?
- **Recommendation:** one battle, opened from a preview link, against three generals with different openers: a rusher, a greedy one and a counter-builder. Play it on Bogwater Hollow and Twin Roots, with Vesper, since Cordis waits for her rework. **Why:**
  - Pillars 1–4 live inside a battle, and the first question is whether a v3 round holds a decision.
  - Runs, drafts, relics and meta (pillars 5 and 6) get redone for v3 anyway, and would double the prototype.
  - The battle scene already opens a single battle with parameters (§15.6).
- **Alternatives:** a short run of 3 battles with spoils, to test pillar 6 as well.
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all"): the recommendation. One battle from a preview link, against three generals (a rusher, a greedy one and a counter-builder), on Bogwater Hollow and Twin Roots, with Vesper.

### V3-Q5 · A second purchase: what gold buys besides a building

- **Question:** What else should a round's gold buy?
  - plots, so the colony grows within a battle;
  - techs, augments bought during a battle (the review's first pick);
  - shop rerolls (V3-Q6).
- **Today:** a building on a free plot, and once the colony is full, the upgrade at 300% (§6.1). The colony fills at round 5. From round 6 most rounds plant nothing, with 200–300 banked (measured, the review).
- **Recommendation:** plots, in the prototype. You pay to open the next closed plot, up to sprawl's 4 more, which the performance budget already covers (§4.6). The gold upgrade goes. Techs come after, with R3's augments, as the review proposed. **Why:**
  - Plots run out before gold does, so buying a plot fixes the cliff at round 5 at its cause.
  - It makes greed outscale (economy, then plots, then a bigger army), "grow your base over time" literal, and placement a choice that grows.
  - It needs no new content: the third rank's tiles exist (`homeCols` 6).
  - Techs need augment content, icons and UI. The review's case for them stands, after this.
- **Alternatives:**
  - techs first;
  - plots and techs together, though two changes at once blur what the playtest measures;
  - a cheaper upgrade, which pushed G5 to 89–90%.
- **What it changes:** a command to buy a plot, with its price. The general's doctrines weigh plots too.
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all", with the shop's absence flagged): the recommendation. Gold buys the next closed plot, up to 4 more, and the gold upgrade goes. Techs come after, with R3's augments.

### V3-Q6 · What to borrow from TFT

- **Question:** TFT's levers:
  - a shop each round of random offers, with rerolls for gold;
  - levels, where gold buys board slots and better odds;
  - interest;
  - streak gold;
  - star-ups, where three copies make a better unit;
  - a few big augment picks at set stages.

  Which does v3 take?
- **Recommendation:**
  - **Levels: yes,** as plots bought with gold (V3-Q5). That's what makes TFT's economy a choice each round: level, roll or save.
  - **Interest:** keep it as built, 1 per 10 banked up to 30 (§6.2).
  - **Big picks at set stages:** yes, later, as the review's Keystones in place of the relics in rounds 3, 5 and 7. Not in the prototype.
  - **The shop: not in the first prototype.** It's the next lever if planning still feels thin. **Why:**
    - It would add decisions every round and variety every run, the user's two biggest complaints.
    - But it changes what you can plant each round, so the counter you predicted may not be on offer. That stacks luck on prediction in the same round, the gamble F18 removed.
    - It's also the biggest build: offers, pools, rerolls, the general shopping too, and somewhere to hold what you buy.
    - If it comes, it should replace the drafts and keep your kit in its pool, so the answer you own stays plantable.
  - **Streak gold: no.** A win streak pays the side already ahead, and the loser's +40 does the loss streak's job (§6.2, the review).
  - **Star-ups: no.** Merging is v3's three-become-one (V3-Q10).
  - **The shared pool and scouting:** don't apply with one rival. The general's visible base is the scouting.
- **Alternatives:** the shop in the first prototype, in place of plots.
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all"): the recommendation. Levels as plots (V3-Q5), interest as built, and big picks later, as Keystones. No shop in the first prototype: if its playtest still finds every round the same, a shop prototype comes next. No streak gold or star-ups.

### V3-Q7 · The placement rules in the prototype

- **Question:** Which placement rules does the prototype build?
- **Today:** rank, file, holes and neighbours knitting Elders are built. R3's combos (§11.14) aren't. Section 2 finds that every built rule but Twin Roots' lanes gives one obvious answer, or matters little.
- **Recommendation:** three or four of §11.14's combos, each changing what a squad does and each shown on hover before you place:
  - **Shield Wall:** archers behind shields aren't pinned;
  - **Spotted Screen:** an Amanita Lodge in front draws the enemy's fire;
  - **Chain Burst:** Burster Pods side by side burst together;
  - **Truffle Hunters:** a Burrow beside a Cellar drops gold, so the economy competes for the line.

  **Why:**
  - They read which neighbour and which direction (pillar 2), and §11.14 already rules out small percentages, the brief's first lesson.
  - The general places by them too, so its combos become tells (pillar 1).
  - Measure them with G16 rewritten (V3-Q13).
- **Alternatives:**
  - all seven;
  - new fungal rules designed in the concept, such as links along a file or fairy rings of one building.
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all"): the recommendation. Shield Wall, Spotted Screen, Chain Burst and Truffle Hunters, each shown on hover before you place, and the general places by them too.

### V3-Q8 · What "the front persists between rounds" means

- **Question:** The brief's rounds keep "base and front" between rounds. v2 keeps the colony and gold, and fields every squad fresh. Which of these is the front?
  - (a) the survivors stay on the field into the next clash;
  - (b) a front line moves toward each round's loser and sets where the next clash starts;
  - (c) the Heartcap bars, as now.
- **Recommendation:** (c) for the prototype. Try (b) only if its battles still don't swing. **Why:**
  - Fresh squads are v2's snowball brake (§1.1), and battles are already one-sided. (a) would deepen that.
  - (b) brings back a kind of territory. v1's testers found column capture awkward (F6), and holding more ground predicted the winner only about 40% of the time (§0.1).
- **Alternatives:** (a) or (b).
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all", with this one flagged as departing from the brief): (c) for the prototype, departing from the brief's "front persists" lean. Only the Heartcaps carry over between rounds, beside the colony and gold, and every squad fields fresh. (b), a moving front, is the fallback if battles still don't swing.

### V3-Q9 · Rush and greed: the economy's numbers

- **Question:** How does the prototype make greed outscale, and rush punish it?
- **Today:**
  - A Cellar costs 150 and pays 50 a round, or 75 on loam. It breaks even after 3 rounds, and its gold lands once the colony is full.
  - The bot opens with one on loam in every battle (the review).
- **Recommendation:** set the numbers as data, headless, before the playtest.
  - **The openers:** three scripted openers on both sides, rush (spawners only), greed (Cellar and plots first) and counter (answer the general's sprouts).
  - **The target:** each wins 30–70% against each of the others, and greed fields the bigger army by round 6.
  - **The levers:** the Cellar's price and yield, a plot's price, and the cap and Heartcap HP that set how much a rush can take before greed pays.

  **Why:** pillar 3 asks that both can win. Today's rules can't show it while late gold has no use, so measure once V3-Q5 gives it one, as the review advised.
- **Alternatives:** an income that rises each round (the review's ramp); fast-fruiting rush buildings (V3-Q3).
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all"): the recommendation. Three scripted openers on both sides (rush, greed and counter), with the economy's numbers tuned as data, headless, before the playtest, until each opener wins 30–70% against each of the others and greed fields the bigger army by round 6.

### V3-Q10 · Merging in the prototype

- **Question:** Does the prototype keep merging, and at what strength?
- **Today:** ×2.8 a tier (§5.5). Merge-on wins 96% of G7's mirror, against a band of 55–70%.
- **S14's measure (not adopted):** ×2.0, where a merged unit's stats match its supply (×1, ×2, ×4).
  - G7 passes at 60%, and 34% against Slayers, and G1 passes.
  - Mono Sporeling falls from 75% to 23%.
  - The costs: battles reaching round 9 rise from 22% to 31%, and G8's `bot:balanced` clause falls to 27%.
- **Recommendation:** keep merging at ×2.0, as data, and leave its rule alone. **Why:**
  - The brief keeps merging unless the pillars argue otherwise.
  - At ×2.0 it's a sidegrade, fewer and bigger units against splash and Slayers, rather than the flat buff pillar 2 objects to.
  - A new merge rule in the same prototype would blur what its playtest finds.
- **Alternatives:**
  - ×2.1, S14's other passing value;
  - merging off;
  - buildings that merge: three copies make one bigger building, TFT's star-up. That frees plots, so merging joins the colony's choices.
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all"): the recommendation. Merging at ×2.0 (S14's measure), as data, with its rule unchanged.

### V3-Q11 · The general under hidden plans

- **Question:** What tells does the general show, and how does it choose rush or greed?
- **Recommendation:**
  - **Its tells** are what v2 already shows, less this round's plan: its base and sprouts, its banked gold and income, its doctrine in the Intent panel, its kit on the route node, and its intel file on you.
  - **Its openers:** each general gets a rush opener and a greed opener, picked by its personality and your intel.
  - **It predicts you as you predict it:** it answers your sprouts, not only what you fielded.

  **Why:** pillar 1 needs tells you can read, and pillar 3 says the rival makes the same choice. The code already has the counter cycle, doctrines, intel and several openers per general (R2b S7).
- **Alternatives:** today's general, which answers only what you fielded (§7.4).
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all"): the recommendation. Its tells are what v2 shows, less this round's plan. Each general has a rush opener and a greed opener, picked by its personality and your intel, and it answers your sprouts.

### V3-Q12 · The brief's success checks in round form

- **Question:** Four of the brief's checks assume continuous battles, no lives or no reveal. Should they read as the table says? The numbers are first guesses.

| The brief's check | Why it doesn't fit v2 | Proposed round form |
|---|---|---|
| "A losing Heartcap takes 45 s or more to fall" | A Heartcap falls over several rounds, at most 750 a round, and takes its damage in the aftermath | At least 90% of battles last 4 rounds or more (in battle 1 the general falls in round 3 at the cap today). The battle's loser wins a round from round 3 in at least 40% of battles |
| "The first real decision comes within 30 s" | Round 1's planning opens at once | Round 1 holds a choice: rush, greed and counter openers each win 30–70%, headless (V3-Q9) |
| "Under 20% of runs end in battle 1" | With 3 lives, no run ends in battle 1 | Battle 1 costs a life in at most 20% of runs. That raises G14's floor from 70% to 80% |
| "a counter planted in time wins" | Under the full reveal every counter is in time | A counter planted a round before the threat fruits wins that clash in at least 65%, scripted and headless. One planted after it fruits loses its first clash |

- **Recommendation:** yes. **Why:** each keeps the brief's intent:
  - a losing side gets time and a swing;
  - the first round is a choice;
  - battle 1 bites without ending the run;
  - prediction pays.
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all"): the recommendation. The table's round forms, as first guesses that the prototype measures.

### V3-Q13 · Measure build variety, not single-building ceilings

- **Question:** Pillar 5 says to measure build variety rather than single-building win rates. Should G1's and G3's ceilings become reports, with a variety measure beside G12?
- **Recommendation:** yes:
  - G12 stays the main bar: every strong build has an answer (§12.3);
  - G1 and G3 report without failing;
  - a variety measure over bot runs with drafts: no building does more than 40% of the damage in more than a quarter of winning runs (the Burrow did 69% of one run's);
  - G16 becomes "the best spot beats the median spot", per building.

  **Why:** the brief's checks are "no building or archetype dominates" and "the best spot clearly beats a median spot". G3 caps mono bots, which copies were meant to make impossible anyway.
- **Alternatives:** keep §12.3 as it is until SPEC v3.
- **Decision:** 2026-11-04 (the hub session; the user: "Take them all"): the recommendation. G12 stays the main bar, G1 and G3 report, a damage-share variety measure joins them, and G16 becomes "the best spot beats the median spot". The guardrail changes land with SPEC v3; the prototype measures G16's new form for its combos.
