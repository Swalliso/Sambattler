# Playtest report: a newcomer's first runs on `develop` with `?proto=rework`

Evidence for [After the combat rework](../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): the newcomer's playthrough. Written by an agent playing the dev site during that review; nothing here is adopted. Recovered from the session transcript, so the screenshots it mentions are kept only where linked ([screenshots/newcomer/](screenshots/newcomer/)); its driver scripts are in [scripts/playtest/newcomer/](scripts/playtest/newcomer/).

Played on the deployed dev site, `https://swalliso.github.io/Sambattler/dev/?proto=rework&debug=1` (DEV BUILD ef2e133), in headless Chromium at 1440×900 driven by Playwright over CDP. All screenshots were in the session's scratch folder (below, `SS/<name>.png` means that folder). The ones kept are linked, from [screenshots/newcomer/](screenshots/newcomer/), and the rest are marked "(not kept)". Game times come from `window.__GAME__.battle().tick / 20`.

## What I played

| # | Run / node | Map, general | Speed | Result | Length | Storm at end |
|---|---|---|---|---|---|---|
| 1 | Run 1, battle 1 | Stumpfield (1 lane), Old Mother Mold | 1× to 7:17, then 2× | **Lost by Rout. The run ended** | 8:56 | 5 |
| 2 | Run 2, battle 1 | Stumpfield, The Lichen Baron | 2× | Won by Rout | 8:34 | 5 |
| 3 | Run 2, battle 2 | Twin Roots (2 lanes), Old Mother Mold | 1×, then 2× | Won by Rout | 8:55 | 5 |
| 4 | Run 2, battle 3 | Bogwater Hollow, The Blightwright | 3× | Won by Rout | 6:45 | 3 |
| 5 | Run 2, row 4–5 | Event (Fallen Oak), then Bogwater Hollow, The Blightwright | 3× | Won by Rout | 4:09 | 1 |

Between battles I saw: the commander screen and Bans tab, the route map (twice per run), three spoils screens, a battle report after every battle, a run summary (the defeat), and an Event with its result screen. Commander: Vesper Velvetcap both runs (the card labelled "THE STARTER", which is what a newcomer picks).

**How a bot limits this read.** I can't see motion, hear sound, or feel tension live. I paused (Space) between steps far more than a human would, stepping 3–20 s of wall time at a time and reading screenshots in between. Aiming the power and placing buildings went by pixel coordinates, so a few clicks missed for reasons a human wouldn't hit (one placement overlapped a building). At 2× and 3× I saw fights only in snapshots, so I may have missed what decided some clashes. With `debug=1` the F3 overlay (unit ids, presence numbers) turns on by default in every new battle; I turned it off each time so the field looked like a player's. I played run 2 at 2–3× to get through several battles. That compresses the dead time I describe below, so the waiting is worse at 1×, which is what a newcomer plays.

---

## 1. Timeline

### Before the first battle (title, Help, commander, route)

- **Title** (`SS/01-title.png` (not kept)): clean. "New run / How to play / Settings". No sign that the prototype is on (only the tab title says `[proto rework]`).
- **How to play** (`SS/02-help.png` (not kept), `SS/03-help-keys.png` (not kept)). A newcomer opens this first and gets **a damage-vs-armor spreadsheet** as the first tab. The tabs are Matrix · Merging · The general · Economy · Sporestorm · Keys.
  - **Nothing in Help describes any rework rule:** waves on a 20 s beat, mixed-wave shields, pinning, call for help, flyers, spore clouds, burrowing. A grep of `src/ui/help.ts` finds no `waves`, `shield`, `flyer`, `burrow` or `pin`. The Merging tab does list Rhizomorph, Burster and Driftling in its unit table, with tags `burrow`, `burst` and `flying` that are never explained.
  - The Economy tab says interest pays "every 1:00, as a new wave starts". Under `rework` a "wave" is also the 20 s march, so the word means two things (see F-7).
  - The Sporestorm tab doesn't say that under `rework` each stack also grows waves by 20% (×2 at five stacks), and in my battles that rule decided the ending.
- **Commander screen** (`SS/04-new-run.png` (not kept)): good. Each card shows the passive, the power (Q) and the starter kit, plus a tip. None of the rework's buildings (Burster Pod, Drift Stalk, Rhizomorph Tunnel) is in any starter kit, so a newcomer meets them only in drafts or from the enemy. The Bans tab (`SS/71-bans.png` (not kept)) lists them.
- **Route** (`SS/05-route.png` (not kept)): 5 rows of nodes, then the Boss. Battles, Event, Grove and Elites (with the extra reward shown). It reads well. Every node links to every node in the next row (F10, known).

