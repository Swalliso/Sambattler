# The code runs v2's battle in rounds

SPEC v2 (2026-10-31) is the design. Since R2b the sim, the tools, the tests and the data hold only v2's battle in
rounds, at SPEC §13.4's paths: R2b's S3 deleted v1's battle (spawn timers, column capture and forward building, Heartcap
turrets, the 60 s wave, and the combat rework's waves and Hold), and its S12 removed v1's last keys from the schema and
the data. `main` keeps v1's game until the user asks for a release.

- **Don't rebuild a retired system.** SPEC's retired stubs and Appendix A list them, with the milestone that removed
  each (`docs/r2b-plan.md`, T130). Three stand-ins live until R3: the general's random upgrade levels, upgrade tracks and
  the shared draft pool.
- **New work follows SPEC v2,** under its milestone (R1–R4, §16), and every PR keeps the dev site's game playable.
- **Tests follow the spec.** When a milestone retires a system, its tests, goldens and guardrails go in the same change
  (CLAUDE.md).
- **What v1 left on purpose:** `src/run/migrate.ts` and `tests/fixtures/saves/v1/` read a save written before R2; the
  run report labels a migrated run's `'turret'` damage; the tips store keeps v1's tip ids in old records.
- **Section citations:** comments cite SPEC sections by number. v2 kept every v1 number, so a citation of a retired
  section lands on a stub that points to what replaced it.
- **Doc paths in comments** that point into `docs/archive/v1/` are history, not current design.
