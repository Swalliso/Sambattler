# Play-strategist review: Spore & Sprawl `develop` (ef2e133) with `?proto=rework`

Evidence for [After the combat rework](../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): the strategist's playthrough. Written by an agent playing the dev site during that review; nothing here is adopted. Recovered from the session transcript, so the screenshots it mentions are kept only where linked ([screenshots/strategist/](screenshots/strategist/)); its driver scripts are in [scripts/playtest/strategist/](scripts/playtest/strategist/).

Reviewer: a bot playing as an experienced strategy player in a real headless Chromium. It played the deployed dev site, https://swalliso.github.io/Sambattler/dev/?proto=rework&debug=1, whose build tag reads `DEV BUILD · ef2e133`.

- **Screenshots:** in the session's scratch folder. Below, `shots/<name>.png` means that folder. The ones kept are linked, from [screenshots/strategist/](screenshots/strategist/), and the rest are marked "(not kept)".
- **Driver scripts:** [`step.cjs`](scripts/playtest/strategist/step.cjs) and [`auto.js`](scripts/playtest/strategist/auto.js), in [scripts/playtest/strategist/](scripts/playtest/strategist/).

## TL;DR

- **Sessions played:** two full runs (Vesper, then Cordis) and four sandbox battles.
  - The sandbox uses the single-battle URL, `?map=…&enemy=general:…`. It has the whole kit and no drafts.
  - I also sampled bot autoplay on 7 seeds.
- **Every real battle I played as a thinking, mixed-army player ended in a sudden Rout loss.**
  - Each was in battle 1 against Old Mother Mold.
  - Each loss ended the run with 0 Spores, 0 Amber and 0 XP.
- **On the same seed (4242), the sandbox showed what wins:**
  - A brainless all-in **Drift Stalk** army won.
  - A brainless all-in **Sporeling Burrow** army won.
  - The counter matrix's "answer" (Sporeling + Veilstalker, plus a Scythecap and a Rhizomorph Tunnel) lost.
- **The battle shape is the core fun problem:**
  - Seven minutes of a quiet, symmetric middle.
  - Then storm-grown waves at 6:00 to 8:00 merge into Elders.
  - One side's whole base and Heartcap are gone within 6 to 20 seconds.
- **Nothing on the HUD tells you you're losing until then.** Territory, the visible score, often says the opposite.
- **The rework's pieces read well:**
  - the 20 s beat chip;
  - the shield bubbles and "Mixed wave: shields up" callouts;
  - the Burster clouds;
  - the general's two-wave warning.
- **The rework's pieces don't change what wins:** the cheapest spawner, massed, merged by waves and doubled by the storm.

## Limits of this review (read first)

- **A bot, not a human hand.** I drove the game through Playwright in coarse steps: pause, decide, then unpause for 1 to 20 game-seconds at 2× speed.
  - I never micro'd during a step.
  - Several building losses happened inside 15 to 20 s steps that a human would have watched live (run 1, 7:21 to 7:41).
  - A human could react faster around the collapse, but I doubt it would change the result. By then the enemy had 7 Elders on the field against my 0.
- **Limited sample.** Two real runs, 4 sandbox battles and one 7-seed autoplay sample.
  - The general reacts to what I build, so even rematches on the same seed aren't controlled experiments.
- **The sandbox isn't a run.** Both sides get all 17 buildings, there are no drafts or relics, and there is no commander.
  - It shows what a build can do, not what a run lets you assemble.
- **Never seen:** a mid-run route, an event, a Grove, spoils, an elite or the boss.
  - Every run, mine and the bot's, ended in battle 1.
  - `?autoplay=battles:N` didn't get past battle 1 either; see the autoplay sample below.
- **Debug overlay:** `?debug=1` turns on the F3 overlay (unit ids and presence numbers) by default. Some screenshots show it.

---

## 1. What I tried and what happened

### Run 1: Vesper, seed 100944

- **Setup:**
  - Bans: Tender's Ring, Rhizome Vault and Hammercap Forge (`shots/bans02.png` (not kept)).
  - Route (`shots/route01.png` (not kept)): 6 rows, with battle 1 on Twin Roots (2 lanes) against Old Mother Mold.
  - Starter kit: Sporeling Burrow, Capguard Hall, Truffle Cellar.
  - Enemy kit in battle 1: Sporeling Burrow, Rhizomorph Tunnel, Burster Pod and Drift Stalk (from `__GAME__.battle().sides.enemy.kit`). The rework appends its three buildings to every general.
