# Combat rework: no unit type should win alone

Drafted on 2026-10-30 against `f5e70a9`. **Nothing here is adopted yet.** On 2026-10-30 the user chose Level 2 ([Decisions](#decisions-2026-10-30)). P0 and P1 of the [prototype plan](#prototype-plan) ran the same day, and their results changed the target: see [What P0 and P1 found](#what-p0-and-p1-found). P1b and P1c followed that evening, and P1d the next morning ([What P1b, P1c and P1d found](#what-p1b-p1c-and-p1d-found)). P2 ran the same day and was cut short for a playtest, with flyers added ([What P2 found](#what-p2-found)). This doc replaces the step C draft (sheltered forward plots), which is parked; see [What waits](#what-waits).

The user's brief:
- Fix battles that are one-sided because one unit type dominates, even if that takes significant rework.
- Don't limit the design to today's units and numbers.
- Borrow freely from other games.
- Round 3's "too much to learn" note (F8) isn't a constraint. Tooltips addressed it, and onboarding can be revisited later.

## In short

- **The problem: a committed build beats a mixed one.** G3 fails mono Gill Nest, mono Sporeling and mono Amanita, and mono Morel sits on the limit. Each of them has an answer that wins most of its games, but the answers are committed builds too, such as Sporelings against archers and Capguards against Sporelings. The reference mix, `bot:balanced`, loses to all four, and wins only 12% against mono archers.
- **On today's rules, mono Sporeling is the build without a reliable answer.** Its best answer wins 61% overall, and nothing wins half its games on Twin Roots.
- **This corrects the first draft,** which said nothing beats mono archers, not even an all-Sporeling army. That came from round 2's D1 test, run the day before Hold was adopted. With Hold, Sporeling-led builds beat mono archers 80–88% on every map ([What P0 and P1 found](#what-p0-and-p1-found)).
- **It isn't unit numbers or stats.** Sporelings outnumber archers about 2 to 1 and win a straight fight. They lost in the lane until Hold, most likely because Hold made them arrive together. More than 20 single fixes since M1 have failed.
- **It's how armies meet:**
  - units arrive one or two at a time;
  - archers fight from outside melee reach;
  - a ranged mass grows in strength faster than anything that answers it.

  Every dominant mono build wins by clumping, and nothing in the game punishes a clump. Hold showed both sides of this: grouping the Sporelings gave the archers an answer, and made the swarm the next problem.
- **Other games solve this with several tools at once.** Armies arrive together, area damage punishes clumps, units can get past the front line, ranged units need protecting, units defend each other, and counters work on more than one axis. We have none of these.
- **The proposal (Level 2):** change how armies meet, with waves on a shared clock, and add the missing tools: spore clouds, a burrowing unit (the Rhizomorph), call for help, and ranged units weakened in contact.
- **P1 built it, and the first read fell short.** The full package takes mono archers from 86% to 74%, but waves make swarms stronger still (mono Sporeling 94%), and battles run long.
- **P1b, P1c and P1d aimed it at swarms.** P1b made each wave arrive together and aimed the tools at clusters. P1c added the Burster, a unit that bursts on clusters like StarCraft II's Banelings, and gave mixed-wave shields to any wave of two unit types. P1d went after the stalls that followed.
- **Every strong build now has an answer on every map,** Twin Roots included, so the strict counter bar passes. The shields carry it: every two-building answer gets them and a mono build never does. Without them, mono Sporeling's best answer falls from 85% to 47%.
- **G3 still fails on the swarm.** `bot:balanced` loses to mono Sporeling 81–85% of the time at a 20 s beat, and to mono Veilstalker too when the storm grows waves. The adaptive general doesn't answer the swarm either.
- **G4 passes.** With the Mortar's clouds off and a Sporestorm that grows waves, 12.5% of battles end in a Decision over 200 games, against a limit of 15%.
- **P2 found what each piece carries.** Waves carry almost everything, the two-type shields carry the strict bar, the storm keeps battles short, and pinning, call for help, the Burster and the Elder change each hold one check. The Rhizomorph carries nothing measured.
- **Flyers answer the swarm, but a flyer army takes over G3** (mono Drift Stalk 89%). Fallbacks from [flyers.md](flyers.md) are being measured.
- **Next: P3, a playtest** on the dev site with `?proto=rework`, which now also has flyers and a fix for the general's swarm read ([P3](#p3-playtest)).
- **How to judge it:** two checks side by side. The counter matrix says every committed build has an answer, now with a stricter bar, since today's rules already pass the first one. G3 says a mixed army holds up against committed builds.
- **If that fails:** move to rounds, as Mechabellum does. A wilder option, ranged power as structures, is sketched too.

## The problem

G3 on every map: each mono bot against `bot:balanced`, 100 games per map ([backlog](../balance-backlog.md#g3-on-every-map-the-rewrite-2026-10-30)).

| Mono bot | Mean | Worst map |
|---|---|---|
| Gill Archer Nest | 88% | 100% (Bogwater, Stumpfield) |
| Sporeling Burrow | 74% | 77% (Twin Roots) |
| Amanita Lodge | 51% | 64% (Twin Roots) |
| Morel Warren | 55% | 57% (Stumpfield) |

**A strong build isn't the bug. A build with no answer is.** In TFT or Mechabellum, strong compositions are the point of the game, and each one has answers you can scout and build.

The first draft said mono archers had no answer. In round 2's D1 test, every defender lost 95–100% of its games to them, and an all-Sporeling army lost 98% ([backlog](../balance-backlog.md#d1-is-g3-a-reference-bot-artifact)). That test ran on 2026-10-27, the day before Hold was adopted, and P0 found it no longer holds ([What P0 and P1 found](#what-p0-and-p1-found)). Today:
- **Mono archers have answers.** Sporeling-led builds beat them 80–88%, on every map.
- **Mono Sporeling has no reliable answer.** Its best, `bot:turtle`, wins 61% overall and 21% on Twin Roots, where nothing tried wins half its games.
- **The answers are committed builds.** `bot:balanced` wins 12% against mono archers and 26% against mono Sporeling. A mixed army loses to every committed build, so the game rewards going all in on one unit.

Those last two are what need fixing.

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

**Update after P0:** Hold did more than G3 showed. Since Hold, a Sporeling-led army beats mono archers 80–88%, but `bot:balanced` doesn't build enough Sporelings to make the wave, so G3 didn't see it. Hold also made mono Sporeling stronger against every defender, which is why it's now the build without a reliable answer.

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
- **Us:** one triangle, so each mono build's answer is a committed build of its own: Sporelings for archers, Capguards for Sporelings ([P0](#what-p0-and-p1-found)). A mixed army gets no edge from being mixed.

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

**When to use it:** if Level 2 can't give every mono build an answer. The paper design is in [rounds.md](rounds.md).

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

P1 built these as written. [P1b](#p1b-aim-the-package-at-swarms-and-mixed-armies-done) changes how a wave forms up, where the Mortar aims and where the Rhizomorph surfaces, and adds a sixth setting, `mixedWave`. [P1c](#p1c-area-damage-that-travels-with-the-army-done) adds two counters to the swarm, `cleave` and `burster`. For P2, `rework` drops the Mortar's clouds and adds a Sporestorm that grows waves ([P2](#p2-measure-done)). For the playtest it also gains the general's swarm read and flyers ([What P2 found](#what-p2-found)).

### Flyers

Flying units are approved in principle: spores on the wind, like Mechabellum's Wasps, Clash Royale's Minions or Plants vs. Zombies' Balloon Zombie. They were to wait until after P2, so the package's pieces could be measured cleanly. On 2026-10-31 the user had them built for the playtest instead, as [flyers.md](flyers.md) designs them, without the Bloatcap ([What P2 found](#what-p2-found)).

The question to settle first was who can hit a flyer. If only ranged units can, a flyer is food for archers rather than an answer to them. The design's answer is reach: ranged units, turrets, other flyers, clouds, powers and melee units of 2 or more supply can hit one.

## The counter-matrix check

**What it measures:** for each mono build, the best answer we can build. A strong build that something beats is a strategy. A strong build that nothing beats is the bug.
- It's G2's counter graph measured in real battles instead of duels.
- It also tells the general's counter cycle (§7.4) what each build's answer is.

**How it works,** as P0 built it (`npm run experiment -- --checks counters`):
- **Builds tested:** every `bot:mono:<id>` whose G3 mean is above 40%. Today that's Gill Nest, Sporeling, Amanita, Morel and Veilstalker.
- **Answers, 74 per build:**
  - every other mono bot;
  - every pair of the 10 army buildings, weighted evenly;
  - `bot:balanced` and the other data bots;
  - 11 hand-written counter bots, including rebuilds of D1's defenders. The tool adds them as `bot.<id>` specs, so the shipped bots don't change.
- **Two stages:**
  - A screen at 10 seeds per seat (20 games per map) on every run map ranks the answers.
  - A confirmation on fresh seeds 11–60 (100 games per map) checks each build's top 3.

**Cost:** the full check plays 30,900 games, about 6 minutes on 6 worker threads, or 35 minutes on one. A narrow run that covers only the failing builds and their known answers takes under a minute.

**The pass rule, made stricter after P0.** The first proposal was an answer that wins at least 60% on the mean over maps. That already passes on today's rules, so it can't judge the rework. The bar is now an answer that wins at least 60% **on every map**. Today that fails only mono Sporeling, on Twin Roots.

The check sits beside G3, which stays (decided on 2026-10-30). The counter matrix says every committed build has an answer, and G3 says a mixed army holds up against them. If the package is adopted, the counter matrix becomes guardrail G12 in `npm run test:slow` (SPEC §12.3).

## What P0 and P1 found

Both ran on 2026-10-30, and the full results are in the backlog: P0's [counter matrix](../balance-backlog.md#counter-matrix-on-todays-rules-2026-10-30), from PR #31, and P1's first read, which stays on `feature/combat-rework` until that branch is merged.

### P0: every strong build has an answer, and the answers are committed builds

Each strong mono build's best answer, confirmed at 100 games per map. Answer win %:

| Mono build (G3 mean) | Best answer | Bogwater | Stumpfield | Twin Roots | Mean |
|---|---|---|---|---|---|
| Gill Archer Nest (88%) | mono Sporeling | 91 | 83 | 91 | 88 |
| Sporeling Burrow (74%) | `bot:turtle` | 77 | 86 | 21 | 61 |
| Amanita Lodge (51%) | mono Hammercap | 100 | 100 | 80 | 93 |
| Morel Warren (55%) | Veilstalker + Amanita | 98 | 100 | 95 | 98 |
| Veilstalker Hollow (41%) | Sporeling + Gill Nest | 100 | 100 | 84 | 95 |

- **The first pass rule passes on today's rules.** Every strong build has an answer that wins at least 60% on the mean, so that rule can't tell the rework from today. Held to every map, only mono Sporeling fails: on Twin Roots, the best answer tried wins 46%.
- **Mono archers' best answer, mono Sporeling, fails G3 itself.** The next two don't: a Sporeling and Veilstalker rush wins 81%, and D1's Sporeling-heavy defender 80%.
- **D1 predates Hold.** With `--proto nohold`, rebuilds of D1's defenders reproduce its table. With Hold, D1's Sporeling-heavy defender beats mono archers 92% of the time on Bogwater. Every AI side now musters 12 supply in a lane before it advances, so its Sporelings arrive as a wave.
- **The intended triangle holds between pure builds.** Sporelings beat archers, archers beat Capguards, and Capguards beat Sporelings.
- **The answers are committed builds.** `bot:balanced` wins 12% against mono archers, 26% against mono Sporeling, 49% against mono Amanita and 45% against mono Morel. G3 fails because the reference mix doesn't build the answer, not because there's none.

### P1: the package, built and read once

P1 built all five settings, each off by default, and a `rework` preset with all five. It added the hooks for relics and perks (`side.waveBeat` and `side.waveSize`) and enough display to playtest `?proto=rework`. It settled where a wave waits: inside its buildings, until each one releases its units at its front edge on the beat. Nothing waits on the field.

G3 at 20 seeds per seat (about ±8 points), mean / worst map. The first column is P1's own baseline, within noise of the 50-seed table in [The problem](#the-problem):

| Mono bot | Today | `pinned` | `waves` | `rework` (all five) |
|---|---|---|---|---|
| Gill Archer Nest | 86 / 100 | 75 / 93 | 93 / 98 | 74 / 83 |
| Sporeling Burrow | 72 / 75 | 75 / 78 | 90 / 98 | 94 / 98 |
| Amanita Lodge | 47 / 65 | 50 / 63 | 53 / 63 | 52 / 53 |
| Morel Warren | 53 / 60 | 59 / 60 | 48 / 63 | 60 / 68 |
| Veilstalker Hollow | 36 / 48 | 41 / 53 | 60 / 80 | 63 / 90 |

- **Only `pinned` moves the archers on its own:** 86 → 75. Call for help and spore clouds leave them at 87.
- **Waves make swarms dominant,** as Hold did, only more so. Releasing a whole beat's production at once is what helps the swarm. Matching the wave's pace isn't the cause.
- **Spore clouds hurt the armored builds most,** since their damage ignores armor: mono Amanita 47 → 40, mono Capguard 38 → 30.
- **The Rhizomorph dives onto turrets.** Mono Rhizomorph wins nothing. Against a mixed army, 65% of Rhizomorphs surface inside turret range and live about 2.5 s.
- **All five together** give the archers' best result yet (74 / 83), and mono Amanita passes. But four mono builds fail, against three today. G4 fails too: median 8:51, 33% Decisions, and the reference bot wins 20% against the scripted general.
- **Runs:** 69 of 240 won, against 54 today, mostly at the boss. Battle-1 losses don't move. The loser's Heartcap still falls 9–27 s after its first hit, and there are no comebacks.

### What changes

The rework now aims at swarms and at mixed armies, not at archers:
- **Waves stay,** but each wave arrives as one block, and the tools that punish clumps get aimed at swarms.
- **Spore clouds aim at the densest cluster,** where archer masses and swarms stand.
- **A mixed wave gets a bonus** (`mixedWave`), so a mixed army has an edge of its own.
- **`pinned` stays in every variant.** It's the one piece that helps against archers on its own.
- **The counter matrix gets a stricter bar** ([The counter-matrix check](#the-counter-matrix-check)).

[P1b](#p1b-aim-the-package-at-swarms-and-mixed-armies-done) makes these changes.

## What P1b, P1c and P1d found

P1b and P1c ran on 2026-10-30 and P1d on 2026-10-31, all on `feature/combat-rework`. The full tables are in that branch's backlog until it's merged. G3 is at 50 seeds per seat, mean / worst map, with limits of 55 / 60. The strict counter bar asks for an answer that wins at least 60% on every map. G4's limit on Decisions is 15%.

### P1b: waves arrive together, and the swarm runs away

P1b made the changes in its [plan](#p1b-aim-the-package-at-swarms-and-mixed-armies-done), and `mixedWave` joined `rework` because it helped the mixed army. Then it ran `rework` at shorter beats:

| | Today | `rework`, 20 s beat | 17 s | 15 s |
|---|---|---|---|---|
| Mono Gill Nest | 88 / 100 | 59 / 67 | 75 / 89 | 82 / 95 |
| Mono Sporeling | 74 / 77 | 95 / 98 | 74 / 88 | 58 / 69 |
| Mono bots failing G3 | 3 | 4 | 2 | 3 |
| Strict counter bar | fails | fails | passes | passes |
| G4 Decisions | 10% | 15% | 20% | 28% |

- **The beat is a dial between archers and swarms.** A longer beat sends bigger waves, which suits the swarm. At 20 s, mono Sporeling beats `bot:balanced` 95% of the time, and nothing tried answers it on Twin Roots. A shorter beat brings the swarm down and the archers back up.
- **At 15 and 17 s, the strict bar passed for the first time,** but only just: mono Sporeling's answers on Twin Roots win 62–64%.
- **Shorter beats stall more.** G4's Decisions rise from 15% at 20 s to 28% at 15 s.
- **Each P1b fix worked as designed, and none reached the swarm.** Staggered release brings the archers down under waves, the Mortar's new aim answers the swarm on one-lane maps, and the Rhizomorph stops diving into turrets.
- **Apart from the archers, every build that still failed was cheap, fast and 1-supply:** Sporeling, Veilstalker and Morel at 20 s. The area damage that worked, the Mortar's, stands still. That set up P1c.

### P1c: the strict bar passes, and battles stall

P1c added [`cleave` and the Burster](#p1c-area-damage-that-travels-with-the-army-done), moved `mixedWave` to two unit types (two helped `bot:balanced` more than three), and checked the Elder Sporeling's splash. Confirmed results, two-type `rework` plus both counters:

| Beat | Mono Gill Nest | Mono Sporeling | Other G3 fails | Strict counter bar | G4 Decisions |
|---|---|---|---|---|---|
| 15 s | 78 / 93 | 47 / 56 | Rootbreaker 47 / 82 | passes | 48% |
| 17 s | 68 / 81 | 63 / 71 | – | passes | 43% |
| 20 s | 50 / 54 | 89 / 92 | – | passes | 35% |
| 20 s, no Elder splash | 49 / 53 | 79 / 80 | – | passes | 30% |

- **The strict bar passes in all nine confirmed variants:** three beats, each with both counters, the Burster alone, or both without the Elder splash. That includes Twin Roots, where mono Sporeling's answers now win 66–72%.
- **The credit belongs to the shields, not the Burster.** P1c credited the Burster, but the answers that pass are two-building builds such as Sporeling + Veilstalker, and neither side builds Burster Pods in those games. What changed for them is mixed waves at two types: every two-building answer now gets shields ([P1d](#p1d-fewer-stalls-and-the-shields-carry-the-strict-bar)).
- **The Burster helps in G3, against the runners.** `bot:balanced` builds a few Pods, and mono Veilstalker's G3 falls from 54 / 80 to 32 / 45 at 20 s. Against mono Sporeling it moves 1–3 points. Cleave adds 1–2 points in G3 and nothing in G4. Its one clear effect is making mono Scythecap an answer to the swarm.
- **G3 still trades archers for swarms.** 20 s fails only mono Sporeling, 17 s fails both at 63–68, and 15 s fails the archers and the Rootbreaker.
- **The Elder Sporeling's splash is worth 9–18 points to the swarm** under waves. Waves roughly double merges, so Elders come out in numbers.
- **G4 now binds.** 30–48% of battles end in a Decision, with medians of 8:30–9:52. The Burster's burst adds about 20 points, the Mortar's clouds about 15, and two-type mixed waves 8–13 when the counters are off.
- **Many answers to the swarm win by Decision,** holding more ground at 10:00 rather than taking the Heartcap. Mono Sporeling against Capguard + Scythecap ends in a Decision 56–67% of the time. So the strict bar's pass for the swarm seemed to lean on the 10:00 rule. P1d re-checked it, and the answers that pass win outright.

### P1d: fewer stalls, and the shields carry the strict bar

P1d first fixed a leak in P1c's code: a dead-unit rule ran even with the Burster off, so a few battles with commander powers differed from `develop`. Then it made `rework` the new base and added a stalemate breaker:
- **The new `rework`:** the six settings with mixed waves at two types, plus the Burster, with the Elder Sporeling's splash off, at a 20 s beat. Cleave stays a separate setting.
- **`stormwaves`:** each Sporestorm stack makes both sides' waves 20% bigger, so they're twice as big at five stacks (8:00), like Clash Royale's double elixir.

| Variant | G3 fails | G4 median / Decisions | Strict counter bar |
|---|---|---|---|
| The new `rework` | Sporeling 81 / 84 | 8:42 / 28% | passes |
| Without the Mortar's clouds | Sporeling 83 / 86, Veilstalker 45 / 61 | 8:26 / 22% | passes |
| With `stormwaves` (20 seeds) | Sporeling 82 / 85, Veilstalker 68 / 78 | 8:19 / 20% | not run |
| Both | Sporeling 85 / 86, Veilstalker 72 / 87 | 8:02 / 18% | passes |

- **Both stall routes together come closest.** 18% of battles end in a Decision, one game in 40 over the limit, and G3's Decisions fall back to today's 7%.
- **The swarm's answers win outright.** With both routes, Sporeling + Veilstalker beats mono Sporeling 100 / 100 / 86 with almost no Decisions. The answers that won by holding ground drop out.
- **The storm feeds the runners.** Bigger waves give `bot:balanced` more merged units, and Veilstalkers deal triple damage to those. Mono Veilstalker took the Heartcap in 13 of 16 games with the storm, against 4 of 16 without it.
- **The shields carry the strict bar.** In a check after P1d, under the new `rework`, Sporeling + Veilstalker beat mono Sporeling 93 / 91 / 71. With mixed waves at three types, a two-building army never gets shields, and the same pair won 52 / 54 / 36, so the strict bar failed. Neither side builds Burster Pods in those games.

### Where it stands

- **By P4's test, Level 2 hasn't failed.** Every strong mono build has an answer on every map, mostly winning outright. That rests on the mixed-wave shields, a direct reward for fielding two unit types.
- **G4 is a game from passing,** with the Mortar's clouds off and the storm growing waves.
- **G3 still fails on the swarm.** Even with shields and a few Pods, `bot:balanced` loses to mono Sporeling, and to mono Veilstalker once the storm grows waves.
- **The user answered P1d's questions,** and P2 started ([Decisions](#decisions-2026-10-30)):
  - G3 stays a bar, and `bot:balanced` stays as it is. G8 settles what G3's failure means;
  - the storm stays at 20% a stack, and 18–22% Decisions is accepted for P2;
  - the Mortar's clouds leave `rework`.

## What P2 found

P2 ran on 2026-10-31 and was cut short at the user's call, for a playtest ([Decisions](#decisions-2026-10-30)). The full tables are in the [backlog](../balance-backlog.md#combat-rework-p2-2026-10-31). G3 is at 50 seeds per seat, mean / worst map, and G4 at 200 games.

| Run | G3 fails | Strict counter bar | G4 Decisions |
|---|---|---|---|
| Today | Gill Nest 88 / 100, Sporeling 74 / 77, Amanita 51 / 64 | fails | 7.5% |
| **The package** | Sporeling 85 / 86, Veilstalker 72 / 87 | **passes** | **12.5%: passes** |
| − waves | Sporeling 74 / 80, Gill Nest 79 / 94, Amanita 55 / 71 | fails | 22.5% |
| − pinned | Sporeling 83 / 85, Gill Nest 73 / 80, Veilstalker 72 / 90 | passes | 14.5% |
| − call for help | Sporeling 87 / 94, Veilstalker 73 / 87 | passes | 12.5% |
| − the Rhizomorph | Sporeling 86 / 89, Veilstalker 71 / 84 | passes | 8.5% |
| − the shields | Sporeling 95 / 97, Gill Nest 66 / 75, Veilstalker 81 / 88, Morel 68 / 78 | fails | 9.5% |
| − the Burster | Sporeling 87 / 90, Veilstalker 76 / 93, Morel 59 / 69 | passes | 8.5% |
| − the Elder change | Sporeling 94 / 95, Veilstalker 72 / 83 | passes | 7.0% |
| − the storm | Sporeling 83 / 86, Veilstalker 45 / 61 | passes | 27.0% |

- **Every piece but the Rhizomorph carries something:**
  - waves carry almost everything: without them the strict bar fails, the archers come back, and stalls rise;
  - the two-type shields carry the strict bar. Off, or at three types so that no pair gets them, mono Sporeling's best answer wins 44% on Twin Roots;
  - the storm keeps battles short;
  - pinning keeps the archers down;
  - call for help keeps G2's counter graph healthy: without it, the Gill Archer wins no supply duel;
  - the Burster and the Elder change hold the runners and the swarm in G3.
- **The Rhizomorph carries nothing measured.** Without it every bar holds, and Decisions fall to 8.5%. The package without it wasn't measured as a whole.
- **G4 passes.** P1d's 18% was 7 of 40 games. Over 200, the same package ends 12.5% of battles in a Decision.
- **The adaptive general doesn't answer the swarm either,** so G3's failure isn't only `bot:balanced`'s fixed mix. Under the package the general read the swarm as elite units in 155 of 199 reads, because waves make nearly every Sporeling merge. A fix for the read makes it read the swarm right every time, but its counters to a swarm (Capguards, Burster Pods, Tunnels) aren't the answer the counter matrix found (Sporeling + Veilstalker). It still wins only 24% against mono Sporeling, against 29% today.
- **The other checks:**
  - G2 passes, and G1 fails as it does today.
  - G5 is 3 points over (78%), and G7's mirror 2 points over (72%), since waves nearly quadruple merges.
  - A side 6 columns behind at 3:00 wins 88%, against 55% today.
  - There are still no comebacks in 360 battles, and Decisions in those battles rise from 7 to 29, mostly against the Lichen Baron.
  - Runs with commanders win a little more often (60 of 240, from 54), but more end in battle 1 (108, from 79), all with Armilla and Cordis. Waves cause it: without them, 68 end there.

After P2, `rework` gained the general's swarm read and flyers, for the playtest. With both, G4 still passes (12% at 200 games), G2 stays healthy, and the strict bar passes. `bot:balanced` builds a Drift Stalk in about a fifth of its games, and flyers answer the swarm: Amanita + Drift Stalk beats mono Sporeling 100 / 100 / 94.

**But mono Drift Stalk takes over G3,** at 93 / 96 / 78, and beats three of the four battle-1 generals; only the Lichen Baron holds. [flyers.md](flyers.md) names this risk. Its two fallbacks are being measured: rule C, where every unit reaches a flyer but ground melee deals it half damage, and a 2-supply Driftling with double stats.

## Prototype plan

### P0: the counter matrix on today's rules (done)

Built `--checks counters` (`evaluateCounters` in `tools/lib/balance.ts`) with worker threads, and ran it on today's rules, on `feature/counter-matrix`. The expected result was that nothing answers mono Gill Nest. Instead, every strong build has an answer, and mono Sporeling is the hard one ([What P0 and P1 found](#what-p0-and-p1-found)).

### P1: build the package (done)

Built on `feature/combat-rework`, alongside P0:
- the five settings, with their presets and unit tests, and the `rework` preset;
- the wave hooks for relics and perks;
- an `applyProto` that can add units, buildings and generals, so the Rhizomorph exists only under its setting and the golden hashes don't move;
- the AI's use of the Rhizomorph and the Mortar;
- the display.

The first read is in [What P0 and P1 found](#what-p0-and-p1-found).

### P1b: aim the package at swarms and mixed armies (done)

The same session, on the same branch. Each change is measured on its own as well as in `rework`:
- **Waves arrive together.** Deeper buildings release earlier, so each side's wave reaches its front as one block. Nothing waits on the field.
- **A hold lasts one beat at most.** After a held beat, the next beat always releases both waves. The AI still doesn't hold under waves.
- **The Mortar aims at the densest cluster** of enemy units in range. Clouds still stack, and get no slow yet, so the retarget is measured on its own.
- **The Rhizomorph stays out of turret range** when it surfaces, and prefers ranged units near the front over spawners.
- **Test bots don't buy the Rhizomorph's building,** so each answer in the counter matrix is what its name says.
- **`mixedWave`, a new setting:** when a lane's wave holds three or more unit types, each of its units gets a shield worth 20% of its max HP on release. It joins `rework` only if it helps.
- **`pinned` stays in every variant.** Pace matching stays on, and the headline numbers are reported with it off as well.

**Checks:** G3 (20 seeds per seat to screen, 50 for any number quoted), the counter matrix against the stricter bar, and G4.

**Variants:**
- each change alone;
- `rework` with all of them;
- `rework` plus `mixedWave`;
- `rework` without waves.

A variant that passes G3 goes on to P2's other checks.

It ran as planned, and `mixedWave` joined `rework`. No variant passed G3 ([results](#p1b-waves-arrive-together-and-the-swarm-runs-away)).

### P1c: area damage that travels with the army (done)

The same session and branch. P1b found that, apart from the archers, every mono build still failing G3 is a cheap, fast, 1-supply unit, and that the Mortar's area damage answers the swarm only where it stands. P1c tested:
- **`cleave`:** a Scythecap's swing hits every enemy unit within 1 tile of its target at full damage, where today it reaches 0.8 tiles at half damage. Its merge perks reach 1.2 and 1.4 tiles.
- **`burster`:** a new unit, the Burster, and its building, the Burster Pod (working names).
- **The Elder Sporeling's splash,** with and without.
- **`mixedWave` at two unit types** against three, keeping whichever helps `bot:balanced` more.
- **A beat re-sweep** at 15, 17 and 20 s, with the counters on.

**The Burster:** 50 HP, light armor, speed 1.6, 1 supply, and no normal attack. It heads for the enemy unit with the most enemy units within 1.5 tiles, and bursts when it reaches it or when it dies. The burst deals 40 damage that ignores armor to every enemy unit within 1.5 tiles, and leaves a spore cloud (1.5 tiles, 4 s, 10 damage a second). It never hits buildings or friends. The Pod costs 130 gold and makes one every 10 s.

No variant passed G3 and G4 together, so P2's other checks weren't run ([results](#p1c-the-strict-bar-passes-and-battles-stall)).

### P1d: fewer stalls (done)

The same session and branch, on 2026-10-31, with the user's answers to P1c's questions:
- fix the leak first;
- the new base, at a 20 s beat;
- two ways to cut stalls, alone and together: `rework` without the Mortar's clouds, and `stormwaves`, a Sporestorm that grows waves.

Nothing passed G3, G4 and the strict bar together, so P2's other checks weren't run ([results](#p1d-fewer-stalls-and-the-shields-carry-the-strict-bar)).

### P2: measure (done)

Ran in the same session and on the same branch on 2026-10-31, with the user's answers to P1d's questions ([Decisions](#decisions-2026-10-30)). It was cut short for the playtest, so step 3's G3 runs, most of step 4's checks and any package with two pieces removed weren't run ([results](#what-p2-found)).

**The package:** `rework` becomes P1d's base without the Mortar's clouds, plus `stormwaves`. That's waves at a 20 s beat, pinning, call for help, the Rhizomorph, mixed waves at two types, the Burster, the Elder Sporeling without its splash, and a Sporestorm that grows waves 20% a stack. Cleave stays out. P3 can then playtest with `?proto=rework` alone.

**Runs, in order:**
1. The package, with every check below.
2. The package with one piece removed at a time, starting with waves, each with G3, the strict counter bar and G4. The shields are removed two ways, off and at three types, and the storm is removed too.
3. Each piece alone on today's rules, where it works alone, with G3 and G4.
4. Every check on any smaller package that matches the full one on the strict bar and G4. Those are the candidates to adopt.

Each run notes which bots build each piece, so a piece nobody builds isn't read as a piece with no effect.

**Checks:**
- G3 on every map;
- the strict counter bar;
- G4, at 200 games instead of 40, since 40 games leaves about ±6 points;
- G1–G2 duels, and G5–G8. G8 matters most here: the adaptive general against mono Sporeling and mono Veilstalker, beside today's rules. If the general answers the swarm, G3 fails only because its fixed mix never adapts;
- `engagement` (the opening, the Heartcap cliff, comebacks) and `runs` (battle-1 losses, boss reach), played with commanders.

**Bars:**
- Every mono build with a G3 mean above 40% has an answer that wins ≥ 60% on every map.
- G3 passes for every mono bot: mean ≤ 55%, worst map ≤ 60%.
- G4 stays in band: median 5:30–8:30, Decisions ≤ 15%. P2 reports against the Decisions limit but doesn't tune for it.
- G2's counter graph stays healthy.
- More comebacks than step B's 2 in 360 would be a bonus.

P2 measures and doesn't retune. The runs with one piece removed show which pieces carry the result, so the fewest can be adopted.

### P3: playtest

Play battles and full runs on the dev site with `?proto=rework`: P2's package, plus the general's swarm read and flyers. A prototype run saves on the dev site, apart from the real save ([#34](https://github.com/Swalliso/Sambattler/pull/34)). The questions:
- Did any battle feel decided by one unit type?
- When the general massed something, could you answer it, and did you know how?
- Do the waves give a battle rhythm, or make it feel less alive?
- Do the spore clouds, Rhizomorphs and flyers read clearly, and can you tell what can hit a flyer?

What P2 says to watch for:
- battle 1 is harder with Armilla and Cordis;
- falling back early is a big edge;
- there are still no comebacks;
- the general doesn't answer a swarm;
- an army of only flyers is too strong. To try rule C, add its settings: `?proto=rework,flying.reachSupply:1,flying.meleeMult:0.5`;
- the Rhizomorph may not earn its place.

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
- §11: the Rhizomorph, the Burster, the Driftling, the Mortar and the Scythecap.
- §12.3: G12.
- §17 #7: burrowing and flying.
- §7: the AI, for Rhizomorph, Burster, Drift Stalk and Mortar use, counter weights, and reading a merging swarm.

**Code:**
- **Sim systems:**
  - `src/sim/systems/spawning.ts`: the wave reserve.
  - `src/sim/systems/stance.ts`: how Hold works with waves.
  - `src/sim/systems/targeting.ts`: call for help, pinning, Rhizomorph targets, the Mortar's and the Burster's aim at the densest cluster, and who can reach a flyer.
  - `src/sim/systems/movement.ts`: moving underground, flying over ground units, and formation.
  - `src/sim/systems/combat.ts`: the pinned attack rate, the mixed-wave shield, cleave, and the Burster's burst.
  - `src/sim/systems/clouds.ts`: spore clouds, from the Mortar's shells and the Burster's bursts.
- **State and settings:**
  - `src/sim/state.ts`: clouds, burrow state and the wave reserve.
  - The settings themselves: `src/data/schema.ts`, `src/sim/compile.ts` and `src/data/proto.ts`.
  - `applyProto`, so it can add new entries.
  - The Rhizomorph's and the Burster's unit and building data, under their settings.
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
- **A bonus for mixed waves,** such as a shield for any wave with three or more unit types. This rewards diversity directly, instead of only punishing mono builds. P1b tests it as a setting, `mixedWave`.
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

After P0 and P1 reported, later the same day, the user approved re-aiming the plan:
- **The target is swarms and mixed armies,** not archers, since mono archers have answers on today's rules.
- **P1's questions are answered for P1b:**
  - waves arrive together, because deeper buildings release earlier;
  - a hold lasts one beat at most, and the AI doesn't hold under waves yet;
  - the Mortar aims at the densest cluster;
  - the Rhizomorph avoids turret range and prefers ranged units near the front;
  - hand-written test bots don't buy the Rhizomorph.
- **`mixedWave` gets tested** as a setting, from the relic and perk idea.
- **`pinned` stays** in every variant.
- **The counter-matrix bar is stricter:** an answer that wins at least 60% on every map.

After P1b reported, the user approved P1c, with these answers to P1b's questions:
- **Waves stay,** and the preset stays at 20 s. P1c re-sweeps the beat with the counters on, with 17 s as the lead.
- **Twin Roots stays in the bar.** If only Twin Roots fails, P1c reports it as a lane-AI suspect.
- **`mixedWave`:** test two unit types against three, and keep whichever helps `bot:balanced` more.
- **The clouds' cost in G4 is accepted for now,** but every confirmed variant reports G4 and which matchups end in Decisions.

On 2026-10-31, after P1c reported, the user approved P1d:
- **The beat is 20 s.**
- **The Elder Sporeling's splash is off under `rework`.** The shipped unit keeps it.
- **Cleave leaves `rework`,** and stays a setting of its own.
- **Mixed waves stay at two types.**
- **The Burster joins `rework`.** "Burster" and "Burster Pod" stay working names.
- **Stalls get both routes:** measure `rework` without the Mortar's clouds, and a Sporestorm that grows waves.

On 2026-10-31, after P1d reported, the user approved P2, with these answers to P1d's questions:
- **G3 stays a bar,** and `bot:balanced` stays as it is. G8 settles what G3's failure means: if the adaptive general answers the swarm, the failure is the fixed mix. If it doesn't, teaching the general the rework's answers is a follow-up to decide then.
- **The storm stays at 20% a stack.** P2 accepts 18–22% Decisions and measures G4 at 200 games.
- **The Mortar's clouds leave `rework`.** Spore clouds stay in the game through the Burster.
- **`rework` becomes P2's package:** P1d's base without the Mortar's clouds, plus the storm.
- **P2 measures only.** A number that looks wrong, such as the shield's size, comes back to the user with the evidence.

On 2026-10-31, with P2's first results in, the user chose to playtest before measuring further. Missing pieces such as flyers will move the balance anyway, so the combat should reach a stable, playable state first:
- **Wrap up P2** with the results in hand.
- **Build flyers before the playtest,** into `rework`, as [flyers.md](flyers.md) designs them.
- **Fix the general's swarm read** under `rework`.
- **Save prototype runs on the dev site** ([#34](https://github.com/Swalliso/Sambattler/pull/34)).
- **Merge it all into `develop`** for the playtest.
