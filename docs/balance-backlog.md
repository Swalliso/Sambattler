# Balance solutions backlog

Candidate solutions discussed on 2026-10-27. These are untested design hypotheses, not approved balance changes. Track player observations in [playtest feedback](playtest-feedback.md) and measured changes in the [balance changelog](../data/CHANGELOG-balance.md).

## Archer spam and forward building (F1, F2, G3)

The current failure has two reinforcing causes: ranged survivors accumulate while isolated melee reinforcements die on approach, and ranged building damage halves the defender's production. Prior scalar tuning, stronger Mortars, turret changes, synchronized spawning, and mustering have not solved G3. Mustering plus Pierce resistance still left mono Gill Nest at 85–90%; see the [prior experiments](../data/CHANGELOG-balance.md#open-g3-mono-gill-nest).

| ID | Candidate | Intended effect | Main risk | Status |
|---|---|---|---|---|
| B1 | Sporeling approach rush: a short automatic rush on engagement, followed by a cooldown; retain nearest-enemy targeting so frontline troops can intercept | Let the intended archer counter reach contact and force archer losses; give archers a reason to have a screen | Sporeling spam could replace archer spam; Capguards must remain a reliable answer | Backlog: first prototype candidate |
| B2 | Close pressure required for production suppression: arrows still damage buildings, but half-speed production requires an enemy within roughly 1–2 tiles | Break ranged production starvation, strengthen the siege role, and make forward forts more useful | Stronger turtling and longer endings; does not solve open-field archer scaling on its own | Prototyped 2026-10-27 as `besiegedBy` in `balance.json` (default `all`; selling stays locked under any damage). See below |
| B3 | Firing congestion: limit efficient firing ranks or reduce access to targets when friendly ranged formations crowd a firing corridor | Stop every additional archer contributing full immediate damage from a deep formation; encourage mixed armies | More movement logic, readable blocked-fire feedback, and lane-width sensitivity | Backlog: larger combat redesign if B1/B2 are insufficient |
| B4 | Finite unit lifespan: a generous, clearly displayed lifetime before fungal troops wither | Prevent indefinite accumulation and make shorter travel from forward spawners valuable | Broad change to army persistence; slow units, merging and defensive stalemates need attention | Backlog: alternative direction for the game's identity |

## Proposed evaluation

1. Prototype B1 and B2 separately to measure each causal effect, then test their combination. Mustering may support them, but is not sufficient by itself according to existing experiments.
2. Exercise sustained reinforcements and 12-, 30- and 60-supply fights. Check whether Sporelings reach contact and kill archers, and whether defenders keep producing under ranged pressure.
3. Preserve the intended Sporeling → Archer → Capguard → Sporeling relationships. Check mixed armies, both seats, merging and upgrades, rather than accepting a win against one reference bot alone.
4. Run G1–G7, battle-length/Decision checks, and forward-building playtests. G3 remains the existing mono-strategy acceptance check; another mono strategy taking over is a failure.

No archer-balancing candidate is implemented by the review-fixes PR. The five correctness fixes are separate from these experiments.

## Adaptive general and G8 (M4)

Recorded on 2026-10-27 after M4. G8 fails against the Lichen Baron (details and diagnosis in [the M4 plan](m4-plan.md#g8-in-detail-npm-run-testslow-the-lichen-baron-30-seeds-mono-bot-as-the-player)). Each candidate changes §7.4 behavior, so none is implemented.

| ID | Candidate | Intended effect | Main risk | Status |
|---|---|---|---|---|
| A1 | Read merging harder: raise the Elite score multiplier (1.2) or the Swarm discount (0.5) | A merge-heavy Sporeling swarm reads Elite and gets Slayers instead of Capguards that Bloomed Sporelings beat | Ordinary merging armies get Slayer counters too | Prototyped 2026-10-27, not adopted: the read flips as intended (×3: Elite in 18 of 60 cycles against mono Sporeling, ×4: 22), but the Baron has no Veilstalker weight, so mono Sporeling still wins 33–37% against him (off: 23%). Even with Veilstalker weight 1 it wins 30–33%. G8 unchanged at every setting (×2, ×3, ×4, ×2 with discount 1.0); `bot:balanced` 47–53%. G7 can't move: bots don't analyse (58% / 50%, identical) |
| A2 | Floor weight for counter-set buildings when a counter activates (e.g. 1 before the ×3) | Single-battle generals can field counters outside their §11.11 weights (the Baron's Scythecaps, Veilstalkers) | Blurs the generals' personalities | Backlog |
| A3 | An earlier first cycle (e.g. 1:30 → 3:30) | Counters land before rushes (mono Rootbreaker routs the Baron by 4:00–5:00) | Less telegraph time; the spec's warning lead is 2 waves | Backlog |

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

