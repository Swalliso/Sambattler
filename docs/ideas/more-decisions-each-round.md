# More decisions each round

**Status:** not adopted. A design review for the user to discuss before R3's plan (R3's S0), written on 2026-11-04 beside R2b's S14. Nothing here is built, and no code, data, rule or test changed.

**Touches:** SPEC §1.3 #5, #7 and #12; §4.4 (planting and selling); §6.1 (gold upgrades); §6.2 (income); §6.4 (the Sporestorm); §7.2 and §7.8 (the general's turn and kit); §8.3, §8.6 and §8.10 (drafts, rewards, the kit); §11.7 (relics); §11.13 and §11.14 (augments, combos); §14.5 (commands); §16 R3; §18.2 #17 (a clean-win bonus); Appendix A (SPEC's record of the research proposals).

**Measured or a guess:** "Measured" marks a number from the sim on `develop` at `5065430`, or from a doc this file cites. "Guess" marks my judgment, untested. Every number is provisional: S14 is tuning merging, the Sporeling Burrow and Cordis on `feature/r2b-tune` while this is written, so this review recommends no retune of those.

## In short

- **The problem** (measured): a round's gold buys about one building until the colony fills at round 5, and after that most rounds buy nothing while 200–300 gold sits banked. Merging is always on, and placement adds little. So a round holds one real decision, "plant the answer to the general's new building", and from round 6 none.
- **The cause:** gold has one thing to buy, and it needs a plot. The economy's late gold lands when there's nothing left to buy, so a Truffle Cellar rarely pays.
- **The shortlist, in order:**
  1. buy augments with gold during a battle, as Mechabellum's unit tech works, in place of the gold upgrade;
  2. measure the economy again once gold has that use, then fix the Cellar's payback;
  3. fewer, bigger relics (Keystones) in place of the relics in in-battle drafts;
  4. a shared offer each round, prototyped after the first;
  5. a clean-win bonus, which the user has already said yes to.
- **Does R3 as planned fix it?** No. R3 makes the decisions a round already has weigh more (the draft pick, and where the one building goes), and it makes runs differ more. But it changes none of gold, prices, plots or what gold buys, and SPEC's own expected income is "about one new spawner a round after the opener" (§6.2). Section 3 has the detail. What would fix it is a second thing to buy that takes no plot: the shortlist's first item.
- **What SPEC v2 already did with these ideas:** it folded mutation cards in as augments and themed packs as run packs, both in R3. It deferred Keystones and Seasons, and it built interest, comeback gold and the gold upgrade. The per-round shared offer, sends, tech bought with gold, the income ramp, commissions, Omens and cheap moves are new to SPEC. Each candidate below is marked.
- **For R3:** the first changes how R3 deals augments and retires S5b's gold upgrade. The third changes R3's relic pass. The rest are small, or come after R3.

## 1. The problem, measured

### What the user found

R2b's playtest (2026-11-04, the notes in the hub's shared folder, and the hub's T148 record): "Rounds were still very much plan then fight, but the options for planning felt very limited". And: "Due to gold limitations, I couldn't really do much more than build one building a round, and that was usually just dedicated to countering what the opponent does, which isn't really engaging." The user's other findings:
- economy buildings rarely pay off against more units;
- merging is the only right move;
- placement matters less than they hoped;
- the drafts and relics of rounds 3, 5 and 7 rarely change the build;
- there's little variety from run to run;
- battles are one-sided.

The planning clock agrees. The `bosslives` run's summary gives a median of 11 s of planning a round, and runs took about 10 minutes. The run length of 25–35 minutes assumes about 30 s a round (§1.2).

### A round's decision budget today

**Gold against prices** (§6.1, §6.2, §11.2):
- **Round 1:** starting gold, 300 + 75 a battle. That buys two buildings in battle 1, three in battle 3 and four at the boss.
- **From round 2, each round pays:**
  - the stipend of 100;
  - interest of 1 per 10 gold banked, up to 30;
  - +40 if you lost the last round;
  - 50 for each Truffle Cellar, or 75 on loam.

  Without an economy building, that's 100–146 a round.
- **Prices:** the core spawners cost 110–260 (Burrow 110, Burster Pod 130, Capguard Hall and Gill Archer Nest 150, Hammercap Forge 170, Amanita Lodge 260). The pack buildings cost 130–200.
- So a round's income buys one building, rarely two.

**Plots** (§4.6): 8 in battle 1, 2 ranks of 4 files. A won battle adds one, up to 12. Until R3 there's no copy limit, so plots are the only limit.

