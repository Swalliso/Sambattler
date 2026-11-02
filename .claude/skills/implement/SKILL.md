---
name: implement
description: Work one session of a SPEC v2 milestone from docs/tasks/ (spec-kit's implement step). It checks the session's gate, branches, works and ticks the tasks, and finishes with verify and the docs. Use when asked to "implement R1 S1", "do the next session", or to start work from a milestone's task list.
argument-hint: "<milestone> <session>, for example: r1 s1 (leave empty for the next session whose gate is clear)"
---

# Work one session of a milestone's task list

`docs/tasks/README.md` is the source of truth: its "Running a session" section is the procedure,
and its task format explains the markers. Read it first. This skill is that procedure, step by step.

1. **Pick the row.** With an argument, it's that row of the milestone's **Sessions** table
   (`docs/tasks/<milestone>.md`; the README's milestone table maps names to files). Without one,
   read `docs/status.md`'s "Next session" and the README's "Where to start", and propose the first
   row whose gate is clear. Confirm it with the user before branching.
2. **Orient.** `git fetch`, then read `origin/develop`'s `docs/status.md`, the task list's
   **Read first**, **Before you start** and **Technical context**, and the row's tasks. Read the
   SPEC sections the tasks cite. Don't take design input from `docs/archive/`.
3. **Check the gate.** Everything in the row's **Gate** column must be true on `origin/develop` (or
   on the integration branch the row names): the named sessions merged, and each named decision
   answered in its `docs/tasks/clarify.md` block's **Decision** line. If something is missing, say
   what, and stop. A missing decision can be settled now with `/clarify`, if the user wants.
4. **Branch.** `git switch --no-track -c <the row's branch> origin/develop`, or from the
   integration branch the row names.
5. **Work the tasks in order.**
   - Tests first, then the code that passes them (CLAUDE.md: tests follow the spec).
   - `[P]` tasks touch different files and may go to parallel subagents. Give each one the task
     line, its files and its SPEC sections.
   - Tick each task (`- [x]`) in the same commit as its work.
   - At each **Checkpoint**, run its command and fix what fails before going on.
   - At a `[USER]` task, or a `⛔` whose decision is still open, stop and ask. Put the
     recommendation from clarify.md first, and record the answer as the README's "Settling
     decisions" says.
   - A rule change or a retune across several units waits for the user (`.claude/rules/balance.md`),
     even when a task seems to call for it.
6. **Fix the list when it's wrong.** If the code or a result shows a task is wrong, missing or out of
   order, fix the task list in the same branch and say why in the PR.
7. **Finish.**
   - Run `npm run verify`, plus the browser tests, slow suite or bench if the row or checkpoint asks.
   - Update `docs/status.md`: what landed, and the next session with what it waits on.
   - The milestone's last session also writes the plan's **As built** and runs SPEC §16's
     verification.
   - Push and open the PR into `develop` (or the integration branch), ending the body with the
     attribution line, and turn on auto-merge as CLAUDE.md's "Pushing and merging" says. A PR
     that changes `src/sim/`, `src/data/` or `tools/lib/` waits for a review instead.
   - End by telling the user what landed, anything left undone, and which rows can start next.
