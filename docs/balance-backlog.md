# Balance solutions backlog

Candidate solutions discussed on 2026-10-27. These are untested design hypotheses, not approved balance changes. Track player observations in [playtest feedback](playtest-feedback.md) and measured changes in the [balance changelog](../data/CHANGELOG-balance.md).

## Archer spam and forward building (F1, F2, G3)

The current failure has two reinforcing causes: ranged survivors accumulate while isolated melee reinforcements die on approach, and ranged building damage halves the defender's production. Prior scalar tuning, stronger Mortars, turret changes, synchronized spawning, and mustering have not solved G3. Mustering plus Pierce resistance still left mono Gill Nest at 85–90%; see the [prior experiments](../data/CHANGELOG-balance.md#open-g3-mono-gill-nest).

| ID | Candidate | Intended effect | Main risk | Status |
|---|---|---|---|---|
| B1 | Sporeling approach rush: a short automatic rush on engagement, followed by a cooldown; retain nearest-enemy targeting so frontline troops can intercept | Let the intended archer counter reach contact and force archer losses; give archers a reason to have a screen | Sporeling spam could replace archer spam; Capguards must remain a reliable answer | Backlog: first prototype candidate |
| B2 | Close pressure required for production suppression: arrows still damage buildings, but half-speed production requires an enemy within roughly 1–2 tiles | Break ranged production starvation, strengthen the siege role, and make forward forts more useful | Stronger turtling and longer endings; does not solve open-field archer scaling on its own | Backlog: first prototype candidate |
| B3 | Firing congestion: limit efficient firing ranks or reduce access to targets when friendly ranged formations crowd a firing corridor | Stop every additional archer contributing full immediate damage from a deep formation; encourage mixed armies | More movement logic, readable blocked-fire feedback, and lane-width sensitivity | Backlog: larger combat redesign if B1/B2 are insufficient |
| B4 | Finite unit lifespan: a generous, clearly displayed lifetime before fungal troops wither | Prevent indefinite accumulation and make shorter travel from forward spawners valuable | Broad change to army persistence; slow units, merging and defensive stalemates need attention | Backlog: alternative direction for the game's identity |

## Proposed evaluation

1. Prototype B1 and B2 separately to measure each causal effect, then test their combination. Mustering may support them, but is not sufficient by itself according to existing experiments.
2. Exercise sustained reinforcements and 12-, 30- and 60-supply fights. Check whether Sporelings reach contact and kill archers, and whether defenders keep producing under ranged pressure.
3. Preserve the intended Sporeling → Archer → Capguard → Sporeling relationships. Check mixed armies, both seats, merging and upgrades, rather than accepting a win against one reference bot alone.
4. Run G1–G7, battle-length/Decision checks, and forward-building playtests. G3 remains the existing mono-strategy acceptance check; another mono strategy taking over is a failure.

No archer-balancing candidate is implemented by the review-fixes PR. The five correctness fixes are separate from these experiments.
