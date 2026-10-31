# After the combat rework: what would make it fun

Written 2026-10-31 against `develop` at `ef2e133`, the build on the dev site, to read before and during the P3 playtest of `?proto=rework`. **Nothing here is adopted.** These are proposals with their evidence. Rule changes and retunes across several units wait for your OK (`.claude/rules/balance.md`). New rules would arrive as default-off `?proto=` knobs, be measured, and then be playtested.

**What it rests on:**
- **Fresh headless measurements** of M5 rules, `rework`, and `rework` with step B's prototypes: 720 single battles and 600 runs per variant.
- **Two agent playthroughs** of the dev site with `?proto=rework` in a real browser:
  - a newcomer: 2 runs, 5 battles;
  - a strategist: 2 runs and 4 single battles.
- **A ledger** of every earlier fun recommendation (about 155, from the engagement review to F16) and what became of each.
- **Web research** on lane battlers, auto-battlers and builder roguelites, and on what makes players start another run.
- **48 proposals** from five angles: the battle, builds, the run, feel and opposition. A critic checked each against the code and data, and a last pass checked this page.

**Bots aren't people.**
- `bot:balanced` builds and drafts greedily, never holds under waves and ignores the general's warnings.
- Cells of 600–720 carry about ±4 points, cells of 300 about ±6, and cells of 30 seeds about ±17. Samples differ, so `rework`'s battle-1 loss reads 52% (600 runs) or 53% (300 runs).
- The playthrough agents paused often, played some battles at 2–3× and heard no sound.
- The numbers say where difficulty and pacing sit. Only your playtest can say how it feels.