- **Plan:** a sound mixed army. An economy opener, then Capguards beside Sporelings in each lane so every wave is two types and gets shields. Use Spore Burst on clumps.

| Clock | What I did / saw | Screenshot |
|---|---|---|
| 0:00 | Opener: Truffle Cellar plus Sporeling Burrow in lane 1. Mother Mold opened with a Burrow in each lane | `b1_opener.png` (not kept) |
| 0:12 | The beat chip reads "8s +2". Units wait inside the building, which reads clearly | `b1_t12.png` (not kept) |
| 0:20 to 0:34 | My first pair of Sporelings traded 1:1 in lane 1. Lane 2 was empty, so one enemy Sporeling walked in under my turrets | `b1_t34.png` (not kept) |
| 0:46 | Bought a lane-2 Burrow. The enemy had already merged its waves into **Bloomed** Sporelings (202 HP) | `b1_t46.png` (not kept) |
| 0:54 to 1:19 | Two enemy Bloomed beat on my lane-2 Burrow (450 → 186 HP). **The 4 Sporelings stored inside never came out to defend; they wait for the beat** | `b1_t54.png` (not kept), `b1_t75.png` (not kept) |
| 1:05 | **Hold test.** Clicked Hold on lane 2. The label truncates to "Keeping th…" (full text "Keeping the wave home · 9 s"). My 2 Sporelings already on the field kept walking and died. Under waves, Hold doesn't recall anyone: `movement.ts:60` applies the rally only when `!r.waves`. Hold now means "skip a beat" | `b1_hold.png` (not kept), `b1_t71.png` (not kept) |
| 1:19 | **Spore Burst** on the 2 Bloomed at my Burrow killed both (86 and 58 HP left; 90 crush × 0.75 vs Light = 68). A good, readable save | `b1_power1.png` (not kept) |
| 2:00 | **Draft 1:** Fresh Spores / Puffball Mortar / Gill Archer Nest. Took the Mortar as the textbook answer to clumps. The general's warning showed "Preparing to counter your SWARM: 2 waves", with the callout "Mixed wave in lane 2: shields up". **After the pick the game resumed unpaused** | `b1_draft1.png` (not kept) |
| 2:41 | Mortar placed in lane 1. Spore Burst on the lane-1 pair | `b1_t242.png` (not kept) |
| 2:57 | The general's swarm counter arrived: a **Burster Pod** in lane 1 | `b1_t257.png` (not kept) |
| 3:17 to 4:38 | My lane-2 mixed wave (Capguards and Sporelings, shielded) won lane 2 and pushed the border from col 4 to col 13 | `b1_t317.png` (not kept), `b1_t433.png` (not kept) |
| 4:00 | **Draft 2:** Sporeling Burrow I (+15% HP) / Thick Caps (+15% building HP) / Quick Roots (+20% capture). Three flat stat bumps; none changes a plan | `b1_draft2.png` (not kept) |
| 4:07 | Spore Burst on lane 1's wave killed **2 Bursters** and left 4 Sporelings at 18 HP. The best skill moment of the run | `b1_power3.png` (not kept) |
| 4:34 | Enemy **Elder Sporeling** (564 HP + 86 shield) in lane 1, with "ELDER!" floating over it. The general's panel: "Countering SWARM" | `b1_t433.png` (not kept), `b1_t454.png` (not kept) |
| 5:06 to 5:23 | Lost the lane-1 Burrow, then the Mortar. Enemies hug it inside its 1.5-tile minimum range | `b1_t506.png` (not kept), `b1_t522.png` (not kept) |
| 6:00 | Storm 3, so waves ×1.6. **Mother Mold released about 31 Sporelings, 3 Bursters and 3 Bloomed in one beat.** Within 6 s they had merged into a Bloomed-and-Elder blob per lane | `b1_draft3.png` (not kept), `b1_t605.png` (not kept) |
| 6:00 | **Draft 3:** Thick Caps / Gill Archer Nest / Quick Roots, two of them repeats of draft 2. A 20-gold reroll gave Sporeling Burrow II / Rootbreaker Den / Capguard Hall I. Took Rootbreaker | `b1_draft3r.png` (not kept) |
| 7:08 | **I held 27 columns against 13 and my Heartcap was at 3000/3000.** Everything visible said I was winning | [`b1_t709.png`](screenshots/strategist/b1_t709.png) |
| 7:21 to 7:41 | Lost 10 of 11 buildings. Heartcap at 2448 | `b1_t720.png` (not kept), [`b1_t741.png`](screenshots/strategist/b1_t741.png) |
| 7:47 | **Heartcap 0, a Rout.** The run ends after 1 battle | `b1_t751.png` (not kept), [`b1_end.png`](screenshots/strategist/b1_end.png), `run1_end.png` (not kept) |

