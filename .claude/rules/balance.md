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

- **The user's standing call:** diagnose, measure and recommend, but a rule change (anything that
  changes a SPEC rule, like §5.2's advance rules) or a retune across several units waits for their
  OK. A data tweak that fixes one guardrail is fine. Report a guardrail miss with its numbers
  instead of bending core rules to pass it.
- **Prototypes** are default-off knobs in `src/data/proto.ts`, measured with
  `npm run experiment -- --proto …` and playable with `?proto=`. Adopting one is the user's call,
  and an adopted rule goes to `develop` for a dev-site playtest (see CLAUDE.md).
- **Log every data change** in `data/CHANGELOG-balance.md`, newest first: what changed, the
  guardrail or measurement behind it, and whether the user approved it.
- **Goldens:** data changes move the golden hashes, so run `npm run golden -- update` and say so in
  the PR. Display text counts too: every battle copies the data's text into its state, so
  player-facing rewording goes in `src/ui/words.ts` until the next golden refresh.
- **Guardrails** G1–G8 and G11 are `npm run test:slow`. Run it after a data change. Open misses and
  candidate fixes are in `docs/balance-backlog.md`.
- **Sweeps:** `nodeContent()` (`tools/lib/content.ts`) is cached for the whole process, so a sweep
  that changes content per variant builds each variant with `protoContent(spec)` and never
  mutates the cached content.
