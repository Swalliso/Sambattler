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

- **Which battle:** SPEC v2's round battle is the design (§4–§7, §12). Since R2b's S3 the data and
  tools in these paths drive only the round battle; v1's keys stay in the data, doing nothing, until
  R2b's T129 (S12). v2's numbers get measured with R1's clash check and R2's round loop (SPEC §16),
  both on the round sim, and SPEC §11 holds their first guesses.
- **The user's standing call:** diagnose, measure and recommend, but a rule change (anything that
  changes a SPEC rule) or a retune across several units waits for their OK. A data tweak that fixes
  one guardrail is fine. Report a guardrail miss with its numbers instead of bending core rules to
  pass it.
- **Balance method** (SPEC §12.1): playtests decide what's fun; bots catch degenerate builds. The
  main bar is the counter matrix's: a strong build is fine if it has an answer.
- **Prototypes:** no new named presets (the user, 2026-11-03). A candidate rule is either a data change,
  measured with the `--proto path:value` override (which needs no code), or code on a short-lived branch,
  measured there and then merged as the default with the user's OK, or deleted. Any temporary switch names
  the session that removes it. `src/data/proto.ts` holds one preset since R2b's S4c, `bosslives`, which
  R2b's playtest (S14) adopts as data or deletes, and X8's two AI knobs go in S12 (T129) unless S11 shows a
  need. A spec naming any other preset is refused by the tools and shown as unknown on the page, which then
  saves the run nowhere (T061). Adopting a new rule is the user's call, and v2's milestones land on
  `develop` as the new default (CLAUDE.md).
- **Log every data change** in `data/CHANGELOG-balance.md`, newest first: what changed, the
  guardrail or measurement behind it, and whether the user approved it.
- **Goldens:** data changes move the golden hashes, so run `npm run golden -- update` and say so in
  the PR. Display text counts too: every battle copies the data's text into its state, so
  player-facing rewording goes in `src/ui/words.ts` until the next golden refresh.
- **Guardrails:** `npm run test:slow` asserts the round guardrails (SPEC §12.3, R2a's T119–T125); v1's
  went with its battle in R2b's S3. R2a's six known misses (T133: G1, G2, G3, G7, G8's mono clause and
  G16) are expected fails through R2b, as the user decided at R2b's S0 (T168): S14 tunes G1, G2 and G7,
  R3's copies take G3 and G8's mono clause, and R3's combos take G16's pairs. A code change keeps the
  rest passing and leaves those as they read.
- **Where results go:** v2's candidates and results go in `docs/balance-backlog.md`. v1's backlog
  is history, in `docs/archive/v1/balance-backlog.md`.
- **Sweeps:** `nodeContent()` (`tools/lib/content.ts`) is cached for the whole process, so a sweep
  that changes content per variant builds each variant with `protoContent(spec)` and never
  mutates the cached content.
