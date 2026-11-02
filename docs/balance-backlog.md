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
- **Jitter:** ±0.2 tiles, with the jitter-free run beside it. The two agree to within 6 points on every pooled G3 mean (the widest, Amanita Lodge, 30% against 24%), and give the same G3 and G12 verdicts.

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

## Until R2

- **The guardrails** in `npm run test:slow` are still v1's, and they measure the v1 battle.
  - Keep them passing after a code change.
  - Don't tune the v1 battle to improve them, because R2 replaces it.
  - A v1 miss isn't open work.
