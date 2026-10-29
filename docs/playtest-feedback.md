# Playtest feedback

Human playtest notes, newest first. Each entry records what the player said and links it to the guardrail or tuning knob it touches. Nothing here is acted on until the user says so. Data changes still go in `data/CHANGELOG-balance.md`.

## Open items for the next milestone

| # | Feedback | Related | Status |
|---|---|---|---|
| F1 | Forward building isn't worth it: the surcharge feels steep and gives little in return | §6.3 `supplyLinePerColumn`, §4 territory | Open, not started. M3 adds optional payoffs as drafts: the Forward Spores relic (surcharge halved) and Martyr's Bloom (destroyed buildings burst); the base rule is unchanged. A second report on 2026-10-29 (round 3): the risk doesn't match the reward. The price is now explained (Help's Economy tab, the territory tooltip, the ghost's "+30%: 6 columns from home"); the rule still waits on the user |
| F2 | Gill Archers (Gill Nest) are still the best unit | G3, `data/CHANGELOG-balance.md` "Open: G3" | Open. Re-measured after M3 (2026-10-26): mono Gill Nest still wins 100%, with drafts, upgrades and relics on and against a reference bot that fields Tender's Ring. Candidate solutions recorded in the [balance backlog](balance-backlog.md) on 2026-10-27; no balance implementation selected yet. Re-measured after M4 (2026-10-27): mono Gill Nest still wins 100% against `bot:balanced` and against every general, adaptive or not; G1 now fails on it too (7 of 8 production pairings, since the three M4 spawners all lose to massed archers). Backlog B1, B3 and B4 prototyped on 2026-10-27 (playable with `?proto=b1`, `b3`, `b4`): mono Gill Nest still wins 98–100% under each; see the [results](balance-backlog.md#prototype-results-2026-10-27). Round 2 (Gill Nest interval, T1–T3, defender diagnostic): no setting passes; the closest feel test is `?proto=b1,approachRush.speedMult:2,approachRush.seconds:1,building.gillNest.spawn.interval:21` ([results](balance-backlog.md#round-2-results-2026-10-27)) |
| F3 | "Did losing forward buildings feel fair and readable?" has no answer yet | M1 playtest gate | Needs a playtest where the player builds forward |
| F4 | A player never noticed the economy buildings and lost battle 1 | §10.2 tray, §6.2 income | UI change made 2026-10-28: economy cards come first with a gold role tag, plus a one-time battle-1 tip at 0:30. No balance change. Round 3 didn't mention the Cellar, but both testers asked what interest is and where income comes from; the gold tooltip and Help's Economy tab now answer that (2026-10-29). Ask next round: did you build a Cellar in battle 1 without the tip, and does the gold tooltip make income and interest clear? |
| F5 | Tray cards aren't laid out intuitively and need tooltips | §10.2 tray | UI change made 2026-10-28: role tags, a plain one-line summary, and a hover/keyboard tooltip with full stats and matchups. Round 3 asked for more tooltips overall, not about the tray. Ask next round: do the cards and their tooltips tell you what a building does before you place it, and is any word on them still unclear? |
| F6 | Units capture columns awkwardly | §4.3 territory, §5.2 Hold / Advance | Open. Hold / Advance is in the game since 2026-10-28 (the only prototype adopted). Round 3 (2026-10-29) adds detail: one tester doesn't know how to plan territory, so ignores it and hopes units take ground; the other isn't convinced territory capture is the best design yet. Explained in the UI only: a territory tooltip on the tug, a first-time frontier tip and spawn timers; the rule waits on the user (see F15 and F16) |
| F7 | Buildings need more feedback, e.g. a coin popping off economy buildings when they pay | §13.6 effects | Coin pops and a gold-counter pulse added 2026-10-28. Spawn timers done 2026-10-29 (render only): a thin bar along the foot of each of your spawners fills toward its next spawn, with a setting, on by default. Sound is still a candidate |
| F8 | Too much to learn: too many systems, and no tutorial | §10 UI, §3 structure | UI pass done 2026-10-29 (HUD tooltips, Help tabs, first-time tips, plain words). Onboarding beyond tips (a tutorial battle, staged unlocks) is open, waits on the user |
| F9 | In-battle drafts and post-battle spoils offer the same kinds of cards; a tester expected them to differ | §8.3, §8.6 | The spoils screen now says spoils are a bonus draft with the same kinds of cards (2026-10-29). Whether they should differ is open, waits on the user |
| F10 | The route doesn't really branch: every node links to every node in the next row. A tester wanted to hover a node and see every path to it | §8.2 | Open, waits on the user (hovering already lights a pod's own threads) |
| F11 | Elite battles don't give enough extra reward for the extra difficulty; more rewards, meta currency or upgrades wanted | §8.6 | Elite nodes now show what they add: a relic pick, +15 Spores, 25% Amber (2026-10-29). The reward size is open, waits on the user |
| F12 | Can buildings be repaired? | §4.4 | Open, waits on the user |
| F13 | The Puffball Mortar is under-tuned: its range is too short, so it's easily destroyed | §11.2, G3 | Open, waits on the user; tied to G3 (mono Gill Nest), since ranged units outrange it |
| F14 | Defensive buildings smaller than 2×2, to fit the gaps players leave | §4.4 | Open, waits on the user |
| F15 | A building that spreads the fungus to capture territory over time | §4.3 | Open, waits on the user |
| F16 | A benefit for fighting on your own territory (home ground) | §4.3, §5.3 | Open, waits on the user |

