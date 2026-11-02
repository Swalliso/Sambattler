# Balance backlog (v2)

Balance candidates, measurements and prototype results for [SPEC v2](../SPEC.md)'s round battle, newest first. It started on 2026-10-31, when the game moved to v2, and nothing is measured yet.

v1's backlog is archived at [docs/archive/v1/balance-backlog.md](archive/v1/balance-backlog.md). It covers G3, the rework's prototypes, steps A and B, and the counter matrix. Read it for evidence, not as open work.

## How entries work

- **Each entry gives:**
  - the date and the milestone;
  - what was measured: the command, the seeds and the variant;
  - the result;
  - the guardrail it touches (SPEC §12.3);
  - what's recommended.
- **Approval:** a rule change or a retune across several units waits for the user's OK (`.claude/rules/balance.md`).
- **Data changes** go in `data/CHANGELOG-balance.md`.
- **Balance method** (SPEC §12.1): playtests decide what's fun, and bots catch degenerate builds. The main bar is the counter matrix's: "A strong build isn't the bug. A build with no answer is."

## Open

- **R1's review gate** (S8, T049): the user reads R1's entry below and settles §18.2 #7–#15, X4, X5, #36's reading and each knob's outcome (A109). R2a starts after that.

## R1 · the clash check (2026-11-02)

R1's runs (S7, T040–T048, T052), measured on `develop` at `fd9621f` (#62), with no rule or data change: no golden hash moved. The check fights whole armies at equal gold in formation on v1's sim, with v2's targeting and movement switched on (SPEC §12.2, §16 R1). A clash's winner is R1-Q3's: more lanes, then more uncapped Heartcap damage, else a draw worth half.

**How it was run**
- Every run: `npm run experiment -- --checks clash --budgets 300,600,900,1200,1500 --workers 6` plus the options below, writing `reports/experiments/<label>.json`. 6 workers on a 12-core laptop that was building another session's work at the same time.
- The four 50-seed runs (T042), 50 seeds a seat:
  - `r1-baseline`: `--jitter 0.2 --matrix all --mirror`, today's combat. 299,150 clashes for 362,200 cells in 182 s.
  - `r1-baseline-j0`: `--jitter 0`, the deterministic reference. 70,698 clashes for 169,000 cells in 47 s.
  - `r1-kept`: `--proto kept --jitter 0.2 --mirror`. 187,092 clashes in 121 s.
  - `r1-kept-fixedref`: `--proto kept,bot.balanced.fixedWeights:true --jitter 0.2` (A023: the reference on its data weights, not buying the appended spawners). 147,304 clashes in 91 s.
