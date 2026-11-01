# Lens D: feel, readability and learning

Evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): lens D's proposals. Written by an agent during that review and checked in [the critique](d-feel-critique.md); nothing here is adopted, and the review's [Appendix A](../../after-the-rework.md#appendix-a-every-surviving-proposal) holds the final verdicts. Recovered from the session transcript, so the screenshots it names aren't linked (see the [README](README.md)) and raw outputs weren't kept.

Proposals for what to build after the P3 playtest of the combat rework (`?proto=rework`), seen through one lens: can the player see and feel what's happening, and can they learn it?

Written 2026-10-31 against `develop` at `ef2e133`, from:
- the [ledger](../ledger.md);
- [`battle-feel.md`](../battle-feel.md), [`measurements.md`](../measurements.md) and [`rework-state.md`](../rework-state.md);
- the two browser playthroughs ([`playthrough-newcomer.md`](../playthrough-newcomer.md), [`playthrough-strategist.md`](../playthrough-strategist.md));
- the three research files ([lane battlers](../research-lane-battlers.md), [auto-battlers](../research-autobattler-roguelites.md), [one more run and feel](../research-one-more-run-and-feel.md));
- the code in a local checkout.

Nothing here is built or adopted.

## How these fit the user's process

**Almost all of this lens is render, audio or UI work.** It never touches `src/sim`, so it moves no golden hash and needs no guardrail run. It still has to be playtested before it's adopted. Three mechanisms keep each piece default-off and comparable:

1. **Pieces that only make sense under the rework** are gated on `state.rules.waves`, `rules.flying` and so on. That makes them invisible without `?proto=`. Examples are the beat sound, the wave preview and the flyer sparks.
2. **A presentation knob for A/B playtests:**
   - Add an optional `present` object to `BalanceSchema` (`src/data/schema.ts`), and a `feel` preset in `src/data/proto.ts` that turns on `present.armyGauge`, `present.beat`, `present.finish` and the rest.
   - `src/ui` and `src/render` read it from `content.balance.present`.
   - `compileRules` (`src/sim/compile.ts`) builds `state.rules` field by field, so a `present` key never enters the state and can't move a hash.
   - Playtest with `?proto=rework,feel` against `?proto=rework`. Single pieces turn off with `present.finish:false`.
3. **Pure corrections need no knob:** stale Help text, the HUD overflow, wrong flyer sparks, the silent burst. They are bugs in the prototype's presentation.

**Two proposals touch rules or sim state, so they need the user's OK and a measurement:**
- **D7:** a run-layer `debut` knob, measured with `--checks runs`.
- **D8:** an optional `armyLine` stat, present only under the knob.

D4's optional `called` event is a sim edit, but it changes no rule. Under the knob nothing committed moves, because the goldens in `tests/golden/` are all M1–M5 runs with no prototype.

**A correction to [`battle-feel.md`](../battle-feel.md).** `state.events` sits inside the state, and `hashValue` walks the whole state, so events are hashed. A sim-side change to an event, such as an honest `eff` on flyer hits, only escapes the committed goldens because none of them has flyers.

---

## Diagnosis: the most important problems in this lens

**1. You can't tell who's winning, so losses arrive out of nowhere.**
- **The main readout points the wrong way.** Under the rework, the side holding more ground at 2:00, 3:00 or 4:00 goes on to win only 39%, 41% and 44% of battles. A material count gets 64%, 70% and 78% right ([`measurements.md`](../measurements.md), 10 s time series).
- **The enemy's army is shown nowhere.**
  - `top.ts` shows only the player's `supplyUsed`.
  - The enemy's next wave appears only as "+N" badges on each building.
- **Strategist, run 1:** they held 27 columns to 13 with a full Heartcap at 7:08, and lost by Rout at 7:47. Their summary: "A loss you didn't see coming reads as unfair."
- **First run:** they led for 6 minutes, then lost 10 buildings and the Heartcap in about 60 s. P3 Q2 drew: "Nothing names what the enemy masses."
- **Lane stacking is invisible too.** Old Mother Mold put 5 of 7 buildings in one lane on Twin Roots, and the only way to see it was to read `__GAME__`.
- **There is a window to show.** The army gap opens about 2 minutes before the end, while the loser still has 5–6 buildings and about 100 gold ([`measurements.md`](../measurements.md)).

**2. The rework's heartbeat is silent, and its vocabulary collides.**
- **No sound or field cue.** `battleSound.ts` has no `release` case, and a release's spawn sounds collapse into one quiet puff. The field is empty for the first 20 s.
- **"Wave" means two clocks:**
  - the 60 s chip, which also drives interest, drafts and the general's warning ("2 waves" means 2 minutes);
  - the 20 s beat chip, titled "Next wave", which wears Hold's icon (`top.ts:132`, `i-hold`).

  [`rework-state.md`](../rework-state.md) notes that a player who learns "wave = beat" misreads the warning by 80 s.
- **Everything lands on one tick.** At 2:00 and 4:00 the same tick carries a release, interest, a draft that holds the sim, a storm stack and the general's read. The first run shows three banners at once (`SS/29`).
- **"Mixed wave: shields up" fires on 17–20 of about 23 beats** ([`rework-state.md`](../rework-state.md) §5.2).
- **The chips overflow at 1280.** The beat chip pushes the chips row 34 px past its column, over the Gray Rot Heartcap label.
- At 2–3× speed one tester called the beat "a metronome I watch rather than play to". P3 Q3 asks whether waves give rhythm, and the presentation may decide the answer.

**3. The finish is a 6–12 s cliff with no moment.**
- **The numbers:** a beaten Heartcap falls 12 s after its first hit, and 6 s after reaching ⅔. The winner's Heartcap is untouched in 719 of 720 battles.
- **In the playthroughs:**
  - 3000 → 0 in about 11 s;
  - 2000 → 425 → 0 in 13 s;
  - 3000 → 2184 → 0 in 6 s.
- **Nothing marks it:**
  - Hitting their Heartcap raises no callout (`battleView.ts:337` only handles your own).
  - The Heartcap on the field is baked into the terrain and never changes.
  - Shake is off by default.
  - The report wipes in on the first `ended` frame.
- **In seed 7** the enemy Heartcap went 2000 → 0 while the tug read 21 columns to 11 and the callout lane said "Bloomed Sporeling!".
- **How it felt:** short wins "felt like formalities", and a loss "did not feel earned".

**4. Half of the rework's rules can't be seen, and one is drawn wrong.**
- **Pinning and call for help have no visual.** Neither tester noticed either one.
- **Flyer sparks lie.** A melee hit on a flyer deals ×0.5, but it still shows the matrix spark. A Sporeling's slash on a Driftling throws the gold "strong" spark for an effective ×0.75 (`combat.ts:301`, `classify` ignores the flyer resist).
- **Shells and bursts that pass under a flyer show nothing.**
- **The Rhizomorph's mound is brown on brown,** and it surfaces with no effect. One tester "never saw" one, though two Tunnels did 124 damage.
- **Bursts are silent.**
- **Whose cloud is it?** One tester saw a neutral white glow for both sides.
- **Storm-grown waves are shown only in the beat tooltip,** though they decided every battle that ran past 8 minutes.

**5. Too much to learn, taught only by tooltips, while noise buries what matters.**
- **The rework adds about ten rules.** Two are invisible, five live only in tooltips, and none has a first-time tip. F8 ("too much to learn") is the standing complaint.
- **Help has no rework tab.** Its text is also stale:
  - "a hold lasts up to 30 s" (`help.ts:68`);
  - keys 1–8 (`help.ts:56`).
- **The Hold tip is wrong under waves.** It says "hold your units back for a bigger push", but Hold recalls no one under waves (`movement.ts:60`).
- **The general fields the rework's three spawners from battle 1** (`flow.ts:169–170`). The player's tray is three starter cards.
- **Noise:**
  - shield callouts on almost every beat;
  - chains of red "Column N lost" for neutral columns the player never held (`battleView.ts:332`);
  - "Bloomed Sporeling!" all the time.

**6. Combat is silent and small, and the player's own good moves aren't celebrated.**
- **No combat sound.** None of the 30 sounds plays for a hit, a death, a shot, a burst, a shield or a release.
- **Powers borrow other sounds.** Spore Burst reuses the building-razed sound and Rhizome Tithe the income one.
- **No impact.** There's no hit-stop and no hit flash.
- **The field is small.** It takes 35.6% of the screen's height, units are 24–28 px at 1280, and late clumps can't be counted.
- **The best moments go unmarked.** In the playthroughs they were all the player's decisions:
  - the Hold → double-wave swing;
  - a Spore Burst that killed two Bursters;
  - Bursters shredding a swarm;
  - a Puppet Bloom Elder duel.

  Each got the same small ring or chip as everything else.
- **Research:** Kao et al. (CHI 2024) found that feedback tied to the player's success is the kind that motivates.

---

## The proposals, ranked by expected impact on fun

| Rank | Id | Title | Effort | Timing |
|---|---|---|---|---|
| 1 | D1 | Read the enemy: army gauge, next wave at the gate, warnings | M | now |
| 2 | D2 | Give the beat a voice, a door and one name | S | now |
| 3 | D3 | A finish you see coming and feel | M | now |
| 4 | D4 | Make the rework's rules visible and honest | M | now |
| 5 | D5 | Teach the rework in the game; a callout diet | S | now |
| 6 | D6 | Juice the player's decisions; give combat a sound | M | after P4 |
| 7 | D7 | Stage the rework's units across a run, with first-sight cards | M | after P4 |
| 8 | D8 | A report that explains the loss | M | now |
| 9 | D9 | Prices that tell the truth; a placement that waits for its gold | S | now |
| 10 | D10 | A front lens (camera on the contested band) | L | only if P3 says watching is too hard |

**Quick wins** worth doing even before more playtesting, since each keeps the playtest from measuring confusion the build causes itself:
- D2;
- D5's stale text;
- D4's flyer spark and burst sound;
- D9.

---

### D1. Read the enemy: an army gauge, the next wave at the gate, and a warning before the avalanche

**Problem.**
- **Territory misleads.** Its leader at 2, 3 and 4 minutes wins 39%, 41% and 44% under the rework. Material wins 64%, 70% and 78% ([`measurements.md`](../measurements.md)).
- **The enemy's army is invisible.** No HUD element shows its supply, unit count or Elders. The next enemy wave is only "+N" per building.
- **Strategist:** 27–13 columns and 3000/3000 at 7:08, then a Rout at 7:47: "A loss you didn't see coming reads as unfair." The general stacked a lane on Twin Roots, and that was visible only through `__GAME__`.
- **First run:** a 6-minute lead, then 10 buildings and the Heartcap lost in about 60 s.
- **The window exists.** The army gap opens about 2 minutes before the end.

**Change.** Three render and UI pieces. Each reads only what the player could already see on the field, so the AI stays honest (§7.1).
1. **An army gauge under the territory tug,** one bar per side, per lane on two-lane maps:
   - It shows supply on the field plus units waiting inside spawners (`waitingUnits`), for example "Army 34 · 51".
   - The tooltip explains that territory decides a Decision at 10:00, and the army decides the Rout.
   - The formula is picked by the measurement below, from field supply, field plus waiting, and Σ(HP+shield)×DPS.
2. **The next wave at the gate:**
   - From 5 s before each beat, a strip at each side's gate, per lane, shows the wave about to leave.
   - Up to 4 unit icons with counts, a shield glyph when the wave is mixed, and "×1.4" under the storm.
   - Your own wave gets the same strip.
   - It generalises `nextWaveTypes` and `waitingUnits` (`src/ui/hud/explain.ts`) to counts per unit for either side.
3. **Two warnings and a badge:**
   - "Big wave: 31 Rot units leave in 5 s" when the enemy's next release is at least 1.5× yours and at least 10 units.
   - "Outnumbered: their army is 2:1" when the gauge ratio stays at 1.5 or more for 20 s, at most once a minute.
   - Buildings the general places while a counter is active wear the counter-kind icon for 10 s, so the counter is a thing on the field and not only text.

**What doesn't change:** counter warnings stay vague, kind only and 2 waves ahead (SPEC §1.2). The preview only summarises the wave about to leave, which is already on screen as "+N" badges.

**Feel.**
- The player sees the avalanche building about 2 minutes ahead, not in its last 6–20 s.
- A Hold, a forward Burster Pod or a saved power becomes an informed answer to a visible wave.
- A loss reads as "out-built from 5:40", not "out of nowhere".
- The 20 s beat becomes a read-and-respond moment, like Into the Breach's telegraphed attacks.

**Implementation.**
- **Files:**
  - `src/ui/hud/top.ts` (gauge row, tooltip);
  - `src/ui/hud/explain.ts`;
  - `src/render/renderer.ts` (gate strip, doctrine badge);
  - `src/app/battleView.ts` (callouts);
  - `src/ui/styles.css`;
  - `data/sprites/ui.json`.
- **Render and UI only.** No sim change, no golden moves.
- **Gates:** the preview needs `rules.waves`. The gauge and warnings sit behind `present.armyGauge`, `present.wavePreview` and `present.warnings` in the `feel` preset.
- **New tool:** a "readout" section in `tools/lib/engagement.ts`, a port of [`measurements.md`](../measurements.md)'s [`analyze_ts.py`](../scripts/measure/analyze_ts.py). It reports the share of battles whose leader on each candidate metric, at 2:00, 3:00 and 4:00, goes on to win.

**Test.**
- **Measure:** `npm run experiment -- --proto rework --checks engagement` with the readout section. Pick the formula whose 3:00 leader wins most.
  - Target: 70% or more.
  - Today: territory 41%, field supply 63%, material 70%.
- **Playtest** `?proto=rework,feel` against `?proto=rework`:
  - "At 3:00, who was winning?"
  - "When did you know you'd lost, and how long before the end?"
  - P3 Q2.
- **Judged by:** the player names the eventual winner before the first Heartcap hit in most battles, and no loss is described as coming out of nowhere.

**Effort:** M. **Timing:** now, independent of P4. **Depends on:** nothing. The gate preview needs waves; if P4 drops them, keep the gauge and warnings.

**Ledger.**
- [Never-addressed](../ledger.md) #6 (the general's adaptation isn't a moment the player can answer) and #12 (watching is hard).
- **ER-6a doctrine wave** (never addressed): this is display only, with no burst and no buff.
- **ER-6b and SP-4 answer card** (the interview's rejected alternative): not proposed. Nothing suggests answers.
- **DR-18 open counters** (never addressed): warnings stay vague.
- Also [battle-feel](../battle-feel.md) G8, [lane research](../research-lane-battlers.md) #20 and #21, [feel research](../research-one-more-run-and-feel.md) #12. Nothing here was measured and failed.

**Sources:**
- Into the Breach's telegraphs ([Road to the IGF](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-));
- Thronefall 1.0's wave previews ([PCGamesN](https://www.pcgamesn.com/thronefall/full-version-launch));
- Kingdom Rush's wave icon and encyclopedia ([wiki](https://kingdomrushtd.fandom.com/wiki/Encyclopedia));
- Sid Meier's "informed choices" ([Johnson](https://www.gamedeveloper.com/pc/analysis-sid-meier-s-key-design-lessons)).

**Risks.**
- **Clutter:** the strip shows only in the last 5 s of a beat, at most 2 rows of 8 px icons.
- **A wrong gauge is worse than none,** so measure it first.
- **It may lower battle-1 losses for people.** That's fine, but the bots never read it, so bot difficulty overstates a reading player's.
- **Learning load:** one bar and a tooltip.

---

### D2. Give the beat a voice, a door and one name

**Problem.**
- **No sound, no cue.** The 20 s beat has no sound (no `release` case in `battleSound.ts`; spawn sounds throttle to one quiet puff at 220 ms) and no field cue. Units vanish into buildings, and the field is empty until 0:20 (`SS/10`, `SS/11`).
- **"Wave" names two clocks.** The beat chip uses Hold's icon (`top.ts:132`). The general's "2 waves" means 2 minutes.
- **The minute ticks stack.** At 2:00 and 4:00 a release, interest, a draft, a storm stack and the general's read share one tick (`SS/29`).
- **Shield callout spam:** "shields up" fires on 17–20 of about 23 beats.
- **HUD overflow:** the chips row runs 34 px over at 1280×720.
- **"A metronome I watch rather than play to."**

**Change.** Render, audio and UI only, all under `rules.waves`.
1. **Sound:**
   - A `beat` drum on the player's release: sine 70→48 Hz over 0.18 s plus a brown-noise thump, priority 7, sfx bus, gain 0.6.
   - The enemy's answers 80 ms later at `enemyGain`, panned right.
   - A shimmer layer when the wave sets out shielded, which replaces the per-beat callout.
   - A soft 3-2-1 count-in on the ui bus (gain 0.25), only while you have units waiting.
   - A deeper `beat-held` when a held lane releases both waves.
2. **On the field:**
   - Waiting units drawn as a cluster at each spawner's door, both sides: up to 6 mini sprites and "+N", read from `b.stored`. The wave visibly gathers, and the first 20 s aren't empty.
   - On release, a 300 ms ripple in side glow from each lane's front spawner (a new effect kind).
3. **One name:** under waves, "the wave" is the beat.
   - The 60 s chip becomes the clock and its next mark ("3:17 · draft 4:00"). This also fixes the overflow.
   - The general's countdown reads as a time ("at 4:00 · 0:43"), not "2 waves".
   - Interest, draft and Help texts say "every minute".
   - The beat chip takes `i-wave` or a new drum icon.
4. **Callouts:** "Mixed wave: shields up" only on the battle's first shielded release, and when a lane's shield state changes.

**For the rules reconciler, not render-only:** open the minute's draft 2 s after the release, not on the same tick.

**Feel.**
- Every 20 s the player hears both armies set out, and sees them gather at the doors first.
- The battle gets a drumbeat to time a power, a Hold or a placement to.
- The general's warning means one thing.

**Implementation.**
- **Files:**
  - `data/sounds.json`, plus `REQUIRED_SOUNDS` in the registry;
  - `src/app/battleSound.ts`;
  - `src/render/renderer.ts` and `src/render/effects.ts`;
  - `src/ui/hud/top.ts` and `src/ui/hud/explain.ts`;
  - the warning countdown (`wavesText` in the intent row);
  - `src/app/tips.ts`, `src/ui/help.ts` and `src/app/battleView.ts`.
- **No sim change.** Without `?proto=` none of it appears.
- **Knob:** the door clusters and count-in can sit behind `present.beat`.
- **Test:** add a 1280×720 `tests/browser/hud.test.ts` case with `proto=rework`.

**Test.**
- Audition on `?scene=sounds`: ×8 plays, and 2× and 3× thinning.
- The HUD browser test.
- **Playtest:**
  - P3 Q3;
  - "Did you notice when waves left?"
  - "Did you read '2 waves' as beats or minutes?"
  - "When did the battle first feel on?"
- **Judged by:** the player times a power or Hold to the beat unprompted, and nobody misreads the warning.

**Effort:** S. **Timing:** now. **Depends on:** nothing.

**Ledger.**
- [battle-feel](../battle-feel.md) G1, G10 and G12.
- [`rework-state.md`](../rework-state.md) 4.1, "presentation that P1 skipped".
- The [ledger](../ledger.md)'s §5 note that "wave" means two things.
- Nothing tried before. This adds no verb; "call the beat early" ([lane research](../research-lane-battlers.md) #5) is a separate rule.

**Sources:**
- PvZ's flag meter ([wiki](https://plantsvszombies.fandom.com/wiki/Flag_Zombie_(PvZ)));
- Bad North's audio, which aimed for a battle you can follow with your eyes closed ([Gaming Audio News](https://gamingaudionews.com/2018/04/26/bad-norths-developers-talk-about-inspiration-behind-audio-and-gameplay/)).

**Risks.**
- **Fatigue:** about 24 beats in a battle. Keep it short and low, duck it under counter and storm sounds, and thin it at 2× and 3×.
- **Renaming touches many strings.** Do it only under waves.
- **Door clusters can clutter** when 12 or more units wait, so cap them at 6.
- **Learning load:** removes one (the double meaning).

---

### D3. A finish you see coming and feel

**Problem.**
- **The cliff:** first hit → dead in 12 s, ⅔ → dead in 6 s. The winner's Heartcap is untouched in 719 of 720 battles.
- **In the playthroughs:** 3000 → 0 in 11 s, 2000 → 425 → 0 in 13 s, 3000 → 2184 → 0 in 6 s.
- **Nothing marks it:**
  - no callout for hitting theirs (`battleView.ts:337`);
  - the field Heartcap is baked once (`bakeTerrain`);
  - shake is off by default;
  - the report wipes in on the first `ended` frame (`battleView.ts:512–523`).
- **How it felt:** wins "felt like formalities", and the loss "did not feel earned".

**Change.** Render, UI and audio only.
1. **Heartcap stages,** drawn over the baked strip:
   - cracks at ⅔;
   - a wilting cap and leaking spores at ⅓;
   - a 1-frame white flash per hit (at most 4 a second);
   - a pulse on the top-band HeartBar.
2. **Alarms in both directions:**
   - "Their Heartcap is under attack!" in the good tone, throttled to once every 8 s like yours;
   - "cracking" at ⅔ and "falling" at ⅓, for both sides;
   - a heartbeat under your own falling Heartcap, every 1.2 s, then every 0.8 s below ⅓.
3. **A "moment" tier:** a centred banner over the field's top edge, 1.5 s, at most one every 10 s. It's for:
   - Heartcap ⅔ and ⅓, either side;
   - a counter going active;
   - storm 5;
   - "1:00 to the Decision" at 9:00;
   - D1's big wave.
4. **A slowed last third:**
   - Once a Heartcap below ⅓ is hit, the loop's real-time scale eases to 0.4× until the end. That's 0.6× at 3×, and none under reduced motion or `?test=1`.
   - Sim ticks don't change, and commands still work.
   - The rework's roughly 3 game seconds from ⅓ to dead become about 7 s to watch and act in.
5. **A held final frame:**
   - On `ended`, the field stays 1.5 s while the fallen Heartcap bursts into lilac spores or wilts to ash. That's the art the report banner already uses.
   - Then the win or loss sound, and the wipe.

**If `breach` is adopted,** its `heartcapBreach` events drive steps 1–3, and its pulse gets a sound.

**Feel.**
- The winner gets the battle's best five seconds: the cap cracks, the banner calls it, the last blows land slowly and the cap bursts.
- The loser watches a siege they saw coming (with D1), not a number falling in the corner.

**Implementation.**
- **Files:**
  - `src/app/loop.ts` (a view-set `timeScale`: `acc += dt * speed * scale`);
  - `src/app/battleView.ts` and `src/ui/callouts.ts` (a `moment` kind);
  - `src/render/renderer.ts`;
  - `src/ui/hud/top.ts` and `styles.css`;
  - `data/sprites/heartcap.json`;
  - `data/sounds.json` (`heartbeat`, `heartcap-falls`).
- **No sim change.** Commands are stamped by tick, so determinism holds.
- **Knob:** `present.finish`.

**Test.**
- A unit test that the time scale never applies under `?test=1`.
- A browser test that the report still appears.
- **Playtest** `?proto=rework,feel`, and `?proto=rework,breach,feel`:
  - "What was the best moment of a battle you won?"
  - "When did you know you'd lost?"
  - SP-2: does the storm end battles satisfyingly or abruptly?
- **Judged by:** wins are named as highlights, and losses aren't called abrupt.

**Effort:** M. **Timing:** now. **Depends on:** nothing. It composes with `breach`, whatever P4 decides.

**Ledger.**
- **ER-7d** (adopted in part: shake off by default; breach callouts only under `breach`): this gives big moments carriers other than shake.
- **ER-7b** hit-stop (never addressed): it gets slow motion here and hit-stop in D6.
- **ER-2b and DR-26 `breach`** (built, off, awaiting playtest): this is the presentation, with no rule change. It doesn't create comebacks; [never-addressed](../ledger.md) #1 stays a rules question.
- SP-2, [battle-feel](../battle-feel.md) G2 and G9.

**Sources:**
- Sakurai's "Stop for Big Moments!" ([Automaton](https://automaton-media.com/en/news/20220824-15208/));
- Nijman's "The art of screenshake" ([talk](https://www.youtube.com/watch?v=AJdEqssNZ-U));
- PvZ's final-wave banners;
- Clash Royale's tower-down beats ([Supercell](https://supercell.com/en/games/clashroyale/blog/release-notes/november-update)).

**Risks.**
- **Slow motion gives the loser real seconds to act.** It's symmetric, and pause already allows the same, but a strategist may call it inconsistent.
- **Overdone juice** (Kao 2020): extreme juice did as badly as none, so keep one banner per 10 s.
- **Speed:** keep 3× players from feeling slowed down against their choice.
- **Learning load:** no new rules.

---

### D4. Make the rework's rules visible and honest on the field

**Problem.**
- **Pinning and call for help have no visual.** `isPinned` and `noteCall` exist only in `combat.ts`.
- **Flyer sparks show the wrong class.** A Sporeling on a Driftling shows a gold "strong" spark for an effective ×0.75 (`combat.ts:301`).
- **Shells and bursts under flyers show nothing.**
- **The mound is invisible,** and its surfacing has no effect. One tester "never saw" one; a forward Cellar lost 110 HP to "something I couldn't see".
- **Bursts and shield breaks are silent.**
- **Clouds read as neutral white** to one tester (`SS/38b`).
- **Storm-grown waves show only in the beat tooltip.**
- P3 Q4 asks exactly this.

**Change.**
1. **Honest flyer sparks:**
   - Render-side, step the tint down one class when a ground unit's melee hit lands on a flyer.
   - Or fold `resist` into `classify` in the sim. Events are hashed with the state, but no committed golden has flyers.
   - A small "whiff" puff at a flyer's shadow when a shell or burst lands under it.
2. **Pinned:**
   - a 3×3 knot glyph over a pinned archer, with its attack frame dimmed;
   - inspect status "Pinned: attacks at ×0.35".
3. **Call for help:** a 300 ms "!" over each unit that turns on an attacker.
   - Accurate: a `called` event pushed in `answerCalls`, only under `rules.help`.
   - Or a render-side guess from target changes.
4. **Shields:**
   - pale-blue sparks on shielded hits;
   - a pop ring and a glassy tick when a shield breaks (diff `u.shield` per id).
5. **Clouds:** a 1 px rim in the owner's colour, and the inner disc's alpha raised from 0.22 to 0.3.
6. **The Rhizomorph:**
   - a side-coloured rim and a fading crack trail on the mound;
   - an earth burst and a sound when `burrowed` turns false;
   - a "!" when an enemy mound passes your front.
7. **Sounds:**
   - `burst`, a wet pomf (`frequent`, 90 ms cooldown, priority 4);
   - `shield-break`;
   - `surface`.
8. **The storm:**
   - On each stack the beat chip flashes "waves ×1.4".
   - A spawner that lost units to `waveCapped` shows the existing "⬢!" glyph.
   - If testers confuse Driftlings with spores, tint the thistledown by faction ([`rework-state.md`](../rework-state.md) 4.4).

**Feel.**
- Answers stop looking random. You see archers choke, units wheel to defend a friend, and a mound crack open.
- Gold sparks appear only on strong hits, so the matrix stays learnable by watching (§10.4).

**Implementation.**
- **Files:**
  - `src/render/renderer.ts` and `src/render/effects.ts`;
  - `src/app/battleSound.ts` and `data/sounds.json`;
  - `src/ui/inspect.ts`;
  - `src/ui/hud/top.ts`.
- **Optional sim edit:** a `called` event in `src/sim/systems/combat.ts` and `src/sim/state.ts`, only under `rules.help`. That's rework-only state, so no committed golden moves.
- **No knob for the corrections** (sparks, burst sound). The glyphs can sit behind `present.ruleCues`.
- **No allocation in the hot loop** (G11).

**Test.**
- A unit test for the spark reclassification: a Sporeling slash on a Driftling classes as "normal".
- G11's frame budget (8 ms or less at 300 units) with the glyphs on.
- **Playtest, P3 Q4:**
  - "What can hit a flyer?"
  - "Why did your archers slow?"
  - "Did you see a Rhizomorph surface?"
  - "Whose cloud was that?"
- **Judged by:** the tester explains pinning and the flyer rule without opening Help.

**Effort:** M; the spark fix and burst sound alone are S. **Timing:** now. **Depends on:** nothing, except the Rhizomorph pieces, which need P4 to keep it.

**Ledger.**
- [Never-addressed](../ledger.md) #11 and #12.
- **FL-1 flyers and CS-14 the Burster** (in P3): display only, no rule change.
- [battle-feel](../battle-feel.md) G3, and [`rework-state.md`](../rework-state.md) 4.4's work column. Nothing tried before.

**Sources:**
- Riot, "Clarity in League" ([article](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/));
- Mechabellum's "brutally clear" cause and effect ([FinalBoss](https://finalboss.io/most-strategy-fans-are-sleeping-on-mechabellum-the));
- Dan Cook's skill atoms: an atom the player can't read gets ignored ([Lost Garden](https://lostgarden.com/2021/03/13/the-chemistry-of-game-design-2/)).

**Risks.**
- **Glyph clutter on 24–28 px units:** keep glyphs at 3 px, the pinned mark on the player's archers only, and call marks to 0.3 s or less.
- **Learning load:** none. It makes existing rules readable.

---

### D5. Teach the rework in the game, not in tooltips, and put the callouts on a diet

**Problem.**
- **F8.** About ten new rules, two invisible, five in tooltips only, none with a tip.
- **Help has no rework tab** (no waves, shield, flyer, burrow or pin in `help.ts`).
- **Stale text:**
  - Keys says "a hold lasts up to 30 s" (`help.ts:68`) and lists 1–8 (`help.ts:56`).
  - The Hold tip says "hold your units back for a bigger push" (`tips.ts:83`), though Hold recalls no one under waves (`movement.ts:60`).
  - The storm tip omits wave growth.
- **Call for help is explained nowhere.**
- **The Drift Stalk's tooltip has 15 rows.**
- **Noisy callouts:**
  - shields on almost every beat;
  - chains of red "Column N lost" for neutral columns (`battleView.ts:332`);
  - constant Bloomed callouts;
  - three banners at 2:00 (`SS/29`).

**Change.** UI only, under the rework's rules.
1. **A "Waves" Help tab,** shown under `rules.waves` and built from `state.rules`. It covers:
   - the beat and units waiting inside;
   - Hold under waves;
   - shields;
   - pinning;
   - call for help;
   - flyers and what hits them (a table from `versusFlyers`);
   - burrowers;
   - Bursters and clouds;
   - storm-grown waves.

   The Matrix tab's tag list gains burrow, burst, flying and pinned.
2. **First-occurrence tips** in battles 1–2 (new `TipId`s, same record):
   - `beat` on the first release;
   - `shields` on your first shielded wave;
   - `pinned` the first time an archer of yours is pinned;
   - `flyer` on the first enemy Driftling;
   - `mound` on the first enemy Rhizomorph.

   The storm tip gains wave growth, and the Hold tip gets its waves wording.
3. **Stale text:**
   - the Keys tab's Hold sentence, and 1–9;
   - the storm tooltip;
   - spawner tooltips replace the global wave rows with one line, "Waves: see the beat chip".
4. **Callout diet:**
   - shields: first time only (D2);
   - "Column N lost" only for columns you held;
   - neutral flips in a neutral tone ("The Rot takes column 23");
   - flips within 3 s coalesce into one callout ("Columns 23–18 taken");
   - drop your Bloomed callouts and keep Elders;
   - drop enemy "BLOOMED!" field labels.
5. **Function words lead cards and tooltips** ("Area burst · Burster Pod"), through `src/ui/words.ts`.

**Feel.**
- A newcomer learns each rule the moment it first matters, in one line.
- The lane carries only what they must act on: a lost building, a counter, a Heartcap under attack.

**Implementation.**
- **Files:**
  - `src/ui/help.ts`, `src/app/tips.ts`;
  - `src/ui/hud/explain.ts`, `src/ui/buildingInfo.ts`, `src/ui/words.ts`;
  - `src/app/battleView.ts`, `src/render/effects.ts`.
- **No sim change and no data text,** since wording lives in `words.ts`. No golden moves.
- **No knob needed.** The diet can sit behind `present.calloutDiet` to compare.

**Test.**
- A headless count of the callouts that would fire per battle, from the event stream:
  - shields from about 17–20 to 3 or fewer;
  - column callouts down 50%.
- A browser test that the Help tab appears only under `proto=rework`.
- **Playtest with a fresh tester and tips reset.** After battle 1, ask them to explain:
  - shields;
  - pinning;
  - what hits a flyer.

  Then ask round 3's "too much to learn?"
- **Judged by:** correct answers without opening Help, and no missed counter or building-lost callouts.

**Effort:** S. **Timing:** now. **Depends on:** nothing.

**Ledger.**
- **F8** (tips adopted; tutorial and staged unlocks never addressed): this extends the user's own 2026-10-29 choice of a UI-only clarity pass to the rework.
- **The CR brief** said F8 "isn't a constraint". The design stays unconstrained; the teaching lets the playtest tell "bad rule" from "unknown rule".
- [battle-feel](../battle-feel.md) G7 and G9, [first run](../playthrough-newcomer.md) F-7 and F-8, [feel research](../research-one-more-run-and-feel.md) #24.

**Sources:**
- George Fan's ten rules from PvZ ([notes](https://notes.hamatti.org/sources/talks/how-i-got-my-mom-to-play-through-plants-vs.-zombies)): fewer words, do it once, adaptive messages, don't create noise;
- Riot: "if everything is important, nothing is."

**Risks.**
- **More tips in battles 1–2:** the queue already shows one at a time.
- **Dropped callouts some players liked:** keep the Elder callouts.
- **Learning load:** reduced.

---

### D6. Juice the player's decisions, and give combat a sound

**Problem.**
- **Combat is silent.** No sound plays for hits, deaths, shots, bursts or shields.
- **Powers reuse event sounds** and one generic ring.
- **No hit-stop or hit flash** (ER-7b).
- **Merge noise:** 72–110 merges a battle, both sides' "BLOOMED!" labels piling up, and Elders only 1.5× size.
- **The best moments went unmarked.** In the playthroughs they were all the player's: the Hold swing (`SS/95`), the Burst on Bursters, Bursters shredding a swarm (`SS/127`), an Elder duel. Each got the same small ring or chip as everything else.
- **Research:** Kao 2024 found success-linked feedback raises motivation, and blanket amplification lowers it.

**Change.** Render and audio only, plus a hierarchy table (Riot-style, 1–10) in SPEC §10.4.
1. **Hit-stop:**
   - 70 ms when your power hits 3 or more targets;
   - 50 ms on your Elder birth;
   - none at 3×, ×0.5 at 2×;
   - never under reduced motion or `?test=1`.
2. **Per-power effects and sounds:**
   - a burst thump;
   - tithe coins rising from held columns;
   - bloom threads;
   - a count pop ("×7").
3. **Clash flash:** a 200 ms bright line across the lane where a wave you held first meets theirs, with a `clash` drum. Bigger for a double wave.
4. **Column flips:** the mat creeps across the column over 400 ms instead of the instant re-bake.
5. **Combat din:**
   - an ambient-bus loop whose gain follows hits per second (0 → 0.35 at 30/s), thinned at 2× and 3×;
   - a soft pop for each of your kills (120 ms cooldown, priority 1).
6. **Hierarchy on the field:**
   - Elders at 1.7×, with tier scales 1, 1.3 and 1.7, and a 1 px side-colour outline;
   - enemy "BLOOMED!" labels off;
   - a small ground shadow under every unit.
7. **A setting,** "Battle effects: standard / full", for an A/B.

**Feel.**
- You hear the battle swell and turn without looking.
- What you caused lands with weight: the Burst, the held double wave, the Elder you set up.
- The enemy's routine merges stay quiet.

**Implementation.**
- **Files:**
  - `src/app/loop.ts` (shared with D3);
  - `src/render/renderer.ts` (`TIER_SCALE`, outline, shadow, clash line, flip creep) and `src/render/effects.ts`;
  - `src/app/battleSound.ts`;
  - `src/audio/engine.ts` (a looped layer with settable gain);
  - `data/sounds.json`;
  - `src/app/settings.ts` and `src/ui/settingsScreen.ts`.
- **SPEC:** §10.4, §13.9, and §17 #18 and #20.
- **No sim change.** Behind `present.juice` and the setting.

**Test.**
- G11 at 300 units with full effects.
- Audition the din at 2× and 3×.
- **Playtest, standard vs full:**
  - "When did you feel clever? When did the game do it for you?"
  - "Name the three most important things in your last battle."
- **Judged by:** the player's own decisions are among the three, and nobody calls the field noisy.

**Effort:** M. **Timing:** after P4. **Depends on:** P4's event list and hierarchy (the clash line needs waves). Hit-stop, power effects, the din and Elder scale could start now.

**Ledger.**
- **ER-7b** (never addressed): built on.
- **ER-7e** sound effects (adopted for events only): extended to combat.
- **§10.4's clean field:** kept. Ordinary hits stay quiet.
- [battle-feel](../battle-feel.md) G4, G5 and G11; [feel research](../research-one-more-run-and-feel.md) #13 and #15–17.

**Sources:**
- Kao et al., CHI 2024 ([record](https://spiral.imperial.ac.uk/entities/publication/253c32f5-d124-4a23-88b5-9aaaf114608d));
- Kao 2020 ([summary](https://improbable.com/tag/rpg/));
- Jonasson and Purho, "Juice it or lose it" ([talk](https://www.youtube.com/watch?v=Fy0aCDmgnxg));
- Nijman; Sakurai;
- Bad North's audio;
- Riot's clarity article.

**Risks.**
- **Juul and Begy** found players rated the juicy version higher but played it worse. Hence success-linked juice only, and a toggle.
- **Din fatigue.**
- **Stutter at speed** from hit-stop.
- **Learning load:** none.

---

### D7. Stage the rework's units across a run, with a first-sight card for each

**Problem.**
- **The general gets the new units first.** Every general's kit includes the Tunnel, the Pod and the Stalk from battle 1 (`flow.ts:169–170`). No starter kit has any of them.
- **They show up in numbers.** In single battles, generals placed 10–28 Burster Pods, 2–13 Tunnels and 2–14 Drift Stalks over 20 battles each.
- **Battle 1 is already hard.** It's lost 52% of the time under the rework, and it now introduces three untaught units at once. [`rework-state.md`](../rework-state.md) risk 6 says it "reads as unfair".
- **Nothing gates content.** DR-28 was never addressed, and SPEC §9 has no gating until M6.

**Change.**
1. **A `debut` knob** (`src/data/proto.ts`; a balance key read by `src/run`, the way `hotStart` is): the battle index from which each rework building may join a general's kit and the player's draft pool. First pass:
   - **Burster Pod from battle 1:** the swarm's readable answer; the first-run tester called it "the best-designed new piece for a newcomer".
   - **Drift Stalk from battle 2.**
   - **Rhizomorph Tunnel from battle 3,** if P4 keeps it.

   Elites and the boss field everything.
2. **A first-sight card:**
   - The first time an enemy unit type appears in a run, a non-pausing card slides in under the callout lane for 6 s.
   - It shows the sprite at 3×, a function line ("Driftling · flies: melee hits it for half; Mortar shells and bursts can't touch it") and the matrix hints.
   - It's remembered as `seen:<unit>` in the tips record, so no new storage key.
3. **A "New" ribbon** on the player's first draft offer of each rework blueprint.

**Later, if needed:** a scripted battle-1 opener for a fresh browser ([feel research](../research-one-more-run-and-feel.md) #23), and an across-runs ladder once M6's profile exists.

**Feel.**
- Each battle of a first run brings one new thing, announced as it appears.
- The first Driftling is "a flyer: melee does half", not a white blob eating your archers.

**Implementation.**
- **Files:**
  - `src/data/schema.ts` and `src/data/proto.ts`;
  - `src/run/flow.ts` (`generalKit`; the player's `draftPool` filter);
  - `src/app/tips.ts` or a new `src/ui/firstSight.ts`;
  - `src/app/battleView.ts`.
- **A run rule.** It needs a measurement and the user's OK.
- **Goldens:** the committed M3 run golden has no prototype, so it's unaffected.

**Test.**
- `npm run experiment -- --proto rework,debut --checks runs --runs 100 --commander <c>`, per commander, against `rework`:
  - battle 1 lost 52% overall;
  - Mold 67%, Armilla 61%, Cordis 56%.
- Repeat with `hotstart`.
- Check that battle 1 still has counter-matrix answers.
- **Playtest with a fresh tester:**
  - "Was anything on the field unclear?" after battles 1–3;
  - "Did any loss feel unfair?"

**Effort:** M. **Timing:** after P4. **Depends on:** which units P4 keeps. It composes with `hotstart`.

**Ledger.**
- **DR-28** (never addressed), and F8's staged unlocks (never addressed).
- **M7's "first-run tutorial hints"** (planned): this is gating, and earlier.
- **ER-3b `hotstart`** (built, off): complementary. It takes away untaught content, not income.
- [`rework-state.md`](../rework-state.md) risk 6. Not tried before.

**Sources:**
- George Fan: spread new mechanics out;
- Kingdom Rush, one new enemy per level ([Harlow](https://gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design));
- Kingdom Rush's encyclopedia;
- Slay the Spire 2 and Brotato unlocks.

**Risks.**
- **Battle-1 difficulty moves either way.** Fewer Pods may help the player's swarm, and fewer Stalks may weaken Mold. Measure it.
- **Two run rules interact** (`debut` and `hotstart`).
- **Veterans see the staging every run** until M6.
- **Learning load:** reduced.

---

### D8. A battle report that explains the loss

**Problem.**
- **The report teaches only after the fact.** "I learned I was being out-built only after it was over."
- **Its graph shows territory,** which misleads (39–44%).
- **The counters line teaches nothing:** "countered your Swarm with Sporeling Burrow ×3".
- **Relic and card gold is hidden.** `report.ts:251` lists only stipend, economy, interest and comeback. The Spore Tithe paid about 400 gold that never showed.
- **A run-ending battle-1 loss** leaves 0 Spores and no lesson (`SS/69`).

**Change.**
1. **An army line on the front-line graph:** both sides' field plus waiting supply, sampled each second. It's an `armyLine` beside `frontLine`, present only under the knob, or it's sampled by the view in live battles.
2. **A one-line headline from real stats:**
   - the enemy's top damage source and its share ("Their Sporeling swarm did 64% of their damage");
   - a turning point, when the army lead changed for the last time at least 30 s before the end ("At 5:40 their army passed yours and stayed ahead").
3. **An honest near-miss line, only when true:**
   - their Heartcap was at 50% or less when yours fell;
   - or you led the army within 60 s of the end.
4. **A "Relics and cards" gold row.**
5. **Later:** a "watch it" replay of 15 s around the turning point, using the resume path's re-simulation.

**Feel.**
- A loss ends with "when and why", which is what sends a player into the next run.
- A win shows what the build did.

**Implementation.**
- **Files:**
  - `src/ui/report.ts`;
  - `src/sim/stats.ts` and `src/sim/state.ts` (an optional `armyLine`, under the knob, so no committed golden moves), or UI-side sampling in `src/app/battleView.ts`;
  - `src/run/resume.ts` for the replay.
- **Knob:** `present.reportArmy`.

**Test.**
- **Headless, over 720 rework battles:** the turning point comes about 2 minutes before the end ([`measurements.md`](../measurements.md)), and the headline's top source matches `damageBySource`.
- Unit tests for the wording.
- **Playtest:**
  - "When you lost, could you say why in one sentence?"
  - "Did the report change what you did next?"

**Effort:** M. **Timing:** now. **Depends on:** D1's metric, so the graph and the gauge agree.

**Ledger.**
- **CX-5** turning points (never addressed).
- **DR-32** run summary (never addressed): different, since this is the battle report.
- [First run](../playthrough-newcomer.md) F-6, [feel research](../research-one-more-run-and-feel.md) #6 and #7.

**Sources:**
- Into the Breach: "it's very clear how or why you failed";
- Clark et al. 2009 on near misses ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2658737/)), honest ones only;
- Mechabellum's cause and effect.

**Risks.**
- **A wrong headline erodes trust.** Derive it only from stats, and hedge where the attribution is weak.
- **Never inflate a near miss.** Larche found near misses the most frustrating outcome as well as the most motivating.
- **Learning load:** none.

---

### D9. Prices that tell the truth, and a placement that waits for its gold

**Problem.**
- **Six silent fails in one first-run session,** each short by 1–10 gold: 149/150, 168/170, 120/121, 115/116, 174/184 and 181/200.
- **The tray shows the base price.** `tray.ts` uses `b.cost`, but the forward price (+5% a column) applies once home is full, after about 4 buildings. Gold also lands in 5 s ticks.
- **A refused click only plays the illegal sound.**
- **Hold fails quietly.** F during Hold's cooldown does nothing, and the label truncates to "Keeping th…" (`SS/23`).
- **The Amanita** said 260 on the card and cost 286.

**Change.** UI only.
1. **Tray cards show the cheapest legal price** ("from 121", "+11 forward"), and the "need N" bar fills toward it.
2. **Clicking a plot you can't afford yet** leaves a translucent pending building ("Places at 121 · in 4 s").
   - The UI issues the place command on the first tick the gold arrives.
   - Esc or a right-click cancels it, it times out after 30 s, and only one can be pending.
   - The paused-placement ghost already draws pending buildings.
3. **F during Hold's cooldown** shows "Hold ready in 6 s". Widen or wrap the Hold label.

**Feel.** No more "I clicked and nothing happened". Saving for a big building becomes a plan you set and watch fill.

**Implementation.**
- **Files:** `src/ui/hud/tray.ts`, `src/app/session.ts`, `src/app/battleView.ts` and `src/app/input.ts`.
- **Determinism holds.** Commands are still the player's, stamped by tick, and the sim never sees a pending state.
- **No knob needed,** or `present.autoPlace` to compare.

**Test.**
- **Browser test:** with 115 gold and a 116 plot, the click leaves a pending building that's placed on the next income tick, and the tray reads the forward price.
- **Playtest:** count failed placements (6 → 0). Ask "Did you ever click and nothing happened?"

**Effort:** S. **Timing:** now. **Depends on:** nothing.

**Ledger.**
- **F1** (the forward price rule, never addressed): unchanged here. This only shows the price honestly.
- **CS-10's cut list:** untouched.
- [First run](../playthrough-newcomer.md) F-10; F4 and F5 (tray UI, adopted).

**Sources:**
- Sid Meier's informed choices;
- George Fan's adaptive messages;
- Pichlmair and Johansen's "support" aim for game feel ([survey](https://arxiv.org/abs/2011.09201)).

**Risks.**
- **An unwanted auto-place:** it stays visible, cancellable and time-limited.
- **Banking for big buildings gets slightly easier.**
- **Learning load:** none.

---

### D10. A front lens: a camera on the contested band, if watching proves too hard

**Problem.**
- **The field is small.** It takes 35.6% of the window's height at both 1280×720 and 1920×1080, and units are 24–28 px at 1280.
- **Width caps the scale.** The 576 px strip at 2× is 1152 px of 1264 available, so no HUD trim helps.
- **Armies are bigger under the rework:** field supply 39 against 26 at 5:00, a peak of 62, and merges ×3.
- **Clumps can't be read.** Clumps of 5–10 merged units are "hard to parse". The clump at the enemy's buildings at 7:00 "can't be counted" (`rw-mold-7m00`).
- **The user wants bigger swarms on a bigger map,** which needs a camera plan.

**Change.**
1. **A `?view=lens` prototype:**
   - The field draws at 3× at 1280, showing 24 of 36 tiles, with units at 36–42 px.
   - It centres on the contested band, easing over 0.6 s to the column with the most units in contact.
   - It snaps home while you place or aim at home, and swings to a Heartcap under attack (D3).
   - The territory tug becomes a clickable minimap with unit dots.
   - `Z` toggles the whole lane.
   - On two-lane maps it frames both fronts.
2. **A cheaper first step:** a "fight inset" in the roots ceiling at window heights of 900 px or more. It's a 3× crop of the hottest 8×6 tiles, render only.

**Feel.** Fights read as fights: an Elder, a shield popping, a Burster rolling in. The swarm becomes a spectacle, not a smudge.

**Implementation.**
- **Files:**
  - `src/app/battleView.ts` (`fit`, viewport);
  - `src/render/renderer.ts` (a view offset);
  - `src/app/input.ts` (`tileAt`);
  - `src/ui/hud/top.ts` (minimap).
- **SPEC:** reverses §13.6's "No camera", and touches §10.1.
- **Render only.** A URL flag or `present.lens`.

**Test.**
- Browser tests for clicks under pan, and G11.
- **Playtest A/B:**
  - "Could you see what your units were doing?"
  - "Did you miss anything off-screen?"
- **Judged by:** the lens is preferred, with no building lost unseen.

**Effort:** L. **Timing:** only if P3 shows players can't follow fights. **Depends on:** that P3 outcome, and the user reversing §13.6. Bigger swarms (CS-7) would need it anyway.

**Ledger.**
- **ER-7a** (rejected; framing was done instead): different, because it crops to the front rather than scaling the whole strip, which the width forbids.
- **CS-7** (parked camera and zoom plan): built on.
- [battle-feel](../battle-feel.md) G4, [feel research](../research-one-more-run-and-feel.md) #16.

**Sources:**
- Riot's clarity article (size signals role);
- TABS's two-colour armies;
- Mechabellum.
- Clash Royale and PvZ have no camera at all, which is the counter-argument.

**Risks.**
- **Loses the "whole map always visible" promise.**
- **Losses happen off-screen.**
- **Easing motion:** under reduced motion, pan only by hand.
- **Attention splits** between building at home and fighting at the front.
- **Learning load:** one key.

---

## Questions to add to the P3 playtest now (cheap, and they judge this lens)

1. At 3:00, who was winning? When did you know you'd lost, and how long before the end was that? (D1, D3, D8)
2. Did you notice when waves left? Did you read the general's "2 waves" as beats or minutes? (D2)
3. What was the best moment of a battle you won? Did the end feel abrupt? (D3)
4. Why did your archers slow down? What can hit a flyer? Did you see a Rhizomorph surface? (D4)
5. After battle 1, name the rules that waves added. Was there too much to learn? (D5, D7)
6. Name the three most important things that happened in your last battle. When did you feel clever? (D6)
7. Did you ever click and have nothing happen? (D9)
8. Could you see what your units were doing in the big fights? (D10)
