# Balance changelog

Every change from the SPEC's first-pass numbers, with the guardrail or verification result that
motivated it. Tools: `npm run balance -- duel`, `npm run balance -- tournament`, `npm run test:slow`.

## Combat rework P1 prototypes (2026-10-30)

**Nothing adopted; no shipped number, rule or default changed.** The combat rework's five settings
(`pinned`, `callforhelp`, `sporecloud`, `rhizomorph`, `waves`, and `rework` for all five) are presets in
`src/data/proto.ts`, absent from `balance.json`, so goldens and hashes are unchanged. The Rhizomorph and
its Rhizomorph Tunnel exist only under the `rhizomorph` preset; the one data change is their two sprites
in `data/sprites/` (display only, never in battle state). First numbers (G3 at 20 seeds per seat) are in
[the backlog](../docs/balance-backlog.md#combat-rework-p1-2026-10-30):
- `rework`: mono Gill Nest 74% mean / 83% worst (from 86 / 100), but mono Sporeling 94 / 98 and mono
  Veilstalker 63 / 90; G4 fails (8:51 median, 33% Decisions, bot wins 20%).
- `waves` alone makes swarms dominant (Sporeling 90 / 98); `pinned` is the only piece that moves the
  archers alone (75 / 93).

## Second-front test maps (2026-10-30)

**Nothing adopted; no shipped number, rule, map or default changed.** Four test-only maps in
`data/maps/` split the one-lane maps into two lanes, to measure whether a second front fixes G3 (mono
Gill Nest): `test-bogwater-2lane`, `test-stumpfield-2lane` and their `-tall` versions. They're
`testOnly`, so runs never draw them, and goldens and hashes are unchanged. Results are in
[the backlog](../docs/balance-backlog.md#second-front-two-lane-test-maps-2026-10-30).
- Two 4-row lanes, same plots: mono Gill Nest 80% / 85% (Bogwater / Stumpfield), from 100%.
- Two 6-row lanes (Twin Roots' shape): 62% / 67%, Twin Roots' own 63%.
- Every two-lane version: mono Amanita 58–73%, and mono Sporeling still 67–82%.

## G3 measures every map in the run pool (2026-10-30)

**Guardrail change, approved by the user** ("Keep G3 as proposed: mean ≤ 55%, worst map ≤ 60%, 50 seeds per seat."). **No content changed,
so no battle or golden changes.** `balance-targets.json` G3 goes from `seeds` 20 and `maxMonoWinRate` 0.55
(Bogwater Hollow only, 40 games) to `seeds` 50, `maxMeanWinRate` 0.55 and `maxMapWinRate` 0.60. Every
mono bot now plays `bot:balanced` on every run-pool map, 100 games per map, and must keep its mean
≤ 55% and its worst map ≤ 60% (SPEC §12.3).

Why: step A found the 40-game Bogwater check read mono Sporeling at 65% (75% over 100 games) and
missed every failure on other maps ([backlog](../docs/balance-backlog.md#g3-on-every-map-the-rewrite-2026-10-30)).

Result (`npm run test:slow`): **G3 fails for mono Gill Nest** (mean 88%, worst 100%), **mono Sporeling**
(74%, 77%) and **mono Amanita** (worst 64%, Twin Roots). Mono Morel passes exactly on the mean limit
(55%, worst 57%). Nothing was tuned to pass.

## Milestone 5: Armilla reworked, Rhizome Surge → Rhizome Tithe (2026-10-30)

**Content change, approved by the user** ("rework Armilla's content … and rerun the tournament").
Armilla's power was Rhizome Surge (take the frontier column in every lane, cooldown 100 s, first ready
1:30). It is now **Rhizome Tithe: +30 gold for every column held past home, cooldown 75 s, first ready
1:00.** Her core pool, starter kit and passive (capture +25%) are unchanged; the passive now feeds the
tithe. Rhizome Surge stays in the code as a power kind (tested on a test-only commander), so it can
come back as an alternate power (SPEC §9.5, mastery 3).

What was tried (whole runs, seeds 1–30, `bot:balanced`, power policy auto; Vesper and Cordis win 10/30):

| Armilla variant | Runs won | Battles won |
|---|---|---|
| As first specced (Surge) | 0/30 | 11/43 |
| Second spawner in the starter kit (Hammercap, Rootbreaker or Sporeling Burrow for the Mortar), power off | 0–1/30 | 13–20/44–50 |
| Surge + 40–80 gold per column taken | 1/30 | 14–16/45–46 |
| Second spawner + Surge + 40–80 gold per column | 0–2/30 | 16–23/44–51 |
| Tithe 20 / 30 / 40 per held column, Surge's timing | 4 / 3 / 6 of 30 | 40/69 · 35/62 · 54/78 |
| **Tithe 30, cooldown 75 s, first ready 1:00 (adopted)** | **7/30** | **54/77** |
| Tithe 30 or 40 that also takes the frontier (cooldown 75 s) | 7–8/60 | 87–88/143–144 |

On seeds 1–60 the adopted tithe wins 14/60 (23%), against Vesper 16/60 (27%) and Cordis 13/60 (22%).
A second spawner never helped: the Puffball Mortar is worth more to this bot than another army
building. Any version that still captures costs about 10 points.

Tournament (`npm run balance -- tournament --commanders all --seeds 30`): Vesper 10/30 (33%), Armilla
7/30 (23%), Cordis 10/30 (33%). **Spread 10 points, inside the 15-point target.** Battle 1 alone
(40 seeds): Armilla 30% without her power, 70% with it, the largest power swing of the three (Vesper
53% → 75%, Cordis 58% → 75%); worth watching in human playtests.

Goldens: `m5-armilla-power-s3` changes behavior; `m3-run-s7` and the other two M5 replays are
hash-only (the new `powerGold` counter). The §16 assert for Armilla is now `stats.player.powerGold>=1`.

## Milestone 5: commanders and powers (2026-10-29)

**New content at the SPEC's first-pass numbers; no existing number or rule changed.** Vesper, Armilla
and Cordis ship with the passives, powers, cooldowns and first-ready times of SPEC §11.10, unchanged:
no tuning in this entry moved the commander tournament inside its target, so none was kept (the
measurements are below and in [docs/m5-plan.md](../docs/m5-plan.md)).

Two harness changes affect what bots do, both only where they used to crash or never applied:

- **A bot's opener skips buildings missing from its kit.** Armilla's starter kit has no Sporeling
  Burrow, and `bot:balanced` opens with one; that used to throw. Generals keep the strict check.
  Single battles always field the whole roster, so no guardrail battle changes.
- **A bot player in a run gets weight 1 on its commander's core buildings that its profile never
  buys** (`botCoreWeights`, the same rule the run already uses for a general's run-only kit
  entries). `bot:balanced` never drafted or built Armilla's Hammercap Forge and Rhizome Vault or
  Cordis's Tender's Ring. Runs only; Vesper's core is all inside `bot:balanced`, so it is unchanged.

Run-golden change: `m3-run-s7` now plays with Vesper's passive and the powers flag on (the bot's power
policy stays `none` in that replay). The M1–M4 single-battle replays are hash-identical; three M5
replays pin each power under the auto policy.

Commander tournament (`npm run balance -- tournament --commanders all --seeds 30`, `bot:balanced`,
greedy drafts, random route, power policy auto):

| Commander | Runs won | Boss reached | Battles won | Power uses |
|---|---|---|---|---|
| Vesper | 10/30 (33%) | 12/30 | 62/82 | 355 (162,216 damage) |
| Armilla | 0/30 (0%) | 2/30 | 11/43 | 100 (129 columns) |
| Cordis | 10/30 (33%) | 11/30 | 59/80 | 273 (306 trios) |

Target: no commander more than 15 points above another. **Fails by 33 points** (Armilla; fixed by the
rework in the entry above). Within the
allowed levers (power and passive numbers), Armilla's best was 3/30 with her power and passive both
effectively off: in this sim, taking ground faster or instantly costs the bot battles. The fix needs a
content or rule decision; see [docs/m5-plan.md](../docs/m5-plan.md#the-commander-tournament).

## Adopted: E1 Hold / Advance (2026-10-28)

**Rule change, approved by the user.** The user asked for the prototypes that helped to go into the game,
and to leave out the ones that didn't. Only E1 qualified. `laneStance` (the `hold` preset: rally 1.5
tiles back, 30 s holds, 10 s cooldown, AI muster at 12 supply and release below 4) is now in
`balance.json`. Golden replays were refreshed. Two AI tests were adjusted: one now keeps its battle
alive past 7:00, the other looks across 10 seeds for the boss's Scythecap Grove (it's placed by 3:00
in 1–2 of 10 seeds with or without Hold). `--proto nohold` restores the old rules for comparison.

`npm run experiment` with checks g3, g4, g5, g7, boss and engagement:

| Check | Before (no Hold) | Hold (now shipped) | All nine prototypes together |
|---|---|---|---|
| First column flip | 2:16–4:14 | 0:34–1:29 | 0:34–1:42 |
| Player commands per minute | 1.3–1.4 | 2.1–2.6 | 1.7–2.1 |
| G3 mono Gill Nest | 100% ✗ | 100% ✗ | 100% ✗ |
| G3 other mono bots above 55% | none | Sporeling 65% ✗ | Sporeling 80% ✗ |
| G4 median / Decisions | 7:12 / 5% ✓ | 7:13 / 10% ✓ | 9:38 / 48% ✗ |
| G5 | 70% ✓ | 75% ✓ | 70% ✓ |
| G7 mirror / Slayer mirror | 58% / 50% ✓ | 60% / 56% ✗ | 61% / 56% ✗ |
| Runs reaching the boss | 25% | 11% | 41% |

- **Why Hold:** it is the one prototype that does its job. Battles open within the first 1:30
  instead of after 3:00, and players act about twice as often. Battle length stays in band.
- **Known costs, still open:** mono Sporeling now wins 65% (G3), G7's Slayer mirror reads 56%,
  and bot runs reach the boss less often (25% → 11%). Bots muster by rule; human players may use
  Hold differently. Re-measure after the first dev-site playtests.
- **The rest stay off:** B1, B3, B4, A2, A3 and T1–T3 stay as presets. All nine together keep
  archers at 100%, hand G3 to Sporelings and stall battles (`t3`).

## Engagement prototype E1: Hold / Advance (2026-10-28)

**Nothing adopted; no number, rule or default changed.** A per-lane Hold / Advance command (`laneStance`,
preset `hold`) with an AI muster policy, from recommendation 1 of the
[engagement review](../docs/engagement-review.md#prototype-e1-hold--advance-per-lane-2026-10-28). It is
absent from `balance.json`, so goldens and hashes are unchanged. `npm run experiment` gains two opt-in
checks, `engagement` and `runs`.
- **Opening:** the first column flip moves from 2:16–4:14 to 0:34–1:29, and battles with no flip
  before 3:00 drop from 30–83% to 0–3%.
- **G3:** mono Gill Nest stays at 93–100% under every variant. Mono Sporeling rises from 40% to
  55–78%, which is a new failure. Merging off doesn't change that.
- **Other guardrails:** G7's Slayer mirror fails at 56%, and G8 fails at 0 of 8 rows. G1, G2, G4,
  G5, G6 and G11 are as before.
- **Runs:** boss reach falls from 25% to 11–23%.

## Balance-backlog prototypes, round 2 (2026-10-27)

**Nothing adopted; no number, rule or default changed.** Measured on request: the Gill Nest spawn
interval (15 → 17–28 s, alone and with B1 or B3) and three new default-off prototypes for the
archers' opening tempo and the defender's trickle: T1 (`rangedFirstSpawnFraction`), T2 (`fallBack`,
a conditional variant of mustering) and T3 (`spawnerDefense`). Goldens and hashes are unchanged.
Results are in [the backlog](../docs/balance-backlog.md#round-2-results-2026-10-27).
- **Interval alone** never brings mono Gill Nest below 85%; at 28 s it is 90% and mono Sporeling and
  Amanita cross 55%. M1's "28 s reaches 50%" no longer holds on M4 content. G1 fails at every
  interval (Capguard Hall wins 7/8 pairings from 17 s on).
- **Interval 24 s + B1** reaches the G3 limit (55%), but mono Sporeling takes over (57%) and G4 (33%
  Decisions) and G7 fail.
- **T1** and **T2** leave mono Gill Nest at 100%; T2 also hands G3 to mono Sporeling (88%).
  **T3** gets mono Gill Nest to 30% only at 25 damage / range 7, where every reference battle ends
  by Decision and four other mono bots exceed 55%.
- **Diagnostic:** one-off defender bots (Sporeling- or Amanita-heavy, a two-Burrow opener, an
  adaptive `bot:balanced`, mono Sporeling) all lose 95–100% to mono Gill Nest, so G3 isn't a
  reference-bot artifact. `bot:balanced` is unchanged.

## Balance-backlog prototypes (2026-10-27)

**Nothing adopted; no number, rule or default changed.** B1 (Sporeling approach rush), B3 (firing
congestion), B4 (unit lifespan), A2 (counter floor weight) and A3 (an earlier first counter cycle)
were each prototyped behind a `balance.json` setting that is absent by default (A3 is the existing
`ai.counter.cycles`), and measured with the new `npm run experiment -- --proto <spec>`. Goldens and
hashes are unchanged. Results are in [the backlog](../docs/balance-backlog.md#prototype-results-2026-10-27).
- **G3:** mono Gill Nest stays at 98–100% under every candidate and combination, including B1 with
  `besiegedBy: melee`. B3 halves the archers' 60-supply margins, but these battles are decided
  before either army reaches that size.
- **B1** raises boss reach from 25% to 39% but fails G4 (25–28% Decisions at ×2–×3 for 1.5 s) and G7
  at every setting (mirror 52–56%, Slayer mirror up to 53%).
- **G8:** A2 lets the Baron field Scythecaps and Veilstalkers, and A2 + A3 passes the Capguard row,
  but the table still fails (at best 1 of 8 asserted rows).

## Milestone 4 (2026-10-27)

The adaptive general and intel (SPEC §7.4–7.8): five buildings, three units, four named generals and
the counter cycle. **No M1–M3 number, core rule or reference bot changed.** The structure commit was
behavior-neutral: 110 single battles and 10 whole runs gave identical fingerprints (winners, lengths,
spawns, merges, gold, damage, fronts), and the content commit left single battles identical too
(bots and the scripted general never buy the new buildings).

### New content: first-pass numbers and the two tuned units
- Hammercap Forge, Morel Warren, Rhizome Vault and Spore Exchange use the §11.2–11.3 numbers, except
  the Hammercap's damage (below). Upgrade tracks follow the §11.6 pattern.
- **Amanita Knight `hp` 700 → 500, `damage` 34 → 28.** At first-pass numbers it won every 12-supply
  duel (G2 FAIL: it lost to nothing, including the intended Hammercap > Amanita Knight edge) and mono
  Amanita Lodge beat `bot:balanced` 80% (G3 FAIL). At 520/30 mono Amanita was 58%.
- **Hammercap `damage` 22 → 25.** At 22 it lost the intended edge to the Knight 0/5; its value check
  was 1.28 per gold (target 1.45 ± 0.15), now 1.36.
- Result: G2 PASS with both M4 edges held 5/5 (Hammercap > Amanita Knight, Amanita Knight > Gill
  Archer; now asserted). G3 mono bots for the new spawners: Amanita Lodge 50%, Hammercap Forge 40%,
  Morel Warren 25%, Rhizome Vault and Spore Exchange 0%.
- The Morel Runner keeps its first-pass numbers. It is the only new candidate that could take the
  Gill Nest's production duel (G1, below), but that needs a cliff-edge buff (HP 95 and an interval of
  15 s) that makes mono Morel Warren beat `bot:balanced` 68%.

### Generals
- §11.11 openers and weights, except **the Blightwright opens with Rootbreaker Den + Truffle Cellar**
  (was Gill Archer Nest + Cellar) and its preferred list starts Capguard Hall, Gill Archer Nest. With
  the archer opener its run kit at battle 2 was archer-led and it won 25 of 27 run battles over 80
  runs; boss reach fell to 15% (main: 29%). Now the player wins 20 of 33 against it and boss reach is
  25% over 80 runs. Its single-battle weights are unchanged.
- Passives are the §7.7 ones (Mold's swarm buildings spawn interval ×0.91; the Baron's buildings
  HP ×1.2; the Blightwright's siege speed ×1.15; the Sovereign's turret damage ×1.25).
- The counter cycle uses the §7.4 numbers (×3 / ×0.6, ±0.03 noise, 2:00 → 4:00 and 5:00 → 7:00, boss
  1:00 → 3:00) and §7.6 (×2 / ×0.8 opening, ×2.5 dual, ½ / ½ intel). Counter sets hold spawners only.
  A harder lean (×5 / ×0.3) against the Lichen Baron fixed no failing G8 row (adaptive vs mono
  Sporeling 37% → 40%, mono Gill Nest 100%, mono Rootbreaker 70% → 63%) and pushed `bot:balanced`
  to the bottom of its band (57% → 47%), so the spec's numbers stay.

### Re-measure after M4 (G1, G3, G8)
- **G3 (mono Gill Nest): still 100%** against `bot:balanced` (40 games), unchanged by the Amanita
  Knight or the adaptive general. Every other mono bot is ≤ 50%. Still deferred (backlog B1–B4).
- **G1 now fails on the Gill Nest: it wins 7 of 8 production pairings (limit 80%).** It beat 5 of 6
  in M3; the three new spawners field Medium or Heavy units and all lose the production duel to
  massed archers (Lodge 0/6, Forge 0/6, Warren 0/6). Only the Sporeling Burrow beats it. Same root
  cause as G3, so it waits on the same decision.
- **G8 fails.** See `docs/m4-plan.md` (As built) for the table and the diagnosis.

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
