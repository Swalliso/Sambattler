# R3 — The kit: tasks

R3 makes runs from a few archetypes, built differently each time (SPEC §16 R3's Goal). Each kit card gets copies, so "mass the cheapest spawner" is impossible by construction. Augments, combos and run packs make the builds, and augments replace v1's upgrade tracks. This list is a draft of 2026-11-01, made from SPEC v2 and `docs/tasks/spec-analysis.md` before R2b lands and before the user has settled §18.2 #36–#51 and R3-Q1–R3-Q9.

**Status:** Draft, not agreed · **Spec:** SPEC §16 "Milestone R3 — The kit" and the sections it cites · **Plan:** `docs/r3-plan.md` (written in S0) · **Gate in:** R2b's last PR merged into `develop` (R2b S13, R2b/T147: a whole run plays rounds, v1's battle is deleted, and R2b's drafts, `requires` gates, #27 flags and run tools are in), and R2b's playtest gate put to the user · **Gate out:** R3's verification steps 1–6 pass, the user has reviewed the numbers, and the playtest gate questions (step 7) have been put to the user

## Read first

- **SPEC:**
  - §16 R3, in full; §1.3 #5–#8 and #10.
  - The kit and drafts: §4.4, §8.1, §8.3, §8.4, §8.6, §8.7, §8.8, §8.9, §8.10, §11.1 (the `kit` keys, `enemyKit`, `draft.typeWeights`).
  - The content: §11.2, §11.6, §11.7, §11.13, §11.14, §11.15, Appendix A's rows for upgrade tracks and enemy upgrade levels.
  - Combat: §4.6 (neighbors, formation), §5.2 (target choice), §5.3 (effectiveness class), §5.6 (the muster), §5.8 (the shape never lies).
  - The general: §7.3, §7.4, §7.5, §7.7 (Veteran), §7.8.
  - UI: §10.2 (the tray, the ghost, the draft overlay, the relics-and-augments chip), §10.3, §10.4 (augment icons, combo highlights, inspect), §10.5 (run bar, route node, draft and spoils cards, event result).
  - Data and tools: §12.2, §12.3 (G2, G3, G8, G12, G14), §13.4, §13.7, §14.1, §14.2, §14.4, §14.5, §14.6, §15.2, §15.5, §15.6, §15.7 (the Kit and Data rows).
  - §18.2 rows #36–#51.
- **Docs:**
  - `docs/tasks/clarify.md`: the R3 section, and X4, X9.
  - `docs/tasks/spec-analysis.md`: the R3 findings (A122–A147) and A153, A194.
  - R2's plans and their As built: what R2 named and built. R2a's is `docs/r2a-plan.md` (R2a/T003) and R2b's is `docs/r2b-plan.md` (R2b/T001, T002). One `docs/r2-plan.md` exists only if the user rejected X1. T004 records which exist.
  - `docs/balance-backlog.md`: R1's and R2's results.
  - `docs/playtest-feedback.md`, the 2026-11-02 entry (R2a's rough playtest), "Builds and synergies, for R3's S0": the user wants more combos and interactions than counterplay alone, with the hub's two cautions (few, rule-changing combos; copies before combos). S0 reads it before it plans augments and combos.
  - `docs/archive/v1/ideas/after-the-rework.md`, Tier 1 item 1 and the "Card check" note: the card check's proposal. SPEC §16 R3 points there. It's background only.
- **Code** (as R2b leaves it): `src/run/runState.ts`, `src/run/flow.ts` (`generalKit`, `bossCounters`, `battleConfig`, the event and Grove functions), `src/run/resume.ts`, `src/run/migrate.ts` (R2b), `src/sim/draft.ts`, `src/sim/compile.ts`, `src/sim/effects.ts`, `src/sim/create.ts` (`draftPool`, `makeConfig`), `src/sim/kit.ts` (R2a), `src/sim/planning.ts` (R2a), `src/sim/formation.ts` (R1), `src/sim/ai/controller.ts`, `src/sim/ai/counter.ts`, `src/sim/ai/draftPolicy.ts`, `src/data/schema.ts`, `src/data/registry.ts`, `src/data/proto.ts` (the `flyers` preset, which holds the Drift Stalk), `src/ui/cards.ts` (as R2b leaves it), `src/ui/hud/tray.ts` (as R2b leaves it), `src/ui/hud/kit.ts`, `src/ui/screens/run.ts`, `src/app/debugBridge.ts`, `tools/experiment.ts`, `tools/lib/engagement.ts`, `tools/lib/balance.ts`, `tools/screenshot.ts`.

## Before you start

**Decisions** (the session each one blocks):

| Ref | Decision | Blocks |
|---|---|---|
| R3-Q1 | Start R3's data work once R2b is merged, while R2's playtest tuning goes on | S1, S2a, S2b, S3, S4, S10 (if no, all of R3 waits for R2's tuning) |
| R3-Q2 | Retire all 42 upgrade levels; one augment per pack spawner (7 more) | S1 (content), S7 (the general's draws), S12a, S12b |
| R3-Q3 | How the general draws augments: eligible pool, draft rarity weights, skip when none | S7 |
| R3-Q4 | The always-in set's rarity: area archetype and Hammercap common, Amanita uncommon | S10 |
| R3-Q5 | Combat and combo details: targeting order, splash, statuses, corners, the +3 combo term | S6, S8 |
| R3-Q6 | A run saved in R2's format migrates | S2b, S12b |
| R3-Q7 | R3's bars: cards per battle, a `rulesChanging` tag, `--auto-draft commit` | S1 (the tag), S13 |
| R3-Q8 | A card shows its copies as a count ("2/2"), not pips | S2b |
| R3-Q9 | Offers roll the rarity first, then the type (call 2) | S10 |
| X9 | Flyers after the first release; runs deal 4 of 9 packs; the Air pack's relics join every pool | S1, S4 |
| §18.2 #36 | The sixth core archetype | S1 |
| §18.2 #37 | An augment attaches to the building type | S5, S10 |
| §18.2 #38 | 1 augment per type; merged units keep augments, and a combo only if every parent had it | S5, S8, S10 |
| §18.2 #39 | `takenMult` counts toward a hit's class | S5 |
| §18.2 #40 | A combo doesn't stack | S8 |
| §18.2 #41 | The general rates its counters against your squads as augmented | S7 |
| §18.2 #42 | The general's copies sized to its colony | S3 |
| §18.2 #43 | At most 4 copies of one card | S2a, S10 |
| §18.2 #44 | No relics in the always-in set | S1 |
| §18.2 #45 | The always-in set can't be banned | S4 |
| §18.2 #46 | A banned or missing pack building: the pack isn't dealt; a missing one's relics join the open pool | S1 (the registry's undealable packs), S4 |
| §18.2 #47 | No pack swap at setup | S4 (nothing to build) |
| §18.2 #48 | The general's extras, boss counters and in-battle counters come from the run's pool | S7 |
| §18.2 #49 | Weight 1 for v2 cards a general's weights don't list | S7 |
| §18.2 #50 | Plots from relics, traits and commanders count toward the maximum | S3 |
| §18.2 #51 | A mono bot holds its card at the copy cap; single battles get a copy rule | S14 (R2a S0 instead, if X4 brought copies forward) |

R2b settled these already, and R3 builds on its answers: #26 (the Rhizome Vault, built here as a combo), #27 (R2's upgrade levels, deleted here), R2-Q19 (the `requires` gates on the Vault and Mycorrhizal Link, lifted here), R2-Q20 (the one path for gold earned in a clash, used by Truffle Hunters), R2-Q23 (whether R2's kit already has copy counts).

**Results it needs:**

- R1's and R2's squad sizes and economy, agreed by the user, in `docs/balance-backlog.md`.
- R1's core-six reading (R1-Q6), for #36.
- R1's G3 and G12 under 2, 3 and 4 copies (R1's copy-limited variants, X4), for #43 and #51.
- R2b's measured G8 and G14, so S14 can compare them once the general has copies and augments.
- R2b's playtest answers in `docs/playtest-feedback.md`.

**Findings this milestone must handle** (high and medium):

- A122 (high): the player's copy rule leaves the general 2–5 copies in battle 1, so its doctrine lean and selling for room do almost nothing. #42, T034.
- A194 (high): the same, from the design review: Mold and the Baron field at most 2 spawners on 8 plots. #42, T031, T034.
- A123 (high): no augments for the pack buildings, which hold 9 of the 14 upgrade tracks. R3-Q2, T003, T011.
- A124 (medium): the Rhizome Vault's effect has no DSL form. A `squadAdd` patch field and a combo with the Vault as `b`, T008, T085.
- A125 (medium): the general's augment draws can outrun the augments that exist. R3-Q3, T073.
- A144 (medium): the general's augment draw has no rarity rule, so half its augments would be rare flippers. R3-Q3, T073.
- A126 (medium): no precedence among taunts, combo target priorities, the preferred class and stickiness. R3-Q5, T065.
- A127 (medium): which combos a merged unit keeps. #38, T084.
- A128 (medium): the "rule-changing card" bar is near-automatic if every augment counts. R3-Q7, T015, T122.
- A129 (medium): the card check's unit, battles or runs. R3-Q7, T123.
- A130 (medium): a run saved in R2's format. R3-Q6, T028, T117.
- A131 (medium): one compiled-squad structure for R2's rank selectors, augments and combos, gated on the bench. T052, T069, T088.
- A145 (medium): single battles have no copy rule. #51, T027, T125.
- A146 (medium): Twin Roots lanes share copies, so a thin general leaves a lane empty. #42, T031.
- A153 (medium): #39's wording disagrees with §5.3 about merge perks. #39, T005, T054.
- From other milestones, handled here:
  - A196 (high, R1): squad sizes set without copies. T125, T135.
  - A083 (medium, R2): the Vault and Mycorrhizal Link gated until their systems exist. T085, T086.
  - A085 (medium, R2): "+1 unit" effects scale with the unit. T085, T136.
  - A084 (medium, R2): a pre-R2 save needs a pure, version-chained `migrateRun`, and an unreadable save must warn. R2b/T010 builds it; R3 chains its steps onto it (T028, T117); T019 and T110 test that an unreadable save still warns.
  - A082 (medium, R2): the Grove can dead-end. R2-Q21 (R2b); T109 keeps Leave lit once the graft becomes augments.
  - A155 (medium, R4): battle 1's general holds no augments to screenshot. T131.
  - A173 (medium, M6/M7): the Air pack's relics never reach a run. T009, T046.
- Lows, grouped: the general's kit sources (A132), the augment cap (A133), `--auto-draft commit` (A134), the always-in rarity (A135), starting during R2's tuning (A136), rerolls (A137), corners (A138), the Air pack's relics (A139), the core-entry wording (A140), Mold's doubled opener (A141), splash and status semantics (A142), the combo term and scenario staging (A143), packs whose building R1 dropped (A147), placeholder icons (A161), pips meaning four things (A163), KitCard's timing (A095), the general's upgrade levels in R2 (A100), the general's plots from sprawl only (A098; T034, T038), replayed clashes between counter cycles (A206; T129 reports identical replays per round).

## Technical context

**Path marks in this file.** A path with no mark exists today, or an earlier task in this file created it. "(new)" marks the task that creates it. "(R1)", "(R2a)" or "(R2b)" means that milestone creates it; SPEC §13.4 names it, and T004 checks the name R2 actually used.

"(as R2b leaves it)" marks a battle-scene path that exists today but is v1's. R2a builds its scene beside v1, under `rounds/` folders: `src/ui/rounds/hud/tray.ts` (R2a), `src/ui/rounds/callouts.ts` (R2a), `src/render/rounds/preview.ts` (R2a), `src/app/rounds/battleView.ts` (R2a) and `src/sim/rounds/ai/formationScore.ts` (R2a), among others. R2b moves them to v1's paths (R2b/T150) and deletes v1's HUD files, keeping what R2a's scene uses (R2b/T034). So the file at that path is R2a's module, or gone with its job moved elsewhere. T004 records the real path, and fixes this file in the same commit.

**If X4 brought copies into R2a** (decided at R1's gate): R2a built `freeCopies`, the plant refusal, starters ×2 and "a blueprint adds 1 copy", R2b put copy counts in the run's kit with its migration (R2-Q23), and #51 was settled in R2a. Then R3's copy work shrinks to:
- the copy card and its draft rules (T097);
- the copy cap (#43, T021) if R2a left it out;
- the general's copies (#42, S3), since the general keeps `maxOwned` until #42 lands;
- re-checking mono bots under augment builds (T124, T127).

S2a's and S2b's T018, T022–T028 become checks that R2 did it, and T028's migration step drops out. R3's only run-version bump is then S12b's.

**Where code lands:**

| What | Files | How |
|---|---|---|
| Content shapes | `src/data/schema.ts`, `src/data/registry.ts` | Extended: §14.2's KitCard, UnitPatch, UnitTrigger, UnitAction, AugmentDef, ComboDef, PackDef; `Content` gains `augments`, `combos`, `packs` |
| Content | `data/augments.json` (new), `data/combos.json` (new), `data/packs.json` (new) | §11.13–§11.15, plus R3-Q2's pack-spawner augments and the Vault's link |
| Copies | `src/sim/kit.ts` (R2a), `src/sim/planning.ts` (R2a), `src/sim/state.ts`, `src/run/runState.ts` | Extended: R2a's `freeCopies` stub gets a real limit |
| Augment runtime | `src/sim/augments.ts` (new), `src/sim/compile.ts`, `src/sim/hits.ts`, `src/sim/systems/{combat,targeting,movement,clouds,merging}.ts` | New module and hooks |
| Combos | `src/sim/combos.ts` (new), named in §13.4 | Neighbors, `combosAt`, resolving at the muster |
| Packs | `src/run/packs.ts` (new), named in §13.4; `src/sim/create.ts` (`draftPool`) | New, and the pool rewritten |
| Drafts | `src/sim/draft.ts`, `src/sim/ai/draftPolicy.ts` | Rewritten for four card types |
| The general | `src/run/flow.ts` (`generalKit`), `src/sim/ai/counter.ts`, `src/sim/ai/controller.ts`, `src/sim/ai/formationScore.ts` (R2a) | Copies, augments, the combo term |
| Saves | `src/run/migrate.ts` (R2b), `src/run/resume.ts` | Two chained steps: copies (S2b), then upgrades dropped (S12b); `packs` filled in `loadRun`'s normalisation (S4) |
| Retired | `data/upgrades.json`, `UpgradeTrackSchema`, `Content.upgrades`, `Library.upgrades`, every `upgrades` field, the `upgrade` card and run effect, `upgradeText` | Deleted in S12b |
| Tools | `tools/lib/cards.ts` (new), `tools/lib/engagement.ts`, `tools/experiment.ts`, `tools/sim.ts`, `tools/lib/balance.ts` (with `playRoundClash`, R2a), `tools/lib/clash.ts` (R1's army builder), `tools/screenshot.ts`, `src/app/debugBridge.ts` | The card check, the commit drafter, diversity numbers, augment and combo builds, `--hover` with a plot target |

**Reused:** R1's slot layout and the muster's knitting (`src/sim/formation.ts` (R1)); R2a's `formationOf`, `mergePreview`, per-squad stat tables for rank selectors, the `fielded` record and its `augments` field; R2a's bot planner and answer policy (X7); R2b's run tools (G14, G15, `tournament --commanders all`); `tools/lib/pool.ts`'s worker pool; `seedStream` (`src/sim/rng.ts`); `addCloud` and `burstUnit` (`src/sim/systems/clouds.ts`).

**Determinism and goldens:**
- The battle's `library` is part of the hashed state, so any field the library copies moves every golden. That includes a building's `archetype` or a relic's tag. Each session that moves them runs `npm run golden -- update` and says why in the commit.
- Augments compile when a battle starts and after each draft pick. Combos resolve per squad at Begin (§14.1). Nothing is recomputed per tick.
- New randomness only from seeded streams: pack dealing (`draft` stream, sub-seeded, call 1), the general's augments (`seedStream(seed, 'ai', 1000 + battleIndex)`, sub-seeded per battle index as `generalKit` does today). Neither draws from a battle's own streams, so R2a's per-side planning streams (`rng.ai` split by side, R2a call 10) don't move.
- `formationOf` stays pure. A squad's size from the Vault's link (`squadAdd`) is a pure function of the colony, so the preview still equals the arrival.

**The upgrade tracks and their fate** (14 tracks, 42 levels, `data/upgrades.json`; under R3-Q2's recommendation every level retires):

| Track | v1's levels | R2 (#27) | R3 | Replaced by |
|---|---|---|---|---|
| `sporelingBurrow` | HP +15% · damage +15% · +1 Sporeling per spawn | L3 became a squad add | Retired | Spore Pop, Tough Caps |
| `capguardHall` | HP +15% · Pierce ×0.8 · damage +20% | Kept | Retired | Spore Shield, Holdfast |
| `gillNest` | range +0.75 · damage +15% · interval −15% | Kept | Retired | Sticky Darts, Barbed Darts |
| `hammercapForge` | HP +15% · damage +15% · interval −12% | Kept | Retired | Shockwave, Sunder |
| `amanitaLodge` | HP +15% · damage +15% · spawns 15% faster | L3 dead | Retired | Red Charge, Spongy Cap |
| `rootbreakerDen` | HP +20% · speed +20% · +25% vs structures | Kept | Retired | Root Shove (R3-Q2) |
| `puffballMortar` | splash +0.3 · damage +20% · range +1 | Kept | Retired | Ranging Shot (R3-Q2) |
| `scythecapGrove` | HP +15% · damage +15% · cleave +0.3 | Kept | Retired | Thorned Hood (R3-Q2) |
| `veilstalkerHollow` | HP +20% · damage +15% · speed +15% | Kept | Retired | Ambush (R3-Q2) |
| `tendersRing` | HP +20% · healing +25% · heal range +0.75 | Kept | Retired | Bark Shell (R3-Q2) |
| `morelWarren` | HP +15% · damage +15% · +1 Morel Runner per spawn | L3 became a squad add | Retired | Spore Trail (R3-Q2) |
| `truffleCellar` | +1 gold a tick · HP +200 · +1 gold a tick | L1, L3 +12 a round; L2 dead | Retired | None: an augment can't change gold |
| `sporeExchange` | +1 gold a tick · HP +200 · interest cap +10 | L1 +12 a round; L2 dead | Retired | None |
| `rhizomeVault` | HP +200 · supply cap +3 · supply cap +3 | All dead | Retired | Its combo link (#26, T085) |

The Burster Pod has Fuse and Sporebloom, and the Rhizomorph Tunnel gets Upheaval (R3-Q2). If the user picks R3-Q2's alternative (core augments only), the seven pack-spawner rows retire with no replacement, augment offers come only for core buildings, and the general's draws skip pack buildings.

**R3-Q2's pack-spawner augments** (first guesses for S0 to agree, each built only from §14.2's parts):

| Building | Augment | Rarity | What it does | §14.2 form |
|---|---|---|---|---|
| Rootbreaker Den | Root Shove | U | Each Rootbreaker hit slows its target to ×0.6 speed for 1.5 s | `hit` → `status slow 0.6, 1.5 s` |
| Puffball Mortar | Ranging Shot | U | Every third shell also strikes one more enemy unit within 1.5 tiles, at full damage | `attack`, `everyNth 3` → `strikeExtra {1, 1.5, 1.0}` |
| Scythecap Grove | Thorned Hood | R | Scythecaps take ×0.5 damage from Pierce; speed ×0.85. Flips Gill Archers; the cost is speed, and no help against melee | `takenMult.pierce 0.5`, `speedMult 0.85` |
| Veilstalker Hollow | Ambush | U | Veilstalkers wait behind your front rank until it makes contact | `holdUntilContact` |
| Tender's Ring | Bark Shell | U | Tenders take ×0.5 damage from melee; speed ×0.8 | `takenMult.melee 0.5`, `speedMult 0.8` |
| Morel Warren | Spore Trail | U | Each Morel Runner that dies leaves a cloud: 0.8 tiles, 2 s, 6 a second | `death` → `cloud` |
| Rhizomorph Tunnel | Upheaval | U | Each Rhizomorph's first blow in a clash deals ×2 damage to every other enemy unit within 1 tile of its target | `attack`, `firstInClash` → `splash {1, 2.0}` |

**Calls this list makes** (each reversible; S0 confirms them in `docs/r3-plan.md`):

1. **Packs deal from a sub-seeded draft stream,** `seedStream(run.seed, 'draft', 900)`, not from `run.rng.draft`. A new run and a migrated run with the same seed then get the same packs, and no offer's stream moves (A130). Index 900 is unused, since battle indices stop at 6.
2. **Offers roll rarity first** (the rarity-fallback fix, R3-Q9). Today `generateOffer` rolls the type, then the rarity, and falls back to another rarity inside the type. No augment is common, so a common roll turns into an uncommon augment and the rarity weights don't hold for augments (A128's evidence, `src/sim/draft.ts:124-138`). New order for each card:
   - roll the rarity;
   - roll the type among the types that hold a candidate of that rarity, by the type weights;
   - step the rarity down, then up, only if no type holds one;
   - draw the item.

   It's still three draws a card. This changes offer odds, a rule change under `.claude/rules/balance.md`, so it waits on R3-Q9. Under its alternative, `generateOffer` keeps its order and T003 gives some augments a common tier.
3. **A hit is `projectile` or `melee`.** A hit is `projectile` when its source has `projectileSpeed > 0` or is an emplacement's shell. It's `melee` when its source has `projectileSpeed` 0 and no `burst` tag. Clouds and bursts are neither. A splash or extra strike from a trigger takes its source's class (§14.2; no finding covers it).
4. **Patch order and merging:** base → strain → augment patches → combo patches → modifiers (§14.1) (A131).
   - Multipliers multiply and adds add.
   - `takenMult` multiplies per key.
   - Flags OR together.
   - For `taunt` and `targetPriority`, a combo's value wins over an augment's.
5. **Fuse and Ambush's contact:** the hold ends once any unit of that side's front-rank squads in the lane has dealt or taken damage this clash. With no front-rank squad in the lane, it ends at once (§11.13).
6. **The general's copies** (#42's recommendation, A122, A194, A141, A146):
   - each army card (spawner or tower) gets ceil(open plots ÷ army cards) + `enemyKit.armySlack` (1), recomputed each battle;
   - open plots are the general's non-stump plots on every lane for that battle, since copies are shared across lanes: the map's plots + `run.plotsGained` (#21, A098), never relic, trait or commander plots;
   - copies count distinct opener cards;
   - a counter card arrives with `enemyKit.counterCopies` (2);
   - economy and utility cards follow the player's rule: `kit.starterCopies` (2) for an opener card, `kit.blueprintCopies` (1) for an added one;
   - `limits.*.maxOwned` becomes a `copies` override per general, so each general's Truffle Cellar keeps its v1 limit of 3 and its economy matches R2's;
   - the general isn't held to `kit.maxCopies`.
7. **The general's kit sources** (#48's recommendation, A132): preferred extras, the boss's counter cards and in-battle missing answers come from the always-in set, the dealt packs and your commander's core. Openers are exempt. If the filtered preferred list runs out, the kit takes always-in cards by the general's `weights`, highest first, ties by id. In single battles the kit-source filter is the whole roster.
8. **Merged parents of different building types** keep the lowest-id parent's building's augments, as R2's `sourceBuildingId` rule does (A127). This only arises from M6's Puppet Pod.
9. **Single battles until #51 lands (S14):** every side's cards have no copy limit (`copies` unset), so plots bind, as in R2 (A145). From S14 the general's cards stay the whole roster, bought by its listed weights (R2-Q4), with copies and augments added by call 6's rule and R3-Q3's draw (T125). That keeps G4, G5, G6 and G8's setups. #51's literal reading ("every side holds what a run would at that battle index") would give the general §7.8's kit instead; T125 says what changes then.
10. **Sunder doesn't count toward a hit's class;** `takenMult` does (#39, A153). Sunder is a timed status, not a matchup.
11. **The card check plays battles** at each general's first battle index: Mold 1, the Baron 1, the Blightwright 2 (R3-Q7, A129).
12. **The Vault's link is a combo** in `data/combos.json`. It shows as a hypha and takes part in `combosAt`, and under #40 a spawner beside two Vaults gets +1 once (A124).
13. **Two run-version steps,** chained in `src/run/migrate.ts` (R2b): copies in S2b, then upgrades dropped in S12b. A dev-site save from between them still migrates (A130). A run without `packs` gets them in `loadRun`'s normalisation, with no version bump (T045).
14. **How a combo matches its buildings** (A170). A side matches by `archetype` when §11.14 names a core archetype's building and the effect needs only the role. It matches by `building` when the effect needs that building's own unit (Chain Burst's bursts, the Mortar's minimum range, the Veilstalker's targeting) or the building has no archetype (the Cellar, the Vault). "Any spawner" is `{kind: spawner}`. Matching by archetype eases M7's Gray Rot; it never catches M6's Rootgate, since no combo names `emplacement`. T012 lists each combo's match.

## Stories

| ID | Priority | Story | Independent test |
|---|---|---|---|
| US1 | P1 | Your kit has copies. Each card shows how many are free, a card with none left can't be planted, selling returns the copy, and the general's kit has copies sized to its colony | Start a run as Vesper: the tray shows Burrow, Hall and Cellar at 2/2. Plant two Burrows and the third is refused as "all planted"; sell one and it reads 1/2. `npx vitest run tests/unit/kit.test.ts` |
| US2 | P2 | Each run deals 4 packs and the always-in set. The route map lists them, and bans remove a pack's building | A new run's route map lists 4 packs, each with its building and two relics. `npx vitest run tests/unit/packs.test.ts` |
| US3 | P3 | Augments change how a building's squads play, on both sides, and show on cards and squads | In a run, the route's battle-3 node shows the general's kit with augment icons, and in that battle its squads carry them in planning. `npx vitest run tests/unit/augments.test.ts` |
| US4 | P4 | Combos: buildings in front of, behind or beside each other link. The ghost shows the link, and the clash plays it | Place a Gill Nest behind a Capguard Hall: the ghost lights the Hall with Shield Wall's icon. `npx vitest run tests/unit/combos.test.ts` |
| US5 | P5 | Drafts, spoils, events and the Grove deal blueprints, copies, augments and relics. The run screens show the kit with copies and augments, and upgrade tracks are gone | Play to round 3: each draft card names its type. T118's command, `grep -rniI upgrade src tests tools data --exclude=CHANGELOG-balance.md --exclude='migrate*'`, finds nothing |
| US6 | P6 | The tools measure the kit: the card check, a committing drafter, build-diversity numbers, and the strict counter bar with augment and combo builds | `npm run experiment -- --checks cards,runs --commander all --power-policy auto --runs 200` writes `reports/experiments/<label>.json` |

## Phase 1: Setup

- [ ] T001 [USER] Write `docs/r3-plan.md` (new) in CLAUDE.md's plan format (Goal, Scope, Stand-ins, Steps, Verification, Open questions for the user), from this file, SPEC §16 R3 and `docs/tasks/clarify.md`. Agree it with the user before any code (§16)
- [ ] T002 [USER] Put the R3 decisions to the user from `docs/tasks/clarify.md` (R3-Q1–R3-Q9, X9, §18.2 #36–#51), with this file's 14 calls, and record each answer in its block's Decision line (§18.2)
  - Ask in the order the sessions need them: #36, #44, #46, R3-Q2, R3-Q7 and X9 (S1); #43 (S2a); R3-Q6 and R3-Q8 (S2b); #42 and #50 (S3); #45 and #47 (S4); #37–#39 (S5); R3-Q5 (S6); R3-Q3, #41, #48 and #49 (S7); #40 (S8); R3-Q4 and R3-Q9 (S10); #51 (S14).
  - Put #42 to the user with A122's arithmetic: Mold's battle-1 kit is 2 Burrows, about 220 gold of army against about 1,300 gold of income.
- [ ] T003 [USER] Agree R3's content with the user: the seven pack-spawner augments in Technical context, or replacements built from §14.2's parts, and the upgrade-track table. Record both in `docs/r3-plan.md` (§11.13, §11.6) ⛔ R3-Q2
- [ ] T004 Check the R2 hand-off against the code, and fix the paths in `docs/tasks/r3-kit.md` in the same commit (§13.4)
  - Confirm these:
    - the names R1, R2a and R2b gave every module marked (R1), (R2a) or (R2b);
    - R2a's per-squad stat table, `fielded` record, formation scorer and bot planner;
    - the slow-suite file names;
    - the `requires` values R2b put on the Rhizome Vault and Mycorrhizal Link (R2-Q19);
    - the clash-gold path R2-Q20 chose;
    - `RUN_VERSION` and the battle save version;
    - whether R2-Q23 gave R2's kit copy counts;
    - the battle scene's modules after R2b (the tray, tooltip, inspect, callouts, the top band and Intent panel, the ghost, the formation preview, effects), and the real paths of every "(as R2b leaves it)" file in T029, T039, T076 and T092–T095;
    - R2's plan file names (`docs/r2a-plan.md` and `docs/r2b-plan.md`, or one `docs/r2-plan.md` if the user rejected X1);
    - whether R2a's `SideConfig.kit` is already `KitCard[]`, and whether R2-Q23's alternative gave `RunState.kit` `KitCard[]`;
    - the plot count R2b's `battleConfig` gives the general (map plots + `plotsGained`, #21), and the helper that computes it, for T034;
    - the limit field R2b kept in `src/data/schema.ts` (`afterRound`, folded from `afterSeconds`), for T035.
- [ ] T005 Write the decided rules into `SPEC.md`, marking each decided §18.2 row closed and taking the **Open:** marker off its section (§0, §18.2):
  - §5.2's target order (R3-Q5);
  - §7.3's +3 combo term (R3-Q5);
  - §7.8's copies and augment draws (#42, R3-Q3);
  - the general's copy rule wherever SPEC still gives it the player's (#42, call 6): §1.3 #3 ("same … kit, copy and plot rules"), §1.3 #5 ("The general follows the same rule"), §8.10, §14.2's `GeneralDef` comment and §16 R3's Copies bullet;
  - §8.3's rarity roll (R3-Q9);
  - §8.4's pack rules (#45, #46, #48) and its relic pool: the relics of packs that can't be dealt join it (X9, A139);
  - §8.9's step for a run saved in R2's format (R3-Q6);
  - §10.2's copies line and §16 R3 step 6's checklist: a count, not pips (R3-Q8);
  - §11.13's pack augments and cap (R3-Q2, #38);
  - "4 of 9" wherever SPEC says "4 of 10" (`grep -n '4 of 10' SPEC.md`: §0.1, §1.1, §1.2, §1.3 #8, §11.15, §12.1, §13.4, §15.7, §16 R3, §18.1 D38, §18.3 and Appendix A), §8.4's "10 themed packs", and flyers in §17's list (X9);
  - §11.4's counter graph, if #36 picks the Mortar;
  - §12.3's mono definition for G3 and G12 (#51), if decided now; otherwise S14 records it;
  - §14.2's #39 wording (A153);
  - §15.2's `--auto-draft commit` (A134);
  - §16 R3's Tools bullet: `--auto-draft commit`, and "today" reworded as "greedy against random today" (A134);
  - §16 R3's bar wording (A129, A140).
- [ ] T006 Update `docs/status.md`: R3 started, the decisions taken, and the next session (§16)

**Checkpoint:** `docs/r3-plan.md` is agreed; every block S1 needs has a Decision line; `npm run verify` passes on the docs-only PR.

## Phase 2: Foundational (blocks every story)

- [ ] T007 [P] Add data-validation cases to `tests/unit/data.test.ts` (§15.7 Data row) ⛔ §18.2 #46, X9
  - every augment's `building` exists and fields units;
  - every combo's `a` and `b` resolve to at least one building;
  - every pack's relics exist;
  - every pack's building exists, unless the pack carries a `requires` the default content doesn't meet (the Air pack's `requires: 'flyers'`: the Drift Stalk exists only in `src/data/proto.ts`'s `flyers` preset, and R2b keeps it there), or the building is missing from the roster, which #46 allows (Deep Roots, if R1 dropped the Rhizomorph). Then the registry records the pack as undealable instead of failing;
  - with the `flyers` preset applied (`applyProto` runs before `loadContent`), the Air pack is dealable;
  - a relic in two packs fails;
  - `alwaysIn.buildings` must equal the buildings marked `core` plus `truffleCellar`;
  - every augment and combo icon resolves to a `ui` sprite;
  - a `UnitPatch` carrying `armor` or `damageType` fails the schema (§5.8);
  - 10 packs, and every relic but `sporestormSigil` in exactly one.
- [ ] T008 Add R3's content shapes to `src/data/schema.ts` (§14.2):
  - `KitCardSchema {building, copies?}`;
  - `UnitPatchSchema`: §14.2's fields plus `squadAdd` (A124), strict, so `armor` and `damageType` can't appear;
  - `UnitTriggerSchema` and `UnitActionSchema`;
  - `AugmentDefSchema` (plus `rulesChanging?: true`, R3-Q7) and `BuildingMatchSchema`;
  - `ComboDefSchema`, whose `b` may match a utility building (A124);
  - `PackDefSchema` (plus `requires?: 'flyers'`, X9) and `PacksFileSchema`;
  - `BuildingDef.archetype` and `core`, `RelicDef.rulesChanging?`, `GeneralDef.augments?`;
  - `CardType` gains `copy` and `augment`; `upgrade` stays until T116.
- [ ] T009 Load `augments.json`, `combos.json` and `packs.json` in `src/data/registry.ts` into `Content.augments`, `combos` and `packs`, keyed by id in data-file order (`augmentOrder`, `comboOrder`), with T007's cross-reference checks (§14.1, §14.2) ⛔ §18.2 #46, X9
  - Cross-reference a pack's building only when its `requires` is met: `'flyers'` is met when the content holds the Drift Stalk.
  - List every pack in `Content.packs` with `dealable: boolean`. A pack is undealable when its `requires` isn't met or its building isn't in the faction's roster. Its relics stay listed, so T046 can put them in the open pool (A173).
- [ ] T010 Print the augment, combo and pack counts in `tools/validate-data.ts`, and name each undealable pack with its reason ("air: requires flyers") (§15.1)
- [ ] T011 [P] Write `data/augments.json` (new): the 12 §11.13 augments and T003's seven pack-spawner augments, each with id, name, rarity, text, `building`, `icon`, `patch` and `triggers`. Tag `rulesChanging: true` on the rare matchup flippers (Tough Caps, Spore Shield, Barbed Darts, Spongy Cap, Shockwave, Thorned Hood) (§11.13) ⛔ R3-Q2
- [ ] T012 [P] Write `data/combos.json` (new), matching by call 14, so M7's Gray Rot can reuse the archetype matches (§11.14, §11.2) (A170):
  - `shieldWall`: `a {archetype: archer}` `behind` `b {archetype: shield}`;
  - `spottedScreen`: `a {archetype: heavy}` `inFront` of `b {kind: spawner}`;
  - `sunderingVolley`: `a {archetype: archer}` `behind` `b {archetype: crusher}`;
  - `huntingPack`: `a {building: veilstalkerHollow}` `beside` `b {archetype: swarm}`;
  - `truffleHunters`: `a {archetype: swarm}` `beside` `b {building: truffleCellar}`;
  - `chainBurst`: `a {building: bursterPod}` `beside` `b {building: bursterPod}`;
  - `anvil`: `a {building: puffballMortar}` `behind` `b {archetype: shield}`;
  - the Vault's link `rhizomeFeed`: `a {kind: spawner}` `beside` `b {building: rhizomeVault}`, `patch {squadAdd: 1}`.

  Leave out a combo whose building isn't in the default roster (Chain Burst, if R1 dropped the Burster Pod), and list it in `docs/r3-plan.md`.
- [ ] T013 [P] Write `data/packs.json` (new): `alwaysIn.buildings` (the core six and `truffleCellar`, no relics, #44) and §11.15's 10 packs. The Air pack carries `requires: 'flyers'`. If the Mortar is the sixth archetype, the Burster Pod takes Bastion's building (§8.4, §11.15) ⛔ §18.2 #36, §18.2 #44
- [ ] T014 [P] Set `archetype` on every building and `core: true` on the six in `data/factions/velvet-bloom/buildings.json`, by §11.2's table. Leave economy and utility buildings without an archetype (§11.2) ⛔ §18.2 #36
- [ ] T015 [P] Tag `rulesChanging: true` on Spore Cloud, Martyr's Bloom, Mycorrhizal Link, Forward Spores and the Sporestorm Sigil in `data/relics.json` (§16 R3 step 4) ⛔ R3-Q7
- [ ] T016 [P] Add placeholder 16×16 sprites to `data/sprites/ui.json`: one per augment and combo icon id, plus `i-copy` and `i-augment` for the card types, each a plain disc with a letter that R4b redraws (§10.2)
  - List the placeholder ids in `docs/r3-plan.md`, since R4b's icon check rejects them (A161).
- [ ] T017 Log the new data in `data/CHANGELOG-balance.md`, stating which entries the user approved (T003). Run `npm run golden -- update`, since the library copies `archetype` and the relic tag, and say so in the commit (§15.5)

**Checkpoint:** `npm run verify` passes. `npm run validate:data` reports 19 augments, 8 combos and 10 packs, and names the Air pack as undealable (requires flyers). No runtime behaviour changes; only the hashes move.

## Phase 3: US1 — Copies (P1)

**Goal:** each kit card has copies, for you and the general, and the tray shows them (§8.10, §7.8). **Independent test:** US1's row in Stories.

*S2a: copies in the battle (sim side; the run still passes cards with `copies` unset)*

- [ ] T018 [P] [US1] Write `tests/unit/kit.test.ts` (new) (§8.10, §4.4, §15.7 Kit row) ⛔ §18.2 #43
  - `freeCopies` is copies minus planted;
  - `plant` with no free copy is refused as `all planted`;
  - a sale in the planting phase refunds 100% and frees the copy;
  - a sale after a clash refunds 60% and frees the copy;
  - on Twin Roots both lanes draw on one count;
  - a card with `copies` unset has no limit;
  - `addCopy` stops at `kit.maxCopies` (4).

  The run-level cases land in S2b, with T023 and T026, in the same file. S2a writes them as `it.todo`:
  - the starting kit is the commander's 3 starters at 2 copies each;
  - copies carry to the next battle with every copy free;
  - a blueprint adds a card with 1 copy.
- [ ] T021 [US1] Add the `kit` block to `data/balance.json` and `BalanceSchema` in `src/data/schema.ts` (§11.1, §14.2) ⛔ §18.2 #43
  - The keys: `starterCopies` 2, `blueprintCopies` 1, `copyCopies` 1 and `maxCopies` 4.
  - `augmentsPerBuilding` comes with T058.
- [ ] T022 [US1] Make the kit `KitCard[]` in `src/sim/state.ts` (`SideConfig.kit`, `SideState.kit`, `Loadout.kit`), and add `augments: Record<Id, Id[]>` beside it, empty until S5 (§14.4)
  - This is A095's refactor, about 79 references in 23 files. Every reader keeps working with `copies` unset, so runs play as in R2 until S2b.
  - `applyCard` in `src/sim/draft.ts` adds `{building}`; `battleConfig` and `loadoutOf` in `src/run/flow.ts` map the run's `string[]` kit to `KitCard`s.
- [ ] T024 [US1] Give `freeCopies(state, side, buildingId)` its real limit in `src/sim/kit.ts` (R2a): copies minus the side's planted buildings of that id, counted across lanes. Add `copiesOf`, `addCard(kit, id, copies)` and `addCopy(kit, id, cap)`. A card with `copies` unset has no limit (§8.10, §14.6)
- [ ] T025 [US1] Refuse `plant` without a free copy as `all planted` in `src/sim/planning.ts` (R2a), for the player, the general and bots alike. Check that `sell` frees the copy at once (§4.4, §14.5)
- [ ] T027 [US1] Give single battles cards with `copies` unset in `src/sim/create.ts` (`makeConfig`), keeping R2's plot-bound single battles until T125. Let a scenario's `kit` take ids or `KitCard`s (`ScenarioSide` in `src/data/schema.ts`) (§15.2, §12.2) (#51 is applied in T125)
- [ ] T142 [US1] Refresh the goldens in `tests/golden` with `npm run golden -- update` (`SideConfig.kit`'s shape moves every hash), log the `kit` block in `data/CHANGELOG-balance.md`, and say why in the commit (§15.5)

*S2b: copies in the run, the migration step and the tray*

- [ ] T019 [P] [US1] Add migration cases to `tests/unit/migrate.test.ts` (R2b) and `tests/browser/resume.test.ts` (§8.9, §13.8) ⛔ R3-Q6
  - an R2-format run loads (never null) with starters ×2 and other cards ×1, `augments {}`, and a one-line notice;
  - a battle saved under the old config restarts at round 1's planning with §8.9's notice and keeps the run's progress;
  - an unreadable save still returns `{kind: 'unreadable'}`, and the title still warns before a new run overwrites it (A084);
  - the key stays `spore-sprawl.run.v1`.

  Put the R2-format save in `tests/migrateFixtures.ts` (new), shared by both files, so T118's grep can skip every `migrate*` file.
- [ ] T020 [P] [US1] Add cases to `tests/unit/tray.test.ts`: each card's copy count equals `freeCopies` over its copies, and a card with 0 free is unlit and reads "all planted" (§10.2) ⛔ R3-Q8
- [ ] T023 [US1] Make `RunState.kit` `KitCard[]` with `augments: {}` in `src/run/runState.ts`. `createRun` gives each of the commander's starters `kit.starterCopies` (§8.1, §14.4)
  - `src/app/debugBridge.ts`: `RunBrief.kit` keeps listing ids, and a new `RunBrief.copies` maps each id to its copies, so browser tests that read `kit` don't change.
- [ ] T026 [US1] Carry `KitCard[]` and `augments` through the run (§8.10, §8.3):
  - `applyCard` in `src/sim/draft.ts`: a blueprint adds a card with `kit.blueprintCopies`;
  - `src/run/flow.ts`: `battleConfig`, `finishBattle`, `nonStarter` and `loadoutOf` pass the run's `KitCard`s through. Every battle starts with every copy free.
  - Until T034 the general's kit cards keep `copies` unset, so `maxOwned` still binds and Mold doesn't get the player's 2-Burrow kit on the dev site (A122).
  - Turn T018's three `it.todo` run cases into tests.
- [ ] T028 [US1] Bump `RUN_VERSION` by one in `src/run/runState.ts` and add the step from R2's format to `src/run/migrate.ts` (R2b) (§8.9, §13.8) ⛔ R3-Q6
  - The step: starters ×2, other cards ×1, `augments {}`, `upgrades` kept until T117, and the notice "Your kit now has copies".
  - Bump the battle save version in `src/run/resume.ts`, so an old battle save restarts with §8.9's notice.
  - The keys don't change (`.claude/rules/storage.md`).
- [ ] T029 [US1] Show each card's copies as a free/owned count chip ("2/2") in `src/ui/hud/tray.ts` (as R2b leaves it). A card with 0 free is unlit and reads "all planted". Add a callout for a refused plant, "No copy left", in `src/ui/callouts.ts` (as R2b leaves it), in the refused-key slot (§10.2) ⛔ R3-Q8
  - Under the alternative to R3-Q8, show one pip per copy, lit while free.
- [ ] T030 [US1] Refresh the goldens in `tests/golden` with `npm run golden -- update` (run kits now carry copies, so the run goldens move) and say why in the commit (§15.5)

*S3: the general's copies, and copies in the UI*

- [ ] T031 [P] [US1] Write the general's copy cases in `tests/unit/run.test.ts` (§7.8) ⛔ §18.2 #42
  - On a colony of 8 open plots, Mold's battle-1 kit is Sporeling Burrow ×9 (1 army card: ceil(8 ÷ 1) + 1), counting the doubled opener once (A141).
  - On the same colony the Baron's is Capguard Hall ×9 and Truffle Cellar ×3 (its `copies` override).
  - On Twin Roots its free copies cover the open plots of both lanes (A146).
  - A counter card arrives with 2.
  - The kit is the same on two paths to the same battle index.
  - Open plots are the map's plots + `plotsGained`: your Mycelial Web plot doesn't change the general's copies (A098).
  - #50: Mycelial Web at the plot maximum adds nothing, and Armilla's Landholder still counts.
- [ ] T032 [P] [US1] Add cases to `tests/unit/ai.test.ts` (§7.4, §15.7 AI row):
  - the general never buys a card with no free copy;
  - a bot never buys one either;
  - a building the general sells for room returns its copy, and it can plant the counter in the same turn.
- [ ] T033 [P] [US1] Write `tests/browser/kit.test.ts` (new): in round 1's planning, the tray's count for each card drops as it is planted and rises when sold, and the inspect panel reads "copy 1 of 2" (§10.2, §10.4)
- [ ] T034 [US1] Write the general's copy rule (call 6) as a pure `generalCopies(lib, kit, openPlots, opener, overrides)` in `src/sim/kit.ts` (R2a), and call it from `generalKit` in `src/run/flow.ts`. Add `enemyKit.armySlack` 1 and `enemyKit.counterCopies` 2 to `data/balance.json` and `BalanceSchema` in `src/data/schema.ts` (§7.8, §8.2, §13.2) ⛔ §18.2 #42
  - Each army card (spawner or tower) gets ceil(openPlots ÷ army cards) + `enemyKit.armySlack`; `armySlack` is the "+ 1".
  - Opener economy and utility cards take `kit.starterCopies`, and added ones `kit.blueprintCopies`. A `GeneralDef.copies` override wins (T035).
  - `openPlots` is the general's non-stump plots on every lane for that battle: the map's plots + `run.plotsGained` (#21, A098), from the plot count R2b's `battleConfig` gives the general (T004 names the helper). Relic, trait and commander plots are the player's, and never count here.
  - A route node beyond the row you choose from uses the current `plotsGained`. The node shows the copies as they stand.
  - The rule lives in `src/sim`, because T125's single battles need it and `src/sim` can't import `src/run` (§13.2).
  - The route node and the Intent panel read the kit `generalKit` builds.
  - Under the alternative to #42, keep `maxOwned` as the general's limit (copies unset), and leave T035 out.
- [ ] T035 [US1] Retire `maxOwned` as the general's limit, keeping it for bots (§7.8, §14.2) ⛔ §18.2 #42 (under its alternative, skip this task)
  - `src/data/schema.ts`: split `Limit` (`schema.ts:597`, shared by `GeneralSchema` and `BotSchema`) into `GeneralLimit {afterRound?}` and `BotLimit {maxOwned?, afterRound?}`; `GeneralDef.copies?: Record<Id, number>` is new. (`afterSeconds` today; R2a/T010 adds `afterRound`, and T004 confirms what R2b kept.)
  - `data/generals.json`: each `truffleCellar.maxOwned 3` becomes `copies.truffleCellar 3`, and the Baron's Mortar limit goes.
  - `src/sim/state.ts` and `src/sim/ai/profiles.ts`: `AiWeight.maxOwned` stays for bots and is −1 for generals.
  - `src/sim/ai/controller.ts:162`: a general's buy check reads `freeCopies` only.
  - `src/sim/ai/counter.ts:270,285`: the pushed weights keep `maxOwned: -1`.
  - `data/bots.json` and `tools/lib/balance.ts` (`balance.ts:552-575`) keep `maxOwned` until T125 decides bots' copies.
- [ ] T036 [US1] Add the missing answer as a card with `enemyKit.counterCopies` in `draftMissingCounter` (`src/sim/ai/counter.ts`). A building sold for room returns its copy to the general's kit (§7.4) ⛔ §18.2 #42 (alternative: `kit.blueprintCopies`)
- [ ] T037 [US1] Make the general's and the bots' buying skip a card with no free copy in `src/sim/ai/controller.ts`, using `freeCopies` (§7.2, §7.4)
- [ ] T038 [US1] Cap the colony's plots in `battleConfig` (`src/run/flow.ts`): plots from relics, traits and the commander add to the sprawl count, never past the map's maximum (§4.6, §11.7) ⛔ §18.2 #50
- [ ] T039 [US1] Show copies across the UI in `src/ui/inspect.ts`, `src/ui/buildingInfo.ts`, `src/app/input.ts`, `src/ui/hud/top.ts` (all four as R2b leaves them) and `src/ui/screens/run.ts` (§10.2, §10.3, §10.4, §7.5, §8.2):
  - `src/ui/inspect.ts`: a building reads "copy 1 of 2";
  - `src/ui/buildingInfo.ts`: the tray tooltip lists the card's copies;
  - `src/app/input.ts`: Shift-click keeps planting while copies and gold last;
  - `src/ui/hud/top.ts`: the Intent panel's tooltip lists the general's kit with copies;
  - `src/ui/screens/run.ts`: the route's battle node shows each card's copies.
- [ ] T040 [US1] Refresh the goldens in `tests/golden` with `npm run golden -- update`, log the `enemyKit` and `generals.json` changes in `data/CHANGELOG-balance.md` (user-approved through #42), and say why in the commit (§15.5)

**Checkpoint:** `npm run verify` and `npx vitest run tests/unit/kit.test.ts tests/unit/run.test.ts tests/unit/ai.test.ts` pass, and `npm run test:browser` passes with the new `kit.test.ts`. A run plays with copies, and the general fills its colony.

## Phase 4: US2 — Run packs and the always-in set (P2)

**Goal:** each run's pool is the commander's core, the always-in set and 4 dealt packs; bans remove a pack's building (§8.4, §11.15). **Independent test:** US2's row in Stories.

- [ ] T041 [P] [US2] Write `tests/unit/packs.test.ts` (new) (§8.4, §11.15, §15.7 Kit row) ⛔ §18.2 #45, §18.2 #46, X9
  - the same seed deals the same 4 distinct packs;
  - over seeds 1–500 the area archetype is always in the pool and the Air pack is never dealt;
  - a banned pack building is skipped and the next pack is dealt (#46);
  - a pack T009 marked `dealable: false` (its building isn't in the roster, or its `requires` isn't met) is never dealt, and its relics join the open pool (A147);
  - Cordis's core overlap with Reaping still adds its relics;
  - the relic pool is the dealt packs' relics, plus the Sigil (with powers on), plus Hardy Spores and Second Flush (X9);
  - banning a core or always-in building is refused (#45);
  - an event's random draw never leaves the run's pool.
- [ ] T042 [P] [US2] Add route-map and summary cases to `tests/browser/runScreens.test.ts`: the route lists the run's 4 packs, each with its building and two relics, and the Underroot's ban list holds only bannable buildings (§8.2, §8.8, §10.5)
- [ ] T043 [US2] Add `packsPerRun` 4 to `data/balance.json` and `BalanceSchema` in `src/data/schema.ts` (§14.2)
- [ ] T044 [US2] Write `dealPacks(content, seed, bans)` in `src/run/packs.ts` (new) (§8.1 step 7, §8.4) ⛔ §18.2 #46, X9
  - Draw `packsPerRun` packs on call 1's stream.
  - Skip a pack with `dealable: false` (T009), or whose building is banned.
  - Return the dealt ids in draw order.
- [ ] T045 [US2] Add `packs: Id[]` to `RunState` and deal them in `createRun` (`src/run/runState.ts`). Rewrite `banProblem` so only pack buildings outside the commander's core can be banned (§8.1, §8.4, §14.4) ⛔ §18.2 #45
  - Fill `packs` from the seed in `loadRun`'s normalisation (`src/run/resume.ts`) whenever it's missing, whatever the save's version. No version bump, so a same-version save from between S2b and S4 gets packs too (A130).
- [ ] T046 [US2] Rewrite `draftPool` in `src/sim/create.ts` to take the run's packs (§8.4) ⛔ X9, §18.2 #46
  - `shared`: the always-in set and the dealt packs' buildings, minus the core and the bans.
  - `relics`: the dealt packs' relics, plus every relic in no pack, plus the relics of every `dealable: false` pack (the Air pack's while it `requires` flyers) (A173, A139).
  - Commander cores still enter whole (A140).
- [ ] T047 [US2] Pass `run.packs` through `runPool` and `runLibrary` in `src/run/flow.ts`, and make events draw only from the run's pool (§8.4, §8.7)
- [ ] T048 [US2] List only bannable buildings in the Underroot's ban list in `src/ui/screens/underroot.ts` (§8.1) ⛔ §18.2 #45
- [ ] T049 [US2] List the run's packs in `src/ui/screens/run.ts` (§8.2, §8.8, §10.5):
  - on the route map, each with its building's sprite and its two relic badges;
  - on the run bar, as a compact list;
  - on the summary.
- [ ] T050 [US2] Refresh the goldens in `tests/golden` with `npm run golden -- update` (run goldens move with the pool), log `packsPerRun` in `data/CHANGELOG-balance.md`, and say why in the commit (§15.5)

**Checkpoint:** `npm run verify` and `npx vitest run tests/unit/packs.test.ts` pass, and `npm run test:browser` shows the route's pack list.

## Phase 5: US3 — Augments, on both sides (P3)

**Goal:** an augment changes how a building's units play. It compiles onto its squads, shows on its card and squad, and the general gains augments by battle index (§11.13, §7.8). **Independent test:** US3's row in Stories.

*S5: augment patches*

- [ ] T051 [P] [US3] Write `tests/unit/augments.test.ts` (new) (§11.13, §5.3, §5.8) ⛔ §18.2 #38, §18.2 #39
  - Tough Caps: Slash ×0.6, HP ×0.85;
  - Spore Shield: arrows, darts and shells ×0.4, speed ×0.8, melee unchanged;
  - Spongy Cap: Crush ×0.6, Slash and Pierce ×1.25;
  - Sporebloom: burst 30, cloud 2.0 tiles for 6 s;
  - a property test that no augment changes `armor` or `damageType`;
  - Spore Shield Capguards' hits from Gill Archers read as *weak* (#39);
  - the `fielded` record splits augmented and plain squads of one unit;
  - a merged unit keeps its building's augments;
  - the general's augments compile the same way;
  - same seed, same hash.
- [ ] T052 [US3] Extend R2's per-squad stat tables into one `CompiledSquad` in `src/sim/compile.ts` (§14.1, §14.4) ⛔ §18.2 #37
  - Its parts, in §14.1's order (call 4): base unit, then the strain patch (none until M6), then the building's augment patches, then (S8) combo patches, then side modifiers, including R2's `rank` and `onLoam` selectors (sum adds, multiply muls, apply sets).
  - Compile per building type when the battle starts and after a draft pick; never per tick.
  - Copy the augments of the side's kit into `Library.augments` in `buildLibrary`: only their patches and triggers, not their name or text (R2-Q8).
  - This is A131's one structure; S8 adds combo patches to it.
- [ ] T053 [US3] Write `applyPatch`, `combinePatches` (call 4) and `takenMultFor(target, hit)` in `src/sim/augments.ts` (new). `takenMultFor` reads damage type, `projectile` and `melee` by call 3 (§14.2)
- [ ] T054 [US3] Apply `takenMult` in the damage formula and in the hit's effectiveness class, in `src/sim/hits.ts` and `src/sim/systems/combat.ts`. Merge-perk resistances stay out of the class (§5.3) ⛔ §18.2 #39
- [ ] T055 [US3] Apply the `burst` patch (damage, cloud radius, cloud seconds) in `burstUnit` in `src/sim/systems/clouds.ts` (§5.3, §11.13)
- [ ] T056 [US3] Write one `fielded` entry per unit type, tier and augment set, with the squad's augment ids, in R2a's Begin step in `src/sim/round.ts` (R2a) (§14.4)
- [ ] T057 [US3] Make a merged unit keep its building's augments in `src/sim/systems/merging.ts`, by call 8 (§5.6, §11.13) ⛔ §18.2 #38
- [ ] T058 [US3] Read `SideConfig.augments` into `SideState.augments` in `src/sim/create.ts`, and let a scenario side carry `augments` (`ScenarioSide` in `src/data/schema.ts`). Add `kit.augmentsPerBuilding` 1 to `data/balance.json` and `BalanceSchema`; `createBattle` rejects a side holding more on one type (§14.4, §15.2, §11.13) ⛔ §18.2 #38
  - Under #38's alternative, the key is 2, and T003 authors three augments per core archetype.
- [ ] T059 [US3] Add a bench case in `tools/lib/bench.ts`: two full colonies with augments on every spawner (§13.7, §15.4)
- [ ] T060 [US3] Refresh the goldens in `tests/golden` with `npm run golden -- update` (the library gains augments), log `kit.augmentsPerBuilding` (#38) in `data/CHANGELOG-balance.md`, and say why in the commit (§15.5)

*S6: triggers, statuses and target choice*

- [ ] T061 [P] [US3] Write `tests/unit/augmentTriggers.test.ts` (new), one case for each trigger-based augment (§11.13, §14.2):
  - Spore Pop: a 1.0-tile cloud for 3 s at 8 a second;
  - Holdfast: melee within 1.5 tiles turns to Capguards;
  - Sticky Darts: speed ×0.6 for 2 s;
  - Barbed Darts: one extra unit within 1 tile struck at full damage, attack interval ×1.3;
  - Red Charge: the first blow only;
  - Shockwave: every third blow;
  - Sunder: ×1.25 from every source for 4 s;
  - Fuse: waits for front-rank contact (call 5);
  - one case for each T003 pack-spawner augment;
  - same seed, same hash.
- [ ] T062 [P] [US3] Add target-order and status cases to `tests/unit/combat.test.ts` (§5.2) ⛔ R3-Q5
  - Your own combo's priority comes first, then the enemy's taunt, then the preferred class, then the nearest.
  - A taunter counts as a preferred-class candidate for stickiness.
  - A splash hits the other units in its radius, not the target, through the matrix.
  - Two slows refresh the timer and don't stack.
- [ ] T063 [US3] Add `UnitState.statuses` and `UnitState.blows` in `src/sim/state.ts`, both reset when a clash starts, and the `augmentActed {side, id, x, y}` event (§14.4, §14.5)
- [ ] T064 [US3] Run unit triggers in `src/sim/augments.ts` (§14.2):
  - the triggers: `death`, `hit`, `attack` (counting `blows` for `everyNth` and `firstInClash`), `muster`, `burst`;
  - the actions: `cloud`, `status`, `strikeExtra`, `splash`, `setOffBursts`, and gold through R2-Q20's path;
  - emit `augmentActed` where an action fires.
- [ ] T065 [US3] Slot `taunt` and `targetPriority` into §5.2's target choice in `src/sim/systems/targeting.ts`, by R3-Q5's order (§5.2) ⛔ R3-Q5
- [ ] T066 [US3] Hold `holdUntilContact` squads behind the front rank until contact (call 5), and apply `slow`, in `src/sim/systems/movement.ts`. A second slow refreshes the timer and doesn't stack (§11.13) ⛔ R3-Q5
- [ ] T067 [US3] Add the remaining combat effects in `src/sim/systems/combat.ts` (§5.3, §11.13) ⛔ R3-Q5
  - `sunder` on damage taken;
  - `splash` and `strikeExtra` by R3-Q5's splash rule: they hit the other enemy units in the radius, not the target, through the matrix, each taking its source's hit class (call 3);
  - `ignorePin` skips pinning's attack slowdown (`pinSkips`).
- [ ] T068 [US3] Place death clouds (Spore Pop, Spore Trail) through `addCloud` in `src/sim/systems/clouds.ts`, with the dying unit's squad as the source (§5.3)
- [ ] T069 [US3] Gate on the bench: `npm run bench` with both colonies full and every augment active stays inside §13.7's budget. Add the case to `tools/lib/bench.ts` (G11), and record the numbers in `docs/balance-backlog.md` (§13.7) (A131)
- [ ] T070 [US3] Refresh the goldens in `tests/golden` with `npm run golden -- update` if they moved, and say why in the commit (§15.5)

*S7: the general's augments*

- [ ] T071 [P] [US3] Write the general's augment cases in `tests/unit/run.test.ts` (§7.8, §7.7) ⛔ R3-Q3
  - The Baron in battle 1 has no augments.
  - Battle *i* has *i* − 1, all on spawner cards and within `augmentsPerBuilding`.
  - An elite adds 1; Veteran adds 1 to each army card that has room.
  - The boss has 7 cards and 4 augments.
  - A kit with too few eligible augments skips the rest (A125).
  - The rarity mix over 500 seeds matches the draft weights for that battle index (A144).
  - The kit is the same on two paths to the same index.
  - In a run without the Brood pack, the general never gains a Morel Warren (#48, A132).
- [ ] T072 [P] [US3] Add a case to `tests/unit/counters.test.ts`: against Capguards with Spore Shield, the general skips the Gill Archer Nest and reaches for its next answer (a pierce melee card, or the next kind) (§7.4) ⛔ §18.2 #41
- [ ] T073 [US3] Build the general's augments and kit sources in `generalKit` and `bossCounters` (`src/run/flow.ts`) (§7.8, §11.15, §11.11) ⛔ R3-Q3, §18.2 #48, §18.2 #49
  - The count: `enemyKit.augmentsPerBattle` × (*i* − 1), `eliteAugments` at an elite, `bossAugments` for the boss, then Veteran's `augments`.
  - Each draw: roll a rarity by `rarityWeights` for the battle index (+`eliteRareBonus` at an elite); pick uniformly among eligible augments for its spawner cards at that rarity (restricted to `GeneralDef.augments` when set); step down, then up; skip when none is eligible.
  - Write the draw as a pure `drawGeneralAugments(lib, kit, count, battleIndex, elite, rng)` in `src/sim/kit.ts` (R2a), so T125's single battles can use it (§13.2).
  - The stream: `seedStream(run.seed, 'ai', 1000 + index)`.
  - Sources: filter extras and boss counters by call 7. A card it adds that its weights don't list gets weight 1.
- [ ] T074 [US3] Replace the general's upgrade data in `data/balance.json`, `data/elites.json`, `src/data/schema.ts` and `data/generals.json` (§11.1, §7.7, §14.2):
  - `data/balance.json`: `enemyKit.upgradesPerBattle`, `eliteUpgrades` and `bossUpgrades` become `augmentsPerBattle` 1, `eliteAugments` 1 and `bossAugments` 4;
  - `data/elites.json`: Veteran's `upgradeLevels` becomes `augments` 1;
  - `src/data/schema.ts`: `EliteDef.augments`, with `upgradeLevels` and the old keys removed;
  - `data/generals.json`: `augments` is set only where a general should prefer some.
- [ ] T075 [US3] Rate each counter-set building against the player's fielded squads as compiled with their augments in `src/sim/ai/counter.ts` (§7.4) ⛔ §18.2 #41
  - Skip a building whose combined multiplier on the dominant fielded unit falls below 1.0.
  - If the whole set is skipped, take the next kind by score.
  - The missing-answer rule then adds the cheapest building that isn't skipped.
- [ ] T076 [US3] Show augment icons, the general's included, with T016's placeholders, in `src/render/preview.ts` (R2a), `src/ui/hud/tray.ts` (as R2b leaves it), `src/ui/hud/top.ts` (as R2b leaves it) and `src/ui/screens/run.ts` (§10.2, §10.4, §7.5, §8.2):
  - on each squad in the formation preview (`src/render/preview.ts` (R2a));
  - on tray cards (`src/ui/hud/tray.ts`);
  - in the Intent panel's kit tooltip (`src/ui/hud/top.ts`);
  - on the route's battle node (`src/ui/screens/run.ts`).
- [ ] T077 [US3] Refresh the goldens in `tests/golden` with `npm run golden -- update`, log the `enemyKit` and `elites.json` changes in `data/CHANGELOG-balance.md`, and say why in the commit (§15.5)

**Checkpoint:** `npm run verify`, `npx vitest run tests/unit/augments.test.ts tests/unit/augmentTriggers.test.ts tests/unit/counters.test.ts`, and `npm run bench` inside budget. A battle-3 general shows augment icons on its squads in planning.

## Phase 6: US4 — Combos (P4)

**Goal:** buildings in front of, behind or beside each other link, the link shows while placing and in planning, and the clash plays it (§11.14, §4.6). **Independent test:** US4's row in Stories.

*S8: combos in the sim*

- [ ] T078 [P] [US4] Write `tests/unit/combos.test.ts` (new) (§11.14, §4.6, §15.7 Kit row) ⛔ R3-Q5, §18.2 #40, §18.2 #38
  - `inFront`, `behind` and `beside` each detected on Bogwater Hollow and Twin Roots;
  - a corner counts only with `side.comboCorners`, as `beside` and as `inFront` or `behind` by rank (R3-Q5);
  - no combo crosses lanes;
  - a second partner doesn't stack (#40);
  - one case per combo:
    - Shield Wall's archers aren't pinned;
    - Spotted Screen's enemy ranged units shoot the Knight first;
    - Sundering Volley shoots the nearest Hammercap's target;
    - Hunting Pack picks knitting units first and sees 2 tiles farther;
    - Truffle Hunters pays 2 gold a death through R2-Q20's path;
    - Chain Burst sets off Bursters within 1.5 tiles;
    - Anvil's min range is 0.5 only with a Capguard within 2 tiles;
    - the Vault's link fields +1 for a spawner beside it, not behind it;
  - a merged unit keeps a combo only if every parent had it (#38);
  - `formationOf` and `mergePreview` count `squadAdd`.
- [ ] T079 [P] [US4] Write the rule scenario `data/scenarios/combo-shield-wall.json` (new): a Gill Nest behind a Capguard Hall against Sporelings, asserting the archers fire unpinned and the round's winner (§15.7 Rule scenarios)
- [ ] T080 [P] [US4] Add a relic audit to `tests/unit/effects.test.ts`: every relic in `data/relics.json` has its §11.7 v2 effect, uses no retired stat, and sits in at most one pack (§11.7, §16 R3 Relics)
- [ ] T143 [P] [US4] Add the combo term's cases to `tests/unit/ai.test.ts` (§7.3) ⛔ R3-Q5
  - A general whose kit holds a Capguard Hall and a Gill Nest, with the Hall planted at the front rank, file 2, plants the Nest behind it (Shield Wall, +3).
  - With the term at 0, it plants the Nest by §7.3's base score alone.
- [ ] T081 [US4] Write `neighbors(plots, plot)`, `combosAt(state, side, buildingId, plot)` and `resolveCombos(state, side)` in `src/sim/combos.ts` (new). The relations follow §4.6, and corners count only with `comboCorners` (§11.14, §14.6) ⛔ §18.2 #40, R3-Q5
  - A combo is active while both buildings are planted.
  - A squad gets each combo once.
- [ ] T082 [US4] Wire combos into the round and the formation in `src/sim/round.ts` (R2a), `src/sim/compile.ts`, `src/sim/formation.ts` (R1) and `src/sim/state.ts` (§14.4, §14.6 planning step 3, §4.6):
  - at Begin, record `SquadState.combos` and add combo patches to each `CompiledSquad` (`src/sim/round.ts` (R2a), `src/sim/compile.ts`);
  - count `squadAdd` in `formationOf` and `mergePreview` (`src/sim/formation.ts` (R1)), so the preview equals the arrival;
  - add `SquadState.combos` and the `comboActed` event to `src/sim/state.ts`.
- [ ] T083 [US4] Add the combo-only effects in `src/sim/systems/targeting.ts`, `src/sim/systems/combat.ts`, `src/sim/systems/clouds.ts` and `src/sim/augments.ts` (§11.14):
  - `targetPriority: 'knitting' | 'partnerTarget'` in `src/sim/systems/targeting.ts`;
  - `whilePartnerWithin` (Anvil) in `src/sim/systems/combat.ts`;
  - `setOffBursts` (Chain Burst) in `src/sim/systems/clouds.ts`;
  - Truffle Hunters' gold in `src/sim/augments.ts`.
- [ ] T084 [US4] Make a merged unit keep a combo only if every parent squad had it, and show the result in the merge preview, in `src/sim/systems/merging.ts` (§5.6) ⛔ §18.2 #38
- [ ] T085 [US4] Build the Rhizome Vault's effect as T012's `rhizomeFeed` link, and lift R2b's `requires` gate on the Vault in `data/factions/velvet-bloom/buildings.json` and `src/data/schema.ts`, so it joins the Elder Grove pack and Armilla's core (§4.4, §11.2) (A124, A083)
  - Report the link's worth per spawner in `docs/balance-backlog.md`: +1 Sporeling is about 14 gold, +1 Amanita Knight about 130 (A085). The user decides whether to narrow `a`.
- [ ] T086 [US4] Give Mycorrhizal Link its v2 effect, `side.comboCorners` set to 1, in `data/relics.json`, and lift R2b's `requires` gate on it (§11.7) (A138, A083)
- [ ] T087 [US4] Add `ai.comboPlacementBonus` (3) per combo a plot would make (from `combosAt`) to the placement score in `src/sim/ai/formationScore.ts` (R2a), for the general and for bots that place by §7.3's rule. Add the key to `data/balance.json` and `BalanceSchema` in `src/data/schema.ts`, so T143 can set it to 0 (§7.3) ⛔ R3-Q5
- [ ] T088 [US4] Gate on the bench: `npm run bench` with two full colonies, every augment and the densest combos active (the Vault's +1 included) stays inside §13.7's budget. Update the case in `tools/lib/bench.ts`, and record the numbers in `docs/balance-backlog.md` (§13.7) (A131)
- [ ] T089 [US4] Refresh the goldens in `tests/golden` with `npm run golden -- update`, log the Vault, Mycorrhizal Link and `ai.comboPlacementBonus` changes in `data/CHANGELOG-balance.md`, and say why in the commit (§15.5)

*S9: combos on screen*

- [ ] T090 [P] [US4] Add a ghost case to `tests/browser/kit.test.ts`: selecting a Gill Nest and hovering the plot behind a planted Capguard Hall lights the Hall with Shield Wall's icon, and the ghost's tip names the combo (§10.2)
- [ ] T091 [P] [US4] Add `--hover <x,y|selector|plot:lane,rank,file>` to `tools/screenshot.ts`, moving the mouse after the clicks and before the capture, and document it in §15.6 (§15.6)
  - `plot:0,back,2` names a plot as §4.6 does: the lane counted from 0, the rank `front`, `back` or `third`, the file from 1. The tool resolves it to page pixels through a new `plotCentre(lane, rank, file)` on `window.__GAME__` in `src/app/debugBridge.ts` (exposed with `?test=1`), so the target is exact.
- [ ] T092 [US4] Light each planted neighbor the ghost would link with, show the combo's icon on it, and list the combos in the ghost's tip, in `src/app/battleView.ts` and `src/render/renderer.ts` (both as R2b leaves them), from `combosAt` (§10.2, §10.4)
- [ ] T093 [US4] Join linked buildings by a hypha, with the combo's icon at its middle, in planning, on both sides, in `src/render/preview.ts` (R2a) (§10.4)
- [ ] T094 [US4] Flash an augment's or combo's icon where it acts on `augmentActed` and `comboActed` in `src/render/effects.ts` (as R2b leaves it) (§10.4, §13.6)
- [ ] T095 [US4] List a card's augments and the combos it can make in the tray tooltip (`src/ui/buildingInfo.ts`, as R2b leaves it), and a building's combos and augments in the inspect panel (`src/ui/inspect.ts`, as R2b leaves it) (§10.2, §10.4)

**Checkpoint:** `npm run verify`, `npx vitest run tests/unit/combos.test.ts tests/unit/ai.test.ts tests/unit/scenarios.test.ts`, `npm run test:browser` and `npm run bench` pass. A Gill Nest's ghost behind a planted Capguard Hall lights the Hall.

## Phase 7: US5 — Four card types, events and the Grove; upgrade tracks gone (P5)

**Goal:** drafts, spoils, events and the Grove deal blueprints, copies, augments and relics; the run screens show the kit; nothing of the upgrade tracks remains (§8.3, §8.6, §8.7, §11.6). **Independent test:** US5's row in Stories.

*S10: drafts with four card types*

- [ ] T096 [P] [US5] Rewrite `tests/unit/drafts.test.ts` (§8.3, §15.7 Run row) ⛔ §18.2 #38, §18.2 #43, R3-Q9
  - each card type is generated and applied;
  - the small-kit weights;
  - no copy offered at `maxCopies`;
  - no augment for a building outside the kit, an owned augment, or a type at `augmentsPerBuilding`;
  - no relic outside the run's pool;
  - core blueprints weigh ×2;
  - a common roll never yields an uncommon augment (call 2; dropped under R3-Q9's alternative);
  - offers are deterministic per seed, battle, draft and state;
  - spoils and the elite's relic-only pick;
  - an augment picked in planning shows in the formation preview at once.
- [ ] T097 [US5] Rewrite `src/sim/draft.ts` for four card types (§8.3) ⛔ §18.2 #37, §18.2 #38, §18.2 #43, R3-Q9
  - `TYPES` are `blueprint`, `copy`, `augment` and `relic`, with prefixes `bp`, `copy`, `aug` and `relic`, read by `parseCard` and `cardId`.
  - `candidates` per type, by §8.3's exclusions.
  - `typeWeights` over the four types, keeping the small-kit rule.
  - `generateOffer` by call 2. Under R3-Q9's alternative it keeps today's order (type, then rarity).
  - `applyCard`: blueprint → a card with `blueprintCopies`; copy → +`copyCopies` up to the cap; augment → attached to the type for the run; relic → owned.
  - A pick recompiles.
  - The augment cap is T058's `kit.augmentsPerBuilding`.
- [ ] T098 [US5] Set `draft.typeWeights` to blueprint 35, copy 20, augment 25 and relic 20 in `data/balance.json` and `BalanceSchema` (`src/data/schema.ts`) (§8.3, §11.1)
- [ ] T099 [US5] Set the always-in set's rarity in `data/factions/velvet-bloom/buildings.json`: the area archetype common, the Hammercap Forge common, the Amanita Lodge uncommon (§8.3, §8.4) ⛔ R3-Q4
  - The Burster Pod's rarity is in its building entry once R2 moved it out of `src/data/proto.ts`.
  - Under R3-Q4's alternative, weight always-in blueprints ×2 in `draft.ts` instead.
- [ ] T100 [US5] Add greedy scores for copy and augment cards in `src/sim/ai/draftPolicy.ts` (§15.2)
  - A copy scores 6 + 2 × the building's weight.
  - An augment scores 8 + 2 × its building's weight, or 1 for a building with no weight.
- [ ] T101 [US5] Generate spoils and the elite's relic-only pick with the same generator, record each card with its type in `run.cards`, and keep `run.augments` in step, in `src/run/flow.ts` (`spoilsPick`, `spoilsReroll`, `finishBattle`) (§8.6)
- [ ] T102 [US5] Update the run autoplay's draft and spoils picks for the new types in `src/run/auto.ts` (§15.2)
- [ ] T103 [US5] Show the new card types in `src/ui/cards.ts` (as R2b leaves it) (`TYPE_LABEL`, `TYPE_ICON`, `cardText`) and `src/ui/draftOverlay.ts` (§10.2, §10.5):
  - a copy reads "+1 copy of <building>";
  - an augment shows its icon, name, text and the building it changes.

  After an augment pick, refresh the planning preview from the recompiled side.
- [ ] T104 [US5] Refresh the goldens in `tests/golden` with `npm run golden -- update`, log `typeWeights`, the rarities and the offer order in `data/CHANGELOG-balance.md` (user-approved through R3-Q4 and R3-Q9), and say why in the commit (§15.5)

*S11: the run screens show the kit*

- [ ] T105 [P] [US5] Add cases to `tests/browser/runScreens.test.ts` (§8.8, §10.5):
  - a draft card names its type and has an "owned" line;
  - the run bar's kit shows copies and augment icons;
  - the summary lists cards drafted by type and the end kit with copies, augments and packs;
  - an event result names the card or augment gained;
  - the relics-and-augments popover lists augmented buildings.
- [ ] T106 [US5] Add each draft and spoils card's "owned" line in `src/ui/cards.ts`: the copies you own for a blueprint or copy, the building an augment changes, with its icon, for an augment (§10.2, §10.5)
- [ ] T107 [US5] List every augmented building in the relics-and-augments popover (`src/ui/hud/kit.ts`), with each augment's icon and words. The chip counts relics and augments, and drafted cards join it live (§10.2)
- [ ] T108 [US5] Update `src/ui/screens/run.ts` (§10.5, §8.8):
  - the run bar's kit shows each card with its copies and augment icons;
  - the summary shows cards drafted by type and the end kit with copies, augments and packs;
  - the event result shows the card or augment gained, from the run before and after.

*S12a: events and the Grove*

- [ ] T109 [P] [US5] Rewrite the event and Grove cases in `tests/unit/run.test.ts` (§8.7):
  - Spore Merchant removes a non-starter card with all its copies and grants 2 chosen augments, and refuses before charging when fewer than 2 are eligible;
  - Quiet Clearing's forage draws a random augment for a kit building from the `events` stream, deterministically;
  - Twin Spores adds a chosen copy within the cap, or a random common relic;
  - the Grove's graft offers 1 of 3 augments and is unlit when none is eligible;
  - Leave stays lit, even at full lives with no eligible augment, so the Grove never dead-ends (R2-Q21) (A082).
- [ ] T111 [US5] Add `gainCopy {pick: 'choose'}` and `augment {count, pick, ownedOnly?}` to `RunEffectSchema` in `src/data/schema.ts` (§14.2)
  - `upgrade` stays in the schema until T116, so a saved run with a pending `upgrade` effect still parses until T117 migrates it.
- [ ] T112 [US5] Rewrite Spore Merchant, Quiet Clearing's forage and Twin Spores with the new effects in `data/events.json` (§8.7)
- [ ] T113 [US5] Rewrite the event and Grove logic in `src/run/flow.ts` (§8.7, §8.9):
  - `groveChoose`'s graft becomes 1 of 3 augments;
  - `resolvePending`, `outcomeOptions`, `promptAnswer` and `outcomeAvailable` handle copies and augments, checking the cap and ownership before charging a cost;
  - `Prompt.optionKind` gains `copy` and `augment`.

  The upgrade branches stay until T116, for saves made before this session.
- [ ] T114 [US5] Update the autoplay's event values and Grove order (a life if hurt, else graft, else leave) in `src/run/auto.ts` (§8.7)
- [ ] T115 [US5] Show copy and augment choices in events and the Grove in `src/ui/screens/run.ts`, with the graft unlit when nothing is eligible (§8.7, §10.5)
- [ ] T144 [US5] Log the event rewrites in `data/CHANGELOG-balance.md`. Refresh the goldens in `tests/golden` with `npm run golden -- update` if they moved, and say why in the commit (§15.5)

*S12b: the upgrade tracks retire*

- [ ] T110 [P] [US5] Add cases to `tests/unit/migrate.test.ts` (R2b) (§8.9) ⛔ R3-Q6
  - A run saved after S2b loads with its upgrade levels dropped and a notice naming them.
  - A run saved in a pending upgrade prompt resumes in a 1-of-3 augment choice, without paying again.
  - A run saved in R2's format chains both steps.
  - An unreadable save still returns `{kind: 'unreadable'}`, so the title warns before overwriting it (A084).
- [ ] T116 [US5] Retire the upgrade tracks from the data, code and tests, starting with `data/upgrades.json` (§11.6, §16 R3 Done when):
  - The files: every file `grep -rliI upgrade src tools tests data` lists outside `data/CHANGELOG-balance.md` and the `migrate*` files, as R2b left them. Today that's:
    - data: `data/upgrades.json` (deleted), `data/sprites/ui.json` (`i-upgrade`), and `data/balance.json`, `data/elites.json` and `data/events.json`, which T074, T098 and T112 already rewrote;
    - src: `src/app/run.ts`, `src/app/tips.ts`, `src/data/registry.ts`, `src/data/schema.ts`, `src/run/auto.ts`, `src/run/flow.ts`, `src/run/runState.ts`, `src/sim/ai/draftPolicy.ts`, `src/sim/compile.ts` (`lib.upgrades`, line 180), `src/sim/create.ts`, `src/sim/draft.ts`, `src/sim/effects.ts`, `src/sim/state.ts`, `src/sim/systems/combat.ts`, `src/ui/buildingInfo.ts`, `src/ui/cards.ts`, `src/ui/draftOverlay.ts`, `src/ui/help.ts`, `src/ui/hud/kit.ts`, `src/ui/hud/top.ts`, `src/ui/screens/run.ts` (`upgradeText`), `src/ui/styles.css`, `src/ui/words.ts`;
    - tools: `tools/validate-data.ts`;
    - tests: `tests/browser/clarity.test.ts`, `hud.test.ts`, `resume.test.ts` and `runScreens.test.ts`; `tests/unit/commanders.test.ts`, `data.test.ts`, `drafts.test.ts`, `run.test.ts`, `teachingText.test.ts` and `words.test.ts`.
  - What goes:
    - `UpgradeTrackSchema`, and `upgrade` in `CardType` and in `RunEffectSchema` (`src/data/schema.ts`);
    - `Content.upgrades` (`src/data/registry.ts`);
    - `Library.upgrades`, `Loadout.upgrades` and `SideConfig`/`SideState.upgrades` (`src/sim/state.ts`);
    - `RunState.upgrades` (`src/run/runState.ts`);
    - the upgrade branch of `loadoutBundles` (`src/sim/effects.ts`) and the upgrade candidates (`src/sim/draft.ts`);
    - `upgradeable`, `withUpgrade`, `afterUpgrade` and `recoverPendingChoice`'s upgrade branch (`src/run/flow.ts`);
    - `upgradeText` and `UPGRADES` (`src/ui/words.ts`), and the upgrade branches in `src/ui/cards.ts` and `src/ui/hud/kit.ts`.
  - Delete the Help and tip text about upgrades in `src/ui/help.ts` and `src/app/tips.ts`. R4b rewords the rest.
  - Rewrite the tests that read them.
- [ ] T117 [US5] Bump `RUN_VERSION` by one in `src/run/runState.ts` and add the step to `src/run/migrate.ts` (R2b) (§8.9, §13.8) ⛔ R3-Q6
  - Drop `upgrades` with a notice listing the levels.
  - Turn a pending `upgrade` effect into `augment {count, pick: 'choose'}`, or into nothing with a notice when none is eligible.
  - Bump the battle save version in `src/run/resume.ts` again, since `SideConfig.upgrades` goes.
  - The keys don't change.
- [ ] T118 [US5] Check that `grep -rniI upgrade src tests tools data --exclude=CHANGELOG-balance.md --exclude='migrate*'` finds nothing. Only `src/run/migrate.ts` (R2b), `tests/unit/migrate.test.ts` (R2b) and `tests/migrateFixtures.ts` may name the old field, since they read old saves. Refresh the goldens in `tests/golden` with `npm run golden -- update` and say in the commit that the upgrade tracks retired (§16 R3 Done when, §15.5)

**Checkpoint:** `npm run verify`, `npm run test:browser`, and T118's grep finds nothing. A human can play a whole run whose kit has copies, augments, combos and packs.

## Phase 8: US6 — Tools that measure the kit (P6)

**Goal:** the card check, a committing drafter and build-diversity numbers, and the strict counter bar with augment and combo builds (§16 R3 Tools, §12.2, §12.3). **Independent test:** US6's row in Stories.

*S13: the card check and the run numbers*

- [ ] T119 [P] [US6] Write `tests/unit/draftPolicy.test.ts` (new) (§15.2):
  - the `commit` policy is deterministic for a seed;
  - it prefers a copy of an owned card, then an augment for an owned building, then a card from a pack it already drew from, over an unrelated blueprint;
  - `greedy` and `random` are unchanged.
- [ ] T120 [US6] Add the `commit` draft policy in `src/sim/state.ts`, `src/sim/ai/draftPolicy.ts`, `src/run/auto.ts` and `tools/sim.ts` (§15.2) (A134)
  - `src/sim/state.ts`: `commit` joins the `DraftPolicy` type.
  - `src/sim/ai/draftPolicy.ts`: `commitScore(card, side)`, beside `greedyScore`:
    - a copy of an owned card: 12 + 2 × its copies;
    - an augment for an owned building: 10 + 2 × that building's copies;
    - a blueprint from a pack it already drafted from: 8 + its build weight;
    - any other blueprint: 2 + its build weight;
    - a relic: `RELIC_SCORE` for its rarity − 2;
    - each blueprint drafted adds 2 to that building's build weight for the rest of the run;
    - ties go to the earlier card.
  - `src/run/auto.ts`: the autoplay passes `commit` through.
  - `tools/sim.ts`: `--auto-draft commit` (add it to `DRAFT_POLICIES`).
  - Background only: `docs/archive/v1/ideas/after-the-rework.md`, Tier 1's table, row B8.
- [ ] T121 [US6] Record offers: emit `draftOffered {side, cards}` from `openDraft` and rerolls in `src/sim/draft.ts`, declared in `src/sim/state.ts`. Collect in-battle and spoils offers, rerolls per draft and gold left at each Begin into `RunResult` in `src/run/auto.ts` (§14.5) (A137)
- [ ] T122 [US6] Add the diversity numbers to `--checks runs` in `tools/lib/engagement.ts` and `tools/experiment.ts`. `runEndings` takes a draft policy and runs `commit` beside `random` (§16 R3 Tools and step 4) ⛔ R3-Q7
  - Kit variety: the end kit's entropy per commander, and distinct end kits.
  - The top building's share of damage per run, from `BattleRecord.damageByBuilding`.
  - How often each card is offered and owned.
  - Runs owning a `rulesChanging` card at the end (A128).
  - Runs owning the area archetype by battle 2 (A135).
  - Unspent gold and rerolls per draft (A137).
  - Commit against random, in runs won.
- [ ] T123 [US6] Write the card check, `--checks cards`, in `tools/lib/cards.ts` (new), registered in `tools/experiment.ts` and run on `tools/lib/pool.ts`'s workers (§16 R3 Tools, §12.2) ⛔ R3-Q7
  - Cards: every card in the pool: blueprints, copies, augments and relics.
  - The player's side holds the commander's 3 starters at `kit.starterCopies`, plus the card under test. It's built through `battleConfig` (`src/run/flow.ts`) from a synthetic RunState (`createRun` for the commander and seed, with `path` set so the next battle is that general at the cell's battle index). So the general gets its §7.8 kit with copies and augments (T034, T073).
  - A blueprint adds the card at `kit.blueprintCopies`. The bot gives it build weight 2 when `bot:balanced`'s weights don't list it.
  - A copy card is tested as +1 copy of each starter in turn, and the results averaged.
  - An augment for a starter attaches to it. An augment for a building outside the kit comes with that blueprint at 1 copy, and the blueprint's own worth is subtracted.
  - A relic is owned from battle 1's start.
  - In-battle drafts are off: set `flags.drafts` false on the config `battleConfig` returns, as single battles have it by default (`DEFAULT_FLAGS` in `src/sim/create.ts`). The card under test is then the only change to the kit.
  - Play: `bot:balanced` with each commander against Mold, the Baron and the Blightwright, at call 11's battle indices, 20–30 seeds a cell. Nothing here depends on T125's single-battle rule.
  - Report: the change in battle win rate against no card, a card-size table and a histogram.
  - Write `reports/experiments/<label>.json`.

*S14: guardrails under copies, augments and combos*

- [ ] T124 [P] [US6] Add round-form cases to R2a's slow counter-matrix file, proposed `tests/slow/counters.test.ts` (R2a) (§12.3) ⛔ §18.2 #51
  - G3 and G12 run with mono bots at the copy cap.
  - G12's builds include the augment and combo builds from T126.
  - A flipped build passes only if it still has an answer.
- [ ] T125 [US6] Apply the single-battle copy rule in `src/sim/create.ts` (`makeConfig`), and fill a mono bot's other plots by `bot:balanced`'s weights in R2a's bot planner (`src/sim/ai/controller.ts`) (§12.2, §12.3) (A145, A196) ⛔ §18.2 #51
  - A general's cards stay the whole roster, bought by its listed weights (R2-Q4, call 7). Its copies come from `generalCopies` (T034) over that roster's weighted army cards, with `openPlots` the general's plots in the config. Its augments come from `drawGeneralAugments` (T073) on `seedStream(config.seed, 'ai', 1000 + battleIndex)`, so the planning stream doesn't move.
  - A bot gets its opener's distinct cards ×2 and every other roster card ×1.
  - A mono bot gets its card at `kit.maxCopies` and every other roster card ×1, and fills the plots past its copies by `bot:balanced`'s weights.
  - Under #51's literal reading ("every side holds what a run would at that battle index"), the general plays §7.8's kit instead, so G4, G5, G6 and G8's setups change. List those guardrails, and what changes in each, in `docs/balance-backlog.md` for the user at T140.
  - Under #51's alternative, reference bots keep unlimited copies.
- [ ] T126 [US6] Add `BotDef.augments` in `src/data/schema.ts` and, in `data/bots.json` (§12.3 G12, §11.13):
  - a mono bot for each rare flipper with its augment (for example `bot:mono:capguardHall+sporeShield`);
  - an even-pair bot for each combo its formation makes (Hall and Nest for Shield Wall).
- [ ] T127 [US6] Feed augmented and combo squads into the clash check (`--checks clash` as R2b/T050 leaves it, playing each clash through `playRoundClash` (R2a/T116), with armies from R1's builder in `tools/lib/clash.ts`) and the counter matrix (`evaluateCounters` in `tools/lib/balance.ts`). Report each flipped build's win rate with and without its augment, and against the adaptive general against adaptation off (§16 R3 step 3, §12.2)
- [ ] T128 [US6] Add the area archetype's intended edges from §11.4's counter graph to `G2.intendedEdges` in `data/balance-targets.json`: `["burster", "sporeling"]` and `["gillArcher", "burster"]` (unit ids as R2 named them). They're report-only until measured, with units fighting without augments or combos. Log it in `data/CHANGELOG-balance.md` (§12.3 G2, §11.4)
- [ ] T129 [US6] Re-measure G8, G14 and G15 under the general's copies and augments, with fixed-weight bots and with R2a's answer policy (X7), in `tools/lib/balance.ts` and `tools/lib/run.ts` (§12.3) (A122, A146, A206)
  - Add to G14's report: the general's unspent gold per round, a Twin Roots battle-1 slice, and identical replayed clashes per round (a round whose plans match the last one's).
- [ ] T130 [US6] Update G3's mono definition and G12's builds in `data/balance-targets.json` per #51 (§12.3) ⛔ §18.2 #51
- [ ] T145 [US6] Propose any G3, G8 or G14 band change, with its numbers, in `docs/balance-backlog.md`. It lands in data only after T140's OK, as a follow-up commit in S15 (T147) (§12.3, §12.4)
- [ ] T146 [US6] Refresh the goldens in `tests/golden` with `npm run golden -- update` (single battles now hold copies, #51), log the `data/bots.json` bots (T126) and G3's and G12's new definitions (T130) in `data/CHANGELOG-balance.md`, and say why in the commit (§15.5)

**Checkpoint:** `npm run test:slow` runs to completion; `npm run experiment -- --checks counters,cards,runs --commander all --power-policy auto --runs 200` writes its reports.

## Phase 9: Polish and verification

- [ ] T131 Stage the four browser checks in `src/data/schema.ts`, `src/sim/draft.ts` and four new scenarios under `data/scenarios` (§15.6) (A143, A155):
  - add `draftOffer?: Id[]` to `ScenarioSide` (test staging only) in `src/data/schema.ts`, honoured by `openDraft` in `src/sim/draft.ts`;
  - write `data/scenarios/r3-draft.json` (new): round 3's planning with a 4-card draft, one card of each type;
  - write `data/scenarios/r3-tray.json` (new): copies partly planted;
  - write `data/scenarios/r3-combo.json` (new): on Bogwater Hollow, a Capguard Hall planted at the front rank, file 2, with a Gill Nest in the player's kit, a free copy and the gold to plant it. Selection is UI state, so T138 selects the Nest with `--click`;
  - write `data/scenarios/r3-general-augments.json` (new): the general holding Spore Shield and Tough Caps in planning, since battle 1's general holds none (A155).
- [ ] T132 Add R3 golden replays in `tests/golden` with `tools/golden.ts`: copies (a run kit at its limits), augments (both sides), combos (Shield Wall and the Vault's link), and run packs (a seeded run's pool). Then `npm run golden -- update` (§15.5)
- [ ] T133 Step 1: run `npm run verify`. Check `tests/unit/` covers each item in step 1's list (§16 R3 verification 1):
  - copy limits and returns, and the starting kit (T018);
  - augment application, the general's included (T051, T061);
  - combo detection for each position (T078);
  - pack dealing: deterministic, the swarm answer always present, bans applied (T041);
  - the general's copies and its augments by battle index (T031, T071);
  - draft generation for each card type (T096).
- [ ] T134 Step 2: check the goldens in `tests/golden` are refreshed and each commit that moved them says why (§16 R3 verification 2)
- [ ] T135 Step 3: run the clash check and the counter matrix with augment and combo builds, `npm run experiment -- --checks clash,counters`, and record the numbers in `docs/balance-backlog.md` (§16 R3 verification 3) (A196)
  - The strict counter bar passes.
  - Each flipped build wins only with what it invested.
  - Each flipped build's win rate drops against the adaptive general, as G8 measures.
  - Compare G3 and G12 at the copy cap with R1's copy-free readings in `docs/balance-backlog.md`. If #7 cut a squad (the Burrow's) to tame mono, report the size the copy-capped build allows, and put the restore to the user at T140 (A196).
- [ ] T136 Step 4: run `npm run experiment -- --checks cards,runs --commander all --power-policy auto --runs 200` and record the numbers in `docs/balance-backlog.md` (§16 R3 verification 4) (A085)
  - A third or more of uncommon and rare cards are worth +5 points, and none more than +20 (per battle, R3-Q7).
  - The commit drafter wins at least 10 points more runs than random.
  - A `rulesChanging` card is owned at the end of at least 30% of runs.
  - The top building's damage share is below about 60%.
  - Also report the Vault per spawner, rerolls and unspent gold.
  - A miss is reported with its numbers, not tuned away (`.claude/rules/balance.md`).
- [ ] T137 Step 5: run `npm run test:slow` and `npm run bench`, and record the full-colony numbers with augments and combos against §13.7 in `docs/balance-backlog.md` (§16 R3 verification 5)
- [ ] T138 Step 6: run the browser checks and open each PNG with the Read tool to walk the visual checklist, in `tools/screenshot.ts` (§16 R3 verification 6, §15.6)
  - The commands:
    - `npm run screenshot -- --name r3/r3-draft --params "scenario=r3-draft&test=1"`;
    - the same for `r3-tray` and `r3-general-augments`;
    - `npm run screenshot -- --name r3/r3-combo --params "scenario=r3-combo&test=1" --click '[data-building=gillNest]' --hover plot:0,back,2` (the plot behind the Hall, by T091's plot form).
  - The checklist:
    - each card shows its copies as a count, lit while free (R3-Q8, as T005 rewords step 6; pips under R3-Q8's alternative);
    - a ghost shows its combo's icon on the neighbor it would link with;
    - the general's augments show on its squads before you plan;
    - a draft card names its type and, for an augment, the building it changes.
  - Then `npm run test:browser`.
- [ ] T139 Update the docs: `docs/status.md` (R3's state, what waits on the user, R4b next), `docs/r3-plan.md`'s As built, `data/CHANGELOG-balance.md`, and `SPEC.md` to follow the code (§11.1, §13.4, §14.2, §14.4, §14.5, §15)
  - §13.4 and §15: `src/sim/augments.ts`, `src/sim/combos.ts`, `src/run/packs.ts`, `tools/lib/cards.ts`, `--hover` and its plot form, `--auto-draft commit`.
  - §11.1 gains every key this milestone added: `kit.starterCopies`, `blueprintCopies`, `copyCopies`, `maxCopies` and `augmentsPerBuilding`; `packsPerRun`; `enemyKit.augmentsPerBattle`, `eliteAugments`, `bossAugments`, `armySlack` and `counterCopies`; `ai.comboPlacementBonus`.
  - §14.2 gains every field this milestone added: `UnitPatch.squadAdd`; `PackDef.requires` and the registry's `dealable`; `AugmentDef.rulesChanging` and `RelicDef.rulesChanging`; `GeneralDef.copies`, and `GeneralLimit` and `BotLimit` in place of the shared limit; `EliteDef.augments`; `BotDef.augments`; `ScenarioSide.augments`, `draftOffer` and a `kit` of `KitCard`s; the run effects `gainCopy` and `augment`.
  - §14.4 and §14.5: `RunState.packs`, `UnitState.statuses` and `blows`, `SquadState.combos`; the events `augmentActed`, `comboActed` and `draftOffered`; `commit` in `DraftPolicy`.
- [ ] T140 [USER] Review the results with the user: steps 3–5's numbers in `docs/balance-backlog.md`. Any retune across several units, or of a decided rule, waits for their OK, as `.claude/rules/balance.md` says (§12.4)
  - Also put to them: T145's band proposals; T135's squad-size restore (A196); the Vault's worth per spawner (T085, A085); and, if #51 took its literal reading, the G4, G5, G6 and G8 setups T125 listed.
- [ ] T147 Land the band changes the user agreed at T140 in `data/balance-targets.json`, log them in `data/CHANGELOG-balance.md` as user-approved, and run `npm run test:slow` (§12.3, §12.4)
- [ ] T141 [USER] Step 7: put the playtest gate questions to the user and write the answers in `docs/playtest-feedback.md`, newest first (§16 R3 verification 7):
  - Did your build feel like your own by the end of the run?
  - Did an augment or a combo change what you built next, or where?
  - Did you ever see the general's army and not have the answer to plant? Was that fair?
  - Did any build win without you having to think?

**Checkpoint:** every step 1–6 passes on `develop`, the user has the numbers, and the gate questions are asked.

## Dependencies and parallel work

- **Phase order:** Setup → Foundational → US1 → (US2 ∥ US3) → US4 → US5 → US6 → Polish.
  - US2 needs US1's `RunState` change (S2b).
  - US3 needs US1's `KitCard` and `augments` fields (S2a's T022), so S5 may start once S2a is in.
  - US3's S7 also needs US1's general copies (S3) and US2's packs (S4), for #48.
  - US4 needs US3's `CompiledSquad` and triggers (S5, S6).
  - US5's drafts (S10) need US2's pool (S4) and US3's triggers (S6), so no drafted augment is a dead card. Its S12a needs S7, S10 and S11, and S12b needs S12a, so every caller of the upgrade tracks is gone before they're deleted.
  - US6 needs US4 and US5.
- **Parallel sessions:**
  - S2b ∥ S5 after S2a (the run layer and the tray against sim combat files; no shared files);
  - S3 ∥ S4 after S2b (S3 is the general's kit, AI and UI files; S4 the run layer). S3 and S4 both touch `src/run/flow.ts` and `src/ui/screens/run.ts`;
  - S10 ∥ S7 ∥ S8 after S6 (S10 also after S4; S7 also after S3 and S4): `draft.ts` and the draft policy, the general's kit and counter, and `combos.ts` with the formation scorer;
  - S9 ∥ S11 after S8 and S10 (render files against run screens);
  - S13 ∥ S14 once S12b is in (tools against slow tests and bots; no shared files).
- **Shared files** (the second session to merge rebases):
  - S3, S4 and S5 all touch `src/data/schema.ts` and `data/balance.json`, and S4 and S5 `src/sim/create.ts`;
  - S7, S8 and S10 all touch `src/data/schema.ts` and `data/balance.json`; S7 and S10 `src/run/flow.ts`; S8 and S10 `data/factions/velvet-bloom/buildings.json`;
  - any two sessions that refresh `tests/golden`: the second to merge re-runs `npm run golden -- update` after its rebase and says so in the commit.
- **Critical path:** S1 → S2a → S2b → S3 → S7 → S11 → S12a → S12b → S14 → S15, with S5 → S6 beside S2b → S3 (S6 must be in before S7).
- **Handoffs in:**
  - R1's `src/sim/formation.ts` (R1), `tools/lib/clash.ts` (R1's army builder; its clash runner plays v1's sim, so R3 doesn't use it) and its copy-limited variants (R1's task file in `docs/tasks/`) → T082, T127, T135, #51.
  - R2a's `freeCopies` stub, per-squad stat tables, `fielded` record, formation scorer, bot planner, answer policy and `playRoundClash` (R2a/T116) (R2a's task file in `docs/tasks/`) → T024, T052, T056, T087, T125, T127, T129.
  - R2b's `migrateRun` chain (R2b/T010), the `requires` gates (R2-Q19), the #27 level flags, the general's plot count in `battleConfig`, the battle scene at §13.4's paths (R2b/T150), the round-only tools with `--checks clash` (R2b/T050) and the run tools for G14 and G15 (R2b's task file in `docs/tasks/`), all in by R2b's last PR (R2b S13, R2b/T147) → T004, T028, T034, T085, T086, T116, T117, T127, T129.
  - If X4 is adopted, R2a and R2b build T018 and T022–T028's work (Technical context).
  - R4a's pips mark merge tiers, so R3-Q8's copy count doesn't collide with them.
- **Handoffs out:**
  - R4b redraws T016's placeholder icons, unique and not placeholders (A161), adds augment icons to matchup marks, and does the card-text pass on copy and augment cards (A157).
  - M6's Velvet Shrine uses T008's `squadAdd` as a combo with the Shrine as `b` (A124), and M6's unlock ladder gates the pack buildings (#59, #60).
  - M7's Gray Rot reuses packs, augments and combos through its `mirrors` map (A170); T012 matches combos by archetype where call 14 allows, to ease it.
  - records-2's codex can count "seen" cards from T121's `draftOffered` (RB-Q4).
  - records-2 also edits the run summary in `src/ui/screens/run.ts`, so S11 and records-2 coordinate if they overlap.

## Sessions

| Session | Tasks | Branch | Gate (true before starting) | Ends with |
|---|---|---|---|---|
| S0 | T001–T006 | `feature/r3-plan` | R2b S13 merged (R2b/T147); R2b's playtest gate asked; X1–X4 decided | PR into develop: `docs/r3-plan.md` agreed, decisions recorded in clarify and SPEC, status updated |
| S1 | T007–T017 | `feature/r3-data` | S0 merged; #36, #44, #46, R3-Q2, R3-Q7 and X9 decided; R3-Q1 decided (if no, R2's tuning is done) | PR: schemas, registry and R3's content files, the Air pack undealable; goldens refreshed |
| S2a | T018, T021, T022, T024, T025, T027, T142 | `feature/r3-copies-sim` | S1 merged; #43 decided | PR: `KitCard` in the battle, `freeCopies`' real limit and the plant refusal; runs still pass cards with `copies` unset, so they play as in R2; goldens refreshed |
| S2b | T019, T020, T023, T026, T028–T030 | `feature/r3-copies-run` | S2a merged; R3-Q6 and R3-Q8 decided | PR: copies in the run's kit, the `RUN_VERSION` bump and its migration step in the same PR, the tray count; goldens refreshed |
| S3 | T031–T040 | `feature/r3-general-copies` | S2b merged; #42 and #50 decided | PR: the general's copies, `maxOwned` retired for generals, copies in the UI; goldens refreshed |
| S4 | T041–T050 | `feature/r3-packs` | S2b merged; #45, #46, #47 and X9 decided | PR: run packs, the pool and bans, pack lists on the run screens; goldens refreshed |
| S5 | T051–T060 | `feature/r3-augments` | S2a merged; #37, #38 and #39 decided | PR: augment patches compiled per squad, damage taken, the fielded record; bench case; goldens refreshed |
| S6 | T061–T070 | `feature/r3-augment-triggers` | S5 merged; R3-Q5 decided | PR: triggers, statuses, target order; bench inside budget |
| S7 | T071–T077 | `feature/r3-general-augments` | S3, S4 and S6 merged; R3-Q3, #41, #48 and #49 decided | PR: the general's augments and kit sources, the counter reading augments, augment icons |
| S8 | T078–T080, T143, T081–T089 | `feature/r3-combos` | S6 merged; #40 and R3-Q5 decided (#38's combo half with S5) | PR: combos, the Vault's link, Mycorrhizal Link, the combo term; bench inside budget |
| S9 | T090–T095 | `feature/r3-combo-ui` | S8 merged | PR: ghost links, hyphae, icon flashes, `--hover` with its plot form |
| S10 | T096–T104 | `feature/r3-drafts` | S4 and S6 merged; R3-Q4 and R3-Q9 decided | PR: four card types in drafts and spoils, every augment live; goldens refreshed |
| S11 | T105–T108 | `feature/r3-run-screens` | S7 and S10 merged | PR: draft and spoils cards, popover, run bar, summary, event result |
| S12a | T109, T111–T115, T144 | `feature/r3-events` | S7, S10 and S11 merged | PR: events and the Grove deal copies and augments; the upgrade branches stay for old saves |
| S12b | T110, T116–T118 | `feature/r3-retire-upgrades` | S12a merged; R3-Q6 decided | PR: upgrade tracks deleted, the second migration step, T118's grep clean; goldens refreshed |
| S13 | T119–T123 | `feature/r3-tools` | S3, S7, S8 and S12b merged (T034 and T073 in) | PR: `--auto-draft commit`, diversity numbers, `--checks cards` |
| S14 | T124–T130, T145, T146 | `feature/r3-guardrails` | S7, S8 and S12b merged; #51 decided; R2's data tuned (R3-Q1) | PR: single-battle copies, mono bots, augment and combo builds in G12, G2 edges, G8, G14 and G15 re-measured, band proposals; goldens refreshed |
| S15 | T131–T140, T147, T141 | `feature/r3-verify` | S9, S13 and S14 merged | PR: R3 replays, browser checks, verification output in the commit, docs; then the user's review, the agreed bands, and the playtest gate |

- Each session keeps `npm run verify` green and the game playable, ticks its tasks in the same commit as their work, and updates `docs/status.md` (what landed, what's next, what waits on the user).
- A session whose gate needs a decision taken after S0 (#51 at S14, R3-Q4 and R3-Q9 at S10, or any block S0 left open) records it in its first commit: in the block's Decision line in `docs/tasks/clarify.md`, in SPEC (closing the §18.2 row and taking the **Open:** marker off its section), and in `docs/status.md`.

## Coverage

**Table 1: SPEC §16 R3**

| SPEC §16 item | Tasks |
|---|---|
| Scope: Copies; starting kit 3 starters ×2; selling returns the copy | T018–T030, T142 |
| Scope: Copies: the general's kit by the player's rule (§7.8), as #42 decides | T026, T031, T034–T037, T125 |
| Scope: Six core archetypes, the Truffle Cellar basic; other buildings only through packs (or a commander's core, A140) | T013, T014, T046, T099 |
| Scope: Augments replace upgrade tracks | T011, T052–T069, T097, T116 |
| Scope: Augments: every level and every effect that grants one is remade or retired | T003, T074, T109, T111–T113, T116, T117 |
| Scope: Augments show on card and squad, the general's included | T076, T095, T103, T106 |
| Scope: Augments: the general's kit gains augments by battle index | T071, T073, T074 |
| Scope: Combos by position, shown while placing | T012, T078–T095, T143 |
| Scope: Run packs: core, always-in set with the swarm answer, 4 of 10 (4 of 9, X9); bans stay | T007, T009, T013, T041–T050 |
| Scope: Drafts reworked: four types, after rounds 2, 4 and 6, and in spoils | T096–T104 |
| Scope: Relics with v2 effects (Mycorrhizal Link; the rest R2b's) | T080, T086 |
| Scope: UI: copies, augments and combos on cards, preview, ghost and draft, placeholder icons | T016, T029, T039, T076, T090–T095, T103, T105–T108 |
| Scope: Tools: `--checks cards` | T120, T123 |
| Scope: Tools: diversity numbers in `--checks runs` (kit variety, top building's share, offered and owned) | T121, T122 |
| Not in R3: the shape language's art, the card-text pass, gating by unlocks | Handoffs out (R4b, M6) |
| Done when: a human can play a run with copies, augments, combos and packs | Phase 7 checkpoint, T141 |
| Done when: upgrade tracks gone from game, data and tests | T116, T118 |
| Done when: every verification step passes | T133–T138 |
| Done when: the playtest gate questions put to the user | T141 |
| Verification 1: `npm run verify` and the listed unit tests | T133 (T018, T031, T041, T051, T061, T071, T078, T096) |
| Verification 2: goldens updated, the commit says why | T017, T142, T030, T040, T050, T060, T070, T077, T089, T104, T144, T118, T146, T132, T134 |
| Verification 3: the clash check with augments and combos; flipped builds answered | T124–T127, T129, T135 |
| Verification 4: the card check and run numbers, with their four bars | T119–T123, T136, T140 |
| Verification 5: `npm run test:slow` and `npm run bench` | T059, T069, T088, T137 |
| Verification 6: browser checks `r3-draft`, `r3-tray`, `r3-combo`, `r3-general-augments` and the visual checklist | T033, T090, T091, T131, T138 |
| Verification 7: the playtest gate | T141 |

**Table 2: findings**

| Finding | Handled by |
|---|---|
| A122 (high) | #42; T026, T031, T034, T129 |
| A123 (high) | R3-Q2; T003, T011 |
| A194 (high) | #42; T031, T034 |
| A196 (high, R1) | X4, #51; T125, T127, T135 (squad sizes re-checked at the copy cap), T140 |
| A170 (high, M7) | Not handled here: M7's `mirrors` map. Call 14 and T012 match combos by archetype where the effect needs only the role, to ease it |
| A124 (medium) | T008, T012, T085 |
| A125 (medium) | R3-Q3; T071, T073 |
| A126 (medium) | R3-Q5; T062, T065 |
| A127 (medium) | #38; T057, T078, T084 |
| A128 (medium) | R3-Q7, R3-Q9; T011, T015, T096, T097, T122 |
| A129 (medium) | R3-Q7; T123, T136 |
| A130 (medium) | R3-Q6; T019, T028, T045 (packs in `loadRun`'s normalisation), T110, T117 |
| A131 (medium) | T052, T069, T082, T088 |
| A144 (medium) | R3-Q3; T071, T073 |
| A145 (medium) | #51; call 9; T027, T125 |
| A146 (medium) | #42; T031, T129 |
| A153 (medium) | #39; T005, T051, T054 |
| A083 (medium, R2) | T085, T086, T116 |
| A084 (medium, R2) | R2b/T010 builds `migrateRun`; R3 chains its steps onto it (T028, T117); T019 and T110 test that an unreadable save still warns |
| A082 (medium, R2) | R2-Q21 (R2b); T109 keeps Leave lit after the graft becomes augments |
| A085 (medium, R2) | T085, T136; the user decides whether the Vault's link narrows |
| A155 (medium, R4) | T131, T138 |
| A173 (medium, M6/M7) | X9, #46; T009, T041, T046 |
