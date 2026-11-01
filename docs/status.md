# Where things stand

Updated 2026-10-31, on `feature/spec-v2` (a PR into `develop`). This is the hand-over page. It covers what we're working on, what's waiting on the user's decision, and where each piece lives. Update it when work lands or the user decides something. Keep the detail in the docs it links to.

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
- **Nothing in v2 is built yet.** Until milestone R2 lands, the code follows v1: the M5 battle, with the rework's pieces behind `?proto=rework` on the dev site.
- **Next: milestone R1, the clash check** ([SPEC §16](../SPEC.md#16-milestone-plan)). It's a headless tool that fights whole armies at equal gold, with no rule change. It sets squad sizes and checks that every strong army has an answer before the round loop is built.
- **Then:**
  - R2: rounds, the general plans first, lives, and the planning screen. R2 starts only once R1's results are in `docs/balance-backlog.md` and the user has agreed them. A session asked to start R2 before that stops and asks;
  - R3: the kit, the six archetypes, augments, combos and run packs;
  - R4: readable armies and the card-text pass;
  - then M6–M8, rewritten for v2.

## Next session: milestone R1

- **Branch** `feature/r1-clash-check` from `develop`, after the SPEC v2 PR ([#39](https://github.com/Swalliso/Sambattler/pull/39)) is merged.
- **Read first:**
  - SPEC [§16, Milestone R1](../SPEC.md#milestone-r1--the-clash-check);
  - the rules it measures: §4.6 (plots and formation), §5.6 (the muster), §6.7 (how a lane ends) and §11.2 (squads);
  - the pieces v2 keeps (§1.3 #11) and the intended counter graph (§11.4);
  - the bars and tools in §12.2–§12.3 and §15.3–§15.4, and the performance budget in §13.7;
  - the §18.2 rows "Settled by R1", with §5.2 and §7.4 for the rows about formation and counters.

  The spec is enough to plan R1. The archive is background only.
- **Write** `docs/r1-plan.md` and agree it with the user before building, as each milestone does.
- **Reuse:** the supply duel (`supplyDuel` in `tools/lib/balance.ts`), the counter check and the worker pool in `tools/experiment.ts` and `tools/lib/`.
- **No rule changes:** R1 changes no rule or data, so no golden hash moves.
- **Results go in** [docs/balance-backlog.md](balance-backlog.md), v2's backlog.

## Waiting on the user

1. **Review and merge SPEC v2** ([#39](https://github.com/Swalliso/Sambattler/pull/39)).
   - The decisions are the user's.
   - The first-guess numbers and the open questions in [§18.2](../SPEC.md#182-open-questions-for-playtesting) are for review.
2. **The six core archetypes** are a first cut the user wants to discuss further. The sixth slot is open: the Burster Pod, or the Puffball Mortar ([§11.2](../SPEC.md#112-velvet-bloom-buildings)).
3. **Open rules** in §18.2, among them:
   - a bonus for a clean win;
   - what losing the boss does;
   - how the colony gains plots;
   - whether planted buildings carry between battles;
   - whether an augment attaches to a building type or to one card.

   The rows "Settled by R2" (§18.2 #16–#35) need the user's call before R2 builds. That includes #32: what happens to runs saved before R2.
4. **Run it back and records** was proposed as a separate session. It doesn't depend on the battle. The idea comes from the archived review's [Tier 1, item 7](archive/v1/ideas/after-the-rework.md#tier-1-now-while-you-playtest).
5. **A release to `main`:** only when the user asks.

## Where things live

| What | Where |
|---|---|
| The design: rules, milestones, open questions | [SPEC.md](../SPEC.md) (v2). Start with §0.1 and §1.3 |
| Human playtest notes | [playtest-feedback.md](playtest-feedback.md), newest first. Older items carry a v2 status |
| v2's balance work | [balance-backlog.md](balance-backlog.md) and `data/CHANGELOG-balance.md` |
| Ideas written against v2 | [ideas/](ideas/README.md) |
| Research on other games | [research/](research/README.md) |
| Everything written for the v1 battle | [archive/](archive/README.md). It's history and evidence, not design input |

## Recent work

| Work | Where | State |
|---|---|---|
| Archive of the v1-era notes (2026-10-31) | [archive/](archive/README.md), [research/](research/README.md), the `feature/spec-v2` PR | v1 notes moved, links kept, rules updated so sessions don't pick up v1 as current |
| SPEC v2 (2026-10-31) | [SPEC.md](../SPEC.md), [#39](https://github.com/Swalliso/Sambattler/pull/39) | Draft for the user's review; nothing built |
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
- `docs/archive/` is history. Don't take rules, numbers or plans from it, or use it as design input, unless the user points you there.
- Rule changes and retunes across several units wait for the user's OK (`.claude/rules/balance.md`).
- Tests follow the spec: when v2 retires a system, its tests, goldens and guardrails go with it (CLAUDE.md).
- When your work lands or the user decides something, update this page.