**End-of-battle report ([`b1_end.png`](screenshots/strategist/b1_end.png)):**

| | Me | Enemy |
|---|---|---|
| Units spawned | 177 | 468 |
| Bloomed / Elder merges | 27 / 0 | 124 / 20 |
| Most Elders at once | 0 | 7 |
| Buildings built / lost | 11 / 11 | 11 / 0 |
| Gold income | Economy 502, Stipend 744 | Comeback 277, Stipend 744 |

- **The enemy's 277 comeback gold was paid for "being behind" on columns.**
- Spore Burst: 5 uses, 1,182 damage. MVP: Capguard Hall, 11,411 damage (43%).
- Run summary: 0 Spores, 0 Amber, Commander XP 0, "Feats: none yet (Milestone 6)".

### Run 2: Cordis, seed 816803

- **Setup:**
  - Bans: Rhizome Vault, Hammercap Forge, Morel Warren.
  - Battle 1 on Stumpfield (1 lane) against Old Mother Mold (`shots/route2.png` (not kept)).
  - Starter kit: Sporeling Burrow, Gill Archer Nest, Truffle Cellar.
- **Plan:** all army, no economy. Mixed waves from the first beat, then lean into merges with Puppet Bloom.

| Clock | What I did / saw | Screenshot |
|---|---|---|
| 0:00 | Burrow plus Gill Nest. My very first wave was shielded | `r2b1_deploy.png` (not kept), `r2b1_t20.png` (not kept) |
| 0:45 | **The enemy already had an Elder** (564 HP), merged from 10 Sporelings, at 0:45 of battle 1 | `r2b1_t46.png` (not kept) |
| 1:00 | The Elder killed both my archers. Its walk into my turrets and fresh wave killed it at home | `r2b1_t60.png` (not kept), `r2b1_t70.png` (not kept) |
| 2:00 | **Draft 1:** Puffball Mortar / Gill Archer Nest I / **Elder's Patience** (rare: Elders +25% HP and regeneration). The only card in either run that changed my plan: go for Elders | `r2b1_draft1.png` (not kept) |
| 3:22 | **Puppet Bloom** on 3 Bloomed and 3 Sporelings gave an **Elder at 706 HP** (with the relic, plus a 139 shield) and a Bloomed. Satisfying, but the Elder was dead by 3:42 | `r2b1_puppet.png` (not kept) |
| 4:00 | **Draft 2:** Gill Nest I / Rootbreaker / Thick Caps. The reroll gave Capguard / **Scythecap** / Rootbreaker; took the Scythecap (cleave vs Light) | `r2b1_draft2.png` (not kept), `r2b1_draft2r.png` (not kept) |
| 5:00 | Puppet Bloom at home made an Elder that won a 1v1 Elder fight (176 HP to 53). A visible skill moment | `r2b1_puppet2.png` (not kept) |
| 6:00 | **Draft 3 repeated draft 2's first offer exactly:** Thick Caps / Gill Archer Nest I / Rootbreaker Den. It also offered an upgrade for a Gill Nest that had been destroyed | `r2b1_draft3.png` (not kept) |
| 6:00 to 7:30 | A stalemate. Columns went from 12–9 in my favour to 12–13 against me as the enemy crept forward. I'd have lost a Decision | `r2b1_t730.png` (not kept) |
| 8:00 | Storm 5, so waves ×2. My wave was 11 Sporelings and 3 Bloomed. **Puppet Bloom only made Bloomed; it doesn't chain into Elders.** Two Bloomed were 3.3 tiles out, just outside its radius | `r2b1_t800.png` (not kept), `r2b1_puppet3.png` (not kept) |
| 8:23 to 8:29 | Heartcap 3000 → 2184 → **0 in about 6 s.** A Rout | `r2b1_end.png` (not kept), `run2_end.png` (not kept) |

**End-of-battle report (`r2b1_end.png` (not kept)):**

| | Me | Enemy |
|---|---|---|
| Units spawned | 295 | 569 |
| Elders made | 14 | 40 |
| Most Elders at once | 2 | 8 |
| Buildings built / lost | 8 / 8 | 9 / 0 |
| Gold | 846 | 942 |

