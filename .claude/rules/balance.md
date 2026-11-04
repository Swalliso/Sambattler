---
paths:
  - "data/**"
  - "src/data/**"
  - "tools/balance.ts"
  - "tools/experiment.ts"
  - "tools/golden.ts"
  - "tools/lib/**"
  - "tests/slow/**"
  - "tests/golden/**"
  - "docs/balance-backlog.md"
---

# Balance and data changes

- **Which battle:** SPEC v2's round battle is the design (§4–§7, §12), and the data and tools in these
  paths drive only it. R2b's S12 removed v1's last keys and folded R2a's `rounds` blocks into §11.1's
  top-level names, so a `--proto` path names a key as `data/balance.json` does (`upgradeCostPct:400`).
  v2's numbers get measured with R1's clash check and R2's round loop (SPEC §16), both on the round sim,
  and SPEC §11 holds them.
- **The user's standing call:** diagnose, measure and recommend, but a rule change (anything that
  changes a SPEC rule) or a retune across several units waits for their OK. A data tweak that fixes
  one guardrail is fine. Report a guardrail miss with its numbers instead of bending core rules to
  pass it.
- **Balance method** (SPEC §12.1): playtests decide what's fun; bots catch degenerate builds. The
  main bar is the counter matrix's: a strong build is fine if it has an answer.
- **Prototypes:** no new named presets (the user, 2026-11-03). A candidate rule is either a data change,
  measured with the `--proto path:value` override (which needs no code), or code on a short-lived branch,
  measured there and then merged as the default with the user's OK, or deleted. Any temporary switch names
  the session that removes it. `src/data/proto.ts` holds no preset since R2b's S14 deleted `bosslives`, the
  last one, which R2b's playtest found changed nothing (T171); S12 deleted X8's two AI knobs, which S11
  measured as moving nothing. A path reaches a content entry by id (`building.`, `unit.`, `bot.`, `general.`,
  `faction.` and, since S12, `commander.`). A spec naming any other preset is refused by the tools and
  shown as unknown on the page, which then saves the run nowhere (T061). Adopting a new rule is the user's call, and v2's milestones land on
  `develop` as the new default (CLAUDE.md).
- **Log every data change** in `data/CHANGELOG-balance.md`, newest first: what changed, the
  guardrail or measurement behind it, and whether the user approved it.
- **Goldens:** data changes move the golden hashes, since a battle's library carries the balance and
  the content's numbers, so run `npm run golden -- update` and say so in the PR. A battle holds no text
  (R2-Q8), so player-facing wording lives in the data and moves no golden.
- **Guardrails:** `npm run test:slow` asserts the round guardrails (SPEC §12.3, R2a's T119–T125, R2b's
  T119–T122); v1's went with its battle in R2b's S3. Ten known misses are expected fails through R2b
  (T168), each printing its numbers and failing once it passes:
  - R2a's six (T133): G1, G2, G3, G7, G8's mono clause and G16, as the user decided at R2b's S0;
  - G4's round-9 clause and G5, since S5b's upgrades (the user, 2026-11-03 and 2026-11-04);
  - G14 and G15, outside their bands on Cordis's runs after S12's retune (the user, 2026-11-04).
  S14 tunes G1, G2, G7, G4's round-9 clause and G5 and reworks Cordis for G14 and G15 (T169), R3's
  copies take G3 and G8's mono clause, and R3's combos take G16's pairs. A code change keeps the rest
  passing and leaves those as they read.
- **Where results go:** v2's candidates and results go in `docs/balance-backlog.md`. v1's backlog
  is history, in `docs/archive/v1/balance-backlog.md`.
- **Sweeps:** `nodeContent()` (`tools/lib/content.ts`) is cached for the whole process, so a sweep
  that changes content per variant builds each variant with `protoContent(spec)` and never
  mutates the cached content.
