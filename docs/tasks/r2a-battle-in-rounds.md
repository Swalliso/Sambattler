# R2a — A battle in rounds: tasks

R2a builds the first half of SPEC §16 R2's Goal, split off by X1: a single battle as a series of rounds (planning, clash, aftermath) against one general that plans first, scored as a race between two Heartcaps, where placement is position because the colony is the formation. Under X2 it lands on `develop` beside v1, one green PR at a time, and ends with a temporary dev-only entry the user playtests. The run, lives, saves, drafts, the switch-over and v1's deletion are R2b's.

Drafted 2026-11-01 from SPEC v2 and `docs/tasks/spec-analysis.md`, and refreshed on 2026-11-02 at S0, after R1's results ([#65](https://github.com/Swalliso/Sambattler/pull/65)), R1's review gate ([#66](https://github.com/Swalliso/Sambattler/pull/66)) and R2a's decisions in `docs/tasks/clarify.md`.

**Status:** Agreed 2026-11-02 (S0) · **Spec:** SPEC §16 "Milestone R2 — Rounds" and the sections it cites · **Plan:** `docs/r2a-plan.md` (agreed 2026-11-02, for R2a only; R2b writes `docs/r2b-plan.md`) · **Gate in:** R1's review gate passed (§16 R1 step 4, R1/T049, R1/T050); X1 and X2 decided 2026-11-02 · **Gate out:** every task ticked; `npm run verify`, `npm run test:browser` and `npx vitest run tests/slow/rounds` green; the R2a playtest (§16 R2 gate questions 1, 2, 3, 6 and 7) answered in `docs/playtest-feedback.md` (S21); then R2b may start

## Read first

- **SPEC:** §0.1; §1.3 #1–#5, #9, #11, #13; §4.1–§4.7; §5.2; §5.3 (pinning, clouds, cleave, bursts); §5.4–§5.7; §6.1–§6.7; §7.1–§7.5, §7.8 (the kit and `maxOwned`), §7.9; §8.10 (copies, for X4); §10.2–§10.4; §11.1, §11.2, §11.9, §11.10, §11.11; §12.2–§12.4; §13.2–§13.7; §14.2, §14.4–§14.6; §15.1–§15.7; §16 R1 and R2; §18.1 (D45); §18.2 #7–#35; Appendix A.
- **Docs:** `CLAUDE.md` ("How we work", "Checks"); `.claude/rules/balance.md`, `storage.md`, `v1-code.md`; `docs/status.md`; `docs/r2a-plan.md` (from S0); `docs/tasks/clarify.md` (X1–X10, the R1 blocks, the R2a blocks); `docs/tasks/spec-analysis.md` (its "SPEC wording fixes · R2a" table and R2a's findings); `docs/balance-backlog.md` (R1's results); `docs/r1-plan.md` "As built".
- **Sibling task files:** `docs/tasks/r1-clash-check.md` (what R1 hands over), `docs/tasks/r4-readable-armies.md` (R4a's unit drawer and its playtest questions), `docs/tasks/run-it-back.md` (records-2 extends R2a's play-time store: its T015, T016) and `docs/tasks/r2b-run-in-rounds.md` (what R2b reads from this milestone's As built).
- **Code you build on:** `src/sim/formation.ts` and `tools/lib/clash.ts` (both R1's); `src/sim/state.ts`, `create.ts`, `compile.ts`, `effects.ts`, `commands.ts`, `step.ts`, `headless.ts`, `summary.ts`, `world.ts`, `targets.ts`, `spatial.ts`, `hits.ts`, `powers.ts`, `rng.ts`; `src/sim/systems/*.ts`; `src/sim/ai/*.ts`; `src/data/schema.ts`, `registry.ts`, `proto.ts`; `src/render/unitSprite.ts` (R4a's, once landed).
- **Code you copy patterns from:** `src/app/main.ts`, `loop.ts`, `session.ts`, `input.ts`, `battleView.ts`, `debugBridge.ts`, `channel.ts`; `src/render/renderer.ts`; `src/ui/hud/top.ts`, `tray.ts`, `explain.ts`; `src/ui/inspect.ts`, `report.ts`, `doctrine.ts`, `callouts.ts`; `tools/sim.ts`, `golden.ts`, `verify.ts`, `screenshot.ts`, `bench.ts`, `balance.ts`, `experiment.ts`; `tools/lib/run.ts`, `balance.ts`, `bench.ts`, `pool.ts`, `params.ts`, `asserts.ts`; `tests/helpers.ts`; `tests/slow/guardrails.test.ts`; `tests/browser/protoSaves.test.ts` (a Vite server in a chosen mode).

## Before you start

**Decisions** (refs in `docs/tasks/clarify.md`). Every call R2a's tasks need was settled by 2026-11-02, and the tasks follow them:

- **X1** (R2a and R2b) and **X2** (beside v1): decided 2026-11-02. `develop` may switch wholly to v2, as long as `npm run verify` stays green on every PR. X2's R2a part (S0): the preview entry loads on every build, with the title's button on the dev site only, and there's no `--dev` mode (Call 2).
- **X3** (R4a first): R4a merged, and its review gate (R4/T039) passed on 2026-11-02, so T137 runs on its sprites.
- **R2-Q25** (a rough playtest after S14), agreed 2026-11-01: S14b (T145, T146), before S15 and S16. T137 and S21 stay the gate.
- **R1's review gate** (2026-11-02):
  - #7 (squads per building, Capguard Hall at 3), #8 (the arrival shield, Call 30), #9 (the Elder keeps its splash), #10 (emplacements with A029's rules), #11 (D47), #12 (no pace rule), #13 (the muster counts), #14 (Anti-Ranged) and #15 (type and tag, with three fixes);
  - each knob's outcome (A109);
  - **X4**: no copies before R3. D45 stands, so `plant` has no copy refusal, and #43, #51 and R3-Q8 stay R3's;
  - **X5**: the cap is 25% of the loser's max HP, and a Decision goes by share.
- **R2a's S0** (2026-11-02, every recommendation): X6, X7, X8, RB-Q3, R2-Q1 to R2-Q12, #19, #22, #23, #25, #29, #30, #31, M6-Q1, M7-Q1's trait (dropped) and #35's approach. T124 measures #35's battle-level bands and T125 sets them. #53 (`tierRadiusMult` 1.0) was decided at R4a-S0.
- **X10** (records in two parts), 2026-11-01: R2a builds the one play-time module (T126, T128), and records-2 adds the run total (run-it-back.md T015, T016).
- **Still open for R2a:** #35's bands, with a pace retune beside them if G4 misses (T125), and the gate (T137, T139). The rough playtest (T145) was answered on 2026-11-02.

**Results it builds on** (R1's entry in `docs/balance-backlog.md`, agreed at R1's review gate on 2026-11-02):

- **Squads and the colony:**
  - squads per building: §11.2's Squad column, with Capguard Hall at 3;
  - the full colony is at most 150 live units a side at the arrival (§13.7, R1-Q5). With no upgrade's +1 per batch, Twin Roots fields 128.
- **The chosen set:** all of `kept` with the arrival shield, and the Elder's splash on. Also the verdicts on #10–#15, and each knob's outcome (A109).
- **Readings:**
  - eliteShare: counting Elder parts keeps `bot:balanced` under 10% Elite (R2-Q3);
  - Puppet Bloom's trios: a median of 0 at 300 and 600 gold (R2-Q7);
  - the race model (X5);
  - `--proto kept --checks duels,g8` (A116): v1's G2 newly fails on the Gill Archer.
- **For R2a to watch:**
  - Capguard Hall at 3 won 92% at 300 gold and 2% at 1,500;
  - `pinned` alone weakened the answers to the Sporeling and the Capguard;
  - the Rhizomorph Tunnel won 1% as a mono.
- **On `develop`:**
  - `src/sim/formation.ts`: the slot layout, and the muster's knitting to a fixed point;
  - `tools/lib/clash.ts`: the army builder, which R2a reuses, and the clash runner on v1's sim, which it doesn't;
  - `tools/lib/pool.ts`'s clash jobs, and the race model (`tools/lib/roundRace.ts`).

**Findings it must handle** (A-IDs; the Coverage table says where):

- **A024** (high): the arrival's unit-id order decides what the muster knits. T019, T020, T043.
- **A025** (high): in-place edits break the typecheck of every importer. X2; the staging below.
- **A041** (high): every squad knits at the muster, so mixed armies read as Elite. R2-Q3, T098, T099.
- **A056** (high): the Anti-Swarm set holds the swarm, and "cheapest" picks it. #14, #15, T098, T099.
- **A057** (high): Puppet Bloom finds little left to merge after the muster. R2-Q7, T107, T110.
- **A101** (high), **A066** (medium): both loops have to coexist while R2 is built. X2.
- **A193** (high), **A208** (medium), **A197** (medium), **A022** (medium), **A097** (medium): the flat 500 cap sends battles to round 9. X5, T050.
- **A195** (high): R2 is several milestones in one. X1.
- **A196** (high): R1 and R2 test the copy-free mass build. X4 (no: R1's set passes without copies, and R3 brings them); T033.
- **A021** (high), **A008** (medium): v1's idle march and siege preferences aren't v2's §5.2. T037, T038.
- **A026** (medium): no step resolves the muster, and nothing says what skips its 20 ticks. T043, T044.
- **A027**, **A103** (medium): §13.4 calls kept systems "unchanged". T005; the copies in T036–T040.
- **A028** (medium), **A131** (medium, R3): no path for per-squad unit stats, and R3 has to extend it rather than build a second one. R2-Q11, T046.
- **A029** (medium): an emplacement's unit rules are open. #10, T041.
- **A030** (medium): a lane's lock keeps nothing, and "holds still" is undefined. T044.
- **A039** (medium): `mergePreview`'s counts can't show cross-squad knits. T020.
- **A043** (medium): a back-line building ties between the front and third ranks. T067.
- **A044** (medium), **A038** (low): BotDef's `limits` and `placement`. R2-Q6, T010, T069.
- **A045** (medium): weight 1 for unlisted kit cards would buy the whole roster. R2-Q4, T068.
- **A046** (medium): a power queued on a clash's last tick is rejected. T105.
- **A059** (medium, downgraded on re-check): with a bot player, `phase=planning` can't be held. Call 14; T074, T076, T080.
- **A060** (medium): no hypothetical formation, matchup class or surviving-supply export. T034, T142, T084.
- **A061** (medium): `?test=1`'s instant aftermath is ambiguous. T085.
- **A064** (medium), **A070** (low): no per-round, per-building stats or plan record. T023, T051, T057, T068.
- **A065** (medium): one held Space can start a clash with no planning. R2-Q12, T078.
- **A076** (medium): step 9's captures can't show marks or the preview's match. T079, T141, T143, T135.
- **A077** (medium): Twin Roots never draws at 2×. #52 (R4a); T135's Twin Roots capture, T137's reading.
- **A102** (medium): the slow suite will pass vitest's per-test timeout. R2-Q9, T122.
- **A104** (medium): §15.7's rows miss files and cases. T005, T136.
- **A106** (medium): a scenario from round n can't give the last round or the record. T029.
- **A107**, **A111** (medium, low): G6's seats, HP and band. #35, T119, T123.
- **A108**, **A120** (medium, low): G16 over role-split pairs; the swap with a third rank. R2-Q10, T119, T123.
- **A109** (medium): one outcome per knob; the pace variant. R1's gate; T011 (adopted as data), T038 (the pace variant); R2b/T059 deletes the rest.
- **A119** (medium), **A112** (low): bench-300 can't hold 300 live units as a clash. T114.
- **A152** (medium): display text in the hashed state. R2-Q8, T025.
- **A175** (medium): feat stats missing from §5.7. M6-Q1, T057.
- **A198** (medium): the full reveal may make the general easy. R2-Q1, X7; T121, T127.
- **A096** (medium): Cordis's knit bonuses under the muster. R2-Q7 (R2a measures in T107; R2b's content).
- **A200** (medium): the full colony already exceeds about 100 supply. #7 and R1-Q5 (at most 150 live units a side); T114.
- **A145** (medium, R3): copies are defined only for run kits, not single battles. X4 (no), so R2a's single battles have no copies; T033.
- **A194** (high, R3): the general's copies (#42) can't follow the player's rule with §7.8's battle-1 kits. They're R3's. T033 keeps the general on `maxOwned`, so R2a doesn't meet it.
- **R2b's, not handled here:** A042 (R2-Q18), A058 (R2-Q17), A062 (R2-Q24), A063 (lives in captures), A080 and A105 (#27), A081 (R2-Q22), A082 (R2-Q21), A083 (R2-Q19, #26), A084 (#32), A085 (R2-Q15), A199 (#16, #35's G15), A207 (#17), A156 (Help and tips).
- **Lows, grouped:** the muster and formation (A031, A032, A040, A047); commands and checkpoints (A034, A036, A075, A115, A121); scoring (A035, A209); the economy (A205: interest is no choice, R2-Q2); the general (A049, A051, A052, A055, A206); powers (A053); the screen (A067, A068, A069, A071, A072, A078); tools (A110, A113, A116, A118); the playtest (A202: X3; A204: #35; A162: R4a's Elders question); and R2b's (A037, A050, A054, A073, A074, A079, A114, A117, A201). The Coverage table's second part lists them.

## Technical context

### Where code lands (X2: beside v1)

v1 stays wired to the game, unchanged, until R2b. Every v2 file lands under a `rounds/` folder at the path §13.4 gives it, so R2b's switch-over moves `…/rounds/X` to `…/X`, replacing v1's file of the same name. Names are proposals (§13.4); a session MAY rename one and updates this table in the same commit.

| Piece | R2a lands in (new) | R2b moves it to |
|---|---|---|
| The sim API for rounds (§14.6) | `src/sim/rounds/index.ts` | `src/sim/index.ts` |
| State, commands and events (§14.4, §14.5) | `src/sim/rounds/state.ts` | `src/sim/state.ts` |
| Library and compiled sides, with no display text | `src/sim/rounds/compile.ts` | `src/sim/compile.ts` |
| The modifier DSL in rounds | `src/sim/rounds/effects.ts` | `src/sim/effects.ts` |
| `createBattle`, `createFromScenario` | `src/sim/rounds/create.ts` | `src/sim/create.ts` |
| The queue and the step by phase | `src/sim/rounds/commands.ts`, `step.ts` | `src/sim/commands.ts`, `step.ts` |
| Planning commands, the kit | `src/sim/rounds/planning.ts`, `kit.ts` | `src/sim/planning.ts`, `kit.ts` |
| Plots from a map | `src/sim/rounds/colony.ts` | `src/sim/colony.ts`, or folded into `formation.ts` |
| `formationOf`, `mergePreview` | `src/sim/rounds/formation.ts`, on R1's `src/sim/formation.ts` | merged into `src/sim/formation.ts` |
| Opening a round, Begin, scoring, the aftermath | `src/sim/rounds/round.ts` | `src/sim/round.ts` |
| Hashing, headless, stats, summary | `src/sim/rounds/snapshot.ts`, `headless.ts`, `stats.ts`, `summary.ts` | the same names in `src/sim/` |
| Lookups, targets, the spatial hash, hits | `src/sim/rounds/world.ts`, `targets.ts`, `spatial.ts`, `hits.ts` | the same names in `src/sim/` |
| The power | `src/sim/rounds/powers.ts` | `src/sim/powers.ts` |
| The clash, economy, scoring and kept combat | `src/sim/rounds/systems/{clash,economy,victory,combat,targeting,movement,merging,healing,clouds}.ts` | `src/sim/systems/` |
| The general and the bots | `src/sim/rounds/ai/{view,formationScore,controller,profiles,counter,answer}.ts` | `src/sim/ai/` |
| Matchup classes (`matchupClass`) | `src/sim/rounds/matchups.ts` | `src/sim/matchups.ts`, which R4b extends |
| The battle screen | `src/app/rounds/{main,urlParams,loop,session,input,battleView,bridge}.ts`, `src/app/rounds/phases/{planning,clash,aftermath}.ts` | `src/app/` (R2b folds `phases/` in or keeps it) |
| Play time, the one module (X10) | `src/app/rounds/playTime.ts` | `src/app/playTime.ts`, which R2b/T109 reads and records-2 extends |
| Drawing | `src/render/rounds/{renderer,preview,aftermath}.ts` | `src/render/` |
| Bands, panels, report | `src/ui/rounds/hud/{top,tally,explain,tray}.ts`, `src/ui/rounds/{doctrine,inspect,report,callouts}.ts` | `src/ui/` |
| Unit, browser and slow tests | `tests/unit/rounds/`, `tests/browser/rounds/`, `tests/slow/rounds/`, `tests/roundHelpers.ts` | `tests/unit/`, `tests/browser/`, `tests/slow/`, `tests/helpers.ts` |
| Rule scenarios | `data/scenarios/rounds/<id>.json` | `data/scenarios/` |
| Tool libraries | `tools/lib/rounds/{run,params,bench,balance}.ts` | `tools/lib/` |

**Files outside `rounds/` that R2a edits,** each with a reason v1 doesn't notice:
- data, read by both (T008–T013, T017): a `rounds` block in `data/balance.json` and `data/balance-targets.json`; `squad`, `economy.goldPerRound` and `afterRound` beside v1's fields; a `colony` block in each map. R2b folds each into §11.1's and §14.2's final names and deletes v1's.
- `src/data/schema.ts` and `src/data/registry.ts`: optional fields, the new trigger kinds and the `rank` selector (T026, T046), and the `scenarios/rounds/` branch.
- `src/sim/compile.ts`: `buildLibrary` leaves v2's fields out of v1's library (T008, T009, Call 27), and v1 skips a unit modifier carrying `rank` or `onLoam` (T046).
- `src/sim/rng.ts`: two stream names, `ai.player` and `ai.enemy` (T027). v1 keeps `ai`.
- the adopted pieces (T011–T013) change v1's default data on `develop` too, as §16 R2 wants. They touch `src/data/proto.ts`, `src/run/flow.ts`, `src/sim/ai/profiles.ts`, `src/sim/ai/controller.ts` and their tests.
- the entry (T075): `src/app/main.ts` (one branch, a dynamic `import()`) and `src/ui/screens/title.ts` (a button on the dev site only, under `DEV_SITE` from `src/app/channel.ts`).
- the unit drawer: R4a's `src/render/unitSprite.ts` (R4/T011), or T081 creates it with R4a's signature if R4a hasn't landed.
- tools: a temporary `--rounds` switch on `tools/sim.ts`, `tools/balance.ts`, `tools/bench.ts` and `tools/experiment.ts`; a `ROUND_REPLAYS` list of `kind: "rounds"` replays in `tools/golden.ts`; round smokes in `tools/verify.ts`; the round assertions in `tools/screenshot.ts`; `@r<n>` checkpoints in `tools/lib/asserts.ts`; a `rounds` job kind in `tools/lib/pool.ts`.
- docs at the end (T138): `CLAUDE.md`'s "Dev-site builds" and `.claude/rules/v1-code.md`.

**What R2b deletes:** v1's files, the `--rounds` switch, `scene=rounds` and its title button (the battle scenes play rounds), and the `rounds` data blocks once folded. The switch is never a URL or `?proto=` knob (§1.3 #13).

### What's reused

- **As is:** `src/sim/hash.ts` (`hashValue`), R1's `src/sim/formation.ts`, `src/data/registry.ts`'s loading, the atlas (`src/render/atlas.ts`), `src/ui/h.ts`, `tooltip.ts`, `icons.ts`, `motion.ts`, `scale.ts`, the settings store (read only), and R1's `tools/lib/clash.ts` for building armies only (`armyFromBot`, `lineOf`, `assignSlots`).
- **Not reused:** R1's `placeArmy` and `playClash` (R1/T014, R1/T016) run on v1's sim (`addUnit`, `addBuilding`, `createBattle` with `test` switches). Every round clash, G1's squad duels, G12 and G16 among them, plays on R2a's sim through `playRoundClash` (T116), as §12.2 wants from R2 on.
- **With small additions:** `src/sim/rng.ts` (two stream names, T027) and `src/sim/compile.ts` (T008, T009, T046).
- **Copied, then stripped of v1's parts** (A027, A103): every module typed on v1's `BattleState`. That's `world.ts`, `targets.ts`, `spatial.ts`, `hits.ts`, `powers.ts` and the kept systems. The copies type on rounds' state, and v1's originals stay untouched. A bug fix in a kept rule lands in both copies until R2b.
- **Units are drawn by one function:** R4a's `drawUnitSprite(g, atlas, opts)` in `src/render/unitSprite.ts` (R4/T011), with `drawPips` for the merge preview and `emplacementSprite(content, buildingId)` for emplacements (R4/T029). So R4a's pips and body sizes (X3) land once, and R2a never copies `drawUnit`. If R4a hasn't landed, T081 creates that module with R4a's signature by moving the body of `Renderer.drawUnit` (`src/render/renderer.ts:511`, typed on v1's state), with no pixel change. R4a's task file owns what it draws.
- **Play time:** none to reuse. T128 builds the one module, `PlayClock` in `src/app/rounds/playTime.ts`, shaped so records-2 adds the run total to it (run-it-back.md T016) and no second module appears.

### Determinism and goldens

- **S1 moves v1's eight goldens once.** v1's `buildLibrary` (`src/sim/compile.ts:180`) copies `content.balance` whole and every building record whole (`:184`) into state, and `hashState` (`src/sim/snapshot.ts:5`) hashes all of it. T008 and T009 make it leave out `balance.rounds`, each building's `squad` and its `economy.goldPerRound` (Call 27), so only the adopted set and its weights (T011, T012) move v1's hashes. T014 refreshes them with `npm run golden -- update`, saying so in the commit and in `data/CHANGELOG-balance.md`.
- **Later R2a PRs leave v1's goldens alone, unless they edit a field v1 reads:** a unit's or building's v1 fields, a top-level `balance` key, or a v1 bot's or general's opener, weights or `maxOwned`. Such a PR (T139's tuning, say) runs `npm run golden -- update` and says so in its commit. What never reaches v1's state: `balance.rounds` (T101's knobs and every rounds retune included), `squad`, `goldPerRound`, `afterRound` (profiles keep only `maxOwned` and `afterTick`), new bots such as `bot:answer` and `bot:slayer-rounds`, map `colony` blocks (`createBattle` copies a map's id, name, size, `homeCols` and `tiles` only, `src/sim/create.ts:269`) and `balance-targets.json`.
- **Round goldens start at T072** (`r2-…` replays in `tools/golden.ts`'s `ROUND_REPLAYS`, T063). `npm run golden -- update` writes a round golden only once its entry is in that list. A later R2a change to round rules or data refreshes them with `npm run golden -- update`; `git diff --stat tests/golden/m*` then shows no change, and the commit says both.
- **Rules from §13.3:** `formationOf` and `mergePreview` draw on no stream and write nothing (T019, T034). Every sort ends on an id; plots go lane, rank, file. Heartcap damage is integer basis-point arithmetic (T047, T050). The aftermath isn't simulated.
- **Display text leaves the hashed state** (R2-Q8, A152). Rounds' library holds ids and numbers only, and the UI reads names and descriptions from `content`. Rewording then never moves a round golden.

### Calls this list makes

Each is reversible. S0 writes the ones that change SPEC text into SPEC (T005).

1. **Staging and data blocks** as above (A025, A066, A101). v2-only keys sit under `rounds` in `data/balance.json`, keys that keep their v1 meaning stay at the top level and both read them (`startingGold`, `loamBonus`, `sellRefund` 0.6, merge keys, `matrix`, `tagMult`, `effectiveness`, `heartcapPlayerHp`, `heartcapEnemyHp`).
2. **The preview entry** is `scene=rounds`, taken on every build through a dynamic `import()` of `src/app/rounds/main.ts`, so the round battle loads as its own chunk. The title shows a button, "A battle in rounds (preview)", on the dev site only (`DEV_SITE`). Captures and browser tests reach it as they reach v1's scenes, so there's no `--dev` mode. The preview never saves a battle (saves are R2b's). This is X2's R2a part, agreed 2026-11-02.
3. **Kept systems are copies** (above), so v1 isn't parameterized for rounds (A027, A103).
4. **The muster as plain data** (A032): R1's `musterKnits(units, opts)` (R1/T006) works on `MusterUnit` records `{key, side, lane, unitId, tier, x, y, mergeOn, eligible, source}`, with `opts = {firstKey, mergeRadius, radiusOf, lanes, width}`, and returns `{passes, units}`. Begin passes `firstKey = state.nextId`, so each merged unit's id equals its key (A024). Begin applies the passes once, in `passes`'s order, with real ids, `merged` events, `stats.merges` and merge triggers.
5. **`mergePreview`'s shape** (A039): `{ byBuilding: Record<id, {elders, bloomed, base}>, trios: { parts: {building, j}[]; tier; x; y; pass }[] }`. The view's "shares an Elder with file 2" cue and the muster's animation read it.
6. **Hypothetical previews and exports** (A060): `formationOf(state, side, change?)` and `mergePreview(state, side, change?)`, with `change = {plant: {buildingId, plot}} | {sell: id} | {toggle: {id, on}}`. Also exported: `matchupClass(state, side, unitId, tier, targetSide, targetUnitId, targetTier)` and `survivingSupply(state, side, lane)`.
7. **Commands** (A036, A121): a command stays `{round, tick, side, seq}`, with no phase field, since the type implies it. `tick` is `state.tick`, cumulative over the battle's clashes. `runHeadless`'s `until` is `'end' | {round, tick?}`, with `tick` counted from the clash's start.
8. **Refusals SPEC leaves implicit** (A034): `enemyPlanAfterOpening` (an enemy-side planning command after the round's opening) and `beginClashNotPlayer`. Tests build enemy colonies through scenarios, never commands.
9. **Queued clash commands at a clash's end** (A046) are dropped with a `commandDropped` event that `rejectedCommands` doesn't count. The auto policy thinks every 20 ticks of the clash clock.
10. **The AI stream per side** (A052): `rng.ai` becomes `{player, enemy}`, seeded `hash32(seed, 'ai.player' | 'ai.enemy', battleIndex)`. The general's plan then depends only on the record and its own state.
11. **The back-line placement term** (A043): `−10 × max(0, 1 − depth) − 2 × max(0, depth − 1)`, so a back-liner prefers the third rank to the front. That's within §7.3's "R2 tunes them".
12. **The general's plan per round** (A070) is kept in `sides[s].ai.plans[]`, as `{round, planted, sold, income, banked, counter?}`, so the Intent panel survives later commands and `round=` fast-forwards.
13. **Per-building results** (A064) go in `RoundResult.damageByBuilding` and `RoundResult.survivorsByBuilding`, per side. Per-lane damage before the cap is stored too (A068). The report's round chart keeps one column a round, with each lane's result as half-pips under it.
14. **The planning checkpoint** (A059) is the state after the round's opening, once the general has planned and a player-side bot's plant, sell and toggle commands have run, with only its `beginClash` left queued. The browser and `tools/lib/rounds/params.ts` both stop there; `phase=planning` (or `paused=1`) holds the loop until input.
15. **`?test=1` in the aftermath** (A061) jumps to the final frame: bars drained, banner up, pip filled. It holds for Space, Enter or a click, or with no `phase=` hold for the usual duration.
16. **`ticks` with `round`** (A075) counts from the clash's start; the bridge reports the cumulative `state.tick`. A round or tick past the battle's end fails the capture with a message.
17. **Golden checkpoint keys** (A115): `r<n>.planning`, `r<n>.clash`, `r<n>.aftermath`, plus `r<n>:<t>` every 200 clash ticks. `r<n>` alone is an alias for the end of round n's aftermath.
18. **Scenario fields** (A106): per side `dealt` (default: the other side's max HP minus its HP), the last round's result (each lane's winner, the round's loser), and an optional `rounds` history, so the counter cycle and the comeback gold see consistent state.
19. **Content on retired systems, until R2b gives it v2 effects.** Modifiers on retired stats compile to nothing in rounds, and the compile lists them: Vesper's and Armilla's passives, Mold's, the Baron's and the Sovereign's. Cordis's passive and the Blightwright's are kept. Rhizome Tithe is refused with `notInRoundsYet` and the auto policy skips it. The Rhizome Vault plants but does nothing (#26). Elites, relics and upgrade levels aren't in R2a's single battles.
20. **v2's §5.2 is the rule in rounds** (A021, A008, A110). Idle units seek the nearest enemy they could target, siege units have no preference, and the combat tests keep slayer and tunneler preferences. R1's tool-only flags for these become the rule.
21. **Closed plots** (A072) are dark, unlit soil with no grid and a small mark. The ghost refuses one with "this plot is closed"; the chip counts open plots.
22. **Matchup marks per tier** (A069): a squad shows the mark of your hits on its base-tier units, plus a pips mark when its merged units take a different class.
23. **The result banner** (A071) is pinned in the callout lane through the aftermath.
24. **Bench cases** (A112, A119, A113): bench-300 becomes a placed-unit clash in formation-like blocks, run as repeated fresh clashes and timed per tick, weighted by live units. A planning command's sim part (`formationOf` and `mergePreview` after a plant) gets a Node budget; the 4 ms Chromium figure is a browser test.
25. **`pendingGold`** exists and is paid with the next round's income, but nothing pays into it in R2a. R2-Q20 is R2b's.
26. **No drafts in R2a.** `flags.drafts` is refused in a round battle, `draftRounds` is data only, and the opening's draft step is an empty hook. R2b builds the draft in planning, its dock (R2-Q24, A062) and #28's refusals.
27. **v1's library leaves out v2's fields** (A101). `buildLibrary` in `src/sim/compile.ts` copies `content.balance` without `rounds`, and each building without `squad` and `economy.goldPerRound` (T008, T009). v1 never reads them, so rounds data never moves a v1 golden. Reversible: if the user would rather not touch v1's compile, drop the strip and the claim, and every task that edits those fields runs `npm run golden -- update` for v1's goldens and says so.
28. **The preview's defaults** (A059): `map=bogwater-hollow`, `battleIndex=1`, `player=human`, `enemy=general:mother-mold`, `flags=merging,adaptive,powers`, `commander=vesper`, a random seed written into the URL (T076). The title button opens them. They're URL defaults only, changed in one place.
29. **No copies in a single battle** (A145, A196). X4 was decided no at R1's gate (2026-11-02), so each side's kit is the faction roster with no copy limit (D45), and the general keeps `maxOwned` (T033). R3 adds copies.
30. **The arrival shield** (#8) is `balance.rounds.arrivalShield {minTypes 2, shieldFrac 0.2}`, v2's own key; v1's `mixedWave` stays as it is. Begin shields each lane's army of 2 or more unit types before the muster, as R1's `clashshield` did (`tools/lib/clash.ts`): a merged form counts as its base type, emplacements neither count as a type nor take a shield, and a knit keeps shields in proportion.

## Stories

| ID | Priority | Story | Independent test |
|---|---|---|---|
| US1 | P1 | A round's clash from your colony, scored: squads field from their plots in formation, knit at the muster, fight until each lane ends, and the round is scored into both Heartcaps | `npx vitest run tests/unit/rounds/scenarios.test.ts` asserts every rule scenario exactly: lane winner, margin, Heartcap damage, comeback recipient |
| US2 | P1 | A whole battle in rounds, headless: income each round, the general plans first, a bot plans after it, and the battle ends by Rout or by Decision after round 9 | `npm run sim -- --rounds --seeds 1..40 --player bot:balanced --enemy general:scripted --summary` ends every battle with `rejectedCommands=0` and prints §16 R2 step 3's rows |
| US3 | P1 | The user plays a battle in rounds on the dev site: planning with both armies in view, the clash, the aftermath and the report | `npm run dev`, then `/?scene=rounds&seed=1` plays from round 1's planning to the report; `npx vitest run tests/browser/rounds` passes |
| US4 | P2 | The general adapts by rounds: its counter cycle reads what you fielded, and its counters land as new buildings you see before you plan | `npm run sim -- --rounds --seeds 4..5 --player bot:mono:sporelingBurrow --enemy general:mother-mold --flags merging,adaptive --summary --assert counters[0].round=4` |
| US5 | P2 | The commander power fires at most once per clash, from the muster on | `npx vitest run tests/unit/rounds/powers.test.ts`, and `npm run sim -- --rounds --seed 3 --player bot:balanced --commander vesper --power-policy auto --flags merging,adaptive,powers --assert stats.player.powerUses>=1` |
| US6 | P2 | The tools and the battle-level guardrails in round form, with a bot that buys the answer to what it sees (X7) | `npm run golden -- verify`, `npm run bench -- --rounds`, `npx vitest run tests/slow/rounds`, and `npm run sim -- --rounds --seeds 1..40 --player bot:answer --enemy general:lichen-baron --flags merging,adaptive --summary` |
| US7 | P3 | Measures for the playtest: a "last fielded" view of the general for an A/B, and planning seconds per round | `/?scene=rounds&reveal=last` on `npm run dev`; the report's planning line; `npx vitest run tests/unit/rounds/playTime.test.ts tests/browser/rounds/reveal.test.ts` |

## Phase 1: Setup

S0, the plan and the decisions. No code.

- [x] T001 [USER] Confirm X1 and X2 with the user and write both Decision lines, dated, in `docs/tasks/clarify.md`; if either goes the other way, re-cut this file by the "If … no" lines under Before you start (§16 R2)
- [x] T002 Check that R1's results (the list under "Results it builds on") are in `docs/balance-backlog.md`, that `docs/status.md` records R1's review gate, and that R1's `src/sim/formation.ts` and `tools/lib/clash.ts` are on `develop`; if not, stop and ask (§16 R1 step 4, §16 R2)
- [x] T003 Write `docs/r2a-plan.md` (new) in CLAUDE.md's format, for R2a only (§16 R2)
  - Goal: §16 R2's first half (X1).
  - Scope: X1's R2a boundary, pointing to `docs/tasks/r2b-run-in-rounds.md` for the rest.
  - Stand-ins: the preview entry, `--rounds`, the `rounds` data blocks and Call 19's content.
  - Steps: this file's Sessions.
  - Verification: §16 R2 steps 1–4 and 7–9 on single battles, and gate questions 1, 2, 3, 6 and 7.
  - Open questions for the user: the refs under Before you start.
  - As built: empty.
- [x] T004 [USER] Settle R2a's refs with the user from `docs/tasks/clarify.md`, in its index order: X4 and X5 if R1's gate left them open, X6, X7, X8, X10 if records-1's S0 hasn't settled it, and RB-Q3, R2-Q1 to R2-Q12, #19, #22, #23, #25, #29, #30, #31, #35's approach (its battle-level bands come from T124's measurement), #53, M6-Q1, M7-Q1, and #43, #51 and R3-Q8 if X4 is yes. Write each Decision line with the date (§18.2)
- [x] T005 Write the decisions and the Calls that change SPEC text into `SPEC.md` (§0, §13.4, §15, §16):
  - close the settled §18.2 rows and drop their **Open:** markers;
  - §16 R2: X1's split (R2a's gate asks step 10's questions 1, 2, 3, 6 and 7, R2b's asks 4 and 5), X2's landing (beside v1 behind a dev-only entry, then R2b's cutover on `feature/r2b-cutover`, so L3510's "as the new default" holds from R2b's merge), and the plan names `docs/r2a-plan.md` and `docs/r2b-plan.md`: the first row of spec-analysis.md's "SPEC wording fixes · R2a" table;
  - add R2-Q11's rules to §5.6, §6.5, §6.7 and §14.6, and R2-Q12's to §10.2 and §10.3;
  - work through `docs/tasks/spec-analysis.md`'s "SPEC wording fixes · R2a" table row by row: the §1.3 #1 L168 fix ("no Heartcap takes more than 500 in a round"), A027 and A103 (§13.4), A036 and A121 (§15.5, §14.5, §14.6), A110 (§15.7's Combat row), A104 (§15.7's rows), A113 (§12.3 G11, §15.4), A115 (§15.2 and §15.5's checkpoint keys), A075 (§15.6), A061 (§10.2, §10.5), A078 (§13.5, §10.2), A059 (§15.6), A076 (§16 R2 step 9's captures), A040 (§5.6), A035, A092 and A209 (§6.5), A055 (§7.4: a healer is in no counter set), A109 if R1/T050 left it (§16 R2), A112 and A119 (§15.4, §13.7, `G11.benchTicks`);
  - §14.4: `rng.ai` per side (Call 10), `AiState.plans` (Call 12), per-lane damage and `damageByBuilding` and `survivorsByBuilding` in `RoundResult` (Call 13), the lane lock in `ClashState` (A030), `lane` in `FieldedSquad` (A047);
  - §14.5: the refusals `enemyPlanAfterOpening` and `beginClashNotPlayer` (Call 8);
  - §14.6: `runHeadless`'s `until` (Call 7); `formationOf` and `mergePreview` with `change?` and the new preview shape (Calls 5 and 6); the `matchupClass` and `survivingSupply` exports (Call 6); dropped clash commands (Call 9);
  - §7.3: the back-line term (Call 11); §15.2: the scenario fields (Call 18); §10.2: Calls 21–23;
  - document `scene=rounds` and `--rounds` in §15 as R2a's temporary options, gone in R2b. There's no `--dev` (X2's R2a part, 2026-11-02).
- [x] T006 [USER] Agree `docs/r2a-plan.md` with the user. Then update `docs/status.md` (R2a's sessions, what waits on the user), and open the S0 PR into `develop` when the user asks (§16 R2, CLAUDE.md "How we work")

**Checkpoint:** `docs/r2a-plan.md` is agreed, every ref under Before you start has a dated Decision line in `docs/tasks/clarify.md` (or is marked as waiting for the measurement that sets it), and `npm run verify` passes on the docs PR.

## Phase 2: Foundational (blocks every story)

S1 to S4: the data, the colony, the round state machine and the planning commands.

**S1: rounds data and R1's set as default data**

- [x] T007 Write the data cases first in `tests/unit/data.test.ts`, and one case in `tests/unit/determinism.test.ts` (§11.1, §11.2, §14.2, §13.3, §15.7 Data):
  - every spawner has a `squad {unit, count}` whose unit resolves and whose count is R1's;
  - every economy building has `economy.goldPerRound` (Truffle Cellar 50, Spore Exchange 12);
  - `balance.rounds` validates, and a limit with `afterRound` validates;
  - both rosters list each adopted building;
  - in `tests/unit/determinism.test.ts`: changing `balance.rounds.maxRounds`, or a building's `squad.count` or `economy.goldPerRound`, leaves a v1 battle's `hashState` unchanged (Call 27).
- [x] T008 Add a `rounds` block to `BalanceSchema` in `src/data/schema.ts` and to `data/balance.json`, and keep it out of v1's library (§6.2, §6.4, §6.5, §6.7, §7.2–§7.4, §11.1) (A205)
  - Rounds: `maxRounds` 9, `clashCapSeconds` 45, `musterSeconds` 1, `formationGapTiles` 6, `heartcapDamagePerSupply` 25, `siegeHeartcapMult` 2, and the arrival shield `arrivalShield {minTypes 2, shieldFrac 0.2}` (#8, Call 30).
  - The cap, the Decision and interest, as the user decided (X5 at R1's gate, R2-Q2 at S0): `roundDamageCap {maxHpBp: 2500}`, `decision {by: 'shareOfMaxHp'}`, `interestPer` 10 and `interestCap` 30. The schema also accepts `roundDamageCap {flat: 500}` and `stormScales: true` beside either base (A208's storm cap is `{flat: 500, stormScales: true}`; a cap names one base, so a bare `{stormScales: true}` fails), and `decision {by: 'damage'}`, for T124's measurements.
  - The storm: `sporestorm {startRound 5, stepBp 2000, maxBp 20000}`.
  - The rest of the economy: `stipendPerRound` 100, `comebackGold` 40, `enemyIncomeMult` 1.0, `sellRefundPlanted` 1.0.
  - Later work: `draftRounds` [2, 4, 6] (R2b), `lives` 3 (R2b), `plotGrowth {perWin 1, max 4}` (R2b).
  - The AI: `ai {economyEarly {beforeRound 3, mult 1.5}, economyLate {fromRound 7, mult 0.3}, towerAfterLossMult 2, score {depth 10, offCentre 1, besideSame 2, frontSupport 3, loam 8, backThird 2, noise 0.5}, counter {cycles [{round 4, from 1}, {round 7, from 4}], bossCycles [{round 3, from 1}], freePlots 2}}`.
  - In `src/sim/compile.ts`'s `buildLibrary`, copy `content.balance` without its `rounds` key (Call 27). v1 never reads it.
- [x] T009 Add `squad {unit, count}` and `economy.goldPerRound` to `BuildingSchema` in `src/data/schema.ts`, beside v1's `spawn` and `goldPerTick`. Cross-check `squad.unit` in `src/data/registry.ts`, and fill both in `data/factions/velvet-bloom/buildings.json` from §11.2's Squad column, with Capguard Hall at 3 (#7) (§4.4, §11.2, §14.2)
  - In `src/sim/compile.ts`'s `buildLibrary`, copy each building without `squad` and `economy.goldPerRound` (Call 27). v1 never reads them. T007's determinism case proves it.
  - Also switch `baseSquad` in `src/data/shapes.ts` to `squad.count` (added at S1: no task did, and R4/T030's width case reads it). `npx vitest run tests/unit/shapes.test.ts` passes on R1's sizes; only the Capguard's bound moved, and it widened (4 → 3 units).
- [x] T010 Add an optional `afterRound` to the limit schema and to `BotSchema` in `src/data/schema.ts`. Write it beside every `afterSeconds` in `data/generals.json` and `data/bots.json`, one round per minute: `rootbreakerDen` 180 s becomes round 4, turtle's 240 s round 5 (§7.2, §7.9) (A038, A044)
- [x] T011 Adopt R1's chosen set as default data in `data/balance.json` and the faction files (§1.3 #11, §5.3, §11.1, §11.2, §16 R2)
  - Rules into `data/balance.json`, all of `kept` (R1's gate):
    - `pinned {radius 1, rateMult 0.35}`;
    - `sporeCloud {buildings [puffballMortar], range 7, radius 1.5, seconds 6, damagePerSecond 10}`, without `aiCover` (A118);
    - `cleave {units [scythecap]}`, with the Scythecap's splash 1.0, 1.2 and 1.4;
    - `burst {cloud {radius 1.5, seconds 4, damagePerSecond 10}}`.
  - Units and buildings: the Burster, Burster Pod, Rhizomorph and Rhizomorph Tunnel into `data/factions/velvet-bloom/units.json` and `data/factions/velvet-bloom/buildings.json`, with §11.2's squads (6 Bursters, 3 Rhizomorphs). Add both ids to `data/factions/velvet-bloom/faction.json` and `data/factions/gray-rot/faction.json`.
  - The arrival shield goes into `balance.rounds` (T008's block, Call 30), not v1's `mixedWave`. The Elder Sporeling keeps its splash (#9), so its data doesn't change. The presets R1's gate deleted (`noeldersplash`, `clashpace`, `swarmread`) and R1's measuring presets (`clashshield`, `mixedwave`) stay in `src/data/proto.ts` until R2b/T059 deletes them with R1's clash tool on v1's sim (A109).
  - Set `tierRadiusMult` to 1.0 in `data/balance.json` (#53, decided 2026-11-01 at R4a-S0), inside S1's one golden refresh, so a merged unit's collision radius no longer grows. Log it in `data/CHANGELOG-balance.md` with the decision it rests on.
- [x] T012 Write R2-Q5's weights into `data/bots.json` and `data/generals.json` and retire `aiWeight` (§11.11, §16 R2) (A048, A118)
  - Weight 1 for each adopted building in every bot in `data/bots.json` (`bot:balanced`, rush, turtle and greedy, and G7's mirrors `balanced-nomerge`, `slayer` and `slayer-nomerge`), and in each general's `weights` in `data/generals.json`. Fixed at S1: under `aiWeight` all seven bots bought both, since none sets `fixedWeights`, so that's what R1 measured; R2-Q5's list of four was an omission (the hub, 2026-11-02).
  - Remove `aiWeight` from `src/data/schema.ts` (`:459`), the kit append in `src/run/flow.ts` (`:169-170`) and the weight join in `src/sim/ai/profiles.ts` (`:58-64`). Replace `content.buildings[id]!.aiWeight ?? 1` with `1` at `src/run/flow.ts:106`.
  - Strip `aiWeight` from the `RHIZOMORPH`, `BURSTER` and `FLYERS` constants in `src/data/proto.ts` (`:38`, `:87`, `:128`), so `rework` (kept until R2b) and `flyers` (a default-off knob, §16 R2) still validate. Give the Drift Stalk weight 1 inside the `flyers` preset through `bot.<id>.weights.driftStalk` and `general.<id>.weights.driftStalk` paths for the seven bots and five generals above, so `?proto=flyers` still buys it.
  - Drop `aiWeight: 1` from the `toMatchObject` checks at `tests/unit/combatRework.test.ts:222`, `:646` and `:853`, and reword the `aiWeight` comments at `tools/lib/balance.ts:590` and `tests/unit/counters.test.ts:37`.
  - `fixedWeights` (`src/data/schema.ts:621-622`) no longer skips anything: reword its comment to "buys only what `weights` lists", and keep the field only if the counter check's test bots or T069 still read it (A044).
  - Remove the `laneCover` term with `sporeCloud.aiCover` in `src/sim/ai/controller.ts`.
  - G3's fixed reference in `tools/lib/balance.ts` (`reference`, `appended` and the monos listed apart, A023) read `aiWeight`, so it retires with it, as does its case in `tests/unit/counters.test.ts` (added at S1).
  - Add a kit case to `tests/unit/run.test.ts`: no Burster Pod in a battle-1 general's kit. Add a case to `tests/unit/prototypes.test.ts`: `protoContent('flyers')` and `protoContent('rework')` both validate.
- [x] T013 Remove the adopted pieces' entries and `kept` from `PROTO_PRESETS` in `src/data/proto.ts`; keep the constants `rework` builds from, since R2b deletes `rework`. Rewrite `tests/unit/combatRework.test.ts` and `tests/unit/prototypes.test.ts`: drop the adopted pieces' "off by default" cases (§15.7 Prototypes, Matrix and damage)
  - Move their behavior cases into `tests/unit/damage.test.ts` and `tests/unit/combat.test.ts`: a pinned unit attacks at ×0.35 within 1 tile; a cloud deals 10 a second for 6 s through armor; cleave deals full damage within 1.0, 1.2 and 1.4 tiles; a burst deals 40 through armor within 1.5 tiles and leaves a 4 s cloud.
  - As built (S1): pinning went to `combat.test.ts`, the other three to `damage.test.ts`. The adopted pieces' other cases (the cloud tower's aim, the Rhizomorph's tunnel, the Burster's aim and its never merging) stay in `combatRework.test.ts` on the shipped content, for R2b to move with the file. `rework` now plays over the shipped Mortar clouds and cleave, which P3 played without.
- [x] T014 Run `npm run golden -- update` once for S1, and log the change in `data/CHANGELOG-balance.md`: the adopted set with the user's approval, and the round damage cap, the Decision and interest as the user's decisions (X5, R2-Q2), not as hash-only. The rounds fields move no v1 hash (Call 27), and the commit says the refresh comes from the adopted set (§12.4, §15.5)
  - If the adopted set moved a v1 smoke assert's value in `tools/verify.ts`, adjust it and say why.
  - Run v1's `npm run test:slow` and record its result in `docs/balance-backlog.md`. A v1 miss isn't open work (`.claude/rules/balance.md`).
  - Check that `npm run experiment -- --checks clash`, with no `--proto`, gives R1's `--proto kept` report on the same seeds. The arrival shield and the squads are rounds data, which R1's tool on v1's sim doesn't read.
  - Run `npm run experiment -- --checks duels,g8` on the adopted default, with no `--proto`, and record it beside R1's `--proto kept` reading (A116).

**S2: the colony and the formation's pure core** (may run beside S1; both edit `src/data/schema.ts`, in different schemas)

- [x] T015 [P] Write `tests/unit/rounds/colony.test.ts` (new) (§4.6, §11.9, §13.3)
  - Ranks and files on both sides: rank 0 borders the arena, and the general's file 1 mirrors your last file.
  - Loam and stump detection; a stump plot is never legal.
  - Neighbors are in front of, behind and beside, never at a corner or across lanes; plots are ordered lane, rank, file.
  - The third rank is closed until opened. It opens files 2, 3, 1, 4 on one lane, and on Twin Roots files 2, 1, 3, alternating lanes from the top (A031).
  - Buildable counts are 8, 6 and 11.
- [x] T016 Add an optional `colony` block to `MapSchema` in `src/data/schema.ts`: `{homeCols, startRanks, tiles}` (§4.1, §4.6, §11.9) (A031)
  - The schema checks that `homeCols` is even, that the tiles are point-symmetric, that lane rows pair up (a leftover row holds no plot), and that loam and stumps lie only in colony columns.
  - `colony` stays optional, so the four test maps that get none (`data/maps/test-bogwater-2lane.json`, `data/maps/test-bogwater-2lane-tall.json`, `data/maps/test-stumpfield-2lane.json`, `data/maps/test-stumpfield-2lane-tall.json`) still validate. `createBattle` in rounds (T027) refuses a map without one, with a message.
- [x] T017 Draw the `colony` block in `data/maps/bogwater-hollow.json`, `data/maps/stumpfield.json`, `data/maps/twin-roots.json`, `data/maps/test-flat.json` and `data/maps/test-3lane.json` (§4.1, §11.9)
  - The layouts are §11.9's: Bogwater front `····`, back `·$··`; Stumpfield front `·o·$`, back `··o·`; Twin Roots' upper front `·o·`, lower back `$·$`.
  - `homeCols` 6 and `startRanks` 2, with the arena plain soil.
  - v1 keeps reading `tiles` and `homeCols`, so no hash moves. `test-3lane`'s colony (homeCols 6, 4-row lanes) is for tests and the bench only.
- [x] T018 Build `colonyPlots(map, side, plotCount)`, `plotNeighbors(plots, i)` and `openOrder(map)` in `src/sim/rounds/colony.ts` (new): pure functions of the map's `colony` block that return `PlotState`-shaped records `{lane, rank, file, col, row, terrain, open}` (§4.6, §13.3 rule 4)
- [x] T019 Write `tests/unit/rounds/formation.test.ts` (new) for the pure core (§4.6, §5.6, §15.7 Formation, Merging)
  - Bogwater's slots: the player's in columns 9–12, the general's in 19–22, the third rank 2 columns further back.
  - The k × k grid fills front to back, then top to bottom, with front toward the enemy. Holes stay holes, and an emplacement stands at its slot's centre. An overflowing squad packs tighter (#11).
  - Arrival order is plot order, then j (A024).
  - A Burrow's 8 come to 2 Bloomed and 2 base. Two Burrows side by side, and three in a row, give the same result whichever was planted first.
  - Nothing knits across Twin Roots' root wall, even with a merge-radius bonus (A040).
- [x] T020 Build `formationFor(input)` and `musterFor(input)` in `src/sim/rounds/formation.ts` (new) on R1's `src/sim/formation.ts` (§4.6, §5.6, §14.6) (A024, A039, A040)
  - The input is plain: the map's geometry, the side, and each plot's building `{id, squad {unitId, count, radius}, kind, mergeOn}`, plus `firstKey`, the side's `mergeRadius` (with any bonus), `radiusOf(unitId, tier)` and the map's width, passed straight to R1's `musterKnits`.
  - `formationFor` gives one slot per plot in the same rank and file, and squads in plot order with each unit's absolute position.
  - `musterFor` runs R1's knitting to a fixed point on those positions, in arrival order, within each lane. It returns Call 5's shape.

**S3a: the round types, compile and the modifier DSL**

- [x] T023 Define the round types in `src/sim/rounds/state.ts` (new), from §14.4–§14.5 (§14.4, §14.5) (A030, A036, A047, A052, A064, A068, A070, A121), with these additions:
  - each lane in `ClashState` carries its lock: `{winner, survivors, damageSupply per side, margin, endTick}`;
  - `RoundResult` carries per-lane damage before the cap, `damageByBuilding` and `survivorsByBuilding`;
  - `FieldedSquad` carries `lane`;
  - `rng.ai` is `{player, enemy}`, and `AiState` carries `plans[]`;
  - `Command` stays `{round, tick, side, seq}`.
- [x] T024 Write `tests/unit/rounds/compile.test.ts` (new) (§11.2, §14.2, §13.3):
  - a squad's count comes from `squad`;
  - a tower compiles to an emplacement unit with structure armor and its building's `hp`;
  - a modifier on a retired stat compiles to nothing and is listed;
  - Cordis's `side.knitTicks` and `side.mergeRadius` apply;
  - the library holds no `name`, `description` or `text`.
- [x] T025 Build `buildRoundLibrary` and `compileRoundSides` in `src/sim/rounds/compile.ts` (new). The library holds ids and numbers only (R2-Q8). The compiled sides hold squads, `goldPerRound`, emplacement units, rules from `balance.rounds` and the list of ignored retired stats; v1's helpers that take only data, such as `perkAt`, are imported (§11.1, §11.2, §14.2) (A152)
  - M7-Q1 dropped the Gray Rot's trait (2026-11-02), so the enemy seat gets no HP or speed change.
- [x] T140 Write `tests/unit/rounds/effects.test.ts` (new) first, on a compiled side from T025 (§14.2, §14.6) (A028):
  - `src/data/schema.ts` accepts `roundStart`, `clashStart` and `roundWon` triggers and a `rank` selector, and still refuses any `where` on a `side.*` or `battle.*` stat;
  - a `gainGold` action pays its own side once per firing;
  - `rank` and `onLoam` select squads by their plot;
  - `npm run validate:data` and v1's `tests/unit/effects.test.ts` still pass.
  - That each trigger fires once at its §14.6 step is tested with the step: `roundStart` in T054, `clashStart` in T042, `roundWon` in T047.
- [x] T026 Build the modifier DSL for rounds in `src/sim/rounds/effects.ts` (new), and the data it needs in `src/data/schema.ts` (§14.2, §14.6)
  - The schema: add `roundStart`, `clashStart` and `roundWon` to `TriggerSchema`'s `on` enum (`src/data/schema.ts:83`). v1's `src/sim/effects.ts` never fires them. Add `rank: 0 | 1 | 2` to `SelectorSchema`, treated as positional, so until T046 it's accepted only where `POSITIONAL_STATS` allows (`:46-67`).
  - The DSL: v1's stat resolution, the kept selectors plus `rank` and `onLoam`, and the triggers `battleStart`, `roundStart`, `clashStart`, `unitDeath`, `merge` and `roundWon`, with `gainGold`.

**S3b: `createBattle`, the step by phase and scenarios**

- [x] T021 Write `tests/roundHelpers.ts` (new), the round-form harness; `tests/helpers.ts`'s `liveState` stays for v1's tests (§15.7, §4.6, §4.7, §14.4)
  - It starts with `planningState({map, round, kits, gold, flags, battleIndex})` and `fromScenario(id)`, on T027 and T029.
  - Each later helper lands with the task that builds its command: `plant(s, side, buildingId, {lane, rank, file})`, `sell` and `toggle` with T031, `begin(s)` and `stepClash(s, n)` with T043, `finishRound(s)` with T052.
- [x] T022 Write `tests/unit/rounds/rounds.test.ts` (new) for creation (§4.7 steps 1–4, §14.4, §14.6):
  - after `createBattle`: phase `planning`, round 1, tick 0, both colonies empty;
  - both Heartcaps full, at 3000 and 2000 + 250 × (index − 1);
  - gold 300 + 75 × (index − 1) for each side;
  - the enemy's plan hook has run before `createBattle` returns;
  - a map without a `colony` block is refused with a message;
  - a snapshot round trip gives equal hashes, and `restore` refuses a v1 state;
  - rewording a building's description in content leaves a round battle's hash unchanged (R2-Q8).
- [x] T027 Build `createBattle(content, config)` in `src/sim/rounds/create.ts` (new). It returns a battle in round 1's planning through `openRound` (a stub until T055), with hooks for the general's plan (T068) and a player-side bot's plan (T069) (§4.7 steps 1–4, §6.1, §14.6) (A052)
  - It seeds `rng.ai` per side and opens `SideConfig.plots` (the map's base plots by default) in `openOrder`. It refuses a map with no `colony` block (T016).
  - Add `ai.player` and `ai.enemy` to `StreamName` in `src/sim/rng.ts` (`seedStream` at `:31` is typed on it), seeded `hash32(seed, 'ai.player' | 'ai.enemy', battleIndex)` (Call 10). v1 keeps `ai`.
- [x] T028 Build the queue in `src/sim/rounds/commands.ts` (new), the step by phase in `src/sim/rounds/step.ts` (new), hashing in `src/sim/rounds/snapshot.ts` (new), and the API in `src/sim/rounds/index.ts` (new) (§13.3 rule 7, §14.5, §14.6)
  - Stamps are `{round, tick = state.tick, side, seq}`, sorted with the player first.
  - Planning runs the queue, a clash advances one tick, the aftermath opens the next round or ends the battle, and `ended` does nothing.
  - `hashState`, `snapshot` and `restore` work on `v: 2`.
- [x] T029 Add `RoundScenarioSchema` to `src/data/schema.ts` and a `scenarios/rounds/` branch in `src/data/registry.ts` that fills `content.roundScenarios`. Build `createFromScenario` in `src/sim/rounds/create.ts` (§15.2, §15.7) (A106)
  - Per side: `colony [{building, lane, rank, file, merge?}]`, `kit`, `gold`, `heartcapHp`, `heartcapMaxHp`, `dealt` and the last round's result. A scenario can also carry a `rounds` history and the round to start in.
  - For rule tests, `clash.units` places units for a clash directly.

**S4: planning commands, the kit and the formation on state**

- [x] T030 Write `tests/unit/rounds/planning.test.ts` (new) (§4.2, §4.4, §4.7, §14.5) (A034):
  - one case per refusal: the wrong phase; another side's plot or building; a taken plot; a stump plot; a closed plot; a card not in the kit; not enough gold; an enemy-side command after the opening; `beginClash` from the enemy;
  - a refund of 100% in the planting phase if unfielded, else floor(60%); the plot frees at once;
  - `toggleMerge` works only on your own spawner;
  - `state.tick` doesn't move over N planning steps;
  - replaying the log reproduces the same rejections; `priceOf` has no column term.
- [x] T031 Build the planning executors and checks in `src/sim/rounds/planning.ts` (new): `plant`, `sell`, `toggleMerge` and `beginClash`'s planning half, plus `legalPlots`, `plantProblem`, `priceOf` and `sellValue` (§4.4, §4.7, §14.5, §14.6) (A034)
  - Each command is checked again when it runs; a refusal is a `commandRejected` with a reason, counted in `stats.rejectedCommands`.
  - Events: `buildingPlanted`, `buildingSold {refund}`, `mergeToggled`.
- [x] T032 Write the kit cases in `tests/unit/rounds/planning.test.ts` (§4.4, §18.1 D45):
  - a single battle's kit is the faction roster, and a card outside it is refused;
  - with no copy limit (D45; X4 decided no, 2026-11-02), a card plants until the plots run out;
  - the general plants by `maxOwned`.
- [x] T033 Build the kit in `src/sim/rounds/kit.ts` (new): `kitOf(content, side, config)`, a single battle's faction roster, and `inKit`, which `plant` checks. There are no copies (D45, Call 29), and the general keeps `maxOwned` (§7.8); R3 adds copies here, and the general's are #42's (§4.4, §14.6, §18.1 D45) (A033, A145, A194, A196)
- [x] T034 Build `formationOf(state, side, change?)` and `mergePreview(state, side, change?)` in `src/sim/rounds/formation.ts` on T020's core, and export both with `survivingSupply` from `src/sim/rounds/index.ts` (§4.6, §5.6, §14.6) (A032, A060)
  - Add cases to `tests/unit/rounds/formation.test.ts`: a `change` preview equals the state after that change; `hashState` and every rng stream are unchanged after either call.

**Checkpoint:** `npm run verify` is green with only S1's v1 golden refresh; `npx vitest run tests/unit/rounds` passes.

## Phase 3: US1 — A round's clash from your colony, scored (P1)

**Goal:** Begin fields both colonies in formation, the muster knits what the preview promised, each lane ends by a wipe or the 45 s cap, and the round is scored in §6.7's integers. **Independent test:** `npx vitest run tests/unit/rounds/scenarios.test.ts`.

**S5: the kept combat rules and emplacements**

- [x] T035 [US1] Write `tests/unit/rounds/combat.test.ts` (new), with the kept cases of v1's combat and damage tests in round form (§5.2, §5.3, §6.7) (A008, A021, A029, A110)
  - Targeting: the preferred class first, then the nearest by edge, ties to the lower id; stickiness within ×1.25; no building or Heartcap candidates; siege units have no preference; slayer and tunneler preferences hold; a tunneler surfaces at the nearest enemy ranged unit out of an emplacement's reach.
  - Movement: an idle unit seeks the nearest enemy it could target; with none it advances, drifting toward its slot's y at 0.3 tiles a second; positions clamp to [0, W]; separation runs 2 passes.
  - Damage: splash falloff, pinning, clouds, cleave, bursts and healing.
  - An emplacement never moves, even when overlapped; it counts 0 supply; siege deals ×2 to it; its firing band respects `minRange` 1.5; the Mortar reaches 7 tiles with clouds; it's never healed, never merges, pins nothing, and clouds, bursts and powers hit it.
- [x] T036 [US1] Copy `world.ts`, `targets.ts`, `spatial.ts` and `hits.ts` into `src/sim/rounds/world.ts` (new), `src/sim/rounds/targets.ts` (new), `src/sim/rounds/spatial.ts` (new) and `src/sim/rounds/hits.ts` (new), typed on rounds' state (§13.4) (A027, A103)
  - Removed: buildings and `HEARTCAP_ID` as targets, besieged, suppression, `columnsOwned` and `supplyCapOf`. `MAX_RADIUS` 0.8 stays.
- [x] T037 [US1] Copy targeting into `src/sim/rounds/systems/targeting.ts` (new), without buildings or Heartcaps as targets, call for help, dive, or siege's preference. Keep slayer's and the tunneler's rules; the tower path becomes the emplacement's firing band and the Mortar's cloud aim (§5.2, §13.4) (A008, A110)
- [x] T038 [US1] Copy movement into `src/sim/rounds/systems/movement.ts` (new), without Hold, waves, rush, fall-back, dive, surfacing at spawners, turret checks, or the imports from `spawning.ts` and `stance.ts` (§5.2, §13.4) (A021)
  - Idle units seek per §5.2; emplacements are immovable in separation, and the other unit takes the whole overlap. There's no pace rule (#12): each unit moves at its own speed.
- [x] T039 [US1] Copy combat into `src/sim/rounds/systems/combat.ts` (new), without turrets, damage to buildings and the Heartcap, `spawnerDefense`, the storm's unit and tower multiplier, or `releaseStored`. Siege's ×2 stays, against structure armor only (§5.3, §11.1, §13.4)
- [x] T040 [US1] Copy merging, healing and clouds into `src/sim/rounds/systems/merging.ts` (new), `src/sim/rounds/systems/healing.ts` (new) and `src/sim/rounds/systems/clouds.ts` (new). Merging's v1 rule holds on the field after the muster, without the supply wait, `noteMerged` or wave tracking. Clouds keep `soakShield`, and merging keeps shields in proportion, since #8 adopted the arrival shield (§5.3, §5.6, §13.4)
- [x] T041 [US1] Compile and field emplacements in `src/sim/rounds/compile.ts` and `src/sim/rounds/formation.ts` (§4.4, §6.7) (A029)
  - Each tower becomes one unit with its attack, `hp`, `minRange` and cloud aim, structure armor and 0 supply. It stands at its slot's centre, with a radius of at most 0.8, its range measured from its centre as a tower's was, and it's restored each round.

**S6: Begin, the muster and a lane's end**

- [x] T042 [US1] Write `tests/unit/rounds/clash.test.ts` (new) (§4.7 steps 12–17, §5.6, §6.7, §14.6) (A024, A026, A028, A030, A032, A047):
  - both armies appear on the same tick, with ids in plot order, then j;
  - with no power queued, for 20 ticks no unit's position or HP changes, separation included;
  - the fielded record equals the units standing after the muster, by lane, type, tier and count;
  - a muster merge pays its side effects once;
  - an emplacement arrives at its tower's full HP each round, whatever the last clash left it (T041);
  - the arrival shield (#8, Call 30): each lane's army of 2 or more unit types arrives with shields of 20% of each unit's max HP, before the muster; emplacements neither count as a type nor take one, and a knit keeps shields in proportion;
  - `clashStart` triggers fire once, after `musterKnit` and before the clash's first tick (T026);
  - lane ends: E1 and E2 resolve on the first tick, a double wipe is drawn (E4), and the cap falls at exactly `startTick + 900` with the muster counted (#13);
  - at the cap, more surviving supply wins; a tie is drawn (E3), and so is emplacements only on both sides (E5);
  - on Twin Roots an ended lane holds still while the other fights: no moves, hits in flight dropped, clouds stopped, no heals or merges;
  - per-squad stats: a front-rank-only modifier reaches rank-0 squads only, and a knit of front and back parts takes the lowest-id parent's squad stats, with HP carried by the ratio.
- [x] T046 [US1] Compile per-squad stats in `src/sim/rounds/compile.ts` and `src/sim/rounds/effects.ts`, and allow them in data (§5.6, §14.2, §14.6) (A028, A131)
  - In `src/data/schema.ts`, allow `rank` and `onLoam` on `unit.*` stats, beside `POSITIONAL_STATS`. Make v1's `src/sim/compile.ts` skip a unit modifier carrying `rank` or `onLoam`, so v1 never applies one to every unit. v1 also skips a building modifier carrying `rank`, and a trigger whose `if` carries `rank`: S3a's review found that v1's `isPositional` doesn't know `rank`, so it would apply such a modifier to every building and ignore the condition (no data uses `rank` yet).
  - At Begin, the `rank` and `onLoam` selectors on `unit.*` stats build a tier table per squad, and units resolve their stats through `sourceBuildingId`. A unit knit from two squads takes the lowest-id parent's squad (R2-Q11).
  - Shape the table as base stats plus a list of patches per squad, so R3 adds augment and combo patches to it instead of building a second path (A131).
- [x] T043 [US1] Build Begin as `beginClash`'s clash half in `src/sim/rounds/round.ts` (new) (§4.7 steps 12–14, §5.6, §14.6) (A024, A026, A032, A047)
  - It records `bankedAtBegin` and marks every planted building fielded.
  - It compiles stats per squad (T046, above) and places the arrival: every squad's units at `formationOf`'s positions, in plot order, then j.
  - It shields each lane's army of 2 or more unit types (`balance.rounds.arrivalShield`, Call 30) before the muster, as R1's `clashshield` did in `tools/lib/clash.ts`.
  - It resolves the muster's fixed point at once and applies the trios once (Call 4).
  - It writes `RoundResult.fielded` from the units as they then stand, with their lane.
  - It emits `clashStarted`, `arrived` and `musterKnit {parts, tier, x, y}` (the view animates the 1 s from it), then fires `clashStart` triggers and enters the clash.
- [x] T044 [US1] Build the clash step in `src/sim/rounds/systems/clash.ts` (new): §14.6's clash steps 1–14 (§5.6, §6.7, §14.6) (A026, A030)
  - Muster ticks (`startTick + 1` to `+ 20`) skip targeting, movement, separation and attacks. The clock runs against `startTick + 900`.
  - A lane ends on the first tick one side has no units and no emplacements left, or at the cap on surviving supply; its lock record is stored, `laneWon` emitted, and the lane frozen.
  - When every lane has ended, the step hands over to scoring (T051).
- [x] T045 [US1] Wire the clash into `src/sim/rounds/step.ts`, which calls the copied systems in §14.6's order (§14.6)

**S7: scoring, the end of a battle and the rule scenarios**

- [x] T047 [US1] Write `tests/unit/rounds/scoring.test.ts` (new) (§6.4, §6.5, §6.7, §13.3 rule 5) (A035, A209):
  - margin 7 at a storm of 14000 bp gives floor(175 × 14000 / 10000) = 245, and with Rot Ward's 8500, 208;
  - siege counts double for damage and once at 45 s;
  - against a wiped loser the margin is the winner's whole damage supply; at 45 s it's max(0, the winner's damage supply − the loser's) (#22);
  - the cap applies to each Heartcap's sum over the lanes it lost, in each `roundDamageCap` shape;
  - the storm runs 10000 to 20000 from round 5, or from round 4 with `battle.sporestormStart` 4;
  - more applied damage wins the round, equal damage draws it, and the loser is the comeback recipient;
  - `roundWon` triggers fire once, for the round's winner only, and not after a drawn round (T026);
  - `RoundResult.damage` is capped and recorded before the HP floor;
  - a Decision follows `decision.by` (X5): `damage` sums `RoundResult.damage`, `shareOfMaxHp` compares each side's damage taken over its max HP by cross-multiplication; its tiebreaks run in order, and E8 goes to the general.
- [x] T048 [US1] Write the rule scenarios in `data/scenarios/rounds/` (new): `formation-from-plots`, `clash-cap`, `round-damage-cap`, `decision-round-9`, `lane-empty-one-side` (E1), `lane-empty-both` (E2), `cap-tie` (E3), `double-wipe` (E4), `emplacements-only-draw` (E5), `emplacement-only-win` (E6), `split-lanes` (E7, Twin Roots), `both-heartcaps-zero` (E8) and `comeback-r4` (G6) (§6.7, §16 R2 step 4)
  - Also clash-form copies of v1's `merge-trio`, `knit-cancel`, `elder-ladder`, and R4a's `unit-lineup` and `unit-lineup-twin` (R4/T009, which deletes `elder-showcase`; if X3 is no, copy `elder-showcase` instead), and `merge-under-fire` fighting enemy units rather than a hall. v1's own files stay until R2b.
- [x] T049 [US1] Write `tests/unit/rounds/scenarios.test.ts` (new). It asserts each scenario exactly: each lane's winner, the margin, the Heartcap damage and who gets the comeback gold. `clash-cap` asserts `capped` and damage = difference × 25; `round-damage-cap` exactly the cap; `decision-round-9` the winner by `decision.by`'s rule (X5); `formation-from-plots` Capguards in rank 0 ahead of the archers (§15.7 Rule scenarios, §16 R2 step 4)
- [x] T050 [US1] Build the pure scoring helpers in `src/sim/rounds/systems/victory.ts` (new): `laneDamage(margin, perSupply)`, `stormed(raw, stormBp)`, `takenMods(x, bps)`, `capFor(def, loserMaxHp, stormBp)` and `roundOutcome(damage)`, with `stormBpFor(storm, round)` for the round's storm and `decisionWinner(by, sides)` for T052's Decision (§6.4, §6.7, §13.3 rule 5)
- [x] T051 [US1] Build `scoreRound` in `src/sim/rounds/round.ts`. Per lane it takes 25 × the margin, the storm, the loser's damage-taken modifiers, then the cap on each Heartcap's sum. It emits `heartcapDamaged {side, amount, stormBp, capped}` and pushes the `RoundResult`, with per-lane damage, `damageByBuilding` and `survivorsByBuilding`, applying damage down to 0 (§6.7, §14.4, §14.6 clash step 13) (A064, A068)
- [x] T052 [US1] Build the end check and the aftermath step in `src/sim/rounds/round.ts` and `src/sim/rounds/step.ts` (§4.7 steps 18–19, §6.5, §14.6) (A035, A209)
  - A Heartcap at 0 is a Rout; both at 0 means the player loses (E8).
  - After `maxRounds`, a Decision by `decision.by`: with `damage`, the sum of `RoundResult.damage` (gross); with `shareOfMaxHp`, the smaller share of max HP lost, by cross-multiplication. Then the higher HP fraction by cross-multiplication, then the general.
  - `outcome {winner, by, round}` is set. The aftermath's step emits `battleEnded` and enters `ended`, or opens the next round, clearing units, squads, hits and clouds.

**S7b: no seat decides a clash** (the user's call, 2026-11-02)

- [x] T147 [US1] Make the order units are listed in decide nothing in a clash, in rounds' copies only (§5.2, §13.3 rule 4). S7's check found that at Begin every player unit takes a lower id than every enemy unit, the systems run units in id order, and flipping the ids flipped the winner of every mirror that wasn't level.
  - Tests first: in `tests/unit/rounds/combat.test.ts`, a mirror-image crowd gets mirror-image pushes whatever its ids, and an exact stack splits by a mirror-image rule. In `tests/unit/rounds/seats.test.ts` (new), a mirror Hammercap mono and `comeback-r4` end the same unit for unit with either side's ids first, `unit-lineup` ends with the same locks, and the mirror monos end level.
  - `separationSystem` in `src/sim/rounds/systems/movement.ts` works out every pair's push from the positions at the start of the pass and applies them together. Pushes are summed in fixed point (2^44 to a tile), so no addition order changes a sum. An exact stack splits across sides toward each unit's own side, and on one side toward each one's slot.
  - Movement steers by where other units stood at the start of the tick (`px`, `py`): a target, the idle seek's nearest enemy and the tunneler's surfacing point. This was the rest of the bias.
  - The combat-decided numbers moved for `comeback-r4`, `unit-lineup` and `unit-lineup-twin` in `scenarios.test.ts`.
  - Left for the user's call: three timers phased by a unit's id (healing's, the retarget stagger and pinning's skip), and a Burster that bursts inside the attack step. Exact mirroring is out of reach while positions are absolute floats.

**Checkpoint:** `npx vitest run tests/unit/rounds` passes, every scenario included; `npm run verify` is green with no v1 golden moved.

## Phase 4: US2 — A whole battle in rounds, headless (P1)

**Goal:** a round opens in §4.7's order, the general plans first, a bot plans after it, and `npm run sim -- --rounds` plays whole battles. **Independent test:** `npm run sim -- --rounds --seeds 1..40 --player bot:balanced --enemy general:scripted --summary`.

**S8: opening a round, the economy and the stats**

- [x] T053 [US2] Write `tests/unit/rounds/economy.test.ts` (new) (§6.2, §6.4):
  - round 1 has no income; the stipend is 100 from round 2;
  - a Cellar pays 50, and floor(50 × 1.5) = 75 on loam; the Exchange pays 12 and raises the interest cap by 10;
  - interest is min(`interestCap`, floor(bankedAtBegin / `interestPer`)), with both read from `balance.rounds` in the case: 140 banked gives 7 at 20 per (SPEC's first guess) and 14 at 10 per (R2-Q2's recommendation);
  - +40 goes to the last round's loser, and nothing after a draw;
  - `pendingGold` is paid once, then zeroed; the enemy's income is × `enemyIncomeMult`;
  - `incomePreview` equals the next round's income.
- [x] T054 [US2] Add the round-order cases to `tests/unit/rounds/rounds.test.ts` (§15.7 Rounds row): income, interest, `roundStarted {stormBp}`, `roundStart` triggers, `generalPlanned`, then the player's planning; only the colony and gold carry between rounds; every squad is fielded fresh; the last round has its aftermath, then the battle ends
- [x] T055 [US2] Build `openRound` in `src/sim/rounds/round.ts` and the economy in `src/sim/rounds/systems/economy.ts` (new), following §14.6's opening steps 1–7 (§4.7 steps 5–10, §6.2, §6.4, §14.6) (A205)
  - Clear the field and advance the round; pay income from round 2, with any `pendingGold`; set the storm and emit `roundStarted`; fire `roundStart`.
  - The general's turn (T068), an empty draft hook (Call 26), and a player-side bot's turn (T069); then enter planning.
  - Export `incomePreview(state, side)` from `src/sim/rounds/index.ts`.
- [x] T056 [US2] Write `tests/unit/rounds/stats.test.ts` (new) (§5.7) (A064, A175):
  - each stat is kept per round, and a battle's figure is their sum;
  - fielded by type, tier and count; merges by tier, at the muster and after;
  - damage by building, clouds and bursts included; each lane's result, length and survivors;
  - Heartcap damage dealt and taken after the cap and the storm; gold by source summing to the income;
  - buildings planted and sold (sold after fielding counted apart); power use; the most Elders alive at once; the most gold banked; M6-Q1's feat stats;
  - the report's gold rows add up.
- [x] T057 [US2] Build stats per round in `src/sim/rounds/stats.ts` (new) and `summarize` in `src/sim/rounds/summary.ts` (new) (§5.7, §14.4) (A064, A175)
  - The stats are §5.7's list, plus M6-Q1's: economy buildings planted, the most economy buildings on loam at once, buildings sold after fielding, each Heartcap's lowest HP fraction, and damage by unit tag in the round a Heartcap fell.
  - The summary gives round, phase, both Heartcaps, `dealt`, `roundLog`, gold, plots planted of owned, and the stats.

**S9: headless, the CLI and determinism**

- [x] T058 [US2] Write `tests/unit/asserts.test.ts` (new): parse `hash@r3=…`, `roundLog[2].lanes[0].capped=false` and `x@r2:200>=1`, beside v1's `@<tick>` (§15.2)
- [x] T059 [US2] Write `tests/unit/rounds/headless.test.ts` (new) (§14.6, §15.2) (A036):
  - `until` takes `'end'`, `{round}` and `{round, tick}`, with `tick` counted within the clash;
  - a human planning phase with no commands throws a clear error rather than looping;
  - planning and aftermath steps don't count as stalls.
- [x] T060 [US2] Build `runHeadless` in `src/sim/rounds/headless.ts` (new): it steps by phase, records hashes and summaries at Call 17's checkpoints, and catches a planning phase that never Begins (§14.6, §15.2, §15.5) (A036, A115)
- [x] T061 [US2] Extend `tools/lib/asserts.ts` with the `@r<n>` and `@r<n>:<t>` checkpoints; v1's `@<tick>` stays (§15.2)
- [x] T062 [US2] Build `runRoundBattle` in `tools/lib/rounds/run.ts` (new) and a `--rounds` switch in `tools/sim.ts` (§15.2)
  - The result has §15.2's keys: `seed`, `map`, `winner`, `by`, `rounds`, `clashTicks`, `clashTime`, `wallMs`, `finalHash`, `hashes`, `heartcap`, `dealt`, `roundLog`, `fielded`, `merges`, `goldEarned`, `counters`, `events`, `stats` and `rejectedCommands`.
  - The multi-seed summary gives each side's win rate; the median, min and max rounds; the share reaching round 9; the share of clashes at the cap; the median clash length; the mean `wallMs`; and failed asserts.
  - The options are §15.2's, without `--run` or `--meta-progress` (R2b, M6).
- [x] T063 [US2] Make `tools/golden.ts` verify and update `kind: "rounds"` replays through the rounds API with Call 17's keys, reporting the first key that diverges; v1's replays are unchanged (§15.5) (A115)
  - The tool records replays from lists in code (`REPLAYS`, `RUN_REPLAYS`). Add a `ROUND_REPLAYS` list beside them, each entry `{name, seed, player, enemy, flags, commander, powerPolicy, map}`, and teach `update()`'s unknown-file check about it (`tools/golden.ts:157`). `npm run golden -- update` writes a round golden only for a listed entry.
- [x] T064 [US2] Write `tests/unit/rounds/determinism.test.ts` (new) (§13.3, §15.5) (A206):
  - the same config and commands twice give equal hashes at every phase boundary and every 200 clash ticks;
  - a snapshot at any checkpoint or clash tick, restored and continued, gives the same final hash;
  - a round in which neither colony changed and no power fired replays the last clash exactly. It doesn't yet, so this case is `it.fails` until T149.

**S9b: a clash with no change replays the last one** (found by S9's T064, 2026-11-02; the hub places it)

- [x] T149 [US2] Make the kept systems' staggers and periodic checks count from the clash's start, in rounds' copies only, so a round in which neither colony changed and no power fired replays the last clash exactly (§7.2 X8, §13.3, A206). T064 found that rounds 3 and 4 of a battle with unchanged colonies differ: a hit lands a tick apart, at about tick 480 of the clash.
  - The checks read `state.tick` and `u.id`, and each clash starts from a later tick and a higher id: the retarget stagger (`systems/targeting.ts:37`, `:45`), the pin gate (`systems/combat.ts:52`), heals and regen (`systems/healing.ts:20`, `:21`), trio checks (`systems/merging.ts:25`) and cloud pulses (`systems/clouds.ts:32`). Count from `clash.startTick` and from the clash's first unit id instead.
  - Round 1's timings may move, so the combat-decided numbers in `scenarios.test.ts` may move, as T147's did. No golden moves if it lands before T072. Then switch T064's last case from `it.fails` to `it`. X8's readout, whether the clash replayed the last one exactly (T100), depends on it.
  - As built: the clock is `clashTick` (`world.ts`), and a unit's phase is its `arrival`, its place in the order its side's units took the field this clash (`ClashState.arrived` numbers it in `addUnit`). A per-side index, rather than one counted from the clash's first id, keeps a mirror's two sides on the same timers, so `unit-lineup` in `seats.test.ts` now ends the same unit for unit, not only with the same locks. No other place in `src/sim/rounds/` phased a check by tick or id. No asserted number in `scenarios.test.ts` or `combat.test.ts` moved; three helpers in `combat.test.ts` that found a unit's retarget or heal tick read the new phase. SPEC §5.2, §5.3 and §13.3 rule 1 say it.

**S10a: the general plans first, and the bots**

- [x] T065 [US2] Write `tests/unit/rounds/ai.test.ts` (new) for the planning turn (§7.1–§7.3, §7.9, §15.7 Planning, AI) (A043, A045, A047, A070):
  - a plan is a function of its view: two states that differ only in the player's current colony give identical commands and the same ai-stream position;
  - round 1's opener comes first, skipping what it can't afford, then weighted picks × doctrine;
  - economy is × 1.5 in rounds 1–2 and × 0.3 from round 7; the Mortar is × 2 only after a lost round, not a drawn one;
  - at most 3 Cellars, and a Rootbreaker Den only from round 4; a target out of reach is carried one round, then dropped;
  - a single battle's general buys only its listed weights (R2-Q4); it banks only what's left (#29);
  - placement: a Hall then a Nest puts the Nest behind the Hall (+3); a second Burrow lands beside the first (+2); a Cellar takes a back loam plot; offCentre is 3, 1, 1, 3 on 4 files and 2, 0, 2 on 3; a back-liner never takes the front rank while a back or third-rank plot is free; the same seed gives the same plots;
  - Twin Roots lanes (#30): the lane it lost by most, its need lowered by each squad's supply; in round 1 and on ties, the lane with less supply, then the lower lane; the Blightwright takes the lane you fielded least in; Cellars go to a lane with free loam; a full lane falls back to the other;
  - merging switches off on its swarm buildings when Slayers made up more than 25% of the supply you fielded last round (from `fielded`), and stays on at 20%;
  - `generalPlanned` fires, and `ai.plans[round]` holds the plan;
  - bots: a bot plans after the general, then queues `beginClash`; a fixed-weight bot's plan is unchanged when the general's changes; `bot:mono:<id>` fills its plots; limits read `afterRound`.
- [x] T066 [US2] Build `planningView(state, side)` in `src/sim/rounds/ai/view.ts` (new), the only thing a planner may read (§7.1, §7.2, §7.5)
  - Every side sees its own state and the round.
  - The enemy side sees the player only through `state.rounds[]` (§7.1).
  - A player-side planner also sees the general's current colony and `formationOf(state, 'enemy')`, as a player does (§7.5). Fixed-weight bots ignore that part; `bot:answer` reads it (T121).
- [x] T067 [US2] Build §7.3's scores in `src/sim/rounds/ai/formationScore.ts` (new): Call 11's back-line term, noise of ±0.5 from the side's ai stream, ties to the front rank then the lower file, building ties by id, and the lane rule reading `FieldedSquad.lane` (§7.3) (A043, A047)
- [x] T068 [US2] Build `planTurn(state, side)` in `src/sim/rounds/ai/controller.ts` (new): step 1, a due doctrine change (T099 fills it in); step 2, the buy loop with placement; step 3, the merge toggles (§7.1, §7.2, §14.6 opening steps 5 and 7) (A045, A070)
  - Its commands run at once through `planning.ts`'s executors and go to the log; then `generalPlanned`, and the plan goes in `ai.plans`.
  - The enemy plans at the opening's step 5, a player-side bot or general at step 7, which queues `beginClash`.
  - A single battle's general buys only its listed weights. `maxOwned` and `afterRound` apply, the bank reserve is 0, and a refused AI command counts in `rejectedCommands`.
- [x] T069 [US2] Build the profiles in `src/sim/rounds/ai/profiles.ts` (new): generals and bots read from `data/generals.json` and `data/bots.json`, with limits read in rounds and `fixedWeights`. `placement` is ignored, and rush and turtle are weight profiles. `bot:mono:<id>` opens with as many as its gold buys, then refills each round (§7.1, §7.2) (A044, A052)

**S10b: the general's checks, the first round golden and step 3**

- [x] T070 [US2] Write `data/scenarios/rounds/general-plans-first.json` (new) and its case in `tests/unit/rounds/scenarios.test.ts`. The general's colony and army are fixed before the player's first command, and two different player plans in that phase leave the general's plan hash-equal (§4.7, §16 R2 step 4)
- [x] T071 [US2] Add the round smoke to `tools/verify.ts`: `npm run sim -- --rounds --seeds 1..3 --player bot:balanced --enemy general:scripted --summary --assert rejectedCommands=0 --assert rounds<=9` (§15.1)
- [x] T072 [US2] Record the first round golden, `tests/golden/r2-balanced-vs-scripted-s1.replay.json` (new), a battle of rounds against a general that plans first (§15.5)
  - Add its entry to `ROUND_REPLAYS` in `tools/golden.ts` (T063), run `npm run golden -- update`, then check that `git diff --stat tests/golden/m*` shows no change.
- [x] T073 [US2] Run §16 R2 step 3 in round form and record the numbers in `docs/balance-backlog.md`: `npm run sim -- --rounds --seeds 1..40 --player bot:balanced --enemy general:scripted --summary`. It reports the median rounds, the share reaching round 9, the share of clashes at the cap, the bot's win rate and the mean wall time. Report a miss with its numbers; don't tune (§12.4, §16 R2 step 3)
  - As built: every battle ends with 0 rejected commands, the bot wins 60%, 8% of clashes reach the cap and the mean wall is 50 ms. It misses on pace: a median of 9 rounds, and 73% of battles reach round 9. That goes to S18's G4 run (T124, T125), untuned.

**Checkpoint:** T073's command ends every battle with `rejectedCommands=0`; `npm run golden -- verify` passes v1's eight replays and `r2-balanced-vs-scripted-s1`; `npm run verify` is green.

## Phase 5: US3 — Play a battle in rounds on the dev site (P1)

**Goal:** the user plays a single battle in rounds through the dev-only entry: both armies in view while planning, the clash, the aftermath and the report. No drafts (R2b), no lives (R2b), no tips or new Help (R2b, R4b). **Independent test:** on `npm run dev`, `/?scene=rounds&seed=1` plays to the report; `npx vitest run tests/browser/rounds` passes.

**S11: the entry, the loop and the parameters**

- [x] T074 [US3] Write `tests/browser/rounds/rounds.test.ts` (new), on the Vite dev server as `tests/browser/hud.test.ts` starts it (§10.2, §13.5, §15.6) (A059, A075):
  - `/?scene=rounds&seed=1&test=1` holds phase `planning` at tick 0 for 1 s with no input;
  - with the empty colony, after about 400 ms, Enter warns and a second Enter starts the clash (tick > 0); once the clash ends the phase is `aftermath`, and input opens round + 1's planning;
  - `paused=1` in planning doesn't carry into the clash;
  - with `player=bot:balanced&phase=planning` the bot's plan has run and its `beginClash` stays queued;
  - `player=bot:balanced&round=4&phase=clash&ticks=200&paused=1` gives the bridge round 4, phase `clash` and tick `clash.startTick + 200`;
  - with `player=bot:balanced`, a round past the battle's end fails with a message; with the default human player, `round=2` without `scenario` is refused with a message.
- [x] T075 [US3] Add a `scene=rounds` branch to `src/app/main.ts`, taken on every build, and an "A battle in rounds (preview)" button to `src/ui/screens/title.ts`, shown only on the dev site (`DEV_SITE` in `src/app/channel.ts`). This is X2's temporary entry (Call 2); storage keys don't change (§13.8, `.claude/rules/storage.md`)
  - The branch loads `src/app/rounds/main.ts` with a dynamic `import()`, so `src/app/rounds/**` is its own chunk and the main bundle stays inside §13.7's 300 KB.
- [x] T076 [US3] Build `startRounds` in `src/app/rounds/main.ts` (new) and the preview's parameters in `src/app/rounds/urlParams.ts` (new) (§15.6) (A059, A075)
  - The parameters: `map`, `seed`, `battleIndex`, `player`, `enemy`, `commander`, `scenario`, `round`, `phase` (`planning`, `clash`, `aftermath` or `ended`, which opens the report), `ticks` (within the clash), `paused`, `flags`, `test`, `debug`, `targeting` (`1` opens power targeting in a clash, T109), `measure` (`frames` records frame times into the bridge, T115) and `reveal` (T127).
  - The defaults (Call 28): `map=bogwater-hollow`, `battleIndex=1`, `player=human`, `enemy=general:mother-mold`, `flags=merging,adaptive,powers`, `commander=vesper`. The player's kit is the faction roster (T033). The seed is random and written into the URL. The title's button opens these defaults.
  - With `player=human`, a `round` above 1, or a `phase` other than `planning`, is refused with a message unless `scenario` is set, since a human planning phase can't be played headlessly (T059).
  - It plays earlier rounds headlessly with the controllers, stops at Call 14's checkpoint or the asked clash tick, and holds.
- [x] T077 [US3] Build the loop by phase in `src/app/rounds/loop.ts` (new), with one controller per phase in `src/app/rounds/phases/planning.ts` (new), `src/app/rounds/phases/clash.ts` (new) and `src/app/rounds/phases/aftermath.ts` (new), so the UI sessions after this one don't collide (§13.5)
  - Planning: one `step()` when the queue isn't empty, unless held; render at alpha 1.
  - Clash: the accumulator × speed, at most 12 steps a frame; pause and speed apply only here, and a pause never carries over.
  - Aftermath: no steps until the view reports done or skipped, then one `step()`.
  - The preview is recomputed only after a colony or toggle command.
  - Create `src/app/rounds/battleView.ts` (new): the canvas T081 draws into, and empty mounts for the top band, the tally, the Intent panel, the tray, inspect and the callouts. Each later UI task fills its own mount with one line, so S12, S13 and S14 each end green and S12 and S13 don't collide.
- [x] T078 [US3] Build the session on plots in `src/app/rounds/session.ts` (new) and the keys by phase in `src/app/rounds/input.ts` (new) (§10.2, §10.3) (A065)
  - Session: choose a card; the ghost snaps to a plot, or to its formation slot; plant `{buildingId, plot}`, with Shift to keep planting; X twice sells, showing the refund; M toggles; Begin, with the empty-lane two-press warning.
  - Keys follow §10.3 by phase. Begin by key needs a fresh keydown after planning opened, ignores auto-repeat and waits about 400 ms; the button is instant. Space and Enter skip the aftermath. Planning keys in a clash are refused with a callout; Esc clears the warning and cancels.
- [x] T079 [US3] Build the bridge in `src/app/rounds/bridge.ts` (new): `window.__GAME__` with `ready`, `scene`, `round`, `phase`, `tick`, `hash` (rounds' `hashState`), `summary()`, `battle()`, `preview()` and `errors` (§15.6) (A076)
  - `preview()` returns `{player, enemy}`: per side, the squads and unit positions the preview drew. It's `null` until T083 draws the preview.
  - With `measure=frames`, `frames` holds the last frame times (T115). v1 has no such field yet (A187 marks it M8's), so it lives in this bridge only.
- [x] T080 [US3] Build `roundStateForParams` in `tools/lib/rounds/params.ts` (new), matching `src/app/rounds/main.ts`'s checkpoints exactly, and teach `tools/screenshot.ts` to compare a `scene=rounds` capture's hash with it at the same round, phase and tick. The tool's `vite preview` build has the entry (Call 2), so it needs no `--dev` mode (§15.6) (A059)
- [x] T141 [US3] Add §15.6's assertions 1–3 and 5 for `scene=rounds` to `tools/screenshot.ts` (§15.6, §16 R2 step 9) (A076)
  - (1) No console or page errors.
  - (2) `__GAME__.hash` equals `roundStateForParams`'s `hashState` at the same round, phase and clash tick (T080's compare, failing the capture with both hashes).
  - (3) At least 12 distinct colors in the sampled grid, and both team tints sampled inside their own colony columns.
  - (5) It writes `artifacts/screenshots/<name>.png` and `<name>.json` with the round, phase, tick and hash.
  - Assertion 4 needs the HUD and the preview, so it lands in T143.
- [x] T081 [US3] Build the first cut of `src/render/rounds/renderer.ts` (new) from v1's renderer, without territory, capture, rally lines, turrets or spawn timers (§13.6) (A072)
  - It draws the terrain, both colonies' plots as a faint 2×2 grid, loam and stumps, Call 21's closed plots and buildings.
  - It draws units through R4a's `drawUnitSprite(g, atlas, opts)` in `src/render/unitSprite.ts` (R4/T011). If R4a hasn't landed, create `src/render/unitSprite.ts` (new) with R4a's signature by moving the body of `Renderer.drawUnit` (`src/render/renderer.ts:511`), with no pixel change, and make v1's `drawUnit` call it.

**S12: the field** (may run beside S13 and S10b)

- [x] T082 [US3] Write `tests/browser/rounds/planning.test.ts` (new) (§4.6, §5.6, §10.2, §10.4):
  - every unit's position on the clash's first tick equals one the preview drew (`battle().units` against `preview()`);
  - M on a Burrow beside another Burrow changes the slot's pips from Elder to none;
  - hovering plot F2 lights slot F2, and the other way round;
  - a chosen card lights free plots only, sampled per plot; the ghost on a stump plot gives its reason;
  - in a round scenario where the general fields a Gill Archer Nest and a Capguard Hall (T048's `formation-from-plots` can be it), with the Sporeling Burrow chosen, the archers' squad carries the strong mark (slash on light, ×1.5) and the Capguards' none (slash on medium, ×1.0), read from `preview()`.
- [x] T083 [US3] Build the formation preview in `src/render/rounds/preview.ts` (new): layer 4 in planning, drawn by `src/render/rounds/renderer.ts` (§10.2, §13.6) (A060)
  - Both sides from `formationOf`: squads dimmed inside a faint slot outline, each with its merge preview (pips through R4a's `drawPips(g, atlas, cx, y, tier)`, then the count of base units left) from `mergePreview`.
  - Cached by colony and toggles. Hovering a plot lights its slot and the other way round; the ghost's squad shows in its slot through `formationOf(…, change)`.
  - On Twin Roots, one preview per lane. Color-blind team marks sit under preview units.
  - It records what it drew, per side, for the bridge's `preview()` (T079).
- [x] T142 [US3] Write `tests/unit/rounds/matchups.test.ts` (new) first (§5.3, §10.4, §11.1 `effectiveness`) (A060, A069)
  - From `data/balance.json`'s matrix: a Sporeling's slash on a Gill Archer is strong (×1.5), on a Capguard normal (×1.0) and on an Amanita Knight weak (×0.5); a Hammercap's crush on an Amanita Knight is strong (×1.5).
  - A slayer's hit (the Veilstalker's) on a Bloomed unit is strong (×3.0 tag multiplier); on a base-tier unit it follows the matrix.
  - Merge-perk resistances never change a class (§5.3).
  - Within a squad that fields as 2 Bloomed and 2 base, the classes per tier can differ (Call 22).
- [x] T084 [US3] Build `matchupClass` in `src/sim/rounds/matchups.ts` (new), export it from `src/sim/rounds/index.ts`, and draw basic marks over enemy slots in `src/render/rounds/preview.ts` (§5.3, §10.2, §10.4, §11.1 `effectiveness`) (A060, A069)
  - `matchupClass` follows `classify`'s rule (`src/sim/systems/combat.ts:247`) on the matrix and tag multipliers, with `balance.effectiveness`'s `strongAtLeast` 1.5 and `weakAtMost` 0.75, and the post-matrix rules, without merge-perk resistances. R4b extends this module (it finds it with `grep -rn matchupClass src/sim`).
  - Marks show while a card is chosen or one of your squads is hovered: strong at ×1.5 or more, weak at ×0.75 or less, none for normal.
  - Each squad gets Call 22's two marks. The reverse direction and the card's own marks wait for R4b.
- [x] T085 [US3] Build the aftermath in `src/render/rounds/aftermath.ts` (new), from the `RoundResult` in state (§10.2, §13.6) (A061, A078)
  - The winners' survivors surge into the loser's Heartcap and burst; at the cap the loser's wilt; a drawn lane's survivors wilt. The number rises over the Heartcap with the storm and "capped" beside it.
  - About 3 s at 1×, at the clash's speed, with no pause. Under reduced motion it's a fade of 120 ms or less. Under `?test=1` it jumps to its final frame (Call 15).
  - At a battle's end the field holds about 1 s on the fallen Heartcap.
- [x] T086 [US3] Add the field's details to `src/render/rounds/renderer.ts`: a "New" sprout on buildings planted this round (in planning), the merge-off knot, arrival puffs on `arrived`, coin pops on `income`, the storm haze from `state.sporestorm`, and F3 debug showing plots, the formation box, slots, aggro radii and ids (§10.2, §10.3, §13.6)
  - In a clash, emplacements draw through R4a's `emplacementSprite(content, buildingId)` (R4/T029): `e-<id>` if the sprite exists, else the building's sprite. If R4a hasn't landed, draw the building's sprite at the emplacement's slot.

**S13: the top band and the Intent panel** (may run beside S12 and S10b)

- [x] T087 [US3] Write `tests/browser/rounds/hud.test.ts` (new) and `tests/unit/rounds/teachingText.test.ts` (new) (§10.2, §6.2, §6.4) (A063, A064):
  - both Heartcaps frame the band, and the chips stay clear of their labels at 1280×720, 1366×768 and 1440×900;
  - `#hud-gold`, `#hud-plots`, `#hud-round` and `#hud-storm` agree with `summary()`, and there's no `#hud-lives` in a single battle;
  - the tally's past pips match `rounds[].damage`, the current pip is outlined, and "dealt" is their sum;
  - in a clash the tug's numbers equal `survivingSupply` per lane, and `split-lanes` shows halves;
  - the Intent panel lists this round's planted and sold buildings and has no countdown;
  - the gold tip's rows add up to the chip's +N, holding 140 shows its interest, and the storm tip lists ×1.2 to ×2.0 from round 5.
- [x] T088 [US3] Build the top band in `src/ui/rounds/hud/top.ts` (new) (§10.2)
  - Both Heartcaps: the display value holds at the round's starting HP until the aftermath drains it, and turns danger red below a third.
  - The chips: gold with `incomePreview`'s figure, plots planted of open plots, the round of 9 with the clash clock (glowing in the cap's last 5 s), and the storm, unlit at ×1.0 and lilac from round 5. They keep v1's tightening fit and stable ids.
  - Mount it in `src/app/rounds/battleView.ts`'s top-band mount (T077). T089 and T091 fill the tally's and the Intent panel's mounts the same way, so T087's browser cases pass at the end of S13.
- [x] T089 [US3] Build `RoundTally` and `LaneTug` in `src/ui/rounds/hud/tally.ts` (new) (§10.2, §6.7) (A064)
  - Pips are violet, ash, a dash or hollow, with lane halves on Twin Roots, and dealt and taken under the ends. A past pip's tooltip gives each lane's result and survivors, the damage both ways and your top squads (`damageByBuilding`).
  - The tug shows `survivingSupply` per lane, locks with the lane's result, goes neutral when drawn, and hatches the Rot's half under the color-blind assist.
- [x] T090 [US3] Build the chip tooltips in `src/ui/rounds/hud/explain.ts` (new): gold, plots, round and storm as §10.2 words them, computed from the sim's functions; `I` focuses the gold chip, Tab moves along the band, Esc closes (§10.2)
- [x] T091 [US3] Build the Intent panel in `src/ui/rounds/doctrine.ts` (new) and `src/ui/rounds/hud/top.ts`, read from `ai.plans[round]`: the portrait at 48 px, the name and doctrine, its income this round and the gold it banked, and the buildings it planted and sold. It has no countdown and truncates long lists; its tooltip gives the passive and the kit (§7.5, §10.2) (A070)

**S14: the tray, inspect, the planning and clash chrome, and the report**

- [x] T092 [US3] Write `tests/browser/rounds/inspect.test.ts` (new) and `tests/unit/rounds/report.test.ts` (new) (§4.4, §10.2, §10.4) (A068, A071):
  - the tray's price is `priceOf` on any free plot, and a card is unlit only when gold is short;
  - selling takes two presses and refunds the full price in the planting phase, 60% after a clash; Enter's Begin doesn't fire a focused inspector button;
  - Begin sits in the bottom band, the planning hint is in `#callouts`, and the speed control shows only in a clash;
  - with an empty colony against the scripted general, Begin warns and reads "Begin anyway", a second press starts the clash, and planting clears the warning;
  - the result banner stays pinned through the aftermath;
  - the report's round chart has one column per round equal to `rounds[].damage`, with lane half-pips on Twin Roots; its gold rows add up; the outcome text reads right for a Rout in round 6 and a Decision after round 9.
- [x] T093 [US3] Build the tray in `src/ui/rounds/hud/tray.ts` (new) (§10.2, §4.4)
  - The price is `priceOf`. An army card shows its squad (the unit and "×N"), an economy card what it earns a round. Each card carries `data-building="<id>"` for tests and captures.
  - A card you can't afford is unlit with "need N". In a clash the tray takes no clicks, but its tooltips open.
  - The tooltip gives the squad and unit stats, strong vs, weak vs and armor, merge perks, and an economy card's rounds to pay for itself. There are no copies to show (D45).
  - Mount it in `src/app/rounds/battleView.ts`'s tray mount; T094 fills the inspect mount the same way.
- [x] T094 [US3] Build inspect in `src/ui/rounds/inspect.ts` (new) (§10.2, §10.4) (A064)
  - A building shows its squad and merge preview in words, its plot (rank, file, loam), its squad's damage and survivors in the current or last clash, the gold it produced, the merge toggle and its sell value. The general's buildings show the same without buttons.
  - A unit shows its tier, HP, armor and damage type with hints, its DPS over 5 s and its kills.
- [x] T095 [US3] Build the planning and clash chrome in `src/app/rounds/battleView.ts` (T077's), `src/app/rounds/phases/planning.ts`, `src/app/rounds/phases/clash.ts` and `src/ui/rounds/callouts.ts` (new) (§10.2, §10.3) (A071)
  - Planning: Begin is the one primary button, with a Space keycap. The planning hint is pinned: the round, your gold and "plan, then press Begin" ("place your opener" in round 1; in round 9, the last round and who leads on the Decision, by `decision.by`). The empty-lane warning reads "Begin anyway".
  - Clash: the speed control replaces Begin and the tray stops taking clicks. The muster's knits glow and the clash clock runs on the round chip. Twin Roots lane-end callouts ("Lane won · 9 supply left", "Lane lost", "Lane drawn"); "Paused" pinned; Help and settings pause a clash.
  - Callout priority: a counter moment, then a lane result, a refused key, tips, an Elder, other news. The result banner is pinned through the aftermath.
- [x] T096 [US3] Build the report by round in `src/ui/rounds/report.ts` (new), for a single battle (§10.4, §10.5) (A068)
  - It names the outcome and how it was decided.
  - The round chart: damage dealt up in violet, taken down in ash, each Heartcap's HP as a line, storm rounds marked, lane half-pips on Twin Roots.
  - Also damage by building over the battle, units fielded and merged from `fielded`, gold by source, the general's counters by round, and a slot for the planning seconds, which the app passes in (T128).
  - It has no lives line (R2b). Its buttons are Again (same seed) and Rematch (new seed), both reopening `scene=rounds` with the same parameters.
- [x] T097 [US3] Wire the three phase views into `src/app/rounds/battleView.ts`: planning, clash and aftermath, each switching its chrome on and off. The aftermath holds while Help or settings is open, and the speed control stays live there, without pause. The bands and panels are already mounted (T088–T094), and Space, Enter or a click already skip the aftermath (T078) (§10.2, §13.5) (A078)
- [x] T143 [US3] Add §15.6's assertion 4 for `scene=rounds` to `tools/screenshot.ts` (§15.6, §16 R2 step 9) (A076)
  - `#hud-gold`, `#hud-plots`, `#hud-round` and both Heartcap values equal `summary()`, and there's no `#hud-lives`.
  - With `phase=planning`, `preview().enemy` equals Node's `formationOf(state, 'enemy')` from `roundStateForParams`, unit for unit: the general's whole colony and formation are drawn before the player's first command (§7.5, §10.2).
  - Run it on T135's captures; a mismatch fails the capture with both values.

**Checkpoint:** `npm run test:browser` is green, v1's suite and `tests/browser/rounds/` alike; on `npm run dev`, `/?scene=rounds&seed=1` plays a battle from round 1's planning to the report; `npm run verify` is green.

**S14b: the rough playtest** (the user, on the dev site, once S14's PR is merged and deployed; R2-Q25, agreed 2026-11-01)

- [x] T145 [USER] The rough playtest. The user plays two or three battles at `https://swalliso.github.io/Sambattler/dev/?scene=rounds`, as S14 leaves them, and answers §16 R2 gate questions 1, 2, 3 and 6 in rough form, plus one more: is anything about the loop wrong enough to change S15–S20? It tests the core bet, planning with the general's army in view and then watching both whole armies clash, before the counter cycle, the power, the round tools and the polish are built (§16 R2 step 10, R2-Q25)
  - Tell the user first what isn't in yet: the general doesn't adapt (S15), there's no commander power (S16), Twin Roots has no replays and the bench isn't in round form (S17), there are no round guardrails (S18), and there's no "last fielded" view (S19). Help still describes v1, and the preview plays no battle sounds.
  - It isn't a gate on numbers. A balance miss is written down for S18 and S21, not tuned here.
  - As built (2026-11-02): the user played `?scene=rounds` on the dev site. Their answers to questions 1, 2, 3 and 6, and to whether S15–S20 change, are in `docs/playtest-feedback.md`: the core loop works, and nothing needs a dramatic change. Once the colony was full the late rounds ran empty, which went to S18 (T124, T125) and SPEC §18.2 #67.
- [x] T146 Write the rough playtest down: the answers in `docs/playtest-feedback.md`, newest first, and one line in `docs/status.md`. Agree with the user what, if anything, changes in S15–S20, and edit those tasks in this file in the same PR (R2-Q25, CLAUDE.md "Where things get written down")
  - As built (2026-11-02): the notes are in `docs/playtest-feedback.md` and a line is in `docs/status.md`. The user agreed three changes. SPEC §18.2 #67 asks what gold does once the colony is full, with an **Open:** line in §6.1. S18's T124 and T125 take a pace retune, if G4 misses, and its Sessions row says so. R3's Read first points its S0 to the builds note. Nothing else in S15–S20 changed, and the grid stays as it is.

**Checkpoint:** the notes are in `docs/playtest-feedback.md`, and the user has said S15 and S16 may start, as planned or with the changes T146 wrote in (2026-11-02: they started beside S14b).

## Phase 6: US4 — The general adapts by rounds (P2)

**Goal:** the counter cycle runs at rounds 4 and 7 (the boss also at 3), reads only the fielded record, and lands as buildings you see before you plan. **Independent test:** `npm run sim -- --rounds --seeds 4..5 --player bot:mono:sporelingBurrow --enemy general:mother-mold --flags merging,adaptive --summary --assert counters[0].round=4`.

**S15: the counter cycle, intel in a single battle, and X8's readouts**

- [x] T098 [US4] Add the counter-cycle cases to `tests/unit/rounds/ai.test.ts` (§7.4, §7.6, §15.7 AI) (A041, A051, A055, A056):
  - cycles at rounds 4 and 7, the boss also at 3, stored as `{round, from}`;
  - from hand-built records: Amanita reads Armor, Capguard Line, Sporelings Swarm, Gill Archers Ranged (#14);
  - eliteShare counts Elder units only, at their parts' base supply, with no swarm read (R2-Q3);
  - `bot:balanced`'s round-4 colony with default toggles doesn't read Elite;
  - ties go Elite, Armor, Line, Ranged, Swarm (Ranged's place is #14's first guess); rounds with nothing fielded pass;
  - activation is ×3 on the set and ×0.6 on the rest, in the same phase (#31);
  - a missing answer adds the cheapest roster counter that beats the dominant armor; no `swarm` unit is in the Anti-Swarm or Anti-Line set, and no unit without damage is in any set; Mold's Anti-Swarm activation adds a non-swarm card;
  - with fewer than 2 free plots it sells up to 2 spawners outside the set, worst against the dominant armor, rearmost first, then the lower file, then the id, at 60%;
  - `generalPlanned.counter` and `ai.plans[round].counter` are set, and the state survives a snapshot round trip;
  - with `config.intel` set, the opening doctrine is ×2 and ×0.8 until the first activation, and the boss's dual doctrine is ×2.5 for the whole battle.
- [x] T099 [US4] Build the counter cycle in `src/sim/rounds/ai/counter.ts` (new), called from `planTurn`'s step 1 in `src/sim/rounds/ai/controller.ts` (§7.2, §7.4, §7.6) (A041, A051, A055, A056)
  - The parts: the schedule, `analyzeFielded` (R2-Q3's reading), the scores with noise of ±0.03, activation, the missing answer, selling for room, and a record by round.
  - Also the opening doctrine from `config.intel` and the boss's dual doctrine. A single battle carries no intel unless a test sets it; R2-Q18's opener swap is R2b's.
  - The Anti-Ranged kind (#14): it scores `rangedShare`, with `swarm` spawners as its set.
- [x] T100 [US4] Add X8's readouts to `tools/lib/rounds/run.ts`'s summary: per round, the general's banked gold, its free plots, what it planted and sold, and whether the clash replayed the last one exactly; and, on both sides, each side's free open plots and the gold it banked at Begin per round, and the first round its colony has no free open plot (§7.2) (A049, A206)
  - The player's side was added after the rough playtest (the user, 2026-11-02): the late rounds felt empty once the colony was full, and these numbers feed S18's pace call and S21.
- [x] T101 [US4] Add X8's two default-off knobs to `balance.rounds.ai` in `data/balance.json` (`leanToLastAnswer`, a light lean from round 2 toward the answer to last round's army; `replaceWhenFull`, which sells its lowest-weighted fielded spawner at 60% for a heavier card when the colony is full). Read both in `src/sim/rounds/ai/controller.ts`, with a case each in `tests/unit/rounds/ai.test.ts` (§7.2, §12.4) (A049)
  - Add its entry to `data/CHANGELOG-balance.md` in this PR. `balance.rounds` stays out of v1's library (Call 27), so v1's goldens don't move; if the round goldens move, refresh them with `npm run golden -- update` and say so in the commit.
- [x] T102 [US4] Show counters in `src/ui/rounds/doctrine.ts` and `src/app/rounds/phases/planning.ts`: "Countering SWARM" and "New: Capguard Hall" in the Intent panel, a counter callout in the activation round, and round 1's "The Gray Rot remembers your SWARM" when intel is set (§7.4, §7.5, §10.2)
- [x] T103 [US4] Add the adaptive round smoke to `tools/verify.ts`: `npm run sim -- --rounds --seeds 4..5 --player bot:mono:sporelingBurrow --enemy general:mother-mold --flags merging,adaptive --summary --assert rejectedCommands=0 --assert counters[0].round=4`, with `counters[0].kind` asserted as T098's cases read that army (R2-Q3) (§15.1, §7.4)
  - As built: `counters[0].kind=elite`. The mono Sporelings knit mostly into Elders (an Elite score of 0.90 against Swarm's 0.63 on both seeds), and Mold adds the Veilstalker Hollow as the missing answer.

**Checkpoint:** the independent test passes; `npm run verify` is green; X8's readouts for 40 seeds against Mold and the Baron are in `docs/balance-backlog.md`.

## Phase 7: US5 — The commander power once per clash (P2)

**Goal:** a power fires at most once per clash, from the muster's first tick, on units and emplacements, and never in planning or the aftermath. **Independent test:** `npx vitest run tests/unit/rounds/powers.test.ts` and US5's sim command.

**S16: powers in rounds** (may run beside S15)

- [x] T104 [US5] Write `tests/unit/rounds/powers.test.ts` (new) (§6.6, §11.10, §14.5) (A030, A046, A053):
  - a power is refused in planning, the aftermath and `ended`;
  - it fires on the clash's first tick, during the muster, and hits the merged units (#25);
  - a second use in the same clash is refused, and nothing carries to the next clash;
  - aimed at an ended lane, it's refused with "this lane's clash is over";
  - Spore Burst's 90 crush within 2 tiles hits emplacements and never buildings; Puppet Bloom merges every trio within 3 tiles at once;
  - a power that kills a side's last units ends the lane;
  - a power still queued when the clash ends is dropped, not counted as rejected;
  - Rhizome Tithe is refused with `notInRoundsYet`;
  - the auto policy is deterministic and thinks every 20 ticks of the clash clock from its first tick;
  - Cordis's merge radius of 2.0 widens the muster's reach, and its knit-time bonus acts only after the muster.
- [x] T105 [US5] Build powers in `src/sim/rounds/powers.ts` (new) (§6.6, §11.10, §14.5) (A046, A053)
  - `powerUsed` resets at the arrival, and the refusals are T104's. Burst and Bloom keep their effects. The Tithe is a stand-in (Call 19). Clash commands still queued when a clash ends are dropped (Call 9).
  - The auto policy: Burst fires at the best point worth at least 180 damage, emplacements included; Bloom at 2 or more trios, or one blocked.
- [x] T106 [US5] Wire powers into `src/sim/rounds/step.ts` (clash steps 2 and 4) and `src/sim/rounds/round.ts` (the arrival's reset) (§14.6)
- [x] T107 [US5] Measure R2-Q7: Puppet Bloom's trios available per clash for Cordis's starter kits, over 40 seeds against Mold and the Baron, with `npm run sim -- --rounds --commander cordis --power-policy auto`. Record the median in `docs/balance-backlog.md` beside R1's (0 at 300 and 600 gold, 1 from 900), with the recommendation for R2b's knit content if it's below 1 (§11.10, §12.4) (A057, A096)
- [x] T108 [US5] Write `tests/browser/rounds/commanders.test.ts` (new): Q aims during a paused muster and fires on the next tick; the button then shows "used this clash"; Q again is refused with a callout; the next clash allows it again; no tooltip mentions a cooldown (§6.6, §10.2, §10.3)
- [x] T109 [US5] Build the power's controls in `src/app/rounds/battleView.ts` and `src/app/rounds/phases/clash.ts`: Ready, Aiming, Next tick, Used this clash, and unlit outside a clash. The reticle previews Burst's targets and damage, and Bloom's trios. Q is refused outside a clash or once spent (§6.6, §10.2, §10.3)
- [x] T110 [US5] Add the power smokes to `tools/verify.ts`: Vesper with `--assert stats.player.powerUses>=1`, and Cordis with `--assert stats.player.powerMerges>=1` on a seed where T107 found trios. If no seed in 40 has one, Cordis's smoke waits for R2b's v2 job (R2-Q7), and T104's Bloom case covers the power. Armilla's round smoke is R2b's (§15.1)
- [x] T111 [US5] Record `tests/golden/r2-vesper-power-s3.replay.json` (new) and `tests/golden/r2-cordis-power-s3.replay.json` (new); Armilla's replay is R2b's (§15.5)
  - Add both entries to `ROUND_REPLAYS` in `tools/golden.ts`, run `npm run golden -- update`, then check that `git diff --stat tests/golden/m*` shows no change.
  - As built (S17): `r2-twin-roots-balanced-vs-scripted-s3` (`bot:balanced` against the scripted general on Twin Roots; the lanes split in 6 of its 8 rounds) and `r2-merge-mirror-s3` (`bot:balanced` against `bot:balanced-nomerge`), each with merging on and the adaptive general and powers off. No other golden moved.

**Checkpoint:** T104's tests and T110's smokes pass; `npm run golden -- verify` passes; `npm run test:browser` is green.

## Phase 8: US6 — Round-form tools and battle-level guardrails (P2)

**Goal:** the goldens, the bench, the balance and experiment tools and the battle-level guardrails (G1–G8, G11, G12, G13, G16) run on single battles in rounds, beside v1's, and a bot that buys the answer to what it sees (X7) reads the full reveal's risk. **Independent test:** `npm run golden -- verify`, `npm run bench -- --rounds`, `npx vitest run tests/slow/rounds`, and US6's `bot:answer` command.

**S17: goldens, the bench and the balance tools**

- [x] T148 [US6] Add a Burster mirror to `tests/unit/rounds/seats.test.ts`, played with each side's ids first. A Burster's strike lands at once inside the attack step, so it may fell a unit later in the list before that unit attacks. If the mirror differs by seat, report it before changing any rule (§5.3, T147; #82's review, 2026-11-02)
  - As built (S17): the mirror Burster mono differs by seat. Whichever side's ids come first bursts first (clash tick 56), fells the other's Bursters before they burst, and wins the lane 4–0 at tick 60, 100 Heartcap damage. Bursters behind a Sporeling front end the same either way. No rule changed: the case is an `it.fails` until the user's call.
- [x] T112 [US6] Record `tests/golden/r2-twin-roots-<what>-s<seed>.replay.json` (new; Twin Roots, each lane its own clash) and `tests/golden/r2-merge-mirror-s3.replay.json` (new; the merge mirror, knitting at the muster), each pinning its flags (§15.5) (A115)
  - Add both entries to `ROUND_REPLAYS` in `tools/golden.ts`, run `npm run golden -- update`, then check that `git diff --stat tests/golden/m*` shows no change.
  - As built (S17): `r2-twin-roots-balanced-vs-scripted-s3` (`bot:balanced` against the scripted general on Twin Roots; the lanes split in 6 of its 8 rounds) and `r2-merge-mirror-s3` (`bot:balanced` against `bot:balanced-nomerge`), each with merging on and the adaptive general and powers off. No other golden moved.
- [x] T113 [US6] Write `tests/slow/rounds/perf.test.ts` (new). It asserts G11's round budgets: arrival ≤ 5 ms, the general's planning turn ≤ 20 ms, one battle of rounds with bots on both sides ≤ 3 s, and a tick mean ≤ 1.0 ms and p99 ≤ 2.5 ms at 300 live units. It also asserts the sim part of a planning command under its Node budget, and peak units ≥ 300 (§13.7, §15.4) (A113)
- [x] T114 [US6] Build `tools/lib/rounds/bench.ts` (new) and a `--rounds` switch in `tools/bench.ts`, with Call 24's cases (§13.7, §15.4) (A112, A113, A119, A200)
  - The cases: R1's full-colony clash on the round loop, its arrival tick timed; bench-300 as `data/scenarios/rounds/bench-300.json` (new); the general's planning turn; one full battle.
  - The output: mean, p95 and p99 per tick, peak units, heap growth, first-tick ms and general-turn ms. A full colony's live units at the arrival are checked against §13.7's budget of at most 150 a side (R1-Q5, #7).
  - As built (S17):
    - bench-300 is 150 units a side on test-3lane in blocks of 50 a lane, Gill Archers behind, merging off. Every lane holds level to the 900-tick cap, which `scenarios.test.ts` asserts. The bench plays fresh clashes until it has timed `benchTicks` fighting ticks, leaves the muster's ticks untimed, and weights each tick by the live units it began with.
    - The full colony on the round loop: 12 plots of the Burrow's 8 on one lane (96 units a side), and 15 on Twin Roots (120), since one of its 16 open plots is a stump in the front rank, so not §13.7's 128.
    - The general's turn is timed from round 2 on, against the scripted general, Mold and the Baron: on a copy at each aftermath, with the player's AI taken off. Round 1's runs inside `createBattle`.
    - The sim part of a planning command has a Node budget of 2 ms, half the whole command's 4 ms in Chromium. It and the arrival's and the turn's budgets sit in `ROUND_BUDGETS` until T119 writes G11's round form.
- [x] T115 [US6] Write the Chromium checks in `tests/browser/rounds/perf.test.ts` (new), on a Vite dev server as `tests/browser/frame.test.ts` starts one (§13.7) (A113)
  - A plant and the preview update it causes take ≤ 4 ms, timed in the page.
  - `scene=rounds&scenario=bench-300&phase=clash&measure=frames` keeps the render frame at 300 units ≤ 8 ms, read from the bridge's `frames` (T079).
  - As built (S17): each budget reads a statistic that one slow frame can't decide.
    - **The plant:** the median of five plants' worst frames, from the click until the building stands. The bridge's live state stages the gold. Locally that median is 0.5–0.7 ms.
    - **bench-300:** the p95 of the 45 frames after the clash's first fighting tick, at 300 live units, as §16 M8 words the render budget. Locally the p95 is 2.6–3.4 ms and the median 0.6–0.7 ms.
    - **On CI:** §13.7's budgets hold off CI, on a real machine. CI's shared runner, with the other browser files running beside it, took about three times as long on the frames that run a tick: #102's p95 was 9.6 and 10.6 ms, with medians of 1.4 and 1.9 ms. So under `process.env.CI` each check holds a regression guard of 3× its budget, 12 ms and 24 ms. Each message names the bound that applied, and the readings go to stdout on a pass too.
    - **The first fighting tick:** it runs the clash's systems in the page for the first time, cold. Its frame took 4.8–11.4 ms over seven runs, over 8 ms in five. It's reported in `docs/balance-backlog.md`, not held by the test.
- [x] T116 [US6] Build the balance tools in round form in `tools/lib/rounds/balance.ts` (new), behind `--rounds` in `tools/balance.ts` (§12.2, §15.3)
  - `playRoundClash(content, job)`: it turns an `Army` and its slots from R1's `armyFromBot` and `assignSlots` (R1/T012, R1/T014) into a round-scenario colony (`createFromScenario`, T029), queues the player's `beginClash`, runs `runHeadless(state, { until: { round: 1 } })` and reads `state.rounds[0]`. G1's squad duels, G12's clash rows and G16's swaps use it, never R1's `playClash`, which plays on v1's sim (§12.2: from R2 every tool measures the real loop).
  - `duel`: squad duels (G1: equal gold on one building type a side, in formation by role, one round clash through `playRoundClash`) and supply duels (G2, with placed units).
  - `tournament`: the four bots against the scripted general, giving win rates, the median rounds, the share reaching round 9, the share of clashes at the cap, the median clash length, and how often the lead changes hands.
  - As built (S17):
    - `playRoundClash` gives each side the slots R1's `assignSlots` picks among the plots it can build on. Twin Roots' front rank has a stump plot on each side, in different lanes, so the same army stands differently on the two sides and its mirrors aren't level, by the map's design.
    - On the one-lane field, 100 mirrors of `bot:balanced`'s army (5 budgets × 20 seeds) without Bursters drew 58 of 63. The other 5 all field Rhizomorph Tunnels, 2 won by the player and 3 by the enemy. Those with Bursters went 13 to the player, 6 to the enemy, with 18 drawn: T148's seat effect.
    - Squad duels play on the one-lane field, each side's value being the gold it has left on the field, scaled to the budget. Supply duels place their units on it and fight one clash, to a wipe or the 45 s cap, where v1's fought for 180 s. `npm run balance -- duel --rounds` prints both matrices and their readings, with no verdict until T123.
    - The tournament reads the lead after each round by the share of max HP left, as a Decision does.
- [x] T117 [US6] Add `--rounds` to `tools/experiment.ts` and a `rounds` job kind to `tools/lib/pool.ts`, so round battles play in worker threads with the same results as in process. This session wires `duels` and `g4`; T123 wires the rest. `engagement`, `runs`, `lanes` and `spread` stay v1's until R2b (§12.2, §15.3)
  - As built (S17): a round job is a battle, a clash or a supply duel (`playRoundJob`). `--rounds` defaults to `duels` and `g4` and refuses the other checks. Its reports on 6 workers and on 1 came out equal. The first `g4` reading is in `docs/balance-backlog.md`.
- [x] T118 [US6] Add `npm run bench -- --rounds --quick` to `tools/verify.ts` (§15.1)
  - As built (S17): under `process.env.CI` the round bench holds its timings to a guard of 3× each budget, and names it on each PASS or FAIL line. That covers the tick mean and p99, the arrival, the general's turn, the planning command and the full battle. On CI's runner the quick bench's tick p99 read 2.06 ms, where this machine's reads 0.97. Peak units and the full colony are counts, so they stay exact. v1's bench is as it was.

**S18: the guardrails in round form**

- [x] T119 [US6] Add a `rounds` block to `data/balance-targets.json` and to `BalanceTargetsSchema` in `src/data/schema.ts`, with §12.3's numbers; v1's blocks stay (§12.3) ⛔ #35 (A107, A108)
  - G1 {seeds, goldBudget, maxPairingWinShare 0.8, clearLossRatio 1.3}; G3 {seeds 50, maxMeanWinRate 0.55, maxMapWinRate 0.60}.
  - G4 {seeds 40, medianMinRounds 6, medianMaxRounds 8, maxRound9Share 0.15, botWinMin 0.3, botWinMax 0.7}.
  - G5 {bonusGold 150, 0.55–0.75}; G6 {scenario `comeback-r4`, equal max HP, both seats, minBehindWinRate 0.2, maxBehindWinRate per #35, winnerHitShare 0.5}.
  - G7 {Slayer share 0.25 read from `fielded`}; G8 {general lichen-baron, minDrop 0.2, balanced band per #35}; G11 (round form).
  - G12 {screenSeeds, confirmSeeds, top 3, minBuildMean 0.4, minAnswerRate 0.6}; G13 {maxCappedShare 0.15, clashSeconds [20, 40]}; G16 {minWinRate 0.6, pairs `roleSplit`}.
  - As built (S18): the battle-level bands hold §12.3's first guesses until T125, G6's upper bound the first guess's 45%. G2 keeps v1's block (Kept, §12.3). G6 names its bot (`balanced`, in both seats), G8 its `policies` (`balanced`, `answer`), G7's Slayer check `slayer-rounds` and its merge-off twin (T123), and G16 10 seeds at the five budgets. G11's round form holds S17's `ROUND_BUDGETS`, which `tools/lib/rounds/bench.ts`, `tools/bench.ts` and `tests/slow/rounds/perf.test.ts` now read from it.
- [x] T120 [US6] Add the answer bot's case to `tests/unit/rounds/ai.test.ts`: shown a general army of mono Sporelings, `bot:answer` plants a Capguard Hall when its kit has one, and its plan follows the general's this round, not last round's (§7.1, §12.2, §18.2 #34) (A198)
- [x] T121 [US6] Build the answer policy in `src/sim/rounds/ai/answer.ts` (new), with `bot:answer` in `data/bots.json` and an optional `policy` in `BotSchema` (`src/data/schema.ts`) (§12.2, §18.2 #34) (A198)
  - It plans after the general, as every player-side bot does, and reads the general's current colony through `planningView` (T066). It scores each kit card by its unit's `matchupClass` (T084) against the general's planned squads, weighted by their supply, and leans ×3 toward the best.
  - G8 reports under both policies (T123); G3 and G12 stay on fixed weights.
  - Add the new bot's entry to `data/CHANGELOG-balance.md` in this PR. A new bot reaches no v1 state, so no golden moves.
  - As built (S18): `bot:answer` is `bot:balanced` with `policy: "answer"`, so the lean is the only difference. `bestAnswer` scores each card the bot may buy now by its unit's hits on the general's planned squads (strong 1, normal 0, weak −1, by supply; an emplacement weighs nothing) and leans × 3 on the best. A tie goes to the card the squads' own hits are weakest on, then the heavier weight, then by id: on hits alone, Sporelings tie Capguards against mono Sporelings. `matchupClass` takes a `ClassSource` (a state, or a view's units and thresholds), and `planningView` carries `strongAt` and `weakAt`. Against three Sporeling Burrows with 730 gold in round 2, seeds 1–5, it planted 13 Capguard Halls to `bot:balanced`'s 3. No golden moved.
- [ ] T122 [US6] Write the guardrail tests in `tests/slow/rounds/duels.test.ts` (new), `tests/slow/rounds/battles.test.ts` (new), `tests/slow/rounds/counters.test.ts` (new) and `tests/slow/rounds/formation.test.ts` (new). They assert G1–G8, G12, G13 and G16 from `rounds` targets. G3 and G12 cells play on the worker pool, and timeouts per file come from measured runtimes; v1's `tests/slow/guardrails.test.ts` stays as it is (§12.3) (A102)
- [ ] T123 [US6] Build the evaluators in `tools/lib/rounds/balance.ts` (§12.3, §7.3) ⛔ #35 (A107, A108, A120)
  - `evaluateG1` (squad duels through `playRoundClash`) and G2.
  - G3 (round battles, 50 a seat on each run-pool map).
  - G4; G5; G6 (`comeback-r4` with equal max HP in both seats, and the winner's hit share in G4's games).
  - G7 (the Slayer share read from `fielded`): add a `slayer-rounds` bot to `data/bots.json`, tuned to about 25% of fielded supply, rather than retuning `slayer`, so v1's G7 reading in `tests/slow/guardrails.test.ts` doesn't change. Add its `data/CHANGELOG-balance.md` entry in this PR.
  - G8 (adaptive against off; `bot:balanced` at battle index 1, and `bot:answer` beside it).
  - G12 (the strict bar on round battles: every clash through `playRoundClash` or a whole round battle, never R1's `playClash`); G13 (the capped share over G4's games and the median clash length).
  - G16 (role-split pairs through `playRoundClash`, swapping ranks 0 and 1 with any third rank left in place, a column per budget).
  - Wire them into `tools/experiment.ts`'s `--rounds` checks (`g3`, `g5`–`g8`, `g11`, `counters` for G12, and a new `formation` check for G16) and into `npm run balance -- guardrails --rounds` in `tools/balance.ts`.
- [ ] T124 [US6] Run `npx vitest run tests/slow/rounds` and `npm run balance -- guardrails --rounds`, and `npm run sim -- --rounds --seeds 1..40 --player bot:answer --enemy general:lichen-baron --flags merging,adaptive --summary` beside `bot:balanced` (§12.3, §12.4, §18.2 #34) ⛔ #35
  - Record each guardrail's numbers, each file's runtime (R2-Q9), both bots' readings as the full reveal's risk, and a proposal for #35's battle-level bands (G4, G6 both clauses, G8 under both policies, G13, G16) in `docs/balance-backlog.md` (A204).
  - Read R1's watch items on round battles: Capguard Hall at 3 by round (R1: 92% at 300 gold, 2% at 1,500), the answers to the Sporeling and the Capguard with `pinned` on, and G2's Gill Archer under the adopted set (A116).
  - Report a miss with its numbers; a retune across several units waits for the user.
  - If G4 misses (S10b's step 3 did: a median of 9 rounds, and 73% of battles reaching round 9; S14b's rough playtest found the late rounds empty once the colony was full, §18.2 #67), measure the pace levers and propose one retune, with the numbers behind it, beside the bands in `docs/balance-backlog.md`. The levers are `heartcapDamagePerSupply` (25), `roundDamageCap` (25% of max HP), the Heartcaps' HP and the Sporestorm (§18.3). Don't make it here: T125 takes it to the user (S14b, 2026-11-02).
- [ ] T125 [US6] [USER] Agree the bands with the user, write them into `data/balance-targets.json`'s `rounds` block, and close #35's battle-level part in `SPEC.md` §12.3 (§12.3, §18.2 #35) ⛔ #35 (A204)
  - The split with R2b: R2a sets G4, G6 (both clauses, single battle), G8 under both policies, G13 and G16. R2b sets G14 and G15 and re-reads G8 beside G14 (A204). Say so in #35's Decision line.
  - Bring T124's pace retune, if it proposed one, for the user's OK beside the bands, so S21's playtest runs at the agreed pace (S14b, 2026-11-02). S18 makes an agreed retune: it gets its `data/CHANGELOG-balance.md` entry, and the round goldens are refreshed (`npm run golden -- update`).

**Checkpoint:** `npx vitest run tests/slow/rounds` passes, or each miss is recorded with its numbers and the user's call; `npm run bench -- --rounds` is inside §13.7; `npm run verify` is green.

## Phase 9: US7 — Measures for the playtest (P3)

**Goal:** the playtest can read the reveal and the pace: a "last fielded" view of the general for an A/B (R2-Q1), and planning seconds per round on the report (X6). **Independent test:** US7's checks in the Stories table.

**S19: the playtest's measures**

- [x] T126 [US7] Write the cases first in `tests/unit/rounds/playTime.test.ts` (new) and `tests/browser/rounds/reveal.test.ts` (new) (§7.5, §10.2, §16 R2 gate) (A198, A203):
  - play time, with an injected clock: planning seconds are kept per round, and the planning, clash and aftermath seconds add up; the clock stops while the tab is hidden and after 60 s without input; Help and settings count; a paused clash counts until the idle cutoff; nothing enters the state or the hash. records-2 adds its run-total cases to this file (run-it-back.md T015);
  - the reveal: with `reveal=last`, round 2's planning shows no "New" sprout before Begin and draws the general's last fielded formation; the clash's first tick puts its units where its real formation says; `round=4&reveal=last` (with `player=bot:balanced`) draws round 3's fielded colony after a headless fast-forward; `general-plans-first` hashes equal in both modes.
- [x] T127 [US7] Build the "last fielded" view in `src/app/rounds/urlParams.ts` and `src/render/rounds/preview.ts` (§7.5, §10.2) (A198)
  - With `reveal=last`, from round 2 the general's colony and squads are drawn as it fielded last round, and this round's plantings appear at Begin with their sprout.
  - The last fielded colony is derived from state, so it works after a `round=` fast-forward: the current colony minus `ai.plans[round].planted`, plus `ai.plans[round].sold` (Call 12; each entry carries its building id and plot).
  - It's view only: the sim and its hash don't change.
- [x] T128 [US7] Build `PlayClock` in `src/app/rounds/playTime.ts` (new), the one play-time module: planning seconds per round, and clash and aftermath seconds, by RB-Q3's rule (§8.2, §9.8, §16 R2 gate) (A203)
  - The shape: `new PlayClock(now: () => number, opts: { idleMs?: number })`, with `idleMs` 60 000 by default; `setVisible(v)`, `input()` and `phase(round, p)`; readouts `planningSecondsByRound()`, `clashSeconds()` and `aftermathSeconds()`. records-2 adds `total()`, `restore(ms)` and `still` to this module (run-it-back.md T016); R2b moves it to `src/app/playTime.ts` and shows it on the summary (R2b/T109).
  - `src/app/rounds/main.ts` feeds it the phase changes, and passes the readout (the median planning seconds and the battle's minutes) to `src/ui/rounds/report.ts`, which can't import `src/app` (the lint's layering). It also logs the readout to the dev console.
  - It never saves, and nothing in it enters the state or the hash.

**Checkpoint:** T126's cases pass; the report shows planning seconds; `npm run test:browser` is green.

## Phase 10: Polish and verification

§16 R2's verification steps 1–4 and 7–9 for single battles and the docs (S20), then the playtest gate (S21). Steps 5 and 6, and the run parts of the others, are R2b's.

**S20: verification and the docs**

- [ ] T129 Step 1: `npm run verify`. The unit suite covers §15.7's round rows for single battles: the order of a round's events; income by round; the formation from the plots; how a clash ends (a lane wiped, the cap, the difference in supply); the damage formula (merged supply, siege counting double, the cap, the storm); merging at the muster, with the preview equal to what fields; the Heartcap race and the Decision after round 9; refunds by phase; the general planning first and never reading what the player plants in the same phase; a snapshot round trip between rounds. Lives and the run's save round trip are R2b's (§16 R2 step 1, `tests/unit/rounds/`)
- [ ] T130 Step 2: `npm run golden -- verify` passes v1's eight replays and the round replays (one single battle at least, Twin Roots, the merge mirror, Vesper's and Cordis's powers). The run replay is R2b's (§16 R2 step 2, `tests/golden/`)
- [ ] T131 Step 3: rerun `npm run sim -- --rounds --seeds 1..40 --player bot:balanced --enemy general:scripted --summary` on the final data and record it against step 3's expectations in `docs/balance-backlog.md` (§16 R2 step 3)
- [ ] T132 Step 4: every scenario in `data/scenarios/rounds/` asserts its outcome exactly in `tests/unit/rounds/scenarios.test.ts`, and `npm run sim -- --rounds --scenario clash-cap --until r1 --assert roundLog[0].lanes[0].capped=true` passes from the CLI (§16 R2 step 4)
- [ ] T133 Step 7: `npx vitest run tests/slow/rounds` asserts and passes the round guardrails, G4, G13 and G16 among them. v1's `tests/slow/guardrails.test.ts` still runs until R2b retires it (§16 R2 step 7)
- [ ] T134 Step 8: `npm run bench -- --rounds`: R1's full-colony clash inside §13.7's budget (§16 R2 step 8, `tools/bench.ts`)
- [ ] T135 Step 9: capture with `npm run screenshot` (`tools/screenshot.ts`), so T141's and T143's assertions run on each capture (§15.6's assertions 1–5), then Read each PNG against §16 R2 step 9's checklist, minus lives and the route (R2b) (§16 R2 step 9, §15.6) (A076, A077). The captures, each on `scene=rounds&seed=1&player=bot:balanced&enemy=general:scripted` plus the parameters given:
  - `r2a-planning-1`: `round=1&phase=planning`;
  - `r2a-planning-4`: `round=4&phase=planning`, with `--click '[data-building=sporelingBurrow]'` on its tray card, so the marks show;
  - `r2a-clash-start`: `round=4&phase=clash&ticks=1&paused=1`;
  - `r2a-clash`: `round=4&phase=clash&ticks=200&paused=1`;
  - `r2a-aftermath`: `round=4&phase=aftermath`;
  - `r2a-report`: `phase=ended`;
  - `r2a-planning-twin`: `map=twin-roots&round=2&phase=planning`, for #52's reading;
  - and the deuteranopia and protanopia filters on `r2a-planning-4`.
- [ ] T136 Write the test inventory for R2b into `docs/r2a-plan.md`'s As built: for each v1 test file, the round file that replaces it at the switch-over, kept, rewritten or retired, by §15.7 (A104)
- [ ] T138 Update `docs/status.md`, `docs/balance-backlog.md`, `data/CHANGELOG-balance.md`, `docs/r2a-plan.md`, `CLAUDE.md` and `.claude/rules/v1-code.md` before the playtest (§12.4, §16 R2, CLAUDE.md "How we work"):
  - `docs/status.md`: R2a built, the preview link, what waits on the user (the playtest, S21), what R2b needs;
  - `docs/balance-backlog.md`: the measurements, misses and candidates;
  - `data/CHANGELOG-balance.md`: check that every R2a data change has its entry (T014, T101, T121 and T123 each add their own), with the user's approval where it needed one;
  - `docs/r2a-plan.md`'s As built, recording every name R2b/T001 replaces its placeholders with: the staging folders (`src/sim/rounds/`, `src/app/rounds/`, `src/render/rounds/`, `src/ui/rounds/`, `tools/lib/rounds/`, `tests/unit/rounds/`, `tests/browser/rounds/`, `tests/slow/rounds/`, `tests/roundHelpers.ts`, `data/scenarios/rounds/`); the entry (`scene=rounds`, the title's dev-site button); the switch (`--rounds`); the `r2-…` goldens and `ROUND_REPLAYS`; the play-time module (`src/app/rounds/playTime.ts`) and its test (`tests/unit/rounds/playTime.test.ts`), which records-2 extends; where T136's test inventory is; and any name a session changed from the Technical context table;
  - `CLAUDE.md`'s "Dev-site builds": `scene=rounds` opens R2a's preview on dev builds;
  - `.claude/rules/v1-code.md`: one line saying `rounds/` folders are v2's staging and never import v1's `BattleState`, with one exception until R2b rewrites Help. S14's `src/app/rounds/battleView.ts` builds the preview's Help from a v1 rules-only battle, as the title's Help does;
  - this file's ticks.

**S21: the playtest gate** (docs, plus any data tuning T139 agrees; once S20's PR is merged and deployed to the dev site)

- [ ] T137 [USER] The playtest gate. X3: R4a merged first and passed its review (R4/T039, 2026-11-02). The user plays battles on the dev site, at least one on Twin Roots and one with `reveal=last` (R2-Q1's A/B), and answers §16 R2 gate questions 1, 2, 3, 6 and 7 (§16 R2 gate, §18.2 #52) (A202)
  - The links: `https://swalliso.github.io/Sambattler/dev/?scene=rounds` (the title's preview button opens the same: Old Mother Mold, adaptive, with powers, Call 28), `…/dev/?scene=rounds&map=twin-roots&enemy=general:lichen-baron`, and `…/dev/?scene=rounds&reveal=last`.
  - Under X3 (R4/T039) it also asks "Could you spot the Elders, and tell a Bloomed unit from a base one?" (A162; R4-Q3 gave only Elders a rim) and takes #52's first reading on Twin Roots: does the shape language read at its scale (about 1.78× in a 1280×720 window, A077)?
  - Planning seconds per round are read off the report (X6).
  - Tell the user first: Help still describes v1 until R2b, and the preview plays no battle sounds (R2b/T038).
- [ ] T144 Write the playtest down: the answers in `docs/playtest-feedback.md`, newest first; the gate's result and the planning seconds per round in `docs/r2a-plan.md`'s As built; and in `docs/status.md`, R2a's gate answered and what R2b's S0 needs (§16 R2 gate, CLAUDE.md "Where things get written down")
- [ ] T139 [USER] Review with the user: tune the data from the playtest (a rule change or a retune across several units waits for their OK; a data change gets its `data/CHANGELOG-balance.md` entry, and one that moves goldens runs `npm run golden -- update`), decide what R2b changes, record it in `docs/r2a-plan.md` and `docs/status.md`, and agree to start R2b's S0 (§12.4, §16 R2)

**Checkpoint:** S20: T129–T135's commands pass, with T141's and T143's assertions green on every capture. S21: T137's answers are in `docs/playtest-feedback.md` and the user has agreed R2b's start.

## Dependencies and parallel work

- **Phase order:** Setup → Foundational → US1 → US2 → US3 → S14b's rough playtest (R2-Q25) → US4 and US5 in parallel → US6 → US7 → Polish. US1 needs the whole Foundational phase, and US2 needs US1. US3 needs US2 (a whole battle to play). US4's and US5's sim tasks need only US2, but their UI tasks (T102, T109) need US3's S13 and S14, so their sessions start after S14. US6 needs US4 and US5 (the power replays, G8 on the adaptive general). US7 needs US3: T127 draws on its preview layer and T128 on its report. Polish needs US6 and US7 (S20 after S18 and S19), and the playtest (S21) needs S20 on the dev site.
- **Sessions in parallel:**
  - S1 and S2 (both edit `src/data/schema.ts`, in different schemas; the later merge rebases).
  - S9 and S10a, after S8 (the user, 2026-11-02). S9 owns `src/sim/rounds/headless.ts` and the tools; S10a owns `src/sim/rounds/ai/**` and `openRound`'s turn hooks. Their PRs were checked together before either merged.
  - S9b beside S11 (the user, 2026-11-02). S9b worked in `src/sim/rounds/systems/` and the tests; S11 owned `src/app/rounds/**`, `src/render/rounds/**`, `tools/screenshot.ts` and `tools/lib/rounds/params.ts`. #89's CI ran before #88 landed, so the hub checked the two together before #89 merged.
  - S12, S13 and S10b, once S11 has merged (the user, 2026-11-02). S10b owns `data/scenarios/rounds/general-plans-first.json`, `tests/unit/rounds/scenarios.test.ts`, `tools/verify.ts`, `tools/golden.ts`, the first round golden and `docs/balance-backlog.md`. S12 and S13 change nothing the sim hashes, so S10b's golden holds, and T073's wall time, read beside the other two, is re-run alone if it misses. S12 owns `src/render/rounds/**`, `src/sim/rounds/matchups.ts` with its export line in `src/sim/rounds/index.ts`, and `src/app/rounds/phases/aftermath.ts`'s hook for the aftermath view; it doesn't edit `src/app/rounds/battleView.ts`. S13 owns `src/ui/rounds/hud/top.ts`, `tally.ts`, `explain.ts`, `src/ui/rounds/doctrine.ts` and its mount lines in `src/app/rounds/battleView.ts` (T077's mounts). The hub checked the three together before #91 and #93 merged.
  - S15 and S16, after S14 and its rough playtest (S14b). They started beside S14b, which is docs only (the user, 2026-11-02). S15 owns `src/sim/rounds/ai/**`, `src/ui/rounds/doctrine.ts` and `src/app/rounds/phases/planning.ts`; S16 owns `src/sim/rounds/powers.ts`, `step.ts`'s power calls and `src/app/rounds/phases/clash.ts`. Both add a line to `tools/verify.ts`, so the later merge rebases. The hub's joint check (2026-11-03) found four such conflicts, and found that S15's T101 keys, which the rounds library hashes, move S16's two new replays. #99 merged first, and S16 merged `develop` and refreshed its replays.
  - S17 and S19, once S15 and S16 have merged (the user's go-ahead, 2026-11-03). S19 needs US3's preview and report and S15's records (Call 12), not S18.
    - S17 owns the tools (`tools/bench.ts`, `balance.ts`, `experiment.ts`, `tools/lib/pool.ts`, `tools/lib/rounds/bench.ts` and `balance.ts`, `tools/verify.ts`), `tests/slow/rounds/`, `tests/browser/rounds/perf.test.ts`, `tests/unit/rounds/seats.test.ts`, `data/scenarios/rounds/bench-300.json` and its two replays.
    - S19 owns `src/app/rounds/urlParams.ts`, `playTime.ts` and `main.ts`, `src/render/rounds/preview.ts`, `src/ui/rounds/report.ts`, and its two test files.
    - S20 waits for both S18 and S19.
  - Everything else is in order.
- **From R1:**
  - R1/T004 and R1/T006 (`formationBox`, `slotPositions`, `emplacementPosition`, `overflows`, `findTrios`, `musterKnits` in `src/sim/formation.ts`) → T020 and T043.
  - R1/T012 and R1/T014 (`armyFromBot`, `lineOf`, `assignSlots` in `tools/lib/clash.ts`) → T116, for building armies only. R1/T016's `playClash` runs v1's sim, so no round guardrail uses it (T116, T123).
  - R1/T021 (the pool's job kinds) → T117's `rounds` job kind, which T122 and T123 use.
  - R1/T008–T010 (the tool-only idle seek and siege switches) → T035, T037 and T038 write them as the rule (Call 20); R2b/T043 deletes the flags with v1's `src/sim/state.ts` and `src/sim/compile.ts`, and R2b/T158 ports the tool code that sets them.
  - R1/T039 (the full-colony clash bench) → T114.
  - R1/T033 and R1/T034 (the race model) → X5's call, then T119's bands.
  - R1/T047–R1/T050 (the report, the hand-over and the gate's calls) → T002 and T009–T011.
- **With R4a (X3):** R4a's `drawUnitSprite(g, atlas, opts)` and `drawPips` in `src/render/unitSprite.ts` (R4/T011) → T081 and T083; `emplacementSprite(content, buildingId)` (R4/T029) → T086. If R4a lands after T081, T081 has made the module with R4a's signature, and R4a's change reaches both renderers. R4a's review gate (R4/T039) gates T137, which adds R4's Elders question (A162) and #52's reading.
  - R4/T030's width case reads each building's `squad`. After S1 adopts R1's squad sizes, run `npx vitest run tests/unit/shapes.test.ts`. A width failure is fixed by narrowing that sprite in a follow-up R4a PR, never by loosening R4/T030.
- **To R2b:**
  - R2b moves every `rounds/` path in the Technical context table into place, deletes v1 and the stand-ins, and folds the `rounds` data blocks.
  - It builds on R2a's state (`BattleState` with `v: 2`, `RoundResult` with `fielded`), `openRound`'s draft and run hooks, `planTurn`, the power's stand-in (Rhizome Tithe, R2-Q16), the compile list of retired stats (Call 19), `pendingGold` (R2-Q20), the round goldens and `tools/lib/rounds/`.
  - It also takes T136's test inventory, and the names T138 records in `docs/r2a-plan.md`'s As built (R2b/T001).
  - #35's split: R2a sets G4, G6 (both clauses, single battle), G8 under both policies, G13 and G16 (T125). R2b sets G14 and G15 and re-reads G8 beside G14 (A204).
- **To records-2 (X10):** `RoundResult`, and the one play-time module: T128's `src/app/rounds/playTime.ts` and T126's `tests/unit/rounds/playTime.test.ts` (at `src/app/playTime.ts` after R2b's move), which run-it-back.md T015 and T016 extend with a run total (RB-Q3).

## Sessions

Each session is about a day, ends in one PR into `develop` (opened when the user asks), keeps `npm run verify` green and leaves the v1 game playable.

| Session | Tasks | Branch | Gate (true before starting) | Ends with |
|---|---|---|---|---|
| S0 | T001–T006 | `feature/r2a-plan` | R1's review gate passed (R1/T049, R1/T050); R1's results in `docs/balance-backlog.md` | `docs/r2a-plan.md` agreed; R2a's decisions in `docs/tasks/clarify.md` and SPEC; `docs/status.md` updated |
| S1 | T007–T014 | `feature/r2a-data` | S0 merged | The rounds data, kept out of v1's library; R1's set as default data; v1's goldens refreshed once; CHANGELOG entry |
| S2 | T015–T020 | `feature/r2a-colony` | S0 merged; R1's `formation.ts` on develop | Map colonies, `colony.ts`, the formation's pure core; no golden moved |
| S3a | T023–T025, T140, T026 | `feature/r2a-state` | S1 and S2 merged | The round types, the library and compiled sides with no display text, the modifier DSL with its new triggers and `rank` |
| S3b | T021, T022, T027–T029 | `feature/r2a-create` | S3a merged | The round harness, `createBattle` into round 1, the step by phase, hashing, scenarios in round form |
| S4 | T030–T034 | `feature/r2a-planning` | S3b merged | Planning commands with refusals and refunds; the kit; `formationOf` and `mergePreview` on state |
| S5 | T035–T041 | `feature/r2a-combat` | S4 merged | The kept combat rules copied and stripped; emplacements |
| S6 | T042, T046, T043–T045 | `feature/r2a-clash` | S5 merged | Per-squad stats; Begin, the arrival with its shield, and the muster; lane ends and freeze |
| S7 | T047–T052 | `feature/r2a-scoring` | S6 merged | Scoring, the Heartcap race, the Decision; every rule scenario passing (US1 done) |
| S7b | T147 | `feature/r2a-seat-fix` | S7 merged | No seat decides a clash: separation and movement read positions independently of unit order |
| S8 | T053–T057 | `feature/r2a-economy` | S7b merged | Opening a round, income, stats per round, the summary |
| S9 | T058–T064 | `feature/r2a-headless` | S8 merged | `runHeadless` by phase, `npm run sim -- --rounds`, round asserts, `ROUND_REPLAYS` in the golden tool, determinism tests |
| S9b | T149 | `feature/r2a-replay-fix` | S9 merged; may run beside S11 | A clash with no change replays the last one: the kept systems' periodic checks count from the clash's start |
| S10a | T065–T069 | `feature/r2a-general` | S8 merged; may run beside S9 (the user, 2026-11-02) | The general plans first through `planningView`; its scores, turn and profiles; bots plan after it |
| S10b | T070–T073 | `feature/r2a-general-check` | S9b and S10a merged, so T072's first round golden comes after T149; may run beside S11, S12 and S13 (the user, 2026-11-02) | `general-plans-first`, the round smoke, the first round golden, step 3's reading (US2 done) |
| S11 | T074–T080, T141, T081 | `feature/r2a-ui-loop` | S9 and S10a merged; may run beside S9b and S10b (the user, 2026-11-02) | The preview entry with its defaults, the loop by phase with `battleView.ts`'s mounts, input, the bridge, params and assertions 1–3; plots on the field |
| S12 | T082, T083, T142, T084–T086 | `feature/r2a-ui-field` | S11 merged; may run beside S13 and S10b (the user, 2026-11-02) | The formation and merge previews, `matchupClass` and its marks, the aftermath, the field's details |
| S13 | T087–T091 | `feature/r2a-ui-bands` | S11 merged; may run beside S12 and S10b (the user, 2026-11-02) | Both Heartcaps, chips, tally, lane tug, tooltips, the Intent panel, each in its mount |
| S14 | T092–T097, T143 | `feature/r2a-ui-panels` | S12 and S13 merged | Tray, inspect, the planning and clash chrome, the report by round, assertion 4 (US3 done) |
| S14b | T145, T146 | `feature/r2a-rough-playtest` | S14 merged and deployed to the dev site | The user's rough-playtest notes in `docs/playtest-feedback.md`, and any change to S15–S20 written into this list (docs only); S15 and S16 may start |
| S15 | T098–T103 | `feature/r2a-counters` | S14b done | The counter cycle in rounds; X8's readouts and knobs; the adaptive smoke (US4 done) |
| S16 | T104–T111 | `feature/r2a-powers` | S14b done | The power once per clash, its controls, its smokes and replays (US5 done) |
| S17 | T148, T112–T118 | `feature/r2a-tools` | S15 and S16 merged | Twin Roots and merge-mirror replays, the round bench and frame check, balance and experiment in rounds with `playRoundClash` |
| S18 | T119–T125 | `feature/r2a-guardrails` | S17 merged; #35's approach agreed at S0 (T124 and T125 set its battle-level bands) | The round guardrails in `tests/slow/rounds/`, the answer bot, the bands agreed, and a pace retune agreed with them if G4 misses (US6 done) |
| S19 | T126–T128 | `feature/r2a-measures` | S15 and S16 merged (beside S17, the user's go-ahead, 2026-11-03) | The "last fielded" view and planning seconds per round on the report (US7 done) |
| S20 | T129–T136, T138 | `feature/r2a-verify` | S18 and S19 merged | Steps 1–4 and 7–9 passing; T136's inventory; the docs and As built before the playtest |
| S21 | T137, T144, T139 | `feature/r2a-gate` | S20 merged and deployed to the dev site; R4/T039 passed (2026-11-02) | The playtest answered and written down; the user's tuning calls; R2b may start |

## Coverage

**Table 1: SPEC §16 R2's items.** The scope bullets, Done-when lines and verification steps, with their tasks here or "R2b".

| SPEC §16 R2 item | Tasks |
|---|---|
| Scope: the round loop (phases, ticks only in a clash, fresh squads, same-tick arrival in formation, the 45 s cap, merging at the muster with the preview equal to what fields) | T023, T026, T027, T028, T034, T042–T046, T052, T055, T077, T140 |
| Scope: scoring (Heartcap damage from surviving supply, the cap, the storm by round, per-battle Heartcaps, the end at 0 or after round 9) | T008, T047, T050–T052, T055 |
| Scope: lives, the Grove's regained life, repairs retired, Mending Moss | R2b |
| Scope: the colony (fixed 2×2 plots in 2 ranks, the formation copied from it, loam and stump plots) | T015–T020, T034, T041 |
| Scope: the colony gaining plots over a run | R2b; R2a builds the closed third rank and its open order (T015–T018) |
| Scope: the general plans first (income, any due doctrine or counter change, buying and planting, the §7.3 formation, the counter cycle reading what you fielded) | T055, T065–T070, T098–T103 |
| Scope: the general's kit (§7.8) with `maxOwned` until R3 | T033, T068, T069 |
| Scope: the general's kit on its route node | R2b |
| Scope: the economy per round (stipend, Cellars, interest, comeback gold) and selling refunds by phase | T008, T030, T031, T053, T055 |
| Scope: drafts after rounds 2, 4 and 6 | R2b (T055 leaves the hook, Call 26) |
| Scope: the commander power at most once per clash | T104–T111 |
| Scope: content tied to retired systems (passives, Rhizome Tithe, generals' passives, relics, Rot-Eater) | R2b (Call 19's stand-ins: T025, T105) |
| Scope: saves at the start of each planning phase and at Begin | R2b |
| Scope: runs and battles saved before R2 (#32) | R2b |
| Scope: UI (the three views, both colonies' plots, the previews, the tally and tug, both Heartcaps, basic marks, the report by round) | T074–T097, T142 |
| Scope: UI (lives, the run bar, the route node's kit) | R2b |
| Scope: retiring v1's battle in code, tests, UI, Help and tips | R2b |
| Scope: the rework's pieces become the default | T011–T014 |
| Scope: deleting the `?proto=` presets of retired systems | R2b; the adopted pieces' presets and `kept` in T013 |
| Scope: settling §18.2 #16–#35 in R2's plan | `docs/r2a-plan.md` (T003–T005) for #19, #22, #23, #25, #29–#31, #34 (X7), and #35's battle-level bands (T124, T125); `docs/r2b-plan.md` (R2b's S0) for the rest, #35's G14 and G15 among them |
| Scope: link previews | R2b |
| Scope: tools (`sim` and `balance` play rounds, new goldens, round guardrails, screenshot params) | T058–T064, T071–T073, T076, T080, T112–T125, T135, T141, T143; the run parts are R2b's |
| Not in R2: copies until R3 | R3 (X4 decided no, 2026-11-02): T032 and T033 build the kit without copies |
| Not in R2: the shape language's art, the card text, the rewritten Help | R4a (X3) before T137; R4b |
| Done when: a human can play a whole run in rounds on the dev site | R2b; R2a's single battle in T074–T097 and T137 |
| Done when: nothing from the retired list remains | R2b |
| Done when: every verification step passes | T129–T135 for steps 1–4 and 7–9 on single battles; R2b for all |
| Done when: the playtest gate questions put to the user | T137, T144 (questions 1, 2, 3, 6, 7); R2b (4, 5 and the run) |
| Verification 1: `npm run verify` with the round rows of §15.7 | T129 (lives and the run's save round trip: R2b) |
| Verification 2: new goldens, one single battle and one run at least | T072, T111, T112, T130 (the run: R2b) |
| Verification 3: headless battles, 40 seeds | T073, T131 |
| Verification 4: rule scenarios, E1–E8 among them | T048, T049, T070, T132 |
| Verification 5: whole runs | R2b |
| Verification 6: saves from before R2 | R2b |
| Verification 7: `npm run test:slow` in round form | T119–T125, T133 (G14, G15: R2b) |
| Verification 8: `npm run bench` | T113, T114, T115, T134 |
| Verification 9: browser checks (§15.6's automatic assertions) and the visual checklist | T080, T141 (assertions 1–3, 5), T143 (assertion 4), T135 (the captures and the Read); the route capture and lives: R2b |
| Verification 10: the playtest gate | T137, T144 (questions 1, 2, 3, 6, 7); R2b |
| Verification 10: the rough playtest before it (R2-Q25, added 2026-11-01) | T145, T146 (questions 1, 2, 3 and 6 in rough form, and whether S15–S20 change) |

**Table 2: findings.** Every high and medium A-ID for R2a, then the lows.

| Finding | Handled by |
|---|---|
| A024 arrival order decides the muster (high) | R2-Q11; T019, T020, T042, T043 |
| A025 in-place edits break the typecheck (high) | X2; the staging table |
| A041 eliteShare reads mixed armies as Elite (high) | R2-Q3; T098, T099 |
| A056 the swarm in its own counter sets (high) | #14, #15; T098, T099 |
| A057 Puppet Bloom has little to merge (high) | R2-Q7; T107, T110 |
| A101 both loops must coexist (high) | X2 |
| A193 the flat cap sends battles to round 9 (high) | X5; T008, T050, T119 |
| A195 R2 is several milestones (high) | X1 |
| A196 copy-free mass builds (high, R1) | X4 (no: R1's set passes without copies); R3 |
| A194 the general's copies can't follow the player's rule (high, R3) | R3 (#42); T033 keeps the general on `maxOwned` |
| A021 v1's idle march (high, R1) | Call 20; T035, T038 |
| A026 the muster's step and skipped systems (medium) | R2-Q11; T042–T044 |
| A027 §13.4's "unchanged" rows (medium) | T005; T036–T040 |
| A028 per-squad stats (medium) | R2-Q11; T042, T046 |
| A131 R3 extends the per-squad stats (medium, R3) | T046 shapes the table for R3's patches |
| A029 an emplacement's unit rules (medium) | #10; T035, T041 |
| A030 the lane's lock and freeze (medium) | R2-Q11; T023, T042, T044, T104 |
| A039 `mergePreview`'s shape (medium) | Call 5; T020 |
| A042 the opening doctrine barely touches round 1 (medium) | R2b (R2-Q18); T099 builds §7.6 as written |
| A043 the back-line tie (medium) | Call 11; T065, T067 |
| A044 BotDef's limits and placement (medium) | R2-Q6; T010, T069 |
| A045 weight 1 in single battles (medium) | R2-Q4; T065, T068 |
| A046 a power queued at the clash's end (medium) | Call 9; T104, T105 |
| A058 Mold's passive under the muster (medium) | R2b (R2-Q17); Call 19 until then |
| A059 a bot's planning can't be held (medium, downgraded on re-check) | Call 14; T074, T076, T080 |
| A060 hypothetical previews and exports (medium) | Call 6; T034, T142, T084 |
| A061 `?test=1`'s aftermath (medium) | Call 15; T085 |
| A062 the draft's layout (medium) | R2b (R2-Q24); R2a has no drafts (Call 26) |
| A063 lives can't be asserted in single battles (medium) | R2b; T087 asserts no lives chip in a single battle |
| A064 per-round, per-building stats (medium) | Call 13; T023, T051, T056, T089, T094 |
| A065 Space through the phases (medium) | R2-Q12; T078 |
| A066 the UI can't land piecemeal (medium) | X2; new modules beside v1 |
| A076 step 9 can't show marks or the preview's match (medium) | T005 (step 9's wording); T079 (`preview()`), T141, T143 (§15.6's assertions in round form), T135 (the tray click and `r2a-clash-start`) |
| A077 Twin Roots below 2× (medium) | #52 (R4a); T135's Twin Roots capture, T137's reading |
| A102 the slow suite's timeout (medium) | R2-Q9; T122, T124 |
| A103 §13.4's targets and effects rows (medium) | T005; T036 |
| A104 §15.7's rows (medium) | T005, T136 |
| A105 dead upgrade levels (medium) | R2b (#27); no upgrade levels in R2a's single battles (Call 19) |
| A106 scenarios from round n (medium) | Call 18; T029 |
| A107 G6's seats and HP (medium) | #35; T119, T123 |
| A108 G16 over role-split pairs (medium) | R2-Q10; T119, T123 |
| A109 one outcome per knob; the pace variant (medium) | R1's gate; T011 (adopted as data), T038 (the pace variant); R2b/T059 (deletions) |
| A119 bench-300 as a clash (medium) | Call 24; T114 |
| A152 display text in the hashed state (medium) | R2-Q8; T022, T025 |
| A175 feat stats (medium) | M6-Q1; T056, T057 |
| A197 Decision-heavy later battles (medium) | X5; the boss's pay is R2b's (R2-Q14) |
| A198 the full reveal may be too easy (medium) | R2-Q1, X7; T120, T121, T124, T126, T127 |
| A199 lives rarely bind (medium) | R2b (#16, G15) |
| A207 a Rout pays less kit than a Decision (medium) | R2b (#17) |
| A080, A081, A082, A083, A084, A085: the run's dead levels, the boundary save, the Grove's dead end, relic content with no R2 form, the migration, "+1 unit" effects (medium) | R2b (#27, R2-Q22, R2-Q21, R2-Q19 and #26, #32, R2-Q15); R2a has no runs, levels or relics (Call 19) |
| A208 the cap binds from round 4–5 (medium) | X5; T050 |
| A008 siege prefers the Mortar building (medium, R1) | Call 20; T035, T037 |
| A022 Twin Roots draws under the cap (medium, R1) | X5 |
| A096 Cordis's knit bonuses under the muster (medium) | R2-Q7; T104, T107; content is R2b's |
| A097 the boss is mechanically long (medium) | X5; R2b |
| A145 copies in single battles (medium, R3) | X4 (no); Call 29; R3 |
| A156 who writes the round Help and tips (medium) | R2b; R2a ships no tips or round Help |
| A200 the full colony over 100 supply (medium) | #7 and R1-Q5 (at most 150 live units a side); T114 |
| Lows: A031 (T015, T016), A032 (Call 4; T019, T034, T042), A033 (X4: no copies in R2a), A034 (Call 8; T030, T031), A035 and A209 (R2-Q11; T047, T052), A036 and A121 (Call 7; T059, T060), A038 (T010), A040 (R2-Q11; T019), A047 (#30; T023, T042, T067), A049 and A206 (X8; T064, T100, T101, T149), A051 (T098), A052 (Call 10; T027, T069), A053 (R2-Q11; T104), A055 (#15; T098), A068 (Call 13; T051, T092, T096), A069 (Call 22; T084), A070 (Call 12; T023, T068, T091), A071 (Call 23; T092, T095), A072 (Call 21; T081), A075 (Call 16; T074, T076), A078 (R2-Q12; T085, T097), A110 (Call 20; T035), A112 (Call 24; T114), A113 (Call 24; T113, T115), A115 (Call 17; T060, T063, T112), A116 (R1's gate; T002, T014), A118 (T011, T012), A120 (R2-Q10; T123), A162 (R4/T039; T137), A187 (`measure=frames` in the preview's bridge only; T079, T115), A202 (X3; T137), A203 (X6, X10; T126, T128), A204 (#35; T124, T125), A205 (R2-Q2; T008, T053, T055) | as listed |
| Lows that are R2b's: A037 (R2-Q20), A050 (R2-Q17), A054 (the Sigil), A067 (tips), A073 (the run summary's columns), A074 (the title blurb and og image), A079 (`scene=draft`), A114 (Appendix A's tags), A117 (old `?proto=` links), A201 (R2-Q13) | R2b |
