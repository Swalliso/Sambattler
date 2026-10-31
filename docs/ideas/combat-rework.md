# Combat rework: no unit type should win alone

Drafted on 2026-10-30 against `f5e70a9`. **Nothing here is adopted yet.** On 2026-10-30 the user chose Level 2 ([Decisions](#decisions-2026-10-30)), and P0 and P1 of the [prototype plan](#prototype-plan) are under way. This doc replaces the step C draft (sheltered forward plots), which is parked; see [What waits](#what-waits).

The user's brief:
- Fix battles that are one-sided because one unit type dominates, even if that takes significant rework.
- Don't limit the design to today's units and numbers.
- Borrow freely from other games.
- Round 3's "too much to learn" note (F8) isn't a constraint. Tooltips addressed it, and onboarding can be revisited later.

## In short

- **The problem isn't only archers.** G3 now fails mono Gill Nest, mono Sporeling and mono Amanita, and mono Morel sits on the limit. Mono archers are the worst case. No defender we've built beats them, not even an all-Sporeling army, which is their designated counter. That army wins only 2% of the time.
- **It isn't unit numbers or stats.** Sporelings already outnumber archers about 2 to 1 and win a straight fight, yet they lose in the lane. More than 20 single fixes since M1 have failed.
- **It's how armies meet:**
  - units arrive one or two at a time;
  - archers fight from outside melee reach;
  - a ranged mass grows in strength faster than anything that answers it.

  Every dominant mono build wins by clumping, and nothing in the game punishes a clump.
- **Other games solve this with several tools at once.** Armies arrive together, area damage punishes clumps, units can get past the front line, ranged units need protecting, units defend each other, and counters work on more than one axis. We have none of these.
- **The proposal (Level 2):** change how armies meet, with waves on a shared clock, and add the missing tools: spore clouds, a burrowing unit (the Rhizomorph), call for help, and ranged units weakened in contact.
- **How to judge it:** a new counter-matrix check. A strong build is fine as long as something beats it.
- **If that fails:** move to rounds, as Mechabellum does. A wilder option, ranged power as structures, is sketched too.

## The problem

G3 on every map: each mono bot against `bot:balanced`, 100 games per map ([backlog](../balance-backlog.md#g3-on-every-map-the-rewrite-2026-10-30)).

| Mono bot | Mean | Worst map |
|---|---|---|
| Gill Archer Nest | 88% | 100% (Bogwater, Stumpfield) |
| Sporeling Burrow | 74% | 77% (Twin Roots) |
| Amanita Lodge | 51% | 64% (Twin Roots) |
| Morel Warren | 55% | 57% (Stumpfield) |

**A strong build isn't the bug. A build with no answer is.** In TFT or Mechabellum, strong compositions are the point of the game, and each one has answers you can scout and build. Mono archers have no answer. In round 2's D1 test, every defender lost 95–100% of its games to them, and an all-Sporeling army lost 98% ([backlog](../balance-backlog.md#d1-is-g3-a-reference-bot-artifact)). That's what needs fixing.

## Diagnosis

### Why more melee units don't fix it

Adding melee bodies is the obvious lever. The numbers show melee already has the bodies, and it wins whenever it gets a fair fight:

- **Melee already outnumbers ranged.** A Sporeling Burrow makes 7.5 Sporelings a minute (2 every 16 s), while a Gill Nest makes 4 archers. Per gold, the Burrow produces 28% more supply.
- **Sporelings win a straight fight.** Slash does ×1.5 damage to light armor, so two Sporelings (2 supply) kill an archer (2 supply) in about 4 s. An archer needs about 6 s per Sporeling. G2's supply duels agree: Sporeling beats Gill Archer.
- **They lose in the lane.** They arrive one or two at a time, and 20 archers kill a Sporeling every 0.3 s.
- **Adding or grouping melee has failed every way we've tried it.** The attempts were:
  - bigger Burrow batches;
  - synchronised spawns;
  - mustering;
  - a melee rush (B1);
  - falling back when outnumbered (T2);
  - Hold.

  Each one either left the archers at 78–100%, or let another mono build take over instead. No setting made a mixed army the winner.

### Three causes

M1's diagnosis named them ([changelog](../../data/CHANGELOG-balance.md#open-g3-mono-gill-nest)), and every test since fits:

1. **The trickle.** Every building spawns on its own timer, so units walk out one or two at a time into a standing army. Defenders "die in their own half 5–10 s after spawning".
2. **Out of reach.** Archers shoot from 5 tiles away, but melee units only notice enemies within 4. Archers besiege the defender's home buildings from just outside turret reach, so the defender's spawners are under fire 36% of the time and about 7 of its buildings fall per battle. Against mono archers the defender fields about 50 units a battle, against about 220 when it faces mono Capguards. In E1, a held army sat behind its border while archers shot its buildings.
3. **Scale.** Every archer in a mass fires, but only the front rank of melee can swing. This is Lanchester's square law, so a counter that's narrow at 12 supply becomes a blowout at 60. At 60 supply each:
   - Sporelings beat archers by +8;
   - archers beat Capguards by +39 and Rootbreakers by +46;
   - Capguards beat Sporelings by +40.

   For a balanced army to hold against every mono build, the archers' counter needs the biggest margin in that triangle. Today it has the smallest.

**The dominant builds win by clumping:**
- Archers stand in a mass behind their own front.
- Sporeling swarms surround whatever they reach, and E1's waves made them stronger.
- On two-lane maps, mono Amanita stacks every Lodge in one lane.

The classic answer to a clump is area damage, and ours is token. The Puffball Mortar:
- deals 18 damage to a 110 HP archer every 3 s;
- dies to 20 archers in about 4 s;
- is outranged by Elder archers (range 6.5, against its 6).

Mono Mortar wins 6% of G3 games.

### What's been tried

Each of these was tested on its own.

| Kind | Tried | Result (mono Gill Nest) |
|---|---|---|
| Archer numbers | Range 4.5 → 3; damage cut to 6; HP, aggro, speed and supply; Nest interval 15 → 17–28 s (I1) | 78–100%. In M1, a near-halved Nest reached 50% but broke G1. With today's roster, a 28 s Nest still wins 90% |
| Melee delivery | Burrow batch size, synchronised spawns, mustering (M1), approach rush (B1), fall back when outnumbered (T2), Hold (E1) | 78–100%. Mustering lifted mono Rootbreaker to 50–100%, and T2 and Hold lifted mono Sporeling to 55–88% |
| Protecting production | Turret reach 9–12, turret splash and damage type, production slowed only by close hits (B2), structure damage ×0.1, spawners that shoot back (T3) | 100%, or Decisions take over. T3 reaches 30% only when every battle ends in a Decision |
| Counter units | Stronger Mortars, a slash Mortar, a cleave unit, heavy-armor Capguards, per-unit Pierce resistance, archer pinning, firing congestion (B3), unit lifespan (B4), the diver | 78–100%. Pierce resistance combined with mustering reached 85–90% |
| Maps | A second lane | 62–85%, plus a new mono Amanita problem |

None of these changed how armies meet while also giving the defender a way to punish a mass that's already standing. Hold came closest on the first half. The outside examples below fill that gap.

## How other games handle it

Ranged and swarm dominance is an old problem. These are the tools other games use against it, and most games use several at once.

### 1. Armies arrive together

- **MOBA creep waves.** League of Legends and Dota 2 are lane tug-of-wars at heart. Creeps spawn as a wave every 30 s, with both sides on the same clock, melee creeps in front and ranged creeps behind. Fights happen between waves, not between stragglers.
- **Round-based autobattlers.** TFT, Mechabellum, Super Auto Pets and the Hivemind prototype all start both armies at the same moment. Mechabellum goes further and redeploys both whole armies every round, so survivors never pile up between fights.
- **Deployment on demand:**
  - In Clash Royale, you drop a Skeleton Army right on the Musketeer that's shooting at your push.
  - Battle Cats is a one-lane tug-of-war like ours. There you pay to send units out when you choose, and you spam cheap "meatshield" cats to hold the front for your long-range "backliners".
- **Us:** each building runs its own timer, and units walk out alone. Hold groups them, but on each side's own schedule, and they wait on the field where archers can shoot them.

### 2. Clumps get punished

- **Age of Empires II:** massed archers beat infantry. The classic answer is the mangonel, whose splash wrecks a tight blob of archers. Skirmishers (cheap and armored against arrows) and cavalry finish the job.
- **StarCraft II:** a Marine ball is answered by Banelings, Psionic Storm and Siege Tanks, which are all area damage.
- **Clash Royale:** Fireball, Poison and The Log punish clustered troops. Poison is a lingering cloud.
- **Plants vs. Zombies:** the Melon-pult and Winter Melon splash a whole crowd.
- **Us:** the Mortar's area damage is token (see [Three causes](#three-causes)).

### 3. The front line can be bypassed

- **Plants vs. Zombies** is a catalog of ways for melee to beat a line of ranged attackers:
  - the Pole Vaulting Zombie jumps the first plant;
  - the Digger Zombie tunnels to the far end of the lawn and attacks from behind;
  - the Balloon Zombie floats over;
  - the Bungee Zombie drops in from above;
  - the Gargantuar throws an Imp behind your line;
  - the Screen Door Zombie blocks straight shots;
  - the Catapult Zombie lobs from range.
- **Clash Royale's Miner** can be deployed anywhere in the arena by tunneling there. **Battle Cats** has enemies that burrow under your front and come up behind it.
- **TFT's assassins** leap to the back row when combat starts. **Mechabellum's** flyers ignore the ground front entirely.
- **Us:** the only way to reach the archers is through their front, and §17 #7 rules out flying and burrowing. The diver prototype changed only targeting and speed, so it still walked.

### 4. Ranged units need protecting

- **Total War** and tabletop wargames: ranged units fight badly once they're engaged, and in some rules they can't shoot at all.
- **StarCraft II's sieged Siege Tank** and **Age of Empires II's mangonel** have a minimum range, so anything that reaches them is safe from their main attack.
- **Us:** archers fire point-blank at their full rate. M1 tried "archer pinning", once and on its own.

### 5. Units defend each other

- **Warcraft III** has a "call for help" rule: when a unit is attacked, idle allies nearby respond. Most RTS games have some version of it, so a unit can't be picked off next to its friends.
- **Us:** a unit reacts only to what's inside its own aggro range. That's why archers can shoot buildings without an answer.

### 6. Counters on more than one axis

- **Mechabellum** counters on several axes:
  - unit size: many small units waste a sniper's big shots, and big units shrug off chaff;
  - air or ground;
  - range;
  - single-target or area damage.
- **Age of Empires II** layers bonus damage classes and pierce armor on top of its basic triangle.
- **Warcraft III** combines an attack-type and armor-type table with abilities on almost every unit. **Castle Fight**, the Warcraft III custom map closest to our structure, relies on both. In it, buildings spawn units on timers, and the units march on the enemy castle.
- **Us:** one triangle. Each mono build has exactly one answer, and the archers' answer can't reach them.

### What they share

These six tools work together. Every fix we've tried added one of them, or part of one. The game has none of them as a system.

## The options

### Level 1: keep today's lane and add the missing tools

Add these to the continuous lane as it is:
- spore clouds, which are area damage that lingers;
- a burrowing unit, the Rhizomorph;
- call for help;
- ranged units weakened when an enemy is in contact.

**For:** the smallest change to how the game looks and plays.

**Against:** units still arrive one or two at a time. That's the cause that has sunk every fix so far.

### Level 2: change how armies meet (recommended)

**Waves on a shared clock**, as in MOBAs, plus Level 1's tools.

- **Production:** buildings keep their production rates, but each spawn joins its side's next wave instead of walking out.
- **Release:** every 20 s (a starting number), both sides release their waves on the same tick. Each wave moves as one block, melee in front and ranged behind.
- **Hold stays as a timing verb.** Holding a lane keeps its wave home for one more beat, so the next one leaves twice as big.
- **Where a wave waits and forms up** is the first thing the prototype has to settle. Units shouldn't wait out on the field, where archers can shoot them, because that's what sank Hold. One option is that they wait inside their buildings and all come out on the beat.

**Why waves need the tools as well:** Hold was already a kind of wave, and archers still won 93–100% under it. By the time a wave forms, the archer mass is already standing out of melee reach and shooting buildings. Waves also made swarms stronger (mono Sporeling 55–78%). So the package adds:
- spore clouds, which punish the standing archer mass and the swarm alike;
- the Rhizomorph, to reach a mass that's already there;
- call for help, so buildings can't be shot without an answer;
- pinning, so melee that reaches the archers finally counts.

**For:**
- It keeps the continuous lane, territory, the Sporestorm and Hold.
- It gives battles a readable pulse.
- Each piece can be measured as a separate setting.

**Against:**
- Survivors still carry over from wave to wave, so a side that wins one clash can snowball.
- It's a big change to spawning and the roster.

### Level 3: rounds

Battles become a series of clashes, as in Mechabellum. This is the design review's Direction B, which it kept as a fallback.

- **Planning phase:** buy and place buildings, and position the army. The buildings decide what you field.
- **Clash:** both full armies deploy in formation and fight.
- **After the clash:** the survivors damage the loser's Heartcap. The next round, both armies redeploy in full, plus whatever was bought.

**For:**
- It removes both the trickle and the pile-up of survivors at the root.
- Every fight is a set-piece, so counters depend only on the build.
- Positioning becomes the main skill, which was step C's goal.

**Against:**
- It gives up the continuous tug-of-war, territory capture and the Sporestorm in their current form.
- It rewrites the sim loop, the AI, the UI and run pacing.
- It moves the game toward Mechabellum and 9 Kings, which the design review warned against competing with head-on.

**When to use it:** if Level 2 can't give every mono build an answer.

### Wildcard: ranged power as structures

This follows Plants vs. Zombies, Kingdom Rush and Warcraft III's tower-wars maps. Ranged attacks come from buildings, and the army that marches is melee.

- The Gill Nest becomes a spore battery that fires down the lane from wherever it's planted. In Kingdom Rush, barracks soldiers hold the path while towers shoot. This would work the same way.
- Pushing means planting batteries forward behind your melee. Forward building and territory then matter by design (F1), and siege units have a clear job.

**For:** a ranged deathball can't exist.

**Against:**
- It's a big identity change. The Gill Archer unit and ranged merging go, and the roster, M6 and M7 change.
- Turtling becomes the risk to watch.

## The package (Level 2)

The package is five settings in `src/data/proto.ts`, each off by default with its own preset, plus a `rework` preset that turns on all five. The numbers are starting points for the first measurement, not designs.

| Setting | Rule | Starting numbers | The question it answers |
|---|---|---|---|
| `waves` | Spawns join the side's next wave. Both sides release on a shared beat, melee in front and ranged behind | A beat every 20 s | Do counters work once armies meet as armies? |
| `sporeCloud` | The Mortar's shells leave a cloud that damages every enemy unit inside it, every second. Buildings are unaffected | Range 7, cloud radius 1.5, lasts 6 s, 10 damage a second that ignores armor | Does punishing whatever stands still break both the archer mass and the swarm? |
| `rhizomorph` | A new unit, the Rhizomorph, tunnels along the lane, untargetable and passing under units. It surfaces next to the nearest enemy ranged unit or spawner behind the enemy's front, or at the front if there is none | 140 HP, medium armor, 16 slash every 1.0 s, speed 1.2 underground, 2 supply. Its building costs 160 gold and spawns one every 18 s | Can a defender reach a mass that's already standing? |
| `callForHelp` | When a unit or building takes damage, friendly units nearby that aren't already fighting target the attacker | Within 5 tiles | Does this stop buildings being shot without an answer? |
| `pinned` | A ranged unit with an enemy within 1 tile attacks at a fraction of its normal rate | ×0.35 | Does melee that reaches the archers finally count? |

How the numbers play out:
- **Spore clouds:** a cloud kills an archer that stands in it for 11 s. A Sporeling walking through takes about 20 damage, but a swarm standing around its target takes the full rate.
- **The Rhizomorph:** it kills an archer in 5 hits, since slash does ×1.5 against light armor.

### Flyers, later

Flying units are approved in principle: spores on the wind, like Mechabellum's Wasps, Clash Royale's Minions or Plants vs. Zombies' Balloon Zombie. They wait until after P2, so the five pieces can be measured cleanly.

The question to settle first is who can hit a flyer. If only ranged units can, a flyer is food for archers rather than an answer to them.

## The counter-matrix check

**What it measures:** for each mono build, the best answer we can build. A strong build that something beats is a strategy. A strong build that nothing beats is the bug.
- It's G2's counter graph measured in real battles instead of duels.
- It also tells the general's counter cycle (§7.4) what each build's answer is.

**How it works:**
- **Builds tested:** every `bot:mono:<id>`.
- **Answers:**
  - every mono bot;
  - every pair of spawners, weighted evenly;
  - `bot:balanced`;
  - hand-written counter bots like D1's defenders. These are defined as data through `bot.<id>` specs, which the proto layer already supports.
- **Two stages:**
  - A screen at 10 seeds per seat (20 games per map) on every run map finds the 3 best answers for each mono build.
  - A confirmation at 50 seeds per seat checks those 3.
- **Proposed pass rule:** every mono build has an answer that wins at least 60% of its games on the mean over maps. G3 stays alongside it.

**Cost:**
- **Screen:** about 52,000 games. At the 0.09 s per game that G3 measures, that's about 80 minutes single-threaded. Worker threads would cut it.
- **Confirmation:** about 12,600 games, around 20 minutes.
- **Iteration:** a narrow version that covers only the failing mono builds and their known answers runs in minutes.

The check sits beside G3, which stays (decided on 2026-10-30). If the package is adopted, it becomes guardrail G12 in `npm run test:slow` (SPEC §12.3).

## Prototype plan

### P0: the counter matrix on today's rules

One session. No rule changes.
- Build `--checks counters` in `tools/experiment.ts`, with `evaluateCounters` in `tools/lib/balance.ts`, using the two-stage screen.
- Run it on today's rules. The expected result is that nothing answers mono Gill Nest. It should also show whether mono Sporeling, Amanita and Morel have answers. If they do, they're strong builds rather than bugs, and the bar for the rework changes.
- Record the matrix in `docs/balance-backlog.md`.

### P1: build the package

One session. It can run alongside P0, since P0 works in the tools and P1 in the sim and data.
- **The five settings:** each off by default, with its preset and unit tests.
- **Hooks for later relics and perks:** the wave beat and the wave size are modifier stats.
- **The Rhizomorph under its setting only:**
  - Extend `applyProto` so `unit.<id>` and `building.<id>` can add new entries, as `bot.<id>` already can.
  - The Rhizomorph then exists only while its setting is on, and the golden hashes don't move.
- **Enough rendering to playtest:**
  - clouds;
  - burrowed units, shown as a moving mound;
  - the wave beat on the HUD.
- **The AI:**
  - Bots and generals get the Rhizomorph's building in their kits when its setting is on.
  - The Mortar's placement score values covering the lane.

### P2: measure

**Runs:**
- each new piece alone;
- the full package;
- the package with one piece removed at a time.

**Checks:**
- G3 on every map;
- the counter matrix;
- G1–G2 duels, G4, and G5–G8;
- `engagement` (the opening, the Heartcap cliff, comebacks) and `runs` (battle-1 losses, boss reach), played with commanders.

**Bars:**
- Every mono build has an answer that wins ≥ 60%.
- G3 passes for every mono bot: mean ≤ 55%, worst map ≤ 60%.
- G4 stays in band: median 5:30–8:30, Decisions ≤ 15%.
- G2's counter graph stays healthy.
- More comebacks than step B's 2 in 360 would be a bonus.

The runs with one piece removed show which pieces carry the result, so the fewest can be adopted.

### P3: playtest

Play battles and full runs on the dev site with `?proto=rework`. The questions:
- Did any battle feel decided by one unit type?
- When the general massed something, could you answer it, and did you know how?
- Do the waves give a battle rhythm, or make it feel less alive?
- Do the spore clouds and Rhizomorphs read clearly?

### P4: decide

One of three outcomes:
- **Adopt** the pieces that carry the result. Each is a SPEC change (below). Adopted rules go to `develop`, and the goldens get refreshed.
- **Iterate** on the numbers.
- **Move to Level 3.** If no version gives every mono build an answer, write up rounds as a paper design plus a headless clash prototype.

## What it touches

**SPEC:**
- §4.4: spawners feeding waves.
- §5.2: formation, call for help, pinning and burrowing.
- §5.3: cloud damage.
- §11: the Rhizomorph and the Mortar.
- §12.3: G12.
- §17 #7: burrowing now, and flying later.
- §7: the AI, for Rhizomorph and Mortar use and counter weights.

**Code:**
- **Sim systems:**
  - `src/sim/systems/spawning.ts`: the wave reserve.
  - `src/sim/systems/stance.ts`: how Hold works with waves.
  - `src/sim/systems/targeting.ts`: call for help, pinning, and Rhizomorph targets.
  - `src/sim/systems/movement.ts`: moving underground, and formation.
  - `src/sim/systems/combat.ts`: the pinned attack rate and clouds.
- **State and settings:**
  - `src/sim/state.ts`: clouds, burrow state and the wave reserve.
  - The settings themselves: `src/data/schema.ts`, `src/sim/compile.ts` and `src/data/proto.ts`.
  - `applyProto`, so it can add new entries.
  - The Rhizomorph's unit and building data, under its setting.
- **Display:** the renderer and HUD.
- **AI:** `src/sim/ai/`.
- **Tools:** the `counters` check.

**Goldens:** unchanged while every setting is off and the new content exists only under them.

## Waves and run variety

The user added two thoughts on 2026-10-30:
- Waves could give relics and perks something to act on, which would help build diversity.
- 9 Kings is worth learning from. Its many different kings are close to our generals, and its builds vary wildly from run to run.

### What 9 Kings does

- **Kings:** there are nine playable kings, each with its own deck of nine cards, a base, decrees and king perks. A run starts with three cards from your king's deck. For example:
  - the King of Greed builds around gold;
  - the King of Blood sacrifices weak units to power up strong ones;
  - the King of Stone spams towers;
  - the King of Nomads moves plots around.
- **Loot from the enemy:**
  - Each year, an army from one of the kings in the enemy pool attacks.
  - Win, and you take a card from the defeated king's deck. Lose, and you still get a card from your own deck and the same gold.
  - You add kings to the enemy pool as the run goes, so you steer which cards you can win.
  - A Rainbow King appears once a run and offers special cards.
- **Cards that change what things do:**
  - troops and towers;
  - buildings that boost their neighbors: a Farm adds a unit to an adjacent troop, and a Library copies an adjacent troop's enchantment;
  - enchantments that change a unit's behavior, such as Vampirism and Carnage;
  - one-shot tomes that level, clone or destroy a plot. Plots level up.
- **Meta progression:** leveling a king unlocks perks. You start with nine perk slots. Rainbow perks multiply the perks beside them on the perk screen, so even the meta layer is a placement puzzle.
- **Breaking the game** is one of its advertised features.
- **Its weak spots,** according to reviewers:
  - nine cards per king can narrow a run to one or two builds;
  - at high difficulty, some kings are much stronger than others.

Sources:
- 9 Kings wiki: [Kings](https://9kings.wiki.gg/wiki/Kings), [Cards](https://9kings.wiki.gg/wiki/Cards), [Perks](https://9kings.wiki.gg/wiki/Perks)
- the official wiki's [Run](https://wiki.hoodedhorse.com/9_Kings/index.php?oldid=510&title=Run) page
- [Laura Michet on 9 Kings](https://blog.lauramichet.com/i-am-enjoying-9-kings/)
- [Pocket Gamer's launch coverage](https://www.pocketgamer.com/9-kings/official-launch/)

### What it suggests for us

| 9 Kings | Us today | Idea |
|---|---|---|
| Your king brings a deck, a base and perks | Commanders, each with one power | Each commander starts with its own small kit, exclusive buildings and perks. M6 already plans commander-exclusive buildings |
| Cards looted from the king you beat | Drafts from a shared pool | Beating a general lets you take one of its buildings or upgrades, so the route you pick shapes the build you get |
| Enchantments that change behavior | Mostly percentage upgrades | Upgrades that transform units, which the design review and colony-swarm already asked for |
| Buildings that boost their neighbors | Mycorrhizal Link (+15%) | Neighbor rules, the parked part of step C, once the rework is settled |
| Plot levels | Upgrade tracks (§11.6) | Draft a building again to level it where it stands, as colony-swarm suggests |
| A perk board where position matters | Traits and feats (M6) | Meta perks placed on a board |

### Waves give perks something to act on

With a shared beat, relics and perks can act on waves. These are examples, not proposals:
- **Hooks:** the beat and the wave size as modifier stats. P1 exposes them.
- **A bonus for mixed waves,** such as a shield for any wave with three or more unit types. This rewards diversity directly, instead of only punishing mono builds.
- **Special waves:** a swarm wave every third beat, or a doubled first wave.
- **Rhizomorphs that surface together** when they leave in the same wave.
- **A relic that rewards a mono wave,** for the rare broken run that §1.2 allows.

**Where this lands:** a run-variety design for M6, covering commanders, loot from generals and perks. It will be written after P2, against whichever combat model is adopted.

## What waits

- **M6 content and the Gray Rot roster (M7)** would be written against whatever P4 adopts. `data/factions/gray-rot/` holds only `faction.json` so far. The Gray Rot will need its own versions of the new tools, such as an area unit and its own burrower.
- **Step B's adoption** (`hotstart`, `bigdrafts`, `breach`) waits on your playtest. It doesn't depend on this.
- **Step C is parked.** The sheltered forward plots draft (plots beside the lane that only siege can break into, so forward production survives a push) isn't committed. It can come back if siege still lacks a job after this rework. The neighbor-rule test follows the rework, since placement tests mean little while one unit type wins alone.
- **The colony-swarm direction** fits this. Waves and bigger swarms suit each other, and area damage matters more as swarms grow, as colony-swarm predicted.

## Decisions (2026-10-30)

The user's answers to this doc's questions:
- **Level 2 first,** with rounds as the fallback.
- **Burrowing and flying units are in.** The original spec isn't a limit: this is an evolving game that's still being prototyped, and anything can change. Flyers follow after P2.
- **Waves first is worth testing.** It could also feed meta progression, and relics or perks for build diversity ([Waves and run variety](#waves-and-run-variety)).
- **The counter matrix sits beside G3,** not in its place.
- **Names:** the burrowing unit is the **Rhizomorph**, and the area damage is **spore clouds**.
- **P0 and P1 run now,** in parallel sessions.
- **9 Kings is a model** for run-to-run variety ([Waves and run variety](#waves-and-run-variety)).
