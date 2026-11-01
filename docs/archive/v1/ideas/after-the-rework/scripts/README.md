# Scripts from the after-the-rework review

> **Archived: v1 era.** Written before [SPEC v2](../../../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../../../README.md)).

Scripts behind the evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`). Written by agents during that review; nothing here is adopted. Recovered from the session transcripts; the raw output they wrote wasn't kept.

**These are reference copies, not tools.**
- Each script is the version that ran in the session, so you can see what a number in a report measured, and rerun it.
- Nobody maintains them. They import `src/` and `tools/lib/` directly, so a later change there can break them, and a rerun on a later commit won't match the reports.
- `npm run lint` skips this folder (`eslint.config.js`), and `tsconfig.json` and the tests don't include `docs/`.
- The review's item 1, measurement tools ([Tier 1](../../after-the-rework.md#tier-1-now-while-you-playtest)), ports the useful parts into `tools/`. [What to reuse](#what-to-reuse) lists them.

| Folder | What it holds | Used by |
|---|---|---|
| [measure/](measure/) | The fresh headless measurements: single battles and runs per variant, a 10 s time series, and the tables made from them | [measurements.md](../measurements.md); its who's-winning readout also in [a-battle.md](../proposals/a-battle.md) and [d-feel.md](../proposals/d-feel.md) |
| [trace/](trace/) | Battle flow over the 20 s beat, Hold under waves, the general against a swarm | [rework-state.md](../rework-state.md) |
| [lives/](lives/) | Whole runs with an emulated lives rule and emulated boss levers | [c-run.md](../proposals/c-run.md), [c-run-critique.md](../proposals/c-run-critique.md) |
| [second-wind/](second-wind/) | When the losing army falls behind (the trigger for Second Wind, item 11), and whether Hold alone brings a side back | [a-battle.md](../proposals/a-battle.md), [a-battle-critique.md](../proposals/a-battle-critique.md) |
| [run-loop/](run-loop/) | Whole runs with every card offer, pick and route choice recorded | [run-loop.md](../run-loop.md), [b-builds.md](../proposals/b-builds.md), [b-builds-critique.md](../proposals/b-builds-critique.md) |
| [playtest/newcomer/](playtest/newcomer/), [playtest/strategist/](playtest/strategist/) | The Playwright drivers of the two playthroughs | [playthrough-newcomer.md](../playthrough-newcomer.md), [playthrough-strategist.md](../playthrough-strategist.md) |
| [screenshots/](screenshots/) | The battle-feel captures and tick-by-tick probes | [battle-feel.md](../battle-feel.md) |

## Running them

- **From the repo root,** at the commit you want to measure. `.ts` files run with `npx tsx`, `.mjs` and `.cjs` files with `node`, and `.py` files with `python3` (3.11 works). `measure/analyze.py` and `measure/analyze_ts.py` need numpy; the other Python scripts use only the standard library.
- **Outputs go under `reports/after-the-rework/<folder>/`,** which git ignores. A script that takes an output path doesn't create its folder, so `mkdir -p` it first. The shell runners and most Python analyzers find the repo root themselves; `second-wind/trig.py` and `trig2.py` must run from it. The experiment tool still writes its own reports to `reports/experiments/`.
- **Seeds count from 1** and the sim is deterministic, so a rerun at `ef2e133` should reproduce the reports' numbers.
- **Prototype specs** are the experiment tool's: presets and `path:value` overrides joined by commas (`src/data/proto.ts`, and the header of `tools/experiment.ts`). An empty spec, or `-` where a script takes it as an argument, means M5 rules.
- **The playtest and screenshot drivers** open the live dev site, https://swalliso.github.io/Sambattler/dev/, which changes with every push to `develop`. To replay one at `ef2e133`, serve that build locally (the `dev-site` launch config, port 5174) and change the URL in the script.

Each section below shows the commands the session ran, with this repo's paths. In them `$S` is the script folder and `$O` the output folder.

## measure/

The fresh headless measurements in [measurements.md](../measurements.md): `bot:balanced` with each commander and auto power, 720 single battles (60 seeds × the four battle-1 generals on Bogwater × three commanders) and 600 runs per variant, plus the experiment tool's own checks as a cross-check.

| Script | What it measures or does | Reads → writes |
|---|---|---|
| [`fun.ts`](measure/fun.ts) | Single battles as the `engagement` check plays them, and whole runs as the `runs` check plays them, with extra pacing numbers per battle: front-line lead changes and who led first, first flip, first death and first building lost, units and supply on the field at fixed clocks (`fieldSupply` counts units on the field; `supplyUsed` also counts units waiting in buildings), gold banked, merges, releases, the gaps between the bot's commands, and the loser's state when its Heartcap is first hit | `--proto <spec> --commander <id> --seeds N --runs N` → `--out <file>.json` |
| [`fun2.ts`](measure/fun2.ts) | The same single battles as a 10 s time series: territory lead, field supply, buildings and their value, both Heartcaps, gold | `--proto --commander --seeds` → `--out <file>.json` |
| [`analyze.py`](measure/analyze.py) | `fun.ts` records as Markdown tables per variant: single battles, runs, and one row per general | `$O/data/<variant>-<commander>.json` → stdout and `$O/tables.json` |
| [`analyze_ts.py`](measure/analyze_ts.py) | Who's winning: how often the leader on territory, field supply, building value or material at 1:00–5:00 goes on to win, how much of a battle the winner leads for good, and how often the winner was 30% behind in material | `$O/data/ts-<variant>-<commander>.json` → stdout |
| [`official.py`](measure/official.py) | Sums up the experiment tool's reports per variant: each general's engagement numbers, then battle-1 losses, boss reach and runs won | `reports/experiments/fr-<variant>-<commander>.json` → stdout |
| [`jobs.txt`](measure/jobs.txt) | The six variants, one `label\|proto` a line | — |
| [`run1.sh`](measure/run1.sh) | One official job: `--checks engagement,runs --seeds 30 --runs 100` with a commander and auto power | `<label\|proto> <commander>` → `reports/experiments/fr-<label>-<commander>.json`, a log in `$O/logs/` |
| [`run2.sh`](measure/run2.sh) | One `fun.ts` job: 60 seeds, 200 runs | `<label\|proto> <commander>` → `$O/data/<label>-<commander>.json` |
| [`run3.sh`](measure/run3.sh) | One `fun2.ts` job (`ts`, 60 seeds) or one placement-spread check (`spread`) | `ts <label\|proto> <commander>` → `$O/data/ts-…json`; `spread <label\|proto> <building>` → `reports/experiments/fr-spread-…json` |
| [`spread.sh`](measure/spread.sh) | The same spread check as `run3.sh spread`. Written but not used: `run3.sh` ran the spread jobs | `<label\|proto> <building>` |

```bash
S=docs/archive/v1/ideas/after-the-rework/scripts/measure; O=reports/after-the-rework/measure; mkdir -p $O/data
# one job by hand
npx tsx $S/fun.ts --proto rework --commander vesper --seeds 60 --runs 200 --out $O/data/rework-vesper.json
npx tsx $S/fun2.ts --proto rework --commander vesper --seeds 60 --out $O/data/ts-rework-vesper.json
# the session's batches, 6 jobs at a time (about a minute per fun.ts job)
for c in vesper armilla cordis; do while read j; do echo "$j $c"; done < $S/jobs.txt; done > $O/joblist.txt
xargs -P 6 -L 1 $S/run1.sh < $O/joblist.txt
xargs -P 6 -L 1 $S/run2.sh < $O/joblist.txt
{ for b in gillNest sporelingBurrow capguardHall puffballMortar truffleCellar; do echo "spread rework|rework $b"; echo "spread base| $b"; done
  for v in 'base|' 'rework|rework' 'rwbreach|rework,breach'; do for c in vesper armilla cordis; do echo "ts $v $c"; done; done; } > $O/jobs3.txt
