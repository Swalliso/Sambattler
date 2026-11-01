# Symbiotic Colonies: proposed playable slice

> **Archived: v1 era.** Written before [SPEC v2](../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../README.md)).

A Codex draft, written in a Codex session on 2026-10-29. It stayed in a Codex worktree until the user asked for it here, and was copied as written on 2026-10-31. **Nothing in it is adopted.** [Colony and swarm](colony-swarm.md#the-codex-draft-and-what-wed-change) reviewed it on 2026-10-29/30: it keeps the plots, the announced offers and a standalone trial, and would change the timer-trim effects, the hand wiring and the all-at-once trial setup.

Draft for discussion, 2026-10-29, against `38b707a`. This proposes implementation work; it does not amend the adopted game rules. No gameplay implementation accompanies this document.

## 1. The experience we are testing

**Build a colony whose parts make each other useful, reserve room for a future relationship, then watch that relationship change the army.**

The user's intended inspiration is the planning and eventual payoff in 9 Kings, Combolands, and Balatro. The reward here is a distinctive army and a colony that works differently. There is no combo score, scoring phase, multiplier meter, floating combo total, or extra currency.

Example player intention: “I will keep these two plots open. When I get the Rootbreaker, I can connect my cheap merging troops to it. Growing Elders will then help my siege production.”

The first slice tests anticipation, spatial commitment, and functional relationships. It does not attempt the complete future ecosystem of unusual builds. A collection of universal adjacency percentages would not satisfy this proposal.

### Research behind the synthesis

| Reference | Relevant verified ingredient | Design inference for this slice |
|---|---|---|
| 9 Kings | A compact starting 3×3 plot arrangement; buildings such as the Blacksmith and Farm affect neighboring pieces. [Plots](https://wiki.hoodedhorse.com/9_Kings/Plots), [cards](https://wiki.hoodedhorse.com/9_Kings/Cards). | Positions should have opportunity costs, and a later piece should change the value of an earlier position. |
| Combolands | Placement, synergies, and cascading building interactions are central; upgrades can change building behavior. [Official description](https://store.steampowered.com/app/4075620/Combolands_Roguelike_Citybuilder/). | A building can be the beginning of a relationship with another system, rather than an isolated purchase. |
| Balatro | Jokers can affect scoring, card behavior, or economy, while other cards alter the deck. [Official FAQ](https://www.playbalatro.com/faq). | The important reward is discovering that one choice makes several later choices more interesting. No poker or scoring system is required. |
| Combolands' development | The designer reports that the early demo contained interesting systems but many players never reached the enjoyable parts. [Developer retrospective](https://www.reddit.com/r/IndieDev/comments/1u239z3/overhauling_the_demo_for_our_roguelike/). | Guarantee access to one complete relationship early in the trial; random rare offers would be a poor test. |

These are our proposed rules, not descriptions of those games' internal formulas. In particular, no official Combolands recursion or resolution-order specification was verified.

## 2. Recommended slice and boundaries

Build **one standalone Colony Trial**, with two opponent fixtures, using the existing battle view, combat, continuous spawning, Hold/Advance, and merging. Target a battle lasting roughly 5–8 simulation minutes; retain the existing 10-minute limit and victory rules. Fixture tuning can change that target after observation.

The trial includes:

- One mirrored map with nine construction plots per side: six safe and three on contested ground.
- Existing Burrow, Hall, Cellar, and later Rootbreaker.
- Two new support buildings with explicit source and recipient connections.
- Two later relic choices that change connection geometry or distribute a benefit.
- A small, announced choice sequence so the player can plan for a later piece.
- Connection previews, readable conditions, production-timer feedback, and a concise contribution report.

This is a deliberate exploration of SPEC §17's excluded core placement synergies. Plot restrictions are also a new map rule. Existing Mycorrhizal Link remains an existing adjacency relic; it is not being presented as new functionality.

Campaign integration, persistent layouts, a second resource economy, permanent per-unit stat buffs, arbitrary trigger scripting, building relocation, and a general-purpose colony-optimizing AI are follow-up decisions. They are not prerequisites for this trial.

## 3. Map: a neighborhood worth planning

Use a dedicated `symbiosis-garden` map:

| Field | Proposed value |
|---|---|
| Battlefield | 32 columns × 6 rows, one lane |
| Home territory | Four columns per side, as today |
| Building footprint | Existing 2×2 footprint |
| Player plot anchors | Columns 0, 2, 4; rows 0, 2, 4 |
| Enemy plot anchors | Exact point mirrors of the player anchors |
| Other construction | Disallowed on this map |
| Terrain | Soil; no loam or stumps in the first fixture |

The layout is a logical construction grid over the battlefield, not a change to unit movement. Units continue walking through buildings under current rules.

```text
                 Safe ground     Contested extension
Plot row A       A1    A2         A3
Plot row B       B1    B2         B3
Plot row C       C1    C2         C3
```

Columns 1 and 2 provide six safe plots. Column 3 becomes available only when the entire 2×2 footprint is owned, and is vulnerable under the usual building/territory rules. It does not unlock permanently after the first capture. Forward prices remain subject to the normal supply-line formula.

Both initial engines fit entirely in safe space. Expansion enables a different arrangement or another branch; it must not be necessary to discover the basic payoff. This avoids granting the first useful engine only to a player who is already winning.

This map reduces lane height and protected capacity relative to Bogwater. Those are experimental changes requiring separate calibration; a win-rate change on this map cannot be attributed solely to symbiosis.

## 4. Shared relationship rules

### Connections

Each support has one configured source and normally one recipient. A source and recipient must be live, friendly buildings in the same lane. All connections are plot relationships; ordinary unit distance does not determine eligibility.

- A **Nurse Ring** takes a Cellar as its source and a spawner as its recipient.
- A **Knitting Loom** takes one spawner as its source and another spawner as its recipient. In this trial they must be different entities and different building types. This deliberately tests a mixed-army relationship before exploring self-feeding copies of one producer.
- By default, source and recipient must each occupy a plot orthogonally adjacent to the support. Diagonals do not count.
- A producer can receive from at most one support at a time. It can simultaneously be the source for the other support. Thus Cellar → Nurse → Burrow → Loom → Rootbreaker is a valid layered build, while both supports feeding the same Rootbreaker is not. Assigning an already-claimed recipient rejects visibly; it never disconnects the old support silently.
- The trial allows at most one standing support of each type per side. This controls the first test's content space, not the eventual ceiling of the whole game.

The player chooses the connections. If there is exactly one valid configuration when a support is placed, it can be selected automatically and shown immediately. Otherwise the support remains visibly unconfigured until the player selects its source and recipient. No hidden nearest-building or entity-ID targeting.

An explicit Clear connections action releases a support's recipient claims and stops future benefits. It records a configuration change, restarts warmup, and retains the Loom's cooldown. Selling or destroying that support also releases its claims. A broken source link alone does not silently reassign or release its configured living recipients; the player can clear or reconfigure it. Pending earned requests still retain their original IDs and can deliver under the rules below.

Changing connections is allowed while paused and during live play through the ordinary deterministic command queue. A changed endpoint restarts the support's 10-second warmup and retains any outstanding cooldown. Repeating the identical configuration is a no-op. Invalid changes leave the previous configuration intact. A change cannot redirect an effect already earned. The renewed warmup makes this an investment decision rather than an incentive to switch targets before every payout.

### Activation and loss

- A support becomes eligible at the latest of placement +10 seconds, last valid configuration change +10 seconds, and its cooldown-ready tick. Deploy time does not count.
- A destroyed or sold building breaks its connections. The support keeps the missing connection visible; it does not silently choose another building.
- Rebuilding produces a new entity. It inherits no connection, readiness, or pending benefit from the old building.
- A support that has emitted a benefit has produced value for refund purposes, ending its unused-building full-refund entitlement.
- Losing a support stops future benefits. It never removes stats from existing units; they are ordinary units throughout.
- An effect already earned can still reach its original living recipient on the next tick if the support subsequently falls. It cannot transfer to a replacement building.

## 5. Two seed engines

All costs and timing values below are explicit first-pass hypotheses. They must be data-driven and tuned against observed payoffs. Neither engine is assumed balanced against the other.

### A. Nurse Ring: turn economic flexibility into production

**Proposed definition:** utility; 2×2; 120 gold; 400 HP; one Cellar source and one producer recipient.

On the linked Cellar's normal five-second income tick, an active Nurse may divert **2 gold of that building's payout** to advance the recipient's current production timer by **up to 2 seconds**. The request applies on the next live tick.

The Cellar must actually be entitled to at least 2 gold after existing income modifiers and suppression. Stipend, interest, comeback income, and other Cellars are not eligible donors. The diverted amount never enters the player's gold bank or gold-earned totals; record it separately for explanation. On this fixture, the ordinary Cellar's 4-gold payout becomes 2 gold when feeding succeeds.

No diversion occurs if the Nurse is inactive, the links are invalid, or no recipient is eligible for useful progress. Some progress may be clipped if the recipient becomes ready before the request applies; there is no refund or banked remainder.

**Player plan:** build an economy early, then commit part of it to a specific army producer. Later switch the recipient from cheap bodies to a siege building, or keep the money to buy another independent producer.

This is an investment tradeoff, not a free production aura. Faster output should be worth the support's occupied plot, purchase price, and forgone income in some situations, but not every situation.

### B. Knitting Loom: turn successful merges into reinforcements

**Proposed definition:** utility; 2×2; 140 gold; 450 HP; one producer source and one different producer recipient.

When a completed merge includes at least one descendant of the linked source producer, an active Loom can advance its recipient's timer:

| Result of the merge | Production progress |
|---|---|
| A Bloomed unit | Up to 4 seconds |
| An Elder | Up to 12 seconds |

The Loom then has a **10-second cooldown**, shared across both merge tiers and retained across connection changes. One merge event can activate a Loom at most once, even when several parents came from its source. Events during cooldown do not accumulate.

For the trial only, a newborn records the ID of its originating producer in a small symbiosis-origin set. A merged unit receives the sorted union of its parents' sets. The source qualifies if its ID appears in that union, once per merge event. This keeps an Elder's origins honest when several producers contributed earlier generations. No historical unit graph is needed. The existing single `sourceBuildingId` used for damage attribution remains unchanged, and no stats are inherited through the new origin set. Ordinary battles without symbiosis create no such state.

If no recipient can accept useful progress, there is no emitted effect and no cooldown consumption. The event is not saved for later.

**Player plan:** produce inexpensive bodies, use Hold/Advance and existing merge tools to cultivate veterans, and turn those merges into more timely output from another producer. An eventual Elder creates a larger production breakpoint. The player must choose between protecting this process and advancing before the merge is ready.

The Elder payoff is included because an entirely flat timer bonus could make both buildings feel like interchangeable spawn-speed upgrades. It still needs testing: a larger number alone does not prove that the player experiences a different strategy.

### Concrete starting layouts

All three occupied plots in each example are safe. Each dash is an unused plot, not a required vacancy.

```text
Economic nursery             Merge-fed reinforcement
Cellar     —       | —       Burrow     —       | —
Nurse      Hall    | —       Loom       Hall    | —
—          —       | —       —          —       | —
```

In the first layout the Cellar pays through the Nurse to the Hall. In the second, merges involving the Burrow's units feed the Hall through the Loom. A later Rootbreaker can replace the intended Hall position in the plan, or occupy another plot once connection geometry changes. This is why the upcoming offer is visible in advance.

## 6. Later choices that change the arrangement

Two new trial-only relics make the same buildings useful in different layouts:

| Relic | Rule | Spatial decision |
|---|---|---|
| **Long Roots** | Recipients may be up to two orthogonal plot steps from their support; Manhattan distance ≤2. Sources still require direct orthogonal adjacency. Occupied intervening plots do not block the connection. | Reserve a valuable neighboring position, reach a producer diagonally or farther forward, or separate the two engines. |
| **Forked Hyphae** | A support may configure two distinct recipients, splitting its existing progress budget equally. It gains no additional total progress. | Feed one expensive producer strongly, or distribute assistance between different army roles. |

For Forked Hyphae, divide by the number of configured recipients, including a configured recipient that has since become invalid. Discard invalid shares instead of concentrating them on the survivor. Round down at the simulation's half-tick precision. The UI names the split and any inactive share. An explicit reconfiguration can return to one recipient; it does not reset cooldowns.

These relics are alternatives in the curated offer, so the first trial need not test their combination. They affect only the two new support types, not every existing relic or trigger. Loom recipients must still differ in building type from its source, including both recipients of a fork.

Potential outcomes include a focused economic siege producer, a mixed formation sustained by a merge engine, and a distributed colony that reaches forward without moving its supports. Larger future designs could build on different consequences—escorts, death recycling, transformation—if this foundation proves enjoyable. Those are not promises of extra content in this slice.

## 7. A trial that exposes the idea early

Use a declared 500 starting gold for **both sides**. This is fixture calibration, not a new campaign economy rule.

| Moment | Guaranteed offer/access |
|---|---|
| Before Begin | Familiar kit: Burrow, Hall, Cellar. Choose Nurse Ring or Knitting Loom as an additional blueprint. The choice grants access, not a free standing building. |
| 2:00, paused | Choose Rootbreaker blueprint, Knitting Circle, or Fresh Spores. These existing definitions keep their current effects. |
| 4:00, paused | Choose the other support blueprint, Long Roots, or Forked Hyphae. |
| Afterward | Play to the ordinary victory condition; no further curated offers. |

The trial replaces its normal draft schedule/pool with these announced offers. It does not also roll ordinary drafts at the same boundaries. The pool is not rerolled: each offer allows one pick or the existing skip-for-gold choice. Normal campaign drafts and rarity remain untouched by this proposed fixture. Before implementing the 4:00 offer, paper-test it with occupied layouts and declared gold: the second support adds a paid building and consumes space, whereas the two relics modify an existing relationship for free. It is not assumed that these are equally attractive. Revise this offer if the second support always wins despite those costs.

Display the upcoming choices from deployment, so saving a plot is an informed plan rather than a wager that the random pool will contain the needed piece. Existing items are unique under their normal ownership rules. Each seed provides reproducible combat, not hidden changes to the announced offers.

Two explicit initial test lines fit the budget:

- Cellar 150 + Nurse 120 + Burrow 110 = 380, leaving 120 for the next purchase.
- Burrow 110 + Loom 140 + Hall 150 = 400, leaving 100.

Provide two opponent fixtures: one emphasizing cheap-body pressure and one emphasizing a sturdier mixed advance. They obey the same costs, capacity, construction anchors, link rules, and starting gold. Use declared legal build/connection policies rather than hidden bonuses or a new optimizer. Their two curated picks are fixed and inspectable.

The first test deliberately excludes Gill Nests from both kits to avoid making the known archer question decide the symbiosis experiment. This does not resolve or alter that separate balance problem. Broader roster tests are required before campaign adoption.

The entry should be a development-site Colony Trial using the ordinary battle view. The feature is developed from `develop` and playtested there according to project practice; no new `?proto=` rules are proposed for the released game.

## 8. What the player sees

### Before committing a placement

Show valid plots, the footprint, price, and affected connection geometry. Hovering a candidate support identifies eligible source and recipient buildings. The final choice uses explicit selections when there is more than one valid configuration.

The preview speaks in game terms: “This Cellar can feed that Hall. The Cellar earns less gold while it does.” For a Loom: “Merges involving this Burrow's units help that Hall produce sooner.” Show missing conditions directly.

The preview includes pending paused/deploy placements and connection changes. It uses a copied/projected state and the same eligibility rules as simulation. It must not mutate live state, fabricate payouts, or silently assume future building IDs.

Represent a queued configuration by the support/source/recipient plot anchors plus expected building types, queued after the relevant placement commands. At execution, resolve those plots, validate the whole configuration atomically, and store the actual entity IDs. If a prior purchase failed, reject the configuration visibly. This is explicit one-time binding: a later replacement on the same plot does not inherit the links. The command also validates the acting side's ownership, one-recipient claim rule, current relic reach, and the support's target count.

### While the engine works

- Selected supports reveal their connections and source/recipient names.
- Inspection shows warmup, cooldown, lost connections, supply blocking, and the current rule, including the Elder distinction.
- A production ring or equivalent existing-style indicator makes a recipient's next spawn readable.
- A brief thread pulse links the source event to the support and recipient when a real effect applies. A recipient's timer visibly advances.
- The army provides the eventual payoff: more timely existing units and the normal merge/release behavior. There is no separate scoring spectacle or forced chain animation.
- New sound cues, if needed, reuse the existing sound system with rate limiting. Reduced motion removes the travel animation while preserving the state change and readable relationship.

### After the battle

Add a compact relationship contribution section: gold diverted by a Nurse, qualifying Loom activations by merge tier, actual production time advanced per recipient, and batches that received assistance since their previous spawn. Keep these inspectable facts out of the main combat HUD.

Do not claim “created four extra units” or “won the battle” without a counterfactual. “This Hall received production assistance” and “12 seconds of its remaining production time were removed” are directly measurable.

## 9. Simulation contract and difficult cases

Use one new runtime action family: **advance a named producer's current timer**. Existing merge stats and damage-attribution inheritance remain unchanged; the small origin set tracks eligibility only.

1. Sources emit typed requests during the existing income or merge systems. Requests contain stable entity IDs, earned tick, due tick, support type, requested progress, and source cause.
2. Apply due requests on the next live tick, after commands and before clock/income/spawning. Thus a same-tick sale can invalidate a recipient; presentation cannot create an extra spawn or delay commands.
3. Use a declared stable order based on side-local plot coordinates, support type, and cause sequence. Distribute Forked shares before applying them. Apply both sides under the same ordering policy.
4. A recipient must be a standing spawner with remaining production time and room under the current supply cap for its ordinary base batch. Check this from current state; `holding` alone may be stale. Validate at request creation and again when applying. Invalid requests expire with no bank or transfer.
5. Clamp its timer at zero. Excess progress is discarded. The ordinary spawning system remains the only owner of supply checks, unit creation, spawn statistics, and production-timer reset.
6. Existing timers use half-ticks: at 20 Hz, two seconds of normal progress equals 80 half-ticks. Use integer conversions and share the helper with preview/report calculations.
7. A newborn does not directly re-trigger a support. It can participate in a later ordinary merge, subject to normal combat/merge rules and support cooldown. There is no recursive spawn handler or within-tick trigger loop.
8. A recipient has one configured support owner. If a pending request from its old relationship overlaps a later request after valid reconfiguration, apply both in the declared order and clamp each. Report actual progress, not requested progress. A temporary overlap does not grant a continuing second connection.
9. Set support `hasProduced` and a Loom's cooldown when a valid benefit is emitted, even if the recipient disappears before application. Reconfiguration retains cooldown and restarts warmup. Refund/replant cannot repeatedly earn a fresh ready trigger.
10. Income diversion is calculated before crediting Cellar income. Record net gold, diverted gold, and actual progress separately. The income HUD must account for the conditional diversion and explain when the donor pays its normal amount because feeding is unavailable.
11. Resolve a draft-boundary tick using the pre-choice state, consistent with the existing system order. The newly selected card begins affecting subsequent ticks. Do not imply a choice altered a benefit already earned on that boundary.
12. Warmup, cooldown, connections, pending requests, assistance attribution, and trial-only unit origin sets belong in deterministic simulation state and snapshots. The renderer reads state/events; it owns no gameplay timers.

Default battles without this feature must retain their existing fingerprints. A save with different feature rules follows the existing incompatible-battle recovery policy, preserving the run where applicable; a trial uses isolated/nonpersistent campaign storage and never overwrites an ongoing run. Its deterministic snapshot tests still cover all new state.

## 10. Implementation work packages

| Package | Deliverable | Completion evidence |
|---|---|---|
| **A. Trial geometry and setup** | Paper-test the two engine layouts and 4:00 offer, then add optional map construction anchors, mirrored map, declared budget and curated offer harness; familiar buildings only at first. | At least two different later choices make sense across the test layouts; placement, symmetry, ownership, pricing, and legal opponent policies verified. Space can be explored before adding synergies. |
| **B. Relationship model and commands** | Support definitions, source/recipient configuration, shared eligibility/projection helpers, lifecycle state, ownership limits. | Deploy, pause, queued placement, retarget, sale, and rebuild behave consistently. |
| **C. Two working engines** | Net-income diversion, parent-source merge context, bounded timer requests and assistance attribution. | Each complete relationship works headlessly, independently and layered, with deterministic ordering. |
| **D. Relics and purposeful choices** | Long Roots, Forked Hyphae, announced 2:00/4:00 offers and opponent picks. | Geometry changes create valid alternative layouts; invalid recipients and split shares are explained correctly. |
| **E. Player-facing feedback** | Placement/connection previews, timer feedback, inspection, restrained event cues, contribution report. | A player can predict a relationship and recognize its operation without a developer explanation. |
| **F. Review and playtest** | Automated checks, reproduced fixtures, manual observations, adoption/change/rejection recommendation. | The criteria below are evaluated; no automatic promotion into campaign rules. |

Likely touchpoints include `src/data/schema.ts`, map/building/relic data, `src/sim/placement.ts`, `state.ts`, `commands.ts`, `effects.ts`, `step.ts`, income/spawning/merging systems, snapshots/hash, the trial/draft harness, `BattleView`, inspect/placement rendering, report, and sound. Existing positional effects only cover a narrow set of building stats; this cannot be implemented purely by adding relic JSON.

Keep the relationship evaluator specific and small. Two typed support behaviors are enough. A general graph language or recursive rule engine would add considerable scope before the experience has been tested.

## 11. Verification and decision gates

### Correctness

- Verify exact adjacency/reach, map mirrors, configured recipients, invalid/missing links, and all split outcomes.
- Verify Nurse net income under ordinary payout, insufficient payout, suppression, full supply, ready timer, source loss, and retargeting.
- Verify Loom counts a mixed-source merge once, retains origins through both merge tiers, respects cooldown and differing producer types, and cannot farm deploy/pause/rebuild or recursive events.
- Verify simultaneous requests, requests crossing a draft, recipient destruction/sale, and snapshots immediately before/after request application.
- Verify pending placement previews and plot-referenced connection commands match execution, reject failed prior purchases atomically, enforce recipient ownership, and restart warmup on a changed endpoint.
- Compare both seats and several seeds. Ordinary battle fingerprints must match before/after when symbiosis is absent; trial fingerprints are intentional new fixtures.
- Run the project gates appropriate to this cross-layer work: `npm run verify`, `npm run test:browser`, `npm run build`, and `npm run build:dev`. Run the relevant slow balance checks against a recorded baseline; existing known failures remain visible and must not be called new successes or silently retuned.

### Engagement

Start with roughly five to eight exploratory players, mixing newcomers and existing players. Vary starting support and opponent order. Manual notes are sufficient; no telemetry backend is required.

The trial should make a complete relationship practically attainable within the first 60–90 simulation seconds. It should provide at least one later choice that makes the player reconsider a placement, recipient, spending plan, or hold/release decision. If the fixture commonly ends before the later offer, adjust that fixture before judging the second choice.

Ask:

- Which future piece or effect were you leaving room for?
- Why did this support belong in that position?
- What did completing the relationship change about your army?
- When would you prefer the other engine or another independent producer?
- What would you try next, and why?

**Continue** if players can anticipate the relationship, notice the payoff, and propose materially different layouts or plans. **Revise** if a single hub or the same recipient is always chosen, if Nurse makes Loom unattractive, or if the change feels like an imperceptible spawn-rate modifier. Increasing bonuses alone is not an adequate answer to that last problem; change a relationship's behavior if necessary. **Stop or change direction** if wiring consumes more attention than the payoff earns, or if expansion merely amplifies a lead.

These are qualitative gates, not a statistical claim that a small sample establishes retention or commercial success. More clicks, time played, and wins are not sufficient evidence.

## 12. Decisions after the slice

If this works, the next design question is run continuity: preserve the physical colony, carry a deployment plan to a new battlefield, or make reconstruction on each map an intentional puzzle. That decision should be made before multiplying support/relic content or integrating meta progression.

The eventual ceiling can include stranger interactions than timer assistance. This slice establishes whether players enjoy reserving space and building relationships among economy, production, merging, and territory. A successful first result is a player describing their colony by what it does together, rather than listing which buildings they purchased.