- **Nearly equal gold, nearly 2× the units, and the enemy never lost a building.**
- "Old Mother Mold countered… Swarm (4:00) with Sporeling Burrow ×3."

### Sandbox: the same seed, three builds (Stumpfield vs Old Mother Mold, seed 4242, battle index 1)

| Build | Result | Notes | Screenshots |
|---|---|---|---|
| **Mono Drift Stalk** (only bought Drift Stalks) | **Won by Rout, 9:04** | Held 4 columns all game while the enemy crept to 18. Flyers hold no ground, so it would have lost a Decision. Between 8:00 and 9:00 the storm-doubled flyer waves (27 Elder Driftlings, 7 at once) razed all 7 enemy buildings, then the Heartcap: 2000 → 1577 → 0 in about 4 s. **The general "countered" the flyers as a Swarm, with Sporeling Burrows at 4:00 and 7:00**; those are melee, at ×0.5 against flyers. **I collected 247 comeback gold, because flyers never take ground** | `sb_f_clash.png` (not kept), `sb_f_t548.png` (not kept), `sb_f_end.png` (not kept) |
| **The counter matrix's swarm answer** (2 Burrows, 2 Veilstalker Hollows, a Rhizomorph Tunnel, a Scythecap) | **Lost by Rout, 6:54** | The enemy went from 21 units at 4:31 to 60/60 supply (about 50 units) by 5:46. My supply sat near 10 | `sb_mix_t240.png` (not kept), `sb_mix_t420.png` (not kept) |
| **Mono Sporeling** (10 Burrows, bought whenever affordable) | **Won by Rout, 8:37** | 524 units spawned to 381, 38 Elders to 13. The enemy held more columns (19 to 12) the whole time I was winning. Its Heartcap went 2000 → 0 in about 20 s at storm 5. I got 219 comeback gold | `sb_mono_t300.png` (not kept), `sb_mono_t500.png` (not kept), `sb_mono_endscreen.png` (not kept) |

### Sandbox: Rhizomorph (Bogwater vs the Blightwright, seed 99)

- **Build:** a Rhizomorph Tunnel plus a Burrow.
- **What the Rhizomorphs did:**
  - They tunnelled to about x 19.5 (`burrowed: true`), surfaced beside the enemy's new Gill Nest at x 20 to 25, and died to the turrets.
  - Two had died by 1:13, and enemy buildings had taken 8 damage by 1:20.
- **How it reads:**
  - Burrowed, a Rhizomorph is a **small dirt mound that's easy to miss** (`sb_rh_4.png` (not kept)).
  - Surfaced, it reads fine (`sb_rh_9.png` (not kept)).
- **Verdict:** I saw no moment where it mattered. This matches P2's "carries nothing measured".

### Autoplay sample (`?scene=route&seed=N&autoplay=battles:1`, with `bot:balanced` and the default commander, Vesper)

| Rules | Seeds 777 to 783: battle-1 results |
|---|---|
| `?proto=rework` | **7 of 7 lost by Rout**, all of them run-ending |
| No proto (M5) | 5 of 7 lost by Rout; seeds 777 and 783 won |

- This is small and indicative, but it agrees with my own two runs: under `rework`, battle 1 kills runs even with Vesper.
- Status.md's note mentions only Armilla and Cordis. P2's "108 of 240 runs end in battle 1" was measured before flyers and the swarm read joined `rework`, so it's worth re-measuring on the current preset.

---

## 2. Answers to the P3 questions (combat-rework.md, "P3: playtest")

### Did any battle feel decided by one unit type?

**Yes, every one.**

- **Who won:**
  - In every decisive moment, the winner's army was the cheapest spawner, massed and merged into Elders.
  - The winners' MVP building did 70% to 98% of their damage: Sporeling Burrow at 70% and 98%, Drift Stalk at 97%.
  - The only run where a second type led my damage (Capguard Hall, 43%) was a loss.
- **How waves amplify a body count:**
  - Waves push nearly every cheap unit through a merge.
  - The tier multiplier (SPEC §5.3: ×2.5 Bloomed, ×6.25 Elder damage) turns a small edge in body count into a tier edge.
  - My runs and the enemy's show it: 20 enemy Elders to 0 of mine, and 40 to 14.
- **What the shields do:** they're real and visible, but 20% HP once a wave doesn't offset a ×6.25 Elder.

### When the general massed something, could you answer it, and did you know how?

