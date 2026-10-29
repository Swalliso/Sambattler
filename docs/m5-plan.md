# Milestone 5 plan: commanders and powers

Written 2026-10-29 against `develop` at `8a8717b` (PR #20, the clarity pass, merged; dev deploy green). Scope and verification come from SPEC §16 "Milestone 5", plus §6.6, §8.1, §8.4, §10.3, §11.10 and §14.5.

## Kickoff decisions (agreed with the user before the work started)

| Topic | Decision |
|---|---|
| Scope | M5 exactly as specced, with no draft rework. |
| Unlocks | All three commanders are selectable from the start, until M6 brings meta-progression. |
| Balance | No core rule changes or roster-wide retunes without asking. Power and passive numbers in data (cooldowns, damage, first-ready times) may be tuned against the Hold/Advance loop, each change logged in `data/CHANGELOG-balance.md`. A target that needs a rule change is reported with numbers, not forced. |
| Goldens | Any data or rule change moves the hashes; refresh with `npm run golden -- update`. |
| Clarity | Playtesters said "too much to learn" (F8): powers and the commander screen get a first-time tip and tooltips in the clarity pass's style. |

## Calls I made where the spec is ambiguous

Each is easy to reverse; say so if you want one changed.

1. **Who has a commander.** A run always has one (Vesper unless chosen). A single battle has none unless `--commander`, `?scenario=` with a `commander`, or a golden names one, so G1–G8, the M1–M4 goldens and every existing single-battle check play exactly as before. The passive applies whenever a commander is set; the power also needs `flags.powers`, which is now on by default (M5 ships it).
2. **Cooldown clock.** Both the first-ready time and the cooldown count live ticks: nothing counts in deploy, while paused or while the sim is held for a draft. A scenario's starting clock counts as live play.
3. **Spore Burst** strikes at once when the command runs (no projectile): every enemy unit whose body touches the 2-tile circle and every enemy building whose footprint does, in any lane, through the matrix (crush) with no tag multipliers. Never a Heartcap. Its damage is credited to its own key, shown as its own row in the report, and never counts as the MVP.
4. **Rhizome Surge** is global. It takes the frontier column in each lane where no enemy building stands on it, including an enemy-held one (their border falls back), never a home column. With nothing to take it is refused and keeps its charge, so a stray press doesn't waste it.
5. **Puppet Bloom** takes the player's units whose body touches the 3-tile circle, groups them by lane, unit and tier, and merges them three at a time in id order: one pass (new Bloomed units don't cascade into an Elder), Elders and units already knitting left out, the merge toggle respected. It is refused when merging is off.
6. **Passives as data.** Vesper: `building.spawnInterval ×0.91` in home columns (the "10% faster" convention of Mother Mold and Mycorrhizal Link). Armilla: `side.captureSpeed ×1.25`. Cordis: `side.knitTicks ×0.5` and `side.mergeRadius` set to 2.0. Each is a battle modifier with source `commander:<id>`, like a general's passive.
7. **Bans.** 0–3 distinct roster buildings outside the commander's core, stored as `bans` in the run save (`spore-sprawl.run.v1`; a save from before M5 loads with none). They come out of the shared pool, so out of in-battle drafts, spoils and anything else that draws blueprints from it. Switching commander in the Underroot drops bans that are now core.
8. **The commander select flow.** Title → New run → the Underroot (`scene=underroot&tab=commanders|bans`) → Begin run. The run is created and saved only at Begin; Back returns to the title. The summary's New run and Abandon also go through the Underroot.
9. **Targeting.** `Q` or the power button starts aiming; the reticle follows the cursor; a click fires on the next tick; `Esc` or right-click cancels. A global power also waits for a click on the field, so `Q` alone never fires it. While it recharges, `Q` is refused with a callout ("Spore Burst is ready in 12 s"). A use queued while paused shows as a dashed ring.
10. **The auto policy** (`--power-policy auto`, bots only): Spore Burst fires on the enemy unit or building centre where it would deal the most damage, if that is at least 180; Puppet Bloom fires where it would merge two trios, or one trio still in combat; Rhizome Surge fires when at least half the lanes (rounded up) can be taken where the bot's units are already at the frontier, at least matching the enemy there. No randomness.
11. **Run-only bot weights.** A bot player in a run gets weight 1 on its commander's core buildings that its profile never buys (Hammercap Forge and Rhizome Vault for Armilla, Tender's Ring for Cordis), as the run already does for a general's run-only kit entries. Without it, `bot:balanced` never drafts or builds them. A bot's opener also skips buildings missing from its kit (Armilla's starter has no Sporeling Burrow; this used to throw).

## Architecture

### Sim (`src/sim`), pure

- **`src/sim/powers.ts`** (new): `powerOf`, `powerProblem` (validation), `usePower` (the three effects), `powerClock` (the countdown), the previews the UI and the policy share (`burstPreview`, `bloomTrios`, `surgeLanes`) and `autoPowerTarget`.
- **The `power` command** (already in `CommandBody`) runs in `commands.ts` like any other: validated when it executes, a `commandRejected` event otherwise, so replays reproduce refusals. A `power` event records the point, targets hit, lanes taken and trios merged.
- **Shared mechanics, not copies:** `captureFrontier` is the territory system's own flip (now one function), `mergeTriosNow` completes trios through the merging system's `complete`, and `burstAt` applies damage through combat's `applyDamage`.
- **State, absent when unused:** `SideConfig.commander/power/powerPolicy`, `Library.powers`, `CompiledSide.powerCooldownMult` (only when ≠ 1) and the `stats.*.power*` counters exist only in battles that use them, so every pre-M5 battle hashes as before. `SideState.powerCooldown` (already present) is the live ticks left.
- **AI:** `aiThink` queues the auto policy's `power` command for the next tick.

### Content (`data/`)

- `commanders.json`: the three commanders with title, portrait, description, core pool, starter kit, passive (text and effects) and power (kind, target, radius, damage, cooldown, first-ready, text). Schema: a discriminated union per power kind; the registry checks core and sprite references, passive effects and unique power ids.
- Sprites: three 16×16 portraits (`c-vesper`, `c-armilla`, `c-cordis`) and the power icon `i-power`.
- Scenario `power-demo`: Vesper at 1:00 with Spore Burst ready and a knot of enemies mid-field.

### Run layer (`src/run`)

- `RunState.bans` and `powerPolicy`; `createRun` validates bans (`banProblem`); `runPool` passes them to `draftPool`.
- `battleConfig` puts the commander, power and passive on the player's side, and `botCoreWeights` on a bot player.
- `RUN_FLAGS.powers` is on.

### App and UI

- **The Underroot** (`src/ui/screens/underroot.ts`): three commander cards (portrait, title, description, passive, power with its aim and timing, starter kit, the rest of the core pool), a Bans tab with core buildings marked and locked, a first-time tip (remembered with the battle tips) and real tooltips on every building.
- **Power UX:** a power button under speed and pause with its cooldown as a conic ring and its state ("Ready at 0:45", "12 s", "Ready", "Aiming", "Next tick"), and a tooltip with the text, aim and timing. While aiming, a pinned callout says what a click does ("Spore Burst · 10 targets in range · click to fire") and the field shows the reticle (crosshair, radius ring with a dark edge, a breathing wash; red where it can't fire) or, for Rhizome Surge, the frontier columns it would take. A lilac ring sweeps out when a power goes off; a sound and a callout say what it did.
- **Clarity:** a first-time tip when the power is first ready (`Q`, aim, works while paused); `Q` in Help's keys; a commander chip in the run bar with passive, power and bans in its tooltip; the report's Units table gains the power's uses and result.
- **Refused keys** get their own callout priority, just below Heartcap alerts, so a refusal is never crowded out of the lane.

### Tools and tests

- `npm run sim -- --commander <id> --power-policy none|auto` (single battles and `--run`); the brief prints the player's power stats.
- `npm run balance -- tournament --commanders all|a,b [--seeds n]`: whole runs per commander and the M5 spread verdict.
- `npm run verify` gains the two §16 power asserts as smokes.
- Goldens: three new `m5-<commander>-power-s3` replays; the M1–M4 replays pin `powers: false`.
- Screenshot checks for `scene=underroot` (cards, passive, power, starter kit, bans) and `targeting=1` (button aiming, callout, reticle radius, ring pixels).
- Unit tests: `tests/unit/powers.test.ts` (15) and `tests/unit/commanders.test.ts` (7). Browser tests: `tests/browser/commanders.test.ts` (4).

## Order of work and golden updates

1. Schema, state and the powers module; the M1–M4 single-battle goldens stay hash-identical (checked).
2. Run layer: bans, commander in battle configs. The run golden changes behavior (Vesper's passive, powers on).
3. Tools: `--commander`, `--power-policy`, the tournament; the §16 asserts.
4. UI: the Underroot, the power UX, tips and tooltips.
5. Verification: §16 M5 steps 1–4, `test:browser`, `test:slow` before and after.

## Risks

- **Commander parity.** First-pass numbers, measured with one reference bot. A gap that power numbers can't close goes to the user.
- **Hold/Advance and territory.** Rally lines follow the border, so instant captures may change how the bot's muster plays out.

## As built (2026-10-29)

### Changes from the plan

- **The tournament target fails** and nothing was tuned in to hide it (details below). The commander numbers are the SPEC's.
- **One run test widened:** the boss's Scythecap Grove check now looks across 30 seeds (it is placed by 3:00 in 4 of 30 with Vesper's passive on; seeds 1–10 all miss).
- **Three motion tests** take the extra Underroot step after New run.

### Verification (SPEC §16 Milestone 5)

| # | Check | Result |
|---|---|---|
| 1 | `npm run verify`, with new unit tests for each power's effect, cooldown, first-ready time and targeting validation, ban filtering and core-pool weighting | PASS: 339 unit tests (22 new), 8 goldens (M1–M4 hash-identical, run golden refreshed, 3 new M5), the scripted and adaptive smokes, both power smokes, bench |
| 2 | `--commander armilla … --assert "stats.player.powerCaptures>=1"` and `--commander cordis … --assert "stats.player.powerMerges>=1"` (seed 3) | PASS: Armilla used Rhizome Surge 3× and took 3 columns; Cordis used Puppet Bloom 3× and merged 3 trios. Both battles won by Rout |
| 3 | `npm run balance -- tournament --commanders all --seeds 30`: no commander's run win rate more than 15 points above another's | **FAIL: spread 33 points.** Vesper 33%, Cordis 33%, Armilla 0% (below) |
| 4 | Browser checks `m5-commander-select` (`scene=underroot&tab=commanders`) and `m5-power-targeting` (`scenario=power-demo&targeting=1&paused=1`) | PASS both. Hash matches Node; 43 of 48 points sampled on the reticle ring are lilac |
| 5 | `npm run test:browser` | PASS: 72 tests in 10 files (4 new) |
| 6 | `npm run test:slow` before and after | Unchanged, see below. Single battles have no commander, so M5 can't move G1–G8 |

Visual checklist:

- **The three commander cards show the passive, power and starter kit:** yes. Each card shows its portrait and title, its passive, its power (name, text, aim and timing), its three starter buildings by name and the rest of its core pool; one card is selected; every building has a tooltip.
- **The targeting reticle and radius are visible on the field:** yes. The 2-tile ring with a crosshair sits on the enemy knot, with "Spore Burst · 10 targets in range · click to fire" pinned beside "Paused", and the power button reads "Aiming".

Other screenshot checks: every M1–M4 check passes, including `m4-intel` on the spec's seed 4 (it failed in M4 because that run lost battle 2). The extra `m4-intel-s8` check from M4 now fails the same way: Vesper's passive changes that autoplayed run, which now loses battle 2 and ends on the summary.

### Guardrails (`npm run test:slow`)

Run on `develop` (`8a8717b`) before the work and on this branch after it. Every verdict and every detail line is identical: guardrail battles are single battles, which have no commander, and the M5 rule paths are inert without one.

| Guardrail | develop | M5 | Detail (both) |
|---|---|---|---|
| G1 production duels | ✗ | ✗ | Gill Archer Nest wins 7/8 pairings (limit 80%) |
| G2 supply duels, M4 edges | ✓ | ✓ | |
| G3 mono bots ≤ 55% vs balanced | ✗ | ✗ | mono Gill Nest 100%, mono Sporeling 65%; every other mono bot ≤ 48% |
| G4 length band, Decisions | ✓ | ✓ | |
| G5 snowball | ✓ | ✓ | |
| G6 comeback | ✓ | ✓ | |
| G7 merging | ✗ | ✗ | mirror 60% ✓; Slayer mirror 56% (limit 50%, Slayer share 21%) |
| G8 adaptation | ✗ | ✗ | no mono bot drops 20 points (best: 17); `bot:balanced` vs the adaptive Baron 67% (band 40–65%) |
| G11 performance | ✓ | ✓ | |

M5 doesn't move G1, G3, G7 or G8; archer spam is untouched. A commander's passive and power would only reach the guardrails if they measured runs.

### The commander tournament

`bot:balanced`, greedy drafts, random route, power policy auto, seeds 1–30:

| Commander | Runs won | Boss reached | Battles won | Power uses |
|---|---|---|---|---|
| Vesper | 10/30 (33%) | 12/30 | 62/82 | 355 (162,216 damage) |
| Armilla | 0/30 (0%) | 2/30 | 11/43 | 100 (129 columns) |
| Cordis | 10/30 (33%) | 11/30 | 59/80 | 273 (306 trios) |

Battle 1 alone (40 seeds, the same policies), power off then on: Vesper 53% → 75%, Cordis 58% → 75%, Armilla 30% → 23%.

What I measured for Armilla (whole runs, 30 seeds, the content patched in memory only):

| Variant | Runs won | Battles won |
|---|---|---|
| As specced | 0/30 | 11/43 |
| Power off | 2/30 | 23/53 |
| Passive off (capture ×1.0) | 0/30 | 11/46 |
| Power and passive off | 3/30 | 25/52 |
| Capture ×1.5, power off | 0/30 | 10/42 |
| Starter Sporeling Burrow in place of Puffball Mortar | 1/30 | 11/40 |
| Comeback gold off for both sides | 0/30 | 7/38 |
| `bot:balanced` never holds a lane | 0/30 | 11/44 |
| Bot without its forward-placement bias (`spawnerDepthWeight` 0) | 0/30 | 24/55 |
| The same, power off | 4/30 | 38/66 |

Findings:

- **Taking ground hurts the bot.** The surge and the capture-speed passive both lower Armilla's win rate; turning them off is her best result. In traced battles, the bot builds spawners in freshly taken columns, and the units there are lost when the front swings back (13 buildings lost against 0 on one seed).
- **It isn't comeback gold or the Hold muster.** Turning either off doesn't help.
- **Her kit is weaker for this bot too.** With power and passive off she wins 3/30 runs against Vesper's 10/30: one spawner in the starter kit, against two.
- **The allowed levers can't close it.** No power or passive number gets Armilla within 15 points of 33%. The only way to meet the target inside the rules would be to weaken Vesper's and Cordis's powers, which would just hide the problem.

Options, each needing your call:

1. **Change Armilla's content:** a second spawner in her starter kit, or a different power (for example, Surge also fortifies what it takes, or grants gold per column) so that ground pays off.
2. **Change the rule that makes ground a liability:** the bot's placement depth or the rally line following the border. This touches the reference bot or the Hold rules.
3. **Accept the gap for M5:** keep Armilla as specced, log it in the balance backlog, and measure again with human playtests on the dev site.
