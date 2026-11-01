# R4 — Readable armies: tasks

R4 makes armies readable. You can tell the units apart and see what counters what without reading a paragraph (F17), and cards stop being walls of words (F21) (SPEC §16 R4's Goal). Under X3 it comes in two parts, kept in this one file with task IDs in execution order across both:

- **R4a, the shape language on the field:** body size by armor, weapon marks, pips instead of `TIER_SCALE`, a distinct silhouette for every unit we have, the lineup screenshots and the data checks. It starts now, beside R1, and lands before R2a's playtest.
- **R4b, matchups and words, after R3:** matchup marks in full, the card face, draft and kit cards, the card-text pass, words into the data, Help, tooltips and tips for rounds, and the fresh-tester gate.

This list was drafted on 2026-11-01 from SPEC v2 and `docs/tasks/spec-analysis.md`. The user agreed X3 the same day, and then R4a's plan at R4a-S0. Every recommendation was taken except two: only Elders get a rim (R4-Q3), and `tierRadiusMult` becomes 1.0, in R2a (#53). Part 1's tasks follow those answers, and the plan added one check (call 10). Part 2 stays a draft until R4b-S0.

**Status:** R4a agreed 2026-11-01 (R4a-S0); R4b a draft · **Spec:** SPEC §16 "Milestone R4 — Readable armies" and the sections it cites · **Plan:** `docs/r4a-plan.md` (agreed 2026-11-01) and `docs/r4b-plan.md` (written in R4b-S0) · **Gate in:** R4a: these task lists on `develop`, and X3 agreed (2026-11-01, T002); R4b: R3 merged into develop and its playtest gate put to the user, R2b S13 merged (R2b/T147) · **Gate out:** R4a: the user's review of the lineup (T039), before R2a's playtest (R2a/T137); R4b: the fresh-tester playtest gate (§16 R4 step 3, T075)

## Read first

**Both parts**
- SPEC §1.3 #9 and #10 (merging stays; the shape language), §5.8 (the shape language), §10.4 (feedback rules, matchup marks, the 2× question), §16 R4, §17 #20 (text sprites, distinct silhouettes).
- `docs/tasks/clarify.md`: X1, X2, X3, the "R4: readable armies" blocks (R4-Q1 to R4-Q6, #52 to #56), and R2-Q8, R3-Q8, #11, #33, #39.
- `docs/playtest-feedback.md`: F17 and F21.

**R4a**
- SPEC §2 (palette, and "check it in M7"), §4.6 (the slot's k × k grid), §10.1 (canvas scale), §11.2 (squads, the Rhizome Vault and the Velvet Shrine), §11.3 (bodies, weapons and the silhouette ideas), §13.2 (layers), §13.6 (rendering: the shape language and the preview), §14.2 (`SpriteDef`), §14.3 (text sprites), §15.6 (screenshots, `--filter`, `--click`).
- Code: `src/render/renderer.ts` (`TIER_SCALE` :25, `FLY_LIFT` :27, `teamMark` :101, `drawUnit` :511-537, `flyerShadow` :546, `mound` :557, `drawKnits` :663-695, `pips` :720-728, `elderAura` :731, `shieldRing` :745, `bar` :797), `src/render/atlas.ts` (the bake loop :59-76), `src/render/assistPreview.ts`, `src/app/input.ts` (:2 imports `FLY_LIFT`), `src/data/schema.ts` (`SpriteSchema` :494-511), `src/data/registry.ts` (`REQUIRED_SPRITES` :53, sprite checks :172-188), `src/data/proto.ts` (the Burster, Rhizomorph and Driftling), `tests/unit/purity.test.ts` and `eslint.config.js` (the `src/data` block), `data/sprites/units.json`, `data/sprites/ui.json`, `data/sprites/buildings.json`, `data/sprites/terrain.json` (the `t-soil` tones), `data/factions/gray-rot/faction.json`, `data/scenarios/elder-showcase.json`, `tools/screenshot.ts` (`FILTERS` :78-81, the `feColorMatrix` filter :120), `src/ui/mergeHints.ts`, `src/ui/inspect.ts` (:124).
- `docs/research/research-one-more-run-and-feel.md` §2.16 and item #16 (loud champions, A162).
- R1's squad sizes (#7) in `docs/balance-backlog.md`, once R1 reports.

**R4b**
- SPEC §5.3 (the effectiveness class), §8.3 and §10.5 (draft and spoils cards, the run bar, Help), §10.2 (the card face, the compact tray, the planning view, chip tooltips, first-time tips), §10.3, §11.13 and §11.14 (augment and combo icons), §14.2 (`AugmentDef.icon`, `ComboDef.icon`), §14.6, §15.5, §15.7 (Plain words, Teaching text).
- Code: R2a/T084's `matchupClass` (`grep -rn "export function matchupClass" src/sim`), and v1's `tagMult`, `damageFor` and `classify` in `src/sim/systems/combat.ts` (:223, :236, :247), which R2a copied; `src/ui/matrixHints.ts`, `src/ui/hud/tray.ts`, `src/ui/buildingInfo.ts`, `src/ui/cards.ts`, `src/ui/hud/kit.ts`, `src/ui/words.ts`, `src/ui/help.ts`, `src/ui/hud/explain.ts`, `src/app/tips.ts`, `src/render/effects.ts` (hit sparks :48-61), `src/ui/styles.css`.
- What R2a, R2b and R3 built: their task files in `docs/tasks/` (R2a/T076, R2a/T080 and R2a/T084; R2b/T048 and R2b/T102; R3/T016's placeholder icons, R3/T029's copy count, R3/T076's icons on squads, R3/T131's `r3-general-augments` scenario) and their plans' As built sections.

## Before you start

**Decisions** (by clarify ref; the session each one blocks). R4a's were settled at R4a-S0 on 2026-11-01, so the ⛔ marks on them below are satisfied. Only §18.2 #11, R1's, is still open.
- X3: split R4 into R4a and R4b. Agreed 2026-11-01 (T002): R4a runs beside R1 and lands before R2a's playtest.
- X2: R2a lands beside v1. This list's coordination with R2a's renderer (T011, Dependencies) assumes it. If the user picks one integration branch, `feature/r2-rounds` merges develop after R4a-S1 lands, and R2a's views import the same drawer.
- X1: R2b writes the round Help, the round tips and the chip tooltips with a first wording, which R4b-S6 rewords (A156). If R2 stays one milestone, read "R2b" as "R2" below.
- R4-Q1 (bands): agreed 2026-11-01 as recommended, for R4a-S2 and the redraw (R4a-S2b to R4a-S4). The plan adds call 10: a mark stays within the body's rows.
- #53 (merged radius): decided 2026-11-01. It's ×1.0, which R2a writes (R2a/T011). Nothing in R4a changes.
- R4-Q1 and §18.2 #11 (overflow): T030's width bound. A squad of base + 1 (the Rhizome Vault) must fit; the Shrine's +2 is listed, not failed.
- R4-Q2 (marks) and #55 (the Tender's mark): agreed 2026-11-01 as recommended. Shared glyphs are baked onto each frame (Technical context, call 1), and the Tender carries the heal mark.
- R4-Q3 (the tier cue): decided 2026-11-01. Both tiers get bigger pips, the Elder aura stays, and only Elders get a gold rim (T012, T014, T015; call 6).
- R4-Q4 (team contrast in R4): agreed 2026-11-01 as recommended, with a lighter Gray Rot (T033, T034).
- R4-Q5 (emplacements, and a Structure mark): agreed 2026-11-01 as recommended. R4a-S3 draws the emplacement sprite (T029), and R4b-S1 the structure glyph (T049).
- #52 (does it read at the field's scale): R4a's part agreed 2026-11-01, with the Twin Roots lineup as the worst case. R2a's playtest reads it first (R2a/T137), and R4b's gate closes it (T076).
- #36 (the sixth archetype) blocks nothing here. R4a draws both candidates, the Burster and the Mortar's emplacement.
- X9 (flyers after the first release): the Driftling is redrawn anyway, since its sprite ships for the `flyers` knob.
- R4-Q6 (card and mark details) and #54 (no area mark against crowds): R4b-S1 to R4b-S5.
- #39 (does `takenMult` count toward a hit's class): decided at R3 S0; R4b-S1's tests follow it.
- R3-Q8 (copies as a count, not pips): decided at R3 S0; R4b-S3's card face follows it.
- R2-Q8 (display text out of the hashed state): decided at R2a S0; it decides whether R4b-S5 moves goldens (T066).
- #56 (a name for lives): decided at R2b S0 (R2b/T003); applied by R2b/T102. T065 checks it.
- #33 (the battle-1 economy tip): decided at R2b's playtest gate (R2b/T148–T149, S14); T070 follows it.
- R2-Q24 (where the in-battle draft sits): R2b S0; R4b-S5's draft cards fit that sheet (T062).

**Results it needs**
- R4a: R1's proposed squad sizes (#7) in `docs/balance-backlog.md` once R1 reports; until then today's spawn-derived sizes. Only T030's width bound reads them. Sprites, sheets and palettes aren't battle state, so nothing else in R4a waits on R1's numbers. If R1's chosen set drops the Burster or the Rhizomorph, its sprite stays for its default-off knob.
- R4b: R3 merged, with `data/augments.json` and `data/combos.json` (R3/T011, R3/T012), placeholder icons (R3/T016), copies on the cards (R3/T029) and the `r3-general-augments` scenario (R3/T131). R2a's `matchupClass` and basic marks (R2a/T084, A060), the `round` and `phase` params with the planning checkpoint (R2a/T076, R2a/T080, A059), and the planning screen. R2b's switch-over, with the round Help tab, the round tips and chip tooltips, "Regrowths" (R2b/T102), and the lineup files ported to the round scenario format (R2b/T048).

**Findings to handle** (high and medium)
- A148 (high): no measurable body band or weapon mark exists, and no sprite meets one. Bands and the shape block: T004, T017–T023.
- A149: the check "its damage type's weapon mark" contradicts the area and heal marks. `markOf`'s rule: T003, T017, T019.
- A150: the Scythecap gets a blade only, since cleave doesn't change a mark. T003, T017.
- A151: the Mortar's shells hit as crush, so it keeps its hammer, with a splash accent. T003, T021, T029.
- A152: words into data moves goldens unless display text leaves the hash. R2-Q8; T066.
- A153: merge-perk resistances don't count toward the class, and §14.2 and #39 say they do. #39; T045, T047.
- A154: no Structure glyph and no emplacement art. R4-Q5; T029, T049.
- A155: R4's planning screenshot can't show augment icons. T042, T058.
- A156: who writes the round tips, the Rounds tab and the round chip tooltips. X1 (R2b first); T042, T067–T070.
- A157: do draft and spoils cards fall under "no sentences". R4-Q6; T059, T062.
- A158: Twin Roots draws at about 1.78×. The Twin Roots lineup, and marks and pips at least 2 native px: T006, T009, T012, T014, T021, T036.
- A159: the team tones barely differ in lightness under both filters. R4-Q4; T033, T034.
- A165: body widths must fit the squad grid's 32/k spacing, with the Vault's +1 unit counted. R4-Q1, #11; T004, T023, T030.
- A166: weak marks drawn like the gray spark vanish on Gray Rot bodies. R4-Q6; T049, T052.
- From other slices: A059 (high, r2-ui: a bot player's `phase=planning` can't be held; R2a/T074, R2a/T076, R2a/T080 build the checkpoint, and T058 waits for it); A076 (r2-ui: marks show only while a card is chosen, so the capture needs `--click`: T042, T058); A077 (Twin Roots never at 2×: T006, T009, T036); A060 (an exported classifier: R2a/T084 builds it, T047 extends it); A066 and A195 (sequencing R2 beside v1: X2, and the shared drawer T011); A062 (the draft covers the general's army: R2-Q24, T062).
- Lows: A160 (8×8 overlay icons: R4-Q6, T046, T049, T050, T051); A161 (icons resolve, are unique and aren't placeholders, combos included: T046, T051); A162 (a louder tier cue: R4-Q3, T012, T014, T015, the gate questions in R2a/T137 and T075); A163 (pips mean four things: R3-Q8, T053); A164 (the compact tray groups marks and drops the role word first: R4-Q6, T053); A167 (card marks from the combined class: R4-Q6, T047, T053); A069 (mixed-tier squads: T047, T057); A202 (split R4: X3).

## Technical context

**Where code lands**
- New in R4a:
  - `src/render/unitSprite.ts`: the one unit drawer for v1's renderer and R2a's views (sprite, rim, shield ring, pips, HP bar, Elder aura, flyer shadow, mound, team mark);
  - `src/render/compose.ts`: a pure frame composer (palette swap, marks, rims, mirroring) and the atlas's pure layout, which the atlas and the sheet tool share;
  - `src/data/shapes.ts`: pure `bodyOf`, `markOf`, `towerMarkOf`, `bodyBox`, `glyphBox`, `composedBox` and `shapeProblems`;
  - `data/sprites/marks.json`, `data/scenarios/unit-lineup.json`, `data/scenarios/unit-lineup-twin.json`;
  - `tools/sprite-sheet.ts` and `tools/lib/cvd.ts`;
  - `tests/unit/unitSprite.test.ts` and `tests/unit/shapes.test.ts`;
  - `docs/r4a-silhouettes.json`, a draft sheet that T032 deletes.
- Changed in R4a: `src/render/renderer.ts`, `src/render/atlas.ts`, `src/render/assistPreview.ts`, `src/data/schema.ts`, `src/data/registry.ts`, `data/sprites/units.json` (redrawn), `data/sprites/buildings.json`, `data/sprites/ui.json`, `data/factions/gray-rot/faction.json`, `src/ui/mergeHints.ts`, `src/ui/inspect.ts`, `src/ui/icons.ts`, `tools/screenshot.ts`, `package.json`, `tests/unit/data.test.ts`, `tests/unit/contrast.test.ts`, `tests/browser/inspect.test.ts`.
- Retired in R4a: `TIER_SCALE`, `TIER_PIPS` and `data/scenarios/elder-showcase.json`.
- New in R4b: `shapeClass`, `squadMarks` and `cardMarks`, added beside R2a/T084's `matchupClass` in the module that defines it; `tests/unit/matchups.test.ts`, `tests/unit/cardText.test.ts`, `tests/browser/marks.test.ts`.
- Retired in R4b: `src/ui/words.ts`, `tests/unit/words.test.ts`, and §15.7's Plain words row.
- **Layering.** `src/data` is the bottom layer (§13.2): `tests/unit/purity.test.ts` bans imports matching `/(render|ui|app|meta|tools)/`, and `eslint.config.js`'s `src/data` block does the same. So `src/data/shapes.ts` and `src/data/registry.ts` never import `src/render/compose.ts`. `shapes.ts` measures boxes arithmetically from the sprite rows; `compose.ts` may import `shapes.ts`, never the reverse.
- **R4b's paths are today's.** R2a and R2b may have moved or replaced a battle-UI file (the battle view, the tray, inspect, the preview). A session finds the file by the function the task names (`grep -rn`) and edits that.

**Reused**
- The atlas's shelf packer takes any size, and it mirrors `u-` sprites at bake time (`src/render/atlas.ts:33`).
- The screenshot tool's `--filter`, `--click` and `--settings` (`tools/screenshot.ts`).
- v1's scenario format places units at a tier (`data/scenarios/elder-showcase.json`, `test.noTurrets`).
- `protoContent('rework')` (`tools/lib/content.ts:42`) loads the Burster, the Rhizomorph and the Driftling, which exist only as presets until R2a adopts R1's chosen set.
- The hit-spark styles (`src/render/effects.ts:48-61`) are the model for matchup marks (§10.4).
- R2a/T084's `matchupClass` and the multiplier function under it, which R2a copied from v1's `tagMult` (`src/sim/systems/combat.ts:223`) and the matrix in `data/balance.json`.

**Determinism and goldens**
- Sprites, sprite sheets, `marks.json`, scenarios that no golden replays, and faction palettes aren't in the battle state. The `Library` holds balance, buildings, units, upgrades, relics and powers (`src/sim/state.ts:189-197`). So R4a moves no golden: every R4a session runs `npm run golden -- verify` and says in its PR that nothing moved.
- `UnitDef.sprite` is in the `Library`, so no sprite id changes. The emplacement sprite is found by an id convention, not by a new `BuildingDef` field.
- R4b's matchup functions only read state. Rewording data text moves the goldens unless R2a took display text out of the hashed `Library` (R2-Q8). If it didn't, T066 runs `npm run golden -- update`, and its commit says why (A152).
- **Data changes are logged** (`.claude/rules/balance.md`): every R4a PR that changes `data/` adds one `data/CHANGELOG-balance.md` entry (T038 has the form).

**Calls this list makes** (each reversible)
1. **Weapon marks are shared glyphs** in `data/sprites/marks.json`, as clarify R4-Q2 recommends. They are composited onto each unit frame at the sprite's `shape.markAt[frame]` when the atlas bakes. The baked frame holds the mark, as §14.3 asks, and it needs no draw call of its own (§13.6). One glyph per mark means every blade looks the same, both sides draw the same weapon (the glyphs aren't faction-swapped), and the check compares names instead of hunting pixels (A148).
2. **Body size** is the bounding-box height of a frame's own opaque pixels. Marks aren't in the frame's rows, so they never count toward height (A148), and neither does the Elder rim, a region of its own. Width counts the composed box, body and mark (call 8).
3. **The lineup scenarios use v1's format now** (as `elder-showcase` does), with only default-data units, so R4a can screenshot before R2a. The units that exist only as presets are checked through `protoContent('rework')`. R2a/T048 makes clash-form copies, R2b/T048 ports the files before `test.noTurrets` leaves `ScenarioSchema`, and R4b-S0 (T043) adds the Burster and the Rhizomorph once they're default data (A077, A158).
4. **An emplacement's sprite is `e-<buildingId>`,** found by convention, with the building's own sprite as the fallback (A154).
5. **One unit drawer** (`src/render/unitSprite.ts`) serves v1's renderer and R2a's new views, so `TIER_SCALE` is removed once and R2a never copies `drawUnit` (A066).
6. **Only Elders get a rim,** gold `#f0c85a` and team-neutral (R4-Q3, decided 2026-11-01). Bloomed units get none.
   - A rim makes a unit look 2 px bigger, which would blur the 2–3 px between the bands.
   - Bloomed units are about half of a merging army, so a rim on every one would outline half the field.
   - Lilac is the Velvet Bloom's own tone (§2), so a lilac rim on a Gray Rot unit would read as the wrong team (A162).
   - If R2a's playtest finds Bloomed units hard to tell from base ones, a spore-white `#fbf6ff` (`--spore-white`) tier-2 rim is one more bake.
7. **The colour-vision matrices move** to `tools/lib/cvd.ts`, so the screenshot tool, the sheet tool and the contrast test use the same numbers (A159). `applyCvd` works in linear RGB, as the tool's `feColorMatrix` does by default (`color-interpolation-filters` is `linearRGB`), so the test's ratios match the PNGs.
8. **The width bound counts base squads plus one.** n is the building's base squad + 1 for every spawner, since the Rhizome Vault fields 1 more unit beside it (§11.2, R3/T085). The upgraded Burrow's 12 is left out, because upgrade tracks retire in R3. The Velvet Shrine's +2 and M6's strains (Teeming's 9) may overflow under #11's first guess, so the sheet tool lists them and the test doesn't fail them (A165).
9. **R4b: card marks light from the same per-squad combined class** as the planning marks, and a pips mark overrides the body mark for its tier (A167, R4-Q6).
10. **A mark stays within the body's rows** (added by R4a's plan, agreed 2026-11-01). In every frame, the glyph's rows lie between the body's top and bottom rows. It may stand out to the front, never above or below. The band measures the body alone, so without this rule a raised hammer could make a medium unit look big. A silhouette feature that holds the mark, such as the Hammercap's raised arm, is body and counts toward the band (`docs/r4a-plan.md`, calls 9 and 10).

## Stories

| ID | Priority | Story | Independent test |
|---|---|---|---|
| US1 | P1 | (R4a) A merged unit keeps its armor's body and shows its tier with pips, an Elder with a gold rim too, on both sides: in v1's battle today, and in R2a's views through the same drawer | `npx vitest run tests/unit/unitSprite.test.ts`; the r4-lineup PNG shows tiers 2 and 3 at their base size with pips; `grep -rn TIER_SCALE src` finds nothing |
| US2 | P1 | (R4a) The data checks and a sprite sheet show the user, and the tools, when a unit is drawn off its shape | `npx vitest run tests/unit/shapes.test.ts tests/unit/data.test.ts`; `npm run sprite-sheet` (`data/sprites/units.json`) lists no problem |
| US3 | P1 | (R4a) The six core archetypes, and the Mortar's emplacement, read their armor and weapon from their shape | `npm run validate:data` passes with their shape blocks; the r4-lineup PNG shows them in their bands |
| US4 | P2 | (R4a) Every other unit, unlockable or preset-only, has its own silhouette, body and mark | the distinctness and width cases in `tests/unit/shapes.test.ts`; `npm run validate:data` requires a shape on every unit sprite |
| US5 | P2 | (R4a) The two sides stay apart under deuteranopia and protanopia, and neither sinks into the soil | the team-tone, soil and outline cases in `tests/unit/contrast.test.ts`; the r4-lineup-d and r4-lineup-p PNGs |
| US6 | P1 | (R4b) A tray card shows its squad's shape, size and matchup marks, lit against the general's army | the tray cases in `tests/browser/hud.test.ts` |
| US7 | P2 | (R4b) Matchup marks in full on the planning screen: both directions, mixed tiers, and an augment's icon on a changed mark | `npx vitest run tests/browser/marks.test.ts`; the r4-planning-aug PNG |
| US8 | P2 | (R4b) No card face carries a sentence, the tooltip holds the detail, and the words live in the data | the no-sentence case in `tests/browser/hud.test.ts`; `npx vitest run tests/unit/cardText.test.ts` |
| US9 | P3 | (R4b) Help, the chip tooltips and the first-time tips teach rounds and the shape language in plain words | the Help case in `tests/browser/runScreens.test.ts`; `npx vitest run tests/unit/teachingText.test.ts` |

---

## Part 1: R4a, the shape language on the field

## Phase 1: Setup (R4a)

- [x] T001 Write `docs/r4a-plan.md` (new) in CLAUDE.md's plan format (Goal, Scope, Stand-ins, Steps, Verification, Open questions for the user, As built), from Part 1 of this list (§5.8, §13.6, §14.3, §16 R4)
  - Stand-ins: v1's battle shows the new sprites until R2a's views exist; the lineup uses v1's scenario format; the preset-only units are checked through `protoContent('rework')`; T030 reads today's spawn-derived squads until R1's sizes are data.
  - Open questions: T002–T006, each with clarify's recommendation, which this list builds.
- [x] T002 [USER] X3: split R4. Record the decision in `docs/tasks/clarify.md` (X3's Decision line) and in `SPEC.md`: §16's R4 block becomes R4a and R4b with this list's boundary, §1.3 #10's last sentence and §10.2's "By milestone" list follow, and `docs/status.md` names R4a as running beside R1 (§1.3 #10, §10.2, §16)
- [x] T003 [USER] R4-Q2 and #55: which unit carries which mark, how marks are drawn, and where the area mark goes, beside or instead. Record in `SPEC.md` and `docs/tasks/clarify.md` (§5.8, §11.3, §14.3, §16 R4, §18.2 #55)
  - Recommendation (clarify R4-Q2): shared glyphs baked onto each frame at `shape.markAt` (call 1). The area mark only for armor-ignoring damage (`burst`), in place of a weapon mark; the heal mark for a unit with `heal` and 0 damage; otherwise slash → blade, crush → hammer, and pierce → an arrow if `projectileSpeed` > 0, else a spike (A149).
  - The Scythecap keeps its blade alone: cleave doesn't change a mark (A150). The Mortar keeps its hammer, with a small splash accent beside it (A151).
  - The alternative: marks drawn into each sprite with reserved palette keys listed in `shape.markKeys` (Before you start says what changes).
  - Edits: §5.8's area-mark bullet, §11.3's Scythecap row, §14.3's mark bullet, and §16 R4 step 1's wording, "every unit carries its mark (§5.8's rule)" (A149). §18.2 #55 is closed.
- [x] T004 [USER] R4-Q1 and #53: the body bands, and the merged units' radius. Record in `SPEC.md` and `docs/tasks/clarify.md` (§10.4, §14.3, §18.2 #53)
  - Recommendation: heights of small 8–9, medium 11–12 and big 15–16 native px, measured on the frame's own pixels (call 2). §14.3's "about 10–14 px" becomes about 8–16 px, and §10.4's "24–28 screen px" follows.
  - Widths at most floor(32/k) native px, with k = ceil(sqrt n) and n the building's base squad + 1 for the Rhizome Vault (§4.6, §11.2, call 8). Height carries the size difference, and the mark sits on the front edge (A165). The Shrine's +2 is #11's overflow, listed by the sheet tool.
  - #53: the recommendation was to keep `tierRadiusMult` 1.25. The user chose ×1.0 (2026-11-01), which R2a writes inside S1's golden refresh (R2a/T011). R4a moves no golden, so it doesn't change the data. Recorded in §5.6, §11.1 and §18.2 #53.
  - The width rule went into §14.3, not §4.6, which keeps the slot's grid rule only.
- [x] T005 [USER] R4-Q3: the Elder cue. Record in `SPEC.md` and `docs/tasks/clarify.md` (§5.8, §10.4)
  - Recommendation (clarify R4-Q3): a 1-px rim baked per tier, team-neutral (spore-white `#fbf6ff` for Bloomed, gold `#f0c85a` for Elder); pips with a 3×3 gold core in a 1-px dark outline; the Elder aura kept.
  - Decided 2026-11-01, at the session's suggestion: the pips and the aura as recommended, and a gold rim on Elders only, with none on Bloomed (call 6).
  - "Could you spot the Elders, and tell a Bloomed unit from a base one?" joins R2a's playtest (R2a/T137) and R4b's gate (T075) (A162).
- [x] T006 [USER] R4-Q4, R4-Q5 and #52, as a set. Record in `SPEC.md` and `docs/tasks/clarify.md` (§2, §10.1, §10.4, §16 R4, §16 M7, §18.2 #52)
  - R4-Q4: the colour-vision check moves from M7 into R4a, with a lighter ("bone") Gray Rot body, checked against the soil and the outline too (T033, T034). A darker body can't pass the soil floor; if the user wants one anyway, the floor drops. §2's hex values and "check it in M7" change, and §16 M7's palette line points back here (A159).
  - R4-Q5: a slot-sized emplacement sprite, `e-<buildingId>`, with its weapon mark (call 4). Structure has no body band. Its matchup glyph is R4b's (A154).
  - #52: record the plan (Twin Roots as the worst case, marks and pips at least 2 native px) in §10.4's Open line, and state each map's field scale at 1280×720 in §10.1 (A077: Twin Roots about 1.78×). Add `r4-lineup-twin` (T036's command) to §16 R4 step 2's list (A158). §18.2 #52 stays open until T076.
- [x] T007 [USER] Agree `docs/r4a-plan.md`. Then write each decision's date in `docs/tasks/clarify.md`, and in `docs/status.md` put R4a under "Next" beside R1, with "R2a's playtest waits for R4a's review gate (T039)" (CLAUDE.md "How we work", §16)

**Checkpoint:** `npm run verify` passes (docs only). The plan is agreed, and T002–T006 are recorded in SPEC, clarify and status.

## Phase 2: Foundational (R4a; blocks every R4a story)

- [x] T008 [P] Move the colour-vision matrices from `tools/screenshot.ts:78-81` into `tools/lib/cvd.ts` (new). Export `CVD_MATRICES` (deuteranopia, protanopia) and a pure `applyCvd(rgb, filter)`, and have `tools/screenshot.ts` build its filter string from them, behaviour unchanged (§15.6, §2)
  - `applyCvd` decodes sRGB to linear, applies the matrix and re-encodes, matching `feColorMatrix`'s default `color-interpolation-filters="linearRGB"` (`tools/screenshot.ts:120`), so the PNGs don't change and the test's ratios match them (call 7).
- [x] T009 [P] Write `data/scenarios/unit-lineup.json` (new) and `data/scenarios/unit-lineup-twin.json` (new) in v1's scenario format, delete `data/scenarios/elder-showcase.json`, and point the merged-units case at `tests/unit/data.test.ts:96` to `unit-lineup` (§15.6, §16 R4 step 2)
  - `unit-lineup`: Bogwater Hollow, `test.noTurrets`, gold 0. Every unit in the default data (sporeling, capguard, gillArcher, amanitaKnight, hammercap, tender, veilstalker, scythecap, morelRunner, rootbreaker) at tiers 1, 2 and 3 on both sides: the player's in columns 5–15, the general's in 17–27, at least 1.5 tiles apart, one per tier so nothing merges.
  - `unit-lineup-twin`: the same on Twin Roots, split between its two lanes, so the fractional scale is checked (A158, A077).
  - The preset-only units can't be named here, since the registry rejects unknown units (`src/data/registry.ts:242`). T043 adds them once R2a has made them default data.
  - R2a/T048 copies both in clash form, and R2b/T048 ports them before it drops `test.noTurrets` (Handoffs).
- [ ] T010 [P] Move the atlas's bake into pure functions in `src/render/compose.ts` (new), which touch no DOM, and have `bakeAtlas` in `src/render/atlas.ts` use them, behaviour unchanged (§13.6, §14.3)
  - `framePixels(sprite, frame, { swap, flip })` returns `{ w, h, px: Uint8ClampedArray }`: the per-pixel loop at :59-76. `bakeAtlas` copies its output into the `ImageData`.
  - `atlasLayout(content)` returns the job list and the shelf-packed regions, keyed as today (`id|faction|frame|flip`), so a unit test can read the layout without a canvas.
- [ ] T011 [P] Move unit drawing out of `src/render/renderer.ts` into `src/render/unitSprite.ts` (new), behaviour unchanged for now. Then `drawUnit` (:511) calls it, and `src/render/assistPreview.ts` imports `teamMark` from it (§13.6, §10.4)
  - `drawUnitSprite(g, atlas, opts)`, where `opts` covers the sprite id, faction, frame, flip, foot point, tier, alpha (for R2a's dimmed preview), flying, burrowed, HP fraction, `shieldFrac` (undefined for no shield), side, the faction's glow, assist, selected, the time and calm.
  - It keeps today's draw order: team mark, flyer shadow, Elder aura, sprite, shield ring, selection box, pips, HP bar.
  - Moved and exported: `drawPips(g, atlas, cx, y, tier)` (R2a's merge preview uses it), `elderAura`, `flyerShadow`, `mound`, `shieldRing` (the rework's mixed-wave shield, drawn from `shieldFrac`), `teamMark` (from `renderer.ts:101`) and the HP bar as `hpBar`, which `renderer.ts` imports back for buildings and the Heartcap (:354, :432).
  - `TIER_SCALE` moves with it and is exported, so `drawKnits` imports it until T013.
  - `FLY_LIFT` moves too, and `renderer.ts` re-exports it, so `src/app/input.ts:2` keeps its import. `INK_DEEP` (:51), which `teamMark` uses, moves too, and `renderer.ts` imports it back. `unitSprite.ts` imports nothing from `renderer.ts`, so there's no import cycle; it takes the foot point in pixels, so it needs no `TILE`.
  - If R2a/T081 has already created `src/render/unitSprite.ts` with this signature (R4a-S1 landed after R2a S11), move nothing from `renderer.ts` again. Extend that module, and `TIER_SCALE` goes from it in T013.

**Checkpoint:** `npm run verify`, `npm run test:browser` (frame, settings and inspect tests) and `npm run golden -- verify` (unchanged). `npm run screenshot -- --name r4-lineup-before --params "scenario=unit-lineup&paused=1"` passes §15.6's assertions and looks like today's battle.

## Phase 3: US1 — Merged units keep their body, with loud pips (P1)

**Goal:** size means armor and nothing else, while tiers stay easy to spot. **Independent test:** see Stories.

- [ ] T012 [US1] Write `tests/unit/unitSprite.test.ts` (new) and a case in `tests/browser/inspect.test.ts` (§5.8, §10.4, §13.6) ⛔ R4-Q3
  - A pure `unitLayout(region, footX, footY, tier, opts)`: a Bloomed and an Elder unit get the tier-1 box. One pip for Bloomed and two for Elder, centred over the sprite, above the HP bar when the unit is damaged, and touching neither. A flyer's box is lifted by `FLY_LIFT`.
  - `i-pip` in `data/sprites/ui.json` has a gold core of at least 3×3 native px inside its 1-px outline (A158, A162).
  - `rimPixels(sprite, frame, flip)` gives the 1-px outline of the opaque mask in a (w + 2) × (h + 2) box, with the anchor shifted by (+1, +1).
  - `atlasLayout(content)` has one Elder-rim region for every `u-` sprite frame and flip, shared by both factions, and none for tier 2 (R4-Q3).
  - `unitLayout` gives an Elder its rim box under the sprite, and a Bloomed unit none.
  - `tests/browser/inspect.test.ts`: an Elder's Tier row shows two `i-pip` canvases and no ✦.
- [ ] T013 [US1] Add `unitLayout` to `src/render/unitSprite.ts`. Remove `TIER_SCALE` there and from `src/render/renderer.ts` (`drawKnits`' head height at :675 takes the sprite region's own height), so every tier draws at its sprite's size (§5.8, §10.4, §13.6)
- [ ] T014 [US1] Add `i-pip`, a 3×3 gold `#f0c85a` core in a 1-px dark `#120a16` outline (5×5), to `data/sprites/ui.json`, and add it to `REQUIRED_SPRITES` in `src/data/registry.ts:53`. `drawPips` in `src/render/unitSprite.ts` stacks it from the `ui` sheet, replacing `pips()`'s `fillRect` (`renderer.ts:720-728`) (§13.6, §14.3) ⛔ R4-Q3
- [ ] T015 [US1] Bake the Elder rim: add a pure `rimPixels` to `src/render/compose.ts` and rim jobs to its `atlasLayout`, bake them in `src/render/atlas.ts`, and draw the rim under an Elder's sprite in `drawUnitSprite` in `src/render/unitSprite.ts` (§5.8, §10.4, §13.6) ⛔ R4-Q3
  - For every `u-` sprite frame and flip, a 1-px gold `#f0c85a` outline of its mask, (w + 2) × (h + 2), one bake for both factions. Bloomed units get no rim (call 6).
  - Add `atlas.rim(id, frame, flip)`, keep `elderAura`, and check the atlas still packs in its 1024-wide sheet.
- [ ] T016 [US1] Show the tier in the DOM with pip sprites. Add `tierPips(atlas, tier)` to `src/ui/icons.ts`, use it in `src/ui/inspect.ts`'s Tier row (:124, which takes a node beside the tier's name), and delete `TIER_PIPS` from `src/ui/mergeHints.ts:7` (§10.4)

**Checkpoint:** `npx vitest run tests/unit/unitSprite.test.ts`, `npm run verify`, `npm run test:browser` and `npm run golden -- verify` (unchanged). `grep -rn TIER_SCALE src` finds nothing. In the r4-lineup PNG, tiers 2 and 3 stand at their base size with pips, and Elders with a gold rim, on both sides.

## Phase 4: US2 — The checks catch a unit drawn off its shape (P1)

**Goal:** a measurable shape rule that the data checks, a tool, and the user can all see. **Independent test:** see Stories.

- [ ] T017 [P] [US2] Write `tests/unit/shapes.test.ts` (new) for `src/data/shapes.ts` and `src/render/compose.ts` (§5.8, §11.3, §14.3)
  - `bodyOf`: light → small, medium → medium, heavy → big.
  - `markOf` from the content: Burster → area (via `protoContent('rework')`), Tender → heal, Gill Archer → arrow, Veilstalker and Morel Runner → spike, Scythecap → blade (A150), Hammercap and Rootbreaker → hammer.
  - `towerMarkOf(puffballMortar)` → hammer with a splash accent (A151).
  - `bodyBox` of a synthetic heavy sprite drawn 11 px tall gives a "big body out of band" problem from `shapeProblems`, which is the only place bands are checked.
  - `shapeProblems` rejects: `markAt` with a different length from `frames`; no `markAt` when the mark isn't `none`; no `accentAt` when an accent is set; a glyph that leaves the w × h box; a mark in the back half (A165); a glyph whose rows reach above the body's top row or below its bottom row in that frame (call 10).
  - `composedBox(sprite, frame, glyphs, flip)` unites the body's opaque box with the glyph's own opaque box at `markAt[frame]`, mirrored with `flip`.
  - `framePixels` with a mark: the glyph's pixels sit at `markAt`, mirror with `flip`, and fill exactly the box `composedBox` gives. The Gray Rot swap doesn't touch them.
- [ ] T018 [P] [US2] Add cases to `tests/unit/data.test.ts` (§15.7 Data row, §16 R4 step 1)
  - Through `loadContent` with a patched raw sprite: "rejects a heavy unit drawn small", "rejects a crush unit with a blade" and "rejects a shape mark with no `m-` glyph".
  - "Every sprite that declares a shape passes", over the default content and over `protoContent('rework')`, so `?proto=rework` keeps loading.
- [ ] T019 [US2] Write `src/data/shapes.ts` (new), pure, with no DOM: `bodyOf(armor)`, `markOf(unit)` and `towerMarkOf(building)` by T003's rule; `bodyBox(sprite, frame)` (the opaque bounding box); `glyphBox(glyph)`; `composedBox(sprite, frame, glyphs, flip)`; and `shapeProblems(sprite, bands, glyphs)` (§5.8, §13.2, §14.3) ⛔ R4-Q1, R4-Q2, §18.2 #55
  - `src/data/shapes.ts` imports nothing from `src/render` (`tests/unit/purity.test.ts`, the `src/data` block of `eslint.config.js`). It computes the composed box arithmetically, from the sprite rows and the `m-` glyph's rows. `src/render/compose.ts` may import `shapes.ts`, never the reverse.
- [ ] T020 [US2] Extend `SpriteSchema` and `SpriteSheetSchema` in `src/data/schema.ts:494-511` (§14.2, §14.3) ⛔ R4-Q1, R4-Q2
  - `shape?: { body: 'small' | 'medium' | 'big' | 'structure'; mark: 'blade' | 'arrow' | 'spike' | 'hammer' | 'area' | 'heal' | 'none'; accent?: 'splash'; markAt?: [int, int][]; accentAt?: [int, int][] }`. `markAt` is required unless the mark is `none`, and `accentAt` when an accent is set. The `superRefine` checks one entry per frame in each.
  - `bands?: { small: [min, max]; medium: [min, max]; big: [min, max] }` on the sheet. The schema only parses it: bands are checked once, in T022's `shapeProblems`. `structure` has no band.
  - The bands stay out of `data/balance.json`, which the battle hashes. R4a-S0 wrote the same field into §14.2's `SpriteDef` (`SpriteShape`) and the bands into §14.3 (T003, T004).
- [ ] T021 [US2] Write `data/sprites/marks.json` (new), sheet `marks`, with no `factionSwap`: `m-blade`, `m-arrow`, `m-spike`, `m-hammer`, `m-area`, `m-heal` and the accent `m-splash`. Each is at most 5×5, its strokes at least 2 native px wide (A158), with a light core and a dark `k` outline so it reads on both sides' bodies. Then teach `framePixels` in `src/render/compose.ts` to composite `m-<mark>` at `shape.markAt[frame]` and the accent at `shape.accentAt[frame]` before mirroring (§5.8, §13.6, §14.3) ⛔ R4-Q2
- [ ] T022 [US2] Cross-check units against their sprites in `src/data/registry.ts`, beside the sprite checks at :172-188 (§5.8, §14.3)
  - For every unit whose sprite declares a shape: `shape.body === bodyOf(unit.armor)`, `shape.mark === markOf(unit)`, and `m-<mark>` exists.
  - `shapeProblems(sprite, bands, glyphs)` is empty, with the bands of the sheet that holds the sprite (the registry keeps each sheet's `bands` as it parses it) and the `m-` sprite defs it has loaded. It imports only from `src/data`.
  - Each problem names the unit, the sprite and the frame.
- [ ] T023 [US2] Write `tools/sprite-sheet.ts` (new) and add `"sprite-sheet": "tsx tools/sprite-sheet.ts"` to `package.json` (§14.3, §15.6, §17 #20)
  - It reads a sheet file (`--sheet <path>`, default `data/sprites/units.json`) and validates it with `SpriteSheetSchema`.
  - It renders through `framePixels` into a Playwright page (`page.setContent`, no server): every frame at 2× and 4×, Velvet Bloom facing right and Gray Rot facing left.
  - It overlays the band lines and each measured body box, and lists `shapeProblems` under each sprite.
  - Where an id matches a unit, it adds strips with the sprite on its squad's k × k grid at 2×, at the base squad, base + 1 and base + 2, and lists each overflow it sees (A165, #11).
  - `--filter deuteranopia|protanopia` uses `tools/lib/cvd.ts`. The PNG goes to `artifacts/sprite-sheet/<name>.png`.
- [ ] T024 [US2] Draft the silhouettes in `docs/r4a-silhouettes.json` (new): a sheet in the sprite format, with frame 0 only of every unit sprite (`u-sporeling` … `u-driftling`, 13) and of `e-puffballMortar`. Each has its shape block and the sheet's bands, follows §11.3's silhouette ideas and T004's bands, and is rendered with `npm run sprite-sheet -- --sheet docs/r4a-silhouettes.json --name r4a-silhouettes`, plain and under both filters (§5.8, §11.3, §17 #20) ⛔ R4-Q1
  - Weapon-like silhouette features in §11.3 (the Gill Archer's bow, the Hammercap's raised maul, the Scythecap's hook) are body pixels: they count toward the band and stay inside it. The weapon reads from the `m-` glyph, so the body doesn't draw a second one.
- [ ] T025 [US2] Fix every problem the sheet lists in `docs/r4a-silhouettes.json`, until `npm run sprite-sheet -- --sheet docs/r4a-silhouettes.json` reports none and each pair of silhouettes differs at a glance at 2× (§17 #20)
- [ ] T026 [US2] [USER] Approve the silhouette sheet: the three PNGs from T024, at 2× and 4× on both sides. Record the approval and any changes in `docs/r4a-plan.md`. R4a-S3 starts only after it (§5.8, §17 #20)

**Checkpoint:** `npx vitest run tests/unit/shapes.test.ts tests/unit/data.test.ts`, `npm run verify` and `npm run golden -- verify` (unchanged). `npm run sprite-sheet` lists no problem, and so does `npm run sprite-sheet -- --sheet docs/r4a-silhouettes.json`. The user has approved the sheet.

## Phase 5: US3 — The core six read their armor and weapon (P1)

**Goal:** the six core archetypes and the Mortar's emplacement follow the shape language on the field. **Independent test:** see Stories.

- [ ] T027 [US3] Add cases to `tests/unit/shapes.test.ts` and `tests/unit/data.test.ts` (§5.8, §11.2, §14.3)
  - `u-sporeling`, `u-capguard`, `u-gillArcher`, `u-amanitaKnight` and `u-hammercap` (default content) and `u-burster` (`protoContent('rework')`) declare shapes and pass.
  - Every `tower` building with an attack has an `e-<id>` sprite whose body is `structure` and whose mark is `towerMarkOf` its attack.
- [ ] T028 [US3] Redraw the core six in `data/sprites/units.json` from the approved sheet: `u-sporeling`, `u-capguard`, `u-gillArcher`, `u-amanitaKnight`, `u-hammercap` and `u-burster` (§5.8, §11.3, §14.3, §17 #20)
  - Three frames each: two walk frames and an attack frame.
  - Bodies in T004's bands and within its width bound, with a shape block and a `markAt` per frame.
  - Ids unchanged, anchors at the foot, and the swappable keys `v l d s t` for the body only.
  - Add `"bands"` to the sheet.
- [ ] T029 [US3] Draw `e-puffballMortar` (new sprite, at most 32 × 32, one slot) in `data/sprites/buildings.json`, with `shape: { body: 'structure', mark: 'hammer', accent: 'splash', markAt, accentAt }` (T003's rule). Add the tower check to `src/data/registry.ts`, and add `emplacementSprite(content, buildingId)` to `src/render/unitSprite.ts`: `e-<id>` if it exists, else the building's sprite. v1's battle keeps drawing the Mortar as its building, and R2a's clash view draws the emplacement through this helper (§4.4, §5.8, §11.2) ⛔ R4-Q5

**Checkpoint:** `npm run verify`, `npm run golden -- verify` (unchanged) and `npm run sprite-sheet`. In the r4-lineup PNG, the core units stand in their bands with their marks, on both sides.

## Phase 6: US4 — Every other unit has its own silhouette (P2)

**Goal:** the whole roster follows the shape language, and the checks require it. **Independent test:** see Stories.

- [ ] T030 [US4] Add cases to `tests/unit/shapes.test.ts` (§4.6, §5.8, §11.2, §17 #20) ⛔ R4-Q1, §18.2 #11
  - Every `u-` sprite declares a shape (a registry problem otherwise).
  - No two unit silhouettes overlap too much: frame 0's opaque masks, aligned on their anchors, have an IoU below 0.75, or their boxes differ by 2 px or more in width or height.
  - Every unit sprite's composed width, measured by `composedBox` in `src/data/shapes.ts` (body and mark, every frame), is at most floor(32 / k) native px, where k = ceil(sqrt n) (A165).
  - n = the building's base squad (its `squad` once R2a has added it, else `spawn.count × Math.round(60 / spawn.interval)`, §11.2) + 1 for every spawner: the Rhizome Vault (§11.2, R3/T085, call 8). Today that gives 10 px for the Capguard, Gill Archer, Hammercap, Sporeling, Veilstalker, Morel Runner, Burster and Driftling, and 16 px for the rest.
  - The Velvet Shrine's +2 overflows under #11's first guess. `tools/sprite-sheet.ts` lists it, and the test doesn't fail it.
- [ ] T031 [US4] Redraw the other seven in `data/sprites/units.json`, as T028 does: `u-tender` (heal mark), `u-veilstalker`, `u-scythecap` (blade only), `u-morelRunner`, `u-rootbreaker` (a medium body, though its radius is 0.45), `u-rhizomorph` (its burrowed mound stays `mound()`'s) and `u-driftling` (floating over its shadow) (§5.8, §11.3, §17 #20)
- [ ] T032 [US4] Make the shape block required for every `u-` sprite in `src/data/registry.ts`, and delete `docs/r4a-silhouettes.json` now that it's drawn (§14.3)

**Checkpoint:** `npx vitest run tests/unit/shapes.test.ts`, `npm run verify` and `npm run golden -- verify` (unchanged). `npm run sprite-sheet` lists no problem, and the r4-lineup PNG shows every unit with its own silhouette.

## Phase 7: US5 — The sides stay apart under colour filters (P2)

**Goal:** the sides differ in lightness, not only in hue, under both filters, and neither body sinks into the clash ground. **Independent test:** see Stories.

- [ ] T033 [US5] Add cases to `tests/unit/contrast.test.ts`, reading `data/factions/*/faction.json`, `data/sprites/terrain.json`, `data/sprites/marks.json` and `tools/lib/cvd.ts` (§2, §10.4)
  - Team: the two factions' `v`, `l` and `d` tones differ by at least 1.5:1 in luminance under deuteranopia and under protanopia (A159).
  - Soil: each faction's `v` and `l` tones keep at least 1.75:1 against every `t-soil` tone (`#4a3526`, `#3b2a1e`, `#5e4532`), plain and under both filters. 1.75:1 is the Velvet Bloom's own floor today (its `v` is 1.77:1 on `#5e4532`).
  - Outline: each faction's `d` tone keeps at least 1.5:1 against the `k` outline `#1a1020`, plain and under both filters.
  - Marks: for both factions' `v` tone, each `m-` glyph has its light core or its dark `k` outline at 3:1 or more. A lighter Gray Rot leans on the outline.
- [ ] T034 [US5] Retune the Gray Rot's body tones in `data/factions/gray-rot/faction.json`, in the direction the user chose with R4-Q4 (T006), until every T033 case passes and the sides look apart on the r4-lineup PNGs. Log it in `data/CHANGELOG-balance.md` as display-only, with no golden moved, and write the new values into SPEC §2's palette (§2, §10.4) ⛔ R4-Q4
  - Recommended start, lighter: `v #b0bcab`, `l #eaf0e2`, `d #808b7c`. In T008's linear maths it gives team 1.51–2.13:1 under both filters, soil 3.57:1 or more and outline 4.7:1 or more.
  - A darker body can't pass. The darker start (`v #56614f`, `l #87937a`, `d #2c3329`) passes the team case (1.65–1.91:1) but fails the soil floor (`v` 1.07:1 on `#5e4532` under the filters) and the outline (`d` 1.32:1 on `k`). Under deuteranopia, any `v` 1.5:1 darker than the Velvet Bloom's sits below 1.75:1 on that soil, so no darker `v` passes both cases.

**Checkpoint:** `npx vitest run tests/unit/contrast.test.ts`, `npm run verify` and `npm run golden -- verify` (unchanged). The sides stay apart, and stand off the soil, in the r4-lineup-d and r4-lineup-p PNGs.

## Phase 8: Polish and verification (R4a)

- [ ] T035 §16 R4 verification step 1, R4a's part: `npm run verify`, with the body and mark checks running in `validate:data` through `src/data/registry.ts`. Put the summary in the PR and the commit (§16 R4 step 1, §15.1)
- [ ] T036 §16 R4 verification step 2, R4a's part: open each PNG with Read and walk the checklist items R4a owns: silhouettes at the field's scale on both sides; bodies ordered by armor, with merged units at their body plus pips, and Elders with a gold rim; weapon marks on every unit; the sides apart under both filters. Note #52's first reading for Twin Roots in `docs/r4a-plan.md` (§16 R4 step 2, §15.6)
  - `npm run screenshot -- --name r4-lineup --params "scenario=unit-lineup&paused=1"`
  - `npm run screenshot -- --name r4-lineup-d --params "scenario=unit-lineup&paused=1" --filter deuteranopia`
  - `npm run screenshot -- --name r4-lineup-p --params "scenario=unit-lineup&paused=1" --filter protanopia`
  - `npm run screenshot -- --name r4-lineup-twin --params "scenario=unit-lineup-twin&paused=1"` (A158)
- [ ] T037 Run `npm run test:browser`, `npm run test:slow` (v1's guardrails, unchanged) and `npm run golden -- verify`, and confirm in the PR that R4a moved no golden (`src/sim/state.ts:189-197`) (§15.5, §16)
- [ ] T038 Update the docs: `docs/r4a-plan.md` (As built), `docs/status.md` (R4a done, with R2a's playtest now on the new sprites once T039 passes) and `docs/playtest-feedback.md` (F17's status: R4a drew the shape language on the field). `docs/balance-backlog.md` needs none, since R4a measures no balance (CLAUDE.md "Where things get written down", §16)
  - `data/CHANGELOG-balance.md` has one entry per R4a PR that changed `data/` (S1's lineups and `i-pip`, S2's `marks.json`, S3's and S4's sprites, S5's palette): what changed, "display only, no golden moved", and the approval it rests on (T007's plan, T026's sheet or T034's R4-Q4). Check that each is there.
- [ ] T039 [USER] R4a's review gate: the user looks at T036's PNGs and at the dev site after R4a-S5 merges, and agrees that R2a's playtest can run on these sprites. Record the answer in `docs/r4a-plan.md` and `docs/status.md` in a docs-only follow-up PR, or at R2a S21's start. R2a/T137 then asks "Could you spot the Elders, and tell a Bloomed unit from a base one?" (A162, R4-Q3) and takes #52's reading on Twin Roots (§16 R4, §18.2 #52)

**Checkpoint:** every R4a PR merged into develop. `npm run verify` and `npm run test:browser` pass on develop, and the dev site shows the new sprites in v1's battle.

---

## Part 2: R4b, matchups and words, after R3

## Phase 9: Setup (R4b)

- [ ] T040 Write `docs/r4b-plan.md` (new) in CLAUDE.md's format, from Part 2 of this list and what R2a, R2b and R3 built (their As built sections) (§10.2, §10.4, §10.5, §16 R4)
- [ ] T041 [USER] R4-Q6, #54 and the form of R4-Q5's glyph. Record in `SPEC.md` and `docs/tasks/clarify.md` (§5.8, §10.2, §10.4, §18.2 #54)
  - R4-Q6: "no sentences" covers the tray and run-bar cards, and draft and spoils cards keep one effect line of at most about 12 words, with numbers as chips (A157). Strong and weak marks both light while the general fields that shape. Card marks use the planning marks' combined class, and a pips mark overrides the body mark (A167). Weak marks get a dark outline and a shape of their own (A166). Overlay icons are 8×8 (A160), and the compact tray groups marks by class and drops the role word first (A164).
  - #54: area damage gets no crowd mark.
  - R4-Q5: a `structure` glyph joins the mark set (A154). That was agreed at R4a-S0 on 2026-11-01; this task picks its form, a stump or a block.
- [ ] T042 Record in `docs/r4b-plan.md` what earlier milestones settled, and what each changes here, and write the amended planning captures into `SPEC.md` §16 R4 step 2 (§10.2, §10.4, §15.5, §16 R4)
  - #39 (R3): the class tests in T045.
  - R3-Q8: copies as a count on cards (T053).
  - R2-Q8 (R2a): whether T066 moves goldens.
  - #56 (R2b S0): "Regrowths", applied by R2b/T102; T065 checks it.
  - R2-Q24 (R2b): where the draft sits (T062).
  - A156: which Help tabs, tips and chip tooltips R2b wrote, so T067–T070 reword rather than write.
  - R2a/T084's `matchupClass`: the file it lives in after R2b, and its signature (T047).
  - R3/T016's placeholder icons: 16×16 discs with a letter, under the final icon ids (T046).
  - SPEC §16 R4 step 2: `r4-planning` with T058's `--click`, and `r4-planning-aug`, beside T006's `r4-lineup-twin` (A155, A076, A158).
- [ ] T043 Check that R2b/T048 ported `data/scenarios/unit-lineup.json` and `data/scenarios/unit-lineup-twin.json` to the round scenario format (port them now if it didn't), and add the Burster (tier 1 only, since it never merges) and the Rhizomorph (surfaced) now that they're default data. Any unit R3 added joins too. If the scenario param or path changed, update T036's commands for T072 (§15.2, §15.6, §16 R4 step 2)
- [ ] T044 [USER] Agree `docs/r4b-plan.md`, and update `docs/status.md` (CLAUDE.md "How we work", §16)

**Checkpoint:** `npm run verify` passes; the plan is agreed.

## Phase 10: Foundational (R4b; blocks every R4b story)

- [ ] T045 [P] Write `tests/unit/matchups.test.ts` (new) (§5.3, §5.8, §10.4)
  - Every weapon × body class equals §5.8's table, from `data/balance.json`'s matrix.
  - A slayer is strong against pips. A `burst` attacker gives no mark (#54).
  - A pierce attacker gets the same class against an Elder Capguard as against a tier-1 one, since merge-perk resistances don't count (§5.3, A153).
  - Spongy Cap moves the Knight against pierce from weak to normal and names its icon, following #39 as R3 decided.
  - A squad that fields as 2 Bloomed + 2 gives a body mark and a pips mark (A069, A167).
  - Structure targets: crush strong, slash and pierce weak, siege ×2.0 strong (A154).
  - The marks equal the hit events' class in a scripted clash, and `shapeClass` agrees with R2a's `matchupClass` on every unit pair.
- [ ] T046 [P] Add "every augment and every combo has its own icon" to `tests/unit/data.test.ts`: it resolves to a `ui` sprite, no two icons share an id or identical pixels, and each is 8×8, which R3/T016's 16×16 placeholder discs fail (A160, A161) (§11.13, §11.14, §14.2) ⛔ R4-Q6
- [ ] T047 Extend R2a/T084's `matchupClass` where it lives (`src/sim/rounds/index.ts` exports it, or wherever R2b moved it: `grep -rn "export function matchupClass" src/sim`), keeping its signature `matchupClass(state, side, unitId, tier, targetSide, targetUnitId, targetTier)`. Export the new functions from the index R2a used (§5.3, §10.4, §14.6) ⛔ §18.2 #39, §18.2 #54
  - `shapeClass(state, side, unitId, tier, target)`, with `target` one of `{ body: 'small' | 'medium' | 'big' }`, `{ pips: 2 | 3 }` or `{ structure: true }`, returns `{ cls: Effectiveness; changedBy?: <augment or combo id> }`.
  - `squadMarks(state, side, unitId, targetSquad)`: one entry per fielded tier.
  - `cardMarks(state, side, buildingId)`: the strong and weak shape lists.
  - All three are pure reads of state, built on the same multiplier function R2a's `matchupClass` uses. Don't write a second classifier, and don't export v1's `classify` from `src/sim/systems/combat.ts` (A060).
- [ ] T048 Make `src/ui/matrixHints.ts` take its words ("strong vs Light · weak vs Heavy") from the model, so words, marks and sparks agree (§10.4)
- [ ] T049 Add the matchup glyphs to `data/sprites/marks.json`: `mm-small`, `mm-medium`, `mm-big`, `mm-pips` and `mm-structure`, each in `-strong` and `-weak`, 8×8, with strokes at least 2 px (A158). Strong is drawn like the strong spark; weak is a down-chevron with a dark outline, never the bare gray spark (A166). Add them to `REQUIRED_SPRITES` in `src/data/registry.ts` (§10.4, §13.6) ⛔ R4-Q6, R4-Q5
- [ ] T050 Draw the final augment and combo icons in `data/sprites/ui.json`, from §11.13's and §11.14's icon ideas: 8×8, readable at 1× on the field (16 screen px at 2×) and at 2× in the DOM (A160). They replace R3's placeholders, along with the final `i-copy` and `i-augment` card-type icons. Adjust R3/T076's icon placement in the formation preview, and the DOM `.ico` sizing in `src/ui/styles.css` (:135, 16 px today), for 8×8 (§5.8, §11.13, §11.14) ⛔ R4-Q6
- [ ] T051 Check the icons in `src/data/registry.ts`: every `icon` in `data/augments.json` and `data/combos.json` (R3/T011 and R3/T012) resolves, is unique, and is 8×8, so no placeholder survives (A161) (§14.2, §15.7 Data row, §16 R4 step 1) ⛔ R4-Q6

**Checkpoint:** `npx vitest run tests/unit/matchups.test.ts tests/unit/data.test.ts` and `npm run verify`. `npm run golden -- verify` is unchanged, since the model only reads.

## Phase 11: US6 — A card answers the general's army at a glance (P1)

**Goal:** §10.2's card face: shape, size and marks, lit against the army in view. **Independent test:** see Stories.

- [ ] T052 [US6] Add the card-face cases to `tests/browser/hud.test.ts` and `tests/unit/contrast.test.ts` (§10.2, §10.4)
  - "Fits 14 cards in a 1280×720 window with nothing clipped" (today's :96-98) holds with marks and icons.
  - "A card's strong mark lights when the general fields that shape", and "a weak mark lights as a warning".
  - Copies show as R3 settled (R3-Q8).
  - In the contrast test: the mark tokens' edges at 3:1, and the weak glyph's outline at least 3:1 against both factions' `v` tone, read from the faction JSON (A166).
- [ ] T053 [US6] Build the army card face in `src/ui/hud/tray.ts` (§10.2, §10.4, §5.8) ⛔ R4-Q6, R3-Q8
  - The unit's sprite at 1×, with its baked mark, and "×N" from the building's `squad`.
  - A strong row and a weak row of `mm-` glyphs from `cardMarks`, lit from `squadMarks` against the general's fielded squads (A167).
  - Augment icons at 2×, and copies as R3 shows them.
  - Compact cards drop the role word first (A164). Nothing clips, and the tray never scrolls sideways.
- [ ] T054 [US6] Make `cardLine` in `src/ui/buildingInfo.ts` a label, not a sentence: "+50/round" for a Cellar (the loam bonus goes in the tooltip), and range for an emplacement. Anything longer moves to the tooltip (T061) (§10.2)
- [ ] T055 [US6] Add the mark tokens (strong, weak, lit) to `src/ui/styles.css`'s `:root`, and draw lit marks with a size and outline change, not only a tint (§10.4 "Accessibility")

**Checkpoint:** `npx vitest run tests/browser/hud.test.ts tests/unit/contrast.test.ts` and `npm run verify`.

## Phase 12: US7 — Planning marks in full (P2)

**Goal:** §10.4's planning marks in both directions, with icons on changed marks. **Independent test:** see Stories.

- [ ] T056 [US7] Write `tests/browser/marks.test.ts` (new) (§10.2, §10.3, §10.4)
  - Choosing a card marks each enemy squad with `squadMarks`' class, and hovering one of your squads does the same.
  - Hovering an enemy squad marks your squads and your tray cards with the class of its hits on them.
  - A mixed-tier squad shows a body mark and a pips mark (A069).
  - An augment that flips a matchup shows its icon on the mark.
- [ ] T057 [US7] Draw marks in full, in overlay layer 7, in R2a/T083's `src/render/rounds/preview.ts` (or wherever R2b moved it: `grep -rln formationOf src/render`), the battle renderer R2b kept (`src/render/renderer.ts` today) and `src/app/battleView.ts` (§10.2, §10.4, §13.6)
  - The `mm-` glyphs replace R2a/T084's basic marks.
  - Add the reverse hover (your squads and `src/ui/hud/tray.ts`'s cards), and an 8×8 icon on any mark an augment or combo changed.
- [ ] T058 [US7] Take the planning screenshots, open each PNG with Read, check the marks, the icons and the general's augments, and note the result in `docs/r4b-plan.md` (A155, A076) (§16 R4 step 2, §15.6)
  - It relies on R2a's planning checkpoint (R2a/T076, R2a/T080; A059): with `player=bot:balanced&phase=planning` the bot has planned and its `beginClash` stays queued, so the capture holds. If `--dev` is still needed for the round entry, add it.
  - `npm run screenshot -- --name r4-planning --params "scene=battle&seed=1&player=bot:balanced&enemy=general:scripted&round=4&phase=planning" --click '[data-building=<a card bot:balanced's kit holds>]'`. Marks show only while a card is chosen (R2a/T084), so the click is what puts them in the PNG (A076). Read the kit from `__GAME__` to pick the card.
  - `npm run screenshot -- --name r4-planning-aug --params "scenario=r3-general-augments" --click '[data-building=<an army card the kit holds>]'`. R3/T131's scenario has the general holding Spore Shield and Tough Caps in planning. Without it, use `enemy=general:lichen-baron&battleIndex=3&round=4&phase=planning`, where the general holds 2 augments (§7.8).
  - Choosing a card queues no command, so the hash check holds.

**Checkpoint:** `npx vitest run tests/browser/marks.test.ts`, `npm run verify` and both PNGs walked.

## Phase 13: US8 — Cards and tooltips without sentences, words in the data (P2)

**Goal:** the card-text pass, with the plain wording moved into data. **Independent test:** see Stories.

- [ ] T059 [P] [US8] Add "no card face carries a sentence" to `tests/browser/hud.test.ts`, for every tray and run-bar card: no sentence-ending period, and a cap on words per line. Draft and spoils cards have one effect line of at most 12 words (§10.2, §10.5) ⛔ R4-Q6
- [ ] T060 [P] [US8] Write `tests/unit/cardText.test.ts` (new) (§10.2, §10.4)
  - The tooltip has its rows: the description, the squad and its unit's stats, strong vs, weak vs, armor, augments, combos and merge perks.
  - An economy card's payback in rounds.
  - "Body" means only armor: no "bigger body".
- [ ] T061 [US8] Rewrite `buildingTip` in `src/ui/buildingInfo.ts` to §10.2's tooltip list: the payback in rounds, matchups in words from `src/ui/matrixHints.ts`, and the augments and combos it can make (§10.2)
- [ ] T062 [US8] Rewrite the draft and spoils cards in `src/ui/cards.ts`: type icon, rarity frame, one effect line with numbers as chips, the "owned" line, a blueprint's price, squad (shape, weapon, size) and role as chips, and an augment's icon and the building it changes. The cards fit R2b's draft sheet without covering the general's formation (A062) (§8.3, §10.2, §10.5) ⛔ R4-Q6, R2-Q24
- [ ] T063 [US8] Make the run bar's kit cards in `src/ui/hud/kit.ts` and `src/ui/screens/run.ts` carry no sentences: each card with its copies and augment icons, and detail in tooltips (§10.5)
- [ ] T064 [US8] Reword the inspect panel in `src/ui/inspect.ts` (shape and weapon with matrix hints from the model) and `perkText` in `src/ui/mergeHints.ts:23` (`radiusAdd` becomes "stands wider", not "bigger body") (§10.4)
- [ ] T065 [US8] Check that R2b/T102's "Regrowths" shows, with "lives" in each tooltip, on the run bar, top band, report, Grove and title (`src/ui/hud/kit.ts`, `src/ui/hud/top.ts`, `src/ui/report.ts`, `src/ui/screens/run.ts`, `src/ui/screens/title.ts`). If R2b left the strings in `src/ui/words.ts`, T066 moves them into data (§2, §8.5, §10.5)
- [ ] T066 [US8] Move the plain wording into the data, and delete `src/ui/words.ts` and `tests/unit/words.test.ts` (§10.4, §15.5, §15.7) ⛔ R2-Q8
  - The surviving rewordings go into `data/relics.json` and `data/factions/velvet-bloom/buildings.json`. Drop any relic rewording whose relic R2b rewrote, since the data text wins (A152).
  - `relicDiagram` moves to `src/ui/cards.ts` (used there and in `src/ui/screens/run.ts`), and `powerAim` to `src/ui/buildingInfo.ts` (used in `src/ui/screens/underroot.ts` and the battle view). `powerTiming` goes if R2 retired the cooldown.
  - Find every importer with `grep -rn "words.ts" src tests tools` and fix each. Today that's `src/ui/buildingInfo.ts`, `src/ui/cards.ts` (:15, `buildingDescription`, `relicDiagram`, `relicText` and `upgradeText`), `src/ui/hud/kit.ts`, `src/ui/screens/run.ts`, `src/ui/screens/underroot.ts`, `src/app/battleView.ts`, `tests/unit/words.test.ts` and the comment in `src/ui/styles.css`.
  - Move the jargon guard into `tests/unit/data.test.ts`, over all player-facing data text, as `/orthogonal|income tick|surcharge/`. `knit` and `interval` leave it, since v2's texts use them as game terms (§10.4 Merging, §11.13's Barbed Darts and Shockwave, §11.14's Hunting Pack and Puppet Pod).
  - Retire §15.7's Plain words row in SPEC.
  - If display text is still hashed, run `npm run golden -- update` and say why in the commit (A152).

**Checkpoint:** `npx vitest run tests/unit/cardText.test.ts tests/unit/data.test.ts tests/browser/hud.test.ts`, `npm run verify` and `npm run golden -- verify`, which is unchanged, or refreshed with the commit saying why.

## Phase 14: US9 — Help, tooltips and tips teach rounds (P3)

**Goal:** R4's rewrite of the teaching text, on top of R2b's triggers and first wording. **Independent test:** see Stories.

- [ ] T067 [US9] Write the teaching-text cases in `tests/browser/runScreens.test.ts`, `tests/unit/teachingText.test.ts` and `tests/browser/clarity.test.ts` (§10.2, §10.5, §15.7 Teaching text)
  - `tests/browser/runScreens.test.ts`: the tab list is `Matrix`, `Merging`, `The general`, `Economy`, `Rounds` and `Keys` (today's :89 and :182), and each tab fits 1280×720.
  - `tests/unit/teachingText.test.ts`: Help's shape table agrees with the data (each unit's body is `bodyOf` its armor, and its mark is `markOf` it), and the tips' and chip tooltips' cases are reworded.
  - `tests/browser/clarity.test.ts`: a tip shows once, can be turned off, and can be shown again.
- [ ] T068 [US9] Rewrite `src/ui/help.ts`'s words (§10.3, §10.5, §5.8)
  - Matrix shows the shape language: a body × mark table with the `m-` and `mm-` glyphs beside the matrix and the tags, and a roster table that shows each unit's sprite and mark instead of the words "light / slash".
  - Merging shows pips and the Elder rim.
  - Rounds keeps R2b's content, in plain words.
  - Keys are drawn as keycaps, and every tab fits 1280×720.
- [ ] T069 [US9] Reword the chip tooltips in `src/ui/hud/explain.ts` (gold, plots, round, storm, and the round tally's pips) in §10.4's plain words, keeping R2b's numbers and sources (§10.2, §10.4)
- [ ] T070 [US9] Reword the first-time tips in `src/app/tips.ts`: the seven tips of §10.2, each naming its key with a keycap, and none using gold. R2b's tip ids stay. The economy tip follows #33's decision (§10.2, §18.2 #33) ⛔ §18.2 #33

**Checkpoint:** `npx vitest run tests/unit/teachingText.test.ts tests/browser/runScreens.test.ts tests/browser/clarity.test.ts` and `npm run verify`.

## Phase 15: Polish and verification (R4b)

- [ ] T071 §16 R4 verification step 1 in full: `npm run verify`, with the body, mark and augment-icon checks (combos included) in `src/data/registry.ts`. Put the summary in the commit and in `docs/r4b-plan.md`'s As built (§16 R4 step 1, §15.1)
- [ ] T072 §16 R4 verification step 2 in full, opening each PNG with Read and walking the whole checklist: silhouettes, bodies and pips, weapon marks, augment icons on squads in planning, both filters, no card sentence, Help at 1280×720. Note each item's result in `docs/r4b-plan.md` (§16 R4 step 2, §15.6)
  - The four lineups (T036's commands, as T043 left them, now with the full roster).
  - `r4-planning` and `r4-planning-aug` (T058).
  - Each Help tab: `npm run screenshot -- --name r4-help-<tab> --params "scene=battle&seed=1&round=1&phase=planning" --click '#help-btn' --click '#help-tab-<tab>'`, for `matrix`, `merging`, `general`, `economy`, `rounds` and `keys`, with the Help button's id as R2b left it.
- [ ] T073 Run `npm run test:browser`, `npm run test:slow` and `npm run bench`, and record them in `docs/r4b-plan.md`. All are unchanged by R4b, except a golden refresh from T066 if R2-Q8 kept text hashed (§15.4, §15.5, §16)
- [ ] T074 Update the docs: `docs/r4b-plan.md` (As built); `docs/status.md` (R4 done, M6 next); `docs/playtest-feedback.md` (F17 and F21 statuses); SPEC §10.4's plain-words bullet and §15.7's Teaching text row, as built; `data/CHANGELOG-balance.md`, one entry for each R4b PR that changed `data/` (glyphs, icons, wording), with whether goldens moved (CLAUDE.md "Where things get written down", §10.4, §15.7)
- [ ] T075 [USER] §16 R4 verification step 3, the playtest gate, recorded in `docs/playtest-feedback.md`. A fresh tester, with tips reset ("Show tips again" on the settings screen), plays at least one run on the dev site and answers (§16 R4 step 3, §10.4)
  - Was anything on the field you didn't understand?
  - Shown the general's army in planning, can you pick the card that answers it without opening a tooltip?
  - Could you spot the Elders, and tell a Bloomed unit from a base one? (A162, R4-Q3)
  - Does the shape language read at the field's scale, Twin Roots included, or does a clash need a closer view? (#52)

  The answers go in `docs/playtest-feedback.md`, newest first.
- [ ] T076 Close #52 from the gate's answer: write the decision into `SPEC.md` (§10.4's Open line, and §18.2 #52 "(closed)") and `docs/tasks/clarify.md` (#52's Decision line), and update `docs/status.md` (§10.4, §18.2 #52)

**Checkpoint:** every R4b PR merged into develop. `npm run verify`, `npm run test:browser` and `npm run test:slow` pass on develop. The gate's answers are recorded.

## Dependencies and parallel work

**Phase order**
- R4a: Phase 1 → Phase 2 → US1 (S1) → US2 (S2, then S2b) → US3 (S3) → US4 (S4) → US5 and Polish (S5) → the review gate (T039).
  - US2 needs `src/render/compose.ts` from Phase 2.
  - US3 needs US2's checks and the user's approval of the sheet (T026).
  - US4 needs US3's sprites for the distinctness test.
  - US5's tasks touch only `tests/unit/contrast.test.ts`, `data/factions/gray-rot/faction.json`, `data/CHANGELOG-balance.md` and SPEC §2. They may run in any R4a session after S2 (the marks case reads `marks.json`) if the user wants the palette sooner.
- R4b: Phase 9 → Phase 10 (S1 and S2) → US6 (S3) → US7 (S4) and US8 (S5) → Polish (S7). US9 (S6) needs only S1's glyphs.

**May run in parallel**
- R4a-S0 to R4a-S5 run beside R1's sessions. R1 works in `tools/experiment.ts`, `tools/lib/balance.ts` and its new `src/sim/formation.ts` (`docs/r1-plan.md`), which R4a doesn't touch.
- `tools/screenshot.ts` is shared: T008 edits it, and so does R2a/T080 (`--dev`); records-1 only runs it (RB/T021). Whichever of T008 and R2a/T080 merges second rebases.
- R4b-S1 and R4b-S2 run in parallel. Both add to `src/data/registry.ts`, in different places, so whichever merges second rebases.
- R4b-S4, R4b-S5 and R4b-S6 run in parallel. S4 and S5 both touch `src/app/battleView.ts` (S5 only its `words.ts` import), so the second rebases. S6 shares no file with them.

**R4a and R2a's renderer** (X2: R2a builds its battle views as new modules beside v1's)
- R4a-S1 (T010, T011, T013–T016) merges into develop first. In `src/render/renderer.ts` it moves `drawUnit`'s body, `teamMark`, `elderAura`, `flyerShadow`, `mound`, `shieldRing`, `pips`, the HP bar and `FLY_LIFT` into `src/render/unitSprite.ts`, and edits `drawKnits` (T013). It also edits `src/render/atlas.ts` (T010, T015), `src/render/assistPreview.ts`'s import, `src/ui/icons.ts`, `src/ui/inspect.ts` and `src/ui/mergeHints.ts` (T016).
- R2a's battle-renderer session (R2a S11's T081, then S12's T083 and the merge preview) draws every unit through `drawUnitSprite` and every merge-preview pip through `drawPips` from `src/render/unitSprite.ts`. It never copies `drawUnit` or `TIER_SCALE`.
- If R2a's renderer session is already open when R4a-S1 merges, it rebases onto develop. Its new modules don't touch R4a-S1's lines, so the rebase is mechanical, and the session then switches its unit drawing to `drawUnitSprite`.
- The redraws (R4a-S2b to R4a-S4) touch only `data/sprites/` and `docs/`, so they never conflict with R2a.
- R4a-S2 adds `shape` to `SpriteSchema` in `src/data/schema.ts`. R2a's data sessions add fields elsewhere in that file, and the second to merge rebases.
- R4a also shares `tests/unit/data.test.ts` and `src/data/registry.ts` with R2a S1–S3b, and `data/factions/gray-rot/faction.json` with R2a/T011. They edit different entries, and the second to merge rebases.
- If R2a S11 merges first, R2a/T081 has made `src/render/unitSprite.ts` by moving `drawUnit`'s body unchanged. R4a-S1 then rebases and extends it (T011).

**Handoffs**
- R4/T011 → R2a/T081 (S11): the one unit drawer.
- R4/T029 → R2a's clash view: it draws emplacements with `emplacementSprite()`.
- R4/T009 → R2a/T048: its clash-form list names `unit-lineup` and `unit-lineup-twin` in place of `elder-showcase`.
- R4/T009 → R2b/T048: the two lineups join its rewrite-now list before `test.noTurrets` leaves `ScenarioSchema`, so R4/T043 only adds the Burster and the Rhizomorph.
- R4/T030 → R2a S1 (R2a/T007–T014): run `npx vitest run tests/unit/shapes.test.ts` after adopting R1's squad sizes. A width failure is fixed by narrowing that sprite in a follow-up R4a PR, never by loosening T030.
- R4/T039 → R2a/T137 (S21): R2a/T137 adds "Could you spot the Elders, and tell a Bloomed unit from a base one?" (A162, R4-Q3) and #52's reading on Twin Roots, and R2a S21's gate reads "R4/T039 passed".
- #53's decision at R4a-S0 → R2a/T011 (S1): `tierRadiusMult` 1.0, inside S1's golden refresh.
- R1 → R4/T030: the proposed squad sizes (#7) in `docs/balance-backlog.md`.
- R2a → R4b: R2a/T084's `matchupClass` and basic marks (A060, T047, T057); the planning checkpoint and the `round` and `phase` params (R2a/T076, R2a/T080; A059, T058); display text out of the hash, if R2-Q8 went that way (T066).
- R2b → R4b: the lineups in the round scenario format (R2b/T048, T043); the round Help tab, tips and chip tooltips in a first wording (X1, A156; T067–T070); "Regrowths" (R2b/T102, T065); the draft's sheet (R2-Q24, T062). R2b keeps `src/render/unitSprite.ts` as the one unit drawer when it deletes v1's renderer code (R2b/T035).
- R3 → R4b: R3/T011's `data/augments.json` and R3/T012's `data/combos.json`, and R3/T016's placeholder icons → T046, T050, T051. R3/T029's copy count chip → T053. R3/T076's augment icons on squads and cards, and R3/T092–T093's ghost links and hyphae → T050, T057. R3/T103 and R3/T106's draft card types and owned line → T062. R3/T131's `r3-general-augments` scenario → T058. #39 → T045.
- R4 → M7: the Gray Rot's own sprites follow the same shape checks (`src/data/shapes.ts`) and contrast test (T033).

## Sessions

| Session | Tasks | Branch | Gate (true before starting) | Ends with |
|---|---|---|---|---|
| R4a-S0 | T001–T007 | `feature/r4a-plan` | SPEC v2 (#39) and these task lists (`feature/v2-tasks`) merged into `develop` | PR into develop: `docs/r4a-plan.md` agreed; X3, R4-Q1 to R4-Q5, #52's plan, #53 and #55 recorded in SPEC, clarify and status |
| R4a-S1 | T008–T016 | `feature/r4a-unit-drawer` | R4a-S0 merged | PR into develop: one unit drawer, no `TIER_SCALE`, pips and the Elder rim, the lineups; CHANGELOG entry. Merged before R2a's renderer session where possible |
| R4a-S2 | T017–T023 | `feature/r4a-shape-checks` | R4a-S1 merged | PR into develop: shape schema, `marks.json`, the checks and the sheet tool; CHANGELOG entry |
| R4a-S2b | T024–T026 | `feature/r4a-silhouettes` | R4a-S2 merged | PR into develop: the draft silhouette sheet (docs only), approved by the user (T026) |
| R4a-S3 | T027–T029 | `feature/r4a-core-sprites` | R4a-S2b merged, and T026 approved | PR into develop: the core six and the Mortar's emplacement redrawn; CHANGELOG entry |
| R4a-S4 | T030–T032 | `feature/r4a-roster-sprites` | R4a-S3 merged; R1's proposed squad sizes read, if R1 has reported | PR into develop: the other seven redrawn; a shape required on every unit sprite; CHANGELOG entry |
| R4a-S5 | T033–T038 | `feature/r4a-contrast` | R4a-S4 merged | PR into develop: team and soil contrast, R4a's verification and docs; CHANGELOG entry |
| R4a-gate | T039 | `feature/r4a-gate` | R4a-S5 merged and on the dev site | Docs-only PR into develop (or recorded at R2a S21's start): the user's answer in `docs/r4a-plan.md` and `docs/status.md`; R2a/T137 unblocked |
| R4b-S0 | T040–T044 | `feature/r4b-plan` | R3 merged into develop and its playtest gate put to the user; R2b S13 merged (R2b/T147) | PR into develop: `docs/r4b-plan.md` agreed; R4-Q6, #54 and R4-Q5's glyph recorded; §16 R4 step 2's captures amended |
| R4b-S1 | T045, T047–T049 | `feature/r4b-matchups` | R4b-S0 merged | PR into develop: the matchup model and the matchup glyphs |
| R4b-S2 | T046, T050–T051 | `feature/r4b-icons` | R4b-S0 merged (in parallel with S1) | PR into develop: final augment, combo and card-type icons, and their check |
| R4b-S3 | T052–T055 | `feature/r4b-card-face` | R4b-S1 and R4b-S2 merged | PR into develop: the tray card face with marks |
| R4b-S4 | T056–T058 | `feature/r4b-planning-marks` | R4b-S3 merged | PR into develop: planning marks in full, and the r4-planning PNGs |
| R4b-S5 | T059–T066 | `feature/r4b-card-text` | R4b-S3 merged; R2-Q8's outcome known | PR into develop: no sentences on cards, `words.ts` gone, goldens unchanged or refreshed with the reason |
| R4b-S6 | T067–T070 | `feature/r4b-help` | R4b-S1 merged | PR into develop: Help, chip tooltips and tips reworded |
| R4b-S7 | T071–T076 | `feature/r4b-verify` | R4b-S4, R4b-S5 and R4b-S6 merged | PR into develop: R4's verification in full; the fresh-tester gate run and #52 closed |

## Coverage

**Table 1: SPEC §16 R4**

| SPEC §16 item | Tasks |
|---|---|
| Scope: the shape language on both sides, body size by armor class | T004, T017–T020, T022–T025, T027, T028, T030–T032 |
| Scope: a weapon mark for each damage type, and one for area damage | T003, T017–T019, T021, T022, T028, T029, T031 |
| Scope: pips for merge tiers, with `TIER_SCALE` dropped | T005, T011–T016 |
| Scope: an icon for each augment | T046, T050, T051 (combos included, A161) |
| Scope: a distinct silhouette for every archetype and every unlockable unit; sprites stay text-defined | T023–T026, T028, T030, T031 |
| Scope: matchup marks in full on cards and on the planning screen | T045, T047–T049, T052–T058 |
| Scope: the card-text pass; the tooltip holds the detail; words from `src/ui/words.ts` into the data | T054, T059–T066 |
| Scope: Help and tooltips rewritten for rounds, and the first-time tips reworded | T067–T070 |
| Not in R4: new rules or numbers; the Gray Rot's own sprites | No task adds a rule or a number. T034 changes display tones only (R4-Q4), and T004 adds no data number to the battle. The Gray Rot's sprites are M7's (Dependencies, handoff to M7) |
| Done when: every unit on the field reads its armor and damage type from its shape | T032, T035, T036, T039, T072, T075 |
| Done when: no card face carries a sentence | T059, T062, T063, T072 |
| Done when: every verification step passes, and a fresh tester has played | T071–T073, T075 |
| Step 1: `npm run verify`, with the body, mark and augment-icon checks | T018, T022, T032, T035 (body, mark); T046, T051, T071 (icons) |
| Step 2: r4-lineup, r4-lineup-d, r4-lineup-p | T009, T036, T072 (plus r4-lineup-twin, T006, A158) |
| Step 2: r4-planning | T042, T058, T072 |
| Step 2: each Help tab with `--click` | T072 |
| Step 2 checklist: each archetype recognizable by silhouette alone at 2×, both sides | T026, T036, T072 |
| Step 2 checklist: bodies ordered by armor; merged units keep their body with pips | T013, T036, T072 |
| Step 2 checklist: weapon marks on every unit; augment icons on squads in planning | T036 (marks); T058, T072 (icons) |
| Step 2 checklist: the sides distinguishable under both filters | T033, T034, T036 |
| Step 2 checklist: no card face carries a sentence; every Help tab fits 1280×720 | T059, T067, T072 |
| Step 3: playtest gate, a fresh tester with tips reset, its two questions | T075 |
| Step 3: answers §10.4's open question (#52) | T006, T036, T039, T075, T076 |

**Table 2: findings**

| Finding | Handled by |
|---|---|
| A148 (high): no measurable body band or weapon mark | T004, T017–T023 |
| A149: the mark check contradicts the area and heal marks | T003, T017, T019 |
| A150: the Scythecap's blade with the area mark | T003, T017, T031 |
| A151: the Mortar's area mark hides crush | T003, T021, T029 |
| A152: words into data, and goldens | R2-Q8 (R2a S0); T066 |
| A153: merge-perk resistances and the class | #39 (R3 S0); T045, T047 |
| A154: no Structure glyph; emplacement art | R4-Q5; T006, T029, T049 |
| A155: the planning screenshot can't show augment icons | T042, T058 |
| A156: who writes the round Help, tips and chip tooltips | X1 (R2b writes them first); T042, T067–T070 |
| A157: draft cards and "no sentences" | R4-Q6; T041, T059, T062 |
| A158: Twin Roots at about 1.78× | T006, T009, T012, T014, T021, T036, T049 |
| A159: team contrast under the filters | R4-Q4; T006, T008, T033, T034 |
| A165: body widths against the squad grid, the Vault's +1 included | R4-Q1, #11; T004, T023, T030; R2a S1's re-run (Handoffs) |
| A166: weak marks vanish on Gray Rot bodies | R4-Q6; T041, T049, T052, T055 |
| A059 (r2-ui, high): `phase=planning` with a bot player can't be held | R2a/T074, R2a/T076, R2a/T080; T058 waits for them |
| A076 (r2-ui): marks need a chosen card in the capture | T042, T058's `--click` |
| A077 (r2-ui): Twin Roots never renders at 2× | #52; T006 (§10.1's scale per map), T009, T036, T075 |
| A060 (r2-ui): no exported matchup classifier | R2a/T084 builds it; T047 extends it, without a second copy |
| A066 (r2-ui): the battle UI can't land piecemeal | X2 (beside v1); T011, and the coordination rule in Dependencies |
| A195 (design, high): R2 is several milestones in one | X1 and X2. Here, only the renderer coordination (T011) |
| A062 (r2-ui): the draft covers the general's army | R2-Q24 (R2b S0); T062 fits its cards to that sheet |