- **Seeds:** a number quoted as a result comes from a 50-seed run (above, T044's confirmation or T052). Every other variant number is a 20-seed screen (`--g3seeds 20 --confirm-seeds 20 --jitter 0.2`), good to about ±8 points.
- **Checks (T041):** `npm run verify` is green (627 unit tests in 37 files), `npm run golden -- verify` passes 8 of 8 with no moved hash, and `npm run test:slow` gives the same v1 verdicts as `develop` before R1 (`ffd57f9`): the same four guardrails miss (G1, G3, G7, G8), and all 57 guardrail lines match.
- **Jitter:** ±0.2 tiles, with the jitter-free run beside it. The two agree to within 6 points on every pooled G3 mean (the widest, Amanita Lodge, 30% against 24%), and give the same G3 and G12 verdicts.

**The calls for S8, with recommendations** (the measures follow; a recommendation for #8, #9, #12 or X4 rests on a 50-seed number)
- **In short:** in a clash the muster's knitting favours a mono army, which knits fully, over a mixed one. In the merge mirror merging wins 90–100% for most armies; with merging off the Sporeling passes G3 and G12 passes; and the shield for mixed armies fixes G12. So four monos beat `bot:balanced` (Capguard Hall 90%, Sporeling Burrow 79%, Gill Nest 75%, Veilstalker Hollow 64%), and two have no answer. One set measured passes every bar at 50 seeds: `kept` with the arrival shield (`clashshield`) and Capguard Hall's squad at 3.
- **#7, squads and the full colony.**
  - Squads: sizes per building, from §11.2's column with **Capguard Hall at 3** and the Burrow at 8. Capguard Hall's 4 is the strongest mono in clashes (90%), though §11.4's value per gold puts it inside the band. Each global option fails 5–6 monos (45 s or 75 s, either rounding), and a Burrow of 6 or 7 lifts the Capguard, the Gill and the Veilstalker (to 94–96%, 80–94% and 71–81%), while at 7 the Sporeling still fails (61% at 50 seeds).
  - The full colony: keep §13.7's 150 live units. Twin Roots fields 192, over it, yet ticks well inside G11 (p99 1.53 ms), so the 150 is about reading the field, not the CPU. The lever that keeps squads and plots as designed is no upgrade's +1 per batch (128 a side). A200's rows (the Vault, the Shrine, Mold's passive) push an upgraded colony further over; they're upper bounds for R3 to recheck.
- **#8, the arrival shield.** Adopt it, a departure from SPEC's first guess, by #8's own test: G12 fails without it and passes with it, on today's combat and on `kept` (50 seeds). R2a writes it as v2's rule with its own data key, not v1's `waves`. It's one more system to learn (playtest F8). The other variant that passes G12, merging off, fails G13.
- **#9, the Elder Sporeling's splash.** Keep it (the first guess). Without it the Sporeling still fails G3 (66% at 50 seeds) and only gains a G12 answer. With the shield, `kept` and Capguard Hall at 3, the Sporeling passes G3 (48%) and G12 (answered at 95%) with the splash on.
- **#10, emplacements.** Agree with the first guess and A029's unit rules. Emplacements alone held 0–2% of lanes. The siege units' preference for buildings changes no cell (`--v1-targeting` matches the baseline cell for cell). The Mortar wins nothing on today's combat (0%) and becomes a real piece only with spore clouds (41–45%), where Rootbreaker Den answers it at 100%.
- **#11, overflow.** Agree with D47 (pack tighter). No squad overflows at today's sizes, only grown ones (Capguard Hall and Hammercap Forge at 5, Rootbreaker Den and Scythecap Grove at +2), so it rests on few cases (A020).
- **#12, the approach.** Agree: no pace rule. `clashpace` leaves G12 failing (Sporeling 50%, Capguard 53% at 50 seeds) and G13 where it was (1.2%).
- **#13, the muster in the 45 s.** Agree: it counts. The two readings differ by 0.3 points (5.8% against 5.5%), with the same median.
- **#14, an Anti-Ranged kind.** Add it, as clarify recommends: the swarm answers archers in clashes. Mono Sporeling beats mono Gill Nest 100% at every budget, and the Sporeling and Veilstalker pair, which counts, 95–100%. But §7.4 reads mono Gill Nest as Elite today, since its knitted archers count at their parts' supply, so the kind bites only once R2-Q3 is settled.
- **#15, counter sets.** Keep type and tag with clarify's three fixes, and use the clash matrix as a check, not the source. With the swarm read, §7.4's set holds the matrix's best answer to the Sporeling (Capguard Hall) and to the Veilstalker (the swarm builds). It misses for the Capguard, which reads Elite from 600 gold while Gill Nest answers it. The best answers also shift with budget: against the Capguard, Gill Nest at 600–900 and the Capguard and Gill pair from 1,200.
- **X4, copies before R3.** The condition is met (mono Sporeling fails G3 and G12 without copies), but recommend **no**: keep D45.
  - Copies don't fix the Sporeling (57–63% at 2–4 copies, 50 seeds).
  - At 2 and 3 copies more builds lose their answer (7 and 3 fail G12). A capped mono fills its other plots by `bot:balanced`'s weights, so the builds converge and few answers clear 60%.
  - The set above passes without copies. #51 waits for R3, which should revisit how G12 reads a capped mono.

  | Copies (50 seeds) | Sporeling | Capguard | Gill | Veilstalker | Other G3 fails | G12 fails |
  | --- | --- | --- | --- | --- | --- | --- |
  | Unlimited | 79 | 90 | 75 | 64 | none | Sporeling 51, Capguard 57 |
  | 4 | 63 | 79 | 72 | 69 | none | none |
  | 3 | 57 | 72 | 72 | 63 | Rootbreaker (Twin Roots 69) | Capguard 52, Gill 53, Veilstalker 49 |
  | 2 | 58 | 59 | 60 | 55 (fails, just over) | Rootbreaker (Twin Roots 64) | 7 builds, the best answers 48% to just under 60% |

  On `kept,clashshield` (20-seed screens), 2 copies fail G3 on the Capguard (63), the Mortar (62), the Scythecap (59) and Rootbreaker on Twin Roots (77), and G12 on three builds. At 3 and 4 copies G12 passes, but G3 fails the Capguard (72, 74), the Mortar (58, 59), the Sporeling (56, 60) and Rootbreaker on Twin Roots.
- **X5, the scoring curve.** No rule set measured brings even battles inside G4's band: under every one, about half or more reach round 9.
  - Recommend the X5 lean (a cap of 25% of the loser's max HP, and the Decision by share) as R2a's starting rule. It scales with the Heartcap, and in the model it's within a few points of the storm cap, the best of the six.
  - Make G4's band R2a's measurement on real battles of rounds, since the model leaves out income, comebacks and counters. If battles still run long there, the next levers (lower Heartcaps, a stronger storm) are untested here.
- **#36, the sixth archetype.** The Burster Pod, as clarify leans.
  - Its core six fails G3 only on the Capguard (85%) and the Gill (57%) at 50 seeds, and only on the Capguard (74%, a 20-seed screen) with `kept,clashshield`.
  - The Mortar's core six fails four monos (Capguard 96, Sporeling 86, Gill 85, Hammercap 68) and three G12 builds.
  - In the core-six graph the Mortar wins none of its edges (it loses 70–100% to all five), while the Burster Pod beats the Sporeling (68%; the graph is a 20-seed screen).
- **R2-Q3, eliteShare.** Count Elder parts only. It's the one reading that keeps `bot:balanced` from reading Elite: at most 10% at every budget, against 100% counted plainly, 10–66% with the swarm read, and 30–78% with the factor cut to 0.6.
- **R2-Q7, Puppet Bloom.** Give it a v2 job, as clarify suggests: after the muster it has a median of 0 trios to knit at 300 and 600 gold (rounds 1–3), and 1 from 900.
- **R2-Q13, battle 1's pairings** (R2b's call; 20 seeds, today's combat, passives off). 3 of 6 pairings have no starter answer at 60%: Vesper and Armilla against the Lichen Baron (the best, mono Capguard Hall, 51%), and Cordis against Mother Mold (the best, mono Sporeling Burrow, 41%). Cordis against the Mold loses clearly, so clarify's free blueprint applies. Re-measure on R2a's set.
- **The knobs** (A109):
  - **Adopt as data,** as R2a's start: `kept`, that is `pinned`, `sporecloud`, `burster`, `cleave` and `rhizomorph`, which §1.3 #11 keeps; and `clashshield` (#8), written as v2's rule with its own key.
  - **Delete:** `noeldersplash` (#9), `clashpace` (#12) and `swarmread`, which counting Elder parts replaces (R2-Q3).
  - **The two switches** (`noBuildingPreference`, `idleSeek`): R2a writes them as v2's targeting and movement (R1-Q7, R1-Q8), and R2b deletes the flags. In these clashes `--v1-targeting` changes no cell, and `--v1-movement` rarely parks (at most 0.04 units a clash).
  - **For R2a to watch:** alone, `pinned` weakens the answers to the Sporeling and the Capguard (G12 40% and 36%), and without it `kept,clashshield` reads the same at 20 seeds (only the Capguard fails). The Rhizomorph Tunnel wins 1% as a mono, so its job is support. Under `kept`, v1's G2 newly fails (A116, below).

**The bars on today's combat** (`r1-baseline`)
- **G3 fails on four monos** (limits: mean ≤55%, the one-lane field counted twice; worst field ≤60%). Win % against `bot:balanced`'s army with the same gold, a draw half:

  | Mono | 300 | 600 | 900 | 1,200 | 1,500 | Mean | Worst field | Jitter 0 |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | Capguard Hall | 98 | 88 | 87 | 89 | 88 | **90** | twin 91 | 91 |
  | Sporeling Burrow | 65 | 88 | 98 | 73 | 73 | **79** | one 81 | 81 |
  | Gill Nest | 42 | 63 | 80 | 95 | 95 | **75** | one 78 | 74 |
  | Veilstalker Hollow | 9 | 51 | 74 | 92 | 96 | **64** | one 70 | 59 |
  | Hammercap Forge | 30 | 37 | 37 | 51 | 57 | 42 | one 43 | 43 |
  | Amanita Lodge | 56 | 19 | 18 | 16 | 39 | 30 | one 32 | 24 |
  | Rootbreaker Den | 41 | 38 | 16 | 15 | 19 | 26 | twin 51 | 27 |
  | Morel Warren | 28 | 23 | 11 | 19 | 22 | 21 | one 22 | 17 |
  | Scythecap Grove | 15 | 19 | 19 | 19 | 29 | 20 | one 21 | 18 |
  | Puffball Mortar | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
  | Tender's Ring | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

  Gill Nest and Veilstalker Hollow grow with gold (from 42% and 9% at 300 to 95% and 96% at 1,500). Capguard Hall wins from the first round on.
- **G12, the strict counter bar, fails on two:** mono Sporeling Burrow (the best answer, the Capguard and Gill pair, wins 51% on Twin Roots) and mono Capguard Hall (the same pair, 57% on Twin Roots). The bar is an answer winning ≥60% on its worst field, confirmed on 50 more seeds, and a mono answer that fails clash G3 doesn't count. Gill Nest (answered 97%) and Veilstalker Hollow (64%) have answers. The swarm answers the archers: mono Sporeling Burrow beats mono Gill Nest 100% at every budget, but it fails G3 itself, so it doesn't count.
- **G13 passes:** 5.8% of 357,800 clashes reached the 45 s cap (the bar is ≤15%), and G3's clashes alone 3.1%. The share rises with gold, from 3% at 300 to 9% at 1,500. The median clash is 19.4 s, just under §12.3's 20–40 s target (report only).
- **The G4 row** (`bot:balanced` against `general:scripted` on the one-lane field): 52, 49, 56, 45 and 47% by budget. These are the even battles X5 reads first.

**The kept set** (`r1-kept`; `r1-kept-fixedref` beside it)
- **G3 still fails:** Capguard Hall 90% (fixed reference 86%), Sporeling Burrow 62% (71%), and Rootbreaker Den on Twin Roots alone (just over 60%; mean 37%). Gill Nest falls to 30% (35%) and Veilstalker Hollow to 44% (57%, a fail with the fixed reference). So part of kept's fix for the Veilstalker is the reference buying the appended spawners (A023).
- The Puffball Mortar rises from 0% to 45% (46%), and its worst field passes. The Burster Pod is at 30% (27%) and the Rhizomorph Tunnel at 1% (1%).
- **G12 fails on Capguard Hall alone:** its best answer, the Rootbreaker and Mortar pair, wins 42% on the one-lane field. Mono Sporeling Burrow is answered (the Capguard and Burster pair, 91%).
- **G13 passes:** 5.2% (4.9%).
- So `kept` fails a bar, and T044 screens sets from it (below).
- `kept` per budget (G3 win %, 50 seeds a seat):

  | Mono | 300 | 600 | 900 | 1,200 | 1,500 | Mean | Worst field |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Capguard Hall | 100 | 96 | 86 | 87 | 83 | **90** | twin 92 |
  | Sporeling Burrow | 63 | 72 | 81 | 50 | 46 | **62** | twin 69 |
  | Hammercap Forge | 28 | 52 | 54 | 60 | 64 | 52 | one 52 |
  | Puffball Mortar | 0 | 38 | 61 | 60 | 67 | 45 | one 52 |
  | Veilstalker Hollow | 5 | 32 | 50 | 60 | 75 | 44 | one 48 |
  | Rootbreaker Den | 45 | 59 | 25 | 27 | 31 | 37 | **twin 60** |
  | Scythecap Grove | 19 | 32 | 37 | 37 | 43 | 33 | twin 35 |
  | Gill Nest | 8 | 30 | 37 | 41 | 37 | 30 | twin 33 |
  | Burster Pod | 35 | 17 | 27 | 36 | 36 | 30 | twin 33 |
  | Amanita Lodge | 52 | 17 | 14 | 9 | 26 | 23 | one 25 |
  | Morel Warren | 37 | 32 | 18 | 10 | 8 | 21 | twin 22 |
  | Rhizomorph Tunnel | 1 | 1 | 1 | 1 | 1 | 1 | twin 2 |
  | Tender's Ring | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

**The set of pieces** (T044: 20-seed screens, then the best set at 50 seeds with `--mirror`)
- `kept` fails a bar, so sets were screened by T044's rule. Mono Sporeling fails G3, so `kept,noeldersplash` and `kept,clashshield`. G13 passes, so no `kept,clashpace`. `pinned` is the piece whose own screen fails a bar (it adds Veilstalker Hollow's G12 fail), so `kept` without it (`sporecloud,burster,cleave,rhizomorph`), alone and with the shield.
- Two leads beyond the rule, on Capguard Hall's squad (#7): `kept` and `kept,clashshield`, each with `--squad capguardHall=3`.

| Set | G3 fails | G12 fails | G13 |
| --- | --- | --- | --- |
| `kept` (20 seeds) | Capguard 90, Sporeling 59, Rootbreaker (Twin Roots 64) | Capguard 42 | 5.6% |
| `kept,noeldersplash` | Capguard 92, Hammercap 55, Rootbreaker (Twin Roots 64) | Capguard 42 | 4.6% |
| `kept,clashshield` | Capguard 83 | none | 2.8% |
| `kept` without `pinned` | Capguard 90, Gill 69, Sporeling 57, Rootbreaker (Twin Roots 64) | Capguard 56 | 4.5% |
| `kept` without `pinned`, with the shield | Capguard 80 | none | 1.9% |
| `kept`, Capguard Hall 3 | Sporeling 62, Hammercap 56, Rootbreaker (Twin Roots 73) | none | 5.2% |
| `kept,clashshield`, Capguard Hall 3 | none | none | 6.7% |
| **50 seeds:** `kept,clashshield` | Capguard 83 | none | 4.7% |
| **50 seeds:** `kept,clashshield`, Capguard Hall 3 | **none** | **none** | 7.5% |

- **No preset set passes.** `kept,clashshield` comes closest: only Capguard Hall fails, at 83% over 50 seeds. With Capguard Hall's squad at 3, the set passes all three bars at 50 seeds, the only set in R1 that does.
- **That set, per budget** (`r1-kept-clashshield-capguard3-50`, G3 win %):

  | Mono | 300 | 600 | 900 | 1,200 | 1,500 | Mean | Worst field |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Sporeling Burrow | 58 | 62 | 63 | 31 | 28 | 48 | twin 58 |
  | Hammercap Forge | 30 | 41 | 34 | 49 | 50 | 41 | twin 45 |
  | Puffball Mortar | 0 | 35 | 51 | 54 | 65 | 41 | one 49 |
  | Veilstalker Hollow | 7 | 29 | 35 | 48 | 66 | 37 | one 38 |
  | Capguard Hall | 92 | 39 | 20 | 7 | 2 | 32 | twin 43 |
  | Rootbreaker Den | 45 | 52 | 20 | 18 | 17 | 30 | twin 55 |
  | Scythecap Grove | 21 | 27 | 25 | 25 | 29 | 25 | twin 28 |
  | Gill Nest | 3 | 21 | 19 | 26 | 24 | 19 | twin 21 |
  | Burster Pod | 30 | 13 | 14 | 18 | 19 | 19 | twin 22 |
  | Amanita Lodge | 42 | 14 | 11 | 5 | 10 | 17 | twin 20 |
  | Morel Warren | 33 | 22 | 9 | 5 | 4 | 14 | twin 15 |
  | Rhizomorph Tunnel | 2 | 1 | 1 | 0 | 0 | 1 | twin 2 |
  | Tender's Ring | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

  - **G12 passes:** the three monos over 40% have answers. The Scythecap and Burster pair beats the Sporeling at 95%; Rootbreaker Den beats the Mortar and Veilstalker Hollow beats the Hammercap, each at 100%.
  - **G13:** 7.5% capped over every clash, the mirror's included, and 4.2% of G3's; the median clash is 19.4 s. `kept` raises the capped share (1.3% → 5.6% on the 20-seed scope), most of it with `sporecloud` (3.8% alone), which makes the Mortar a real piece.
  - **Flags** (the pooled mean passes, but one budget dominates): Capguard Hall 92% at 300 gold, so round 1 still belongs to it at 3; and the Sporeling 58–63% from 300 to 900.

**The 50-seed confirmations** (T052): each variant whose screen flips a bar, or that backs a recommendation departing from SPEC's first guess, re-run with `--g3seeds 50 --confirm-seeds 50` as `r1-<variant>-50`.
- `noeldersplash` (#9): G3 still fails the Sporeling (66%), and Capguard 92, Gill 75, Veilstalker 67. G12 fails Capguard Hall alone (57%): the Sporeling gains an answer.
- `clashshield` (#8; it flips G12): G3 fails Capguard 81, Sporeling 62 and Veilstalker (one lane, just over 60). G12 passes. G13 1.8%.
- `clashpace` (#12): G3 fails Capguard 88, Sporeling 75, Gill 73, Veilstalker 59; G12 fails Sporeling 50, Capguard 53; G13 1.2%, median 17.7 s.
- Copies at 2, 3 and 4 (X4), in the table under the calls.
- `--squad capguardHall=3` (#7, departs from §11.2): Capguard Hall passes (48%). The Sporeling 83, Gill 77 and Veilstalker 68 still fail, and G12 fails the Sporeling (39%).
- `--squad sporelingBurrow=7` (#7; its screen passed the Sporeling at 55%): at 50 seeds the Sporeling fails (61%), and Capguard 94, Gill 81, Veilstalker 71.
- `--squad-scale 45` (it flips G12): G12 passes; G3 fails Capguard 94, Sporeling 80, Amanita 79, Veilstalker 74, Gill 69.
- The core-six checks (#36), under the calls.
- `--v1-movement` (it gives the Capguard an answer): G3 within 3 points of the baseline; G12 fails the Sporeling alone (48%).
- `--merging off` (it flips G12 and G13): G3 fails Capguard 79, Gill 76, Scythecap 65, Amanita 61; G12 passes; G13 16.6%, a fail, median 25.4 s.

**The merge mirror** (G7's round form, #9; `--mirror`, 20 seeds a seat): each army with merging on against its own twin with merging off. Merging wins 97–100% for Sporeling Burrow, Capguard Hall, Gill Nest, Rootbreaker Den, Scythecap Grove and Hammercap Forge, 91% for Morel Warren and 90% for `bot:balanced`. It loses every game for Veilstalker Hollow and Tender's Ring (0%). Only Amanita Lodge (56%) is inside G7's 55–70% band; the Mortar never merges (50%). Under `kept` the same, plus the Burster Pod 52% and the Rhizomorph Tunnel 69%. In a clash the muster's knitting decides more than v1's G7 band allows, and for the Veilstalker and the Tender it always hurts.

**The variant screens** (T043, T045, and two leads on Capguard Hall's squad)
- 20 seeds a seat, jitter 0.2, against `r1-baseline-20`, the baseline on the same seeds (so differences aren't seed noise). Labels are `r1-<variant>`.
- **G3** lists the monos that fail, with their mean (a worst-field-only fail says so). **G12** lists the builds with no answer at 60%, with the best answer's worst field. **G13** is the share of clashes capped.
- G13 here isn't comparable to the 5.8% above: `r1-baseline`'s `--matrix all` adds every mono's matrix rows, and the lopsided ones cap more. Without it the 50-seed jitter-free run caps 1.2%, and this 20-seed baseline 1.3%.

| Variant | G3 fails | G12 fails | G13 |
| --- | --- | --- | --- |
| Baseline (20 seeds) | Capguard 90, Sporeling 79, Gill 73, Veilstalker 65 | Sporeling 45, Capguard 56 | 1.3% |
| `--merging off` | Capguard 83, Gill 75, Scythecap 70, Amanita 64 | none | **17.7%, fails** (median 26 s) |
| `noeldersplash` | Capguard 93, Gill 73, Veilstalker 68, Sporeling 61 | Capguard 56 | 1.3% |
| `--squad-seconds 45` | Veilstalker 86, Capguard 84, Amanita 69, Sporeling 68, Gill 60, Morel 60 | Veilstalker 40 | 3.7% |
| `--squad-scale 45` | Capguard 94, Sporeling 80, Amanita 80, Veilstalker 74, Gill 68 | none | 4.0% |
| `--squad-seconds 75`, `--squad-scale 75` | Capguard 78, Amanita 75, Gill 71, Veilstalker 70, Sporeling 68 | Veilstalker 48 | 5.9%, 6.1% |
| `--squad sporelingBurrow=6` | Capguard 96, Gill 94, Veilstalker 81, Hammercap 58, Rootbreaker (Twin Roots 61) | Capguard 56 | 3.6% |
| `--squad sporelingBurrow=7` | Capguard 95, Gill 80, Veilstalker 73 (Sporeling 55 passes) | Capguard 56 | 1.4% |
| `--squad capguardHall=3` (lead) | Sporeling 80, Gill 76, Veilstalker 69 (Capguard 48 passes) | Sporeling 34 | 1.4% |
| `pinned` | Capguard 92, Sporeling 80, Veilstalker 66 (Gill passes) | Sporeling 40, Capguard 36, **Veilstalker 59** | 1.6% |
| `sporecloud` | Capguard 86, Sporeling 73, Gill 72, Veilstalker 60 | Sporeling 45, Capguard 56 | 3.8% |
| `burster` | Capguard 88, Gill 68, Sporeling 60 (Veilstalker 49) | Capguard 56 | 1.1% |
| `burster`, fixed reference | as the baseline; mono Burster Pod 47 | Capguard 56 | 3.1% |
| `cleave` | Capguard 89, Gill 72, Sporeling 72, Veilstalker 62 | Sporeling 47, Capguard 56 | 1.2% |
| `rhizomorph` | Capguard 92, Sporeling 81, Gill 77, Veilstalker 61 | Sporeling 52, Capguard 56 | 1.5% |
| `rhizomorph`, fixed reference | as the baseline; mono Rhizomorph Tunnel passes | Sporeling 52, Capguard 56 | 1.4% |
| `clashpace` | Capguard 85, Sporeling 72, Gill 71, Veilstalker 57 | Sporeling 44, Capguard 53 | 1.2% (median 17.6 s) |
| `--lanes-rule general` (Twin Roots only) | Capguard 90, Sporeling 79, Gill 70, Veilstalker 55 | Sporeling 54, Capguard 57 | 3.1% |
| `clashshield` | Capguard 80, Sporeling 61, Veilstalker (one lane 61) (Gill 48) | none | 1.8% |
| `--v1-movement` | Capguard 91, Sporeling 82, Gill 74, Veilstalker 62 | Sporeling 46 | 1.4% |
| `--v1-targeting` | as the baseline, cell for cell | as the baseline | 1.3% |
| `--fields three` (a lead, outside the bars) | Capguard 96, Sporeling 82, Veilstalker 71, Gill 63 | Sporeling 46, Capguard 50 | 5.3% (median 25 s) |
| `--extra-plots 4`, 1,200 and 1,500 gold only | Veilstalker 95, Gill 92, Sporeling 89, Capguard 87 | Sporeling 46, Veilstalker 30 | 2.3% |

- **What moves the bars:**
  - Nothing screened passes G3. Every variant leaves Capguard Hall failing, except its own squad at 3.
  - G12 passes with merging off, with `--squad-scale 45`, and with the arrival shield (`clashshield`).
  - Merging off fails G13: clashes with nothing knitted stall (17.7% capped).
  - Each piece alone: `pinned` adds a G12 fail (Veilstalker Hollow, 59%) and weakens the answers to the Sporeling and the Capguard; `burster` is the one piece that gives the Sporeling an answer; `sporecloud` lifts the Mortar from 0% to 45%: its shells reach 7 tiles and leave clouds that ignore armor; `burster` and `rhizomorph` each lift Rootbreaker Den on Twin Roots (48% → 57%), which is why `kept` fails it there (64%).
  - The squad options trade one fail for another. Smaller Burrow squads weaken `bot:balanced`'s army, which buys Sporelings, so Capguard Hall, Gill Nest and Veilstalker Hollow win more. 75 s squads cut the Capguard but lift the Amanita.
  - `--squad-seconds 75` and `--squad-scale 75` differ only in Hammercap Forge's squad (4 or 5), so they read alike. At 45 s they differ in Scythecap Grove, Veilstalker Hollow and Morel Warren (A010).
- **The squads and §11.4's value per gold** (target 1.45 ± 0.15). At 60 s: Sporeling Burrow 8 (1.83, over the band), Capguard Hall 4 (1.48), Gill Nest 4 (1.53), Rootbreaker Den 3 (1.56), Scythecap Grove 3 (1.23, under), Veilstalker Hollow 6 (1.33), Hammercap Forge 4 (1.54), Amanita Lodge 2 (0.77, far under), Morel Warren 6 (1.31). The value model flags the Burrow and misses the Capguard, the strongest mono in clashes: within the band at 4, and 1.11 at 3. At 45 s the Burrow's 6 is 1.37; at 75 s its 10 is 2.28. A Burrow of 7 would be 1.60.

**X5, the scoring curve** (the race section of `r1-baseline`)
- **The cap binds.** The share of clashes whose loser's uncapped Heartcap damage passes 500, at storm ×1.0 → at the storm of the round each budget stands for (A208): 0% at 300 gold, 14–18% at 600, 38–42% → 53–58% at 900, 53–60% → 78–84% at 1,200 and 55–72% → 86–95% at 1,500; 35% → 48% pooled. Drawn rounds (A022): 3% pooled, the most at 300 gold on Twin Roots (12%), where the two lanes split.
- **The race model** chains each case's clashes into battles of up to 9 rounds (crude: no income, no comeback gold, no counters; one seed's armies stand in for a growing colony). G4's band is a median of 6–8 rounds, at most 15% reaching round 9 and the bot winning 30–70%. The median rounds and the share reaching round 9, battle 1 → battle 5 (the Fortified elite and the boss beside):

  | Rules | Even battles (the G4 case, 100) | Mirror (100) | Lopsided, one lane (G3, 1,100) | Lopsided, Twin Roots (G3, 1,100) |
  | --- | --- | --- | --- | --- |
  | First guess (flat 500 cap) | 9 rounds; 65–78% (elite 85%, boss 80%) | 9; 69–79% (88%, 81%) | 8–9; 46–52% (60%, 56%) | 8; 33–40% (54%, 47%) |
  | Cap 25% of the loser's max HP | 8–9; 47–61% (60%, 51%) | 9; 52–62% (68%, 58%) | 7–8; 33–39% (42%, 37%) | 7–7.5; 18–26% (29%, 23%) |
  | Storm cap (the cap × the storm) | 8–9; 44–54% (59%, 49%) | 8–9; 49–60% (68%, 61%) | 7–8; 29–36% (41%, 38%) | 7; 15–22% (27%, 23%) |
  | Equal Heartcaps | 8–9; 38–71% (71%, 83%) | 8–9; 49–71% (81%, 83%) | 7–8; 27–48% (51%, 60%) | 7–8; 12–33% (42%, 53%) |
  | Share Decision | as the first guess | as the first guess | as the first guess | as the first guess |
  | X5 lean (cap 25% and share Decision) | as cap 25% | as cap 25% | as cap 25% | as cap 25% |

- In even battles the general wins 49% of battle 1 under the first guess (15% by Rout, 34% by Decision), so the bot's share is inside G4's band under every rule. The lead changes hands 0.4–0.7 times a battle.
- **Reading:** no rule set brings even battles inside G4's band; under all of them about half or more reach round 9. A cap of 25% of max HP cuts the round-9 share of even battles by 8–23 points, and the storm cap by 12–24. Equal Heartcaps help most in battle 1 (38%), fade by battle 5, and make the boss longer (83%). Share Decision changes only what a Decision pays.

**#13, does the muster count toward 45 s?** Both readings come from the same clashes: 5.8% capped with the muster counted, 5.5% with the cap starting after it, and the same 19.4 s median. Per budget the two differ by at most 0.5 points.

**#7 and R1-Q5, the full colony** (the report's colony table, and `npm run bench`, T046)
- Every plot planted with the biggest squad, today's upgraded Burrow (12 Sporelings at 1 supply):
  - **one lane, 12 plots:** 144 units and 144 supply a side, inside §13.7's 150 live units. The bench: the arrival in 0.11 ms (budget 5 ms), 586 ticks to the clash's end, 288 units at the peak, a tick mean of 0.43 ms and p99 1.39 ms (G11: 1 ms and 2.5 ms).
  - **Twin Roots, 16 plots:** 192 units and 192 supply a side, **over the 150**, as S6 found. The bench: the arrival in 0.16 ms, 540 ticks, 384 units at the peak, a tick mean of 0.50 ms and p99 1.53 ms, still inside G11.
  - The levers that bring Twin Roots inside 150: squads of at most 9 on 16 plots; or no upgrade's +1 per batch (the Burrow's 8 then field 128); or at most 12 plots of 12.
  - A200's sensitivity, upper bounds that ignore the plots these buildings take: every squad +1 (the Rhizome Vault's first guess) gives 156 and 208; the squad in front +2 (the Velvet Shrine's) 160 and 212; Old Mother Mold's +10% to swarm squads 168 and 224. Each is over on both fields.
- `bench-300` passes too (mean 0.18 ms, p99 0.51 ms, full battle 70 ms).
- **Reading:** 384 live units tick inside G11 with room to spare, so the 150 is a readability budget, not a CPU one, on this machine.

**#11, overflow** (A020): at the 60 s squads no squad overflows its slot. At 75 s Capguard Hall's 5 do; with +1, Capguard Hall and Hammercap Forge; with +2, those two plus Rootbreaker Den and Scythecap Grove. So D47's packing rests on a handful of cases, all of them squads grown past today's sizes.

**Readings from the clash records** (`--records` on G3's clashes alone, 20 seeds a seat, jitter 0.2: 4,280 clashes a run; `r1-rec-baseline`, `r1-rec-v1-movement`, `r1-rec-v1-targeting`, each with `--mono sporelingBurrow --answers bot:balanced --top 1 --screen-seeds 1 --confirm-seeds 1 --g4seeds 1` to keep the file small)
- **R2-Q3 and A041, eliteShare after the muster** (merged units at their parts' base supply). The share of armies whose top §7.4 kind is Elite, 300 → 1,500 gold:

  | Reading | `bot:balanced` | The monos |
  | --- | --- | --- |
  | Plain (mean share 0.81–0.88) | 100% at every budget | 73–91% |
  | With the swarm read (0.12 → 0.50) | 10, 25, 42, 62, 66% | 36–55% |
  | Elder parts only (0.11–0.26) | 0, 10, 5, 3, 2% | 9–23% |

  A041 holds: counted plainly, every default mixed army reads Elite from round 1. The swarm read still reads most of `bot:balanced`'s colonies as Elite from 1,200 gold. Counting Elder parts only keeps it under 10%.
- **R2-Q7 and A057, Puppet Bloom:** the most trios a 3-tile circle could still knit after the muster, a side: a mean of 0.02, 0.39, 0.78, 0.87 and 1.12 by budget, and at least one trio in 2, 32, 55, 61 and 75% of armies. So the median is 0 at 300 and 600 gold (rounds 1–3) and 1 from 900.
- **A021, far-edge parking:** with v2's idle seek, a mean of at most 0.01 units a clash stand within 0.5 tiles of the far edge when a lane ends. With `--v1-movement`, at most 0.04, in 1% of clashes from 900 gold. In these armies today's movement rarely parks.
- **#10, emplacements:** a lane is held by emplacements alone (one side has only emplacements left at the cap) in 0–2% of lanes, the same in clashes with the mono Mortar. The mono Mortar wins 0% of its G3 clashes with v2's targeting and with `--v1-targeting` (siege units preferring buildings).

**v1's checks on the kept set** (A116: `npm run experiment -- --proto kept --checks duels,g8`, beside the shipped data's `--checks duels,g8`)
- G1 (production duels) and G8 (adaptation) miss on the shipped data too, so neither miss is new. Under `kept`, G8's `bot:balanced` battle-1 rate comes inside its band.
- **New:** G2 (supply duels) passes on the shipped data and fails under `kept`. The Gill Archer wins no supply duel: it loses to the Sporeling, the Capguard, the Scythecap, the Veilstalker, the Hammercap, the Amanita Knight, the Morel Runner, the Burster and the Rhizomorph. A v1 miss isn't open work, but R2a's G2 should watch the archer under the kept pieces.

**Not measured, or left for later:** `--proto rework` (refused, not R1's variant); the late-run colony and the three-lane screen are leads outside the bars (in the screens table); and R2-Q13's table is on today's combat, not on R2a's set.

## Until R2

- **The guardrails** in `npm run test:slow` are still v1's, and they measure the v1 battle.
  - Keep them passing after a code change.
  - Don't tune the v1 battle to improve them, because R2 replaces it.
  - A v1 miss isn't open work.
