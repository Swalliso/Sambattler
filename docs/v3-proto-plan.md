# v3 prototype plan: one battle in rounds, by v3's rules

**Status: agreed on 2026-11-04.** Drafted by step B of the v3 plan ([design-brief.md](design-brief.md)). The user reviewed [spec-v3-concept.md](spec-v3-concept.md) and said "Start S1" to the hub's summary, which took open question 1's recommendation and the first guesses in questions 2–4 (below). S1 builds from it.

Written against `develop` at `acbeefd`. The rules are the concept's section 3, from the audit's decisions ([spec-v3-audit.md](spec-v3-audit.md), V3-Q1–V3-Q13). The tasks are [tasks/v3-prototype.md](tasks/v3-prototype.md), T001–T045, in sessions S1–S10.

## Goal

One battle in rounds by v3's rules, played on the dev site from a preview link, while v2's game stays the default. It tests v3's core bet before SPEC v3 is written:
- the rival's plantings stay hidden, and buildings fruit a round later;
- gold buys plots;
- four combos.

With those, does a round hold a decision (predict, rush or greed, and place) rather than v2's one reaction? Headless checks set the economy's numbers first. Then the user's playtest judges pillars 1–4.

## Scope

**In the prototype:**
- **The switch:** `rules=v3` on the battle scene (`/?scene=battle&rules=v3`), `--rules v3` in the tools, and a button on the dev site's title. It's a temporary switch, and S10 removes it.
- **The rules,** the concept's section 3:
  - hidden plantings (V3-Q2);
  - fruiting (V3-Q3), with its timing as data;
  - plots bought with gold, and no gold upgrade (V3-Q5);
  - Shield Wall, Spotted Screen, Chain Burst and Truffle Hunters (V3-Q7);
  - merging at ×2.0 (V3-Q10);
  - the general's tells, openers and sprout-reading (V3-Q11).
- **The content,** the concept's section 4:
  - the six core archetypes and the Truffle Cellar;
  - Old Mother Mold, the Lichen Baron and the Blightwright;
  - Vesper;
  - Bogwater Hollow and Twin Roots;
  - battle index 1.
- **The tools:** three scripted opener bots (rush, greed and counter), and `npm run experiment -- --rules v3 --checks v3` (Verification, step 4).
- **Goldens** for v3, beside v2's unchanged ones.
- **The user's playtest** on the dev site.

**Not in the prototype:**
- the run and everything in it: the route, lives, drafts, relics, spoils and sprawl. A v3 battle writes no save or record, so a reload starts it again;
- techs and the shop;
- other commanders, buildings, combos and maps;
- the guardrail changes in V3-Q13;
- any change to v2's game, data or goldens. S14's held tuning stays held.

## Stand-ins

| Stand-in | Stands in for | Goes |
|---|---|---|
| The switch: `?rules=v3`, `--rules v3` and the title's button | v3 as the default | S10, after the verdict |
| The `v3` block in `data/balance.json` | SPEC v3's data | SPEC v3 |
| One battle at battle index 1, with Vesper, on two maps | the run, the commanders and the maps | SPEC v3's milestones |
| The roster of seven cards, with no copies; the general's kit is the roster | R3's kit and copies | SPEC v3 |
| Personalities as opener odds and weights, in a `v3` entry per general in `data/generals.json` | v3's design of the general | SPEC v3 |
| The general's gold at the start of its turn, shown as a tell | an intel panel designed for v3 | SPEC v3 |
| `--checks v3` in `npm run experiment` | V3-Q12's and V3-Q13's guardrails in `tests/slow/` | SPEC v3 |

## Steps

The sessions, with their tasks in [the task list](tasks/v3-prototype.md). Hub review: the hub reviews the PR and turns on its auto-merge, since it touches `src/sim/`, `src/data/` or `tools/lib/`, or the balance. Every other PR turns on its own auto-merge.

