# Balance changelog

Every change from the SPEC's first-pass numbers, with the guardrail or verification result that
motivated it. Tools: `npm run balance -- duel`, `npm run balance -- tournament`, `npm run test:slow`.

## Milestone 1 (2026-10-25)

### Territory capture
- `captureSeconds` 3.0 → **2.0**, `captureDecayMult` 2 → **0.5**.
  Units only *walk through* their own frontier column on the way to mid-field fights, so with 2×
  decay a column almost never flipped behind an advancing army; the side being pushed back
  (whose units fight next to its own border) gained ground instead. Baseline over 40 seeds
  (balanced vs scripted): median 9:11, 35% Decisions. After: median 7:37, 13% Decisions, and fronts
  follow the winning army.

### Units and buildings (G1 production duels, G2 supply duels)
Baseline: G1 failed (Sporeling Burrow won no pairing; Capguard Hall and Gill Nest never lost clearly)
and G2 failed (Rootbreaker beat every unit; Gill Archer beat none).
- Sporeling `hp` 60 → **72** (archers now need 6 hits, not 5), `speed` 1.3 → **1.5**.
- Capguard `speed` 0.9 → **0.75** (more time under Gill Archer fire).
- Gill Archer `hp` 90 → **110** (Capguards now need 6 hits, not 5). Damage kept at 14: at 15 an
  archer kills a Sporeling in 4 hits and Sporeling > Gill Archer collapses.
- Rootbreaker `hp` 520 → **460**, `damage` 30 → **28** (still ×2 siege, ×1.5 crush vs structure).
- Rootbreaker Den spawn `interval` 24 → **20** s.
Result: G1 PASS; G2 PASS with every intended §11.4 edge held in 4–5 of 5 seeds
(Capguard > Sporeling, Gill Archer > Capguard, Sporeling > Gill Archer, Gill Archer > Rootbreaker,
Capguard > Rootbreaker, Rootbreaker > Sporeling).
Value check (§11.4, sanity only): Burrow 1.71, Capguard 1.48, Gill 1.53, Rootbreaker 1.56.

### Heartcap turrets and the Sporestorm (G4 length, G5 snowball, G6 comeback)
- Turret `range` 7 → **9**. Ranged units sieged home-front buildings from outside turret reach
  (archers stand ~9 tiles from the Heartcap edge), which made early leads self-reinforcing:
  G5 (+150 gold) was 83–88%. After: 68%.
- Sporestorm `startSeconds` 300 → **240**, `heartcapTakenPerStack` 0.10 → **0.20**, to keep battle
  length in band after the stronger turrets. G4: median 8:02, 13% Decisions, bot wins 48%.

### Moved into data (values unchanged)
- `loamBonus` 0.5 and the §7.2–7.3 AI heuristics (pressure window, threat radius, situational
  multipliers and placement score weights) now live in `balance.json`.

### Open: G3 (mono Gill Nest)
`script:mono:gillNest` wins ~100% against `script:balanced` (target ≤ 55%). Not fixed by data: range
4.5 → 3, damage down to 6, HP, aggro, speed, supply, turret reach 9–10, stronger Mortars, Burrow batch
size and several reference-bot mixes all leave it at 78–100%; only a near-halving of Gill Nest output
(interval 15 → 28 s) reaches 50%, and every such nerf breaks G1 (Capguard Hall then never loses) and
pushes mono Capguard above 55%. Mechanism: ranged units win every trickle skirmish, never trade, and
accumulate to the supply cap, while a mixed army never fields its counter (Sporelings) in bulk.
Raised with the user as a rules question.

**Diagnosis** (instrumented mono Gill Nest vs `script:balanced`, all prototypes reverted):
- Production suppression: archers besiege home-front buildings from x≈22.7, just outside turret
  reach 9 (x ≥ 23). The defender's spawners are besieged 36% of the time and ~7 buildings fall per
  battle, so it fields ~50 units per battle against archer spam versus ~220 against Capguard spam.
  Turrets still kill most archers (42 of 62 per battle); the defending army kills few.
- Trickle fights: every building spawns on its own timer, so defenders walk out one or two at a
  time and die in their own half 5–10 s after spawning. Melee crossing ~5 tiles under fire from two
  or more archers dies before it swings.
- Archers are the only reliable way to break a defended home: nerfing the Gill Nest enough to matter
  (interval 22–24 s) stalls G4 (median ~9:40, 30–50% Decisions).
- Counters that are narrow at 12 supply become blowouts at 60 (Lanchester square law: every archer
  fires, only the front melee row swings). Supply-duel margins at 60 supply each: Sporeling > Gill
  Archer +8, Gill Archer > Capguard +39, Gill Archer > Rootbreaker +46, Capguard > Sporeling +40,
  Capguard > Rootbreaker +8, Rootbreaker > Sporeling +30. For a uniform mix to hold against every
  mono strategy, Sporeling > Gill Archer must be the largest margin (c = a + b, a = d + e, f = b + e
  with a = Ga>Ca, b = Ga>Ro, c = Sp>Ga, d = Ca>Sp, e = Ca>Ro, f = Ro>Sp); today it is the smallest.

**Prototypes that helped but did not fix it:**
- Mustering (units wait at their own frontier until ≥ 8 supply has gathered or 15 s pass, then
  march together; a change to §5.2 "units always advance"): G4 median 6:11–6:49 with 0–10%
  Decisions, G5 ~50–60%. Mono Gill Nest stays 85–100%, mono Rootbreaker rises to 50–100%.
- A per-unit damage-type resistance (not in the data model yet): Sporeling Pierce ×0.6 lifts
  Sporeling > Gill Archer to +31 at 60 supply; Capguard ×0.75 and Rootbreaker ×0.7 Pierce cut Gill
  Archer's wins to +19 and +33. Capguard > Sporeling stays +40. Best combination with mustering:
  mono Gill Nest 85–90%.

**No effect on G3:** Capguard or Rootbreaker resistance alone, heavy-armor Capguard, a cleave unit,
turret reach 10–12, turret damage type or splash, ranged damage falloff, archer pinning,
synchronised spawns, slash Mortar, balanced-bot mixes and openers, AI threat radius, and a head
start (+600 gold for the balanced bot reaches only 45%).

**Decision (2026-10-25): deferred.** The user chose not to change rules or rebalance yet, to see how
Milestone 2 (Scythecap Grove, Veilstalker Hollow, merging) changes the picture. Until then G3 is a
known failure in `npm run test:slow`. When it is picked up, the recommended order is: mustering (needs
the user's OK, as it changes §5.2), then a per-unit resistance field and an army-scale (60 supply)
check in G2, with G3 as the acceptance test.
