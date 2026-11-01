# Spore & Sprawl: fun, agency, and fresh design directions

A Codex note, written in a Codex session on 2026-10-29. It stayed in a Codex worktree until the user asked for it here, and was copied as written on 2026-10-31, with its links to repo files adjusted for this folder; the experiment JSON it cites wasn't kept. **Nothing in it is adopted.** It hasn't been reviewed against the repo: the [ledger](after-the-rework/ledger.md)'s CX section (1.9) lists its ideas as CX-1 to CX-8, with their status at `ef2e133`.

Research and brainstorming, 2026-10-29. Reviewed checkout: `38b707a` (M4 plus the completed UI/UX work). **These are hypotheses, not adopted rules or a replacement roadmap. No gameplay changes were made.**

The central recommendation is to strengthen the player's ability to form a plan, recognize its payoff, and try a different plan. Autonomous combat can support all three. Adding activity is useful only when the activity changes a consequential decision.

## Evidence and scope

This review combines current source/data, the spec, recorded human feedback, the prior engagement and UI/UX reviews, a browser walkthrough of the current local build, research into thirteen related games, and fresh simulations. The browser work is a qualitative walkthrough, not a controlled human playtest. External mechanics are sourced below; proposed benefits for this game are design judgments that need testing.

The current game already has placement and selling, merge toggles, Hold/Advance, drafts/rerolls/skips, route choices, events, Groves, relics, and adaptive generals. It also now has sound, stronger presentation, economy feedback, an illustrated route, and a staged battle report. The problem is not a literal absence of decisions. It is that too few decisions produce a distinctive, readily understood plan.

The following are **already planned or previously raised**, so they are context rather than discoveries:

- M5–M8: commanders and active powers, strains, traits, feats, mastery, blights, more enemy content, and tutorial work.
- Existing engagement/balance work: archer dominance, forward-building economics, the Heartcap cliff, early-run difficulty, stronger drafts, and more distinctive counter moments.
- Existing UI work: sound, puffs, motion, settings, clear cards, route art, report presentation, and color assistance.
- Existing mechanics worth extending carefully: Mycorrhizal Link already rewards adjacency; selling already frees a tile and returns gold; standalone battles already offer same-seed rematches.

Some attractive ideas are deliberate v1 scope changes. SPEC §17 excludes core adjacency systems, direct formations/rally points, movement-changing terrain, in-place upgrades, replay-viewer UI, daily-seed UI, and multiplayer. Brainstorming them is appropriate here, but they must be identified honestly. None should slip into the backlog as a supposedly missing implementation detail. The older §17 audio exclusion is stale relative to shipped sound and the later audio specification.

### Fresh pacing check

Command: `npm run experiment -- --checks engagement,runs --seeds 30 --runs 80 --label fun-review-2026-10-29`.

The machine-readable result is `fun-review-2026-10-29.json` (raw output not kept). This file is a generated local report; the key results are preserved here.

| Current-build measurement | Result | Appropriate interpretation |
|---|---|---|
| First territory flip, median by opponent | 0:34–1:29 | The old three-minute opening diagnosis is no longer current. This measures initial territory movement, not necessarily the first contested fight. |
| Combined supply at 2:00, median by opponent | 10–15 | Early armies remain relatively small. Supply is not identical to entity count. |
| Losing Heartcap: first damage to rout, median by opponent | 14.4–26.1 seconds | The final collapse is still abrupt. |
| Winning Heartcap untouched | 120/120 battles | The winner rarely experiences the advertised attrition in this reference sample. |
| Automated runs ending in battle 1 | 46/80 | The reference strategy has difficulty reaching later content. This is not a measured human failure rate. |
| Automated runs ending in battle 2 | 22/80 | Much of the run's variety is inaccessible to this strategy. |
| Boss reached / runs won | 9/80 / 8/80 | The boss result is conditional on a small, selected set of survivors. |

Single battles use `bot:balanced`, 30 seeds against each of four opponents, on Bogwater Hollow. Runs use `bot:balanced`, greedy drafts, random routes, and 80 seeds. These are pacing diagnostics, not enjoyment or skill measurements. G3 and the full balance suite were not rerun for this review; historical archer percentages must not be relabeled as fresh results.

The earlier [engagement review](../engagement-review.md) contains both pre-Hold findings and later adoption information, including a stale concluding recommendation not to adopt Hold. Current code and the adoption note take precedence. The [UI/UX plan](../ui-ux-plan.md) is completed, despite older feedback still calling sound a candidate.

