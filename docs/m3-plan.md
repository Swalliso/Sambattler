# Milestone 3 plan: run loop, drafts, relics, carryover

Written 2026-10-26 against `main` at `2ca882e`. Scope and verification come from SPEC §16 "Milestone 3", plus §6.5, §8.2–8.9, §11.6, §11.7, §11.9, §13.8, §14 and §15.

## Kickoff decisions (agreed with the user)

| Topic | Stand-in until the real thing lands |
|---|---|
| Enemy (M4 content) | The scripted general in every battle. Enemy Heartcap HP is `2000 + 250 × (i − 1)`; the boss has 3600. Elites are the scripted general plus one modifier (Fortified, Veteran or Swift), built with the effects DSL. Named generals, enemy kit growth and intel stay in M4. |
| Commander (M5) | Vesper's kit with no passive, power or bans. Starter kit: Sporeling Burrow, Capguard Hall, Truffle Cellar. Core pool (×2 weight): Vesper's six. Shared pool: Scythecap Grove, Veilstalker Hollow, Tender's Ring. |
| Relics | 20 in the live pool: the 15 spec relics that work today (Rot-Eater counts as unlocked) plus 5 new ones (below). Sporestorm Sigil is in the data, marked `requires: powers`, and stays out of the pool until M5. |
| Balance (F1–F3, G3) | No balance or rule changes in M3. After M3 lands, re-run G3 and G7 against the new content and record the results in `data/CHANGELOG-balance.md` and `docs/playtest-feedback.md`. |

### The 5 new relics (built only from existing DSL stats and triggers)

| Rarity | Relic | Effect |
|---|---|---|
| C | Hardy Spores | Your units +8% HP |
| C | Root Stipend | Heartcap stipend +2 gold per income tick |
| U | Mending Moss | At the start of each wave, repair your Heartcap by 2% of max HP |
| U | Bloom Vigor | Bloomed and Elder units deal +15% damage |
| R | Martyr's Bloom | When one of your buildings is destroyed, it bursts for 60 crush, splash 2.0 |

That makes 7 common, 8 uncommon and 5 rare. Martyr's Bloom also gives forward buildings a payoff (F1) without touching the rules.

## Calls I made where the spec is ambiguous or out of date

Each is easy to reverse; say so if you want one changed.

1. **Mold Bloom.** The Sporestorm was retuned in M1 to start at 4:00, so "starts at 4:00" would do nothing. The event makes it start 1:00 earlier than normal (3:00 today).
2. **Burn the Notes.** Intel arrives in M4, so the "halve intel" half is recorded but does nothing yet; in M3 the choice is a pure cost. It stays in the pool so all 8 events exist.
3. **Route row 4,** "Two of {Event, Grove} (distinct)": one Event and one Grove, in an order drawn from the `route` stream. Event nodes draw distinct events within a run.
4. **"+1 rarity bias"** on Rout spoils: +10 rare (taken from common), the same size as the elite bonus. They stack.
5. **Blueprint rarity.** Buildings gain an optional `rarity` field: the six M1 buildings are common; Scythecap Grove, Veilstalker Hollow and Tender's Ring are uncommon.
6. **Mid-draft stat changes.** A pick applies to units spawned afterwards. Standing buildings rescale their HP to the new maximum (HP fraction kept), and their spawn timers use the new values from their next cycle.
7. **Tender heal range** is the unit's own range (one field, so range perks and upgrades move both).
8. **Tender's Ring** joins both factions' rosters. `bot:balanced` gets it at weight 1, as M2 did for Scythecap and Veilstalker; that's the "new content" the G3/G7 re-measure runs against. The scripted general's weights don't change.
9. **Landing page.** With no `scene` parameter the site opens a run (the route map), resuming a saved run if there is one. `?scene=battle` still plays a single battle.

## Architecture

### Sim (`src/sim`), pure

