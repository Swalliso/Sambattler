# Measuring the develop build: did the combat rework change the engagement picture?

> **Archived: v1 era.** Written before [SPEC v2](../../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../../README.md)).

Evidence for [After the combat rework](../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): the fresh headless measurements. Written by an agent during that review; nothing here is adopted. Recovered from the session transcript: the scripts are in [scripts/measure/](scripts/measure/), and the raw data and aggregated tables weren't kept.

Measured 2026-10-31 on `develop` at `ef2e133` (a separate checkout), headless, with no tracked file changed. Bots are not people: every number below describes pacing and structure under `bot:balanced`, not how a human will play or feel. The "Bots and people" section says where that matters.

## Short answer

- **The rework trades one quiet opening for another.** Fighting starts sooner and is bigger: the first unit dies at 0:32 instead of 0:43, about 50% more supply is on the field from 1:00 on, and there are 3× the merges. But the front line, the game's main readout, now moves later: the first column flips at a median 2:02 instead of 1:01, and 27% of battles have no flip by 3:00 (1% on M5). Against the Lichen Baron that's 50%. Waves cause all of it: `rework,waves:null` puts the first flip back at 1:03.
- **The Heartcap cliff is steeper under the rework.** A beaten Heartcap falls 12 s after its first hit, against 18 s on M5, because the winner arrives with 56 supply instead of 34. `breach` stretches that to 31 s on the rework, against 46 s on M5.
- **Comebacks are still zero.** The winner's Heartcap fell to ⅔ in 0 of 720 battles under `rework`, and 0 of 720 under `rework` with all of step B. The loser has 1 building and 0 units when its Heartcap is first hit. Its army falls behind about 2 minutes before the end, while it still has 5–6 buildings and about 100 gold.
- **The front line doesn't show who's winning.** From 2:00 to 4:00, the side holding more ground goes on to win only 37–44% of battles, on both rule sets. A material count (buildings, bank and army) names the winner 58–79% of the time. Territory only starts to predict the winner in the last fifth of a battle.
- **Under the rework, runs are decided in battle 1.** Battle-1 losses rise from 35% to 52%, 60% of run defeats come in battle 1, boss reach falls from 34% to 23%, and boss fights won rise from 67% to 88%. Armilla and Cordis carry the loss (61% and 56% of battle 1s lost). Vesper doesn't (38%). Waves are the cause again: without them, battle 1 is lost 38% of the time.
- **Step B on top of the rework repairs the run curve, but not the battle.** With `hotstart` and `bigdrafts`, battle 1 is lost 25% of the time and runs are won 39% of the time. But the boss becomes a formality (95% won), the commander gap widens (Vesper wins 58% of runs, Armilla and Cordis 29–30%), and the battle numbers don't move. `breach` changes nothing in runs.
- **Placement matters even less under the rework.** At 3:00 the best plot beats the median by 5% of a building's worth, against 25% on M5. The player has 14 legal plots instead of 56, because the front hasn't moved.

## What was run

### Variants

| Label | `--proto` | What it is |
|---|---|---|
| base | none | M5 rules: Hold / Advance, commanders and powers |
| rework | `rework` | the P3 playtest package: waves, mixed-wave shields, pinning, call for help, Rhizomorph, Burster, no Elder splash, storm waves, swarm read, flyers under rule C |
| rwB | `rework,hotstart,bigdrafts,breach` | (c) step B's three battle-feel prototypes on the rework |
| rwbreach | `rework,breach` | (d) |
| rwhb | `rework,hotstart,bigdrafts` | step B's likely adoption (per the One More Run review), without `breach` |
| stepB | `hotstart,bigdrafts,breach` | step B on M5, to reproduce the step B table |
| rwnowaves | `rework,waves:null` | a diagnostic: the rework without waves. Removing waves also removes the shields and the storm waves, which need them |

### Seeds and sample sizes

- **Single battles:** `bot:balanced` with each commander (Vesper, Armilla, Cordis) and power policy `auto`, against each battle-1 general (scripted, Old Mother Mold, Lichen Baron, Blightwright) on Bogwater Hollow.
  - Seeds 1–60, so 60 × 4 × 3 = **720 battles per variant**.
  - The official check's numbers use seeds 1–30, 360 battles, the same cell as step B and P2.
- **Runs:** `bot:balanced`, greedy drafts, random route, auto power.
  - Seeds 1–200 per commander, **600 runs per variant**.
  - The official check uses seeds 1–100, 300 runs, the same as step B.
- **Error bars:** proportions show ±1.96·SE. That's about ±4 points at n = 600–720, and about ±5 at n = 300. Medians show bootstrap 95% intervals in brackets.
- **Placement spread:** the tool's defaults. Bogwater Hollow, `bot:balanced` against `general:scripted`, board seeds 1–3, paused at 1:00 and 3:00, five buildings, a 90 s horizon and 8 futures.

