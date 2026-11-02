# Tasks for SPEC v2

SPEC v2, broken into task lists that later sessions work through one row of a Sessions table at a time. Written on 2026-11-01 from a review of SPEC v2 ([#39](https://github.com/Swalliso/Sambattler/pull/39)) in which ten reviewers read the spec against the code and a skeptic checked each finding.

**Most of these lists are drafts.** R1's is done, and R2a's was refreshed at its S0 on 2026-11-02. The lists after it were written before R1's results and before the user's decisions in [clarify.md](clarify.md), and each milestone's S0 session refreshes its list once its plan is agreed (see [Refreshing a task list](#refreshing-a-task-list)).

## Where to start

| Now | Session | Waits on |
|---|---|---|
| 1 | **R2a S5** in [r2a-battle-in-rounds.md](r2a-battle-in-rounds.md): the kept combat rules copied and stripped, and emplacements (T035–T041). Started 2026-11-02 | R2a S4 ([#76](https://github.com/Swalliso/Sambattler/pull/76)), merged |
| 2 | **R2a S6**: per-squad stats, Begin with the arrival and its shield, the muster, and a lane's end (T042, T046, T043–T045) | S5 merged |

R1, R4a, records-1 and R2a S0–S4 are done. The sessions after S6 are in R2a's Sessions table.

## Milestones

| Milestone | Task list | Sessions | Starts | Lands |
|---|---|---|---|---|
| R1, the clash check | [r1-clash-check.md](r1-clash-check.md), plan [r1-plan.md](../r1-plan.md) | S0–S8 | Done 2026-11-02 | One PR per session into `develop`. No rule changes, so no golden moves |
| R2a, a battle in rounds | [r2a-battle-in-rounds.md](r2a-battle-in-rounds.md), plan [r2a-plan.md](../r2a-plan.md) | S0–S21 (S3 and S10 in two parts, with S14b) | Now: S5 (S0–S4 done 2026-11-02) | Beside v1 on `develop`, behind a preview entry (X2). Ends with a playtest gate on the dev site |
| R2b, the run in rounds | [r2b-run-in-rounds.md](r2b-run-in-rounds.md) | S0–S14 (with S1b and S4b) | After R2a's playtest gate | S1–S4 and S1b as sub-PRs into `feature/r2b-cutover`, merged into `develop` at S4b once a whole run plays and v1 is gone; S5–S14 one PR each into `develop`. R2b S0 may drop the cutover branch, since X2 lets `develop` switch wholly to v2 |
| R3, the kit | [r3-kit.md](r3-kit.md) | S0–S15 | After R2b | One PR per session into `develop` |
| R4a, shapes on the field | [r4-readable-armies.md](r4-readable-armies.md), part 1 | R4a-S0–S5 (with S2b) | Now, beside R1 (X3). Lands before R2a's playtest | One PR per session into `develop` |
| R4b, readable cards | [r4-readable-armies.md](r4-readable-armies.md), part 2 | R4b-S0–S7 | After R3 | One PR per session into `develop` |
| Run it back, records-1 and records-2 | [run-it-back.md](run-it-back.md), plan [run-it-back-plan.md](../run-it-back-plan.md) | S0–S2, then S3–S5 (with S3b) | records-1 now (X10, agreed 2026-11-01); records-2 after R2b | One PR per session into `develop` |
| M6, meta-progression | [m6-meta-progression.md](m6-meta-progression.md) | S0–S9 | After R3 and R4b, in SPEC §16's order (records-1 if it has landed) | One PR per session into `develop` |
| M7, the Gray Rot and content | [m7-gray-rot-and-content.md](m7-gray-rot-and-content.md) | S0–S7 | After M6 | One PR per session into `develop` |
| M8, release | [m8-release.md](m8-release.md) | S0–S7 | After M7 | S7 is the release PR into `main`, only when the user asks |

The order, with the gates the user holds:

```
R1 ─► R1 review gate ─► R2a ─► R2a playtest ─► R2b ─► R3 ─► R4b ─► M6 ─► M7 ─► M8 ─► release (user asks)
R4a ─────────────────────────► (merged before R2a's playtest)
records-1 ─────────────────────────────────────► records-2 (after R2b)
```

X1–X8 and X10 are decided: X3 and X10 on 2026-11-01, X1, X2, X4 and X5 on 2026-11-02, and X6–X8 at R2a S0 the same day. X9 waits for R3's plan.

## How this folder works

The task lists borrow [spec-kit](https://github.com/github/spec-kit)'s flow and fit it to this repo's own documents:

| spec-kit step | Here |
|---|---|
| constitution | [CLAUDE.md](../../CLAUDE.md), [AGENTS.md](../../AGENTS.md) and `.claude/rules/`: how we work, the checks, the branch rules |
| specify | [SPEC.md](../../SPEC.md) v2: the rules, and each milestone's scope and verification (§16) |
| clarify | [clarify.md](clarify.md): the decisions each milestone needs from the user before it builds, with a recommendation for each |
| plan | `docs/<milestone>-plan.md` in CLAUDE.md's format (Goal, Scope, Stand-ins, Steps, Verification, Open questions, As built), agreed with the user before building |
| tasks | one file per milestone in this folder |
| analyze | [spec-analysis.md](spec-analysis.md): the 209 problems found in SPEC v2 while breaking it down, checked against the code, and where each one is handled |
| implement | one session per row of a milestone's **Sessions** table, ending in a PR |
| converge | the milestone's **Verification** block in SPEC §16, run in its last session |

### Task format

```
- [ ] T012 [P] [US2] Add the clash row to the counter report in `tools/lib/balance.ts` (§12.2)
```

- `- [ ]` becomes `- [x]` when the task is done, in the same commit as the work.
- `T012` numbers the task in its file, in execution order. From another file, write `R1/T012`.
- `[P]` means it can run in parallel with the other `[P]` tasks of its phase: different files, and no dependency on an unfinished task.
- `[US2]` ties a task to a story in the file's **Stories** table. Setup, foundational and polish tasks have none.
- `[USER]` means the task needs the user: a decision, a review gate or a playtest. A session stops there and asks.
- `⛔ X5` or `⛔ §18.2 #32` names the decision a task waits on (its block in [clarify.md](clarify.md)), and `⛔ R1 results` names a result. Don't start the task until that's settled. A ⛔ on a ref whose block carries a dated `R1 measures: …` (or `<milestone> part agreed: …`) line is satisfied by that line for that milestone's tasks, and so is a ref the list's **Before you start** says the milestone builds on provisionally (R1's §18.2 #51).
- Every task names the files it touches and cites the SPEC section that holds its rule. A file the milestone creates is marked `(new)`.
- **Tests follow the spec** (CLAUDE.md): test tasks come first in a story, and a story isn't done until its tests pass.

Each story says how to test it on its own, and each phase ends with a **Checkpoint** that has to hold before the next phase starts.

## Running a session

Start a new session in its own worktree and run `/implement r1 s1`, or `/implement` alone for the next row that's ready (`.claude/skills/implement/`). An agent without the skill can be given the row in words: *"Read docs/status.md and docs/tasks/README.md, then implement R1 session S1 from docs/tasks/r1-clash-check.md."* Either way, the session:

1. **Orients.** Reads [docs/status.md](../status.md), then the task list's **Read first** and **Before you start** sections, its **Technical context**, and the session's row and tasks. It reads the SPEC sections the tasks cite, not the archive.
2. **Checks the gate.** Everything in the row's **Gate** column has to be true on `origin/develop` (or the integration branch): the named sessions merged, and the named decisions recorded in their clarify.md block's **Decision** line (or satisfied as the ⛔ bullet under [Task format](#task-format) says). If something is missing, the session says what and stops. It doesn't build on a recommendation the user hasn't agreed when a task is marked ⛔, except where that bullet allows.
3. **Branches.** `git fetch`, then `git switch --no-track -c <the row's branch> origin/develop`. R2b's S1–S4 and S1b branch from `origin/feature/r2b-cutover` instead.
4. **Works the tasks in order.**
   - Tests first, then the code that passes them.
   - `[P]` tasks may go to parallel subagents, since they touch different files.
   - Each task is ticked in the same commit as its work.
   - At each **Checkpoint**, run its command and fix what fails before going on.
   - At a `[USER]` task, stop and ask. Record the answer as [Settling decisions](#settling-decisions) says.
5. **Fixes the list when it's wrong.** If the code or a result shows a task is wrong, missing or in the wrong order, the session fixes the task list in the same PR and says why in the PR. A rule change or a retune still waits for the user (`.claude/rules/balance.md`).
6. **Finishes.**
   - `npm run verify` passes, plus the checkpoint's own commands (browser tests, the slow suite or a bench where the row says so).
   - The game still plays on `develop`.
   - [docs/status.md](../status.md) says what landed and names the next session.
   - A milestone's last session also writes the plan's **As built** and runs SPEC §16's verification for it.
   - The session pushes and opens its PR into `develop` (or the integration branch) when the user asks, as CLAUDE.md says, and never merges on its own.

Sessions are sized at about a day of focused work. Two small adjacent rows can share one session and one PR if the user agrees. A row that turns out too big is split, and the Sessions table updated in the same PR.

## Working rhythm

- **One session per row.** Each row starts in a new session with its own worktree and ends in a PR. A long conversation gets summarized and loses detail, while a fresh session starts from these files. A hub conversation can start sessions and read their reports, but it doesn't do the implementation.
- **Parallel only where the lists allow it.** Now that's R1, R4a and records-1. Later, it's the rows whose Gate says "may run beside".
- **Batch the decisions.** Plan sessions and gates go faster with `/clarify` and "take the recommendations except …".
- **Merging.** A session merges its own PR into `develop` only if the user said so when starting it, for example "merge when green". Small neighbouring rows can share a PR. Nothing touches `main` until the user asks for a release.
- **When a hub runs the sessions** (since 2026-11-01): each session pushes its branch, opens its PR and turns on auto-merge itself (CLAUDE.md's "Pushing and merging", since 2026-11-02). The hub reviews each PR that changes `src/sim/`, `src/data/` or `tools/lib/` against its tasks, then turns on that PR's auto-merge. Each session edits only its own lines in `docs/status.md`. The hub keeps the "Recent work" table and "Where to start", since parallel PRs collide there.
- **Ultracode and workflows where breadth or an adversarial check pays:**
  - a skeptic pass on each plan before the user agrees it;
  - R1 S7's analysis of its measurement runs;
  - each milestone's verification session;
  - `/code-review` on the big PRs: R2a's state machine and clash core, and R2b's deletion of v1.

  Routine sessions run without them.
- **Playtests decide the design:** R2a's, R2b's, R3's, R4b's and M8's run length. Everything after each one waits for it.

## Settling decisions

[clarify.md](clarify.md) holds every call the user needs to make, in the order the work needs them. Each block has the question, SPEC's first guess, a recommendation with its evidence, the alternatives, and what it blocks. Some recommendations disagree with SPEC's first guess, and say why.

To settle them, run `/clarify <milestone or refs>`, for example `/clarify r2a` or `/clarify X1 X2 X3 X10` (`.claude/skills/clarify/`). The session:

1. Reads the blocks for the milestone, the §18.2 rows they name, the SPEC sections they cite and the milestone's findings in [spec-analysis.md](spec-analysis.md).
2. Asks the user a few at a time, with the recommendation as the first option and the realistic alternatives after it.
3. Records each answer:
   - in the block's **Decision** line, with the date;
   - in SPEC: the section loses its **Open:** marker and states the rule, and a §18.2 row is marked "(closed)" with the decision and the date, keeping its number (SPEC §0);
   - in [docs/status.md](../status.md);
   - in the task list, if the answer changes a task.

It changes no code, and commits the doc changes on the milestone's plan branch or a `docs/…` branch.

## Refreshing a task list

Each milestone's S0 session writes `docs/<milestone>-plan.md` (R1's is already drafted, so R1's S0 agrees it and writes its calls into SPEC), settles the milestone's decisions, and then refreshes its task list:

1. **Reads** SPEC §16 for the milestone (scope, Not in, Done when, Verification) and every section its scope cites; the agreed plan; the milestone's blocks in clarify.md; its open findings in spec-analysis.md; the earlier milestones' **As built**; and the code each task lands in. Every path it names has to exist or be marked `(new)`.
2. **Keeps what's done.** A ticked task keeps its box and its ID. New tasks take the next free IDs, and nothing is renumbered.
3. **Keeps the shape:**
   - stories, one per increment a player or a tool can see, with a priority (P1 is the smallest useful slice) and an independent test;
   - phases: Setup, Foundational, one per story in priority order, then Polish;
   - a **Coverage** table mapping every scope bullet, Done-when line and verification step in SPEC §16 to its tasks, and every retired system's code, tests, goldens, guardrails, UI, Help and tips to the tasks that remove them;
   - a **Sessions** table whose rows each end in a PR that keeps `npm run verify` green and the game playable.
4. **Checks** that every task has a path and a SPEC section, no two `[P]` tasks in a phase share a file, dependencies point backward, and the Sessions table covers every task.
5. **Updates** the milestone table above and [docs/status.md](../status.md) if the sessions changed.

`/tasks <milestone>` runs these steps (`.claude/skills/tasks/`).
