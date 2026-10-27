# Balance changelog

Every change from the SPEC's first-pass numbers, with the guardrail or verification result that
motivated it. Tools: `npm run balance -- duel`, `npm run balance -- tournament`, `npm run test:slow`.

## Review fixes (2026-10-27)

- A live building loses its full-refund entitlement when it first spawns units, earns gold, or
  fires. The 10 s grace period still covers unused placements, and deploy refunds remain 100%.
  This closes free-unit, free-income and free-shot placement/sale cycles. Normal refund relics
  still apply after production; units already spawned remain on the field.
- Run enemy kits now supply purchase weights for progression buildings absent from the original
  general profile. The boss can buy its seventh building (Scythecap Grove), so upgrades on that
  track are useful. Historical single-battle profiles and all unit/building numbers are unchanged.
- Compared 40 single battles (seeds 1–20 on Bogwater Hollow and Twin Roots) with the pre-fix build:
  identical gameplay fingerprints, including results, duration, spawns, damage, income and fronts.
  The slow suite still passes G1, G2, G4, G5, G6, G7 and G11; G3 still fails at 100% mono Gill Nest.
- Golden replay hashes were refreshed because `BuildingState.hasProduced` is now part of the
  deterministic state. M1/M2 replays have hash-only changes. M3 seed 7 also changes actual boss
  behavior: its first three battles retain their outcomes and lengths, but the boss now wins by
  Rout at tick 8102, where it previously lost at tick 6757. This difficulty change is the intended
  consequence of fixing the unusable boss kit; it is not an archer rebalance.
- Archer-balance candidates are recorded in [the solutions backlog](../docs/balance-backlog.md).
  No candidate is implemented by these fixes.

## Milestone 3 (2026-10-26)

The run loop: drafts, upgrade tracks (SPEC §11.6), 21 relics (§11.7 plus five new ones), events, the
Grove, Tender's Ring and two maps. **No M1 or M2 number changed.** 90 reference battles (bot:balanced
vs scripted ×40, the merge mirror ×20, mono Gill Nest ×20, comeback-6 ×10) give identical winners,
lengths, spawns, merges, gold, damage and front lines before and after M3; the golden updates in this
milestone are hash-only for single battles.

