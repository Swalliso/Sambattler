---
name: clarify
description: Walk the user through the open decisions a SPEC v2 milestone needs before it builds (docs/tasks/clarify.md and SPEC §18.2), and record the answers (spec-kit's clarify step). Use when asked to "settle the R2a questions" or "go through the open decisions", or when /implement stops on a ⛔ gate.
argument-hint: "<milestone or refs>, for example: r2a, or X1 X2 X3 X10"
---

# Settle a milestone's open decisions with the user

`docs/tasks/README.md`'s "Settling decisions" section is the procedure. This skill is that
procedure, step by step.

1. **Read** `docs/tasks/clarify.md`'s section for the milestone (or the named refs), the §18.2 rows
   it lists, the SPEC section each block names, and the milestone's findings in
   `docs/tasks/spec-analysis.md`. Skip blocks whose **Decision** line is already filled in.
2. **Offer the fast path.** Tell the user how many blocks are open and list them by ref and short
   title. Ask whether they want to take every recommendation except the ones they name, or go
   through the blocks one by one.
3. **Ask** a few at a time, at most 4 per AskUserQuestion call. For each question:
   - state it in one sentence, with SPEC's first guess;
   - make the clarify.md recommendation the first option, marked "(Recommended)";
   - offer the realistic alternatives, not every possible one;
   - where the recommendation disagrees with the first guess, say why in one line, with the
     evidence (the user wants to be challenged where it's warranted).
4. **Record** each answer:
   - in the block's **Decision** line, with the date;
   - in SPEC: the section that holds the rule loses its **Open:** marker and states the rule, and a
     §18.2 row is marked "(closed)" with the decision and the date, keeping its number (SPEC §0);
   - in `docs/status.md`'s "Waiting on the user";
   - in the milestone's task list, if the answer changes a task. A big change means a refresh with
     `/tasks <milestone>`.
5. **Don't change code.** Commit the doc changes on the milestone's plan branch or a `docs/…`
   branch. Push and open a PR only when the user asks.