### Reproduction check

The harness reproduces the repo's documented numbers exactly.
- **Official tool, base, Vesper:** 80 / 47 / 87 / 80% wins, medians 5:50 / 6:19 / 6:51 / 5:42, first flips 1:40 / 1:09 / 0:34 / 0:34. That's identical to the "today" rows in the backlog's P1 and P2 sections.
- **Official tool, runs (300):** base battle 1 lost 33%, battle 2 35%, won 24%. `stepB` gives 16%, 20% and 44%. Both are identical to the step B table in `docs/archive/v1/ideas/one-more-run-review.md` § Step B results.
- **Spread, base:** worth 8.8 / 17.4, best − median +0.0 / +4.1 (25%), split-half ρ 0.21 / 0.31, 6 / 56 legal plots. Identical to the backlog's "Placement spread (step C's baseline)" table.
- **My script ([`fun.ts`](scripts/measure/fun.ts)) against the official checks:** seeds 1–30 and runs 1–100 match bit for bit (base and rework, Vesper: the same wins per general and the same battle-1 losses, boss reach and victories). The larger samples below are a strict superset.

### Commands

From the repo root, at `ef2e133`:

```bash
# official engagement + runs check, one process per variant × commander (18 jobs, 6 at a time)
npx tsx tools/experiment.ts [--proto <spec>] --checks engagement,runs --seeds 30 --runs 100 \
  --commander <vesper|armilla|cordis> --power-policy auto --label fr-<variant>-<commander>

# placement spread, one process per building (the same as one `--checks spread` with defaults)
npx tsx tools/experiment.ts [--proto rework] --checks spread \
  --spread-buildings <gillNest|sporelingBurrow|capguardHall|puffballMortar|truffleCellar> --label fr-spread-<variant>-<building>

# larger samples and extra pacing numbers (the review's own scripts, now in docs/archive/v1/ideas/after-the-rework/scripts/measure/; they import the repo's sim, tools/lib/run.ts and content.ts)
S=docs/archive/v1/ideas/after-the-rework/scripts/measure; M=reports/after-the-rework/measure
npx tsx $S/fun.ts  --proto <spec> --commander <c> --seeds 60 --runs 200 --out $M/data/<variant>-<c>.json
npx tsx $S/fun2.ts --proto <spec> --commander <c> --seeds 60 --out $M/data/ts-<variant>-<c>.json   # 10 s time series
python3 $S/analyze.py ; python3 $S/analyze_ts.py ; python3 $S/official.py
```

- **Compute:** about 20 minutes of wall time, at most 6 processes at once.
- **Speed:** a commander's engagement and runs take 35–240 s, under load from other agents. A spread building takes 20–40 s.
- **Where the output is** (raw output not kept):
  - official reports in `reports/experiments/fr-*.json` (gitignored);
  - the scripts' raw data in `$M/data/` (gitignored);
  - aggregated tables in `$M/tables_all.md`, `$M/ts.md` and `$M/official.md`.

### Definitions and caveats about the tools

- **"Supply on the field"** in the official `engagement` check comes from `supplyUsed`. Under waves that also counts units waiting inside buildings (`spawning.ts:41`: "already counting toward supply"). My numbers sum the units actually on the field, with the official figure in parentheses.
  - The two differ under the rework at 0:30 (4 against 8) and at 5:00 (39 against 44).
  - The P1 and P2 tables' "supply at 5:00" for the rework is a little inflated.
- **Single battles have drafts off** (`DEFAULT_FLAGS.drafts: false`), so `hotstart` and `bigdrafts` only act in runs.
  - In single battles, `rwhb` equals `rework` and `rwB` equals `rwbreach`, bit for bit.
- **Single battles are Bogwater Hollow only.** Runs play the whole map pool.
- **"Lead"** is the territory lead: for each lane, `pBorder + eBorder − (width − 1)` from the 1 s front samples, summed over lanes. It's 0 at the start, and positive means the player holds more.
  - A lead change is a sign flip between non-zero leads.
  - A "comeback" here means the winner's Heartcap fell to ⅔, as in the engagement check.
- **"Material"** is building value (cost × HP fraction) plus the bank plus 25 × field supply, per side. It's a rough "who's actually ahead" measure, not a tuned one.
- **The bot's commands per minute** count its placements, sells, stances, powers and draft picks. Under waves the AI never holds (`proto.ts` WAVES comment), so stance commands drop to 0 whatever a person would do.

## Results

### Single battles (720 per variant; Bogwater; 3 commanders × 4 generals × 60 seeds)

`rwhb` equals `rework` here and `rwB` equals `rwbreach` (drafts are off in single battles), so those columns are folded together.

