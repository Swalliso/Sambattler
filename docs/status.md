# Where things stand

Updated 2026-11-01, on `feature/r1-plan` (R1 S0, a docs PR into `develop`). This is the hand-over page. It covers what we're working on, what's waiting on the user's decision, and where each piece lives. Update it when work lands or the user decides something. Keep the detail in the docs it links to.

## In short

- **The game on `develop`:** Milestones 1–5 are built, plus the combat rework behind `?proto=rework`.
  - `main` has M1–M4 and the UI work.
  - M5 (commanders and powers) is only on `develop` ([#22](https://github.com/Swalliso/Sambattler/pull/22)).
- **The design changed on 2026-10-31.** After the rework's playtest (P3), the user moved the game to **SPEC v2**:
  - battles become rounds: you plan with the clock stopped, then both whole armies clash;
  - the general plans first, and you see its whole army before you plan;
  - each battle is a race between two Heartcaps, and the run has lives, so a won battle never costs anything;
  - the column fight is gone, your colony is your formation, and the colony grows plots over a run;
  - a kit of building cards with copies;
  - six core archetypes, with augments and combos.

  See [SPEC §0.1](../SPEC.md#01-what-changed-in-v2), [§1.3](../SPEC.md#13-v2-decisions-2026-10-31) and the [P3 notes](playtest-feedback.md#2026-10-31-p3-the-combat-rework-the-user).
- **SPEC v2 is on `develop`** ([#39](https://github.com/Swalliso/Sambattler/pull/39)). **Nothing in v2 is built yet.** Until milestone R2 lands, the code follows v1: the M5 battle, with the rework's pieces behind `?proto=rework` on the dev site.
- **The spec is broken into task lists** in [docs/tasks/](tasks/README.md) ([#40](https://github.com/Swalliso/Sambattler/pull/40), on `develop`), spec-kit style: one list per milestone, one session per row of its Sessions table. The decisions each milestone needs from the user are in [clarify.md](tasks/clarify.md), and the problems the breakdown found in SPEC v2 are in [spec-analysis.md](tasks/spec-analysis.md). Lists after R1's are drafts, refreshed when each milestone's plan is agreed.
- **Now: milestone R1, the clash check** ([SPEC §16](../SPEC.md#16-milestone-plan)). It's a headless tool that fights whole armies at equal gold, with no rule change. It sets squad sizes and checks that every strong army has an answer before the round loop is built. Its plan, [docs/r1-plan.md](r1-plan.md), was agreed on 2026-11-01 (R1 S0), with every recommendation taken.
- **Then:**
  - R2: rounds, the general plans first, lives, and the planning screen. R2 starts only once R1's results are in `docs/balance-backlog.md` and the user has agreed them. A session asked to start R2 before that stops and asks. The task lists split it in two (X1): R2a, a single battle in rounds, then R2b, the run in rounds;
  - R3: the kit, the six archetypes, augments, combos and run packs;
  - R4: readable armies and the card-text pass, in two parts (X3, agreed 2026-11-01): R4a, the shapes on the field, now beside R1 (below), and R4b, the cards, after R3;
  - then M6–M8, rewritten for v2.

  [docs/tasks/README.md](tasks/README.md) has the full order and every milestone's sessions.

## Next session: R1 S1 and S2

- **Work from** [docs/tasks/r1-clash-check.md](tasks/r1-clash-check.md) and follow [docs/tasks/README.md](tasks/README.md#running-a-session). Both start once R1 S0's PR (`feature/r1-plan`) has merged, and they can run side by side:
  - **S1** (`feature/r1-formation`, T003–T006): built, in its PR. `src/sim/formation.ts` holds the slot layout (`formationBox`, `slotPositions`, `emplacementPosition`, `overflows`, `slotGrid`) and the muster's knitting (`findTrios`, `musterKnits`), as pure functions that R2 reuses. A test checks that the muster agrees with the sim's merging. Verify green, no golden moved;
  - **S2** (`feature/r1-armies`, T007–T012): built, in its PR. The two tool-only switches (`noBuildingPreference`, `idleSeek`, in `config.test`) and the army builder in `tools/lib/clash.ts`; verify green, no golden moved.
- **Then** S3 (`feature/r1-clash-runner`) once both have merged, and S4–S8 in the order of the task list's Sessions table.
- **R1's calls, agreed 2026-11-01:** every recommendation. They're dated in [clarify.md](tasks/clarify.md) and written into SPEC §16 R1 and §12.2.
  - R1-Q1, where squads stand: §7.3's tags set the line, files fill centre-out, and on Twin Roots each building goes to the lane with fewer of its line.
  - R1-Q2, spending: economy and utility cards are filtered out, a pick that doesn't fit is skipped, and each army has its own stream.
  - R1-Q3, a clash win: more lanes, then more uncapped damage, else a draw worth half. Numbers are quoted at jitter ±0.2.
  - R1-Q4, plots: the base plots at every budget, plus a late-run reading with 4 more at 1,200 and 1,500 gold.
  - R1-Q5, the full colony: §13.7's budget is now at most 150 live units a side at the arrival, not about 100 supply. The bench case is the true worst case, report-only until R2.
  - R1-Q6, the sixth archetype: a core-six check per candidate, and G3 twice for the variants that append spawners.
  - R1-Q7 and R1-Q8: the tool-only flags `noBuildingPreference` and `idleSeek`, on in the check and absent in every battle.
  - R1-Q9: a three-lane screen, outside the bars.
  - For later calls, R1 also records eliteShare by parts' base supply (R2-Q3), measures copies at 2, 3 and 4 (X4), and builds the race model (X5). Those calls stay open.
- **Alongside R1:**
  - **R4a, the shape language on the field** (X3, agreed 2026-11-01).
    - **Its plan,** [docs/r4a-plan.md](r4a-plan.md), was agreed on 2026-11-01 (R4a-S0). Every recommendation was taken but two: only Elders get a rim (R4-Q3), and the merged radius goes ×1.0, which R2a writes (#53).
    - **R4a-S1** (`feature/r4a-unit-drawer`, R4/T008–T016): built, in its PR. One unit drawer, `src/render/unitSprite.ts`, for v1's renderer and R2a's views. `TIER_SCALE` is gone, so merged units keep their body. `i-pip` marks the tier on the field and in the inspect panel, and Elders get a gold rim. It also adds the `unit-lineup` and `unit-lineup-twin` scenarios. Verify green, no golden moved.
    - **Next: R4a-S2** (`feature/r4a-shape-checks`, R4/T017–T023), once S1's PR has merged: the shape schema, `marks.json`, the shape checks and the sprite-sheet tool. Then S2b to S5 follow in the order of [the task list](tasks/r4-readable-armies.md)'s Sessions table, still beside R1.
    - **R2a's playtest waits for R4a's review gate** (R4/T039).
  - **Run it back** ([run-it-back.md](tasks/run-it-back.md)): X10 was agreed on 2026-11-01, and records S0 agreed its plan, [run-it-back-plan.md](run-it-back-plan.md), with RB-Q1 and RB-Q2 as recommended ([#44](https://github.com/Swalliso/Sambattler/pull/44)). records-1 builds only the remembered setup and Run it back, and records no runs, so no v1 run is ever recorded. Run records start in records-2, after R2b.
    - **records S1** (`feature/records-1-run-it-back`, T003–T012): built, in its PR. The profile store, `src/meta/records.ts`, keeps the last setup under `spore-sprawl/profile/v1`, and every write goes through `updateRecords()`. On the summary, Run it back (`Enter` or `R`) starts the same commander and bans on a new seed, straight on the route, and normal play remembers that setup. Seeded, test and prototype pages write no profile. Verify green, no golden moved.
    - **Next: records S2** (`feature/records-1-setup`, T013–T014, T020–T023), once S1's PR has merged: the Underroot opens on the last setup, then records-1's checks, ending with your check on the dev site.

  These touch different files.
- **No rule changes:** R1 changes no rule or data, so no golden hash moves.
- **Results go in** [docs/balance-backlog.md](balance-backlog.md), v2's backlog, and end at R1's review gate (S8), where the user makes the calls R2a needs (X4, X5 and §18.2 #7–#15).

## Waiting on the user

1. **Review and merge R1 S0's PR** (`feature/r1-plan` into `develop`): the agreed plan and R1's calls in SPEC. R1 S1 and S2 wait on it.
2. **The decisions that shape the milestones**, X1–X10 in [clarify.md](tasks/clarify.md#index). Each has a recommendation. The task lists assume them and say what changes otherwise.
   - Needed now: X1 (split R2 into R2a and R2b) and X2 (build R2a beside v1 on `develop`; R2b's switch-over on an integration branch until a whole run plays). X3 (split R4, the field's shapes first) and X10 (Run it back in two parts) were agreed on 2026-11-01.
   - At R1's review gate: X4 (copies before R3, if the swarm fails) and X5 (the scoring curve). R1 measures both, as agreed on 2026-11-01.
   - Later: X6 (run length), X7 (an "answer what you see" bot), X8 (measuring the general), X9 (flyers out of the first release).
3. **The six core archetypes** are a first cut the user wants to discuss further. The sixth slot is open: the Burster Pod, or the Puffball Mortar ([§11.2](../SPEC.md#112-velvet-bloom-buildings)). It's §18.2 #36 in clarify.md: R1 measures both, and the call comes at R3's plan.
4. **The open rules in §18.2** now each have a block in [clarify.md](tasks/clarify.md) with a recommendation, filed under the milestone that needs them. Some recommendations disagree with SPEC's first guess and say why. The rows R2 needs (#16–#35) include #32: what happens to runs saved before R2.
5. **A release to `main`:** only when the user asks.

## Where things live

| What | Where |
|---|---|
| The design: rules, milestones, open questions | [SPEC.md](../SPEC.md) (v2). Start with §0.1 and §1.3 |
| The work: a task list per milestone, and how a session runs | [tasks/](tasks/README.md) |
| The decisions each milestone needs, with recommendations | [tasks/clarify.md](tasks/clarify.md) |
| The review of SPEC v2: problems found, and where each is handled | [tasks/spec-analysis.md](tasks/spec-analysis.md) |
| A milestone's plan and As built | `docs/<milestone>-plan.md`. R1's is [r1-plan.md](r1-plan.md) |
| Human playtest notes | [playtest-feedback.md](playtest-feedback.md), newest first. Older items carry a v2 status |
| v2's balance work | [balance-backlog.md](balance-backlog.md) and `data/CHANGELOG-balance.md` |
| Ideas written against v2 | [ideas/](ideas/README.md) |
| Research on other games | [research/](research/README.md) |
| Everything written for the v1 battle | [archive/](archive/README.md). It's history and evidence, not design input |

## Recent work

| Work | Where | State |
|---|---|---|
| Run it back plan agreed (2026-11-01) | [run-it-back-plan.md](run-it-back-plan.md), [run-it-back.md](tasks/run-it-back.md), [clarify.md](tasks/clarify.md) (X10, RB-Q1, RB-Q2), SPEC §9.7, §13.8 and §16 M6, the `feature/records-plan` PR | Recommendations taken; records-1 records no runs, so run recording moved into records-2. records S1 next |
| R1 S1: the formation and the muster (2026-11-01) | [src/sim/formation.ts](../src/sim/formation.ts), [tests/unit/formation.test.ts](../tests/unit/formation.test.ts), the `feature/r1-formation` PR | Verify green, no golden moved. With S2 merged ([#45](https://github.com/Swalliso/Sambattler/pull/45)), S3 can start once this merges |
| R1 S2: the switches and the army builder (2026-11-01) | `src/sim/systems/targeting.ts`, `movement.ts`, [tools/lib/clash.ts](../tools/lib/clash.ts), the `feature/r1-armies` PR | Verify green, no golden moved. S3 waits on S1 and S2 |
| R4a-S1: one unit drawer, pips and the Elder rim (2026-11-01) | [src/render/unitSprite.ts](../src/render/unitSprite.ts), `compose.ts`, `i-pip`, the lineups, the `feature/r4a-unit-drawer` PR | Verify green, no golden moved. Merged units keep their size. R4a-S2 next |
| R4a plan agreed (2026-11-01) | [r4a-plan.md](r4a-plan.md), [clarify.md](tasks/clarify.md) (X3, R4-Q1 to R4-Q5, #52, #53, #55), SPEC §2, §5.6, §5.8, §10, §11.1, §11.3, §13.6, §14.2, §14.3, §16 R4 and M7, and §18.2, the `feature/r4a-plan` PR | Every recommendation taken but two: only Elders get a rim, and the merged radius goes ×1.0 in R2a. R4a-S1 next |
| R1 plan agreed (2026-11-01) | [r1-plan.md](r1-plan.md), [clarify.md](tasks/clarify.md) (R1-Q1 to R1-Q9), SPEC §16 R1, §12.2 and §13.7, the `feature/r1-plan` PR | Every recommendation taken. The full-colony budget is now 150 live units a side. R1 S1 and S2 next |
| SPEC v2 broken into tasks (2026-11-01) | [tasks/](tasks/README.md), [#40](https://github.com/Swalliso/Sambattler/pull/40) | On `develop`. R1's list is being worked; the rest are refreshed at each milestone's plan |
| Archive of the v1-era notes (2026-10-31) | [archive/](archive/README.md), [research/](research/README.md), the `feature/spec-v2` PR | v1 notes moved, links kept, rules updated so sessions don't pick up v1 as current |
| SPEC v2 (2026-10-31) | [SPEC.md](../SPEC.md), [#39](https://github.com/Swalliso/Sambattler/pull/39) | On `develop`; nothing built |
| P3 playtest (2026-10-31) | [playtest-feedback.md](playtest-feedback.md#2026-10-31-p3-the-combat-rework-the-user) | Done. The notes moved the game to v2 (F17–F22) |
| Pre-playtest UI fixes (2026-10-31) | [#38](https://github.com/Swalliso/Sambattler/pull/38) | On `develop` |

**Before v2:**
- **Archived:** the reviews, the combat rework, rounds as a paper design, flyers, the measurement steps and the prototypes. The [archive's README](archive/README.md) lists them.
- **Still in code and tools:** the tools they built, for engagement, runs, spread, counters and lanes. The rework stays behind `?proto=rework` until R2.

## The rework on the dev site, until R2

- **Play** at https://swalliso.github.io/Sambattler/dev/?proto=rework. Without `?proto=`, the dev site plays like M5.
  - A prototype run saves under its own keys ([#34](https://github.com/Swalliso/Sambattler/pull/34)).
- **What `rework` turns on** (`src/data/proto.ts`):
  - waves on a 20 s beat, with mixed-wave shields;
  - pinning and call for help;
  - the Rhizomorph and the Burster;
  - the Elder Sporeling without splash;
  - storm-grown waves;
  - the general's swarm read;
  - flyers under rule C.
- **Measuring it:** `tools/experiment.ts`'s header documents every option. For example:

  ```bash
  npm run experiment -- --proto rework --checks g3,g4 --g4seeds 200 --workers 8
  ```

  Add `--checks counters` for the strict counter bar, and `path:value` overrides for variants. These measure the v1 battle. Don't tune it unless the user asks; v2's measurements start with R1.

## Starting a session

- Branch from `develop` (CLAUDE.md). Read this page, then SPEC §0.1 and the sections for your milestone.
- Work comes from [docs/tasks/](tasks/README.md): its README says how a session checks its gate, works and ticks its tasks, and finishes.
- `docs/archive/` is history. Don't take rules, numbers or plans from it, or use it as design input, unless the user points you there.
- Rule changes and retunes across several units wait for the user's OK (`.claude/rules/balance.md`).
- Tests follow the spec: when v2 retires a system, its tests, goldens and guardrails go with it (CLAUDE.md).
- When your work lands or the user decides something, update this page.
