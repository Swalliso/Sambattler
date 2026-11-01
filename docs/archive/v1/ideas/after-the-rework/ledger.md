# Ledger of earlier fun and engagement recommendations

> **Archived: v1 era.** Written before [SPEC v2](../../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../../README.md)).

Built 2026-10-31 against `develop` at `ef2e133` for [After the combat rework](../after-the-rework.md), which cites its IDs. It lists every fun recommendation made so far and what became of it, so a session doesn't re-propose what was tried, rejected or already queued, and can see which diagnosed problems still have no answer. **Nothing here is adopted;** statuses are as of `ef2e133`.

**Sources read** (paths are relative to the repo root):
- `docs/archive/v1/engagement-review.md` (ER, 2026-10-28, incl. prototype E1)
- `docs/archive/v1/ideas/one-more-run-review.md` (OMR, 2026-10-30, incl. steps A, B, second front, decisions)
- "Spore and Sprawl: Design Review and Roadmap to One More Run" (DR, the external design review; brought into the repo on 2026-10-31 as [`docs/archive/v1/ideas/one-more-run-design-review.md`](../one-more-run-design-review.md); written from PR descriptions only, and checked in the [One More Run review](../one-more-run-review.md))
- `docs/archive/v1/ideas/colony-swarm.md` (CS, 2026-10-29/30)
- `docs/playtest-feedback.md` (F1–F16)
- `docs/status.md` (hand-over page, updated 2026-10-31)
- `docs/archive/v1/balance-backlog.md` (BB: opening tables, round 2, Step A, Step B, G3 rewrite, second front, counter matrix, P1–P2 conclusions and "After P2")
- `data/CHANGELOG-balance.md` (first ~260 lines: rework, G3 rewrite, M5, Hold adoption)
- `docs/archive/v1/ideas/rounds.md` (RD, summary, run layer, recommendation, questions)
- `docs/archive/v1/ideas/combat-rework.md` (CR: intro, options, P3/P4, run variety, decisions), `docs/archive/v1/ideas/flyers.md` (FL: recommendation, general, questions)
- SPEC §1 (pillars, §1.1, §1.2), §6.4–6.5, §7.5–7.6, §8, §9, §10.4, §11.5–11.12, §12, §13.9, §16 M6–M8, §17, §18
- `docs/archive/v1/ui-ux-plan.md` (UI: Phase 1, Phase 3, clarity pass, decisions) and `docs/archive/v1/m5-plan.md` kickoff, for statuses of ER-7 and ER-5
- **Extra, outside the brief:** `docs/fun-and-agency-research-2026-10-29.md` in a Codex worktree (CX), a Codex note the OMR says is still uncommitted; brought into the repo on 2026-10-31 as [`docs/archive/v1/ideas/fun-and-agency-research.md`](../fun-and-agency-research.md). It was the one prior fun review whose ideas had never entered the repo, so it is in the ledger (section 1.9). Treat it as unreviewed.

**Status keys** (one per row; qualifiers go in the evidence column):
`adopted` · `built, off, awaiting playtest` · `in P3 playtest` (built default-off inside `?proto=rework`) · `measured and failed` · `parked` · `rejected` · `planned (M6/M7/M8)` · `never addressed`

---

## 0. The short version