**Once the colony is full** (§6.1, §4.4, §8.3), gold buys:
- an **upgrade** at 300% of the building's cost, 330–780, once per building a battle;
- a **swap:** a sale refunds 60%, so moving a building loses 40% of its price;
- **draft rerolls,** at 20 and then 30, in rounds 3, 5 and 7.

**The general** (§7.2, §7.4):
- **It plans first.** It takes its income (× 1.10), applies a counter if one is due, then buys from its kit by its doctrine's weights until its gold or its plots run out. It keeps no reserve.
- **It sells only when a counter activates.** Counters come in rounds 4 and 7 (the Help's "The general" tab), and a counter's buildings carry a "New" sprout.
- **Once full,** it buys upgrades with what's left.
- **It never drafts.** Its kit grows with the battle index.
- **What you see:** its whole army, before you plan. The planning move is the answer to its newest buildings.

**What the bot did with that budget** (measured). The command:

```bash
npm run sim -- --seeds 1..40 --player bot:balanced --enemy general:<mother-mold|lichen-baron|blightwright> --battle-index <1|3> --flags merging,drafts,adaptive,powers --auto-draft greedy --power-policy auto --commander vesper --out <file>
```

That's 240 battles, read from each battle's `byRound` and `stats.player.rounds`. The table is battle 1, with the three generals' medians given as a range:

| Round | Gold to spend | Buildings planted | Rounds planting nothing | Banked at Begin | Free plots at Begin |
|---|---|---|---|---|---|
| 1 | 300 | 2 | 0% | 40 | 6 |
| 2 | 259 | 1 | 0% | 109 | 5 |
| 3 (draft) | 329–334 | 2 | 0% | 61–64 | 3 |
| 4 | 264–289 | 1–2 | 0% | 60–78 | 2 |
| 5 (draft) | 281–321 | 1 | 0% | 91–111 | 0–1 |
| 6 | 339–362 | 0–0.5 | 50–68% | 236–294 | 0 |
| 7 (draft) | 438–649 | 0 | 95–100% | 199–298 | 0 |

- **Which battles the rows count:** rows 6 and 7 count only the battles still going, 12–28 and 5–22 of each 40. Battles last a median of 5, 7 and 5 rounds against Old Mother Mold, the Lichen Baron and the Blightwright.
- **The bot's economy:** it opens with a Truffle Cellar on loam in every battle, so its income in rounds 2–5 (212–230) is well above the 100–146 of a player without one.
- **Battle 3** (450 starting gold) reads the same, a round sooner: three buildings in round 1, the colony full at round 5, and nothing planted in 96–100% of rounds from round 6, with 105–275 banked at Begin.
- **Upgrades** come 0.15–1.8 a battle, for both sides together. S11's runs read 0.51 a battle for you and 0.27 for the general ([balance-backlog.md](../balance-backlog.md), "R2b S11"). The user bought none, and found them too dear.
- **Other moves:** 32 merge toggles in 240 battles, and the bot sold none of its own buildings.
- **The sim's limit:** bots never sell or toggle, so they understate what a human might do. A human's command log in the battle save (§8.9) and the planning seconds per round in the run summary are the human measures.

**The economy's payback** (worked from §6.2's rules):
- A Cellar costs 150 and pays 50 a round from the next round. It breaks even after 3 rounds of income, or 2 on loam.
- **Planted in round 1:** after 4 rounds of income it's +50, the user's figure, and after 6 it's +150.
- **Its costs:** a plot that fields nothing (§4.6), and a building's worth of army in the round you buy it.
- **When it pays:** most of its gold lands from round 5, when the bot already banks 200–300 with nothing to buy. So the Cellar's problem is partly its price, and mostly that late gold has no use.

**Placement** (measured, G16 in [balance-backlog.md](../balance-backlog.md), "R2b S13" and "R2a S21b"). A colony planted by the formation rule beats the same colony with its ranks swapped in 39% of clashes, against G16's bar of 60% (S13's reading; it was 24% before the Burster moved to the front). R3's combos are meant to take G16's pairs.

### What that adds up to (a guess, from the measures)

