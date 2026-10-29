# Engagement review: where the fun is missing

Written 2026-10-28 against `main` at `a4841a2` (M1–M4 merged, balance prototypes recorded, nothing adopted). It answers two questions: what makes the current build less fun than it should be beyond archer balance, and whether the remaining milestones (M5–M8) fix that. **Nothing here is adopted.** Every rule change below needs your OK, as the balance backlog does.

Evidence comes from one human-style run in the browser (battle 1 against the Lichen Baron on Stumpfield), 120 headless single battles (`bot:balanced` against the scripted general, Old Mother Mold, the Lichen Baron and the Blightwright, seeds 1–30 each, Bogwater Hollow) and 80 headless runs (`bot:balanced`, greedy drafts, random route). Bots aren't people, so the battle numbers describe pacing, not skill.

## Short answer

The engineering is in great shape: deterministic, measured, well tested. The game isn't fun yet because of how a battle is shaped, not because of numbers.

- **The battle is quiet for three minutes.** Little happens on the field and there are few decisions to make.
- **The battle ends on a cliff.** A Heartcap goes from full to dead in seconds, with nothing the player can do about it.
- **The run is decided early, and most of its systems don't matter.** Heartcap HP carryover, repairs and Groves have no effect in practice.
- **The player has very few verbs.** They place buildings into a handful of slots, pick a few +15% cards, and watch.

The remaining milestones are mostly breadth: commanders, meta-progression, an enemy roster, polish. M5 adds the one planned active verb, but **none of M5–M8 addresses the problems above**, and M6's meta-progression would multiply a loop that isn't fun yet. My recommendation is a short, prototype-first **"battle feel" milestone before M5**, judged by a playtest and by engagement metrics rather than the guardrails alone. The milestones after it should be re-sequenced.

## What the numbers say