| Session | What it lands | Hub review |
|---|---|---|
| **S1** | The switch in the sim and tools; the `v3` block (×2.0, no upgrade, the roster); fruiting and the empty clash; the hidden view for bots; v3's first goldens | Yes |
| **S2** | The preview link plays on the dev site: sprouts with timers, the general's hidden plantings with S19's four gaps closed, and its gold as a tell | No |
| **S3** | Plots bought with gold, for every side, on the planning screen | Yes |
| **S4** | The four combos in the sim, and the general's combo term. It may run beside S3 | Yes |
| **S5** | The combos on the planning screen: hover, hyphae and inspect | No |
| **S6** | The three generals' personalities, openers and sprout-reading, and the three opener bots | Yes |
| **S7** | `--checks v3`, and its first table on the first guesses | Yes |
| **S8** | The numbers tuned until the checks pass, as data, and the playtest guide | Yes (balance) |
| **S9** | The user's playtest and the verdict | The user |
| **S10** | Retiring the switch as the verdict says | Yes |

## Verification

1. **Every PR:** `npm run verify` passes, and v2's goldens are unchanged (Goldens, below).
2. **v3's goldens:** recorded by S1 and re-recorded by each session that changes v3's rules or data, and stable: two runs give the same hash.
3. **The browser:** `npm run test:browser` passes with the v3 cases:
   - from round 2 the general's plantings are hidden and can't be inspected until Begin;
   - sprouts show their timer;
   - a plot buys;
   - a combo shows on hover before you place.
4. **`npm run experiment -- --rules v3 --checks v3` passes** (S7 builds it, S8 tunes to it). It runs 100 battles a cell, in both seats, on both maps, unless a check says otherwise. Each line prints PASS or FAIL with its number.
   - **The openers (V3-Q9):** the rush, greed and counter bots, each pair 200 battles. Each wins 30–70% against each of the others. Greed's median fielded supply in round 6 is larger than each opponent's, among the battles that reach round 6, and the check prints how many do.
   - **Length (V3-Q12):** each of the three bots, in the player's seat, against each general. At least 90% of battles last 4 clashes or more. The battle's loser wins at least one clash from round 3 in at least 40%. These count clashes, not rounds, since under open question 1's recommendation round 1 has no clash.
   - **A choice in round 1 (V3-Q12):** the openers' check above.
   - **Battle 1 bites (V3-Q12):** against each general, the best of the three bots loses at most 20%. This is a stand-in for "battle 1 costs a life in at most 20% of runs", since the prototype has no runs: a player who reads the general and opens to match should usually win.
   - **A counter in time (V3-Q12),** scripted and headless. Four threat and answer pairs from the matrix:
     - Sporeling Burrow, answered by Burster Pod;
     - Capguard Hall, answered by Gill Archer Nest;
     - Amanita Lodge, answered by Hammercap Forge;
     - Gill Archer Nest, answered by Sporeling Burrow.

     Both sides start from the same fruited colony. The threat is planted in round r, and its answer in round r (predicted) or round r + 1 (reaction). Predicted, the answering side wins clash r + 1 in at least 65%. In reaction, the answer is still a sprout in clash r + 1, and its side loses that clash in at least 65%.
   - **The best spot beats the median spot (V3-Q13's G16, for the combos):** for Shield Wall, Spotted Screen and Chain Burst, a colony with the pair linked beats the same colony with the two buildings on median plots apart, in at least 60% of clashes. For Truffle Hunters, the greed bot with a Burrow beside its Cellar beats the same bot with them apart in at least 55% of battles (a first guess).
5. **The bench:** `npm run bench -- --quick --rules v3` stays within §13.7's budget.
6. **The dev site:** `?scene=battle&rules=v3` plays whole battles against each general, on both maps.
7. **The user's playtest** (below) gives the verdict.

## Goldens

- **v2's seven replays** (`tests/golden/r2-*.replay.json`) don't move:
  - every v3 rule runs only when the battle's config says `rules: 'v3'`;
  - the `v3` block is read only then;
  - every new state field is optional and left undefined under v2. `hashState` skips undefined fields (`src/sim/hash.ts`), so v2's state hashes as before.

  A moved `r2-*` hash means a v3 rule leaked into v2. That's a bug to fix, not a golden to refresh. Each PR checks it with `git diff --stat origin/develop -- 'tests/golden/r2-*'`, which should be empty.
- **v3 gets its own replays** (`tests/golden/v3-*.replay.json`):
  - S1 records two: Bogwater Hollow against Mold, and Twin Roots against the Baron, with `bot:balanced` in the player's seat.
  - S3, S4, S6 and S8 re-record them, since each changes v3's rules or data, and each PR says which moved and why.
  - S6 adds a third, against the Blightwright, once the three generals exist.
- **If a shared change can't keep a v2 golden still** (a field the v2 path can't leave undefined, say), the PR names the golden and the reason, and waits for the hub's review, as CLAUDE.md asks.