xargs -P 6 -L 1 $S/run3.sh < $O/jobs3.txt
# added later: the rework without waves, through run2.sh and run3.sh ts
for c in vesper armilla cordis; do $S/run2.sh 'rwnowaves|rework,waves:null' $c; $S/run3.sh ts 'rwnowaves|rework,waves:null' $c; done
# the tables
python3 $S/official.py
python3 $S/analyze.py base,rework,rwnowaves,rwbreach,rwhb,rwB,stepB
python3 $S/analyze_ts.py base,rework,rwbreach,rwnowaves
```

`analyze.py` and `analyze_ts.py` take a comma-separated list of variants and read whichever of the three commanders' files exist. `official.py` takes no arguments: `jobs.txt`'s six variants are written into it.

## trace/

The new measurements in [rework-state.md](../rework-state.md). Each prints to stdout; its options and defaults are at the top of the file.

| Script | What it measures | Options (defaults) |
|---|---|---|
| [`trace.ts`](trace/trace.ts) | Battle flow: first unit contact, quiet seconds after it, supply at 1:00–5:00, unit damage by second of the 20 s beat, bursts, releases and shielded releases, units per release, Rhizomorphs surfacing, flyers, merges, and what each side builds | `--proto` (none), `--map` (bogwater-hollow), `--seeds` (20), `--enemies` (the four battle-1 generals), `--player` (bot:balanced), `--commander` (none) |
| [`hold.ts`](trace/hold.ts) | Does Hold matter under waves? `bot:balanced` with scripted holds on every lane: none, every other beat, or the opening beat only | `--proto` (rework), `--map`, `--seeds` (30), `--enemies` |
| [`g8swarm.ts`](trace/g8swarm.ts) | Can the adaptive general answer a swarm? Mono Sporeling and mono Veilstalker against it, with the swarm read on or off and step A's `a2` counter floor: the general's wins, its counter warnings and what it builds | `--seeds` (50), `--general` (general:lichen-baron), `--specs` (four specs joined by `\|`), `--mono` (sporelingBurrow,veilstalkerHollow) |

```bash
S=docs/archive/v1/ideas/after-the-rework/scripts/trace
npx tsx $S/trace.ts --seeds 20; npx tsx $S/trace.ts --proto rework --seeds 20
npx tsx $S/hold.ts --seeds 30
npx tsx $S/g8swarm.ts --seeds 50; npx tsx $S/g8swarm.ts --seeds 50 --general general:mother-mold
```

## lives/

The run-level measurement in [c-run.md](../proposals/c-run.md), section 2, which its [critique](../proposals/c-run-critique.md) re-ran.

| Script | What it measures or does | Reads → writes |
|---|---|---|
| [`lives.ts`](lives/lives.ts) | Whole runs as the `runs` check plays them (`bot:balanced`, greedy drafts, random route, auto power), seeds 1 to N, with an emulated lives rule: a Rout below the boss costs a share of max HP instead of the run (the last share repeats). No rule changes; the script relabels the loss a Decision and sets the Heartcap before `finishBattle`. Two emulated boss levers: `BOSS_STIPEND=<x>` multiplies the boss's stipend, and `MIRROR=1` also gives the boss the player's kit at the higher of the two upgrade levels | `<proto\|-> <commander> <seeds> <out.json> [shares, e.g. 0.25,0.35,0.5]` → runs, battles and Grove choices as JSON |
| [`analyze.py`](lives/analyze.py) | Per label: runs won, boss reached and won, battle 1 lost, runs over in battle 1, battles and minutes per run, losses survived, HP entering the boss, Grove repairs, near misses; per commander | labels (all `v*` found by default), each `$O/<label>-<commander>.json` → stdout |
| [`extra.py`](lives/extra.py) | Loss rate by battle index, defeats at the boss, battle-1 losses that went on to win, elite against regular battles | labels; needs all three commanders' files → stdout |
| [`jobs.txt`](lives/jobs.txt) | Jobs v0–v7, `label proto shares` (`-` for no lives) | — |

All the jobs, 100 runs per commander. v8–v17 ran from inline loops, so they aren't in `jobs.txt`:

| Label | Proto | Lives shares | Environment |
|---|---|---|---|
| v0 | `rework` | — | |
| v1 | `rework` | 0.25, 0.35, 0.5 | |
| v2 | `rework,hotstart` | 0.25, 0.35, 0.5 | |
| v3 | v2 + `enemyKit.bossUpgrades:8,heartcapEnemyHp.boss:4500` | 0.25, 0.35, 0.5 | |
| v4 | v2 + `enemyKit.bossUpgrades:12,enemyKit.bossBuildings:9,heartcapEnemyHp.boss:4500` | 0.25, 0.35, 0.5 | |
| v5 | `rework,hotstart,general.mother-mold.appearsIn:[2,3]` | — | |
| v6 | `rework,hotstart` | — | |
| v7 | `rework,hotstart,bigdrafts,enemyKit.bossUpgrades:8,heartcapEnemyHp.boss:4500` | 0.25, 0.35, 0.5 | |
| v8 | `rework,hotstart` | 0.34, 0.5, 0.67 | |
| v9 | `rework,hotstart` | 0.25, 0.35, 0.5 | `BOSS_STIPEND=1.4` |
| v10 | `rework,hotstart,general.pale-sovereign.opener:["sporelingBurrow","sporelingBurrow","capguardHall"],general.pale-sovereign.weights.sporelingBurrow:4` | 0.25, 0.35, 0.5 | |
| v11 | as v10 | 0.25, 0.35, 0.5 | `BOSS_STIPEND=1.4` |
| v12 | `rework,hotstart` | — | `BOSS_STIPEND=1.4` |
| v13 | `rework,hotstart` | 0.25, 0.35, 0.5 | `MIRROR=1` |
| v14 | `rework,hotstart` | — | `MIRROR=1` |
| v15 | `rework,hotstart` | 0.25, 0.35, 0.5 | `MIRROR=1 BOSS_STIPEND=1.25` |
| v16 | `rework,hotstart` | 0.34, 0.5, 0.67 | `MIRROR=1 BOSS_STIPEND=1.25` |
| v17 | `rework,hotstart,bigdrafts` | 0.34, 0.5, 0.67 | `MIRROR=1 BOSS_STIPEND=1.25` |

```bash
S=docs/archive/v1/ideas/after-the-rework/scripts/lives; O=reports/after-the-rework/lives; mkdir -p $O
while read lab proto shares; do [ "$shares" = - ] && shares=
  for c in vesper armilla cordis; do npx tsx $S/lives.ts "$proto" $c 100 $O/$lab-$c.json $shares < /dev/null; done
