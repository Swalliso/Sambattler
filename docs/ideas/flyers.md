# Flyers: spores on the wind

Drafted on 2026-10-31 against `c556f3c`, with the combat rework's package as P1c left it on `feature/combat-rework` (`e648dee`). **Nothing here is built or adopted.** The user approved flying units in principle on 2026-10-30 ("Burrowing and flying units are in") and scheduled them for after P2 of the [combat rework](combat-rework.md#flyers-later), so that the rework's pieces could be measured cleanly first. This is the design to build once P2 ends. Rule changes still need the user's OK, with numbers; the numbers here are starting points for that measurement.

P1, P1b and P1c's results are in the backlog on `feature/combat-rework` (sections "Combat rework P1", "P1b" and "P1c"), which isn't merged yet, so they're cited here without links.

## In short

- **Who can hit a flyer: anything with reach.** That means ranged units, Heartcap turrets, other flyers, spore clouds, commander powers, and melee units of 2 or more supply. The 1-supply small fry (Sporelings, Veilstalkers, Morel Runners, Bursters) can't, and merging doesn't change that.
- **Why not "ranged only",** the rule in most games: we have one ranged unit. The Gill Archer would be the only anti-air that walks, so every army would need archers, the build G3 fails worst. And `bot:balanced`, which is mostly melee, couldn't answer mono flyers.
- **Its job is the cheap swarms.** Mono Sporeling keeps escaping its answers: under P1c's package it still beats `bot:balanced` 89–91% at a 20 s beat. A swarm can't hit what floats over it, so this answer holds at any army size and on every map, Twin Roots included.
- **It isn't an archer answer, and it isn't food for archers either.** Archers keep their answer (Sporeling waves). The flyer's predators are the line (Capguards, Scythecaps) and the turrets.
- **Brakes against a new takeover:**
  - most of `bot:balanced` can hit it;
  - light armor, so slash shreds it;
  - it holds no ground, so it can't push the border or win a Decision;
  - it fights the nearest enemy rather than hunting;
  - the general gets an Anti-Air counter.

  The diver's Morel takeover and P1b's "cheap, fast, 1-supply" pattern make mono flyers' G3 the first number to read.
- **Units:**
  - the **Driftling**: 70 HP, light, 8 slash a second, 1 supply. Its Drift Stalk costs 160 and makes two every 18 s;
  - a second flyer, the **Bloatcap**, only if P2 still fails G4 on Decisions. It's a slow balloon that bombs buildings over a held front.

  No new anti-air unit.
- **With the rework's pieces:**
  - clouds reach flyers, but the Mortar's shell doesn't;
  - cleave does, since Scythecaps have reach;
  - the Burster's roll and burst don't, but its cloud does;
  - only units that can hit the attacker answer a call for help;
  - a flyer in contact pins an archer;
  - flyers ride with their wave.
- **Measurement:** one default-off preset, `flyers`, with the rule as a setting, so "ranged only" and "everyone at half damage" are one override each. The checks run on top of P2's package: G3 with the mono Drift Stalk added, the strict counter bar, and G4.
- **Recommendation:** build it once P4 has adopted a package. Measure the reach rule against the two alternatives, and adopt only if G3, the strict bar and G4 all pass.

## What a flyer is

