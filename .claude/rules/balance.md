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

- **Which battle:** SPEC v2's round battle is the design (§4–§7, §12). Until milestone R2 lands, the
  data and tools in these paths drive the v1 battle, which v2 replaces. Don't tune the v1 battle or
  add prototypes to it unless the user asks. v2's numbers get measured with R1's clash check and
  R2's round loop (SPEC §16), and SPEC §11 holds their first guesses.
- **The user's standing call:** diagnose, measure and recommend, but a rule change (anything that
  changes a SPEC rule) or a retune across several units waits for their OK. A data tweak that fixes
  one guardrail is fine. Report a guardrail miss with its numbers instead of bending core rules to
  pass it.
- **Balance method** (SPEC §12.1): playtests decide what's fun; bots catch degenerate builds. The
  main bar is the counter matrix's: a strong build is fine if it has an answer.
- **Prototypes:** `src/data/proto.ts` holds v1's default-off knobs (`?proto=`), the combat rework
  among them. They stay measurable until R2 retires them. Adopting a new rule is the user's call,
  and v2's milestones land on `develop` as the new default (CLAUDE.md).
- **Log every data change** in `data/CHANGELOG-balance.md`, newest first: what changed, the
  guardrail or measurement behind it, and whether the user approved it.
- **Goldens:** data changes move the golden hashes, so run `npm run golden -- update` and say so in
  the PR. Display text counts too: every battle copies the data's text into its state, so
  player-facing rewording goes in `src/ui/words.ts` until the next golden refresh.
- **Guardrails:** until R2, G1–G8 and G11 in `npm run test:slow` are v1's, on the v1 battle. Keep
  them passing after a code change, but a v1 miss is no longer open work. SPEC v2 §12.3 lists the
  guardrails R2 brings in, and tests follow the spec: R2 retires v1's with the systems they check.
- **Where results go:** v2's candidates and results go in `docs/balance-backlog.md`. v1's backlog
  is history, in `docs/archive/v1/balance-backlog.md`.
- **Sweeps:** `nodeContent()` (`tools/lib/content.ts`) is cached for the whole process, so a sweep
  that changes content per variant builds each variant with `protoContent(spec)` and never
  mutates the cached content.
