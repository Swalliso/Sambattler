# Milestone 4 plan: adaptive general and intel

Written 2026-10-27 against `main` at `6eff1f2`. Scope and verification come from SPEC §16 "Milestone 4", plus §7.2–7.8, §11.2–11.3, §11.6, §11.11, §12.3 (G2, G8), §14 and §15.

## Kickoff decisions (agreed with the user before the work started)

| Topic | Decision |
|---|---|
| Balance | No rule changes and no roster-wide retunes. G3 / archer spam (backlog B1–B4) stays as it is; after M4, re-measure G3 and report it. M4's own new numbers may be tuned to meet M4 targets, with every change logged in `data/CHANGELOG-balance.md`. Anything touching M1–M3 units, core rules or the reference bots goes to the user first. |
| Gray Rot roster (M7) | Generals keep playing the Velvet Bloom roster in the Gray Rot palette, using M1–M2 ids (§11.11). |
| Commander (M5) | Vesper's M3 stand-in (`data/commanders.json`), with no passive or power. |
| Scripted general | `general:scripted` stays for the single-battle goldens, G4 and the sim smoke. Named generals replace it in runs. Golden updates are deliberate; each commit says whether a change is hash-only or a behavior change. |
| M3 run levers | Measured and reported, not forced: boss reach (25% on main, target ≥ 30%), 4–5 battles per run (6/20 on main), Twin Roots lane divergence (35%, target ≥ 50%). |

## Calls I made where the spec is ambiguous

Each is easy to reverse; say so if you want one changed.

1. **Counter sets hold spawners only.** §7.4 defines them by "buildings whose unit has…"; towers, economy and utility buildings have no unit, and the Tender heals instead of attacking, so none of them is in a set.
2. **Elite share.** The numerator sums `rate_b × mergedFraction_b` over merge-on spawners; the denominator is every spawner's rate, so Elite is a share of the whole mix. A consumed unit is a tier-1 unit spawned by `b` in the last two waves and knit into a Bloomed unit. A unit's spawn wave comes from its id (ids only grow), so no per-unit field is needed.
3. **Nothing to read.** If the player has no standing spawner at an analysis, no counter is warned for that cycle; its slot passes.
4. **Boss cycles.** "The boss also gets an early cycle" is read as an addition: the Pale Sovereign analyses at 1:00, 2:00 and 5:00 (active at 3:00, 4:00 and 7:00). Pending warnings queue; the Intent panel shows the soonest.
5. **Dual doctrine.** The Pale Sovereign's dual doctrine is its opening doctrine (it replaces the ×2 / ×0.8 single doctrine). A building in either kind's counter set gets ×2.5 (once, not squared); others are unchanged. It lasts the whole battle and multiplies with whatever counter cycle is active. Single-kind opening doctrines end when Counter 1 activates.
6. **Opening doctrine kind.** Intel's top kind with no noise, ties broken Elite, Armor, Line, Swarm. An all-zero intel file opens with no doctrine and no callout.
7. **Battle profile for intel.** The average of the kind scores (no noise) at 2:00, at 5:00 and at the end of the battle, over the samples taken; samples where the player had no standing spawner are skipped. A battle with no usable sample leaves intel unchanged.
8. **Burn the Notes** now works: it halves the intel file and every stored battle profile (the boss's input).
9. **Generals on the route.** Each battle row has a nominal battle index (row 1 → 1, row 2 → 2, row 3 → 3, row 5 → 4); a general is eligible where `appearsIn` holds that index. Within a row nodes get distinct generals; across rows a general repeats only when every eligible general has been used. Generals are drawn after maps and events, from the same `route` stream, so a seed's maps and events are the same as in M3.
10. **Boss kit.** The boss's extra blueprints come first from the counter sets of the run's top two intel kinds (cheapest first), then from its preferred list. Without intel it uses the preferred list.
11. **Selling for space.** Free 2×2 slots are counted greedily (non-overlapping legal 2×2 positions, scanning columns then rows). If fewer than 2 are free at activation, the general sells `2 − free` of its spawners that are outside the new counter set, not besieged, and whose unit's damage type has the lowest matrix multiplier against the player's dominant armor, rearmost first.
12. **Missing counter.** When a warning fires and the kit has no building in the counter set, the general adds the cheapest one from its faction roster to its kit (weight 1 before the ×3), as §7.4 and D11 say. It never gains gold or stats.
13. **Lane choice.** The Blightwright (`laneStyle: aggressive`) places spawners in the lane where the player holds the fewest columns (ties to the lower lane). Defensive generals keep today's placement, so the scripted general is unchanged.
14. **G8 baseline.** A mono bot that already wins under 20% against the non-adaptive general cannot drop 20 points. G8 asserts the drop for mono bots at or above that baseline and reports the rest. The reference general for G8 is the Lichen Baron (the §16 example).
15. **Runs with `--flags`.** A run always drafts, so `--run --flags merging,adaptive` keeps `drafts` on and takes the other flags from the list.
16. **Passives** are battle modifiers on the general's side (source `general:<id>`), written into the config like elite modifiers: Mold's swarm buildings spawn interval ×0.91 (10% faster, the same convention as Mycorrhizal Link), the Baron's buildings HP ×1.2, the Blightwright's siege units speed ×1.15, the Sovereign's turret damage ×1.25.

## Architecture

### Sim (`src/sim`), pure

- **`src/sim/ai/counter.ts`** (new): spawn-mix analysis (`analyzeMix`), counter sets, the cycle schedule, warning, activation (doctrine weights, drafting a missing counter, selling for space) and the per-building spawn/merge tracking it reads. Randomness only from the `ai` stream (±0.03 noise per score).
- **`AiState.counter`** exists only for an adaptive general with `flags.adaptiveGeneral` on (and for a bot with `adaptive: true`, none ship). Every new field is absent otherwise, so non-adaptive battles hash exactly as before.
- **Doctrine in `pickTarget`:** effective weight × the active counter's ×3 / ×0.6, × the opening doctrine (×2 / ×0.8, or the boss's ×2.5 dual).
- **Events:** `counterWarned { side, kind, activatesAtTick }` and `counterActive { side, kind }`.
- **Intel in config:** `SideConfig.intel?: IntelProfile` (§14.4). The general's `boss` flag picks dual mode.
- **Utility and economy extras:** the Rhizome Vault adds supply cap (at most 2 count) and the Spore Exchange raises the interest cap, both while standing. The side's supply cap is refreshed when a building is placed, sold or destroyed.
- **Lane choice:** the aggressive lane rule above, in `choosePlacement`.

