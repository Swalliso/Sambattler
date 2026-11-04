# Clarify: the calls to make before each milestone builds

This is the clarify step for SPEC v2. SPEC.md is the spec, `docs/<milestone>-plan.md` the plan, `docs/tasks/<milestone>.md` the tasks, and `docs/tasks/spec-analysis.md` the analysis. This file lists every call the user needs to make before a milestone builds, each with a recommendation, in the order the work needs them.

**How to use it**

- The user answers a block. "Yes" takes the recommendation.
- The session that records the answer:
  - writes it in the block's **Decision** line, with the date;
  - writes it into SPEC. The section loses its **Open:** marker. A §18.2 row is marked "(closed)" with the decision and the date, and keeps its number (§0). A new question (X1, R1-Q1 and so on) changes the section its block names;
  - updates `docs/status.md` (CLAUDE.md, "How we work").
- Until a block is answered, the task files assume its recommendation. Where another answer would change a task file, the block says what changes.

**How to read a block**

- **Needed by** (in the index) names the milestone and the session. S0 is the milestone's plan session, which writes `docs/<milestone>-plan.md` and agrees it with the user before any code. "Gate" is the milestone's review or playtest gate. records-1 and records-2 are X10's two parts, both in `docs/tasks/run-it-back.md`: records-1 is its S0–S2 (its S0 plans both parts), records-2 its S3–S5 (with S3b). records-2 has no S0; its S3 updates the plan (RB/T024).
- Session names follow each task file's Sessions table: R4's rows are "R4a-S0", "R4b-S0" and so on.
- Findings are cited by A-ID (A001–A209), the review's numbering. `docs/tasks/spec-analysis.md` lists them. Each block quotes the evidence it rests on, so it reads on its own.
- A recommendation that disagrees with SPEC's first guess says so and why. Where the evidence doesn't warrant a challenge, the block agrees plainly.
- Each §18.2 row from #7 to #71 has exactly one block. #34 is X7.

## Index

| Ref | Question (short) | Needed by | Recommendation (short) |
|---|---|---|---|
| X1 | Split R2 into R2a and R2b? | Now (before R2a S0) | Yes (decided 2026-11-02) |
| X2 | How R2 lands | Now (before R2a S0) | Beside v1 on develop (decided 2026-11-02); develop may switch wholly to v2, so R2b needn't use `feature/r2b-cutover`; R2a's preview loads on every build (2026-11-02) |
| X3 | Split R4, the field's shape language first? | Now (R4a-S0) | Yes: R4a now, R4b after R3 |
| X10 | Run it back in two parts? | Now (records-1 S0) | Yes: records-1 now, records-2 after R2b |
| RB-Q1 | Where records live | records-1 S0 | The profile key, as profile v1, meta only |
| RB-Q2 | Do prototype runs write records? | records-1 S0 | No |
| X4 | Copies before R3? | R1 S0 (measure), R1 gate (call) | No: keep D45 (decided 2026-11-02) |
| X5 | The scoring curve | R1 S0 (race model), R1 gate (call) | Cap at 25% of the loser's max HP, and a Decision by share (decided 2026-11-02) |
| R1-Q1 | How the check places squads | R1 S0 | §7.3's tags, centre-out files, lanes by line |
| R1-Q2 | Spending a budget | R1 S0 | Skip a miss and keep drawing; a stream per army |
| R1-Q3 | What counts as a clash win | R1 S0 | Lanes won, then uncapped damage; a draw is half |
| R1-Q4 | Extra plots at top budgets | R1 S0 | Base plots, plus one late-run reading |
| R1-Q5 | The full colony and the bench case | R1 S0 | Budget in live units; the true worst case |
| R1-Q6 | Variants that add buildings | R1 S0 | A core-six check; G3 twice |
| R1-Q7 | v2 targeting in the check | R1 S0 | A tool-only flag, on in the check |
| R1-Q8 | v2 movement in the check | R1 S0 | Idle seek, on in the check |
| R1-Q9 | A three-lane field | R1 S0 | Yes, as a screen |
| R2-Q3 | How eliteShare counts merged units | R1 S0 (records), R2a S0 | Elder parts only (decided 2026-11-02) |
| R4-Q1 | Body-size bands | R4a-S0 | Heights 8–9, 11–12, 15–16 px |
| R4-Q2 | Weapon marks | R4a-S0 | Shared glyphs baked onto each frame; area mark only for armor-ignoring damage. Superseded 2026-11-01: units carry no marks |
| R4-Q3 | A louder tier cue | R4a-S0 | A team-neutral rim per tier, bigger pips |
| R4-Q4 | Team contrast in R4 | R4a-S0 | Yes, with a lighter Gray Rot body, checked against the soil too |
| R4-Q5 | Emplacements, and a Structure mark | R4a-S0, R4b-S0 | A slot sprite; a structure glyph |
| #52 | Does the shape language read at 2×? | R4a-S0 | Yes, but test Twin Roots at about 1.78× |
| #53 | Merged units' body radius | R4a-S0 | Keep ×1.25 |
| #55 | The Tender's mark | R4a-S0 | The heal mark. Superseded 2026-11-01: units carry no marks |
| #7 | Squad sizes and the full colony | R1 gate | Per building, Capguard Hall at 3; the 150 stays (decided 2026-11-02) |
| #8 | Mixed-wave shields | R1 gate | Adopted: the arrival shield (decided 2026-11-02) |
| #9 | The Elder Sporeling's splash | R1 gate | Keep (decided 2026-11-02) |
| #10 | How an emplacement counts | R1 gate | First guess, plus A029's unit rules (decided 2026-11-02) |
| #11 | Overflow | R1 gate | First guess (decided 2026-11-02) |
| #12 | Formation on the approach | R1 gate | No (decided 2026-11-02) |
| #13 | The muster inside the 45 s | R1 gate | Yes (decided 2026-11-02) |
| #14 | An Anti-Ranged kind | R1 gate | Yes (decided 2026-11-02) |
| #15 | Counter sets from the clash matrix? | R1 gate | No, with the three fixes (decided 2026-11-02) |
| #36 | The sixth archetype | R1 gate (reading), R3 S0 (call) | Lean the Burster Pod (R1's reading, 2026-11-02: the Burster Pod) |
| X6 | Is 25–35 minutes binding? | R2a S0 | Measure; re-set after R2b's playtest (decided 2026-11-02) |
| X7 | Bots that buy the answer (§18.2 #34) | R2a S0 | Yes; G8, G14, G15 under both policies (decided 2026-11-02) |
| X8 | The general between counter cycles | R2a S0 | Measure; two default-off knobs (decided 2026-11-02) |
| R2-Q1 | What you see of the general from round 2 | R2a S0 | Full reveal by default; A/B "last fielded" (decided 2026-11-02; the A/B kept the full reveal at R2a's gate, 2026-11-03) |
| R2-Q2 | Interest | R2a S0 | Raise it to 1 per 10 gold, up to 30 (decided 2026-11-02) |
| R2-Q4 | The single battle's general kit | R2a S0 | Its listed weights only (decided 2026-11-02) |
| R2-Q5 | Who buys the Burster Pod and the Rhizomorph Tunnel | R2a S0 | Weights in data; retire `aiWeight` (decided 2026-11-02) |
| R2-Q6 | bot:rush and bot:turtle in rounds | R2a S0 | Weight profiles; drop `placement` (decided 2026-11-02) |
| R2-Q7 | Cordis and Puppet Bloom under the muster | R2a S0 | Measure trios; v2 jobs if they're dead (decided 2026-11-02; R1: a median of 0 trios in rounds 1–3) |
| R2-Q8 | Display text out of the hashed state | R2a S0 | Yes, in R2a (decided 2026-11-02) |
| R2-Q9 | How long test:slow may run | R2a S0 | About 15 minutes, on worker pools (decided 2026-11-02) |
| R2-Q10 | G16 over role-split pairs | R2a S0 | Yes (decided 2026-11-02) |
| R2-Q11 | Clash-rule details | R2a S0 | Yes to the set (decided 2026-11-02) |
| R2-Q12 | Planning-screen details | R2a S0 | Yes to the set (decided 2026-11-02) |
| R2-Q25 | A rough playtest after S14 | R2a (decided 2026-11-01) | Yes, before S15 and S16 |
| #19 | The third rank's tiles and order | R2a S0 | First guess, plus a `startRanks` field (decided 2026-11-02) |
| #22 | The margin with siege units | R2a S0 | First guess (decided 2026-11-02) |
| #23 | Edge cases E1–E8 | R2a S0 | First guess (decided 2026-11-02) |
| #25 | A power during the muster | R2a S0 | First guess (decided 2026-11-02) |
| #29 | A bank reserve for the general | R2a S0 | 0 (decided 2026-11-02) |
| #30 | The general's lane rule on Twin Roots | R2a S0 | First guess; a lane in the fielded record (decided 2026-11-02) |
| #31 | A counter a round late? | R2a S0 | No (decided 2026-11-02) |
| #35 | The guardrail bands | R2a S0, R2b S0 | One measurement; upper bounds on G6 and G15 (approach agreed 2026-11-02; R2a's bands and the pace agreed 2026-11-03 at T125; G14 and G15 at R2b S0) |
| M6-Q1 | Record the feat stats in R2 | R2a S0 | Yes (decided 2026-11-02) |
| M7-Q1 | Gray Rot records and its trait | R2a S0 (trait), M7 S0 | Mirror records; drop the trait (the trait dropped 2026-11-02; the records at M7 S0) |
| RB-Q3 | Active play time | R2a S0 (R2a S19 at the latest), records-2's S3 (RB/T024) | Visible wall time, 60 s idle cutoff (decided 2026-11-02) |
| R2-Q13 | A guaranteed answer in battle 1 | R2b S1b (R2b/T029) | Soften Mold's battle-1 opener, with no free blueprint (decided 2026-11-03) |
| R2-Q14 | A boss win by Decision | R2b S0 | The full reward |
| R2-Q15 | Home Brood and "+1 unit" effects | R2b S0 | +10% HP and damage instead |
| R2-Q16 | Rhizome Tithe in rounds | R2b S0 | Killed supply in state; a fixed auto rule |
| R2-Q17 | The generals' passives | R2b S0 | By what fields; the Sovereign's union of sets |
| R2-Q18 | The opening doctrine and the opener | R2b S0 | Swap the opener's last army card |
| R2-Q19 | Relic details | R2b S0 | Yes to the set |
| R2-Q20 | One path for gold earned in a clash | R2b S0 | Credit at once; drop `pendingGold` |
| R2-Q21 | The Grove's way out | R2b S0 | A Leave choice |
| R2-Q22 | Saves: the report and the power | R2b S0 | Next screen; save when the power fires |
| R2-Q23 | The run's kit until R3 | R2b S0 | Plain ids (copies if X4) |
| R2-Q24 | Where the in-battle draft sits | R2b S0 | A bottom sheet |
| #16 | The boss battle and lives | R2b S0 | Ends the run; a lives-at-the-boss knob |
| #17 | A clean-win bonus, and a Rout's kit | R2b S0 | No bonus; pay skipped drafts |
| #18 | Sprawl | R2b S0 | First guess, inside the budget |
| #20 | Buildings between battles | R2b S0 | No |
| #21 | How many plots the general opens | R2b S0 | First guess |
| #24 | When a heal on a round's result lands | R2b S0 | First guess |
| #26 | The Rhizome Vault | R2b S0 | First-guess effect, built in R3 |
| #27 | v1's upgrade levels in R2 | R2b S0 | First guess, with an `offered: false` flag |
| #28 | Commands while a draft is open | R2b S0 | Refused |
| #32 | A run saved before R2 | R2b S0 | Migrate, with lives by losses |
| #56 | A name for lives | R2b S0 (R4b-S0 at the latest) | Regrowths, "lives" in its tooltip |
| #33 | The battle-1 economy tip | R2b gate | Keep |
| #67 | What gold does once the colony is full | R2b S0, R3 S0 | Reopened at R2a's gate: weigh upgrades bought with gold, or stumps bought as plots |
| #68 | The Heartcap cap and D28 | R2b S0 | Decide on S21b's measurement of a fixed cap |
| #69 | The general's openings | R2b S0 | Several openers per general |
| #70 | The commander power against some units | R2b S0, R2b gate | No change; watch it |
| #71 | Twin Roots' economy lane | R2b S0, R2b gate | Keep E1 and E6 |
| X9 | Flyers in the first release? | R3 S0 | No; runs deal 4 of 9 packs |
| R3-Q1 | R3's data work during R2's tuning | R3 S0 | Yes |
| R3-Q2 | R3's augment scope | R3 S0 | Retire all 42 levels; 7 pack augments |
| R3-Q3 | How the general draws augments | R3 S0 | The eligible pool, at draft rarity |
| R3-Q4 | The always-in set's rarity | R3 S10 | Area and crusher common |
| R3-Q5 | Combat and combo details | R3 S0 | Yes to the set |
| R3-Q6 | A run saved in R2's format | R3 S0 | Migrate |
| R3-Q7 | R3's bars | R3 S0 | Per battle; rule-changing cards tagged |
| R3-Q8 | How a card shows its copies | R3 S0 (R2a S0 if X4) | A count, not pips |
| R3-Q9 | Offer order: rarity first | R3 S10 | Roll the rarity, then the type |
| #37 | Augments attach to a type or a card | R3 S0 | The type |
| #38 | Augments per type; what merged units keep | R3 S0 | Cap 1; combos only if every parent had them |
| #39 | Does `takenMult` count toward the class? | R3 S0 | Yes; fix the row's wording |
| #40 | Does a combo stack? | R3 S0 | No |
| #41 | Reading an augment that flips a matchup | R3 S0 | First guess |
| #42 | The general's copies | R3 S0 | Sized to its colony |
| #43 | A cap on copies of one card | R3 S0 (R2a S0 if X4) | 4 |
| #44 | Relics in the always-in set | R3 S0 | No |
| #45 | Can the always-in set be banned? | R3 S0 | No |
| #46 | What a ban, or a missing building, does to a pack | R3 S0 | Not dealt; relics join the open pool |
| #47 | A pack swap at setup | R3 S0 | No |
| #48 | The general's extra cards from the run's packs | R3 S0 | Yes, counters included |
| #49 | General weights for v2 cards | R3 S0 | First guess |
| #50 | Do relic, trait and commander plots count to the maximum? | R3 S0 | Yes |
| #51 | What "mono" means under copies | R3 S14; if X4 is yes, R1 gate with X4 (R2a S0 if the gate left it open) | The copy cap, the rest by bot:balanced |
| R4-Q6 | Card and mark details | R4b-S0 | Yes to the set |
| #54 | An area mark against crowds | R4b-S0 | No |
| RB-Q4 | A card "seen", and the codex | records-2's S3 (RB/T024) | Offered, owned or met |
| M6-Q2 | Unlocks earned mid-run | M6 S0 | From the next run |
| M6-Q3 | The feat list | M6 S0 | A feat per pack building; fix Rich Soil, Hoarder |
| M6-Q4 | Mastery rewards | M6 S0 | Claude drafts a table; level 10 in M7 |
| M6-Q5 | Which buildings the strains cover | M6 S0 | The always-in set |
| M6-Q6 | Credit for runs before M6 | M6 S0 | None |
| M6-Q7 | Run it back after M6 | M6 S0 | The whole loadout, re-checked |
| M6-Q8 | The meta checks' terms | M6 S0 (G10: M7 S0) | Unlock ids; 50+ runs; named loadouts |
| #57 | May a strain change a body or weapon? | M6 S0 | No |
| #58 | How strains and augments divide the work | M6 S0 | First guess; name the overlaps |
| #59 | Are core buildings gated? | M6 S0 | No; core doesn't unlock a pack |
| #60 | Fewer than 4 packs unlocked | M6 S0 | Every unlocked pack |
| #61 | The Velvet Shrine and the Rootgate | M6 S0 | Shrine as a link; Rootgate measured on E6 |
| M7-Q2 | Blight details | M7 S0 | Yes to the set |
| #62 | Three Hollows under plots | M7 S0 | 32 wide, homeCols 6 |
| #63 | The Gray Rot's area archetype | M7 S0 | A Gray Rot Burster |
| #64 | Gray Rot counterparts for other roles | M7 S0 | Yes, minus the flyer |
| M7-Q3 | The first-run hint list | M7 S0 | Four: route, spoils, locked card, unlock |
| M7-Q4 | G3's and G12's seats under the Gray Rot | M7 S0 | Mono bot as Velvet Bloom; swap map sides |
| #65 | Surviving flyers and Heartcap damage | Later (flyers) | Yes |
| #66 | An Anti-Air kind | Later (flyers) | None until flyers |

## Decisions that shape the milestones

These ten calls set how the work after R1 is cut. The task files assume each recommendation.

### X1 · Split R2 into R2a and R2b

- **Question:** Should R2 be two milestones, R2a "a battle in rounds" and R2b "the run in rounds", each with its own plan and playtest?
- **SPEC's first guess:** one R2 with one playtest gate (§16 R2).
- **Recommendation:** Yes. R2a builds a single battle in rounds and playtests it (§16 R2 gate questions 1, 2, 3, 6 and 7). R2b builds lives, runs, saves, the switch-over and v1's deletion, and asks the rest. R2b also writes the round Help and tips with a first wording, which R4b rewords (A156). R2a's and R2b's task files (`docs/tasks/r2a-battle-in-rounds.md`, `docs/tasks/r2b-run-in-rounds.md`) set out the boundary. **Why:** R2 is several milestones in one (A195, A101), and one gate at the end puts the first test of "plan, then fight" after all of it.
- **Alternatives:** one R2 with one playtest at the end; the phases stay the same, and the two task files merge.
- **Blocks:** R2a S0; every R2 session.
- **Decision:** 2026-11-02 (the hub session): the recommendation. The user: "I recommend we split r2 into r2a and r2b as well."

### X2 · How R2 lands: beside v1

- **Question:** Is R2a built beside v1 on develop, with R2b's switch-over on a short branch, or is all of R2 built on one integration branch?
- **SPEC's first guess:** each milestone is "merged into `develop` as the new default", retiring old tests "in the same change" (§16); §13.4 edits the sim in place.
- **Recommendation:** Build v2 beside v1, so every PR keeps `npm run verify` green and the game playable.
  - R2a's PRs go into develop one at a time: new modules, and data fields v1 ignores. R2a ends with a temporary entry, shown only in dev builds (`src/app/channel.ts`'s develop mode), that plays one battle in rounds on the dev site.
  - R2b switches the game over on `feature/r2b-cutover`, green at each sub-PR: R2b S1–S4 build the run with lives and the pre-R2 save migration, the battle screen, v1's deletion and the presets. It merges into develop at R2b S4b, once a whole run plays from round 1's planning to the summary, and only with your OK to the stand-ins still open (R2b Call 14).
  - So develop and the dev site play the run in rounds with stand-ins for a while: run battles open no drafts until R2b S5, relics and passives do nothing until S6 and S7, and a reload mid-battle restarts the battle until S8's saves between rounds. The run screens (S9), teaching (S10) and the rest through S14 land as ordinary PRs into develop. `docs/status.md` lists each open stand-in and the session that lifts it.

  **Why:** edits in place break the typecheck of every module that imports the sim (A025), and many unit tests and every battle UI file read v1 state (A101, A066). It stretches §16's "as the new default" until R2b; the dev entry isn't a `?proto=` knob, and R2b deletes it.
- **Alternatives:** one branch, `feature/r2-rounds`, for all of R2, both loops behind an internal switch (A101, A195). Then R2a's PRs target it, and its playtest runs from a local build. Or, for R2b only, keep `feature/r2b-cutover` until R2b's verification (S13, T147), so develop never shows the stand-ins; S5–S13 then target the branch, with `origin/develop` merged into it before each sub-PR (R2b Call 14).
- **Blocks:** R2a S0; every R2 session's base branch; R2b S4b's merge.
- **Decision:** 2026-11-02 (the hub session): R2a is built beside v1 on develop, as recommended. The user went further: "I'm more than okay with us breaking the develop site (or at least completely switching it over to the v2) at this point and going forward."
  - So develop no longer has to stay playable as v1. R2b's switch-over may land on develop directly, without `feature/r2b-cutover`, and the stand-ins may show there. R2b S0 settles its branches and Sessions table with this (R2b Call 14). R2a S0 may simplify its own plan the same way, for example its dev-only entry.
  - What stays: `npm run verify` is green on every PR into develop. A develop push that fails verify fails the whole deploy, so `main`'s site couldn't redeploy either (`.github/workflows/deploy.yml`).
  - `main` keeps the v1 game until the user asks for a release.
- **R2a part agreed:** 2026-11-02 (R2a S0; the user chose "Every build"): R2a's preview entry, `scene=rounds`, loads on every build through a dynamic `import()`, and the title's button shows only on the dev site. So there's no dev-only gate, no "not part of this build" message and no `--dev` mode in the screenshot tool, and R2a's sessions don't check by hand that v1 still plays: `npm run verify` still covers it. `main` never sees the preview, since R2b deletes it before any release. In SPEC §15 and §16 R2.
- **R2b S0:** 2026-11-03 (the user chose "Drop it, land on develop"): no `feature/r2b-cutover`. R2b's S1–S4 land on `develop` directly, each green and playable, and S4b is dropped (R2b's Call 14). In SPEC §16 R2.

