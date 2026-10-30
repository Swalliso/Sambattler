# Colony and swarm: a direction to consider

Notes from a conversation between the user and Claude on 2026-10-29 and 2026-10-30, against `97b49a4`. **Nothing here is adopted and nothing is being built.** The user wants to finish the planned milestones first, and these notes keep the thinking for later. Most of it bends current rules (SPEC §17 #11 excludes core adjacency rules, for one), so adopting any of it means changing the spec first.

## The pitch

**Build a fungal colony whose buildings feed each other, then watch the swarm it grows overrun the enemy.**

The colony is the engine and the swarm is the payoff you watch. Where a building stands should matter as much as which building it is. The reference points:
- **9 Kings:** a small grid of plots. A piece changes its neighbors, and a later piece changes the value of an earlier spot.
- **Balatro and Combolands:** planning around pieces you know are coming, and the rush when a build breaks.
- **Vampire Survivors:** a screen full of your stuff, and pieces that combine into something new.

Why consider it: the [engagement review](../engagement-review.md) found the player has few verbs (place buildings into a handful of slots, pick +15% cards, watch), and that territory, merging and adaptation don't land as decisions. Round 3's testers ignore territory and hope (F6). Giving placement meaning gives the player a reason to look at their colony and a place to be clever. It could also give a home to F1 (forward building isn't worth it), F14 (small buildings for gaps), F15 (a spreading building) and F16 (a home-ground bonus).

## The Codex draft, and what we'd change

A Codex draft, "Symbiotic Colonies: proposed playable slice" (in a Codex worktree, not in this repo), proposed:
- a 9-plot trial map
- two support buildings, the Nurse Ring and the Knitting Loom, wired by hand, that advance a spawner's timer
- two relics that change how far connections reach
- announced offers at 2:00 and 4:00

Worth keeping:
- **Plots.** Fixed slots make neighbors readable. Bogwater's home zone already holds eight 2×2 buildings, so it's close to a plot grid now.
- **Announced upcoming offers.** Leaving a slot open becomes a plan rather than a gamble.
- **A standalone trial on the dev site**, judged by whether players describe their colony by what it does together.

What we'd change:

| Draft | Problem | Instead |
|---|---|---|
| Effects shave time off a spawn timer | Too small to feel. The Loom takes a Hall from 15 s to about 13 s at best. The Nurse gives about 40% more Capguards for half a Cellar's income, while a second Hall gives +100% for 150 gold | Effects that change what units do (below) |
| Timer progress is thrown away while a spawner waits for supply | Engines go idle at the cap, late in a battle, just when they should be roaring | Payoffs that still matter at the cap: quality, behavior, merging |
| No combo score, no multipliers, restrained cues | Removes the spectacle the idea is for | Spectacle on purpose |
| Each support needs a source and a recipient picked by hand, with warmups, claims and cooldowns | Most of the draft is edge cases from this, and round 3 already said "too much to learn" (F8) | Implicit neighbor rules |
| A new map, 500 gold, curated offers and no Gill Nest, all at once | Results can't be credited to the synergies | Change one thing at a time |

## Ideas

**Neighbor rules printed on the card.** As in 9 Kings, you place a piece and it affects its neighbors, with no wiring. Hovering a plot previews what would light up, so players see the effect instead of reading about it.

**Use the lane's direction.** 9 Kings has no front or back, but we do. A unit with no target walks straight forward along its spawn row (§5.2), and units don't collide with buildings, so it walks through whatever stands in front of it:
- *in front* of a spawner is a building its units pass through, which could shield them or help them merge
- *behind* could feed it, as an economy building might
- *beside* could share with it

**Transformations, not percentages.** Like Vampire Survivors' weapon evolutions, the reward is an army that does something new:
- a Burrow touching a Cellar: Sporelings drop a coin when they die
- a Mortar behind a Gill Nest: archers' shots splash
- three Burrows in an L: they spawn merged units directly

**One multiplying layer**, so a rare run can break: relics like "+1 to every neighbor effect" or "corners count". SPEC §1.2 already allows rare broken runs that can't be forced every run.

**Visual feedback that suits the theme:** glowing mycelium threads between linked buildings, a pulse when an effect fires, and the mat thickening as the colony connects.

## Swarms

The user wants bigger unit swarms, probably on a larger map.

**Headroom.** On 2026-10-30, `npm run bench` ran 300 live units at a 0.18 ms mean tick (p99 0.49 ms) against a 1 ms budget: about 5× headroom. Rendering hasn't been measured (that's M8's render benchmark), but a few thousand sprites from one atlas is usually fine on canvas. The 60-supply cap is now a design choice, not a technical limit.

**What swarms would change:**
- **Territory capture.** Capturing a column depends on the supply standing in it (§4.3), so a swarm would flip columns almost at once. The tug-of-war needs a rethink, which F6 may welcome.
- **Readability.** Single units stop being readable. The swarm as a mass, and the big merged units standing out of it, become what you track. Units are already about 8 px at 1280×800 (engagement review), so a bigger map needs a camera or zoom plan.
- **Splash damage** gets much stronger. That may be the natural answer to archer spam (G3), since massed archers stand in clumps, and it would give the Mortar a job (F13).
- **Merging** becomes the swarm's evolution moment. Thirty Sporelings melting into Elders is "three become one", only louder.

**Map shape:** taller rather than longer. Extra rows give the colony more plots and give swarms room to spread. Longer marches were part of why openings felt quiet.

## The colony across a run

Each battle starts on an empty board, and what the run carries is your pieces: blueprints, relics and upgrades. This maps onto Balatro. The pieces are the jokers and deck, and they last all run. Each battle is a blind where you assemble the engine on a new board, and each map's plot shapes and terrain change which layout works.

Risks:
- **Chores.** Placing the same eight-building engine every battle will get tedious. A "replant last layout" button at deploy fixes most of it: you still pay, but skip the clicking. Another fix is a deploy budget big enough that the core engine goes down while paused, so the live battle is about adding to it.
- **Ramp time.** The engine has to come online fast enough that you watch it run for most of the battle, not just the last minute. This points back to the engagement review's hot start.

The user's later meta idea: keep a building from one battle to the next. For example, an "heirloom" building that starts each battle already planted, earned through mastery or a relic. It would fit M6.

## What it could simplify

The user expects this to transform the game and simplify other parts of it. A test for each system: **does it feed the colony or the swarm?** If neither, it's a candidate to cut.

| Candidate | Why |
|---|---|
| The forward price (§6.3) | Disliked twice (F1). Forward plots could carry their own risk and reward through the colony instead |
| Upgrade tracks (§11.6) | Could become 9 Kings-style: draft the same building again to level it where it stands (this reverses §17 #12), or let neighbors do the upgrading |
| Interest and the Spore Exchange | Both round 3 testers found them confusing. Cellars could get their value from their neighbors |
| The column capture rule (§4.3) | Swarms force a rethink anyway (F6) |

Merging, the adaptive general and the run structure clearly survive, and each gets stronger with a colony and a swarm.

## Timing

The user prefers to finish the planned milestones first. The counterpoint: if this transforms the game, M6 and M7 are where finishing first costs the most.
- **M6** writes 12 strains, 12 colony traits, feats and the commander-exclusive buildings against today's building model. Strains and traits would want to change neighbor rules, and feats would want to be about combos.
- **M7** builds the Gray Rot's 10-building roster, the 3-lane map, blights and more relics, all tuned for current map sizes and the supply cap.
- **M8** is mostly polish and release, so it's safe either way.

Two coherent options, the user's call:
1. Finish M6–M8 as specced and treat this as a deliberate v2.
2. Keep implementation on hold, but settle the direction before M6 and M7 content is written, with the cheap test below.

## The cheapest test

1. **On paper:** 6–8 buildings with neighbor rules, played out on a grid.
2. **One small in-game prototype** on Bogwater, on a feature branch for the dev site. The modifier system already supports adjacency (`adjacentOwnBuildingsGte` in `src/sim/effects.ts`, used by Mycorrhizal Link), which covers simple bonuses. Transformations need one or two new hooks, such as on death or on spawn.
3. **A playtest** that asks: what were you saving room for, why does this building stand there, and what did the combo change about your army?

## Open questions

- How big a swarm? That sets the supply cap, the map size and whether we need a camera.
- What is territory for, with swarms? Is capture still a tug-of-war, or is it how you unlock more plots?
- Do neighbor effects count corners? Do they reach across lanes?
- How does the general build a colony? It plays by the player's rules, so its placement rules (§7.3) must understand neighbors.
- How does the general's counter cycle read a colony whose units change behavior?
