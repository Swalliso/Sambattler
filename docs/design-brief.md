# Spore & Sprawl: redesign brief

This brief anchors the v3 redesign. The user adopted it on 2026-11-04 with "Go with this plan". It was written in a separate design conversation and is kept as written there, except that TFT is added to the references.

The hub's plan is to modify v2 into v3 rather than start fresh, in four steps:
1. an audit of SPEC v2 against this brief, with the questions for the user;
2. a concept doc, `docs/spec-v3-concept.md`, only as big as the prototype needs;
3. the smallest playable prototype, built on the existing engine behind a preview link on the dev site;
4. SPEC v3, if the prototype passes.

`docs/status.md` says where things stand. R3 and every later v2 milestone are paused until the prototype is judged.

## The fantasy
You are a fungal colony at war with a rival colony. Grow your base over time, read what the rival is growing, and predict where it's headed. Then plant the counter before it arrives, or strike before it blooms. Your buildings raise the army, and you watch the war you built play out. Each run brings new strains and finds, so every build is different, and sometimes gloriously broken.

## What I want
- Out-guess the opponent: build up over time to counter it, predict what it will do later, and have the answer ready.
- Placement and synergy of buildings and squads that reward planning.
- A real rush-or-greed choice: pressure early, or invest in economy to outscale.
- Watch a war I built play out, with no direct unit control.
- Break the game: unique, sometimes absurd builds every run.
- Meta progression: unlocks and items that make me want another run.
- Keep and deepen the mushroom theme. Premium desktop game, no mobile daily-pull hooks.

## Pillars (tie-breakers, in priority order)
1. Read and out-guess the rival. Its base is visible and its plans have tells. Counters take time to come online (buildings fruit), so prediction beats reaction.
2. The colony is the build. Placement rules care about which neighbor and which direction along the lane. They change what units do, not just add +%. Every synergy shows on hover before you place.
3. Rush or greed. Economy outscales, pressure punishes it, and both can win. The rival makes the same choice, and reading it is part of pillar 1.
4. Watch the war you built. Buildings spawn squads that fight on their own. Battles are legible, they swing, and they end in drama rather than a sudden collapse.
5. Break it on purpose. Rule-benders and multiplying engines exist and take assembly to pull off. Measure build variety, not single-building win-rate ceilings.
6. Runs that pull you back. Short campaigns, rewards that change how you play, and horizontal unlocks that teach one keyword at a time. A seeded challenge mode can come later.
7. Fungal through and through. Mechanics come from fungal biology: mycelial links, fruiting time, compost into loam, fairy rings, spores, parasites.

## Keep
- Must keep: the mushroom theme, buildings that spawn squads, the deterministic sim and headless tools, and the CLAUDE.md workflow.
- Keep unless the pillars argue otherwise: lanes, territory as build space, merging, the Heartcap, commanders and strains, and the general's intel file.

## Lessons already paid for
- Neighbor-count bonuses become flat buffs: a small home zone gives every building 2–3 neighbors without trying.
- Mono-building takeovers may partly be a map-shape problem (one lane, scarce plots). Number and spawning tweaks didn't fix them.
- Drafts feel weak because the cards are small, not because there are too few, and every draft pauses the battle.
- Battles start quiet and end on a cliff.
- A synergy players can't see doesn't exist.

## The big open decision
Rounds or continuous battles? The pillars lean toward commit-then-reveal:
- a paused, simultaneous build phase where you see the rival's base but not this round's additions
- then a clash where your buildings spawn squads and the war plays out
- base and front persist between rounds

The alternative keeps continuous battles and adds commitment through fruiting time. Prototype both cheaply before choosing.

## How we'll know it works
- The best spot for a building clearly beats a median spot in headless tests, and playtesters move buildings because of synergies.
- At least 3 viable openings (rush, greed, counter-build), and no building or archetype dominates on any map.
- Playtesters can say what the general is building toward, and a counter planted in time wins.
- The first real decision comes within 30 s.
- A losing Heartcap takes 45 s or more to fall.
- Under 20% of runs end in battle 1.
- Playtesters start another run without being asked.

## References (borrow principles, not content)
- Mechabellum: visible army, hidden current deployment, placements that persist.
- There Are No Orcs and Castle Fight: spawner buildings; gold buildings vs unit buildings.
- 9 Kings: grid synergies, a telegraphed attacker, game-breaking multipliers.
- Backpack Battles: hover stars.
- Legion TD 2: pressure vs economy.
- Balatro and Risk of Rain: rule-breaking builds.
- Hivemind: fast decisions, visible power spikes, themed offers.
- TFT (Teamfight Tactics): added by the user on 2026-11-04. What to borrow from it is one of the audit's questions.
