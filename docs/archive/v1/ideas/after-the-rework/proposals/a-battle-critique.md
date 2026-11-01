# Critique of lens A, "Battle arc and agency"

> **Archived: v1 era.** Written before [SPEC v2](../../../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../../../README.md)).

Evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): a critic's check of [lens A's proposals](a-battle.md). Written by an agent during that review; nothing here is adopted, and the review's [Appendix A](../../after-the-rework.md#appendix-a-every-surviving-proposal) holds the final verdicts. Recovered from the session transcript, so raw outputs weren't kept. Neither was the revised text its "see `revised`" notes point to, which the critic returned with its verdicts; Appendix A says where each revised proposal went.

Written 2026-10-31 against `develop` at `ef2e133` (a local checkout, read only). I checked each proposal against the ledger ([`ledger.md`](../ledger.md)), the code, the data, the docs and the review's evidence reports. I also checked it against the sibling lenses' drafts ([`d-feel.md`](d-feel.md), [`e-opposition.md`](e-opposition.md)).

## Verdicts at a glance

| Id | Verdict | Impact | Confidence | Effort | One line |
|---|---|---|---|---|---|
| A1 Rally | **revise** | 4 | 3 | M | The right idea. Its window is real but smaller than claimed, its name collides with Hold's "rally line", the turret term does almost nothing, and the AI's use touches SPEC §17 #13 |
| A2 Storm ramp | **revise** | 2 | 2 | S | This reopens a user decision from 2026-10-31. Variant (c) is described wrongly. It won't make comebacks. Make it a zero-build P3 URL first |
| A3 Decision support | **drop** (merge into D1/D9) | 3 | 4 | M | Near-duplicate of [lens D](d-feel.md)'s D1 (army gauge, gate strip) and D9 (honest prices, waiting placement), which are fuller. The ghost already shows the price at the cursor |
| A4 Held wave knits | **revise** | 3 | 2 | L | Knitting per building can't make Elders inside one hold. It must pool by lane. Separate the removal of field merging from it, and ask the user first |
| A5 Call the beat | **revise** | 3 | 2 | M | The gold payoff is an exploit: calling right after a beat is a free hold for both sides plus 20 gold per lane per minute |
| A6 Sally | **revise** | 2 | 3 | S | Sallied units leave untagged, so they lose the beat's shield and trickle. One peck from a Driftling or Rhizomorph would fragment a mixed wave |
| A7 First beat at 0:10 | **revise** | 2 | 3 | S | Deeper spawners' early release would make their first batch miss the 0:10 wave. It's conditional on P3 in [`rework-state.md`](../rework-state.md) §4.1 |
| A8 Reinforce | **drop** (park) | 2 | 2 | M | "Gold piles up" isn't evidenced under the rework. At about 10× a building's amortized price it's a last-resort sink. It adds G5 risk |
| A9 Overtime | **drop** (park) | 1 | 2 | M | It covers 6% of run battles. The 10 s overtime beat adds no pressure and breaks waves apart. "First building destroyed" swaps one technicality for another |

## New measurements for this critique

The scripts are in [`scripts/second-wind/`](../scripts/second-wind/) ([`ts_used.ts`](../scripts/second-wind/ts_used.ts), [`trig.py`](../scripts/second-wind/trig.py), [`trig2.py`](../scripts/second-wind/trig2.py), [`behind.ts`](../scripts/second-wind/behind.ts); output in `behind.txt`, raw output not kept). The sample was `rework`, Bogwater, `bot:balanced` with each commander and auto power against the four battle-1 generals, 20 seeds: 240 battles. Bots aren't people.

### 1. A1's window is about 80–95 s, not 117 s

The proposer's [`army_window.py`](../scripts/second-wind/army_window.py) counts a trigger after two consecutive 10 s samples. That's 10 s of sustained deficit, not the 20 s the proposal specifies.

| Trigger (loser ≤ 0.5× the opponent, opponent ≥ 10, after 1:00) | Seconds before the end, median (IQR) | Clock | Loser's buildings / bank | Eventual winner also fires |
|---|---|---|---|---|
| Proposer's method (10 s sustained), field supply | 111 (64–197) on this sample; 117 on [`measurements.md`](../measurements.md)'s 720 | ~4:30 | 5 / ~90 | 27–28% |
| 20 s sustained on the 10 s grid, field supply | 94 (42–178) | — | 5 / ~90 | 20% |
| 20 s sustained on 5 s samples, field supply | 77 (40–169) | 5:10 | 5 / 94 | 16% |
| 20 s sustained on 5 s samples, **`supplyUsed`** (stored units counted, as A1 specifies) | **76 (43–187)** | **5:10** | **5 / 96** | **14%** |