## The playtest (S9)

**Setup:**
- The links go in S8's playtest guide.
- Play at least one battle against each general, on both maps.
- Then play one v2 battle on the same site, to compare.
- Each battle's report keeps its planning seconds by round.

**Pillar 1: read and out-guess the rival**
1. Before Begin, could you say what the general was building toward? Which tells told you: its sprouts, its gold, its Intent panel or its personality?
2. Did a counter you planted a round ahead win its clash? Did one planted after you saw the sprout feel late but not fatal?
3. Did the general out-guess you by answering your sprouts, and could you see it coming?
4. Did the hidden plantings feel like reading, or like guessing?

**Pillar 2: the colony is the build**
1. Did you put a building somewhere, or move it, because of a combo? Did the hover show the combo before you placed it?
2. Did a combo visibly change a clash: archers firing through melee, a chain of bursts, Knights drawing fire, gold from the Sporelings?
3. Did the general's combos tell you anything?

**Pillar 3: rush or greed**
1. In round 1, did rushing, greed and answering the opener each feel viable? Which did you choose, and why?
2. Did a Cellar and bought plots pay off later in the battle? Did a rush punish the greedy Baron?
3. Did you spend most of your gold most rounds, or bank 200–300 with nothing to buy, as in R2b's playtest?
4. Did you buy plots, and did what you planted on them matter?

**Pillar 4: watch the war you built**
1. Were the battles close? Did the side that was losing win a round? Did any battle end in a sudden collapse?
2. Did any clash replay the one before it? That's open question 1's timing.

**Overall**
1. How many real decisions did a round hold, against v2's one?
2. When were you bored, and when did you feel clever?
3. Would you start another battle without being asked?

**The verdict:**
- **Pass:** SPEC v3 gets written, and S10 retires the switch in its first milestone.
- **The next lever:**
  - a shop prototype if every round still feels the same (V3-Q6);
  - a moving front if battles still don't swing (V3-Q8);
  - a continuous prototype if pillar 1 or 4 still fails in rounds (V3-Q1).

## Open questions for the user

1. **Fruiting's timing (blocks S1's default).** **Decided 2026-11-04: the recommendation** ("Start S1"). `v3.fruitFromRound` is 1, so every building fruits a round after it's planted and round 1's clash is empty. S1 built it. Under V3-Q3 as decided, round 1's opener fields at once and fruiting starts with round 2's plantings. So clash 2 has clash 1's armies, and R2a's sim replays an unchanged round exactly: the opener's result counts twice, and you watch the same clash again.
   - **Recommendation:** every building fruits a round after it's planted, the opener too, and round 1 has no clash. Both openers sprout in view, and the first fight is round 2's (the concept, section 3.2). It keeps V3-Q2's and V3-Q3's reasons with one rule and no exception.
   - **Alternatives:** as decided, with the rerun.
   - **Either way:** S1 builds the timing as data (`v3.fruitFromRound`: 1 or 2), so the playtest can try the other with `?proto=v3.fruitFromRound:2`.

The rest are first guesses the concept made. **They stand** (the user, 2026-11-04, "Start S1"), unless the user changes one later:

2. **The general's gold as a tell:** its gold at the start of its turn, not what's left once it has planned. What's left would give away the price of what it planted, though sums blur it (a Burrow and a Cellar cost 260, the same as an Amanita Lodge). Used in S2.
3. **The counter-builder is the Blightwright,** with the roster's cards in place of its Rootbreaker opener. The alternative is the Pale Sovereign, whose doctrine-led weights fit, but it brings the boss's rules. Used in S6.
4. **The Heartcaps at battle index 1:** yours 3000 and the general's 2000, with the cap at 750, so three capped wins end a battle. The length check (4 clashes or more) may need V3-Q9's levers, the cap or the general's Heartcap, under `v3`. S8 sets them and logs them as data.