1. **Gold has one thing to buy, and it needs a plot.** Each round's gold turns into one building. Nothing else costs gold until the colony fills, apart from rerolls.
2. **A cliff at round 5.** About 8 plots means about 8 planting decisions a battle, one a round. Then the upgrade's 300% price leaves most later rounds with nothing to do.
3. **The economy pays late, in gold that has no use.** That's why "more units" beats a Cellar.
4. **The choice inside a round is narrow.** The general's newest buildings are shown, and the 3×3 matrix makes the answer mostly obvious. Merging is always right, and the formation adds little (G16). The draft's cards are mostly level numbers (#27 removed only the levels that did nothing in rounds).

So more decisions need:
- a second kind of purchase that takes no plot;
- a reason to spend in late rounds;
- an economy that pays into those;
- bigger picks in the drafts.

R3 already plans the last: augments, copies and packs.

## 2. Candidates

Eight, from the hub's starting list and the research. Each gives how it works in a round of plan-then-fight, the complaints it answers, what it replaces, its cost, its risks and how to measure it. Each ends with what SPEC v2 already did with it: R3 already brings it, SPEC deferred it, it's built, or it's new to SPEC. "Decisions per round" below means purchases and changes in planning: plants, sales, techs, upgrades, toggles and moves, with the draft pick counted apart.

### 1. Tech: augments bought with gold during a battle

**Source:** Mechabellum's unit tech. A unit holds up to four techs, each further one dearer, and "a unit's answer can be a tech on the same unit, not only a different unit" ([research-autobattler-roguelites.md](../research/research-autobattler-roguelites.md), Mechabellum).

**How it works:**
- **What you buy:** each spawner's card lists its augments (§11.13 has two for each core archetype). In planning, `tech` buys one for a building type you have planted, for the rest of this battle. Every copy's squad fields with it from this round's clash.
- **The price** (guess): the building's cost (110–260), and 50% more for a second tech on the same type. At most two a type, §11.13's first guess; R3's draft task list proposes one (§18.2 #38).
- **What shows:** the tech is on the squad and its card before the clash, on both sides.
- **The general** buys techs by the same rule at the end of its turn, once its target building is out of reach or no plot is free. It favours the tech that beats what you fielded last round: §18.2 #41's first guess already has its counters rate your squads as augmented. It plans first, so its techs are in view before you plan, and "see it, answer it" (pillar 1) gets a second layer: answer a building with a building, or with a tech on what you already have.
- **What drafts do** (two options):
  - **A (first guess):** a drafted augment unlocks that tech for the run, as Mechabellum's unlocks do, and battle gold buys it in each battle. Drafts keep R3's four card types, and an augment still changes the build. Each starter card might come with one tech unlocked, so battle 1 has the choice.
  - **B:** every core card has its two techs from the run's start. Drafts offer the pack buildings' techs, or a third.

**Answers:**
- one building a round: a second thing to buy from round 2, which takes no plot;
- countering isn't engaging: two ways to answer, and a counter to a counter (tech against tech);
- the upgrade being too dear: tech replaces it;
- economy rarely paying: late gold has a use;
- drafts rarely changing the build: the augment is still a draft pick, under A;
- one-sided battles, perhaps: a tech that flips a matchup is a cheap answer for the side behind (a guess; G5 below warns the other way).

**Replaces:** S5b's gold upgrade: the Bloomed squad at 300%, its full-colony rule, `upgradeCostPct`, the `upgrade` command and the general's upgrade buying. It also replaces §7.8's "the general's kit gains augments by battle index", since the general buys techs instead. R3's augment patches (its S5 and S6) are built as planned.

**Cost:**
- **A rule change:** a `tech` command, or S5b's `upgrade` command reshaped; prices in the data; the general's buying rule. `fielded` already records augments (§4.7 step 12).
- **UI:** a tech button on the tray card and the inspect panel, where S5b's upgrade button and preview are today.
- **Data:** R3's augment list.
- Goldens refresh.

**Risks:**
- **A tax:** a tech that's always right gets bought every battle (Tough Caps on every Burrow). The general's answer to it has to be real (G8, G12).
- **The snowball:** the richer side techs first. G5 read 89% once S5b's upgrades came in, against 55–75%, and the same could come back (measured for upgrades; a guess for tech).
- **Reading load:** augment icons on both sides, which are R4b's work (§10.4).
- **The counter matrix grows:** 12 techs on 6 archetypes, before the packs' techs. R3's step 3 already plans the clash check with augments.
- **Pillar 3:** each battle's techs start over, so does the run still build into something of your own? R3's gate asks "Did your build feel like your own by the end of the run?" Under option A, the unlocks are what carries.

**Measure:**
- **In the sim:** decisions per round in rounds 2–9, and gold banked at Begin once full, from the summary's X8 lines. A first guess at bars: banked under about 100 once full, and at least one purchase a round through round 7.
- **The guardrails:** techs bought per battle by each side; the clash check with techs, against G12's strict bar and G2's edges; G5; G8, which reads whether the general answers techs.
- **In a playtest:** planning commands per round from the save's command log, and the median planning seconds a round, 11 s today.

**In SPEC v2: R3 already brings augments, but not this.**
- **What SPEC did:** it folded the rework review's mutation cards ([after-the-rework.md](../archive/v1/ideas/after-the-rework.md), Tier 4 #4) in as augments (§1.3 #7, Appendix A). R3 deals them as draft cards in rounds 3, 5 and 7 and in spoils (§8.3).
- **Does R3 as written answer the playtest?** Partly. It answers "drafts rarely change the build". But an augment costs no battle gold and adds no decision to the other rounds, so it doesn't answer "one building a round".
- **New to SPEC:** buying them with gold.
- **What it changes in R3:** US3's augments are bought with battle gold as well as drafted (its S7 and S10), the gold upgrade retires beside the upgrade tracks (S12b), and the tray and draft UI change (S9, S11). R3's task list (a draft of 2026-11-01) predates S5b's gold upgrade, so it says nothing about it yet.

### 2. Levels: a cheaper, earlier gold upgrade

**Source:** Mechabellum's unit levels, which cost 50% of a new copy.

**How it works:** keep S5b's upgrade, a squad that arrives Bloomed for the rest of the battle, and drop its full-colony rule. From round 2 you choose between a new building on a free plot and an upgrade on one you have. At 300% it becomes a saving decision ("bank two rounds for a Bloomed Burrow"). Smaller, cheaper steps, such as Blooming one trio, are the other form.

**Answers:** one building a round; the upgrade being too dear, since you can save for it sooner; the economy, since saving gives gold a target.

**Replaces:** nothing new; it reshapes the upgrade. It's an alternative to #1, not an addition. One plot-free purchase is enough to test first (a guess).

**Cost:** data and a small rule, the gate. The cheapest of the eight.

**Risks:**
- **G4 and G5** (measured, S5b's T163): no price of 150–300% kept G4 and G8 in band. G5 read 89–90% at 200–300%, since the richer side fills its colony first and upgrades first. Dropping the gate starts that snowball sooner (a guess).
- **The same decision, bigger:** it adds raw power, not a different kind of answer. "Upgrade your counter" is still one decision (a guess).

**Measure:** G5, G4's round-9 clause, upgrades per battle, banked at Begin.

**In SPEC v2: built, in R2b.** The gold upgrade is #67, built in S5b at 300% and only once the colony is full (§6.1). R3 retires v1's upgrade tracks (§11.6), and R1's call that a level adds no unit stands (#27). R3's task list predates S5b, so it neither keeps nor retires the gold upgrade. Reshaping it is a rule and data change. If #1 is taken, this goes.

### 3. A shared offer each round: one-clash tactics

**Sources:**
- Mechabellum's reinforcement cards: both players see the same offer each round, and some cards are one-shot abilities;
- TFT's rule that variance should differ "game to game ... NOT player to player";
- Legion TD 2's sends, folded in (see the dropped list below).

**How it works:**
- **The offer:** from round 2, each planning phase deals one offer of 3 tactic cards from the `draft` stream, the same offer to both sides.
- **A tactic** is bought with gold and lasts this clash only. Examples (guesses): your front rank arrives with twice the arrival shield; a spore bomb lands on the enemy's back rank as the clash opens; your Bursters roll first. A one-clash squad of 4 Sporelings in an empty slot would be Legion's send.
- **Picks:** the general, planning first, buys at most one, and its pick shows in its plan (§7.5). You buy one or none.
- **Prices:** 40–120 (a guess).

**Answers:**
- one building a round: a fresh purchase every round, after the colony fills too;
- countering isn't engaging: an answer for this round only, cheap and chosen again each round;
- variety: offers differ from round to round and from run to run;
- one-sided battles, perhaps: a cheap way for the side behind to take a round (a guess).

**Replaces:** little. It's honestly a new system. It could take the place of the drafts' skip gold and rerolls, but that's small. So it comes after #1, and only if #1 leaves the late rounds empty.

**Cost:**
- **A rule change:** a card type that lives one battle, one-clash effects, and a one-clash squad standing in an empty slot.
- **Data:** a list of 12–20 tactics to write.
- **UI:** an offer strip in planning, beside the draft's bottom sheet.
- **AI:** the general's pick, a pure function of the state (determinism, §13.3).
- It's the largest on the shortlist.

**Risks:**
- **Reading load,** the round 3 testers' main message (F8).
- **A tax:** a dominant tactic gets bought every round.
- **Pillar 2:** one-clash squads undercut "your colony is your army", so tactics should come first and squads maybe never (a guess).

**Measure:** decisions per round; banked at Begin; how often each tactic is bought (one bought in more than half of rounds is a tax); G3, G12, and G13 for tactics that stall clashes.

**In SPEC v2: new.** Neither SPEC nor its record of the research (Appendix A) has a per-round offer, a one-clash card or a send. R3 doesn't cover it, so S0 decides whether it goes in R3 or after.

### 4. An economy that pays

**Sources:** interest and streaks (TFT), and the income ramp (Mechabellum's supply, which grows each round; [research-lane-battlers.md](../research/research-lane-battlers.md) #3, "escalate the economy, not the Heartcap's fragility").

**How it works,** in two steps:
1. **Measure the Cellar again** once a purchase without a plot exists (#1 or #2). Today its late gold lands on 200–300 already banked with nothing to buy, so today's numbers can't judge it.
2. **If it still doesn't pay, pick one fix:**
   - **(a) An income ramp:** the stipend rises each round, such as 100 + 20 × (round − 1), so 260 at round 9 (a guess). Late rounds get richer for both sides, and banking has a target.
   - **(b) A faster Cellar:** it pays its first 50 in the round it's planted, so it breaks even after 2 rounds of income, not 3.
   - **(c) A higher interest cap,** which is the Trade pack's banking build.

**Answers:** economy buildings rarely paying off; one building a round, since a ramp funds a second purchase late.

**Replaces:** the ramp could take part of the Sporestorm's job (§6.4). Battles would end through bigger armies the players chose, rather than through ×2.0 damage (a guess, for G4).

**Cost:** data (the stipend by round, or the Cellar's yield), or a small rule for the ramp's formula. Cheap.

**Risks:**
- **More idle gold:** more gold with nothing to buy is today's state (measured), so a ramp only comes after a sink.
- **The snowball:** bigger late armies may favour the side ahead (G5).
- **Performance** isn't a risk: plots bound the army, not gold (§13.7).

**Measure:** the Cellar opener's win rate against an opener without one, as a bot pair with `--proto`; banked at Begin; G4; G5.

**In SPEC v2: partly built, partly new.**
- **Built:** interest at 1 per 10 gold, up to 30 (R2-Q2), and comeback gold, which does the loss streak's job (§6.2).
- **SPEC's own target** is "about one new spawner a round after the opener" (§6.2), so the playtest's one building a round is the design working as written. Raising income alone would fill the colony sooner.
- **New to SPEC:** the income ramp. The Sporestorm escalates damage, not income (§6.4).
- **Data:** the Cellar's yield.
- **R3** doesn't touch income. A fix is a data change, measured in R3's guardrail session (its S14) or after, with the user's OK.

### 5. Keystones in place of the in-battle relics

**Sources:**
- TFT's augments, offered at fixed stages;
- 9 Kings' councils, which guarantee one king-specific decree;
- Battlegrounds' trinkets, whose offers are keyed to your type;
- research mechanic 2 ([research-autobattler-roguelites.md](../research/research-autobattler-roguelites.md)).

**How it works:**
- **Relics leave the in-battle drafts,** so those at rounds 3, 5 and 7 deal blueprints, copies and augments only.
- **Three Keystone picks a run:** after battle 1, after battle 3 and before the boss, each 1 of 3 with one paid reroll. An elite's relic pick becomes a Keystone pick too.
- **The offer** is built as Battlegrounds builds trinket offers: one card keyed to your most-planted card, one generic, and one for your commander.
- **A Keystone is a rule-bender,** not a percentage. The 21 relics get sorted:
  - the few that change what happens become Keystones (the research named Spore Cloud, Martyr's Bloom and Fresh Spores under v1, and S6's v2 effects may add more);
  - the rest retire, or move into packs or augments.

**Answers:** the relics of rounds 3, 5 and 7 rarely changing the build; variety from run to run; drafts and spoils looking alike (F9).

**Replaces:** the relic share of in-battle drafts (20% in R3's weights, §8.3) and the elite's relic-only pick (§8.6).

**Cost:** data, sorting the 21 relics, which R3's relic pass touches anyway; a small run-layer rule, the schedule; the spoils screen's card UI. Medium.

**Risks:**
- **Fewer picks:** fewer relic picks means fewer small decisions.
- **Tuning:** each Keystone has to be "hard to hit, and worth hitting", the research's TFT lesson.
- **The general** gets none, since its doctrine is its equivalent (C2).

**Measure:** `--checks cards,runs` as §16 R3 step 4 sets it: a rule-changing card owned at the end of at least 30% of runs, and the top building's damage share below about 60%.

**In SPEC v2: deferred.** Appendix A's "Not in v2 yet" lists Keystones and Seasons (the rework review's Tier 4 #5 and #10): "For now augments, combos and relics carry run variety" (§1.3 #7, #8).
- **What would change that:** the playtest found that the relics of rounds 3, 5 and 7 rarely change the build, and R3's relic pass revisits every relic anyway.
- **What it changes in R3:** its relic task ("each with its v2 effect, or retired", §16 R3) and S10's draft weights.

### 6. Commissions: a goal each battle

**Source:** Battlegrounds' quests: three quest-and-reward pairs, the harder quest for the better reward, with progress shown.

**How it works:** in round 1's planning, pick 1 of 3 goals for this battle, each with a reward. For example (guesses):
- "Field an Elder": +1 spoils pick;
- "Win a round with 4 or fewer buildings": an augment;
- "Bank 300 at Begin": +100 gold at once.

Progress shows in the top band.

**Answers:** too little to plan, since each round gets a second aim; one-sided battles, since a dominated player still has a goal within reach, and a dominant one a harder goal (a guess).

**Replaces:** nothing. Perhaps the spoils' rarity bonus.

**Cost:** a condition language (the feats' one is M6's, §9.2), a top-band chip and the rewards. Medium to high.

**Risks:** it can push degenerate play, such as farming merges; and it's more to read.

**Measure:** how often each goal is completed; planning seconds a round.

**In SPEC v2: new.** SPEC's goals are the feats (§9.2), which are meta-progression in M6, and the quests printed on locked cards in M6's unlock ladder (the rework review's Tier 4 #7). A goal within a battle isn't in SPEC. It's better built with M6's feats.

### 7. Stakes for a one-sided battle: the clean-win bonus and Omens

**Sources:**
- the user's answer to the playtest's question 4: "a clean win paying a bonus sounds like a good idea and a nice incentive";
- Omens, research mechanic 12, from Thronefall's mutators and the Bazaar's tougher monsters;
- elite prizes shown up front, research mechanic 11.

**How it works:**
- **(a) A clean-win bonus** (§18.2 #17): a battle won with your Heartcap above some line, such as two-thirds, pays a bonus: Spores, or +1 rarity on the spoils.
- **(b) Omens:** before a battle, you may add 0–2 Omens for better spoils (+1 rarity, then +1 pick). They reuse what already exists: the elite modifiers Fortified, Veteran and Swift, or blights.

**Answers:** battles that are one-sided ("I'm frequently either dominating or being dominated"). A dominating player has a margin to keep, so each round's plan matters again, and can choose to raise the stakes.

**Replaces:** (a) nothing; (b) part of the elite prize's job.

**Cost:** run-layer data and UI, and no sim rule. Cheap.

**Risks:** the side already winning gets more spoils. Omens are optional, so a player can ignore them, which is fine.

**Measure:** G15, spoils per run.

**In SPEC v2:**
- **(a) is open** (§18.2 #17): not adopted, and R2b's playtest asked again. The user said yes on 2026-11-04, so the hub records it. It's a run reward (§8.6).
- **(b), Omens, is new** to SPEC.
- **Elite prizes** aren't in SPEC's record (Appendix A). §8.6 keeps v1's elite rewards, and the rework review's Tier 4 #2 ("elites that pay") went unlisted.

### 8. Cheap moves: placement as a per-round decision

**How it works:** a `move` command in planning takes a planted building to a free plot, or swaps two, for a small fee. A first guess: 10% of its price, against today's 40% for selling and planting again (§4.4).

**Answers:** placement, by making it a choice every round. When the general's formation changes, you can move as well as plant.

**Replaces:** the 40% pivot for a move.

**Cost:** a command and a drag in the UI. Small.

**Risks:** placement adds little today (G16 at 39%), so moving would be a chore with nothing at stake (a guess). R3's combos give re-arranging its point.

**Measure:** G16 and moves per round, after R3's combos.

**In SPEC v2: SPEC set the opposite.** §4.4 makes a move a sale and a replant, so it costs 40%, and a cheaper move is new. Placement's own fix is R3's combos (§11.14), which also cover the rework review's lane pairs (Appendix A, Tier 4 #8). This comes after R3's combos (S8, S9), and isn't shortlisted.

### Dropped, or already covered

- **Mutations** (research mechanic 1). *R3 already brings them:* the rework review's mutation cards became augments (§11.13, Appendix A).
- **Curated pools** (Battlegrounds' 5 of 10 minion types, Super Auto Pets' packs). *R3 already brings them:* themed packs became run packs, 4 of 10 a run (§11.15, Appendix A).
- **Legion TD 2's sends as a verb of their own** (*new to SPEC*):
  - In Legion, a send attacks the other player's lane. Here both armies meet in one clash per lane, so a send has nothing of its own to attack. It's a one-clash reinforcement, folded into #3.
  - Its other half, spending that raises income, would tie the economy to spending. That's left out as too much to learn at once (a guess).
- **Streaks** (TFT). *Built in another form:* a win-streak bonus pays the side already ahead, and the loser's +40 already does the loss streak's job (§6.2).
- **Seasons** (research mechanic 5). *SPEC deferred them,* with Keystones (Appendix A). One run-wide rule for both sides, cheap with the modifier machinery. But it adds variety, not decisions in a round, and R3's packs make runs differ first. It fits later, beside M7's blights.
- **Elite prizes** (research mechanic 11). *Not in SPEC's record:* folded into #5, where an elite pays a Keystone, and into #7.
- **Battle XP** (lane mechanic 14), where kills buy ranks or gold. *New to SPEC:* it overlaps with #2, and it snowballs.
- **Interest.** *Built:* already a choice, at 1 per 10 gold up to 30 (R2-Q2). Its cap is #4's fix (c).

## 3. Does R3 as planned add decisions each round?

### What SPEC v2 already took in

SPEC records what it did with the research's proposals at its end: Appendix A's paragraph on the rework review's proposals ([after-the-rework.md](../archive/v1/ideas/after-the-rework.md), history rather than current design), and its table "Not in v2 yet (undecided)".

| Idea | In SPEC v2 | Where |
|---|---|---|
| Mutation cards, as augments | R3 brings it | §1.3 #7, §11.13 |
| Themed packs, as run packs | R3 brings it | §1.3 #8, §11.15 |
| Lane pairs, as combos | R3 brings it | §11.14 |
| Lives, and the general planning first | Built in R2 | §1.3 #2, #3 |
| Interest raised, comeback gold, the gold upgrade | Built in R2a and R2b | §6.1, §6.2 |
| Keystones, Seasons, the boss's Edict, a branching route | Deferred: "for now augments, combos and relics carry run variety" | Appendix A, §1.3 #7, #8 |
| Merging's rework | v1's rule stays until the playtests decide. This playtest says it needs more, and S14 is measuring it | §1.3 #9 |
| The per-round shared offer, sends, tech bought with gold, an income ramp, commissions, Omens, cheap moves | New to SPEC | – |

### What R3 does to a round

- **Copies** (§8.10) limit what you can plant, so the plant decision becomes a choice among cards, but they add none.
  - **The starting kit:** each commander's starter is two spawners and the Truffle Cellar, at 2 copies each. So battle 1 opens with 6 buildings for 8 plots, and only 4 of them field units, until drafts add cards.
  - **The cliff:** copies may bring it forward, or leave plots empty (a guess; measure free plots at Begin with copies on).
- **Augments** (§11.13) are dealt in the drafts of rounds 3, 5 and 7 and in spoils. They make those picks weigh more, and the general's army takes more reading. They cost no battle gold and add no decision to the other rounds.
- **Combos** (§11.14) make where the one building goes matter more (G16). Re-arranging still costs 40% (§4.4).
- **Run packs, the four card types and the relics' v2 effects** make runs differ before and during a run (§8.3, §8.4, §11.7).

### So

**What R3 as written does:** it makes the decisions a round already has weigh more, and makes runs differ more. It doesn't add decisions each round. "One building a round" is SPEC's own expected income ("about one new spawner a round after the opener", §6.2), and R3 changes none of gold, prices, plots or what gold buys. Of the user's findings, R3 as written answers:
- the drafts rarely changing the build (augments, copies and blueprints);
- placement (combos);
- variety between runs (packs).

It doesn't answer one building a round, the economy, or the empty late rounds.

**What would fix one building a round:** a second thing gold buys that takes no plot, from round 2. That's candidate #1, tech, or the smaller candidate #2, levels.
- **More gold alone wouldn't:** at today's prices it fills the colony sooner, and the late rounds already bank 200–300 with nothing to buy.
- **If tech isn't enough,** candidate #3, the shared offer, keeps the late rounds fresh.

## 4. The shortlist, in order

| Rank | Candidate (section 2's number) | In SPEC v2 | Why this place | What it changes in R3's plan |
|---|---|---|---|---|
| 1 | **Tech** (#1), in place of the gold upgrade | R3 brings augments as draft cards; buying them with gold is new | It gives every round from round 2 a second purchase and a second kind of answer to the general, and late gold a use. It reuses R3's augment content and sim work | Augments are bought with battle gold. A drafted augment unlocks its tech for the run (option A). The general buys techs at its turn, instead of gaining augments by battle index (§7.8). S5b's gold upgrade retires with the upgrade tracks (S12b). The clash check with techs is R3's step 3, and the tray and draft UI change (S9, S11) |
| 2 | **The economy, measured against tech** (#4) | Interest and comeback gold are built; the ramp is new | The Cellar's payback of 3 rounds can't be judged while late gold has nothing to buy. Fixing it first would tune against a state that tech removes | One task in R3's guardrail session (S14): the Cellar opener against no Cellar, with techs in. If it still loses, the ramp or a faster Cellar, as a data change with the user's OK |
| 3 | **Keystones** (#5) | Deferred (Appendix A) | The user's "relics … fairly inconsequential". R3 already revisits every relic, so the extra cost is the schedule | Relics leave the in-battle drafts (R3's S10 weights). Keystone picks come after battles 1 and 3, before the boss and at elites. The 21 relics are sorted in R3's S1 content work |
| 4 | **A shared offer each round** (#3), as a prototype after tech | New | The only candidate that brings a fresh decision every round. But it's a new system with new content, and tech may be enough | None in R3 unless S0 adds it. A short-lived prototype branch once tech lands, measured on banked gold, decisions per round and planning seconds |
| 5 | **The clean-win bonus** (#7a), Omens later | Open (§18.2 #17); Omens are new | The user said yes. It gives a dominating player stakes in each round, and it's cheap | A run reward in §8.6, placed by R3's S0 or S14 once the hub records the answer. Omens wait for M7's blights |

**If only one thing happens:** tech. Of the other four, the economy and the shared offer depend on it, Keystones fit inside work R3 already plans, and the clean-win bonus is small.

**Who owns which finding:**
- the drafts rarely changing the build, placement and variety are R3's (section 3);
- one building a round, the economy and the one-sided battles are not, and tech, the economy's re-measure and the clean-win bonus are aimed at those;
- merging and balance are S14's.

## Questions for the user

1. **R3's job.** R3 as planned adds weight to a round's picks and variety between runs, but not more decisions each round (section 3). Should R3 also take on "one building a round", through tech (question 2)? Or should R3 stay as planned, with that fixed after it? *Recommended: take it on in R3,* since tech reuses R3's augments, and R3's S0 is the cheapest moment to change how they're dealt.
2. **Tech.** Should augments be something you buy with gold during a battle, the way Mechabellum's tech works? Each round you'd choose between planting a new building and teching one you already have. Or should they stay draft cards that last the whole run, as R3 plans? *Recommended: buy them in battle.*
3. **If you buy them:** should drafting an augment be what unlocks it for the run, so drafts still shape your build? And should each starting card come with one tech unlocked, so battle 1 has the choice too? *Recommended: yes to both, as first guesses.*
4. **The gold upgrade.** Should tech replace it, or should it stay, with the "full colony" rule dropped? *Recommended: replace it.* Cheaper upgrades made the richer side win too often (G5 at 89–90%).
5. **The economy.** Should we measure Truffle Cellars again once gold has more to buy, before changing their price or yield? Or should late income rise now? *Recommended: measure first.*
6. **Relics.** Fewer, bigger relics (Keystones) at set points of the run, in place of relics in every in-battle draft? *Recommended: yes, in R3's relic pass.*
7. **A shared offer each round.** Is it worth a prototype after tech: a few one-round tactics, the same offer for you and the general, with the general's pick shown? *Recommended: decide after tech's playtest.*
8. **The clean-win bonus.** Extra Spores, or a better spoils pick, and at what Heartcap line? *Recommended: a better spoils pick, since it feeds the build.*
