---
name: tasks
description: Write or refresh a SPEC v2 milestone's task list in docs/tasks/ from SPEC.md, its agreed plan and docs/tasks/clarify.md (spec-kit's tasks step). Use after a milestone's plan is agreed, when R1's results or a decision change a later milestone, or when asked to "refresh the R2a tasks".
argument-hint: "<milestone>, for example: r2a"
---

# Write or refresh a milestone's task list

`docs/tasks/README.md`'s "Refreshing a task list" section is the procedure, and its task format
explains the line format. Follow both exactly. This skill is that procedure, step by step.

1. **Read:**
   - SPEC §16 for the milestone (scope, Not in, Done when, Verification), and every section its
     scope cites;
   - `docs/<milestone>-plan.md`;
   - the milestone's blocks in `docs/tasks/clarify.md`, and its open findings in
     `docs/tasks/spec-analysis.md`;
   - the earlier milestones' **As built**;
   - the current task file;
   - the code each task lands in. Check every path you name exists, or mark it `(new)`.
2. **Keep what's done.** A ticked task keeps its box and its ID. New tasks take the next free IDs,
   placed where they run. Don't renumber.
3. **Keep the shape:**
   - stories, one per increment a player or a tool can see, each with a priority (P1 is the smallest
     useful slice) and an independent test;
   - phases: Setup, Foundational, one per story in priority order, then Polish. Each ends with a
     **Checkpoint** naming the command that must pass;
   - task lines in the README's format: test tasks first in each story, `[USER]` where the user is
     needed, and `⛔ <ref>` for anything waiting on a decision or a result;
   - a **Coverage** table mapping every scope bullet, Done-when line and verification step to its
     tasks, and every retired system's code, tests, goldens, guardrails, UI, Help and tips to the
     tasks that remove them;
   - a **Sessions** table of about a day's work per row, each ending in a PR that keeps
     `npm run verify` green and the game playable, with its branch and its gate.
4. **Check before you finish:**
   - every task has a backticked path and a SPEC section;
   - no two `[P]` tasks in one phase touch the same file;
   - dependencies point backward;
   - the Sessions table covers every task;
   - every `⛔` ref has a block in clarify.md;
   - every cross-file task ref (such as `R2b/T043`) exists.
5. **Update** the README's milestone table and "Where to start", and `docs/status.md`, if the
   sessions changed.
