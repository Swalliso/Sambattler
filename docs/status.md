# Where things stand

Updated 2026-10-31, at `develop` `56386c1`. This is the hand-over page. It covers what we're working on, what's waiting on the user's decision, and where each piece lives. Update it when work lands or the user decides something. Keep the detail in the docs it links to.

## In short

- **The game:** Milestones 1–5 are built.
  - `main` has M1–M4 and the UI work.
  - M5 (commanders and powers) is only on `develop` ([#22](https://github.com/Swalliso/Sambattler/pull/22)), along with everything below.
- **Since 2026-10-30 the focus is how battles feel,** not new milestones.
  - The [engagement review](engagement-review.md) and the [One More Run review](ideas/one-more-run-review.md) found that one unit type decides too many battles: an army built from one building beats a mixed one (G3).
  - That led to the [combat rework](ideas/combat-rework.md).
- **Now: the rework's playtest (P3),** on the dev site with `?proto=rework`.
  - All of it is on `develop` behind prototype settings that are off by default, so without `?proto=` the dev site plays like M5.
- **Next: P4.** The user decides what to adopt from the playtest and the measurements.
  - M6–M8's content waits on that, since it will be written for the combat model that's adopted.

## The playtest (P3)

- **Play** at https://swalliso.github.io/Sambattler/dev/?proto=rework.
  - A prototype run saves on the dev site under its own keys ([#34](https://github.com/Swalliso/Sambattler/pull/34)), apart from the real save, so closing the tab doesn't lose it.
- **What `rework` turns on** (`src/data/proto.ts`; each piece also has a preset of its own):
  - **waves:** units leave together on a 20 s beat, and a lane's wave of two or more unit types gets a shield worth 20% of each unit's HP;
  - **pinning:** a ranged unit with an enemy beside it attacks at ×0.35;
  - **call for help:** nearby idle units turn on whatever attacks a friend;
  - **two new units:**
    - the Rhizomorph tunnels under the front;
    - the Burster rolls into a clump of enemies and bursts into a spore cloud;
  - **the Elder Sporeling** loses its splash;
  - **the Sporestorm** grows waves 20% a stack;
  - **the general's swarm read:** the adaptive general now reads a merging swarm as a swarm;
  - **flyers:** the Driftling and its Drift Stalk. Under rule C every unit can hit a flyer, but ground melee deals ×0.5. The Mortar's shells and Burster bursts can't hit one, and flyers hold no ground.
- **The playtest questions** are in [P3](ideas/combat-rework.md#p3-playtest).
- **Known issues going in:**
  - battle 1 is harder with Armilla and Cordis;
  - falling back early is a big edge;
  - there are still no comebacks;
  - the general doesn't answer a swarm;
  - an army of only flyers is still strong;
  - the Rhizomorph may not earn its place.
- **Where the package measures** (backlog, [After P2](balance-backlog.md#after-p2-the-swarm-read-and-flyers)):
  - **the strict counter bar passes:** every strong one-building army has an answer that wins at least 60% on every map;
  - **battle length (G4) passes:** median 8:04, with 11% of battles ending in a Decision;
  - **the mono-build check (G3) fails** on three armies, each built from one building, against `bot:balanced` (mean / worst map, limit 55 / 60):

    | Army | G3 |
    |---|---|
    | Sporeling | 83 / 86 |
    | Drift Stalk | 72 / 90 |
    | Veilstalker | 69 / 80 |
- **Playtest notes go in** [playtest-feedback.md](playtest-feedback.md), newest first, linked to the guardrail or setting they touch.

## Waiting on the user

1. **P4, after the playtest:** adopt the pieces that carry the result, iterate on the numbers, or move to Level 3.
   - Each adopted piece is a SPEC change with a golden refresh.
   - Level 3 is [rounds](ideas/rounds.md), a paper design that isn't built.
2. **The flyer army:** an army of only Drift Stalks still beats `bot:balanced` 72% under rule C.
   - The two fixes are a Driftling retune, or an Anti-Air counter for the general ([flyers.md](ideas/flyers.md)).
3. **The general against a swarm:** it now reads the swarm right, but its counters to a swarm aren't the swarm's answer.
   - It builds Capguards, Burster Pods and Tunnels; the answer the counter matrix found is Sporeling + Veilstalker.
   - It beats mono Sporeling 24% of the time.
   - Teaching it the answer is undecided. Don't start it unasked.
4. **The Rhizomorph** carries nothing measured. Whether it stays is P4's call.
5. **Step B's battle-feel prototypes** (`hotstart`, `bigdrafts`, `breach`) are built and off by default.
   - They wait on a playtest of their own ([backlog](balance-backlog.md#step-b-battle-feel-prototypes-2026-10-30)).
6. **The colony-swarm direction** and Step C's network test are parked behind the rework.
   - See [colony-swarm.md](ideas/colony-swarm.md) and the One More Run review's [suggested path](ideas/one-more-run-review.md#suggested-path).
7. **The open playtest items F1–F16** in [playtest-feedback.md](playtest-feedback.md). Most wait on the user.
8. **A release to `main`:** M5 and whatever P4 adopts, only when the user asks.

## Recent work and where it lives

| Work | Where | State |
|---|---|---|
| Engagement review (2026-10-28) | [engagement-review.md](engagement-review.md) | Diagnosis. Hold / Advance came out of it, the only prototype adopted so far |
| One More Run review (2026-10-30) | [ideas/one-more-run-review.md](ideas/one-more-run-review.md) | Set steps A to C |
| Step A: G3 per map, the diver, commander runs, placement spread | [backlog](balance-backlog.md#step-a-measurement-before-m6-2026-10-30), [#26](https://github.com/Swalliso/Sambattler/pull/26) | Done; the tools stay |
| Step B: hot start, Heartcap breach, bigger drafts | [backlog](balance-backlog.md#step-b-battle-feel-prototypes-2026-10-30), [#27](https://github.com/Swalliso/Sambattler/pull/27) | Built, off by default, waits on a playtest |
| G3 on every map | [backlog](balance-backlog.md#g3-on-every-map-the-rewrite-2026-10-30), SPEC §12.3, [#28](https://github.com/Swalliso/Sambattler/pull/28) | Adopted as the guardrail |
| Second front: two-lane test maps | [backlog](balance-backlog.md#second-front-two-lane-test-maps-2026-10-30), [#29](https://github.com/Swalliso/Sambattler/pull/29) | Measured on test maps only |
| Counter matrix (the rework's P0) | [backlog](balance-backlog.md#counter-matrix-on-todays-rules-2026-10-30), [#31](https://github.com/Swalliso/Sambattler/pull/31) | A check in the experiment tool |
| Combat rework P1 to P2 | [ideas/combat-rework.md](ideas/combat-rework.md), the backlog's P1 to P2 sections, [#35](https://github.com/Swalliso/Sambattler/pull/35) | In playtest |
| Flyers | [ideas/flyers.md](ideas/flyers.md), [#35](https://github.com/Swalliso/Sambattler/pull/35), [#36](https://github.com/Swalliso/Sambattler/pull/36) | In `rework`, under rule C |
| Rounds (Level 3) | [ideas/rounds.md](ideas/rounds.md), [#33](https://github.com/Swalliso/Sambattler/pull/33) | Paper design, the fallback |
| Colony and swarm direction | [ideas/colony-swarm.md](ideas/colony-swarm.md), [#23](https://github.com/Swalliso/Sambattler/pull/23), [#25](https://github.com/Swalliso/Sambattler/pull/25) | Notes only, parked |
| Prototype saves on the dev site | `.claude/rules/storage.md`, [#34](https://github.com/Swalliso/Sambattler/pull/34) | On `develop` |

## Measuring the package

These commands come from `tools/experiment.ts`, whose header comment documents every option:
- **G3 and battle length:**

  ```bash
  npm run experiment -- --proto rework --checks g3,g4 --g4seeds 200 --workers 8
  ```

- **The strict counter bar:** `--checks counters`.
- **Variants:**
  - add `path:value` overrides, such as `--proto rework,flying.reachSupply:2,flying.meleeMult:1` for the flyers' reach rule;
  - `null` removes a setting, as in `rework,pinned:null`;
  - removing waves also removes the shields and the storm, which need them.
- **Where results go:** the backlog, with data changes in `data/CHANGELOG-balance.md` (CLAUDE.md).

## Starting a session

- Branch from `develop` (CLAUDE.md). Read this page, then the design doc for your thread.
- Rule changes and retunes across several units wait for the user's OK (`.claude/rules/balance.md`).
- When your work lands or the user decides something, update this page.
