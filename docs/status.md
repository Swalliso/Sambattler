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
  - R2: rounds, the general plans first, lives, and the planning screen;
  - R3: the kit, the six archetypes, augments, combos and run packs;
  - R4: readable armies and the card-text pass;
  - then M6–M8, rewritten for v2.

## Waiting on the user

1. **Review SPEC v2** (the `feature/spec-v2` PR).
   - The decisions are the user's.
   - The first-guess numbers and the open questions in [§18.2](../SPEC.md#182-open-questions-for-playtesting) are for review.
2. **The six core archetypes** are a first cut the user wants to discuss further. The sixth slot, the Burster Pod or the Puffball Mortar, is open ([§11.2](../SPEC.md#112-velvet-bloom-buildings)).
3. **Open rules** in §18.2, among them:
   - a bonus for a clean win;
   - the number of lives, and what losing the boss does;
   - how the colony gains plots;
   - whether an augment attaches to a building type or to one card.
4. **Run it back and records** ([after-the-rework](ideas/after-the-rework.md), Tier 1 item 7) was proposed as a separate session. It doesn't depend on the battle.
5. **A release to `main`:** only when the user asks.

**Superseded by v2:**
- **The rework's open items:** the flyer army, the general against a swarm, the Rhizomorph's place, step B's prototypes and the colony-swarm direction.
- **Most of the after-the-rework proposals.**

They're closed by the new design or folded into R1's measurements and the milestones ([SPEC Appendix A](../SPEC.md#appendix-a-retired-v1-systems)). The open playtest items are in [playtest-feedback.md](playtest-feedback.md), with a v2 status on each.

## Recent work and where it lives

| Work | Where | State |
|---|---|---|
| SPEC v2 (2026-10-31) | [SPEC.md](../SPEC.md), the `feature/spec-v2` PR | Draft for the user's review; nothing built |
| P3 playtest (2026-10-31) | [playtest-feedback.md](playtest-feedback.md#2026-10-31-p3-the-combat-rework-the-user) | Done. The notes moved the game to v2 (F17–F22) |
| Rounds (Level 3) | [ideas/rounds.md](ideas/rounds.md), [#33](https://github.com/Swalliso/Sambattler/pull/33) | Adopted with changes as SPEC v2 |
| Combat rework P1 to P2 | [ideas/combat-rework.md](ideas/combat-rework.md), the backlog's P1 to P2 sections, [#35](https://github.com/Swalliso/Sambattler/pull/35) | Superseded by v2. Still behind `?proto=rework` until R2. Pinning, spore clouds, cleave, the Burster and the Rhizomorph carry into v2 |
| Flyers | [ideas/flyers.md](ideas/flyers.md), [#35](https://github.com/Swalliso/Sambattler/pull/35), [#36](https://github.com/Swalliso/Sambattler/pull/36) | In `rework`. In v2 they're an unlockable, with rule C as the starting rule |
| After-the-rework review (2026-10-31) | [ideas/after-the-rework.md](ideas/after-the-rework.md), evidence in [ideas/after-the-rework/](ideas/after-the-rework/README.md) | Proposals. Lives, run packs, augments and reading the enemy are folded into v2 |
| Pre-playtest UI fixes (2026-10-31) | [after-the-rework.md](ideas/after-the-rework.md#fixes-made-before-the-playtest), [#38](https://github.com/Swalliso/Sambattler/pull/38) | On `develop` |
| Outside notes brought in (2026-10-31) | [the design review](ideas/one-more-run-design-review.md), [fun and agency](ideas/fun-and-agency-research.md), [symbiotic colonies](ideas/symbiotic-colonies-slice.md) | Records, nothing adopted; closes OMR-12 |
| Engagement review (2026-10-28) | [engagement-review.md](engagement-review.md) | Diagnosis. Hold / Advance came out of it, the only v1 rule adopted from the reviews; v2 retires it |
| One More Run review (2026-10-30) | [ideas/one-more-run-review.md](ideas/one-more-run-review.md) | Set steps A to C |
| Step A: G3 per map, the diver, commander runs, placement spread | [backlog](balance-backlog.md#step-a-measurement-before-m6-2026-10-30), [#26](https://github.com/Swalliso/Sambattler/pull/26) | Done; the tools stay |
| Step B: hot start, Heartcap breach, bigger drafts | [backlog](balance-backlog.md#step-b-battle-feel-prototypes-2026-10-30), [#27](https://github.com/Swalliso/Sambattler/pull/27) | Built, off by default. Superseded by v2 |
| G3 on every map | [backlog](balance-backlog.md#g3-on-every-map-the-rewrite-2026-10-30), [#28](https://github.com/Swalliso/Sambattler/pull/28) | The v1 guardrail. v2 rewrites G3 for clashes (SPEC §12.3) |
| Second front: two-lane test maps | [backlog](balance-backlog.md#second-front-two-lane-test-maps-2026-10-30), [#29](https://github.com/Swalliso/Sambattler/pull/29) | Measured on test maps only |
| Counter matrix (the rework's P0) | [backlog](balance-backlog.md#counter-matrix-on-todays-rules-2026-10-30), [#31](https://github.com/Swalliso/Sambattler/pull/31) | A check in the experiment tool. Its bar becomes v2's main balance bar |
| Colony and swarm direction | [ideas/colony-swarm.md](ideas/colony-swarm.md), [#23](https://github.com/Swalliso/Sambattler/pull/23), [#25](https://github.com/Swalliso/Sambattler/pull/25) | Notes. Its neighbour rules feed v2's combos |
| Prototype saves on the dev site | `.claude/rules/storage.md`, [#34](https://github.com/Swalliso/Sambattler/pull/34) | On `develop` |

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

  Add `--checks counters` for the strict counter bar, and `path:value` overrides for variants. Results go in the backlog, and data changes go in `data/CHANGELOG-balance.md`.

## Starting a session

- Branch from `develop` (CLAUDE.md). Read this page, then SPEC §0.1 and the sections for your milestone.
- Rule changes and retunes across several units wait for the user's OK (`.claude/rules/balance.md`).
- Tests follow the spec: when v2 retires a system, its tests, goldens and guardrails go with it (CLAUDE.md).
- When your work lands or the user decides something, update this page.