- **The warning is good.**
  - "Preparing to counter your SWARM ●● 2 waves" (`b1_draft1.png` (not kept)) reads clearly.
  - The end report lists the counters with timestamps.
- **What the general builds is invisible.**
  - The HUD shows my supply, not theirs. It shows no unit count or Elder count for either side, and the general's intent panel speaks only about my army.
  - In run 1 Mother Mold stacked 5 of 7 buildings in lane 1 on Twin Roots. I found that out only by reading `__GAME__`.
- **I knew the textbook answers and they didn't hold.**
  - I used Capguards (Slash vs Light ×1.5), a Mortar, a Scythecap, Spore Burst on clumps, and Veilstalkers in the sandbox.
  - The only answer to a Sporeling mass that worked was a bigger Sporeling mass.
- **The general's own answers don't teach.**
  - "Countered your Swarm with Sporeling Burrow ×3" (`r2b1_end.png` (not kept)), and swarm reads against my flyers answered with Sporeling Burrows (`sb_f_end.png` (not kept)).
  - A player can't learn a counter from that.

### Do the waves give a battle rhythm, or make it feel less alive?

**Rhythm, yes, at least in the first five minutes.**

- **What works:**
  - The beat chip ("8s +2", whose tooltip explains stored units, mixed waves and storm growth, `shots/beat_tip.png` (not kept)).
  - Clean, simultaneous departures.
  - "Mixed wave: shields up" callouts and the shield bubbles. It feels like a drumbeat and gives power use a timing target.
- **What makes it feel less alive:**
  - **Units stored in a building under attack don't defend it** (run 1, 0:54 to 1:19: 4 Sporelings sat inside a Burrow that went 450 → 186 HP).
  - **Hold can no longer pull anyone back.**
    - Under waves it only delays the next release by one beat. SPEC §5.2 describes it as Hold / Advance, but the rally is skipped under waves (`src/sim/systems/movement.ts:60`, `!r.waves`).
    - There is no retreat or regroup tool once a wave is out.
  - **The storm turns the last two to three minutes into a different game.**
    - At 6:00, storm 3 makes waves of 30 or more units.
    - At 8:00, waves are doubled.
    - Battles flip in 6 to 20 seconds.
  - **"Wave" means two things on the same HUD band.**
    - The "Wave 4 · 3:17" chip is the one-minute wave for interest and drafts ("A new wave starts every 1:00").
    - The beat chip's tooltip is titled "Next wave" and means the 20 s release.
    - See `shots/wave_tip.png` (not kept) and `shots/beat_tip.png` (not kept).

### Do the spore clouds, Rhizomorphs and flyers read clearly, and can you tell what can hit a flyer?

| Piece | How it reads |
|---|---|
| **Burster clouds** | Yes: a translucent green disc (`b1_t454.png` (not kept)) |
| **Shields** | Yes: bubbles |
| **Rhizomorph** | Burrowed, a small dirt mound you'll miss in a busy lane (`sb_rh_4.png` (not kept)). Surfaced, fine |
| **Flyers** | The sprite floats with a shadow, readable enough (`sb_f_clash.png` (not kept)). **Nothing tells you what can hit one, or that melee does half.** Only the Drift Stalk's tray description says it. Under rule C everything can hit a flyer, so the question mostly answers itself. The half-damage rule is invisible, and so is the Mortar's inability to hit one |

### P2's watch list, from the player's seat

