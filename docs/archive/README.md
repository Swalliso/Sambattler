# Archive: v1-era notes

On 2026-10-31, after the combat rework's P3 playtest, the game moved to [SPEC v2](../../SPEC.md) ([what changed](../../SPEC.md#01-what-changed-in-v2)). Everything in `v1/` was written for the v1 battle, which v2 retires. That battle had:
- continuous real time;
- a spawn timer on each building;
- column capture and forward building;
- Heartcap turrets;
- the rework's waves and Hold;
- one Heartcap for the whole run.

## How to use it

- **It's history and evidence:** why v2 made the choices it did, what was measured, and what was tried and failed.
- **Nothing here is current.** Don't take rules, numbers, plans or proposals from it. SPEC v2 is the design.
  - If something here still looks useful, bring it to the user as a proposal written against v2.
  - Write that proposal in [docs/ideas/](../ideas/README.md).
- **When to read it:**
  - when the user points a session here;
  - when a SPEC v2 section names a part of it as background;
  - when a session needs the evidence behind a v2 decision.

  Read only that part, for that purpose, and SPEC v2 wins wherever they differ.
- **The v1 spec** is at [commit aa37365](https://github.com/Swalliso/Sambattler/blob/aa37365/SPEC.md). v2 kept its section numbers, and [Appendix A](../../SPEC.md#appendix-a-retired-v1-systems) lists each retired system, what replaced it and why.
- **Links still work:**
  - each file keeps its git history;
  - links between archived files still resolve;
  - each file opens with an "Archived" note.

## What's in v1/

| File | What it is |
|---|---|
| [engagement-review.md](v1/engagement-review.md) | The diagnosis of the v1 battle (2026-10-28) that led to Hold / Advance and the reviews after it |
| [m3-plan.md](v1/m3-plan.md), [m4-plan.md](v1/m4-plan.md), [m5-plan.md](v1/m5-plan.md) | Plans and "As built" notes for milestones 3–5 |
| [balance-backlog.md](v1/balance-backlog.md) | v1's balance work: G3, the prototypes, steps A and B, the counter matrix, and the combat rework's P0–P2 |
| [ui-ux-plan.md](v1/ui-ux-plan.md) | The UI plan for v1's screens and battle HUD. SPEC v2 §10 replaces it for the battle; the run screens, settings and fit checks it set up are in the code and tests |
| [ideas/combat-rework.md](v1/ideas/combat-rework.md) | The combat rework (Level 2: waves and new tools), its prototype plan, and the P4 decision that moved the game to v2 |
| [ideas/rounds.md](v1/ideas/rounds.md) | The rounds paper design (Level 3), which v2 adopted with changes, and a survey of round-based auto-battlers |
| [ideas/flyers.md](v1/ideas/flyers.md) | Flyers and their reach rules (rule C) |
| [ideas/colony-swarm.md](v1/ideas/colony-swarm.md) | The colony and swarm direction. Its neighbour rules fed v2's combos |
| [ideas/one-more-run-review.md](v1/ideas/one-more-run-review.md), [ideas/one-more-run-design-review.md](v1/ideas/one-more-run-design-review.md) | The One More Run review, and the external design review it checked |
| [ideas/fun-and-agency-research.md](v1/ideas/fun-and-agency-research.md), [ideas/symbiotic-colonies-slice.md](v1/ideas/symbiotic-colonies-slice.md) | Two notes Codex wrote |
| [ideas/after-the-rework.md](v1/ideas/after-the-rework.md) and [ideas/after-the-rework/](v1/ideas/after-the-rework/README.md) | The after-the-rework review, with its ledger, measurements, playthroughs, proposals, screenshots and scripts |

The three web-research reports from the after-the-rework review are in [docs/research/](../research/README.md), because what they found about other games still applies.
