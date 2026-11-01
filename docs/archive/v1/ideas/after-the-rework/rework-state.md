# The combat rework on `develop`, and what its playtest is likely to show

> **Archived: v1 era.** Written before [SPEC v2](../../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../../README.md)).

Evidence for [After the combat rework](../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): the state of the combat rework going into its playtest. Written by an agent during that review; nothing here is adopted. Recovered from the session transcript: the trace scripts are in [scripts/trace/](scripts/trace/), the tool reports weren't kept, and three of the four screenshots it used are kept and linked.

Written 2026-10-31 against `develop` at `ef2e133`, from a separate checkout (paths below are relative to the repo root). Scope: the `rework` prototype preset (`?proto=rework`) as it stands for the P3 playtest, what the playtest is likely to show, and what P4 would do with each answer. Nothing here changes a rule; it's input for the reconciling stage.

**Sources read:** `docs/status.md`, `CLAUDE.md`, `docs/archive/v1/ideas/combat-rework.md` (all), `docs/archive/v1/ideas/flyers.md` (all), `docs/archive/v1/ideas/rounds.md` (all), `src/data/proto.ts`, `docs/archive/v1/balance-backlog.md` §§ "Combat rework P1" to "After P2", `docs/archive/v1/engagement-review.md`, `docs/archive/v1/ideas/one-more-run-review.md` (step B), `docs/playtest-feedback.md`, SPEC §1, §17, and the code in `src/sim/systems/{spawning,stance,targeting,combat,clouds,movement,territory}.ts`, `src/sim/world.ts`, `src/sim/ai/{controller,counter}.ts`, `src/run/flow.ts`, `src/render/renderer.ts`, `src/ui/{buildingInfo,inspect,matrixHints,callouts}.ts`, `src/ui/hud/{top,explain}.ts`, `src/app/{battleView,battleSound,tips}.ts`, and the sprite data. Four screenshots from the parallel play session ([playthrough-newcomer.md](playthrough-newcomer.md): [`07-beat-tooltip.png`](screenshots/newcomer/07-beat-tooltip.png), [`33-b1-burst.png`](screenshots/newcomer/33-b1-burst.png), `31b-shields-zoom.png` (not kept), [`38b-cloud-zoom.png`](screenshots/newcomer/38b-cloud-zoom.png)) were used to confirm what the HUD shows.

**New measurements made for this review** (read-only; scripts in [scripts/trace/](scripts/trace/), tool reports under the gitignored `reports/experiments/fun-*.json` (raw output not kept)). Each is labelled **[new]** where it's used:
1. **Battle-flow trace** ([`trace.ts`](scripts/trace/trace.ts)): `bot:balanced` (no commander) against each battle-1 general on Bogwater, 20 seeds each, M5 rules against `rework`: first contact, supply on the field, how unit damage is spread over the 20 s beat, bursts, shields, flyers, Rhizomorphs, merges, what each side builds.
2. **Hold under waves** ([`hold.ts`](scripts/trace/hold.ts)): the same matchups at 30 seeds, with scripted player holds layered on `bot:balanced` (the AI never holds under waves): none, every other beat, and the opening beat only.
3. **Runs with commanders on the playtest preset** (`npm run experiment -- --proto <spec> --checks runs[,engagement] --commander <c> --power-policy auto`, 80 runs each): `rework` as playtested (P2 only measured the package *without* flyers and the swarm read), `rework,hotstart`, `rework,breach`, and M5.
4. **The general against a swarm** ([`g8swarm.ts`](scripts/trace/g8swarm.ts)): mono Sporeling and mono Veilstalker against the adaptive Lichen Baron and Old Mother Mold, 50 seeds, with the swarm read on or off and step-A's `a2` counter floor.

Bots aren't people; every **[new]** number is a pacing or difficulty indicator with roughly ±8–10 points of noise per 30–80-game cell.

---

## Summary

