# Critique C: run structure and long-term pull

Evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): a critic's check of [lens C's proposals](c-run.md). Written by an agent during that review; nothing here is adopted, and the review's [Appendix A](../../after-the-rework.md#appendix-a-every-surviving-proposal) holds the final verdicts. Recovered from the session transcript, so raw outputs weren't kept.

Written 2026-10-31 against `develop` at `ef2e133` (a local checkout). I checked every claim I could against the code, the data, SPEC, the [ledger](../ledger.md) and the research files ([lane battlers](../research-lane-battlers.md), [auto-battlers](../research-autobattler-roguelites.md), [one more run and feel](../research-one-more-run-and-feel.md)). I also re-ran the proposer's analysis ([`analyze.py`](../scripts/lives/analyze.py)) on their stored outputs (raw output not kept). Nothing was modified.

## Verdicts at a glance

| id | Title (short) | Verdict | Impact | Confidence | Effort | Timing |
|---|---|---|---|---|---|---|
| C1 | Lives by battle index | **revise** (small fixes) | 5 | 4 | M | now |
| C2 | Fair first battle | **revise** (drop Mercy) | 4 | 4 | S | now |
| C4 | Run it back, honest summary | **revise** (active time; practice battle is M) | 3 | 4 | S (+M) | now |
| C3 | Boss as summit | **revise** (knob now; Edicts with E6; mirror demoted; drop re-root) | 3 | 2 | M | knob now, rest after P4 |
| C8 | Unlocks that teach | **revise** (drop general filtering, use D7) | 3 | 2 | L | after P4 + C5 |
| C5 | Profile, records, feats | **revise** (records now, feats after P4, no banked currencies) | 2 | 3 | S / M | records now |
| C6 | Elites that pay | **revise** (rarity mechanism wrong; drop the spoils split) | 2 | 2 | M | after C1 |
| C7 | Branching route | **revise** (split: route shape as data now, graph later) | 2 | 2 | S / L | split |
| C9 | Decay ladder | **drop** | 2 | 2 | M | — |
| C10 | Seasons, weekly seed | **drop** | 1 | 1 | L | — |

**Order for the user, given the playtest is next:** before or during P3, put `hotstart` in the URL (C2 stage 1, no build) and do C4's restart and honest summary (small UI). Build the `lives` knob (C1) next, so it can join the playtest URL if the user agrees. The boss knob (C3 stage 1) can be built and measured now, but leave it unadopted until P4. Everything else waits for P4 and for C1 to make HP worth something.

---

## C1. Lives: a lost battle costs run HP by battle index, not the run: revise

**Why it survives.** This is the strongest proposal in the set.
- The problem is well supported. I re-ran [`analyze.py`](../scripts/lives/analyze.py) on v0: 49% of runs end in battle 1, a lost battle 1 is recovered in 2 of 159 runs, Groves repair 3 of 98 times, and 92% of battles start at full HP. Both playthroughs died in battle 1 with 0 Spores and 0 XP.
- It repeats nothing that failed: ER-2c and RD-2 were never addressed, and [run-loop](../run-loop.md)'s flat-40% emulation was measured but not built.
- What's new: the cost scales with battle index, it's measured with `hotstart`, there's a target band, and it names the pitfall in `finishBattle`.

**What's wrong or missing:**
1. **Rot Ward isn't a repair relic.** It's "Heartcap turrets +25% damage" (`data/relics.json`). Lives don't revive it, so take it off the list of dead systems. The rest of the list is correct: Mending Moss, Quiet Clearing's Rest (`repairPct` 0.15) and Fallen Oak's `maxHpPct` −0.15.
2. **A Decision loss can cost more than a Rout loss.** Under lives, a Decision loss still uses the battle's end HP minus 25% (`flow.ts:237–239`), while a Rout costs a flat 34–67% from `before`. In v0, 2 of 20 Decision losses cost 85–100% of max HP. Cap a Decision loss at that battle's Rout cost.
3. **The arithmetic is slightly off.** At 34/50/67 with full HP you survive losses in both battles 1 and 2 (84% in all), not just "one early loss". Only a third loss, or one battle-3+ loss below 67% HP, ends the run.
4. **The length risk is overstated and partly mitigated.**
   - A full run's battle time doesn't change: the median won run is 23–25 bot battle-minutes with or without lives. What changes is that most runs now become full runs.
   - The game has 1×/2×/3× speed (`battleView.ts:136`), and the newcomer played several battles at 3×.
   - Report the time at the speeds people actually use.