## 2026-10-29: playtest round 3 (two testers, relayed by the user)

One tester played a full run; the other played on the dev site and sent notes. Their main message: there's too much to learn and the game doesn't explain itself. The user chose a UI-only clarity pass (branch `feature/clarity-pass`, `docs/ui-ux-plan.md` and SPEC §10 updated). Rules and balance points are logged below and wait on the user, who prefers to measure with sims before changing a rule.

**Too much to learn (F8).** Tester A found far too much to read, with too many systems, and asked for tooltips and a tutorial. Tester B asked for tooltips on gold and income (where income comes from) and on the storm, which isn't explained anywhere.
- Done (UI only): the top band's chips have real tooltips instead of native title text, on hover or keyboard focus (`I` steps into the band, Tab moves along it, Esc closes). Gold breaks income down by source per minute (stipend, each economy building, Rich Loam, under attack, comeback), explains interest in plain words with the cap and what the next wave pays, and says what the Spore Exchange adds. Storm, supply, wave and the territory tug explain themselves too. Everything is computed on the render side; nothing joins the sim state.
- Done: Help has two new tabs, Economy (income, interest, the Spore Exchange, the forward price) and Sporestorm (when it starts and thickens, a stack-by-stack table). All six tabs fit 1280×720.
- Done: first-time tips in a run's first two battles, through the callout lane, one at a time, each shown once: the frontier and territory, Hold / Advance, the first draft, the Sporestorm as it starts and interest the first time it pays. Tips name their key with a keycap. Settings has Tips on/off and "Show tips again"; shown tips are remembered under `spore-sprawl/tips/v1`.
- Open: onboarding beyond tips, such as a tutorial battle.

**Interest and the Spore Exchange (F4).** Tester A didn't know what interest is; Tester B didn't understand the Spore Exchange or interest. Answered by the gold tooltip, the Economy tab and the first-interest tip above. No rule change.

**The Sporestorm.** Tester A didn't know what the storm is, so picked the event option that brings it sooner (Mold Bloom). Answered by the storm tooltip, the Sporestorm tab and a tip when it starts. Mold Bloom's chip already says "Sporestorm 1:00 earlier"; the storm tooltip now notes when a battle's storm was moved by an event.