### Battle 1, run 1: Stumpfield vs Old Mother Mold (1×, the newcomer case)

Deploy: 300 gold. The beat chip ("20s") and the Wave chip ("Wave 0 0:00") sit side by side. The beat chip's tooltip ([`SS/07-beat-tooltip.png`](screenshots/newcomer/07-beat-tooltip.png)) explains waves, shields and Hold well. The Wave chip's tooltip (`SS/07b-wave-tooltip.png` (not kept)) says "A new wave starts every 1:00". So two chips, both called a wave, on different clocks.

**Opener:** Truffle Cellar plus Sporeling Burrow (260). I followed the tray: economy comes first, and the tip says to build one early. The enemy opened with **two Sporeling Burrows and no economy**, and had a third by 0:22.

| Minute | What happened | What I was deciding |
|---|---|---|
| **0:00–1:00** | **Nothing appears on the field for 20 s**: spawns wait inside until the 0:20 beat (`SS/10-b1-0006.png` (not kept), `SS/11-b1-0016.png` (not kept)). First clash at about 0:28 (`SS/13-b1-0029.png` (not kept)): my 2 Sporelings against their 4, mine dead by 0:36. At 0:36 I bought a second Burrow (my first try overlapped a building and silently failed). Placing while paused shows a translucent pending building, which is good (`SS/17-paused-queued-place.png` (not kept)). At 0:50 the "Spore Burst is ready" tip; I fired it, "hit 5 targets!" (`SS/18` (not kept), `SS/20` (not kept)). | 0:00 opener (2 picks). 0:36 one building. 0:50 power. **0:06–0:36: nothing to decide** (52 gold, income +144/min). |
| **1:00–2:00** | 1:05 interest tip (+3). I pressed **F (Hold)** because the tip said to hold for a bigger push. My unit already on the field kept fighting alone. Meanwhile **3 enemy Sporelings chewed my Burrow (450 → 238 HP) while 6 of my units sat inside the buildings** waiting for the beat (`SS/24-b1-0122.png` (not kept), "+6" on the beat chip). F at 1:26 did nothing: the hold was on cooldown, with no feedback. The label reads "Keeping the …" (truncated). At 1:32 I tried a Capguard Hall: 149 of 150 gold, a silent fail. Placed at 1:41. At 1:50 "Elder Sporeling!": a merge cascade felt good (`SS/28-b1-0151.png` (not kept)). | Hold (1). Capguard (1). Otherwise waiting. |
| **2:00–3:00** | At 2:00 **three banners at once**: "Old Mother Mold is preparing to counter your SWARM: 2 waves", the draft tip, and "Mixed wave: shields up" ([`SS/29-b1-0202.png`](screenshots/newcomer/29-b1-0202.png)). Draft 1: Scythecap Grove (170), Sporeling Burrow I (+15% HP), Capguard Hall I (+15% HP). I took the Grove (it cleaves Light swarms) but had 72 gold. **The shields are readable**: bubbles around each unit of a mixed wave (`SS/31-b1-0205.png` (not kept), zoom `SS/31b-shields-zoom.png` (not kept)). At 2:13 Burst, 3 targets, and it barely dented 3 Bloomed Sporelings ([`SS/33`](screenshots/newcomer/33-b1-burst.png)). At 2:42 the Grove: 168 of 170, a silent fail, placed at 2:45. | Draft (1). Power (1). One building. |
| **3:00–4:00** | 3:00: both waves march out in column formation, shields on both sides (`SS/37-b1-0300.png` (not kept)). It looks good. 3:08: first **spore cloud**, a soft whitish glow from an enemy Burster (`SS/38-b1-0308.png` (not kept), zoom [`SS/38b-cloud-zoom.png`](screenshots/newcomer/38b-cloud-zoom.png)). It isn't tinted by side, so I couldn't tell whose it was or that it hurts. 3:28: Burst on an enemy Elder. 3:35: third Burrow. **The tray said 110, the ghost said 121** (+10%, 2 columns from home), and I had 120 (`SS/42` (not kept)). Home columns were full after 4 buildings. At 4:00 I owned 13 columns to their 4, and felt like I was winning. | Power, one building. |
| **4:00–5:00** | At 4:00: draft 2, the storm starts, and "Old Mother Mold now counters your SWARM" (`SS/43-b1-0345.png` (not kept)). I took the rare **Amanita Lodge (260)**. **4:00–5:30 was spent saving for it, with nothing else to do**. The enemy took back columns 29 → 27, and "Column 29 lost" showed in red although I never owned it. | **Nothing to decide for about 75 s.** |
| **5:00–6:00** | 5:13: Burst on 3 Bursters, which burst into clouds (`SS/51-b1-burst3.png` (not kept)). 5:30: Amanita Lodge placed forward for **286** (+10%). The tray said 260. 6:00 draft 3: Fresh Spores, Hardy Spores (+8% HP), Burrow I. All three are minor. | One building, one dull draft. |
| **6:00–7:00** | 6:31: Burst. 6:45: second Scythecap Grove forward, 187 (186 on hand first, then a fail, then placed). Territory 16 to 11 at 6:30 (`SS/57-b1-0630.png` (not kept)). Both Heartcaps were still untouched (3000 / 2000). | Two actions. |
| **7:00–8:00** | (2× from 7:17.) The enemy put Burrows forward at columns 23, 20 and 27, and its Elder Sporelings walked into my base: "Sporeling Burrow lost", then "**Amanita Lodge lost**" (at 7:4x, about 2.5 minutes after I'd saved 75 s for it, `SS/61-b1-0741.png` (not kept)). Territory 16 to 15 at 8:00. | Mostly watching. |
| **8:00–8:56** | 8:00: draft 4 offered **an upgrade for the Amanita Lodge I had just lost**, Gill Archer Nest, and Tender's Ring. I took the Nest and placed it at 8:01. **It was lost by 8:26.** Storm 5 (waves ×2). The enemy wave of Elder Sporelings (8 Elders at once, per the report) swept my base. **I lost all 10 buildings and my Heartcap went 3000 → 0 between about 8:45 and 8:56** (`SS/64` (not kept), `SS/65` (not kept), [`SS/66-b1-0850.png`](screenshots/newcomer/66-b1-0850.png), `SS/67` (not kept)). | Burst, rebuild a Burrow, then nothing. |

**Report** ([`SS/68-b1-report.png`](screenshots/newcomer/68-b1-report.png)): "Defeat. The Gray Rot wins by Rout." The front-line graph shows me ahead from 1:30 to about 7:30, then a cliff.
- The enemy was **mono Sporeling**: 9 Sporeling Burrows plus 1 Burster Pod, built 10, lost 0, with 171 Bloomed and 38 Elders.
- Its counters were "Swarm (4:00) with Sporeling Burrow ×3; Swarm (7:00) with Sporeling Burrow". It countered my "swarm" with more swarm.
- I earned more gold (economy 420) and still lost.

**Then the run ended** ([`SS/69-after-b1.png`](screenshots/newcomer/69-after-b1.png)): "The run ends after 1 battle". **0 Spores, 0 Amber, 0 Commander XP**, and Feats "none yet (Milestone 6)". Nine minutes of play left nothing behind.

### Battle 1, run 2: Stumpfield vs The Lichen Baron (2×)

I'd learned from run 1: opener Burrow plus Capguard (shields from wave 1), and more army. The Baron opened Capguard plus Cellar and later had 2–3 Cellars. It was greedy.
- 0:24–1:45: my waves won every trade and reached its base, yet **territory moved slowly**: 6 to 4 columns at 1:44 (`SS/77-r2b1-0143.png` (not kept)). Income was only +96/min without a Cellar.
- 1:55: another **1-gold-short** fail. The Burrow cost 116 forward, I had 115.
- 2:00 draft: Fresh Spores / Capguard I / Quick Roots. I took Quick Roots (+20% capture) (`SS/78-r2b1-0200.png` (not kept)).
- 4:00: territory 18 vs 16, after the enemy swept the neutral columns 23 → 18 in seconds with a chain of red "Column N lost" banners ([`SS/82-r2b1-0400.png`](screenshots/newcomer/82-r2b1-0400.png)). By 5:00 it was 13 vs 21 (`SS/84-r2b1-0500.png` (not kept)). The enemy built a Drift Stalk at column 16 and a forward Burster Pod.
- **5:13: Hold (F), and this time it worked as a decision.** The next beat stayed home ("+20" inside), and at 5:40 the double wave went out (`SS/85` (not kept), `SS/86` (not kept), `SS/88-r2b1-0558.png` (not kept)). It killed the forward Drift Stalk ("Enemy Drift Stalk destroyed"), and by 7:24 territory was **22 vs 12** (`SS/95-r2b1-0724.png` (not kept)). **This was the best moment of the session**: a swing I caused.
- 6:00 draft: Capguard I / Gill Nest I / Puffball Mortar. The Mortar's card (`SS/91-mortar-tooltip.png` (not kept)) says range 1.5–6 and no clouds. That's correct under `rework`, which keeps the Mortar's clouds in the separate `sporecloud` preset, but status.md's "spore clouds" read as if the Mortar made them.
- 7:48–8:33: I destroyed its Burster Pod, Capguard Halls, Cellars and Rhizomorph Tunnel. **The enemy Heartcap was 2000/2000 at 8:21, 425 at 8:33 and 0 at 8:34** (`SS/99` (not kept), `SS/100` (not kept), `SS/101` (not kept)).

Report (`SS/102-r2b1-report.png` (not kept)): Victory, 20 Spores, Spore Burst 3× for 454 damage. The enemy spawned 140 units to my 326.

**Spoils** (`SS/103-spoils.png` (not kept)): Sporeling Burrow I / Rootbreaker Den / Mycelial Web (+6 supply). I took the Web because I had hit 59–60 of 60 supply. The spoils screen explains itself well.

### Battle 2, run 2: Twin Roots (2 lanes) vs Old Mother Mold (1× then 2×)

375 gold. Mold "Remembers: SWARM" and opened with 3 Sporeling Burrows.
- **Two lanes doubled the decisions**: which lane to reinforce, where to aim the Burst. That's good.
- Lane 2 was under attack in my base at 1:05 (`SS/109-b2-0118.png` (not kept)).
- 2:00 draft: Spore Tithe (+4 gold per merge) / Burrow I / Morel Warren. I took the Tithe (`SS/111-b2-0212.png` (not kept)). The report later had no row for its gold: `src/ui/report.ts:251` lists only stipend, economy, interest and comeback. The sim tracks `goldEarned.effects` and `drafts` (`src/sim/state.ts:641`), but the report never shows them. By arithmetic about 400 gold came from the Tithe, and none of it was visible.
- 4:00 draft: Burrow I / Fruiting Season (I had no economy building) / **Mortar I, "+0.3 tiles farther"** (`SS/115-b2-0404.png` (not kept)). That last one is an invisible effect.
- **My buildings kept dying soon after I placed them:**
  - a Burster Pod placed at 4:37 was gone by 5:16 (`SS/117-b2-0516.png` (not kept));
  - a Capguard Hall placed at 5:50 was gone by 6:45;
  - a Burster Pod in lane 2 was gone by 7:58;
  - a Capguard Hall placed at 8:43 was lost within seconds.
- Mold built up to **13 Sporeling Burrows** and a 25+ Sporeling swarm by 7:00 (`SS/120-b2-0624.png` (not kept)).
- 8:00: storm 5, the same showdown as run 1. **This time my Bursters (up to 9) shredded the lane 1 swarm**: enemy units fell from 34 to 5 in about 13 s of game time (`SS/126-b2-0801.png` → `SS/127-b2-0812.png` (not kept)). It was satisfying, and the Burster tooltip had told me why it would work.
- **Enemy Heartcap: 2250/2250 until about 8:30, 1502 at 8:43, 0 at 8:55**, while lane 2 was overrunning my base (`SS/128-b2-0842.png` (not kept)).

Report ([`SS/130-b2-report.png`](screenshots/newcomer/130-b2-report.png)): Victory, 20 Spores. The front line was mine in both lanes from about 1:00. The battle was effectively decided territorially by about 3:00 and took until 8:55 to end.

### Battle 3, run 2: Bogwater Hollow vs The Blightwright (3×)

The Blightwright opened greedy (Rootbreaker plus 2 Cellars, then more Cellars) and passive (10–15 supply all game).
- **3:33: I owned 22 of 32 columns.** Its Heartcap was untouched until about 6:00. I won at 6:45, at storm 3 (`SS/138` → `SS/144` (not kept)).
- Draft offers again included upgrades for buildings I didn't have (Truffle Cellar I, Mortar I, Morel Warren I).
- At 3×, **Spore Burst "hit 0 targets!"**: the clump moved before the click landed.
- The enemy's 2 Rhizomorph Tunnels did **124 damage in total** (report `SS/145-b3-report.png` (not kept)). I never saw a Rhizomorph surface.

### Event and battle 4, run 2

- **Fallen Oak** (`SS/148-event.png` (not kept), result `SS/149-event-result.png` (not kept)). A real tradeoff, a lovely vignette and a clear result screen (Mycorrhizal Link, −450 max Heartcap).
  - But my Heartcap had been **3000/3000 the whole run** after 3 wins, because the battles I won never touched it. So "−15% max HP" cost me nothing I could feel.
- **Battle 4, Bogwater Hollow vs The Blightwright, 3×:**
  - I drafted a Drift Stalk and opened with Drift Stalk, Capguard and Gill Nest (`SS/151` (not kept), `SS/152-b4-0030.png` (not kept); Driftling zoom `SS/152b-driftling-zoom.png` (not kept)).
  - The Driftling is a white puffball with a violet drop-shadow. It's distinct when zoomed, a tiny white blob at normal scale.
  - **Territory froze at 7 columns to 9 for the whole battle** while my flyers and archers razed the enemy base. At 4:00 the enemy had **zero buildings and zero units**, and its Heartcap was at 988. The bar still said I was behind 7–9 ([`SS/159-b4-0400-territory-paradox.png`](screenshots/newcomer/159-b4-0400-territory-paradox.png)).
  - Won at 4:09 (`SS/160` (not kept), `SS/161-b4-report.png` (not kept)). The general said "now counters your SWARM" with no buildings left.

---

## 2. Rhythm: did the 20 s waves give a pulse?

**Yes, partly.** Every 20 s each lane's wave sets out together in a column, marches at its slowest unit's pace, meets the other wave, and one side flips a few columns. The march is easy to read (`SS/37` (not kept), `SS/88` (not kept)), and the shield bubbles make "my wave" a visible object. Hold → double wave (`SS/85`–`SS/95` (not kept)) is the one decision that works with the beat.

What hurts the rhythm:
- **The dead opening.** Nothing is on the field until 0:20, and the first clash comes at about 0:28.
- **Units wait inside buildings while the base is attacked.** In run 1 at 1:22, 6 of my units waited while 3 Sporelings ate my Burrow.
- **The beat repeats one callout.** "Mixed wave: shields up" every 20 s (or "…in lane 1 and 2…").
- **At 2–3× the beat is 7–10 s.** It feels like a metronome I watch rather than play to. Between beats I had nothing to do unless I could afford a building.
- **The beat isn't tied to my income or the drafts.** Gold lands every 5 s, interest at each 1:00 "wave", drafts every 2:00, the general's reads at 2:00 and 5:00, the storm at 4:00+. With five clocks, the "Wave" chip and the beat chip ("Next wave") compete for the same word.

## 3. Was the rework readable without the docs?

| Rework piece | Read without docs? | Evidence |
|---|---|---|
| Waves on a beat | Mostly. The beat chip's tooltip is clear ([`SS/07`](screenshots/newcomer/07-beat-tooltip.png)). The **Hold label is truncated** ("Keeping the …", [`SS/23-b1-0113.png`](screenshots/newcomer/23-b1-0113.png)), and F on cooldown does nothing silently (1:26). | [`SS/07`](screenshots/newcomer/07-beat-tooltip.png), [`SS/23`](screenshots/newcomer/23-b1-0113.png), `SS/24` (not kept) |
| Mixed-wave shields | **Yes.** Bubbles plus a callout. I couldn't tell how much they mattered, and the callout spams. | `SS/31b-shields-zoom.png` (not kept) |
| Spore clouds (from Bursters only under `rework`) | **Partly.** A soft whitish glow, the same colour for both sides. Nothing says it damages or whose it is. | [`SS/38b-cloud-zoom.png`](screenshots/newcomer/38b-cloud-zoom.png) |
| Pinning (ranged ×0.35 with an enemy within 1 tile) | **No.** No signal on the field. The Gill Archer's tooltip mentions it; I never noticed it in play. | (absence) |
| Call for help | **No.** Not distinguishable from normal aggro. | (absence) |
| Flyers (rule C) | The sprite, yes (`SS/152b` (not kept)). The rule, no. **"Holds no ground" makes the territory bar lie** (F-4), and "melee hits for half" shows only in tooltips. | [`SS/159`](screenshots/newcomer/159-b4-0400-territory-paradox.png) |
| Rhizomorph (burrows) | **No.** I never saw one. 2 enemy Tunnels did 124 damage in battle 3. In run 2's battle 1 my forward Cellar lost 110 HP to something I couldn't see. | `SS/145` (not kept), `SS/86b-cellar-zoom.png` (not kept) |
| Burster | **Yes.** It rolls at clumps; the tooltip is precise (`SS/98-burster-tooltip.png` (not kept)) and the effect is visible in the storm-5 swarm fight (`SS/127` (not kept)). The best-designed new piece for a newcomer. | `SS/98` (not kept), `SS/127` (not kept) |
| Storm grows waves (×2 at 5 stacks) | **No.** It's in no tooltip I opened and not in Help's Sporestorm tab, yet it decided the ending of every 8+ minute battle. | [`SS/66`](screenshots/newcomer/66-b1-0850.png), `SS/128` (not kept) |

## 4. How battles ended, and whether the ending felt earned

- **All 5 battles ended by Rout; none went to Decision.** The three full-length ones ended at **8:34, 8:55 and 8:56, all at storm 5**. In those three the losing Heartcap was untouched until the last 10–60 s:
  - run 1's battle 1: 3000 → 0 between about 8:45 and 8:56;
  - run 2's battle 1: 2000 at 8:21 → 425 at 8:33 → 0 at 8:34;
  - run 2's battle 2: 2250 at about 8:30 → 1502 at 8:43 → 0 at 8:55.
- **The loss did not feel earned.** I led in territory for about 6 minutes (the report graph). Then storm 5 doubled waves, and Mold's bigger, merged army (60/60 supply against my 25/60, 8 Elders) took all 10 of my buildings and my Heartcap in about 60 s. There was no warning I could act on and no comeback lever. The report's "Buildings built / lost 10 / 10" tells the story.
- **The two storm-5 wins felt half-earned.** Run 2's battle 1 came after a real Hold swing; battle 2's after a satisfying Burster counter. But both were decided territorially minutes before the Heartcap could be touched.
- **The two short wins (6:45, 4:09) felt like formalities** against a greedy, passive general that had stopped fighting. Battle 4 is the extreme case: the enemy had nothing left by 4:00 and the bar still showed me behind.

## 5. One-more-run pull: what made me want to keep playing, and what didn't

Want to keep playing:
- The Hold → double-wave swing (`SS/95` (not kept)).
- Burster Pods eating a swarm (`SS/127` (not kept)).
- Elder merge callouts.
- The report graphs: they tell each battle's story at a glance ([`SS/68`](screenshots/newcomer/68-b1-report.png), `SS/102` (not kept), [`SS/130`](screenshots/newcomer/130-b2-report.png)).
- Spoils and the Fallen Oak event: real choices, nice presentation.
- The two-lane map gave more to do.

Don't want to keep playing:
- **Losing battle 1 ends the run with nothing**: 0 Spores, 0 XP, no feats ([`SS/69`](screenshots/newcomer/69-after-b1.png)). After winning, Spores pile up with no use (M6 isn't built).
- **A run is long.** 5 rows plus the boss, with battles of 4–9 minutes each (most near 9). I reached row 5 and estimate a full run at 45–60 minutes of battle time at 1×.
- **Drafts rarely change how I play** (F-6).
- **The run Heartcap never moved in wins**, so the run had no attrition tension. Run 2 was 3000/3000 through 3 wins.
- **The general's "adaptation" felt the same every battle**: SWARM, SWARM, SWARM.

---

## 6. The 10 most important fun problems I saw (ranked)

### F-1. Heartcaps are out of reach for ~8 minutes, then fall in seconds to the storm
- **Seen:**
  - Three battles ended at 8:34–8:56, all at storm 5.
  - Heartcap 2000 → 425 → 0 within about 13 s of game time (`SS/99`–`SS/101` (not kept)).
  - 3000 → 0 within about 11 s ([`SS/66`](screenshots/newcomer/66-b1-0850.png), `SS/67` (not kept)).
  - In battle 3 I owned 22 of 32 columns at 3:33, and the Heartcap still took until 6:45.
- **Why it hurts:** the middle of every battle carries no stakes I can see. Early leads don't pay off, and the ending is a coin flip at the storm cliff, not a payoff. This matches the known issue "there are still no comebacks". It also leaves the run Heartcap with no attrition (section 5).
- **Leads:** the `breach` prototype (Heartcap breach pulses and a last stand, with storm Heartcap damage +10%/stack instead of +20%) is built and off. Any rule that lets a dominant lane chip the Heartcap before 8:00 would help.

### F-2. Low decision density: long waits between actions
- **Seen:**
  - Income is +96/min (no Cellar) to +144–216/min, against buildings costing 110–260. That's roughly one purchase every 50–70 s.
  - Run 1's battle 1 at 1×: 0:06–0:36 nothing, and **4:00–5:30 saving for one card** (`SS/44`–`SS/53` (not kept)).
  - Waves add a dead 0:00–0:20 opening.
  - My actions in run 1's battle 1: 10 placements, 4 drafts, 6 power uses and 1 Hold in 9 minutes. That's about 2.3 decisions a minute, most of them forced.
- **Leads:** the `hotstart` deploy draft (a first decision at 0:00); cheaper or more frequent small actions; something to spend gold on between buildings.

### F-3. Battle 1 can end the run, and Mold's mono swarm beats a newcomer who follows the tips
- **Seen:**
  - I followed the economy tip; Mold opened with 2–3 Burrows and no economy.
  - Its report: 9 Sporeling Burrows plus 1 Burster Pod, 171 Bloomed and 38 Elders, 8 Elders at once ([`SS/68`](screenshots/newcomer/68-b1-report.png)).
  - Run over at 8:56 with 0 Spores and 0 XP ([`SS/69`](screenshots/newcomer/69-after-b1.png)).
- **Cross-check:** consistent with Step B's baseline. Battle 1 is lost 33% of the time, and Mold accounts for 79 of 99 battle-1 losses (`docs/balance-backlog.md`, "Hot start").
- **Leads:** `hotstart` (the general's battle-1 income ×0.75 halves battle-1 losses), or move Mold out of battle 1 (measured there). A softer fail state, or some reward for a lost run, would help the pull.

### F-4. Territory doesn't show who is winning (waves and flyers)
- **Why:** capture needs 3 s of presence in the frontier column (`SPEC.md` §4.3; progress −200/tick when absent). A marching wave walks through it, and flyers hold none.
- **Seen:**
  - Battle 4: **7 vs 9 columns for 4 minutes** while my army razed the enemy base. At 4:00 the enemy had zero buildings and zero units ([`SS/159`](screenshots/newcomer/159-b4-0400-territory-paradox.png)). Had it lasted to 10:00, the **Decision would have gone to the enemy**.
  - Run 2's battle 1: units at the enemy base by 1:17 (`SS/76` (not kept)), but only 6 vs 4 columns at 1:44.
  - `src/app/battleView.ts:332` shows **"Column N lost" (red) for any column the enemy takes, even a neutral one**. Chains of red banners appeared for ground I never owned ([`SS/82`](screenshots/newcomer/82-r2b1-0400.png), `SS/84` (not kept)).
- **Leads:** let waves claim the frontier as they pass, or let flyers hold ground; at least word neutral captures as "Column N taken by the Rot" or show them neutrally.

### F-5. New and forward buildings die fast, and home space forces forward building
- **Seen:**
  - Amanita Lodge: saved for 75 s, placed at 5:30, lost at about 7:40 (`SS/61` (not kept)).
  - Gill Nest: placed at 8:01, lost by 8:26.
  - Battle 2: a Burster Pod (4:37 → lost by 5:16), a Capguard Hall (5:50 → about 6:45), a Burster Pod (lost by 7:58), a Capguard Hall (8:43 → seconds).
  - Home columns (4 × 8 tiles) held only about 4 buildings the way I placed them. Nothing guides packing (`SS/42` (not kept)), so building 5+ means paying the forward price into a zone Elders roam.
- **Leads:** F1 (forward price), F12 (repair) and F14 (smaller buildings) are already open. Show nearby threats, or give a just-placed building a grace shield.

### F-6. Drafts rarely matter
- **Seen:** 13 in-battle drafts across 5 battles. Typical offers:
  - "+15% HP" upgrades;
  - "Mortar blast reaches +0.3 tiles farther" (`SS/115` (not kept));
  - "+8% HP";
  - upgrades for buildings I hadn't built or had just lost (`SS/62` (not kept), the Amanita upgrade at 8:00 right after the Lodge died);
  - the 8:00 draft arrives when it can't matter.
- The interesting picks were all blueprints (Scythecap Grove, Burster Pod, Drift Stalk, Amanita), and most of them took 45–75 s to afford.
- Relic gold is invisible in the report (`src/ui/report.ts:251` omits `goldEarned.effects` and `drafts`; Spore Tithe paid about 400 gold that I never saw).
- **Leads:** the `bigdrafts` prototype (drafts after waves 2 and 5, take 2 of 4, +10 rare); weight drafts toward the kit you're actually using.

### F-7. The rework's rules are invisible to a newcomer
- **Help** has no entry for waves, shields, pinning, call for help, flyers, clouds or burrowing (`src/ui/help.ts`).
- **Pinning and call for help** have no on-field signal.
- **Clouds** are a neutral white glow ([`SS/38b`](screenshots/newcomer/38b-cloud-zoom.png)).
- **Rhizomorphs** are never seen (124 damage for 2 Tunnels).
- **"Wave" means two clocks**: the HUD's 1:00 Wave chip against the 20 s "Next wave" chip and the 2:00/5:00 "two waves later" ([`SS/07`](screenshots/newcomer/07-beat-tooltip.png), `SS/07b` (not kept)).
- **The storm growing waves** isn't explained anywhere I saw.
- For the P3 question "can you tell what can hit a flyer?": only from tooltips (`SS/91` (not kept), `SS/98` (not kept)).

### F-8. Callout noise buries the warnings that matter
- **Seen:**
  - "Mixed wave: shields up" every beat;
  - runs of "Column N claimed / lost" (often 5+ in a few seconds);
  - constant "Bloomed Sporeling!";
  - at 2:00, the counter warning, the draft tip and the shields callout all at once ([`SS/29`](screenshots/newcomer/29-b1-0202.png)).
- The counter warning, "Amanita Lodge lost" and "Your Heartcap is under attack!" went by in that stream.
- **Leads:** drop or merge the per-beat shield callout and per-column flips; keep the losses and the general's warnings.

### F-9. The adaptive general doesn't feel like an opponent
- **Seen:**
  - Every read in 5 battles was SWARM, including a Drift Stalk + Capguard + Gill army (Driftlings are 1-supply Light).
  - Mold "counters your SWARM with Sporeling Burrow ×3" ([`SS/68`](screenshots/newcomer/68-b1-report.png)): the answer to a swarm was more swarm.
  - The Blightwright "now counters your SWARM" with no buildings and no units left (`SS/158`/`SS/161` (not kept)).
  - The Lichen Baron and Blightwright went greedy and passive (Cellars, 10–17 supply) and folded.
  - Nothing told me what the enemy was massing, which is what I needed to answer it (P3 question 2).
- **Leads:** status.md item 3 (teach it the swarm's answer); show "the Gray Rot is massing X" as well as "it counters your X".

### F-10. The commander power and placement are fiddly, and gold is often 1 short
- **Spore Burst** dealt 1559 damage in 6 uses (about 4% of my damage) in run 1's battle 1, 454 in 3 uses in run 2's battle 1, 557 in 4 uses in battle 2, and **0 ("hit 0 targets!")** at 3× in battle 3. Its visual effect was barely visible in screenshots ([`SS/33`](screenshots/newcomer/33-b1-burst.png), `SS/41` (not kept)).
- **Placement failed at least 6 times for 1–10 gold**, with only an illegal sound. The tray shows the base price, the forward price is +5% a column, and gold arrives in 5 s ticks:
  - 149 / 150;
  - 168 / 170;
  - 120 / 121;
  - 115 / 116;
  - 174 / 184;
  - 181 / 200.
- Beyond 9 cards the Mortar and Rhizome Vault have **no hotkey** (`SS/151` (not kept) tray, 11 cards).
- **Leads:** show the price at the cursor's column on the card; queue a placement until it's affordable; make the power hit harder or easier to land.

---

## 7. Answers to the P3 playtest questions (from this session)

1. **Did any battle feel decided by one unit type?** Yes. Run 1's battle 1 went to Mold's mono Sporeling army (10 buildings, 9 of them Burrows). Battle 4 was trivially won by Drift Stalks plus archers, though the enemy was passive.
2. **When the general massed something, could you answer it, and did you know how?** Not the first time. Nothing names what the enemy masses; the warnings only name what it counters in you. In battle 2 Burster Pods answered the swarm, and I learned that from the Burster tooltip.
3. **Do the waves give a battle rhythm?** Some (section 2). The dead first 20 s, units idling inside while the base is hit, and the callout spam take away from it.
4. **Do clouds, Rhizomorphs and flyers read clearly?** Clouds partly, Rhizomorphs no, flyers by sprite yes. The flyers' "no ground" rule surfaces as a misleading territory bar.

Known issues this session reproduced:
- **Battle 1 is harder:** Mold beat me in battle 1.
- **No comebacks:** run 1's battle 1 went from a 6-minute lead to collapse with no lever. There was one comeback via Hold in run 2's battle 1.
- **The general doesn't answer a swarm:** confirmed.
- **An army of only flyers is still strong:** a flyer-led opener won in 4:09.
- **The Rhizomorph may not earn its place:** 124 damage, never seen.
