# Balance solutions backlog

Candidate solutions discussed on 2026-10-27. These are untested design hypotheses, not approved balance changes. Track player observations in [playtest feedback](playtest-feedback.md) and measured changes in the [balance changelog](../data/CHANGELOG-balance.md).

## Archer spam and forward building (F1, F2, G3)

The current failure has two reinforcing causes: ranged survivors accumulate while isolated melee reinforcements die on approach, and ranged building damage halves the defender's production. Prior scalar tuning, stronger Mortars, turret changes, synchronized spawning, and mustering have not solved G3. Mustering plus Pierce resistance still left mono Gill Nest at 85–90%; see the [prior experiments](../data/CHANGELOG-balance.md#open-g3-mono-gill-nest).

| ID | Candidate | Intended effect | Main risk | Status |
|---|---|---|---|---|
| B1 | Sporeling approach rush: a short automatic rush on engagement, followed by a cooldown; retain nearest-enemy targeting so frontline troops can intercept | Let the intended archer counter reach contact and force archer losses; give archers a reason to have a screen | Sporeling spam could replace archer spam; Capguards must remain a reliable answer | Prototyped 2026-10-27 as `approachRush`, not adopted: mono Gill Nest stays 98–100% at every setting; the ×3 preset breaks G4 (25% Decisions) and G7. See [results](#prototype-results-2026-10-27) |
| B2 | Close pressure required for production suppression: arrows still damage buildings, but half-speed production requires an enemy within roughly 1–2 tiles | Break ranged production starvation, strengthen the siege role, and make forward forts more useful | Stronger turtling and longer endings; does not solve open-field archer scaling on its own | Prototyped 2026-10-27 as `besiegedBy` in `balance.json` (default `all`; selling stays locked under any damage). See below |
| B3 | Firing congestion: limit efficient firing ranks or reduce access to targets when friendly ranged formations crowd a firing corridor | Stop every additional archer contributing full immediate damage from a deep formation; encourage mixed armies | More movement logic, readable blocked-fire feedback, and lane-width sensitivity | Prototyped 2026-10-27 as `firingCongestion`, not adopted: halves archer margins at 60 supply but mono Gill Nest stays 100%. See [results](#prototype-results-2026-10-27) |
| E1 | Hold / Advance per lane: held units gather behind the border column and are released together; every AI musters with the same command (from the [engagement review](engagement-review.md)) | Turn trickles into waves; give the player a timing decision | Turtling; a swarm takeover | Prototyped 2026-10-28 as `laneStance` (preset `hold`), not adopted: the front moves by 0:34–1:29 instead of 2:16–4:14, but mono Gill Nest stays 93–100% and mono Sporeling rises to 55–78%. See [results](engagement-review.md#prototype-e1-hold--advance-per-lane-2026-10-28) |
| B4 | Finite unit lifespan: a generous, clearly displayed lifetime before fungal troops wither | Prevent indefinite accumulation and make shorter travel from forward spawners valuable | Broad change to army persistence; slow units, merging and defensive stalemates need attention | Prototyped 2026-10-27 as `unitLifespan`, not adopted: no effect at 60–120 s (archers rarely live that long); mono Gill Nest 100%. See [results](#prototype-results-2026-10-27) |

## Proposed evaluation

1. Prototype B1 and B2 separately to measure each causal effect, then test their combination. Mustering may support them, but is not sufficient by itself according to existing experiments.
2. Exercise sustained reinforcements and 12-, 30- and 60-supply fights. Check whether Sporelings reach contact and kill archers, and whether defenders keep producing under ranged pressure.
3. Preserve the intended Sporeling → Archer → Capguard → Sporeling relationships. Check mixed armies, both seats, merging and upgrades, rather than accepting a win against one reference bot alone.
4. Run G1–G7, battle-length/Decision checks, and forward-building playtests. G3 remains the existing mono-strategy acceptance check; another mono strategy taking over is a failure.

No archer-balancing candidate is implemented by the review-fixes PR. The five correctness fixes are separate from these experiments.

## Round 2: Gill Nest rate, opening tempo and the trickle (2026-10-27)

After round 1 showed that the defender never fields an army against mono Gill Nest, the user asked whether tuning the archers' spawn rate helps, and for prototypes aimed at the archers' opening tempo and the defender's trickle. Same rules: every change is default-off, nothing is adopted. Results are [below](#round-2-results-2026-10-27).

| ID | Candidate | Intended effect | Main risk | Status |
|---|---|---|---|---|
| I1 | Gill Nest spawn interval 15 s → 17–28 s, alone and with B1 or B3 | Fewer archers: the user's question | M1: breaks G1 (Capguard Hall never loses) and stalls G4 | Measured 2026-10-27 with `building.gillNest.spawn.interval:<s>`, not adopted: alone it never gets below 85%; with B1 it reaches 55% at 24 s, but mono Sporeling takes over (57%) and G4 and G7 fail |
| T1 | Warm-up: a new ranged spawner's first unit waits a full interval (others keep half) | Blunt the two-Nest opener | Slower ranged openers in general | Prototyped as `rangedFirstSpawnFraction`, not adopted: mono Gill Nest 100% (so is `firstSpawnFraction: 1` for every building) |
| T2 | Fall back while outnumbered: a melee unit closing on an enemy unit falls back toward home while its side's nearby supply is below the enemy's near the target, at most 10 s per life, then commits | Stop defenders trickling into an archer mass one at a time; a conditional variant of mustering | A §5.2 change ("units always advance") like mustering; needs the user's OK if ever adopted | Prototyped as `fallBack`, not adopted: harmful. Mono Gill Nest 100%, mono Sporeling 88%, Sporeling > Gill Archer lost in duels (0/5) |
| T3 | Home spawners shoot back: spawners in the home columns fire at the nearest enemy unit in range | Stop archers sieging home spawners from just outside turret reach | Turtling and Decisions | Prototyped as `spawnerDefense`, not adopted: at 12 damage / range 6 mono Gill Nest stays 100% and 73% of reference battles end by Decision; at 25 / range 7 it falls to 30%, but every battle is a Decision and four other mono bots take over |
| D1 | Diagnostic: defenders that answer archers with Sporeling Burrows or Amanita Lodges | Is G3 partly a `bot:balanced` artifact? | — | Measured with one-off bots (no reference bot changed): no. Every defender loses 95–100% to mono Gill Nest, including mono Sporeling Burrow (98%) |

## Adaptive general and G8 (M4)

Recorded on 2026-10-27 after M4. G8 fails against the Lichen Baron (details and diagnosis in [the M4 plan](m4-plan.md#g8-in-detail-npm-run-testslow-the-lichen-baron-30-seeds-mono-bot-as-the-player)). Each candidate changes §7.4 behavior, so none is implemented.

| ID | Candidate | Intended effect | Main risk | Status |
|---|---|---|---|---|
| A1 | Read merging harder: raise the Elite score multiplier (1.2) or the Swarm discount (0.5) | A merge-heavy Sporeling swarm reads Elite and gets Slayers instead of Capguards that Bloomed Sporelings beat | Ordinary merging armies get Slayer counters too | Prototyped 2026-10-27, not adopted: the read flips as intended (×3: Elite in 18 of 60 cycles against mono Sporeling, ×4: 22), but the Baron has no Veilstalker weight, so mono Sporeling still wins 33–37% against him (off: 23%). Even with Veilstalker weight 1 it wins 30–33%. G8 unchanged at every setting (×2, ×3, ×4, ×2 with discount 1.0); `bot:balanced` 47–53%. G7 can't move: bots don't analyse (58% / 50%, identical) |
| A2 | Floor weight for counter-set buildings when a counter activates (e.g. 1 before the ×3) | Single-battle generals can field counters outside their §11.11 weights (the Baron's Scythecaps, Veilstalkers) | Blurs the generals' personalities | Prototyped 2026-10-27 as `ai.counter.counterFloorWeight`, not adopted: the Baron now fields Scythecaps and Veilstalkers, but G8 still passes 1 of 8 rows. See [results](#a2-and-a3-g8) |
| A3 | An earlier first cycle (e.g. 1:30 → 3:30) | Counters land before rushes (mono Rootbreaker routs the Baron by 4:00–5:00) | Less telegraph time; the spec's warning lead is 2 waves | Prototyped 2026-10-27 (data only: `ai.counter.cycles`), not adopted: G8 0 of 8 alone, 1 of 8 with A2; boss reach 25% → 30%. See [results](#a2-and-a3-g8) |

### B2 prototype: which hits suppress production (2026-10-27)

`besiegedBy: "melee"` lets only non-projectile hits halve spawning and income; `"none"` turns suppression off. Measured against current M4 content:

| Check | `all` (today) | `melee` | `none` |
|---|---|---|---|
| G3 mono Gill Nest vs `bot:balanced` | 100% | 100% | 100% |
| G1 Gill Nest pairings | 7/8 | 7/8 | 7/8 |
| G4 median / Decisions / bot wins | 7:12 / 5% / 53% | 7:49 / 10% / 48% ✓ | 8:35 / 23% / 40% ✗ |
| G5 (+150 gold wins) | 70% | 65% | 73% |
| G6 (6 columns behind wins) | 53% | 50% | 78% |
| G7 mirror / Slayer mirror | 58% / 50% | 56% / 48% ✓ | 53% / 54% ✗ |
| G8 vs adaptive Baron | fails | fails (same rows) | fails (Capguard now drops 27 points) |
| Runs reaching the boss (80 seeds) | 25% | 25% | 28% |

Melee-only is safe for the guardrails and slightly less snowbally by G5, but archers still win 100%, so production starvation isn't what makes them dominant (consistent with the M1 diagnosis: they win the trickle fights). Turning suppression off entirely breaks G4 and G7.

## Prototype results (2026-10-27)

Every candidate is behind a `balance.json` setting that is absent by default, so the shipped rules, goldens and hashes are unchanged. Measure a setting with `npm run experiment -- --proto <spec>`, or playtest it with `?proto=<spec>` in the browser (for example `?proto=b1,besiegedBy:melee`; prototype runs are never saved). Presets and the `path:value` override syntax are in `src/data/proto.ts`. Of these, only `hold` (E1) was adopted, on 2026-10-28; `nohold` measures the rules without it. B1–B4, A2, A3 and T1–T3 stay off until they show a benefit.

| Preset | Setting |
|---|---|
| `b1` | `approachRush`: Sporelings run at ×3 speed for up to 1.5 s when they close on an enemy unit (not a building), then wait 8 s before they can rush again. Targeting is unchanged |
| `b3` | `firingCongestion`: a ranged unit's shot deals ×0.5 damage when 2 or more friendly ranged units stand between it and its target, within 0.6 tiles of the line of fire |
| `b4` | `unitLifespan`: every unit withers 90 s after spawning (a merged unit starts a fresh lifespan) |
| `a2` | `ai.counter.counterFloorWeight: 1`: while a counter is active, every counter-set building in the kit has base weight ≥ 1 before the ×3 |
| `a3` | `ai.counter.cycles`: the first cycle analyses at 1:30 and activates at 3:30 (the second stays 5:00 → 7:00) |
| `hold` | `laneStance` (E1): per-lane Hold / Advance. Held units rally in the middle of the column behind the border column. A hold lasts at most 30 s, then the lane can't hold again for 10 s. Every AI holds until 12 supply stands in the lane, then advances, and holds again below 4 |

### Archer candidates (B1, B3, B4)

`npm run experiment` against M4 `main`. G3 uses 20 seeds in each seat (40 games), G8 uses 30. The "baseline" column reproduces the M4 numbers.

| Check | Baseline | B1 | B1 + `besiegedBy: melee` | B1 at ×2, 1 s | B3 | B4 |
|---|---|---|---|---|---|---|
| G3 mono Gill Nest (as player / as enemy) | 100% (100 / 100) | 100% (100 / 100) | 98% (100 / 95) | 100% (100 / 100) | 100% (100 / 100) | 100% (100 / 100) |
| Another mono bot above 55% | none (Amanita 50%) | none (Sporeling 48%) | none (Sporeling 48%) | none (Sporeling 53%) | none (Amanita 50%) | none (Amanita 55%) |
| Defender damage vs mono Gill Nest: Sporelings / turrets | 24% / 69% | 44% / 48% | 52% / 36% | 35% / 59% | 25% / 69% | 24% / 70% |
| G1 (Gill Nest pairings) | 7/8 ✗ | 7/8 ✗ | 7/8 ✗ | 7/8 ✗ | 7/8 ✗ | 7/8 ✗ |
| G2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| G4 median / Decisions / bot wins | 7:12 / 5% / 53% ✓ | 7:58 / 25% / 55% ✗ | 8:26 / 25% / 60% ✗ | 7:59 / 10% / 38% ✓ | 7:44 / 8% / 48% ✓ | 7:34 / 8% / 50% ✓ |
| G5 (+150 gold wins) | 70% ✓ | 60% ✓ | 60% ✓ | 68% ✓ | 68% ✓ | 68% ✓ |
| G6 (6 columns behind wins) | 53% ✓ | 75% ✓ | 80% ✓ | 75% ✓ | 73% ✓ | 55% ✓ |
| G7 mirror / Slayer mirror | 58% / 50% ✓ | 54% / 50% ✗ | 52% / 53% ✗ | 56% / 52% ✗ | 56% / 51% ✗ | 57% / 51% ✗ |
| G8 asserted rows passing | 1 of 8 ✗ | 1 of 8 ✗ | 1 of 8 ✗ (`bot:balanced` 67% ✗) | 1 of 8 ✗ (`bot:balanced` 67% ✗) | 1 of 7 ✗ | 0 of 7 ✗ |
| G11 tick mean / p99 | 0.18 / 0.52 ms ✓ | 0.18 / 0.54 ms ✓ | 0.18 / 0.53 ms ✓ | — | 0.18 / 0.52 ms ✓ | 0.18 / 0.51 ms ✓ |
| Runs reaching the boss (80 seeds) | 25% | 39% | 39% | 25% | 26% | 24% |

The intended edges, as wins of 5 and mean remaining-supply margin, at 12 / 30 / 60 supply each, and in the 3-minute production duel (sustained reinforcement, 6 games):

| Edge | Baseline | B1 | B3 | B4 |
|---|---|---|---|---|
| Sporeling > Gill Archer | 5 (+4) · 5 (+9) · 5 (+8); production 6/6 | 5 (+6) · 5 (+13) · 5 (+22); 6/6 | 5 (+4) · 5 (+9) · 5 (+19); 6/6 | same as baseline |
| Gill Archer > Capguard | 5 (+2) · 5 (+14) · 5 (+39); 6/6 | unchanged | 5 (+2) · 5 (+13) · 5 (+19); 6/6 | same as baseline |
| Capguard > Sporeling | 5 (+8) · 5 (+22) · 5 (+40); 6/6 | 5 (+8) · 5 (+20) · 5 (+39); 6/6 | unchanged | same as baseline |

**B1 sweep** (G3 only, mono Gill Nest / mono Sporeling / mono Capguard): speed ×2–×6, rush 1.5–3 s, cooldown 0–8 s all leave mono Gill Nest at 95–100%. The strongest setting (×6, 3 s, no cooldown) reaches 95%. Giving the rush to every melee unit, not only Sporelings, leaves it at 100%. The rush works as intended in isolation: Sporelings beat archers by a wider margin at every army size, Capguards still beat Sporelings by the same margin, and no mono Sporeling takeover appears (28–53%). In bot battles it makes the Sporelings fielded by `bot:balanced` deal almost twice the share of its damage. But it lengthens the reference battles (G4 Decisions 25–28% at ×3 or at ×2 with 1.5 s; ×2 with 1 s passes G4 at 10% but `bot:balanced` falls to 38% against the scripted general and 67% against the Baron). It also costs merging part of its edge (G7 mirror 52–56%). It is the only candidate that raised boss reach (39%), because both sides' Sporeling swarms trade instead of snowballing.

**B3** is the army-scale fix the M1 diagnosis asked for: at 60 supply the Gill Archer > Capguard margin halves (+39 → +19) and Sporeling > Gill Archer more than doubles (+8 → +19). G3 doesn't move, because these battles never reach 60 supply (below). Setting the blocked damage to 0 or blocking from the first rank also leaves mono Gill Nest at 100%. G7's Slayer clause reads 51% (limit 50%, within noise).

**B4** does almost nothing at 90 s. At 60 s mono Gill Nest is still 100%. At 120 s every result is identical to the baseline: 77% of the archers die, mostly to turrets, long before a lifespan matters.

**Why none of them moves G3** (instrumented mono Gill Nest vs `bot:balanced`, seeds 1–10): the defender never has an army. At each minute mark it fields 0–7 supply against the archers' 8–26, its fronts don't move, and its 3–4 buildings fall by about 5:00. Its Sporelings reach the archers (median 6.6 tiles walked, 7.6 s alive) but arrive one or two at a time. Against mono Capguard the same bot loses 3.6× as many Sporelings (1,201 against 332 over the 10 battles), because its buildings survive and keep producing. Extra probes rule out the obvious levers: cutting Pierce damage to structures to ×0.25 or ×0.1 (from ×0.5) still leaves mono Gill Nest at 100% (it just wins later, 6:32–8:30) and pushes mono Sporeling to 57–65% (a takeover). Turret range 11 leaves it at 100%. The early game is lost to the archers' opening tempo (two Nests against a Burrow and a Cellar) and the trickle, not to approach speed, army-scale focus fire or accumulation.

### A2 and A3 (G8)

G8 against the Lichen Baron, 30 seeds, mono bot as the player (M4 table format: adaptation off → on, drop in points; ✓ / ✗ only on asserted rows):

| Mono bot | Baseline | A2 | A3 | A2 + A3 |
|---|---|---|---|---|
| Sporeling Burrow | 23% → 37% (−13) ✗ | 23% → 27% (−3) ✗ | 23% → 20% (+3) ✗ | 23% → 27% (−3) ✗ |
| Capguard Hall | 30% → 13% (+17) ✗ | 30% → 23% (+7) ✗ | 30% → 13% (+17) ✗ | 30% → 7% (+23) ✓ |
| Gill Archer Nest | 100% → 100% (0) ✗ | 100% → 100% (0) ✗ | 100% → 100% (0) ✗ | 100% → 100% (0) ✗ |
| Rootbreaker Den | 63% → 70% (−7) ✗ | 63% → 70% (−7) ✗ | 63% → 53% (+10) ✗ | 63% → 63% (0) ✗ |
| Veilstalker Hollow | 23% → 27% (−3) ✗ | 23% → 37% (−13) ✗ | 23% → 30% (−7) ✗ | 23% → 37% (−13) ✗ |
| Tender's Ring | 33% → 23% (+10) ✗ | 33% → 23% (+10) ✗ | 33% → 27% (+7) ✗ | 33% → 20% (+13) ✗ |
| Hammercap Forge | 30% → 20% (+10) ✗ | 30% → 23% (+7) ✗ | 30% → 13% (+17) ✗ | 30% → 37% (−7) ✗ |
| Amanita Lodge | 23% → 3% (+20) ✓ | 23% → 3% (+20) ✓ | 23% → 7% (+17) ✗ | 23% → 7% (+17) ✗ |
| Scythecap Grove (report only) | 13% → 10% | 13% → 30% | 13% → 10% | 13% → 23% |
| Morel Warren (report only) | 10% → 17% | 10% → 27% | 10% → 13% | 10% → 10% |
| others (baseline 0%) | 0% | 0% | 0% | 0% |
| `bot:balanced` vs adaptive Baron | 57% ✓ | 53% ✓ | 63% ✓ | 50% ✓ |
| Asserted rows passing | 1 of 8 | 1 of 8 | 0 of 8 | 1 of 8 |
| Runs reaching the boss (80 seeds) | 25% | 25% | 30% | 30% |

G1–G7 and G11 are identical to the baseline under A2, A3 and both (the reference bots and the scripted general don't adapt).

What the Baron builds while a counter is active (counter-set buildings placed over 30 battles):

| Player | Baseline | A2 |
|---|---|---|
| mono Sporeling (Anti-Swarm) | 89 Capguard Halls | 50 Capguard Halls, 47 Sporeling Burrows, 16 Scythecap Groves, 4 Amanita Lodges |
| mono Rootbreaker (read as Anti-Line: Rootbreakers are Medium) | 13 Gill Nests | 21 Morel Warrens, 10 Veilstalker Hollows, 9 Gill Nests |
| mono Capguard (Anti-Line) | 46 Gill Nests | 52 Morel Warrens, 28 Gill Nests, 22 Veilstalker Hollows |

A2 does what it says: the Baron fields Scythecaps and Veilstalkers. But the floor spreads its counter spending over every building in the set, including weak ones. The Anti-Swarm set holds every Slash unit, so against a Sporeling swarm the Baron builds Sporeling Burrows; against Line it builds Morel Warrens, which lose to Capguards. The swarm row improves (37% → 27%), but mono Veilstalker, Scythecap and Morel do 10–17 points better against the A2 Baron. A3's earlier cycle helps mono Rootbreaker (−10) and Hammercap (+17 drop), but no battle in these 90 ended before the first counter activated, even at 4:00, so timing isn't the main limit. If G8 is picked up again, the more promising variant is a floor limited to counter-set buildings whose unit beats the player's dominant armor in the matrix (it would drop Sporeling Burrows from Anti-Swarm and Morel Warrens from Anti-Line). That is untested.

## Round 2 results (2026-10-27)

Measured with `npm run experiment` exactly as in round 1. `--proto` now also reaches content entries by id (`building.gillNest.spawn.interval:19`, `unit.gillArcher.hp:100`) and can add one-off bots (`bot.<id>:{…}`, used with `--defender bot:<id>`). The same strings work at `?proto=`.

| Preset | Setting |
|---|---|
| `t1` | `rangedFirstSpawnFraction: 1` |
| `t2` | `fallBack`: radius 5 tiles, ratio 1, at most 10 s of holding per unit |
| `t3` | `spawnerDefense`: home-column spawners fire 12 Pierce per second at the nearest enemy unit within 6 tiles (projectile speed 12) |

### I1: the Gill Nest spawn interval (the user's question)

G3 is mono Gill Nest against `bot:balanced`, both seats (40 games). "Takeover" lists other mono bots above 55%. B1 is the round-1 preset (×3, 1.5 s); "B1 mild" is ×2 for 1 s, the only B1 setting that passed G4.

| Interval | G3 alone | Takeover | G4 median / Decisions | G3 + B3 | G3 + B1 | Takeover, G4 with B1 | G3 + B1 mild | Takeover, G4 with B1 mild |
|---|---|---|---|---|---|---|---|---|
| 15 s (today) | 100% | none | 7:12 / 5% ✓ | 100% | 100% | none; 25% ✗ | 100% | none; 10% ✓ |
| 17 s | 100% | none | 7:32 / 5% ✓ | 100% | 100% | none; 28% ✗ | — | — |
| 19 s | 100% | none | 7:58 / 5% ✓ | 100% | 88% | none; 20% ✗ | — | — |
| 21 s | 98% | none | 8:16 / 15% ✓ | 98% | 80% | none; 30% ✗ | 83% | Sporeling 57% ✗; 15% ✓ |
| 24 s | 85% | none | 8:38 / 23% ✗ | 93% (Sporeling 57% ✗) | **55%** | Sporeling 57% ✗; 33% ✗ | 68% | Amanita 57% ✗; 25% ✗ |
| 28 s | 90% | Sporeling, Amanita 57% ✗ | 8:59 / 13% ✓ (median ✗) | 83% (Amanita 65% ✗) | 43% | Sporeling 57% ✗; 50% ✗ | 57% | Amanita 57% ✗; 48% ✗ |

Other checks, for the interval alone: **G1 fails at every interval**, moving from Gill Nest (7/8 pairings) to Capguard Hall (7/8 from 17 s on), as in M1. G2 holds. G5 63–75% ✓. G6 73–88% ✓. G7 passes alone except at 24 s (mirror 54% ✗), and fails at most intervals with B1 or B3. G8 is unchanged (1–2 asserted rows). Boss reach is 19–26% alone, 21–26% with B3 and 28–39% with B1. G11 is unaffected (data only).

**Answer:** tuning the archer rate alone doesn't help on current content. M1's result (28 s reached 50%) no longer holds with the M2–M4 roster: 28 s leaves mono Gill Nest at 90% while mono Sporeling and Amanita cross 55%. The smallest nerf that reaches the G3 limit is **24 s with B1** (55%, exactly at the limit). But mono Sporeling takes over (57%), a third of the reference battles end by Decision, G1 and G7 fail, and the defender's turrets go almost idle (Sporelings do 67% of its damage). No interval, alone or combined with B1 or B3, passes G3 without breaking another guardrail.

### T1–T3

| Check | Baseline | T1 | T2 | T3 | T3 strong (25 dmg, range 7) | T3 + B3 + 21 s |
|---|---|---|---|---|---|---|
| G3 mono Gill Nest (player / enemy) | 100% (100 / 100) | 100% (100 / 100) | 100% (100 / 100) | 100% (100 / 100) | **30%** (30 / 30) | 90% (90 / 90) |
| Takeover (> 55%) | none | none | Sporeling 88%, Capguard 65%, Scythecap 63%, Morel 57% ✗ | none | Capguard, Rootbreaker 63%, Scythecap, Hammercap 60% ✗ | none |
| Defender damage vs mono Gill Nest: Sporelings / turrets | 24% / 69% | 25% / 68% | 5% / 92% | 26% / 26% | 19% / 3% | 36% / 13% |
| G1 | ✗ (Gill 7/8) | ✗ (Gill 7/8) | ✗ (Gill 8/8) | ✗ (Gill 8/8, Morel 0/8) | ✗ (Gill 8/8) | ✗ (Gill 7/8, Morel 0/8) |
| G2 | ✓ | ✓ | ✗ (Sporeling beats nothing; Sporeling > Gill Archer 0/5) | ✓ | ✓ | ✓ |
| G4 median / Decisions / bot wins | 7:12 / 5% / 53% ✓ | 7:54 / 8% / 40% ✓ | 7:31 / 10% / 57% ✓ | 10:00 / 73% ✗ | 10:00 / 100% ✗ | 10:00 / 93% ✗ |
| G5 | 70% ✓ | 68% ✓ | 78% ✗ | 53% ✗ | 53% ✗ | 53% ✗ |
| G6 | 53% ✓ | 73% ✓ | 80% ✓ | 75% ✓ | 65% ✓ | 73% ✓ |
| G7 mirror / Slayer mirror | 58% / 50% ✓ | 54% / 48% ✗ | 63% / 49% ✓ | 54% / 56% ✗ | 52% / 53% ✗ | 53% / 56% ✗ |
| G8 asserted rows / `bot:balanced` vs Baron | 1 of 8 / 57% | 0 of 8 / 60% | 0 of 10 / 57% | 3 of 6 / 50% | 2 of 5 / 33% ✗ | 3 of 6 / 43% |
| G11 tick mean / p99 | 0.18 / 0.52 ms ✓ | 0.18 / 0.50 ms ✓ | 0.18 / 0.68 ms ✓ | 0.18 / 0.51 ms ✓ | 0.18 / 0.51 ms ✓ | — |
| Runs reaching the boss (80) | 25% | 24% | 15% | 59% | 83% | 65% |

T1 combined with mild B1 at 24 s: mono Gill Nest 60%, no takeover (Sporeling 55%), but G4 30% Decisions and G7 fail. T3's extra G8 rows and its higher boss reach come with stalled battles: homes become hard to break for everyone.

### D1: is G3 a reference-bot artifact?

Mono Gill Nest against each defender, 20 seeds in both seats. One-off bots were added with `--proto bot.<id>:{…}`; `bot:balanced` and the guardrails are unchanged.

| Defender | vs mono Gill Nest | vs mono Sporeling | vs mono Capguard |
|---|---|---|---|
| `bot:balanced` (reference) | 100% | 40% | 25% |
| `bot:balanced` with a two-Burrow opener (no Cellar) | 98% | 43% | 55% |
| `bot:balanced` running the adaptive counter cycle | 100% | 48% | 15% |
| Sporeling-heavy (two Burrows, weight 5 Burrow, 1 Capguard, Cellar, Scythecap) | 95% | 35% | 95% |
| Amanita-heavy (Lodge opener, weight 4 Lodge, 2 Burrow) | 100% | 15% | 35% |
| mono Sporeling Burrow | 98% | 50% | 98% |
| mono Amanita Lodge | 100% | 0% | 20% |

(Percentages are the mono attacker's win rate.) No defender holds, even the one that wins the 3-minute production duel 6/6. Battle traces explain it. Mono Sporeling builds 5–6 Burrows but never has more than 2–6 supply on the field, against 10–34 for the archers' 2–4 Nests. Each Sporeling walks into a growing archer mass, about 3 in transit at any time. The first fights happen under the archer side's own turrets, and from then on the archers advance column by column. The supply duels (all units at once) and the production duels (no turrets, no territory, 3 minutes) don't reproduce that stream-against-mass dynamic, so G1 and G2 can't see it.

### Recommendation after round 2

Nothing here is worth adopting, and none of the round-2 settings passes the guardrails. G3 looks structural rather than numeric: in a single lane with Heartcap turrets, a ranged mass that grows behind its own front always beats a melee stream. Approach speed, archer numbers, damage to structures, firing lanes, lifespans, opening delays, conditional fall-back and home defense each either leave it at 85–100% or move it only by making battles stall or another mono bot dominant. What remains untried are rule-level changes to how melee armies arrive: true mustering combined with B1 and a 21–24 s Nest, or a melee wave release. Both change §5.2 and need the user's explicit OK. The other option is to reconsider whether G3's "≤ 55% against `bot:balanced`" is the right target while a single-lane map gives ranged mass this edge.

For a human feel test only, the closest to a playable balance is mild B1 with a 21 s Nest: `?proto=b1,approachRush.speedMult:2,approachRush.seconds:1,building.gillNest.spawn.interval:21` (mono Gill Nest 83%, G4 in band, mono Sporeling 57%, G7 fails). The setting that reaches the G3 limit is `?proto=b1,building.gillNest.spawn.interval:24` (55%), but it costs G4 and G7.