## What appears to be missing

| Desired player feeling | Current limitation | Opportunity |
|---|---|---|
| “I am working toward something specific.” | Most battle decisions serve the same distant goal: eventually break the Heartcap. | A chosen local objective with a visible endpoint. |
| “This is my particular colony.” | Much of progression adds another producer or improves its numbers. Interesting interaction relics exist, but are often rare. | A few relationships that change how pieces work together. |
| “I can respond to what I just learned.” | A warning does not always coincide with the money, space, or kit needed to pivot. | Limited reconfiguration or a separate practice attempt. |
| “I made that happen.” | Totals, damage MVPs, and the front graph show outcomes better than they explain the player's contribution. | Factual turning points and visible support contributions. |
| “I wonder whether this would work.” | The cost of testing a different idea can be another long battle or run. | Short, optional, reproducible experiments. |
| “I remember that particular fight.” | Buildings and units have histories, but most are anonymous and each battlefield resets. | Small emergent stories attached to actual events. |

The fungal premise is an unusually good fit for interdependence, cultivation, maturation, decomposition, and regrowth. Those verbs could give this game its own identity. They should each earn their complexity through an interesting tradeoff.

## What comparable games suggest

The window is approximately 2021–2026; some 2021 releases sit slightly beyond a strict five-year cutoff. Years refer to full releases unless noted. This is a selective comparison of relevant mechanics, not a claim that copying a feature reproduces a game's commercial results.

