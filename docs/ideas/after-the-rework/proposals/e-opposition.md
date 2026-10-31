# Lens E: Opposition and challenge

Evidence for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): lens E's proposals. Written by an agent during that review and checked in [the critique](e-opposition-critique.md); nothing here is adopted, and the review's [Appendix A](../../after-the-rework.md#appendix-a-every-surviving-proposal) holds the final verdicts. Recovered from the session transcript, so the screenshots it names aren't linked (see the [README](README.md)) and raw outputs weren't kept. Where it lists A1–A3 as measured and failed, those are the [balance backlog](../../../balance-backlog.md)'s presets of that name, not lens A's proposals.

Written 2026-10-31 against `develop` at `ef2e133`. The lens is what the player plays against: the generals, the adaptive counter cycle and intel file, elites, the boss, the planned Gray Rot, scouting, and whether difficulty tests the build or only its numbers.

Nothing here is adopted. Every rule or multi-general change waits for the user's OK (`.claude/rules/balance.md`). Each proposal says whether it can be a default-off `?proto=` knob.

**New measurements for this lens** (headless, no tracked file changed; reports in the gitignored `reports/experiments/fE-*.json` and logs in `E-measure/`, raw output not kept). Bots aren't people, and 30-seed cells carry about ±17 points of noise.
- `engagement`, 30 seeds per general, Bogwater, `--power-policy auto`: `rework` against `rework` + Old Mother Mold on a 15 s or 30 s beat (`general.mother-mold.passive.modifiers+:[{"stat":"side.waveBeat","op":"mul","value":0.75}]`), and the Lichen Baron's Mortar weight 3 → 1 (`general.lichen-baron.weights.puffballMortar:1`).
- `runs`, 100 per commander (seeds 1–100, the same seeds as the official check in [`measurements.md`](../measurements.md)'s `official.md`, raw output not kept), with both changes together.

| Measure | `rework` | + Mold on a 15 s beat, Baron's Mortar weight 1 |
|---|---|---|
| Battle 1 lost (300 runs) | 159 (53%) | **110 (37%)** |
| Run over in battle 1 | 147 | **95** |
| Battle 2 lost (of played) | 65/153 (42%) | 83/205 (40%) |
| Runs won | 53 (18%) | **76 (25%)** |
| Runs won V / A / C | 28 / 12 / 13 | 39 / 22 / 15 |
| Boss fights won | 53/60 | 76/85 |
| `bot:balanced` wins vs Mold, V / A / C (single battles) | 40 / 37 / 20% | 70 / 77 / **13%** |
| vs the Baron, V / A / C | 80 / 73 / 57% | 67 / 70 / 47% |
| Baron Decisions, V / A / C | 17 / 17 / 37% | 10 / 17 / 33% |

- Mold on a **30 s** beat changes nothing (Vesper 40 → 43%).
- Mold's tempo is a large, data-only difficulty lever. It's also a personality.

---

## Diagnosis: the 5 most important problems, as the player meets them

### 1. You can see what the general thinks of you, but never what it's doing

**Where you look and what's missing:**
- The intent panel talks only about your army ("Preparing to counter your SWARM").
- The HUD shows your supply but not the enemy's (`src/ui/hud/top.ts`; [battle-feel](../battle-feel.md) §2.5: "the enemy's isn't shown anywhere").
- Nothing sums the enemy's next wave, says whether it's shielded, or shows which lane it's stacking.

**What the playthroughs found:**
- The strategist's run 1: "Mother Mold stacked 5 of 7 buildings in lane 1 on Twin Roots. I found that out only by reading `__GAME__`."
- The [first-run player](../playthrough-newcomer.md) (F-9): "Nothing told me what the enemy was massing, which is what I needed to answer it."

**What it costs:** losses read as unfair rather than earned.
- The player learned they had been out-built (468 units to 177) only from the report.
- They held 27 columns to 13 at 7:08 and lost at 7:47.

**Why this is fixable:** the information already exists. SPEC §7.4 says "There is no fog of war", and under waves every enemy spawner already carries a "+N" badge. The HUD just never adds it up.

### 2. The counter isn't a moment, and often isn't a counter

**The Anti-Swarm set is any slash or splash spawner** (`counterKindsOf`, `src/sim/ai/counter.ts`). That includes the Sporeling Burrow, so Old Mother Mold's "counter" to a swarm multiplies her own staple by 3.
- With the whole roster (single battles), `data/generals.json`'s weights plus the rework's weight-1 buildings take her Burrow share of purchases from about 34% to about 46% at 4:00.
- In a run's battle 1 her kit is the Burrow plus the three rework buildings (`generalKit`, `src/run/flow.ts`), and all four are in the Anti-Swarm set. So the counter multiplies everything by 3 and leaves her purchase mix exactly as it was (62% Burrows before and after). The counter is literally invisible.
- Both playthroughs' reports read "countered your Swarm with Sporeling Burrow ×3" ([first run](../playthrough-newcomer.md) `SS/68`, [strategist](../playthrough-strategist.md) `r2b1_end`).
- Against a flyer army it also built Sporeling Burrows, whose melee hits flyers for ×0.5 ([strategist](../playthrough-strategist.md) `sb_f_end`).

**The defensive general can't answer a swarm.** The Lichen Baron, even with the right read, wins only 12–15 of 50 against mono Sporeling under every existing knob ([`rework-state.md`](../rework-state.md) §3.3).

**The boss's counters are weak by construction.** It counters with the *cheapest* member of each kind's set (`bossCounters`, `flow.ts`), which for Swarm is the 110-gold Sporeling Burrow.

**The warning misleads.** "2 waves" means 60 s waves, while the HUD's beat chip calls 20 s releases "waves" ([`rework-state.md`](../rework-state.md) §1.3).

**What the player feels:** "SWARM, SWARM, SWARM" in every battle ([first run](../playthrough-newcomer.md) §5). The counter arrives as an invisible spending lean.

### 3. The generals differ in difficulty, not in what they ask

**Win rates differ a lot.** `bot:balanced` against each general under `rework` ([`measurements.md`](../measurements.md), 180 battles each):

| General | Player wins | Notes |
|---|---|---|
| Old Mother Mold | 40% | |
| Lichen Baron | 72% | 22% Decisions, first flip 2:55, no flip by 3:00 in 50% |
| Blightwright | 62% | |

Battle 1 is lost 67% of the time against Mold and 34% against the Baron.

**In play:**
- Mold is a wall. Her releases are 12 units against the bot's 5.4 ([`rework-state.md`](../rework-state.md)).
- The Baron and the Blightwright "went greedy and passive (Cellars, 10–17 supply) and folded" ([first run](../playthrough-newcomer.md) F-9).

**Why they don't feel different:**
- Personalities are invisible percentages: +10% spawn, +20% HP, +15% siege speed.
- Each general's `title` ("Swarm and early aggression") is in the data, but no screen shows it (`src/ui/screens/run.ts` `nodeView`; `src/ui/help.ts`).
- Every general gets the same three rework buildings at weight 1 from battle 1 (`flow.ts`, "roster buildings with an `aiWeight` join every kit"). In battle 1 they are 3 of Mold's 4 buildings and 3 of the Baron's 5. The player can't build them and was never told about them.

**The Baron's doctrine was written for M4.**
- The Mortar carries weight 3 of his 15, but under `rework` it's worth 1.5 supply per 90 s against 9.7 on M5 ([`measurements.md`](../measurements.md) spread), and it can't hit flyers.
- **[new]** Cutting it to weight 1 makes him a tougher opponent: the bot wins 63 → 55 of 90.

### 4. The difficulty curve is upside down, and it tests numbers, not builds

**The curve:** battle 1 is lost 52% of the time, but runs that reach the boss win it 88% (95% with `hotstart,bigdrafts`) ([`measurements.md`](../measurements.md)).

**How each opponent scales:**
- **The generals:** "+1 random upgrade level per battle index" (SPEC §7.8).
- **Elites:** stat bumps (Fortified +30% Heartcap, Veteran +1 level, Swift instant first spawn; `data/elites.json`). They add about 10 points of run-ending risk (44% lost against 34%, [`run-loop.md`](../run-loop.md) §2) for a relic pick.
- **The boss:** a bigger general. 7 buildings, 4 levels, 3600 HP, +25% turrets, and even weights over 11 buildings (`data/generals.json`). Nothing in it asks "does your build answer X?" ([ledger](../ledger.md) ER-3c, OMR-9, DR-20: never addressed).

### 5. The general has no memory or voice the player can feel, so a loss doesn't start a rivalry

**The only memory the player sees:**
- the route's intel bars;
- one "The Gray Rot remembers your SWARM" callout;
- the report's counter list.

**What a loss leaves:** losing battle 1 ends the run with 0 Spores and no record of who beat you or how ([first run](../playthrough-newcomer.md) `SS/69`; [ledger](../ledger.md) DR-19 nemesis log, DR-38 voice, CX-7: never addressed).

**The Gray Rot is a palette swap.** M7 specs it as a role mirror with +10% HP and −10% speed (SPEC §11.12), so a counter looks like your own army (ER-6c, never addressed). The Gray Rot also needs its own versions of the rework's tools (CR-13, unspecified).

---

## Proposals, ranked by expected impact on fun

| # | Title | Effort | Timing |
|---|---|---|---|
| E1 | Scout the general: its next wave, its army and what it's massing | S | now, independent of P4 |
| E2 | Re-voice the three generals for the rework: tempo, doctrine, one signature unit each | M | after P4, whatever it decides |
| E3 | Counter recipes: each general answers in its own voice, and the answer works | M | after P4, whatever it decides |
| E4 | Battle 1: choose your first opponent, and generals that teach before they ambush | S | after P4, whatever it decides |
| E5 | The counter wave: the general holds, then sends its counter as one telegraphed double wave | M | only if P3 shows a specific outcome |
| E6 | The Pale Sovereign as a final exam: an Edict from row 1, and re-reads at ⅔ and ⅓ | L | after P4, whatever it decides |
| E7 | Elites as trials: a named build question on the node, and loot that answers it | M | after P4, whatever it decides |
| E8 | The general as a nemesis: a voice, a dossier, a grudge | S | now, independent of P4 |
| E9 | The Gray Rot as a mirror with three teeth (the M7 roster, asymmetric) | XL | later bet |

---

### E1. Scout the general: its next wave, its army and what it's massing

**Problem.**
- During a battle you can't see the enemy's army size, its next wave, or where it's stacking.
  - [Strategist](../playthrough-strategist.md) §2: "The HUD shows my supply, not theirs."
  - Mold's lane-1 stack on Twin Roots was found only by reading `__GAME__`.
- The intent panel speaks only of your army ([first run](../playthrough-newcomer.md) F-9).
- Losses arrive "without warning" ([strategist](../playthrough-strategist.md) problem 1, [first run](../playthrough-newcomer.md) F-1). The 468-to-177 unit gap was visible only in the report.
- P3's Q2 ("When the general massed something, could you answer it?") can't get a yes if you can't see the mass.

**Change** (render and HUD only):
1. **An enemy beat chip** mirrors the player's, beside the enemy Heartcap bar.
   - It reads "Rot wave 7 s · +12", from the `stored` counts on the general's spawners.
   - A small shield glyph shows when a lane's next enemy wave holds 2 or more unit types, so it will set out shielded.
   - On multi-lane maps, each lane's end of the tug shows its own "+N".
2. **An enemy army readout** in the intent panel: "Army 38/60", from the general's `supplyUsed`.
3. **A "Massing" line** under the general's name, shown when one spawner type is at least 40% of its spawners and it owns at least 3 of them: "Massing: Sporeling Burrow ×9".
4. **A "Big wave" callout**, 5 s before a beat, when the enemy's next release in a lane outnumbers yours by at least 1.5× and at least 8 units: "Big wave, lane 1: 31 Sporelings". At most one per lane per minute.
5. **The warning counts in clock time:** "Preparing to counter your SWARM · at 4:00", not "2 waves".

**How it would feel.**
- You see Mold's brood swelling in her buildings and her army passing yours before the collapse, so a loss reads as "I got out-built" rather than as a coin flip.
- Hold, Spore Burst and the next build gain a target: "her big wave leaves in 5 s, keep mine home and meet it under my turrets."

**Implementation.**
- **Files:** `src/ui/hud/top.ts` (chips, intent rows), `src/ui/doctrine.ts` (the warning text, the massing line), `src/ui/hud/explain.ts` (tooltips), `src/app/battleView.ts` (the callout).
- **Data:** the helpers exist. `waitingUnits(state, side)` already feeds the player's beat chip, and `b.stored` and `supplyUsed` are on the state.
- **Sim and goldens:** no sim change and no golden impact.
- **Gating:** not a proto knob (render only). Items 1 and 4 exist only under `rules.waves`. It can ship on the dev site for the P3 follow-up.

**Test.**
- Screenshots at 1280×800 and 1440×900. The HUD already overflows under `rework` ([battle-feel](../battle-feel.md) G10), so check that the new chips fit.
- Playtest questions:
  - "Before each beat, did you know what the general was sending?"
  - "When you lost, could you say why in one sentence, and when did you first see it coming?"
- Bots don't read the HUD, so there's no sim measurement.

**Effort:** S. **Timing:** now, independent of P4. **Depends on:** none. Items 1 and 4 need waves; items 2, 3 and 5 stand alone.

**Ledger.** Not a ledger row.
- It overlaps the research's wave preview ([lane research](../research-lane-battlers.md) #20, [one-more-run](../research-one-more-run-and-feel.md) #12) and [battle-feel](../battle-feel.md) G8 "nobody can tell who's ahead".
- It differs from the interview's rejected "answer card" (ER-6b, SPEC §18.2 Q4). It shows only present, visible state, never the coming counter's units or their answer, so the vague telegraph (SPEC §1.2) is untouched.

**Sources.**
- Into the Breach's telegraphed intents ("every death felt like your own fault") and Kingdom Rush's wave preview, both in [`research-one-more-run-and-feel.md`](../research-one-more-run-and-feel.md) §2.5 and #12.
- Legion TD 2's known wave list and Thronefall's previews, in [`research-lane-battlers.md`](../research-lane-battlers.md) #20.
- TFT's "every board can be scouted", in [`rounds.md`](../../rounds.md).

**Risks.**
- HUD clutter on a band that already overflows.
- It makes the general easier for humans, which bots won't show.
- Callout noise: the per-beat shield callout already floods the lane ([first run](../playthrough-newcomer.md) F-8). Rate-limit the Big-wave callout.
- Learning load is low: it answers questions players already ask, and every element has a tooltip.

---

### E2. Re-voice the three generals for the rework: tempo, doctrine, one signature unit each

**Problem.**
- Generals differ in difficulty, not in the question they ask: Mold 40%, the Baron 72% (with 22% Decisions), the Blightwright 62% ([`measurements.md`](../measurements.md)).
- Mold is a battle-1 wall (67% lost). The other two play greedy and passive ([first run](../playthrough-newcomer.md) F-9).
- Their passives are invisible percentages, their `title` is never shown, and all three get the same three rework buildings from battle 1 (`flow.ts`).
- The Baron spends a fifth of his weight on a Mortar the rework made nearly worthless: 1.5 supply per 90 s, and it can't hit flyers.

**Change.** Each general gets a voice the player can read, made of first-pass proto knobs (a code knob is marked as such):

**Old Mother Mold, "the brood that never rests":**
- Her passive gains `side.waveBeat` ×0.75, so her waves leave every 15 s: smaller and more frequent, out of step with yours.
- Her signature rework unit is the Burster Pod, first in `preferred`, so it joins at battle 2. She doesn't take the Tunnel or the Stalk. This needs E4's kit rule.

**The Lichen Baron, "the wall that sallies":**
- Mortar weight 3 → 1, and Burster Pod 2.
- A sally stance (code): when no lane is under pressure, he holds every other beat, so his waves come as 40 s doubles.
- Target: Decisions against him ≤ 15%.

**The Blightwright, "siege with air cover":**
- Drift Stalk weight 2, second in `preferred`.
- Cellar `maxOwned` 3 → 2, since he went greedy.
- A siege-push stance (code): he holds a lane while a Rootbreaker waits inside, then releases when 2 or more siege units are stored.

**Show it:**
- The route node and the intent panel print the general's `title` and its passive in words ("Her swarm spawns 10% faster · her waves leave every 15 s").
- E1's enemy beat chip shows the tempo.

**Optional: escalate by name.** From battle 3, swap the general's hidden "+1 random level" for a named trait. For example, Mold's "Elder brood": her trios knit at once (`side.knitTicks` ×0.25).

**[new] Measured first pass** (Mold on 15 s plus the Baron's Mortar 1, both pure data):
- Runs: battle 1 lost 53% → 37% (159 → 110 of 300), runs won 18% → 25%, battle 2 unchanged (42% → 40%).
- Single battles against Mold: Vesper 40 → 70%, Armilla 37 → 77%, Cordis 20 → 13%.
- Mold on a 30 s beat changes nothing.

**How it would feel.**
- Three opponents that look, sound and pace differently:
  - Mold is a relentless stream you grind down, and you learn to fight her at your gate.
  - The Baron is a fortress that sallies every 40 s, and you learn to punish his empty beat.
  - The Blightwright arrives in siege columns under Driftling cover, and you learn to keep anti-air at home.
- Battle 1 against Mold stops being a coin flip on the run while she stays recognisably the swarm.
- Choosing an opponent (E4) or meeting one again (E8) means something.

**Implementation.**
- **Data, measurable today with no code:**
  - Mold's tempo: `general.mother-mold.passive.modifiers+:[{"stat":"side.waveBeat","op":"mul","value":0.75}]`.
  - Weights, `preferred` and `limits` through `general.<id>.…` proto paths (`src/data/proto.ts` `applyProto`).
- **Code:**
  - A per-general stance policy (`GeneralSchema` field `stance?: 'sally' | 'siege'`) read by `applyStancePolicy` in `src/sim/ai/controller.ts`, which today returns early under waves. Default-off through the proto knob `laneStance.ai.wavesPolicy:true`.
  - The kit rule is E4's.
  - Render: the route node and intent-panel text.
- **Goldens:** none while behind proto. On adoption, `data/generals.json` changes and any golden that plays these generals needs a refresh.
- **Guardrails:** G3, G4 and G8's mono rows play `bot:balanced`, the scripted general or the Baron. Re-run G8 if the Baron's weights change.

**Test.**
- `npm run experiment -- --proto '<spec>' --checks engagement,runs --commander all --power-policy auto --runs 100 --seeds 60`.
- Targets:
  - battle 1 lost ≤ 35% without `hotstart`;
  - each general between 45% and 75% player wins;
  - Baron Decisions ≤ 15%;
  - the commander spread in runs won at most 15 points. It's 24 today and still wide here: 39 / 22 / 15.
- Watch Cordis against a 15 s Mold (20 → 13%). If it holds at 60 seeds, look at Puppet Bloom against desynced waves.
- Then a dev-site pass, `?proto=rework,<spec>`.
- Playtest questions:
  - "Name each general's style in a few words."
  - "Did you play differently against each one?"

**Effort:** M. **Timing:** after P4, whatever it decides. **Depends on:** P4 for adoption. The tempo knob needs waves and can join P3's optional second pass now, as `hotstart` can. The rest stands under any model. E1 shows the tempo. E4 supplies the kit rule.

**Ledger.**
- New. Moving Mold out of battle 1 (ER-3b, built, off, the user's call) removes her. This keeps her and changes how she plays.
- It doesn't touch A1–A3, which were read and weight changes inside the counter cycle.
- K1 battle 1 and K4 are adjacent.

**Sources.**
- 9 Kings' distinct kings, which the user named as the model for variety ([CR "What 9 Kings does"](../../combat-rework.md#what-9-kings-does); [`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) §2).
- Kingdom Rush's "one new threat per level" ([one-more-run research](../research-one-more-run-and-feel.md) #3).
- Clash Royale's tempo and counter-push ([lane research](../research-lane-battlers.md)).

**Risks.**
- A per-side beat desyncs waves, which the rework uses so units arrive together. Re-run the counter matrix if a general's tempo is adopted.
- Mold gets much easier (+30 points for Vesper and Armilla) and could swing below the band. Tune at 0.8–0.85.
- AI holds raise difficulty in a way bots haven't measured: the player holding every other beat was worth +8 of 30 against the Baron ([`rework-state.md`](../rework-state.md)).
- Learning load is moderate: two beat chips and per-general rhythms. Stage it by showing the enemy chip only when its beat differs from yours, and by meeting one general's voice per battle.

---

### E3. Counter recipes: each general answers in its own voice, and the answer works

**Problem.**
- The counter set is "any spawner with the right damage type" (`counterKindsOf`).
- So Mold "counters" a swarm with more Sporeling Burrows, the Baron's counters fizzle (12–15 of 50 against mono Sporeling under every knob), flyers get Burrows, and the boss counters with the cheapest set member (`bossCounters`).
- [`rework-state.md`](../rework-state.md) §3.3: "Teaching the answer means changing what the counter set is, not how hard it's weighted."
- From the seat: "SWARM, SWARM, SWARM", "A player can't learn a counter from that" ([strategist](../playthrough-strategist.md) §2), and a mono flyer army that "needs no decisions".

**Change.**
1. **Explicit counter recipes as data.**
   - A `counters` map per general in `data/generals.json`, for example `"swarm": {"veilstalkerHollow": 3, "bursterPod": 2}`.
   - It's used by `doctrineMult` and `draftMissingCounter` in place of the derived set. A general without a recipe falls back to today's sets.
   - A recipe never lists the general's own staple, so a counter looks different from its normal play.
2. **First-pass recipes from the counter matrix's confirmed answers** under the adopted model, voiced per general. Under `rework` the answer to mono Sporeling is Sporeling + Veilstalker (shields plus a slayer against waves that merge everything).
   - Mold, Anti-Swarm: Veilstalker 3, Burster Pod 2.
   - The Baron, Anti-Swarm: Capguard 2, Veilstalker 3 (a shielded line with slayers).
   - The Blightwright, Anti-Swarm: Gill Nest 2, Burster Pod 2.
   - Anti-Elite: Veilstalker for all three.
3. **The AIR kind from [`docs/ideas/flyers.md`](../../flyers.md).**
   - Its score is the player's air share, and flyers leave the armor shares.
   - Its recipe is Gill Nest plus Capguard (Drift Stalk for the Blightwright).
   - The towers' ×2 under pressure ignores pressure from flyers alone.
4. **`bossCounters`** takes each top intel kind's recipe head rather than the cheapest member of the set.

**This is the user's decision.** [`docs/status.md`](../../../status.md#waiting-on-the-user) #3 says "Teaching it the answer is undecided. Don't start it unasked."

**How it would feel.**
- When the warning lands, the general's next buildings are visibly different from its usual army: Veilstalkers and Bursters arrive to meet your Sporelings, and Gill Nests to meet your Driftlings.
- Your mono build gets a real reply, which pushes you to pivot or mix: pillar 3, "no build survives on autopilot".
- The report line "countered your Swarm with Veilstalker Hollow ×3, Burster Pod ×2" teaches a counter you can copy.

**Implementation.**
- **Files:** `src/sim/ai/counter.ts` (`counterSets` takes a recipe; `doctrineMult` multiplies by the recipe weight; a fifth kind, `air`, in `analyzeMix`, `COUNTER_KINDS` and `KIND_LABEL`), `src/data/schema.ts` (`GeneralSchema.counters`), `src/run/flow.ts` (`bossCounters`), `data/generals.json`, `src/ui/doctrine.ts` (an AIR icon and label).
- **Proto knobs:** `ai.counter.recipes:true`, recipes through `general.<id>.counters.<kind>:{…}`, and `ai.counter.air:true`.
- **Goldens:** none while off. Adopting it changes every adaptive-general replay.

**Test.**
- `npm run experiment -- --proto rework,<spec> --checks g8,engagement,runs --commander all --power-policy auto`, plus the 100-seed Baron check against mono Sporeling, mono Veilstalker and mono Drift Stalk.
- Targets:
  - the Baron wins ≥ 50% against mono Sporeling (24% today);
  - mono Drift Stalk drops ≥ 20 points against the adaptive general ([flyers.md](../../flyers.md)'s G8 row);
  - `bot:balanced` stays at 40–65% against the adaptive general.
- Playtest question: "When the general countered you, could you tell what it built, and did it make you change your build?"

**Effort:** M. **Timing:** after P4, whatever it decides, since the recipes come from the adopted model's counter matrix. **Depends on:** P4 and the user's go-ahead ([status](../../../status.md#waiting-on-the-user) #3). It's best with E1 (see it) and E5 (feel it arrive).

**Ledger.**
- **Measured and failed:** A1 (read merging harder), A2 (a floor weight over the damage-type set: "against a Sporeling swarm the Baron builds Sporeling Burrows"), A3 (an earlier cycle).
- **Not addressed:** CR-14 (held), FL-2 Anti-Air (never addressed), K4.
- **What differs:** this replaces the set's definition with composition recipes, excludes self-staples and voices each general. The [backlog](../../../balance-backlog.md)'s untested lead (a floor limited to buildings that beat the player's armor) is still derived from damage types. Under waves even that keeps Sporelings, which deal slash against Light.

**Sources.**
- [`rounds.md`](../../rounds.md)'s counter table, as a "buy the answer" policy.
- 9 Kings: each king's army is a distinct deck you learn to read.
- Mechabellum: your counter is visible as a different unit mix.
- The [design review](../../one-more-run-design-review.md) §5.5 ("bound counter strength").

**Risks.**
- A counter that always works makes the general a hidden nerf the other way. Keep DR-21's bound: an assembled, mixed engine should still win about 70–80% at Decay 0, so measure `bot:balanced` against the adaptive general.
- More AI data to keep in step with each model change.
- Learning load is low to medium: AIR is a fifth kind on the warning, but counters become recognisable, which lowers the load overall.

---

### E4. Battle 1: choose your first opponent, and generals that teach before they ambush

**Problem.**
- Battle 1 decides runs: 52% lost, and 67% against Mold ([`measurements.md`](../measurements.md)).
- It's a draw you don't choose: row 1 is one battle node (`generateRoute`, `src/run/route.ts`).
- In battle 1 the general's kit is mostly units the player can't build and hasn't been told about.
  - Mold: Sporeling Burrow plus Tunnel, Pod and Stalk.
  - The Baron: Capguard and Cellar plus the same three (`generalKit`).
  - "The general gets new toys first" ([`rework-state.md`](../rework-state.md) risk 6).
- `tips.ts` has no first-sight tip for an enemy unit.
- Mold opens with 2 Burrows and no economy (her Cellar joins in battle 2), while the battle-1 tip tells the player to build a Cellar first ([first run](../playthrough-newcomer.md) F-3).
- Nothing before Begin says so: "Both sides place blind" ([battle-feel](../battle-feel.md) §1), and the node shows only a name and a portrait.

**Change.**
1. **Two battle nodes in row 1** (`assignGenerals` already puts different generals in one row, so they'll be Mold and the Baron).
   - Each shows the general's `title`, its opener ("Opens: 2 Sporeling Burrows, no economy") and its battle kit from `generalKit`.
   - Rows below keep their links.
2. **Kit rule:** buildings with `aiWeight` (the rework's three) join a general's kit through its `preferred` list by battle index, not all at battle 1 (E2 gives each general one signature). Knob: `enemyKit.prototypeFrom:2`.
3. **First-sight tips:** the first time an enemy Burster, Driftling or Rhizomorph appears in a run, one line names it and what answers it ("Bursters: area damage through armor. Kill them before they reach your clump; they can't hit flyers.").

**How it would feel.**
- Your first decision is "who do I fight?", made with real information: the swarm or the turtle.
- Battle 1 teaches the general's personality before it adds new unit types.
- A loss is to an opponent you chose and could read, not an ambush by units you've never seen.

**Implementation.**
- **Files:**
  - `src/run/route.ts`: the row-1 shape behind a knob such as `route.firstRow:["battle","battle"]`, read by `generateRoute`.
  - `src/run/flow.ts`: the `aiWeight` line in `generalKit` gated on `enemyKit.prototypeFrom`.
  - `src/ui/screens/run.ts` `nodeView`: title, opener and kit.
  - `src/app/tips.ts`: enemy first-sight tips.
- **Goldens:** the route and kit changes are run-level and sit behind proto knobs. Run goldens change only if adopted.

**Test.**
- `--checks runs --commander all --power-policy auto --runs 200`, with bots on a random route (the average) and on a scratch "always the Baron" route (the floor).
- Measure battle-1 loss by general with the kit rule on and off, alone and stacked on E2's tempo and on `hotstart`.
- The kit rule could make Mold **harder**: her battle-1 kit would be pure Sporeling Burrow, and mono Sporeling is G3's worst failure. Measure before playtesting.
- Playtest questions:
  - "Why did you pick that general?"
  - "In battle 1, did any enemy unit surprise you?"

**Effort:** S. **Timing:** after P4, whatever it decides. **Depends on:** P4's battle-1 package (`hotstart` or not) and E2 (each general's signature unit).

**Ledger.**
- ER-3b moved Mold out of battle 1 (built and off; with `hotstart`: battle 1 lost 6%, battle 2 37%; the user's call). This doesn't remove her. It turns the draw into an informed choice and keeps her available.
- F10 (the route doesn't branch): a small first branch.
- [Research](../research-autobattler-roguelites.md) #8, "know and choose your opponent" (never addressed).

**Sources.**
- 9 Kings: see and reroll the next attacker.
- StS: the act boss is shown on the map.
- The Bazaar: choose the encounter.
- All from [`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) #8. Also Kingdom Rush's gentle first level ([one-more-run research](../research-one-more-run-and-feel.md) #3).

**Risks.**
- Most players may always pick the Baron, so Mold lands in battle 2. Step B saw battle-2 losses rise to 37% when Mold moved, so measure the whole curve.
- One more screen decision.
- Learning load is low: it removes three unknown unit types from battle 1 and adds one choice.

---

### E5. The counter wave: the general holds, then sends its counter as one telegraphed double wave

**Problem.**
- A counter is a 55–65% spending lean (SPEC §7.4) that shows only as new buildings. Nothing on the field marks it (pillar 3 "Weak", ER-6a never addressed).
- Under waves the AI never holds (`controller.ts`: "the AI never holds"). The general can't use the verb the player has.
- So the measured difficulty ignores Hold, which holding every other beat showed is worth up to +8 of 30 ([`rework-state.md`](../rework-state.md)).

**Change.** A default-off AI stance policy under waves.
- One beat after each counter activates (4:00 → 4:20; 7:00 → 7:20; the boss also at 3:00), the general holds every lane for one beat, using the same Hold rules the player has.
- On the next beat both waves leave together: a visible double wave led by its new counter units.
- It's telegraphed:
  - a callout "Old Mother Mold holds her wave: her counter-wave leaves in 20 s";
  - E1's enemy chip shows "+N" climbing;
  - the beat chip's bar marks the beat.
- The held lane sends nothing for 20 s, which opens a window to push.

**How it would feel.**
- The counter becomes a moment you can prepare for:
  - save Spore Burst for the double wave;
  - hold your own wave to meet it under your turrets;
  - or push into the empty beat while it holds.
- You also learn what Hold does by seeing it used against you.

**Implementation.**
- **Files:** `src/sim/ai/controller.ts` `applyStancePolicy` (under waves, a `counterHold` branch keyed to `activeCounter(ai)` and its `activeAt`), `src/ui/doctrine.ts` and `src/app/battleView.ts` (the callout).
- **Proto knob:** `laneStance.ai.counterHold:{beats:1}`.
- **Honesty:** it's an AI policy only, issuing the same `stance` commands a player issues, so no new rule.
- **Goldens:** none while off.

**Test.**
- `--checks engagement,g8,g4 --commander all --power-policy auto`.
- Expect player wins against each general to fall 3–8 points. G8 should improve, especially combined with E3. G4 Decisions must stay ≤ 15%.
- Playtest questions:
  - "Did you see the counter coming, and did you do anything about it?"
  - "When the general held its wave, what did you do?"

**Effort:** M. **Timing:** only if P3 shows a specific outcome: waves are adopted (P3 Q3 is neutral or positive). **Depends on:** waves surviving P4. Strongly helped by E1 (see the stored wave) and E3 (the wave carries real counters).

**Ledger.**
- ER-6a ("counters arrive as a visible doctrine wave: burst of units, banner, doctrine-specific buff") is never addressed.
- This differs: no free units and no buff. The general uses the shipped Hold verb under the honest-AI rule (SPEC §7.1).
- DR-18 (a banner naming the counter's units) stays out, since the warning stays vague.

**Sources.**
- PvZ's flagged huge waves, Legion TD 2's known boss wave and Rush Royale's scheduled bosses ([`research-lane-battlers.md`](../research-lane-battlers.md) #2).
- Clash Royale's counter-push.

**Risks.**
- It makes generals stronger at exactly 4:00–5:00, which could deepen battle-1 losses. Measure with E2's battle-1 fixes.
- Two holds per battle may be too few to read as personality, or too many with E2's Baron sallies. Pick one policy per general.
- Learning load is low: it reuses Hold and the existing warning.

---

### E6. The Pale Sovereign as a final exam: an Edict from row 1, and re-reads at ⅔ and ⅓

**Problem.**
- The boss is the easiest fight: 88% of boss fights won under `rework`, 95% with `hotstart,bigdrafts` ([`measurements.md`](../measurements.md)).
- It's "a bigger general": 7 buildings, 4 levels, 3600 HP, even weights over 11 buildings, and counters that are the cheapest set members.
- There's no climax and no test of your build (ER-3c, OMR-9, DR-20; [`run-loop.md`](../run-loop.md) §7.4).

**Change.**
1. **One Edict per run**, rolled on the `route` stream and shown on the boss node from row 1.
   - Each Edict is a passive (SPEC §17 #13 bars active powers) with a one-line "Tests:" and "Answered by:". First pass, built from existing stats:
     - *of Many Hands*: `side.knitTicks` ×0.25 and `side.mergeRadius` +0.5. Tests: slayers and bursts.
     - *of the Long Brood*: `side.waveBeat` ×1.5. Tests: area damage and Hold timing.
     - *of Thorns*: `side.turretDamage` ×1.6. Tests: siege and mass.
     - *of the Deep Larder*: `side.stipend` ×1.3. Tests: tempo; end it early.
     - *of Mirrors* (code): its first two kit slots are your run's two most-built spawners. Tests: does your engine beat itself plus its counters?
2. **Phases.** The boss passive gains `heartcapBreach` triggers at 0.67 and 0.33 that do `gainGold: 200` (data, works today) and a new action, `counterRead`. It runs an immediate analysis and activates the counter after one beat, with a callout: "The Pale Sovereign re-reads your army: now countering your LINE".
3. **Floor.** Once a battle-1 package is adopted, the user sets a band for boss fights won, suggested 55–70% for runs that reach it. Tune Edict strength before raw HP.

**How it would feel.**
- From the route's first row you know the final question ("the Sovereign of Many Hands: bring slayers"), so drafts and route picks gain a long-term aim.
- The boss fight has acts. Taking it to ⅔ makes it re-read you, so a one-trick build gets punished mid-fight.

**Implementation.**
- **Files:**
  - `data/edicts.json` (new, schema like `EliteSchema` plus `tests` and `answer`).
  - `src/run/route.ts` (the boss node's `edict`).
  - `src/run/flow.ts` (merge the Edict effects into the boss's side modifiers; Mirrors' kit).
  - `src/data/schema.ts` (`EffectActionSchema` gains `counterRead`).
  - `src/sim/ai/counter.ts` (export an analyze-now path).
  - `src/ui/screens/run.ts` (the boss node and summary).
- **Proto knobs:**
  - phases as data now: `general.pale-sovereign.passive.triggers:[…]`;
  - an Edict forced with `route.edict:"manyHands"`.
- **Goldens:** none while off. On adoption, the run golden (if any) changes.

**Test.**
- **A tool gap:** only 20–43% of runs reach the boss, so `runs` gives 60–130 boss fights per 300.
- Add a boss-only harness: a ~100-line `--checks bossfight` that replays the final battle of runs that reached it, with their kits and relics, per Edict.
- Targets: boss fights won 55–70%, each Edict within ±10 points of the others, and win rate correlated with "kit contains an answer building" (the exam works).
- Playtest questions:
  - "Did you plan your run around the boss?"
  - "Did the boss feel like the hardest and most interesting fight?"

**Effort:** L. **Timing:** after P4, whatever it decides. **Depends on:** P4's battle-1 and run-arc package (`hotstart`, lives). E3 makes its counters real.

**Ledger.**
- **Never addressed:** ER-3c, OMR-9 (harder boss), DR-20 (bosses as build exams).
- **Research:** [autobattler](../research-autobattler-roguelites.md) #10 (Edicts).
- **What's new:** the mid-fight re-read and Edicts built from stats the sim already has.

**Sources.**
- Balatro's boss blinds (a named rule, visible at the ante's start).
- StS's act boss shown on the map.
- Monster Train's boss abilities.
- Legion TD's known boss wave.
- All in [`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) §2 and #10.

**Risks.**
- Balance per Edict.
- Mirrors interacts with mono builds: they'd fight themselves, which is intended but may feel unfair. Keep a "Tests: mono builds" line.
- More reading on the route.
- Learning load is low to medium: one line, shown early, about one fight.

---

### E7. Elites as trials: a named build question on the node, and loot that answers it

**Problem.**
- Elites are stat bumps that cost about 10 points of run-ending risk (44% against 34% lost; Veteran 42–49%) for one relic pick and currencies that buy nothing (F11; [`run-loop.md`](../run-loop.md) §3.7).
- Nothing about an elite asks what your build can do.
- The general's own scaling is "+1 random level".

**Change.** Replace two of the three stat modifiers with trials. Each prints "Trial: … — can you …?" on the node and pays themed loot (one of that general's buildings or a relic that answers the theme, as in 9 Kings).
- **Airborne Host:** 2 Drift Stalks join its opener (new `openerAdd` field). Tests: anti-air. Loot: a Drift Stalk blueprint or the AIR answer relic.
- **Shield Wall:** its waves set out shielded at one unit type (new side stat `side.mixedMinTypes`). Tests: armor-ignoring area damage. Loot: Burster Pod.
- **Brood:** `side.waveBeat` ×1.5 and `side.waveSize` ×1.2. Tests: weathering a big wave with Hold and the power. Loot: a wave relic using the unused `side.waveBeat` and `side.waveSize` hooks (CR-4).
- **Veteran** stays as the "numbers" elite.

**How it would feel.**
- The elite choice becomes "which test does my build pass?" rather than "do I gamble 10% of my run".
- Winning hands you a piece of the enemy's toolkit, so the route shapes your build.

**Implementation.**
- **Files:** `data/elites.json`; `src/data/schema.ts` (`EliteSchema.openerAdd`, `tests`, `loot`, a side stat); `src/run/flow.ts` (`generalKit`, loot into the spoils); `src/sim/systems/spawning.ts` (`shieldMixedWaves` reads the per-side minimum); `src/ui/screens/run.ts` (the node).
- **Proto knobs:** new elites through `elites.json` entries and `eliteOrder` (a proto override can force one).
- **Goldens:** none while off.

**Test.**
- `--checks runs --commander all --runs 200` with each trial forced.
- Targets:
  - an elite loss rate per trial within 5–10 points of a plain battle;
  - a split by "kit holds an answer" of at least 15 points (the trial tests the build);
  - runs won per commander inside the 15-point spread.
- Playtest question: "Why did you take or skip the elite?"

**Effort:** M. **Timing:** after P4, whatever it decides. **Depends on:** P4 (Shield Wall and Brood need waves). E3's AIR kind for the Airborne loot. Shares its machinery with E6's Edicts, so build them together.

**Ledger.**
- **Never addressed:** F11 (elite reward size), CR-8 (loot from generals).
- **Research:** [autobattler](../research-autobattler-roguelites.md) #11 (prizes up front) and #12 (Omens).
- **What differs:** the modifier itself becomes the question, rather than only a bigger prize.

**Sources.**
- 9 Kings' loot from the defeated king.
- StS elites as the main relic source, and its burning elite.
- The Bazaar's known monster drops.
- Thronefall's mutators.
- All from [`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) #7, #11 and #12.

**Risks.**
- Elite inflation raises run wins.
- Shield Wall's new stat touches the rework's strongest rule (shields), so re-run the counter matrix if it's ever on for a non-elite.
- Learning load is low to medium: one trial line per elite node.

---

### E8. The general as a nemesis: a voice, a dossier, a grudge

**Problem.**
- Memory shows only as intel bars and one "remembers" callout.
- Personality lines exist in the data (`title`) but aren't shown.
- A battle-1 loss ends the run with nothing and no record of who beat you ([first run](../playthrough-newcomer.md) `SS/69`).
- "The general's 'adaptation' felt the same every battle" ([first run](../playthrough-newcomer.md) §5).

**Change.**
1. **A voice.**
   - A `lines` field per general in `data/generals.json` (about 8 lines each): greeting, remembers-your-KIND, counter warned, counter active, wins, loses.
   - Shown as one line under the general's name in the intent panel. It isn't a callout, except at Begin.
   - The boss's greeting names who you beat ("Mold and the Baron told me of your SWARM").
2. **A dossier** on the route: the intel bars plus what each next general will open against ("The Baron will open against your SWARM").
3. **A grudge** on the summary: "Defeated by Old Mother Mold: her 38 Elders against your 0; she learned SWARM ●●●○."
4. **Across runs** (once the thin profile from [`run-loop.md`](../run-loop.md) §7.3 exists): "Old Mother Mold has beaten you 3 times."

**How it would feel.**
- Losing sets up a rematch with a character ("I'm coming back for you, Mold").
- Adaptation reads as an opponent learning you, not a hidden nerf.
- A run has a cast.

**Implementation.**
- **Files:** content in `data/generals.json` (an optional `lines` field in `GeneralSchema`); render in `src/ui/doctrine.ts`, `src/ui/hud/top.ts` and `src/ui/screens/run.ts` (`summaryScreen`, `intelBars`).
- **Sim and goldens:** no sim change, no golden impact, not a proto knob.
- **Later:** the cross-run part needs the profile save (a new `storageKey()` per `.claude/rules/storage.md`).

**Test.**
- Screenshots of each line's slot.
- Playtest questions:
  - "Which general do you most want to beat, and why?"
  - "After a loss, did you know who beat you and how?"

**Effort:** S. **Timing:** now, independent of P4. **Depends on:** none. The cross-run grudge depends on a profile (M6 or [run-loop](../run-loop.md)'s thin meta).

**Ledger.** DR-19 (nemesis log), DR-38 (voice), CX-7 (colony stories), DR-32 (summary): all never addressed. [One-more-run research](../research-one-more-run-and-feel.md) #5.

**Sources.**
- Hades: bosses remember you, and death advances the story (Kasavin, [`research-one-more-run-and-feel.md`](../research-one-more-run-and-feel.md) §2.3 and #5).
- Shadow of Mordor-style nemesis framing in the [design review](../../one-more-run-design-review.md) §5.5 and §7.

**Risks.**
- Text noise in an already busy callout lane ([first run](../playthrough-newcomer.md) F-8), so keep the lines in the panel.
- Tone has to fit.
- Learning load: none (flavour).

---

### E9. The Gray Rot as a mirror with three teeth (the M7 roster, asymmetric)

**Problem.**
- The enemy is your own roster in gray, and M7 specs it as a role mirror with +10% HP and −10% speed (SPEC §11.12).
- So a counter looks like your army, swarm-against-swarm is a pure body count ([strategist](../playthrough-strategist.md): "the only answer to a Sporeling mass that worked was a bigger Sporeling mass"), and the rework's tools have no Gray Rot versions (CR-13).

**Change.** Keep the role mirror for 7 of 10 buildings (low learning load, reused balance), and give the Gray Rot three teeth, each a question the Velvet Bloom answers differently:
1. **A faction tempo.**
   - The Rot marches on its own beat. First pass 15 s, which **[new]** turned Mold from a wall into a stream; tune it with the roster.
   - The player reads the enemy's rhythm against their own.
2. **It doesn't merge; it feeds.**
   - A Gray Rot unit that lands a killing blow gains +15% max HP and damage, stacking to ×1.6. It's shown as a darker, larger sprite.
   - Answer: fast kills and area damage (Bursters, Spore Burst) rather than slayers.
   - Your swarm against its swarm stops being a mirror.
3. **Its own versions of the rework's tools, with different jobs:**
   - a burrower that surfaces in packs of 3 (CR-6);
   - a flyer that only strikes buildings, a back-line siege that anti-air answers;
   - no Burster equivalent, which leaves area damage as your edge.

**How it would feel.**
- The enemy looks and behaves like an enemy.
- A counter brings units you've never fielded, so reading it is a skill.
- Fights against it ask different questions from mirror fights.

**Implementation.**
- **Files:** `data/factions/gray-rot/{buildings,units}.json`; the `feeds` rule (`src/sim/systems/combat.ts` on a kill; a new unit tag); the faction tempo as a faction passive with `side.waveBeat`; generals switch rosters (generals.json weights and recipes, E3); new sprites; SPEC §11.12 rewritten.
- **Proto knobs:** the faction tempo and the `feeds` tag can both be default-off knobs, with the roster as content added through `faction.gray-rot.buildings`.
- **Checks:** a two-faction counter matrix (Velvet answers against Gray Rot mono builds), G3-style checks for the general's side, and engagement and runs.

**Test.**
- Each tooth alone, then together, with `--checks engagement,runs,g8` and a Gray Rot counter matrix.
- Playtest questions:
  - "Did the Rot feel like a different enemy from you?"
  - "Which of its units did you learn to answer?"

**Effort:** XL. **Timing:** later bet. **Depends on:** P4 (the adopted combat model), E3 (recipes) and E2 (voices). It's M7 content, which [status.md](../../../status.md) says waits on P4.

**Ledger.** ER-6c (an asymmetric Gray Rot) never addressed. CR-13 planned for M7 but unspecified. ER-10 (Gray Rot before meta) never decided. It stays inside SPEC §17 #5 because the Rot isn't playable.

**Sources.**
- There Are No Orcs (the [design review](../../one-more-run-design-review.md)'s named inspiration) and 9 Kings' distinct kings.
- Mechabellum's unit-size axis.
- StarCraft-style asymmetric races, by analogy.
- [`research-autobattler-roguelites.md`](../research-autobattler-roguelites.md) §3 "maps, seasons and bosses need to vary, not only cards".

**Risks.**
- Content and balance cost: two rosters to keep balanced.
- "Feeds" snowballs if unchecked, so cap it and reset it on merges.
- Learning load is high. Stage it: tempo in battle 1, feeding from battle 2, signature units from battle 3, each with a first-sight tip (E4) and a "Know your enemy" Help tab.

---

## Cross-cutting notes

**Order of work.**
- **Now, with no rule change:** E1 and E8.
- **As URL knobs for P3's optional second pass:** E2's tempo and weights, with no code (`?proto=rework,general.mother-mold.passive.modifiers+:[…],general.lichen-baron.weights.puffballMortar:1`).
- **After P4:** E3 (with the user's go-ahead), E4, E5 (if waves stay), then E6 and E7 together (shared trial machinery).
- **M7:** E9.

**Learning load (F8).**
- E1, E4 and E8 lower it: they show what's already there and remove battle-1 surprises.
- E2, E5 and E3 add a little each, and they work through verbs the player already has (Hold, the warning).
- E6, E7 and E9 add content to read, so put each on one line, shown before it matters.

**Measurement gaps this lens needs.**
- A boss-only harness (E6).
- An AI that holds under waves (E2 and E5). Until then, every measured difficulty number ignores the Hold verb.
- A 60-seed rerun of E2's Cordis cell before trusting it.