5. **The commander gap doesn't move** (v8: 85/61/69 runs won), so lives shouldn't count toward the "spread toward 15" target.
6. **One signature change was missed:** `battleRewards` is also called by the node chip `eliteReward` (`src/ui/screens/run.ts:94–97`), which needs the new index parameter or a default.

**Verified:**
- `rewards.ts:35` (`heartcapZero`), `flow.ts:235/237/238/275`, `balance.json` `routRepair` 0.1, `decisionLossDamage` 0.25, `groveRepair` 0.3; the schema at line 313; `tests/unit/run.test.ts` exists; `proto.ts` has no `lives` preset yet.
- The emulation's logic: relabel the loss as a Decision, then set end HP = `before` − (cost − 0.25) × max.

---

## C2. A fair first battle: revise

**Keep stage 1.** Putting `hotstart` in the P3 URL is free, it's already built, and the fresh numbers under the rework check out (v6): battle 1 lost 53% → 26%, runs won 18% → 31%. It's a re-recommendation (OMR-6), but it's the right one, and the ledger notes that `rework` doesn't include it.

**Stage 2 should be framed as a choice, not a step.** With C1, run deaths in battle 1 are already about 0% (v8: 1 of 300), so moving Old Mother Mold out of battle 1 becomes a teaching decision rather than a survival fix. The user may prefer to keep the swarm lesson in battle 1 and rely on lives. Without C1, moving her moves the wall to battle 2 (41%).

**Drop Mother's Mercy:**
- It's an easier mode the game offers after a failure. That's what §17 #14 rules out: "Difficulty is the honest baseline plus blights."
- Under C1 it almost never triggers: runs that end in battles 1–2 are about 0–1% (v1, v2, v8).
- It also needs C5.

**Add the cheap tip question:**
- The battle-1 economy tip (`src/app/tips.ts`) fires at 0:30 whenever there's no economy building. Against Mold, who opens two Burrows and no economy, it points newcomers at the weaker opener ([playthrough-strategist](../playthrough-strategist.md) §3).
- That's one player's evidence, so measure a Cellar opener against a no-Cellar opener versus Mold with the bots before changing or suppressing the tip.

