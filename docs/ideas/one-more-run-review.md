# Review of "Design Review and Roadmap to One More Run"

Written 2026-10-30 against `develop` at `31f081d` (M5 merged, the colony-swarm notes merged). The user brought the design review from a claude.ai conversation that couldn't read the repo: it worked from PR descriptions and a spec summary. This review checks its claims against the data, the code and the repo's own experiments, and sorts its proposals into new, already tried, and what to try first. **Nothing here is adopted.**

## Short answer

- **The diagnosis is right, and the repo already reached it:** the [engagement review](../engagement-review.md) (2026-10-28) and the [colony-swarm notes](colony-swarm.md) (2026-10-29/30). Placement doesn't matter, archers dominate, battles start quiet and end on a cliff, and runs are decided early.
- **Most of its numbers check out.** A few are stale (from before Hold and M5) and a few are wrong in ways that change what to do first.
- **Its "do first" archer bundle mostly repeats experiments that failed here.** One piece, a backline diver, is untried. A fresh measurement found something no document has: **on Twin Roots, mono Gill Nest wins 58%, not 100%.**
- **The Mycelium Network is a fuller version of the colony-swarm direction**, with useful specifics: keywords, Fed/Starved, hover stars. As written, though, it adds about eight systems at once to a home zone of eight plots, against round 3's "too much to learn" (F8). It should start as colony-swarm's [cheapest test](colony-swarm.md#the-cheapest-test), not as roadmap phases P2–P4.

## Fresh measurements (2026-10-30, `31f081d`)

**Runs with commanders.** `bot:balanced`, greedy drafts, random route, power policy auto, seeds 1–60 per commander. `npm run experiment -- --checks runs` can't measure this yet (it plays without a power policy).

| Commander | Ended in battle 1 | Reached the boss | Won | Boss fights won | Battle time when the boss is reached (median) |
|---|---|---|---|---|---|
| Vesper | 19 (32%) | 23 (38%) | 16 (27%) | 16 of 23 | 24.5 min |
| Armilla | 22 (37%) | 20 (33%) | 14 (23%) | 14 of 20 | 22.7 min |
| Cordis | 20 (33%) | 15 (25%) | 13 (22%) | 13 of 15 | 20.5 min |

**Mono bots against `bot:balanced` on each map.** 20 seeds in both seats (40 games, about ±8 points), merging on. G3 has only ever been measured on Bogwater Hollow.

| Map | Gill Nest | Sporeling Burrow | Capguard Hall | Amanita Lodge |
|---|---|---|---|---|
| Bogwater Hollow (1 lane) | **100%** | 65% | 45% | 38% |
| Stumpfield (1 lane) | **100%** | 75% | 45% | 38% |
| Twin Roots (2 lanes) | **58%** | 75% | 23% | 65% |

Archer dominance looks largely like a one-lane effect. The cause isn't known yet. It could be how the mono bot splits its Nests across lanes, the 6-row lanes, or the defender's second lane producing unharmed. Mono Sporeling is above 55% on every map since Hold. (Step A found the cause: [below](#step-a-results-and-what-they-suggest-for-b-and-c).)

## Fact check

### Confirmed
- **Gill Archer:** range 5, aggro 6, 14 Pierce every 1.2 s (11.7 DPS), Pierce ×1.5 against Medium (17.5 DPS). Merge perks are +0.75 range Bloomed and +1.5 Elder. `tierStatMult` is 2.8.
- **Experiment results:**
  - Gill Nest interval: 17, 19 and 21 s give 100%, 100% and 98%; 24 s gives 85% and breaks G4; 28 s puts mono Sporeling and mono Amanita at 57%. B1 with a 24 s interval reaches 55% but breaks G1, G4 (33% Decisions) and G7.
  - T3 strong cuts mono Gill Nest to 30%, with every battle ending in a Decision.
  - Under mono Gill Nest pressure, the defender has 0–7 supply on the field. Every one-off defender loses 95–100%.
- **Hold:** 1.5-tile rally, 30 s holds, 10 s cooldown, AI muster at 12 supply. It moved the first flip to 0:34–1:29, and mono Gill Nest stays at 93–100% under it.
- **Run structure:** a six-row route; drafts at waves 2, 4, 6 and 8; 21 relics; a 3600 HP boss; counter warnings at 2:00 and 5:00 that take effect at 4:00 and 7:00.
- **Sporestorm:** starts at 4:00 with +20% Heartcap damage per stack. That has been the data since M1; PR #20 only corrected the spec's text.
- **Soil and adjacency:** Rich Loam gives +50% gold to economy buildings only. Mycorrhizal Link is the only adjacency rule. SPEC §17 #11 excludes core adjacency rules.
- **Heartcap and playtests:** the losing Heartcap falls 13–20 s from first hit to dead (14–26 s with Hold), and the winner's is never touched. The F1 quotes are accurate.

### Stale
| Claim | Now |
|---|---|
| "41% of runs end in battle 1; the boss loses 80%" | Measured before Hold. Hold made it worse (46 of 80 runs ended in battle 1, boss reach 11%). With M5's commanders it's about **34%** (61 of 180), and the boss loses about 74% of the fights it gets (43 of 58). The curve is still upside down, but less so |
| "A run takes 25–35 min" | That's the spec's target, not a measurement. Bots that reach the boss spend a median 20–25 min in battle. Human time with pauses and drafts is unmeasured |
| "Your worktree notes aren't committed" | The colony-swarm notes are on `develop` (PRs #23 and #25). Codex's two notes, `fun-and-agency-research-2026-10-29.md` and `symbiotic-colonies-slice.md`, are still uncommitted in `~/.codex/worktrees/5608/Sambattler/docs/` |
| "M5 PR #22 is on develop" | Merged on 2026-10-29. Armilla was reworked on 2026-10-30, and the commander tournament passes (spread 10 points) |

### Wrong or misread, and why it matters
| Claim | Reality | Why it matters |
|---|---|---|
| Archers hit "Capguard, which is supposed to be the counter" | The triangle is Sporeling > Gill Archer > Capguard > Sporeling (§11.4). Archers are *meant* to beat Capguards. The designed counters are the Sporeling and, since M4, the Amanita Knight | The proposed **Cap Shield** (absorbs 3 Pierce hits) would let Capguards beat both units meant to beat them. Capguard > Sporeling is already +40 at 60 supply. Merged Capguards already resist Pierce (×0.85, ×0.7) |
| "Base range 4.5, as §11.4 suggested" | M1 tried ranges from 4.5 down to 3: mono Gill Nest 78–100% | Already failed |
| Muster spawning "attacks the root cause directly" | Tried four ways: Burrow batch size (M1), synchronised spawns (M1), mustering at 8 supply (M1, 85–100%) and Hold with an AI muster at 12 (93–100%). The engagement review's explanation: a held army waits while archers shoot its buildings from beyond its aggro range (6 against 4) | Already failed |
| Range "stacks with no ceiling … an Elder Longgill reaches 8+" | Longgill is an M6 strain and doesn't exist yet. Today's maximum is 7.25. G3 battles have no upgrades, and they are decided while armies are 0–7 supply, so merges are rare | A range cap can't move G3. It might matter later, for runs |
| Mortar +50% against clumps | "Stronger Mortars" and turret splash were tried in M1, with no effect | Unlikely to help alone |
| Loam is "a solved, one-time check" | On Bogwater, all loam is in contested columns 10–21, about +35–40% forward price away. It's already a forward bet, one players don't take (F1) | The real problem is that the bet doesn't pay. The doc's other point stands: spawners and towers ignore soil |
| Velvet Shrine is an existing placement factor | It's an M6 mastery building and isn't built | — |
| Content names | "Mother Mould" clashes with the general Old Mother Mold. The Puppet Pod is Cordis's planned building, not a commander. Knitting Circle and Spore Tithe are relics. A Veilstalker "burrow-leap" touches §17 #7 (no burrowing). Spore Trials touch §17 #1 (no leaderboards or backend) and #15 (no daily seeds) | Rename or rescope before anything is specced |
| "SPEC §5.2 (spawning and arrival)" | Spawning is §4.4. §5.2 is movement and Hold | Cosmetic |

The external research (sales figures, quotes and fungal biology) wasn't checked. No recommendation below depends on it.

## The proposals, sorted

| Proposal | Already in the repo? | Verdict |
|---|---|---|
| Archer bundle: muster spawns, range cap, Cap Shield, Mortar vs clumps | Mostly tried (above) | Don't run it as written. Keep the **diver**: a fast unit that prefers ranged targets. Targeting already has preferred classes (`siege` prefers buildings, `slayer` prefers tier 2+), so it's a small proto knob. Then find out why Twin Roots differs |
| Replace G3 with diversity metrics | Round 2's recommendation already raised rethinking G3 | Agree in principle. But the doc's own clause (a), "mono bots ≤ 60%", still fails today, so archers still need an answer. Pick share and entropy need bots that choose an archetype, and today's bots are fixed-weight profiles. Measuring G3 on every map is cheap and could come first |
| Heartcap last stand at 25% | Engagement review rec 2: breach moments at ⅔ and ⅓, cap the storm's Heartcap bonus | Yes. Pair it with the storm's +20% per stack (×2 at 5 stacks), which causes much of the cliff |
| Hot start: a free pick at deploy | Engagement review rec 3 | Yes. Cheap to prototype |
| A draft after every wave | Conflicts with engagement review rec 5: **fewer, bigger** drafts | Disagree. The problem is card size (+15%), not card count, and each draft holds the sim. `waveSeconds` also drives interest, the storm and the counter cycle |
| Battles of 4–5 min, runs of 20–25 min | G4's band is 5:30–8:30. Bot runs already spend 20–25 min in battle | Later. A shorter battle with today's Heartcap cliff is worse, not better |
| Battle 1 ≥ 85% | Bots win battle 1 about 66% of the time today, with commanders | Yes as a target, mostly data |
| Open counters that grant loot | Engagement review rec 6 | Yes, after the network test. It's M7 territory (the Gray Rot) |
| Mycelium Network (links, colonies, keywords, Fed/Starved, soil, formations) | The colony-swarm notes cover the direction, not these specifics | Start much smaller (next section) |
| 8 archetypes, 3 broken engines | Spec §11.7 already sketches relic combos | After the network test proves placement can matter |
| Meta: keyword unlocks, codex, one-key restart, Decay | M6 and M7 cover most of it | Keyword-at-a-time unlocks are a good answer to F8. One-key restart is a quick UI win |
| Spore Trials (seeded 72 h mode) | Out of scope (§17 #1 and #15) | Determinism makes a local-only version cheap. Defer |

## The network design: what to keep, what to rethink

**Keep:**
- Rules printed on the card.
- Hover stars and always-on threads. Hivemind's live badges are the same idea.
- A keyword vocabulary so the cards read as a set.
- Fed/Starved as a reason to build forward, which answers F1 better than a cheaper surcharge.
- Compost as a reason territory matters.

**Rethink:**

1. **There's no room for counting neighbors to be a decision.** Bogwater's home zone is 4 × 8 tiles, eight 2×2 plots. Twin Roots has six per lane.
   - A packed home block gives every building two or three edge neighbors without trying. "+10% per linked neighbor, max 3" is a flat +20–30% for everyone.
   - Everything at home is one colony, so "splitting your base into two colonies" can't happen there, and a tier-6 threshold is nearly the whole home zone.
   - Hivemind works because each hex touches six others on a board of 18 (see colony-swarm).
   - Rules have to care about *which* neighbor (keyword pairs, or in front of, behind and beside along the lane), not *how many*. Or the map needs more plots (colony-swarm's taller maps).
2. **Too many systems for round 3's testers:** links, colonies, 8 keywords × 3 tiers, Fed/Starved, Rhizome tiles, universal loam, compost, depletion, deadwood, fairy rings, Spore Columns, a Colony Heart and lane soils. The doc's own "avoid" list includes "adding systems without cutting old ones". Colony-swarm's [cut list](colony-swarm.md#what-it-could-simplify) (forward price, upgrade tracks, interest and the Spore Exchange, the capture rule) belongs in the same proposal.
3. **Percentages are what didn't work before.** Colony-swarm rejected the Codex draft's timer trims for being too small to feel, and Mycorrhizal Link's +15% is the same kind of effect. The doc's tier effects that change behavior, like Volley ("every 4th shot splits"), are the right kind. Its +10% and +25% spawn-rate links aren't.
4. **The general has to play by it.** §7.1 is an honest AI with the same rules, so the general's placement score (§7.3) needs link, keyword and Fed terms. Hivemind's greedy rule suggests it can stay simple. The doc's roadmap doesn't mention it.
5. **Measure it before the playtest.** The doc's P2 gate, "≥ 60% of placements change because of links", needs telemetry, and §17 #1 rules that out. Colony-swarm's placement-spread check works headless: simulate every legal plot for a building and compare the best with the median. Run it on today's rules first, to get a baseline.
6. **Spore Columns duplicate Hold.** Hold already sends squads.

## Suggested path

**Step 0, the user's call:** colony-swarm's [timing question](colony-swarm.md#timing). Finish M6–M8 as specced, or settle the direction before M6 and M7 content is written against today's building model. This review and the design review both point to the second.

**A. Measure, no rule change** (one session, `feature/` branch from `develop`):
- G3 on every map, 40 seeds, plus a trace of why Twin Roots differs.
- A diver prototype (`?proto=` knob): Veilstalkers or Morel Runners prefer `ranged` targets.
- `--commander` and `--power-policy` for the `runs` and `engagement` checks, so pacing numbers include M5.
- The placement-spread tool, run on today's rules.

**B. Battle feel prototypes** (engagement review recs 2–3, the doc's P1), each a proto knob, judged by a dev-site playtest:
- a Heartcap breach and last stand, together with the storm's Heartcap bonus
- a hot start: a free pick at deploy and a gentler battle 1
- bigger drafts, not more drafts

**C. Network test** (the doc's P2, colony-swarm's cheapest test). Needs §17 #11 changed first:
- **On paper:** six to eight buildings with printed neighbor rules.
- **In game, on Bogwater:** three or four rules about *which* neighbor, at least two of them changing what units do. Hover stars and threads, and placement scores for the general.
- **Judged by:** the placement-spread number and the colony-swarm playtest questions.

Then write M6 and M7 content against whatever C shows.

## How it fits the code

- **Positional modifiers already exist.** `src/sim/effects.ts` resolves `zone`, `onLoam` and `adjacentOwnBuildingsGte` when a stat is used. Only two building stats support them today, `building.spawnInterval` (`systems/spawning.ts`) and `building.goldPerTick` (`systems/economy.ts`). Keyword selectors (`adjacentKeyword`, `colonyKeywordGte`) slot in beside them.
- **Unit stats are compiled per side, not per building.** "Units from this building deal more", which the Velvet Shrine and every unit-changing transformation need, means stamping perks on a unit at spawn from its source building. `addUnit` already gets the building id. This is colony-swarm's "one or two new hooks".
- **Colonies are connected components.** Recompute them when a building is placed or destroyed, and keep them in state, which changes the goldens.
- **Compost and depletion need a mutable soil layer.** Loam is read from the static `state.map.tiles` strings (`footprintOnLoam` in `placement.ts`).
- **Hover stars and threads can be render-only.** Adjacency comes from state, like the clarity pass's tooltips. Today they'd only mean something with Mycorrhizal Link.
- **A last stand needs a new trigger.** Triggers fire on merges, deaths, destroyed buildings, kills, wave starts and battle start (`src/data/schema.ts`). Nothing fires on Heartcap HP.
- **Cheap knobs:** muster spawning is data (`spawn.count` and `interval`), draft timing is `draftWaves`, and the diver is a preferred class in `systems/targeting.ts`.

## Step A results and what they suggest for B and C

Measured on 2026-10-30 on `feature/step-a-measurement`, with no rule or data change. Full tables are in the [balance backlog](../balance-backlog.md#step-a-measurement-before-m6-2026-10-30).

**G3 on every map** (100 games per cell):
- Mono Gill Nest wins 100 / 100 / 63% on Bogwater, Stumpfield and Twin Roots (54% on the three-lane test map).
- Mono Sporeling fails everywhere (70–77%; 85% on three lanes).
- Twin Roots adds Amanita (64%). Stumpfield adds Morel (57%).

**Why Twin Roots differs:** splitting.
- Both sides spread their spawners over two lanes, so each lane's archer mass is half of Bogwater's.
- The defender's other lane keeps producing and counterattacks. The archers' Heartcap is hit in 60% of games, against 0% on Bogwater.
- Forced to concentrate, mono Gill Nest goes 63% → 78%. When both sides concentrate, it reaches 94%. Lane width isn't the cause.
- The archer problem is a ranged mass in one corridor.

**Diver:** not an archer fix.
- It helps only where the mass is already split: Twin Roots, with the burst and a defender that opens with a Veilstalker Hollow (54% → 37%).
- It does nothing on one-lane maps.
- Without the burst it hurts.
- On Morel Runners it creates a mono Morel takeover.
- Under `bot:balanced` it changes no guardrail verdict.

**Runs with commanders** (auto powers, 60 seeds each):
- 32–37% of runs end in battle 1, and a run that reaches the boss wins 70–87% of the time.
- Without powers, 42–70% end in battle 1.
- Losses are spread evenly over the three maps (28–35% of battles).

**Placement spread** (today's baseline):
- On Bogwater, the best plot is no better than the median at 1:00, and at 3:00 it is about 25% of a building's worth better. Split-half ρ is 0.2–0.3, so the ranking is mostly noise.
- What signal there is says "don't build forward".
- Mycorrhizal Link doesn't register.
- Twin Roots' lane choice is the only clear signal (ρ 0.68 at 3:00).

What this suggests:

- **G3 should change, and the user is open to that.** Today it measures one one-lane map with 40 games. It misses mono Sporeling's real 75% and every multi-lane failure. A replacement could:
  - measure every map in the run pool, with 100 games;
  - report the worst map and the mean;
  - add the diversity terms the design review asked for once bots can choose an archetype.

  With today's numbers, both mono Gill Nest and mono Sporeling fail it on every reading, so rewriting G3 doesn't excuse the archers.
- **The archer answer is probably structural: a second front, not a unit rule.** Every unit-level lever has now failed on one-lane maps, the diver included, and a second lane alone takes mono Gill Nest from 100% to 63%. Ways to give one-lane maps a second front, none tested:
  - something worth defending away from the line, like colony-swarm's taller maps or Fed/Starved forward buildings;
  - flank or stance rules;
  - more two-lane maps in the pool.

  A lane-count change touches maps and the AI, not unit data, and needs the user's OK. Mono Sporeling needs its own look: it wins however lanes are used, and it was pushed up by Hold's 12-supply muster.
- **For B:** the run is lost in battles 1–2, not at the boss. A hot start (a free pick at deploy, a gentler battle 1) aims at the biggest loss. The engagement baseline per commander shows the Heartcap cliff is unchanged: the winner is untouched in 359 of 360 battles, and a beaten Heartcap falls in 12–23 s. Judge B with `npm run experiment -- --checks runs,engagement --commander all --power-policy auto`. The targets: battle-1 losses well under the current 32–37% (the design review asked for battle-1 wins ≥ 85%), and a measurable fall time.
- **For C:** the spread tool gives the network test a number to beat. On Bogwater today, placement is noise at 1:00 and worth about a quarter of a building at 3:00, mostly through "stay home".
  - A neighbor-rule set worth keeping should lift split-half ρ to Twin Roots' level (0.6–0.7) or higher, and best − median well above 25% of a building's worth, at both pauses.
  - Mycorrhizal Link's +13% doesn't register at all, which supports the review's point that the rules must change what units do, not add percentages.
  - Run `--checks spread` with the network knob on, and pass `--plots` to see which plots win.

## Second-front test (2026-10-30)

Measured on `feature/second-front-test` with four test-only maps. Nothing is adopted, and the run pool is unchanged. Full tables are in the [balance backlog](../balance-backlog.md#second-front-two-lane-test-maps-2026-10-30). 100 games per cell, mono win rate against `bot:balanced`:

| | Bogwater | Stumpfield | Twin Roots |
|---|---|---|---|
| One lane (today) | Gill Nest 100 | Gill Nest 100 | — |
| Two 4-row lanes (same plots) | Gill Nest 80, Amanita 73 | Gill Nest 85, Amanita 71 | — |
| Two 6-row lanes (Twin Roots' shape, +50% plots) | Gill Nest 62, Amanita 65 | Gill Nest 67, Amanita 58 | Gill Nest 63, Amanita 64 |

- **The sides split on every two-lane version, but that isn't enough.** The archers fall to 80–85% at the same plot count, and to Twin Roots' failing 62–67% only in Twin Roots' shape.
- **Build room in the other lane is what matters, not lane width.** With 4-row lanes the defender's second lane stays small and rarely counterattacks. A tall map whose lane edges are stumps plays like the 4-row maps (79 / 88%).
- **Every two-lane version adds a mono Amanita takeover** (58–73%). Mono Sporeling still fails (67–82%).
- **The diver helps only in one case:** a defender that opens with a Veilstalker Hollow, on Bogwater shapes (41% tall, 50% at 4 rows). It does nothing on Stumpfield (63–68%).
- **G4 passes on every test map** (medians 6:51–7:27, Decisions 0–8%).

What it suggests:
- **A second lane alone isn't the archer fix.** It moves one-lane maps to Twin Roots' level, which also fails, and it costs the one-lane maps their identity: one front, 8 rows and 8 home plots.
- **The lesson is the mechanism.** The defender needs somewhere to build an army the archer mass can't reach, and a way past the mass to the archers' Heartcap. A one-lane fix should copy that. The backlog sketches forward buildings worth defending and flank orders.
- **For the G3 rewrite:** on two-lane maps, splitting beats archers but concentrating beats Amanita. `bot:balanced` always splits, so a two-lane G3 partly measures that habit.

Whether one-lane maps get a second front stays the user's call. On these numbers, the recommendation is no.

## Decisions (2026-10-30)

The user's answers:
- **Pause before M6.** Steps A–C come first.
- **Step A goes ahead:** G3 on every map, the diver prototype, commander-aware run checks and the placement-spread tool.
- **G3 and §17 #11 can change** if needed: the user is open to rewriting G3 and to changing §17 #11.
- **The spec and the original plan are malleable.** The goal is the most fun and engaging game, and the spec and milestones can change to get there. Rule changes and retunes still go to the user with numbers first (`.claude/rules/balance.md`).

- **Step A ran on 2026-10-30** with no rule or data change (results [above](#step-a-results-and-what-they-suggest-for-b-and-c)). Steps B (battle-feel prototypes) and C (a small placement and network test) come later, each in its own session, and both are judged with step A's tools.

Still open:
- whether Codex's two uncommitted notes and the original design review should come into `docs/ideas/`;
- after step A, how to rewrite G3, and whether one-lane maps get a second front (measured [above](#second-front-test-2026-10-30): not as the archer fix on its own).
