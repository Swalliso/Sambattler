# Battle feel: what the player does and sees in a battle

Evidence for [After the combat rework](../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): battle feel. Written by an agent during that review; nothing here is adopted. Recovered from the session transcript, so the screenshots it mentions are kept only where linked ([screenshots/battle-feel/](screenshots/battle-feel/)); the capture scripts are in [scripts/screenshots/](scripts/screenshots/).

Review of `develop` at `ef2e133` (the build on the dev site), with the focus on the `rework` preset now in playtest (P3). Lane: verbs, feedback, readability, juice and learning inside one battle. Balance, rules, run structure and meta are left to the other reviews. I mention them only where they decide what the player sees.

## Method

- **Code read:** `src/render/` (renderer, effects, frame, spores), `src/app/` (battleView, input, battleSound, tips, loop, settings), `src/ui/` (hud/top, hud/explain, hud/tray, hud/kit, callouts, inspect, help, buildingInfo, draftOverlay, words, report), `data/sounds.json`, `src/data/proto.ts`. SPEC sections §4, §5.2, §6, §10, §13.6, §13.9, §17, plus `docs/ui-ux-plan.md`, `docs/playtest-feedback.md`, `docs/engagement-review.md` and the backlog's P1 and P2 engagement tables.
- **Live checks:** I used the dev site (`https://swalliso.github.io/Sambattler/dev/`, build tag `ef2e133`) with `?proto=rework&scene=battle`.
  - Bot players played it: `bot:balanced`, `bot:mono:driftStalk`, `bot:mono:bursterPod` and `bot:mono:rhizomorphTunnel`, against the scripted general and Old Mother Mold.
  - I fast-forwarded with `ticks=`.
  - Playwright (DPR 1) captured it at 1280×720 and 1920×1080, plus 2× and 4× crops of the native field canvas. The capture script and the 38 PNGs were in the session's scratch folder (the PNGs in `out/`). The scripts are in [scripts/screenshots/](scripts/screenshots/); the PNGs kept are in [screenshots/battle-feel/](screenshots/battle-feel/) and linked below, and the rest are marked "(not kept)".
  - I measured layout with in-page JS.
- **Not done:** a human playing with sound on. Sound findings come from the code and `data/sounds.json` only.

## Summary

1. **The beat is the rework's heartbeat, and it makes almost no noise.** Both sides release their waves every 20 s on a shared beat.
   - There's no release sound: `battleSound.ts` has no `release` case.
   - The once-a-minute `wave` sound is the old 60 s wave. The spawn sound is one "very quiet", throttled puff (`cooldownMs` 220, priority 1, `frequent`).
   - The field shows no release effect beyond ordinary spawn motes. You don't see what the enemy's next wave holds in total.
   - The beat chip borrows the Hold icon (`i-hold`), and a second chip, also called "Wave", counts minutes.