**Words used here:**
- **Beat:** the rework's 20 s release clock. **Wave:** the units a lane releases together on a beat. The 60 s economy clock (drafts, interest, the storm, the general's counter cycle) is called "the 60 s wave".
- **Rout:** a Heartcap destroyed. **Decision:** the result at 10:00, by columns held.
- **Material:** buildings plus banked gold plus units on the field.
- **Comeback:** a win by the side whose own Heartcap fell to ⅔ (the engagement check's count). A **material comeback** is a win by a side that was 30% or more behind in material at some point after 1:00.
- **Guardrails** (SPEC §12.3):
  - G3: one-building armies against `bot:balanced`, mean ≤ 55% and worst map ≤ 60%;
  - G4: battle length and Decisions;
  - G5: a side given +150 starting gold wins 55–75%;
  - G6: a side 6 columns down at 3:00 still wins at least 20%;
  - G7: in a merge-on against merge-off mirror, merge-on wins 55–70%;
  - G8: every mono bot loses at least 20 points against the adaptive general;
  - G11: performance.
- **Rule C:** under `rework` every unit can hit a flyer, ground melee at ×0.5, except the Mortar's lobbed shell and the Burster's burst, which never can ([flyers.md](flyers.md)).
- **Ledger IDs** (ER-2c, F11, …) name earlier recommendations. Each has a row in the [ledger](after-the-rework-ledger.md) with its status and evidence. The prefixes:
  - ER: the [engagement review](../engagement-review.md);
  - OMR: the [One More Run review](one-more-run-review.md);
  - DR: the external design review (not in the repo);
  - CS: [colony-swarm](colony-swarm.md);
  - F: [playtest feedback](../playtest-feedback.md);
  - CR: the [combat rework](combat-rework.md);
  - CX: an uncommitted Codex note.

## Short answer

- **The rework did part of its job.**
  - Mono archers pass G3 now, armies meet sooner and bigger, and the strict counter bar passes.
  - The newcomer's best moments were a held double wave that turned a battle and Bursters clearing a swarm; the strategist's were well-timed commander powers. Both found the shield bubbles easy to read.
- **What wins is still "mass the cheapest spawner".**
  - G3 fails on mono Sporeling (83 / 86), Drift Stalk (72 / 90) and Veilstalker (69 / 80).
  - Waves merge almost everything: 80 merges a battle, against 24 on M5.
- **Battle 1 decides the run, and a loss leaves nothing.**
  - Bots lose battle 1 52% of the time under `rework` (35% on M5), mostly to Old Mother Mold.
  - A lost run pays 0 Spores and 0 XP.
  - The boss then falls 88% of the time.
- **A battle is a quiet middle and a 12-second avalanche.**
  - 0 comebacks in 720 battles.
  - The loser's army falls behind about 2 minutes before the end, and the HUD doesn't show it: the side holding more ground at 2:00–4:00 goes on to win only about 40% of the time.
- **Choices are small, and nothing carries over.** Random drafting wins about as many runs as greedy, almost every upgrade level is a flat number, and nothing is saved between runs.
- **Half the rework can't be seen or heard.** The release beat is silent, pinning and call for help have no visual, and Help has no rework tab.
- **Before you play:** a few hours of UI-only fixes, so the playtest doesn't measure confusion the build causes itself. Also play `?proto=rework,hotstart` beside `?proto=rework`.
- **Now, while you playtest:**
  - lives: a lost battle below the boss costs run HP, not the run;
  - the tools later numbers need;
  - comeback gold paid by army instead of ground;
  - the battle-1 package, measured side by side;
  - four UI pieces: read the enemy, honest prices, "run it back" with records, and the generals as characters.
- **After P4, whatever it decides:**
  - settle what territory is for;
  - make merging a choice again;
  - an earned fight-back while the base still stands;
  - a finish you can see;
  - juice tied to your own decisions.
- **Then, by what the playtest shows:** an "if you see X, do Y" table ([Tier 3](#tier-3-depends-on-what-the-playtest-shows)).
- **Bigger bets for M6 and on,** in order: a practice rematch, elites and loot that pay, themed packs per run, mutation cards, keystones, a boss Edict, then feats and an unlock ladder.
- **Not again:**
  - stretching a falling Heartcap as the comeback fix;
  - rarer cards as "bigger" cards;
  - a draft every 60 s wave;
  - making the general read harder without changing what it builds.

## Where the fun stands on develop

Numbers come from the fresh measurements unless a playthrough is named.

| # | Problem | Evidence | What the rework did |
|---|---|---|---|
| 1 | **Battle 1 decides the run, and a loss leaves nothing** | Battle 1 lost 52%, and 60% of run defeats happen there. Mold wins 67% of her battle 1s. Armilla loses battle 1 61% of the time, Cordis 56% and Vesper 38%. Both of the strategist's runs ended in battle 1 | Worse: 35% on M5. Waves cause it (38% without them) |
| 2 | **No comebacks, and a cliff at the end** | 0 comebacks in 720. A beaten Heartcap dies a median 12 s after its first hit. At that hit the loser has 1 building and 0 units. The newcomer's long battles all ended at storm 5 | Worse: the winner arrives with 56 supply (34 on M5), and each storm stack grows waves 20% |
| 3 | **You can't tell who's winning** | The side with more ground at 2:00 / 3:00 / 4:00 wins 39 / 41 / 44%; field supply calls it 60 / 63 / 72%. The HUD shows no enemy army. The strategist led 27 columns to 13 with a full Heartcap at 7:08 and was routed at 7:47 | About the same. Flyers hold no ground, so the bar misleads more |
| 4 | **Territory and placement don't pay** | Comeback gold goes to whoever holds fewer columns, so eventual winners and losers each collect about 69 gold a battle. G6 wins 88%: falling back is an edge. At 3:00 the best plot is worth 5% of a building over the median (25% on M5), from 14 legal plots (56 on M5) | Worse |
| 5 | **One unit type still wins** | G3 above. The general answers a swarm with Capguards, Burster Pods and Tunnels, not the counter matrix's answer (Sporeling + Veilstalker) | Moved from archers to the swarm and flyers |
| 6 | **Merging is automatic** | 80 merges a battle (24 on M5); G7's mirror reads 72% (limit 70%). An Elder has ×7.84 HP and damage (`tierStatMult` 2.8, squared) | Worse |
| 7 | **Few decisions, and Hold becomes routine** | About 1.5 builds a minute, and a median ~1-minute stretch with nothing to do. Under waves Hold delays a release by one beat but recalls no one. Holding every other beat blindly adds 8 wins of 30 against the Lichen Baron | Mixed |
| 8 | **Choices between battles are small** | Almost all 42 upgrade levels are flat numbers. 4 of 21 relics change the rules (only Spore Cloud and Martyr's Bloom visibly change the field), and a run ends owning one of those 17% of the time. Elites add about 10 points of run-ending risk for one relic. Random drafting wins 41 runs of 240, greedy 44 | Slightly worse: three new blueprints thin the pool. Runs won: Vesper 36%, Armilla 11%, Cordis 14% |
| 9 | **Nothing carries between runs** | No profile save. The summary shows "Feats: none yet" and "Every run starts fresh" (`src/ui/screens/run.ts:602–608`), and the Underroot forgets your commander and bans (`src/app/main.ts:177`) | Unchanged |
| 10 | **The finale isn't a climax** | Boss fights won 88% (95% with `hotstart,bigdrafts`). Boss levers (levels, HP, buildings, a swarm opener, an emulated income ×1.4), measured with `hotstart` and lives, move it between −8 and +2 points | Worse: 67% on M5 |
| 11 | **Half the new rules can't be seen or heard** | No sound for a release, a unit or building hit, a death or a burst (Heartcap hits have one). No visual for pinning or call for help. The newcomer never saw a Rhizomorph surface. "Wave" names two clocks in the HUD | New with the rework |

**What the rework got right:**
- **Armies arrive together,** with about 50% more supply on the field from 1:00 on. The first unit dies at 0:32 instead of 0:43.
- **Every strong mono build has an answer** that wins at least 60% on every map.
- **Several pieces read without the docs:** the beat chip's tooltip, shield bubbles, the Burster, the general's warning and the battle report.
- **The beat gave Hold a moment.** The newcomer called a held double wave that turned a battle "the best moment of the session".

**Where the bots' view runs out:**
- **Nobody held.** A person who holds, reads warnings and sells may lose battle 1 less often than 52%. A newcomer may lose it more.
- **Some of the commander gap may come from the bot.** Its power policy may use Rhizome Tithe and Puppet Bloom badly.
- **Some claims only a person can confirm:** that the front line misleads, and that the beat feels like a timer.

## Before your playtest

### Fixes worth making first

These are render and UI only: no `src/sim` change and no golden change, a few hours in all. Each was checked in the code at `ef2e133`. About half also reach the default game (no `?proto=`): Help's keys, the neutral-column callouts, gold in the report and the tray's price. The rest only show under `rework`.

| Fix | What's wrong | File |
|---|---|---|
| Help's Keys tab | Says a hold "lasts up to 30 s", which is wrong under waves (a hold lasts until the next beat), and lists keys 1–8 although the tray numbers 1–9 | `src/ui/help.ts:56`, `:68` |
| The Hold tip | "Hold your units back for a bigger push", but under waves Hold recalls no one | `src/app/tips.ts:83` |
| The storm's tip and tooltip | Neither says each stack grows waves by 20%, the rule that decided every battle over 8 minutes. Only the beat chip says it (`explain.ts:290`) | `src/ui/hud/explain.ts` `stormTip`; `src/app/tips.ts` |
| Neutral columns | Any enemy flip raises a red "Column N lost", even for ground you never held. It adds to the callout noise that buried "Your Heartcap is under attack!" | `src/app/battleView.ts:332` |
| The flyer spark | A melee hit on a flyer throws the gold "strong" spark. The spark is classed on matrix × tag, and the flyer's ×0.5 goes into `resist`, so a Sporeling's 0.75 hit looks strong. Reclassify it on the render side | `src/sim/systems/combat.ts:256–259`, `:301`; fix in `src/render/renderer.ts` |
| The chips row | 34 px too wide at 1280×720, so the relics chip overlaps "GRAY ROT HEARTCAP". The beat chip also uses Hold's icon | `src/ui/hud/top.ts:132` |
| Gold from relics and cards | The report lists stipend, economy, interest and comeback gold only. Spore Tithe paid the newcomer about 400 gold that never showed. The data is in `goldEarned.effects` and `.drafts` (`state.ts:641`) | `src/ui/report.ts:251` |
| The tray's price | Cards fill "need N" toward the base cost while the forward price applies, so placements fail for 1–19 gold with only an error sound. Show "from N" | `src/ui/hud/tray.ts:88–99` |
| Optional | The interest tip says "each wave pays" (it's the 60 s wave). The Hold label truncates (`battleView.ts:475`). F during Hold's cooldown does nothing visible (`session.ts:100`). Tray cards past the ninth have no hotkey (`tray.ts:30`). A "Copy run report" button would put real run lengths in your notes | as listed |

If you'd rather keep the build frozen for the playtest, the same list works as a "known confusions" note.

### URL variants worth playing beside `?proto=rework`

Presets combine with commas, and `path:value` overrides work in the URL (`src/data/proto.ts`). Each spec saves its run under its own keys.

| URL | What it adds | What it answers | Bot numbers |
|---|---|---|---|
| `?proto=rework,hotstart` | A free draft at deploy; the battle-1 general on ¾ income | Is battle 1 the wall, and does a chosen start fix it? | Battle 1 lost 53% → 26%, runs won 18% → 31% (300 runs) |
| `?proto=rework,hotstart,bigdrafts` | Drafts at 2:00 and 5:00 only (the 60 s waves 2 and 5, instead of 2, 4, 6 and 8), 2 picks of 4 | Do two bigger drafts beat four small ones? | Runs won 38%, boss fights 95%. Vesper wins 56%, the others about 30% |
| `?proto=rework,breach` | Breach at ⅔, last stand at ⅓, storm +10% Heartcap damage a stack | Does a ~30 s siege feel better than a 12 s cliff? | The fall goes 12 s → 31 s. Outcomes are identical, with 0 comebacks |
| `?proto=rework,stormWaves.perStack:0.1` | Each storm stack grows waves 10% instead of 20% (×1.5 at storm 5, not ×2) | Were the last two minutes a flood or a climax? | Unmeasured. With storm waves off, Decisions rose to 27% |
| `?proto=rework,building.driftStalk.rarity:"common",building.bursterPod.rarity:"common",building.rhizomorphTunnel.rarity:"common"` | The three new blueprints at common | Lets you judge flyers, the Burster and the Rhizomorph at all: they're offered in only 17–25% of runs today | For Vesper: offered in 56–60% of runs (23–38% today); runs won 33% → 31%, within noise |
| `?map=bogwater-hollow&enemy=general:mother-mold&proto=rework` | One battle against Mold with the whole kit, no run | Can a build you choose beat Mold's swarm? | — |

### What to note while you play

These go beyond the [P3 questions](combat-rework.md#p3-playtest). Notes go in [playtest-feedback.md](../playtest-feedback.md), and each line below names the decision it feeds.

| Note or ask | Feeds |
|---|---|
| Per battle: commander, general, map, result, speed and length; per run, the time on the clock | Lives; run length, never measured with people |
| "At 3:00, who was winning? When did you know you'd lost?" | Read the enemy; territory |
| "When you started losing, did you have a move?" | Second Wind; comeback gold |
| "Did you hold? Was it a choice or a routine? Did you want to send a wave early?" | AI holds; Strike |
| "Did you notice waves leave? Did '2 waves' mean beats or minutes?" | Beat presentation |
| "When did the battle first feel on?" | An earlier first wave |
| Failed placements, and whether you knew why | Honest prices |
| "Did your buildings ever feel defenceless?" Forward buildings that died fast | Stored units sally (Tier 3); territory and forward building (item 9) |
| "Were the last two minutes a climax or a flood?" | A gentler storm |
| "Why did you build your second spawner?" | Whether the mixed-wave shield rewards variety or taxes it (a P4 question); merging (item 10) |
| "Did a card change your plan? Did one repeat in a battle?" | Draft hygiene; mutation cards |
| Unspent gold at 3:00 and 6:00 | Whether gold needs a sink |
| "Could you see what your units were doing?" | Elder scale; camera |
| After a lost run: "Did you want another at once?" | Lives; end screen; records |

## Next steps

Effort: S (a few hours), M (about one session), L (several sessions), XL (a milestone). [Appendix A](#appendix-a-every-surviving-proposal) has the critics' scores, and [Appendix B](#appendix-b-test-details) the test details.

### Tier 1: now, while you playtest

None of this waits on P4. The tools and measurements are ready the day P4 needs them. The UI pieces work under any combat model.

**1. Measurement tools** (M)
- **An AI that can hold under waves:** one default-off knob for the generals, and a side variant of `bot:balanced`.
  - Today neither side holds under waves, so every difficulty number ignores the verb.
  - G3 keeps measuring against today's `bot:balanced`.
- **A readout section in the engagement check:** how often each candidate gauge's leader at 2:00, 3:00 and 4:00 goes on to win. Item 5 is built on it.
- **A card-impact check** (`--checks cards`), a bot that commits to its picks, and build-diversity numbers in `--checks runs`: kit variety, the top building's damage share, and how often each card is offered and owned.
- **A commander × general matchup check** with a floor per cell, so no general change quietly widens the commander gap.

**2. Lives** (M)
- **Problem:** problems 1 and 10. Today only 2 of 159 runs that lost battle 1 went on to win: a Rout ends the run, and only a Decision loss (−25% HP) lets it continue. Also, 92% of battles start at full HP, so Grove repair (3 of 98 visits), Mending Moss and Fallen Oak's cost do nothing.
- **Change:**
  - below the boss, a Rout loss costs max HP by battle: battle 1, battle 2, and battle 3 or later cost 34 / 50 / 67% as a first pass, or 25 / 35 / 50%;
  - the run ends at 0 HP or a boss loss, and losses still pay no spoils;
  - a run-bar readout of how many losses you can absorb;
  - a boss-only modifier slot (today nothing can target the boss);
  - the route's shape as data, so a shorter run can be measured.
- **Measured** by emulation, 300 runs:

  | Spec, without → with lives | Run over in battle 1 | Boss reached | Runs won |
  |---|---|---|---|
  | `rework`, lives 25 / 35 / 50% | 49% → 0% | 20% → 85% | 18% → 68% |
  | `rework,hotstart`, lives 34 / 50 / 67% | 23% → 0% | 34% → 83% | 31% → 72% |

  Groves that repair go from 3 of 98 visits to 70–77 of 250–255.
- **The catch:**
  - Bots win 68–78% of runs (78% with `hotstart` and the gentler schedule), so lives needs a harder finale and a band you set. Suggested: boss fights won 55–70%, runs won 40–55%.
  - The boss levers in problem 10 don't get there. Even an emulated mirror boss on income ×1.25 leaves boss fights won at 75% and runs won at 62%, both above the band. Measure boss levers in the same session, and expect the Edict ([Tier 4](#tier-4-bigger-bets-for-m6-and-beyond)) to be the real fix.
  - Most runs become full runs. Mean battle minutes per run go from 13 to 24–25, about 35–45 minutes for a person at 1×, against SPEC §1.2's 25–35 minutes.
- **Ledger:** ER-2c.

**3. The battle-1 package, measured side by side** (S–M, mostly measurement). One table, with and without lives, plus item 1's matchup check:
- **`hotstart`:** see the URL table.
- **Mold out of battle 1** (`general.mother-mold.appearsIn:[2,3]`): with `hotstart`, battle 1 is lost 16% of the time but battle 2 41%. Without `hotstart` it's unmeasured under `rework`. Your call. Under lives it's a choice about what battle 1 teaches, not a survival fix.
- **Mold on a 15 s beat, plus the Baron's Mortar weight 3 → 1:** battle 1 lost 53% → 37%. It widened the gap in runs won between the best and worst commander from 16 points (28 / 12 / 13%) to 24 (39 / 22 / 15%), for reasons not yet known.
- **A data-only commander control:** Armilla's starter Mortar becomes a Sporeling Burrow (her opener has one unit type, so it never gets shields), and drafts offer more core blueprints.
- **The battle-1 economy tip** (shown at 0:30 if you have no economy building, `src/app/tips.ts`): the newcomer followed it and lost to Mold's swarm. Measure battle 1 against Mold with an economy building forced before 0:30 against without. If the economy opening loses more, reword or drop the tip when Mold is the battle-1 general.

**4. Comeback gold paid by army** (S)
- **Problem:** comeback income pays whoever holds fewer columns, and under `rework` columns point the wrong way. Eventual winners and losers each get about 69 gold a battle. Against Mold, the winner gets 77 and the loser 19.
- **Change:** a knob, `comeback.by: "army"`, keyed to field strength. A variant leaves flyers out of the column count instead.
- **Effort:** about 10 lines in `src/sim/systems/economy.ts`.
- **Test:** comebacks, comeback gold to eventual losers against winners, the first front leader's win rate, G5, G6 and Decisions.
- It's the cheapest comeback test there is, so measure it now even though adoption waits for P4.

**5. Read the enemy** (M)
- **Problem:** losses come from nowhere (problem 3).
- **Change:**
  - an army gauge per lane, counting units on the field and waiting inside, weighted by tier. Not supply, which undercounts a merged swarm;
  - the enemy's next wave at its gate for the last 5 s of each beat, with "you +N / them +N" beside that lane's Hold switch;
  - a "Massing: Sporeling Burrow ×9" line in the general's intent panel, and "Stacking lane 1" on two lanes;
  - "Clash won · 9 left" when a lane's wave is wiped out;
  - "Big wave" and "Outnumbered" warnings, only if they pass item 1's readout check.
- **Test:** the gauge must clearly beat territory as a predictor and match field supply (60–72% today). Warnings need a 60 s lead with at most 30% false alarms. Then playtest it behind a `feel` preset against plain `rework`.
- **Notes:**
  - It shows only what's on the field, so it isn't the rejected answer card (ER-6b).
  - Put item 4's `comeback.by: "army"` knob in the same `feel` preset, or the gauge shows you a loss you can't answer.

**6. Honest prices** (S)
- The tray shows the cheapest legal price (the pre-playtest fix).
- New: a click on a plot you can't afford yet leaves a pending building that places itself when the gold arrives. It can be cancelled, expires after 30 s, and cancels with a callout if the plot turns illegal.
- F on cooldown says "Hold ready in 6 s".
- **Test:** failed placements go from the newcomer's 6 (in 5 battles) to 0. F1's forward price itself is unchanged.

**7. Run it back, and records** (S)
- **Change:**
  - remember the last commander and bans. "Run it back" (Enter or R) starts a new seed straight on the route;
  - summary lines that tell the truth: how far you got, what beat you (the enemy's most-built building, its peak Elders), and active play time;
  - per-commander records, the last 20 runs, and a "cards seen 23 of 38" codex;
  - a grudge line: "Defeated by Old Mother Mold: her army passed yours at 5:40".
- **Not yet:** banked Spores and XP that buy nothing, and feats. They wait for P4 and Tier 4.
- **Decide:** prototype runs save under per-spec keys, so a profile stored the same way resets with every URL change. One profile per build, with each record tagged with its spec, avoids that.
- **Ledger:** DR-19, DR-31, DR-32, DR-33.

**8. The generals as characters, and first-sight cards** (S)
- **Generals:**
  - each general's title, passive, opener and battle kit on its route node and in the intent panel. `GeneralSchema.title` is documented for both and rendered in neither;
  - one line of voice per general: a greeting, "remembers your kind", a counter, a win and a loss.
- **First sight:**
  - the first time an enemy unit type appears in a run, a 6 s card with its sprite and one line, e.g. "Driftling · flies: melee hits it for half; shells and bursts can't touch it";
  - a "New" ribbon on the first offer of each rework blueprint;
  - plain function words beside flavour names ("Burster Pod · area bomber").
- **Test:** a fresh tester with tips reset: "Was anything on the field you didn't understand?"

### Tier 2: after P4, whatever it decides

Build these once the combat model is known, so their numbers and visuals fit it.

**9. Decide what territory is for** (decision, then S–M)
- **Problem:** problem 4, the ledger's oldest open item (ER pillar 1, F1, F6, F15, F16).
  - The tug is the game's main readout, and it predicts the winner less often than a coin flip.
  - The newcomer watched passing waves walk through columns without capturing them. Capture needs 2 s of presence at 1.5 : 1 (`data/balance.json:24–25`).
  - Flyers hold no ground, so a flyer army that is razing your base can still lose the 10:00 Decision on columns.
  - Home space fits about 4 buildings the way people place them, which pushes them forward into contested columns, where merged Elders fight, at the forward price. Their buildings died within seconds to minutes (F1, F12).
- **Two directions, your call:**
  - **Make ground pay.** Candidates:
    - spore vents: one point per lane in contested columns that pays its holder every beat, with a tap that ignores the forward price (Warcraft Rumble's gold veins, Direct Strike's middle);
    - held columns and surviving forward buildings pay at the end of the battle (Thronefall);
    - waves capture as they pass;
    - flyers count;
    - a short grace shield on a newly placed building.
  - **Demote it.** The bar becomes a secondary readout behind item 5's gauge, and the Decision tiebreak moves to material.
- **Test:** the spread tool (the best plot clearly above the median at 1:00 and 3:00), the territory leader's win rate at 3:00 above 50%, and F1 and F6 in a playtest.
- The parked step C (neighbour rules, [colony-swarm](colony-swarm.md#the-cheapest-test)) comes back only after this. Under `rework` its baseline is harder: the best plot is worth 5%, against 25% on M5.

**10. Merging as a choice again** (M)
- **Problem:** problem 6. Under waves nearly every cheap unit merges, mass Elders decide battles, and Cordis's Puppet Bloom is redundant.
- **Knobs to measure:**
  - **knitting at the door:** merging moves to the release, pooling a held lane's same-type units, so a hold buys an Elder deliberately;
  - **an Elder cap per lane;**
  - **a knit cost under waves.**
- **Test:** G7 back inside 55–70%, the top building's damage share, and G3.
- **Notes:**
  - It changes SPEC §1.2's interview rule ("out of combat, anywhere"), so it needs your OK.
  - Pooling must work across a lane's buildings: a Burrow alone can't store 9 units in one hold.
  - Tier 4's bets mean little until this is settled.

**11. Second Wind: an earned fight-back** (M)
- **Problem:** every existing rescue acts at the Heartcap, when the loser has 1 building and 0 units.
- **When it fires:** an army trigger (at most half the opponent's supply for 20 s, the opponent at 10+, after 1:00).
  - It fired for the eventual loser in nearly every rout in a 20 s re-measure: 19 of 21 losses to the Blightwright, 14 of 15 to the scripted general, 13 of 14 to the Baron.
  - It fires a median 76 s before the end, while the loser still has 5 buildings and about 95 gold.
  - It fires for the eventual winner in 14–20% of routs.
- **Change:**
  - the trigger earns one charge;
  - spent on a lane, the charge releases the lane's stored units plus 2 extra batches with a 40% shield;
  - variant B has no button: releasing a held lane spends the charge.
- **Watch:**
  - A general that spends charges is close to an enemy active power (§17 #13), so that variant needs your OK.
  - Hold used while behind gives bots nothing today (holding while behind: 39 wins of 120, against 42 of 120 without it), so the extra batches must carry the effect.
  - Compare it with "regroup on the beat", where idle units near the front join the departing wave.
- **Ledger:** OMR-8. It differs from `breach`, T2 (falling back while outnumbered) and T3 (home spawners that shoot) by acting before the collapse.

**12. A finish you see and feel** (M)
- **Change:**
  - cracks at ⅔ and a wilting cap at ⅓;
  - "Their Heartcap is under attack!" for the winner;
  - a "moment" banner tier, one per 10 s at most;
  - a short hit-stop on the killing blow and a 1.5 s held final frame.
- **Test:** "What was the best moment of a battle you won?"
- It shows the ending; it doesn't soften it. Items 4 and 11 do that.
- **Ledger:** ER-7b, ER-7d.

**13. Juice tied to your own decisions** (M–L)
- **Change:**
  - hit-stop when your power hits 3 or more units or your Elder is born;
  - per-power effects, sounds and a count pop ("×7");
  - Elders at 1.7× with an outline, and unit shadows;
  - a mat that creeps over a flipped column;
  - a "Battle effects: standard / full" setting.
- **Left out on purpose:** no combat din, no kill pops. A CHI 2024 study (Kao et al.) found feedback tied to the player's success raised motivation, while the same effects without that link lowered it.
- **Test:** the frame budget (G11), and "name the three most important things in your last battle".

**14. The kept rules, visible** (M)
- **Change:**
  - a whiff at a flyer's shadow when a shell or burst lands under it (they can't hit flyers), and a knot over your pinned archers;
  - a short "!" for call for help;
  - shield-break pops and owner-coloured cloud rims;
  - burst and shield sounds;
  - the new wave size ("waves ×1.2" up to "×2.0") flashing on each storm stack.
- Cues only for the pieces P4 keeps.
- **Test:** the next playtest, with P3's question 4.

**15. A report that explains the loss** (M)
- **Change:**
  - an army line on the front-line graph. It's stored in the sim under a rule flag, so a resumed run re-simulates it, and it moves hashes only under its knob;
  - a headline from real stats: "At 5:40 their army passed yours and stayed ahead";
  - a near-miss line, only when it's true.
- **Depends on:** item 5's gauge.

**16. Draft hygiene** (S)
- **Change:**
  - no repeated card within a battle;
  - in-battle upgrades only for buildings you've built this battle;
  - retire Mending Moss while a Rout still ends the run, which needs a new `draft.exclude` field;
  - "Pairs with …" on engine relics.
- **Test:** repeats and dead upgrades per battle reach 0, with runs won within noise.

### Tier 3: depends on what the playtest shows

| If the playtest shows… | Then… | Effort |
|---|---|---|
| **Waves stay,** with a rhythm or at least neutral | Give the beat a voice and one name: a drum on each side's release, a ripple from the front spawner, and the 60 s chip renamed to a clock with its next mark. Then a Waves tab in Help, first-time tips, a lighter callout load, and stored units that sally when their building is hit | M |
| **"A metronome", dead stretches, or Hold by rote** | Item 1's AI holds first. Then Strike: send a lane's wave early, once per lane per 60 s, at no cost (Kingdom Rush's "call early"). For the empty stretches, the never-reviewed CX ideas: optional battle commitments at deploy, or a timed bloom patch worth contesting | M |
| **An empty first 20 s** | The first wave at 0:10, with beats off the minute so a draft never freezes a release | S |
| **The swarm decides battles** (the likeliest) | With your go-ahead ([status](../status.md#waiting-on-the-user): the general against a swarm): counter recipes from the matrix's confirmed answers (Sporeling + Veilstalker, or Amanita + Sporeling), so the general builds them. Then a telegraphed counter wave: the general holds a beat and sends its counter as a double wave. Item 10 matters most here | M, then M |
| **Flyers decide battles** | A Driftling retune or an Anti-Air counter kind (status: the flyer army). Also fix the swarm read, which labels a flyer army SWARM and answers with melee that deals ×0.5. Keep flyers as their own preset until one of these lands | S–M |
| **"I couldn't answer the general"** (P3's Q2) | Items 5 and 8 first, and a "+ another type = shields" line on tray cards. Later, a reward for out-adapting a counter | S, then M |
| **Battle 1 is still the wall,** most of all with Armilla or Cordis | Adopt item 3's chosen package. Then one signature rule each: Armilla's Mortar counts as a type for her shields; Cordis's Puppet Bloom at 45 s, chaining once and merging units waiting inside. Keep it only if it beats the data-only control. Or a priced first choice of opponent | M |
| **An abrupt ending, or a loss that wasn't earned** | Move step 10 of the order (items 4, 11 and 12) ahead of the other post-P4 steps | — |
| **"The last two minutes were a flood"** | Measure a gentler storm: 0.1 a stack, then a true ramp to 10:00. Expect no new comebacks and more Decisions | S |
| **Battles against the Baron end in Decisions** (22% under `rework`) | With AI holds, a release-when-massed policy for the Baron | S |
| **The Mortar never got built, or died at once** (F13) | It's worth 1.5 supply in 90 s under `rework` (9.7 on M5): it can't hit flyers and has lost its clouds. Retune its range or clouds, or cut it from the roster and from Armilla's starter | S |
| **The Rhizomorph went unseen** | Drop it (status: the Rhizomorph) | — |
| **Unspent gold piled up** | Revisit a gold sink, such as reinforcing a wave. It was dropped here because bots bank about the same as on M5 | S |
| **"I couldn't see my units"** | Item 13's Elder scale and shadows first. A camera on the contested band only if you're willing to reverse SPEC §13.6's fixed view | L |
| **Runs feel long, or wins feel like formalities** | A "Finish" button once a side has no units and 1–2 buildings (the sim steps to its end), and a 4-battle route through item 2's route-shape knob | S |
| **Level 3 (rounds)** | [rounds.md](rounds.md)'s clash prototype first. Items 2, 3 (except Mold's 15 s beat), 4, 6, 7, 8 and 16 still apply. The beat items (5's gate preview, 14's wave cues, AI holds, Strike) would be redesigned for rounds | — |

### Tier 4: bigger bets for M6 and beyond

**These need three things first:**
- runs long enough for a build to form (item 2);
- a way to size cards (item 1's card check);
- merging settled (item 10).

Judge each with a "top building's damage share below about 60%" bar. They're in the order to try them.

**The order here makes one call that isn't settled:** the engagement review's [proposed sequence](../engagement-review.md#proposed-sequence) (ER-10) leaves open whether opposition comes before meta-progression. This list puts run variety and meta before the Gray Rot's units. Reorder it if you'd rather.

1. **Practice this battle** (M): replay the battle that ended your run, same seed, no reward. It builds on item 7. Ledger: CX-6.
2. **Elites that pay, and loot from the general you beat** (M).
   - The elite pick deals rares only.
   - Each general's node shows 3 loot cards drawn from its 6-card doctrine, so the route you choose shapes the build you can get (9 Kings, the user's named model).
   - Elites become opener trials, such as an Airborne Host or a Siege Column.
   - Plus a "choose the card type" spoils, which answers F9 cheaply.
   - **Test:** elites stop being a net loss.
   - **Ledger:** CR-8, F9, F11.
3. **Themed packs per run** (M). Each run deals from the commander's core, an always-in set with an anti-swarm spawner, and 4 of 10 themed packs of one building and two relics.
   - Runs differ before battle 1, and engine parts arrive together.
   - **Keep the bans** (SPEC §1.2's interview decision) and add one pack swap, until you decide otherwise.
   - **Test:** a rule-changing relic owned at run end in 30% or more of runs (17% today).
4. **Mutation cards** (M): "Mutate: Burrow" as an uncommon card.
   - The variants: Burrow: Teeming or Bursting; Capguard: Ironcap or Bulwark; Gill Nest: Longgill or Volley.
   - It's a card rather than an upgrade level 3, because 73% of runs never reach a level 3.
   - **Ledger:** ER-5c, ER-5d, CR-9.
5. **Keystones** (L): big rule cards at run start and after rows 3 and 5.
   - Start with three: Double Time (your beat 15 s, waves ×0.8), Great Muster (30 s, ×1.6) and Three-Strain Wave (3 or more types get a 40% shield).
   - **Ledger:** ER-5b, CR-4, CR-6.
6. **The boss's Edict** (L): one rule per run, shown on the boss node from row 1, with what it tests and what answers it.
   - Its re-reads are tied to buildings lost, not Heartcap HP.
   - "Mirrors your build" is one Edict, not the base rule, so rare broken runs stay possible (SPEC §12.1).
   - It's also lives' harder finale.
7. **Feats, then an unlock ladder** (M, then L).
   - Feats written after P4 that reward variety, e.g. "win with no Sporeling Burrow".
   - Then staged unlocks, with the quest printed on the locked card, which teaches the roster gradually (F8).
   - The heirloom building (CS-9, your idea: a building kept from one battle to the next that starts each battle already planted, earned through mastery or a relic) belongs here.
8. **Lane pairs, Hunting Pack first** (M → L): two-building rules. The first sends Veilstalkers after enemy units that are knitting. Ledger: OMR-13, CS-1–3.
9. **A branching route** (L), once lives and prizes give the choice weight. It changes SPEC D21. Ledger: F10.
10. **Seasons** (S): one rule per run for both sides, on M7's blight pipeline.
11. **The Gray Rot with its own units** (XL, M7): a role mirror plus 2–3 signature units, and no rule that pays the side already winning. Ledger: ER-6c.

## What not to do again

**Tried and failed:**

| Idea | Why not | Where |
|---|---|---|
| Stretching a falling Heartcap as the comeback fix: `breach`, a boss that re-roots, re-reads at ⅔ and ⅓ | By then the loser has 1 building and 0 units. `breach` gives 0 comebacks in 720 under `rework` | [Step B](one-more-run-review.md#step-b-results-2026-10-30) |
| Rarer cards as "bigger" drafts | More picks helped; rarity didn't | [Step B](one-more-run-review.md#step-b-results-2026-10-30) |
| A draft after every 60 s wave | The problem is card size, not count, and each draft holds the sim (DR-23) | [OMR](one-more-run-review.md#the-proposals-sorted) |
| Reading the swarm harder; a counter floor; an earlier counter cycle | G8 1 of 8 at best. The Baron loses to mono Sporeling even with 30 Veilstalker Hollows | [backlog](../balance-backlog.md) |
| Falling back while outnumbered (T2); home spawners that shoot (T3) | Harmful, or every battle a Decision | [backlog](../balance-backlog.md) |
| Flat percentages per neighbour | Below the spread tool's noise (DR-7) | [OMR](one-more-run-review.md#the-network-design-what-to-keep-what-to-rethink) |
| 4–5 minute battles before the cliff is fixed | A shorter battle with the same cliff is worse (DR-22) | [OMR](one-more-run-review.md#the-proposals-sorted) |
| An answer card in the counter warning | The interview's rejected alternative | SPEC §18.2 |

**Dropped in this review** (revisit if the condition changes):

| Idea | Why it was dropped | Revisit if |
|---|---|---|
| Overtime at 10:00 | Decisions are rare overall (9% under `rework` in the fresh measurements; G4 reads 11%), and faster overtime beats send smaller, unshielded waves. The Baron's 22% has its own fix in Tier 3 | Decisions rise above 15% |
| A gold sink to reinforce a wave | Bots bank about what they did on M5 (peak ~265 gold) | The playtest reports unspent gold |
| A slower beat as a difficulty lever | Mold on a 30 s beat: Vesper's wins against her 40% → 43%, one cell of 30 seeds | A bigger sample says otherwise |
| A building that spreads ground (the Sporemat) | Comeback gold pays by column, so it would fund the enemy | Item 4 or 9 changes what ground pays |
| A Gray Rot that grows stronger with kills | It pays whoever is already winning | — |
| Supply as the army gauge | Supply undercounts merged armies | — |

The second front on one-lane maps (OMR-10) isn't on either list. It failed as an archer fix, but whether one-lane maps get a second front is still your call.

## A suggested order of work

About one session per step (steps 9, 10 and 12 take two or three), each on a branch from `develop`, and each only once you've agreed to it (CLAUDE.md: review before building).

**Before and during the playtest:**
1. **Pre-playtest fixes,** a few hours. Merge them to `develop` before you play, or use the list as a note.
2. **Tools** (item 1): AI holds, the readout section and the matchup check. Measure comeback gold by army (item 4) in the same session.
3. **Lives** (item 2), with the boss slot, boss-lever measurements and the route-shape knob. Propose a band. If you agree, put `?proto=rework,hotstart,lives` on the dev site.
4. **The battle-1 package** (item 3), with and without lives.
5. **Read the enemy, honest prices and the generals' characters** (items 5, 6 and 8), behind a `feel` preset for the playtest's second half.
6. **Run it back and records** (item 7), and the card check (item 1). If the card check doesn't fit, do it at the start of step 12.

**Once P3's notes are in:**

7. **P4 with you,** using the Tier 3 table. Record the outcome in [combat-rework.md](combat-rework.md) and [status](../status.md).
8. **Adopt or iterate.**
   - If waves stay: the beat's presentation, the Waves tab and tips, and item 14's cues for the pieces kept.
   - If Level 3: the clash prototype.
   - Either way: juice tied to your own decisions (item 13).
9. **Territory and merging decisions** (items 9 and 10), measured as knobs.
10. **Comebacks:** item 11 with item 4, then the finish (item 12) and the report that explains the loss (item 15, on item 5's gauge). If the playtest found endings abrupt or unearned, do this step first after P4.
11. **If battle 1 is still the wall** (Tier 3): adopt item 3's chosen package, then commander identities, kept only if they beat the data-only control.
12. **Draft hygiene, the practice rematch and the first run-variety slice:** item 16, then Tier 4 #1 and #2. Then write the M6 run-variety design that [combat-rework.md](combat-rework.md#waves-and-run-variety) promised, against the adopted model.

## Appendix A: every surviving proposal

The critics' scores: impact (I) and confidence (C) from 1 to 5, and effort (E) from S to XL. IDs are the five lenses: A the battle, B builds, C the run, D feel, E opposition. They're local to this page, not the backlog's presets of the same name (A2, B1, E1 …).

| ID | Proposal | Verdict | I | C | E | Here |
|---|---|---|---|---|---|---|
| C1 | Lives by battle index | revise | 5 | 4 | M | 2 |
| C2 | A fair first battle | revise | 4 | 4 | S | URLs, 3 |
| D1 | Read the enemy | revise | 4 | 3 | M | 5 |
| A1 | Second Wind | revise | 4 | 3 | M | 11 |
| B4 | Commander identities that survive waves | revise | 4 | 3 | M | Tier 3 |
| E6 | The boss's Edict | revise | 4 | 3 | L | Tier 4 #6 |
| E3 | Counter recipes from the confirmed answers | revise | 4 | 2 | M | Tier 3 |
| B2 | Keystones | revise | 4 | 2 | L | Tier 4 #5 |
| D9 | Honest prices; a placement that waits | keep | 3 | 4 | S | 6 |
| E1 | The general's Massing line | revise | 3 | 4 | S | 5 |
| C4 | Run it back; a practice battle | revise | 3 | 4 | S | 7, Tier 4 #1 |
| D4 | The rework's rules, visible and honest | revise | 3 | 4 | M | Fixes, 14 |
| D5 | Teach the rework; fewer callouts | revise | 3 | 4 | S | Fixes, Tier 3 |
| B3 | Mutation cards | revise | 3 | 3 | M | Tier 4 #4 |
| B5 | Loot from the general you beat | revise | 3 | 3 | M | Tier 4 #2 |
| B6 | Themed packs | revise | 3 | 3 | M | Tier 4 #3 |
| D2 | The beat's voice and one name | revise | 3 | 3 | M | Tier 3 |
| D3 | A finish you see and feel | revise | 3 | 3 | M | 12 |
| D8 | A report that explains the loss | revise | 3 | 3 | M | Fixes, 15 |
| E2 | Re-voice the generals | revise | 3 | 3 | M | 3, 8, Tier 3 |
| E7 | Elite opener trials | revise | 3 | 3 | M | Tier 4 #2 |
| A4 | Knitting at the door | revise | 3 | 2 | L | 10 |
| A5 | Strike: send a lane's wave early | revise | 3 | 2 | M | Tier 3 |
| B1 | Lane pairs, Hunting Pack first | revise | 3 | 2 | L | Tier 4 #8 |
| C3 | A boss slot now, an Edict later | revise | 3 | 2 | M | 2, Tier 4 #6 |
| C8 | An unlock ladder that teaches | revise | 3 | 2 | L | Tier 4 #7 |
| D6 | Juice tied to your own decisions | revise | 3 | 2 | M–L | 13 |
| E4 | See your opponent; a priced first choice | revise | 3 | 2 | M | 8, Tier 3 |
| E9 | The Gray Rot with signature units | revise | 3 | 2 | XL | Tier 4 #11 |
| B7 | Draft and card hygiene | revise | 2 | 4 | S | Fixes, 16 |
| B8 | Card check, committed bot, diversity numbers | revise | 2 | 4 | M | 1 |
| A6 | Stored units sally | revise | 2 | 3 | S | Tier 3 |
| A7 | The first wave at 0:10 | revise | 2 | 3 | S | Tier 3 |
| B10 | Seasons | revise | 2 | 3 | S | Tier 4 #10 |
| C5 | Records and a codex now, feats after P4 | revise | 2 | 3 | S | 7, Tier 4 #7 |
| E8 | The general as a character | revise | 2 | 3 | S | 7, 8 |
| A2 | A gentler storm | revise | 2 | 2 | S | URLs, Tier 3 |
| C6 | Elites that pay a guaranteed rare | revise | 2 | 2 | M | Tier 4 #2 |
| C7 | The route's shape as data, branching later | revise | 2 | 2 | L | 2, Tier 4 #9 |
| D7 | First-sight cards now, staged units later | revise | 2 | 2 | M | 8, Tier 4 #7 |
| D10 | A camera on the contested band | keep (conditional) | 2 | 2 | L | Tier 3 |
| E5 | The counter wave | revise | 2 | 2 | M | Tier 3 |

**Added in review:** item 1's AI holds, readout and matchup check; comeback gold by army (item 4); the data-only commander control (item 3); the Finish button; a reward for out-adapting a counter; the Baron's stalls as their own target; and, from the final check, item 9, item 10's Elder cap and knit cost, and the Mortar, flyer swarm-read and unspent-gold rows in Tier 3.

**Dropped:**
- A3 (merged into D1 and D9), A8 Reinforce, A9 Overtime, B9 the Sporemat, C9 an early Decay ladder, C10 a weekly seed.
- Inside revised items: Mother's Mercy (C2), splitting card types by source (C6), the Long Brood and Shield Wall elites (E6, E7), Mono Bloom, Vanguard and Deep Tithe (B2), and the Gray Rot that feeds (E9).

## Appendix B: test details

**The readout (item 1).**
- Port the measurement script's who's-winning analysis into `tools/lib/engagement.ts`.
- Report how often each candidate gauge's leader at 2:00, 3:00 and 4:00 goes on to win, each warning's median lead, and its false-alarm share.
- Today under `rework`: territory 39 / 41 / 44%, field supply 60 / 63 / 72%, material 64 / 70 / 78%.
- Gauge candidates: tier-weighted units (1 / 2.8 / 7.84, from `tierStatMult`) or HP × DPS.
- Item 5's display settings go under a `present` key that `compileRules` never copies, so no hash moves. The key must be added to the strict `BalanceSchema`.

**AI holds (item 1).**
- For example, `laneStance.ai.waves: { holdRatio: 0.6 }`: hold a lane at most every other beat, when its waiting supply is at most 0.6× the opponent's and nothing there is besieged.
- Today a blind every-other-beat hold lifts `bot:balanced` from 16 to 24 wins of 30 against the Baron, and from 9 to 15 against the Blightwright.

**Card check (item 1).**
- `--checks cards`: each card is given from the start, against Mold, the Baron and the Blightwright, at 20–30 seeds a cell.
- A blueprint also gets build weight 2, or the bot never builds it.
- Bars:
  - a third of uncommon and rare cards at +5 points or more;
  - nothing above +20;
  - a committed drafter at least 10 points of runs won above random.

**Lives (item 2).**
- `npm run experiment -- --proto rework,hotstart,lives --checks runs --commander all --power-policy auto --runs 100`.
- **Suggested band:**
  - run over in battle 1 under 5%;
  - boss reached 65–80%;
  - boss fights won 55–70%;
  - runs won 40–55%;
  - at least 40% of defeats in battles 4–5.
- Judge the commander gap with lives off. With lives it reads Vesper 85%, Armilla 61%, Cordis 69% runs won (`rework,hotstart`, lives 34 / 50 / 67%).
- **Pitfalls:**
  - In `finishBattle` (`src/run/flow.ts:237`), `ps.heartcapHp` is already 0 after a Rout, so take the cost from the HP before the battle.
  - `eliteReward` in `src/ui/screens/run.ts` also calls `battleRewards`.
  - A Decision loss (end HP − 25%) can cost more than a Rout under lives, so it needs a cap.

**Battle-1 package (item 3).**
- `--checks runs --commander all --power-policy auto` per variant, with and without lives, plus the matchup check.
- Targets: battle 1 lost 25–35%; 45–75% player wins against each general; a gap in runs won between commanders no wider than today's 16 points.
- Try Mold's beat at ×0.8–0.85 as well as ×0.75, and stack it with `hotstart`.

**Second Wind (item 11).**
- `npx tsx tools/experiment.ts --proto rework,secondWind --checks engagement,runs,g4,g5,g6 --seeds 30 --runs 100 --commander <c> --power-policy auto`.
- Run it with extra batches at 1, 2 and 3, with variant B, with the Hold-while-behind control, and on M5 (`--proto secondWind`).
- Report the winner's Elders at the trigger, and battles whose end moved but whose outcome didn't.
- **Targets:**
  - material comebacks 13% → 18–25%;
  - Heartcap comebacks from 0 to a few percent;
  - the material leader at 3:00 still wins at least 60%;
  - G4 median at most 8:30 and Decisions at most 15%;
  - G5 and G6 don't rise.

**Draft hygiene (item 16).** `--proto rework,drafthygiene --checks runs --commander all --power-policy auto --runs 200`.

## Appendix C: where the numbers come from

The ledger is in the repo: [after-the-rework-ledger.md](after-the-rework-ledger.md). The other working files (the measurement scripts and tables, the playthrough reports with their screenshots, the three research reports and the 48 proposals with their critiques) were written in a temporary session folder and aren't in the repo. Ask to bring any of them into `docs/ideas/` if they should be kept.

The repo's own sources:
- the [engagement review](../engagement-review.md);
- the [One More Run review](one-more-run-review.md), with its step B results;
- the [combat rework](combat-rework.md), including P2;
- the [balance backlog](../balance-backlog.md)'s P1–P2 and "After P2" sections;
- [playtest feedback](../playtest-feedback.md);
- [status](../status.md).

## Sources

**Comebacks, tension and pacing:**
- Wagar, [Comeback Mechanics & Slippery Slopes](https://critpoints.net/2017/04/01/comeback-mechanics-2/)
- Law of Game Design, [Rubber Bands](https://lawofgamedesign.com/2014/08/25/theory-rubber-bands/)
- Valve, [L4D2 director scripts](https://developer.valvesoftware.com/wiki/Left_4_Dead_2/Scripting/Director_Scripts)
- Clark et al. (2009), near misses, [Neuron](https://pmc.ncbi.nlm.nih.gov/articles/PMC2658737/)
- League of Legends, [objective bounties](https://wiki.leagueoflegends.com/en-us/Objective_bounties)

**Lane battlers:**
- Clash Royale: [overtime and elixir phases](https://supercell.com/en/games/clashroyale/blog/release-notes/november-update) · [King Tower](https://www.touchtapplay.com/best-ways-to-activate-king-tower-in-clash-royale/)
- The Battle Cats: [enemy units](https://battle-cats.fandom.com/wiki/Enemy_Units)
- Stick War: [garrison](https://stick-war.fandom.com/wiki/Global_Garrison_Command)
- Kingdom Rush: [call early](https://ayumilove.net/kingdom-rush-walkthrough-guide/) · Harlow, [campaign design](https://gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design)
- Plants vs. Zombies: [flag waves](https://plantsvszombies.fandom.com/wiki/Flag_Zombie_(PvZ))
- Thronefall: [wave previews](https://www.pcgamesn.com/thronefall/full-version-launch)
- Legion TD 2: [mercenaries](https://legiontd2.wiki.gg/wiki/Mercenaries)
- Warpips: [guide](https://gamepretty.com/warpips-loadout-selection-and-battle-strategy/)

**Auto-battlers and roguelites:**
- 9 Kings: [kings](https://9kings.wiki.gg/wiki/Kings) · [Royal Council](https://wiki.hoodedhorse.com/9_Kings/Royal_Council)
- Teamfight Tactics: [GDC 2020 design talk](https://www.pockettactics.com/teamfight-tactics-design) · [anomalies](https://mobalytics.gg/blog/tft/set-13-guide-anomalies/)
- Hearthstone Battlegrounds: [anomalies](https://blizzardwatch.com/2023/09/12/anomalies-hearthstone-battlegrounds-season-5/)
- The Bazaar: [encounters and drops](https://mobalytics.gg/blog/the-bazaar/pve-encounters-and-drops)
- Slay the Spire: [Neow](https://slaythespire.wiki.gg/wiki/Neow) · [elites](https://slaythespire.wiki.gg/wiki/Elite) · [Ascension](https://slaythespire.wiki.gg/wiki/Ascension)
- Against the Storm: [cornerstones](https://wiki.hoodedhorse.com/Against_the_Storm/Cornerstones)
- Balatro: [boss blinds](https://dotesports.com/indies/news/balatro-antes-blinds-explained) · LocalThunk, [signposting](https://gamedeveloper.com/design/balatro-creator-unveils-a-few-slick-signposting-strategies)
- Vampire Survivors: [evolutions](https://vampire-survivors.fandom.com/wiki/Evolution)
- Hades: Kasavin, [narrative design](https://www.gamedeveloper.com/design/roguelikes-and-narrative-design-with-i-hades-i-creative-director-greg-kasavin)

**Readability, feel and juice:**
- Riot, [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)
- Into the Breach, [GDC 2019](https://gdcvault.com/play/1025772/-Into-the-Breach-Design)
- Sakurai, ["Stop for Big Moments!"](https://automaton-media.com/en/news/20220824-15208/)
- Nijman, [The Art of Screenshake](https://www.youtube.com/watch?v=AJdEqssNZ-U)
- Jonasson & Purho, [Juice it or lose it](https://www.youtube.com/watch?v=Fy0aCDmgnxg)
- Kao et al. (2024), [CHI](https://spiral.imperial.ac.uk/entities/publication/253c32f5-d124-4a23-88b5-9aaaf114608d)
- Pichlmair & Johansen, [Designing Game Feel](https://arxiv.org/abs/2011.09201)

**Onboarding:** George Fan, [How I got my mom to play through Plants vs. Zombies](https://notes.hamatti.org/sources/talks/how-i-got-my-mom-to-play-through-plants-vs.-zombies)