| Game | Sourced design pattern | Inference for Spore & Sprawl |
|---|---|---|
| **Mechabellum (2024)** | Formations and unit technologies let players revise their answer to an opposing army; technologies can change roles substantially. [Official description](https://store.steampowered.com/app/669330/Mechabellum/) | Watching is engaging when it tests a plan that can be revised. Preserve low input demands while increasing the significance of an adjustment. |
| **Backpack Battles (2025; EA 2024)** | Buying, combining, and spatially arranging items determines an automatic battle's strength. [Official description](https://store.steampowered.com/app/2427700/Backpack_Battles/) | Building the machine can be enjoyable in its own right. Relationships between a small number of pieces matter more than catalogue size. |
| **Super Auto Pets (2021)** | Distinct pets form small teams; asynchronous Arena allows untimed planning, while changing weekly packs constrain the available combinations. [Official description](https://store.steampowered.com/app/1714040/Super_Auto_Pets/) | A bounded possibility space helps players recognize combinations and experiment. Multiplayer and weekly modes are not necessary to borrow that principle. |
| **Legion TD 2 (2021; EA 2017)** | Gold competes between defense and workers; the secondary resource can support regular income or a larger saved attack. [Developer gameplay guide](https://steamcommunity.com/sharedfiles/filedetails/?id=1793195628) | Competing uses and time horizons create agency during automated fighting. Importing a complete second economy would be excessive. |
| **The Last Flame (2025; EA 2024)** | Automatic fights are shaped through heroes, equipment, crafting, positioning, and route decisions. [Official description](https://store.steampowered.com/app/1830970/The_Last_Flame/) | The satisfying object is a build the player feels they discovered. Much of this is already addressed by planned strains and existing relics. |
| **Despot's Game (2022)** | Preparation and class combinations drive indirect combat. The developers later offered a No Food mode for players who disliked food management. [Official update](https://store.steampowered.com/news/posts/?appids=1227280&enddate=1683820955&feed=steam_community_announcements) | Additional upkeep can become an annoyance rather than useful depth. New resources must pass a meaningful-choice test. |
| **Balatro (2024)** | Jokers alter scoring, cards, or economy; Tarot cards alter the deck; Boss Blinds impose restrictions. [Official FAQ](https://www.playbalatro.com/faq) | A choice is especially interesting when it changes the value of subsequent choices. More isolated bonuses do less for build identity. |
| **Loop Hero (2021)** | The player places terrain, buildings, and enemies along an automated expedition, shaping danger and rewards. [Official description](https://store.steampowered.com/app/1282730/Loop_Hero/) | Choosing to invite a specific danger can create ownership without taking control of attacks. |
| **Luck be a Landlord (2023; EA 2021)** | The developer has explicitly designed support for weak early picks and recovery effects for failed builds. [Developer balance commentary](https://blog.trampolinetales.com/the-big-buffs-update/) | Interesting experiments need plausible ways to become useful or pivot. A long punishment for a speculative pick discourages discovery. |
| **Against the Storm (2023)** | Optional Timed Orders offer a demanding commitment for a stronger reward; the developer describes voluntary risk as the intent. [Developer explanation](https://eremitegames.com/time-is-money-update/) | Let players choose an extra purpose within a battle, rather than passively receiving all difficulty. |
| **Dome Keeper (2022)** | Mining opportunities compete with returning in time to defend, and resources have several investment uses. [Official description](https://store.steampowered.com/app/1637320/Dome_Keeper/) | A foreseeable opportunity and a costly commitment can create anticipation. A separate mining activity is unnecessary here. |
| **The King Is Watching (2025)** | A limited gaze activates selected economic or military production. [Official description](https://store.steampowered.com/app/2753900/The_King_is_Watching/) | One scarce allocation can create more interesting decisions than several independent abilities. Avoid constant production babysitting. |
| **Thronefall (2024; EA 2023)** | Daytime investment feeds nighttime defense. Its developer describes addressing demands for more options by making existing choices more influential. [Official description](https://store.steampowered.com/app/2239150/Thronefall/), [developer interview](https://int-magazine.com/interview/paul-schnepf-of-thronefall/) | Improve the consequences of an action before increasing the number of actions the player must manage. |

These include demonstrated commercial successes: Playstack reported over five million Balatro copies by January 21, 2025; Backpack Battles' Japanese publisher reported over one million in March 2026; Thronefall's developer press release reported just under one million in September 2024. These dated milestones establish relevance, not causal proof about any mechanic. [Balatro publisher](https://www.playstack.com/news/balatro-5-million-copies-sold/), [Backpack Battles publisher](https://game.shochiku.co.jp/wp-content/uploads/2026/03/20260327_BPBverEN-3.pdf), [Thronefall release announcement](https://www.gamespress.com/de/-Indie-super-hit-Thronefall-is-leaving-early-access).

## Candidate 1: optional battle commitments

**The experience:** “I want to win, but I also chose to protect this particular growth.”

At deployment, offer one optional undertaking appropriate to the map and available kit. For example, protect a marked forward outpost through a declared interval in exchange for a known, bounded reward. The player can decline. The undertaking changes deployment or spending, and its progress is visible on the battlefield.

The valuable part is making a promise and deciding what to sacrifice for it. A counter such as “spawn 100 units” mostly measures ordinary play. A worthwhile undertaking asks for a different plan. A reward that helps shape the next battle may create more identity than another lump of gold.

This is distinct from planned feats: it is selected now, influences this fight, and pays within the run. It also differs from an elite node because it changes how the battle is approached.

**Risks:** rewarding the already optimal build, encouraging stalling, disguising mandatory difficulty as optional, or sending beginners forward before forward play is viable. Never pay repeatedly for deaths, merge counts, or stance toggles. A preview must reveal the actual requirements and reward.

**Smallest test:** paper-test two undertakings plus “none” against several real board states, including states where the player is behind. Ask what they would build or time differently. Reject the concept if the same offer wins every comparison or players accept it without changing their plan.

**Priority:** strongest first gameplay hypothesis. Confidence in the problem is higher than confidence in a particular objective or payout.

## Candidate 2: a temporary battlefield opportunity

**The experience:** “That patch will ripen soon. Is this the moment to release my army?”

A marked bloom patch announces a single opportunity at a known time. Control of its column during the relevant window earns one finite benefit. On a two-lane map, pursuing it means investing somewhere other than the safest or strongest lane.

This gives Hold/Advance an external reason to exist: the player is choosing a moment for a particular purpose. It extends the old “make territory worthwhile” suggestion, but the novelty is a temporary opportunity and a changing tradeoff, rather than permanent income for holding more ground.

**Risks:** the leader collects the prize incidentally; the trailing player cannot contest it; or every battle becomes a repetitive timer routine. The first version should have one event, not recurring capture payouts. Rewards should be bounded, and the objective must not require an already dominant strategy.

**Smallest test:** compare a two-lane board with and without one announced opportunity. Ask which lane receives the next building and when the next hold ends. Reject it if the best action never changes, or if it merely forces one obvious action.

**Priority:** promising alternative to Candidate 1. Test them separately: one creates a chosen intention, the other a tactical opportunity. Do not start by combining both.

## Candidate 3: a small, expressive mycelial network

**The experience:** “These buildings form a colony that behaves differently because of how I connected them.”

Explore one optional structure or relic with a single explicit connection. For example, an economy building can feed one chosen spawner at the cost of some of its income. Choosing the beneficiary matters; drawing a link to every neighbor should not be universally beneficial. The connection's activity needs to be visible on the field.

The goal is a new relationship, not a blanket adjacency bonus. One player might cultivate an expensive producer; another might retain the income and support a wider army. A first test should use existing buildings and one rule, without introducing a whole new resource economy.

This is the largest signature opportunity: interconnected fungal growth could become the game's defining strategic activity. It is also a **deliberate scope change** if made universal. Mycorrhizal Link already exists, and SPEC §17 excludes core adjacency systems. An optional relic experiment is a smaller entry point, but still requires careful design.

**Risks:** a solved compact layout, worsening the incentive to remain at home, unreadable chains, and constant rewiring. A powerful cluster is not necessarily a varied or enjoyable puzzle.

**Smallest test:** one connection, two possible recipients, and layouts that trade safety against forward distance. Reject it if every player chooses the same cluster regardless of enemy or map, or cannot explain what the connection does.

**Priority:** most promising larger identity experiment; higher design and balance cost than the first two candidates.

## Candidate 4: cultivate, then harvest or replant

**The experience:** “I can keep this mature growth earning, or consume that investment to make a push now.”

A mature economy building might be harvested for a one-time growth effect, sacrificing its future income. For example, its spent bed could support a specific replacement or feed one nearby producer's next spawn. This should be an occasional commitment with a visible consequence.

There is an important objection: **selling already converts a building into cash and frees a tile**. If Harvest merely offers a different refund, this is an economic adjustment with a new label. It needs a distinct state transformation to justify a new verb. A limited transplant with downtime is another way to test whether players enjoy reshaping the colony; the two ideas should not arrive together.

**Risks:** always harvesting everything near the end, manual collection chores, triggering income or death-effect exploits, and overwhelming the economy. No repeated “click when ripe” routine.

**Smallest test:** compare retain, existing sell, and proposed harvest in early/late and winning/losing situations. Each should have circumstances where it is attractive. Reject Harvest if it always dominates selling or only becomes interesting immediately before victory.

**Priority:** exploratory. The thematic appeal is strong; its mechanical justification is not established.

## Candidate 5: make the player's contribution understandable

**The experience:** “I see what happened, and I have an idea for next time.”

Extend the existing report with a few meaningful event markers and contributions. Examples of safe wording include “three columns changed hands in the 20 seconds after this release,” “this Tender restored 240 HP to this Elder,” or “this Cellar produced 240 gold.” During combat, expose the particular links, triggers, and units the player has invested in.

The current report already has a graph, totals, counter history, and a damage MVP. The new layer is about interpreting a chosen plan and recognizing support roles. A support-focused colony should receive useful feedback even when its support building does not lead damage.

**Risks:** false causality and more statistics without more understanding. Fungible gold does not prove that one Cellar funded a particular purchase. Healing does not by itself prove that a unit would otherwise have died. An event before a victory is not necessarily its cause. Use observed facts and leave room for the player's interpretation.

**Smallest test:** hand-author three factual highlights for a recorded fight and compare them with the existing report. Ask players to describe the turning point and predict one useful adjustment. Reject the presentation if it creates false guarantees or merely repeats totals.

**Priority:** best low-rule-risk companion to a gameplay experiment. It improves access to existing depth but cannot manufacture depth that is not there.

## Candidate 6: a practice copy of a failed run battle

**The experience:** “I wonder whether releasing later or using a different opener would have worked.”

Let a player recreate a failed run battle with its actual kit, upgrades, opponent, and initial conditions. Ask them to change one thing. The practice result awards nothing and does not restore or overwrite the campaign. This gives the deterministic engine a useful player-facing purpose.

Standalone same-seed rematches already exist. This proposal extends experimentation to the particular situation in a run. A full replay viewer or arbitrary rewind is unnecessary for the first version and would expand the explicitly excluded replay scope.

Backpack Battles provides a useful precedent: its developers added Build History and the ability to test recorded builds against additional opponents. [Official Build History announcement](https://steamcommunity.com/games/2427700/announcements/detail/4539157321624955198/).

**Risks:** mandatory-feeling homework, brute-force retries, long repeats, or confusing practice with continuing the campaign. Enemy adaptive behavior may legitimately change when the player changes their build; the comparison is not guaranteed to isolate one downstream cause.

**Smallest test:** facilitate one replay of a failed battle with one player-selected adjustment. Ask for a prediction before and an explanation afterward. The desired response is curiosity about another plan, not merely relief that a loss was erased.

**Priority:** useful mastery feature, especially if players cannot explain losses. Less likely than a new tactical objective to solve moment-to-moment boredom by itself.

## Candidate 7: memorable colony stories

**The experience:** “That was the Elder that survived the north-lane collapse.”

Give a few meaningful units or buildings a recognizable identity during a run and retain a small chronicle of actual events. Examples: the first Elder's emergence, an exposed outpost that survived a push, a general remarking on the player's previous army, or a final image highlighting the colony's characteristic buildings.

This is about attachment to an event the player witnessed. It does not require persistent veteran power, a new faction, a dialogue tree, or an additional progression currency. Existing enemy memory and merges provide material already.

**Risks:** flavor text replacing gameplay, noisy callouts, repetitive remarks, or implying persistence that does not exist. Keep it brief and grounded in real events.

**Smallest test:** show two end-of-battle treatments—present totals and a tiny factual chronicle—and later ask what the player remembers. Keep only the elements that help them recall their own choices.

**Priority:** supporting layer after a stronger decision-and-payoff loop is visible.

## Additional ideas worth parking

- **Invite a known danger:** disturb one dormant nest for a previewed reward, choosing when to accept its threat. Inspired by Loop Hero; potentially fun, but neutral enemies add significant rules and AI interactions.
- **Commit to a route consequence:** choose a reward that changes a later destination or opportunity. The current all-to-all row connections do not impose much path commitment. This needs a separate run-structure experiment rather than a cosmetic map change.
- **Allocate a scarce growth focus:** choose one lane or producer to support, with a meaningful commitment period. Test only if rapid cycling is not optimal. This could overlap the network experiment rather than becoming another independent system.
- **A compact encounter mode:** test whether a shorter complete tactical arc helps people explore builds. This is a mode experiment, not simply speeding the simulation up; it overlaps known pacing work and is secondary to this fresh-ideas review.

## What I would test first

Do not implement the list as a package. Start with one new source of purpose and one way to observe its payoff.

1. **A paper or facilitated test of optional commitments**, with one achievable example, an explicit reward, and the ability to decline. Include ahead and behind states so it cannot win merely by rewarding the leader.
2. **A mock report with factual turning points**, using the same battles. This checks whether the missing feeling is partly an inability to recognize what the player accomplished.
3. If those produce useful choices, **compare a single network interaction separately**. This tests a different question: whether assembling the colony itself should become a larger part of the game.

Use a small exploratory group—roughly five to eight players, mixing newcomers and existing players—and vary which version they encounter first. This is qualitative discovery, not statistical proof. Keep the map, kit, and opponent comparable, then test more varied conditions only after the basic idea works.

Ask at natural pauses:

- What are you trying to make happen next?
- What are you waiting for, and why?
- Which choice felt consequential?
- What did you see that confirmed or contradicted your plan?
- What would you try differently?
- Would you choose another attempt, and what interests you about it?

Observe whether players voluntarily form different plans, change behavior for the new opportunity, understand the result, and can describe another experiment. More clicks, longer sessions, higher win rates, or more claimed rewards are not sufficient evidence of fun. Record boredom and overload as well as excitement. These can be manual playtest notes; no telemetry backend is needed.

Keep the existing battle-length and anti-snowball guardrails as constraints when a gameplay prototype is eventually built. The known Heartcap, difficulty, and dominant-build problems can obscure a promising idea's effect. They remain separate work; their existence is not a reason to disguise balance changes inside an engagement experiment.

The most promising direction is a player who can say: **“I chose a particular plan, watched it unfold, and now I want to try another.”** The colony should give that sentence a distinctly fungal character.

## Local evidence map

- [SPEC.md](../../SPEC.md): pillars, current rules, milestones, content, and explicit v1 exclusions.
- [Current relics](../../data/relics.json): existing adjacency, merge economy, death effects, and numerical modifiers.
- [Current upgrades](../../data/upgrades.json): how upgrade choices change buildings and units.
- [Route generation](../../src/run/route.ts): current all-to-all connections between successive rows.
- [Battle report](../../src/ui/report.ts): front graph, damage MVP, totals, counter history, and standalone rematches.
- [Engagement instrumentation](../../tools/lib/engagement.ts): definitions and limits of the fresh measurements.
- [Prior engagement review](../engagement-review.md), [playtest feedback](../playtest-feedback.md), [balance backlog](../balance-backlog.md), and [completed UI/UX work](../ui-ux-plan.md): historical findings and the boundary between new ideas and existing work.