2. **The finish is a cliff with no big moment.**
   - In the measured seed, the enemy Heartcap went 2000 → 0 in about 12 s. The territory tug still read 21 columns to 11, and the callout lane said "Bloomed Sporeling!".
   - The player gets no callout for hitting *their* Heartcap. The in-field Heartcap never changes (it's baked into the terrain). The report wipes in about 150 ms after the killing blow.
   - Across 360 battles under the package, the winner's Heartcap was never touched, and a falling Heartcap dies 5–10 s after reaching ⅔.
3. **Half of the rework's rules don't show on the field.**
   - Pinning and call for help have no visual at all.
   - Flyers taking ×0.5 from melee still show the matrix spark, so a Sporeling's slash on a Driftling throws a gold "strong" spark for a ×0.75 hit.
   - Mortar shells and bursts that can't touch a flyer show nothing.
   - The Rhizomorph mound is brown on brown soil, with three pixels of side colour, and it surfaces with no effect.
   - The Burster's burst is silent.

   This bears directly on P3 question 4 ("do clouds, Rhizomorphs and flyers read clearly, and can you tell what can hit a flyer?").
4. **Watching is hard.**
   - The field is 35.6% of the window height at both 1280×720 and 1920×1080. Units are 24–28 screen px at 1280.
   - The densest moments are piles of overlapping sprites and "BLOOMED!" labels on a busy Gray Rot mat.
   - Rich Loam is the highest-contrast thing on the field.
   - For the first 2–4 minutes under `rework`, nothing tells you who is ahead: the first flip is at 1:04–3:22 under the package, against 0:34–1:40 today.
5. **Combat itself is almost silent.**
   - Of 30 sounds, none plays for a unit hit, a unit death, a shot, a burst, a shield break or a wave release.
   - Only Heartcap hits thud, at most once every 1.5 s.
   - The bed under it is cave drips, with no music.
6. **The rework is taught only by tooltips.**
   - Help has no tab for waves or the new units.
   - No first-time tip covers the beat, shields, flyers, pinning or burrowing.
   - Call for help is explained nowhere in the UI.
   - The storm growing waves is mentioned only in the beat chip's tooltip.
   - Help's Keys tab says a hold lasts 30 s, which is wrong under waves.

The cheapest high-value work is render, audio and UI only. It never touches `src/sim`, so it moves no golden hashes: beat audio and a field pulse, a finish beat (slow-mo plus the Heartcap breaking), honest flyer sparks, glyphs for pinned and calls, enemy-Heartcap callouts, a Waves tab and first-time tips.

---

## 1. The verbs

Decision counts come from `docs/engagement-review.md` (2026-10-28) and the backlog's "`rework`: G4, engagement and runs" and "Combat rework P2 → Engagement and runs" sections. The P1 and P2 rows were measured with `bot:balanced` and auto power, not a human.

| Verb | Key / control | Cost | Cooldown / limit | How often in a typical battle | Notes |
|---|---|---|---|---|---|
| **Place a building** | `1`–`9` or a tray card, then click. `Shift`-click keeps placing | Base price × (1 + 0.05 × depth), charged at once (§6.3). Kit prices 110–260 | Gold. Legal tiles only, shown as a lilac grid while placing | About 10 a battle, 2 of them at deploy (300 gold). Early income of +96/min buys one every 60–90 s, and the review's first purchase after deploy came at 1:07 | Most of the decisions. Works while paused. The ghost shows price, depth and loam |
| **Sell** | Select, then `X` / `Delete` / `Backspace` twice, or the inspect button | Refunds 100% in deploy or within 10 s before the building produces anything; otherwise 60% | Blocked while besieged | Rare. The review saw little selling (60% refunds, F1) | Two presses, the first shows the refund (`inspect.ts`) |
| **Hold / Advance** | `F` (every lane) or a per-lane switch | Free | Classic: a hold lasts up to 30 s, then 10 s cooldown. **Under `waves`:** keeps the lane's next wave home one beat; the next beat sends both; no new hold until they leave | E1 measured 4–7 stance commands a battle (2.1–2.6 cmd/min in all). Under `rework` the AI never holds, and bot cmd/min fell from 2.6–3.7 to 1.8–2.8 | The only timing verb. Under waves it's at most once every two beats (≈ every 40 s), about 12 chances in an 8-minute battle |
| **Commander power** | `Q` or the power button, then click the field. Esc cancels. Can aim while paused | Free | Vesper's Spore Burst: first at 0:45, then every 75 s. Armilla's Rhizome Tithe: 1:00, then 75 s. Cordis's Puppet Bloom: 1:00, then 80 s (`data/commanders.json`) | At most 6 in the 8:04 median battle (G4 under `rework`): 6 for Vesper (0:45 … 7:00), 6 for Armilla, 6 for Cordis | Reticle, lane wash, charge ring on the button, a "ready" tip the first time. The effect is a lilac ring (effect 12) plus a reused sound |
| **Draft pick / reroll / skip** | `1`–`3` or click. Reroll and Skip buttons | Reroll costs 20 gold, +10 each time. Skip pays +40 gold | Opens after waves 2, 4, 6 and 8 (2:00, 4:00, 6:00, 8:00) and holds the sim | 3–4 a battle in a run. The 8:04 median means about half reach the 8:00 draft | The draft opens on the same tick as a beat release, the interest payout and (at 4:00) the first storm stack. See §3.5 |
| **Merge toggle** | Select a spawner, then `M` or the inspect button | Free | None | Almost never. The review called the toggle "rarely worth touching", and under waves nearly everything merges anyway (49–119 merges a battle, both sides, under the package) | |
| **Pause / speed** | `Space` (pause; Begin in deploy), `[` `]`, segmented control | | | Meta-verbs. Every command works while paused | Default speed is a setting |
| **Begin** | `Space` / `Enter` / button | | Once | 1 | Both sides place blind, and the general's opener appears at Begin |
| **Inspect** | Click a unit or building. `Tab` cycles your buildings | | | Information only | Units show tier, HP + shield, damage, matchups, flying, perk, status (tunnelling or merging), DPS over 5 s and kills. Buildings show the next spawn, living units, "Waiting inside" (waves), damage, gold, status, merge and sell |
| **Read the HUD** | `I` (chips), `R` (relics), `H` (Help), hover | | | Information only | Help pauses the battle; so does the settings cog |

**What the table shows:**

- The player's real decision verbs in a live battle are placing, Hold, the power and drafts.
  - Placing is gated by income, so the first two minutes hold about one decision each.
  - Hold under waves became binary ("keep this wave home?"), offered every other beat.
  - The power gives about 6 decisions.
  - Drafts give 3–4, but they freeze the field.
- Under `rework` the rate goes *down*. The beat does the timing for you, the AI never holds, and so the player has less reason to.
- The beat is a natural moment to hang a decision on, every 20 s. Today nothing in the UI asks anything of the player at the beat (see gap G6).

---

## 2. What the player watches, and how well it reads

### 2.1 Geometry, measured on the dev site

| | 1280×720 (SPEC minimum) | 1920×1080 |
|---|---|---|
| Top band | 0–100 px | 0–100 px |
| Callout lane | 100–130 px | same |
| **Field canvas** (Bogwater, 36 × 8 tiles, 576 × 128 native) | **1152 × 256 px at 2×**, from y 195 to 451 | **1728 × 384 at 3×** |
| Field / window height | **35.6%** | **35.6%** |
| Bottom band | 516–720 px (204 px) | 204 px |
| Chrome (both bands) | 304 / 720 = 42% | 28% |
| Frame art (roots ceiling, soil bed) | the remaining ~22% | ~36% |
| One tile | 32 px | 48 px |
| A unit sprite (12×10 Sporeling to 14×13 Rootbreaker or Scythecap) | **24–28 px** | 36–42 px |
| Bloomed / Elder (`TIER_SCALE` 1.25 / 1.5, non-integer) | 30–35 / 36–42 px | 45–52 / 54–63 px |
| Unit HP bar (only when damaged) | 2 native px = 4 px tall | 6 px |
| Twin Roots (two lanes, 13 rows) | about 1.78×, fractional (`docs/ui-ux-plan.md`) | |

- The single-lane map is a 4.5:1 strip on a 16:9 screen, so width caps the scale.
- No HUD trim can make Bogwater bigger at 1280. Only a camera, a taller map or a different aspect can.
- The frame art (Phase 1a) dresses the empty height well, but it's decoration, not battle (shots [`rw-mold-3m00.png`](screenshots/battle-feel/rw-mold-3m00.png), `rw-1080-5m.png` (not kept)).
- The engagement review's "units are about 8 px at 1280×800" (repeated in `colony-swarm.md`) doesn't match today's sprites. The sprite boxes are 12–14 native px, so 24–28 px on screen. The *bodies* are about 8–10 native px wide.

### 2.2 Colours and contrast

- **Sides:**
  - The Velvet Bloom has violet and lilac caps on a violet squiggle mat (`matTile`, alpha 0.42).
  - The Gray Rot has ash-green caps on a gray-green tuft mat.
  - Units are drawn on top of their own side's mat most of the time, so the most crowded fights happen on the busiest texture. At 7:00 (`rw-mold-7m00-crop1.png` (not kept)), gray Rot units on the Rot's tufted mat are hard to pick out, and the mixed clump at the enemy's buildings can't be counted.
- **Rich Loam** (`t-loam`) is a near-black tile with gold flecks, and it's the highest-contrast thing on the field (`rw-mold-3m00-crop1.png` (not kept)). It pulls the eye more than units do, and its gold reads as money ("gold means money" is a design rule). That's deliberate meaning, but it competes with the armies.
- **The colour-blind assist** (off by default) adds a team mark under each unit. `docs/ui-ux-plan.md` B9 suggested a "team-tinted ground shadow under units" for everyone. Flyers already get a shadow (`flyerShadow`), and ground units have none.

### 2.3 The front line and territory

- **On the field:**
  - Owned columns carry their side's mat.
  - The frontier fills with hyphae as capture progresses, with a 3-px bar at the top of the lane (`drawCapture`).
  - A fort-blocked frontier shows a shield glyph.
  - A flip changes the mat at once. The territory canvas re-bakes on `columnFlipped`, with no transition effect.
- **On the HUD:** the territory tug (one bar per lane, a lilac frontier line, column counts) and its tooltip.
- **Readability under `rework`:**
  - **Late:** the first flip comes at 1:04–3:22 under the package (P2 engagement table: Vesper 2:22 / 1:22 / 3:22 / 2:42 against today's 1:40 / 1:09 / 0:34 / 0:34). For two to three minutes the main readout doesn't move.
  - **Flat:** in the measured seed (seed 7, `bot:balanced` against Old Mother Mold, `rework`), the report's front line is flat from 0:00 to the storm at 4:00 (`rw-mold-end.png` (not kept)).
  - **Disconnected from the result:** in the last 20 s of that battle the enemy had no buildings and no units. The tug and the mat still showed the Gray Rot holding 11 columns, a third of the map, while its Heartcap went 2000 → 0 (§2.5). Units walk past the frontier to the Heartcap, so the territory display lags the actual collapse.

### 2.4 Health bars

- **Units and buildings** get a 2-native-px bar (lilac for you, ash for them), only when damaged (`renderer.ts` `bar()`). Fine for a clean field, but tiny: 4 px at 1280.
- **Heartcaps:**
  - A 3-native-px bar sits over each Heartcap strip on the field. The big readout is in the top band: HP in a 30-px display face and a 10-px striped bar.
  - The number turns danger red below 34% (`HeartBar`, `.heart.low`).
  - There's no hit flash, shake or pulse on the HUD block. The bar has a 0.3 s width transition, nothing else.

### 2.5 What tells you who is winning

| Signal | Where | How well it reads under `rework` |
|---|---|---|
| Columns owned | Tug, column counts, mat | Static for minutes. Lags the collapse (above) |
| Heartcap HP | Top band | Flat until the end: the winner's Heartcap was untouched in 360 of 360 package battles. Then it collapses in 5–10 s from ⅔ |
| Army size | The field, by eye | No number. Your supply is in a chip, **the enemy's isn't shown anywhere.** Under waves the "+N" counts over buildings (both sides) are the best tell, but you have to add them up across buildings yourself |
| Wave clashes | The field | No clash summary. You can't tell who won a clash except by staring |
| The general's intent | Intent panel | Clear: "Preparing to counter your SWARM ●● 2 waves" |
| Battle report | After the battle | Good: front line, MVP, damage by building. It's the only place you learn what happened |

Seed 7, probed tick by tick ([`probe.mjs`](scripts/screenshots/probe.mjs)):

| Tick | Enemy Heartcap | Enemy units / buildings | Borders |
|---|---|---|---|
| 9100 | 2000 | 0 / 3 | 18 / 21 |
| 9200 | 1798 | 7 / 1 | 18 / 21 |
| 9300 | 1410 | 2 / 0 | 20 / 21 |
| 9350 | 900 | 0 / 0 | 20 / 21 |
| 9390 | 109 | 0 / 0 | 20 / 21 |
| 9397 | ended | | |

The whole battle is decided in about 12 s, and nothing on screen marks it.

### 2.6 How the rework's additions are drawn

| Addition | Drawn? | How (code) | Reads? |
|---|---|---|---|
| **Waves, stored units** | Yes | "+N" in 9-px monospace over each spawner, both sides (`renderer.ts`: `b.stored`) | Readable at 2× (`rw-mold-5m00.png` (not kept)). Gives no lane total and no type mix |
| **Waves, the beat** | HUD only | Beat chip: seconds, "+N" waiting, a fill bar, a lilac border in the last 3 s (`top.ts`, `.chip.beat.soon`). The chip's icon is **`i-hold`**, the Hold switch's icon | The field shows no beat. The release is units popping out with ordinary spawn motes. Two chips say "Wave" with different meanings (the 60 s "Wave 4 3:00" and the 20 s "Next wave") |
| **Waves, formation** | Implicitly | Units leave in ranks: the Bursters line up in a vertical wall (`rw-burst-4500-crop0.png` (not kept)) | Good: a wave *looks* like a wave once it's out |
| **Hold under waves** | Partly | Only the pennant stub at the rally line, since the wave stays inside (`drawRally`, `waves ? 7 : full height`) | Faint. The "+N" counts double instead |
| **Mixed-wave shields** | Yes | A pale blue ellipse bubble whose alpha falls with the shield (`shieldRing`), both sides. The player gets a "Mixed wave: shields up" callout | Clearly visible (`rw-mold-7m00-crop1.png` (not kept)). But a hit on a shield looks like any hit, and the shield breaking has no pop or sound. The bubble is never labelled except in the inspect panel ("+ N shield") |
| **Pinning** (ranged ×0.35 rate with an enemy within 1 tile) | **No** | `isPinned` is used only in `combat.ts`. The UI mentions it only in a ranged card's tooltip row (`buildingInfo.ts:75`) | Invisible. An archer simply fires less often |
| **Call for help** (5-tile radius) | **No** | Only `noteCall` in `combat.ts`. No UI reference anywhere | Invisible, and unexplained anywhere |
| **Spore clouds** (from bursts in `rework`) | Yes | Two soft discs in the owner's glow (alpha 0.14 / 0.22), 10 drifting spores, fading over the last quarter, clipped to the lane (`drawClouds`) | Good ([`rw-burst-5000-crop0.png`](screenshots/battle-feel/rw-burst-5000-crop0.png)). Clearly a cloud, and coloured by owner |
| **The Burster's burst** | Yes | A swelling pale puff to the burst radius with a ring and flung spores (effect 13, 480 ms) | Visible, but **silent** (no sound case for `burst`) |
| **Flyers** (Driftling) | Yes | Raised 8 native px over a dark oval shadow, bobbing 1 px, drawn after every ground unit (`drawUnit`, `flyerShadow`). Selection also picks the raised sprite | The sprite reads (white, spiky, over a purple core; `rw-mono-drift-3m-crop1.png` (not kept)). **What can hit it doesn't read:** the sparks are wrong (below), and a lobbed shell or burst passing under a flyer shows nothing |
| **Flyer damage rule C** (ground melee ×0.5) | **Misleading** | `classify()` uses `effMult` = matrix × tag. The flyer's `meleeMult` goes into `resist` and is left out (`combat.ts`). A Sporeling (slash) hitting a Driftling (light) is matrix ×1.5, classed "strong", so it shows a **gold strong spark** for an effective ×0.75 | The field contradicts the rule, and Help says "gold sparks mark strong hits" |
| **Rhizomorph, tunnelling** | Yes | A 16×6-px mound in `#5c4330` / `#7a5236` with 3 glow pixels and crumbs (`mound()`) | **Low contrast:** brown on brown soil, about the same colour and size as a stump ([`rw-mono-rhizo-2m-crop0.png`](screenshots/battle-feel/rw-mono-rhizo-2m-crop0.png)). Whose it is rests on 3 pixels |
| **Rhizomorph, surfacing** | No effect | `movement.ts` sets `burrowed = false`, with no event | It just appears beside an archer |
| **Storm grows waves** (×1.2 per stack) | HUD only | A row in the beat chip's tooltip | Not in the storm chip's tooltip, Help's Sporestorm tab or the storm tip. `waveCapped` (units lost to the cap) isn't shown anywhere |
| **Elder Sporeling without splash** | Text | `perkText` reads the content, so it should follow the preset | |

---

## 3. Feedback and juice inventory

### 3.1 Every sim event, and what it produces

From `renderer.ts` `onTick`, `battleView.ts` `onTick`, `battleSound.ts`, `tips.ts` and the event union in `src/sim/state.ts`.

| Event | Field effect | Sound | Callout / HUD |
|---|---|---|---|
| `spawned` | 5 spore motes, 320 ms | `spawn`: "very quiet", 220 ms cooldown, priority 1, thinned at 2×/3×, enemy at 50% | none |
| `hit` (unit or building) | Spark by effectiveness: gold 5×5 + 9-px cross (220 ms), white 3×3 (160 ms), gray 2×2 (140 ms). Optional damage numbers (off by default) | **none** | none (feeds the inspect DPS) |
| `hit` (Heartcap) | spark | `heartcap-hit` thud, at most once every 1.5 s per Heartcap; enemy's at 50% | **Your Heartcap only:** "Your Heartcap is under attack!" (at most once every 8 s). **No callout when you hit theirs.** Optional shake (off by default; 3 px max, 180 ms) |
| `died` | 10 spore motes, 420 ms | **none** | none |
| `knitStart` | Tethers, glow, a ring closing over the trio (drawn from state) | `knit` shimmer, 500 ms cooldown | none |
| `knitCancel` | none | none | none |
| `merged` | "BLOOMED!" / "ELDER!" pixel text rising, with a 12-dot burst ring (1100 ms, both sides) | `merge` / `merge-elder` | Callout for each player merge, and for every Elder of either side ("Bloomed Sporeling!") |
| `columnFlipped` | Mat re-bakes (instant) | `column-gained` (rising chime) / `column-lost` | "Column N claimed / lost" |
| `buildingPlaced` | **none** (no puff or landing) | `place` squelch | none |
| `buildingDestroyed` | Rubble: 8 brown squares falling and fading, 600 ms | `building-lost` / `building-razed` | "X lost" / "Enemy X destroyed" |
| `buildingSold` | none | `sell` pop | none |
| `income` | Coin pop "+N" over each economy building that paid (enemy's at half opacity) | `income` tink (player) | Gold chip bump (0.45 s scale to 1.1) |
| `interest` | **none** | **none** | A tip the first time only |
| `wave` (60 s) | none | `wave`, "a soft low pulse" | none (the chip counts) |
| `release` (20 s beat) | spawn motes only | **none** | "Mixed wave: shields up" (player, shielded lanes only) |
| `waveCapped` | none | none | none |
| `sporestorm` | Haze +2.5% alpha per stack (12.5% at 5) and 14 white specks per stack; thicker spores in the frame | `sporestorm` wind and rumble | "The Sporestorm thickens (n)", a first-time tip, storm chip lit |
| `burst` | Effect 13 puff | **none** | none |
| `healed` | Green plus rising, 450 ms | none | none |
| `power` | Lilac ring sweeping to the radius with spores at its edge (520 ms) | Reused: burst → `building-razed`, tithe → `income`, surge → `column-gained`, bloom → `merge-elder` | "Spore Burst hit 7 targets!" |
| `counterWarned` / `counterActive` | none | `counter-warn` swell / `counter-active` boom (priority 9) | Callout, plus the Intent panel's warning row with pulsing pips |
| `stance` | Rally line or pennant (from state) | none | "Wave kept home …" (player auto) / "The Gray Rot advances" (enemy; under waves the AI never holds) |
| `heartcapBreach` (Step B prototype, not in `rework`) | Ring | none | "Enemy Heartcap breached (66%)!" |
| `begin` | none | `begin` thrum | "The battle begins", plus the general's "remembers" line |
| `draftOpen` / `drafted` | Overlay, spore burst behind the cards | `draft-open` / `draft-pick` | Draft overlay |
| `ended` | none on the field | `win` arpeggio / `loss` descent | The report arrives **immediately** behind a 360-ms spore wipe (`battleView.frame`: `sporeWipe` on the first frame with `phase === 'ended'`) |

**Ambient:**

- Brown-noise drone plus random drips every 2.5–9 s (`data/sounds.json` `ambient`). No music anywhere.
- Spores drift in the frame, thicker per storm stack.
- Buildings idle on 2 frames at 600 ms each. Units walk on 2 frames at 4 fps and show an attack frame for 6 ticks after a swing.
- Turrets are a static sprite firing 2-px gold dots.

### 3.2 Inventory against what auto-battlers and lane battlers usually have

| Juice | Common in the genre (examples) | Here | Note |
|---|---|---|---|
| Impact sparks tinted by effect | Common | **Yes** (3 tints) | Good teaching device, but wrong for flyers (§2.6) |
| Hit flash on the struck sprite (a white frame) | Most action and auto games | **No** | Units and buildings never flash. Only HP bars move |
| Hit-stop / a micro-freeze on big hits | Brawlers; Vlambeer's "sleep" (secondhand recreations put it at 10–20 ms per hit) | **No** | Can be render-only: scale `dt` in `GameLoop.frame` (`loop.ts`). The sim and its hashes are untouched |
| Knockback / recoil | Very common | No | It would be a sim change (positions are sim state). Out of lane |
| Permanence (corpses, scorch marks, rubble that stays) | Vlambeer's "permanence" tip | **No** | Death motes fade in 420 ms and rubble in 600 ms, so the field forgets every fight. A render-only scar layer (a dark spore stain where units died, fading over 30–60 s) would show where the fighting was |
| Screen shake | Common, usually optional | Optional, **off by default**, Heartcap hits only | Fine as an accessibility default. Big moments then need another carrier |
| Slow-motion finish | Fighting games, many roguelites | **No** | The killing blow goes straight to the wipe |
| Big-moment announcer banners | Plants vs. Zombies' "A huge wave of zombies is approaching" and "Final wave", with flags on a level progress bar; Clash Royale's overtime and tower-down beats; MOBA kill announcers | Partial. The callout lane is a 30-px strip of small chips that look alike; merges take as much room as a counter | No styling for a *big* moment, and no centre-field banner |
| Wave or round preview | Thronefall added enemy wave previews in its 1.0 quality-of-life pass; TD games show the next wave | **No** for the enemy's wave. Only your own "+N" in the chip | The rework made waves the unit of play, so this is the natural next HUD item |
| Risk/reward timing on waves | Kingdom Rush: call the next wave early for bonus gold and shorter spell cooldowns | **No** | Hold under waves is the inverse (delay). See G6 |
| Combat audio (hits, deaths, shots) | Universal | **No** (Heartcap thud only) | §17 #18 said "no audio"; sound was later built for events only |
| Music or an adaptive score | Universal | **No** | A drone and drips. The storm could drive intensity layers |
| Clash or round result | TFT's post-combat damage readout; Mechabellum's round summary | **No** in battle; the report only | Under waves each clash is a natural round |
| Kill or merge streaks | TFT streak badges; MOBA multi-kills | No | "ELDER!" is the only celebrated personal moment |
| Camera / zoom / focus | Many lane games have none (Clash Royale, PvZ) | None (§13.6: "no camera") | With a strip field, an event zoom or a fight inset is the only route to bigger units |
| Damage numbers | Common in auto-battlers | Off by default (setting) | Matches §10.4's clean field |
| Spawn and death puffs | Common | Yes (spores) | |
| Income feedback | Coins, counters | **Yes** (coin pops, bump, tink) | One of the best-fed loops in the game, oddly better fed than combat |

### 3.3 Callout-lane load

- **Capacity:** 3 at once, 2.5 s each (tips 6–8 s). Priority: counter > building lost > Heartcap > refused > tip > column > merge > info (`callouts.ts`).
- **Merge spam:** under the package, merges run at 49–119 a battle (both sides; Cordis 90–119). Every player merge and every Elder pushes a callout, so "Bloomed Sporeling!" sits in the lane most of the time. It's there in 4 of my 6 mid-battle shots: 3:00, 7:00, 7:47 and the 5:00 two-lane shot. It adds nothing that the field's "BLOOMED!" label and the merge sound don't already say.
- **Field labels:** "BLOOMED!" labels from *both* sides stack and overlap at the enemy's buildings (`rw-mold-5m00.png` (not kept), [`rw-mold-7m00-crop0.png`](screenshots/battle-feel/rw-mold-7m00-crop0.png)). That works against §10.4's "clean field".
- **Missing:**
  - you are hitting their Heartcap;
  - their Heartcap is below ⅔ or ⅓;
  - a clash was won or lost;
  - the storm is at full;
  - one minute to the Decision (9:00);
  - your archers are pinned;
  - a flyer wave is coming;
  - their next wave is shielded.

### 3.4 HUD layout bug introduced by the rework

- At 1280×720 under `rework`, the chips row (gold, supply, wave, **beat**, storm, relics) is 578 px wide in a 544-px column. It overflows by 34 px.
- The relics chip ends at x 790, the middle column at 756, and the "GRAY ROT HEARTCAP" label starts at 768, so they overlap by 22 px. It's visible in every 1280 shot ("0 ↑ 0 R" over "GRAY ROT").
- The beat chip (`top.ts`, added only under `waves`) is what pushes it over.

### 3.5 The minute marks stack everything on one tick

- The beat is 400 ticks and a minute is 1200, so every third release lands on the minute.
- At 2:00, 4:00, 6:00 and 8:00, one tick carries: a release, interest, a draft that **holds the sim**, and (from 4:00) a storm stack that also grows the wave. At 2:00 and 5:00 the general's read comes too.
- So the player picks a card while their wave stands frozen at the door, and the release they built up to happens behind a scrim.
- Meanwhile the beats at :20 and :40 carry nothing but the release.

That's a pacing choice, not a bug, but it buries the most legible moment under the least legible one (a modal).

---

## 4. Learning

### 4.1 What exists

- **First-time tips** (`tips.ts`; battles 1–2 of a run, once ever, 8 s each, one at a time):
  - frontier (0:06), Hold (0:50), first draft, Sporestorm (first stack), interest (first payout), commander power (first ready);
  - plus the battle-1 economy nudge at 0:30 (not remembered).
- **Help** (`help.ts`, six tabs): Matrix (with tags siege, slayer, splash/cleave, ranged), Merging (with your roster's perks), The general, Economy, Sporestorm, Keys.
- **Chip tooltips** (`explain.ts`): gold, supply, wave, storm, territory, and under `waves` the beat chip. That one is the only place the wave rules are written out together, and it does it well (`rw-beat-tip.png` (not kept)).
- **Card tooltips** (`buildingInfo.ts`) carry the rework rows: Waves, Mixed wave, Flying / Flyers, Burrows, Bursts, Spore cloud, Pinned (ranged only), Cleave.
  - Waves and Mixed wave are repeated on *every* spawner card, so the Drift Stalk's tooltip has 15 rows (`rw-card-tip.png` (not kept)).
- **Inspect:** shield amount, flying, tunnelling status, merge status.

### 4.2 Rework coverage

| Rule | Tip | Help | Tooltip | Field | Gap |
|---|---|---|---|---|---|
| The 20 s beat | — | — | Beat chip (good), card row | — (no sound, no pulse) | No first-release tip, no Help tab, Hold's icon on the chip, the "Wave" name used twice |
| Hold under waves | Old Hold tip ("hold your units back for a bigger push") | **Keys tab: "a hold lasts up to 30 s" (wrong under waves)** | Hold button title (correct), beat chip foot | Pennant only | Help text is stale |
| Mixed-wave shields | — | — | Beat chip, card rows | Bubble | The bubble is never named on the field; the only label is the callout on release |
| Pinning | — | — | Ranged card row only | — | Invisible and almost untaught |
| Call for help | — | — | — | — | **Untaught anywhere** |
| Flyers and rule C | — | — | Card rows; inspect "Flying" / "Flyers" row (`versusFlyers`) | Sprite and shadow; **sparks contradict it** | P3 asks exactly this. Only per-card tooltips answer it |
| Mortar and bursts can't hit flyers | — | — | Mortar card row | — | No miss cue |
| Rhizomorph | — | — | Card row, inspect status | Low-contrast mound | No "enemy tunnellers" warning or tip |
| Burster and clouds | — | — | Card rows | Puff and cloud (no sound) | OK visually |
| Storm grows waves | — | **Sporestorm tab: no** | **Storm chip tip: no**; beat chip: yes | The release just gets bigger | The storm's biggest new effect sits on the wrong chip |
| Elder Sporeling loses splash | — | Merging roster (follows the content) | Card perk rows | — | Probably fine |

**Small inconsistencies:**

- The Help Keys tab lists `1`–`8` for buildings, but the tray hotkeys run `1`–`9`.
- The Matrix tab's tag list has no burrow, burst, flying or pinned entries.
- Canvas glyphs ("⬢!", "½") still use Unicode in a 9-px system monospace, which ui-ux-plan A3 moved away from in the DOM.

### 4.3 What players already said

- Round 3's headline was "too much to learn" (F8).
- The rework adds about eight rules: beat, Hold-under-waves, shields, pinning, calls, flyers, burrowers, Burster clouds, plus storm-grows-waves. Today almost all of them are taught through hover tooltips, the very channel round 3 said wasn't enough on its own.
- Onboarding beyond tips (a tutorial battle) is open and waits on the user.

---

## 5. Gaps that hurt fun, ranked

The ranking weighs how often the player meets the gap, how much it costs the fantasy ("my army, my moment") and how directly it bears on the P3 questions. "Render-only" means no `src/sim` change and no golden refresh.

### G1. The beat has no presence (high; render, audio and UI only)

- **Evidence:**
  - No `release` sound case in `battleSound.ts`. `data/sounds.json` has `wave` (60 s, "a soft low pulse") but nothing for the 20 s beat.
  - Releases fire `spawned` for the whole wave on one tick, and the `spawn` sound's 220-ms cooldown collapses it to one quiet puff.
  - Nothing on the field marks the beat. The beat chip uses the Hold icon.
  - The enemy's coming wave is shown only as "+N" over each of their buildings.
  - Under the package, battles run longer and bigger (supply at 5:00 is 33–48 against 21–31 today), and the field is emptiest *between* beats, since units wait inside.
- **Why it matters:**
  - The combat rework doc sells waves partly because they give battles "a readable pulse". The P3 question is whether waves "give a battle rhythm, or make it feel less alive". Without an audible and visible beat, the rhythm exists only in the sim.
  - The first 20 s of every battle now show an empty field (nothing leaves before 0:20).
- **Fix:**
  - A beat sound, e.g. a low drum with the enemy's answering it at `enemyGain`.
  - A count-in tick at 3, 2, 1. The chip already has its `soon` state.
  - On release, a short field pulse from each side's front spawner: a lilac or ash ripple down the lane, effect 12 or 13 restyled.
  - Show the enemy's waiting total, and its type count and shield, in the beat chip and its tooltip ("Next wave 0:12 · you 14 (3 types, shielded) · them 11").
  - Give the chip its own icon (`i-wave`, or a new drum or pulse icon).
  - Consider renaming the 60 s chip, e.g. "Minute 4 · 3:00", or making the beat count the "wave" the HUD shows. Today both are called waves.
- **Files:** `src/app/battleSound.ts`, `data/sounds.json` (plus `REQUIRED_SOUNDS` in the registry), `src/render/renderer.ts` (`onTick`: `release`), `src/ui/hud/top.ts`, `src/ui/hud/explain.ts` (`beatTip`, `waitingUnits` for the enemy), `data/sprites/ui.json` for an icon.

### G2. The finish has no moment, and the winning side gets no feedback (high; render and UI only)

- **Evidence:**
  - Seed 7: the enemy Heartcap went 2000 → 0 in about 12 s while the tug read 21 to 11 (§2.5).
  - Under the package, a falling Heartcap dies 5–10 s after reaching ⅔, and the winner's is untouched in 360 of 360 battles.
  - `battleView.onTick` raises "Your Heartcap is under attack!" only for target −1. Hits on the enemy's (−2) get a 50% thud and nothing else.
  - The in-field Heartcap is baked into the terrain once (`bakeTerrain`) and never changes.
  - The report is wiped in on the first `ended` frame.
- **Why it matters:**
  - Winning should be the best 5 seconds of the battle. Today it's a number falling in the corner, then a menu.
  - Losing is just as abrupt. The engagement review called the cliff "no siege phase and no last stand". The sim side of that is the Step B breach prototype (other reviews); the presentation side is here.
- **Fix:**
  - Callouts in both directions: "Their Heartcap is under attack!", then "cracking" at ⅔ and "falling" at ⅓.
  - Heartcap damage stages drawn over the baked strip: cracks, a wilting cap, spores leaking. Hit-flash the strip, and pulse the top-band HP block on each hit (`.heart` gets a bump like the gold chip).
  - On the killing blow: a render-only slow-motion of about 1.5 s. `GameLoop.frame` multiplies `dt` by a time scale the view sets; the sim stays deterministic.
  - Then the Heartcap bursts into spores (or wilts to ash), the win or loss sound, and the report after about 1.2 s instead of at once.
  - Shake on the final blow even when shake is off is a judgment call. Keep it off and lean on slow-mo and flash.
- **Files:** `src/app/battleView.ts` (`onTick`, `frame`'s `ended` branch), `src/app/loop.ts` (time scale), `src/render/renderer.ts` (Heartcap overlay and damage stages), `src/ui/hud/top.ts` and `styles.css` (hit pulse), `data/sprites/heartcap.json` (crack frames), `data/sounds.json` (a Heartcap-falls sound).
- **Tie-in:** if the breach prototype is adopted, its ⅔ and ⅓ events are the natural triggers. Without it, the UI can compute the thresholds from `heartcapHp`.

### G3. The rework's rules are invisible or misdrawn on the field (high for P3; mostly render-only)

- **Evidence (§2.6):**
  - Pinning and call for help: no visual.
  - Flyer melee ×0.5 shows the matrix spark, so a slash-on-light hit is gold "strong" at ×0.75 effective (`combat.ts` `classify(effMult)` leaves out `resist`).
  - A lobbed shell or burst can't touch a flyer, and nothing shows it.
  - Shield hits look like normal hits, and shields break silently.
  - The Rhizomorph mound is brown on brown and surfaces without an effect.
  - Bursts are silent.
- **Why it matters:**
  - P3's fourth question asks exactly whether these read and whether you can tell what hits a flyer.
  - A rule the player can't see feels like randomness ("why did my archers lose?"). It undercuts the counter-play the rework exists to create (pillar 3, "the general adapts", and G3's "every mono build has an answer").
- **Fix:**
  - **Flyer sparks:** reclassify render-side. In `Renderer.onTick`, when the target is a flying unit and the source is a ground melee unit, step the tint down one class. A sim-side fix (folding `resist` into `classify`) would change the event's `eff` field; events aren't part of the state hash, but check before choosing it.
  - **Pinned:** a small mark over a pinned ranged unit, e.g. a 3-px crossed-arrows or knot glyph, or a desaturated attack frame. The renderer can call the same `isPinned` helper the inspect panel could use. Add "Pinned: attacks at ×0.35" to the inspect status.
  - **Calls:** a brief "!" over each unit that turns on an attacker. It needs either a sim event (a `called` event; events aren't hashed, but this is a sim edit) or a render-side guess from target changes. The cheaper first step is to teach it (G7).
  - **Shields:** a pale blue spark and a "pop" ring when a shield breaks. Diff `u.shield` per unit between ticks, render-side.
  - **Flyer misses:** a lobbed shell landing under a flyer draws a small "whiff" puff at the flyer's shadow.
  - **Rhizomorph:** raise the mound's contrast. A dark outline is already there; add a side-coloured rim and a faint trail of cracked soil in the side's glow. Add a surfacing burst of earth when `burrowed` turns false (renderer diffs per id).
  - **Burster:** a burst sound.
- **Files:** `src/render/renderer.ts`, `src/render/effects.ts` (new effect kinds), `src/app/battleSound.ts`, `data/sounds.json`, `src/ui/inspect.ts`. Optionally `src/sim/systems/combat.ts` for the honest `eff` (not hashed; still a sim file).

### G4. The field is small and the big fights are illegible (medium-high; render and layout)

- **Evidence:**
  - The field is 35.6% of the window height at both 1280×720 and 1920×1080, with 24–28-px units at 1280 (§2.1).
  - Late fights pile into clumps that can't be counted, on the busy Rot mat, under overlapping "BLOOMED!" labels from both sides ([`rw-mold-7m00-crop0.png`](screenshots/battle-feel/rw-mold-7m00-crop0.png), `rw-mold-7m00-crop1.png` (not kept)).
  - Loam tiles out-contrast the units.
  - The mat is drawn at alpha 0.42 with bright strands under every unit.
  - Ground units have no shadow.
- **Why it matters:** the auto-battler half of the game is watching. The engagement review already flagged "the watching half … is hard to read", and the rework makes armies 30–75% bigger at 5:00.
- **Fix:**
  - **Cheap:**
    - A dark ground shadow under every unit (the flyer shadow, smaller). The colour-blind team mark stays optional.
    - Fade the mat texture to near-flat inside the frontier band where fights happen, or drop the Rot tufts' contrast.
    - Darken the loam base, or make its flecks dimmer than units.
    - Show "BLOOMED!" only for the player's merges and every Elder; drop enemy Bloomed labels.
    - Cap labels at one per tile area.
  - **Bigger, needs a SPEC §13.6 decision ("No camera"):**
    - an event focus that eases the field scale toward the fight (1280 can take about 2.19× fractional);
    - or a "fight cam" inset in the roots ceiling showing the hottest clash at 4×. It's render-only: a second `drawImage` of a region of the field canvas, the way my capture script cropped.
- **Files:** `src/render/renderer.ts` (`drawUnit`, `matTile` alpha, loam sprite in `data/sprites/terrain.json`), `src/render/effects.ts` (label policy), `src/app/battleView.ts` (`fit`, inset), SPEC §13.6 and §10.4.

### G5. Combat is silent, and there's no music (medium-high; audio only)

- **Evidence:**
  - 30 sounds in `data/sounds.json`. None plays for a unit hit, a death, a ranged shot, a burst, a shield, a release or interest.
  - `battleSound.ts` handles `hit` only for Heartcaps.
  - The ambient bed is a brown-noise drone and drips.
  - The engagement review's recommendation 7 ("reconsider SFX; they're cheap fun for an auto-battler") was taken for events, not for combat.
- **Why it matters:**
  - A battle with 40–90 units at 5:00 sounds the same as an empty field.
  - Sound is how auto-battlers sell impact without cluttering the screen, and §10.4 wants a clean field.
- **Fix:**
  - A "battle din" bus: a looping layered texture whose gain follows the number of hits per second (thinned at 2×/3× like `frequent`).
  - Sparse accent sounds for strong hits only, and a soft pop for deaths (`frequent`, cooldown about 120 ms, priority 1).
  - Distinct power sounds instead of the four reused event sounds.
  - Music: a light layered score whose intensity follows storm stacks and the tug (a stinger on Elder births, wave-clash wins and the storm), ducked by the `sporestorm` and `counter` sounds.
  - SPEC §17 #18 ("audio of any kind" out of scope) is already stale and should be updated whichever way this goes.
- **Files:** `data/sounds.json`, `src/app/battleSound.ts`, `src/audio/` (a looped-layer mode, if the engine lacks one), SPEC §13.9 and §17.

### G6. Few decisions, and the beat asks nothing of the player (medium; mostly rules, so flagged for the reconciler)

- **Evidence:**
  - Bot commands per minute fall under `rework` (2.6–3.7 → 1.8–2.8).
  - Placing is gated by +96/min early income.
  - Hold under waves is a binary "keep it home?" at most every other beat.
  - The draft at the minute freezes the field at the release (§3.5).
- **Fix within this lane:** make the beat a prompt.
  - At T−3 s, show the Hold choice for each lane beside the beat chip ("Send 14 / Hold → 28").
  - Show the enemy's next wave so the choice is informed (G1).
- **Rules ideas for the other reviews** (not render-only):
  - a Kingdom-Rush-style "send early" for a small bonus;
  - a lane choice for the wave on two-lane maps;
  - opening drafts half a beat after a release instead of on it.
- **Files (UI part):** `src/app/battleView.ts` (stance rows), `src/ui/hud/top.ts`.

### G7. The rework is untaught outside tooltips (medium; UI only)

- **Evidence (§4.2):**
  - No Help tab. No tips for the beat, shields, flyers, pinning, burrowing or Bursters.
  - Call for help is explained nowhere.
  - Storm-grows-waves appears only in the beat tooltip.
  - Help says a hold lasts 30 s; under waves it lasts one beat.
  - Every spawner tooltip repeats the global wave rows (15 rows on the Drift Stalk).
- **Why it matters:**
  - F8 ("too much to learn") is the standing complaint, and the rework adds about eight rules.
  - The playtest can't separate "the rule is bad" from "I didn't know the rule".
- **Fix:**
  - A "Waves" Help tab (or "Combat rework" while it's a prototype), read from `state.rules` like the others: the beat, Hold under waves, shields, pinning, calls, flyers and who hits them (a small table drawn from `versusFlyers`), burrowers, Burster clouds.
  - First-time tips on first occurrence:
    - first release: "Waves leave every 20 s, together. Watch the chip";
    - first shielded wave of yours: "2+ unit types in a lane → shields";
    - first pin of your archer: "Archers next to an enemy fire at a third of their speed";
    - first enemy flyer;
    - first enemy mound;
    - first Burster cloud.
  - Fix the Help Keys text for Hold under waves, and `1`–`8` → `1`–`9`.
  - Add stormWaves to the storm tooltip and Help's storm table.
  - Move the repeated wave rows off the card tooltips into one line ("Waves: see the beat chip").
- **Files:** `src/ui/help.ts`, `src/app/tips.ts` (new `TipId`s; storage keys unchanged, since tips are kept in the same record by id), `src/ui/hud/explain.ts` (`stormTip`), `src/ui/buildingInfo.ts`.

### G8. Nobody can tell who's ahead, and clashes have no result (medium; UI only)

- **Evidence:**
  - §2.5: the tug is static for 2–4 minutes and lags the collapse.
  - The enemy's supply is hidden.
  - No clash summary.
  - The report is the only place you learn what happened.
- **Fix:**
  - **Army strength:** an "on the field" comparison under the tug, both sides' supply on the field. All of it is visible on the field anyway, so it's fair under §7.1's honest opponent.
  - **Clash results** from units' `wave` field (render-side): when one side's wave n in a lane is wiped out, show "Clash won · 9 left" or "Clash lost". A clean sweep earns a bigger banner. That's the kill-streak analogue for this game.
  - **Momentum:** a small arrow on the tug showing column change over the last 30 s.
- **Files:** `src/ui/hud/top.ts`, `src/app/battleView.ts`, `src/ui/callouts.ts` (a new `clash` kind and priority).

### G9. Callout-lane noise, and no big-moment tier (medium; UI only)

- **Evidence:**
  - Merges at 49–119 a battle. "Bloomed X!" is in the lane in most mid-battle shots (§3.3).
  - Every callout is the same 13-px chip in a 30-px lane.
  - Counter warnings, Heartcap alarms and merges look alike.
- **Fix:**
  - Drop the player's Bloomed callouts; keep Elder.
  - Add a "moment" tier: a larger centred banner over the field's top edge for 1.5 s, at most one at a time, never more than every ~10 s. Use it for counter active, Heartcap ⅔ and ⅓ (both sides), clash sweeps, storm at full and "1:00 to the Decision".
  - Respect reduced motion.
- **Files:** `src/ui/callouts.ts`, `src/app/battleView.ts`, `styles.css`.

### G10. HUD overflow under `rework` (low, but visible in every 1280 shot; UI only)

- **Evidence:** §3.4. The chips row is 578 px in a 544-px column, and the relics chip overlaps the "GRAY ROT HEARTCAP" label by 22 px.
- **Fix:**
  - Fold the beat into the wave chip ("Wave 4 · next 0:12 +3").
  - Or shrink the relics chip to an icon at 1280.
  - Add a `hud.test.ts` case under `proto=rework`.
- **Files:** `src/ui/hud/top.ts`, `src/ui/styles.css`, `tests/browser/hud.test.ts`.

### G11. Player actions land without a beat (low; render only)

- **Evidence:**
  - Placing has a sound but no landing puff on the field.
  - Interest pays with no coin or sound.
  - A drafted upgrade doesn't touch the buildings it improves.
  - The power has one generic ring for four different powers.
  - No permanence: death motes fade in 420 ms and rubble in 600 ms.
- **Fix:**
  - A spore-burst landing on `buildingPlaced`.
  - An interest coin shower over your Heartcap at the minute, with a sound.
  - A glow pass over the upgraded buildings after a pick.
  - Per-power effects: tithe coins rising from held columns, surge hyphae racing to the next column, bloom threads.
  - A fading spore-stain layer where units die.
- **Files:** `src/render/renderer.ts`, `src/render/effects.ts`, `src/app/battleSound.ts`.

### G12. The quiet opening is back under `rework` (medium; mostly rules, noted for the reconciler)

- **Evidence:**
  - Nothing leaves before 0:20.
  - The first flip is at 1:04–3:22 under the package, against 0:34–1:40 today.
  - Hold was adopted precisely because it fixed the quiet opening (E1: 0:34–1:29).
- **In this lane:** G1's beat presence and G8's clash results give the opening something to watch.
- **Rules levers** (hot start, faster first beat) belong to the other reviews; Step B's `hotstart` prototype exists and is untested by a human.

---

## 6. Suggested order

1. **Before the playtest, if there's time** (UI and render only, hours each):
   - G10 (the overlap);
   - G7's stale Help text (Hold, `1`–`9`);
   - G3's flyer spark tint.

   These keep the playtest from measuring confusion the build causes itself.
2. **Playtest notes to add for P3** (in `docs/playtest-feedback.md` style):
   - Did you notice when waves left?
   - Did you know why your archers slowed?
   - Did you see what hit your flyers?
   - Did you know you were winning before the Heartcap fell?
   - What was the best moment of the battle?
3. **After P3, whatever is adopted:**
   - G1 and G2 first. They're the rework's rhythm and its payoff, both render, audio and UI only.
   - Then G3, G5, G7, G8 and G9.
   - G4's camera question goes to the user, since it reverses §13.6.
4. **Spec housekeeping:**
   - §17 #18 (audio out of scope) and #20 (no animations beyond 2-frame cycles) are stale or will block juice. Decide them explicitly.
   - §10.4 should gain rules for what each rework mechanic looks like on the field, once adopted.

None of 1–3 touches `src/sim` except two optional sim edits: an honest `eff` for flyer hits, and a `called` event for call for help. Both change events, not state. Confirm against `hashState` before choosing them.

---

## Sources

- **Game feel:**
  - Jan Willem Nijman (Vlambeer), "The Art of Screenshake", via secondhand breakdowns: [dkliao's recreation devlog](https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog/451576/quick-breakdown-of-all-the-effects), [infovore.org on game feel](https://infovore.org/?p=5275).
  - [Hitstop, camera shake and knockback in UE5](https://uhiyama-lab.com/en/notes/ue/game-feel-hit-feedback/).
- **Lane and wave games:**
  - Plants vs. Zombies flag waves, the progress bar and "Final wave": [Flag Zombie (PvZ wiki)](https://plantsvszombies.fandom.com/wiki/Flag_Zombie_(PvZ)), [Level 3-4](https://plantsvszombies.wiki.gg/wiki/Level_3-4).
  - Kingdom Rush's early wave call: [Kingdom Rush walkthrough guide](https://ayumilove.net/kingdom-rush-walkthrough-guide/), [Kingdom Rush Gold (wiki)](https://kingdomrushtd.fandom.com/wiki/Gold), [Kingdom Rush Origins discussion](https://steamcommunity.com/app/816340/discussions/0/1734342161871096889).
  - Thronefall's enemy wave previews in 1.0: [PCGamesN](https://www.pcgamesn.com/thronefall/full-version-launch).
  - Clash Royale's overtime, elixir phases and King Tower activation: [Supercell release notes](https://supercell.com/en/games/clashroyale/blog/release-notes/november-update), [Clash Royale (Wikipedia)](https://en.wikipedia.org/wiki/Clash_Royale).
- **Project:** `docs/engagement-review.md`; `docs/balance-backlog.md` (sections "`rework`: G4, engagement and runs" and "Combat rework P2 → Engagement and runs"); `docs/ideas/combat-rework.md` (P3); `docs/ui-ux-plan.md`; `docs/playtest-feedback.md`; SPEC §4, §5.2, §6, §10, §13.6, §13.9, §17.
- **Screenshots and probes:** the PNGs kept are in [screenshots/battle-feel/](screenshots/battle-feel/), made by [`shoot.mjs`](scripts/screenshots/shoot.mjs) and [`probe.mjs`](scripts/screenshots/probe.mjs).
