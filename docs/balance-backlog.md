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

- **The pace after T125** (R2a S18, below): at 100 a supply, agreed on 2026-11-03, battles take a median of 7 rounds, 18.5% of 200 reach round 9 (G4: ≤ 20%), and the damage cap binds in 70% of damaging rounds. S21's playtest reads whether a win's size still counts.
- **The round guardrails that miss on the final data** (R2a S20, confirming S18's, below): G1, G2, G3, G7, G8's mono drops and G16 (the formation rule loses to its ranks traded). Each waits for the user, G16 best before S21.
- **A fixed round cap** (R2a S21b, below; measurement only): a fixed 750 for both sides passes G4, G6, G8's bands and G13 (6 rounds, 13% reach round 9); a fixed 500 fails G4 (34%). Today's 25% is even in capped rounds (4 each). For R2b's S0.
- **The Morel Runners** (R2a S21b, below): intended under §5.2, not a bug. A pair charges in a column, so it reads as one runner, and the runners that "pushed in to the enemy base" were striking the invisible Mortar that T160 fixed. A fan-out rule would be the user's call.
- **G16 after the Burster moved to the front** (R2a S21b, below; the user's OK, 2026-11-03): 40%, from 24%. The Gill Archer and Mortar pairs are what's left (55% and 26%), and only a 2-tile gap fixed them in the levers' entry. They wait for the playtest's calls and R3's combos.
- **Step 3's round-9 limit** (R2a S20, below): SPEC §16 R2 step 3 still says 15%, where G4's agreed band says 20% over 200 battles. Its 40 battles read 15%, at the limit.
- **X8's readouts** (R2a S15, below): your colony is full from round 5, and once both colonies are full, half the clashes replay the last one. They go to S18's pace call and S21's playtest, with X8's two knobs still off.
- **Gill Archers tie Swarm and Ranged** (R2a S15, below): the noise, not #14's tie order, picks between them. A rule change waits for the user.
- **The Burster's seat effect** (R2a S17, below): a mirror of Bursters goes to whichever side's ids come first. A rule change waits for the user.
- **The first fighting tick's frame in Chromium** (R2a S17, below): 4.8–11.4 ms once a page, against §13.7's 8 ms.

## R2a S21b · a fixed round cap, for R2b's S0 (2026-11-03)

**Measured** (T163; no rule changed):
- **What:** today's cap is 25% of the loser's max HP (X5): you deal at most 500 to the general's 2,000 and take at most 750 on your 3,000, which the user finds asymmetric. A fixed cap of 750 HP and one of 500 HP, for both sides, against it.
- **The guardrails:** G4 over 200 battles (`bot:balanced` against the scripted general on Bogwater Hollow), G13 over the same battles, G6 and G8.
- **Where:** `feature/r2a-playtest-fixes`, with T159's Burster in front, at 100 a supply.
- **How:** `npm run experiment -- --rounds --checks g4,g6,g8`, with `--proto 'rounds.roundDamageCap:{"flat":750}'` or `{"flat":500}`. S18's `roundDamageCap.flat` already takes a fixed cap, so no knob was added and no replay hash moves.

**Result:**

| Round cap | G4: median rounds · reach round 9 · the bot wins | The cap binds, of rounds with damage | G13: capped · median clash | G6: behind side wins · winner hit | G8: `bot:balanced` · `bot:answer` |
|---|---|---|---|---|---|
| Today: 25% of the loser's max HP (500 / 750) | 7 · 16% · 63% | 70% (781 of 1,115) | 9% · 19.0 s | 36% · 72% | 50% · 67% |
| **Fixed 750 for both** | 6 · 13% · 65% | 61% (612 of 999) | 9% · 18.4 s | 36% · 71% | 53% · 70% |
| Fixed 500 for both | 7 · **34%** (fails ≤ 20%) · 65% | 76% (913 of 1,204) | 8% · 19.1 s | 33% · 72% | 50% · 67% |

G8's mono clause fails under all three, as it did before (no asserted mono drops 20 points). Noise on 200 battles is about ±3 points.

**Reading:**
- **Today's cap is symmetric in rounds, not in HP.** Each side needs 4 capped rounds to fell the other: 2,000 / 500 and 3,000 / 750.
- **A fixed 750** raises only the general's cap, so you can fell it in 3 capped rounds while it needs 4 to fell you. Battles get shorter (a median of 6 rounds, 13% reach round 9), the cap binds less often, and every band holds. The bot's 63% → 65% is within noise.
- **A fixed 500** lowers only yours, so the general needs 6 capped rounds to fell you. A third of battles then reach round 9, which fails G4.
- **Either way the race tilts toward you** in rounds, where today's is even. Over a run, R2b's lives and the general's larger Heartcaps at bosses would read the tilt differently.

**For R2b's S0:**
- If the user wants one number, a fixed 750 passes every band measured.
- Keeping 25% keeps the race even in capped rounds. The HUD could show the cap as a share, "25% of max HP", rather than as two HP numbers.
- G14 and G15, lives and bosses, weren't measured here. They're R2b's.

## R2a S21b · the Morel Runners, diagnosed (2026-11-03)

**The user's note** (playtest, 2026-11-03): "the Morel Warren runners have a hard time pathfinding properly and even though there are two units, they only seem to attack one at a time when matching up against Capguards and Rootbreakers. This typically ends with the units pushing all the way in to the enemy base."

**Measured** (T162; no code or data changed):
- **A traced clash:** two Morel Warrens against a Capguard Hall and a Rootbreaker Den, each in front, on Bogwater Hollow, tick by tick: positions, targets and attack ticks. Again with merging off, and with a Puffball Mortar behind the general's front.
- **Whole battles:** `bot:mono:morelWarren` against the scripted general, seeds 1–20 (138 clashes), with `bot:mono:sporelingBurrow` as the baseline: what each runner targets each tick, how often it attacks, and how often it stands past the enemy's living front line.
- **A capture** of the traced clash at tick 100 (`npm run screenshot`, from a scenario kept out of the commit).

**What happens:**
- **Both runners of a pair attack.** Each Warren's 6 runners knit into 2 Bloomed runners, and the 4 pair off 2-on-1 against the Bloomed Capguard and Rootbreaker. The front runner of a pair attacks every 18 ticks from tick 68, and the rear one from tick 92, every 18 ticks too.
- **Why it reads as one at a time:**
  - The two Bloomed runners knit one behind the other in their slot, at nearly the same height, so they charge their target in a column.
  - The front one stops in contact. The rear one stops at the end of its reach, 0.40 tiles from the target, which is its range, directly behind its partner. Their sprites overlap in the capture, so the pair looks like one runner.
  - The Capguard and the Rootbreaker stick to the front runner until it dies (§5.2's stickiness), so the pair dies one at a time. The rear runner sits at full HP until then.
- **Pathing:** the runners walk straight at their targets, as §5.2 has every unit do (there's no pathfinding). They don't fan out around a target, and nothing jitters: the rear runner holds still once in reach.
- **Past the front line, and to the base:**
  - In whole battles, a runner stands more than half a tile past the enemy's living front line in 0.8% of its ticks (the Sporeling: 1.9%).
  - It aims at an emplacement in 4.9% of its ticks (the Sporeling: 9.9%), in 24 of the 50 clashes where the general fielded one. A runner that wins its fight seeks the nearest enemy, and that is often the general's back rank or its Mortar, at the general's end of the field.
  - Until T160, the Gray Rot's Mortar was invisible in the clash. So runners that won their fight ran to the general's end and struck empty ground, which fits "pushing all the way in to the enemy base".
  - With merging off, 12 runners crowding a lone Capguard shove it about 2 tiles back toward the general's colony over 5 s, by separation alone. With merging on (the default), nothing was shoved.

**Verdict:** intended under §5.2's rules, not a bug in movement or targeting, so nothing was fixed. The part that looked broken, runners striking empty ground near the general's colony, was T160's invisible Mortar.

**For the user** (a rule or stat change each, not made):
- **Readability:** a pair that charges in a column reads as one runner. A rule could have melee units fan out to a free side of their target, or put knit units side by side in the slot. Either changes how every melee squad moves, so it's a rule change.
- **The runners' role:** at speed 1.8 they reach the enemy's front well ahead of the rest of your army and fight it alone. That fits §11.2's "Fast swarm", but it's why they die first against Capguards and Rootbreakers.

## R2a S21b · the Burster in the front line (2026-11-03)

**Measured:**
- **What:** G16 (§12.3) after T159's rule change, which the user approved on 2026-11-03: §7.3's back-line tags lose `burst`, so a Burster Pod stands in the front rank and Burster pairs are same-role. G3, G4, G12 and G13 were read for side effects.
- **Where:** `feature/r2a-playtest-fixes`, from `develop` at 2563235, at 100 a supply.
- **How:** `npm run experiment -- --rounds --checks formation`, then `--checks g3,g4,counters`.

**Result:**

| | Before (the levers' entry, below) | After |
|---|---|---|
| G16, role-split pairs | 24% of 2,298 clashes | **40%** of 1,664 (by budget: 36, 45, 36, 42, 41%) |
| Gill Archer behind | 51% | 55% (a Burster in front 82%) |
| Puffball Mortar behind | 24% | 26% (a Burster in front 34%) |
| Burster behind | 0%, 36% of the pool | none: Burster pairs are same-role, at 49% |
| Same-role pairs (reported) | 49–51% | 51% of 3,812 |
| G4 (200 battles) | 7 rounds, 19% reach round 9, the bot wins 59% | 7 rounds, 16%, 63%: pass |
| G13 | 9% capped, 18.6 s | 9% capped, 19.0 s: pass |
| G3 | fails, 8 of 16 monos over, mean of means 32% | fails, 8 of 16 over, 32%; mono Burster 29% (ok) |
| G12 | passes, 6 builds answered | passes, 6 builds answered on every map |

**Reading:**
- **The Burster's part of the miss is gone.** The rule's role-split pairs without a Burster read 38%, as the levers' entry predicted, and the 100 new pairs with a Burster in front and a Gill Archer or Mortar behind read 58%.
- **G16 still misses at 40%.** What's left is the Gill and Mortar pairs, which the hub recommended deciding after the playtest (the levers' entry, item 2). Only a 2-tile gap fixed those.
- **No side effect:** G4, G12 and G13 pass at their old numbers, and G3's fails are unchanged.

**Recommended:** leave G16's other pairs to the playtest's calls and R3's combos, as the levers' entry says. T133 stays unticked while G16 misses.

## R2a · G16's formation levers (2026-11-03, measured for the hub)

**Measured:**
- **What:** G16 (§12.3). It asks that a colony planted by the formation rule beat the same colony with its front and back ranks traded in at least 60% of clashes, pooled over role-split pairs. G3, G4, G12 and G13 were read for side effects.
- **Where:** `develop` at 6f99d2f, at 100 a supply.
- **How:** `npm run experiment -- --rounds` with `--proto` overrides, one lever at a time. No code or data changed.

**Today:** G16 reads 24%. By the back-line building in each pair:
- Gill Archer pairs read 51%;
- tower pairs, which are the Puffball Mortar, read 24%;
- Burster pairs read 0%.

G4 (7 rounds, 19% reaching round 9, the bot winning 59%), G12 and G13 (9% capped, 18.6 s) pass. G3 fails, with 8 of 16 monos over its limit.

| Lever (today's value) | G16 | Gill / tower / Burster pairs | Side effects |
|---|---|---|---|
| The gap between the front ranks, 8 (6) | 22% | 47 / 21 / 1 | G4, G12 and G13 pass; the median clash is 21.0 s |
| Gap 7 | not run: `formationBox` (`src/sim/formation.ts`) needs the field's width less the gap to be even | | |
| Gap 4 (probe) | 29% | 51 / 38 / 1 | G16 only |
| Gap 2 (probe) | 48% | 68 / 82 / 0 | G4, G12 and G13 pass; 12% reach round 9; the median clash is 16.1 s, 1.1 s above G13's floor |
| Gill Archer `aggroRange` 5 (6) | 25% | 54 / 24 / 0 | pass |
| `pinned.rateMult` 0.2 (0.35) | 24% | 51 / 24 / 0 | pass |
| `pinned.radius` 1.5 (1) | 23% | 48 / 24 / 0 | pass |
| `pinned.radius` 3 (probe) | 30% | 68 / 24 / 0 | pass; G3 has 7 of 16 failing |
| `pinned.radius` 3 and `rateMult` 0.2 (probe) | 32% | 77 / 24 / 0 | pass; G3 has 7 of 16 failing |

Gaps of 10 and 14 read 26% and 31%.

**Reading:**
- **The Burster decides the pool.** Its pairs are 36% of G16's clashes and read 0% under every setting. The formation rule's colony, a Capguard front with Bursters behind, is wiped out in 5–10 s by the same colony with its Bursters in front. While those pairs count, G16 can reach at most 64%, even if every other pair won every clash.
- **S18's reading is only part of it.** S18 found that front-rank Gill Archers start within aggro range. A gap of 8 and an aggro of 5 both remove that, yet the Gill pairs stay at 47–54%.

**Recommended:** each of these is a rule change for the user, at S21's tuning calls (T139).
1. **Settle the Burster first.** §7.3's `burst` → back line is what fails. Move `burst` to the front line, so those pairs are same-role and leave G16's pool, or leave Bursters out of G16. That alone takes the pool from 24% to 38%.
   - This wasn't measured with the Burster in front, since that needs a code change: `BACK_TAGS` in `tools/lib/clash.ts`, the general's placement, and §7.3's text.
   - The hub recommends moving it to the front line. A Burster rolls at the enemy's thickest knot, so the front is its job.
2. **The Gill and tower pairs can wait for the playtest and R3's combos.**
   - Only a 2-tile gap clears 60% for them: 75% without the Burster pairs. It's a cliff, though, since 4 tiles reads 45%, and it changes how every clash opens, with the armies nearly touching.
   - The gentler option, a pin radius of 3, fixes only the Gill pairs, since a tower is never pinned. That reaches 46–51% without the Burster pairs.
   - The Gill pairs, at 51%, are a coin flip rather than a trap. R3's combos that reward the back rank (Shield Wall, Sundering Volley, Anvil) would tip them.

**Not measured:** G1, G2, G5–G8 and G11 under the levers; the Burster in the front line; a gap of 7; a longer Gill range.

## R2a S20 · R2's verification steps on the final data (2026-11-03)

T131, T133 and T134 on `develop` at `6f99d2f` (S18 merged), at 100 damage a supply. Nothing was tuned. The other steps' results are in `docs/r2a-plan.md`'s As built.

**Step 3** (T131): `npm run sim -- --rounds --seeds 1..40 --player bot:balanced --enemy general:scripted --summary`, read against SPEC §16 R2 step 3, with S10b's reading of the same 40 battles at 25 a supply beside it:

| Step 3 expects | At 100 a supply (S20) | At 25 (S10b, T073) | |
|---|---|---|---|
| every battle ends, with no rejected command | 40 of 40, none rejected | 40 of 40, none | pass |
| a median of 6–8 rounds | 7 (5 to 9) | 9 | pass |
| at most 15% reach round 9 | 15% (6 of 40) | 73% | pass, at the limit |
| at most 15% of clashes at the 45 s cap | 9% (25 of 281) | 8% | pass |
| the bot wins 30–70% | 60% | 60% | pass |
| mean wall time within §13.7's 3 s a battle | 36 ms | 50 ms | pass |

- **Where step 3 and the agreed band differ:** step 3's "at most 15% reach round 9" is §12.3's first guess, from before T125. The user's G4 band (T125) allows 20% over 200 battles, since 40 battles can't tell 18% from 15%. These 40 read exactly 15%, and G4's 200 read 18.5%, inside G4's band and over step 3's number. R2b, which runs step 3 again, could align its number with G4's band. That's SPEC text, so it waits for the user's OK.
- **X8's readouts on the same battles:** your colony is full from round 5 (in 37 of 40), and you then bank a median of 320 gold a round; the general's from round 5 too, banking 324. 63 of the 281 rounds (22%) replay the last clash exactly.

**Step 7** (T133): `npx vitest run tests/slow/rounds`, 4 minutes on this machine (counters 210 s, the battles 14 s, G16 8 s, the duels 1 s). The same verdicts as S18's suite at 100 a supply:

| | Reading | |
|---|---|---|
| G1 | the Sporeling Burrow wins 9 of 10 pairings and never loses clearly; the Rhizomorph Tunnel wins none | miss |
| G2 | the Gill Archer beats no unit and the Amanita Knight loses to none; Hammercap > Amanita Knight holds in 3 of 5 seeds (4 asserted) | miss |
| G3 | 8 of 16 monos miss, each worst on Stumpfield: Sporeling 78% mean (83% worst), Veilstalker 78% (96%), Hammercap 60% (83%), Rootbreaker 51% (71%), Scythecap 51% (86%), Capguard 47% (67%), Gill 40% (75%), Amanita 40% (88%) | miss |
| G4 | 200 battles: a median of 7 rounds, 18.5% reach round 9, the bot wins 58.5%, no rejected command; the cap binds in 70% of damaging rounds | pass |
| G5 | +150 gold wins 63% of 80 | pass |
| G6 | the behind side wins 38% of 80 from `comeback-r4`; the winner is hit in 75% of G4's 200 | pass |
| G7 | merge-on wins 88% of 200 mirrors; 75% with Slayers at 24% of fielded supply | miss |
| G8 | `bot:balanced` 50% and `bot:answer` 70% against the adaptive Baron, inside their bands; 1 of 8 asserted monos drops 20 points (the Hammercap, 83% → 63%), and the Burster (23% → 40%) and Morel (63% → 77%) rise | the bands pass; the mono clause misses |
| G11 | the round budgets (`perf.test.ts`) | pass |
| G12 | each of the 6 monos above 40% in G3 has an answer winning on every map | pass |
| G13 | 9% of 1,417 clashes capped; a median clash of 18.6 s | pass |
| G16 | the formation rule beats its ranks traded in 24% of 2,298 role-split clashes (8% at 300 gold, 23–28% above); same-role pairs 50% | miss |

- **The six misses wait for the user** (`.claude/rules/balance.md`), with the leads in S18's entry below: G1's Sporeling and Rhizomorph, G2's Gill Archer, G3's Stumpfield, G7's merging, the Baron's counter cycle against monos (G8), and G16's formation geometry, where front-rank Gill Archers start within aggro of the enemy's front and fire first. G16 is a rule change worth deciding before S21, since the playtest tests formations. The task list sends the tuning calls to S21 (T139) unless the user decides earlier.

**Step 8** (T134): `npm run bench -- --rounds`, inside §13.7 with wide margins. R1's full-colony clash: one lane, 96 units a side, a mean tick of 0.27 ms and a p99 of 0.79 ms; Twin Roots, 120 a side, 0.33 ms and 0.80 ms (budgets 1 and 2.5 ms). Bench-300 weighted by live units: 0.41 ms and 0.94 ms. The arrival 0.26 ms (5 ms), the general's turn 0.39 ms at most (20 ms), a planning command's sim part 0.41 ms at most (2 ms), and one battle 29 ms (3 s).

## R2a S18 · the round guardrails, the answer bot and the pace levers (2026-11-03)

T122–T124's readings, on `feature/r2a-guardrails`. Nothing was tuned: #35's bands and the pace go to the user at T125.

```bash
npx vitest run tests/slow/rounds
npm run balance -- guardrails --rounds
npm run sim -- --rounds --seeds 1..40 --player bot:answer --enemy general:lichen-baron --flags merging,adaptive --summary   # and bot:balanced
npm run experiment -- --rounds --checks g4,g6 --proto <lever>
```

**Runtimes** (R2-Q9; this machine, 6 workers a file, the files one at a time): `duels` 1 s, `battles` 17 s, `formation` 8 s, `counters` 333 s (G3 35 s, G12 300 s), `perf` about 4 s. The whole round suite takes 6 minutes, inside R2-Q9's 15, so G12 stays in the suite.

**The guardrails** (the `rounds` targets; the battle-level bands are §12.3's first guesses):

| | The bar | Reading | |
|---|---|---|---|
| G1 | No building wins over 80% of its squad-duel pairings; each wins one and loses one clearly | The Sporeling Burrow wins 9 of 10 and never loses clearly; the Rhizomorph Tunnel wins none | miss |
| G2 | Every unit beats one and loses to one in supply duels; M4's two edges hold | The Gill Archer beats none and the Amanita Knight loses to none. Hammercap > Amanita Knight holds in 3 of 5 seeds, under the 4 asserted. Gill Archer > Capguard holds in 0 of 5, and Gill Archer > Rootbreaker in 2 (report only) | miss |
| G3 | Every mono against `bot:balanced`: mean ≤ 55%, worst map ≤ 60% | 8 of 16 miss: Veilstalker 75% mean (94% on Stumpfield), Sporeling 71% (83%), Hammercap 57% (93%), Gill 50% (84%), Scythecap 46% (87%), Rootbreaker 45% (84%), Amanita 36% (89%), Capguard 31% (65%). Every one of the 8 is worst on Stumpfield, and Twin Roots is the hardest map for every mono | miss |
| G4 | `bot:balanced` against the scripted general: median 6–8 rounds, ≤ 15% reach round 9, the bot wins 30–70% | 9 rounds, 73%, 60% | miss |
| G5 | +150 starting gold wins 55–75% | 63% of 80 | pass |
| G6 | From `comeback-r4`, both seats, equal max HP: the behind side wins 20–45%. In G4's battles the winner's Heartcap is hit in ≥ 50% | 44% of 80; 75% | pass |
| G7 | Merge-on beats its merge-off twin 55–70%; ≤ 50% with about 25% Slayers | 87% of 200; 72% of 200, Slayers 25% of fielded supply | miss |
| G8 | Each mono drops ≥ 20 points against the adaptive Baron (report only under 20% without it); `bot:balanced` wins 40–65% | 1 of 8 asserted monos drops 20 (Scythecap, 37% → 17%). Sporeling 83 → 83, Veilstalker 100 → 100, Rootbreaker 60 → 60, Morel 70 → 67, Gill 97 → 90, Hammercap 80 → 70, and the Burster rises, 27 → 47. `bot:balanced` 53%; `bot:answer` 70% (reported) | miss |
| G11 | S17's budgets, now the `rounds` block's | as S17's entry | pass |
| G12 | Each mono above 40% in G3 has an answer passing G3 that wins ≥ 60% on every map | 6 builds, each answered on every map: Sporeling and Veilstalker by mono Burster (100%), the rest by even pairs (91–100%) | pass |
| G13 | ≤ 15% of clashes at the cap; a median clash of 20–40 s | 8%; 17.5 s | miss |
| G16 | The formation rule beats its front and back ranks traded in ≥ 60%, pooled over role-split pairs | 24% of 2,298 clashes (8% at 300 gold, 23–28% above). Same-role pairs 50% | miss |

**The full reveal's risk** (X7, A198). Against the adaptive Lichen Baron at battle index 1, 30 seeds (G8), `bot:answer` wins 70% to `bot:balanced`'s 53%. Over `sim`'s 40 seeds with merging and the counter cycle on, it's 63% to 48%: rounds median 9 for both, 65% and 75% reaching round 9, 6% and 12% of clashes capped. Reading the general's army is worth about 15–17 points to a planner with the same weights. That's the information edge §1.3 #3 gives the player by design, and it isn't so large that the general is easy.

**#35's battle-level bands, a proposal for T125:**

- **G4: keep the band** (6–8 rounds, ≤ 15% at round 9, the bot 30–70%), **and retune the pace** (below). The miss is the pace's, not the band's: S14b's playtest found the late rounds empty once the colony was full, and X8's readouts have both colonies full from round 5–6.
- **G6's first clause: keep 20–45%, and derive the deficit from the agreed pace.** It reads 44% at today's pace, but 48–50% under every faster lever. The scenario's 700 HP is what losing rounds 1–3 cost at 25 a supply. Under a faster pace those rounds cost more, so the deficit should come from G4's battles at the agreed pace, as #35's approach says (G4 and G6 start from X5's race model).
- **G6's second clause: keep ≥ 50%.** 75%, the same under every lever measured.
- **G8: keep 40–65% for `bot:balanced` (53%), and give `bot:answer` a ceiling, 80% (70%).** Above that, reading the general's army would make it too easy. The mono-drop clause misses on its own: Lichen Baron's counter cycle barely dents most monos (above). That's a finding about the counter cycle, not a band.
- **G13: keep ≤ 15% capped (8%), and lower the clash band to 15–40 s (17.5 s).** None of the pace levers moves clash length (17.4–17.7 s under each). Nothing in S14b's playtest said clashes felt short, and S21 reads it.
- **G16: keep ≥ 60%, and treat 24% as a finding.** The rule loses to its own ranks traded. A Gill Archer's range is 5 and its aggro 6, and the front ranks stand 6 apart with the back rank 2 behind. So archers in the front rank start within aggro of the enemy's front, and archers in the back rank start 8 tiles out. Whichever side's archers stand in front fires first. With Capguard and Gill at 600 gold, the traded colony wins 12 survivors to 0. Same-role pairs read 50%. The fix is the formation's geometry or the general's placement rule (§4.6, §7.3), so it's a rule change.

**The pace levers** (G4's 40 battles, `bot:balanced` against the scripted general; G6 from `comeback-r4`; one lever at a time, from today's values):

| Lever | Median rounds | Reach round 9 | Bot wins | Capped clashes | Behind side wins (G6) |
|---|---|---|---|---|---|
| Today: 25 a supply, cap 25%, HP 3,000/2,000, storm from round 5 at +20% | 9 | 73% | 60% | 8% | 44% |
| `heartcapDamagePerSupply` 35 | 9 | 53% | 60% | 9% | 48% |
| `heartcapDamagePerSupply` 50 | 8 | 38% | 60% | 9% | 49% |
| **`heartcapDamagePerSupply` 75** | **7** | **18%** | **60%** | **9%** | **49%** |
| `heartcapDamagePerSupply` 100 | 7 | 15% | 60% | 9% | 49% |
| `roundDamageCap` 34% | 9 | 68% | 60% | 8% | 44% |
| `roundDamageCap` 40% | 9 | 68% | 60% | 9% | 44% |
| Heartcaps × 0.75 (2,250/1,500) | 9 | 53% | 60% | 9% | – |
| Heartcaps × 0.5 (1,500/1,000) | 8 | 38% | 60% | 9% | – |
| Sporestorm from round 3 | 9 | 60% | 60% | 9% | 45% |
| Sporestorm +40% a round | 9 | 60% | 60% | 9% | 45% |
| 75 a supply and the cap at 34% | 7 | 13% | 60% | 10% | 50% |

- **The cap rarely binds:** at 25% of max HP, raising it barely moves the pace. A round's damage is small next to the Heartcaps. Damage per supply is the lever that moves it, and HP does the same more weakly, since the cap scales with max HP.
- **Recommended: `heartcapDamagePerSupply` 25 → 75**, one number in `balance.rounds`. It brings the median to 7 rounds and round 9 to 18%, just over the 15% limit, without changing who wins. 100 meets the 15% exactly, but at 4× a won lane's survivors hit the cap more often, and the margin then counts for less. Adding the cap at 34% to 75 a supply reaches 13%, but that's two levers. G6's deficit is re-derived at whichever pace is agreed (above).
- **What 75 a supply does to the rest** (`npm run experiment -- --rounds --checks duels,g3,g4,g5,g6,g7,g8,counters,formation --proto rounds.heartcapDamagePerSupply:75`): G1, G2 and G16 are single clashes and don't change. G5 63% (the same), G6's second clause 75%, G12 still passes, and G13 17.4 s. G6's first clause rises to 49%. G7 reads 87% and 74%. G8's `bot:balanced` reads 50% and `bot:answer` 70%, and still one asserted mono drops 20 points, the Hammercap now (87% → 63%) where it was the Scythecap. In G3 the same 8 builds miss: the Sporeling reads 75% (71%) and the Rootbreaker 52% (45%), 58% on Twin Roots.

**R1's watch items in round battles:**

- **Capguard Hall at 3, round by round** (mono Capguard against `bot:balanced`, 50 seeds a seat): it wins round 1 every time on every map, and round 2 in 79–91%. Then it fades: 18–33% of round 4s, and 2–8% of round 5s on Bogwater Hollow and Twin Roots. On Stumpfield it holds, winning 46–65% of rounds 5–9. That's R1's early-strong, late-weak reading (92% at 300 gold, 2% at 1,500), except on Stumpfield.
- **The answers to the Sporeling and the Capguard, with `pinned` on:** mono Sporeling (G3 71%) is answered on every map by mono Burster (100%), then the Scythecap–Burster pair (94% worst map). Mono Capguard is under G12's 40% bar (31% in G3, worst 65% on Stumpfield).
- **G2's Gill Archer under the adopted set** (A116): it beats no unit in supply duels, and loses its two intended edges (Capguard 0 of 5 seeds, Rootbreaker 2 of 5).

**The findings left for the user, as the guardrails show them:**

- **S15's Gill Archer tie** (Swarm and Ranged at 1.0 each): mono Gill drops only 7 points under the Baron's counter cycle (97% → 90%). The noise picks the counter kind against a Gill Archer army.
- **S17's Burster seat effect** (T148): G1, G3, G5–G7, G12 and G16 play both seats or both orientations, so it cancels in their tallies. G8 plays the mono as the player only, and mono Burster rises under adaptation (27% → 47%). That fits a counter that adds Bursters, which then lose their mirrors on seat, but the run doesn't prove it.
- **G3 on the Sporeling's worst field:** in rounds, the Sporeling's worst map is Stumpfield (83%), not Twin Roots (64%), where R1's clashes put it. Bogwater Hollow reads 67%.

**Other misses, for the user** (no retune across several units without your OK):

- **Stumpfield favours every mono** (G3): 8 builds read 65–94% there. A colony with fewer open plots may cost `bot:balanced`'s economy cards more than a mono's army. That's a lead, not measured here.
- **Merging is worth too much** (G7): merge-on wins 87% of the mirror (55–70%), and 72% with Slayers fielding 25% of supply (≤ 50%).
- **The Baron's counter cycle doesn't answer monos** (G8): one of eight asserted monos drops 20 points.
- **Squad duels at 600 gold** (G1): the Sporeling Burrow wins 9 of 10 pairings and the Rhizomorph Tunnel none.

**T125, the user's call** (2026-11-03: "Take them all", then through the hub "Yes, with the rerun" and "Go to 100"): `heartcapDamagePerSupply` 100, G4 over 200 battles with ≤ 20% reaching round 9, and the other bands as proposed above. G6's deficit is 1550 HP: a 3000-HP side's median loss in each of rounds 1–3 of G4's 200 battles at 100 a supply, 200 + 600 + 750 (the same method reads 425 at 25, and 1275 at 75 over 40 battles, so the old 700 was high).

- **The rerun over 200 battles** (the user's call through the hub, "Yes, with the rerun": 40 battles can't tell 18% from 15%), `bot:balanced` against the scripted general on Bogwater Hollow, seeds 1–200:

  | Damage a supply | Median rounds | Reach round 9 | Bot wins | Rounds with damage at the cap | Battles with a capped round |
  |---|---|---|---|---|---|
  | 25 (before) | 9 | 67.5% | 58.5% | 14.9% | 42% |
  | 75 | 7 | 23.5% | 58.5% | 59.5% | 95% |
  | **100 (agreed)** | **7** | **18.5%** | **58.5%** | **69.7%** | **98.5%** |

  75 missed even the 20% fallback, so the user went to 100 ("Go to 100", through the hub): the same median and win rate as 75, 18.5% reaching round 9, and the cap binding in 70% of damaging rounds against 60%. G4 now plays these 200 battles, so it can tell 18.5% from 23.5%.
`npx vitest run tests/slow/rounds` at 100 a supply (230 s):

| | Reading at 100 a supply | |
|---|---|---|
| G4 | 200 battles: 7 rounds, 18.5% reach round 9 (≤ 20%), the bot wins 58.5%; the damage cap binds in 785 of 1126 damaging rounds, 70% | pass |
| G5 | +150 gold wins 63% | pass |
| G6 | the behind side wins 38% from 1550 behind (20–45%); the winner is hit in 75% of G4's 200 | pass |
| G8 | `bot:balanced` 50% (40–65%), `bot:answer` 70% (≤ 80%); 1 of 8 asserted monos drops 20 points (the Hammercap, 83% → 63%) | the bands hold; the mono clause misses |
| G12 | every build above 40% in G3 answered on every map | pass |
| G13 | 133 of 1417 clashes capped, 9%; median clash 18.6 s (15–40 s) | pass |
| G16 | 24% | miss (a rule question) |
| G1, G2, G3, G7 | as above: G3's same 8 builds; G7 88% and 75% | miss |

- **Harder rounds cut comebacks:** from the 1550-HP deficit the behind side wins 38%, inside G6's 20–45%. From 700 at the same pace it would be about half, so the deficit has to follow the pace, as #35's approach has it.
## R2a S17 · the round bench against §13.7, and the first `g4` in rounds (2026-11-03)

T114's, T115's and T117's readings, on `feature/r2a-tools`. Nothing was tuned.

```bash
npm run bench -- --rounds
npx vitest run tests/browser/rounds/perf.test.ts
npm run experiment -- --rounds --checks g4
```

**The bench against §13.7** (this machine; Node unless marked):

| §13.7 | Budget | Measured | |
|---|---|---|---|
| A full colony at the arrival | at most 150 live units a side | one lane: 12 plots of 8 Sporelings, 96. Twin Roots: 15 plots, 120 | pass |
| The clash's first tick, both armies arriving | ≤ 5 ms | 0.26 ms on each field | pass |
| A sim tick of bench-300 at 300 live units | mean ≤ 1.0 ms, p99 ≤ 2.5 ms | mean 0.40, p95 0.80, p99 0.91, max 1.60; peak 300 | pass |
| The general's planning turn | ≤ 20 ms | mean 0.09, max 0.43 (Mold, seed 1, round 4) | pass |
| The sim part of a planning command | 2 ms (S17's Node budget) | at most 0.41 (mean 0.10), on Twin Roots' 15th plot | pass |
| One battle, bots on both sides | ≤ 3 s | 39 ms, 9 rounds | pass |
| A plant and the preview it updates (Chromium) | ≤ 4 ms | a median of 0.5–0.7 ms over five plants' worst frames | pass |
| A render frame at 300 units (Chromium) | p95 ≤ 8 ms | p95 2.6–3.4 (median 0.7) after the first fighting tick; that tick's frame 4.8–11.4 | **miss**, one frame a page |

- **bench-300 in rounds** plays 150 units a side in blocks on test-3lane, merging off. Every lane draws at the 900-tick cap, and live units thin from 300 to about 180 by tick 300. So the bench times 2,000 fighting ticks over 3 fresh clashes and weights each by its live units: 177 on average.
- **The full colonies' clashes** tick at a mean of 0.27 ms and a p99 of 0.77 on one lane, and 0.32 and 0.79 on Twin Roots, inside G11's.
- **Twin Roots' full colony holds 15 buildings, not 16:** one front-rank plot a side is a stump. That's 120 units a side, where §13.7 says 128.
- **The general's turn** is timed from round 2 on, in 68 turns against the scripted general, Mold and the Baron. Round 1's runs inside `createBattle`.
- **The cold frame:**
  - The first tick after the muster runs the clash's targeting, movement and attacks in the page for the first time. Its frame took 4.8–11.4 ms over seven runs, over 8 ms in five. Node's warm bench times that tick under 2 ms, so the cost is cold code, once a page.
  - T115 holds the p95 of the 45 frames after it, as §16 M8 words the render budget, and the median of five plants' worst frames. One slow frame can't decide either.
- **On CI:** §13.7's Chromium budgets hold on a real machine, as its Node rows say "this machine".
  - CI's shared runner, with the other browser files running beside it, took about three times as long on the frames that run a tick: #102's runs had a p95 of 9.6 and 10.6 ms, medians of 1.4 and 1.9 ms, and slowest frames of 13.7 and 14.3 ms. The plant check passed there.
  - So under `process.env.CI`, T115 holds a regression guard of 3× each budget, 24 ms for the p95 frame and 12 ms for the plant. Its messages name the bound that applied.
  - The lever: warm the clash's systems when the preview opens, say by stepping a throwaway clash. That's a change to `src/app/rounds/main.ts`, S19's file, so it waits for the user's call.
- **New budgets:** the planning command's 2 ms Node budget is S17's call, half of Chromium's 4 ms. It, the arrival's 5 ms and the turn's 20 ms sit in `ROUND_BUDGETS` (`tools/lib/rounds/bench.ts`) until T119 writes G11's round form.
- **Guardrail:** G11 (§12.3). `npm run verify` runs the round bench quick (T118).

**The first `g4` in rounds:** `bot:balanced` against the scripted general on Bogwater Hollow, 40 battles with the default flags. The results were the same on 6 workers as on 1.

| §12.3's first guess | Measured | |
|---|---|---|
| G4: a median of 6–8 rounds | 9 | **miss** |
| G4: at most 15% reach round 9 | 73% | **miss** |
| G4: the bot wins 30–70% | 60% | within |
| G13: at most 15% of clashes at the cap | 29 of 346 lane clashes, 8% | within |
| G13: a median clash of 20–40 s | 17.5 s | **outside** |

- **These are S10b's step-3 battles** (above), with the same seeds and flags, so the pace misses are the same. The lead in the Heartcap race changed hands 30 times, in 53% of battles.
- **The tournament's other bots** (`npm run balance -- tournament --rounds`), against the same general:
  - `bot:rush` wins 90%, with a median of 9 rounds and 53% reaching round 9;
  - `bot:turtle` wins 65%, at 9 rounds, 85% and 18% of clashes capped;
  - `bot:greedy` wins 15%, at 8 rounds and 40%.
- **Recommended:** no retune here. S18's G4 run (T124) plays more bots and reads the pace levers, and the bands go to the user at T125.

**T148, a Burster mirror by seat:**

- **The mirror mono** (two Burster Pods a side): whichever side's ids come first bursts first, at clash tick 56. Its bursts fell the other side's Bursters before they burst on it, in the same attack step, and it wins the lane 4–0 at tick 60, 100 Heartcap damage. Bursters behind a Sporeling front end the same either way. `seats.test.ts` holds the mono case as an `it.fails`.
- **On `playRoundClash`:** 100 one-lane mirrors of `bot:balanced`'s army (5 budgets × 20 seeds).
  - Those with Bursters went 13 to the player (whose ids come first), 6 to the enemy, with 18 drawn.
  - Those without drew 58 of 63. The other 5 all field Rhizomorph Tunnels, 2 won by the player and 3 by the enemy, so they show no seat tilt.
  - Twin Roots' mirrors aren't level by design: each side's stump plot is in a different lane.
- **The lever:** the attack step skips a unit that a burst has struck down earlier in the same step (`attackSystem`). Letting it still attack that tick, as §5.3's "deaths are processed after all hits resolve on a tick" suggests, would let both sides' Bursters burst together. A fix is a rule change that moves the round goldens, so it waits for the user's OK.
- **Guardrails:** G7's merge mirror and every clash read with Bursters. G3 and G12 play both seats, so the tilt cancels in their means.
- **Recommended:** settle the burst order before S18's guardrails read Burster builds on round clashes.

## R2a S15 · X8's readouts against Mold and the Baron (2026-11-03)

T100's readouts, on `feature/r2a-counters` with the counter cycle in rounds (T099). Nothing was tuned, and X8's two knobs are off.

```bash
npm run sim -- --rounds --seeds 1..40 --player bot:balanced --enemy general:mother-mold --summary
npm run sim -- --rounds --seeds 1..40 --player bot:balanced --enemy general:lichen-baron --summary
```

That's Bogwater Hollow, battle 1, with the default flags. There's no commander, so no power fires. "Off" below is the same run with `--flags merging,powers`, without the counter cycle.

| | Against Mold | Against the Baron |
|---|---|---|
| Your colony is full at Begin from | round 5 (27 battles) or 6 (13) | round 5 (24) or 6 (16) |
| You then bank a round (median, mean) | 582, 610 | 542, 583 |
| You bank at round 9's Begin (median) | 1,133 | 1,129 |
| The general's colony is full from (median) | round 7, 2 never | round 6 |
| It then banks a round (median, mean) | 200, 276 | 366, 437 |
| Its counters at rounds 4; 7 | Swarm 40; Swarm 32, Line 8 | Swarm 40; Swarm 33, Line 6 (one battle ended first) |
| Buildings it sold | 39, all at round 7 | 48, all at round 7 |
| Clashes that replayed the last one exactly | 61 of 351 (17%); 52 of 105 once both colonies were full | 79 of 345 (23%); 77 of 141 once both were full |
| The general wins (off) | 70% (68%) | 53% (60%) |
| Median rounds; battles that reach round 9 | 9; 80% | 9; 75% |

- **The rough playtest's empty late rounds** (2026-11-02) have numbers.
  - bot:balanced fills its 8 plots by round 5 or 6 and never plants again, since it doesn't sell.
  - Its gold then piles up past 1,100 by round 9, though interest stops at 30 a round.
  - The general changes its army only at round 7's activation. Round 4's never sells, since it still has free plots then.
- **Exact replays** (A206): once both colonies are full, about half the clashes replay the last one.
- **The counter cycle barely moves the win rate** against bot:balanced: Mold 70% (68% off), the Baron 53% (60% off).
- **Guardrails:** G4 (rounds per battle) and G8 (the adaptive general), which S18 asserts in round form (T119–T125).
- **Recommended: no change here.**
  - These numbers go to S18's pace call and S21's playtest.
  - X8's knobs change only the general. On these numbers your side runs out of decisions sooner: your colony fills two rounds before Mold's.
  - Turning a knob on, or anything for your side, is the user's call (`.claude/rules/balance.md`).

**Gill Archers tie Swarm and Ranged** (T098). A record of Gill Archers alone scores Swarm 1.0 (light armor) and Ranged 1.0 (ranged) before the noise. The ±0.03 noise then picks between them about half and half, so #14's tie order, Ranged before Swarm, decides only when there's no noise. Once the archers knit an Elder, `eliteShare` lowers Swarm and Ranged wins outright. Two possible fixes, each a rule change for the user:
- read Anti-Swarm from the light share without its ranged units;
- apply the tie order to kinds within the noise of the top score.

**The smoke reads Elite** (T103). Mono Sporeling Burrow against Mold, seeds 4 and 5, reads Elite at round 4: the Sporelings knit mostly into Elders, Elite scores 0.90 against Swarm's 0.63, and Mold adds the Veilstalker Hollow. That's R2-Q3's reading.

## R2a S16 · Puppet Bloom's trios in rounds, R2-Q7 (2026-11-03)

T107's reading of R2-Q7 and A057 in real rounds, on `feature/r2a-powers`: Cordis with the commander's starter kit and the auto power policy, 40 seeds against each general. Nothing was tuned.

```bash
npm run sim -- --rounds --seeds 1..40 --player bot:balanced --enemy general:mother-mold --commander cordis --power-policy auto --kit sporelingBurrow,gillNest,truffleCellar --summary
npm run sim -- --rounds --seeds 1..40 --player bot:balanced --enemy general:lichen-baron --commander cordis --power-policy auto --kit sporelingBurrow,gillNest,truffleCellar --summary
```

That's Bogwater Hollow, battle 1, with the default flags. The summary's last line reads the player's Puppet Bloom clash by clash (`bloom` in `--out`): the most trios a 3-tile circle could merge on the clash's first tick, after the muster, and at any of the auto policy's think ticks (every 20 ticks of the clash clock) before the power was used.

| Trios a clash | Old Mother Mold (336 clashes) | The Lichen Baron (345 clashes) |
|---|---|---|
| after the muster: median (mean, at least 1) | 0 (0.10, 8%) | 0 (0.10, 9%) |
| the best before the power was used | 0 (0.12, 10%) | 0 (0.16, 14%) |
| the auto policy fired (2 trios, or 1 in combat) | in 18 clashes, merging 23 trios | in 33 clashes, merging 40 trios |

- **The median is 0 in real rounds,** as R1 found at 300 and 600 gold (R1: a median of 0 there, 1 from 900). The muster knits to a fixed point, so few trios are left, and the auto policy fires in 5% and 10% of clashes.
- **A few seeds carry the merges:** 6 of 40 against Mold (3, 9, 11, 21, 22, 31) and 9 of 40 against the Baron. Seed 11 merges 8 trios against both, and it's the Cordis smoke's seed (T110).
- **Without `adaptive`** the 80 battles play the same, since the counter cycle isn't in rounds until S15. So T110's smokes and T111's replays leave it off, and S15 can't move them. Against the scripted general the median is 0 too (at least 1 in 9% of 331 clashes), and the policy fired in 33.
- **Guardrail:** G14 (R2b) runs every commander on the auto policy, and Cordis's verify smoke needs a merge.
- **Recommended:** R2-Q7's decision now applies. The median stays below 1, so R2b's S0 gives Puppet Bloom a v2 job, such as lifting same-type units within 3 tiles one tier (A057), and turns Cordis's knit-time bonus into something the muster uses, such as merged units starting at +10% HP (A096). Both are rule changes, so they wait for the user at R2b's S0. Until then both stay as written.

## R2a S10b · step 3 in rounds (2026-11-02)

T073's reading of §16 R2 step 3 in round form, on `feature/r2a-general-check`: the code after T149, with the general planning first. Nothing was tuned.

```bash
npm run sim -- --rounds --seeds 1..40 --player bot:balanced --enemy general:scripted --summary
```

That's Bogwater Hollow, battle 1, with the default flags.

| Step 3 expects | Measured | |
|---|---|---|
| every battle ends, `rejectedCommands` = 0 | 40 of 40 end, 20 by Rout and 20 by Decision; 0 rejected | pass |
| a median of 6–8 rounds | 9 (min 7, max 9) | **miss** |
| at most 15% of battles reach round 9 | 29 of 40, 73% | **miss** |
| at most 15% of clashes at the 45 s cap | 29 of 346, 8% (median clash 0:18) | pass |
| the bot wins 30–70% | 24 of 40, 60% | pass |
| mean wall time within §13.7's 3 s for a battle | 50 ms (max 76 ms) | pass |

- **The wall time was taken under load.** Two other sessions' tests and builds were running on this machine (load average about 4.5). Even so, the slowest battle is about 40 times inside the budget, so it needs no re-run alone.
- **Why battles run long.** These figures come from the same 40 battles' `roundLog`, written with `--out`.
  - Of 346 rounds, the bot won 147 and the general 137, and 62 were drawn (18%).
  - A won round dealt a median of 250 to the general's 2000 HP (mean 288), and 300 to your 3000 (mean 329).
  - A win reached the per-round cap, 25% of max HP, in 31 of the bot's 147 won rounds and 12 of the general's 137.
  - At those margins a Heartcap falls only after 7 to 9 won rounds. The two sides split the rounds almost evenly, so most battles reach round 9, and half end in a Decision.
- **Guardrail:** G4, rounds per battle (§12.3), which S18 asserts in round form (T119–T125). v1's G4 Decision share was high too (43%, R2a S1 below).
- **Recommended: no retune from one matchup.** S18's G4 run plays more bots against the general and sets #35's bands, and the pace goes to the user then. The data's levers are:
  - `rounds.heartcapDamagePerSupply` (25);
  - the Heartcaps' HP: yours 3000, battle 1's general 2000;
  - `rounds.roundDamageCap` (25% of max HP);
  - `rounds.sporestorm` (+20% a round from round 5).

  Each is a rule change or a retune, so it waits for the user's OK (`.claude/rules/balance.md`).

## R2a S1 · R1's chosen set as default data (2026-11-02)

T014's readings on `feature/r2a-data`, once R1's set, R2-Q5's weights (all seven data bots and the generals) and `tierRadiusMult` 1.0 were default data (`data/CHANGELOG-balance.md`). Nothing was tuned, and a v1 miss isn't open work.
- **The clash check against R1's `r1-kept`** (`npm run experiment -- --checks clash --budgets 300,600,900,1200,1500 --workers 6 --jitter 0.2 --mirror`, 50 seeds):
  - **It reproduces `kept`:** with `--proto tierRadiusMult:1.25`, G3 matches cell for cell (Capguard Hall 90%, Sporeling Burrow 62%, Rootbreaker Den 60% on Twin Roots). So do the armies, the merge mirror, the G4 row, the colony and the overflow. G12 and G13 move a little (G13 5.15% against 5.16%). The counter check's bots built from `bot:balanced` (`d1-burrows`, `d1-adaptive`, `diverdef`) now copy its weights for the Pod and the Tunnel, which `fixedWeights` kept from them under `aiWeight`.
  - **On the default** (`tierRadiusMult` 1.0): G3 fails on Capguard Hall (89%, 93% on Twin Roots) and the Sporeling (60%, 71%), and Rootbreaker Den now passes. G12 fails only on Capguard Hall (best answer 51%), and G13 passes at 5.0%. R1's tool reads neither the squads nor the arrival shield, which are rounds data. 186,780 clashes in 114 s.
  - **R1's chosen set at `tierRadiusMult` 1.0** (`--proto clashshield --squad capguardHall=3`, as R1's `r1-kept-clashshield-capguard3-50`): G3 fails on the Sporeling's worst field, 62% on Twin Roots (bar 60%; its mean is 50%). At 1.25 it passed (48%, 58%). G12 passes, and G13 is 2.7% (7.5% at 1.25). So #53's radius tips the Sporeling over G3's worst-field bar in R1's tool, the set's only miss.
- **`--checks duels,g8`** (A116), beside R1's `--proto kept`: the same verdicts. G1 fails on Gill Nest (9 of 10 pairings). G2 fails with the Gill Archer beating no one, and one report-only edge firms up (the Veilstalker over a Bloomed Capguard, 4 → 5 of 5 seeds). G8 fails on seven monos' drops against the Lichen Baron, and `bot:balanced` wins 57% at battle 1 (band 40–65%).
- **`npm run test:slow`:** G6 and G11 pass; G1, G2, G3, G4, G5, G7 and G8 miss. Before R1's set, G1, G3, G7 and G8 missed, so three misses are new:
  - G2, on the Gill Archer, as `--proto kept` showed;
  - G4: Decisions 43% (≤15%), with the median length 8:10 inside its band;
  - G5: the +150-gold side wins 78% (55–75%).

  G3's misses are Sporeling Burrow (70% mean, 82% on Twin Roots), Gill Nest (79%, 95% on Stumpfield) and Amanita Lodge (68% on Twin Roots). G7's Slayer mirror is 61% (≤50%).
- **The adaptive-general smoke** (`tools/verify.ts`): on the adopted set Old Mother Mold reads mono Sporeling as Elite on 6 of seeds 1–10 (1, 2, 5, 6, 7, 9), where seeds 4 and 5 read Swarm before. That's v1's merged-swarm read (A041), which counting Elder parts replaces in rounds (R2-Q3, T098, T099). The smoke moved to seeds 3..4, and the warning at 2400 and the activation at 4800 hold on every seed.
- **The shapes check** (`npx vitest run tests/unit/shapes.test.ts`, R4/T030 on `squad.count`): passes. Only Capguard Hall's squad changed (4 → 3), which widens its bound.
- **For R2a to watch:** mono Sporeling on Twin Roots, which fails G3's worst field with the chosen set at `tierRadiusMult` 1.0 (above); Capguard Hall, which still leads without its squad and the shield; and G4's Decision share, high in v1's battle too. R2a measures them in rounds (S7, S18).

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