### X3 · Split R4: the field's shape language now, the text after R3

- **Question:** Should R4a (body size by armor, weapon marks, pips instead of `TIER_SCALE`, silhouettes for today's units, the lineup screenshot, the data checks) be built now beside R1 and land before R2a's playtest, with R4b (marks in full, the card-text pass, augment icons, Help and tips) after R3?
- **SPEC's first guess:** one R4, after R3 (§1.3 #10, §16).
- **Recommendation:** Yes. It reverses §1.3 #10's order, so it needs your OK. **Why:** R2's gate asks whether seeing the general's army helped, but today a sprite's size shows its merge tier, not its armor, so the answer is confounded (A202). No sprite meets a size band (A148). Sprites aren't battle state, so no golden moves. R4a-S1 moves unit drawing into `src/render/unitSprite.ts`, which v1's renderer and R2a's views (R2a/T081) share, so the pips and body-size change land once for both.
- **Alternatives:** R4 whole after R3; R2a's playtest then reads armies on v1 sprites.
- **Blocks:** R4a-S0; when R2a's playtest runs.
- **Decision:** 2026-11-01 (the hub session; recorded at R4a-S0): yes. The user was asked "Which side tracks should start beside R1? Picking a track is your yes to its decision (X3, X10)" and answered "Both". So R4a, the shapes on the field, runs now beside R1 and lands before R2a's playtest, and R4b follows R3. In SPEC §1.3 #10, §5.8, §10.2, §10.4 and §16 (its intro and R4).

### X4 · Copies before R3

- **Question:** If R1 shows mono Sporeling Burrow failing G12 or G3 without copies, does R2a bring copies (only copies) forward from R3, replacing D45?
- **SPEC's first guess:** D45: no copy limit until R3, so plots are R2's only build limit.
- **Recommendation:** Decide at R1's gate; leaning yes. If yes, take §1.3 #5 whole (starters ×2, a blueprint adds 1 copy, drafting an owned card adds 1) and settle #51 with it; the general keeps `maxOwned` until #42 lands. R1 measures G3 and G12 at 2, 3 and 4 copies beside unlimited, so squad sizes aren't bent to tame a build R3 removes (A196). **Why:** the supply cap went because "mass the cheapest spawner" kept winning (83–86% on mono Sporeling, Appendix A). Plots alone are that configuration again (A196, A033), and single battles need a copy rule too (A145).
- **Alternatives:** keep D45 and risk a swarm flood in R2a's playtest; or a flat 3 per card for both sides (A196). If no, `plant` has no copy refusal and #51 stays R3's.
- **Blocks:** R1 S0 (the variants); R1 gate; R2a S0; R2-Q23.
- **Decision:** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): no, keep D45. This keeps SPEC's first guess and reverses this block's earlier lean. The condition was met (mono Sporeling failed G3 and G12 without copies), but copies didn't fix it (57–63% at 2–4 copies, 50 seeds), and at 2 and 3 copies more builds lost their answer (7 and 3 failed G12): a capped mono fills its other plots by `bot:balanced`'s weights, so the builds converge. The chosen set passes without copies. So `plant` has no copy refusal, and #51 stays R3's, which should revisit how G12 reads a capped mono. In SPEC D45 and §18.2 #51.
- **R1 measures:** agreed 2026-11-01 (R1 S0). G3 and G12 at 2, 3 and 4 copies beside unlimited (`--copies N`). A mono holds N copies of its card, and its other plots and gold go by `bot:balanced`'s weights: #51's recommendation, used provisionally. The call stays open for R1's gate (R1/T049).

### X5 · The scoring curve

- **Question:** Does the flat 500 cap stay, or does it become a share of the loser's max HP (say 25%), or does the storm raise it?
- **SPEC's first guess:** 25 per surviving damage supply, then the storm, then a cap of 500 per Heartcap per round (§6.7, D26); Heartcaps of 3000 against 2000 + 250 × (i − 1), the boss 3600 (D28); a Decision by damage dealt (§6.5).
- **Recommendation:** R1 adds a race-model section: rounds to fall per battle index (1–5, a Fortified elite, the boss), and the share of clashes whose damage passes 500 at each budget. You decide at R1's gate, before R2a builds scoring. My lean: a cap of 25% of the loser's max HP, D26's own intent ("a quarter of battle 1's enemy Heartcap") at every size, and a Decision by share of max HP lost. **Why:**
  - the general can't rout your 3000 before round 7; a crude model puts 45–83% of battle 1s at round 9, against G4's 15% (A193);
  - the boss needs 8 capped wins, so its wins are mostly half-pay Decisions (A097, A197);
  - the cap binds on most decisive wins from round 4 or 5, so the storm does nothing late (A208), and Twin Roots draws more (A022).
- **Alternatives:** keep 500 and accept Decision-heavy late battles (G4's miss is then reported, not tuned away); equal Heartcaps (A193); the storm raising the cap (A208).
- **Blocks:** R1 S0; R1 gate; R2a's scoring; #35; R2-Q14.
- **Decision:** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the lean, departing from SPEC's first guess (a flat 500 cap and a Decision by damage dealt). The cap is 25% of the loser's max HP a round, and a Decision goes by the share of max HP dealt. No rule measured brought even battles inside G4's band: under each, about half or more reached round 9 (G4 allows 15%). The 25% cap cut that by 8–23 points, within a few of the storm cap, the best of the six. G4's band is R2a's measurement on real battles; if they still run long, the next levers (lower Heartcaps, a stronger storm) are untested. In SPEC §6.4, §6.5, §6.7 (step 4 and E7), §11.1, §14.6, §18.3 and D26.
- **R1 measures:** agreed 2026-11-01 (R1 S0). The race model (`tools/lib/roundRace.ts`), G4's even pairing first, then G3's pairs. It reports rounds to fall per battle index (1–5, a Fortified elite, the boss), the share reaching round 9, Routs and lead changes, under the 500 cap and the alternatives, with the cap-binding and drawn shares per budget. The call stays open for R1's gate (R1/T049).
- **Revisited:** R2a's playtest gate (2026-11-03) found the cap asymmetric (at most 500 dealt to battle 1's general, up to 750 taken), and at 100 a supply it binds in 70% of damaging rounds, so D28's bigger Heartcaps barely matter. #68 takes a fixed cap to R2b's S0.

### X6 · Is the 25–35 minute run binding?

- **Question:** Is a run of 25–35 minutes at 1× a hard target now, and which lever goes first if runs are longer?
- **SPEC's first guess:** 25–35 minutes, at about 30 s of planning a round (§8.2, D29); §8.2 also cites 35–45 with lives; M8 step 6 asserts 25–35.
- **Recommendation:** Measure first. R2a adds local play-time instrumentation (RB-Q3): planning seconds per round in R2a's playtest, run minutes in R2b's. Re-set the target after R2b's playtest. Levers in order: rounds per battle (X5), then the route's length, with its shape in data (§8.2's SHOULD). **Why:** SPEC's own figures give 32–44 minutes, more if battles reach round 9 (A203), and §8.2 disagrees with itself.
- **Alternatives:** A203's order (the curve, a 2× clash default, a 5-row route); or a 35–45 minute target now.
- **Blocks:** R2a S0; R2b gate; M8 step 6.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation: measure first. R2a's report shows planning seconds per round (R2a S19, on RB-Q3's clock), R2b's playtest reads the run's minutes, and the target is re-set after R2b's playtest. If runs are long, the levers go in order: rounds per battle (X5), then the route's length. In SPEC §8.2.

### X7 · Bots that buy the answer (§18.2 #34)

