# Lens A: battle arc and agency (proposals)

> **Archived: v1 era.** Written before [SPEC v2](../../../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../../../README.md)).

Evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): lens A's proposals. Written by an agent during that review and checked in [the critique](a-battle-critique.md); nothing here is adopted, and the review's [Appendix A](../../after-the-rework.md#appendix-a-every-surviving-proposal) holds the final verdicts. Recovered from the session transcript, so the screenshots it names aren't linked (see the [README](README.md)) and raw outputs weren't kept.

Written 2026-10-31 against `develop` at `ef2e133`, with `?proto=rework` as the reference build. Nothing here is built, adopted or measured as a rule. Every rule below is a default-off `?proto=` knob for `src/data/proto.ts`, to be measured with `npm run experiment` and judged in a dev-site playtest, per `.claude/rules/balance.md`.

**Scope.** One battle, minute by minute, and what the player can do in it: the first minute, the middle, the 20 s beat, timing verbs, comebacks, the Heartcap cliff and `breach`, the Sporestorm, the Decision at 10:00, merging as a decision, and gold with nowhere to go. Other lenses own placement and territory payoff ([B](b-builds.md)), the run and its HP ([C](c-run.md)), feel, readability and teaching ([D](d-feel.md)), and the general ([E](e-opposition.md)). Where a proposal here leans on one of theirs, it says so.

**One new measurement for this lens** (scratch scripts [`rally_window.py`](../scripts/second-wind/rally_window.py) and [`army_window.py`](../scripts/second-wind/army_window.py), run over the time series behind [`measurements.md`](../measurements.md) (`ts-*.json`, raw output not kept): 654 `rework` routs and 699 M5 routs, 10 s samples):
- An *army* trigger catches the loser's collapse early. "Field supply at most half the opponent's for 20 s, opponent at 10+, after 1:00" fires for the eventual loser in every `rework` rout. That's a median **117 s before the end** (IQR 65–213), at a clock time of about 4:30 (IQR 3:00–6:10). At that point the loser still has **5 buildings** (IQR 4–6) and **~90 gold**. It fires for the eventual winner in 27% of routs, always earlier.
- A *buildings-lost* trigger comes too late. "Standing buildings at most 70% of this battle's peak" fires a median 42 s before the end, when the loser's field supply is 7 against the winner's 34. At 80% it's 67 s.
- So the window that [`docs/archive/v1/ideas/one-more-run-review.md`](../../one-more-run-review.md#step-b-results-2026-10-30)'s Step B follow-up asked for exists. It's best found by army, not by buildings or the Heartcap.

---

## Diagnosis: what the player experiences on develop with the rework on

1. **The ending is an avalanche the player can't see coming or answer.**
   - The newcomer's three full-length battles ended at 8:34, 8:55 and 8:56, all at storm 5. One Heartcap went 2000 → 425 → 0 in about 13 s ([`playthrough-newcomer`](../playthrough-newcomer.md) F-1, `SS/99–101`).
   - The strategist held 27–13 columns and a full Heartcap at 7:08, then lost 10 of 11 buildings from 7:21 to 7:41 and was routed at 7:47 ([`b1_t709.png`](../screenshots/strategist/b1_t709.png) → [`b1_end.png`](../screenshots/strategist/b1_end.png)).
   - Bots ([`measurements.md`](../measurements.md), 720 battles):
     - A beaten Heartcap falls 12 s after its first hit, and 6 s from ⅔ (18 s and 9 s on M5). The winner arrives with 56 supply (34 on M5).
     - Comebacks: 0 in 720.
     - `breach` stretches the fall to 31 s and changes no outcome.
   - Why: at 8:00 the storm has doubled every release (`stormWaves.perStack` 0.2), Heartcaps take ×2 and turrets deal ×0.5 (`data/balance.json` `sporestorm`).
2. **The loser's window passes in silence.**
   - The army gap opens about 2 minutes before the end, while the loser still has 5–6 buildings and about 100 gold ([`measurements.md`](../measurements.md) "The last minutes of a rout"; this lens's army trigger above).
   - Nothing lets the loser spend those on a fight back:
     - Hold under waves can't recall anyone (`movement.ts` ~line 60 skips the rally when `r.waves`).
     - Units stored in a spawner sit inside while it's attacked ([`playthrough-newcomer`](../playthrough-newcomer.md) 1:22, `SS/24`; [strategist](../playthrough-strategist.md) 0:54–1:19, `b1_t54/b1_t75`).
     - The only active verb is a power on a 75–80 s cooldown.
3. **The player can't read who's winning, so losses feel unearned.**
   - From 2:00 to 4:00 the territory leader wins only 37–44% of battles. A material count names the winner 58–79% of the time, and field supply 60–79% ([`measurements.md`](../measurements.md) "Who's winning").
   - The enemy's army size is shown nowhere ([`battle-feel.md`](../battle-feel.md) §2.5).
   - Territory froze at 7–9 for 4 minutes while the newcomer razed the enemy's base (`SS/159`).
   - The strategist: "I learned I was being out-built only after it was over."
4. **The beat keeps time but asks little, and the middle thins out.**
   - Bots place 1.5 times a minute, with a median 64 s stretch without any command.
   - The newcomer had nothing to decide from 0:06 to 0:36 and from 4:00 to 5:30. Six placements failed silently for 1–10 gold, because the forward price applied (F-10).
   - Hold is the only beat verb, and a blind every-other-beat schedule captures its value: +8 of 30 against the Baron, +6 against the Blightwright, 0 against scripted and Mold ([`rework-state.md`](../rework-state.md) K-Hold). The AI never holds under waves (`controller.ts` line 108).
   - The field is empty until 0:20, and the first column flip comes at a median 2:02 (27% of battles have none by 3:00; 50% against the Baron).
   - Every third release lands on the minute. There it shares a tick with interest, the storm, and a draft that freezes the field ([`battle-feel.md`](../battle-feel.md) §3.5).
5. **Merging decides battles but isn't a decision, and gold has nowhere to go.**
   - Merging:
     - Merges per battle are 80, against 24 on M5.
     - Mold fielded 8 Elders at once in the newcomer's battle, and the strategist lost Elder counts of 20–0 and 40–14.
     - Merge-on wins G7's mirror 72%, which fails the 55–70% band. The toggle is never worth touching.
     - Cordis's merger identity is redundant ([`rework-state.md`](../rework-state.md) §5.2 risk 7).
   - Gold:
     - Bots peak at 265 banked. The engagement review's human run ended with 801 unspent and no legal tile.
     - Under the rework there are **14 legal plots at 3:00 instead of 56** ([`measurements.md`](../measurements.md) placement), so late gold has even fewer places to go.

---

## Proposals, ranked by expected impact on fun

| Rank | Id | Title | Effort | Timing |
|---|---|---|---|---|
| 1 | A1 | Rally: an earned, player-timed fight-back when you're outnumbered 2 to 1 | M | now (knob), both combat models |
| 2 | A2 | A storm that ramps instead of floods | S | now (measurement) |
| 3 | A3 | Decision support at the beat: army balance, next-wave comparison, queued placements | S | now (UI only) |
| 4 | A4 | Merging moves to the beat: a held wave knits at home | L | only if P3 shows the swarm, Elders or a rote Hold deciding battles |
| 5 | A5 | Call the beat: the other half of Hold, for both sides and the AI | M | only if P4 keeps the beat and P3 shows dead stretches or a metronome |
| 6 | A6 | Stored units sally when their building is hit | S | now (knob; adopt with waves) |
| 7 | A7 | First wave at 0:10, beats off the minute | S | now (knob; adopt with waves) |
| 8 | A8 | Reinforce: spend gold to add a batch to this beat's wave | M | after P4 |
| 9 | A9 | Overtime instead of a column count at 10:00 | M | only if Decisions rise or feel like a technicality |

**Staging for F8 (learning load).**
- A2, A6 and A7 add nothing to learn.
- A3 removes guesswork.
- A1 adds one button and one charge pip, with a first-time tip.
- A4 replaces a rule rather than adding one.
- A5 and A8 each add a verb. Unlock them after the player's first battle in a run, or behind a first-time tip on first availability.
- A9 adds one banner.

**Suggested order:** A3 and A2 first (cheap, tell us most), then A1. Then A6 and A7 together as one small "beat hygiene" pass. A5 and A4 follow P4's verdict on waves. A8 and A9 come last.

---

### A1. Rally: an earned, player-timed fight-back when you're outnumbered 2 to 1

**Problem.**
- Comebacks: 0 in 720 battles under `rework`, with or without step B ([`measurements.md`](../measurements.md)).
- The loser has 1 building and 0 units at its Heartcap's first hit, so every Heartcap-anchored rescue acts after the fight is over. `breach` gives 31 s of epilogue, 0 comebacks and identical runs.
- Both playthroughs lost with no lever. The newcomer's 6-minute lead collapsed under storm 5 ("no warning I could act on and no comeback lever"). The strategist: "There is no window in which a comeback could happen."
- That window does exist, about 2 minutes before the end (this lens's measurement). Nothing in the rules uses it.

**Change** (knob `rally`).
- **Earning a charge.** A side earns a Rally charge when its army (supply in use, *including* units waiting inside spawners) stays at or below **50%** of the opponent's for one full beat (**20 s**), with the opponent at **10+** supply, from **1:00** on.
  - It holds at most **1** charge, and no new charge comes within **60 s** of using one.
  - Stored units count toward the army, so holding a lane can't fake a deficit.
- **Using it.** Spending a charge on a lane (command `rally { lane }`, usable while paused):
  1. Every own spawner in that lane releases its stored units now, plus **2 extra batches** at once. A side at half the opponent's army has free supply by construction.
  2. Each rallied unit gets a **40%** max-HP shield, the mixed-wave shield doubled, whatever the type count.
  3. That lane's Heartcap turrets fire at **×2 rate for 20 s**.
- **The AI uses it too.** It spends a charge on the lane with the most enemy supply within 10 columns of its home, once that supply is 8 or more.
- **On screen.** One pip and a "Rally" button beside the commander power, with a first-time tip ("Outnumbered 2 to 1: Rally ready").
- **First-pass knob:**

  ```js
  rally: {
    ratio: 0.5,
    beats: 1,
    minOpponentSupply: 10,
    fromSeconds: 60,
    cooldownSeconds: 60,
    extraBatches: 2,
    shieldFrac: 0.4,
    turretRateMult: 2,
    turretSeconds: 20,
  }
  ```

**Feel.** When the enemy's wave starts eating your lane, a button lights up. You pick the lane and the moment, ideally with the power ready and a held double wave behind it, and a shielded counter-surge pours out of your buildings while your turrets double up. Losing becomes "I had a shot and I took it", not "I watched it end". Winners have to respect a cornered colony, and the general does it to you too.

**Implementation.**
- Sim rule, all default-off:
  - per-side state `rally?: { charges, belowSince, readyAt, turretUntil }`, absent without the knob so `hashState` and the goldens are untouched;
  - the trigger, checked each beat or second in `src/sim/systems/economy.ts`, or a new `rally.ts` called from `step.ts`;
  - the command in `src/sim/commands.ts` and the Command union in `src/sim/state.ts`;
  - the release from `releaseStored`/`emerge` in `src/sim/systems/spawning.ts` (a `wave` tag so the beat doesn't release them again);
  - shields via `u.shield`, and the turret rate in `combat.ts` `turretSystem` (`ss.turretCooldowns[i] = t.intervalTicks` halved while active);
  - the AI policy in `src/sim/ai/controller.ts`.
- Schema: `src/data/schema.ts` and the compile in `src/sim/compile.ts`.
- UI: `src/app/battleView.ts` and `src/ui/hud/kit.ts` (button), `tips.ts`, `callouts.ts`.
- It works without waves too: there's nothing stored, but the extra batches and turrets still apply.

**Test.**
- Commands:

  ```bash
  npx tsx tools/experiment.ts --proto rework,rally --checks engagement,runs,g4,g5,g6 --seeds 30 --runs 100 \
    --commander <c> --power-policy auto
  ```

  Also run once on M5 (`--proto rally`), and once with `rally.extraBatches:1` and `rally.extraBatches:3` to bracket it.
- Add three engagement rows: rallies used per battle; rallies after which the user regained the material lead within 40 s; battles won by a side that rallied.
- Targets:
  - Material comebacks (winner 30%+ behind on material after 1:00) rise from 13% to about 18–25%.
  - Heartcap comebacks rise from 0 to a few percent.
  - The material leader at 3:00 still wins at least 60% (70% today).
  - G4: Decisions at most 15%, median at most 8:30.
  - G5 and G6 don't rise (G6 is already 88% under the package).
- Playtest question: "When you started losing, did you feel you had a move? Did a Rally ever turn a battle, or only delay the end?"

**Ledger.**
- Builds on **OMR-8** (never addressed): Step B's "a trigger when a side has lost half its buildings; a defensive rally while the base is still standing".
- Differs from **ER-2b / DR-26 `breach`** (built, off, awaiting playtest):
  - it fires a median ~2 minutes earlier, keyed to army rather than the Heartcap or buildings (the measurement above shows buildings are too late);
  - it's player-timed rather than automatic;
  - it uses waves' stored units.
- Not **BB-T2** (fall back while outnumbered, measured and harmful): nothing retreats.
- Not **BB-T3** (home spawners shoot): no permanent defense, and it's one charge.
- Related research candidates not in the [ledger](../ledger.md): [lane-battlers](../../../../../research/research-lane-battlers.md) #8 (the Heartcap wakes) and #11 (regroup on the beat).

**Sources.**
- Wagar, "Comeback Mechanics & Slippery Slopes": comebacks feel earned when they're limited and the trailing side must still win exchanges (https://critpoints.net/2017/04/01/comeback-mechanics-2/).
- The Law of Game Design on rubber bands: Street Fighter's Ultra, which grows with damage taken but must be landed (https://lawofgamedesign.com/2014/08/25/theory-rubber-bands/).
- Clash Royale's King Tower activation, "the highest-value defensive technique when behind" (https://www.touchtapplay.com/best-ways-to-activate-king-tower-in-clash-royale/).
- Battle Cats' base boss and shockwave (https://battle-cats.fandom.com/wiki/Enemy_Units).
- Stick War's garrison (https://stick-war.fandom.com/wiki/Global_Garrison_Command).
- LoL objective bounties, and Riot's later cut when they caused swings (https://wiki.leagueoflegends.com/en-us/Objective_bounties).

**Risks.**
- **"Low-effort upsets"** (Wagar). Watch the leader's win rate and keep the effect to one charge.
- **Interior lines.** The K2 edge (G6 88%) may grow; the army trigger, not columns, is the guard.
- **AI timing.** The general's policy may waste charges, or use them better than people.
- **Learning load:** one button, one pip and one tip (F8). Show it from battle 1, since battle 1 is where runs die.
- **Overlap with `breach`.** If both are adopted, keep `breach` as presentation of the last steps.

---

### A2. A storm that ramps instead of floods

**Problem.**
- The last two minutes are a different game, and the ending feels arbitrary.
- Storm 5 at 8:00 doubles every release, Heartcaps take ×2 and turrets deal ×0.5.
- The strategist: "Mother Mold released about 31 Sporelings … in one beat" at 6:00, then "Heartcap 3000 → 2184 → 0 in about 6 s".
- All three of the newcomer's full-length battles ended in the storm-5 window. Its rule ("storm grows waves") decided them and is explained only in the beat chip's tooltip ([`playthrough-newcomer`](../playthrough-newcomer.md) §3).
- Storm waves also feed mono Veilstalker in G3 (45/61 without them → 72/87 with them).
- SPEC §18.2 Q2 ("does the storm end battles satisfyingly?") has never been asked of a person.

**Change.** Data only; all three paths exist.
- Measure three ramps against today's:
  - **(a)** `stormWaves.perStack:0.1` (×1.5 at 8:00);
  - **(b)** (a) plus `sporestorm.heartcapTakenPerStack:0.1` and `sporestorm.turretDamagePerStack:-0.05`, so the base stays defensible;
  - **(c)** (b) plus `sporestorm.startSeconds:180`: the same pressure spread over five minutes from 3:00 instead of 4:00, so the escalation is a ramp.
- Pick the gentlest setting that keeps G4 (median at most 8:30, Decisions at most 15%).
- If none does, keep the ramp and add A9 (overtime) rather than restoring the doubling.

**Feel.** The late game still escalates (more units, more damage), but a lead built in minutes 2–6 carries into the end. A defender at storm 5 can still hold a beat with its turrets. The last minute is a bigger version of the battle you were playing, not a flood that erases it.

**Implementation.**
- Data only: `?proto=rework,stormWaves.perStack:0.1,…`.
- No code, no golden change. Adoption edits the `STORM_WAVES` constant in `src/data/proto.ts` and `data/balance.json` `sporestorm`.
- SPEC §6.4 text on adoption.

**Test.**
- Commands:

  ```bash
  npm run experiment -- --proto rework,<variant> --checks counters,g4 --g3seeds 50 --g4seeds 200 --workers 10
  # then
  npm run experiment -- --proto rework,<variant> --checks engagement,runs --commander <c> --power-policy auto
  ```

- Watch:
  - first hit → dead and ⅔ → dead (12 s and 6 s today);
  - material comebacks;
  - "when the winner pulls ahead for good" (53% from the end today);
  - G3 for mono Sporeling, Veilstalker and Drift Stalk;
  - battle-1 losses.
- Playtest question: "Did the last two minutes feel like a climax you could play, or a coin flip?"

**Ledger.**
- **ER-2a** (built inside `breach`: Heartcap +10%/stack). Step B found the Heartcap term alone moves the fall only ±3–4 s.
- What's new is the wave-growth term (P1d's `stormWaves`), which didn't exist when ER-2a was measured and is what doubles the late armies.
- **SP-2** (never asked).
- The strategist's suggestion (`stormWaves.perStack:0.1`) is unmeasured.
- Not a reversal of P1d's decision: `stormWaves` stays, and only its slope changes.

**Sources.**
- Clash Royale escalates the player's resource (double and triple elixir) and ends on overtime, not on a fragile base (https://supercell.com/en/games/clashroyale/blog/release-notes/november-update).
- Left 4 Dead's director: build-up, peak, relax (https://developer.valvesoftware.com/wiki/Left_4_Dead_2/Scripting/Director_Scripts).
- Kingdom Rush's deliberate spikes and breathers (https://gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design).

**Risks.**
- **Decisions and length.** Without `stormWaves`, Decisions were 27%, and G4's median is already 8:04 against an 8:30 ceiling. Variant (c) is the hedge; A9 is the fallback.
- **The strict counter bar.** It depends on the storm in places. Re-run `counters`.
- **Learning load:** none. It removes a hidden decider.

---

### A3. Decision support at the beat: army balance, next-wave comparison, queued placements (UI only)

**Problem.**
- Players lose while every visible signal says they're winning: 27–13 columns and a full Heartcap 39 s before a Rout (strategist); a 6-minute territory lead before collapse (newcomer).
- Territory names the winner 37–44% of the time at 2–4 minutes, material 58–79%, field supply 60–79%. The enemy's supply isn't shown anywhere.
- The beat's one decision (Hold) is made blind: the enemy's next wave is only "+N" badges to add up.
- Six placements failed silently for 1–10 gold, because the tray shows the base price and the forward price applies ([`playthrough-newcomer`](../playthrough-newcomer.md) F-10). Saving for a card felt like waiting, not planning (4:00–5:30).

**Change.** Render and UI only.
1. **Army balance bar** under the territory tug: each side's supply in use (field plus waiting inside) per lane, with Elder counts, in the tug's colours. Example: "Army: you 34 · them 51 (4 Elders)". It's honest: every unit and "+N" badge is already visible on the field.
2. **Beat prompt** for 5 s before each beat, per lane: "Next wave: you +14 (2 types, shielded) · them +11 (1 type)", with that lane's Hold switch (and A5's Call) right beside it.
3. **Queued placement:**
   - Clicking a legal tile you can't afford yet leaves a pending ghost with a fill bar. The app issues the ordinary `place` command the tick your gold reaches the price at that column. Esc or right-click cancels.
   - The tray card shows the price at the hovered column.

**Feel.**
- You see the swing coming ("their army is pulling away") while there's still time to act. That's the precondition for A1, A5 and A8 being decisions rather than guesses.
- "I lost because they out-built me 2 to 1" becomes something you knew at 5:00, not at the report.
- Saving for a building becomes a plan you set and forget.

**Implementation.**
- Files:
  - `src/ui/hud/top.ts` (tug and army bar; beat chip);
  - `src/ui/hud/explain.ts` (`beatTip`, `waitingUnits` for the enemy side);
  - `src/app/battleView.ts` (stance rows, prompt, pending-placement ghost and auto-issue);
  - `src/ui/hud/tray.ts` (price at cursor);
  - `src/app/input.ts`;
  - `styles.css`.
- No `src/sim` change and no golden impact. The queued placement issues normal commands, so replays stay deterministic.
- Fix the 1280 chip overflow at the same time ([`battle-feel.md`](../battle-feel.md) §3.4).
- Overlaps [lens D](d-feel.md)'s "telegraph the next wave". This proposal's angle is the decision, plus the army readout.

**Test.**
- Scripted check: the army bar's leader should name the winner about as well as field supply does (60–79% at 2:00–5:00, from [`analyze_ts.py`](../scripts/measure/analyze_ts.py)), against 37–44% for territory.
- Browser: `npm run screenshot` at 1280×720 with `proto=rework`.
- Playtest questions:
  - "Could you tell who was winning at 3:00? When did you know you'd lost, and how long before the end?"
  - "Before a beat, did you know what they were sending?"

**Ledger.**
- **F-10**-type silent fails and **F5** cards (UI asks).
- [Battle-feel](../battle-feel.md) G1/G6/G8 (wave read, beat prompt, army strength): in the review's evidence reports, not the ledger.
- Research: [lane-battlers](../../../../../research/research-lane-battlers.md) #20 (wave preview at the gate) and #21 (read the army); [one-more-run](../../../../../research/research-one-more-run-and-feel.md) #12 (telegraph the next wave).
- Not ER-6b (an answer pick, close to an interview-rejected idea): this shows sizes, not answers, and the §1.2 vague counter telegraph is untouched.

**Sources.**
- Thronefall added enemy wave previews in 1.0 (https://www.pcgamesn.com/thronefall/full-version-launch).
- Kingdom Rush lets you tap the wave icon to see the incoming wave (https://kingdomrushtd.fandom.com/wiki/Encyclopedia).
- Into the Breach makes losses read as "your own fault" by showing intents (https://gdcvault.com/play/1025772/-Into-the-Breach-Design).
- Sid Meier: players feel odds rather than compute them (https://gameinformer.com/b/news/archive/2010/03/12/sid-meier-gamers-arent-logical).

**Risks.**
- **HUD crowding at 1280** (already over by 34 px).
- **Less surprise.** Showing the general's next wave could make battle 1 easier. That's arguably wanted (K1), but note it in P3/P4 numbers.
- **Queued placement** could place a building somewhere that became unsafe while waiting. Show the ghost, and cancel it if the tile becomes illegal.
- **Learning load:** negative. It answers questions players already ask.

---

### A4. Merging moves to the beat: a held wave knits at home (bigger bet)

**Problem.**
- Pillar 2 says merging is "a visible, emergent, controllable event with a real tradeoff". Under waves it's automatic and decisive:
  - 80 merges a battle (24 on M5);
  - Mold's 8 Elders at once;
  - the strategist's Elder gaps of 20–0 and 40–14;
  - "waves push nearly every cheap unit through a merge, so a body-count edge becomes a tier edge (×6.25)".
- The toggle is never worth touching, and G7's mirror fails (72%).
- Hold under waves is either rote (every other beat, +8 of 30 against the Baron) or unused.
- Cordis's merger identity is redundant.
- Both playthroughs name "mass the cheapest spawner, let waves merge it" as the dominant play.

**Change.** Two separable knobs.
1. **`waves.heldKnit: true`.** A lane held through a beat knits its stored wave at home. When the doubled wave leaves, every 3 stored units of the same type leave as one Bloomed, and 9 as an Elder. The knit happens inside the building, so it can't be interrupted, and the "+N" badge shows the trios forming.
2. **`merge.field: false`.** No automatic merging on the field. `detectTrios` is skipped for sides without the new stat `side.fieldMerge`.
   - Cordis's passive gains `side.fieldMerge` set to 1, so she becomes the one commander whose units still knit in the field. Puppet Bloom keeps working, and could also knit a lane's stored wave.
   - The per-building merge toggle retires under this knob: Hold is the merge decision.

Plus an AI hold policy under waves, which is needed anyway (the AI never holds today): hold a lane when 2 or more trios are stored in it, none of its buildings there is besieged, and the enemy's stored supply in that lane is no more than 1.2× its own.

**Feel.**
- Every beat poses a real tradeoff per lane: send now as a swarm, or give up 20 s of pressure and send a merged double wave.
- Elders become something you decided to make, and something you see coming from the enemy (its held lane and its "+N" trios).
- The swarm stops snowballing for free, and Cordis feels like Cordis again.

**Implementation.**
- Sim rule:
  - `src/sim/systems/spawning.ts` (`releaseStored` converts trios via `addUnit(..., tier)`; supply per §5.5, since a merged unit costs ⅔ of its parts);
  - `src/sim/systems/merging.ts` (gate `detectTrios` per side);
  - `src/sim/compile.ts` (the `side.fieldMerge` stat);
  - `data/commanders.json` (Cordis's passive, via proto content paths);
  - `src/sim/ai/controller.ts` (`applyStancePolicy` under waves);
  - UI: badge trios in `src/render/renderer.ts`, and removing the toggle under the knob in `src/ui/inspect.ts`.
- Default-off, so no golden change.
- G7 needs redefining under the knob ("holding for merges vs never holding: 55–70%"). That's the user's call.

**Test.**
- Measure `heldKnit` alone, then both knobs:

  ```bash
  npm run experiment -- --proto rework,waves.heldKnit:true[,merge.field:false] \
    --checks counters,g4,g7,g8 --g3seeds 50 --g4seeds 200
  # then engagement and runs with commanders
  ```

- Watch:
  - merges per battle (80 → about 15–35, and chosen);
  - most Elders at once;
  - G3 for mono Sporeling (83/86) and Veilstalker (69/80);
  - the strict bar (the Veilstalker's slayer bonus was tuned for a world where everything merges);
  - battle-1 losses against Mold (67%);
  - AI holds per battle.
- Playtest question: "Did you decide when your units merged? Was holding a wave to knit it worth the ground you gave up?"

**Ledger.**
- **[Ledger](../ledger.md) §4 item 8** ("merging isn't a decision, and waves make it more automatic": no nearest work).
- **SP-3** (forced merging, never asked) and **G7** (failing).
- **K-Hold** in [`rework-state.md`](../rework-state.md) (Hold as a rote schedule; give the AI holds).
- Not **DR-1** (muster/pack spawning, measured and failed as an archer fix). This isn't muster for G3's archers. It moves *where and when* merges happen.
- Changes an interview decision (§1.2 "Merge rule: out of combat, anywhere"), so it needs the user's explicit OK.

**Sources.**
- Hearthstone Battlegrounds makes a triple a chosen moment with a payoff (https://hearthstone.blizzard.com/en-us/news/23156373).
- Rush Royale players time merges before a scheduled boss (https://www.touchtapplay.com/how-does-merging-work-in-rush-royale/).
- LoL's slow push piles waves up before a crash (https://blog.loltheory.gg/wave-management-league-of-legends/).
- Battle Cats players stall, stack, then push (https://battle-cats.fandom.com/wiki/Heavenly_Tower/Floor_10).
- TFT's "tough choices, not touch execution" (https://www.pockettactics.com/teamfight-tactics-design).

**Risks.**
- The largest rule change here, so G3 winners may shift (Capguard or Amanita lines?).
- **Merging becomes less visible** ("emergent on the field" becomes "inside the building"). Mitigate with badge trios and a knit glow on the building.
- Holding every other beat may become the new rote. The tempo cost is the brake, so watch AI and human hold rates.
- **Commander balance:** Vesper and Armilla lose free merges, and Cordis gains.
- **Learning load:** it *replaces* "units merge when idle" with "hold a lane to knit it". Teach it with the existing Hold tip, rewritten.
- Only worth it if waves are adopted.

---

### A5. Call the beat: the other half of Hold, for both sides and the AI

**Problem.**
- The beat is a metronome the player watches. At 2–3× "it feels like a metronome I watch rather than play to" ([newcomer](../playthrough-newcomer.md) §2).
- Decisions stay at about 1.5 builds a minute, with a minute-long empty stretch.
- Hold is the only beat verb: binary, at most once every 40 s per lane, and a blind schedule captures its value.
- Nothing can release a wave early. Today a spawner releases only at its scheduled moment (`waveSystem`: `due ≤ releaseLead`).
- The AI never uses the beat at all, so measured difficulty ignores the verb.

**Change** (knob `callBeat`).
- **The command.** `callBeat { lane }` fires the coming beat in that lane now, **for both sides at once**:
  - each side's spawners in the lane release their stored units, marked as the upcoming wave so the scheduled beat doesn't release them again;
  - mixed-wave shields apply at the call;
  - a side holding that lane keeps its wave home.
- **What the caller gets:** **1 gold per second skipped (max 20)**. The real payoff is catching the enemy's wave while it's small, single-type (unshielded), or mid-production.
- **Cooldown:** once per lane per **60 s**. Calling a held lane releases the doubled wave early.
- **Variant to measure:** `callBeat.bothSides:false`, where only the caller's wave leaves (a strike).
- **The AI plays the beat too:**
  - it calls when its stored supply in a lane is at least 1.4× the player's and at least 4;
  - it holds (the existing command) when its stored supply is at most 0.6× the player's and no building there is besieged.
- **First-pass knob:**

  ```js
  callBeat: {
    cooldownSeconds: 60,
    goldPerSecond: 1,
    maxGold: 20,
    bothSides: true,
    ai: { callRatio: 1.4, holdRatio: 0.6 },
  }
  ```

**Feel.**
- The beat becomes a read: "their Burrows just emptied and my Capguard is ready: call it now", or "their double wave is coming: hold mine".
- Two verbs, delay and hasten, make the wave rhythm something you conduct.
- The general visibly plays the same game (it holds and calls), which gives battles a readable back-and-forth.

**Implementation.**
- Sim rule:
  - `src/sim/systems/spawning.ts` (a `callLane` helper reusing `releaseStored` and `shieldMixedWaves`, setting `b.lastWave = wave` so the scheduled beat skips those spawners);
  - `src/sim/commands.ts` and `state.ts` (the command, with per-lane `callReadyAt` on the stance record, absent without the knob);
  - `src/sim/ai/controller.ts` (call and hold policies under waves);
  - UI: a Call button beside each lane's Hold in `src/app/battleView.ts`, a hotkey, and A3's prompt.
- Default-off, so no golden change.

**Test.**
- Command:

  ```bash
  npm run experiment -- --proto rework,callBeat --checks counters,g4 --g3seeds 50 --g4seeds 200
  # plus engagement and runs with commanders
  ```

- Watch:
  - bot commands per minute (2.1 → 3+);
  - the longest stretch without a command (64 s → under 40 s);
  - first flip (2:02);
  - G3 (fast cheap spawners may love calling);
  - G4;
  - calls and holds per battle, by side.
- Also measure `bothSides:false`.
- Playtest question: "Did you ever hold or call a wave because of what you saw in theirs? Did it feel like a read or a chore?"

**Ledger.**
- **ER-1b** (a gold-cost "Surge" that fires every spawn timer in a lane; never addressed). This is the free, beat-native form, and A8 is the gold form.
- **K-Hold** ([`rework-state.md`](../rework-state.md) §4.5: "a per-lane 'send now'", "let the AI hold under waves").
- [Ledger](../ledger.md) §4 item 10 (live decisions thin out under the rework).
- Research: [lane-battlers](../../../../../research/research-lane-battlers.md) #5 and [one-more-run](../../../../../research/research-one-more-run-and-feel.md) #10, not in the repo.
- Not the rejected **DR-23** (a draft every wave).

**Sources.**
- Kingdom Rush's call-early pays gold for the seconds skipped and risks overlapping waves (https://ayumilove.net/kingdom-rush-walkthrough-guide/; https://www.aol.com/news/2014-07-30-kingdom-rush-tips-and-tricks.html).
- The Warpips guide: time attacks outside the enemy's scheduled waves (https://gamepretty.com/warpips-loadout-selection-and-battle-strategy/).
- Clash Royale's counter-push after a cheap defense (https://sportskeeda.com/esports/how-maintain-positive-elixir-trades-clash-royale).

**Risks.**
- **Always calling** might dominate (free gold), so watch call rates; the 60 s cooldown and catching small waves are the price.
- **Both-sides release** may feel like it helps the enemy.
- **AI timing** is a new tuning surface.
- **Learning load:** one more button per lane. Unlock it after the first battle of a run, or on a first-time tip.
- It needs A3's comparison to be a read rather than a guess.

---

### A6. Stored units sally when their building is hit

**Problem.** Both playthroughs hit this in the first two minutes:
- "3 enemy Sporelings chewed my Burrow (450 → 238 HP) while 6 of my units sat inside the buildings waiting for the beat" (newcomer 1:22, `SS/24`);
- "4 Sporelings stored inside never came out to defend" ([strategist](../playthrough-strategist.md) 0:54–1:19, 450 → 186 HP).

It reads as a bug, and it makes the opening feel helpless.

**Change** (knob `waves.sally: true`). When an enemy unit damages a spawner holding stored units, those units come out at once, untagged by any wave: no beat shield, and they don't count toward the next release. Call for help then sets them on the attacker. Towers and turrets don't trigger it.

**Feel.** Your buildings defend themselves the way you'd expect: poke a Burrow and Sporelings pour out. The opening's first raid becomes a skirmish, not a wait.

**Implementation.**
- Sim rule, about 10 lines: in `src/sim/systems/combat.ts`'s building-damage branch (around line 283), when `r.waves?.sally && b.stored && attacker is a unit`, set a `b.sallyDue` flag. Then `waveSystem` (`spawning.ts`) calls `releaseStored(state, b)` next tick, which avoids appending units during hit resolution.
- Schema plus compile for `waves.sally`.
- Default-off, so no golden change. It's a candidate to join `rework` if P4 keeps waves.

**Test.**
- Command:

  ```bash
  npm run experiment -- --proto rework,waves.sally:true --checks counters,g4,g6 --g3seeds 50 --g4seeds 200
  # plus engagement
  ```

- Watch:
  - Decisions (the related **BB-T3**, home spawners shooting, made every battle a Decision at its strong setting);
  - G6 (88%);
  - first building lost (4:49);
  - siege units' value.
- Playtest question: "Did your buildings ever feel defenceless?"

**Ledger.**
- New as a rule.
- The strategist's suggestion "release stored units when their building is hit" isn't in the repo's ledger.
- It differs from **BB-T3** (measured and failed): it adds no new damage or units, only releases ones already built and paid for, and only when that building is attacked.

**Sources.**
- Stick War's garrison and the statue reinforcing while garrisoned (https://stick-war.fandom.com/wiki/Global_Garrison_Command).
- The Castle Fight note that units go "whenever and wherever they can", with barracks built behind the castle (https://steamcommunity.com/workshop/filedetails/discussion/1757281740/4931980436575090767).
- WC3-style call for help ([`docs/archive/v1/ideas/combat-rework.md`](../../combat-rework.md)).

**Risks.**
- **Defender's edge:** it strengthens the defender, and so K2/G6 and Decisions. It may let a raid trickle units out, partly undoing waves' "arrive together".
- **Forward raids:** Rhizomorph and flyer raids get answered harder, which is arguably intended.
- **Learning load:** none.

---

### A7. First wave at 0:10, beats off the minute

**Problem.**
- The field is empty for the first 20 s of every battle (newcomer `SS/10`, `SS/11`). First contact comes at 28–30 s, and there's nothing to decide from 0:06 to 0:36.
- Every third beat lands on the minute. There it shares one tick with interest, the storm stack, and a draft that freezes the release behind a modal ([`battle-feel.md`](../battle-feel.md) §3.5). The 8:00 draft, for example, arrives exactly as the storm-5 wave leaves.

**Change** (knob `waves.firstBeatSeconds: 10`).
- The beat's phase shifts so releases come at 0:10, 0:30, 0:50, 1:10 and so on.
  - The first wave leaves at 0:10, carrying the first batch of nearly every opener spawner (first spawn at half its interval: 5–9 s). The Amanita Lodge (15 s) misses it, and the Rootbreaker Den and Tender's Ring (exactly 10 s) are on the edge.
  - Minute events (interest, drafts, storm, the general's reads) fall halfway between beats, so a draft never freezes a release.
- Code: `wave = ceil((tick + offset) / beat)` with offset = beat − firstBeat. Deeper spawners' `releaseLead` is unchanged.

**Feel.** Something walks out almost as you press Begin, and the first clash comes at about 0:18. Each draft opens mid-fight with the next wave building behind it, rather than over a frozen release.

**Implementation.**
- Sim timing, about 5 lines in `src/sim/systems/spawning.ts` `waveSystem` (and anything else that reads `waveBeatTicks` phase: the beat chip in `src/ui/hud/top.ts`, `explain.ts`).
- Schema and compile.
- Default-off, so no golden change.

**Test.**
- Command:

  ```bash
  npm run experiment -- --proto rework,waves.firstBeatSeconds:10 --checks counters,g4 --g3seeds 50
  # plus engagement
  ```

- Watch:
  - first contact (28–30 s), first unit death (0:32) and first flip (2:02);
  - G3 (fast first spawners such as the Burster at 5 s and Sporelings at 8 s may gain; the Amanita and Rootbreaker openers lose a beat);
  - G4.
- Try 12 s if 10 s favours swarms.
- Playtest question: "When did the battle first feel on?"

**Ledger.**
- **ER-3a**: "faster first spawns, or a shorter clock never tried", and `hotstart` only partly built. This is the first-spawn half, made wave-native.
- **G12** of the [battle-feel research](../battle-feel.md) (the quiet opening is back) and its "opening drafts half a beat after a release" idea.
- [`rework-state.md`](../rework-state.md) §4.1 named `waves.firstBeatSeconds: 10` as an iterate option.
- Complements `hotstart`'s deploy draft ([lens C](c-run.md)), which gives the first decision at 0:00.

**Sources.**
- Clash Royale's tight opening pacing (https://en.wikipedia.org/wiki/Clash_Royale).
- [One-more-run research](../../../../../research/research-one-more-run-and-feel.md) #9: a first clash by about 0:45 (L4D build-up, https://developer.valvesoftware.com/wiki/Left_4_Dead_2/Scripting/Director_Scripts).

**Risks.**
- **Opener balance:** small changes to G3 openers.
- **Readability:** the beat chip and its tips must follow the phase.
- **Learning load:** none.

---

### A8. Reinforce: spend gold to add a batch to this beat's wave

**Problem.**
- Gold piles up with nowhere to go. Bots peak at 265 banked, and the engagement review's human run finished with 801 unspent and no legal tile.
- Under the rework the player has **14 legal plots at 3:00 instead of 56**, because the front hasn't moved.
- The loser holds about 90–110 gold all through its collapse.
- Mid-battle, the newcomer saved 75 s for one card (4:00–5:30) with nothing else to do.
- Nothing converts gold into *this* fight except a new building, which needs space and pays off over minutes.

**Change** (knob `reinforce`). Command `reinforce { buildingId }` on any of your spawners:
- **Cost:** pay **40% of its base cost**, +25% for each earlier reinforce of that building this battle.
- **Effect:** one batch is added to its stored units now, so it joins the next beat (or appears at once without waves).
- **Limits:** once per spawner per beat. It respects the supply cap.
- **Examples:** a Burrow 44 gold for 2 Sporelings, a Capguard Hall 60 for one Capguard. A Burrow's own output works out to about 4 gold a batch, so reinforcing is a sink, not a replacement for building.
- **The AI:** the general reinforces when its bank is over 200 and it has no placement it scores well.

**Feel.**
- Gold is always a decision. Top up the beat's wave, make it mixed (pay for one Capguard batch to shield a Sporeling wave), or pour your bank into the lane you're rallying (A1).
- The loser's last 100 gold becomes a last stand rather than a number on the report.

**Implementation.**
- Sim rule:
  - `src/sim/commands.ts` (new command; price from the compiled building, state `reinforced` per building, absent without the knob);
  - `src/sim/systems/spawning.ts` (add to `b.stored`, or `emerge` without waves);
  - `src/sim/ai/controller.ts`;
  - UI: an inspect-panel button and a modifier-click on the building in `src/ui/inspect.ts` and `src/app/input.ts`, with the price shown.
- Default-off, so no golden change.

**Test.**
- Command:

  ```bash
  npm run experiment -- --proto rework,reinforce --checks counters,g4,g5 --g3seeds 50 --g4seeds 200
  # plus engagement and runs
  ```

- Watch:
  - gold banked at peak (265 → under 120);
  - G5 (+150 gold wins 55–75%; the package is at 78% already);
  - G3 (mono builds get a second outlet);
  - decisions per minute.
- Playtest questions: "Did you ever have gold you couldn't use?" and "What did you spend late gold on?"

**Ledger.**
- **[Ledger](../ledger.md) §4 item 9** (late gold has nowhere to go; no nearest work).
- **ER-1b** (gold-cost Surge, never addressed): this is per building and per beat.
- **F12** (repair). A variant, "Mend: pay to heal a building", is the defensive alternative if Reinforce feeds G5 too much.
- Not CS-10's cut of interest and the Spore Exchange (that's [lens B](b-builds.md)).

**Sources.**
- Legion TD 2's mercenary sends, which turn banked currency into a wave (https://legiontd2.wiki.gg/wiki/Mercenaries).
- Battle Cats' tap-to-deploy wallet (https://www.bluestacks.com/blog/game-guides/the-battle-cats/tbc-beginners-guide-en.html).
- Warpips' medals spent mid-battle on rank, cap or cash (https://destructoid.com/?p=266808).

**Risks.**
- **Snowball:** G5 rises, since gold becomes army directly. The escalating price is the brake.
- **G3:** mono spam gets another lever.
- **The cap binds late,** at about 60 for the winner, so the sink matters mostly to the side behind (arguably right).
- **Learning load:** one more verb. Show it from battle 2 or on a first-time tip when the bank first passes 200.

---

### A9. Overtime instead of a column count at 10:00

**Problem.**
- 9% of `rework` battles end by Decision, 22% against the Lichen Baron.
- The Decision's first tiebreak is columns, which name the winner only 37–44% of the time mid-battle.
- Flyers hold no ground, and the newcomer's battle 4 showed territory frozen at 7–9 while the enemy base fell (`SS/159`).
- A battle decided on a technicality is the opposite of a climax. If A2 softens the storm, Decisions rise further.

**Change** (knob `overtime`).
- At 10:00, if both Heartcaps stand, play up to **60 s** of Overtime:
  - beats every **10 s**, with the storm already at 5;
  - a banner and a countdown;
  - **the first side to destroy any enemy building, or to deal 10% of the enemy Heartcap's max HP in overtime, wins.**
- If neither happens, today's Decision applies (columns, then Heartcap fraction).
- Rewards stay the Decision's (half). An overtime win could count as a Rout instead, but that's [lens C](c-run.md)'s and the user's call.
- **First-pass knob:**

  ```js
  overtime: { seconds: 60, beatSeconds: 10, heartcapFrac: 0.1 }
  ```

**Feel.** The tiebreak becomes a final minute both sides play for, with doubled-tempo waves and a clear, sudden-death goal, not a column count that may contradict what you saw.

**Implementation.**
- Sim rule:
  - `src/sim/systems/victory.ts` (an overtime state and the win check);
  - `src/sim/compile.ts` (time limit plus overtime);
  - `src/sim/systems/spawning.ts` (overtime beat: a separate counter rather than changing `waveBeatTicks` mid-battle);
  - an event for the banner; `src/app/battleView.ts`, `callouts.ts`.
- Default-off, so no golden change.

**Test.**
- Command:

  ```bash
  npm run experiment -- --proto rework,overtime --checks g4 --g4seeds 200
  # plus engagement against the Baron
  ```

- Watch:
  - Decisions (9% → about 3%);
  - G4 median (overtime adds at most 60 s to 9% of battles);
  - for overtime battles, whether the material leader at 10:00 wins more often than the column leader.
- Run it with A2's chosen ramp.
- Playtest question (against the Baron): "Did the end of a long battle feel decided by play or by a count?"

**Ledger.**
- **SP-2** (the storm's ending never checked with people).
- [Ledger](../ledger.md) §4 item 3 (territory has no payoff, and being behind is an edge, so columns are a poor judge).
- Research [lane-battlers](../../../../../research/research-lane-battlers.md) #4 (overtime and sudden death), not in the repo.
- Not **DR-22** (4–5 minute battles, rejected for now): the clock is unchanged.

**Sources.**
- Clash Royale's overtime, where the first tower destroyed wins, and its tiebreaker (https://en.wikipedia.org/wiki/Clash_Royale; https://supercell.com/en/games/clashroyale/blog/release-notes/november-update).

**Risks.**
- **First-building-destroyed rule:** it rewards forward buildings' fragility and dive units (Rhizomorph, flyers) in a way G3 should check.
- **Length:** it adds up to a minute.
- **Learning load:** one banner. Show a 9:30 tip ("Overtime at 10:00: first to break a building wins").
- Low value if P3 shows Decisions are rare for people.

---

## What the P3 playtest can tell us for this lens

- **"When you started losing, did you feel you had a move?"** If no, that's A1 and A8.
- **"Could you tell who was winning at 3:00? When did you know you'd lost?"** If no, or late, that's A3.
- **"Did the last two minutes feel playable, or like a coin flip?"** If a coin flip, that's A2 and A9.
- **"Did you hold? How often, and was it a choice or a routine?"** Routine or never points to A4 and A5.
- **"When did the battle first feel on?" and "Did a building ever sit undefended with units inside?"** Those point to A7 and A6.
- **Note your gold at 3:00 and 6:00.** A pile points to A8.
