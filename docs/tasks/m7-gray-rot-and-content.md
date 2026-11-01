# M7 — Gray Rot, blights, content and polish: tasks

M7 gives the enemy its own face and the run its difficulty ladder:
- the Gray Rot's own roster, with sprites under the shape language, which the generals switch to;
- six blights and Decay, rewritten for rounds, with Decay's reward and the best Decay per commander;
- the Three Hollows, the 3-lane map;
- the content the run packs still need;
- a colorblind palette check;
- first-run hints beyond the first-time tips.

SPEC §16 M7 has no Goal line, so this is its scope.

This list is a draft of 2026-11-01, made from SPEC v2 and `docs/tasks/spec-analysis.md` before R2–R4 and M6 land and before `docs/m7-plan.md` exists. **Refine with the tasks step when the plan is agreed.** It's coarse: the plan comes first, and the paths of modules that R2, R3, R4a and M6 create are their planned names. Task IDs run in execution order, except T046, which was added later and sits where it runs.

**Status:** Draft, not agreed · **Spec:** SPEC §16 "Milestone 7 — Gray Rot, blights, content and polish" and the sections it cites · **Plan:** `docs/m7-plan.md` (written in S0) · **Gate in:** R3, R4b and M6 merged into `develop` (R4a's shape metadata and R4b's marks on `develop`) · **Gate out:** the user's review of the Gray Rot, blights and the Three Hollows on the dev site (T045)

## Read first

- SPEC §2 (the palette), §5.8 (the shape language), §7.1, §7.4 (the counter cycle), §7.8, §7.9, §9.5 (level 10), §9.6, §10.2 (the first-time tips), §10.4 (the color-blind assist), §11.8, §11.9, §11.11, §11.12, §11.15, §12.3 (G3, G10, G12, the run-pool maps), §13.6, §14.2 (`FactionDef`, `BlightDef`, the stat keys `side.plots`, `side.incomeMult`, `general.counterLeadRounds` and `battle.sporestormStart`), §14.3, §15.3, §15.4, §15.6 (`--filter`), §16 M7, §17 #15 and #20, §18.2 #62–#64.
- Code:
  - `data/factions/gray-rot/faction.json` (today it lists Velvet Bloom ids, "Mirror match until M7"), `data/generals.json`;
  - `src/sim/create.ts` (each seat's faction is fixed; `MILESTONE`), `src/run/flow.ts` (`battleConfig`'s `enemyFaction`, `generalKit`), `src/run/route.ts` (`mapPool` admits maps by `milestone <= MILESTONE`), `src/sim/ai/counter.ts`, `src/sim/ai/profiles.ts`;
  - `src/data/schema.ts` (`BuildingSchema` and `UnitSchema` are `.strict()`), `src/data/registry.ts`;
  - `tools/lib/balance.ts` (`ROSTER`), `tools/balance.ts`, `tools/experiment.ts`;
  - `src/render/atlas.ts` (the palette swap, `factionSwap`), `data/sprites/units.json`, `data/sprites/buildings.json`;
  - `data/maps/test-3lane.json`, the round bench scenario `data/scenarios/bench-300.json` (R2a/T114's, moved there by R2b/T048) and the round bench `tools/lib/bench.ts` (R2a/T114's cases, moved there by R2b/T050);
  - `src/app/tips.ts`, `src/ui/callouts.ts`, `tests/unit/contrast.test.ts`, `tools/screenshot.ts`.
  - M6's `src/meta/profile.ts`, `src/meta/mastery.ts`, `data/mastery.json` and `data/feats.json`; R3's `src/run/packs.ts` and `data/packs.json`; R4's `src/data/shapes.ts`, `tests/unit/shapes.test.ts` and `data/scenarios/unit-lineup.json`.
- Docs: `docs/tasks/clarify.md` (the M7 block, X9, M6-Q4, M6-Q8), `docs/tasks/r4-readable-armies.md` (the shape block, R4/T009, T017, T032, T033, and its Calls 4 and 8), `docs/tasks/r3-kit.md`, `docs/tasks/m6-meta-progression.md`, `.claude/rules/balance.md`.

## Before you start