### New content, first-pass numbers
- Tender's Ring (180 gold, 450 HP, 1 Tender / 20 s) and the Tender (90 HP, heals 8 HP / 1 s, range
  2.5; Bloomed +0.5 range, Elder heals 2 targets): the spec's numbers. Mono Tender's Ring wins 3% vs
  `bot:balanced` (a healer can't fight alone). G1/G2 leave support spawners out of the combat duels.
- Upgrade tracks follow §11.6; the M2/M3 buildings use the same pattern (survivability → damage →
  signature). Relics follow §11.7; the five new ones are Hardy Spores, Root Stipend, Mending Moss,
  Bloom Vigor and Martyr's Bloom. Mycorrhizal Link's "15% faster" is spawn interval ×0.87.
- Draft constants (`draft` in balance.json) and the general's kit growth (`enemyKit`, §7.8) are the
  spec's numbers.

### Reference bots: unchanged (Tender's Ring tried and reverted)
Adding Tender's Ring at weight 1 to `bot:balanced` and its three twins reshuffled the bots' picks and
broke two guardrails that pass today: G4 Decisions 18% (limit 15%; win rate 53% → 45%, median 7:12 →
8:08) and the G7 mirror 54.5% over 200 games (floor 55%). The Slayer clause read 48% (limit 50%).
The reference bots keep their M2 weights, so G4 and G7 measure what they did before M3.

### Re-measure after M3 (G3, G7)
- `npm run test:slow`: only G3 fails, as before M3 (G1, G2, G4, G5, G6, G7, G11 pass).
- G3 with drafts on for both sides (greedy picks, Vesper's pool): mono Gill Nest **100%** vs
  `bot:balanced`; every other mono bot ≤ 38%. Drafts, upgrades and relics don't move archer spam.
- G3 against `bot:balanced` + Tender's Ring: mono Gill Nest still **100%**.
- G7 with Tender's Ring in the reference bots: mirror 54.5%, Slayer mirror 48.0% (above).

### Runs (SPEC §16 Milestone 3, verification 2)
`npm run sim -- --run --seeds 1..20 --player bot:balanced --auto-draft greedy --auto-route random`:
- With the kickoff stand-in (scripted general, full 8-building roster every battle) 10% of runs
  reached the boss: the player opens with a 3-building starter kit against 8 buildings and is routed
  in battle 1 in 12 of 20 runs.
- With §7.8 kit growth pulled into M3 (user's decision): **25%** of runs reach the boss on seeds 1–20
  and **29%** over 80 seeds (target ≥ 30%). Every run completes. Runs that reach the boss fight 4–5
  battles with 24–37 min of battle (inside both bands); runs that end early in defeat fight fewer
  (median 3 battles, 21.6 min), so "4–5 battles per run" and "22–38 min per run" hold only for runs
  that reach the boss. Early defeats are mostly battle-1 routs by the general's Sporeling swarm
  (opener Burrow + Cellar with merging) and elite battles.

### Twin Roots (SPEC §16 Milestone 3, verification 3)
`--map twin-roots --seeds 1..20 --flags merging`: median 7:50 (in the G4 band), 10% Decisions, but
lanes diverge (front midpoints ≥ 4 columns apart at some sample) in only **35%** of battles (target
≥ 50%; 53% on seeds 21–60). Four layouts (more stumps in each side's weak lane, extra loam) moved it
by at most 10 points: both AIs send new spawners to whichever lane is losing, which keeps the fronts
level. The original layout is kept; the lever is the AI's lane choice (§7.3), not the map.

## Milestone 2 (2026-10-25)

Merging (SPEC §5.5–5.6), Scythecap Grove and Veilstalker Hollow. Merging is on by default from M2
(feature flags follow the milestone); M1 golden replays pin `merging: false` and the M1 roster, and a
66-battle behaviour fingerprint confirmed M1 play is bit-identical with merging off.

### Scythecap (first-pass numbers kept)
G1: the Grove wins 2/5 pairings. G2: beats Sporeling and Veilstalker, loses to Gill Archer; the
intended edge Scythecap > Sporeling holds 5/5.

### Veilstalker and the slayer multiplier
First-pass Veilstalker (110 HP, 18 pierce, 1 per 16 s, slayer ×1.75) was ~1.7× the M1 units' value
per supply (§11.4: 42 vs 23–29) and 0.8× per gold (1.19 vs 1.45): it won every 12-supply duel
(G2 FAIL: loses to nothing) and no production pairing (G1 FAIL). Cutting it to a normal per-supply
value made it lose the intended edge to Bloomed Capguards (0/5): a Bloomed Capguard hits Light for
52.5 and soaks split fire, so square-law estimates overrate swarms of small slayers. The slayer
multiplier therefore carries the counter (picked from a sweep of 14 variants):
- Veilstalker `hp` 110 → **80**, `damage` 18 → **12**; Veilstalker Hollow spawns **2 per 18 s**
  (was 1 per 16 s).
- `tagMult.slayerVsElite` 1.75 → **3.0**; the Elder Veilstalker perk `slayerMult` 2.0 → **3.4** (it
  keeps its bump over the base multiplier).
Result: G1 PASS (the Hollow wins 1/5 pairings), G2 PASS. The Veilstalker beats Sporeling, Gill
Archer, Rootbreaker and every Bloomed unit but the Scythecap; base Capguards and Scythecaps (Slash vs
Light) beat it. So merging your Capguards opens a weakness to Slayers, and the answer to Slayers is
unmerged line troops. Value check: 6.67/min × sqrt(80 × 10.9) × 1.2 / 160 = 1.48 per gold.

### Reference bots
- `bot:balanced` builds the whole roster: + Scythecap Grove 2, Veilstalker Hollow 1. With the M1 mix
  and merging on, G4 had 19–20% Decisions and G5 was 74–80%; with the new mix G4 is median 8:17,
  13% Decisions, G5 64–70%.
- New G7 bots: `balanced-nomerge`, `slayer` (+Veilstalker Hollow 8: a 23–25% realised Slayer share)
  and `slayer-nomerge`.

### G3 (mono Gill Nest) after M2: unchanged
Mono Gill Nest still wins 100% against `bot:balanced` with merging on, with both the M1 reference
mix and the full-roster mix. Every other mono bot, including the new ones, stays ≤ 48% (mono
Scythecap Grove 15–20%, mono Veilstalker Hollow 3–8%). Still deferred (see Milestone 1).

### G7 (merging's edge): `tierStatMult` 2.5 → 2.8
G7 compares each bot with its own merge-off twin, both seats, so the merge toggle is the only
difference. (The second clause, "against an opponent with a 25% Slayer share", is measured as a
Slayer mirror: pitting merge-on against a different, Slayer-heavy bot mixed roster strength into the
result, since Slayer-heavy armies are weaker overall: merge-off `balanced` beats them 58–63%.)
- At ×2.5 merging was a near-neutral sidegrade in bot play: merge-on won 48% of the reference mirror
  over 120 games (target 55–70%). A Bloomed unit had ~83% of its parts' HP and damage (§5.5) and paid
  off mainly when the 60-supply cap bound, which bot armies rarely reach. Slayer mirror: 39–48%.
- Single-knob sweep of the reference mirror (120 games each): `tierStatMult` 2.7 → 51%, 2.8 → 56%,
  3.0 → 58%; knit 0.5 s → 54%; merge radius 2.0 → 51%; combat cooldown 1.0 s → 48%; supply cap
  45 → 48%. Only the stat multiplier reached the band.
- **`tierStatMult` 2.5 → 2.8** (user's decision, 2026-10-26). A Bloomed unit now has ~93% of its
  parts' HP and damage for ⅔ of their supply. Over 200 games: reference mirror **58%**, Slayer mirror
  **50%** (Slayers now neutralise merging rather than punish it; that clause sits on its threshold).
- G7 `seeds` 20 → **100**: at 40 games the standard error (~8 points) is wider than the effects G7
  measures, so the verdict flipped between runs.
- Knock-on checks at ×2.8: G1, G2 (every intended edge held), G4, G5, G6 and G11 still pass.

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