**Overlaps:** E4 (choose your first opponent) and D7 (the debut knob for the rework's spawners in battle-1 kits).

**Verified:**
- `proto.ts:164–169` `hotstart`; `generals.json` `mother-mold.appearsIn` [1,2,3] with opener [Burrow, Burrow].
- Re-ran v5 and v6: Vesper/Armilla/Cordis win 43/24/27% of runs under v6 and 48/31/32% under v5.
- §17 #14's text.

---

## C3. Make the boss the summit: revise

**Keep:** the fresh measurement that flat levers barely move the boss (v3 84%, v4 79%, v9 82%, v10 89%, against 87%), and a boss-only modifier slot.
- The slot is needed: `hotStart.battles[i]` can't target the boss, which is battle 4 or 5.

**Problems:**
1. **The mirror conflicts with a standing principle.**
   - A boss that copies your whole kit at your levels scales with your power, so it cancels SPEC §12.1's "Rare broken runs are welcome" and the user's "a strong build isn't the bug, a build with no answer is". "It punishes mono builds most (intended)" is exactly that conflict.
   - Make Mirrors one Edict among several, not the boss's base rule. E6 already proposes the Edict set with "Tests / Answered by", and it does this part better.
2. **We don't know what makes the mirror work.** The emulation adds the kit and the upgrade levels together, and gives the new buildings `aiWeights` 1 without checking the Gray Rot roster. Measure a levels-only and a kit-only mirror before building either.
3. **Drop stage 3 (re-root at 40%).** The `breach` evidence covers it: stretching a falling Heartcap changes no outcomes (0 comebacks in 720 under rework with breach; the loser has 0 units at the first hit).
4. **"Many" (waves 25% bigger) depends on P4 keeping waves.**
5. **The fun is in the known test, not the win rate.** The win-rate band is the user's call, and a lower number alone isn't a finale. Lead with the Edict and use the slot to tune it.

**Verified:**
- `generals.json` pale-sovereign: even weights over 11 buildings, opener of 3; `balance.json` `enemyKit` boss 7 buildings / 4 levels; `heartcapEnemyHp.boss` 3600.
- The boss counters come from intel (`bossCounters`).
- v13, v15 and v16 re-run (v16: boss 75%, runs won 62%, 75/49/61).

---

## C4. Run it back: revise

Cheap, honest, and aimed straight at the restart friction (DR-33, DR-32, CX-6). Keep the core.

**Corrections:**
1. **Wall-clock time since `startedAt` is wrong for this game.** Runs save and resume across sessions (`loadRun`, Continue on the title screen), so a wall-clock span counts time away. Accumulate active seconds while a run screen is visible.
2. **The practice battle isn't S.**
   - `finishBattle` overwrites `run.kit`, upgrades and relics with the end-of-battle loadout, so the pre-battle config is gone.
   - The single-battle `restart(seed)` path rebuilds configs from URL params (`buildState`), not from a `BattleConfig`.
   - So the run has to store the last battle's config, and `RunController` needs a no-rewards battle session. Make it step 2, effort M.
3. **"Run it back" is easy:** `this.start(createRun(content, { seed: newSeed(), commander: run.commander, bans: run.bans }))` in `src/app/run.ts`. Save the remembered choice through the same storage the run uses, so a proto run remembers it inside its own proto space.
4. **"What beat you" should use stats that exist:**
   - the most-built building from `stats.enemy.buildingTypes`;
   - peak Elders from `maxEldersAlive` (not "38 Elders", which would be merges);
   - and keep the honest constraint: battle-level near misses are 3–5%.

**Overlap:** D8 (a report that explains the loss).

**Verified:** `run.ts:602–608` rows; `main.ts:177` `DEFAULT_COMMANDER, bans: []`; `main.ts:268–269` rematch; `RunController.newRun` goes through `setup()`, the Underroot; SideStats fields (`state.ts:630–661`).

---

## C5. A profile that remembers: revise

Records are cheap and help. The rest has issues:
1. **Banked Spores, Amber and XP that buy nothing repeat the problem D5 names:** "advertising absence". "+2 Spores per building destroyed" on a loss is also a §8.6 reward-rule change for a currency with no use. Drop both until something spends them.
2. **Feats are tied to the combat model, which the user has deferred until P4.**
   - "3 Elders alive at once" is trivial under waves: merges rise ×2–4, and the newcomer met 8 enemy Elders at once. It pays the swarm, just like the Swarm Mind feat the proposer rightly left out.
   - "Win a run after losing a battle" exists only with C1.
3. **Storage isn't solved by "proto runs save under their own space":**
   - On the dev site, a proto run's keys are `proto=<spec>/…` (`protoSpace`, `src/app/channel.ts`). A profile stored the same way resets every time the playtest URL changes (`rework` → `rework,hotstart,lives`).
   - Decide it: one profile per build (`storageKey('spore-sprawl/profile/v1')`) that tags each record with its proto spec, or per-spec profiles.
4. **The strategist's only pull was "curiosity about the cards I never saw".** A "cards seen" codex (DR-31) answers that more directly than feats, and it's cheap once there's a profile.

**Verified:** SPEC §9.2 (DSL, the feat table including Elder Council and Swarm Mind), §9.7 (`spore-sprawl/profile/v1`), `runState.ts` holds the currencies, `.claude/rules/storage.md`.

---

## C6. Risk that pays: revise

1. **The mechanism is wrong.** Setting `rareBonus` from 10 to 60 doesn't give "1 of 3 rares".
   - `rarityWeights` (`src/sim/draft.ts:40–45`) only moves weight from common to rare, so uncommon keeps 25 of 100 at any bonus.
   - There are only 6 rare relics, so offers fall back to lower rarities once they're owned.
   - A guaranteed rare needs a rarity filter in the offer options, as `gainRelic` has.
2. **Loot from the general adds no new content today.** The Gray Rot plays the Velvet Bloom roster, and `draftPool` puts every faction building in the player's pool (core, or shared minus bans). So loot is a known, guaranteed card, not 9 Kings' foreign tools. That's still useful as a "known drop". Merge it with E7's trials, which give it a reason.
3. **Drop the spoils/draft type split.** Moving the relic weight from 20 to 5 in battle takes the only cards that change play (3 of 21 relics) out of the most frequent decision point, and it doesn't make cards bigger, which the ledger says is the real problem (ER pillar 4, OMR). F9 is already answered by the spoils labels.
4. **The evidence is thin at small samples.**
   - v0's "elites lost 41% vs 36%" is 50/121 against 50/140, inside the noise on its own.
   - It's consistent with [run-loop](../run-loop.md) (44% vs 34%) and v8 (122/315 = 39% vs 110/362 = 30%), so the direction stands.

**Verified:** `rewards.ts` (`eliteRareBonus` 10, relic-only pick), `balance.json` `draft.typeWeights` {35,45,20} and rarity [70,25,5], no `spoils` key, `auto.ts` route policies first/random/battles.

---

## C7. A route you plan: revise and split

- **Now (S):**
  - Make the route shape data (`balance.route.rows`), so a 4-battle run can be measured if C1 makes runs too long.
  - Fix the dead events: 6 of 8 have "nothing happens" as the alternative, and Amber Seep is a trap (verified in `data/events.json`).
- **Later (L, not M):** the branching graph.
  - It needs the generator, hover paths, `chooseNode` link checks, auto policies, new `RunEffect` kinds, a `RUN_VERSION` bump with a migration, and SPEC D21 changed ("fully connected … still a real choice every step").
  - With only rows 2–5 to choose in, the planning depth is short. It earns its cost only after C1 (HP is worth repairing) and C6/E7 (prizes worth routing to).

---

## C8. An unlock cadence that teaches: revise

- **Drop "generals field only what's unlocked plus one":**
  - It makes the enemy depend on a player's profile, so the general a new player meets is never what the guardrails measure.
  - D7's `debut` knob does the job better: the battle index from which each rework spawner joins the generals' kits and the pool. It can be measured now.
- **Keep the ladder idea (DR-28) for after P4:**
  - The roster may change: CR-15 may drop the Rhizomorph.
  - It needs C5.
  - It replaces SPEC §9.2's commander unlocks (Long March → Armilla, Elder Council → Cordis) with teaching quests, which needs the user's OK.
  - Starting Vesper-only is good: she's the strongest commander (28% of runs won against 12–13%).
- **Small fact:** `unlockedBy` is at `schema.ts:665`, not 664, and `rotEater` already uses it (unused by `draftPool`).

---

## C9. Decay ladder: drop

- **It's the planned M7 system pulled forward:**
  - 4 of its 6 rungs are SPEC §11.8's blights (Hardened Rot, Quick Learner, Famine, Early Storm).
  - Its reward is §9.6's Spores × (1 + 0.1 × Decay), for Spores that buy nothing.
  - Its "best Decay per commander in the Underroot" is §9.6 verbatim.
- **Nothing calls for it yet.** No human has won a run under the rework; both playthroughs died in battle 1.
- **It depends on C2, C3 and C5.**
- **Two ideas are worth keeping as notes for M7** (in `docs/ideas/`): a cumulative, Ascension-style order, and turning today's battle-1 Mold into an opt-in rung.

## C10. Seasons and a weekly seed: drop

- **Out of scope by name:** §17 #15 lists "seasonal challenges, a daily-seed UI, and seed sharing", and DR-34 was rejected.
- **It multiplies the balance surface** while the combat model is unsettled.
- **"Swarming" points the wrong way:** it buffs swarms, which already win alone (the G3 failure).
- Park it in `docs/ideas/` if wanted.

---

## Missing from this lens

1. **Commander parity in battle 1.**
   - D6 diagnoses it, and no proposal answers it.
   - Under the rework, Armilla's battle-1 losses go from 36% to 61%, and Cordis's from 35% to 56% (Vesper 34% → 38%; [measurements.md](../measurements.md)). Without waves, Armilla and Cordis lose 34% and 42%.
   - Armilla's starter (Capguard Hall, Truffle Cellar, Puffball Mortar) fields a single unit type, so her early waves never get mixed-wave shields. `hotstart` widens the gap: battle 1 is lost 13% by Vesper and 32% by the other two.
   - Proposal: measure battle 1 by commander × general under `rework,hotstart`, then trial a commander-aware deploy draft, or a starter swap, as a default-off knob. This is a multi-commander retune, so it needs the user's OK. It overlaps [B](b-builds.md)'s commander-gap diagnosis.
2. **Skip the decided ending.**
   - The loser's army is gone about 2 minutes before the end ([measurements.md](../measurements.md)). The newcomer's battle 3 was decided by 3:33 and ended at 6:45, and their wins "felt like formalities".
   - A "Finish" button that appears once a side has no units and at most 1–2 buildings would step the deterministic sim ahead headlessly to the result. It's UI only, and the outcome is the same as watching.
   - Under C1, an optional "Concede" would cost the same as a Rout loss.
   - It directly offsets C1's length risk. Measure the time it saves per battle.
3. **A "Copy run report" for playtesters.**
   - §17 #1 rules out telemetry, and human run length has never been measured ([ledger](../ledger.md) §4 item 14).
   - A summary button could copy the run as text or JSON: commander, proto spec, each battle's general, map, result, length at 1× and speed used, HP before and after, cards, and active time.
   - Testers could then paste numbers into their notes. It's cheap and useful for the very next playtest.
