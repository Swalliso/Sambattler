# Playtest feedback

Human playtest notes, newest first. Each entry records what the player said and links it to the guardrail or tuning knob it touches. Nothing here is acted on until the user says so. Data changes still go in `data/CHANGELOG-balance.md`.

## Open items for the next milestone

| # | Feedback | Related | Status |
|---|---|---|---|
| F1 | Forward building isn't worth it: the surcharge feels steep and gives little in return | §6.3 `supplyLinePerColumn`, §4 territory | Open, not started. M3 adds optional payoffs as drafts: the Forward Spores relic (surcharge halved) and Martyr's Bloom (destroyed buildings burst); the base rule is unchanged |
| F2 | Gill Archers (Gill Nest) are still the best unit | G3, `data/CHANGELOG-balance.md` "Open: G3" | Open. Re-measured after M3 (2026-10-26): mono Gill Nest still wins 100%, with drafts, upgrades and relics on and against a reference bot that fields Tender's Ring. Candidate solutions recorded in the [balance backlog](balance-backlog.md) on 2026-10-27; no balance implementation selected yet. Re-measured after M4 (2026-10-27): mono Gill Nest still wins 100% against `bot:balanced` and against every general, adaptive or not; G1 now fails on it too (7 of 8 production pairings, since the three M4 spawners all lose to massed archers). Backlog B1, B3 and B4 prototyped on 2026-10-27 (playable with `?proto=b1`, `b3`, `b4`): mono Gill Nest still wins 98–100% under each; see the [results](balance-backlog.md#prototype-results-2026-10-27). Round 2 (Gill Nest interval, T1–T3, defender diagnostic): no setting passes; the closest feel test is `?proto=b1,approachRush.speedMult:2,approachRush.seconds:1,building.gillNest.spawn.interval:21` ([results](balance-backlog.md#round-2-results-2026-10-27)) |
| F3 | "Did losing forward buildings feel fair and readable?" has no answer yet | M1 playtest gate | Needs a playtest where the player builds forward |
| F4 | A player never noticed the economy buildings and lost battle 1 | §10.2 tray, §6.2 income | UI change made 2026-10-28: economy cards come first with a gold role tag, plus a one-time battle-1 tip at 0:30. No balance change. Ask next round whether players spot the Cellar |
| F5 | Tray cards aren't laid out intuitively and need tooltips | §10.2 tray | UI change made 2026-10-28: role tags, a plain one-line summary, and a hover/keyboard tooltip with full stats and matchups. Ask next round whether the cards read better |
| F6 | Units capture columns awkwardly | §4.3 territory, E1 Hold/Advance (`?proto=hold`) | Open, no change. Gather more feedback, including on the `?proto=hold` build, and ask what "awkward" means (see the 2026-10-28 entry) |
| F7 | Buildings need more feedback, e.g. a coin popping off economy buildings when they pay | §13.6 effects | Coin pops and a gold-counter pulse added 2026-10-28. Spawn-timer rings and sound are candidates, not started |

## 2026-10-28: playtester notes (relayed by the user)

**Missed economy buildings (F4).** One player didn't realize economy buildings existed and lost his first round. The user suggested making economy the first card in the tray.
- In a run, the starter tray is Sporeling Burrow, Capguard Hall, Truffle Cellar, so the Cellar was already one of three cards. Position alone wasn't the problem: nothing on the card said "this makes money".
- Economy may not have been the whole reason for the loss. Over 20 seeds against `bot:balanced` on Bogwater Hollow, `bot:rush` (no economy) still wins 60% and `bot:greedy` 55%. A Truffle Cellar (◆ 150, +4 gold per 5 s) pays for itself in about 3:07, or about 2:05 on Rich Loam. Battle-1 difficulty is a known issue: 41% of runs end in battle 1 ([engagement review](engagement-review.md)).
- Done (UI only): the tray groups cards by role with economy first, and hotkeys follow that order. Each card has a colored role tag. In battle 1, if no economy building is built, queued or being placed by 0:30, a 6 s tip names the Cellar and its hotkey, and the economy cards pulse for 12 s.

**Card layout and tooltips (F5).** The same player found the unit/building cards hard to read.
- Before: the face showed jargon like "crush 24 / 3s · r6" and "strong vs light · medium", and the only tooltip was the browser's built-in `title` text with just the description.
- Done (UI only): the card face shows hotkey, price, sprite, name, role tag and one plain line ("2 Sporelings / 16 s", "+4 gold / 5 s", "crush splash · range 6"). Hovering, or keyboard focus, opens a tooltip with the description, what it makes, unit HP and attack, strong vs / weak vs, armor, siege or slayer, merge perks, building HP and, for economy, the payback time. Stats come from the compiled side, so upgrades show.

**Column capture feels awkward (F6).** Discussed by the playtesters; the user wants more feedback before changing anything and hopes Hold/Advance helps.
- Hold is still a prototype, off by default. Playtesters only get it from `?proto=hold` (https://swalliso.github.io/Sambattler/?proto=hold).
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
