# Playtest feedback

Human playtest notes, newest first. Each entry records what the player said and links it to the guardrail or tuning knob it touches. Nothing here is acted on until the user says so. Data changes still go in `data/CHANGELOG-balance.md`.

## Open items for the next milestone

| # | Feedback | Related | Status |
|---|---|---|---|
| F1 | Forward building isn't worth it: the surcharge feels steep and gives little in return | §6.3 `supplyLinePerColumn`, §4 territory | Open, not started. M3 adds optional payoffs as drafts: the Forward Spores relic (surcharge halved) and Martyr's Bloom (destroyed buildings burst); the base rule is unchanged |
| F2 | Gill Archers (Gill Nest) are still the best unit | G3, `data/CHANGELOG-balance.md` "Open: G3" | Open, fix waits on the user. Re-measured after M3 (2026-10-26): mono Gill Nest still wins 100%, with drafts, upgrades and relics on and against a reference bot that fields Tender's Ring |
| F3 | "Did losing forward buildings feel fair and readable?" has no answer yet | M1 playtest gate | Needs a playtest where the player builds forward |

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
