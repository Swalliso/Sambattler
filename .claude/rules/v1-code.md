---
paths:
  - "src/**"
  - "tests/**"
  - "tools/**"
---

# The code still runs v1's battle

SPEC v2 (2026-10-31) is the design. Until milestone R2 lands, this code runs v1's battle, which v2
replaces. That battle has:
- spawn timers;
- column capture and forward building;
- Heartcap turrets and one Heartcap for the run;
- the 60 s wave;
- the combat rework's waves and Hold behind `?proto=rework`.

- **Don't extend a retired system.** SPEC's retired stubs and Appendix A list them. SPEC §13.4 maps
  them to files, and §15.7 and §15.6 map them to tests. Fix a bug in one if the user asks, but
  don't build on it.
- **New work follows SPEC v2,** under its milestone (R1–R4, §16). Keep v1's battle running until
  the milestone that replaces it, so `main` and the dev site always have a working game.
- **Tests follow the spec.** When a milestone retires a system, its tests, goldens and guardrails go
  in the same change (CLAUDE.md). Until then they keep passing.
- **Section citations:** comments cite SPEC sections by number. v2 kept every v1 number, so a
  citation of a retired section lands on a stub that points to what replaced it. Where v2 rewrote
  a cited section (for example §4.2, §6.4 or §6.5), the section now describes v2's rule. The
  comment still describes the v1 code beside it.
- **Doc paths in comments** often point into `docs/archive/v1/`. That's history, not current design.
