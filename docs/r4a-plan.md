# Milestone R4a plan: the shape language on the field

**Status: agreed with the user on 2026-11-01** (S0 of [the task list](tasks/r4-readable-armies.md), T007). The user settled the decisions below the same day, then agreed the plan as written, call 10 included. The answers are dated in `docs/tasks/clarify.md`, and S0 wrote them into SPEC before any code. Later that day, at T026's review of the silhouette sheet, the user dropped weapon marks from units (decision 9). That superseded decision 2 and calls 1 and 10, and reworded call 9. The user then approved the sheet redrawn without marks (T026, "The approved silhouette sheet" below).

Written 2026-11-01 against `develop` at `778a564` ([#42](https://github.com/Swalliso/Sambattler/pull/42), R1's plan, merged). R4a is the first part of SPEC §16 "Milestone R4 — Readable armies", split by X3. Its scope comes from that milestone and the sections it cites: §2, §4.6, §5.6, §5.8, §10.1, §10.4, §11.2, §11.3, §13.2, §13.6, §14.2, §14.3, §15.6 and §17 #20. The calls below come from the review of SPEC v2: its findings, cited by A-ID (`docs/tasks/spec-analysis.md`), and the user's answers to X3, R4-Q1 to R4-Q5, #52, #53 and #55 (`docs/tasks/clarify.md`). The tasks are Part 1 of `docs/tasks/r4-readable-armies.md`, T001–T039.

## Goal

On the field, you can tell the units apart and read each one's armor from its size and its archetype from its silhouette, on both sides (F17). That has to hold before R2a's playtest asks whether seeing the general's army helped. Today a sprite's size shows its merge tier, not its armor, so that answer would be confounded (A202).

After R4a, size means armor and nothing else, and each archetype has a silhouette of its own. No unit carries a weapon mark (decision 9). A merged unit keeps its body and shows its tier with pips, and an Elder also carries a gold rim. R4a changes how units are drawn, not how they fight. It changes no rule and no number in the battle, so no golden hash moves.

## Scope

**In R4a:**
- **One unit drawer,** `src/render/unitSprite.ts` (new), that v1's renderer and R2a's new views share. `TIER_SCALE` and `TIER_PIPS` go once, for both (call 5).
- **The tier cue** (R4-Q3):
  - `i-pip`, a 3×3 gold core in a 1-px dark outline, one for Bloomed and two for Elder, on the field and in the inspect panel;
  - a 1-px gold rim on Elders, baked per frame;
  - the Elder aura, kept.
- **The shape block** on unit sprites, and the body bands on the sheet (R4-Q1). The block holds the body only: small, medium, big or structure (decision 9).
- **No mark glyphs** (decision 9). S2 built shared glyphs in `data/sprites/marks.json`, baked onto each frame (R4-Q2, #55), and S2b retired them (T077).
- **Pure shape checks,** in `src/data/shapes.ts` (new) and the registry:
  - the body follows the armor;
  - the bands;
  - distinct silhouettes;
  - the width bound.
- **`npm run sprite-sheet`** (`tools/sprite-sheet.ts`, new). It renders every frame at 2× and 4×, facing both ways. It overlays the band lines and each measured box, lists each problem, draws strips of each unit on its squad's grid, and takes both colour-vision filters.
- **A draft silhouette sheet** (`docs/r4a-silhouettes.json`), which the user approves before any game sprite is redrawn (T026).
- **All 13 unit sprites redrawn:** the core six first (the Sporeling, Capguard, Gill Archer, Amanita Knight, Hammercap and Burster), then the other seven. Also the Puffball Mortar's emplacement sprite, `e-puffballMortar` (R4-Q5).
- **The colour-vision check, moved from M7:**
  - the matrices in `tools/lib/cvd.ts` (new);
  - team, soil and outline contrast cases in `tests/unit/contrast.test.ts`;
  - a lighter Gray Rot body (R4-Q4).
- **The lineups:** `unit-lineup` and `unit-lineup-twin` replace `elder-showcase`, with their screenshots (#52).

**Not in R4a:**
- **R4b's, after R3:** matchup marks in full and their glyphs (the structure glyph among them), augment and combo icons, the card face, the card-text pass, the words into the data, Help, the tooltips and the tips.
- **Not R4's at all:**
  - new rules or numbers, since #53's radius change is R2a's;
  - the Gray Rot's own sprites, which are M7's.

**What R4a hands on:**
- **To R2a:**
  - `drawUnitSprite`, `drawPips` and `emplacementSprite`. R2a's renderer session (S11) draws every unit through them and never copies `drawUnit`.
  - The lineups, which R2a/T048 copies in clash form.
  - The shape checks, which R2a S1 re-runs once it adopts R1's squad sizes. A width failure is fixed by narrowing that sprite in a follow-up R4a PR, never by loosening the check.
  - #52's first reading and the tier question at R2a's playtest (R2a/T137).
- **To R4b:** `bodyOf` in `src/data/shapes.ts`, and the lineups. R4b's `mm-` matchup glyphs, the structure glyph among them, go in a sheet of their own, since `marks.json` went with decision 9 (R4b-S0 picks the file).
- **To M7:** the Gray Rot's own sprites follow the same shape checks and the same contrast test.

## The decisions (2026-11-01)

1. **X3, split R4:** yes. The user answered in the hub session that started this one ("Both", for the two side tracks). R4a runs now beside R1 and lands before R2a's playtest. R4b follows R3.
2. **Marks** (R4-Q2, #55): the recommendation. **Superseded the same day by decision 9:** units carry no weapon marks. What follows is the decision as first taken.
   - Each mark is one shared glyph, the same on every unit and on both sides, baked onto each frame at the sprite's `shape.markAt[frame]`.
   - The rule is `markOf`:
     - the area mark for armor-ignoring damage (`burst`);
     - the heal mark for a healer with 0 damage (the Tender);
     - otherwise the damage type's mark: blade for slash, hammer for crush, and for pierce an arrow on a unit that shoots (`projectileSpeed` > 0) or a spike on one that doesn't (A149).
   - The Scythecap carries the blade alone, since cleave goes through the matrix as slash (A150).
   - A splash that goes through the matrix keeps its type's mark. So the Mortar carries the hammer with a small splash accent (A151).
3. **Body bands** (R4-Q1): the recommendation.
   - Heights: small 8–9, medium 11–12 and big 15–16 native px. They're measured on the frame's own opaque pixels, with the mark and the Elder rim left out (call 2). §14.3's "about 10–14 px" becomes 8–16.
   - Widths, mark included: at most floor(32/k) native px, where k = ceil(sqrt(n)) and n is the building's base squad + 1 for the Rhizome Vault (call 8).
     - Today's data gives 10 px for the Capguard, Gill Archer, Hammercap, Sporeling, Veilstalker, Morel Runner, Burster and Driftling, and 16 px for the Amanita Knight, Tender, Scythecap, Rootbreaker and Rhizomorph.
     - The Velvet Shrine's +2 overflows under #11's first guess, and the sheet tool lists it.
   - Since decision 9 there's no mark, so the width is the body's own.
4. **The tier cue** (R4-Q3): changed from clarify's recommendation, at this session's suggestion.
   - Bigger pips for both tiers, and the Elder aura kept.
   - A gold rim on Elders only, and no rim on Bloomed. A rim drawn outside the outline makes a unit look 2 px bigger, and the bands are only 2–3 px apart, so a rimmed small Bloomed would look 10–11 px tall against medium's 11–12. Bloomed units are also about half of a merging army (8 Sporelings field 2 Bloomed + 2), so a rim on every Bloomed would outline half the field.
   - If R2a's playtest finds Bloomed units hard to tell from base ones, the spore-white tier-2 rim is one more bake.
5. **Team contrast** (R4-Q4): the recommendation. The check moves from M7 into R4a, with a lighter, bone Gray Rot body (call 7, T033, T034). This session re-ran the numbers:
   - today, under deuteranopia and protanopia, the two sides' body tones differ by only 1.00–1.10:1 in luminance;
   - the lighter first guess (`v #b0bcab`, `l #eaf0e2`, `d #808b7c`) gives 1.51–2.13:1, 3.57:1 or more against every soil tone and 4.73:1 or more against the outline;
   - a darker body passes the team case but sinks into the soil (1.07:1) and into its own outline (1.32:1).
6. **Emplacements** (R4-Q5): the recommendation.
   - An emplacement has a slot-sized sprite of its own, `e-<buildingId>`, at most 32 × 32, carrying its weapon's mark. The Rootgate has no attack, so it carries none. Since decision 9 no emplacement carries a mark.
   - It's found by that name, and the building's own sprite stands in where there's none (call 4).
   - Structure has no body band. Its matchup glyph is R4b's (T049).
7. **The field's scale** (#52): the recommendation's plan.
   - Twin Roots draws at about 1.78× in a 1280×720 window (A077), so it's the worst case. It gets a lineup capture of its own, `r4-lineup-twin`.
   - Pips are at least 2 native px wide in every stroke (A158). Weapon marks were held to it too, until decision 9 dropped them.
   - §10.1 states each map's scale.
   - R2a's playtest takes a first reading, and R4b's fresh-tester gate closes #52 (T075, T076).
8. **The merged radius** (#53): the alternative, ×1.0. A merged unit's collision radius stops growing, as its sprite does. The change moves goldens, so R2a makes it inside S1's one golden refresh (R2a/T011), and R4a, which moves none, leaves `tierRadiusMult` at 1.25 in the data.
9. **No weapon marks on units** (the user, 2026-11-01, at T026's review of the silhouette sheet; R4/T077). It supersedes decision 2 and #55.
   - "If we don't have too many units and they're visually distinct enough we don't need that visual clutter on the units." No unit or emplacement carries a mark glyph on the field, now or later.
   - A unit's damage type reads from its own silhouette, where a weapon §11.3 names is drawn as body (call 9), and from the hit sparks, the matchup marks on cards and the planning screen, and the inspect panel.
   - F17 stays answered: size and silhouette tell the units apart, and the cards and the planning screen say which one counters what.

## Calls this plan makes where the spec is ambiguous

Each is easy to reverse. Calls 1–9 are the task list's Technical context calls, and call 6 follows R4-Q3's answer. Call 10 is new in this plan. Decision 9 superseded calls 1 and 10 and reworded call 9.

1. **No weapon marks** (decision 9, 2026-11-01). This call first had shared glyphs in `data/sprites/marks.json` (`m-blade`, `m-arrow`, `m-spike`, `m-hammer`, `m-area`, `m-heal`, and the accent `m-splash`), which the atlas baked onto each unit frame at `shape.markAt[frame]`. R4/T077 retired them, with the shape block's mark fields and their checks. Don't add marks back.
2. **Body size is the height of a frame's own opaque pixels** (A148). The Elder rim is a separate baked region, so it doesn't count. Width is the same box's width (call 8). Since decision 9 there's no mark to add to it.
3. **The lineups use v1's scenario format now,** as `elder-showcase` does, with only default-data units, so R4a can take screenshots before R2a exists.
   - The units that exist only as presets (the Burster, the Rhizomorph and the Driftling) are checked through `protoContent('rework')`.
   - R2a/T048 makes clash-form copies, R2b/T048 ports the files before `test.noTurrets` leaves `ScenarioSchema`, and R4b-S0 (T043) adds the Burster and the Rhizomorph once they're default data (A077, A158).
4. **An emplacement's sprite is `e-<buildingId>`,** found by convention, with the building's own sprite as the fallback, so no `BuildingDef` field and no hashed data change (A154).
5. **One unit drawer** (`src/render/unitSprite.ts`) serves v1's renderer and R2a's new views, so `TIER_SCALE` is removed once and R2a never copies `drawUnit` (A066).
6. **The Elder rim is gold `#f0c85a`, team-neutral,** a 1-px outline of the frame's mask in a (w + 2) × (h + 2) region, drawn under the sprite, with one bake for both factions. Bloomed units get no rim (R4-Q3). Gold is the pips' colour and belongs to neither side. Lilac is the Velvet Bloom's own tone (§2), so a lilac rim would read as the wrong team on a Gray Rot unit (A162).
7. **The colour-vision matrices move** to `tools/lib/cvd.ts`, so the screenshot tool, the sheet tool and the contrast test use the same numbers (A159). `applyCvd` works in linear RGB, as the screenshot tool's `feColorMatrix` does by default (`color-interpolation-filters` is `linearRGB`), so the test's ratios match the PNGs.
8. **The width bound counts the base squad plus one.** n is the building's base squad + 1 for every spawner, since the Rhizome Vault fields 1 more unit beside it (§11.2, R3/T085).
   - The upgraded Burrow's 12 is left out, because upgrade tracks retire in R3.
   - The Velvet Shrine's +2 and M6's strains (Teeming's 9) may overflow under #11's first guess. The sheet tool lists them, and the test doesn't fail them (A165).
   - Until R1's sizes are data (R2a S1), the bound reads today's spawn-derived squads.
9. **A weapon a silhouette draws is body** (reworded 2026-11-01 by decision 9). It counts toward the band and stays inside it, and no glyph sits beside it.
   - That covers §11.3's Gill Archer bow, the Hammercap's raised maul, the Scythecap's hooked cap edge and the Rootbreaker's ram.
   - So the Hammercap's maul, held up on its raised arm, lifts the body's top row, and the whole of it counts toward the medium band.
   - First form: silhouettes and marks didn't double up, so the bow carried the `m-arrow` glyph and the maul head was the `m-hammer` glyph.
10. **Retired 2026-11-01 (decision 9).** It kept a mark within the body's rows, so a raised hammer couldn't make a medium Hammercap look big while it passed the check. With no marks it has nothing to hold, and call 9 keeps a drawn weapon inside the band.

## Stand-ins

What R4a uses in place of pieces that don't exist yet, and why each is good enough:

- **v1's battle shows the new sprites** until R2a's views exist. It's the same drawer (call 5), so what the user reviews at the gate is what R2a draws.
- **The lineups use v1's scenario format** (call 3). They place every default-data unit at tiers 1, 2 and 3 on both sides, with `test.noTurrets`, so nothing merges or fights while paused.
- **The preset-only units** (the Burster, the Rhizomorph and the Driftling) are checked through `protoContent('rework')`. They can't stand in the lineup until R2a makes them default data, since the registry rejects unknown units (R4b/T043 adds them).
- **Today's squads stand in for R1's sizes.** The width bound uses `spawn.count × round(60 / spawn.interval)` until R2a adds `squad` from R1's numbers. R2a S1 then re-runs the shape test (call 8).
- **v1's battle still draws the Mortar as its building.** The emplacement sprite first appears in R2a's clash view, through `emplacementSprite()`.
- **The Gray Rot plays the Velvet Bloom's drawings** in its own, lighter palette until M7 draws its roster.

## Steps

The tasks are Part 1 of `docs/tasks/r4-readable-armies.md`, one session per row of its Sessions table, each ending in a PR into `develop`.

1. **Agree this plan** (S0, T001–T007, `feature/r4a-plan`). Then record X3, R4-Q1 to R4-Q5, #52's plan, #53 and #55 in SPEC, `docs/tasks/clarify.md` and `docs/status.md`. S0 is docs only.
2. **One unit drawer** (S1, T008–T016, `feature/r4a-unit-drawer`):
   - the colour-vision matrices;
   - the two lineups, replacing `elder-showcase`;
   - the atlas's bake as pure functions (`src/render/compose.ts`);
   - `src/render/unitSprite.ts`;
   - no `TIER_SCALE`;
   - `i-pip`, the Elder rim, and pips in the inspect panel.

   It merges before R2a's renderer session where possible.
3. **The shape checks** (S2, T017–T023, `feature/r4a-shape-checks`): the shape schema, `marks.json` and the glyph bake, `src/data/shapes.ts`, the registry's cross-checks, and the sprite-sheet tool. Tests first. S2b retired the glyphs and the bake (decision 9).
4. **The silhouettes** (S2b, T024–T026 and T077, `feature/r4a-silhouettes`): a draft sheet of frame 0 for all 13 units and the Mortar's emplacement, fixed until the tool lists no problem. At its review the user dropped weapon marks (decision 9), so S2b also retires them in code and docs and redraws the sheet without them (T077). **The user approves it** (T026) before S3.
5. **The core six and the emplacement** (S3, T027–T029, `feature/r4a-core-sprites`), redrawn from the approved sheet, three frames each.
6. **The other seven** (S4, T030–T032, `feature/r4a-roster-sprites`): the distinctness and width cases, the redraws, and a shape block required on every unit sprite. It reads R1's proposed squad sizes if R1 has reported.
7. **Contrast, verification and docs** (S5, T033–T038, `feature/r4a-contrast`): the contrast cases, the Gray Rot's lighter tones, R4a's verification and its As built. The contrast tasks may move to any session after S2 if the user wants the palette sooner.
8. **The review gate** (T039): the user looks at the captures and the dev site, and agrees that R2a's playtest can run on these sprites.

All of it runs beside R1, which works in `tools/` and `src/sim/formation.ts` and shares no code file with R4a. Every R4a session that changes `data/` adds one `data/CHANGELOG-balance.md` entry: display only, no golden moved, and the approval it rests on (T038).

## Verification

SPEC §16 R4's R4a part:

1. **`npm run verify`,** with the body checks running in `validate:data` through `src/data/registry.ts` (T035). Every R4a session also runs `npm run golden -- verify` and says in its PR that no hash moved: sprites, palettes and scenarios that no golden replays aren't battle state (`src/sim/state.ts:189-197`).
2. **The captures,** each PNG opened and its checklist walked (T036):

   ```bash
   npm run screenshot -- --name r4-lineup      --params "scenario=unit-lineup&paused=1"
   npm run screenshot -- --name r4-lineup-d    --params "scenario=unit-lineup&paused=1" --filter deuteranopia
   npm run screenshot -- --name r4-lineup-p    --params "scenario=unit-lineup&paused=1" --filter protanopia
   npm run screenshot -- --name r4-lineup-twin --params "scenario=unit-lineup-twin&paused=1"
   ```

   The checklist:
   - each unit's silhouette is distinct at the field's scale, on both sides;
   - bodies are ordered by armor, and merged units keep their body with pips, Elders with a gold rim;
   - no unit carries a mark glyph (decision 9);
   - the sides stay apart under both filters;
   - #52's first reading on Twin Roots, noted here.
3. **`npm run sprite-sheet`** lists no problem for `data/sprites/units.json`.
4. **`npm run test:browser`, `npm run test:slow` and `npm run golden -- verify`** (T037). v1's guardrails give the same verdicts as before, since no rule changed.
5. **The review gate** (T039, the user): R2a's playtest then runs on these sprites, and asks "Could you spot the Elders, and tell a Bloomed unit from a base one?" (A162).

## Open questions for the user

**At T007 (S0): answered 2026-11-01,** and the plan agreed as written (the Decision and "R4a part agreed" lines in `docs/tasks/clarify.md`):
- X3: split R4 (decision 1).
- R4-Q2 and #55: the marks (decision 2), superseded at T026's review by decision 9.
- R4-Q1: the bands (decision 3).
- R4-Q3: the tier cue, with Elders alone rimmed (decision 4).
- R4-Q4: team contrast, with a lighter Gray Rot (decision 5).
- R4-Q5: the emplacement sprite, with the structure glyph in R4b (decision 6).
- #52: Twin Roots as the worst case (decision 7). Its Decision line stays open until R4b's gate.
- #53: ×1.0, made in R2a (decision 8).

**Later:**
- **T026 (S2b): approved 2026-11-01.** At its first review the user dropped weapon marks (decision 9), and then approved the sheet redrawn without them, as drawn. The record is below, in "The approved silhouette sheet".
- **T039 (the gate):** agree that R2a's playtest can run on R4a's sprites. Agreed 2026-11-02 (As built, verification 5).
- **#52:** a first reading at R2a's playtest, and the call at R4b's fresh-tester gate (T075, T076).
- **R1's squad sizes (#7):** they set the width bound. If R1 makes a 4-unit squad bigger, its bound may drop from 16 px to 10, and the sprite is narrowed in a follow-up PR.
- **The Bloomed cue:** if R2a's playtest finds Bloomed units hard to tell from base ones, add the spore-white tier-2 rim (R4-Q3's other option).

R4b's own calls (R4-Q6, #54, the structure glyph's form) come at R4b-S0.

## The approved silhouette sheet (T026, 2026-11-01)

The user approved `docs/r4a-silhouettes.json` as drawn ("Approve as drawn"), on `feature/r4a-silhouettes` (R4a-S2b), merged as `dbd7f09` ([#55](https://github.com/Swalliso/Sambattler/pull/55)). T032 deletes the file once every sprite is redrawn; the approved version stays at `dbd7f09:docs/r4a-silhouettes.json`. It's frame 0 of all 13 unit sprites and of `e-puffballMortar`, and S3 and S4 redraw the game's sprites from it. `npm run sprite-sheet -- --sheet docs/r4a-silhouettes.json --name r4a-silhouettes` renders it, plain and with `--filter deuteranopia` or `--filter protanopia`.

**The change the user asked for.** The first draft carried S2's mark glyphs. At its review the user dropped them (decision 9, R4/T077), and the redraw draws each weapon §11.3 names as body: the Gill Archer's bow with an arrow, the Hammercap's raised maul, the Scythecap's hooked cap and the Rootbreaker's ram.

**What the approval covers**, for S3 and S4 to follow:
- **Heights:** small bodies are 8 px (the Sporeling and the Burster) or 9 (the Gill Archer, the Tender, the Veilstalker and the Driftling). Every medium body is 12, and the Amanita Knight is 16.
- **The Rootbreaker** is a capped root beast carrying a knotted root log forward, its head curled like a ram's horn. That's how this sheet draws §11.3's "ram's head of knotted root".
- **The Amanita Knight's** dome stays red and cream on both sides, as today. Its side shows in its gill band, its ring and which way it faces.
- **The Driftling** draws no shadow, since `flyerShadow` draws one under every flyer.
- **The Mortar's emplacement** is 24 × 22, anchored at its centre, since an emplacement stands at its slot's centre (`emplacementPosition`). S3 may resize it within 32 × 32 (T029).
- **Soil and roots** (the Rhizomorph's mound, the Mortar's base and the Rootbreaker's log) use unswapped browns, so the ground looks the same under both sides.

**The checks when it was approved:**
- The tool listed no problem in any of the three renders. It listed 4 overflows, all at base + 2 (the Velvet Shrine's): the Tender, the Scythecap, the Rootbreaker and the Rhizomorph.
- Every pair of the 13 units passes T030's distinctness rule, with an IoU of at most 0.69.
- `npm run verify` passed, and no golden moved.

**For S3 and S4:**
- The sheet has frame 0 only. T028 and T031 add the two walk frames and the attack frame.
- Under deuteranopia, the Rootbreaker's brown log turns olive like the soil, and only its outline keeps it apart. Watch it in T036's captures.
- T032 deletes this sheet once S4 has drawn the roster.

## As built

**Built 2026-11-01 to 11-02,** in seven PRs into `develop`: the plan (S0, [#43](https://github.com/Swalliso/Sambattler/pull/43)), S1 ([#47](https://github.com/Swalliso/Sambattler/pull/47)), S2 ([#49](https://github.com/Swalliso/Sambattler/pull/49)), S2b ([#55](https://github.com/Swalliso/Sambattler/pull/55)), S3 ([#58](https://github.com/Swalliso/Sambattler/pull/58)), S4 ([#62](https://github.com/Swalliso/Sambattler/pull/62)) and S5 (`feature/r4a-contrast`). R4a changed how units are drawn, not how they fight: every session ran `npm run golden -- verify`, and no hash moved. The decisions held as agreed, except that decision 9 (no weapon marks), made at T026's review, superseded decision 2 and calls 1 and 10.

**What it built**
- **One unit drawer** (S1, T008–T016): `src/render/unitSprite.ts` draws every unit in v1's battle, and R2a's views import the same functions (`drawUnitSprite`, `drawPips`, `emplacementSprite`). `src/render/compose.ts` is the pure bake (palette swap, Elder rim, mirroring) and the atlas's layout, shared by the atlas and the sheet tool. `TIER_SCALE` and `TIER_PIPS` are gone: a merged unit keeps its body, with one `i-pip` for Bloomed and two for Elder, on the field and in the inspect panel, and only Elders get the gold `#f0c85a` rim. `unit-lineup` and `unit-lineup-twin` replace `elder-showcase`, and `tools/lib/cvd.ts` holds the colour-vision matrices.
- **The shape checks** (S2, T017–T023): a sprite's `shape` block and a sheet's `bands` (small 8–9, medium 11–12, big 15–16 px) in the schema. `src/data/shapes.ts` has `bodyOf`, `bodyBox`, `baseSquad`, `widthBound` and the problem lists, and the registry runs them when data loads. `npm run sprite-sheet` draws a sheet with its measurements, squad strips and problems.
- **No weapon marks** (S2b, T077): S2's glyphs (`data/sprites/marks.json`) and the shape block's mark fields are gone, and a block that names a mark fails to load.
- **The silhouettes** (S2b to S4, T024–T032): the sheet, approved as drawn (T026). S3 redrew the core six and drew `e-puffballMortar`, and S4 redrew the other seven, three frames each. The registry requires a shape on every unit sprite, and an `e-<id>` emplacement for every tower with an attack. `tests/unit/shapes.test.ts` holds the roster to distinct silhouettes (the highest IoU is 0.69, the Capguard and the Scythecap) and to the width bound at base squad + 1.
- **Team contrast** (S5, T033–T034): `tests/unit/contrast.test.ts` holds SPEC §2's three cases, and the Gray Rot's swap tones are the bone first guess: `v #b0bcab`, `l #eaf0e2`, `d #808b7c`. Under both filters, the sides' tones differ by 1.51–2.13:1, where v1's ash differed by 1.00–1.10:1. The Gray Rot's tones stand 3.57:1 or more off the soil, and 4.73:1 or more off the outline. The tightest pair is `l` under deuteranopia, at 1.51:1.

**Where it differs from the plan**
- Decision 9 superseded decision 2 and calls 1 and 10, as above. S2 built the glyphs, and S2b retired them.
- R1 hadn't proposed squad sizes by S4, so the width bound uses today's spawn-derived squads. R2a S1 re-runs it on R1's sizes, and a sprite that fails is narrowed (Scope, "What R4a hands on").
- The Veilstalker's and the Scythecap's sprites are 1 px wider than the sheet's, for their attack frames. Frame 0 is the sheet's.
- Only the Gray Rot's body tones changed. The UI's `--rot` tokens, the battle report's colours, the HP bars, the colour-blind team mark's dashes and the run-map icons keep v1's ash (`#7d8a7a`, `#b8c4a8`). None is a body, and none of T033's cases reads them.

**Verification** (SPEC §16 R4, R4a's part, run on `feature/r4a-contrast` on 2026-11-02)
1. **`npm run verify`** (T035): all ok, with 642 unit tests. `validate:data` loads 102 sprites through `src/data/registry.ts`, body checks included. Golden verify: all 8 pass, none moved.
2. **The captures** (T036), each PNG read at 2× zoom:
   - `r4-lineup`: all ten default-data units stand on both sides, at tiers 1, 2 and 3, each its own silhouette. Bodies follow armor, with the Amanita Knight tallest. Merged units keep their body: Bloomed ones carry one pip, and Elders two pips and the gold rim. No unit carries a mark glyph.
   - `r4-lineup-d` and `r4-lineup-p`: the Velvet Bloom reads as a darker blue-violet and the Gray Rot as a light bone-gray, apart in lightness under both filters. Both stand off the soil, which turns olive.
   - Two things for the gate to look at. The Amanita Knight's cap is a fixed red (`R #c8423a`), not a swap tone, so the cap looks the same on both sides; the Knight's side reads from its band, its stalk and its facing. Under both filters, the Rootbreaker's brown log turns olive like the soil, though its outline keeps it visible.
   - `r4-lineup-twin`, **#52's first reading:** at Twin Roots' scale (about 1.78×), every silhouette still differs, and the pips and Elder rims still read. The smallest bodies (8–9 px tall, about 15 px on screen) are the hardest to read, but they stay apart. R2a's playtest gives the human reading (R2a/T137).
3. **`npm run sprite-sheet`**: PASS, 13 sprites, no problem. It lists four overflows at base + 2 (the Velvet Shrine's): the Tender, the Scythecap, the Rootbreaker and the Rhizomorph. The check lists those and doesn't fail them (call 8).
4. **`npm run test:browser`, `npm run test:slow` and `npm run golden -- verify`** (T037):
   - the browser suite: 94 tests in 12 files pass;
   - golden verify: all 8 pass, and none moved;
   - the slow suite: 5 of v1's 9 guardrails pass, and 4 miss (G1, G3, G7 and G8). R4a changed no input the battle reads: no sim or bot code reads a palette, and every golden replay is unchanged. So these are `develop`'s verdicts, not re-run there, and a v1 miss isn't open work (CLAUDE.md).
5. **The review gate** (T039, the user): passed on 2026-11-02, with S5 on the dev site ([#63](https://github.com/Swalliso/Sambattler/pull/63)). On the two points S5 raised, the user said "I think the knight's cap staying red on both sides is okay" and "i'm okay with the color-blind mode implementation". So R2a's playtest runs on these sprites (R2a/T137).