| Measure | Result | What it means |
|---|---|---|
| First column flip | Median 2:17–4:15 by general. No flip before 3:00 in 30–83% of battles. In my battle, nothing moved until 4:30 | The front line, the game's main readout, sits still for the first third of the battle |
| Units on the field (both sides' supply, cap 120) | 8–13 at 1:00, 10–15 at 2:00, 15–20 at 3:00, 25–29 at 5:00 | Each side fields 2–4 units for three minutes. Fights are trickles, merging has little to work with, and the 60-supply cap never binds |
| Player decisions | About 10 buildings and 4 draft picks per battle, about 2 per minute, with 2 made at deploy. Early income (+96/min) buys one building every 60–90 s | Long gaps with nothing to decide. My first purchase after deploy came at 1:07 |
| Loser's Heartcap from first damage to dead (routs) | Median 13–20 s, and 4–8 s from half HP to dead. In my run the Heartcap went 3000 → 0 between 9:03 and 9:35 | No siege phase and no last stand. The Sporestorm's +20% damage taken per stack (×2 at 5 stacks) turns Heartcaps to glass |
| Winner's Heartcap damage | 0% in 120 of 120 battles | Battles never chip the winner |
| Run outcome (80 runs) | 41% end in battle 1 and 61% by battle 2. 25% reach the boss, and the boss loses 80% of the time | The difficulty curve is upside down: early battles are the deadliest and the boss is the easiest |
| Player Heartcap at run end | 0 in 64 runs, full 3000 in 14, partial in 2 | Run HP is binary. Grove repair, Mending Moss, Rot Ward and Rout repair are almost always wasted |
| Gold | Bots bank a median of 220–390 at peak. I finished with 801 unspent and no legal tile to build on | Once home slots fill, gold has nowhere to go |
| Screen | At 1280×800 the battlefield fills about a third of the screen height; units are about 8 px | The watching half of an auto-battler is hard to read |

One thing that works: the first side to lead the front wins only 30–57% of battles. Fronts do swing back, so the snowball brakes are doing their job.

## Pillars in play today

| Pillar | Status | Why |
|---|---|---|
| 1. Territory is build space | Weak | Home holds most of what a battle needs (F1), forward building costs +20–50% and gets wiped in late swings, and holding ground earns nothing by itself (comeback income pays the side that holds *less*). Territory mostly matters as the 10:00 tiebreaker |
| 2. Three become one | Partial | Merges happen (12–16 per battle) and look good, but they're automatic. The toggle is rarely worth touching, so merging isn't a decision |
| 3. The general adapts and remembers | Weak | G8 fails: adaptation doesn't measurably hurt mono builds. In a mirror roster, a counter looks like "more Capguards", and the player has little room (slots, 60% refunds) to answer a warning |
| 4. Every run asks something new | Weak | Archers are the answer to everything, drafts are mostly +15% cards, and the build-defining effects (strains) wait for M6 |
| 5. Deterministic and testable | Strong | |

## Do the remaining milestones fix this?

| Milestone | Helps with | Doesn't touch | Verdict |
|---|---|---|---|
| M5 Commanders and powers | Adds the only active verb (one power, 75–100 s cooldown, so 5–7 uses a battle) and some run variety | The quiet opening, the Heartcap cliff, binary run HP, territory payoff, trickle fights | Keep it, but it isn't enough alone. A power like Spore Burst only matters if there's a siege to break |
| M6 Meta-progression | Long-term goals; strains are the most interesting build content in the spec | Everything inside a battle | Wait. Meta multiplies the core loop's fun and doesn't create it. Strains could come forward as draft cards instead |
| M7 Gray Rot, blights, Three Hollows, tutorial | A tutorial; a third map | The Gray Rot mirrors the Velvet Bloom's roles with ±10% stats, so it stays a mirror match. Blights only matter once people replay | Give the Gray Rot asymmetric mechanics so it feels like an enemy |
| M8 Release candidate | "Light juice" | | Juice is core to an auto-battler. Move it earlier |

## Recommendations, highest impact first

Each one can be prototyped behind a `?proto=` setting like the balance experiments, playtested, measured, and then adopted or dropped.

1. **Give the player a timing verb: Hold / Advance per lane.** New units gather behind your frontier until you release them, with a time limit so it can't stall the battle. This hits four problems at once:
   - every 30–60 s you decide when to strike
   - it replaces trickle fights, which the M1 diagnosis named as the root of archer dominance
   - it gives the opening something to do: build a wave, then send it
   - held units stand idle together, so they knit on their own. Merging becomes something you cause

   Automatic mustering already improved battle length (G4 median 6:11–6:49, 0–10% Decisions), though it didn't fix archers on its own. *Cost:* this reverses the interview decision "units always advance" (§1.2, §5.2, §17 #6), so it's your call. *Alternative that keeps units autonomous:* a gold-cost "Surge" that fires every spawn timer in a lane at once.
2. **Turn the Heartcap cliff into a siege, and make run HP a resource.**
   - Drop or cap the Sporestorm's Heartcap damage bonus and let unit damage and weaker turrets break stalemates instead.
   - Add breach moments at ⅔ and ⅓ HP (a callout and a defensive pulse) so the player has a window to react.
   - In runs, a Rout loss costs a large chunk of HP (say 40–50%) instead of ending the run, unless HP is already low.
   - Optionally, enemy-held columns on your side slowly drain run HP even in battles you win. That ties territory (pillar 1) to the run.

   Groves, repair relics and events start to matter, and a battle-1 loss stops wiping out 10 minutes with nothing to show for it.
3. **Start hot, and flip the difficulty curve.**
   - More starting gold, faster first spawns, or a shorter clock, so armies meet with real numbers before 1:00.
   - Make battle 1 the gentlest fight and the boss the hardest. Today 41% of runs die in battle 1, while the boss loses 80% of the time.

   These are mostly data changes.
4. **Make held ground pay.** Options:
   - mat income per contested column you hold, alongside comeback income
   - a lower supply-line rate (F1)
   - a forward-only perk, such as faster spawns on fresh soil

   Gold piling up with no tile to spend it on is the symptom.
5. **Fewer, bigger draft choices.** Cut to 2–3 drafts per battle and make them stronger:
   - rule-bending relics like Spore Cloud and Martyr's Bloom
   - a few strain-style "mutation" cards pulled forward from §11.5, such as Volley, Bursting and Teeming
   - signature level-3 upgrades
6. **Make the general's counters moments the player can answer.**
   - A counter arrives as a visible doctrine wave: a burst of units, a banner, and a doctrine-specific buff.
   - The warning offers the player a free 1-of-3 "answer" pick for that counter kind.
   - Tie this to an asymmetric Gray Rot (from M7) so counters look different from normal play.
7. **Make watching fun.**
   - Scale the battlefield up to use the empty screen height.
   - Add hit-stop and impact flashes, and pull M8's spawn and death puffs forward.
   - Give Elder births and Heartcap breaches a beat.
   - Reconsider SFX (§17 #18); they're cheap fun for an auto-battler.
8. **Measure fun alongside balance.** Add engagement numbers to the sim and to every milestone's verification:
   - time to first flip
   - supply on the field at 2:00
   - decisions per minute
   - Heartcap fall time and winner Heartcap damage
   - run-end distribution and boss win rate

   Add a feel-based playtest gate too ("When were you bored? When did you feel clever?"). The guardrails only check that the game isn't degenerate.

Archers still need fixing. Re-measure G3 under recommendation 1 first: it attacks the trickle-fight cause, which none of B1–B4 did.

## Proposed sequence

| Step | Scope | Gate |
|---|---|---|
| **M4.5 Battle feel** (new) | Recommendations 1–4 and a first juice pass (7), as prototypes; engagement metrics (8) | Playtest of 3 runs with the feel questions, plus engagement targets, for example: first flip before 1:30, each side at 10+ supply by 2:00, a loser's Heartcap falling over 45+ s, battle-1 run deaths under 20% |
| M5 Commanders and powers | As planned, with cooldowns tuned against the new loop; draft rework (5) | As in the spec |
| M6 Gray Rot and counters (from M7) | An asymmetric enemy roster and counter moments (6) | G8 and a playtest |
| M7 Meta-progression (was M6) | Feats, traits, mastery; strains already partly drafted | As in the spec |
| M8 Release candidate | Blights, Three Hollows, tutorial, polish | As in the spec |

The order of M6 and M7 is a judgment call: a distinct enemy adds more to a single run than meta does, but meta is what brings people back. Decide after the M4.5 playtest.

## Prototype E1: Hold / Advance per lane (2026-10-28)

Recommendation 1, built behind `?proto=hold` (browser) and `--proto hold` (tools). **Adopted on 2026-10-28:** `laneStance` is now in `balance.json` with these settings. The other prototypes stay off. The results below were measured before adoption; `--proto nohold` measures the old rules.

**Rules.**
- `stance { lane, hold }` is an ordinary command, so you can give it while paused, and it replays like any other.
- While a side holds a lane, its units with no target walk to a rally line in the middle of the column behind its border column, and wait there. A unit that dealt or took damage in the last 2 s fights as usual.
- A hold lasts at most 30 s, then the lane advances on its own. After any advance, the lane can't hold again for 10 s.
- In the browser, `F` holds every lane, or advances them all if every lane already holds. The controls panel has a button per lane showing the hold time left or the cooldown. A dashed rally line marks each held lane, for both sides.
- Every AI side (bots and generals) uses the same command through a muster policy: hold until 12 supply stands in the lane, advance, and hold again once fewer than 4 remain.

`laneStance.ai.profiles` limits the policy to some AI sides. `advanceWhenBesieged` stops an AI from holding while one of its buildings in the lane is under fire.

**Measured with** `npm run experiment -- --proto <spec> --checks engagement,runs,g3gill`. The engagement numbers are `bot:balanced` against each battle-1 general, 30 seeds each, on Bogwater Hollow; the runs check is 80 runs. G3 uses 20 seeds in each seat. The two new checks (`engagement`, `runs`) are in `tools/lib/engagement.ts`.

A first build put the rally line half a tile inside the border column. Held units then spilled into the frontier, captured it and crept forward a column at a time: borders moved in 9 of 10 battles where both sides only held. With the rally line a full column back, they moved in none, and every result below uses that build.

### Engagement (scripted / Old Mother Mold / Lichen Baron / Blightwright)

| Measure | Shipped rules | `hold` |
|---|---|---|
| First column flip | 3:08 / 2:16 / 4:14 / 2:48 | **1:15 / 1:29 / 0:34 / 0:34** |
| No flip before 3:00 | 57% / 30% / 83% / 47% | **3% / 0% / 0% / 0%** |
| Supply on the field at 1:00 · 2:00 | 8·10 / 9·11 / 8·11 / 13·15 | 10·10 / 10·13 / 11·10 / 14·15 |
| Player commands per minute | 1.3 / 1.4 / 1.3 / 1.4 | 2.3 / 2.6 / 2.1 / 2.1 (4–7 of them stance) |
| Merges per battle (both sides) | 18 / 41 / 15 / 8.5 | 32 / 34.5 / 15.5 / 10.5 |
| Loser's Heartcap, first hit → dead | 14.6 / 13.1 / 13.4 / 19.7 s | 14.4 / 26.1 / 16.6 / 19.3 s |
| Winner's Heartcap untouched | 120 of 120 | 120 of 120 |
| `bot:balanced` wins | 47% / 50% / 57% / 30% | 43% / **20%** / 67% / 60% |
| Decisions; median length | 7%, 7:10 / 7%, 7:07 / 43%, 9:12 / 10%, 6:56 | 13%, 7:29 / 7%, 5:57 / 10%, 7:34 / 3%, 5:56 |
| Runs (80): reach the boss; defeats in battle 1 | 20 (25%); 33 | **9 (11%); 46** |

### G3 and the policy variants (mono Gill Nest / mono Sporeling Burrow / mono Capguard Hall vs `bot:balanced`, limit 55%)

| Variant | G3 | Boss reach | Battle-1 defeats |
|---|---|---|---|
| Shipped rules | 100% / 40% / 25% | 25% | 33 |
| `hold` | 100% / **65%** / 45% | 11% | 46 |
| muster at 8 supply | 100% / 55% / 43% | 11% | 45 |
| 20 s holds | 93% / **73%** / 50% | 15% | 50 |
| only `bot:balanced` musters | 93% / **70%** / 53% | 16% | 48 |
| only `bot:balanced` musters, at 8 | 100% / **78%** / 55% | 23% | 45 |
| advance when besieged | 100% / **63%** / 38% | 18% | 45 |
| advance when besieged, muster at 8 | 98% / 55% / 40% | 18% | 46 |

### Every guardrail, `hold` preset (`npm run experiment -- --proto hold`)

| Guardrail | Shipped rules | `hold` |
|---|---|---|
| G1 production duels | ✗ Gill Nest wins 7/8 | ✗ Gill Nest wins 7/8 |
| G2 supply duels | ✓ | ✓, every edge margin unchanged (duels don't hold) |
| G3 mono vs `bot:balanced` | ✗ Gill Nest 100%; the rest ≤ 50% | ✗ Gill Nest 100%, **Sporeling 65%**; the rest ≤ 48% |
| G4 median / Decisions / bot wins | 7:12 / 5% / 53% ✓ | 7:13 / 10% / 55% ✓ |
| G5 (+150 gold wins) | 70% ✓ | 75% ✓ (top of the band) |
| G6 (6 columns behind wins) | 53% ✓ | 55% ✓ |
| G7 mirror / Slayer mirror | 58% / 50% ✓ | 60% / **56%** ✗ |
| G8 vs the Lichen Baron | ✗ 1 of 8 rows; `bot:balanced` 57% | ✗ 0 of 8 rows; `bot:balanced` **67%** ✗ (band 40–65%). Without adaptation, the Baron loses to mono Sporeling 90%, mono Morel 80% and mono Veilstalker 73% |
| G11 tick mean / p99 | 0.18 / 0.52 ms ✓ | 0.17 / 0.50 ms ✓ |

### What it shows

- **It fixes the quiet opening.** The front moves within the first minute or so in nearly every battle, instead of after 2–4 minutes. A released wave crosses its frontier column together, so it captures the column instead of trickling through it. Commands per minute rise by 60–90%.
- **It doesn't fix archers.** Mono Gill Nest stays at 93–100% under every setting, including when only the reference bot musters and when it advances the moment its buildings are shot. A held army sits behind its border while archers shoot its buildings from beyond its aggro range. Advancing then sends it into the same losing fight.
- **It creates a new mono winner.** Mono Sporeling rises from 40% to 55–78% (above the 55% limit in 5 of 7 variants), and Old Mother Mold's swarm beats the reference bot 80% of the time. Merging isn't the cause: with merging off, mono Sporeling still goes from 6 to 12 wins in 20. Wave fights favor the cheap swarm for some other reason, not yet isolated.
- **It answers round 2's open question.** [Round 2](balance-backlog.md#recommendation-after-round-2) left "a melee wave release" as the untried rule-level option for G3, and E1 is that test: archers still win. Round 2's conditional fall-back (T2) showed the same swarm takeover (mono Sporeling 88%). Not yet tried: E1 together with B1 and a 21–24 s Gill Nest.
- **It weakens the defensive general and merging's Slayer check.** Mustered mono armies roll over the Lichen Baron (G8), and merge-on now beats the Slayer mirror 56% of the time (G7, limit 50%).
- **Runs get harder.** Boss reach falls from 25% to 11–23%, and battle-1 defeats rise from 33 to 45–50 of 80. Mostly that's Mold's mustered swarm in the early battles.
- **The Heartcap cliff is untouched.** Loser's Heartcap falls in 13–26 s, and the winner's is never scratched. This needs recommendation 2.
- **Army size is unchanged** at 1:00 and 2:00. Holding keeps units alive; it doesn't make more of them. A thin early field is an economy problem (recommendation 3).

**Verdict:** keep it as a prototype; don't adopt it as is. It's the first change that measurably fixes the opening, and it gives the player a real timing decision. But on its own it moves the dominance problem from archers to swarms, and it doesn't touch the cliff. If you like how it plays, the next step is to pair it with recommendations 2 and 3, then re-measure. A ranged counter-play rule is still needed for G3: for example, held units could answer anything that hits a building behind them.

The bot numbers can't say whether holding *feels* good. That's the playtest question. Try `?proto=hold` (or `?scene=battle&proto=hold`) and press `F`. Prototype runs are never saved.