done < $S/jobs.txt
for c in vesper armilla cordis; do MIRROR=1 BOSS_STIPEND=1.25 npx tsx $S/lives.ts rework,hotstart $c 100 $O/v16-$c.json 0.34,0.5,0.67; done
python3 $S/analyze.py v0 v1 v2 v6 v8 v16
python3 $S/extra.py v0 v16
```

The session wrote one command line per job and ran them six at a time.

## second-wind/

The trigger behind Second Wind (A1 in [a-battle.md](../proposals/a-battle.md), item 11 in the review): how long before the end a losing side's army is down 2:1, and how often a side that goes on to win trips the same trigger. The proposer measured it over `measure/`'s time series; the [critique](../proposals/a-battle-critique.md) re-measured it at 5 s with stored units counted, and tested Hold as a comeback lever.

| Script | What it measures | Reads → writes | Used by |
|---|---|---|---|
| [`army_window.py`](second-wind/army_window.py) | For field-supply ratios 0.5, 0.4 and 0.33, held for 2 or 3 samples of 10 s after 1:00 (the opponent at 10 supply or more): how often the eventual loser trips it and how long before the end, its buildings and bank then, and how often the winner trips it | `<data folder> <variant>`, reading `ts-<variant>-<commander>.json` from `measure/fun2.ts` → stdout | the proposals |
| [`rally_window.py`](second-wind/rally_window.py) | The same for a trigger on buildings lost: a side down to 80%–40% of its peak building count | as above | the proposals |
| [`ts_used.ts`](second-wind/ts_used.ts) | `fun2.ts`'s single battles at 5 s samples, with field supply, `supplyUsed` (field plus units stored in buildings), stored units, buildings and gold per side | `--proto --commander --seeds` (20) → `--out <file>.json` | the critique |
| [`trig.py`](second-wind/trig.py) | The trigger held a true 20 s, on field supply and on `supplyUsed`, at ratios 0.5 and 0.4; and the share of `supplyUsed` that sits in buildings after 2:00 | `$O/used-<commander>.json` for all three commanders → stdout | the critique |
| [`trig2.py`](second-wind/trig2.py) | The proposer's method, 2 or 3 consecutive 10 s samples, on the same data, to show it measures 10 s of deficit rather than 20 s | as above | the critique |
| [`behind.ts`](second-wind/behind.ts) | `bot:balanced` with scripted holds on every lane while behind 2:1 on `supplyUsed` for 20 s, against no holds; and the column-keyed comeback gold paid to eventual winners and losers | `--proto` (rework), `--seeds` (30), `--enemy` (general:scripted) → stdout | the critique |

```bash
S=docs/archive/v1/ideas/after-the-rework/scripts/second-wind; O=reports/after-the-rework/second-wind; mkdir -p $O
python3 $S/army_window.py reports/after-the-rework/measure/data rework
python3 $S/army_window.py reports/after-the-rework/measure/data base
python3 $S/rally_window.py reports/after-the-rework/measure/data rework
for c in vesper armilla cordis; do npx tsx $S/ts_used.ts --proto rework --commander $c --seeds 20 --out $O/used-$c.json; done
python3 $S/trig.py; python3 $S/trig2.py
for e in general:scripted general:mother-mold general:lichen-baron general:blightwright; do npx tsx $S/behind.ts --enemy $e --seeds 30; done
```

## run-loop/

The run measurements in [run-loop.md](../run-loop.md), which [b-builds.md](../proposals/b-builds.md) and [its critique](../proposals/b-builds-critique.md) also cite.

| Script | What it measures or does | Reads → writes |
|---|---|---|
| [`runstats.ts`](run-loop/runstats.ts) | Whole runs as the `runs` check plays them (`bot:balanced`, auto power), stepping each battle by hand to record every in-battle and spoils offer and pick, route nodes, Grove and event choices, and the kit, relics and upgrades at the end. An optional seventh argument emulates a lives rule: a Rout below the boss costs that share of max HP (its usage line leaves it out) | `<proto\|-> <commander> <seeds> <greedy\|random\|first> <out.json> [random\|first\|battles] [share]` → runs, battles, spoils and nodes as JSON |
| [`analyze.mjs`](run-loop/analyze.mjs) | Per file: runs won, boss reached, where defeats ended, losses by battle, minutes, Decisions, drafts, offers by type and rarity, spoils, the loadout at the boss and at the end, relics and kit owned, route picks, Grove and event choices, losses by general and node kind | output files → stdout |
| [`analyze2.mjs`](run-loop/analyze2.mjs) | Decisions per run, and how often a rare or rule-changing relic is offered or owned | output files → stdout |
| [`analyze3.mjs`](run-loop/analyze3.mjs) | Per card, the share of runs that offered it at least once, and of runs that reached battle 3 | output files → stdout |

The jobs, 80 runs for each of Vesper, Armilla and Cordis unless noted:

| Output | Proto | Drafts | Route | Lives share |
|---|---|---|---|---|
| `base-<c>` | `-` | greedy | random | |
| `rework-<c>` | `rework` | greedy | random | |
| `rework-randdraft-<c>` | `rework` | random | random | |
| `rework-nodrafts-<c>` | `rework,draftWaves:[]` | greedy | random | |
| `rework-hsbd-<c>` | `rework,hotstart,bigdrafts` | greedy | random | |
| `rework-battles-<c>` | `rework` | greedy | battles | |
| `base-lives40-<c>` | `-` | greedy | random | 0.4 |
| `rework-lives40-<c>` | `rework` | greedy | random | 0.4 |
| `rework-hsbd-lives40-<c>` | `rework,hotstart,bigdrafts` | greedy | random | 0.4 |
| `rework-commonnew-vesper` (Vesper only) | `rework` with the Drift Stalk, Burster Pod and Rhizomorph Tunnel at `rarity:"common"` | greedy | random | 0 |

```bash
S=docs/archive/v1/ideas/after-the-rework/scripts/run-loop; O=reports/after-the-rework/run-loop; mkdir -p $O
npx tsx $S/runstats.ts rework vesper 80 greedy $O/rework-vesper.json random
npx tsx $S/runstats.ts rework vesper 80 greedy $O/rework-lives40-vesper.json random 0.4
node $S/analyze.mjs $O/rework-vesper.json $O/rework-armilla.json $O/rework-cordis.json
node $S/analyze2.mjs $O/rework-vesper.json $O/rework-armilla.json $O/rework-cordis.json
node $S/analyze3.mjs $O/rework-*.json
```

## playtest/

The drivers of the two agent playthroughs. Each agent started a headless Chromium at 1440×900 with a remote-debugging port (`server.cjs`, left running), then connected to it over CDP for every step, so the browser and the game kept their state between steps. Screenshots go to `reports/after-the-rework/playtest/<who>/`.

**[newcomer/](playtest/newcomer/)**, for [playthrough-newcomer.md](../playthrough-newcomer.md), on port 9437:
- [`server.cjs`](playtest/newcomer/server.cjs) launches the browser and keeps it open.
- [`probe.cjs`](playtest/newcomer/probe.cjs) checks the dev site loads (it prints the page title).
- [`ctx.cjs`](playtest/newcomer/ctx.cjs) lists the browser's contexts and pages.
- [`run.cjs`](playtest/newcomer/run.cjs) `'<code>'` runs a code body with `page`, `shot(name)`, `state()`, `sleep(ms)` and `log(...)` in scope.
- [`play.cjs`](playtest/newcomer/play.cjs) `<seconds> <shot name>` unpauses, plays until the time is up or a draft opens, pauses, takes a screenshot, and prints the battle's state and the callouts it saw.

**[strategist/](playtest/strategist/)**, for [playthrough-strategist.md](../playthrough-strategist.md), on port 9477:
- [`server.cjs`](playtest/strategist/server.cjs) launches the browser with a persistent profile (in `reports/after-the-rework/playtest/strategist/profile2`).
- [`step.cjs`](playtest/strategist/step.cjs) `<file.js or code> [shot name]` runs a code body with `page` and the helpers `h` in scope, then takes an optional screenshot (into `shots/`). The helpers read the battle (`state`, `brief`, `units`), play it (`advance(sec)` and `adv(sec)` stop early at a draft or the end, `place(card, col, row)` through the tray, `power(x, y)`), and read the HUD (`paused`, `callouts`, `intent`).
- Bodies for `step.cjs`, which are not modules:
  - [`auto.js`](playtest/strategist/auto.js) buys a build order as gold allows and logs the battle every step (env `PLAN` as JSON `[[card, col, row, cost], …]`, `UNTIL` in seconds of clock, `STEP` in seconds);
  - [`a.js`](playtest/strategist/a.js) advances 6 s and lists units, stances and the Hold labels;
  - [`u.js`](playtest/strategist/u.js) is a snapshot of units and buildings;
  - [`adv.js`](playtest/strategist/adv.js) advances, then runs `u.js` (it failed in the session; see [Quirks](#quirks-as-they-ran));
  - [`rh.js`](playtest/strategist/rh.js) follows Rhizomorphs for 14 steps of 6 s;
  - [`seeds.js`](playtest/strategist/seeds.js) autoplays battle 1 of runs on seeds 778–783 under `rework`, and [`seeds_m5.js`](playtest/strategist/seeds_m5.js) on seeds 777–783 without a prototype.

```bash
P=docs/archive/v1/ideas/after-the-rework/scripts/playtest/strategist
node $P/server.cjs &
node $P/step.cjs "await page.goto('https://swalliso.github.io/Sambattler/dev/?proto=rework&debug=1'); await h.sleep(3000); return await h.state()" title01
# later, in a battle
PLAN='[["Sporeling Burrow",0,4,110],["Gill Archer Nest",0,6,150]]' UNTIL=120 STEP=10 node $P/step.cjs $P/auto.js r2b1_t120
```

## screenshots/

The captures in [battle-feel.md](../battle-feel.md).

| File | What it does | Reads → writes |
|---|---|---|
| [`shoot.mjs`](screenshots/shoot.mjs) | For each job, opens the dev site with the job's query (`scene=battle`, a bot or none, a seed, `ticks=N` to run ahead), presses keys, clicks and hovers if asked, then saves a 1280×720 screenshot (or the job's size) and 2× or 4× crops of the field canvas. The job fields are in its header comment | `<out folder> <jobs.json>` → PNGs |
| [`probe.mjs`](screenshots/probe.mjs) | Prints a paused battle's state at each tick given: Heartcaps, storm, units, supply, borders, buildings | `<query> <tick>…` → stdout |
| [`jobs1.json`](screenshots/jobs1.json), [`jobs2.json`](screenshots/jobs2.json), [`jobs3.json`](screenshots/jobs3.json) | The 19 captures (38 PNGs with crops): `bot:balanced` against Old Mother Mold on seed 7 from 1:00 to the finale, the mono Drift Stalk, Burster and Rhizomorph battles, Twin Roots, 1920×1080, the deploy screen, Help's Keys tab, and the beat chip and card tooltips | — |

```bash
S=docs/archive/v1/ideas/after-the-rework/scripts/screenshots; O=reports/after-the-rework/screenshots
node $S/shoot.mjs $O $S/jobs1.json
node $S/probe.mjs "proto=rework&scene=battle&player=bot:balanced&enemy=general:mother-mold&seed=7" 9100 9200 9250 9300 9350 9390
```

## What to reuse

What later work can lift from here, by the review's item:
- **Item 1, the readout** (and item 5, which rests on it): `measure/analyze_ts.py` over `measure/fun2.ts`'s series is the "who's winning" analysis that [Appendix B](../../after-the-rework.md#appendix-b-test-details) ports into `tools/lib/engagement.ts`.
- **Item 1, supply on the field:** `fieldSupply` in `measure/fun.ts`, for the `engagement` check's "supply on field", which today counts units waiting in buildings.
- **Item 1, AI holds:** `trace/hold.ts` and `second-wind/behind.ts` script holds by queueing a `stance` command just after a beat.
- **Item 1, the card check and build diversity:** `run-loop/runstats.ts` records every offer, pick and final loadout; `run-loop/analyze3.mjs` counts how often each card is offered.
- **Item 2, lives:** `lives/lives.ts` (and `runstats.ts`'s share argument) emulate the rule from outside the run code; the rule itself belongs in `finishBattle`, with Appendix B's pitfalls.
- **Item 4, comeback gold by army:** `second-wind/behind.ts` already splits comeback gold between eventual winners and losers.

## What changed from the session's copies

**The last version of each.** The first recovery replayed each agent's file writes and edits. It missed edits made with inline Python or `sed` in shell commands, and files written by commands that failed later on. These copies replay those too, so each is the last version that ran:
- `measure/fun.ts`: the units-on-the-field series (`fieldSupply`, `field`), which also makes peak supply count units on the field;
- `measure/analyze.py`: the matching "supply on field" and "peak field supply" rows;
- `measure/official.py`: its printing block, rewritten to run on Python 3.11;
- `lives/lives.ts`: the `BOSS_STIPEND` and `MIRROR` boss levers;
- `playtest/newcomer/run.cjs`: more state fields, and `process.exit(0)` at the end;
- files the first pass lost: `playtest/strategist/step.cjs` and `seeds_m5.js`, `playtest/newcomer/probe.cjs`, and `run-loop/`, which sat in a separate scratch folder.

**Checked against the session.** `lives/lives.ts` and `lives/analyze.py` match, byte for byte, the copy the C critique printed. `measure/official.py` reproduces its session output byte for byte from the session's experiment reports. `measure/fun.ts`, `playtest/newcomer/run.cjs` and `playtest/strategist/step.cjs` match the excerpts their agents printed after editing them.

**Edited for the repo, and nothing else:**
- imports: absolute paths into the session's checkout became relative ones (`../../../../../../../src/sim/index.ts`, `playwright`);
- outputs: the session's scratch folder became `reports/after-the-rework/…`;
- comments: the usage lines, and the notes that said a script lived outside the repo.

The logic is as it ran, quirks included.

## Quirks, as they ran

- `playtest/strategist/adv.js` failed in the session: `require` wasn't in scope in `step.cjs`'s code bodies then. `step.cjs` then passed `require` and `process` in, and gained `h.units` and `h.adv`, which do `adv.js`'s job. `adv.js` also reads `u.js` through `__dirname`, which a code body never has.
- `measure/jobs.txt` lacks `rwnowaves|rework,waves:null`, which was added later (see the commands above), and `lives/jobs.txt` lists only v0–v7.
- `measure/spread.sh` was never run; `run3.sh spread` ran the spread checks.
- `lives/extra.py`, `second-wind/trig.py`, `trig2.py`, `army_window.py` and `rally_window.py` need all three commanders' files. `measure/analyze.py`, `analyze_ts.py` and `lives/analyze.py` use whichever exist.
- `trace/trace.ts`'s "supply on field" is `supplyUsed`, which under waves also counts units waiting in buildings.
- The playtest drivers use fixed ports (9437 and 9477) and the dev site's URL.

## How these copies were tested

On 2026-10-31 at `ef2e133`, from the repo root: every TypeScript script ran with 1–2 seeds (`lives.ts` also with `MIRROR=1 BOSS_STIPEND=1.25`, `runstats.ts` also with a lives share), and every Python and `run-loop/*.mjs` analyzer ran on those outputs. `official.py` ran on the session's own experiment reports. `measure/run3.sh` ran one `ts` job from another folder; the other runners were only syntax-checked (`zsh -n`). The playtest and screenshot drivers were only parse-checked (`node --check`; the strategist's bodies wrapped in a function, as `step.cjs` runs them), since they drive the live dev site.