- **Loadout in config.** `SideConfig` gains `upgrades`, `relics` and an optional `draft` pool (core, shared, relic ids). `BattleConfig` gains `modifiers` (event effects and the elite modifier). Missing fields default, so old replay configs still load.
- **Library in state.** `step()` has no content access, and the code already copies AI profiles into state for that reason. Following the same pattern, `state.library` holds the plain base definitions a battle can need (both kits, the player's draft pool, their units, upgrade tracks and relics). Recompiling after a pick reads only `state.library`. It adds about 20 KB to a snapshot and is hashed like everything else.
- **Effects DSL** (`src/sim/effects.ts`; zod schema in `src/data/schema.ts`). `ModifierDef`, `Selector`, `TriggerDef`, `EffectAction` and `EffectBundle`, as in §14.2. Compile order: base data → (strain patch slot, M6) → sum all `add`, multiply all `mul`, then apply `set`. Unit modifiers resolve against tier-1 base stats; tier scaling and merge perks apply on top, and `tier` selectors choose which tiers a modifier touches. The stat whitelist is the §14.2 list minus keys whose systems arrive later (`general.*` and `side.homeCols`), plus `unit.healAmount`. Positional selectors (`zone`, `onLoam`, `adjacentOwnBuildingsGte`) only apply to `building.spawnInterval` and `building.goldPerTick`, which are evaluated when used; the schema rejects other combinations.
- **Triggers:** `merge`, `unitDeath`, `enemyUnitKilled`, `buildingDestroyed` (your own), `waveStart`, `battleStart`. Actions: `gainGold`, `explode` (a ground hit scheduled for the next tick, so chains resolve tick by tick and can't loop), `repairHeartcapPct`. Gold from effects is tracked in `goldEarned.effects`.
- **Per-side stats.** Supply cap, merge radius, knit time, turret damage, capture speed, sell refund, supply-line rate, interest cap and stipend come from `compiled[side]` everywhere. `create.ts` stops reading `balance.supplyCap` directly.
- **Draft hold.** At the end of waves 2, 4, 6 and 8 the clock system opens a draft for each side with a draft pool, sets `held` and emits `draftOpen`. While held, `step()` runs only due draft commands (`draftPick`, `draftReroll`, `draftSkip`) and leaves the tick alone. Other commands wait. A bot side resolves its own draft through its `draftPolicy` (first, random or greedy, using the `ai` stream). `runHeadless` throws if a held battle has no draft command to run. The browser loop steps held battles only to run those commands.
- **Offer generation** (`src/sim/draft.ts`) is a pure function of (pool, owned cards, battle index, options, `draft` stream). The in-battle drafts and the run layer's spoils drafts share it. It applies type weights (35/45/20, blueprint 50 while the kit has fewer than 5 buildings, empty types reweighted away), rarity (70/25/5, moving 3 points per battle from common to rare, plus any bias), the exclusions, and core ×2. Each card costs three draws (type, rarity, item). If the rolled rarity has nothing left, it falls back to lower rarities, then higher. Card ids are `bp:<building>`, `up:<building>` and `relic:<id>`.
- **Healing** (step 11). Tender: `heal { amount, interval, targets }` on `UnitSchema`. It heals the ally unit missing the most HP within range (ties go to the lower id), and the heal amount scales with tier like damage. Support units hold at their range from the nearest enemy and never attack. `regenPctPerSec` (Elder's Patience) also lives here: out of combat means no hit taken or dealt for 2 s.
- **`UnitSchema.onDeath`** takes effect actions, for M6's Bursting strain. M3 content doesn't use it.

### Run layer (`src/run`), pure and new

- `runState.ts`: plain JSON run state: seed, route, chosen nodes, kit, upgrades, relics, Heartcap HP and max, battle records, cards drafted, Spores, Amber, XP, the run's `route`, `events`, `draft` and `meta` RNG states, next-battle modifiers, pending choice prompts, and the outcome.
- `route.ts`: six rows per §8.2. Each battle node gets a map (no repeats until the pool runs out; `testOnly` maps are filtered), the scripted general and, for elites, a modifier drawn from the `route` stream. A battle's index is the number of battles fought so far plus one.
- `draft.ts`: spoils drafts (Rout: 1 of 3 with +1 bias and 1 free reroll; Decision: 1 of 2), the elite relic pick (1 of 3, relics only), Grove grafts and event picks.
- `rewards.ts`: the §6.5 and §8.6 tables. Spores, Amber (the elite 25% roll uses the `meta` stream) and mastery XP are tracked even though the meta UI doesn't exist yet. Decay is 0.
- `events.ts`: the 8 events from `data/events.json`. Choices that need a pick ("give up a blueprint", "choose an upgrade") become a pending prompt the UI or an auto-policy answers.
- `resume.ts` and `storage.ts`: a `Storage` interface. The run state autosaves at every node boundary. Mid-battle saves store the battle config plus the command log at each wave boundary and on `visibilitychange`. Resume re-simulates from tick 0, checks the state hash and continues.
- `auto.ts`: headless policies for `--auto-route` (random, first) and run-level `--auto-draft` (first, random, greedy), plus `simulateRun()`. Policy randomness uses its own seeded stream, outside the run state.

### Content (`data/`)

`relics.json` (21), `upgrades.json` (9 tracks: the six M1 buildings, Scythecap, Veilstalker, Tender's Ring), `events.json` (8), `elites.json` (3), `commanders.json` (Vesper's core and starter only), Tender unit, Tender's Ring building and sprites, route node icons, and maps `stumpfield.json` (34 × 8, 1 lane) and `twin-roots.json` (32 × 13, 2 lanes). Each new file gets a zod schema and a registry entry with cross-reference checks.

### App and UI

- A scene router in `main.ts` and a `RunController` in `src/app/run.ts`.
- New screens:
  - the route map: six rows with node icons; battle nodes show map, lanes, general and elite modifier; Heartcap, kit and relics shown alongside
  - the in-battle draft overlay: 3 cards with type, rarity and effect text, plus reroll and skip
  - spoils, Grove and event screens
  - the run summary: each battle's result, map and general, a front-line sparkline per battle, cards drafted, damage by building, and Spores, Amber and XP
- URL params: `scene=route|draft|summary`, `autoplay=run|battles:<n>`. `scene=draft` plays battle 1 of the seeded run with `bot:balanced` placing, but leaves drafts to the player.

### Tools

- `npm run sim -- --run [--seeds a..b] --auto-draft … --auto-route …` with a run table and the M3 expectations printed as PASS/FAIL lines.
- A per-lane divergence metric: a battle diverges when the two lanes' front midpoints are ≥ 4 columns apart in any 1 s sample. It's reported in the summary.
- Golden: a run replay format for `m3-run-s7` (every battle's checkpoint hashes).
- Screenshot asserts per scene: battle scenes keep today's checks; route, draft and summary check their DOM and cross-check the hash against Node.

### Tests

- New unit tests: route constraints; draft weights, exclusions and determinism per seed; effect compile order and selectors; each trigger; rewards; a save round-trip; mid-battle resume hash equality; the draft hold; healing.
- `src/run` added to `PURE` and given its own ESLint block.

## Order of work and golden updates

1. **Structure, no behavior change:** loadout fields, library, effects compiler, per-side stats, draft hold, purity. Check that the 40-seed `bot:balanced` summary is identical before and after (winner, outcome, length per seed), then do golden update #1 with a "hash-only" commit note.
2. **Content:** Tender's Ring and healing, upgrades, relics, maps, `bot:balanced` weight. Golden update #2, noting the behavior change.
3. **Drafts, then the run layer and run tools,** with tests.
4. **App:** scene router, run controller, screens, save and resume.
5. **Verification:** the M3 block, Twin Roots tuning (map layout only), `test:slow` re-measure, screenshots walked against the checklist, then the PR.

## Risks

- **Twin Roots** is the first real multi-lane map. Its median length may land outside the band; I'll iterate on the map layout and record the outcome.
- **The run targets** (22–38 min, ≥ 30% reach the boss) depend on the draft quality versus a scripted enemy that doesn't grow. If they're out of band, I'll tune M3's own new numbers (rarity weights, relic values) and record the change. Anything touching core rules or the M1/M2 roster goes to you first.
- **G7's Slayer clause** sits at its 50% limit, and Tender's Ring in `bot:balanced` may tip it. I'll report it either way, without retuning.
