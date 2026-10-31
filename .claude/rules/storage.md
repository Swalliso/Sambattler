---
paths:
  - "src/app/channel.ts"
  - "src/app/settings.ts"
  - "src/app/run.ts"
  - "src/app/tips.ts"
  - "src/run/storage.ts"
  - "src/run/resume.ts"
  - "tests/unit/settings.test.ts"
  - "tests/unit/run.test.ts"
  - "tests/browser/resume.test.ts"
---

# Saved state

- The game and the dev site share the swalliso.github.io origin, so they share localStorage.
  Every key goes through `storageKey()` (`src/app/channel.ts`), which adds the `dev/` prefix on
  dev-site builds, so a dev build can never resume or overwrite a run saved on the game.
- The game's keys must never change, or players lose their saves:
  - `spore-sprawl.run.v1` and `spore-sprawl.battle.v1` (`src/run/resume.ts`)
  - `spore-sprawl/settings/v1` and `spore-sprawl/tips/v1` (`src/app/settings.ts`)
- Add a new key the same way, through `storageKey()`. Never write the `dev/` prefix by hand.
- A prototype run (`?proto=`) saves only on the dev site, under `proto=<spec>/` keys of its own
  (`protoSpace()` in `src/app/channel.ts`, passed to `BrowserStorage`), so it never resumes or
  overwrites the real save. The game never saves one.
- The run layer only sees the `Storage` interface (`src/run/storage.ts`). The browser passes the
  localStorage store in `src/app/run.ts`; tests and tools use `MemoryStorage`.