**Space before the battle (bug).** Tester A kept pressing Space to start the battle and nothing happened, then saw the floating spores keep moving after pressing Space to "pause". In deploy, Space toggled a pause that Begin didn't clear, so a battle could start paused.
- Fixed: in deploy, Space begins the battle as Enter does, and Begin always clears a pause, so none carries into the live battle. The Begin button's keycap and the deploy hint show Space; Help lists both keys.

**Event results (bug).** Tester B wanted the random-upgrade event to say which unit was upgraded and how; random relics never said what you got either.
- Fixed (UI only): after an event whose outcome is random (Quiet Clearing's Forage, Fallen Oak, Hungry Roots, Twin Spores' relic), a result screen shows what you got: the building with its new level and what that level does, or the relic's name, rarity and text, plus any cost. It compares the run before and after the choice; `src/run` is unchanged.

**Plain words.** Tester A didn't understand "orthogonally adjacent" (Mycorrhizal Link) and wanted plain words or a picture.
- Fixed: it reads "touching 2 or more of your buildings on a side, not just a corner", with a small diagram on its card and tooltip. A sweep also rewords "income tick", "surcharge", "knit", "attack interval", "splash 1.0", "presence", "besieged" and "DPS" where players read them.
- Data text is copied into every battle's state, so rewording `data/*.json` moves the golden hashes (`m3-run-s7` did). The plain wording lives in `src/ui/words.ts` until the next golden refresh, and a unit test keeps its numbers in step with the data.

