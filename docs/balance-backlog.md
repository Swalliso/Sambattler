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

**Update, 2026-10-30: this no longer holds.** Hold was adopted on 2026-10-28, the day after this test. With it, the Sporeling-heavy defender beats mono Gill Nest 92% of the time, and mono Sporeling beats it 95%. See [D1 before and after Hold](#d1-before-and-after-hold).

### Recommendation after round 2

Nothing here is worth adopting, and none of the round-2 settings passes the guardrails. G3 looks structural rather than numeric: in a single lane with Heartcap turrets, a ranged mass that grows behind its own front always beats a melee stream. Approach speed, archer numbers, damage to structures, firing lanes, lifespans, opening delays, conditional fall-back and home defense each either leave it at 85–100% or move it only by making battles stall or another mono bot dominant. What remains untried are rule-level changes to how melee armies arrive: true mustering combined with B1 and a 21–24 s Nest, or a melee wave release. Both change §5.2 and need the user's explicit OK. The other option is to reconsider whether G3's "≤ 55% against `bot:balanced`" is the right target while a single-lane map gives ranged mass this edge.

For a human feel test only, the closest to a playable balance is mild B1 with a 21 s Nest: `?proto=b1,approachRush.speedMult:2,approachRush.seconds:1,building.gillNest.spawn.interval:21` (mono Gill Nest 83%, G4 in band, mono Sporeling 57%, G7 fails). The setting that reaches the G3 limit is `?proto=b1,building.gillNest.spawn.interval:24` (55%), but it costs G4 and G7.

## Step A: measurement before M6 (2026-10-30)

Step A of the [One More Run review](ideas/one-more-run-review.md#suggested-path): measure, with no rule or data change. Goldens and hashes are unchanged. The new pieces are default-off or tool-only:

- `npm run experiment` options: `--maps`, `--g3seeds` and `--mono` for G3 on any map. The `lanes` check gives per-lane traces. `--commander` and `--power-policy` apply to `runs` and `engagement`. The `spread` check measures placement spread. The options are in the tool's header comment.
- The diver knob `diveRanged` in `balance.json`, with the presets `diver` and `diverleap` in `src/data/proto.ts`.

G3 numbers below use 50 seeds per seat (100 games, about ±5 points), merging on, `bot:balanced` as the defender unless stated.

### G3 on every map

Mono bot win rate against `bot:balanced` (✗ above the 55% limit). `test-3lane` is a bench map, so its column is a lead, not a verdict.

| Mono bot | Bogwater Hollow (1 lane) | Stumpfield (1 lane) | Twin Roots (2 lanes) | test-3lane (3 lanes, lead) |
|---|---|---|---|---|
| Gill Archer Nest | **100** ✗ | **100** ✗ | **63** ✗ | 54 |
| Sporeling Burrow | **75** ✗ | **70** ✗ | **77** ✗ | 85 |
| Amanita Lodge | 48 | 41 | **64** ✗ | 81 |
| Morel Warren | 54 | **57** ✗ | 54 | 47 |
| Capguard Hall | 49 | 41 | 27 | 11 |
| Veilstalker Hollow | 31 | 42 | 51 | 66 |
| Rootbreaker Den | 15 | 17 | 53 | 54 |
| Scythecap Grove | 42 | 38 | 11 | 1 |
| Hammercap Forge | 28 | 23 | 20 | 22 |
| Puffball Mortar | 9 | 8 | 0 | 0 |
| Tender's Ring, Truffle Cellar, Rhizome Vault, Spore Exchange | 0–2 | 0–1 | 0 | 0–3 |

- **Archers are a one-lane problem.** Mono Gill Nest wins every game on both one-lane maps, 63% on Twin Roots and 54% on three lanes.
- **Mono Sporeling fails G3 on every map (70–85%).** In the 40-game guardrail it reads 65% on Bogwater. It has been above 55% since Hold was adopted, and it is now the other standing G3 miss.
- **Each map type has its own winners.** More lanes help the single-building concentrators (Amanita, Rootbreaker, Veilstalker) and hurt Capguards and Scythecaps.
- **The guardrail tests too little.** `npm run test:slow` measures G3 on Bogwater only, with 40 games. It misses Sporeling's real rate and every multi-lane failure. G3 now measures every map: see [the rewrite](#g3-on-every-map-the-rewrite-2026-10-30).

### Why Twin Roots differs

Traces with `--checks lanes`, mono Gill Nest against `bot:balanced`, 25 seeds per seat (50 games). "Busy lane" is the lane where the mono side placed most of its spawners.

| | Bogwater Hollow | Twin Roots |
|---|---|---|
| Mono wins | 100% | 58% |
| Mono spawners all in one lane | 100% of games | 0% (64% in the busy lane) |
| Archer supply on the field at 1:00 / 2:00 / 3:00 / 4:00 / 5:00 | 14 / 12 / 14 / 20 / 24 | 11 / 14 / 12 / 15 / 16, split 5.4+5.5 … 10.3+5.2 |
| Defender supply on the field, same marks | 3.9 / 3.8 / 3.8 / 2.3 / 0.6 | 4.0 / 7.2 / 7.8 / 8.7 / 9.1 |
| Defender's Heartcap hit | 50 of 50, all in the archers' lane | 44 of 50, 23 in the archers' busy lane |
| Mono side's Heartcap hit | 0 of 50 | 30 of 50 |
| Defender units spawned in the minute before its Heartcap was first hit | 273, all in the broken lane | 111 in the broken lane, 394 in the other |

For the first three minutes the archers field about as much as on Bogwater, but in two halves. Neither half is big enough to beat the stream in front of it. The defender's second lane keeps producing untouched and counterattacks: the archers' own Heartcap is hit in 60% of games.

A diagnostic confirms it: a scratch script set the AI's existing aggressive lane style, which puts spawners in the lane where the opponent holds the fewest columns. 100 games each:

| Twin Roots, mono win rate | Default (both spread) | Mono side concentrates | Both sides concentrate |
|---|---|---|---|
| Gill Archer Nest | 63% | 78% | **94%** |
| Sporeling Burrow | 77% | 85% | 84% |
| Amanita Lodge | 64% | 63% | 48% |
| Capguard Hall | 27% | 36% | 23% |

- **Lane width isn't the cause.** When both sides concentrate, Twin Roots' 6-row lanes play like Bogwater (94%).
- **Splitting is the cause.** The archer edge is about mass in one lane. A second lane halves that mass and gives the defender a front the archers can't reach.
- **Amanita is the reverse case.** Its 300-gold opener buys one Lodge, so 94–99% of its Lodges end up in one lane. It wins Twin Roots by breaking that lane (47 of 47 breaks) while `bot:balanced` splits. When `bot:balanced` concentrates too, Amanita falls to 48%.
- **Sporeling wins however the lanes are used.**

### Diver prototype

`diveRanged` (absent by default): the listed units prefer `ranged`-tagged enemy units over other targets and see them from `aggroAdd` tiles farther. With `burst`, a diver closing on a ranged unit sprints for a moment, then cools down (B1's mechanism, aimed at ranged targets only). There's no burrowing (§17 #7).

| Preset or spec | Setting |
|---|---|
| `diver` | Veilstalkers prefer ranged units, aggro +2 against them |
| `diverleap` | `diver`, plus ×2.5 speed for 1.5 s onto a ranged target, at most every 8 s |
| Morel leap (`diveRanged:{"units":["morelRunner"],"aggroAdd":2,"burst":{…}}`) | The same, on Morel Runners |

**Against `bot:balanced`** (Veilstalker weight 1 of 15), G3 on every map, 100 games:

| Mono win rate (Bogwater / Stumpfield / Twin Roots) | Baseline | `diver` | `diverleap` | Morel leap |
|---|---|---|---|---|
| Gill Archer Nest | 100 / 100 / 63 | 100 / 100 / 66 | 100 / 100 / 67 | 100 / 100 / 63 |
| Veilstalker Hollow | 31 / 42 / 51 | 31 / 44 / 52 | 37 / 49 / 55 | 31 / 42 / 51 |
| Morel Warren | 54 / 57 / 54 | unchanged | unchanged | **65 / 60** / 53 ✗ |
| Every other mono bot | — | unchanged | unchanged | unchanged |

**Against defenders with more divers**, 100 games each. `diverdef` is a one-off bot (`--proto bot.diverdef:{…}`): `bot:balanced` with a Sporeling Burrow + Veilstalker Hollow opener and Hollow weight 5. `bot:slayer` is the G7 reference bot, with Hollow weight 8 and the balanced opener. `morelldef` is the same as `diverdef`, with Morel Warrens in place of Veilstalker Hollows.

| Mono Gill Nest win rate (Bogwater / Twin Roots) | No diver | `diver` | `diverleap` |
|---|---|---|---|
| vs `diverdef` | 95 / 54 | 100 / 62 | 97 / **37** |
| vs `bot:slayer` | 98 / 67 | 99 / 75 | 99 / 70 |
| vs `morelldef` (Morel leap in the last column) | 96 / 61 | — | 98 / 66 |

Mono Sporeling, Capguard and Amanita are unchanged against each defender (they field no ranged units).

**Every guardrail.** Columns are `npm run experiment -- --proto <preset>` with the default checks (G3 there is 20 seeds per seat, Bogwater):

| Check | Baseline | diver | diverleap |
|---|---|---|---|
| G3 mono Gill Nest (as player / as enemy) | 100% (100 / 100) | 100% (100 / 100) | 100% (100 / 100) |
| Other mono bots above 55% | sporelingBurrow 65% | sporelingBurrow 65% | sporelingBurrow 65% |
| Defender damage vs mono Gill Nest: Sporelings / turrets | 22% / 69% | 23% / 69% | 23% / 69% |
| G1 | ✗ (gillNest: wins 7/8 pairings) | ✗ (gillNest: wins 7/8 pairings) | ✗ (gillNest: wins 7/8 pairings) |
| G2 | ✓ | ✓ | ✓ |
| G4 median / Decisions / bot wins | 7:13 / 10% / 55% ✓ | 7:13 / 8% / 50% ✓ | 7:13 / 12% / 50% ✓ |
| G5 (+150 gold wins) | 75% ✓ | 75% ✓ | 78% ✗ |
| G6 (6 columns behind wins) | 55% ✓ | 55% ✓ | 55% ✓ |
| G7 mirror / Slayer mirror | 60% / 56% ✗ | 60% / 53% ✗ | 59% / 53% ✗ |
| G8 asserted rows passing / `bot:balanced` vs Baron | 0 of 8 / 67% | 0 of 8 / 67% | 0 of 8 / 63% |
| G11 tick mean / p99 | 0.17 / 0.50 ms ✓ | 0.22 / 1.17 ms ✓ | 0.23 / 1.04 ms ✓ |
| Runs reaching the boss (80) | 20% | 20% | 20% |

- **G5:** `diverleap`'s 78% is 3 points over the 75% limit. The baseline sits exactly at the limit, and over 40 games that's noise.
- **G11:** the diver columns' G11 ran alongside other jobs, so their tick times are high.
- **Every other verdict** matches the baseline.

**Verdict: don't adopt the diver as an archer fix.**

- It works only where the archer mass is already split: Twin Roots, with the burst and a defender that opens with a Hollow (54% → 37%).
- On one-lane maps it changes nothing (95–100%).
- Without the burst, the preference makes things worse: Veilstalkers walk into archer fire sooner (54 → 62 and 67 → 75).
- The Morel version creates a mono Morel takeover.
- Under `bot:balanced` it is harmless: no guardrail verdict changes, and mono Veilstalker gains 4–7 points. It could stay as flavour ("Veilstalkers hunt archers") if the user wants that, but not as balance.

### Runs with commanders

`npm run experiment -- --checks runs --commander all --power-policy auto|none --runs 60`: `bot:balanced`, greedy drafts, a random route, seeds 1–60. The auto row reproduces the [review's](ideas/one-more-run-review.md#fresh-measurements-2026-10-30-31f081d) scratch numbers exactly.

| Commander | Power | Ended in battle 1 | Ended in 2 / 3 / 4 / 5 | Reached the boss | Won | Boss fights won | Battle minutes per run (mean) / when the boss is reached (median) |
|---|---|---|---|---|---|---|---|
| Vesper | auto | 19 (32%) | 13 / 5 / 4 / 3 | 23 (38%) | 16 (27%) | 16 of 23 | 15.3 / 24.5 |
| Armilla | auto | 22 (37%) | 10 / 7 / 7 / 0 | 20 (33%) | 14 (23%) | 14 of 20 | 14.8 / 22.5 |
| Cordis | auto | 20 (33%) | 22 / 2 / 3 / 0 | 15 (25%) | 13 (22%) | 13 of 15 | 13.3 / 20.5 |
| Vesper | none | 31 (52%) | 12 / 3 / 1 / 1 | 14 (23%) | 12 (20%) | 12 of 14 | 12.3 / 23.4 |
| Armilla | none | 42 (70%) | 10 / 2 / 3 / 1 | 6 (10%) | 2 (3%) | 2 of 6 | 10.0 / 25.1 |
| Cordis | none | 25 (42%) | 17 / 5 / 6 / 1 | 11 (18%) | 6 (10%) | 6 of 11 | 12.8 / 21.6 |

Battles lost by map, auto powers, all three commanders: Bogwater 57 of 165 (35%), Stumpfield 45 of 160 (28%), Twin Roots 39 of 119 (33%).

- **The run is decided early.** A third of runs end in battle 1, and Cordis loses another 37% in battle 2. A run that reaches the boss wins 70–87% of the time.
- **Powers matter.** Without them, battle-1 losses rise to 42–70%, and Armilla wins 3% of runs.
- **Losses don't depend on the map**, even though mono archers are degenerate only on one-lane maps. A run's bot plays a mixed army, so the map-level G3 gap isn't what ends runs.
- **The old `runs` check undercounted.** It played Vesper with no power policy, so its "about half end in battle 1" overstated M5 runs.

`--checks engagement --commander all --power-policy auto` (single battles on Bogwater, 30 seeds) gives the per-commander pacing baseline for step B. Same column order: scripted / Old Mother Mold / Lichen Baron / Blightwright.

| Commander | Player wins | Median length | First flip | Heartcap first hit → dead |
|---|---|---|---|---|
| Vesper | 80 / 47 / 87 / 80% | 5:50 / 6:19 / 6:51 / 5:42 | 1:40 / 1:09 / 0:34 / 0:34 | 20 / 22 / 18 / 23 s |
| Armilla | 67 / 70 / 83 / 60% | 6:23 / 6:04 / 5:58 / 5:34 | 1:15 / 1:07 / 0:34 / 0:34 | 12 / 14 / 16 / 17 s |
| Cordis | 43 / 20 / 70 / 60% | 6:59 / 6:08 / 7:04 / 5:48 | 1:16 / 1:12 / 0:34 / 0:34 | 15 / 22 / 15 / 21 s |

The winner's Heartcap is untouched in 359 of 360 battles: the cliff is unchanged.

### Placement spread (step C's baseline)

`npm run experiment -- --checks spread` (`tools/lib/spread.ts`) is colony-swarm's version of Hivemind's puzzle generator. It asks how much better the best plot is than a typical one.

**Board states.** `bot:balanced` (player) against `general:scripted` (the G4 pairing), seeds 1–3, paused at 1:00 and 3:00.

**Placement.** For each of five buildings (Gill Nest, Sporeling Burrow, Capguard Hall, Truffle Cellar, Puffball Mortar), the player places it on every legal plot:
- It gets the base cost as a gift and pays the plot's price, so a forward plot costs its surcharge.
- Plots it can't afford even so are skipped. "Pass" places nothing.

**Futures.** Each placement plays on for 90 s, over 8 futures that reseed the combat and AI streams identically for every plot.

**Score.** The player's margin in supply at the horizon: field supply + columns + (bank + standing buildings' cost × HP fraction) / 50 + Heartcap HP taken / 50, each as the player's minus the opponent's.

**Statistics.**
- The best plot is cross-validated: chosen on half the futures, scored on the other half.
- "Split-half ρ" is the rank correlation of the plots' scores between the two halves. Near 0, the ranking is noise. Near 1, plots really differ.
- "Worth" is median plot − pass.

**Run time.** About 1–4 minutes per building and setting.

All 30 cases per setting (5 buildings × 3 seeds × 2 pauses), medians:

| Setting | Paused at | Legal plots | Building worth | Best − median | As % of worth | Split-half ρ | ρ vs depth | ρ vs adjacency | Noise (one plot's SE) |
|---|---|---|---|---|---|---|---|---|---|
| Bogwater Hollow | 1:00 | 6 | 8.8 | +0.0 | 1% | 0.21 | −0.30 | −0.03 | ±2.0 |
| Bogwater Hollow | 3:00 | 56 | 17.4 | +4.1 | 25% | 0.31 | −0.31 | 0.16 | ±4.4 |
| Bogwater, Mycorrhizal Link | 1:00 | 6 | 10.4 | +0.5 | 10% | 0.20 | −0.03 | 0.15 | ±2.0 |
| Bogwater, Mycorrhizal Link | 3:00 | 56 | 18.2 | +3.6 | 34% | 0.38 | −0.49 | 0.21 | ±5.0 |
| Twin Roots | 1:00 | 17 | 10.7 | +1.1 | 17% | 0.40 | −0.26 | 0.26 | ±2.5 |
| Twin Roots | 3:00 | 14 | 13.0 | +6.4 | 32% | 0.68 | 0.25 | 0.08 | ±3.3 |

By building, Bogwater Hollow without the relic:

| Building | Worth 1:00 / 3:00 | Best − median 1:00 / 3:00 | Split-half ρ 1:00 / 3:00 | ρ vs depth 3:00 |
|---|---|---|---|---|
| Gill Archer Nest | 11.6 / 26.6 | −0.6 / +5.8 | −0.20 / 0.64 | −0.80 |
| Sporeling Burrow | 8.1 / 15.1 | +0.0 / +4.1 | 0.66 / 0.30 | −0.53 |
| Capguard Hall | 12.5 / 19.0 | +1.0 / +2.6 | 0.57 / 0.25 | −0.41 |
| Truffle Cellar | 6.3 / 6.8 | −0.0 / +1.7 | −0.14 / 0.02 | −0.25 |
| Puffball Mortar | 2.4 / 9.7 | +0.5 / +7.3 | 0.26 / 0.37 | 0.49 |

- **At 1:00 on Bogwater, placement doesn't matter.** The player owns only its home zone (about 6 free plots), and the best plot is the median plot.
- **At 3:00 there is a little signal, and it is mostly "don't build forward".** Spawner scores fall with depth (Gill Nest ρ −0.80), and forward Nests die. Only the Mortar wants to be forward (ρ +0.49).
- **Truffle Cellars are pure noise.** That matches F1: loam is a forward bet that doesn't pay.
- **Mycorrhizal Link is below the noise floor.** ρ vs adjacency moves from 0.16 to 0.21 at 3:00 and split-half ρ barely moves. A 13% faster spawn interval is worth about 1 archer in 90 s, against a one-plot noise of ±4–5 supply.
- **Twin Roots has the only clear signal.** Split-half ρ is 0.68 at 3:00, and it comes from which lane a building goes in, not from depth.

The bar for step C: a network rule set on Bogwater should lift split-half ρ well above about 0.3, to at least Twin Roots' 0.6–0.7. It should also lift best − median well above about 25% of a building's worth, and do both at 1:00 as well as 3:00. The test is `npm run experiment -- --proto <network knob> --checks spread`.

## Step B: battle-feel prototypes (2026-10-30)

Step B of the [One More Run review](ideas/one-more-run-review.md#suggested-path): engagement review recommendations 2–3 and the design review's P1, as prototypes. **Nothing is adopted.** Each knob is absent from `balance.json`, so goldens and hashes are unchanged:

| Preset | Knob | What it does |
|---|---|---|
| `hotstart` | `hotStart.deployDraft`, `hotStart.battles` | A free draft at deploy, before the clock starts (any side with a draft pool; in a run, the player). In battle 1 of a run, the general earns ¾ of its stipend. `battles[i]` takes any effects, per side, for run battle i + 1 |
| `breach` | `sideTriggers`, `sporestorm.heartcapTakenPerStack` | Two new `heartcapBreach` triggers, which every side gets. At ⅔ HP: a 150 Crush pulse (radius 4) in the breached lane, 10 s of half damage taken, +150 gold. At ⅓, a last stand: another pulse, 20 s of quarter damage, the commander power ready, +150 gold. The Sporestorm adds +10% Heartcap damage per stack, not +20% |
| `bigdrafts` | `draftWaves`, `draft.cards`, `bigDrafts` | Drafts after waves 2 and 5 instead of 2, 4, 6 and 8. Each offers 4 cards; take 2, and +10 rare |

**New sim pieces**, all inert without a knob:
- The trigger `on: heartcapBreach` with `at` (a fraction of max HP), and the actions `shieldHeartcap { seconds, takenMult }` and `readyPower`. They are in the effects DSL, so a relic could use them too.
- A deploy-time draft, and multi-pick drafts.
- A `heartcapBreach` event, which the browser shows as a callout and a ring the size of the pulse.

Tests are in `tests/unit/battleFeel.test.ts`.

**Measured with** `npm run experiment -- --proto <spec> --checks runs,engagement --commander all --power-policy auto --runs 100`:
- **Runs:** `bot:balanced`, greedy drafts, random route, seeds 1–100 for each of Vesper, Armilla and Cordis. That's 300 runs per cell. A pooled rate near 33% has a standard error of about ±2.7 points, and a per-commander rate about ±4.7. Every cell uses the same seeds, so differences between cells are a little tighter than that.
- **Single battles:** `bot:balanced` against the engagement review's four generals (scripted, Old Mother Mold, the Lichen Baron, the Blightwright) on Bogwater Hollow, seeds 1–30, for each commander. That's 360 battles per cell. Fall times are the median of the 12 per-row medians, with the row range in brackets.
- **Not touched:** single battles have no drafts and aren't run battles, so `hotstart` and `bigdrafts` leave the engagement numbers unchanged. They match the baseline digit for digit, which confirms nothing leaks.

The engagement check gained ⅔ → dead, ⅓ → dead and comeback counts (the winner won after its own Heartcap fell to ⅔). The runs check gained losses by battle number and cards drafted per battle.

### Hot start

| Variant (`--proto`) | Battle 1 lost | Battle 2 lost | Reached the boss | Runs won | Boss fights won |
|---|---|---|---|---|---|
| Baseline | 33.0% (32 / 34 / 33) | 35% | 35% | 24% | 72 of 105 |
| Deploy draft only (`hotStart.deployDraft:{}`) | 31.0% | 26% | 39% | 29% | 87 of 116 |
| General's battle-1 income ×0.75 only | 16.3% | 33% | 42% | 30% | 91 of 125 |
| **`hotstart`** (both) | **17.7%** (10 / 20 / 23) | 26% | 45% | 34% | 102 of 134 |
| Income ×0.67 instead | 16.7% | 30% | 45% | 35% | 105 of 136 |
| `hotstart`, plus battle 2 at ×0.85 | 17.7% | 21% | 48% | 35% | 104 of 144 |
| The player gets +100 gold in battle 1, in place of the income cut | 20.3% | 28% | 42% | 34% | 103 of 127 |

Per-commander numbers in brackets are Vesper / Armilla / Cordis.

**Battle 1 is Old Mother Mold or the Lichen Baron, and Mold does most of the damage.** In the baseline, 79 of the 99 battle-1 losses are to Mold (51% of Mold fights) and 20 to the Baron (14%). `hotstart` cuts that to 27% and 8%. By map, losses fall from 37 / 27 / 35% to 25 / 7 / 21% (Bogwater / Stumpfield / Twin Roots).

- **The gentler battle 1 does the work.** A quarter off the general's income halves battle-1 losses, and a deeper cut (×0.67) gains nothing more. What's left is Mold's mustered swarm, the same strength that keeps mono Sporeling above G3 since Hold.
- **The deploy draft is a decision, not a difficulty lever.**
  - It gives a first choice at 0:00, which the design review asked for ("first decision < 30 s").
  - It moves battle-1 losses by noise (33 → 31%).
  - Its extra card pays off later: battle-2 losses fall to 26%, and runs won rise from 24 to 29%.
- **85% battle-1 wins isn't reached** (82%). A lead, measured with a scratch content edit and not a knob: move Old Mother Mold out of battle 1 (`appearsIn` [1, 2, 3] → [2, 3] in `generals.json`).

  | | Battle 1 lost | Battle 2 lost | Reached the boss | Runs won |
  |---|---|---|---|---|
  | Today's rules, Mold out of battle 1 | 15.0% | 40% | 37% | 26% |
  | `hotstart`, Mold out of battle 1 | **6.0%** (3 / 8 / 7) | 37% | 42% | 33% |

  - With `hotstart`, it passes the design review's 85%.
  - But Mold then lands in battle 2, which gets deadlier: it moves the deaths more than it removes them.
  - It's a data change, so it's the user's call. Every run would also open against the Baron.

### Heartcap breach and last stand

Single battles (360 per cell). `bot:balanced` wins 64% in every cell.

| Variant | First hit → dead | ⅔ → dead | ⅓ → dead | Median length (row range) | Decisions | Comebacks | Battle 1 lost (runs) |
|---|---|---|---|---|---|---|---|
| Baseline | 17.7 s (12–23) | 9.3 s | 4.2 s | 6:06 (5:34–7:04) | 2% | 0 | 33.0% |
| Storm +10% per stack only | 20.4 s (14–25) | 10.3 s | 5.0 s | 6:09 | 2% | 0 | 32.7% |
| Pulses at ⅔ and ⅓ (150 Crush, radius 4), storm +10% | 24.8 s (16–31) | 14.6 s | 7.0 s | 6:15 | 2% | 0 | 31.7% |
| Pulses, plus a last stand at ⅓: 15 s at ×0.5 and the power ready (storm +10%) | 31.1 s (19–37) | 20.5 s | 12.9 s | 6:19 | 2% | 0 | 31.7% |
| Same, storm +20% (today's) | 26.7 s (17–34) | 17.6 s | 11.2 s | 6:16 | 2% | 0 | 31.3% |
| Same, storm +0% | 33.9 s (24–45) | 23.9 s | 15.6 s | 6:24 | 2% | 0 | 31.3% |
| Same, pulses 300 Crush, radius 5 | 36.8 s (26–51) | 26.7 s | 17.8 s | 6:28 | 2% | 0 | 31.3% |
| Same, +150 gold at each mark | 35.1 s (21–46) | 23.9 s | 16.2 s | 6:26 | 2% | 0 | 30.7% |
| Same, +300 gold at each mark | 35.2 s (21–64) | 25.4 s | 17.2 s | 6:37 | 3% | **5** | 31.0% |
| **`breach`**: shields at both marks (⅔: 10 s at ×0.5; ⅓: 20 s at ×0.25), +150 gold at each | **45.5 s** (34–53) | **35.0 s** | 22.2 s | 6:33 (6:02–7:26) | 2% | **2** | 31.7% |

Rows other than the preset are `breach` with a `sideTriggers:[…]` or `sporestorm.heartcapTakenPerStack:<x>` override that has the parts the row names. "Comebacks" counts battles the winner won after its own Heartcap fell to ⅔.

**Why bots never come back: the cliff is upstream of the Heartcap.**
- A scratch trace of 120 baseline battles found 119 routs.
- When the loser's Heartcap is first hit, the loser has a median of 1 building left (from a peak of 6), none in 41 battles, and 0 units on the field.
- It loses half its buildings a median 34.5 s before it dies, and its last building 13.2 s before.

So the 12–23 s Heartcap fall is the epilogue of a ~35 s collapse.

- **A breach can lengthen the epilogue, and it does.** `breach` turns an 18 s fall into 45 s. The time from ⅔ to dead goes from 9 s to 35 s, at a cost of 27 s more per battle. The median length stays inside G4's band, and Decisions don't move.
- **It can't make a comeback by itself.** The defender has nothing left to fight with. Only gold lets it rebuild: +300 gold per mark gives 5 comebacks in 360, and `breach` gives 2. `bot:balanced` still wins 64%.
- **The storm bonus matters less than the triggers.** Today's +20% against +10% against 0 moves the fall by about ±3–4 s.
- **Runs barely change.** Battle-1 losses go from 33% to 31–32% (noise). Runs won go from 24% to 27%.

What a real comeback would need is a moment earlier in the collapse, or a run-level rule. Neither is tested here:
- a trigger when a side has lost half its buildings;
- a defensive rally while the base is still standing;
- engagement review rec 2's run half: a rout loss costs 40–50% of the run's Heartcap instead of ending the run.

### Bigger drafts

| Variant (`--proto`) | Holds per battle (at most) | Cards per battle | Battle 1 lost | Battle 2 lost | Reached the boss | Runs won | Boss fights won |
|---|---|---|---|---|---|---|---|
| Baseline: waves 2, 4, 6, 8; take 1 of 3 | 4 | 2.4 | 33.0% | 35% | 35% | 24% | 72 of 105 |
| Waves 2, 5; take 1 of 3 (`draftWaves:[2,5]`) | 2 | 1.7 | 35.3% | 36% | 28% | 20% | 61 of 85 |
| Waves 2, 5; take 1 of 4, +30 rare | 2 | 1.7 | 35.3% | 37% | 27% | 18% | 55 of 81 |
| **`bigdrafts`**: waves 2, 5; take 2 of 4, +10 rare | 2 | 3.2 | 31.0% | 30% | 37% | 28% | 83 of 110 |
| Waves 1, 4; take 2 of 4, +10 rare | 2 | 3.6 | 30.0% | 30% | 36% | 29% | 88 of 109 |

- **Bigger has to mean more picks, not rarer cards.** Two 1-of-3 or 1-of-4 drafts lose cards and cost 4–6 points of run wins. Rarity doesn't make up for it: today's rare cards aren't much stronger than common ones.
- **`bigdrafts` halves the holds** (at most 2 instead of 4). Because battles end around 6:00, before the wave-8 draft, it also gives about 0.8 more cards per battle. Runs won go from 24 to 28%, and battle-2 losses from 35 to 30%.
- **It doesn't make cards bigger.** Engagement review rec 5's rule-bending relics, mutation cards and signature upgrades are new content, out of scope here.

### All three together

`hotstart,breach,bigdrafts`, same 300 runs and 360 battles:

| | Battle 1 lost | Battles 2 / 3 / 4 lost | Reached the boss | Runs won | Boss fights won | Battle minutes per run (mean) |
|---|---|---|---|---|---|---|
| Baseline | 33% (99/300) | 35% / 21% / 28% | 35% | 24% | 72 of 105 (69%) | 15.1 |
| `hotstart,bigdrafts` | 18% | 22% / 19% / 15% | 51% | 42% | 125 of 152 | 16.5 |
| **`hotstart,breach,bigdrafts`** | **16%** (12 / 15 / 21) | 20% / 20% / 14% | 52% | 44% | 131 of 155 (85%) | 18.6 |

The single battles are exactly `breach`'s: 45.5 s falls, 6:33 median, 2% Decisions.

- **Battle 1 is now the gentlest battle, not the deadliest.** The run-loss curve is flat at 14–20% per battle instead of front-loaded.
- **The boss gets easier too:** it loses 85% of its fights against 69% today. Runs won go from 24 to 44%.
  - Bots aren't people, so that number isn't a difficulty target.
  - But if the boss should be the hardest fight, it needs its own retune. That's a data change, so it waits for the user's OK.

### Every guardrail

`npm run experiment -- --proto <preset>` with the default checks. G3 is 20 seeds per seat on Bogwater, and `boss` is 80 runs with Vesper and no power policy. G11 ran alongside other jobs, so its times are an upper bound.

| Check | Baseline | `hotstart` | `breach` | `bigdrafts` | All three |
|---|---|---|---|---|---|
| G1 | ✗ (gillNest wins 7/8) | ✗ (same) | ✗ (same) | ✗ (same) | ✗ (same) |
| G2 | ✓ | ✓ | ✓ | ✓ | ✓ |
| G3 mono Gill Nest; others above 55% | 100%; Sporeling 65% | same | same | same | same |
| G4 median / Decisions / bot wins | 7:13 / 10% / 55% ✓ | same | **7:51 / 12% / 55%** ✓ | same | 7:51 / 12% / 55% ✓ |
| G5 (+150 gold wins) | 75% ✓ | 75% ✓ | 73% ✓ | 75% ✓ | 73% ✓ |
| G6 (6 columns behind wins) | 55% ✓ | 55% ✓ | 53% ✓ | 55% ✓ | 53% ✓ |
| G7 mirror / Slayer mirror | 60% / 56% ✗ | same | same | same | same |
| G8 rows passing / `bot:balanced` vs Baron | 0 of 9 / 67% ✗ | same | 1 of 9 / 67% ✗ | same | 1 of 9 / 67% ✗ |
| G11 tick mean / p99 | 0.18 / 0.51 ms ✓ | 0.18 / 0.52 ms ✓ | 0.17 / 0.51 ms ✓ | 0.18 / 0.52 ms ✓ | 0.18 / 0.53 ms ✓ |
| `boss` (80 runs): reached / won | 20% / 18% | 34% / 29% | 24% / 16% | 21% / 20% | 48% / 41% |

- **No verdict changes.** G1, G3, G7 and G8 are today's standing misses.
- **`breach` is the only knob that touches single battles.** It adds 38 s to G4's median and 2 points of Decisions, inside the band. Its one extra G8 row (Rootbreaker drops 23 points instead of 17) is one game in 30.

### Recommendation

1. **Playtest `hotstart` and `bigdrafts` together.** They are the clearest wins:
   - Battle-1 losses fall from 33% to 18%, and battle-2 losses from 35% to 22%.
   - The in-battle holds halve (at most 2 instead of 4), and the player gets a choice at 0:00.
   - Neither touches a single-battle guardrail.

   If the playtest agrees, adopting them is a data change, so it needs the user's OK:
   - `hotStart` (deploy draft, battle 1 at ¾ general income), `draftWaves` [2, 5], `draft.cards` 4 and `bigDrafts` {picks 2, rareBonus 10} go into `balance.json`;
   - SPEC §8.3 changes, and the goldens are refreshed.
2. **Playtest `breach` on its own question:** does a 35 s window from ⅔ to dead feel like a siege worth fighting, or a slog?
   - Bots can't answer it. The defender has nothing left when its Heartcap is hit, so the window almost never turns a battle (2 comebacks in 360).
   - If testers want comebacks and not just a longer ending, the next prototype is a trigger earlier in the collapse (half the base lost), or a rout loss that costs run HP instead of the run.
3. **For the 85% battle-1 target,** `hotstart` alone reaches 82%. With Old Mother Mold moved out of battle 1 it reaches 94%, but battle 2 gets deadlier (37%). That's a data change, so it's the user's call.
4. **Once the early battles are gentler, the boss is the next problem.** With all three knobs, bots win 85% of boss fights and 44% of runs. A harder boss is a retune for after the playtest.

**Playtest strings** (the dev site, once this branch is on `develop`; prototype runs are never saved):
- All three: `https://swalliso.github.io/Sambattler/dev/?proto=hotstart,breach,bigdrafts`
- The recommended pair: `?proto=hotstart,bigdrafts`
- One at a time: `?proto=hotstart`, `?proto=breach`, `?proto=bigdrafts`
- The breach in a single battle: `?scene=battle&proto=breach`
- A lighter breach, the earlier last stand without shields or gold:
  `?proto=breach,sideTriggers:[{"on":"heartcapBreach","at":0.67,"do":[{"explode":{"damage":150,"damageType":"crush","radius":4}}]},{"on":"heartcapBreach","at":0.33,"do":[{"explode":{"damage":150,"damageType":"crush","radius":4}},{"shieldHeartcap":{"seconds":15,"takenMult":0.5}},{"readyPower":true}]}]`

## G3 on every map: the rewrite (2026-10-30)

Made on `feature/g3-every-map`. The user approved the thresholds and the seed count ("Keep G3 as proposed: mean ≤ 55%, worst map ≤ 60%, 50 seeds per seat."). Only the guardrail and its targets change: no rule or content, so the goldens are unchanged.

**G3 now** (SPEC §12.3):
- Every mono bot plays `bot:balanced` on every map in the run pool, in both seats. The pool is `mapPool()` in `src/run/route.ts`: Bogwater Hollow, Stumpfield and Twin Roots today. Test maps stay out, and Three Hollows joins when it ships.
- 50 seeds per seat: 100 games per map, about ±5 points each.
- A bot passes if its mean over the maps is ≤ 55% and its worst map ≤ 60%. Each map is measured to about ±5 points, so the worst of three reads high on noise alone; the extra 5 points allow for that.
- `data/balance-targets.json` G3 is now `seeds` 50, `maxMeanWinRate` 0.55 and `maxMapWinRate` 0.60 (was `seeds` 20, `maxMonoWinRate` 0.55).

**One G3 loop.** `evaluateG3` (`tools/lib/balance.ts`) runs it for `npm run test:slow` and `npm run balance`. `npm run experiment -- --checks g3` now calls it too, defaults to the run pool and keeps step A's per-seat lines and diagnostics. `--maps` still picks maps (a test map is reported as a lead), and `--g3seeds` and `--mono` still apply.

**Result** (`npm run test:slow`, seeds 1–50 per seat). It reproduces step A's 100-game table cell for cell. Mono win % against `bot:balanced`; bold is over a limit.

| Mono bot | Bogwater Hollow | Stumpfield | Twin Roots | Mean (≤ 55) | Worst (≤ 60) | Verdict |
|---|---|---|---|---|---|---|
| Gill Archer Nest | 100 | 100 | 63 | **88** | **100** | ✗ mean and worst |
| Sporeling Burrow | 75 | 70 | 77 | **74** | **77** | ✗ mean and worst |
| Amanita Lodge | 48 | 41 | 64 | 51 | **64** | ✗ worst (Twin Roots) |
| Morel Warren | 54 | 57 | 54 | 55 | 57 | ok, exactly on the mean limit |
| Veilstalker Hollow | 31 | 42 | 51 | 41 | 51 | ok |
| Capguard Hall | 49 | 41 | 27 | 39 | 49 | ok |
| Scythecap Grove | 42 | 38 | 11 | 30 | 42 | ok |
| Rootbreaker Den | 15 | 17 | 53 | 28 | 53 | ok |
| Hammercap Forge | 28 | 23 | 20 | 24 | 28 | ok |
| Puffball Mortar | 9 | 8 | 0 | 6 | 9 | ok |
| Tender's Ring, Truffle Cellar, Rhizome Vault, Spore Exchange | 0–2 | 0–1 | 0 | 0–1 | 0–2 | ok |

- **Nobody is excused.** Mono Gill Nest and mono Sporeling fail both limits, and mono Amanita fails on Twin Roots. The old 40-game Bogwater check failed Gill Nest and Sporeling only.
- **Mono Morel sits on the line.** Its mean is 165 wins in 300 games, exactly 55%, and its worst map (Stumpfield, 57%) is inside the 60% allowance. A one-game swing fails it. A stricter "every map ≤ 55%" rule would fail it now; nothing else would change.
- **The mean is exact.** It is total wins over total games, not a sum of rounded or floating-point rates, so a bot at exactly the limit passes.

**Runtime.** G3 plays 4,200 games (14 mono bots × 3 maps × 100), against 560 before.

| `npm run test:slow` | Whole suite | G3 | G3's share |
|---|---|---|---|
| Before (develop, Bogwater, 20 seeds per seat) | 224 s | 52 s | 23% |
| After (run pool, 50 seeds per seat) | 689 s | 459 s | 67% |

The after run shared the machine with other work: G7 and G8, which didn't change, took 1.3–1.5× as long as before. Scaled from the before run, G3 alone is roughly 390 s and the suite about 9½ minutes. G3 is now most of the suite. The options considered:
- **Keep 50 seeds per seat** (the user's choice). The 60% worst-map limit assumes ±5 points per map. `test:slow` isn't in CI; it runs after data changes.
- **Run G3 beside the others** (not done; still open). In its own file under `tests/slow/`, vitest runs it in parallel with the rest, and the suite takes about as long as G3 alone. Playing the maps in worker threads would cut it further. Neither cuts games.
- **30 seeds per seat** (60 games per map, about ±6.5 points) brings G3 to about 4 minutes. The per-map noise is then bigger than the 5-point allowance, so the worst-map limit would want to rise to about 62%. At 20 seeds (±8) the worst map says little.

## Second front: two-lane test maps (2026-10-30)

Step A suggested that a second front, perhaps with the diver, is the archer answer. This tests it on test-only two-lane versions of the one-lane maps. Nothing is adopted: the rules, the shipped maps, the run pool and the goldens are unchanged.

G3 numbers use 50 seeds per seat (100 games, about ±5 points), merging on, `bot:balanced` as the defender unless stated. ✗ marks a rate above the 55% limit. The test maps are leads, not verdicts.

### The test maps

| Map | Lanes | W × H | 2×2 plots (packed) | Home plots |
|---|---|---|---|---|
| Bogwater Hollow | 1 × 8 rows | 32 × 8 | 59 | 8 |
| `test-bogwater-2lane` | 2 × 4 rows | 32 × 9 | 60 | 8 |
| `test-bogwater-2lane-tall` | 2 × 6 rows | 32 × 13 | 92 | 12 |
| Stumpfield | 1 × 8 rows | 34 × 8 | 49 | 8 |
| `test-stumpfield-2lane` | 2 × 4 rows | 34 × 9 | 49 | 8 |
| `test-stumpfield-2lane-tall` | 2 × 6 rows | 34 × 13 | 76 | 12 |
| Twin Roots | 2 × 6 rows | 32 × 13 | 87 | 12 |

- **`2lane`** splits the rows the way Twin Roots does. The original rows 0–3 become the upper lane, then a root wall, then rows 4–7 become the lower lane. Width, home columns, plots, stumps and loam tiles are the original's. Bogwater's central loam patch is cut in two, one strip in each lane.
- **`2lane-tall`** adds an empty row on each side of each lane. That gives Twin Roots' shape (6 + wall + 6) and 50% more plots. These were added after the `2lane` maps played very differently from Twin Roots.
- **All four are `testOnly`.** `mapPool()` drops them, so runs never draw them. The goldens didn't move: the route draws only from that pool, and a battle's state holds only its own map.
- **Tool changes:**
  - `npm run experiment` now reports any `testOnly` map as a lead. It used to use a hard-coded list.
  - `--checks g4` now plays each map in `--maps`.

### G3 against `bot:balanced`

`npm run experiment -- --checks g3 --g3seeds 50 --maps bogwater-hollow,test-bogwater-2lane,stumpfield,test-stumpfield-2lane`, and the same with `--maps test-bogwater-2lane-tall,test-stumpfield-2lane-tall,twin-roots`. The one-lane and Twin Roots columns match step A exactly.

| Mono bot | Bogwater (1 lane) | 2 × 4 rows | 2 × 6 rows | Stumpfield (1 lane) | 2 × 4 rows | 2 × 6 rows | Twin Roots |
|---|---|---|---|---|---|---|---|
| Gill Archer Nest | **100** ✗ | **80** ✗ | **62** ✗ | **100** ✗ | **85** ✗ | **67** ✗ | **63** ✗ |
| Sporeling Burrow | **75** ✗ | **82** ✗ | **76** ✗ | **70** ✗ | **72** ✗ | **67** ✗ | **77** ✗ |
| Amanita Lodge | 48 | **73** ✗ | **65** ✗ | 41 | **71** ✗ | **58** ✗ | **64** ✗ |
| Morel Warren | 54 | **62** ✗ | 52 | **57** ✗ | 53 | 55 | 54 |
| Veilstalker Hollow | 31 | 47 | 53 | 42 | **63** ✗ | 48 | 51 |
| Rootbreaker Den | 15 | 42 | 53 | 17 | 47 | 52 | 53 |
| Capguard Hall | 49 | 24 | 27 | 41 | 29 | 19 | 27 |
| Scythecap Grove | 42 | 9 | 17 | 38 | 14 | 17 | 11 |
| Hammercap Forge | 28 | 17 | 22 | 23 | 20 | 13 | 20 |
| Puffball Mortar | 9 | 0 | 0 | 8 | 3 | 1 | 0 |
| Tender's Ring, Truffle Cellar, Rhizome Vault, Spore Exchange | 0–2 | 0–4 | 0 | 0–1 | 0–9 | 0 | 0 |

- **A second lane cuts the archers but doesn't pass.**
  - At the original plot count, mono Gill Nest drops from 100% to 80% (Bogwater) and 85% (Stumpfield).
  - With Twin Roots' shape, it drops to 62% and 67%, Twin Roots' own failing number.
- **Every two-lane version adds a mono Amanita takeover (58–73%).**
- **Mono Sporeling still fails on every version (67–82%).**
- The other changes follow the Twin Roots pattern from step A. The single-building concentrators gain (Rootbreaker 15 → 42–53, Veilstalker up to 63 on the 4-row Stumpfield). Capguards and Scythecaps lose.

### Why the shape matters

Traces with `--checks lanes --seeds 25` (50 games), mono Gill Nest against `bot:balanced`. "Busy lane" is the lane where the mono side placed most of its spawners.

| | Bogwater | 2 × 4 rows | 2 × 6 rows | Twin Roots |
|---|---|---|---|---|
| Mono wins (this sample) | 100% | 82% | 56% | 58% |
| Mono spawners all in one lane | 100% of games | 0% (62% in the busy lane) | 0% (65%) | 0% (64%) |
| Defender supply, busy + other lane, at 4:00 / 5:00 | 2.3 / 0.6 (one lane) | 4.4 + 2.9 / 3.8 + 2.8 | 4.3 + 4.3 / 3.5 + 5.8 | 4.3 + 4.4 / 3.5 + 5.6 |
| Mono side's Heartcap hit | 0 of 50 | 19 of 50 | 31 of 50 | 30 of 50 |

On Stumpfield the mono side's Heartcap is hit in 0 / 18 / 33 of 50 games (one lane / 2 × 4 / 2 × 6).

**Concentration diagnostic.** A scratch script, as in step A, set the AI's aggressive lane style on one or both sides. 100 games each, mono Gill Nest win rate:

| Map | Default (both split) | Mono side concentrates | Both concentrate |
|---|---|---|---|
| Bogwater 2 × 4 rows | 80% | 84% | 98% |
| Stumpfield 2 × 4 rows | 85% | 84% | 94% |
| Bogwater 2 × 6 rows | 62% | 78% | 93% |
| Stumpfield 2 × 6 rows | 67% | 82% | 90% |
| Twin Roots | 63% | 78% | 94% |

**Width-only diagnostic** (scratch, not committed). The tall maps were rebuilt with stumps on each lane's top and bottom row. Units can walk on 6 rows, but buildings fit only where the 4-row maps allow them. Mono Gill Nest wins 79% on Bogwater and 88% on Stumpfield, the same as the 4-row maps.

- **The sides split on every two-lane version.** The mono side never puts all its spawners in one lane, so the second front exists in all of them.
- **What decides it is build room in the other lane, not walking room.** With 4 buildable rows per lane, each side has 4 home plots per lane.
  - On the 4-row Bogwater, the defender's second lane stays near 3 supply (2.8 at 5:00) and rarely counterattacks. The archers' Heartcap is hit in 36–38% of games on either 4-row map.
  - With 6 buildable rows, that lane reaches 5.8 by 5:00 (5.6 on Twin Roots), and the archers' Heartcap is hit in 62–66% of games, as on Twin Roots.
- **Concentration still wins.** When both sides concentrate, every version plays like a one-lane map (90–98%). The second front helps only because `bot:balanced` happens to split.

### The diver on two-lane maps

`diverdef` is step A's one-off defender. Its spec:

```
--defender bot:diverdef --proto 'bot.diverdef:{"opener":["sporelingBurrow","veilstalkerHollow"],"weights":{"sporelingBurrow":3,"capguardHall":3,"gillNest":2,"truffleCellar":2,"rootbreakerDen":1,"puffballMortar":1,"scythecapGrove":2,"veilstalkerHollow":5},"limits":{"truffleCellar":{"maxOwned":3},"rootbreakerDen":{"afterSeconds":180}},"mergePolicy":"on"}'
```

Add `diverleap,` to the front of the `--proto` spec for the diver. It reproduces step A's 95 / 54 and 97 / 37.

| Mono Gill Nest win rate | Bogwater (1 lane) | 2 × 4 rows | 2 × 6 rows | Stumpfield (1 lane) | 2 × 4 rows | 2 × 6 rows | Twin Roots |
|---|---|---|---|---|---|---|---|
| vs `bot:balanced` | 100 | 80 | 62 | 100 | 85 | 67 | 63 |
| vs `bot:balanced`, `diverleap` | 100 | 80 | 67 | 100 | 86 | 67 | 67 |
| vs `diverdef` | 95 | 59 | 54 | 99 | 67 | 64 | 54 |
| vs `diverdef`, `diverleap` | 97 | 50 | **41** | 94 | 68 | 63 | **37** |

- **The diver works only against a Hollow-opening defender, and only on Bogwater-shaped maps:** 41% on tall Bogwater, 50% on the 4-row split. On both Stumpfield versions it does nothing (63–68%). This run doesn't show why.
- **Under `bot:balanced` it slightly hurts,** as on Twin Roots: 62 → 67 on tall Bogwater. Mono Veilstalker gains (47 → 53 on the 4-row Bogwater, 53 → 59 ✗ on the tall one). No other mono bot moves: all 14 were checked on the one-lane and 4-row maps, and six on the tall maps.
- **Against `diverdef`,** mono Sporeling is 71–76% on every two-lane version and mono Amanita 53–62%. The diver doesn't touch either, since they field no ranged units.

### Side effects

- **Mono Amanita takes over on every two-lane map** (58–73%). The tall-map traces show why: 92% of its games put every Lodge in one lane, breaking it while `bot:balanced` splits. Its own Heartcap is hit in 47–50 of 50 games, so these games are races. When both sides concentrate, Amanita falls to 40–51%.
- **Mono Sporeling.** Two lanes don't fix it, and the 4-row split makes it worse on Bogwater (75 → 82%). It wins whether lanes split or not (79–98% when both concentrate). Hold's 12-supply muster is still the suspect, and it isn't fixed here.
- **Morel** reaches 62% on the 4-row Bogwater. **Veilstalker** reaches 63% on the 4-row Stumpfield. **Rootbreaker** reaches 52–53% on the tall maps, just under the limit.
- **G4** (`--checks g4 --maps …`, `bot:balanced` against the scripted general, 40 seeds) passes on every map:

  | | Bogwater | 2 × 4 rows | 2 × 6 rows | Stumpfield | 2 × 4 rows | 2 × 6 rows | Twin Roots |
  |---|---|---|---|---|---|---|---|
  | Median length | 7:13 | 7:06 | 6:51 | 7:13 | 7:27 | 7:11 | 7:12 |
  | Decisions | 10% | 3% | 0% | 13% | 5% | 8% | 5% |
  | Bot wins | 55% | 60% | 43% | 48% | 63% | 38% | 40% |

- **Turrets come per lane.** `turret.perLane` is 2, so a two-lane map has 4 turrets per side. With `--proto turret.perLane:1` on the 4-row maps (the one-lane total):
  - mono Gill Nest falls to 61 / 63%;
  - mono Sporeling rises to 97 / 97%, Morel to 76 / 81% and Amanita to 66 / 60%.

  The extra turrets are part of what holds the swarms down on two-lane maps. A lane-count change can't drop them.

### What one-lane maps would lose

A second lane works only in Twin Roots' shape. That shape:
- **makes Bogwater and Stumpfield 13 rows tall with 12 home plots,** above §4.1's scarcity target (4–6 of a battle's 10–14 buildings fit at home);
- **removes the simplest battle:** one front, one Hold button and one place to watch. Bogwater is the first map players see, and round 3 said "too much to learn" (F8);
- **blurs map identity.** Twin Roots' character is lane choice. If every map has two lanes, the maps differ only in their tiles;
- **halves each lane's fight,** which works against colony-swarm's bigger swarms;
- **re-tunes everything that counts lanes:** turrets (above), Armilla's tithe (columns held across lanes), and the area powers, Spore Burst and Puppet Bloom, which catch fewer units.

### Options that keep one lane (sketch, not built)

From two lanes we learned what has to be copied:
- the defender needs production the archer mass can't reach;
- that production needs a way to hit the archers' Heartcap past the mass.

A taller one-lane map won't do it. Step A and the width-only check both say walking room doesn't matter, and extra plots help only where the archers aren't.

| Option | The second-front effect it copies | What it needs | Main risk |
|---|---|---|---|
| **Forward buildings worth defending:** colony-swarm's terrain in contested ground, or the network review's Fed/Starved forward buildings | The archer side has to hold more than one point, so the mass divides | A payoff worth fighting for, ideally one that changes units rather than adding a percentage. The general must value it (§7.3) | In one lane every forward point is on the archers' path, so the mass may take them in passing and the rule rewards the push |
| **Flank orders:** a lane stance that sends a spawner's units along the lane's edge rows, past the front, onto the spawners and Heartcap behind it | The counterattack past the mass that hits the archers' Heartcap in 60% of Twin Roots games | A movement rule (§5.2: units walk their spawn row), a readable path, and an AI that uses it. It sits next to Hold / Advance | Sporeling flanks become the next swarm takeover, as with B1. Burrowing stays excluded (§17 #7) |

The other half, production the archers can't suppress, was B2 (`besiegedBy`). On its own it didn't move G3 in round 1. Any option above would be measured the same way as this test: `--checks g3,lanes` on the run maps and on these test maps.

### Recommendation

**Don't give the one-lane maps a second lane as the archer fix.**
- At the original plot count it leaves mono Gill Nest at 80–85%.
- Twin Roots' shape reaches 62–67%, which is Twin Roots' own failure, not a pass. That shape also costs the map identity above.
- Every two-lane version adds a mono Amanita takeover, and mono Sporeling still fails.
- The diver gets below 55% only on the tall Bogwater, only against a Hollow-opening defender, and not on Stumpfield.

**What to keep from it:**
- **The mechanism.** A second front works when the defender can build a real army where the archers aren't. A one-lane fix should copy that (options above). Unit rules haven't managed it.
- **The test maps,** as a bench. Measure any archer candidate on `test-bogwater-2lane-tall` and `test-stumpfield-2lane-tall` as well as the run maps.
- **For the G3 rewrite and the AI.** On two-lane maps the right lane play depends on the opponent:
  - Splitting beats archers: 62% against 93% when both sides concentrate.
  - Concentrating beats Amanita: 42% against 65%.

  `bot:balanced` always splits, so G3 on two-lane maps measures its habit as much as the mono bot. A defender whose lane choice reads the opponent would make two-lane G3 fairer. That's AI work, and the user's call.

## Counter matrix on today's rules (2026-10-30)

Made on `feature/counter-matrix`: P0 of the [combat rework](ideas/combat-rework.md). Nothing in the rules or content changes. The answer bots are `bot.<id>` specs that the tool adds through `protoContent`, so `data/bots.json`, `src/data/proto.ts` and the goldens are unchanged.

**The check** (`npm run experiment -- --checks counters`, `evaluateCounters` in `tools/lib/balance.ts`):
- **Builds tested:** every `bot:mono:<id>` whose G3 mean is above 40%. The check plays G3 first (50 seeds per seat) to pick them: Gill Nest, Sporeling, Amanita, Morel and Veilstalker. Its G3 table matches [the rewrite's](#g3-on-every-map-the-rewrite-2026-10-30) cell for cell.
- **Answers, 74 per build:**
  - every other mono bot (13);
  - every pair of the 10 army buildings (the 9 fighting spawners and the Puffball Mortar), weighted evenly (45);
  - `bot:balanced`;
  - 11 hand-written counter bots ([below](#the-answer-bots));
  - the other data bots: `bot:rush`, `bot:turtle`, `bot:greedy` and `bot:slayer`.
- **Every pairing** plays every run-pool map in both seats, through G3's own loop (`g3Row`).
- **Screen:** seeds 1–10 per seat (20 games per map) rank the answers by their mean over the maps.
- **Confirm:** each build's top 3 on seeds 11–60 (100 games per map, about ±5 points, and ±3 on the mean). The seeds are fresh, so the screen's luck doesn't flatter its winners.
- **Proposed pass rule:** each build has an answer that wins ≥ 60% on the mean over maps. ⚑ marks a mono answer that fails G3 itself.

### Result

**Every strong mono build has an answer, so the proposed rule passes on today's rules.**
- **Mono Gill Nest has answers: Sporeling-led builds.** Mono Sporeling wins 88% (⚑, it fails G3 itself). A Sporeling and Veilstalker forward rush wins 81%, and D1's own Sporeling-heavy defender 80%. They win on every map (71–91%).
- **D1 predates Hold.** Round 2's "no defender holds" was measured on 2026-10-27, and Hold was adopted the next day. With `--proto nohold`, the rebuilt D1 defenders reproduce D1's table. With Hold, D1's Sporeling-heavy defender beats mono Gill Nest 92% of the time on Bogwater ([below](#d1-before-and-after-hold)).
- **Mono Sporeling is the hard one.** `bot:turtle` wins 61%, within noise of the bar. D1's Amanita-heavy defender wins 57% and mono Capguard 56%. On Twin Roots they win 21–45%, and nothing tried there wins half its games ([below](#mono-sporeling-on-twin-roots)).
- **Amanita:** mono Hammercap wins 93%, which is the asserted Hammercap > Amanita Knight edge. **Morel:** Veilstalker + Amanita wins 98%, mono Veilstalker 97%. **Veilstalker:** Sporeling + Gill Nest wins 95%.
- **`bot:balanced` loses to Gill Nest, Sporeling, Amanita and Morel.** In G3 it wins 12%, 26%, 49% and 45% of those games. G3 fails because the reference mix doesn't build the answer, not because there's none.

### Top answers

Answer win % against each mono build, confirmed on seeds 11–60 (100 games per map). Bold is ≥ 60%.

| Mono build (G3 mean) | Answer | Bogwater | Stumpfield | Twin Roots | Mean |
|---|---|---|---|---|---|
| Gill Archer Nest (88%) | mono Sporeling ⚑ | 91 | 83 | 91 | **88** |
| | `counter-rush` | 81 | 76 | 86 | **81** |
| | `d1-sporeling` | 81 | 71 | 89 | **80** |
| Sporeling Burrow (74%) | `bot:turtle` | 77 | 86 | 21 | **61** |
| | `d1-amanita` | 57 | 70 | 45 | 57 |
| | mono Capguard | 79 | 65 | 25 | 56 |
| Amanita Lodge (51%) | mono Hammercap | 100 | 100 | 80 | **93** |
| | Amanita + Morel | 95 | 99 | 77 | **90** |
| | Gill Nest + Morel | 100 | 100 | 67 | **89** |
| Morel Warren (55%) | Veilstalker + Amanita | 98 | 100 | 95 | **98** |
| | mono Veilstalker | 99 | 99 | 93 | **97** |
| | mono Gill Nest ⚑ | 100 | 96 | 83 | **93** |
| Veilstalker Hollow (41%) | Sporeling + Gill Nest | 100 | 100 | 84 | **95** |
| | mono Gill Nest ⚑ | 100 | 100 | 73 | **91** |
| | Gill Nest + Veilstalker | 100 | 100 | 66 | **89** |

**Verdict under the proposed rule:** all five pass. Mono Gill Nest's best answer fails G3 itself, but its next two don't. Mono Sporeling's pass rests on one answer at 61% (184 of 300 games).

### Mono against mono

From the screen (60 games a cell, about ±6.5 points): the answer's win %, with the strong builds as rows. Bold is ≥ 60%. The four mono bots with no army (Tender's Ring, Truffle Cellar, Rhizome Vault, Spore Exchange) won no games and are left out.

| Build \ answer | Sporeling | Capguard | Gill Nest | Rootbreaker | Mortar | Scythecap | Veilstalker | Hammercap | Amanita | Morel |
|---|---|---|---|---|---|---|---|---|---|---|
| Gill Nest | **90** | 2 | – | 0 | 0 | 0 | 8 | 0 | 17 | 7 |
| Sporeling | – | **63** | 10 | 15 | 0 | 37 | 23 | 2 | 43 | 35 |
| Amanita | 57 | 30 | **83** | **82** | 0 | 35 | **70** | **92** | – | **90** |
| Morel | **65** | 17 | **93** | 8 | 0 | 12 | **95** | 3 | 10 | – |
| Veilstalker | **77** | 37 | **92** | 0 | 3 | 15 | – | 0 | 30 | 5 |

- **The intended triangle holds between pure builds.** Sporeling beats Gill Nest (88% confirmed), Gill Nest beats Capguard (98% in the screen), and Capguard beats Sporeling (56% confirmed).
- **The two worst builds are answered by near-pure builds.**
  - The Gill Nest answers are Sporeling-led: mono Sporeling, `counter-rush` and `d1-sporeling`.
  - The Sporeling answers are Capguards (`bot:turtle`, with Mortars at home, and mono Capguard) or Amanita Knights (`d1-amanita`).
  - `bot:balanced` wins 18% and 23% against them in the screen.

Named bots against each build (screen mean, bold ≥ 60%):

| Answer | Gill Nest | Sporeling | Amanita | Morel | Veilstalker |
|---|---|---|---|---|---|
| `balanced` | 18 | 23 | 50 | 55 | **65** |
| `d1-burrows` | 52 | 35 | 55 | **63** | **62** |
| `d1-sporeling` | **90** | 50 | 53 | **72** | **85** |
| `d1-amanita` | 18 | **70** | **78** | 25 | **77** |
| `d1-adaptive` | 18 | 23 | 45 | **62** | **60** |
| `diverdef` | 17 | 43 | 43 | **85** | **78** |
| `counter-archers` | **62** | 27 | 47 | **72** | **77** |
| `counter-rush` | **92** | 48 | 58 | **78** | **73** |
| `counter-swarm` | 0 | 43 | 27 | 8 | 23 |
| `counter-tenders` | 0 | 47 | 22 | 5 | 20 |
| `counter-knights` | 2 | 8 | **87** | 42 | 8 |
| `counter-runners` | 5 | 42 | **80** | 47 | 55 |
| `rush` | **73** | 38 | 48 | 55 | **73** |
| `turtle` | 2 | **67** | **62** | 48 | **68** |
| `greedy` | 3 | 13 | 50 | 42 | 52 |
| `slayer` | 13 | 30 | 50 | **68** | 57 |

### D1 before and after Hold

Round 2's [D1 table](#d1-is-g3-a-reference-bot-artifact), rebuilt and played as D1 was: Bogwater, seeds 1–20 per seat (40 games). Each cell is the mono attacker's win %: D1 on 2026-10-27 / the rebuild with `--proto nohold` / today.

| Defender | vs mono Gill Nest | vs mono Sporeling | vs mono Capguard |
|---|---|---|---|
| `bot:balanced` | 100 / 100 / 100 | 40 / 40 / 65 | 25 / 25 / 45 |
| `d1-burrows` (two-Burrow opener) | 98 / 98 / 60 | 43 / 43 / 75 | 55 / 55 / 48 |
| `d1-adaptive` | 100 / 100 / 98 | 48 / 48 / 72 | 15 / 15 / 22 |
| `d1-sporeling` (Sporeling-heavy) | 95 / 95 / **8** | 35 / 35 / 43 | 95 / 95 / 85 |
| `d1-amanita` (Amanita-heavy) | 100 / 100 / 100 | 15 / 10 / 28 | 35 / 35 / 35 |
| mono Sporeling Burrow | 98 / 98 / **5** | the mirror, not played | 98 / 98 / 90 |
| mono Amanita Lodge | 100 / 100 / 100 | 0 / 0 / 40 | 20 / 20 / 55 |

- **The rebuild matches D1 in every cell but one,** so the bots and the tool agree with round 2. What changed is the rules.
- **Hold is the likely reason.** Every AI side now musters 12 supply in a lane before it advances. Sporelings arrive as a wave rather than one or two at a time, which was the diagnosis's first cause (the trickle). This run doesn't trace it.
- **`bot:balanced` still loses every game to the archers on Bogwater.** Its Sporelings are too few to make that wave.
- **Hold also made mono Sporeling stronger against every defender here,** by 8–40 points. That is the G3 cost the [Hold adoption](../data/CHANGELOG-balance.md#adopted-e1-hold--advance-2026-10-28) recorded.

### Mono Sporeling on Twin Roots

The screen's 8 best answers on Twin Roots, confirmed there on seeds 11–60 (100 games each). Answer win %:

| Answer | Twin Roots |
|---|---|
| `bot:rush` | 46 |
| `d1-amanita` | 45 |
| `counter-rush` | 42 |
| Sporeling + Veilstalker | 41 |
| Sporeling + Amanita | 41 |
| Sporeling + Gill Nest | 32 |
| Sporeling + Rootbreaker | 26 |
| Capguard + Amanita | 8 |

The main confirmation adds `bot:turtle` at 21% and mono Capguard at 25%. No answer tried wins half its games against mono Sporeling on Twin Roots. On the one-lane maps, Capguards answer it: `bot:turtle` (Capguards and Mortars at home) wins 77% and 86%, mono Capguard 79% and 65%.

### What it means for the rework

- **The proposed pass rule passes today,** so on its own it can't tell the rework from today's rules. Two stricter versions, and what they say today:
  - an answer that wins ≥ 60% on every map: fails mono Sporeling only (Twin Roots, best 46%);
  - an answer that isn't itself a mono build failing G3: changes nothing, since mono Gill Nest keeps `counter-rush` (76–86% on every map).
- **The archer premise is out of date.** The rework doc's diagnosis rests on D1: no defender beats mono archers, and an all-Sporeling army wins 2%. Since Hold, Sporeling-led armies win 80–95%. By the doc's own test ("a strong build that something beats is a strategy"), mono Gill Nest is now a strategy.
- **What's left without a good answer:**
  - mono Sporeling. Nothing answers it on Twin Roots, and its best answer overall wins 61%, near the bar;
  - G3 itself. `bot:balanced` loses to the committed builds: the Sporeling-led bots beat the archers 80–88%, but the reference mix wins 12%.
- **The answers say what the general's counter cycle (§7.4) would need to build:**
  - Sporelings against archers;
  - Capguards, or Amanita Knights, against Sporelings;
  - Hammercaps against Amanita;
  - Veilstalkers against Morel;
  - archers against Veilstalkers.

### The answer bots

The tool generates these (`counterBots` in `tools/lib/balance.ts`) and adds them with `bot.<id>:{…}` specs. The shipped bots are untouched.

- **Pairs** (`pair-<a>-<b>`): weights 1 and 1, merging on. The opener alternates a, b, a, … while the 300 starting gold covers it, the way a mono bot spends its starting gold on its one building.
- **D1's defenders** are rebuilt from round 2's descriptions, since their specs weren't recorded. With `--proto nohold` they reproduce D1's table. The one miss is Amanita-heavy against mono Sporeling (10% against D1's 15%, 2 games of 40).

| Bot | What it is | Opener | Weights (other settings) |
|---|---|---|---|
| `d1-burrows` | `bot:balanced` with a two-Burrow opener | Burrow, Burrow | `bot:balanced`'s |
| `d1-sporeling` | D1's Sporeling-heavy defender | Burrow, Burrow | Burrow 5, Capguard 1, Cellar 1, Scythecap 1 (≤ 3 Cellars) |
| `d1-amanita` | D1's Amanita-heavy defender | Lodge | Lodge 4, Burrow 2 |
| `d1-adaptive` | `bot:balanced` running the adaptive counter cycle | Burrow, Cellar | `bot:balanced`'s (`adaptive`) |
| `diverdef` | Step A's defender, without the diver rule | Burrow, Hollow | `bot:balanced`'s, Hollow 5 |
| `counter-archers` | Amanita Knights soak arrows (Pierce ×0.75 on heavy) while Sporelings and Veilstalkers close in | Burrow, Burrow | Lodge 3, Burrow 3, Hollow 2, Cellar 1 (≤ 2 Cellars) |
| `counter-rush` | Sporelings and Veilstalkers placed forward, to strike before the archer mass stands | Burrow, Burrow | Burrow 4, Hollow 3, Lodge 1 (forward placement: `spawnerDepthWeight` 3, as `bot:rush`) |
| `counter-swarm` | Capguards and Scythecaps (Slash ×1.5 on light) behind Mortar splash | Capguard, Capguard | Capguard 4, Scythecap 3, Mortar 2, Cellar 1 (≤ 2 Cellars, ≤ 3 Mortars) |
| `counter-tenders` | Capguards and Scythecaps healed by Tenders | Capguard, Capguard | Capguard 4, Scythecap 2, Tender's Ring 2, Cellar 1 (≤ 2 Cellars) |
| `counter-knights` | Hammercaps and Rootbreakers (Crush ×1.5 on heavy), with Veilstalkers for merged Knights (Slayer ×3 on elites) | Hammercap | Hammercap 4, Rootbreaker 2, Hollow 2, Cellar 1 (≤ 2 Cellars) |
| `counter-runners` | Archers and Veilstalkers (Pierce ×1.5 on medium) behind Capguards, with Mortar splash | Gill Nest, Capguard | Gill Nest 3, Hollow 2, Capguard 2, Mortar 1, Cellar 1 (≤ 2 Cellars) |

Every hand-written bot merges (`mergePolicy` on).

### Runtime and commands

- **The full check** plays 30,900 games: 4,200 for G3, 22,200 in the screen and 4,500 in the confirmation. It took 361 s on 6 workers while other work shared the machine. That's 2,110 s of CPU, 0.068 s a game, or about 35 minutes single-threaded.
- **Workers:** `--workers n` plays the cells in worker threads (`tools/lib/pool.ts`), by default half the machine's threads. Each cell is deterministic and results come back in job order. A small run gave identical reports in process and on 4 workers.
- **Options:** `--mono`, `--answers`, `--maps`, `--screen-seeds`, `--confirm-seeds`, `--top` and `--g3seeds`. A narrow run for iterating takes 47 s:
  ```
  npm run experiment -- --checks counters --mono gillNest,sporelingBurrow --answers bot:mono:sporelingBurrow,bot:mono:capguardHall,bot:counter-rush,bot:turtle,bot:d1-amanita --g3seeds 10
  ```
- **The D1 table** comes from the screen of this command, with and without `--proto nohold`:
  ```
  npm run experiment -- --checks counters --mono gillNest,sporelingBurrow,capguardHall --answers bot:balanced,bot:d1-burrows,bot:d1-adaptive,bot:d1-sporeling,bot:d1-amanita,bot:mono:sporelingBurrow,bot:mono:amanitaLodge --maps bogwater-hollow --screen-seeds 20
  ```
- **The Twin Roots confirmation:** `npm run experiment -- --checks counters --mono sporelingBurrow --maps twin-roots --answers <the 8 above> --top 8`.
- **For P2:** the same check with `--proto rework`.

## Combat rework P1 (2026-10-30)

Built on `feature/combat-rework`: the five settings of the combat rework's Level 2 package (P1 of the [combat rework](ideas/combat-rework.md)), each a default-off preset. **Nothing is adopted.** `balance.json` doesn't change, the Rhizomorph exists only under its preset, and the goldens are unchanged. This is a first read with the existing checks, not P2: G3 uses 20 seeds per seat (40 games per map, about ±8 points).

### The settings

| Preset | What it does | Where it lives |
|---|---|---|
| `pinned` | A ranged unit with an enemy unit within 1 tile (edge distance) attacks at 0.35× its rate: its cooldown runs on 350 ticks in 1,000 | balance `pinned` |
| `callforhelp` | When an enemy unit or tower damages a unit or building, every friendly unit in its lane within 5 tiles of it that has no target takes the attacker as its target | balance `callForHelp` |
| `sporecloud` | The Puffball Mortar reaches 7 tiles. Each shell leaves a cloud (radius 1.5, 6 s) that deals 10 damage a second, ignoring armor, to every enemy unit inside it. Not buildings or friends | balance `sporeCloud`; clouds are entities in `state.clouds` |
| `rhizomorph` | A new unit and spawner (below) | content only: `unit.rhizomorph`, `building.rhizomorphTunnel`, both rosters |
| `waves` | Spawns wait inside their building and leave with their side's next wave. Both sides release every 20 s on the same tick | balance `waves` |
| `rework` | All five | |

**The Rhizomorph** (preset `rhizomorph`): 140 HP, medium armor, 16 slash every 1.0 s, speed 1.2, 2 supply. It has a new tag, `burrow`.
- **Underground,** it can't be targeted, hit, pinned or merged. It doesn't collide, hold ground or attack.
- **It tunnels** at its speed toward the nearest enemy ranged unit or spawner at or behind the enemy's frontmost unit. With none, it heads for that frontmost unit, else the enemy border. It surfaces once its attack range reaches its target.
- **Above ground,** it prefers ranged targets (the diver's targeting).
- **The Rhizomorph Tunnel** costs 160 and makes one every 18 s.
- **Merge perks:** Bloomed speed ×1.1 and Elder damage ×1.1, like the Morel Runner. The design gave none, and the schema needs both.

**Hooks for relics and perks:** `side.waveBeat` (seconds between a side's releases) and `side.waveSize` (× the units each spawner releases) are new modifier stats.

**Proto layer:** presets can now carry content paths. `unit.<id>:{…}`, `building.<id>:{…}` and `general.<id>:{…}` add an entry when the id is new. `faction.<id>.…` patches a faction file, and `path+:value` adds to a list (`faction.gray-rot.buildings+:"rhizomorphTunnel"`). Buildings have an optional `aiWeight`: every bot and general whose weights don't list the building buys it at that weight (mono bots never do), and generals field it in their run kits. The Rhizomorph Tunnel uses weight 1, about 6% of `bot:balanced`'s purchases.

**Display, enough to playtest `?proto=rework`:** clouds as a spore haze, a tunnelling Rhizomorph as a moving mound, a beat chip in the top band (seconds to the next wave, the units waiting, a bar), a +N badge on each spawner for the units inside, and tooltip and inspect lines for each setting.

### Judgment calls

- **Where a wave waits:** inside its building. A spawn adds to the spawner's `stored` count and its supply counts at once. On the beat, every spawner releases its count at its own front edge. Nothing waits on the field. A spawner sold or destroyed lets its units out at once.
- **How a wave forms up:** units come out at their own buildings, so a wave starts staggered by building depth (a few tiles; more once spawners spread forward). Two rules keep it a block on the way:
  - **Pace:** a wave's units with no target march at the speed of its slowest such unit in the lane (`matchPace`, on by default).
  - **Order:** an idle ranged unit stays 1 tile behind its side's frontmost melee unit in the lane (`rangedGap`). It never walks back, and it is free to fight once it has a target. With no friendly melee in the lane (mono archers), ranged units walk freely.
- **Hold under waves:** holding a lane keeps that lane's next wave home, and the beat spends the hold, so the next beat releases both. The 30 s timeout and the rally line don't apply: held units are inside buildings. The usual 10 s cooldown applies, so a player can hold again before the following beat. **The AI never holds** under waves.
- **Call for help's leash:** the usual leash (aggro × 1.25 = 5 tiles for melee) alone drops most calls. In E1's layout (a building at the border, an archer at range 5), a held unit at its rally line is 5.15 tiles from the archer. So a called unit also keeps the attacker while the attacker is still attacking it or a friend within 5 tiles of it. Hits already carried the attacker's id (`sourceId`). Spore-cloud damage doesn't call for help.
- **Pinned** slows the attack cooldown while the unit is pinned. It applies tick by tick, so an archer that gets free shoots at full rate again at once. "Ranged" means the `ranged` tag.
- **Clouds** pulse on a fixed 1 s cadence of the battle clock, 6 pulses each, and overlapping clouds stack. The damage ignores the matrix, merge resistances and the Sporestorm.
- **The AI's Mortar placement:** under `sporecloud`, each tile of lane a cloud tower reaches past the side's border adds 1 to the spot's score. Next to `towerFront` (5) and `towerThreat` (2 per supply), that pulls Mortars forward.

### G3: each setting alone, and all five

`npm run experiment -- --proto <preset> --checks g3 --g3seeds 20`. Mean / worst map over Bogwater Hollow, Stumpfield and Twin Roots; bold fails a limit (mean ≤ 55, worst ≤ 60).

| Mono bot | Baseline | `pinned` | `callforhelp` | `sporecloud` | `rhizomorph` | `waves` | `rework` |
|---|---|---|---|---|---|---|---|
| Gill Archer Nest | **86 / 100** | **75 / 93** | **87 / 100** | **87 / 100** | **88 / 100** | **93 / 98** | **74 / 83** |
| Sporeling Burrow | **72 / 75** | **75 / 78** | **67 / 75** | **68 / 73** | **81 / 88** | **90 / 98** | **94 / 98** |
| Amanita Lodge | **47 / 65** | **50 / 63** | **53 / 65** | 40 / 60 | **54 / 65** | **53 / 63** | 52 / 53 |
| Morel Warren | 53 / 60 | **59 / 60** | **60 / 65** | 51 / 55 | 54 / 57 | **48 / 63** | **60 / 68** |
| Veilstalker Hollow | 36 / 48 | 41 / 53 | 43 / 57 | 28 / 43 | **53 / 68** | **60 / 80** | **63 / 90** |
| Capguard Hall | 38 / 45 | 41 / 53 | 43 / 50 | 30 / 38 | 36 / 53 | 48 / 57 | 49 / 57 |
| Rootbreaker Den | 28 / 53 | 28 / 55 | 29 / 48 | 28 / 53 | 34 / 55 | 22 / 25 | 25 / 28 |
| Scythecap Grove | 25 / 38 | 26 / 38 | 33 / 48 | 23 / 33 | 30 / 43 | 19 / 33 | 25 / 33 |
| Hammercap Forge | 22 / 25 | 23 / 25 | 27 / 33 | 20 / 25 | 24 / 33 | 28 / 33 | 25 / 35 |
| Puffball Mortar | 8 / 13 | 8 / 13 | 7 / 13 | 13 / 20 | 10 / 15 | 0 / 0 | 4 / 5 |
| Rhizomorph Tunnel | – | – | – | – | 0 / 0 | – | 8 / 15 |

The baseline reproduces the 50-seed table within noise (Gill Nest 88 / 100, Sporeling 74 / 77). Mono Gill Nest per map (Bogwater / Stumpfield / Twin Roots): baseline 100 / 100 / 57, `pinned` 90 / 93 / 43, `waves` 95 / 98 / 88, `rework` 80 / 83 / 60.

- **Only `pinned` moves the archers on its own:** 86 → 75 mean, and 57 → 43 on Twin Roots. It lifts mono Morel to 59.
- **`callforhelp` and `sporecloud` leave the archers at 87 / 100.** Clouds hurt the armored builds instead, since they ignore armor: Amanita 47 → 40 (it passes), Capguard 38 → 30, Veilstalker 36 → 28.
- **`rhizomorph` weakens the reference bot.** At weight 1 it spends on Tunnels, and mono Sporeling (81), Veilstalker (53 / 68) and Amanita get stronger. Mono Rhizomorph wins nothing.
- **`waves` makes swarms dominant,** as Hold did in E1, only more so: mono Sporeling 90 / 98, Veilstalker 60 / 80. It also helps the archers on Twin Roots (57 → 88).
- **All five:** mono Gill Nest drops to 74 / 83, its best yet, and mono Amanita passes. But mono Sporeling reaches 94 / 98, and Veilstalker (63 / 90) and Morel (60 / 68) fail too. Four mono bots fail, against three on today's rules.

### Two follow-ups on waves

| Variant | Gill Nest | Sporeling | Veilstalker | Amanita | Morel |
|---|---|---|---|---|---|
| `waves` | 93 / 98 | 90 / 98 | 60 / 80 | 53 / 63 | 48 / 63 |
| `waves,waves.matchPace:false` | 88 / 98 | 93 / 98 | 54 / 65 | – | – |
| `rework` | 74 / 83 | 94 / 98 | 63 / 90 | 52 / 53 | 60 / 68 |
| `rework,waves.matchPace:false` | 72 / 85 | 94 / 100 | 52 / 65 | – | – |
| The four without waves | 79 / 98 | 71 / 83 | 39 / 48 | 49 / 65 | **69 / 73** |

- **Pace matching isn't the cause.** Without it, mono Sporeling stays at 93–94; only the Veilstalker drops (60 → 54, 63 → 52). Releasing a whole beat's production at once is what helps the swarm.
- **Without waves, the other four** leave mono Sporeling at baseline (71) and the archers at 79. Mono Morel rises to 69 / 73: pinning and calls both help it (59 and 60 alone).

### The Rhizomorph alone

10 battles on Bogwater Hollow each, mono Rhizomorph Tunnel as the player:

| Against | Settings | Wins | Rhizomorphs that surfaced and died | Median life after surfacing | Surfaced inside turret range |
|---|---|---|---|---|---|
| `bot:balanced` | `rhizomorph` | 0 / 10 | 355 | 2.5 s | 229 (65%) |
| `bot:balanced` | `rework` | 1 / 10 | 475 | 4.8 s | 275 (58%) |
| mono Gill Nest | `rhizomorph` | 0 / 10 | 140 | 3.8 s | 10 |
| mono Gill Nest | `rework` | 0 / 10 | 860 | 7.8 s | 0 |

- **Against a mixed army, it dives onto turrets.** `bot:balanced` fields few archers, so its nearest target is a spawner behind the front. Those stand in or near the enemy's home, inside the Heartcap turrets' 9 tiles, and it dies in a few seconds.
- **Against the archer mass, it reaches the archers** (it surfaces in its own half, where they are) **but alone.** The full package doubles its life: pinning slows the archers next to it, and waves bring several up at once.

### `rework`: G4, engagement and runs

`npm run experiment -- --proto rework --checks g4,engagement,runs --commander all --power-policy auto`, beside the same command on today's rules.

**G4** (`bot:balanced` against the scripted general, Bogwater, 40 seeds): today 7:13 median, 10% Decisions, bot wins 55% (pass). Under `rework`, **8:51, 33% Decisions, bot wins 20%: it fails all three.**

**Engagement** (`bot:balanced` with each commander and its power on auto, 30 seeds per general on Bogwater). Each cell is scripted / Old Mother Mold / Lichen Baron / Blightwright.

| Commander | Rules | Player wins | Decisions | Median length | First flip | Player supply at 5:00 | Merges |
|---|---|---|---|---|---|---|---|
| Vesper | today | 80 / 47 / 87 / 80% | 0 / 3 / 3 / 0% | 5:50 / 6:19 / 6:51 / 5:42 | 1:40 / 1:09 / 0:34 / 0:34 | 23 / 21 / 24 / 28 | 26 / 39 / 18 / 10 |
| Vesper | `rework` | 83 / 40 / 77 / 70% | 7 / 13 / 30 / 3% | 6:13 / 6:21 / 8:46 / 5:53 | 1:32 / 1:22 / 3:03 / 2:02 | 36 / 32 / 36 / 39 | 41 / 62 / 46 / 29 |
| Armilla | today | 67 / 70 / 83 / 60% | 0 / 3 / 0 / 0% | 6:23 / 6:04 / 5:58 / 5:34 | 1:15 / 1:07 / 0:34 / 0:34 | 28 / 31 / 30 / 27 | 29 / 40 / 14 / 12 |
| Armilla | `rework` | 90 / 43 / 83 / 53% | 13 / 3 / 57 / 13% | 7:30 / 6:56 / 10:00 / 6:29 | 1:12 / 1:04 / 2:02 / 1:42 | 46 / 43 / 40 / 41 | 60 / 86 / 46 / 26 |
| Cordis | today | 43 / 20 / 70 / 60% | 0 / 7 / 3 / 3% | 6:59 / 6:08 / 7:04 / 5:48 | 1:16 / 1:12 / 0:34 / 0:34 | 24 / 24 / 24 / 26 | 38 / 40 / 23 / 15 |
| Cordis | `rework` | 57 / 13 / 67 / 50% | 23 / 17 / 57 / 20% | 8:59 / 6:46 / 10:00 / 7:06 | 2:34 / 1:22 / 2:43 / 2:22 | 42 / 36 / 38 / 41 | 87 / 84 / 54 / 44 |

- **Battles get slower and bigger.** The front moves later, armies on the field are 30–75% bigger at 5:00, and merges roughly double (a wave comes out together, idle). Against the defensive Lichen Baron, 30–57% of battles go to a Decision.
- **The cliff is unchanged.** The loser's Heartcap still falls 9–27 s after its first hit, the winner's is untouched in 360 of 360 battles, and there are no comebacks.
- **Player commands per minute fall** from 2.6–3.7 to 1.8–2.8, because the bot no longer holds.

**Runs** (80 per commander, auto power):

| Commander | Rules | Reached the boss | Won | Ended in battle 1 | Boss fights won | Battle minutes per run |
|---|---|---|---|---|---|---|
| Vesper | today | 31 (39%) | 22 (28%) | 24 (30%) | 22 of 31 | 15.5 |
| Vesper | `rework` | 27 (34%) | 27 (34%) | 25 (31%) | 27 of 27 | 15.8 |
| Armilla | today | 25 (31%) | 17 (21%) | 29 (36%) | 17 of 25 | 14.5 |
| Armilla | `rework` | 29 (36%) | 25 (31%) | 22 (28%) | 25 of 29 | 18.3 |
| Cordis | today | 20 (25%) | 15 (19%) | 26 (33%) | 15 of 20 | 13.8 |
| Cordis | `rework` | 18 (23%) | 17 (21%) | 34 (43%) | 17 of 18 | 15.1 |

- **Runs won rise** from 54 to 69 of 240, mostly at the boss: 69 of 74 boss fights won, against 54 of 76.
- **Battle-1 losses don't move** (81 against 79 of 240).

**Tick cost** (G11 bench): 0.18 ms mean and 0.56 ms p99 under `rework`, against 0.17 and 0.50 ms today.

### What it suggests for P2

- **The package doesn't pass G3 as built.** It takes the archers from 86 / 100 to 74 / 83, a real drop but still a failure. It makes swarms dominant (Sporeling 94 / 98, Veilstalker 63 / 90), and it fails G4.
- **Waves carry both results.** They make swarms dominant and slow battles down. Pinning carries most of the archer gain. Call for help and clouds don't move the archers at 20 seeds.
- **The Rhizomorph needs a surfacing rule that avoids turret cover,** and probably company. Alone it never wins, and against a mixed army it surfaces under the enemy's turrets.
- **P2's one-piece-removed runs should start with waves.** Two things to separate: whether the swarm gain is waves itself or `bot:balanced`'s answer to it (try a Scythecap-heavy defender), and whether an AI that holds under waves changes it.
- These are 40-game cells (±8 points). The engagement and runs numbers come from one 30-seed or 80-run sample each.

### Questions for the user

Answered on 2026-10-30; [P1b](#combat-rework-p1b-2026-10-30) applies the answers.

1. **Waves form up at their buildings.** A wave starts staggered by building depth. Should it gather first? That would mean waiting on the field, which sank Hold. Or should deeper buildings release earlier, so the wave arrives together?
2. **Hold under waves skips one beat,** and can be renewed every beat after its 10 s cooldown, so a player can keep a lane's wave home indefinitely. Is that the timing verb you want, or should a hold cap at one or two beats? Should the AI hold under waves (it doesn't now)?
3. **A wave marches at its slowest unit's pace,** so a mixed wave crosses at Capguard or Rootbreaker speed while a mono swarm runs. It turned out not to cause the swarm result. Keep it?
4. **Should the Rhizomorph avoid turret range,** or prefer ranged units over spawners? Today it surfaces beside spawners in the enemy's home and dies to the turrets.
5. **Clouds stack,** and they hurt armored builds more than archers. Is that the intended role? Should clouds also slow, or keep units from merging?
6. **`aiWeight` reaches every non-mono bot,** including P0's pair bots, under `rhizomorph`. Should hand-written test bots opt out?

## Combat rework P1b (2026-10-30)

P1b re-aims the [combat rework](ideas/combat-rework.md) at swarms and at making mixed armies viable, since P0 found that on today's rules [mono archers have answers](#counter-matrix-on-todays-rules-2026-10-30). It applies the user's answers to P1's questions and adds one setting, `mixedWave`. Built on `feature/combat-rework` after merging `develop` (the rework doc) and P0's `feature/counter-matrix`. **Nothing is adopted.** Every setting stays default-off, and the goldens are unchanged.

### What changed

| Setting | P1 | P1b |
|---|---|---|
| `waves`: forming up | Every spawner releases on the beat at its own door, so a wave starts staggered by building depth | A lane's frontmost spawner releases on the beat. Each spawner behind it releases early by its walk to that door, so the wave passes the front door together on the beat. Nothing waits on the field |
| `waves`: Hold | Skips the lane's next beat; renewable every beat after the 10 s cooldown | Skips one beat. The beat spends the hold, and the lane can't hold again until the next beat has sent both waves. The AI still never holds |
| `sporecloud`: aim | The Mortar fires at the nearest enemy, unit or building | The Mortar aims each shell at the enemy unit in its firing band with the most enemy units inside a cloud centred on it |
| `rhizomorph`: surfacing | The nearest enemy ranged unit or spawner behind the front | The nearest enemy ranged unit; else a spawner behind the front. It skips any that an enemy tower or Heartcap turret covers, and falls back to the front |
| Test bots | Every non-mono bot bought the Rhizomorph Tunnel (`aiWeight`) | A bot with `fixedWeights` buys only what it lists. The counter check sets it on every pair and hand-written answer |
| `mixedwave` (new) | – | When a lane's wave holds 3+ unit types (a merged form counts as its base type), each of its units sets out with a shield worth 20% of its max HP. The preset includes `waves` |
| `rework` | All five settings | All six: `mixedWave` joined because it helped the mixed army ([below](#g3-at-50-seeds-the-rework-variants)). "The five" below means `pinned,callforhelp,sporecloud,rhizomorph,waves` |

The display follows: shield bubbles that fade as the shield wears down, the HP line in the inspect panel, the beat tip's next-wave unit types per lane, a "Mixed wave: shields up" callout, and hold texts for the one-beat cap.

### Judgment calls

- **Waves, forming up:**
  - **The form-up point** is each lane's frontmost spawner door (per side).
  - **The early release** is the walk from a spawner's door to that door at the wave's pace. With `matchPace`, the pace is the slowest tier-1 unit any spawner in the lane makes, even one with nothing waiting; without it, each unit's own speed. It's capped at a beat less one tick.
  - **Units that leave early** march at that pace until the beat, then pace matching works as before.
  - **Rhizomorph Tunnels** release on the beat and don't count for the front or the pace: their units tunnel instead of marching.
  - **A spawner releases once per beat.** A unit that spawns after its spawner's release moment waits for the next beat, even if this beat hasn't come yet.
- **Hold under waves:**
  - A hold keeps home whatever hasn't left when it's placed. Units that already left early keep going.
  - Advancing before the beat lets held units out at once, behind their wave.
  - After a held beat, Hold reopens one tick after the next beat (`readyAt`), so at most every other wave of a lane is kept home.
- **The Mortar's aim:**
  - It re-aims as each shell is about to fire. Units only, counting bodies inside the cloud's radius as a cloud does. Ties go to the nearer unit, then the lower id.
  - With no enemy unit in its band, it keeps its usual target (a building or the Heartcap). Burrowed units don't count.
- **The Rhizomorph's cover rule:**
  - "Covered" means inside an enemy tower's firing band (a Mortar can't hit a unit hugging it) or a Heartcap turret's 9 tiles, checked at the target's position.
  - Ranged units come first at any depth: the turret check is what keeps it near the front.
  - If every target is covered, it surfaces at the front rather than waiting underground.
- **Test bots:** the data bots (`balanced`, `rush`, `turtle`, `greedy`, `slayer`, `adaptive`) still buy the Tunnel, as P1 asked for `bot:balanced`. `fixedWeights` is the one change in P0's files (`counterBots`).
- **The mixed wave's shield:**
  - **When:** granted on the beat, when the wave's last spawner releases. It goes to every living unit of that wave in that lane: early leavers, Rhizomorphs and units already fighting. Types are counted among the same units.
  - **How much:** 20% of max HP, rounded.
  - **What breaks it:** it soaks every kind of damage first (hits, splash, spore clouds and power bursts). It never decays or regrows, and healing doesn't restore it.
  - **Merges:** a merge keeps the trio's total shield in proportion to the merged unit's max HP, as it does their HP.
  - **No shield** for units a sold or destroyed spawner lets out.
  - **It needs `waves`:** `mixedWave` without `waves` compiles to nothing.
- **What the variants mean:** "each change alone" is the change on today's rules. "`pinned` stays in every variant" is read as every `rework` variant.

### G3 at 50 seeds: the rework variants

From the counter check's G3 (`--checks counters --g3seeds 50`), and `--checks g3 --g3seeds 50` for the pace-off columns (`waves.matchPace:false`). Mean / worst map, with Bogwater / Stumpfield / Twin Roots for Gill Nest; bold fails a limit (mean ≤ 55, worst ≤ 60). All P1b versions; `pinned` is on in every column but Today.

| Mono bot | Today | The five | `rework` (the five and `mixedwave`) | The five without waves | The five, pace off | `rework`, pace off |
|---|---|---|---|---|---|---|
| Gill Archer Nest | **88 / 100** (100/100/63) | **68 / 79** (79/77/48) | **59 / 67** (67/66/44) | **80 / 95** (95/95/49) | **65 / 79** | **62 / 76** |
| Sporeling Burrow | **74 / 77** | **96 / 99** | **95 / 98** | **77 / 83** | **96 / 98** | **93 / 97** |
| Veilstalker Hollow | 41 / 51 | **54 / 76** | 51 / **75** | 38 / 45 | 52 / **73** | 48 / **68** |
| Morel Warren | 55 / 57 | **58 / 68** | 55 / **65** | **63 / 63** | 51 / 58 | 46 / 56 |
| Amanita Lodge | 51 / **64** | 40 / 46 | 36 / 39 | 55 / **66** | 32 / 34 | 29 / 34 |
| Capguard Hall | 39 / 49 | 36 / 41 | 32 / 39 | 42 / 49 | 43 / 46 | 35 / 39 |
| Rootbreaker Den | 28 / 53 | 26 / 30 | 24 / 27 | 30 / 55 | 25 / 28 | 24 / 24 |
| Scythecap Grove | 30 / 42 | 22 / 35 | 19 / 28 | 35 / 48 | 22 / 28 | 22 / 27 |
| Hammercap Forge | 24 / 28 | 19 / 25 | 15 / 20 | 31 / 40 | 23 / 30 | 18 / 24 |
| Puffball Mortar | 6 / 9 | 3 / 5 | 3 / 5 | 16 / 25 | 10 / 14 | 10 / 13 |
| Rhizomorph Tunnel | – | 10 / 19 | 9 / 17 | 4 / 6 | 5 / 7 | 5 / 8 |

- **Waves make mono Sporeling unbeatable for `bot:balanced`:** 93–99% in every variant with waves, pace matching on or off.
- **`mixedwave` helps the mixed army against slower builds:** Gill Nest 68 → 59, Veilstalker 54 → 51, Morel 58 → 55, Amanita 40 → 36. It doesn't help against the swarm (96 → 95). With G4 passing too ([below](#g4)), it joined `rework`.
- **Pace matching barely matters:** off, Sporeling stays at 93–96 and the others move by 3–8 points.
- **Without waves,** the package leaves Sporeling near today's 74 (77 / 83) and the archers at 80 / 95.
- **No variant passes G3,** at 20 seeds or 50, so P2's other checks (G1–G2, G5–G8, engagement and runs) weren't run.

### Each change alone

G3 at 50 seeds per seat, from each change's counter check; `pinned` and `callforhelp` didn't change in P1b ([P1's table](#g3-each-setting-alone-and-all-five)). Mean / worst map.

| Mono bot | Today | `waves` | `mixedwave` | `sporecloud` | `rhizomorph` |
|---|---|---|---|---|---|
| Gill Archer Nest | **88 / 100** | **87 / 95** | **83 / 91** | **88 / 100** | **90 / 100** |
| Sporeling Burrow | **74 / 77** | **94 / 96** | **92 / 96** | **69 / 76** | **78 / 89** |
| Veilstalker Hollow | 41 / 51 | 54 / **69** | 48 / **64** | 34 / 47 | 46 / 57 |
| Morel Warren | 55 / 57 | 49 / 56 | 43 / 53 | 51 / 52 | 54 / 55 |
| Amanita Lodge | 51 / **64** | 44 / 49 | 38 / 44 | 45 / **62** | 54 / **65** |
| Capguard Hall | 39 / 49 | 43 / 52 | 32 / 38 | 29 / 39 | 38 / 47 |
| Puffball Mortar | 6 / 9 | 0 / 1 | 0 / 1 | 14 / 21 | 8 / 13 |
| Rhizomorph Tunnel | – | – | – | – | 7 / 14 |

Against P1's versions (G3 at 20 seeds, both screens on the same seeds):
- **Staggered waves help against archers, not swarms.** Mono Gill Nest 93 / 98 → 85 / 92, and Twin Roots 88 → 72. Mono Sporeling 90 / 98 → 93 / 95.
- **The Mortar's aim doesn't move G3** (Gill Nest 87 / 100 both times): `bot:balanced` rarely builds Mortars. It shows in the counter matrix.
- **The Rhizomorph's cover rule** takes mono Rhizomorph from 0% to 10% (7% at 50 seeds), but it is still the weakest mono build.

### The counter matrix, against the strict bar

`npm run experiment -- --proto <spec> --checks counters --g3seeds 50 --top 5`, with today's rules run the same way for the baseline. Strict bar: every mono build with a G3 mean above 40% needs an answer that wins ≥ 60% on every map. Each cell is the best confirmed answer by its worst map, among answers that don't fail G3 themselves (Bogwater / Stumpfield / Twin Roots, 100 games per map). A dash: the build's G3 mean is 40% or less, so it isn't tested.

| Rules | Mono Sporeling | Mono Gill Nest | Mono Veilstalker | Mono Amanita | Mono Morel | Mono Capguard | Strict bar |
|---|---|---|---|---|---|---|---|
| Today | `d1-amanita` 57 / 70 / **45** | `counter-rush` 81 / 76 / 86 | Sporeling + Gill Nest 100 / 100 / 84 | Hammercap + Amanita 100 / 100 / 82 | Veilstalker + Amanita 98 / 100 / 95 | – | fails Sporeling |
| The five | mono Capguard 65 / 64 / **43** | Sporeling + Amanita 100 / 97 / 90 | `turtle` 88 / 93 / 93 | – | Sporeling + Veilstalker 100 / 100 / 99 | – | fails Sporeling |
| `rework` | mono Capguard 65 / 64 / **43** | Sporeling + Amanita 100 / 97 / 90 | `turtle` 94 / 95 / 92 | – | Sporeling + Veilstalker 100 / 100 / 99 | – | fails Sporeling |
| The five without waves | Sporeling + Veilstalker 58 / 58 / **45** | `counter-rush` 88 / 87 / 96 | – | Amanita + Morel 96 / 95 / 82 | Veilstalker + Amanita 100 / 99 / 97 | Gill Nest + Morel 100 / 100 / 99 | fails Sporeling |
| `waves` | mono Capguard 60 / 71 / **44** | `d1-sporeling` 96 / 95 / 79 | Gill Nest + Amanita 97 / 97 / 91 | mono Rootbreaker 100 / 100 / 100 | Sporeling + Veilstalker 100 / 100 / 99 | Gill Nest + Scythecap 100 / 100 / 98 | fails Sporeling |
| `mixedwave` | mono Capguard 60 / 71 / **44** | `d1-sporeling` 96 / 95 / 79 | Gill Nest + Amanita 97 / 97 / 91 | – | Sporeling + Veilstalker 100 / 100 / 99 | – | fails Sporeling |
| `sporecloud` | `d1-amanita` 57 / 70 / **45** | `counter-rush` 81 / 76 / 86 | – | Hammercap + Amanita 100 / 100 / 82 | Veilstalker + Amanita 98 / 100 / 95 | – | fails Sporeling |
| `rhizomorph` | `d1-amanita` 57 / 70 / **45** | `counter-rush` 81 / 76 / 86 | Sporeling + Gill Nest 100 / 100 / 84 | Hammercap + Amanita 100 / 100 / 82 | Veilstalker + Amanita 98 / 100 / 95 | – | fails Sporeling |

Mono Sporeling's best answer on the mean (P0's proposed rule):

| Rules | Best on the mean | Bogwater / Stumpfield / Twin Roots | Mean rule |
|---|---|---|---|
| Today | `turtle` | 77 / 86 / 21 | ok (61) |
| The five, `rework`, `waves`, `mixedwave` | mono Capguard | 60–65 / 64–71 / 43–44 | **fails** (57–58) |
| The five without waves | `turtle` | 73 / 85 / 36 | ok (65) |
| `sporecloud` | `turtle` | 85 / 91 / 38 | ok (71) |
| `rhizomorph` | `turtle` | 77 / 79 / 22 | **fails** (59) |

- **Every strong build except mono Sporeling keeps a clean answer** under every variant.
- **Mono Sporeling fails the strict bar everywhere, today included,** and always on Twin Roots: no answer wins more than 45% there.
- **Waves take away even the mean-rule answer.** With waves, no answer to mono Sporeling reaches 60% on the mean (best 57–58%), and the Mortar-backed `turtle` falls from 61 to 44–48.
- **The Mortar's new aim answers the swarm on one-lane maps.** Under `sporecloud`, `turtle` beats mono Sporeling 85% and 91% there, and Mortar + Veilstalker 81% and 92%, against 77 / 86 today. On Twin Roots they win 14–38%.
- **The test bots' opt-out works.** Under `rhizomorph` the counter bots play exactly today's games (identical cells), while `bot:balanced` and the data bots buy Tunnels.

### G4

`--checks g4`: `bot:balanced` against the scripted general on Bogwater, 40 seeds. Targets: median 5:30–8:30, Decisions ≤ 15%, bot wins 30–70%.

| Rules | Median | Decisions | Bot wins | G4 |
|---|---|---|---|---|
| Today | 7:13 | 10% | 55% | pass |
| The five | 8:42 | 23% | 40% | **fail** |
| `rework` | 8:12 | 15% | 43% | pass |
| The five without waves | 7:27 | 23% | 48% | **fail** |
| The five, pace off | 9:00 | 28% | 43% | **fail** |
| `rework`, pace off | 8:39 | 23% | 50% | **fail** |
| `waves` | 8:13 | 18% | 38% | **fail** |
| `mixedwave` | 7:51 | 13% | 43% | pass |
| `sporecloud` | 7:49 | 25% | 50% | **fail** |
| `rhizomorph` | 6:51 | 5% | 43% | pass |

- **Clouds make Decisions common:** 25% alone. Waves add length.
- **`rework` passes on the edge** (15% Decisions, the limit). The cells are ±6 points.

### Two leads beyond the brief

**The beat length trades archers for swarms.** `rework` (then the five) with other beats, G3 at 20 seeds (±8 points), mean / worst:

| Beat | Gill Nest | Sporeling | Veilstalker | Morel | Amanita | Capguard |
|---|---|---|---|---|---|---|
| 10 s | **96 / 100** | 38 / 57 | 5 / 8 | 21 / 38 | – | – |
| 13 s | **88 / 98** | 45 / 50 | 9 / 12 | 28 / 38 | 47 / 52 | 32 / 42 |
| 15 s | **84 / 98** | 55 / **62** | 17 / 30 | 39 / 50 | 47 / 57 | 34 / 48 |
| 17 s | **80 / 92** | **73 / 85** | 22 / 32 | 35 / 50 | 38 / 42 | 41 / 50 |
| 20 s (P1b) | **68 / 78** | **97 / 98** | **56 / 82** | **58 / 68** | 37 / 42 | 40 / 48 |
| 30 s | 41 / 45 | **98 / 100** | **85 / 100** | **75 / 85** | – | – |

- **Short beats feed archers; long beats feed swarms and runners.** No beat passes both Gill Nest and Sporeling against `bot:balanced`. Sporeling jumps between 17 and 20 s (73 → 97).
- A beat near 15 s is the closest to balanced in this table.

**Why mixed waves can't help against the swarm.** Under `rework`, 6 seeds a map, `bot:balanced` against each mono bot:

| Against | Map | `bot:balanced`'s lane waves with 3+ types |
|---|---|---|
| mono Sporeling | Bogwater / Stumpfield / Twin Roots | 6% / 11% / 8% |
| mono Gill Nest | Bogwater / Stumpfield / Twin Roots | 34% / 32% / 7% |

It loses to the swarm before it fields three unit types. On Twin Roots it splits its army over two lanes, so a lane's wave rarely holds three.

### What it suggests

- **Waves at a 20 s beat are the problem.** In every variant with them, mono Sporeling beats `bot:balanced` 92–99% and has no answer above 58% even on the mean. Without waves, the gap is today's: mono Sporeling on Twin Roots.
- **The P1b fixes work as designed, but none of them reaches the swarm:**
  - staggered release brings the archers down under waves;
  - the Mortar's aim answers swarms on one-lane maps;
  - the Rhizomorph stops diving into turrets;
  - mixed waves help a mixed army that lives long enough to be mixed.
- **Twin Roots is where mono Sporeling escapes every answer**, today and in every variant. That looks like a map or lane-AI question as much as a rules one: `bot:balanced` splits over the two lanes, and the answers that work on one lane (Capguards behind Mortars) don't.
- **If waves stay, the beat is the dial to test next:** 15–17 s with the counter matrix, since G3 alone can't tell a beat that makes swarms answerable from one that just makes archers strong again.

### Questions for the user

1. **Waves at 20 s make mono Sporeling unanswerable.** Keep waves and test a 15–17 s beat (archers come back), or take waves out of the package?
2. **Mono Sporeling on Twin Roots has no answer in any variant, today included.** Treat it as a map or lane-AI problem outside the rework, or keep it in the rework's bar?
3. **Mixed waves need three unit types per lane,** which a mixed army reaches in under a tenth of its waves against a swarm. Lower it to two types, or count a side's whole wave instead of a lane's?
4. **Clouds push G4's Decisions to 25% alone.** Accept that while clouds are tuned, or have the Mortar's aim prefer units nearer the front?

### Commands

- G3 screens (20 seeds): `npm run experiment -- --proto <spec> --checks g3 --g3seeds 20`.
- Counter matrix with G3 at 50 seeds: `npm run experiment -- --proto <spec> --checks counters --g3seeds 50 --top 5`. About 5–11 minutes a variant on 10 workers.
- G4: `npm run experiment -- --proto <spec> --checks g4`.
- Specs: the five are `pinned,callforhelp,sporecloud,rhizomorph,waves`; without waves, `pinned,callforhelp,sporecloud,rhizomorph`; pace off adds `waves.matchPace:false`; beats add `waves.beatSeconds:<n>`.