- **What actually shipped from all the fun reviews:** Hold / Advance (2026-10-28), the UI/feel/clarity passes (sound, puffs, framing, tooltips, tips, spawn timers, coin pops), G3 on every map, and measurement tools (`engagement`, `runs`, `spread`, `counters`, `lanes`). Everything else is a default-off prototype, a paper design, parked, or never touched.
- **Built and waiting for a playtest that hasn't happened:** Step B's `hotstart`, `bigdrafts`, `breach` (status "Waiting on the user" #5). They are **not** in the `rework` preset (`src/data/proto.ts` lines 216–223), and their numbers were measured on M5 rules, not under the rework.
- **In the P3 playtest now:** the combat rework package (`?proto=rework`): waves, mixed-wave shields, pinning, call for help, Rhizomorph, Burster, Elder splash off, storm-grown waves, swarm read, flyers under rule C.
- **Parked behind the rework:** everything about placement (the network, colony-swarm, step C, terrain) and the run-variety design CR promised "for M6, after P2".
- **The biggest never-addressed problems** (section 4): no comebacks (0 in 360 battles today and under the package); the winner's Heartcap is never touched, so run HP is binary and repairs are dead; territory has no payoff and under the package being behind is an *advantage* (G6 88%); placement is noise; the boss is the easiest fight (60 of 64 won under the package); the general's adaptation is not a moment the player can answer; draft cards are small; merging is not a decision and gets more automatic under waves; late gold has nowhere to go; onboarding beyond tips; the route doesn't branch; no voice or memorable moments.

---

## 1. The ledger

### 1.1 Engagement review (ER), `docs/archive/v1/engagement-review.md`, 2026-10-28

| id | Recommendation | Source | Status | Evidence |
|---|---|---|---|---|
| ER-1 | Per-lane Hold / Advance timing verb (units gather behind the frontier until released; time limit) | ER rec 1; E1 | **adopted** | 2026-10-28, `laneStance` in `data/balance.json` line 70; CHANGELOG "Adopted: E1"; SPEC §1.2 "Unit control". First flip 2:16–4:14 → 0:34–1:29; commands/min 1.3 → 2.1–2.6. Costs: mono Sporeling 40 → 65%, G7 Slayer 56%, boss reach 25 → 11% |
| ER-1b | Alternative that keeps units autonomous: a gold-cost "Surge" that fires every spawn timer in a lane at once | ER rec 1 | never addressed | Superseded by Hold; never prototyped |
| ER-1c | "Held units could answer anything that hits a building behind them" (ranged counter-play rule) | ER E1 verdict | in P3 playtest | Became `callForHelp` (CR package; P2: "keeps G2 healthy") |
| ER-2a | Drop or cap the Sporestorm's Heartcap damage bonus (+20%/stack, ×2 at 5) | ER rec 2 | built, off, awaiting playtest | `breach` sets `sporestorm.heartcapTakenPerStack` 0.10. Step B: the storm term moves the fall only ±3–4 s. Shipped data still 0.20 (`data/balance.json` line 43) |
| ER-2b | Breach moments at ⅔ and ⅓ HP (callout + defensive pulse) | ER rec 2 | built, off, awaiting playtest | `breach` preset: 150 Crush pulse, shields (⅔: 10 s ×0.5; ⅓: 20 s ×0.25), power ready, +150 gold. Fall 18 → 45 s, ⅔→dead 9 → 35 s; comebacks 2 in 360; G4 7:51 / 12% (BB Step B) |
| ER-2c | In runs, a Rout loss costs 40–50% of run HP instead of ending the run (unless HP is low) | ER rec 2 | never addressed | Step B rec 2 names it as "the next prototype"; RD Q3 proposes one Heartcap pool for the run on paper. SPEC §6.5 still: Loss by Rout → 0, run ends |
| ER-2d | Enemy-held columns on your side slowly drain run HP even in battles you win (ties territory to the run) | ER rec 2 | never addressed | Nothing in BB, OMR, CR or SPEC |
| ER-3a | Start hot: more starting gold, faster first spawns, or a shorter clock | ER rec 3 | built, off, awaiting playtest (partly) | `hotstart` = deploy draft + general's battle-1 income ×0.75. "+100 player gold" variant measured (20.3% battle-1 loss). Faster first spawns and a shorter clock never tried (Fresh Spores relic exists) |
| ER-3b | Flip the difficulty curve: battle 1 gentlest | ER rec 3 | built, off, awaiting playtest | `hotstart` battle-1 losses 33 → 17.7%; Mold out of battle 1 (`appearsIn` [1,2,3] → [2,3]) 6% but battle 2 37%: "the user's call" (BB Step B). `data/generals.json` unchanged |
| ER-3c | Flip the difficulty curve: the boss the hardest fight | ER rec 3 | never addressed | Boss fights won: 72 of 105 today, 85% with all Step B knobs, 60 of 64 under the P2 package (BB P2 runs). Step B rec 4: "a harder boss is a retune for after the playtest" |
| ER-4a | Make held ground pay: mat income per contested column held | ER rec 4 | never addressed (commander-only version adopted) | Armilla's Rhizome Tithe (+30 gold per column past home) adopted 2026-10-30 (CHANGELOG M5). No general rule |
| ER-4b | Lower supply-line rate (F1) | ER rec 4 | never addressed | `supplyLinePerColumn` 0.05 unchanged; Forward Spores relic halves it (uncommon) |
| ER-4c | A forward-only perk (e.g. faster spawns on fresh soil) | ER rec 4 | never addressed | Echoed by DR Fed/Starved and CS terrain (parked) |
| ER-5a | Fewer, bigger drafts: 2–3 per battle | ER rec 5 | built, off, awaiting playtest | `bigdrafts`: waves 2 and 5, take 2 of 4, +10 rare. Runs won 24 → 28%. "Bigger has to mean more picks, not rarer cards" (BB Step B). M5 kickoff: "M5 exactly as specced, with no draft rework" (`docs/archive/v1/m5-plan.md`) |
| ER-5b | Make rule-bending relics (Spore Cloud, Martyr's Bloom) the draft's substance | ER rec 5 | never addressed | Still rare (5% in battle 1, SPEC §8.3); 21 relics, 6 rare (`data/relics.json`). Step B: "rule-bending relics, mutation cards and signature upgrades are new content, out of scope" |
| ER-5c | Pull strain-style "mutation" cards (Volley, Bursting, Teeming) forward as draft cards | ER rec 5 | planned (M6), but as meta strains, not drafts | SPEC §11.5 strains are chosen before a run in M6; never offered as in-battle cards |
| ER-5d | Signature level-3 upgrades | ER rec 5 | never addressed | §11.6 L3s exist ("signature boost") but are still mostly stat (+1 per spawn, +25% vs structure) |
| ER-6a | Counters arrive as a visible doctrine wave: burst of units, banner, doctrine-specific buff | ER rec 6 | never addressed | UI Phase 1b only made the warning readable (kind, wave pips, countdown, `docs/archive/v1/ui-ux-plan.md`). Telegraph stays vague by interview decision (§1.2) |
| ER-6b | The warning offers a free 1-of-3 "answer" pick | ER rec 6 | never addressed (close to an interview-rejected idea) | SPEC §18.2 Q4: an opt-in "answer card" assist was "the interview's rejected alternative", kept as a possible accessibility setting |
| ER-6c | Tie counters to an asymmetric Gray Rot so they look different | ER rec 6; ER M7 row | never addressed | SPEC §11.12 still "mirrors the Velvet Bloom's roles … +10% HP and −10% speed"; CR "What waits": the Gray Rot will need its own versions of the new tools |
| ER-7a | Scale the battlefield up to use the empty screen height | ER rec 7 | rejected (done differently) | UI B1 / Phase 1a (2026-10-29): integer scale kept, the void framed with roots ceiling, soil bed, ambient spores. Units still ~8 px at 1280×800 |
| ER-7b | Hit-stop and impact flashes | ER rec 7 | never addressed | No code (`grep -ri hitstop src` empty). Hit sparks tinted by effectiveness exist since M1 (§10.4) |
| ER-7c | Pull M8's spawn and death puffs forward | ER rec 7 | adopted | UI Phase 3 (2026-10-29): spore-mote puffs (§10.4) |
| ER-7d | Give Elder births and Heartcap breaches a beat | ER rec 7 | adopted (partial) | Fuller merge sound for an Elder (§13.9); screen shake on Heartcap hit, **off by default**; breach callout and ring only under `breach` |
| ER-7e | Reconsider SFX (§17 #18) | ER rec 7 | adopted | SPEC §13.9, PR #13, synthesized WebAudio. (SPEC §17 #18 and D15 still say "no audio": stale) |
| ER-8a | Engagement numbers in the sim and every milestone's verification | ER rec 8 | adopted as tools only | `--checks engagement,runs` (`tools/lib/engagement.ts`), commander-aware since Step A, comebacks and ⅔/⅓ timings since Step B. Not in SPEC §12.3 nor in M6–M8 verification |
| ER-8b | A feel-based playtest gate ("When were you bored? When did you feel clever?") | ER rec 8 | never addressed (formally) | P3 has four feel-ish questions (CR §P3). No standing gate; the phrase appears only in ER |
| ER-9 | A "M4.5 battle feel" milestone before M5, gated on first flip < 1:30, 10+ supply by 2:00, Heartcap fall ≥ 45 s, battle-1 run deaths < 20% | ER "Proposed sequence" | rejected (overtaken) | M5 built 2026-10-29 "exactly as specced". On 2026-10-30 the user paused before M6 for steps A–C, then the rework |
| ER-10 | Re-sequence: Gray Rot and counters (M7) before meta (M6) | ER "Proposed sequence" | never decided | ER: "Decide after the M4.5 playtest". Status: M6–M8 content waits on P4 |
| ER-11 | Re-measure G3 under Hold before archer fixes | ER rec closing | adopted | Done (G3 65% Sporeling); later the counter matrix showed Hold gave archers answers (BB "D1 before and after Hold") |

### 1.2 External design review (DR), [`docs/archive/v1/ideas/one-more-run-design-review.md`](../one-more-run-design-review.md), ~2026-10-30

| id | Recommendation | Source | Status | Evidence |
|---|---|---|---|---|
| DR-1 | Muster/pack spawning for melee (Burrow sends 4 at once, Capguard 2) | DR §5.3 | measured and failed | Tried four ways (M1 batch size, synced spawns, muster at 8; Hold muster at 12): 85–100% mono Gill Nest (OMR "Wrong or misread") |
| DR-2 | Range ceiling: base range 4.5, hard cap 6.0, convert excess to damage | DR §5.3 | measured and failed (base range) / never addressed (cap) | M1 ranges 4.5–3: 78–100%. OMR: a cap can't move G3 (max range 7.25 today; G3 battles have no upgrades); "might matter later, for runs" |
| DR-3 | Capguard Cap Shield absorbs 3 Pierce hits | DR §5.3 | rejected | OMR: archers are *meant* to beat Capguards; the shield would let Capguards beat both their counters |
| DR-4 | Veilstalker burrow-leap onto ranged units (a diver) | DR §5.3 | measured and failed | Step A `diver`/`diverleap` presets (off): helps only Twin Roots with a Hollow-opening defender; on Morel it creates a mono Morel takeover. Burrowing later returned as the Rhizomorph |
| DR-5 | Puffball Mortar +50% vs clumps of 3+ | DR §5.3 | measured and failed / superseded | M1 "stronger Mortars" no effect. P1b aimed Mortar clouds at the densest cluster; the user removed Mortar clouds from `rework` at P2 (Decisions) |
| DR-6 | Replace G3 with diversity metrics: mono ≤ 60%; ≥ 6 archetype bots each 40–75%; top pick share ≤ 25%; build entropy | DR §6 "Replace G3" | adopted in part / never addressed | G3 rewritten to every map, mean ≤ 55 and worst ≤ 60 (user-approved 2026-10-30). Counter matrix "sits beside G3, not in its place" (CR Decisions). Archetype bots, pick share, entropy: never built (bots are fixed-weight profiles) |
| DR-7 | Hyphal links: +10% spawn rate per linked neighbor, max 3; Mycorrhizal Link becomes a base rule | DR §5.2.1 | rejected as written / parked | OMR: a packed 8-plot home gives everyone a flat +20–30%; percentages are "what didn't work before"; Mycorrhizal Link below the spread tool's noise floor |
| DR-8 | Always-on link threads and Backpack-Battles hover stars (render-only quick win) | DR §5.2.1, §6 quick win 5 | parked | OMR "Keep"; CS "Hovering a plot previews what would light up". Not built; only Mycorrhizal Link got a card diagram (clarity pass) |
| DR-9 | Colonies + 8 keywords (Spore, Cap, Gill, Rot, Root, Glow, Parasite, Truffle) with tiers at 2/4/6 | DR §5.2.2 | parked | OMR: "about eight systems at once"; everything at home is one colony; start with CS's cheapest test |
| DR-10 | Fed vs Starved forward buildings via Rhizome tiles (no surcharge, +25% spawn forward) | DR §5.2.3 | parked | OMR "Keep … answers F1 better than a cheaper surcharge". BB second-front "forward buildings worth defending" sketch (not built) |
| DR-11 | Living soil: loam universal (spawners +1 merge progress, towers +15%) | DR §5.2.4 | parked | Step C parked behind the rework (CR "What waits") |
| DR-12 | Compost: 6 deaths on a tile turn it to loam | DR §5.2.4 | parked | OMR "Keep … a reason territory matters"; needs a mutable soil layer |
| DR-13 | Loam depletion; deadwood stumps feed Rot keyword | DR §5.2.4 | parked | No follow-up anywhere |
| DR-14 | Formations: Fairy Ring aura, Spore Column (3 in a row send a squad), Colony Heart | DR §5.2.5 | rejected (Spore Column) / parked (rest) | OMR: "Spore Columns duplicate Hold" |
| DR-15 | Lane soil identity per map (Wet, Dry, Deadwood) | DR §5.2.6 | parked | CS "Terrain (Civilization VI)" carries the idea |
| DR-16 | 8 archetypes incl. 3 deliberately broken engines; drafts themed by the colony's dominant keyword (2 fits + 1 wildcard) | DR §5.4 | parked / never addressed (themed drafts) | OMR: "After the network test proves placement can matter"; SPEC §11.7 already lists 3 "rare broken run" engines. Names clash (Mother Mould, Puppet Pod) |
| DR-17 | Example relics: Anastomosis, Fruiting Rain, Antibiotic Ring | DR §5.4 | never addressed | — |
| DR-18 | Open, rewarding counters: a banner names the counter ("Gillbreakers in 2 waves"); beating an active counter grants a bonus draft card | DR §5.5 | parked → never addressed | OMR: "Yes, after the network test. It's M7 territory." Conflicts with the interview's vague telegraph (§1.2) |
| DR-19 | Intel file as a nemesis log on the run summary ("it learned you love archers") | DR §5.5, §5.7 | never addressed | Summary (`src/ui/screens/run.ts` `summaryScreen`) shows battles, cards, damage, Spores/Amber/XP; no intel |
| DR-20 | Bosses as build exams with known rules | DR §5.5 | never addressed | The Pale Sovereign is a dual doctrine (§7.6) |
| DR-21 | Bound counter strength so an assembled engine still wins 70–80% at Decay 0 | DR §5.5 | never addressed | — |
| DR-22 | Battles about 4–5 min, 7 min cap | DR §5.6 | rejected for now | OMR: "Later. A shorter battle with today's Heartcap cliff is worse." G4 band 5:30–8:30 unchanged; the package's median is 8:04 |
| DR-23 | A draft after every wave (~45 s waves) | DR §1, §5.6 | rejected | OMR: "Disagree. The problem is card size, not card count, and each draft holds the sim" |
| DR-24 | Hot start: a free pick from 3 starting buildings at 0:00; first meaningful choice < 30 s | DR §5.6 | built, off, awaiting playtest | `hotstart` deploy draft. Step B: "a decision, not a lever" (battle-1 loss 33 → 31% alone) |
| DR-25 | Runs of 20–25 min (5 battles + events) | DR §5.6, Q2 | never decided | DR Q2 unanswered. Bot runs average 10–19 battle-minutes, and runs that reach the boss a median 20–25 (BB Step A, Step B, P1); human run time unmeasured (OMR "Stale") |
| DR-26 | Heartcap last stand at 25% (shield + free Spore Burst) | DR §5.6, quick win 3 | built, off, awaiting playtest | `breach`'s ⅓ last stand (20 s ×0.25, `readyPower`, +150 gold) |
| DR-27 | Battle 1 tuned to ≥ 85% wins | DR §5.6, P1 | built, off, awaiting playtest (82%) | `hotstart` 82%; with Mold out 94% (user's call). Under the package battle-1 losses *rise* (79 → 108 of 240) |
| DR-28 | Horizontal unlocks that teach: one keyword per run (Spore, Cap first) | DR §5.7 | never addressed | OMR: "a good answer to F8". SPEC §9: "Until Milestone 6 there is no gating"; M6 feats unlock content but aren't designed as a teaching ladder |
| DR-29 | Commanders as rule-benders / build anchors with mastery 2–10 | DR §5.7 | planned (M6) | SPEC §9.5, §16 M6 |
| DR-30 | Keep feats, traits (cap vertical power), strains as archetype anchors, Decay as the Heat ladder; ~50% content by run 15 | DR §5.7 | planned (M6, M7) | §9.8 pacing; G9 caps traits at +15 points; Decay M7 |
| DR-31 | Collection codex (buildings, tiers, formations discovered) | DR §5.7 | never addressed | Not in §16 M6–M8 |
| DR-32 | Run summary: best colony diagram, "most broken moment" (peak multiplier), nemesis log, next-unlock progress bar | DR §5.7, quick win 4 | never addressed | Summary has "Feats: none yet (Milestone 6)" and "Decay 0" rows |
| DR-33 | One keypress starts the next run | DR §5.7, quick win 4 | never addressed | OMR: "One-key restart is a quick UI win". Summary has a "New run" button (`#new-run`), no key found |
| DR-34 | Spore Trials: seeded 72 h challenge, local/friends leaderboard | DR §5.7, P7, Q5 | rejected (out of scope) | §17 #1 (no backend/leaderboards), #15 (no daily-seed UI). OMR: a local-only version is cheap; "Defer" |
| DR-35 | Skip daily quests, login streaks, idle accrual | DR §5.7 | adopted (as a non-goal) | Consistent with §17; nobody proposes them |
| DR-36 | Revised pillars: "the colony is the build", "the general tests you openly", "break it on purpose" | DR §5.1 | never addressed | SPEC §1 pillars unchanged |
| DR-37 | A different placement rule per faction/commander (There Are No Orcs) | DR §3 | never addressed | CR's 9 Kings table suggests per-commander kits (M6 exclusives), not placement rules |
| DR-38 | Humor and voice; a "Mycelial Gazette" event feed; a Gray Rot nemesis character | DR §7, Q4 | never addressed | DR Q4 unanswered |
| DR-39 | Direction B, rounds hybrid, as a fallback behind a flag | DR §4 | parked | `docs/archive/v1/ideas/rounds.md` paper design; CR Level 3 fallback |
| DR-40 | Direction C, full board autobattler | DR §4 | rejected | DR: "Don't. It would compete directly with 9 Kings and Hivemind" |
| DR-41 | Change the balance philosophy from "no build survives on autopilot" to "some builds break the game"; don't balance toward flatness | DR §1.3, §2, §7 | adopted in spirit (partial) | The user's counter-matrix framing ("a strong build isn't the bug, a build with no answer is", CR "The problem"); §12.1 "Rare broken runs are welcome. Forced ones are not" unchanged |

### 1.3 One More Run review (OMR), `docs/archive/v1/ideas/one-more-run-review.md`, 2026-10-30

| id | Recommendation | Source | Status | Evidence |
|---|---|---|---|---|
| OMR-1 | Step 0: settle the colony-swarm direction before M6/M7 content is written | OMR "Suggested path" | adopted (as a pause) | Decisions 2026-10-30: "Pause before M6. Steps A–C come first." |
| OMR-2 | Step A: G3 on every map (40→100 games) | OMR step A | adopted | G3 rewrite (SPEC §12.3, CHANGELOG 2026-10-30) |
| OMR-3 | Step A: trace why Twin Roots differs | OMR step A | adopted (done) | Splitting: the defender's second lane keeps producing; concentration takes mono Gill Nest 63 → 78–94% (BB Step A) |
| OMR-4 | Step A: commander-aware `runs` and `engagement` checks | OMR step A | adopted (tool) | `--commander`, `--power-policy` |
| OMR-5 | Step A: placement-spread tool, baseline today's rules | OMR step A, from CS | adopted (tool) | `--checks spread`. Baseline: best plot = median at 1:00, ~25% of a building at 3:00, split-half ρ 0.2–0.3; signal is "don't build forward" |
| OMR-6 | Step B: breach, hot start, bigger drafts as prototypes | OMR step B | built, off, awaiting playtest | See ER-2b, ER-3a, ER-5a. Recommended playtest: `?proto=hotstart,bigdrafts`, and `?proto=breach` separately |
| OMR-7 | Step C: network test on Bogwater, 3–4 "which neighbor" rules, ≥ 2 changing what units do; hover stars; general's placement scores; bar ρ ≥ 0.6–0.7 | OMR step C | parked | "On 2026-10-30 this was put behind a combat rework: placement tests mean little while one unit type wins alone." Needs §17 #11 changed (user open to it) |
| OMR-8 | Step B follow-up: a comeback moment earlier in the collapse (a trigger at half the base lost; a defensive rally) | BB Step B "What a real comeback would need" | never addressed | Bots: loser has ~1 building and 0 units when its Heartcap is first hit; collapse takes ~35 s |
| OMR-9 | Step B follow-up: a harder boss once the early battles are gentler | BB Step B rec 4 | never addressed | See ER-3c |
| OMR-10 | A second front for one-lane maps (more two-lane maps) | OMR step A "What this suggests" | measured and failed | Second-front test: 2×4 rows 80–85%, Twin Roots shape 62–67%, mono Amanita takeover 58–73%. "On these numbers, the recommendation is no." Still formally "the user's call" |
| OMR-11 | One-lane options: forward buildings worth defending; flank orders (edge-row path past the front) | BB second front "Options that keep one lane" | never addressed | "Sketch, not built" |
| OMR-12 | Bring Codex's two notes and the design review into `docs/ideas/` | OMR "Still open" | adopted (done) | 2026-10-31, imported at the user's request: [one-more-run-design-review.md](../one-more-run-design-review.md) (DR), [fun-and-agency-research.md](../fun-and-agency-research.md) (CX) and [symbiotic-colonies-slice.md](../symbiotic-colonies-slice.md). Nothing in them is adopted |
| OMR-13 | Rules must care about *which* neighbor (front/behind/beside, keyword pairs), not how many; transformations, not percentages; the general must play by them | OMR "The network design: rethink" 1, 3, 4 | parked | Folded into step C (parked) |
| OMR-14 | Cut systems alongside adding them (forward price, upgrade tracks, interest/Spore Exchange, capture rule) | OMR rethink 2, citing CS cut list | never addressed | See CS-10 |

### 1.4 Colony and swarm notes (CS), `docs/archive/v1/ideas/colony-swarm.md`, 2026-10-29/30

| id | Recommendation | Source | Status | Evidence |
|---|---|---|---|---|
| CS-1 | Neighbor rules printed on the card, no wiring; hovering a plot previews what lights up | CS "Ideas" | parked | Behind the rework (CR "What waits"); §17 #11 still excludes core adjacency |
| CS-2 | Use the lane's direction: in front / behind / beside a spawner mean different things | CS "Ideas" | parked | — |
| CS-3 | Transformations, not percentages (Burrow+Cellar: Sporelings drop coins; Mortar behind Gill Nest: splash shots; L of Burrows: spawn merged) | CS "Ideas" | parked | Spread tool: Mycorrhizal Link's +13% is below the noise floor |
| CS-4 | One multiplying layer of relics ("+1 to every neighbor effect", "corners count") | CS "Ideas" | parked | — |
| CS-5 | Thematic feedback: mycelium threads, a pulse when an effect fires, the mat thickening | CS "Ideas" | parked | Same as DR-8 |
| CS-6 | Terrain kinds that change what units do (fallen log, damp seep, carrion), placed in contested ground so capture claims them | CS "Terrain" | parked | BB second-front sketch "forward buildings worth defending" cites it |
| CS-7 | Bigger swarms (supply cap is a design choice, 5× tick headroom), a taller map, a camera/zoom plan | CS "Swarms" | parked (partly arrived) | Under the package supply at 5:00 rises from 21–31 to 33–48 and merges ×2–4 (BB P2). Cap still 60; no camera |
| CS-8 | "Replant last layout" button at deploy, or a deploy budget big enough for the core engine | CS "The colony across a run" | never addressed | — |
| CS-9 | An "heirloom" building that starts each battle planted (mastery or relic) | CS (user's idea) | parked (M6 candidate) | Not in SPEC §9.5 |
| CS-10 | Cut list: forward price (§6.3); upgrade tracks → draft-again leveling (reverses §17 #12); interest and the Spore Exchange; the capture rule | CS "What it could simplify" | never addressed | All four unchanged in SPEC |
| CS-11 | Placement-spread measurement (Hivemind's puzzle generator) | CS "Worth copying" | adopted (tool) | OMR-5 |
| CS-12 | Building merges that land where the last piece drops | CS "Worth copying" | never addressed | — |
| CS-13 | Announced upcoming offers (from the [Codex slice](../symbiotic-colonies-slice.md)), so leaving a slot open is a plan | CS "Worth keeping" | never addressed | — |
| CS-14 | Splash damage as the natural answer to clumped swarms and archers | CS "Swarms" | in P3 playtest (as the Burster) | Burster bursts + clouds deal 12–19% of a user's damage (BB P2); Mortar clouds removed |
| CS-15 | Live numbers on buildings computed by the sim's own modifiers (Hivemind's badges) | CS "What fits" | parked | — |

### 1.5 Playtest feedback (F1–F16), `docs/playtest-feedback.md`

| id | Feedback / ask | Source | Status | Evidence |
|---|---|---|---|---|
| F1 | Forward building isn't worth it; surcharge too steep for the reward (reported twice) | M1 gate 2026-10-26; round 3 2026-10-29 | never addressed (rule) | Explained in UI only (Economy tab, ghost tip). Rule "waits on the user". Spread tool: forward Nests score worse (ρ −0.80) |
| F2 | Gill Archers are the best unit | M1 gate | in P3 playtest | Under the package mono Gill Nest 51 / 54 (passes); the problem moved to Sporeling, Veilstalker, Drift Stalk |
| F3 | "Did losing forward buildings feel fair and readable?" unanswered | M1 gate | never addressed | Needs a playtest where someone builds forward; blocked by F1 |
| F4 | A player never noticed economy buildings | 2026-10-28 | adopted (UI) | Economy first in tray, role tags, battle-1 Cellar tip; gold tooltip |
| F5 | Tray cards hard to read; need tooltips | 2026-10-28 | adopted (UI) | Card summaries + full tooltips |
| F6 | Units capture columns awkwardly; one tester ignores territory and "hopes"; the other doubts capture is the right design | 2026-10-28; round 3 | never addressed (rule) | Hold adopted; territory tooltip and tip. "The rule waits on the user" |
| F7 | Buildings need more feedback (coin pops) | 2026-10-28 | adopted (UI) | Coin pops, spawn-timer bars; sound since §13.9 |
| F8 | Too much to learn; no tutorial | Round 3, 2026-10-29 | adopted (tips) / never addressed (tutorial, staged unlocks) | Clarity pass. "Onboarding beyond tips (a tutorial battle, staged unlocks) is open". CR brief: F8 "isn't a constraint … onboarding can be revisited later". M7 plans only "first-run tutorial hints" |
| F9 | Drafts and spoils offer the same kinds of cards; tester expected them to differ | Round 3 | never addressed (design) | Spoils screen now labels them. "Whether they should differ waits on the user" |
| F10 | The route doesn't branch (all-to-all); wants to hover a node and see paths | Round 3 | never addressed | SPEC §8.2 / D21 by design. CX parked idea "commit to a route consequence" |
| F11 | Elites don't reward enough for the difficulty | Round 3 | never addressed (size) | Elite nodes now show their reward; size waits on the user |
| F12 | Can buildings be repaired? | Round 3 | never addressed | — |
| F13 | Puffball Mortar under-tuned: range too short, dies easily | Round 3 | never addressed (directly) | P1 gave the Mortar range 7 + clouds; removed from `rework` at P2. Shipped Mortar unchanged; mono Mortar G3 6% |
| F14 | Defensive buildings smaller than 2×2 for gaps | Round 3 | never addressed | D5 "every v1 building is 2×2" |
| F15 | A building that spreads the fungus to capture territory over time | Round 3 | never addressed | — |
| F16 | A home-ground benefit for fighting on your own territory | Round 3 | never addressed | Vesper's passive (+10% spawn in home columns) is the nearest |

### 1.6 Combat rework, rounds and flyers (CR, RD, FL)

| id | Recommendation | Source | Status | Evidence |
|---|---|---|---|---|
| CR-1 | Level 2: waves on a shared beat + tools (pinning, call for help, Rhizomorph, clouds), later shields, Burster, storm waves, swarm read, flyers | CR "Level 2" | in P3 playtest | `?proto=rework`. G3 fails Sporeling 83/86, Drift Stalk 72/90, Veilstalker 69/80; strict bar passes; G4 8:04 / 11% (status) |
| CR-2 | Wildcard: ranged power as structures (Gill Nest becomes a battery; marching army is melee) | CR "Wildcard" | never addressed | Sketch only; identity change |
| CR-3 | Level 3: rounds (Mechabellum-style) if Level 2 can't give every build an answer | CR "Level 3" | parked | User: "Level 2 first, with rounds as the fallback" (2026-10-30) |
| RD-1 | Build the headless clash prototype now, before more Level 2 tuning | RD "Recommendation", Q1 | never addressed | RD Q1 unanswered; status lists Level 3 only as a P4 outcome |
| RD-2 | One Heartcap pool for the run: a lost battle costs HP, the run ends only at 0 | RD "The run layer", Q3 | never addressed | Same as ER-2c |
| RD-3 | Plan with gold in front of you (interest as a moment); scouting what the general fielded | RD "The run layer", "Scouting" | parked | Paper only |
| CR-4 | Waves give relics and perks something to act on (`side.waveBeat`, `side.waveSize` hooks) | CR "Waves and run variety" | built, unused | Hooks exist under the preset (BB P1 "Hooks"); no relic or perk uses them |
| CR-5 | A bonus for mixed waves (rewards diversity directly) | CR "Waves give perks…" | in P3 playtest | `mixedWave` shields at 2 types; "carry the strict bar" |
| CR-6 | Special waves (swarm wave every 3rd beat, doubled first wave); Rhizomorphs surfacing together; a relic rewarding a mono wave | CR "Waves give perks…" | never addressed | "Examples, not proposals" |
| CR-7 | 9 Kings: each commander brings its own small kit, exclusive buildings and perks | CR "What it suggests for us" | planned (M6, partly) | Mastery 2 exclusive building, 4 starter choice (§9.5) |
| CR-8 | 9 Kings: loot from the general you beat (take one of its buildings/upgrades), so the route shapes the build | CR "What it suggests" | never addressed | — |
| CR-9 | Upgrades that transform units (enchantments) | CR "What it suggests" | never addressed | Same family as ER-5b/5d, CS-3 |
| CR-10 | Draft a building again to level it where it stands | CR, CS | never addressed | Reverses §17 #12 |
| CR-11 | Meta perks placed on a board where position matters | CR "What it suggests" | never addressed | — |
| CR-12 | "A run-variety design for M6 … written after P2, against whichever combat model is adopted" | CR "Where this lands" | never addressed (promised) | Not written; P2 ended 2026-10-31 |
| CR-13 | The Gray Rot needs its own area unit, burrower (and flyer) | CR "What waits"; FL Q7 | planned (M7, unspecified) | `data/factions/gray-rot/` holds only `faction.json` |
| FL-1 | Flyers (Driftling, Drift Stalk) with a reach rule | FL; CR "Flyers" | in P3 playtest | Rule C taken 2026-10-31 ("Let's go with your recommendations") |
| FL-2 | An Anti-Air counter kind for the general | FL "The general" | never addressed | "Not built" (BB After P2); status "Waiting on the user" #2 |
| FL-3 | Retune the Driftling (HP, damage or rate) | BB After P2 rec | never addressed | Status #2 |
| FL-4 | The Bloatcap, a second flyer, only if Decisions bind | FL | parked | G4 passes, so held |
| CR-14 | Teach the general the swarm's answer (Sporeling + Veilstalker core) | BB P2 "smallest package" | never addressed (explicitly held) | Status #3: "Teaching it the answer is undecided. Don't start it unasked." |
| CR-15 | Drop the Rhizomorph (carries nothing measured) | BB P2 "smallest package" | never decided | Status #4: P4's call |

### 1.7 Balance backlog candidates that touched feel (BB), `docs/archive/v1/balance-backlog.md`

Listed so they aren't re-proposed. All are default-off presets in `src/data/proto.ts`.

| id | Candidate | Status | Evidence |
|---|---|---|---|
| BB-B1 | Sporeling approach rush | measured and failed | 95–100% mono Gill Nest at every setting; ×3 breaks G4/G7 |
| BB-B2 | Only close (melee) hits suppress production (`besiegedBy`) | measured and failed (G3) | Safe for guardrails but archers stay 100% |
| BB-B3 | Firing congestion | measured and failed | Halves 60-supply margins, G3 unchanged |
| BB-B4 | Finite unit lifespan | measured and failed | No effect at 60–120 s |
| BB-I1 | Gill Nest interval 17–28 s | measured and failed | Never < 85% alone; 24 s + B1 = 55% but swarm takeover, G4/G7 fail |
| BB-T1 | Ranged warm-up | measured and failed | 100% |
| BB-T2 | Fall back while outnumbered | measured and failed (harmful) | Mono Sporeling 88% |
| BB-T3 | Home spawners shoot back | measured and failed | Every battle a Decision at the strong setting |
| BB-A1–A3 | Read merging harder; counter floor weight; earlier first counter cycle | measured and failed | G8 1 of 8 at best. Untested lead: a floor limited to counter buildings whose unit beats the player's armor |
| BB-SC | Sheltered forward plots (step C draft) | parked | CR "What waits": "can come back if siege still lacks a job" |
| BB-CL | Mortar spore clouds | measured, removed | Out of `rework` at P2 (user); +5 points Decisions, no G3 help |
| BB-CV | Cleave (Scythecap) | measured, removed | Out of `rework` at P1d (user); its own preset |

### 1.8 SPEC's own open questions and pitfall countermeasures (SP)

| id | Question / countermeasure | Source | Status | Evidence |
|---|---|---|---|---|
| SP-1 | Is 3 s capture at 1.5× presence the right push pace? | §18.2 Q1 | never addressed | F6 questions drafted for "the next round" (playtest-feedback 2026-10-28), unanswered |
| SP-2 | Does the Sporestorm end battles satisfyingly, or abruptly? | §18.2 Q2 | never addressed (by people) | Round 3 testers didn't know what the storm was; `breach` is the only change aimed at it |
| SP-3 | Do players feel forced to leave merging on? | §18.2 Q3 | never addressed (by people) | G7 Slayer mirror fails today (56%); under waves G7 mirror 72% (fails high) |
| SP-4 | Is the vague telegraph enough? Opt-in "answer card" assist | §18.2 Q4 | never addressed | See ER-6b |
| SP-5 | A second playable faction? A daily-seed mode? | §18.2 Q5 | out of scope | §17 #5, #15 |
| SP-6 | More relics/events bending territory rules ("the first column you lose doesn't flip") | §18.2 Q6 | never addressed | Only Quick Roots, Forward Spores, Armilla |
| SP-7 | Pitfall "runs get repetitive once you find a dominant build": adaptive general, intel, strains, feats, blights | §1.1 | planned (M6, M7) / failing (adaptation) | G8 fails today and under the package (general wins 21–24% vs mono Sporeling) |
| SP-8 | Pitfall "one cheap unit spammed beats everything": supply cap, matrix, Anti-Swarm doctrine, value budget | §1.1 | failing | Mono Sporeling fails G3 under every rule set measured (74–95% mean); the cap "barely binds" |

### 1.9 Codex note (CX), [`docs/archive/v1/ideas/fun-and-agency-research.md`](../fun-and-agency-research.md), 2026-10-29

Brought into the repo on 2026-10-31 (OMR-12), but never reviewed against the repo. Its first-test order: (1) optional commitments, (2) a factual turning-points report, (3) a single network interaction.

| id | Recommendation | Status | Evidence |
|---|---|---|---|
| CX-1 | Optional battle commitments at deploy (protect a marked outpost for a known bounded reward; can decline), à la Against the Storm's Timed Orders | never addressed | Its "strongest first gameplay hypothesis" |
| CX-2 | A temporary battlefield opportunity: an announced bloom patch that ripens at a known time; hold its column in the window for one finite benefit (gives Hold an external reason) | never addressed | — |
| CX-3 | A small, explicit mycelial connection (one economy building feeds one chosen spawner at a cost) | parked (as part of the network) | Overlaps CS / step C |
| CX-4 | Cultivate then harvest or replant (consume a mature economy building for a one-time push) | never addressed | Note its own objection: selling already does most of it |
| CX-5 | Make the player's contribution understandable: factual turning points in the report ("three columns changed hands in the 20 s after this release") | never addressed | Report has graph, totals, counters, damage MVP (§10.4) |
| CX-6 | A practice copy of a failed run battle (same kit, opponent, seed; change one thing; no reward) | never addressed | Same-seed "Rematch" exists for single battles (`src/app/main.ts` `rematch`) |
| CX-7 | Memorable colony stories: named Elders, a small chronicle of real events, general remarks | never addressed | Overlaps DR-19, DR-38 |
| CX-8 | Parked ideas: invite a known danger (dormant nest), commit to a route consequence, a scarce growth focus, a compact encounter mode | never addressed | Route consequence overlaps F10 |

---

## 2. The user's standing decisions and preferences

Dated, quoted where the docs quote the user, closely paraphrased otherwise.

**How work is done (standing):**
- **Measure before changing a rule.** Round 3: the user "prefers to measure with sims before changing a rule" (`docs/playtest-feedback.md`, 2026-10-29). `.claude/rules/balance.md`: "diagnose, measure and recommend, but a rule change … or a retune across several units waits for their OK. A data tweak that fixes one guardrail is fine." CLAUDE.md: "Review before building. Playtest notes, reviews and ideas get discussed with the user before anything is built from them."
- **Prototypes are default-off knobs, adopted only by the user,** and go to `develop` for a dev-site playtest (CLAUDE.md, rules). Only prototypes that "helped" go in: on 2026-10-28 the user "asked for the prototypes that helped to go into the game, and to leave out the ones that didn't. Only E1 qualified" (CHANGELOG "Adopted: E1").
- **Report misses with numbers rather than bending rules to pass** (M5 kickoff, `docs/archive/v1/m5-plan.md`; rules file).
- **Decisions go in the repo, not Claude's memory** (CLAUDE.md).
- **Don't start teaching the general the swarm answer unasked** (status #3, 2026-10-31).

**What's malleable:**
- 2026-10-30 (OMR Decisions): "**The spec and the original plan are malleable.** The goal is the most fun and engaging game, and the spec and milestones can change to get there. Rule changes and retunes still go to the user with numbers first."
- 2026-10-30 (OMR Decisions): G3 and SPEC §17 #11 (no core adjacency) "can change if needed".
- 2026-10-30 (CR Decisions): "Burrowing and flying units are in. **The original spec isn't a limit: this is an evolving game that's still being prototyped, and anything can change.**" (SPEC §17 #7 not yet edited; that happens on adoption.)
- 2026-10-30 (CR brief): "Fix battles that are one-sided because one unit type dominates, even if that takes significant rework. Don't limit the design to today's units and numbers. Borrow freely from other games."

**Sequencing:**
- 2026-10-26 (M1 gate): "the user asked not to fix any of this yet. Keep the feedback tracked for the next milestone."
- 2026-10-29/30 (CS): the user "wants to finish the planned milestones first" and treat colony-swarm as later thinking.
- 2026-10-29 (M5 kickoff): "M5 exactly as specced, with no draft rework." All commanders selectable until M6.
- 2026-10-30 (OMR): reversed the above: "**Pause before M6.** Steps A–C come first."
- 2026-10-30 (CR): "Level 2 first, with rounds as the fallback." P0 and P1 in parallel sessions. Step C parked behind the rework.
- 2026-10-31 (CR): "chose to playtest before measuring further … the combat should reach a stable, playable state first"; wrap P2 up; build flyers before the playtest.
- Status (2026-10-31): M6–M8 content waits on P4, "since it will be written for the combat model that's adopted". A release to `main` only when asked.

**Balance-bar decisions (they shape what "fun" proposals must pass):**
- 2026-10-30: G3 thresholds: "Keep G3 as proposed: mean ≤ 55%, worst map ≤ 60%, 50 seeds per seat."
- 2026-10-30: "The counter matrix sits beside G3, not in its place." Stricter bar: an answer that wins ≥ 60% on every map.
- 2026-10-30: re-aimed the rework at "swarms and mixed armies, not archers".
- 2026-10-30 (P1b answers): Twin Roots stays in the bar; mixed waves at 2 vs 3 types: "keep whichever helps `bot:balanced` more"; the clouds' G4 cost "accepted for now".
- 2026-10-31 (P1d answers): beat 20 s; Elder splash off under `rework` (shipped unit keeps it); cleave out; Burster in; both stall routes.
- 2026-10-31 (P2 answers): "G3 stays a bar, and `bot:balanced` stays as it is"; storm stays 20%/stack; Mortar clouds out; "P2 measures only. A number that looks wrong … comes back to the user with the evidence."
- 2026-10-31: flyers rule C: "Let's go with your recommendations."
- Content approvals quoted: Armilla rework, "rework Armilla's content … and rerun the tournament" (CHANGELOG M5, 2026-10-30).

**Onboarding (F8):**
- 2026-10-29: after round 3's "too much to learn", the user "chose a UI-only clarity pass" (tooltips, Help tabs, first-time tips, plain words). "Onboarding beyond tips (a tutorial battle, staged unlocks) is open, waits on the user."
- 2026-10-29 (M5 kickoff): powers and the commander screen get tips and tooltips because of F8.
- 2026-10-30 (CR brief): "Round 3's 'too much to learn' note (F8) isn't a constraint. Tooltips addressed it, and onboarding can be revisited later."
- 2026-10-28: on F4, the user suggested making economy the first card in the tray (done). On F6, "the user wants more feedback before changing anything and hopes Hold/Advance helps."

**Games and references the user named or endorsed:**
- **9 Kings:** "9 Kings is a model for run-to-run variety" (CR Decisions 2026-10-30); "its many different kings are close to our generals, and its builds vary wildly from run to run" (CR "Waves and run variety").
- **Hivemind** (a collaborator's prototype): shared 2026-10-30 "as a good example of placement that matters" (CS).
- **Civilization VI terrain:** "The user and their collaborator also want terrain to steer placement, as in Civilization VI" (CS).
- **There Are No Orcs:** the DR calls it "your inspiration" (DR §3).
- CS's pitch also lists 9 Kings, Balatro and Combolands, Vampire Survivors (the conversation's reference points).
- Mechabellum is the model for the rounds fallback (CR, RD), chosen by Claude; the user accepted rounds only as the fallback.
- The DR's games (Backpack Battles, Loop Hero, Hades, Slay the Spire, Monster Train, RoR2) came from the external review, not from the user.

**Other user ideas recorded:**
- Bigger unit swarms, probably on a larger map (CS "Swarms").
- Waves could give relics and perks something to act on, and feed meta progression (CR, 2026-10-30).
- An "heirloom" building that starts each battle planted (CS, M6 fit).
- The colony direction should "transform the game and simplify other parts of it" (CS "What it could simplify").

**Interview decisions still in force (SPEC §1.2), relevant to fun proposals:**
- Continuous real-time battle; run of 4–5 battles at ~6–8 min; run 25–35 min.
- Vague telegraph (kind only, 2 waves ahead); an "answer card" assist was the interview's **rejected** alternative (§18.2 Q4).
- Honest AI, one tuned baseline; no difficulty tiers (§17 #14); rare broken runs allowed but can't be forced.
- Draft pool: commander core + shared pool + up to 3 bans.
- Out of scope still (§17): any backend/leaderboards/telemetry (#1), a second playable faction (#5), fog of war (#9), procedural maps (#10), core adjacency (#11, user open to change), in-place building upgrades (#12), enemy active powers (#13), daily-seed UI (#15), cosmetics (#16), replay viewer (#17).

---

## 3. What M6, M7 and M8 plan to add

The status page says all three wait on P4, so their content will be rewritten for whichever combat model is adopted.

### M6, Meta-progression (SPEC §16, §9)
- Profile and Underroot screens; Spores and Amber spending; ≥ 15 feats with a condition DSL (e.g. *Swarm Mind*, *Lean Roots*, *Survivor*); 12 strains with Amber ranks (behavior sidegrades: Teeming, Bursting, Volley, Longgill, Ironcap, Battering, Thornpuff …); 12 colony traits under Root Capacity 3 → 12 (incl. 0-cost drawback traits like Hermit, Wild Draft); commander mastery 10 levels × 3 with exclusive buildings (Velvet Shrine, Rootgate, Puppet Pod), alternate powers, starter choice, exclusive relics; save export/import. G9 caps a full trait loadout at +15 points.
- **Addresses:** the between-run pull (today a run earns Spores, Amber and XP that buy nothing; the summary says "Feats: none yet (Milestone 6)"); DR-29/30; part of CR-7 (commander kits); ER-5c only as pre-run strains; feats give "try another build" goals (pillar 4).
- **Doesn't address:** anything inside a battle (ER's own verdict: "Meta multiplies the core loop's fun and doesn't create it"); comebacks, binary run HP, territory payoff, placement, draft card size in battle, the general as an answerable moment, boss difficulty, F1/F6/F9–F16. Strains and traits are written against today's building model, which CS warns M6 is "where finishing first costs the most". No codex, no keyword-ladder onboarding, no run-variety design (CR-12).

### M7, Gray Rot, blights, content and polish
- The Gray Rot's 10-building roster (a role mirror, +10% HP / −10% speed), 6 blights and Decay with reward multipliers, the Three Hollows 3-lane map, relics to ≥ 20 (already 21), a colorblind check (done early in UI Phase 3), first-run tutorial hints.
- **Addresses:** the Heat-style ladder (DR-30) for replayers; a fourth map; some onboarding (tips, F8).
- **Doesn't address:** an asymmetric enemy (ER-6c: as specced it stays a mirror); open/rewarding counters (DR-18); the Gray Rot's versions of the rework's tools (CR-13, not specced); a tutorial battle (F8); Three Hollows adds a third lane and less home space (3 home columns) against F8 and against the second-front finding that lane splits change which mono builds win.

### M8, Release candidate
- Render perf pass, settings screen (built early), light juice (puffs and shake built early), Firefox determinism check, final balance tournament and tuning, README, Pages deployment (already live).
- **Addresses:** almost nothing new for fun; most of it is done.
- **Doesn't address:** hit-stop/impact flashes (ER-7b), battlefield scale or a camera for bigger swarms (ER-7a, CS-7), a one-key restart (DR-33).

**Net:** no planned milestone answers section 4's problems 1–9. They were all diagnosed between 2026-10-28 and 2026-10-31, after the milestones were written.

---

## 4. Never-addressed problems

Each item: what a review diagnosed, the numbers, what has been built or planned near it, and why that doesn't answer it. Ordered by how directly they bear on "one more run".

**1. No comebacks inside a battle.**
- *Diagnosed:* ER ("no siege phase and no last stand", loser's Heartcap 13–20 s first hit → dead); BB Step B ("the cliff is upstream of the Heartcap": when the loser's Heartcap is first hit it has a median 1 building and 0 units; half its buildings fell ~34.5 s before death).
- *Numbers:* 0 comebacks in 360 battles today, 0 in 360 under the P2 package; under the package "a falling Heartcap dies 5–10 s after it reaches ⅔" (BB P2). Winner's Heartcap untouched 359/360 (today), 360/360 (package).
- *Nearest work:* `breach` (built, off) stretches the epilogue to 45 s but yields 2 comebacks in 360; +300 gold per mark gives 5. Step B named the real candidates: "a trigger when a side has lost half its buildings; a defensive rally while the base is still standing" (not built, not planned).
- *Contradiction to resolve:* G6 (a side 6 columns behind at 3:00) wins 88% under the package vs 55% today, yet the engagement check finds no comebacks. G6's scenario isn't the same as a collapse in progress.

**2. Run HP is binary, so carryover and repair systems are dead weight.**
- *Diagnosed:* ER: player Heartcap at run end was 0 in 64 of 80 runs, full in 14, partial in 2; Grove repair, Mending Moss, Rot Ward and Rout repair "almost always wasted".
- *Why:* winners are never scratched (item 1), and a Rout loss sets HP to 0 and ends the run (SPEC §6.5).
- *Nearest work:* ER-2c (rout loss costs 40–50%), ER-2d (enemy-held columns drain run HP), RD Q3 (one HP pool). None built, none planned, none in the P3 package. `hotstart` lowers battle-1 deaths but doesn't make HP a resource.

**3. Territory has no payoff, and under the package being behind is an advantage.**
- *Diagnosed:* ER pillar table ("Territory is build space: Weak"; holding ground earns nothing, comeback income pays the side holding less); F1 twice; F6 (a tester "ignores it and hopes"); spread tool (spawner scores fall with depth, Gill Nest ρ −0.80; loam Cellars "pure noise").
- *New since:* under the P2 package G6 is 88% (status lists "falling back early is a big edge" as a known P3 issue), and the first flip comes later (1:04–3:22 against 0:34–1:40 today, BB P2 engagement), partly undoing Hold's fix of the quiet opening.
- *Nearest work:* Armilla's Tithe (one commander), the Forward Spores relic, UI explanations. ER-4a–c, DR-10/12, CS-6, F15, F16, OMR-11 all unbuilt; step C parked. Nothing planned in M6–M8.

**4. Where you place a building doesn't matter.**
- *Diagnosed:* DR Problem 1; CS; OMR spread baseline: at 1:00 on Bogwater best plot = median (+0.0), at 3:00 ~25% of a building, split-half ρ 0.2–0.3; Mycorrhizal Link below noise.
- *Nearest work:* the spread tool (a bar exists: ρ ≥ 0.6–0.7 and best − median well above 25% at both pauses). Every rule proposal (DR-7…15, CS-1…6, CX-3) is parked behind the rework; §17 #11 unchanged. M6 strains don't touch position.

**5. The difficulty curve: the boss is the easiest fight, and battle 1 gets harder under the package.**
- *Numbers:* boss fights won 72 of 105 today, 85% with all Step B knobs, **60 of 64** under the P2 package (runs won 54 → 60 "all at the boss"). Battle-1 run deaths 79 → 108 of 240 under the package (Armilla 29 → 41, Cordis 26 → 44); waves cause it (68 without them); "why isn't measured".
- *Nearest work:* `hotstart` (measured on M5 rules, not under the rework); moving Mold out of battle 1 (user's call). A boss retune is named in Step B rec 4 and nowhere else. No milestone plans it.

**6. The general's adaptation isn't a moment the player can answer.**
- *Diagnosed:* ER pillar 3 "Weak"; ER-6; DR §5.5.
- *Numbers:* G8 fails today and under the package; against mono Sporeling the adaptive Baron wins 29% today, 21% under the package, 24% with the swarm read (BB P2). Its swarm counters (Capguards, Burster Pods, Tunnels) aren't the matrix's answer (Sporeling + Veilstalker).
- *Nearest work:* UI made the warning readable (kind, pips, countdown); `swarmread` fixes the read only. Doctrine waves, a reward for beating a counter, an answer pick, an asymmetric Gray Rot, Anti-Air (FL-2) and teaching the general the answer (held: "Don't start it unasked") are all unbuilt. M7's Gray Rot is specced as a mirror. The interview's vague telegraph and rejected "answer card" bound the design space here.

**7. Draft cards are small, so a run has few power spikes and builds don't diverge.**
- *Diagnosed:* ER ("drafts are mostly +15% cards", pillar 4 "Weak"); DR Problem 3; OMR ("the problem is card size, not card count"); CR ("mostly percentage upgrades").
- *Nearest work:* `bigdrafts` changes count and picks only ("It doesn't make cards bigger … new content, out of scope"). Rule-bending relics stay rare (5% in battle 1). Strains arrive in M6 as pre-run choices, not drafts. Wave hooks exist but no relic uses them (CR-4). Unbuilt: ER-5b/c/d, CR-6, CR-8 (loot from generals), CR-9, CR-10, DR-16/17, and the promised "run-variety design for M6" (CR-12). F9 (drafts vs spoils) and F11 (elite rewards) unanswered.

**8. Merging isn't a decision, and waves make it more automatic.**
- *Diagnosed:* ER pillar 2 "Partial": "they're automatic. The toggle is rarely worth touching." SPEC §18.2 Q3.
- *Numbers:* under the package merges per battle rise from 10–40 to 49–119 and G7's mirror reads 72% (fails, limit 70%); "waves bunch idle units, and merges nearly quadruple" (BB P2). The swarm read had to be added because "waves make nearly every Sporeling merge."
- *Nearest work:* none. Cordis's Puppet Bloom and the Knitting Circle relic make merging stronger, not more of a choice.

**9. Late gold has nowhere to go.**
- *Diagnosed:* ER: "Bots bank a median of 220–390 at peak. I finished with 801 unspent and no legal tile to build on." ER rec 4 calls it "the symptom".
- *Nearest work:* none. Interest caps at 10 a wave (D17); CS's cut list wants interest and the Spore Exchange gone; DR's "Truffle Hoard" archetype (parked). Not re-measured under the rework.

**10. Live decisions may thin out under the rework.**
- *Diagnosed:* ER: ~2 decisions a minute, long gaps. Hold raised player commands/min to 2.1–2.6.
- *New since:* under waves the AI never holds, a hold lasts one beat, and in P1 "player commands per minute fall from 2.6–3.7 to 1.8–2.8, because the bot no longer holds" (BB P1). RD notes rounds would leave only the commander power live. No proposal looks at the player's own verbs under waves; CX-1/CX-2 (commitments, timed opportunities) are the only ideas aimed at in-battle purpose, and they were never reviewed.

**11. Onboarding beyond tips.**
- *Diagnosed:* F8 (round 3, both testers); DR (synergies invisible).
- *Since:* the rework adds three spawners (Rhizome Tunnel, Burster Pod, Drift Stalk), waves, shields, pinning, call for help and a flyer reach rule. P3's own question asks "can you tell what can hit a flyer?"
- *Nearest work:* tips and tooltips (built); M7 "first-run tutorial hints". A tutorial battle, staged/keyword unlocks (DR-28) and any "what's new under the rework" teaching are unplanned. The user deferred it ("can be revisited later").

**12. Watching is hard to read, and swarms will make it harder.**
- *Diagnosed:* ER ("units are about 8 px … the watching half of an auto-battler is hard to read"); CS ("a bigger map needs a camera or zoom plan").
- *Nearest work:* framing, puffs, sound, optional shake. Hit-stop/impact flashes (ER-7b), unit scale, and a camera/zoom are unbuilt and absent from M8. Armies are 30–75% bigger at 5:00 under the package.

**13. The route has no real choices, and runs have no memorable moments.**
- *Diagnosed:* F10 (all-to-all rows); CX parked "commit to a route consequence"; DR §5.7 run summary, nemesis log, codex; DR Q4 humor/voice; CX-5/CX-7 turning points and colony stories.
- *Nearest work:* route hover threads (UI only); the intel bars and "The Gray Rot remembers your SWARM" callout (§7.6) are the only memory the player sees. Nothing planned beyond M6's feats screen.

**14. Run and battle length were never checked with people.**
- Bot runs average 10–19 battle-minutes, and runs that reach the boss a median 20–25 (BB Step A, Step B, P1); "human time with pauses and drafts is unmeasured" (OMR). DR Q2 (20–25 vs 30+) unanswered. The package's median battle is 8:04 against today's 6:58 (G4 at 200). §17 #1 rules out telemetry, so only playtests can answer it.

**15. Unanswered single asks from testers.** F12 (repair), F13 (Mortar range; the rework removed the one change to it), F14 (smaller buildings), F15 (spreading building), F16 (home-ground bonus), F3 (forward losses fair?). Each "waits on the user"; none is in a plan.

---

## 5. Notes

- **Step B and the rework haven't been measured together.** Step B's numbers come from M5 rules; the rework raises battle-1 deaths by ~29 runs in 240. `rework` doesn't include `hotstart`, `bigdrafts` or `breach`, so the P3 playtest won't test them unless they're added to the URL.
- **"Wave" means two things:** SPEC §1.2/D1's 60 s beat (drafts, interest, storm, counter cycles) and the rework's 20 s release beat. Any proposal about "waves" should say which.
- **Stale SPEC text** (not fun issues, but they mislead): §17 #18 and D15 still say no audio although §13.9 ships it; D12 says the storm adds +10% Heartcap damage per stack, §6.4 and the data say +20%; §17 #7 still excludes flying and burrowing, which the user has approved for prototyping (pending adoption).
- **Already-rejected directions** worth not re-proposing without new evidence: Cap Shield (DR-3), a draft every wave (DR-23), 4–5 min battles before the cliff is fixed (DR-22), Spore Columns (DR-14), a second lane on one-lane maps as the archer fix (OMR-10), flat per-neighbor percentages (DR-7), the board-autobattler rewrite (DR-40), and every BB archer candidate in 1.7.