**Relics and upgrades in battle.** Tester B wanted to see unlocked upgrades and relics during a battle.
- Done: a chip in the top band counts your relics and upgrade levels; a click or `R` opens them (the run bar's badges and tooltips, and each upgraded building with its levels). Drafted cards join it live.

**Spawn timers (F7, F6).** Tester B wanted an indicator for when buildings will spawn, to time placements and capture ground.
- Done (render only): a thin bar along the foot of each of your spawners fills toward its next spawn and rests full and dim while it waits for supply. Settings has Spawn timers on/off, on by default.

**Territory (F6).** Tester A doesn't know how to plan territory, so ignores it and hopes units take ground. Tester B isn't convinced territory capture is the best design yet, and suggested a building that spreads the fungus to capture territory over time, perhaps with a benefit for fighting on your own territory (F15, F16).
- Done (UI only): the territory tooltip explains the frontier, how a column is claimed, where you can build, comeback gold and the Decision at 10:00; a first-time tip points at the frontier.
- Open, waits on the user: the capture rule, a territory-spreading building and a home-ground bonus.

**The forward price (F1).** Tester B thinks it needs revisiting: the risk doesn't match the reward. This is the second report. Explained in the UI only (Economy tab, territory tooltip, a plain ghost tip); the rule waits on the user.

**Drafts vs spoils (F9).** Tester A found it confusing that in-battle drafts and post-battle picks offer the same kinds of upgrades and unlocks; they expected them to differ.
- Done: the spoils screen says spoils are a bonus draft for winning, with the same kinds of cards as battle drafts. Whether they should differ waits on the user.

**Route branching (F10).** Tester A wanted to hover a route node and see every path to it, and noted the route doesn't really branch, since every node links to every node in the next row (SPEC §8.2, by design). Logged.

**Elite rewards (F11).** Tester B finds elite battles don't give enough extra reward for the difficulty, and wants more rewards, meta currency or upgrades.
- Done: elite route nodes show the extra reward SPEC §8.6 already gives: a relic pick, +15 Spores and a 25% chance of Amber. The size of the reward waits on the user.

**Repair (F12).** Tester A asked whether buildings can be repaired. They can't; logged.

**Puffball Mortar (F13, G3).** Tester B finds the Mortar under-tuned: its range is too short, so it's easily destroyed. Logged with G3, since massed Gill Archers already outrange it.

**Smaller defensive buildings (F14).** Tester B suggested defensive buildings smaller than 2×2 that fit the gaps players leave. Logged.

## 2026-10-28: playtester notes (relayed by the user)

**Missed economy buildings (F4).** One player didn't realize economy buildings existed and lost his first round. The user suggested making economy the first card in the tray.
- In a run, the starter tray is Sporeling Burrow, Capguard Hall, Truffle Cellar, so the Cellar was already one of three cards. Position alone wasn't the problem: nothing on the card said "this makes money".
- Economy may not have been the whole reason for the loss. Over 20 seeds against `bot:balanced` on Bogwater Hollow, `bot:rush` (no economy) still wins 60% and `bot:greedy` 55%. A Truffle Cellar (◆ 150, +4 gold per 5 s) pays for itself in about 3:07, or about 2:05 on Rich Loam. Battle-1 difficulty is a known issue: 41% of runs end in battle 1 ([engagement review](engagement-review.md)).
- Done (UI only): the tray groups cards by role with economy first, and hotkeys follow that order. Each card has a colored role tag. In battle 1, if no economy building is built, queued or being placed by 0:30, a 6 s tip names the Cellar and its hotkey, and the economy cards pulse for 12 s.

**Card layout and tooltips (F5).** The same player found the unit/building cards hard to read.
- Before: the face showed jargon like "crush 24 / 3s · r6" and "strong vs light · medium", and the only tooltip was the browser's built-in `title` text with just the description.
- Done (UI only): the card face shows hotkey, price, sprite, name, role tag and one plain line ("2 Sporelings / 16 s", "+4 gold / 5 s", "crush splash · range 6"). Hovering, or keyboard focus, opens a tooltip with the description, what it makes, unit HP and attack, strong vs / weak vs, armor, siege or slayer, merge perks, building HP and, for economy, the payback time. Stats come from the compiled side, so upgrades show.

**Column capture feels awkward (F6).** Discussed by the playtesters; the user wants more feedback before changing anything and hopes Hold/Advance helps.
- Hold / Advance is now in the game (adopted the same day; `F` or the per-lane buttons), so the next round tests capture with it on.
- Questions for the next round, to pin down "awkward": does a single unit flip a column too easily? Do columns flip back and forth? Is it unclear why a column didn't flip (only the frontier column can be captured, and buildings block it)? Do units walk past columns without stopping?

**More building feedback (F7).** The user wants buildings to show what they're doing, e.g. a gold coin popping off economy buildings when they pay.
- Done (render only): each income tick, every economy building that paid shows a coin and "+N" rising off it, with the enemy's dimmed so their Cellars read as raid targets. The gold counter pulses as income lands. The amount comes from the building's running `goldByBuilding` total, so sim events and golden hashes are untouched.
- Candidates, not started: a spawn-timer ring on spawners, and sound.

## 2026-10-26: Milestone 1 playtest gate (§16), answered against the live M2 build

**Was pushing worth the risk?** Not really, at least when it comes to placing buildings forward. The price increase felt steep and the tradeoff wasn't there. The player already had enough units reaching the far end of the map from home buildings, so forward spawners added little.
- Current rule: price × (1 + 0.05 × depth). That is +30% at depth 6, the column 8–9 example in §6.3.
- Possible directions, none chosen:
  - Lower `supplyLinePerColumn`.
  - Give forward buildings a clearer payoff than a shorter march, or make the one they already have (anchoring ground, §4) easier to see.
  - Check whether home-only play already wins without territory mattering.

**Did losing forward buildings feel fair and readable?** No answer. The player barely built forward, so this didn't come up. Ask again once F1 changes.

**Did battles last 5–9 minutes?** Yes, about 5–9 minutes. This matches G4, so no action is needed.

**Is one building obviously the best?** Yes, the archers (Gill Nest). This matches guardrail G3: mono Gill Nest beats the reference bot 100% of the time in sims, before and after M2. The diagnosis and recommended fix order are in `data/CHANGELOG-balance.md` under "Open: G3". The first step (mustering) changes SPEC §5.2 and needs the user's OK.

**Decision:** the user asked not to fix any of this yet. Keep the feedback tracked for the next milestone.