Counting stored units, as A1 does, barely moves the trigger. Stored units are a median 25% of `supplyUsed` after 2:00 (IQR 8–43%). The window is real: about 1¼ to 1½ minutes, with 5 buildings and ~95 gold left. It's two thirds of what was claimed.

### 2. Holding with today's Hold while behind doesn't produce comebacks

[`behind.ts`](../scripts/second-wind/behind.ts) has the player hold every lane whenever the trigger above is on, against no holds. That's 30 seeds against each battle-1 general, with no commander.

| General | No holds: wins | Hold while behind: wins | Came back after being 2:1 down (none → behind) |
|---|---|---|---|
| Scripted | 15/30 | 14/30 | 1 → 0 of 15 |
| Old Mother Mold | 2/30 | 2/30 | 0 → 0 of 28 |
| Lichen Baron | 16/30 | 15/30 | 4 → 3 of 17 |
| Blightwright | 9/30 | 8/30 | 2 → 1 of 21 |

A doubled wave alone isn't enough weight. A1 needs its extra batches and shields, and "teach the player to hold when behind" isn't a substitute. The newcomer's best moment was still a Hold double wave that turned a battle: run 2, battle 1, 5:13, "a swing I caused". So the shape is right for people.

### 3. Comeback income pays the winner as often as the loser

That's in the same 120 battles. Comeback gold is `min(6, floor(column deficit / 2))` a tick (`src/sim/systems/economy.ts`, `incomeSystem`). Under the rework it went to eventual winners as often as to losers: **69 against 69 gold a battle on average**. Against Old Mother Mold it was 77 to the winner and 19 to the loser. The strategist collected 277, 247 and 219 while ahead in army, and a flyer army collects it for holding no ground. Nobody in lens A proposes fixing it (see "Missing").

---

## A1. Rally (revise)

**What holds:**
- Comebacks are 0 of 720 under `rework`, with or without step B ([`measurements.md`](../measurements.md)).
- `breach` gives 31 s and changes no outcome.
- The loser has 1 building and 0 units at its Heartcap's first hit.
- OMR-8 (a rally before the base falls) was never addressed.
- The army trigger is a better key than buildings: the buildings trigger fires 42 s before the end, which reproduces. It's also better than the Heartcap.
- `releaseStored`, `emerge`, `u.shield`, `turretSystem`'s `ss.turretCooldowns[i] = t.intervalTicks`, the command union in `state.ts` and the movement.ts:60 rally skip are all as described.
- The power cooldowns (75 / 75 / 80 s) check out.