Four new properties:
- **It passes over ground units.** It doesn't collide with them, so it can't block or be blocked. It still separates from other flyers, and keeps to its lane like every unit. Flying over the root walls between lanes would change Twin Roots' lane choice, and isn't proposed.
- **Only attacks with reach can hit it** ([the rule](#the-pick-reach)).
- **It holds no ground.** It adds no presence (SPEC §4.3), like a tunnelling Rhizomorph. It can't capture a column or stop one being captured, so it can't win a Decision on columns (§6.5).
- **It hits ground and air,** buildings and the Heartcap included, from just overhead.

Everything else follows today's rules: targeting (preferred class first, then the nearest), merging, Hold and the Sporestorm.

## Who can hit a flyer

The combat rework doc names the risk: if only ranged units can hit a flyer, it's food for archers rather than an answer to them.

### The options

| Option | Rule | Who does it | For | Against |
|---|---|---|---|---|
| **A. Ranged only** | Ranged units, towers and turrets hit flyers. Melee never does | Clash Royale, StarCraft II, Warcraft III, Kingdom Rush, and Mechabellum mostly | The genre's standard. The clearest to read, and the strongest identity | We have one ranged unit, so the archer becomes the only anti-air that walks. A mostly-melee mix can't answer mono flyers. Every melee unit is useless against flyers (SPEC §12.1) |
| **B. Ranged, plus melee units tagged anti-air** | As A, plus chosen melee units | Mechabellum (Fangs and Mustangs shoot up, Crawlers and Rhinos don't), Kingdom Rush (the Barbarians' Axe Throw), Plants vs. Zombies (the Cactus stretches up) | Anti-air without archers, and the designer chooses the counter web | Which melee units get the tag can look arbitrary, and has to be learned |
| **C. Everyone, at a penalty** | Melee hits flyers for a fraction, such as ×0.5 | Battle Cats (Floating is a trait: every cat fights it, some are strong against it) | No immunity, so no takeover by immunity. Simple | A flyer becomes another row of the damage matrix. It answers nothing hard, so it doesn't fix a build with no answer |
| **D. Flyers land to attack** | Out of melee reach while flying, open to anyone while attacking | StarCraft II's Viking; Warcraft III's Web, which forces a flyer down | Melee stays useful | It's a diver that can be shot on the way in. The Rhizomorph already does that job, and in P1 it surfaced alone and died |

### What this game needs from the rule

- **Our ranged roster is one unit.** The Gill Archer is the only ranged unit, the Mortar lobs its shells, and the turrets sit at home. Rule A works in other games because they have ranged units of every size and price. Here it would push every army toward archers.
- **The reference mix is mostly melee.** Of `bot:balanced`'s 13 army weights, 8 buy units of 2+ supply (Capguard 3, Gill Nest 2, Scythecap 2, Rootbreaker 1), and 4 buy the small fry (Sporeling 3, Veilstalker 1). Under rule A, only its archers (2 of 13) and its turrets could fight a flyer.
- **The open problem is the swarm.** P1b found that, apart from the archers, every mono build still failing G3 under the package was a cheap, fast 1-supply unit. A flyer the small fry can't touch answers exactly those, and leaves the rest of the web alone.
- **Not a second diver.** The Rhizomorph covers "reach the mass behind the front".

### The pick: reach

**A flyer can be hit by:**
- ranged units (the Gill Archer);
- Heartcap turrets;
- other flyers;
- spore clouds, from Mortars or Bursters;
- commander powers;
- melee unit types of 2 or more supply: Capguards, Scythecaps, Hammercaps, Rootbreakers, Amanita Knights, and the Rhizomorph once it has surfaced.

**It can't be hit by:**
- the small fry: Sporelings, Veilstalkers, Morel Runners, Bursters and Tenders. Reach goes with the unit type, so merging doesn't change it;
- the Mortar's shell or its splash. It's a lob, and lobbed attacks can't hit flyers in Kingdom Rush or Plants vs. Zombies either.

**Splash follows its attacker.** A Scythecap's cleave reaches flyers around its target. An Elder Sporeling's splash doesn't.

Why this one:
- **It's option B, with a rule you can see.** Big units can swat a flyer and small ones can't. Each building's card already shows its unit's supply, and size shows on the field. StarCraft II's Colossus is the precedent: it's so tall that anti-air can hit it.
- **A mixed army already has reach.** Its line answers flyers, and its small fry are what flyers eat. A mono swarm has no reach at all.
- **Archers stay one answer among several,** so flyers don't push anyone toward the build G3 already fails.
- **It keeps one hard edge, and aims it at the swarm.** Immunity is the one counter that doesn't lose to numbers: a mass of Sporelings deals nothing to a flyer, however big the mass grows. That's the scale problem from the rework doc's [three causes](combat-rework.md#three-causes), turned against the swarm.

**The cost:** tier-1 small fry are useless against flyers, which bends SPEC §12.1 ("no unit is useless against anything"). The user has said the spec isn't a limit, but the exception should be a deliberate one.

**The softer variant** lets merged forms reach, since a Bloomed Sporeling is 2 supply. It's one setting, measured beside the pick. It isn't the pick because waves roughly double merges (P1), so most of a swarm would reach, and the flyer would lose its job.

Rules A and C stay in the measurement as overrides of the same setting ([Settings](#settings)).

### Spore clouds, cleave and the Burster

| Piece | Does it reach a flyer? | Why |
|---|---|---|
| Spore clouds (Mortar and Burster) | Yes, at the full rate | Spores in the air. A flyer hovering in an enemy cloud takes 10 a second; one passing through takes little |
| The Mortar's shell and splash | No | A lob. Its aim counts ground units only |
| Cleave | Yes | Scythecaps have reach, so the cleave around their target catches flyers at full damage. It's the best answer to a clump of Driftlings |
| The Burster | Its roll and burst: no. Its cloud: yes | It's 1 supply, so it never aims at a flyer, and its burst skips them |
| Pinning | A flyer in contact pins an archer | It's in contact. Flyers aren't ranged, so they're never pinned |

## Its job in the counter web

### Which build it answers

Mono Sporeling first, then the other cheap swarms:
- **Mono Sporeling** has been the build short of answers since P0. On today's rules `bot:turtle` wins 61% against it overall and 21% on Twin Roots ([P0](../balance-backlog.md#mono-sporeling-on-twin-roots)). Under P1c's package it passes the strict bar only with the Burster, and still beats `bot:balanced` 89–91% at a 20 s beat.
- **Mono Morel and mono Veilstalker** are the next two cheap builds. Under P1b's `rework` they failed G3's worst map (Morel 55 / 65, Veilstalker 51 / 75); with the Burster they pass. On today's rules mono Morel sits exactly on the G3 line (55 / 57).

Why the air axis suits the swarm:
- **Area damage can be out-massed, and immunity can't.** P1c found that area damage that travels with the army answers the swarm when it lands. A flyer doesn't need anything to land.
- **It doesn't depend on the map.** Mono Sporeling escaped its answers on Twin Roots, where the one-lane answers (Capguards behind Mortars) mostly fail (P0, P1b). A flyer is out of the swarm's reach in either lane.
- **A small stake grows.** Against a swarm, a Drift Stalk's Driftlings never die, so a mixed army with one Stalk keeps every flyer it makes. That's an edge a mixed army gets from being mixed, which the rework doc says is missing ([What P0 and P1 found](combat-rework.md#what-p0-and-p1-found)).

### What answers it

| Answer | How |
|---|---|
| Capguards and Scythecaps | Slash ×1.5 on light armor. A Capguard kills a Driftling in 4 hits, and cleave hits a clump |
| Heartcap turrets | 18 pierce a second each, 2 per lane: a Driftling every 2 s near home |
| Gill Archers | They fire first while it crosses 5 tiles, and a mass focuses whatever arrives. As with Sporelings, the result depends on how many arrive together |
| Amanita Knights, Hammercaps and Rootbreakers | They have reach. A Knight kills a Driftling in 2 hits |
| Spore clouds | A clump hovering in one takes 10 a second each |
| Other flyers | Air to air |

**Rough 12-supply duels,** done the way §11.4 does them, for G2 to confirm. Each cell is the time to kill all of the other side's 12 supply, with every unit engaged and no overkill:

| 12 Driftlings against | Driftlings' time to kill them | Their time to kill the Driftlings | Winner |
|---|---|---|---|
| 12 Sporelings | 6.0 s | never | Driftling |
| 12 Morel Runners | 10.0 s | never | Driftling |
| 6 Capguards | 13.8 s | 6.7 s | Capguard |
| 6 Scythecaps | 12.5 s | 7.6 s, less with cleave | Scythecap |
| 4 Rootbreakers | 19.2 s | 20.0 s | even |
| 4 Amanita Knights | 41.7 s | 7.0 s | Knight |
| 6 Gill Archers | 4.6 s | 12.0 s | Driftling in a duel; see below |

**About the archers:** in an even duel the Driftling wins, as the Sporeling does. That comes from being a light 1-supply unit with slash, not from flight. In the lane, the archer mass shoots first while the Driftlings cross 5 tiles (3.6 s at 1.4 tiles a second), and the outcome depends on how many arrive together, as it does for Sporelings. The intended G2 edges are the first four rows. The archer edge gets read, not asserted.

### How it avoids becoming a takeover

The warnings are on record:
- The diver turned Morel Runners into a takeover (65% on Bogwater), by giving a cheap, fast unit a free edge ([Diver prototype](../balance-backlog.md#diver-prototype)).
- P1b found that, apart from the archers, the builds still failing under the package are cheap, fast and 1-supply.

The Driftling is cheap and 1-supply, with a free edge against the small fry. The brakes:
- **Most of a mixed army can hit it.** 8 of `bot:balanced`'s 13 army weights buy units with reach, and the line beats the Driftling per supply.
- **Light armor:** slash ×1.5 from Capguards, Scythecaps and Knights.
- **It holds no ground.** A flyer army can't push the border, so it can't build forward or win a Decision. Something else has to hold its ground.
- **No chasing edge.** Its speed is 1.4, below the Sporeling's 1.5, and it fights the nearest enemy (SPEC §5.2), so it meets the line rather than flying past it to hunt the small fry.
- **Turrets and clouds.** Home turrets shoot it, and a clump hovering in a cloud takes the full rate.
- **The general answers it** with an Anti-Air counter ([The general](#the-general-7)).

What could still make it a takeover, with the fallback for each:
- **`bot:balanced`'s small fry feed it more than its line hurts it.** Make the Driftling 2 supply with double stats: fewer bodies, the same value per supply.
- **"Sporelings and Driftlings" win as a pair.** That's two unit types, so every wave gets mixed-wave shields. That's the shield rule working as written, so trim the shield before the flyer.
- **Mono Drift Stalk beats `bot:balanced`.** Use rule C (melee at ×0.5) instead of immunity.

### The web, with flyers

Today's triangle holds between pure builds: Sporelings beat archers, archers beat Capguards, and Capguards beat Sporelings (P0). The flyer adds a second axis:
- Driftlings beat the small fry: Sporelings, Morel Runners, Veilstalkers and Bursters.
- The line beats Driftlings: Capguards, Scythecaps, Amanita Knights and Hammercaps.
- Driftlings beat archers in an even duel, as Sporelings do. In the lane it depends on how many arrive together.

Each mono build is missing something:
- the swarm has no reach;
- mono flyers hold no ground, and lose to the line;
- the line loses to archers;
- archers lose to a melee wave that reaches them.

A mixed army covers both axes. That's Mechabellum's point about counters on more than one axis ([the rework doc](combat-rework.md#6-counters-on-more-than-one-axis)).

## How other games do it

### Mechabellum

- **The flyers:** Wasps are cheap, fast, fragile flyers that hit air and ground. Phoenixes and the giant Overlord fly too.
- **Ground units that can't shoot up:** many ground units are ground-only, including the Sledgehammer, Vulcan, Rhino, Arclight, Crawler and Steel Ball. Mustangs, Marksmen and Fangs can hit air.
- **So the counters cross.** Wasps beat Vulcans, which can't shoot up, and Marksmen, whose big single shots are wasted on them. Mustangs, Fangs, Fortresses, Wraiths and Typhoons beat Wasps.
- **What we take:** air is one axis among several, and a cheap flyer is the answer to whatever can't look up.
- **Sources:** [Gamepressure's unit list](https://www.gamepressure.com/S013-amp.asp?ID=22075) (what each unit can target) and [Pro Game Guides' counter list](https://progameguides.com/mechabellum/all-mechabellum-unit-counters-list/).

### Clash Royale

- **Every card says what it targets:** ground, air and ground, or buildings.
- **Minions:** three fast, unarmored flyers that hit air and ground. Ground-only troops can't attack them, which also means Minions can't distract a ground-only troop the way a ground unit can.
- **Balloon:** a flyer that targets buildings only, with high HP and very high damage. When it's shot down, it drops a bomb that goes off 3 s later.
- **Their answers:**
  - cheap ranged troops: Musketeer, Archers, Wizard;
  - air swarms: Minions and Bats bring a Balloon down;
  - anti-air buildings such as the Inferno Tower;
  - area damage against flyer swarms.
- **What we take:**
  - a rule printed on each card;
  - a cheap flyer swarm that ground melee can't touch;
  - a building-only flyer that a stalled defense can't stop: the [Bloatcap](#the-bloatcap-only-if-p2-leaves-decisions-binding).
- **Sources:** Clash Royale Wiki, [Minions](https://clashroyale.fandom.com/wiki/Minions) and [Balloon](https://clashroyale.fandom.com/wiki/Balloon).

### StarCraft II

- **Weapons hit ground, air or both.** The Thor carries both.
- **The Colossus** is a ground unit, but it's so tall that it counts as air too, so anti-air such as a Missile Turret can hit it. Height decides who can hit whom.
- **The Viking** switches between a flying fighter mode and a landed assault mode, and anti-air can shoot it mid-change. Landing to attack makes a different kind of unit, not a flyer.
- **What we take:** size and height can decide reach. That's our rule's precedent.
- **Sources:** StarCraft Wiki, [Colossus](https://starcraft.fandom.com/wiki/Colossus) and [Viking](https://starcraft.fandom.com/wiki/Viking).

### Plants vs. Zombies

- The **Balloon Zombie** floats over almost every plant, the Tall-nut included.
- **Only two plants can pop it:** the **Cactus**, which stretches up to shoot it, and the **Cattail**. A **Blover** blows it off the lawn.
- **Popped,** it walks on as an ordinary zombie.
- **What we take:**
  - a few named plants with reach;
  - grounding, as a way back into the fight;
  - a one-shot area answer.
- **Sources:** Plants vs. Zombies Wiki, [Balloon Zombie](https://plantsvszombies.wiki.gg/wiki/Balloon_Zombie_(PvZ)) and [Cactus](https://plantsvszombies.wiki.gg/wiki/Cactus_(PvZ)).

### Warcraft III

- **Melee units can't attack air, and neither can Crypt Fiends.** Their **Web** binds an air unit and forces it down for 12 s (7 s on heroes). A webbed flyer can be hit as a ground unit, by melee too.
- **What we take:** grounding makes melee useful against air without giving it an air attack. It's a lever for later, not part of this design.
- **Source:** Warcraft Wiki, [Crypt Fiend](https://warcraft.wiki.gg/wiki/Crypt_Fiend_(Warcraft_III)).

### Kingdom Rush

- **Flyers pass over the barracks' soldiers,** who can't block them. **Artillery towers can't attack flyers,** with a few exceptions. Archers and mages can, and a few upgrades give reach, such as the Barbarians' Axe Throw.
- **What we take:** this is our problem in tower-defense form. A defense built on blockers and lobbed area damage has no answer to flyers. That's why the Mortar's shell shouldn't reach them: flyers then become the answer to the Mortar turtles that stall G4.
- **Sources:** Kingdom Rush Wiki, [Gargoyle](https://kingdomrushtd.fandom.com/wiki/Gargoyle) and [Artillery Towers](https://kingdomrushtd.fandom.com/wiki/Artillery_Towers).

### Battle Cats

- A one-lane tug-of-war like ours.
- **Floating** is a trait, like a color, not a way of moving. Cats fight floating enemies as they fight anything else, and some cats are strong against them.
- **What we take:** rule C, a type with no immunity. It's the fallback setting.
- **Sources:** Battle Cats Wiki, [Floating Enemies](https://battle-cats.fandom.com/wiki/Category:Floating_Enemies), and [Saber the Cat](https://battle-cats.fandom.com/wiki/Saber_the_Cat_(Special_Cat)) for a cat that's strong against floaters.

### Company of Heroes

- Generally only infantry capture points. Vehicles fight, but don't take ground.
- **What we take:** a unit class that fights but doesn't hold ground. Flyers hold none.
- **Source:** [coh2.org's introduction to the series](https://coh2.org/guides/1987/introduction-to-coh-franchise).

### What we take, together

| Idea | From | Here |
|---|---|---|
| Reach set per unit, printed on the card | Clash Royale, Mechabellum | The reach rule, shown in tooltips |
| Height decides who can hit | StarCraft II's Colossus, the PvZ Cactus | Reach by supply |
| Lobbed area damage can't hit air | Kingdom Rush's artillery, Plants vs. Zombies | The Mortar's shell doesn't reach |
| A cheap flyer for whatever can't look up | Mechabellum's Wasps, Clash Royale's Minions | The Driftling |
| A building-only flyer | Clash Royale's Balloon | The Bloatcap |
| It fights, but doesn't hold ground | Company of Heroes' vehicles | Flyers hold no ground |
| A trait, not immunity | Battle Cats | Rule C, the fallback |
| Grounding | Warcraft III's Web, the popped Balloon Zombie | Later, if reach needs a lever |

## The rework's pieces

| Piece | With flyers |
|---|---|
| Waves | Flyers wait inside their building and leave on the beat, like everyone else. With pace matching, they keep the wave's pace. They don't count as the melee front that idle archers stay behind, since they can't shield anything; idle flyers hover over that front instead. P1b's early release for deeper buildings applies to a Drift Stalk as to any spawner |
| Hold | A held lane keeps its flyers home with its wave. Without waves, they gather at the rally line. The AI's 12-supply muster counts the supply of every unit in the lane, so flyers count toward it |
| Spore clouds | Reach flyers. The Mortar's shell doesn't, and its aim counts ground units only |
| The Rhizomorph | The other way past the front: under it rather than over it. Neither can hit the other while it tunnels. Once surfaced it's 2 supply, so it can hit flyers. It never surfaces on a flyer, since it hunts ranged units |
| Call for help | Only friends that can hit the attacker answer. A Sporeling attacked from above calls the Capguards, not the other Sporelings |
| Pinning | A flyer in contact pins an archer. Flyers aren't ranged, so they're never pinned |
| Mixed-wave shields | A flyer is a unit type, so Sporelings and Driftlings make a two-type wave, and the swarm gets shields by adding a Stalk. Watch that pair in the counter matrix |
| Cleave | Scythecaps have reach, so their cleave hits flyers around the target at full damage |
| The Burster | Can't reach. It never aims at a flyer, and its burst skips them, but its cloud still catches them |

## The units

### The Driftling

Thistledown that drifts in on the wind and cuts at whatever is below it.
- **Name ideas:** **Driftling** (the working name), Thistlewisp, Puffwing, Seedglider.
- **Its spawner:** **Drift Stalk** (working), Seedhead, Thistle Spire.

| Stat | Driftling | Reference |
|---|---|---|
| HP | 70 | Sporeling 72, Veilstalker 80 |
| Armor | Light | Slash ×1.5 shreds it, as it does the Sporeling |
| Damage | 8 slash every 1.0 s: 12 a hit on light armor, 8 on medium, 4 on heavy and on buildings | Sporeling 7 every 0.8 s |
| Range | 1.0. Hits land at once (projectile speed 0) | Melee 0.4–0.6 |
| Speed | 1.4 | Veilstalker 1.4, Sporeling 1.5 |
| Supply | 1 | |
| Aggro range | 5 | Veilstalker 5 |
| Radius | 0.25 | |
| Tags | `flying` | |
| Merge perks | Bloomed speed ×1.1, Elder damage ×1.1 | The Morel Runner's |

| Drift Stalk | Value | Reference |
|---|---|---|
| Cost | 160 | Veilstalker Hollow 160 |
| HP | 450 | The other 2×2 spawners at this price |
| Spawn | 2 Driftlings every 18 s | Veilstalker Hollow and Morel Warren: 2 every 18 s |
| Rarity | Uncommon | |
| `aiWeight` | 1 | As the Rhizomorph Tunnel and the Burster Pod |

**Value check (SPEC §11.4):**
- **The Drift Stalk:** 6.7 Driftlings a minute × √(70 × 8) gives 158. Times a flyer role factor of 1.5 (a guess, between splash's 1.4 and ranged's 1.6) and divided by 160 gold, that's **1.48**, inside the 1.45 ± 0.15 band.
- **Today's spawners, on the current data:** Sporeling Burrow 1.71, Gill Nest 1.53, Capguard Hall 1.48, Veilstalker Hollow 1.48, Morel Warren 1.45.

### The Bloatcap (only if P2 leaves Decisions binding)

A swollen puffball on the wind that drops spore bombs on buildings: Clash Royale's Balloon, in this game's terms.
- **Name ideas:** **Bloatcap** (working), Gasbag, Sporeship.
- **Its spawner:** **Bloatcap Mooring**, a tether post.

**Its job is to break a held front:**
- P1c's package fails G4 on Decisions (30–48%), because the counters win by holding.
- The builds that stall most are defensive: mono Mortar ends in a Decision in 62–87% of its G3 games, and mono Burster Pod in 55–73%.
- The Mortar can't hit a Bloatcap, and a Burster can't reach one.

| Stat | Bloatcap | Reference |
|---|---|---|
| HP | 420 | Rootbreaker 460 |
| Armor | Medium | Pierce ×1.5, so archers and turrets are its predators |
| Damage | 24 crush every 2.0 s, at buildings and the Heartcap only. That's 72 a bomb on a building with the siege bonus, 36 a second | Rootbreaker: 84 a hit, 42 a second |
| Range | 0.6 | |
| Speed | 0.6 | Rootbreaker 0.6 |
| Supply | 3 | |
| Aggro range | 4 | |
| Radius | 0.45 | |
| Tags | `flying` and `siege`, plus a new buildings-only targeting flag | |
| Merge perks | Bloomed HP ×1.1, Elder damage ×1.1 | |

| Bloatcap Mooring | Value | Reference |
|---|---|---|
| Cost | 220 | Rootbreaker Den 200 |
| HP | 600 | |
| Spawn | 1 every 26 s | Rootbreaker Den: 1 every 20 s |
| Rarity | Rare | |
| `aiWeight` | 1 | |

**How long things take:**
- It levels a Sporeling Burrow or a Gill Nest (450 HP) in 12.5 s, and a Capguard Hall (600 HP) in 17 s.
- Two turrets kill it in 8 s (27 a shot), and four archers in 6 s (21 a shot). Three Capguards answering a call take 10 s (14 a hit).

**The risks:**
- It's the old archer problem from the air: buildings hit with no answer. Call for help and reach are what make it answerable, and it can't fight back.
- It could steepen the Heartcap cliff. Under the package, the loser's Heartcap already falls 9–27 s after its first hit (P1).

Its first measurement is G4, then G3 with mono Mooring.

### No new anti-air unit

The reach rule makes the line the anti-air, so the rule doesn't need one. If the measurement finds mixed armies short of reach, the first lever is an upgrade that grants it, as Kingdom Rush's Axe Throw does. A Veilstalker "Leaping" track, for instance, would also add run variety. A ranged anti-air specialist, like Mechabellum's Mustang, would come after that.

## The general (§7)

**Against flyers:**
- **A fifth counter kind, Anti-Air** (§7.4):
  - **Score:** the player's air share, meaning the share of their supply rate that comes from flyer spawners.
  - **Counter set:** spawners whose units can hit flyers and deal slash or pierce: Gill Nest, Capguard Hall, Scythecap Grove, Amanita Lodge and the Drift Stalk.
  - **Towers don't count,** since the Mortar can't hit flyers.
- **Flyers leave the armor shares,** so a Driftling army doesn't read as a swarm and draw Sporeling Burrows and Mortars, which can't touch it.
- **The telegraph and intel:** "The Lichen Baron is preparing to counter your **AIR** — 2 waves." The intel file gains the kind.
- **Reads that already work:**
  - The general's pressure read (§7.2), its placement threat (§7.3) and the Hold muster all add up units' supply, not territory presence, so they see flyers already.
  - The one change: towers' ×2 under pressure shouldn't count pressure from flyers alone.

**With flyers:**
- **Buying:** every general buys the Drift Stalk at weight 1 (`aiWeight`), as it does the Tunnel and the Pod.
- **Counters:** the Drift Stalk deals slash, so it's also in the **Anti-Swarm** counter set. A swarm player meets flyers when the 4:00 counter activates.
- **Personalities:**
  - Old Mother Mold's swarm is the most exposed to flyers, and Anti-Air is her way out.
  - The Lichen Baron's Mortars can't hit flyers, but her heavy units can.
  - The Blightwright, who pushes with siege and ranged support, is the natural Bloatcap general.
- **G8** gains a row: mono Drift Stalk must drop by at least 20 points against the adaptive general.

## How a flyer reads on the field

- **A shadow:** a soft dark oval on the ground marks where the flyer is. Range, targeting and its lane position all use that point. The color-blind assist's team mark goes under the shadow.
- **Height:** the sprite floats about half a tile above its shadow, with a 2-frame bob (SPEC §17 #20 allows 2-frame cycles). Under reduced motion and `?test=1`, it holds still at that height.
- **Drawn last:** flyers go on top of every ground unit and building, sorted by y among themselves. Hit sparks and HP bars sit at the sprite.
- **Words:**
  - A flyer's tooltip says: "Flying: only big units, ranged units, turrets and other flyers can hit it. It holds no ground."
  - A small unit's tooltip says: "Can't reach flyers."
  - Units with reach carry a small wing mark in the inspect panel.
  - The wording goes in `src/ui/words.ts` until the next golden refresh.
- **Not a spore:** the shadow and the team color keep a Driftling from reading as one of the field's drifting spores.

## What it touches

- **Schema and data** (`src/data/schema.ts`, `src/sim/compile.ts`, `src/data/proto.ts`):
  - a `flying` tag;
  - a balance setting, `flying`;
  - the Bloatcap's buildings-only flag;
  - the units and buildings as content under the preset, the way the Rhizomorph's are.
- **One predicate, `canHit(attacker, target)`.** It's false for a burrowed target, and for a flying target when the attacker has no reach. On `feature/combat-rework`, the Rhizomorph already guards each place an attack picks or lands on a unit with a `v.burrowed` check: about a dozen of them, in `targeting.ts`, `combat.ts`, `clouds.ts` and `powers.ts`. Flyers send those through the predicate.
- **Targeting:**
  - unit and turret candidates go through `canHit`;
  - the Mortar skips flyers;
  - the cloud and burst aims count ground units;
  - call for help asks only units that can hit the attacker.
- **Movement:**
  - separation skips flyer–ground pairs;
  - under waves, idle flyers keep the pace, hover over the melee front, and don't count as that front.
- **Combat:**
  - splash follows its attacker's reach;
  - clouds hit flyers when `cloudsReach` is on;
  - `meleeMult` applies to melee hits on flyers;
  - pinning counts a flyer in contact.
- **Territory:** flyers add no presence. That's one condition in `territory.ts`, beside the burrowed one.
- **AI** (`src/sim/ai/counter.ts`, `controller.ts`): the air share and the Anti-Air kind, and the tower rule.
- **Render:**
  - `src/render/renderer.ts` gets a flyer branch beside the Rhizomorph's mound: the shadow, the raised sprite and the draw order;
  - text-defined sprites in `data/sprites`;
  - inspect lines in `src/ui/inspect.ts`.
- **Tools:** nothing new.
  - G3's mono list and the counter check's pairs both read the roster, so the Drift Stalk joins them under the preset, as the Tunnel did.
  - `fixedWeights` keeps the counter check's test bots off it.
- **Goldens:** unchanged while the preset is off.
- **G11:** one more check per target candidate. The tick budget has room: 0.18 ms mean under `rework` (P1).

## Measurement plan

### Settings

All default-off in `src/data/proto.ts`, like the rest of the package:
- **`flyers`:** the Driftling and the Drift Stalk (both rosters, `aiWeight` 1), and a balance setting:
  ```
  flying: { reachSupply: 2, meleeMult: 1, mergedReach: false, cloudsReach: true, holdsGround: false }
  ```
  - `reachSupply`: melee unit types with at least this much supply can hit flyers.
  - `meleeMult`: the damage multiplier on melee hits against flyers.
  - `mergedReach`: whether a merged unit's supply counts toward reach.
  - `cloudsReach`: whether spore clouds hit flyers.
  - `holdsGround`: whether flyers add presence.
- **`bloatcap`:** the Bloatcap, its Mooring and the buildings-only flag. It's built only if needed.

The options, as overrides:

| Variant | Spec |
|---|---|
| Reach (the pick, B) | `flyers` |
| Ranged only (A) | `flyers,flying.reachSupply:99` |
| Everyone, at half damage (C) | `flyers,flying.reachSupply:1,flying.meleeMult:0.5` |
| Merged forms reach | `flyers,flying.mergedReach:true` |
| Flyers hold ground | `flyers,flying.holdsGround:true` |
| Clouds don't reach | `flyers,flying.cloudsReach:false` |

Each runs on top of the package P4 adopts, written `<package>` below. `flyers` alone, on today's rules, is the control.

### Checks and bars

P2's bars ([P2: measure](combat-rework.md#p2-measure)):
- **G3, with mono flyers added:** every mono bot against `bot:balanced` on every run map, mono Drift Stalk included. Mean ≤ 55% and worst map ≤ 60%, at 50 seeds per seat ([the rewrite](../balance-backlog.md#g3-on-every-map-the-rewrite-2026-10-30)).
- **The strict counter bar** (`--checks counters`, [the check](combat-rework.md#the-counter-matrix-check)): every mono build with a G3 mean above 40% needs an answer that wins at least 60% on every map, and that answer mustn't fail G3 itself. The Drift Stalk joins the pairs and the mono answers on its own.
- **G4:** median 5:30–8:30, Decisions ≤ 15%, bot wins 30–70%.

Cheaper checks first:
- **G1 and G2** (`--checks duels`):
  - The Drift Stalk wins at most 80% of its production pairings.
  - From the supply-duel matrix: Driftling > Sporeling, Driftling > Morel Runner, Capguard > Driftling and Scythecap > Driftling. These get read, not asserted, until adoption.
- **G11:** tick cost with flyers on.

### Order

1. Duels on `<package>,flyers`, to set the numbers. A few minutes.
2. G3 screens at 20 seeds per seat (about ±8 points) for the six variants.
3. For the best one or two: G3 at 50 seeds, the strict counter bar and G4.
4. Anything that passes goes on to P2's other checks (G5–G8, engagement and runs), then a dev-site playtest with `?proto=<package>,flyers`.

What to read first:
- mono Drift Stalk's G3, the takeover check;
- mono Sporeling's G3, and whether a Drift Stalk pair is its best answer on Twin Roots;
- mono Gill Nest's G3, in case `bot:balanced`'s flyers feed the archers;
- `pair-sporelingBurrow-driftStalk`, the mixed-wave pair;
- G4's Decisions.

**Cost:**
- G3 at 50 seeds gains one mono bot: 300 more games.
- The counter check gains one army building, so about 12 more pairs per build. That's roughly 15% more games than the same check without flyers. P1c's confirms took 6–11 minutes a variant on 10 workers.
- Run these when the machine is free.

```
npm run experiment -- --proto <package>,flyers --checks duels
npm run experiment -- --proto <package>,flyers --checks g3 --g3seeds 20
npm run experiment -- --proto <package>,flyers,flying.reachSupply:99 --checks g3 --g3seeds 20
npm run experiment -- --proto <package>,flyers --checks counters --g3seeds 50 --top 5
npm run experiment -- --proto <package>,flyers --checks g4
```

## If the rework falls back to rounds

If Level 2 fails and the rework moves to rounds ([Level 3](combat-rework.md#level-3-rounds)):
- **Flyers fit rounds well,** with Mechabellum as the model. Both armies deploy in formation, and a flyer reaches the back row from anywhere.
- **A harder rule becomes fair.** Between rounds you see the enemy's flyers and buy the answer, so rule A (ranged only, plus an anti-air unit like Mechabellum's Mustang) stops being a trap. Reach could stay, or give way to A.
- **"Holds no ground" goes** with territory. The brake becomes whether surviving flyers count when the survivors damage the loser's Heartcap.
- **The questions about waves, pace and Hold go.** The display and most of the code stay.
- **The Bloatcap loses its job.** Every clash ends, so nothing stalls. It could become a big flyer with its own answer, like the Overlord, or be dropped.

## Recommendation

- **Build `flyers` after P4,** on top of whatever package it adopts, with the Driftling and the reach rule. Not before: the Driftling's job depends on which builds P2 leaves failing.
- **Measure the rule as one setting:** reach, ranged only, and everyone at half damage. The choice then rests on numbers.
- **Adopt it only if** G3 (mono Drift Stalk included), the strict counter bar and G4 all pass. The first number to read is mono Drift Stalk's G3.
- **Hold the Bloatcap** until P2's G4 result is in, and build it only if Decisions are still the binding check.
- **On adoption, the SPEC changes are:**
  - §17 #7: flying units and anti-air are in;
  - §5.2: flyers in targeting and movement;
  - §5.3: who can hit a flyer;
  - §4.3: flyers hold no ground;
  - §7.4: the Anti-Air kind;
  - §11: the units;
  - §12.1: the reach exception;
  - §12.3: G2's new edges.

## Open questions for the user

1. **The rule:** reach (2+ supply), ranged only, or everyone at half damage? The pick is reach, and all three get measured.
2. **Merging:** should a merged Sporeling (2 supply) reach flyers? It's softer and closer to SPEC §12.1. But waves roughly double merges, so the swarm would mostly escape its answer.
3. **Ground:** flyers hold no ground, so they can't win a Decision on columns. Agreed?
4. **Clouds and the Mortar:** clouds reach flyers, but the Mortar's shell doesn't, which makes flyers the answer to Mortar turtles. Agreed?
5. **The second flyer:** build the Bloatcap only if P2 still fails G4 on Decisions?
6. **Names:** Driftling and Drift Stalk, Bloatcap and Bloatcap Mooring are all working names.
7. **The Gray Rot (M7):** should it mirror the Bloom's flyers until then, as it does the Tunnel and the Pod, or get its own flyer and reach rules?