| Item | What I saw |
|---|---|
| **Battle 1 is harder** | Confirmed with **Vesper** too. Both of my runs and 7 of 7 bot seeds ended in battle 1 |
| **Falling back early is a big edge** | Under waves you can't fall back at all. What you can do is not send: Hold one beat, or fight under your own turrets. My best defensive moments were Spore Burst at my own buildings |
| **No comebacks** | Confirmed, and it's worse than "no comebacks". The loser's Heartcap stayed untouched until the last 6 to 20 s of every battle (3000 → 2448 → 0; 3000 → 2184 → 0; the enemy's 2000 → 0 twice). There is no window in which a comeback could happen |
| **The general doesn't answer a swarm** | It answered my swarm with more Sporeling Burrows and a Burster Pod, and that worked for it, because swarm vs swarm favours the bigger swarm |
| **The flyer army is strong** | Mono Drift Stalk beat Mother Mold with zero decisions. The general has no anti-air plan, and comeback income pays a flyer army for never holding ground |
| **The Rhizomorph** | No visible impact |

---

## 3. Where decisions felt meaningful, and where they didn't

**Meaningful:**
- **Commander power timing (Spore Burst).**
  - Using it on units besieging a building, or on a wave's Bursters before they reach my clump, was visibly decisive in the moment.
  - Saves at 1:19, 2:41, 4:07 and 5:31 in run 1. 5 uses, 1,182 damage.
- **Puppet Bloom on a fresh wave to win an Elder duel** (run 2, 5:00). It works, but only when trios happen to be within 3 tiles.
- **Elder's Patience** (rare relic). The only draft card in eight offers and three rerolls that made me change plans.
- **Making every wave two types for shields.** A real, legible composition rule. It's small next to massed merges, though.

**Not meaningful, or meaningful in the wrong direction:**
- **The economy opener.**
  - Two Truffle Cellars (300 gold) returned 502 gold over 7.5 minutes.
  - The cost was tempo against a general that never buys economy in battle 1. The mono-spawner sandbox wins never built one.
  - The battle-1 economy tip pushes players into the weaker line against Mother Mold.
- **Territory.**
  - Walking waves almost never capture: capture needs 3 s of standing in the frontier column (SPEC §4.3: 6000 progress at 100 a tick), and marching units cross a column in under 1 s.
  - So the front moves only where fights stall. It doesn't track who is winning (27–13 for me while losing; 12–19 against me while winning).
  - Comeback income then pays the side that's actually ahead in army (277, 247 and 219 gold in three battles).
- **Forward building.** It never came up. The front rarely moved, and my home buildings were already the ones dying.
- **Most drafts.**
  - +15% stat cards (Thick Caps, Quick Roots, Sporeling HP, Capguard HP) dominated, and offers repeated within a battle:
    - Thick Caps appeared 4 times across both runs, and Quick Roots twice.
    - Gill Archer Nest I appeared 3 times in run 2, once after the Gill Nest had been destroyed.
    - Run 2's draft 3 was a verbatim repeat of draft 2's first offer.
  - Skip (+40 gold) was often the honest best choice.
- **Bans.** Three bans from a 17-building pool barely shaped the drafts I saw.
- **Lane allocation on Twin Roots.** It matters a lot: the general stacked a lane. The game gives you no way to see it.

---

## 4. Skill expression: did good play visibly beat sloppy play?

**Within a fight, yes.** Well-timed powers, shielded mixed waves and Elder-making with Puppet Bloom all produced visible, satisfying swings.

**Across a battle, no.**
- **The strategy layer is dominated by one input:** how many cheap spawners you own when the storm doubles the waves.
- **The care was wasted.** My two carefully played mixed-army battles lost by Rout. Two brainless one-building sandbox builds (just buy the same card whenever you can afford it) won by Rout on the same seed where the "correct" counter-matrix answer lost.
- **What a good player would learn:** stop thinking about composition and count Burrows. That is the G3 failure seen from the player's seat.
- **Information, the other half of skill expression, is missing.** You can't see the enemy's supply, Elder count or lane stacking. The game rewards a decision (mass more spawners) that the HUD gives you no evidence for.

---

## 5. Did the end of a battle, or the end of a run, make me want another?

**The end of a battle: partly.**
- The post-battle report is excellent ([`b1_end.png`](screenshots/strategist/b1_end.png)): the MVP building, a front-line graph per lane, the general's counters with timestamps, damage and gold by source, and a units table with merges and peak Elders.
- It explained my loss (468 units spawned to 177) better than anything during the battle did.
- That is the problem, though: I learned I was being out-built only after it was over. The battle itself felt like winning (27–13 columns, Heartcap full) until a 20-second collapse.
- A loss you didn't see coming reads as unfair, not as "I almost had it".
- The two sandbox wins were the same in reverse: nothing, then a sudden avalanche. Little sense of having earned it.

**The end of a run: no.**
- Both runs ended after battle 1 with **0 Spores, 0 Amber, Commander XP 0 and "Feats: none yet (Milestone 6)"** (`run1_end.png` (not kept), `run2_end.png` (not kept)).
- **Heartcap HP across a run hardly matters in practice:**
  - A Rout loss sets the Heartcap to 0 and ends the run (SPEC §6.5, §8.5).
  - Nearly every battle ends in a Rout (all 5 of mine; G4 has 11% Decisions).
  - In none of my battles did the Heartcap lose HP in a way that would carry over.
  - So the Grove repair, Decision losses costing 25% and Heartcap HP as a run resource are close to dead systems under `rework`. Runs are "win every battle or restart".
- The "one more run" pull came only from curiosity about the cards I never saw. There was no progress, no near miss, and no new unlock.

---

## 6. The 10 most important depth and fun problems, ranked

### 1. Battles are decided by a late, storm-driven avalanche, with no warning and no counterplay window

- **What I saw:** in all 5 battles, the loser's Heartcap took essentially no damage until the last 6 to 20 seconds:
  - 3000 → 2448 → 0 in 6 s;
  - 3000 → 2184 → 0 in 6 s;
  - the enemy's 2000 → 0 in about 4 s and about 20 s.
- **Where it comes from:** `stormWaves.perStack 0.2` (`src/data/proto.ts`) doubles waves at 8:00. Merges turn those waves into Elders at ×6.25 damage, and at 5 stacks the Heartcap takes +100% damage while turrets lose 50% (SPEC §6.4).
- **Why it hurts fun:** the first 7 minutes are prelude, and the ending feels arbitrary.
- **What to look at:**
  - Step B's **`breach`** prototype (`src/data/proto.ts`, PROTO_PRESETS.breach) is built for exactly this. At ⅔ and ⅓ Heartcap HP it fires a pulse, a shield, +150 gold and a ready power, and it halves the storm's Heartcap scaling. Presets combine, so it can be playtested as `?proto=rework,breach`.
  - Also consider a gentler `stormWaves` (for example 0.1), or capping wave growth.

### 2. The balance of power is invisible, and territory (the visible score) points the wrong way

- **What's missing:** an enemy army readout. There is no enemy supply, unit count or Elder count on the HUD.
- **How territory misleads:** I led 27–13 columns at 7:08 of run 1 and lost by Rout at 7:47. In the sandbox I won while behind 12–19.
- **Why the front misleads:** marching waves don't capture (SPEC §4.3's 3-second rule), so the front line records where fights stalled, not who is stronger.
- **Suggestions:**
  - Show both sides' supply, or an "army strength" tug beside territory.
  - Warn when the next enemy wave out-sizes yours ("Big wave: 31 units").
  - Let a passing wave's presence count toward capture.

