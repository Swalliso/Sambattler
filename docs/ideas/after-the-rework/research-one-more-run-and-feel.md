# Research: "one more run" pull and game feel, from designers' own words

Evidence for [After the combat rework](../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`): web research on the "one more run" pull and game feel. Written by an agent during that review; nothing here is adopted. Recovered from the session transcript.

Written 2026-10-31 against `develop` `ef2e133`, for the fun review. This is web research from designers' talks, interviews and essays, plus a few peer-reviewed studies, mapped onto Spore & Sprawl's known problems. Nothing here is measured in our sim, and nothing is adopted. Rule and data changes still go to the user with numbers first (`.claude/rules/balance.md`).

## How to read this

- **Section 1** lists our problems (P1–P10), with where each is documented. Every practice in section 4 ties to one.
- **Section 2** has one part per topic: what the designers said, quoted briefly with links, and what it means for us.
- **Section 3** pulls out the patterns, and the places where the research disagrees with itself.
- **Section 4** has **24 transferable practices**. Each names the problem it serves, how it would look in our game, the evidence behind it, its cost class and its risk.
- **Section 5** is a shortlist and a few playtest questions this research suggests for P3.
- **Section 6** lists the sources.

**Evidence tags.** Every claim carries one:
- **[Data]**: measured results, from a controlled study or a studio's telemetry.
- **[Dev]**: a developer's own statement about their design. *(secondary)* means a news site reported the words and I couldn't open the original.
- **[Mech]**: a verifiable mechanic of a shipped game, from its wiki, press kit or patch notes. It says *what* the game does, not why.
- **[Opinion]**: a critic, essayist or analyst, including me.

**Caveats on sources.**
- The GDC Vault pages for the Slay the Spire, Into the Breach and Dead Cells talks are behind a login. Their content here comes from GDC's session descriptions and press coverage, not the recordings.
- Several pages blocked fetches (Tom's Guide, Inlander, Epic Games Store, Prototypr, TouchArcade). Where a quote came only through a search-result extract of such a page, it is marked *(secondary)*.
- Quotes were pulled from fetched pages and kept under 15 words. Spot-check any quote against its link before it goes into a design doc.
- The two classic juice talks (Jonasson & Purho, Nijman) are videos. Their technique lists below are from the talks themselves; I couldn't fetch a transcript to quote them.

**Overlap with the sibling research.** [`research-lane-battlers.md`](research-lane-battlers.md) covers lane and army-game mechanics in depth (Clash Royale's pacing, Kingdom Rush's call-early, Heartcap plates, sends, wave previews). [`research-autobattler-roguelites.md`](research-autobattler-roguelites.md) covers build expression and run variety (drafts, synergies, meta-progression). This file stays on **why people start another run, and how a battle feels and reads**. Where a practice here meets one there, it says so, so the reconciliation can merge them.

---

## 1. Our problems

| # | Problem | Where it's documented | The numbers |
|---|---|---|---|
| P1 | **Quiet openings** | `docs/engagement-review.md` "What the numbers say" | First column flip at a median 2:17–4:15; no flip before 3:00 in 30–83% of battles; each side fields 2–4 units for three minutes. Waves (20 s beat) are the rework's answer, in playtest now |
| P2 | **Few verbs** | engagement review; SPEC §3, §6.6 | About 2 decisions a minute: place buildings, ~4 drafts, Hold / Advance, one commander power on a 75–80 s cooldown (§11.10), so 5–7 uses a battle |
| P3 | **The Heartcap cliff** | engagement review; one-more-run review "Step B results" | First hit → dead in a median 18 s (⅔ → dead in 9 s). The `breach` prototype stretches it to 45 s (35 s) |
| P4 | **No comebacks** | Step B results; `docs/status.md` known issues | When the loser's Heartcap is first hit, it has about 1 building and 0 units. Under `breach`, bots came back in 2 of 360 battles |
| P5 | **Runs lost in battle 1, to one general** | Step B results | 33% of runs end in battle 1; Old Mother Mold causes 79 of 99 battle-1 losses (51% of Mold fights). `hotstart` halves it to 18%, but it flattens near 17% |
| P6 | **Drafts are mostly +15% cards** | engagement review "Pillars" (pillar 4) | Strains, the build-defining content, wait for M6 (§9.3, §11.5). `bigdrafts` (2 of 4, twice) only helps a little |
| P7 | **Too much to learn** | `docs/playtest-feedback.md` F8, round 3 | "Far too much to read." The UI pass added tips and tooltips; staged unlocks and a tutorial battle are open. Until M6 there's no gating: every building and relic is in the pool (SPEC §9) |
| P8 | **Hard to watch** | engagement review; `docs/ui-ux-plan.md` B1 | Units are about 8 px; at 1280×720 the field draws 1152×256 at 2×, about a third of the screen height |
| P9 | **The run's systems don't matter, and the curve is upside down** | engagement review | Run HP is binary (0 in 64 of 80 runs, full in 14), so Groves and repair relics are wasted. The boss is the easiest fight (85% of boss fights won with all Step B prototypes on) |
| P10 | **Little reason to start the next run** | SPEC §9 (M6 not built); §8.6 | A loss pays 0 Spores for that battle, so a battle-1 death carries nothing forward. Meta-progression (feats, strains, mastery) is unbuilt |

P10 isn't in the brief's list, but it's the "one more run" problem in its plainest form, and most of the run-level research below speaks to it.

---

## 2. What the designers say, by topic

### 2.1 Balatro (LocalThunk)

**Sources:** the developer's [Balatro Timeline](https://localthunk.com/blog/balatro-timeline-3aarh) (2025) and [Solitaire](https://localthunk.com/blog/solitaire) (2025); Game Developer on [signposting](https://gamedeveloper.com/design/balatro-creator-unveils-a-few-slick-signposting-strategies) (Jul 2024) and on [poker as onboarding](https://www.gamedeveloper.com/business/localthunk-knew-balatro-needed-to-draw-players-in-with-poker) (May 2024); [Rogueliker interview](https://rogueliker.com/balatro-interview/).

- **Familiar words as onboarding.** [Dev] The poker theme was added on top of an existing design: "It was like an onboarding tool." Players are "more willing to interface with a game if it's talking about blinds, discards." The theme was "a coat of paint to make this seem approachable."
- **Teach through the items, a little at a time.** [Dev] He describes Balatro's signposting as an "extended low-calorie tutorial." Specific Jokers teach specific ideas: Four Fingers was "the first moment people really understood Balatro's hook"; Amber Acorn teaches card order. The demo deck was chosen to "push players to try an unfamiliar mechanic."
- **The score is the juice.** [Dev] Chips × Mult was in the first prototype and "seemed very natural for a scoring system." A friend's suggestion of a flaming effect on big scores was adopted because it "fit perfectly." The timeline credits watching Luck Be a Landlord: "that whole score attack concept really fuelled the direction."
- **A difficulty checklist after the first win.** [Dev] Stakes were borrowed from Slay the Spire's Ascension to "add difficulty and give players a sort of checklist to work through."
- **Low stakes, short sessions.** [Dev] "Essentially I wanted to play Balatro like people play solitaire." Achievements and unlocks are meant to nudge players into the systems, not to pad playtime.
- **Tester-led balance.** [Dev] From May 2023 the beta moved him to a "more player-focused development strategy"; testers "knew more about how to play the game properly than I did."
- **Randomness and builds.** [Dev] He admits "a lot of randomness, possibly too much", and frames the metagame as "mitigating risk": a build that can't easily be countered (Rogueliker).

**For us:** the strongest transferable ideas are the vocabulary (P7) and the score display (P6). Our names (Truffle Cellar, Gill Nest, Capguard Hall, Heartcap, Sporestorm) are flavour-first, so the player learns a word *and* a function. Balatro teaches with words the player already owns. And Balatro makes a +Mult card *visible* in every hand's score. Our +15% cards have no on-screen readout at all.

### 2.2 Slay the Spire (Mega Crit)

**Sources:** GDC 2019, ["Slay the Spire: Metrics Driven Design and Balance"](https://www.gdcvault.com/play/1025731/) (Anthony Giovannetti; description only); [Seattle Indies spotlight](https://www.seattleindies.org/?p=7206); [Road to the IGF](https://www.gamedeveloper.com/disciplines/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-) (Jan 2020); [Think Like a Game Designer](https://justingarydesign.substack.com/p/anthony-giovannetti-crafting-slay) show notes; [PCGamesN on Slay the Spire 2](https://www.pcgamesn.com/slay-the-spire-2/new-modes) (Apr 2026); the [Neow wiki page](https://slaythespire.wiki.gg/wiki/Neow).

- **A metrics server from early on.** [Dev] Casey Yano: "Whenever someone plays, their metrics from their game get submitted to the server." They wanted to be "incredibly data-driven", because two people can't judge 200 cards by hand. Win rate and pick rate per card were the main measures. Giovannetti calls playtesting and the server their "secret sauce", and advises "Playtest more than you think you need to." The GDC description adds a caution that metrics mislead if read carelessly.
- **Risk against reward is the core.** [Dev] "The core design of Slay the Spire is risk versus reward." The map adds "an extra element of risk/reward and planning."
- **Strong combos are fine in single player.** [Dev] "we believe in rewarding player mastery", and because it's single player, "we don't have to worry about the typical downside of strong combos." The enemies are what stop "a single dominant strategy": they "challenge different strategies in unique ways."
- **Adaptive help for struggling players.** [Mech] At the start of a run, Neow offers a reduced, fixed set of blessings if you didn't reach the first boss last time. One of them, Neow's Lament, gives the enemies in your next three combats 1 HP.
- **Losing still unlocks.** [Mech] In Slay the Spire 2, finishing a run with your newest character unlocks the next one, win or lose ([guide](https://sts2.untapped.gg/guides/how-to-unlock-characters)).
- **Short format and few buttons.** [Dev] Yano, on a shorter mode in Slay the Spire 2: it's "for people who want to have the Slay the Spire experience" in less time. On UI: "I despise the idea of having 23 worthless buttons on the screen."

**For us:** two direct transfers. Neow's Lament is a cheap, honest answer to P5, triggered by how the last run went. And "strong combos are fine, enemies keep them honest" reframes G3: in a single-player game a dominant build is a problem only when it's the *only* answer to every general (§3 below).

### 2.3 Hades (Supergiant Games)

**Sources:** Greg Kasavin in [Inverse](https://www.inverse.com/gaming/hades-god-mode-interview) on God Mode; [Can I Play That?](https://caniplaythat.com/2021/08/11/hades-god-mode-explained-by-supergiant-games); [GeekDad](https://geekdad.com/2019/10/narrative-and-early-access-supergiants-greg-kasavin-discusses-hades-development/) (Oct 2019); [Game Developer podcast write-up](https://www.gamedeveloper.com/design/roguelikes-and-narrative-design-with-i-hades-i-creative-director-greg-kasavin); [Inlander](https://inlander.com/culture/hades-writer-greg-kasavin-on-how-he-made-video-game-deaths-drive-a-feel-good-story-22725237) and [Tom's Guide](https://www.tomsguide.com/uk/features/hades-exclusive-interview-supergiant) *(both secondary: fetch blocked)*.

- **Take the sting out of failure.** [Dev] "Our big focus... was how to take the sting of failure and reduce that as much as possible" (Inverse). The team's mantra was reportedly "every run counts" *(secondary, Tom's Guide)*: no run should feel like it erased your progress.
- **Death advances something.** [Dev] "The story would advance when you died" *(secondary, Inlander)*. Being sent home is a benefit: "you have the ability to get stronger in a permanent way" (GeekDad). Kasavin wants failure to feel like "stepping on a rake", something to laugh at, so players "push through their inevitable setbacks and be willing to try again."
- **God Mode: tougher, not easier.** [Dev] Roguelikes are interesting because they're different each run, and "To experience that, they've got to kill you." So instead of an easy mode: "What if we just make you a little bit tougher?" [Mech] It starts at 20% damage resistance and adds 2% per death, to a cap of 80%; damage dealt is unchanged. [Dev] Kasavin warns: "It's not a one size fits all solution."
- **Narrative pacing across runs.** [Dev] Lines take roughly 20 to 30 loops to repeat, and gods comment on each other depending on the order you meet them (GeekDad). Bosses "remember" you (Game Developer).
- **An opt-in difficulty dial after the first win.** [Mech] The Pact of Punishment opens after beating Hades once: each modifier adds Heat, and higher Heat pays better rewards. Bounties suggest a Heat level ([RPG Site](https://rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards)).
- [Mech] Each chamber's door shows the reward behind it, so every room starts with a choice about what you'll get next. *(From playing the game; no developer source found.)*

**For us:** P5 and P10 are exactly what Supergiant designed against. A battle-1 rout today wipes 6–8 minutes and pays 0 Spores (§8.6), and run HP is all or nothing (P9). Three Hades tools transfer cheaply: something always carries forward, a resistance that grows with losses, and the run's world reacting to what happened (the general's intel file, §7.6, is already a "they remember you" hook).

### 2.4 Vampire Survivors (poncle) and Brotato (Blobfish)

**Sources:** [Pocket Tactics interview](https://www.pockettactics.com/vampire-survivors/interview) with Luca Galante; [The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613) (Peter Howell, University of Portsmouth); The Verge interview *(secondary, via news reports)*; [Epic Games Store feature](https://store.epicgames.com/news/vampire-survivors-built-genre-autoshooter-bullet-heaven) *(secondary)*; Brotato's [1.0 press release](https://www.gamespress.com/Brotato-10-Release) and [unlock guide](https://commonsensegamer.com/brotato-how-to-unlock-all-characters/).

- **Fun over balance.** [Dev] Galante: "balance is completely out of the window", and "I just want to make stuff that is fun." He tests new characters to see "how much chaos I can put on screen."
- **A slot machine's polish on the reward.** [Dev, secondary] Galante worked on slot machines before Vampire Survivors and has said slot designers put heavy polish on sound and animation because the player pays on every press. The chest-opening screen, with flashing lights and music, is the visible legacy.
- **A fixed run length that makes near misses.** [Mech] A run is won at the 30-minute mark. [Opinion] Howell argues a run that ends short of 30 minutes produces a near-miss feeling. He cites the gambling literature but has no Vampire Survivors data.
- **Short runs, many unlocks.** [Mech] Runs cap at 15–30 minutes *(secondary)*, and coins from every run, won or lost, buy permanent upgrades and characters.
- **Brotato: short waves and a ladder.** [Mech] 20 waves of 20–90 seconds each, with a shop between every wave (press release). Danger 0–5: winning at one level unlocks the next. Many characters and weapons unlock by "win a run with X" (e.g. Power Fist from Brawler), which turns each new character into a goal for the next run.

**For us:** these games make *the player's growing power the show*. Every pickup and every level-up visibly changes the screen. Our +15% cards change a number the player never sees (P6), and our "power" is spread across many small units the player can't read (P8). Brotato's shape (a decision every 20–90 s, a shop between waves) also lines up with the rework's 20 s wave beat. Each beat could carry a small decision (P2).

### 2.5 Into the Breach (Subset Games)

**Sources:** [Road to the IGF interview](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-); GDC 2019 ["Into the Breach Design Postmortem"](https://gdcvault.com/play/1025772/-Into-the-Breach-Design) (Matthew Davis; description only); Kotaku's [Splitscreen interview](https://kotaku.com/the-creators-of-into-the-breach-came-very-close-to-givi-1833498295) with Davis and Justin Ma.

- **Telegraphing so a loss is the player's fault.** [Dev] They wanted "less randomness than FTL" and a game where "every death felt like your own fault." That "lead us to use of telegraphed enemy attacks as a core mechanic." When you fail, "it's very clear how or why you failed."
- **Make the player care about the board.** [Dev] "We wanted a game where you had to care about the collateral damage."
- **Cut until the core is clear.** [Dev] They cut about 60% of what they planned (city-building, multiple squads, research trees, timed missions, FTL-style events), and the combat became the whole game. They judged each system on its own: "This part of the game works. This part of the game doesn't work."
- [Mech] One rewind of a whole turn per battle. Easy mode works as an extended tutorial with fewer enemies, per players ([forum](https://forum.quartertothree.com/t/into-the-breach-turn-based-strategy/128428?page=13), [Opinion]).

**For us:** the general already warns of a counter (§10.2: the kind and pips per wave), but the player can't see *what's coming at the line next* or *why the last fight went the way it did* (P4, P7). Under the rework's 20 s waves, the next enemy wave is a known quantity, so it can be shown. "Every death your own fault" is also the right test for battle-1 losses to Old Mother Mold (P5): can a first-time player see the swarm coming and know the answer?

### 2.6 Dead Cells (Motion Twin)

**Sources:** [MCV "When We Made... Dead Cells"](https://mcvuk.com/development-news/when-we-made-dead-cells/) (Sébastien Bénard); GDC 2019, ["Dead Cells: What the F*n!?"](https://gdconf.com/news/get-game-design-tips-and-tricks-dead-cells-dev-gdc-2019) (description); [80.lv on its fairness tricks](https://80.lv/articles/dead-cells-hidden-tricks-that-make-the-game-feel-fair); the wikis on [Boss Stem Cells](https://deadcells.wiki.gg/wiki/BSC) and [timed doors](https://deadcells.wiki.gg/wiki/Timed_door).

- **Fair difficulty, viable runs.** [Dev] Bénard: "it's about making a fair difficult game", and "most runs should be viable", unlike the odds in The Binding of Isaac.
- **Cheat for the player.** [Dev] The GDC talk was about how secretly making the player's life easier made the game "more hardcore but without the rage-quits" (session description). Bénard counts 30–40 such tricks, such as a "just in time jump" when falling off a ledge.
- **Early Access reshaped the build system.** [Dev] After a month "we had so much interesting feedback," and they "decided to change tons of important things, especially how you build your character."
- **Opt-in difficulty with rewards.** [Mech] Boss Stem Cells, earned by beating the final boss, are stacking difficulty modifiers that also open bonus doors and drop more cells.
- **Reward speed instead of punishing slowness.** [Mech] Timed doors lock if you don't reach them within a set time, and hold gold, cells and an item choice.

**For us:** "most runs should be viable" is the target P5 misses. 51% of battle-1 Mold fights are lost before the player has made more than a dozen choices. Timed doors are the kindest form of "go forward" pressure, against "falling back early is a big edge" (status.md). Being on time earns a bonus; being slow costs nothing extra.

### 2.7 Risk of Rain (Hopoo Games)

**Sources:** [Wikipedia's development section](https://en.wikipedia.org/wiki/Risk_of_Rain), citing [Rock Paper Shotgun, Feb 2016](https://www.rockpapershotgun.com/risk-of-rain-difficulty); [RoR2 wiki, Difficulty](https://riskofrain2.wiki.gg/wiki/Difficulty).

- **Time is the difficulty, so the player moves.** [Dev, via Wikipedia] The original tower-defence idea failed because players wouldn't leave their defensive point, so the team looked for a way "to force the player to keep moving" and arrived at "difficulty = time."
- **Don't flatten the swings.** [Dev, via Wikipedia] They tried adding kill speed to the difficulty counter and dropped it because it "removed the 'highs and lows'". The time-based curve alternates between feeling overpowered and struggling to survive.
- [Mech] In RoR2, difficulty rises steadily with time, so lingering to loot has a visible cost.

**For us:** the Sporestorm (§6.4) is our time pressure, but it lands on the *Heartcap* (+20% damage taken per stack), so the clock's main effect is the cliff (P3). RoR's lesson is to aim the clock at *movement*. And their rejected experiment is a warning for adaptive difficulty: our adaptive general must not erase the swings (§3).

### 2.8 Dome Keeper (Bippinbits)

**Source:** René Habermann in [Game Developer, Road to the IGF 2023](https://www.gamedeveloper.com/road-to-igf-2023/how-dome-keeper-focuses-on-systems-that-feed-into-one-another).

- **Easy to pick up, depth from interplay.** [Dev] A main goal was to make the game "very easy to pick up." Mechanics stay minimal, with "the complexity coming from the interactions and interdependencies."
- **Two phases that feed each other.** [Dev] "It was always about the interplay between the two phases": "the tense battle where you are fighting for survival" against the "strangely calm mining phase."
- **A visible clock makes small decisions matter.** [Dev] "the time constraint put on the mining by the battles" turns digging into "hundreds of micro-decisions."

**For us:** our battle has no calm phase that feeds the tense one. Deploy is calm but short, and the live battle is uniformly half-calm (P1). Under 20 s waves, each beat could alternate a calm "prepare the wave" moment with a tense "the waves meet" moment, and the visible countdown to the next wave becomes Dome Keeper's timer.

### 2.9 Peglin (Red Nexus) and Luck be a Landlord (TrampolineTales)

**Sources:** Wikipedia on [Peglin](https://en.wikipedia.org/wiki/Peglin) and [Luck Be a Landlord](https://en.wikipedia.org/wiki/Luck_Be_a_Landlord); Balatro's timeline (above). Primary design interviews were thin or blocked (the TouchArcade interview with Dylan Gedig returned 403).

- [Mech] Peglin began as a 2019 jam game and settled on Peggle-plus-Slay-the-Spire. Orbs work like cards in a deck, and each shot's damage visibly accumulates while the ball bounces.
- [Mech] Luck be a Landlord is a slot-machine deckbuilder with a rent bill due every few spins. The bill rises each time, so you always know the next threshold and how short you are.
- [Dev] LocalThunk credits Luck be a Landlord's "score attack concept" as the spark for Balatro's direction.

**For us:** both games make the *outcome of the player's build* a number that climbs in front of them, against a threshold the player can see. Our nearest equivalents are the territory tug and the Heartcap bars. Neither tells the player "your build did this."

### 2.10 Neighbours in our genre: TFT, Super Auto Pets, The Bazaar, Mechabellum

[`research-lane-battlers.md`](research-lane-battlers.md) covers lane mechanics. These notes are only about **how losing works** and **what the watching half is for**.

- **Losing costs life, not the run.**
  - [Mech] Super Auto Pets: 5 lives, and each lost battle costs one. You win at 10 wins ([wiki](https://superautopets.wiki.gg/wiki/The_Basics)).
  - [Mech] The Bazaar: you start with 20 Prestige, and a loss costs more the later in the run it comes, so early losses are cheap ([Mobalytics guide](https://mobalytics.gg/the-bazaar/guides/prestige)).
  - [Mech] TFT: a lost round costs HP based on the enemy units still alive, plus a base amount that starts near zero in early stages ([Dot Esports](https://dotesports.com/league-of-legends/news/how-to-calculate-player-damage-teamfight-tactics)). Win and loss streaks both pay bonus gold ([Upcomer](https://upcomer.com/teamfight-tactics-galaxies-march-9-pbe-update/)). [Opinion] Streamer Scarra argued TFT punishes loss streaks harder than other auto-battlers.
- **Tough choices, extreme outcomes.** [Dev] TFT's David Abecassis at GDC 2020 ([Pocket Tactics](https://www.pockettactics.com/teamfight-tactics-design)): the genre's strengths include its "relaxed pace" and "non-confrontational play"; Riot's principle was "tough choices, not touch execution", and "Always embrace extreme outcomes."
- **Watching should explain the result.** [Opinion] A Mechabellum review calls it "brutally clear about cause and effect": "one clever pivot can actually flip a game" ([FinalBoss](https://finalboss.io/most-strategy-fans-are-sleeping-on-mechabellum-the), 2026). [Opinion] An auto-battler developer's essay argues that one which doesn't teach you why you lost "is just a slot machine with extra steps" ([solodevstack](https://solodevstack.com/blog/orchard-deck-deterministic-card-battler-keywords)).

**For us:** every one of these auto-battlers spreads a loss over several rounds, so one bad fight never ends the session. Ours concentrates a whole run's risk into battle 1 (P5).

### 2.11 Juice and game feel

**Sources:**
- Martin Jonasson & Petri Purho, ["Juice it or lose it"](https://www.youtube.com/watch?v=Fy0aCDmgnxg) (2012).
- Jan Willem Nijman, ["The art of screenshake"](https://www.youtube.com/watch?v=AJdEqssNZ-U) (INDIGO 2013).
- Steve Swink, *Game Feel* (2008), via [Wikipedia](https://en.wikipedia.org/wiki/Game_feel) and [Liz England's review](https://lizengland.com/blog/review-game-feel-by-steve-swink/).
- Pichlmair & Johansen, ["Designing Game Feel. A Survey"](https://arxiv.org/abs/2011.09201) (2020).
- Masahiro Sakurai's ["Stop for Big Moments!"](https://automaton-media.com/en/news/20220824-15208/) (hit-stop, 2022).
- Studies: Juul & Begy 2016 ([record](https://adk.elsevierpure.com/en/publications/good-feedback-for-bad-players-a-preliminary-study-of-juicy-interf)); Kao 2020, *The effects of juiciness in an action RPG* ([summary](https://improbable.com/tag/rpg/)); Kao, Ballou, Gerling, Breitsohl & Deterding, CHI 2024 ([record](https://spiral.imperial.ac.uk/entities/publication/253c32f5-d124-4a23-88b5-9aaaf114608d)).

What the practitioners say:
- [Dev] **Jonasson & Purho** take a plain Breakout clone and add, step by step: colour, tweened movement and easing, squash and stretch on impact, particles, sound on every event, a little screen shake, and blocks that react when hit. The game's rules never change, yet it goes from lifeless to delightful. Their claim is that a juicy game is more fun to interact with.
- [Dev] **Nijman** does the same to a shooter, with a longer list: a hit animation and enemy knockback; **permanence** (corpses and shells stay on the ground, so the screen records what happened); camera kick and screen shake; "sleep" (a few frames of freeze on a hit, i.e. hit-stop); more bass in the sounds; bigger, faster bullets with less accuracy; and explosions. Each step changes nothing about the rules.
- [Dev] **Sakurai's** first design video was titled "Stop for Big Moments!": brief freezes on strong hits and defeats tell the player what mattered.
- [Opinion] **Swink** defines game feel as "real-time control of virtual objects in a simulated space", emphasised by polish. By that definition an auto-battler has little game feel, since the player doesn't control the units. What we have is *polish* (the units' motion and impacts) and the feel of our *few direct inputs* (placing, the power, Hold, drafting).
- [Opinion] **Pichlmair & Johansen** surveyed 200+ sources and found three aims: **physicality** (coherent motion, by tuning), **amplification** (emphasising events that matter, by juicing) and **support** (helping the game do what the player means, by streamlining).

What the experiments found:
- [Data] **Juul & Begy (2016):** two mechanically identical games, one with heavy redundant juice. Players rated the juicy one higher but performed worse in it. The authors call the support for their hypotheses partial.
- [Data] **Kao (2020):** four versions of an action RPG with no, medium, high and extreme juice. Medium and high beat both none and extreme on every measure *(per the summary; the full paper wasn't accessible)*.
- [Data] **Kao et al. (CHI 2024)** tested *what kind* of juice motivates. Feedback tied to the player's success ("Success dependence enhanced all motives") raised effectance, competence and curiosity. Plain amplification, the same effects without that link, "unexpectedly reduced them", perhaps because it blurred the player's sense of agency. Curiosity was the strongest predictor of enjoyment and the *only* predictor of free-choice playtime.

**For us:** we follow the restrained half of this already. SPEC §10.4's "clean field" rule means 1–2 px spore motes, no damage numbers by default, and screen shake off by default and capped at 3 px on Heartcap hits. Kao 2020 says "none" loses to "medium". Kao 2024 says *which* events get the juice matters more than how much. Most of what happens in an auto-battler isn't the player's doing, so blanket juice on every hit is the "amplification" condition that lowered motivation. The juice budget belongs on **the consequences of the player's own decisions**: their power landing, the wave they released, the merge they set up, the column their push took. Today's sound engine (§13.9) can already carry most of it.

### 2.12 Comebacks and rubber-banding

**Sources:** Celia Wagar, ["Comeback Mechanics & Slippery Slopes"](https://critpoints.net/2017/04/01/comeback-mechanics-2/) (CritPoints, 2017); ["Theory: Rubber Bands"](https://lawofgamedesign.com/2014/08/25/theory-rubber-bands/) (The Law of Game Design, 2014); Soren Johnson, ["Water Finds a Crack"](https://designer-notes.com/game-developer-column-17-water-finds-a-crack) (Game Developer, 2011); Sid Meier's 2010 GDC keynote via [Game Informer](https://gameinformer.com/b/news/archive/2010/03/12/sid-meier-gamers-arent-logical).

- [Opinion] **Positive and negative feedback.** Wagar maps comebacks to negative feedback and snowballs to positive feedback. Snowballs create "lame duck" endings: "Creating lame duck scenarios isn't ideal." Heavy comebacks create "low effort upsets, which are frustrating", and a game where "the guy who appears to be winning, is not actually winning yet." Comebacks feel earned when they're limited in strength or duration *and* the trailing player still has to win exchanges.
- [Opinion] **A rubber band must make the game more interesting for both sides.** "Done wrong, rubber bands make good play meaningless." The blue shell fails because it "negates good decisions rather than creating them." Street Fighter IV's Ultra passes: it grows as you take damage, but you still have to land it, and the leader can play around it.
- [Dev] **Players feel odds, they don't compute them.** Sid Meier's Civilization Revolution testers accepted losing at 2-to-1 odds but were upset losing at 20-to-10: "It's 20-to-10! I should win! It's a big number!" He also noted: "In the world of games, you almost always win."
- [Dev] **Dominant strategies drain fun.** Soren Johnson: "Given the opportunity, players will optimize the fun out of a game." "Games lose their dynamic quality once a strategy emerges that dominates under all conditions." A good design makes a decision right in some situations and wrong in others.
- [Mech] TFT pays streak gold for losing streaks too (2.10). Mario Kart's blue shell is the standard example of the cheap kind.

**For us:** Step B's finding (P4) matches Wagar's diagnosis. The cliff is a lame-duck ending: the loser has 1 building and 0 units when the Heartcap is first hit, so a last-stand bonus at that point has nothing to work with. A good comeback here has three parts: it starts *earlier*, when the front crosses into your home columns; it hands the trailing player a *decision* (Ultra-style), not a free effect; and the general can see it and answer it. Johnson's line also names the "falling back early is a big edge" issue from the rework playtest list: players will find and repeat it, so passive play needs a cost or active play needs a reward.

### 2.13 Tension arcs and near misses

**Sources:** Valve's [Director scripting docs](https://developer.valvesoftware.com/wiki/Left_4_Dead_2/Scripting/Director_Scripts) and Mike Booth's ["The AI Systems of Left 4 Dead"](https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf) (AIIDE 2009); [Shacknews on Evolve](https://shacknews.com/article/82787/how-evolve-assures-action-peaks-and-valleys); Clark et al., [*Neuron* 2009](https://pmc.ncbi.nlm.nih.gov/articles/PMC2658737/); Larche, Musielak & Dixon, *J. Gambling Studies* 2017 ([thesis](https://uwspace.uwaterloo.ca/handle/10012/12522)); Supercell's [November 2019 Clash Royale notes](https://supercell.com/en/games/clashroyale/blog/release-notes/november-update); David Harlow on [Kingdom Rush's campaign](https://gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design) (2013).

- [Mech/Dev] **Left 4 Dead's Director** runs a pacing state machine: it builds intensity, sustains a peak, then forces a relax period. Mobs spawn only in the build-up state, and scripts can shorten the peak and relax phases (Valve wiki). Booth's 2009 talk calls this adaptive dramatic pacing. [Dev] Evolve's developers, who copied it, put the reason plainly: you can't appreciate the action without some inaction *(secondary)*.
- [Dev] **Risk of Rain:** keep the "highs and lows" (2.7).
- [Mech] **Clash Royale** generates elixir faster in the last phase, and in 2019 Supercell shortened matches from 6 to 5 minutes to make battles faster and more technical in the closing minutes *(secondary)*. The clock's job is to build to a climax, not to end things on a technicality.
- [Opinion] **Kingdom Rush:** "every game needs its Breather Level", and difficulty spikes are placed on purpose (Harlow).
- [Data] **Near misses motivate.** Clark et al. (2009, n=15 fMRI plus a behavioural study): near-misses "were experienced as less pleasant, but increased desire to play", and recruited the same reward circuitry as wins. The effect was stronger when *the player* made the choice. Larche et al. (2017, 60 Candy Crush players): near-misses were the most arousing *and* most frustrating outcome, and triggered the strongest urge to keep playing.
- [Opinion] The near-miss research comes from gambling, where it is used to exploit. Clark points out that in gambling a near-miss carries no information about the next spin. In a skill-and-strategy game it *does*: "you were two columns from their Heartcap" tells you something true. The ethical line is to show real near-misses and the lesson they carry, never to manufacture them.

**For us:** our battle's shape is flat, then a cliff (P1, P3). The rework's 20 s waves give a pulse but no arc. The research points to an arc that builds deliberately: a first clash early, a mid-battle peak (the general's counter wave), and a final phase where both sides gain *more to do* rather than the Heartcaps turning to glass. A lost battle should then end on an honest near-miss readout. [`research-lane-battlers.md`](research-lane-battlers.md) #3 ("double bloom") and #4 (overtime) are the same idea in mechanic form.

### 2.14 Run length and session design

**Sources:** Kasavin and Yano (above); LocalThunk's *Solitaire*; the Vampire Survivors and Brotato material (above); SPEC §3.

- [Dev] Short, complete sessions are an explicit goal for Balatro ("like people play solitaire") and for Slay the Spire 2's short mode. Yano would rather players reach 100% "relatively early" than play forever.
- [Mech] Vampire Survivors caps a run at 30 minutes; a Brotato run is 20 waves of 20–90 s; Super Auto Pets ends after 10 wins or 5 losses. Each makes progress *within* the session obvious: the timer, the wave count, the trophies.
- [Dev] Hades makes even a short failed run count ("every run counts", secondary).
- [Opinion] What decides whether a run feels "too long" or "pointless" isn't its length but how much of it can be **lost in one stroke**. A 30-minute run is fine when its failures are partial. A 30-minute run where the first 7 minutes can end it outright feels like a lottery.

**For us:** our target is 25–35 minutes (SPEC §3; Step B shows a median boss arrival at 20.5–24.5 minutes). The problem isn't the length. 33% of runs end at about 7 minutes with nothing carried forward (P5, P10), and the remaining 25 minutes hinge on one Heartcap pool that rarely ends partial (P9).

### 2.15 Onboarding complex systems

**Sources:** George Fan, ["How I Got My Mom to Play Through Plants vs. Zombies"](https://notes.hamatti.org/sources/talks/how-i-got-my-mom-to-play-through-plants-vs.-zombies) (GDC 2012, via notes); Balatro (above); Sid Meier via Soren Johnson's ["Sid Meier's Key Design Lessons"](https://www.gamedeveloper.com/pc/analysis-sid-meier-s-key-design-lessons); Dome Keeper (above); Kingdom Rush (above); Caleb Compton, ["Designing interesting decisions in games (and when not to)"](https://www.gamedeveloper.com/design/designing-interesting-decisions-in-games-and-when-not-to-) (2019); Dan Cook, ["The Chemistry of Game Design"](https://lostgarden.com/2021/03/13/the-chemistry-of-game-design-2/).

- [Dev] **George Fan's ten rules** (as noted from the talk):
  1. Blend the tutorial into the game (the "tutorial chameleon").
  2. Let players do rather than read.
  3. Spread out new mechanics (roughly one every five levels), and limit early options: one shop purchase on the first visit. Money didn't arrive until after 10 levels *(secondary)*.
  4. Get the player to do a thing once.
  5. Use fewer words.
  6. Use unobtrusive messages.
  7. Use adaptive messages that appear only when the player is stuck.
  8. Don't create noise.
  9. Teach with visuals.
  10. Lean on what people already know (Sunflower, Wall-nut).
- [Dev] **Balatro:** familiar vocabulary as an "onboarding tool"; items as an "extended low-calorie tutorial" (2.1).
- [Opinion/Dev] **Sid Meier**, via Johnson: a good game is "a series of interesting choices", and they must be *informed*: don't ask players to commit before they understand. The player must "always be the star." Covert Action is his example of two good sub-games undermining each other by competing for attention.
- [Dev] **Dome Keeper:** "very easy to pick up," with depth from interactions, not from rule count (2.8).
- [Opinion] **Kingdom Rush:** level 1 is deliberately easy; each level adds one new enemy or mechanic; the most unusual towers come last (Harlow).
- [Opinion] **Compton:** "more choices isn't always better"; too many options cause analysis paralysis and regret.
- [Opinion] **Cook's skill atoms:** each mechanic is a loop of action → simulation → feedback → the player's updated model. Atoms chain, and an atom the player can't yet read gets ignored (burnout).
- [Mech] **Staged unlocks are the genre norm.** Slay the Spire 2 starts with one character and unlocks the next after a run, win or lose. Brotato gates characters and difficulty levels behind wins. Vampire Survivors unlocks characters and weapons from play.

**For us:** F8 ("far too much to read") meets a game where every building, relic and system is live from run 1 (SPEC §9: no gating until M6). Battle 1 asks a new player to learn at once: territory, the forward price, economy buildings, interest, the Spore Exchange, supply, merging and its toggle, Hold / Advance, the commander power, drafts, the Sporestorm, the general's counters and, under the rework, waves, shields, pinning and flyers. The UI pass (tips, tooltips, Help tabs) is Fan's rules 5–7. Rules 1–4 and 10, gating and teaching by doing, are the open part.

### 2.16 Making many simultaneous units readable

**Sources:** Riot's ["Clarity in League"](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/) (2021) and ["Anatomy of a League of Legends missile, part 2"](https://realtimevfx.com/t/anatomy-of-a-league-of-legends-missile-part-2-what-are-we-communicating-with-our-vfx/13062) (2020); Bad North's developers via [Gaming Audio News](https://gamingaudionews.com/2018/04/26/bad-norths-developers-talk-about-inspiration-behind-audio-and-gameplay/) (2018); [Mechabellum review](https://finalboss.io/most-strategy-fans-are-sleeping-on-mechabellum-the); Numantian on [They Are Billions](https://numantiangames.com/News/2017-05-31-new-game-they-are-billions/); the [TABS press kit](https://landfall.se/tabs-press-kit).

- [Dev] **Riot defines clarity** as "the ability to understand what's happening in League and respond to it," with three goals: gameplay clearly conveyed, hierarchy preserved, noise minimal. A defining silhouette feature never changes (even across skins), the silhouette signals the source of power (bow, staff), and size signals role.
- [Dev] **A visual-hierarchy budget.** Riot designers rate each spell's importance from 1 to 10, so visual importance matches gameplay importance: "if everything is important, nothing is important." Higher damage means "bigger, brighter, and more threatening."
- [Dev] **Sound as a second channel.** Bad North's team wanted the audio to let you "close your eyes and still understand what is going on", with "every clash of swords and arrow impact" audible. The first sound they solved was the slow-time effect.
- [Dev] **Pause as a readability tool.** Numantian calls They Are Billions' pause "very important", letting players act calmly at their own pace with thousands of units on screen.
- [Mech] **Two-colour armies.** TABS pits red against blue "wobblers" with exaggerated silhouettes, so a glance at the field tells you who is winning.
- [Opinion] Mechabellum is "brutally clear about cause and effect": clean silhouettes and distinct projectiles let you see what hit what.

**For us:** our pause and the sound engine already exist. What's missing is **scale and hierarchy**. Units at about 8 px (P8) have room for a silhouette or a colour, not both. Merged Bloomed and Elder units get only "a slightly larger sprite" (§10.4), so the swarm and its champions read alike. The colony-swarm notes already say the mass and the big merged units "become what you track" (`docs/ideas/colony-swarm.md`). Riot's hierarchy, applied here, makes Elders, the player's power, counter waves and breaches loud, and the trickle of ordinary hits quiet.

---

## 3. Patterns, and where the research disagrees

### What the designers agree on

1. **Failure must leave something behind.** Hades (story, upgrades, God Mode), Slay the Spire (unlocks, Neow's help), Vampire Survivors and Brotato (coins and unlocks), and the auto-battlers (lives, Prestige, HP). None of them lets one early fight erase a whole session with nothing to show. **This is our largest gap (P5, P10).**
2. **A loss should be legible.** Into the Breach (telegraphs, "clear how or why you failed"), Dead Cells (fair difficulty), Mechabellum (cause and effect), Riot (clarity). The player who understands their loss comes back, and the one who feels robbed doesn't.
3. **Juice is a reward signal, aimed at the player's agency.** Kao 2024 is the strongest evidence in this file. Success-linked feedback raised every motive tested, and blanket amplification lowered them. Sakurai: stop for *big* moments.
4. **Difficulty is a ladder the player climbs by choice.** Ascension, Stakes, Heat, Boss Cells, Danger levels, covenants. Every one starts *after* the first win and pays for the extra risk.
5. **Teach by gating, not by text.** Plants vs. Zombies, Kingdom Rush, the unlock structures above. Text-based help (our UI pass) is the weakest of Fan's tools.
6. **Pacing has peaks *and* troughs on purpose.** L4D, Risk of Rain, Dome Keeper, Kingdom Rush, Clash Royale.

### Where the research disagrees or warns

- **Juice can hurt.** Juul & Begy found worse performance with heavy juice; Kao 2020 found extreme juice as bad as none; Kao 2024 found unconditional amplification *lowered* motivation. A response talk, Folmer Kelly's "Don't Juice It or Lose It", argues juice must fit the game and not distract from it ([summary](https://rpgplayground.com/research-making-a-juicy-game/), [Opinion]). **Implication:** a measured, success-linked pass, not a bombastic one. Our clean-field rule is a good base.
- **Comebacks cost consistency.** Wagar: comeback factors "tend to have unintended consequences." The Law of Game Design: done wrong, they make good play meaningless. **Implication:** an earned, answerable comeback, measured by how often the lead changes hands and by the leader's win rate.
- **Adaptive difficulty can flatten the fun.** Risk of Rain dropped kill-speed scaling because it removed the highs and lows. Sid Meier's testers rejected odds that *felt* wrong, even when they were fair. **Implication:** our adaptive general (pillar 3) should adapt *what* it fields, visibly, and not quietly scale its strength. Any mercy rule should be visible (Neow's Lament, God Mode), not hidden.
- **Near misses come from gambling.** The evidence that they drive play is real (Clark 2009, Larche 2017), but its home is exploitation. **Implication:** show only true near-misses and pair each with a lesson. Never fake a close call.
- **Meta-progression multiplies a loop; it doesn't create one.** The engagement review warned of this, and LocalThunk's "Solitaire" agrees: unlocks should nudge players into the systems, not pad playtime. **Implication:** a small "something carries forward" first (P10); a full M6 waits until the battle itself is fun.
- **Single-player balance is different.** Giovannetti: strong combos are fine because nobody else suffers them. Galante: "balance is completely out of the window." TFT: "Always embrace extreme outcomes." **Implication for G3:** a mono build that beats `bot:balanced` is a problem when it's the only answer to everything, or when it makes *the player's* choices meaningless. It isn't one simply because it's strong. That supports the rework's strict counter bar (every strong build has an answer) as the primary test, with G3 secondary.

---

## 4. Practices for Spore & Sprawl

Each practice gives the problem it serves, how it would look here, its evidence, a **cost class** and its **risk**. Cost classes:
- **render**: `src/render`, `src/ui` or `src/audio` only. No sim change and no golden refresh.
- **data**: numbers in `data/*.json` or a `?proto=` preset. Goldens refresh.
- **rule**: a new sim mechanic. Goldens refresh, and the user's OK is needed.
- **content**: new authored material (maps, scripts, text).
- **meta**: run or profile structure (`src/run`, the profile save).

Every **data** or **rule** item waits for the user's OK (`.claude/rules/balance.md`).

### A. Make losing cheaper and more legible (P4, P5, P9, P10)

#### 1. A battle loss costs run HP, scaled by battle index, not the run (lives model)
- **Problem:** P5, P9, P10.
- **How:** below the boss, a Rout loss costs a share of run HP instead of ending the run: say 25% in battle 1, 35% in battle 2 and 50% later. The run ends only at 0 HP, or on a boss loss (as now). This follows the engagement review's recommendation 2 and Step B's own conclusion ("a run-level rule"). Battles stay as tense as now, but battle 1 stops being a coin flip on the whole run. Groves, Mending Moss and Rot Ward start to matter, because HP is no longer binary.
- **Evidence:** [Mech] Super Auto Pets (5 lives); The Bazaar (Prestige, cheap early losses); TFT (early losses cost little). [Dev] Kasavin's "take the sting of failure". [Dev] Bénard's "most runs should be viable."
- **Cost:** rule + meta (§8.5, §6.5).
- **Risk:** a run that limps on at low HP becomes a lame-duck run (Wagar). Mitigate with real repairs (Groves at +30%) and an honest HP readout on the route map. It also changes every run statistic, so the `runs` check needs a new target, for example battle-1 *run deaths* under 10% while battle-1 *losses* stay near 30%.
- **Overlap:** [`research-autobattler-roguelites.md`](research-autobattler-roguelites.md) (run structure).

#### 2. Neow's Lament for whoever died early last time
- **Problem:** P5, P7.
- **How:** if the last run ended in battle 1 or 2, the next run's deploy offers one extra, clearly labelled choice: "Rot's Mercy: the general starts battle 1 on half income," or "the first two battles' generals skip their opener." The help is visible and optional, and it comes back only after another early death. It stacks with `hotstart`'s ¾ income and its deploy draft.
- **Evidence:** [Mech] Slay the Spire's Neow (a reduced choice set, including 1-HP enemies, after failing to reach the first boss). [Opinion] Sid Meier: players accept odds they *feel* are fair.
- **Cost:** data + meta (a flag in the profile save; the modifier reuses `hotStart.battles[].enemy.modifiers`).
- **Risk:** players who die on purpose to farm it (unlikely to matter at this size). It fixes the symptom, not Mold's swarm; pair it with item 3.

#### 3. Make battle 1 a teaching fight: no swarm general in battle 1
- **Problem:** P5, P7.
- **How:** take Old Mother Mold out of battle 1's eligible generals (Step B: `hotstart` plus that move gets battle-1 losses to 6%), *or* give battle 1 a gentle "first contact" doctrine for whichever general is drawn. Kingdom Rush makes level 1 deliberately easy and adds one threat at a time, and Plants vs. Zombies holds money back for 10 levels. The boss then gets a retune to be the hardest fight (item 21).
- **Evidence:** [Mech/Opinion] Kingdom Rush's campaign; [Dev] George Fan; [Data] our Step B (Mold causes 79 of 99 battle-1 losses).
- **Cost:** data (§7.7 eligibility).
- **Risk:** Step B saw battle 2 rise to 37% when Mold moved, so the swing moves rather than vanishes. Measure the whole curve.

#### 4. Something always carries forward, win or lose
- **Problem:** P10, P5.
- **How:** a lost battle pays a few Spores for *what you did*, such as columns held at the end and damage dealt to the enemy Heartcap, instead of 0 (§8.6). The run-end screen shows one unlock track with its next step ("6 Spores to Cordis", "win a battle with Armilla to unlock X"). Ahead of the full M6, ship *one* thin layer: commanders 2 and 3 unlock after your first run ends, win or lose, the way Slay the Spire 2 unlocks characters. §9.8 already wants the first unlock within 1–2 runs.
- **Evidence:** [Dev] Hades ("every run counts", secondary; "get stronger in a permanent way"). [Mech] Slay the Spire 2, Vampire Survivors, Brotato unlocks. [Dev] LocalThunk: unlocks should nudge you into the systems.
- **Cost:** meta.
- **Risk:** the engagement review's warning that meta multiplies an unfun loop. Keep it to *one* track and no power creep, and do it after the battle changes.

#### 5. The general remembers you, and says so
- **Problem:** P10, P4.
- **How:** use the intel file (§7.6) for narrative continuity in the Hades sense. When a general you've met before appears, one line in its intent panel names the last meeting: "Old Mother Mold: 'Back again? Your Gill Nests didn't hold last time.'" On a loss, the run-end screen names the general who beat you and what beat you. Losing becomes the setup for a rematch.
- **Evidence:** [Dev] Kasavin: bosses "remember" you, and death advances the story.
- **Cost:** render + content (lines keyed to intel data already stored).
- **Risk:** text load (P7). Keep it to one line per battle.

#### 6. Explain every loss in one line, with a replay of the moment it turned
- **Problem:** P4, P7, P8.
- **How:** the post-battle report (§10.4) already has the front-line graph, damage by building and the general's counters. Add three things:
  - **a headline computed from those stats:** "Their Sporeling swarm did 64% of their damage; nothing of yours hit more than 3 at once. Burster Pods and Capguards answer swarms."
  - **a turning point:** "At 5:40 you lost the front for good."
  - **a "watch it" button** that replays 15 s around that tick. A replay is cheap here: the save already keeps the battle config and executed command log, and resume re-simulates from tick 0 in about a second (§8.9).
- **Evidence:** [Dev] Into the Breach: "it's very clear how or why you failed." [Opinion] Mechabellum's cause and effect, and "a slot machine with extra steps". [Dev] George Fan's adaptive messages.
- **Cost:** render + run (the replay reuses the resume path).
- **Risk:** a wrong headline erodes trust. Derive it only from real stats, and say "maybe" where the attribution is weak.

#### 7. An honest near-miss readout at the end of a lost battle
- **Problem:** P5, P10.
- **How:** when it's true, the loss screen leads with the closest moment: "Their Heartcap was at 31% when yours fell," or "At 6:12 you held 15 of 24 columns." Show it only for real near-misses, and pair it with item 6's lesson.
- **Evidence:** [Data] Clark 2009; Larche 2017: near-misses raise the urge to play, especially when the player made the choice. [Mech] Vampire Survivors' 30-minute mark.
- **Cost:** render.
- **Risk:** the ethics in §3. A fabricated or inflated near-miss is manipulation. Larche also found near-misses the *most frustrating* outcome, so pair each with something actionable.

#### 8. An opt-in "Rootbound" assist that grows with losses (God Mode)
- **Problem:** P5, P7.
- **How:** a setting, off by default: your Heartcap and buildings take 20% less damage, plus 2% for each run lost with it on, capped at around 60%. It doesn't touch the general, the economy or your damage. It's shown on the run bar, saved in the profile and recorded in the run save, so runs stay deterministic. It's off in Decay runs (§9.6).
- **Evidence:** [Dev] Kasavin's "a little bit tougher" and the God Mode numbers.
- **Cost:** rule (a side modifier at run start) + meta + render.
- **Risk:** Kasavin says it isn't one-size-fits-all. In a game with a Heartcap cliff it mostly delays the cliff. Do it after item 1, not instead of it.

### B. Make the battle build to a climax (P1, P3, P4)

#### 9. A deliberate arc: first clash, mid peak, final surge
- **Problem:** P1, P3.
- **How:** use the rework's 20 s wave beat as the pulse, and shape three acts on top of it:
  - **first clash by about 0:45:** `hotstart`'s deploy draft, plus the first waves meeting mid-lane;
  - **a mid-battle peak:** the general's first counter arrives as a visible doctrine wave (engagement review recommendation 6);
  - **a final surge:** when the Sporestorm starts, both sides earn faster and their waves grow (the rework's `stormwaves` already grows waves 20% a stack), while the storm's Heartcap damage bonus drops (the `breach` preset cuts it to +10%).

  The end becomes a burst of action that ends the battle, rather than glass Heartcaps. After a big clash, a short lull (no new waves for one beat) gives the "relax" phase.
- **Evidence:** [Mech/Dev] L4D's build-up / peak / relax. [Dev] Risk of Rain's highs and lows. [Mech] Clash Royale's double elixir. [Opinion] Kingdom Rush's breathers.
- **Cost:** data (most pieces are presets already) + rule for the lull.
- **Risk:** G4 battle length (median 8:04 under `rework` now), and Decisions if the surge stalls. Measure with `--checks g4`.
- **Overlap:** [`research-lane-battlers.md`](research-lane-battlers.md) #3 "double bloom" and #4 overtime.

#### 10. Reward going forward, rather than punishing falling back ("timed doors")
- **Problem:** "falling back early is a big edge" (status.md); P1; P2.
- **How:** the cheapest version is Kingdom Rush's call-early. A "Send now" on a lane releases your next wave before the beat and pays gold for the seconds skipped. Under Hold, releasing a held army before its timer pays the same. A second option is Dead Cells' timed doors: a small bonus (a free reroll or a +1 draft card) for holding a column past mid-lane by the first draft.
- **Evidence:** [Mech/Opinion] Kingdom Rush's early call ("free Gold equal to the number of seconds left"). [Mech] Dead Cells' timed doors. [Dev] Risk of Rain's "force the player to keep moving". [Dev] Soren Johnson on dominant strategies.
- **Cost:** rule.
- **Risk:** positive feedback (Wagar's slippery slope): the side that's ahead can afford to send early. Keep the bonus small and the general able to do it too.
- **Overlap:** [`research-lane-battlers.md`](research-lane-battlers.md) #5 "Call the beat early".

#### 11. An earned comeback: a stronger power when you're behind (the Ultra model)
- **Problem:** P4.
- **How:** Step B shows the comeback moment must come *before* the base is gone. When the front crosses into your home columns, your commander power becomes ready and **scales with columns lost**: Spore Burst's radius, or Rhizome Tithe's gold, grows by a fixed amount per enemy-held column on your side. It's a decision with a big payoff, not a free effect, and the general can see it (the power's readiness is visible) and hold back. A cap keeps it from becoming a blue shell.
- **Evidence:** [Opinion] Law of Game Design (Ultra vs blue shell); Wagar (limited, earned comebacks). [Mech] TFT's loss-streak gold.
- **Cost:** rule.
- **Risk:** "low effort upsets." Measure lead changes per battle and the leader's win rate, and keep the leader's win rate above about 70%.
- **Overlap:** [`research-lane-battlers.md`](research-lane-battlers.md) C (#10 reclaim bounties, #11 regroup on the beat), which is the mechanic side of the same goal.

#### 12. Telegraph the next enemy wave (Into the Breach's intents)
- **Problem:** P4, P7, P2.
- **How:** under waves, show the general's *next* wave a few seconds before it leaves: a row of small unit icons with counts at the enemy's lane edge, in the same visual language as the counter warning. When a counter is coming (§7.4), add the answer hint the engagement review proposed: "Swarm: area damage and Capguards answer it." The player then has something to *do* with the 20 s beat: read the next wave and place or Hold accordingly.
- **Evidence:** [Dev] Into the Breach ("every death felt like your own fault"). [Mech] Slay the Spire's intents. [Opinion] Kingdom Rush's early warnings.
- **Cost:** render (the sim already knows what's queued; check that the general's next wave is decided far enough ahead).
- **Risk:** it makes the general easier to read; that's the point, but watch battle-1 numbers. Keep it to one icon row (P7).
- **Overlap:** [`research-lane-battlers.md`](research-lane-battlers.md) #20 "Wave preview at the gate".

### C. Juice that rewards the player's decisions (P2, P8)

#### 13. A "success-linked" juice pass
- **Problem:** P2, P8.
- **How:** juice only the *consequences of the player's own decisions*, and make each one hit hard:
  - **Your power lands:** a 60–90 ms hit-stop, a shockwave ring, a low thump, and a count pop ("×7").
  - **A wave you released from Hold meets the enemy line:** a clash flash along the front and a drum hit.
  - **A merge you set up (or Cordis' Puppet Bloom):** a beat of slow motion on the knit, the "Elder!" pop and a fuller sound.
  - **A column your push took:** the hyphae surge across it, with a rising tone.

  Enemy-side events stay at half intensity, as audio already does (`enemyGain` 50%, §13.9), and ordinary hits stay quiet.

  Hit-stop can be render-only: hold the loop's accumulator (§13.5) for 60–90 ms of real time. The sim's ticks and command stamps don't change, so determinism and goldens are untouched. Scale it down at 2×/3× and drop it under reduced motion (§10.4).
- **Evidence:** [Data] Kao et al. 2024 (success-linked feedback raised motives; amplification lowered them); Kao 2020 (medium or high beats none or extreme). [Dev] Sakurai's "Stop for Big Moments!"; Nijman's sleep and camera kick.
- **Cost:** render.
- **Risk:** low. The main risk is overdoing it (Juul & Begy, Kao 2020). Playtest it with an on/off setting.

#### 14. Permanence: the lane keeps a record of the battle
- **Problem:** P8, P3.
- **How:** dead units leave a faint spore stain that fades over about 45 s, and razed buildings leave rubble for the rest of the battle. The Heartcap shows visible cracks at ⅔ and ⅓, matching the `breach` beats. A glance at the field then says where the fighting was and how hurt each base is.
- **Evidence:** [Dev] Nijman's "permanence".
- **Cost:** render (terrain layer redraws already happen on `columnFlipped`, §13.6).
- **Risk:** it conflicts with SPEC §10.4's "clean field". Keep stains low-contrast and short-lived, and test against color-blind assist.

#### 15. A visual-hierarchy budget for every event
- **Problem:** P8, P7.
- **How:** write a one-page table in the Riot style that rates each event 1–10 and assigns size, brightness, motion and sound to match. For example:

  | Rating | Events |
  |---|---|
  | 10 | Heartcap breach |
  | 9 | Your power |
  | 8 | Counter wave arrives; Elder birth |
  | 7 | Column flip in your favour |
  | 5 | Merge; building lost |
  | 2 | Spawn |
  | 1 | Ordinary hit |

  Today's callout lane already ranks callouts (§10.2), so the table extends that order to the field and to sound.
- **Evidence:** [Dev] Riot ("if everything is important, nothing is important"; the 1–10 rating).
- **Cost:** doc + render.
- **Risk:** low.

#### 16. Bigger, fewer things to track: champions out of the swarm
- **Problem:** P8.
- **How:** two levers.
  - **Scale:** Bloomed units draw at 1.5× and Elders at 2× with a distinct outline (today "slightly larger", §10.4), and every unit type gets one defining silhouette feature, as in Riot's rule.
  - **Space:** use ui-ux-plan B1's empty height. Either the field draws at a non-integer scale (pixel art at 2.5× with nearest-neighbour still reads), or a "front lens" magnifies the contested band about 1.5× while the whole lane stays visible. The second option keeps §13.6's "no camera, whole map visible" rule in spirit.
- **Evidence:** [Dev] Riot's silhouettes. [Opinion] Mechabellum's "brutally clear". [Mech] TABS' two-colour armies. Our colony-swarm note says the big merged units "become what you track".
- **Cost:** render (the lens is real UI work).
- **Risk:** integer-scale purity; hitboxes vs visuals (Riot: they must match); performance budget (§13.7).

#### 17. Sound that carries the battle's state
- **Problem:** P8, P3.
- **How:** add an intensity layer to the ambient bed (§13.9) that rises with the number of units in contact at the front, and a heartbeat that starts when your Heartcap is under attack and quickens below ⅓. Give three stings unique sounds: your wave connecting, a counter wave arriving, a breach. A player looking at the tray should still *hear* the battle turn.
- **Evidence:** [Dev] Bad North: "close your eyes and still understand what is going on."
- **Cost:** render (audio only; no hash change).
- **Risk:** fatigue. Keep it to the throttling rules already in §13.9.

### D. Make the player's choices visible and bigger (P2, P6)

#### 18. Show what the cards did
- **Problem:** P6.
- **How:** Balatro and Peglin show the build's effect as a climbing number. Here:
  - upgraded units carry a pip per level (tier pips exist for merges);
  - right after a draft, the next spawn of the upgraded building flashes with a "+15% damage" tag;
  - the post-battle report gets a line "your upgrades dealt N extra damage" (the sim already tracks damage by building, §10.4).

  A +15% card stops being invisible.
- **Evidence:** [Dev] LocalThunk (chips × mult, the flaming score). [Mech] Peglin's accumulating damage. [Data] Kao 2024 (feedback tied to success).
- **Cost:** render (plus a stat if the report line needs one).
- **Risk:** low.
- **Overlap:** the build-content side (strains, rule-bending cards) is in [`research-autobattler-roguelites.md`](research-autobattler-roguelites.md).

#### 19. Signpost builds on the cards, Balatro- and Vampire Survivors-style
- **Problem:** P6, P7.
- **How:** on a draft card, say what it *combines with*: "Pairs with: Gill Nest" or "Evolves Burrow at level 3." Lean on a few evolution-style cards, where level 3 of a track plus a named relic transforms the building (Vampire Survivors' evolutions; a small slice of §11.5's strains pulled forward). A new player's first evolution is their "Four Fingers moment".
- **Evidence:** [Dev] LocalThunk's signposting and "extended low-calorie tutorial". [Mech] Vampire Survivors' evolutions; Hades' duo boons. [Dev] Abecassis: "Always embrace extreme outcomes."
- **Cost:** content + rule.
- **Risk:** G3 and the counter bar. Single-player power fantasy is fine while the general can answer it (§3), but it must be measured.

#### 20. A second, smaller live verb that refills from play
- **Problem:** P2.
- **How:** the power, every 75–80 s, is the only live verb. Add a small "spore charge" that fills from your kills and merges, spent on one of two cheap field actions, both usable while paused (Abecassis: "tough choices, not touch execution"):
  - rally a lane: its next wave leaves now;
  - quicken a building: one spawner fires its timer immediately.

  This gives the 20 s beats something to spend, with no micro.
- **Evidence:** [Opinion] Sid Meier's "the player must always be the star"; Compton's "interesting decisions". [Dev] Abecassis. [Mech] Brotato's decision every 20–90 s.
- **Cost:** rule + render.
- **Risk:** P7 (one more thing to learn; gate it per item 22). It also reverses part of §1.2's "units always advance" decision, as Hold did. This one is the user's call.
- **Overlap:** [`research-lane-battlers.md`](research-lane-battlers.md) D (sends, field drops).

### E. Teach by gating, and give mastery a ladder (P7, P9, P10)

#### 21. A difficulty ladder after the first win, and a boss that's the summit
- **Problem:** P9, P10.
- **How:** two parts.
  - **Ladder:** pull a minimal version of §9.6's blights forward as a 5-step ladder. One modifier per step, each unlocked by winning the step before, each paying more Spores (Decay already multiplies Spores).
  - **Boss:** retune the boss to be the hardest fight of the base run. Step B finds 85% of boss fights won with all three prototypes on.
- **Evidence:** [Mech] Ascension, Stakes ("a sort of checklist to work through"), Heat, Boss Cells, Danger 0–5. All of them start after the first win.
- **Cost:** data (boss) + meta (ladder).
- **Risk:** content load; and a ladder only helps players who already love the base game, so do it after items 1–3.
- **Overlap:** [`research-autobattler-roguelites.md`](research-autobattler-roguelites.md) (meta-progression).

#### 22. Staged unlocks for a first-time player
- **Problem:** P7.
- **How:** on a new profile, run 1 is Vesper only, with a kit and pool of about 6 buildings.
  - **Run 1:** interest and the Spore Exchange stay hidden until the first draft offers them as a card; the merge toggle appears when the first Bloomed unit forms; Hold / Advance appears in battle 2.
  - **Run 2:** Armilla and Cordis, and the full pool.

  Each system arrives the first time it matters, roughly Plants vs. Zombies' "one new thing every few levels." A "skip the intro" option in Settings unlocks everything for returning players. This is a slimmer, earlier version of §9.2's feats.
- **Evidence:** [Dev] George Fan (spread mechanics out; money after 10 levels). [Mech] Slay the Spire 2 and Brotato unlocks. [Opinion] Kingdom Rush's one new threat per level. [Dev] Sid Meier's informed choices. [Opinion] Compton's "more choices isn't always better."
- **Cost:** meta + render (gating) + data (reduced kits must still win battle 1; measure with `--checks runs`).
- **Risk:** veterans (hence the skip option), and every gate is a new state to test.

#### 23. A scripted, winnable first battle (the tutorial chameleon)
- **Problem:** P7, P5.
- **How:** run 1, battle 1 is fixed: one map and a gentle scripted general. The M1 scripted general (§7.9) is a starting point. It teaches one verb per minute by doing:
  - 0:00: place a Cellar;
  - 0:30: place a spawner;
  - 1:00: watch the first flip;
  - 1:30: Hold, then release;
  - 2:00: fire the power at a clump.

  Each step goes through the existing tip lane, and the battle can't be lost before 3:00. It shouldn't feel like a tutorial (Fan's "chameleon"); the general simply plays an opener designed to be read.
- **Evidence:** [Dev] George Fan's rules 1, 2, 4 and 7. [Opinion] Into the Breach's easy mode as an extended tutorial. [Dev] Habermann's "very easy to pick up."
- **Cost:** content + render (a new general script, tips).
- **Risk:** authoring cost; patronising if over-scripted. Must be skippable.

#### 24. Plain function words beside the flavour names
- **Problem:** P7.
- **How:** the tray card, tooltip and inspect panel lead with function, with the flavour name second: "Archers · Gill Nest", "Shields · Capguard Hall", "Gold · Truffle Cellar". The Sporestorm's chip reads "Overtime · Sporestorm". `src/ui/words.ts` already holds the plain wording.
- **Evidence:** [Dev] LocalThunk (poker words as an "onboarding tool"). [Dev] George Fan's rule 10 (Sunflower, Wall-nut).
- **Cost:** render.
- **Risk:** it waters down the theme; keep the flavour name visible.

---

## 5. Shortlist and playtest questions

### If only five things happen next

| Order | Practice | Why first | Cost |
|---|---|---|---|
| 1 | **#1 a loss costs HP, not the run**, with **#3 no swarm general in battle 1** | Hits P5, P9 and P10 at once; every genre neighbour does it; the measurements already point here (Step B) | rule + data |
| 2 | **#13 success-linked juice** and **#17 state-carrying sound** | Render-only, so no golden or guardrail risk; the strongest evidence in this file (Kao 2024); makes the player's few verbs land | render |
| 3 | **#6 explain every loss** (headline + replay) and **#12 telegraph the next wave** | Into the Breach's "your own fault"; turns the watching half into learning; the replay is nearly free given §8.9 | render |
| 4 | **#22 staged unlocks** and **#24 function words** | The open part of F8; nothing else in the backlog addresses it | meta + render |
| 5 | **#9 a battle arc** and **#11 an earned comeback** | The battle's shape (P1, P3, P4); best judged after the P3 playtest shows how waves feel | data + rule |

Items 2 and 4 don't touch the sim and could proceed while P4's decision is open. Items 1 and 5 are rule changes, and wait for the user.

### Questions for the P3 playtest that this research suggests

Each is a single question, chosen so the answer maps to a practice:
- **"When you lost a battle, could you say why in one sentence?"** (Into the Breach; tests #6 and #12.)
- **"When did you feel clever? When did you feel the game did it for you?"** (Kao 2024's agency finding; Sid Meier's "player as the star"; tests #13 and #20.)
- **"After a run ended, did you want to start another one right away? What made you want to, or not?"** (P10; tests #1 and #4.)
- **"Was there a moment you thought you'd nearly won?"** (near misses; tests #7.)
- **"Name the three most important things that happened in your last battle."** If the player can't, hierarchy (#15) and readability (#16) are the gap.
- **"What did your +15% cards do?"** (P6; tests #18.)

---

## 6. Sources

**Developer statements and talks**
- LocalThunk: [The Balatro Timeline](https://localthunk.com/blog/balatro-timeline-3aarh); [Solitaire](https://localthunk.com/blog/solitaire); [Game Developer, signposting](https://gamedeveloper.com/design/balatro-creator-unveils-a-few-slick-signposting-strategies); [Game Developer, poker as onboarding](https://www.gamedeveloper.com/business/localthunk-knew-balatro-needed-to-draw-players-in-with-poker); [Rogueliker interview](https://rogueliker.com/balatro-interview/)
- Mega Crit: [GDC 2019 talk listing](https://www.gdcvault.com/play/1025731/); [Seattle Indies spotlight](https://www.seattleindies.org/?p=7206); [Road to the IGF](https://www.gamedeveloper.com/disciplines/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-); [Think Like a Game Designer](https://justingarydesign.substack.com/p/anthony-giovannetti-crafting-slay); [PCGamesN on StS2 modes](https://www.pcgamesn.com/slay-the-spire-2/new-modes)
- Supergiant: [Inverse, God Mode](https://www.inverse.com/gaming/hades-god-mode-interview); [Can I Play That?](https://caniplaythat.com/2021/08/11/hades-god-mode-explained-by-supergiant-games); [GeekDad](https://geekdad.com/2019/10/narrative-and-early-access-supergiants-greg-kasavin-discusses-hades-development/); [Game Developer podcast](https://www.gamedeveloper.com/design/roguelikes-and-narrative-design-with-i-hades-i-creative-director-greg-kasavin); [Inlander](https://inlander.com/culture/hades-writer-greg-kasavin-on-how-he-made-video-game-deaths-drive-a-feel-good-story-22725237); [Tom's Guide](https://www.tomsguide.com/uk/features/hades-exclusive-interview-supergiant)
- poncle: [Pocket Tactics interview](https://www.pockettactics.com/vampire-survivors/interview)
- Subset Games: [Road to the IGF](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-); [GDC 2019 listing](https://gdcvault.com/play/1025772/-Into-the-Breach-Design); [Kotaku Splitscreen](https://kotaku.com/the-creators-of-into-the-breach-came-very-close-to-givi-1833498295)
- Motion Twin: [MCV](https://mcvuk.com/development-news/when-we-made-dead-cells/); [GDC 2019 listing](https://gdconf.com/news/get-game-design-tips-and-tricks-dead-cells-dev-gdc-2019); [80.lv](https://80.lv/articles/dead-cells-hidden-tricks-that-make-the-game-feel-fair)
- Hopoo: [Wikipedia, Risk of Rain development](https://en.wikipedia.org/wiki/Risk_of_Rain), citing [Rock Paper Shotgun, 2016](https://www.rockpapershotgun.com/risk-of-rain-difficulty)
- Bippinbits: [Game Developer, Road to the IGF 2023](https://www.gamedeveloper.com/road-to-igf-2023/how-dome-keeper-focuses-on-systems-that-feed-into-one-another)
- Riot: [TFT at GDC 2020 (Pocket Tactics)](https://www.pockettactics.com/teamfight-tactics-design); [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/); [Anatomy of a missile, part 2](https://realtimevfx.com/t/anatomy-of-a-league-of-legends-missile-part-2-what-are-we-communicating-with-our-vfx/13062)
- Plausible Concept: [Gaming Audio News on Bad North](https://gamingaudionews.com/2018/04/26/bad-norths-developers-talk-about-inspiration-behind-audio-and-gameplay/)
- Numantian: [They Are Billions announcement](https://numantiangames.com/News/2017-05-31-new-game-they-are-billions/)
- Valve: [Director scripts](https://developer.valvesoftware.com/wiki/Left_4_Dead_2/Scripting/Director_Scripts); [Booth, AI Systems of L4D (PDF)](https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf); [Shacknews on Evolve](https://shacknews.com/article/82787/how-evolve-assures-action-peaks-and-valleys)
- Supercell: [Clash Royale November 2019 update](https://supercell.com/en/games/clashroyale/blog/release-notes/november-update)
- Sid Meier: [Game Informer, 2010 keynote](https://gameinformer.com/b/news/archive/2010/03/12/sid-meier-gamers-arent-logical); [Soren Johnson, Sid Meier's Key Design Lessons](https://www.gamedeveloper.com/pc/analysis-sid-meier-s-key-design-lessons)
- Soren Johnson: [Water Finds a Crack](https://designer-notes.com/game-developer-column-17-water-finds-a-crack)
- George Fan: [notes on the GDC 2012 talk](https://notes.hamatti.org/sources/talks/how-i-got-my-mom-to-play-through-plants-vs.-zombies)
- Masahiro Sakurai: [Automaton on "Stop for Big Moments!"](https://automaton-media.com/en/news/20220824-15208/)
- Jonasson & Purho: [Juice it or lose it](https://www.youtube.com/watch?v=Fy0aCDmgnxg); Nijman: [The art of screenshake](https://www.youtube.com/watch?v=AJdEqssNZ-U)

**Studies**
- Clark, Lawrence, Astley-Jones & Gray (2009), *Neuron* 61(3): [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2658737/)
- Larche, Musielak & Dixon (2017), *J. Gambling Studies* 33(2): [thesis record](https://uwspace.uwaterloo.ca/handle/10012/12522)
- Juul & Begy (2016), FDG/DiGRA: [record](https://adk.elsevierpure.com/en/publications/good-feedback-for-bad-players-a-preliminary-study-of-juicy-interf)
- Kao (2020), *Entertainment Computing* 34: [summary](https://improbable.com/tag/rpg/)
- Kao, Ballou, Gerling, Breitsohl & Deterding (2024), CHI: [record](https://spiral.imperial.ac.uk/entities/publication/253c32f5-d124-4a23-88b5-9aaaf114608d)
- Pichlmair & Johansen (2020): [arXiv](https://arxiv.org/abs/2011.09201)

**Essays and criticism**
- [Wagar, Comeback Mechanics & Slippery Slopes](https://critpoints.net/2017/04/01/comeback-mechanics-2/); [Theory: Rubber Bands](https://lawofgamedesign.com/2014/08/25/theory-rubber-bands/); [Compton, interesting decisions](https://www.gamedeveloper.com/design/designing-interesting-decisions-in-games-and-when-not-to-); [Cook, The Chemistry of Game Design](https://lostgarden.com/2021/03/13/the-chemistry-of-game-design-2/); [Harlow, Kingdom Rush campaign design](https://gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design); [Howell, The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613); [Liz England on Swink](https://lizengland.com/blog/review-game-feel-by-steve-swink/); [FinalBoss on Mechabellum](https://finalboss.io/most-strategy-fans-are-sleeping-on-mechabellum-the); [solodevstack on auto-battler replays](https://solodevstack.com/blog/orchard-deck-deterministic-card-battler-keywords); [RPG Playground on juice research, incl. Folmer Kelly's response talk](https://rpgplayground.com/research-making-a-juicy-game/)

**Mechanics references**
- [Slay the Spire wiki, Neow](https://slaythespire.wiki.gg/wiki/Neow); [StS2 unlocks](https://sts2.untapped.gg/guides/how-to-unlock-characters); [Dead Cells wiki, BSC](https://deadcells.wiki.gg/wiki/BSC) and [timed doors](https://deadcells.wiki.gg/wiki/Timed_door); [RoR2 wiki, Difficulty](https://riskofrain2.wiki.gg/wiki/Difficulty); [Brotato 1.0 press release](https://www.gamespress.com/Brotato-10-Release); [Brotato unlocks](https://commonsensegamer.com/brotato-how-to-unlock-all-characters/); [Super Auto Pets basics](https://superautopets.wiki.gg/wiki/The_Basics); [The Bazaar, Prestige](https://mobalytics.gg/the-bazaar/guides/prestige); [TFT player damage](https://dotesports.com/league-of-legends/news/how-to-calculate-player-damage-teamfight-tactics); [TFT streak gold](https://upcomer.com/teamfight-tactics-galaxies-march-9-pbe-update/); [Hades Pact of Punishment](https://rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards); [TABS press kit](https://landfall.se/tabs-press-kit); [Wikipedia, Peglin](https://en.wikipedia.org/wiki/Peglin); [Wikipedia, Luck Be a Landlord](https://en.wikipedia.org/wiki/Luck_Be_a_Landlord); [Wikipedia, Game feel](https://en.wikipedia.org/wiki/Game_feel)
