# Saves from before R2 (v1)

Recorded by R2b/T006 on 2026-11-03 from v1's code at `e1d2406` (develop, before R2b's S1 changed the run), with a throwaway script kept out of the repo. Each file is what the browser writes, as `JSON.stringify` stores it: a `spore-sprawl.run.v1` record (`RUN_VERSION` 1), or a `spore-sprawl.battle.v1` record. `tests/unit/migrate.test.ts` and `tests/browser/resume.test.ts` read them (SPEC §8.9, §16 R2 verification 6). Don't re-record them: they stand for saves players already have.

Runs were played by `createRun` and v1's autoplay (`bot:balanced`, greedy drafts, random route), forcing the first choice at Fallen Oak and Mold Bloom. Each file is the first state of its kind over seeds 1–80:

| File | Seed | State |
|---|---|---|
| `run-route.json` | 4 | the route, after battle 1 won |
| `run-spoils.json` | 4 | spoils whose offer holds an `up:` card |
| `run-event.json` | 4 | an event, not yet chosen |
| `run-grove.json` | 5 | the Grove, not yet chosen |
| `run-prompt.json` | 5 | the Grove's graft prompt, its upgrade pending |
| `run-summary.json` | 5 | a won run's summary: 4 battles, an elite won by Decision and the boss |
| `run-fallen-oak.json` | 15 | the route after Fallen Oak's "Pry it loose": the Heartcap's max at 2550 |
| `run-decision-loss.json` | 20 | the route after a battle lost by Decision: the Heartcap at 2250 of 3000 |
| `run-mold-bloom.json` | 53 | the route after Mold Bloom: `next.sporestormShiftSeconds` −60 and +150 gold |
| `run-battle.json` | 7 | a human's run in battle 1, its v1 config on the screen |
| `battle-v2.json` | 7 | that battle saved at tick 600 (`v: 2`, after Begin) |
| `battle-legacy.json` | 7 | the same battle in the legacy form (no `v`, one command list) |