### 3. "Mass the cheapest spawner" is the dominant strategy, and waves plus merging amplify it

- **The same seed, three builds:**

  | Build | Result |
  |---|---|
  | Mono Sporeling | Won 8:37 |
  | Mono Drift Stalk | Won 9:04 |
  | Sporeling + Veilstalker + Scythecap + Rhizomorph | Lost 6:54 |

- **Merge gaps in my runs:** 20 Elders to 0, and 40 to 14. Equal gold bought nearly 2× the units, because the side ahead never loses a building (enemy buildings lost: 0, 0).
- **Why:** waves force near-universal merging, so a body-count edge becomes a tier edge (×6.25).
- **What it means:** the measured G3 failure (Sporeling 83/86) is what a player will feel first.
- **Directions:**
  - Make merges cost something under waves (knit time is lost in a beat), or cap Elders.
  - Give mixed waves something stronger than a one-time 20% shield.

### 4. A mono-flyer army wins with zero decisions, and two systems feed it

- **What happened:** mono Drift Stalk razed Mother Mold while holding 4 columns.
- **What fed it:**
  - The general read flyers as a Swarm and built Sporeling Burrows against them; melee does ×0.5 to flyers.
  - **Comeback income paid the flyer army 247 gold** for never holding ground: `min(6, floor(deficit/2))` per tick, `src/sim/systems/economy.ts:62`.
- **Fixes to consider:**
  - Flyers excluded from the comeback calculation, or comeback keyed to army value or Heartcap rather than columns.
  - The general's Anti-Air counter (flyers.md).
  - A visible "half damage" or "can't hit" cue.

### 5. Battle 1 is a run-ender, and a Rout loss always ends the run, so runs are binary

- **What I saw:** my 2 of 2 runs ended in battle 1, as did 7 of 7 `bot:balanced` autoplay seeds under `rework` (5 of 7 on M5 rules).
- **Why the run feels binary:**
  - A Rout loss sets the Heartcap to 0 and nearly every battle ends in a Rout, so carry-over HP, the Grove's repair and Decision penalties rarely matter.
  - A lost run awards nothing: 0 Spores and no XP.
- **What to consider:**
  - The `hotstart` prototype (a free deploy draft, and the battle-1 general on ¾ income), playtested as `?proto=rework,hotstart`.
  - Letting a Rout loss cost a fixed share of the Heartcap rather than all of it.
  - A small consolation reward per battle survived, or per minute held.

