---
paths:
  - "src/**"
  - "tests/**"
  - "tools/**"
---

# What's left of v1

SPEC v2 (2026-10-31) is the design. Since R2b's S3 the sim, the tools and the tests hold only v2's battle in
rounds, at SPEC §13.4's paths. v1's battle (spawn timers, column capture and forward building, Heartcap
turrets, the 60 s wave, and the combat rework's waves and Hold) is deleted. What's left of it:
- its keys in `src/data/schema.ts` and the data, which compile to nothing until R2b's T129 (S12) removes them
  (R2b's S4 removed the schema keys only its deleted presets set);
- `main`, which keeps v1's game until the user asks for a release.

- **Don't extend a retired system.** SPEC's retired stubs and Appendix A list them. SPEC §13.4 maps
  them to files, and §15.7 and §15.6 map them to tests. Fix a bug in one if the user asks, but
  don't build on it.
- **New work follows SPEC v2,** under its milestone (R1–R4, §16), and every PR keeps the dev site's
  game playable.
- **Tests follow the spec.** When a milestone retires a system, its tests, goldens and guardrails go
  in the same change (CLAUDE.md). Until then they keep passing.
- **Section citations:** comments cite SPEC sections by number. v2 kept every v1 number, so a
  citation of a retired section lands on a stub that points to what replaced it. Where v2 rewrote
  a cited section (for example §4.2, §6.4 or §6.5), the section now describes v2's rule. The
  comment still describes the v1 code beside it.
- **Doc paths in comments** often point into `docs/archive/v1/`. That's history, not current design.
