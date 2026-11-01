# Where things stand

Updated 2026-11-01, on `feature/v2-tasks` (a PR into `develop`). This is the hand-over page. It covers what we're working on, what's waiting on the user's decision, and where each piece lives. Update it when work lands or the user decides something. Keep the detail in the docs it links to.

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
- **The spec is broken into task lists** in [docs/tasks/](tasks/README.md), spec-kit style: one list per milestone, one session per row of its Sessions table. The decisions each milestone needs from the user are in [clarify.md](tasks/clarify.md), and the problems the breakdown found in SPEC v2 are in [spec-analysis.md](tasks/spec-analysis.md). Lists after R1's are drafts, refreshed when each milestone's plan is agreed.
- **Next: milestone R1, the clash check** ([SPEC §16](../SPEC.md#16-milestone-plan)). It's a headless tool that fights whole armies at equal gold, with no rule change. It sets squad sizes and checks that every strong army has an answer before the round loop is built. Its plan is drafted in [docs/r1-plan.md](r1-plan.md).
- **Then:**
  - R2: rounds, the general plans first, lives, and the planning screen. R2 starts only once R1's results are in `docs/balance-backlog.md` and the user has agreed them. A session asked to start R2 before that stops and asks. The task lists split it in two (X1): R2a, a single battle in rounds, then R2b, the run in rounds;
  - R3: the kit, the six archetypes, augments, combos and run packs;
  - R4: readable armies and the card-text pass, split (X3) into R4a, the shapes on the field, which can start now, and R4b, the cards, after R3;
  - then M6–M8, rewritten for v2.

  [docs/tasks/README.md](tasks/README.md) has the full order and every milestone's sessions.

## Next session: R1 S0

- **Work from** [docs/tasks/r1-clash-check.md](tasks/r1-clash-check.md), session S0, and follow [docs/tasks/README.md](tasks/README.md#running-a-session). Branch `feature/r1-plan` from `develop`, once the task lists are merged.
- **S0 is with the user, and docs only:** agreeing [docs/r1-plan.md](r1-plan.md), including the measurement calls R1-Q1 to R1-Q9 in [clarify.md](tasks/clarify.md), then writing the agreed calls into SPEC §16 R1, §12.2, §13.7 and §15.4.
- **Then, side by side, once S0 has merged:**
  - R1 S1 builds `src/sim/formation.ts`, the slot layout and the muster's knitting as pure functions that R2 reuses;
  - R1 S2 builds the tool-only switches and the army builder.
- **Alongside R1:**
  - R4a-S0, the shape-language plan, if the user agrees X3;
  - Run it back's S0 ([run-it-back.md](tasks/run-it-back.md)), if the user agrees X10.

  These touch different files.
- **No rule changes:** R1 changes no rule or data, so no golden hash moves.
- **Results go in** [docs/balance-backlog.md](balance-backlog.md), v2's backlog, and end at R1's review gate (S8), where the user makes the calls R2a needs (X4, X5 and §18.2 #7–#15).

## Waiting on the user

1. **Review and merge the task lists** (the `feature/v2-tasks` PR into `develop`).
2. **Agree the R1 plan** ([docs/r1-plan.md](r1-plan.md)): R1 S0 asks for it.
3. **The decisions that shape the milestones**, X1–X10 in [clarify.md](tasks/clarify.md#index). Each has a recommendation. The task lists assume them and say what changes otherwise.
   - Needed now: X1 (split R2 into R2a and R2b), X2 (build R2a beside v1 on `develop`; R2b's switch-over on an integration branch until a whole run plays), X3 (split R4, the field's shapes first) and X10 (Run it back in two parts).
   - At R1's review gate: X4 (copies before R3, if the swarm fails) and X5 (the scoring curve).
   - Later: X6 (run length), X7 (an "answer what you see" bot), X8 (measuring the general), X9 (flyers out of the first release).
4. **The six core archetypes** are a first cut the user wants to discuss further. The sixth slot is open: the Burster Pod, or the Puffball Mortar ([§11.2](../SPEC.md#112-velvet-bloom-buildings)). It's §18.2 #36 in clarify.md: R1 measures both, and the call comes at R3's plan.
5. **The open rules in §18.2** now each have a block in [clarify.md](tasks/clarify.md) with a recommendation, filed under the milestone that needs them. Some recommendations disagree with SPEC's first guess and say why. The rows R2 needs (#16–#35) include #32: what happens to runs saved before R2.
6. **A release to `main`:** only when the user asks.

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
| SPEC v2 broken into tasks (2026-11-01) | [tasks/](tasks/README.md), [r1-plan.md](r1-plan.md), the `feature/v2-tasks` PR | Drafts for the user's review: R1's list is ready to work, the rest are refreshed at each milestone's plan |
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
