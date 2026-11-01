# M6 — Meta-progression: tasks

M6 adds the loop between runs:
- the profile and the Underroot screens;
- Spores and Amber;
- the unlock ladder, which teaches the roster beyond the six core archetypes a few buildings at a time;
- at least 15 feats written for rounds;
- strains with Amber ranks;
- 12 colony traits under Root Capacity;
- commander mastery;
- save export and import with a migration framework.

SPEC §16 M6 has no Goal line, so this is its scope. Run it back and records, M6's independent piece, has its own list in `docs/tasks/run-it-back.md` (cited as RB/T0nn). M6 doesn't depend on it (§16 M6).

This list is a draft of 2026-11-01, made from SPEC v2 and `docs/tasks/spec-analysis.md` before R2b, R3 and R4b land and before `docs/m6-plan.md` exists. **Refine with the tasks step when the plan is agreed.** It's coarser than the R-milestones' lists: the plan comes first, and the paths of modules that R2 and R3 create are their planned names. Task IDs run in execution order, except T050–T053, which were added later and sit where they run.

**Status:** Draft, not agreed · **Spec:** SPEC §16 "Milestone 6 — Meta-progression" and the sections it cites · **Plan:** `docs/m6-plan.md` (written in S0) · **Gate in:** R3 and R4b merged into `develop` (§16's order: R1–R4, then 6–8); records-1 merged if it has landed (RB-Q1); M6-Q1 answered before R2a's stats session (R2a/T057) · **Gate out:** the user's review of the meta loop on the dev site (T049)

## Read first

- SPEC §9 (all of it), §8.1, §8.4, §8.6, §8.8, §10.5, §11.2 (the three mastery buildings), §11.5, §11.7 (traits), §11.10, §11.15, §12.3 (G9), §13.2, §13.4 (`src/meta`), §13.8, §14.1, §14.2 (`StrainDef`, `TraitDef`, `FeatDef`, `Condition`), §14.4 (`SideConfig`'s traits and strains, `RunState`), §15.2 (`--meta-progress`, `--bot`), §15.3, §15.6 (`tab`, `profile`), §15.7 (the Meta row), §16 M6.
- Code:
  - `src/meta/records.ts` (records-1, if it has landed), `src/run/runState.ts`, `src/run/flow.ts` (`battleConfig`, `finishBattle`, `generalKit`), `src/run/auto.ts` (`simulateRun`), `src/run/packs.ts` (from R3), `src/sim/create.ts` (`draftPool`), `src/sim/compile.ts`, `src/sim/effects.ts`, `src/sim/stats.ts`, `src/sim/state.ts`, R2a's emplacement compile and planning executors (`src/sim/rounds/compile.ts`, `src/sim/rounds/planning.ts`, or the paths R2b's As built names);
  - `src/data/schema.ts` (`unlockedBy` on relics, the strict `CommanderSchema`, `UnitSchema`'s healer-only damage 0, `BuildingSchema`'s tower `attack` rule, `SIDE_STATS`, `PowerSchema`'s kinds), `src/data/registry.ts`, `tools/validate-data.ts`;
  - `src/ui/screens/underroot.ts`, `src/ui/screens/title.ts`, `src/ui/screens/run.ts`, `src/ui/report.ts`, `src/ui/settingsScreen.ts`, `src/app/main.ts` (`runStorage()`), `src/app/run.ts`, `src/app/urlParams.ts` (`tab` accepts only `commanders` and `bans` today);
  - `tools/sim.ts` (`NOT_YET` rejects `--bot`, `--meta-progress` and `--runs`), `tools/screenshot.ts` (`--settings`), `tools/golden.ts`, `tests/slow/`, `tests/browser/serve.ts` (records-1's served-page harness, RB/T005; `tests/browser/protoSaves.test.ts` holds it without records-1), `data/relics.json` (`rotEater.unlockedBy` is `feat-rot-eater` today), `data/commanders.json`, `data/balance-targets.json`.
- Docs: `docs/tasks/clarify.md` (the M6 block, X9, RB-Q1, RB-Q4), `docs/tasks/run-it-back.md`, `docs/tasks/r3-kit.md` (R3/T008, T044, T046), `docs/tasks/r4-readable-armies.md` (R4/T032), `docs/tasks/r2a-battle-in-rounds.md` (R2a/T057), `.claude/rules/balance.md` and `.claude/rules/storage.md`.

## Before you start

**Decisions** (the tasks assume each recommendation):
- M6-Q1 (R2a S0; blocks T019): R2a records the feat stats (R2a/T057). If the answer is no, T019 adds them to `src/sim/stats.ts` and refreshes every golden once more.
- M6-Q2 (S0; blocks T010, T022): unlocks apply from the next run, and a run snapshots its meta at creation. If they reach the next battle instead, T010's snapshot is refreshed after each battle and resume needs the profile.
- M6-Q3 (S0; blocks T002, T021): a feat for every pack building; Rich Soil and Hoarder fixed.
- M6-Q4 (S0; blocks T003, T036): Claude drafts the mastery table, and level 10 moves to M7.
- M6-Q5 (S0; blocks T031): strains cover the always-in set, 14 of them.
- M6-Q6 (S0; blocks T008): no credit for runs before M6.
- M6-Q7 (S0; blocks T052, T053): Run it back reuses the whole loadout, checked again against the profile.
- M6-Q8 (S0; blocks T040, T041, T044): content counts unlock ids; at least 50 runs (§16's 40 if the user declines); G9 uses a greedy-search loadout.
- #57 (S0; blocks T031): a strain never changes a body or a weapon.
- #58 (S0; blocks T031): strains and augments divide the work, with the overlaps named.
- #59 and #60 (S0; block T022): core buildings aren't gated, core membership doesn't unlock a pack, and a run deals every unlocked pack when fewer than 4 are unlocked.
- #61 (S0; blocks T036, T050, T051): the Velvet Shrine is a combo-style link like the Vault; the Rootgate is measured on E6.
- Settled before M6 by other milestones:
  - X9 (R3 S0): flyers come after the first release, so Hardy Spores and Second Flush are in every run's pool, and Pivot's reward can be seen (A173);
  - #50 (R3 S0): Root Pressure's plot counts toward the colony's maximum;
  - #36 (R3 S0): the sixth archetype fixes the always-in set, and so which buildings are gated;
  - RB-Q1 (records-1 S0): the profile key and its v1 record. If records-1 hasn't started, M6's S0 settles it;
  - RB-Q4 (records-2): the Collection tab.

**Results this needs:**
- R3 merged: `src/run/packs.ts` (R3/T044's `dealPacks`), `data/packs.json`, augments in the compile, `squadAdd` and `BuildingDef.archetype` (R3/T008), the relic pool in `draftPool` (R3/T046), and copies in the kit.
- R4b merged: the card-text home that T034 writes into, and R4/T032's required shape block on every unit sprite (T036).
- R2a's per-round stats (§5.7, R2a/T057), with the feat stats that M6-Q1 lists.
- records-1, if it has landed: `src/meta/records.ts` and its v1 record (RB/T006). records-2's Collection tab (RB/T033, RB/T037), if it has landed. Technical context says what M6 takes on when records-1 hasn't landed.
- R2b's and R3's run guardrail bands for G14 and G15 (#35), for A192's fresh-profile report.

**Findings** (high and medium):
- A168 (high): six of the nine shippable pack buildings have no unlock source, so the ladder can't be built from SPEC. T002, T021, T022.
- A169 (high): §9.5's 21 mastery rewards are unnamed, and most strains have no source. T003, T036.
- A171 (medium): mastery level 10's commander blights exceed §17 #15's six, and M6 can't reach 100% of its content. T003 moves level 10 to M7; T004 rewords §16 M6's scope line; T040 counts only M6's content.
- A172 (medium): §9.7 puts settings and the run inside the profile. T004, T008.
- A173 (medium): Second Flush and Hardy Spores never reach a run. X9; T002 points Pivot at a reward that appears.
- A174 (medium): `StrainDef` can't express half of §11.5. T004, T009, T032.
- A175 (medium): there's no stat-path whitelist, and §5.7 lacks stats the feats read. M6-Q1; T004, T019.
- A176 (medium): SPEC doesn't say when an unlock applies, and `RunState` has no meta fields. M6-Q2; T010, T011.
- A177 (medium): the pacing check's terms are undefined. M6-Q8; T001 (trait prices), T004, T040, T044.
- A179 (medium): where records live. RB-Q1 (records-1); T008 migrates the record, or starts fresh without one.
- A190 (medium): §11.5's strains target v1's six basics, and SPEC states two counts. M6-Q5; T003, T031.
- A085 (medium, R2): "+1 unit" effects scale with a unit's size, and the Velvet Shrine's "+2 units" has the same problem. #61; T036.
- A124 (medium, R3): the Vault and the Shrine need a DSL form (`squadAdd`). R3 builds it (R3/T008); T036 uses it for the Shrine.
- Lows:
  - A180 (Rich Soil is impossible) and A181 (Hoarder is met in round 1): T002, T021;
  - A186 (no tab shows locked cards): T024;
  - A187 (the `profile=fixture` param would ship fixtures in the game): T004, T011, T046;
  - A188 (G9's loadout is undefined): T041;
  - A192 (a fresh profile's runs are unmeasured, and the general's preferred cards may be locked): R3/T073 (#48) limits the kit; T018 checks it on a fresh profile; T042 measures it.

## Technical context

**Where code lands:**
- New in `src/meta` (§13.4): `profile.ts`, `migrations.ts`, `feats.ts`, `statView.ts`, `traits.ts`, `strains.ts`, `mastery.ts`. `records.ts` (records-1) stays; `blights.ts` is M7's.
- New data (§13.4): `data/feats.json`, `data/traits.json`, `data/mastery.json`, `data/factions/velvet-bloom/strains.json`.
- New tests and tools: `tests/unit/meta.test.ts`, `tests/fixtures/profile-v1.json` (a records-1 record), `tests/fixtures/profile-mid.json`, `tests/browser/meta.test.ts`, `tests/slow/meta.test.ts` (G9, beside R2a's slow files), `tools/lib/meta.ts`.
- Extended:
  - `src/data/schema.ts`, `src/data/registry.ts`, `tools/validate-data.ts`;
  - `src/run/runState.ts`, `src/run/flow.ts`, `src/run/packs.ts`, `src/sim/create.ts`, `src/sim/compile.ts`, `src/sim/effects.ts`, `src/sim/state.ts`, and R2a's emplacement compile and planning executors (T051);
  - `src/app/main.ts`, `src/app/run.ts`, `src/app/urlParams.ts`, `src/ui/screens/underroot.ts`, `src/ui/screens/title.ts`, `src/ui/screens/run.ts`, `src/ui/report.ts`, `src/ui/settingsScreen.ts`;
  - `tools/sim.ts`, `tools/screenshot.ts`, `tools/golden.ts`, and the data files the tasks name.

**If records-1 hasn't landed** (§16 M6: M6 doesn't depend on it):
- T004 adds `spore-sprawl/profile/v1` and `spore-sprawl/profile/v1.bak` to `.claude/rules/storage.md`, and `src/meta/**` to its `paths`, as RB/T002 says.
- T008 creates `src/meta/` and adds it to the pure layers in `eslint.config.js` and `tests/unit/purity.test.ts`, as RB/T004 says. The migration starts from no key.
- T011 builds the store on `new BrowserStorage('')` and `RunEnv`'s profile hook, as RB/T007 describes.
- T013 banks on RB's run key (`${seed}:${last battle's finalHash}`), so a reload on the summary still banks once.

**The profile key's layout** (a spec gap, A172):
- The key stays `spore-sprawl/profile/v1` for good, and the record carries its version (§13.8).
- M6 writes `v: 2`: records-1's v1 fields, plus `{ spores, amber, unlocks: string[], feats: Record<id, { at: number }>, traitsOwned: string[], rootCapacity /* 3–12 */, strainRanks: Record<strainId, 0|1|2|3>, strainChoice: Record<buildingId, strainId>, commanderXp: Record<id, number>, bestDecay: Record<id, number> /* M7 */ }`. `lastSetup` gains `traits` and `strains` (M6-Q7).
- Settings, tips and the run keep their own keys.
- `migrations.ts` is an ordered list of v→v+1 functions, starting with v1→v2. Every later format adds one. No key at all loads a fresh v2 record.
- The export string is base64 of `{ export: 1, profile, settings, tips }`, with its own version. Import validates and migrates before replacing anything.

**The run's meta snapshot** (A176, M6-Q2):
- `RunOptions.meta` and `RunState.meta?: { unlocked: string[]; traits: string[]; strains: Record<string, string>; strainRanks: Record<string, number>; power?: string; starter?: string[]; coreAdd?: string[] }`. M7 adds `blights` and `decay`.
- `src/app` sets it at `createRun` from the profile. `src/run` never imports `src/meta`.
- A run without `meta` plays as before M6: everything unlocked, no loadout. So `RUN_VERSION` doesn't change, existing goldens stay ungated, and runs saved before M6 resume. A new golden pins a gated run (T023).
- Seeded and test pages (`runStorage()`'s `persist: false`) read the profile read-only, so screenshot fixtures show on the Underroot. Their runs get no `meta` snapshot, so the screenshot's Node mirror hash holds (T011).

**Unlocks** (A169):
- `unlockedBy` names `feat:<id>` or `mastery:<commander>:<level>`.
- A feat's `reward.unlocks` lists building, strain, relic or commander ids, and the registry checks each one resolves.
- Traits aren't unlocked by feats: they're bought with Spores (§9.4).

**Strains** (A174):
- `StrainDef` gains `effects?: EffectBundle`, scoped to its building, for multipliers and side stats such as Teeming's knit time or Wild Truffle's loam bonus.
- `patch` keeps structural fields: the squad, `onDeath` and merge perks.
- The order stays §14.1's: base → strain patch → augments → modifiers. It goes in R3's per-squad compile.

**Feats and stats** (A175):
- The `StatPath` whitelist in `src/meta/statView.ts` follows the list in §14.2 that M6-Q1 adds. It includes `run.won` and `run.decay`, which Into the Rot reads (T009).
- The view is built from the battle's per-round stats (§5.7) when the battle ends, and from the run's at the summary.
  - In the browser, `src/app/run.ts` builds it where R2b records a finished battle.
  - In tools, it comes from `simulateRun`'s per-battle results (`src/run/auto.ts`).

**Mastery buildings that need sim code** (#61, T050, T051):
- The Rootgate is a root wall with no attack (§11.2). `BuildingSchema` makes a tower carry an `attack` block, and `UnitSchema` allows damage 0 only for healers. T051 adds a `wall` tower: no `attack`, compiled each round to an emplacement unit with damage 0, structure armor and the building's full `hp`.
- The Puppet Pod has "merge forced on". v1 kept that on `spawn.mergeForced`, which R2 retires with `spawn`. T051 adds `BuildingDef.mergePolicy: 'forced'`, under which the squad's `mergeOn` is fixed and `toggleMerge` refuses it (§4.7).
- Alternate powers use the PowerDef kinds R2b left (today `burst`, `surge`, `bloom` and `tithe` in `PowerSchema`) with new numbers. A new kind needs its own task (T003).

**Goldens:**
- Schemas and empty data files move no hash.
- T009 rewrites `rotEater.unlockedBy`. The battle library copies each relic record into the state (`src/sim/compile.ts`), so a golden whose library holds Rot-Eater may move: run `npm run golden -- verify`, and if one moves, `npm run golden -- update`, named in the commit.
- Traits and strains reach a battle only through `SideConfig`, which ungated runs leave empty, so no existing golden moves. `SideConfig.traits` is set only when non-empty.
- T051's wall and merge policy appear in no existing golden.
- T023 and T033 add goldens.
- Feat stats added in M6 (only if M6-Q1 is no) move every golden once: run `npm run golden -- update` and say so in the commit.

**Calls this list makes** (each reversible):
- **The Underroot's tabs** (A186): Commanders (with each commander's mastery), Traits, Strains, Bans, Blights (M7), and Collection (feats, the codex and locked cards). §16 M6 step 4's `tab=feats` and `tab=mastery` open the Collection tab's sections. `src/app/urlParams.ts` gains `traits` (T029), `strains` (T034), and `collection`, `feats` and `mastery` (T024).
- **Profile fixtures** load through a screenshot option, `--profile <file>`, which writes the key before boot as `--settings` does. A `profile=fixture:<name>` URL param would ship `tests/fixtures/` in the game (A187). Under `test=1` the page reads the key read-only (T011). S0 updates §15.6 and §16 M6 step 4.
- **Banking** happens in records-1's `recordRun` write, so it's idempotent on the run key (without records-1, on the same key):
  - Spores × (1 + 0.10 × Decay), with Decay 0 until M7;
  - Amber;
  - XP to the run's commander: the Spores before the multiplier, + 25 per battle won (§8.6).
- **The meta sim's policy** (M6-Q8):
  - buy the cheapest capacity step, then the cheapest trait it can afford;
  - rank the strain it chose most;
  - play the least-mastered unlocked commander;
  - `bot:balanced` with greedy drafts and the auto power.
- **Content for the pacing check:** the unlock ids M6 can grant (feat unlocks, traits, capacity steps, mastery levels 2–9). Ranks don't count, and neither do M7's blights, Boss Down's unlock or level 10 (A171, A177).
- **The title** gets an Underroot button, its door (§10.5). It opens the Underroot without starting a run, so Spores and Amber can be spent.
- **A general's locked cards** (A192): R3/T073 (#48) already limits the general's kit to the always-in set, the dealt packs and your core, with an always-in fallback. From M6 the deal is gated by unlocks, so a fresh profile's general reaches that fallback more often.

## Stories

| ID | Priority | Story | Independent test |
|---|---|---|---|
| US1 | P1 | A run's Spores, Amber and XP bank into a profile that survives a reload and can be exported and imported | Unit: export → import round-trip. Browser: a reload on the summary doesn't bank twice |
| US2 | P2 | Feats unlock the roster a few buildings at a time; a fresh profile's run deals only unlocked packs, and a locked card shows its feat | Unit: over 200 seeds a fresh profile never deals a locked pack. Browser: the Collection tab shows a locked card with its feat |
| US3 | P3 | Colony traits, bought with Spores, equip within Root Capacity | Unit: capacity enforcement. Screenshot `m6-traits` |
| US4 | P4 | Strains change how a building plays, chosen before a run and ranked with Amber | Unit: strain patch application. Screenshot `m6-strains` |
| US5 | P5 | Commander mastery levels 2–9 and their rewards, and Run it back keeps the whole loadout | Unit: XP thresholds; the Rootgate and Puppet Pod cases. Browser: T052. Screenshot `m6-mastery` |
| US6 | P6 | The meta-progress sim shows unlock pacing, and G9 caps the traits' power | `npm run sim -- --meta-progress`; `npm run test:slow` G9 |

## Phase 1: Setup

- [ ] T001 [USER] Write `docs/m6-plan.md` (new) in CLAUDE.md's format, and agree it with the user, settling M6-Q2 to M6-Q8 and #57 to #61 through `docs/tasks/clarify.md` (§16 M6, §9) ⛔ M6-Q2
  - The plan's stand-ins: until M7, Decay is 0, and Boss Down records the feat without unlocking anything.
  - The plan's open questions include the 12 traits' Spore prices (A177), which no SPEC section gives.
- [ ] T002 [USER] Draft the unlock map in `SPEC.md` §9.2, and agree it: one source for every unlockable (A168, A173, A180, A181) (§9.2, §8.4) ⛔ M6-Q3
  - First guess:
    - First Sprout → Scythecap Grove; Adapt (both counter cycles fired, rounds 4 and 7) → Veilstalker Hollow; Survivor → Tender's Ring;
    - Root and Branch (win on Twin Roots) → Rhizomorph Tunnel;
    - one new feat each for the Morel Warren, the Rhizome Vault, the Rootbreaker Den, the Spore Exchange and the Puffball Mortar (the Burster Pod if the Mortar becomes the sixth archetype, #36);
    - Long March, rewritten (for example, win a battle with every plot planted) → Armilla; Elder Council → Cordis;
    - Hoarder ("begin a clash holding 300 gold", from round 2) → Deep Cellars; Pivot (sell 3 buildings that have fielded) → Second Flush;
    - Into the Rot (`intoTheRot`) → Rot-Eater (reachable from M7); Boss Down → blights (M7) and 2 Amber;
    - Lean Roots → Wild Truffle; a third-rank Truffle Cellar win → Deep Truffle (Rich Soil is rewritten); the other strains as T003 assigns.
  - That's about 20 feats, ordered by what each teaches.
- [ ] T003 [USER] Draft the mastery content table in `SPEC.md` §9.5 and §11.10, and agree it (A169, A171, A190) (§9.5, §11.5, §11.10) ⛔ M6-Q4
  - For each commander, levels 2–9:
    - 2: its exclusive building (Velvet Shrine, Rootgate, Puppet Pod);
    - 3: an alternate power, using the PowerDef kinds R2b left (today `burst`, `surge`, `bloom` and `tithe`) with new numbers. A new kind needs its own task;
    - 4: a starter option;
    - 5 and 8: strains;
    - 6 and 9: passive upgrades;
    - 7: an exclusive relic.
  - Level 10's blight moves to M7 (A171).
  - The strain table assigns each of the 14 always-in strains (M6-Q5) one source, a feat or a mastery level, at most 2 alternates per building (§9.3). It states M6's strain count once, replacing §16 M6's "12".
- [ ] T004 Write S0's other edits into `SPEC.md`, `docs/status.md` and, if records-1 hasn't landed, `.claude/rules/storage.md` (§9.7, §9.8, §14.2, §14.4, §15.6, §16 M6)
  - §9.7: the profile v2 layout and the export string (A172).
  - §14.4: `RunState.meta` (A176).
  - §14.2: the `StatPath` whitelist, if M6-Q1 didn't add it (A175); `StrainDef.effects` and the unlock-id syntax (A174, A169); the `wall` tower and `BuildingDef.mergePolicy` (T051).
  - §9.8 and §16 M6 step 2: content as unlock ids, and at least 50 runs (A177).
  - §12.3: G9's terms (A188).
  - §15.6 and §16 M6 step 4: `--profile` in place of `profile=fixture:` (A187).
  - §10.5: the Underroot's tabs (A186).
  - §16 M6's scope line: mastery levels 2–9 in M6, and level 10 in M7 (A171).
  - `.claude/rules/storage.md`: the two profile keys and `src/meta/**`, as RB/T002 says, if records-1 hasn't added them.

## Phase 2: Foundational (blocks every story)

- [ ] T005 [P] Write `tests/unit/meta.test.ts` (new) and `tests/fixtures/profile-v1.json` (new), a records-1 record with 3 runs and a `lastSetup`, for the profile cases (§9.7, §16 M6 step 1)
  - `profile-v1.json` migrates to v2 with every new field defaulted and the records kept.
  - No key at all loads a fresh v2 record.
  - A garbage string is copied to the backup key and raises `corrupt`.
  - Unknown fields survive a load and a save.
  - A record newer than the code is left untouched.
- [ ] T006 [P] Add the schema cases to `tests/unit/data.test.ts` (§14.1, §14.2)
  - Each new data file validates.
  - A feat that rewards an unknown id fails.
  - A strain that names something other than a building fails.
  - A strain patch that touches `armor` or `damageType` is refused (#57).
  - `unlockedBy` accepts `feat:<id>` and `mastery:<commander>:<level>` and nothing else, on relics and on commanders.
- [ ] T007 [P] Add the snapshot cases to `tests/unit/run.test.ts` (§14.4)
  - `createRun({ seed })` without `meta` hashes as it does today.
  - A run created with a snapshot keeps it through `saveRun` and `loadRun`, after the profile changes.
- [ ] T008 Build `src/meta/profile.ts` (new) and `src/meta/migrations.ts` (new): `loadProfile`, `saveProfile`, a v1→v2 migration that keeps records-1's fields and starts every currency at 0, and the corrupt flag (§9.7, §13.2) ⛔ M6-Q6
  - The migration handles both cases: no key gives a fresh v2 record, and a records-1 v1 record migrates (`tests/fixtures/profile-v1.json`).
  - If records-1 hasn't landed, also add `src/meta` to the pure layers in `eslint.config.js` and `tests/unit/purity.test.ts` (RB/T004).
- [ ] T009 Add `FeatDef`, `Condition`, `TraitDef`, `StrainDef` (with `effects`), `MasteryDef` and the `unlockedBy` syntax to `src/data/schema.ts`, and make `data/relics.json` pass it (§14.1, §14.2, §9.2)
  - Add `unlockedBy?: Id` to the strict `CommanderSchema`, since T021 writes it into `data/commanders.json`.
  - `src/data/registry.ts` cross-checks every `reward.unlocks` and every `unlockedBy`, and every strain's and mastery reward's building ids.
  - Rewrite `rotEater.unlockedBy` in `data/relics.json` from `feat-rot-eater` to `feat:intoTheRot`.
  - Seed `data/feats.json` (new) with Into the Rot alone: `id: "intoTheRot"`, scope `run`, condition `{ "all": [{ "stat": "run.won", "eq": true }, { "stat": "run.decay", "gte": 3 }] }` (§9.2's "Win a run at Decay ≥ 3"), reward `{ "unlocks": ["rotEater"] }`. It stays unreachable until M7 brings Decay. T021 adds the rest.
  - Log both data changes in `data/CHANGELOG-balance.md`. Run `npm run golden -- verify`; if a golden moved (Technical context, Goldens), refresh it with `npm run golden -- update` and say so in the commit.
  - `tools/validate-data.ts` loads the new files.
  - New, empty: `data/traits.json`, `data/mastery.json`, `data/factions/velvet-bloom/strains.json`.
- [ ] T010 Add `RunOptions.meta` and `RunState.meta` to `src/run/runState.ts`; `createRun` copies the snapshot (§14.4, §8.1) ⛔ M6-Q2
- [ ] T011 Load the profile at boot in `src/app/main.ts`, through records-1's `BrowserStorage('')` (§9.7, §10.5, §8.1, §15.6)
  - The title (`src/ui/screens/title.ts`) shows §9.7's reset prompt when the record is corrupt, and gets the Underroot button.
  - The Underroot's Begin and Run it back (`src/app/run.ts`) pass the profile's snapshot to `createRun`.
  - Under `test=1` or `seed=` (`runStorage()`'s `persist: false`), read the profile read-only: a wrapper over `BrowserStorage('')` whose `set` and `remove` do nothing. So `--profile` fixtures show on the Underroot, nothing is written, and run scenes still get no `meta` snapshot, so the screenshot's Node mirror hash holds (A187).
  - If records-1 hasn't landed, build the store and `RunEnv`'s profile hook here, as RB/T007 describes.

**Checkpoint:** `npx vitest run tests/unit/meta.test.ts tests/unit/data.test.ts tests/unit/run.test.ts` and `npm run verify` pass: the profile loads and migrates, `data/relics.json` validates under the new syntax, and no golden moves (or T009's refresh is named in the commit).

## Phase 3: US1 — Earnings bank into a profile you can back up (P1)

**Goal:** what a run earns is kept, once, and can be exported. **Independent test:** T012's cases.

- [ ] T012 [US1] Add the banking and backup cases to `tests/unit/meta.test.ts`, `tests/browser/meta.test.ts` (new) and `tests/browser/settings.test.ts` (§8.6, §9.1, §9.7, §16 M6 step 1)
  - Unit: banking one run twice changes nothing; a lost run banks its earlier battles' Spores; XP is the Spores before the multiplier + 25 per battle won.
  - Unit: export → import round-trip; a truncated string is refused and changes nothing.
  - Browser (`tests/browser/meta.test.ts`): a reload on the summary leaves the profile's Spores unchanged; Run it back keeps the commander and bans and passes the profile's snapshot. T052 covers the rest of the loadout (M6-Q7).
  - Browser (`tests/browser/meta.test.ts`, on a `develop`-mode server from `serve('develop')` in `tests/browser/serve.ts`, RB/T005, or `tests/browser/protoSaves.test.ts`'s harness without records-1): banking writes `dev/spore-sprawl/profile/v1` and nothing under `spore-sprawl/profile/v1`.
  - Browser (`tests/browser/settings.test.ts`): the settings sheet shows Export, Import and Reset, and still fits 1280×720.
- [ ] T013 [US1] Add `bankRun` to `src/meta/profile.ts`, called in the same write as records-1's `recordRun` from `src/app/run.ts` (or on RB's run key without records-1) (§8.6, §9.1)
- [ ] T014 [US1] Fill the summary's Earned table in `src/ui/screens/run.ts`: the run's Spores, Amber and XP beside the profile's totals; Feats from US2; Decay 0 until M7 (§8.8)
- [ ] T015 [US1] Add Export, Import and Reset to `src/ui/settingsScreen.ts`, replacing its "arrives with the profile in M6" note, on `exportProfile` and `importProfile` in `src/meta/profile.ts`. Reset confirms twice (§9.7, §10.5)

**Checkpoint:** `npx vitest run tests/unit/meta.test.ts tests/browser/meta.test.ts tests/browser/settings.test.ts` and `npm run verify` pass: earnings bank once, and the profile exports and imports.

## Phase 4: US2 — Feats and the unlock ladder (P2)

**Goal:** a fresh profile meets the core six and the Truffle Cellar, and feats unlock the rest. **Independent test:** T017's 200-seed case, and T024's locked card.

- [ ] T016 [P] [US2] Add the feat cases to `tests/unit/meta.test.ts`: each operator and combinator, nested `all` and `any`, a stat exactly at its bound, and an unknown stat path refused at load (§9.2, §16 M6 step 1: "feat conditions against synthetic round and run stats")
- [ ] T017 [P] [US2] Add the ladder cases to `tests/unit/packs.test.ts` (from R3) and `tests/unit/drafts.test.ts` (§9.2, §8.4, §16 M6 step 1: "a locked building is never dealt, and unlocking one adds it to the pool")
  - Over 200 seeds, a fresh profile's runs never deal a locked pack, and adding the unlock deals it.
  - With fewer than 4 unlocked, every unlocked pack is dealt (#60).
  - A commander's core doesn't unlock its pack in another commander's runs (#59).
  - A locked relic stays out of the relic pool.
  - Drafts, spoils and events never offer a locked building.
- [ ] T018 [US2] Add the gated-run cases to `tests/unit/run.test.ts` (§9.2, §14.4, §7.8)
  - A run created with a fresh profile's snapshot deals only unlocked packs, and the same seed without a snapshot is unchanged.
  - On a fresh profile, a general whose preferred list names a building no dealt pack holds skips it and takes the next, and the boss's 7 cards fill from the always-in set (A192). This checks R3/T073's sources (#48) on a fresh profile; it needs no new code.
- [ ] T019 [US2] Build the stat view and its whitelist in `src/meta/statView.ts` (new), from R2a's per-round stats (§5.7, R2a/T057) and the run's (§9.2, §5.7) ⛔ M6-Q1
  - If R2a didn't record the feat stats, add them to `src/sim/stats.ts`, run `npm run golden -- update` and say so in the commit.
- [ ] T020 [US2] Build `evaluate(condition, view)` and `checkFeats(profile, view, scope)` in `src/meta/feats.ts` (new) (§9.2, §8.6)
  - `src/app/run.ts` calls it for battle feats when a battle ends and for run feats at the summary.
  - The rewards are unlocks and Amber. Unlocks apply from the next run (M6-Q2).
  - `src/ui/report.ts` and `src/ui/screens/run.ts` name the feats completed.
- [ ] T021 [US2] Write the rest of the feat list into `data/feats.json`, the relics' `unlockedBy` into `data/relics.json` and the commanders' `unlockedBy` into `data/commanders.json`, per T002's map; log it in `data/CHANGELOG-balance.md` (§9.2, §11.7) ⛔ M6-Q3
  - Rewrite Root and Branch, Adapt, Long March, Unbroken Mat, Swarm Mind, Siegebreaker and Pivot for rounds; fix Rich Soil (A180) and Hoarder (A181).
- [ ] T022 [US2] Gate the pools in `src/run/packs.ts`, `src/sim/create.ts` and `src/ui/screens/underroot.ts` (§9.2, §8.4, §7.8) ⛔ #59 #60
  - `src/run/packs.ts` deals only packs whose building is in `run.meta.unlocked`.
  - The relic pool (`src/sim/create.ts`'s `draftPool`, or R3's pool) drops relics whose `unlockedBy` isn't done.
  - No change to `generalKit` or `bossCounters`: R3/T073's sources already follow the dealt packs.
  - `src/ui/screens/underroot.ts` locks Armilla and Cordis until their feats are done. Run it back falls back to the Underroot when its commander is locked (M6-Q7).
- [ ] T023 [US2] Add a gated run golden, `tests/golden/m6-gated-run-s7.replay.json` (new), with `npm run golden -- update`. `tools/golden.ts` gains a run replay's optional `meta` snapshot (§15.5)
- [ ] T024 [US2] Show the ladder in the Collection tab (`src/ui/screens/underroot.ts`, records-2's tab), with `tab=collection`, `tab=feats` and `tab=mastery` in `src/app/urlParams.ts` (§9.2, §10.5) ⛔ RB-Q4
  - Locked cards show the feat that unlocks them.
  - The feats list shows each condition.
  - The Bans grid marks locked buildings as locked.
  - Build the tab here if records-2 hasn't.

**Checkpoint:** `npx vitest run tests/unit/meta.test.ts tests/unit/packs.test.ts tests/unit/drafts.test.ts tests/unit/run.test.ts` and `npm run golden -- verify` pass: a fresh profile's runs are gated, and the old goldens are unchanged.

## Phase 5: US3 — Colony traits and Root Capacity (P3)

**Goal:** you buy traits with Spores and equip a set within your Root Capacity. **Independent test:** T025's cases.

- [ ] T025 [US3] Add the trait cases to `tests/unit/meta.test.ts` and `tests/unit/effects.test.ts` (§9.4, §11.7, §16 M6 step 1: "capacity enforcement, including 0-cost drawback traits")
  - An over-capacity loadout is refused, and a 0-cost trait always fits.
  - Step 3→4 costs 60, step 11→12 costs 300, and the whole climb costs 1,620.
  - Each trait's battle effect on a staged battle: Root Pressure's +1 plot counts toward the colony's maximum (#50); Bulwark Spores gives the front rank +10% HP; Feral Bloom lowers your Heartcap's max HP by 10%; Thick Hyphae raises it by 10%.
  - The traits that act outside a clash: Spore Memory's first draft offers 4 cards and the second 3; Thrifty's reroll costs 10 less; Hermit pays no comeback gold; Early Flush adds 50 starting gold each battle; Wild Draft's drafts offer one more card and no reroll.
  - A config with no traits hashes as it does today.
- [ ] T026 [US3] Write the 12 traits into `data/traits.json` with §11.7's v2 effects and first-guess Spore prices from `docs/m6-plan.md` (T001's open question); log them in `data/CHANGELOG-balance.md` (§9.4, §11.7)
  - The prices are the user's call at S0: a retune across many items waits for their OK (`.claude/rules/balance.md`).
- [ ] T027 [US3] Build `buyTrait`, `buyCapacityStep` and `loadoutProblem` in `src/meta/traits.ts` (new) (§9.4)
- [ ] T028 [US3] Bring traits into battle through `src/data/schema.ts`, `src/sim/state.ts`, `src/sim/effects.ts`, `src/sim/compile.ts` and `src/run/flow.ts` (§9.4, §14.1, §14.4)
  - Add `SideConfig.traits` to `src/sim/state.ts`, set only when non-empty, so ungated configs hash as before.
  - Where each trait takes effect:
    - side stats in the battle's config: Early Flush `side.startingGold`, Thick Hyphae and Feral Bloom's drawback `side.heartcapMaxHp`, Hermit `side.comebackEnabled`, Thrifty `side.rerollCost`, Wild Draft `side.draftCards`, Patient Growth `side.interestCap`, Rich Veins `side.loamBonus`, Quick Knit `side.knitTicks` (or the knit key R2a kept), Root Pressure R2's `side.plots` (#50);
    - unit modifiers in the compile (`src/sim/effects.ts`, `src/sim/compile.ts`): Bulwark Spores (front-rank units), Feral Bloom's damage;
    - Spore Memory ("the first draft of each battle offers 4") and Wild Draft's "no rerolls" have no key today. Add `side.firstDraftCards` and `side.rerolls` to `SIDE_STATS` in `src/data/schema.ts`, or the plan states another form.
  - `battleConfig` in `src/run/flow.ts` passes `run.meta.traits`.
- [ ] T029 [US3] Add the Traits tab and its capacity meter to `src/ui/screens/underroot.ts`, with `tab=traits` in `src/app/urlParams.ts` (§8.1, §10.5, §15.6)

**Checkpoint:** `npx vitest run tests/unit/meta.test.ts tests/unit/effects.test.ts` and `npm run verify` pass: traits fit the capacity and act in battle.

## Phase 6: US4 — Strains and Amber ranks (P4)

**Goal:** before a run you pick a strain for each building that has one, and rank it with Amber. **Independent test:** T030's cases.

- [ ] T030 [US4] Add the strain cases to `tests/unit/effects.test.ts` and `tests/unit/meta.test.ts` (§9.3, §14.1, §16 M6 step 1)
  - §16 M6 step 1's wording: "strain patch application (whitelisted fields only)".
  - A patch changes the squad count and the unit's HP, then an augment and a relic apply on top, in §14.1's order.
  - `armor` and `damageType` are refused.
  - Rank 2 gives +8% HP and damage.
  - Ranks cost 1, 2 and 3 Amber.
- [ ] T031 [US4] Write the strains into `data/factions/velvet-bloom/strains.json`: 14 on the always-in set, each with one source (T003). Log them in `data/CHANGELOG-balance.md` (§9.3, §11.5) ⛔ M6-Q5 #57 #58
  - Ironcap, Gillguard and Thornpuff get new patches (#57).
  - Overlaps with augments are named and removed (#58). Bursting reads like Spore Pop.
- [ ] T032 [US4] Bring strains into battle through `src/sim/compile.ts`, `src/sim/state.ts`, `src/meta/strains.ts` (new) and `src/run/flow.ts` (§9.3, §14.1, §14.4)
  - Add the strain slot to R3's per-squad compile in `src/sim/compile.ts`.
  - Add `SideConfig.strains` and `strainRanks` to `src/sim/state.ts`, set only when non-empty.
  - Build `chooseStrain` and `buyRank` in `src/meta/strains.ts`.
  - `battleConfig` in `src/run/flow.ts` passes `run.meta.strains` and `strainRanks`.
- [ ] T033 [US4] Add a strain golden, `tests/golden/m6-strain-teeming-s3.replay.json` (new), with `npm run golden -- update` (`tools/golden.ts`), and say so in the commit (§15.5)
- [ ] T034 [US4] Add the Strains tab to `src/ui/screens/underroot.ts`, with `tab=strains` in `src/app/urlParams.ts`, and each strain's patch summary in the text home R4b set up, or `src/ui/words.ts` if it still exists (§8.1, §9.3, §10.5, §15.6)

**Checkpoint:** `npx vitest run tests/unit/effects.test.ts tests/unit/meta.test.ts` and `npm run golden -- verify` pass: strains compile in order, and the strain golden pins them.

## Phase 7: US5 — Commander mastery, and Run it back's whole loadout (P5)

**Goal:** each commander levels from its runs' XP and unlocks levels 2–9, and Run it back carries the loadout M6 adds. **Independent test:** T035's and T050's cases, and T052's browser case.

- [ ] T035 [US5] Add the mastery cases to `tests/unit/meta.test.ts` (§9.5, §16 M6 step 1: "mastery thresholds and XP math")
  - 99 XP is level 1, 100 is level 2, and 2,700 is level 10's threshold (its reward is M7's).
  - A run's XP is its Spores + 25 per battle won.
  - Level 2 adds the exclusive building to that commander's core only.
- [ ] T050 [US5] Add the mastery-building cases to `tests/unit/effects.test.ts` (§11.2, §6.7) ⛔ #61
  - A Rootgate wall holds its slot, deals nothing, and is back at 1200 HP at the start of each round.
  - A side left with only a Rootgate in a lane wins it with 0 surviving supply and deals no damage (E6, as #61's measure asks).
  - A Puppet Pod squad always knits: `toggleMerge` on it is refused.
- [ ] T051 [US5] Add the `wall` tower and `BuildingDef.mergePolicy: 'forced'` to `src/data/schema.ts`, and to R2a's emplacement compile and planning executors (`src/sim/rounds/compile.ts` and `src/sim/rounds/planning.ts`, or the paths R2b's As built names) (§11.2, §14.2, §4.7) ⛔ #61
  - A tower with `wall: true` needs no `attack` block, and compiles each round to an emplacement unit with damage 0, structure armor and the building's full `hp`.
  - `mergePolicy: 'forced'` fixes the squad's `mergeOn`, and `toggleMerge` refuses it. If R2a's muster still has a knit time, the Puppet Pod's "knit time −50%" is a per-building `knitMult` like v1's `spawn.knitMult`; if the muster knits at once, the plan says the bonus is moot.
  - Run `npm run golden -- verify`: no existing golden fields either, so none moves.
- [ ] T036 [US5] Write mastery into the data, and log it in `data/CHANGELOG-balance.md` (§9.5, §11.2, §11.10) ⛔ M6-Q4 #61
  - `data/mastery.json`: T003's table.
  - `velvetShrine`, `rootgate` and `puppetPod` in `data/factions/velvet-bloom/buildings.json` and `units.json`, with #61's effects. The Shrine uses R3's `squadAdd` combo form (R3/T008, A124), checked per building (A085). The Rootgate is T051's `wall`; the Puppet Pod uses `mergePolicy: 'forced'`.
  - Their sprites in `data/sprites/buildings.json`, and in `data/sprites/units.json` where a unit is new, with the shape block R4/T032 requires on every `u-` sprite.
  - Alternate powers and passive upgrades in `data/commanders.json`; exclusive relics in `data/relics.json`.
- [ ] T037 [US5] Build `levelOf(xp)` and `rewardsAt(commander, level)` in `src/meta/mastery.ts` (new). The snapshot's `coreAdd`, `power` and `starter` reach the run through `createRun` in `src/run/runState.ts` (§9.5, §8.1, §8.4)
- [ ] T038 [US5] Show mastery in `src/ui/screens/underroot.ts`: each commander card's level and next reward, the alternate power and the starter choice, and the Collection tab's mastery section (§9.5, §10.5)
- [ ] T052 [US5] Add the loadout cases to `tests/browser/meta.test.ts` (§16 M6, §8.1, §9.3, §9.4) ⛔ M6-Q7
  - Run it back reuses the ended run's traits, strains, alternate power and starter, each re-checked against the profile. Blights join from M7.
  - When one no longer fits (a trait no longer owned, a strain no longer chosen, capacity lowered by an import), Run it back opens the Underroot with the loadout preselected instead of starting.
- [ ] T053 [US5] Re-check Run it back's whole loadout in `src/meta/records.ts` (`runItBackSetup`, RB/T009) and `src/app/run.ts` (`runItBack()`, RB/T011), through `loadoutProblem` (T027) and the profile's strains and mastery (§16 M6, §8.1) ⛔ M6-Q7
  - Without records-1, `runItBackSetup` and `runItBack()` don't exist; build them as RB/T009 and RB/T011 describe.

**Checkpoint:** `npx vitest run tests/unit/meta.test.ts tests/unit/effects.test.ts tests/browser/meta.test.ts` and `npm run verify` pass: mastery levels and their rewards apply to the next run, and Run it back keeps the loadout.

## Phase 8: US6 — The meta-progress sim and G9 (P6)

**Goal:** a tool shows how fast a profile unlocks, and G9 caps what traits add. **Independent test:** T040's run and T041's guardrail.

- [ ] T039 [US6] Add a smoke case to `tests/unit/meta.test.ts`: `metaProgress()` from `tools/lib/meta.ts` (new in T040) over 3 runs on `MemoryStorage` gives a curve that never falls and is the same for the same seed (§9.8, §15.3)
- [ ] T040 [US6] Accept `--meta-progress`, `--runs` and `--bot` in `tools/sim.ts` (drop them from `NOT_YET`), on `tools/lib/meta.ts` (new) with the policy in Technical context. The report counts content as unlock ids (§9.8, §15.2, §15.3) ⛔ M6-Q8
- [ ] T041 [US6] Add G9 in round form to `tests/slow/meta.test.ts` (new), with its threshold in `data/balance-targets.json` (§9.4, §12.3) ⛔ M6-Q8
  - The loadout is the best 12-capacity set a greedy search finds (A188).
  - Measured on `bot:balanced`'s run win rate against no traits, at most +15 points.
- [ ] T042 [US6] Add a fresh-profile section to `tools/lib/meta.ts`'s report: battle-1 and boss win rates for runs 1–5, beside G14's and G15's bands (A192) (§12.3, §9.8)

**Checkpoint:** `npm run sim -- --meta-progress --runs 5 --bot balanced` prints a curve, and `npx vitest run tests/slow/meta.test.ts` runs G9.

## Phase 9: Polish and verification

- [ ] T043 §16 M6 step 1: run `npm run verify` (`tools/verify.ts`), with every listed unit test in the suite: feat conditions (T016), the ladder (T017), strain patches (T030), capacity (T025), mastery (T035), the migration fixture (T005) and the export → import round-trip (T012) (§16 M6, §15.1)
- [ ] T044 §16 M6 step 2: run `npm run sim -- --meta-progress --runs 50 --bot balanced --out artifacts/sim/m6-meta.json` (`tools/sim.ts`) and compare with §9.8: the first unlock by run 2, about 50% of content by run 15, the rest by about run 45. The results go in `docs/balance-backlog.md`. A miss is reported with its numbers, not tuned without the user's OK (§9.8, §16 M6) ⛔ M6-Q8
  - `--runs 40`, §16's figure, if the user declines M6-Q8's 50.
- [ ] T045 §16 M6 step 3: run `npm run test:slow`, with G9 asserting (`tests/slow/meta.test.ts`) (§12.3, §16 M6)
- [ ] T046 Add `--profile <file>` to `tools/screenshot.ts`, which writes `spore-sprawl/profile/v1` before boot as `--settings` does, and write `tests/fixtures/profile-mid.json` (new), a mid-ladder profile with some traits, strains, feats and mastery levels (A187) (§15.6)
- [ ] T047 §16 M6 step 4: take the screenshots with `tools/screenshot.ts`, each with `--profile tests/fixtures/profile-mid.json`, and read the PNGs against the checklist (§15.6, §16 M6)
  - `m6-traits`: `scene=underroot&tab=traits&test=1`.
  - `m6-strains`: `scene=underroot&tab=strains&test=1`.
  - `m6-feats`: `scene=underroot&tab=feats&test=1`.
  - `m6-mastery`: `scene=underroot&tab=mastery&test=1`.
  - `m6-locked-card`: `scene=underroot&tab=collection&test=1`.
  - The checklist: the capacity meter shows the right value; strain cards show their patch summary; locked feats show the condition text, and a locked building's card shows the feat that unlocks it.
- [ ] T048 Update `docs/status.md`, `docs/balance-backlog.md`, `data/CHANGELOG-balance.md` and the As built section of `docs/m6-plan.md`, and end the last PR's commit with a summary of the verification output (§16)
- [ ] T049 [USER] The meta loop on the dev site: the user plays a fresh profile's first runs, unlocks a building, buys a trait and a strain rank, and reads the Collection tab. Notes go in `docs/playtest-feedback.md` (§16 M6, §9.8)

## Dependencies and parallel work

- **Order:** Phase 1 → 2 → US1 → US2 → US3 and US4 → US5 → US6 → Phase 9.
  - US2 needs US1's banking, since feats pay Amber.
  - US3 and US4 need only Phase 2 and US1's currencies.
  - US5 needs US2's gating, since exclusive buildings join a core, and US4's strains, since mastery levels 5 and 8 grant them. Its Run it back cases (T052, T053) need US3's traits too.
  - US6 needs all of them.
- **In parallel:**
  - S5 (traits) and S6 (strains) may run side by side, and beside S3 and S4. S5 and S6 both edit `src/sim/state.ts`, `src/app/urlParams.ts` and `src/ui/screens/underroot.ts`, so merge one and rebase the other.
  - S0 may start as soon as R3 (R3 S15) and R4b (R4b-S7) are merged; S1 follows S0.
- **Handoffs in:**
  - `docs/tasks/run-it-back.md`, if records-1 has landed: RB/T006's v1 record (T008), RB/T007's store (T011), RB/T009's `runItBackSetup` and RB/T011's `runItBack()` (T011, T012, T053); records-2's Collection tab, RB/T033 and RB/T037 (T024).
  - `docs/tasks/r2a-battle-in-rounds.md`: R2a/T057's per-round stats with M6-Q1's feat stats (T019); R2a's emplacement compile and planning executors (T051).
  - `docs/tasks/r3-kit.md`: R3/T008 (`squadAdd`, `BuildingDef.archetype`), R3/T044 (`dealPacks`), R3/T046 (`draftPool`), and augments in the compile (T017, T022, T032, T036); R3/T073, the general's kit sources under #48 (T018).
  - `docs/tasks/r4-readable-armies.md`: R4/T032 (the shape block required on every unit sprite) for T036, and R4b's text home for T034.
- **Handoffs out:**
  - `docs/tasks/m7-gray-rot-and-content.md` takes:
    - the snapshot's `blights` and `decay`, and Decay in banking (T010, T013);
    - mastery level 10 (T003, T037);
    - Boss Down's unlock (T021);
    - the Blights tab beside T029's tabs;
    - G10 beside T041;
    - `--profile` and the read-only test load (T011, T046), for its `m7-blights` screenshot.
  - M8's final tournament (`docs/tasks/m8-release.md`) runs with every guardrail asserting, G9 included.

## Sessions

| Session | Tasks | Branch | Gate (true before starting) | Ends with |
|---|---|---|---|---|
| S0 | T001–T004 | `feature/m6-plan` | R3 merged into `develop` (R3 S15, its playtest gate R3/T141 asked) and R4b merged (R4b-S7, its fresh-tester gate R4/T075 asked) | `docs/m6-plan.md` agreed; the unlock map and mastery table in SPEC; PR into `develop` |
| S1 | T005–T011 | `feature/m6-profile` | S0 merged | The profile, the schemas and the run snapshot; PR into `develop`, no golden moved (or T009's refresh named) |
| S2 | T012–T015 | `feature/m6-banking` | S1 merged | Banking, the summary's earned lines, export and import; PR into `develop` |
| S3 | T016–T021 | `feature/m6-feats` | S2 merged; R2a's feat stats on `develop` (M6-Q1) | The stat view, feat evaluation and the feat list; PR into `develop` |
| S4 | T022–T024 | `feature/m6-ladder` | S3 merged | Gated packs, relics and commanders, the gated golden, the Collection tab; PR into `develop` |
| S5 | T025–T029 | `feature/m6-traits` | S2 merged | Traits and Root Capacity; PR into `develop` |
| S6 | T030–T034 | `feature/m6-strains` | S2 merged | Strains and ranks, the strain golden; PR into `develop` |
| S7 | T035, T050, T051, T036–T038 | `feature/m6-mastery` | S4 and S6 merged | Mastery levels 2–9 and the three exclusive buildings; PR into `develop` |
| S8 | T052–T053, T039–T042 | `feature/m6-meta-sim` | S5, S6 and S7 merged | Run it back's whole loadout, the meta sim and G9; PR into `develop` |
| S9 | T043–T049 | `feature/m6-verify` | S8 merged | M6 verified and documented; PR into `develop`; the user's review (T049) |

## Coverage

**SPEC §16 items**

| SPEC §16 item | Tasks |
|---|---|
| The profile and the Underroot screens | T008, T011, T024, T029, T034, T038 |
| Spores and Amber | T013, T014 (earned), T027 (Spores spent), T032 (Amber spent) |
| The unlock ladder: the roster beyond the six core archetypes is gated, a few buildings at a time | T002, T021, T022 |
| A locked card shows the feat that unlocks it | T024, T047 |
| From M6, packs deal only what the profile has unlocked | T017, T018, T022 |
| At least 15 feats with the condition DSL, written for rounds | T009 (Into the Rot), T016, T019, T020, T021 |
| The feats tied to columns (Long March, Unbroken Mat) are rewritten, and every other feat is checked against v2's stats | T002, T021 |
| 12 strains with Amber ranks, related to augments as §9.3 says | T003 (one count, M6-Q5), T030–T034 |
| 12 traits and Root Capacity | T025–T029 |
| Traits tied to retired systems (Root Pressure; Bulwark Spores' and Feral Bloom's building HP) get new effects | T025, T026, T028 |
| Commander mastery: 10 levels × 3 commanders, the exclusive buildings and alternate powers | T003, T004 (§16 M6's scope line: levels 2–9 here, level 10 in M7, A171), T035–T038, T050, T051 |
| The Rootgate's effect is tied to capture, so it gets a new one | T036, T050, T051 (#61) |
| Save export/import and a migration framework | T008, T012, T015 |
| Independent of M6: Run it back, and records (M6 doesn't depend on it) | `docs/tasks/run-it-back.md`; M6's gate doesn't wait on it, and Technical context covers its absence; T052, T053 extend Run it back to M6's loadout |
| Step 1: `npm run verify`, with unit tests for feat conditions, the ladder, strain patches, capacity, mastery, a migration fixture and export → import | T043 (T005, T012, T016, T017, T025, T030, T035) |
| Step 2: unlock pacing against §9.8 with `--meta-progress` | T040, T044 |
| Step 3: `npm run test:slow`, G9 in round form | T041, T045 |
| Step 4: browser checks `m6-traits`, `m6-strains`, `m6-feats`, `m6-mastery`, `m6-locked-card`, and the visual checklist | T011 (read-only test load), T029, T034, T024, T046, T047 |
| Every milestone: playable, verify green, a commit summarizing the verification | Every checkpoint; T043, T048 |
| From R2 on: built on feature branches and merged into `develop` as the default, never as a `?proto=` knob; retired systems' tests, goldens and guardrails removed in the same change | Sessions: every session is a feature branch into `develop`, and nothing is a knob. M6 retires only the settings sheet's "arrives with the profile in M6" note (T015) and the old `rotEater.unlockedBy` id (T009) |

**Findings**

| Finding | Handled by |
|---|---|
| A168 (high): six pack buildings have no unlock source | M6-Q3; T002, T021, T022 |
| A169 (high): mastery rewards unnamed; strains without a source | M6-Q4; T003, T036 |
| A171 (medium): level 10's blights; M6 can't reach 100% | M6-Q4; T003 (level 10 to M7), T004 (the scope line), T040 (M6's content only) |
| A172 (medium): the profile must be meta only | RB-Q1; T004, T008 |
| A173 (medium): Second Flush and Hardy Spores unreachable | X9 (R3); T002 |
| A174 (medium): `StrainDef` can't express §11.5 | T004, T009, T032 |
| A175 (medium): no stat-path whitelist; missing feat stats | M6-Q1; T004, T019 |
| A176 (medium): when an unlock applies; no meta fields in `RunState` | M6-Q2; T007, T010, T011 |
| A177 (medium): the pacing check's terms | M6-Q8; T001 (trait prices), T004, T040, T044 |
| A179 (medium): where records live | RB-Q1 (`docs/tasks/run-it-back.md`); T005, T008 |
| A190 (medium): strains target v1's basics; two counts | M6-Q5; T003, T031 |
| A085 (medium, R2): "+1 unit" effects scale with unit size (the Shrine) | #61; T036 |
| A124 (medium, R3): the Vault's and the Shrine's DSL form | R3 builds `squadAdd` (R3/T008); T036 |