- **What the playtest gets:** ten new player-facing rules and three new units at once (waves on a 20 s beat, Hold redefined, mixed-wave shields, pinning, call for help, Rhizomorph, Burster and its clouds, Elder Sporeling without splash, a storm that grows waves, flyers under rule C), plus an invisible AI fix (the swarm read). Most are explained only in tooltips; two (call for help, pinning) have no on-field cue at all.
- **The bars:** the strict counter bar passes and G4 passes (8:04, 11% Decisions), G3 fails on mono Sporeling 83/86, mono Drift Stalk 72/90 and mono Veilstalker 69/80. G5 and G7's mirror are over, G6 (being 6 columns behind) jumps to 88%, G8 fails, comebacks are 0 of 360.
- **[new] The playtest preset is harder on runs than anything P2 measured.** With flyers and the swarm read in, 114 of 240 bot runs end in battle 1 (48%; P2's package 108, M5 79) and only 44 of 240 win (P2 60, M5 54). Armilla (54% battle-1 deaths, 10% wins) and Cordis (56%, 13%) are hit hardest; Vesper is near M5 (33%, 33%). **Expect the playtest's first battle to be the headline.**
- **[new] `hotstart` composes with `rework` and halves that:** 55 of 240 end in battle 1 and 70 of 240 win. But the wall moves to battle 2 (Armilla loses 28 of 56 there).
- **[new] `breach` composes with `rework`:** the loser's Heartcap takes 22–41 s from first hit to dead instead of 8–19 s, with identical win rates, identical run results (112 battle-1 deaths, 44 wins) and still 0 comebacks in 360 battles. It lengthens the ending; it doesn't create a way back.
- **[new] Waves give only a mild combat pulse.** The busiest 6 s of each 20 s beat carry 33–37% of unit damage (30% would be flat; M5 is 31–32%). Survivors carry over, so fighting is near-continuous; the beat mostly shows as units popping out of buildings every 20 s. There's no sound on the beat.
- **[new] Armies meet sooner but the front moves later.** First unit contact at 28–30 s (M5 39–42 s), supply on the field at 5:00 of 40–45 (M5 24–30), but first column flip 1:04–3:42 (P2 and **[new]**; under Hold on M5 it was 0:34–1:40). Symmetric waves clash in the middle and the tug-of-war, the game's main readout, sits still.
- **[new] Hold is a real lever under waves, and a schedule finds it.** Holding every other beat (doubling waves to a 40 s rhythm) lifts `bot:balanced` from 16 to 24 of 30 against the Lichen Baron and from 9 to 15 of 30 against the Blightwright, does nothing against the scripted general, and nothing against Old Mother Mold (2 of 30 every way). The AI never holds under waves, so the measured difficulty ignores this verb.
- **[new] Old Mother Mold is the wall:** her waves leave 12 units at a time against `bot:balanced`'s 5.4, 37% of hers are shielded, and the bot wins 2 of 20 (M5 4 of 20).
- **[new] No existing AI knob makes the Lichen Baron answer mono Sporeling** (12–15 of 50 with the swarm read on or off, with or without `a2`'s counter floor), even when it builds 30 Veilstalker Hollows. `a2` does double its wins against mono Veilstalker (7 → 14 of 50). Old Mother Mold needs no help: her swarm beats mono Sporeling 70% and mono Veilstalker 100%. Teaching the answer means changing the counter sets themselves.
- **What the rework doesn't touch:** the Heartcap cliff and comebacks, run HP being binary, the upside-down difficulty curve (boss fights won 44 of 48 **[new]**), territory having no payoff (and now being behind is an edge), merging as a decision (merges ×2.5–5), the general's counters as moments, and the quiet early tug.
- **Risks it adds:** complexity against F8; a "wave" word that now means two clocks (the 60 s economy wave and the 20 s beat, side by side in the HUD, with the general's warning in 60 s waves); callout and effect noise (12–59 bursts a battle, a "shields up" callout every beat, ~100 merges); generals that field Bursters, Rhizomorphs and Driftlings from battle 1 while the player's tray is three starter cards; Armilla's starter having one unit type (no shields) and Cordis's power being redundant when waves merge everything.
- **Most likely P4 path:** adopt the core (waves, two-type shields, pinning, call for help, the Burster, the Elder change, the storm, the swarm read) only together with `hotstart` or an equivalent battle-1 fix; hold flyers until the Driftling retune or the Anti-Air counter lands; drop the Rhizomorph unless the playtest loves it; and start presentation work on the beat and the vocabulary. Level 3 is the call only if the playtest says waves feel worse than M5 *and* one unit type still decides battles; rounds.md's one-session clash prototype is cheap enough to run first either way.

---

## 1. What `?proto=rework` changes, in player terms

`rework` (`src/data/proto.ts` lines 216–223) spreads ten setting groups into the raw content: `PINNED`, `CALL_FOR_HELP`, `RHIZOMORPH`, `WAVES`, `MIXED_WAVE`, `BURSTER`, `NO_ELDER_SPLASH`, `STORM_WAVES`, `SWARM_READ`, `FLYERS`, and appends the three new spawners to both rosters. Hold / Advance (`laneStance`, shipped since 2026-10-28) stays on but changes meaning under waves. Not in `rework`: the Mortar's spore clouds (`sporecloud`), cleave, the Bloatcap and the general's Anti-Air counter.

### 1.1 A battle, minute by minute

Bot numbers on Bogwater Hollow; M5 is the dev site without `?proto=`.

| Time | M5 (today) | `rework` |
|---|---|---|
| Deploy (clock stopped) | 300 gold, place the opener | Same. The beat chip reads 20 s; its tooltip explains waves, shields and the storm's growth (screenshot [`07-beat-tooltip.png`](screenshots/newcomer/07-beat-tooltip.png)) |
| 0:00–0:20 | First spawns at half their interval (Sporelings at 8 s); units trickle out and walk | Spawners fill **inside**: a "+N" badge on each building, supply counts already. The field stays empty except for units from deeper spawners, which leave a few seconds early so the wave passes the front door together (`releaseLead`, `spawning.ts`) |
| 0:20 | — | **First beat.** Both sides release on the same tick. Each lane's wave of 2+ unit types gets shields worth 20% of each unit's HP and the callout "Mixed wave: shields up". Waves march at their slowest unit's pace, ranged units a tile behind their melee front, flyers hovering over that front |
| First contact | 39–42 s **[new]** | 28–30 s **[new]** |
| Supply on the field, both sides, at 1:00 / 2:00 | 10–14 / 10–15 **[new]** | 12–18 / 16–22 **[new]** |
| 0:40, 1:00, … | Continuous trickle | A wave every 20 s. Survivors keep fighting between beats, so combat is near-continuous with a mild pulse: the busiest 6 s of each beat carry 33–37% of unit damage (M5: 31–32%; flat would be 30%) **[new]** |
| First column flip (median) | 0:34–1:40 with commanders (P2 engagement table) | 1:04–3:22 (P2), 1:04–3:42 **[new]**; no flip by 3:00 in 3–70% of battles depending on general **[new]** |
| 2:00 | The general reads your mix and warns "Preparing to counter your X · 2 waves" (60 s waves, so it lands at 4:00). First draft | Same. The swarm read now reads a merging Sporeling or Veilstalker army as **Swarm** (199/199 reads) instead of Elite |
| Merging | 14–41 merges a battle **[new]** | 72–110 a battle **[new]** (P2: "waves nearly quadruple merges"); Elder births are routine |
| 4:00–8:00 | Sporestorm: +10% unit damage, −10% turret damage, +20% Heartcap damage taken per stack | Same, **and** each stack makes both sides' releases 20% bigger (×2 at 8:00). Extra units need free supply; 3–12 a battle are held back by the cap **[new]** |
| 5:00 | 24–30 supply on the field **[new]** | 40–45 **[new]** |
| The end | G4 median 6:58, 7.5% Decisions (P2) | G4 median 8:04, 11% Decisions (status). The loser's Heartcap still goes from ⅔ to dead in 4–9 s **[new]**, 5–10 s (P2) |

Per battle under `rework` **[new]**: 12 (vs Mold) to 59 (vs the Baron) Burster bursts, each leaving a 4 s cloud; 0–8 Rhizomorphs surfacing per side; 0–16 Driftlings per side (the Baron fields the most).

### 1.2 Each piece: the rule, its numbers, and what's on screen

| Piece | Rule and numbers (code) | On screen | What it carries (P2) |
|---|---|---|---|
| **Waves** | Spawns are stored in the building (`b.stored`) and count toward supply. Both sides release on a shared 20 s beat (`waves.beatSeconds`). A lane's frontmost spawner releases on the beat; each spawner behind it releases early by its walk to that door (capped at a beat less one tick), so the wave passes together. One release per spawner per beat. Idle wave units march at the slowest unit's pace (`matchPace`), idle ranged units stay 1 tile behind the frontmost friendly melee (`rangedGap`), idle flyers hover over it. A sold or destroyed spawner lets its units out at once, unshielded. Relic hooks exist: `side.waveBeat`, `side.waveSize` | Beat chip in the top band: seconds to the next wave, "+N" waiting, a bar that fills, lilac in the last 3 s. "+N" badge on every spawner, **both sides**. A spawn puff per unit. Card row "Waves", inspect row "Waiting inside". **No sound** on the beat (`battleSound.ts` has no `release` case) | Almost everything: without waves the strict bar fails (mono Sporeling's best answer 47% on Twin Roots), archers return (Gill Nest 79/94), G4 Decisions 22.5% |
| **Hold under waves** | Holding a lane keeps home whatever hasn't left yet; the beat spends the hold; the lane can't hold again until one tick after the next beat (`readyAt`), so at most every other wave is kept home, and the next wave leaves doubled. Advancing before the beat cancels the hold (and starts the 10 s cooldown): held units leave at their usual release moment, or at once if it has passed (`waveSystem` only releases a spawner once `due ≤ releaseLead`). No 30 s timeout, no rally line. **The AI never holds under waves** (`controller.ts` line 108) | Pennant only, no rally line. Status text "Keeping the wave home · N s" / "Wave leaves in N s"; callout "Wave kept home: the next beat sends both waves". The first-time Hold tip still says "hold your units back for a bigger push" | Not measured by P2 (bots don't hold). **[new]** holding every other beat: +8/30 vs the Baron, +6/30 vs the Blightwright, 0 vs scripted, 0 vs Mold |
| **Mixed-wave shields** | At the beat, every living unit of a lane's wave (early leavers, Rhizomorphs, flyers included) gets a shield of 20% of its max HP if that lane's wave holds ≥ 2 unit types (a merged form counts as its base type). The shield soaks every damage source first, never regrows, isn't healed; a merge keeps the trio's shield in proportion | Pale blue bubble that fades as it wears (`shieldRing`); inspect "HP x/y + N shield"; callout "Mixed wave · shields up" **every shielded beat**; beat tooltip "Next wave: N unit types · mixed: it sets out shielded"; card row "Mixed wave" | The strict bar: off, or at three types, mono Sporeling's best answer is mono Capguard at 44% on Twin Roots. **[new]** 61–81% of `bot:balanced`'s releases are shielded; Mold's 37% |
| **Pinning** | A unit with the `ranged` tag (only the Gill Archer) with an enemy unit within 1 tile (edge distance, flyers count, burrowers don't) runs its attack cooldown on 350 ticks in 1,000: ×0.35 rate, tick by tick | Gill Nest card row "Pinned: attacks at ×0.35 its rate with an enemy within 1 tile". **Nothing on the field** | Keeps the archers down: without it mono Gill Nest fails G3 again (73/80) |
| **Call for help** | When an enemy unit or tower damages a unit or building, every friendly unit in that lane within 5 tiles of the victim that has no target (and isn't knitting, burrowed or a healer) takes the attacker; it stays sticky past the usual leash while the attacker keeps hitting it or a friend near it. Only units that can hit a flyer answer a flyer (under rule C, all of them) | **Nothing**: no text in any tooltip, help tab or tip (grep of `src/ui`, `src/app`) | G2: without it, under pinning, the Gill Archer wins no supply duel |
| **Rhizomorph** (Tunnel 160 gold, 1 per 18 s, 450 HP, uncommon) | 140 HP, medium, 16 slash / 1.0 s, range 0.5, speed 1.2, 2 supply. Leaves on the beat and tunnels (untargetable, no collision, no presence, can't be pinned or merged) toward the nearest enemy archer that no tower band or Heartcap turret (9 tiles) covers; else an uncovered spawner at or behind the enemy front; else the front unit; else the border. Surfaces in range, then prefers ranged targets | A moving earth mound with a glowing seam and crumbs; inspect "Status: tunnelling…"; card row "Burrows" | Nothing measured. Without it every bar holds, G4 Decisions fall to 8.5%, G5 passes. Rhizomorphs deal 1–4% of their side's damage |
| **Burster** (Pod 130 gold, 1 per 10 s, 450 HP, uncommon) | 50 HP, light, speed 1.6, 1 supply, aggro 5, no attack, never merges. Rolls at the enemy ground unit with the most enemy ground units within 1.5 tiles; bursts on reaching it or on dying: 40 damage ignoring armor (shields soak) to every enemy ground unit within 1.5 tiles, then a cloud (1.5 tiles, 4 s, 10/s). A burst can set off other Bursters. Never buildings, Heartcaps or flyers (the cloud does reach flyers) | Rolling puffball sprite; a ring the size of the burst; a haze in the owner's glow with white specks, fading over its last quarter (`drawClouds`); card rows "Bursts" and "Spore cloud". No sound | G3 against the runners (mono Veilstalker 72/87 with it, 76/93 without); costs G4 4 points. Bursts deal 12–19% of a user's damage |
| **Elder Sporeling change** | The Elder's 0.6-tile splash perk is removed; its perk is now the same as the Bloomed one (speed ×1.15, `perkAt` merges tiers 2 and 3) | Perk text reads the same for both tiers | Holds mono Sporeling at 85/86 (94/95 with the splash) |
| **Storm grows waves** | From 4:00, each Sporestorm stack makes every release 20% bigger, carrying fractions per spawner; extras need free supply (`waveCapped` event) | Beat tooltip row "Sporestorm · waves ×1.4". The storm's own tooltip and its "The Sporestorm thickens" callout **don't mention it**; the "+N" badge shows what was made, not the storm's extra | G4: without it 27% Decisions. It feeds the runners (mono Veilstalker 45/61 → 72/87) |
| **The general's swarm read** | `ai.counter.swarmMaxSupply: 1`: a 1-supply unit's spawner is read by armor whether or not it merges, so a merging swarm reads Swarm, not Elite | The usual intent panel: "Preparing to counter your SWARM · 2 waves" | The read is now right (199/199), but the Swarm counters (Capguards, Burster Pods, Tunnels) aren't the swarm's answer: the Baron wins 24% vs mono Sporeling (today 29%) |
| **Flyers, rule C** (Drift Stalk 160 gold, 2 per 18 s, 450 HP, uncommon) | Driftling: 70 HP, light, 8 slash / 1.0 s, range 1.0 (instant), speed 1.4, 1 supply, aggro 5. Passes over ground units (no collision with them), keeps to its lane, holds no ground, hits ground units, buildings and Heartcaps. Everyone can hit it (`reachSupply: 1`), but a ground unit's melee hit (projectile speed 0) deals ×0.5; the Mortar's lobbed shell and splash and the Burster's burst can't; clouds can (10/s); turrets can. A flyer in contact pins an archer; flyers are never pinned | Sprite raised half a tile over a dark shadow, 2-frame bob (still under reduced motion), drawn over every ground unit and building. Tooltips: "Flying: melee hits it for ×0.5, and lobbed shells and bursts can't hit it; holds no ground"; every unit card "Flyers: hits them for ×0.5 / can hit them"; the Mortar "its lobbed shells can't hit them". Clicks account for the lift (`input.ts` line 57) | Flyers answer the swarm under reach (Amanita + Drift Stalk 100/100/94), less so under rule C (a Drift Stalk pair 73% on Twin Roots). Mono Drift Stalk 72/90 under rule C |

### 1.3 What the screen doesn't tell the player

These come from the code and the two screenshots, and each one bears on the playtest's Q4 ("do they read clearly?"):

- **"Wave" now names two clocks.** The top band shows "Wave 3 · 2:13" (the 60 s economy wave: interest, drafts, the counter cycle) beside the beat chip "7 s +5", whose tooltip heads "Next wave" (`top.ts` lines 121–134; screenshot [`33-b1-burst.png`](screenshots/newcomer/33-b1-burst.png)). The general's warning "Preparing to counter your SWARM · 2 waves" means two *60 s* waves, i.e. six beats. A player who learns "wave = beat" will misread the warning by 80 s.
- **Call for help and pinning are invisible on the field.** Units turning on an attacker look like ordinary targeting; an archer firing at a third of its rate has no marker.
- **The beat has no sound and no field cue** beyond per-unit spawn puffs; with 12–18 units on the field at 1:00 the release reads as "units appear at the buildings".
- **The storm's wave growth** is only in the beat chip's tooltip.
- **The enemy's next wave** is visible only as "+N" badges on each enemy building; nothing sums it or says whether it's mixed (shielded).
- **The Elder Sporeling** reads like a bigger Bloomed one: the merge moment for the swarm unit has lost its payoff text.
- **New enemy units arrive without a first-time tip.** `tips.ts` has no rework tips; the run gives every general the Tunnel, Pod and Stalk from battle 1 (`src/run/flow.ts` lines 169–170: "roster buildings with an `aiWeight` join every kit"), while the player's battle-1 tray is the commander's three starter cards. **[new]** In single battles, generals placed 10–28 Burster Pods, 2–13 Tunnels and 2–14 Drift Stalks over 20 battles each.

---

## 2. The roster under `rework`

Matrix (unchanged): slash ×1.5 light / ×1.0 medium / ×0.5 heavy and structure; pierce ×1.0 / ×1.5 / ×0.75 / ×0.5; crush ×0.75 / ×0.75 / ×1.5 / ×1.5. Supply cap 60. "Answers" are the counter-matrix's confirmed answers (P0 today; P2 package and After P2 under the rework), Bogwater / Stumpfield / Twin Roots.

| Building (cost, rarity) | Makes | Unit | Role under `rework` | Beats | Loses to / answered by |
|---|---|---|---|---|---|
| Sporeling Burrow (110; Vesper and Cordis starter) | 2 / 16 s | Sporeling: 72 HP light, 7 slash / 0.8 s, speed 1.5, 1 supply | The swarm. Waves make it arrive and merge in bulk; Elder has no splash under `rework` | Archers (triangle), Morel Runners | Capguards (triangle), Driftlings in duels, Bursters (G2). **Mono Sporeling is G3's worst failure (83/86)**; its answer is Sporeling + Veilstalker (100/100/86, via shields) |
| Capguard Hall (150; Vesper and Armilla starter) | 1 / 15 s | Capguard: 220 HP medium, 14 slash / 1.0 s, speed 0.75, 2 | The line; sets a mixed wave's pace | Sporelings, Driftlings (G2) | Archers (+39 at 60 supply). Mono Capguard beats mono Drift Stalk 100/100/100 (under reach) |
| Gill Archer Nest (150, Cordis's starter) | 1 / 15 s | Gill Archer: 110 HP light, 14 pierce / 1.2 s, range 5, 2, `ranged` | The only ranged unit; **pinned ×0.35** in contact; stays a tile behind its melee | Capguards, Rootbreakers | Sporeling waves; Sporeling + Amanita answers mono archers 100/99/94. Now passes G3 (51/54 with flyers under reach; "other mono bots pass" under rule C) |
| Rootbreaker Den (200) | 1 / 20 s | Rootbreaker: 460 HP medium, 28 crush / 2.0 s, 3, `siege` | Siege; slowest pace setter (0.6) | Buildings, heavy units | Archers (+46) |
| Puffball Mortar (160; Armilla starter) | tower | 24 crush splash 1.0 / 3 s, range 1.5–6 | Area denial. **No clouds under `rework`**; can't hit flyers | Ground clumps in range | Archers (Elder range 6.5), flyers, Rhizomorphs (which avoid its band) |
| Scythecap Grove (170, uncommon) | 1 / 18 s | Scythecap: 200 HP medium, 16 slash / 1.3 s, splash 0.8 at half, 2 | Anti-swarm (no cleave under `rework`) | Sporelings, Driftlings | Archers, Bursters (G2) |
| Veilstalker Hollow (160, uncommon) | 2 / 18 s | Veilstalker: 80 HP light, 12 pierce / 1.1 s, speed 1.4, 1, `slayer` (Elder ×3.4) | Runner and slayer; under waves almost everything merges, so its slayer bonus is live all battle | Merged units, Morel Runners | **Mono Veilstalker fails G3 (69/80)**, fed by the storm; answered by Sporeling + Veilstalker (96/85/95) |
| Tender's Ring (180, uncommon) | 1 / 20 s | Tender: 90 HP, heals | Support | — | Anything |
| Hammercap Forge (170, uncommon) | 1 / 17 s | Hammercap: 240 HP medium, 25 crush / 1.4 s, 2 | Anti-heavy | Amanita Knights (mono Hammercap answers mono Amanita 100/100/80, P0) | Archers |
| Amanita Lodge (260, rare) | 1 / 30 s | Amanita Knight: 500 HP heavy, 28 slash / 1.4 s, 3 | Heavy line | Sporelings, Driftlings (2 hits) | Hammercaps; with a Drift Stalk it answers mono Sporeling (under reach) |
| Morel Warren (130) | 2 / 18 s | Morel Runner: 80 HP medium, 9 pierce / 0.9 s, speed 1.8, 1 | Fast swarm | — | Veilstalkers; Sporeling + Veilstalker 100/100/100. Passes G3 (44/55) |
| **Rhizomorph Tunnel** (160, uncommon, new) | 1 / 18 s | Rhizomorph: see §1.2 | Back-line diver under the front | Sporelings only (G2) | Turrets and towers (it avoids them now); weakest mono build (3–10% in P1b's tables) |
| **Burster Pod** (130, uncommon, new) | 1 / 10 s | Burster: see §1.2 | Area damage that travels with the army | Sporelings, archers, Scythecaps, Veilstalkers, Morel Runners, Rhizomorphs (G2) | Rootbreakers, Amanita Knights (G2); can't touch flyers. Mono Burster Pod stalls (Decisions) |
| **Drift Stalk** (160, uncommon, new) | 2 / 18 s | Driftling: see §1.2 | The air axis: free of collisions, holds no ground | Sporelings, Morel Runners, Veilstalkers, archers (duels) | Capguards, Scythecaps, Rootbreakers, Hammercaps, Amanita Knights, surfaced Rhizomorphs, Bursters' clouds. **Mono Drift Stalk fails G3 (72/90; 90/85/40 per map)** |
| Truffle Cellar (150; every starter) | +4 gold / 5 s | — | Economy | — | — |
| Spore Exchange (160, uncommon) | +1 / 5 s, interest cap +10 | — | Economy | — | — |
| Rhizome Vault (140, uncommon) | +6 supply cap (max 2) | — | Utility | — | — |

**Battle 1 matters most for the playtest**, and the starter trays decide whether the player can make a mixed (shielded) wave before the first draft at 2:00 (`data/commanders.json`):

| Commander | Starter tray | Unit types in the opener | Power, and how waves bear on it |
|---|---|---|---|
| Vesper | Sporeling Burrow, Capguard Hall, Truffle Cellar | 2 (shields from the first beat if both are built: 260 gold of 300) | Spore Burst (90 damage, radius 2): waves pack targets together, so it likely gains |
| Armilla | Capguard Hall, Truffle Cellar, Puffball Mortar | **1**: no shields until a second spawner is drafted; the Mortar has no clouds under `rework` | Rhizome Tithe (30 gold per column held): first flips come 40 s to 3 min later under waves, so it pays less early |
| Cordis | Sporeling Burrow, Gill Nest, Truffle Cellar | 2, but the archers are pinned in contact | Puppet Bloom (merges a crowd mid-fight): under waves nearly everything merges anyway (P2) |

---

## 3. What's measured, and the known issues going in

### 3.1 The three bars (playtest preset: P2's package + swarm read + flyers under rule C)

| Bar | Rule | Result | Source |
|---|---|---|---|
| **Strict counter bar** | Every mono build with G3 mean > 40% has an answer that wins ≥ 60% on **every** map and doesn't fail G3 itself | **Passes.** Carried by the two-type shields | backlog "After P2" |
| **G4** | `bot:balanced` vs the scripted general, Bogwater, 200 games: median 5:30–8:30, Decisions ≤ 15%, bot wins 30–70% | **Passes:** 8:04 / 11% / 50% | backlog "After P2", rule C column |
| **G3** | Each mono bot vs `bot:balanced`, every run map, 50 seeds per seat: mean ≤ 55%, worst map ≤ 60% | **Fails:** mono Sporeling 83/86, mono Drift Stalk 72/90 (90/85/40), mono Veilstalker 69/80. Others pass (Morel 44/55; Gill Nest 51/54 under reach) | status, backlog |

### 3.2 Everything else that's been measured

Measured on P2's package **without** flyers and the swarm read, unless marked.

| Check | M5 | Package | Note |
|---|---|---|---|
| G1 production duels | fail (Gill Nest 7/8) | fail (9/10) | |
| G2 supply duels | pass | pass; still passes with flyers | |
| G5 (+150 gold wins) | 75% | 78% (3 over) | ±7 |
| **G6** (6 columns behind at 3:00 wins) | 55% | **88%** | "Falling back early is a big edge"; no single piece does it (55–68% each) |
| G7 merging | mirror 60%, Slayers 56% (fail) | **mirror 72% (fail)**, 67 merges a game vs 18 | |
| G8 adaptation | fail | fail; with the swarm read the Baron wins 24% vs mono Sporeling | |
| Engagement comebacks | 0 / 360 | 0 / 360; winner's Heartcap untouched 360 / 360 | |
| Decisions in engagement | 7 / 360 | 29 / 360, mostly vs the Lichen Baron (10–37%) | |
| Runs won / 240 | 54 | 60 (boss fights 60 of 64) | |
| Runs ended in battle 1 / 240 | 79 | 108 (Vesper 23, Armilla 41, Cordis 44); without waves 68 | |

### 3.3 New measurements for this review

**Runs on the preset the playtest actually uses** (80 per commander, `bot:balanced` with greedy drafts, power on auto) **[new]**:

| Rules | Ended in battle 1: Vesper / Armilla / Cordis | In all (/240) | Runs won (/240) | Boss fights won | Battle 2 lost (of those reaching it) |
|---|---|---|---|---|---|
| M5 (P2's "today") | 24 / 29 / 26 | 79 | 54 (22 / 17 / 15) | 54 of 76 | Vesper 18/56, Armilla 15/51, Cordis 27/54 |
| P2's package (no flyers, no swarm read) | 23 / 41 / 44 | 108 | 60 | 60 of 64 | — |
| **`rework` as playtested** | **26 / 43 / 45** | **114 (48%)** | **44** (Vesper 26, Armilla 8, Cordis 10) | 44 of 48 | Vesper 17/54, Armilla 17/37, Cordis 19/35 |
| `rework,hotstart` | 9 / 24 / 22 | **55 (23%)** | **70** (32 / 17 / 21) | 70 of 74 | Vesper 25/71, **Armilla 28/56**, Cordis 22/58 |
| `rework,breach` | 26 / 42 / 44 | 112 | 44 (26 / 8 / 10) | 44 of 48 | Vesper 18/54, Armilla 19/38, Cordis 20/36 |

The M5 row reproduces P2's "today" exactly when re-run here (24 / 29 / 26 ending in battle 1, 22 / 17 / 15 won), so the tool and seeds match P2's.

- Flyers and the swarm read cost runs: 60 → 44 won, mostly Armilla and Cordis. Vesper is near M5 (33% battle-1 deaths, 33% wins against 30% and 28%).
- `hotstart` (a free deploy draft and a battle-1 general on ¾ income) composes cleanly with `rework`: battle-1 deaths halve and run wins rise 44 → 70. But battle 2 becomes the wall for Armilla (50% lost there).
- `breach` composes too but changes nothing at the run level (112 battle-1 deaths, 44 wins): it lengthens the loser's last half-minute without changing who loses.
- The boss is nearly always won once reached (44 of 48; 70 of 74 with `hotstart`): the difficulty curve stays upside down.

**Engagement with commanders on the playtest preset** (30 battles per general, Bogwater; scripted / Old Mother Mold / Lichen Baron / Blightwright) **[new]**:

| Commander | Player wins | First flip | Loser's Heartcap ⅔ → dead | Merges | Commands / min (stance) |
|---|---|---|---|---|---|
| Vesper | 90 / 40 / 80 / 63% | 1:42 / 1:32 / 3:22 / 2:22 | 8.4 / 8.9 / 5.9 / 8.9 s | 67 / 90 / 64 / 42 | 2.1 (0) |
| Armilla | 63 / 37 / 73 / 50% | 1:42 / 1:04 / 2:02 / 1:42 | 5.0 / 6.4 / 4.8 / 8.0 s | 81 / 109 / 79 / 51 | 2.5–2.7 (0) |
| Cordis | 57 / 20 / 57 / 50% | 2:02 / 1:22 / 3:42 / 2:32 | 4.8 / 8.1 / 4.3 / 6.3 s | 127 / 96 / 118 / 66 | 1.8–2.0 (0) |
| Vesper, `rework,breach` | 90 / 40 / 80 / 63% | same | **29.8 / 30.8 / 22.9 / 30.3 s** (first hit → dead 27–41 s) | 44–105 | 2.1–2.3 |
| Armilla, `rework,breach` | 63 / 37 / 73 / 50% | same | **20.9 / 21.8 / 20.0 / 24.1 s** (first hit → dead 25–29 s) | — | — |
| Cordis, `rework,breach` | 57 / 20 / 57 / 50% | same | **19.7 / 26.6 / 19.2 / 24.4 s** (first hit → dead 22–37 s) | — | — |

The engagement check plays single battles, so `hotstart`'s battle-1 modifiers don't apply in it; the Vesper/Armilla/Cordis rows are plain `rework` with commanders. Comebacks (winner won after falling to ⅔): 0 in every cell, `breach` included. The winner's Heartcap was untouched in 359 of 360 plain battles.

**Battle flow, M5 against `rework`** (`bot:balanced`, no commander, 20 seeds per general, Bogwater) **[new]**:

| vs | Rules | Player wins | First contact | Supply 1:00 / 5:00 | Damage pulse: peak / trough, busiest 6 s of 20 | Bursts | Shielded releases (player / enemy) | Units per release (player / enemy) | Merges |
|---|---|---|---|---|---|---|---|---|---|
| scripted | M5 | 7/20 | 39 s | 10 / 30 | 1.05 / 0.96, 31% | — | — | — | 37 |
| | `rework` | 11/20 | 28 s | 13 / 45 | 1.28 / 0.82, 33% | 43 | 17.5 / 17.9 of ~23 | 7.7 / 8.1 | 110 |
| Old Mother Mold | M5 | 4/20 | 39 s | 10 / 24 | 1.06 / 0.92, 31% | — | — | — | 41 |
| | `rework` | 2/20 | 28 s | 16 / 40 | 1.35 / 0.71, 37% | 12 | 10.5 / 7.0 of ~18 | **5.4 / 12.0** | 108 |
| Lichen Baron | M5 | 14/20 | 42 s | 11 / 24 | 1.06 / 0.94, 31% | — | — | — | 21 |
| | `rework` | 11/20 | 30 s | 12 / 45 | 1.22 / 0.83, 35% | 59 | 19.7 / 13.7 of ~24 | 8.5 / 5.5 | 92 |
| Blightwright | M5 | 13/20 | 41 s | 14 / 26 | 1.09 / 0.91, 32% | — | — | — | 14 |
| | `rework` | 7/20 | 30 s | 18 / 45 | 1.14 / 0.85, 34% | 51 | 14.8 / 19.4 of ~21 | 7.2 / 6.0 | 72 |

"Damage pulse" is unit damage (hits on units, from units, towers and turrets) binned by second of the 20 s cycle, scaled so 1.0 is flat.

**Hold under waves** (`bot:balanced` + scripted player holds, 30 seeds, Bogwater) **[new]**:

| vs | No holds | Hold every other beat (≈ 11 holds a battle) | Hold the opening beat only |
|---|---|---|---|
| scripted | 15/30 | 15/30 | 11/30 |
| Old Mother Mold | 2/30 | 2/30 | 2/30 |
| Lichen Baron | 16/30 | **24/30** | 20/30 |
| Blightwright | 9/30 | **15/30** | 16/30 |

**The general against a swarm** (50 seeds, Bogwater, adaptation on; general wins) **[new]**:

| Spec | vs mono Sporeling | vs mono Veilstalker | What it reads / builds |
|---|---|---|---|
| `rework` (swarm read on), Lichen Baron | 14/50 | 7/50 | Swarm every read; Capguard Halls, Burster Pods, Mortars, Drift Stalks |
| `rework`, swarm read off, Baron | 12/50 | 7/50 | Elite 81 of 99 reads vs Sporelings, but builds no slayers: its weights have none |
| `rework,a2`, Baron | 15/50 | **14/50** | Swarm; the counter floor adds Sporeling Burrows (35–50 placed) |
| `rework`, swarm read off, `a2`, Baron | 13/50 | 15/50 | Elite 82 of 100 reads vs Sporelings; now builds 30 Veilstalker Hollows, but still wins only 26% |
| `rework` (any of the four specs), Old Mother Mold | 33–37/50 | 50/50 | She's a swarm herself and wins the mirror; none of the knobs changes her (Sporeling Burrows 296–348 placed) |

- **No existing knob makes the Baron answer mono Sporeling** (12–15 of 50 in all four). Even building 30 Veilstalker Hollows (Elite read plus the counter floor) doesn't, because one slayer building inside a Capguard-and-Mortar doctrine isn't the matrix's Sporeling + Veilstalker pair. Teaching the answer means changing what the counter set *is*, not how hard it's weighted.
- `a2` alone does help against mono Veilstalker (7 → 14 of 50), by adding Sporeling Burrows.
- **Old Mother Mold doesn't need answering**: under `rework` her own swarm beats mono Sporeling 70% and mono Veilstalker 100%. The G8 problem is the defensive generals (the Baron), and the player's swarm against them.

### 3.4 The known issues going in

| # | Issue (status.md) | Evidence | Likely cause |
|---|---|---|---|
| K1 | Battle 1 is harder with Armilla and Cordis | P2: battle-1 run deaths 79 → 108; **[new]** 114 on the playtest preset, Armilla 54% and Cordis 56%; without waves 68 (P2) | Waves (P2 attributes it); plausible mechanisms: Old Mother Mold's waves of 12 Sporelings per release against the bot's 5.4 **[new]**; Armilla's one-type opener gets no shields; Rhizome Tithe pays per column while flips come later; Puppet Bloom duplicates what waves already do. Flyers and the swarm read add ~6 more battle-1 deaths and cost 16 run wins **[new]** |
| K2 | Falling back early is a big edge | G6 88% (M5 55%); no single piece does it | Not isolated. Hypothesis: interior lines. The side that's behind fights under its own turrets (9 tiles) and call for help pulls every idle unit near its buildings, while the side that's ahead sends each new wave 6 more columns at its slowest unit's pace |
| K3 | No comebacks | 0 / 360 (P2); 0 / 360 on the playtest preset and 0 / 360 with `breach` **[new]** | Untouched by the rework: when a Heartcap is first hit the loser has about 1 building and 0 units left (step B) |
| K4 | The general doesn't answer a swarm | G8; Baron 24% vs mono Sporeling with the right read; **[new]** 12–15 of 50 under every existing knob | The Swarm counter set (`counterKindsOf`: any slash or splash spawner) doesn't contain the matrix's answer, Sporeling + Veilstalker; the Elite set (slayers) adds Veilstalkers but inside the Baron's Capguard-and-Mortar doctrine; and the general never holds under waves |
| K5 | A flyer army is still strong | Mono Drift Stalk 72/90 under rule C; 85–90% on one-lane maps; wins 26 of 48 battle-1 games | Rule C trades immunity for ×0.5; `bot:balanced` is mostly small fry; no Anti-Air counter |
| K6 | The Rhizomorph may not earn its place | Carries nothing; 1–4% of damage; **[new]** 0–8 surface per side per battle | It surfaces alone, and its targets (uncovered archers) are rare against mixed armies |

### 3.5 What hasn't been measured

- **The playtest preset's** G5–G8 and engagement before today (P2 ran them without flyers and the swarm read). The **[new]** runs above fill the runs gap only.
- **Any player who holds.** Every bot number has the player side never holding under waves; **[new]** shows holding moves results by up to 8 of 30.
- **Twin Roots** for engagement and runs-per-map detail beyond "battles lost by map" (Twin Roots is the least deadly map in every **[new]** run set).
- **Two pieces removed at once**, and the package without the Rhizomorph as a whole (P2 "What was skipped").
- **Human onboarding:** the playtester knows the game; a first-time player would meet all of §1.2 at once.

---

## 4. P4 decision tree

P4 has three calls (combat-rework.md "P4: decide"): **Adopt** the pieces that carry the result, **Iterate** on numbers, or **Level 3** (rounds). This tree adds a fourth, **Other**: work outside combat rules (presentation, onboarding, run layer) that the playtest may show is needed whichever call is made.

### 4.0 What each call costs

- **Adopt** (per piece): move the setting from `src/data/proto.ts` into `data/balance.json` and the units/buildings into `data/factions/velvet-bloom/` (and the Gray Rot mirror); SPEC edits (combat-rework.md "What it touches": §4.2 the beat, §4.4 spawners feeding waves, §5.2 formation, pace, Hold, call for help, pinning, burrowing, §5.3 clouds and the reach rule, §4.3 flyers hold no ground, §7.4 the swarm read, §11 the new units, §12.3 G12 = the strict counter bar in `npm run test:slow`, §17 #7 flying and burrowing in); a golden refresh (`npm run golden -- update`); `data/CHANGELOG-balance.md`; moving the rework strings in `src/ui/` from `state.rules.*` conditionals to permanent text, Help tabs, first-time tips; `docs/status.md`. Then M6–M8 get written against the adopted model.
- **Iterate:** each knob is one `path:value` override, measured with `npm run experiment -- --proto rework,<path>:<value> --checks counters,g4 --g3seeds 50 --g4seeds 200 --workers 10` (7–17 min a matrix, under 2 min a G4). Runs with `--checks runs --commander <c> --power-policy auto` (1–2 min per commander).
- **Level 3:** rounds.md's clash prototype first: `--checks clash`, a ~200-line tool plus a clash row in `tools/lib/balance.ts`, one session, no rule change. Only if it passes does the round loop get built (several sessions on `feature/rounds`).

### 4.1 Q3: "Do the waves give a battle rhythm, or make it feel less alive?"

Waves carry almost every bar (P2), so this is the gate.

| Outcome | What it would mean | Call | Work |
|---|---|---|---|
| **Rhythm: "I watched for the beat and planned around it"** | The shared clock works as a feel, not only as balance | **Adopt** waves | Presentation that P1 skipped: a beat sound (a `release` case in `src/app/battleSound.ts`), a door pulse on the field at release, and a single vocabulary: the beat is "the wave", and the 60 s clock gets another name in `top.ts`, `explain.ts`, `help.ts`, the counter warning ("in 2 minutes" instead of "2 waves") and the draft/interest texts. A first-time tip for the beat and one for shields |
| **"It feels mechanical / a metronome"** | The rhythm is predictable and the player's only input is when to hold | **Iterate**, not Level 3: rounds are more set-piece, not less | (1) Presentation first (as above), since **[new]** the combat pulse is mild and the "mechanical" feel may come from the empty first 20 s and the HUD countdown rather than the fighting. (2) Give the beat a decision: a per-lane "send now" that releases a lane's stored units immediately (today nothing can release before a spawner's scheduled moment), perhaps for gold or by giving up that wave's shields; or a Hold that costs something (see 4.5 K-Hold). (3) Vary the beat by event or relic (`side.waveBeat` exists: P1 hooks). Measure with G3/G4 as above |
| **"Less alive": empty field at the start, units vanish into buildings** | The 20 s of empty field and units hidden inside read as nothing happening | **Iterate** | Show stored units on the field (a cluster at the door, render only, no sim change) or release the first beat earlier: a new knob such as `waves.firstBeatSeconds: 10`, measured with G3, G4 and engagement |
| **"I didn't notice the beat"** | Fights look continuous; consistent with **[new]** 33–37% of damage in the busiest 6 s | **Adopt on the numbers** | Decide waves by Q1/Q2 and the bars; presentation work is optional |
| **"Waves feel worse than M5 and one unit type still decides battles" (Q1 bad too)** | Level 2's two premises both fail in play | **Level 3** | The clash prototype first (rounds.md "Recommendation"): read on today's combat, then with pinning, the Burster, cleave and shields. If a mixed army in formation still loses whole-army clashes, neither waves nor rounds will fix G3 without changes to combat itself |

### 4.2 Q1: "Did any battle feel decided by one unit type?"

| Outcome | Expected? | Call | Work |
|---|---|---|---|
| **No** | Unlikely against Old Mother Mold (**[new]** bot wins 2/20) | **Adopt** the core | As 4.0 |
| **Yes: the swarm (Mold, or the player's own Sporelings)** | **Most likely.** G3 83/86; Mold's releases are 12 units against 5.4 **[new]**; G8 fails | **Iterate** (AI first, then numbers) | (a) Teach the general the swarm's answer by changing what its counter is, not how hard it's weighted: **[new]** every existing knob (swarm read on/off, `a2`) leaves the Baron at 12–15 of 50 against mono Sporeling, even when it builds 30 Veilstalker Hollows. Options: a counter *pair* (when Swarm is read, the counter set becomes Sporeling Burrow + Veilstalker Hollow, the matrix's answer, and the doctrine's own weights are suppressed harder than `otherMult` 0.6), or Drift Stalk in the set (the answer under reach). `a2` is still worth keeping for the Veilstalker case (7 → 14 of 50). Measure with `--checks g8` and the 100-seed Baron check. Mold needs nothing: she wins the swarm mirror 70% **[new]**. (b) Numbers: Sporeling Burrow batch (`building.sporelingBurrow.spawn.count`) or interval; `mixedWave.shieldFrac` 0.2 → 0.25–0.3 so the answer wins harder; `waves.beatSeconds` 17 (P1b/P1c: passes the strict bar, but G3 fails archers and Sporelings at 63–68 and G4 Decisions reach 20%). (c) If the player's own swarm is the problem, that's the same AI work: the general must answer it |
| **Yes: flyers** | Likely if the player drafts a Drift Stalk (mono 72/90; 85–90% on one-lane maps) | **Iterate** | The two open fixes (status #2): a Driftling retune (`unit.driftling.hp` 70 → 55–60, or `building.driftStalk.spawn.interval` 18 → 21–22) measured with G3 including mono Drift Stalk, or the general's Anti-Air counter kind (flyers.md "The general": score = the player's air share; set = Gill Nest, Capguard Hall, Scythecap Grove, Amanita Lodge, Drift Stalk; G8 row "mono Drift Stalk drops ≥ 20 points"). If neither lands before P4, adopt the core without flyers (they're a separate preset) |
| **Yes: archers** | Unlikely (Gill Nest passes G3, 51/54) | **Iterate** | `pinned.rateMult` 0.35 → 0.25; check that call for help still keeps G2 healthy |
| **Yes: Bursters (the general's)** | Possible against the Baron (59 bursts a battle **[new]**) | **Iterate** | Pod interval 10 → 12–14 s or burst 40 → 30; the Burster also costs G4 4 points, so a weaker one helps Decisions |

### 4.3 Q2: "When the general massed something, could you answer it, and did you know how?"

| Outcome | Call | Work |
|---|---|---|
| **Answered it and knew how** | **Adopt** | — |
| **Could have, but didn't know how** | **Other** (presentation), then adopt | The answer to the swarm rests on a tooltip rule (two unit types → shields). Make it visible where the decision is made: the tray card's role line (e.g. "+ another type = shields"), the beat chip glowing when the next wave qualifies, and the counter warning naming what beats the massed kind (engagement-review recommendation 6, "the warning offers an answer"). Add the enemy's next-wave size and type count to the beat tooltip |
| **Knew, but the answer wasn't in the tray** | **Other** (run layer) | In battle 1 the tray is three starter cards; the first draft is at 2:00 and blueprints are 35% of draft cards. Options: `hotstart`'s deploy draft (**[new]** halves battle-1 deaths under `rework`), a guaranteed second unit type in every starter (Armilla's lacks one), or an "answer pick" when a counter warning lands |
| **Knew and had it, but it didn't work** | **Iterate** | Numbers on the answer: shield size, Veilstalker slayer, Driftling. Then re-run the strict bar |

### 4.4 Q4: "Do clouds, Rhizomorphs and flyers read clearly, and can you tell what can hit a flyer?"

| Element | Readable → | Not readable → work |
|---|---|---|
| **Spore clouds** (Burster only under `rework`) | Adopt | A side-coloured rim or a stronger tint (today 14% / 22% alpha in the owner's glow, with white specks); a burst sound |
| **Shields** | Adopt | If the bubbles clutter the field (most of a mixed wave carries one, `31b-shields-zoom.png` (not kept)): show the ring only while a shield is fresh or on hover, and drop the per-beat "shields up" callout after its first time |
| **Rhizomorphs** | Decide by K6 | A surfacing burst effect and sound, so the player connects the mound to the unit that pops up |
| **Flyers** | Adopt with flyers | The Driftling's top half is spore-white (`#fbf6ff`, the same white `drawClouds` and the ambient spores use, per the renderer's "spores are the one particle" note). If players confuse them with spores, give the thistledown the faction tint. The reach rule under rule C is simple ("everything hits it, melee for half; Mortar shells and bursts can't") and is printed on every card |
| **"What can hit a flyer"** | — | Under rule C almost everything can, so the question mostly matters if P4 goes back to reach. Then add a wing mark to units with reach (flyers.md "How a flyer reads") |
| **Call for help / pinning** (not asked, but invisible) | — | A brief "!" over units that answer a call, and a pinned marker on archers. Or accept them as invisible rules that only shape balance |

### 4.5 The known issues

| Issue | Plausible playtest outcomes | Call | Work |
|---|---|---|---|
| **K1 Battle 1** | (a) The playtester dies in battle 1 or wins only narrowly, especially with Armilla or Cordis or against Mold. (b) Battle 1 feels fine (a human holds and drafts better than `bot:balanced`) | (a) **Other + Iterate**; (b) note it and adopt | (a) Ship `hotstart` with the package: **[new]** 114 → 55 battle-1 deaths, 44 → 70 run wins under `rework`. Then deal with battle 2 (Armilla loses 50% there): move Old Mother Mold out of battle 1 (a data change; step B got battle-1 losses to 6% with it) or soften battle 2. Give Armilla a second unit type in her starter (swap the Mortar for a Sporeling Burrow, say) so her opener gets shields. Revisit Rhizome Tithe (per column) and Puppet Bloom under waves |
| **K2 Falling back** | (a) The player notices "losing ground is safe" or "pushing feels pointless". (b) Unnoticed | (a) **Other** (territory) or **Iterate**; (b) leave, but add an upper bound to G6 | (a) Make held ground pay (engagement recommendation 4; F15/F16 home-ground and spreading-territory ideas), or make the forward position an asset under waves: a lane's release point is its frontmost spawner door, so a forward spawner already pulls the whole wave forward; measure whether that's enough to flip G6. (b) G6 asks only ≥ 20%; a band (20–65%, say) would catch an inversion |
| **K3 No comebacks** | (a) The ending feels abrupt or a loss feels decided early. (b) Fine | (a) **Other** | `breach` composes with `rework` (**[new]** ⅔ → dead 19–31 s instead of 4–9 s), but adds no comebacks (0 of 360) and doesn't move run results (112 battle-1 deaths, 44 wins). A real comeback needs a moment earlier in the collapse or a run rule: a Rout loss costs HP instead of the run (engagement recommendation 2; rounds.md's one Heartcap pool). Under Level 3 the per-round damage cap removes the cliff by construction |
| **K4 The general and the swarm** | (a) Mold or the player's swarm rolls through, and the general's counter warnings change nothing. (b) Doesn't come up | (a) **Iterate (AI)**; the user said not to start it unasked | Teach counter sets from the counter matrix (rounds.md has the table: archers → Sporelings, Sporelings → Capguards or Knights, Knights → Hammercaps, Morels → Veilstalkers; under the rework the merging swarm's answer is Sporeling + Veilstalker). **[new]** the existing knobs don't get there (12–15 of 50 vs mono Sporeling in all four specs); `a2` helps against Veilstalkers only. Also consider letting the AI hold under waves (it never does) so a general can mass a wave |
| **K5 Flyer army** | (a) A drafted Drift Stalk carries runs, or the Baron's flyers feel unfair. (b) Rare | (a) **Iterate** | As 4.2 "flyers". If unresolved by P4, adopt the core and leave `flyers` as its own preset |
| **K6 Rhizomorph** | (a) The playtester never drafts it, or it does nothing visible. (b) They enjoy the mound and the surprise | (a) **Drop**; (b) **Iterate** | (a) Remove `...RHIZOMORPH` and its two roster appends from `rework` (one line, status #4); G4 improves to 8.5% and G5 passes (P2). (b) Give it company: "Rhizomorphs that surface together" (combat-rework.md "Waves give perks something to act on"), or make it a relic or commander piece rather than a blueprint |
| **K-Hold (new): Hold under waves** | (a) The player finds that holding every other beat is just better and does it by rote. (b) They hold situationally. (c) They never hold | (a) **Iterate**; (b) adopt; (c) **Other** | (a) **[new]** a blind every-other-beat schedule adds 6–8 wins of 30 against two generals. Options: let the AI hold under waves too (so measurements and the general use the verb), give a held wave a cost (no shields on a doubled wave, or the hold costs gold), or let the hold be any length with a decay. (c) The first-time tip still describes the old Hold; rewrite it for waves |

### 4.6 Putting it together

- **If Q1 says "the swarm" (likely) and Q3 is neutral or positive:** adopt the core (waves, two-type shields, pinning, call for help, the Burster, the Elder change, the storm, the swarm read) with `hotstart` or a battle-1 data fix, and open the general's counter-set work. Keep flyers as their own preset until the retune or Anti-Air lands; drop the Rhizomorph. Do the presentation items in 4.1 row 1 in the same pass, since they're cheap and every later playtest benefits.
- **If Q3 says "mechanical" but Q1/Q2 are positive:** adopt the core on the numbers and spend the next session on the beat's presentation and a decision at the beat (send now / costed hold). Don't move to Level 3 for a feel problem that rounds would amplify.
- **If Q1 and Q3 are both negative:** build rounds.md's clash prototype (one session) before writing any round loop. Its first read, on today's combat, tests the rework's own diagnosis.
- **Whatever the call:** fix the vocabulary collision and the invisible-rule gaps before the next playtest, and don't write M6–M8 content until P4 has picked the combat model (status "In short").

---

## 5. What the rework doesn't address about fun, and what it risks

### 5.1 Problems the rework leaves where they were

| Problem | Evidence | Under the rework |
|---|---|---|
| **The Heartcap cliff** | Engagement review: loser's Heartcap dies 13–20 s after first damage; step B: when it's first hit the loser has ~1 building and 0 units | Unchanged or sharper: ⅔ → dead 5–10 s (P2), 4–9 s **[new]**; the storm now also doubles waves by 8:00. `breach` stretches it to 19–31 s **[new]** without changing outcomes |
| **No comebacks; run HP is binary** | Winner's Heartcap untouched 120/120 (ER), 360/360 (P2) | Unchanged: 0 comebacks in 360 (P2) and in 720 more battles **[new]** (360 plain, 360 with `breach`) |
| **Battle-1 deaths and an upside-down curve** | ER: 41% of runs end in battle 1, the boss loses 80% | Worse: 48% end in battle 1 on the playtest preset; boss fights won 44 of 48 **[new]** |
| **A quiet early tug-of-war** | ER: no flip before 3:00 in 30–83% of battles; Hold fixed it (first flip 0:34–1:29) | Partly undone: first flip back to 1:04–3:42, none by 3:00 in up to 70% against the Baron **[new]**. Armies do meet sooner (28–30 s) and bigger, so the field is busier but the main readout is still |
| **Territory has no payoff** (pillar 1; F1, F6, F15, F16) | Gold piles up; forward building isn't worth it | Inverted: being 6 columns behind wins 88% (G6). Flyers hold no ground, so a flyer army can win while the tug never moves |
| **Merging isn't a decision** (pillar 2: "visible, emergent, controllable … not a free stat bonus") | ER: automatic, the toggle rarely matters | More automatic: 72–110 merges a battle **[new]**, G7 mirror 72% (fail). Cordis's identity (the merger) is redundant. The Elder Sporeling's perk is gone |
| **The general's counters aren't moments** (pillar 3; ER recommendation 6) | G8 fails today | Still fails; with the right read the counters fizzle (Baron 24%, **[new]** 14/50); the warning's "2 waves" is now ambiguous |
| **Few player verbs** | ER: ~2 decisions a minute; Hold raised commands to 2.1–2.6/min | Bots' commands fall to 1.8–2.7/min because they no longer hold (P1, **[new]**); for a human, Hold becomes at most one decision per 40 s per lane, and **[new]** a fixed schedule captures most of its value |
| **Drafts are small** (ER recommendation 5) | Mostly +15% cards | Three new blueprints dilute the pool; the Rhizomorph Tunnel is a card that carries nothing measured; the Drift Stalk is the strongest mono card (72/90) |
| **Placement is noise** (step A's placement spread; colony-swarm) | Parked behind the rework | Untouched; the release point at the frontmost spawner is the one new placement effect |
| **Onboarding** (F8) | Round 3: "too much to learn" | ~10 new rules (§5.2 below) |

### 5.2 Risks to fun the rework itself introduces

1. **Complexity load against F8.** The user waived F8 as a constraint for the design (combat-rework.md "The user's brief"), but the playtest will still meet it. Counting from §1.2, a player must learn: the beat; units waiting inside; early release from deeper buildings; slowest-unit pace and ranged-behind-melee; Hold's new one-beat meaning; shields at two types per lane; pinning; call for help; tunnelling and surfacing; bursts and clouds that ignore armor; flyers and the ×0.5 melee rule; lobs and bursts that can't hit flyers; the storm's wave growth; plus three new units. Two are invisible (call for help, pinning), five live only in tooltips, and none has a first-time tip. Round 3's testers asked what interest and the storm were; the rework adds more systems than M3–M5 did.
2. **Two meanings of "wave".** See §1.3. The general's warning, interest ("each wave pays…"), drafts ("after waves 2, 4, 6, 8") and the counter cycle all use the 60 s wave, the beat chip and its tooltip use "Next wave". It's the kind of confusion round 3 reported for interest.
3. **A beat that's felt in the HUD more than on the field.** **[new]** The combat pulse is mild (33–37% of damage in the busiest 6 s vs 30% flat), so survivors fight continuously and the beat shows as units popping out of buildings. The first 20 s of every battle are an empty field. With no sound on release, whether the beat reads as "rhythm" or "a timer" depends almost entirely on the HUD chip. That's the Q3 risk in concrete form.
4. **Hold becomes a schedule, and only the player has it.** **[new]** holding every other beat is +6 to +8 wins of 30 against two of the four battle-1 generals and needs no reading of the battle; the AI never holds under waves (`controller.ts` line 108). Either it becomes a rote "press F after every other beat" chore, or the measured difficulty overstates what a holding player faces. Neither is in P2's numbers.
5. **Noise on the field and in the callout lane.** 12–59 bursts a battle, each with a ring and a 4 s haze; shield bubbles on most of a mixed army; Driftlings drawn over everything; a "shields up" callout every shielded beat (17–20 of ~23 for `bot:balanced` **[new]**) and merge callouts for ~100 merges a battle, all through a three-slot lane (`callouts.ts`). The engagement review's complaint was a field too quiet to read; this risks the opposite on a field whose units are about 8 px (ER).
6. **The general gets new toys first.** Every general's run kit includes the Tunnel, the Pod and the Stalk from battle 1 (`flow.ts` lines 169–170); the player gets them only as uncommon blueprints. In battle 1 the player meets Bursters and Driftlings they can't build and haven't been told about, which reads as unfair even if SPEC §7.1's "honest AI" covers rules, gold and information rather than kits.
7. **Commander identities bend.** Armilla's starter has one unit type, so her opening waves never get shields; Rhizome Tithe pays per column held while flips come later; Cordis's Puppet Bloom merges trios when waves already merge nearly everything; Vesper's Spore Burst probably gains from packed waves. **[new]** run wins: Vesper 26, Armilla 8, Cordis 10 of 80. A commander that's clearly worse is a run the player won't pick twice.
8. **"Mixed" can become a checkbox.** Shields reward any two unit types per lane, and on Twin Roots that's two spawner types in *each* lane. The likely learned rule is "always build a second type", which is diversity by tax rather than by interest. It's still better than mono dominance, but the playtest should note whether the second building felt chosen.
9. **Territory reads wrong.** With G6 at 88%, a player who sees the tug going against them is often winning, and a flyer army moves no columns at all. The game's main readout and its outcome come apart.
10. **Longer battles, shorter runs.** G4's median rose from 6:58 to 8:04 (P2/status), and the Lichen Baron's battles go to a Decision 17–37% of the time with commanders **[new]**. Runs get shorter only because they end sooner: mean battle minutes per run fall to 11.9–15.0 (M5 13.8–15.5) **[new]**, and with 48% of runs ending in battle 1, a lot of runs will be one long loss.
11. **Odd-looking edge behaviour, from code reading (not observed):** under rule C every unit "reaches air", so a call for help from a flyer's victim can hand a Burster a flyer as its target; with no ground enemy in range it keeps that target, rolls under the Driftling and bursts for nothing but the cloud (`answerCalls` in `combat.ts`; `aimBurst` keeps a called target; `burstUnit` skips flyers). Rare, but it would look like a bug.

### 5.3 A watch-list for the playtest (cheap, and it resolves branches above)

- Record per battle: commander, general, map, result, and whether a Drift Stalk, Burster Pod or Tunnel was drafted or met. Battle 1 with Armilla or Cordis against Old Mother Mold is the predicted wall.
- Did you hold? How often, and did it feel like a choice or a routine? (K-Hold)
- Did you read the general's "2 waves" as beats or as minutes? (§1.3)
- Did you notice shields, and did you build a second unit type because of them? (risk 8, Q2)
- When did the battle first feel "on"? (the empty first 20 s; the late first flip)
- Did anything happen that looked like a bug? (risk 11; units turning on attackers from call for help)
- Optional second pass on the same day, so the P4 tree has both sides of K1 and K3: `?proto=rework,hotstart` and `?proto=rework,breach` both compose (**[new]**).