| Measure | base (M5) | rework | rework + breach (= rwB) | rework − waves | stepB (M5 + B) |
|---|---|---|---|---|---|
| Player (`bot:balanced`) wins | 64% ±4 | 62% ±4 | 62% ±4 | 69% ±3 | 65% ±3 |
| Decisions | 3% ±1 | **9% ±2** | 10% ±2 | 11% ±2 | 4% ±1 |
| Median length | 6:14 [6:05–6:26] | **7:08** [7:01–7:17] | 7:25 [7:18–7:33] | 6:48 [6:38–7:02] | 6:45 [6:37–6:55] |
| First column flip (median) | 1:01 | **2:02** | 2:02 | 1:03 | 1:01 |
| No flip by 3:00 | 1% ±1 | **27% ±3** | 27% ±3 | 2% ±1 | 1% ±1 |
| First flip before 1:30 (the review's target) | 80% | **29%** | 29% | — | 80% |
| Column flips by 3:00 (median) | 7 | **2** | 2 | 7 | 7 |
| Column flips per battle (median) | 28 | 29 | 30 | 30 | 30 |
| First unit death (median) | 0:43 | **0:32** | 0:32 | 0:43 | 0:43 |
| First building lost (median) | 3:58 | 4:49 | 4:49 | 4:20 | 3:58 |
| Field supply, both sides, at 0:30 / 1:00 / 2:00 / 3:00 / 5:00 | 7 / 11 / 13 / 17 / 26 | 4 / **14 / 19 / 24 / 39** | same as rework | 7 / 11 / 13 / 16 / 22 | 7 / 11 / 13 / 17 / 26 |
| Units on the field at 1:00 / 2:00 / 5:00 | 8 / 8 / 16 | 11 / 13 / 24 | same | 7 / 8 / 15 | 8 / 8 / 17 |
| Per-side field supply at 2:00 (player / general) | 6 / 6 | 8 / 11 | same | — | 6 / 6 |
| Both sides at 10+ supply at 2:00 (the review's target) | 1% | 18% | 18% | — | 1% |
| Peak field supply, both (median) | 43 | **62** | 62 | 42 | 44 |
| Unit deaths per minute (median) | 26 | 27 | 28 | 31 | 27 |
| Merges per battle, both (median) | 24 | **80** | 84 | 24 | 27 |
| Bot commands per minute (median) | 2.9 | 2.1 | 2.2 | 2.9 | 3.0 |
| Bot builds per minute (median) | 1.5 | 1.5 | 1.6 | 1.5 | 1.6 |
| Longest stretch without a bot command (median) | 58 s | 64 s | 65 s | 61 s | 60 s |
| Player gold banked at 1:00 / 2:00 / 3:00; peak | 77 / 81 / 103; 250 | 44 / 74 / 90; 265 | 44 / 74 / 90; 294 | 53 / 86 / 92; 267 | 77 / 81 / 103; 285 |
| Territory lead changes per battle (mean) | 0.97 | 0.90 | 0.93 | 1.10 | 1.04 |
| Battles with ≥1 lead change | 57% ±4 | 54% ±4 | 57% ±4 | 61% ±4 | 61% ±4 |
| First side to lead the front wins | **40% ±4** | **45% ±4** | 46% ±4 | 39% ±4 | 40% ±4 |
| Last territory lead change (median) | 2:25 | 4:06 | 4:27 | 2:41 | 2:59 |
| Share of the battle after the last lead change | 59% | 37% | 36% | 58% | 56% |
| Winner was ever ≥4 columns behind | 61% ±4 | 48% ±4 | 48% ±4 | 62% ±4 | 61% ±4 |
| Loser's Heartcap, first hit → dead (median, routs) | 18 s [17–18] | **12 s** [12–13] | 31 s [30–32] | 17 s [16–18] | **46 s** [44–47] |
| Loser's Heartcap, ⅔ → dead | 9 s | **6 s** | 24 s | 8 s | 35 s |
| Routs where the fall takes ≥45 s (the review's target) | 8% | 4% | 18% | — | 52% |
| Loser's first building lost → dead | 112 s | 122 s | 142 s | 116 s | 142 s |
| Loser at its Heartcap's first hit: buildings / units / supply | 1 / 0 / 0 | 1 / 0 / 0 | 1 / 0 / 0 | 1 / 0 / 0 | 1 / 0 / 0 |
| Winner's army at that moment (units / supply) | 20 / 34 | 21 / **56** | 21 / 56 | 22 / 33 | 20 / 34 |
| Winner's Heartcap untouched | 719 / 720 | 719 / 720 | 719 / 720 | 718 / 720 | 716 / 720 |
| **Comebacks** (winner's Heartcap fell to ⅔) | **0 / 720** | **0 / 720** | **0 / 720** | 2 / 720 | 3 / 720 |
| Breach events per battle | 0 | 0 | 1.8 | 0 | 1.95 |

#### Per general (median or rate over 180 battles: 3 commanders × 60 seeds)

| Variant | General | Wins | Decisions | Median | First flip | No flip by 3:00 | Field supply 1:00 / 2:00 / 5:00 | First leader wins | First hit → dead |
|---|---|---|---|---|---|---|---|---|---|
| base | scripted | 64% | 2% | 6:40 | 1:17 | 3% | 9 / 12 / 25 | 48% | 16 s |
| base | Old Mother Mold | 45% | 4% | 6:24 | 1:08 | 1% | 11 / 14 / 25 | 44% | 18 s |
| base | Lichen Baron | 77% | 4% | 6:35 | 0:34 | 1% | 10 / 11 / 25 | 38% | 16 s |
| base | Blightwright | 70% | 1% | 5:38 | 0:34 | 0% | 14 / 15 / 26 | 30% | 20 s |
| rework | scripted | 73% | 6% | 7:19 | 2:02 | 23% | 12 / 16 / 38 | 46% | 11 s |
| rework | Old Mother Mold | 40% | 1% | 6:36 | 1:22 | 7% | 16 / 20 / 36 | 39% | 15 s |
| rework | Lichen Baron | 72% | **22%** | 7:50 | **2:55** | **50%** | 12 / 16 / 42 | 56% | 10 s |
| rework | Blightwright | 62% | 8% | 6:58 | 2:14 | 28% | 17 / 22 / 41 | 41% | 13 s |
| rework + breach | scripted / Mold / Baron / Blightwright | as rework | 7 / 1 / 23 / 8% | 7:35 / 6:57 / 8:09 / 7:14 | as rework | as rework | as rework | as rework | 28 / 35 / 27 / 33 s |
| rework − waves | scripted / Mold / Baron / Blightwright | 72 / 53 / 84 / 68% | 10 / 12 / 12 / 8% | 7:05 / 7:05 / 7:02 / 6:11 | 1:38 / 1:07 / 0:34 / 0:34 | 4 / 2 / 1 / 0% | about 10–14 / 11–15 / 21–23 | 42 / 54 / 27 / 32% | 15 / 16 / 16 / 21 s |

#### Who's winning, and when it's settled (10 s time series, 720 battles each)

How often the side ahead on each measure at time *t* goes on to win. Ties are excluded; under the rework 98% of battles are still level on territory at 1:00 and 62% at 2:00.

| Leader on | base 1:00 / 2:00 / 3:00 / 4:00 / 5:00 | rework 1:00 / 2:00 / 3:00 / 4:00 / 5:00 |
|---|---|---|
| Territory | 28 / **40 / 37 / 39** / 48% | 23 / **39 / 41 / 44** / 48% |
| Field supply | 43 / 55 / 66 / 78 / 83% | 51 / 60 / 63 / 72 / 79% |
| Building value | 63 / 59 / 64 / 72 / 76% | 58 / 59 / 64 / 70 / 75% |
| Material (buildings + bank + 25 × field supply) | 51 / 58 / 68 / 79 / 84% | 57 / 64 / 70 / 78 / 82% |

- **When the winner pulls ahead for good** (median share of the battle, from the end):

  | Measure | base | rework | rework + breach | rework − waves |
  |---|---|---|---|---|
  | Territory | 17% | 20% | 23% | 19% |
  | Building value | 49% | 47% | 49% | 60% |
  | Material | 53% | 53% | 56% | 59% |

  The point where the winner is ahead to stay doesn't move under the rework.
- **The winner holds more ground when the battle ends** in only 65% of battles on M5 and 80% under the rework.
- **The winner was behind by 30%+ in material** at some point after 1:00 in 22% of battles on M5 and 13% under the rework (also 13% with breach, 17% without waves).
- **The last minutes of a rout:**

  | Measure (median) | base | rework |
  |---|---|---|
  | Loser's field supply, from 3:00 to 0:30 before the end | 7 → 7 → 4 → 0 | 10 → 10 → 8 → 4 |
  | Winner's field supply over the same marks | 9 → 14 → 21 → 28 | 14 → 19 → 27 → 37 |
  | Loser's buildings, 2:00 before the end | 6 | 6 |
  | Loser's buildings, 0:30 before the end | 4 | 4 |
  | Loser's bank throughout | 92–112 gold | 92–112 gold |

  The army gap opens about 2 minutes before the end. The loser still has most of its buildings and a full bank until the last 30 seconds.

### Runs (600 per variant: 3 commanders × seeds 1–200; auto power, greedy drafts, random route)

| Measure | base (M5) | rework | rework − waves | rework + breach | rework + hotstart + bigdrafts | rwB (c) | stepB (M5 + B) |
|---|---|---|---|---|---|---|---|
| Battle 1 lost | 35% ±4 | **52% ±4** | 38% ±4 | 51% ±4 | 26% ±3 | 25% ±3 | 18% ±3 |
| Battle 2 lost (of played) | 34% ±5 | **43% ±5** | 37% ±5 | 43% ±5 | 35% ±4 | 35% ±4 | 21% ±4 |
| Battle 3 lost (of played) | 22% ±5 | 24% ±6 | 25% ±5 | 23% ±6 | 20% ±4 | 20% ±4 | 17% ±4 |
| Run over in battle 1 | 33% ±4 | **48% ±4** | 34% ±4 | 47% ±4 | 22% ±3 | 22% ±3 | 18% ±3 |
| Run over by battle 2 | 56% ±4 | **69% ±4** | 56% ±4 | 68% ±4 | 48% ±4 | 48% ±4 | 34% ±4 |
| Share of all run defeats in battle 1 | 43% | **60%** | — | — | 37% | 35% | 30% |
| Reached the boss | 34% ±4 | **23% ±3** | 31% ±4 | 24% ±3 | 40% ±4 | 41% ±4 | 52% ±4 |
| Won | 23% ±3 | 20% ±3 | 26% ±3 | 21% ±3 | 38% ±4 | 39% ±4 | 42% ±4 |
| Boss fights won | 67% ±6 | **88% ±5** | 82% ±5 | 88% ±5 | **95% ±3** | **95% ±3** | 81% ±4 |
| Won, given battle 1 survived | 34% | 38% | — | — | 50% | 49% | 52% |
| Battles per run (mean) | 2.52 | 2.10 | 2.49 | 2.14 | 2.82 | 2.85 | 3.16 |
| Battle minutes per run (mean) | 14.6 | 13.3 | 15.2 | 14.2 | 16.4 | 17.5 | 18.3 |
| Battle 1 lost vs Old Mother Mold | 51% ±5 | **67% ±5** | 52% ±5 | 66% ±5 | 33% ±5 | 33% ±5 | 31% ±5 |
| Battle 1 lost vs the Lichen Baron | 16% ±4 | **34% ±6** | 20% ±5 | 33% ±6 | 16% ±4 | 16% ±4 | 4% ±2 |
| Run battles ending in a Decision | 2% | 6% | 5% | 7% | 3% | 3% | 1% |
| Run battles: first side to lead wins | 39% | 48% | 39% | 48% | 55% | 55% | 41% |
| Battles lost without ending the run | 15 | 32 | 35 | 38 | 29 | 32 | 9 |
| Winning runs at full Heartcap | 95% | 88% | 88% | 83% | 88% | 83% | 87% |

#### Per commander: battle 1 lost / reached the boss / won (%, 200 runs each)

| Variant | Vesper | Armilla | Cordis |
|---|---|---|---|
| base | 34 / 38 / 28 | 36 / 30 / 19 | 35 / 32 / 20 |
| rework | 38 / 37 / 36 | **61 / 15 / 11** | **56 / 16 / 14** |
| rework − waves | 36 / 38 / 36 | 34 / 28 / 18 | 42 / 26 / 22 |
| rework + breach | 38 / 38 / 36 | 60 / 16 / 12 | 56 / 19 / 16 |
| rework + hotstart + bigdrafts | **9 / 57 / 56** | 31 / 33 / 30 | 36 / 31 / 30 |
| rwB | **9 / 59 / 58** | 30 / 33 / 29 | 36 / 31 / 30 |
| stepB | 11 / 66 / 60 | 20 / 47 / 34 | 24 / 44 / 34 |

#### Battle 1 by general and map, battles lost (all commanders)

| Variant | Mold, Bogwater | Mold, Stumpfield | Mold, Twin Roots | Baron, Bogwater | Baron, Stumpfield | Baron, Twin Roots |
|---|---|---|---|---|---|---|
| base | 75/141 | 44/105 | 46/75 | 13/87 | 18/108 | 13/84 |
| rework | **99/141 (70%)** | 62/105 | **53/75 (71%)** | 28/87 | 37/108 | 30/84 |
| rework + hotstart + bigdrafts | 49/141 | 32/105 | 26/75 | 16/87 | 24/108 | 6/84 |
| stepB | 50/141 | 27/105 | 21/75 | 5/87 | 5/108 | 2/84 |

### Placement spread (e): does placement matter more under the rework?

Bogwater, `bot:balanced` vs `general:scripted`, seeds 1–3, five buildings. Under `rework`, seed 2 at 3:00 was skipped for every building ("battle over or fewer than 2 plots"), so 10 cases at 3:00 instead of 15.

| Setting | Paused at | Legal plots (median) | Building worth | Best − median | As % of worth | Split-half ρ | ρ vs depth | Noise |
|---|---|---|---|---|---|---|---|---|
| base | 1:00 | 6 | 8.8 | +0.0 | 1% | 0.21 | −0.30 | ±2.0 |
| base | 3:00 | **56** | 17.4 | **+4.1** | **25%** | 0.31 | −0.31 | ±4.4 |
| rework | 1:00 | 7 | 7.2 | −0.1 | −2% | 0.09 | −0.32 | ±1.6 |
| rework | 3:00 | **14** | 10.6 | **+0.7** | **5%** | 0.33 | −0.45 | ±2.7 |

By building at 3:00 (rework):

| Building | Worth | Best − median | Split-half ρ |
|---|---|---|---|
| Gill Nest | 13.3 | +0.3 | 0.21 |
| Sporeling Burrow | 11.2 | +0.0 | 0.05 |
| Capguard Hall | 16.4 | +1.9 | 0.41 |
| Truffle Cellar | 8.2 | +1.4 | 0.56 |
| Puffball Mortar | 1.5 | −0.4 | 0.09 |

The Mortar is worth almost nothing under the rework: 1.5 supply in 90 s, against 9.7 on M5. Its lobbed shell can't hit flyers, and it no longer has clouds.

## What changed and what didn't

Against `docs/archive/v1/engagement-review.md`'s "What the numbers say" (2026-10-28, before Hold and M5), the Hold prototype E1, and `docs/archive/v1/ideas/one-more-run-review.md`'s step B:

| Engagement-review finding | Pre-Hold (review) | M5 today (base) | Under `rework` | Under `rework` + step B | Verdict |
|---|---|---|---|---|---|
| Quiet opening: first flip | 2:17–4:15 by general; no flip by 3:00 in 30–83% | 0:34–1:17; 1% | 1:22–2:55; **27%** (50% vs Baron) | same as rework | **Partly back.** The rework gives back about half of Hold's gain on the territory readout. Combat starts sooner and is bigger, though |
| Trickle fights: field supply | 8–13 at 1:00, 15–20 at 3:00, 25–29 at 5:00 (`supplyUsed`) | 11 / 17 / 26 | **14 / 24 / 39**; peak 62 | same | **Better.** Fights are about 50% bigger, and merges triple. Neither side is at 10+ supply at 2:00 in most battles (18%) |
| Few decisions (bot proxy) | about 2 per minute | 2.9 per minute (1.5 builds) | 2.1 per minute (1.5 builds; no stances) | 2.2 | **Unchanged** for builds. The drop is the bot not holding under waves. About a minute with no affordable action in every variant |
| Heartcap cliff: first hit → dead | 13–20 s | 18 s (⅔ → dead 9 s) | **12 s (6 s)** | **31 s (24 s)** with `breach` | **Worse under the rework.** `breach` helps less than on M5 (46 s), because a bigger army arrives |
| Winner's Heartcap never touched | 120 of 120 | 719 of 720 | 719 of 720 | 719 of 720 | **Unchanged** |
| Comebacks | none | 0 of 720 | 0 of 720 | 0 of 720 | **Unchanged.** Step B on M5 manages 3 of 720 |
| First side to lead the front wins | 30–57% | 40% | 45% | 46% | **Unchanged, and the readout misleads:** holding ground anti-predicts the winner until late |
| Run decided early | 41% end in battle 1; boss loses 80% | 33% in battle 1; boss fights won 67% | **48%** in battle 1; boss fights won **88%** | 22% in battle 1; boss fights won **95%** | **Worse under the rework, fixed by step B,** but the curve stays inverted |
| Placement doesn't matter (step A) | — | 25% of worth at 3:00, ρ 0.31 | **5%** of worth, ρ 0.33; 14 plots | — | **Worse** |
| Battle length / G4 | — | 6:14, 3% Decisions | 7:08, 9% (22% vs Baron) | 7:25, 10% | Longer and more Decisions, inside G4's band |

Against step B's table (300 runs, reproduced exactly on M5):
- **On M5,** step B gives battle 1 lost 33% → 16%, battle 2 35% → 20%, runs won 24% → 44%, and a fall time of 18 s → 45 s.
- **On the rework,** the same three knobs give battle 1 52% → 24–25%, battle 2 43% → 32–35%, runs won 18–20% → 39–41%, and a fall time of 12 s → 31 s.
  - Step B cuts about 27 points from the rework's battle 1, against 17 on M5.
  - It ends higher on battle 1 (25% against 18%), on battle 2 (35% against 21%) and on the boss (95% won against 81%).
- **The step B review's comeback note** ("2 in 360") holds on M5 (3 in 720). Under the rework it's 0 in 720, even with `breach`.

Against P2's engagement and runs tables (the package before flyers and the swarm read):
- **Battle-1 run endings:** 108 of 240 (45%) for P2's package, 147 of 300 (49%) for today's `rework` with the official tool. That's within noise, so flyers and the swarm read add little to the battle-1 problem.
- **Vesper's win rates:** 90 / 37 / 83 / 83% then, 90 / 40 / 80 / 63% now. The Blightwright drop (−20) is the largest change. It's 30 seeds, about ±17 points, so treat it as a lead.

## Findings that matter for fun

1. **The rework moves the first column flip from 1:01 to 2:02, and brings back battles where the front doesn't move for 3 minutes** (1% → 27%; 50% against the Lichen Baron). Waves cause it: without them it's 1:03 and 2%.
   - This isn't a return to trickle fights. The first unit dies 11 s sooner (0:32), field supply is about 50% higher at every mark (19 against 13 at 2:00, 39 against 26 at 5:00), and merges triple (80 against 24).
   - The waves meet and grind in the middle, so the opening is quiet on the readout but not on the field.
   - Whether a player reads clashing waves as action while the tug sits still is a playtest question. It's the "Do the waves give a battle rhythm, or make it feel less alive?" question in P3.
2. **The Heartcap cliff gets steeper, and `breach` stretches it less on the rework.**
   - A beaten Heartcap falls in a median 12 s (⅔ → dead 6 s), against 18 s (9 s) on M5. The winner's army at the first hit is 56 supply, against 34.
   - `breach` gives 31 s (24 s from ⅔), against 46 s (35 s) on M5.
   - Only 18% of rework routs meet the review's 45 s target with `breach`, against 52% on M5.
   - If `breach` is adopted with the rework, its shield and pulse need scaling to wave size.
3. **Comebacks are still about 0: 0 of 720 under `rework`, with or without step B.**
   - The structure is the same everywhere: at its Heartcap's first hit, the loser has 1 building, 0 units and 0 supply.
   - The army gap opens about 2 minutes before the end. On M5 the loser's field supply goes 7 → 4 → 0 while the winner's goes 14 → 21 → 28. The loser still has 5–6 buildings and about 100 gold until the last 30 s.
   - Material comebacks (the winner 30%+ behind at some point after 1:00) fall from 22% to 13% under the rework.
   - A comeback rule that fires at the Heartcap acts after the loser has nothing left. The window where a losing side still has buildings and gold is from about 2:00 to about 0:30 before the end. That's where a "last stand" would have something to act on.
4. **The front line doesn't show who's winning, on either rule set.**
   - The side holding more ground at 2:00, 3:00 or 4:00 goes on to win only 37–44% of battles (excluding ties). A material count gets 58–79% right.
   - The first side to lead the front wins 40% (M5) and 45% (rework). The territory lead only settles in the battle's last 17–23%. When they win, 20–35% of winners don't hold more ground than the loser: 31% hold less on M5, and 16% under the rework.
   - That repeats the engagement review's "first leader wins 30–57%", with an explanation. Pushing forward costs: comeback gold goes to the side holding less, forward buildings cost more, and the pushing army walks into turrets. So the tug swings (57–61% of battles have a lead change) without meaning anything.
   - For a player this is a readability problem as much as a balance one. The main readout tells them they're winning shortly before they lose. Playtest question: "Could you tell who was winning? When did you know you'd lost?"
5. **Under the rework, battle 1 decides the run.**
   - **Battle 1:** lost 35% → 52% of the time; runs over by battle 2: 56% → 69%; 60% of all run defeats now come in battle 1.
   - **Battle 1 by general:** Old Mother Mold wins 67% of battle 1s (70% on Bogwater and on Twin Roots), and the Lichen Baron doubles to 34%.
   - **Battle 1 by commander:** Armilla loses 61%, Cordis 56%, Vesper 38%.
   - **The boss gets easier:** boss fights won go from 67% to 88%, so the difficulty curve inverts further.
   - **Waves are the cause:** without them, battle 1 is lost 38% of the time and the run curve looks like M5's. That confirms P2's finding with flyers and the swarm read in.
6. **Step B's hot start and bigger drafts largely repair the rework's run curve, but they widen the commander gap and make the boss a formality.**
   - **With `hotstart` and `bigdrafts` on the rework:** battle 1 is lost 25–26% of the time, runs are won 38–39%, and runs last 16.4–17.5 battle minutes instead of 13.3.
   - **Commanders:** Vesper loses battle 1 9% of the time and wins 56–58% of runs. Armilla and Cordis lose battle 1 30–36% of the time and win 29–30%. Under the rework, choosing Armilla or Cordis halves your run.
   - **Boss fights won: 95%.**
   - **`breach` adds nothing to runs.** `rework,breach` is within ±1 point of `rework` on every run measure.
7. **Placement matters even less under the rework.**
   - At 3:00 on Bogwater, the best plot is worth 5% of the building more than the median, against 25% on M5. Split-half ρ stays at noise (0.33).
   - The player has 14 legal plots instead of 56, because the front hasn't moved; seed 2 had fewer than 2.
   - The Puffball Mortar's 90 s worth falls from 9.7 to 1.5 supply.
   - Under waves, the board narrows and "where" matters less. Colony-swarm's step C, if it comes back, has a harder baseline under the rework.
8. **The number of decisions doesn't change.**
   - The bot builds about 1.5 times a minute in every variant, and every variant has about a minute-long stretch with nothing to do (58–65 s median).
   - Commands per minute fall from 2.9 to 2.1 under the rework only because the AI never holds under waves (3–6 stance commands a battle on M5, 0 under waves).
   - For a person, waves turn Hold into a per-beat choice (one 20 s beat at a time), which the bots can't measure.
9. **Battles run longer and stall more against defensive generals.** The median goes from 6:14 to 7:08 (7:25 with `breach`), and Decisions from 3% to 9%: 22–23% against the Lichen Baron, whose median first flip is 2:55.

## Bots and people

- **`bot:balanced` is a greedy builder.** It places whenever it can afford a plot. Its 1.5 builds a minute is an affordability cadence: an upper bound on build decisions, not a count of interesting ones.
  - The engagement review's human run made the first purchase at 1:07 and ended with 801 gold unspent.
  - The bots bank about 250–300 gold at peak in every variant.
- **The AI never holds under waves, so the bot sees none of what Hold becomes under the rework.** A person can hold a lane's wave for a beat to stack two waves, or to answer a counter warning. The 2.9 → 2.1 drop in commands is the bot's, not the player's.
- **The bots don't read the general's counter warnings, don't sell, draft greedily and take random routes.**
  - A person who reads a warning and answers it may lose battle 1 less often than 52%. A new player may lose it more.
  - The battle-1 numbers say where the difficulty sits relative to the boss, not what a person's battle-1 win rate will be.
- **Comebacks may be likelier for a person,** through power timing, Hold, selling and re-building. But the structure the bots expose holds for everyone: nothing in the rules gives the losing side anything back, and its army is gone about 2 minutes before its Heartcap is touched.
- **"The front line misleads" is a readability claim that only a person can confirm.** The bot doesn't look at the tug; the playtester does.
- **Feel questions** need the playtest: whether waves feel like rhythm, whether 12 s or 31 s endings feel like a cliff or a siege, and whether flyers and clouds read clearly.
- **Commander gaps may differ for people.** The bot's `auto` power policy may use Armilla's Rhizome Tithe (gold per column held) and Cordis's Puppet Bloom (merges trios) worse than a person, and both suffer under waves: the front moves later, and nearly everything already merges.

## What the playtest could check, given these numbers

- **The first two minutes:** does a battle with no column flipped by 2:00 still feel active? Compare battles against the Lichen Baron and Old Mother Mold.
- **The readout:** "could you tell who was winning at 3:00?", and "when did you know you'd lost?". Note how long before the end that was.
- **The cliff:** with `?proto=rework` alone, does a 12 s ending feel abrupt? With `?proto=rework,breach`, does 30 s feel like a siege?
- **Battle 1:** play Armilla or Cordis into Old Mother Mold under `?proto=rework`. The bots lose 61% and 56% of battle 1s.

## Tooling notes for whoever measures next

- The `engagement` check's "supply on field" counts units waiting inside buildings under waves (`supplyUsed`). A units-on-field sum would be cleaner. [`fun.ts`](scripts/measure/fun.ts) shows one.
- The `engagement` check has no "who's winning" measure. Leader-on-territory against leader-on-material at fixed clocks ([`analyze_ts.py`](scripts/measure/analyze_ts.py)) is cheap, and it's the clearest number here for the readability problem.
- The `engagement` check plays single battles with drafts off, so `hotstart` and `bigdrafts` only show in `runs`.
- With `--workers` ignored for `engagement` and `runs`, the fastest way to run them is one process per commander, as P2 did.

## Files

- Report: this page.
- Scripts, in [scripts/measure/](scripts/measure/):
  - [`fun.ts`](scripts/measure/fun.ts)
  - [`fun2.ts`](scripts/measure/fun2.ts)
  - [`analyze.py`](scripts/measure/analyze.py)
  - [`analyze_ts.py`](scripts/measure/analyze_ts.py)
  - [`official.py`](scripts/measure/official.py)
- Aggregated tables (raw output not kept):
  - `tables_all.md`
  - `ts.md`
  - `official.md`
- Raw data: the scripts' `data/` folder (raw output not kept)
- Official reports: `reports/experiments/fr-*.json` (gitignored; raw output not kept)