- **Question:** (§18.2 #34) Should the tools add the "buy the answer to what you saw" planning policy, and should G14 and G15 use it?
- **SPEC's first guess:** bots plan by fixed weights (§12.2).
- **Recommendation:** Yes, in R2a, with G8, G14 and G15 reported under both policies. G3 and G12 stay on fixed weights. This disagrees with the first guess. **Why:** §12.2 itself says "a bot that ignores it understates the player". Under the full reveal the general may be too easy, and only a bot that reads its army can show that (A198).
- **Alternatives:** fixed weights only; G14 and G15 then read one policy.
- **Blocks:** R2a S18's answer bot (T120, T121, T124); #35.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation, departing from SPEC's first guess (fixed weights only). R2a adds `bot:answer`, which plans after the general and leans toward the answer to the army it sees (R2a S18). G8 reports under both policies in R2a, and G14 and G15 under both in R2b. G3 and G12 stay on fixed weights. In SPEC §12.2, §12.3 and §18.2 #34.

### X8 · The general between counter cycles

- **Question:** Once its plots fill, the general changes its army only at rounds 4 and 7. Fix it now?
- **SPEC's first guess:** it sells only at a counter's activation and banks what's left (§7.2).
- **Recommendation:** Measure first. R2a's sim summary reports, per round, its banked gold, its free plots and exact replays of the last clash. Keep two default-off data knobs for the playtest: a light lean toward last round's answer from round 2, and "replace when full". **Why:** battle 1 fills its plots around round 6–7, later battles sooner, and its army then sits fixed about 2 rounds at a time (A049). With no colony change and no power, the clash replays exactly (A206).
- **Alternatives:** "replace when full" as default data now (it moves goldens); a counter lean every round (A198).
- **Blocks:** R2a S15's readouts and knobs (T100, T101).
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation: measure first, and §7.2's rule stands. R2a's sim summary reports, per round, the general's banked gold, its free plots, what it planted and sold, and whether the clash replayed the last one exactly. Two default-off knobs in `balance.rounds.ai` (`leanToLastAnswer`, `replaceWhenFull`) are there for the playtest. In SPEC §7.2.

### X9 · Flyers after the first release

- **Question:** Do flyers (the Drift Stalk and the Air pack) ship in the first release?
- **SPEC's first guess:** flyers come "later" (§1.3 #11); the draw is "4 of the other 9" until then (§11.15); M7 adds what "the ten run packs need".
- **Recommendation:** No. Re-add flyers (not the Rhizomorph) to §17 as after the first release, and say runs deal 4 of 9 packs. Until flyers ship, Hardy Spores and Second Flush join every run's relic pool. **Why:** M7 counts ten packs while no milestone builds flyers (A191, A178), and the Air pack's relics, Pivot's reward among them, never reach a run (A139, A173).
- **Alternatives:** flyers in M7 with the tenth pack; #64–#66 then move to M7.
- **Blocks:** R3 S0; M6 S0; M7 S0.
- **Note** 2026-11-03 (R2b S4c; the user: "Cleanup first"): the `flyers` preset is deleted, with the code only it used and the Driftling's and the Drift Stalk's sprites (the note under A109). Whichever way X9 goes, flyers' milestone builds them from SPEC (§1.3 #11, §5.3, §11.2, §11.3), and the sprites are in git history. This doesn't decide X9.
- **Decision:** _open_

### X10 · Run it back, and records, in two parts

- **Question:** Build "Run it back, and records" (§16 M6's independent piece) in two parts?
- **SPEC's first guess:** it MAY land before, during or after M6 (§16 M6).
- **Recommendation:** Yes. records-1 now, beside R1: the records store (RB-Q1), the last commander and bans, and Run it back. records-2 after R2b, reading RoundResult: truthful summary lines, the grudge line, play time, the records views and the codex. **Why:** Run it back barely touches R2 if play time stays out of the hashed run state (A185). The summary lines read battle records that R2b rewrites (A073).
- **Alternatives:** all of it after R2b.
- **Blocks:** records-1 S0; records-2's S3 (RB/T024); R2a S19's play clock (R2a/T126, T128).
- **Decision:** 2026-11-01, asked in the hub session that started records S0, and recorded there: the recommendation, with one change made when the user agreed the plan. records-1 now, beside R1: the profile store holding the last commander and bans, the remembered setup, and Run it back. It records no runs, so no v1 run is ever recorded: the user wants work toward v2 only. records-2 after R2b, reading R2b's run: the run records, the truthful summary lines, the grudge line, play time, the records views and the codex. Play time stays in records-2, on R2a's play clock. In SPEC §16 M6 and `docs/run-it-back-plan.md`.

## R1: calls the R1 plan makes

These are measurement calls, not rules. `docs/r1-plan.md` proposes them and you agree them at its review. None moves a golden.

### R1-Q1 · How the check places squads

- **Question:** Which squads stand in front, in what order do files fill, and which lane does each building take on Twin Roots?
- **SPEC's first guess:** melee in front, ranged and emplacements behind, files from 1, lanes alternating (§16 R1).
- **Recommendation:** Use §7.3's tags for the line (A006). Fill centre-out: files 2, 3, 1, 4, or 2, 1, 3 per Twin Roots lane (A012). On Twin Roots, each building goes to the lane with fewer of its line, ties to the top, with §7.3's round-1 rule as a variant (A002). By-plot formation is R2's (A019). This disagrees with the first guess. **Why:** alternating splits a pair, so each lane fights mono on the map where mono Sporeling escaped (A002).
- **Alternatives:** §16 as written; the numbers then transfer less well to R2.
- **Blocks:** R1's fields and formation.
- **Decision:** 2026-11-01 (R1 S0): the recommendation. The line follows §7.3's tags. Files fill centre-out: 2, 3, 1, 4, or 2, 1, 3 per Twin Roots lane. On Twin Roots each building goes to the lane with fewer buildings of its line, ties to the lane with fewer in all, then the top lane, and §7.3's round-1 rule runs as a variant. Formation by plot is R2's. In SPEC §16 R1 and §12.2.

### R1-Q2 · Spending a budget

- **Question:** When a bot's next pick doesn't fit the budget, does the army skip it or stop? Which bots count as monos?
- **SPEC's first guess:** picks "until a gold budget is spent", economy picks skipped (§16 R1).
- **Recommendation:** Filter economy and utility cards out first. Skip a pick that doesn't fit and keep drawing until nothing fits or the plots are full. Ignore `afterSeconds`. Give each army its own stream, keyed by seed and bot (A003). Monos are army buildings, the Tender included (A016). **Why:** stopping at the first miss can leave an army at a third of its budget (A003).
- **Alternatives:** map `afterSeconds` to rounds (A003).
- **Blocks:** R1's army builder.
- **Decision:** 2026-11-01 (R1 S0): the recommendation. Economy and utility cards are filtered out first. A pick that doesn't fit is skipped and drawing goes on until nothing fits or the plots are full. `maxOwned` holds and `afterSeconds` is ignored. Each army has its own stream, keyed by seed and bot. The monos are the army buildings, the Tender's Ring and the Puffball Mortar included. In SPEC §16 R1 and §12.2.

### R1-Q3 · What counts as a clash win

- **Question:** For G3 and G12, which side wins a clash, and how do draws count?
- **SPEC's first guess:** none; R1 records lane winners (§16 R1).
- **Recommendation:** More lanes won, then more uncapped damage (storm ×1.0), else a draw worth half a win each. Report §6.7's capped result and the share of drawn rounds beside it. G12 passes on the best confirmed answer's worst field, among answers that pass G3 (A001). Quote mono-against-mono cells with jitter on (A007). **Why:** today's counter code passes on the mean and has no draws (A001), and under the 500 cap most split Twin Roots clashes draw, pulling answers toward 50% (A022). Reviewers split: A001 used the capped result, but this rule doesn't hang on X5.
- **Alternatives:** §6.7's capped round result (A001).
- **Blocks:** R1's clash rows and bars.
- **Decision:** 2026-11-01 (R1 S0): the recommendation. More lanes won, then more uncapped Heartcap damage (storm ×1.0), else a draw worth half a win to each side, with §6.7's capped result and the drawn share beside it. G12 passes on each build's best confirmed answer's worst field, among answers that pass G3. Numbers are quoted at jitter ±0.2, with the jitter-free run beside them. In SPEC §16 R1 and §12.2.

### R1-Q4 · The extra plots at the top budgets

- **Question:** How are the "up to 4 more plots at the top budgets" fielded, when the budgets are rounds of one battle?
- **SPEC's first guess:** "plus up to 4 more at the top budgets, as sprawl allows" (§16 R1).
- **Recommendation:** Every budget at the map's base plots (8, or 6 a lane), plus one "late-run colony" reading with all 4 extra plots at 1,200 and 1,500 gold, placed by #19's order (A005). **Why:** it decides whether cheap builds are plot-capped late, and it caps the two fields differently (A005).
- **Alternatives:** extra plots at 1,500 only.
- **Blocks:** R1's army builder; R1-Q5.
- **Decision:** 2026-11-01 (R1 S0): the recommendation. Every budget is measured at the base plots (8, or 6 a lane), plus one late-run colony reading with all 4 extra plots at 1,200 and 1,500 gold, opened in #19's first-guess order. In SPEC §16 R1 and §12.2.

### R1-Q5 · The full colony and the bench case

- **Question:** Does a full colony include upgrades that add units, and is §13.7's budget in supply or in live units?
- **SPEC's first guess:** about 100 supply a side, "augments that add units included" (§13.7, D33).
- **Recommendation:** At most 150 live units a side at the arrival, so two colonies fit `bench-300`, which stays a stress case of placed units (A112, A119). The bench case is the worst case: 12 plots on one lane, 16 on Twin Roots, the biggest squads, merging off (A004, A018). R1 names the lever that keeps a colony inside. This disagrees with "about 100 supply". **Why:** SPEC's own guesses already give 144 supply (A004, A200), and a tick's cost follows live units.
- **Alternatives:** keep 100 supply and cut sprawl or squads; a budget per lane (A200).
- **Blocks:** R1's bench case; #7, #18, #50.
- **Decision:** 2026-11-01 (R1 S0): the recommendation. §13.7's budget becomes at most 150 live units a side when the armies arrive, in place of about 100 supply. The bench case is the true worst case: 12 plots on one lane, 16 on Twin Roots, the biggest squads, merging off. It plays one whole clash and is report-only until R2 adds it to G11. R1 names the lever that keeps a colony inside. In SPEC §1.1, §4.6, §5.4, §11.1, §12.2, §13.7, §15.4, §16 R1, D33 and §18.2 #7's first guess.

### R1-Q6 · Variants that add buildings

- **Question:** What do the sixth-archetype variant and the variants that add the Burster Pod and the Rhizomorph Tunnel measure?
- **SPEC's first guess:** "the sixth archetype's candidates: the Burster Pod, and the Puffball Mortar as an emplacement" (§16 R1).
- **Recommendation:** A core-six check for each candidate: builds and answers limited to the five core spawners plus it, `bot:balanced` reweighted, read against §11.4's intended graph (A011). For appended spawners, run G3 twice: `bot:balanced` on its data weights, and buying them at weight 1 (A023). **Why:** as written, the Mortar variant equals the baseline and the Burster variant equals `--proto burster` (A011), and appended buildings change the reference army (A023).
- **Alternatives:** the variants as written.
- **Blocks:** R1's variant runs; #36.
- **Decision:** 2026-11-01 (R1 S0): the recommendation. A core-six check for each candidate (the Burster Pod, then the Puffball Mortar), read against §11.4's intended graph. The variants that append spawners run G3 twice: with `bot:balanced` as the data has it, and on its data weights. In SPEC §16 R1 and §12.2.

### R1-Q7 · v2 targeting in the check

- **Question:** Do siege units keep v1's preference for the Mortar's building in R1's clash, or does a tool-only flag make them fight the nearest enemy, as §5.2 says for rounds?
- **SPEC's first guess:** none; R1 runs "today's combat".
- **Recommendation:** Add the flag, off in battles and on in the clash check. **Why:** today siege units go for the Mortar first and every unit targets it as a 2×2 rectangle (A008), so #10's reading would measure v1. Off by default, it moves no golden.
- **Alternatives:** no flag; mark those cells as v1 behaviour (A008).
- **Blocks:** R1's sim knobs; #10.
- **Decision:** 2026-11-01 (R1 S0): the recommendation. A tool-only `noBuildingPreference` flag, absent in every battle and on in the clash check. In SPEC §16 R1 and §12.2.

### R1-Q8 · v2 movement in the check

- **Question:** Does R1's clash use §5.2's idle seek, or today's march to the far edge?
- **SPEC's first guess:** none; R1 runs today's movement.
- **Recommendation:** The idle seek, as a default-off knob that the clash check turns on. R2 builds it anyway. **Why:** today unopposed squads walk past the enemy and park at the far edge. That inflates G13's stalls, decides lanes at 45 s by supply instead of by combat, and blunts the square law R1 measures (A021).
- **Alternatives:** today's movement, plus a count of far-edge idlers (A021).
- **Blocks:** R1's sim knobs; G13.
- **Decision:** 2026-11-01 (R1 S0): the recommendation. A tool-only `idleSeek` flag, absent in every battle and on in the clash check. In SPEC §16 R1 and §12.2.

### R1-Q9 · A three-lane field

- **Question:** Should R1 also read a 3-lane colony (`data/maps/test-3lane.json` re-cut to 4 plots a lane)?
- **SPEC's first guess:** none; R1 reads one lane and Twin Roots (§16 R1).
- **Recommendation:** Yes, as a 20-seed screen outside the bars. **Why:** v1's 3-lane map had the worst mono results, and Three Hollows joins G3 and G12 only at M7 (A184).
- **Alternatives:** wait for M7.
- **Blocks:** #62.
- **Decision:** 2026-11-01 (R1 S0): the recommendation. A 20-seed screen of `test-3lane` read as 3 lanes of 4 plots, outside the bars, with no map edit. In SPEC §16 R1 and §12.2.

The R1 plan settles these itself, with no call from you: A009 (the pace variant stamps `u.wave = 0`), A013 (the run time estimate), A017 (named tool options).

## R1: rows R1 measures

R1 reports a measure for each row, and you settle it at R1's review gate (§16 R1 step 4). At the gate each knob gets one outcome: adopted as data, kept as a default-off knob, or deleted (A109). Before the kept set is adopted, R1 also runs `npm run experiment -- --proto kept --checks duels,g8` (A116).

**Knob outcomes (A109), decided** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the recommendation. Adopted as data: `kept` (`pinned`, `sporecloud`, `burster`, `cleave`, `rhizomorph`) and `clashshield`, written as v2's arrival shield under its own key. Deleted: `noeldersplash` (#9), `clashpace` (#12) and `swarmread`, which counting Elder parts replaces if R2a S0 settles R2-Q3 that way. R2a writes the tool-only switches `noBuildingPreference` and `idleSeek` as v2's targeting and movement, and R2b deletes the flags. For R2a to watch: alone, `pinned` weakens the answers to the Sporeling and the Capguard, and under `kept` v1's G2 newly fails on the Gill Archer. In SPEC §16 R2.

**A2 and B3 dropped** 2026-11-03 (R2b S4; the user: "Drop both"). §16 R2 had kept `a2` and `b3` as default-off knobs, but R2b's S3 found that no battle in rounds reads `ai.counter.counterFloorWeight` or `firingCongestion`. Both presets go, with their schema keys, and `?proto=a2` or `?proto=b3` now reads as an unknown preset (A117). The kept knobs are `flyers` and `bosslives`. In SPEC §16 R2 and R2b's T055 and T058.

**The last switches** 2026-11-03 (R2b S4c). The user: "I'm not personally a fan of having a bunch of these that we have to keep track of and think we should remove these where it makes sense and either have separate prototype branches or some sort of debug mode for testing these features instead." The hub advised against prototype branches for playtests, since the dev site deploys only `develop` and `main`, and against a debug menu, which would keep both versions of the code, and proposed a cleanup. The user: "Cleanup first". So `flyers` is deleted with the code only it used, since the round sim never had flyer rules (X9). `bosslives` stays until R2b's playtest (S14), which adopts it as data or deletes it (#16). X8's two knobs go in S12 (T129) unless S11's measurement of the general shows a need. The tools' `--flags`, which are test switches, and the general `path:value` override stay. From now on there are no new named presets: a candidate rule is a data change measured with the override, or code on a short-lived branch, measured there and merged as the default with the user's OK, or deleted, and any temporary switch names the session that removes it. In SPEC §16 R2, CLAUDE.md, `.claude/rules/balance.md` and R2b's T170–T174.

### #7 · Squad sizes and the full colony

- **Question:** What does each building field a round, and what's the most a full colony fields?
- **SPEC's first guess:** §11.2's Squad column (8 Sporelings, 4 Capguards); about 100 supply a side (D33).
- **R1 reports:** each building's squad and value per gold under every squad variant; G3, G12 and G13 per budget; the full colony (R1-Q5).
- **Recommendation:** Sizes per building, the Burrow first, not one global minute. If a global scale is wanted, use round(squad × S / 60) (A010). **Why:** whole-batch rounding at 45 and 75 s moves some squads by 25–50% and others not at all (A010).
- **Alternatives:** one global squad minute.
- **Blocks:** R2a's starting data.
- **Decision:** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the recommendation, departing from §11.2's first guess for one building. Squads are sized per building: §11.2's Squad column, with Capguard Hall at 3 and the Burrow at 8. At 4 Capguard Hall was the strongest mono in clashes (90% against `bot:balanced`, 50 seeds), and `kept` with the arrival shield and Capguard Hall at 3 is the only set that passed G3, G12 and G13 at 50 seeds. The full colony stays at most 150 live units a side, a readability budget, since Twin Roots' 192 ticked inside G11; in rounds an upgrade adds no unit per batch, which brings Twin Roots to 128. For R2a to watch: at 3 Capguard Hall still wins 92% at 300 gold and 2% at 1,500, and its value per gold falls to 1.11 (band 1.45 ± 0.15), so check it round by round, not only the pooled mean. In SPEC §11.2, §11.6, §13.7, §14.2 and §18.2 #7.

### #8 · Mixed-wave shields

- **Question:** Do mixed armies need the rework's shields (20% of max HP for an army of 2 or more unit types) to pass the strict counter bar in clashes?
- **SPEC's first guess:** not adopted.
- **R1 reports:** the shield variant, run last: G12 and G3 with and without it.
- **Recommendation:** Agree: not adopted, unless the bar fails without it and the shield fixes it. **Why:** it's a rule from v1's waves, and every system kept is one more to learn (playtest F8).
- **Alternatives:** adopt it in clash form.
- **Blocks:** R2a's data.
- **Decision:** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the recommendation, departing from SPEC's first guess (not adopted) by this block's own test: G12 failed without the shield and passed with it, on today's combat and on `kept` (50 seeds). The arrival shield is v2's rule: each lane's army of 2 or more unit types arrives with shields of 20% of each unit's max HP, under its own data key, not v1's `waves`. In the chosen set it carries G3 too: with Capguard Hall at 3 and no shield, G12 passed but G3 failed mono Sporeling (62%), Hammercap Forge (56%) and Rootbreaker Den on Twin Roots (73%; 20-seed screens). In SPEC §5.3, §1.3 #11, §11.1, §16 R2, Appendix A and §18.2 #8.

### #9 · The Elder Sporeling's splash

- **Question:** Does the Elder Sporeling keep its 0.6-tile splash?
- **SPEC's first guess:** yes, as today's data does outside `?proto=rework`.
- **R1 reports:** the splash-off variant, and each army against its merge-off twin per budget (G7's round form), since the muster makes merging near total (A015).
- **Recommendation:** Keep it, unless mono Sporeling fails G3 or G12 with it and passes without it. **Why:** under the muster every big swarm brings Elders, so the splash rides on the build that failed v1's strict bar (§12.3).
- **Alternatives:** off, as under the rework.
- **Blocks:** R2a's data.
- **Decision:** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the recommendation. The splash stays: without it mono Sporeling still failed G3 (66%, 50 seeds), and with the arrival shield and Capguard Hall at 3 it passes G3 (48%) and has an answer (95%) with the splash on. `noeldersplash` is deleted. In SPEC §5.6, §11.1, §16 R2, Appendix A and §18.2 #9.

### #10 · How an emplacement counts

- **Question:** How does an emplacement fight, and how does it count when a lane ends?
- **SPEC's first guess:** a unit that never moves, with Structure armor; it keeps its side alive; 0 supply; only emplacements at 45 s is a draw (E5); powers hit it (§6.7, D50).
- **R1 reports:** the Mortar's cells under R1-Q7's flag, and how often emplacements alone hold a lane to 45 s.
- **Recommendation:** Agree, and add its unit rules to §6.7: immovable in separation; radius at most 0.8 tiles, range from its centre; hit by clouds, bursts and powers; never healed; pins nothing; never merges (A029). **Why:** "never moves" leaves these open; today's separation would push it, and towers measure range from the centre (A029).
- **Alternatives:** some supply toward the 45 s comparison.
- **Blocks:** R2a's clash core; E5, E6.
- **Decision:** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the recommendation. The first guess stands, and A029's body rules join §6.7: separation never moves an emplacement, its radius is at most 0.8 tiles and its range runs from its centre, clouds, bursts and powers hit it, and it's never healed, pins nothing and never merges. Emplacements alone held 0–2% of lanes (20 seeds), the siege units' preference for buildings changed no cell, and the Mortar became a piece only with spore clouds (41–45%), where Rootbreaker Den answers it at 100%. In SPEC §6.7, D50 and §18.2 #10.

### #11 · Overflow

- **Question:** Where does a squad too big to stand apart in its slot put its units?
- **SPEC's first guess:** it keeps its k × k grid and spacing and packs tighter, its units overlapping (D47).
- **R1 reports:** each squad that overflows at each size measured, with the Vault's and the Shrine's sizes (+1 and +2 a squad) added (A020).
- **Recommendation:** Agree. The report should say the answer rests on few cases: at the planned sizes only one squad overflows (A020).
- **Alternatives:** a bigger grid that spills past the slot.
- **Blocks:** R2a's `formationOf`.
- **Decision:** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the recommendation. D47's packing stands, though it rests on few cases: no squad overflows at the planned sizes, only grown ones (Capguard Hall at 75 s, Hammercap Forge with one more unit, Rootbreaker Den and Scythecap Grove with two more). In SPEC §4.6, D47 and §18.2 #11.

### #12 · Formation on the approach

- **Question:** Does a squad keep its place on the approach, marching at its slowest unit's pace with ranged units 1 tile behind?
- **SPEC's first guess:** no; each unit moves at its own speed, as in v1.
- **R1 reports:** the pace variant against the baseline: G12, G13 and clash length.
- **Recommendation:** Agree, unless the pace variant clearly improves G12 or G13. If it's adopted, it needs its own data key and code that reads the lane's army, not v1's `waves` (A109).
- **Alternatives:** adopt the pace rule.
- **Blocks:** R2a's clash core.
- **Decision:** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the recommendation. No pace rule: `clashpace` left G12 failing (mono Sporeling 50%, mono Capguard 53%, 50 seeds) and G13 where it was (1.2%). `clashpace` is deleted. In SPEC §5.2, §16 R2 and §18.2 #12.

### #13 · Does the muster count toward 45 s?

- **Question:** Does the 1 s muster count toward the 45 s clash cap?
- **SPEC's first guess:** yes; the clash clock starts on the muster's first tick.
- **R1 reports:** the stall share (G13) and the median clash length, both ways.
- **Recommendation:** Agree. **Why:** one clock is simpler to show (the round chip shows it, §10.2), and the muster is 1 s of 45.
- **Alternatives:** start the cap after the muster.
- **Blocks:** R2a's clash core.
- **Decision:** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the recommendation. The muster counts: the two readings capped 5.8% and 5.5% of clashes (50 seeds), with the same 19.4 s median. In SPEC §5.6, §6.7 and §18.2 #13.

### #14 · An Anti-Ranged kind

- **Question:** Does the counter cycle get an Anti-Ranged kind that scores `rangedShare`, with `swarm` spawners as its set?
- **SPEC's first guess:** no; the four kinds until R1 measures it.
- **R1 reports:** the clash matrix and each mono build's best answers per budget beside §7.4's sets, and whether swarm spawners best answer mono Gill Archers.
- **Recommendation:** Add it if R1 confirms the swarm answers archers in clashes. **Why:** no kind scores the ranged share, and today the Burrow is the general's archer answer only by accident, through the Anti-Swarm set (A056, #15).
- **Alternatives:** the four kinds.
- **Blocks:** R2a's counter cycle.
- **Decision:** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the recommendation, departing from SPEC's first guess (the four kinds), as this block proposed if R1 confirmed the swarm answers archers. It did: mono Sporeling Burrow beat mono Gill Nest 100% at every budget, and the Sporeling and Veilstalker pair 95–100% (50 seeds). Anti-Ranged scores `rangedShare`, with `swarm` spawners as its set. It bites only once `eliteShare` counts Elder parts (R2-Q3, R2a S0): counted plainly, mono Gill Nest reads Elite. Ranged's place in the tie order, after Line, is a first guess. In SPEC §7.4 and §18.2 #14.

### #15 · Counter sets from the clash matrix?

- **Question:** Do counter sets come from R1's clash matrix instead of damage types and tags?
- **SPEC's first guess:** no; by damage type and tag (§7.4).
- **R1 reports:** the clash matrix beside §7.4's sets.
- **Recommendation:** Keep type and tag, with three fixes: `swarm` units are in neither the Anti-Swarm nor the Anti-Line set; a missing answer is the cheapest counter that beats the dominant armor; a unit that deals no damage is in no set (A056, A055). **Why:** "cheapest" picks the Burrow against a swarm, and the Morel Warren, which loses to Capguards, against a line (A056). A set made from the matrix would move with every retune.
- **Alternatives:** sets from the matrix; §7.4 as written.
- **Blocks:** R2a's counter cycle.
- **Decision:** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the recommendation. Type and tag, with the three fixes, and the clash matrix as a check, not the source. With the swarm read, §7.4's sets held the matrix's best answer to mono Sporeling (Capguard Hall) and mono Veilstalker (the swarm builds), and missed for mono Capguard, which reads Elite from 600 gold while Gill Nest answers it. In SPEC §7.4 and §18.2 #15.

## R2a: a battle in rounds

`docs/r2a-plan.md` settles these before building. The new questions come first, then the §18.2 rows R2a needs.

### R2-Q1 · What you see of the general from round 2

- **Question:** From round 2, do you see the general's whole current plan, or its army as it fielded last round, with this round's plantings shown at Begin?
- **SPEC's first guess:** its whole army, every round (§1.3 #3, §7.5, §17 #9).
- **Recommendation:** Keep the full reveal as the default (your answer to playtest F18), and A/B "last fielded from round 2" as a dev-site view option in R2a's playtest. It's a view rule, so no golden moves (A198). **Why:** with the full reveal you always move last and see its counters first; the archived rounds design rejected the rule for that reason, and Mechabellum hides each round's placements (A198). X7's bot measures the risk.
- **Alternatives:** "last fielded" now (A198's pick); or a visible edge for the general.
- **Blocks:** R2a S19's "last fielded" view (T127).
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation. The full reveal stays the default (§1.3 #3, §7.5). R2a's playtest A/Bs a "last fielded" view from round 2 (`reveal=last`), a view rule that moves no golden. In SPEC §7.5 and §16 R2.
- **The A/B's result:** 2026-11-03 (R2a's playtest gate, S21; the user with the hub, "Yes, start both"): the full reveal stays the default. The user: "I think the default should be to be reacting to your opponent". `reveal=last` goes to `docs/ideas/reveal-last-fielded.md` as a possible variant or difficulty setting. In SPEC §7.5 and §16 R2 step 10.

### R2-Q2 · Interest

- **Question:** Cut interest, keep it as it is, or raise it?
- **SPEC's first guess:** 1 per 20 gold banked at Begin, up to 10 (§6.2, D36).
- **Recommendation:** Raise it to 1 per 10 gold, up to 30, in data, and report banked gold per round. This disagrees with the first guess. **Why:** +10 against a 100 stipend is no choice: one more building beats it (A205). A real stake gives the Trade pack's banking build a point. Both round-3 testers found interest confusing (§6.2), so if R2a's playtest still does, cut it.
- **Alternatives:** cut it, and re-do Deep Cellars, the Spore Exchange and Patient Growth (A205); keep it.
- **Blocks:** R2a's economy.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation, departing from SPEC's first guess (1 per 20 gold banked, up to 10). Interest is 1 per 10 gold banked at Begin, up to 30 (`interestPer` 10, `interestCap` 30, in data), and the report shows banked gold per round. If R2a's playtest still finds interest confusing, cut it. In SPEC §6.2, §11.1 and D36.

### R2-Q3 · How eliteShare counts merged units

- **Question:** With every squad of 3 or more knitting at the muster, how do merged units count toward `eliteShare`?
- **SPEC's first guess:** units "at its base supply"; Anti-Elite scores 1.2 × eliteShare; R1 measures the swarm read (§7.4).
- **Recommendation:** Count merged units at their parts' base supply, and R1 records them that way (A014). Then recalibrate from R1: count Elder parts only, or cut the 1.2 to about 0.6. Test that `bot:balanced`'s round-4 colony doesn't read Elite (A041). **Why:** under every reading a default mixed army reads Elite, so the general sends Veilstalkers, which you dodge by switching merges off (A041). "At its base supply" allows readings ninefold apart (A014).
- **Alternatives:** the swarm read alone.
- **Blocks:** R1 S0 (what R1 records); R2a's counter cycle.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation as R1 refined it, departing from SPEC's first guess (Bloomed and Elder units count). `eliteShare` is the share of the fielded supply in Elder units, with every unit counted at its parts' base supply: an Elder counts its 9 parts' tier-1 supply, and a Bloomed unit its 3 parts', though a Bloomed unit isn't elite. The swarm read (`ai.counter.swarmMaxSupply`) isn't v2's rule. In R1's records this is the one reading that keeps `bot:balanced` from reading Elite (0–10% of its armies from 300 to 1,500 gold, against 100% counted plainly and 10–66% with the swarm read), and it lets #14's Anti-Ranged kind bite. In SPEC §7.4, §11.1 and §16 R2.
- **R1 measures:** agreed 2026-11-01 (R1 S0). R1 records eliteShare after the muster with merged units at their parts' base supply (a Bloomed unit counts its 3 parts' tier-1 supply, an Elder its 9), with and without the swarm read, plus the Elder-only share and the four kinds' scores. The rule for §7.4 stays open for R2a S0.

### R2-Q4 · The single battle's general kit

- **Question:** In a single battle, where the general's kit is the whole roster, which cards may it buy?
- **SPEC's first guess:** "A kit card its weights don't list gets weight 1" (§11.11).
- **Recommendation:** Weight 1 applies only to cards §7.8 adds to a run kit and to a counter's missing answer. A single battle's general buys only its listed weights, as today (A045). **Why:** read literally, G4's scripted opponent would buy every building in the roster.
- **Alternatives:** weight 1 for every kit card.
- **Blocks:** R2a's general; G4.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation, departing from §11.11's literal rule ("a kit card its weights don't list gets weight 1"). Weight 1 applies only to the cards §7.8 adds to a run kit and to a counter's missing answer. In a single battle the general buys only its listed weights, as today. In SPEC §11.11.

### R2-Q5 · Who buys the Burster Pod and the Rhizomorph Tunnel

- **Question:** When R1's chosen buildings become data, how do the generals and the bots get them?
- **SPEC's first guess:** they "join the roster like any other" (§16 R2); today `aiWeight` adds them everywhere (§11.11).
- **Recommendation:** Keep R1's conditions, written into data: weight 1 in `bot:balanced`, rush, turtle, greedy and each general's weights; preferred lists only where wanted. Retire `aiWeight` and the kit append, pinned by a kit test (A048). Revisit with #48 and #49. **Why:** reviewers split. With no weights, G3 and G12 stop matching R1; `aiWeight` is a back door that changes every kit silently (A048).
- **Alternatives:** no weights until R3 (A048).
- **Blocks:** R2a's data; G3, G12.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation. The Burster Pod and the Rhizomorph Tunnel get weight 1 in `bot:balanced`, rush, turtle and greedy and in each general's weights, written in data, as R1 measured them. `aiWeight` and the kit append retire, and a kit test pins it. #48 and #49 revisit it in R3. In SPEC §11.11 and §16 R2.

### R2-Q6 · bot:rush and bot:turtle in rounds

- **Question:** What are `bot:rush` and `bot:turtle`, now that their placement knob (depth into territory) means nothing?
- **SPEC's first guess:** §14.2's BotDef has no placement field; both bots stay (§7.1).
- **Recommendation:** Drop `placement` and keep both as weight profiles. Rush: no economy, swarm first. Turtle: Capguards, Mortars and Cellars, its description reworded. Keep `limits`, read in rounds, in BotDef (A044, A038). **Why:** both play in the tournament (§12.2), and `bot:turtle` was the best answer to Sporelings in the counter matrix (61%, §7.4).
- **Alternatives:** retire both.
- **Blocks:** R2a's bots.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation. `placement` goes, and `bot:rush` and `bot:turtle` stay as weight profiles: rush buys no economy and swarm first, and turtle buys Capguards, Mortars and Cellars, its description reworded. `limits` stays in BotDef, read in rounds through `afterRound`. In SPEC §7.1 and §14.2.

### R2-Q7 · Cordis and Puppet Bloom under the muster

- **Question:** Cordis's knit bonuses and Puppet Bloom are kept, but the muster already knits every reachable group. Do they need v2 effects?
- **SPEC's first guess:** both kept (§11.10).
- **Recommendation:** Measure Puppet Bloom's trios per clash in R2a. Below a median of 1, give it a v2 job, such as lifting same-type units within 3 tiles one tier (A057). Turn the knit-time bonus into something the muster uses, such as merged units starting at +10% HP (A096). **Why:** knit time acts only after the muster (§5.6), and few trios remain then, so the auto policy rarely fires and the Cordis smoke fails (A057).
- **Alternatives:** keep both.
- **Blocks:** R2a's powers; R2b's knit content (A096).
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation, with R1's reading: after the muster Puppet Bloom found a median of 0 trios at 300 and 600 gold (rounds 1–3) and 1 from 900. R2a measures it again in real rounds (S16). If the median stays below 1, R2b's S0 gives Puppet Bloom a v2 job (such as lifting same-type units within 3 tiles one tier) and turns Cordis's knit-time bonus into something the muster uses (such as merged units starting at +10% HP). Until then both are kept as written. In SPEC §11.10.
- **R2b S0:** 2026-11-03 (the user: "Take them all"): S16 read a median of 0 trios, so Puppet Bloom's v2 job is to lift same-type units within 3 tiles one tier, and Cordis's knit-time bonus becomes merged units starting at +10% HP (R2b S7). In SPEC §11.10.

### R2-Q8 · Display text out of the hashed state

- **Question:** Should display text leave the hashed battle state when R2 rewrites it?
- **SPEC's first guess:** text is copied into the state; the plain wording SHOULD move into data at R2's golden refresh (§10.4); R4 moves it out of `src/ui/words.ts` (§16).
- **Recommendation:** Yes, in R2a. The UI reads text by id, so rewording never moves a golden, and R4b deletes `src/ui/words.ts` (A152). **Why:** otherwise R4b and #56 move the goldens again, and `words.ts` would show v1 sentences over R2's relic effects (A152).
- **Alternatives:** words into data, and another refresh in R4b.
- **Blocks:** R2a's state; R4b's text pass.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation. From R2a the round battle's state holds ids and numbers only, and the UI reads names and text from content by id, so rewording never moves a round golden. R4b deletes `src/ui/words.ts`. In SPEC §10.4 and §14.4.

### R2-Q9 · How long test:slow may run

- **Question:** How long may `npm run test:slow` take, and must G12, G14 and G15 assert in it?
- **SPEC's first guess:** the guardrails assert and pass there (§16 R2 step 7).
- **Recommendation:** Assert them all, split across files, with G3, G12 and the runs on worker pools, in about 15 minutes on the dev machine. Record the runtimes in `docs/balance-backlog.md`. Past 20 minutes, G12 screens in the suite and confirms with `--checks counters` (A102). **Why:** G12 took about 35 minutes single-threaded in v1, and vitest's per-test timeout is 600 s (A102).
- **Alternatives:** G12 only through `--checks counters`.
- **Blocks:** R2a's guardrails.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation. `npm run test:slow` asserts every round guardrail, split across files, with G3, G12 and the runs on worker pools, in about 15 minutes on the dev machine. The runtimes go in `docs/balance-backlog.md`. Past 20 minutes, G12 screens in the suite and confirms through `--checks counters`. In SPEC §12.3 and §16 R2.

### R2-Q10 · G16 over role-split pairs

- **Question:** Should G16 count only role-split pairs: one front-line and one back-line building?
- **SPEC's first guess:** every even pair of army buildings (§12.3).
- **Recommendation:** Yes, at budgets where both fit, ≥ 60% pooled, with a column per budget; same-role pairs are reported only. With a third rank, the swap trades the front and back ranks and leaves the third in place (A108, A120). **Why:** 28 of the 45 pairs are two front-line buildings, so the real cases would need about 78% for the pool to reach 60% (A108).
- **Alternatives:** every even pair.
- **Blocks:** R2a's guardrails.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation, departing from SPEC's first guess (every even pair). G16 counts role-split pairs, one front-line and one back-line building, at budgets where both fit: at least 60% pooled, with a column per budget. Same-role pairs are reported only. With a third rank, the swap trades the front and back ranks and leaves the third in place. In SPEC §12.3.

### R2-Q11 · Clash-rule details

- **Question:** Do you accept these clarifications to §5.6, §6.5, §6.7 and §14.6 as a set?
- **SPEC's first guess:** none; SPEC is silent or loose on each.
- **Recommendation:** Yes:
  - units arrive in plot order (lane, rank, file, then unit), and the muster resolves inside Begin, before any tick or power; muster ticks skip targeting, movement, separation and attacks (A024, A026);
  - the muster knits within a lane only (A040);
  - a unit knit from two squads takes the lowest-id parent's squad stats (A028);
  - a lane that has ended freezes, and a power aimed there is refused (A030, A053);
  - round damage is recorded capped, before the HP floor; the round's result and the Decision use it, so heals never subtract (A035, A092, A209).

  **Why:** two Burrows side by side make an Elder or none by plant order (A024), and §6.5's "the HP each Heartcap lost" breaks once Mending Moss heals (A209).
- **Alternatives:** settle each one apart.
- **Blocks:** R2a's clash core and scoring.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation, as a set. Units arrive in plot order (lane, rank, file, then unit), and the muster resolves inside Begin, before any tick or power; muster ticks skip targeting, movement, separation and attacks. The muster knits within a lane only. A unit knit from two squads takes the lowest-id parent's squad stats. A lane that has ended freezes, and a power aimed there is refused. Round damage is recorded capped, before the HP floor, and the round's result and the Decision use it, so heals never subtract. In SPEC §5.6, §6.5, §6.7 and §14.6.

### R2-Q12 · Planning-screen details

- **Question:** Do you accept these planning-screen rules as a set?
- **SPEC's first guess:** none; §10.2 and §10.3 are silent on each.
- **Recommendation:** Yes:
  - Begin by key needs a fresh keydown after planning opens, ignores auto-repeat and waits about 400 ms; the button stays instant (A065);
  - R2a's basic marks show your hits on enemy squads; the reverse direction and card marks come with R4b;
  - hovering a formation slot snaps the ghost to its plot, and a click there plants;
  - the aftermath holds under Help or settings; the speed control stays live there, with pause hidden (A078).

  **Why:** Space means Begin, pause and skip in turn, so one held key can start a clash with no planning (A065).
- **Alternatives:** settle each one apart.
- **Blocks:** R2a's battle UI.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation, as a set. Begin by key needs a fresh keydown after planning opens, ignores auto-repeat and waits about 400 ms, while the button stays instant. R2a's basic marks show your hits on enemy squads; the reverse direction and card marks come with R4b. Hovering a formation slot snaps the ghost to its plot, and a click there plants. The aftermath holds under Help or settings, and the speed control stays live there, with pause hidden. In SPEC §10.2, §10.3 and §13.5.
- **R2b S0:** 2026-11-03 (the user: "Take them all"): a card is placed on its plot only, so hovering or clicking a squad's spot in the field no longer places it (S21b's note; the user at R2a's gate: "stick to just having the user place the buildings"). R2b/T167 builds it. In SPEC §10.2 and §10.3.

### R2-Q25 · A rough playtest after S14

- **Question:** Should R2a get a rough playtest as soon as a battle in rounds is properly playable, after S14 (the tray, inspect, the planning and clash chrome, and the report by round), before the counter cycle, the power, the round tools and the polish (S15–S20)?
- **SPEC's first guess:** one playtest, at R2a's end (S21; §16 R2 step 10).
- **Recommendation:** Yes. The user plays two or three battles on the dev site's dev-only entry and answers step 10's questions 1, 2, 3 and 6 in rough form, plus whether anything should change in S15–S20. S15 and S16 start after it. **Why:** v2 rests on one bet, that planning with the general's army in view and then watching whole armies clash is fun. S14 is the first point that bet can be played, and seven sessions follow it before S21. It's X1's reason for splitting R2, applied once more.
- **Alternatives:** the playtest at S21 only.
- **Blocks:** S15 and S16 (T145, T146).
- **Decision:** 2026-11-01: yes (the user, in the hub session). S14b (T145, T146) in `docs/tasks/r2a-battle-in-rounds.md`, and SPEC §16 R2 step 10.

### #19 · The third rank's tiles and the order its plots open

- **Question:** Where do the third rank's tiles come from, and in what order do its plots open?
- **SPEC's first guess:** maps reserve homeCols 6, the back two columns closed until gained; one lane opens files 2, 3, 1, 4; Twin Roots opens each lane's third rank in turn, the top lane first (§4.6).
- **Recommendation:** Agree, with a map field such as `colony.startRanks: 2`, since homeCols alone can't say which ranks start open; and on Twin Roots, files 2, 1, 3, alternating lanes from the top (A031). Armilla's Landholder opens the first third-rank plot from battle 1. **Why:** R2a draws the closed columns into every map (A031).
- **Alternatives:** gained plots beside the colony.
- **Blocks:** R2a's maps and plot model.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation, adding to SPEC's first guess. Maps reserve homeCols 6, and a `colony.startRanks` field (2) says which ranks start open. One lane opens files 2, 3, 1, 4; Twin Roots opens files 2, 1, 3, alternating lanes from the top. Armilla's Landholder opens the first third-rank plot from battle 1. In SPEC §4.6, §11.9 and §18.2 #19.

### #22 · The margin with siege units

- **Question:** What margin does a lane's winner score when siege units are in play?
- **SPEC's first guess:** the winner's damage supply minus the loser's, never below 0.
- **Recommendation:** Agree. **Why:** siege units count once to decide a lane at 45 s and double for damage (§6.7), so subtracting damage supply keeps a close siege win small, and the floor stops a negative margin when the loser fields more siege.
- **Alternatives:** the winner's damage supply minus the loser's surviving supply.
- **Blocks:** R2a's scoring.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation: SPEC's first guess, the winner's damage supply minus the loser's, never below 0. In SPEC §6.7 and §18.2 #22.

### #23 · The clash's edge cases E1–E8

- **Question:** Do §6.7's edge cases hold as written?
- **SPEC's first guess:** §6.7's table.
- **Recommendation:** Agree, with one rule scenario each (§16 R2 step 4). E5 and E6 follow #10. If X5 changes the cap, E7's "each capped at 500" becomes "each capped".
- **Alternatives:** none worth pricing.
- **Blocks:** R2a's scoring and rule scenarios.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation: §6.7's table as written, with one rule scenario each (§16 R2 step 4). E5 and E6 follow #10, and E7 reads "each capped" under X5. In SPEC §6.7 and §18.2 #23.

### #25 · A power fired during the muster

- **Question:** When, inside the muster, do merged units replace their parts, and so can a power break a muster knit?
- **SPEC's first guess:** on the clash's first tick, so a power hits the merged units and can't break a muster knit.
- **Recommendation:** Agree; R2-Q11 makes it exact. **Why:** the preview promises what fields (D48), and a power that broke muster knits would break the promise.
- **Alternatives:** knits land at the muster's end, so a power can break them.
- **Blocks:** R2a's clash core and power.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation: SPEC's first guess, made exact by R2-Q11. Merged units replace their parts inside Begin, before the clash's first tick, so a power hits the merged units and can't break a muster knit. In SPEC §5.6 and §18.2 #25.

### #29 · A bank reserve for the general

- **Question:** Does the general keep gold back for interest?
- **SPEC's first guess:** 0; it spends whatever it can.
- **Recommendation:** Agree for now. X8's readouts show what it banks anyway once its plots fill (A049). Revisit if R2-Q2 raises interest, since a reserve matters only when interest is worth having.
- **Alternatives:** a reserve up to the interest cap.
- **Blocks:** R2a's general.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation: 0 for now, so the general spends what it can. X8's readouts show what it banks anyway, and since R2-Q2 raised interest, R2a's measurements revisit it. In SPEC §7.2 and §18.2 #29.
- **R2b S0:** 2026-11-03 (the user: "Take them all"): still 0. Once its plots are full, the general spends its gold on #67's upgrades.

### #30 · The general's lane rule on Twin Roots

- **Question:** Which lane does the general send each building to?
- **SPEC's first guess:** the lane where it lost the most last round, the need lowered by each squad it plans there (§7.3, D42).
- **Recommendation:** Agree. Add a lane to each fielded squad, so the rule and its aggressive variant read only the record (A047). **Why:** Twin Roots is where mono Sporeling escaped its answers (§7.3), and G12 on Twin Roots tests this rule directly.
- **Alternatives:** split evenly by supply.
- **Blocks:** R2a's general.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation: SPEC's first guess, with a lane on each fielded squad, so the rule and its aggressive variant read only the record. In SPEC §7.3, D42, §14.4 and §18.2 #30.

### #31 · Should a counter land a round late?

- **Question:** Should a counter activate a round after its analysis, so your build gets a round to pay off?
- **SPEC's first guess:** no; it activates in the planning phase of its analysis.
- **Recommendation:** Agree. **Why:** you see the counter before you plan anyway (§7.5), so a delay only weakens a general that may already be too easy (A198). R2-Q1's A/B covers the "my build never paid off" worry.
- **Alternatives:** a one-round delay.
- **Blocks:** R2a's counter cycle.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation: SPEC's first guess. A counter activates in the planning phase of its analysis. In SPEC §7.4 and §18.2 #31.

### #35 · The guardrail bands

- **Question:** What are the bands of G6's second clause and of G14–G16, and G6's 700-HP deficit?
- **SPEC's first guess:** §12.3's numbers, set by R2's first full measurement and its playtest.
- **Recommendation:** Agree, all from one measurement, and G4 and G6 start from X5's race model. Four changes:
  - G6's first clause becomes a band, such as 20–45% (A111);
  - G6 gives both sides equal max HP and plays both seats (A107);
  - G15 bounds boss reach, such as ≤ 85% (A199);
  - G8's 40–65% and G14's 70–90% are set together, the lift from drafts stated (A204).

  **Why:** v1's G6 read up to 88%, where falling behind was an edge (A111).
- **Alternatives:** §12.3 as it stands.
- **Blocks:** R2a's guardrails; R2b's G14 and G15.
- **Decision:** R2a's part agreed 2026-11-03 (R2a T125; the user: "Take them all", then through the hub "Yes, with the rerun" and "Go to 100"), from R2a S18's measurement (`docs/balance-backlog.md`). With them the pace: `heartcapDamagePerSupply` 25 → 100. A 200-battle rerun put 75 a supply at 23.5% reaching round 9 and 100 at 18.5%, with the same median and win rate, and the damage cap binding in 70% of damaging rounds against 60%. G4 plays 200 battles, keeps 6–8 rounds and the bot winning 30–70%, and allows 20% to reach round 9 rather than 15%. G6 keeps 20–45% for the behind side, from a deficit of 1550 HP (what a 3000-HP side loses in rounds 1–3 of G4's 200 battles at 100 a supply, by each round's median; it was 700), and ≥ 50% for the winner's Heartcap hit. G8 keeps 40–65% for `bot:balanced` and gives `bot:answer` a ceiling of 80%. G13 keeps ≤ 15% capped and lowers the clash band to 15–40 s. G16 keeps ≥ 60%, and its reading (24%: the formation rule loses to its ranks traded) is a rule question for the user. Still _open_ for R2b: R2b S0 sets G14's and G15's bands and re-reads G8's beside G14's, with the drafts' lift stated.
- **R2a part agreed:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the approach. Every band comes from one measurement, and G4 and G6 start from X5's race model, with four changes: G6's first clause becomes a band, such as 20–45%; G6 gives both sides equal max HP and plays both seats; G15 bounds boss reach, such as ≤ 85%; and G8's and G14's bands are set together, with the drafts' lift stated. R2a measures and sets G4, G6 (both clauses, single battle), G8 under both policies, G13 and G16 (R2a T124, T125); R2b sets G14 and G15 and re-reads G8 beside G14. In SPEC §12.3 and §18.2 #35.
- **R2b part agreed:** 2026-11-03 (R2b S0; the user: "Take them all"): G14's and G15's bands are set at S12 (T131) from S11's measurement of whole runs, starting from §12.3's (G14: 70–90% of battle 1s for each commander; G15: at least 40% reach the boss, the bot wins 40–70% there, and reach is at most 85%), with G8's band re-read beside G14's and the drafts' lift stated. Six round guardrails that miss on R2a's data (T133) stay known misses through R2b: S14 tunes G1, G2 and G7, each retune with the user's OK; G3 and G8's mono clause wait for R3's copies, and G16's Gill Archer and Mortar pairs for R3's combos (the user chose "Known misses, owned later"). In SPEC §12.3 and §16 R2 step 7.

The R2a plan settles these itself, with no call from you: A027, A032, A034, A036, A039, A043, A046, A052, A059, A060, A061, A064, A067, A068, A069, A070, A071, A072, A075, A076, A103, A104, A106, A110, A113, A114, A115, A118, A121.

## R2b: the run in rounds

`docs/r2b-plan.md` settles these before building. The new questions come first, then the §18.2 rows R2b needs.

### R2-Q13 · A guaranteed answer in battle 1

- **Question:** Must every commander's starting kit be able to answer every battle-1 general's army?
- **SPEC's first guess:** none. Starters are §8.1's and battle-1 kits §7.8's (Mold: a Sporeling Burrow; the Baron: a Capguard Hall and a Truffle Cellar).
- **Measured** (R2b S1b, 2026-11-03, T028; [balance-backlog.md](../balance-backlog.md)): `bot:balanced` wins 52%, 29% and 45% of battle 1s for Vesper, Armilla and Cordis, against G14's 70–90%. Old Mother Mold wins 73–94% of her pairings, while every starter beats the Baron more often than not (79%, 54% and 85%).
- **Recommendation:** Yes, but through Mold's battle-1 opener, not a free blueprint. Give her opener a Sporeling Burrow and a Truffle Cellar, the shape of the Baron's (`data/generals.json`, §7.8), in S5 in T068's place. Vesper's battle 1 then reaches 82% and Cordis's 76%, inside the band, and Mold stays in battle 1. There's no opening pick, so T068 builds nothing. **Why:** the free blueprint's best case, the Burster Pod held from round 1, lifts Mold's pairings by 17–21 points and still leaves her winning 56–75%. Armilla stays at 52–55% under every option. That's her own problem, which waits for T082's Tithe and S11's re-read.
- **Alternatives:**
  - the opening pick as first recommended: one free blueprint from the always-in set in battle 1's round-1 planning, after the general plans (A201), with the Burster Pod first in its list. Battle 1 reaches 61%, 52% and 54%.
  - keep Mold out of battle 1 (her `appearsIn` [2, 3]): 78%, 55% and 83%, but every battle 1 is the Baron's, and she's already hard in battle 2.
  - no guarantee until S11 measures with the drafts in.
- **Blocks:** R2b's run flow; G14.
- **Decision:** 2026-11-03 (R2b S1b, on T028's table; the user: "Soften Mold's opener"): the recommendation.
  - The opening pick isn't adopted, so T068 builds no free blueprint.
  - Old Mother Mold's battle-1 opener becomes a Sporeling Burrow and a Truffle Cellar (`data/generals.json`, §7.8). S5 builds it in T068's place, with its changelog entry and goldens.
  - S11 measures G14 again once the drafts, Mold's v2 passive and the Tithe are in.
  - In SPEC §7.8.

### R2-Q14 · What a boss win by Decision pays

- **Question:** What does a boss win by Decision pay?
- **SPEC's first guess:** a Win by Decision pays half (§6.5); §8.6's boss row has no Decision case.
- **Recommendation:** The full boss reward (60 Spores, +2 Amber), and fix the curve so routs happen (X5). **Why:** with a 3600 boss and a flat 500 cap, most boss wins are Decisions (A097, A197), and the run's climax shouldn't pay half on a technicality. Today's rewards code already pays the boss in full (A097).
- **Alternatives:** half, as §6.5 reads.
- **Blocks:** R2b's rewards.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. A boss win by Decision pays the full boss reward, 60 Spores and +2 Amber. In SPEC §6.5 and §8.6.

### R2-Q15 · Home Brood and other "+1 unit" effects

- **Question:** Does Vesper's Home Brood stay "+1 unit for each front-rank spawner", or become a uniform bonus?
- **SPEC's first guess:** +1 unit (§11.10).
- **Recommendation:** A uniform bonus: Vesper's front-rank squads get +10% HP and damage. Keep "+1 unit" for one-clash effects (Fresh Spores), and check the Vault (#26) and the Shrine (#61) per building. This disagrees with the first guess. **Why:** +1 unit is worth about 14 gold on a Burrow and about 130 on an Amanita Lodge, which steers Vesper to heavy front ranks, unlike her v1 passive's flat 10% (A085).
- **Alternatives:** +1 unit, as written.
- **Blocks:** R2b's commander content.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. Home Brood gives Vesper's front-rank squads +10% HP and damage, in place of +1 unit. "+1 unit" stays for one-clash effects such as Fresh Spores, and the Vault (#26) and the Shrine (#61) are checked per building. In SPEC §11.10.

### R2-Q16 · Rhizome Tithe in rounds

- **Question:** What does the Tithe count, and when does the auto power policy fire it?
- **SPEC's first guess:** +2 gold per supply of enemy units killed so far this clash, paid next planning; "fire it late for more, but before the clash ends" (§11.10).
- **Recommendation:** The clash state counts killed supply (merged units at their own supply, emplacements 0), and firing at 0 kills is allowed. The auto policy fires on the first think tick at 40 s or later, or when either side's surviving supply in an unfinished lane is at most 25% of its arrival supply (A094). **Why:** "fire it late" isn't an algorithm, and G14 runs Armilla on the auto policy.
- **Alternatives:** fire at a fixed 30 s.
- **Blocks:** R2b's power content; G14 for Armilla.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. The clash counts the enemy supply killed (`ClashState.killedSupply`: a merged unit at its own supply, an emplacement at 0), and firing at 0 kills is allowed. The auto policy fires on the first think tick at 40 s or later, or once either side's surviving supply in an unfinished lane is at most 25% of its arrival supply. With a median clash of 19 s at 100 a supply, the second clause is the one that usually fires. In SPEC §11.10.

### R2-Q17 · The generals' passives under the muster

- **Question:** What exactly do Old Mother Mold's and the Pale Sovereign's v2 passives do?
- **SPEC's first guess:** Mold: `swarm` squads field 10% more units; the Sovereign: units from buildings in its doctrine's counter sets deal +15% damage (§7.7).
- **Recommendation:** Mold: phrase it by what fields after the muster, for example +10% HP for swarm units (A058). The Sovereign: the union of its dual doctrine's two sets and the active counter's set, read at each Begin; no doctrine, no bonus (A050). **Why:** 9 Sporelings knit into one Elder, so "+1 Sporeling" can mean fewer bodies, not more (A058).
- **Alternatives:** Mold's swarm buildings merge off; the passives as written.
- **Blocks:** R2b's general content.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. Old Mother Mold's swarm units get +10% HP, phrased by what fields after the muster. The Pale Sovereign's bonus covers the union of its dual doctrine's two counter sets and the active counter's set, read at each Begin; no doctrine, no bonus. In SPEC §7.7.

### R2-Q18 · The opening doctrine and the opener

- **Question:** Should the opening doctrine change the general's round-1 opener, or should §7.6 stop promising that you see it there?
- **SPEC's first guess:** it applies from round 1, "so the player sees its effect in the general's opener" (§7.6).
- **Recommendation:** Swap the opener's last army card for the cheapest kit card in the doctrine's counter set, when the kit holds one (A042). **Why:** the opener is bought first and leaves 0–230 gold, so the doctrine rarely touches round 1. With the swap, the callout "remembers your SWARM" matches the army you see.
- **Alternatives:** reword §7.6: its first visible picks come in round 2.
- **Blocks:** R2b's intel work.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. The opening doctrine swaps the opener's last army card for the cheapest kit card in the doctrine's counter set, when the kit holds one, so the opener shows it. In SPEC §7.6.

### R2-Q19 · Relic details for R2

- **Question:** Do you accept these relic rules as a set?
- **SPEC's first guess:** §11.7's v2 effects.
- **Recommendation:** Yes:
  - the Sporestorm Sigil's "50% stronger" is Spore Burst 90 → 135 damage, Rhizome Tithe 2 → 3 gold a supply and Puppet Bloom's radius 3 → 4.5 tiles, shown in the previews (A054, A086);
  - Rot-Eater and the Sigil switch on with the storm (round 4 under Mold Bloom or Early Storm), not at a fixed round 5 (A090);
  - Mycorrhizal Link, and Forward Spores if R1 drops spore clouds, stay out of the pool through a `requires` flag until their system exists (A083, A138);
  - for Martyr's Bloom, a squad is its units by source building after the muster, and a squad absorbed whole at the muster doesn't burst (A099).

  **Why:** a rare relic with no effect is a dead card (A083).
- **Alternatives:** settle each one apart.
- **Blocks:** R2b's relic content.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. As a set: the Sporestorm Sigil makes Spore Burst 90 → 135 damage, Rhizome Tithe 2 → 3 gold a supply and Puppet Bloom's radius 3 → 4.5 tiles, shown in the previews; Rot-Eater and the Sigil switch on with the storm's first round; Mycorrhizal Link stays out of the pool behind `requires` until R3's combos, and Forward Spores keeps its form, since R1 kept spore clouds; Martyr's Bloom counts a squad as its units by source building after the muster, and a squad absorbed whole at the muster doesn't burst. In SPEC §11.7.

### R2-Q20 · One path for gold earned in a clash

- **Question:** Clash gold takes two paths: credited at once (Spore Tithe, Rot-Eater) or held as pending gold (Rhizome Tithe, Truffle Hunters). Keep both?
- **SPEC's first guess:** both; pending gold is lost if the battle ends first (§6.2).
- **Recommendation:** One path: credit it at once with an event, shown as one "from the clash" line in the next round's income, and drop `pendingGold` (A037). This disagrees with §6.2's separate row. **Why:** the gold can't be spent before the next planning phase and never carries between battles, so only the readout changes (A091). A091 routes everything through `pendingGold` instead, which works too.
- **Alternatives:** everything through `pendingGold` (A091).
- **Blocks:** R2b's economy content; R3's Truffle Hunters.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. Gold earned in a clash takes one path: credited at once with a `gold` event of source `clash`, and shown as one "from the clash" row in the next round's income. `pendingGold` goes (R2b/T074). In SPEC §6.2.

### R2-Q21 · The Grove's way out

- **Question:** Should the Grove always offer a choice you can take?
- **SPEC's first guess:** regain a life (unlit at full lives) or graft (§8.7).
- **Recommendation:** Add an always-lit Leave choice. Bots take a life if hurt, else graft, else leave (A082). **Why:** at full lives with every owned track maxed, the Grove offers no legal choice; today's repair is always available.
- **Alternatives:** a third reward in place of Leave.
- **Blocks:** R2b's Grove.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. The Grove always offers Leave beside its two choices. Bots take a life if hurt, else graft, else leave. In SPEC §8.7.

### R2-Q22 · Saves: the report after a reload, and the power

- **Question:** What does a reload on the battle report show? And does firing the power save the battle?
- **SPEC's first guess:** the run records the result before the report; a Begin save resumes at the clash's first tick, "so a power fired in the interrupted clash can be fired again" (§8.9); an elite's Amber is "rolled on Continue" (§10.5).
- **Recommendation:** A reload on the report goes to the next screen with a one-line notice. The battle's end applies the whole result, Amber roll included, and the report shows it (A081). Firing the power saves the battle, and a resume replays it at its tick (A087); this disagrees with §8.9. **Why:** the report's state is gone after a reload (A081), and a re-fire after a reload is a fully informed retry of the only live decision (A087).
- **Alternatives:** keep §8.9's re-fire, and say so plainly.
- **Blocks:** R2b's saves.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. A reload on the battle report goes to the next screen with a one-line notice, since the battle's end applies the whole result, the elite's Amber roll included, before the report shows it. Firing the power saves the battle, and a resume replays it at its tick, in place of §8.9's re-fire. In SPEC §8.9 and §10.5.

### R2-Q23 · The run's kit until R3

- **Question:** Does R2 change the run's kit to cards with copy counts (§14.4), or keep a list of building ids until R3?
- **SPEC's first guess:** the kit "gains a copy count per card" (§8.10); copies arrive in R3.
- **Recommendation:** Keep a list of ids in R2; R3 adds copies with its own save version (A095). If X4 brings copies into R2a, the kit gets copy counts in R2b, in #32's migration. **Why:** the change touches about 79 references in 23 files with no R2 behaviour (A095).
- **Alternatives:** copy counts in R2b regardless.
- **Blocks:** R2b's run state and migration.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. The run's kit stays a list of building ids through R2, and R3 adds copy counts with its own save version (R3-Q6). In SPEC §8.10 and §14.4.

### R2-Q24 · Where the in-battle draft sits

- **Question:** Where does the draft sit, so the general's formation stays in view while you choose?
- **SPEC's first guess:** the field dims except the general's preview, with three large cards (§10.2); no position given.
- **Recommendation:** A bottom sheet in place of the bottom band, whose tray, inspect and controls are idle during a draft anyway, with shorter cards and details in tooltips. The field stays uncovered, dimmed except the general's preview, whose squads stay hoverable (A062). **Why:** today's centred 940 px dialog covers the general's slots at 1280×720.
- **Alternatives:** the cards over your half of the field.
- **Blocks:** R2b's draft UI.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. The draft is a bottom sheet in place of the bottom band, with shorter cards and details in tooltips. The field stays uncovered, dimmed except the general's preview, whose squads stay hoverable. In SPEC §10.2.

### #16 · The boss battle and lives

- **Question:** Does losing the boss battle end the run, or cost a life? And do lives left at the boss count for anything?
- **SPEC's first guess:** it ends the run, as in v1 (D30).
- **Recommendation:** Agree that it ends the run. Add "lives left count at the boss" (such as +250 boss Heartcap per life left, shown on its node) as a default-off knob for R2b's playtest, and bound G15's boss reach (#35) (A199). **Why:** at a 70% win rate, three non-boss losses come in only 3–8% of runs, so lives left at the boss are worth nothing (A199).
- **Alternatives:** a boss loss costs a life and you fight again; or sprawl yours alone (#21).
- **Blocks:** R2b's lives.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. Losing the boss battle ends the run, as in v1. "Lives left count at the boss" is a default-off knob, `bosslives`, for R2b's playtest, and G15 bounds boss reach (#35). In SPEC §8.5, §8.8 and §18.2 #16.

### #17 · A clean-win bonus, and a Rout's kit

- **Question:** Should a battle won with little Heartcap damage pay a bonus? And may an early Rout pay less kit than a Decision?
- **SPEC's first guess:** no clean-win bonus (§8.6); drafts come only after the rounds reached (§8.3).
- **Recommendation:** Agree on no bonus; R2b's gate question 4 asks again. Fix the Rout's kit: a won battle pays each draft it skipped by ending early as an extra spoils pick, and SPEC says whether a Decision's "2 cards" means pick 1 of 2 (A207). **Why:** with drafts tied to rounds reached, a player who's ahead gains by not finishing the general (A207).
- **Alternatives:** accept the gap; or a clean-win bonus.
- **Blocks:** R2b's rewards and spoils.
- **Decision:** the Rout's kit, 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. A won battle pays each draft it skipped by ending early as an extra spoils pick, and a Decision's "2 cards" is a pick of 1 from 2. There's no clean-win bonus for now: R2b's playtest asks again (question 4, T148), and that half stays _open_ until then. In SPEC §8.3, §8.6 and §18.2 #17.

### #18 · Sprawl: how many plots, and when

- **Question:** How many plots does the colony gain, and when?
- **SPEC's first guess:** +1 per battle won, up to 4 more, as a third rank (D32).
- **Recommendation:** Agree, with the cap held inside R1-Q5's budget (16 plots on Twin Roots may not fit). The run stores sprawl gains only (`plotsGained`), apart from relic, trait and commander plots (A098). **Why:** the general's colony copies your sprawl gains (D49), so it needs them apart from what's yours alone.
- **Alternatives:** a plot per battle fought, won or lost.
- **Blocks:** R2b's run state; #21, #50.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. The colony gains +1 plot per battle won, up to 4 more, as the third rank, inside R1-Q5's budget of 150 live units a side. The run stores sprawl's gains only (`plotsGained`, 0–4), apart from relic, trait and commander plots. In SPEC §4.6, §11.1 (`plotGrowth`), §14.4 and §18.2 #18.

### #20 · Planted buildings between battles

- **Question:** Do planted buildings carry from battle to battle?
- **SPEC's first guess:** no; each battle starts with both colonies empty and every copy free (D49).
- **Recommendation:** Agree. **Why:** each battle is a new map with its own loam and stumps (§11.9), and an empty colony makes round 1's planning the opener, against an army you can see.
- **Alternatives:** the colony carries, re-placed on the new map.
- **Blocks:** R2b's run flow.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. Planted buildings don't carry between battles: each battle starts with both colonies empty and every copy free. In SPEC §4.6 and §18.2 #20.

### #21 · How many plots the general opens

- **Question:** How many plots does the general's colony open in a battle?
- **SPEC's first guess:** the map's plots plus your sprawl gains, not your relics', traits' or commander's (D49).
- **Recommendation:** Agree. **Why:** the general keeps pace without copying what's yours alone.
- **Alternatives:** the map's plots plus (battle index − 1), so a lost battle costs a real plot (A199); worth it only if #16's knob doesn't make lives matter.
- **Blocks:** R2b's sprawl.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. The general's colony opens the map's plots plus your sprawl gains, not your relics', traits' or commander's. In SPEC §4.6 and §18.2 #21.

### #24 · When a heal on a round's result lands

- **Question:** When does an effect that heals on a round's result, such as Mending Moss, land?
- **SPEC's first guess:** after the cap (§6.7 step 4), never above max HP.
- **Recommendation:** Agree. Damage is recorded before the heal (R2-Q11), so a heal never changes a Decision. **Why:** it then shows as a heal, not as a smaller hit.
- **Alternatives:** before the cap.
- **Blocks:** R2b's relic content (Mending Moss).
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. A heal on a round's result lands after step 4's damage and cap, never above max HP. The damage is recorded before the heal, so a heal never changes a Decision. In SPEC §6.7 and §18.2 #24.

### #26 · The Rhizome Vault's new effect

- **Question:** What does the Rhizome Vault do, now that the supply cap it raised is gone?
- **SPEC's first guess:** each spawner beside it fields 1 more unit (§4.4, §11.2).
- **Recommendation:** Keep the effect, but build it in R3, as a combo with the Vault on one side and a new squad-size patch field (A124). Until then the Vault stays out of drafts and kits through R2-Q19's `requires` flag (A083), so Armilla's R2 drafts offer five core cards. **Why:** R2's effect DSL has no adjacency selector and nothing that adds units to a squad, and the Vault is R3's Elder Grove building anyway (A124).
- **Alternatives:** a plot-adjacency selector in R2's DSL (A083).
- **Blocks:** R2b's content; R3's combos.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. The Vault keeps its effect, each spawner beside it fielding 1 more unit, built in R3 as a combo with a squad-size patch field. Until then it stays out of drafts and kits behind R2-Q19's `requires` flag, so Armilla's R2 drafts offer five core cards. In SPEC §4.4, §11.2 and §18.2 #26.

### #27 · v1's upgrade levels in R2

- **Question:** What do v1's upgrade levels do in R2, before augments replace them?
- **SPEC's first guess:** a unit-per-spawn level adds a unit per batch (Burrow 12, Morel Warren 9); gold per tick becomes +12 a round; levels on building HP, the supply cap or spawn speed do nothing and stop being offered (§11.6).
- **Recommendation:** Agree on the effects. Dead levels get `offered: false` and empty effects, and drafts skip past them, so later levels stay reachable (A105). Unit levels become fixed adds (Burrow +4, Warren +3), re-derived from R1's squads; the general's kit and Veteran follow the same rule (A100). **Why:** levels are offered in order, so a dead level mid-track strands the next one, such as the Exchange's interest +10 (A080). A080 deletes dead levels; the flag keeps the three-level schema and saved counts.
- **Alternatives:** delete the dead levels and remap saved levels (A080).
- **Blocks:** R2b's drafts.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all", then "Keep R1's call"): the effects as R1's review gate left them (§18.2 #7). A level that added a unit per spawn adds none in rounds, since one more unit per batch put Twin Roots' full colony at 192 units a side, over §13.7's 150. Levels on building HP, the supply cap or spawn speed do nothing, and a level of gold per tick is +12 gold a round. Levels that do nothing get `offered: false` and empty effects, and drafts skip past them, so later levels stay reachable (A105). The recommendation's fixed unit adds (Burrow +4, Warren +3) predate R1's gate and are dropped. In SPEC §11.6 and §18.2 #27.

### #28 · Planning commands while a draft is open

- **Question:** Are `plant`, `sell` and `toggleMerge` refused while your draft is open, as `beginClash` is?
- **SPEC's first guess:** yes.
- **Recommendation:** Agree. **Why:** R2-Q24's sheet takes the bottom band, so the tray is idle anyway: pick, reroll or skip, then plan.
- **Alternatives:** plan freely with the draft open.
- **Blocks:** R2b's drafts and commands.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. `plant`, `sell` and `toggleMerge` are refused while your draft is open, as `beginClash` is: pick, reroll or skip, then plan. In SPEC §4.7, §14.5 and §18.2 #28.

### #32 · A run saved before R2

- **Question:** What does a run saved before R2 become?
- **SPEC's first guess:** it migrates, keeping its kit, relics and progress, with 3 lives; the alternative is to end it with a notice. It MUST NOT be lost silently (§8.9).
- **Recommendation:** Migrate: lives = 3 − v1 battles lost (at least 1); plots by sprawl from battles won; a mid-battle save restarts at round 1's planning with the notice; the title tells an unreadable save from none (A084). The version bump lands with the first run-state change. **Why:** §8.9 already keeps a v1 run's progress when its battle restarts, and R2's step 6 tests it; "3 lives" alone gives a run that lost battles full lives (A084).
- **Alternatives:** end it with a notice; simpler, and before M6 nothing outlives a run.
- **Blocks:** R2b's migration.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. A run saved before R2 migrates: lives = 3 − v1 battles lost (at least 1), plots by sprawl from battles won, and a mid-battle save restarts at round 1's planning with the notice. The title tells an unreadable save from none, and `RUN_VERSION` 2 lands with the first change to RunState's shape (R2b S1). In SPEC §8.9 and §18.2 #32.

### #33 · The battle-1 economy tip

- **Question:** Does the battle-1 economy tip still help, now that the general plans first and can punish a greedy opener?
- **SPEC's first guess:** keep it as it is (§10.2).
- **Recommendation:** Agree; R2b's playtest decides. **Why:** it costs nothing to keep, and the playtest shows whether greed is punished.
- **Alternatives:** drop it.
- **Blocks:** R2b's gate.
- **Decision:** _open_ until R2b's playtest (S14, T148). 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. The tip stays as it is until then.

### #67 · What gold does once the colony is full

- **Question:** What does gold do once the colony is full? R2a's rough playtest (2026-11-02, `docs/playtest-feedback.md`) ran out of ways to spend it in a battle's later rounds, and was bored then.
- **SPEC's first guess:** nothing new. S18's pace call (T124, T125) and R2b's drafts cover it (§6.1).
- **First recommendation** (2026-11-02): agree, and revisit it if R2a's playtest gate (S21) still finds empty late rounds. **Why:** the empty rounds come mostly from the pace. §6.2 plans about one new spawner a round after the opener, so 8 plots fill around round 7, about when a battle of the target length (6–8 rounds) ends, while S10b measured a median of 9 rounds, with 73% of battles reaching round 9. Upgrades come as draft picks (v1's cards in R2b, then R3's augments), so a full colony's gold buys rerolls and swaps, and S15's counter cycle gives it a reason to sell and replant.
- **R2a's playtest gate** (2026-11-03): "nothing new" no longer holds. At 100 a supply a battle takes a median of 7 rounds, and the user wasn't bored, but: "Once you have all your slots filled, it's kind of hard to adjust your strategy or change up your playstyle to adapt to what your opponent is doing." Their idea: "upgrading buildings/units with gold might be an option worth exploring", and they're "happy to wait on this proposal". In S20's step 3 the player's colony (`bot:balanced`) was full from round 5 in 37 of 40 battles, and then banked a median of 320 gold a round (X8's readouts).
- **Recommendation** (2026-11-03): R2b's S0 picks a use for gold once the plots are full. The candidates:
  - upgrades bought with gold, the user's idea. Each should be a real jump, such as a squad arriving Bloomed, since small percentages measured below noise (DR-7);
  - buying stumps into extra plots.
- **Alternatives:** keep "nothing new", and let R2b's draft rerolls and R3's augments take the gold.
- **Blocks:** R2b's S0 (the drafts) and R3's S0 (the augments).
- **Decision:** 2026-11-03 (R2b S0; the user chose "Gold upgrades in R2b"): upgrades bought with gold, the user's idea, each a real jump. The first form to measure is a planted building whose squad fields one merge tier up for the rest of the battle. R2b builds it in its own session after S5's drafts (S5b), which first measures what the drafts leave of the banked gold, then sets the price; the general and the bots buy upgrades too. In SPEC §6.1 and §18.2 #67.
- **S5b's details:** 2026-11-03 (the user: "Take them all" in S5b's session, on T159's table in `docs/balance-backlog.md`, and "Take both" when the hub relayed them):
  - every unit of an upgraded squad arrives Bloomed (tier 2), so it can knit on to Elders at the muster;
  - a side may upgrade only once its colony is full: the player, the general and the bots alike;
  - spawners only, the Burster included, and one upgrade per building per battle;
  - the price is a share of the building's cost: the lowest of 150%, 200% and 300% that keeps G4, G8 and G13 in band over T163's 200 battles, set without a second stop.

  In SPEC §6.1, §4.4 and §14.5.

### #68 · The Heartcap cap and D28

- **Question:** Should the round cap be one fixed number for both Heartcaps, rather than 25% of the loser's max HP?
- **SPEC's first guess:** 25% of the loser's max HP a round (X5, §6.7 step 4): 750 for your 3000, 500 for battle 1's general, 900 for the boss. Later generals are harder by their bigger Heartcaps (D28).
- **R2a's playtest gate** (2026-11-03): the user: "It feels weird being limited to 500 damage while you can take more (750?)." Either side still falls after four capped losses. But the cap binds in 70% of damaging rounds at 100 a supply (S18), and a bigger Heartcap raises its own cap, so D28's later generals barely last longer.
- **Recommendation:** decide at R2b's S0, on R2a S21b's measurement of a fixed cap (`docs/balance-backlog.md`). **Why:** one number for both sides reads as fair, and it makes D28's bigger Heartcaps cost rounds again. The measurement says what it does to G4's rounds and the bot's wins.
- **Alternatives:** keep X5's 25%; equal Heartcaps (A193, one of X5's alternatives).
- **Blocks:** R2b's S0: the run's scoring by battle index, and G14's and G15's bands (#35).
- **Decision:** 2026-11-03 (R2b S0; the user chose "Fixed 750 for both"): one fixed cap for both Heartcaps, 750 HP a round, in place of X5's 25% of the loser's max HP. S21b measured it passing G4, G6, G8's bands and G13 (a median of 6 rounds, 13% reaching round 9, the bot winning 65%), and it makes D28's bigger Heartcaps cost rounds again. R2b's S1 sets it (`roundDamageCap.flat`) and updates the goldens. In SPEC §6.7, D28 and §18.2 #68.

### #69 · The general's openings

- **Question:** How varied should the general's opening moves be?
- **SPEC's first guess:** one opener per general (§7.7, §11.11), worked through first in round 1 (§7.2). The opening doctrine, aimed at your intel's top kind, applies from round 1 (§7.6, R2-Q18).
- **R2a's playtest gate** (2026-11-03): the user's "only wish is for more variety with the opening moves from the opponent, but I understand why we might want to start off with the same one each run while we build things out."
- **Recommendation:** several openers per general, one drawn per battle, as the cheap next step. R2b's opening doctrine (R2-Q18) and its several generals bring some variety first. **Why:** openers are data, so more of them cost little beyond one draw per battle.
- **Alternatives:** one opener per general until R3's kit.
- **Blocks:** R2b's general content.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. Several openers per general, one drawn per battle (R2b S7). R2b's opening doctrine (R2-Q18) and its several generals add to it. In SPEC §7.7, §11.11 and §18.2 #69.

### #70 · The commander power against some units

- **Question:** Is a commander power that can cancel a unit too strong?
- **SPEC's first guess:** once per clash, ready from the clash's first tick (§6.6).
- **R2a's playtest gate** (2026-11-03): the user: "we might need to adjust the timing of the commander power or something at some point though, since it can be used quite effectively to invalidate some units (bursters), but maybe that's an okay counterplay". Spore Burst dealt 10–21% of the user's damage in the two saved reports.
- **Recommendation:** no change now. Watch it in R2b's commander work and its playtest, and if it needs a change, try its timing first, as the user suggests.
- **Alternatives:** a later first-ready tick within the clash now; a weaker Spore Burst against Bursters.
- **Blocks:** nothing yet. R2b's commander work reads it.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. No change now. R2b's commander work and its playtest watch it, and if it needs a change, its timing is tried first. In SPEC §6.6 and §18.2 #70.

### #71 · Twin Roots' economy lane

- **Question:** Is giving a lane up to economy a fair trade?
- **SPEC's first guess:** a lane you leave empty goes to whatever the general fields there, on the first tick (E1), and a lane won by emplacements alone deals no damage (E6) (§6.7).
- **R2a's playtest gate** (2026-11-03): on Twin Roots the Lichen Baron "just build mortars in the bottom lane while focussing on building in the top, which was okay for me, since I would then just concentrate my econ building in that lane instead of the top, allowing me to focus on building units up there." In the user's round-5 screenshot their Heartcap was at 1850/3000 and the Baron's at 1000/2000, with lane 2 lost to its Mortars.
- **Recommendation:** keep E1 and E6. **Why:** the user treated it as a fair trade. By E6, if the Baron fielded only Mortars there, the empty lane cost the user only that lane's half of the tally.
- **Alternatives:** the general's lane rule (#30) also weighs a lane you leave empty, so giving one up costs damage.
- **Blocks:** nothing yet. R2b's general work and its playtest read it.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. E1 and E6 stay: a lane you leave empty goes to what the general fields there, and a lane won by emplacements alone deals no damage. In SPEC §6.7 and §18.2 #71.

The R2b plan settles these itself, with no call from you: A063, A073, A074, A079, A088, A089, A093, A117.

## R3: the kit

`docs/r3-plan.md` settles these before building, except R3-Q4 and R3-Q9 (S10) and #51 (S14), which may wait for the session that needs them. If X4 brings copies into R2a, #51 is settled with X4 at R1's gate (R1/T049), or at R2a S0 if the gate left it open, and #43 at R2a S0 (R2a/T004).

### R3-Q1 · Start R3's data work during R2's tuning

- **Question:** May R3's data-model sessions start once R2b is merged, while R2's playtest tuning goes on?
- **SPEC's first guess:** "Tune the data before starting R3" (§16 R2 step 10).
- **Recommendation:** Yes. Start R3's schemas, copies, packs and drafts once R2b is merged. Keep R2's tuning to squad sizes and the economy, and leave the general's kit growth to R3 (A136). This disagrees with §16. **Why:** those sessions need no tuned numbers, and R3's copies undo much of R2's tuning of the general anyway (A136).
- **Alternatives:** R3 waits for R2's tuning.
- **Blocks:** R3's schedule.
- **Decision:** _open_

### R3-Q2 · R3's augment scope

- **Question:** Does R3 author augments for the pack buildings, and do any of the 42 upgrade levels survive as augments?
- **SPEC's first guess:** two augments per core archetype, and pack buildings get theirs "in R3 and later" (§11.13); every level is "remade as an augment or retired" (§16 R3).
- **Recommendation:** Retire all 42 levels. Author one augment for each pack spawner (Rootbreaker, Mortar, Scythecap, Veilstalker, Tender, Morel, Rhizomorph): 7 more, and none for economy or utility buildings (A123). **Why:** 9 of the 14 tracks belong to pack buildings. Without augments, the augment card vanishes from pack-heavy kits and the general's i − 1 draws run short; no level passes the archived research's "below noise" bar for flat bonuses (DR-7, A123).
- **Alternatives:** core augments only in R3.
- **Blocks:** R3's content.
- **Decision:** _open_

### R3-Q3 · How the general draws augments

- **Question:** How does the general choose its augments, at what rarity, and what if too few exist?
- **SPEC's first guess:** one per battle index above 1, drawn for a spawner card from the `ai` stream; Veteran adds one per army card (§7.7, §7.8).
- **Recommendation:** Draw from the augments eligible for its spawner cards, at the draft's rarity weights for that battle index, +10 rare for an elite (A144). `GeneralDef.augments` is an optional whitelist, not an order. A draw with nothing eligible is skipped (A125). **Why:** drawn uniformly, half its augments on five core archetypes are rare matchup flippers, against 5% rare in your battle-1 drafts (A144).
- **Alternatives:** rare augments for elites and the boss only.
- **Blocks:** R3's general kit.
- **Decision:** _open_

### R3-Q4 · The always-in set's rarity

- **Question:** What rarity do the always-in set's cards get?
- **SPEC's first guess:** their building's rarity: today the Burster Pod and the Hammercap Forge are uncommon and the Amanita Lodge rare (§8.3).
- **Recommendation:** The area archetype and the Hammercap common, the Amanita uncommon. Report "swarm answer owned by battle 2" in `--checks runs` (A135). **Why:** §8.4 says the swarm's answer MUST be in every run, but an uncommon blueprint shows in about 7% of battle-1 drafts (A135).
- **Alternatives:** weight always-in blueprints ×2, like core blueprints.
- **Blocks:** R3's packs and drafts.
- **Decision:** _open_

### R3-Q5 · Combat and combo details

- **Question:** Do you accept these rules as a set?
- **SPEC's first guess:** none; §5.2, §11.13 and §11.14 are silent on each.
- **Recommendation:** Yes:
  - targeting order: your own combo's priority, then the enemy's taunt, then the preferred class, then the nearest; a taunt counts as a preferred candidate for stickiness (A126);
  - a splash hits the other units in its radius through the matrix; statuses of one kind refresh their timer and don't stack (A142);
  - with Mycorrhizal Link, a corner plot counts as "beside", and as "in front of" or "behind" by its rank (A138);
  - the general's placement adds +3 for each combo a plot would make (A143).

  **Why:** §5.2's order predates taunts and combo priorities, and four of §11.13–§11.14's examples depend on it (A126).
- **Alternatives:** settle each one apart.
- **Blocks:** R3's sim sessions.
- **Decision:** _open_

### R3-Q6 · A run saved in R2's format

- **Question:** What happens to a run saved in R2's format when R3 lands?
- **SPEC's first guess:** none; §8.9 covers only saves from before R2.
- **Recommendation:** Migrate: starters ×2, other cards ×1, upgrade levels dropped with a notice, packs dealt from the saved seed, and a pending upgrade prompt replaced by a 1-of-3 augment choice (A130). It's #32's answer, for the same reason.
- **Alternatives:** end it with a notice.
- **Blocks:** R3's copies and save migration.
- **Decision:** _open_

### R3-Q7 · R3's bars

- **Question:** How do R3's verification bars measure?
- **SPEC's first guess:** points of runs won; a rule-changing card owned at the end of 30% of runs; a committing drafter 10 points ahead (§16 R3 step 4).
- **Recommendation:** Measure cards per battle, the card given from battle 1, and keep runs won for the commit bar (A129). Tag the rule-changing cards in data: the five matchup-flipping rares, Spore Cloud, Martyr's Bloom, Mycorrhizal Link, Forward Spores and the Sigil (A128). Name `--auto-draft commit` in §15.2 (A134), and report unspent gold and rerolls per draft (A137). **Why:** if every augment counts as rule-changing, the 30% bar passes on its own (A128).
- **Alternatives:** the bars as written.
- **Blocks:** R3's tools and verification.
- **Decision:** _open_

### R3-Q8 · How a card shows its copies

- **Question:** Does a card show its copies as pips?
- **SPEC's first guess:** "one pip per copy, lit while the copy is free" (§10.2), and R3's checklist says the same.
- **Recommendation:** A count ("2/3") or small caps, not pips; pips mean merge tiers only (A163). This disagrees with §10.2. **Why:** pips would mean four things on one screen: copies, merge tiers, the round tally and the slayer's mark (A163).
- **Alternatives:** pips, as written.
- **Blocks:** R3's tray UI; R4b's card face.
- **Decision:** _open_

### R3-Q9 · Offer order: rarity first

- **Question:** When a draft builds a card, does it roll the rarity before the type?
- **SPEC's first guess:** none; §8.3 gives the type weights and the rarity weights but not their order. Today `generateOffer` rolls the type, then the rarity, and steps to another rarity inside that type (`src/sim/draft.ts:124-138`).
- **Recommendation:** Roll the rarity first. Then roll the type among the types that hold a candidate of that rarity, by the type weights. Step the rarity down, then up, only when no type holds one. Then draw the card. It's still three draws a card. **Why:** no augment is common, so under today's order a common roll on the augment type turns into an uncommon augment, and the rarity weights stop holding for augments (A128's evidence). It changes offer odds, so it's a rule change (`.claude/rules/balance.md`).
- **Alternatives:** keep the type first, and give augments a common tier.
- **Blocks:** R3's drafts (S10).
- **Decision:** _open_

### #36 · The sixth core archetype

- **Question:** Which is the sixth core archetype, and do the core six hold together?
- **SPEC's first guess:** the Burster Pod; the alternative is the Puffball Mortar as an emplacement (D44).
- **Recommendation:** Decide from R1's core-six check (R1-Q6), leaning toward the Burster Pod. **Why:** area damage that travels with the army is what a packed formation must fear (D44). An emplacement can't move, so it answers only a swarm that reaches it. The Mortar stays in the Bastion pack and in two commanders' kits.
- **Alternatives:** the Mortar; the Bastion pack then takes the Burster Pod (§11.15).
- **Blocks:** R1 gate (the reading); R3's always-in set and packs.
- **Decision (R1's reading):** 2026-11-02 (R1 S8, the review gate; the user: "Take every recommendation"): the Burster Pod, as leaned and as SPEC's first guess has it. Its core six failed G3 only on mono Capguard (85%) and mono Gill (57%) at 50 seeds, and only on the Capguard (74%, a 20-seed screen) with `kept` and the arrival shield. The Mortar's failed four monos and three G12 builds, and in the core six's graph it won none of its edges. The call itself stays R3 S0's. In SPEC §0.1, §11.2, D44 and §18.2 #36.

### #37 · Does an augment attach to a building type or one card?

- **Question:** Does an augment attach to a building type (all its copies) or to one card?
- **SPEC's first guess:** the type, for the run (D39).
- **Recommendation:** Agree. **Why:** it's the simplest to show and read: every copy plays the same, and the general reads one compiled matchup per type (#41).
- **Alternatives:** one copy, which needs a per-building icon and choice.
- **Blocks:** R3's augments.
- **Decision:** _open_

### #38 · Augments per type, and what merged units keep

- **Question:** How many augments may one building type hold, and do merged units keep their squad's augments and combos?
- **SPEC's first guess:** 2; yes (§11.13). Combos aren't mentioned.
- **Recommendation:** Cap 1 augment per type. A merged unit keeps its building's augments, and keeps a combo only if every parent had it (A133, A127). This disagrees on the cap. **Why:** with two augments authored per core archetype, a cap of 2 never binds; at 1, a Capguard Hall is a Spore Shield Hall or a Holdfast Hall (A133). Combos are per squad, and the muster knits across squads (A127).
- **Alternatives:** author 3 per archetype and keep the cap at 2 (A133).
- **Blocks:** R3's augments and combos.
- **Decision:** _open_

### #39 · Does `takenMult` count toward a hit's class?

- **Question:** Do damage-taken changes from augments and combos count toward a hit's effectiveness class, its sparks and matchup marks?
- **SPEC's first guess:** yes, "as merge perks' resistances do" (§14.2).
- **Recommendation:** Yes, and fix the row's wording: §5.3 says merge-perk resistances don't count, and already counts augment and combo matchup changes (A153). **Why:** a flipped matchup must show as one on the field (§5.8).
- **Alternatives:** no, so marks always show the base matchup.
- **Blocks:** R3's combat; R4b's marks.
- **Decision:** _open_

### #40 · Does a combo stack with two partners?

- **Question:** Does a combo stack when a building has two partners?
- **SPEC's first guess:** no; a squad gets each combo's effect once.
- **Recommendation:** Agree. **Why:** combos change what happens rather than adding a percentage per neighbour (§11.14), and stacking would turn them back into percentages.
- **Alternatives:** stacking.
- **Blocks:** R3's combos.
- **Decision:** _open_

### #41 · How the general reads an augment that flips a matchup

- **Question:** How does the analysis read an augment that flips a matchup?
- **SPEC's first guess:** it rates its counter set against your squads as augmented, skips a building that loses and reaches for the next answer (§7.4).
- **Recommendation:** Agree. **Why:** §1.3 #7 needs the general to answer a flipped build, and G12 tests it from R3.
- **Alternatives:** none worth pricing.
- **Blocks:** R3's general AI.
- **Decision:** _open_

### #42 · The general's copies

- **Question:** Does the general need more copies, since it takes no drafts?
- **SPEC's first guess:** no: the player's rule, 2 per opener card and 1 per card added (§7.8).
- **Recommendation:** Size its copies to its colony: each army card gets ceil(open army plots / army cards) + 1, recomputed per battle and shown on its route node; a counter card arrives with 2; copies count distinct opener cards (A194, A141). A test checks that they cover its open plots on both Twin Roots lanes (A146). This disagrees with the first guess. **Why:** under the player's rule Mold's battle-1 kit is 2 Burrows, 220 gold of army against about 1,300 of income, so it banks and G8 and G14 are at risk (A122).
- **Alternatives:** keep v1's `maxOwned` for the general until R3's numbers say otherwise.
- **Blocks:** R3's general kit; G8, G14.
- **Decision:** _open_

### #43 · A cap on copies of one card

- **Question:** Is there a cap on copies of one card?
- **SPEC's first guess:** at most 4 (§8.3).
- **Recommendation:** Agree. **Why:** without one, a drafted card's only limit is plots, the "mass the cheapest" case copies exist to stop (§1.3 #5); 4 still allows a committed build.
- **Alternatives:** no cap.
- **Blocks:** R3's copies (S2a) and drafts; R2a's kit (R2a/T032, T033) if X4 is yes.
- **Decision:** _open_

### #44 · Relics in the always-in set

- **Question:** Does the always-in set hold any relics?
- **SPEC's first guess:** no; the six core archetypes and the Truffle Cellar only (§8.4).
- **Recommendation:** Agree. **Why:** relics belong to packs or the open pool, and the set's job is the swarm's answer.
- **Alternatives:** one always-in relic.
- **Blocks:** R3's packs.
- **Decision:** _open_

### #45 · Can the always-in set be banned?

- **Question:** Can a ban remove an always-in building?
- **SPEC's first guess:** no (D38).
- **Recommendation:** Agree. **Why:** the swarm has been the hardest army to answer in every measurement, so its answer must reach every run (§8.4).
- **Alternatives:** bannable, with the area archetype exempt.
- **Blocks:** R3's bans.
- **Decision:** _open_

### #46 · What a ban, or a missing building, does to a pack

- **Question:** What does a ban do to a run pack?
- **SPEC's first guess:** a pack whose building is banned isn't dealt, and the next pack is dealt in its place (§8.4).
- **Recommendation:** Agree, and extend it: a pack whose building isn't in the roster (the Air pack until flyers; Deep Roots if R1 drops the Rhizomorph) is never dealt, and its relics join the open relic pool (A147). **Why:** two packs depend on R1's result, and only one fallback is written (A147).
- **Alternatives:** a banned pack still deals its relics.
- **Blocks:** R3's packs.
- **Decision:** _open_

### #47 · A pack swap at run setup

- **Question:** May you trade one dealt pack for another at setup?
- **SPEC's first guess:** no swap (§8.4).
- **Recommendation:** Agree for now, and revisit with M6's unlock ladder. **Why:** bans already remove a pack's building, and a swap adds a setup step before players know the packs.
- **Alternatives:** one swap per run.
- **Blocks:** R3's run setup.
- **Decision:** _open_

### #48 · The general's extra cards from the run's packs

- **Question:** Do the general's extra blueprints come only from the run's packs and the always-in set?
- **SPEC's first guess:** yes, so a run without the Air pack meets no enemy Driftlings (§11.15).
- **Recommendation:** Agree, and widen it: preferred extras, the boss's counter cards and in-battle missing answers all come from the always-in set, the dealt packs and your commander's core; openers are exempt (A132). **Why:** §7.4 adds counters "from its faction roster", so an Anti-Line counter can plant a Morel Warren in a run without the Brood pack (A132).
- **Alternatives:** extras only, as written.
- **Blocks:** R3's general kit.
- **Decision:** _open_

### #49 · General weights for the v2 cards

- **Question:** Does each general get its own weights for the Burster Pod and the other v2 cards?
- **SPEC's first guess:** no; weight 1 for any card its weights don't list (§11.11).
- **Recommendation:** Agree, within R2-Q4's scope: weight 1 only for run-kit additions and counters. **Why:** tuning will show where a general wants them, and one rule reads more simply until then.
- **Alternatives:** per-general weights now.
- **Blocks:** R3's general data.
- **Decision:** _open_

### #50 · Do relic, trait and commander plots count toward the maximum?

- **Question:** Do plots from Mycelial Web, Root Pressure and Armilla count toward the most plots a colony can hold?
- **SPEC's first guess:** yes (§11.7).
- **Recommendation:** Agree. **Why:** the budget is a MUST (R1-Q5), and only a hard maximum keeps every source inside it.
- **Alternatives:** no maximum for bonus plots.
- **Blocks:** R3's plots; M6's traits.
- **Decision:** _open_

### #51 · What "mono" means under copies

- **Question:** How many copies of their card do G3's and G12's mono bots hold once copies apply?
- **SPEC's first guess:** none yet (§12.3).
- **Recommendation:** A mono bot holds its card at the copy cap (#43) and fills its other plots by `bot:balanced`'s weights, as R1's copy-limited variants do (X4). In single battles every side holds what a run would at that battle index (A145). **Why:** copies make massing one card impossible (§1.3 #5), so "mono" has to mean "committed", and the strict bar should test the committed build a player can make.
- **Alternatives:** reference bots get unlimited copies, with plots binding (A145).
- **Blocks:** G3 and G12 from R3 (R3 S14: R3/T124, T125, T130); from R2a if X4 (R2a/T032, T033).
- **Decision:** _open_

The R3 plan settles these itself, with no call from you: A131, A140.

## R4: readable armies

`docs/r4a-plan.md` and `docs/r4b-plan.md` settle these. R4a needs R4-Q1 to R4-Q5, #52, #53 and #55 (R4-Q2 and #55 were superseded on 2026-11-01: units carry no weapon marks). R4b needs R4-Q5's glyph, R4-Q6 and #54. #56 is best settled at R2b S0.

### R4-Q1 · Body-size bands

- **Question:** What pixel bands do small, medium and big bodies use, and how is size measured?
- **SPEC's first guess:** units are about 10–14 px, one band per armor class (§14.3); no numbers.
- **Recommendation:** Measure the body's opaque bounding-box height, leaving out the weapon mark. Bands at least 3 px apart: small 8–9, medium 11–12 and big 15–16 px, with §14.3's range widened to about 8–16 px (A148). Keep widths within the squad grid's spacing (8 native px at k = 4), let height carry the difference, and put the mark on the front edge (A165). **Why:** three bands in 10–14 px sit 2 px apart, no sprite meets one today (A148), and wider bodies overlap in the formation preview (A165).
- **Alternatives:** bands by area.
- **Blocks:** R4a's shape schema and redraw.
- **Decision:** 2026-11-01 (R4a-S0): the recommendation.
  - Heights: small 8–9, medium 11–12 and big 15–16 native px, measured on the frame's own opaque pixels with the mark and the Elder rim left out. §14.3's "about 10–14 px" becomes 8–16.
  - Widths, mark included: at most floor(32/k), with n the building's base squad + 1 for the Rhizome Vault. Today that's 10 px for the 4- to 9-unit squads and 16 px for the 2- and 3-unit ones. The Shrine's +2 overflows, and the sheet tool lists it.
  - The plan adds one check: a mark stays within the body's rows, so it never makes a unit look taller than its band (`docs/r4a-plan.md`, call 10).

  In SPEC §5.8, §10.4, §14.2 and §14.3.
- **Changed:** 2026-11-01 (R4a-S2b, at T026's review): with weapon marks dropped (R4-Q2), a body's width is its own, and call 10's check is retired. The bands stand as agreed (R4/T077).

### R4-Q2 · Weapon marks

- **Question:** How is a weapon mark drawn and checked, and which units carry which mark?
- **SPEC's first guess:** a blade, an arrow or spike, a hammer, and an area mark for `burst` units "and emplacements whose shells splash" (§5.8); the Scythecap gets "blade with the area mark" (§11.3).
- **Recommendation:**
  - the mark is a shared glyph (`m-blade`, `m-arrow`, `m-spike`, `m-hammer`, `m-area`, `m-heal`, and the accent `m-splash`) in `data/sprites/marks.json`, composited onto each unit frame at the sprite's `shape.markAt[frame]` when the atlas bakes, so the baked frame holds it (§14.3) and the check compares the declared mark with `markOf(unit)` (A148);
  - the rule: area for `burst`; heal for a healer with 0 damage; else the damage type's mark, an arrow if it shoots and a spike if not (A149);
  - the Scythecap gets the blade only (A150);
  - a splashing emplacement keeps the hammer, with a splash accent (A151).

  This disagrees with §5.8 and §11.3. **Why:** Mortar shells hit as crush, so an area mark there breaks "the shape always tells the base matchup" (A151). One glyph per mark means every blade looks the same on both sides, and the check compares names instead of hunting pixels.
- **Alternatives:** the mark drawn into each sprite with reserved palette keys listed in `shape.markKeys`, so a check finds it. If you pick it, R4/T019 and R4/T022 check `shape.markKeys`, and R4/T021 makes no weapon glyphs.
- **Blocks:** R4a's schema, data checks and redraw.
- **Decision:** 2026-11-01 (R4a-S0): the recommendation.
  - Shared glyphs in `data/sprites/marks.json`, baked onto each frame at `shape.markAt`.
  - The rule: area for `burst`; heal for a healer with 0 damage; otherwise blade (slash), hammer (crush), and for pierce an arrow on a unit that shoots or a spike on one that doesn't.
  - The Scythecap carries the blade only. A splashing emplacement keeps its type's mark with a splash accent, so the Mortar carries a hammer.

  In SPEC §5.8, §10.4, §11.3, §13.6, §14.2, §14.3 and §16 R4 step 1.
- **Superseded:** 2026-11-01 (R4a-S2b, at T026's review of the silhouette sheet): the user dropped weapon marks from units. "If we don't have too many units and they're visually distinct enough we don't need that visual clutter on the units."
  - No unit or emplacement carries a mark glyph on the field, now or later. Don't add marks back.
  - A unit's damage type reads from its own silhouette (a weapon it draws, such as the Gill Archer's bow or the Hammercap's maul, is body), the hit sparks, the matchup marks on cards and the planning screen, and the inspect panel.
  - `data/sprites/marks.json`, the shape block's `mark`, `accent`, `markAt` and `accentAt`, and their checks are retired (R4/T077). SPEC §5.8 records the decision, and the sections that cited the marks follow it.

### R4-Q3 · A louder tier cue

- **Question:** Should merged units get a louder cue than pips, with body size still meaning armor only?
- **SPEC's first guess:** pips (one for Bloomed, two for Elder) on a sprite of the unit's own size (§5.8).
- **Recommendation:** Yes: a 1-px rim baked per tier, team-neutral: spore-white `#fbf6ff` (`--spore-white`) for Bloomed and gold `#f0c85a` for Elder. Pips with a 3×3 gold core in a 1-px dark outline, so no smaller than today's 3×2 core. The Elder aura kept, and "could you spot the Elders?" added to R2a's playtest and R4b's gate (A162). **Why:** an Elder has ×7.84 HP and damage but would show two 3×2 px pips (A162). Lilac is the Velvet Bloom's own tone (§2), so a lilac rim would read as the wrong team on a Gray Rot unit.
- **Alternatives:** a lilac rim for Bloomed; pips only.
- **Blocks:** R4a's pips work.
- **Decision:** 2026-11-01 (R4a-S0): changed from the recommendation, at the session's suggestion.
  - Bigger pips for both tiers (a 3×3 gold core in a 1-px dark outline), and the Elder aura kept.
  - A 1-px gold `#f0c85a` rim on Elders only, and no rim on Bloomed.

  **Why:**
  - A rim outside the outline makes a unit look 2 px bigger, and the bands are only 2–3 px apart. A rimmed small Bloomed would look 10–11 px tall, against medium's 11–12.
  - Bloomed units are about half of a merging army (8 Sporelings field 2 Bloomed + 2), so a rim on every one would outline half the field.

  If R2a's playtest finds Bloomed units hard to tell from base ones, a spore-white tier-2 rim is one more bake. "Could you spot the Elders, and tell a Bloomed unit from a base one?" joins R2a's playtest (R2a/T137) and R4b's gate (R4/T075). In SPEC §5.6, §5.8, §10.4, §13.6 and §14.3.

### R4-Q4 · Team contrast in R4

- **Question:** Should the colour-vision contrast check move from M7 into R4a, with a lightness offset for the Gray Rot?
- **SPEC's first guess:** a colorblind palette check in M7 (§16 M7); R4's checklist runs the filtered screenshots.
- **Recommendation:** Yes: a unit test that the factions' body tones differ by at least 1.5:1 in lightness under both filters and stand off the soil and the dark outline, and a lighter ("bone") ash body for the Gray Rot's swap tones (A159). **Why:** under both filters the tones keep a hue difference but almost no lightness difference (ratio 1.00–1.17), marginal on small sprites (A159). A darker body can't pass both checks: under deuteranopia, a `v` tone 1.5:1 darker than the Velvet Bloom's `#8a4fd8` falls below the Velvet Bloom's own 1.77:1 against the soil tone `#5e4532`, so enemy units would sink into the clash ground. A lighter body passes both. R4/T033 and R4/T034 have the numbers.
- **Alternatives:** a darker body, with a lower soil floor; wait for M7.
- **Blocks:** R4a's palette and checks.
- **Decision:** 2026-11-01 (R4a-S0): the recommendation.
  - The check moves into R4a. Under both filters the sides' body tones differ by at least 1.5:1 in luminance, each side's body tones stand at least 1.75:1 off every soil tone, and its dark tone 1.5:1 off the outline.
  - The Gray Rot gets a lighter, bone body, first guess `v #b0bcab`, `l #eaf0e2`, `d #808b7c`. S0 re-ran the numbers: 1.51–2.13:1 under the filters, 3.57:1 or more against the soil, 4.73:1 or more against the outline. Today's tones differ by only 1.00–1.10:1 under the filters.

  In SPEC §2 and §16 M7.

### R4-Q5 · Emplacements on the field, and a Structure mark

- **Question:** How is an emplacement drawn in its slot, and what shape marks a Structure target?
- **SPEC's first guess:** none. An emplacement stands at its slot's centre (§4.4); §5.8's marks name body sizes and pips only.
- **Recommendation:** A slot-sized emplacement sprite carrying its weapon mark (the Rootgate has none), in R4a. A "structure" glyph, a stump or a block, in the mark set, in R4b. Structure has no body band (A154). **Why:** crush and siege units are strong against emplacements, and nothing could show it (A154).
- **Alternatives:** the 32×32 building art as the emplacement.
- **Blocks:** R4a's redraw; R4b's marks.
- **Decision:** 2026-11-01 (R4a-S0): the recommendation.
  - In R4a, an emplacement has a slot-sized sprite of its own, `e-<buildingId>`, at most 32×32. It's found by that name, with the building's sprite as the fallback, and carries its weapon's mark: the Mortar's hammer with a splash accent, and none on the Rootgate. Structure has no body band.
  - In R4b, a structure glyph joins the mark set. R4b-S1 draws its form, a stump or a block (R4/T049).

  In SPEC §5.8 and §14.3.
- **Changed:** 2026-11-01 (R4a-S2b, at T026's review): the emplacement sprite stays, but it carries no weapon mark, as units carry none (R4-Q2, superseded; R4/T077). The structure glyph stays R4b's, among the matchup glyphs, in a sheet of their own now that `data/sprites/marks.json` is gone.

### R4-Q6 · Card and mark details

- **Question:** Do you accept these rules for cards and marks as a set?
- **SPEC's first guess:** §10.2's card face and §10.4's marks.
- **Recommendation:** Yes:
  - "no sentences" covers the tray and run-bar cards; draft and spoils cards keep one effect line of about 12 words, numbers as chips (A157);
  - on a card, strong and weak marks both light while the general fields that shape: strong as the answer, weak as a warning;
  - card marks use the planning marks' combined class, and a pips mark overrides the body mark for its tier (A167);
  - weak marks get a dark outline and a shape of their own, since the weak spark's gray is the Gray Rot's body colour (A166);
  - overlay icons are 8×8 (A160), and the compact tray groups marks by class and drops the role word first (A164).

  **Why:** relics and augments have no shape to replace their text (A157).
- **Alternatives:** settle each one apart.
- **Blocks:** R4b's card-text and marks sessions.
- **Decision:** _open_

### #52 · Does the shape language read at 2×?

- **Question:** Does the shape language read at the field's 2× scale in a 1280×720 window, or does a clash need a closer view?
- **SPEC's first guess:** it reads at 2×, with no closer view (§10.4).
- **Recommendation:** Agree for one-lane maps, but test the worst case. Twin Roots draws at about 1.78× (units about 21–25 px), so R4a adds a Twin Roots lineup screenshot and draws marks and pips at least 2 native px wide (A077, A158). **Why:** §10.4's MUST assumes 2×, which at 720 px high needs the bands to total 272 px or less, against today's 334 (A077).
- **Alternatives:** a closer clash view; slimmer bands on two-lane maps.
- **Blocks:** R4a-S0; read at R2a's playtest and R4b's fresh-tester gate.
- **Decision:** _open_ (R4b's fresh-tester gate decides, R4/T076)
- **R4a part agreed:** 2026-11-01 (R4a-S0): the recommendation. Twin Roots, at about 1.78×, is the worst case: R4a adds the `r4-lineup-twin` capture, draws marks and pips at least 2 native px wide, and states each map's scale in §10.1. R2a's playtest takes a first reading (R2a/T137). In SPEC §10.1, §10.4, §16 R4 and §18.2 #52. Since 2026-11-01 units carry no weapon marks (R4-Q2, superseded), so the 2-px rule covers pips only.

### #53 · Merged units' body radius

- **Question:** Should a merged unit's body radius still grow ×1.25 per tier, now that its sprite doesn't?
- **SPEC's first guess:** yes, as today's data (`tierRadiusMult` 1.25).
- **Recommendation:** Agree. **Why:** the radius is collision and range math, not drawing (§5.6). A change moves the goldens, so if you want one, make it in R2a, where goldens move anyway, not in R4a, which moves none.
- **Alternatives:** ×1.0, changed in R2a.
- **Blocks:** R4a-S0 (R2a S0 to change it).
- **Decision:** 2026-11-01 (R4a-S0): the alternative. `tierRadiusMult` becomes 1.0, so a merged unit's radius stops growing, as its sprite does. R2a makes the change inside S1's golden refresh (R2a/T011). R4a moves no golden, so it leaves the data at 1.25. In SPEC §5.6, §11.1 and §18.2 #53.

### #54 · An area mark against crowds

- **Question:** Does area damage get a matchup mark against crowds?
- **SPEC's first guess:** no; the area mark itself is the cue (§5.8).
- **Recommendation:** Agree. **Why:** area damage ignores armor, and a crowd isn't a body size, so a mark per crowd would be a rule no shape shows.
- **Changed reason (2026-11-01):** units no longer carry weapon marks (R4-Q2, superseded), so there's no area mark to be the cue. The first guess stays no: the Burster's own silhouette and its burst are the cue.
- **Alternatives:** a "packed" mark.
- **Blocks:** R4b's marks.
- **Decision:** _open_

### #55 · The Tender's mark

- **Question:** What mark does the Tender get, since it has no weapon?
- **SPEC's first guess:** the heal mark (§11.3).
- **Recommendation:** Agree; R4-Q2's check names it.
- **Alternatives:** no mark.
- **Blocks:** R4a's redraw.
- **Decision:** 2026-11-01 (R4a-S0): the recommendation. The heal mark, which R4-Q2's rule gives any healer that deals no damage. In SPEC §5.8, §11.3 and §18.2 #55.
- **Superseded:** 2026-11-01 (R4a-S2b, at T026's review): units carry no weapon marks (R4-Q2), so the Tender carries no mark. Its silhouette, a ring-shaped cap with a lantern glow, says it heals.

### #56 · An in-world name for lives

- **Question:** What do the game's screens call lives?
- **SPEC's first guess:** the working name *Regrowths* (§2, §8.5).
- **Recommendation:** Regrowths, with "lives" in its tooltip. Settle it at R2b S0, so the run bar, the report and the Grove use one word from the start. **Why:** renaming in R4b touches those screens twice, and the plain word in the tooltip follows §10.4's plain-words rule.
- **Alternatives:** "lives" everywhere.
- **Blocks:** R2b's run screens; R4b's text pass at the latest.
- **Decision:** 2026-11-03 (R2b S0; the user: "Take them all"): the recommendation. Lives are called Regrowths on the game's screens, with "lives" in the tooltip, from R2b's first run screens (S1, S9). In SPEC §2, §8.5 and §18.2 #56.

The R4 plans settle these themselves, with no call from you: A155, A161.

## M6: meta-progression

`docs/m6-plan.md` settles these, except M6-Q1, which R2a needs.

### M6-Q1 · Record the feat stats in R2

- **Question:** Should SPEC list now the stats that feats read, so R2a records them when it rewrites stats per round?
- **SPEC's first guess:** "Stat paths are whitelisted" (§9.2), with no list; §5.7's stats.
- **Recommendation:** Yes: list the feat stats in §5.7 and the stat-path whitelist in §14.2 before R2a's stats session (A175). **Why:** adding stats in M6 moves every golden a second time after R2 (A175).
- **Alternatives:** add them in M6.
- **Blocks:** R2a's stats session.
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation. SPEC lists the feat stats now, in §5.7 and in §14.2's stat-path whitelist, and R2a records them per round (S8): economy buildings planted, the most economy buildings on loam at once, buildings sold after fielding, each Heartcap's lowest HP fraction, and damage by unit tag in the round a Heartcap fell. In SPEC §5.7, §9.2 and §14.2.

### M6-Q2 · Unlocks earned mid-run

- **Question:** Does an unlock earned during a run affect that run?
- **SPEC's first guess:** none; feats are checked after every battle (§8.6).
- **Recommendation:** No: unlocks apply from the next run, and a run snapshots its unlocks, traits, strains, blights and Decay at creation (A176). **Why:** packs are dealt at run start, and a pool that changes mid-run breaks resume and golden determinism.
- **Alternatives:** unlocks reach the next battle.
- **Blocks:** M6's ladder and run state.
- **Decision:** _open_

### M6-Q3 · The feat list

- **Question:** Do you accept these changes to §9.2's feats?
- **SPEC's first guess:** §9.2's table.
- **Recommendation:** Yes:
  - every pack building gets its own feat, ordered by what each teaches, about 20 feats in all, since §9.2 names one for only 3 of the 9 shippable pack buildings (A168);
  - Rich Soil (4 economy buildings on loam) is impossible on every map, so Deep Truffle unlocks from "win a battle with a Truffle Cellar on a third-rank plot", and a loam goal moves to Wild Truffle (A180);
  - Hoarder reads gold at Begin from round 2, since battle 1's starting gold meets it before you act (A181).
- **Alternatives:** settle each one apart.
- **Blocks:** M6's feats.
- **Decision:** _open_

### M6-Q4 · Mastery rewards

- **Question:** Who authors the mastery rewards, and what does level 10 give in M6?
- **SPEC's first guess:** §9.5 names the slots, not the content; level 10 is a commander blight worth +2 Decay.
- **Recommendation:** Claude drafts a first-guess table in §9.5 for your approval before M6 starts: 3 alternate powers, 6 passive upgrades, 3 exclusive relics, 3 starter options and 6 mastery strains (A169). Ship levels 2–9 in M6 and level 10 with M7's blights (A171). **Why:** these are new rules, and level 10 depends on M7 (A171).
- **Alternatives:** you author the table; level 10 gets another reward.
- **Blocks:** M6's mastery.
- **Decision:** _open_

### M6-Q5 · Which buildings the strains cover

- **Question:** Which buildings get the first release's strains?
- **SPEC's first guess:** §11.5's 12 strains on v1's six basics; the new core archetypes "get their strains in M6"; §16 M6 says 12 strains.
- **Recommendation:** The always-in set: the core six and the Truffle Cellar, 14 strains. Keep the Rootbreaker and Mortar strains as extras or defer them, state the count once, and give every strain one source, a feat or a mastery level (A190). **Why:** the core six are what every run holds, and SPEC states two different counts (A190).
- **Alternatives:** §11.5's twelve as they stand.
- **Blocks:** M6's strains.
- **Decision:** _open_

### M6-Q6 · Credit for runs before M6

- **Question:** Do runs played before M6 credit the new profile with Spores, XP and feats?
- **SPEC's first guess:** none.
- **Recommendation:** No: M6 starts a fresh meta, and earlier runs stay as history in the records (RB-Q1). **Why:** retroactive credit would skip the early unlocks the ladder exists to teach (§9.2).
- **Alternatives:** credit Spores only.
- **Blocks:** M6's profile.
- **Decision:** _open_

### M6-Q7 · Run it back after M6

- **Question:** After M6, does Run it back reuse the whole loadout, as well as the commander and bans?
- **SPEC's first guess:** "remember the last commander and bans" (§16 M6).
- **Recommendation:** Yes: traits, strains and blights too, re-checked against the profile. If any part no longer fits, the Underroot opens with the loadout preselected. **Why:** Run it back skips the Underroot, where M6's loadout is chosen.
- **Alternatives:** commander and bans only.
- **Blocks:** M6's Underroot; records-1's setup record.
- **Decision:** _open_

### M6-Q8 · The meta checks' terms

- **Question:** How do M6's pacing check and G9, and M7's G10, measure?
- **SPEC's first guess:** §9.8's targets; G9 and G10 as §12.3 states them.
- **Recommendation:** Content counts unlock ids (feat unlocks, traits, capacity steps, mastery levels), not ranks. The sim buys the cheapest capacity step, then the cheapest trait, and plays the least-mastered commander, over at least 50 runs (A177). G9 is the best 12-capacity loadout a greedy search finds; G10 is a named Decay-6 set (A188). Report battle-1 and boss rates for a fresh profile's first 5 runs (A192). **Why:** a 40-run sim can't show run 45, and "content" is undefined (A177).
- **Alternatives:** settle each one apart.
- **Blocks:** M6's meta sim and G9; M7's G10.
- **Decision:** _open_

### #57 · May a strain change a body or a weapon?

- **Question:** May a strain, chosen before the run, change a unit's body or weapon?
- **SPEC's first guess:** no, as for augments, so *Ironcap*, *Gillguard* and *Thornpuff* need new patches (§9.3).
- **Recommendation:** Agree. **Why:** the shape never lies (§5.8): one drawing per unit, and the matchup marks and the general's counter sets read a fixed armor and damage type.
- **Alternatives:** yes, with the drawn body changing to match. Units carry no weapon mark since 2026-11-01 (R4-Q2), so there's no mark to change. A strain that changes only a damage type (*Gillguard*, *Thornpuff*) would need its body redrawn to show the new weapon, or the field couldn't show the change.
- **Blocks:** M6's strains.
- **Decision:** _open_

### #58 · How strains and augments divide the work

- **Question:** How do strains and augments divide the work?
- **SPEC's first guess:** strains are the loadout chosen before a run, augments the build found during it; R3 and M6 remove overlaps (§9.3).
- **Recommendation:** Agree, and name the overlaps in M6's plan (*Bursting* reads like Spore Pop). **Why:** two systems that do one thing at different times are more to learn (playtest F8).
- **Alternatives:** strains as draftable mutation cards.
- **Blocks:** M6's strains.
- **Decision:** _open_

### #59 · Are a commander's core buildings gated?

- **Question:** Are a commander's core buildings outside the six core archetypes gated by the unlock ladder?
- **SPEC's first guess:** no; the core is the commander's identity (§9.2).
- **Recommendation:** Agree, and settle its neighbours: core membership doesn't unlock a building's pack in other commanders' runs, and a dealt pack keeps its still-locked relics out of the pool (A168). **Why:** the Mortar and the Rootbreaker are in Vesper's core, and Deep Cellars, Rot-Eater and Second Flush are feat-locked relics inside packs.
- **Alternatives:** core membership unlocks the pack everywhere.
- **Blocks:** M6's ladder.
- **Decision:** _open_

### #60 · Fewer than 4 packs unlocked

- **Question:** What does a run deal when fewer than 4 packs are unlocked?
- **SPEC's first guess:** every unlocked pack (§9.2).
- **Recommendation:** Agree. **Why:** a first run dealing no packs teaches the core six first, as the ladder intends (A168).
- **Alternatives:** always 4, locked ones included.
- **Blocks:** M6's ladder.
- **Decision:** _open_

### #61 · The Velvet Shrine's and the Rootgate's new effects

- **Question:** What do the Velvet Shrine and the Rootgate do in v2?
- **SPEC's first guess:** Shrine: the squad in front of it fields 2 more units. Rootgate: a 1200 HP root-wall emplacement with no attack, restored each round (§11.2).
- **Recommendation:** Shrine: a combo-style link like the Vault (#26), with "+2 units" checked per building, as R2-Q15 does Home Brood (A085). Rootgate: agree, but measure it against E6. **Why:** a wall that outlasts the enemy to 45 s wins its lane with 0 supply (#10), so the round deals you nothing.
- **Alternatives:** a flat Shrine bonus; less HP for the Rootgate.
- **Blocks:** M6's mastery buildings.
- **Decision:** _open_

The M6 plan settles these itself, with no call from you: A174, A187.

## M7: Gray Rot, blights and content

`docs/m7-plan.md` settles these, except M7-Q1's trait, which R2a needs.

### M7-Q1 · Gray Rot records and its trait

- **Question:** Are Gray Rot buildings separate data records that mirror a Velvet Bloom building? And does the faction trait (+10% HP, −10% speed) stay?
- **SPEC's first guess:** the Gray Rot mirrors the roles under its own names, with the trait (§11.12).
- **Recommendation:** Separate records, each with a `mirrors` field and identical stats, which packs, augments, counter sets and weights resolve through (A170). Drop the trait; this disagrees with §11.12. **Why:** the trait is an unlisted edge for every general, and adding it at M7 would retune every band R2–R4 set (A182). The Gray Rot's identity is its names, art and doctrines.
- **Alternatives:** keep the trait as enemy-seat data from R2a, so the bands include it (A182).
- **Blocks:** R2a S0 (the trait, if it stays); M7's roster.
- **Decision:** _open_ for the records (M7 S0).
- **R2a part agreed:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the trait, departing from §11.12. The Gray Rot has no faction trait, so R2a's enemy seat plays its units' stats unchanged and the bands carry no hidden edge. The records part (separate records with a `mirrors` field) waits for M7 S0. In SPEC §11.12.

### M7-Q2 · Blight details

- **Question:** Do you accept these blight rules as a set?
- **SPEC's first guess:** §11.8's v2 effects.
- **Recommendation:** Yes:
  - Thin Soil's stump is the back rank's last non-loam file, in the lower lane on Twin Roots (A189);
  - Early Storm sets the storm's first round to 4, and Mold Bloom's −1 applies after it, floored at round 3 (A189);
  - Quick Learner moves a cycle one round earlier and reads one round less; a cycle stores its round and the first round it reads (A051).
- **Alternatives:** settle each one apart.
- **Blocks:** M7's blights.
- **Decision:** _open_

### #62 · Three Hollows under plots

- **Question:** What shape does Three Hollows take, since its 5-row lanes and 3 home columns don't divide into 2×2 plots in 2 ranks?
- **SPEC's first guess:** 3 lanes of 4 rows and 4 home columns, 12 plots in all (§11.9).
- **Recommendation:** 32 wide with homeCols 6, to match #19's closed columns, and a third-rank order (the outer lanes' file 1, then the middle lane's), capped at 4 (A183). Read it early through R1-Q9, and add "G12 on Three Hollows" to M7's checks (A184). **Why:** the first guess's 4 home columns conflict with #19's homeCols 6 (A183).
- **Alternatives:** the first guess, with no sprawl on Three Hollows.
- **Blocks:** M7's map.
- **Decision:** _open_

### #63 · The Gray Rot's area archetype

- **Question:** What is the Gray Rot's area archetype?
- **SPEC's first guess:** a Gray Rot Burster (working name Ashburst Sac, then Ashburster) (§11.12).
- **Recommendation:** Agree, following #36: if the Mortar becomes the sixth, the Ashpuff Kiln fills the slot instead.
- **Alternatives:** none worth pricing.
- **Blocks:** M7's roster.
- **Decision:** _open_

### #64 · Gray Rot counterparts for the other roles

- **Question:** What are the Gray Rot's healer, fast swarm, tunneler and flyer?
- **SPEC's first guess:** M7 names them, one per role, each with its role's body and damage type (§11.12). Units carry no weapon mark since 2026-11-01 (R4-Q2).
- **Recommendation:** Agree for the healer, the fast swarm and the tunneler; drop the flyer under X9 (A191).
- **Alternatives:** a Gray Rot flyer too, if flyers ship (X9).
- **Blocks:** M7's roster.
- **Decision:** _open_

### M7-Q3 · The first-run hint list

- **Question:** Which first-run hints does M7 add beyond the first-time tips?
- **SPEC's first guess:** none. §16 M7 asks only for "first-run tutorial hints beyond the first-time tips" (§10.2).
- **Recommendation:** Four, each shown once per profile on the tips queue: the first route choice, the first spoils, the first locked card, and the first unlock. **Why:** they cover the run and meta screens that the battle's first-time tips don't reach, and the last two teach M6's ladder where the player meets it (§9.2).
- **Alternatives:** a longer list, or none beyond the tips.
- **Blocks:** M7's hints.
- **Decision:** _open_

### M7-Q4 · G3's and G12's seats under the Gray Rot roster

- **Question:** Once the Gray Rot has its own roster, which faction does the mono bot play in G3 and G12?
- **SPEC's first guess:** "50 seeds per seat: 100 games per map (honest, symmetric)" (§12.3), written when both seats fielded one roster.
- **Recommendation:** The mono bot always sits in the Velvet Bloom seat against a balanced Gray Rot bot, and a seed's two games swap map sides, not factions. **Why:** that's the matchup the player meets, and a Gray Rot mono bot measures one nobody plays. Gray Rot stats are the mirror's (M7-Q1), so the seats differ in ids, and so in id-ordered tie-breaks, not in numbers (A170). It changes a guardrail's definition, so it needs your OK (`.claude/rules/balance.md`).
- **Alternatives:** keep §12.3's seats, with each faction taking each seat.
- **Blocks:** M7's §12.3 edit and its per-seat tools.
- **Decision:** _open_

## M8: release candidate

No §18.2 row waits on M8, and M8 raises no new question. X6 sets how its step 6 (a 25–35 minute run at 1×) is read.

## Later: flyers

Both rows wait for flyers. Under X9 that's after the first release.

### #65 · Surviving flyers and Heartcap damage

- **Question:** Do surviving flyers count toward Heartcap damage in the aftermath?
- **SPEC's first guess:** yes, like any living unit (§5.3).
- **Recommendation:** Agree; settle it when flyers are built.
- **Alternatives:** flyers count half.
- **Blocks:** the flyer milestone.
- **Decision:** _open_

### #66 · An Anti-Air kind

- **Question:** Does the counter cycle get an Anti-Air kind for flyers?
- **SPEC's first guess:** none until flyers arrive (§7.4).
- **Recommendation:** Agree.
- **Alternatives:** none worth pricing.
- **Blocks:** the flyer milestone.
- **Decision:** _open_

## Run it back, and records

X10 splits this into records-1 (now) and records-2 (after R2b).

### RB-Q1 · Where records live

- **Question:** Do Run it back's records live in the M6 profile key or in a key of their own?
- **SPEC's first guess:** none. §9.7's profile has no field for records, and it holds settings and the run in progress.
- **Recommendation:** The profile key, `spore-sprawl/profile/v1` through `storageKey()`, as profile version 1, holding meta only: the last setup, the records (each run tagged with its rules) and the codex. Settings, tips and the run keep their own keys, which never change (`.claude/rules/storage.md`) (A179, A172). M6 migrates it. **Why:** records-1 may ship before M6, which fixes the key once it ships, and §9.7's contents contradict the fixed keys (A172).
- **Alternatives:** a key of its own, merged into the profile in M6.
- **Blocks:** records-1; M6's profile.
- **Decision:** 2026-11-01 (records S0): the recommendation. The profile key `spore-sprawl/profile/v1`, through `storageKey()`, as profile version 1 and meta only: the last setup (records-1), then the run records and the codex (records-2, from R2b's run; no v1 run is recorded, X10). Settings, tips and the run keep their own keys, so the profile drops §9.7's `settings` and `runInProgress`, and §9.7's `bans` becomes `lastSetup`. A corrupt record is copied to `spore-sprawl/profile/v1.bak`. M6 migrates the record to a later version under the same key. In SPEC §9.7, §13.8 and §16 M6.

### RB-Q2 · Prototype runs and records

- **Question:** Do prototype runs (`?proto=`) write records?
- **SPEC's first guess:** none.
- **Recommendation:** No; only real runs record. **Why:** prototype runs save under storage of their own, so their records would split off, and R2 retires most presets anyway.
- **Alternatives:** record them, tagged by preset.
- **Blocks:** records-1.
- **Decision:** 2026-11-01 (records S0): the recommendation. A prototype run writes no records and no remembered setup. Run it back still works in one, from the run that ended. In SPEC §9.7, §13.8 and §16 M6.

### RB-Q3 · What "active play time" is

- **Question:** What counts as active play time?
- **SPEC's first guess:** none; §16 M6 asks for "active play time" in the summary lines.
- **Recommendation:** Wall time with the tab visible on any run or battle screen, paused while hidden and after 60 s without input. Help and settings count, and a paused clash counts until the idle cutoff. The app computes it, and it never enters the run state or the hash (A185). **Why:** ticks run only in clashes, so the sim clock undercounts, and the number feeds X6 and M8's step 6.
- **Alternatives:** wall time from run start to end.
- **Blocks:** R2a S19's play clock (R2a/T126, T128; X6); records-2's S3 (RB/T015–T017, T019).
- **Decision:** 2026-11-02 (R2a S0; the user: "Take every recommendation"): the recommendation. Active play time is wall time with the tab visible on a run or battle screen, paused while the tab is hidden and after 60 s without input. Help and settings count, and a paused clash counts until the idle cutoff. The app computes it, and it never enters the run state or the hash. R2a's play clock (S19) is the one module, and records-2 extends it. In SPEC §8.2 and §16 M6.

### RB-Q4 · What makes a card "seen", and where the codex shows

- **Question:** When does a card count as seen, and where does the codex live?
- **SPEC's first guess:** "a codex of cards seen" (§16 M6); the Underroot's tabs are Commanders, Traits, Strains, Feats, Blights and Settings (§10.5).
- **Recommendation:** Seen once it's offered, owned, or shown in a general's kit or army. The codex is the Underroot's Collection tab, which from M6 also shows locked cards with their feats; the tabs become Commanders, Traits, Strains, Bans, Blights (M7) and Collection (A186). **Why:** offered, owned and met give different numbers, and M6 needs a place for locked cards (A186).
- **Alternatives:** owned cards only.
- **Blocks:** records-2's codex (RB/T033, T034); M6's Underroot (M6/T024).
- **Decision:** _open_
