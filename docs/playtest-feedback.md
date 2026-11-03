# Playtest feedback

Human playtest notes, newest first. Each entry records what the player said and links it to the guardrail or tuning knob it touches. Nothing here is acted on until the user says so. Data changes still go in `data/CHANGELOG-balance.md`.

Entries before 2026-10-31 describe the v1 battle, which [SPEC v2](../SPEC.md) replaces. Their questions for later rounds are history. What's current is each item's v2 status in the table below.

## Open items for the next milestone

| # | Feedback | Related | Status |
|---|---|---|---|
| F1 | Forward building isn't worth it: the surcharge feels steep and gives little in return | §6.3 `supplyLinePerColumn`, §4 territory | **SPEC v2 (2026-10-31):** superseded. Forward building and its price are retired, and plots are fixed in your colony (SPEC §4.6, Appendix A). Before v2: open, not started. M3 adds optional payoffs as drafts: the Forward Spores relic (surcharge halved) and Martyr's Bloom (destroyed buildings burst); the base rule is unchanged. A second report on 2026-10-29 (round 3): the risk doesn't match the reward. The price is now explained (Help's Economy tab, the territory tooltip, the ghost's "+30%: 6 columns from home"); the rule still waits on the user |
| F2 | Gill Archers (Gill Nest) are still the best unit | G3, `data/CHANGELOG-balance.md` "Open: G3" | **SPEC v2 (2026-10-31):** superseded. Copies cap how many of one building you can plant (§8.10), and the counter bar on clashes becomes the main balance check (§12.3). Before v2: open. Re-measured after M3 (2026-10-26): mono Gill Nest still wins 100%, with drafts, upgrades and relics on and against a reference bot that fields Tender's Ring. Candidate solutions recorded in the [balance backlog](archive/v1/balance-backlog.md) on 2026-10-27; no balance implementation selected yet. Re-measured after M4 (2026-10-27): mono Gill Nest still wins 100% against `bot:balanced` and against every general, adaptive or not; G1 now fails on it too (7 of 8 production pairings, since the three M4 spawners all lose to massed archers). Backlog B1, B3 and B4 prototyped on 2026-10-27 (playable with `?proto=b1`, `b3`, `b4`): mono Gill Nest still wins 98–100% under each; see the [results](archive/v1/balance-backlog.md#prototype-results-2026-10-27). Round 2 (Gill Nest interval, T1–T3, defender diagnostic): no setting passes; the closest feel test is `?proto=b1,approachRush.speedMult:2,approachRush.seconds:1,building.gillNest.spawn.interval:21` ([results](archive/v1/balance-backlog.md#round-2-results-2026-10-27)) |
| F3 | "Did losing forward buildings feel fair and readable?" has no answer yet | M1 playtest gate | **SPEC v2 (2026-10-31):** moot. Buildings aren't in clashes (§4.6). Before v2: needs a playtest where the player builds forward |
| F4 | A player never noticed the economy buildings and lost battle 1 | §10.2 tray, §6.2 income | **SPEC v2 (2026-10-31):** the Truffle Cellar stays a basic card. Whether the battle-1 economy tip still helps is §18.2 #33, settled in R2's playtest. Before v2: uI change made 2026-10-28: economy cards come first with a gold role tag, plus a one-time battle-1 tip at 0:30. No balance change. Round 3 didn't mention the Cellar, but both testers asked what interest is and where income comes from; the gold tooltip and Help's Economy tab now answer that (2026-10-29). Ask next round: did you build a Cellar in battle 1 without the tip, and does the gold tooltip make income and interest clear? |
| F5 | Tray cards aren't laid out intuitively and need tooltips | §10.2 tray | **SPEC v2 (2026-10-31):** a card shows shape, weapon, matchup marks, price and copies, with detail in its tooltip (§10.4). The card-text pass is milestone R4. Before v2: uI change made 2026-10-28: role tags, a plain one-line summary, and a hover/keyboard tooltip with full stats and matchups. Round 3 asked for more tooltips overall, not about the tray. Ask next round: do the cards and their tooltips tell you what a building does before you place it, and is any word on them still unclear? |
| F6 | Units capture columns awkwardly | §4.3 territory, §5.2 Hold / Advance | **SPEC v2 (2026-10-31):** superseded. Column capture and Hold / Advance are retired, and Heartcap damage per round is the score (§4.3, §6.7, Appendix A). Before v2: open. Hold / Advance is in the game since 2026-10-28 (the only prototype adopted). Round 3 (2026-10-29) adds detail: one tester doesn't know how to plan territory, so ignores it and hopes units take ground; the other isn't convinced territory capture is the best design yet. Explained in the UI only: a territory tooltip on the tug, a first-time frontier tip and spawn timers; the rule waits on the user (see F15 and F16) |
| F7 | Buildings need more feedback, e.g. a coin popping off economy buildings when they pay | §13.6 effects | **SPEC v2 (2026-10-31):** spawn timers and their setting retire in R2 with timed spawning (§10.2, §10.5). Coin pops stay, when income lands at the start of planning. Before v2: coin pops and a gold-counter pulse added 2026-10-28. Spawn timers done 2026-10-29 (render only): a thin bar along the foot of each of your spawners fills toward its next spawn, with a setting, on by default. Sound is still a candidate |
| F8 | Too much to learn: too many systems, and no tutorial | §10 UI, §3 structure | **SPEC v2 (2026-10-31):** v2 retires many of the systems testers had to learn, and the unlock ladder teaches the roster a few units at a time (§9). Help and tips are rewritten in R4. Before v2: uI pass done 2026-10-29 (HUD tooltips, Help tabs, first-time tips, plain words). Onboarding beyond tips (a tutorial battle, staged unlocks) is open, waits on the user |
| F9 | In-battle drafts and post-battle spoils offer the same kinds of cards; a tester expected them to differ | §8.3, §8.6 | **SPEC v2 (2026-10-31):** still open. Drafts and spoils offer the same card types (§8.3, §8.6). Before v2: the spoils screen now says spoils are a bonus draft with the same kinds of cards (2026-10-29). Whether they should differ is open, waits on the user |
| F10 | The route doesn't really branch: every node links to every node in the next row. A tester wanted to hover a node and see every path to it | §8.2 | **SPEC v2 (2026-10-31):** unchanged (§8.2), and a node can show its general's kit. Before v2: open, waits on the user (hovering already lights a pod's own threads) |
| F11 | Elite battles don't give enough extra reward for the extra difficulty; more rewards, meta currency or upgrades wanted | §8.6 | **SPEC v2 (2026-10-31):** still open (§8.6). Before v2: elite nodes now show what they add: a relic pick, +15 Spores, 25% Amber (2026-10-29). The reward size is open, waits on the user |
| F12 | Can buildings be repaired? | §4.4 | **SPEC v2 (2026-10-31):** moot. Buildings can't be hit (§4.6). Before v2: open, waits on the user |
| F13 | The Puffball Mortar is under-tuned: its range is too short, so it's easily destroyed | §11.2, G3 | **SPEC v2 (2026-10-31):** reopened. The Mortar becomes an emplacement or an unlockable (§11.2), measured in milestone R1. Before v2: open, waits on the user; tied to G3 (mono Gill Nest), since ranged units outrange it |
| F14 | Defensive buildings smaller than 2×2, to fit the gaps players leave | §4.4 | **SPEC v2 (2026-10-31):** plots are fixed 2×2 (§4.6); still open. Before v2: open, waits on the user |
| F15 | A building that spreads the fungus to capture territory over time | §4.3 | **SPEC v2 (2026-10-31):** superseded. There's no territory; your colony gains plots over a run instead (§4.6). Before v2: open, waits on the user |
| F16 | A benefit for fighting on your own territory (home ground) | §4.3, §5.3 | **SPEC v2 (2026-10-31):** superseded. There's no territory (Appendix A). Before v2: open, waits on the user |
| F17 | Units are hard to tell apart, and knowing which one counters what takes "a wall of text" | §5.8, §10.4, §11.2 | **SPEC v2 (2026-10-31):** the shape language (body size shows armor, a weapon mark shows damage type, pips mark merges), six core archetypes, and matchup marks on cards and the planning screen. The art and card text are milestone R4. **2026-11-01:** the user dropped weapon marks from units (R4/T077): body size and a distinct silhouette per archetype tell units apart, and the matchup marks say what counters what **2026-11-02:** R4a drew the shape language on the field (R4a-S1 to S5, `docs/r4a-plan.md` As built): size by armor, a silhouette per unit, pips and an Elder rim for merges, and a lighter Gray Rot that stays apart under colour filters. It waits on the user's review (R4/T039) and R2a's playtest; R4b does the cards and matchup marks. **2026-11-03:** at R2a's playtest gate the user could see the Elders and Bloomed units ([entry](#2026-11-03-r2as-playtest-gate-a-battle-in-rounds-the-user)) |
| F18 | The opener feels like a gamble: you can't tell whether the general will rush you or build economy | §7.1, §7.5 | **SPEC v2:** the general plans first each round, and you see its whole army before you plan. **2026-11-02:** R2a's rough playtest found it works: "no longer a gamble" ([entry](#2026-11-02-r2as-rough-playtest-a-battle-in-rounds-the-user)). **2026-11-03:** R2a's playtest gate kept the full reveal as the default, since the user prefers reacting to the general's plan, and `reveal=last` became an idea ([entry](#2026-11-03-r2as-playtest-gate-a-battle-in-rounds-the-user)) |
| F19 | Waves mix real time with turns and are hard to follow; a build phase, then a fight phase, was suggested | §4.2, §4.7 | **SPEC v2:** battles are rounds of planning, clash and aftermath. Waves and Hold are retired. **2026-11-02:** R2a's rough playtest found rounds read as plan, then fight ([entry](#2026-11-02-r2as-rough-playtest-a-battle-in-rounds-the-user)). **2026-11-03:** R2a's playtest gate found the same, except with `reveal=last` ([entry](#2026-11-03-r2as-playtest-gate-a-battle-in-rounds-the-user)) |
| F20 | Placement doesn't matter: the player fills the home zone from the top left down | §4.6, §11.14 | **SPEC v2:** the colony is the formation (front and back ranks), plus combos by position. **2026-11-02:** R2a's rough playtest found placement mattered ("ranged in the back"). The grid stays as it is, and what a full colony's gold does is §18.2 #67 ([entry](#2026-11-02-r2as-rough-playtest-a-battle-in-rounds-the-user)). **2026-11-03:** R2a's playtest gate found placement mattered again, Bursters in the front rank among it. A full colony still limits the late game, so #67 goes to R2b's S0 ([entry](#2026-11-03-r2as-playtest-gate-a-battle-in-rounds-the-user)) |
| F21 | Unit cards and buildings are too word-dense | §10.4 | Postponed by the user until combat is settled: milestone R4 |
| F22 | Nothing pulls you into another run: the research has examples, and none are built | §8, §9, §16 | **SPEC v2:** lives instead of a run lost in one battle, run packs, augments and combos; M6 rewritten for v2. Run it back and records were agreed as separate work (X10, 2026-11-01). records-1, Run it back and the remembered setup, is on `develop` and passed the user's check on 2026-11-01; records-2 follows R2b |

## 2026-11-03: R2a's playtest gate, a battle in rounds (the user)

The user played R2a's battle in rounds on the dev site on builds `9b15a8a` and `2563235`, which hold R2a's final data at 100 Heartcap damage a supply (T125). This is R2a's playtest gate, S21 (T137 in [r2a-battle-in-rounds.md](tasks/r2a-battle-in-rounds.md), SPEC §16 R2 step 10). They played the three battles T137 names: the default battle (Old Mother Mold, adaptive, with powers), Twin Roots against the Lichen Baron, and `reveal=last` (R2-Q1's A/B) on two seeds. The verdict: the default battle feels good, questions 1, 2, 3, 6 and 7 are answered, and the gate passes. The hub went through the notes with the user the same day, and the user took its recommendations ("Yes, start both").

**1. Did seeing the general's army first turn the opener into a plan rather than a gamble? (F18, R2-Q1's A/B)** "I still prefer to see the general's army planning/placing units/structures before I make my move and wasn't particularly a fan of the reveal=last mode. That might work as an optional difficulty setting or some variant mode or something down the line, but I think the default should be to be reacting to your opponent."
- Yes, with the full reveal, which stays the default.

**2. Did where you planted change how a clash went? (F20)** "Where I placed structures/units definitely seemed to impact the battle". And: "bursters in the front rank also felt pretty good."
- Yes. Bursters in front fit G16's measurement: placed behind its front, as §7.3's rule puts it, a Burster always lost to the same colony with it in front ([balance-backlog.md](balance-backlog.md)).

**3. Did rounds read as "plan, then fight"? (F19)** "Rounds read as plan then fight for the most part except for the `reveal` mode"
- Yes, with the full reveal.

**6. When were you bored, and when did you feel clever?** "I wasn't bored, but I still feel a bit limited on how to make moves late game. Once you have all your slots filled, it's kind of hard to adjust your strategy or change up your playstyle to adapt to what your opponent is doing. I'm not sure if we have something like this in the works, but upgrading buildings/units with gold might be an option worth exploring to help with that exhaustion of buildable ground. happy to wait on this proposal though since we still have worked lined up."
- Not bored, at the new pace: a median of 7 rounds, where 25 a supply took 9. But a full colony still leaves few ways to adapt, so §18.2 #67's first guess, "nothing new", no longer holds (below).

**7. Did you miss placing or Hold during a clash, with only the commander power live?** "I do not miss the hold command, as I don't think it really fits in with the V2 spec changes we're working with."
- No. Hold stays out.

**R4's question (A162): could you spot the Elders, and tell a Bloomed unit from a base one? (F17)** "I could see the elders and bloomed units"
- Yes. #52's first reading, the shape language at Twin Roots' scale, raised nothing: "twin roots also felt good" (below).

**The other notes, and the hub's readings** (2026-11-03):
- **The Heartcap cap reads as asymmetric.** "I'm not sure I'm a fan of the asymmetric heartcap damage between the player and the opponent. It feels weird being limited to 500 damage while you can take more (750?)."
  - Right: the cap is 25% of the loser's max HP a round (X5), so you deal at most 500 a round to battle 1's general (2000) and take at most 750 (3000). Either side still falls after four capped losses. And since the cap binds in 70% of damaging rounds (S18), a bigger Heartcap raises its own cap, so D28's bigger Heartcaps for later generals barely matter.
  - S21b measures a fixed cap for R2b's S0 (§18.2 #68).
- **The Morel Warren's runners.** "Not sure if this is a problem with other units, but it seems like the Morel Warren runners have a hard time pathfinding properly and even though there are two units, they only seem to attack one at a time when matching up against Capguards and Rootbreakers. This typically ends with the units pushing all the way in to the enemy base."
  - S21b diagnoses it.
- **The commander power.** "The default battle still feels good to me. we might need to adjust the timing of the commander power or something at some point though, since it can be used quite effectively to invalidate some units (bursters), but maybe that's an okay counterplay or strength for the general with spore burst."
  - Spore Burst dealt 10–21% of the user's damage in the two saved reports. No change now: R2b's commander work watches it (§18.2 #70).
- **Two highlighted grid segments while placing.** "It feels a bit confusing to be highlighting two different grid segments when placing structures/units (pic 2) and I think we should stick to just having the user place the buildings."
  - S21b fixes the placing highlight.
- **The Puffball Mortars weren't drawn.** "In the version I was playtesting, the puffball mortars weren't visible on the map, which looked kind of weird with the units attacking a tile with nothing in it."
  - S21b fixes the Mortar's drawing.
- **The general's openings.** "I played all three battles and the default mode feels good, my only wish is for more variety with the opening moves from the opponent, but I understand why we might want to start off with the same one each run while we build things out."
  - R2b's opening doctrine (R2-Q18) and its several generals bring some variety, and several openers per general is the cheap next step (§18.2 #69).
- **Twin Roots' economy lane.** "twin roots also felt good, although in the run I did, the opponent just build mortars in the bottom lane while focussing on building in the top, which was okay for me, since I would then just concentrate my econ building in that lane instead of the top, allowing me to focus on building units up there."
  - A lane you leave empty goes to whatever the general fields there (E1). The user treated it as a fair trade (§18.2 #71). Pic 1, in round 5: the user's Heartcap at 1850/3000 and the Baron's at 1000/2000, with lane 2 lost to the Baron's Mortars against the user's economy lane.
  - S21 adds: a lane won by emplacements alone deals no damage (E6), so if the Baron fielded only Mortars there, the empty lane cost the user only that lane's half of the tally.
- **Gold once the colony is full** (answer 6): the user's idea is upgrades bought with gold. The hub's notes: an upgrade should be a real jump, such as a squad arriving Bloomed, since small percentages measured below noise (DR-7), and buying stumps into extra plots is another candidate. It goes to R2b's S0 (§18.2 #67).
- **The reports.** "Apologies I only saved the last variant's after-battle report, but if it is helpful I can run them again."
  - They're below. A default-mode report would give X6 the planning time of the mode that stays the default, so the offer stands. It doesn't block the gate.

**The two saved reports** (`reveal=last`, read off the user's screenshots, pics 3 and 4):

| Battle | Result | Planning seconds, by round | Median | Active play | MVP | Spore Burst's damage |
|---|---|---|---|---|---|---|
| Seed 708952, against Mold | Won by Rout in round 5, dealing 2000 and taking 750 | 28, 10, 13, 89, 20 | 20 s | 4.7 min | Capguard Hall ×4, 89% of the damage | 1,903 |
| Seed 802122 | Won by Rout in round 6, dealing 2400 and taking 400 | 7, 5, 50, 5, 8, 4 | 6 s | 2.1 min | Burster Pod ×2, 61% | 1,554 |

**What changes** (the user with the hub, 2026-11-03):
- **R2-Q1's A/B:** the full reveal stays the default. `reveal=last` goes to [docs/ideas/](ideas/reveal-last-fielded.md) as a possible variant or difficulty setting.
- **Question 7:** Hold stays out.
- **The Burster moves to the front line** of SPEC §7.3's formation rule. S21b makes the change, beside S21.
- **S21b** also fixes the Mortar's drawing and the placing highlight, diagnoses the Morel Warren's runners, and measures a fixed round cap for R2b's S0.
- **SPEC §16 R2 step 3** allows 20% of battles to reach round 9, matching G4's band (T125). It said 15%.
- **R2b's S0** takes five inputs, each with a block in [clarify.md](tasks/clarify.md) and a row in SPEC §18.2: what gold does once the colony is full (#67), the Heartcap cap and D28 (#68), the general's openings (#69), the commander power (#70) and Twin Roots' economy lane (#71).
- **R2b's start:** the user agreed on 2026-11-03 ("Yes, once both merge"): R2b's S0 starts once S21 and S21b have merged into `develop`.

## 2026-11-02: R2a's rough playtest, a battle in rounds (the user)

The user played a battle in rounds on the dev site (`?scene=rounds`, as S14 left it in [#95](https://github.com/Swalliso/Sambattler/pull/95)). This is S14b, the rough playtest agreed on 2026-11-01 (T145 in [r2a-battle-in-rounds.md](tasks/r2a-battle-in-rounds.md), R2-Q25, SPEC §16 R2 step 10). It answers gate questions 1, 2, 3 and 6 in rough form and asks whether anything about the loop needs to change in S15–S20. It isn't a gate on numbers: S21's playtest stays R2a's gate. The verdict: the core loop works, and nothing needs a dramatic change.

**1. Did seeing the general's army first turn the opener into a plan rather than a gamble? (F18)** "yes, this is much more fun already. This is no longer a gamble and requires me to think about how to counter the enemy general while also planning ahead about where I might want to place units"
- Yes. The reveal does what SPEC §1.3 #3 meant it to.

**2. Did where you planted change how a clash went? (F20)** "Where I planted buildings impacted battles (e.g. ranged in the back), although I think we might need more than a 4x2 grid down the line, as it kind of limits what you can build, not to mention in later rounds you kind of run out of a use of gold since you can't upgrade units/buildings yet it seems"
- Yes. Two worries came with it: the size of the grid, and gold in the later rounds.

**3. Did rounds read as "plan, then fight"? (F19)** "Yes, rounds were more plan and then fight coded, with the exception of running out of the ability to plan towards the end of the round due to placement issues."
- Yes. The hub read "the end of the round" as the battle's later rounds, when the colony is full.

**6. When were you bored, and when did you feel clever?** "I was mostly bored when I ran out of options on how to keep expanding or upgrading after reaching the limit of the buildable space."
- Bored with a full colony. Answers 1 and 2 carry the clever half: countering the general, and ranged in the back.

**Does anything about the loop need to change in S15–S20?** "So far I think things are feeling good and nothing needs dramatic changes, but I'd like to check against the spec."
- The hub checked the worries against SPEC and told the user what it found. The readings and the user's replies:

**The hub's readings, and the user's replies** (2026-11-02):
- **The grid: no change.** Plots are scarce on purpose (§4.1, "Scarcity"). Sprawl grows the colony over a run in R2b: the first guess is +1 plot per battle won, up to a third rank, which gives 12 plots on one lane (§4.6). §13.7's budget caps it: a full colony fields at most 150 live units a side, and the bench's worst case is 12 plots on one lane and 16 on Twin Roots. The user: "okay that makes sense to push back. I wanted to make sure this wasn't as big as the grid got."
- **The empty late rounds come mostly from the pace.** §6.2 plans about one new spawner a round after the opener, so 8 plots fill around round 7, sooner with Truffle Cellars. That is about when a battle of the target length (6–8 rounds) ends. S10b measured a median of 9 rounds, with 73% of battles reaching round 9 ([balance-backlog.md](balance-backlog.md), "R2a S10b · step 3 in rounds"). S15's counter cycle also gives a full colony a reason to sell and replant.
- **Gold once the colony is full** is left open by the spec. Upgrades come as draft picks (v1's cards in R2b, then R3's augments), so a full colony's gold buys only rerolls and swaps.
- **Builds and synergies, for R3's S0.** The user: "I think we might also want to look at more combos and interactions between placing units/buildings outside of just the sort of rock/paper/scissors counterplay we've got. Right now I think we've got a good foundation that we just need to build off of and allow various builds and synergies that go with relics/upgrades/etc. to spice up the gameplay on a match by match basis."
  - SPEC v2 plans this for R3: augments (§1.3 #7, §11.13), combos (§11.14), run packs (§1.3 #8, §11.15) and relics (§11.7), in [r3-kit.md](tasks/r3-kit.md).
  - The hub's two cautions, which the user accepted. Keep combos few and rule-changing, since a small percentage per neighbor measured below noise (§11.14, DR-7). And copies come before combos: with no copy limit, a strong pair fills the colony, such as four Capguard Halls with a Gill Archer Nest behind each (§11.14's Shield Wall, four times).

**What changes** (agreed with the user on 2026-11-02):
- **The grid** stays as it is, and nothing in S15–S20 changes for it.
- **SPEC §18.2 #67,** "What does gold do once the colony is full?", goes to R2b's S0 and R3, and §6.1 carries its **Open:** line. First guess: S18's pace call and R2b's drafts cover it, unless S21's playtest still finds empty late rounds.
- **S18:** if G4 misses, T124 measures the pace levers (`heartcapDamagePerSupply`, `roundDamageCap`, the Heartcaps' HP and the Sporestorm) and proposes one retune. T125 brings it for the user's OK beside the bands, so S21's playtest runs at the agreed pace.
- **R3's S0** reads the builds note above (a line in [r3-kit.md](tasks/r3-kit.md)'s Read first).
- **S15** (the counter cycle) and **S16** (powers) start side by side, beside these notes (the user's choice).

## 2026-11-01: records-1's check on the dev site (the user)

The user ran records-1's check (T023 in [run-it-back.md](tasks/run-it-back.md)) on the dev site, once records S2 ([#51](https://github.com/Swalliso/Sambattler/pull/51)) had deployed. The steps: finish a run, press Run it back, then reload and choose New run. Run it back should start the same commander and bans on a new route, and the Underroot should then open on that setup. The user's verdict: "It worked." There were no other notes.
- Nothing to act on. records-1 is done. Play time and the run records come with records-2, after R2b ([run-it-back-plan.md](run-it-back-plan.md)).

## 2026-10-31: P3, the combat rework (the user)

The user played full runs of `?proto=rework` on the dev site (`develop` at `aa37365`, after the pre-playtest fixes in [#38](https://github.com/Swalliso/Sambattler/pull/38)). Some areas felt better, but the game is "still missing out on what could make this game more exciting and engaging and give that feeling of 'just one more run'". The user's conclusion was that the structure itself is the problem, not the tuning, and they chose to rewrite the spec as v2 around rounds (SPEC §0.1, §1.3). Nothing in v2 is built yet.

**Telling units apart (F17).** "We have all these units, but it's hard to visually tell them apart and know when you should be using which one to counter the enemy's units without reading a wall of text about the units."
- v2: the shape language (§5.8), six core archetypes with the rest unlockable (§11.2), and matchup marks on cards and the planning screen (§10.4). The art is milestone R4.

**The opener is a gamble (F18).** You place without knowing whether the general will "bum rush you with a big sporeling swarm" or build economy first. The user proposed that the general place its buildings first, so the player can see its opener and plan.
- v2: each round the general plans first, and you see its whole army before you plan (§7.1, §7.5). It gets no extra gold for going first; the user wants that to stay the default, with enemy income as a value a difficulty setting (a blight) could raise later.

**Waves (F19).** "It feels like we're trying to do both a real-time thing mixed in with a turn based thing and I'm not sure it's the easiest thing to understand." The user suggested a build phase, then a fight phase.
- v2: rounds of planning, clash and aftermath, from the [rounds](archive/v1/ideas/rounds.md) paper design (§4.2, §4.7). Waves, Hold, column capture, forward building and turrets are retired (Appendix A).

**Placement (F20).** "I'm finding myself just placing them in the top left and working my way down the column before starting a new row." The measurements agree: under the rework, the best plot is worth about 5% of a building more than a typical one.
- v2: your colony is your formation, so a plot's rank sets its squad's place in the line (§4.6), and combos reward position (§11.14). The user: placement "adds another sort of puzzle element to the game that makes for fun replayability."

**Card text (F21).** Unit cards and buildings are too word-dense. The user postponed this until combat is settled: milestone R4.

**Difficulty.** It wasn't too easy: "there were a few times I was almost wiped out", though the run summary showed the Heartcap at 3000 → 3000 in all four battles, so the close calls left no mark on the run.
- v2: each battle is a race between two per-battle Heartcaps, and the run has lives. A lost battle costs a life; a won battle never costs anything. The user: losing Heartcap in a won battle "feels like punishing a player for succeeding" (§6.5, §8.5).

**One more run (F22).** "We have great examples in our research docs and notes about what that might look like - we just haven't really added any of that in."
- v2: lives, run packs, augments and combos; M6 rewritten (§8, §9, §16). "Run it back and records" ([after-the-rework](archive/v1/ideas/after-the-rework.md), Tier 1 item 7) is proposed as separate work.

**The spec and the tests.** The user wondered whether following v1 and the older tests too closely was limiting what got tried.
- v2 retires v1's battle systems with their tests and guardrails, and the balance method puts playtests first and bots second (§12, §15).

**P3's questions** ([combat rework](archive/v1/ideas/combat-rework.md#p3-playtest)):
- *Did any battle feel decided by one unit type?* Not reported.
- *When the general massed something, could you answer it, and did you know how?* Not without reading text (F17), and the opener couldn't be planned for (F18).
- *Do the waves give a battle rhythm?* No: they're confusing (F19).
- *Do the spore clouds, Rhizomorphs and flyers read clearly?* Units are hard to tell apart (F17).

**Decisions (2026-10-31),** recorded in SPEC §1.3:
- battles become rounds;
- per-battle Heartcaps and lives for the run;
- the general plans first, with no edge;
- no column fight, and the colony grows plots over a run;
- a kit of building cards with copies;
- six core archetypes, with augments and combos that can flip a matchup but show on the unit;
- run packs;
- merging kept for now.

## 2026-10-29: playtest round 3 (two testers, relayed by the user)

One tester played a full run; the other played on the dev site and sent notes. Their main message: there's too much to learn and the game doesn't explain itself. The user chose a UI-only clarity pass (branch `feature/clarity-pass`, `docs/archive/v1/ui-ux-plan.md` and SPEC §10 updated). Rules and balance points are logged below and wait on the user, who prefers to measure with sims before changing a rule.

**Too much to learn (F8).** Tester A found far too much to read, with too many systems, and asked for tooltips and a tutorial. Tester B asked for tooltips on gold and income (where income comes from) and on the storm, which isn't explained anywhere.
- Done (UI only): the top band's chips have real tooltips instead of native title text, on hover or keyboard focus (`I` steps into the band, Tab moves along it, Esc closes). Gold breaks income down by source per minute (stipend, each economy building, Rich Loam, under attack, comeback), explains interest in plain words with the cap and what the next wave pays, and says what the Spore Exchange adds. Storm, supply, wave and the territory tug explain themselves too. Everything is computed on the render side; nothing joins the sim state.
- Done: Help has two new tabs, Economy (income, interest, the Spore Exchange, the forward price) and Sporestorm (when it starts and thickens, a stack-by-stack table). All six tabs fit 1280×720.
- Done: first-time tips in a run's first two battles, through the callout lane, one at a time, each shown once: the frontier and territory, Hold / Advance, the first draft, the Sporestorm as it starts and interest the first time it pays. Tips name their key with a keycap. Settings has Tips on/off and "Show tips again"; shown tips are remembered under `spore-sprawl/tips/v1`.
- Open: onboarding beyond tips, such as a tutorial battle.

**Interest and the Spore Exchange (F4).** Tester A didn't know what interest is; Tester B didn't understand the Spore Exchange or interest. Answered by the gold tooltip, the Economy tab and the first-interest tip above. No rule change.

**The Sporestorm.** Tester A didn't know what the storm is, so picked the event option that brings it sooner (Mold Bloom). Answered by the storm tooltip, the Sporestorm tab and a tip when it starts. Mold Bloom's chip already says "Sporestorm 1:00 earlier"; the storm tooltip now notes when a battle's storm was moved by an event.

**Space before the battle (bug).** Tester A kept pressing Space to start the battle and nothing happened, then saw the floating spores keep moving after pressing Space to "pause". In deploy, Space toggled a pause that Begin didn't clear, so a battle could start paused.
- Fixed: in deploy, Space begins the battle as Enter does, and Begin always clears a pause, so none carries into the live battle. The Begin button's keycap and the deploy hint show Space; Help lists both keys.

**Event results (bug).** Tester B wanted the random-upgrade event to say which unit was upgraded and how; random relics never said what you got either.
- Fixed (UI only): after an event whose outcome is random (Quiet Clearing's Forage, Fallen Oak, Hungry Roots, Twin Spores' relic), a result screen shows what you got: the building with its new level and what that level does, or the relic's name, rarity and text, plus any cost. It compares the run before and after the choice; `src/run` is unchanged.

**Plain words.** Tester A didn't understand "orthogonally adjacent" (Mycorrhizal Link) and wanted plain words or a picture.
- Fixed: it reads "touching 2 or more of your buildings on a side, not just a corner", with a small diagram on its card and tooltip. A sweep also rewords "income tick", "surcharge", "knit", "attack interval", "splash 1.0", "presence", "besieged" and "DPS" where players read them.
- Data text is copied into every battle's state, so rewording `data/*.json` moves the golden hashes (`m3-run-s7` did). The plain wording lives in `src/ui/words.ts` until the next golden refresh, and a unit test keeps its numbers in step with the data.

**Relics and upgrades in battle.** Tester B wanted to see unlocked upgrades and relics during a battle.
- Done: a chip in the top band counts your relics and upgrade levels; a click or `R` opens them (the run bar's badges and tooltips, and each upgraded building with its levels). Drafted cards join it live.

**Spawn timers (F7, F6).** Tester B wanted an indicator for when buildings will spawn, to time placements and capture ground.
- Done (render only): a thin bar along the foot of each of your spawners fills toward its next spawn and rests full and dim while it waits for supply. Settings has Spawn timers on/off, on by default.

**Territory (F6).** Tester A doesn't know how to plan territory, so ignores it and hopes units take ground. Tester B isn't convinced territory capture is the best design yet, and suggested a building that spreads the fungus to capture territory over time, perhaps with a benefit for fighting on your own territory (F15, F16).
- Done (UI only): the territory tooltip explains the frontier, how a column is claimed, where you can build, comeback gold and the Decision at 10:00; a first-time tip points at the frontier.
- Open, waits on the user: the capture rule, a territory-spreading building and a home-ground bonus.

**The forward price (F1).** Tester B thinks it needs revisiting: the risk doesn't match the reward. This is the second report. Explained in the UI only (Economy tab, territory tooltip, a plain ghost tip); the rule waits on the user.

**Drafts vs spoils (F9).** Tester A found it confusing that in-battle drafts and post-battle picks offer the same kinds of upgrades and unlocks; they expected them to differ.
- Done: the spoils screen says spoils are a bonus draft for winning, with the same kinds of cards as battle drafts. Whether they should differ waits on the user.

**Route branching (F10).** Tester A wanted to hover a route node and see every path to it, and noted the route doesn't really branch, since every node links to every node in the next row (SPEC §8.2, by design). Logged.

**Elite rewards (F11).** Tester B finds elite battles don't give enough extra reward for the difficulty, and wants more rewards, meta currency or upgrades.
- Done: elite route nodes show the extra reward SPEC §8.6 already gives: a relic pick, +15 Spores and a 25% chance of Amber. The size of the reward waits on the user.

**Repair (F12).** Tester A asked whether buildings can be repaired. They can't; logged.

**Puffball Mortar (F13, G3).** Tester B finds the Mortar under-tuned: its range is too short, so it's easily destroyed. Logged with G3, since massed Gill Archers already outrange it.

**Smaller defensive buildings (F14).** Tester B suggested defensive buildings smaller than 2×2 that fit the gaps players leave. Logged.

## 2026-10-28: playtester notes (relayed by the user)

**Missed economy buildings (F4).** One player didn't realize economy buildings existed and lost his first round. The user suggested making economy the first card in the tray.
- In a run, the starter tray is Sporeling Burrow, Capguard Hall, Truffle Cellar, so the Cellar was already one of three cards. Position alone wasn't the problem: nothing on the card said "this makes money".
- Economy may not have been the whole reason for the loss. Over 20 seeds against `bot:balanced` on Bogwater Hollow, `bot:rush` (no economy) still wins 60% and `bot:greedy` 55%. A Truffle Cellar (◆ 150, +4 gold per 5 s) pays for itself in about 3:07, or about 2:05 on Rich Loam. Battle-1 difficulty is a known issue: 41% of runs end in battle 1 ([engagement review](archive/v1/engagement-review.md)).
- Done (UI only): the tray groups cards by role with economy first, and hotkeys follow that order. Each card has a colored role tag. In battle 1, if no economy building is built, queued or being placed by 0:30, a 6 s tip names the Cellar and its hotkey, and the economy cards pulse for 12 s.

**Card layout and tooltips (F5).** The same player found the unit/building cards hard to read.
- Before: the face showed jargon like "crush 24 / 3s · r6" and "strong vs light · medium", and the only tooltip was the browser's built-in `title` text with just the description.
- Done (UI only): the card face shows hotkey, price, sprite, name, role tag and one plain line ("2 Sporelings / 16 s", "+4 gold / 5 s", "crush splash · range 6"). Hovering, or keyboard focus, opens a tooltip with the description, what it makes, unit HP and attack, strong vs / weak vs, armor, siege or slayer, merge perks, building HP and, for economy, the payback time. Stats come from the compiled side, so upgrades show.

**Column capture feels awkward (F6).** Discussed by the playtesters; the user wants more feedback before changing anything and hopes Hold/Advance helps.
- Hold / Advance is now in the game (adopted the same day; `F` or the per-lane buttons), so the next round tests capture with it on.
- Questions for the next round, to pin down "awkward": does a single unit flip a column too easily? Do columns flip back and forth? Is it unclear why a column didn't flip (only the frontier column can be captured, and buildings block it)? Do units walk past columns without stopping?

**More building feedback (F7).** The user wants buildings to show what they're doing, e.g. a gold coin popping off economy buildings when they pay.
- Done (render only): each income tick, every economy building that paid shows a coin and "+N" rising off it, with the enemy's dimmed so their Cellars read as raid targets. The gold counter pulses as income lands. The amount comes from the building's running `goldByBuilding` total, so sim events and golden hashes are untouched.
- Candidates, not started: a spawn-timer ring on spawners, and sound.

## 2026-10-26: Milestone 1 playtest gate (§16), answered against the live M2 build

**Was pushing worth the risk?** Not really, at least when it comes to placing buildings forward. The price increase felt steep and the tradeoff wasn't there. The player already had enough units reaching the far end of the map from home buildings, so forward spawners added little.
- Current rule: price × (1 + 0.05 × depth). That is +30% at depth 6, the column 8–9 example in §6.3.
- Possible directions, none chosen:
  - Lower `supplyLinePerColumn`.
  - Give forward buildings a clearer payoff than a shorter march, or make the one they already have (anchoring ground, §4) easier to see.
  - Check whether home-only play already wins without territory mattering.

**Did losing forward buildings feel fair and readable?** No answer. The player barely built forward, so this didn't come up. Ask again once F1 changes.

**Did battles last 5–9 minutes?** Yes, about 5–9 minutes. This matches G4, so no action is needed.

**Is one building obviously the best?** Yes, the archers (Gill Nest). This matches guardrail G3: mono Gill Nest beats the reference bot 100% of the time in sims, before and after M2. The diagnosis and recommended fix order are in `data/CHANGELOG-balance.md` under "Open: G3". The first step (mustering) changes SPEC §5.2 and needs the user's OK.

**Decision:** the user asked not to fix any of this yet. Keep the feedback tracked for the next milestone.