### 6. Hold lost its tactical meaning under waves, and stored units don't defend their own building

- **What I saw:**
  - Hold now only skips one release (`movement.ts:60` skips the rally under waves). There is no recall or regroup once a wave is out.
  - Units stored inside a besieged spawner stay inside until the beat (run 1: 4 Sporelings inside a Burrow that went 450 → 186 HP).
  - The lane label truncates ("Keeping th…", `b1_hold.png` (not kept)).
- **Suggestions:**
  - Release stored units when their building is hit.
  - Add a "send now" or "recall" action, so the beat becomes a decision rather than a timer.

### 7. Drafts are thin and repetitive

- **What I saw across 8 offers and 3 rerolls:**
  - mostly +15% stat cards;
  - offers repeated within one battle (run 2's draft 3 equalled draft 2's first offer exactly);
  - Thick Caps appeared 4 times and Quick Roots twice;
  - an upgrade for a destroyed building was offered.
- **What changed plans:** only Elder's Patience and the Scythecap blueprint.
- **Why:** SPEC §11.7's "broken run engines" depend on M6 strains that aren't built.
- **Suggestions:**
  - Dedupe offers within a battle.
  - Add wave-native cards, as combat-rework.md's "Waves give perks something to act on" suggests: an extra Hold beat, stronger mixed-wave shields, a wave that leaves early, a burst on release.

### 8. Commander identities overlap the rework

- **Cordis:** the passive (faster, wider merges) is redundant when waves already merge nearly everything. Puppet Bloom doesn't chain, so Bloomed don't become Elders unless already grouped within 3 tiles (`r2b1_puppet3.png` (not kept)), and it does little at storm 5, when it should shine.
- **Vesper:** Spore Burst felt great.
- **Armilla:** not tested.
- **Suggestion:** retune Cordis for waves. For example, Puppet Bloom pulls units together and chains merges, or it acts on the stored wave.

### 9. Readability gaps

- **"Wave" means two things** (the 1-minute "Wave 4" vs the 20 s "Next wave"). Rename one, for example "Round", "Minute" or "March".
- **Flyer hit rules are invisible.**
- **The Rhizomorph's burrowed mound is easy to miss.**
- **Merged clumps of 5 to 10 units are hard to parse** (`b1_t433.png` (not kept)).
- **The general's counter text** ("countered your Swarm with Sporeling Burrow") doesn't teach a counter.
- **The game resumes unpaused after a draft pick** if you were running before it. Fine for most players, but a strategist will want an option to stay paused.

### 10. The territory and Decision layer is disconnected from the fight, and the Rhizomorph adds nothing

- **The front moves only where fights stall.** Forward building never became relevant, and a Decision would have gone to whoever happened to stall further forward.
- **The Rhizomorph doesn't help.** It tunnels past the line, surfaces at the enemy base, and dies to the turrets.
- **This connects to open playtest items:** F1 (forward building isn't worth it), F6 (capture is awkward) and F16 (no home-ground benefit).
- **Suggestions:**
  - Let wave presence capture.
  - Give owned ground a combat or economy effect (F15, F16), so territory carries strategy rather than being a tiebreak.
  - Drop the Rhizomorph or give it a job (for example, it ignores the capture rule and flips a column where it surfaces).

---

## 7. Suggested next experiments (cheap, using what's already built)

1. **Playtest `?proto=rework,breach`.** Does a ⅔ / ⅓ Heartcap breach turn the 6-second collapse into a fight back? (Problems 1 and 5.)
2. **Playtest `?proto=rework,hotstart`** for battle-1 survival, and re-run the autoplay check on more seeds. Quick in the browser: `?scene=route&seed=N&autoplay=battles:1&proto=rework…`. (Problem 5.)
3. **Measure `stormWaves.perStack:0.1`** with G3 and G4:

   ```bash
   npm run experiment -- --proto rework,stormWaves.perStack:0.1 --checks g3,g4
   ```

   (Problems 1 and 3.)
4. **Measure comeback with flyers excluded,** or keyed to army value. A one-line rule change, but it needs the user's OK under `.claude/rules/balance.md`. (Problem 4.)
5. **A HUD-only change, no sim change:** an enemy supply chip, an Elder count, and a "big wave incoming" callout fed from the stored-unit counts the beat chip already reads. (Problem 2.)
6. **Release stored units when their building is hit.** A small sim rule; needs approval. (Problem 6.)
