# Proposals and critiques: the five lenses

> **Archived: v1 era.** Written before [SPEC v2](../../../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../../../README.md)).

Evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): the 48 proposals that review started from, and the critiques that checked them. Written by agents during that review; nothing here is adopted. Recovered from the session transcript, so raw outputs weren't kept and only some screenshots were.

**The review supersedes these files.** Its [Appendix A](../../after-the-rework.md#appendix-a-every-surviving-proposal) gives each proposal's final verdict, its scores and where it went in the review's tiers, and lists what was dropped or added. Where a file here disagrees with the review, the review wins. Read these files for the evidence and detail behind a verdict.

## The lenses

| Lens | What it looks at | Proposals | Critique |
|---|---|---|---|
| **A, the battle** | One battle, minute by minute: the opening, the 20 s beat, timing verbs, comebacks, the Heartcap cliff, the storm, the Decision, merging, spare gold | [a-battle.md](a-battle.md), A1–A9 | [a-battle-critique.md](a-battle-critique.md) |
| **B, builds** | Build expression and run-to-run variety: composition, cards, commanders, the card pool | [b-builds.md](b-builds.md), B1–B10 | [b-builds-critique.md](b-builds-critique.md) |
| **C, the run** | The run as a whole, and why someone starts another: run HP, battle 1, the boss, the route, rewards, records | [c-run.md](c-run.md), C1–C10 | [c-run-critique.md](c-run-critique.md) |
| **D, feel** | Feel, readability and learning: whether the player can see, hear and learn what happens | [d-feel.md](d-feel.md), D1–D10 | [d-feel-critique.md](d-feel-critique.md) |
| **E, opposition** | What the player plays against: the generals, the counter cycle, elites, the boss, the Gray Rot | [e-opposition.md](e-opposition.md), E1–E9 | [e-opposition-critique.md](e-opposition-critique.md) |

## How proposals and critiques relate

1. **One agent per lens wrote the proposals.**
   - Each read the same evidence, the reports in the [folder above](../): the measurements, the two playthroughs, the rework's state, battle feel, the run loop, the ledger and the research. Some measured something new.
   - Each file opens with a diagnosis, then ranks its proposals. A proposal gives the problem, the change, how to build it, how to test it, its ledger history, sources and risks.
2. **A second agent per lens critiqued them.**
   - It checked the claims against the code, the data and the evidence, and re-measured where it could.
   - It gave every proposal a verdict (keep, revise or drop), impact and confidence from 1 to 5, and an effort from S to XL.
   - Each critique notes overlaps with the other lenses and ends with what its lens missed.
3. **A reconciler merged the five pairs** into a draft roadmap, and a final pass checked it. The result is [After the combat rework](../../after-the-rework.md). The draft and the check weren't kept, since the review replaces them. When a file here mentions "the reconciler", it means this step.

So a proposal is the first version, its critique says what held up, and Appendix A says what became of it.

## IDs

- **A1, B3, E6 …** are this review's proposals, numbered within each lens. They aren't the [balance backlog](../../../balance-backlog.md)'s presets of the same names (A1–A3, B1–B4, D1, E1 …). One file uses both: in [e-opposition.md](e-opposition.md), the "A1–A3" listed as measured and failed are the backlog's presets.
- **A1, A16, E21 … after "research" or "practice"** are items in the research reports, not proposals.
- **K0, K1 and K2 in the keystone proposal** (B2 and its critique) are the keystone offers. Everywhere else, **K1–K6 and K-Hold** are the known issues in [rework-state.md](../rework-state.md).
- **G1–G12 after "battle-feel"** are that report's gaps. Otherwise G1–G11 are the guardrails (SPEC §12.3).
- **ER-2c, OMR-8, F11 and the other ledger IDs** (ER, DR, OMR, CS, F, CR, RD, FL, BB, SP, CX) have rows in the [ledger](../ledger.md). F1–F16 are [playtest feedback](../../../../../playtest-feedback.md) items; **F-1 to F-10**, with a hyphen, are the newcomer's findings in [playthrough-newcomer.md](../playthrough-newcomer.md).
- **P3 Q1–Q4** are the questions of the combat rework's [P3 playtest](../../combat-rework.md#p3-playtest).

## Reading them

- **Numbers come from bots** unless a playthrough is named, and bots aren't people. Code line numbers are as of `ef2e133`.
- **"The review's evidence reports"** are the reports in the folder above.
- **"Not in the repo"** means not in the repo's docs before this review. Some of what those lines point to, such as the research reports, is now in this folder.
- **Scripts** that survived are in [scripts/](../scripts/) and linked where a file cites them. They were scratch scripts, not repo tools.
- **"(raw output not kept)"** marks the JSON, logs and tables lost with the session's scratch folder.
- **Screenshots** are named, not linked:
  - `SS/<name>` is from the newcomer's playthrough;
  - `b1_…`, `r2b1_…` and `sb_…` are the strategist's;
  - `rw-…` are battle-feel captures.

  The few that were kept are listed in [screenshots/README.md](../screenshots/README.md).

**Corrected since** (the files keep their original figures):
- An Elder has ×7.84 a base unit's HP and damage (`tierStatMult` 2.8, squared), not the ×6.25 that some files quote from SPEC §5.5's stale table.
- The newcomer's six failed placements were 1–19 gold short (one was 181 of 200), not 1–10.
