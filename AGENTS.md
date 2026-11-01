# Instructions for coding agents

This repo's instructions live in [CLAUDE.md](CLAUDE.md). Read it first: it applies to every agent, not just Claude.

The topic rules in [.claude/rules/](.claude/rules/) apply too. Claude loads them on its own, but other agents should read each one before editing a file its `paths` frontmatter lists:
- [v1-code.md](.claude/rules/v1-code.md): `src/`, `tests/` and `tools/`;
- [balance.md](.claude/rules/balance.md): `data/`, `src/data/`, the balance, experiment and golden tools, `tools/lib/`, `tests/slow/`, `tests/golden/` and `docs/balance-backlog.md`;
- [storage.md](.claude/rules/storage.md): the save and settings files.

The points that matter most:
- **The design is [SPEC.md](SPEC.md), v2 since 2026-10-31.** Read its §0.1 and §1.3 first. Until milestone R2 lands, the code still runs v1's battle, which v2 replaces. Don't extend the systems v2 retires (SPEC Appendix A).
- **`docs/archive/` is history.** Don't take rules, numbers, plans or proposals from it as current, unless the user or a SPEC v2 section points you to a named part of it. Read that part as background.
- **Read [docs/status.md](docs/status.md)** for where things stand and what's next.
- **Work comes from [docs/tasks/](docs/tasks/README.md):** one task list per milestone, worked one session at a time. Its README says how a session starts, checks its gate, ticks tasks and finishes.
- **Review before building.** Rule changes wait for the user's OK.
- **Only push, open PRs or merge when the user asks.** Branch from `develop`, never `main`.
