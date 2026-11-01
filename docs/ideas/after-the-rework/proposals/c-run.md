# Proposals C: run structure and long-term pull

Evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): lens C's proposals. Written by an agent during that review and checked in [the critique](c-run-critique.md); nothing here is adopted, and the review's [Appendix A](../../after-the-rework.md#appendix-a-every-surviving-proposal) holds the final verdicts. Recovered from the session transcript, so the screenshots it names aren't linked (see the [README](README.md)) and raw outputs weren't kept.

Written 2026-10-31 against `develop` at `ef2e133`. Lens: the run as a whole and why someone starts another one. **Nothing here is adopted or built.** Every rule or data change below waits for the user (`.claude/rules/balance.md`); each new rule is staged as a default-off `?proto=` knob, measured, then playtested.

**What's new in this file:** a fresh run-level measurement under the rework (section 2): a battle-index-scaled "lives" rule, `hotstart`, Old Mother Mold out of battle 1, and seven boss levers, 300 runs each. The headline is that **no boss lever that exists as data today makes the boss the hardest fight**, and that a lives rule moves defeats from battle 1 to the boss.

---

## 1. Diagnosis: the run as the player meets it with `?proto=rework`

### D1. A run is a sudden-death gauntlet decided in battle 1, and a loss leaves nothing behind
- **Numbers (fresh, section 2):** under `rework`, battle 1 is lost 53% of the time and 49% of runs end there; 147 of 247 run defeats come in battle 1. Armilla and Cordis lose battle 1 56% and 63% of the time, Vesper 40%. Old Mother Mold wins 67–70% of the battle 1s she's in ([`measurements.md`](../measurements.md), battle 1 by general).
- **Why:** a Rout loss sets the run's Heartcap to 0 (`src/run/rewards.ts:35`, then `src/run/flow.ts:275` ends the run), and nearly every battle ends in a Rout. A battle-1 loss is recovered in 2 of 159 runs.
- **What players saw:** both browser playthroughs died to Old Mother Mold in battle 1. The strategist lost 2 of 2 runs there and 7 of 7 autoplay seeds ([`playthrough-strategist.md`](../playthrough-strategist.md) §1). The newcomer's run 1 ended at 8:56 with "0 Spores, 0 Amber, 0 Commander XP" and "Feats: none yet" ([`playthrough-newcomer.md`](../playthrough-newcomer.md), [`SS/69-after-b1.png`](../screenshots/newcomer/69-after-b1.png)): "Nine minutes of play left nothing behind."

### D2. Run HP is binary, so the run's middle has no attrition and no near misses
- 92% of battles start at full HP ([`run-loop.md`](../run-loop.md) §5); the winner's Heartcap is untouched in 719 of 720 battles ([`measurements.md`](../measurements.md)). Groves repair 3 times in 98 visits (fresh).
- So Grove repair, Mending Moss, Rot Ward, Quiet Clearing's Rest and Fallen Oak's cost are dead. The newcomer's run 2 stayed at 3000/3000 through three wins, and Fallen Oak's "−15% max HP" "cost me nothing I could feel" ([`playthrough-newcomer.md`](../playthrough-newcomer.md), event).
- **No near misses at the battle level either:** in lost battles, the enemy Heartcap ever fell below ⅔ in 7 of 266 (3%, fresh). A "so close" moment almost never happens, so an end screen can't honestly claim one.

### D3. The difficulty curve is upside down, and the end isn't a climax
- Runs that reach the Pale Sovereign beat it 88% of the time under `rework`, 92% with `hotstart` (fresh), 95–96% with `hotstart,bigdrafts` ([`measurements.md`](../measurements.md), [`run-loop.md`](../run-loop.md)).
- **New finding: the boss resists every lever tried.**
  - **Existing data levers:** doubling its upgrade levels and raising its Heartcap to 4500 moves boss wins 87% → 84%; 12 levels and 9 buildings → 79%; a swarm opener → 89%.
  - **Emulated levers:** its income ×1.4 → 82%.

  It's a fixed-size general with even weights over 11 buildings (`data/generals.json`, `pale-sovereign`), and it meets the strongest kits a run produces. A bigger version of the same general isn't a finale.
- Winning leads nowhere: no Decay, no unlock; the summary hard-codes "Decay 0" (`src/ui/screens/run.ts:603`).

### D4. The route and its rewards don't ask for a plan, and risk doesn't pay
- Every node links to every node in the next row (`src/run/route.ts`; F10).
- Elites cost about 5–10 points of extra loss risk (fresh: elite battles lost 41% vs 36% for plain battles 2+) for one relic pick plus Spores and Amber that buy nothing (F11).
- The optional row-2 battle is pure risk (33 against 44 runs won, [`run-loop.md`](../run-loop.md)). 6 of 8 events offer "nothing happens", and Amber Seep is a trap (`data/events.json`).
- Spoils deal the same cards as in-battle drafts (F9), and picking at random wins as many runs as picking greedily (41 against 44 of 240, [`run-loop.md`](../run-loop.md)).

### D5. Nothing carries from one run to the next, and restarting is slow
- There's no profile save. Spores, Amber and XP live only in `RunState` and vanish ([`run-loop.md`](../run-loop.md) §6). The summary says "Feats: none yet (Milestone 6)", "Decay 0" and "Every run starts fresh" (`src/ui/screens/run.ts:602–608`). Advertising what's missing is worse than saying nothing.
- The Underroot forgets your commander and bans (`src/app/main.ts:177`). Starting again means going through Summary → New run → Underroot (back on Vesper, no bans) → Begin → route → deploy.
- The strategist: "The 'one more run' pull came only from curiosity about the cards I never saw. There was no progress, no near miss, and no new unlock."

### D6. A full run is long for what's at stake, and the commander you pick halves your odds
- Battles under `rework` run a median 7:08 for bots ([`measurements.md`](../measurements.md)), and the newcomer's full-length battles ended at 8:34–8:56 at storm 5. They estimated a full run at "45–60 minutes of battle time at 1×". Human wall-clock time has never been measured ([ledger](../ledger.md) §4 item 14).
- Runs won by commander under `rework`: Vesper 28%, Armilla 12%, Cordis 13% (fresh). Every variant in section 2 keeps a 16–26 point gap between Vesper and the weakest commander.

---

## 2. Fresh measurement: lives, battle 1 and the boss under the rework

**Method.** A scratch script ([`lives.ts`](../scripts/lives/lives.ts), not one of the repo's tools) plays whole runs exactly as `npm run experiment -- --checks runs` does (`bot:balanced`, greedy drafts, random route, power `auto`): seeds 1–100 for each of Vesper, Armilla and Cordis, so 300 runs per row, about ±5 points.
- The no-lives `rework` row reproduces [`run-loop.md`](../run-loop.md) and [`measurements.md`](../measurements.md) (battle 1 lost 53% against their 51–52%, boss fights won 88%).
- **The lives rule is emulated, not built:** a non-boss Rout loss is relabelled a Decision loss, and the battle's final Heartcap is set so the run loses the scheduled share of max HP and continues.
- **"Boss income" and "mirror boss" are emulated in the script** by editing the boss battle's config: a `side.stipend` modifier on the boss, or the boss also fielding the player's kit at the player's upgrade levels where higher. No such knob exists in the repo.
- Everything else is an existing `?proto=` path.

| Row | Spec | Battle 1 lost | Run over in battle 1 | Reached boss | Boss fights won | Runs won (V / A / C) | Defeats at the boss | Battle min per run | Groves that repair | Battles starting hurt |
|---|---|---|---|---|---|---|---|---|---|---|
| v0 | `rework` (the playtest) | 53% | 49% | 20% | 88% | 18% (28/12/13) | 3% | 13.1 | 3 / 98 | 8% |
| v6 | `rework,hotstart` | 26% | 23% | 34% | 92% | 31% (43/24/27) | 4% | 16.0 | 6 / 158 | 6% |
| v5 | v6 + `general.mother-mold.appearsIn:[2,3]` | **16%** | 11% | 40% | 93% | 37% (48/31/32) | 4% | 17.6 | 4 / 181 | 7% |
| v1 | `rework` + lives 25/35/50% | 53% | **0%** | 85% | 80% | 68% (80/62/61) | **54%** | 25.1 | 70 / 255 | 52% |
| v2 | `rework,hotstart` + lives 25/35/50% | 26% | 0% | 89% | 87% | 78% (92/67/74) | 52% | 24.7 | 59 / 263 | 38% |
| v8 | v6 + lives 34/50/67% | 26% | 0% | 83% | 87% | 72% (85/61/69) | 39% | 23.9 | 77 / 250 | 36% |
| v3 | v2 + boss 8 levels, 4500 HP | | | 89% | 84% | 75% | | | | |
| v4 | v2 + boss 12 levels, 9 buildings, 4500 HP | | | 89% | 79% | 71% | | | | |
| v9 | v2 + boss income ×1.4 | | | 89% | 82% | 73% | | | | |
| v10 | v2 + boss opens 2 Burrows + Capguard, Burrow weight 4 | | | 89% | 89% | 80% | | | | |
| v13 | v2 + mirror boss | | | 89% | 80% | 72% | | | | |
| v15 | v2 + mirror boss + income ×1.25 | | | 89% | 74% | 66% (84/51/63) | 69% | | | |
| **v16** | v8 + mirror boss + income ×1.25 | 26% | 0% | 83% | **75%** | **62% (75/49/61)** | 55% | 24.2 | 77 / 250 | 36% |
| v17 | v16 + `bigdrafts` | 25% | 0% | 88% | 78% | 69% (81/58/68) | 61% | 24.1 | 76 / 257 | 34% |

Other numbers from the same runs:
- **A lost battle 1 is recovered:** the run goes on to win in 2 of 159 battle-1 losses today, 100 of 159 under lives (v1), and 53 of 77 with `hotstart` (v2).
- **With `hotstart` the wall moves to battle 2:** battle 2 is lost 39–40% of the time (v6, v2), 41% with Mold moved (v5).
- **Low HP barely changes a battle** (the Heartcap cliff): under v2 the boss is beaten 28 of 36 times when entered below 50% HP and 205 of 232 times above. Run HP works as a count of losses you can afford more than as attrition.
- **Battle-level near misses stay rare under lives:** the enemy Heartcap fell below ⅔ in 17–19 of about 360 lost battles (5%).

**Reading it.**
- Lives turn the run from "die in battle 1" into "reach the end and usually win". 52–69% of defeats come at the boss, against 3% today.
- Lives alone overshoot: bots win 68–78% of runs. The overshoot can't be taken out at the boss with today's data levers. The closest measured package (v16: steeper lives, a mirror boss and boss income ×1.25) still has bots winning 62%.
- Bots aren't people. A human may play battle 1 better (holds, reads the warning) or worse (first run). These are pacing and curve indicators, and **the target band is the user's call**. A suggested first band is in C1.

Reproduce: `npx tsx docs/ideas/after-the-rework/scripts/lives/lives.ts '<proto>' <commander> 100 <out.json> [0.25,0.35,0.5]` from the repo root, with env `BOSS_STIPEND=1.25` and `MIRROR=1` for the emulated boss levers; then `python3 docs/ideas/after-the-rework/scripts/lives/analyze.py v0 v6 …` and [`extra.py`](../scripts/lives/extra.py). Raw output was in `out/` beside the scripts (raw output not kept).

---

## 3. Proposals, ranked by expected impact on fun

Learning load (F8) is noted on each. Most of this lens *removes* load: a run that doesn't end in battle 1 gives a new player time to learn.

### C1. Lives: a lost battle costs run HP, scaled by battle index, not the run
- **Problem:** D1 and D2. 49% of `rework` runs end in battle 1, a battle-1 loss is recovered 2 times in 159, and run HP is binary, so the systems built around it are dead.
- **Change:**
  - Below the boss, a Rout loss costs a share of max HP by battle index instead of setting the Heartcap to 0. First pass: **battle 1: 34%, battle 2: 50%, battle 3+: 67%**. With full HP you survive one early loss, then one more late loss if you've repaired. The gentler 25/35/50% is the alternative row.
  - The run still ends at 0 HP or on a boss loss.
  - A Decision loss keeps its 25%. Losses still pay no spoils (unchanged; C6 has a variant).
  - The battle report's button reads "The colony survives: Heartcap 3000 → 1980 · Continue".
- **Feel:**
  - Losing battle 1 to Mold becomes a setback you can play through: "one more loss and I'm in trouble".
  - A Grove becomes "repair or graft?" (repair chosen 77 of 250 times, against 3 of 98). Fallen Oak's −15% max HP and Quiet Clearing's Rest become trades. Mending Moss and Rot Ward start to matter.
  - Most defeats arrive at the finale (39–55% of defeats at the boss, against 3%), which is the run-level near miss the game lacks today.
- **Implementation:**
  - **Data:** an optional `routLossDamage: number[]` in `data/balance.json`, absent by default (today's rule). Add it to the balance schema in `src/data/schema.ts`.
  - **Rewards:** `src/run/rewards.ts`: `RewardRules` gains `routLossDamage?`, and `battleRewards` takes the battle index and returns `heartcapPct = -cost` instead of `heartcapZero` for a non-boss node.
  - **The one subtle line, `src/run/flow.ts` `finishBattle`:** after a Rout, `ps.heartcapHp` is already 0 (line 237). The cost must be taken from `before` (the HP the battle started with), not from the battle's final HP. The end condition at line 275 already handles `hp <= 0` and a boss loss.
  - **UI:** the report's continue text, a run-bar HP readout with loss pips, and one first-time tip.
  - **Preset:** `lives: { routLossDamage: [0.34, 0.5, 0.67] }` in `src/data/proto.ts`.
  - **Goldens and tests:** run layer only, and off by default, so no battle golden moves. Add a unit test in `tests/unit/run.test.ts`. The official `--checks runs` measures it as soon as the knob exists.
- **Test:**
  - `npm run experiment -- --proto rework,hotstart,lives --checks runs --commander all --power-policy auto --runs 100`.
  - A suggested target band for the user to set or change: run over in battle 1 under 5%; reached the boss 65–80%; boss fights won 55–70%; runs won 40–55%; at least 40% of defeats in battles 4–5; commander spread back toward the M5 bar of 15 points.
  - Playtest questions: "You lost a battle and the run went on. Did you want to keep playing, or did it feel like a consolation prize?" "Did you ever pick a Grove repair over a graft, and why?" "How long did the run take on the clock?"
- **Effort:** M (a small rule; UI text, tip and retune on top).
- **Timing:** now, independent of P4. It's a run-layer knob that composes with any combat model. Offer it for a second-pass playtest as `?proto=rework,hotstart,lives`.
- **Depends on:** none to build. To land in a sensible band it needs C3 (a harder finale) or the steeper schedule.
- **Ledger:** ER-2c, RD-2 and OMR-8 (never addressed); [`run-loop.md`](../run-loop.md)'s flat-40% emulation (M5 and `rework`, not built). **What differs:**
  - the cost scales with battle index;
  - it's measured with `hotstart` and with boss levers under the current preset;
  - there's a target band;
  - the `finishBattle` pitfall is named.
  - Not ER-2d (enemy-held columns drain run HP). That's deliberately not proposed: territory names the winner only 37–44% of the time at 2:00–4:00 ([`measurements.md`](../measurements.md)), so a territory-based drain would punish players who are winning.
- **Sources:**
  - Super Auto Pets' lives, The Bazaar's Prestige (cheap early losses), TFT's early-round HP ([`research-one-more-run-and-feel.md`](../research-one-more-run-and-feel.md) §2.10, practice A1);
  - Kasavin, "take the sting of failure" (Hades, §2.3);
  - Bénard, "most runs should be viable" (Dead Cells, §2.6);
  - [`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) mechanic 14.
- **Risks:**
  - **Runs get twice as long:** mean battle minutes per run go from 13 to 24–25, and most runs become full runs. At human battle lengths (8–9 min) that's 35–45 min at 1×, over SPEC §3's 25–35. C4 shows the clock so the playtest can judge it, and C7 makes the route shape data so a shorter run can be tried.
  - **Bots win 62–78%.** Without C3 or the steeper schedule the run gets easy.
  - **Battle 1 matters less.** That's intended, but battle 1 should still feel worth winning: rout wins repair 10%, and the HP readout makes the cost visible.
  - **Low HP barely changes a battle under the Heartcap cliff,** so HP acts as lives more than attrition. Be honest about that in the UI: show how many losses the current HP can still absorb at the next battle's cost, beside the bar.
  - **Learning load:** about neutral. It swaps "a Rout ends your run" for "a loss costs HP; at 0 the run ends".

### C2. A fair first battle: hot start with the rework, then move Old Mother Mold's swarm out of battle 1
- **Problem:** D1. Battle 1 is a coin flip on which general you draw. Mold wins 67–70% of battle 1s, the Lichen Baron 34%. The player has 3 starter cards and no draft until 2:00. Both browser playthroughs died to Mold, the newcomer after following the economy tip ("The battle-1 economy tip pushes players into the weaker line against Mother Mold", [`playthrough-strategist.md`](../playthrough-strategist.md) §3).
- **Change**, in three stages:
  1. **Now:** playtest `?proto=rework,hotstart` as P3's second pass. It's already built (`src/data/proto.ts` `hotstart`: a deploy draft, and the battle-1 general on ¾ income). Measured under the rework: battle 1 lost 53% → 26%, run over in battle 1 49% → 23%, runs won 18% → 31%.
  2. **Then:** measure `general.mother-mold.appearsIn:[2,3]`: battle 1 lost 16%, run over in battle 1 11%, runs won 37%. **Battle 2 is still lost 41% of the time,** so the wall moves rather than vanishes. Pair it with C1 so that wall costs HP, not the run.
  3. **With C5's profile, "Mother's Mercy":** if the last run ended in battle 1 or 2, the next run's Underroot offers a labelled, optional boon: battle 1's general on ×0.6 income (the `hotstart` modifier, deeper).
- **Feel:**
  - The first fight teaches instead of executing you. You meet the swarm general once you have a few cards and a reason to read her warning.
  - Mercy tells a struggling player "the game noticed", visibly, instead of quietly rubber-banding.
- **Implementation:**
  - Stages 1–2 are data, playable today as `?proto=` specs; adopting them means `data/balance.json` `hotStart` and `data/generals.json` `appearsIn` (goldens refresh, CHANGELOG entry).
  - Mercy reads a profile flag (C5) and pushes the existing `hotStart.battles[0].enemy` modifier from `battleConfig` in `src/run/flow.ts` (the same code path as `hotstart`). The run records it, so runs stay deterministic.
- **Test:**
  - `npm run experiment -- --proto rework,hotstart --checks runs --commander all --power-policy auto`, then the same with `general.mother-mold.appearsIn:[2,3]`.
  - Playtest: "Battle 1 with Armilla or Cordis against Mold: did you lose, and could you say why?" "Did the deploy draft feel like a decision?"
- **Effort:** S.
- **Timing:** now, independent of P4.
- **Depends on:** none (Mercy depends on C5).
- **Ledger:** ER-3a/ER-3b, DR-24 and DR-27 are built, off and awaiting a playtest; moving Mold is "the user's call" (BB step B). **New here:** both measured under the rework (they weren't); the finding that the wall moves to battle 2 (41%); and Mercy (never proposed in the repo).
- **Sources:**
  - Slay the Spire's Neow and Neow's Lament ([`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) mechanic 15; [`research-one-more-run-and-feel.md`](../research-one-more-run-and-feel.md) practice A2);
  - Kingdom Rush's deliberately easy level 1 and George Fan's spacing (practice A3).
- **Risks:**
  - It widens the commander gap: Vesper wins 43–48% of runs, Armilla 24–31% (v6, v5).
  - Moving Mold removes the swarm lesson from battle 1. C9 brings her back as an opt-in Decay rung.
  - **Learning load:** the deploy draft adds one screen.

### C3. Make the boss the summit: a boss that scales with your run, then a visible Edict
- **Problem:** D3. Without a lever the boss is beaten 87–93% of the time in every variant. Of the seven levers tried, the existing data ones (levels, HP, buildings, opener) moved it −8 to +2 points, and only the emulated mirror plus income moved it 13. A finale that's a formality makes winning feel flat and gives a run no last test to plan toward.
- **Change:**
  - **Stage 1 (a knob):** a boss-only modifier slot, `boss: { enemy: { modifiers: [...] } }` in `data/balance.json`, applied in `battleConfig` when `node.kind === 'boss'` (the `hotStart.battles` pattern). Add a **mirror rule**, `boss.mirror: true`: the Pale Sovereign also fields the player's kit, at the player's upgrade levels where they're higher, so it scales with what the run built.
    - First pass: mirror + boss income ×1.25. Measured with lives, boss wins go 87% → 74%; with the 34/50/67 schedule, runs won 62% (v16).
  - **Stage 2 (a rule):** one **Edict** per run, shown on the route from row 1 and on the boss node. Each Edict is a passive rule, not an active power, so §17 #13 holds. Examples:
    - Sovereign of Mirrors: the stage-1 mirror rule;
    - Sovereign of Roots: a two-lane boss map;
    - Sovereign of Thorns: its Heartcap turrets reach 2 more columns;
    - Sovereign of Many: its waves leave 25% bigger, like a storm stack from 0:00.
  - **Stage 3, only if the playtest says the ending is abrupt:** a second Heartcap stage. When the boss Heartcap first falls, it re-roots once at 40% with a pulse. That's a rule change aimed at the finale, not at every battle.
- **Feel:**
  - The last fight is the one you prepare for. "It's a mirror run, so don't rely on one Burrow spam" turns rows 3–5 into preparation.
  - A loss at the boss is the near miss runs lack today.
- **Implementation:**
  - `src/run/flow.ts` `battleConfig` and `generalKit`, for the mirror (kit union, `aiWeights` for the added buildings, upgrades at the maximum of the two);
  - `data/balance.json` and its schema;
  - `src/ui/screens/run.ts`, for the Edict on the boss node and the route header;
  - Edicts as data in `data/generals.json` (a `boss.edicts` list) with modifiers.
  - All of it is a run-layer config, so no battle golden moves while the knob is off.
  - Proto presets: `bossmirror`, `bossedicts`.
- **Test:**
  - `--checks runs --commander all --power-policy auto` with `rework,hotstart,lives,bossmirror`. Target boss fights won 55–70% (the user sets it).
  - Playtest: "Did the boss feel like a finale? Did you change anything in rows 3–5 because of what you knew about it?"
- **Effort:** M (stage 1 S; Edicts M; re-rooting L).
- **Timing:** after P4, whatever it decides. The boss's strength depends on the adopted combat model, but the stage-1 knob can be built and measured now.
- **Depends on:** C1. Without lives only 20–34% of runs reach the boss, so the boss is a small share of the problem.
- **Ledger:** ER-3c and OMR-9 (a harder boss: never addressed; BB step B rec 4 calls it "a retune for after the playtest"); DR-20 (bosses as build exams: never addressed). **What differs:** the measurement shows a retune of the boss's own numbers *doesn't work* (seven levers, 79–89%), so this proposes scaling with the run (mirror) and a known rule (Edict) instead.
- **Sources:** Balatro's boss blinds (visible from the start of the ante); Slay the Spire's act boss shown on the map; Monster Train's bosses with variable abilities ([`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) mechanic 10, §3 pattern 5: "the test is known").
- **Risks:**
  - The mirror can feel like copying. Present it as the Sovereign "adapting to your whole run", which its description already claims.
  - The mirror punishes mono builds more than mixed ones (desirable, but check that every commander has a path).
  - Edict balance per map, and the general's AI may not use mirrored buildings well.
  - **Learning load:** one rule per run, shown up front.

### C4. Run it back: an end screen that points forward, and a one-key restart
- **Problem:** D5. The summary advertises absence ("Feats: none yet (Milestone 6)", "Decay 0", "Every run starts fresh"), the Underroot forgets your setup, and restarting takes five screens. The newcomer: "Losing battle 1 ends the run with nothing".
- **Change (UI only):**
  1. **Remember the last commander and bans** in a new key through `storageKey()` (for example `spore-sprawl/underroot/v1`, folded into C5's profile later).
  2. **A primary "Run it back" button** on the summary, with Enter or R: same commander and bans, new seed, straight to the route.
  3. **Replace the three placeholder rows with true lines:**
     - **How far:** "Fell in battle 1 of 5 · row 1 of 6", or with C1 "Fell at the boss with 1 loss to spare".
     - **What beat you:** "Old Mother Mold: 9 Sporeling Burrows, 38 Elders". It comes from the battle's enemy stats, stored in the `BattleRecord` as an `enemyMvp`.
     - **The run's wall-clock time.**
  4. **"Practise this battle":** replay the deciding battle as a single battle with the same config and seed, no rewards. The single-battle rematch already exists (`src/app/main.ts` `restart(seed)`).
  - **Don't add a battle-level "so close" line.** The enemy Heartcap fell below ⅔ in only 3–5% of lost battles (section 2), so it would almost never be true, and a faked near miss is manipulation ([research](../research-one-more-run-and-feel.md) §3).
- **Feel:**
  - The run ends on "here's what got you, go again", one keypress from the next run.
  - The practice battle turns a loss into a lesson you can test at once.
- **Implementation:**
  - `src/ui/screens/run.ts` `summaryScreen` (lines 544–611);
  - `src/app/main.ts` (lines 177–181 for the remembered choice; a `runItBack` action);
  - `src/run/flow.ts` `finishBattle`, to store the enemy's top building and Elder count in the record (run data, not sim);
  - `src/run/runState.ts` gains `startedAt` (wall-clock, outside the sim; never hashed);
  - storage through `storageKey()` per `.claude/rules/storage.md`.
  - No sim or golden change, so it's not a proto knob. Ship it on `develop`.
- **Test:**
  - Browser check: summary → R → route in one step.
  - Playtest: "After the run ended, did you start another one right away? What made you, or didn't?" Time from summary to the next deploy.
- **Effort:** S.
- **Timing:** now, independent of P4.
- **Depends on:** none (the "How far" wording improves with C1).
- **Ledger:** DR-33 (one-key restart; OMR calls it "a quick UI win"), DR-32 (run summary), DR-19 (nemesis log), CX-5 and CX-6 (turning points; a practice copy of a failed battle). All never addressed. This combines them into one small UI pass and adds the measured "no fake near misses" constraint.
- **Sources:**
  - Into the Breach, "clear how or why you failed";
  - Clark 2009 and Larche 2017 on near misses, with the ethics note ([`research-one-more-run-and-feel.md`](../research-one-more-run-and-feel.md) §2.5, §2.13, practices A6–A7).
- **Risks:**
  - The nemesis line must come from real stats, or it erodes trust.
  - "Practise this battle" could become save-scumming. It pays nothing, so it's a lesson only.
  - **Learning load:** none.

### C5. A profile that remembers: records and feats as goals, before any power
- **Problem:** D5. Nothing carries between runs. Spores, Amber and XP are counted, shown and dropped. Every reference game leaves something behind after a loss.
- **Change:** a thin first slice of SPEC §9.7's profile, with no power in it:
  - **Records:** runs started and won per commander, best row reached per commander, and the last 20 runs (commander, seed, result, row, nemesis general).
  - **Banked currencies:** Spores, Amber and XP accumulate, shown as "banked for the Underroot". Losses pay a little for what you did: +2 Spores per enemy building destroyed (`stats.player.buildingsDestroyed`).
  - **Feats as goals:** §9.2's condition DSL over stats that already exist (`src/sim/state.ts:630–661`). 10 feats chosen to reward variety, not the dominant mono build. Examples:
    - "Win a battle without losing a building" (`buildingsLost == 0`);
    - "Destroy 8 enemy buildings in one battle";
    - "Have 3 Elders alive at once";
    - "Win a battle after selling 3 buildings";
    - "Beat Old Mother Mold";
    - "Reach the boss with Armilla", and the same for Cordis;
    - "Win a run";
    - "Win a run after losing a battle" (with C1);
    - "Win on a two-lane map".
  - **SPEC's own *Swarm Mind* ("spawn 60 Sporelings") is left out:** it would pay the G3 failure.
  - The summary and the Underroot show the next 3 open feats.
- **Feel:**
  - Every run, even a lost battle 1, moves a record or a feat.
  - A loss reads "2 feats from Cordis's next goal" instead of 0 / 0 / 0. A goal list suggests a different build or commander for the next run (pillar 4).
- **Implementation:**
  - `src/run/profile.ts` (new, pure: update from a finished `RunState`);
  - `data/feats.json` and its schema in `src/data/schema.ts`, with a whitelist of stat paths;
  - storage through `storageKey()` under SPEC's `spore-sprawl/profile/v1` with a `version` field and a migration hook, so M6 extends it rather than replacing it;
  - UI in `src/ui/screens/run.ts` (summary) and `src/ui/screens/underroot.ts` (records panel);
  - unit tests for feat conditions and the profile round-trip.
  - No sim or golden change. A prototype run saves under its own `proto=` space already (storage rules).
- **Test:**
  - Unit tests.
  - Playtest over 3+ runs: "Did a feat or record change what you picked next run?" "Did losing battle 1 still feel like it counted?"
- **Effort:** M.
- **Timing:** now, independent of P4. Records and goals don't depend on the combat model; avoid feats that name rework-only units until P4.
- **Depends on:** C4 shares the storage (remembered setup).
- **Ledger:** DR-29/30 and SPEC M6 (planned): this pulls the scaffold and the goals forward, not the power. ER's warning ("meta multiplies the core loop's fun and doesn't create it") is why it's goals-only. [`run-loop.md`](../run-loop.md) §7 item 3 recommends the same thin layer. CS-9 (an heirloom building) can come later as a feat reward.
- **Sources:**
  - Hades' "every run counts";
  - Slay the Spire 2's unlock on any run end;
  - Brotato and Vampire Survivors unlocks;
  - LocalThunk: unlocks should "nudge players into the systems" ([`research-one-more-run-and-feel.md`](../research-one-more-run-and-feel.md) practice A4).
- **Risks:**
  - Feats can push degenerate play. Pick conditions that reward mixing, holding and finishing well.
  - Banked currencies that buy nothing can feel hollow. Label them honestly, and keep the list short.
  - **Learning load:** a short list. Show 3 at a time.

### C6. Risk that pays: elite prizes and the beaten general's loot, shown on the node; spoils that differ from drafts
- **Problem:** D4. Elites raise the loss risk for one relic pick and dead currencies (F11). The row-2 battle is pure risk. Spoils are the same cards as drafts (F9). With C1, taking a risky node finally has a price in HP, but the prize still isn't worth it.
- **Change:**
  1. **Elites show and pay a named prize in a different kind.** The elite relic pick becomes 1 of 3 rare relics (the elite pick's `rareBonus` 10 → 60), plus +1 card in the main spoils. The node shows the prize before you pick it.
  2. **Loot from the general you beat (9 Kings):** a battle node shows "Spoils include one of: {3 of this general's doctrine buildings or upgrades}", and the Rout spoils gains that card.
  3. **Spoils and drafts split by kind (F9):**
     - in-battle drafts: blueprints and upgrades (relic weight 20 → 5);
     - spoils: relics and loot (relic 60, blueprint 40, no upgrades).

     The battle is where you get tools; the run is where you get rules.
- **Feel:** "Elite: guaranteed rare relic" or "Beat Mold: take one of her swarm buildings" is a reason to pick a node, and a build plan that runs through the route.
- **Implementation:**
  - `src/run/rewards.ts` (`SpoilsSpec` gains `typeWeights?` and `loot?`);
  - `src/run/flow.ts` `offerFor` (pass types and weights; draw loot from `generalKit`);
  - `src/sim/draft.ts` `generateOffer` options;
  - `data/balance.json` (`spoils.typeWeights`, `draft.typeWeights`);
  - `src/ui/screens/run.ts` node chips (lines 100–124).
  - Proto knobs `eliteprize` and `spoilssplit` (data paths). In-battle drafts change the battle's draft stream, so battle goldens move only when the knob is on.
- **Test:**
  - `--checks runs` with an added route policy `elites` in `src/run/auto.ts`, comparing runs won for "always elite" against "never elite". The target is that elites stop being a loss: equal or better run wins.
  - Playtest: "Did you take an elite? Why?"
- **Effort:** M.
- **Timing:** after P4, whatever it decides. The prize content and pool weights depend on the adopted roster.
- **Depends on:** C1 (risk needs a price that isn't the whole run).
- **Ledger:** F9 and F11 (never addressed, "wait on the user"); CR-8 (loot from the general: never addressed). Not `bigdrafts` (count and picks); this changes *what kind* each source deals.
- **Sources:**
  - Slay the Spire's elites as the main relic source, and the burning elite;
  - Against the Storm's forbidden glades;
  - 9 Kings' loot;
  - the Bazaar's known drops ([`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) mechanics 7, 11; §3 pattern 6).
- **Risks:**
  - Elite inflation raises run wins. Re-measure the band.
  - Loot is a mirror until the Gray Rot has its own roster (M7).
  - **Learning load:** low. It removes the F9 confusion.

### C7. A route you plan: branching paths, Groves against prizes, events that bend the next battle
- **Problem:** D4 and F10. Every node links to every node, so there's no path to plan, and the Grove vs elite choice never competes.
- **Change:**
  - **The graph:** `generateRoute` builds 3 columns per row, and each node links to 1–2 nodes in the next row (Slay the Spire style). The whole map, the boss's Edict (C3) and the elite prizes (C6) are visible from row 1. Hovering a node lights every path through it (the F10 tester's ask).
  - **Paths that compete:** a Grove sits on one path and an elite on another, so with C1 "repair or prize" is a real choice.
  - **"?" nodes** resolve to an event or a short battle.
  - **Events that bend the next battle or the route.** Each needs a new `RunEffect` kind:
    - Scout's Trail: pay 5% max HP to swap the next battle's general;
    - Rot Wager: the next battle's general takes an elite modifier, and its spoils get +1 rarity step;
    - Root Tunnel: pay 15% max HP to skip a battle node.
  - **Retire Amber Seep** until Amber buys something.
  - **Route shape as data** (`balance.route.rows`), so a shorter run (5 rows, 4 battles) can be measured if C1 makes runs too long.
- **Feel:**
  - Between battles you plan two rows ahead: "Take the left path to the Grove, then the elite with the rare relic before the boss".
  - Events become levers on the next fight, not "nothing happens".
- **Implementation:**
  - `src/run/route.ts` (shape from data; `RouteNode` gains `next: number[]`);
  - `src/run/flow.ts` (`chooseNode` validates links; new `RunEffect` kinds in `resolvePending`; `src/data/schema.ts`);
  - `src/ui/screens/run.ts` (edges and hover paths);
  - `src/run/auto.ts` (route policies);
  - `data/events.json`.
  - A route-shape change bumps the run save version (`RUN_VERSION`, with a migration or a clean "this run can't resume" notice).
  - Proto knob `branching`. Run layer only, so no battle golden moves.
- **Test:**
  - `--checks runs` (boss reach, run length).
  - Playtest: "Did you plan more than one row ahead? Did you ever pick a path for its Grove?"
- **Effort:** M.
- **Timing:** after P4, whatever it decides.
- **Depends on:** C1 (repairs only matter with lives); C3 and C6 (things worth seeing from row 1).
- **Ledger:** F10 (never addressed; SPEC §8.2 and D21 call full links "deliberate", so this needs the user's OK to change); CX-8 ("commit to a route consequence"); SP-6 (events that bend rules: never addressed).
- **Sources:**
  - Slay the Spire's map;
  - Monster Train's paths;
  - BTD6 Rogue Legends' "pay a heart to skip";
  - 9 Kings' attacker reroll ([`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) mechanics 8, 9).
- **Risks:**
  - The route generator and the run measurements change.
  - A planning layer adds reading. Keep the graph small (3 columns).
  - **Learning load:** moderate, and it only pays off once C1 and C6 exist.

### C8. An unlock cadence that teaches: staged unlocks with the quest printed on the locked card
- **Problem:**
  - Unlock cadence: SPEC §9.8 wants the first unlock in runs 1–2, and today there's nothing to unlock.
  - F8: everything is live from run 1. Under `rework` that's 17 buildings, 21 relics, 3 commanders and about 10 new rules. Generals field Bursters, Driftlings and Tunnels from battle 1 that the player can't build and hasn't been told about ([`rework-state.md`](../rework-state.md) §5.2 risk 6).
- **Change:**
  - **A new profile starts small:** Vesper only, with her 6 core buildings plus 3 shared ones, about 10 relics, and none of the rework's newcomers.
  - **Each locked commander, building or relic shows its quest on its card** (9 Kings). For example:
    - "Finish a run (win or lose)" unlocks Armilla, then Cordis (Slay the Spire 2);
    - "Lose a battle to a Burster" unlocks the Burster Pod;
    - "Win a battle against a flyer" unlocks the Drift Stalk.
  - **Generals field only what the player has unlocked, plus one**, so battle 1's enemy is readable.
  - **A Settings toggle, "Unlock everything",** for returning players and the user. The tools and `?proto=` stay fully unlocked.
- **Feel:** "One new thing every run or two". The first runs are smaller and readable, and each unlock is a small event with a reason to try it.
- **Implementation:**
  - the profile from C5;
  - `draftPool` and pool creation (`src/sim/create.ts:170–188`; relics already have an unused `unlockedBy`, `src/data/schema.ts:664`);
  - `generalKit` filters the roster (`src/run/flow.ts`);
  - `src/ui/screens/underroot.ts` locked cards with quest text;
  - feat → unlock rewards in `data/feats.json`;
  - tests. Guardrails run with everything unlocked (the default for tools).
- **Test:**
  - `npm run sim -- --meta-progress` (listed as not built in `tools/sim.ts:15`) against §9.8's pacing: first unlock by run 2, half by run 15.
  - Playtest with a fresh profile: "Was the first run easier to follow? Did an unlock make you want another run?"
- **Effort:** L.
- **Timing:** after P4, whatever it decides. The gated pool is the adopted roster.
- **Depends on:** C5.
- **Ledger:** DR-28 (horizontal unlocks that teach: never addressed); F8 (tutorial and staged unlocks open, "can be revisited later"); DR-31 (codex). SPEC §9 plans gating in M6 but not as a teaching ladder.
- **Sources:**
  - 9 Kings' quests on locked kings;
  - George Fan's spacing and limited early options;
  - Kingdom Rush's one new threat per level;
  - Slay the Spire 2's unlock on any run end ([`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) mechanic 20; [`research-one-more-run-and-feel.md`](../research-one-more-run-and-feel.md) practice E22).
- **Risks:**
  - It could hide the rework's pieces from the very playtests that judge them. Hence the toggle, and staying off `?proto=`.
  - Every gate is a new state to test. A small starting pool must still win battle 1: measure with `--checks runs` on the reduced pool.
  - **Learning load:** it lowers it. That's the point.

### C9. A Decay ladder after the first boss win, with today's hardest fight as a rung
- **Problem:** D3. Winning leads nowhere, and the summary hard-codes "Decay 0". The opt-in difficulty ladder is every reference game's answer for players who've won once.
- **Change:**
  - Pull a minimal §9.6 ladder forward as cumulative steps (Slay the Spire's Ascension, rather than §9.6's free toggles). The first win with a commander opens Decay 1 for that commander.
  - **Each step adds one blight** and Spores × (1 + 0.1 × Decay):
    1. Hardened Rot (enemy buildings +15% HP);
    2. **Mother's Brood:** Old Mother Mold may appear in battle 1 again. Today's base difficulty becomes an opt-in rung, as Wildfrost did;
    3. Early Storm (3:00);
    4. Quick Learner (the warning comes 1 wave ahead);
    5. Famine (stipend −25%);
    6. the Veteran boss.
  - The best Decay per commander shows in the Underroot.
- **Feel:** after the first win there's a next rung with a name. Each rung changes something you can see, and a win at Decay 3 means something.
- **Implementation:**
  - Most blights are modifiers that already exist (`side.stipend`, `battle.sporestormStart`, building HP modifiers, elite effects); generals' `appearsIn` is set per run.
  - Apply the run's modifiers in `battleConfig` (`src/run/flow.ts`), as `hotStart` does.
  - The profile (C5) stores the unlocked and best Decay.
  - A proto/tool knob `decay:<n>` makes it measurable with `--checks runs`.
  - Replace the summary's "Decay 0" row with the real value.
- **Test:**
  - `--checks runs` at Decay 0–6, so each rung costs a measurable step (for example 5–8 points of runs won).
  - Playtest after a first win: "Did you want to try Decay 1?"
- **Effort:** M.
- **Timing:** after P4, whatever it decides. Blight effects depend on the model: under storm-grown waves, Early Storm also doubles waves sooner.
- **Depends on:** C5 (the profile), C3 (a boss worth climbing to), C2 (Mold out of the base battle 1, so Brood is a rung).
- **Ledger:** DR-30 and SPEC §9.6/§11.8 (planned M7). **What differs:** pulled forward and cumulative, and it moves battle-1 Mold into an opt-in rung ([`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) mechanic 21's "move some of today's difficulty into a blight").
- **Sources:** Slay the Spire's Ascension, Hades' Heat, Balatro's stakes ("a checklist to work through"), Wildfrost's Storm Bells after lowering base difficulty, Brotato's Danger levels ([`research-one-more-run-and-feel.md`](../research-one-more-run-and-feel.md) practice E21).
- **Risks:**
  - It only matters to players who already enjoy winning. Do it after C1–C5.
  - Each blight needs a G3/counter check.
  - **Learning load:** opt-in, after the first win.

### C10. Later bet: a Season per run, and a local seed of the week
- **Problem:** D5 and run variety. Every run draws from the same pool, maps and generals, and nothing gives a reason to come back on a given day.
- **Change:**
  - **Seasons:** each run rolls one global rule that applies to both sides (so the general stays honest), shown on the route from row 1 and never repeated within 3 runs (stored in the profile). Examples:
    - Wet Season: loam yields double, and the storm starts 1:00 later;
    - Swarming: swarm spawners +1 unit, knit 50% faster;
    - Spore Fall: every 4th beat a burst lands on the front;
    - Rot Year: every general carries an elite modifier, and spoils get +1 rarity.
  - **Seed of the week:** a local challenge with no backend and no leaderboard. The seed comes from the ISO week, with a fixed commander and Season, and the best result goes in the profile. A seed code you can type or share (`?seed=` already exists).
- **Feel:** "This run is a Swarming year" changes what you draft from the first card, and Monday's new weekly seed is a small reason to open the game.
- **Implementation:**
  - Seasons are `effects.modifiers` on existing stats, applied in `battleConfig` (as elites are), and drawn on the `route` stream.
  - The weekly seed needs `src/app/main.ts` seed selection, a title-screen entry and profile records.
  - Proto knob `season:<id>` for measurement.
- **Test:** each Season with G3 and the counter matrix (`npm run experiment -- --proto rework,season:<id> --checks counters,g3`) and `--checks runs`. Playtest: "Did the Season change your first picks?"
- **Effort:** L.
- **Timing:** later bet.
- **Depends on:** C5 (records and no-repeat), C1 (runs long enough to feel a Season).
- **Ledger:**
  - DR-34 (Spore Trials) was rejected as out of scope (§17 #1 backend and leaderboards, #15 daily-seed UI), and OMR said "a local-only version is cheap. Defer". **What differs:** no backend, no leaderboard and no daily cadence, only a weekly local seed. It still needs §17 #15 edited.
  - Seasons themselves were never proposed in the repo.
- **Sources:**
  - HS Battlegrounds anomalies;
  - TFT portals;
  - Against the Storm's Forest Mysteries;
  - Super Auto Pets' weekly pack ([`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) mechanic 5).
- **Risks:**
  - Each Season multiplies the balance surface.
  - HS players call anomalies unfair; telegraph them and apply them to both sides.
  - **Learning load:** one rule per run. Do it after C8 has reduced the base load.

---

## 4. Suggested order

1. **Before or during the P3 playtest (no code):** play a second pass with `?proto=rework,hotstart` (C2), and time a full run on the clock. Add these run questions:
   - After a battle-1 loss, did you want to go again at once?
   - Did the boss feel like a finale?
   - Did you ever repair at a Grove?
   - How long did the run take?
2. **Now, independent of P4:**
   - C4 (UI only);
   - the C1 knob (`lives`), measured with `--checks runs` and offered as `?proto=rework,hotstart,lives`;
   - C5's profile scaffold with records and goals.
3. **With P4:** adopt a run-arc package and measure it as a whole:
   - `hotstart`;
   - lives;
   - the boss knob (C3 stage 1);
   - Mold's battle-1 eligibility.

   The user sets the target band first.
4. **After P4:** C6 and C7 together (risk that pays, on a route you plan), then C3's Edicts, C8, C9, and C10 last.

## 5. What this lens deliberately doesn't propose
- **ER-2d, enemy-held columns draining run HP:** territory anti-predicts the winner (37–44% at 2:00–4:00), so it would punish winners.
- **A bigger version of the same boss:** the levers measured here move it between +2 and −13 points, and the biggest move needs the emulated mirror and income levers together.
- **A battle-level near-miss readout:** it would fire in about 3–5% of losses, so it would be fiction. Run-level distance replaces it (C4).
- **A draft every wave (DR-23) and shorter battles before the cliff is fixed (DR-22):** both rejected in the ledger, with no new angle here.