**Decisions** (the tasks assume each recommendation):
- M7-Q1 (R2a S0 for the trait, M7 S0 for the records; blocks T002, T006, T009, T011): separate Gray Rot records, each with a `mirrors` field, whose stats are the mirror's; the faction trait dropped. If the trait stays, it's enemy-seat data from R2a, so R2's bands already include it, and T011 adds it as `FactionDef.trait`.
- M7-Q2 (S0; blocks T019, T020): the blight details: Thin Soil's stump, Early Storm with Mold Bloom, and Quick Learner's window.
- M7-Q3 (S0; blocks T037): the first-run hint list. First guess: the first route choice, the first spoils, the first locked card, and the first unlock.
- M7-Q4 (S0; blocks T003's §12.3 line, T031, T032): G3's and G12's seats under a distinct roster. First guess: the mono bot always sits in the Velvet Bloom seat against a balanced Gray Rot bot, and the two games per seed swap map sides, not factions. It changes §12.3's guardrail definition, so it needs the user's OK (`.claude/rules/balance.md`).
- #62 (S0; blocks T026, T027): the Three Hollows at 32 wide with `homeCols` 6. If the user keeps the first guess (30 wide, 4 home columns), the map has no sprawl.
- #63 (S0; blocks T002, T010): the Gray Rot's area archetype follows #36: a Gray Rot Burster, or the Ashpuff Kiln if the Mortar is the sixth.
- #64 (S0; blocks T002): Gray Rot counterparts for the healer, the fast swarm and the tunneler, and no flyer (X9).
- X9 (R3 S0; blocks T003, T034, T035): flyers after the first release, so runs deal 4 of 9 packs. If flyers ship in M7 instead, T034 grows into the Drift Stalk, the Driftlings and the Air pack, and #64–#66 move into M7.
- M6-Q8 (M7 S0 for G10; blocks T022): G10 uses a named Decay-6 set.
- M6-Q4 (M6 S0; blocks T021): mastery level 10's commander blight lands here.
- Settled earlier, read here: #36 and #46 (R3), #18, #19 and #21 (R2), R4-Q1, R4-Q2 and R4-Q4 (R4a).

**Results this needs:**
- R3 merged: packs, the always-in set, augments, combos matched by archetype (R3/T012), `BuildingDef.archetype` (R3/T008) and the general's kit by battle index.
- R4a's shape metadata (`shape { body, mark }` on sprites), its data checks (R4/T032 makes the block required on every `u-` sprite) and its silhouette test (R4/T017). R4b's matchup marks. R4's lineup scenarios (R4/T009, ported in R4/T043).
- M6 merged: the profile, the run's meta snapshot, the Underroot's tabs, `--profile` and the read-only test load (M6/T011, M6/T046).
- R2's guardrails in round form, with the bands #35 set.

**Findings:**
- A170 (high): nothing maps a Gray Rot card to its Velvet Bloom card, packs, augments, the always-in set and general kits all name Velvet Bloom ids, and SPEC doesn't say whether Gray Rot stats are derived or authored. M7-Q1; T002, T004–T013.
- A148 (high, R4): no measurable body band or weapon mark. R4a's shape block settles the band; the Gray Rot's sprites carry it (T014, T015). Units carry no weapon mark since 2026-11-01 (R4/T077).
- A171 (medium): mastery level 10's three blights exceed §17 #15's six. T003, T021.
- A173 (medium): Second Flush and Hardy Spores can't reach a run. X9; T034 checks it.
- A178 (medium): M7's "content the ten run packs need" overlaps R3, and the tenth pack waits for flyers. X9; T003, T034, T035.
- A191 (medium): SPEC disagrees on whether flyers ship, and #64 asks for a Gray Rot flyer. X9; T002, T003.
- A149 and A151 (medium, R4): moot since 2026-11-01. The user dropped weapon marks from units and emplacements (R4-Q2 superseded, R4/T077), so no Gray Rot sprite carries one either.
- A154 (medium, R4): an emplacement needs a slot sprite, `e-<buildingId>` (R4 Call 4). T014, T015 (`e-ashpuffKiln`).
- A158 (medium, R4): Twin Roots draws at about 1.78×. T018's twin lineup.
- A165 (medium, R4): bodies must fit the squad grid's width (R4 Call 8). T014.
- A159 (medium, R4): the team tones barely differ in lightness under the filters. R4a fixes the palette; T016 and T043 check it again on the new roster.
- A166 (medium, R4): weak-class marks vanish on the Gray Rot's gray body. R4b fixes the marks; T016 checks them against the new sprites.
- Lows:
  - A182 (the trait quietly retunes every band): M7-Q1; T002, T011;
  - A183 (the Three Hollows' columns conflict with #19): #62; T027;
  - A184 (G12 isn't named on the Three Hollows): T003, T031, T041;
  - A188 (G10's Decay-6 set is undefined): T022;
  - A189 (Thin Soil's plot; Early Storm with Mold Bloom): M7-Q2; T019;
  - A051 (Quick Learner's window): M7-Q2; T019;
  - A139 and A147 (packs whose building is missing): X9 and #46; T034.

## Technical context

**The Gray Rot as role aliases** (a spec gap, A170, M7-Q1):
- Each Gray Rot building and unit is its own record in `data/factions/gray-rot/buildings.json` and `units.json` (new), with no faction trait (A182).
- **Call (reversible, A170, M7-Q1): Gray Rot stats are derived, not authored.** A Gray Rot building record holds only `{ id, name, sprite, description, mirrors }`, and a unit `{ id, name, sprite, mirrors }`. New strict `MirrorBuildingSchema` and `MirrorUnitSchema` in `src/data/schema.ts` validate them. `src/data/registry.ts` copies every other field (archetype, armor, damage type, squad, cost, HP, damage and the rest) from the mirror at load, so a retune touches one record and the two sides can't drift.
- Content keeps one home. Packs, the always-in set, augments, combos and counter sets stay in Velvet Bloom ids, and they resolve to the general's faction through `counterpartIn(content, id, faction)` in `src/data/registry.ts`, which maps either way.
- `data/generals.json` is rewritten in Gray Rot ids, as §11.11 says, the scripted general included (§7.9).
- Every pack building needs a Gray Rot counterpart, so the general's extra cards from packs resolve (#48):
  - the Rhizome Vault and the Spore Exchange, which §11.12 doesn't name;
  - the healer, the fast swarm and the tunneler (#64).
  The Drift Stalk has none under X9.

**A faction per seat:**
- Today the seats' factions are fixed in `src/sim/create.ts` and `src/run/flow.ts`, and the tools read one roster (`ROSTER` in `tools/lib/balance.ts`).
- M7 makes each seat's faction a config input, and the round scenario format's sides gain `faction?` (T007).
- The checks pick their seats (M7-Q4):
  - G3 and G12: the mono bot always in the Velvet Bloom seat against a balanced Gray Rot bot, which is what the player meets. The two games per seed swap map sides, not factions. This rewrites §12.3's "50 seeds per seat", so T003 edits §12.3 once the user agrees;
  - map fairness: Velvet Bloom against Velvet Bloom.

**Sprites:**
- Gray Rot sprites are new ids in `data/sprites/units.json` and `buildings.json`. Each `u-` sprite carries the shape block R4/T032 requires, with its mirror's body class (§5.8), and passes R4's checks in `src/data/shapes.ts`. It carries no weapon mark: units have none since 2026-11-01 (R4/T077), and the block is `{ body }`.
- R4's rules apply as they stand: an emplacement's slot sprite is `e-<buildingId>`, with no weapon mark (R4 Call 4, A154); a body's width stays within R4's Call 8 width bound (A165).
- Gray Rot units draw from their own sprites, so their body tones live in those sprites' palettes. R4/T033's contrast test reads `data/factions/*/faction.json`; T016 points it at the sprites' palettes.
- The palette swap in `src/render/atlas.ts` stays for the Heartcap and the frame only.
- Sprites aren't battle state, so they move no golden. The roster's ids do.

**Blights:**
- `data/blights.json` (new) and `BlightDef` in `src/data/schema.ts`, with `decayOf` and `blightModifiers` in `src/meta/blights.ts` (new).
- They apply as `BattleModifier`s in `battleConfig` (`src/run/flow.ts`), from M6's `RunState.meta.blights`. M7 adds `blights` and `decay` to the snapshot.
- They use the stat keys R2 adds: `side.plots`, `side.incomeMult` (with `enemyIncomeMult`), `battle.sporestormStart` and `general.counterLeadRounds`.
- They unlock with Boss Down, whose `reward.unlocks` in `data/feats.json` gains the six blight ids (T023).

**Goldens:**
- The Gray Rot's ids move every golden whose enemy is the general: run `npm run golden -- update` once in T013, with the reason in the commit.
- Raising `MILESTONE` to 7 adds the Three Hollows to the route's map pool (`mapPool` in `src/run/route.ts`), which changes the `route` stream's map draws. So T028 moves every run golden: run `npm run golden -- update`, with the reason in the commit.
- Blights move nothing unless a golden uses them. T024 adds one that does.
- S4 (T024) and S5 (T028) both write `tests/golden/`: whichever merges second rebases and runs `npm run golden -- update` again.

**Calls this list makes** (each reversible):
- **Gray Rot stats are derived from the mirror** (above, A170).
- **Mastery level 10:** each commander's blight is worth +2 Decay. The first release then ships 6 general blights plus 3 commander blights, and §17 #15 is reworded to say so (A171). If the user prefers, level 10 gets another reward, and T021 builds that instead.
- **The Three Hollows' third-rank order:** the outer lanes' file 1 first, then the middle lane's, capped at 4 more plots (#18, A183). It is a map field if R2a's #19 order is data.
- **The bench:** the round `bench-300` scenario moves from `test-3lane` to `three-hollows`, which §15.4 says happens when the 3-lane map ships. `test-3lane` stays as a test map.

## Stories

| ID | Priority | Story | Independent test |
|---|---|---|---|
| US1 | P1 | The general fields the Gray Rot's own roster, with every pack, augment and counter resolving to its counterparts | Unit: the general's card for a dealt pack is its Gray Rot mirror; data test: every general names only Gray Rot ids |
| US2 | P2 | Each Gray Rot unit has its own silhouette and reads its armor and weapon like its Velvet Bloom role | Screenshot `m7-gray-rot` against the checklist; the shape data checks |
| US3 | P3 | Blights and Decay: an opt-in difficulty ladder that pays more Spores | Unit: each blight's effect and Decay's math; screenshot `m7-blights` |
| US4 | P4 | The Three Hollows plays, with a colony in each lane, and joins the run's maps | Data test: symmetry and plots; screenshot `m7-three-hollows` |
| US5 | P5 | The balance tools put a faction in each seat, and the tournament covers every map | `npm run balance -- tournament --maps all --seeds 30` |
| US6 | P6 | The run packs are complete for the first release, and first-run hints teach what tips don't | Unit: every pack's building and relics exist; each hint fires once |

## Phase 1: Setup

- [ ] T001 [USER] Write `docs/m7-plan.md` (new) in CLAUDE.md's format, and agree it with the user, settling M7-Q1 to M7-Q4, #62, #63, #64 and G10's terms (M6-Q8) through `docs/tasks/clarify.md` (§16 M7, §9.6, §11.12, §12.3) ⛔ M7-Q1
  - The plan's open questions include the first-run hint list (M7-Q3), since SPEC says only "beyond the first-time tips", and G3's and G12's seats under a distinct roster (M7-Q4).
- [ ] T002 [USER] Write the Gray Rot's alias table into `SPEC.md` §11.12, and agree it (A170, A182, A191) (§11.12, §5.8) ⛔ #63 #64
  - Every Gray Rot building and unit names its Velvet Bloom mirror: the core six, the Truffle Cellar's Grub Larder, and every pack building.
  - Name the counterparts of the Rhizome Vault, the Spore Exchange, the Tender's Ring, the Morel Warren and the Rhizomorph Tunnel.
  - Say that Gray Rot stats are derived from the mirror (M7-Q1).
  - No flyer (X9). The faction trait is dropped (M7-Q1).
- [ ] T003 Write S0's other edits into `SPEC.md` and `docs/status.md` (§16 M7, §9.5, §11.8, §11.9, §12.3, §17) ⛔ M7-Q4
  - §16 M7's content line under X9: the 9 shipped packs are complete, and the Air pack's relics sit in every run's pool (A178, A191).
  - §11.8: M7-Q2's blight details (A189, A051).
  - §11.9 and §4.6: #62's Three Hollows (A183).
  - §9.5, §11.8 and §17 #15: level 10's blights (A171).
  - §12.3: G10's Decay-6 set (A188).
  - §12.3 G3 and G12: the mono bot always sits in the Velvet Bloom seat against a balanced Gray Rot bot; the two games per seed swap map sides, not factions (A170, M7-Q4). This line waits on M7-Q4.
  - §16 M7's verification: add "G12 on the Three Hollows" (A184).

## Phase 2: Foundational (blocks every story)

- [ ] T004 [P] Add the mirror case to `tests/unit/data.test.ts` (§11.12, §5.8)
  - Every record that has `mirrors` names an existing Velvet Bloom building or unit of the same kind, and after load its archetype (R3/T008's `BuildingDef.archetype`), armor, damage type, squad and cost equal the mirror's (§5.8's MUST).
  - A mirror record that sets a stat field fails `MirrorBuildingSchema` or `MirrorUnitSchema`.
  - It passes on zero records today; T008 adds the cases that need the roster.
- [ ] T005 [P] Add the seat cases to `tests/unit/determinism.test.ts` (§12.3, §14.4)
  - A config with both seats on `velvet-bloom` gives a true mirror.
  - Over 40 seeds, `bot:balanced` against a general on `gray-rot` and against the same general on `velvet-bloom` win within 5 points of each other. If 40 seeds run longer than the unit suite allows (R2-Q9), the case moves to `tests/slow/`.
  - Each Gray Rot unit's compiled stats equal its mirror's, field for field (zero units until T009).
- [ ] T006 Add `mirrors`, `MirrorBuildingSchema` and `MirrorUnitSchema` to `src/data/schema.ts`. `src/data/registry.ts` loads a mirror record by copying every field but `id`, `name`, `sprite` and `description` from its mirror, checks the mirrors, and adds `counterpartIn(content, id, faction)`, which maps either way (§11.12, §14.1, §14.2) ⛔ M7-Q1
- [ ] T007 Make each seat's faction a config input, replacing the fixed seats in `src/sim/create.ts` (`makeConfig`'s options) and `src/run/flow.ts` (`battleConfig`'s `enemyFaction`), and give the round scenario format's sides a `faction?` field (R2a/T029's `RoundScenarioSchema` in `src/data/schema.ts`) (§14.4, §11.12, §15.2)

**Checkpoint:** `npx vitest run tests/unit/data.test.ts tests/unit/determinism.test.ts` and `npm run verify` pass, with no golden moved yet.

## Phase 3: US1 — The general fields the Gray Rot (P1)

**Goal:** generals plan from the Gray Rot's own cards, and everything a run names in Velvet Bloom ids resolves to them. **Independent test:** T008's cases.

- [ ] T008 [US1] Add the resolution cases to `tests/unit/run.test.ts`, `tests/unit/counters.test.ts` and `tests/unit/data.test.ts` (§7.8, §11.11, §11.12, §11.15)
  - The general's kit for a dealt pack holds its Gray Rot mirror.
  - Its augments attach to the mirror.
  - A counter set's answer resolves to a Gray Rot card.
  - A run without the Hunt pack meets no Pallid Stalkers (#48).
  - Data: every general in `data/generals.json` names only Gray Rot ids.
  - Data: every pack building in `data/packs.json` has a Gray Rot counterpart.
- [ ] T009 [US1] Write `data/factions/gray-rot/buildings.json` (new) and `data/factions/gray-rot/units.json` (new) from T002's table: each record holds only `{ id, name, sprite, description, mirrors }` (units `{ id, name, sprite, mirrors }`) (§11.12) ⛔ M7-Q1
- [ ] T010 [US1] Rewrite `data/generals.json` in Gray Rot ids: openers, weights, preferred lists and limits, the scripted general included (§11.11, §7.9) ⛔ §18.2 #63
- [ ] T011 [US1] Rewrite `data/factions/gray-rot/faction.json`: its building list in Gray Rot ids, no trait, and the "Mirror match" note removed (§11.12, §14.2) ⛔ M7-Q1
- [ ] T012 [US1] Resolve the run's Velvet Bloom ids for the general through `counterpartIn` in `src/run/flow.ts` (`generalKit`), `src/sim/ai/counter.ts`, `src/sim/ai/profiles.ts`, `src/run/packs.ts` (from R3) and `src/app/run.ts` (§7.4, §7.8, §11.15, §16 M6)
  - In `src/app/run.ts`, where records-2 marks the general's kit and army seen (RB/T036, `docs/tasks/run-it-back.md`), map each Gray Rot id to its `mirrors` id before `markSeen`, so a met Ashling counts as the Sporeling Burrow seen (RB-Q4). Skip this if records-2 hasn't landed.
- [ ] T013 [US1] Refresh the goldens with `npm run golden -- update` (`tools/golden.ts`), with the reason in the commit, and log the roster in `data/CHANGELOG-balance.md` (§15.5, §12.4)

**Checkpoint:** `npx vitest run tests/unit/run.test.ts tests/unit/counters.test.ts tests/unit/data.test.ts` and `npm run verify` pass: battles field the Gray Rot's cards, and the goldens are refreshed.

## Phase 4: US2 — The Gray Rot reads like its roles (P2)

**Goal:** each Gray Rot archetype has its own silhouette, with its mirror's body size and damage type, and no weapon mark (R4/T077). **Independent test:** T014's checks, and the screenshots in T018.

- [ ] T014 [US2] Add the Gray Rot to R4's sprite checks in `tests/unit/data.test.ts` and `tests/unit/shapes.test.ts` (R4/T017) (§5.8, §14.3, §17 #20)
  - Each Gray Rot `u-` sprite carries R4's required shape block (R4/T032), with its mirror's body class (A148). No sprite carries a weapon mark (R4/T077).
  - Each body's width is within R4's Call 8 bound (A165).
  - The Ashpuff Kiln has its `e-ashpuffKiln` slot sprite (R4 Call 4, A154).
  - Each Gray Rot archetype's silhouette is distinct from the others and from its mirror's.
- [ ] T015 [US2] Draw the Gray Rot's unit and building sprites in `data/sprites/units.json` and `data/sprites/buildings.json`, as text-defined sprites with 2-frame cycles (§11.12, §14.3, §17 #20)
  - Each `u-` sprite carries R4's required shape block (R4/T032), the body only, with no weapon mark (A148; R4/T077).
  - Draw `e-ashpuffKiln` as the Ashpuff Kiln's slot sprite (R4 Call 4, A154).
- [ ] T016 [US2] Extend `tests/unit/contrast.test.ts` (R4/T033) to the Gray Rot's new body tones, read from the new sprites' palettes in `data/sprites/units.json` (A159), and to R4b's weak and strong marks drawn on them (A166) (§2, §10.4)
  - Adjust the Gray Rot sprites' palettes, or `data/factions/gray-rot/faction.json`'s Heartcap and frame tones, only if a pair fails.
- [ ] T017 [US2] Draw Gray Rot units from their own sprites in `src/render/atlas.ts`, keeping the palette swap for the Heartcap and the frame (§13.6, §14.3)
- [ ] T018 [US2] Take the `m7-gray-rot` and `m7-gray-rot-twin` screenshots with `tools/screenshot.ts`, and read the PNGs (§15.6, §16 M7 step 4)
  - Set the enemy side of R4's lineups, `data/scenarios/unit-lineup.json` and `data/scenarios/unit-lineup-twin.json` (R4/T009, R4/T043; R2b/T048 ported them to the round format in place), to `faction: "gray-rot"` (the field T007 adds), with its units resolved to their Gray Rot counterparts.
  - Params: `scenario=unit-lineup&test=1&paused=1` and `scenario=unit-lineup-twin&test=1&paused=1` (Twin Roots' fractional scale, A158).
  - Each Gray Rot archetype has its own silhouette and reads its armor and weapon like its Velvet Bloom role.

**Checkpoint:** `npx vitest run tests/unit/data.test.ts tests/unit/shapes.test.ts tests/unit/contrast.test.ts` passes, and the `m7-gray-rot` PNGs meet the checklist.

## Phase 5: US3 — Blights and Decay (P3)

**Goal:** after the first boss win, a run can take blights for more Spores. **Independent test:** T019's cases.

- [ ] T019 [US3] Add the blight cases to `tests/unit/meta.test.ts` (from M6) (§9.6, §11.8, §16 M7 step 1) ⛔ M7-Q2
  - Each blight's modifier on a staged battle:
    - Hardened Rot: enemy units +8% and +15% HP;
    - Quick Learner: a cycle stored as `{ round, from }`, moved one round earlier and reading one round less;
    - Thin Soil: the back rank's last plot without loam becomes your stump (the lower lane on Twin Roots), and the general's plots don't change;
    - Famine: the stipend −25% and −50%;
    - Early Storm: the storm starts at round 4, and Mold Bloom's −1 applies after it, floored at round 3;
    - Hoarding Rot: the general's income ×1.15 and ×1.30.
  - Decay sums the ranks.
  - Decay 3 turns 100 Spores into 130, while XP uses the Spores before the multiplier.
  - The best Decay updates only on a win.
- [ ] T020 [US3] Write `data/blights.json` (new) with §11.8's six blights, `BlightDef` in `src/data/schema.ts`, and `decayOf` and `blightModifiers` in `src/meta/blights.ts` (new). Log them in `data/CHANGELOG-balance.md` (§9.6, §11.8, §14.2) ⛔ M7-Q2
- [ ] T021 [US3] Add mastery level 10's commander blights to `data/blights.json`, `data/mastery.json` (M6's table) and `src/meta/mastery.ts` (from M6), worth +2 Decay each (A171) (§9.5) ⛔ M6-Q4
- [ ] T022 [US3] Add G10 to `tests/slow/meta.test.ts` (from M6), with the named Decay-6 set and its band in `data/balance-targets.json`: Decay 6 lowers `bot:balanced`'s run win rate by 25–50 points against Decay 0 (A188) (§12.3) ⛔ M6-Q8
- [ ] T023 [US3] Bring blights into runs through `src/run/runState.ts`, `src/run/flow.ts`, `src/meta/profile.ts` (from M6) and `data/feats.json` (§9.6, §8.1, §8.6, §9.2)
  - `src/run/runState.ts`: the snapshot's `blights` and `decay`.
  - `src/run/flow.ts`: `battleConfig` adds `blightModifiers` as `BattleModifier`s.
  - `src/meta/profile.ts`: banking applies `(1 + 0.10 × Decay)` and records the best Decay per commander.
  - Blights unlock with Boss Down: its `reward.unlocks` in `data/feats.json` gains the six blight ids. Log it in `data/CHANGELOG-balance.md`.
- [ ] T024 [US3] Add a blight golden, `tests/golden/m7-blights-s5.replay.json` (new), with Hoarding Rot and Thin Soil, through `tools/golden.ts` with `npm run golden -- update` (§15.5)
- [ ] T025 [US3] Add the Underroot's Blights tab in `src/ui/screens/underroot.ts` (with `tab=blights` in `src/app/urlParams.ts`), the best Decay on each commander card, and the summary's Decay row in `src/ui/screens/run.ts` (§8.1, §9.6, §10.5, §15.6)

**Checkpoint:** `npx vitest run tests/unit/meta.test.ts`, `npm run golden -- verify` and `npx vitest run tests/slow/meta.test.ts` (G10) pass.

## Phase 6: US4 — The Three Hollows (P4)

**Goal:** a 3-lane map with a colony in each lane joins the run. **Independent test:** T026's checks and T030's screenshot.

- [ ] T026 [US4] Add the Three Hollows cases to `tests/unit/data.test.ts` (§4.1, §4.6, §11.9) ⛔ §18.2 #62
  - The map is point-symmetric.
  - Each lane's colony has 4 plots, 2 ranks × 2 files, with the loam in the middle lane's back rank.
  - `homeCols` is 6.
  - The third rank opens in T027's order, capped at 4.
- [ ] T027 [US4] Write `data/maps/three-hollows.json` (new): 32 × 14 (4 + 1 + 4 + 1 + 4), `homeCols` 6, `milestone` 7, colonies by §11.9's layout (§11.9, §4.6) ⛔ §18.2 #62
  - The third-rank order is a map field if R2a's #19 order is data.
- [ ] T028 [US4] Raise `MILESTONE` in `src/sim/create.ts` to 7, so the route's map pool (`mapPool` in `src/run/route.ts`) deals the Three Hollows, and point the round bench-300 scenario at `three-hollows` (§11.9, §15.4, §15.5)
  - The scenario is `data/scenarios/bench-300.json`: R2a/T114 made it under `data/scenarios/rounds/`, and R2b/T048 moved it.
  - The map pool gained a map, so the `route` stream's draws change and every run golden moves: run `npm run golden -- update`, and name the reason in the commit.
  - Log the map in `data/CHANGELOG-balance.md`.
- [ ] T029 [US4] Add a `three-hollows` full-colony case to the round bench (`tools/lib/bench.ts`, R2a/T114's cases moved there by R2b/T050), budgeted per side as #7 and A200 settled, and run `npm run bench` (`tools/bench.ts`) against §13.7's budget (§13.7, §15.4)
- [ ] T030 [US4] Take the `m7-three-hollows` screenshot with `tools/screenshot.ts` (`map=three-hollows&seed=1&test=1&round=1&phase=planning`), and check that the 3-lane map fits 1280×720 (§15.6, §16 M7 step 4)

**Checkpoint:** `npx vitest run tests/unit/data.test.ts`, `npm run golden -- verify`, `npm run bench` and the screenshot pass: the Three Hollows plays and fits.

## Phase 7: US5 — A faction per seat in the tools, and every map (P5)

**Goal:** the balance tools measure what the player meets, on every map. **Independent test:** the tournament in T040.

- [ ] T031 [US5] Add the tool cases to `tests/unit/counters.test.ts`: `tournament --maps all` excludes `testOnly` maps, and the G3 cell puts mono Velvet Bloom against a balanced Gray Rot bot, swapping map sides between a seed's two games (§12.3, §15.3) ⛔ M7-Q4
- [ ] T032 [US5] Put a faction in each seat in `tools/lib/balance.ts` (replacing `ROSTER`), `tools/lib/run.ts` and `tools/experiment.ts` (§12.2, §12.3) ⛔ M7-Q4
  - G3 and G12 run mono Velvet Bloom against Gray Rot, as T003's §12.3 line says.
  - Map fairness runs Velvet Bloom against Velvet Bloom.
- [ ] T033 [US5] Add `--maps all` to the tournament in `tools/balance.ts`. Its report gives each map's median rounds per battle and each side's win rate in mirror bot matchups (§15.3, §16 M7 step 3)

**Checkpoint:** `npx vitest run tests/unit/counters.test.ts` passes, and `npm run balance -- tournament --maps all --seeds 5` prints a row per map.

## Phase 8: US6 — Pack content and first-run hints (P6)

**Goal:** the first release's packs are whole, and new players get the hints S0 agreed. **Independent test:** T034's checks, and T036's hint cases.

- [ ] T034 [US6] Check the packs' content in `tests/unit/packs.test.ts` (from R3) and `data/packs.json` (from R3) (§11.15, §8.4, §1.3 #11) ⛔ X9
  - Every shipped pack's building and both relics exist and validate.
  - Every relic has a v2 effect.
  - Hardy Spores and Second Flush are in every run's pool (A173).
  - A pack whose building isn't in the roster is never dealt, and its relics join the open pool (#46, A147).
  - The card check (`npm run experiment -- --checks cards`) shows each pack card offered.
- [ ] T035 [US6] [USER] List what T034 finds missing in `docs/m7-plan.md` with a first-guess v2 effect for each, and add to `data/factions/velvet-bloom/buildings.json`, `data/relics.json` and `data/packs.json` only what the user approves; log each in `data/CHANGELOG-balance.md` (§11.15, §11.7, §12.4) ⛔ X9
- [ ] T036 [US6] Add the hint cases to `tests/unit/teachingText.test.ts`: each hint fires once, is remembered under `spore-sprawl/tips/v1` (through `storageKey()`), and agrees with the rules it teaches (§10.2)
- [ ] T037 [US6] Build the first-run hints in `src/app/tips.ts` and `src/ui/callouts.ts`, on the tips queue, under new tip ids in the same record (§10.2) ⛔ M7-Q3
  - First guess: the first route choice, the first spoils, the first locked card, and the first unlock.

**Checkpoint:** `npx vitest run tests/unit/packs.test.ts tests/unit/teachingText.test.ts` and `npm run verify` pass.

## Phase 9: Polish and verification

- [ ] T038 §16 M7 step 1: run `npm run verify` (`tools/verify.ts`), with the blight and Decay tests (T019) in the suite (§16 M7)
- [ ] T039 §16 M7 step 2: run `npm run test:slow` (`tests/slow/`) with G10 (T022) and with the counter bar and G3 on clashes run again against the Gray Rot roster (T032) (§12.3, §16 M7)
- [ ] T040 §16 M7 step 3: run `npm run balance -- tournament --maps all --seeds 30` (`tools/balance.ts`). Expect every map's median rounds per battle in band and no map above 65% for either side in mirror bot matchups. Misses go in `docs/balance-backlog.md` with their numbers (§12.3, §16 M7)
- [ ] T041 Run G12 on the Three Hollows through `npm run experiment -- --checks counters` (`tools/experiment.ts`), and record the result in `docs/balance-backlog.md` (A184) (§12.3)
- [ ] T046 Write `tests/fixtures/profile-late.json` (new): a profile with Boss Down done, the six blights unlocked, a best Decay on two commanders and mastery level 10 on one, for T042's `m7-blights` and M8's preview screenshots (§15.6, §9.6)
- [ ] T042 §16 M7 step 4: take the screenshots with `tools/screenshot.ts` (§15.6, §16 M7)
  - `m7-gray-rot` and `m7-gray-rot-twin` (T018's params).
  - `m7-three-hollows` (T030's params), and filtered copies with `--filter deuteranopia` and `--filter protanopia`.
  - `m7-blights`: `scene=underroot&tab=blights&test=1`, with `--profile tests/fixtures/profile-late.json` (M6/T011's read-only load shows it).
- [ ] T043 Read every PNG against the visual checklist, and record the colorblind result in `docs/balance-backlog.md` (§2, §16 M7 step 4)
  - The factions stay distinguishable under both filters.
  - Each Gray Rot archetype has its own silhouette and reads its armor and weapon like its Velvet Bloom role.
  - The 3-lane map fits at 1280×720.
- [ ] T044 Update `docs/status.md`, `data/CHANGELOG-balance.md` and the As built section of `docs/m7-plan.md`, and end the last PR's commit with a summary of the verification output (§16)
- [ ] T045 [USER] The user plays against the Gray Rot on the dev site, tries a blighted run and a Three Hollows battle, and checks the hints. Notes go in `docs/playtest-feedback.md` (§16 M7)

## Dependencies and parallel work

- **Order:** Phase 1 → 2 → US1, then US2 to US6.
  - US2 needs US1's ids, since sprites name them.
  - US3 and US4 need US1's roster, since both refresh run goldens after it.
  - US5 needs US1 for its Gray Rot seat, and US4 for the new map.
  - US6 is independent after Phase 2.
- **In parallel:**
  - S2 (the roster's data) comes first. Then S3 (sprites), S4 (blights) and S5 (the Three Hollows) may run side by side, each gated on S2.
  - S4 and S5 share `data/CHANGELOG-balance.md` and `tests/golden/`: merge one, rebase the other, and run `npm run golden -- update` again. S3 shares no file with either.
  - US6 sits in S6, after S2 and S5.
- **Handoffs in:**
  - `docs/tasks/m6-meta-progression.md`: the profile, the run snapshot, banking, the Underroot's tabs, `tests/slow/meta.test.ts`, `--profile` and the read-only test load (M6/T011, M6/T046), mastery levels and `data/mastery.json` (M6/T036, M6/T037), and Boss Down in `data/feats.json` (M6/T021).
  - `docs/tasks/r3-kit.md`: R3/T008 (`BuildingDef.archetype`), R3/T012 (combos by archetype), R3/T013 (`data/packs.json`), R3/T041 (`tests/unit/packs.test.ts`), R3/T044 (`dealPacks`), R3/T073 (the general's kit sources), and the card check.
  - `docs/tasks/r4-readable-armies.md`: R4/T009 (`data/scenarios/unit-lineup.json`, `unit-lineup-twin.json`), R4/T017 (`tests/unit/shapes.test.ts`), R4/T032 (the shape block required), R4/T033 (contrast), and its Calls 4 and 8. R4b: the marks.
  - `docs/tasks/r2a-battle-in-rounds.md`: the plot model and #19's order, R2a/T029 (`RoundScenarioSchema`), R2a/T114 (the round bench and `bench-300`), and the stat keys the blights use.
- **Handoffs out:**
  - `docs/tasks/m8-release.md`: its tuning runs every guardrail on the Gray Rot roster and all maps (T032, T033); its perf pass and Firefox check include a Three Hollows battle (T027); its preview screenshots use `tests/fixtures/profile-late.json` (T046). Gray Rot units have no stats of their own to tune (T006).
  - `docs/tasks/run-it-back.md`: T012 maps Gray Rot ids to their mirrors before RB/T036's `markSeen`, so the codex stays in Velvet Bloom ids.

## Sessions

| Session | Tasks | Branch | Gate (true before starting) | Ends with |
|---|---|---|---|---|
| S0 | T001–T003 | `feature/m7-plan` | M6 merged; R3's #36 settled | `docs/m7-plan.md` agreed, the alias table and the other edits in SPEC; PR into `develop` |
| S1 | T004–T007 | `feature/m7-seats` | S0 merged | `mirrors`, `counterpartIn`, a faction per seat; PR into `develop`, no golden moved |
| S2 | T008–T013 | `feature/m7-gray-rot-data` | S1 merged | The Gray Rot roster as data, generals switched over, goldens refreshed; PR into `develop` |
| S3 | T014–T018 | `feature/m7-gray-rot-sprites` | S2 merged; R4a's shape metadata on `develop` | Gray Rot sprites and the `m7-gray-rot` check; PR into `develop` |
| S4 | T019–T025 | `feature/m7-blights` | S2 merged | Blights, Decay, level 10, G10 and the Blights tab; PR into `develop` |
| S5 | T026–T030 | `feature/m7-three-hollows` | S2 merged | The Three Hollows in the run's maps and the bench, run goldens refreshed; PR into `develop` |
| S6 | T031–T037 | `feature/m7-tools-content` | S2 and S5 merged; M7-Q4 answered | Per-seat tools, `--maps all`, complete packs, first-run hints; PR into `develop` |
| S7 | T038–T041, T046, T042–T045 | `feature/m7-verify` | S3, S4 and S6 merged | M7 verified and documented; PR into `develop`; the user's review (T045) |

## Coverage

**SPEC §16 items**

| SPEC §16 item | Tasks |
|---|---|
| The distinct Gray Rot roster (§11.12) with sprites, for the six core archetypes and the unlockable roles | T002, T006, T009, T011, T015 |
| Generals switch over to it | T010, T012 |
| Its units follow the shape language: a Gray Rot unit's body and damage type read the same matchup as the Velvet Bloom's (no weapon marks, R4/T077) | T014, T015, T016, T018 |
| Blights and Decay (§9.6, §11.8), rewritten for rounds, with Decay reward multipliers and the best Decay per commander | T019, T020, T023, T025 |
| Blights tied to retired systems get new effects, and Hoarding Rot replaces Silent General | T019, T020 |
| A blight raises the general's income above its default ×1.0 | T019 (Hoarding Rot), T020 |
| The Three Hollows (3-lane) map, with a colony in each lane; its layout is Open | #62; T026–T030 |
| Content: the relics and buildings that the ten run packs need, each relic with a v2 effect | X9 (9 packs); T003, T034, T035 |
| A colorblind palette check: simulate deuteranopia and protanopia on screenshots | T016, T042, T043 |
| First-run tutorial hints beyond the first-time tips | M7-Q3; T001, T036, T037 |
| Step 1: `npm run verify`, with unit tests for each blight's effect and Decay math | T019, T038 |
| Step 2: `npm run test:slow`: G10, plus the counter bar and G3 on clashes against the Gray Rot roster | T022, T032, T039 (and T041 for G12 on the Three Hollows) |
| Step 3: `npm run balance -- tournament --maps all --seeds 30`; medians in band, no side above 65% | T033, T040 |
| Step 4: browser checks `m7-gray-rot`, `m7-three-hollows`, `m7-blights` and the filtered copies, with the visual checklist | T018, T030, T046, T042, T043 |
| Every milestone: playable, verify green, a commit summarizing the verification | Every checkpoint; T038, T044 |
| From R2 on: built on feature branches and merged into `develop` as the default, never as a `?proto=` knob; retired systems' tests, goldens and guardrails removed in the same change | Sessions: every session is a feature branch into `develop`. M7 retires the mirror match (T011 drops the note and the trait) and the unit palette swap (T017); T013 and T028 refresh the goldens they move |

**Findings**

| Finding | Handled by |
|---|---|
| A170 (high): no Gray Rot ↔ Velvet Bloom mapping; seats fixed by faction; derived or authored stats | M7-Q1, M7-Q4; Technical context's call; T002, T004–T013, T031, T032 |
| A148 (high, R4): no measurable body band or weapon mark | R4a's shape block (R4/T032); T014, T015 |
| A171 (medium): level 10's blights exceed §17 #15 | M6-Q4; T003, T021 |
| A173 (medium): Second Flush and Hardy Spores unreachable | X9; T034 |
| A178 (medium): M7's pack content overlaps R3; the tenth pack waits for flyers | X9; T003, T034, T035 |
| A191 (medium): flyers in or out; a Gray Rot flyer | X9, #64; T002, T003 |
| A149, A151 (medium, R4): the area mark only for bursts, the heal mark for the healer | Moot since R4/T077: units carry no weapon marks |
| A154 (medium, R4): an emplacement's slot sprite | R4 Call 4; T014, T015 |
| A158 (medium, R4): Twin Roots' fractional scale | T018 (`m7-gray-rot-twin`), T042 |
| A165 (medium, R4): bodies must fit the squad grid's width | R4 Call 8; T014 |
| A159 (medium, R4): team contrast under the filters | R4a (R4-Q4); T016, T043 |
| A166 (medium, R4): weak marks vanish on the Gray Rot's body | R4b (R4-Q6); T016 |