### Content (`data/`)

- 5 buildings and 3 units with first-pass numbers from §11.2–11.3, merge perks, sprites, upgrade tracks (§11.6 pattern) and both factions' rosters (so they enter the draft pool).
- `generals.json`: Old Mother Mold, the Lichen Baron, the Blightwright, the Pale Sovereign with §11.11 openers and weights, `passive`, `appearsIn`, `preferred`, `laneStyle`, `adaptive`, `boss`. Portraits and four doctrine icons.
- `balance.json` `ai.counter`: schedule, noise, ×3 / ×0.6, ×2 / ×0.8, ×2.5.
- `balance-targets.json`: G8, and the two new G2 intended edges.

### Run layer (`src/run`)

- Route: generals per §8.2 and call 9.
- Run state: `intel` and the per-battle profiles; battle records keep the opening doctrine and the counters fired.
- Battle config: the intel file (the boss gets the unweighted average), the passive and the boss kit (call 10).

### App and UI

- **General's Intent panel:** portrait, name, active doctrine icon and label, pending warning with a countdown in waves; never names units.
- **Callouts:** warning ("Old Mother Mold is preparing to counter your SWARM: 2 waves"), activation, and the opening "The Gray Rot remembers your SWARM".
- **Report:** a "The general countered…" section listing each counter with its time and the buildings it bought, drafted and sold.
- **Route map:** intel bars (●●●○ per kind).

### Tools and tests

- `npm run sim`: `counters` filled in (`kind`, `warnedAt`, `activeAt`, buildings), `--run` honours `--flags` and prints the opening doctrine and boss dual-doctrine checks.
- `npm run test:slow`: G8 and the new G2 edges asserted.
- Unit tests: analysis scores for synthetic mixes, toggle-on-without-merges, schedule ticks (regular and boss), intel update, dual-doctrine weights, selling for space, missing-counter draft, determinism with `adaptive` on.

## Order of work and golden updates

1. **Structure, no behavior change:** schema and state fields, counter module wiring, events, flags, `MILESTONE = 4`. The 40-seed `bot:balanced` summary must be identical; goldens should stay hash-identical (new fields are absent when unused), otherwise a hash-only update.
2. **Content:** the 5 buildings, units, sprites, tracks, rosters. Single-battle goldens: hash-only (bots and the scripted general never buy them). The run golden changes behavior (bigger draft pool).
3. **Counter cycle and intel**, with unit tests.
4. **Generals in runs and the CLI.** Run golden: behavior change.
5. **App and UI.**
6. **Verification:** §16 M4 steps 1–5, `test:slow`, G3 re-measure, M3 levers, then the PR.

## Risks

- **G8 with mono Gill Nest.** It wins ~100% against every general so far. The Anti-Swarm counter (slash and splash) may not bring it down 20 points; if not, it's reported, not fixed by core rules.
- **G1/G2/G3 with the new units.** Any new failure caused by an M4 unit is tuned on that unit's own numbers.
- **Run levers.** Named generals change difficulty both ways (Mother Mold's double-Burrow opener is harsher than the scripted one); the numbers are reported either way.