**What's wrong:**
- **The window is overstated** (measurement 1). It's about 76–94 s, around clock 5:10, not 117 s at ~4:30. The eventual winner earns a charge in 14–20% of routs, not 27%.
- **"Nothing lets it fight back"** ignores the newcomer's one comeback, which came through Hold ([`playthrough-newcomer.md`](../playthrough-newcomer.md), run 2 battle 1). The proposal quotes only run 1's "no comeback lever".
- **The name collides.** "Rally line" is Hold's term in SPEC §5.2, in the Hold button's text (`battleView.ts:178`) and in `laneStance.rallyBack`. SPEC §17 #6 also lists "rally points" as out of scope.
- **The turret ×2 term is close to cosmetic.** There are 2 turrets a lane at 18 Pierce a second, ×0.5 at storm 5. Doubling their rate for 20 s adds about 360 damage against a 34–56-supply army, much of it Elders. It costs a rule and a tooltip line.
- **The general spending a charge is close to an "active power for enemy generals"** (SPEC §17 #13). The user can waive that, since the spec is malleable, but the proposal should say so. Alternatively, the general's charge could fire automatically when earned.
- **The Elder problem.** The strategist: "20% HP once a wave doesn't offset a ×6.25 Elder". Rallied tier-1 units with 40% shields may only delay. The test should report Elders on the winner's side at the trigger.

**The corrected proposal is in the verdict's `revised` field.** In short: rename it (Second Wind), drop the turret term, tag rallied units with the upcoming wave, measure a no-button variant in which releasing a held lane spends the charge, and depend on D1's gauge instead of A3.

## A2. A storm that ramps instead of floods (revise)

**What holds:**
- The paths exist and override cleanly (`proto.ts` `setPath`): `stormWaves.perStack`, `sporestorm.heartcapTakenPerStack`, `sporestorm.turretDamagePerStack` and `sporestorm.startSeconds`.
- Today's storm (`data/balance.json`): start 240 s, every 60 s, 5 stacks max, +10% unit damage, −10% turrets and +20% Heartcap taken per stack. With `STORM_WAVES` at 0.2 that's ×2 waves at 8:00.
- Without storm waves, G3 Veilstalker was 45/61 and Decisions 27% ([`combat-rework.md`](../../combat-rework.md#what-p2-found) P2 table).

**What's wrong:**
- **It reopens a user decision.** On 2026-10-31 ([`combat-rework.md`](../../combat-rework.md#decisions-2026-10-30) Decisions) the user ruled: "The storm stays at 20% a stack. P2 accepts 18–22% Decisions." That ruling is about `stormWaves.perStack`. The proposal says it "doesn't reverse P1d", but halving the slope is exactly what was decided against. The new evidence is two agent playthroughs, not the user's playtest.
- **Variant (c) is described wrongly.** `startSeconds:180` with `everySeconds` 60 and `maxStacks` 5 brings full strength a minute *earlier* (7:00), then holds flat for 3 minutes. That's less total pressure (about 2.5 against 4.0 extra wave-minutes), with an earlier onset and no escalation after 7:00. It isn't "the same pressure spread from 3:00".
- **Variant (b)'s Heartcap term isn't new.** It's `breach`'s `sporestorm.heartcapTakenPerStack:0.1` (ER-2a). Step B measured it at ±3–4 s on the fall.
- **"A lead built in minutes 2–6 carries into the end" is already true.** The material leader at 5:00 wins 82% ([`measurements.md`](../measurements.md)). The storm speeds up the conversion of a lead; it doesn't reverse leads. Comebacks without waves, and so without storm waves, are 2 of 720. The real problem in the playthroughs is that the lead couldn't be *seen*, which is D1's job.
- **The A9 fallback** inherits A9's problems (below).

**Correction:** see `revised`. It's a zero-build P3 URL first, adopted only if SP-2 says "flood", with the ramp variants corrected.

## A3. Decision support at the beat (drop; merge into D1 and D9)

**Verified:**
- `explain.ts` has `beatTip`, `waitingUnits` and `nextWaveTypes`.
- The 1280 chip overflow is 34 px ([battle-feel](../battle-feel.md) §3.4).
- Territory names the winner 39/41/44% at 2–4 minutes, and material 64/70/78%.

**Wrong or duplicated:**
- **The ghost already shows the price at the hovered column** (`battleView.ts` ~500: the price, "+N%: k columns from home", "not enough gold" from `session.ts:220`). The newcomer's notes confirm it: "The tray said 110, the ghost said 121". The real gap is the tray card's lit state, which uses the base price (`tray.ts`), and the click on an unaffordable plot, which is silent apart from the illegal sound.
- **The "pending ghost" already exists for placements queued while paused** (`renderer.ts:314`, `session.pending()`). Queued placement can reuse it, as D9 notes.
- **Effort is M, not S.** It's three UI features plus the overflow fix.
- **[Lens D](d-feel.md)'s D1 does the same job, and more fully:**
  - an army gauge whose formula is picked by measurement;
  - a gate strip of the next wave for both sides;
  - an "Outnumbered 2:1" warning on the same trigger as A1;
  - counter badges.
- **D9 is also fuller:** the tray shows the cheapest legal price, the placement waits for its gold, and F during Hold's cooldown gives feedback.
- The one detail worth carrying into D1 is putting the per-lane "you +N / them +N" comparison beside that lane's Hold switch.

## A4. Merging moves to the beat (revise)

**Verified:**
- 80 merges a battle against 24 on M5, and G7's mirror at 72% (fail).
- The strategist's Elder gaps (20–0, 40–14) and Mold's 8 Elders.
- Cordis is redundant under waves.
- `detectTrios` lives in `merging.ts`.
- The interview's merge rule (SPEC §1.2: "out of combat, anywhere") needs the user's OK. The proposal says so.

**What's wrong:**
- **Per-building knitting can't make Elders.** Stores are per building (`b.stored`), and `releaseStored` works one building at a time.
  - A Burrow makes 2 every 16 s, so a 40 s hold stores about 5. That's one Bloomed and 2 leftovers.
  - Nine of one type in one building takes 64–81 s for any 2-per-batch spawner. One hold can't reach it.
  - With `merge.field:false` as well, Elders would all but vanish. That upends mono Sporeling and the Veilstalker's slayer role, which is tuned for merged targets, far more than the proposal's "15–35 merges" suggests.
  - The knit has to pool the lane's same-type stored units at the beat, for example in `waveSystem` after the held lane's releases, at the front door.
- **Merged supply is ⅔ per step.** Nine base units make an Elder at 4s, which is 4/9 of the parts. The ⅔ figure holds for one step only. That's minor, but supply accounting has to follow SPEC §5.5's table.
- **The AI hold policy duplicates E5** (the general holds before a counter wave) and A5's. It should be one shared "AI holds under waves" knob (see "Missing").
- Keep it conditional on P3 and P4, as proposed. Measure `heldKnit` alone first: it's additive, and the user can approve it without reopening the interview rule.

## A5. Call the beat (revise)

**Verified:**
- `waveSystem` releases only when `due ≤ releaseLead`, and nothing can release a wave early.
- Setting `b.lastWave` would make the scheduled beat skip a spawner.
- ER-1b was never addressed.
- [`rework-state.md`](../rework-state.md) §4.1 names a per-lane "send now" as the response to "it feels like a metronome".

**What's wrong:**
- **The gold payoff is exploitable.** Here's what calling right after a beat does, as specified:
  1. Both sides' near-empty stores leave.
  2. Every spawner in the lane gets `lastWave` = the upcoming wave, so the scheduled beat skips them.
  3. Everything made in the next ~40 s leaves together on the beat after.
  4. The caller collects the maximum 20 gold.

  So the call is a free hold for both sides plus 20 gold per lane per minute. That's 14–40% on top of a 96–144 a minute income, on one or two lanes. "The small-wave price" falls equally on both sides, so it isn't a price. It becomes a chore: call after every third beat.
- **"Calling a held lane releases the doubled wave early" and "a side holding that lane keeps its wave home" need ordering.** Whose hold wins when the caller is also holding?
- **The AI policy should be the shared AI-holds knob** (see "Missing" and E5).
- **Needs a read to be a decision.** That's D1's gate strip, not A3.

**Correction:** see `revised`. No gold. A one-sided strike is the primary variant, with both sides as a variant.

## A6. Stored units sally (revise)

**Verified:**
- Both playthroughs show it: 450 → 238 HP with 6 stored units inside, and 450 → 186 HP with 4.
- The building-damage branch in `applyDamage` (`combat.ts` ~283) can set a flag.
- A building that's sold or destroyed already lets its stored units out (`deathSystem`, `combat.ts:478`).
- Call for help sets idle units on the attacker.
- BB-T3 is a different rule.

**What's wrong:**
- **Untagged sallied units trickle and lose shields.**
  - `releaseStored` without a wave emerges them untagged.
  - `shieldMixedWaves` shields only units with `u.wave === wave`, and `waveStep` paces only tagged units.
  - So after the raider dies they march alone, at their own speed and unshielded. They also leave the next wave short of a unit type, so it may lose its shield too.
  - The Rhizomorph targets uncovered spawners and Driftlings attack buildings. One cheap raider could strip a lane's mixed wave, and the mixed wave is what carries the strict counter bar.
- **The test omits the strict counter bar.** `--checks counters` reports it, but the watch list doesn't name it.

**Correction:** see `revised`.

## A7. First wave at 0:10 (revise)

**Verified:**
- The first spawn comes at half the interval: Burster 5 s, Capguard and Gill Nest 7.5, Sporeling 8, the 18 s spawners 9, Rootbreaker and Tender 10, Amanita 15.
- `wave = ceil(tick / beat)`.
- The release and the draft share a tick: `clockSystem` opens the draft, then `waveSystem` runs in the same `step`, and the sim holds after.
- [`rework-state.md`](../rework-state.md) §4.1 lists `waves.firstBeatSeconds:10` as an option.

**What's wrong:**
- **"Carrying the first batch of nearly every opener spawner" is false for spawners behind the lane's front door.** `releaseLead` is the walk divided by the lane's pace. In a Capguard-paced lane (0.75 tiles a second), a Burrow 2 tiles back releases at about 7.3 s, before its 8 s batch. It misses the first wave, and that wave goes out single-type and unshielded. Today's 0:20 beat doesn't have this problem.
- **Its timing contradicts the decision tree.** [`rework-state.md`](../rework-state.md) makes it the answer to P3 saying "less alive / empty start", not an independent "now".
- **It doesn't fix "nothing to decide from 0:06 to 0:36".** That's a gold problem (52 gold), and `hotstart`'s deploy draft answers it.

**Correction:** see `revised`.

## A8. Reinforce (drop, park in `docs/ideas/`)

- **The problem isn't evidenced under the rework.** The [ledger](../ledger.md)'s §4 item 9 says it was "not re-measured under the rework".
  - Bots bank 44 / 74 / 90 at 1:00 / 2:00 / 3:00 and peak at 265, near the end.
  - The newcomer was gold-*starved*: six placements 1–10 gold short, and 75 s saving for one card.
  - The strategist found Skip (+40 gold) "often the honest best choice".
  - The 801-unspent figure is one pre-Hold human run from 2026-10-28.
  - "14 legal plots at 3:00" comes from the spread tool's paused states and still exceeds what ~90 gold buys.
- **The price makes it a last resort.** 40% of base cost buys one batch (44 gold for 2 Sporelings). A Burrow amortizes to about 4 gold a batch over a battle, so a reinforced batch costs about 10× as much.
- **For the loser it's small.** Its ~95 gold buys 2 batches, so as a last stand it's smaller than A1.
- **G5 is already over** (78%), and this turns gold directly into army.
- **It overlaps A1** (comeback) and A5/ER-1b (a beat verb).
- **Revisit it** if P3 players report unspent gold, or if a measurement shows banks over 200 with no affordable legal plot. Mend (F12, repair) is the tester-asked alternative.

## A9. Overtime (drop, park)

- **It's rare.** Decisions are 9% of single battles and 6% of run battles. None of the newcomer's 5 battles reached 10:00.
- **The 10 s overtime beat adds no pressure.** Storm growth multiplies stored units at each release, so the total stays production-bound. A faster beat just sends smaller waves, more often, with fewer types each. That's fewer shields and more trickle: the opposite of the rework.
- **"Columns name the winner 37–44%" is a mid-battle figure.** At the end, the winner holds more ground in 80% of rework battles ([`measurements.md`](../measurements.md)).
- **The real flaw is that flyers hold no ground.** A flyer army razing the base would lose a Decision (newcomer battle 4; the strategist's mono Drift Stalk). That belongs to the flyer rule or to the tiebreak order. Taking columns out of the Decision would also remove territory's last payoff, which is lens B's problem.
- **"First building destroyed" is its own technicality**, and it rewards dive units.
- **Revisit it** if P3 says Decisions against the Baron feel like a count.

---

## Missing from this lens

1. **Re-key comeback income to the army gap.** This is the cheapest comeback experiment, and it adds no verb.
   - The existing rubber band is keyed to columns. Under the rework, columns anti-predict the winner and G6 is 88%, so the band pays winners as much as losers: 69 against 69 gold a battle, and 77 against 19 against Mold (measurement 3).
   - Knob: `comeback.by: "army"`, with the deficit on `supplyUsed`, the same signal as A1 and D1's gauge, and the same cap of 6 a tick. A variant could also exclude flyers from the column count.
   - Code: about 10 lines in `incomeSystem` and `incomePerMinute` (`economy.ts`), plus the schema.
   - Measure: comebacks; the first front leader's win rate; G5, G6 and Decisions; comeback gold to the eventual loser against the winner.
   - Effort S. Timing: now, independent of P4.
2. **One shared "AI holds under waves" knob, for the general *and* `bot:balanced`, measured before A1, A4 or A5.**
   - Today neither side ever holds under waves (`controller.ts:108`), so every bot number for this lens is measured without the verb.
   - E5 covers only a counter-timed general hold.
   - A simple bot policy would calibrate every beat-verb proposal: hold every other beat when no building in the lane is besieged, plus hold when behind.
3. **Report the "hold while behind" result** (measurement 2) as a negative control in A1's test.
   - Today's Hold doesn't create comebacks for bots, so Second Wind's extra batches and shields carry the effect.
   - Bracket them at 1, 2 and 3 batches.
4. **[Research](../../../../../research/research-lane-battlers.md) #11, "regroup on the beat", as a cheaper always-on alternative to compare with A1.**
   - Idle units on their own ground within 2 columns of the front join the departing wave and get its mixed shield.
   - It favours the side being pushed and uses only existing systems.
   - Watch G6.

## Files

- Critique: this file.
- Scripts and output:
  - [`ts_used.ts`](../scripts/second-wind/ts_used.ts)
  - [`trig.py`](../scripts/second-wind/trig.py)
  - [`trig2.py`](../scripts/second-wind/trig2.py)
  - [`behind.ts`](../scripts/second-wind/behind.ts)
  - `behind.txt` (raw output not kept)
  - `used-*.json` (raw output not kept)
