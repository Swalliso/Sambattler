# Balance backlog (v2)

Balance candidates, measurements and prototype results for [SPEC v2](../SPEC.md)'s round battle, newest first. It started on 2026-10-31, when the game moved to v2, and nothing is measured yet.

v1's backlog is archived at [docs/archive/v1/balance-backlog.md](archive/v1/balance-backlog.md). It covers G3, the rework's prototypes, steps A and B, and the counter matrix. Read it for evidence, not as open work.

## How entries work

- **Each entry gives:**
  - the date and the milestone;
  - what was measured: the command, the seeds and the variant;
  - the result;
  - the guardrail it touches (SPEC §12.3);
  - what's recommended.
- **Approval:** a rule change or a retune across several units waits for the user's OK (`.claude/rules/balance.md`).
- **Data changes** go in `data/CHANGELOG-balance.md`.
- **Balance method** (SPEC §12.1): playtests decide what's fun, and bots catch degenerate builds. The main bar is the counter matrix's: "A strong build isn't the bug. A build with no answer is."

## Open

- **R1, the clash check** (SPEC §16, §12.2): the first measurements on v2's rules. It settles §18.2 #7–#15:
  - squad sizes and the most supply a full colony fields;
  - whether mixed armies need a shield;
  - the Elder Sporeling's splash;
  - how emplacements fight;
  - where an oversized squad stands;
  - whether a squad keeps formation on the approach;
  - whether the muster counts toward the 45 s cap;
  - the counter sets, read from the clash matrix;
  - the sixth core archetype's candidates.

  It measures the `kept` preset (the pieces SPEC §1.3 #11 keeps), not v1's `rework` package.

## Until R2

- **The guardrails** in `npm run test:slow` are still v1's, and they measure the v1 battle.
  - Keep them passing after a code change.
  - Don't tune the v1 battle to improve them, because R2 replaces it.
  - A v1 miss isn't open work.
